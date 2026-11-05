'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Die Ziffer des amtlichen Bausteins steht unter der Frage, nicht in ihr (31.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Fragen des Patientenverfügungs-Assistenten trugen die Gliederungsziffer des
   BMJ-Bausteins am Ende („… (2.3.4)“). Wer die Frage liest, braucht sie nicht; wer den
   Bezug zum amtlichen Text sucht (etwa im Gespräch mit der Ärztin), liest ihn jetzt klein
   unter der Frage als „Amtlicher Baustein 2.3.4“. Die Ziffer ist ein Verweis, kein
   übersetzbarer Text: sie steht als `bmjBaustein` am Schritt des Bauplans im
   Rechtsraum-Modul, die Zeile kommt aus EINEM Text (`strings:wizBmjBaustein.text`).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ZIFFER_AM_ENDE = /\(\d+(?:\.\d+)*(?: [A-Z])?\)\s*$/;
const MODULE = ['de', 'en', 'de-pro', 'en-pro'].map((s) => `tools/textsatz-${s}-modul.json`);

function fragenMitZiffer(texte) {
  return Object.keys(texte).filter((k) => /^wizard:pvwiz\.[^.]+\.frage$/.test(k) && ZIFFER_AM_ENDE.test(texte[k]));
}

function bausteinZeilen(html) {
  return [...html.matchAll(/<p class="wizard-baustein">([^<]*)<\/p>/g)].map((m) => m[1]);
}

function htmlAn(k) {
  return String(k.document.getElementById('content').innerHTML || '');
}

const KOPPLUNG = { PROBEN: [
  { fuer: '[PV·Baustein] keine Frage des Assistenten trägt die Ziffer im Text, in keiner Sprache und keinem Produkt', diskriminante: fragenMitZiffer },
  { fuer: '[PV·Baustein] jeder Schritt mit Baustein zeigt die Zeile unter der Frage, die Schritte ohne zeigen keine', diskriminante: bausteinZeilen },
] };
void KOPPLUNG;

test('[PV·Baustein] keine Frage des Assistenten trägt die Ziffer im Text, in keiner Sprache und keinem Produkt', () => {
  for (const datei of MODULE) {
    const { texte } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', datei), 'utf8'));
    assert.deepEqual(fragenMitZiffer(texte), [], `${datei}: Frage mit Ziffer im Text`);
    assert.ok(typeof texte['strings:wizBmjBaustein.text'] === 'string' && texte['strings:wizBmjBaustein.text'].includes('{z}'),
      `${datei}: der Text der Baustein-Zeile fehlt oder hat keinen Platzhalter`);
  }
});

test('[PV·Baustein] jeder Schritt mit Baustein zeigt die Zeile unter der Frage, die Schritte ohne zeigen keine', async () => {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  const V = k.V;
  const def = V.WIZARD_BY_ID.pvwiz;
  const mit = def.schritte.filter((s) => s.bmjBaustein);
  assert.ok(mit.length >= 20, `nur ${mit.length} Schritte tragen einen Baustein — der Bauplan kam nicht an`);
  const lebenserhalt = def.schritte.find((s) => s.feld && s.feld.id === 'lifeSustainingMeasures');
  assert.equal(lebenserhalt.bmjBaustein, '2.3.1');
  assert.ok(!ZIFFER_AM_ENDE.test(lebenserhalt.frage), 'die Frage trägt die Ziffer noch');

  V.wizardLauf('pvwiz');
  const sichtbar = V.wizardSichtbareIndizes(def);
  let gesehenMit = 0;
  for (let i = 0; i < sichtbar.length; i++) {
    if (i > 0) V.wizardWeiter();
    V.renderWizard();
    const schritt = def.schritte[sichtbar[i]];
    const zeilen = bausteinZeilen(htmlAn(k));
    if (schritt.bmjBaustein) {
      gesehenMit++;
      assert.deepEqual(zeilen, ['Amtlicher Baustein ' + schritt.bmjBaustein], `Schritt ${schritt.feld.id}: Zeile fehlt oder falsch`);
    } else {
      assert.deepEqual(zeilen, [], `Schritt ${schritt.feld.id}: Zeile ohne Baustein`);
    }
  }
  assert.ok(gesehenMit > 0, 'kein sichtbarer Schritt mit Baustein — die Probe sah nichts');
});

test('[PV·Baustein·Rot-Beweis] eine Frage mit Ziffer und ein Schritt ohne Zeile fallen auf', () => {
  assert.deepEqual(fragenMitZiffer({ 'wizard:pvwiz.x.frage': 'Dialyse (2.3.6)', 'wizard:pvwiz.y.frage': 'Wiederbelebung (2.3.4 A)', 'wizard:pvwiz.z.frage': 'Dialyse' }),
    ['wizard:pvwiz.x.frage', 'wizard:pvwiz.y.frage']);
  assert.deepEqual(bausteinZeilen('<div class="wizard-frage">Dialyse</div><p class="wizard-hilfe">x</p>'), []);
  assert.deepEqual(bausteinZeilen('<div class="wizard-frage">Dialyse</div><p class="wizard-baustein">Amtlicher Baustein 2.3.6</p>'), ['Amtlicher Baustein 2.3.6']);
});
