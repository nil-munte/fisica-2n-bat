"""Text de l'enunciat d'un examen de les PAU a partir del PDF oficial, per a la pàgina web de cada sèrie.

El fa servir eines/examens_pau.py. Treu el text amb PyMuPDF i en conserva el que es perd amb el text pla:
exponents i subíndexs (<sup>, <sub>), lletres en cursiva curtes (variables) i el lloc on hi ha una fórmula
dibuixada o una figura, que no són text i només es poden veure al PDF. Deixa fora la portada, la contraportada,
els números de pàgina, les pàgines per a esborranys i les taules per a la correcció. Ajunta les línies en
paràgrafs (un per apartat, dades, nota...) i desfà els guions de partició de final de línia.
Només retoca la tipografia: «ŀl» → «l·l» (perquè el text es trobi en cercar «satèl·lit») i espais.
"""
import html
import re

import pymupdf

PORTADA = re.compile(r'Etiqueta de l.estudiant|Ubicació del tribunal')
INICI = re.compile(r'^(L.examen consta|Responeu|Feu |Escolliu|Trieu|Aquesta prova|P\s?1\)|Exercici\s*1\b(?!:))')
SOROLL = re.compile(r'^(\s*[–-]?\s*\d{1,2}\s*[–-]?\s*$|[•\s\d]+$|L.Institut d.Estudis Catalans ha tingut cura|'
                    r'\[Pàgina per a fer esborranys|Puntuació (total )?de l|Espai per a la|Etiqueta de l|Comprovació|'
                    r'\d+a correcció|Exercici\s*\d+\.\s*Opció\s*_+|(Exercici\s*\d+\s*)?(a\s*b\s*)?Total\s*$|'
                    r'(Exercici\s*\d+\s*)?a\s*b\s*$|Exercici\s*\d+\s*$|[ab]\s*$)')
NOU_PAR = re.compile(r'^(P\s?\d+\)|Exercici\s*\d+|[a-d]\)|\d\.\d\.\s|\[[\d,]+ punts?\]|Dad[ae]s?\s*:|DADES?\s*:|'
                     r'Nota\s*:|NOTA\s*:|Constants?\s*:|PART COMUNA|PART OPTATIVA|(OPCIÓ|Opció)\s*[AB12]\b)')
TITOL = re.compile(r'^((OPCIÓ|Opció)\s*[AB12]|PART COMUNA|PART OPTATIVA|Exercici\s*\d+\.\s.*|'
                   r'\[[\d,]+ punts?( en total)?\])\s*$')   # títols que van sols: el que ve després és un paràgraf nou
FORMULA, FIGURA = '', ''   # marques dins del text: fórmula dibuixada i figura


def _ajunta(rs, marge=6):
    """Ajunta els rectangles que es toquen (amb un marge)."""
    rs = [pymupdf.Rect(r) for r in rs]
    i = 0
    while i < len(rs):
        for j in range(i + 1, len(rs)):
            if (rs[i] + (-marge, -marge, marge, marge)).intersects(rs[j]):
                rs[i] |= rs.pop(j)
                break
        else:
            i += 1
    return rs


def _centre(r):
    return pymupdf.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)


def _regions(pg, linies):
    """Rectangles de les imatges i dels dibuixos (figures, i fórmules fetes amb traços) d'una pàgina."""
    def requadre(r):
        """Un requadre amb text de l'enunciat a dins (la puntuació, un marc...) no és una figura."""
        dins = [(rr, ''.join(s[0] for s in sp).strip()) for rr, sp in linies if r.contains(_centre(rr))]
        return (sum(len(t) >= 35 for _, t in dins) >= 2
                or sum((rr & r).get_area() for rr, _ in dins) > 0.25 * r.get_area())
    w, h = pg.rect.width, pg.rect.height
    rs = [pymupdf.Rect(b['bbox']) for b in pg.get_text('dict')['blocks'] if b['type'] == 1]
    for d in pg.get_drawings():
        r = d['rect']
        if (r.width > w * 0.5 and r.height < 4) or r.width > w * 0.85 or r.height > h * 0.85:   # filets i marcs
            continue
        if r.width > 1 or r.height > 1:
            rs.append(r)
    rs = _ajunta([r for r in rs if not requadre(r)])
    return [r for r in rs if r.width < w * 0.85 and r.height < h * 0.85 and r.width >= 8 and r.height >= 8
            and r.y0 < h - 50 and not requadre(r)]


