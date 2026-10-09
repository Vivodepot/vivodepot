'use strict';
/* FIM-Bezüge im Produkt (U2-ADR-456, 30.09.2026): Kennung, Fassung und Freigabestatus je Depot-Feld, aus bereiche/bezuege.json in die
   Kern-Region FIM-BEZUEGE erzeugt, im fim-json-Export (unter dem Feld seit 07.10.2026 nicht mehr) — und der Export geprüft gegen die gepinnten Zeilen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const R = require('../tools/fim-bezuege-region.js');
const { exportPruefen } = require('../tools/fim-export-pruefen.js');

const REPO = path.join(__dirname, '..');
const lesen = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));
const TABELLE = lesen('bereiche/bezuege.json');
const LOCK = lesen('bereiche/bezuege-quellen.json');
const kopie = (o) => JSON.parse(JSON.stringify(o));

async function mitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('Probe-Passwort-lang-genug-123!');
  k.V.akteurSelbstErklaeren('Tester');
  k.V.sektorFeldSetzen('identity', 'familyName', 'Muster');
  k.V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  k.V.sektorFeldSetzen('identity', 'streetAddress', 'Hauptstraße 1');
  k.V.sektorFeldSetzen('identity', 'birthName', 'Beispiel');   // sensibel
  return k;
}

test('[FIM·Region] die Kern-Region ist genau die Tabelle (tools/fim-bezuege-region.js)', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const ist = R.regionAusKern(kern);
  assert.ok(ist, 'Region FIM-BEZUEGE fehlt oder ist doppelt');
  assert.equal(ist.text, R.regionText(R.zeilenAusTabelle(TABELLE, LOCK)));
});

test('[FIM·Region·Rot-Beweis] eine geänderte Tabellenzeile ergibt eine andere Region', () => {
  const t = kopie(TABELLE);
  t.zeilen.find((z) => z.datensatz === 'fim-baukasten').fassung = '9.9';
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.notEqual(R.regionAusKern(kern).text, R.regionText(R.zeilenAusTabelle(t, LOCK)));
});

test('[FIM·Name] ohne belegte Freigabe steht in der Region kein Name — auch wenn die Tabelle einen trüge', () => {
  const t = kopie(TABELLE);
  t.zeilen.find((z) => z.datensatz === 'fim-baukasten').name = 'erfundener Name';
  assert.ok(R.zeilenAusTabelle(t, LOCK).zeilen.every((z) => z.name === null));
  assert.ok(R.zeilenAusTabelle(TABELLE, LOCK).zeilen.every((z) => z.name === null), 'die echte Tabelle trägt keinen Namen');
  t.fimNamenFreigabe = { datum: '2026-10-14', beleg: 'erfunden für die Probe' };
  assert.ok(R.zeilenAusTabelle(t, LOCK).zeilen.some((z) => z.name === 'erfundener Name'), 'Rot-Beweis: mit Freigabe käme der Name durch');
});

/* [FIM·Anzeige] entfällt seit 07.10.2026: der Bezug steht nicht mehr unter dem Feld (Entscheidung „keine technischen Markierungen in der
   Benutzersicht“, gehalten von der Benutzersicht-Probe). Er bleibt in den Daten und im Export (unten). */

test('[FIM·Export] fim-json trägt Bezugsdatensatz, Stand und je Wert den gepinnten Bezug — und der Prüfer findet nichts', async () => {
  const { V } = await mitDepot();
  const exp = V.kernAPI.exportiere('fim-json');
  assert.equal(exp.bezugsdatensatz, 'fim-baukasten');
  assert.equal(exp.fimSchema, undefined);
  const name = exp.felder.find((f) => f.kennung === 'identity.familyName');
  assert.deepEqual(name.fimFeld, { id: 'F60000227', fassung: '1.1', freigabestatus: '6', fest: true });
  assert.equal(exp.freigabestatusListe, 'urn:xoev-de:fim:codeliste:xdatenfelder.freigabestatus');
  assert.equal(name.wert, 'Muster');
  const strasse = exp.felder.find((f) => f.kennung === 'identity.streetAddress');
  assert.equal(strasse.fimFeld.fest, false);
  assert.equal(exp.felder.find((f) => f.kennung === 'identity.birthName'), undefined, 'sensibel nur mit Zustimmung');
  assert.deepEqual(exportPruefen(exp, TABELLE, LOCK), []);
  const mit = V.kernAPI.exportiere('fim-json', { sensibel: true });
  assert.ok(mit.felder.find((f) => f.kennung === 'identity.birthName'), 'mit Zustimmung steht der Geburtsname da');
  assert.deepEqual(exportPruefen(mit, TABELLE, LOCK), []);
});

test('[FIM·Export·Rot-Beweis] falsche Fassung, falscher Status, fest statt nicht fest, erfundene Zeile, Name, fehlender Stand — je ein Befund', async () => {
  const { V } = await mitDepot();
  const echt = V.kernAPI.exportiere('fim-json');
  const faelle = [
    (e) => { e.felder.find((f) => f.fimFeld.id === 'F60000227').fimFeld.fassung = '1.0'; },
    (e) => { e.felder.find((f) => f.fimFeld.id === 'F60000227').fimFeld.freigabestatus = '2'; },
    (e) => { delete e.freigabestatusListe; },
    (e) => { e.felder.find((f) => f.fimFeld.id === 'G00000587').fimFeld.fest = true; },
    (e) => { e.felder.push({ kennung: 'identity.familyName', wert: 'x', fimFeld: { id: 'F99999999', fassung: '1', freigabestatus: '6', fest: true } }); },
    (e) => { e.felder[0].fimFeld.name = 'erfundener Name'; },
    (e) => { e.bezugsstand = 'Abruf 2000-01-01'; },
    (e) => { e.fimSchema = 'fim-stammdaten-0001'; },
  ];
  for (const aendern of faelle) {
    const e = kopie(echt);
    aendern(e);
    assert.ok(exportPruefen(e, TABELLE, LOCK).length > 0, 'kein Befund für: ' + aendern.toString());
  }
});
