"""Reclassifica as normas já gravadas em ato geral ou individual (só atualiza `abrangencia`, `cnpjs` e `cegs`).

    python reclassificar.py --simular   # mostra o que mudaria, sem gravar
    python reclassificar.py
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
    normas = [n for n in r.json() if n.get("texto")]
    print(f"{len(normas)} norma(s) com texto para reclassificar\n")

    linhas, mudam, falhas = [], 0, 0
    for i, n in enumerate(normas, start=1):
        for tentativa in range(3):
            try:
                c = classificar_texto(n["texto"], n["titulo"])
                break
            except RuntimeError:
                raise
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
                "somente_atualizar": True,
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
