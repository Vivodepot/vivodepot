# U2-ADR-156-Nachtrag — ein Bereichsbaustein trägt die Dokumente seines Bereichs

**Status:** Angenommen (21.10.2026, Wort der Gegenlesung vor dem Bau)
**Datum:** 2026-10-21
**Bezug:** U2-ADR-156 (Empfängerkreise; der weite Erbfall-Baustein nimmt „Dokumente und Mappe“ mit, §3 Sensibel-Filter),
U2-ADR-156-Nachtrag Sensibel-Filter (07.10.2026), U2-ADR-013 (Mappe, `ref:mappe`), U2-ADR-014 (Dokument-Datensätze)
**Linie:** U2

**Status heute:** gilt für die eigene Datei eines Kreises und für den QR-Code. Für das Fach in der Datei der Inhaberin ist die
Frage offen, siehe unten. Die Belege stehen im `konformitaet`-Block.

---

## Anlass

Seit dem 23.09.2026 ist jeder Bereich des Produkts ein Baustein eines Empfängerkreises. Der Bereichsbaustein gibt jedes Feld frei,
das gerade in seinem Bereich steht. Dokumente gab er nicht frei: `mappe` und `dokumente` gingen nur mit dem weiten Baustein in den
Zuschnitt. Ein Kreis aus Bereichsbausteinen trug darum kein einziges Dokument, auch wenn das Dokument im Produkt genau unter diesem
Bereich steht. Gesehen an einer Vorführung: eine Mutter gibt ihrer bevollmächtigten Tochter den Gesundheitsbereich, ihre Befunde
blieben zurück (Befund DOKUMENTE-NICHT-IM-BEREICHSTEIL).

Die Zuordnung liegt im Depot schon vor. Ein Mappe-Eintrag trägt `bereich`, ein Dokument-Datensatz trägt `sektorId` und verweist
über `mappeRef` auf seine Datei. Weg zum Nachsehen:
`grep -n "^function mappeEintragHinzufuegen\|^function dokumentAnlegen\|^function empfaengerZuschnittModell" vivodepot.html`.

## Entscheidung

1. **Ein Bereichsbaustein trägt die Dokumente seines Bereichs:** jeden Mappe-Eintrag mit diesem `bereich`, jeden
   Dokument-Datensatz mit dieser `sektorId` und die Datei, auf die ein solcher Datensatz verweist. Der Zuschnitt folgt dem Inhalt,
   wie bei den Feldern.
2. **Derselbe Sensibel-Filter wie für Felder.** Ein Eintrag oder Datensatz mit `sensibel: true` bleibt beim engen Baustein zurück;
   der weite Baustein nimmt ihn mit (weit heißt weit). Freigeben kann die Halterin ihn über die Markierung.
3. **Ein Eintrag in „allgemein“ gehört keinem Bereich.** Er geht nur mit dem weiten Baustein hinaus, oder als Datei eines
   Datensatzes, der zum Bereich gehört.
4. **Der QR-Code trägt weder Dateien noch Dokument-Datensätze.** Ein Code fasst keine Datei; ein Datensatz ohne seine Datei
   sagt dem Empfänger nur, dass es etwas gibt, das er nicht sieht. Das gilt auch für eine Datei, auf die ein Feld verweist.
5. **Eine sensible Datei geht nie in einen engen Zuschnitt, auf keinem Weg.** Auch ein Verweisfeld (`ref:mappe`, etwa das
   Profilfoto) zieht sie nicht mehr nach; vorher tat es das (Befund VERWEIS-ZIEHT-SENSIBLE-DATEI, HOCH, 21.10.2026). Der Verweis
   bleibt stehen und zeigt beim Empfänger „nicht hinterlegt“. Geprüft wird am Ausgang des Zuschnitts, für jeden engen Baustein.

## Was offen ist

