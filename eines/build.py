"""Construeix el web complet a dist/ a partir de src/, dades/ i els PDF oficials.

Ús (des de l'arrel del repositori):
    python eines/build.py            construcció completa (la que fa la CI)
    python eines/build.py --rapid    sense prerenderitzar ni PDF dels temes, per previsualitzar de pressa
    python eines/build.py --net      sense fer servir la memòria cau (ho torna a generar tot)

Memòria cau: els passos lents (exàmens per sèries, exercicis prerenderitzats, PDF de cada tema i imatges) desen el
resultat a build/memoria/, amb una empremta de totes les seves entrades (fitxers font, dades i l'eina que el
genera). Si a la construcció següent cap entrada no ha canviat, es reutilitza el resultat en lloc de tornar-lo
a generar. La CI conserva aquesta carpeta entre execucions.

Passos:
  1. comprova els problemes de les PAU (eines/comprova_pau.py); si n'hi ha cap amb errors, s'atura
  2. comprova que els PDF oficials de fonts/pdf/ quadren amb l'inventari (eines/fonts_oficials.py)
  3. copia src/ a dist/
  4. separa els exàmens per sèries i fa la pàgina pau/ (eines/examens_pau.py)
  5. insereix els problemes de les PAU a les pàgines dels temes (eines/genera_pau.py)
  6. escriu a l'HTML els exercicis que crea el JavaScript, per als cercadors (eines/prerender_exercicis.py)
  7. genera els PDF de cada tema (eines/build_pdfs.py)
  8. genera les imatges per compartir de cada pàgina (eines/imatges_og.py, dades a dades/imatges_og.json)
  9. escriu sitemap.xml
 10. comprova que cap enllaç intern del web sigui trencat (eines/comprova_enllacos.py)

Previsualització: python -m http.server -d dist 8765
"""
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time

from rutes import ARREL, DADES, OBRA, SRC, URL_BASE, WEB

EINES = ARREL / 'eines'
MEMORIA = OBRA / 'memoria'
NET = False   # --net: no fa servir la memòria cau


def pas(n: int, text: str) -> None:
    print(f'\n[{n}] {text}', flush=True)


def executa(*args: str) -> None:
    env = dict(os.environ, FISICA_WEB=str(WEB), PYTHONIOENCODING='utf-8')
    r = subprocess.run([sys.executable, *args], cwd=ARREL, env=env)
    if r.returncode != 0:
        print(f'\n✗ Ha fallat: {" ".join(args)}', flush=True)
        sys.exit(1)


def empremta(*entrades) -> str:
    """SHA-256 del contingut de tots els fitxers (o carpetes, recursivament) i textos d'entrada."""
    h = hashlib.sha256()
    for e in entrades:
        if isinstance(e, str):
            h.update(b'txt\0' + e.encode('utf-8'))
            continue
        for f in sorted(e.rglob('*')) if e.is_dir() else [e]:
            if f.is_file():
                h.update(f.relative_to(ARREL).as_posix().encode('utf-8') + b'\0' + f.read_bytes())
    return h.hexdigest()[:20]


def amb_memoria(nom: str, entrades: list, sortides: list, genera) -> None:
    """Si les entrades no han canviat des de l'última vegada, copia les sortides desades;
    si no, executa genera() i en desa les sortides (fitxers o carpetes, dins de l'arrel)."""
    clau = empremta(EINES / 'rutes.py', *entrades)
    carpeta = MEMORIA / nom / clau
    if carpeta.exists() and not NET:
        for s in sortides:
            orig = carpeta / s.relative_to(ARREL)
            if s.is_dir():
                shutil.rmtree(s)
            if orig.is_dir():
                shutil.copytree(orig, s)
            elif orig.exists():
                s.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(orig, s)
        print(f'= {nom}: sense canvis, es reutilitza el resultat anterior')
        return
    genera()
    if carpeta.parent.exists():
        shutil.rmtree(carpeta.parent)   # només es guarda l'última versió de cada pas
    for s in sortides:
        desti = carpeta / s.relative_to(ARREL)
        if s.is_dir():
            shutil.copytree(s, desti)
        elif s.exists():
            desti.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(s, desti)


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
    amb_memoria('examens',
                [DADES, EINES / 'examens_pau.py', SRC / 'pau' / 'index.html', SRC / 'index.html'],
                [WEB / 'pau', WEB / 'index.html', OBRA / 'destins_pau.json'],
                lambda: executa('eines/examens_pau.py'))
    pas(5, 'Problemes de les PAU a les pàgines dels temes')
    executa('eines/genera_pau.py')
    if not rapid:
        pas(6, 'Exercicis prerenderitzats')
        for c, _ in temes:
            pagina = WEB / 'temes' / c / 'index.html'
            amb_memoria(f'prerender-{c}', [pagina, EINES / 'prerender_exercicis.py'], [pagina],
                        lambda pagina=pagina: executa('eines/prerender_exercicis.py', str(pagina)))
        pas(7, 'PDF dels temes')
        for c, nom in temes:
            amb_memoria(f'pdf-{c}', [WEB / 'temes' / c / 'index.html', EINES / 'build_pdfs.py', EINES / 'requirements.txt', nom],
                        [WEB / 'temes' / c / 'pdf'], lambda c=c, nom=nom: executa('eines/build_pdfs.py', c, nom))
        pas(8, 'Imatges per compartir')
        pagines = [WEB / 'index.html', WEB / 'pau' / 'index.html'] + [WEB / 'temes' / c / 'index.html' for c, _ in temes]
        amb_memoria('imatges', [DADES / 'imatges_og.json', EINES / 'plantilles' / 'og.html', EINES / 'imatges_og.py', *pagines],
                    [WEB / 'img'], lambda: executa('eines/imatges_og.py'))
    pas(9, 'Sitemap')
    sitemap(temes)
    pas(10, 'Enllaços interns')
    executa('eines/comprova_enllacos.py', *(['--ignora', 'temes/*/pdf/*'] if rapid else []))
    print(f'\n✓ Web construït a {WEB} en {time.time() - t0:.0f} s')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    NET = '--net' in sys.argv[1:]
    main('--rapid' in sys.argv[1:])
