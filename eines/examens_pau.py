"""Genera la secció d'exàmens de les PAU (pau/) a partir dels PDF oficials de fonts/pdf/.

Ús (des de l'arrel del repositori):
    python eines/examens_pau.py

Els PDF oficials es diuen pau_fisiAAcX.pdf: AA és l'any, c la convocatòria (j juny, s setembre)
i X el tipus (l enunciat; p o t pauta de correcció; si n'hi ha diverses versions, _v2… mana la darrera).
Cada PDF pot portar diverses sèries: es detecten per la marca «Sèrie N» de la primera pàgina de cadascuna.
Per a cada sèrie escriu:
    pau/pdf/AAAA-convocatoria-sN.pdf             enunciat (sense solucions)
    pau/pdf/AAAA-convocatoria-sN-solucions.pdf   enunciat + pauta de correcció
i reescriu la llista d'exàmens de pau/index.html i el resum de la portada
(entre les marques <!-- examens:… --> i <!-- /examens:… -->).
Els problemes resolts al web (dades/<tema>/*.json) s'enllacen des de la seva sèrie, i dins dels PDF
tenen una destinació amb nom just a sobre del títol (fitxer.pdf#nameddest=P5A a l'enunciat,
#nameddest=solucio-P5A a la pauta). Els enllaços es desen a dades/destins_pau.json per a genera_pau.py.
Requereix PyMuPDF (pip install pymupdf).
"""
import html, json, pathlib, re, sys
import pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = ROOT / 'fonts' / 'pdf'
PAU = ROOT / 'pau'
SORTIDA = PAU / 'pdf'
CONV = {'j': 'juny', 's': 'setembre'}
NOM_CONV = {'juny': ('Juny', 'Convocatòria ordinària'), 'setembre': ('Setembre', 'Convocatòria extraordinària')}
FITXER = re.compile(r'pau_fisi(\d\d)([js])([lpt])(?:_v(\d+))?\.pdf$')
SERIE = re.compile(r'S[ÈEèe]?RIE\s*(\d)', re.I)
DESTINS = ROOT / 'dades' / 'destins_pau.json'
DOC_DESTINS = ("Generat per eines/examens_pau.py; no s'edita a mà. Per a cada problema, l'enllaç (des de l'arrel) "
               "a l'enunciat i a la pauta dins dels PDF de la seva sèrie a pau/pdf/. El fa servir eines/genera_pau.py.")


def fonts():
    """{(any, convocatòria): {'enunciat': Path, 'pauta': Path}}"""
    out = {}
    for p in sorted(FONTS.glob('pau_fisi*.pdf')):
        m = FITXER.match(p.name)
        if not m:
            print(f'  (ignoro {p.name})')
            continue
        aa, c, x, v = m.groups()
        tipus = 'enunciat' if x == 'l' else 'pauta'
        clau = (2000 + int(aa), CONV[c])
        ant = out.setdefault(clau, {}).get(tipus)
        if ant is None or int(v or 1) >= ant[1]:
            out[clau][tipus] = (p, int(v or 1))
    return {k: {t: p for t, (p, _) in d.items()} for k, d in out.items()}


def series(doc):
    """[(sèrie, primera pàgina, última pàgina)] amb pàgines 0-based."""
    trams = []
    for i, pg in enumerate(doc):
        m = SERIE.search(re.sub(r'[`´῭́]', '', pg.get_text()))
        if m and (not trams or int(m.group(1)) != trams[-1][0]):
            trams.append([int(m.group(1)), i, i])
        elif trams:
            trams[-1][2] = i
        else:
            sys.exit(f'{doc.name}: la pàgina 1 no diu de quina sèrie és')
    return [tuple(t) for t in trams]


