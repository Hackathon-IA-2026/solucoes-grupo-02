"""
Energy Start — Coletor diário do DOU (sem ZIP, sem INLABS)

Usa a página pública de leitura do jornal da Imprensa Nacional:
    https://www.in.gov.br/leiturajornal?data=DD-MM-AAAA&secao=do1
Ela traz, dentro do HTML, uma lista em JSON com todas as publicações do dia.
Cada publicação completa fica em:
    https://www.in.gov.br/web/dou/-/<urlTitle>

ATENÇÃO: não é uma API documentada. Se o site mudar, rode inspecionar_dia()
e ajuste os nomes dos campos.

Instalar:  pip install requests pandas
Uso no Colab:
    df = coletar_dia("21-09-2026")                    # um dia
    df = coletar_periodo("01-09-2026", "21-09-2026")  # vários dias
    df = classificar_df(df)                           # e segue para o classificador
"""

import html
import json
import re
import time
from datetime import datetime, timedelta

import pandas as pd
import requests

BASE = "https://www.in.gov.br"
CABECALHO = {"User-Agent": "Mozilla/5.0 (EnergyStart - hackathon COPPE)"}

# Quem entra e quem sai (aprendido no CSV de agosto: ANP e ANM passavam pelo filtro do MME)

# Original:

# ORGAOS_INCLUIR = ["Agência Nacional de Energia Elétrica", "Ministério de Minas e Energia",
#                   "Conselho Nacional de Política Energética"]
# ORGAOS_EXCLUIR = ["Agência Nacional do Petróleo", "Agência Nacional de Mineração"]

ORGAOS_INCLUIR = [
    "Agência Nacional de Energia Elétrica",
    "Ministério de Minas e Energia",
    "Conselho Nacional de Política Energética",
    "Presidência da República",
    "Atos do Poder Legislativo",
]

ORGAOS_EXCLUIR = [
    "Agência Nacional do Petróleo",
    "Agência Nacional de Mineração",
    "Ministério da Defesa",  # Exemplo de ruído que pode vir da Presidência
    "Ministério da Saúde",
]

# ---------------------------------------------------------------------------
# 1. Lista de publicações do dia
# ---------------------------------------------------------------------------


def _json_da_pagina(pagina_html: str) -> list:
    m = re.search(
        r'<script[^>]*id="params"[^>]*>(.*?)</script>', pagina_html, flags=re.S
    )
    if not m:
        return []
    return json.loads(m.group(1)).get("jsonArray", [])


def listar_dia(data: str, secao: str = "do1") -> list:
    """data no formato DD-MM-AAAA. Devolve a lista bruta de publicações."""
    r = requests.get(
        f"{BASE}/leiturajornal",
        params={"data": data, "secao": secao},
        headers=CABECALHO,
        timeout=60,
    )
    r.raise_for_status()
    return _json_da_pagina(r.text)


def _interessa(item: dict) -> bool:
    orgao = item.get("hierarchyStr", "") or ""
    return any(o in orgao for o in ORGAOS_INCLUIR) and not any(
        o in orgao for o in ORGAOS_EXCLUIR
    )


# ---------------------------------------------------------------------------
# 2. Texto completo de cada publicação
# ---------------------------------------------------------------------------


def _limpar(t: str) -> str:
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", t, flags=re.S | re.I)
    t = re.sub(r"</p>|<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t\xa0]+", " ", t)
    return re.sub(r"\s*\n\s*", "\n", t).strip()


def baixar_texto(url_title: str) -> str:
    r = requests.get(f"{BASE}/web/dou/-/{url_title}", headers=CABECALHO, timeout=60)
    r.raise_for_status()
    # o corpo da matéria fica na div "texto-dou"; se não achar, usa a página inteira
    m = re.search(
        r'<div[^>]*class="[^"]*texto-dou[^"]*"[^>]*>(.*?)</div>\s*</div>',
        r.text,
        flags=re.S,
    )
    return _limpar(m.group(1) if m else r.text)


# ---------------------------------------------------------------------------
# 3. Coleta de um dia ou de um período
# ---------------------------------------------------------------------------
# Novo
def coletar_dia(data: str, pausa: float = 1.5) -> pd.DataFrame:
    linhas = []
    # Varre a Seção 1 Ordinária (do1) e a Seção 1 Extra (do1e)
    for secao_alvo in ["do1", "do1e"]:
        try:
            publicacoes = listar_dia(data, secao=secao_alvo)
        except Exception as e:
            print(f"Erro ao listar {secao_alvo} no dia {data}: {e}")
            continue

        itens = [i for i in publicacoes if _interessa(i)]
        for item in itens:
            try:
                texto = baixar_texto(item["urlTitle"])
            except Exception as e:
                print(f"  [erro ao baixar] {item.get('title')}: {e}")
                continue
            linhas.append(
                {
                    "data": item.get("pubDate", data),
                    "orgao": item.get("hierarchyStr", ""),
                    "tipo": item.get("artType", ""),
                    "titulo": item.get("title", "") or item.get("titulo", ""),
                    "texto": texto,
                    "link": f"{BASE}/web/dou/-/{item['urlTitle']}",
                }
            )
            time.sleep(pausa)

    print(f"{data}: {len(linhas)} publicações coletadas (Ordinária + Extra)")
    return pd.DataFrame(linhas)


def coletar_periodo(inicio: str, fim: str) -> pd.DataFrame:
    d = datetime.strptime(inicio, "%d-%m-%Y")
    ultimo = datetime.strptime(fim, "%d-%m-%Y")
    partes = []
    while d <= ultimo:
        if d.weekday() < 5:  # o DOU ordinário sai de segunda a sexta
            try:
                partes.append(coletar_dia(d.strftime("%d-%m-%Y")))
            except Exception as e:
                print(f"{d:%d-%m-%Y}: falhou ({e})")
        d += timedelta(days=1)
    partes = [p for p in partes if len(p)]
    return pd.concat(partes, ignore_index=True) if partes else pd.DataFrame()


# ---------------------------------------------------------------------------
# 4. Diagnóstico, se algo parar de funcionar
# ---------------------------------------------------------------------------


def inspecionar_dia(data: str):
    itens = listar_dia(data)
    print(f"{len(itens)} publicações no dia. Campos do primeiro item:")
    if itens:
        print(json.dumps(itens[0], ensure_ascii=False, indent=2)[:1500])


# if __name__ == "__main__":
#     # Output
#     df_dia = coletar_dia(Date.today().strftime("%d-%m-%Y"))
#     # CSV Completo com as colunas (data, orgao, tipo, titulo, texto, link)
#     df_dia.to_csv("../data/output/law_day.csv")
