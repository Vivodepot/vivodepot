# U2-ADR-512-Nachtrag — Rückprobe der eigenen Sicherung im Pod

**Status:** Angenommen (09.11.2026, Wort der Gegenlesung vor dem Bau)
**Datum:** 2026-11-09
**Kategorie:** SICHERHEIT, NETZ, AUSTAUSCH
**Linie:** U2
**Bezug:** U2-ADR-512 · U2-ADR-512-Nachtrag Stufe 2 (postMessage aus dem Kern) · U2-ADR-520 (Außenablagen nur Chiffrat)

**Status heute:** gilt, gebaut in Brücke und Kern, die Belege stehen im `konformitaet`-Block unten. Geprüft über die Pod-Strecke am gepinnten, lokalen Solid-Server; andere Server sind ungeprüft.

---

## Anlass

Die Sicherungskopie im Pod (`podSicherungAblegen`, Art `eigen`) meldet Erfolg, sobald die Brücke `vd-pod-abgelegt` schickt. Gelesen wurde die Kopie danach nie. Alle anderen Sicherungswege dieses Depots öffnen ihre Kopie zur Probe mit `sicherungPruefen`. Der Kern hat `connect-src 'none'` und kann nicht selbst lesen. Bisher gibt die Brücke an den Kern nur Adressen und Bitten um das Verzeichnis, nie den Inhalt einer Ablage.

## Entscheidung

1. **Eine neue Richtung, Pod zu Kern, nur für Art `eigen`.** Nach `vd-pod-abgelegt` liest die Brücke die eben gemeldete Adresse mit `A.podFetch` (GET, `cache: 'no-store'`) und antwortet dem Fenster, das den Auftrag gab, mit einer eigenen Nachricht `vd-pod-zurueck`. `link` und `stelle` lesen nicht zurück. Der Kern bleibt ohne Netz, `connect-src 'none'` bleibt. Der Kern sendet dafür nichts Neues, die Positivliste seiner `postMessage`-Aufrufe bleibt, wie sie ist.
2. **Eine eigene Nachricht, kein neues Feld.** Der Kern verwirft eine Antwort mit unbekanntem Feld (`POD_ANTWORT_FELDER`), die Brücke einen Auftrag mit unbekanntem Feld. Kerne liegen als Dateien bei den Personen, die Brücke wird zentral erneuert. `vd-pod-abgelegt` und `vd-pod-ablegen` bleiben darum unverändert. Ein alter Kern hat seinen Hörer schon entfernt und übergeht `vd-pod-zurueck`. Ein neuer Kern bekommt von einer alten Brücke nichts und läuft in die neutrale Zeile.
3. **Form der Nachricht.** `{ typ: 'vd-pod-zurueck', fassung: 1, id, daten }` oder `{ typ: 'vd-pod-zurueck', fassung: 1, id, fehler }`, genau eines von beiden. `daten` ist ein `ArrayBuffer`. `fehler` ist einer von `netz`, `status`, `form`, `groesse`.
4. **Grenze in der Brücke, beim Lesen.** Die Brücke merkt sich die gesendete Bytezahl und liest über `r.body.getReader()` in einen Puffer genau dieser Länge. Beim ersten überzähligen Byte bricht sie ab (`reader.cancel()`) und meldet `groesse`. `Content-Length` ist nur Vorfilter, `r.arrayBuffer()` wird nicht benutzt. Ohne `r.body` gibt es keine Bytes, sondern `form`. Der gelesene Körper muss `C.passtZurArt(text, 'eigen', bytes)` bestehen.
5. **Was der Kern annimmt.** Nur aus genau dem geöffneten Fenster, genau der Herkunft `POD_BRUECKE_HERKUNFT`, mit der eigenen `id`, `fassung === 1`, genau den benannten Feldern, `daten` als `ArrayBuffer` oder `fehler` aus der festen Liste. Es gilt eine einzige Antwort, nach der ersten angenommenen Nachricht endet der Hörer. Die Annahme läuft nur bei `opt.zurueck` und nur bei Art `eigen`. Die Frist beginnt nach `vd-pod-abgelegt` neu und beträgt 60 Sekunden plus einen Anteil je Megabyte. Das Ablaufen der Frist ist kein Fehler der Ablage.
6. **Folge der Prüfungen im Kern.** Vor der Übertragung bildet der Kern den SHA-256 des gesendeten Puffers, der danach leer ist.
   1. Keine Bytes oder `fehler`: neutral, `sicherungPruefen` läuft nicht.
   2. Länge weicht von der gesendeten ab oder UTF-8 (`fatal: true`) scheitert: neutral, `sicherungPruefen` läuft nicht.
   3. `sicherungPruefen` läuft. `gehtAuf: null`: neutral. `gehtAuf: false`: kein Erfolg, eigener Satz „öffnet sich nicht“.
   4. `gehtAuf: true`, aber der SHA-256 der Antwort weicht ab: neutral.
   5. `gehtAuf: true` und gleicher SHA-256: Erfolg, der bisherige Toast.

   `aelter` ist keine Bedingung: Sind die Bytes gleich, liegt genau das Gesendete im Pod. Ein Vergleich einzelner Felder wie `iv` und `ct` scheidet aus, die Fassung 4 des Umschlags trägt sie nicht (`einheiten`, `umschlagTabelle`).
