'use strict';
/* Produktwechsel: die Depot-Datei bringt ihre Daten mit. Ein Depot, das in einem Produkt angelegt wurde, kommt in einem
   ANDEREN Produkt mit Fach 6 (dokumente), Fach 12 (rechtsraumModule) und Fach 13 (standardVorlagen) der Mitschrift unverändert an. „Im selben Produkt
   wieder öffnen" beantwortet das nicht; der Zweifel entsteht erst beim Wechsel. Aufbau aus tests/produkt-html-erzeugen.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { depotImProduktAnlegen, depotImProduktLaden } = require('./produkt-html-erzeugen.js');

const PW = 'probe-passwort-produktwechsel-mitschrift-2026-09-20';
const kopie = (x) => JSON.parse(JSON.stringify(x));
const { STANDARD_VORLAGEN_PFADE_4 } = require('../tools/lib/vier-produkte.js');
const standardAusDateien = () => STANDARD_VORLAGEN_PFADE_4.map((p) => JSON.parse(require('node:fs').readFileSync(p, 'utf8')));

for (const [von, nach] of [['privat-en', 'pro-de'], ['pro-de', 'privat-en']]) {
  test('[Produktwechsel ' + von + ' → ' + nach + '] Mitschrift-Fach 6 (dokumente), Fach 12 (rechtsraumModule) und Fach 13 (standardVorlagen) kommen unverändert an', async () => {
    const { V, umschlag } = await depotImProduktAnlegen(von, PW);
    const erwartetDokumente = kopie(V.AB_WERK_DOKUMENTE_DE.dokumente);
    const erwartetRechtsraum = kopie(V.AB_WERK_RECHTSRAUM_PRODUKT);
    const erwartetStandard = standardAusDateien();
    assert.ok(Object.keys(erwartetDokumente).length === 3, 'Voraussetzung: ' + von + ' backt die drei Dokument-Wortlaute');
    assert.ok(erwartetRechtsraum.length > 0, 'Voraussetzung: ' + von + ' backt den deutschen Rechtsraum-Katalog');
    assert.equal(V.STANDARD_VORLAGEN.length, 4, 'Voraussetzung: ' + von + ' backt die vier Standardvorlagen');

    const { d } = await depotImProduktLaden(nach, kopie(umschlag), PW);
    assert.deepEqual(kopie(d.abWerkMitschrift.dokumente), erwartetDokumente, 'Fach 6 weicht nach dem Wechsel ab');
    assert.deepEqual(kopie(d.abWerkMitschrift.rechtsraumModule), erwartetRechtsraum, 'Fach 12 weicht nach dem Wechsel ab');
    assert.deepEqual(kopie(d.abWerkMitschrift.standardVorlagen), erwartetStandard, 'Fach 13 weicht nach dem Wechsel ab');
  });
}

test('[Produktwechsel·Rot-Beweis] ohne die Schreibzeilen der Fächer 6, 12 und 13 kommen alle nicht an — die Probe würde es merken', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');
  const { V: echt } = await depotImProduktAnlegen('privat-en', PW);
  const erwartetDokumente = kopie(echt.AB_WERK_DOKUMENTE_DE.dokumente);
  const erwartetRechtsraum = kopie(echt.AB_WERK_RECHTSRAUM_PRODUKT);
  const erwartetStandard = standardAusDateien();

  const html = fs.readFileSync(produktHtml('privat-en'), 'utf8');
  const ohne = html
    .replace('d.abWerkMitschrift.dokumente = m.dokumente;', '')
    .replace('d.abWerkMitschrift.rechtsraumModule = m.rechtsraumModule;', '')
    .replace('d.abWerkMitschrift.standardVorlagen = m.standardVorlagen;', '');
  assert.notEqual(ohne, html, 'Voraussetzung: die Schreibzeilen standen im Kern');
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wechsel-rot-')), 'vivodepot.html');
  fs.writeFileSync(tmp, ohne);
  try {
    const { V } = kernAus(tmp, { blank: true });
    await V.depotAnlegen(PW);
    const umschlag = await V.depotSerialisieren();
    const { d } = await depotImProduktLaden('pro-de', kopie(umschlag), PW);
    assert.notDeepEqual(kopie(d.abWerkMitschrift.dokumente), erwartetDokumente);
    assert.notDeepEqual(kopie(d.abWerkMitschrift.rechtsraumModule), erwartetRechtsraum);
    assert.notDeepEqual(kopie(d.abWerkMitschrift.standardVorlagen), erwartetStandard);
  } finally { fs.rmSync(path.dirname(tmp), { recursive: true, force: true }); }
});
