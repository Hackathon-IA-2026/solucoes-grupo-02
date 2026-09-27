"""Divisão das normas em trechos por artigo (mesma regra de api/src/ingestao/ingestao.mapper.ts)."""

import re

INICIO_ARTIGO = re.compile(r"^Art\.?\s*(\d+(?:\.\d+)*)\s*([º°o])?(-[A-Z])?", re.I)


def _rotulo_artigo(m: re.Match) -> str:
    """'Art 26' / 'Art. 1o' / 'Art.655-A' -> 'Art. 26' / 'Art. 1º' / 'Art. 655-A'."""
    return f"Art. {m.group(1)}{'º' if m.group(2) else ''}{(m.group(3) or '').upper()}"


def _quebrar_linha(linha: str, max_chars: int) -> list[str]:
    if len(linha) <= max_chars:
        return [linha]
    partes, atual = [], ""
    for palavra in linha.split(" "):
        if atual and len(atual) + len(palavra) + 1 > max_chars:
            partes.append(atual)
            atual = ""
        atual = f"{atual} {palavra}" if atual else palavra
    if atual:
        partes.append(atual)
    return partes


def _intervalo(primeiro: str | None, ultimo: str | None) -> str | None:
    """'Art. 29' + 'Art. 31' -> 'Art. 29 a 31'."""
    if not primeiro or not ultimo or primeiro == ultimo:
        return primeiro or ultimo
    numero_final = re.sub(r"^Art\.?\s*", "", ultimo, flags=re.I)
    return f"{primeiro} a {numero_final}"


def _juntar_curtos(trechos: list[dict], min_chars: int, max_chars: int) -> list[dict]:
    juntos: list[dict] = []
    for t in trechos:
        anterior = juntos[-1] if juntos else None
        if (
            anterior
            and len(anterior["texto"]) < min_chars
            and anterior["artigo"]  # o preâmbulo (sem artigo) fica sozinho
            and t["artigo"]
            and len(anterior["texto"]) + len(t["texto"]) + 1 <= max_chars
        ):
            anterior["texto"] += "\n" + t["texto"]
            anterior["ultimo"] = t["artigo"]
            anterior["artigo_rotulo"] = _intervalo(anterior["artigo"], t["artigo"])
            continue
        juntos.append({**t, "artigo_rotulo": t["artigo"]})
    return [{"artigo": t["artigo_rotulo"], "texto": t["texto"]} for t in juntos]


def dividir_em_trechos(texto: str, max_chars: int = 1500, min_chars: int = 200) -> list[dict]:
    """Devolve [{"artigo": "Art. 5º" | "Art. 29 a 31" | None, "texto": "..."}] na ordem do documento."""
    blocos: list[dict] = []
    atual = {"artigo": None, "linhas": []}

    for linha in (l.strip() for l in str(texto or "").split("\n")):
        if not linha:
            continue
        inicio = INICIO_ARTIGO.match(linha)
        if inicio:
            if atual["linhas"]:
                blocos.append(atual)
            atual = {"artigo": _rotulo_artigo(inicio), "linhas": []}
        atual["linhas"].extend(_quebrar_linha(linha, max_chars))
    if atual["linhas"]:
        blocos.append(atual)

    trechos = []
    for bloco in blocos:
        buffer = ""
        for linha in bloco["linhas"]:
            if buffer and len(buffer) + len(linha) + 1 > max_chars:
                trechos.append({"artigo": bloco["artigo"], "texto": buffer})
                buffer = ""
            buffer = f"{buffer}\n{linha}" if buffer else linha
        if buffer:
            trechos.append({"artigo": bloco["artigo"], "texto": buffer})
    return _juntar_curtos(trechos, min_chars, max_chars)
