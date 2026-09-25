# U2-ADR-313 · Der Produktabnahmebeweis, E4-Assistenten-Interaktion — und ein stiller schwerer Fund

**Datum:** 05.09.2026
**Status:** gebaut, vier Proben grün — davon EINE mit einem eigenständigen, schweren Fund
(§5), nicht nur einer bestandenen Gegenprobe. **Fund behoben, s. §8 (06.09.2026).**
**Status heute:** gilt — deckt den heutigen Kanon (nach dem §8-Fix, `SCHALEN_STAND` v577)
**Bezug:** U2-ADR-310 (Node-Ebene — Kern bootet, bricht mit/ohne Bündel nicht) · U2-ADR-304/312
(WIZARDS/SEKTOREN-Konstruktionsabsturz, jetzt behoben) · U2-ADR-311 (`get optionen()` statt
Schnappschuss) — **§5 dieser ADR zeigt: die Behebung aus 311/312 hat einen NEUEN, bisher
unsichtbaren Fehlerpfad geöffnet, keinen geschlossen**

---

## 1 · Der Auftrag — nicht „bootet", sondern „fühlt sich für die Bürgerin richtig an"

Der Auftrag, nach U2-ADR-310/312: „Der Konstruktions-Absturz ist weg. Was danach an echtem
Rendering und Interaktion passiert, ist ungemessen." Das Produktabnahmekriterium:
„Am Ende möchte ich 'mein' Bürgerdepot haben. Als wäre nichts gewesen." Ein Kern, der lädt
und dann eine kaputte Oberfläche zeigt, hat das Kriterium nicht erfüllt.

Drei verlangte Proben, ECHTES DOM/Klick/Eingabe (Playwright, nicht Node):

```
1. Depot MIT Bündel     Assistent läuft durch, Optionsliste befüllt, Auswahl wirkt
2. pvwiz, eigener Lauf   der Vorsorge-Assistent — hatte als einziger einen eigenen Guard
3. Depot OHNE Bündel     leere, aber BEDIENBARE Oberfläche
Gegenprobe               ein Feld weglassen — der Schritt ändert sich sichtbar
```

---

## 2 · Vehikel und Methode

`heirwiz`/`familienstand` — Schritt 1, ohne `verborgenWennKeinVerweis`-Gate, UND einer der
zwei katalogfelder mit `erlaubteWerte`-Filter (`['verh','elp']`), also genau der Fall, den
U2-ADR-311 gerade erst vom Auswertungszeit-Schnappschuss befreit hat. `pvwiz`/
`pv_vollmacht_besprochen` — eigener Durchlauf, mit injizierter Vorbedingung (eine
Vorsorgevollmacht-Instrumentzeile, derselbe etablierte Weg wie
`nachlese-f8-m1-zug4-abnahme.spec.js`s `bauteZeile`; das ANLEGEN der Zeile über echte Klicks
deckt bereits `pvwiz-instrument-zeile-abnahme.spec.js` ab, hier ging es um die
BESPROCHEN-Auswahl selbst). „Depot ohne Bündel" simuliert per Quelltext-Substitution
(`BUERGERMODUL_BUENDEL = null`, dieselbe Technik wie U2-ADR-304/310) — bewusst VOR dem
Schnitt gebaut, den `87` gerade am nativen Bestand vornimmt.

---

## 3 · Proben 1–3 — grün, wie erwartet

- **Probe 1:** `select[data-edit="familienstand"]` trägt genau `['elp','verh']` (die
  WIZARD-EIGENE, gefilterte Menge — NICHT die volle native Sechser-Liste). Echte Auswahl
  (`verh`), echter Klick auf „Weiter", `data.sektoren.identitaet.familienstand === 'verh'`.
- **Probe 2:** Ohne die injizierte Vorsorgevollmacht-Zeile bleibt der Schritt (korrekt)
  unsichtbar; MIT ihr erscheint `select[data-edit="pv_vollmacht_besprochen"]` mit
  `['ja','nein']`, echte Auswahl wirkt, Wert landet im Depot.
