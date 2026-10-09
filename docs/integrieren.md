# integrieren.md — eine andere Anwendung an Vivodepot anbinden

**Für wen:** Entwicklerinnen und Entwickler anderer Software (Praxis- und Fachverfahren, Vorgangsbearbeitung, Wallets,
Portale), die Daten mit dem Vivodepot einer Person austauschen wollen. English version:
[`INTEGRATION.md`](INTEGRATION.md), [`DATA-MODEL.md`](DATA-MODEL.md), [`REQUESTS-AND-RESPONSES.md`](REQUESTS-AND-RESPONSES.md).

**Die eine Regel, die alles Weitere bestimmt:** Vivodepot läuft im Browser der Person. Seine Content Security Policy
setzt `connect-src 'none'` (nachsehen: `grep -n "connect-src" vivodepot.html`). Die Anwendung kann also keine Daten
über das Netz senden oder abrufen. Ihre eigenen Dateien darf sie von dort laden, wo sie liegt. Es gibt keinen
Server, der Depots hält oder ihre Inhalte mitliest, keine Schnittstelle zum Aufrufen und kein Konto. Teilt die Person per Link, liegt
die Datei dort nur verschlüsselt; den Schlüssel trägt der Link. Jede Anbindung ist eine **Datei oder ein
Link, den die Person selbst weitergibt**.

---

## 1 · Dateien, die die Person an Sie exportiert

Vivodepot schreibt Standardformate, zum Beispiel FHIR R4 / IPS, SD-JWT VC, vCard 4.0 und iCalendar 2.0. Zu jedem
Export nennt [`STANDARDS.md`](../STANDARDS.md) Standard, Version und Profil. Welche Formate auch zurückgelesen werden
und was gegen externe Prüfer gemessen ist, steht in [`INTEROPERABILITY.md`](../INTEROPERABILITY.md). Beide Dokumente
werden aus dem Code gepflegt. Diese Seite wiederholt ihre Listen nicht, damit sie nicht davon abweichen kann.

Um Daten zu empfangen, nehmen Sie die Datei an, die Ihnen die Person gibt, und prüfen sie mit dem Prüfer ihres
Standards. Eine Ausnahme: Die SD-JWT-VC-Exporte signiert die App der Person selbst, keine Institution. Ein Prüfer
erkennt ihren Aussteller deshalb nicht (siehe „Selbstauskunft-Nachweise“ in [`STANDARDS.md`](../STANDARDS.md)).

## 2 · Dateien, die Sie der Person geben

Die Person importiert die Datei in der App und sieht eine Vorschau, bevor etwas übernommen wird. Welche Formate sich
importieren lassen, steht in [`INTEROPERABILITY.md`](../INTEROPERABILITY.md), Abschnitt 1. Einen Anbieter-Nachweis
prüft die App gegen den Vertrauensanker von Vivodepot, bevor sie etwas übernimmt. Dafür braucht es ein
Anbieterzertifikat, und das stellt Vivodepot aus.

## 3 · Ein eigenes Format ohne Code: Format-Module

Braucht Ihr System ein Format, das Vivodepot nicht hat, beschreiben Sie es als **Format-Modul**. Das ist eine
JSON-Beschreibung, die Depotfelder auf Pfade in Ihrem Format abbildet, für Import oder Export. Auf diesem Weg liest die App JSON,
XML, CSV, SD-JWT und vCard und schreibt JSON und XML. Andere Dateiarten lassen sich noch nicht beschreiben. Das Schema
ist [`docs/format-modul/format-modul-schema.json`](format-modul/format-modul-schema.json). Ein Format-Modul enthält
keinen Code. Es sind Daten, die die App auslegt; im Browser der Person kann es nichts ausführen. Wie Module gebaut,
geprüft und aufgenommen werden, steht in [`docs/modules/`](modules/README.md).

## 4 · Eine Person um Daten bitten: die Anfrage

