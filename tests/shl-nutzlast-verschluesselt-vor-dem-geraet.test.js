'use strict';
/* ════════════════════════════════════════════════════════════════════════
   SMART Health Link: die Nutzlast ist verschlüsselt, bevor sie das Gerät verlässt (30.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Das Poster für xShare sagt: „A SMART Health Link, encrypted on the device before anything leaves it.“ Für „Link senden“
   an der Antwort trägt tests/link-senden-antwort.test.js das (K3); für den SHL-Weg selbst stand keine Probe da. Diese hält:
   - Wirkung: _shlTeile (gemeinsam für das importierte Original und jeden Auszug) liefert eine JWE Compact mit alg dir und
     A256GCM. Der Klartext steht darin nicht, weder roh noch base64 noch base64url; der Schlüssel steht nicht in der JWE;
     mit dem Schlüssel aus dem Link öffnet sie WebCrypto wieder zum Klartext, ein verändertes Byte öffnet sie nicht.
   - Bauart: Was zur Ablage geht, ist nur `teile.jwe` (der Knopf „Datei“ im SHL-Dialog). Der Kern lädt nicht selbst hoch
     (shlDateiHochladen ist ein Riegel), und keine andere Stelle reicht Klartext oder Schlüssel in eine Datei für die Ablage.
   Rot-Beweis: ein _shlTeile, das den Klartext unverschlüsselt durchreicht, und ein Dialog, der den Schlüssel in die Datei
   legt, fallen auf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const MARKE = 'SHL-Klartext-Marke-Qx7p-Laborbefund-Hb12';

function funktionsKoerper(text, name) {
  const m = new RegExp('^(async )?function ' + name + '\\(', 'm').exec(text);
  if (!m) return null;
  const naechste = /^(async )?function [A-Za-z_$][\w$]*\(/gm;
  naechste.lastIndex = m.index + m[0].length;
  const n = naechste.exec(text);
  return text.slice(m.index, n ? n.index : text.length);
}

function bauartUrteil(text) {
  const raus = [];
  const teile = funktionsKoerper(text, '_shlTeile') || '';
  if (!/const jwe = await _jweCompactDir\(klartext, keyBytes\);/.test(teile)) raus.push('_shlTeile verschlüsselt nicht über _jweCompactDir');
  if (!/^\s*jwe,\s*$/m.test(teile) && !/\bjwe: jwe\b/.test(teile)) raus.push('_shlTeile gibt nicht die JWE zurück');
  const hoch = funktionsKoerper(text, 'shlDateiHochladen') || '';
  if (!/throw new Error\('SHL-Upload nicht aus dem Kern/.test(hoch) || /fetch\(|XMLHttpRequest|sendBeacon/.test(hoch)) raus.push('shlDateiHochladen ist kein Riegel');
  const dialog = funktionsKoerper(text, '_shlDialogZeigen') || '';
  const dateien = [...dialog.matchAll(/new Blob\(\[([^\]]*)\]/g)].map((m) => m[1].trim());
  if (!dateien.length) raus.push('der SHL-Dialog bietet keine Datei an');
  for (const d of dateien) if (d !== 'teile.jwe') raus.push('der SHL-Dialog legt etwas anderes als die JWE in eine Datei: ' + d);
  return raus;
}

test('[SHL·verschlüsselt·Bauart] _shlTeile verschlüsselt, der Dialog gibt nur teile.jwe als Datei, der Kern lädt nicht hoch', () => {
  assert.deepEqual(bauartUrteil(KERN), []);
});

test('[SHL·verschlüsselt·Bauart·Rot-Beweis] Klartext durchgereicht und Schlüssel in der Datei fallen auf', () => {
  const offen = KERN.replace('const jwe = await _jweCompactDir(klartext, keyBytes);', 'const jwe = String(klartext);');
  assert.notEqual(offen, KERN, 'Vorbedingung: die Zeile steht so im Kern');
  assert.ok(bauartUrteil(offen).some((x) => /nicht über _jweCompactDir/.test(x)));
  const dialog = funktionsKoerper(KERN, '_shlDialogZeigen');
  const mitSchluessel = KERN.replace(dialog, dialog.replace('new Blob([teile.jwe]', 'new Blob([teile.jwe + teile.key]'));
  assert.notEqual(mitSchluessel, KERN, 'Vorbedingung: der Dialog legt teile.jwe in eine Datei');
  assert.ok(bauartUrteil(mitSchluessel).some((x) => /anderes als die JWE/.test(x)));
});

test('[SHL·verschlüsselt·Wirkung] die JWE trägt weder Klartext noch Schlüssel, öffnet mit dem Link-Schlüssel und nicht verändert', async () => {
  const { V } = ladeKern({ Blob });
  const klartext = JSON.stringify({ resourceType: 'Bundle', type: 'document', entry: [{ resource: { resourceType: 'Observation', note: [{ text: MARKE }] } }] });
  const teile = await V._shlTeile(klartext, { label: 'Probe' });
  const [kopfB64, schluesselTeil, ivB64, ctB64, tagB64] = teile.jwe.split('.');
  assert.equal(teile.jwe.split('.').length, 5, 'JWE Compact: fünf Teile');
  assert.equal(schluesselTeil, '', 'alg dir: kein verschlüsselter Schlüssel in der JWE');
  const kopf = JSON.parse(Buffer.from(kopfB64, 'base64url').toString('utf8'));
  assert.equal(kopf.alg, 'dir');
  assert.equal(kopf.enc, 'A256GCM');
  const marke = Buffer.from(MARKE, 'utf8');
  for (const form of [MARKE, marke.toString('base64'), marke.toString('base64url'), Buffer.from(klartext).toString('base64url').slice(0, 40)]) {
    assert.ok(!teile.jwe.includes(form), 'Klartext steht nicht in der JWE: ' + form);
  }
  assert.ok(!teile.jwe.includes(teile.key), 'der Schlüssel steht nicht in der JWE');
  assert.equal(Buffer.from(teile.key, 'base64url').length, 32, 'der Link-Schlüssel hat 256 Bit');
  const key = await webcrypto.subtle.importKey('raw', Buffer.from(teile.key, 'base64url'), { name: 'AES-GCM' }, false, ['decrypt']);
  const iv = Buffer.from(ivB64, 'base64url');
  const ct = Buffer.concat([Buffer.from(ctB64, 'base64url'), Buffer.from(tagB64, 'base64url')]);
  const aad = Buffer.from(kopfB64, 'ascii');
  const offen = Buffer.from(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, ct)).toString('utf8');
  assert.equal(offen, klartext, 'mit dem Schlüssel aus dem Link öffnet die Datei zum Klartext');
  const kaputt = Buffer.from(ct); kaputt[0] ^= 1;
  await assert.rejects(webcrypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, kaputt), 'ein verändertes Byte öffnet nicht');
  const zweite = await V._shlTeile(klartext, { label: 'Probe' });
  assert.notEqual(zweite.key, teile.key, 'ein frischer Schlüssel je Link');
});
