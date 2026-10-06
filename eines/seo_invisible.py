#!/usr/bin/env python3
"""SEO invisible per a fisica-2n-bat: meta description + dades estructurades (JSON-LD).
Executeu-lo des de l'arrel del repositori:  python eines/seo_invisible.py   (o python seo_invisible.py)
És idempotent: si una pàgina ja té la descripció o el JSON-LD, no hi torna a escriure.
No canvia res del contingut visible."""
import json, re, sys
from pathlib import Path

BASE = 'https://nil-munte.github.io/fisica-2n-bat/'   # canvieu-ho si passeu a fisica-selectivitat.cat
AUTOR = {'@type': 'Person', 'name': 'Nil Munté Guerrero', 'url': 'https://nil-munte.github.io'}
IDIOMA = 'ca'

def crumbs(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': BASE + p} for i, (n, p) in enumerate(items)]}

PAGES = {
 'index.html': dict(
    desc="Materials de repàs de Física de 2n de Batxillerat: teoria orientada a exercicis, demos interactives, exercicis amb solució i problemes de selectivitat (PAU).",
    ld=[{'@type': 'WebSite', 'name': 'Física · 2n de Batxillerat', 'url': BASE, 'inLanguage': IDIOMA, 'author': AUTOR}]),
 'temes/mhs/index.html': dict(
    desc="Moviment harmònic simple a 2n de Batxillerat: equacions, forces, energia, molla vertical i pèndol, amb demos interactives i exercicis resolts.",
    ld=[{'@type': 'LearningResource', 'name': 'Moviment harmònic simple', 'url': BASE + 'temes/mhs/', 'inLanguage': IDIOMA,
         'educationalLevel': '2n de Batxillerat', 'teaches': 'Moviment harmònic simple',
         'learningResourceType': ['teoria', 'demostració interactiva', 'exercicis resolts'],
         'isAccessibleForFree': True, 'author': AUTOR},
        crumbs([('Física · 2n de Batxillerat', ''), ('Moviment harmònic simple', 'temes/mhs/')])]),
 'pau/index.html': dict(
    desc="Exàmens de Física de selectivitat (PAU) de Catalunya, per any, convocatòria i sèrie, amb els criteris de correcció oficials.",
    ld=[{'@type': 'CollectionPage', 'name': 'Exàmens de selectivitat (PAU) de Física', 'url': BASE + 'pau/', 'inLanguage': IDIOMA, 'author': AUTOR},
        crumbs([('Física · 2n de Batxillerat', ''), ('Exàmens de selectivitat (PAU) de Física', 'pau/')])]),
}

def esc(t): return t.replace('&', '&amp;').replace('"', '&quot;')

def main():
    arrel = Path(__file__).resolve().parent
    if not (arrel / 'index.html').exists(): arrel = arrel.parent
    for f, c in PAGES.items():
        p = arrel / f
        s = p.read_text(encoding='utf-8')
        canvis = []
        if 'name="description"' not in s:
            m = re.search(r'<title>.*?</title>\n', s)
            if not m: sys.exit(f'{f}: no trobo <title>')
            s = s[:m.end()] + f'<meta name="description" content="{esc(c["desc"])}">\n' + s[m.end():]
            canvis.append('description')
        if 'application/ld+json' not in s:
            blocs = ''.join('<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', **o}, ensure_ascii=False) + '</script>\n' for o in c['ld'])
            i = s.index('</head>')
            s = s[:i] + blocs + s[i:]
            canvis.append('JSON-LD')
        if canvis: p.write_text(s, encoding='utf-8', newline='')
        print(f'{f}: ' + (', '.join(canvis) if canvis else 'sense canvis'))

if __name__ == '__main__':
    main()
