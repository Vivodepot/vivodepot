'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorab-Prüfung für Herausgeber: die Fälle gegen die echte Bürger-App (U2-ADR-496, 10.10.2026)
   ────────────────────────────────────────────────────────────────────────
   tools/vorlage-pruefen.js fährt jede Datei durch die Prüfer aus vivodepot.html. Hier läuft jeder Fall unter
   tests/fixtures/pruefregeln/ hindurch und muss das erwartete Urteil und die erwartete Regel treffen; keine Abweisung
   bleibt ohne Regelkennung. Die Regeldatei gilt gegen ihr Schema (JSON Schema 2020-12, streng kompiliert).

   Liegt unter tests/mit-modul/, weil das Schema ajv braucht (tests/schicht-1-ohne-lieferkette.test.js).
   Der Abgleich Regeldatei gegen Quelltext und die reine Funktion stehen in tests/pruefregeln-gegen-kern.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Ajv2020 = require('ajv/dist/2020').default;
const W = require('../../tools/vorlage-pruefen.js');
const { pruefeEinreichung } = require('../../tools/lib/vorab-pruefung.js');

const WURZEL = path.join(__dirname, '..', '..');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(WURZEL, 'docs', 'pruefregeln', 'pruefregeln-schema.json'), 'utf8'));
const kopie = (x) => JSON.parse(JSON.stringify(x));
let _u = null;
const umgebung = () => (_u || (_u = W.umgebung()));

test('[Prüfregeln·Schema] die Regeldatei gilt gegen ihr Schema; das Schema kompiliert streng (2020-12)', () => {
  assert.equal(SCHEMA.$schema, 'https://json-schema.org/draft/2020-12/schema');
  const validieren = new Ajv2020({ strict: true, allErrors: true }).compile(SCHEMA);
  const regeln = W.regelnLaden().regeln;
  assert.ok(validieren(kopie(regeln)), JSON.stringify(validieren.errors));
});

test('[Prüfregeln·Schema·Rot-Beweis] eine Regel ohne englischen Satz, mit fremder Schwere oder fremdem Schlüssel fällt', () => {
  const validieren = new Ajv2020({ strict: true, allErrors: true }).compile(SCHEMA);
  const basis = W.regelnLaden().regeln;
  const a = kopie(basis); delete a.regeln[0].satz.en;
  const b = kopie(basis); b.regeln[0].schwere = 'egal';
  const c = kopie(basis); c.regeln[0].preis = 1;
  for (const x of [a, b, c]) assert.equal(validieren(x), false);
});

test('[Vorab-Prüfung·Fälle] jeder Fall trifft Urteil und Regel; keine Abweisung bleibt ohne Regelkennung', () => {
  const r = W.fixturesPruefen(umgebung());
  assert.ok(r.faelle.length >= 200, 'Vorbedingung: die Fälle sind da (gefunden: ' + r.faelle.length + ')');
  assert.deepEqual(r.abweichungen, []);
});

test('[Vorab-Prüfung·Fälle·Rot-Beweis] ohne die Regel bleibt die Abweisung ohne Kennung, und der Lauf über die Fälle meldet es', () => {
  const u = Object.assign({}, umgebung());
  u.regeln = kopie(u.regeln);
  u.regeln.regeln = u.regeln.regeln.filter((x) => x.kennung !== 'vorlage.verweis-nicht-https');
  const r = W.fixturesPruefen(u);
  assert.ok(r.abweichungen.some((a) => /Verweis mit http: Abweisung ohne Regel/.test(a)), JSON.stringify(r.abweichungen));
});

