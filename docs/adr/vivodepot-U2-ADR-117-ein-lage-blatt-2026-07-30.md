# U2-ADR-117: Ein Blatt für die Lebenslagen — Bereichsfelder an Ort und Stelle editierbar

**Status:** Angenommen
**Datum:** 30.07.2026
**Kategorie:** ARCHITEKTUR, RENDER, DATENFLUSS
**Linie:** U2
**U2-Bezug:** U2-ADR-012 (Situationsblatt — die Sicht, die hier verallgemeinert wird) · A62
(die Verdrahtung ist aus `renderSektor` herausgelöst und container-gebunden — Grundlage der
Wiederverwendung) · U2-ADR-104/A43/A56 (die Typ-Wächter, die der Schreibweg trägt) · U2-ADR-116
(C10 — dieselbe „ein Wert, seine Heimat"-Linie)
**Anker:** Fixlisten-Posten A58 (das Blatt) · A68 (der Schreibweg) · A50 (der Einstieg) ·
Werkzeug `tools/ausfuehrer-schreibweg-messen.js` (die A68-Messung, die den Streufehler zählte)
**Status heute:** gilt — `_faltContainer`, `_lageBlattSpeichern` und `lebenslageAlsBlatt` stehen
unverändert in `vivodepot.html`, die Rotmachbarkeits-Probe `tests/e2e/12-lage-blatt-schreibweg.spec.js`
existiert weiter (gemessen 15.08.2026).

---

## Kontext

Der Lebenslagen-Katalog (`BAUSTEINE`, seit T5 im Kern) ist bis heute reine **Prüfschicht**: 23
Lagen, jede eine Menge von Bereichsfeld-Pfaden, gemessen aber nirgends in der Oberfläche
erreichbar (A61: `grep -ci lebenslage` = 1, ein Kommentar). A50 hatte den Befund konkret gemacht:
die Lage `eigene-vorsorge` hat **0 von 7** Feldern geführt — kein Assistent schreibt in eines
ihrer sieben Felder. A58 hat gemessen, dass das **kein Einzelfall** ist: 18 von 23 Lagen haben
null geführte Deckung.

Der Grundsatz dazu (29.07.2026): **keine Sonderbauten, sondern ein Mechanismus.** Eine neue
Lage soll ein Katalog-Eintrag sein, kein Bau. Der Ausführer liest den Katalog, er hat keine
hartcodierten Lagen.

Die **Ansichts-Hälfte** blieb bewusst offen (A62), weil `renderSektor`s Verdrahtung inline lag:
ein Ausführer, der nur die Felder rendert, ließe sie tot. A62 hat die Verdrahtung
herausgelöst und **container-gebunden** gemacht. Damit war der Weg frei — und die offene Frage
war der **Schreibweg** (A68).

**A68, gemessen ⟦M⟧** (`tools/ausfuehrer-schreibweg-messen.js`): `bearbeitungSpeichern` faltet
alle Eingaben des `#content` in **EINEN** Ziel-Namensraum (die aktive Situation oder den aktiven
Sektor). Eine Lebenslage ist aber nicht an einen Bereich gebunden: **8 von 23 Lagen streuen über
bis zu drei Bereiche**, mindestens **16 schreibende Felder** lägen in einem Bereich, der beim
Speichern nicht gewinnt — sie würden **Streu-Kopien** im falschen Bereich. Das ist dieselbe
Klasse wie der Wizard-1b-Fix (22.07.2026), ohne Schritte.

## Entscheidung

**EIN Blatt, ein Heim pro Datum** (Entscheidung 30.07.2026).

1. **Ein Heim pro Datum, nicht verhandelbar.** Lebenslage-Felder werden in ihren HEIMAT-Bereich
   (`data.sektoren[sektor][feld]`) geschrieben — nie in einen eigenen Topf (kein
   `data.lebenslagen`, kein Situations-Namensraum für Bereichsfelder). **Kein neues Schema, keine
   Migration.**

2. **Ein Zweck-Blatt, kein zweiter Ansichts-Modus.** `renderSituation` wird verallgemeinert und
   trägt eine **dritte Eintragsart**: ein editierbares Bereichsfeld, gerendert wie im Sektor
   (`feldZeileHTML` mit dem Heimat-Bereich als `sektorId`), an Ort und Stelle bearbeitbar. Die
   Lebenslagen kommen aus dem vorhandenen Katalog (`BAUSTEINE` / `lebenslageFelder`), nicht aus
   einer neuen Liste.

3. **Ein Block je Heimat-Bereich.** `lebenslageAlsBlatt(lageId)` gruppiert die (sichtbaren,
   auflösbaren) Lage-Felder je Heimat-Bereich in einen Block, der seinen Bereich als
   `data-lage-sektor` trägt. Daran hängt beides:
   - **Verdrahtung:** je Block ein Aufruf von `verdrahteSektorAktionen`/`verdrahteSektorEingaben`
     mit dem Bereich des Blocks. Weil diese Funktionen seit A62 container-gebunden sind,
     verdrahtet jeder Block genau die Felder seines Bereichs — Sensibel-Knopf, Ref-Picker,
     Listen-Editor, refMehrfach, Chips, alle an den richtigen Heimat-Bereich.
   - **Schreibweg (A68):** `_lageBlattSpeichern` faltet jeden Block einzeln über `_faltContainer`
     in SEINEN Bereich. `_faltContainer` ist aus `bearbeitungSpeichern` herausgelöst (reine
     Verschiebung, Aufnahme byte-gleich) — der Sektor-/Situations-Fold ruft ihn unverändert mit
     dem ganzen `#content`, das Lage-Blatt einmal je Block.

4. **Gates sind Pflicht.** `feldSichtbar` wird je Feld ausgewertet (35 der 36 Unterfelder von
   `vorsorge_instrumente` sind gegatet). Listenfelder self-routen über `listenEintrag*()` an ihren
   Bereich — außerhalb des flachen Falt-Wegs, unangetastet.

## Der Zuschnitt, gemessen statt angenommen ⟦M⟧

Vorgeschlagen war ein **Stempel je Eingabe** (`data-heim`), den der Fold liest. Die Messung ergab
einen einfacheren, gleich korrekten Zuschnitt: **ein Container je Bereich** ist die Routing-Einheit.
Er braucht keinen Stempel auf jeder Eingabe, lässt die A62-Verdrahtung **unverändert**
mitbenutzen und hält die bestehenden Renderpfade **byte-identisch** (kein neues Attribut an
Sektor- oder Situationsfeldern — die Render-Aufnahmen bleiben unberührt).

Zwei Voraussetzungen tragen den Zuschnitt, beide gemessen:
- **Nur EINE der 15 verdrahtungstragenden Lagen streut über zwei Bereiche** (`ausst-pflegekasse-dienst`);
  `eigene-vorsorge`/A50 ist einsektorig verdrahtet. Der Multi-Bereich-Fall ist über die
  Block-je-Bereich-Struktur trotzdem korrekt (jeder Block trägt seinen Bereich), aber er hat
  heute keinen Einstieg — er wird erst erreichbar, wenn diese Lage eine Kachel bekommt.
- **Keine Lage trägt Listenfelder in mehr als einem Bereich** — die Listen-Verdrahtung je Block
  ist damit eindeutig.

## Rotmachbarkeit (Regel 18)

`tests/e2e/12-lage-blatt-schreibweg.spec.js` beweist am echten DOM: in der 3-Bereich-Lage
`pflegebeduerftigkeit` landet jedes Feld in seinem Heimat-Bereich, keine Streu-Kopie im aktiven.
Die gepflanzte Verletzung (auf einer Kopie, nie im Arbeitsbaum): die Routing-Weiche in
`bearbeitungSpeichern` entfernt → der Fold fällt auf den aktiven Bereich zurück → die Heimaten
bleiben leer, der Wert landet im aktiven Bereich. Der exakte A68-Streufehler, und die Prüfung
fängt ihn.

## Konsequenzen

- **Eine neue Lage ist ein Katalog-Eintrag, kein Bau** — die Zusage aus A58 trägt jetzt auch die
  Ansicht, nicht nur die Prüfschicht.
- **Der Ausführer ist kein neuer Modus.** Er läuft durch `renderSituation`; das Situationsblatt
  (eigene Felder → `data.situationen`, Lese-Refs → lesend) bleibt unberührt.
- **A50** (Einstieg `eigene-vorsorge`) ist die erste Kachel, die auf den Ausführer zielt — eine
  zwölfte Anlass-Kachel mit `ziel: { lage: … }`, kein eigener Assistent (folgt U2-ADR-115, der
  elften Kachel).
- **Wenn ein Zwang auftauchte, der doch ein zweites Blatt verlangte**, wäre er als Fund
  festgehalten worden — „ein Blatt" ist die Produktentscheidung. Es tauchte keiner auf.
