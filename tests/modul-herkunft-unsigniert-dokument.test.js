'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund MODUL-HERKUNFT-UNSIGNIERT-OHNE-KENNZEICHEN (MITTEL, 31.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Herkunftstext eines Moduls (dokAusgabe.herkunftText) ist eine Selbstauskunft. Ein Modul ohne geprüfte Signatur
   schrieb ihn wörtlich ins Dokument, auch „geprüft von …“, ohne dass im Dokument stand, dass niemand das geprüft hat.
   Gefordert: jedes Dokument aus einem Modul ohne geprüfte Signatur trägt den Satz modulDokUnsigniert, und zwar VOR dem
   Herkunftstext, damit die Selbstauskunft nicht vor dem Kennzeichen steht. Beide Senken (HTML und PDF) lesen dieselbe
   dokAusgabe aus _modulOderVorlage; die Probe prüft dort und am gebauten Dokument-HTML.
   Gegenprobe: das Ab-Werk-Modul des Kerns trägt den Satz nicht.
   Rot-Beweis: an einer Kernkopie ohne den Aufruf der Kennzeichnung steht der Satz nicht im Dokument.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const MODUL = path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json');
const SELBSTAUSKUNFT = 'Geprüft und freigegeben von einer Kammer';

function fremdesModul(herkunftText) {
  const b = JSON.parse(fs.readFileSync(MODUL, 'utf8'));
  b.id = 'herkunft-probe';
  b.dokAusgabe.knopfAttr = 'herkunft-probe-dokument';
  if (herkunftText === undefined) delete b.dokAusgabe.herkunftText; else b.dokAusgabe.herkunftText = herkunftText;
  return b;
}

async function kernMitModul(bundle, opts) {
  const { V } = ladeKern(opts);
  await V.depotAnlegen('modul-herkunft-unsigniert-pw-1');
  V.getData().logikModule = [];
  const e = V.modulEinlassen(JSON.stringify(bundle), V.getData(), null, null);
  assert.equal(e.angenommen, true, 'Vorbedingung: das Modul wird unsigniert eingelassen (' + (e.grund || '') + ')');
  return V;
}

test('[Herkunft·unsigniert] das Dokument trägt den Satz „unsigniert“ vor dem Herkunftstext des Moduls', async () => {
  const V = await kernMitModul(fremdesModul(SELBSTAUSKUNFT));
  const satz = V.STRINGS.modulDokUnsigniert;
  assert.match(satz, /unsigniert/, 'der Satz sagt „unsigniert“');
  const da = V._modulOderVorlage('herkunft-probe').dokAusgabe;
  assert.equal(da.herkunftText, satz + ' ' + SELBSTAUSKUNFT, 'Kennzeichen zuerst, dann die Selbstauskunft');
  const h = V.dokumentHTML('herkunft-probe');
  const iSatz = h.indexOf(V.escapeHTML(satz));
  const iEigen = h.indexOf(V.escapeHTML(SELBSTAUSKUNFT));
  assert.ok(iSatz > -1, 'der Satz steht im Dokument-HTML');
  assert.ok(iEigen > iSatz, 'die Selbstauskunft steht hinter dem Kennzeichen');
});

test('[Herkunft·unsigniert] auch ohne eigenen Herkunftstext steht der Satz im Dokument', async () => {
  const V = await kernMitModul(fremdesModul(undefined));
  assert.equal(V._modulOderVorlage('herkunft-probe').dokAusgabe.herkunftText, V.STRINGS.modulDokUnsigniert);
  assert.ok(V.dokumentHTML('herkunft-probe').includes(V.escapeHTML(V.STRINGS.modulDokUnsigniert)));
});

test('[Herkunft·Gegenprobe] das Ab-Werk-Modul des Kerns trägt den Satz nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('modul-herkunft-abwerk-pw-1');
  const abWerk = V._logikModuleAlle(V.getData()).filter((m) => m && m.id && V._modulOderVorlage(m.id));
  assert.ok(abWerk.length > 0, 'Vorbedingung: das Produkt trägt mindestens ein Ab-Werk-Modul');
  for (const m of abWerk) {
    const da = V._modulOderVorlage(m.id).dokAusgabe;
    assert.ok(!String(da.herkunftText || '').includes(V.STRINGS.modulDokUnsigniert), m.id + ': kein Kennzeichen am Ab-Werk-Modul');
  }
});

test('[Herkunft·Rot-Beweis] an einer Kernkopie ohne die Kennzeichnung fehlt der Satz im Dokument', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const aufruf = 'dokAusgabe: _logikModulDokAusgabeKennzeichnen(roh, aufgeloest.dokAusgabe)';
  assert.equal(quelle.split(aufruf).length, 2, 'Vorbedingung: der Aufruf steht genau einmal im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'herkunft-rot-'));
  const kopie = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(kopie, quelle.replace(aufruf, 'dokAusgabe: aufgeloest.dokAusgabe'));
  try {
    const V = await kernMitModul(fremdesModul(SELBSTAUSKUNFT), { htmlPfad: kopie, backen: true });
    const h = V.dokumentHTML('herkunft-probe');
    assert.ok(h.includes(V.escapeHTML(SELBSTAUSKUNFT)), 'Vorbedingung: die Selbstauskunft steht im Dokument');
    assert.ok(!h.includes(V.escapeHTML(V.STRINGS.modulDokUnsigniert)), 'ohne die Kennzeichnung fehlt der Satz — die Probe oben sähe das');
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