7. **Ein Fehler auf dem Rückweg heißt nie „beschädigt“.** Netz, Status, Form, Größe, Frist und ein geschlossenes Fenster sagen nichts über die Kopie. Sie ergeben keine Erfolgsmeldung und einen neutralen Satz. `sicherungPruefenBeschaedigt` erscheint auf diesem Weg nicht. Gelöscht wird in keinem Fall etwas.
8. **Klartext.** Geöffnet wird nur in `sicherungPruefen`, mit dem Schlüssel der Sitzung. Nichts wird gehalten oder geschrieben. Die Brücke sieht wie bisher nur Chiffrat. Die neue Richtung ist keine neue Schreibstelle, U2-ADR-520 („ein Schreibweg“) bleibt unberührt.

## Grenzen und Restrisiken

- **Stick-Herkunft.** Ein Kern vom Stick hat die Herkunft `null`, die Brücke sendet dann mit Zielherkunft `*` an das Fenster, das den Auftrag gab. Hat die Person dieses Fenster im Zeitfenster woandershin navigiert, bekommt das dortige Dokument die Bytes. Bisher war das nur die Adresse, künftig ist es die ganze Hülle. Es bleibt Chiffrat, das aber Offline-Raten am Passwort erlaubt. Angenommen, weil der Weg die Navigation des eigenen Fensters im Zeitfenster voraussetzt und ein Kern vom Stick keine andere Zielangabe hat. Bei bekannter Herkunft gilt die feste Zielherkunft.
- **Die Rückprobe belegt den Stand beim Lesen.** Sie belegt nicht, dass der Pod die Daten später behält.
- **Reihenfolge der Auslieferung.** Die Brücke geht vor dem Kern hinaus. Mit der alten Brücke kann ein neuer Kern nie bestätigen, es geht aber nichts kaputt.

## Erwogen und verworfen

- Ein neues Feld in `vd-pod-abgelegt` oder im Auftrag: alte Kerne liefen in die Frist und läsen „Frist abgelaufen“ trotz gelungener Ablage, die heutige Brücke verwürfe den Auftrag still.
- Der Vergleich nur in der Brücke: Die Abnahme verlangt, dass der Kern die Kopie öffnet.
- `iv` und `ct` statt der ganzen Bytes: läuft bei Fassung 4 leer.
- `gehtAuf: true` allein als Erfolg: Ein älterer gültiger Stand unter derselben Adresse wäre Erfolg ohne Beleg.
- Eine Grenze nur über `Content-Length`: kann fehlen oder falsch sein.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Erfolg meldet die eigene Sicherung im Pod nur, wenn die zurückgelesene Kopie aufgeht und byte-gleich mit dem Gesendeten ist; ein
      Fehler des Rückwegs heißt nie beschädigt.
    zustand: erfuellt
    herkunft: Befund POD-SICHERUNG-NIE-ZURUECKGELESEN
    pruefung:
      - tests/sicherung-probe-oeffnen.test.js "[POD-SICHERUNG-NIE-ZURUECKGELESEN] die echte Kopie kommt byte-gleich zurück: Erfolg erst danach"
      - tests/sicherung-probe-oeffnen.test.js "[POD-SICHERUNG-NIE-ZURUECKGELESEN] v4-Umschlag mit einem geänderten Byte, der aufgeht: kein Erfolg"
      - tests/sicherung-probe-oeffnen.test.js "[POD-SICHERUNG-NIE-ZURUECKGELESEN·Rot-Beweis] ohne den Vergleich der Bytes hieße dasselbe Erfolg"
  - aussage: >-
      Die Brücke liest nur bei Art eigen zurück, hält nie mehr als die gesendete Bytezahl und lässt die Nachricht vd-pod-abgelegt unverändert.
    zustand: erfuellt
    herkunft: Befund POD-SICHERUNG-NIE-ZURUECKGELESEN
    pruefung:
      - tests/pod-bruecke-stufe2.test.js "[Rückprobe] eigen: GET ohne Zwischenspeicher, die Bytes an den Öffner, „abgelegt“ bleibt bei genau vier Feldern"
      - tests/pod-bruecke-stufe2.test.js "[Rückprobe] zu groß: Abbruch beim ersten überzähligen Byte, keine Bytes"
      - tests/pod-bruecke-stufe2.test.js "[Rückprobe] link und stelle lesen nicht zurück"
```

Ob ein Solid-Server direkt nach dem Schreiben lesbar antwortet, misst die Pod-Strecke `tests/e2e-pod/pod-bruecke.spec.js` (`[Pod·Rückprobe]`) am gepinnten Community Solid Server aus `tools/pod-css/`. Andere Server sind ungeprüft.
