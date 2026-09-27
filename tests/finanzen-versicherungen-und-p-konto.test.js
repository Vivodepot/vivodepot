'use strict';
/* Finanzen: private Sachversicherungen strukturiert + Basiskonto/P-Konto (U2-ADR-424, 19.09.2026).
   Zwei additive Ergänzungen (neues Listenfeld finance.privateInsurancePolicies; Vorschlag „Basiskonto“ und
   Merkmal garnishmentProtection an finance.accounts) und eine Migration mit Schemastufe (84→85): der alte
   Freitext der Situation „Volljährigkeit“ (vj_versicherungen) wandert einmalig ins neue Feld, der Rohwert
   bleibt stehen (Verwaisungsregel), das Feld selbst ist aus dem Ab-Werk-Situationsmodul entfernt — nie mehr
   doppelt gepflegt. Kern und Lese-App im selben Zug. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

function finanzFeld(V, id) {
  const sek = (V.SEKTOR_BY_ID ? V.SEKTOR_BY_ID.finance : V.SEKTOREN.find((s) => s.id === 'finance'));
  return sek.sektionen.flatMap((s) => s.felder).find((f) => f.id === id);
}

test('[Finanzen·Versicherungen] das neue Feld trägt die sechs Unterfelder mit deutschem Text', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const f = finanzFeld(V, 'privateInsurancePolicies');
  assert.equal(f.typ, 'liste');
  assert.equal(f.label, 'Private Sachversicherungen');
  const ids = f.unterFelder.map((u) => u.id);
  assert.deepEqual(ids, ['insuranceType', 'insurer', 'insurancePolicyNumber', 'insuranceContactPerson', 'insuranceTerminationMethod', 'note']);
  assert.equal(f.unterFelder.find((u) => u.id === 'insuranceType').label, 'Art der Versicherung');
  assert.ok(f.unterFelder.find((u) => u.id === 'insuranceType').vorschlaege.includes('Haftpflichtversicherung'));
  assert.equal(f.unterFelder.find((u) => u.id === 'insurer').typ, 'ref');
  assert.equal(f.unterFelder.find((u) => u.id === 'insurer').entitaet, 'institution');
  assert.equal(f.unterFelder.find((u) => u.id === 'insurancePolicyNumber').sensibel, true, 'Versicherungsschein-Nummer ist sensibel, wie companyPensionPolicyNumber');
  assert.equal(f.unterFelder.find((u) => u.id === 'insuranceTerminationMethod').label, 'Kündigungsweg');
});

test('[Finanzen·Versicherungen] Kern und Lese-App führen dasselbe Feld, mit denselben Bezeichnungen', () => {
  const { V: K } = ladeKern();
  K.setData(K.leeresDepot());
  const { V: L } = ladeLesen();
  const fk = finanzFeld(K, 'privateInsurancePolicies');
  const fl = finanzFeld(L, 'privateInsurancePolicies');
  assert.equal(fl.unterFelder.map((u) => u.id).join(','), fk.unterFelder.map((u) => u.id).join(','));
  assert.equal(fl.label, fk.label);
  assert.equal(fl.unterFelder.find((u) => u.id === 'insurer').label, fk.unterFelder.find((u) => u.id === 'insurer').label);
});

test('[Finanzen·Versicherungen] der alte Freitext ist aus der Situation „Volljährigkeit“ entfernt, die übrigen Felder bleiben', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const sit = V.situationenAlle().find((s) => s.id === 'volljaehrig');
  const feldIds = sit.bloecke.flatMap((b) => b.eintraege).map((e) => e.feld && e.feld.id).filter(Boolean);
  assert.ok(!feldIds.includes('vj_versicherungen'), 'vj_versicherungen darf nicht mehr im Eingabefluss stehen');
  for (const erhalten of ['vj_ummeldung', 'vj_mietvertrag', 'vj_konto', 'vj_krankenversicherung', 'vj_ausbildung', 'vj_rundfunk', 'vj_vorsorge']) {
    assert.ok(feldIds.includes(erhalten), 'Positivkontrolle: ' + erhalten + ' muss weiter da sein — sonst war die Entfernung zu grob');
  }
});

test('[Finanzen·P-Konto] accountType trägt „Basiskonto“ als Vorschlag, garnishmentProtection ist ja/nein', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const f = finanzFeld(V, 'accounts');
  assert.ok(f.unterFelder.find((u) => u.id === 'accountType').vorschlaege.includes('Basiskonto'));
  const gp = f.unterFelder.find((u) => u.id === 'garnishmentProtection');
  assert.equal(gp.typ, 'auswahl');
  assert.deepEqual(gp.optionen.map((o) => o.wert), ['ja', 'nein']);
  assert.equal(gp.label, 'Pfändungsschutzkonto (P-Konto)');
});

test('[Finanzen·P-Konto] Kern und Lese-App zeigen dieselbe Zusammenfassung, mit Feldbezeichnung vor ja/nein', () => {
  const eintrag = { institution: { override: 'Sparkasse' }, accountType: 'Basiskonto', garnishmentProtection: 'ja' };
  const { V: K } = ladeKern();
  K.setData(K.leeresDepot());
  const zk = K.listenEintragZusammenfassung(finanzFeld(K, 'accounts'), eintrag, 'finance');
  assert.equal(zk, 'Sparkasse · Basiskonto · Pfändungsschutzkonto (P-Konto): ja');
  const { V: L } = ladeLesen();
  const zl = L.listenEintragZusammenfassung(finanzFeld(L, 'accounts'), eintrag, 'finance');
  assert.equal(zl, zk, 'Kern und Lese-App zeigen denselben Text');
});

/* ── Migration, Schema-Endstufe (Zahl ein Platzhalter, s. Kern-Kommentar an der Stufe — darum
   überall V.SCHEMA_VERSION_AKTUELL gegen den aktuellen Kern gemessen, nie eine Zahl fest verdrahtet) ── */
