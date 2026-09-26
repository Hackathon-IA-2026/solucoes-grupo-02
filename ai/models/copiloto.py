# ============================================================
# Energy Start — Copiloto regulatório (3º LLM)
#
# Responde perguntas do usuário sobre regulação do setor elétrico.
#
# FLUXO (uma busca só, não cascata):
#   1. Recupera pedaços de normas canônicas E de novidades na MESMA busca
#   2. Ranqueia dando peso maior para novidade recente (ela altera a canônica)
#   3. Se nada passa do limiar mínimo -> busca externa
#   4. LLM responde citando trecho + link de cada afirmação
#
# Os vetores ficam na API (tabela de trechos); a busca é POST /interno/trechos/busca.
# ============================================================

import json
import os
import re
import time
from datetime import date, datetime

import requests
from dotenv import load_dotenv

from functions.embeddings import vetorizar
from functions.enviar_api import API_URL, CHAVE as CHAVE_INTERNA
from functions.extractor import BASE, CABECALHO, _interessa, baixar_texto
from functions.trechos import dividir_em_trechos

load_dotenv()

# Modelo que escreve a resposta. Com BEDROCK_MODEL_ID (ex.: us.anthropic.claude-haiku-4-5-20251001-v1:0),
# usa o Claude no Amazon Bedrock — responde em poucos segundos; na AWS as credenciais vêm do papel da
# task. Sem ela, usa a API gratuita da NVIDIA, que leva de 20 a 50s por resposta.
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "").strip()
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODELO = "google/gemma-4-31b-it"
CHAVE = f"Bearer {os.getenv('NVIDIA_KEY_COPILOTO') or os.getenv('NVIDIA_KEY_SUMMARIZER', '')}"

CANDIDATOS = 20          # trechos trazidos da base em cada busca
TOP_K = 8                # trechos que vão para o LLM
# Similaridade mínima (cosseno) para um trecho ir ao LLM. Calibrado com perguntas reais: trechos
# certos ficaram entre 0,46 e 0,57, e trechos sem relação chegaram a 0,41. Só a similaridade não
# basta para saber se a base responde (numa pergunta sobre baterias, a lei de eólica offshore deu
# 0,52), então o LLM também julga: se nenhuma fonte responde, ele devolve SEM_RESPOSTA e o fluxo
# segue para a busca externa.
LIMIAR = 0.40
PESO_NOVIDADE = 0.20     # bônus de uma novidade publicada hoje; cai até zero em 1 ano
BONUS_NORMA = 0.20       # a pergunta citou o número da norma do trecho
BONUS_ARTIGO = 0.25      # ... e o artigo do trecho
CANONICA_RELACIONADA = 2 # trechos da canônica que uma novidade recuperada altera
EXTERNOS = 3             # publicações do DOU lidas na busca externa
HISTORICO = 6            # mensagens anteriores da conversa enviadas ao LLM

SEM_RESPOSTA = {
    "answer": "Não encontrei, nas normas da base nem na busca no Diário Oficial, um trecho que responda a isso com "
    "segurança — e prefiro não completar a lacuna por conta própria. Tente citar o tema, a norma ou o número do ato.",
    "citations": [],
}


# ------------------------------------------------------------
# Referências citadas no texto: "art. 26 da Lei 14.300", "REN nº 1.000/2021"
# (embedding é ruim com número exato; a busca e o ranking tratam isso à parte)
# ------------------------------------------------------------
RE_ARTIGO_CITADO = re.compile(r"\bart(?:igo)?s?\.?\s*(\d{1,4})", re.I)
RE_NORMA_CITADA = re.compile(
    r"\b(?:lei(?:\s+complementar)?|ren|reh|rea|resolu[cç][aã]o(?:\s+(?:normativa|homologat[oó]ria|autorizativa))?|"
    r"portaria(?:\s+normativa)?|despacho|decreto|n[º°o])\s*(?:ANEEL\s*)?(?:n[º°o.]?\s*)?(\d{1,3}(?:\.\d{3})+|\d{1,6})\b",
    re.I,
)


def _digitos(numero: str | None) -> str:
    return re.sub(r"\D", "", numero or "")


