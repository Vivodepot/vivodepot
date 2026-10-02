# Vivodepot — Interoperabilität: was zurückkommt, was nachgewiesen ist, was fehlt

**Jede Angabe hier stammt aus [`docs/faktenbasis.md`](docs/faktenbasis.md)** oder aus einem
namentlich genannten Prüflauf. Die Faktenbasis erzeugt `tools/faktenbasis-erzeugen.js` direkt aus
dem geladenen Kern und dem ADR-Bestand; was dort nicht steht, steht auch hier nicht.

---

## Was dieses Dokument ist — und was `STANDARDS.md` ist

Die beiden überschneiden sich absichtlich nicht.

**[`STANDARDS.md`](STANDARDS.md) beantwortet: welches Format erzeugt oder liest der Code, und
trägt es ein nachweisbares Versions- oder Profil-Merkmal?** Dort steht die Formattabelle mit den
`StructureDefinition`-URLs, `vct`-Kennungen und `VERSION:`-Zeilen.

**Dieses Dokument beantwortet die drei Fragen, die danach kommen:**

1. **Kommt zurück, was hinausgeht?** Ein Format zu schreiben ist die halbe Zusage.
2. **Was ist von außen nachgewiesen?** Welche fremden Prüfer laufen gegen den Code, mit welchem
   Ergebnis.
3. **Wo sind die Lücken?** Benannt, nicht weggelassen.

Wer wissen will, *welche* Formate es gibt, liest `STANDARDS.md`. Wer wissen will, *wie weit sie
tragen*, liest hier weiter.

---

## 1 · Was zurückkommt

Die Faktenbasis führt **10 Export-Formate** und **18 Import-Formate**. Unter den
Import-Formaten steht das Depot-JSON (`json`): eine offene Depot-Datei aus früheren Fassungen liest
Vivodepot zurück, neue schreibt es nicht mehr; gesichert wird in der verschlüsselten Depot-Datei.
Die Zahlen sind nicht gegeneinander zu rechnen: eine Datei, die Vivodepot liest, muss es nicht
schreiben können, und die Import-Seite trägt Formate, die es ausdrücklich nur liest (`nurImport`).

### Neun der zehn Export-Formate liest der Code wieder ein

| Export-Format | kommt zurück | Art des Rückwegs |
|---|---|---|
| `fhir-ips` | ja | Teilmenge |
| `sd-jwt-vc-identitaet` | ja | Teilmenge |
| `sd-jwt-vc-finanzen` | ja | Teilmenge |
| `sd-jwt-vc-sozialversicherung` | ja | Teilmenge |
| `xoev-verwaltung` (Verwaltungs-Stammdaten; die Kennung ist historisch, kein Standard dahinter — Suche über alle Standards des XRepository, 30.09.2026) | ja | Teilmenge |
| `fim-json` | ja | Teilmenge |
| `edci-bildung` | ja | alle geführten Bildungsnachweise |
| `vcard-identitaet` | ja | Kontaktangaben, nicht der ganze Sektor |
| `vcard-menschen` | ja | über die Listen-Ebene |
| **`ics-vorsorge`** | **nein — bewusst** | reiner Export (`nurExport`) |

**Der eine Nicht-Rückweg ist eine Entscheidung, kein Mangel.** Ein Kalender ist ein Abkömmling
des Depots, keine Quelle: was aus einem Termin zurückgelesen würde, wäre eine Kopie des schon
Vorhandenen, und ein zweiter Schreibweg in dieselben Felder ist genau die Doppelquelle, die
Vivodepot an anderer Stelle vermeidet (U2-ADR-118).

**„Teilmenge" ist eine Zusage, keine Einschränkung.** Eine Kontaktkarte trägt Kontaktangaben, kein
Identitäts-Dossier; ein IPS-Bundle trägt die medizinische Zusammenfassung, keine Vertragsdaten.
Für jedes dieser Formate ist im Prüflauf festgelegt, **welche Felder unverändert
zurückkommen müssen** — nicht „irgendetwas kommt an".

**Nachgewiesen, nicht behauptet:** ein Round-Trip-Test (im internen Prüfbestand) schreibt aus einem
Referenzdepot, liest zurück und vergleicht Feld für Feld. Der Lauf trägt zwei Positivkontrollen
(ein verfälschtes und ein fehlendes Feld müssen auffallen) und eine Negativkontrolle (der
unveränderte Rundgang darf nichts melden) — ohne die wäre „alles gleich" von „nichts gemessen"
nicht zu unterscheiden.

### Sieben Formate liest Vivodepot, ohne sie zu schreiben

