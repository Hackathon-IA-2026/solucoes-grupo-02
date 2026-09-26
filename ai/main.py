import os
from datetime import date as Date
from functions.extractor import coletar_dia
from models.summarizer import coletar_df
from models.classifier import classificar_df
from functions.enviar_api import enviar_para_api
import pandas as pd

if __name__ == "__main__":
    os.makedirs("./data/process", exist_ok=True)
    os.makedirs("./data/out", exist_ok=True)

    df_dia = coletar_dia(Date.today().strftime("%d-%m-%Y"))
    # CSV Completo com as colunas (data, orgao, tipo, titulo, texto, link)
    df_dia.to_csv("./data/process/law_day.csv", index=False)
    if df_dia.empty:
        print("Nenhuma publicação de interesse hoje.")
        raise SystemExit(0)

    # A coluna "relevancia" só existe depois do classificador
    df_law = classificar_df(df_dia.copy())
    df_rel = df_law[df_law["relevancia"] > 0]
    df_rel.to_csv("./data/process/law_day_classified.csv", index=False)

    # Last Data Frame
    df_final = coletar_df(df_rel)
    df_final.to_csv(
        f"./data/out/law_day_final_{Date.today().strftime('%d-%m-%Y')}.csv", index=False
    )

    # Grava na API: normas, trechos e limites, e dispara os alertas de cada empresa.
    # O CSV acima fica só como registro local da execução.
    enviar_para_api(df_final)
