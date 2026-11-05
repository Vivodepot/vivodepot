'use strict';
/* SUB-SONDERLOCKEN·S8 (30.10.2026, Nachtrag zu U2-ADR-124 und U2-ADR-235): ein Teil-Depot geht als gewöhnliche Depot-Datei
   hinaus, mit Kopf und dem Kennzeichen `art: "sub"`. Das Kennzeichen liegt außerhalb der eingefrorenen Basismenge und ist über
   fremdHash gebunden (Wort Krypto 30.10.2026: nicht in UMSCHLAG_FELDER_BASIS); es nennt keine Person (Rechtsraum 30.10.2026).
   Die Blackbox-Hülle bis v969 wird nur noch gelesen. Proben in beide Richtungen: alte Hülle → neuer Leser, neue Datei → jeder
   Lesepfad (Startseite, Einhängen, Lese-App, Prüfprogramm). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { dateiPruefen } = require('../tools/format-pruefen.js');

const PW_ANKER = 'anker-s8-pw-1234';
const PW_SUB = 'sub-s8-pw-5678';
const HUELLE = 'vivodepot-blackbox-export';
const kopie = (o) => JSON.parse(JSON.stringify(o));

async function subUmschlag() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW_ANKER);
  const inhalt = { schemaVersion: 20, verwaltungsTyp: 'verwaltet', sektoren: { identity: { givenName: 'Sub-Ida' } }, menschen: [], situationen: {} };
  return { V, umschlag: await V.subDepotVersiegeln(inhalt, PW_SUB) };
}
async function empfaenger() {
  const { V } = ladeKern();
  await V.depotAnlegen('empfaenger-s8-pw-9012');
  V.akteurSelbstErklaeren('Empfänger S8');
  return V;
}
// Eine Hülle wie bis v969: der Umschlag ohne Kennzeichen, verbatim eingepackt.
function alteHuelle(umschlag) {
  const { art: _art, ...ohne } = kopie(umschlag);
  return { dateiTyp: HUELLE, formatVersion: 1, umschlag: ohne };
}

test('[S8·Schreiben] ein versiegeltes Teil-Depot trägt art: "sub", ein Anker nie', async () => {
  const { V, umschlag } = await subUmschlag();
  assert.equal(umschlag.art, 'sub', 'das Kennzeichen steht im Sub-Umschlag');
  assert.ok(!V.UMSCHLAG_FELDER_BASIS || !V.UMSCHLAG_FELDER_BASIS.includes('art'), 'art ist nicht in der Basismenge');
  const datei = V.depotDateiAusUmschlag(umschlag);
  assert.equal(datei.dateiTyp, undefined, 'keine Hülle mehr');
  assert.equal(datei.art, 'sub', 'die Depot-Datei trägt das Kennzeichen');
  for (const f of ['ct', 'iv', 'einheiten', 'umschlagTabelle', 'depotSalt', 'depotUUID']) {
    assert.deepEqual(datei[f], umschlag[f], f + ' verbatim, keine Re-Verschlüsselung');
  }
  const anker = await V.depotSerialisieren();
  assert.equal('art' in anker, false, 'ein Anker trägt das Kennzeichen nicht');
  const text = JSON.stringify(datei);
  assert.ok(!text.includes('Sub-Ida'), 'kein Personenbezug im Klartext');
});

test('[S8·Bindung] das Prüfprogramm findet die Bindung intakt; ein entferntes oder geändertes Kennzeichen fällt auf', async () => {
  const { V, umschlag } = await subUmschlag();
  const datei = V.depotDateiAusUmschlag(umschlag);
  const r = await dateiPruefen(V.dateiMitMagic(JSON.stringify(datei)), { passwort: PW_SUB });
  assert.equal(r.befunde.filter((b) => b.art === 'fehler').map((b) => b.code).join(','), '', 'die neue Datei hat keinen Fehler');
  assert.ok(r.geprueftBisStufe >= 2, 'geöffnet und die Bindung geprüft');
  for (const [name, aendern] of [['entfernt', (d) => { delete d.art; }], ['geändert', (d) => { d.art = 'anker'; }]]) {
    const d = kopie(datei); aendern(d);
    const rr = await dateiPruefen(V.dateiMitMagic(JSON.stringify(d)), { passwort: PW_SUB });
    assert.ok(rr.befunde.some((b) => b.code === 'VDF-BINDUNG-FREMD'), 'Kennzeichen ' + name + ': VDF-BINDUNG-FREMD');
  }
});

test('[S8·neu → alle Lesepfade] Startseite, Einhängen und Lese-App lesen die neue Datei als Teil-Depot', async () => {
  const { V, umschlag } = await subUmschlag();
  const datei = kopie(V.depotDateiAusUmschlag(umschlag));
  assert.equal(V._dateiTypErkennen(datei), 'blackbox', 'Startseite: als Übergabe-Datei erkannt');
  const E = await empfaenger();
  const eintrag = E.subDepotEinhaengen(kopie(datei), { bezeichnung: 'Ida', inhaberin: 'Ida' });
  const offen = await E.subDepotVertrauenOeffnen(eintrag.depotUUID, PW_SUB);
  assert.equal(offen.sektoren.identity.givenName, 'Sub-Ida', 'Einhängen und Öffnen');
  const { V: L } = ladeLesen();
  assert.equal(L.erkenneFormat(kopie(datei)), 'blackbox', 'Lese-App: als Teil-Depot erkannt');
  const gelesen = await L.leseDepotUmschlag(kopie(datei), PW_SUB);
  assert.equal(gelesen.sektoren.identity.givenName, 'Sub-Ida', 'Lese-App öffnet die Datei selbst als Umschlag');
});

test('[S8·alt → neuer Leser] die Hülle bis v969 bleibt in Startseite, Einhängen, Lese-App und Prüfprogramm lesbar', async () => {
  const { V, umschlag } = await subUmschlag();
  const alt = alteHuelle(umschlag);
  assert.equal(V._dateiTypErkennen(kopie(alt)), 'blackbox', 'Startseite');
  const E = await empfaenger();
  const eintrag = E.subDepotEinhaengen(kopie(alt), { bezeichnung: 'Ida', inhaberin: 'Ida' });
  assert.equal((await E.subDepotVertrauenOeffnen(eintrag.depotUUID, PW_SUB)).sektoren.identity.givenName, 'Sub-Ida', 'Einhängen');
  const { V: L } = ladeLesen();
  assert.equal(L.erkenneFormat(kopie(alt)), 'blackbox', 'Lese-App erkennt die Hülle');
  assert.equal((await L.leseDepotUmschlag(kopie(alt.umschlag), PW_SUB)).sektoren.identity.givenName, 'Sub-Ida', 'Lese-App öffnet');
  const r = await dateiPruefen(JSON.stringify(alt), {});
  assert.ok(r.befunde.some((b) => b.code === 'VDF-BLACKBOX-HUELLE'), 'Prüfprogramm erkennt die Hülle');
  assert.ok(!r.befunde.some((b) => b.art === 'fehler'), 'und meldet keinen Fehler');
});

test('[S8·ohne Kennzeichen] ein Teil-Depot ohne art (versiegelt vor v970) wird erst nach dem Öffnen erkannt', async () => {
  const { V, umschlag } = await subUmschlag();
  const { art: _art, ...ohne } = kopie(umschlag);
  const { V: L } = ladeLesen();
  assert.equal(L.erkenneFormat(kopie(ohne)), 'voll', 'vor dem Öffnen: eine Depot-Datei wie jede');
  const gelesen = await L.leseDepotUmschlag(kopie(ohne), PW_SUB);
  assert.equal(gelesen.verwaltungsTyp, 'verwaltet', 'nach dem Öffnen zeigt der Inhalt die Stellung');
  const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  assert.match(LESEN, /art === 'sub' \|\| obj\.verwaltungsTyp === 'verwaltet' \|\| obj\.verwaltungsTyp === 'delegiert'/,
    'die Lese-App schaltet nach dem Öffnen auch am Verwaltungstyp in die Sub-Anzeige');
});

test('[S8·Einhängen] ein Kennzeichen mit anderem Wert wird abgewiesen, kein Eintrag entsteht', async () => {
  const { V, umschlag } = await subUmschlag();
  const huelle = { dateiTyp: HUELLE, formatVersion: 1, umschlag: Object.assign(kopie(umschlag), { art: 'anker' }) };
  const E = await empfaenger();
  const vorher = (E.getData().verwalteteDepots || []).length;
  assert.throws(() => E.subDepotEinhaengen(huelle, {}), /V4-Umschlag braucht genau die sechs Felder/);
  assert.equal((E.getData().verwalteteDepots || []).length, vorher, 'keine Mutation');
});

test('[S8·Einhängen] eine Depot-Datei mit fremder kryptoVersion wird lesbar abgewiesen, nie mit einer leeren Meldung', async () => {
  const { V, umschlag } = await subUmschlag();
  for (const altVer of [1, 2]) {
    const d = Object.assign(kopie(V.depotDateiAusUmschlag(umschlag)), { kryptoVersion: altVer });
    assert.throws(() => V.umschlagAusDatei(d), (e) => /^Einhängen: keine Depot-Datei\.$/.test(e.message),
      'Version ' + altVer + ': die Meldung, die das Einhängen anzeigt');
  }
  const E = await empfaenger();
  const d = Object.assign(kopie(V.depotDateiAusUmschlag(umschlag)), { kryptoVersion: 1 });
  assert.throws(() => E.subDepotEinhaengen(d, {}), /keine Depot-Datei/, 'auch die Aufnahme selbst');
});

/* Klasse: der Kern schreibt die Hülle nicht mehr. Der Name der Hülle steht genau einmal (als Konstante), und das einzige Objekt
   mit `dateiTyp: UMSCHLAG_HUELLE_ALT` baut der Kind-Datei-Vergleich, der den Stand einer alten Hülle nachrechnet. */
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
function huellenBauer(text) {
  const raus = new Set();
  let fn = null;
  for (const z of text.split('\n')) {
    const m = /^(async )?function ([A-Za-z_$][\w$]*)\(/.exec(z);
    if (m) fn = m[2];
    if (/dateiTyp:\s*UMSCHLAG_HUELLE_ALT/.test(z) && !/^\s*(\/\/|\*)/.test(z)) raus.add(fn);
  }
  return [...raus].sort();
}

test('[S8·Klasse] der Kern baut keine Hülle zum Schreiben — nur der Vergleich mit dem Stand einer alten', () => {
  assert.equal(KERN.split("'" + HUELLE + "'").length - 1, 1, 'der Name der Hülle steht nur in der Konstante');
  assert.deepEqual(huellenBauer(KERN), ['_kindDateiStandHuelle']);
});

test('[S8·Klasse·Rot-Beweis] ein Weg, der wieder die Hülle schreibt, fiele auf', () => {
  const k = KERN.replace('function depotDateiAusUmschlag(umschlag) {',
    'function depotDateiAusUmschlag(umschlag) {\n  if (umschlag === 0) return { dateiTyp: UMSCHLAG_HUELLE_ALT, formatVersion: 1, umschlag };');
  assert.notEqual(k, KERN, 'Vorbedingung: depotDateiAusUmschlag steht im Kern');
  assert.deepEqual(huellenBauer(k), ['_kindDateiStandHuelle', 'depotDateiAusUmschlag']);
});
