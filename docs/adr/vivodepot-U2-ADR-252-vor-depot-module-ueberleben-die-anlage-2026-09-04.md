# U2-ADR-252: Ein vor dem Depot angedocktes Modul übersteht die Depot-Anlage — auf beiden Schichten

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Linie:** U2
**U2-Bezug:** U2-ADR-145 (Einlassweg), U2-ADR-146 (viertes Register), U2-ADR-182 (Vor-Depot-Konfiguration),
U2-ADR-246/250/251 (achtes/neuntes/zehntes Register)
**Status heute:** gilt — alle drei Teile gebaut und verifiziert (Live-Registry-Geister behoben,
Rückgabewert gehalten, Generalisierung auf alle zehn Register unter Kanal B). Details je Teil in
den Nachträgen unten.

---

## Kontext

Drei nie gelandete Commits vom 31.08.2026 (Zweig `ux-navigation-rahmen-wizard`, ohne ADR-Nummer,
vier Tage unauffindbar) fanden: `vorDepotKonfigurationAnwenden()` prüft ein vor dem Depot
angedocktes Modul vollständig (volle Zertifikatskette), aber ihr einziger Aufrufer
(`booteEingang()`) verwirft das Ergebnis. Nur `textsatz` überlebt seit einer engeren Reparatur vom
01.09.2026 (`_vorDepotModulInsDepotUebernehmen()`) — die übrigen neun Registertypen nicht.

Ein paralleler Trockenlauf (Bürgerinhalte als Modul behandeln, gegen volle Referenzdepots
vergleichen) fand eine ZWEITE, unabhängige Schicht: sieben Registertypen führen zusätzlich eine eigene,
modul-globale Live-Registry, die beim Anlegen eines neuen Depots nie zurückgesetzt wird — ein
„Geist" (Anzeige ohne gespeicherten Zustand), unabhängig davon, ob Schicht A (Speicherung)
funktioniert.

**Die eigentliche Entwurfsfrage:** Über welchen Kanal soll ein Modul künftig ankommen?

- **Kanal A — Vorschau → Anker.** Ein Bürger probiert eine Vorschau aus, entscheidet sich, das
  Depot entsteht daraus (`vorschauDatenUebernehmen`).
- **Kanal B — Vorkonfektioniert ausgeliefert.** Ein Anbieter provisioniert ein Modul vor der
  Depot-Anlage (`vorDepotKonfigurationAnwenden`, volle Signaturkette, bestehende Infrastruktur).

## Entscheidung

**Kanal B — vorkonfektioniert ausgeliefert.** eigene Taxonomie trägt die Entscheidung
wörtlich: „Ein Template wird vom Bürger in die App geladen, ein Modul wird provisioniert." Das
Bürgerdepot selbst wird im laufenden Gerüst-Umbau zu einem Modul — käme es über den Vorschau-Weg herein,
verhielte es sich wie ein Template, obwohl es ausdrücklich keins ist. Dazu: Kanal B skaliert mit
Produkten statt mit Nutzerinnen, läuft bereits heute durch die volle Signaturkette
(`modulEinlassenGeprueft`), und ist Ende-zu-Ende automatisierbar — die Modulprüfungs-Ampel
(`tools/modulpruefung-ampel.js`) sitzt genau in dieser Kette.

Die Betriebsfrage — WANN signiert wird (bei jedem Build automatisch, oder einmalig gepflegt) —
bleibt offen und blockiert diesen Bau nicht: die Infrastruktur existiert, nur der Ablauf ist
unentschieden (s. Nachtrag zum Konzept-Dokument, 03.09.2026 abends).

### Drei getrennte Teile, drei getrennte Commits

Wenn einer zurückgenommen werden muss, sollen die anderen stehen bleiben können.

**Teil 1 — Live-Registry-Geister beheben.** Keine Produktentscheidung, unabhängig von Kanal A/B:
sieben Registertypen (bereich, situation, wizard, ereignisAchse, rechtsraum, textsatz,
institutionsArt) setzen ihre Live-Registry beim Anlegen eines neuen Depots nicht zurück.
`depotAnlegen()` und `vorschauDepotErzeugen()` rufen jetzt `_alleModulRegisterAusDepotAnmelden(data)`
— dieselbe, bereits an zwei Stellen genutzte Funktion. In `depotAnlegen()` zusätzlich zu (nicht
statt) dem bestehenden `_sektorIndexNeuBauen()`-Aufruf, der zusätzlich `data.bereichsIdentitaeten`
schreibt, was die neue Funktion nicht tut — geprüft, nicht angenommen, ein Ersetzen hätte dieses
Verhalten stillschweigend verloren.

