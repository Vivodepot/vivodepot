'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { elternAusCommonDir, schwesterRepoPfad } = require('../tools/lib/schwester-repo.js');

const REPO = path.join(__dirname, '..');
const GATEWAY = 'vivodepot-download-gateway';

test('[Schwester-Repo] der Elternordner folgt der Git-Bauform: nacktes Hub-Repo und klassisches .git', () => {
  assert.equal(elternAusCommonDir('/a/b/vivodepot-hub-v2.git'), '/a/b');
  assert.equal(elternAusCommonDir('/a/b/vivodepot-cleanslate/.git'), '/a/b');
});

test('[Schwester-Repo] eine gesetzte Umgebungsvariable gewinnt', () => {
  assert.equal(schwesterRepoPfad(GATEWAY, { envName: 'VIVODEPOT_GATEWAY_REPO', env: { VIVODEPOT_GATEWAY_REPO: '/x/y' } }), path.resolve('/x/y'));
});

test('[Schwester-Repo·Rot-Beweis] aus einem Arbeitsbaum wird das Gateway gefunden, nicht übersprungen', (t) => {
  const gefunden = schwesterRepoPfad(GATEWAY, { env: {} });
  const naiv = path.join(REPO, '..', GATEWAY);
  if (!fs.existsSync(gefunden)) {
    t.skip('UNGEMESSEN — kein Gateway neben dem Haupt-Repo auf dieser Maschine (' + gefunden + ')');
    return;
  }
  assert.ok(fs.existsSync(path.join(gefunden, 'src', 'produkt-text-erzeugen.js')), 'das gefundene Verzeichnis ist das Gateway');
  if (!fs.existsSync(naiv)) t.diagnostic('Arbeitsbaum: REPO/.. hätte ins Leere gezeigt (' + naiv + '), der Helfer findet ' + gefunden);
});

const ERLAUBT = new Map([
  ['tools/dod-v1-rezepte-pruefen.js', 'CLI-Vorgabe, per --rezeptbuch überschreibbar; misst in keiner Landung (sein Test läuft auf Fixtures)'],
  ['tools/lib/schwester-repo.js', 'der Helfer selbst'],
  ['tools/rezepte-zeremonie.js', 'Handwerkzeug (Rezept-Zeremonie), per VIVODEPOT_GATEWAY_REPO überschreibbar; misst in keiner Landung (sein Test berührt das Gateway nicht)'],
]);

test('[Schwester-Repo·Klasse] kein Test und kein Werkzeug löst das Gateway relativ zu REPO oder über einen festen Pfad auf', () => {
  const funde = [];
  for (const ordner of ['tests', 'tools']) {
    const stapel = [path.join(REPO, ordner)];
    while (stapel.length) {
      const d = stapel.pop();
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'fixtures') stapel.push(p); continue; }
        if (!/\.(c?js|mjs)$/.test(e.name)) continue;
        const rel = path.relative(REPO, p).split(path.sep).join('/');
        if (ERLAUBT.has(rel) || rel === 'tests/schwester-repo-pfad.test.js') continue;
        const text = fs.readFileSync(p, 'utf8');
        if (/path\.(join|resolve)\([^)\n]*'\.\.'[^)\n]*'vivodepot-download-gateway'/.test(text) || /['"]\/Users\/[^'"]*vivodepot-download-gateway/.test(text)) funde.push(rel);
      }
    }
  }
  assert.deepEqual(funde, [], 'über tools/lib/schwester-repo.js auflösen: ' + funde.join(', '));
});