def _gran(sp):
    """El tros de text de mida normal d'una línia (None si només té trossos petits o guions)."""
    g = [s for s in sp if s[1] >= 9.5 and s[0].strip() and s[0].strip() not in '-‑–']
    return max(g, key=lambda s: (s[1], len(s[0].strip()))) if g else None


def _files(pg):
    """[(Rect, trossos)] en l'ordre del PDF. Un tros és (text, mida, línia de base, flags, Rect).
    Ajunta en una sola línia les que són a la mateixa fila i es toquen: PyMuPDF separa sovint els exponents,
    els subíndexs i els guions en una línia pròpia, i aleshores el text pla els treu de lloc."""
    ls = []
    for b in pg.get_text('rawdict')['blocks']:
        for l in b.get('lines', []):
            sp = [(''.join(c['c'] for c in s['chars']), s['size'], s['origin'][1], s['flags'], pymupdf.Rect(s['bbox']),
                   s['chars']) for s in l['spans'] if s['chars']]
            if sp and ''.join(s[0] for s in sp).strip():
                ls.append((pymupdf.Rect(l['bbox']), sp))
    pare = list(range(len(ls)))

    def arrel(i):
        while pare[i] != i:
            i = pare[i]
        return i
    for i, (a, spa) in enumerate(ls):
        for j in range(i + 1, len(ls)):
            b, spb = ls[j]
            if max(a.x0, b.x0) - min(a.x1, b.x1) >= 4:   # no es toquen
                continue
            ga, gb = _gran(spa), _gran(spb)
            if ga and gb:   # dues línies de text normal: són a la mateixa fila si comparteixen la línia de base
                fila = abs(ga[2] - gb[2]) < 1.5
            else:           # un exponent, un subíndex o un guió solt: si se solapen verticalment
                fila = min(a.y1, b.y1) - max(a.y0, b.y0) > 0.3 * min(a.height, b.height)
            if fila:
                pare[arrel(j)] = arrel(i)
    grups = {}
    for i in range(len(ls)):
        grups.setdefault(arrel(i), []).append(i)
    out = []
    for g in sorted(grups.values(), key=min):
        r = pymupdf.Rect(ls[g[0]][0])
        for i in g:
            r |= ls[i][0]
        if len(g) == 1:
            out.append((r, [s[:5] for s in ls[g[0]][1]]))
            continue
        # s'ordenen els caràcters de tota la fila d'esquerra a dreta i es refan els trossos
        cs = sorted(((c, s) for i in g for s in ls[i][1] for c in s[5]), key=lambda x: x[0]['bbox'][0])
        sp = []
        for c, s in cs:
            if sp and tuple(sp[-1][1:4]) == s[1:4]:
                sp[-1][0] += c['c']
                sp[-1][4] |= c['bbox']
            else:
                sp.append([c['c'], s[1], s[2], s[3], pymupdf.Rect(c['bbox'])])
        out.append((r, [tuple(x) for x in sp]))
    return out


def _html(sp):
    """HTML d'una línia: els trossos més petits que el text, per sobre o per sota de la línia de base,
    són exponents o subíndexs; les lletres soltes en cursiva, variables."""
    cos = max(sp, key=lambda s: (s[1], len(s[0].strip())))
    base, mida = cos[2], cos[1]
    h = ''
    for t, m, oy, fl, _ in sp:
        e = html.escape(t)
        if t.strip() and m < mida * 0.9 and (oy < base - 1 or fl & 1):
            e = f'<sup>{e}</sup>'
        elif t.strip() and m < mida * 0.9 and oy > base + 0.8:
            e = f'<sub>{e}</sub>'
        elif t.strip() and fl & 2 and len(t.strip()) <= 3:
            e = f'<i>{e}</i>'
        h += e
    return re.sub(r'</sup><sup>|</sub><sub>|</i><i>', '', h)