def desa(parts, desti, titol, marques, llocs=()):
    """Ajunta trams de pàgines [(doc, de, fins)] en un PDF reproduïble (sense data ni ID nous).
    llocs: [(nom, pàgina 0-based, Point)] → destinacions amb nom (fitxer.pdf#nameddest=nom)."""
    out = pymupdf.open()
    for doc, de, fins in parts:
        out.insert_pdf(doc, from_page=de, to_page=fins)
    out.set_metadata({'title': titol, 'subject': 'Proves d\'accés a la universitat · Física',
                      'creationDate': '', 'modDate': '', 'producer': '', 'creator': ''})
    out.set_toc(marques)
    if llocs:
        noms = []
        for nom, pno, pt in sorted(llocs):
            q = pt * out[pno].transformation_matrix   # coordenades PDF (origen a baix)
            noms.append(f'({nom}) [{out[pno].xref} 0 R /XYZ 0 {q.y:.1f} null]')
        out.xref_set_key(out.pdf_catalog(), 'Names', f'<</Dests <</Names [{" ".join(noms)}]>>>>')
    dades = out.tobytes(garbage=4, deflate=True, no_new_id=True)
    if not desti.exists() or desti.read_bytes() != dades:
        desti.write_bytes(dades)
    return len(dades)


def carrega_problemes():
    """Problemes resolts al web, amb la pàgina del tema on són (None si encara no en té)."""
    temes = json.loads((ROOT / 'dades' / 'temes.json').read_text(encoding='utf-8'))['temes']
    out = []
    for f in sorted((ROOT / 'dades').glob('*/*.json')):
        p = json.loads(f.read_text(encoding='utf-8'))
        t = temes.get(p['tema_principal'], {})
        t = t.get('subtemes', {}).get(p.get('subtema'), t)
        out.append((p, t if t.get('pagina') else None))
    return out


def problemes_web(problemes):
    """{(any, convocatòria, sèrie): [(problema, títol, enllaç des de pau/)]}"""
    out = {}
    for p, t in problemes:
        if t:
            out.setdefault((p['any'], p['convocatoria'], p['serie']), []).append(
                (p['problema'], p['titol'], f"../{t['pagina']}#pau-{p['id']}", t['nom']))
    return out


def nom_desti(p):
    """Nom de la destinació d'un problema dins dels PDF de la seva sèrie: P5A, P3, P21…
    L'enunciat és «P5A» (als dos PDF) i la pauta, «solucio-P5A» (al PDF amb solucions)."""
    return p['problema'] + (p.get('opcio') or '')


def linies(pg):
    """[(text, Rect)] de la pàgina en ordre de lectura."""
    out = []
    for b in pg.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            t = ''.join(s['text'] for s in l['spans']).strip()
            if t:
                out.append((t, pymupdf.Rect(l['bbox'])))
    return sorted(out, key=lambda x: (round(x[1].y0), x[1].x0))


OPCIO = re.compile(r'^\s*Opci[óo]\s*([AB12])\b', re.I)


def troba(doc, pno, p, primera=0):
    """Point just a sobre del títol del problema p (P5) / Exercici 5 / EXERCICI 5, opció 1) a la pàgina pno.
    Si n'hi ha més d'un (opcions A i B), tria el de l'opció del problema. None si no el troba."""
    n = int(p['problema'][1:])
    etiqueta = re.compile(rf'^\s*(P\s?{n}\s?(\)|[AB]?$)|Exercici\s*{n}\b)', re.I)   # P5) · P3A (pautes 2010) · Exercici 5
    opcio, cands = None, []
    for i in range(primera, pno + 1):
        for t, r in linies(doc[i]):
            m = OPCIO.match(t)
            if m:
                opcio = m.group(1).upper()
            if i == pno and etiqueta.match(t):
                m = re.search(r'opci[óo]\s*([AB12])\b|^P\d([AB])$', t, re.I)
                cands.append(((m.group(1) or m.group(2)).upper() if m else opcio, r))
    if len(cands) > 1 and p.get('opcio'):
        cands = [c for c in cands if c[0] == str(p['opcio']).upper()] or cands
    return pymupdf.Point(0, max(0, cands[0][1].y0 - 14)) if cands else None


