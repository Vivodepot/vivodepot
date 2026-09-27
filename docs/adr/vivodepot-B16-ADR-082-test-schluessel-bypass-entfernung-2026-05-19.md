# B16-ADR-082: Test-Schlüssel-Bypass-Pfad in `_verifyJWS` entfernt (Pre-Release-Krypto-Bereinigung)

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 19.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-05-19
- **Kategorien:** SICHERHEIT | ARCHITEKTUR
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen
- **Vorgänger:** B16-ADR-065 (Template-Übergabe-Mechanismus, Klärung 1 zu JWS RFC-7515 + Ed25519 + ES256). Sprint K-2 Commit des damaligen Stands (Trust-Authority-Produktiv-Key — faktisch bereits drin, 17.05.2026).
- **Bezug:** Anforderung „Test-Schlüssel-Bypass-Pfad-Entfernung in `_verifyJWS`" vom 19.05.2026. Pre-Release-Strang vor v1.0-Tag Ende Mai 2026. Memory `project_sprint5_blocker.md` (Vorgänger-Pre-Release-Blocker zur Trust-Authority-Key-Verankerung).

## Kontext und Problemstellung

Bis zum 19.05.2026 enthielt `_verifyJWS` in `code/VIVODEPOT.html` einen Sprint-Test-Bypass-Pfad: wenn `pubkeyJwk.x` mit `TEST_KEY_` begann, wurde die kryptographische Verifikation übersprungen und der Payload nur strukturell zerlegt. Der Bypass war als Sprint-Test-Hilfe für die Phase vor dem Trust-Authority-Produktiv-Key-Tausch gedacht.

Der Pubkey-Tausch ist seit dem 09.05.2026 vollzogen (`TRUST_AUTHORITY_PUBKEY_JWK` mit produktiven Werten, `kid: 'vivodepot-trust-authority-v1-11052026'`). Sprint K-2 hat am 17.05.2026 den Sentinel-Fallback im AP-8-Template-Test entfernt. Der Bypass-Pfad in `_verifyJWS` blieb davon unberührt — der entsprechende Code-Block plus Header-Kommentar haben den Test-Pfad noch erlaubt und explizit als „Vor v1.0.0-Tag … wird der Test-Key durch produktiven Schluessel ersetzt — dann greift die echte Verifikation" markiert.

E2E-Tests, die ohne echte Trust-Authority-Signatur arbeiten müssen (zum Beispiel U-2-Anbieter-Tests), monkey-patchen `_verifyJWS` über `tests/e2e/helpers/issuer-setup.js` (`patcheVerifyJwsAufTestKey`). Sie waren nie auf den eingebauten Bypass-Pfad angewiesen.

**Frage:** Soll der Bypass-Pfad vor v1.0-Tag entfernt werden, damit der ausgelieferte Code keinen Sprint-Test-Pfad mehr enthält?

## Entscheidungstreiber

- **Selbst-Begrenzung gegen Test-Code im Release.** Der v1.0-Tag soll keinen Code-Pfad enthalten, der Krypto-Verifikation auf Verdacht eines Schlüssel-Präfixes überspringt — selbst wenn der Präfix im Bestand nicht mehr vorkommt.
- **Symmetrie zum Pubkey-Tausch.** Der Pubkey selbst ist bereits produktiv. Der Bypass-Pfad ist die letzte Stelle in `code/VIVODEPOT.html`, die die Test-Phase noch erkennt.
- **Test-Lage unbeeinflusst.** E2E-Tests patchen `_verifyJWS` ohnehin. Die Entfernung erzeugt keinen Test-Schaden.
- **Schöpfungs-Spur ohne Stille.** Eine Pre-Release-Krypto-Bereinigung ohne ADR-Spur wäre einer kryptographischen Inhalt-Änderung ohne Audit gleichgekommen. B16-ADR-082 schließt die Spur formal.

## Entscheidung

Der `TEST_KEY_`-Bypass-Pfad in `_verifyJWS` (`code/VIVODEPOT.html`) wird entfernt. Die Funktion verifiziert nur noch über die Web Crypto API (Ed25519 primär, ES256 Fallback gemäß B16-ADR-065 Klärung 1). Der `testKey`-Marker im Return-Objekt entfällt — er hatte keine Aufrufer.

