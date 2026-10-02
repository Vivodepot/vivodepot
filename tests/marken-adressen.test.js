'use strict';
/* Adressen der Marke nur an der Marken-Stelle (Befund STUDIO-MARKE, v847, U2-ADR-362): über alle fünf Oberflächen steht eine
   Adresse unter vivodepot.de/.org nur in `const MARKEN_ADRESSEN = Object.freeze({ … });`, außer den unersetzbaren Adressen des
   Herkunftsorts und den benannten Kennungen. Werkzeug: tools/marken-adressen-pruefen.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/marken-adressen-pruefen.js');

const REPO = path.join(__dirname, '..');
const lesen = (d) => fs.readFileSync(path.join(REPO, d), 'utf8');

test('[Marken-Adressen] alle Oberflächen: Adressen der Marke nur an der Marken-Stelle', () => {
  assert.ok(W.OBERFLAECHEN.includes('vivodepot.html') && W.OBERFLAECHEN.includes('vivodepot-lesen.html'), 'Kern und Lese-App werden erkannt');
  assert.deepEqual(W.pruefen(), []);
  for (const d of W.OBERFLAECHEN) {
    const stellen = W.stellen(W.ohneKommentare(lesen(d)));
    if (d === 'vivodepot-lesen.html') assert.equal(stellen.length, 0, 'die Lese-App trägt keine Adresse — ihr Link kommt aus der Domain der Marke');
    else assert.equal(stellen.length, 1, d + ': genau eine Marken-Stelle');
  }
});

test('[Marken-Adressen·Rot-Beweis] je Oberfläche: eine gepflanzte Adresse außerhalb der Stelle ist ein Befund', () => {
  for (const d of W.OBERFLAECHEN) {
    const text = lesen(d).replace('</body>', '<a href="https://vivodepot.de/neu.html">x</a></body>');
    const b = W.pruefeText(d, text);
    assert.equal(b.length, 1, d + ': ' + JSON.stringify(b));
    assert.equal(b[0].adresse, 'https://vivodepot.de/neu.html');
  }
});

test('[Marken-Adressen·Rot-Beweis] der Stand vor v847 — eine feste Adresse im Kern-Code — wäre rot', () => {
  const kern = lesen('vivodepot.html')
    .replace("const EMPFAENGER_QR_LESE_URL = MARKEN_ADRESSEN.empfaengerQrLesen;", "const EMPFAENGER_QR_LESE_URL = 'https://register.vivodepot.de/lesen/';");
  assert.notEqual(kern, lesen('vivodepot.html'), 'Testvoraussetzung: die Pflanzung greift');
  assert.equal(W.pruefeText('vivodepot.html', kern).length, 1);
});

test('[Marken-Adressen·Rot-Beweis] eine zweite Marken-Stelle ist selbst ein Befund', () => {
  const text = 'const MARKEN_ADRESSEN = Object.freeze({\n  a: "https://vivodepot.de/",\n});\n'
    + 'const MARKEN_ADRESSEN = Object.freeze({\n  b: "https://vivodepot.org/",\n});\n';
  const b = W.pruefeText('probe.html', text, []);
  assert.deepEqual(b.map((x) => x.grund), ['zweite Marken-Stelle — es darf nur eine geben']);
});

test('[Marken-Adressen] Herkunftsort, Kennungen und Kommentare sind keine Befunde — aber nur genau sie', () => {
  const herkunft = W.herkunftKonstanten();
  assert.ok(herkunft.includes('VIVODEPOT_HERKUNFT_LINK') && herkunft.includes('DATENSCHUTZ_LINK'), 'aus tools/herkunftsort-register.json');
  const text = [
    "const VIVODEPOT_HERKUNFT_LINK = 'https://vivodepot.de';",
    "const x = { $id: 'https://vivodepot.de/schemas/anfrage-schema.json' };",
    '// siehe https://vivodepot.de/irgendwo',
    '/* https://share.vivodepot.de/ */',
    "const ANDERER_LINK = 'https://vivodepot.de/';",
  ].join('\n');
  const b = W.pruefeText('probe.html', text, herkunft);
  assert.deepEqual(b.map((x) => [x.zeile, x.adresse]), [[5, 'https://vivodepot.de/']], 'nur die eine fremde Konstante');
});

test('[Marken-Adressen] Oberfläche ist, wer den VdCrypto-Block trägt — eine HTML-Datei ohne ihn zählt nicht', () => {
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'marken-oberflaechen-'));
  try {
    // Die Signatur wird zusammengesetzt, damit diese Datei selbst kein Träger ist (tools/krypto-block-propagation-pruefen.js).
    fs.writeFileSync(path.join(tmp, 'mit.html'), '<script>const ' + 'VdCrypto = Object.freeze({});</script>');
    fs.writeFileSync(path.join(tmp, 'ohne.html'), '<p>https://vivodepot.de/</p>');
    assert.deepEqual(W.oberflaechen(tmp), ['mit.html']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Marken-Adressen] die Kommandozeile: ohne Argument Exit 0', () => {
  const { spawnSync } = require('node:child_process');
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'marken-adressen-pruefen.js')], { encoding: 'utf8', cwd: REPO });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /nur an der Marken-Stelle/);
});
