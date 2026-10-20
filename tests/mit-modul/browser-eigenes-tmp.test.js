'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   browser-eigenes-tmp.test.js — Chromium aus einem Testprozess schreibt in ein eigenes, abgeräumtes TMPDIR (17.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die öffentliche CI brach `npm test` bei 0 roten Tests mit Exit 1 ab: Chromium hatte unter Linux „.org.chromium.Chromium.*“
   im Laufverzeichnis liegen lassen (tools/lib/browser-eigenes-tmp.js, Kopf). Geprüft: jeder Chromium-Start bekommt TMPDIR auf
   ein eigenes Verzeichnis, das nach dem Schließen weg ist; WebKit und Firefox bleiben unberührt; die eigene env einer Probe
   bleibt. Rot-Beweis: ohne den Patch kommt kein TMPDIR an. Dazu einmal mit echtem Chromium, über den Weg, den jeder
   Testprozess nimmt (Module._load), damit nicht nur die Attrappe grün ist.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const B = require('../../tools/lib/browser-eigenes-tmp.js');
const N = require('../../tools/lib/netz-sperre.js');

/* Eine Attrappe von BrowserType: merkt sich die Argumente, liefert ein Objekt mit Ereignissen. */
function attrappe() {
  const aufrufe = [];
  const proto = {
    async launch(...a) { aufrufe.push(['launch', this.name(), a]); return new EventEmitter(); },
    async launchPersistentContext(...a) { aufrufe.push(['launchPersistentContext', this.name(), a]); return new EventEmitter(); },
  };
  const typ = (n) => Object.assign(Object.create(proto), { name: () => n });
  return { proto, aufrufe, chromium: typ('chromium'), webkit: typ('webkit') };
}

test('[Browser-Tmp·Optionen] TMPDIR kommt in die Optionen, an der richtigen Stelle, die eigene env bleibt', () => {
  const l = B.argumenteMitTmp('launch', [], '/t/x', { PATH: '/bin' });
  assert.deepEqual(l[0].env, { PATH: '/bin', TMPDIR: '/t/x', TMP: '/t/x', TEMP: '/t/x' });
  const p = B.argumenteMitTmp('launchPersistentContext', ['/profil', { headless: true, env: { A: '1' } }], '/t/y');
  assert.equal(p[0], '/profil');
  assert.deepEqual(p[1], { headless: true, env: { A: '1', TMPDIR: '/t/y', TMP: '/t/y', TEMP: '/t/y' } });
});

test('[Browser-Tmp·Patch] Chromium bekommt ein eigenes Verzeichnis, das beim Schließen weg ist; WebKit nicht', async () => {
  const a = attrappe();
  const angelegt = [];
  const geraeumt = [];
  B.patchen(a.proto, { anlegen: () => { const d = '/t/' + angelegt.length; angelegt.push(d); return d; }, raeumen: (d) => geraeumt.push(d) });
  const browser = await a.chromium.launch(N.mitSperre({ headless: true }));
  assert.equal(a.aufrufe[0][2][0].env.TMPDIR, '/t/0');
  assert.deepEqual(geraeumt, [], 'solange der Browser offen ist, bleibt sein Verzeichnis');
  browser.emit('disconnected');
  assert.deepEqual(geraeumt, ['/t/0']);
  browser.emit('disconnected');
  assert.deepEqual(geraeumt, ['/t/0'], 'zweimal geräumt wird nicht');
  const kontext = await a.chromium.launchPersistentContext('/profil', N.mitSperre({}));
  assert.equal(a.aufrufe[1][2][1].env.TMPDIR, '/t/1');
  kontext.emit('close');
  assert.deepEqual(geraeumt, ['/t/0', '/t/1']);
  await a.webkit.launch(N.mitSperre({}));
  assert.equal((a.aufrufe[2][2][0] || {}).env, undefined, 'WebKit bleibt unberührt');
  assert.equal(B.patchen(a.proto), false, 'ein zweiter Patch greift nicht noch einmal');
});

test('[Browser-Tmp·Patch·Rot-Beweis] ohne den Patch kommt kein TMPDIR an; scheitert der Start, ist das Verzeichnis trotzdem weg', async () => {
  const ohne = attrappe();
  await ohne.chromium.launch(N.mitSperre({}));
  assert.equal(ohne.aufrufe[0][2][0].env, undefined, 'ungepatcht: Chromium erbt das gemeinsame TMPDIR');
  const mit = attrappe();
  mit.proto.launch = async () => { throw new Error('Start gescheitert'); };
  const geraeumt = [];
  B.patchen(mit.proto, { anlegen: () => '/t/f', raeumen: (d) => geraeumt.push(d) });
  await assert.rejects(mit.chromium.launch(N.mitSperre({})), /Start gescheitert/);
  assert.deepEqual(geraeumt, ['/t/f']);
});

test('[Browser-Tmp·echt] ein echtes Chromium im Testprozess hat sein Verzeichnis unter os.tmpdir, nach close ist es weg', async () => {
  B.beimLadenPatchen();
  const { chromium } = require('playwright');
  assert.ok(Object.getPrototypeOf(chromium)[B.MARKE], 'Vorbedingung: der Prototyp ist gepatcht');
  const browser = await chromium.launch(N.mitSperre());
  const dir = browser[B.VERZEICHNIS];
  try {
    assert.ok(dir && path.dirname(dir) === path.resolve(os.tmpdir()) && path.basename(dir).startsWith(B.PRAEFIX), 'ein eigenes Verzeichnis unter os.tmpdir: ' + dir);
    assert.ok(fs.existsSync(dir), 'solange der Browser offen ist, steht es');
    const seite = await browser.newPage();
    await seite.setContent('<p>x</p>');
    await seite.close();
  } finally { await browser.close(); }
  assert.equal(fs.existsSync(dir), false, 'nach close ist es weg');
});
