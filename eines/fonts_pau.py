"""Eines per treballar amb els PDF oficials de les PAU (fonts/pdf/, no es publiquen).

Ús (des de l'arrel del repositori):
    python eines/fonts_pau.py text pau_fisi14jl            text de totes les pàgines → fonts/txt/
    python eines/fonts_pau.py cerca pau_fisi14jl "màquina de cosir"
                                                           pàgines on surt un text
    python eines/fonts_pau.py png pau_fisi14jp 7 8         rasteritza pàgines → fonts/png/
    python eines/fonts_pau.py png pau_fisi14jp 7 --zoom 3  (zoom per defecte: 2)

El text surt de pdftotext (-layout) pàgina a pàgina, amb una marca «=== pàgina N ===».
Les imatges només serveixen per mirar figures i pautes; no es publiquen ni es retallen.
Requereix: pdftotext (poppler) i PyMuPDF (pip install pymupdf).
"""
import pathlib, subprocess, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF, TXT, PNG = (ROOT / 'fonts' / d for d in ('pdf', 'txt', 'png'))


def pdf_path(nom: str) -> pathlib.Path:
    p = PDF / (nom if nom.endswith('.pdf') else nom + '.pdf')
    if not p.exists():
        sys.exit(f'No trobo {p}')
    return p


def n_pagines(p: pathlib.Path) -> int:
    import pymupdf
    with pymupdf.open(p) as d:
        return d.page_count


def text(nom: str) -> pathlib.Path:
    p = pdf_path(nom)
    TXT.mkdir(parents=True, exist_ok=True)
    out = TXT / (p.stem + '.txt')
    parts = []
    for i in range(1, n_pagines(p) + 1):
        r = subprocess.run(['pdftotext', '-layout', '-enc', 'UTF-8', '-f', str(i), '-l', str(i), str(p), '-'],
                           capture_output=True)
        parts.append(f'=== pàgina {i} ===\n' + r.stdout.decode('utf-8', 'replace'))
    out.write_text('\n'.join(parts), encoding='utf-8')
    return out


def _norm(s: str) -> str:
    s = s.replace('’', "'").replace('ŀ', 'l').replace('·', '')
    s = unicodedata.normalize('NFKD', s.lower())
    return ' '.join(''.join(c for c in s if not unicodedata.combining(c)).split())


def cerca(nom: str, frase: str) -> list[int]:
    out = TXT / (pdf_path(nom).stem + '.txt')
    if not out.exists():
        text(nom)
    pags = out.read_text(encoding='utf-8').split('=== pàgina ')[1:]
    f = _norm(frase)
    return [int(pg.split(' ', 1)[0]) for pg in pags if f in _norm(pg)]


def png(nom: str, pagines: list[int], zoom: float = 2) -> list[pathlib.Path]:
    import pymupdf
    p = pdf_path(nom)
    PNG.mkdir(parents=True, exist_ok=True)
    fets = []
    with pymupdf.open(p) as d:
        for n in pagines:
            out = PNG / f'{p.stem}-p{n}.png'
            d[n - 1].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom)).save(out)
            fets.append(out)
    return fets


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    ordre, nom = a[0], a[1]
    if ordre == 'text':
        print(text(nom))
    elif ordre == 'cerca':
        print(cerca(nom, ' '.join(a[2:])))
    elif ordre == 'png':
        zoom = 2.0
        if '--zoom' in a:
            k = a.index('--zoom'); zoom = float(a[k + 1]); del a[k:k + 2]
        for f in png(nom, [int(x) for x in a[2:]], zoom):
            print(f)
    else:
        sys.exit(__doc__)
