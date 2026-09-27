"""Serviço do copiloto, chamado pela API com o header x-internal-key.

    uvicorn servidor:app --host 0.0.0.0 --port 8000
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
    normaId: str | None = None
    novidades: list[dict] = Field(default_factory=list)
    canonicas: list[dict] = Field(default_factory=list)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ask")
def ask(pergunta: Pergunta, x_internal_key: str = Header(default="")):
    if not CHAVE_INTERNA or not hmac.compare_digest(x_internal_key, CHAVE_INTERNA):
        raise HTTPException(status_code=401, detail="Chave interna inválida.")
    try:
        return responder(
            pergunta.question,
            pergunta.perfil,
            pergunta.historico,
            norma_id=pergunta.normaId,
            novidades=pergunta.novidades,
            canonicas=pergunta.canonicas,
        )
    except Exception:
        logging.exception("Falha ao responder a pergunta")
        raise HTTPException(status_code=502, detail="O copiloto não conseguiu gerar a resposta.")
