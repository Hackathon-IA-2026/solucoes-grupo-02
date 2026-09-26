"""
Reclassifica as normas já gravadas na API em ato geral ou individual (rodar uma vez, depois
do deploy que criou a separação; de novo só se o prompt do classificador mudar).

    python reclassificar.py --simular   # mostra o que mudaria, sem gravar nada
    python reclassificar.py

Não apaga nada: cada norma volta pela ingestão, que a acha pelo hash do texto ou pelo link e
só atualiza `abrangencia`, `cnpjs` e `cegs`. Resumo, trechos, vetores, alertas e links do
chat continuam como estão, e não sai alerta novo. Custa uma chamada ao classificador por norma.
"""

import sys
import time

import pandas as pd
import requests

from functions.enviar_api import API_URL, CHAVE, enviar_para_api
from functions.identificadores import extrair_cegs, extrair_cnpjs
from models.classifier import classificar_texto

if __name__ == "__main__":
    simular = "--simular" in sys.argv
    r = requests.get(f"{API_URL}/interno/normas", headers={"x-internal-key": CHAVE}, timeout=120)
    r.raise_for_status()
    # sem texto não há o que classificar (e a ingestão não acharia a norma pelo hash)
    normas = [n for n in r.json() if n.get("texto")]
    print(f"{len(normas)} norma(s) com texto para reclassificar\n")

    linhas, mudam, falhas = [], 0, 0
    for i, n in enumerate(normas, start=1):
        for tentativa in range(3):  # limite de chamadas ou falha da API: espera e tenta de novo
            try:
                c = classificar_texto(n["texto"], n["titulo"])
                break
            except RuntimeError:
                raise  # chave errada ou modelo sem acesso: para na hora
            except Exception as e:
                print(f"  erro na tentativa {tentativa + 1}: {e} — esperando 30s")
                time.sleep(30)
        else:
            c = {"justificativa": "ERRO: limite ou falha da API"}
        if c["justificativa"].startswith("ERRO"):
            falhas += 1
            print(f"[{i}/{len(normas)}] {n['titulo'][:60]} — falhou, fica como está")
            continue
        muda = c["abrangencia"] != n["abrangencia"]
        mudam += muda
        print(f"[{i}/{len(normas)}] {n['abrangencia']:>10} -> {c['abrangencia']:<10}{' *' if muda else '  '} {n['titulo'][:60]}")
        linhas.append(
            {
                "titulo": n["titulo"],
                "texto": n["texto"],
                "link": n["link"],
                "abrangencia": c["abrangencia"],
                "cnpjs": extrair_cnpjs(n["texto"]),
                "cegs": extrair_cegs(n["texto"]),
                "somente_atualizar": True,  # a API rejeita em vez de criar se não achar a norma
            }
        )

    individuais = sum(l["abrangencia"] == "individual" for l in linhas)
    print(f"\n{individuais} individual(is) e {len(linhas) - individuais} geral(is); {mudam} mudam de abrangência.")
    if falhas:
        print(f"{falhas} falharam e ficaram como estavam: dá para rodar o script de novo, ele não duplica nada.")
    if simular:
        print("Simulação: nada foi gravado.")
    elif linhas:
        enviar_para_api(pd.DataFrame(linhas))
