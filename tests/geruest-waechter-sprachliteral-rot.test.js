'use strict';
/* Ein deutsches Literal in einem sichtbaren Zweig des Kerns macht den Gerüst-Wächter rot.

   Vorbeugung zu Code-Review 16.09.2026 (Sprachleck ae0f75b2), Befund L1 (HOCH): `modulKarteStatus` trug in mehreren
   Rückgabe-Zweigen festen deutschen Text, der in den englischen Produkten sichtbar war. Die Klasse — sichtbarer Text
   als Literal im Gerüst statt aus dem Textsatz — bewacht `tools/geruest-waechter-pruefen.js` mit dem Eimer `satz`,
   für den es keine Ausnahme gibt. Diese Probe hält das am echten Kern fest: ein gepflanzter Satz und ein
   großgeschriebenes Einzelwort in `modulKarteStatus` machen den Wächter rot; der unveränderte Kern ist grün.

   Grenze (gemessen 03.11.2026): ein KLEINGESCHRIEBENES Einzelwort (`'erteilt'`) fällt in den Eimer `struktur`, der sich
   mit einem Grund anheben lässt. Diese Lücke liegt bei der Regel des Wächters, nicht hier. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const WAECHTER = path.join(REPO, 'tools', 'geruest-waechter-pruefen.js');
const ANKER = 'function modulKarteStatus(m) {\n';

function waechterGegen(text) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geruest-l1-'));
  const datei = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(datei, text);
  try {
    const r = spawnSync(process.execPath, [WAECHTER, '--datei', datei], { cwd: REPO, encoding: 'utf8' });
    return { status: r.status, ausgabe: (r.stdout || '') + (r.stderr || '') };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

function gepflanzt(literal) {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(kern.split(ANKER).length, 2, 'Anker trifft nicht genau einmal');
  return kern.replace(ANKER, ANKER + "  if (globalThis.__probeL1) return { text: '" + literal + "', klasse: 'offen' };\n");
}

test('[L1·Gegenprobe] der unveränderte Kern ist für den Gerüst-Wächter grün', () => {
  const r = waechterGegen(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
  assert.equal(r.status, 0, r.ausgabe);
});

for (const literal of ['Noch nicht erteilt', 'Erteilt']) {
  test('[L1·Rot-Beweis] ein gepflanztes Literal „' + literal + '“ in modulKarteStatus macht den Eimer satz rot', () => {
    const r = waechterGegen(gepflanzt(literal));
    assert.notEqual(r.status, 0, 'der Wächter bleibt grün: ' + r.ausgabe.slice(-400));
    assert.match(r.ausgabe, /eimer\.satz/);
  });
}
