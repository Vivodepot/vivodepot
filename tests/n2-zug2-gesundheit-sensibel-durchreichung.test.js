'use strict';
/* ════════════════════════════════════════════════════════════════════════
   N2 Zug 2 („Drei Verdrahtungen", 08.08.2026) — der
   Gesundheits-FHIR-Export ehrt den Sensibel-Opt-in
   ────────────────────────────────────────────────────────────────────────
   ZWEI Fehler waren zu prüfen, GEMESSEN unterschiedlich schwer:
     (b) — DER GEMESSENE, ALLEINIGE ROOT CAUSE DES LECKS: `fhirIpsBundle` las
         `data.sektoren.gesundheit` roh, ohne den `feldIstSensibel`-Pfad, den
         `_bereichSektionenModell` (das Muster für alle anderen Export-Flows)
         geht. Wer im Auswahl-Dialog eine Sektion NICHT ankreuzte, bekam sie
         trotzdem — bei einem Bereich, dessen Felder durchgehend Artikel 9
         DSGVO sind. Diese Hälfte allein erklärt den vollen Befund und ist
         hier vollständig mit Regel-18-Beleg geschlossen.
     (a) — `flowGesundheitFhirExport`s `aufFortfahren`-Lambda verwarf das von
         `exportAuswahlEphemerAnwenden` übergebene `{sensibel:false}`. Der
         Fix ist trotzdem richtig (er hält den API-Vertrag ein, den
         `export-durchgang.test.js` Test 27 für JEDEN `aufFortfahren`-Aufrufer
         verlangt) — aber GEMESSEN (nicht angenommen, ein erster Browser-Test
         wurde gebaut, real gegen einen Mutanten gefahren und WIDERLEGT sich
         selbst): sein aktueller Effekt auf DIESEN Export ist redundant,
         weil `exportAuswahlEphemerAnwenden` den Ein-/Ausschluss je Feld
         bereits VOR dem Aufruf von `aufFortfahren` über die ephemere
         `sensibelFeldSetzen`-Markierung setzt — dieselbe Markierung, die
         Hälfte (b) prüft. `opt.sensibel` würde erst dann beobachtbar
         unterschiedlich wirken, wenn ein Gesundheitsfeld `feld.sensibel:
         true` im SCHEMA trüge (heute: keins, s. N1/W-3, 0 von 164) — dann
         überstimmt NUR `opt.sensibel:true` diese Schema-Sperre, die
         Ephemer-Markierung kann es nicht. Kein Browser-Test für Hälfte (a)
         in dieser Sitzung, weil er nichts geprüft hätte, was er nicht
         bereits als falsch-grün erwiesen hatte — ein Test, der nicht
         unterscheiden kann, ist kein Beleg.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'n2-zug2-pw';

async function mitZurueckgehaltenerAllergie() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  V.sensibelFeldSetzen('health', 'allergiesMedicationFoodOther', true);   // vom Opt-in-Dialog "nicht angekreuzt"
  return V;
}

test('[N2·Zug2] fhirIpsBundle(jetzt, {sensibel:false}) lässt eine zurückgehaltene Sektion leer', async () => {
  const V = await mitZurueckgehaltenerAllergie();
  const comp = V.fhirIpsBundle(new Date(), { sensibel: false }).entry[0].resource;
  const allerg = comp.section.find((s) => s.code.coding[0].code === '48765-2');
  assert.ok(!allerg.entry, 'zurückgehaltenes Feld darf NICHT im Ergebnis auftauchen');
  assert.ok(allerg.emptyReason, 'Sektion trägt stattdessen ehrlich emptyReason');
});

test('[N2·Zug2] fhirIpsBundle(jetzt, {sensibel:true}) gibt dieselbe Sektion frei (Positivmaßstab)', async () => {
  const V = await mitZurueckgehaltenerAllergie();
  const comp = V.fhirIpsBundle(new Date(), { sensibel: true }).entry[0].resource;
  const allerg = comp.section.find((s) => s.code.coding[0].code === '48765-2');
  assert.ok(allerg.entry && allerg.entry.length === 1, 'mit aktivem Opt-in erscheint das Feld');
});

test('[N2·Zug2] ohne opt.sensibel (Default) bleibt eine markierte Sektion zurückgehalten', async () => {
  const V = await mitZurueckgehaltenerAllergie();
  const comp = V.fhirIpsBundle(new Date()).entry[0].resource;   // kein zweiter Parameter
  const allerg = comp.section.find((s) => s.code.coding[0].code === '48765-2');
  assert.ok(!allerg.entry, 'Default ist datensparsam — kein stilles "trotzdem alles"');
});

test('[N2·Zug2] die anderen vier Gesundheitsfelder (medikamente/krankheiten/voroperationen/implantate) sind ebenso gegated', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ibuprofen' }]);
  V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Asthma' }]);
  V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Blinddarm', year: '2010' });
  V.sektorFeldSetzen('health', 'implantsProsthesesPacemakers', 'Hüft-TEP');
  for (const f of ['medicationOngoing', 'chronicConditionsDiagnoses', 'operationsProcedures', 'implantsProsthesesPacemakers']) V.sensibelFeldSetzen('health', f, true);
  const comp = V.fhirIpsBundle(new Date(), { sensibel: false }).entry[0].resource;
  for (const code of ['10160-0', '11450-4', '47519-4', '46264-8']) {
    const s = comp.section.find((sek) => sek.code.coding[0].code === code);
    assert.ok(!s.entry, code + ': zurückgehaltenes Feld darf nicht erscheinen');
    assert.ok(s.emptyReason, code + ': trägt stattdessen emptyReason');
  }
});

/* ── Rotmachbarkeit (Regel 18) ─────────────────────────────────────────────
   Nur Hälfte (b) — der gemessene Root Cause — bekommt hier eine Mutations-
   probe. Ein Browser-Test für Hälfte (a) wurde gebaut und gegen einen echten
   Mutanten gefahren (KERN_HTML_PATH auf eine Kopie mit der alten Lambda) —
   und blieb GRÜN, weil `exportAuswahlEphemerAnwenden` den Ein-/Ausschluss
   je Feld bereits VOR dem `aufFortfahren`-Aufruf über die ephemere
   `sensibelFeldSetzen`-Markierung setzt, die Hälfte (b) ohnehin prüft — der
   Test hätte nichts bewiesen, was er nicht selbst als falsch-grün erwiesen
   hatte, s. Kopf dieser Datei. Kein Test ist ehrlicher als ein Test, der
   nicht unterscheiden kann. */
