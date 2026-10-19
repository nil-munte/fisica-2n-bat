"""Construeix el web complet a dist/ a partir de src/, dades/ i els PDF oficials.

Ús (des de l'arrel del repositori):
    python eines/build.py            construcció completa (la que fa la CI)
    python eines/build.py --rapid    sense prerenderitzar ni PDF dels temes, per previsualitzar de pressa

Passos:
  1. comprova els problemes de les PAU (eines/comprova_pau.py); si n'hi ha cap amb errors, s'atura
  2. comprova que els PDF oficials de fonts/pdf/ quadren amb l'inventari (eines/fonts_oficials.py)
  3. copia src/ a dist/
  4. separa els exàmens per sèries i fa la pàgina pau/ (eines/examens_pau.py)
  5. insereix els problemes de les PAU a les pàgines dels temes (eines/genera_pau.py)
  6. escriu a l'HTML els exercicis que crea el JavaScript, per als cercadors (eines/prerender_exercicis.py)
  7. genera els PDF de cada tema (eines/build_pdfs.py)
  8. escriu sitemap.xml
  9. comprova que cap enllaç intern del web sigui trencat (eines/comprova_enllacos.py)

Previsualització: python -m http.server -d dist 8765
"""
import datetime
import json
import os
import shutil
import subprocess
import sys
import time

from rutes import ARREL, DADES, OBRA, SRC, URL_BASE, WEB

EINES = ARREL / 'eines'


def pas(n: int, text: str) -> None:
    print(f'\n[{n}] {text}', flush=True)


def executa(*args: str) -> None:
    env = dict(os.environ, FISICA_WEB=str(WEB), PYTHONIOENCODING='utf-8')
    r = subprocess.run([sys.executable, *args], cwd=ARREL, env=env)
    if r.returncode != 0:
        print(f'\n✗ Ha fallat: {" ".join(args)}', flush=True)
        sys.exit(1)


def pagines_temes() -> list[tuple[str, str]]:
    """(carpeta, nom) de cada tema que té pàgina, segons dades/temes.json."""
    temes = json.loads((DADES / 'temes.json').read_text(encoding='utf-8'))['temes']
    out = []
    for t in temes.values():
        for info in (t.get('subtemes') or {'_': t}).values():
            pag = info.get('pagina')
            if pag and pag.startswith('temes/') and (SRC / pag).exists():
                out.append((pag.split('/')[1], info['nom']))
    return out


def data_git(path) -> str:
    """Data de l'últim commit que va tocar un fitxer font (avui si no n'hi ha cap)."""
    r = subprocess.run(['git', 'log', '-1', '--follow', '--format=%cs', '--', str(path)], cwd=ARREL, capture_output=True, text=True)
    return r.stdout.strip() or datetime.date.today().isoformat()


def sitemap(temes: list[tuple[str, str]]) -> None:
    pagines = [('', SRC / 'index.html')] + [(f'temes/{c}/', SRC / 'temes' / c / 'index.html') for c, _ in temes]
    if (SRC / 'pau' / 'index.html').exists():
        pagines.append(('pau/', SRC / 'pau' / 'index.html'))
    files = '\n'.join(f'  <url><loc>{URL_BASE}{u}</loc><lastmod>{data_git(f)}</lastmod></url>' for u, f in pagines)
    (WEB / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                     '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                     f'{files}\n</urlset>\n', encoding='utf-8')
    print(f'✓ sitemap.xml: {len(pagines)} pàgines')


def main(rapid: bool) -> None:
    t0 = time.time()
    temes = pagines_temes()
    pas(1, 'Comprovació dels problemes de les PAU')
    executa('eines/comprova_pau.py', '--resum')
    pas(2, 'PDF oficials')
    executa('eines/fonts_oficials.py', 'comprova')
    pas(3, f'Còpia de src/ a {WEB.relative_to(ARREL) if WEB.is_relative_to(ARREL) else WEB}/')
    if WEB.exists():
        shutil.rmtree(WEB)
    shutil.copytree(SRC, WEB)
    OBRA.mkdir(exist_ok=True)
    pas(4, 'Exàmens per sèries')
    executa('eines/examens_pau.py')
    pas(5, 'Problemes de les PAU a les pàgines dels temes')
    executa('eines/genera_pau.py')
    if not rapid:
        pas(6, 'Exercicis prerenderitzats')
        for c, _ in temes:
            executa('eines/prerender_exercicis.py', str(WEB / 'temes' / c / 'index.html'))
        pas(7, 'PDF dels temes')
        for c, nom in temes:
            executa('eines/build_pdfs.py', c, nom)
    pas(8, 'Sitemap')
    sitemap(temes)
    pas(9, 'Enllaços interns')
    executa('eines/comprova_enllacos.py', *(['--ignora', 'temes/*/pdf/*'] if rapid else []))
    print(f'\n✓ Web construït a {WEB} en {time.time() - t0:.0f} s')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main('--rapid' in sys.argv[1:])
