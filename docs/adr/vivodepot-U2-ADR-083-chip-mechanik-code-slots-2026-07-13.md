# U2-ADR-083 — Chip-Mechanik für Code-Slot-Felder (E1 Option C)

**Status:** Gilt (bereinigt 25.09.2026)
**Typ:** Feature-Entscheidung (Datenmodell + UI-Mechanismus) — **Schema-Bump 37 → 38**
**Bezug:** Datenmodell-Gesamtkonzept v1.1 (04.07.2026, §2 Feldmodell-Regel „Code-Slot"), U2-ADR-065
(Personen-Widget/refMehrfach-Konvention), interner Durchlauf-Befund vom 13.07.2026 (Muster J/K — die
gefundenen Fälle sind im folgenden Abschnitt wörtlich wiedergegeben)
**Status heute:** gilt — die Kopfzeile „Entwurf · nicht committet" ist überholt: der Chip-Mechanismus
wurde am 13.07.2026 doch committet (`70e9318`, „Chip-Mechanik für Code-Slot-Felder — E1 Option C,
Schema 38") und ist im heutigen Kern aktiv (`vivodepot.html`: `chipAusEingabe`, `chipListeMitNeuem`,
`_codeEintraege`, `_chipFelderVerdrahten`; die drei Felder `allergien`/`medikamente`/`krankheiten`
tragen weiterhin `codeListe`), Beleg `tests/chip-mechanik.test.js`.

## Der Befund, der diesen Bau auslöst

Getippt am 13.07.: „Allergie gegen Penicillin, Hasel" / „Ampicillin, Peni" (mitten im Wort
abgebrochen) / „B" (Diagnose, Vorschlag nicht abgewartet). Der IPS-Export daraus: zwei
`AllergyIntolerance`-Ressourcen mit `code.text: "Allergie gegen Penicillin"` und `"Hasel"`, ein
`MedicationStatement` mit `medicationCodeableConcept.text: "Peni"`, eine `Condition` mit
`code.text: "B"` — **kein einziges `coding`**. Zwei Ursachen, die zusammengehören:

1. **Der Code-Slot war ein totes Metadatum.** Die Datalist zeigte Vorschläge (`codeWertAus`), aber
   nichts erzwang eine Bestätigung — das Feld nahm den rohen Autocomplete-Wert beim Speichern.
2. **Der Generator splittete am Komma** (`_ipsItems`/`_codeEintraege`), um aus einem Freitextfeld
   mehrere IPS-Ressourcen zu machen. Das produzierte falsche Artefakte: „Allergie gegen Penicillin"
   ist als Codetext ein Satz, kein Allergen; ein halbgetipptes „Peni" wurde zu einem eigenständigen
   Medikament im offiziellen Bundle.

## Entscheidung — Mechanismus in die Basis, Terminologie-Listen per Template

**In die Basis gehört der Mechanismus, nicht die Liste.** Chip-Input, Code-Slot (Chip-Array statt
Skalar) und ein Generator, der ein `coding` schreibt — *wenn eines da ist*. Ohne Terminologie-Template
sind die Chips Freitext-Chips, und das genügt: „Peni", „B" und „keine" verschwinden trotzdem, weil
sie nie bestätigt werden.

**Terminologie-Listen (SNOMED/ATC/ICD-10-GM) bleiben unangetastet.** Dieser Auftrag erweitert sie
nicht, verschiebt sie nicht, baut keinen Andockpunkt für ein künftiges Template. Die drei Seed-Listen
aus den `@vd-codeliste`-Blöcken bleiben, was sie waren. Die Lizenzfrage (SNOMED-Reichweite) und die
Ausstellerfrage (wer signiert ein Terminologie-Template) sind eigene, offene Fragen (E1-c) — sie
blockieren diesen Bau nicht, weil er keine Liste anfasst.

### Der Mechanismus — dieselbe Konvention wie das Personen-Widget

Tippen zeigt Vorschläge aus der Datalist. **Tippen legt nie an.** Ein Vorschlag antippen → Chip mit
Text **und** Code. Eigenen Text tippen und Enter/Übernehmen-Haken → Chip mit Text, ohne Code.
**Blur ohne Bestätigung legt nichts an** — unbestätigter Text verschwindet spurlos. Jeder Chip ist
einzeln entfernbar. Dedup case-insensitiv/getrimmt.

**Das Komma ist im Chip-Text ein gewöhnliches Zeichen.** Wer „Allergie gegen Penicillin, Hasel"
tippt und bestätigt, bekommt **einen** Chip mit diesem Text — kein Splitten. Das ist der Preis für
Ehrlichkeit: Die App tut nicht mehr so, als hätte sie zwei Allergien verstanden.

### Das Datenmodell

```
{ text: "Ampicillin", code: { system: "http://www.whocc.no/atc", code: "J01CA01" } }   // bestätigt aus Liste
{ text: "Hausstaub" }                                                                  // freier Chip, kein Code
```

Betroffene Felder: `gesundheit.allergien` (`snomedAllergen`), `gesundheit.medikamente` (`atc`),
`gesundheit.krankheiten` (`icd10`) — die drei einzigen `codeListe`-Felder im Modell.

### Der Generator

```
Chip mit Code    →  coding: [{ system, code }], text: "..."
Chip ohne Code   →  text: "..."                    (kein coding)
Kein Chip        →  Sektion bleibt leer (emptyReason, unverändert)
```

`_codeEintraege` (vormals: splittete Freitext an `,;\n` über `_ipsItems`) liest jetzt direkt den
Chip-Array — `_ipsItems` ist ersatzlos entfernt, ihr einziger Aufrufer war `_codeEintraege`.

### Geteilte Helfer-Schicht mit dem Personen-Widget — keine 1:1-Wiederverwendung

Die Bestätigungs-Logik (nie bei Tippen/Blur anlegen, Dedup case-insensitiv/getrimmt) ist identisch
zum Personen-Widget (`_refMehrfachVerdrahten`). Die **Container-Form** ist unterschiedlich: `refm`
ist eine Liste von Zeilen (je ein Wert + Auf/Ab/Weg), der Chip-Input ist eine Wolke aus einem
Eingabefeld (tippen → bestätigen → Chip erscheint → Feld leert sich). Deshalb keine 1:1-Wiederverwendung
der Zeilen-Komponente — `_chipFelderVerdrahten` ist eine eigene, parallele Funktion mit denselben
Prinzipien, nicht dieselbe Funktion.

## Der Speicherpfad-Gate (Muster K, an dieser Stelle)

`bearbeitungSpeichern` war und ist kein einzelner Block, sondern ein Dispatcher über DOM-Attribut-
Typen (`[data-edit]`, `[data-edit-ref]`, vormals `[data-edit-code]`, `[data-edit-multi]`, `[data-refm]`).
Der Chip-Mechanismus fügt `[data-chip-liste]` hinzu: `bearbeitungSpeichern` liest die im DOM
**bestätigten** Chips (`.chip[data-chip]`), nie den Wert des Eingabefelds. Der Bestätigungsschritt
selbst *ist* der Gate — kein Aufruf von `feldValidieren` nötig, dasselbe Muster wie beim
Personen-Widget. `[data-edit-code]` entfällt (durch `[data-chip-liste]` ersetzt) für die drei
betroffenen Felder; `[data-edit]` und die allgemeine Frage, ob Freitextfelder je einen Gate
brauchen, bleiben unberührt (E1-d, größerer Befund, nicht Teil dieses Bau).

**Offene Prüflücke — bewusst benannt, kein Blocker:** `_chipFelderVerdrahten` (die Verdrahtung, die
den Gate im Browser tatsächlich trägt — Tippen/Enter/Blur/Übernehmen-Haken) ist **nicht am DOM
getestet**. Der schlanke DOM-Stub in `tests/load-kern.js` simuliert `querySelectorAll`/`appendChild`
nicht ehrlich (liefert immer `[]` bzw. hängt nichts real ein) — ein DOM-getriebener Test hätte nur
sich selbst bewiesen, nicht den Code. `tests/chip-mechanik.test.js` prüft deshalb ausschließlich die
Function-Ebene (`chipAusEingabe`, `chipListeMitNeuem`, `_codeEintraege`, `feldValidieren`,
Migration) — **nicht** die tatsächliche Browser-Verdrahtung. Der Chip-Gate ist damit logisch
geprüft, nicht am Gerät. Die anstehende On-Device-Verifikation muss ausdrücklich abdecken: Tippen
legt nicht an, Enter/Haken bestätigt sichtbar, Blur ohne Bestätigung verwirft, Chip-Entfernen
funktioniert, Dedup wirkt.

**Genau diese Lücke hat einen echten Bug verdeckt (Geräte-Befund 14.07., noch am selben Tag
gefixt):** Ein Bereich mit ausschließlich Chip-Werten (Gesundheit: nur Diagnosen/Medikamente
gefüllt) erschien nicht in „Woraus herausgeben?" — obwohl die Chips im DOM sichtbar Text und Code
trugen. Ursache **nicht** `feldEingetragen`/`sektorHatDaten` (die behandeln Arrays bereits korrekt,
per Node-Test am synthetischen Depot bestätigt), sondern die Speicherpfad-Verdrahtung selbst: der
delegierte Autosave-Höhrer `_autoSaveWennFeld` (Blur/Change auf `#content`, faltet offene Edits in
`data`) kannte nur `data-edit`/`data-edit-ref`/`data-edit-override`/das inzwischen tote
`data-edit-code` — nicht die neuen Chip-Elemente. Chip bestätigen (Enter/Haken hält bewusst den
Fokus) und Chip entfernen (×) lösten daher NIE einen Fold nach `data` aus; nur einer der ~13
expliziten Navigations-Fold-Aufrufe (`oeffneSektor`, `geheZuNotfall`, `oeffnePrueftermine`, …) tat
das noch. `flowHerausgebenZentral()` (die zentrale „Woraus herausgeben?"-Tür aus der Sidebar) ist
aber gerade KEIN Navigations-Wechsel und hatte als einzige vergleichbare Stelle im ganzen Baum
keinen solchen Fold-Aufruf — bestätigte Chips blieben sichtbar im DOM, aber unsichtbar für `data`,
solange die Sektor-Seite nicht verlassen wurde.

Fix (`vivodepot.html`, v62): (1) `_chipFelderVerdrahten` meldet Chip-Hinzufügen/-Entfernen jetzt per
bubbelndem `change`-Event auf dem Feld-Container — dieselbe Konvention wie
`_refMehrfachVerdrahten`/`melden()` beim Personen-Widget; (2) `_autoSaveWennFeld` erkennt
`data-chip-eingabe` (Blur-Pfad) und `data-chip-liste` (das gemeldete `change`) und verliert das tote
`data-edit-code`; (3) `flowHerausgebenZentral()` faltet zusätzlich explizit vor dem Lesen
(U2-ADR-011-Konvention), redundant zu (1)/(2), aber konsistent mit den anderen ~13 Stellen im Code,
die genau das schon taten. Alle drei Fixe sind — wie die Chip-Verdrahtung selbst — nicht ehrlich am
DOM-Stub testbar; die On-Device-Nachprüfung muss zusätzlich abdecken: Chip anlegen → sofort (ohne
Bereich zu verlassen) „Weitergeben" öffnen → Bereich erscheint; Chip entfernen → sofort exportieren →
entfernter Chip fehlt im Export.

## Migration (Schema 37 → 38)

Bestehende Werte werden **verlustfrei zu genau einem Chip** — kein Auto-Splitting bei der Migration:

| Alt (Schema ≤ 37) | Neu (Schema 38) |
|---|---|
| `"Allergie gegen Penicillin, Hasel"` (Freitext-Skalar) | `[{ text: "Allergie gegen Penicillin, Hasel" }]` |
| `{ code, system, anzeigeName }` (codierter Einzelwert, Paket 3) | `[{ text: anzeigeName, code: { system, code } }]` |
| `""` / `undefined` | Feld entfällt (unverändert zu vorher) |
| bereits Array (erneuter Lauf) | unangetastet (idempotent) |

## ADR-Supersede

Diese Entscheidung setzt voraus, dass „Multi-Entry (`liste`) ist keine Basis-Form" (Datenmodell v1.1,
04.07.2026, §2) für Code-Slot-Chips **nicht** gilt — Chips *sind* Multi-Entry. Das wird in einem
eigenen ADR-Entwurf (U2-ADR-084) datiert und explizit abgelöst, nicht umgedeutet.

## Was ausdrücklich nicht Teil dieses Baus ist

- Keine Terminologie-Liste, kein neuer Code, kein Andockpunkt für ein Template.
- `bearbeitungSpeichern` wird nicht generell umgebaut — nur der neue `[data-chip-liste]`-Zweig kommt
  hinzu. Die Freitextfelder (`[data-edit]`) bleiben, wie sie waren.
- Kein ref-Widget-Umbau (E2, eigener Auftrag).

## Tests

Neu: `tests/chip-mechanik.test.js` (10 Tests) — `chipAusEingabe`/`chipListeMitNeuem` (Bestätigung +
Dedup), `_codeEintraege` (kein Kommasplitten, Regressionsschutz für „Peni"/„Allergie gegen
Penicillin, Hasel"), `feldEingetragen`/`feldValidieren` (Chip-Array), `feldWertHTML`/`feldWertText`
(Anzeige), `fhirIpsBundle` (coding bei Code-Chip, text-only bei Freitext-Chip, kein Split),
Migration 37→38 (Freitext, codiert, leer, idempotent), Terminologie-Listen unangetastet.

Umgeschrieben (Skalar → Chip-Array, kein Verhaltensverlust): `tests/code-listen.test.js` (T-A-03,
T-A-04), `tests/wizard-anamwiz.test.js` (Test 2, 3), `tests/situationen-maschine.test.js`
(„Blatt Arzt"), `tests/fhir-ips.test.js` (drei Stellen), `tests/import-formate.test.js` (Test 11),
`tests/vorlesen-sprachausgabe.test.js`, `tests/schema-25-migration.test.js` (Assertion auf
Chip-Array statt Einzelobjekt).

Schema-Versions-Pins (mechanisch 37→38 nachgezogen, kein Verhaltensverlust): 16 Testdateien.

**Echter Zusatzbefund während des Umbaus — der wertvollste Teil dieses Baus:** Der FHIR-IPS-
**Reimport** (`_fhirIpsFelder`) fügte mehrere Ressourcen bislang zu einem einzigen, kommagetrennten
String zusammen (`werte.join(', ')`) — **Kommasplitten in Gegenrichtung.** Wer ein IPS einer
Institution einlas, bekam aus drei sauber codierten `AllergyIntolerance`-Ressourcen einen Text
„X, Y, Z" — Codes weg, Struktur weg. Der Export-Befund vom 13.07. war bekannt; der Import-Befund war
derselbe Fehler, spiegelverkehrt, und stand in keiner Stufe-1-Analyse. Korrigiert: jede Ressource
wird jetzt symmetrisch zum Export ein eigener Chip.

**Muster, nicht Einzelfix:** Wo eine Export-Seite mehrere Werte plattmacht (hier: Kommasplitten zu
Freitext), macht die spiegelbildliche Import-Seite oft dieselbe Vereinfachung — nur in
Gegenrichtung, und deshalb bei einer reinen Export-Analyse unsichtbar. Bei jeder künftigen
Export-Bereinigung gehört der Symmetrie-Check zum Stufe-1-Katalog: „Gibt es einen Reimport-Pfad für
dieses Format, und tut er spiegelbildlich, was der Export tat?"

## Gates

Suite 1389/0 (vorher 1379/0, +10). OSV CLEAN. Schema 37→38. sw.js CACHE + SCHALEN_STAND v60→v61
(Lockstep, Shell-Bytes geändert). Kein Push (eine Produktentscheidung).

**Nachtrag 14.07. (Speicherpfad-Fix, s. o.):** Suite weiterhin 1389/0 (kein neuer Test möglich, s.
DOM-Stub-Limitation oben). sw.js CACHE + SCHALEN_STAND v61→v62 (Lockstep). Kein Schema-Bump (reine
Verdrahtungs-Korrektur, kein Datenmodell-Wechsel). Kein Push (eine Produktentscheidung).
