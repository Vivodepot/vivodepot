'use strict';
/* Harmonisierung (27.09.2026): die Feldkennungen gegen internationale Datensätze — IPS, eu-eps, openEHR. Nur Abbildung, keine
   Umbenennung (U2-ADR-409). Diese Probe hält das Werkzeug tools/bezuege-erheben.js an erfundenen Auszügen der drei Quellformate
   (tests/fixtures/bezuege/) und die echte Tabelle bereiche/bezuege.json an Register und Ratsche. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const B = require('../tools/bezuege-erheben.js');

const REPO = path.join(__dirname, '..');
const kopie = (o) => JSON.parse(JSON.stringify(o));
const fixture = () => B.eingaben([]);

test('[Bezüge] gegen die Fixtures: Zählung je Datensatz und Bereich, „nein" für jede Kennung ohne Zeile', () => {
  const r = B.erheben(fixture());
  assert.deepEqual(r.befunde, []);
  assert.equal(r.anzahlKennungen, 6);
  assert.deepEqual(r.abdeckung['fhir-probe'].summe, { ja: 3, teilweise: 0, nein: 3 });
  assert.deepEqual(r.abdeckung['fhir-probe'].bereiche.identity, { ja: 3, teilweise: 0, nein: 0 });
  assert.deepEqual(r.abdeckung['openehr-probe'].summe, { ja: 0, teilweise: 2, nein: 4 });
  assert.deepEqual(r.abdeckung['openehr-probe'].bereiche.finance, { ja: 0, teilweise: 0, nein: 1 }, 'ein Bereich ohne Bezug zählt ehrlich als nein');
});

test('[Bezüge·Rot-Beweis] unbekannte Kennung, unbekannter Grad, totes Ziel, ungepinnter Datensatz und veränderte Quelle sind Befunde', () => {
  const e = fixture();
  e.tabelle = kopie(e.tabelle);
  e.tabelle.zeilen.push(
    { kennung: 'identity.erfunden', datensatz: 'fhir-probe', ziel: 'PatientProbe#Patient.birthDate', grad: 'exakt' },
    { kennung: 'identity.givenName', datensatz: 'fhir-probe', ziel: 'PatientProbe#Patient.name.given', grad: 'ungefaehr' },
    { kennung: 'finance.iban', datensatz: 'fhir-probe', ziel: 'PatientProbe#Patient.gibtEsNicht', grad: 'weit' },
    { kennung: 'finance.iban', datensatz: 'nirgends', ziel: 'x#y', grad: 'weit' });
  const o = fs.mkdtempSync(path.join(os.tmpdir(), 'bezuege-quelle-'));
  try {
    fs.cpSync(e.quellOrdner, o, { recursive: true });
    const d = path.join(o, 'openehr-probe', 'probe.ips.v1.webtemplate.json');
    fs.writeFileSync(d, fs.readFileSync(d, 'utf8').replace('Blutgruppe', 'Blutgruppe (geändert)'));
    const arten = B.erheben(Object.assign(e, { quellOrdner: o })).befunde.map((b) => b.art).sort();
    assert.deepEqual(arten, ['datensatz-nicht-gepinnt', 'quelle-veraendert', 'totes-ziel', 'unbekannte-kennung', 'unbekannter-grad']);
  } finally { fs.rmSync(o, { recursive: true, force: true }); }
});

test('[Bezüge·Wächter] Fassungsvergleich: geänderte Definition und Kardinalität sind Bedeutung, ein neuer Kurztext mechanisch', () => {
  const F = path.join(B.FIXTURE, 'quellen');
  const alt = B.quelleLesen(path.join(F, 'fhir-probe-v1', 'StructureDefinition-Patient-probe.json')).elemente;
  const neu = B.quelleLesen(path.join(F, 'fhir-probe-v2', 'StructureDefinition-Patient-probe.json')).elemente;
  const ziele = ['PatientProbe#Patient.name.given', 'PatientProbe#Patient.name.family', 'PatientProbe#Patient.birthDate'];
  const v = B.fassungenVergleichen(alt, neu, ziele);
  assert.deepEqual(v.bedeutung.map((b) => b.ziel + ':' + b.felder.join(',')).sort(),
    ['PatientProbe#Patient.birthDate:definition', 'PatientProbe#Patient.name.family:min']);
  assert.deepEqual(v.mechanisch.map((m) => m.ziel), ['PatientProbe#Patient.name.given']);
  assert.deepEqual(v.weg, []);
  const ohne = Object.assign({}, neu); delete ohne['PatientProbe#Patient.birthDate'];
  assert.deepEqual(B.fassungenVergleichen(alt, ohne, ziele).weg, ['PatientProbe#Patient.birthDate'], 'ein verschwundenes Ziel wird genannt');
  assert.deepEqual(B.fassungenVergleichen(alt, neu, ['PatientProbe#Patient.contact.telecom']).bedeutung, [], 'nur abgebildete Ziele zählen');
});

test('[Bezüge·Vorschläge] der Namensvergleich liefert Kandidaten — und trägt nichts in die Tabelle ein', () => {
  const e = fixture();
  const vorher = JSON.stringify(e.tabelle);
  const r = B.erheben(e);
  const v = B.vorschlaege(e.register, r.datensaetze);
  const given = v.find((x) => x.kennung === 'identity.givenName');
  assert.ok(given && given.kandidaten.some((k) => k.ziel === 'PatientProbe#Patient.name.given'), JSON.stringify(given));
  assert.equal(JSON.stringify(e.tabelle), vorher);
});

test('[Bezüge·echt] die Tabelle im Repo passt zum Register, und die Abdeckung hält die Grundlinie (Ratsche: sie darf nur steigen)', () => {
  const lesen = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));
  const register = lesen('bereiche/feldkatalog.json');
  const tabelle = lesen('bereiche/bezuege.json');
  const lock = lesen('bereiche/bezuege-quellen.json');
  const grundlinie = lesen('tools/bezuege-grundlinie.json').datensaetze;
  const kennungen = new Set(register.felder.map((f) => f.kennung));
  for (const z of tabelle.zeilen) {
    assert.ok(kennungen.has(z.kennung), 'unbekannte Kennung in bereiche/bezuege.json: ' + z.kennung);
    assert.ok(Object.prototype.hasOwnProperty.call(B.GRADE, z.grad), 'unbekannter Grad: ' + z.kennung + ' ' + z.grad);
    assert.ok(lock.quellen.some((q) => q.datensatz === z.datensatz), 'Datensatz nicht gepinnt: ' + z.datensatz);
  }
  const zaehlen = {};
  for (const z of tabelle.zeilen) {
    const m = (zaehlen[z.datensatz] = zaehlen[z.datensatz] || {});
    if (m[z.kennung] !== 'ja') m[z.kennung] = B.GRADE[z.grad];
  }
  for (const [ds, g] of Object.entries(grundlinie)) {
    const werte = Object.values(zaehlen[ds] || {});
    assert.ok(werte.filter((w) => w === 'ja').length >= g.ja, ds + ': ja unter der Grundlinie');
    assert.ok(werte.filter((w) => w !== 'nein').length >= g.ja + g.teilweise, ds + ': ja+teilweise unter der Grundlinie');
  }
});

test('[Bezüge] die Kommandozeile gegen die Fixtures: Exit 0 und die Summen je Datensatz', () => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'bezuege-erheben.js')], { encoding: 'utf8', cwd: REPO });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /fhir-probe \(Fassung 1\.0\.0\): ja 3 · teilweise 0 · nein 3 von 6/);
});