def referencias(texto: str) -> tuple[list[str], list[str]]:
    """Números de norma (só dígitos: "14300") e de artigo ("26") citados no texto."""
    numeros = {_digitos(m.group(1)) for m in RE_NORMA_CITADA.finditer(texto)}
    artigos = {m.group(1) for m in RE_ARTIGO_CITADO.finditer(texto)}
    return sorted(n for n in numeros if n)[:10], sorted(artigos)[:10]


def _artigo_corresponde(rotulo: str | None, artigo: str) -> bool:
    """'Art. 26' contém 26; 'Art. 29 a 31' (artigos curtos juntados) contém 30."""
    numeros = [int(n) for n in re.findall(r"\d+", rotulo or "")]
    return bool(numeros) and numeros[0] <= int(artigo) <= numeros[-1]


# ------------------------------------------------------------
# 1. Recuperação: canônicas e novidades na mesma busca
# ------------------------------------------------------------
def recuperar(vetor: list[float], numeros=(), artigos=(), somente_referencias=False) -> list[dict]:
    """A API compara o vetor da pergunta com todos os trechos da base (normas canônicas e
    novidades juntas) e devolve os mais parecidos — mais os das normas e artigos citados."""
    r = requests.post(
        f"{API_URL}/interno/trechos/busca",
        json={
            "vetor": vetor,
            "limite": CANDIDATOS,
            "numeros": list(numeros),
            "artigos": list(artigos),
            "somenteReferencias": somente_referencias,
        },
        headers={"x-internal-key": CHAVE_INTERNA},
        timeout=60,
    )
    r.raise_for_status()
    return [{**t, "externa": False} for t in r.json()]


# ------------------------------------------------------------
# 2. Ranking: novidade recente pesa mais; referência citada também
# ------------------------------------------------------------
def _dias_desde(data_iso: str | None, hoje: date) -> int | None:
    try:
        return (hoje - datetime.strptime((data_iso or "")[:10], "%Y-%m-%d").date()).days
    except ValueError:
        return None


def ranquear(fontes: list[dict], numeros=(), artigos=(), hoje: date | None = None) -> list[dict]:
    """pontuação = similaridade x (1 + PESO_NOVIDADE x recência) + bônus da referência citada.
    A canônica não ganha bônus de recência; a novidade ganha mais quanto mais recente."""
    hoje = hoje or date.today()
    for f in fontes:
        norma = f["norma"]
        recencia = 0.0
        dias = _dias_desde(norma.get("publishedAt"), hoje)
        if not norma.get("canonica") and dias is not None:
            recencia = max(0.0, 1 - dias / 365)
        bonus = 0.0
        cita_norma = _digitos(norma.get("numero")) in numeros if norma.get("numero") else False
        if cita_norma:
            bonus += BONUS_NORMA
        if artigos and (cita_norma or not numeros) and any(_artigo_corresponde(f.get("artigo"), a) for a in artigos):
            bonus += BONUS_ARTIGO
        f["bonus"] = bonus
        f["pontuacao"] = f["similaridade"] * (1 + PESO_NOVIDADE * recencia) + bonus
    return sorted(fontes, key=lambda f: f["pontuacao"], reverse=True)


def puxar_canonica_relacionada(fontes: list[dict], vetor: list[float]) -> list[dict]:
    """Se uma novidade recuperada cita uma norma canônica ("altera a REN nº 1.000"), traz
    também os trechos dessa canônica: é o que deixa o LLM dizer o que mudou."""
    novidades = [f for f in fontes if not f["norma"].get("canonica")]
    if not novidades:
        return []
    proprias = {_digitos(f["norma"].get("numero")) for f in novidades}
    citadas, _ = referencias(" ".join(f["texto"] for f in novidades))
    citadas = [n for n in citadas if n not in proprias]
    if not citadas:
        return []
    ja_tem = {f.get("id") for f in fontes}
    relacionadas = [
        f for f in recuperar(vetor, numeros=citadas, somente_referencias=True) if f["norma"].get("canonica") and f.get("id") not in ja_tem
    ]
    return sorted(relacionadas, key=lambda f: f["similaridade"], reverse=True)[:CANONICA_RELACIONADA]


