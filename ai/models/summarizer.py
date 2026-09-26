# ============================================================
# Energy Start — Coletor (2º LLM) usando a API da NVIDIA
#
# Roda DEPOIS do classificador, só nas normas com relevância >= 2.
# Para cada norma, extrai o que mudou (antes/depois, valores, prazos)
# e copia trechos literais, que o código confere contra o texto original.
#
# Cole esta célula no Colab, depois da célula do classificador.
# ============================================================

import difflib
import json
import re
import time
import unicodedata
import os

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()  # lê NVIDIA_KEY_SUMMARIZER do arquivo .env

URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODELO = "google/gemma-4-31b-it"
CHAVE = f"Bearer {os.getenv('NVIDIA_KEY_SUMMARIZER', '')}"

SIMILARIDADE_MINIMA = 0.90  # tolerância da conferência de citação

# ------------------------------------------------------------
# 1. Prompt
# ------------------------------------------------------------
PROMPT_COLETOR = """Você é um analista regulatório do setor elétrico brasileiro.
Leia a norma abaixo e extraia o que mudou, para um alerta enviado a donos de usinas.

REGRAS:
1. Use SOMENTE o que está escrito no texto. Nunca complete com conhecimento próprio.
2. Para cada mudança, copie em "trecho" um pedaço LITERAL do texto (entre 10 e 300
   caracteres) que comprove a afirmação. Copie exatamente, sem reescrever nem resumir.
3. Se um campo não estiver no texto, use null. NUNCA invente número, data ou percentual.
4. "antes" só é preenchido quando o próprio texto mostra a redação anterior; senão, null.
5. Datas no formato AAAA-MM-DD. Se o texto só disser "na data de sua publicação", use null.
6. Escreva em português claro, para quem não é advogado. Sem juridiquês.

FORMATO DA RESPOSTA: apenas um objeto JSON, sem texto antes ou depois, sem ```:
{
  "resumo": "4 a 5 frases explicando o que a norma faz",
  "mudancas": [
    {"o_que_mudou": "frase curta",
     "antes": "como era, ou null",
     "depois": "como ficou",
     "trecho": "trecho literal copiado do texto"}
  ],
  "valores": [
    {"parametro": "nome do parâmetro (ex.: prazo_parecer_acesso)",
     "valor": 15, "unidade": "dias", "trecho": "trecho literal"}
  ],
  "prazos": [
    {"tipo": "vigencia | contribuicao | cumprimento | outro",
     "data": "AAAA-MM-DD", "descricao": "o que vence nessa data",
     "trecho": "trecho literal"}
  ],
  "quem_e_afetado": ["ex.: minigeração solar", "usinas eólicas conectadas à Rede Básica"],
  "acao_necessaria": "o que o usuário precisa fazer, ou null se não houver"
}"""


# ------------------------------------------------------------
# 2. Chamada ao modelo
# ------------------------------------------------------------
def _ler_json(resposta):
    limpo = re.sub(r"```(?:json)?", "", resposta)
    return json.loads(limpo[limpo.find("{") : limpo.rfind("}") + 1])


def chamar_nvidia(mensagens, modelo, max_tokens=8192):  # normas com muitas mudanças estouravam 2048
    headers = {"Authorization": f"{CHAVE}", "Accept": "application/json"}
    payload = {
        "model": modelo,
        "messages": mensagens,
        "temperature": 0,
        "max_tokens": max_tokens,
        "stream": False,
    }
    r = requests.post(URL, headers=headers, json=payload, timeout=180)
    if r.status_code in (401, 403):
        raise RuntimeError(
            "Chave inválida ou sem permissão. Confira NVIDIA_KEY_SUMMARIZER no .env."
        )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"] or ""


# ------------------------------------------------------------
# 3. Conferência de citação (sem IA)
# ------------------------------------------------------------
def _normalizar(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]", " ", re.sub(r"\s+", " ", t.lower())).strip()


