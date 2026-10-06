"""Comprova els problemes de les PAU desats a dades/<tema>/*.json.

Ús (des de l'arrel del repositori):
    python eines/comprova_pau.py                 tots els problemes
    python eines/comprova_pau.py dades/mhs-ones-so/2014-juny-s4-p5.json

Per a cada problema:
  1. Valida l'estructura (camps, apartats, puntuacions de la pauta, tema i subtema).
  2. Executa el codi de «comprovacio», que ha de deixar els resultats al diccionari R.
  3. Compara cada resultat calculat amb el valor que dona la resolució («valor»)
     i amb el de la pauta oficial («pauta»).
  4. Revisa la notació (coma decimal).
Desa l'estat a «verificacio»: ok, revisar (no coincideix amb la pauta o hi ha avisos)
o error (estructura o càlcul propi incorrectes). Les notes manuals («notes_manuals»)
es conserven i, si n'hi ha, l'estat mai no és ok.
"""
import json, math, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DADES = ROOT / 'dades'
TOL = 0.006   # tolerància relativa per defecte (arrodoniment a 3 xifres significatives)

CAMPS = ['id', 'any', 'convocatoria', 'serie', 'problema', 'tema_principal', 'temes_secundaris',
         'dificultat', 'titol', 'fonts', 'dades', 'puntuacio', 'enunciat', 'figures', 'resolucio',
         'resultats', 'comprovacio', 'verificacio']


def carrega_temes():
    t = json.loads((DADES / 'temes.json').read_text(encoding='utf-8'))['temes']
    return t


def textos_html(p):
    """Tots els fragments HTML visibles del problema (enunciat i resolució)."""
    e = p['enunciat']
    yield 'enunciat.intro', e.get('intro', '')
    for a in e['apartats']:
        yield f"enunciat.{a['id']}", a['text']
    yield 'enunciat.dades_text', e.get('dades_text', '')
    for r in p['resolucio']:
        for i, s in enumerate(r['passos']):
            yield f"resolucio.{r['apartat']}.{i + 1}", s['html']
        for i, s in enumerate(r.get('pauta', [])):
            yield f"pauta.{r['apartat']}.{i + 1}", s['que']


def sense_etiquetes(h):
    h = re.sub(r'<svg.*?</svg>', ' ', h, flags=re.S)
    return re.sub(r'<[^>]+>', '', h)


def valida(p, nom, temes):
    err, avis = [], []
    for c in CAMPS:
        if c not in p:
            err.append(f'falta el camp «{c}»')
    if err:
        return err, avis
    conv = {'juny': 'juny', 'setembre': 'setembre'}.get(p['convocatoria'])
    if not conv:
        err.append('convocatoria ha de ser juny o setembre')
    esperat = f"{p['any']}-{p['convocatoria']}-s{p['serie']}-{p['problema'].lower()}"
    if p['id'] != esperat or nom != esperat:
        err.append(f'l\'id i el nom del fitxer han de ser {esperat}')
    tp = p['tema_principal']
    if tp not in temes:
        err.append(f'tema principal desconegut: {tp}')
    elif 'subtemes' in temes[tp] and p.get('subtema') not in temes[tp]['subtemes']:
        err.append(f"subtema desconegut: {p.get('subtema')}")
    valides = {f'{k}/{s}' for k, t in temes.items() for s in t.get('subtemes', {})} | \
              {k for k, t in temes.items() if 'subtemes' not in t}
    for s in p['temes_secundaris']:
        if s not in valides:
            err.append(f'tema secundari desconegut: {s} (cal «tema» o «tema/subtema»: {", ".join(sorted(valides))})')
    if not 1 <= p['dificultat'] <= 10:
        err.append('dificultat ha de ser entre 1 i 10')
    ids = [a['id'] for a in p['enunciat']['apartats']]
    if ids != [r['apartat'] for r in p['resolucio']]:
        err.append('els apartats de l\'enunciat i de la resolució no coincideixen')
    total = 0
    for a, r in zip(p['enunciat']['apartats'], p['resolucio']):
        total += a['punts']
        sp = round(sum(x['punts'] for x in r.get('pauta', [])), 3)
        if r.get('pauta') and abs(sp - a['punts']) > 1e-6:
            avis.append(f"apartat {a['id']}: la pauta suma {sp} però l'apartat val {a['punts']}")
        if not r.get('pauta'):
            avis.append(f"apartat {a['id']}: falta el repartiment de la pauta")
    if abs(total - p['puntuacio']['total']) > 1e-6:
        err.append(f"els apartats sumen {total} però el problema val {p['puntuacio']['total']}")
    citades = [f for a in [p['enunciat']] + p['enunciat']['apartats'] for f in a.get('figures', [])]
    citades += [f for r in p['resolucio'] for s in r['passos'] for f in s.get('figures', [])]
    for fid in set(p['figures']) - set(citades):
        avis.append(f'figura «{fid}» definida però no citada enlloc')
    for fid in citades:
        if fid not in p['figures']:
            err.append(f'figura «{fid}» citada però no definida')
    for fid, f in p['figures'].items():
        if not f.get('svg', '').lstrip().startswith('<svg'):
            err.append(f'la figura «{fid}» no és un SVG')
    # notació
    for on, h in textos_html(p):
        t = sense_etiquetes(h)
        for m in re.finditer(r'(?<![\w.])\d+\.\d+(?![\w.])', t):
            avis.append(f'{on}: punt decimal «{m.group()}» (cal coma decimal)')
    return err, avis


