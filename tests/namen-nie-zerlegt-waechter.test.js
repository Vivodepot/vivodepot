'use strict';
/* ═════════════════════════════════════════════════════════════════
   Wächter (U2-ADR-467): KEIN Export zerlegt einen Namen per Regel.

   Bis Schema 90 taten es zwei Stellen: die FHIR-RelatedPerson nahm das letzte Wort als `family`, und das
   Anlegen eines Kind-Depots das erste Wort als Vornamen. „Maria von der Heide“ wurde so zu Familienname „Heide“,
   „Dr. Hans-Peter Müller-Lüdenscheidt“ zu Vornamen „Dr. Hans-Peter“. Seit Schema 91 kommen Familienname und
   Vornamen nur aus den Feldern, die die Person selbst getrennt einträgt.

   Zwei Hälften, gegen die KLASSE, nicht gegen die zwei Fundstellen:
     1 · Kernsuche — kein `split` an Leerzeichen im eigenen Code von Kern und Lese-App (Fremdbibliotheken hinter
         `@vd-lib` ausgenommen). Grundlinie 0; Rot-Beweis per gepflanzter Zeile.
     2 · Durchlauf — die beiden Namen laufen durch die Ausgaben, die Namen tragen; keine trägt danach einen
         Namensteil, den niemand eingetragen hat.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html'];

// Eigener Code: alles außer den Fremdbibliotheken (je vom `@vd-lib`-Marker bis zum Ende ihres Skriptblocks).
function eigenerCode(roh) {
  let raus = '', i = 0;
  for (;;) {
    const m = roh.indexOf('<!-- @vd-lib', i);
    if (m < 0) return raus + roh.slice(i);
    raus += roh.slice(i, m);
    const ende = roh.indexOf('</script>', m);
    i = ende < 0 ? roh.length : ende;
  }
}
const LEERZEICHEN_SPLIT = /\.split\(\s*(?:\/\\s[+*]?\/[a-z]*|\/ \+?\/|' '|" ")\s*\)/g;
const fundstellen = (code) => (code.match(LEERZEICHEN_SPLIT) || []).length;

test('[Wächter·Kernsuche] kein Trennen an Leerzeichen im eigenen Code — Grundlinie 0', () => {
  for (const d of DATEIEN) {
    const code = eigenerCode(fs.readFileSync(path.join(REPO, d), 'utf8'));
    const treffer = [];
    code.split('\n').forEach((z, n) => { if (LEERZEICHEN_SPLIT.test(z)) treffer.push((n + 1) + ': ' + z.trim().slice(0, 140)); LEERZEICHEN_SPLIT.lastIndex = 0; });
    assert.deepEqual(treffer, [], d + ': ein Trennen an Leerzeichen zerlegt früher oder später einen Namen. Teile kommen aus '
      + 'eigenen Feldern (U2-ADR-467). Gehört die Stelle wirklich nicht zu Namen, anders schreiben (z. B. Zeichenklasse benennen).');
  }
});

test('[Wächter·Kernsuche·Rot-Beweis] eine gepflanzte Zerlegung wird gefunden, eine in der Fremdbibliothek nicht', () => {
  const roh = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const vorher = fundstellen(eigenerCode(roh));
  assert.equal(fundstellen(eigenerCode(roh.replace('function depotNormalisieren(d) {',
    'function depotNormalisieren(d) { const _t = String(name).trim().split(/\\s+/);'))), vorher + 1);
  assert.equal(fundstellen(eigenerCode(roh.replace('const SCHEMA_VERSION_AKTUELL', "x.split(' '); const SCHEMA_VERSION_AKTUELL"))), vorher + 1);
  assert.ok(fundstellen(roh) > vorher, 'Vorbedingung: die Fremdbibliothek trennt an Leerzeichen — sie muss ausgenommen sein');
});

const NAMEN = ['Maria von der Heide', 'Dr. Hans-Peter Müller-Lüdenscheidt'];
// Was eine Regel daraus machte: letztes Wort / alles davor, erstes Wort / Rest.
const GERATEN = NAMEN.flatMap((n) => { const w = n.split(' '); return [w[w.length - 1], w.slice(0, -1).join(' '), w[0], w.slice(1).join(' ')]; });

function aufgesetzt() {
  const { V } = ladeKern();
  V.setData(V.depotNormalisieren({ schemaVersion: 91, sektoren: { identity: { givenName: 'Erika', familyName: 'Mustermann', birthDate: '1960-01-01' } },
    menschen: NAMEN.map((name, i) => ({ id: 'p' + i, name })), verwalteteDepots: [] }));
  V.akteurSelbstErklaeren('Erika Mustermann');
  return V;
}

test('[Wächter·Durchlauf] vCard der Personen: kein N aus einem Ein-Feld-Namen', () => {
  const V = aufgesetzt();
  const vcard = String(V.vcardMenschen());
  for (const n of NAMEN) assert.ok(vcard.includes('FN:' + n), 'der Name selbst geht unverändert mit: ' + n);
  assert.equal(/^N:/m.test(vcard), false, 'N entstünde nur aus geratenen Teilen:\n' + vcard);
});

test('[Wächter·Durchlauf] FHIR-RelatedPerson der vertretenden Person: nur `text`, kein family/given', () => {
  const V = aufgesetzt();
  for (const name of NAMEN) {
    const b = V.fhirIpsBundle(new Date('2026-10-01T10:00:00Z'), { anker: { name, beziehungCode: 'CHILD' } });
    const rp = b.entry.map((e) => e.resource).find((r) => r.resourceType === 'RelatedPerson');
    assert.deepEqual(rp.name, [{ text: name }], name);
    const json = JSON.stringify(b);
    for (const g of GERATEN) assert.equal(json.includes('"family":"' + g + '"'), false, 'family „' + g + '“');
  }
});

test('[Wächter·Durchlauf] eingetragene Teile gehen mit, so wie sie eingetragen sind', () => {
  const V = aufgesetzt();
  V.personAktualisieren('p0', { familyName: 'von der Heide', givenName: 'Maria' });
  assert.ok(String(V.vcardMenschen()).includes('N:von der Heide;Maria;;;'));
  const b = V.fhirIpsBundle(new Date('2026-10-01T10:00:00Z'),
    { anker: { name: 'Maria von der Heide', familyName: 'von der Heide', givenName: 'Maria', beziehungCode: 'CHILD' } });
  const rp = b.entry.map((e) => e.resource).find((r) => r.resourceType === 'RelatedPerson');
  assert.deepEqual(rp.name, [{ text: 'Maria von der Heide', family: 'von der Heide', given: ['Maria'] }]);
});
