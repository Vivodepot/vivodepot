# U2-ADR-454: Kind-Datei — das Kind übernimmt sein Sub-Depot ohne Mitwirkung der Eltern

**Status:** Angenommen
**Datum:** 29.09.2026
**Kategorie:** SUB-DEPOT, ÜBERGABE, SPEICHERN
**Linie:** U2
**Bezug:** U2-ADR-444 (Übergang an die Person; Nachfolge des dort offenen Punkts) · U2-ADR-123 (Sub-Depot-Selbstbestimmung) ·
U2-ADR-124 Zug 2 (eine Übergabe-Datei öffnet über den Startweg als eigenes Depot) · U2-ADR-031 (Datei-Handles nur in der
Sitzung) · U2-ADR-156 (eine eigene Datei je Empfänger statt mehrerer Einträge in der Datei der Inhaberin) · der Posteingang über Linked Data
Notifications (dieselbe Solid-OIDC-Anmeldung für den Pod-Ort, eigene ADR)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Beim Anlegen eines Depots für eine andere Person sagt Vivodepot nach außen: „Ihr Kind kann es später übernehmen, ohne dass Sie
mitwirken müssen.“ Der Kern hielt das nicht. Das Sub-Depot liegt als eigener Umschlag unter eigenem Passwort, aber **innerhalb**
der Anker-Datei, und die ist mit dem Anker-Passwort verschlossen (`depotLaden` prüft nur den obersten Umschlag). Dem Kind fehlte
nicht das Passwort, sondern die Datei. Eine eigenständige Datei gab es nur als Übergabe-Datei (`subDepotBlackboxExportieren`), auf
Handlung der Eltern, eingefroren auf den Stand des Exports. U2-ADR-444 hatte den Übergang „ohne die Eltern“ ausdrücklich offen
gelassen, bis er beschlossen ist.

## Entscheidung

Entschieden am 29.09.2026: Weg A, mit Erinnerung für Safari und iOS. „Mitwirken“ heißt einmal beim Einrichten; das
Kind übernimmt unabhängig. Der Solid Pod ist als weiterer Ort vorgesehen und wird mit dem Posteingang gebaut. Die Lesart zu den
Datei-Handles steht unten, Punkt 3.

1. **Die Kind-Datei.** Sie ist die Übergabe-Datei (`blackboxDateiAusUmschlag`: der Umschlag verbatim, keine Krypto, kein Name im
   Dateinamen), an einem Ort, den die haltende Person **einmal** einrichtet (`kindDateiEinrichten`, Knopf an der Sub-Depot-Karte).
   Das Kind öffnet sie allein mit seinem Passwort über die Startseite und führt das Depot als eigenes weiter. Den eigenen
   Passwortwechsel gibt es schon (U2-ADR-123). Das Einrichten steht im Verlauf des Sub-Depots (`kind-datei-eingerichtet`).
2. **Der Ort ist eine Schnittstelle** (`KIND_DATEI_ORTE`). Jeder Ort hat `verfuegbar`, `einrichten`, `sitzungsbereit` und `schreiben`.
   Was die Sitzung überdauern darf, steht in `eintrag.kindDatei.ziel`; was nur die Sitzung hält (ein Datei-Handle), steht in
   `_kindDateiSitzungsZiele`. Heute gibt es zwei Orte:
   - `datei` (Chromium): ein zweites Datei-Handle neben dem der Anker-Datei; danach schreibt jedes gelungene Sichern der Sitzung
     die Kind-Datei still mit (`kindDateienMitschreiben`, angestoßen von `markiereGespeichert` und `markiereAlsDateiGesichert`).
   - `ausgabe` (überall sonst): Download oder Teilen-Blatt, jedes Mal mit einer Geste; sie schreibt nie still.
   Ein **Solid Pod** dockt als dritter Ort an: `ziel` ist dann die Pod-Adresse, `sitzungsbereit` hängt an der Solid-OIDC-Sitzung,
   `schreiben` ist ein verschlüsseltes PUT. Er schreibt auch unter Safari und iOS still, weil er kein Datei-Handle braucht. Gebaut
   wird er mit dem Posteingang, ohne Umbau an den Aufrufern.
3. **Was nur in der Sitzung gilt.** Datei-Handles leben nur in der Sitzung (U2-ADR-031, Entscheidung 1=A, unangetastet). Darum
   braucht auch Chromium in jeder neuen Sitzung einen Klick, wie für die Anker-Datei. Wo kein Ort still schreiben kann, steht im
   Prüfblatt „Kind-Datei für {name} nachziehen“ mit einem Knopf (`prueftermineKindDateien`), bis sie nachgezogen oder das Depot
   abgegeben ist. Die Kind-Datei ist so frisch wie ihr letztes Schreiben; der Dialog sagt das. In der Datei der Eltern bleibt das
   Sub-Depot, bis sie abgeben (U2-ADR-444 §2); die Anwendung der Eltern erfährt von einer Übernahme nichts, weil es keinen Kanal gibt.
