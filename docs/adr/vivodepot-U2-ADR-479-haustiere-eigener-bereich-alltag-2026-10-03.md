# U2-ADR-479 · Tiere als eigener Bereich im Cluster Alltag

**Status:** Akzeptiert, gebaut (Bereich `pets` und Feld-Umzug in Privat DE/EN; Pro ohne Bereich Tiere, die Tiere bleiben dort unter `identity`, Nachtrag 22.10.2026). Schemastufe 94, in Landungsreihenfolge vergeben (Nachtrag 18.10.2026).
**Datum:** 03.10.2026
**Kategorie:** DATENMODELL
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`BEREICH_IDS_EINGEBAUT`, `BEREICH_CLUSTER_ZUORDNUNG`, `ICONS.pawPrint`, `FELD_UMZUEGE`,
`_feldUmzuegeAnwenden`, Stufe 93 → 94 in `depotNormalisieren`, Import B16, Sensibel-Ausnahmen), `vivodepot-lesen.html`
(Feld-Umzug beim Lesen), die Bereichsvorlage Tiere, die Bereichsvorlage Identität,
`tools/lib/vier-produkte.js`, eine Identitätsvorlage des Übergangs für Pro, Textsatz DE/EN.
**Bezug:** U2-ADR-022 (ein Personenregister), U2-ADR-157 (Angehörigen-Blätter), U2-ADR-187 (Altkennungen beim Lesen),
U2-ADR-291 (Bürgermodul-Schnitt).

## Frage

Die Haustiere standen als Abschnitt im Bereich „Identität & Person“. Wer Tiere sucht, sucht sie im Alltag, nicht unter der
eigenen Person. Ein Abschnitt kann nicht allein in einen anderen Cluster der Seitenleiste wandern; der Cluster hängt am
Bereich. Zugleich binden Empfängerkreise und das Bereichs-PDF an den ganzen Bereich, und Herkunft, Gültigkeit und
Sensibel-Markierung sind nach Bereich und Feld gespeichert. Ein Umzug darf deshalb weder Daten verlieren noch still ändern,
wer die Tiere sieht.

## Entscheidung

1. **Ein vierzehnter eingebauter Bereich `pets` („Tiere“) im Cluster Alltag**, mit dem Abschnitt und Feld `pets`
   („Haustiere“). Die Unterfelder sind unverändert. `identity` verliert den Abschnitt. Der Bereich gilt in Privat DE und EN;
   Pro trägt ihn nicht (Nachtrag 22.10.2026).
2. **Der Umzug ist ein Feld-Umzug zwischen zwei bestehenden Bereichen** (`FELD_UMZUEGE`, `identity.pets` → `pets.pets`).
   Die Altkennungs-Tabelle `KENNUNG_MAPPING` bleibt dafür unberührt. Sie bildet ganze Bereiche ab, und ein Eintrag
   `identity → pets` verschöbe den ganzen Identitätsbereich.
3. **Mitgezogen werden:**
   - der Wert in `sektoren`;
   - die Nebenablagen nach Bereich und Feld, auch Listen-Selektoren;
   - die Kennungen in Zusammenstellungen, Anfragen, Kreis-Ausnahmen und Blatt-Feldern.
4. **Der Umfang jedes Empfängerkreises bleibt genau erhalten.** Ein Kreis, der „Identität & Person“ freigibt, bekommt den
   Baustein `bereich:pets` dazu, ein anderer Kreis bekommt nichts. Das Fach wickelt die Tiere beim nächsten Speichern auf
   demselben Weg wie jeden anderen Bereich. Es gibt keinen neuen Krypto-Pfad und kein Kreis-Passwort.
5. **Abbruchsicher und ohne Überschreiben:**
   - Der Umzug rechnet auf Kopien und übernimmt erst am Ende.
   - Steht am Ziel schon ein Wert, bleibt die Quelle stehen.
   - Er ist idempotent und läuft ohne Versions-Tor, also auch für ein Depot mit höherer Stufe.
6. **Beim Lesen überall:** im eigenen Depot (beim Normalisieren), beim Einlesen über `depotNormalisieren` und in der Lese-App, die
   denselben Block byte-gleich führt. Signierte Dateien werden nicht umgeschrieben; nur ihr gelesener Inhalt zieht um.
7. **Das Bereichs-PDF „Identität & Person“ enthält danach keine Tiere mehr.** Sie stehen im Bereichs-PDF „Tiere“.

## Nachtrag 18.10.2026: Schemastufe bei der Landung

Am 03.10. war Stufe 95 vorgesehen. Sie setzte voraus, dass vorher die Stufen 93 und 94 landen. Gelandet ist bis zum
18.10. nur 92; 94 und 95 sind am 05.10. wieder freigegeben worden („Schemastufen in Landungsreihenfolge“,
Nummern-Reservierung). Der Umzug selbst braucht keine Nummer: er läuft ohne Versions-Tor und idempotent.
Bei der Landung bekommt er die nächste freie Stufe, gesetzt in `depotNormalisieren` und `SCHEMA_VERSION_AKTUELL`.
Die Sammel-Reservierung für den Zug folge15 nennt **94**: Die Stufe 93 (Staatsangehörigkeit aus dem Rechtsraum-Template)
landet im selben Zug vorher, die 94 ist von der ungebauten Innenfach-Stufe umgewidmet. Die 95 bleibt frei.

