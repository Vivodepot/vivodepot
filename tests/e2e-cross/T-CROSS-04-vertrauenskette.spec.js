'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-04 — Reise 4: Vertrauenskette Generator → VC-Issuer → Bürger-App
   ────────────────────────────────────────────────────────────────────────
   Szenario: Eine Institution erstellt im Template-Generator ein Template
   (Test-Stammdaten, Schlüsselpaar, drei Felder) und lädt ein Submission-Paket
   herunter. Der VC-Issuer importiert es, signiert mit dem Test-Sentinel-Key und
   stellt ein Provider-Zertifikat (JWS Compact) aus. Die Bürger-App verifiziert
   die Signatur erfolgreich gegen den eingebetteten Test-Sentinel-Public-Key.

   CROSS-COMPONENT (drei Kontexte): Generator (Komp. 4) → tmp → VC-Issuer
   (Komp. 3) → tmp → Bürger-App (Komp. 1). Beweist den gemeinsamen JWS-Block +
   das geteilte Test-Sentinel-Material über drei Komponentengrenzen.

   Die Bürger-App-Verifikation läuft über ihre eigene Top-Level-Funktion
   `verifiziereProviderCredentialGegenSentinel` (window-global) — die HTML wird
   NICHT verändert; ein Anbieter-Template-Import-UI ist in der Bürger-App noch
   nicht gebaut, daher der Test-Helfer in die App hinein (Spec-konform).

   Läuft am Mac / in CI. ⚠ nur Test-Sentinel-Material.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');
const { vertrauensketteDurchlaufen } = require('./support/vertrauenskette');

const FIX = require('./fixtures/reise-4-vertrauenskette.json');

test.describe('T-CROSS-04 Vertrauenskette', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('r4'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('Bürger-App verifiziert das ausgestellte Provider-Zertifikat erfolgreich', async ({ browser }) => {
    const { submission, jws } = await vertrauensketteDurchlaufen(browser, tmp, FIX);

    /* ── Kontext 3: Bürger-App verifiziert gegen eingebetteten Sentinel ─────── */
    const ctxKern = await browser.newContext();
    const k = await ctxKern.newPage();
    await H.kern.oeffnen(k);

    // verifiziereProviderCredential(jws, {ankerJwk}) — der Produktiv-Anker ist Default; für die
    // Test-Sentinel-Kette geben wir den Sentinel-Public-Key als Anker mit (die Konstante ist NICHT
    // window-global, der Test trägt sie über H.SENTINEL_PUBLIC_JWK bei). Test-Erkennung = istTestAnker.
    const res = await k.evaluate(
      ([j, anker]) => window.__vdOeffentlich.verifiziereProviderCredential(j, { ankerJwk: anker }),
      [jws, H.SENTINEL_PUBLIC_JWK],
    );
    // Signatur gültig gegen den eingebetteten Test-Sentinel-Public-Key → Template akzeptiert.
    expect(res.gueltig).toBe(true);
    expect(res.istTestAnker).toBe(true);

    // Die drei definierten Felder stehen (aus dem Submission-Paket, das die Kette trägt)
    // zur Eingabe bereit. (Die UI-Anzeige folgt mit dem Anbieter-Template-Import der Bürger-App.)
    expect(submission.templates[0].felder.map((f) => f.feldname)).toEqual(
      FIX.felder.map((f) => f.feldname),
    );

    await ctxKern.close();
  });
});
