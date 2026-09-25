'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-051 — Template-Code-Listen (Reise-als-Daten, Datenmodell-Konzept v1.2 §4)
   ────────────────────────────────────────────────────────────────────────
   Templates bringen ihre Code-Listen als Daten mit (wie feldDefinitionen):
   validateTemplate (L3-Form) → _templateCodeListenUebersetzen (tpl_-Namensraum,
   Generator- → Registry-Vokabular) → importAnwenden (Ablage data.codeListen[],
   erste gewinnt, sofortige Registry) → _codeListenAusDepotAnmelden (Boot).
   Namensraum-Disziplin: App-Listen (icd10, snomedAllergen, …) sind strukturell
   unbeschattbar; die App-Stubs snomedImpfstoff/snomedImplantat sind ersatzlos
   ausgetragen (Codes reisen künftig im Template).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

// Minimal-gültiges Template (validateTemplate verlangt felder nicht-leer) + eigene Liste.
function tplMitListe() {
  return {
    felder: [{ feldname: 'Impfstoff', feldtyp: 'text', pflicht: false, bereich: 'health', codeSystem: 'impfstoffe' }],
    ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false,
    codeListen: [{ systemId: 'impfstoffe', uri: 'http://snomed.info/sct', version: '2026-07', kuerzel: 'SNOMED', lizenz: 'Anbieter-Lizenz',
      eintraege: [
        { code: '871751006', anzeige: 'Tetanus-Impfstoff' },
        { code: '871895005', anzeige: 'Influenza-Impfstoff', synonym: 'Grippe-Impfstoff' },
      ] }],
  };
}

async function editierbareSitzung() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  return { V, document };
}

test('[051] validateTemplate: codeListen-Form wird geprüft (ok / ohne systemId / leere eintraege / unvollständig)', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate(tplMitListe()), null, 'wohlgeformtes Template mit codeListen läuft durch');
  const ohneId = tplMitListe(); delete ohneId.codeListen[0].systemId;
  assert.match(String(V.validateTemplate(ohneId)), /systemId/, 'ohne systemId abgelehnt');
  const leer = tplMitListe(); leer.codeListen[0].eintraege = [];
  assert.match(String(V.validateTemplate(leer)), /eintraege/, 'leere eintraege abgelehnt');
  const kaputt = tplMitListe(); kaputt.codeListen[0].eintraege = [{ code: 'x' }];
  assert.match(String(V.validateTemplate(kaputt)), /unvollständig/, 'Eintrag ohne anzeige abgelehnt');
});

test('[051] Übersetzer: tpl_-Namensraum + Generator- → Registry-Vokabular + interne Kollision (erste gewinnt)', () => {
  const { V } = ladeKern();
  const u = V._templateCodeListenUebersetzen(tplMitListe());
  assert.equal(u.codeListen.length, 1);
  const l = u.codeListen[0];
  assert.equal(l.systemId, 'tpl_impfstoffe', 'tpl_-Namensraum (Präfix-Muster wie feldIds)');
  assert.equal(l.quellSystemId, 'impfstoffe');
  assert.equal(l.eintraege[0].anzeigeName, 'Tetanus-Impfstoff', 'anzeige → anzeigeName');
  assert.equal((l.eintraege[1].synonyme || []).join(','), 'Grippe-Impfstoff', 'synonym → synonyme[]');
  assert.equal(u.map['impfstoffe'], 'tpl_impfstoffe', 'map speist die Feld-Auflösung');
  // interne Kollision: zwei Listen → derselbe Slug
  const doppel = tplMitListe();
  doppel.codeListen.push({ systemId: 'Impfstoffe!', eintraege: [{ code: '1', anzeige: 'x' }] });   // slug: impfstoffe
  const u2 = V._templateCodeListenUebersetzen(doppel);
  assert.equal(u2.codeListen.length, 1, 'erste gewinnt');
  assert.equal(u2.verworfeneCodeListen.length, 1);
  assert.equal(u2.verworfeneCodeListen[0].grund, 'id-kollision');
});

