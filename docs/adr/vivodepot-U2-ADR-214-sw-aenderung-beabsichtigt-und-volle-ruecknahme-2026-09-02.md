# U2-ADR-214: Ein benannter, ADR-gedeckter Schalter hebt den sw.js-Wächter auf — und ein Abbruch nimmt vollständig zurück

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** AUSLIEFERUNG, ZUVERLÄSSIGKEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-190 (bedingtes skipWaiting — die konkrete, gewollte sw.js-Änderung, an der
der Wächter unten scheiterte) · U2-ADR-194 (index.html-Weiterleitung — derselbe Fünf-Dateien-Satz,
den die volle Rücknahme unten kennen muss)
**Anker:** Bauauftrag, 02.09.2026 (Cross-Session-Auftrag an diese Sitzung;
Fund „Ein Fix, der sich selbst nicht ausliefern kann", Vormittag) — der sw.js-Diff-Wächter aus der
„Service-Worker-Update-Sackgasse" (31.08.2026) blockiert
seit `SCHALEN_STAND` v492 jede Auslieferung, bei der sich `sw.js` in mehr als Kommentaren/der
`CACHE`-Zeile ändert, und damit ausgerechnet U2-ADR-190 selbst. Zweiter Fund, nachgereicht
am Abend desselben Tages: der bisherige Abbruchpfad nahm nur `sw.js` zurück und ließ
`vivodepot.html`, `vivodepot-lesen.html`, `manifest.webmanifest` und `index.html` verändert im
Zielrepo liegen — das musste zweimal von Hand aufgeräumt werden, einmal ging dabei die Weiterleitung
aus U2-ADR-194 verloren und die Tester bekamen einen echten 404.
**Status heute:** gilt — Beleg `tests/testfassung-legen.test.js`. Der eigentliche Auslieferungslauf
(mit `--sw-aenderung-beabsichtigt U2-ADR-190 --push` gegen `vivodepot-ios-test`) ist NICHT Teil
dieser ADR — er folgt als eigener Schritt in der Landereihenfolge, s. „Ausdrücklich nicht
behandelt".

---

## Kontext

Root-Tester stehen seit `SCHALEN_STAND` v492 auf v489 — drei Schalen-Stände hinter dem
eigentlichen Kern, weil `tools/testfassung-legen.js` beim Ausliefern genau an der Änderung
abbricht, die das automatische Aktualisieren bringen soll (U2-ADR-190, bedingtes `skipWaiting`).
Der Wächter, der das tut, ist selbst richtig: Er vergleicht `sw.js` maskiert (Kommentare/String-
Literale entfernt, dieselbe `ohneKommentareUndStrings`-Funktion wie der Konformitäts-Wächter)
gegen die vorherige Fassung im Zielrepo und bricht bei jeder Abweichung außerhalb der `CACHE`-Zeile
ab — genau das verhindert die Drift, die am 31.08.2026 zur „Service-Worker-Update-Sackgasse" führte.
Er kennt aber nur zwei Zustände, gewollt und versehentlich, und behandelt beide gleich: ab.

Ein zweiter, unabhängiger Fund am selben Tag: `dateisatzUndIndexAblegen()` schreibt bereits VOR dem
sw.js-Diff-Vergleich alle fünf Dateien (`DATEISATZ` + `index.html`) in das Zielrepo. Der bisherige
Abbruchpfad — `execFileSync('git', ['checkout', '--', 'sw.js'])` — nahm davon nur `sw.js` zurück.
Der nächste Lauf (auch von `modul-app-packen.js`, das dasselbe Zielrepo committet) verweigerte dann
mit „Zielrepo nicht sauber" — wegen des eigenen Zwischenergebnisses dieses Werkzeugs, nicht wegen
einer echten fremden Änderung.

## Entscheidung

**Zwei getrennte, aber im selben Lauf zusammenwirkende Fixes.**

### 1 · `--sw-aenderung-beabsichtigt <U2-ADR-Nr>`

Ein benannter Schalter, kein blankes `--force`. `adrBezeichnetSwAenderung(kennung, adrOrdner)`
prüft mechanisch genau zwei Dinge — bewusst keine Interpretation des ADR-Inhalts, dieselbe Grenze
wie bei `adr-referenzen-pruefen.js` und beim Register der Außenaussagen:

1. Existiert unter `docs/adr/` eine Datei mit dieser Nummer?
2. Erwähnt ihr Text die Zeichenkette `sw.js` überhaupt?

Eine erfundene Nummer bricht genauso ab wie eine echte ADR, die nichts mit `sw.js` zu tun hat, und
genauso wie gar kein Schalter. `swAenderungEntscheidung(nurCacheZeile, swDiffText, swAenderungAdr,
adrOrdner)` trifft die eigentliche Entscheidung als reine Funktion — `main()` führt sie nur noch
aus. Bei reiner Kommentar-/`CACHE`-Zeilen-Abweichung ist der Schalter irrelevant (nichts zu decken).
Der maskierte Diff wird **vor** dem Schreiben des Commits ausgegeben (Konsole), und die gedeckte
ADR-Nummer landet in der Commit-Nachricht des Zielrepos — beides, damit ein „warum durfte das
durch" nicht im Terminal-Scrollback verloren geht.

**Warum kein `--force`:** Ein unbenannter Kill-Schalter wäre in drei Wochen der Normalweg, nicht die
Ausnahme — genau die Fehlerklasse, die der Wächter selbst verhindern soll. Der Zwang, eine
existierende, thematisch passende ADR zu nennen, macht jede Aufhebung nachträglich prüfbar: welche
Änderung, von wem entschieden, wann.

### 2 · `ablegungZuruecknehmen(ziel)` — volle Rücknahme, nicht nur `sw.js`

```js
function ablegungZuruecknehmen(ziel) {
  execFileSync('git', ['checkout', '--', ...DATEISATZ, 'index.html'], { cwd: ziel, env: ohneGitEnv() });
}
```

Läuft der Abbruchpfad (mit oder ohne Schalter, bei jedem `swEntscheidung.blockiert`), nimmt er
jetzt alle fünf abgelegten Dateien zurück — `DATEISATZ` (`vivodepot.html`, `vivodepot-lesen.html`,
`sw.js`, `manifest.webmanifest`) plus `index.html` aus U2-ADR-194. Das Zielrepo steht danach exakt
so da wie vor dem Lauf, unabhängig davon, an welcher Vorbedingung er scheiterte.

## Verworfene Alternative

**Ein unbenanntes `--force`, das den Wächter pauschal übergeht.** Verworfen: trägt keine
Begründung, die sich später nachlesen lässt, und senkt die Hemmschwelle für die nächste, vielleicht
tatsächlich versehentliche `sw.js`-Drift auf null — der Wächter existiert, weil genau das schon
einmal passiert ist (31.08.2026).

**Die Rücknahme nur um die drei fehlenden Dateien erweitern (`vivodepot.html`,
`vivodepot-lesen.html`, `manifest.webmanifest`), `index.html` separat behandeln.** Verworfen:
`index.html` entsteht im selben Schreibschritt (`dateisatzUndIndexAblegen`, U2-ADR-194) und muss im
selben Rücknahmeschritt verschwinden — zwei getrennte Rücknahme-Aufrufe wären genau die Art
Asymmetrie, die den ursprünglichen Fund erst ermöglicht hat.

## Ausdrücklich nicht behandelt

- **Der tatsächliche Auslieferungslauf** gegen `vivodepot-ios-test` (mit `--push`, das die Tester
  tatsächlich von v489 wegholt) ist NICHT Teil dieser ADR — dieser ADR deckt den Code- und Test-
  Stand in `vivodepot-cleanslate`. Der reale Lauf folgt als eigener, in der Landereihenfolge
  eingereihter Schritt.
- **Die Standard-Blockierung des Wächters selbst** (maskierter Vergleich, `CACHE`-Zeilen-Ausnahme)
  ist unverändert — diese ADR fügt eine benannte, geprüfte Ausnahme hinzu, sie lockert die Regel
  nicht.
- **Ob künftige `sw.js`-Änderungen typischerweise eine passende ADR vorfinden werden.** Der Schalter
  verlangt eine EXISTIERENDE ADR, die `sw.js` nennt — trifft eine Änderung keine solche, muss die
  ADR zuerst geschrieben werden. Das ist gewollte Reibung, kein Versehen dieser Entscheidung.

## Konsequenzen

U2-ADR-190 (bedingtes `skipWaiting`) kann ab diesem Stand mit
`--sw-aenderung-beabsichtigt U2-ADR-190` tatsächlich ausgeliefert werden — vorher blockierte der
Wächter das strukturell, unabhängig davon, wie oft der Lauf wiederholt wurde. Jeder Abbruch, aus
welchem Grund auch immer, hinterlässt das Zielrepo exakt so sauber, wie er es vorfand — der
Fund („Zielrepo nicht sauber" durch das eigene Zwischenergebnis dieses Werkzeugs) kann sich
nicht wiederholen.

## Konformität

```konformitaet
aussage:  Der sw.js-Wächter lässt sich nur mit einem Schalter aufheben, der eine tatsächlich
          existierende, "sw.js" nennende ADR benennt; ohne Schalter, mit einer erfundenen Nummer
          oder mit einer ADR ohne sw.js-Bezug bricht die Auslieferung weiterhin ab.
zustand:  geprüft
herkunft: invariante
pruefung: tests/testfassung-legen.test.js#adrBezeichnetSwAenderung: U2-ADR-190 existiert und nennt sw.js — gültig
pruefung: tests/testfassung-legen.test.js#adrBezeichnetSwAenderung: eine nicht existierende ADR-Nummer bricht ab
pruefung: tests/testfassung-legen.test.js#adrBezeichnetSwAenderung: eine ungültig geformte Kennung bricht ab
pruefung: tests/testfassung-legen.test.js#adrBezeichnetSwAenderung: eine existierende ADR OHNE Erwähnung von sw.js bricht ab
pruefung: tests/testfassung-legen.test.js#[Testfassung-legen·Rot-Beweis] swAenderungEntscheidung: OHNE Schalter bricht eine echte sw.js-Abweichung weiterhin ab
pruefung: tests/testfassung-legen.test.js#[Testfassung-legen·Rot-Beweis] Gegenprobe: MIT Schalter, aber erfundener ADR, bricht es AUCH ab
```

```konformitaet
aussage:  Bei reiner Kommentar-/CACHE-Zeilen-Abweichung ist der Schalter irrelevant (nichts zu
          blockieren); bei einer echten Abweichung mit gültigem Schalter UND passender ADR geht
          die Auslieferung durch.
zustand:  geprüft
herkunft: invariante
pruefung: tests/testfassung-legen.test.js#swAenderungEntscheidung: reine CACHE-Zeilen-Abweichung blockiert nie, unabhängig vom Schalter
pruefung: tests/testfassung-legen.test.js#swAenderungEntscheidung: MIT Schalter und einer echten, sw.js nennenden ADR lässt es durch
```

```konformitaet
aussage:  Ein Abbruch (mit oder ohne Schalter) nimmt ALLE fünf abgelegten Dateien zurück
          (DATEISATZ + index.html), nicht nur sw.js — das Zielrepo bleibt für den nächsten Lauf
          sauber, unabhängig davon, an welcher Vorbedingung dieser Lauf scheiterte.
zustand:  geprüft
herkunft: invariante
pruefung: tests/testfassung-legen.test.js#[Testfassung-legen·Rot-Beweis] ablegungZuruecknehmen nimmt ALLE fünf abgelegten Dateien zurück, nicht nur sw.js
pruefung: tests/testfassung-legen.test.js#main() verdrahtet --sw-aenderung-beabsichtigt und ruft ablegungZuruecknehmen im Abbruchpfad
```

---
*Vivodepot GmbH · Berlin · 02.09.2026*
