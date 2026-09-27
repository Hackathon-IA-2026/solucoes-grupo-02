import os
import sys
from datetime import date as Date
from functions.extractor import coletar_dia
from functions.identificadores import anotar, cita_cliente
from models.summarizer import coletar_df
from models.classifier import classificar_df
from functions.embeddings import vetorizar_df
from functions.enviar_api import buscar_clientes, enviar_para_api
import pandas as pd

if __name__ == "__main__":
    os.makedirs("./data/process", exist_ok=True)
    os.makedirs("./data/out", exist_ok=True)

    # Data opcional (DD-MM-AAAA): python main.py 25-09-2026
    data = sys.argv[1] if len(sys.argv) > 1 else Date.today().strftime("%d-%m-%Y")
    df_dia = coletar_dia(data)
    df_dia.to_csv("./data/process/law_day.csv", index=False)
    if df_dia.empty:
        print("Nenhuma publicação de interesse nesse dia.")
        raise SystemExit(0)

    df_dia = anotar(df_dia)

    df_law = classificar_df(df_dia.copy())

    # Ato individual só segue se citar um cliente.
    clientes = buscar_clientes()
    df_law["cita_cliente"] = [cita_cliente(c, g, clientes) for c, g in zip(df_law["cnpjs"], df_law["cegs"])]
    geral = (df_law["abrangencia"] == "geral") & (df_law["relevancia"] > 0)
    df_rel = df_law[geral | df_law["cita_cliente"]]
    print(
        f"{len(df_rel)} de {len(df_law)} seguem: {int(geral.sum())} ato(s) geral(is) relevante(s), "
        f"{int(df_law['cita_cliente'].sum())} citando clientes; "
        f"{int((df_law['abrangencia'] == 'individual').sum())} ato(s) individual(is) no dia."
    )
    df_rel.to_csv("./data/process/law_day_classified.csv", index=False)
    if df_rel.empty:
        print("Nenhuma publicação relevante para as áreas monitoradas.")
        raise SystemExit(0)

    df_final = coletar_df(df_rel, relevancia_minima=0)
    df_final.to_csv(
        f"./data/out/law_day_final_{data}.csv", index=False
    )

    df_final = vetorizar_df(df_final)

    enviar_para_api(df_final)
