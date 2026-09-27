# U2-ADR-415: Vom Stick geöffnet — beim Schließen auf den Stick, danach die Browser-Kopie räumen

**Status:** Angenommen — gebaut
**Datum:** 16.09.2026
**Kategorie:** SPEICHER, DATENSCHUTZ
**Linie:** U2
**U2-Bezug:** U2-ADR-237 (jede Änderung sichert still intern) · U2-ADR-244 (der Speicherort entfällt
beim Anlegen) · U2-ADR-015 (zwei Ebenen: interner Stand und Datei) · U2-ADR-031 (Persistenz-Status
ehrlich) · U2-ADR-211 (Sicherungsstand bekannt) · U2-ADR-062-Nachtrag (Ort-Hinweis, passwortlos
lesbar) · U2-ADR-097 §12 (keine Browser-Erkennung über Kennungen)
**Anker:** Entscheidung vom 16.09.2026 („Mittelweg"), nach einer Messung, die eine stille
Änderung sichtbar machte.
**Status heute:** gilt — gebaut und belegt, s. Konformität.

---

## Kontext

Vivodepot wird auch auf einem USB-Stick verkauft. Bis zum 12.09.2026 war der Fall einfach: über
`file://` galt der interne Speicher als abgeschaltet, alles lief über die Datei. Seit dem Wegfall
der pauschalen Protokoll-Flagge entscheidet allein die Funktionsprobe — und die fällt über `file://`
in Chromium, Firefox und WebKit positiv aus. Gemessen am 16.09.2026, in allen drei Engines.

Damit hatte sich etwas verschoben, das niemand entschieden hatte: **Wer die Datei vom Stick auf
einem fremden Rechner öffnet, arbeitet in dessen Browser-Speicher.** Auf den Stick kam nur, was
ausdrücklich gesichert wurde; zurück blieb eine vollständige Kopie des Depots — auf einem Rechner,
der der Bürgerin nicht gehört.

Drei Wege standen zur Wahl: alles wie bisher; wieder direkt auf den Stick schreiben; oder ein
Mittelweg. Der zweite Weg ist nur in Chromium wirklich „auf den Stick": Firefox und Safari kennen
keinen Zurückschreib-Pfad, dort erzeugt jede Sicherung eine neue Datei im Download-Ordner desselben
fremden Rechners — schlechter, nicht besser, und genau die Dateiflut, wegen der U2-ADR-237 entstand.

## Entscheidung

**Während der Arbeit still im Browser sichern. Beim Schließen einmal auf den Stick. Danach die
Browser-Kopie räumen.** Und: nur die Stick-Ausgabe räumt, nur nach einem bestätigten
Schreibvorgang auf die Datei, und der Hinweistext benennt, was trotzdem bleiben kann.

1. **Die Auslieferungsform steht in der Datei, sie wird nicht erraten.** Eine gebackene Region
   `AB_WERK_AUSGABE` trägt `{ art: 'stick' }`. `file://` allein taugt nicht als Erkennung — die
   heruntergeladene Datei im eigenen Download-Ordner hat dieselbe Adresse. Den Pfad zu deuten
   (`/Volumes`, Laufwerksbuchstabe) wäre Raten und dieselbe Sorte Erkennung, die U2-ADR-097 §12
   ausschließt.
2. **Geräumt wird nur nach einem bestätigten Schreibvorgang auf die Datei.** Das ist allein `datei`
   (File System Access, erfülltes `close()` — dieselbe Datei in place). Alles andere bestätigt
   höchstens, dass etwas die Anwendung verlassen hat, nicht, dass es auf dem Stick liegt:
   - Ein `download` landet im Download-Ordner, und der Browser meldet dem Skript nie, ob und wohin.
   - Ein `geteilt` bestätigt nur die Übergabe an eine andere App — Mail, Notizen, Dateien —, nicht
     das Ziel. Safari teilt genau über diesen Weg. Ohne Rückfrage hätte eine Übergabe an Notizen die
     einzige Kopie gelöscht, ohne dass je etwas auf dem Stick lag.

   Für beide fragt die Anwendung: „{marke} erfährt nicht, wohin die Datei gegangen ist — in den
   Download-Ordner, an eine andere App oder auf den Stick." Erst ein Ja räumt. „Noch nicht" ist kein
   Fehlerfall: die Kopie bleibt, das Fenster schließt, beim nächsten Öffnen steht sie wieder zur
   Verfügung.

   **Abgrenzung zum Datei-Signal:** Beim Setzen des Datei-Signals zählt `geteilt` weiterhin als
   bestätigter Zweig (`depotHerunterladen`) — dort zu Recht, denn die Nutzerin hat die Übergabe selbst
   ausgelöst. Für das Signal genügt „übergeben"; für das Löschen der letzten Kopie genügt es nicht.
   Die beiden Einordnungen dürfen darum nicht aus derselben Liste kommen.
3. **Scheitert das Schreiben, bleibt die Kopie.** Sie ist dann der einzige Stand, den es gibt.
4. **Die eigene Download-Datei behält ihre Kopie.** Ohne Merkmal ändert sich nichts. Das steht auf
   sicherem Grund, seit die Kopie vollständig verschlüsselt ist (der Ort-Hinweis geht seither nicht
   mehr mit hinaus, s. U2-ADR-062-Nachtrag und der Wächter unten).
5. **Der Hinweistext sagt, was ist.** „Schließen Sie das Fenster hart, kann eine verschlüsselte
   Kopie in diesem Browser bleiben, bis Sie Vivodepot hier wieder öffnen." Kein Versprechen, dass
   nichts bleibt — die Anwendung kann ein Profil nicht räumen, in dem sie nicht läuft.

## Wie die Entscheidung zustande kam — die Reihenfolge ist Teil davon

Die Zustimmung zu Punkt 4 („die eigene Download-Datei behält ihre Kopie") kam **unter einer
Bedingung**: nur, wenn diese Kopie verschlüsselt ist. Die Bedingung wurde nicht angenommen, sondern
gemessen — und sie war zu diesem Zeitpunkt **nicht erfüllt**.

Gemessen am 16.09.2026 gegen den damaligen Stand: die Depot-Inhalte lagen verschlüsselt, aber neben
dem Chiffrat stand ein Freitext im Klartext — der Ort-Hinweis aus U2-ADR-062-Nachtrag, der sagt, WO
ein zweites Passwort physisch liegt („versiegelter Umschlag im Tresor"). Er ist dort absichtlich
passwortlos lesbar, damit Angehörige ihn finden. Für die Datei ist das entschieden; für eine Kopie
auf einem fremden Rechner ist es etwas anderes.

Darum wurde der Bau **angehalten und die Bedingung vorgelegt**, statt sie als erfüllt zu behandeln.
Die Antwort war, den Hinweis nicht mehr in die Browser-Kopie zu schreiben — er bleibt in der Datei.
Erst danach war die Bedingung wahr und dieser ADR baubar.

Geprüft und verworfen wurde dabei auch die naheliegende Milderung „den Hinweis intern zeigen, aber
hinter einem Passwort": am Eintrittsschirm existieren nur das Depot-Passwort (wer es hat, liest den
Ort ohnehin im Depot) und das Fach-Passwort eines Empfängerkreises (genau jenes, dessen Ort der
Hinweis nennt). Ein Hinweis hinter einem Passwort erreicht die Person nicht mehr, für die er
geschrieben ist. Die Folge wurde ausdrücklich in Kauf genommen: wer am Rechner der Verstorbenen
sitzt und keine Depot-Datei zur Hand hat, sieht den Hinweis dort nicht mehr; der Weg bleibt die Datei.

**Warum das hier steht und nicht nur im Ergebnis:** Ohne diese Reihenfolge liest sich Punkt 4 wie
eine Bequemlichkeit („die Kopie darf bleiben"). Er ist das Gegenteil: eine Zusage, die erst gilt,
seit eine andere Lücke geschlossen wurde, und die mit ihr fällt. Wer den Ort-Hinweis je wieder in
die Browser-Kopie schreibt, nimmt Punkt 4 die Grundlage — der Wächter unten wird dann rot.

## Was nicht entschieden wurde

Der Weg „direkt auf den Stick statt erst in den Browser" bleibt offen und liegt vor. Die Messung
dazu ist gemacht: in Chromium wäre es eine Datei, die in place überschrieben wird; in Firefox und
Safari je Sicherung eine neue Datei im Download-Ordner des fremden Rechners, und die stille
Zwischensicherung entfiele ganz.

## Folgen

- Der interne Weg bleibt unverändert der Alltag (U2-ADR-237), auch auf dem Stick.
- Ein Depot, das in demselben Browser verwahrt wird und einem anderen Anker gehört, bleibt stehen.
  Geräumt wird genau das Depot, das gerade offen ist, über seine Kennung — nicht über die
  produktgefilterte Sicht auf den Speicher, die je Auslieferung anders ausfällt.
- Auf einem Rechner, an den die Bürgerin nie zurückkehrt, kann nach einem harten Abbruch eine
  verschlüsselte Kopie bleiben. Das ist der Rest, den der Hinweistext benennt.

## Konformität

```konformitaet
aussage:  Geräumt wird nur bei Stick-Ausgabe und nur nach einem bestätigten Schreibvorgang auf die
          Datei; ein Download oder eine Übergabe über das Teilen-Blatt räumt erst nach ausdrücklicher
          Bestätigung der Nutzerin, ein
          gescheitertes oder abgebrochenes Sichern räumt nie.
zustand:  geprüft
herkunft: invariante
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick] ohne Stick-Merkmal wird nie geräumt — auch nicht nach bestätigtem Schreiben
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick] Download: erst die Rückfrage, geräumt wird nur auf ein Ja
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick] Teilen-Blatt: die Übergabe an eine App ist keine Bestätigung — Rückfrage wie beim Download
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick · Rot-Beweis] steht geteilt wieder unter den Bestätigungen, räumt es ohne Rückfrage
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick] gescheitertes oder abgebrochenes Sichern räumt nie — die Kopie ist dann alles
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick · Rot-Beweis] ohne die Weiche auf die Auslieferungsform räumt auch die eigene Datei
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick · Rot-Beweis] ohne die Bestätigungs-Weiche räumt auch ein unbestätigter Download
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick] depotInDateiSichern meldet den Weg — sonst hält der Schließen-Weg jedes Sichern für gescheitert
pruefung: tests/e2e/stick-schliessen-raeumt-browser-kopie.spec.js#[Stick] Schließen sichert auf den Stick und räumt danach die Browser-Kopie
```
```konformitaet
aussage:  Geräumt wird genau das offene Depot, über seine Kennung — nicht über die
          produktgefilterte Sicht auf den Speicher; ein zweites, verwahrtes Depot bleibt stehen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick] geräumt wird genau dieses Depot — ein verwahrtes zweites bleibt stehen
pruefung: tests/stick-browser-kopie-raeumen.test.js#[Stick] geräumt wird über die Kennung, nicht über eine produktgefilterte Liste
```
```konformitaet
aussage:  Die Auslieferungsform kommt aus der gebackenen Region der übergebenen Datei; der Kern im
          Repo trägt keine, und ein fehlendes, doppeltes oder nicht-nutzlastförmiges Vorkommen
          bricht den Bäcker ab, statt zu raten.
zustand:  geprüft
herkunft: invariante
pruefung: tools/stick-ausgabe-backen.test.js#[Bäcker] der Kern im Repo trägt KEINE Auslieferungsform
pruefung: tools/stick-ausgabe-backen.test.js#[Bäcker] fehlende Region: Abbruch, kein Schreiben
pruefung: tools/stick-ausgabe-backen.test.js#[Bäcker] doppelte Region: Abbruch — welche wäre gemeint?
pruefung: tools/stick-ausgabe-backen.test.js#[Bäcker · Rot-Beweis] eine Nutzlast, die kein Literal wäre, wird abgewiesen
```
```konformitaet
aussage:  Was im Browser liegen bleibt, ist verschlüsselt: kein Wert aus einem Ablage-Typ steht im
          Klartext im Speicher, und die Klartext-Schlüssel sind genau die benannte Liste.
zustand:  geprüft
herkunft: invariante
pruefung: tests/browser-speicher-nur-verschluesselt.test.js#[Browser-Speicher] kein Marker aus irgendeinem Ablage-Typ steht im Klartext im Speicher
pruefung: tests/browser-speicher-nur-verschluesselt.test.js#[Browser-Speicher] der Umschlag trägt keine Klartext-Felder außerhalb der Liste
pruefung: tests/browser-speicher-nur-verschluesselt.test.js#[Browser-Speicher · Rot-Beweis] ein Kern, der an der Verschlüsselung vorbeischreibt, reißt die Probe
```
