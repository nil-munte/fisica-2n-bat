# Física · 2n de Batxillerat

Materials de repàs de Física de 2n de Batxillerat: teoria orientada a exercicis, demos interactives, exercicis graduats amb solució desplegable i problemes de les PAU de Catalunya.

Són pàgines HTML estàtiques (sense servidor ni compilació): es poden obrir directament al navegador o publicar amb GitHub Pages.

## Contingut

| Tema | Pàgina | PDF |
|---|---|---|
| Moviment harmònic simple | `temes/mhs/index.html` | formulari (1 pàgina), enunciats, enunciats + solucions |

## Estructura

```
.
├── index.html                 Pàgina d'inici amb la llista de temes
├── temes/
│   └── mhs/
│       ├── index.html         Teoria, demos, mètode i exercicis
│       └── pdf/               PDF generats a partir de la pàgina
└── eines/
    ├── build_pdfs.py          Regenera els PDF d'un tema
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

## Fonts

Els enunciats dels problemes de les PAU estan adaptats a partir dels exàmens oficials de les PAU de Catalunya. Cada problema enllaça a l'enunciat original a [examenselectivitat.cat](https://examenselectivitat.cat/selectivitat/F%C3%ADsica). Les solucions són pròpies.

## Autor

Materials elaborats per [Nil Munté Guerrero](https://nil-munte.github.io).
