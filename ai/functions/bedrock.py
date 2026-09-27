"""Claude e Titan no Amazon Bedrock, usados quando BEDROCK_MODEL_ID / BEDROCK_EMBEDDING_MODEL_ID estão definidas."""

import json
import os
import threading
from contextlib import contextmanager

from dotenv import load_dotenv

load_dotenv()

MODELO = os.getenv("BEDROCK_MODEL_ID", "").strip()
MODELO_EMBEDDING = os.getenv("BEDROCK_EMBEDDING_MODEL_ID", "").strip()
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Erros que uma nova tentativa não resolve: viram RuntimeError e param o pipeline.
ERROS_DE_CONFIGURACAO = ("AccessDeniedException", "ResourceNotFoundException", "ValidationException", "UnrecognizedClientException")

_cliente = None
_trava = threading.Lock()  # o boto3 não cria clientes em paralelo com segurança


def _cliente_bedrock():
    global _cliente
    with _trava:
        if _cliente is None:
            import boto3
            from botocore.config import Config

            # tentativas automáticas com espera quando o Bedrock limita a vazão (ThrottlingException)
            _cliente = boto3.client(
                "bedrock-runtime", region_name=AWS_REGION, config=Config(retries={"max_attempts": 8, "mode": "adaptive"}, read_timeout=180)
            )
    return _cliente


@contextmanager
def _erros_de_configuracao(modelo: str, variavel: str):
    from botocore.exceptions import ClientError, NoCredentialsError

    try:
        yield
    except NoCredentialsError as e:
        raise RuntimeError("Sem credenciais da AWS para o Bedrock (fora da AWS, rode `aws configure`).") from e
    except ClientError as e:
        if e.response["Error"]["Code"] not in ERROS_DE_CONFIGURACAO:
            raise
        raise RuntimeError(f"O Bedrock recusou o modelo {modelo}: {e}. Confira {variavel} e o acesso ao modelo na conta.") from e


def _turnos(mensagens: list[dict]) -> tuple[list[dict], list[dict]]:
    """API Converse: system separado e turnos alternando user/assistant, começando por user."""
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


def conversar(mensagens: list[dict], max_tokens: int = 1024) -> str:
    """mensagens no formato OpenAI ([{"role": "system"|"user"|"assistant", "content": "..."}]), o mesmo da NVIDIA."""
    system, turnos = _turnos(mensagens)
    with _erros_de_configuracao(MODELO, "BEDROCK_MODEL_ID"):
        resposta = _cliente_bedrock().converse(
            modelId=MODELO,
            system=system,
            messages=turnos,
            inferenceConfig={"maxTokens": max_tokens, "temperature": 0},
        )
    return "".join(parte.get("text", "") for parte in resposta["output"]["message"]["content"])


def vetorizar(texto: str, dimensoes: int) -> list[float]:
    """Vetor de um texto no Titan Text Embeddings V2 (ele recebe um texto por chamada)."""
    with _erros_de_configuracao(MODELO_EMBEDDING, "BEDROCK_EMBEDDING_MODEL_ID"):
        resposta = _cliente_bedrock().invoke_model(
            modelId=MODELO_EMBEDDING,
            body=json.dumps({"inputText": texto, "dimensions": dimensoes, "normalize": True}),
            contentType="application/json",
            accept="application/json",
        )
    return json.loads(resposta["body"].read())["embedding"]
