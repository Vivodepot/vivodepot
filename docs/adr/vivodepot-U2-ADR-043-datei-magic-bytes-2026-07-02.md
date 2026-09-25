# U2-ADR-043: Datei-Magic-Bytes — Format-Kennung + Version am Anfang der .vivodepot-Datei (Bau, Option A)

**Status:** Akzeptiert
**Datum:** 02.07.2026
**Kategorie:** ARCHITEKTUR, KRYPTO-HÜLLE, DATEI-FORMAT
**Cross-Referenz:** interne Read-only-Vorklärung vom 02.07.2026. Interne Park-Notiz vom 30.05. zu offenen Krypto-Konsolidierungspunkten (damit abgelöst). U2-ADR-014 (Persistenz/Datei-Ebene), U2-ADR-016 (kryptoVersion 3). Der VdCrypto-Block-Pin `8d31c678…` und der JWS-Block bleiben unberührt.
**Status heute:** gilt — Beleg `tests/datei-magic.test.js`.

---

## Kontext

Die Krypto-Architektur nennt **Magic-Bytes mit Versions-Vermerk** ausdrücklich als Mitigation gegen „Bedrohung 3" (Datei-Manipulation/Version). Die `.vivodepot`-Datei war bis hierher **reines JSON** — der verschlüsselte Sechs-Felder-Umschlag, ohne byte-Ebenen-Format-Identität + Versions-Marke.

Eine read-only Vorklärung (02.07.) ergab: (a) der **Block-Pin bleibt unberührt** — Schreib-/Lese-Funktionen liegen in der App-Logik (2. Script-Block), nicht im gepinnten VdCrypto-Kern; (b) die *Substanz* ist teils schon da (`kryptoVersion`-Allowlist wirft vor PBKDF2; `istGueltigerUmschlag` prüft die Struktur vor dem Entschlüsseln; **AES-GCM** deckt Manipulation); (c) der Kostentreiber ist der **Ripple in beide Apps + den passwortlosen `notfallCache`-Pfad**, weil die Datei überall als reines JSON geparst wird.

Entschieden wurde der **Bau (Option A, echter binärer Präfix)** — kehrt die frühere „kein Bau / Doku-Angleich"-Linie bewusst um. Vorgabe: vier Tests über beide Apps, Notfall-Cache-Pfad abgedeckt.

## Entscheidung

Der `.vivodepot`-Datei wird ein **fester Format-Präfix** vorangestellt: die 9-Zeichen-Kennung **`VIVODEPOT`** + ein **Format-Versions-Byte** (U+0001) = `DATEI_MAGIC_PREFIX`. Danach folgt unverändert der JSON-Umschlag.

- **Lesen TOLERANT (Migration verlustfrei):** fehlt die Kennung, ist es eine **Alt-Datei** (bare JSON) und lädt weiter. Keine Umschreibung von Bestandsdateien nötig.
- **Reine Datei-Hülle:** Magic Bytes sind Format-Identität + Versions-/Manipulations-Marke — der Integritäts-/Vertraulichkeitsschutz **bleibt AES-GCM (Auth-Tag)**; Magic Bytes ersetzen ihn NICHT.
- **Geltungsbereich:** die primäre `.vivodepot`-Datei (Download). Sub-Depot-`.json`-Wrapper und der **IndexedDB-interne** Blob bleiben bare (Versionierung dort über Record/`kryptoVersion`); alle Lesestellen strippen ohnehin tolerant.

## Umsetzung

- **vivodepot.html:** `DATEI_MAGIC`/`dateiMitMagic`/`magicStrippen` (2. Block, außerhalb des Krypto-Kerns). `depotHerunterladen` prefixt; **alle fünf Depot-Lesestellen** strippen: Notfall (`datei.text()`), Overlay-Öffnen, `flowDepotOeffnen`, Sub-Depot-Einhängen (`reader.result`). IndexedDB unberührt.
- **vivodepot-lesen.html:** `magicStrippen` (read-only, identische Semantik); der eine Datei-Lesepfad strippt → deckt den **passwortlosen Notfall-Blick** ab.
- **Tests (`tests/datei-magic.test.js`, vier über beide Apps):** (1) Magic-Round-Trip (schreiben→strippen→entschlüsseln), (2) Alt-Datei bare-JSON lädt weiter, (3) **Notfall-Cache passwortlos aus Magic-Datei — Bürger UND Lese-App**, (4) Strip-Semantik identisch (Magic/Legacy/leer). Plus `d43-etappe5-konflikt` nachgezogen (Download trägt die Kennung, positiv geprüft).

## Konsequenzen

- Neue `.vivodepot`-Dateien tragen `VIVODEPOT`+Versions-Byte; **Alt-Dateien laden verlustfrei** (Migrations-Toleranz).
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678…` + JWS-Block + Lese-App-Krypto-Block byte-identisch (Integritäts-Gates 17/17). `vivodepot.html.sha256` nachgezogen (`2666ad40…`). Der Lese-App-Ganzdatei-Hash ist nicht gepinnt (nur der Krypto-Block).
- **Suite 1095/1094 grün** (1 pre-existing skip = Lab-Validator ohne `FHIR_VALIDATOR_REQUIRED`).
- Die dokumentierte Architektur-Lücke „Bedrohung 3 / Magic Bytes" ist damit **gebaut** (nicht mehr Doku-vs-Code-Drift).
- **Kein Push** — lokaler Stand; der erste Push bleibt eine Produktentscheidung.

## Cross-Referenz

Read-only Vorklärung 02.07.2026 + Produktentscheidung 02.07.2026 (Bau, Option A — kehrt die frühere „kein Bau"-Linie um). `Offene-Punkte-Krypto-Konsolidierung.md` (Magic-Bytes-Punkt damit erledigt). U2-ADR-014 (Datei-/Persistenz-Ebene), U2-ADR-016 (kryptoVersion 3). Offen/Backlog: künftige Format-Versionen verzweigen am Versions-Byte; Sub-Depot-Wrapper könnten dieselbe Kennung erhalten (bewusst zurückgestellt, `.json`-Benennung).

## Konformität

```konformitaet
aussage:   U2-043: neue .vivodepot-Dateien tragen den Format-Präfix VIVODEPOT + Versions-Byte
           (DATEI_MAGIC_PREFIX); Alt-Dateien ohne Präfix laden weiterhin verlustfrei (bare JSON).
           Magic Bytes ersetzen nicht den AES-GCM-Integritätsschutz.
zustand:   prüfbar
pruefung:  tests/datei-magic.test.js#1) Magic-Round-Trip (Bürger-App): Datei mit Magic schreiben, mit Strip lesen, entschlüsseln
pruefung:  tests/datei-magic.test.js#2) Legacy: Alt-Datei ohne Magic (bare JSON) lädt weiter (Bürger-App)
quelle:    entscheidung
```