def llocs_serie(e, e0, p, p0, n_enunciat, probs):
    """Destinacions dels problemes d'una sèrie: (enunciat, enunciat + solucions) com a [(nom, pàgina, Point)]."""
    le, ls = [], []
    for pr in probs:
        nom = nom_desti(pr)
        pe = pr['fonts']['enunciat']['pagina'] - 1 - e0
        pp = pr['fonts']['pauta']['pagina'] - 1 - p0
        a = troba(e, pr['fonts']['enunciat']['pagina'] - 1, pr, e0)
        b = troba(p, pr['fonts']['pauta']['pagina'] - 1, pr, p0)
        for que, pt in (('enunciat', a), ('pauta', b)):
            if pt is None:
                print(f'  ! {pr["id"]}: no trobo el títol del problema a la pàgina de la {que}; enllaço a dalt de la pàgina')
        a, b = a or pymupdf.Point(0, 0), b or pymupdf.Point(0, 0)
        le.append((nom, pe, a))
        ls += [(nom, pe, a), ('solucio-' + nom, n_enunciat + pp, b)]
    return le, ls


def destins(probs, base, le, ls):
    """{id: {'enunciat', 'pauta'}}: enllaços des de l'arrel al problema dins dels PDF de la sèrie.
    #page fa de reserva per als visors que no coneixen #nameddest."""
    rel = base.relative_to(ROOT).as_posix()
    pag = {n: pno + 1 for n, pno, _ in le + ls}
    out = {}
    for pr in probs:
        n = nom_desti(pr)
        out[pr['id']] = {'enunciat': f'{rel}.pdf#page={pag[n]}&nameddest={n}',
                         'pauta': f'{rel}-solucions.pdf#page={pag["solucio-" + n]}&nameddest=solucio-{n}'}
    return out


def mb(n):
    return f'{n / 1e6:.1f}'.replace('.', ',') + ' MB'


