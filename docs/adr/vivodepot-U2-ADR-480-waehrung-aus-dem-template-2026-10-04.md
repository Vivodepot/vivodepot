# U2-ADR-480 · Währung aus dem Template

**Status:** Akzeptiert, gebaut (Leseregel `textsatzWaehrung`, Rechtsraum-Template mit `regeln.waehrung`, ELSTER, Studio, ISO 4217 selbst laden). Entwurf freigegeben 03.10.2026, gebaut 04.10.2026, auf den Rechtsraum der Zusammenstellung nach U2-ADR-504 §3 umgestellt 17.10.2026.
**Datum:** 04.10.2026
**Kategorie:** ARCHITEKTUR, GERÜST/TEMPLATE, STANDARDS
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`TEXTSATZ_REGELN_EINGEBAUT`, `_textsatzRegelnPruefen`, `textsatzWaehrung`, `_rechtsraumAbWerkModul`, `_rechtsraumRegelnGrund`, `validateRechtsraumModul`, `_RECHTSRAUM_MODUL_SCHLUESSEL`, `IMPORT_FORMATE` Eintrag `elster`, `_elsterFelder`, `codeListeAnmelden`, `codeListeAnzeigeName`, `ISO4217_PIN`, `iso4217Einlesen`, `iso4217CodesImGebrauch`, `iso4217Abgleich`, Region CODE-LISTEN), `vivodepot-lesen.html` (`TEXTSATZ_REGELN_EINGEBAUT`, `_textsatzRegelnPruefen`), `vivodepot-studio.html` (Vorlage `notariat`, `VD_CODE_LISTEN.iso4217`), `tools/rechtsraum-de-modul.json`, `docs/rechtsraum-modul/rechtsraum-modul-schema.json` (`regeln`), `code-listen/iso4217.json`, `tools/waehrung-fest-erheben.js`, `tools/rechtsraum-zusammenstellung-leser-pruefen.js` (`WAEHRUNG_LESER`, `WAEHRUNG_DIREKT`).
**Bezug:** U2-ADR-337 (Vorgänger: die Währung als Regel des Sprachmoduls, mit eingebautem Rückfall EUR), U2-ADR-504 §3 (Rechtsraum als Modul im Kern: der Rechtsraum der Zusammenstellung), U2-ADR-255 (Rechtsraum an der Format-Definition), U2-ADR-494 (Region CODE-LISTEN), Befund WAEHRUNG-FEST-EUR (in der Befund-Ratsche).

## Frage

Bis hierher stand `waehrung: 'EUR'` als eingebauter Wert im Gerüst (`TEXTSATZ_REGELN_EINGEBAUT`, Kern und Lese-App), dazu fest `' EUR'` am ELSTER-Import und `(EUR)` im Feldnamen einer Studio-Vorlage — eine Länderannahme im Gerüst (Befund WAEHRUNG-FEST-EUR, 03.10.2026). Das Gerüst kennt keinen Rechtsraum und keine Länder-Ausgabe. Woher kommt die Währung, ohne zu raten?

## Entscheidung

