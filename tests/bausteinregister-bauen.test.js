'use strict';
/* Proben zur Liste der Bausteine (Herausgeberbedingungen § 3 Abs. 6): abschließend aus dem Kern, Beschriftung DE/EN,
   Einstellen nur mit Vorlauf, kein Baustein verschwindet, die eingecheckte Fassung ist die heutige. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const B = require('../tools/bausteinregister-bauen.js');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const BESCHRIFTUNGEN = JSON.parse(fs.readFileSync(B.BESCHRIFTUNGEN_PFAD, 'utf8'));
const SCHEMAS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'schema-fassungen.json'), 'utf8'));
const kopie = (x) => JSON.parse(JSON.stringify(x));

test('[Bausteine] die Modularten aus dem Kerntext sind genau die des geladenen EINLASS_REGISTER, in derselben Reihenfolge', () => {
  const { V } = ladeKern();
  assert.deepEqual(B.modulartenAusKern(KERN), V.EINLASS_REGISTER.map((r) => r.typ));
});

test('[Bausteine] jede Modulart des Kerns hat genau einen Eintrag mit Beschriftung DE/EN und verzeichnetem Schema', () => {
  const liste = JSON.parse(B.bauen({}).json);
  assert.deepEqual(liste.bausteine.map((b) => b.typ), B.modulartenAusKern(KERN));
  for (const b of liste.bausteine) {
    assert.ok(b.label.de && b.label.en && b.zweck.de && b.zweck.en, b.typ);
    assert.match(b.schema.adresse, /^https:\/\/vivodepot\.de\/schemas\/.+-schema\.json$/, b.typ);
    assert.ok(Number.isInteger(b.schema.fassung) && b.schema.fassung >= 1, b.typ);
  }
  assert.equal(liste.lizenz.spdx, 'CC0-1.0');
  assert.match(liste.einleitung.de, /abschließend/);
  assert.match(liste.einleitung.de, /zusätzlich in Textform/);
});

test('[Bausteine·Rot-Beweis] eine neue Modulart im Kern ohne Eintrag und ein Eintrag ohne Modulart im Kern brechen ab', () => {
  const typen = B.modulartenAusKern(KERN);
  assert.throws(() => B.bausteineZusammensetzen({ typenImKern: typen.concat(['neuerTyp']), beschriftungen: BESCHRIFTUNGEN, schemaFassungen: SCHEMAS }),
    /neuerTyp steht im Kern, aber nicht in den Beschriftungen/);
  assert.throws(() => B.bausteineZusammensetzen({ typenImKern: typen.slice(1), beschriftungen: BESCHRIFTUNGEN, schemaFassungen: SCHEMAS }),
    new RegExp(typen[0] + ' fehlt im Kern und ist nicht eingestellt'));
});

test('[Bausteine] ein eingestellter Baustein bleibt in der Liste, auch wenn der Kern ihn nicht mehr kennt', () => {
  const typen = B.modulartenAusKern(KERN);
  const b = kopie(BESCHRIFTUNGEN);
  Object.assign(b.bausteine[0], { status: 'eingestellt', angekuendigtAm: '2027-01-04', eingestelltAb: '2027-04-04' });
  const aus = B.bausteineZusammensetzen({ typenImKern: typen.slice(1), beschriftungen: b, schemaFassungen: SCHEMAS });
  assert.equal(aus.length, typen.length);
  assert.equal(aus[aus.length - 1].typ, typen[0], 'der eingestellte steht am Ende');
  assert.equal(aus[aus.length - 1].eingestelltAb, '2027-04-04');
});

test('[Bausteine·Rot-Beweis] Einstellen braucht beide Daten und mindestens drei Monate Vorlauf', () => {
  const typen = B.modulartenAusKern(KERN);
  const mit = (felder) => { const b = kopie(BESCHRIFTUNGEN); Object.assign(b.bausteine[0], felder); return b; };
  assert.throws(() => B.bausteineZusammensetzen({ typenImKern: typen, beschriftungen: mit({ status: 'angekuendigt', angekuendigtAm: '2027-01-04', eingestelltAb: '2027-03-04' }), schemaFassungen: SCHEMAS }),
    /weniger als 3 Monate/);
  assert.throws(() => B.bausteineZusammensetzen({ typenImKern: typen, beschriftungen: mit({ status: 'angekuendigt', angekuendigtAm: '2027-01-04' }), schemaFassungen: SCHEMAS }),
    /braucht angekuendigtAm und eingestelltAb/);
  assert.throws(() => B.bausteineZusammensetzen({ typenImKern: typen, beschriftungen: mit({ angekuendigtAm: '2027-01-04' }), schemaFassungen: SCHEMAS }),
    /bereitgestellt und trägt trotzdem Daten/);
  B.bausteineZusammensetzen({ typenImKern: typen, beschriftungen: mit({ status: 'angekuendigt', angekuendigtAm: '2027-01-04', eingestelltAb: '2027-04-04' }), schemaFassungen: SCHEMAS });
});

test('[Bausteine·Rot-Beweis] ein verschwundener Baustein und eine veraltete eingecheckte Fassung sind rot', () => {
  const a = B.bauen({});
  const o = fs.mkdtempSync(path.join(os.tmpdir(), 'bausteine-'));
  try {
    const p = path.join(o, 'bausteine.json');
    fs.writeFileSync(p, a.json);
    assert.deepEqual(B.pruefen(a, p), []);
    const ohne = JSON.parse(a.json); ohne.bausteine = ohne.bausteine.slice(1);
    assert.match(B.pruefen({ json: JSON.stringify(ohne) }, p)[0], /verschwunden/);
    fs.writeFileSync(p, a.json.replace('"anzahl"', '"anzahl_alt"'));
    assert.ok(B.pruefen(a, p).some((x) => /entspricht nicht/.test(x)));
  } finally { fs.rmSync(o, { recursive: true, force: true }); }
});

test('[Bausteine] die eingecheckte Fassung ist die heutige (--check)', () => {
  assert.deepEqual(B.pruefen(B.bauen({})), []);
});

test('[Bausteine] die Seite lädt nichts von außen und nennt jede Modulart', () => {
  const a = B.bauen({});
  assert.ok(!/<script/i.test(a.html) && !/rel=["']?stylesheet/i.test(a.html));
  for (const b of a.bausteine) assert.ok(a.html.includes('id="' + b.typ + '"'), b.typ);
});
