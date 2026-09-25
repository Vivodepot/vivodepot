# Vivodepot — häufige Fragen

**Jede Zahl stammt aus [`docs/faktenbasis.md`](docs/faktenbasis.md).** Wo etwas nicht gemessen
ist, steht das dabei.

---

## Was ist Vivodepot?

Eine einzelne Datei, die im Browser läuft und in der Sie Ihre wichtigen Unterlagen ordnen — vom
Ausweis über die Patientenverfügung bis zum Mietvertrag. Sie brauchen kein Konto, keine
Anmeldung und keine Internetverbindung.

## Wo liegen meine Daten?

Auf Ihrem Gerät, in einer Datei, die Ihnen gehört. Es gibt keinen Server, an den etwas gesendet
würde — und zwar nicht als Versprechen, sondern als geprüfte Eigenschaft: die Anwendung enthält
keinen Netzwerk-Code, ihre Sicherheitsrichtlinie sperrt ausgehende Verbindungen, und ein
Testlauf zeichnet den echten Netzwerkverkehr über einen vollständigen Arbeitsablauf auf und
verlangt null Verbindungen nach außen. Einzelheiten in
[`SOVEREIGNTY.md`](SOVEREIGNTY.md).

## Was passiert, wenn ich mein Passwort vergesse?

Dann sind die Daten verloren. Das ist bewusst so.

Ein Wiederherstellungsweg wäre ein zweiter Schlüssel, und wer einen zweiten Schlüssel hat, kann
ihn auch herausgeben müssen. Vivodepot hat keinen — es gibt Prüfungen, die eigens dafür da sind,
dass niemand versehentlich einen einbaut.

**Was Sie stattdessen tun können:** Bewahren Sie eine Kopie der Depot-Datei an einem zweiten Ort
auf, und Ihr Passwort dort, wo Sie auch andere wichtige Passwörter aufbewahren.

## Wie sicher ist die Verschlüsselung?

Der Schlüssel wird aus Ihrem Passwort abgeleitet, mit 600 000 PBKDF2-Iterationen; verschlüsselt
wird mit AES-256-GCM. Die verwendeten Verfahren werden gegen fremde Testvektoren geprüft — NIST
CAVP für AES-GCM, RFC 5869 für die Schlüsselableitung, Wycheproof für die Randfälle und für
Ed25519-Signaturen. Die Umfänge stehen in
[`INTEROPERABILITY.md`](INTEROPERABILITY.md), Abschnitt 2.

**Wovon der Schutz außerdem abhängt:** Geprüft ist, dass Vivodepot die Verfahren richtig anwendet. Wie
stark Ihr Depot tatsächlich geschützt ist, hängt zusätzlich an Ihrem Passwort und an Ihrem Gerät.

## Kann ich meine Daten wieder herausbekommen?

Ja, in elf Formaten — und zehn davon liest Vivodepot auch wieder ein. Das ist geprüft: ein
Testlauf schreibt aus einem Referenzdepot, liest zurück und vergleicht Feld für Feld.

Das elfte, der Kalender-Export, ist bewusst ein Einbahnweg. Welche Formate es gibt, steht in
[`STANDARDS.md`](STANDARDS.md); was von jedem zurückkommt, in
[`INTEROPERABILITY.md`](INTEROPERABILITY.md).

## Was ist, wenn es Vivodepot als Firma nicht mehr gibt?

Die Datei läuft weiter. Sie braucht keinen Server, keinen Lizenzschlüssel und keinen Abruf. Der
gesamte Software steht unter EUPL-1.2, ist also offen und darf weiterentwickelt werden
([`LICENSING.md`](LICENSING.md)).

## Was ist mit alten Depots aus früheren Fassungen?

Vivodepot bringt Depots von Schema 24 bis zum heutigen Stand 63 mit — 40 Schritte, die beim
Öffnen automatisch durchlaufen. 32 dieser Schritte tragen eine eigene Prüfung, sieben sind über
eine eigene Testdatei abgedeckt, einer ist begründet nicht prüfbar.

