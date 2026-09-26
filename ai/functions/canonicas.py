"""
Energy Start — Normas canônicas (o "estoque" do copiloto)

Normas-base, em vigor, que o copiloto consulta junto com as novidades do DOU:
a Lei 14.300 (geração distribuída), a REN 1.000 (conexão), o PRODIST... Elas
entram na API marcadas como canônicas: não aparecem no radar de novidades e
não geram alerta de "norma nova"; servem de base para as respostas.

Duas fontes:
  1. Leis e decretos do Planalto, baixados automaticamente (NORMAS_PLANALTO).
  2. PDFs das resoluções da ANEEL (os do Leis.org usados no notebook), colocados
     em ai/data/canonicas/ — o site da ANEEL e o Leis.org bloqueiam download
     automático. A limpeza é a mesma do pré-processamento do notebook.
"""

import html
import re
from pathlib import Path

import pdfplumber
import requests

CABECALHO = {"User-Agent": "Mozilla/5.0 (EnergyStart - hackathon COPPE)"}
PASTA_PDFS = Path(__file__).resolve().parent.parent / "data" / "canonicas"

# Área/subárea no mesmo formato do classificador (só para referência: canônicas não geram alerta).
NORMAS_PLANALTO = [
    {
        "link": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14300.htm",
        "area": ["Solar"],
        "subarea": ["Solar > Geração distribuída", "Solar > Conexão e acesso"],
    },
    {
        "link": "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15097.htm",
        "area": ["Eólica"],
        "subarea": ["Eólica > Outorga e autorização"],
    },
]

TITULO_NORMA = re.compile(
    r"(RESOLUÇÃO NORMATIVA|RESOLUÇÃO HOMOLOGATÓRIA|RESOLUÇÃO AUTORIZATIVA|PORTARIA NORMATIVA|PORTARIA|"
    r"LEI COMPLEMENTAR|LEI|DECRETO)[^\n]*?N[º°o]\s*[\d.]+,?\s*DE\s+[^\n(]+?\d{4}",
    flags=re.I,
)


MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]


def _data_do_titulo(titulo: str) -> str | None:
    """'... DE 6 DE JANEIRO DE 2022' -> '06/01/2022' (formato que a API entende)."""
    m = re.search(r"DE\s+(\d{1,2})[º°]?\s+DE\s+([A-ZÇÃÉÊÔ]+)\s+DE\s+(\d{4})\s*$", titulo, flags=re.I)
    if not m or m.group(2).lower() not in MESES:
        return None
    return f"{int(m.group(1)):02d}/{MESES.index(m.group(2).lower()) + 1:02d}/{m.group(3)}"


# ---------------------------------------------------------------------------
# Planalto (HTML)
# ---------------------------------------------------------------------------


def _html_para_texto(pagina: str) -> str:
    # texto riscado no Planalto é redação revogada/alterada: sai antes de tirar as tags
    pagina = re.sub(r"<(strike|s|del)\b[^>]*>.*?</\1>", " ", pagina, flags=re.S | re.I)
    pagina = re.sub(r"<(script|style|head)[^>]*>.*?</\1>", " ", pagina, flags=re.S | re.I)
    # o HTML do Planalto quebra linha no meio do parágrafo ("Art." numa linha, "2º" na
    # outra): junta tudo primeiro e só quebra onde o parágrafo acaba de verdade
    pagina = re.sub(r"\s+", " ", pagina)
    pagina = re.sub(r"</p>|<br\s*/?>|</h\d>|</div>|</tr>", "\n", pagina, flags=re.I)
    pagina = re.sub(r"<[^>]+>", " ", pagina)
    pagina = html.unescape(pagina)
    pagina = re.sub(r"[ \t\xa0\r]+", " ", pagina)
    return re.sub(r"\s*\n\s*", "\n", pagina).strip()


def baixar_planalto(norma: dict) -> dict | None:
    r = requests.get(norma["link"], headers=CABECALHO, timeout=60)
    r.raise_for_status()
    texto = _html_para_texto(r.content.decode("cp1252", errors="replace"))
    titulo = TITULO_NORMA.search(texto)
    if not titulo:
        print(f"[ignorado] {norma['link']} — não achei o título da norma")
        return None
    # o que vem antes do título é o cabeçalho do site (brasão, "Presidência da República"...)
    texto = texto[titulo.start() :]
    titulo_limpo = re.sub(r"\s+", " ", titulo.group(0)).strip().upper()
    return {
        "titulo": titulo_limpo,
        "tipo": titulo.group(1).title(),
        "texto": texto,
        "link": norma["link"],
        "data": _data_do_titulo(titulo_limpo),
        "orgao": "Presidência da República",
        "fonte": "dou",
        "area": norma.get("area", []),
        "subarea": norma.get("subarea", []),
        "canonica": True,
    }


# ---------------------------------------------------------------------------
# PDFs da ANEEL (Leis.org) — limpeza igual à do notebook (célula "Pré-processamento dos PDFs")
# ---------------------------------------------------------------------------

