# U2-ADR-156-Nachtrag — Klartext-Bindung: Ort-Hinweis und weitergetragene Felder im Geheimteil gebunden

**Status:** Angenommen (05.10.2026, Wort der Gegenlesung vor dem Bau)
**Datum:** 2026-10-05
**Bezug:** U2-ADR-062-Nachtrag (Beschluss A: `angehoerigenOrt` im Klartext, vor dem Passwort lesbar), U2-ADR-156 (Empfängerkreise,
Geheimteil je Tabelleneintrag), U2-ADR-430 Ziffer 5 (unbekannte Umschlagfelder werden weitergetragen), U2-ADR-090 §3
**Linie:** U2

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

---

## Anlass

Zwei Arten von Umschlagfeldern stehen im Klartext und unter keiner AAD:

1. **Der Ort-Hinweis** (`angehoerigenOrt`). Er wird vor der Passworteingabe angezeigt (`_angOrtHinweisAuffrischen`). Das ist so
   entschieden (U2-ADR-062-Nachtrag, Beschluss A). Wer die Datei verändert, kann damit aber einen falschen Ort anzeigen lassen,
   etwa eine Telefonnummer, unter der jemand nach dem Passwort fragt.
2. **Felder einer neueren Fassung**, die diese Fassung nicht kennt und unverändert weiterträgt (`_umschlagFremdfelderMerken`,
   `_umschlagFremdfelderZurueckschreiben`). Wer die Datei verändert, kann ein solches Feld einfügen oder ändern. Eine spätere
   Fassung, die es kennt, würde es dann auslegen.

Weg zum Nachsehen: `grep -n "UMSCHLAG_FELDER_BEKANNT =\|function _angOrtHinweisAuffrischen\|function _umschlagFremdfelderMerken" vivodepot.html`.

## Entscheidung

1. **Im Geheimteil jedes Tabelleneintrags** (Anker und jedes Fach, AES-GCM unter dem Schlüssel des Eintrags) stehen zusätzlich:
   - `ortHinweis`: der Ort, normalisiert wie bei der Anzeige (`angehoerigenOrtAusUmschlag`: getrimmt, höchstens 200 Zeichen),
     oder `null`;
   - `ortGebunden: true`: die Marke. Mit ihr ist eine gebundene Datei ohne Hinweis von einer Datei vor diesem Tag zu
     unterscheiden;
   - `fremdHash`: SHA-256 (Base64) über das kanonische JSON (Schlüssel rekursiv sortiert, `_kanonischJSON`) aller Umschlagfelder
     **außerhalb der Basismenge**.
2. **Die Basismenge ist eingefroren** (`UMSCHLAG_FELDER_BASIS`). Basismenge Stand v917 = `kryptoVersion, depotUUID, pbkdf2,
   depotSalt, iv, ct, einheiten, umschlagTabelle, angehoerigenOrt, wiederherstellung, stand_marke, gespeichert_am` — inklusive
   `stand_marke` und `gespeichert_am`, die die Fassung beim Herunterladen selbst nach dem Serialisieren an die Datei hängt
   (`depotHerunterladen`). Sie entstehen erst nach dem Geheimteil und sind darum **ungebunden**: Wer sie anzeigt, darf sie nicht als
   geprüft darstellen, und `gespeichert_am` ist keine verlässliche Zeitangabe. **Gegen jede weitere Erweiterung der Basismenge steht
   der Wächter.** Eine spätere Fassung, die ein neues Umschlagfeld schreibt, nimmt es in `fremdHash` auf. Eine ältere Fassung rechnet
   über dieselben Felder, auch wenn sie sie nicht kennt, und kommt zum selben Hash. Eine erweiterte Basismenge ließe eine ältere
   Fassung das neue Feld als Fälschung verwerfen.
3. **Nach dem Öffnen** wird verglichen, über den Geheimteil des Eintrags, der geöffnet hat. Das gilt auf allen drei Wegen:
   mit dem Passwort (`depotLaden`), mit dem Wiederherstellungs-Code (`depotMitCodeLaden`) und beim Öffnen eines Sub-Depots
   (`subDepotEntsiegeln`):
   - Zeigt die Datei einen Ort, der vom gebundenen abweicht, warnt der Kern. Die Warnung nennt den gebundenen Ort, oder sie sagt,
     dass beim Speichern kein Hinweis gesetzt war. Fehlt der Ort, ist das kein Befund: Täuschen kann nur ein angezeigter Hinweis,
     und die Browser-Kopie lässt ihn absichtlich weg (Entscheidung 16.09.2026).
   - Weicht `fremdHash` ab, warnt der Kern mit den Feldnamen und **trägt diese Felder nicht weiter**. Die Namen kommen aus der
     Datei und damit von dem, der sie verändert hat. Darum zeigt die Warnung höchstens fünf, je höchstens 40 Zeichen lang, in
     Anführung und nur escaped.
   - Beim Neuversiegeln eines Sub-Depots gilt der **alte** `fremdHash`. Weichen die Felder ab, werden sie nicht neu gebunden,
     sonst würde ein eingeschleustes Feld beim Neuversiegeln „gewaschen“.
   - Trägt der Geheimteil keine Marke (Datei vor dem 05.10.2026), wird nicht geprüft. Es gibt keine Warnung und auch keinen
     Hinweis „geprüft“. Beim nächsten Speichern durch die Inhaberin bindet die Datei sich selbst.
