'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Notfall-QR (Teil 3, Schnitt 3.3 · U2-ADR-077)
   ────────────────────────────────────────────────────────────────────────
   NEUER VERTRAG (U2-ADR-077): Der Notfall-QR trägt eine KONTAKTE-vCard —
   nur Name + Telefonnummer der Notfallkontakte, KEIN Gesundheitsdatum. Der
   frühere Klartext-QR (notfallKernText, entfernt) trug alle NOTFALL_KERN_FELDER
   im Klartext, darunter vier Art.-9-Felder (Blutgruppe, Allergien, Medikamente,
   ICD-10-Diagnosen); am iPhone leckte er an die Websuche. Die Gesundheits-Angaben
   stehen weiter auf der GEDRUCKTEN Karte (notfallKernModell → zeichneNotfallkarte)
   und im passwortlosen Cache — nur der QR wechselt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

// A2-als-Code (25.07.): U2-077a an seine Anti-Leck-Prüfung gebunden (U2-ADR-098 + Nachtrag).
const ADR = 'U2-ADR-077';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = ['u2-077a-vcard-kein-note-kein-gesundheit'];
test('[Klausel] Bindung an ' + ADR + ' über das Fundament', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
// Depot mit Register-Person(en) + Notfallkontakten (refMehrfach) direkt aufbauen.
function mitKontakten(V, menschen, hauptpflegeperson, extraGesundheit) {
  const d = V.leeresDepot();
  d.sektoren.identity = { givenName: 'Maria', familyName: 'Mustermann' };
  d.sektoren.health = Object.assign({}, d.sektoren.health, extraGesundheit || {}, { emergencyContacts: hauptpflegeperson });
  d.menschen = menschen;
  V.setData(d);
  return d;
}

test('1) Allowlist ist eingefroren und akut-fokussiert (Name, Blutgruppe, Allergien, Kontakt …)', async () => {
  const { V } = await frischMitDepot();
  assert.ok(Object.isFrozen(V.NOTFALL_KERN_FELDER));
  const paare = V.NOTFALL_KERN_FELDER.map(e => e.sektor + '.' + e.feld);
  assert.ok(paare.includes('health.bloodType'));
  assert.ok(paare.includes('health.allergiesMedicationFoodOther'));
  assert.ok(paare.includes('identity.givenName'));
  // Jedes Allowlist-Feld existiert wirklich im jeweiligen Sektor.
  // Ueber die KERN-Aufloesung, nicht ueber eine eigene Kopie: feldDefFuer kennt beide Formen
  // (flaches Sektorfeld UND Listen-Unterfeld-Selektor, U2-ADR-096). Die frueher hier gebaute
  // eigene id-Liste kannte nur die flache Form und meldete „Feld existiert nicht" fuer Felder,
  // die sehr wohl existierten — eine Testkopie einer Regel, die auseinandergelaufen war.
  for (const e of V.NOTFALL_KERN_FELDER) {
    assert.ok(V.SEKTOR_BY_ID[e.sektor], 'Sektor existiert: ' + e.sektor);
    assert.ok(V.feldDefFuer(e.sektor, e.feld), 'Feld existiert: ' + e.sektor + '.' + e.feld);
  }
});

test('2) leeres Depot → leere QR-vCard und leeres Kartenmodell (nichts zu zeigen)', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.notfallKontakteVcard(), '');
  assert.equal(V.notfallKernModell().length, 0);
});

test('3) Kartenmodell: nur GEFÜLLTE Felder rein; Label + Klartext-Wert (unverändert, für Karte + Cache)', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  const m = V.notfallKernModell();
  const labels = m.map(z => z.label);
  assert.ok(labels.includes('Vorname'));
  assert.ok(labels.includes('Blutgruppe'));
  // Auswahl-Wert wird zum Klartext-Label aufgelöst (A+ → „A +"), nicht der rohe Schlüssel.
  const blut = m.find(z => z.label === 'Blutgruppe');
  assert.equal(blut.wert, 'A +');
  // leere Felder (z. B. medikamente) fehlen
  assert.ok(!labels.includes('Medikamente (laufend)'));
});

