'use strict';
/* ════════════════════════════════════════════════════════════════════════
   JWS-Altlast-alg unter echtem Chromium (19.09.2026-Auftrag O1/M2-Nachbarschaft)
   ────────────────────────────────────────────────────────────────────────
   Derselbe Fund wie beim Gateway (Schwesterrepo vivodepot-download-gateway, dortige
   rezept-kette-Probe): gespeicherte Zertifikate tragen im Feld `alg` noch den Kurvennamen
   'Ed25519' statt 'EdDSA' (RFC 8037). `_jwsImportVerifyKey` im GEMEINSAMEN JWS-BLOCK
   (vivodepot.html, byte-identisch in drei weiteren Trägern) berichtigt diesen einen bekannten
   Fehlwert jetzt vor dem Import.

   `_jwsImportVerifyKey` liegt seit dem Sicherheits-Verschluss (18.09.2026) innerhalb der
   IIFE-Kapsel und ist über window NICHT erreichbar (mit Absicht — ein eigener Wächter dagegen
   ist in Landung, s. Übergabeblatt zur Schnitt-Nacht) — diese Probe holt sich darum den
   ECHTEN Block-Text zwischen den BEGIN/END-Markern aus dem gebackenen Produkt (privat-de) (keine Abschrift, keine
   zweite Implementierung) und führt ihn in einer LEEREN Chromium-Seite aus: reale WebCrypto-
   Engine, realer Quelltext, nur ohne die App drumherum.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

// file:// statt about:blank: crypto.subtle existiert nur in einem sicheren Kontext, und
// about:blank zählt dafür nicht zuverlässig — dieselbe file://-Herkunft, die die App selbst nutzt.
const LEERE_SEITE = 'file://' + path.join(__dirname, 'fixtures', 'leere-seite.html');

const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

const KERN = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8');
const BEGIN = '// >>> VIVODEPOT-JWS-BLOCK BEGIN';
const END = '// >>> VIVODEPOT-JWS-BLOCK END <<<';
const JWS_BLOCK = KERN.slice(KERN.indexOf(BEGIN), KERN.indexOf(END) + END.length);

test.beforeEach(() => {
  expect(JWS_BLOCK.length, 'JWS-Block muss gefunden sein').toBeGreaterThan(1000);
  expect(JWS_BLOCK, 'der Fix muss im extrahierten Block stecken').toContain("jwk.alg === 'Ed25519'");
});

test('[JWS-Altlast-alg·Chromium] alg:"Ed25519" (bekannte Altlast) importiert unter echtem Chromium', async ({ page }) => {
  await page.goto(LEERE_SEITE);
  await page.addScriptTag({ content: JWS_BLOCK });
  const paar = await page.evaluate(async () => {
    const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
    return { kty: pub.kty, crv: pub.crv, x: pub.x };
  });
  const ergebnis = await page.evaluate(async (jwkOeffentlich) => {
    try {
      await window._jwsImportVerifyKey({ ...jwkOeffentlich, alg: 'Ed25519' });
      return 'OK';
    } catch (e) {
      return 'FAIL: ' + e.message;
    }
  }, paar);
  expect(ergebnis, 'muss trotz alg:"Ed25519" importieren').toBe('OK');
});

test('[JWS-Altlast-alg·Chromium·Rot-Beweis] ein ANDERER, unvereinbarer alg-Wert bleibt abgelehnt', async ({ page }) => {
  await page.goto(LEERE_SEITE);
  await page.addScriptTag({ content: JWS_BLOCK });
  const paar = await page.evaluate(async () => {
    const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
    return { kty: pub.kty, crv: pub.crv, x: pub.x };
  });
  const ergebnis = await page.evaluate(async (jwkOeffentlich) => {
    try {
      await window._jwsImportVerifyKey({ ...jwkOeffentlich, alg: 'RS256' });
      return 'OK';
    } catch (e) {
      return 'FAIL: ' + e.message;
    }
  }, paar);
  expect(ergebnis, 'RS256 auf einem OKP/Ed25519-Schlüssel darf nicht durchgehen').toMatch(/does not match|inconsistent|Unsupported|Invalid/i);
});
