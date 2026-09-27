'use strict';
/* ════════════════════════════════════════════════════════════════════════
   publiccode.yml gegen den offiziellen Parser, wenn er installiert ist (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   tests/publiccode-opencode.test.js bildet die Regeln des Parsers nach, ohne Netz
   und ohne Go. Diese Probe fährt den Parser selbst, in derselben Fassung wie der
   Workflow .github/workflows/publiccode-pruefen.yml. Ist er nicht installiert,
   sagt sie laut „übersprungen" statt still grün zu sein.
   Installieren: go install github.com/italia/publiccode-parser-go/v5/publiccode-parser@v5.4.3
   Hier mit --no-network (die Suite bleibt offline); der Workflow prüft zusätzlich
   die Erreichbarkeit der Adressen.
   ROT-BEWEIS: die Fassung, an der der öffentliche Lauf am 25.09.2026 scheiterte,
   fällt mit genau den zwei Fehlern jenes Laufs.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const FASSUNG = 'v5.4.3';

function parserFinden() {
  const kandidaten = [];
  const go = spawnSync('go', ['env', 'GOPATH'], { encoding: 'utf8' });
  if (go.status === 0 && go.stdout.trim()) kandidaten.push(path.join(go.stdout.trim(), 'bin', 'publiccode-parser'));
  kandidaten.push(path.join(os.homedir(), 'go', 'bin', 'publiccode-parser'));
  return kandidaten.find((p) => fs.existsSync(p)) || null;
}

function pruefen(parser, text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-publiccode-'));
  try {
    fs.writeFileSync(path.join(dir, 'publiccode.yml'), text);
    const r = spawnSync(parser, ['-no-network', 'publiccode.yml'], { cwd: dir, encoding: 'utf8' });
    return { status: r.status, fehler: (r.stdout + r.stderr).split('\n').filter((z) => /: error: /.test(z)) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const PARSER = parserFinden();
const SKIP = PARSER ? false : 'übersprungen: publiccode-parser ' + FASSUNG + ' nicht installiert';

test('[publiccode·offizieller Parser] der Workflow pinnt dieselbe Fassung wie diese Probe', () => {
  const wf = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'publiccode-pruefen.yml'), 'utf8');
  assert.match(wf, new RegExp('publiccode-parser@' + FASSUNG.replace(/\./g, '\\.')));
});

test('[publiccode·offizieller Parser] publiccode.yml besteht ohne Fehler; Rot-Beweis: die Fassung vom 25.09.2026 fällt mit den zwei Fehlern des öffentlichen Laufs', { skip: SKIP }, () => {
  const r = pruefen(PARSER, fs.readFileSync(path.join(REPO, 'publiccode.yml'), 'utf8'));
  assert.deepEqual(r.fehler, []);
  assert.equal(r.status, 0);
  const alt = pruefen(PARSER, fs.readFileSync(path.join(__dirname, 'fixtures', 'publiccode', 'publiccode-81feab8.yml'), 'utf8'));
  assert.equal(alt.status, 1);
  assert.equal(alt.fehler.length, 2, JSON.stringify(alt.fehler));
  assert.ok(alt.fehler.some((z) => /categories\[2\] must be a valid category/.test(z)));
  assert.ok(alt.fehler.some((z) => /shortDescription must be a maximum of 150 characters/.test(z)));
});