test('[Finanzen·Migration] ein vorhandener Freitext wandert nach privateInsurancePolicies, der Rohwert bleibt stehen', () => {
  const { V } = ladeKern();
  const d = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {},
    situationen: { volljaehrig: { vj_versicherungen: 'Privathaftpflicht eigener Vertrag; Hausrat für die Wohnung' } } };
  const out = V.depotNormalisieren(d);
  assert.equal(out.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.deepEqual(out.sektoren.finance.privateInsurancePolicies, [{ note: 'Privathaftpflicht eigener Vertrag; Hausrat für die Wohnung' }]);
  assert.equal(out.situationen.volljaehrig.vj_versicherungen, 'Privathaftpflicht eigener Vertrag; Hausrat für die Wohnung',
    'der alte Rohwert bleibt im Depot stehen (Verwaisungsregel) — kein Datenverlust, auch wenn ihn niemand mehr liest');
});

test('[Finanzen·Migration] ohne alten Freitext bleibt die Liste leer, die Schemastufe steigt trotzdem', () => {
  const { V } = ladeKern();
  const d = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {}, situationen: {} };
  const out = V.depotNormalisieren(d);
  assert.equal(out.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.equal((out.sektoren.finance || {}).privateInsurancePolicies, undefined);
});

test('[Finanzen·Migration] ein bestehender Eintrag in privateInsurancePolicies bleibt unangetastet, der Freitext wird angehängt', () => {
  const { V } = ladeKern();
  const d = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], sektoren: { finance: { privateInsurancePolicies: [{ insuranceType: 'Rechtsschutzversicherung', insurer: { override: 'ARAG' } }] } },
    feldDefinitionen: [], sensibelFelder: {}, situationen: { volljaehrig: { vj_versicherungen: 'Hausrat bei der HUK' } } };
  const out = V.depotNormalisieren(d);
  assert.equal(out.sektoren.finance.privateInsurancePolicies.length, 2);
  assert.equal(out.sektoren.finance.privateInsurancePolicies[0].insuranceType, 'Rechtsschutzversicherung', 'der bestehende Eintrag bleibt an erster Stelle');
  assert.equal(out.sektoren.finance.privateInsurancePolicies[1].note, 'Hausrat bei der HUK');
});

test('[Finanzen·Migration·Rot-Beweis] ein Depot, das die Stufe schon hinter sich hat, migriert kein zweites Mal', () => {
  const { V } = ladeKern();
  // schemaVersion bereits auf dem aktuellen Stand, aber der alte Freitext ist (z. B. durch einen Fehler
  // anderswo) noch da: die Stufe darf ihn nicht erneut übernehmen, sonst verdoppelt sich der Eintrag bei jedem Laden.
  const d = { schemaVersion: V.SCHEMA_VERSION_AKTUELL, menschen: [], urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {},
    situationen: { volljaehrig: { vj_versicherungen: 'Alter Text' } } };
  const out = V.depotNormalisieren(d);
  assert.equal((out.sektoren.finance || {}).privateInsurancePolicies, undefined, 'die Migrationsstufe griff kein zweites Mal');
});

test('[Finanzen·Migration·Rot-Beweis] die Migration ist inhaltlich idempotent, unabhängig von der Versionsnummer der Stufe', () => {
  // Diese Probe simuliert den Fall, den eine Umnummerierung der Schemastufe auslösen könnte: dieselbe Stufe
  // läuft zweimal über denselben Rohwert — unabhängig vom Versions-Gate darf kein zweiter Eintrag entstehen.
  const { V } = ladeKern();
  const d = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {},
    situationen: { volljaehrig: { vj_versicherungen: 'Privathaftpflicht eigener Vertrag; Hausrat für die Wohnung' } } };
  const einmal = V.depotNormalisieren(d);
  assert.equal(einmal.sektoren.finance.privateInsurancePolicies.length, 1);
  einmal.schemaVersion = 83;   // simuliert die Stufe erneut, als hätte eine Umnummerierung sie nicht gegatet
  const zweimal = V.depotNormalisieren(einmal);
  assert.equal(zweimal.sektoren.finance.privateInsurancePolicies.length, 1, 'kein zweiter Eintrag mit demselben Notiztext');
});

test('[Finanzen·Migration] SCHEMA_VERSION_AKTUELL ist mindestens 84', () => {
  const { V } = ladeKern({ blank: true });
  assert.ok(V.SCHEMA_VERSION_AKTUELL >= 84);
});