Eine Stelle kann einer Person eine **Anfrage** schicken: welche Felder, wozu. Eine Anfrage, die zusammen mit einem
Anbieterzertifikat signiert ist, prüft die App dagegen und zeigt sie als geprüft. Eine unsignierte Anfrage nimmt die
App ebenfalls an: Vor dem Antworten durchläuft die Person einen eigenen Schritt, der sich nicht überspringen lässt und
zeigt, wohin die Antwort geht. In beiden Fällen entscheidet die Person, was sie beantwortet.
Die Antwort geht verschlüsselt an die Stelle zurück. Die Anfrage reist im Fragment eines Links (`…#anfrage=…`), als
eingefügter Text oder als QR-Code, als base64url der Anfrage oder, bei einer signierten Anfrage, in einer kompakten
Form, die mit `z1.` beginnt. Einzelheiten und Grenzen stehen in [`INTEROPERABILITY.md`](../INTEROPERABILITY.md)
(„Die Anfrage einer Stelle kommt in zwei Formen“). Nachsehen: `grep -n "ANFRAGE_LINK_MARKE" vivodepot.html`.

Eine Anfrage lässt sich im Studio (`vivodepot-studio.html`) bauen. Als geprüft gezeigt wird sie nur, wenn sie
zusammen mit einem Anbieterzertifikat signiert ist. Diese Zertifikate stellt Vivodepot aus; das ist das kostenpflichtige
Angebot. Einzelheiten zu Anfrage und Antwort stehen in Abschnitt 10, ein lauffähiges Beispiel in
[`examples/anfrage-antwort/`](../examples/anfrage-antwort/README.md).

## 5 · Eine Akte per Link teilen: SMART Health Links

Eine Person kann eine Gesundheitsakte als SMART Health Link (`shlink:/`) teilen. Die Datei wird im Browser
verschlüsselt, und der Schlüssel reist nur im Link. Siehe [`STANDARDS.md`](../STANDARDS.md), „Weitergabe — SMART
Health Links“.

## 6 · Ein Depot lesen, ohne etwas zu installieren: die Lese-App

[`vivodepot-lesen.html`](../vivodepot-lesen.html) öffnet eine Depotdatei nur zum Lesen, zum Beispiel für eine
bevollmächtigte Person. Sie braucht das Passwort der Datei, wenn die Datei verschlüsselt ist, und
ändert nichts. Siehe
[`docs/lese-app/README.md`](lese-app/README.md).

## 7 · Was es nicht gibt

- **Keine Programmierschnittstelle.** Es gibt keine HTTP-API, kein SDK und keinen MCP-Server. Die App hört nicht auf
  Nachrichten anderer Seiten: Ihr einziger `postMessage`-Aufruf geht an ihren eigenen Service Worker
  (nachsehen: `grep -n "postMessage" vivodepot.html`).
- **Kein Einbettungsvertrag.** Die App in eine andere Seite einzubetten (iframe, Web-View) ist kein unterstützter Weg
  der Anbindung, und es gibt dafür kein Nachrichtenprotokoll.
- **Kein stiller Zugriff.** Nichts verlässt das Depot, es sei denn, die Person exportiert es oder beantwortet eine
  Anfrage.

Braucht Ihre Anbindung eines davon, beschreiben Sie den Anwendungsfall in einem Issue. Jedes davon wäre eine
Gestaltungsentscheidung mit eigener Sicherheitsprüfung, kein fehlender Schalter.

## 8 · Signaturen prüfen, die Sie erhalten

Wie Sie ein signiertes Modul, ein Template oder ein Produktrezept prüfen, einschließlich Vertrauensanker und
Zertifikatskette, steht in [`VERIFYING-SIGNATURES.md`](VERIFYING-SIGNATURES.md).

## 9 · Bereiche, Feldkennungen und das Feldregister

**Bereiche.** Ein Depot ist in Bereiche geteilt. Die eingebauten Bereiche haben feste ASCII-Kennungen, etwa
`identity`, `finance` oder `housing`. Ein Modul kann Bereiche hinzufügen, aber keinen Bereich umdefinieren, den das laufende Produkt schon
mitbringt. Die
aktuelle Liste steht im Kern (nachsehen: `grep -n "const BEREICH_IDS_EINGEBAUT" -A4 vivodepot.html`).