/* ── Diskriminante (B-1, 26.07.): die Anti-Leck-Prüfung als EINE Stelle, von Wächter UND
   Negativprobe genutzt. Vorher standen die Muster nur inline im Wächter — ohne Probe war
   ungemessen, ob sie überhaupt feuern (Sweep-Befund 26.07., Klasse D). */
const VCARD_LECK = [
  [/A \+|Blutgruppe/, 'Blutgruppe'],
  [/Penicillin|Allergie/i, 'Allergien'],
  [/Ramipril|Medikament/i, 'Medikamente'],
  [/Diabetes|Diagnose|Erkrankung/i, 'Diagnosen'],
  [/VIVODEPOT NOTFALL/, 'alter Klartext-Kopf'],
  [/\bNOTE:/, 'NOTE-Feld (träge freien Bürgertext)'],
];
function vcardLeckVerstoesse(vcard) {
  return VCARD_LECK.filter(([m]) => m.test(vcard)).map(([, was]) => was + ' in der vCard');
}

test('u2-077a-vcard-kein-note-kein-gesundheit: ANTI-LECK — QR-vCard trägt Kontakte, aber KEIN NOTE und KEIN Gesundheitsdatum (auch bei vier gefüllten Art.-9-Feldern)', async () => {
  const { V } = ladeKern();
  // Alle vier Art.-9-Felder mit distinktiven Werten füllen + einen Kontakt mit Nummer.
  mitKontakten(V,
    [{ id: 'p1', name: 'Anna Schulz', tel: '+49 151 999' }],
    [{ ref: 'p1', override: '' }],
    { bloodType: 'A+', allergiesMedicationFoodOther: 'Penicillin', medicationOngoing: 'Ramipril 5mg', chronicConditionsDiagnoses: 'Diabetes mellitus' });
  const vcard = V.notfallKontakteVcard();
  // Der QR IST eine vCard mit dem Kontakt.
  assert.ok(vcard.startsWith('BEGIN:VCARD'), 'QR ist eine vCard');
  assert.ok(vcard.includes('Anna Schulz'), 'Kontakt-Name im QR');
  assert.ok(vcard.includes('+49 151 999'), 'Kontakt-Nummer im QR');
  // Und trägt KEINES der vier Art.-9-Gesundheitsfelder — Wert wie Label (geteilte Diskriminante).
  const leck = vcardLeckVerstoesse(vcard);
  assert.deepEqual(leck, [], 'Gesundheits-/NOTE-Leck in der Notfall-vCard:\n  ' + leck.join('\n  '));
  // Gegenprobe: die gedruckte Karte (Kartenmodell) trägt die Gesundheitsdaten SEHR WOHL weiter.
  const kartenLabels = V.notfallKernModell().map(z => z.label).join('|');
  assert.ok(/Blutgruppe/.test(kartenLabels), 'Karte behält Blutgruppe');
  assert.ok(/Chronische Erkrankungen \/ Diagnosen/.test(kartenLabels), 'Karte behält Diagnosen');
});

test('5) QR-vCard: EIN Block, FN mit Patientenname, je Kontakt-mit-Nummer TEL + X-ABLabel', async () => {
  const { V } = ladeKern();
  mitKontakten(V,
    [{ id: 'p1', name: 'Anna Schulz', tel: '+49 151 111' }, { id: 'p2', name: 'Ben Klein', tel: '+49 151 222' }],
    [{ ref: 'p1', override: '' }, { ref: 'p2', override: '' }]);
  const vcard = V.notfallKontakteVcard();
  // Genau EIN vCard-Block (iOS nimmt nur den ersten).
  assert.equal((vcard.match(/BEGIN:VCARD/g) || []).length, 1, 'genau ein Block');
  assert.ok(/VERSION:3\.0/.test(vcard), 'VERSION 3.0 (X-ABLabel-Träger, am Gerät belegt)');
  assert.ok(/FN:Notfallkontakte · Maria Mustermann/.test(vcard), 'FN trägt Titel + Patientenname');
  // Beide Nummern als tappbare TEL, beide Namen als X-ABLabel.
  assert.ok(/item1\.TEL[^\n]*\+49 151 111/.test(vcard) && /item1\.X-ABLabel:Anna Schulz/.test(vcard));
  assert.ok(/item2\.TEL[^\n]*\+49 151 222/.test(vcard) && /item2\.X-ABLabel:Ben Klein/.test(vcard));
});

