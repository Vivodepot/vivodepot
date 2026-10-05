'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   KBV-PKA-Ausgabe der Vorsorgevollmacht (U2-ADR-471) — DPE-Bundles nach MIO Patientenkurzakte 1.0.0
   ───────────────────────────────────────────────────────────────────────────
   Was das Profil verlangt (gemessen am validator_cli, tools/kbv-pka-validieren.js), hält diese Probe ohne Validator:
     · je Vollmacht und bevollmächtigter Person ein Bundle, die Composition mit genau zwei Einträgen — Erklärung ohne
       provision, Vertretung mit genau einem actor (AGNT, Name);
     · der Ablageort kommt nur aus den vier Unterfeldern, nie aus dem Freitext; fehlt einer, gibt es einen Grund und keine Datei;
     · KVNR, Geschlecht und Familienname sind Torgründe — keine PKV-Nummer, weil das Profil sie nicht erfüllbar macht;
     · eine als privat markierte Person geht nicht hinaus, und das wird gesagt;
     · jeder Grund hat einen Satz in DE und EN; der Ausgabeweg schreibt eine Datei je Bundle — und keine, wenn ein Tor zu ist.
   Rot-Beweise: ein Freitext, der wie eine Anschrift aussieht, ergibt keine Datei; eine Nummer im PKV-Format ergibt keine.
   Die Personen und Anschriften sind erfunden.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { vorsorgeDepotAnlegen } = require('../tools/lib/ips-vorsorge-beispiel.js');
const { kvnr } = require('../tools/isik-validieren.js');

const JETZT = '2026-10-02T12:00:00Z';
const ANSCHRIFT = { storageStreet: 'Rennweg', storageHouseNumber: '35', storagePostalCode: '56626', storageCity: 'Andernach' };
const GRUENDE = ['sensibel-nicht-freigegeben', 'kvnr-fehlt', 'name-fehlt', 'geschlecht-fehlt', 'vollmacht-fehlt',
  'vollmacht-datum-fehlt', 'ablageort-anschrift-fehlt', 'bevollmaechtigte-fehlen', 'bevollmaechtigte-privat'];

async function depot(opts, mitAnschrift = true) {
  const { V } = ladeKern(opts || {});
  const personen = await vorsorgeDepotAnlegen(V);
  V.sektorFeldSetzen('health', 'insuranceNumber', kvnr('A', '12345678'));
  V.sektorFeldSetzen('identity', 'gender', 'w');
  if (mitAnschrift) Object.assign(V.getData().sektoren.advanceCare.provisionInstruments[0], ANSCHRIFT);
  return { V, personen };
}
const res = (b, typ) => b.entry.map((e) => e.resource).filter((r) => r.resourceType === typ);

test('[PKA·Tor] ohne Freigabe der sensiblen Felder, ohne KVNR und ohne Geschlecht: kein Bundle, die Gründe stehen da', async () => {
  const { V } = ladeKern();
  await vorsorgeDepotAnlegen(V);
  const r = V.kbvPkaVollmacht(JETZT, {});
  assert.deepEqual(r.bundles, []);
  for (const g of ['sensibel-nicht-freigegeben', 'kvnr-fehlt', 'geschlecht-fehlt']) assert.ok(r.gruende.includes(g), g);
  assert.ok(!r.gruende.includes('name-fehlt'), 'der Familienname ist eingetragen');
});

