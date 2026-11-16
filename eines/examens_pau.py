"""Genera la secció d'exàmens de les PAU (pau/) a partir dels PDF oficials de fonts/pdf/.

Ús (des de l'arrel del repositori):
    python eines/examens_pau.py

Els PDF oficials es diuen pau_fisiAAcX.pdf: AA és l'any, c la convocatòria (j juny, s setembre)
i X el tipus (l enunciat; p o t pauta de correcció; si n'hi ha diverses versions, _v2… mana la darrera).
Els acabats en _tei són els del Tribunal Especial d'Incidències (alumnes que van tenir una incidència el dia de
l'examen o que necessiten adaptacions): una sèrie més de la mateixa convocatòria, marcada com a tal a la llista.
Cada PDF pot portar diverses sèries: es detecten per la marca «Sèrie N» de la primera pàgina de cadascuna.
Per a cada sèrie escriu:
    pau/pdf/AAAA-convocatoria-sN.pdf             enunciat (sense solucions)
    pau/pdf/AAAA-convocatoria-sN-solucions.pdf   enunciat + pauta de correcció
    pau/AAAA-convocatoria-serie-N/index.html     pàgina de l'examen: text de l'enunciat (eines/enunciats_pdf.py),
                                                 enllaços als dos PDF i als problemes resolts al web
                                                 (plantilla eines/plantilles/examen.html)
i reescriu la llista d'exàmens de pau/index.html i el resum de la portada
(entre les marques <!-- examens:… --> i <!-- /examens:… -->).
Els problemes resolts al web (dades/<tema>/*.json) s'enllacen des de la seva sèrie, i dins dels PDF
tenen una destinació amb nom just a sobre del títol (fitxer.pdf#nameddest=P5A a l'enunciat,
#nameddest=solucio-P5A a la pauta). Els enllaços es desen a dades/destins_pau.json per a genera_pau.py.
Requereix PyMuPDF (pip install pymupdf).
"""
import html, json, pathlib, re, string, sys
import pymupdf

import enunciats_pdf
from rutes import DADES, OBRA, PLANTILLES, URL_BASE, WEB as ROOT, FONTS as _FONTS   # ROOT: arrel del web generat (dist/)
FONTS = _FONTS / 'pdf'
PAU = ROOT / 'pau'
SORTIDA = PAU / 'pdf'
CONV = {'j': 'juny', 's': 'setembre'}
NOM_CONV = {'juny': ('Juny', 'Convocatòria ordinària'), 'setembre': ('Setembre', 'Convocatòria extraordinària')}
FITXER = re.compile(r'pau_fisi(\d\d)([js])([lpt])(?:_v(\d+))?(_tei)?\.pdf$')
SERIE = re.compile(r'S[ÈEèe]?RIE\s*(\d)', re.I)
DESTINS = OBRA / 'destins_pau.json'
DOC_DESTINS = ("Generat per eines/examens_pau.py; no s'edita a mà. Per a cada problema, l'enllaç (des de l'arrel) "
               "a l'enunciat i a la pauta dins dels PDF de la seva sèrie a pau/pdf/. El fa servir eines/genera_pau.py.")


def fonts():
    """{(any, convocatòria, tei): {'enunciat': Path, 'pauta': Path}}"""
    out = {}
    for p in sorted(FONTS.glob('pau_fisi*.pdf')):
        m = FITXER.match(p.name)
        if not m:
            print(f'  (ignoro {p.name})')
            continue
        aa, c, x, v, tei = m.groups()
        tipus = 'enunciat' if x == 'l' else 'pauta'
        clau = (2000 + int(aa), CONV[c], bool(tei))
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
    temes = json.loads((DADES / 'temes.json').read_text(encoding='utf-8'))['temes']
    out = []
    for f in sorted(DADES.glob('*/*.json')):
        p = json.loads(f.read_text(encoding='utf-8'))
        if not all(p.get(k) for k in ('any', 'convocatoria', 'serie')):   # problemes que no són de cap examen
            continue
        t = temes.get(p['tema_principal'], {})
        t = t.get('subtemes', {}).get(p.get('subtema'), t)
        out.append((p, t if t.get('pagina') else None))
    return out


