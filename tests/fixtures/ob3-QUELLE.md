# Quelle — Open Badges 3.0, Testdateien des offiziellen Prüfers

**Beschafft für:** U2-ADR-445 (Open Badges 3.0 halten), 28.09.2026.

**Quelle:** `github.com/1EdTech/digital-credentials-public-validator`, der Digital Credentials Public
Validator von 1EdTech (Herausgeber von Open Badges). Tag `v1.11.3`, Commit
`9995ad9da1fbc5475ef9841c466e59f83d300b5f` (leichtgewichtiger Tag, kein Tag-Objekt; gemessen über
`api.github.com/repos/1EdTech/digital-credentials-public-validator/git/refs/tags/v1.11.3`).
Pfad: `inspector-vc/src/test/resources/ob30/`.

**Lizenz:** Apache License 2.0 (repo-weit, `LICENSE`; das Repo hat keine `NOTICE`-Datei). Lizenztext
unverändert beigelegt: `ob3-LICENSE-Apache-2.0.txt`. Die Dateien sind unverändert, nur mit dem
Präfix `ob3-` umbenannt. Verwendung: Testfixtures der eigenen Suite, kein Produktbestandteil.

**Warum nicht die Beispiele der Spezifikation:** Die stehen unter der IMS-Spezifikationslizenz
(`ob_v3p0/license.md` in `github.com/1EdTech/openbadges-specification`). Sie erlaubt das Weitergeben
nur für die Spezifikation „in their entirety“ und schließt Ableitungen aus. Für Auszüge in einem
öffentlichen Repo trägt sie nicht.

## Dateien (SHA-256)

| Datei | Original | Form | SHA-256 |
|---|---|---|---|
| `ob3-simple.json` | `simple.json` | JSON-LD, Data Integrity `eddsa-rdfc-2022` | `942a869e6292a49344cc7d5280652db64a62b1cc3477927925eee1226c2af3d1` |
| `ob3-simple.jwt` | `simple.jwt` | VC-JWT, kompakte JWS (`RS256`) | `5b36be2ace93b7ac1f78a8430fc4afac6c773a23838ebed2562d9e1a7d1282f0` |
| `ob3-simple-json.png` | `simple-json.png` | PNG, iTXt `openbadgecredential` mit JSON-LD | `9ce25809062ab207dbfda11e0e8c6d97611d39ee691f5d37d7c105944c56a518` |
| `ob3-simple-jwt.png` | `simple-jwt.png` | PNG, iTXt `openbadgecredential` mit JWS | `eab7597234e3ab125505882a6823cd27b1639c38cb05dfc57a8e445c154c039d` |
| `ob3-simple-json.svg` | `simple-json.svg` | SVG, `<openbadges:credential>` mit JSON-LD | `e300f9902b0fe9183c7c0856a8a4c61a777bae968a4ba0f8f264ef166c36528f` |
| `ob3-simple-jwt.svg` | `simple-jwt.svg` | SVG, `<openbadges:credential verify="…">` mit JWS | `ce221d85ec0e2d1a31cd14adeb5cab161a44e8776a34d356e2c6677f9fb13afb` |
| `ob3-complete.json` | `complete.json` | JSON-LD mit allen Feldern, Endorsements eingebettet | `1bdb21c9aa342c79d16cee85685d67d103d800ab84491a73d908aaebc46ad96e` |
| `ob3-simple-jwt-aus-svg.jwt` | aus `simple-jwt.svg` | VC-JWT, kompakte JWS — **abgeleitet**, s. unten | `7f39f9c82a1e2ff620edecaf9c14cc4c1adfe1a38afaf03b49e7f30efc5a5db4` |
| `ob3-simple-err-type.json` | `simple-err-type.json` | Negativfall: kein OB-Typ | `1ed3fdd144ff1b5a7ff5b91bafa1ca3808c74abe972a9d9a54a571b7761e132f` |
| `ob3-simple-err-issuer.json` | `simple-err-issuer.json` | Negativfall: Aussteller fehlerhaft | `f68fb128785d2106e0e0a48fa4e8ca87bd4b40678292b3d2e73232b6f597de48` |

Nachsehen: `shasum -a 256 tests/fixtures/ob3-*` gegen die Tabelle, und gegen die Quelle
`https://raw.githubusercontent.com/1EdTech/digital-credentials-public-validator/9995ad9da1fbc5475ef9841c466e59f83d300b5f/inspector-vc/src/test/resources/ob30/<Original>`.

**Die eine abgeleitete Datei** (Apache-2.0 §4b, Änderung vermerkt): `ob3-simple-jwt-aus-svg.jwt` ist der Wert des
Attributs `verify` aus `simple-jwt.svg`, unverändert herausgelöst und ohne Zeilenende gespeichert. Grund: die reine
`.jwt`-Datei des Prüfers (`simple.jwt`) ist ein Entwurfsstand, den der Prüfer selbst ablehnt (alter Kontext, ohne
`achievement` und `validFrom`, gemessen 28.09.2026) — ohne die Ableitung hätte die Form „VC-JWT als Datei" keinen gültigen Fall.

## Was die Dateien sind und was nicht

Es sind Testdateien des Prüfers, keine echten Nachweise. Aussteller und Schlüssel sind Beispiele
(`example.com`, `1edtech.edu`, `did:example:…`). Ob ein Beweis darin gegen einen erreichbaren
Schlüssel prüft, ist hier nicht behauptet. Für die Holder-Proben zählt nur, dass Vivodepot jede
Form erkennt, verbatim ablegt und byte-gleich wieder herausgibt.
