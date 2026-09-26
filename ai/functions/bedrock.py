"""
Energy Start — Amazon Bedrock: o Claude (classificador, resumidor e copiloto) e o Titan (embeddings)

Cada módulo usa o Bedrock quando a variável do modelo está definida e, sem ela, a API da NVIDIA:
    BEDROCK_MODEL_ID            ex.: us.anthropic.claude-haiku-4-5-20251001-v1:0
    BEDROCK_EMBEDDING_MODEL_ID  ex.: amazon.titan-embed-text-v2:0
Na AWS as credenciais vêm do papel da task (não há chave); fora dela, do `aws configure` ou das
variáveis AWS_* do ambiente.
"""

import json
import os
import threading
from contextlib import contextmanager

from dotenv import load_dotenv

load_dotenv()

MODELO = os.getenv("BEDROCK_MODEL_ID", "").strip()
MODELO_EMBEDDING = os.getenv("BEDROCK_EMBEDDING_MODEL_ID", "").strip()
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Erros que uma nova tentativa não resolve: modelo errado, sem acesso ao modelo, sem credenciais.
# Viram RuntimeError, que o pipeline trata como "para na hora" (igual à chave inválida da NVIDIA).
ERROS_DE_CONFIGURACAO = ("AccessDeniedException", "ResourceNotFoundException", "ValidationException", "UnrecognizedClientException")

_cliente = None
_trava = threading.Lock()  # os embeddings chamam em paralelo, e o boto3 não cria clientes em paralelo com segurança


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
