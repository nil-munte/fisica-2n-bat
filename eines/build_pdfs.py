"""Genera els PDF d'un tema (formulari, enunciats i enunciats + solucions).

Ús (des de l'arrel del repositori):
    python eines/build_pdfs.py mhs "Moviment harmònic simple"

Llegeix temes/<tema>/index.html i escriu els PDF a temes/<tema>/pdf/.
Requereix: pip install -r eines/requirements.txt && python -m playwright install chromium
"""
import pathlib, re, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

def main(tema: str, titol: str) -> None:
    page_path = ROOT / 'temes' / tema / 'index.html'
    out = ROOT / 'temes' / tema / 'pdf'
    out.mkdir(parents=True, exist_ok=True)
    noms = {'f': f'{tema}-formulari.pdf', 'q': f'{tema}-enunciats.pdf', 'qs': f'{tema}-enunciats-solucions.pdf'}
    def peu(pagines: bool) -> str:
        num = '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span>' if pagines else '<span></span>'
        return ('<div style="font-size:8px;color:#666;width:100%;padding:0 14mm;display:flex;'
                'justify-content:space-between;font-family:sans-serif">'
                f'<span>{titol} · Física 2n Batxillerat</span>'
                '<span>Nil Munté Guerrero · nil-munte.github.io</span>' + num + '</div>')
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1200, 'height': 900})
        pg.goto(page_path.as_uri())
        pg.evaluate('document.fonts.ready')
        pg.wait_for_timeout(800)
        pg.emulate_media(media='print', color_scheme='light')
        for mode, nom in noms.items():
            obre = 'true' if mode == 'qs' else 'false'
            pg.evaluate(f"document.body.dataset.print='{mode}';"
                        f"document.querySelectorAll('.ex details.sol').forEach(d=>d.open={obre})")
            pg.wait_for_timeout(200)
            kw = dict(format='A4', print_background=True, display_header_footer=True, header_template='<div></div>',
                      footer_template=peu(mode != 'f'))
            if mode == 'f':
                kw['margin'] = dict(top='10mm', bottom='14mm', left='10mm', right='10mm')
            else:
                kw['margin'] = dict(top='14mm', bottom='16mm', left='14mm', right='14mm')
            if mode == 'f':
                # el formulari ha de cabre en una pàgina: si no hi cap, es redueix l'escala
                scale = 1.0
                while True:
                    data = pg.pdf(scale=scale, **kw)
                    pagines = len(re.findall(rb'/Type\s*/Page[^s]', data))
                    if pagines <= 1 or scale <= 0.75:
                        break
                    scale = round(scale - 0.05, 2)
                (out / nom).write_bytes(data)
                print('✓', out / nom, f'({pagines} pàgina, escala {scale})')
            else:
                pg.pdf(path=str(out / nom), **kw)
                print('✓', out / nom)
        b.close()

if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
