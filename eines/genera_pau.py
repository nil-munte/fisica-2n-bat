"""Insereix els problemes de les PAU (dades/<tema>/*.json) a les pàgines dels temes.

Ús (des de l'arrel del repositori):
    python eines/genera_pau.py            genera i escriu les pàgines
    python eines/genera_pau.py --prova    només informa, no escriu res

Llegeix dades/temes.json (mapa tema → pàgina) i, per a cada pàgina que existeix:
  - hi posa els problemes que tenen aquell tema (o subtema) com a principal, ordenats
    de més fàcil a més difícil, entre <!-- PAU:inici --> i <!-- PAU:fi -->;
  - hi posa enllaços als problemes d'altres pàgines que tenen aquell tema com a secundari,
    entre <!-- PAU-ENLLACOS:inici --> i <!-- PAU-ENLLACOS:fi -->;
  - hi incrusta l'estil i el codi del filtre (eines/plantilles/pau.css i pau.js).
Si la pàgina encara no té les marques, els blocs s'afegeixen al final de la secció
indicada a temes.json («seccio», per defecte «exercicis»).
Als temes sense pàgina no hi fa res: només diu quants problemes tenen preparats.
També actualitza el recompte de problemes de la portada (<span data-pau-compte="...">).
"""
import html, json, os, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DADES = ROOT / 'dades'
PLANT = pathlib.Path(__file__).resolve().parent / 'plantilles'
MESOS = {'juny': 'Juny', 'setembre': 'Setembre'}
NIVELLS = {1: ('★', 'Bàsic'), 2: ('★★', 'Intermedi'), 3: ('★★★', 'Avançat')}
_d = DADES / 'destins_pau.json'   # generat per eines/examens_pau.py
DESTINS = json.loads(_d.read_text(encoding='utf-8'))['problemes'] if _d.exists() else {}


def nivell(dificultat: int) -> int:
    return 1 if dificultat <= 3 else 2 if dificultat <= 6 else 3


def num(x) -> str:
    s = f'{x:g}' if isinstance(x, float) else str(x)
    return s.replace('.', ',')


def punts(x) -> str:
    return f"{num(x)} {'punt' if x == 1 else 'punts'}"


def etiqueta_apartat(a: str) -> str:
    return f'{a})' if re.fullmatch(r'[a-z]', a) else f'{a}.'


def nom_examen(p: dict, curt=False) -> str:
    q = p['problema']
    pn = (f'Exercici {q[1:]}' if p['any'] >= 2025 else q) if q.upper().startswith('P') else q
    s = f"PAU {MESOS[p['convocatoria']]} {p['any']} · Sèrie {p['serie']} · {pn}"
    if p.get('opcio') and not curt:
        s += f" · Opció {p['opcio']}"
    return s


def mapa_pagines(temes: dict) -> dict:
    """clau de tema ('gravitatori' o 'mhs-ones-so/mhs') → {'nom', 'pagina', 'seccio', 'blocs'}"""
    m = {}
    for k, t in temes.items():
        if 'subtemes' in t:
            for sk, s in t['subtemes'].items():
                m[f'{k}/{sk}'] = dict(s, nom=s['nom'])
        else:
            m[k] = t
    return m


def clau_principal(p: dict, temes: dict) -> str:
    k = p['tema_principal']
    return f"{k}/{p['subtema']}" if 'subtemes' in temes[k] else k


def carrega():
    temes = json.loads((DADES / 'temes.json').read_text(encoding='utf-8'))['temes']
    probs = []
    for f in sorted(DADES.glob('*/*.json')):
        p = json.loads(f.read_text(encoding='utf-8'))
        p['_fitxer'] = f
        probs.append(p)
    return temes, probs