test('[051] Feld-Auflösung: eigene Liste hat Vorrang — auch vor einer gleichnamigen App-Liste', () => {
  const { V } = ladeKern();
  // (a) normaler Fall: codeSystem referenziert die mitgebrachte Liste
  const cl = V._templateCodeListenUebersetzen(tplMitListe());
  const u = V._templateFelderUebersetzen(tplMitListe(), 26, cl.map);
  assert.equal(u.feldDefinitionen.length, 1);
  assert.equal(u.feldDefinitionen[0].codeSystemId, 'tpl_impfstoffe', 'Feld zeigt auf die MITGEBRACHTE Liste');
  // (b) Namensraum-Disziplin: ein Template, das "snomedAllergen" mitbringt, beschattet die App-Liste NICHT
  const frech = tplMitListe();
  frech.codeListen[0].systemId = 'snomedAllergen';
  frech.felder[0].codeSystem = 'snomedAllergen';
  const clF = V._templateCodeListenUebersetzen(frech);
  assert.equal(clF.codeListen[0].systemId, 'tpl_snomedallergen', 'eigene Liste wird namespaced');
  const uF = V._templateFelderUebersetzen(frech, 26, clF.map);
  assert.equal(uF.feldDefinitionen[0].codeSystemId, 'tpl_snomedallergen', 'Feld folgt der EIGENEN (namespaced) Liste');
  assert.ok(V.liesCodeListe('snomedAllergen'), 'App-Liste unangetastet registriert');
});

test('[051] importAnwenden: Ablage in data.codeListen[] + sofortige Registry + Präfix-Gate + erste gewinnt', async () => {
  const { V } = await editierbareSitzung();
  const cl = V._templateCodeListenUebersetzen(tplMitListe());
  const planBasis = { zeilen: [], listen: [], register: [], feldDefinitionen: [], verworfeneFelder: [] };
  // (a) Anwenden legt ab + registriert sofort (datalist ohne Neu-Laden)
  const r1 = V.importAnwenden(Object.assign({}, planBasis, { quelleLabel: 'Anbieter A', codeListen: cl.codeListen, verworfeneCodeListen: [] }));
  assert.equal(r1.codeListenGesetzt, 1);
  const d = V.getData();
  assert.equal(d.codeListen.length, 1);
  assert.equal(d.codeListen[0].systemId, 'tpl_impfstoffe');
  assert.equal(d.codeListen[0].quelle, 'Anbieter A', 'Provenienz der Liste');
  assert.ok(V.liesCodeListe('tpl_impfstoffe'), 'sofort in der Laufzeit-Registry');
  const codiert = V.codeWertAus('tpl_impfstoffe', 'Grippe-Impfstoff');
  assert.ok(V.istCodierterWert(codiert) && codiert.code === '871895005', 'Andock über Synonym funktioniert');
  // (b) fremdes Template, gleiche systemId → erste gewinnt, namentlich
  const r2 = V.importAnwenden(Object.assign({}, planBasis, { quelleLabel: 'Anbieter B', codeListen: cl.codeListen.map(x => Object.assign({}, x, { version: 'B-2027' })), verworfeneCodeListen: [] }));
  assert.equal(r2.codeListenGesetzt, 0);
  assert.equal(r2.codeListenVerworfen[0].grund, 'doppelt');
  assert.equal(V.getData().codeListen[0].quelle, 'Anbieter A', 'erste Liste intakt');
  // (c) eigenes Update (gleiche quelle) ersetzt
  const r3 = V.importAnwenden(Object.assign({}, planBasis, { quelleLabel: 'Anbieter A', codeListen: cl.codeListen.map(x => Object.assign({}, x, { version: '2027-01' })), verworfeneCodeListen: [] }));
  assert.equal(r3.codeListenGesetzt, 1);
  assert.equal(V.getData().codeListen.length, 1, 'ersetzt, nicht dupliziert');
  assert.equal(V.getData().codeListen[0].version, '2027-01');
  // (d) Präfix-Gate: eine un-namespaced Liste erreicht die Ablage nie
  const r4 = V.importAnwenden(Object.assign({}, planBasis, { quelleLabel: 'Anbieter C', codeListen: [{ systemId: 'icd10', eintraege: [{ code: 'X', anzeigeName: 'Böse' }] }], verworfeneCodeListen: [] }));
  assert.equal(r4.codeListenGesetzt, 0);
  assert.equal(r4.codeListenVerworfen[0].grund, 'praefix');
  assert.notEqual(V.liesCodeListe('icd10').daten[0].anzeigeName, 'Böse', 'App-Liste unbeschattet');
});