def calcula(p):
    ns = {}
    exec('\n'.join(p['comprovacio']), {'__builtins__': __builtins__, 'math': math}, ns)
    if 'R' not in ns:
        raise ValueError('el codi de comprovació no defineix R')
    return ns['R']


def proper(a, b, tol):
    if a == b:
        return True
    if isinstance(a, complex) or isinstance(b, complex):
        return False
    return abs(a - b) <= tol * max(abs(a), abs(b), 1e-300)


def comprova(path, temes, desa=True):
    p = json.loads(path.read_text(encoding='utf-8'))
    err, avis = valida(p, path.stem, temes)
    rev = []
    if not err:
        try:
            R = calcula(p)
        except Exception as e:  # noqa: BLE001
            err.append(f'error en executar la comprovació: {e!r}')
            R = {}
        for r in p['resultats']:
            k, tol = r['clau'], r.get('tol', TOL)
            if k not in R:
                err.append(f'R no té la clau «{k}»')
                continue
            v = R[k]
            if r.get('valor') is not None and not proper(v, r['valor'], tol):
                err.append(f'{k}: Python dona {v:.6g} però la resolució diu {r["valor"]}')
            if r.get('pauta') is not None and not proper(v, r['pauta'], tol):
                rev.append(f'{k}: Python dona {v:.6g} però la pauta diu {r["pauta"]}')
    ver = p.get('verificacio', {})
    manuals = ver.get('notes_manuals', [])
    estat = 'error' if err else ('revisar' if rev or avis or manuals else 'ok')
    nou = {'estat': estat, 'errors': err, 'diferencies_pauta': rev, 'avisos': avis, 'notes_manuals': manuals}
    if desa and p.get('verificacio') != nou:
        p['verificacio'] = nou
        path.write_text(json.dumps(p, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return p['id'] if 'id' in p else path.stem, nou


def main(args):
    sys.stdout.reconfigure(encoding='utf-8')
    temes = carrega_temes()
    fitxers = [pathlib.Path(a).resolve() for a in args] or sorted(DADES.glob('*/*.json'))
    compte = {'ok': 0, 'revisar': 0, 'error': 0}
    for f in fitxers:
        pid, v = comprova(f, temes)
        compte[v['estat']] += 1
        marca = {'ok': '✓', 'revisar': '?', 'error': '✗'}[v['estat']]
        print(f'{marca} {pid}')
        for clau in ('errors', 'diferencies_pauta', 'avisos', 'notes_manuals'):
            for x in v[clau]:
                print(f'    {clau}: {x}')
    print(f"\n{compte['ok']} ok · {compte['revisar']} per revisar · {compte['error']} amb errors")
    return 1 if compte['error'] else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