1. **Das Gerüst trägt keine Währung.** `waehrung` fällt aus `TEXTSATZ_REGELN_EINGEBAUT` in Kern und Lese-App. Der Regel-Prüfer prüft gegen die Schlüssel von `TEXTSATZ_REGELN_ERLAUBT`: ein Sprachmodul darf `regeln.waehrung` weiter setzen (es/Ecuador → USD), in der Form ISO 4217.
2. **Das Rechtsraum-Template trägt sie.** Ein Rechtsraum-Modul darf `regeln` mit genau `waehrung` (ISO-4217-Form) führen; ein anderer Schlüssel oder eine andere Form weist das ganze Modul ab (`validateRechtsraumModul` → `'regeln'`, Schema `regeln`). Das DE-Template trägt `"regeln": { "waehrung": "EUR" }`.
3. **Eine Lesestelle: `textsatzWaehrung()`.** (1) `regeln.waehrung` des Sprachmoduls der aktiven Sprache und des aktiven Rechtsraums — nur von Modulen, deren Währungsregel der Schutz-Wagen S4 durchlässt (ab Werk, Vor-Depot, intern nachgeprüft); sonst (2) das Rechtsraum-Template, allein aus der Ab-Werk-Saat: (a) des eigenen Rechtsraums der Person (`data.rechtsraum`) — fehlt dafür ein Ab-Werk-Template, ist das Ergebnis `null`, nicht die Währung der Zusammenstellung; (b) sonst das Template des Rechtsraums der Zusammenstellung (`_rechtsraumModulDerZusammenstellung`, U2-ADR-504 §3; kein oder mehrere Rechtsraum-Module: `null`); sonst (3) `null`. Ein eingelassenes Rechtsraum-Template ändert die Währung erst mit der ausdrücklichen Wahl (Wagen Rechtsraum-Wahl). `textsatzWaehrung` liest `_rechtsraumDerZusammenstellung()` nicht selbst, sondern über das schon gelistete `_rechtsraumModulDerZusammenstellung()`; die Positivliste der Leser in `tools/rechtsraum-zusammenstellung-leser-pruefen.js` (`LESER`) bleibt darum unverändert.
4. **ELSTER** trägt die Währung an seiner Format-Definition (`IMPORT_FORMATE`, `waehrung: 'EUR'`); `_elsterFelder` liest sie, wenn die Datei keine nennt. Ein Format ohne `waehrung` hängt keine an.
5. **Studio:** die Vorlage `notariat` heißt `Vermögenswert` (ohne `(EUR)`); die Währung trägt ein Code der Liste ISO 4217 (`codeSystem: 'urn:iso:std:iso:4217'`).
6. **ISO 4217, Weg wie OPS.** SIX stellt die Liste im Auftrag der ISO frei bereit, regelt ihre Weitergabe aber nicht (gemessen 03. und 04.10.2026). Mitgeliefert werden nur die Codes, die ausgelieferte Templates verwenden: EUR, USD, GBP, CHF (`code-listen/iso4217.json`, `status: seed`, Fassung der amtlichen Liste vom 2026-09-17; jeder Code geprüft mit `node tools/codelisten-amtlich-abgleich.js --iso4217 <list-one.xml>`). Im Gerüst steht als Anzeige nur der Code; den Namen liefert das Sprachmodul unter `codeliste:iso4217/<Code>.anzeige`, ohne Eintrag bleibt es beim Code. Die Liste trägt keine Hinweispflicht im Exemplar; die Quellenangabe steht in `NOTICE.md` und `THIRD_PARTY_LICENSES` (Gegenlesung, 04.10.2026, Option iii). Die vollständige Liste lädt die Person selbst (Einstellungen); der Kern prüft sie gegen einen Pin (Veröffentlichung 2026-09-17, 47 491 Byte, SHA-256) und hält sie nur im Arbeitsspeicher. **Sie wirkt nicht auf Felder** (Gegenlesung, 04.10.2026, Variante a): sie prüft die Codes der Templates und Module — mitgelieferte Liste, `regeln.waehrung` der Rechtsraum-Templates und Sprachmodule, an ISO 4217 gebundene Felder aus dem Studio — gegen die amtliche Fassung; ohne geladene Liste gegen die mitgelieferten Codes. Ein Code außerhalb ist rot und wird mit Fundort genannt. Die System-URI `urn:iso:std:iso:4217` ist eingefroren.
7. **Zählung.** `tools/waehrung-fest-erheben.js --ausgeliefert` zählt feste Währungen in ausgelieferten Ausgabewegen außerhalb von Template, Format-Definition und Codeliste; Grundlinie `tools/waehrung-fest-grundlinie.json`, nur sinkend. Derselbe Lauf zählt jeden Leser der Währungsregel außerhalb von `textsatzWaehrung()`; Soll 0.
8. **Leser bei `null`.** Kein Betrag zeigt heute eine Währung an, kein Export schreibt ein Währungsfeld: `textsatzWaehrung()` hat außer den Proben keinen Aufrufer. Die Abnahme „bei null sichtbar ‚Währung nicht festgelegt‘, kein Exportfeld“ ist darum eine **Regel für jeden künftigen Leser** (`tools/rechtsraum-zusammenstellung-leser-pruefen.js`, Liste `WAEHRUNG_LESER`): jeder Aufruf von `textsatzWaehrung()` steht dort mit `art` und seinem Verhalten bei `null`; eine Anzeige muss `STRINGS.waehrungNichtFestgelegt` nennen, ein Export erklären, dass er kein Währungsfeld schreibt; sonst rot. Dasselbe gilt für jede **direkte** Lesung des Währungsfelds aus Datei, Format oder Template (`.waehrung`, `['waehrung']`, destrukturiert) außerhalb von `textsatzWaehrung()`: Liste `WAEHRUNG_DIREKT` (Kern) bzw. `WAEHRUNG_DIREKT_LESEN` (Lese-App). Studio und Issuer lesen das Feld nicht.