# Início de um dispositivo: "Art. 12.", "Art. 655-A", "§ 2º", "Parágrafo único", "XXIX-A -", "IV -", "a)"
ROTULO = re.compile(r"^\s*(Art\.\s*\d+[º°]?(?:-[A-Z]+)?|§\s*\d+[º°]?|Parágrafo único|[IVXLC]+(?:-[A-Z]+)?\s+-|[a-z]\))")


def _ler_pdf(caminho: Path) -> str:
    """pdfplumber mantém o 'Art. 1º' no lugar certo (o pypdf solta o número do texto)."""
    with pdfplumber.open(caminho) as pdf:
        return "\n".join(p.extract_text() or "" for p in pdf.pages)


def _remover_rodapes(texto: str) -> str:
    texto = re.sub(r"Leis\.org/aneel\s*-.*?Gerado em:\s*[\d/]+\s*[\d:]+", "", texto)
    return re.sub(r"^\s*\d+/\d+\s*$", "", texto, flags=re.M)


def _separar_atos_relacionados(texto: str) -> str:
    m = re.search(r"Atos que alteram, regulamentam ou revogam", texto)
    return texto[: m.start()].strip() if m else texto


def _chave_rotulo(rotulo: str) -> str:
    return re.sub(r"[\s.º°]", "", rotulo).lower()


def _remover_redacoes_antigas(texto: str) -> str:
    """Quando o texto consolidado traz a redação antiga e a nova, fica só a nova; revogados saem."""
    blocos: list[str] = []
    for linha in texto.splitlines():
        if not linha.strip():
            continue
        if ROTULO.match(linha) or not blocos:
            blocos.append(linha.strip())
        else:
            blocos[-1] += " " + linha.strip()

    manter = [True] * len(blocos)
    for i, bloco in enumerate(blocos):
        novo = "(Redação dada" in bloco or "(Incluído" in bloco or "(Incluída" in bloco
        revogado = "(Revogado pel" in bloco or "(Revogada pel" in bloco
        if revogado:
            manter[i] = False
        if not (novo or revogado):
            continue
        m = ROTULO.match(bloco)
        if not m:
            continue
        chave = _chave_rotulo(m.group(1))
        for j in range(i - 1, max(i - 15, -1), -1):  # procura a versão antiga logo antes
            mj = ROTULO.match(blocos[j])
            if mj and _chave_rotulo(mj.group(1)) == chave and manter[j]:
                manter[j] = False
                break
    return "\n".join(b for b, ok in zip(blocos, manter) if ok)


def _link_aneel(titulo: str) -> str | None:
    """Endereço oficial da resolução no CEDOC da ANEEL (ex.: REN 1.000/2021 -> ren20211000.pdf)."""
    m = re.search(r"RESOLUÇÃO NORMATIVA.*?N[º°]\s*([\d.]+).*?(\d{4})\s*$", titulo, flags=re.I)
    if not m:
        return None
    return f"https://www2.aneel.gov.br/cedoc/ren{m.group(2)}{int(m.group(1).replace('.', '')):03d}.pdf"


def ler_pdf_aneel(caminho: Path) -> dict | None:
    bruto = _ler_pdf(caminho)
    if not bruto.strip():
        print(f"[sem texto] {caminho.name} — PDF escaneado?")
        return None
    texto = _remover_rodapes(bruto)
    titulo = TITULO_NORMA.search(texto)  # antes de juntar as linhas, senão pega a ementa junto
    if not titulo:
        print(f"[ignorado] {caminho.name} — não parece uma norma")
        return None
    texto = _remover_redacoes_antigas(_separar_atos_relacionados(texto))
    titulo_limpo = re.sub(r"\s+", " ", titulo.group(0)).strip().upper()
    publicado = re.search(r"publicado no D\.?O\.?\s*de\s*(\d{2}\.\d{2}\.\d{4})", texto)
    return {
        "titulo": titulo_limpo,
        "tipo": titulo.group(1).title(),
        "texto": texto,
        "link": _link_aneel(titulo_limpo),
        "data": publicado.group(1).replace(".", "/") if publicado else _data_do_titulo(titulo_limpo),
        "orgao": "Agência Nacional de Energia Elétrica",
        "fonte": "aneel",
        "canonica": True,
    }


def carregar_canonicas() -> list[dict]:
    normas = []
    for norma in NORMAS_PLANALTO:
        try:
            lida = baixar_planalto(norma)
        except Exception as e:
            print(f"[erro] {norma['link']}: {e}")
            continue
        if lida:
            normas.append(lida)
    for caminho in sorted(PASTA_PDFS.glob("*.pdf")):
        lida = ler_pdf_aneel(caminho)
        if lida:
            normas.append(lida)
    for n in normas:
        print(f"  {n['titulo'][:70]:70} {len(n['texto']):>8} caracteres")
    return normas
