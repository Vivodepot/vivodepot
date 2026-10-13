# U2-ADR-495: Angaben ohne Länderannahme — Rechtsform, Land und Rechtsraum aus dem Rechtsraum-Modul

**Status:** Angenommen (09.10.2026)
**Datum:** 09.10.2026
**Kategorie:** STUDIO, SCHEMA, RECHTSRAUM
**Linie:** U2
**Bezug:** U2-ADR-493 (Studio in zwei Ebenen; Abgrenzung „freiwillige Rechtsform“) · U2-ADR-285 (Rechtsraum als Modul) ·
Grundsatz „Gerüst plus Templates, nichts fest verdrahtet“ (05.10.2026) · Befund RECHTSRAUM-FEST-IM-KERN (09.10.2026)
**Status heute:** gilt für das Studio, die Einreichung, die Anfrage und die Ausstellung — Belege im `konformitaet`-Block unten.

## Frage

Das Studio verlangte eine Rechtsform aus einer festen deutschen Liste (e.V., GmbH, AG, Anstalt öffentlichen Rechts, Behörde,
sonstige Körperschaft). Das Einreich-Schema und das Anbieter-Zertifikat erzwangen dieselbe Liste. Das Land war mit „Deutschland“
vorbelegt, das Angehörigen-Blatt mit dem Rechtsraum „DE“. Vorlage und Anfrage trugen keinen Rechtsraum. Eine Einrichtung außerhalb
Deutschlands konnte sich damit nicht richtig beschreiben, und jede neue Funktion des Studios hätte die Annahme weitergetragen.
Woher sollen Rechtsform, Land und Rechtsraum kommen?

## Entscheidung

1. **Aus dem Rechtsraum-Modul.** Ein Rechtsraum-Modul trägt neben `typen` freiwillig `name` (je Sprache) und `rechtsformen`
   (`kennung`, `label`, `labelEn`, freiwillig `art`). Das DE-Modul trägt die bisherigen sechs Formen. Kern und Studio nehmen beide
   Schlüssel an; die Schlüsselliste ist in beiden gleich.
2. **Das Studio bäckt die Rechtsräume.** Ein Erzeuger schreibt Kürzel, Namen und Rechtsformen aller Rechtsraum-Module in eine
   Region der Studio-Datei; eine Abweichung ist rot. Ein neuer Rechtsraum ist eine neue Moduldatei, keine Änderung am Studio.
3. **Rechtsform freiwillig und frei.** Im Einreich-Schema ist `rechtsform` freiwillig und freier Text; neu ist `rechtsraum`
   (Kürzel), ebenfalls freiwillig. Das Studio schlägt die Rechtsformen des gewählten Rechtsraums vor. Bei der Ausstellung eines
   Zertifikats bleibt eine Rechtsform Pflicht, aber als freier Text; das Zertifikat trägt `rechtsraum`, wenn er gesetzt ist.
4. **Kein Land, kein Rechtsraum voreingestellt.** Das Land ist Pflicht und wird genannt, nicht vorbelegt. Das Kürzel der
   abgeleiteten Anbieter-Kennung kommt aus dem Rechtsraum oder dem Ländernamen im Modul; eine bestehende deutsche Einrichtung
   behält ihr „-de“.
5. **Die Anfrage nennt den Rechtsraum, wenn die Stelle ihn wählt.** `rechtsraum` ist ein freiwilliger Schlüssel der Anfrage. Der
   Kern übernimmt ein Kürzel und meldet alles andere, ohne die Anfrage abzulehnen; eine ältere App verwirft den Schlüssel mit
   Meldung. Die Grundlage bleibt Freitext.
6. **Ein Wächter hält die Linie.** Feste Land-, Rechtsraum- und Rechtsform-Vorgaben im Studio und im VC-Issuer werden je Datei
   gezählt; die Grundlinie kann nur sinken. Normzitate (Befund NORMEN-IM-TEXT), `country_code` (SDJWT-COUNTRY-CODE-DE) und
   Währung (WAEHRUNG-FEST-EUR) zählen dort, nicht hier.

## Abgrenzung

- Nicht Teil dieser Entscheidung: der Rechtsraum an der Vorlage selbst (Template-Einlass im Kern), die BGB-Beschriftungen im
  Feldkatalog des Kerns und die Pro-Module. Sie gehören zum Kern-Teil des Befunds RECHTSRAUM-FEST-IM-KERN mit eigenem Eigentümer.
