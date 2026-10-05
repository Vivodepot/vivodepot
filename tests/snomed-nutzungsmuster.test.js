'use strict';
/* SNOMED GPS — das Nutzungsmuster (U2-ADR-446): unveränderter Begriff, keine Hierarchie, keine Beziehungen, keine
   Subsumption, kein ECL; jede genutzte Kennung ist im gepinnten GPS-Release aktiv. Öffentliche Probe: sie braucht nur das
   Messwerkzeug und die öffentliche Liste. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../tools/snomed-ids-messen.js');

const REPO = path.join(__dirname, '..');
const LISTE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'snomed-freigabe.json'), 'utf8'));
const PIN = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'standards-artefakte.json'), 'utf8')).find((a) => a.id.startsWith('snomed-gps-'));

test('[SNOMED·Muster] im Code keine Hierarchie, keine Beziehungen, keine Subsumption, kein ECL', () => {
  assert.deepEqual(M.erheben(REPO).hierarchie, []);
});

test('[SNOMED·Muster·Rot-Beweis] ECL-Operatoren, memberOf, is-a, subsumes und die IS-A-Kennung fallen; gewöhnlicher Code nicht', () => {
  const isA = ['1166', '80003'].join('');   // zur Laufzeit gefügt: als Literal fände der SNOMED-Erkenner sie hier
  for (const muster of ['<< 91936005', '< 91936005', '^ 91936005', "filter: [{ op: 'is-a', value: '91936005' }]", 'memberOf',
    'ValueSet.compose.include.filter.op = subsumes', "fetch(base + '/CodeSystem/$subsumes')", isA]) {
    assert.ok(M.HIERARCHIE.test(muster), 'nicht erkannt: ' + muster);
  }
  for (const harmlos of ['if (a < 10) b++', "code: '91936005'", 'x ^ y', 'if (n > 536870912) m++']) assert.ok(!M.HIERARCHIE.test(harmlos), harmlos);
});

test('[SNOMED·Muster] jede genutzte Kennung nennt genau den gepinnten GPS-Release und ist dort aktiv', () => {
  assert.ok(PIN && /^\d{8}$/.test(PIN.version) && /^[0-9a-f]{64}$/.test(PIN.sha256), 'der Release ist mit Version und SHA-256 gepinnt');
  const ids = Object.keys(LISTE.freigegeben);
  assert.ok(ids.length >= 11, 'Positivkontrolle');
  const abweichend = ids.filter((id) => { const g = LISTE.freigegeben[id].gps; return !g || g.aktiv !== true || g.release !== PIN.version; });
  assert.deepEqual(abweichend, [], 'Kennungen, die nicht gegen den gepinnten Release stehen');
});

test('[SNOMED·Edition] die Modul-Kennung einer Editions-URI zählt nicht als Konzept, dieselbe Zahl außerhalb schon (U2-ADR-471)', () => {
  const { idsInText } = require('../tools/snomed-ids-messen.js');
  const modul = ['900000000', '000207008'].join('');   // zur Laufzeit gefügt, sonst fände der Erkenner sie in dieser Datei
  assert.deepEqual([...idsInText('system http://snomed.info/sct, version http://snomed.info/sct/' + modul + '/version/20210731, code 408403008')], ['408403008']);
  assert.deepEqual([...idsInText('snomed, Modul ' + modul)], [modul], 'Rot-Beweis: ohne Editions-URI wird sie gezählt');
});