test('[PKA·Bundle] je bevollmächtigter Person ein DPE-Bundle mit genau zwei Erklärungen; die Bankvollmacht und die private Person fehlen', async () => {
  const { V } = await depot();
  const T = V.IPS_BEGRIFFE.kbvPka;
  const r = V.kbvPkaVollmacht(JETZT, { sensibel: true });
  assert.deepEqual(r.gruende, ['bevollmaechtigte-privat'], 'der Sohn ist als privat markiert');
  assert.equal(r.bundles.length, 1, 'eine Vorsorgevollmacht, eine mitgebbare Person; die Bankvollmacht ist keine Vorsorge');
  const b = r.bundles[0];
  assert.deepEqual(b.meta.profile, [T.profilBundle]);
  assert.equal(b.type, 'document');
  assert.deepEqual(b.identifier.type.coding, [{ system: T.bundleTyp.system, code: 'DPE_Vorsorgevollmacht' }]);
  assert.equal(b.entry[0].resource.resourceType, 'Composition', 'die Composition steht vorn');
  for (const e of b.entry) assert.equal(e.fullUrl, 'urn:uuid:' + e.resource.id);
  const [comp] = res(b, 'Composition');
  assert.equal(comp.section.length, 1);
  assert.equal(comp.section[0].entry.length, 2, 'genau zwei Einträge (section.entry 2..2)');
  const consents = res(b, 'Consent');
  assert.deepEqual(comp.section[0].entry.map((x) => x.reference).sort(), b.entry.filter((e) => e.resource.resourceType === 'Consent').map((e) => e.fullUrl).sort());
  const erkl = consents.find((c) => c.meta.profile[0] === T.profilErklaerung);
  const vertr = consents.find((c) => c.meta.profile[0] === T.profilVertretung);
  assert.equal(erkl.provision, undefined, 'die Erklärung trägt keine provision');
  assert.equal(erkl.policyRule.coding[0].code, '186065003');
  assert.equal(erkl.scope.coding[0].code, 'adr', 'das Profil fixiert adr');
  assert.equal(erkl.dateTime, '2025-03-01');
  assert.equal(vertr.provision.actor.length, 1);
  assert.equal(vertr.provision.actor[0].role.coding[0].code, 'AGNT');
  assert.equal(vertr.provision.actor[0].reference.display, 'Anna Mustermann');
  assert.equal(JSON.stringify(b).includes('Jonas'), false, 'die private Person steht nirgends im Bundle');
  const [pat] = res(b, 'Patient');
  assert.deepEqual(pat.identifier.map((i) => i.system), ['http://fhir.de/NamingSystem/gkv/kvid-10']);
  assert.equal(pat.gender, 'female');
  assert.equal(pat.name[0].family, 'Mustermann');
});

test('[PKA·Anschrift] der Ablageort der Vertretung kommt aus den vier Unterfeldern; die Erklärung nennt den Freitext der Person', async () => {
  const { V } = await depot();
  const b = V.kbvPkaVollmacht(JETZT, { sensibel: true }).bundles[0];
  const T = V.IPS_BEGRIFFE.kbvPka;
  const vertr = res(b, 'Consent').find((c) => c.meta.profile[0] === T.profilVertretung);
  const ext = vertr.sourceReference._display.extension;
  assert.equal(ext.length, 1);
  assert.equal(ext[0].url, T.extAblageort);
  const a = ext[0].valueAddress;
  assert.deepEqual([a.line, a.postalCode, a.city], [['Rennweg 35'], '56626', 'Andernach']);
  assert.deepEqual(a._line[0].extension.map((x) => x.valueString), ['Rennweg', '35'], 'Straße und Hausnummer getrennt (Pflicht-Extensions)');
  assert.equal(a.text, undefined, 'Address.text verbietet das Profil');
  assert.equal(vertr.sourceReference.display, 'Rennweg 35, 56626 Andernach');
  const erkl = res(b, 'Consent').find((c) => c.meta.profile[0] === T.profilErklaerung);
  assert.equal(erkl.sourceReference.display, 'Schreibtisch, oberste Schublade', 'die Worte der Person');
});