def enllac_pdf(p: dict, quin: str, pagina: pathlib.Path) -> tuple[str, bool]:
    """Enllaç a l'enunciat o a la pauta ('enunciat' / 'pauta') del problema: el PDF propi de la sèrie
    (pau/pdf/, obert just al problema; vegeu eines/examens_pau.py) o, si no hi és, l'URL de la font."""
    d = DESTINS.get(p['id'], {}).get(quin)
    if d and (ROOT / d.split('#')[0]).exists():
        return os.path.relpath(ROOT, pagina.parent).replace(os.sep, '/') + '/' + d, True
    return p['fonts'][quin]['url'], False


def figura(p: dict, fid: str) -> str:
    f = p['figures'][fid]
    cap = f'<figcaption>{f["peu"]}</figcaption>' if f.get('peu') else ''
    return f'<figure>{f["svg"]}{cap}</figure>'


def html_problema(p: dict, n: int, mapa: dict, pagina: pathlib.Path) -> str:
    e, nv = p['enunciat'], nivell(p['dificultat'])
    est, nom_nv = NIVELLS[nv]
    fe = p['fonts']['enunciat']
    he, propi = enllac_pdf(p, 'enunciat', pagina)
    te = 'Enunciat original (PDF de la sèrie, obert al problema)' if propi else f'Enunciat original (PDF, pàgina {fe["pagina"]})'
    tambe = ''.join(f" · també Sèrie {t['serie']} {t['problema']}" for t in p.get('tambe_a', []))
    h = [f'<article class="panel ex pau" id="pau-{p["id"]}" data-nivell="{nv}" data-dificultat="{p["dificultat"]}">',
         f'<div class="eh"><span class="num">{n}.</span><h4 class="ttl">{p["titol"]}</h4>'
         f'<a class="perma" href="#pau-{p["id"]}" aria-label="Enllaç directe a aquest problema" title="Copia l&#39;enllaç d&#39;aquest problema">#</a>'
         f'<span class="nv" title="Nivell: {nom_nv}">{est}</span>'
         f'<a class="chip" href="{html.escape(he)}" target="_blank" rel="noopener" '
         f'title="{te}">{nom_examen(p)}{tambe}</a></div>',
         e.get('intro', '')]
    h += [figura(p, f) for f in e.get('figures', [])]
    h.append('<ol class="pau-parts">')
    for a in e['apartats']:
        figs = ''.join(figura(p, f) for f in a.get('figures', []))
        h.append(f'<li><span class="lab">{etiqueta_apartat(a["id"])}</span>{a["text"]} '
                 f'<span class="pts">[{punts(a["punts"])}{"" if p["puntuacio"].get("apartats_a_l_enunciat") else ", segons la pauta"}]</span>{figs}</li>')
    h.append('</ol>')
    if e.get('dades_text'):
        h.append(f'<p class="pau-dades">{e["dades_text"]}</p>')
    # teoria relacionada i altres temes (no s'imprimeixen)
    meta = []
    blocs = mapa.get(clau_principal(p, TEMES), {}).get('blocs', {})
    if p.get('blocs') and blocs:
        meta.append('Teoria: ' + ', '.join(f'<a href="#{b}">{blocs[b]}</a>' for b in p['blocs'] if b in blocs))
    sec = [mapa[s]['nom'] if s in mapa else TEMES[s]['nom'] for s in p['temes_secundaris']]
    if sec:
        meta.append('També: ' + ', '.join(sec))
    if meta:
        h.append('<p class="pau-meta">' + ' · '.join(meta) + '</p>')
    # solució
    s = ['<details class="sol"><summary>Solució</summary><div class="body">']
    for r in p['resolucio']:
        s.append(f'<section class="sap"><h5>{etiqueta_apartat(r["apartat"])}</h5>')
        for x in r['passos']:
            s.append(f'<p><b>{x["titol"]}.</b> {x["html"]}</p>' if x.get('titol') else f'<p>{x["html"]}</p>')
            s += [figura(p, f) for f in x.get('figures', [])]
        if r.get('pauta'):
            s.append('<div class="pauta"><b>Com puntua la pauta</b><ul>' +
                     ''.join(f'<li><span class="pp">{num(x["punts"])}</span><span>{x["que"]}</span></li>' for x in r['pauta']) +
                     '</ul></div>')
        s.append('</section>')
    fp = p['fonts']['pauta']
    hp, propi = enllac_pdf(p, 'pauta', pagina)
    s.append(f'<p class="fontpauta">Pauta oficial: <a href="{html.escape(hp)}" target="_blank" rel="noopener">'
             + ('PDF de correcció</a>, obert en aquest problema.</p>' if propi else
                f'PDF de correcció</a>, pàgina {fp["pagina"]}.</p>'))
    s.append('</div></details>')
    h += s
    h.append(f'<p class="pau-report"><a class="report" href="https://www.linkedin.com/in/nilmunte/" target="_blank" rel="noopener" data-ref="pau-{p["id"]}">Hi ha un error o tens un dubte d&#39;aquest problema? Escriu-me</a></p>')
    h.append('</article>')
    return '\n'.join(x for x in h if x)


