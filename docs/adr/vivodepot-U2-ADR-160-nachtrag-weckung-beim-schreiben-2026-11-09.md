# U2-ADR-160-Nachtrag — Ein ruhender Bereich fehlt nicht: Der Schreibweg weckt ihn

**Status:** Angenommen (09.11.2026)
**Datum:** 2026-11-09
**Kategorie:** DATENMODELL, IMPORT
**Linie:** U2
**Bezug:** U2-ADR-160 (Weglassen, nicht Umbelegen) · U2-ADR-348 (Pro ersetzt Bereiche)

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

---

## Anlass

U2-ADR-160 sagt: Führt das Depot einen Bereich nicht, entfällt der Import dorthin. Der Wächter in den Einlesern fragte dafür den Anzeige-Index. Ein Pro-Kern zeigt die Bürger-Bereiche nicht, sie stehen aber im Katalog und ihre Daten sind zulässig. Der Wächter hielt einen ruhenden Bereich darum für fehlend und verwarf die Werte. Schreibwege ohne Einlesen trugen Werte ein, die erst nach dem nächsten Öffnen zu sehen waren.

## Entscheidung

1. **Weglassen gilt für Bereiche, die das Depot nicht führt.** Die Einleser und `kennungPruefen` fragen `_bereichGefuehrt`: Der Bereich steht da, oder er ruht. Ein ruhender Bereich ist kein fehlender Bereich.
2. **Der Schreibweg weckt.** Schreibt ein Weg einen Wert in einen ruhenden Bereich, steht der Bereich in derselben Sitzung da. Das gilt für die Einleser, `sektorFeldSetzen`, `kernAPI.schreibBereich` und neue Listeneinträge.
3. **Die Vorschau eines Einlesens weckt vorläufig.** Der Plan zeigt die Felder. Ein Abbruch nimmt das zurück.
4. **Geweckt wird über die Daten.** Es gilt dieselbe Regel wie beim Öffnen einer Datei (`_ruhendeBereichIds`). Name allein und leere Werte wecken nicht.
5. **Der Bereichssatz einer Datei bleibt.** Ein Bereich, den die Datei abgewählt hat, wird nicht geführt und nicht geweckt. Für ihn gilt weiter das Weglassen.

## Folgen

Eine Anfrage nach einer Angabe in einem ruhenden Bereich meldet die Angabe als fehlend statt als unbekannt. Füllt die Person sie aus, steht der Bereich da.

## Konformität

```yaml
konformitaet:
  - id: weckung-beim-schreiben
    zustand: erfuellt
    aussage: Ein Wert, der in einen ruhenden Bereich geschrieben wird, ist in derselben Sitzung zu sehen; ein Bereich außerhalb des Katalogs bleibt weggelassen.
    pruefung:
      - tests/weckung-beim-schreiben.test.js
      - tests/anzeige-index-leser.test.js
```
