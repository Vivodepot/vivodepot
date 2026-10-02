'use strict';
/* csp-hashes-cross-repo-abgleich.test.js — derselbe Abgleich wie produkt-text-erzeugen-cross-repo-abgleich.test.js,
   für den CSP_HASHES-Abschnitt (01.10.2026).
   ────────────────────────────────────────────────────────────────────────────
   tests/csp-hashes-abschnitt.test.js pinnt die sha256 des Abschnitts, das Gateway pinnt dieselbe Zahl — jeder gegen
   sich selbst. Das hält eine Drift nur auf, solange beide Pins wortgleich nachgezogen werden. Diese Probe liest den
   Abschnitt so, wie Gateway-main ihn ausliefert (`git show origin/main:src/csp-hashes.js`), und vergleicht ihn mit dem
   ECHTEN Abschnitt in tools/lib/csp-hashes.js. Kein Pin, keine zweite Wahrheit.

   Anlass: die Gateway-Kopie war live, bevor das Original im Kanon stand — die Kopie war dem Original voraus, und keine
   Probe auf dieser Seite hat es gesehen.

   Fehlt das Schwesterrepo oder sein origin/main (CI, frischer Checkout), bleibt der Abgleich UNGEMESSEN (t.skip),
   nicht still grün. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { schwesterRepoPfad } = require('../tools/lib/schwester-repo.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const BEGIN = '/* ==CSP_HASHES:BEGIN== */';
const ENDE = '/* ==CSP_HASHES:END== */';
const EIGENE_DATEI = path.join(__dirname, '..', 'tools', 'lib', 'csp-hashes.js');
const SCHWESTERREPO = schwesterRepoPfad('vivodepot-download-gateway', { envName: 'VIVODEPOT_GATEWAY_REPO' });

function abschnitt(text) {
  const a = text.indexOf(BEGIN);
  const e = text.indexOf(ENDE);
  if (a < 0 || e < 0 || e < a) throw new Error('CSP_HASHES-Marker fehlen/beschädigt — nicht raten, nachsehen.');
  return text.slice(a + BEGIN.length, e);
}

// Der Abschnitt so, wie Gateway-main ihn trägt — null, wenn Schwesterrepo oder origin/main hier fehlen.
function schwesterAbschnittVonMain() {
  if (!fs.existsSync(path.join(SCHWESTERREPO, '.git'))) return null;
  let text;
  try {
    text = execFileSync('git', ['show', 'origin/main:src/csp-hashes.js'],
      { cwd: SCHWESTERREPO, env: ohneGitUmgebung(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { return null; }
  return abschnitt(text);
}

test('[CSP-Hashes·Cross-Repo] der eigene Abschnitt ist byte-gleich mit dem Abschnitt auf Gateway-main', (t) => {
  const fremd = schwesterAbschnittVonMain();
  if (fremd === null) {
    t.skip('UNGEMESSEN — Schwesterrepo oder sein origin/main nicht lokal vorhanden (' + SCHWESTERREPO + '); '
      + 'zählt NICHT als bestanden.');
    return;
  }
  assert.equal(abschnitt(fs.readFileSync(EIGENE_DATEI, 'utf8')), fremd,
    'tools/lib/csp-hashes.js und src/csp-hashes.js auf Gateway-main sind NICHT byte-gleich — der eine wird dem '
    + 'anderen byte-für-byte nachgezogen, samt gepinnter Prüfsumme in BEIDEN Repositorien.');
});

test('[CSP-Hashes·Cross-Repo·Rot-Beweis] eine echte Abweichung wird erkannt', () => {
  const eigen = abschnitt(fs.readFileSync(EIGENE_DATEI, 'utf8'));
  const veraendert = eigen.replace("'sha256-", "'sha384-");
  assert.notEqual(veraendert, eigen, 'Testvoraussetzung: die Ersetzung muss greifen');
  assert.notEqual(abschnitt(BEGIN + veraendert + ENDE), eigen);
});

test('[CSP-Hashes·Cross-Repo·Gegenprobe] identischer Inhalt vergleicht gleich', () => {
  const eigen = abschnitt(fs.readFileSync(EIGENE_DATEI, 'utf8'));
  assert.equal(abschnitt('// Hülle\n' + BEGIN + eigen + ENDE + '\nexport {};\n'), eigen);
});
