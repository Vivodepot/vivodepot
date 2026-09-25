# U2-ADR-432: Ein Sub-Depot ist ein Depot wie jedes andere — Korrektur zu U2-ADR-235

**Status:** Angenommen
**Datum:** 23.09.2026
**Kategorie:** KORREKTUR, ARCHITEKTUR, KRYPTO, SUB-DEPOT
**Linie:** U2
**Korrigiert:** U2-ADR-235 (03.09.2026), Abschnitt „Warum kein bestehender Test es fand", Punkt 1, und Abschnitt
„Bewusste Grenze an beiden schreibenden Stellen".
**Bezug:** U2-ADR-002 (29.05.2026) · U2-ADR-124 (04.08.2026) · U2-ADR-156 (Empfängerkreise, Fächer) · U2-ADR-188 (Registry folgt data)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Der Grundsatz

U2-ADR-002 legt ihn für den Schlüsselpfad fest, Entscheidung, wörtlich:

> Der Anker übernimmt in der U2-Linie denselben Schlüssel-Pfad wie Sub-Depots: HKDF-pro-Depot. Ein Mechanismus für alle
> Depots, kein Anker-Sonderfall.

und, eine Zeile weiter:

> Der Anker ist das Depot mit der Anker-`depotUUID` und eigenem `depotSalt` — mechanisch identisch zu jedem Sub-Depot.

U2-ADR-124 trägt denselben Grundsatz im Titel: „Gleichwertigkeit auch am Startseiten-Öffnen-Weg".

Für das Umschlag-Format hat U2-ADR-235 die Frage als offene Entscheidung vorgelegt. Beantwortet ist sie mit der
Entscheidung vom 23.09.2026: Alle Depots sind gleich. Sie unterscheiden sich durch nichts außer ihrer
Position als Anker- oder Sub-Depot, ohne Sonderwege für Sub-Depots.

## Was U2-ADR-235 offen ließ

U2-ADR-235 hat sechs Stellen korrigiert, die fest einen V3-Umschlag annahmen. Zwei Punkte blieben offen:

1. **Die Anlage.** U2-ADR-235, Punkt 1, ließ `subDepotVersiegeln` auf V3 und legte die Frage, ob im eigenen Haus angelegte
   Sub-Depots dem Anker-Standard folgen, als offene Entscheidung vor. Beantwortet mit der Entscheidung vom 23.09.2026:
   alle Depots sind gleich. U2-ADR-002 hatte denselben Grundsatz für den Schlüsselpfad festgelegt. Die Folge
   des offenen Punktes war ein zweites Format neben dem der übrigen Depots.
2. **Die Fächer.** U2-ADR-235: „keine Übernahme etwaiger Empfängerkreis-Fächer beim Zurückschreiben … dokumentiert, nicht
   gebaut". Ein Depot, das über denselben Weg speichert wie jedes andere, behält seine Fächer. Die Grenze war die
   Folge des Sonderwegs, keine eigene Entscheidung.

Nicht erfasst hatte U2-ADR-235 außerdem, dass `subDepotNeuVersiegeln` (Speichern im Sub-Kontext) weiter nur `iv/ct` auf
den gelesenen Umschlag setzte. Bei einem V4-Umschlag lagen die neuen Daten damit tot neben den alten Einheiten, und jede
Änderung war beim nächsten Öffnen still verloren (Befund SUB-V4-NEUVERSIEGELN-VERLUST, HOCH).

## Entscheidung

1. **Ein Speicherweg.** `_depotV4Schreiben(inhalt, schlüssel)` ist der eine Weg, auf dem ein Depot-Umschlag entsteht:
   `depotSerialisierenV4` (Anker), `subDepotVersiegeln` (Anlage), `subDepotNeuVersiegeln` (Speichern im Sub-Kontext) und
   der NFD-Rückfall in `subDepotEntsiegeln`. Er schreibt die Fächer der Empfängerkreise und den Ortshinweis aus dem
   jeweiligen Inhalt. Ein V3-Bestand wird beim nächsten Speichern V4, mit gleicher `depotUUID`, gleichen Salzen und
   gleichem Passwort.
2. **Über ein Fach geöffnet heißt lesen.** Wer ein Depot über das Fach eines Empfängerkreises öffnet, hat nur einen
   Ausschnitt. Er darf nicht bearbeiten, und beim Verlassen wird nichts zurückgeschrieben.
3. **Ein Lesepfad.** Die Lese-App liest einen Sub-Umschlag über denselben V4-Leser wie jede Depot-Datei.
4. **Die Blackbox ist die Depot-Datei des Subs.** Sie trägt den Ortshinweis wie jede Depot-Datei, und Einhängen behält ihn.
5. **Migrationen.** Ein Sub-Inhalt durchläuft beim Betreten dieselben Stufen wie jedes Depot beim Laden, in derselben
   Reihenfolge (erst die Register dieses Depots, dann `depotNormalisieren`).

## Sonderwege — jeder ein Verstoß gegen den Grundsatz (U2-ADR-002; Entscheidung vom 23.09.2026), gezählt im Wächter

Wächter: `tests/sub-sonderlocken-ratsche.test.js` (Mechanik plus Positivliste, die nur schrumpfen darf).

