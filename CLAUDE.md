# CLAUDE.md

Materials de repàs de Física de 2n de Batxillerat (Catalunya): pàgines per tema amb teoria, demos, exercicis i
problemes de les PAU. Web estàtic generat amb Python i publicat a GitHub Pages amb GitHub Actions.

## Idioma

Tot en català: missatges, commits, comentaris, textos del web i també les descripcions curtes de les ordres i dels
subagents, perquè l'usuari les veu.

## Estructura i regles d'or

- `src/` és el web tal com s'escriu. **No hi ha res generat** i mai no s'hi ha d'escriure res generat.
- `dades/` conté els problemes de les PAU (JSON), `temes.json` (mapa tema → pàgina) i `fonts_oficials.json`
  (inventari dels PDF oficials).
- `eines/` conté la construcció i les eines d'autoria. Les rutes surten totes de `eines/rutes.py`.
- `dist/`, `build/` i `fonts/` no es comiten. No editis mai `dist/`: es regenera sencer a cada construcció.
- **No comitis mai res generat**: ni HTML amb problemes inserits, ni PDF, ni el sitemap. Si un canvi només es veu a
  `dist/`, el que s'ha de canviar és la font (`src/`, `dades/`, `eines/plantilles/`) o l'eina que el genera.
- Les marques `<!-- PAU:inici -->`, `<!-- PAU-ENLLACOS:… -->`, `<!-- EXERCICIS:… -->` i `<!-- examens:… -->` de les
  pàgines de `src/` han de quedar buides: les omple la construcció.

## Construir i comprovar

```bash
python eines/build.py --rapid      # previsualització ràpida (sense PDF dels temes), ~8 s
python eines/build.py              # construcció completa, la mateixa que la CI
python -m http.server -d dist 8765 # previsualització a http://localhost:8765
python eines/comprova_pau.py       # després de tocar qualsevol JSON de dades/
```

- `build.py` té memòria cau (`build/memoria/`): els passos lents només es refan si n'han canviat les entrades.
  No cal (ni convé) executar els passos per separat ni forçar regeneracions; `--net` només si se sospita de la
  memòria cau.
- Abans de fer commit d'un canvi que afecti el web: `python eines/build.py` ha d'acabar amb «✓ Web construït» i
  0 enllaços trencats.
- Si el canvi només toca documentació (`*.md`), no cal construir: la CI tampoc no ho fa.
- Els PDF oficials: `python eines/fonts_oficials.py baixa` (de la release `fonts-oficials`). No es baixen mai de
  selecat ni de gencat a la construcció.

## Publicació

- Fer commit i `push` només quan l'usuari ho demani.
- A cada `push` a `main`, `.github/workflows/web.yml` comprova, construeix i publica. Després d'un push, segueix
  l'execució (`gh run list --workflow web.yml`, `gh run watch`) i comprova que acaba bé.
- No reescriguis la història ni facis `push --force` sense permís explícit.

## Problemes de les PAU

Les normes completes són a `dades/README.md`. Les essencials:

- **Enunciat literal** de l'examen oficial (només es retoca la tipografia), amb els **símbols originals**; si
  l'enunciat no en dona, els de la pauta.
- **Figures** redibuixades en SVG propi amb les variables de color del tema; mai imatges del PDF.
- **Resolució** pel mateix mètode, passos i resultats que la pauta, redactada amb paraules pròpies; sense pistes.
- Per apartat, el repartiment de punts de la pauta; càlculs comprovats en Python (`comprovacio` → `R`).
- Coma decimal, unitats del SI, valors substituïts a cada fórmula.
- Fitxer `dades/<tema>/<any>-<juny|setembre>-s<sèrie>-p<n>.json`, amb la lletra de l'opció (`…-p3b`) si l'opció A i
  la B d'una sèrie comparteixen número.
- Verifica-ho als PDF oficials (`eines/fonts_pau.py`): la classificació de webs externes de vegades és errònia.

## Temes nous

1. Crea `src/temes/<tema>/index.html` (amb la mateixa estructura que les pàgines existents i les marques buides).
2. Afegeix la ruta a `dades/temes.json`.
3. `python eines/build.py`: hi posarà els problemes que ja hi hagi preparats i en farà els PDF.
