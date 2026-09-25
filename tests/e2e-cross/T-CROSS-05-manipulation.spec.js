'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-05 — Reise 5: Vertrauenskette mit Manipulation (Negativ-Test)
   ────────────────────────────────────────────────────────────────────────
   Szenario: Ein manipuliertes Provider-Zertifikat wird abgelehnt. Reise 4 wird
   durchlaufen, dann eine Stelle im Payload manipuliert (anbieterName geändert),
   ohne neu zu signieren. Die Bürger-App MUSS das Zertifikat wegen Signatur-
   Fehler ablehnen.

   Dies ist der entscheidende Negativ-Test der Vertrauenskette: Er beweist, dass
   die Signatur-Prüfung wirklich greift und nicht nur „durchwinkt“. Erwartet wird
   ein FEHLSCHLAG der Verifikation (gueltig === false).

   CROSS-COMPONENT: identische Kette wie T-CROSS-04, plus eine bewusste
   Payload-Manipulation auf der Transfer-Strecke (base64url-Payload neu kodiert,
   Original-Signatur belassen → Signatur passt nicht mehr).

   Läuft am Mac / in CI. ⚠ nur Test-Sentinel-Material.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');
const { vertrauensketteDurchlaufen } = require('./support/vertrauenskette');

const FIX = require('./fixtures/reise-4-vertrauenskette.json');
const MANIP = require('./fixtures/reise-5-manipulation.json');

// JWS-Payload manipulieren, ohne neu zu signieren → Signatur wird ungültig.
function manipulierePayload(jwsCompact, neuerName) {
  const [h, p, s] = jwsCompact.split('.');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  // anbieterName im credentialSubject (oder top-level) auf einen bösen Wert setzen.
  if (payload.credentialSubject && 'anbieterName' in payload.credentialSubject) {
    payload.credentialSubject.anbieterName = neuerName;
  } else if ('anbieterName' in payload) {
    payload.anbieterName = neuerName;
  } else {
    // Robust: irgendeinen Wert kippen, damit der Payload definitiv abweicht.
    payload.__manipuliert = neuerName;
  }
  const pNeu = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return h + '.' + pNeu + '.' + s;   // Original-Signatur s bleibt → passt nicht mehr.
}

test.describe('T-CROSS-05 Manipulation (Negativ-Test)', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('r5'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('Bürger-App lehnt das manipulierte Provider-Zertifikat ab (Signatur-Fehler)', async ({ browser }) => {
    const { jws } = await vertrauensketteDurchlaufen(browser, tmp, FIX);

    // Kontroll-Manipulation auf der Transfer-Strecke.
    const jwsManipuliert = manipulierePayload(jws, MANIP.manipulation.neuerWert);
    expect(jwsManipuliert).not.toBe(jws);

    /* ── Bürger-App verifiziert → MUSS fehlschlagen ───────────────────────── */
    const ctxKern = await browser.newContext();
    const k = await ctxKern.newPage();
    await H.kern.oeffnen(k);

    const res = await k.evaluate(
      ([j, anker]) => window.__vdOeffentlich.verifiziereProviderCredential(j, { ankerJwk: anker }),
      [jwsManipuliert, H.SENTINEL_PUBLIC_JWK],
    );
    // Verifikation MUSS ablehnen — das ist das Soll dieses Negativ-Tests.
    expect(res.gueltig).toBe(false);
    expect(typeof res.grund).toBe('string');
    expect(res.grund.length).toBeGreaterThan(0);

    // Gegenprobe: das UN-manipulierte Zertifikat würde akzeptiert (Kette ist intakt).
    const resOk = await k.evaluate(([j, anker]) => window.__vdOeffentlich.verifiziereProviderCredential(j, { ankerJwk: anker }), [jws, H.SENTINEL_PUBLIC_JWK]);
    expect(resOk.gueltig).toBe(true);

    await ctxKern.close();
  });
});
