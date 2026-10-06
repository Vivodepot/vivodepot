# Vivodepot Studio (früher Template-Generator)

Das Studio selbst ist [`vivodepot-studio.html`](../../vivodepot-studio.html) in der Wurzel des Repositorys; die Beschreibung und die Schemata in diesem Ordner gelten für es. Bis v847 hieß das Werkzeug Template-Generator; Ordner und Schemata tragen den alten Namen weiter, und wo unten „Generator“ steht, ist das Studio gemeint.

Eines von vier Vivodepot-Werkzeugen (Bürger-App, Lese-App, VC-Issuer, Studio). Single-File-HTML, offline-first, ohne Netzwerk-Zugriff zur Laufzeit.

## Zweck

Institutionen (Pflegeheim, Praxis, Notariat, …) erstellen damit **ohne IT-Abteilung** ein zertifizierungsfähiges Daten-Template:

1. **Stammdaten** der Institution erfassen (F-2)
2. **Ed25519-Schlüsselpaar** im Browser erzeugen und beide Schlüssel herunterladen (F-3)
3. **Template** definieren — Feld für Feld oder per CSV-Import (F-4)
4. **Submission-Paket** (JSON) erzeugen und selbst an Vivodepot senden (F-8)

Vivodepot prüft das Paket und stellt mit dem **VC-Issuer** ein `VivodepotProviderCredential` aus.

## Weitere Ausgabearten: Andockmodule ohne Code

Seit 27.08.2026 erzeugt der Generator neben dem Feld-Template auch fünf der sechs
`EINLASS_REGISTER`-Modultypen (reine, signierbare JSON-Datenbündel, vgl. die Kontrakt-Faktenübersicht
Teil A): **`institutionsArt`**, **`bereich`**, **`rechtsraum`**, **`format`** und **`branding`** — je ein
eigener „Oder: …"-Baustein mit eigenem „Modul erzeugen"-Knopf. Alle fünf Prüf-Pfade sind wortgleiche
Spiegel der jeweiligen Kern-Prüfer (`institutionsArtModulPruefen`/`bereichsModulPruefen`/
`rechtsraumModulPruefen`/`formatModulPruefen`/`brandingModulPruefen` in `vivodepot.html`) — dieselbe
Ablehnung im Generator wie im Kern, keine zweite Wahrheit. Getestet im Prüfbestand
(Fälle IA-01–IA-08, BM-01–BM-08, RR-01–RR-11, FM-01–FM-11, BD-01–BD-06). `branding` ist zudem das
einzige Register mit `nurGeprueft: true` — ein unsignierter Weg ist dort strukturell versperrt.

Nur **`textsatz`** hat der Generator nicht als Ausgabeart: das Werkzeug nutzt den `textsatz`-Mechanismus
selbst nur, um seine eigene Oberfläche zu übersetzen (`textsatzModulAnwenden`, Zeile ~1305) — nicht, um
ein exportierbares `textsatz`-Modul für andere Anwendungen zu bauen. Für ein solches Modul bleibt
Hand-Autorenschaft gegen das Schema der einzige Weg.

## Bedienung (drei Räume)

Der frühere fünfstufige Assistent ist einer Arbeitsfläche gewichen (GEN1, 19.09.2026). Deutsch und Englisch
sind umschaltbar (Schalter DE | EN im Kopf); der Text steht im Markup deutsch, die englische Fassung daneben in
`data-en` (`data-en-ph`, `data-en-aria`, `data-en-html`), im Code als `L('deutsch', 'english')`.

