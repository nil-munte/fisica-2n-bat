"""Comprova que cap enllaç intern del web generat (dist/) sigui trencat.

Ús (des de l'arrel del repositori, després de construir):
    python eines/comprova_enllacos.py
    python eines/comprova_enllacos.py --ignora 'temes/*/pdf/*'   no compta els enllaços a aquests fitxers

Revisa els atributs href i src de totes les pàgines HTML: el fitxer de destinació ha d'existir
(una carpeta acabada en «/» vol dir el seu index.html) i, si l'enllaç porta #ancora cap a una pàgina HTML,
aquesta ha de tenir un element amb aquell id. No revisa els enllaços externs (http, https, mailto…).
"""
import fnmatch
import html.parser
import sys
import urllib.parse

from rutes import WEB


class Enllacos(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.enllacos, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.add(a['id'])
        if tag == 'a' and a.get('name'):
            self.ids.add(a['name'])
        for k in ('href', 'src'):
            if a.get(k) and not (tag == 'link' and a.get('rel') in ('preconnect', 'dns-prefetch')):
                self.enllacos.append(a[k])


def analitza(path):
    p = Enllacos()
    p.feed(path.read_text(encoding='utf-8'))
    return p


def main(args) -> int:
    sys.stdout.reconfigure(encoding='utf-8')
    ignora = [args[i + 1] for i, a in enumerate(args) if a == '--ignora' and i + 1 < len(args)]
    pagines = sorted(WEB.rglob('*.html'))
    ids = {}
    errors, total = [], 0
    for pg in pagines:
        info = analitza(pg)
        ids[pg] = info.ids
        for href in info.enllacos:
            u = urllib.parse.urlsplit(href)
            if u.scheme or href.startswith('//') or href.startswith(('mailto:', 'tel:', 'javascript:', 'data:')):
                continue
            total += 1
            desti = pg if not u.path else (pg.parent / urllib.parse.unquote(u.path)).resolve()
            if u.path.endswith('/') or desti.is_dir():
                desti = desti / 'index.html'
            if desti.is_relative_to(WEB) and any(fnmatch.fnmatch(desti.relative_to(WEB).as_posix(), g) for g in ignora):
                continue
            if not desti.exists():
                errors.append(f'{pg.relative_to(WEB)}: {href} → no existeix')
                continue
            if u.fragment and desti.suffix == '.html':
                if desti not in ids:
                    ids[desti] = analitza(desti).ids
                if u.fragment not in ids[desti] and u.fragment != 'top':
                    errors.append(f'{pg.relative_to(WEB)}: {href} → no hi ha cap element amb id «{u.fragment}»')
    for e in errors:
        print('✗', e)
    print(f'{"✓" if not errors else "✗"} {total} enllaços interns a {len(pagines)} pàgines, {len(errors)} trencats')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
