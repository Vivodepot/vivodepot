#!/usr/bin/env node
/**
 * test_behavior_ap5_5_2_external_vectors.js — AP 5.2 Externe Verifikations-Schicht
 * ================================================================================
 *
 * Bezug: ADR-055 (Externe Test-Quellen für die Krypto-Schicht), Plan v3 §3 §4.
 * Sprint 2 von Task 5.2 (Sprint 1 war Vivodepot-eigene Logik in
 * test_behavior_ap5_5_2.js).
 *
 * Sechs Klasse-A-Tests gegen 419 externe Krypto-Test-Vektoren aus drei
 * unabhängigen Quellen (RFC 5869, NIST CAVP, C2SP/wycheproof).
 * Seit 19.08.2026 dabei: Wycheproof HMAC-SHA-256 (174) — die Primitive, aus der
 * die pseudonymen Adressen der Feld-Einheiten entstehen — und Wycheproof
 * PBKDF2-HMAC-SHA-256 (60), eine Lücke, die schon vor dem Zerfall bestand. Diese Tests
 * verifizieren, dass die Web Crypto API in den Ziel-Browsern Standard-konform
 * implementiert ist und dass Vivodepots Krypto-Helper-Sequenzen die Standards
 * korrekt nutzen.
 *
 * Klasse A:
 *   5.2-A-09: RFC 5869 HKDF-SHA-256 Test Cases (3 Vektoren)
 *   5.2-A-10: NIST CAVP AES-256-GCM (30 Vektoren: 20 Encrypt + 5 Decrypt-PASS + 5 Decrypt-FAIL)
 *   5.2-A-11: Wycheproof AES-GCM-256 Edge-Cases (66 Vektoren: 39 valid + 27 invalid)
 *   5.2-A-12: Wycheproof HKDF-SHA-256 Edge-Cases (86 Vektoren: 83 valid + 3 invalid)
 *
 * Wycheproof-Result-Codes (ADR-055 D3):
 *   valid       — must succeed, output match required
 *   invalid     — must fail (either via exception or output mismatch)
 *   acceptable  — entweder Verhalten OK, KEINE Pass-Fail-Bewertung, nur Audit-Log
 *                 (keine acceptable-Vektoren in den hier verwendeten gefilterten
 *                  Sammlungen, aber Logik vorhanden für künftige Vollständigkeit)
 *
 * Ausführen:
 *   node --test code/test_behavior_ap5_5_2_external_vectors.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { rfc5869HkdfSha256Vectors }          from './vectors/rfc5869_hkdf_sha256_vectors.mjs';
import { nistCavpAesGcm256Vectors }          from './vectors/nist_cavp_aes_gcm_256_vectors.mjs';
import { wycheproofAesGcm256Vectors }        from './vectors/wycheproof_aes_gcm_256_vectors.mjs';
import { wycheproofHkdfSha256Vectors }       from './vectors/wycheproof_hkdf_sha256_vectors.mjs';
import { wycheproofHmacSha256Vectors }       from './vectors/wycheproof_hmac_sha256_vectors.mjs';
import { wycheproofPbkdf2HmacSha256Vectors } from './vectors/wycheproof_pbkdf2_hmacsha256_vectors.mjs';

/* G1 (31.07.2026): `neueBrowserSitzung` liegt jetzt in einer eigenen Datei
   (`krypto-browser-sitzung.mjs`) — ein blosser `import` DIESER Datei (hier)
   registriert die vier `describe`/`test`-Blöcke unten sofort zur Ausführung
   (node:test-Eigenheit); die Probe für `W-krypto-vektoren` (tools/waechter-
   register.js) braucht aber nur die Sitzung, nicht die Testregistrierung.
   Verhalten hier unveraendert — nur der Ort der Funktion. */
import { neueBrowserSitzung } from './krypto-browser-sitzung.mjs';

// Hex-Helper für die Test-Datei selbst (nicht produktiver Code in VIVODEPOT.html
// — Vivodepot nutzt Base64 als Serialisierungs-Format. Externe Vektoren sind
// hex-codiert; Hex-Konversion lebt damit in der Test-Schicht).
function hexToBytes(hex) {
  if (!hex) return new Uint8Array(0);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}
