# U2-ADR-143: Die Bereichsliste hat EINE Quelle, und ihr Schlüsselraum ist die ID

**Status:** Akzeptiert
**Datum:** 17.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Auftrag „Die Bereichsliste wird ein andockbares Register"
(17.08.2026, Fassung für den Baustrang), Züge 1 und 2; Messgrundlage A286, vor dem Bau gegen HEAD `dae7758`
neu erhoben (`tools/bereichs-ids-erheben.js`).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `SEKTOREN` (die Quelle), `_BEREICH_ALT_LABEL` +
  `_bereichZuSektorId` (der Rückweg für alte Einreichungen);
  `tools/build-bereiche.js` (erzeugt die abgeleiteten Listen), `bereiche/bereiche.json`
  (der erzeugte Transport), `tools/bereichslisten-pruefen.js` (W-16),
  `vivodepot-template-generator.html` — die erzeugte Region zwischen `BEREICHE:BEGIN`/`:END`.
- **ADR-Bezug:** U2-ADR-141 (Anzeigetexte andockbar — der Grund, warum eine Beschriftung kein
  Schlüssel mehr sein kann), U2-ADR-130 (`krisenvorsorge` als zwölfter Bereich — der Anlass),
  U2-ADR-041 (Reihenfolge; **offen**, s. u.), U2-ADR-040 (Signatur-Architektur — die Grenze,
  an der der Rückweg unverzichtbar wird), U2-ADR-051 (Registry-Anmeldemuster).
- **Status heute:** gilt — Beleg `tests/bereichsliste-eine-quelle.test.js` (10 Proben, davon
  drei Rot-Belege und eine Gegenprobe) und `tools/waechter-selbsttest.js` (`W-16`,
  `W-bereiche-drift`, beide rot⇄grün belegt).

---

## Der Befund

Die Liste der Vivodepot-Bereiche lag in **zwei Schlüsselräumen** und an **neun Orten**:

| Ort | Schlüsselraum | Einträge vor diesem ADR |
|---|---|---|
| `vivodepot.html` `SEKTOREN` | ID | 12 |
| `vivodepot-lesen.html` `SEKTOREN` | ID | 12, **andere Reihenfolge** |
| `vivodepot.html` `_BEREICH_SEKTOR` | Beschriftung | 12 |
| `vivodepot-template-generator.html` `BEREICHE` | Beschriftung | **11** |
| `bereich`-enum × 2 × drei Schema-Kopien | Beschriftung | **11** |

**Zwei Fehler waren die Folge, beide gemessen, keiner vermutet.**

**Erstens: der zwölfte Bereich kam nie an.** `krisenvorsorge` wurde am 10.08.2026 aufgenommen
(U2-ADR-130). Der Template-Generator und alle sechs `bereich`-enums blieben bei elf. **Sieben
Tage lang konnte keine Institution eine Vorlage für den zwölften Bereich einreichen**, und
niemandem fiel es auf — es gab nichts, was es hätte melden können.

**Zweitens: die Lese-App führte `wohnen` und `persoenliches` vertauscht.**
`tests/paritaet-kern-lese.test.js` prüft Felder, Typen, Unterfelder, Sensibel-Flags und
Beschriftungen — **aber nicht die Reihenfolge.** Der Fehler war damit unsichtbar für die
einzige Probe, die dafür zuständig schien.

**Und der Grund, warum eine Beschriftung kein Schlüssel mehr sein darf, ist neu:** seit
U2-ADR-141 kann ein Textsatz-Modul jeden Bereichsnamen ersetzen. Ein Vergleich gegen
„Gesundheit" prüft dann gegen einen Wert, den ein Modul verändert hat.

## Die Entscheidung

**1 · Der Kern ist die Quelle.** `SEKTOREN` in `vivodepot.html` trägt die Bereiche ohnehin mit
Sektionen und Feldern. Eine daneben liegende Bereichsdatei wäre die Kopie gewesen, gegen die
dieser Umbau gebaut ist.

**2 · Alles Übrige wird ERZEUGT.** `tools/build-bereiche.js` schreibt aus dem Kern:
`bereiche/bereiche.json` (Transport), die Region zwischen `BEREICHE:BEGIN`/`:END` im
Template-Generator und die sechs `bereich`-enums. `--check` meldet Drift und hängt im
`pre-commit` — Bauart wie `tools/build-code-listen.js`.

**3 · Der Schlüsselraum ist die ID.** Verglichen, geprüft und geschrieben wird ausschließlich
gegen `id`. Die Beschriftung reist daneben mit (`BEREICH_LABEL`) und ist **Anzeige, nie
Vergleich**.

