# U2-ADR-512-Nachtrag — das Verzeichnis der Ablagen liegt zusätzlich im eigenen Pod

**Status:** Angenommen (29.10.2026, Wort der Gegenlesung vor dem Bau)
**Datum:** 2026-10-29
**Kategorie:** SICHERHEIT, NETZ
**Linie:** U2
**Bezug:** U2-ADR-512 Nr. 6 (Abmelden löscht alles lokal), Nr. 8 (die Person bestätigt den Speicher), Nr. 9 (Rücknahme und Ablauf)
· U2-ADR-512-Nachtrag Stufe 2 (25.10.2026)

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

---

## Anlass

Welche Ablagen die Brücke im Pod angelegt hat, wusste nur ihr lokales Verzeichnis in der IndexedDB. Nach dem Abmelden, nach
gelöschten Website-Daten oder auf einem zweiten Gerät kannte die Brücke die Ablagen nicht mehr: Sie setzte kein Ablaufdatum mehr
durch, und zurücknehmen konnte die Person nur noch beim Pod-Anbieter (Befund POD-ABMELDEN-VERLIERT-ABLAGEN, MITTEL). Teil 1 fragt
vor dem Abmelden nach. Dieser Nachtrag ist Teil 2: Die Liste überdauert das Gerät.

Weg zum Nachsehen: `grep -n "kopieUebernehmen\|KOPIE_FELDER\|function eintragGilt" pod/bruecke.js`.

## Entscheidung

1. **Ort.** Die Kopie liegt unter vivodepot/intern/verzeichnis.json im Speicher der Person. Der Container `intern/` entsteht
   wie `sicherungen/` und `grants/` über `ordnerBereit` mit `regelEigen`: nur die WebID der Person, Lesen, Schreiben und Steuerung,
   mit Vererbung. Erst wenn diese Regel steht, schreibt die Brücke die Kopie. Scheitert sie, schreibt sie nichts (fail-closed).
2. **Inhalt.** Je Ablage genau die Felder `adresse`, `art`, `stelle`, `bis`, `am`, `grant`, `ueberDienst`. Kein Schlüssel, kein
   Inhalt. Bei `link` ist die Adresse die Fähigkeit; ein Teil des SHL-Links oder ein Schlüssel aus dem Fragment kommt nie hinein.
   Ein Eintrag gilt nur mit einer Adresse im Ordner seiner Art unter dem eigenen Speicher, ohne Fragment und Abfrage, und mit
   einem Grant derselben Herkunft. Was das nicht erfüllt oder weitere Felder trägt, verwirft die Brücke beim Lesen und Schreiben;
   so bringt eine veränderte Kopie sie nicht dazu, etwas außerhalb ihrer Ordner zu löschen.
3. **Unverschlüsselt.** Eine Verschlüsselung bräuchte einen Schlüssel, der das Abmelden überdauert. Der DPoP-Schlüssel wird beim
   Abmelden gelöscht und ist nicht exportierbar; ein Schlüssel aus dem Depot-Passwort widerspräche der Trennung von Brücke und
   Depot (U2-ADR-512 Nr. 7). Lesbar ist die Kopie nur für die WebID der Person. Der Betreiber des Pods sieht damit die Liste der
   Ablagen und ihre Ablaufdaten; Regeln und Grants unter `grants/` sah er schon vorher, neu für ihn sind die Ablaufdaten von
   `link` und `eigen`.
4. **Wann.** Vor der Bestätigung des Speichers (Nr. 8) liest und schreibt die Brücke die Kopie nicht. Nach der Bestätigung liest
   sie sie und bringt lokales Verzeichnis und Kopie auf denselben Stand, erst danach löscht sie abgelaufene Ablagen. Jede
   Änderung (Ablegen, Zurücknehmen, Löschen einer abgelaufenen) schreibt zuerst lokal, dann in den Pod.
5. **Die Kopie im Pod gilt.** Einen Eintrag, den nur das lokale Verzeichnis kennt, übernimmt die Brücke nur, wenn seine
   Ressource noch besteht (HEAD 200); bei 404 oder 410 verwirft sie ihn. Jeder andere Status bricht den Abgleich ab, ohne etwas
   zu schreiben oder zu löschen; die Seite sagt das in einem Satz, und bis zum nächsten Öffnen nimmt sie keine Ablage an. Eine Vereinigung ohne diese Prüfung holte zurück, was ein anderes Gerät zurückgenommen hat.
6. **Zwei Geräte.** Geschrieben wird mit `If-Match` auf das zuletzt gelesene ETag, eine neue Kopie mit `If-None-Match: *`. Bei
   412 liest die Brücke neu und wendet dieselbe Änderung auf den neuen Stand an, höchstens dreimal.
7. **Abmelden** löscht weiter alles lokal (Nr. 6 bleibt); die Kopie bleibt im Pod. Die Rückfrage vor dem Abmelden aus Teil 1
   bleibt. Liegt eine Kopie vor, sagt sie, dass die Seite die Ablaufdaten nach der nächsten Anmeldung durchsetzt.