test('[051] Boot-Registrierung: data.codeListen[] wird beim Laden in die Registry gehoben (nur tpl_)', () => {
  const { V } = ladeKern();
  const depot = V.leeresDepot();
  depot.codeListen = [
    { systemId: 'tpl_implantate', uri: 'http://snomed.info/sct', kuerzel: 'SNOMED', quelle: 'Klinik-Template',
      eintraege: [{ code: '304120007', anzeigeName: 'Hüft-Totalendoprothese' }] },
    { systemId: 'boese_ohne_praefix', eintraege: [{ code: '1', anzeigeName: 'x' }] },   // wird übersprungen
    { systemId: 'tpl_defekt' },                                                          // ohne eintraege → übersprungen
  ];
  const n = V._codeListenAusDepotAnmelden(depot);
  assert.equal(n, 1, 'genau die eine wohlgeformte tpl_-Liste registriert');
  assert.ok(V.liesCodeListe('tpl_implantate'), 'nach dem Laden andockbar');
  assert.equal(V.liesCodeListe('boese_ohne_praefix'), null, 'Präfix-Disziplin auch beim Laden');
  assert.equal(V.codeListeSuche('tpl_implantate', 'Hüft').length, 1, 'Suche läuft über die gereiste Liste');
});

test('[051] Vertrags-Eingang: felderAusClaims (provider-credential) reicht codeListen namespaced in den Plan', () => {
  const { V } = ladeKern();
  const def = V.IMPORT_FORMAT_BY_ID['provider-credential'];
  const roh = def.felderAusClaims({ credentialSubject: { felder: [], template: tplMitListe() } });
  assert.equal(roh.codeListen.length, 1);
  assert.equal(roh.codeListen[0].systemId, 'tpl_impfstoffe', 'Plan trägt die namespaced Liste');
  assert.equal(roh.feldDefinitionen[0].codeSystemId, 'tpl_impfstoffe', 'Feld-Def zeigt auf dieselbe Liste');
  assert.equal(roh.verworfeneCodeListen.length, 0, 'nichts verworfen');
});

test('[051] App-Stubs ersatzlos ausgetragen: snomedImpfstoff/snomedImplantat weg, Rest der Registry intakt', () => {
  const { V } = ladeKern();
  assert.equal(V.liesCodeListe('snomedImpfstoff'), null, 'Stub ausgetragen (Codes reisen künftig im Template)');
  assert.equal(V.liesCodeListe('snomedImplantat'), null, 'Stub ausgetragen');
  for (const id of ['atc', 'icd10', 'loinc', 'snomedAllergen', 'esco', 'xoev-rollencode']) {
    assert.ok(V.liesCodeListe(id), 'App-Liste bleibt: ' + id);
  }
  // Schema 28: leeresDepot trägt codeListen[]; Alt-Depot bekommt die Liste additiv.
  assert.ok(Array.isArray(V.leeresDepot().codeListen) && V.leeresDepot().codeListen.length === 0);
  const alt = { schemaVersion: 25, sektoren: {} };
  V.depotNormalisieren(alt);
  assert.ok(Array.isArray(alt.codeListen), 'codeListen[] additiv angelegt');
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL, '25 -> 31 gehoben (U2-ADR-051)');
});