test('[PKA·Anschrift·Rot] ein Freitext, der wie eine Anschrift aussieht, ergibt keine Datei — geraten wird nie', async () => {
  const { V } = await depot(undefined, false);
  V.getData().sektoren.advanceCare.provisionInstruments[0].storageLocation = 'beim Notar, Hauptstraße 5, 80331 München';
  const r = V.kbvPkaVollmacht(JETZT, { sensibel: true });
  assert.deepEqual(r.bundles, []);
  assert.ok(r.gruende.includes('ablageort-anschrift-fehlt'));
  // Positivkontrolle im selben Depot: mit den Unterfeldern entsteht das Bundle
  Object.assign(V.getData().sektoren.advanceCare.provisionInstruments[0], ANSCHRIFT);
  const nachher = V.kbvPkaVollmacht(JETZT, { sensibel: true });
  assert.equal(nachher.bundles.length, 1);
});

test('[PKA·KVNR·Rot] eine Nummer, die keine 10-stellige KVNR ist (etwa eine PKV-Nummer), schließt das Tor', async () => {
  const { V } = await depot();
  const vorher = V.kbvPkaVollmacht(JETZT, { sensibel: true });
  assert.equal(vorher.bundles.length, 1, 'Positivkontrolle: mit gültiger KVNR entsteht das Bundle');
  V.sektorFeldSetzen('health', 'insuranceNumber', '123456789');
  const r = V.kbvPkaVollmacht(JETZT, { sensibel: true });
  assert.deepEqual(r.bundles, []);
  assert.ok(r.gruende.includes('kvnr-fehlt'));
  const echt = kvnr('A', '12345678');
  V.sektorFeldSetzen('health', 'insuranceNumber', echt.slice(0, 9) + String((Number(echt[9]) + 1) % 10));
  assert.ok(V.kbvPkaVollmacht(JETZT, { sensibel: true }).gruende.includes('kvnr-fehlt'), 'eine falsche Prüfziffer schließt das Tor ebenso');
});

test('[PKA·Geschlecht] d wird other mit der amtlichen Angabe D, k wird unknown', async () => {
  const { V } = await depot();
  V.sektorFeldSetzen('identity', 'gender', 'd');
  let [pat] = res(V.kbvPkaVollmacht(JETZT, { sensibel: true }).bundles[0], 'Patient');
  assert.equal(pat.gender, 'other');
  assert.equal(pat._gender.extension[0].valueCoding.code, 'D');
  V.sektorFeldSetzen('identity', 'gender', 'k');
  [pat] = res(V.kbvPkaVollmacht(JETZT, { sensibel: true }).bundles[0], 'Patient');
  assert.equal(pat.gender, 'unknown');
  assert.equal(pat._gender, undefined);
});

test('[PKA·Mehrere] zwei mitgebbare bevollmächtigte Personen ergeben zwei Bundles mit je einem actor', async () => {
  const { V, personen } = await depot();
  const z = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const dritte = V.personHinzufuegen({ name: 'Lea Beispiel' });
  z.authorizedPersons = [{ ref: personen.tochter }, { ref: dritte }];
  const r = V.kbvPkaVollmacht(JETZT, { sensibel: true });
  assert.deepEqual(r.gruende, []);
  assert.deepEqual(r.bundles.map((b) => res(b, 'Consent').find((c) => c.provision).provision.actor[0].reference.display), ['Anna Mustermann', 'Lea Beispiel']);
  assert.notEqual(r.bundles[0].identifier.value, r.bundles[1].identifier.value);
});

test('[PKA·Texte] jeder Grund hat einen Satz, das Register kennt den Weg', async () => {
  const { V } = ladeKern();
  for (const g of GRUENDE) assert.ok(V.STRINGS['kbvPkaGrund_' + g.replace(/-/g, '_')], g);
  for (const k of ['kbvPkaExportLabel', 'kbvPkaExportKurz', 'kbvPkaExportiert']) assert.ok(V.STRINGS[k], k);
  const def = V.EXPORT_FORMATE.find((f) => f.id === 'kbv-pka');
  assert.equal(def.sektor, 'advanceCare');
  assert.equal(def.baue({}), null, 'ohne Freigabe kein Inhalt');
});