test('[Vorab-Prüfung·Fälle·Rot-Beweis] ein falsch erwartetes Urteil fällt auf', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pruefregeln-rot-'));
  try {
    fs.writeFileSync(path.join(tmp, 'x.json'), JSON.stringify({ art: 'vorlage', faelle: [
      { name: 'leer, aber als bestanden erwartet', urteil: 'bestanden', dokument: { felder: [] } }] }));
    const r = W.fixturesPruefen(umgebung(), tmp);
    assert.equal(r.abweichungen.length, 1);
    assert.match(r.abweichungen[0], /Urteil abgewiesen, erwartet bestanden/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* Der Ordner der Fälle ist im Fixture-Wächter ausgenommen, weil er keine Depots trägt. Die Feldnamen darin prüft darum
   niemand außer den Prüfern der App, durch die jeder Fall läuft. Dieser Rot-Beweis hält genau das: ein Fall mit einem
   Feldnamen, den die App nicht kennt, kann nicht als bestanden durchgehen. */
test('[Vorab-Prüfung·Fälle·Rot-Beweis] ein Fall mit einem Feldnamen, den die App nicht kennt, verfehlt das erwartete Urteil', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pruefregeln-feldname-'));
  try {
    fs.writeFileSync(path.join(tmp, 'x.json'), JSON.stringify({ art: 'gemischt', faelle: [
      { name: 'Vorlage mit feldnam statt feldname', urteil: 'bestanden', dokument: { felder: [{ feldnam: 'Hausärztin', feldtyp: 'text' }] } },
      { name: 'Vorlage mit feldart statt feldtyp', urteil: 'bestanden', dokument: { felder: [{ feldname: 'Hausärztin', feldart: 'text' }] } },
      { name: 'Modul mit einem Schlüssel, den es nicht gibt', urteil: 'bestanden',
        dokument: { modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'probe', format: 'letter', papierformat: 'letter' } },
      { name: 'Anfrage mit kenung statt kennung', urteil: 'bestanden',
        dokument: { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Musteramt', zweck: 'Probe', grundlage: 'Mustersatzung', vorgang: 'ZZ-1',
          gueltigBis: '2099-12-31', felder: [{ kenung: 'identity.givenName', zweck: 'Name' }], antwort: { art: 'einmalpasswort' } } },
      { name: 'Gegenprobe: dieselbe Vorlage mit richtigen Feldnamen', urteil: 'bestanden', dokument: { felder: [{ feldname: 'Hausärztin', feldtyp: 'text' }] } },
    ] }));
    const r = W.fixturesPruefen(umgebung(), tmp);
    assert.equal(r.abweichungen.length, 4, JSON.stringify(r.abweichungen));
    assert.ok(r.abweichungen.some((a) => /feldnam statt feldname: Urteil abgewiesen/.test(a)));
    assert.ok(r.abweichungen.some((a) => /feldart statt feldtyp: Urteil abgewiesen/.test(a)));
    assert.ok(r.abweichungen.some((a) => /Schlüssel, den es nicht gibt: Urteil gemeldet/.test(a)));
    assert.ok(r.abweichungen.some((a) => /kenung statt kennung: Urteil abgewiesen/.test(a)));
    assert.equal(r.abweichungen.some((a) => /Gegenprobe/.test(a)), false);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Vorab-Prüfung] das Ergebnis trägt Regelfassung, beide Fingerabdrücke, die Fassung der App und die Art', () => {
  const u = umgebung();
  const e = pruefeEinreichung({ felder: [{ feldname: 'Hausärztin', feldtyp: 'text' }] }, u);
  assert.equal(e.urteil, 'bestanden');
  assert.equal(e.art, 'vorlage');
  assert.equal(e.regelFassung, u.regeln.fassung);
  assert.match(e.pruefregelnFingerabdruck, /^[0-9a-f]{64}$/);
  assert.match(e.kernFingerabdruck, /^[0-9a-f]{64}$/);
  assert.match(e.inhaltsFingerabdruck, /^sha256:[0-9a-f]{64}$/);
  assert.ok(e.kernFassung);
  /* Derselbe Inhalt in anderer Schlüsselfolge trägt denselben Fingerabdruck. */
  const f = pruefeEinreichung({ felder: [{ feldtyp: 'text', feldname: 'Hausärztin' }] }, u);
  assert.equal(f.inhaltsFingerabdruck, e.inhaltsFingerabdruck);
});

test('[Vorab-Prüfung] das Urteil ist das des Einlasswegs: was die App in ein leeres Depot einlässt, besteht', () => {
  const u = umgebung();
  const modul = { modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'probe', format: 'letter' };
  assert.equal(u.kern.einlassen(modul).angenommen, true);
  assert.equal(pruefeEinreichung(modul, u).urteil, 'bestanden');
  const kaputt = Object.assign({}, modul, { format: 'zz-kein-format' });
  assert.equal(u.kern.einlassen(kaputt).angenommen, false);
  assert.equal(pruefeEinreichung(kaputt, u).zeilen.find((z) => z.schwere === 'abweisung').regel, 'blattformat.format');
});

test('[Vorab-Prüfung·Werkzeug] --dokument: Ende-Code 0 bei bestanden, 1 bei abgewiesen, 2 bei nicht geprüft, 3 bei Lesefehler', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pruefregeln-cli-'));
  const werkzeug = path.join(WURZEL, 'tools', 'vorlage-pruefen.js');
  const lauf = (name, inhalt) => {
    const p = path.join(tmp, name);
    if (inhalt !== undefined) fs.writeFileSync(p, inhalt);
    try { return { code: 0, aus: execFileSync(process.execPath, [werkzeug, '--dokument', p, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
    catch (e) { return { code: e.status, aus: String(e.stdout || '') }; }
  };
  try {
    const gut = lauf('gut.json', JSON.stringify({ felder: [{ feldname: 'Hausärztin', feldtyp: 'text' }] }));
    assert.equal(gut.code, 0);
    assert.equal(JSON.parse(gut.aus).urteil, 'bestanden');
    const schlecht = lauf('schlecht.json', JSON.stringify({ felder: [{ feldname: 'Formular', feldtyp: 'verweis', ziel: 'http://example.org' }] }));
    assert.equal(schlecht.code, 1);
    assert.equal(JSON.parse(schlecht.aus).zeilen[0].regel, 'vorlage.verweis-nicht-https');
    assert.equal(lauf('fremd.json', JSON.stringify({ titel: 'irgendetwas' })).code, 2);
    assert.equal(lauf('kein.json', 'kein json').code, 3);
    assert.equal(lauf('fehlt.json').code, 3);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
