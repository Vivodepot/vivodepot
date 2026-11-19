'use strict';
/* PDF im Depot ansehen (17.11.2026): die eingebettete PDF-Anzeige (pdf.js) lockert die Richtlinie nicht.
   Erlaubt ist genau ein weiterer sha256 in script-src für ihren Block. Kein frame-src/child-src/object-src, kein
   'unsafe-eval', 'wasm-unsafe-eval' oder 'unsafe-inline', kein blob: oder data: für Skripte, kein Nachladen (connect-src
   'none'), worker-src unverändert. Die Fassung der Bibliothek ist mindestens 4.2.67 (CVE-2024-4367), ihr Block passt zu
   seiner Marke, und der Kern ruft sie mit isEvalSupported: false auf. Rot-Beweis: dieselbe Prüfung meldet jede Lockerung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { fassungMindestens, MINDESTFASSUNG, blockAusKern, SCRIPT_ID } = require('../tools/pdfjs-einbetten.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Die Direktiven außer script-src, wie sie vor der PDF-Anzeige standen. Ändert sich eine, ist das eine eigene Entscheidung. */
const UNVERAENDERT = Object.freeze({
  'default-src': "'none'",
  'style-src': "'unsafe-inline'",
  'img-src': "'self' data: blob:",
  'media-src': "'self' blob:",
  'font-src': "'self' data:",
  'connect-src': "'none'",
  'worker-src': "'self'",
  'manifest-src': "'self' data:",
  'form-action': "'none'",
  'base-uri': "'none'",
  'frame-ancestors': "'none'",
  'require-trusted-types-for': "'script'",
  'trusted-types': 'default',
});

function richtlinie(html) {
  const m = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/.exec(html);
  assert.ok(m, 'keine Richtlinie im Kern');
  const d = {};
  for (const teil of m[1].split(';')) {
    const t = teil.trim().split(/\s+/);
    if (t[0]) d[t[0]] = t.slice(1).join(' ');
  }
  return d;
}

/** Liefert die Liste der Lockerungen gegenüber der Vorgabe (leer = nichts gelockert). */
function lockerungen(d) {
  const f = [];
  for (const [k, v] of Object.entries(UNVERAENDERT)) if (d[k] !== v) f.push(k + ' ist „' + d[k] + '“, erwartet „' + v + '“');
  for (const k of Object.keys(d)) if (k !== 'script-src' && !(k in UNVERAENDERT)) f.push('neue Direktive ' + k);
  for (const tok of (d['script-src'] || '').split(/\s+/)) {
    if (tok !== "'self'" && !/^'sha256-[A-Za-z0-9+/=]+'$/.test(tok)) f.push('script-src trägt ' + tok);
  }
  return f;
}

function blockHash(html) {
  const re = new RegExp('<script type="module" id="' + SCRIPT_ID + '">([\\s\\S]*?)</script>');
  const m = re.exec(html);
  return m ? "'sha256-" + crypto.createHash('sha256').update(m[1], 'utf8').digest('base64') + "'" : null;
}

test('[PDF ansehen·Richtlinie] nichts gelockert: nur sha256 in script-src, sonst alles wie zuvor', () => {
  assert.deepEqual(lockerungen(richtlinie(KERN)), []);
});

test('[PDF ansehen·Richtlinie] der Block der PDF-Anzeige ist da und genau über seinen sha256 erlaubt', () => {
  const h = blockHash(KERN);
  assert.ok(h, 'kein Block ' + SCRIPT_ID + ' im Kern');
  assert.ok(richtlinie(KERN)['script-src'].split(/\s+/).includes(h), 'sha256 des Blocks fehlt in script-src');
});

test('[PDF ansehen·Fassung] die eingebettete Bibliothek ist mindestens ' + MINDESTFASSUNG + ' und passt zu ihrer Marke', () => {
  const marke = /@vd-lib name="pdfjs-dist" version="([^"]+)"[^>]*?sha256="([0-9a-f]{64})"/.exec(KERN);
  assert.ok(marke, 'keine @vd-lib-Marke pdfjs-dist');
  assert.ok(fassungMindestens(marke[1], MINDESTFASSUNG), 'Fassung ' + marke[1] + ' unter ' + MINDESTFASSUNG);
  const block = blockAusKern(KERN);
  assert.ok(block, 'Block fehlt');
  assert.equal(crypto.createHash('sha256').update(block, 'utf8').digest('hex'), marke[2], 'Block und Marke weichen ab');
});

test('[PDF ansehen·Block] der eingebettete Block ist ein gültiges Modul ohne weitere import/export-Anweisung', () => {
  const block = blockAusKern(KERN);
  assert.ok(block, 'Block fehlt');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfjs-block-'));
  try {
    const datei = path.join(dir, 'block.mjs');
    fs.writeFileSync(datei, block);
    execFileSync(process.execPath, ['--check', datei], { stdio: 'pipe' });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.doesNotMatch(block, /(^|[;}])\s*(import|export)\s*[{*]/m, 'import/export-Anweisung im Block');
});

test('[PDF ansehen·Aufruf] der Kern ruft die Bibliothek mit isEvalSupported: false und ohne Adresse auf', () => {
  const m = /const PDF_ANSICHT_OPTIONEN = Object\.freeze\(\{([^}]*)\}\)/.exec(KERN);
  assert.ok(m, 'PDF_ANSICHT_OPTIONEN fehlt im Kern');
  assert.match(m[1], /isEvalSupported:\s*false/);
  assert.doesNotMatch(m[1], /Url\s*:/, 'keine Adresse zum Nachladen');
});

test('[PDF ansehen·Rot-Beweis] die Prüfung meldet jede Lockerung', () => {
  const d = richtlinie(KERN);
  const mit = (k, v) => lockerungen(Object.assign({}, d, { [k]: v }));
  assert.ok(mit('frame-src', 'blob:').length, 'frame-src blob:');
  assert.ok(mit('object-src', "'self'").length, 'object-src');
  assert.ok(mit('script-src', d['script-src'] + " 'unsafe-eval'").length, 'unsafe-eval');
  assert.ok(mit('script-src', d['script-src'] + " 'wasm-unsafe-eval'").length, 'wasm-unsafe-eval');
  assert.ok(mit('script-src', d['script-src'] + ' blob:').length, 'blob: für Skripte');
  assert.ok(mit('script-src', d['script-src'] + ' data:').length, 'data: für Skripte');
  assert.ok(mit('connect-src', "'self'").length, 'connect-src');
  assert.ok(mit('worker-src', "'self' blob:").length, 'worker-src blob:');
  assert.ok(!fassungMindestens('4.2.66', MINDESTFASSUNG) && !fassungMindestens('3.11.174', MINDESTFASSUNG), 'zu alte Fassung');
  assert.ok(fassungMindestens('4.10.38', MINDESTFASSUNG) && fassungMindestens('5.0.0', MINDESTFASSUNG));
});
