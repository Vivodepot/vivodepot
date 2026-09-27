# U2-ADR-028: Sicherheit Block C — eingehende Verifikation Ebene 3a (signierte Anbieter-Zertifikate)

**Status:** Akzeptiert (Ebene 3a verdrahtet; Ebene 3b bewusst außerhalb des Scopes)
**Datum:** 19.06.2026
**Kategorie:** SICHERHEIT, TRUST
**Grundlage:** Krypto-Gutachten-Mängelliste 19.06. + Befund-Vermerk Trust-/Verifikations-Ebenen 19.06. (Ebene 3a „eingehende Verifikation eigener Provider-Zertifikate": Primitive vorhanden, aber 0 Call-Sites = nicht verdrahtet).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — neues `IMPORT_FORMATE`-Format `provider-credential` (`signiert:true`); `importPlan` (fail-closed bei `signiert`); neu `importPlanGeprueft` + geteilter `_planAusRoh`; `flowImportAuto`/`flowImportDatei` rufen `await importPlanGeprueft`; nutzt `verifiziereProviderCredentialGegenSentinel`/`_verifyJWS` + `TEST_SENTINEL_PUBLIC_JWK`.
- **Sprint-Commit:** dieser Bau (Sicherheits-Kette Block C).
- **ADR-Bezug:** dieser ADR (U2-ADR-028).

**Status heute:** gilt — Beleg `tests/sicherheit-block-c.test.js#C-Negativ-6`.

---

## C1 — die 3a/3b-Grenze (gemessen, eindeutig — kein C1-STOPP)

Gemessen am Code (messen statt annehmen):

- **Verifikations-Primitive vorhanden, aber ungenutzt.** `_verifyJWS` ist robust (lehnt Nicht-Compact,
  alg-Mismatch/`alg:none`-Confusion, defekte Signatur, abgelaufenes Zertifikat ab); `verifiziere­Provider­Credential­GegenSentinel` prüft gegen den eingebetteten `TEST_SENTINEL_PUBLIC_JWK`. **Beide hatten 0
  Call-Sites** in der Bürger-App.
- **Kein Import-Format trug bisher ein signiertes Zertifikat.** Alle `IMPORT_FORMATE` parsen blanke
  JSON-/XML-/vCard-/FHIR-Claims ohne jede Signaturprüfung — d. h. eingehende Daten wurden ungeprüft
  übernommen.
- **Grenze:** **Ebene 3a** = das EIGENE `VivodepotProviderCredential` — ein vom Vivodepot-Trust-
  Authority (heute Test-Sentinel) signierter **JWS-Compact**. **Ebene 3b** = Fremd-Credentials (EAA /
  externe Aussteller; dazu zählen die vorhandenen `sd-jwt-vc-*`-Formate, die blanke Claims lesen) —
  deren Prüfung braucht eine **externe Trust-Liste/Governance** und ist **nicht im Scope**.

Die Grenze ist eindeutig → kein C1-STOPP. Ebene 3b bleibt **unberührt**.

## C2 — die drei Einbauten am Chokepoint

1. **`signiert:true`-Marker nur am Provider-Zertifikat.** Neues, einziges `IMPORT_FORMATE`-Format
   `provider-credential` (`kategorie:'depot'`, `nurImport:true`, `signiert:true`). `erkennen` greift nur
   bei einem JWS-Compact, dessen dekodierte Nutzlast den VC-Typ `VivodepotProviderCredential` trägt.
2. **Nur signierte JWS-Compact-Form akzeptiert** (keine blanken JSON-Claims): blanke Claims sind kein
   Drei-Teile-Compact → `_verifyJWS` lehnt mit „kein Compact-Format" ab.
3. **Prüfung VOR jeder Claim-Übernahme.** Da `importPlan` synchron, `_verifyJWS` aber asynchron ist:
   - `importPlan` ist für `signiert`-Formate **fail-closed** — es parst sie nie roh, sondern gibt einen
     ungültigen Plan zurück (Bypass-Schutz: kein ungeprüfter Claim über einen direkten Aufruf).
   - neues `async importPlanGeprueft(formatId, text, opts)` prüft signierte Formate über
     `verifiziereProviderCredentialGegenSentinel` und baut den Plan **erst nach** erfolgreicher Prüfung
     aus der geprüften Nutzlast (`def.felderAusClaims`). Bei defekter/fehlender Signatur, `alg:none`,
     manipulierter Nutzlast oder Ablauf: ungültiger Plan mit klarem Grund, **KEINE Claims übernommen**.
   - Unsignierte Formate laufen unverändert durch (`importPlanGeprueft` delegiert an `importPlan`).
   - Die zwei Bürger-Flows (`flowImportAuto`, `flowImportDatei`, beide bereits `async`) rufen jetzt
     `await importPlanGeprueft` — ein eingelesenes Provider-Zertifikat wird damit immer geprüft.

## Konsequenzen
- Eingehende **eigene** Anbieter-Zertifikate werden vor der Übernahme kryptografisch geprüft; gefälschte
  werden abgewiesen, ohne dass ein Claim ins Depot gelangt. Die `claims-nie-ungeprüft`-Eigenschaft ist
  durch den fail-closed `importPlan` auch gegen direkte Aufrufe gesichert.
- **Test-Sentinel bleibt der Vertrauensanker** (kein produktiver Trust-Authority-Key) — der Austausch auf
  den Produktiv-Key ist eine eigene Strecke (VC-Issuer-Spec). Heute prüft 3a gegen den eingebetteten
  Test-Key; produktiv wird derselbe Pfad gegen den echten Key laufen.
- **Ebene 3b offen (außerhalb Scope):** Fremd-Credentials/EAA brauchen eine externe Trust-Liste +
  Governance — bewusst nicht angefasst.
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678…` unverändert (nur Import-Schicht/STRINGS + Aufruf
  der vorhandenen JWS-Primitive). Block-Integrität 2/0. Suite **926/0/1** (1 FHIR-Skip). Neuer Voll-SHA in
  `vivodepot.html.sha256`.

## Implementations-Verweis
Tests: neu `sicherheit-block-c.test.js` (7 Tests, Muster „Angriff konstruieren → scheitert": gekippte
Signatur, `alg:none`, manipulierte Nutzlast, abgelaufen, blanke JSON-Claims, fail-closed sync — plus
Positiv-Anker: gültig signiert → akzeptiert, Claims über `importAnwenden` gesetzt). Test-Infrastruktur:
`load-kern.js` EXPORT_HOOK um `importPlanGeprueft`/`_planAusRoh` ergänzt; Sentinel-Private-Key TEST-ONLY
(wie `vc-issuer.test.js`).

## Konformität

```konformitaet
aussage:   Der synchrone `importPlan` ist für `signiert`-Formate fail-closed — er parst sie nie
           roh, auch bei direktem Aufruf unter Umgehung von `importPlanGeprueft` gelangt keine
           ungeprüfte Provider-Credential-Claim ins Depot.
zustand:   prüfbar
pruefung:  tests/sicherheit-block-c.test.js#C-Negativ-6: synchroner importPlan verweigert signierte Formate (fail-closed)
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
