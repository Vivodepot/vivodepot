'use strict';
/* Befund ACADEMICDEGREE-OHNE-CLAIM (05.11.2026, geschlossen 08.11.2026) und seine Klasse.
   Der Doktorgrad (identity.academicDegree, U2-ADR-465 Nr. 35) hat im SD-JWT-VC Identität kein Ziel: das PID-Rulebook 1.7
   §4.1.1 kennt dafür keinen Claim, und ein erfundener Name wäre kein PID-Claim. Die Übersicht „Das wird herausgegeben“ zeigte
   ihn trotzdem als enthalten, weil für die Identität kein Eintrag in EXPORT_TOPF_B_FELDER stand. Dieselbe Lücke hatten vier
   Felder der Berufsausbildung bei den Bildungsangaben und die Steuersoftware bei den Finanzen.

   DIE REGEL: je Format ist Topf B genau die Menge der Bereichsfelder (ohne Listen), die das Mapping nicht abbildet, abzüglich
   der Felder, die der Baustein von Hand mitträgt. Ein Feld zu wenig zeigt die Übersicht als enthalten, obwohl es nie in der
   Datei steht; ein Feld zu viel nennt sie als nicht abbildbar, obwohl es hinausgeht. Jeder Aufruf von baueAusMapping mit einer
   benannten Mapping-Tabelle braucht eine Zeile in FORMATE, damit ein neues Format nicht an der Regel vorbeigeht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Je Mapping-Tabelle: die Exportformate, die sie füllen, und die Felder, die der Baustein außerhalb der Tabelle trägt. */
const FORMATE = Object.freeze([
  { mapping: 'VC_IDENTITAET_MAPPING', sektor: 'identity', formate: ['sd-jwt-vc-identitaet'],
    // family_name trägt secondLastName mit; die Anschrift baut sdJwtVcIdentitaet aus den Teilen (U2-ADR-467)
    getragen: ['secondLastName', 'streetAddress', 'postcodeCity', 'street', 'houseNumber', 'postalCode', 'city'] },
  { mapping: 'XOEV_VERWALTUNG_MAPPING', sektor: 'administration', formate: ['xoev-verwaltung', 'fim-json'], getragen: [] },
  { mapping: 'EDCI_BILDUNG_MAPPING', sektor: 'education', formate: ['bildungsangaben'], getragen: [] },
  { mapping: 'VC_FINANZEN_MAPPING', sektor: 'finance', formate: ['sd-jwt-vc-finanzen'], getragen: [] },
  { mapping: 'VC_SOZIALVERSICHERUNG_MAPPING', sektor: 'socialInsurance', formate: ['sd-jwt-vc-sozialversicherung'], getragen: [] },
]);

function skalarFelder(V, sektorId) {
  const s = V.SEKTOR_BY_ID[sektorId];
  const ids = [];
  for (const sek of (s && s.sektionen) || []) for (const f of sek.felder || []) if (f.typ !== 'liste') ids.push(f.id);
  return ids;
}

/* Rein: aus Kern-Konstanten und Topf B die Abweichungen je Format. */
function abweichungen(V, topfB) {
  const raus = [];
  for (const z of FORMATE) {
    const gedeckt = new Set((V[z.mapping] || []).map((m) => m.feld).concat(z.getragen));
    const soll = skalarFelder(V, z.sektor).filter((id) => !gedeckt.has(id));
    for (const format of z.formate) {
      const ist = topfB[format] || new Set();
      const fehlt = soll.filter((id) => !ist.has(id));
      const zuviel = [...ist].filter((id) => soll.indexOf(id) < 0);
      if (fehlt.length || zuviel.length) raus.push({ format, fehlt, zuviel });
    }
  }
  return raus;
}

