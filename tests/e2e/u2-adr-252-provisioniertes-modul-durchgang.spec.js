'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-252 — der Browser-Abnahmetest: ein provisioniertes Modul, ein frisch
   angelegtes Depot, die Inhalte sind da — und nach dem Neuladen immer noch
   ────────────────────────────────────────────────────────────────────────────
   Genau der Fall, der nach dem Gerüst-Umbau die erste neue Nutzerin trifft.

   Echter Browser, echte depotAnlegen()-Weiche über die UI (kein page.evaluate-
   Kurzschluss dafür) — aber die Signaturprüfung selbst braucht einen Anker,
   dessen Private-Key nur in der Testsuite existiert (TRUST_AUTHORITY_PUBLIC_JWK
   ist der Laufzeit-Anker, sein Private-Key existiert nirgends im Repo und darf
   es nie). `vorDepotKonfigurationAnwenden(buendel, root, opts)` sieht genau
   dafür `opts.ankerJwk` vor — „app-kontrolliert, nie aus dem Credential,
   Test-Injektion" (Kommentar an der Funktion selbst, vivodepot.html:4299). Der
   hier verwendete Weg ruft diese ECHTE Funktion, mit diesem SANKTIONIERTEN
   Test-Parameter, im ECHTEN Browser über page.evaluate() auf — das ist der
   vorgesehene Testweg der Funktion selbst, kein Kurzschluss um sie herum (der
   Unterschied zu einem verbotenen Kurzschluss: `data.X = Y` direkt setzen wäre
   einer, ein sanktionierter Test-Parameter der Funktion selbst ist keiner).

   Wegwerf-Sentinel-Anker, derselbe wie tests/modul-einlassen-geprueft.test.js
   und tests/u2-adr-252-*.test.js — kein echtes Schlüsselmaterial, wird nicht
   gesucht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('../load-kern.js');
const { depotAnlegen, KERN_URL_PRIVAT_DE } = require('./helpers');

const PW = 'adr252-e2e-passwort-999';
const BEREICH_ID = 'e2e-adr252-provisioniert';
const BEREICH_LABEL = 'Provisionierter Testbereich (ADR-252)';

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-09-04T09:00:00Z';

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function anbieterCertRohling(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'E2E-ADR-252-Anbieter', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) {
  const key = await V._jwsImportSignKey(privJwk);
  return V._signJWS(payload, key, {});
}
// Die Bündel entstehen in NODE (derselbe Kern, per ladeKern() — nicht der Browser-Kern), damit
// keine Signierlogik im Browser-Kontext dupliziert werden muss. Nur die fertigen, bereits
// signierten JWS-Strings wandern per page.evaluate() in den Browser.
async function baueSignierteBuendel() {
  const V = ladeKern().V;
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/e2e-adr252-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const bereichModul = { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'e2e-adr252-provisioniert', sprache: 'de',
    bereiche: { [BEREICH_ID]: { label: BEREICH_LABEL, icon: 'folder' } } };
  const modulSignaturJws = await signieren(V, bereichModul, anbieter.privJwk);
  return [{ providerCredentialJws, modulSignaturJws }];
}

test('[U2-ADR-252·Abnahme] ein provisioniertes Modul erscheint im frisch angelegten Depot — und nach dem Neuladen immer noch', async ({ page }) => {
  const buendel = await baueSignierteBuendel();

  // Eigene FSA-Attrappe statt oeffneApp()s Standardweg — fängt den echten Schreibversuch in
  // einen Puffer ab (Muster wörtlich aus tests/e2e/s1-dateisignal.spec.js, Fall 3: „frisch aus
  // Datei geöffnet"). addInitScript, nicht evaluate: muss VOR den Seiten-Skripten laufen und die
  // Navigation überleben.
  // GEÄNDERT (Auftrag, 12.09.2026): der eigene Kommentar dieses Tests („kein
  // internerSpeicherModus() — file:// hat beides nicht — der eigentliche Beweis") macht die
  // Abwesenheit jeder Senke außer der Datei zur ausdrücklichen Testbedingung — jetzt erzwungen,
  // nicht mehr angenommen (Topf A des Sortierungs-Berichts).
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await page.addInitScript(() => {
    window.__adr252Datei = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'adr252-e2e-test.vivodepot',
        createWritable: async () => ({
          write: async (blob) => { window.__adr252Datei = await blob.text(); },
          close: async () => {},
        }),
      }),
    });
  });
  // Klasse-B-Fund 19.09.2026 (e2e-37-rote-klassen-2026-09-19.md): gebackener privat-de statt
  // der rohen Datei, s. Kopf-Kommentar tests/e2e/helpers.js.
  await page.goto(KERN_URL_PRIVAT_DE);
  await page.waitForSelector('#w-anlass', { state: 'visible' });

  // Die echte Funktion, im echten Browser, mit dem sanktionierten Test-Anker — genau der Weg,
  // den vorDepotKonfigurationAnwenden() für Tests selbst vorsieht (opts.ankerJwk).
  await page.evaluate(
    ({ buendel, ankerJwk, jetzt }) => window.__vdOeffentlich.vorDepotKonfigurationAnwenden(buendel, null, { ankerJwk, jetzt }),
    { buendel, ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT },
  );

  // Jetzt die ECHTE UI-Weiche: depotAnlegen() über den echten Anlege-Dialog, kein Kurzschluss —
  // unter file:// ohne internen Speicher schreibt der Anlege-Weg selbst über den FSA-Picker.
  await depotAnlegen(page, { pw: PW });

  // 1 · Schicht B, sofort sichtbar: der provisionierte Bereich steht in der Sidebar.
  await expect(page.locator('[data-sektor="' + BEREICH_ID + '"]')).toContainText(BEREICH_LABEL);

  const dateiText = await page.evaluate(() => window.__adr252Datei);
  expect(dateiText, 'die Attrappe muss den echten Dateiinhalt abgefangen haben — sonst testet Schritt 2 nichts').toBeTruthy();

  // 2 · Schicht A, gespeichert: echtes Neuladen (kein depotLaden()-Funktionsaufruf, kein
  // internerSpeicherModus() — file:// hat beides nicht) — der eigentliche Beweis, an dem die
  // Geister-Lücke erkennbar war. Neu laden bringt eine komplett frische Seite (#w-anlass), dann
  // über den echten Datei-Öffnen-Weg die abgegriffene Datei zurückspielen.
  await page.evaluate(() => { try { delete window.data; } catch (_) {} });
  await page.reload();
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await page.click('#w-datei');
  await page.waitForSelector('#co-pw', { state: 'visible' });
  await page.evaluate((inhalt) => {
    const datei = new File([inhalt], 'adr252-e2e-test.vivodepot', { type: 'application/octet-stream' });
    window.__adr252FakeFile = datei;
  }, dateiText);
  const gesetzt = await page.evaluate(() => {
    const inp = document.getElementById('co-datei');
    if (!inp) return false;
    const dt = new DataTransfer();
    dt.items.add(window.__adr252FakeFile);
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  expect(gesetzt, 'Datei-Input im Öffnen-Overlay muss existieren').toBe(true);
  await page.fill('#co-pw', PW);
  await page.click('#w-oeffnen');
  await page.waitForSelector('#app.an', { state: 'attached' });

  // 3 · Der eigentliche Beweis: nach dem Neuladen+Wiederöffnen ist der provisionierte Bereich
  // immer noch da — nicht nur im ursprünglichen Boot-Moment sichtbar, sondern tatsächlich in
  // der Datei gelandet.
  await expect(page.locator('[data-sektor="' + BEREICH_ID + '"]')).toContainText(BEREICH_LABEL);
});
