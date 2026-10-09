'use strict';
/* erscheinungsbild-salbei-glas.test.js — Profil „Salbei mit Glas“ (U2-ADR-473 W5a, 06.10.2026)
   Das Profil entsteht allein über das Erscheinungsbild-Modul (Tokens + stil, ohne layout): Quelle und stil-Teil stehen in
   PROFIL_SALBEI_GLAS des Bauwerkzeugs tools/erscheinungsbild-modul.js. Die Probe hält: das eingecheckte Modul ist genau der Bau aus der Quelle,
   Kern und Bau urteilen „gültig“, es trägt kein layout (der Gateway-Riegel bleibt unberührt), und das Gerüst nennt den Profilnamen nicht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../tools/lib/produkt-text-erzeugen.js');
const { cssZuModul, modulText, stilBauen, schriftenBauen, SCHRIFTEN_HEUTE, PROFIL_SALBEI_GLAS: PROFIL } = require('../tools/erscheinungsbild-modul.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const MODUL_DATEI = PROFIL.ziel;

function kopfPruefen(modul) {
  const a = KERN.indexOf('<script id="erscheinungsbild">'); const e = KERN.indexOf('</script>', a);
  return vm.runInContext(KERN.slice(a + '<script id="erscheinungsbild">'.length, e) + ';({ p: erscheinungsbildPruefen })', vm.createContext({})).p(modul);
}

test('[Salbei mit Glas] das eingecheckte Modul ist genau der Bau aus der Quelle', () => {
  const stil = stilBauen({ reihenfolge: PROFIL.stilReihenfolge, ordner: path.join(path.dirname(PROFIL.stilReihenfolge), 'stil') });
  const gebaut = cssZuModul(fs.readFileSync(PROFIL.quelle, 'utf8'), PROFIL.id, { stil, schriften: schriftenBauen(SCHRIFTEN_HEUTE) });
  assert.equal(fs.readFileSync(MODUL_DATEI, 'utf8'), modulText(gebaut), 'das Modul neu bauen (tools/erscheinungsbild-modul.js mit den Pfaden aus PROFIL_SALBEI_GLAS)');
});

test('[Salbei mit Glas] Kern und Bau urteilen „gültig“, das Modul trägt kein layout', () => {
  const m = JSON.parse(fs.readFileSync(MODUL_DATEI, 'utf8'));
  const k = kopfPruefen(m);
  assert.equal(JSON.stringify([k.gueltig, k.verworfene, k.verstoesse]), JSON.stringify([true, [], []]));   // Arrays aus dem VM-Kontext: Vergleich über JSON
  assert.equal(P._erscheinungsbildPruefen(m, P.erscheinungsbildRegelnLesen(KERN)).gueltig, true);
  assert.ok(!m.layout || !Object.keys(m.layout).length, 'ein layout fiele unter die Layout-Brücke (Gateway-Nachzug)');
});

test('[Salbei mit Glas] das Gerüst nennt den Profilnamen nicht', () => {
  assert.ok(!/salbei-glas|Salbei mit Glas/i.test(KERN));
});

test('[Salbei mit Glas·Rot-Beweis] ein Modul mit layout und ein Modul, das nicht dem Bau entspricht, fallen auf', () => {
  const m = JSON.parse(fs.readFileSync(MODUL_DATEI, 'utf8'));
  const mitLayout = { ...m, layout: { faecher: { kopf: [] } } };
  assert.ok(mitLayout.layout && Object.keys(mitLayout.layout).length, 'Vorbedingung');
  assert.notEqual(modulText({ ...m, basis: { ...m.basis, '--ink': '#000001' } }), fs.readFileSync(MODUL_DATEI, 'utf8'));
  assert.ok(/salbei-glas/i.test(KERN + '\n/* salbei-glas */'), 'die Profilnamen-Probe sähe einen gepflanzten Namen');
});
