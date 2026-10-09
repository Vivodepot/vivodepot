# Vivodepot — Souveränität: woran sie im Code hängt

**Jede Zahl hier stammt aus [`docs/faktenbasis.md`](docs/faktenbasis.md)** oder aus einem
namentlich genannten Prüflauf. Was dort nicht steht, steht auch hier nicht.

---

## Was dieses Dokument ist — und was `PRINCIPLES.md` ist

**[`PRINCIPLES.md`](PRINCIPLES.md) sagt, warum Vivodepot so gebaut ist.** Es formuliert
Datensouveränität als Wurzel 1 und begründet sie.

**Dieses Dokument sagt, woran diese Zusage im Code hängt** — Mechanismus für Mechanismus, jeder
mit der Prüfung, die ihn hält. Eine Absichtserklärung ohne diese Zuordnung ist eine Behauptung;
ein Mechanismus ohne Prüfung ist eine Hoffnung.

Wer die Begründung sucht, liest `PRINCIPLES.md`. Wer wissen will, was einen daran hindert, die
Zusage stillschweigend zu brechen, liest hier weiter.

---

## 1 · Die Daten verlassen das Gerät nicht

**Der Mechanismus.** Vivodepot ist eine einzelne HTML-Datei. Sie hat keinen Server, keinen
Account, keine Anmeldung. Die Anwendung selbst sendet keine Daten an einen Server.

**Was es hält:**

- Die Content-Security-Policy sperrt `connect-src` auf `'none'`, also Abrufe per Skript (`fetch`,
  `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`). Geprüft wird zusätzlich, dass es
  **genau einen** CSP-Meta-Tag gibt — eine zweite Policy könnte die erste im Effekt aufweiten.
- Wohin die Seite navigiert, regelt die Content-Security-Policy nicht; ein eingeschleustes Skript
  könnte Daten in der Adresse mitnehmen. Deshalb ist jede Stelle, an der der Code HTML über
  `innerHTML`, `outerHTML`, `insertAdjacentHTML` oder `document.write` aus einem Wert erzeugt,
  einzeln geprüft und mit Begründung in einer Liste geführt; eine neue oder geänderte Stelle ist rot,
  bis sie geprüft ist (`tests/html-senken-grundlinie.test.js`).
- Im eigenen Code kommt kein `fetch`, kein `XMLHttpRequest`, kein `WebSocket`, kein
  `navigator.sendBeacon`, kein `EventSource`, kein entferntes `import()` und kein
  `<link rel="preconnect">` oder `dns-prefetch` vor, und der Code liest `navigator.connection`
  (den Netzzustand) nicht. Für jede dieser acht Stellen gibt es eine eigene Prüfung.
- Ein Playwright-Lauf zeichnet den echten Netzwerkverkehr über einen vollständigen Ablauf auf —
  Depot anlegen, füllen, PDF erzeugen, exportieren, wieder einlesen — und verlangt **null**
  externe HTTP/S-Requests und **null** WebSocket-Verbindungen.
- Die PDF-Bibliothek hat einen Netzpfad; er ist statisch unerreichbar gemacht. Der eigene Code
  ruft `addFont`, `addFileToVFS` und `loadFile` nie auf, und jeder `addImage`-Aufruf übergibt eine
  `data:`-URL statt eines abrufbaren Verweises.

**Die Grenze, die dazugehört:** Diese Prüfungen messen den ausgelieferten Code. Sie können nicht
verhindern, dass jemand eine veränderte Datei verteilt — dagegen hilft nur der Fingerprint-Abgleich
aus [`SECURITY.md`](SECURITY.md), und der setzt voraus, dass jemand ihn tut.

**Der Kurzlink einer Anfrage ist kein Abruf der App.** Trägt der QR einer Stelle eine kurze
Adresse, ruft das Handy diese Adresse auf; der Server dort sieht Adresse und Zeitpunkt und leitet
auf die App weiter. Die Anfrage steht im Fragment der App-Adresse, das der Browser an keinen Server
schickt. Die App selbst öffnet dabei keine Verbindung, `connect-src 'none'` bleibt. Ohne Netz
lässt sich ein solcher QR nicht öffnen (U2-ADR-460).

