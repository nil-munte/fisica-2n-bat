#!/usr/bin/env python3
"""Escriu al codi font de la pàgina d'un tema els exercicis que no són de PAU.

Els exercicis graduats es creen amb JavaScript a partir de l'array EX de la pàgina, i per això
no són al HTML que llegeixen els cercadors. Aquest script obre la pàgina amb Playwright
(el mateix que fa servir build_pdfs.py), llegeix el contingut de #exlist i el desa a la pàgina,
entre <!-- EXERCICIS:inici --> i <!-- EXERCICIS:fi -->.

Al navegador no es veu cap diferència: el JavaScript torna a crear els exercicis igualment.
Cal tornar-lo a executar cada vegada que canvieu l'array EX d'una pàgina.

Ús (des de l'arrel del repositori):
    python eines/prerender_exercicis.py                        # temes/mhs/index.html
    python eines/prerender_exercicis.py temes/<tema>/index.html
    python eines/prerender_exercicis.py --prova                # només informa, no escriu
"""
import pathlib, re, sys
from playwright.sync_api import sync_playwright

INI, FI = '<!-- EXERCICIS:inici -->', '<!-- EXERCICIS:fi -->'

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    prova = '--prova' in sys.argv
    arrel = pathlib.Path(__file__).resolve().parent.parent
    pagina = pathlib.Path(args[0]) if args else arrel / 'temes' / 'mhs' / 'index.html'
    if not pagina.is_absolute(): pagina = (pathlib.Path.cwd() / pagina).resolve()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1200, 'height': 900})
        pg.goto(pagina.as_uri()); pg.wait_for_timeout(800)
        html = pg.evaluate("document.getElementById('exlist') ? document.getElementById('exlist').innerHTML : null")
        b.close()
    if html is None: sys.exit(f'{pagina}: no trobo #exlist')
    # sense les marques d'una execució anterior
    html = html.replace(INI, '').replace(FI, '').strip()
    n_ex = len(re.findall(r'<article class="panel ex"', html))
    if not n_ex: sys.exit(f'{pagina}: #exlist és buit (el JavaScript no ha creat cap exercici)')
    raw = open(pagina, encoding='utf-8', newline='').read()
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    nou = f'<div class="exlist" id="exlist">{INI}\n{html}\n{FI}</div>'
    if INI in s:
        s2 = re.sub(r'<div class="exlist" id="exlist">' + re.escape(INI) + r'.*?' + re.escape(FI) + r'</div>', lambda m: nou, s, count=1, flags=re.S)
    else:
        buit = '<div class="exlist" id="exlist"></div>'
        if s.count(buit) != 1: sys.exit(f'{pagina}: no trobo <div class="exlist" id="exlist"></div>')
        s2 = s.replace(buit, nou)
    print(f'{pagina.relative_to(arrel) if pagina.is_relative_to(arrel) else pagina}: {n_ex} exercicis' + (' (sense canvis)' if s2 == s else ''))
    if prova or s2 == s: return
    open(pagina, 'w', encoding='utf-8', newline='').write(s2.replace('\n', '\r\n') if crlf else s2)

if __name__ == '__main__':
    main()
