# U2-ADR-298 · Zwei vorbestehende E2E-Rotläufe, beide Nachwirkung von U2-ADR-288

**Datum:** 05.09.2026
**Status:** Angenommen und umgesetzt.
**Status heute:** gilt
**Bezug:** U2-ADR-288 (Erbschein-Vorbereitungsauszug ab Werk eingelassen — die Ursache beider
Funde hier) · U2-ADR-295 (drittes Pro-Template, dessen Volllauf beide Funde zuerst meldete)

---

## Kontext

Der volle Lauf `npm run test:e2e` zeigte beim Bau von U2-ADR-295 zwei Fehlschläge, unabhängig
von diesem Zweig (der kein Byte in `vivodepot.html`/`sw.js` änderte). Beide waren tatsächlich
unabhängig von U2-ADR-295 — aber nicht unabhängig voneinander: **beide sind Ripple-Effekte von
U2-ADR-288 (05.09.2026, derselbe Tag), die bei jenem Bau nicht gefangen wurden, weil die
seinerzeit gezielt gefahrenen Tests diese beiden E2E-Dateien nicht enthielten.**

## Fund 1: `[A62·Verdrahtung] die Regal-Karten brauchen KEINEN Handler`

`tests/e2e/10-verdrahtung-charakterisierung.spec.js` erwartete `data-modul-karte` = 6 in einem
frischen, komplett unberührten Test-Depot — der eigene Kommentar der Datei begründete das
ausdrücklich: „Erbschein-Auszug … zählt hier nur noch, wenn eingelassen (in einem frischen
Test-Depot ohne Einlass nicht der Fall)". Das galt bis zum 27.08.2026 (Siebtes-Register-Auftrag)
und wurde durch U2-ADR-288 am selben Tag wie dieser Fund wieder falsch: `depotAnlegen()` seedet
den Erbschein-Auszug seither IMMER, ganz ohne Einlass — ein frisches Depot trägt seine Karte
darum jetzt immer, macht sieben statt sechs.

**Testfix, kein Produktfix.** Die sechs Instrument-Karten bleiben unverändert ohne `onclick`
(Anker-Sprung). Die siebte — Erbscheins ab-Werk-Karte — trägt tatsächlich einen echten `onclick`
(`dokumentOeffnen`, über die generische `logikModule`-Verdrahtung) und wurde vorher nie
mitgezählt, weil es sie in einem frischen Depot vorher nicht gab. Gezählt wird jetzt getrennt:
`nGesamt: 7`, `nOhneHandler: 6` — die Sechs/Sieben-Zahl gilt ausdrücklich nur für ein Depot ganz
ohne manuellen Fremdmodul-Einlass; ein zusätzlich angedocktes logikModul (Notarin,
Geschäftsführerin) käme hier nicht hinzu, weil dieser Test nie eines einlässt.

## Fund 2: `[Pilot·Hebammenverband Ungarn] anbieterId undefined`

**Geprüft, ob Testdatenfehler oder echter Produktfehler — Ergebnis: Testdatenfehler.**
`tests/e2e/pilot-hebammenverband-ungarn-deutscher-generator.spec.js` griff nach dem Einlass des
Fachmoduls auf `data.logikModule[0]` zu, um dessen `anbieterId`/`anbieterIdGeprueft`/`ungeprueft`
zu lesen — eine Annahme, die vor U2-ADR-288 stimmte (ein frisches Depot hatte keine anderen
Einträge, das eben eingelassene Fachmodul war zwangsläufig Index 0). Seit `depotAnlegen()` den
Erbschein-Auszug ab Werk VOR jedem manuellen Einlass seedet, liegt das Fachmodul der Hebamme an
Index 1 — `[0]` liefert das Erbschein-Objekt, dessen `anbieterId` naturgemäß `undefined` ist
(Selbst-Einlass, kein Provider-Zertifikat). Der komplette, echte kryptografische Weg
(Anker→Ausgabestelle→Kunde, `modulEinlassenGeprueft`) selbst funktionierte die ganze Zeit korrekt
— nur der Testzugriff griff die falsche Array-Position.

**Behoben:** Zugriff über `data.logikModule.find(m => m.id === logikId)` statt über den Index —
robust gegen jede künftige Reihenfolge oder jedes weitere ab-Werk-Modul, nicht nur gegen den
heutigen Fall.

## Nebenfund: `docs/durchstich-wegprotokoll.md`, Zeile 4b

Ein weiterer, real gemessener Ripple-Effekt derselben Ursache: die Wortzahl am Schritt
„Vorsorgevollmacht + Bevollmächtigte anlegen" stieg von 310 auf 358 — die
`.modal`/`.modal-koerper`-Kopf/Körper/Fuß-Umstellung aus demselben U2-ADR-288-Nachtrag (der
vorbestehende Fußleisten-Bug) ändert, wie viel Modal-Text an diesem Schritt tatsächlich im DOM
sichtbar/zählbar ist. Neu erzeugt über das eigene Werkzeug
(`tests/e2e/durchstich-buergerweg.spec.js`), nicht von Hand editiert — derselbe Lauf, der die
Datei ursprünglich schreibt.

## Rot-Beweis

Beide E2E-Dateien einzeln vor UND nach der Änderung gefahren: vor der Änderung reproduzierbar rot
(genau die hier beschriebenen Werte — 7 statt 6 erwartet, `undefined` statt der echten
`anbieterId`), nach der Änderung grün. `npm run test:e2e` danach als Ganzes gehalten (s. Bericht).

## Konsequenzen

Beide Funde sind Testfixes, keine Produktänderungen — `vivodepot.html`/`sw.js` bleiben
unangetastet, kein `SCHALEN_STAND`-Bump nötig. Der eigentliche Lehrsatz: eine Ab-Werk-Seed-Änderung
wie U2-ADR-288 ändert die Grundannahme „frisches Depot = leeres `data.logikModule`" an mehr
Stellen, als eine gezielte Testauswahl zum Zeitpunkt des Baus abdeckt — die vollständige Deckung
zeigt sich erst bei einem echten Volllauf der gesamten Suite.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