def bloc_problemes(probs: list, mapa: dict, pagina: pathlib.Path) -> str:
    compte = {k: sum(1 for p in probs if nivell(p['dificultat']) == k) for k in NIVELLS}
    botons = [f'<button type="button" data-f="0" aria-pressed="true">Tots<small>{len(probs)}</small></button>']
    botons += [f'<button type="button" data-f="{k}" aria-pressed="false" title="{v[1]}">{v[0]}<small>{compte[k]}</small></button>'
               for k, v in NIVELLS.items()]
    h = ['<div class="exgroup" id="pau">',
         '<h3><span class="stars">PAU</span>Problemes de les PAU</h3>',
         f'<p class="lead">{len(probs)} problemes de les PAU de Catalunya, ordenats de més fàcil a més difícil. '
         'Cada apartat porta la puntuació oficial i, a la solució, com la reparteix la pauta de correcció. '
         'Els enunciats són els oficials de les PAU de Catalunya (Generalitat de Catalunya), reproduïts d\'acord amb '
         'les condicions de reutilització de la informació del sector públic; cada problema enllaça a l\'examen original.</p>',
         '<div class="pau-filtre" role="group" aria-label="Filtra per nivell"><span>Nivell:</span>' + ''.join(botons) + '</div>',
         '<p class="pau-buit" hidden>No hi ha cap problema d\'aquest nivell.</p>']
    h += [html_problema(p, i + 1, mapa, pagina) for i, p in enumerate(probs)]
    h.append('</div>')
    return '\n'.join(h)


def bloc_enllacos(enllacos: list) -> str:
    if not enllacos:
        return ''
    h = ['<div class="pau-enllacos" id="pau-altres">',
         '<h3>Problemes de les PAU d\'altres temes que també treballen aquest</h3><ul>']
    h += [f'<li><a href="{href}">{p["titol"]}</a> <small>{nom_examen(p, curt=True)} · {nom_tema}</small></li>'
          for p, href, nom_tema in enllacos]
    h.append('</ul></div>')
    return '\n'.join(h)


def substitueix(text: str, marca: str, contingut: str, seccio: str) -> str:
    ini, fi = f'<!-- {marca}:inici -->', f'<!-- {marca}:fi -->'
    nou = f'{ini}\n{contingut}\n{fi}' if contingut else f'{ini}\n{fi}'
    if ini in text:
        return re.sub(re.escape(ini) + r'.*?' + re.escape(fi), lambda _: nou, text, count=1, flags=re.S)
    m = re.search(rf'<section[^>]*\bid="{re.escape(seccio)}"[^>]*>', text)
    if not m:
        raise SystemExit(f'No trobo la secció #{seccio} ni les marques {ini}')
    tanca = text.index('</section>', m.end())
    return text[:tanca] + nou + '\n  ' + text[tanca:]


