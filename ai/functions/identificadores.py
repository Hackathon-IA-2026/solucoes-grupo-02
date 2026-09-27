"""CNPJs e CEGs citados nos atos, extraídos por regex no mesmo formato da API (api/src/utils/ceg.ts)."""

import re

# CNPJ formatado ("18.565.382/0001-66") ou só dígitos logo depois da palavra CNPJ.
CNPJ = re.compile(r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b|CNPJ\D{0,15}(\d{14})\b")
CEG = re.compile(r"\b([A-Z]{3})\s*\.\s*([A-Z]{2})\s*\.\s*([A-Z]{2})\s*\.\s*(\d{4,6})")


def cnpj_valido(cnpj: str) -> bool:
    """Confere os dois dígitos verificadores (igual ao cnpjValido da API)."""
    if len(cnpj) != 14 or len(set(cnpj)) == 1:
        return False

    def digito(base):
        pesos = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] if len(base) == 12 else [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        resto = sum(int(n) * p for n, p in zip(base, pesos)) % 11
        return "0" if resto < 2 else str(11 - resto)

    d1 = digito(cnpj[:12])
    return cnpj[12:] == d1 + digito(cnpj[:12] + d1)


def extrair_cnpjs(texto: str) -> list[str]:
    achados = (m.group(1) or re.sub(r"\D", "", m.group(0)) for m in CNPJ.finditer(texto or ""))
    return list(dict.fromkeys(c for c in achados if cnpj_valido(c)))


def extrair_cegs(texto: str) -> list[str]:
    achados = (f"{a}.{b}.{uf}.{int(n):06d}" for a, b, uf, n in CEG.findall(texto or ""))
    return list(dict.fromkeys(achados))


def anotar(df, coluna_texto="texto"):
    """Acrescenta as colunas `cnpjs` e `cegs` (listas) a cada publicação."""
    df["cnpjs"] = df[coluna_texto].map(extrair_cnpjs)
    df["cegs"] = df[coluna_texto].map(extrair_cegs)
    return df


def cita_cliente(cnpjs, cegs, clientes: dict) -> bool:
    """`clientes` = resposta de GET /interno/clientes/identificadores: {"raizesCnpj": [...], "cegs": [...]}."""
    raizes = set(clientes.get("raizesCnpj", []))
    return any(c[:8] in raizes for c in cnpjs) or bool(set(cegs) & set(clientes.get("cegs", [])))
