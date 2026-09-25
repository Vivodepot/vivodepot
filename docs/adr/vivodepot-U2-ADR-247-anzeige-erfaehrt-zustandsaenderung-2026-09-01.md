# U2-ADR-247: Anzeige erfährt Zustandsänderung — Sichern-Knopf-Klick und Statuskarte

**Status:** Angenommen
**Datum:** 01.09.2026 (Entscheidung und Bau) · **gelandet 04.09.2026** — s. „Wie diese ADR verlorenging" unten
**Kategorie:** KORREKTHEIT, UX
**Linie:** U2
**U2-Bezug:** Dritte bekannte Ausprägung derselben Fehlerklasse am selben Listener wie
`_ausdruecklichKeineDomNachziehen` (Zug „Ausdrücklich keine", 12.08.2026, `vivodepot.html:46677`)
— dort bereits „chirurgischer DOM-Nachzug statt vollem Re-Render", hier zum zweiten Mal angewandt.
Berührt NICHT die sieben Ränge aus dem Befund „Eingefrorene Bildschirm-Zusicherungen"
(01.09.2026) — andere Code-Pfade, siehe „Ausdrücklich nicht behandelt".
**Anker:** Bauauftrag, 01.09.2026, freigegeben: „die drei Befunde
sollen zusammen angegangen werden, nicht einzeln". Zug 0 (siehe Kontext) widerlegte die
Drei-Befunde-Prämisse für einen der drei Berichte; die verbleibenden zwei teilen sich tatsächlich
eine Stelle, und genau deshalb war „zusammen ansehen" bei diesen beiden richtig.
**Status heute:** gilt — Beleg `tests/e2e/anzeige-zustandssync-autosave.spec.js`.

---

## Wie diese ADR verlorenging (Nachtrag 04.09.2026)

**Nicht als Schuldfrage, sondern als Befund, damit die nächste Prüfung anders läuft.**

Diese ADR entstand am 01.09.2026 unter der Nummer U2-ADR-186, auf einem eigenen Zweig
(`anzeige-zustandssync`), fertig gebaut, getestet, committet — aber nie gerebast, nie
gepusht. Am selben Tag liefen acht parallele Arbeitsbäume; **drei davon vergaben unabhängig
voneinander dieselbe Nummer 186.** Zwei der drei wurden im Rahmen ihrer eigenen Landung
umnummeriert (auf 190 bzw. 194, s. Kommentar in `tests/adr-readme-uebereinstimmung.test.js`).
**Der dritte — dieser hier — landete nie, wurde darum in keiner Umnummerierungs-Runde
mitgeführt, und behielt die Nummer 186, während sie im Kanon längst für ein anderes Thema
(„Gekauftes Modul bleibt im Bestand nutzbar") vergeben wurde.**

Drei Tage lang lag der Zweig unangetastet. Eine Bestandsprüfung am 04.09.2026 sollte klären, ob
noch verwaiste Arbeit im Repository herumliegt, und stützte sich dabei auf einen Abgleich der
ADR-*Nummer* gegen den Kanon: 186 existiert dort — also „gelandet", so das (falsche) Ergebnis.
**Die Nummer allein trug nicht** — sie verwies auf ein anderes Thema. Erst eine zweite,
unabhängige Prüfung, die gegen den tatsächlichen CODE hielt (fehlende Funktion
`_statuskarteNachziehen`, fehlende Testdatei, eine im Kanon wortgleich unveränderte Zeile in
`renderSaveStatus`), deckte den Irrtum auf. Ein Rot-Beweis gegen den echten, aktuellen Kanon
bestätigte danach: der beschriebene Fehler existiert dort unverändert.

**Die Lehre, nicht nur für diesen Fall:** ein ADR-Nummern-Abgleich beweist nie „gelandet" —
nur ein Inhalts-Abgleich (Funktion, Test, konkrete Codezeile) tut das. Nummern werden in diesem
Projekt bei Kollisionen umvergeben; ihre bloße Existenz im Kanon sagt nichts über das ursprünglich
gemeinte Thema.

---

## Kontext

Zwei Befunde aus der Nacht zum 01.09.2026 (Sitzung „VD xshare", TI-568-Belegvorbereitung):

1. **„Save as file now" verliert den ersten Klick.** Hat beim Klick auf `#tb-save-knopf` noch ein
   zweites Eingabefeld den Fokus, passiert sichtbar nichts — der Zähler springt von „1" auf „2
   ungespeicherte Änderungen", keine Datei entsteht. Ein zweiter Klick (kein Feld mehr fokussiert)
   speichert normal.
2. **Die Statuskarte einer Feldgruppe bleibt „noch nichts eingetragen", nachdem Felder ausgefüllt
   wurden**, solange der Bereich nicht verlassen wird. Die Daten sind korrekt in `data` und in der
   exportierten Datei — nur die Beschriftung hinkt.

**Zug 0 (01.09.2026) prüfte die Auftragsprämisse „eine gemeinsame Ursache" gegen den
aktuellen Code, statt sie zu übernehmen:**

- **Widerlegt für den dritten Bericht** („Eingefrorene Bildschirm-Zusicherungen", 7 Ränge: DOM-
  Reste nach App-Schließen/Vorschau-Verwerfen, fehlender Zeit-Trigger bei Vorlagen-Gültigkeit/
  Prüfterminen/§1358/Fußzeile/Feldfristen). Kein gemeinsamer Aufrufer mit den beiden Befunden
  oben; der Bericht selbst kommt für seine eigenen 7 Ränge bereits zum Ergebnis „kein zentrales
  Muster" und empfiehlt selbst, nicht in derselben Nacht zu bauen (Rang 1 zuerst vorzulegen).
  Diese ADR baut ihn darum nicht mit — siehe „Ausdrücklich nicht behandelt".
- **Bestätigt für die beiden Befunde oben.** Beide hängen am selben delegierten Autosave-
  Listener, `_autoSaveWennFeld` (`vivodepot.html:49000`, blur/change auf `#content`,
  capture=true — „blur bubbelt nicht"). Befund 1 ist ein ÜBERRENDER: `markiereUngespeichert()`
  (`vivodepot.html:35034ff.`) ruft bei JEDEM Autosave `renderSaveStatus()`
  (`vivodepot.html:35164`), die bislang bedingungslos `knopf.innerHTML` neu schrieb — auch wenn
  sich am Label nichts änderte. Befund 2 ist ein UNTERRENDER: derselbe Listener ruft nach eigenem
  Kopfkommentar ausdrücklich KEIN `renderContent()` („Fokus-Klau vermeiden"), und die
  Statuskarten-Zählung (`_clusterZaehlung`/`feldgruppenStatusText`, `vivodepot.html:45598ff.` vor
  diesem Commit) läuft nur beim vollen Render.
- **Die Hypothese hinter Befund 1 wurde instrumentell geprüft, nicht nur gelesen**: rohes
  `mouse.down()`/`mouse.up()` (kein `.click()`) auf `#tb-save-knopf`, während ein zweites Feld
  noch fokussiert ist, reproduziert exakt das gemessene Symptom (Zähler bleibt bei „2", keine
  Datei) — s. `tests/e2e/anzeige-zustandssync-autosave.spec.js`, Test „Befund 1", rot vor dieser
  Änderung.
- **Alle Zeilenangaben aus den beiden Berichten waren zum Zug-0-Zeitpunkt bereits ~190–200
  Zeilen veraltet** (zwei dazwischenliegende Commits vom selben Morgen, U2-ADR-184/185) — in
  dieser ADR stehen nur selbst nachgemessene, aktuelle Zeilen.

**Warum eine Reparatur, die nur Befund 2 behebt, gefährlich wäre:** Der naheliegende Fix — nach
dem Autosave `renderContent()` nachholen — würde die „nur falten"-Entscheidung des Listeners
aufheben und Befund 1 VERALLGEMEINERN: `renderContent()` baut die ganze Sektion inklusive aller
Eingabefeld-Knoten neu auf. Ein Klick vom gerade verlassenen Feld ins nächste (derselbe Vorgang,
der im Alltag ständig passiert) träfe dann denselben Knoten-Verschwindet-zwischen-mousedown-und-
mouseup-Mechanismus wie Befund 1, nur an jedem Feld statt nur am Sichern-Knopf.

## Entscheidung

**Zwei chirurgische Nachzüge, kein Rebuild — dieselbe Lehre wie `_ausdruecklichKeineDomNachziehen`
oben, hier zum zweiten Mal angewandt:**

**1 — `renderSaveStatus()` schreibt `knopf.innerHTML` nur noch bei tatsächlicher Label-Änderung**
(`vivodepot.html:35211-35214`). Ein `knopf.dataset.knopfLabel`-Vergleich vor dem Schreiben:
bleibt das Label gleich (der Normalfall — es hat nur zwei mögliche Werte, `saveStatusJetztSichern`
und `saveStatusUnbestaetigtBestaetigen`, und wechselt nicht bei jeder Zähler-Erhöhung), bleibt der
bestehende Knopf-Kindknoten unangetastet. Trifft ein Mausklick genau in diesem Moment ein
(mousedown geschehen, mouseup noch aussteht), bleibt sein Ziel-Knoten erhalten, der Klick zählt.
`knopf.setAttribute('aria-label', …)` bleibt unbedingt (ein Attribut, kein Kindknoten-Ersatz,
unschädlich mitten im Klick).

**2 — Neue Funktion `_statuskarteNachziehen(t)`** (`vivodepot.html:45678`), aufgerufen aus
`_autoSaveWennFeld`s bestehendem „nur falten"-Zweig (`vivodepot.html:49031`, neben
`_ausdruecklichKeineDomNachziehen(t)` und `_pruefzifferAusDomMelden(t)`). Findet über
`t.closest('.feld-zeile').closest('.feldgruppen-karte')` die betroffene Karte und ihre
umschließende Sektion (`.sektion--eingabe`-ID), bestimmt den Cluster über die POSITION der Karte
unter ihren Geschwistern (`feldgruppenKarteHTML()` rendert `vollListe` — die benannten Cluster aus
`SEKTION_STATUSKARTEN_CLUSTER`, ggf. + die synthetische „Weiteres"-Karte am Ende — immer in
derselben Reihenfolge, immer eine Karte pro Eintrag, auch bei `gesamt === 0`; Karten-Index unter
den Geschwistern entspricht darum immer dem Index in `vollListe`), und ruft dieselben Funktionen
wie der volle Render (`_clusterZaehlung`, `feldgruppenStatusText`) — NUR mit dem Ergebnis auf
EINEN `.feldgruppen-karte-status`-Textknoten angewandt (`textContent =`, kein `innerHTML`, kein
Eingabefeld-Knoten berührt). Kein Treffer (Feld nicht in einer Statuskarte, unbekannter Sektor,
mehr Karten als erwartet) ist der Normalfall für die meisten Sektoren und bleibt ein reines No-op.

**Bewusst KEIN neues DOM-Attribut.** Ein erster Entwurf stempelte `data-cluster-id` auf jede Karte
und suchte darüber — einfacher zu lesen, aber ein Preis: das hätte das gerenderte Markup JEDER
`.feldgruppen-karte` in JEDEM Sektor mit Statuskarten geändert und 24 Fixtures in
`tests/render-charakterisierung.test.js` zur Neuaufnahme gezwungen, für einen Gewinn, den die
ohnehin deterministische Render-Reihenfolge umsonst liefert. Verworfen zugunsten des kleineren
Fußabdrucks — geprüft, nicht nur behauptet: `node --test tests/render-charakterisierung.test.js`
läuft mit dieser Fassung unverändert grün, KEINE Fixture musste angefasst werden.

**3 — `SCHALEN_STAND`/`CACHE` im Lockstep** — der Wächter `tests/schalen-lockstep-anlass.test.js`
verlangt das bei jeder inhaltlichen Änderung an `vivodepot.html`. Ursprünglich v487→v488 gebaut;
bei der Landung am 04.09.2026 auf den dann geltenden Stand nachgezogen (v515→v516), s. „Wie diese
ADR verlorenging" oben.

## Ausdrücklich nicht behandelt

**Die sieben Ränge aus „Eingefrorene Bildschirm-Zusicherungen" (01.09.2026).** Zug 0
widerlegte die gemeinsame Ursache mit den beiden Befunden oben (andere Aufrufer, andere
Funktionen — s. Kontext). Der Bericht selbst empfiehlt, Rang 1 zuerst vorzulegen und
in dieser Nacht nichts davon zu bauen; diese ADR folgt dem. Nebenbemerkung zur Auftragsformulierung
(„das eingefrorene ‚gesichert ✓'"): dieser Wortlaut kommt in besagtem Bericht nicht vor — dessen
Rang 1/2 sind Klartext-DOM-Reste nach App-Schließen/Vorschau-Verwerfen, nicht die Sicherungs-Pille.

**Der deutsche Standard-Dateiname** (`Mein-Vivodepot_…`, Bericht „Sichern-Knopf erster Klick",
Befund 2 dort) — eigener, ausdrücklich benannter Posten, hängt an einer offenen
Sprach-Produktentscheidung, nicht an dieser Fehlerklasse.

## Konsequenzen

Der Sichern-Knopf verliert keinen Klick mehr, nur weil im selben Moment ein zweites Feld autosave-
bedingt geblurrt wird. Die Statuskarte einer Feldgruppe zeigt den echten Füllstand, sobald ein Feld
den Bereich verlässt, ohne dass die Bürgerin den Bereich wechseln oder neu laden muss. Die
bestehende Fokus-Schutz-Garantie des Autosave-Pfads (kein `renderContent()`, kein
Eingabefeld-Knoten-Ersatz) bleibt unangetastet — beide Reparaturen patchen ausschließlich
Text/Label an bereits vorhandenen Knoten.

Offen, unverändert durch diese ADR: die sieben Ränge aus „Eingefrorene Bildschirm-Zusicherungen"
(s. oben) und der deutsche Standard-Dateiname.

## Konformität

Kein `konformitaet`-Block: alle drei Zusicherungen dieser ADR hängen an echter Maus-/Fokus-
Choreografie (mousedown vor mouseup, Blur-Reihenfolge zwischen zwei Feldern) — dieselbe
Werkzeuggrenze wie in U2-ADR-185 benannt (`.spec.js` statt `.test.js`, ein Node-Harness ohne echten
Browser sieht das nicht). Browser-Abnahme in `tests/e2e/anzeige-zustandssync-autosave.spec.js`,
drei Proben:

- **„Befund 1 — Sichern-Knopf verliert den Klick nicht, wenn ein zweites Feld noch fokussiert
  ist"** — rohes mousedown/mouseup auf `#tb-save-knopf`, Positivkontrolle: rot vor dieser Änderung
  (Zähler blieb bei „2 ungespeicherte Änderungen" hängen, keine Datei), grün danach.
- **„Befund 3 — Statuskarte zeigt ‚teilweise ausgefüllt' sofort nach dem Feld-Autosave, ohne
  Bereichswechsel"** — Positivkontrolle: rot vor dieser Änderung (Karte blieb bei „noch nichts
  eingetragen"), grün danach.
- **„Fokus-Schutz — Klick ins nächste Feld derselben Karte bleibt unterbrechungsfrei nach dem
  Autosave"** — die eigentliche Zusicherung dieses Auftrags: roher Klick in ein ZWEITES Feld
  DERSELBEN Karte unmittelbar nach dem autosave-auslösenden Blur des ersten. Grün SOWOHL vor als
  auch nach dieser Änderung — beweist, dass Reparatur 2 die Karte NICHT per vollem Rebuild
  nachzieht (das hätte diese Probe rot werden lassen, s. Kontext „Warum eine Reparatur, die nur
  Befund 2 behebt, gefährlich wäre").

---

*Vivodepot GmbH · Berlin · 01.09.2026*
