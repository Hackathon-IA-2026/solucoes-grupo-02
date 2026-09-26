"""
Energy Start — Embeddings (vetores) dos trechos das normas, usando a API da NVIDIA

Os vetores vão para a API junto com cada norma (coluna "trechos") e são o que
o copiloto usa para achar os trechos mais parecidos com a pergunta do usuário.

Modelo: nvidia/nemotron-3-embed-1b (multilíngue). Ele devolve 2048 dimensões;
guardamos só as primeiras 1024 (o modelo é treinado para isso — nos testes a
separação entre trecho certo e errado ficou igual) e normalizamos, para a
similaridade de cosseno virar um produto escalar.
"""

import math
import os
import time

import requests
from dotenv import load_dotenv

from functions.trechos import dividir_em_trechos

load_dotenv()

URL = "https://integrate.api.nvidia.com/v1/embeddings"
MODELO = "nvidia/nemotron-3-embed-1b"
DIMENSOES = 1024
LOTE = 32  # textos por chamada
CHAVE = os.getenv("NVIDIA_KEY_COPILOTO") or os.getenv("NVIDIA_KEY_SUMMARIZER", "")


def _normalizar(v: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [round(x / n, 6) for x in v]


def vetorizar(textos: list[str], tipo: str = "passage") -> list[list[float]]:
    """tipo="passage" para trechos de norma, tipo="query" para a pergunta do usuário."""
    vetores: list[list[float]] = []
    for i in range(0, len(textos), LOTE):
        lote = textos[i : i + LOTE]
        for tentativa in range(3):
            try:
                r = requests.post(
                    URL,
                    headers={"Authorization": f"Bearer {CHAVE}", "Accept": "application/json"},
                    json={"model": MODELO, "input": lote, "input_type": tipo, "encoding_format": "float", "truncate": "END"},
                    timeout=120,
                )
                if r.status_code in (401, 403):
                    raise RuntimeError("Chave da NVIDIA inválida para embeddings. Confira NVIDIA_KEY_COPILOTO no .env.")
                r.raise_for_status()
                break
            except RuntimeError:
                raise
            except Exception as e:
                if tentativa == 2:
                    raise
                print(f"  erro nos embeddings (tentativa {tentativa + 1}): {e} — esperando 15s")
                time.sleep(15)
        for item in sorted(r.json()["data"], key=lambda d: d["index"]):
            vetores.append(_normalizar(item["embedding"][:DIMENSOES]))
    return vetores


def _lista(v) -> list:
    return v if isinstance(v, list) else []


def texto_da_novidade(linha) -> str:
    """Trecho de busca de uma novidade, montado com a saída do resumidor. O texto bruto de
    um despacho é quase todo formalidade ("O DIRETOR-GERAL... resolve"); o resumo e as
    mudanças dizem do que ele trata. Cada mudança leva o trecho literal que o resumidor
    conferiu contra a norma, para o copiloto citar a norma, e não só o resumo."""
    resumo = str(linha.get("resumo") or "").strip()
    if not resumo or resumo.startswith("ERRO"):
        return ""
    partes = [f"Resumo do Energy Start: {resumo}"]
    for m in _lista(linha.get("mudancas")):
        antes = f" Antes: {m['antes']}." if m.get("antes") else ""
        depois = f" Agora: {m['depois']}." if m.get("depois") else ""
        literal = f' Trecho da norma: "{m["trecho"]}"' if m.get("trecho") else ""
        partes.append(f"- {m.get('o_que_mudou', '')}.{antes}{depois}{literal}")
    for v in _lista(linha.get("valores")):
        partes.append(f"- {v.get('parametro')}: {v.get('valor')} {v.get('unidade') or ''}".rstrip())
    for p in _lista(linha.get("prazos")):
        partes.append(f"- Prazo ({p.get('tipo')}): {p.get('data')} — {p.get('descricao')}")
    afetados = [str(a) for a in _lista(linha.get("quem_e_afetado"))]
    if afetados:
        extra = f" e mais {len(afetados) - 8}" if len(afetados) > 8 else ""
        partes.append("Quem é afetado: " + ", ".join(afetados[:8]) + extra + ".")
    return "\n".join(partes)


def trechos_da_norma(linha, coluna_texto: str = "texto") -> list[dict]:
    """Divide a norma em trechos e calcula o vetor de cada um. Novidade com resumo ganha
    também o trecho "Resumo" (texto_da_novidade), que é o que a busca acha mais fácil.
    O título entra no texto vetorizado (não no trecho guardado): assim "Lei 14.300"
    ou "Despacho 3.708" na pergunta também ajudam a achar o trecho certo."""
    titulo = str(linha.get("titulo") or "")
    trechos = dividir_em_trechos(str(linha.get(coluna_texto) or ""))
    resumo = texto_da_novidade(linha)
    if resumo:
        trechos = [{"artigo": "Resumo", "texto": resumo}] + trechos
    if not trechos:
        return []
    entradas = [f"{titulo}\n{t['artigo'] or ''}\n{t['texto']}".strip() for t in trechos]
    for trecho, vetor in zip(trechos, vetorizar(entradas, "passage")):
        trecho["vetor"] = vetor
    return trechos


def vetorizar_df(df, coluna_texto: str = "texto"):
    """Acrescenta a coluna "trechos" ([{artigo, texto, vetor}]) que a API grava para o copiloto."""
    df = df.copy()
    df["trechos"] = [trechos_da_norma(linha, coluna_texto) for _, linha in df.iterrows()]
    total = sum(len(t) for t in df["trechos"])
    print(f"Embeddings: {total} trechos de {len(df)} normas vetorizados")
    return df