def problemes_web(problemes):
    """{(any, convocatòria, sèrie): [(problema, opció, títol, enllaç des de l'arrel del web, tema)]}"""
    out = {}
    for p, t in problemes:
        if t:
            out.setdefault((p['any'], p['convocatoria'], p['serie']), []).append(
                (p['problema'], str(p.get('opcio') or '').upper(), p['titol'], f"{t['pagina']}#pau-{p['id']}", t['nom']))
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
                tei = ('<small class="tei" title="Tribunal Especial d\'Incidències: alumnes que van tenir una incidència '
                       'el dia de l\'examen o que necessiten adaptacions">Tribunal d\'incidències</small>') if s['tei'] else ''
                h.append(f'      <div class="serie"><span class="sn"><a href="{slug(a, conv, s["serie"])}/" '
                         f'title="Enunciat de la sèrie {s["serie"]} de {nom.lower()} {a}, amb els problemes resolts al web">'
                         f'Sèrie {s["serie"]}</a>{tei}</span><div class="botons">'
                         + boto(base + '.pdf', 'PDF enunciat', mb(s['mida_e']), f"l'enunciat de {que}",
                                f'{fitxer} - Enunciat.pdf')
                         + boto(base + '-solucions.pdf', 'PDF enunciat + solucions', mb(s['mida_s']),
                                f'{que} amb les solucions', f'{fitxer} - Enunciat i solucions.pdf', primari=True)
                         + '</div>')
                for pr, _, titol, href, tema in web.get((a, conv, s['serie']), []):
                    h.append(f'        <p class="web">Resolt al web:<a class="chip" href="../{href}" title="{html.escape(tema)}">'
                             f'{pr} · {html.escape(titol)}</a></p>')
                h.append('      </div>')
            h.append('    </article>')
        h.append('    </div>\n  </section>')
    return '\n'.join(h)


def slug(a, conv, s):
    """Carpeta de la pàgina de l'examen dins de pau/: 2024-juny-serie-1."""
    return f'{a}-{conv}-serie-{s}'


PROBLEMA = re.compile(r'^P\s?(\d+)\)\s*')
EXERCICI = re.compile(r'^Exercici\s*(\d+)\b')
OPCIO_TITOL = re.compile(r'^(?:OPCIÓ|Opció)\s*([AB12])\s*$')
PART = re.compile(r'^PART (COMUNA|OPTATIVA)\s*$')
PUNTS = re.compile(r'^\[[\d,]+ punts?( en total)?\]$')
APARTAT = re.compile(r'^([a-d]\)|\d\.\d\.\s)')
DADES_NOTA = re.compile(r'^(Dad[ae]s?|DADES?|Nota|NOTA|Constants?)\s*:')
FORMULA_HTML = '<span class="nopdf" title="Aquesta fórmula és un dibuix al PDF: vegeu-la a la pàgina enllaçada">[fórmula al PDF]</span>'