**Das Fach in der Datei der Inhaberin.** Es öffnet volle Einheiten über ihre Namen, und `mappe` ist eine Einheit. Seit dem
20.10.2026 nimmt das Fach eine Einheit nur, wenn ihr Wert im Zuschnitt gleich dem vollen Wert ist. Eine nach Bereich gefilterte
Mappe gleicht der vollen nur, wenn alle Einträge zu diesem Bereich gehören; sonst bleibt sie dem Fach verschlossen. Das ist
richtig, aber nicht das Ziel. Dafür braucht der Zerfall eine Einheit je Mappe-Eintrag. Das ist eine Änderung am Umschlag und wird
gesondert entschieden.

## Erwogen und verworfen

- **Einen eigenen Baustein „Dokumente“:** Er hätte alle Dokumente aller Bereiche freigegeben, auch die, deren Bereich der Kreis
  nicht bekommt.
- **Die Mappe ganz mitgeben, sobald ein Bereichsbaustein im Kreis ist:** Das hätte Dokumente fremder Bereiche in fremde Hand
  gegeben.

```yaml
konformitaet:
  - aussage: >-
      Ein Bereichsbaustein trägt die Mappe-Einträge seines Bereichs samt Datei und die Dokument-Datensätze seines Bereichs samt
      der Datei, auf die sie verweisen; keine Einträge anderer Bereiche.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Dokumente im Bereich (21.10.2026)
    pruefung:
      - tests/empfaenger-bereich-dokumente.test.js "[Bereich·Dokumente·P1] ein Bereichsbaustein trägt die Mappe-Einträge seines Bereichs samt Datei, keine aus anderen Bereichen"
      - tests/empfaenger-bereich-dokumente.test.js "[Bereich·Dokumente·P3] ein Dokument-Datensatz des Bereichs geht mit, samt der Datei, auf die er verweist"
  - aussage: >-
      Ein sensibel markierter Eintrag bleibt beim Bereichsbaustein zurück und geht mit dem weiten Baustein mit.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Dokumente im Bereich (21.10.2026)
    pruefung:
      - tests/empfaenger-bereich-dokumente.test.js "[Bereich·Dokumente·P2] ein sensibler Eintrag bleibt beim Bereichsbaustein zurück und geht mit dem Erbfall mit"
      - tests/empfaenger-bereich-dokumente.test.js "[Bereich·Dokumente·P2·Rot-Beweis] ohne die Sensibel-Filter trägt der Bereichsbaustein den sensiblen Eintrag"
  - aussage: >-
      Kein enger Baustein zieht über einen Verweis eine sensible Datei nach; der weite nimmt sie mit.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Dokumente im Bereich (21.10.2026)
    pruefung:
      - tests/empfaenger-bereich-dokumente.test.js "[Bereich·Dokumente·P7·Klasse] kein enger Baustein zieht über einen Verweis eine sensible Datei nach"
      - tests/empfaenger-bereich-dokumente.test.js "[Bereich·Dokumente·P7·Rot-Beweis] ohne den Filter am Ausgang zieht ein Verweis die sensible Datei in den engen Zuschnitt"
  - aussage: >-
      Der QR-Code trägt weder Dateien noch Dokument-Datensätze.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Dokumente im Bereich (21.10.2026)
    pruefung:
      - tests/empfaenger-bereich-dokumente.test.js "[Bereich·Dokumente·P4] der QR-Code trägt weder Dateien noch Dokument-Datensätze und bleibt in seiner Grenze"
  - aussage: >-
      Das Fach in der Datei der Inhaberin öffnet eine nach Bereich gefilterte Mappe nicht (die Einheit je Mappe-Eintrag steht unter
      „Was offen ist“).
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Dokumente im Bereich (21.10.2026)
    pruefung:
      - tests/empfaenger-bereich-dokumente.test.js "[Bereich·Dokumente·P5] das Fach in der Datei der Inhaberin öffnet eine nach Bereich gefilterte Mappe nicht"
```