`camt053` (Kontoumsätze), `xmeld` (Meldedaten), `elster` (Steuerdaten), `fhir-lab`
(Laborbefunde), `edci-europass-extern` (fremde Europass-Nachweise), `openbadges-3-extern` (fremd
ausgestellte Open Badges 3.0) und `vivodepot-beta` (Sicherungsdateien der Vorgängerfassung).

**Das ist die Richtung, die zählt.** Diese Formate kommen von Institutionen zur Bürgerin. Sie
zurückzuschreiben hieße, im Namen einer Behörde oder Bank ein Dokument zu erzeugen — dafür ist
Vivodepot nicht der Absender.

`provider-credential` ist als Import-Weg geführt und trägt keinen `parse`-Parser für unsignierten
Text — gelesen wird er stattdessen ausschließlich über den geprüften Pfad (`importPlanGeprueft`/
`felderAusClaims`, erst nach bestandener Signaturprüfung). `fhir-lab` hat eine Erzeuger-Funktion,
die stets `null` liefert. Beides steht so in der Faktenbasis und ist unten unter „Lücken" benannt.

### Die Anfrage einer Stelle kommt in zwei Formen

Eine Stelle schickt ihre Anfrage als signiertes JWS. Die App liest zwei Transportformen: die
bisherige (base64url des Umschlag-JSON) und die kompakte, `z1.` gefolgt von base64url des mit
deflate-raw gepackten JWS samt angehängtem Anbieter-Zertifikat. Die Signaturprüfung ist in beiden
Formen dieselbe. Beim Entpacken bricht die App über 64 KB ab. Ein QR auf einem Aushang trägt nur
eine kurze Adresse; der Server dahinter leitet auf die App-Adresse weiter, die Anfrage steht im
Fragment (U2-ADR-460). Zum Nachsehen: `tests/anfrage-kompakt.test.js`,
`grep -n "ANFRAGE_KOMPAKT_MAX_BYTES" vivodepot.html`.

---

## 2 · Was von außen nachgewiesen ist

Ein Format richtig zu schreiben, misst niemand, der es selbst geschrieben hat. Vivodepot lässt
darum fremde Prüfer gegen den eigenen Code laufen. Alle Läufe hängen im
Konformitäts-Gate (`npm run test:konformitaet`) und laufen vor jedem Push.

| Prüfgegenstand | fremder Maßstab | Umfang |
|---|---|---|
| Ed25519-Signaturen | Wycheproof (Google) | 150 Vektoren, 88 gültig, 62 ungültig |
| AES-256-GCM | NIST CAVP | 20 Encrypt, 5 Decrypt-PASS, 5 Decrypt-FAIL |
| AES-GCM Randfälle | Wycheproof | 39 gültig, 27 ungültig |
| HKDF-SHA-256 | RFC 5869 | 3 Testvektoren |
| HKDF Randfälle | Wycheproof | 83 gültig, 3 ungültig |
| Barrierefreiheit, Haupt-App | axe-core, WCAG 2.2 AA | 35 Sichten, 0 Verstöße |
| Barrierefreiheit, Lese-App | axe-core, WCAG 2.2 AA | 15 Sichten, 0 Verstöße |
| Offline-Garantie | Playwright, echter Netzwerk-Mitschnitt | 0 externe Requests über den ganzen Ablauf |

**SMART Health Links** (Senden und Abholen, `STANDARDS.md`) wurden in der xShare-Validierung auf
der Gazelle-Plattform gegen fremde Gegenstellen gefahren; der Manifest-Weg entstand, weil eine
Gegenstelle nur ihn kann. Diese Läufe hängen an einer externen Plattform und nicht im Push-Gate.
Im Repo halten `tests/shl-provider.test.js` und `tests/shl-abholseite.test.js` die Form fest (Link,
JWE, beide Wege, CSP der Abhol-Seite); ob die Abhol-Seite im echten Browser entschlüsselt, prüft
`node tools/shl-empfangen-probe.js` in einem bewussten Lauf gegen den Ablage-Host.

**Die FHIR-Profilvalidierung läuft getrennt** (`npm run test:konformitaet:extern`), weil sie den
HL7-`validator_cli` und einen Paketabruf braucht. Sie ist deshalb **nicht** Teil des
Push-Gates — wer den Nachweis führen will, fährt sie eigens. Das steht hier, weil eine
Konformitätszusage, deren Prüfung nur manchmal läuft, sonst mehr verspricht, als sie hält; genau
dieser Fehler ist Vivodepot am 26.07.2026 unterlaufen und hat zu U2-ADR-106 geführt.

---

## 3 · Identifizierte Lücken

Vollständig, auch wo es unbequem ist.