**Teil 2 — Der weggeworfene Rückgabewert.** `booteEingang()` nimmt das Ergebnis von
`vorDepotKonfigurationAnwenden()` nie entgegen (`.then(() => {…})`) — acht von zehn Registern
wurden geprüft, akzeptiert und dann fortgeworfen. Unabhängig von jeder Kanal-Entscheidung: die
Funktion hält jetzt ihr eigenes Ergebnis selbst (`_vorDepotZielGecached`), wie es
`_vorDepotTextsatzModule` für textsatz bereits seit dem 01.09. tut — kein neuer Mechanismus, nur
verallgemeinert.

**Teil 3 — Die Generalisierung.** `_vorDepotModulInsDepotUebernehmen()` von textsatz-hartcodiert
auf alle zehn Register — jetzt entschieden (Kanal B), vorher offen. Jedes Register bringt sein
eigenes `einbetten()` bereits mit (`EINLASS_REGISTER`), kein zweiter Vergleichsweg nötig.

## Verifikation

**Teil 1:** Rot-Beweis je betroffenem Typ (`tests/u2-adr-252-live-registry-geister.test.js`) —
sieben anfällige Typen einzeln vor/nach `depotAnlegen()`/`vorschauDepotErzeugen()` geprüft, plus
zwei Positivbelege für `format`/`logikModul` (strukturell geistfrei, kein eigener Cache, direkt
gegen `data` gemessen statt angenommen). 23/23 grün nach dem Fix.

**Teil 2/3:** folgen als Nachtrag unten, sobald gebaut — mit eigenem Rot-Beweis je Register auf
beiden Schichten (gespeichert UND angezeigt) und einem Browser-Abnahmetest (provisioniertes
Modul, frisch angelegtes Depot, Inhalte da — und nach dem Neuladen immer noch).

## Konsequenzen

- Ausdrücklich NICHT Teil von Teil 1: ob ein vor dem Depot angedocktes Modul selbst in `data`
  landet (Schicht A). Teil 1 betrifft nur, ob die Anzeige der Speicherung folgt.
- Kanal A (`vorschauDatenUebernehmen` um die Register-Slots erweitern) wird durch diese
  Entscheidung nicht gebaut — bewusst offen gelassen, nicht vergessen, für den Fall, dass ein
  künftiger Anwendungsfall doch den Vorschau-Weg braucht.
- Wie die verwaiste Arbeit vier Tage unauffindbar blieb (keine ADR-Nummer, kein Bericht, eine
  Prüfung, die nach der Nummer statt nach dem Inhalt suchte) — derselbe Mechanismus traf heute
  Nacht einen zweiten, unabhängigen Fund (Sichern-Knopf-Fix vom 01.09.). Diese ADR-Nummer und
  dieser Bericht sind die Gegenmaßnahme für genau diesen Fall.

---

## Nachtrag (04.09.2026) — Teil 2 gebaut: der Rückgabewert wird nicht mehr verworfen

`vorDepotKonfigurationAnwenden()` lieferte ihr geprüftes `ziel` (alle zehn Slots) schon immer
zurück — ihr einziger Aufrufer nahm den Wert nur nie entgegen. Unabhängig von jeder Kanal-
Entscheidung: die Funktion hält jetzt ihr eigenes Ergebnis selbst (`_vorDepotZielGecached`),
demselben Griff, den `_vorDepotTextsatzModule` für `textsatz` bereits seit dem 01.09.2026 nutzt —
kein neuer Mechanismus, nur verallgemeinert. Der Aufrufer selbst bleibt unverändert; er muss den
Rückgabewert nicht mehr konsumieren, weil die Funktion ihn nicht mehr braucht, um ihn zu behalten.

Rot-Beweis (`tests/u2-adr-252-vordepot-ergebnis-nicht-verworfen.test.js`): bewiesen ALLEIN aus der
Kontrollflussstruktur, unabhängig vom Bundle-Inhalt — auch eine leere Bündel-Liste reicht, um zu
zeigen, dass das Ergebnis jetzt gehalten wird. Vor dem Fix lieferte ein neu exponierter Halter
(`_vorDepotZielGecachtHalter`, `tests/load-kern.js`, dasselbe Muster wie
`_subSelbstUmschlagHalter`) durchgängig `null`; danach hält er zuverlässig das zuletzt berechnete
`ziel`. 4/4 grün.

