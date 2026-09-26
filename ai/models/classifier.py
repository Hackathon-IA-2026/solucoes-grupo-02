# ============================================================
# Energy Start — Classificador (1º LLM): Claude no Amazon Bedrock ou API da NVIDIA
# Com BEDROCK_MODEL_ID usa o Bedrock (é o que o deploy na AWS faz). Sem ela, usa a NVIDIA:
# funciona no Colab (chave nos Secrets 🔑) e no VS Code (chave no arquivo .env).
# ============================================================

import difflib
import json
import re
import unicodedata
import time

import os

import pandas as pd
import requests
from dotenv import load_dotenv

from functions import bedrock

load_dotenv()  # lê NVIDIA_KEY_CLASSIFIER do arquivo .env

# MODELO = "google/diffusiongemma-26b-a4b-it"
# MODELO = "google/gemma-4-31b-it"

URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODELO = "openai/gpt-oss-20b"
CHAVE = f"Bearer {os.getenv('NVIDIA_KEY_CLASSIFIER', '')}"
# Espera entre normas: a API gratuita da NVIDIA limita as chamadas por minuto. No Bedrock não
# precisa (o boto3 espera sozinho quando a cota estoura).
PAUSA = 0 if bedrock.MODELO else 7

# ------------------------------------------------------------
# 1. Taxonomia: áreas e subáreas do protótipo
# ------------------------------------------------------------
TAXONOMIA = {
    "Solar": {
        "Geração distribuída": "micro e minigeração distribuída (MMGD), Sistema de Compensação "
        "de Energia Elétrica (SCEE), energia compensada, créditos, Fio B e regra de transição da "
        "Lei 14.300 (GD I, GD II, GD III), geração compartilhada, autoconsumo remoto; inclui "
        "Resoluções Homologatórias de reajuste ou revisão tarifária de distribuidora que fixam "
        "TUSD, TE e os percentuais de desconto aplicados ao faturamento do SCEE",
        "Conexão e acesso": "acesso e conexão à rede de distribuição, PRODIST Módulo 3, "
        "Recursos Energéticos Distribuídos (REDs), requisitos técnicos, interoperabilidade, "
        "observabilidade, operabilidade e controlabilidade (monitoramento e controle remoto), "
        "prazos da distribuidora, parecer e orçamento de acesso, inversão de fluxo",
    },
    "Eólica": {
        "Cortes de geração": "restrição de operação (constrained-off / curtailment) de usinas "
        "eólicas determinada pelo ONS, apuração, compensação e ressarcimento da energia não gerada",
        "Outorga e autorização": "regras e atos de autorização de parques eólicos, alteração de "
        "potência, cronograma de implantação, transferência e revogação de outorga",
    },
    "Armazenamento": {
        "Autorização de armazenamento": "requisitos e procedimentos para autorizar sistemas de "
        "armazenamento de energia (baterias) autônomos",
        "Conexão e faturamento de armazenamento": "conexão, contratação de uso da rede, "
        "faturamento e baterias instaladas junto a usinas ou à geração distribuída (colocalizadas)",
    },
}


# ------------------------------------------------------------
# 2. Prompt
# ------------------------------------------------------------
def montar_prompt():
    linhas = []
    for area, subs in TAXONOMIA.items():
        linhas.append(f"Área: {area}")
        for sub, desc in subs.items():
            linhas.append(f"  - Subárea: {sub} — {desc}")
    lista = "\n".join(linhas)

    return f"""Você é um analista regulatório do setor elétrico brasileiro.
Sua tarefa é classificar uma norma (resolução, portaria ou despacho) nas áreas e subáreas abaixo.

ÁREAS E SUBÁREAS PERMITIDAS (use somente estas, com os nomes exatamente iguais):
{lista}

REGRAS:
1. Leia o texto inteiro. Uma norma sobre outro assunto pode alterar um artigo que pertence
   a uma subárea (ex.: uma norma sobre tarifa social que muda uma regra de compensação de
   geração distribuída). Nesse caso, classifique na subárea e diga isso na justificativa.
2. Uma norma pode ter mais de uma classificação, ou nenhuma.
3. Use apenas o que está escrito no texto. Não deduza nem use conhecimento próprio.
4. Vale classificar tanto o ato que cria, altera ou revoga uma regra quanto o que PROPÕE
   mudança: aviso de consulta pública, audiência pública e tomada de subsídios entram na
   subárea do tema proposto, com o prazo de contribuição.
5. O que não vale é citação de passagem, sem relação com o tema da subárea.
6. Se houver uma relação razoável, mesmo indireta, com uma subárea, classifique-a com
   relevância 1 em vez de deixar de fora. É melhor incluir com relevância baixa do que perder.
6. Independentemente das subáreas, escreva de 1 a 4 "temas" livres e curtos que descrevam
   o assunto da norma (ex.: "tarifa social", "iluminação pública").

FORMATO DA RESPOSTA: apenas um objeto JSON, sem texto antes ou depois, sem ```:
{{"classificacoes": [{{"area": "Solar", "subarea": "Geração distribuída"}}],
  "temas": ["tema livre 1", "tema livre 2"],
  "relevancia": 0,
  "justificativa": "uma frase curta explicando a escolha"}}

"relevancia" vai de 0 a 3:
0 = não afeta nenhuma subárea
1 = afeta pouco ou indiretamente
2 = altera regra de uma subárea
3 = muda regra central de uma subárea (prazo, limite, valor, obrigação)"""


# ------------------------------------------------------------
# 3. Chamada ao modelo para um texto
# ------------------------------------------------------------
def _ler_json(resposta):
    limpo = re.sub(r"```(?:json)?", "", resposta)
    return json.loads(limpo[limpo.find("{") : limpo.rfind("}") + 1])