## Nachtrag 22.10.2026: Pro trägt die Tiere nicht

Am 03.10. sollte Pro die Tiere bekommen wie `identity`. Am 22.10.2026 wurde entschieden, dass Pro ein berufliches Depot
ist und keine privaten Bereiche trägt; private Angaben stehen dort nur, wenn die Person sie freiwillig für die Vertretung teilt.
Darum bindet `tools/lib/vier-produkte.js` das Template
die Bereichsvorlage Tiere nur in Privat DE und EN ein. Pro bleibt bei sieben Bereichen und führt die Tiere bis zur Pro-Arbeit
zur allgemeinen Pro-Fassung weiter unter `identity`:

- **Vorlage:** Pro liest eine eigene Identitätsvorlage des Übergangs, die gemeinsame Identitätsvorlage plus genau die Sektion
  `pets` (151 Felder wie bisher). Eine Probe hält sie an die gemeinsame Vorlage. Die
  Datei ist ein Übergang; die Pro-Arbeit löst sie ab.
- **Umzug:** Die Stufe 94 zieht nur um, wohin das Produkt einen Bereich hat (`_bereicheImKatalog`). In Pro bleiben die Tiere
  unter `identity`; die Stufe ist trotzdem gesetzt. Öffnet ein Produkt mit dem Bereich die Datei später, zieht dieselbe,
  idempotente Stufe nach. Die Lese-App zieht beim Lesen immer um.

## Was diese Entscheidung nicht leistet

- Sie enthält keine Rechtsaussage zu Tieren, weder im Hilfetext noch in der Unterzeile.
- Ein vor dem Umzug herausgegebener Auszug trägt weiter `identity.pets`. Er bleibt gültig und wird beim Lesen zugeordnet.
- Steht am Ziel schon ein Wert (Konflikt), bleiben beide Werte stehen. Eine Zusammenführung bietet diese Fassung nicht an.

```yaml
konformitaet:
  - aussage: >-
      Die Tiere stehen als eigener Bereich `pets` im Cluster Alltag; `identity` trägt den Abschnitt nicht mehr.
    zustand: erfuellt
    herkunft: Entscheidung vom 03.10.2026
    pruefung:
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·Bereich] ein vierzehnter Bereich „Tiere“ im Cluster Alltag, mit dem Abschnitt „Haustiere“; identity ohne Tiere"
  - aussage: >-
      Der Umzug verliert nichts: jeder Eintrag, jedes Unterfeld und die Register stehen gleich am neuen Ort; ein zweiter
      Lauf ändert nichts; ein Depot ohne Tiere bleibt feldgleich; ein Pro-Depot mit Tieren von heute findet sie unter pets, DE und EN (seit 24.10.2026, U2-ADR-421 §8).
    zustand: erfuellt
    herkunft: Entscheidung vom 03.10.2026
    pruefung:
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·1] feldweise Gleichheit: jeder Eintrag, jedes Unterfeld, jede Kennung bytegleich am neuen Ort, Register mit"
      - tests/haustiere-eigener-bereich.test.js "[Tiere·2] ein Depot ohne Tiere bleibt feldgleich"
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·Pro] ein Pro-Depot mit Tieren von heute findet sie unter pets, ohne Verlust (DE und EN); Privat wie bisher"
  - aussage: >-
      Ein Abbruch mitten im Umzug lässt den alten Stand stehen; ein Wert am Ziel wird nicht überschrieben.
    zustand: erfuellt
    herkunft: Entscheidung vom 03.10.2026
    pruefung:
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·3] Abbruch mitten im Umzug: der alte Stand bleibt, nichts halb umgezogen (Rot-Beweis)"
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·Konflikt] steht am Ziel schon ein Wert, bleibt die Quelle stehen — kein Überschreiben"
  - aussage: >-
      Der Umfang jedes Empfängerkreises bleibt erhalten: ein Kreis mit Identität behält die Tiere, ein anderer bekommt sie
      nicht; die Tierwerte seiner Ausgabe sind vor und nach gleich.
    zustand: erfuellt
    herkunft: Entscheidung vom 03.10.2026
    pruefung:
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·Kreise] ein Kreis mit Identität behält die Tiere, ein Kreis nur mit Wohnen bekommt sie nicht"
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·4] die Tierdaten in der Ausgabe des Kreises mit Identität sind vor und nach dem Umzug gleich"
  - aussage: >-
      Die Lese-App zieht beim Lesen auf demselben Weg um wie der Kern.
    zustand: erfuellt
    herkunft: Entscheidung vom 03.10.2026
    pruefung:
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·Lese-App] der Umzugs-Block steht byte-gleich in Kern und Lese-App, und die Lese-App ruft ihn"
      - tests/haustiere-eigener-bereich.test.js
        "[Tiere·Lese-App·Altdatei] eine Empfängerdatei von heute mit identity.pets zeigt in der Lese-App die Tiere unter Tiere"
```
