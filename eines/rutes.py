"""Rutes del projecte. Totes les eines les prenen d'aquí.

    src/      el web tal com s'escriu (pàgines, imatges, robots.txt): no conté res generat
    dades/    problemes de les PAU (JSON) i mapa de temes
    fonts/    PDF oficials de les PAU i fitxers derivats (local i a la CI, no es comita)
    build/    fitxers intermedis de la construcció (no es comita)
    dist/     el web generat, que és el que es publica (no es comita)

La variable d'entorn FISICA_WEB permet generar el web en una altra carpeta.
"""
import os
import pathlib

ARREL = pathlib.Path(__file__).resolve().parent.parent
SRC = ARREL / 'src'
DADES = ARREL / 'dades'
FONTS = ARREL / 'fonts'
OBRA = ARREL / 'build'
WEB = pathlib.Path(os.environ.get('FISICA_WEB') or ARREL / 'dist').resolve()
PLANTILLES = ARREL / 'eines' / 'plantilles'
URL_BASE = 'https://nil-munte.github.io/fisica-2n-bat/'