test('6) Kontakt OHNE Telefonnummer erscheint NICHT im QR (kein Anruf-Ziel), Kontakt MIT Nummer schon', async () => {
  const { V } = ladeKern();
  mitKontakten(V,
    [{ id: 'p1', name: 'Anna Schulz', tel: '+49 151 111' }, { id: 'p2', name: 'Ben Klein' /* keine tel */ }],
    [{ ref: 'p1', override: '' }, { ref: 'p2', override: '' }]);
  const vcard = V.notfallKontakteVcard();
  assert.ok(vcard.includes('Anna Schulz'), 'Kontakt mit Nummer ist drin');
  assert.ok(!vcard.includes('Ben Klein'), 'Kontakt ohne Nummer nicht im QR');
  // Nur Kontakte ohne Nummer → gar kein QR.
  mitKontakten(V, [{ id: 'p2', name: 'Ben Klein' }], [{ ref: 'p2', override: '' }]);
  assert.equal(V.notfallKontakteVcard(), '', 'kein anrufbarer Kontakt → leerer QR');
});

test('7) flowNotfallQR wirft nicht — ohne anrufbaren Kontakt Hinweis, ohne Bibliothek Hinweis', async () => {
  const { V } = await frischMitDepot();
  assert.doesNotThrow(() => V.flowNotfallQR());      // leer → Toast
  mitKontakten(V, [{ id: 'p1', name: 'Anna Schulz', tel: '+49 151 111' }], [{ ref: 'p1', override: '' }]);
  assert.doesNotThrow(() => V.flowNotfallQR());      // Kontakt da, aber keine qrcode-Lib im Harness → Toast
});

test('8) read-only: der QR-Aufbau verändert die Laufzeitdaten nicht', async () => {
  const { V } = ladeKern();
  mitKontakten(V, [{ id: 'p1', name: 'Anna Schulz', tel: '+49 151 111' }], [{ ref: 'p1', override: '' }]);
  const vorher = JSON.stringify(V.getData());
  V.notfallKernModell(); V.notfallKontakteVcard(); V.flowNotfallQR();
  assert.equal(JSON.stringify(V.getData()), vorher);
});

test('[Negativprobe] u2-077a feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const sauber = 'BEGIN:VCARD\nVERSION:3.0\nFN:Anna Schulz\nTEL:+49 151 999\nEND:VCARD';
  assert.deepEqual(vcardLeckVerstoesse(sauber), [], 'saubere Kontakt-vCard meldet ein Leck — Diskriminante zu grob');
  for (const [mut, was] of [['\nNOTE:Diabetes seit 2010', 'NOTE-Feld'],
                            ['\nX-BLUT:A +', 'Blutgruppe'],
                            ['\nX-ALLERGIE:Penicillin', 'Allergien'],
                            ['\nX-MED:Ramipril 5mg', 'Medikamente']]) {
    assert.ok(vcardLeckVerstoesse(sauber + mut).length > 0, 'blind: „' + was + '" wurde NICHT erkannt');
  }
  assert.deepEqual(vcardLeckVerstoesse(sauber), [], 'nach Rücknahme der Mutation nicht wieder grün');
});

/* ── Konvention (B-1): Deklaration per REFERENZ, nicht per Zeichenkette ── */
module.exports = {
  PROBEN: [{ fuer: 'u2-077a-vcard-kein-note-kein-gesundheit', diskriminante: vcardLeckVerstoesse }],
};