def incrusta(text: str, etiqueta: str, ident: str, codi: str, abans_de: str) -> str:
    bloc = f'<{etiqueta} id="{ident}">\n{codi.strip()}\n</{etiqueta}>'
    patro = rf'<{etiqueta} id="{ident}">.*?</{etiqueta}>'
    if re.search(patro, text, flags=re.S):
        return re.sub(patro, lambda _: bloc, text, count=1, flags=re.S)
    i = text.rindex(abans_de)
    return text[:i] + bloc + '\n' + text[i:]


TEMES = {}


def main(prova: bool) -> None:
    global TEMES
    sys.stdout.reconfigure(encoding='utf-8')
    TEMES, probs = carrega()
    mapa = mapa_pagines(TEMES)
    per_clau = {}
    for p in probs:
        per_clau.setdefault(clau_principal(p, TEMES), []).append(p)
    css, js = (PLANT / 'pau.css').read_text(encoding='utf-8'), (PLANT / 'pau.js').read_text(encoding='utf-8')
    comptes, sense_pagina = {}, []
    for clau, info in mapa.items():
        ps = sorted(per_clau.get(clau, []), key=lambda p: (p['dificultat'], -p['any'], p['id']))
        if not info.get('pagina'):
            if ps:
                sense_pagina.append((info['nom'], clau, len(ps)))
            continue
        pagina = ROOT / info['pagina']
        if not pagina.exists():
            print(f'! {clau}: la pàgina {info["pagina"]} no existeix; no hi faig res')
            sense_pagina.append((info['nom'], clau, len(ps)))
            continue
        # enllaços des dels temes secundaris (només si el problema té pàgina principal)
        enllacos = []
        for p in probs:
            if clau not in p['temes_secundaris'] and clau.split('/')[0] not in p['temes_secundaris']:
                continue
            dest = mapa.get(clau_principal(p, TEMES), {})
            if not dest.get('pagina') or not (ROOT / dest['pagina']).exists() or dest.get('pagina') == info['pagina']:
                continue
            rel = os.path.relpath(ROOT / dest['pagina'], pagina.parent).replace(os.sep, '/')
            enllacos.append((p, f'{rel}#pau-{p["id"]}', dest['nom']))
        seccio = info.get('seccio', 'exercicis')
        t0 = pagina.read_text(encoding='utf-8')
        t = substitueix(t0, 'PAU', bloc_problemes(ps, mapa, pagina) if ps else '', seccio)
        t = substitueix(t, 'PAU-ENLLACOS', bloc_enllacos(enllacos), seccio)
        t = incrusta(t, 'style', 'pau-css', css, '</head>')
        t = incrusta(t, 'script', 'pau-js', js, '</body>')
        comptes[info['pagina']] = len(ps)
        canvi = t != t0
        if canvi and not prova:
            pagina.write_text(t, encoding='utf-8')
        print(f"{'✓' if canvi else '='} {info['pagina']}: {len(ps)} problemes, {len(enllacos)} enllaços"
              f"{' (sense canvis)' if not canvi else (' (prova, no escrit)' if prova else '')}")
    # portada: recompte de problemes de cada pàgina
    portada = ROOT / 'index.html'
    if portada.exists():
        t0 = portada.read_text(encoding='utf-8')
        t = re.sub(r'(<span data-pau-compte="([^"]+)">)\d*(</span>)',
                   lambda m: f'{m.group(1)}{comptes.get(m.group(2), 0)}{m.group(3)}', t0)
        if t != t0 and not prova:
            portada.write_text(t, encoding='utf-8')
            print('✓ index.html: recompte actualitzat')
    if sense_pagina:
        print('\nTemes sense pàgina (problemes preparats, no inserits):')
        for nom, clau, n in sense_pagina:
            print(f'  · {nom} ({clau}): {n}')
    revisar = [p['id'] for p in probs if p.get('verificacio', {}).get('estat') != 'ok']
    if revisar:
        print(f'\nAtenció: {len(revisar)} problemes no estan verificats (python eines/comprova_pau.py): ' + ', '.join(revisar))


if __name__ == '__main__':
    main('--prova' in sys.argv[1:])
