#!/usr/bin/env python3
"""
fichas-cp-imagens.py — recorta as Fichas de Identificação da CP (2026).

Entrada:  data-sources/fichas-cp/<slug>.jpg   (os originais 1080x1080 do post)
Saída:    public/fichas/<slug>.jpg            (o dossiê, sem o fundo escuro)
          public/fichas/mini/<slug>.jpg       (o polaroide do personagem)

Roda com o Pillow do sistema (`python3 scripts/fichas-cp-imagens.py`), fora do
package.json: é uma passada por ano, e não justifica uma dependência de imagem
no bundle. As caixas são FIXAS porque o gabarito da arte é o mesmo nas 17 —
medido nas 17, não em uma.

Os originais não são versionados (ver .gitignore); quem precisar recomeçar
baixa de novo pelo permalink que está em data-sources/fichas-cp-2026.json:
    https://www.instagram.com/p/<shortcode>/media/?size=l
"""
import json
import os
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FICHA = (175, 4, 910, 1076)  # o dossiê inteiro, sem a moldura escura do post
POLA = (215, 25, 485, 405)   # o polaroide, com a moldura branca torta
MINI = (216, 304)

def main() -> int:
    fonte = json.load(open(os.path.join(RAIZ, "data-sources/fichas-cp-2026.json"), encoding="utf-8"))
    brutos = os.path.join(RAIZ, "data-sources/fichas-cp")
    pub = os.path.join(RAIZ, "public/fichas")
    mini = os.path.join(pub, "mini")
    os.makedirs(mini, exist_ok=True)

    faltando = []
    for f in fonte["fichas"]:
        origem = os.path.join(brutos, f["slug"] + ".jpg")
        if not os.path.exists(origem):
            faltando.append(origem)
            continue
        im = Image.open(origem)
        if im.size != (1080, 1080):
            raise SystemExit(f"{origem}: esperava 1080x1080, veio {im.size} — as caixas não servem")
        im.crop(FICHA).save(os.path.join(pub, f["slug"] + ".jpg"),
                            quality=82, optimize=True, progressive=True)
        im.crop(POLA).resize(MINI, Image.LANCZOS).save(
            os.path.join(mini, f["slug"] + ".jpg"), quality=85, optimize=True, progressive=True)

    if faltando:
        print("original ausente:\n  " + "\n  ".join(faltando), file=sys.stderr)
        return 1
    print(f"fichas recortadas: {len(fonte['fichas'])} → {pub}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
