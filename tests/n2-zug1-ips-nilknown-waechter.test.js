'use strict';
/* ════════════════════════════════════════════════════════════════════════
   N2 Zug 1 („Drei Verdrahtungen", 08.08.2026) — kein `nilknown`
   ohne ausdrückliche Angabe
   ────────────────────────────────────────────────────────────────────────
   `nilknown` im list-empty-reason-CodeSystem behauptet eine GEPRÜFTE,
   bestätigte Abwesenheit („die Prüfung fand statt, es gibt nachweislich
   keine"). Ein einfach unausgefülltes Feld ist das nicht — die Bürgerin
   wurde nie ausdrücklich gefragt. Diese Probe stellt für ALLE FÜNF
   IPS-Pflichtsektionen sicher, dass eine leere Sektion NIEMALS `nilknown`
   trägt, solange es kein Feld gibt, mit dem die Bürgerin „ausdrücklich
   keine [X]" bestätigen kann (heute: keins, s. Bericht/ADR — genau darum
   ist der Wächter eine Nulltoleranz-Prüfung, keine Grundlinie).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'n2-zug1-pw';
const JETZT = new Date('2026-08-09T10:00:00Z');

test('[N2·Zug1] alle fünf leeren IPS-Sektionen tragen `notasked`, nie `nilknown`', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  // Kein Gesundheitsfeld gefüllt → alle fünf Sektionen leer.
  const comp = V.fhirIpsBundle(JETZT).entry[0].resource;
  const leereSektionen = comp.section.filter((s) => s.emptyReason);
  assert.equal(leereSektionen.length, 5, 'Aufbau: alle fünf Pflichtsektionen sind leer');
  for (const s of leereSektionen) {
    const code = s.emptyReason.coding[0].code;
    assert.notEqual(code, 'nilknown',
      `Sektion "${s.title}" behauptet mit 'nilknown' eine geprüfte, bestätigte Abwesenheit — `
      + 'es gibt aber kein Feld, mit dem die Bürgerin das ausdrücklich bestätigen konnte.');
    assert.equal(code, 'notasked', `Sektion "${s.title}" trägt einen unerwarteten emptyReason-Code: ${code}`);
  }
});

test('[N2·Zug1] eine gefüllte Sektion trägt kein emptyReason (Positivmaßstab)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  // N4 (09.08.2026): `allergien` ist seit N4 Zug 1 schema-sensibel — Opt-in, die Probe gilt dem emptyReason.
  const comp = V.fhirIpsBundle(JETZT, { sensibel: true }).entry[0].resource;
  const allergien = comp.section.find((s) => s.code.coding[0].code === '48765-2');
  assert.ok(!allergien.emptyReason, 'gefüllte Sektion trägt kein emptyReason');
  assert.ok(allergien.entry && allergien.entry.length === 1);
});

/* ── Rotmachbarkeit (Regel 18) — real gepflanzt, real rot, real zurückgebaut ── */
test('[N2·Zug1·Rotmachbarkeit] der alte Zustand (nilknown fest verdrahtet) fällt durch diese Probe', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const cp = require('node:child_process');
  const KERN = path.join(__dirname, '..', 'vivodepot.html');
  const src = fs.readFileSync(KERN, 'utf8');
  const anker = "code: 'notasked', display: 'Not Asked' }], text: leerText };";
  assert.ok(src.includes(anker), 'Anker der notasked-Verdrahtung gefunden (sonst umbenannt)');
  const mutantSrc = src.replace(anker, "code: 'nilknown', display: 'Nil Known' }], text: leerText };");
  const mutantDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-n2-zug1-nilknown-mutant-'));
  const mutant = path.join(mutantDir, 'kern-n2-zug1-nilknown-mutant.html');
  fs.writeFileSync(mutant, mutantSrc, 'utf8');
  const probeSkript = path.join(__dirname, '..', 'tools', '_n2-zug1-nilknown-probe.js');
  try {
    const r = cp.spawnSync(process.execPath, [probeSkript], {
      env: Object.assign({}, process.env, { KERN_HTML_PATH: mutant }),
      encoding: 'utf8',
    });
    assert.equal(r.status, 1, 'Mutant (alter nilknown-Zustand) muss die Probe ROT machen. stdout: ' + r.stdout + ' stderr: ' + r.stderr);
  } finally {
    fs.rmSync(mutantDir, { recursive: true, force: true });
  }
});

test('[N2·Zug1·Rotmachbarkeit] dieselbe Probe gegen den ECHTEN Kern läuft grün', () => {
  const path = require('node:path');
  const cp = require('node:child_process');
  const probeSkript = path.join(__dirname, '..', 'tools', '_n2-zug1-nilknown-probe.js');
  const r = cp.spawnSync(process.execPath, [probeSkript], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'Positivkontrolle: gegen den echten Kern muss dieselbe Probe grün laufen. stdout: ' + r.stdout + ' stderr: ' + r.stderr);
});
