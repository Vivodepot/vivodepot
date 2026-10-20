'use strict';
/* Probe zu tools/lib/vorlage-aufloesen.js: der Ersatz greift nur im öffentlichen Zuschnitt, im Kanon wird eine fehlende
   Vorlage rot (Auflage 09.10.2026, fail-open verhindern). Rot-Beweis in Wegwerf-Bäumen, nie im echten. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { vorlageAufloesen, ersatzPfad } = require('../tools/lib/vorlage-aufloesen.js');
const { WURZEL_KOPFZEILE, wurzelKopfzeileSetzen, wurzelIstOeffentlich } = require('../tools/lib/wurzel-kopfzeile.js');

const KERN_KOPF = ['<!DOCTYPE html>', '<!--', WURZEL_KOPFZEILE.quellzeile, '-->', "<script>const BUILD_VERSION = 'v1.0'; const SCHALEN_STAND = 'v1';</script>", ''].join('\n');

function baum({ oeffentlich }) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vorlage-'));
  fs.writeFileSync(path.join(d, WURZEL_KOPFZEILE.datei), oeffentlich ? wurzelKopfzeileSetzen(KERN_KOPF) : KERN_KOPF);
  return d;
}
const abs = (d) => path.join(d, 'tools', 'vorlagen-beispiel', 'a.json');
function legeErsatzAn(d) {
  fs.mkdirSync(path.dirname(ersatzPfad(d, abs(d))), { recursive: true });
  fs.writeFileSync(ersatzPfad(d, abs(d)), '{}\n');
}

test('[Vorlage] das Merkmal: nur die vom Zuschnitt gesetzte Kopfzeile macht den Baum öffentlich', () => {
  const kanon = baum({ oeffentlich: false });
  const zuschnitt = baum({ oeffentlich: true });
  try {
    assert.equal(wurzelIstOeffentlich(kanon), false);
    assert.equal(wurzelIstOeffentlich(zuschnitt), true);
    assert.equal(wurzelIstOeffentlich(path.join(os.tmpdir(), 'gibt-es-nicht-' + process.pid)), false, 'ohne Wurzeldatei: kein Ersatz');
  } finally { fs.rmSync(kanon, { recursive: true, force: true }); fs.rmSync(zuschnitt, { recursive: true, force: true }); }
});

test('[Vorlage] der echte Kanon-Baum ist nicht öffentlich — sonst griffe der Ersatz auch dort', () => {
  const REPO = path.join(__dirname, '..');
  // Im Kanon trägt die Wurzeldatei die Quellzeile, im Zuschnitt die öffentliche; die bestehende Weiche der nur-privat-Proben sagt dasselbe.
  assert.equal(wurzelIstOeffentlich(REPO), require('./helfer/nur-privat.js').istOeffentlich(REPO), 'Wurzel-Kopfzeile und nur-privat-Weiche müssen dasselbe sagen');
});

test('[Vorlage] Rot-Beweis: im Kanon wirft die fehlende Vorlage, auch wenn ein Gegenstück daliegt', () => {
  const d = baum({ oeffentlich: false });
  try {
    legeErsatzAn(d);
    assert.throws(() => vorlageAufloesen(d, abs(d)), /Vorlage fehlt im Kanon/);
    process.env.VD_OEFFENTLICH = '1';   // eine Umgebungsvariable ändert daran nichts
    try { assert.throws(() => vorlageAufloesen(d, abs(d)), /Vorlage fehlt im Kanon/); } finally { delete process.env.VD_OEFFENTLICH; }
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('[Vorlage] im öffentlichen Baum greift das Gegenstück, und ohne Gegenstück wirft es', () => {
  const d = baum({ oeffentlich: true });
  try {
    assert.throws(() => vorlageAufloesen(d, abs(d)), /kein erfundenes Gegenstück/);
    legeErsatzAn(d);
    assert.equal(vorlageAufloesen(d, abs(d)), ersatzPfad(d, abs(d)));
    fs.mkdirSync(path.dirname(abs(d)), { recursive: true });
    fs.writeFileSync(abs(d), '{"echt":true}\n');
    assert.equal(vorlageAufloesen(d, abs(d)), abs(d), 'ist die Vorlage da, gilt sie');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