- **Probe 3:** Mit `BUERGERMODUL_BUENDEL = null` startet `heirwiz` unverändert — echter
  Start-Knopf, echte Frage, echte, beschriftete Optionsliste, „Weiter" bedienbar. Keine tote
  Oberfläche.

---

## 4 · Die Gegenprobe — geplant als Zahnprobe, geworden zum Hauptfund

Geplant: `identitaet.person.familienstand` aus dem Bündel weglassen, prüfen, dass `heirwiz`
sichtbar anders reagiert als der gesunde Fall (Gegenprobe zu Probe 1). **Der erste Lauf ging
nicht „anders" — er ging KATASTROPHAL, still.**

---

## 5 · Der Fund — die GESAMTE Seitenleiste zeigt „undefined", ohne einen einzigen Konsolen-Fehler

**Beobachtet:** nach dem Weglassen von `familienstand` zeigt die Seitenleiste für ALLE
DREIZEHN Bereiche „undefined" statt echter Namen („Identität & Person" → „undefined",
„Meine Menschen" → „undefined", … alle dreizehn). Kein Wurf in der Konsole. Kein
`pageerror`. Der native Bestand selbst ist unverändert — nur EIN Bündel-Feld fehlt.

**Kontrollen, die einen Fehler in der eigenen Meßapparatur ausschließen:**
- Dasselbe Bündel, UNVERÄNDERT durch `echtesBuendelLesen`/`mitBuendel` reserialisiert (kein
  Feld weg) → alle dreizehn Labels korrekt, vor UND nach `depotAnlegen()`, auch nach 3s
  Wartezeit.
- Direkt nach dem Laden (vor `depotAnlegen()`): im MUTIERTEN Fall bereits alle 13 Labels
  `null`; im unveränderten Kontroll-Fall durchgehend korrekt.
- `textLesen('identitaet.label')` liefert MANUELL aufgerufen weiterhin den korrekten String
  — die Übersetzungstabelle selbst ist intakt.

**Ursache, Zeile für Zeile nachgemessen:**