# ------------------------------------------------------------
# 3. Busca externa: Diário Oficial da União
# ------------------------------------------------------------
PALAVRAS_VAZIAS = set(
    "a o e de da do das dos em no na nos nas um uma para por com sem que qual quais como quando onde "
    "é ser são foi sobre isso esse essa este esta minha meu sua seu preciso posso devo fazer até ao aos "
    "à às ou se já mais muito".split()
)


def _termos_de_busca(pergunta: str) -> str:
    palavras = re.findall(r"[\wÀ-ú.]+", pergunta.lower())
    return " ".join([p for p in palavras if p not in PALAVRAS_VAZIAS and len(p) > 2][:6])


# A busca do DOU trata palavras soltas como "qualquer uma delas" (os resultados vêm de todos os
# órgãos e somem no filtro de energia); expressão entre aspas acha o ato certo. O LLM extrai as
# expressões da pergunta — é uma chamada curta, e só acontece quando a base não responde.
PROMPT_CONSULTA_DOU = """Você monta buscas no Diário Oficial da União para o setor elétrico.
Da pergunta, extraia de 1 a 3 expressões curtas (2 a 4 palavras), como aparecem em normas
(ex.: "armazenamento de energia", "geração distribuída", "parecer de acesso").
Responda só com um JSON, sem texto antes ou depois: {"expressoes": ["...", "..."]}"""


def _expressoes_de_busca(pergunta: str) -> list[str]:
    try:
        bruto = chamar_llm(
            [{"role": "system", "content": PROMPT_CONSULTA_DOU}, {"role": "user", "content": pergunta}], max_tokens=150
        )
        dados = json.loads(bruto[bruto.find("{") : bruto.rfind("}") + 1])
        expressoes = [str(e).strip().strip('"') for e in dados.get("expressoes", []) if str(e).strip()]
    except Exception as e:
        print(f"  [busca externa] não consegui gerar as expressões com o LLM ({e}); extraindo da pergunta")
        # "armazenamento de energia", "parecer de acesso": o jeito como os termos aparecem nas normas
        expressoes = re.findall(r"\b[a-zà-ú]{4,} d[eao]s? [a-zà-ú]{4,}\b", pergunta.lower())[-3:]
    return [f'"{e}"' for e in expressoes[:3]] or [_termos_de_busca(pergunta)]


def _consultar_dou(consulta: str) -> list[dict]:
    r = requests.get(
        f"{BASE}/consulta/-/buscar/dou",
        params={"q": consulta, "s": "do1", "exactDate": "all", "sortType": "0"},
        headers=CABECALHO,
        timeout=60,
    )
    r.raise_for_status()
    m = re.search(r'<script[^>]*id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>(.*?)</script>', r.text, flags=re.S)
    return [x for x in (json.loads(m.group(1)).get("jsonArray", []) if m else []) if _interessa(x)]


