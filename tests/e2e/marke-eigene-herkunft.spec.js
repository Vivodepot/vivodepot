'use strict';
/* Die eigene Marke über den Vor-Depot-Weg: nur Darstellung, nie Vertrauen (Befund MARKE-EIGENE-HERKUNFT-FAERBT-KOPFZEILE, 07.10.2026)
   ─────────────────────────────────────────────────────────────────
   Ein Vor-Depot-Bündel, dessen Werte inhaltlich die eingebaute Marke des Hauses sind, ergibt das native Bild der Kopfzeile. Der Abgleich
   entscheidet nur die Darstellung; Herkunft und Prüfstand des Moduls bleiben die des signierten Bündels (Grenze der Gegenlesung).
   Gehalten: ein Fremdbündel mit kopierten Werten (Anbieter „fremd-kopie-institut“) bekommt das native Bild, sein Modul trägt weiter seinen
   Anbieter und seine Prüfstufe und kein „ab Werk“. Rot-Beweis: ein Bündel, das die Herkunft nur behauptet (andere Farbe), färbt die
   Kopfzeile wie jede Fremdmarke. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, browserEd25519SchluesselpaarErzeugen, browserJwsSignieren } = require('./helpers.js');

async function buendelAnwenden(page, modulAenderung) {
  const anker = await page.evaluate(browserEd25519SchluesselpaarErzeugen);
  const anbieter = await page.evaluate(browserEd25519SchluesselpaarErzeugen);
  const modul = await page.evaluate((a) => Object.assign({}, window.__vdOeffentlich.AB_WERK_BRANDING, a), modulAenderung || {});
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'fremd-kopie-institut', anbieterTyp: 'institution/test', anbieterName: 'Fremd-Kopie', publicKeyJwk: anbieter.pubJwk },
  };
  const bundle = {
    providerCredentialJws: await page.evaluate(browserJwsSignieren, { payload: cert, privJwk: anker.privJwk }),
    modulSignaturJws: await page.evaluate(browserJwsSignieren, { payload: modul, privJwk: anbieter.privJwk }),
  };
  return page.evaluate(async ({ bundle, x }) => {
    const r = await window.__vdOeffentlich.vorDepotKonfigurationAnwenden([bundle], document.documentElement,
      { ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x }, jetzt: '2026-01-15T09:00:00Z' });
    const m = (r.brandingModule || [])[0] || {};
    return { anbieterId: m.anbieterId, pruefstufe: m.pruefstufe, abWerk: m.abWerk,
      topbarFarbe: getComputedStyle(document.documentElement).getPropertyValue('--vd-branding-topbar-primaer').trim() };
  }, { bundle, x: anker.pubJwk.x });
}

test('[Eigene Marke] ein Fremdbündel mit kopierten Werten bekommt das native Bild, sein Modul behält Anbieter und Prüfstufe', async ({ page }) => {
  await oeffneApp(page);
  const z = await buendelAnwenden(page);
  expect(z.topbarFarbe, 'keine Kopfzeilenfarbe: das native Bild').toBe('');
  expect(z.anbieterId).toBe('fremd-kopie-institut');
  expect(z.pruefstufe).toBe('extern-ungeprueft');
  expect(z.abWerk === true, 'kein „ab Werk“ aus dem Abgleich').toBe(false);
});

test('[Eigene Marke·Rot-Beweis] ein Bündel, das die Herkunft nur behauptet, färbt die Kopfzeile wie eine Fremdmarke', async ({ page }) => {
  await oeffneApp(page);
  const z = await buendelAnwenden(page, { farbePrimaer: '#8b1a2b' });
  expect(z.topbarFarbe.toLowerCase()).toBe('#8b1a2b');
  expect(z.pruefstufe).toBe('extern-ungeprueft');
});
