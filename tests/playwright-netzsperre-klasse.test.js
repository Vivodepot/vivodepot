'use strict';
/* Klassenwächter der Netzsperre, Teil A (14.10.2026, Befund PLAYWRIGHT-OHNE-NETZSPERRE): jede Playwright-Konfiguration im
   Wurzelverzeichnis setzt use.launchOptions aus tools/lib/netz-sperre.js, und kein Projekt überschreibt sie. Teil B (15.10.2026):
   jede direkte Startstelle unter tools/ und tests/ trägt mitSperre (unten).
   Gemessen am geladenen Objekt, nicht am Text: was Playwright liest, trägt den toten Proxy. Rot-Beweis mit erfundenen Konfigurationen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { STARTOPTIONEN } = require('../tools/lib/netz-sperre.js');

const REPO = path.join(__dirname, '..');

function befunde(konfigurationen) {
  const aus = [];
  for (const [name, c] of Object.entries(konfigurationen)) {
    const p = c && c.use && c.use.launchOptions && c.use.launchOptions.proxy;
    if (!p || p.server !== STARTOPTIONEN.proxy.server || p.bypass !== STARTOPTIONEN.proxy.bypass) aus.push(name + ': use.launchOptions ohne die Netzsperre');
    for (const pr of (c && c.projects) || []) {
      if (pr.use && (pr.use.launchOptions || pr.use.proxy)) aus.push(name + ': Projekt ' + pr.name + ' überschreibt launchOptions/proxy');
    }
    if (c && c.use && c.use.proxy) aus.push(name + ': use.proxy überschreibt die Sperre');
  }
  return aus;
}

test('[Netzsperre·Klasse·Konfiguration] jede playwright.config*.js trägt die Netzsperre, kein Projekt hebt sie auf', () => {
  const namen = fs.readdirSync(REPO).filter((n) => /^playwright\.config.*\.js$/.test(n));
  assert.ok(namen.length >= 5, 'gefunden: ' + namen.join(', '));
  const geladen = Object.fromEntries(namen.map((n) => [n, require(path.join(REPO, n))]));
  assert.deepEqual(befunde(geladen), []);
});

test('[Netzsperre·Klasse·Konfiguration·Rot-Beweis] ohne Sperre, mit eigenem proxy und mit überschreibendem Projekt: je gemeldet', () => {
  const gut = { use: { launchOptions: { proxy: { ...STARTOPTIONEN.proxy } } }, projects: [{ name: 'chromium', use: {} }] };
  assert.deepEqual(befunde({ gut }), []);
  assert.deepEqual(befunde({
    ohne: { use: {}, projects: [] },
    fremd: { use: { launchOptions: { proxy: { server: 'http://anders:1', bypass: '' } } } },
    projekt: { ...gut, projects: [{ name: 'webkit', use: { launchOptions: {} } }] },
    eigen: { use: { ...gut.use, proxy: { server: 'http://x:1' } } },
  }), ['ohne: use.launchOptions ohne die Netzsperre', 'fremd: use.launchOptions ohne die Netzsperre',
    'projekt: Projekt webkit überschreibt launchOptions/proxy', 'eigen: use.proxy überschreibt die Sperre']);
});

/* ── Teil B (Wagen B): jede direkte Startstelle unter tools/ und tests/ trägt die Sperre ───────────────────────────────────────
   Gesucht wird `<x>.launch(` und `<x>.launchPersistentContext(` im Code (ohne Kommentare und ohne Zeichenketten: Proben anderer
   Wächter tragen solche Aufrufe als Text). Die Argumente der Startstelle müssen mitSperre( enthalten. */
function ohneKommentareUndZeichenketten(text) {
  let aus = ''; let i = 0; let s = null;
  while (i < text.length) {
    const c = text[i]; const n = text[i + 1];
    if (s) { if (c === '\\') { aus += '  '; i += 2; continue; } aus += c === '\n' ? '\n' : ' '; if (c === s) s = null; i += 1; continue; }
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') { aus += ' '; i += 1; } continue; }
    if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); const ende = e < 0 ? text.length : e + 2; aus += text.slice(i, ende).replace(/[^\n]/g, ' '); i = ende; continue; }
    if (c === '\'' || c === '"' || c === '`') { s = c; aus += ' '; i += 1; continue; }
    aus += c; i += 1;
  }
  return aus;
}
function startstellenOhneSperre(dateien) {
  const funde = [];
  const MUSTER = /([A-Za-z_$][\w$]*(?:\[[^\]\n]{1,20}\])?)\.(launchPersistentContext|launch)\(/g;
  for (const [d, roh] of Object.entries(dateien)) {
    const code = ohneKommentareUndZeichenketten(roh);
    let m;
    MUSTER.lastIndex = 0;
    while ((m = MUSTER.exec(code))) {
      // Zweite Sicherung neben der Entfernung von Zeichenketten: steht der Aufruf in einem auf derselben Zeile geöffneten Text
      // (ungerade Zahl von Anführungszeichen davor), ist er eine Probe als Text, kein Start (ein Regex-Literal verwirrt den Entferner).
      const vorne = roh.slice(roh.lastIndexOf('\n', m.index) + 1, m.index);
      if (["'", '"', '`'].some((q) => vorne.split(q).length % 2 === 0)) continue;
      let tiefe = 0; let j = m.index + m[0].length - 1; let ende = -1;
      for (; j < roh.length; j++) { const c = code[j]; if (c === '(') tiefe += 1; else if (c === ')') { tiefe -= 1; if (tiefe === 0) { ende = j; break; } } }
      const args = ende > 0 ? roh.slice(m.index + m[0].length, ende) : '';
      if (!/mitSperre\(/.test(args)) funde.push(d + ':' + (roh.slice(0, m.index).split('\n').length) + '  ' + m[0]);
    }
  }
  return funde;
}
function codeDateien(rel, aus = {}) {
  for (const e of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) { if (!['node_modules', 'fixtures'].includes(e.name)) codeDateien(r, aus); continue; }
    if (/\.(c|m)?js$/.test(e.name) && r !== path.join('tools', 'lib', 'netz-sperre.js')) aus[r.split(path.sep).join('/')] = fs.readFileSync(path.join(REPO, r), 'utf8');
  }
  return aus;
}

test('[Netzsperre·Klasse·Startstellen] jede direkte Startstelle unter tools/ und tests/ trägt mitSperre', () => {
  const alle = codeDateien('tests', codeDateien('tools'));
  assert.ok(Object.keys(alle).length > 500, 'die Suche hat tools/ und tests/ gelesen');
  assert.deepEqual(startstellenOhneSperre(alle), []);
});

test('[Netzsperre·Klasse·Startstellen·Rot-Beweis] Start ohne Sperre gemeldet, mit Sperre, im Kommentar und im Text nicht', () => {
  assert.deepEqual(startstellenOhneSperre({
    'tools/ohne.js': 'const b = await chromium.launch({ headless: true });',
    'tools/persist.js': 'const c = await pw[e].launchPersistentContext(dir, { headless: true });',
    'tools/mit.js': "const b = await webkit.launch(require('./lib/netz-sperre.js').mitSperre());",
    'tools/kommentar.js': '// chromium.launch() nur im Kommentar\nconst x = 1;',
    'tests/text.test.js': "const fixture = 'await firefox.launch();';",
  }), ['tools/ohne.js:1  chromium.launch(', 'tools/persist.js:1  pw[e].launchPersistentContext(']);
});