**`provider-credential` hat keinen `parse`-Parser für unsignierten Text.** Das Format steht in
der Import-Liste, die Faktenbasis vermerkt „kein Parser hinterlegt" — das gilt für `def.parse`.
Gelesen wird das Format trotzdem: über den geprüften Pfad (`felderAusClaims`, aufgerufen aus
`importPlanGeprueft` erst nach bestandener Signaturprüfung). Kein angekündigter, nicht gebauter
Weg, sondern ein gated statt ein offener Lese-Pfad.

**`fhir-lab` liefert stets `null`.** Die Import-Funktion existiert, ihr Rückgabewert ist
unbedingt leer. Ein Laborbefund kommt heute nicht an.

**Drei der zehn Export-Formate tragen keinen Versions- oder Profil-Marker im Code.** Sieben tun es:
`fhir-ips` (elf `StructureDefinition`-URLs), die drei `sd-jwt-vc-*`-Formate (`vct`-Kennungen),
die beiden vCard-Formate (`VERSION:4.0`) und `ics-vorsorge` (`VERSION:2.0`) sind maschinell als
Profil erkennbar. Für die übrigen drei — `xoev-verwaltung` (historische Kennung, kein Standard dahinter), `edci-bildung` und `fim-json` — gilt: das
Format ist dokumentiert, aber die Datei selbst sagt nicht, welcher Fassung sie folgt. Ein
Empfänger kann das nicht prüfen.

**`fim-json` ist heute kein Format nach einem FIM-Datenschema.** FIM (Föderales Informationsmanagement) ist ein
Standardwerk, kein Dateiformat. Was Vivodepot erzeugt, ist ein eigenes JSON mit **an FIM
angelehnter Feldbenennung**. Die frühere Außendarstellung hat das anders behauptet; korrigiert am
12.08.2026. Die korrigierten Sätze stehen auf der Website und werden dort geprüft, nicht in
diesem Repository.

**Kein Format der App (`vivodepot.html`) trägt eine kryptographische Herkunftssignatur.** Die
`sd-jwt-vc-*`-Exporte schreiben trotz ihres Namens eine JSON-Datei (`{ vct, iss, iat, claims }`,
`application/json`), eine unsignierte Selbstauskunft (`iss` = `urn:vivodepot:selbstauskunft`; U2-ADR-030,
Variante A), kein SD-JWT. Die kompakte SD-JWT-Form erzeugt nur der Dialog „An EUDI-Wallet übergeben“,
dessen Knopf ausgeblendet ist (`EUDIW_SICHTBAR = false`). Sie trägt `alg: none` und ist damit kein
SD-JWT im Sinne von RFC 9901 §4.1, das eine Signatur des Ausstellers verlangt und `none` ausschließt;
ein konformer Prüfer lehnt sie ab (§7.1, Schritt 2a). Die Antwort als JWE (U2-ADR-449) ist
verschlüsselt und gegen Veränderung geschützt, belegt aber keine Herkunft. Wer eine exportierte Datei
erhält, kann nicht prüfen, dass sie aus Vivodepot stammt. Der separate Aussteller
`vivodepot-vc-issuer.html` signiert; er ist nicht die App. Zum Nachsehen:
- `grep -n "{ id: 'sd-jwt-vc-identitaet', kategorie: 'sektor'" -A2 vivodepot.html` zeigt im ersten Treffer, dem Export, `mime: 'application/json'`, `endung: 'json'`; der zweite ist der Import.
- `grep -n "const EUDIW_SICHTBAR" vivodepot.html` zeigt den ausgeblendeten Dialog.
- `grep -n "alg: 'none'" vivodepot.html` zeigt den Kopf seiner kompakten SD-JWT-Ausgabe.
- `grep -n "_signJWS(" vivodepot.html` findet nur die Definition und ihre Beschreibung, keinen Aufruf.
- `grep -n "subtle.sign(" vivodepot.html` findet den HMAC der Adressableitung und den Aufruf im Rumpf von `_signJWS`.

**Die JWE-Serialisierung der SMART Health Links ist von Hand geschrieben** (keine jose-Bibliothek
im Kern) und hat noch keinen externen Krypto-Review. Der Round-Trip ist geprüft
(`tests/shl-provider.test.js`), die Serialisierung selbst von niemandem außerhalb (U2-ADR-047).

---

## Was hier bewusst nicht steht

**Keine Roadmap.** Ein Format, das noch nicht existiert, gehört nicht in ein Dokument über
Interoperabilität.

**Keine Feldlisten je Format.** Die stehen im Code und in den Prüfläufen; sie hier zu wiederholen
schafft eine zweite Quelle, die veraltet.

**Keine Zusage über Empfänger-Systeme.** Dass Vivodepot ein Format standardkonform schreibt,
heißt nicht, dass ein bestimmtes Fachverfahren es annimmt. Diese Prüfung kann nur der Empfänger
führen.