def trecho_confere(trecho, texto_norma, texto_norm=None):
    """Procura o trecho no texto original, tolerando espaços, acentos e quebras de linha."""
    if not trecho or len(trecho) < 10:
        return False
    alvo = _normalizar(trecho)
    base = texto_norm if texto_norm is not None else _normalizar(texto_norma)
    if alvo in base:
        return True
    # busca aproximada: compara o trecho com janelas do texto do mesmo tamanho
    n = len(alvo)
    melhor = difflib.SequenceMatcher(None, alvo, "")
    for i in range(0, max(len(base) - n, 0) + 1, max(n // 4, 1)):
        janela = base[i : i + n]
        if difflib.SequenceMatcher(None, alvo, janela).ratio() >= SIMILARIDADE_MINIMA:
            return True
    return False


def conferir(dados, texto_norma):
    """Remove toda afirmação cujo trecho não exista no texto original."""
    base = _normalizar(texto_norma)
    aprovados, descartados = {}, 0
    for campo in ("mudancas", "valores", "prazos"):
        itens = dados.get(campo) or []
        ok = [i for i in itens if trecho_confere(i.get("trecho"), texto_norma, base)]
        descartados += len(itens) - len(ok)
        aprovados[campo] = ok
    total = sum(len(dados.get(c) or []) for c in ("mudancas", "valores", "prazos"))
    aprovados["itens_gerados"] = total
    aprovados["itens_descartados"] = descartados
    return aprovados


# ------------------------------------------------------------
# 4. Coletar uma norma
# ------------------------------------------------------------
def coletar_texto(texto, modelo=MODELO, max_chars=60000):
    mensagens = [
        {"role": "system", "content": PROMPT_COLETOR},
        {"role": "user", "content": "NORMA:\n\n" + texto[:max_chars]},
    ]
    for _ in range(2):
        try:
            dados = _ler_json(chamar_nvidia(mensagens, modelo))
        except (json.JSONDecodeError, ValueError):
            continue
        r = {
            "resumo": dados.get("resumo", ""),
            "quem_e_afetado": dados.get("quem_e_afetado", []),
            "acao_necessaria": dados.get("acao_necessaria"),
        }
        r.update(conferir(dados, texto))
        return r
    return {
        "resumo": "ERRO: resposta inválida",
        "mudancas": [],
        "valores": [],
        "prazos": [],
        "quem_e_afetado": [],
        "acao_necessaria": None,
        "itens_gerados": 0,
        "itens_descartados": 0,
    }


# ------------------------------------------------------------
# 5. Coletar o DataFrame (só o que o classificador marcou)
# ------------------------------------------------------------
def coletar_df(df, coluna_texto="texto", relevancia_minima=1, pausa=7):
    alvo = df[df["relevancia"] >= relevancia_minima] if "relevancia" in df else df
    print(f"{len(alvo)} de {len(df)} normas vão para o coletor\n")

    resultados = []
    for i, (_, linha) in enumerate(alvo.iterrows(), start=1):
        for tentativa in range(3):
            try:
                r = coletar_texto(str(linha[coluna_texto]))
                break
            except RuntimeError:
                raise
            except Exception as e:
                print(f"  erro na tentativa {tentativa + 1}: {e} — esperando 30s")
                time.sleep(30)
        else:
            r = {
                "resumo": "ERRO: limite ou falha da API",
                "mudancas": [],
                "valores": [],
                "prazos": [],
                "quem_e_afetado": [],
                "acao_necessaria": None,
                "itens_gerados": 0,
                "itens_descartados": 0,
            }
        print(f"[{i}/{len(alvo)}] {str(linha.get('titulo', ''))[:60]}")
        print(
            f"      {len(r['mudancas'])} mudanças | {len(r['valores'])} valores | "
            f"{len(r['prazos'])} prazos | {r['itens_descartados']} descartados na conferência"
        )
        resultados.append(r)
        time.sleep(pausa)

    saida = pd.concat([alvo.reset_index(drop=True), pd.DataFrame(resultados)], axis=1)
    gerados = saida["itens_gerados"].sum()
    if gerados:
        aprovados = gerados - saida["itens_descartados"].sum()
        print(
            f"\nConferência de citação: {aprovados}/{gerados} afirmações comprovadas "
            f"({100 * aprovados / gerados:.0f}%)"
        )
    return saida


# ------------------------------------------------------------
# Uso:
#   df_class = classificar_df(df_normas)
#   df_final = coletar_df(df_class)
#   df_final[["titulo", "resumo", "mudancas", "prazos", "acao_necessaria"]]

# ------------------------------------------------------------
