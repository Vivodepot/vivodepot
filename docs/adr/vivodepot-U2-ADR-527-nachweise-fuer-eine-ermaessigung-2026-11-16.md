# U2-ADR-527 — Nachweise für eine Ermäßigung im Bereich Soziales

**Status:** Angenommen (16.11.2026)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.
**Datum:** 2026-11-16
**Kategorie:** DATENMODELL
**Linie:** U2
**Bezug:** U2-ADR-144 (Gültigkeit an jedem Feldwert) · U2-ADR-465 (Meldebescheinigung als Datei an der Hauptwohnung)

---

## Anlass

Viele Menschen haben einen Nachweis, der ihnen einen geringeren Preis oder Beitrag sichert: einen Schülerausweis, einen
Studierendenausweis, einen Sozialpass, einen Berechtigungsschein. Der Nachweis gilt bis zu einem Datum, und er liegt als
Datei oder Foto vor. Das Depot hatte dafür keinen Ort. Neben den Schwerbehindertenausweisen stand nur Freitext.

Weg zum Nachsehen: `node --test tests/ermaessigung-nachweise-feld.test.js` (liest das Feld aus dem Kern).

## Entscheidung

1. **Ein Listenfeld im Bereich Soziales.** `socialInsurance.reducedRateProofs` steht in der Sektion der
   Schwerbehindertenausweise, direkt nach ihnen. Jede Zeile trägt drei Unterfelder:
   - `reductionPurpose` (Text, „Wofür“),
   - `reductionValidUntil` (Datum, „Nachweis gilt bis“),
   - `document` (Verweis auf eine Datei der Mappe).
2. **Eigene Kennungen der Unterfelder.** Die Unterfelder heißen nicht `kind` und `validUntil`, weil diese Kennungen
   schon an anderen Feldern stehen und die Doppelerfassungs-Prüfung W-8 sie als zweite Erfassung desselben Sachverhalts
   melden würde. Die Beschriftung „Nachweis gilt bis“ unterscheidet das Datum von „Gültig bis“ an anderen Ausweisen.
3. **Sensibel.** Gültigkeitsdatum und Datei stehen sensibel in der Liste 1 (Gruppe C). Ein Ermäßigungsnachweis zeigt die
   soziale Lage der Person, wie ein Mietvertrag ihre Wohnlage.
4. **Das Studio bietet das Feld als Baustein an.** Texte Deutsch und Englisch, Feldkatalog des Studios und die erzeugten
   Träger folgen aus der Quelle.

## Folgen

- Der eingefrorene Bestand nennt das Feld und seine drei Unterfelder in der Zuwachsliste unter dieser Nummer.
- Kein neuer Feldtyp. Kein Schema-Schritt: die Feldquelle wächst um ein Listenfeld, wie bei anderen Listen auch.

## Verworfene Wege

- **Freitext in einem bestehenden Feld:** kein Datum, an dem Vivodepot an das Ablaufen erinnern kann, und keine Datei.
- **Ein Feld je Nachweisart:** die Arten wechseln nach Ort und Lebenslage. Die Liste trägt jede Art, die Person nennt sie.

```yaml
konformitaet:
  - aussage: >-
      socialInsurance.reducedRateProofs ist ein Listenfeld mit den Unterfeldern reductionPurpose, reductionValidUntil und
      document; Datum und Datei sind sensibel.
    zustand: erfuellt
    herkunft: U2-ADR-527 Nr. 1 und 3 (16.11.2026)
    pruefung:
      - tests/ermaessigung-nachweise-feld.test.js "[U2-ADR-527·a] das Listenfeld steht im Bereich Soziales mit drei Unterfeldern"
      - tests/ermaessigung-nachweise-feld.test.js "[U2-ADR-527·b] Datum und Datei sind sensibel, der Zweck nicht"
  - aussage: >-
      Die Unterfelder tragen eigene Kennungen; kind und validUntil kommen in der Liste nicht vor.
    zustand: erfuellt
    herkunft: U2-ADR-527 Nr. 2 (16.11.2026)
    pruefung:
      - tests/ermaessigung-nachweise-feld.test.js "[U2-ADR-527·c] die Unterfelder heißen nicht kind und validUntil"
      - tests/ermaessigung-nachweise-feld.test.js "[U2-ADR-527·Rot-Beweis] mit den alten Kennungen schlägt die Prüfung an"
  - aussage: >-
      Feld und Unterfelder haben Texte auf Deutsch und Englisch, und das Studio führt das Feld im Feldkatalog.
    zustand: erfuellt
    herkunft: U2-ADR-527 Nr. 4 (16.11.2026)
    pruefung:
      - tests/ermaessigung-nachweise-feld.test.js "[U2-ADR-527·d] Beschriftungen auf Deutsch und Englisch"
      - tests/ermaessigung-nachweise-feld.test.js "[U2-ADR-527·e] der Feldkatalog des Studios führt das Feld"
```