Für Depots aus der Vorgängerfassung (Schema 19) gibt es keinen Migrationsweg; sie werden über
einen eigenen Import-Kanal eingelesen.

## Sieht jemand, welche Felder ich als sensibel markiert habe?

Nein — sensible Felder werden bei einer Herausgabe zurückgehalten, bis Sie sie ausdrücklich
freigeben. Wie viele Felder das betrifft, hängt von Ihrer Zusammensetzung ab, nicht von einer
festen Zahl. Die Lese-App, mit der jemand ein weitergegebenes Depot ansieht, zeigt an, was sie
bekommt, und nicht mehr.

**Eine Unschärfe im Wortlaut, die wir Ihnen nicht verschweigen:** die Markierung an einem Kontakt
heißt „Privat". Sie verbirgt den Kontakt nicht innerhalb Ihrer eigenen Anwendung, sondern hält
ihn bei der Herausgabe zurück.

## Kann ich Vivodepot mit Sehbehinderung oder am Telefon bedienen?

Die Anwendung wird gegen WCAG 2.2 AA geprüft, mit axe-core über 35 Sichten der Hauptanwendung und
15 der Lese-App — jeweils ohne Verstoß. Es gibt eine Schriftgrößen-Reihe, einen Kontrast- und
einen Nachtmodus sowie eine Vorlesefunktion.

## Was kostet Vivodepot?

Für Bürgerinnen und Bürger nichts. Die gesamte Software ist Open Source (EUPL-1.2). Finanziert
wird die Weiterentwicklung über Angebote, die Institutionen freiwillig beziehen — Zertifikat,
Marke und das signierte Jahresbündel ([`LICENSING.md`](LICENSING.md)).

## Ich habe eine Sicherheitslücke gefunden — wohin damit?

An die Adresse in [`SECURITY.md`](SECURITY.md); dort steht auch, welche Angaben helfen und in
welcher Frist Sie mit einer Antwort rechnen können.

## Wie komme ich an eine neue Fassung?

Das hängt davon ab, wie Sie Vivodepot nutzen.

**Als Datei (vom Rechner oder Stick):** Die Datei ändert sich nie von selbst und lädt nichts aus
dem Internet nach. Welche Fassung Sie haben, steht unter Einstellungen → „Über Vivodepot"; ist sie
schon länger alt, erscheint dort ein Hinweis. Der Knopf „Nach Aktualisierung suchen" öffnet die
Vivodepot-Website in einem neuen Tab — erst dann gehen Sie online. Eine neue Fassung ist eine neue
Datei, und Sie bekommen sie auf demselben Weg wie die erste: über den Vivodepot-Shop. Laden, öffnen,
„Schon ein Depot? Datei öffnen" wählen und Ihre Depot-Datei mit Ihrem Passwort öffnen. Ihre Daten
liegen in der Depot-Datei, nicht in der App-Datei.

**Als installierte App:** Die App prüft selbst, ob es eine neue Fassung gibt, und übernimmt sie,
sobald nichts mehr zu sichern ist. Unter Einstellungen → „Über Vivodepot" können Sie mit „App-Update
jetzt prüfen" sofort nachsehen lassen.

**Eine Benachrichtigung per E-Mail gibt es nicht.** Vivodepot kennt Ihre Adresse nicht, und es
gibt keinen Verteiler, in den Sie sich eintragen könnten.

## Wie kann ich prüfen, dass meine Datei unverändert ist?

Über den Fingerabdruck (SHA-256), den [`SECURITY.md`](SECURITY.md) in Abschnitt 8 für jede
ausgelieferte Fassung nennt. Das ist der einzige Weg, eine untergeschobene Datei zu erkennen — ein
Browser prüft HTML nicht auf eine Signatur.

---

## Was hier bewusst nicht steht

**Keine Funktionen, die es noch nicht gibt.**

**Keine Rechtsauskunft.** Ob eine Vorsorgevollmacht in Ihrer Lage wirksam ist, beantwortet dieses
Dokument nicht.

**Keine Zahl ohne Herkunft.** Jede Zahl oben stammt aus der Faktenbasis oder einem benannten
Prüflauf.
