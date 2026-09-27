'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-102, zweiter Teil — der Wizard stellt keine gegenstandslose Frage
   ────────────────────────────────────────────────────────────────────────
   Vorher (Gerätetest v76, Fund B3): Schritt 1 versprach „Wenn Sie hier
   untersagen, entfallen die weiteren Fragen." Der Wizard lief trotzdem alle
   12 Schritte, und Schritt 2 sagte selbst „Nur relevant, wenn Sie oben eine
   Nachbildung erlaubt haben." Die App zeigte eine Frage, von der sie selbst
   sagte, dass sie nicht gilt.

   DREI Richtungen, alle drei tragend:
     • bei `untersagung`  → nur die Grundentscheidung, Zähler „1 von 1"
     • bei `erlaubnis`    → alle 12, unverändert
     • ohne Entscheidung  → alle 12 (Negativ-Gate: nichts verschwindet aus
                            Mangel an Information — U2-ADR-102 §2)
   Und der Zähler zählt, was gestellt wird: sonst behauptet „von 12" wieder
   mehr, als geschieht.

   Kopplung nach operating-manual §7.5: eine geteilte Diskriminante, kein
   wiederholtes Muster.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-102';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = ['u2-102-wizard-stellt-keine-gegenstandslose-frage'];

function mitGrund(V, grund) {
  V.setData({
    schemaVersion: 31,
    sektoren: {
      advanceCare: { provisionInstruments: grund ? [{ id: 'k1', instrument: 'ki-verfuegung', basicDecision: grund }] : [] },
      administration: {}, identity: {},
    },
    menschen: [],
  });
  return V.WIZARD_BY_ID['kiwiz'];
}

/* ── DIE DISKRIMINANTE — geteilt zwischen Wächter und Probe ───────────────── */
function wizardVerstoesse(V) {
  const verstoesse = [];
  const alle = V.WIZARD_BY_ID['kiwiz'].schritte.length;

  // 1 · untersagung: nur die Grundentscheidung wird gestellt
  let def = mitGrund(V, 'untersagung');
  const beiUntersagung = V.wizardSichtbareIndizes(def);
  if (beiUntersagung.length !== 1) {
    verstoesse.push('bei untersagung werden ' + beiUntersagung.length + ' Schritte gestellt statt 1');
  } else if (def.schritte[beiUntersagung[0]].feld.id !== 'basicDecision') {
    verstoesse.push('bei untersagung bleibt der falsche Schritt stehen: ' + def.schritte[beiUntersagung[0]].feld.id);
  }

  // 2 · erlaubnis und 3 · gar keine Entscheidung: alles wird gestellt
  for (const grund of ['erlaubnis', null]) {
    def = mitGrund(V, grund);
    const n = V.wizardSichtbareIndizes(def).length;
    if (n !== alle) verstoesse.push('bei ' + (grund || 'fehlender Entscheidung') + ' werden nur ' + n + ' von ' + alle + ' Schritten gestellt');
  }

  // 4 · Der Zähler zählt, was gestellt wird — an JEDEM sichtbaren Schritt geprüft
  for (const grund of ['untersagung', 'erlaubnis', null]) {
    def = mitGrund(V, grund);
    const sichtbar = V.wizardSichtbareIndizes(def);
    sichtbar.forEach((idx, pos) => {
      const f = V.wizardFortschritt(def, idx);
      if (f.gesamt !== sichtbar.length) verstoesse.push('Zähler nennt ' + f.gesamt + ' statt ' + sichtbar.length + ' (' + (grund || 'ohne Entscheidung') + ')');
      if (f.schritt !== pos + 1) verstoesse.push('Zähler steht auf ' + f.schritt + ' statt ' + (pos + 1) + ' (' + (grund || 'ohne Entscheidung') + ')');
    });
  }
  return verstoesse;
}

/* ── Wächter ─────────────────────────────────────────────────────────────── */
test('u2-102-wizard-stellt-keine-gegenstandslose-frage', () => {
  const { V } = ladeKern();
  assert.deepEqual(wizardVerstoesse(V), [],
    'U2-ADR-102: bei Untersagung entfallen die Bedingungs-Fragen, und der Schrittzähler nennt nur, was gestellt wird.');
});

/* ── Negativprobe, gekoppelt (operating-manual §7.5) ──────────────────────── */
test('[Negativprobe] u2-102-wizard feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const { V } = ladeKern();
  assert.deepEqual(wizardVerstoesse(V), [], 'Rückstellung: unverändert muss der Wächter grün sein');
  const def = V.WIZARD_BY_ID['kiwiz'];
  const ziel = def.schritte.find(s => s.feld && s.feld.id === 'purpose');
  assert.ok(ziel && ziel.verborgenWenn, 'Anker-Schritt purpose trägt kein verborgenWenn — Probe misst sonst nichts');

  // MUTATION 1: Gate an einem Schritt entfernen -> er wird trotz Untersagung gestellt.
  const merk = ziel.verborgenWenn;
  delete ziel.verborgenWenn;
  const rot1 = wizardVerstoesse(V);
  assert.ok(rot1.some(v => v.includes('bei untersagung werden 2 Schritte gestellt statt 1')),
    'entferntes Gate muss als Verstoß erscheinen, war: ' + JSON.stringify(rot1));
  ziel.verborgenWenn = merk;
  assert.deepEqual(wizardVerstoesse(V), [], 'Rückstellung nach Mutation 1 fehlgeschlagen');

  // MUTATION 2: aus dem Negativ- ein POSITIV-Gate machen -> ohne Entscheidung fiele der
  // Schritt weg, obwohl niemand etwas untersagt hat (der Fehler, den §2 ausschließt).
  ziel.verborgenWenn = { feld: 'basicDecision', wert: [undefined, 'untersagung'] };
  const rot2 = wizardVerstoesse(V);
  assert.ok(rot2.some(v => v.includes('fehlender Entscheidung')),
    'ein Positiv-Gate muss rot werden, war: ' + JSON.stringify(rot2));
  ziel.verborgenWenn = merk;
  assert.deepEqual(wizardVerstoesse(V), [], 'Rückstellung nach Mutation 2 fehlgeschlagen');
});

/* ── Die Zusage aus Schritt 1 ist jetzt wahr — im Wortlaut geprüft ────────── */
test('[U2-102] der Hilfetext verspricht das Ueberspringen, und es geschieht auch', () => {
  const { V } = ladeKern();
  const def = mitGrund(V, 'untersagung');
  const schritt1 = def.schritte[0];
  assert.match(schritt1.hilfetext, /entfallen die weiteren Fragen/,
    'Schritt 1 muss das Überspringen weiterhin zusagen — sonst prüft dieser Test eine Zusage, die es nicht gibt');
  assert.equal(V.wizardSichtbareIndizes(def).length, 1, 'und die Zusage muss eingelöst sein');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-102 nennt auch die Wizard-Pruefung', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

module.exports = {
  PROBEN: [{ fuer: 'u2-102-wizard-stellt-keine-gegenstandslose-frage', diskriminante: wizardVerstoesse }],
};