def _chave(t):
    """Ignora maiúsculas, acentos e espaços ao comparar nomes de área/subárea."""
    t = unicodedata.normalize("NFKD", str(t or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", t.lower())


def _limpar_nome(nome):
    """O modelo às vezes copia a linha inteira do prompt:
    'Conexão e acesso — acesso e conexão à rede...' ou 'Solar > Conexão e acesso'.
    Aqui fica só o nome."""
    n = str(nome or "")
    n = re.split(r"\s+[—–-]\s+|:", n)[
        0
    ]  # corta a descrição após travessão ou dois-pontos
    return n.split(">")[-1].strip()  # se veio "Área > Subárea", fica a última parte


def _achar(nome, opcoes):
    """Casa o nome devolvido pelo modelo com a opção oficial, tolerando pequenas diferenças."""
    chaves = {_chave(o): o for o in opcoes}
    alvo = _chave(_limpar_nome(nome))
    if alvo in chaves:
        return chaves[alvo]
    for k, oficial in chaves.items():  # o nome começa com a opção oficial
        if alvo.startswith(k) or k.startswith(alvo):
            return oficial
    perto = difflib.get_close_matches(alvo, list(chaves), n=1, cutoff=0.85)
    return chaves[perto[0]] if perto else None


def _validar(dados):
    """Converte o que o modelo devolveu nos nomes oficiais. Devolve (pares válidos, brutos)."""
    pares, brutos = [], []
    for c in dados.get("classificacoes", []) or []:
        brutos.append(f"{c.get('area')} > {c.get('subarea')}")
        area = _achar(c.get("area"), TAXONOMIA)
        if not area:
            continue
        sub = _achar(c.get("subarea"), TAXONOMIA[area])
        if sub:
            pares.append((area, sub))
    return pares, brutos


def chamar_nvidia(mensagens):
    headers = {"Authorization": f"{CHAVE}", "Accept": "application/json"}
    payload = {
        "model": MODELO,
        "messages": mensagens,
        "temperature": 0,  # mesma norma -> mesma resposta
        "max_tokens": 1024,  # suficiente para o JSON
        "stream": False,
    }
    r = requests.post(URL, headers=headers, json=payload, timeout=120)
    if r.status_code in (401, 403):
        raise RuntimeError(
            "Chave inválida ou sem permissão. Confira NVIDIA_KEY_CLASSIFIER no .env."
        )
    r.raise_for_status()  # outros erros (limite, servidor) sobem para nova tentativa
    return r.json()["choices"][0]["message"]["content"] or ""


def chamar_llm(mensagens):
    """Claude no Bedrock se BEDROCK_MODEL_ID estiver definida; senão, a API da NVIDIA."""
    return bedrock.conversar(mensagens, max_tokens=1024) if bedrock.MODELO else chamar_nvidia(mensagens)


def classificar_texto(texto, titulo="", max_chars=40000):
    conteudo = (
        f"TÍTULO: {titulo}\n\nTEXTO:\n{texto[:max_chars]}"
        if titulo
        else texto[:max_chars]
    )
    mensagens = [
        {"role": "system", "content": montar_prompt()},
        {"role": "user", "content": "NORMA A CLASSIFICAR:\n\n" + conteudo},
    ]
    for _ in range(2):  # nova tentativa se o JSON vier quebrado
        try:
            dados = _ler_json(chamar_llm(mensagens))
            pares, brutos = _validar(dados)
            return {
                "area": sorted({a for a, _ in pares}),
                "subarea": [
                    f"{a} > {s}" for a, s in pares
                ],  # ex.: "Solar > Cortes de geração"
                # se o modelo classificou mas esqueceu a relevância, assume 2 (média)
                "relevancia": (dados.get("relevancia") or 2) if pares else 0,
                "temas": dados.get("temas", [])[:4],
                "subarea_bruta": brutos,  # o que o modelo respondeu, antes da validação
                "justificativa": dados.get("justificativa", ""),
            }
        except (json.JSONDecodeError, ValueError):
            continue
    return {
        "area": [],
        "subarea": [],
        "relevancia": 0,
        "temas": [],
        "subarea_bruta": [],
        "justificativa": "ERRO: resposta inválida",
    }


# ------------------------------------------------------------
# 4. Classificar o DataFrame inteiro
# ------------------------------------------------------------
def classificar_df(df, coluna_texto="texto", pausa=PAUSA):
    resultados = []
    for i, (_, linha) in enumerate(df.iterrows(), start=1):
        texto, titulo = str(linha[coluna_texto]), str(linha.get("titulo", ""))
        for tentativa in range(3):
            try:
                r = classificar_texto(texto, titulo)
                break
            except RuntimeError:
                raise  # chave errada: para na hora
            except Exception as e:
                print(f"  erro na tentativa {tentativa + 1}: {e} — esperando 30s")
                time.sleep(30)
        else:
            r = {
                "area": [],
                "subarea": [],
                "relevancia": 0,
                "temas": [],
                "subarea_bruta": [],
                "justificativa": "ERRO: limite ou falha da API",
            }
        aviso = ""
        if not r["subarea"] and r["subarea_bruta"]:
            aviso = f"  <- modelo respondeu {r['subarea_bruta']} e não casou com a taxonomia"
        print(
            f"[{i}/{len(df)}] {r['subarea'] or 'nenhuma'} (relevância {r['relevancia']}){aviso}"
        )
        resultados.append(r)
        time.sleep(pausa)
    return pd.concat([df.reset_index(drop=True), pd.DataFrame(resultados)], axis=1)


# ------------------------------------------------------------
# Uso:
#   teste = classificar_df(novidades.head(1))
#   teste[["titulo", "area", "subarea", "relevancia", "temas", "justificativa"]]
# ------------------------------------------------------------