def html_enunciat(pars, pdf, resolts):
    """HTML de l'enunciat a partir dels paràgrafs d'enunciats_pdf.paragrafs().
    pdf: enllaç al PDF de l'enunciat de la sèrie. resolts: {(problema, opció): (títol, enllaç, tema)}.
    Torna (html, enllaços de l'índex, claus de resolts que s'han enllaçat)."""
    out, index, fets, ids = [], [], set(), set()
    opcio, nou, n_ex, ide_ex = '', False, None, None

    def pdfpag(pag):
        return (f'<a class="pg" href="{pdf}#page={pag}" target="_blank" rel="noopener" '
                f'title="Obre el PDF de l\'enunciat a la pàgina {pag}">PDF, pàg. {pag}</a>')

    def resolt(clau):
        if clau not in resolts:
            return ''
        fets.add(clau)
        titol, href, tema = resolts[clau]
        return (f'<a class="chip resolt" href="{href}" title="{html.escape(titol)} ({html.escape(tema)})">'
                f'Resolt al web</a>')

    def id_unic(ide):
        while ide in ids:
            ide += '-b'
        ids.add(ide)
        return ide

    for pag, h, pla, fig in pars:
        h = h.replace(enunciats_pdf.FORMULA, FORMULA_HTML)
        if m := PROBLEMA.match(pla):
            n, nou = m.group(1), False
            ide = id_unic(f'p{n}{opcio.lower()}')
            nom = f'P{n}' + (f' · Opció {opcio}' if opcio else '')
            out.append(f'    <h2 id="{ide}">{nom} {pdfpag(pag)}{resolt((f"P{n}", opcio))}</h2>')
            index.append(f'<a href="#{ide}">P{n}{opcio}</a>')
            out.append(f'    <p>{PROBLEMA.sub("", h)}</p>')
        elif (m := EXERCICI.match(pla)) and len(pla) < 90:   # «Exercici 1. Camps gravitatoris» (des del 2025)
            n_ex, nou, opcio = m.group(1), True, ''
            ide_ex = id_unic(f'p{n_ex}')
            out.append(f'    <h2 id="{ide_ex}">{html.escape(pla)} {pdfpag(pag)}{resolt((f"P{n_ex}", ""))}</h2>')
            index.append(f'<a href="#{ide_ex}">Ex. {n_ex}</a>')
        elif m := OPCIO_TITOL.match(pla):
            opcio = m.group(1)
            if nou and n_ex:   # opció dins d'un exercici
                ide = id_unic(f'p{n_ex}{opcio.lower()}')
                out.append(f'    <p class="opcio" id="{ide}">Opció {opcio} {resolt((f"P{n_ex}", opcio))}</p>')
            else:              # opció que agrupa problemes (fins al 2019)
                out.append(f'    <p class="opcio" id="{id_unic("opcio-" + opcio.lower())}">Opció {opcio}</p>')
        elif m := PART.match(pla):
            opcio = ''
            out.append(f'    <p class="opcio">Part {m.group(1).lower()}</p>')
        elif PUNTS.match(pla):
            out.append(f'    <p class="punts">{h}</p>')
        elif APARTAT.match(pla):
            out.append(f'    <p class="ap">{h}</p>')
        elif DADES_NOTA.match(pla):
            out.append(f'    <p class="dades">{h}</p>')
        else:
            out.append(f'    <p class="{"" if index else "intro"}">{h}</p>'.replace(' class=""', ''))
        if fig:
            out.append(f'    <p class="fig">Figura: <a href="{pdf}#page={pag}" target="_blank" rel="noopener">vegeu-la al PDF '
                       f'(pàgina {pag})</a></p>')
    return '\n'.join(out), index, fets


def boto_examen(e, base, nom):
    """Botons dels dos PDF des de la pàgina de l'examen."""
    que = f'la sèrie {e["serie"]} de {nom.lower()} {e["any"]}'
    fitxer = f'PAU Física {e["any"]} {nom} - Sèrie {e["serie"]}'
    return (boto(f'../pdf/{base}.pdf', 'PDF enunciat', mb(e['mida_e']), f"l'enunciat de {que}", f'{fitxer} - Enunciat.pdf')
            + boto(f'../pdf/{base}-solucions.pdf', 'PDF enunciat + solucions', mb(e['mida_s']),
                   f'{que} amb les solucions', f'{fitxer} - Enunciat i solucions.pdf', primari=True))


