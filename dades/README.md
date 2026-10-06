# Banc de problemes de les PAU

Cada problema de les PAU de Física és un JSON a `dades/<tema>/<any>-<juny|setembre>-s<sèrie>-p<n>.json`.
El mapa de temes i pàgines és a `temes.json`. Exemple complet: `mhs-ones-so/2014-juny-s4-p5.json`.

## Flux de treball

```bash
python eines/fonts_pau.py cerca pau_fisi14jl "màquina de cosir"   # pàgina de l'enunciat
python eines/fonts_pau.py png pau_fisi14jp 7                      # mirar la pauta o una figura
python eines/comprova_pau.py dades/mhs-ones-so/2014-juny-s4-p5.json
python eines/previsualitza_figures.py dades/mhs-ones-so/2014-juny-s4-p5.json
python eines/genera_pau.py                                        # insereix-ho a les pàgines
```

Els PDF oficials són a `fonts/pdf/` (no es publiquen). `pau_fisiAAjl` és l'examen de juny,
`pau_fisiAAjp` (o `jt`) la pauta de correcció; `sl`/`sp` (o `st`) els de setembre.

## Normes de contingut

- **Enunciat** idèntic al de l'examen oficial: transcripció literal (mateixes paraules, dades,
  símbols i puntuacions). Només es retoca la tipografia: paraules partides a final de línia,
  «l·l», superíndexs i subíndexs. La Generalitat en permet la reutilització sense alterar-ne el
  contingut i citant-ne la font (la pàgina ho indica i cada problema enllaça a l'examen).
- **Figures** redibuixades en SVG propi: mateix muntatge, mateixes dades, mateixes quadrícules i
  escales. Mai una imatge retallada del PDF.
- **Resolució** amb el mateix mètode, els mateixos passos i els mateixos resultats que la pauta,
  però redactada amb paraules pròpies (cap frase copiada de la pauta).
- **Pauta**: per a cada apartat, quins passos puntua i quant, amb paraules pròpies.
- **Notació**: els símbols exactament com els fa servir l'examen, també als problemes de MHS
  (si l'enunciat escriu y per a la posició, es manté y). Si l'enunciat no dona símbol a una
  magnitud, el de la pauta. Sempre: coma decimal; unitats del SI; valors substituïts a cada
  fórmula. Multiplicació amb «·», potències amb `10<sup>n</sup>`, magnituds en cursiva
  (`<i>x</i>`), resultats en `<span class="res">…</span>`.

## Camps

| Camp | Contingut |
|---|---|
| `id` | igual que el nom del fitxer: `2014-juny-s4-p5` |
| `any`, `convocatoria`, `serie`, `problema`, `opcio` | `2014`, `"juny"`, `4`, `"P5"`, `"A"` (o `null`). Des del 2025, `"P3"` vol dir *Exercici 3* |
| `tambe_a` | altres sèries on va sortir el mateix problema: `[{"serie": 4, "problema": "P4", "opcio": "B"}]` |
| `tema_principal`, `subtema` | clau de `temes.json` i, si el tema té subtemes, el subtema (`"mhs"`, `"ones"`, `"so"`) |
| `temes_secundaris` | claus de tema (`"gravitatori"`) o `"tema/subtema"` (`"mhs-ones-so/so"`) |
| `blocs` | blocs de teoria de la pàgina principal relacionats (`["b1", "b3"]`) |
| `dificultat`, `dificultat_motiu` | de 1 a 10, i per què. 1–3 ★ bàsic · 4–6 ★★ intermedi · 7–10 ★★★ avançat |
| `titol` | títol curt propi |
| `fonts` | `enunciat` i `pauta`: `url` (selecat `view.php?p=…` o PDF de universitats.gencat.cat), `pdf` (nom a `fonts/pdf/`), `pagina`; `classificacio` (examenselectivitat) |
| `dades` | dades numèriques de l'enunciat: `simbol`, `valor` (text, coma decimal), `unitat`, `descripcio` |
| `puntuacio` | `total`, `apartats_a_l_enunciat` (si l'enunciat diu els punts de cada apartat), `nota` |
| `enunciat` | `intro` (HTML), `figures` (ids), `apartats` (`id`, `punts`, `text`, `figures`), `dades_text` |
| `figures` | `{"fig1": {"svg": "<svg …>", "peu": "…"}}` |
| `resolucio` | per apartat: `passos` (`titol`, `html`, `figures`) i `pauta` (`punts`, `que`) |
| `resultats` | `apartat`, `clau`, `text`, `valor` (el nostre, SI), `pauta` (el de la pauta, o `null`), `tol` (opcional) |
| `comprovacio` | línies de Python que calculen els resultats i els deixen al diccionari `R` |
| `verificacio` | l'omple `comprova_pau.py`; les notes per revisar a mà van a `notes_manuals` |

## Figures SVG

- `<svg viewBox="0 0 W H" role="img" aria-label="…">`, sense `width`/`height` fixos.
- Colors només amb variables del tema perquè funcionin en clar i fosc: `var(--ink)` (traç i text
  principal), `var(--muted)` (eixos i rètols secundaris), `var(--grid)`/`var(--grid2)`
  (quadrícula), `var(--surface)` (farciments), `var(--x)` blau, `var(--y)` taronja, `var(--f)`
  violeta, `var(--ec)` verd, `var(--ep)` ocre.
- Text: `font-family="var(--f-body)"` (o `var(--f-mono)` per a xifres d'eixos), 11–14 unitats.
- Gràfiques: la mateixa quadrícula, el mateix rang i les mateixes marques que l'original.
