# Física · 2n de Batxillerat

Materials de repàs de Física de 2n de Batxillerat: teoria orientada a exercicis, demos interactives, exercicis graduats amb solució desplegable i problemes de les PAU de Catalunya.

Són pàgines HTML estàtiques (sense servidor ni compilació): es poden obrir directament al navegador o publicar amb GitHub Pages.

## Contingut

| Tema | Pàgina | PDF |
|---|---|---|
| Moviment harmònic simple | `temes/mhs/index.html` | formulari (1 pàgina), enunciats, enunciats + solucions |
| Exàmens de les PAU | `pau/index.html` | cada sèrie de cada convocatòria, sense solucions i amb els criteris de correcció |

## Estructura

```
.
├── index.html                 Pàgina d'inici amb la llista de temes
├── pau/
│   ├── index.html             Exàmens de les PAU per any, convocatòria i sèrie
│   └── pdf/                   Una sèrie per fitxer (generats amb eines/examens_pau.py)
├── temes/
│   └── mhs/
│       ├── index.html         Teoria, demos, mètode i exercicis
│       └── pdf/               PDF generats a partir de la pàgina
├── dades/
│   ├── temes.json             Mapa tema → pàgina dels problemes de les PAU
│   ├── README.md              Format dels problemes i normes de contingut
│   └── <tema>/*.json          Un fitxer per problema de les PAU
└── eines/
    ├── build_pdfs.py          Regenera els PDF d'un tema
    ├── genera_pau.py          Insereix els problemes de les PAU a les pàgines dels temes
    ├── comprova_pau.py        Comprova els problemes (estructura, càlculs i notació)
    ├── fonts_pau.py           Text i imatges dels PDF oficials (fonts/pdf/)
    ├── previsualitza_figures.py  Figures SVG d'un problema com a PNG
    ├── plantilles/            Estil i filtre del bloc de problemes de les PAU
    ├── examens_pau.py         Separa els exàmens oficials per sèries i genera pau/
    └── requirements.txt
```

## Publicar amb GitHub Pages

1. Puja el contingut d'aquesta carpeta a l'arrel del repositori.
2. Al repositori, ves a **Settings → Pages**.
3. A **Build and deployment**, tria **Deploy from a branch**, branca `main` i carpeta `/ (root)`.
4. Al cap d'un minut la web serà a `https://<usuari>.github.io/<repositori>/`.

El fitxer `.nojekyll` fa que GitHub serveixi els fitxers tal com són.

## Regenerar els PDF

Si modifiques els exercicis o el formulari d'un tema, regenera els PDF:

```bash
pip install -r eines/requirements.txt
python -m playwright install chromium
python eines/build_pdfs.py mhs "Moviment harmònic simple"
```

Els PDF surten de la mateixa pàgina amb els estils d'impressió: el formulari és la secció oculta `#formulari`, i els enunciats i les solucions són els exercicis.

## Exàmens de les PAU

Els PDF oficials (un per convocatòria, amb diverses sèries a dins) es desen a `fonts/pdf/`, que no es publica. Per regenerar la secció d'exàmens després d'afegir-ne de nous:

```bash
python eines/examens_pau.py
```

L'script separa cada sèrie (enunciat i enunciat + pauta), desa els fitxers a `pau/pdf/` i reescriu la llista de `pau/index.html` i el resum de la portada. Els problemes resolts al web s'enllacen des de la seva sèrie i, dins dels PDF, tenen una destinació just a sobre del títol del problema i de la seva pauta. Els enllaços es desen a `dades/destins_pau.json`. Després, `python eines/genera_pau.py` fa que cada problema dels temes obri el PDF propi just en aquest punt.

## Banc de problemes de les PAU

Cada problema és un JSON a `dades/<tema>/` (format i normes a [dades/README.md](dades/README.md)). `dades/temes.json` diu a quina pàgina va cada tema; els temes que encara no tenen pàgina hi són com a `null`.

```bash
python eines/comprova_pau.py     # estructura, càlculs (Python) contra la pauta i notació
python eines/genera_pau.py       # insereix els problemes a les pàgines que existeixen
```

El generador posa cada problema a la pàgina del seu tema principal (de més fàcil a més difícil, amb filtre per nivell) i un enllaç a les pàgines dels temes secundaris. Per als temes sense pàgina, diu quants problemes hi ha preparats. Quan s'afegeix la ruta d'una pàgina nova a `temes.json`, n'hi ha prou amb tornar a executar el generador i després `build_pdfs.py`.

## Fonts

Els enunciats dels problemes de les PAU són els oficials de les PAU de Catalunya (Generalitat de Catalunya), reproduïts literalment d'acord amb les [condicions de reutilització de la informació del sector públic](https://web.gencat.cat/ca/avis-legal), i les figures són redibuixades. Les resolucions segueixen el mètode de les pautes de correcció oficials, explicat amb paraules pròpies. Cada problema enllaça a l'examen i a la pauta originals; la classificació per temes parteix de [examenselectivitat.cat](https://examenselectivitat.cat/selectivitat/F%C3%ADsica).

## Autor

Materials elaborats per [Nil Munté Guerrero](https://nil-munte.github.io).
