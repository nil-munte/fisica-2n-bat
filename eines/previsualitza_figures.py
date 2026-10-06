"""Rasteritza les figures SVG d'un problema per poder-les revisar com a imatge.

Ús (des de l'arrel del repositori):
    python eines/previsualitza_figures.py dades/mhs-ones-so/2021-juny-s2-p3.json [--fosc]

Substitueix les variables CSS (var(--ink), var(--x)...) pels colors del tema clar
(o fosc) de temes/mhs/index.html i desa un PNG per figura a fonts/png/figures/.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'fonts' / 'png' / 'figures'


def colors(fosc: bool) -> dict:
    t = (ROOT / 'temes' / 'mhs' / 'index.html').read_text(encoding='utf-8')
    clar = re.search(r':root\{(.*?)\}', t, re.S).group(1)
    v = dict(re.findall(r'--([\w-]+):\s*([^;]+);', clar))
    if fosc:
        bloc = re.search(r':root\[data-theme="dark"\]\{(.*?)\}', t, re.S).group(1)
        v.update(re.findall(r'--([\w-]+):\s*([^;]+);', bloc))
    v.update({'f-body': 'sans-serif', 'f-mono': 'monospace', 'f-display': 'sans-serif'})
    return v


def resol(svg: str, v: dict) -> str:
    svg = re.sub(r'var\(--([\w-]+)(?:,\s*([^)]+))?\)', lambda m: v.get(m.group(1), m.group(2) or '#f0f'), svg)
    if 'xmlns=' not in svg:
        svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"', 1)
    return svg


def main(path: str, fosc: bool) -> None:
    import pymupdf
    p = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    v = colors(fosc)
    OUT.mkdir(parents=True, exist_ok=True)
    for fid, f in p['figures'].items():
        svg = resol(f['svg'], v)
        fons = v['bg'] if fosc else '#ffffff'
        svg = re.sub(r'(<svg[^>]*>)', rf'\1<rect width="100%" height="100%" fill="{fons}"/>', svg, count=1)
        doc = pymupdf.open(stream=svg.encode('utf-8'), filetype='svg')
        out = OUT / f"{p['id']}-{fid}{'-fosc' if fosc else ''}.png"
        doc[0].get_pixmap(matrix=pymupdf.Matrix(2, 2)).save(out)
        print(out)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    a = [x for x in sys.argv[1:] if x != '--fosc']
    if not a:
        sys.exit(__doc__)
    main(a[0], '--fosc' in sys.argv)
