'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Notfall-Sicht: die Nummer zum Antippen verlinkt nur auf `tel:` (08.11.2026).
   ────────────────────────────────────────────────────────────────────────
   notfallPersonHTML setzt die Nummer einer Person als Link mit dem Ziel aus notfallTelHref. Erlaubt ist nur
   ^tel:\+?[0-9]+$ — oder kein Link, dann steht die Nummer als Text da. Gefragt mit feindlichen und kaputten Eingaben
   („javascript:alert(1)“, „https://x“, leer, nur Leerzeichen, nur Buchstaben, „+“ mitten in der Nummer).
   Rot-Beweis: dieselben Fälle gegen eine Kern-Kopie mit der früheren Fassung des Helfers (`'tel:' + alles außer Ziffern
   und „+“ entfernt`) fallen — sie lieferte `tel:` ohne Ziffer und ließ „+“ mitten in der Nummer stehen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const HTML_PATH = path.join(__dirname, '..', 'vivodepot.html');
const ERLAUBT = /^tel:\+?[0-9]+$/;
const FAELLE = ['javascript:alert(1)', 'https://x', '', '   ', 'abc def', '+49 30 1234-567', '030 / 12 34', '1+2+3', ' +1 ', 'tel:+49', 'data:text/html,<b>1</b>'];

function verstoesse(V) {
  const raus = [];
  for (const f of FAELLE) {
    const ziel = V.notfallTelHref(f);
    if (ziel !== '' && !ERLAUBT.test(ziel)) raus.push('notfallTelHref(' + JSON.stringify(f) + ') = ' + JSON.stringify(ziel));
    const html = V.notfallPersonHTML({ name: 'P', tel: f }, '');
    for (const m of html.matchAll(/\shref="([^"]*)"/g)) {
      if (!ERLAUBT.test(m[1])) raus.push('notfallPersonHTML(tel ' + JSON.stringify(f) + ') verlinkt auf ' + JSON.stringify(m[1]));
    }
  }
  return raus;
}

test('[Notfall·tel] das Ziel ist nur tel: mit Ziffern, sonst kein Link', async () => {
  const { V } = await ladeKern();
  assert.deepEqual(verstoesse(V), []);
  assert.equal(V.notfallTelHref('+49 30 1234-567'), 'tel:+49301234567', 'eine echte Nummer bleibt antippbar');
  const ohneZiffer = V.notfallPersonHTML({ name: 'P', tel: 'abc' }, '');
  assert.ok(!/href=/.test(ohneZiffer) && ohneZiffer.includes('abc'), 'ohne Ziffer steht die Nummer als Text da');
});

test('[Notfall·tel·Rot-Beweis] die frühere Fassung des Helfers fällt', async (t) => {
  const kern = fs.readFileSync(HTML_PATH, 'utf8');
  const start = kern.indexOf('function notfallTelHref(tel) {');
  const ende = kern.indexOf('\n}\n', start);
  assert.ok(start > 0 && ende > start, 'Vorbedingung: notfallTelHref steht im Kern');
  const alt = kern.slice(0, start) + "function notfallTelHref(tel) {\n  return 'tel:' + String(tel || '').replace(/[^\\d+]/g, '');" + kern.slice(ende);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'notfall-tel-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const datei = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(datei, alt);
  const { V } = await ladeKern({ htmlPfad: datei, backen: true });
  const funde = verstoesse(V);
  assert.ok(funde.some((f) => f.includes('"tel:"')), 'die alte Fassung liefert tel: ohne Ziffer: ' + funde.join(' | '));
  assert.ok(funde.some((f) => f.includes('tel:1+2+3')), 'die alte Fassung lässt „+“ mitten in der Nummer stehen');
});
