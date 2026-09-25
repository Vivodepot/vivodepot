# Vivodepot — Standards, die der Code tatsächlich erzeugt und liest

**Jede Zahl und jede Versions-/Profil-Angabe hier stammt aus [`docs/faktenbasis.md`](docs/faktenbasis.md)**
— einer maschinell erzeugten Datei, die `tools/faktenbasis-erzeugen.js` direkt aus dem geladenen
Kern (`vivodepot.html`) und dem ADR-Bestand (`docs/adr/`) baut, nicht aus einem Kommentar oder
Gedächtnis. Was dort nicht steht, steht auch hier nicht. Bei Abweichung zwischen Code und
Faktenbasis schlägt `tests/faktenbasis-aktualitaet.test.js` an. Den jeweils gültigen Wert trägt
die aktuelle `docs/faktenbasis.md`.

---

## Wie man das hier liest

Vivodepot ist ein einzelnes, im Browser laufendes, verschlüsseltes Dokumentendepot
(`vivodepot.html`). Für jedes Datenformat unten gilt dieselbe Frage: **erzeugt oder liest der
Code es tatsächlich, und trägt es ein nachweisbares Versions-/Profil-Merkmal?** Fehlt ein
solches Merkmal, steht das ausdrücklich da — als „kein Versions-/Profil-Marker im Code
gefunden", nicht als übersprungene Zeile.

Ein Format kann **exportieren**, **importieren**, oder beides. `nurExport`/`nurImport` markiert
einseitige Wege; `ohneAuswahl` markiert Formate, die immer den vollen Datensatz des jeweiligen
Sektors ausgeben (keine Feld-Auswahl vor der Ausgabe).

---

## Gesundheitsdaten — FHIR R4 / International Patient Summary (IPS)

**Export:** `fhir-ips` → `fhirIpsBundle()`, Sektor `gesundheit`, MIME `application/fhir+json`.

Die erzeugten Ressourcen tragen elf IPS-/EPS-`StructureDefinition`-Profil-URLs im Code
(`http://hl7.org/fhir/uv/ips/StructureDefinition/{Patient,AllergyIntolerance,
MedicationStatement,Condition,Procedure,Composition,Bundle}-uv-ips` sowie
`http://hl7.eu/fhir/eps/StructureDefinition/{device,deviceUseStatement,composition,bundle}-eu-eps`)
und decken elf `resourceType`-Werte ab: Patient, AllergyIntolerance, MedicationStatement,
Condition, Procedure, Device, DeviceUseStatement, Composition, RelatedPerson, Provenance,
Bundle.

**Import:** `fhir-ips` liest über einen generischen JSON-Parser (`_jsonParse`) — kein eigenes
Versions-/Profil-Merkmal im Import-Pfad selbst nachweisbar; die Validierung der Profil-Treue
liegt auf der Export-Seite.

**Import ohne Weg:** `fhir-lab` ist im Format-Register als Import-Kandidat geführt, die
hinterlegte Funktion liefert jedoch unbedingt `null` — es gibt aktuell keinen tatsächlichen
Import-Pfad für diesen Kanal.

**Autoritative Original-Ablage:** extern ausgestellte FHIR-Dokumente (z. B. eu-hdr-Entlassbriefe,
autoritative IPS-Bundles) werden verbatim gehalten, nicht neu erzeugt — eine eigene Datenklasse,
kein Producer-Pfad.

**Relevante ADRs:** U2-ADR-007 (Gesundheits-Sektor, FHIR über Template), U2-ADR-045
(autoritative Original-Ablage), U2-ADR-049 (IPS auf dem autoritativen Verbatim-Passthrough),
U2-ADR-076 (FHIR-Narrativ-Renderer), U2-ADR-079 (delegierter IPS-Export, RelatedPerson +
Provenance), U2-ADR-081 (Provenance auch im Selbst-Fall), U2-ADR-087 (eu-eps-Konformität,
Procedures + Medical Devices), U2-ADR-107 (Export-Gate deckt beide IPS-Pflichtfelder der
Identität), U2-ADR-105 (`dataAbsentReason` für undatierte Prozeduren/Medizinprodukte).

