# U2-ADR-016 — kryptoVersion-3-Sprung: Schlüsseltrennung + Legacy-Ausbau

**Status:** Angenommen · 2026-06-12 · Freigabe „B2-Bau, Variante 2". Nummer final vergeben nach ADR-Inventur: U2-ADR-007 ist für den Gesundheits-Sektor reserviert, U2-ADR-015 für die D43-Persistenz/SW-Schicht vorgemerkt → der kryptoVersion-3-ADR ist die nächste freie Nummer **016** (monotone Folge, keine v-Suffixe, U2-ADR-001-Namensraum-Regel).
**Stufe-2-Verifikation (außerhalb der Sandbox, auf einem externen Rechner — steht aus):** unabhängiger Harness + 185 externe Vektoren (RFC 5869, NIST CAVP, Wycheproof) gegen den neuen Block; externer Schöpfungsnachweis (DOCX) mit neuem Pin. Die Entscheidung selbst ist angenommen; offen ist nur die externe Bestätigung.
**Implementierung:** ursprünglich als B2-Commits *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)*/*(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)* referenziert — **beide Hashes sind seit den Historien-Umschreibungen zwischen Juli und August 2026 (Wiedervereinigung 28.07., Bare-Hub-Umbau 31.07., Neuklon 01.08., Rebases 02.08.) nicht mehr auflösbar** (gemessen 05.08.2026, mit Anker-Probe gegen `vivodepot-hub-v2.git`, interne Antwortnotiz vom 05.08.2026). Kein Ersatz-Hash geraten — stattdessen inhaltlicher Beleg, der jeden Rebase überlebt: Schlüsseltrennung (`sessionKey = null` in `setupMasterSession`, `vivodepot.html:2985`, kein `importMasterAesKey`-Aufruf mehr); Block-Pin `8d31c678…` fünffach propagiert (`tests/load-kern.js`, `tests/load-lesen.js`, `tests/load-generator.js`, `tests/load-issuer.js`, `tools/independent-krypto-harness.js`), Gate-Nachweis `tests/e2e-cross/T-CROSS-07-krypto-block-gate.test.js`; unabhängiger Verifikations-Harness gegen 185 externe Vektoren (RFC 5869, NIST CAVP, Wycheproof) in `tests/konformitaet/krypto-vektoren.mjs`.
**Bezug:** Prüfbericht VdCrypto-Block 10.06.2026, Befund B2 · Auftrag `docs/cc-auftrag-stufe1-b2-schluesseltrennung-legacy-ausbau-2026-06-11.md` · Stufe-1 `docs/cc-b2-stufe1-2026-06-12.md` · ADR-068 v2 (Anker = Depot) · ADR-085-Nachtrag (harte Allowlist, AAD-Bindung). U2-Bezug: U2-ADR-002 (HKDF-pro-Depot), U2-ADR-004 (Teststrategie/Block-Hash-Gate).
**Entscheidung:** Produktentscheidung (Freigabe „B2-Bau, Variante 2").
**Status heute:** gilt — Beleg `tests/krypto-verbote.test.js#u2-002-016-v3-only-keine-legacy-lesepfade`, rot⇄grün gebunden.

## Kontext

Der VdCrypto-Block (Pin `6eb590b9…`) verbrauchte dieselben 256 PBKDF2-Bits doppelt: direkt als AES-GCM-Master-Schlüssel (`sessionKey = importMasterAesKey(bits)`) **und** als HKDF-Eingangsmaterial (`importMasterHkdfKey(bits)`). Das verletzt die Schlüsseltrennung (ein Schlüssel, ein Zweck). Kein bekannter praktischer Angriff, aber Kontext-Kopplung: eine künftige Schwächung des GCM-Pfads risse das HKDF-Wurzelmaterial mit. Ein kommerzieller Audit flaggt es. Vor v1.0 existieren keine Fremd-Depots — der Fix kostet jetzt nur internen Aufwand und einen neuen Pin; nach v1.0 einen dauerhaften Migrationspfad.

## Entscheidung

**1. Schlüsseltrennung.** Die PBKDF2-Bits werden nur noch als HKDF-Eingangsmaterial importiert. Die zweite Verwendung als direkter AES-Master-Schlüssel (`sessionKey = importMasterAesKey(bits)` in `setupMasterSession`) entfällt ersatzlos. `sessionKey` bleibt als `null` deklariert (block-interne Globale, in der Hülle nie gelesen — der Anker wird wie jedes Depot über `deriveDepotKeyV2`/HKDF verschlüsselt, ADR-068 v2).

**2. Domain-Separation (Variante 2).** EIN Ableitungspfad für Anker UND Sub-Depots: HKDF-Info `'vivodepot/v3/depot/' + depotUUID`. Architektur-treu zu ADR-068 v2 („Anker IST ein Depot"); je-Depot-Eindeutigkeit über die UUID. Domain-separiert und präfixfrei gegenüber den Alt-Strings (`'vivodepot-subdepot-v1'`, `'vivodepot-depot-v2:'`): Divergenz ab Index 9 (`/` ≠ `-`); kein Info-String ist Präfix eines anderen.

**3. kryptoVersion-3-Sprung.** Neue Container tragen `kryptoVersion: 3`. Die AAD-Konstanten (`_AAD_DEPOT_V2` `hkdf-sha256`, `_AAD_UEBERGABE_V2` `pbkdf2-sha256`) tragen `kryptoVersion: 3` (kdfTyp unverändert). Die Identifier-Namen (`_AAD_*_V2`, `deriveDepotKeyV2`, `HKDF_INFO_DEPOT_V2_PREFIX`) bleiben als **stabile Labels** (in Hülle/Tests verdrahtet) — die Krypto-Generation ist über Versionsfeld + Info-String v3.

**4. v3-only Allowlist, keine Legacy-Lesepfade.** `KRYPTO_VERSION_ALLOWLIST = [3]` (Stand dieser Entscheidung, 12.06.2026 — **seit 19.08.2026, Zerfall in Feld-Einheiten, `[3, 4]`**: v4 als neue Generation, v3 bleibt als Rückweg, kein Legacy-Pfad; s. Konformitätsblock unten für den heutigen Stand). Hartes Lade-Gate in `depotLaden` (`!== CRYPTO_VERSION_AKTUELL → throw`) **vor** jeder Ableitung, zusätzlich zu den bestehenden Gates in `blackboxDateiAusUmschlag`/`subDepotEinhaengen`. `deriveKeyLegacy` und `PBKDF2_ITERATIONS_LEGACY` (200k) ersatzlos entfernt.

**5. Abgrenzung (bewusst unangetastet).** Der Übergabe-Pfad `deriveKey` (PBKDF2-600k → AES direkt, AAD-kdfTyp `pbkdf2-sha256`) bleibt — Design für Empfänger ohne HKDF-Wurzel, NICHT Legacy. `deriveSubKey`/`HKDF_INFO_SUBDEPOT_V1` (v1, ungenutzt) verbatim belassen (nicht zum Ausbau autorisiert).

**6. Migration ohne Code.** Release ist v3-only; bestehende eigene/Test-Depots werden von Hand umgezogen (alter Build öffnen → neuer Build neu sichern). Ein etwaiges B16→v3-Wegwerf-Werkzeug lebt außerhalb der Release-Linie (eigener Folge-Auftrag).

## Konsequenzen

Neuer Block-Pin **`8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258`**, byte-identisch in fünf Trägern (Kern, lesen, template-generator, vc-issuer, PORT-VERBATIM.js) + Test-Fixture `test-leicht.html`. v1/v2-Container sind nicht mehr lesbar (gewollt). B1-NFD-Retry bleibt grün (Lade-Gate liegt vor der Ableitung → v1/v2 erreichen den Retry nie). Schicht-1-Suite 829 pass / 1 skip / 0 fail (+5 B2-Klasse-A-Tests). **Stufe-2 (außerhalb Sandbox):** unabhängiger Harness + 185 externe Vektoren (RFC 5869, NIST CAVP, Wycheproof) gegen den neuen Block; externer Schöpfungsnachweis mit neuem Pin nachziehen.

## Korrektur zum Auftrag

Der Auftrag nannte „vier Komponenten" und vergaß den **VC-Issuer**. Real sind es **fünf Block-Träger** (+ Test-Fixture). Ohne Mitziehen des Issuers wäre dessen Load-Gate gedriftet.

## Konformität

```konformitaet
aussage:   U2-016: v3-only, keine Legacy-Lesepfade — KRYPTO_VERSION_ALLOWLIST enthält weder 1 noch 2
           (seit 19.08.2026, Zerfall in Feld-Einheiten: [3, 4] statt [3] — v4 als neue Generation,
           v3 als Rückweg), CRYPTO_VERSION_AKTUELL = 3, hartes Lade-Gate
           (KRYPTO_VERSION_ALLOWLIST.includes) vor jeder Entschlüsselung; kein deriveKeyLegacy,
           kein v1/v2-Lesepfad, keine Krypto-Migration.
zustand:   prüfbar
pruefung:  tests/krypto-verbote.test.js#u2-002-016-v3-only-keine-legacy-lesepfade
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (Stufe 6). Dieselbe ausgeführte Prüfung wie U2-ADR-002 — beide ADR
tragen denselben Verbotssatz (Stufe-0-Befund), eine Grenze, eine Prüfung.*
