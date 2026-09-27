'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die async-Falle ist laut — Selbstkontrolle der Wache (Posten 41)
   ────────────────────────────────────────────────────────────────────────
   DER ANLASS (27.07.2026). Eine Messung rief `subDepotEntsiegeln` — async —
   in einem `try/catch` OHNE `await`. Der Aufruf gibt ein Promise zurück und
   wirft nicht; das `catch` fing nichts. Gemeldet wurde „lesbar ohne Passwort
   — Bruch": ein Krypto-Bruch, den es nicht gibt.

   Aufgefallen ist es, weil die unbehandelte Ablehnung das Skript abbrach —
   Zufall, kein Mechanismus. Hätte das Skript danach noch etwas ausgegeben,
   wäre die Falschmeldung stehen geblieben und als Sicherheitsaussage
   weitergewandert.

   GEMESSEN: `node --test` faengt es bereits (die DATEI faellt, auch wenn der
   einzelne Test gruen durchlaeuft). `tools/` und `scripts/` haben null solche
   Aufrufe. Ungeschuetzt waren allein die Ad-hoc-Messungen — und deren
   gemeinsamer Engpass ist `ladeKern()`.

   Dieser Test prueft die WACHE, nicht den Kern: ohne ihn waere sie eine
   Zeile, von der niemand weiss, ob sie noch feuert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const lauf = (js) => {
  try {
    return { code: 0, aus: execFileSync(process.execPath, ['-e', js], { cwd: REPO, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { code: e.status || 1, aus: String(e.stdout || '') + String(e.stderr || '') };
  }
};

test('[Async-Wache·Positivkontrolle] ein async-Aufruf ohne await faellt auf', () => {
  // Genau der Fall vom 27.07.: try/catch um einen nicht-awaiteten Aufruf.
  const r = lauf(`require('./tests/load-kern.js');
    try { Promise.reject(new Error('stiller Fehlschlag')); } catch (_) {}
    setTimeout(() => console.log('STILL-DURCHGELAUFEN'), 50);`);
  assert.notEqual(r.code, 0, 'der Lauf MUSS scheitern — sonst meldet eine Messung Erfolg, wo etwas warf');
  assert.match(r.aus, /UNBEHANDELTE PROMISE-ABLEHNUNG/, 'und zwar mit der erklaerenden Meldung');
  assert.doesNotMatch(r.aus, /STILL-DURCHGELAUFEN/, 'das Skript darf nicht weiterlaufen');
});

test('[Async-Wache·Negativkontrolle] eine sauber gefangene Ablehnung stoert NICHT', () => {
  // Ohne sie belegte die Positivkontrolle nur, dass die Wache feuert — nicht,
  // dass sie unterscheidet. Eine Wache, die jedes Promise anschlaegt, waere
  // dort ebenso gruen und hier unbrauchbar (§3.5d).
  const r = lauf(`require('./tests/load-kern.js');
    Promise.reject(new Error('x')).catch(() => console.log('SAUBER-GEFANGEN'));`);
  assert.equal(r.code, 0, 'korrekt behandelte Ablehnungen duerfen keinen Abbruch erzeugen');
  assert.match(r.aus, /SAUBER-GEFANGEN/);
});

test('[Async-Wache] der Abschalter ist da, damit die Wache pruefbar bleibt', () => {
  const r = lauf(`process.env.KERN_KEINE_REJECTION_WACHE = '1';
    require('./tests/load-kern.js');
    console.log('OHNE-WACHE:' + !process.__vdRejectionWache);`);
  assert.match(r.aus, /OHNE-WACHE:true/,
    'ohne Abschalter liesse sich nicht messen, dass die Wache den Unterschied macht');
});