Damit ändert sich Nr. 9: Das Chiffrat bleibt nur noch dann über seinen Ablauf hinaus im Pod, wenn die Person die Brücke auf keinem
Gerät wieder öffnet und ihren Speicher bestätigt.

## Grenzen

- **Kein ETag:** Sendet ein Pod zur Kopie kein ETag, schreibt die Brücke ohne Bedingung; zwei Geräte könnten sich dann
  überschreiben. Der Community Solid Server sendet ein ETag.
- **Datenschutzerklärung:** Ziffer 7b nennt bisher nur das Verzeichnis im Browser. Der Satz zur Kopie im Pod kommt dort hinzu,
  sobald diese Fassung der Brücke ausgeliefert ist, nach der Quellenprüfung.
- Nicht Teil: eine Ablaufdurchsetzung ohne geöffnete Brücke. Ein Pod löscht nichts von selbst.

## Erwogen und verworfen

- **Verschlüsselte Kopie:** siehe Nr. 3; sie bräuchte einen Schlüssel, den die Brücke nicht hat und nicht haben soll.
- **Vereinigung nach Adresse:** siehe Nr. 5.
- **Nur die Rückfrage aus Teil 1:** schützt nicht vor gelöschten Website-Daten und nicht vor einem zweiten Gerät.

```yaml
konformitaet:
  - aussage: >-
      Die Kopie liegt unter vivodepot/intern/verzeichnis.json mit genau den Feldern der Positivliste, ohne Fragment, SHL-Link,
      Schlüssel oder Chiffrat; intern/ trägt zuvor die Regel nur für die WebID der Person, und ohne diese Regel wird nichts
      geschrieben.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Verzeichnis im eigenen Pod (29.10.2026)
    pruefung:
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] eine Ablage schreibt die Kopie nach intern/, mit genau den Feldern der Positivliste, nach der Regel"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] scheitert die Regel für intern/, schreibt die Brücke keine Kopie"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie·Rot-Beweis] ohne die Regel vor dem Schreiben läge die Kopie trotz gescheiterter Regel im Pod"
  - aussage: >-
      Nach Abmelden, auf einem leeren Browser oder einem zweiten Gerät kennt die Brücke die Ablagen nach der Bestätigung wieder und
      löscht eine inzwischen abgelaufene; vor der Bestätigung liest und schreibt sie die Kopie nicht.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Verzeichnis im eigenen Pod (29.10.2026)
    pruefung:
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] abmelden, Ablagen lassen, neu anmelden: die inzwischen abgelaufene Ablage wird gelöscht"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] ein zweites Gerät mit leerem Browser kennt die Ablagen nach der Bestätigung und kann zurücknehmen"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] vor der Bestätigung liest und schreibt die Brücke die Kopie nicht"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie·Rot-Beweis] ohne den Abgleich nach der Bestätigung bleibt die abgelaufene Ablage liegen"
  - aussage: >-
      Die Kopie im Pod gilt: was ein Gerät zurücknimmt, holt das andere nicht zurück; ein nur lokaler Eintrag kommt nur mit
      bestehender Ressource hinzu; zwei Geräte verlieren beim Schreiben keine Ablage.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Verzeichnis im eigenen Pod (29.10.2026)
    pruefung:
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] was ein Gerät zurücknimmt, holt das andere nicht zurück; was nur lokal und noch da ist, kommt hinzu"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] zwei Geräte schreiben nacheinander: keine Ablage geht verloren"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie·Rot-Beweis] mit einer Vereinigung ohne HEAD-Prüfung holt ein Gerät die Rücknahme des anderen zurück"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] scheitert die Prüfung eines nur lokalen Eintrags (HEAD 500), bleibt alles, wie es war, und die Seite sagt es"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie·Rot-Beweis] verwürfe die Brücke bei HEAD 500 den Eintrag, fehlte er nach dem Lauf"
  - aussage: >-
      Eine veränderte Kopie bringt die Brücke nicht dazu, außerhalb ihrer Ordner zu löschen; fremde Felder fallen weg.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Verzeichnis im eigenen Pod (29.10.2026)
    pruefung:
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Kopie] eine veränderte Kopie: fremde Adressen und Felder fallen weg, gelöscht wird nur in den eigenen Ordnern"
  - aussage: >-
      Vor dem Abmelden fragt die Brücke weiter nach offenen Ablagen; mit Kopie im Pod sagt sie, dass die Seite sie nach der
      nächsten Anmeldung wieder kennt.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Verzeichnis im eigenen Pod (29.10.2026)
    pruefung:
      - tests/pod-bruecke-abmelden.test.js "[Pod·Abmelden] abgelaufene Ablage wird vor dem Abmelden gelöscht, eine offene hält die Abmeldung an"
```