- Die Oberfläche des Studios bleibt deutsch und englisch fest im HTML (M4, eigener Wagen).
- Bereits ausgestellte Zertifikate und eingereichte Pakete bleiben gültig: jede Änderung macht ein Feld weiter, keins enger.

```yaml
konformitaet:
  - aussage: >-
      Das Studio kennt Rechtsräume, ihre Namen und Rechtsformen nur aus den Rechtsraum-Modulen; die gebackene Region gleicht den
      Modulen, eine Handänderung ist rot.
    zustand: erfuellt
    herkunft: U2-ADR-495 (09.10.2026)
    pruefung:
      - tests/studio-rechtsraeume.test.js "[Rechtsräume] die Region STUDIO-RECHTSRAEUME steht genau einmal und gleicht den Rechtsraum-Modulen"
      - tests/studio-rechtsraeume.test.js "[Rechtsräume · Rot-Beweis] eine von Hand ergänzte Rechtsform in der Region fällt auf"
  - aussage: >-
      Das Einreich-Schema kennt keine feste Rechtsform-Liste; Rechtsform und Rechtsraum sind freiwillig, in allen drei Kopien gleich.
    zustand: erfuellt
    herkunft: U2-ADR-495 (09.10.2026)
    pruefung:
      - tests/studio-rechtsraeume.test.js "[Rechtsräume · Schema] Rechtsform ohne Liste und freiwillig, Rechtsraum als Kürzel, in allen drei Kopien gleich"
      - tests/studio-rechtsraeume.test.js "[Rechtsräume · Schema] eine Einrichtung ohne Rechtsform und eine mit fremder Rechtsform bestehen das Einreich-Schema"
  - aussage: >-
      Kein Land ist voreingestellt; das Kürzel der Anbieter-Kennung kommt aus dem Rechtsraum.
    zustand: erfuellt
    herkunft: U2-ADR-495 (09.10.2026)
    pruefung:
      - tests/studio-rechtsraeume.test.js "[Rechtsräume · Land] ohne Land kein „Deutschland“: die Prüfung nennt das fehlende Land"
      - tests/studio-rechtsraeume.test.js "[Rechtsräume · Land] das Kürzel der anbieterId kommt aus dem Rechtsraum, sonst aus dem Modul-Namen, nie aus einem festen Land"
  - aussage: >-
      Die Anfrage trägt einen gewählten Rechtsraum; der Kern übernimmt ein Kürzel und meldet alles andere, ohne abzulehnen.
    zustand: erfuellt
    herkunft: U2-ADR-495 (09.10.2026)
    pruefung:
      - tests/studio-rechtsraeume.test.js "[Rechtsräume · Anfrage] gewählt steht der Rechtsraum in der Anfrage, sonst nicht; der Kern übernimmt ihn"
      - tests/studio-rechtsraeume.test.js "[Rechtsräume · Anfrage · Rot-Beweis] ein Rechtsraum, der kein Kürzel ist, wird gemeldet, die Anfrage bleibt gültig"
  - aussage: >-
      Bei der Ausstellung bleibt die Rechtsform Pflicht, aber freier Text; ein Rechtsraum ist ein Kürzel.
    zustand: erfuellt
    herkunft: U2-ADR-495 (09.10.2026)
    pruefung:
      - tests/studio-rechtsraeume.test.js "[Rechtsräume · Ausstellung] jede Rechtsform als freier Text; ohne Rechtsform keine Ausstellung; Rechtsraum nur als Kürzel"
  - aussage: >-
      Feste Land-, Rechtsraum- und Rechtsform-Vorgaben im Studio und im VC-Issuer werden gezählt und können nur weniger werden.
    zustand: erfuellt
    herkunft: U2-ADR-495 (09.10.2026)
    pruefung:
      - tests/laenderannahme-pruefen.test.js "[Länderannahme] die geführten Dateien stehen auf der Grundlinie, nicht darüber und nicht darunter"
      - tests/laenderannahme-pruefen.test.js "[Länderannahme · Rot-Beweis] ein neuer Rückfall auf „Deutschland“ im Studio ist rot"
```
