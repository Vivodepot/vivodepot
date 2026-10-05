'use strict';
/* unterzeichnende-wechsel.test.js — mehrere Unterzeichnende, Schlüsselwechsel ohne Bruch alter Tags (03.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Signaturkette Option A: der Release-Schlüssel wechselt von ED25519 (Datei) zu ECDSA P-256 (Secure Enclave), und
   weitere Personen sollen ohne Umbau hinzukommen. Die Liste der Unterzeichnenden (vivodepot.de/.well-known/
   vivodepot-allowed-signers) trägt dann je Schlüssel eine Zeile; `valid-before`/`valid-after` (man ssh-keygen,
   ALLOWED SIGNERS) begrenzen, wann er gilt, und git prüft gegen den Zeitpunkt der Signatur („Git will mark signatures
   as valid if the signing key was valid at the time of the signature’s creation“, git-config gpg.ssh.allowedSignersFile).
   Diese Probe belegt das mit `ssh-keygen -Y verify -O verify-time=…` und Wegwerf-Schlüsseln aus dem Temp:
     · der alte Schlüssel trägt bis zum Wechsel, danach nicht mehr — ein altes Tag bleibt prüfbar;
     · der neue trägt ab dem Wechsel, davor nicht;
     · eine zweite Person ist eine weitere Zeile mit eigenem Prinzipal; ihr Widerruf (gpg.ssh.revocationFile,
       Liste widerrufener öffentlicher Schlüssel) trifft nur sie.
   Kein echter Schlüssel wird gelesen; die Datei hält tools/allowed-signers-pruefen.js für gut. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { pruefen } = require('../tools/allowed-signers-pruefen.js');

const TAGGER = 'dev@vivodepot.de';
const ZWEITE = 'zweite@vivodepot.de';
const WECHSEL = '20261010';

function mitTemp(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'unterzeichnende-'));
  try { return fn(tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
function schluessel(tmp, name, typ) {
  const p = path.join(tmp, name);
  execFileSync('ssh-keygen', ['-q', '-t', typ, '-N', '', '-C', name, '-f', p], { stdio: 'pipe' });
  return { privat: p, oeffentlich: fs.readFileSync(p + '.pub', 'utf8').trim().split(' ').slice(0, 2).join(' ') };
}
function signieren(tmp, k, text) {
  const d = path.join(tmp, 'nachricht-' + path.basename(k.privat));
  fs.writeFileSync(d, text);
  execFileSync('ssh-keygen', ['-Y', 'sign', '-f', k.privat, '-n', 'git', d], { stdio: 'pipe' });
  return { datei: d, sig: d + '.sig' };
}
function gilt(tmp, liste, prinzipal, s, zeit, widerruf) {
  const f = path.join(tmp, 'allowed_signers');
  fs.writeFileSync(f, liste);
  const args = ['-Y', 'verify', '-f', f, '-I', prinzipal, '-n', 'git', '-s', s.sig, '-O', 'verify-time=' + zeit];
  if (widerruf) { const r = path.join(tmp, 'widerrufen'); fs.writeFileSync(r, widerruf + '\n'); args.push('-r', r); }
  return spawnSync('ssh-keygen', args, { input: fs.readFileSync(s.datei) }).status === 0;
}

test('[Unterzeichnende] Wechsel ED25519 → P-256: alte Signaturen bleiben gültig, der neue Schlüssel gilt erst ab dem Wechsel', () => mitTemp((tmp) => {
  const alt = schluessel(tmp, 'alt', 'ed25519');
  const neu = schluessel(tmp, 'neu', 'ecdsa');
  const liste = `${TAGGER} namespaces="git",valid-before="${WECHSEL}" ${alt.oeffentlich}\n${TAGGER} namespaces="git",valid-after="${WECHSEL}" ${neu.oeffentlich}\n`;
  assert.deepEqual(pruefen(liste, { prinzipal: TAGGER }), []);
  const sAlt = signieren(tmp, alt, 'v1.0.857');
  const sNeu = signieren(tmp, neu, 'v1.0.920');
  assert.equal(gilt(tmp, liste, TAGGER, sAlt, '20261002'), true, 'altes Tag vor dem Wechsel: gültig');
  assert.equal(gilt(tmp, liste, TAGGER, sNeu, '20261020'), true, 'neues Tag nach dem Wechsel: gültig');
  assert.equal(gilt(tmp, liste, TAGGER, sAlt, '20261020'), false, 'Rot-Beweis: der alte Schlüssel trägt nach dem Wechsel nicht mehr');
  assert.equal(gilt(tmp, liste, TAGGER, sNeu, '20261002'), false, 'Rot-Beweis: der neue Schlüssel trägt vor dem Wechsel nicht');
}));

test('[Unterzeichnende·Rot-Beweis] eine zweite Person ist eine eigene Zeile; ihr Widerruf trifft nur sie', () => mitTemp((tmp) => {
  const eins = schluessel(tmp, 'eins', 'ecdsa');
  const zwei = schluessel(tmp, 'zwei', 'ecdsa');
  const liste = `${TAGGER} namespaces="git" ${eins.oeffentlich}\n${ZWEITE} namespaces="git" ${zwei.oeffentlich}\n`;
  const s1 = signieren(tmp, eins, 'a');
  const s2 = signieren(tmp, zwei, 'b');
  assert.equal(gilt(tmp, liste, TAGGER, s1, '20261020'), true);
  assert.equal(gilt(tmp, liste, ZWEITE, s2, '20261020'), true);
  assert.equal(gilt(tmp, liste, TAGGER, s2, '20261020'), false, 'die Signatur der zweiten Person gilt nicht unter dem Prinzipal der ersten');
  assert.equal(gilt(tmp, liste, ZWEITE, s2, '20261020', zwei.oeffentlich), false, 'widerrufen: fällt');
  assert.equal(gilt(tmp, liste, TAGGER, s1, '20261020', zwei.oeffentlich), true, 'der Widerruf der zweiten trifft die erste nicht');
}));
