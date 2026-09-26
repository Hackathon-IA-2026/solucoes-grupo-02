"""
Energy Start — Serviço do copiloto (chamado pela API, nunca pelo navegador)

    uvicorn servidor:app --host 0.0.0.0 --port 8000

Contrato (o mesmo que a API espera em AI_SERVICE_URL):
    POST /ask  {"question": "...", "perfil": {...perfil da usina...}, "historico": [{"role", "content"}],
                "normaId": "uuid da norma em foco, ou null", "novidades": [...catálogo do feed da empresa...],
                "canonicas": [{"code", "title", "url"}]}
       ->      {"answer": "texto com [n]", "citations": [{"label", "excerpt", "normId", "url"}]}
Exige o header x-internal-key (INTERNAL_API_KEY): cada pergunta gasta chamadas de modelo (Bedrock ou NVIDIA).
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
    normaId: str | None = None  # a norma de que o usuário está falando (botão dos Resumos/Painel)
    novidades: list[dict] = Field(default_factory=list)  # catalogoParaOCopiloto da API: resumo, prazo, o que fazer
    canonicas: list[dict] = Field(default_factory=list)  # normas-base da base: [{"code", "title", "url"}]


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
        # a API trata o erro e cai na busca por palavra-chave
        raise HTTPException(status_code=502, detail="O copiloto não conseguiu gerar a resposta.")
