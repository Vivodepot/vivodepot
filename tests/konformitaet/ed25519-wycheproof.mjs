#!/usr/bin/env node
/**
 * ed25519-wycheproof.mjs — Schritt 1 / Ebene 1: Ed25519-Primitive (Known-Answer)
 * ============================================================================
 * Externe Verifikations-Schicht (Klasse A): die Ed25519-Signatur-Mathematik,
 * auf die das Trust-Rückgrat baut (_verifyJWS / Provider-Certs / Basistemplate-
 * Signaturen), gegen publizierte Known-Answer-Vektoren — NICHT gegen
 * agentengeschriebene Erwartungen.
 *
 * Orakel: C2SP/wycheproof `ed25519_test.json` (Schema eddsa_verify_schema_v1).
 *   150 Vektoren = 88 valid + 62 invalid über 77 Schlüssel-Gruppen.
 *
 * ── Vektor-Herkunft & Lizenz (Muster wie die bestehenden Wycheproof-.mjs-Header) ──
 *   Test vectors from C2SP/wycheproof project.
 *   Apache License 2.0. https://github.com/C2SP/wycheproof
 *   Quelle: testvectors_v1/ed25519_test.json — UNVERÄNDERT übernommen, byte-
 *   identisch (sha256 70471c053c711731f2195ef4875b60ea7f5d6793939d99058ac12da810cb8e00),
 *   von Hand beschafft (kein automatischer Abruf). Liegt als rohes JSON in
 *   ./vectors/ (kommentarlos → Lizenz-Ausweis hier in der ladenden Datei).
 *   LIZENZ-TRENNUNG: bleibt Apache-2.0 — fremdes Material, NICHT unter die
 *   EUPL-1.2 des Projekts gezogen.
 *
 * Scope: NUR die Primitive (crypto.subtle.verify Ed25519) über den Produktiv-
 *   Key-Import _jwsImportVerifyKey. NICHT die JWS-Compact-Hülle (eigener Schritt,
 *   Differential gg. jose), NICHT PBKDF2/base64url/Thumbprint.
 *
 * Harte Anforderungen (der eigentliche Wert):
 *  1. BEIDE Hälften, explizit: valid → muss verifizieren (ok===true);
 *     invalid → muss abgelehnt werden (ok!==true, via false ODER Ausnahme).
 *     Die 62 invaliden Vektoren sind der eigentliche Test — ein Adapter, der
 *     stumpf `true` liefert, fällt nur über sie auf.
 *  2. ALLE 150, keine Selektion: geprüfte Zahl === numberOfTests === 150,
 *     aufgeschlüsselt 88/62. Meldet er weniger, ist er manipuliert.
 *  3. Adapter offengelegt + minimal: hexToBytes (Naht 1) + die result-Abbildung
 *     (Naht 2) sind die einzige nicht-externe Stelle — hier sichtbar, dünn.
 *  4. Vektordatei wird NUR gelesen, nie modifiziert.
 *
 * Lauf-Umgebung: Browser (Chromium via Playwright) = Produktiv-Laufzeit, wie die
 *   bestehenden 419 symmetrischen Vektoren (krypto-vektoren.mjs).
 *
 * Ausführen: node --test tests/konformitaet/ed25519-wycheproof.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HIER        = dirname(fileURLToPath(import.meta.url));
/* A6/G1 (29.07.2026): der gemessene Gegenstand ist UMLENKBAR — dieselbe
   Umgebungsvariable, die `tests/load-kern.js` schon kennt. Vorher stand hier ein
   fester Pfad, und der Selbsttest wies den Waechter als „nicht ansetzbar" aus:
   ein Beispiel liess sich ihm nur unterschieben, indem man die AUSGELIEFERTE
   Datei veraendert — das ist kein Beispiel, das ist ein Eingriff.
   Vier Waechter teilten diese eine Ursache. */
const HTML_PFAD   = process.env.KERN_HTML_PATH
  ? resolve(process.env.KERN_HTML_PATH)
  : join(HIER, '..', '..', 'vivodepot.html');
const FILE_URL    = pathToFileURL(HTML_PFAD).href;
const VEKTOR_PFAD = join(HIER, 'vectors', 'ed25519_test.json');

// Vektordatei: NUR lesen, nie schreiben.
const wycheproof = JSON.parse(readFileSync(VEKTOR_PFAD, 'utf8'));

