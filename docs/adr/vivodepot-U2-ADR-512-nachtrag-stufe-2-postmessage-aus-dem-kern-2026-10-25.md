# U2-ADR-512-Nachtrag — Stufe 2: „Im Pod ablegen“ aus der Anwendung per postMessage

**Status:** Angenommen (25.10.2026)
**Datum:** 2026-10-25
**Kategorie:** SICHERHEIT, NETZ, AUSTAUSCH
**Linie:** U2
**Bezug:** U2-ADR-512 Punkt 4 (Stufe 2 bekommt eine eigene Entscheidung mit eigener Sicherheitsprüfung) · U2-ADR-047 (SHL) ·
U2-ADR-156 1b (Ausschnitt je Empfänger) · U2-ADR-449 (Antwort als JWE)

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten; die Strecke im Browser ist dort offen geführt, weil
sie in der Suite übersprungen wird.

---

## Anlass

Mit Stufe 1 speichert die Person eine Datei aus dem Kern und wählt sie in der Brücke noch einmal aus. U2-ADR-512 Punkt 4 hat die
Übergabe direkt aus der Anwendung als erste Kern-Änderung zurückgestellt. Dieser Nachtrag ist die eigene Entscheidung dazu.

## Entscheidung

1. **Der Kern bleibt ohne Netz.** `connect-src 'none'` bleibt. Der Kern öffnet die Brücke als eigenes Fenster unter der festen
   Adresse `POD_BRUECKE_URL` (`https://pod.vivodepot.de/bruecke.html`) und spricht mit ihr nur über `postMessage`. Eine
   Navigation in ein neues Fenster ist kein Netzweg des Kerns. Die Brücke wird weiter nie eingebettet.
2. **Was der Kern schickt.** Erst nach `vd-pod-bereit` aus genau dem geöffneten Fenster mit genau der Herkunft
   `POD_BRUECKE_HERKUNFT` schickt der Kern einmal `{typ:'vd-pod-ablegen', fassung:1, id, art, bis, daten}`. `daten` ist ein
   übertragener `ArrayBuffer` mit denselben Bytes wie der Datei-Weg. `bis` liegt fünf Sekunden vor der eigenen Frist.
   `targetOrigin` ist die feste Herkunft, nie `*`. Die drei Aufrufer sind der Freigabe-Link (`link`), der Ausschnitt für einen
   Empfängerkreis (`stelle`) und die Sicherungskopie (`eigen`; nicht im Sub-Depot). In der Vorschau, und damit in der
   Vorführung, öffnet `podAblegen` keine Brücke und die Knöpfe fehlen, wie beim Datei-Weg dort nichts hinausgeht. Es läuft
   ein Auftrag zur Zeit. Die `postMessage`-Aufrufe des Kerns stehen in einer Positivliste mit
   genau zwei Einträgen; eine Probe mit dem Kennwort `G2·Nutzlast` hält sie, mit Rot-Beweis.
3. **Was der Kern annimmt.** Nur `vd-pod-abgelegt` aus demselben Fenster mit derselben Herkunft, mit der eigenen `id`, mit
   genau den Feldern `typ`, `fassung`, `id`, `adresse`, und nur eine Adresse, die `podAdressePruefen` besteht: https, keine
   Zugangsdaten, keine Steuer- oder Leerzeichen, beim Freigabe-Link höchstens 128 Zeichen wie `shlUriBauen`. Nach zehn Minuten
   verfällt der Auftrag; der Zuhörer wird entfernt.
4. **Was die Brücke annimmt.** Nur Nachrichten von `window.opener`, nur von einer bekannten Herkunft oder `null`, nur nach
   Anmeldung und bestätigtem Speicher (U2-ADR-512 Punkt 8), nur genau die sechs Felder, eine `id` aus 22 Zeichen, eine der
   drei Arten, ein `bis` in der Zukunft, einen `ArrayBuffer` mit gültigem UTF-8, und nur, was die Tür je Art besteht
   (`passtZurArt`). Je Laden der Seite nimmt sie einen Auftrag an; ein zweiter ersetzt den gezeigten nicht. Alles andere wird
   ohne Antwort verworfen. `vd-pod-bereit` trägt keine Daten.
