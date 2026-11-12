'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Anamnese-Assistent gestrichen (C14, Assistenten-Urteil W03/W04,
   07.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Assistent `anamwiz` ist gestrichen. Seine Felder bleiben im Bereich
   „Gesundheit“ und werden dort direkt ausgefüllt. Die ID bleibt in
   WIZARD_IDS_EINGEBAUT reserviert, damit kein Modul sie neu belegt.
   Rot-Beweis: eine gebackene Kopie mit anamwiz in der Wizard-Quelle und in
   der Bereichsvorlage zeigt den Startknopf wieder.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, _standardProduktBaken } = require('./load-kern.js');

async function bereichsseiteHealth(k) {
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  k.V.betreteApp();
  k.V.oeffneSektor('health');
  return k.document.getElementById('content').innerHTML;
}

test('[C14·anamwiz] gestrichen: nicht registriert, kein Startknopf, Felder bleiben, ID reserviert', async () => {
  const k = ladeKern();
  const { V } = k;
  assert.equal(V.WIZARD_BY_ID.anamwiz, undefined, 'anamwiz nicht in WIZARD_BY_ID');
  assert.ok(!V.WIZARDS.some((w) => w.id === 'anamwiz'), 'anamwiz nicht in WIZARDS');
  assert.ok(!(V.SEKTOR_BY_ID.health.wizards || []).includes('anamwiz'), 'nicht in der Bereichsvorlage health');
  assert.ok(V.WIZARD_IDS_EINGEBAUT.includes('anamwiz'), 'die ID bleibt reserviert');
  const ids = V.SEKTOR_BY_ID.health.sektionen.flatMap((s) => s.felder || []).map((f) => f.id);
  for (const id of ['chronicConditionsDiagnoses', 'operationsProcedures', 'familyMedicalHistory']) {
    assert.ok(ids.includes(id), 'Feld bleibt im Bereich health: ' + id);
  }
  const html = await bereichsseiteHealth(k);
  assert.ok(html.includes('data-wizard-start="pflwiz"'), 'Vorbedingung: die Seite rendert Startknöpfe');
  assert.ok(!html.includes('data-wizard-start="anamwiz"'), 'kein Startknopf für anamwiz');
});

function tauscheQuelle(gebacken, anker, aendern) {
  const kopf = '/* ' + anker + ':BEGIN */\nconst ' + anker + ' = ';
  const i = gebacken.indexOf(kopf);
  assert.ok(i >= 0, 'Anker ' + anker);
  const start = i + kopf.length;
  const ende = gebacken.indexOf(';\n/* ' + anker + ':END */', start);
  const quellen = JSON.parse(gebacken.slice(start, ende));
  aendern(quellen);
  return gebacken.slice(0, start) + JSON.stringify(quellen) + gebacken.slice(ende);
}

test('[C14·anamwiz·Rot-Beweis] mit anamwiz in Quelle und Bereichsvorlage erscheint der Startknopf', async () => {
  let gebacken = _standardProduktBaken(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
  gebacken = tauscheQuelle(gebacken, 'AB_WERK_WIZARD_QUELLEN', (q) => {
    const mod = q.find((m) => m && m.wizards && m.wizards.gebwiz);
    assert.ok(mod, 'Vorbedingung: Wizard-Quelle gefunden');
    mod.wizards.anamwiz = { icon: 'stethoscope', ziel: { sektor: 'health' },
      schritte: [{ feld: { id: 'chronicConditionsDiagnoses', typ: 'text' } }], abschluss: {} };
  });
  let getroffen = 0;
  gebacken = tauscheQuelle(gebacken, 'AB_WERK_BEREICH_QUELLEN', (q) => {
    for (const m of q) for (const b of Object.values(m.bereiche || {})) {
      if (b.id === 'health') { b.wizards = (b.wizards || []).concat('anamwiz'); getroffen++; }
    }
  });
  assert.equal(getroffen, 1, 'Vorbedingung: Bereichsvorlage health gefunden');
  const tmp = path.join(os.tmpdir(), 'anamwiz-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, gebacken);
  try {
    const k = ladeKern({ htmlPfad: tmp });
    assert.ok(k.V.WIZARD_BY_ID.anamwiz, 'in der Kopie registriert');
    assert.ok((await bereichsseiteHealth(k)).includes('data-wizard-start="anamwiz"'), 'Startknopf erscheint');
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