def _neteja(t):
    t = t.replace('ŀl', 'l·l').replace('Ŀl', 'L·l').replace('ʼ', '’').replace('\t', ' ')
    t = re.sub('[   ]', ' ', t)
    t = re.sub('[\x00-\x08\x0b-\x1f\x7f]', '', t)   # glifs sense caràcter
    t = re.sub(r'\s+', ' ', t).strip()
    return re.sub(FORMULA + r' ([.,;:])', FORMULA + r'\1', t)


def paragrafs(pdf, de=0, fins=None):
    """Paràgrafs de l'enunciat de les pàgines de..fins (0-based, incloses) del PDF:
    [(pàgina 1-based dins del tram, html, text pla, hi ha una figura a prop)].
    Al text, FORMULA marca el lloc d'una fórmula dibuixada (que no és text)."""
    doc = pymupdf.open(pdf)
    fins = len(doc) - 1 if fins is None else fins
    items, comencat = [], False
    for i in range(de, fins + 1):
        pg = doc[i]
        txt = pg.get_text()
        if PORTADA.search(txt) and not re.search(r'\bP\s?1\)|Responeu', txt):
            continue
        fl = _files(pg)
        rs = _regions(pg, fl)
        pendents = list(rs)
        for r, sp in fl:
            pla = ''.join(s[0] for s in sp).strip()
            if any(f.contains(_centre(r)) for f in rs) or SOROLL.match(pla):   # rètols d'una figura, soroll
                continue
            if not comencat:
                if not INICI.match(pla):
                    continue
                comencat = True
            # els dibuixos que queden abans d'aquesta línia (a sobre, o a la mateixa fila i a l'esquerra)
            for f in sorted(pendents, key=lambda f: (f.y0, f.x0)):
                if f.y1 <= r.y0 + 2 or (f.y0 < r.y1 and f.y1 > r.y0 and f.x1 <= r.x0 + 2):
                    marca = FORMULA if f.height < 45 and f.width < 260 else FIGURA
                    items.append((i - de + 1, marca, marca, 0))
                    pendents.remove(f)
            g = _gran(sp)
            items.append((i - de + 1, _html(sp).strip(), pla, round(g[1], 1) if g else 0))
    pars, mida, sol = [], 0, False
    for pag, h, pla, m in items:
        canvi = bool(m and mida and abs(m - mida) > 1.2)   # canvi de mida de lletra: peu de figura, etc.
        mida = m or mida
        if h == FIGURA:
            if pars:
                pars[-1][3] = True
            continue
        if pars and (h == FORMULA and sol or re.fullmatch(r'[.,;:]', pla)):
            pars[-1][1] += ('' if pla != FORMULA else ' ') + h
            pars[-1][2] += ('' if pla != FORMULA else ' ') + pla
            continue
        if not pars or NOU_PAR.match(pla) or canvi or sol:
            pars.append([pag, h, pla, False])
            sol = bool(TITOL.match(pla))
            continue
        p = pars[-1]
        if re.search(r'\w\s*-\s*$', p[2]) and re.match(r'[a-zà-úïü·]', pla):   # paraula partida a final de línia
            p[1] = re.sub(r'\s*-\s*$', '', p[1]) + h
            p[2] = re.sub(r'\s*-\s*$', '', p[2]) + pla
        elif re.search(r'\w$', p[2]) and re.match(r'-\s*[a-zà-úïü]', pla):   # el guió ha anat a la línia següent
            p[1] += re.sub(r'^-\s*', '', h)
            p[2] += re.sub(r'^-\s*', '', pla)
        else:
            p[1] += ' ' + h
            p[2] += ' ' + pla
    return [(pag, _neteja(h), _neteja(pla), fig) for pag, h, pla, fig in pars]


if __name__ == '__main__':   # prova: python eines/enunciats_pdf.py dist/pau/pdf/2024-juny-s1.pdf
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    for pag, h, _, fig in paragrafs(sys.argv[1]):
        print(f'[{pag}{" fig" if fig else ""}] {h.replace(FORMULA, "⟦fórmula⟧")}')