**Feldkennungen.** Ein Feld heißt `<bereich>.<feld>`, zum Beispiel `identity.givenName`. Die Kennung ist ASCII und wird
nie übersetzt. Was das Feld bedeutet, sagen seine Beschriftungen je Sprache (`label: { de, en }`).

**Eine Kennung bedeutet immer dasselbe.** Sie verschwindet nie aus dem Register, sie wird nur abgelöst, wo es einen gibt, mit
Nachfolger. Jede Kennung hat einen von drei Status:

| Status | Bedeutung |
|---|---|
| `permanent` | gilt; die Voreinstellung |
| `deprecated` | gilt noch, wird aber nicht mehr empfohlen; ein Nachfolger kann genannt sein |
| `obsoleted` | abgelöst; ein Nachfolger ist Pflicht |

Grundlage: [`U2-ADR-409`](adr/vivodepot-U2-ADR-409-feldregister-vorschlaege-von-aussen-2026-09-13.md), Punkte 1, 6 und 10.

**Eine Anfrage erfindet kein Feld.** Felder kommen aus dem Kern oder aus einem Modul, das zum Depot gehört. Nennt eine
Anfrage eine Kennung, die das Depot nicht kennt, wird sie
als unbekannt gemeldet, und die Antwort ist dann als unvollständig gekennzeichnet. Fehlt Ihnen ein Feld, schlagen Sie
es vor; wie, beschreibt dieselbe ADR. Die eigenen Felder eines Templates tragen den reservierten Präfix `tpl_` und
können darum nicht mit den eingebauten Feldnamen zusammenstoßen.

**Das Feldregister** ist öffentlich und ohne Konto lesbar:

| Adresse | Inhalt |
|---|---|
| `https://register.vivodepot.de/feldregister.json` | alle Feldkennungen |
| `https://register.vivodepot.de/feldregister.json.sha256` | seine Prüfsumme |
| `https://register.vivodepot.de/index.json` | Verzeichnis aller Register, mit Prüfsummen und der Fassung, aus der sie gebaut sind |

Jeder Eintrag trägt `kennung`, `bereich`, `status` und `label`. Das Feld `fassung` nennt die Kernfassung, aus der das
Register gebaut ist, und `anzahl` die Zahl der Einträge. Lesen Sie die Zahl dort ab, statt sich auf eine Zahl in einem
Dokument zu verlassen.

Im Repository ist die Quelle [`bereiche/feldkatalog.json`](../bereiche/feldkatalog.json). `tools/feldregister-bauen.js`
baut daraus das veröffentlichte Register. Beide haben dieselbe Liste `felder[].kennung`; eine Prüfung ohne Netz kann
also jede der beiden nehmen.

**Schemas.** Anfrage, Einreichung und Feldmodell eines Templates haben JSON-Schemas (Draft 2020-12) in
[`docs/template-generator/`](template-generator/). Jeder Modultyp hat ein eigenes Schema in einem Ordner
`docs/…-modul/`. Die aktuelle Liste der Modultypen mit ihren Prüfern gibt `node tools/modul-schemas-messen.js` aus.

## 10 · Anfrage und Antwort im Einzelnen

**Die Anfrage nennt Felder, nie Werte.** Sie ist lesbares JSON mit deutschen Schlüsseln. Ihr Schema ist
[`docs/template-generator/anfrage-schema.json`](template-generator/anfrage-schema.json). Pflicht sind `modulTyp` (immer
`anfrage`), `anfrageVersion`, `von`, `zweck`, `grundlage`, `vorgang`, `gueltigBis`, `felder` und `antwort`.

- **Keine Werte.** Eine Anfrage hat keinen Platz für Werte. Schlüssel für Werte, etwa `wert`, `value` oder `daten`,
  lassen den Kern die ganze Anfrage ablehnen. Der Abgleich mit dem Depot geschieht
  auf dem Gerät der Person.
- **Zu jedem Feld ein Zweck.** Jeder Eintrag in `felder` hat seinen eigenen `zweck`. Ein Feld ohne Zweck wird
  verworfen und gemeldet, nie mit dem allgemeinen Zweck aufgefüllt.
- **`grundlage`** nennt die Rechtsgrundlage oder den Anlass. Die Person sieht sie, bevor sie antwortet. Vivodepot zeigt
  sie an, prüft sie aber nicht.