test('[N2·Zug2·Rotmachbarkeit] ohne den Sensibel-Gate im Builder fällt der Mutant durch diese Probe', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const cp = require('node:child_process');
  const KERN = path.join(__dirname, '..', 'vivodepot.html');
  const src = fs.readFileSync(KERN, 'utf8');
  const anker = "const g = {};\n  for (const feldId of ['allergiesMedicationFoodOther', 'medicationOngoing', 'chronicConditionsDiagnoses', 'operationsProcedures', 'implantsProsthesesPacemakers']) {\n    if (!inklSensibel && feldIstSensibel(feldDefFuer('health', feldId), 'health')) continue;\n    g[feldId] = gRoh[feldId];\n  }";
  assert.ok(src.includes(anker), 'Anker des Sensibel-Gates gefunden (sonst umbenannt)');
  const mutantSrc = src.replace(anker, 'const g = gRoh;   // GEPFLANZT: kein Sensibel-Gate mehr');
  const mutantDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-n2-zug2-gate-mutant-'));
  const mutant = path.join(mutantDir, 'kern-n2-zug2-gate-mutant.html');
  fs.writeFileSync(mutant, mutantSrc, 'utf8');
  const probeSkript = path.join(__dirname, '..', 'tools', '_n2-zug2-sensibel-probe.js');
  try {
    const r = cp.spawnSync(process.execPath, [probeSkript], {
      env: Object.assign({}, process.env, { KERN_HTML_PATH: mutant }),
      encoding: 'utf8',
    });
    assert.equal(r.status, 1, 'Mutant (kein Sensibel-Gate im Builder) muss die Probe ROT machen. stdout: ' + r.stdout + ' stderr: ' + r.stderr);
  } finally {
    fs.rmSync(mutantDir, { recursive: true, force: true });
  }
});

test('[N2·Zug2·Rotmachbarkeit] dieselbe Probe gegen den ECHTEN Kern läuft grün', () => {
  const path = require('node:path');
  const cp = require('node:child_process');
  const probeSkript = path.join(__dirname, '..', 'tools', '_n2-zug2-sensibel-probe.js');
  const r = cp.spawnSync(process.execPath, [probeSkript], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'Positivkontrolle: gegen den echten Kern muss dieselbe Probe grün laufen. stdout: ' + r.stdout + ' stderr: ' + r.stderr);
});