5. **Die Person bestätigt jeden Auftrag.** Die Brücke zeigt, was abgelegt werden soll, für wen es lesbar wird und wie groß es
   ist. Abgelegt wird erst nach dem Klick und nur bis `bis`; danach verfällt der Auftrag auch in der Brücke. Ein Klick in den
   ersten 800 Millisekunden nach dem Erscheinen des Auftrags gilt nicht, damit ein Doppelklick nicht auf „Ablegen“ landet. Bei einer Stelle
   prüft die Brücke die WebID, bevor sie etwas in den Pod schreibt.
6. **Herkunft.** Bekannte Herkünfte des Kerns stehen in `pod/konfiguration.js`; jede andere Herkunft außer `null` wird
   verworfen. Ein Kern vom Stick hat die Herkunft `null`, wie jede sandbox- oder `data:`-Seite. Dann sagt die Brücke, dass die
   Herkunft nicht erkennbar ist, und warnt: wer nicht gerade selbst „Im Pod ablegen“ gewählt hat, legt nichts ab. Die Antwort
   geht dann an `*`; sonst an die Herkunft des Auftrags.
7. **Auslieferung.** `pod.vivodepot.de` darf keine Kopfzeile senden, die die Verbindung zum öffnenden Fenster trennt
   (`Cross-Origin-Opener-Policy: same-origin`). Gemessen am 25.10.2026: Der Kern unter privat-de sendet keine solche Kopfzeile.
   Ohne Host öffnet der Knopf eine Seite, die nicht antwortet; die Person sieht nach Ablauf der Frist einen Hinweis.

## Grenzen und Restrisiken

- **Herkunft `null`:** Die Antwort an `*` erreicht, was zum Zeitpunkt der Antwort im öffnenden Fenster steht. Das ist der Kern
  vom Stick, oder eine Seite, auf die er inzwischen gewechselt ist, oder eine sandbox-Seite, die die Brücke selbst geöffnet hat.
  Diese Seite erfährt die Adresse im Pod und damit oft, wer die Person ist. Die Warnung im Satz ist der Schutz; die Adresse
  allein gibt nur Chiffrat.
- **Kopplung an das öffnende Fenster:** Weil der Kern die Brücke mit Öffner-Verbindung öffnet, könnte eine kompromittierte
  Brückenseite den Tab des Kerns umlenken. Die strenge CSP der Brücke (U2-ADR-512 Punkt 2) bleibt darum Bedingung.
- **Aussteller:** Die Anmeldung läuft im Fenster der Brücke über die Seiten des Ausstellers. Sendet ein Aussteller
  `Cross-Origin-Opener-Policy: same-origin`, ist die Verbindung danach getrennt; dann kommt kein „bereit“, und der Kern meldet
  nach der Frist den Hinweis. Gemessen ist nur der Community Solid Server der Strecke, bei dem die Verbindung hält.
- **Vermerk und Frist beim Hochladen:** Die Brücke prüft `bis` vor dem Hochladen, nicht währenddessen. Beginnt ein großes
  Hochladen kurz vor `bis`, kann die Frist des Kerns vor der Antwort ablaufen. Dann meldet der Kern den Ablauf, obwohl die Datei
  im Pod liegt. Der Kern vermerkt eine Ausgabe an einen Empfängerkreis erst mit der Antwort; geht sie verloren oder kommt sie zu
  spät, fehlt der Vermerk. Die Person sieht die Adresse in der Brücke.
- **Strecke im Browser:** Die E2E-Strecke gegen einen lokalen Community Solid Server führt Stufe 2 in Chromium, Firefox und
  WebKit. Kern und Brücke liefert dort eine Route des Browser-Kontexts unter ihren festen Herkünften aus. Weiterleitungen des
  Pods werden in Seiten umgesetzt, die per Meta-Refresh weitergehen, weil eine Route keiner Weiterleitung folgt. In Chromium
  erlaubt die Strecke den Zugriff von pod.vivodepot.de auf den lokalen Pod (Local Network Access); ein echter Pod ist kein
  lokaler Host.
- Nicht Teil: ACP, der Schutz gegen eine zurückgespielte ältere Sicherung (wie U2-ADR-512).

## Erwogen und verworfen

- **Die Brücke im iframe:** U2-ADR-512 Punkt 2 schließt das Einbetten aus (Clickjacking, geteilte Herkunft der IndexedDB).
- **`targetOrigin` `*` im Kern:** Damit könnte ein umgeleitetes Fenster Chiffrat und Auftrag erhalten. Die feste Herkunft kostet
  nichts.
- **Antwort bei Herkunft `null` ganz weglassen:** Dann wartet ein Kern vom Stick bis zur Frist, obwohl die Adresse auf dem
  Schirm steht. Die Antwort trägt nichts außer dieser Adresse; das Leck an die öffnende Seite steht oben unter den Grenzen.

