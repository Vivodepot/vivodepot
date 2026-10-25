'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   ISO 4217 selbst laden (U2-ADR-480, Weg wie OPS)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Die Weitergabe der vollständigen Liste ist bei SIX nicht geregelt. Der Kern liefert nur die Codes der ausgelieferten
   Templates; die Person lädt list-one.xml selbst, der Kern prüft sie gegen den Pin (Größe, SHA-256, Veröffentlichungsdatum)
   und hält sie nur im Arbeitsspeicher. Die Probe arbeitet mit einer ERFUNDENEN Mini-Datei (Codes XAA/XAB, kein Inhalt der
   amtlichen Liste) und einem Pin aus deren eigenen Bytes. Die echte Datei prüft
   node tools/codelisten-amtlich-abgleich.js --iso4217 <list-one.xml>.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const ERFUNDEN = '<?xml version="1.0" encoding="UTF-8"?>\n<ISO_4217 Pblshd="2001-01-01">\n<CcyTbl>\n'
  + '<CcyNtry><CtryNm>ERFUNDEN A</CtryNm><CcyNm>Probe A</CcyNm><Ccy>XAA</Ccy></CcyNtry>\n'
  + '<CcyNtry><CtryNm>ERFUNDEN B</CtryNm><CcyNm>Probe B</CcyNm><Ccy>XAB</Ccy></CcyNtry>\n'
  + '<CcyNtry><CtryNm>ERFUNDEN C</CtryNm><CcyNm>Probe B</CcyNm><Ccy>XAB</Ccy></CcyNtry>\n'
  + '</CcyTbl>\n</ISO_4217>\n';
const pinFuer = (text, veroeffentlicht = '2001-01-01') => {
  const b = Buffer.from(text, 'utf8');
  return { veroeffentlicht, groesse: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') };
};

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen('iso4217-selbst-laden-2026!');
  V.akteurSelbstErklaeren('Tester');
  return V;
}

const codes = (V) => V.iso4217CodesImGebrauch().map((f) => f.code);
const fehlend = (V) => V.iso4217Abgleich().fehlend.map((f) => f.code + ' ' + f.wo);
// Ein zugelassenes Sprachmodul, das eine Währung setzt — wie das es/Ecuador-Modul der Persona P19. Zugelassen heißt seit dem
// Schutz-Wagen S4: ab Werk, Vor-Depot oder intern nachgeprüft; ein roh ins Depot gelegtes Modul verliert regeln.waehrung bei der
// Anmeldung (Probe tests/waehrung-nur-aus-saat.test.js). Die Probe setzt die Registry darum unmittelbar, wie dort.
function modulMitWaehrung(V, waehrung) {
  V.getData().textsprache = 'es';
  const reg = Object.assign(Object.create(null), V._TEXTSATZ_MODUL_REGISTRY);
  const es = {};
  Object.defineProperty(es, '_regeln', { value: { waehrung }, enumerable: false, configurable: true });
  reg.es = { '': es };
  V._TEXTSATZ_MODUL_REGISTRY = reg;
}

test('[ISO 4217·Abgleich] ohne geladene Liste: gegen die mitgelieferten Codes — die ausgelieferten Templates bestehen', async () => {
  const V = await depot();
  assert.ok(codes(V).includes('EUR') && V.iso4217CodesImGebrauch().some((f) => f.wo === 'rechtsraum:DE'), 'Vorbedingung: das DE-Template wird gesehen');
  const a = V.iso4217Abgleich();
  assert.equal(a.quelle, 'mitgeliefert');
  assert.deepEqual(a.fehlend, []);
});

test('[ISO 4217·Abgleich·Rot-Beweis] ohne Liste: ein Modul-Code außerhalb der mitgelieferten Codes ist rot', async () => {
  const V = await depot();
  modulMitWaehrung(V, 'JPY');
  assert.deepEqual(fehlend(V), ['JPY textsatz:es']);
  assert.match(V.iso4217StandSatz(), /JPY \(textsatz:es\)/);
});

test('[ISO 4217·Abgleich·Rot-Beweis] mit geladener Liste: ein Template-Code, der nicht in der amtlichen Fassung steht, ist rot', async () => {
  const V = await depot();
  const vorher = JSON.stringify(V.getData());
  const r = await V.iso4217Einlesen('list-one.xml', new Uint8Array(Buffer.from(ERFUNDEN)), pinFuer(ERFUNDEN));
  assert.deepEqual(r, { ok: true, veroeffentlicht: '2001-01-01', anzahl: 2 });
  assert.equal(JSON.stringify(V.getData()), vorher, 'nichts aus der Liste geht ins Depot');
  const a = V.iso4217Abgleich();
  assert.equal(a.quelle, 'amtlich');
  // Die erfundene Fassung kennt nur XAA/XAB: jeder echte Code der Templates fällt — auch EUR des DE-Templates.
  assert.ok(fehlend(V).includes('EUR rechtsraum:DE'), fehlend(V).join('\n'));
  assert.match(V.iso4217StandSatz(), /2001-01-01/);
  // Gegenprobe: ein Modul-Code, der in der Fassung steht, ist nicht rot.
  modulMitWaehrung(V, 'XAB');
  assert.ok(!fehlend(V).some((x) => x.startsWith('XAB')));
});