def pagines_examens(examens, web):
    """Escriu pau/<examen>/index.html per a cada sèrie (examens: llista en ordre cronològic)."""
    plantilla = string.Template((PLANTILLES / 'examen.html').read_text(encoding='utf-8'))
    noms = {}
    for e in examens:
        nom = NOM_CONV[e['conv']][0]
        noms[e['slug']] = f'{nom} {e["any"]} · Sèrie {e["serie"]}'
    for k, e in enumerate(examens):
        a, conv, s, tei = e['any'], e['conv'], e['serie'], e['tei']
        nom, desc_conv = NOM_CONV[conv]
        base = f'{a}-{conv}-s{s}'
        url = f'{URL_BASE}pau/{e["slug"]}/'
        resolts = {(pr, op): (titol, f'../../{href}', tema) for pr, op, titol, href, tema in web.get((a, conv, s), [])}
        cos, index, fets = html_enunciat(e['pars'], f'../pdf/{base}.pdf', resolts)
        for clau in sorted(set(resolts) - fets):
            print(f'  ! {base}: el problema resolt {"".join(clau)} no surt a l\'enunciat extret; només s\'enllaça a dalt')
        tei_txt = " (Tribunal d'incidències)" if tei else ''
        titol_curt = f'PAU Física {a} · {nom} · Sèrie {s}{tei_txt}'
        temes = list(dict.fromkeys(t for *_, t in resolts.values()))
        n = len(resolts)
        # els cercadors en mostren uns 155 caràcters: els temes resolts només hi van si hi caben
        descripcio = (f'Selectivitat (PAU) de Física de Catalunya, {nom.lower()} {a}, sèrie {s}{tei_txt}: '
                      f'enunciat complet i solucions oficials en PDF.')
        if n and len(extra := f' Resolts pas a pas: {", ".join(temes)}.') + len(descripcio) <= 160:
            descripcio += extra
        ant, seg = (examens[k - 1] if k else None), (examens[k + 1] if k + 1 < len(examens) else None)
        rel = ''.join(f'<link rel="{r}" href="{URL_BASE}pau/{x["slug"]}/">' for r, x in (('prev', ant), ('next', seg)) if x)
        veins = ''.join([
            f'<a class="btn" rel="prev" href="../{ant["slug"]}/">← {noms[ant["slug"]]}</a>' if ant else '',
            '<a class="btn" href="../">Tots els exàmens</a><a class="btn" href="../../">Portada</a>',
            f'<a class="btn" rel="next" href="../{seg["slug"]}/">{noms[seg["slug"]]} →</a>' if seg else ''])
        imatge = f'{URL_BASE}img/og-pau-{base}.png'
        pdf_e, pdf_s = f'{URL_BASE}pau/pdf/{base}.pdf', f'{URL_BASE}pau/pdf/{base}-solucions.pdf'
        jsonld = {
            '@context': 'https://schema.org', '@type': 'LearningResource', 'name': titol_curt, 'description': descripcio,
            'url': url, 'inLanguage': 'ca', 'learningResourceType': 'Examen', 'educationalLevel': '2n de Batxillerat',
            'about': {'@type': 'Thing', 'name': 'Física'}, 'isAccessibleForFree': True,
            'creator': {'@type': 'Organization', 'name': 'Generalitat de Catalunya'},
            'isPartOf': {'@type': 'CollectionPage', 'name': 'Exàmens de selectivitat (PAU) de Física', 'url': f'{URL_BASE}pau/'},
            'encoding': [{'@type': 'MediaObject', 'name': 'Enunciat', 'contentUrl': pdf_e, 'encodingFormat': 'application/pdf'},
                         {'@type': 'MediaObject', 'name': 'Enunciat i solucions', 'contentUrl': pdf_s,
                          'encodingFormat': 'application/pdf'}]}
        molles = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': nm, 'item': u} for i, (nm, u) in enumerate(
                [('Física · 2n de Batxillerat', URL_BASE), ('Exàmens de selectivitat (PAU) de Física', f'{URL_BASE}pau/'),
                 (titol_curt, url)])]}
        chips = ''.join(f'<a class="chip" href="{href}" title="{html.escape(tema)}">{pr}{op} · {html.escape(titol)}</a>'
                        for (pr, op), (titol, href, tema) in sorted(resolts.items()))
        # per a la imatge per compartir (eines/imatges_og.py, patró de dades/imatges_og.json)
        dades = {'imatge': f'og-pau-{base}.png', 'any': a, 'conv': nom, 'serie': s,
                 'tei': " (Tribunal d'incidències)" if tei else '',
                 'resolts_text': (f'{n} problema resolt al web' if n == 1 else f'{n} problemes resolts al web') if n else ''}
        ple = plantilla.substitute(
            titol=html.escape(f'{titol_curt} · Enunciat i solucions'), titol_curt=html.escape(titol_curt),
            descripcio=html.escape(descripcio), url=url, rel_veins=rel, imatge=imatge,
            jsonld=json.dumps(jsonld, ensure_ascii=False), molles=json.dumps(molles, ensure_ascii=False),
            dades=' '.join(f'data-{k}="{html.escape(str(v))}"' for k, v in dades.items()),
            nom_curt=html.escape(noms[e['slug']] + (' (TEI)' if tei else '')),
            h1=f'PAU Física {a} · {nom} · Sèrie {s}' + (' <small class="tei">Tribunal d\'incidències</small>' if tei else ''),
            subtitol=html.escape(f'{desc_conv} de {a}. Enunciat oficial complet; les solucions són els criteris de '
                                 f'correcció oficials.'),
            botons=boto_examen(e, base, nom), index=''.join(index),
            resolts=f'  <p class="web resolts">Resolts al web:{chips}</p>' if chips else '',
            pdf_solucions=f'../pdf/{base}-solucions.pdf', enunciat=cos, veins=veins)
        desti = PAU / e['slug'] / 'index.html'
        desti.parent.mkdir(parents=True, exist_ok=True)
        desti.write_text(ple, encoding='utf-8', newline='\n')
    print(f'{len(examens)} pàgines d\'examen a pau/<examen>/')


