'use strict';
/* ═══════════════════════════════════════════════════════════
   argon2-messen — crypto.argon2Sync gegen RFC 9106, Kosten ohne fremde Bibliothek (25.10.2026)
   ───────────────────────────────────────────────────────────
   Gehalten wird: Node trifft die drei Testvektoren aus RFC 9106 §5 (tests/fixtures/rfc9106-testvektoren.json); das Werkzeug
   meldet einen verfehlten Vektor mit Exit 1 und misst dann nichts; --messen ohne Klein-Platz hält mit Exit 2 an und nennt den
   fehlenden Platz; das Messergebnis hat je Profil Median, Spanne und Speicherzuwachs. Das Werkzeug lädt keine Abhängigkeit.
   ROT-BEWEIS: eine Vektordatei mit einem veränderten Tag und eine falsch rechnende argon2-Funktion fallen beide auf.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const A = require('../tools/argon2-messen.js');

const still = { schreiben: () => {}, fehler: () => {} };

test('[Argon2·RFC] crypto.argon2Sync trifft die drei Vektoren aus RFC 9106 §5', () => {
  const r = A.vektorenPruefen();
  assert.equal(r.fehlt, null);
  assert.deepEqual(r.faelle.map((f) => f.name), ['RFC 9106 §5.1 argon2d', 'RFC 9106 §5.2 argon2i', 'RFC 9106 §5.3 argon2id']);
  assert.ok(r.ok, JSON.stringify(r.faelle.filter((f) => !f.getroffen)));
  assert.equal(A.main([], { ...still, env: {} }), 0);
});

test('[Argon2·RFC·Rot-Beweis] ein veränderter Tag und eine falsch rechnende Funktion fallen auf, und es wird nichts gemessen', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'argon2-messen-'));
  try {
    const d = JSON.parse(fs.readFileSync(A.STANDARD_VEKTOREN, 'utf8'));
    const t = d.vektoren[2].tag;
    d.vektoren[2].tag = (t[0] === '0' ? '1' : '0') + t.slice(1);
    const datei = path.join(dir, 'vektoren.json');
    fs.writeFileSync(datei, JSON.stringify(d));
    const r = A.vektorenPruefen({ vektorDatei: datei });
    assert.equal(r.ok, false);
    assert.deepEqual(r.faelle.filter((f) => !f.getroffen).map((f) => f.name), ['RFC 9106 §5.3 argon2id']);
    let fehler = '';
    assert.equal(A.main(['--vektoren', datei, '--messen'], { schreiben: () => {}, fehler: (x) => { fehler += x; }, env: { VD_KLEIN_GEHALTEN: 'probe' } }), 1);
    assert.match(fehler, /verfehlt/);
    const falsch = (v, o) => Buffer.alloc(o.tagLength, 0);
    assert.equal(A.vektorenPruefen({ argon2: falsch }).ok, false);
    assert.equal(A.vektorenPruefen({ argon2: null }).ok, false, 'ohne argon2Sync kein Bestehen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Argon2·Messen] ohne Klein-Platz hält --messen an und nennt den fehlenden Platz; im Platz liefert es je Profil Median und Spanne', () => {
  let fehler = '';
  assert.equal(A.main(['--messen'], { schreiben: () => {}, fehler: (x) => { fehler += x; }, env: {} }), 2);
  assert.match(fehler, /Klein-Platz \(VD_KLEIN_GEHALTEN fehlt\)[\s\S]*node tools\/argon2-messen\.js --messen/);
  const e = A.messen({ profile: [{ name: 'winzig', speicherKiB: 64, durchlaeufe: 1, parallelitaet: 1 }], laeufe: 3 });
  assert.equal(e.profile.length, 1);
  const p = e.profile[0];
  assert.equal(p.name, 'winzig');
  for (const k of ['medianMs', 'minMs', 'maxMs', 'rssZuwachsMiB']) assert.equal(typeof p[k], 'number', k);
  assert.ok(p.minMs <= p.medianMs && p.medianMs <= p.maxMs);
  assert.equal(typeof e.lastBeimStart, 'number');
  assert.deepEqual(A.PROFILE.map((x) => [x.speicherKiB, x.durchlaeufe, x.parallelitaet]), [[19 * 1024, 2, 1], [64 * 1024, 3, 4]], 'Profile wie in U2-ADR-213');
});

test('[Argon2·ohne Abhängigkeit] das Werkzeug lädt nur Node-Module und Repo-Bibliotheken', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'tools', 'argon2-messen.js'), 'utf8');
  const geladen = [...quelle.matchAll(/require\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
  assert.ok(geladen.length > 0);
  for (const m of geladen) assert.ok(m.startsWith('node:') || m.startsWith('./'), 'fremd geladen: ' + m);
});
