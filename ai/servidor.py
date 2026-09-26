"""
Energy Start — Serviço do copiloto (chamado pela API, nunca pelo navegador)

    uvicorn servidor:app --host 0.0.0.0 --port 8000

Contrato (o mesmo que a API espera em AI_SERVICE_URL):
    POST /ask  {"question": "...", "perfil": {...perfil da usina...}, "historico": [{"role", "content"}]}
       ->      {"answer": "texto com [n]", "citations": [{"label", "excerpt", "normId", "url"}]}
Exige o header x-internal-key (INTERNAL_API_KEY): cada pergunta gasta chamadas da NVIDIA.
"""

import hmac
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from models.copiloto import responder

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

CHAVE_INTERNA = os.getenv("INTERNAL_API_KEY", "")
app = FastAPI(title="Energy Start — Copiloto")


class Pergunta(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    perfil: dict | None = None
    historico: list[dict] = Field(default_factory=list)  # [{"role": "user"|"assistant", "content": "..."}]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ask")
def ask(pergunta: Pergunta, x_internal_key: str = Header(default="")):
    if not CHAVE_INTERNA or not hmac.compare_digest(x_internal_key, CHAVE_INTERNA):
        raise HTTPException(status_code=401, detail="Chave interna inválida.")
    try:
        return responder(pergunta.question, pergunta.perfil, pergunta.historico)
    except Exception:
        logging.exception("Falha ao responder a pergunta")
        # a API trata o erro e cai na busca por palavra-chave
        raise HTTPException(status_code=502, detail="O copiloto não conseguiu gerar a resposta.")