- **`gueltigBis`** ist ein Datum. Eine abgelaufene Anfrage wird als abgelaufen gezeigt und nicht stillschweigend
  beantwortet.

**Signiert oder unsigniert.** Eine Anfrage ohne Zertifikat wird angenommen. Die Person bekommt dann einen eigenen
Schritt, der nennt, wer fragt und wohin die Antwort geht. Kleine Stellen ohne Zertifikat fangen hier an. Grundlage:
[`U2-ADR-152`](adr/vivodepot-U2-ADR-152-die-anfrage-von-aussen-2026-08-20.md), Punkt 6. Eine signierte Anfrage
prüft die App über dieselbe Kette wie ein signiertes Modul (Abschnitt 8).

**Transport.** Neben Datei und eingefügtem Text gibt es den Link mit der Anfrage im Fragment. Die kompakte Form `z1.`
trägt die signierte Anfrage (ein JWS), das Anbieterzertifikat mit `~` angehängt, mit deflate-raw gepackt und dann
base64url-kodiert. Eine unsignierte Anfrage reist in der ersten Form, als base64url des JSON. Die App entpackt
höchstens 64 KiB. Ein QR-Code auf einem Aushang fasst den vollen Link meist nicht. Dann trägt er eine Kurzadresse, die
mit der Anfrage im Fragment zur App weiterleitet. Das Öffnen der Kurzadresse braucht Netz, und wer diese Adresse
betreibt, sieht die IP-Adresse des Telefons und die Uhrzeit. Grundlage:
[`U2-ADR-460`](adr/vivodepot-U2-ADR-460-anfrage-qr-kurzlink-2026-10-01.md).

**Die Antwort** ist ein JWE in Compact Serialization (RFC 7516), gespeichert als Datei mit der Endung `.jwe` und dem
Medientyp `application/jose`. `enc` ist immer `A256GCM`. `antwort.art` in der Anfrage wählt das Verfahren:

| `antwort.art` | `alg` | Geeignet für |
|---|---|---|
| `schluesselpaar` | `ECDH-ES` auf P-256; die Anfrage trägt Ihren öffentlichen Schlüssel in `antwort.publicKeyJwk` | viele Antworten an eine Stelle |
| `einmalpasswort` | `PBES2-HS512+A256KW`, `p2c` genau 600000 | einen einzelnen Vorgang; das Passwort erreicht die Person auf anderem Weg |

- Der geschützte Kopf trägt `typ` `vivodepot-antwort+jwe`, `vorgang` und, wenn die Anfrage einen nennt, `anbieter`. Der
  Kopf ist lesbar und nennt keinen Wert. Bei `ECDH-ES` geht die Vorgangskennung zusätzlich in die Schlüsselableitung
  (`apv`).
- Die Antwort wird auf feste Größenstufen aufgefüllt und nicht komprimiert. Ein Empfänger sollte `zip` ablehnen.
- Nehmen Sie nur `p2c` = 600000 an. Ein gefälschter Kopf mit sehr großem Wert legte sonst die Empfängerseite lahm.
- Eine übliche JOSE-Bibliothek kann die Antwort öffnen; gegengeprüft ist sie mit `jose`. Bei `jose` setzen Sie `maxPBES2Count` auf mindestens 600000. Für eine
  Gegenprobe mit `jose`: `node tools/antwort-jwe-messen.js --jose <Pfad zu jose>`.
- Eine Antwort kann unvollständig sein. Dann ist `vollstaendig` gleich `false`, und `fehlend` und `unbekannt` nennen, was fehlt;
  `zurueckgehalten` zählt die Pflichtfelder, die die Person zurückgehalten hat, ohne sie zu nennen.

Grundlage: [`U2-ADR-153`](adr/vivodepot-U2-ADR-153-der-verschluesselte-rueckweg-2026-08-20.md) und
[`U2-ADR-449`](adr/vivodepot-U2-ADR-449-antwort-als-jwe-2026-09-29.md). Wie dort festgehalten, geht die
Antwortverschlüsselung noch durch eine externe kryptographische Prüfung.
