'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Notfall nach Dummy: „Was auf der Karte steht“ — sieben Schalter, die Auswahl steht im Depot (16.11.2026, Schema 101).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Die Person wählt, welche Angaben auf der Notfallkarte stehen. Die Auswahl (notfallKarte.auswahl) wirkt in notfallKernModell
   und damit auf Sicht, Karte (PDF) und QR-Code (der nur die Kontakte trägt, U2-ADR-077). Ein Depot ohne Auswahl behält den
   Umfang von vorher; ein neues Depot schaltet Organspende aus, wie im Dummy.
   Rot-Beweis je Schalter: dieselbe Angabe ist mit „an“ im Modell und mit „aus“ nicht.
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function depot(auswahl) {
  const d = {
    schemaVersion: 101,
    menschen: [{ id: 'm1', name: 'Karl Beispiel', tel: '0170 1112223' }],
    sektoren: {
      identity: { givenName: 'Lena', familyName: 'Beispiel', birthDate: '1990-03-14' },
      health: {
        bloodType: 'A+',
        allergiesMedicationFoodOther: [{ text: 'Penicillin' }],
        medicationOngoing: [{ text: 'Ramipril' }],
        chronicConditionsDiagnoses: [{ text: 'Asthma' }],
        emergencyContacts: [{ ref: 'm1' }],
        bodyWeightKg: '61',
      },
      advanceCare: { provisionInstruments: [
        { id: 'p1', instrument: 'living-will', organDonation: 'ja', storageLocation: 'beim Hausarzt', dateOfLastChange: '2025-06-01' }] },
    },
  };
  if (auswahl) d.notfallKarte = { auswahl };
  return d;
}
const felderIm = (V) => V.notfallKernModell().map((z) => z.feld);

test('[Notfallkarte · Auswahl] sieben Schalter, jeder nennt Felder der Allowlist; ein neues Depot trägt die Vorgabe (Organspende aus)', () => {
  const { V } = ladeKern();
  assert.equal(V.NOTFALL_KARTE_SCHALTER.length, 7);
  const allowlist = new Set(V.NOTFALL_KERN_FELDER.map((f) => f.feld));
  for (const sch of V.NOTFALL_KARTE_SCHALTER) {
    assert.ok(sch.felder.length >= 1, sch.id);
    for (const f of sch.felder) assert.ok(allowlist.has(f), sch.id + ': ' + f + ' steht nicht in NOTFALL_KERN_FELDER');
    assert.ok(typeof sch.etikett() === 'string' && sch.etikett().length > 0, 'Text fehlt: ' + sch.id);
  }
  assert.deepEqual(Object.keys(V.NOTFALL_KARTE_VORGABE).sort(), V.NOTFALL_KARTE_SCHALTER.map((s) => s.id).sort());
  assert.deepEqual(V.leeresDepot().notfallKarte.auswahl, Object.assign({}, V.NOTFALL_KARTE_VORGABE),
    'leeresDepot schreibt die Vorgabe wörtlich ab — beide müssen gleich bleiben');
  assert.equal(V.NOTFALL_KARTE_VORGABE.organDonation, false);
});

test('[Notfallkarte · Auswahl · alt→neu] ein Depot von Schema 100 behält den Kartenumfang; die Stufe ändert keinen Wert', () => {
  const { V } = ladeKern();
  const alt = depot(null); alt.schemaVersion = 100;
  const neu = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  assert.ok(neu.schemaVersion >= 101, String(neu.schemaVersion));
  assert.equal('notfallKarte' in neu, false, 'die Stufe schreibt keine Auswahl');
  V.setData(neu);
  const auswahl = V.notfallKarteAuswahl();
  for (const sch of V.NOTFALL_KARTE_SCHALTER) assert.equal(auswahl[sch.id], true, sch.id + ' muss im alten Depot an sein');
  const felder = felderIm(V);
  for (const f of ['bloodType', 'allergiesMedicationFoodOther', 'medicationOngoing', 'chronicConditionsDiagnoses', 'emergencyContacts',
    'liste:provisionInstruments:living-will:storageLocation', 'liste:provisionInstruments:living-will:organDonation']) {
    assert.ok(felder.includes(f), 'heutiger Umfang verloren: ' + f);
  }
});

