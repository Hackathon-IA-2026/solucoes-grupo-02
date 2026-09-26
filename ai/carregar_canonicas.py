"""
Carrega as normas canônicas na base do copiloto (rodar uma vez, e de novo quando
entrar uma norma-base nova ou um PDF novo em ai/data/canonicas/).

    python carregar_canonicas.py

Normas já carregadas (mesmo texto) são ignoradas pela API.
"""

import pandas as pd

from functions.canonicas import carregar_canonicas
from functions.embeddings import vetorizar_df
from functions.enviar_api import enviar_para_api

if __name__ == "__main__":
    normas = carregar_canonicas()
    if not normas:
        print("Nenhuma norma canônica encontrada.")
        raise SystemExit(0)
    enviar_para_api(vetorizar_df(pd.DataFrame(normas)))
