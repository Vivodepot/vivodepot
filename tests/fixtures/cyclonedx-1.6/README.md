# CycloneDX 1.6 — JSON-Schema (unverändert übernommen)

Drei Dateien aus der CycloneDX-Spezifikation, unverändert, für die Prüfung der SBOM gegen ihre
Formatversion (`tests/mit-modul/sbom-formatversion.test.js`, BSI TR-03183-2 v2.1.0 §4: CycloneDX 1.6 oder höher).

- Quelle: <https://github.com/CycloneDX/specification>, Ordner `schema/`
- Tag: `1.6.2` (Commit `e833d732337dd33aceb45ff1991f896796f1e5e7`)
- Lizenz: Apache-2.0 (<https://github.com/CycloneDX/specification/blob/1.6.2/LICENSE>)
- Geholt: 23.10.2026

| Datei | Bytes | SHA-256 |
|---|---|---|
| `bom-1.6.schema.json` | 262666 | `18f57f7482593bad9f21b4feed09084640cbeff419d62ad5090c5ceccca5b37d` |
| `spdx.schema.json` | 14830 | `c41917196639055e9f9670811bac23ef777732144f3ff5a2f39686f61580dbe6` |
| `jsf-0.82.schema.json` | 8058 | `8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae` |

Nachsehen: `shasum -a 256 tests/fixtures/cyclonedx-1.6/*.schema.json`; gegen die Quelle
`gh api "repos/CycloneDX/specification/contents/schema/<datei>?ref=1.6.2" --jq .sha` mit
`git hash-object <datei>` vergleichen. Die Probe prüft die SHA-256-Werte dieser Tabelle.
