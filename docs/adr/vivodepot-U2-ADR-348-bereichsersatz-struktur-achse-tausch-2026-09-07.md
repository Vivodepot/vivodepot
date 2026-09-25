# U2-ADR-348 (vorläufig — Nummer beim Landen zu bestätigen) · Struktur-Achse: Tausch statt Ergänzung

**Datum:** 07.09.2026
**Status heute:** überholt (19.09.2026) — der hier entschiedene Ladeweg (`bereichsErsatz` am
eingebetteten Bündel) hat keinen Träger mehr: `BUERGERMODUL_BUENDEL` ist `const … = null`,
`bereichsErsatzPfad` ist für alle vier Produkte `null` seit der Entscheidung
vom 18.09.2026 abends („Gerüst + Templates = Produkt — was soll da ersetzt werden?").
Ein Produkt wird seither über `modulPfade` (`tools/lib/vier-produkte.js`) ZUSAMMENGESETZT, nicht
zur Ladezeit aus einem fertigen Produkt herausgenommen/ersetzt. Die STRUKTUR-Zusicherung selbst
(Pro zeigt sieben Bereiche, nicht dreizehn+sechs) gilt unverändert, nur über diesen anderen Weg
— lebende Deckung: `tests/vier-produkte-zusammensetzung.test.js`,
`tests/pro-modul-eingebaute-bereichs-grenze.test.js`. Die RUHENDE-BEREICHE-Zusicherung (ein
ersetzter nativer Bereich mit Werten in der Datei bleibt lesbar) gilt ebenfalls weiter, seit
19.09.2026 über `BEREICHE_NATIV_KATALOG` + `_sektorIndexNeuBauen()` statt über die im Bündel
verbliebene Definition — lebende Deckung: `tests/pro-ruhende-bereiche.test.js`,
`tests/pro-geweckter-bereich-beschriftet.test.js`. Der dynamische Ladeweg-Prüfer selbst
(`_bereichsErsatzPruefen`, validate-then-commit, Fremd-Bündel-Sperre) ist ohne Nachfolger — kein
Produkt lädt ein Modul, das native Bereiche zur Laufzeit ersetzt;
`tests/bereichsersatz-struktur-achse-u2-adr-348.test.js` ist darum ersatzlos entfernt. Kein
numeriertes ADR trägt die Ablöse-Entscheidung; sie steht als Patch-Kopf
(`vd-d2-zusammensetzen-statt-ersetzen-korb1-2026-09-18.patch`) und als Kern-Kommentar an
`_BEREICH_IDS_ERSETZT` (vivodepot.html). §1/§2 unten bleiben als Begründung des ERSTEN Trägers
dieser Entscheidung lesbar — beim additiven Umbau nicht neu zu verhandeln, nur die Umsetzung
wechselte.
**Gebaut:** 13 Proben grün (davon 6 Rot-Beweise), gegen den echten Ladeweg gemessen
**Rahmen:** Baukasten-Arbeitsplan, Block B
**Bezug:** U2-ADR-160 (`data.bereichssatz`, Etappe 2g), U2-ADR-253-Nachtrag (Registry bleibt vom
Bereichssatz unberührt), U2-ADR-292 (Content-Ersetzung eines bestehenden Sektors),
U2-ADR-296/311/319/320 (Objekt-Identität, Bündel-Vertrauen), U2-ADR-346 (`wizards`-Schlüssel als
jüngstes Vorbild für einen gleichrangigen Bündel-Zweig)

---

## 1 · Der Befund, den dieser ADR schließt

Eine vorangegangene Messung (B1) maß: das Gerüst kannte vier
unabhängige, nicht verdrahtete Bauformen für die Struktur-Achse — Herausnahme über
`data.bereichssatz` (filtert `bereicheAlle()`), Content-Ersetzung eines BESTEHENDEN nativen
Sektors (U2-ADR-292, Erlaubnisliste ausschließlich aus dem eigenen nativen Bestand), Neu-Erzeugung
über das eingebettete Bündel (`_bereichAusBuendelErzeugen`, reines Anhängen an `SEKTOREN`), und
Fremd-Andocken über `bereichsModulPruefen` (für die 13 nativen IDs strukturell blockiert,
`grund: 'reserviert'`). Keine der vier leistete „ein Pro-Modul ersetzt statt tritt daneben".

**U2-ADR-292 selbst wurde im Konzept enger zitiert, als es zusichert** (B1, Abschnitt 2, Frage 4):
seine Erlaubnisliste kommt „ausschließlich aus dem AKTUELLEN nativen Bestand des Sektors …
Nie aus dem einzulassenden Modul" (ADR-292 §2, wörtlich) — ein Pro-Modul kann über diesen Weg
keinen genuin fremden Feldsatz einbringen, nur eine Teilmenge/Neuordnung des Bestehenden.

---

## 2 · Die Entscheidung

**Ein neuer, gleichrangiger Bündel-Schlüssel `bereichsErsatz`**, wörtlicher Aufbau wie
`bereiche`/`situationen`/`dokumente`/`wizards`:

```js
bereichsErsatz: {
  ersetzt: ['identitaet', 'meine-menschen', ...],   // native IDs, BEREICH_IDS_EINGEBAUT
  neu: { 'pro-mandant': { sektionen: [...] }, ... }  // wie 'bereiche' heute, Bündel-Rohform
}
```

**Der Ort der Herausnahme (B2-Bauplan, Frage 4, entschieden 07.09.2026):** ein GERÜST-
Feld, `_BEREICH_IDS_ERSETZT`, NICHT `data.bereichssatz`. Begründung, gemessen, nicht nur
vermutet: `buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL)` läuft top-level beim Booten des
Kerns (`vivodepot.html:23379`, unverändert), `data` ist zu diesem Zeitpunkt garantiert `null`
(`let data = null;`, Zeile 14378) — eine Depot-Eigenschaft kann zum Zeitpunkt der Neu-Erzeugung
strukturell nicht existieren. **`data.bereichssatz` bleibt unangetastet** — ein eigener, davon
unabhängiger Mechanismus, kein Umbau des bestehenden.

**Validate-then-commit** (`_bereichsErsatzPruefen`): prüft den GANZEN Block — jede `ersetzt`-ID
muss in `BEREICH_IDS_EINGEBAUT` stehen, jede `neu`-ID darf NICHT mit einer eingebauten
kollidieren und muss mindestens ein Feld tragen (`_buendelBereichZuFeldDefs`) — BEVOR irgendetwas
mutiert wird. Ein einziger ungültiger Eintrag verwirft den KOMPLETTEN Block, auch für sich
genommen gültige Geschwister-Einträge — kein Zwischenzustand aus „ein paar native IDs weg, aber
der Ersatz dafür nicht vollständig da".

**Reihenfolge der Mutation, nur nach vollständig grüner Prüfung:**
1. jeder neue Sektor entsteht — derselbe Weg wie ein neuer Eintrag im bestehenden `bereiche`-Zweig
   (`_bereichAusBuendelErzeugen` + `buergermodulSektorErsetzen`, kein zweiter Mechanismus),
2. `_BEREICH_IDS_ERSETZT` wird gesetzt — DANACH, nicht davor (schlüge Schritt 1 trotz Prüfung
   durch einen Systemfehler fehl, bliebe sonst ein Depot ohne sichtbaren Ersatz für bereits
   ausgeblendete native Bereiche stehen),
3. `_sektorIndexNeuBauen()` — **voller** Neubau des Index, nicht der additive Patch, den
   `_bereichAusBuendelErzeugen` alleine schreibt.

**Schritt 3 ist der wichtigste, nicht nebensächlich** (B2-Bauplan, Frage 3, wörtlich: „dein
Befund … kippt die Erwartung"): `SEKTOR_BY_ID` trägt 70 direkte Lesestellen im Kern — fast doppelt
so viele wie `bereicheAlle()` (41/42, s. B1). `_bereichAusBuendelErzeugen` patcht den Index heute
nur additiv (`Object.assign`), entfernt nie. Ohne den vollen Neubau am Zugende bliebe eine
ersetzte native ID über den Index weiterhin auflösbar, obwohl `bereicheAlle()` sie längst nicht
mehr listet — **die Sorte Lücke, die nichts Rotes erzeugt**, solange nur `bereicheAlle()` geprüft
wird. Eigener Rot-Beweis dafür unten (Konformität, Zeile 3).

`bereicheAlle()` filtert `SEKTOREN` jetzt gegen `_BEREICH_IDS_ERSETZT`, UNABHÄNGIG von und
ZUSÄTZLICH zu `data.bereichssatz` (beide Filter wirken nacheinander, nicht ersetzend). Leer im
Regelbetrieb — der heutige Kanon-Bündel nutzt `bereichsErsatz` nicht —, dann ändert sich am
ausgelieferten Produkt nichts (eigener Regressionstest, Konformität, letzte Zeile).

**Der Riegel ist die Identität, nicht ein Feld** (wörtlicher Spiegel von U2-ADR-319): nur wer
`BUERGERMODUL_BUENDEL` SELBST übergibt (`buendel === BUERGERMODUL_BUENDEL`), darf `bereichsErsatz`
auslösen. Ein Fremd-Bündel mit identischem Inhalt, aber anderer Objekt-Identität, wird mit
`grund: 'nicht-eingebettet'` übersprungen — derselbe Mechanismus wie bei `dokumente`.

---

## 3 · Ausnahme vom `bereichssatz`-Filter — gemessen, dann entschieden

**Gemessen (erste Bau-Fassung dieses ADR):** ein über `bereichsErsatz` erzeugter Bereich lebt in
`SEKTOREN` selbst (`_bereichAusBuendelErzeugen` hängt an `SEKTOREN` an, NICHT an
`_BEREICHS_MODUL_REGISTRY`) — anders als ein über den Einlassweg angedockter Bereich, für den der
Kern-Kommentar an `bereicheAlle()` ausdrücklich festhält, er könne „nie in bereichssatz stehen".
Ohne Gegenmaßnahme wäre ein `bereichsErsatz`-Bereich darum dem `bereichssatz`-Filter unterworfen
gewesen: nennt eine Kanzlei/Institution einen `bereichssatz`, der die neue Pro-ID nicht enthält,
fiele das EIGENE Pro-Modul aus der eigenen Auswahl heraus, ohne dass etwas rot würde. Gemeldet,
nicht selbst repariert — der Ort der Herausnahme war bereits Entscheidung (Abschnitt 2),
diese Folgefrage gehörte ihr ebenso.

**Entschieden (07.09.2026, wörtlich):** *„bereichsErsatz-erzeugte Sektoren sind vom
bereichssatz-Filter ausgenommen — wie Registry-Bereiche heute schon. […] sie sind nicht eine
Auswahl innerhalb des Produkts, sie SIND das Produkt. Ein Depot-Feld, das älter ist als das Modul,
darf nicht darüber entscheiden, ob das Modul erscheint."* Dieselbe Linie wie der Ort der
Herausnahme (Abschnitt 2): konfektioniert schlägt Laufzeit.

**Umgesetzt:** `_BEREICH_IDS_AUS_ERSATZ`, ein zweites Gerüst-Feld neben `_BEREICH_IDS_ERSETZT`,
trägt die IDs der über `bereichsErsatz.neu` erzeugten Sektoren. `bereicheAlle()` nimmt sie vom
`bereichssatz`-Filter aus — wörtlicher Spiegel der bestehenden Registry-Ausnahme drei Zeilen
darunter im selben Kern-Kommentar. Native Bereiche bleiben dem Filter weiter unterworfen, nur die
Pro-ID ist ausgenommen (eigener Rot-Beweis, Konformität unten).

---

## 4 · Wofür das NICHT reicht — ausdrücklich

- Kein Vorschlag/keine Änderung für Sprache-, Recht- oder Branding-Achse — wie B1/B2 auf die
  Struktur-Achse begrenzt.
- `_textsatzAufSektorenAnwenden` nach einem vollen `_sektorIndexNeuBauen()` bleibt plausibel
  konsistent (der Index-Neubau berührt den Textsatz nicht), aber nicht einzeln durchgespielt
  über einen Fall mit MEHREREN neuen Sektoren gleichzeitig.
- **Anforderung an das Bündel, nicht offene Frage (07.09.2026):** ein `bereichsErsatz.neu`-
  Eintrag MUSS ein `icon` tragen. Ohne eines erzeugt `_bereichAusBuendelErzeugen` beim Rendern
  `console.warn('Icon fehlt: …')` und fällt auf einen Platzhalter zurück (bestehendes Verhalten,
  nicht neu eingeführt) — eine Warnung, die niemand nach der dritten Woche mehr liest, ist keine
  Durchsetzung. Dieser ADR schreibt die Anforderung fest, baut aber KEINE eigene, hartere Prüfung
  dafür (kein `_bereichsErsatzPruefen`-Riegel für fehlendes Icon) — das wäre ein eigener Zug,
  keine Zeile in diesem.

---

## Konformität

```yaml
konformitaet:
  - aussage: >-
      _bereichsErsatzPruefen, der Prüfer des seit 19.09.2026 toten Ladewegs, verwarf einen
      ungültigen bereichsErsatz-Block (Kollision, unbekannte native ID, ein neu-Eintrag ohne
      Felder) GESAMT — auch für sich genommen gültige Geschwister-Einträge kamen nicht durch.
      Kein Nachfolger: kein Produkt ersetzt native Bereiche mehr zur Ladezeit.
    zustand: entfallen
    herkunft: U2-ADR-348 (07.09.2026), entfallen 19.09.2026

  - aussage: >-
      Nach einem gültigen Zug ist kein einziger ersetzter nativer Bereich mehr in bereicheAlle()
      sichtbar, und jede angekündigte neue ID ist wirklich da. Seit 19.09.2026 gilt das Ergebnis
      über das Zusammensetzen (modulPfade), nicht mehr über einen Zug zur Ladezeit.
    zustand: erfuellt
    herkunft: U2-ADR-348 (07.09.2026)
    pruefung:
      - tests/vier-produkte-zusammensetzung.test.js
      - tests/pro-modul-eingebaute-bereichs-grenze.test.js

  - aussage: >-
      SEKTOR_BY_ID (70 direkte Lesestellen im Kern) war nach dem Zug bereinigt, nicht nur die
      gefilterte Liste bereicheAlle() — der volle Indexneubau (_sektorIndexNeuBauen) lief am
      Zugende. Seit 19.09.2026 ohne Gegenstand: ein zusammengesetztes Produkt baut SEKTOR_BY_ID
      einmal beim Booten aus seiner eigenen modulPfade-Auswahl, es gibt keinen Übergang zwischen
      zwei lebendigen Zuständen mehr, den man unvollständig lassen könnte.
    zustand: entfallen
    herkunft: U2-ADR-348 (07.09.2026), B2-Bauplan Frage 3, entfallen 19.09.2026

  - aussage: >-
      Der Riegel war die Objekt-Identität der eingebetteten BUERGERMODUL_BUENDEL-Konstante, nicht
      ein Feld — ein Fremd-Bündel mit identischem Inhalt durfte keinen bereichsErsatz auslösen.
      Seit 19.09.2026 ohne Gegenstand: BUERGERMODUL_BUENDEL ist `const … = null`.
    zustand: entfallen
    herkunft: U2-ADR-348 (07.09.2026), wörtlicher Spiegel von U2-ADR-319, entfallen 19.09.2026

  - aussage: >-
      Ein bereichsErsatz-erzeugter Bereich war vom bereichssatz-Filter AUSGENOMMEN — ein
      bereichssatz, der die neue Pro-ID nicht nennt, durfte sie nicht ausblenden (Entscheidung
      vom 07.09.2026: „sie sind nicht eine Auswahl innerhalb des Produkts, sie SIND das
      Produkt"). Native Bereiche blieben vom bereichssatz-Filter weiter erfasst. Seit 19.09.2026
      gilt dasselbe Ergebnis über die ÄLTERE, allgemeinere Registry-Ausnahme (U2-ADR-253-
      Nachtrag: ein Registry-Bereich mit fremder — nicht eingebauter — ID bleibt vom
      bereichssatz-Filter unberührt, unabhängig von seiner Herkunft), nicht mehr über die
      bereichsErsatz-spezifische _BEREICH_IDS_AUS_ERSATZ.
    zustand: erfuellt
    herkunft: U2-ADR-348 (07.09.2026)
    pruefung:
      - tests/pro-modul-eingebaute-bereichs-grenze.test.js

  - aussage: >-
      Ohne bereichsErsatz im Bündel ändert sich an bereicheAlle() nichts — alle dreizehn nativen
      Bereiche bleiben unverändert sichtbar. Gilt unverändert für Privat, das seit 19.09.2026
      alle dreizehn Templates einbäckt statt einen Bündel-Zustand ohne bereichsErsatz zu messen.
    zustand: erfuellt
    herkunft: U2-ADR-348 (07.09.2026)
    pruefung:
      - tests/vier-produkte-zusammensetzung.test.js
```

---

*Gebaut in einer eigenen Sitzung, eigener Zweig
`bereichsersatz-struktur-achse` auf `55735151`, eigener Arbeitsbaum außerhalb des
Hauptrepos (eigener Wegwerf-Baum). Kein Commit ohne
Freigabe.*