test('[ISO 4217·Abgleich·Rot-Beweis] ein Template-Feld aus dem Studio (codeSystem ISO 4217) mit einem Code außerhalb ist rot', async () => {
  const V = await depot();
  const tpl = { felder: [{ feldname: 'Vermögenswert', feldtyp: 'auswahl', pflicht: false, bereich: 'finanzen',
    codeSystem: 'urn:iso:std:iso:4217', codeWerte: [{ code: 'EUR', anzeige: 'EUR' }, { code: 'XYZ', anzeige: 'XYZ' }] }] };
  const def = V._templateFelderUebersetzen(tpl, V.SCHEMA_VERSION_AKTUELL, null, 'probe').feldDefinitionen[0];
  assert.equal(def.codeSystemId, 'iso4217', 'Vorbedingung: das Studio-Feld bindet an die Liste iso4217');
  const bereich = V.bereicheAlle()[0];
  const sektion = bereich.sektionen[0];
  sektion.felder.push(def);
  try {
    assert.deepEqual(fehlend(V).filter((x) => / feld:/.test(x)).map((x) => x.split(' ')[0]), ['XYZ']);
  } finally { sektion.felder.pop(); }
  assert.deepEqual(V.iso4217Abgleich().fehlend, [], 'ohne das Feld wieder grün');
});

test('[ISO 4217·selbst laden·Rot-Beweis] eine andere Datei, eine andere Fassung, eine Liste ohne Codes werden abgewiesen', async () => {
  const V = await depot();
  const bytes = (t) => new Uint8Array(Buffer.from(t));
  const geaendert = ERFUNDEN.replace('XAA', 'XAC');
  assert.equal((await V.iso4217Einlesen('x.xml', bytes(geaendert), pinFuer(ERFUNDEN))).grund, 'iso4217-pruefsumme');
  const andereFassung = ERFUNDEN.replace('2001-01-01', '2001-01-02');
  assert.equal((await V.iso4217Einlesen('x.xml', bytes(andereFassung), pinFuer(andereFassung))).grund, 'iso4217-falsche-fassung');
  const leer = ERFUNDEN.replace(/<Ccy>[A-Z]{3}<\/Ccy>/g, '');
  assert.equal((await V.iso4217Einlesen('x.xml', bytes(leer), pinFuer(leer))).grund, 'iso4217-ohne-codes');
  assert.equal((await V.iso4217Einlesen('x.xml', bytes('{}'), pinFuer('{}'))).grund, 'iso4217-keine-liste');
  assert.equal((await V.iso4217Einlesen('x.xml', new Uint8Array(0))).grund, 'iso4217-zu-gross');
  assert.equal(V.iso4217Abgleich().quelle, 'mitgeliefert', 'nach jeder Abweisung gilt die mitgelieferte Liste');
});

test('[ISO 4217·Texte] jeder Abweisungsgrund hat seinen Text, in DE und EN', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const gruende = [...new Set([...kern.matchAll(/grund: '(iso4217-[a-z-]+)'/g)].map((m) => m[1]))].sort();
  assert.ok(gruende.length >= 5, 'Vorbedingung: die Gründe werden gefunden (' + gruende.length + ')');
  for (const modul of ['textsatz-de-modul.json', 'textsatz-en-modul.json']) {
    const texte = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', modul), 'utf8')).texte;
    for (const g of gruende) {
      assert.ok(texte['strings:iso4217Fehler_' + g.replace(/-/g, '_') + '.text'], modul + ': kein Text für ' + g);
    }
  }
});

test('[ISO 4217·selbst laden] der Pin nennt die amtliche Datei; mit dem echten Pin wird eine erfundene Datei abgewiesen', async () => {
  const V = await depot();
  assert.equal(V.ISO4217_PIN.veroeffentlicht, '2026-09-17');
  assert.match(V.ISO4217_PIN.sha256, /^[0-9a-f]{64}$/);
  assert.equal((await V.iso4217Einlesen('list-one.xml', new Uint8Array(Buffer.from(ERFUNDEN)))).grund, 'iso4217-pruefsumme');
});

test('[ISO 4217·Wächter] die amtliche Liste liegt nicht im Repo — mitgeliefert sind nur die Codes der Templates', () => {
  const treffer = [];
  const lauf = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) lauf(p);
      else if (/\.xml$/.test(e.name) && fs.statSync(p).size < 2e6 && /<ISO_4217\b/.test(fs.readFileSync(p, 'utf8'))) treffer.push(path.relative(REPO, p));
    }
  };
  lauf(REPO);
  assert.deepEqual(treffer.filter((t) => !t.startsWith('tests/fixtures/codelisten-abgleich-erfunden/')), []);
});