def substitueix(fitxer, marca, contingut):
    t = fitxer.read_text(encoding='utf-8')
    patro = re.compile(rf'(<!-- examens:{marca} -->).*?(<!-- /examens:{marca} -->)', re.S)
    if not patro.search(t):
        sys.exit(f'{fitxer}: falten les marques <!-- examens:{marca} -->')
    fitxer.write_text(patro.sub(lambda m: m.group(1) + contingut + m.group(2), t), encoding='utf-8', newline='\n')


def main():
    SORTIDA.mkdir(parents=True, exist_ok=True)
    examens, fets, pagines = {}, set(), []
    problemes, enllacos = carrega_problemes(), {}
    for (a, conv, tei), f in sorted(fonts().items()):
        if set(f) != {'enunciat', 'pauta'}:
            sys.exit(f'{a} {conv}{" TEI" if tei else ""}: falta la pauta o l\'enunciat ({", ".join(map(str, f.values()))})')
        e, p = pymupdf.open(f['enunciat']), pymupdf.open(f['pauta'])
        se, sp = series(e), series(p)
        if [s for s, *_ in se] != [s for s, *_ in sp]:
            sys.exit(f'{a} {conv}: les sèries no coincideixen (enunciat {se}, pauta {sp})')
        nom = NOM_CONV[conv][0]
        for (s, e0, e1), (_, p0, p1) in sorted(zip(se, sp)):
            base = SORTIDA / f'{a}-{conv}-s{s}'
            titol = f'PAU Física · {nom} {a} · Sèrie {s}' + (' (Tribunal d\'incidències)' if tei else '')
            probs = [pr for pr, _ in problemes if (pr['any'], pr['convocatoria'], pr['serie']) == (a, conv, s)]
            le, ls = llocs_serie(e, e0, p, p0, e1 - e0 + 1, probs)
            me = desa([(e, e0, e1)], base.with_suffix('.pdf'), f'{titol} · Enunciat', [[1, 'Enunciat', 1]], le)
            ms = desa([(e, e0, e1), (p, p0, p1)], base.with_name(base.name + '-solucions.pdf'),
                      f'{titol} · Enunciat i solucions', [[1, 'Enunciat', 1], [1, 'Solucions', e1 - e0 + 2]], ls)
            enllacos.update(destins(probs, base, le, ls))
            sèries = examens.setdefault((a, conv), [])
            if any(x['serie'] == s for x in sèries):
                sys.exit(f'{a} {conv}: la sèrie {s} surt en dos PDF')
            sèries.append({'serie': s, 'tei': tei, 'mida_e': me, 'mida_s': ms})
            sèries.sort(key=lambda x: x['serie'])
            pagines.append({'any': a, 'conv': conv, 'serie': s, 'tei': tei, 'mida_e': me, 'mida_s': ms,
                            'slug': slug(a, conv, s), 'pars': enunciats_pdf.paragrafs(base.with_suffix('.pdf'))})
            fets |= {base.name + '.pdf', base.name + '-solucions.pdf'}
            print(f'{a} {conv:8} sèrie {s}{" (TEI)" if tei else ""}: enunciat {e1 - e0 + 1} p., pauta {p1 - p0 + 1} p.')
    for vell in SORTIDA.glob('*.pdf'):
        if vell.name not in fets:
            vell.unlink()
    DESTINS.parent.mkdir(parents=True, exist_ok=True)
    DESTINS.write_text(json.dumps({'_doc': DOC_DESTINS, 'problemes': dict(sorted(enllacos.items()))},
                                  ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    for vella in PAU.glob('*-serie-*'):
        if vella.is_dir() and vella.name not in {p['slug'] for p in pagines}:
            for f in vella.iterdir():
                f.unlink()
            vella.rmdir()
    web = problemes_web(problemes)
    pagines.sort(key=lambda p: (p['any'], list(NOM_CONV).index(p['conv']), p['serie']))
    pagines_examens(pagines, web)
    substitueix(PAU / 'index.html', 'anys', html_anys(examens))
    substitueix(PAU / 'index.html', 'llista', '\n' + html_examens(examens, web) + '\n')
    anys = sorted({a for a, _ in examens})
    n = sum(len(v) for v in examens.values())
    resum = f'{n} exàmens de Física de {anys[0]} a {anys[-1]}'
    substitueix(PAU / 'index.html', 'resum', resum)
    substitueix(ROOT / 'index.html', 'resum', resum)
    print(f'{resum} · {len(examens)} convocatòries')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
