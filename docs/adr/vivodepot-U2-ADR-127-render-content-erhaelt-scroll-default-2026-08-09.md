# U2-ADR-127: `renderContent()` erhält Scroll und Fokus per Default

**Status:** Akzeptiert
**Datum:** 09.08.2026
**Kategorie:** UX, KONSTRUKTION
**Grundlage:** interner Auftrag „N5 – Scroll-Erhalt" (08.08.2026), Register
Befund K5.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `renderContent(springeNachOben)` (~Zeile 22936),
  `_scrollUndFokusMerken`/`_scrollUndFokusWiederherstellen` (unverändert seit Muster B).
- **Sprint-Commit:** N5, ein Commit.
- **ADR-Bezug:** dieser ADR; löst K5 (Register) auf; verwandt mit U2-ADR-091 §6 (die
  „Event-Blindzone") und U2-ADR-125 (Browser-Testfähigkeit als Voraussetzung).
**Status heute:** gilt — Beleg `tests/muster-b-render-scroll-fokus.test.js#renderContent() (ohne Argument) ERHÄLT den #content-Scroll — der neue Default`.

---

## Kontext

Derselbe Befund wurde unabhängig in drei Zusammenhängen an einem Tag gemeldet: beim
Markieren eines Feldes als „sensibel", beim Eintragen einer Person, beim Ablageort eines
Dokuments — jeweils sprang die Sicht nach dem Re-Render an den Seitenanfang, teils weit
weg vom bearbeiteten Feld. In langen Formularen mehrfach pro Sitzung.

Der Mechanismus gegen genau dieses Problem existierte bereits (Muster B, 16.07.2026):
`_scrollUndFokusMerken`/`_scrollUndFokusWiederherstellen`, aufgerufen über einen Wrapper
(`_renderContentNachListenCrud`) an vier Aufrufstellen. Der DEFAULT von `renderContent()`
war aber „scrolle nach oben" — ein Aufrufer musste den Erhalt ausdrücklich ANFORDERN
(`erhalteScrollUndFokus=true`).

**Vollerhebung (N5 Zug 0):** von 46 vermessenen `renderContent()`-Aufrufstellen waren 30
Re-Render an Ort und Stelle (Feld gespeichert, Listen-Eintrag geändert, Modal-Aktion
abgeschlossen, Sensibel-Markierung umgeschaltet) — kein Bereichswechsel. Nur 16 waren
echte Navigation (Bereichs-/Modus-/Situationswechsel). Jede der 30 Re-Render-Stellen war
„naked" (rief bare `renderContent()`) und riss dabei die Sicht nach oben, obwohl die
Bürgerin an Ort und Stelle blieb — bei jedem NEUEN Re-Render-Aufruf in der Zukunft würde
sich das wiederholen, weil Nacktheit der sichere, unmarkierte Zustand war.

## Entscheidung

**Der Default ist gedreht.** `renderContent(springeNachOben)`:

- **Ohne Argument (Default):** Scroll UND Fokus werden ERHALTEN
  (`_scrollUndFokusMerken()` vor dem Rebuild, `_scrollUndFokusWiederherstellen()` danach).
- **`renderContent(true)`:** ausdrückliche Navigation — die Sicht beginnt oben
  (`inhaltNachObenScrollen()`).

**Der falsche Zustand muss künftig ausdrücklich gewählt werden, nicht der richtige.** Wer
eine neue `renderContent()`-Aufrufstelle schreibt und nicht navigiert, bekommt Scroll-Erhalt
automatisch — ohne diesen ADR zu kennen oder eine der 46 bestehenden Stellen zu kopieren.

**16 Aufrufstellen** (alle über `Modus._setzeIntern` — Moduswechsel Anker/Vollmacht/
Angehörigen/Notfall in EINER gemeinsamen Stelle — sowie `oeffneSektor`, `oeffneVerwaltung`,
`oeffneSituation`, `oeffneLebenslage`, `oeffneMappe`, `oeffnePrueftermine`,
`oeffneUebergabeProtokoll`, `oeffneBestandsAuswahl`, `oeffneSubKonzept`, `oeffneAkut`,
`akutZurueck`, `wizardAbschluss`s Rückkehr-Zweig) rufen jetzt ausdrücklich
`renderContent(true)`.

**Der bisherige Wrapper `_renderContentNachListenCrud` entfällt** — seine drei Aufrufstellen
rufen jetzt direkt `renderContent()` ohne Argument, da der Default dasselbe leistet.

**Der Wizard bleibt ein eigener Fall,** unverändert seit Muster B: `renderWizard`
verwaltet Fokus selbst; `renderContent()` überspringt für ihn den generischen Erhalt und
scrollt nur beim EINSTIEG (Schritt-Index 0) nach oben.

**Ein Nachbarbefund, im selben Zug behoben (kein Scroll-Thema, dieselbe Zeile):** der
Knopf „Wo liegt das Dokument?" (`data-doku-neu-add`) rief die einfache
`_dokumentPanelNeuRender()` statt der bereits existierenden
`_dokumentPanelNeuRenderUndSpringe()` — der neu angelegte Dokument-Eintrag war unsichtbar
weit unten, statt dass die Sicht zu ihm sprang. Auf den Sprung-Pfad umgestellt.

## Konsequenzen

- Jede künftige `renderContent()`-Aufrufstelle ist per Default sicher. Ein Wächter
  (`tools/w-scroll-erhalt-pruefen.js`, Bauart wie `W-tote-strings`) meldet neue
  `renderContent(true)`-Aufrufe, die in der Grundlinie nicht als Navigation bekannt sind
  — die 16 bekannten Stellen bleiben grün, ein SIEBZEHNTER Aufruf mit `true` an einer
  unbekannten Stelle wird rot und verlangt eine bewusste Einordnung.
- Der Wizard-Sonderfall bleibt bestehen und ist nicht Teil dieser Entscheidung — er hatte
  bereits vor N5 sein eigenes, korrektes Verhalten (Muster B, Bug 2, iOS-Gerätetest
  05.07.2026).
- Browser-Abnahme (Regel 18, U2-ADR-125): Scrollverhalten ist Node-blind. Drei Fälle
  geprüft, real rot vor dem Bau gesehen — s. Bericht N5.

## Cross-Referenz

U2-ADR-091 §6 (die „Event-Blindzone", Grund für die Browser-Abnahme hier), U2-ADR-125
(Browser-Testfähigkeit als Voraussetzung für Änderungen an dieser Art Weg), Muster B
(16.07.2026, `_scrollUndFokusMerken`/`_scrollUndFokusWiederherstellen`, hier
wiederverwendet, nicht neu gebaut).

```konformitaet
aussage:  renderContent() ohne Argument erhält Scroll- und Fokusposition;
          renderContent(true) setzt die Sicht ausdrücklich an den Anfang.
zustand:  geprüft
herkunft: invariante
pruefung: tests/muster-b-render-scroll-fokus.test.js#renderContent() (ohne Argument) ERHÄLT den #content-Scroll — der neue Default
```