| | Sonderweg | Stand |
|---|---|---|
| S1 | Anlage als eigenes V3 mit einem Schlüssel | behoben, `tests/sub-depot-gleiches-format.test.js` |
| S2 | Neuversiegeln mit V3-Annahme (Datenverlust) | behoben, `tests/sub-depot-v4-neuversiegeln.test.js` |
| S3 | keine Fächer in Sub-Depots | behoben mit S1/S2 (Fächer aus dem Inhalt) |
| S4 | Ablage im Anker | kein Verstoß — das IST die Position |
| S5 | Öffnen ohne Migrationen | behoben, `tests/sub-depot-migrationen.test.js` |
| S6 | eigener Passwortwechsel (`subDepotEigenerPasswortWechsel`) | offen, gezählt |
| S7 | Modus-Regel `'nach-umfang'`, deklariert und nie gelesen | offen, gezählt; Akzent und Akteur sind Position |
| S8 | Blackbox-Hülle als eigener Weg | offen, gezählt; Format seit S1 gleich, Ortshinweis seit Punkt 4 gleich |
| S9 | eigener Lese-App-Einstieg für Sub-Umschläge | offen, gezählt; Leser seit Punkt 3 gleich |
| S10 | Umfang-Mechanismus nur für Sub-Depots | nie gelandet |
| S11 | händischer Umzug der Vertretungsgrundlage (Stufe 67) | offen, gezählt |

## Folgen

- Bestehende V3-Sub-Depots werden beim nächsten Speichern V4. Wer sie nie wieder speichert, behält V3; der Lesepfad für V3
  bleibt deshalb erhalten.
- **Dieser Schritt ist unumkehrbar:** ein einmal als V4 gespeichertes Sub-Depot wird nie wieder V3 — derselbe Weg, den
  jedes Anker-Depot seit der Einführung von V4 geht. Gehalten von der Probe „[S1·Bestand]" (Inhalt vollständig danach).
- Die Positivliste im Wächter hat den Deckel 5 (S6, S7, S8, S9, S11). Jeder weitere abgebaute Punkt senkt ihn im
  selben Commit.
- Tests, die ein V3-Sub-Depot voraussetzten, prüfen jetzt die V4-Form, genauso streng: Einheiten und Umschlagstabelle
  verbatim statt `ct/iv`, genau die Felder einer Depot-Datei statt „sechs Felder".

```yaml
konformitaet:
  - aussage: >-
      Jeder Weg, der einen Depot-Umschlag schreibt — Anker wie Sub —, geht durch denselben Speicherweg; keiner verschlüsselt selbst.
    zustand: erfuellt
    herkunft: U2-ADR-002; Korrektur zu U2-ADR-235 (23.09.2026)
    pruefung:
      - tests/sub-sonderlocken-ratsche.test.js
        "[SUB-SONDERLOCKEN·Mechanik] jeder Weg, der einen Depot-Umschlag schreibt, geht durch _depotV4Schreiben — keiner verschlüsselt selbst"
  - aussage: >-
      Ein Sub-Depot entsteht als V4 wie jedes Depot; ein V3-Bestand wird beim nächsten Speichern V4, vollständig.
    zustand: erfuellt
    herkunft: Entscheidung vom 23.09.2026, offen vorgelegt in U2-ADR-235
    pruefung:
      - tests/sub-depot-gleiches-format.test.js
        "[S1·Anlage] ein neues Sub-Depot entsteht im selben Format wie jedes Depot (V4)"
      - tests/sub-depot-gleiches-format.test.js
        "[S1·Bestand] ein V3-Sub-Depot: öffnen, bearbeiten, speichern → V4 mit vollständigem Inhalt"
  - aussage: >-
      Eine Änderung an einem eingehängten V4-Sub-Depot überlebt das Neuversiegeln; seine Fächer bleiben; über ein Fach geöffnet wird nichts zurückgeschrieben.
    zustand: erfuellt
    herkunft: Befund SUB-V4-NEUVERSIEGELN-VERLUST (23.09.2026)
    pruefung:
      - tests/sub-depot-v4-neuversiegeln.test.js
        "[S2] ein als V4 eingehängtes Sub-Depot behält eine Änderung über das Neuversiegeln"
      - tests/sub-depot-v4-neuversiegeln.test.js
        "[S2·Fächer] die Fächer der Empfängerkreise überleben das Neuversiegeln des eingehängten Depots"
      - tests/sub-depot-v4-neuversiegeln.test.js
        "[S2·über ein Fach] wer über ein Fach öffnet, liest nur — und schreibt beim Verlassen nichts zurück"
  - aussage: >-
      Der Ortshinweis der Inhaberin überlebt Einhängen, Neuversiegeln, Blackbox und Lese-App.
    zustand: erfuellt
    herkunft: Entscheidung 23.09.2026 (die Blackbox ist die Depot-Datei des Subs)
    pruefung:
      - tests/sub-depot-ortshinweis.test.js
        "[Ortshinweis·Rundlauf] der Ortshinweis überlebt Einhängen, Neuversiegeln, Blackbox und Lese-App"
```