ICONA_DL = ('<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5'
            'M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def boto(href, text, mida, que, fitxer, primari=False):
    c = 'btn primary' if primari else 'btn'
    return (f'<span class="dlg"><a class="{c}" href="{href}" target="_blank" rel="noopener" title="Obre {que} ({mida})">{text}</a>'
            f'<a class="{c} ic" href="{href}" download="{html.escape(fitxer)}" title="Descarrega {que} ({mida})" '
            f'aria-label="Descarrega {que} ({mida})">{ICONA_DL}</a></span>')


def html_anys(examens):
    return ''.join(f'<a href="#a{a}">{a}</a>' for a in sorted({a for a, _ in examens}, reverse=True))


def html_examens(examens, web):
    h = []
    for a in sorted({a for a, _ in examens}, reverse=True):
        h.append(f'  <section class="blk" id="a{a}">\n    <h2>{a}</h2>\n    <div class="convs">')
        for conv in ('juny', 'setembre'):
            if (a, conv) not in examens:
                continue
            nom, desc = NOM_CONV[conv]
            h.append(f'    <article class="panel conv"><h3>{nom} <small>{desc}</small></h3>')
            for s in examens[(a, conv)]:
                base = f'pdf/{a}-{conv}-s{s["serie"]}'
                que = f'la sèrie {s["serie"]} de {nom.lower()} {a}'
                fitxer = f'PAU Física {a} {nom} - Sèrie {s["serie"]}'
                h.append(f'      <div class="serie"><span class="sn">Sèrie {s["serie"]}</span><div class="botons">'
                         + boto(base + '.pdf', 'PDF enunciat', mb(s['mida_e']), f"l'enunciat de {que}",
                                f'{fitxer} - Enunciat.pdf')
                         + boto(base + '-solucions.pdf', 'PDF enunciat + solucions', mb(s['mida_s']),
                                f'{que} amb les solucions', f'{fitxer} - Enunciat i solucions.pdf', primari=True)
                         + '</div>')
                for pr, titol, href, tema in web.get((a, conv, s['serie']), []):
                    h.append(f'        <p class="web">Resolt al web:<a class="chip" href="{href}" title="{html.escape(tema)}">'
                             f'{pr} · {html.escape(titol)}</a></p>')
                h.append('      </div>')
            h.append('    </article>')
        h.append('    </div>\n  </section>')
    return '\n'.join(h)


def substitueix(fitxer, marca, contingut):
    t = fitxer.read_text(encoding='utf-8')
    patro = re.compile(rf'(<!-- examens:{marca} -->).*?(<!-- /examens:{marca} -->)', re.S)
    if not patro.search(t):
        sys.exit(f'{fitxer}: falten les marques <!-- examens:{marca} -->')
    fitxer.write_text(patro.sub(lambda m: m.group(1) + contingut + m.group(2), t), encoding='utf-8', newline='\n')


def main():
    SORTIDA.mkdir(parents=True, exist_ok=True)
    examens, fets = {}, set()
    problemes, enllacos = carrega_problemes(), {}
    for (a, conv), f in sorted(fonts().items()):
        if set(f) != {'enunciat', 'pauta'}:
            sys.exit(f'{a} {conv}: falta la pauta o l\'enunciat ({", ".join(map(str, f.values()))})')
        e, p = pymupdf.open(f['enunciat']), pymupdf.open(f['pauta'])
        se, sp = series(e), series(p)
        if [s for s, *_ in se] != [s for s, *_ in sp]:
            sys.exit(f'{a} {conv}: les sèries no coincideixen (enunciat {se}, pauta {sp})')
        nom = NOM_CONV[conv][0]
        for (s, e0, e1), (_, p0, p1) in sorted(zip(se, sp)):
            base = SORTIDA / f'{a}-{conv}-s{s}'
            titol = f'PAU Física · {nom} {a} · Sèrie {s}'
            probs = [pr for pr, _ in problemes if (pr['any'], pr['convocatoria'], pr['serie']) == (a, conv, s)]
            le, ls = llocs_serie(e, e0, p, p0, e1 - e0 + 1, probs)
            me = desa([(e, e0, e1)], base.with_suffix('.pdf'), f'{titol} · Enunciat', [[1, 'Enunciat', 1]], le)
            ms = desa([(e, e0, e1), (p, p0, p1)], base.with_name(base.name + '-solucions.pdf'),
                      f'{titol} · Enunciat i solucions', [[1, 'Enunciat', 1], [1, 'Solucions', e1 - e0 + 2]], ls)
            enllacos.update(destins(probs, base, le, ls))
            examens.setdefault((a, conv), []).append({'serie': s, 'mida_e': me, 'mida_s': ms})
            fets |= {base.name + '.pdf', base.name + '-solucions.pdf'}
            print(f'{a} {conv:8} sèrie {s}: enunciat {e1 - e0 + 1} p., pauta {p1 - p0 + 1} p.')
    for vell in SORTIDA.glob('*.pdf'):
        if vell.name not in fets:
            vell.unlink()
    DESTINS.write_text(json.dumps({'_doc': DOC_DESTINS, 'problemes': dict(sorted(enllacos.items()))},
                                  ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    substitueix(PAU / 'index.html', 'anys', html_anys(examens))
    substitueix(PAU / 'index.html', 'llista', '\n' + html_examens(examens, problemes_web(problemes)) + '\n')
    anys = sorted({a for a, _ in examens})
    n = sum(len(v) for v in examens.values())
    resum = f'{n} exàmens de Física de {anys[0]} a {anys[-1]}'
    substitueix(PAU / 'index.html', 'resum', resum)
    substitueix(ROOT / 'index.html', 'resum', resum)
    print(f'{resum} · {len(examens)} convocatòries')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