test('[Notfallkarte · Auswahl · Rot-Beweis] jeder Schalter: mit „an“ steht die Angabe im Modell, mit „aus“ nicht; andere Felder bleiben', () => {
  const { V } = ladeKern();
  for (const sch of V.NOTFALL_KARTE_SCHALTER) {
    V.setData(depot(Object.fromEntries(V.NOTFALL_KARTE_SCHALTER.map((s) => [s.id, true]))));
    for (const f of sch.felder) assert.ok(felderIm(V).includes(f), sch.id + ' an: ' + f + ' fehlt');
    V.setData(depot(Object.assign(Object.fromEntries(V.NOTFALL_KARTE_SCHALTER.map((s) => [s.id, true])), { [sch.id]: false })));
    const felder = felderIm(V);
    for (const f of sch.felder) assert.ok(!felder.includes(f), sch.id + ' aus: ' + f + ' steht trotzdem im Modell');
    assert.ok(felder.includes('bodyWeightKg'), sch.id + ' aus: ein Feld ohne Schalter fiel mit weg');
    assert.ok(felder.includes('givenName'), sch.id + ' aus: der Name fiel mit weg');
  }
});

test('[Notfallkarte · Auswahl · QR] Kontakt aus: der QR-Code (vCard) trägt keinen Kontakt; Kontakt an: er trägt ihn, nie ein Gesundheitsdatum', () => {
  const { V } = ladeKern();
  V.setData(depot({ contacts: true }));
  const an = V.notfallKontakteVcard();
  assert.match(an, /0170 ?1112223|01701112223/);
  assert.doesNotMatch(an, /Penicillin|Ramipril|Asthma/);
  V.setData(depot({ contacts: false }));
  assert.ok(!/01701112223|0170 1112223/.test(V.notfallKontakteVcard() || ''), 'Kontakt aus, aber im QR');
});

test('[Notfallkarte · Auswahl · Sicht] die Sicht zeigt Karte mit Band, sieben Schalter nach der Auswahl, Drucken, QR, „Aufs Handy“ und „Angaben ändern“', () => {
  const { V, document } = ladeKern();
  V.setData(depot({ allergies: false, organDonation: false }));
  V.geheZuNotfall();
  V.renderNotfall();
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /class="notfall-karte-vorschau"[\s\S]*class="notfall-karte-band"/, 'Band der Karte fehlt');
  const schalter = [...html.matchAll(/<button[^>]*data-notfall-schalter="([A-Za-z]+)"[^>]*>/g)];
  assert.equal(schalter.length, 7);
  const zustand = Object.fromEntries(schalter.map((m) => [m[1], (/aria-checked="(true|false)"/.exec(m[0]) || [])[1]]));
  assert.equal(zustand.allergies, 'false'); assert.equal(zustand.organDonation, 'false'); assert.equal(zustand.medication, 'true');
  for (const m of schalter) assert.match(m[0], /role="switch"/);
  const karte = html.slice(html.indexOf('notfall-karte-vorschau'), html.indexOf('notfall-karte-knoepfe'));
  assert.ok(karte.includes('Ramipril'), 'Medikation fehlt auf der Karte');
  assert.ok(!karte.includes('Penicillin'), 'Allergie abgeschaltet, steht aber auf der Karte');
  for (const id of ['n-karte', 'n-handy', 'n-aendern', 'n-schliessen']) assert.match(html, new RegExp('id="' + id + '"'), id + ' fehlt');
});

test('[Notfallkarte · Auswahl · Schalten] notfallKarteSchalten schreibt genau den einen Schalter, die übrigen bleiben; Unbekanntes wirft', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Probe-Passwort-Notfallkarte-1');
  const d = depot(null); d.schemaVersion = V.getData().schemaVersion;
  V.setData(Object.assign(V.getData(), { menschen: d.menschen, sektoren: Object.assign(V.getData().sektoren, d.sektoren) }));
  delete V.getData().notfallKarte;
  await V.notfallKarteSchalten('conditions', false);
  const a = V.getData().notfallKarte.auswahl;
  assert.equal(a.conditions, false);
  for (const sch of V.NOTFALL_KARTE_SCHALTER) if (sch.id !== 'conditions') assert.equal(a[sch.id], true, sch.id);
  assert.ok(!felderIm(V).includes('chronicConditionsDiagnoses'));
  await assert.rejects(() => V.notfallKarteSchalten('gibtsnicht', true), RangeError);
});