| Raum | Inhalt |
| --- | --- |
| **Start** | Womit anfangen: leere Vorlage, ein Beispiel (Pflegeheim, Anamnese, Notariat), CSV, Entwurf fortsetzen. „So läuft es ab“ nennt die drei Stationen; „Weitere Möglichkeiten“ öffnet die Modul-Bausteine (Anfrage, Angebot, Kennung vorschlagen, Institutions-Art, Lebensbereich, Rechtsraum, Datei-Kanal, Erscheinungsbild). |
| **Arbeitsfläche** | Links die Palette (der Feldkatalog aus dem Register, durchsuchbar, plus die elf Feldtypen als „eigenes Feld“), in der Mitte die Vorschau, wie die Vorlage in der App aussieht, rechts die Eigenschaften des gewählten Felds. Felder per Ziehen oder „+“ hinzufügen, per Ziehen oder Alt+↑/↓ ordnen; Änderungen gelten sofort. „Ausprobieren“ schaltet die Vorschau auf Eingeben. Reiter „Wortlaut (optional)“. „Entwurf sichern“ schreibt eine Datei (ohne Schlüssel); ein Weg-Band (Bauen · Angaben · Schlüssel · Absenden) und der Knopf „Fertigstellen und einreichen“ stehen von Anfang an da. |
| **Fertigstellen** (Dialog) | 1 Angaben zur Institution (die Stammdaten, erst hier) · 2 Schlüsselpaar (beide Dateien herunterladen; der private Schlüssel bleibt im Speicher, bis das Paket signiert ist, und wird dann freigegeben) · 3 Prüfen und absenden (Konformitäts-Prüfung, „Einreichungs-Paket erzeugen“, danach der Block „Jetzt die Datei absenden“ mit vorbereiteter E-Mail an die Einreichadresse). |

**Angehörigen-Blätter (GEN3).** Die Start-Kachel „Angehörigen-Blatt“ öffnet dieselbe Arbeitsfläche im Blatt-Modus: die Palette (Feldkatalog plus Register der Menschen und Vorsorge-Instrumente) füllt Blöcke, die Vorschau zeigt Blätter mit Blöcken und Einträgen, „Gilt für“ trägt Rechtsraum, Sprache und optional Berufsstand und Bereich. Erzeugt wird ein Modul im Sinn von ANG1 (`modulTyp: 'angehoerigenVorlage'`) im Umschlag aller Generator-Module (`format`, `modul`, `modulSignaturJws`), signiert über den Schlüssel-Tresor (Knopf `ab-erzeugen`). `blattModulPruefen` spiegelt `angehoerigenVorlagePruefen` des Kerns; eine Paritätsprobe (intern) hält die Parität, sobald der Kern den Prüfer trägt. Der Rundlauf bis in die Lese-App: `tests/e2e-cross/T-CROSS-33-angehoerigen-blatt-rundlauf.spec.js`.

Rechtstexte (Nutzungs- und Einreichungsbedingungen, Datenschutz, Impressum, Lizenz) haben ihren Platz in der Fußzeile
und am Absenden; die Texte selbst stehen in `RECHTSTEXTE` im Skript, zurzeit als **Entwürfe mit sichtbarer Marke** (Kennung, Stand). Ein Text mit Entwurfsmarke geht in keine Auslieferung: das Auslieferungswerkzeug (intern) bricht davor ab (`tools/lib/entwurfsmarke.js`). Freigegeben ist ein Text, wenn `entwurf` auf `false` steht und die Marke aus dem Wortlaut genommen ist. Zur Durchsicht: `node tools/rechtstexte-durchsicht-erzeugen.js --ziel PFAD.md`. Kein Zwangshaken.

Gehalten wird das von einer Probe der Arbeitsfläche im internen Prüfbestand (kein Assistent, DE/EN, Rechtstexte, Beispiele) und
`tests/e2e-cross/T-CROSS-30-generator-arbeitsflaeche.spec.js` (Klick-Weg in DE und EN, axe).

**Anfrage per QR (U2-ADR-460).** Der Baustein „Anfrage“ erzeugt aus der signierten Anfrage die kompakte Form (`z1.` + base64url des mit deflate-raw gepackten JWS samt Anbieter-Zertifikat); ohne Signatur gibt es keine kompakte Form. Die Stelle legt sie ab und trägt die kurze https-Adresse ein; das Studio zeichnet daraus den QR, der nur diese Adresse trägt. Gehalten von einer Probe im internen Prüfbestand.

