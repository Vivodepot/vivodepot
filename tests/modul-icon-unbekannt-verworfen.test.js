'use strict';
/* ════════════════════════════════════════════════════════════════════════
   NGO-Härtetest (04.09.2026): fünf unabhängige Testdateien griffen alle zum selben
   nicht-existenten Icon-Namen ('briefcase') — kein Tippfehler, ein fehlender Rückkanal.
   Bislang fiel ein unbekannter Name STILL auf den Register-Default zurück, ohne Meldung.
   Jetzt: dieselbe Bauart wie bei unbekannten Top-Level-Schlüsseln und ungültigen
   Merkmalen/Rollen — die Angabe wird benannt verworfen (`grund:'icon-unbekannt'`), der
   Bestand bleibt unverändert lauffähig (derselbe Default wie bisher).

   Rot-Beweis: unbekanntes Icon erzeugt den Eintrag, bekanntes (und fehlendes) nicht —
   für alle drei Register mit optionalem Icon (Bereich/Situation/Assistent), wörtlicher
   Spiegel wie der Rest dieser drei Prüfer zueinander.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const FAELLE = [
  {
    register: 'bereich', pruefen: 'bereichsModulPruefen', slot: 'bereiche', defaultIcon: 'folder',
    bauen: (icon) => ({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'icon-probe', sprache: 'de',
      bereiche: { 'icon-probe-bereich': Object.assign({ label: 'Icon-Probe' }, icon !== undefined ? { icon } : {}) } }),
  },
  {
    register: 'situation', pruefen: 'situationsModulPruefen', slot: 'situationen', defaultIcon: 'star',
    bauen: (icon) => ({ modulTyp: 'situation', moduleVersion: 1, herkunft: 'icon-probe', sprache: 'de',
      situationen: { 'icon-probe-situation': Object.assign({ titel: 'Icon-Probe' }, icon !== undefined ? { icon } : {}) } }),
  },
  {
    register: 'wizard', pruefen: 'wizardsModulPruefen', slot: 'wizards', defaultIcon: 'star',
    bauen: (icon) => ({ modulTyp: 'wizard', moduleVersion: 1, herkunft: 'icon-probe', sprache: 'de',
      wizards: { 'icon-probe-wizard': Object.assign({ titel: 'Icon-Probe', ziel: { sektor: 'identity' },
        schritte: [{ frage: 'x', feld: { id: 'x', typ: 'text', label: 'x' } }] }, icon !== undefined ? { icon } : {}) } }),
  },
];

for (const f of FAELLE) {
  test(`[Icon-Rückkanal·${f.register}] unbekanntes Icon wird BENANNT verworfen, Modul bleibt gültig, Default greift`, async () => {
    const { V } = await ladeKern();
    const r = V[f.pruefen](f.bauen('briefcase'));
    assert.equal(r.gueltig, true, 'ein unbekanntes Icon darf das ganze Modul nicht zu Fall bringen — reine Kosmetik-Angabe');
    const eintrag = r[f.slot][0];
    assert.equal(eintrag.icon, f.defaultIcon, 'trotz benannter Ablehnung greift derselbe Default wie bisher');
    assert.deepEqual(r.verworfene, [{ id: 'icon-probe-' + f.register, grund: 'icon-unbekannt', was: 'briefcase' }],
      'die Angabe muss benannt erscheinen — genau das war die Lücke');
  });

  test(`[Icon-Rückkanal·${f.register}] bekanntes Icon erzeugt KEINEN Verworfen-Eintrag und wird übernommen`, async () => {
    const { V } = await ladeKern();
    const r = V[f.pruefen](f.bauen('users'));
    assert.equal(r.gueltig, true);
    assert.equal(r[f.slot][0].icon, 'users', 'ein gültiges, vom Modul gewähltes Icon muss weiterhin ankommen');
    assert.deepEqual(r.verworfene, [], 'ein gültiges Icon darf keinen Verworfen-Eintrag erzeugen');
  });

  test(`[Icon-Rückkanal·${f.register}] fehlendes Icon (kein Feld) erzeugt KEINEN Verworfen-Eintrag — Abwesenheit ist nicht Unbekanntheit`, async () => {
    const { V } = await ladeKern();
    const r = V[f.pruefen](f.bauen(undefined));
    assert.equal(r.gueltig, true);
    assert.equal(r[f.slot][0].icon, f.defaultIcon);
    assert.deepEqual(r.verworfene, [], 'ein schlicht fehlendes Icon ist der Normalfall, kein Befund');
  });
}
