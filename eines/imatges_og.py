"""Genera les imatges per compartir (Open Graph, 1200 × 630) de cada pàgina del web.

Ús (des de l'arrel del repositori, després de construir les pàgines; ho fa eines/build.py):
    python eines/imatges_og.py

Les dades són a dades/imatges_og.json: per a cada imatge, la pàgina a què pertany, l'avantítol, el títol,
el subtítol, les etiquetes i el dibuix de sota («ona», «particules» o «examens»). A les etiquetes,
{demos}, {pau} i {examens} es substitueixen pel recompte que surt de la pàgina construïda (dist/),
de manera que no queden mai desfasades. La plantilla és eines/plantilles/og.html.

També comprova que cada pàgina declari la seva imatge a og:image i twitter:image.
"""
import html
import json
import math
import re
import string
import sys

from playwright.sync_api import sync_playwright

from rutes import DADES, PLANTILLES, URL_BASE, WEB

CONFIG = DADES / 'imatges_og.json'
SORTIDA = WEB / 'img'


def recomptes(pagina: str) -> dict:
    t = (WEB / pagina).read_text(encoding='utf-8')
    examens = re.search(r'(\d+) exàmens', (WEB / 'pau' / 'index.html').read_text(encoding='utf-8'))
    return {
        'demos': len(re.findall(r'<div class="demo[" ]', t)),
        'pau': len(re.findall(r'<article class="panel ex pau"', t)),
        'examens': examens.group(1) if examens else '',
    }


def ona(amplada=1088, alcada=200) -> str:
    """Dues sinusoides (posició i velocitat), com a les imatges del MHS i de la portada."""
    mid, a1, a2, per = 70, 70, 40, 435
    p1 = ' '.join(f'{x},{mid - a1 * math.cos(2 * math.pi * x / per):.1f}' for x in range(0, amplada + 1, 4))
    p2 = ' '.join(f'{x},{mid - a2 * math.sin(2 * math.pi * x / per):.1f}' for x in range(0, amplada + 1, 4))
    return (f'<div class="dibuix"><svg viewBox="0 0 {amplada} {alcada}">'
            f'<line x1="0" y1="{mid}" x2="{amplada}" y2="{mid}" stroke="#c6d4d8" stroke-width="2"/>'
            f'<polyline points="{p2}" fill="none" stroke="#c4461a" stroke-width="4" stroke-dasharray="3 7" stroke-linecap="round"/>'
            f'<polyline points="{p1}" fill="none" stroke="#1f5fbf" stroke-width="5" stroke-linejoin="round"/></svg></div>')


def particules(amplada=1088, alcada=200) -> str:
    """Una ona transversal (partícules sobre una sinusoide) i una de longitudinal (compressions)."""
    lam, n = 362, 47
    dx = amplada / (n - 1)
    punts = []
    for i in range(n):
        x = i * dx
        y = 52 - 34 * math.sin(2 * math.pi * x / lam)
        punts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{8 if i == 17 else 5.5}" fill="{"#1f5fbf" if i == 17 else "#15212a"}"/>')
    for fila in range(3):
        for i in range(n):
            x0 = i * dx
            x = x0 + 13 * math.sin(2 * math.pi * x0 / lam)
            m = fila == 1 and i == 17
            punts.append(f'<circle cx="{x:.1f}" cy="{118 + fila * 20}" r="{7.5 if m else 4.5}" fill="{"#c4461a" if m else "#15212a"}"/>')
    return (f'<div class="dibuix"><svg viewBox="0 -6 {amplada} {alcada}">'
            f'<line x1="0" y1="52" x2="{amplada}" y2="52" stroke="#c6d4d8" stroke-width="2"/>{"".join(punts)}</svg></div>')


def examens(amplada=1088, alcada=200) -> str:
    """Línies de text a l'esquerra i una targeta «Juny · Setembre» a la dreta."""
    linies = ''.join(f'<rect x="0" y="{10 + i * 30}" width="{w}" height="13" rx="6.5" fill="#d2dcdf"/>'
                     for i, w in enumerate((520, 420, 480, 360, 450, 300)))
    return (f'<div class="dibuix"><svg viewBox="0 0 {amplada} {alcada}">{linies}</svg></div>'
            '<div class="targeta"><div class="a">Juny · Setembre</div><div class="b">Per any i convocatòria</div>'
            '<div class="c">Sèrie 1 · 2 · 3 · 4 · 5</div></div>')


DIBUIXOS = {'ona': ona, 'particules': particules, 'examens': examens}


def comprova_meta(pagina: str, nom: str) -> list:
    t = (WEB / pagina).read_text(encoding='utf-8')
    url = f'{URL_BASE}img/{nom}'
    return [f'{pagina}: {prop} no apunta a {url}' for prop in ('og:image', 'twitter:image')
            if not re.search(rf'<meta (?:property|name)="{prop}" content="{re.escape(url)}"', t)]


def main() -> int:
    sys.stdout.reconfigure(encoding='utf-8')
    imatges = json.loads(CONFIG.read_text(encoding='utf-8'))['imatges']
    plantilla = string.Template((PLANTILLES / 'og.html').read_text(encoding='utf-8'))
    SORTIDA.mkdir(parents=True, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
        for nom, d in imatges.items():
            if not (WEB / d['pagina']).exists():
                errors.append(f'{nom}: no existeix la pàgina {d["pagina"]}')
                continue
            errors += comprova_meta(d['pagina'], nom)
            n = recomptes(d['pagina'])
            etiquetes = [e.format(**n) for e in d.get('etiquetes', [])]
            ple = plantilla.substitute(
                antetitol=html.escape(d['antetitol']), titol=html.escape(d['titol']),
                classe_titol='llarg' if len(d['titol']) > 26 else '',
                subtitol=html.escape(d['subtitol']),
                etiquetes=''.join(f'<span>{html.escape(e)}</span>' for e in etiquetes if not e.startswith('0 ')),
                dibuix=DIBUIXOS[d.get('dibuix', 'ona')]())
            pg.set_content(ple, wait_until='networkidle')
            pg.evaluate('document.fonts.ready')
            pg.screenshot(path=str(SORTIDA / nom), type='png')
            print(f'✓ img/{nom}: {d["titol"]} · {" · ".join(etiquetes)}')
        b.close()
    for e in errors:
        print('✗', e)
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
