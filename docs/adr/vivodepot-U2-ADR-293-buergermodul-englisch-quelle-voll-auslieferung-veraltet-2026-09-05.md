# U2-ADR-293: Das englische Sprach-Modul — Struktur-Invarianz bewiesen, eine veraltete Auslieferung gefunden

**Status:** Akzeptiert
**Datum:** 05.09.2026
**Kategorie:** GERÜST, BAUKASTEN, TEXTSATZ
**Drei-Anker:**
- **Code-Stelle:** `tools/textsatz-en-modul-erzeugen.js` (`baueModul()`) → `tools/textsatz-en-modul.json`;
  Aktivierung/Registrierung `vivodepot.html:39253-39256`. Proben:
  `tests/u2-adr-293-sprachmodul-struktur-invarianz.test.js`,
  `tests/textsatz-en-modul-erzeugen.test.js`.
- **ADR-Bezug:** U2-ADR-195 (Bürgersatz englisch andocken, die drei Quelldateien), U2-ADR-290
  (`beispiel`/`platzhalter` am eigenen Modulfeld — betrifft dieses Register NICHT, s. u.).
- **Status heute:** gilt — dreizehn Proben, davon vier neue, zwei mit echtem Rot-Beweis gegen den
  vorigen Stand.

---

## Der Auftrag, zweimal korrigiert

**Erste Fassung:** „Bürgermodul englisch" — miss, ob `tools/textsatz-en-modul.json` alle
Kennungen abdeckt, jetzt einschließlich `beispiel`/`platzhalter` aus U2-ADR-290.

**Erste Korrektur (Rücksprache mit `03`):** die Prämisse war falsch. U2-ADR-290 hat das
Textsatz-Register nicht erweitert, nur die ROLLE, die ein Modul an seinem EIGENEN `tpl_`-Feld
setzen darf. `beispiel` stand schon immer im Bestand.

**Zweite Korrektur (mitten im Bau):** die ganze Achse war falsch. Die
vier Bausteine sind

```
Gerüst + VD Privat + VD dt. Rechtsraum + VD dt. Sprache    = kostenlose dt. Bürgerapp
Gerüst + VD Privat + VD dt. Rechtsraum + VD engl. Sprache  = kostenlose engl. Bürgerapp
```

**Das englische Produkt ist kein zweites VD Privat — dasselbe VD Privat mit einem anderen
Sprach-Modul.** Sprache und Rechtsraum sind zwei getrennte Achsen; die englische Bürgerapp ist
deutsches Recht in englischer Sprache. Der Auftrag danach: *baue `VD engl. Sprache` als
Sprach-Modul — Mechanismus und Inhalt — und beweise, dass Struktur/Felder/Fristen beim
Sprachwechsel unverändert bleiben.*

---

## Befund 1: der Mechanismus existiert bereits, korrekt verdrahtet

**Laden/Anwenden/Wechseln sind kein offener Bau.** `modulEinlassen()` schreibt das rohe Modul in
`data.textsatzModule[]`; `_textsatzModuleAusDepotAnmelden(data)` baut daraus die aktive
Lauf-Registry; `textsatzNeuAnwenden()` füllt/nimmt zurück. Der reale Andock-Weg
(`vivodepot.html:39253-39256`) ruft alle drei in der richtigen Reihenfolge und setzt zusätzlich
`data.textsprache` automatisch auf das eingelassene Modul — eine bereits gehärtete Stelle mit
eigener Vorgeschichte (Fund 29.08.2026: ein erster Fix reichte nicht, weil
`_textsatzModuleAusDepotAnmelden` nur die Registry befüllt, ohne den Schalter `data.textsprache`
selbst zu setzen — kein Render-Fehler, ein fehlender Schreiber). **Nichts davon war in dieser
ADR neu zu bauen.**

**Was fehlte, war der Beweis, dass der Sprachwechsel die STRUKTUR unberührt lässt** —
`tests/u2-adr-293-sprachmodul-struktur-invarianz.test.js`, drei Proben:

