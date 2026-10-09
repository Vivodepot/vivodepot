'use strict';
/* tools/demo-live-abgleich.js (06.10.2026, Befund DEMO-ALTSTAENDE-LIVE): jede live ausgelieferte Demo-Datei ist byte-gleich
   der Bau aus dem Kanon, frühere Adressen liefern nichts mehr aus, und jede sw.js räumt den alten Cache. Geprüft wird das
   Werkzeug gegen synthetische Fixtures ohne Netz; je Rot-Klasse ein Rot-Beweis. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const A = require('../tools/demo-live-abgleich.js');

const F = path.join(__dirname, 'fixtures', 'demo-live-abgleich');
const WEG = [];
after(() => { for (const d of WEG) fs.rmSync(d, { recursive: true, force: true }); });
function kopie(von) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-demo-live-abgleich-'));
  WEG.push(d);
  fs.cpSync(von, d, { recursive: true });
  return d;
}
const lauf = (bau, live, altpfade = A.altpfadeLesen(path.join(F, 'altpfade.txt'))) => A.abgleichen({ bau, abruf: A.ordnerAbruf(live), altpfade });

test('[Demo-Live-Abgleich] stimmig: jede Datei gleich, der Altpfad weg, die sw.js räumt — grün', async () => {
  const e = await lauf(path.join(F, 'bau'), path.join(F, 'live-stimmig'));
  assert.deepEqual(e.rot, []);
  assert.equal(e.zahlen.gleich, 3);
  assert.deepEqual(e.alt.map((a) => a.ergebnis), ['weg']);
});

test('[Demo-Live-Abgleich] ohne Argumente läuft das Werkzeug gegen die Fixtures und ist grün (Exit 0)', async () => {
  const alt = console.log; console.log = () => {};
  try { assert.equal(await A.main([]), 0); } finally { console.log = alt; }
});

test('[Demo-Live-Abgleich · Rot-Beweis] eine live geänderte Datei (Altstand, Handkopie) ist rot', async () => {
  const live = kopie(path.join(F, 'live-stimmig'));
  fs.appendFileSync(path.join(live, 'demo/beispiel/app/vivodepot.html'), '<!-- alt -->');
  const e = await lauf(path.join(F, 'bau'), live);
  assert.equal(e.zahlen.anders, 1);
  assert.match(e.rot.join('\n'), /anders als der Bau: demo\/beispiel\/app\/vivodepot\.html/);
});

test('[Demo-Live-Abgleich · Rot-Beweis] ein früherer Pfad, der noch ausgeliefert wird, ist rot', async () => {
  const live = kopie(path.join(F, 'live-stimmig'));
  fs.mkdirSync(path.join(live, 'demo/alt'), { recursive: true });
  fs.writeFileSync(path.join(live, 'demo/alt/vivodepot.html'), 'alt');
  const e = await lauf(path.join(F, 'bau'), live);
  assert.match(e.rot.join('\n'), /Altpfad noch live \(200\): demo\/alt\/vivodepot\.html/);
});

test('[Demo-Live-Abgleich · Rot-Beweis] sw.js mit fremdem Cache-Namen und sw.js ohne Räumen sind rot', async () => {
  const bau = kopie(path.join(F, 'bau'));
  const sw = path.join(bau, 'demo/beispiel/app/sw.js');
  const gut = fs.readFileSync(sw, 'utf8');
  fs.writeFileSync(sw, gut.replace("'vivodepot-shell-v900'", "'vivodepot-shell-v852'"));
  assert.deepEqual(A.swPruefen(bau, 'demo/beispiel/app/sw.js'), ['Cache-Name vivodepot-shell-v852 statt vivodepot-shell-v900']);
  fs.writeFileSync(sw, gut.replace(/\.map\(\(n\) => caches\.delete\(n\)\)/, '.map(() => null)'));
  assert.deepEqual(A.swPruefen(bau, 'demo/beispiel/app/sw.js'), ['activate räumt alte vivodepot-shell-Caches nicht']);
  const e = await lauf(bau, bau);
  assert.equal(e.sw.length, 1);
  assert.ok(e.rot.length >= 1);
});

test('[Demo-Live-Abgleich] ein nicht veröffentlichter Bau wird genannt, ist aber nicht rot; ungemessen ist nie grün', async () => {
  const live = kopie(path.join(F, 'live-stimmig'));
  fs.rmSync(path.join(live, 'demo/beispiel/index.html'));
  const e = await lauf(path.join(F, 'bau'), live);
  assert.equal(e.zahlen.fehltLive, 1);
  assert.deepEqual(e.rot, []);
  // Kein Netz: jeder Abruf ohne Antwort. Das darf nicht als grün durchgehen.
  const ohneNetz = await A.abgleichen({ bau: path.join(F, 'bau'), abruf: async () => ({ status: null }), altpfade: ['demo/alt/vivodepot.html'] });
  assert.equal(ohneNetz.zahlen.nichtGemessen, 3);
  assert.match(ohneNetz.rot.join('\n'), /nichts gemessen/);
});

/* Bedingung der Gegenlesung (06.10.2026) zur Fixture-Ausnahme: die Fixture ist erfunden. Ihre vivodepot.html trägt nur die Schale —
   landet dort still ein echter Kern (mit Feldern, Depot oder Schlüsselmaterial), ist das rot. */
test('[Demo-Live-Abgleich · Fixture] die vivodepot.html der Fixtures ist klein und trägt nur SCHALEN_STAND', () => {
  for (const teil of ['bau', 'live-stimmig']) {
    const datei = path.join(F, teil, 'demo/beispiel/app/vivodepot.html');
    const text = fs.readFileSync(datei, 'utf8');
    assert.ok(Buffer.byteLength(text) < 400, teil + ': klein');
    assert.deepEqual(text.match(/const\s+\w+/g), ['const SCHALEN_STAND'], teil + ': nur die Schale');
  }
  assert.deepEqual(A.dateienIm(path.join(F, 'bau')), ['demo/beispiel/app/sw.js', 'demo/beispiel/app/vivodepot.html', 'demo/beispiel/index.html']);
});