4. **Die Warnung** steht im Textsatz deutsch und englisch (`klartextBindungTitel`, `…OrtText`, `…OrtKeinText`, `…FremdText`) und
   auf der Schutzliste: Ein Modul darf nicht überschreiben, was eine veränderte Datei meldet.
5. **Grenze, so benannt:** Die Warnung kommt nach dem Öffnen. Vor der Passworteingabe lässt sich eine Fälschung des Hinweises nicht
   erkennen; dafür bräuchte es einen Schlüssel, den die Empfängerin dann noch nicht hat.
6. **Lese-App:** Sie liest den Geheimteil nicht und zeigt den Ort-Hinweis nicht. Der Klartext-Umschlag ändert sich nicht, darum
   gibt es nichts nachzuziehen. Ältere Kern-Fassungen ignorieren die neuen Schlüssel im Geheimteil.

**Vorwärtsverträglichkeit, belegt an einer echten Datei:** `tests/fixtures/klartext-bindung-neuere-fassung.json` ist eine
eingefrorene Datei, wie sie eine neuere Fassung mit einem neuen Hüllenfeld schreibt; das Feld ist im Geheimteil gebunden. Die
Prüfsumme hält der Test fest. Erzeugt wurde sie einmal mit einer veränderten Kopie des Kerns (`tests/helfer/klartext-bindung-
fixture-erzeugen.js`, läuft nur auf ausdrücklichen Aufruf). Der heutige Kern öffnet sie ohne Warnung und trägt das Feld byte-gleich
weiter.

## Verworfen

- **Den Ort in eine AAD aufnehmen:** Eine Datei mit verändertem Ort würde sich dann nicht mehr öffnen, und die Meldung lautete
  „falsches Passwort“. Das ist die falsche Meldung, und der Inhalt wäre nicht mehr erreichbar.
- **Alle Felder außerhalb von `UMSCHLAG_FELDER_BEKANNT` hashen:** Diese Liste wächst mit jeder Fassung. Eine ältere Fassung
  würde jedes neue Feld als Fälschung verwerfen und still löschen.

```yaml
konformitaet:
  - aussage: >-
      Ein in der Datei veränderter oder eingefügter Ort-Hinweis wird nach dem Öffnen erkannt, und die Warnung nennt den gebundenen
      Ort; eine unveränderte Datei und eine Altdatei ohne Marke warnen nicht.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Klartext-Bindung (05.10.2026)
    pruefung:
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung] unveränderte Datei: kein Befund, weder für die Inhaberin noch über das Fach"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·kein Fehlalarm] die heruntergeladene Datei mit Stand-Marke und die Browser-Kopie ohne Ort warnen nicht; ein entfernter Ort zeigt keinen falschen"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Rot] veränderter Ort: das Fach warnt und nennt den gebundenen Ort"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Rot] eingefügter Ort in einer gebundenen Datei ohne Hinweis: Warnung, dass es keinen gab"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung] Altdatei ohne Marke: ein veränderter Ort warnt nicht (kein Fehlalarm), sagt aber auch nichts"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Code-Weg] wer mit dem Wiederherstellungs-Code öffnet, bekommt dieselbe Prüfung"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Rot am Code] ohne den Abgleich nach dem Öffnen bleibt ein veränderter Ort unbemerkt — die Proben oben messen ihn"
  - aussage: >-
      Ein Feld einer neueren Fassung öffnet ohne Warnung und wird weitergetragen; ein eingefügtes oder verändertes Feld außerhalb der
      Basismenge wird gemeldet und nicht weitergetragen.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Klartext-Bindung (05.10.2026)
    pruefung:
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Vorwärts] eine neuere Fassung mit neuem Feld öffnet ohne Warnung, und das Feld bleibt byte-gleich"
      - tests/umschlag-unbekanntes-geschwisterfeld.test.js "[Prüfstein·Speichern] eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern noch"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Rot] geändertes Fremdfeld: Warnung mit Feldnamen, das Feld wird nicht weitergetragen"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Rot] eingefügtes Fremdfeld in einer aktuellen Datei: Warnung, nicht weitergetragen"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Sub-Depot] ein eingeschleustes Fremdfeld wird beim Neuversiegeln nicht gewaschen, und die Warnung erscheint"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung·Rot] ein Feldname mit HTML erscheint in der Warnung als Text, nicht als Element"
  - aussage: >-
      Die Basismenge der Bindung ist eingefroren und eine Teilmenge der bekannten Felder; die Warnung steht deutsch und englisch auf
      der Schutzliste.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Klartext-Bindung (05.10.2026)
    pruefung:
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung] die Basismenge ist eingefroren: genau der Stand vom 05.10.2026, nie erweitert"
      - tests/umschlag-klartext-bindung.test.js "[Klartext-Bindung] die Warnung steht deutsch und englisch im Textsatz und auf der Schutzliste"
```
