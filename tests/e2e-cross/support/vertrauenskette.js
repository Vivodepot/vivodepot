'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Gemeinsame Vertrauensketten-Strecke — von T-CROSS-04 (Positiv) und
   T-CROSS-05 (Manipulation) genutzt.
   ────────────────────────────────────────────────────────────────────────
   Generator (Komp. 4) → Submission-Paket (tmp) → VC-Issuer (Komp. 3) →
   signiertes Provider-Zertifikat (JWS Compact). Liefert { submission, jws }.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const { expect } = require('@playwright/test');
const H = require('./helpers');

async function vertrauensketteDurchlaufen(browser, tmp, fix) {
  /* ── Kontext 1: Template-Generator → Submission-Paket ───────────────────── */
  const ctxGen = await browser.newContext({ acceptDownloads: true });
  const g = await ctxGen.newPage();
  await H.generator.oeffnen(g);
  await H.generator.stammdaten(g, fix.stammdaten);
  await H.generator.schluesselErzeugen(g);
  await H.generator.dreiFelder(g, fix.felder);
  const submissionPfad = await H.generator.submissionNachTmp(g, tmp);
  await ctxGen.close();

  const submission = JSON.parse(fs.readFileSync(submissionPfad, 'utf8'));
  expect(submission.templates.length).toBe(1);   // Sammel-Format: templates[], hier genau eine Vorlage
  expect(submission.templates[0].felder.length).toBe(3);

  /* ── Kontext 2: VC-Issuer → signiertes Provider-Zertifikat (JWS) ─────────── */
  const ctxIss = await browser.newContext();
  const i = await ctxIss.newPage();
  await H.issuer.oeffnen(i);
  await H.issuer.sentinelImportieren(i);
  await H.issuer.submissionImportieren(i, submissionPfad);
  const jws = await H.issuer.ausstellenUndJws(i);
  expect(jws.split('.').length).toBe(3);   // JWS Compact: header.payload.signature
  await ctxIss.close();

  return { submission, jws };
}

module.exports = { vertrauensketteDurchlaufen };