1. **Struktur-Skelett** — jede `TEXTSATZ_ARTEN`-Eigenschaft (label/hint/beispiel/platzhalter/…)
   rekursiv aus `SEKTOREN` entfernt, vor und nach dem Andocken des englischen Moduls verglichen:
   bytegleich. Rückweg auf 'de' ebenfalls bytegleich.
2. **Gegenprobe** — die Oberfläche ändert sich WIRKLICH (`vorname.label`: „Vorname" → „First
   name"), sonst wäre Probe 1 ein Nulldurchlauf.
3. **Fristen** — jedes `fristRegel`-Feld über ALLE Sektoren gesammelt, vor/nach dem Sprachwechsel
   verglichen: unverändert. `fristRegel` ist Struktur, keine Sprache.

**Selbst rot geworden beim Bauen, dann behoben:** die Gegenprobe (2) schlug im ersten Anlauf fehl
— `vorname.label` blieb „Vorname" nach dem Wechsel auf 'en'. Ursache: die Probe rief
`modulEinlassen()`, aber nicht `_textsatzModuleAusDepotAnmelden()` danach — genau der Schalter aus
dem Fund oben, hier als Test-Fehler wiederholt, nicht als Produktfehler. Der reale
UI-Pfad ruft ihn bereits (Zeile 39256); die Probe musste ihn nachbauen. Nachgetragen, Probe grün.

## Befund 2: die ausgelieferte Datei war unabhängig davon veraltet

Gemessen mit `tools/textsatz-en-begriffe-pruefen.js` gegen den lebenden Kern (bb62a59b, v557):
**3186 deutsche Kennungen, 3186 englische (drei Quelldateien), 3186 gemeinsam — 0 fehlend, 0
erfunden.** Die Quelle war vollständig.

**Aber `tools/textsatz-en-modul.json`, die tatsächlich ausgelieferte Datei, trug nur 3180.**
`tests/textsatz-en-modul-erzeugen.test.js` hielt ausschließlich `baueModul()` (die Funktion)
gegen den Kern — keine Probe im Haus las je die committete Datei. Sechs Kennungen fehlten
(`standSatzKeine/-Bekannt/-Teilweise`, `dokStandFussKeine/-Bekannt/-Teilweise`, U2-ADR-259,
04.09.2026) plus ~29 durch den A553-Nachtrag (Commit `f7e5b052`, 05.09.2026) überholte Wortlaute
— beide Änderungen landeten in den Quelldateien, der Erzeuger lief seither nicht erneut.

**Behoben:** Datei neu erzeugt (3180 → 3186) und committet. **Frische-Wächter ergänzt**
(`[EN-Modul·Frische]`), der die Datei von der Platte gegen `baueModul()` hält. Rot-Beweis
geführt: die alte Datei zurückgespielt, genau diese eine Probe schlägt an, sonst nichts.

## Was das Sprach-Modul NICHT enthält — geprüft, nicht behauptet

`tools/textsatz-en-modul.json` ist ein flaches `{Kennung: englischer Text}`, jede Kennung ein
1:1-Spiegel einer `TEXTSATZ_EINGEBAUT`-Kennung. Keine Feld-Definition, kein `typ`, kein
`fristRegel`, keine Options-Werte — nur Text. Genau das macht es sprach-, nicht struktur-tragend,
und genau das ist die Voraussetzung dafür, dass Privat und Pro es teilen können, ohne dass
Pro-Struktur hineinsickert.

## Was offen bleibt

- **Der englische Inhalt für Pro-spezifische Felder** existiert naturgemäß noch nicht (Pro-Felder
  sind heute nicht in `TEXTSATZ_EINGEBAUT`) — kommt automatisch mit, sobald Pro-Felder dort
  auftauchen, kein Nachbau an diesem Modul nötig.
- **Die Bürgermodul-Nutzlaststruktur** (Register-Payload je Typ, `03`s Messung gegen die 512-KB-
  Grenze) ist ein eigener, noch nicht committeter Gegenstand — betrifft das Rechtsraum-Modul, nicht
  dieses Sprach-Modul.
- **Wortlaut-Qualität** (Uneinheitlichkeit/Geschwister/Glossartreue) ist eigene, laufende Arbeit
  (U2-ADR-195-Nachträge) — nicht Teil dieser ADR.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
