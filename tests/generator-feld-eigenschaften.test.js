'use strict';
/* Der Generator reicht jede Feld-Eigenschaft durch, die der Kern liest („alle Feld-Eigenschaften", 16.09.2026). Vor dem Umbau fielen 22 davon im Paket weg, weil der
   Erzeuger eine eigene, kürzere Liste führte (`tools/feld-eigenschaften-rundlauf-messen.js`).
   Die Liste kommt jetzt aus dem Kern (TORWAECHTER-Region). Diese Proben halten die Bauform:
   was der Kern kennt, reist mit; was nur der Erzeuger kennt, steht benannt mit Grund und wird
   laut gemeldet; was niemand kennt, reist nicht. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeKern } = require('./load-kern.js');
const { EIGENSCHAFTEN, GENERATOR_NUR, rundlauf } = require('../tools/feld-eigenschaften-rundlauf-messen.js');

const { V: G } = ladeGenerator();
const KT = G.KERN_TORWAECHTER;
// Objekte aus dem Generator-Kontext (vm) haben fremde Prototypen — Vergleich über JSON.
const j = (x) => JSON.parse(JSON.stringify(x));
const basis = (zusatz) => Object.assign({ feldname: 'Probe', feldtyp: 'text', pflicht: false, bereich: 'identity' }, zusatz);
const anbieter = () => G.baueAnbieter({ anbieterName: 'Probe GmbH', rechtsform: 'GmbH', strasse: 'Weg 1', plz: '12345', ort: 'Ort',
  land: 'Deutschland', kontaktName: 'K', kontaktFunktion: 'F', kontaktEmail: 'k@probe.example', kontaktTelefon: '+49 30 1', bereich: 'health', useCase: 'x'.repeat(60) });
const konformitaet = (f) => G.pruefeKonformitaet({ felder: [f], anbieter: anbieter(), publicKeyJwk: { kty: 'OKP' } });

test('[Feld-Eigenschaften] die Schlüsselliste des Erzeugers ist die des Kerns plus die benannten eigenen', () => {
  const { V } = ladeKern();
  assert.deepEqual([...KT.FELD_SCHLUESSEL].sort(), [...V._TEMPLATE_FELD_BEKANNTE_SCHLUESSEL].sort(), 'Region trägt die Kern-Liste');
  const erwartet = new Set([...KT.FELD_SCHLUESSEL].filter((k) => !(k in G.FELD_NICHT_DURCHGEREICHT)).concat(G.GENERATOR_EIGENE_FELD_SCHLUESSEL));
  assert.deepEqual([...G.FELD_BEKANNTE_SCHLUESSEL].sort(), [...erwartet].sort());
});

test('[Feld-Eigenschaften] jede Kern-Eigenschaft der Messtabelle übersteht die Normalisierung', () => {
  for (const e of EIGENSCHAFTEN) {
    const feld = G.normalisiereFeld(basis(e.roh));
    for (const teil of e.schluessel.split('+')) {
      assert.ok(Object.prototype.hasOwnProperty.call(feld, teil), e.schluessel + ' fehlt nach normalisiereFeld: ' + JSON.stringify(feld));
    }
  }
});

test('[Feld-Eigenschaften] die Messtabelle deckt jede Kern-Eigenschaft — eine neue fällt hier auf', () => {
  const gedeckt = new Set(EIGENSCHAFTEN.flatMap((e) => e.schluessel.split('+')).concat(GENERATOR_NUR.map((e) => e.schluessel))
    .concat(['feldname', 'feldtyp', 'bereich', 'situation', '_vorlageVersion']));   // Sonderfälle des Werkzeugs
  const offen = [...KT.FELD_SCHLUESSEL].filter((k) => !gedeckt.has(k));
  assert.deepEqual(offen, [], 'Kern-Eigenschaft ohne Zeile in tools/feld-eigenschaften-rundlauf-messen.js');
});

test('[Feld-Eigenschaften·Rot-Beweis] eine erfundene Eigenschaft reist nicht mit und wird gemeldet', () => {
  const b = G.normalisiereFeldBefund(basis({ kardinalitaet: 'viele' }));
  assert.equal(b.feld.kardinalitaet, undefined);
  assert.ok(b.angeglichen.some((a) => a.was === 'kardinalitaet'));
});

test('[Feld-Eigenschaften·Rot-Beweis] die abzustreifenden Eigenschaften sind genau die gemessene Differenz, jede mit Grund', () => {
  const differenz = G.GENERATOR_EIGENE_FELD_SCHLUESSEL.filter((k) => k !== '_typRoh' && !KT.FELD_SCHLUESSEL.has(k)).sort();
  const abzustreifen = Object.keys(G.FELD_OHNE_KERN_VERBRAUCHER).filter((k) => !KT.FELD_SCHLUESSEL.has(k)).sort();
  assert.deepEqual(j(abzustreifen), j(differenz));
  for (const [k, grund] of Object.entries(G.FELD_OHNE_KERN_VERBRAUCHER)) assert.match(grund, /^Kern hat keinen Verbraucher — .{20,}/, 'Grund fehlt: ' + k);
  assert.match(G.FELD_OHNE_KERN_VERBRAUCHER.provenienzPflichtig, /U2-ADR-005/);
});

test('[Feld-Eigenschaften·Rot-Beweis] kein Feld, das der Kern ganz verwirft: abgestreift und laut gemeldet', () => {
  for (const zusatz of [{ quelle: 'neu' }, { depotSchema: { typ: 'einfach', sektor: 'identity', feld: 'givenName' } }, { kennung: 'identity.givenName' }]) {
    const k = Object.keys(zusatz)[0];
    const b = G.normalisiereFeldBefund(basis(zusatz));
    assert.equal(b.feld[k], undefined, k + ' reist nicht mehr mit');
    assert.ok(b.angeglichen.some((a) => a.was === k && /^ACHTUNG/.test(a.klartext)), k + ' laut gemeldet');
    assert.deepEqual(j(G.fehlstellenAuskunft({ felder: [b.feld] }).feldVerworfen), [], k + ': das Feld kommt an');
    assert.ok(konformitaet(basis(zusatz)).warnungen.some((w) => new RegExp('^ACHTUNG .*„' + k + '"').test(w)));
  }
  // Die Auskunft selbst sieht ein rohes Feld mit fremder Eigenschaft weiterhin als „kommt NICHT an".
  const a = G.fehlstellenAuskunft({ felder: [basis({ quelle: 'neu' })] });
  assert.deepEqual(j(a.feldVerworfen), [{ feldname: 'Probe', schluessel: ['quelle'] }]);
  assert.match(G.fehlstellenSaetze(a).join(' '), /kommt NICHT an/);
  // Gegenprobe: ein Feld nur mit Kern-Eigenschaften meldet nichts.
  const sauber = G.normalisiereFeldBefund(basis({ entitaet: 'person', rolle: 'Nachfolge' }));
  assert.deepEqual(j(sauber.angeglichen), []);
  assert.ok(!konformitaet(sauber.feld).warnungen.some((w) => /^ACHTUNG/.test(w)));
});

test('[Feld-Eigenschaften] provenienzPflichtig: false reist mit, wirkt nicht und wird laut gemeldet (U2-ADR-005)', () => {
  const b = G.normalisiereFeldBefund(basis({ provenienzPflichtig: false }));
  assert.equal(b.feld.provenienzPflichtig, false);
  assert.ok(b.angeglichen.some((a) => a.was === 'provenienzPflichtig' && /ACHTUNG/.test(a.klartext)));
  assert.ok(konformitaet(b.feld).warnungen.some((w) => /^ACHTUNG .*provenienzPflichtig/.test(w)));
  assert.deepEqual(j(G.normalisiereFeldBefund(basis({})).angeglichen), [], 'Default true meldet nichts');
});

test('[Feld-Eigenschaften] Sprachvarianten am Feldnamen bleiben ein Objekt, und der Torwächter prüft sie', () => {
  const f = G.normalisiereFeld(basis({ feldname: { de: ' Nachfolge ', en: 'Successor' } }));
  assert.deepEqual(j(f.feldname), { de: 'Nachfolge', en: 'Successor' });
  assert.equal(KT.validateTemplate({ felder: [f] }), null, 'vorher ReferenceError: _istSprachvariantenObjekt fehlte in der Region');
  assert.deepEqual(j(konformitaet(f).blocker), []);
  assert.equal(G.feldnameText(f.feldname), 'Nachfolge');
});

test('[Feld-Eigenschaften] situation statt bereich — benannte Liste, kein freies Ziel', () => {
  const ok = G.normalisiereFeld({ feldname: 'S', feldtyp: 'text', pflicht: false, situation: KT.SITUATION_IDS[0] });
  assert.equal(ok.bereich, undefined);
  assert.equal(ok.situation, KT.SITUATION_IDS[0]);
  assert.deepEqual(j(konformitaet(ok).blocker), []);
  assert.deepEqual(j(G.validiereSubmission(G.baueSubmission({ anbieter: anbieter(), publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' }, felder: [ok] }))
    .filter((z) => /situation|bereich/.test(z))), []);
  const frei = G.normalisiereFeld({ feldname: 'S', feldtyp: 'text', pflicht: false, situation: 'erfundene-situation' });
  assert.ok(konformitaet(frei).blocker.some((z) => /gültige Situation fehlt/.test(z)));
  // Beides zugleich lehnt das Schema ab (genau eins von beiden, U2-ADR-246).
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs/template-generator/submission-schema.json'), 'utf8'));
  const feldSchema = schema.properties.templates.items.properties.felder.items;
  assert.ok(G._validateSchema(feldSchema, { feldname: 'S', feldtyp: 'text', pflicht: false, bereich: 'identity', situation: 'geburt' }).length > 0);
  assert.ok(G._validateSchema(feldSchema, { feldname: 'S', feldtyp: 'text', pflicht: false }).length > 0);
});

test('[Feld-Eigenschaften] die Verweis-Arten im Schema sind die des Kerns', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs/template-generator/submission-schema.json'), 'utf8'));
  const felder = schema.properties.templates.items.properties.felder.items;
  assert.deepEqual(felder.properties.entitaet.enum, j([...KT.ENTITAET_BEKANNT]));
  assert.deepEqual(felder.properties.unterFelder.items.properties.entitaet.enum, j([...KT.ENTITAET_BEKANNT]));
  assert.ok(konformitaet(G.normalisiereFeld(basis({ entitaet: 'haustier' }))).blocker.some((z) => /Verweis-Art/.test(z)));
});

test('[Feld-Eigenschaften] Rundlauf: Verweis und englischer Feldname kommen im Kern an', async () => {
  const roh = basis({ feldname: { de: 'Nachfolgerin', en: 'Successor' }, feldtyp: 'ref', entitaet: 'person', rolle: 'Nachfolge', verweisZweck: 'kontakt' });
  const { defs } = await rundlauf(G, [roh], 'probe-verweis');
  assert.equal(defs.length, 1, 'Feld im Kern angekommen');
  assert.equal(defs[0].entitaet, 'person');
  assert.equal(defs[0].rolle, 'Nachfolge');
  assert.equal(defs[0].beschriftungen && defs[0].beschriftungen.en, 'Successor');
});

test('[Feld-Eigenschaften·Rundlauf] ein Feld mit quelle/kennung kommt im Kern an — nicht mehr ganz verworfen', async () => {
  const roh = basis({ feldname: 'Mit fremder Eigenschaft', quelle: 'neu', kennung: 'identity.givenName' });
  const { defs, bericht } = await rundlauf(G, [roh], 'probe-abstreifen');
  assert.equal(defs.length, 1, 'vorher: unbekannte-eigenschaft, Feld verworfen — ' + JSON.stringify(bericht && bericht.defVerworfen));
});

test('[Feld-Eigenschaften·CSV] Gruppe, Verweis, Situation und Feldname je Sprache kommen aus der CSV an', () => {
  const csv = [
    'feldname,feldname_en,feldtyp,pflicht,bereich,situation,gruppe,entitaet,rolle,verweis_zweck',
    'Nachfolgerin,Successor,ref,nein,pro-gesellschaft-nachfolge,,Geplante Übergabe,person,Nachfolge,kontakt',
    'Nur Situation,,text,nein,,' + KT.SITUATION_IDS[0] + ',,,,',
  ].join('\n');
  const { felder, angeglichen } = G.felderAngleichungen(G.csvZuFelder(csv));
  assert.deepEqual(j(angeglichen), []);
  assert.deepEqual(j(felder[0].feldname), { de: 'Nachfolgerin', en: 'Successor' });
  assert.equal(felder[0].bereich, 'pro-gesellschaft-nachfolge');
  assert.equal(felder[0].gruppe, 'Geplante Übergabe');
  assert.equal(felder[0].entitaet, 'person');
  assert.equal(felder[0].rolle, 'Nachfolge');
  assert.equal(felder[0].verweisZweck, 'kontakt');
  assert.equal(felder[1].bereich, undefined);
  assert.equal(felder[1].situation, KT.SITUATION_IDS[0]);
});

test('[Feld-Eigenschaften·CSV·Rot-Beweis] eine unbekannte Spalte fällt nicht mehr still weg — sie wird gemeldet', () => {
  const csv = ['feldname,feldtyp,pflicht,bereich,kardinalitaet', 'X,text,nein,identity,viele'].join('\n');
  const { felder, angeglichen } = G.felderAngleichungen(G.csvZuFelder(csv));
  assert.equal(felder[0].kardinalitaet, undefined);
  assert.ok(angeglichen.some((a) => a.was === 'kardinalitaet'));
});
