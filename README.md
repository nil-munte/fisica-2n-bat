# Física · 2n de Batxillerat

Materials de repàs de Física de 2n de Batxillerat: teoria orientada a exercicis, demos interactives, exercicis graduats amb solució desplegable i problemes de les PAU de Catalunya.

Web: <https://nil-munte.github.io/fisica-2n-bat/>

## Contingut

| Tema | Pàgina | PDF |
|---|---|---|
| Moviment harmònic simple | `temes/mhs/` | formulari, enunciats, enunciats + solucions |
| Ones | `temes/ones/` | formulari, enunciats, enunciats + solucions |
| Exàmens de les PAU | `pau/` | cada sèrie de cada convocatòria, sense solucions i amb els criteris de correcció |

## Com està organitzat

El repositori només conté el que s'escriu a mà. Tot el que es pot generar (els blocs de problemes de les PAU, els PDF dels temes, els exàmens separats per sèries, les imatges per compartir, el sitemap) es genera a l'hora de construir el web i no es comita.

```
.
├── src/                        El web tal com s'escriu (no conté res generat)
│   ├── index.html              Portada
│   ├── temes/<tema>/index.html Teoria, demos, mètode i exercicis de cada tema
│   ├── pau/index.html          Plantilla de la pàgina d'exàmens
│   └── robots.txt
├── dades/
│   ├── temes.json              Mapa tema → pàgina
│   ├── <tema>/*.json           Un fitxer per problema de les PAU
│   ├── fonts_oficials.json     Inventari dels PDF oficials de les PAU (origen, mida, SHA-256)
│   ├── imatges_og.json         Text de les imatges per compartir de cada pàgina
│   └── README.md               Format dels problemes i normes de contingut
├── eines/                      Construcció i eines d'autoria (Python)
└── .github/workflows/web.yml   Comprova, construeix i publica el web
```

No es comiten (vegeu `.gitignore`): `dist/` (el web generat), `build/` (fitxers intermedis) i `fonts/` (els PDF oficials i els fitxers que se'n deriven).

## Publicació

A cada `push` a `main` que canviï el web, les dades o les eines, GitHub Actions:

1. comprova els problemes de les PAU (si n'hi ha cap amb errors, no es publica res);
2. pren la còpia dels PDF oficials de la release [`fonts-oficials`](https://github.com/nil-munte/fisica-2n-bat/releases/tag/fonts-oficials) (desada en memòria cau) i en verifica el SHA-256;
3. construeix el web a `dist/` (els passos lents només es refan si n'han canviat les entrades: vegeu la memòria cau a `eines/build.py`) i comprova que cap enllaç intern sigui trencat;
4. el publica a GitHub Pages.

Els *pull requests* es comproven i es construeixen, però no es publiquen. Els canvis que només toquen documentació (`*.md`) no fan construir res.

## Treballar en local

```bash
pip install -r eines/requirements.txt
python -m playwright install chromium
python eines/fonts_oficials.py baixa      # només la primera vegada (o quan n'hi hagi de nous)
python eines/build.py                     # construcció completa a dist/ (--rapid: sense PDF; --net: sense memòria cau)
python -m http.server -d dist 8765        # previsualització a http://localhost:8765
```

### Afegir problemes de les PAU

Cada problema és un JSON a `dades/<tema>/` (format i normes a [dades/README.md](dades/README.md)).

```bash
python eines/fonts_pau.py cerca pau_fisi14jl "màquina de cosir"   # pàgina de l'enunciat
python eines/fonts_pau.py png pau_fisi14jp 7                      # imatge de la pauta o d'una figura
python eines/previsualitza_figures.py dades/<tema>/<id>.json      # figures SVG com a PNG
python eines/comprova_pau.py                                      # estructura, càlculs i notació
```

Un tema nou: crea `src/temes/<tema>/index.html` i afegeix-ne la ruta a `dades/temes.json`. La construcció hi posarà els problemes i en farà els PDF.

### Afegir PDF oficials

Desa'ls a `fonts/pdf/` amb el nom oficial (`pau_fisiAAjl.pdf`, `pau_fisiAAjp.pdf`…) i actualitza'n la còpia:

```bash
python eines/fonts_oficials.py inventari   # refà dades/fonts_oficials.json
python eines/fonts_oficials.py puja        # puja els nous a la release fonts-oficials (cal gh)
```

### Eines

| Eina | Què fa |
|---|---|
| `build.py` | Construeix el web complet a `dist/` |
| `comprova_pau.py` | Comprova els problemes de les PAU: estructura, càlculs en Python contra la pauta i notació |
| `comprova_enllacos.py` | Comprova que cap enllaç intern de `dist/` sigui trencat |
| `examens_pau.py` | Separa els exàmens oficials per sèries i fa la pàgina `pau/` |
| `genera_pau.py` | Insereix els problemes de les PAU a les pàgines dels temes |
| `prerender_exercicis.py` | Escriu a l'HTML els exercicis que crea el JavaScript, per als cercadors |
| `build_pdfs.py` | PDF d'un tema: formulari, enunciats i enunciats + solucions |
| `imatges_og.py` | Imatges per compartir (Open Graph) de cada pàgina, amb els recomptes de demos, problemes i exàmens al dia |
| `fonts_oficials.py` | Còpia dels PDF oficials: inventari, baixada i pujada a la release |
| `fonts_pau.py` | Text, cerca i imatges de les pàgines dels PDF oficials (per redactar problemes) |
| `previsualitza_figures.py` | Figures SVG d'un problema com a PNG, en tema clar i fosc |
| `rutes.py` | Rutes del projecte (`src/`, `dades/`, `fonts/`, `build/`, `dist/`) |

## Fonts

Els enunciats dels problemes de les PAU són els oficials de les PAU de Catalunya (Generalitat de Catalunya), reproduïts literalment d'acord amb les [condicions de reutilització de la informació del sector públic](https://web.gencat.cat/ca/avis-legal), i les figures són redibuixades. Les resolucions segueixen el mètode de les pautes de correcció oficials, explicat amb paraules pròpies. Cada problema enllaça a l'examen i a la pauta originals; la classificació per temes parteix de [examenselectivitat.cat](https://examenselectivitat.cat/selectivitat/F%C3%ADsica).

## Autor

Materials elaborats per [Nil Munté Guerrero](https://nil-munte.github.io).
