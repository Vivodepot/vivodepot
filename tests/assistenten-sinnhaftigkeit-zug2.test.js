'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Assistenten fragen, was nicht gelten kann" (11.08.2026),
   Zug 2: die gegenstandslosen Schritte. Fünf „Falls X: …"-Folgeschritte über
   zwei Assistenten bekommen `verborgenWenn` nach dem kiwiz-Muster
   (U2-ADR-102) — derselbe Mechanismus, kein zweiter. Betrifft nur die von
   Vivodepot ergänzten Detail-Folgefragen, nicht den amtlichen BMJ-Wortlaut
   selbst (`PV_BMJ.steps` bleibt unverändert).

   Die Grenze aus U2-ADR-102 gilt mit: Anzeige-Gating macht den Datensatz
   nicht widerspruchsfrei — ein nicht gestellter Schritt hinterlässt trotzdem
   ein Feld, was darin schon steht, bleibt stehen (letzte Probe hier).

   Negativ-Form wie überall (`wizardSchrittVerborgen`-Kommentar, U2-ADR-102):
   unterdrückt wird NUR, was der Datensatz AKTIV mit einem ausschließenden
   Wert beantwortet hat — nie der unbeantwortete Fall. Ein Folgeschritt ist
   darum initial SICHTBAR (wie kiwiz' eigene Schritte auch), erst ein aktiv
   gewählter Ausschluss-Wert an der vorangehenden Frage versteckt ihn.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PV_FAELLE = [
  { folgeId: 'whoseViewMattersOtherPersonName', gate: 'whoseViewMattersIfUnregulated', zeigenWert: 'andere', versteckenWert: 'arzt' },
  { folgeId: 'whoseViewMattersIfDeviatingOther', gate: 'whoseViewMattersIfDeviatingWill', zeigenWert: 'andere', versteckenWert: 'betreuer' },
  { folgeId: 'priorityIfOrganDonationConflict', gate: 'organDonationDecision', zeigenWert: 'zustimmung', versteckenWert: 'ablehnung' },
  { folgeId: 'validityDurationDeadline', gate: 'validityDuration', zeigenWert: 'befristet', versteckenWert: 'unbefristet' },
];

for (const f of PV_FAELLE) {
  test('[Assistenten·Zug2] pvwiz.' + f.folgeId + ': sichtbar bis aktiv "' + f.versteckenWert + '" gewählt wird', async () => {
    const { V } = ladeKern();
    await V.depotAnlegen('sicherung-2026');
    V.akteurSelbstErklaeren('Tester');
    const def = V.WIZARD_BY_ID.pvwiz;
    const sichtbar = () => V.wizardSichtbareIndizes(def).some((i) => def.schritte[i].feld.id === f.folgeId);

    // Unbeantwortet: sichtbar (Negativ-Form — nur ein AKTIVER Ausschluss versteckt).
    assert.equal(sichtbar(), true, f.folgeId + ' ist unbeantwortet sichtbar');

    // Ausschließender Wert: versteckt.
    V.sektorFeldSetzen('advanceCare', f.gate, f.versteckenWert);
    assert.equal(sichtbar(), false, f.folgeId + ' versteckt bei "' + f.versteckenWert + '"');

    // Freischaltender Wert: wieder sichtbar.
    V.sektorFeldSetzen('advanceCare', f.gate, f.zeigenWert);
    assert.equal(sichtbar(), true, f.folgeId + ' erscheint bei "' + f.zeigenWert + '"');
  });
}

test('[Assistenten·Zug2] pflwiz.pflegegeld_betrag: versteckt bei Sachleistung, erscheint bei Pflegegeld/Kombinationsleistung', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('sicherung-2026');
  V.akteurSelbstErklaeren('Tester');
  const def = V.WIZARD_BY_ID.pflwiz;
  const sichtbar = () => V.wizardSichtbareIndizes(def).some((i) => def.schritte[i].feld.id === 'longTermCareAllowanceAmount');

  assert.equal(sichtbar(), true, 'unbeantwortet sichtbar (Negativ-Form)');
  V.sektorFeldSetzen('socialInsurance', 'longTermCareAllowanceTypeOf', 'sachleistung');
  assert.equal(sichtbar(), false, 'bei Sachleistung versteckt — keine Auszahlung');
  V.sektorFeldSetzen('socialInsurance', 'longTermCareAllowanceTypeOf', 'pflegegeld');
  assert.equal(sichtbar(), true, 'bei Pflegegeld sichtbar');
  V.sektorFeldSetzen('socialInsurance', 'longTermCareAllowanceTypeOf', 'kombinationsleistung');
  assert.equal(sichtbar(), true, 'bei Kombinationsleistung sichtbar');
});

test('[Assistenten·Zug2] der amtliche PV_BMJ-Wortlaut bleibt unverändert (nur die Wizard-Präsentation blendet aus)', () => {
  const { V } = ladeKern();
  const frage = V.PV_BMJ.steps.find((s) => s.feld.id === 'priorityIfOrganDonationConflict');
  assert.ok(frage, 'Baustein existiert unverändert in PV_BMJ.steps');
  assert.equal(frage.verborgenWenn, undefined, 'PV_BMJ.steps selbst trägt kein verborgenWenn — nur die Wizard-Schritte tun das');
});

test('[Assistenten·Zug2·U2-ADR-102-Grenze] ein nicht gestellter Schritt löscht seinen Bestandswert NICHT', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('sicherung-2026');
  V.akteurSelbstErklaeren('Tester');
  // Wert steht, dann wird der Gate-Wert auf "versteckt diesen Schritt" geändert.
  V.sektorFeldSetzen('advanceCare', 'organDonationDecision', 'zustimmung');
  V.sektorFeldSetzen('advanceCare', 'priorityIfOrganDonationConflict', 'organspende');
  V.sektorFeldSetzen('advanceCare', 'organDonationDecision', 'ablehnung');
  const nachher = V.getData().sektoren.advanceCare.priorityIfOrganDonationConflict;
  assert.equal(nachher, 'organspende', 'der Bestandswert bleibt stehen, auch wenn der Schritt nicht mehr gestellt wird');
});