---

## 2 · Der Anbieter hat keinen Zweitschlüssel

**Der Mechanismus.** Der Schlüssel wird aus dem Passwort der Halterin abgeleitet, bei jedem
Öffnen neu. Er liegt nirgends gespeichert. Einen Weg zu den Daten am Passwort vorbei gibt es für
den Anbieter nicht.

Den einzigen zweiten Weg zum vollen Depot hält die Halterin selbst: den optionalen
Wiederherstellungs-Code ([U2-ADR-430](docs/adr/vivodepot-U2-ADR-430-wiederherstellungs-huelle-abwaehlbar-2026-09-21.md)). Die Anwendung erzeugt ihn beim Anlegen eines Depots
oder später in den Einstellungen, mit mindestens 128 Bit Entropie; die Halterin schreibt ihn ab und
verwahrt ihn. Er wickelt das Ergebnis der Passwort-Ableitung, aus dem der Schlüssel entsteht, ein
zweites Mal ein, läuft durch dieselbe Ableitung wie das Passwort und wird von der Anwendung in keine Datei und keinen
Druckauftrag geschrieben. Er ist voreingestellt und lässt sich abwählen; dann entsteht die zweite
Hülle nicht.

**Die Zahlen:** PBKDF2 mit 600 000 Iterationen, AES-256-GCM, Krypto-Version 3 und 4 (beide
lesbar — 4 ist der Zerfall in Feld-Einheiten, 3 bleibt der Rückweg), Signaturen EdDSA mit ES256
als Rückfall.

**Was es hält — und das ist der ungewöhnliche Teil:** es gibt Prüfungen, die die **Abwesenheit**
eines Wiederherstellungswegs beim Anbieter erzwingen.

- Das Passwort ist Pflicht-Argument der Ableitung; ein Aufruf ohne es ist kein gültiger Aufruf.
- `sessionHkdfKey` darf **nur** innerhalb der einen Setup-Funktion gesetzt werden. Ein zweiter,
  außenliegender Setzer macht die Prüfung rot.
- Kein neuer Bezeichner der Familie `master`, `recovery`, `reset`, `escrow`, `backdoor`,
  `wiederherstell` darf im eigenen Code auftauchen, außer den zwei namentlich gebundenen der
  Wiederherstellungs-Hülle (feste Funktionen, feste Zahl von Vorkommen). Diese Prüfung ist bewusst grob: sie schlägt
  auch bei harmlosen Namen an, und das ist der Preis dafür, dass sie den nicht-harmlosen findet.
- `crypto.subtle.exportKey` wird nur auf öffentliche Schlüssel angewandt, nie auf abgeleitete oder
  private.
- Eine Laufzeit-Inventur zählt jeden erzeugten Schlüssel und verlangt, dass **jeder geheime oder
  private** davon `extractable: false` trägt. Sie unterscheidet dabei Produktphase von
  Testgerüst — sonst könnte ein Testschlüssel die Aussage über das Produkt verwässern.

**Die Grenze:** Wer Passwort und Wiederherstellungs-Code verliert, verliert die Daten; wer den
Code abgewählt hat, schon mit dem Passwort. Das ist dieselbe Aussage von der anderen Seite: ein
Wiederherstellungsweg beim Anbieter wäre ein Zweitschlüssel in fremder Hand.

---

## 3 · Das Depot ist eine Datei, die der Halterin gehört

**Der Mechanismus.** Das Depot ist eine Datei auf ihrem Gerät. Sie kann sie kopieren, sichern,
mitnehmen, löschen — ohne Vivodepot zu fragen.