async function neueBrowserSitzung() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  // Produktiv-Key-Import — seit dem Kern-Verschluss (19.09.2026) über window.__vdOeffentlich
  // erreichbar, nicht mehr bare (dieselbe Umstellung wie bei den 22 anderen Aufrufstellen).
  await page.waitForFunction(
    () => typeof window.__vdOeffentlich !== 'undefined'
       && typeof window.__vdOeffentlich._jwsImportVerifyKey === 'function'
       && typeof crypto !== 'undefined' && !!crypto.subtle,
    null, { timeout: 10_000 }
  );
  return { browser, page };
}

describe('Schritt 1 / Ebene 1 — Ed25519-Primitive gegen Wycheproof (Klasse A)', () => {

  test('eddsa_verify_schema_v1: alle 150 Vektoren, beide Hälften', async () => {
    // ── Selektions-Wächter VOR dem Lauf: Schema + Soll-Zahlen ────────────────
    assert.equal(wycheproof.schema, 'eddsa_verify_schema_v1.json', 'falsches Schema/Datei');
    assert.equal(wycheproof.numberOfTests, 150, 'numberOfTests != 150');
    const alleTests = wycheproof.testGroups.flatMap(g => g.tests);
    const sollValid   = alleTests.filter(t => t.result === 'valid').length;
    const sollInvalid = alleTests.filter(t => t.result === 'invalid').length;
    assert.equal(alleTests.length, 150, 'Summe der Tests != 150 (Selektion?)');
    assert.equal(sollValid, 88, 'erwartet 88 valid');
    assert.equal(sollInvalid, 62, 'erwartet 62 invalid');

    const { browser, page } = await neueBrowserSitzung();
    let ergebnisse;
    try {
      // EIN evaluate über ALLE Gruppen. Adapter im Browser, sichtbar; die
      // result-Abbildung bleibt unten in Node — getrennt von der Krypto.
      ergebnisse = await page.evaluate(async (groups) => {
        function hexToBytes(hex) {                 // ◀ Adapter-Naht 1 (minimal)
          if (!hex) return new Uint8Array(0);
          const out = new Uint8Array(hex.length / 2);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
          return out;
        }
        const out = [];
        for (const g of groups) {
          // Produktiv-Import — exakt der Code-Pfad der App, kein paralleler Import.
          const key = await window.__vdOeffentlich._jwsImportVerifyKey(g.publicKeyJwk);
          for (const t of g.tests) {
            let ok = false, threw = false;
            try {
              ok = await crypto.subtle.verify(
                { name: 'Ed25519' }, key, hexToBytes(t.sig), hexToBytes(t.msg)
              );
            } catch (e) { threw = true; ok = false; } // Ausnahme = Ablehnung (korrekt für invalid)
            out.push({ tcId: t.tcId, result: t.result, comment: t.comment, ok, threw });
          }
        }
        return out;
      }, wycheproof.testGroups);
    } finally {
      await browser.close();
    }

    // ── Lief er WIRKLICH über alle? ──────────────────────────────────────────
    assert.equal(ergebnisse.length, 150, `nur ${ergebnisse.length}/150 geprüft — Selektion`);

    // ── result-Abbildung, EXPLIZIT (Adapter-Naht 2) ──────────────────────────
    //   valid   → ok === true  (gültige Signatur muss verifizieren)
    //   invalid → ok !== true  (ungültige muss abgelehnt werden; threw zählt als Ablehnung)
    const funde = [];
    let okValid = 0, okInvalid = 0;
    for (const r of ergebnisse) {
      if (r.result === 'valid') {
        if (r.ok === true) okValid++;
        else funde.push(`tcId ${r.tcId} [valid] FÄLSCHLICH ABGELEHNT (ok=${r.ok}, threw=${r.threw}) — ${r.comment}`);
      } else if (r.result === 'invalid') {
        if (r.ok !== true) okInvalid++;
        else funde.push(`tcId ${r.tcId} [invalid] FÄLSCHLICH VERIFIZIERT (ok=true) — ${r.comment}`);
      } else {
        funde.push(`tcId ${r.tcId} unerwartetes result='${r.result}' (nicht valid/invalid)`);
      }
    }

    console.log(
      `Ed25519-Primitive: ${ergebnisse.length} geprüft, `
      + `${okValid}/88 valid→true, ${okInvalid}/62 invalid→abgelehnt, `
      + `${funde.length} Funde`
    );

    assert.equal(funde.length, 0, `Wycheproof-Funde:\n  ${funde.join('\n  ')}`);
    assert.equal(okValid, 88, 'nicht alle 88 valid verifiziert');
    assert.equal(okInvalid, 62, 'nicht alle 62 invalid abgelehnt');
  });
});
