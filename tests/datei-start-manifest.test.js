'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Doppelklick öffnet die Datei (U2-ADR-463, Ablage ohne Netz, Teil 4)
   ───────────────────────────────────────────────────────────────────────────
   Der Empfänger `window.launchQueue.setConsumer` stand im Kern, aber kein Manifest meldete `file_handlers` an — darum
   griff er nie. Jetzt melden beide Manifeste (inline als Data-URL und manifest.webmanifest) die
   Sicherungsdatei an, mit genau der Dateiart, mit der der Kern sie schreibt; `launch_handler` hält die bestehende
   Sitzung im Vordergrund statt eine zweite zu öffnen. Wirkt nur in der installierten Desktop-App von Chrome und Edge.
   Den echten Doppelklick kann die Testumgebung nicht; der Weg danach ist in tests/e2e/datei-start-launchqueue.spec.js.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

function inlineManifest(html) {
  const m = html.match(/rel="manifest" href="data:application\/manifest\+json;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(m, 'Vorbedingung: das Inline-Manifest steht im Kern');
  return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
}
// Die Dateiarten, mit denen der Kern seine Sicherung schreibt (showSaveFilePicker-types).
function schreibArten(html) {
  return [...html.matchAll(/description: 'Vivodepot-Sicherung', accept: \{ '([^']+)': \['([^']+)'\] \}/g)].map((m) => m[1] + ' ' + m[2]);
}

function befunde(manifest, arten) {
  const raus = [];
  const fh = manifest.file_handlers;
  if (!Array.isArray(fh) || !fh.length) return ['file_handlers fehlt'];
  const angemeldet = fh.flatMap((h) => Object.entries(h.accept || {}).flatMap(([mime, endungen]) => endungen.map((e) => mime + ' ' + e)));
  for (const a of arten) if (!angemeldet.includes(a)) raus.push('nicht angemeldet: ' + a);
  if (!fh.every((h) => h.action === './vivodepot.html')) raus.push('action zeigt nicht auf die App');
  if (!manifest.launch_handler || manifest.launch_handler.client_mode !== 'focus-existing') raus.push('launch_handler fehlt');
  return raus;
}

test('[Datei-Start] beide Manifeste melden die Sicherungsdatei an, mit der Dateiart, mit der der Kern sie schreibt', () => {
  const arten = [...new Set(schreibArten(KERN))];
  assert.ok(arten.length >= 1, 'Ausbeute: die Schreib-Dateiart wird gefunden (' + arten.join(', ') + ')');
  const inline = inlineManifest(KERN);
  const datei = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.webmanifest'), 'utf8'));
  assert.deepEqual(befunde(inline, arten), []);
  assert.deepEqual(befunde(datei, arten), []);
  assert.deepEqual(inline.file_handlers, datei.file_handlers, 'beide Manifeste gleich');
  const rot = befunde({ ...inline, file_handlers: undefined }, arten);
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: ohne file_handlers fällt es');
});

test('[Datei-Start] der Empfänger ist verdrahtet und übergibt die Datei an den Öffnen-Schirm', () => {
  const i = KERN.indexOf('window.launchQueue.setConsumer');
  assert.ok(i > 0, 'launchQueue.setConsumer steht im Kern');
  assert.match(KERN.slice(i, i + 900), /renderCryptoOverlay\(/, 'die Datei geht in den Öffnen-Schirm');
});