**4 · Der Rückweg für Beschriftungen bleibt — und er ist keine Bequemlichkeit.**
`_BEREICH_ALT_LABEL` führt die elf historischen Beschriftungen auf ihre ID zurück, **nur beim
Lesen**. Der Grund ist hart: die vier eingebetteten Basis-Vorlagen tragen `"bereich":"Vorsorge"`
im **signierten** `templateJws`-Payload (`STANDARD_VORLAGEN`). Sie ließen sich nur mit einem
neuen Trust-Authority-Schlüssel neu signieren — und der wechselt in einer Zeremonie, nicht
nebenbei (A285). **Ohne diesen Rückweg wären die vier amtlichen Vorlagen unlesbar geworden.**

**5 · Die Tabelle wächst nicht mehr.** Ein neuer Bereich braucht dort keinen Eintrag, weil
`_bereichZuSektorId` **zuerst** gegen `SEKTOR_BY_ID` prüft. Genau diese Nachpflege-Zeile war
der Mechanismus, der sieben Tage lang fehlte.

**6 · Der Wächter prüft die Gegenrichtung.** Nicht „eine Kopie weicht ab" — nach diesem Umbau
gäbe es dafür nichts zu vergleichen, und die Probe liefe über eine leere Menge grün (A279).
Sondern: **rot, wenn irgendwo eine ZWEITE Bereichsliste entsteht**, mit Vorbedingungs-Probe.

## Die Begründung des Erkennungskriteriums

Der Wächter erkennt eine Bereichsliste **strukturell, nicht namentlich**: eine Aufzählung, die
mindestens sechs Bereiche enthält **und überwiegend aus Bereichsnamen besteht**.

**Die zweite Bedingung ist der eigentliche Bau.** Mit der ersten allein meldete der Lauf 26
Treffer, von denen 17 keine Bereichslisten waren, sondern **Registries, deren Zeilen eine
`sektorId` tragen** — `SITUATIONEN`, `WIZARDS`, `B16_FELD_MAPPING`, `EXPORT_FORMATE`. Das ist
genau die Klasse, die der Auftrag ausdrücklich stehen lässt (die 566 Daten-Stellen), und ein
Wächter, der sie meldet, wäre nach dem dritten Lauf abgeschaltet worden.

**Und namentlich zu suchen hätte nicht getragen:** `_BEREICH_SEKTOR` war eine vollwertige
Bereichsliste und hieß weder `SEKTOREN` noch `BEREICHE`. Wer eine neue baut, nennt sie anders.

## Was ausdrücklich OFFEN bleibt

**Die Bereichs-REIHENFOLGE ist nicht entschieden, und dieser ADR entscheidet sie nicht.**

`U2-ADR-041` („Persönliches immer zuletzt") ist durch `U2-ADR-130` **nicht abgelöst** —
130 nennt 041 nur als inhaltlichen Präzedenzfall. Nach dem Wortlaut von 041 erfüllt heute
**keine** der beiden Anwendungen die Festlegung, seit `krisenvorsorge` hinter `persoenliches`
steht.

**Der Auftrag sagt für diesen Fall: melden, die Reihenfolge unverändert lassen, weiterbauen.**
Also gilt: der Kern behält seine heutige Reihenfolge, **die Lese-App wird ihr angeglichen** —
das behebt den Vertauschungs-Fehler, ohne zwischen 041 und 130 zu wählen. **Die Wahl ist eine Produktentscheidung.**
Sie hat zwei Formen: 041 gilt weiter (dann rückt `persoenliches` ans Ende, auch im
Kern), oder 041 wird ausdrücklich abgelöst (dann gehört der Vermerk in 041).

## Konsequenzen

**Das Einreich-Schema ist eine geänderte Schnittstelle.** Eine Einreichung mit deutscher
Beschriftung ist gegen das neue `bereich`-enum **nicht mehr schema-konform**. Der Weg für
Bestände: durch den Template-Generator laden — `normBereich` führt die Beschriftung zurück —
und neu ausgeben. **Der Kern selbst validiert nie gegen dieses Schema** (gemessen: kein einziger
Aufruf), darum sind die signierten Basis-Vorlagen davon nicht betroffen.

**Ein neuer Bereich kostet ab jetzt einen Lauf**, nicht neun Nachpflegen: `SEKTOREN` ergänzen,
`node tools/build-bereiche.js`, fertig. Der `pre-commit` meldet, wenn der Lauf vergessen wurde.

**Die Fremdschlüssel-Prüfung für `data.feldDefinitionen[].sektorId` ist NICHT Gegenstand dieses
ADR** — sie gehört zu Zug 4 und ist dort gemessen (drei Stellen: `vivodepot.html:16479`,
`:17266`, `vivodepot-lesen.html:3582`).

## Cross-Referenz

`tools/build-bereiche.js` · `tools/bereichslisten-pruefen.js` (W-16) ·
`tools/bereichs-ids-erheben.js` · `bereiche/bereiche.json` ·
`tests/bereichsliste-eine-quelle.test.js` · `hooks/pre-commit` (zwei neue Gates) ·
`tools/waechter-register.js` (`W-16-zweite-bereichsliste`, `W-bereiche-drift`,
`W-worktree-geteilt`).