---

## Selbstauskunft-Nachweise — SD-JWT VC

**Export**, jeweils als eigenständiges Format, MIME `application/json`:

| Sektor | Kennung | Erzeuger | `vct`-Kennung im Code |
|---|---|---|---|
| Identität | `sd-jwt-vc-identitaet` | `sdJwtVcIdentitaet` | `urn:vivodepot:identitaet` |
| Finanzen | `sd-jwt-vc-finanzen` | `sdJwtVcFinanzen` | `urn:vivodepot:finanzen` |
| Sozialversicherung | `sd-jwt-vc-sozialversicherung` | `sdJwtVcSozialversicherung` | `urn:vivodepot:sozialversicherung` |

Alle drei sind **unsignierte Selbstauskünfte** (Variante A) — die `vct`-Kennungen sind mechanisch
aus dem jeweiligen Erzeuger extrahiert, kein handgepflegter Wert.

**Import:** alle drei laufen über den generischen JSON-Parser (`_jsonParse`), kein eigenes
Versions-/Profil-Merkmal im Import-Pfad.

**Relevantes ADR:** U2-ADR-030 (Sozialversicherungs-Sektor, unsignierter SD-JWT-VC-Selbstauskunft-
Export, Variante A) — auf dieser Basis wurde das Muster auch für Identität und Finanzen
übernommen.

---

## Kontakte und Termine — vCard 4.0 / iCalendar 2.0

**Export:**

| Kennung | Erzeuger | Sektor | Flags | Version im Code |
|---|---|---|---|---|
| `vcard-identitaet` | `vcardIdentitaet` | identitaet | — | `VERSION:4.0` |
| `vcard-menschen` | `vcardMenschen` | meine-menschen | `ohneAuswahl` | `VERSION:4.0` |
| `ics-vorsorge` | `icsKalender` | vorsorge | `nurExport`, `ohneAuswahl` | `VERSION:2.0` |

`vcard-menschen` und `ics-vorsorge` geben immer den vollen Datensatz des Sektors aus (keine
Feld-Auswahl); `ics-vorsorge` ist zusätzlich reiner Export ohne Gegenstück auf der Import-Seite.

**Import:** `vcard-identitaet` und `vcard-menschen` lesen über `parseVCards` — dieselbe
Parser-Funktion für beide Kennungen, kein eigenes Versions-Merkmal im Import-Pfad selbst
nachweisbar (die Version wird beim Export geschrieben, nicht beim Import geprüft).

**Relevante ADRs:** U2-ADR-072 (Personen-Cluster + Notfall-QR-Nachzug), U2-ADR-077 (Notfall-QR-
Kodierung: Klartext → Kontakte-vCard, Option C), U2-ADR-118 (ICS-Kalender hängt an den
Prüfterminen — Instrument-Datum wird Dokument).

---

## Finanzen — CAMT.053

**Import:** `camt053` → `parseCamt053`, Sektor `finanzen`, `nurImport` (reiner Import, kein
Export-Gegenstück). Kein Versions-/Profil-Marker im Code gefunden — die Kontoauszugs-Struktur
wird gelesen, ohne dass ein CAMT-Schema-Namensraum oder eine Versionsangabe im Erzeuger-Quelltext
selbst auftaucht.

**Relevantes ADR:** U2-ADR-074 (Konten-Liste + Bankvollmacht-Verweis + Import-Umschrift).

---

## Verwaltung und Meldewesen — XÖV/FIM, EDCI, ELSTER, xMeld

Vier Kanäle, alle **ohne mechanisch nachweisbaren Versions-/Profil-Marker im jeweiligen
Erzeuger-Quelltext** — das ist eine Lücke der Faktenbasis, keine Aussage, dass die
Formate falsch wären. Wer die genaue XÖV-/FIM-/EDCI-Schema-Version braucht, muss sie an der
Quelle (Code-Kommentar, externe Spezifikation) nachschlagen; dieses Dokument behauptet sie nicht,
weil der Code selbst sie an dieser Stelle nicht trägt.

