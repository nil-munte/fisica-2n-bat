"""Còpia dels PDF oficials de les PAU (exàmens i pautes) que fa servir la construcció del web.

Els PDF no van a la història de git: es desen com a fitxers de la release «fonts-oficials»
del repositori, i dades/fonts_oficials.json en guarda l'inventari (nom, origen oficial, mida i SHA-256).

Ús (des de l'arrel del repositori):
    python eines/fonts_oficials.py baixa       baixa a fonts/pdf/ els que faltin o no quadrin (local i CI)
    python eines/fonts_oficials.py comprova    comprova fonts/pdf/ contra l'inventari
    python eines/fonts_oficials.py inventari   refà l'inventari a partir de fonts/pdf/ (després d'afegir-ne)
    python eines/fonts_oficials.py puja        puja a la release els PDF nous o canviats (cal gh autenticat)
"""
import hashlib
import json
import subprocess
import sys
import urllib.request

from rutes import DADES, FONTS

PDF = FONTS / 'pdf'
INVENTARI = DADES / 'fonts_oficials.json'
REPO = 'nil-munte/fisica-2n-bat'
RELEASE = 'fonts-oficials'
URL_RELEASE = f'https://github.com/{REPO}/releases/download/{RELEASE}/'
GENCAT = 'https://universitats.gencat.cat/web/.content/06_pau/'


def sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for bloc in iter(lambda: f.read(1 << 20), b''):
            h.update(bloc)
    return h.hexdigest()


def origen(nom: str) -> str:
    """URL oficial d'on es va baixar cada PDF (només informativa: la construcció fa servir la release)."""
    any_ = int(nom[8:10])
    if any_ == 26:
        carpeta = 'ext' if nom[10] == 's' else 'ord'
        return f'{GENCAT}examens-correccions/2026/fisica/{carpeta}/{nom}'
    if nom.endswith('_tei.pdf'):
        return f'{GENCAT}models-examen-anys-anteriors/examens-20{any_}/fisica/ord/{nom}'
    return f'https://www.selecat.cat/pau/{nom}'


def carrega() -> dict:
    return json.loads(INVENTARI.read_text(encoding='utf-8'))['fitxers']


def inventari() -> None:
    fitxers = {p.name: {'origen': origen(p.name), 'mida': p.stat().st_size, 'sha256': sha256(p)}
               for p in sorted(PDF.glob('pau_fisi*.pdf'))}
    doc = ("PDF oficials de les PAU de Física (Generalitat de Catalunya) que fa servir la construcció. "
           f"Es baixen de la release «{RELEASE}» del repositori amb eines/fonts_oficials.py; «origen» és d'on es van obtenir.")
    INVENTARI.write_text(json.dumps({'_doc': doc, 'release': RELEASE, 'fitxers': fitxers},
                                    ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{INVENTARI.relative_to(DADES.parent)}: {len(fitxers)} fitxers, '
          f'{sum(f["mida"] for f in fitxers.values()) / 1e6:.1f} MB')


def comprova() -> list:
    dolents = []
    for nom, info in carrega().items():
        p = PDF / nom
        if not p.exists() or p.stat().st_size != info['mida'] or sha256(p) != info['sha256']:
            dolents.append(nom)
    return dolents


def baixa() -> None:
    PDF.mkdir(parents=True, exist_ok=True)
    inv, falten = carrega(), comprova()
    for nom in falten:
        dest = PDF / nom
        with urllib.request.urlopen(URL_RELEASE + nom, timeout=120) as r:
            dest.write_bytes(r.read())
        if sha256(dest) != inv[nom]['sha256']:
            dest.unlink()
            sys.exit(f'✗ {nom}: el fitxer baixat no coincideix amb l\'inventari')
        print(f'↓ {nom}')
    print(f'✓ fonts/pdf: {len(inv)} PDF oficials ({len(falten)} baixats)')


def puja() -> None:
    inv = carrega()
    publicats = {}
    r = subprocess.run(['gh', 'release', 'view', RELEASE, '--repo', REPO, '--json', 'assets'],
                       capture_output=True, text=True)
    if r.returncode != 0:
        subprocess.run(['gh', 'release', 'create', RELEASE, '--repo', REPO, '--title', 'PDF oficials de les PAU',
                        '--notes', 'Còpia dels exàmens i pautes oficials de les PAU de Física (Generalitat de Catalunya) '
                                   'que fa servir la construcció del web. No és una versió del web.',
                        '--latest=false'], check=True)
    else:
        publicats = {a['name']: a['size'] for a in json.loads(r.stdout)['assets']}
    nous = [n for n, i in inv.items() if publicats.get(n) != i['mida']]
    if nous:
        subprocess.run(['gh', 'release', 'upload', RELEASE, '--repo', REPO, '--clobber', *[str(PDF / n) for n in nous]],
                       check=True)
    print(f'✓ release {RELEASE}: {len(inv)} fitxers ({len(nous)} pujats)')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    ordre = sys.argv[1] if len(sys.argv) > 1 else ''
    if ordre == 'inventari':
        inventari()
    elif ordre == 'comprova':
        d = comprova()
        print('✓ tots els PDF oficials quadren amb l\'inventari' if not d else '✗ falten o no quadren: ' + ', '.join(d))
        sys.exit(1 if d else 0)
    elif ordre == 'baixa':
        baixa()
    elif ordre == 'puja':
        puja()
    else:
        sys.exit(__doc__)
