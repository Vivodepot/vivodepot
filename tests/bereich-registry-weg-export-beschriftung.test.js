'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Rot-Beweis + Regression: `_exportBeschriftungenAnhaengen` muss `exporte[].
   labelSchluessel` auch für Bereiche auflösen, die über die Bereichs-Modul-
   Registry kommen (AB_WERK_BEREICH_QUELLEN/BEREICH_QUELLEN_EINGEBAUT/
   Depot-Module) — nicht nur für den Bündel-/bereichsErsatz-Erzeugungsweg
   (`_bereichAusBuendelErzeugen`).

   GEFUNDEN 17.09.2026 (Bereich-Umzug-Rundlauf, an `identity` gemessen): vor
   diesem Fix lieferte `AB_WERK_BEREICH_QUELLEN` einen Sektor mit `exporte:
   [{format, labelSchluessel}]` unverändert durch — `label` blieb `undefined`,
   sichtbar im Export-Auswahlfenster als „undefined" statt einer Beschriftung.
   `_templateExportePruefen` (vivodepot.html ~15642) validiert nur `.format`
   und reicht den Rest unverändert durch; die Auflösung lag bislang
   ausschließlich in `_bereichAusBuendelErzeugen`, das dieser Weg nie ruft.

   Dieser Test lädt einen Bereich MIT `.exporte` ausschließlich über
   `AB_WERK_BEREICH_QUELLEN` (keine Bündel-Beteiligung) und prüft direkt an
   `SEKTOR_BY_ID`, dass `label` aufgelöst und `labelSchluessel` entfernt ist —
   derselbe Massstab, den `_bereichAusBuendelErzeugen` für den Bündel-Weg
   längst einhält (s. U2-ADR-320-Tests). ════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');

// Zwei tatsächlich bekannte Export-Formate (dieselben, die `identity` nativ nutzt) — vermeidet,
// gegen `EXPORT_FORMAT_BY_ID` raten zu müssen; `_templateExportePruefen` verwirft ein Format,
// das dort nicht steht.
const SYNTHETISCHER_BEREICH = Object.freeze({
  modulTyp: 'bereich',
  moduleVersion: 1,
  herkunft: 'vivodepot',
  sprache: 'de',
  kennung: 'vivodepot/registry-export-beschriftung-test',
  fassung: 1,
  bereiche: {
    registryExportTestBereich: {
      id: 'registryExportTestBereich',
      format: 'GENERISCH',
      label: 'Registry-Export-Test-Bereich (synthetisch, nur Rot-Beweis)',
      exporte: [
        { format: 'sd-jwt-vc-identitaet', labelSchluessel: 'exportIdentitaetLabel' },
        { format: 'vcard-identitaet', labelSchluessel: 'exportVcardLabel' },
      ],
      sektionen: [{ id: 'test-sektion', felder: [{ id: 'testFeld', typ: 'text' }] }],
    },
  },
});

function _kernMitSynthetischemAbWerkBereichBauen(kernText) {
  const regionMatch = kernText.match(/const AB_WERK_BEREICH_QUELLEN = Object\.freeze\(\[\]\);/);
  if (!regionMatch) throw new Error('AB_WERK_BEREICH_QUELLEN (leere Region) nicht gefunden — Kern-Form geändert?');
  return kernText.replace(regionMatch[0],
    'const AB_WERK_BEREICH_QUELLEN = Object.freeze([' + JSON.stringify(SYNTHETISCHER_BEREICH) + ']);');
}

async function _sektorUeberAbWerkLaden() {
  // S8 (U2-ADR-428): die Beschriftung löst im deutschen Sprachmodul auf — das nackte Gerüst trägt es nicht; darum das Standardprodukt ohne seine Bereiche (Region bleibt leer).
  const kernText = require(path.join(REPO, 'tests', 'load-kern.js'))._standardProduktBaken(fs.readFileSync(KERN_PFAD, 'utf8'), { ohneBereiche: true });
  const kernMitBereich = _kernMitSynthetischemAbWerkBereichBauen(kernText);
  const tmp = path.join(os.tmpdir(), 'vivodepot-registry-export-beschriftung-test-' + process.pid + '.html');
  fs.writeFileSync(tmp, kernMitBereich, 'utf8');
  try {
    process.env.KERN_HTML_PATH = tmp;
    delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
    const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
    const { V } = ladeKern();
    await V.depotAnlegen('registry-export-beschriftung-test-pw');
    return V.SEKTOR_BY_ID['registryExportTestBereich'];
  } finally {
    delete process.env.KERN_HTML_PATH;
    delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
    fs.unlinkSync(tmp);
  }
}

test('Bereichs-Modul-Registry-Weg (AB_WERK_BEREICH_QUELLEN): exporte[].labelSchluessel löst zu .label auf', async () => {
  const sektor = await _sektorUeberAbWerkLaden();
  assert.ok(sektor, 'der synthetische Bereich muss über AB_WERK_BEREICH_QUELLEN in SEKTOR_BY_ID ankommen');
  assert.ok(Array.isArray(sektor.exporte) && sektor.exporte.length === 2, 'beide Export-Einträge müssen ankommen');
  for (const eintrag of sektor.exporte) {
    assert.equal(typeof eintrag.label, 'string', 'label muss eine aufgelöste Zeichenkette sein, nicht undefined');
    assert.ok(eintrag.label.trim().length > 0, 'label darf nicht leer sein');
    assert.equal('labelSchluessel' in eintrag, false, 'labelSchluessel darf nach der Auflösung nicht mehr am Objekt stehen');
  }
});
