from datetime import date as Date
from ai.functions.extractor import coletar_dia
from ai.models.summarizer import coletar_df
from models.classifier import classificar_df
import pandas as pd

if __name__ == "__main__":
    df_dia = coletar_dia(Date.today().strftime("%d-%m-%Y"))
    # CSV Completo com as colunas (data, orgao, tipo, titulo, texto, link)
    df_dia.to_csv("./data/process/law_day.csv", index=False)

    df_law = df_dia.copy()
    df_rel = classificar_df(df_law[df_law["relevancia"] > 0])
    df_rel.to_csv("./data/process/law_day_classified.csv", index=False)

    # Last Data Frame
    df_final = coletar_df(df_rel)
    df_final.to_csv(
        f"./data/out/law_day_final_{Date.today().strftime('%d-%m-%Y')}.csv", index=False
    )