## Submission-Strecke

Der Generator versendet **nichts automatisch**. Die Institution lädt die Datei `vivodepot-submission-<anbieterId>-<id8>.json` herunter und sendet sie an die von Vivodepot genannte Submission-Adresse (E-Mail oder Upload-Strecke — nach Operations-Entscheidung). Die angezeigte **Submission-ID** bitte für Rückfragen aufbewahren.

## Sicherheit

- **Kein Netzwerk** zur Laufzeit. CSP: `default-src 'self' data:; script-src 'self' 'unsafe-inline'; connect-src 'none'; …`
- **Kein Storage**: kein `localStorage`/`sessionStorage`/`IndexedDB`/Cookies. Reload = Eingaben weg (mit `beforeunload`-Warnung).
- **Private-Key-Disziplin**: Der Private-Key wird nur im Speicher gehalten — bis beide Dateien heruntergeladen sind und das Paket damit signiert wurde; danach wird die Variable freigegeben (`privateKeyFreigeben()`). Vor dem Umbau (GEN1) fiel die Freigabe schon beim „Weiter“ nach dem Download, und zum Signieren musste die eben heruntergeladene Datei erneut hochgeladen werden; das entfällt. Wer ein weiteres Paket erzeugen will, lädt die Schlüsseldatei („Ich habe schon eine Schlüsseldatei“). Der Schlüssel liegt nie länger im Speicher als der Dialog offen ist und das Paket noch fehlt; er wird nirgends gespeichert.
- **Krypto**: ausschließlich Web Crypto API (Ed25519). Der **VdCrypto-Block** ist byte-identisch zur Bürger-App (SHA-256 `4cd539cd564738e3f7d165235708bde0ea1253328fd5317e144a80b9a1d4fd98`). Der **gemeinsame JWS-Block** ist byte-identisch zum Kern (Andockpunkt für spätere Anbieter-Selbst-Signatur — derzeit nicht im Scope).
- **Code-Listen inline** (LOINC, ICD-10-GM, ATC, SNOMED, Rollencode-Platzhalter, ESCO) — SEED/STUB-Stand, gleiche Quelle wie die Bürger-App (`code-listen/<systemId>.json`).

## Gemeinsamer Vertrag

Das erzeugte Paket folgt `docs/template-generator/submission-schema.json` — **geteilt mit dem VC-Issuer**. Symmetrie ist durch Test **T-A-06** abgesichert: ein vom Generator erzeugtes Paket wird vom VC-Issuer verlustfrei importiert.

## Tests (Klasse-A)

Die Klasse-A-Proben (Harness `tests/load-generator.js`):

- **T-A-01** Schlüsselpaar-Roundtrip · **T-A-02** Pfad-A-Template → Schema · **T-A-03** CSV-Import · **T-A-04** Konformitäts-Blockierung · **T-A-05** Submission-Format (eingebettet + Datei-Schema) · **T-A-06** Import-Symmetrie via VC-Issuer · **T-A-07** Sorge-Markierung · **T-A-08** Block-Integrität (VdCrypto-Hash + JWS byte-identisch) · zzgl. Sicherheits-Scan (kein Storage/Netzwerk).

Ausführen:

```
npm test                                   # gesamte Suite
```

## Bau / Pflege

Die Datei wird aus byte-identischen Blöcken (VdCrypto, JWS) plus Generator-Logik zusammengesetzt. Bei Änderungen am Kern müssen die beiden Blöcke neu übernommen werden, damit Hash und Byte-Identität erhalten bleiben (T-A-08 schlägt sonst an). Dazu trägt das Studio eine byte-gleiche Kopie der QR-Bibliothek (qrcode-generator) aus dem Kern; `tests/qrcode-kopie-gleichlauf.test.js` hält die Kopie gleich und verlangt, dass die SBOM das Studio als Träger nennt.