function bytesToHex(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

// ── Klasse A ────────────────────────────────────────────────────────────────

describe('AP 5.2 Externe Verifikations-Schicht — Klasse A (ADR-055)', () => {

  test('5.2-A-09: RFC 5869 HKDF-SHA-256 Test Cases (3 Vektoren)', async () => {
    const { browser, page } = await neueBrowserSitzung();
    try {
      // Test-Vektoren als Hex-Strings ins Browser-Kontext, dort Konversion + HKDF
      const results = await page.evaluate(async (vectors) => {
        function hexToBytes(hex) {
          if (!hex) return new Uint8Array(0);
          const out = new Uint8Array(hex.length / 2);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
          return out;
        }
        function bytesToHex(bytes) {
          let out = '';
          for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
          return out;
        }
        const out = [];
        for (const v of vectors) {
          try {
            const ikm = hexToBytes(v.ikm);
            const salt = hexToBytes(v.salt);
            const info = hexToBytes(v.info);
            // HKDF-Key importieren — IKM als raw HKDF-Key-Material
            const hkdfKey = await crypto.subtle.importKey(
              'raw', ikm, { name: 'HKDF' }, false, ['deriveBits']
            );
            const okmBuffer = await crypto.subtle.deriveBits(
              { name: 'HKDF', hash: 'SHA-256', salt, info },
              hkdfKey,
              v.L * 8 // L ist Byte-Länge, deriveBits erwartet Bits
            );
            const got = bytesToHex(new Uint8Array(okmBuffer));
            out.push({ tcId: v.tcId, expected: v.okm, got, match: got === v.okm });
          } catch (e) {
            out.push({ tcId: v.tcId, error: `${e.name}: ${e.message}` });
          }
        }
        return out;
      }, rfc5869HkdfSha256Vectors);

      const failed = results.filter(r => !r.match);
      assert.equal(failed.length, 0,
        `RFC 5869: ${failed.length}/${results.length} Vektoren fehlgeschlagen:\n` +
        failed.map(r => `  TC${r.tcId}: ${r.error || ('expected ' + r.expected.slice(0,40) + '... got ' + (r.got||'').slice(0,40) + '...')}`).join('\n')
      );
      assert.equal(results.length, rfc5869HkdfSha256Vectors.length,
        'Alle RFC-5869-Vektoren wurden geprüft');
    } finally { await browser.close(); }
  });

  test('5.2-A-10: NIST CAVP AES-256-GCM (Encrypt-Roundtrip + Decrypt-PASS + Decrypt-FAIL)', async () => {
    const { browser, page } = await neueBrowserSitzung();
    try {
      const results = await page.evaluate(async (vectors) => {
        function hexToBytes(hex) {
          if (!hex) return new Uint8Array(0);
          const out = new Uint8Array(hex.length / 2);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
          return out;
        }
        function bytesToHex(bytes) {
          let out = '';
          for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
          return out;
        }
        const out = [];
        for (const v of vectors) {
          try {
            const key = await crypto.subtle.importKey(
              'raw', hexToBytes(v.Key), { name: 'AES-GCM', length: 256 },
              false, ['encrypt', 'decrypt']
            );
            const iv = hexToBytes(v.IV);
            const aad = hexToBytes(v.AAD);

            if (v.direction === 'encrypt') {
              // Web Crypto API liefert ct||tag konkateniert
              const pt = hexToBytes(v.PT);
              const result = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
                key, pt
              );
              const resultBytes = new Uint8Array(result);
              const ctLen = resultBytes.length - 16; // 16 Byte Tag
              const ct = resultBytes.slice(0, ctLen);
              const tag = resultBytes.slice(ctLen);
              const ctMatch = bytesToHex(ct) === v.CT;
              const tagMatch = bytesToHex(tag) === v.Tag;
              out.push({ tcId: v.tcId, direction: 'encrypt', ctMatch, tagMatch, pass: ctMatch && tagMatch });
            } else {
              // Decrypt — Web Crypto API erwartet ct||tag konkateniert
              const ct = hexToBytes(v.CT);
              const tag = hexToBytes(v.Tag);
              const ctTag = new Uint8Array(ct.length + tag.length);
              ctTag.set(ct);
              ctTag.set(tag, ct.length);
              try {
                const ptBuffer = await crypto.subtle.decrypt(
                  { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
                  key, ctTag
                );
                const pt = bytesToHex(new Uint8Array(ptBuffer));
                if (v.result === 'PASS') {
                  out.push({ tcId: v.tcId, direction: 'decrypt', expectedPass: true, gotPass: true, ptMatch: pt === v.PT });
                } else {
                  // Erwartet FAIL aber decrypt war erfolgreich — Test-Failure
                  out.push({ tcId: v.tcId, direction: 'decrypt', expectedPass: false, gotPass: true, error: 'Decrypt unexpectedly succeeded for FAIL vector' });
                }
              } catch (e) {
                if (v.result === 'FAIL') {
                  out.push({ tcId: v.tcId, direction: 'decrypt', expectedPass: false, gotPass: false, errorName: e.name });
                } else {
                  out.push({ tcId: v.tcId, direction: 'decrypt', expectedPass: true, gotPass: false, error: `${e.name}: ${e.message}` });
                }
              }
            }
          } catch (e) {
            out.push({ tcId: v.tcId, error: `${e.name}: ${e.message}` });
          }
        }
        return out;
      }, nistCavpAesGcm256Vectors);

      // Encrypt-Vektoren: alle müssen ctMatch && tagMatch
      const encResults = results.filter(r => r.direction === 'encrypt');
      const encFailed = encResults.filter(r => !r.pass);
      // Decrypt-Vektoren: PASS müssen succeed mit ptMatch, FAIL müssen werfen (gotPass false + errorName gesetzt)
      const decResults = results.filter(r => r.direction === 'decrypt');
      const decPassExpected = decResults.filter(r => r.expectedPass);
      const decFailExpected = decResults.filter(r => !r.expectedPass);
      const decPassFailed = decPassExpected.filter(r => !r.gotPass || !r.ptMatch);
      const decFailFailed = decFailExpected.filter(r => r.gotPass);

      assert.equal(encFailed.length, 0,
        `NIST Encrypt: ${encFailed.length}/${encResults.length} fehlgeschlagen:\n` +
        encFailed.map(r => `  ${r.tcId}: ctMatch=${r.ctMatch}, tagMatch=${r.tagMatch}`).join('\n')
      );
      assert.equal(decPassFailed.length, 0,
        `NIST Decrypt-PASS: ${decPassFailed.length} fehlgeschlagen:\n` +
        decPassFailed.map(r => `  ${r.tcId}: ${r.error || 'ptMatch=' + r.ptMatch}`).join('\n')
      );
      assert.equal(decFailFailed.length, 0,
        `NIST Decrypt-FAIL: ${decFailFailed.length} fehlgeschlagen (decrypt erfolgreich obwohl FAIL erwartet):\n` +
        decFailFailed.map(r => `  ${r.tcId}: ${r.error}`).join('\n')
      );

      console.log(`    NIST CAVP: ${encResults.length} Encrypt + ${decPassExpected.length} Decrypt-PASS + ${decFailExpected.length} Decrypt-FAIL alle erwartungs-konform`);
    } finally { await browser.close(); }
  });

  test('5.2-A-11: Wycheproof AES-GCM-256 Edge-Cases (valid/invalid Pass-Fail)', async () => {
    const { browser, page } = await neueBrowserSitzung();
    try {
      const results = await page.evaluate(async (vectors) => {
        function hexToBytes(hex) {
          if (!hex) return new Uint8Array(0);
          const out = new Uint8Array(hex.length / 2);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
          return out;
        }
        const out = [];
        for (const v of vectors) {
          try {
            const key = await crypto.subtle.importKey(
              'raw', hexToBytes(v.key), { name: 'AES-GCM', length: 256 },
              false, ['decrypt']
            );
            const iv = hexToBytes(v.iv);
            const aad = hexToBytes(v.aad);
            const ct = hexToBytes(v.ct);
            const tag = hexToBytes(v.tag);
            const ctTag = new Uint8Array(ct.length + tag.length);
            ctTag.set(ct);
            ctTag.set(tag, ct.length);

            let succeeded = false;
            let errorName = null;
            try {
              await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
                key, ctTag
              );
              succeeded = true;
            } catch (e) {
              errorName = e.name;
            }

            out.push({ tcId: v.tcId, expected: v.result, succeeded, errorName });
          } catch (e) {
            // Fehler beim Setup (z.B. importKey mit invalid key) — bei "invalid"-Vektoren OK
            out.push({ tcId: v.tcId, expected: v.result, succeeded: false, errorName: e.name, setup_error: true });
          }
        }
        return out;
      }, wycheproofAesGcm256Vectors);

      const valids   = results.filter(r => r.expected === 'valid');
      const invalids = results.filter(r => r.expected === 'invalid');
      const accept   = results.filter(r => r.expected === 'acceptable');

      // valid: succeeded MUSS true sein
      const validFailed = valids.filter(r => !r.succeeded);
      // invalid: succeeded MUSS false sein
      const invalidFailed = invalids.filter(r => r.succeeded);
      // acceptable: keine Bewertung, nur loggen (ADR-055 D3)
      const acceptableLog = accept.map(r => `tcId=${r.tcId} succeeded=${r.succeeded}`);

      assert.equal(validFailed.length, 0,
        `Wycheproof AES-GCM valid: ${validFailed.length}/${valids.length} fehlgeschlagen:\n` +
        validFailed.map(r => `  ${r.tcId}: ${r.errorName}`).join('\n')
      );
      assert.equal(invalidFailed.length, 0,
        `Wycheproof AES-GCM invalid: ${invalidFailed.length}/${invalids.length} unerwartet erfolgreich:\n` +
        invalidFailed.map(r => `  ${r.tcId}: succeeded but expected fail`).join('\n')
      );
      console.log(`    Wycheproof AES-GCM: ${valids.length} valid, ${invalids.length} invalid, ${accept.length} acceptable (audit-log only)`);
      if (acceptableLog.length) console.log('    acceptable-Audit-Log:\n      ' + acceptableLog.join('\n      '));
    } finally { await browser.close(); }
  });

  test('5.2-A-12: Wycheproof HKDF-SHA-256 Edge-Cases (valid/invalid Pass-Fail)', async () => {
    const { browser, page } = await neueBrowserSitzung();
    try {
      const results = await page.evaluate(async (vectors) => {
        function hexToBytes(hex) {
          if (!hex) return new Uint8Array(0);
          const out = new Uint8Array(hex.length / 2);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
          return out;
        }
        function bytesToHex(bytes) {
          let out = '';
          for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
          return out;
        }
        const out = [];
        for (const v of vectors) {
          try {
            const ikm = hexToBytes(v.ikm);
            const salt = hexToBytes(v.salt);
            const info = hexToBytes(v.info);
            const sizeBytes = v.size; // Wycheproof: size ist Byte-Länge
            // HKDF-Key importieren
            const hkdfKey = await crypto.subtle.importKey(
              'raw', ikm, { name: 'HKDF' }, false, ['deriveBits']
            );
            let succeeded = false, errorName = null, gotMatch = null;
            try {
              const okmBuffer = await crypto.subtle.deriveBits(
                { name: 'HKDF', hash: 'SHA-256', salt, info },
                hkdfKey, sizeBytes * 8
              );
              const got = bytesToHex(new Uint8Array(okmBuffer));
              succeeded = true;
              gotMatch = got === v.okm;
            } catch (e) {
              errorName = e.name;
            }
            out.push({ tcId: v.tcId, expected: v.result, succeeded, gotMatch, errorName });
          } catch (e) {
            out.push({ tcId: v.tcId, expected: v.result, succeeded: false, errorName: e.name, setup_error: true });
          }
        }
        return out;
      }, wycheproofHkdfSha256Vectors);

      const valids   = results.filter(r => r.expected === 'valid');
      const invalids = results.filter(r => r.expected === 'invalid');
      const accept   = results.filter(r => r.expected === 'acceptable');

      // valid: succeeded MUSS true sein UND gotMatch (Output match)
      const validFailed = valids.filter(r => !r.succeeded || !r.gotMatch);

      // invalid (in dieser gefilterten Sammlung): alle 3 Vektoren tragen den
      // Wycheproof-Flag "SizeTooLarge" — sie fordern eine Output-Größe von
      // 8161 Byte, das ist 1 Byte über dem RFC-5869-Maximum von 255*HashLen
      // (= 255*32 = 8160 Byte bei SHA-256). Erwartung gemäß Standard:
      // deriveBits muss ablehnen.
      //
      // Empirisch verifiziert (27.04.2026, Chromium via Playwright): Web
      // Crypto API wirft OperationError "The length provided for HKDF is
      // too large." → succeeded === false → Filter unten fängt den Vektor
      // korrekt als "ablehnungs-konform" ab.
      //
      // Filter prüft beide möglichen Fail-Modi für den invalid-Pfad:
      // (a) deriveBits wirft → succeeded === false (heute beobachtet)
      // (b) deriveBits liefert Output, der vom erwarteten okm abweicht →
      //     gotMatch === false (theoretisch, falls Browser-Implementations
      //     in Zukunft toleranter würden — der erwartete okm ist bei diesen
      //     Vektoren leer "")
      // Nur wenn BEIDE wahr sind (succeeded === true UND gotMatch === true),
      // hätte Web Crypto API einen invalid-Vektor versehentlich akzeptiert
      // mit dem von Wycheproof als "verboten" markierten Output — das wäre
      // ein Test-Failure.
      const invalidFailed = invalids.filter(r => r.succeeded && r.gotMatch);

      assert.equal(validFailed.length, 0,
        `Wycheproof HKDF valid: ${validFailed.length}/${valids.length} fehlgeschlagen:\n` +
        validFailed.map(r => `  ${r.tcId}: succeeded=${r.succeeded}, match=${r.gotMatch}, ${r.errorName||''}`).join('\n')
      );
      assert.equal(invalidFailed.length, 0,
        `Wycheproof HKDF invalid: ${invalidFailed.length}/${invalids.length} unerwartet voll erfolgreich (succeeded UND gotMatch):\n` +
        invalidFailed.map(r => `  ${r.tcId}`).join('\n')
      );
      console.log(`    Wycheproof HKDF: ${valids.length} valid, ${invalids.length} invalid, ${accept.length} acceptable (audit-log only)`);
    } finally { await browser.close(); }
  });


  /* ── 5.2-A-13 · Wycheproof HMAC-SHA-256 ─────────────────────────────────
     NEU am 19.08.2026 (A339). HMAC-SHA-256 ist die Primitive, aus der die
     pseudonymen Adressen der Feld-Einheiten entstehen — bis heute prüfte das
     Repo sie gegen KEINEN externen Vektor. Die 174 Vektoren kommen mit ihrer
     Gruppen-`tagSize`: bei 128 ist der erwartete Tag die ersten 16 Byte des
     vollen HMAC, und die 108 `invalid`-Vektoren tragen einen VERÄNDERTEN Tag —
     sie dürfen also gerade NICHT übereinstimmen. Ein Lauf, der sie akzeptierte,
     wäre ein Auth-Bypass. */
  test('5.2-A-13: Wycheproof HMAC-SHA-256 (valid/invalid Pass-Fail, Tag-Längen 256 und 128)', async () => {
    const { browser, page } = await neueBrowserSitzung();
    try {
      const results = await page.evaluate(async (vectors) => {
        function hexToBytes(hex) {
          if (!hex) return new Uint8Array(0);
          const out = new Uint8Array(hex.length / 2);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
          return out;
        }
        function bytesToHex(bytes) {
          let out = '';
          for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
          return out;
        }
        const out = [];
        for (const v of vectors) {
          try {
            const key = await crypto.subtle.importKey(
              'raw', hexToBytes(v.key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );
            let succeeded = false, errorName = null, gotMatch = null;
            try {
              const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, hexToBytes(v.msg)));
              const gekuerzt = mac.slice(0, v.tagSize / 8);
              succeeded = true;
              gotMatch = bytesToHex(gekuerzt) === v.tag;
            } catch (e) { errorName = e.name; }
            out.push({ tcId: v.tcId, expected: v.result, tagSize: v.tagSize, succeeded, gotMatch, errorName });
          } catch (e) {
            out.push({ tcId: v.tcId, expected: v.result, succeeded: false, errorName: e.name, setup_error: true });
          }
        }
        return out;
      }, wycheproofHmacSha256Vectors);

      const valids   = results.filter(r => r.expected === 'valid');
      const invalids = results.filter(r => r.expected === 'invalid');
      const accept   = results.filter(r => r.expected === 'acceptable');

      const validFailed = valids.filter(r => !r.succeeded || !r.gotMatch);
      // invalid: der Vektor trägt einen manipulierten Tag — er DARF nicht passen.
      const invalidFailed = invalids.filter(r => r.succeeded && r.gotMatch);

      assert.ok(valids.length > 0 && invalids.length > 0,
        `Anker: es müssen valid- UND invalid-Vektoren dabei sein (${valids.length}/${invalids.length})`);
      assert.equal(validFailed.length, 0,
        `Wycheproof HMAC valid: ${validFailed.length}/${valids.length} fehlgeschlagen:\n` +
        validFailed.map(r => `  ${r.tcId} (tagSize ${r.tagSize}): succeeded=${r.succeeded}, match=${r.gotMatch}, ${r.errorName || ''}`).join('\n')
      );
      assert.equal(invalidFailed.length, 0,
        `Wycheproof HMAC invalid: ${invalidFailed.length}/${invalids.length} wurden AKZEPTIERT — Auth-Bypass:\n` +
        invalidFailed.map(r => `  ${r.tcId}`).join('\n')
      );
      console.log(`    Wycheproof HMAC-SHA-256: ${valids.length} valid, ${invalids.length} invalid, ${accept.length} acceptable (audit-log only)`);
    } finally { await browser.close(); }
  });

  /* ── 5.2-A-14 · Wycheproof PBKDF2-HMAC-SHA-256 ───────────────────────────
     NEU am 19.08.2026 (A339), und die Lücke bestand schon VOR dem Zerfall: das
     Repo prüfte HKDF und AES-GCM gegen Wycheproof, PBKDF2 nicht — obwohl jedes
     Öffnen eines Depots und jeder Vertrauens-Zugang darüber laufen. Alle 60
     Vektoren sind `valid`; die Zusicherung ist also reine Übereinstimmung, und
     genau darum steht die Anker-Prüfung auf der Vektor-Zahl dabei: ohne sie
     wäre eine leere Liste grün. */
  test('5.2-A-14: Wycheproof PBKDF2-HMAC-SHA-256 (Ableitung byte-exakt)', async () => {
    const { browser, page } = await neueBrowserSitzung();
    try {
      const results = await page.evaluate(async (vectors) => {
        function hexToBytes(hex) {
          if (!hex) return new Uint8Array(0);
          const out = new Uint8Array(hex.length / 2);
          for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
          return out;
        }
        function bytesToHex(bytes) {
          let out = '';
          for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
          return out;
        }
        const out = [];
        for (const v of vectors) {
          try {
            // Das Passwort steht in der Quelle als HEX — es wird als BYTES
            // eingespeist, nicht als Text. Sonst fielen die NonUtf8-Vektoren.
            const km = await crypto.subtle.importKey(
              'raw', hexToBytes(v.password), { name: 'PBKDF2' }, false, ['deriveBits']
            );
            let succeeded = false, errorName = null, gotMatch = null;
            try {
              const bits = await crypto.subtle.deriveBits(
                { name: 'PBKDF2', salt: hexToBytes(v.salt), iterations: v.iterationCount, hash: 'SHA-256' },
                km, v.dkLen * 8
              );
              succeeded = true;
              gotMatch = bytesToHex(new Uint8Array(bits)) === v.dk;
            } catch (e) { errorName = e.name; }
            out.push({ tcId: v.tcId, expected: v.result, succeeded, gotMatch, errorName });
          } catch (e) {
            out.push({ tcId: v.tcId, expected: v.result, succeeded: false, errorName: e.name, setup_error: true });
          }
        }
        return out;
      }, wycheproofPbkdf2HmacSha256Vectors);

      const valids = results.filter(r => r.expected === 'valid');
      const validFailed = valids.filter(r => !r.succeeded || !r.gotMatch);

      assert.equal(valids.length, wycheproofPbkdf2HmacSha256Vectors.length,
        `Anker: alle ${wycheproofPbkdf2HmacSha256Vectors.length} PBKDF2-Vektoren sind valid — eine leere oder gefilterte Liste waere sonst gruen`);
      assert.equal(validFailed.length, 0,
        `Wycheproof PBKDF2 valid: ${validFailed.length}/${valids.length} fehlgeschlagen:\n` +
        validFailed.map(r => `  ${r.tcId}: succeeded=${r.succeeded}, match=${r.gotMatch}, ${r.errorName || ''}`).join('\n')
      );
      console.log(`    Wycheproof PBKDF2-HMAC-SHA-256: ${valids.length} valid`);
    } finally { await browser.close(); }
  });

});