| Kanal | Export | Import | Sektor |
|---|---|---|---|
| XÖV (Verwaltung) | `xoev-verwaltung` → `xoevVerwaltung` | `xoev-verwaltung` → `_jsonParse` | verwaltung |
| FIM | `fim-json` → `fimVerwaltung` | `fim-json` → `_jsonParse` | verwaltung |
| EDCI (Bildung) | `edci-bildung` → `edciBildung` | `edci-bildung` → `_jsonParse` | bildung |
| EDCI/Europass (extern) | — | `edci-europass-extern` → `_edciExternNutzlast` (`nurImport`) | bildung |
| ELSTER | — | `elster` → `_jsonParse` (`nurImport`) | finanzen |
| xMeld | — | `xmeld` → `parseXMeld` (`nurImport`) | identitaet |

Alle JSON-basierten Import-Pfade in dieser Gruppe laufen über denselben generischen
`_jsonParse` — das Format-spezifische Mapping passiert erst danach, außerhalb des unmittelbar
mit dem Text aufgerufenen Parsers, den die Faktenbasis erfasst.

---

## Depot-eigenes Format

**Export/Import:** `json` — Vollexport (`vollExportJSON`) bzw. Vollimport (`_vollDepotParsen`).
Kein externer Standard, kein Versions-/Profil-Marker im Sinne dieses Dokuments: das depot-eigene
Format folgt der internen Datenmodell-Struktur, nicht einer externen Spezifikation.

**Migration von einer Vorversion:** `vivodepot-beta` (`parseVivodepotBeta`, `nurImport`) liest
einen früheren Vivodepot-Datenstand ein.

**Anbieter-Nachweise (W3C Verifiable Credentials):** `provider-credential` ist im Import-Register
als `nurImport`-Kanal mit `def.signiert` geführt und trägt keinen `def.parse`-Parser für
unsignierten Text (`def.parse` ist `undefined`). Gelesen wird er stattdessen ausschließlich über
den geprüften Pfad — `importPlanGeprueft` ruft `def.felderAusClaims` erst nach bestandener
Signaturprüfung auf; ein echter, aber gated Lese-Pfad, kein fehlender. Geprüft werden dabei zwei
selbst-deklarierte VC-Typen aus der W3C-Verifiable-Credentials-Familie: `EuropeanDigitalCredential`
und `VivodepotProviderCredential`.

---

## Krypto

- Schlüsselableitung: PBKDF2, 600.000 Iterationen.
- Verschlüsselung: AES-256-GCM.
- Signaturen: EdDSA primär, ES256 als Fallback.
- Interne Krypto-Version: **3 und 4** — 3 ist die Schlüsseltrennung (U2-ADR-016), 4 der Zerfall
  in Feld-Einheiten (U2-ADR-149). Beide sind lesbar (`KRYPTO_VERSION_ALLOWLIST`); 3 bleibt
  ausdrücklich als Rückweg stehen, nicht als Altlast.

---

## Interner Versionsstand

<!-- STANDZAHLEN:BEGIN — erzeugt von tools/build-standzahlen.js; Quelle: vivodepot.html -->
Schema-Version 88, `SCHALEN_STAND` v799.
<!-- STANDZAHLEN:END -->

---

## Was hier bewusst NICHT steht

Vier Fähigkeiten existieren im Code nicht: FHIR-Fragebogen-/Questionnaire-Export,
Solid-Pod-/RDF-Export, eine „Weitergabe-Datei" mit vier Profilen, und ein Companion-Schema-Editor
für Institutionen. Sie tauchen hier nicht auf, weil
kein Export-, Import- oder Erzeuger-Eintrag in `docs/faktenbasis.md` sie trägt. Sollte eine
dieser Fähigkeiten künftig gebaut werden, gehört sie erst nach einem frischen Faktenbasis-Lauf
in dieses Dokument — nicht vorher.

---

## Pflege

Dieses Dokument wird von Hand geschrieben, aber jede Zahl darin ist gegen
`docs/faktenbasis.md` nachprüfbar. Bei einer Aktualisierung: zuerst
`node tools/faktenbasis-erzeugen.js` laufen lassen, dann die Abschnitte hier gegen die neue
Faktenbasis abgleichen — nicht umgekehrt.