## Was diese Entscheidung nicht leistet

- Sie liefert keine Rechtsraum-Wahl im Depot. Ein eingelassenes Rechtsraum-Template wirkt auf die Währung erst mit dem Wagen Rechtsraum-Wahl (offene Abnahmezeile im Ratschen-Eintrag RECHTSRAUM-NICHT-WAEHLBAR).
- Sie baut keine Betragsanzeige. Wer die erste baut, steht auf `WAEHRUNG_LESER` und braucht den Text `waehrungNichtFestgelegt`.
- Die Weitergabe der vollständigen ISO-4217-Liste bleibt ungeregelt; bis dahin lädt die Person sie selbst.

```yaml
konformitaet:
  - aussage: >-
      Das Gerüst trägt keine Währung; die einzige Lesestelle ist textsatzWaehrung() — Sprachmodul, dann Ab-Werk-Rechtsraum-Template
      (eigener Rechtsraum, sonst der der Zusammenstellung nach U2-ADR-504 §3), sonst null.
    zustand: erfuellt
    herkunft: U2-ADR-480 (04.10.2026), U2-ADR-504 §3
    pruefung:
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·Gerüst] das Gerüst trägt keine Währung, das DE-Template trägt EUR"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P5] jedes Produkt: ein Depot ohne Rechtsraum hat die Währung des DE-Templates der Zusammenstellung"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P5·Rot-Beweis] im nackten Gerüst (kein Rechtsraum der Zusammenstellung): null, kein Rückfall auf EUR"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P5·Rot-Beweis] das DE-Template ohne `regeln`: null — die Währung stand nur dort"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·Zusammenstellung] ein anderes Template bringt seine Währung mit; zwei Templates ergeben null"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·2a] der eigene Rechtsraum der Person geht vor; ohne Ab-Werk-Template keine Währung, nie die der Zusammenstellung"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·Stufe 1] ein zugelassenes Sprachmodul mit regeln.waehrung geht dem Template vor"
      - tests/waehrung-fest.test.js "[Währung·Wächter] den eingebauten Wert gibt es in keiner Kopie mehr, und niemand außer textsatzWaehrung() liest die Regel"
  - aussage: >-
      Ein Rechtsraum-Modul führt in regeln nur waehrung in ISO-4217-Form; sonst fällt das ganze Modul.
    zustand: erfuellt
    herkunft: U2-ADR-480 (04.10.2026)
    pruefung:
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·Template] `regeln` am Rechtsraum-Modul: nur waehrung, nur ISO-4217-Form — sonst fällt das ganze Modul"
  - aussage: >-
      Ein selbst eingelassenes Sprachmodul ändert die Währung nicht; der Wegfall der Gerüst-Währung ändert keine Ausgabe in
      den vier Produkten.
    zustand: erfuellt
    herkunft: U2-ADR-480 (04.10.2026), Abnahme WAEHRUNG-FEST-EUR (Bestandsprobe)
    pruefung:
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P8] ein selbst eingelassenes Sprachmodul mit USD ändert die Währung nicht"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P12] alle vier Produkte: vor und nach dem Wegfall der Gerüst-Währung dieselben Ausgaben"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P12·Rot-Beweis] ein Export, der die Gerüst-Währung liest, macht den Unterschied sichtbar"
  - aussage: >-
      ISO 4217 wird nur mit den Codes der Templates mitgeliefert; die selbst geladene Liste gilt nur gegen den Pin, bleibt im
      Arbeitsspeicher und prüft die Codes der Templates und Module — ohne Liste gegen die mitgelieferten Codes.
    zustand: erfuellt
    herkunft: U2-ADR-480 (04.10.2026), Variante a und Option iii (Gegenlesung)
    pruefung:
      - tests/iso4217-selbst-laden.test.js "[ISO 4217·Abgleich·Rot-Beweis] mit geladener Liste: ein Template-Code, der nicht in der amtlichen Fassung steht, ist rot"
      - tests/iso4217-selbst-laden.test.js "[ISO 4217·Abgleich·Rot-Beweis] ein Template-Feld aus dem Studio (codeSystem ISO 4217) mit einem Code außerhalb ist rot"
      - tests/iso4217-selbst-laden.test.js "[ISO 4217·Abgleich·Rot-Beweis] ohne Liste: ein Modul-Code außerhalb der mitgelieferten Codes ist rot"
      - tests/iso4217-selbst-laden.test.js "[ISO 4217·selbst laden·Rot-Beweis] eine andere Datei, eine andere Fassung, eine Liste ohne Codes werden abgewiesen"
      - tests/iso4217-selbst-laden.test.js "[ISO 4217·Wächter] die amtliche Liste liegt nicht im Repo — mitgeliefert sind nur die Codes der Templates"
      - tests/codeliste-iso4217.test.js "[ISO 4217·Nur verwendete Codes] jeder Code der Liste wird von einem ausgelieferten Template verwendet"
      - tests/codeliste-iso4217.test.js "[ISO 4217·Gerüst] die Liste trägt als Anzeige nur den Code, und die Kern-Region trägt keine Lizenzzeile dafür"
      - tests/code-listen-lizenzhinweise-im-kern.test.js "[CODE-LISTEN·Lizenz] hinweispflicht: false trägt nur die benannte Liste, und ihre Quellenangabe steht in NOTICE und THIRD_PARTY_LICENSES"
  - aussage: >-
      Im Ausgelieferten steht keine feste Währung außerhalb von Template, Format-Definition und Codeliste; ELSTER trägt EUR
      aus der Format-Definition, ohne Währung in Datei und Format keine.
    zustand: erfuellt
    herkunft: U2-ADR-480 (04.10.2026), Befund WAEHRUNG-FEST-EUR
    pruefung:
      - tests/waehrung-fest.test.js "[Währung·Grundlinie] ausgeliefert: feste Währungen höchstens die Grundlinie, und genau sie; kein Leser"
      - tests/waehrung-fest.test.js "[Währung·A] ELSTER ohne Währung trägt die Währung der Format-Definition — und genau die"
      - tests/waehrung-fest.test.js "[Währung·B] ohne Währung in Datei und Format hängt kein Import EUR an"
      - tests/waehrung-fest.test.js "[Währung·CAMT] eine Kontoauszugsdatei ohne Währung ergibt keine — nie still EUR"
      - tests/waehrung-fest.test.js "[Währung·Studio] „Vermögenswert“ nennt keine Währung im Namen; der Code kommt nur aus der Liste ISO 4217"
  - aussage: >-
      Jeder Leser von textsatzWaehrung() und jede direkte Lesung des Währungsfelds steht mit art und Verhalten bei null auf
      der Positivliste; eine Anzeige ohne „Währung nicht festgelegt“ oder ein Leser ohne erklärtes Verhalten bei null ist rot.
    zustand: erfuellt
    herkunft: U2-ADR-480 (04.10.2026), Gegenlesung
    pruefung:
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P13·Währung] jeder Leser von textsatzWaehrung() steht mit seinem Verhalten bei null auf der Positivliste"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P13·Währung·Rot-Beweis] ein Betrag ohne „Währung nicht festgelegt“ oder ohne erklärtes Verhalten bei null ist rot"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P13·Währung·direkt] jede direkte Lesung von .waehrung steht namentlich auf der Liste — ELSTER mit seinem Verhalten bei null"
      - tests/waehrung-aus-dem-template.test.js "[U2-ADR-480·P13·Währung·direkt·Rot-Beweis] eine neue direkte Lesung aus Datei, Format oder Template ist rot"
```