test('[PKA·Ausgabeweg] eine Datei je Bundle; mit geschlossenem Tor keine', async () => {
  const dateien = [];
  const { V } = await depot({ ausgabeErfassen: (d) => dateien.push(d), Blob: require('node:buffer').Blob });
  V.sektorFeldSetzen('health', 'insuranceNumber', '');
  assert.equal(V.flowKbvPkaExport({ sensibel: true }), 'ohne-datei');
  V.sektorFeldSetzen('health', 'insuranceNumber', kvnr('A', '12345678'));
  assert.equal(V.flowKbvPkaExport({ sensibel: true }), 'datei');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(dateien.length, 1);
  assert.match(dateien[0].name, /_KBV_PKA_Vorsorgevollmacht_\d{4}-\d{2}-\d{2}\.json$/);
  const b = JSON.parse(await dateien[0].blob.text());
  assert.equal(b.meta.profile[0], V.IPS_BEGRIFFE.kbvPka.profilBundle);
});

/* TOP-Bedingungen zum Klartext-Register (05.10.2026, b16-113 erlaubt-Klartext für flowKbvPkaExport). */
test('[PKA·Klartext-Hinweis] vor dem Speichern steht „nicht verschlüsselt“; gespeichert wird erst nach der Bestätigung', async () => {
  const { V } = await depot();
  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return { schliessen() {} }; };
  let gespeichert = 0;
  assert.equal(V.klartextHinweisVorSpeichern('Titel', () => { gespeichert++; }), 'hinweis');
  assert.equal(gespeichert, 0, 'vor der Bestätigung keine Datei');
  assert.match(modale[0].koerperHTML, /Diese Datei ist nicht verschlüsselt\. Geben Sie sie nur direkt an die Person oder Stelle, für die sie bestimmt ist\./);
  modale[0].onPrimaer(() => {});
  assert.equal(gespeichert, 1);
  assert.ok(V.ZUSICHERUNGS_SCHLUESSEL_KERN.includes('klartextNichtVerschluesselt'), 'der Satz steht auf der Schutzliste');
});

test('[PKA·Klartext-Hinweis·Rot] der Klickweg ruft den Hinweis — ohne ihn fiele die Probe', () => {
  const { V } = ladeKern({});
  const quelle = V.flowKbvPkaExport.toString();
  assert.match(quelle, /aufFortfahren: \(exportOpt\) => ausgeben\(exportOpt \|\| \{\}, true\)/, 'der Klickweg verlangt den Hinweis');
  assert.match(quelle, /return klartextHinweisVorSpeichern\(/);
  const ohne = quelle.replace('ausgeben(exportOpt || {}, true)', 'ausgeben(exportOpt || {})');
  assert.doesNotMatch(ohne, /aufFortfahren: \(exportOpt\) => ausgeben\(exportOpt \|\| \{\}, true\)/);
});

test('[PKA·Freigabe] der Klickweg führt zuerst über die Freigabe-Übersicht; dort sind die sensiblen Angaben nicht vorgewählt', async () => {
  const dateien = [];
  const { V } = await depot({ ausgabeErfassen: (d) => dateien.push(d), Blob: require('node:buffer').Blob });
  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return { schliessen() {} }; };
  const gesagt = [];
  V.ui.toast = (t) => gesagt.push(t);
  await V.flowKbvPkaExport();
  assert.equal(modale.length, 1, 'zuerst die Übersicht, kein Weg an ihr vorbei');
  assert.ok(!/ checked/.test(modale[0].koerperHTML), 'keine Angabe ist vorab angehakt');
  await modale[0].onPrimaer(() => {});
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(dateien.length, 0, 'ohne einzelne Freigabe bleiben die sensiblen Angaben und mit ihnen die Anschrift des Ablageorts zurück: keine Datei');
  assert.ok(modale.every((m) => !/klartext-hinweis/.test(m.koerperHTML)), 'ohne Datei auch kein Hinweis');
});
