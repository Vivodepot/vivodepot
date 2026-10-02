'use strict';
/* Gleichlauf der QR-Bibliothek (U2-ADR-460): trägt eine weitere Anwendung den Block qrcode-generator, ist er byte-gleich zum Kern,
   und die SBOM nennt den zusätzlichen Träger beim Titel seiner Seite. Eine abweichende Kopie bricht die SBOM ab. Die Träger werden
   über den Marker gefunden, nicht über Dateinamen. Werkzeug: tools/sbom-pflegen.js (zusaetzlicheTraeger). */
// nur-privat: der Test gegen die echten SBOM-Träger braucht die Studio-Datei, die der Zuschnitt zurückhält.
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { zusaetzlicheTraeger } = require('../tools/sbom-pflegen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const SBOM = JSON.parse(fs.readFileSync(path.join(REPO, 'vivodepot.sbom.cdx.json'), 'utf8'));

test('[QR-Kopie] jede weitere Kopie ist byte-gleich, und die SBOM nennt genau diese Träger', () => {
  const traeger = zusaetzlicheTraeger('qrcode-generator', KERN, REPO);
  const komp = SBOM.components.find((c) => c.name === 'qrcode-generator');
  const inSbom = (komp.properties || []).filter((p) => p.name === 'vivodepot:zusaetzlicher-traeger').map((p) => p.value);
  assert.deepEqual(inSbom, traeger.map((t) => t + ' (byte-gleiche Kopie)'));
});

test('[QR-Kopie·Rot-Beweis] eine abweichende Kopie in einer weiteren Anwendung bricht ab; ohne Kopie gibt es keinen Träger', () => {
  const m = KERN.indexOf('@vd-lib name="qrcode-generator"');
  const block = KERN.slice(KERN.lastIndexOf('<!--', m), KERN.indexOf('</script>', m) + '</script>'.length);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-kopie-'));
  try {
    fs.writeFileSync(path.join(tmp, 'ohne.html'), '<title>Ohne</title><p>nichts</p>');
    assert.deepEqual(zusaetzlicheTraeger('qrcode-generator', KERN, tmp), []);
    fs.writeFileSync(path.join(tmp, 'gleich.html'), '<title>Gleich</title>' + block);
    assert.deepEqual(zusaetzlicheTraeger('qrcode-generator', KERN, tmp), ['Gleich']);
    fs.writeFileSync(path.join(tmp, 'anders.html'), '<title>Anders</title>' + block.replace('return qrcode;', 'return qrcode; // verändert'));
    assert.throws(() => zusaetzlicheTraeger('qrcode-generator', KERN, tmp), /abweichende Kopie \(anders\.html\)/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