**Was es hält:** Die Inhalte des Depots stehen in der geschriebenen Datei nur verschlüsselt. Für Name,
Geburtsdatum und Gesundheitswerte wird das nach einem vollständigen Ablauf am erzeugten Byte-Strom geprüft,
nicht am Vorsatz. Was unverschlüsselt bleibt, nennt SECURITY.md, Abschnitt 6.6. Und die Datei kommt in
dieselbe Anwendung zurück: derselbe Prüflauf öffnet die eben geschriebene Datei erneut und
entschlüsselt sie.

**Kein App-Store-Zwang.** Der ausgelieferte Kern enthält keinen Store-Verweis. Die
Service-Worker-Registrierung schließt `file://` ausdrücklich aus, und der Installations-Hinweis
ist rein additiv — er sperrt keine Funktion. Auch das ist geprüft, nicht zugesagt: eine eigene
Probe verlangt, dass der Service-Worker- und Installations-Zustand **keine** Funktion außerhalb
der bekannten Anzeige-Funktionen steuert.

---

## 4 · Was hinausgeht, geht auf Ansage hinaus

**Der Mechanismus.** Ein Export ist immer eine Handlung der Halterin. Es gibt keinen
Hintergrund-Abgleich, keine Telemetrie, keine Fehlerberichte.

Innerhalb dessen gilt eine zweite Stufe: **Felder, die als sensibel geführt sind, werden bei der
Herausgabe zurückgehalten**, solange sie nicht ausdrücklich freigegeben werden. Wie viele Felder
das betrifft, hängt von der Zusammensetzung des Produkts ab — fest ist die Regel, nicht die Zahl.
Ein neues sensibles Feld ohne Eintrag in der geführten Liste macht eine Prüfung rot — die Menge
kann nicht still wachsen und nicht still schrumpfen.

**Die Lese-App** (`vivodepot-lesen.html`) ist ein eigenständiger Empfänger und hält dieselbe
Zurückhaltung ein: sie zeigt an, was sie bekommt, nicht was sie könnte.

**Was zurückkommt und was nicht**, steht in [`INTEROPERABILITY.md`](INTEROPERABILITY.md).

---

## 5 · Die Anwendung überlebt ihren Hersteller

**Der Mechanismus.** Der App-Code steht unter EUPL-1.2. Die Datei läuft ohne Server, ohne
Lizenzschlüssel, ohne Abruf. Wer sie heute hat, kann sie in zehn Jahren öffnen — auch wenn es die
Vivodepot GmbH dann nicht mehr gibt.

Die Bürgervorlagen stehen unter derselben Lizenz. Amtlicher Wortlaut Dritter (Formulare und
Textbausteine von Behörden) ist davon ausgenommen — den lizenziert Vivodepot nicht, weil er nicht
sein ist. Details in [`LICENSING.md`](LICENSING.md).

**Die Grenze:** Diese Zusage hängt am Format, nicht an der Lizenz allein. Ein
Depot ist nur so lange lesbar, wie jemand eine Fassung der Anwendung hat, die sein Schema kennt.
Vivodepot hält darum eine lückenlose Migrationskette vom ältesten lesbaren Schema bis zum heutigen
vor; die heutige Schema-Version steht in [`docs/faktenbasis.md`](docs/faktenbasis.md). Jeder Schritt
ist durch eine Probe abgedeckt oder begründet als nicht prüfbar geführt, und die Zahl der nicht
prüfbaren Schritte ist festgenagelt: sie kann nicht still wachsen.

---

## Was hier bewusst nicht steht

**Keine Zusage über fremde Systeme.** Was eine Behörde oder ein Fachverfahren mit einer
exportierten Datei tut, liegt außerhalb.

**Keine Rechtsberatung.** Dieses Dokument beschreibt Mechanismen, keine Rechtslage.

**Keine Zahlen ohne Herkunft.** Wo ein Wert steht, stammt er aus der Faktenbasis oder aus einem
benannten Prüflauf. Wo keiner steht, ist keiner gemessen worden.
