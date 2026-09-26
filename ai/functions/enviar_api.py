"""
Energy Start — Envio do resultado do pipeline para a API

Manda o DataFrame final (saída do coletar_df) para POST /interno/ingestao.
A API grava normas, trechos e limites e dispara os alertas de cada empresa
(norma nova nas áreas que ela monitora, limite que a usina não cumpre).

Precisa no .env:
    API_URL=http://localhost:3000        (no docker-compose: http://api:3000;
                                          no deploy da AWS: https://<host>/api)
    INTERNAL_API_KEY=<a mesma chave configurada na API>
"""

import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("API_URL", "http://localhost:3000").rstrip("/")
CHAVE = os.getenv("INTERNAL_API_KEY", "")
LOTE = 50  # normas por requisição; cada uma leva o texto completo


def enviar_para_api(df) -> dict:
    """Envia as normas em lotes e devolve o total somado das respostas da API."""
    total = {"recebidas": 0, "criadas": 0, "duplicadas": 0, "rejeitadas": 0, "alertas": 0}
    if df.empty:
        print("Nada para enviar à API.")
        return total
    if not CHAVE:
        raise RuntimeError("INTERNAL_API_KEY não configurada no .env — a API recusa a ingestão sem ela.")

    # to_json (e não to_dict): converte o NaN do pandas em null, e NaN não é JSON válido.
    # Não envie a partir do CSV: nele as listas viram texto ("['Solar']").
    normas = json.loads(df.to_json(orient="records", force_ascii=False))

    for i in range(0, len(normas), LOTE):
        r = requests.post(
            f"{API_URL}/interno/ingestao",
            json={"normas": normas[i : i + LOTE]},
            headers={"x-internal-key": CHAVE},
            timeout=300,
        )
        if r.status_code in (401, 503):
            raise RuntimeError(f"API recusou a chave interna ({r.status_code}): confira INTERNAL_API_KEY aqui e na API.")
        r.raise_for_status()
        resposta = r.json()
        for campo in ("recebidas", "criadas", "duplicadas", "alertas"):
            total[campo] += resposta.get(campo, 0)
        total["rejeitadas"] += len(resposta.get("rejeitadas", []))
        for rejeitada in resposta.get("rejeitadas", []):
            print(f"  [rejeitada pela API] norma {i + rejeitada['indice']}: {rejeitada['motivo']}")

    print(
        f"API: {total['criadas']} norma(s) nova(s), {total['duplicadas']} já existiam, "
        f"{total['rejeitadas']} rejeitada(s), {total['alertas']} alerta(s) gerado(s)."
    )
    return total