def _data_iso(data_br: str | None) -> str | None:
    try:
        return datetime.strptime(data_br or "", "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def _codigo(titulo: str) -> str:
    """'DESPACHO Nº 3.415, DE 31 DE AGOSTO DE 2026' -> 'Despacho nº 3.415/2026'."""
    m = re.match(r"^\s*([A-ZÇÃÉÍÓÚÂÊÔ ]+?)\s+N[º°o.]\s*([\d.\-/]+\d).*?(\d{4})\s*$", titulo or "", flags=re.I)
    return f"{m.group(1).strip().capitalize()} nº {m.group(2)}/{m.group(3)}" if m else (titulo or "Publicação no DOU")


def buscar_no_dou(pergunta: str, vetor: list[float]) -> list[dict]:
    """Procura no DOU (Seção 1, órgãos de energia), lê as primeiras publicações e compara os
    trechos delas com a pergunta do mesmo jeito que a busca interna. É uma busca de verdade:
    o LLM só responde com o texto que foi lido, nunca "pesquisando" de memória."""
    consultas = _expressoes_de_busca(pergunta)
    listas = [_consultar_dou(c) for c in consultas]
    print(f"  [busca externa] consultas {consultas}: {[len(l) for l in listas]} publicação(ões) de energia")
    # intercala os resultados de cada expressão (o 1º de cada, depois o 2º...) sem repetir
    resultados, vistos = [], set()
    for posicao in range(max((len(l) for l in listas), default=0)):
        for lista in listas:
            if posicao < len(lista) and lista[posicao]["urlTitle"] not in vistos:
                vistos.add(lista[posicao]["urlTitle"])
                resultados.append(lista[posicao])
    resultados = resultados[:EXTERNOS]

    fontes = []
    for item in resultados:
        try:
            texto = baixar_texto(item["urlTitle"])
        except Exception as e:
            print(f"  [busca externa] não consegui ler {item.get('title')}: {e}")
            continue
        titulo = item.get("title", "")
        trechos = dividir_em_trechos(texto)
        vetores = vetorizar([f"{titulo}\n{t['artigo'] or ''}\n{t['texto']}" for t in trechos], "passage")
        norma = {
            "id": None,
            "code": _codigo(titulo),
            "title": titulo,
            "numero": (re.search(r"N[º°o.]\s*([\d.]+\d)", titulo) or [None, None])[1],
            "url": f"{BASE}/web/dou/-/{item['urlTitle']}",
            "source": "dou",
            "publishedAt": _data_iso(item.get("pubDate")),
            "canonica": False,
        }
        for t, v in zip(trechos, vetores):
            similaridade = sum(a * b for a, b in zip(v, vetor))
            fontes.append({"artigo": t["artigo"], "texto": t["texto"], "similaridade": similaridade, "norma": norma, "externa": True})
        time.sleep(1)  # educação com o servidor do governo
    return fontes


# ------------------------------------------------------------
# 4. Resposta do LLM, citando trecho + link
# ------------------------------------------------------------
PROMPT_COPILOTO = """Você é o copiloto regulatório do Energy Start, para donos e operadores de usinas
solares, eólicas e de armazenamento no Brasil.

REGRAS:
1. Responda SOMENTE com base nas FONTES numeradas da última mensagem. Nunca complete com conhecimento próprio.
2. Toda afirmação termina com a fonte no formato [n], onde n é o número da fonte.
3. Fontes "NOVIDADE" são publicações recentes. Se uma novidade contradiz ou altera uma "NORMA BASE",
   a NOVIDADE prevalece: diga explicitamente o que mudou e desde quando.
4. Se NENHUMA fonte responde à pergunta, responda exatamente e somente: SEM_RESPOSTA
   (sem citar fontes). Se responderem só em parte, responda a parte e diga o que ficou sem resposta.
5. Números, percentuais, prazos e datas: copie exatamente como estão na fonte.
6. Só fale da usina do usuário (PERFIL DA USINA) se a pergunta for sobre ela. Nunca conclua que a usina
   está obrigada, proibida ou enquadrada em algo por dedução a partir do perfil.
7. Português claro, sem juridiquês. Vá direto ao ponto, 2 a 6 frases; use lista com "- " se ajudar.
8. Responda em texto corrido (sem JSON, sem markdown além da lista)."""


def _descrever_perfil(perfil: dict | None) -> str:
    if not perfil:
        return "não informado"
    partes = [
        perfil.get("name"),
        perfil.get("kind") and f"fonte {perfil['kind']}",
        perfil.get("capacityMw") and f"{perfil['capacityMw']} MW",
        perfil.get("submarket") and f"submercado {perfil['submarket']}",
        perfil.get("contractEnv") and f"ambiente {perfil['contractEnv']}",
        perfil.get("areas") and f"áreas monitoradas: {', '.join(perfil['areas'])}",
    ]
    return "; ".join(p for p in partes if p)


def _rotulo(fonte: dict) -> str:
    norma = fonte["norma"]
    base = norma.get("code") or norma.get("title") or "Norma"
    return f"{base}, {fonte['artigo']}" if fonte.get("artigo") else base


def _data_br(data_iso: str | None) -> str | None:
    try:
        return datetime.strptime((data_iso or "")[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return None


def _cabecalho_fonte(n: int, fonte: dict) -> str:
    norma = fonte["norma"]
    if norma.get("canonica"):
        tipo = "NORMA BASE"
    else:
        publicada = _data_br(norma.get("publishedAt"))
        tipo = f"NOVIDADE, publicada em {publicada}" if publicada else "NOVIDADE"
        if fonte.get("externa"):
            tipo += ", achada na busca no DOU"
    return f"[{n}] ({tipo}) {_rotulo(fonte)} — {norma.get('url') or 'sem link'}"


SOBRECARGA = (429, 500, 502, 503, 504, 529)  # a API gratuita da NVIDIA devolve 529 quando está cheia


def chamar_llm(mensagens: list[dict], max_tokens: int = 1024) -> str:
    """mensagens no formato OpenAI ([{"role": "system"|"user"|"assistant", "content": "..."}])."""
    return chamar_bedrock(mensagens, max_tokens) if BEDROCK_MODEL_ID else chamar_nvidia(mensagens, max_tokens)


_bedrock = None


def _cliente_bedrock():
    global _bedrock
    if _bedrock is None:
        import boto3
        from botocore.config import Config

        # tentativas automáticas com espera quando o Bedrock limita a vazão (ThrottlingException)
        _bedrock = boto3.client(
            "bedrock-runtime", region_name=AWS_REGION, config=Config(retries={"max_attempts": 4, "mode": "adaptive"}, read_timeout=120)
        )
    return _bedrock


def _turnos_bedrock(mensagens: list[dict]) -> tuple[list[dict], list[dict]]:
    """Formato da API Converse: system separado, e a conversa alternando user/assistant,
    começando por user (turnos seguidos do mesmo papel são juntados)."""
    system = [{"text": m["content"]} for m in mensagens if m["role"] == "system"]
    turnos: list[dict] = []
    for m in mensagens:
        if m["role"] not in ("user", "assistant") or not m.get("content"):
            continue
        if turnos and turnos[-1]["role"] == m["role"]:
            turnos[-1]["content"][0]["text"] += "\n\n" + m["content"]
        else:
            turnos.append({"role": m["role"], "content": [{"text": m["content"]}]})
    while turnos and turnos[0]["role"] != "user":
        turnos.pop(0)
    return system, turnos


def chamar_bedrock(mensagens: list[dict], max_tokens: int = 1024) -> str:
    system, turnos = _turnos_bedrock(mensagens)
    resposta = _cliente_bedrock().converse(
        modelId=BEDROCK_MODEL_ID,
        system=system,
        messages=turnos,
        inferenceConfig={"maxTokens": max_tokens, "temperature": 0},
    )
    return "".join(parte.get("text", "") for parte in resposta["output"]["message"]["content"])


def chamar_nvidia(mensagens: list[dict], max_tokens: int = 1024) -> str:
    for tentativa in range(3):
        r = requests.post(
            URL,
            headers={"Authorization": CHAVE, "Accept": "application/json"},
            json={"model": MODELO, "messages": mensagens, "temperature": 0, "max_tokens": max_tokens, "stream": False},
            timeout=120,
        )
        if r.status_code in (401, 403):
            raise RuntimeError("Chave inválida ou sem permissão. Confira NVIDIA_KEY_COPILOTO no .env.")
        if r.status_code in SOBRECARGA and tentativa < 2:
            print(f"  [copiloto] NVIDIA sobrecarregada ({r.status_code}) — nova tentativa em {3 * (tentativa + 1)}s")
            time.sleep(3 * (tentativa + 1))
            continue
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"] or ""


MARCADOR_SEM_RESPOSTA = "SEM_RESPOSTA"


def gerar_resposta(pergunta: str, fontes: list[dict], perfil: dict | None, historico: list[dict]) -> dict | None:
    """Resposta com as citações usadas, ou None se o LLM julgar que nenhuma fonte responde."""
    blocos = [f"{_cabecalho_fonte(n, f)}\n{f['texto']}" for n, f in enumerate(fontes, start=1)]
    conteudo = f"PERFIL DA USINA: {_descrever_perfil(perfil)}\n\nFONTES:\n\n" + "\n\n".join(blocos) + f"\n\nPERGUNTA: {pergunta}"
    mensagens = [{"role": "system", "content": PROMPT_COPILOTO}]
    mensagens += [t for t in historico[-HISTORICO:] if t.get("role") in ("user", "assistant") and t.get("content")]
    mensagens.append({"role": "user", "content": conteudo})

    resposta = chamar_llm(mensagens).strip()
    if not resposta:
        raise RuntimeError("O modelo devolveu uma resposta vazia.")
    if resposta.strip(" .\n\"'`*").upper().startswith(MARCADOR_SEM_RESPOSTA):
        return None

    # cita só o que o modelo usou: [1], [2] ou [1, 3] no texto
    usadas = sorted({int(n) for grupo in re.findall(r"\[(\d+(?:\s*,\s*\d+)*)\]", resposta) for n in re.findall(r"\d+", grupo)})
    usadas = [n for n in usadas if 1 <= n <= len(fontes)]
    return {
        "answer": resposta,
        "citations": [
            {
                "label": f"[{n}] {_rotulo(fontes[n - 1])}",
                "excerpt": fontes[n - 1]["texto"],
                "normId": fontes[n - 1]["norma"].get("id"),
                "url": fontes[n - 1]["norma"].get("url"),
            }
            for n in usadas
        ],
    }


# ------------------------------------------------------------
# Fluxo completo
# ------------------------------------------------------------
# "E se for acima de 500 kW?", "E para quem...", "e essa lei vale para...": depende da pergunta anterior.
RE_SEGUIMENTO = re.compile(r"^\s*(e|mas|então|entao)\b|\b(isso|disso|nisso|dela|dele|nesse caso|neste caso|essa lei|essa norma|esse artigo)\b", re.I)


def responder(pergunta: str, perfil: dict | None = None, historico: list[dict] | None = None) -> dict:
    historico = historico or []
    inicio = time.time()
    # Só pergunta de seguimento busca junto com a anterior: pergunta de assunto novo na mesma
    # conversa não pode herdar a norma citada antes (o bônus iria para a norma errada).
    anterior = next((t["content"] for t in reversed(historico) if t.get("role") == "user"), "")
    consulta = f"{anterior}\n{pergunta}" if anterior and RE_SEGUIMENTO.search(pergunta) else pergunta
    numeros, artigos = referencias(consulta)
    vetor = vetorizar([consulta], "query")[0]

    # 1-2. Base interna: canônicas e novidades numa busca só, ranqueadas
    candidatos = ranquear(recuperar(vetor, numeros, artigos), numeros, artigos)
    fontes = [f for f in candidatos if f["similaridade"] >= LIMIAR or f["bonus"] > 0][:TOP_K]
    if fontes:
        fontes += puxar_canonica_relacionada(fontes, vetor)
        _registrar("base", fontes, numeros, artigos, inicio)
        resposta = gerar_resposta(pergunta, fontes, perfil, historico)
        print(f"[copiloto] resposta do LLM em {time.time() - inicio:.1f}s no total")
        if resposta:
            return resposta
        print("[copiloto] o LLM julgou que a base não responde — indo para a busca externa")
    else:
        melhor = f"{candidatos[0]['similaridade']:.2f}" if candidatos else "base vazia"
        print(f"[copiloto] nada da base acima do limiar ({LIMIAR}; melhor: {melhor}) — indo para a busca externa")

    # 3. Busca externa no DOU, com o mesmo limiar e o mesmo julgamento do LLM
    externas = [f for f in ranquear(buscar_no_dou(pergunta, vetor), numeros, artigos) if f["similaridade"] >= LIMIAR][:TOP_K]
    if externas:
        _registrar("busca no DOU", externas, numeros, artigos, inicio)
        resposta = gerar_resposta(pergunta, externas, perfil, historico)
        print(f"[copiloto] resposta do LLM em {time.time() - inicio:.1f}s no total")
        if resposta:
            return resposta
    print("[copiloto] sem resposta na base nem no DOU")
    return SEM_RESPOSTA


def _registrar(origem: str, fontes: list[dict], numeros, artigos, inicio: float) -> None:
    print(
        f"[copiloto] {time.time() - inicio:.1f}s | {len(fontes)} fonte(s) da {origem} (normas {numeros or '-'}, artigos {artigos or '-'}): "
        + "; ".join(map(_resumo_fonte, fontes))
    )


def _resumo_fonte(f: dict) -> str:
    bonus = f" +{f['bonus']:.2f}" if f.get("bonus") else ""
    return f"{_rotulo(f)} ({f['similaridade']:.2f}{bonus})"
