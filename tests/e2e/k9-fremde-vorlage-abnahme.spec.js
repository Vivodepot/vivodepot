'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — K9 Zug 4: Browser-Abnahme („K9 — fremde Vorlagen, Weg C",
   10.08.2026, echter Klickweg: Vorlage laden, Dokument erzeugen,
   Herkunftszeile sehen)
   ────────────────────────────────────────────────────────────────────────
   Die zweistufige Signaturprüfung selbst läuft gegen `TRUST_AUTHORITY_
   PUBLIC_JWK` (der produktive Anker) — den privaten Gegenpart besitzt aus
   gutem Grund niemand außerhalb der Treuhand-Zeremonie, auch dieser Test
   nicht. Der App-eigene Test-Injektionspunkt (`opts.ankerJwk`, s.
   `verifiziereProviderCredential`) ersetzt ihn hier durch einen Sentinel-
   Anker — GENAU dasselbe Muster, das `tests/k9-fremde-vorlage-dokument.test.js`
   und die bestehenden trust-1b-*.test.js-Dateien nutzen, und dasselbe
   „page.evaluate ruft die echte Funktion" Muster wie
   `tests/e2e/11-wizard-fremder-ausstieg.spec.js` (wizardLauf-Injektion). Die
   Signaturprüfung selbst läuft ECHT (verifiziereProviderCredential/
   _verifiziereTemplateSignatur, keine Attrappe) — nur der Anker-Schlüssel
   ist der Test-Sentinel statt des produktiven TA-Schlüssels. Ab dem
   entstandenen `data.importierteVorlagen`-Eintrag läuft alles über den
   ECHTEN Klickweg (Sektor öffnen, Knopf klicken, Overlay lesen, PDF sichern).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, browserEd25519SchluesselpaarErzeugen, browserJwsSignieren } = require('./helpers');

const WORTLAUT = 'Ich, Name Vorname, lege hiermit meine Vorsorge-Erklärung fest. Punkt eins. Punkt zwei.';
const ANBIETER = 'Musterversicherung AG';

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

/* Kern-Verschluss (19.09.2026): `_jwsImportSignKey`/`_signJWS` sind seither NICHT mehr bare im
   Browser erreichbar (Krypto-Primitive bleiben bewusst außerhalb von window.__vdOeffentlich).
   Signiert wird darum über `browserJwsSignieren` (tests/e2e/helpers.js) — dieselbe RFC-7515-
   Schnittstelle, die ein echter externer Aussteller nutzen würde, ohne Zugriff auf Kern-Internas.
   Weiterhin echte Browser-WebCrypto, nur an den Internas vorbei statt hindurch. */
async function vorlageEchtSigniertImportieren(page) {
  const anbieterKp = await page.evaluate(browserEd25519SchluesselpaarErzeugen);
  const cs = { anbieterId: 'institution/musterversicherung', anbieterName: ANBIETER, anbieterTyp: 'institution/versicherung', publicKeyJwk: anbieterKp.pubJwk };
  const cert = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'], issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z', credentialSubject: cs };
  const certJws = await page.evaluate(browserJwsSignieren, { payload: cert, privJwk: SENTINEL_PRIVATE_JWK });
  const template = {
    felder: [{ feldname: 'Ablageort', feldtyp: 'text', bereich: 'advanceCare' }],
    wortlaut: WORTLAUT,
    wortlautQuelle: { behoerde: ANBIETER, titel: 'Vorsorge-Erklärung Muster', lizenz: 'mit Zustimmung der ' + ANBIETER },
  };
  const templateJws = await page.evaluate(browserJwsSignieren, { payload: template, privJwk: anbieterKp.privJwk });
  return page.evaluate(async ({ certJws, templateJws, ankerJwk }) => {
    const plan = await window.__vdOeffentlich.importPlanGeprueft('provider-credential', certJws, { jetzt: '2026-06-19T00:00:00Z', ankerJwk, templateJws });
    const ergebnis = window.__vdOeffentlich.importAnwenden(plan, {});
    return { planUngueltig: plan.ungueltig, vorlageAngelegt: ergebnis.vorlageAngelegt, vorlage: (window.__vdOeffentlich.ankerDaten().importierteVorlagen || [])[0] };
  }, { certJws, templateJws, ankerJwk: SENTINEL_PUBLIC_JWK });
}

test('Vorlage mit gültiger Signatur importiert → „Dokument erzeugen" → Herkunftszeile sichtbar (echter Klickweg ab Import)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await page.fill('[data-edit="givenName"]', 'Maria');
  await page.fill('[data-edit="familyName"]', 'Mustermann');
  await page.fill('[data-edit="birthDate"]', '1980-01-01');
  await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); });

  const importErgebnis = await vorlageEchtSigniertImportieren(page);
  expect(importErgebnis.planUngueltig, 'die zweistufige Signaturprüfung ist bestanden').toBe(false);
  expect(importErgebnis.vorlageAngelegt, 'der Import legt einen Eintrag an').toBe(true);
  const vorlageId = importErgebnis.vorlage.id;
  const sektorId = importErgebnis.vorlage.sektorId;

  await oeffneSektor(page, sektorId);
  const knopf = page.locator('[data-k9-vorlage-dokument="' + vorlageId + '"]');
  await expect(knopf).toBeVisible();
  await knopf.click();

  const overlay = page.locator('#pv-dok-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText(ANBIETER);
  await expect(overlay).toContainText('nicht von Vivodepot');
  await expect(overlay).toContainText(WORTLAUT);
  await page.screenshot({ path: 'test-results/k9-vorlage-dokument-overlay.png' });
});

test('Vorlage OHNE gültige Signatur (falscher Anbieter-Key) → kein Knopf, keine Vorlage im Sektor', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  const kp1 = await page.evaluate(browserEd25519SchluesselpaarErzeugen);
  const kp2 = await page.evaluate(browserEd25519SchluesselpaarErzeugen);   // ANDERES Schlüsselpaar
  const cs = { anbieterId: 'institution/musterversicherung', anbieterName: 'Musterversicherung AG', anbieterTyp: 'institution/versicherung', publicKeyJwk: kp1.pubJwk };
  const cert = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'], issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z', credentialSubject: cs };
  const certJws = await page.evaluate(browserJwsSignieren, { payload: cert, privJwk: SENTINEL_PRIVATE_JWK });
  const templateJws = await page.evaluate(browserJwsSignieren, {
    payload: { felder: [{ feldname: 'Ablageort', feldtyp: 'text', bereich: 'advanceCare' }], wortlaut: 'x', wortlautQuelle: { behoerde: 'a', titel: 'b', lizenz: 'c' } },
    privJwk: kp2.privJwk,   // falscher Signierschlüssel — nicht der zum Anbieter-Zertifikat passende
  });
  const ergebnis = await page.evaluate(async ({ certJws, templateJws, ankerJwk }) => {
    const plan = await window.__vdOeffentlich.importPlanGeprueft('provider-credential', certJws, { jetzt: '2026-06-19T00:00:00Z', ankerJwk, templateJws });
    const erg = window.__vdOeffentlich.importAnwenden(plan, {});
    return { vorlageAngelegt: erg.vorlageAngelegt, anzahl: (window.__vdOeffentlich.ankerDaten().importierteVorlagen || []).length };
  }, { certJws, templateJws, ankerJwk: SENTINEL_PUBLIC_JWK });
  expect(ergebnis.vorlageAngelegt).toBe(false);
  expect(ergebnis.anzahl).toBe(0);
  await expect(page.locator('[data-k9-vorlage-dokument]')).toHaveCount(0);
});
