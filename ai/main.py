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

    # Dia a coletar (DD-MM-AAAA): hoje, ou o passado como argumento para recuperar um dia
    # perdido ou testar num fim de semana, quando o DOU não publica — python main.py 25-09-2026
    data = sys.argv[1] if len(sys.argv) > 1 else Date.today().strftime("%d-%m-%Y")
    df_dia = coletar_dia(data)
    # CSV Completo com as colunas (data, orgao, tipo, titulo, texto, link)
    df_dia.to_csv("./data/process/law_day.csv", index=False)
    if df_dia.empty:
        print("Nenhuma publicação de interesse nesse dia.")
        raise SystemExit(0)

    # CNPJs e CEGs citados no texto: é por eles que um ato individual chega à empresa certa
    df_dia = anotar(df_dia)

    # As colunas "abrangencia" e "relevancia" só existem depois do classificador
    df_law = classificar_df(df_dia.copy())

    # Seguem os atos gerais relevantes para alguma subárea e tudo que cita um cliente.
    # O resto é ato individual de empresas que não usam o sistema (despacho que libera a
    # usina de outra empresa, multa, REIDI...): a maior parte do que o DOU traz, e só ruído.
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

    # Last Data Frame (relevancia_minima=0: a seleção acima já decidiu o que segue, e um ato
    # que cita um cliente vai mesmo sem subárea)
    df_final = coletar_df(df_rel, relevancia_minima=0)
    df_final.to_csv(
        f"./data/out/law_day_final_{data}.csv", index=False
    )

    # Vetores dos trechos de cada norma, para o copiloto achá-los (fora do CSV: são centenas de números por trecho)
    df_final = vetorizar_df(df_final)

    # Grava na API: normas, trechos e limites, e dispara os alertas de cada empresa.
    # O CSV acima fica só como registro local da execução.
    enviar_para_api(df_final)