```yaml
konformitaet:
  - aussage: >-
      Der Kern schickt das Chiffrat erst nach „bereit“ aus genau dem geöffneten Fenster mit fester Herkunft, einmal, an die feste
      Herkunft und nie an *; er nimmt nur eine Antwort mit eigener id, vier Feldern und geprüfter Adresse an.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Stufe 2 (25.10.2026)
    pruefung:
      - tests/pod-ablegen-kern.test.js "[Pod·Kern] fester Ort, nichts vor „bereit“, die Bytes einmal an die feste Herkunft, dann die geprüfte Adresse"
      - tests/pod-ablegen-kern.test.js "[Pod·Kern] „abgelegt“ zählt nur mit eigener id, vier Feldern, fester Herkunft und geprüfter Adresse"
      - tests/pod-ablegen-kern.test.js "[Pod·Kern] nach der Frist verfällt der Auftrag; unbekannte Art und leerer Text gehen nicht hinaus"
      - tests/pod-ablegen-kern.test.js "[Pod·Kern·Rot-Beweis] ohne Herkunftsprüfung nähme der Kern eine Antwort einer fremden Seite an"
  - aussage: >-
      In der Vorschau und der Vorführung öffnet der Kern keine Brücke.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Stufe 2 (25.10.2026)
    pruefung:
      - tests/pod-ablegen-kern.test.js "[Pod·Kern·Vorschau] in der Vorschau und der Vorführung öffnet sich keine Brücke; mit Rot-Beweis"
  - aussage: >-
      Die drei Aufrufer geben dieselben Bytes wie ihr Datei-Weg.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Stufe 2 (25.10.2026)
    pruefung:
      - tests/pod-ablegen-kern.test.js "[Pod·Kern] die drei Aufrufer geben dieselben Bytes wie ihr Datei-Weg"
  - aussage: >-
      Die Brücke nimmt einen Auftrag nur vom öffnenden Fenster, nur von einer bekannten Herkunft oder null, nur nach bestätigtem
      Speicher, nur bis bis und nur in der Form je Art an, einen je Laden; sie legt erst nach dem Klick ab und antwortet nur dem
      Öffner.
    zustand: erfuellt
    herkunft: U2-ADR-512-Nachtrag Stufe 2 (25.10.2026)
    pruefung:
      - tests/pod-bruecke-stufe2.test.js "[Stufe2] bereit erst mit bestätigtem Ziel; Auftrag gezeigt, abgelegt nach dem Klick, Antwort nur an den Öffner"
      - tests/pod-bruecke-stufe2.test.js "[Stufe2] verworfen ohne Antwort: fremdes Fenster, vor dem Ziel, Klartext, falsche Art, Zusatzfeld, falsche id, falsche Form"
      - tests/pod-bruecke-stufe2.test.js "[Stufe2] Herkunft null (vom Stick): der Satz sagt es, die Antwort trägt nur die Adresse"
      - tests/pod-bruecke-stufe2.test.js "[Stufe2] ein Auftrag je Laden; nach bis kein Ablegen; eine Stelle ohne gültige WebID schreibt nichts"
      - tests/pod-bruecke-stufe2.test.js "[Stufe2·Rot-Beweis] ohne die Prüfung der Herkunft nähme die Brücke den Auftrag einer fremden Seite an"
      - tests/pod-bruecke-stufe2.test.js "[Stufe2·Rot-Beweis] ohne die Prüfung auf das öffnende Fenster nähme die Brücke einen fremden Auftrag an"
  - aussage: >-
      Im Browser gegen einen lokalen Community Solid Server: aus dem Kern ablegen, freigeben, abholen, zurücknehmen; nach der
      Rücknahme verweigert der Pod den Abruf ohne Anmeldung (401 oder 403, gemessen 401), und der Rumpf trägt keinen Teil des
      Chiffrats; der Kern stellt dabei keine Anfrage. In Chromium, Firefox und WebKit.
    zustand: offen
    frist: 2026-10-30
    bedingung: tests/e2e-pod/pod-bruecke.spec.js grün in Chromium, Firefox und WebKit mit installiertem Server (npm run test:e2e:pod); die Strecke überspringt sich ohne VD_POD_CSS und zählt darum nicht als Beleg in der Suite
    herkunft: U2-ADR-512-Nachtrag Stufe 2 (25.10.2026)
```