4. **Einordnung.** Die Kind-Datei ist das eigene, versiegelte Depot der vertretenen Person: `eigene-sicherung`, keine Weitergabe,
   also keine Vereinbarungssperre. Offene Widersprüche stehen im Dialog vor dem Schreiben (U2-ADR-444 §3).

**Verworfen:** Der Sub-Umschlag im offenen Teil der Anker-Datei, entsperrbar mit dem Kind-Passwort. Die Zahl der Sub-Depots stünde
im Klartext (das Leck, gegen das U2-ADR-156 die eigene Datei gewählt hat), Lesepfad und Gleichheitsprüfung müssten umgebaut werden,
und das Kind bräuchte trotzdem die Datei der Eltern. Ebenso verworfen: Handles in IndexedDB aufzubewahren. Das kehrte U2-ADR-031
um, und Chromium verlangt nach einem Neuladen ohnehin eine neue Berechtigung aus einer Geste.

## Nachtrag an U2-ADR-444

Der dort offene Übergang „ohne die Eltern“ ist mit dieser ADR gebaut, als Kind-Datei. Der Übergang „das Sub-Depot wird in derselben
Sitzung zum Anker“ bleibt ungebaut; er ist mit der Kind-Datei nicht mehr nötig, weil das Kind die Datei selbst öffnet.

```yaml
konformitaet:
  - aussage: >-
      Einmal eingerichtet, öffnet das Kind die Kind-Datei in einem Kern ohne Sitzung der Eltern allein mit seinem Passwort und sieht
      seine Daten; der Dateiname nennt die Person nicht, das Einrichten steht im Verlauf.
    zustand: erfuellt
    herkunft: Entscheidung vom 29.09.2026
    pruefung:
      - tests/kind-datei-uebernahme.test.js
        "[Kind-Datei·1] einmal eingerichtet, öffnet das Kind die Datei allein als eigenes Depot"
      - tests/kind-datei-uebernahme.test.js
        "[Kind-Datei·7] der Dialog sagt, was die Kind-Datei ist und wo ihre Grenze liegt, und schreibt auf einen Klick"
  - aussage: >-
      Mit einem Ziel in der Sitzung zieht jedes gelungene Sichern die Kind-Datei still nach; ohne Ziel schreibt nichts still, das
      Prüfblatt meldet die ältere Kind-Datei, ein Klick zieht nach; eine Ausgabe braucht immer eine Geste.
    zustand: erfuellt
    herkunft: Entscheidung vom 29.09.2026; Lesart zu U2-ADR-031
    pruefung:
      - tests/kind-datei-uebernahme.test.js
        "[Kind-Datei·2] danach zieht jedes Sichern der Sitzung die Kind-Datei still nach, ohne neue Geste"
      - tests/kind-datei-uebernahme.test.js
        "[Kind-Datei·3] ohne Ziel in der Sitzung schreibt nichts still — das Prüfblatt sagt es, ein Klick zieht nach"
      - tests/kind-datei-uebernahme.test.js
        "[Kind-Datei·4] ohne Datei-Picker (Safari, iOS) wird ausgegeben und nie still geschrieben"
  - aussage: >-
      Nach dem Abgeben gibt es keine Kind-Datei und keine Erinnerung mehr.
    zustand: erfuellt
    herkunft: Entscheidung vom 29.09.2026 (U2-ADR-444 §2)
    pruefung:
      - tests/kind-datei-uebernahme.test.js
        "[Kind-Datei·5] nach dem Abgeben gibt es keine Kind-Datei und keine Erinnerung mehr"
  - aussage: >-
      Jeder Ort der Kind-Datei erfüllt dieselbe Schnittstelle, damit ein Solid Pod ohne Umbau andockt.
    zustand: erfuellt
    herkunft: Entscheidung vom 29.09.2026
    pruefung:
      - tests/kind-datei-uebernahme.test.js
        "[Kind-Datei·6] jeder Ort erfüllt dieselbe Schnittstelle — ein weiterer (Solid Pod) dockt ohne Umbau an"
  - aussage: >-
      Jede Kennung, die verspricht, etwas gehe „ohne dass Sie mitwirken“, hat eine Probe, die den Weg der vertretenen Person allein
      durchläuft.
    zustand: erfuellt
    herkunft: Klassenwächter zum Befund vom 29.09.2026
    pruefung:
      - tests/kind-datei-uebernahme.test.js
        "[Kind-Datei·Klasse] jede Kennung, die „ohne mitwirken“ verspricht, hat eine Probe des Alleinwegs"
```