1. `booteEingang()` ruft **unbedingt**, auch ganz ohne jedes Vor-Depot-Modul,
   `vorDepotKonfigurationAnwenden()` — und die ruft darin **unbedingt** `textsatzNeuAnwenden()`
   (vivodepot.html, Kommentar an der Aufrufstelle: „Fund 28.08.2026 … der Vor-Depot-Weg
   fehlte").
2. `textsatzNeuAnwenden()`: `_textsatzOrteBegehen(_TEXTSATZ_ZURUECK)` — **nimmt zuerst ALLE
   Beschriftungen zurück** (Sektoren, Situationen, Assistenten, in dieser Reihenfolge), dann
   erst `_textsatzOrteBegehen(_TEXTSATZ_FUELLEN)` — füllt neu.
3. Die RÜCKNAHME selbst begeht dieselben Orte wie die Füllung, in derselben Reihenfolge:
   Sektoren zuerst (löscht deren Labels — sicher, keine Prüfung, reiner `delete`), dann
   Assistenten. Bei `WIZARDS` läuft `_textsatzFeldFuellen` — UNABHÄNGIG davon, ob es um
   Rücknahme oder Füllung geht — immer über `feld.optionen` (`for (const o of
   (Array.isArray(feld.optionen) ? feld.optionen : []))`).
4. `heirwiz.familienstand`s `feld.optionen` ist seit U2-ADR-311 ein **`get`**:
   `_katalogOptionen('identitaet', 'familienstand', ['verh','elp'])`. Der native Bestand kennt
   `familienstand` nicht mehr (aus dem Bündel entfernt) — `_katalogOptionen` **wirft**
   (`_katalogOptionen: kein Katalogfeld identitaet.familienstand mit optionen gefunden`),
   bestätigt: manueller `textsatzNeuAnwenden()`-Aufruf nach dem Boot wirft denselben Satz
   wortgleich.
5. Der Wurf verlässt `textsatzNeuAnwenden()` UNGEFANGEN — **nach der Rücknahme (alle 13
   Sektor-Labels bereits gelöscht), vor der Neubefüllung (nie erreicht)**.
6. `vorDepotKonfigurationAnwenden()`s äußeres `try { … } catch (e) { /* defensiv — ein
   kaputtes Vor-Depot-Modul darf den Boot nie verhindern */ }` **schluckt die Ausnahme
   lautlos** — genau die Zeile, die genau dafür gebaut wurde, ein kaputtes Vor-Depot-Modul
   nicht den Boot verhindern zu lassen, verhindert hier auch keine STILLE, dauerhafte
   Verstümmelung der Seitenleiste zu melden.

**Das ist kein Rand-, sondern ein Kernfund für die aktuelle Arbeit:** U2-ADR-311/312 haben
`_katalogOptionen` bewusst von einer Auswertungszeit-Bindung auf eine Lesezeit-Bindung
umgestellt (`get optionen()`), genau um Frische statt Schnappschuss zu erreichen — richtig
für den Fall, den sie behoben haben (Objektidentität, Konstruktionsabsturz bei leerem
`SEKTOREN`). **Dieselbe Lesezeit-Bindung öffnet aber einen NEUEN Wurf-Ort, der VORHER nicht
existierte:** vorher war `optionen` ein bei der Auswertung eingefangener WERT (kann beim
Textsatz-Rücknahme/Füllen-Lauf nie werfen, ein Array ist ein Array); jetzt ist es ein Aufruf,
der bei JEDEM Lesen — auch einem, der nichts mit Rendern oder einer Bürgerin-Handlung zu tun
hat — gegen den LIVE-Bestand prüft und wirft, wenn der nicht mehr passt.

**Reichweite:** JEDE der acht `_katalogOptionen`-Stellen in `WIZARDS` ist betroffen, sobald
das zugehörige native Feld aus dem Bündel fehlt — nicht nur `familienstand`. Und der Schaden
ist nicht auf den betroffenen Assistenten beschränkt: weil die Rücknahme ALLER Orte vor der
Neufüllung passiert und der Wurf mitten in der Rücknahme (bei den Assistenten, nach den
Sektoren) auftritt, verlieren ALLE DREIZEHN SEKTOREN ihre Beschriftung, nicht nur der, dessen
Feld fehlt.

---

## 6 · Was das für `87`s laufenden Schnitt bedeutet

**Dies ist kein hypothetischer Rand-Fund — `87` entfernt gerade den nativen Bestand.** Jedes
Bereichsfeld, das während dieses Schnitts vorübergehend oder endgültig aus dem Bündel
verschwindet, während sein Katalog-Verweis in `WIZARDS` bestehen bleibt, löst denselben
stillen Seitenleisten-Ausfall aus — **ohne eine einzige Fehlermeldung, die den Schnitt
selbst als Ursache erkennen ließe.**

**Nicht in dieser ADR entschieden, weil es keine Meß-, sondern eine Baufrage ist:** ob die
Behebung an `_katalogOptionen` selbst ansetzt (z. B. bei fehlendem Feld `[]` statt zu werfen
— dieselbe Kulanz, die 87 für „Bereich fehlt ganz" schon beschrieben hat, hier für „Feld
fehlt einzeln"), oder ob `vorDepotKonfigurationAnwenden`s äußeres catch den Fehler wenigstens
LAUT machen sollte (`console.error` statt stillem Schlucken), oder beides. Zur Entscheidung
vorgelegt.

---

## 7 · Was das NICHT zeigt

- Nur `heirwiz`/`familienstand` und `pvwiz`/`pv_vollmacht_besprochen` sind ECHT durchlaufen —
  die übrigen sechs `_katalogOptionen`-Stellen und `pv_betreuung_besprochen` sind NICHT
  einzeln nachgeprüft; §5s Reichweiten-Aussage folgt aus dem gemeinsamen Mechanismus
  (`_textsatzFeldFuellen`/`feld.optionen`-Zugriff), nicht aus acht Einzelmessungen.
- **Bei Bau dieser ADR kein Fix — reine Landkarte, wie U2-ADR-304. Inzwischen behoben,
  s. §8.**

---

## 8 · Nachtrag 06.09.2026 — der Seitenleisten-Ausfall ist behoben, Entscheidung

Auftrag, nach diesem Fund: „Das `catch` wird laut. Unbedingt, unabhängig von der
Ursache… Der Prüfer bleibt streng — keine Änderung an `_katalogOptionen`." Der
Kulanz-Vorschlag aus einer früheren Fassung dieser ADR (`_katalogOptionen` bei fehlendem
Einzelfeld nachsichtig machen) wurde AUSDRÜCKLICH ZURÜCKGEWIESEN: die zweite Zeile
(„Bereich da, Feld fehlt → WURF") ist die einzige Stelle, an der ein Tippfehler im
Bündel-JSON überhaupt noch auffällt — Kulanz dort hieße leiser, nicht besser.

**Gebaut: zwei stille `catch`-Blöcke laut gemacht, beide um `textsatzNeuAnwenden()`:**

- `vorDepotKonfigurationAnwenden()` (der ursprünglich hier gefundene Ort).
- `_alleModulRegisterAusDepotAnmelden()` — UNABHÄNGIG wiedergefunden beim Prüfen der
  Behebung: dieselbe Funktion läuft bei JEDEM Depot-Übergang (Vorschau, Anlegen, Laden,
  Sub-Kontext-Wechsel, Reset — Kommentar an der Definition), und ihr eigener, schon
  bestehender `catch (e) { /* dito */ }` verschluckte denselben Wurf ERNEUT, direkt beim
  Klick auf „Jetzt anfangen" (Vorschau) — VOR jedem Anker-Dialog. Ohne diesen zweiten Fix
  hätte die Bürgerin die kaputte Seitenleiste trotzdem gesehen, nur einen Klick später.

**Beide Stellen jetzt identisch behandelt:** `console.error(...)` (unbedingt, mit der
Original-Ausnahme) + ein bestmöglicher Wiederherstellungsversuch — NUR der Füll-Lauf
(`_textsatzOrteBegehen(_TEXTSATZ_FUELLEN)`) erneut, NICHT die Rücknahme (die war die Stelle,
an der es warf; ein zweiter Versuch der Rücknahme würfe an derselben Stelle wieder, bevor er
je zum Füllen käme). Der Füll-Lauf begeht dieselben Orte in derselben Reihenfolge (Sektoren
vor Assistenten) — was er VOR der defekten Stelle erreicht, bekommt seine Beschriftung
zurück, auch wenn die defekte Stelle selbst erneut wirft.

**Gemessen, nicht angenommen** (`e4-buendel-wizard-interaktion-abnahme-u2-adr-313.spec.js`,
Gegenprobe neu gefasst):
- Depot anlegen hängt nicht mehr (der Notfall-Blatt-Dialog, der vorher nie erschien, weil der
  Vorschau-Weg selbst über den kaputten Textsatz-Lauf stolperte, erscheint jetzt normal).
- Die Seitenleiste ist NACH der Wiederherstellung inhaltlich IDENTISCH zum gesunden Fall.
- Mindestens einer der beiden Fixes meldet sich tatsächlich in der Konsole.

**Bewusst NICHT behoben, benannte Grenze:** öffnet die Bürgerin `heirwiz` TROTZDEM (der
Assistent, dessen Schritt genau das fehlende Feld zeigen will), stürzt der Schritt weiterhin
mit einem echten, UNCAUGHT `pageerror` ab — `_katalogOptionen` wirft dort unverändert
(Entscheidung, s. o.), und dieser eine Aufruf ist bislang von keinem `catch`
umgeben. Das ist kein stiller Ausfall mehr (ein echter Fehler erscheint, sichtbar in der
Konsole/den Playwright-`pageerror`-Events), aber auch keine Behebung — außerhalb dieses
Auftrags, eigene Einordnung: „Die eigentliche Lücke ist die Erzeuger-Deckung, nicht
die Toleranz" — Gegenstand von 87s Bündel-Erzeuger, nach dem Schnitt.

**Landung:** `SCHALEN_STAND`/`sw.js` CACHE v576 → v577, `vivodepot.html.sha256` neu erzeugt.

---

*Vivodepot GmbH · Berlin · 05.09.2026, Nachtrag 06.09.2026*