/* Rein: die Mapping-Tabellen, die der Quelltext an baueAusMapping gibt, ohne Zeile in FORMATE. */
function ohneZeile(quelltext) {
  const bekannt = new Set(FORMATE.map((z) => z.mapping));
  const gefunden = new Set();
  for (const m of quelltext.matchAll(/baueAusMapping\(\s*'[A-Za-z]+'\s*,\s*([A-Z][A-Z0-9_]*_MAPPING)\b/g)) gefunden.add(m[1]);
  return [...gefunden].filter((n) => !bekannt.has(n)).sort();
}

test('[Topf B·Klasse] je Format nennt die Übersicht genau die Felder als nicht abbildbar, die das Mapping nicht trägt', () => {
  const { V } = ladeKern();
  assert.deepEqual(abweichungen(V, V.EXPORT_TOPF_B_FELDER), []);
});

test('[Topf B·Klasse] jede benannte Mapping-Tabelle an baueAusMapping hat eine Zeile in dieser Probe', () => {
  assert.deepEqual(ohneZeile(KERN), []);
  const { V } = ladeKern();
  for (const z of FORMATE) assert.ok(Array.isArray(V[z.mapping]), z.mapping + ' steht im Kern');
});

test('[Topf B·Rot-Beweis] eine Topf-B-Menge ohne den Doktorgrad wird gemeldet, ebenso ein Feld zu viel', () => {
  const { V } = ladeKern();
  const ohne = Object.assign({}, V.EXPORT_TOPF_B_FELDER);
  ohne['sd-jwt-vc-identitaet'] = new Set([...V.EXPORT_TOPF_B_FELDER['sd-jwt-vc-identitaet']].filter((id) => id !== 'academicDegree'));
  assert.deepEqual(abweichungen(V, ohne), [{ format: 'sd-jwt-vc-identitaet', fehlt: ['academicDegree'], zuviel: [] }]);
  const mehr = Object.assign({}, V.EXPORT_TOPF_B_FELDER);
  mehr['sd-jwt-vc-identitaet'] = new Set([...V.EXPORT_TOPF_B_FELDER['sd-jwt-vc-identitaet'], 'givenName']);
  assert.deepEqual(abweichungen(V, mehr), [{ format: 'sd-jwt-vc-identitaet', fehlt: [], zuviel: ['givenName'] }]);
  const keiner = Object.assign({}, V.EXPORT_TOPF_B_FELDER);
  delete keiner['sd-jwt-vc-identitaet'];
  assert.ok(abweichungen(V, keiner).some((a) => a.format === 'sd-jwt-vc-identitaet' && a.fehlt.indexOf('academicDegree') >= 0),
    'der Stand vor dem Fix (kein Eintrag für die Identität) wird gemeldet');
});

test('[Topf B·Rot-Beweis] eine neue Mapping-Tabelle ohne Zeile wird gemeldet', () => {
  const quelle = KERN + "\nconst x = baueAusMapping('health', VC_ERFUNDEN_MAPPING, {});\n";
  assert.deepEqual(ohneZeile(quelle), ['VC_ERFUNDEN_MAPPING']);
});

test('[ACADEMICDEGREE] der Doktorgrad steht in der Übersicht als nicht abbildbar und fehlt im Datensatz', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Walter');
  V.sektorFeldSetzen('identity', 'academicDegree', 'Dr. rer. nat.');
  const m = V.exportUebersichtModell('identity', 'sd-jwt-vc-identitaet');
  const e = [...m.enthalten, ...m.zurueckgehalten].find((x) => x.feld === 'academicDegree');
  assert.ok(e, 'der Doktorgrad steht in der Übersicht');
  assert.equal(e.formatOhneZiel, true, 'als nicht abbildbar benannt, nicht als enthalten');
  const g = [...m.enthalten, ...m.zurueckgehalten].find((x) => x.feld === 'givenName');
  assert.ok(g && !g.formatOhneZiel, 'Gegenprobe: der Vorname geht hinaus');
  const vc = V.sdJwtVcIdentitaet({});
  assert.ok(!JSON.stringify(vc.claims).includes('rer. nat.'), 'kein Claim trägt den Doktorgrad');
  assert.equal(vc.claims.given_name, 'Walter');
});