Kein eigener Bericht — dieser Nachtrag und der Commit sind der Beleg.

---

## Nachtrag (04.09.2026) — Teil 3 gebaut: alle zehn Register, Kanal B

`_vorDepotModulInsDepotUebernehmen()` von `textsatz`-hartcodiert auf alle zehn Register
generalisiert — jedes Register bringt sein eigenes `einbetten()` bereits mit
(`EINLASS_REGISTER`), kein zweiter Vergleichsweg nötig. `textsatz` bleibt auf seinem eigenen,
bereits bestätigten Weg (eigener Block, inklusive `textsprache`-Sonderbehandlung) — zwei Wege für
denselben Typ wären eine zweite Fehlerquelle.

**Beim eigenen Rot-Beweis eine echte Lücke gefunden, die zu Teil 1 gehört hätte:**
`vorschauDepotErzeugen()` rief bislang nur die Geister-Reparatur (Schicht B), nicht die
Datenübernahme (Schicht A) — zum Zeitpunkt von Teil 1 durfte Kanal B noch nicht gebaut werden,
darum fehlte der Aufruf dort begründet, nicht versehentlich. Nachgezogen: beide Anlegewege rufen
jetzt `_vorDepotModulInsDepotUebernehmen()` VOR `_alleModulRegisterAusDepotAnmelden(data)`, damit
die Live-Registry sofort den frisch übernommenen Inhalt sieht.

**Ankommen ist nicht wirken — geprüft, nicht angenommen (Rechtsraum-Warnung):**

- `bereich`/`situation`/`wizard`/`ereignisAchse`/`rechtsraum`/`textsatz`/`institutionsArt`: wirken
  über die Live-Registry, die Teil 1 bereits korrekt aus `data` aufbaut.
- `format`/`logikModul`: lesen `data` bei jedem Zugriff direkt, kein Zwischenspeicher — wirken per
  Konstruktion, sobald sie in `data` stehen.
- `branding`: `depotLaden()` wendet `data.brandingModule` bereits an einer eigenen, vorbestehenden
  Stelle an (U2-ADR-182 Task 4) — Teil 3 schließt nur die Speicher-Lücke, der Anwendungsweg stand
  schon.
- **Rechtsraum, ehrlich benannt:** Modul und Live-Registry sind korrekt befüllt, aber jeder
  bekannte Aufrufer von `_rechtsraumKatalogLesen` übergibt heute hart `'DE'` — ein docktes
  Rechtsraum-Modul ist damit vollständig gespeichert und angezeigt, aber inhaltlich ungenutzt.
  Dieselbe Lücke wie beim Rechtsraum-Katalog selbst, nicht durch diesen Commit verursacht und
  nicht in seinem Umfang geschlossen — hier nur ehrlich mitgeführt statt verschwiegen.

**Mehrfach-Fall:** Realistischer als der isolierte Fall — ein Produkt trägt meist mehrere
provisionierte Module gleichzeitig (Gerüst + Pro + Textsatz + Rechtsraum). Eigener Rot-Beweis:
fünf gleichzeitig angedockte Module, zwei davon `bereich` mit unterschiedlicher Herkunft — beide
landen, keins verdrängt das andere, auf beiden Schichten geprüft.

**Rot-Beweis:**
- `tests/u2-adr-252-vordepot-modul-ueberleben.test.js` — Schicht A (`data[slot]`), zehn Typen
  einzeln über `depotAnlegen()`, dieselben zehn über `vorschauDepotErzeugen()`, die Naht zum
  Vorschau-Übergang, Bestandsschutz, der Mehrfach-Fall. Alle grün.
- `tests/u2-adr-252-live-registry-geister.test.js` (aus Teil 1, hier erneut grün) — Schicht B.
- `tests/e2e/u2-adr-252-provisioniertes-modul-durchgang.spec.js` — der Browser-Abnahmetest:
  echter Browser, echte `depotAnlegen()`-Weiche über die UI, ein über den sanktionierten
  Test-Parameter `opts.ankerJwk` signiertes Modul (kein echtes Schlüsselmaterial, derselbe
  Wegwerf-Sentinel-Anker wie überall sonst in dieser Suite) — Inhalt erscheint sofort, UND nach
  echtem Neuladen + Wiederöffnen der gespeicherten Datei immer noch. Grün.

---

*Vivodepot GmbH · Berlin · 04.09.2026*