Der Header-Kommentar wird auf den neuen Stand gebracht: Verweis auf das E2E-Monkey-Patch-Pattern für Test-Trust-Authorities (`tests/e2e/helpers/issuer-setup.js` `patcheVerifyJwsAufTestKey`) statt auf einen eingebauten Test-Pfad.

## Nicht-Bestandteil dieser Entscheidung

Die zweite TEST_KEY_-Stelle in `code/vivodepot-vc-issuer.html` (Funktion `_istSentinelKey` plus zugehörige UI-Warnung) bleibt vorerst unverändert. Die Funktion ist im Code-Kommentar als „historisch — aktuell obsolet" markiert. Ob sie als Pre-Release-Bereinigung mit entfernt oder als historischer Operator-Hinweis erhalten bleiben soll, ist eine eigenständige, hier nicht getroffene Entscheidung.

## Konsequenzen

**Positiv:**

- v1.0-Tag enthält keinen Krypto-Bypass-Pfad mehr.
- `_verifyJWS` ist auf eine einzige produktive Code-Linie reduziert; der Header-Kommentar verweist klar auf das Monkey-Patch-Pattern für Test-Belange.
- Die Pre-Release-Spur (Memory `project_sprint5_blocker.md` plus Sprint K-2 plus B16-ADR-082) ist mit dieser ADR formal abgeschlossen.

**Neutral:**

- Tests bleiben grün ohne Anpassung (Re-Test-Strecke 56/56 grün).

**Offen:**

- Issuer-Sentinel (`_istSentinelKey` plus UI-Warnung) als möglicher Folge-Schritt. Wenn entfernt, würde ein zweiter B16-ADR-082-Patch oder ein eigener Folge-Eintrag den Schritt dokumentieren.

## Nachweis

- Code-Stelle: `code/VIVODEPOT.html` `_verifyJWS` (Header-Kommentar Z. 46511 ff., Funktions-Körper darunter).
- Re-Test-Strecke: AP-8-Template-Übergabe, CRL, Template-Generator, Trust-Chain, VC-Issuer, externer W3C-VC-Konformitäts-Test, I-27a Anker-zu-Sub, U-2-7 E2E — 56/56 grün, keine Test-Anpassungen.
- Abgleich vor Umsetzungsbeginn: Anforderung und Code-Stand stimmen überein. Sprint K-2 Commit des damaligen Stands hat `code/VIVODEPOT.html` nicht angefasst, der Bypass-Pfad war seither unverändert.

---

## Anhang D.6 — Audit-Spur: _istSentinelKey-Entfernung (2026-05-23)

**Was:** Funktion `_istSentinelKey(jwk)` und zugehörige UI-Warnung sowie `window._vcIssuerInternals`-Export in `code/vivodepot-vc-issuer.html` wurden vollständig entfernt.

**Warum:** Die Funktion prüfte `jwk.x` auf den Präfix `TEST_KEY_` und erzeugte bei Treffer einen roten Warnblock im VC-Ausgabe-HTML. Seit Sprint K-2 (09.05.2026) ist der produktive Trust-Authority-Public-Key statisch eingebettet — der Sentinel-Präfix wird im gesamten Repo nicht mehr erzeugt. Die drei Code-Stellen (Funktion Z. 253–255, UI-Warnung Z. 332 + 374–379, Export Z. 486) waren toter Code, der nicht erreichbar war.

**Wann:** 19.05.2026 — dokumentiert in B16-ADR-083 (`docs/adr/B16-ADR-083_Sentinel_Logik_VC_Issuer_Entfernung.md`).

**Aufrufer-Inventur:** Repository-weite Suche (`grep -rn _istSentinelKey`) ergab keine externen Aufrufer. Tests nutzen das Monkey-Patch-Pattern (`patcheVerifyJwsAufTestKey`) und waren nie von der Sentinel-Logik abhängig.

**Bezug:** B16-ADR-082 „Offen"-Abschnitt hatte diesen Folge-Schritt angekündigt. B16-ADR-083 trägt die vollständige Entscheidungsdokumentation.
