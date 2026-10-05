'use strict';
/* Probe für den dauerhaften Sollwert der Marker-Region LIZENZ-WORTLAUT (tools/geruest-waechter-grundlinie.json,
   regionen.dauerhaft). Die Region trägt die Quellenangaben, die der Lizenzgeber IM weitergegebenen Exemplar
   verlangt — der Kern reist als einzelne Datei, eine NOTICE reist nicht mit:
     LOINC § 10 (loinc.org/license): „Any such product or service includes the following notice“,
     BfArM-Downloadbedingungen ICD-10-GM § 1: „Bei der Weitergabe sind die im Anhang … aufgeführten Quellenangaben
       (nach § 63 UrhG) aufzunehmen“,
     BfArM-Downloadbedingungen ATC-GM § 1: „In jedes maschinenlesbare Weitergabeexemplar ist die folgende
       Quellenangabe … aufzunehmen“.
   Jeder Wert der Region ist BYTE-GLEICH mit seiner Originaldatei unter code-listen/wortlaut/ (Herkunft und Weg in
   code-listen/wortlaut/README.md); kein Schlüssel ohne Datei, keine Datei ohne Schlüssel. So kann in der Region
   nichts anderes unterkommen: ein eigener Satz oder ein geändertes Zeichen ist rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const WORTLAUT = path.join(REPO, 'code-listen', 'wortlaut');
const LISTEN = fs.readdirSync(path.join(REPO, 'code-listen')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', f), 'utf8')));
const DATEIEN = fs.readdirSync(WORTLAUT).filter((f) => f.endsWith('.txt')).sort();

function regionText(kern) {
  const b = kern.indexOf('LIZENZ-WORTLAUT:BEGIN');
  const e = kern.indexOf('/* LIZENZ-WORTLAUT:END */');
  if (b < 0 || e < b) return null;
  return kern.slice(kern.indexOf('*/', b) + 2, e);
}

// Die Mängel der Region gegen die Originaldateien. Leer heißt: byte-gleich, vollständig, nichts dazu.
function maengel(region, dateien = DATEIEN, lesen = (d) => fs.readFileSync(path.join(WORTLAUT, d), 'utf8')) {
  if (region == null) return ['die Region LIZENZ-WORTLAUT fehlt im Kern'];
  const m = [];
  let werte;
  try {
    werte = vm.runInNewContext(region + '\n;LIZENZ_WORTLAUT');
  } catch (err) {
    return ['die Region ist nicht auswertbar: ' + err.message];
  }
  // Außer der einen Konstante (und Kommentaren, die kein Satz im Sinne des Gerüst-Wächters sind) steht nichts in der Region.
  const rest = region.replace(/const LIZENZ_WORTLAUT = Object\.freeze\(\{[\s\S]*?\n\}\);/, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (rest) m.push('neben LIZENZ_WORTLAUT steht weiterer Inhalt in der Region: ' + rest.slice(0, 60));
  const verweise = new Map(LISTEN.filter((l) => l.lizenzWortlaut).map((l) => [l.systemId, l.lizenzWortlaut]));
  for (const [schluessel, wert] of Object.entries(werte)) {
    const datei = verweise.get(schluessel);
    if (!datei) { m.push(schluessel + ': Schlüssel ohne Codeliste mit lizenzWortlaut'); continue; }
    if (!dateien.includes(datei)) { m.push(schluessel + ': Datei code-listen/wortlaut/' + datei + ' fehlt'); continue; }
    if (wert !== lesen(datei)) m.push(schluessel + ': weicht vom Original code-listen/wortlaut/' + datei + ' ab');
  }
  for (const [id, datei] of verweise) if (!(id in werte)) m.push(id + ': verweist auf ' + datei + ', steht aber nicht in der Region');
  for (const d of dateien) if (![...verweise.values()].includes(d)) m.push(d + ': Originaldatei, auf die keine Codeliste verweist');
  return m;
}

test('[LIZENZ-WORTLAUT] jeder Pflicht-Wortlaut steht byte-gleich mit seinem Original im Kern', () => {
  assert.deepEqual(DATEIEN, ['LOINC_short_license.txt', 'atc-gm-quellenangabe.txt', 'icd-10-gm-quellenangabe.txt', 'snomed-gps-hinweis.txt'], 'Vorbedingung: die vier Originale');
  assert.deepEqual(maengel(regionText(KERN)), []);
});

test('[LIZENZ-WORTLAUT] die Codeliste trägt in CODE-LISTEN nur den Verweis, und ihr lizenz-Feld ist das Original', () => {
  for (const l of LISTEN.filter((x) => x.lizenzWortlaut)) {
    assert.equal(l.lizenz, fs.readFileSync(path.join(WORTLAUT, l.lizenzWortlaut), 'utf8'), l.systemId);
    assert.ok(KERN.includes('lizenzWortlaut: ' + JSON.stringify(l.systemId) + ','), l.systemId + ': Verweis fehlt in CODE-LISTEN');
  }
});

test('[LIZENZ-WORTLAUT·Rot-Beweis] ein geändertes Zeichen, ein eigener Satz und ein weggelassener Wortlaut sind rot', () => {
  const region = regionText(KERN);
  assert.match(maengel(region.replace('Regenstrief', 'Regenstreif')).join('|'), /loinc: weicht vom Original/);
  assert.match(maengel(region.replace('(BfArM).",', '(BfArM). Eigener Zusatz.",')).join('|'), /atc: weicht vom Original/);
  assert.match(maengel(region.replace('\n});', ',\n  eigen: "Ein eigener Satz, der hier nicht hingehört."\n});')).join('|'), /eigen: Schlüssel ohne Codeliste/);
  assert.match(maengel(region + '\nconst X = "ein eigener Satz";').join('|'), /weiterer Inhalt/);
  assert.match(maengel(region.replace(/\n {2}icd10: .*/, '')).join('|'), /icd10: verweist auf icd-10-gm-quellenangabe\.txt, steht aber nicht/);
  assert.match(maengel(region, [...DATEIEN, 'fremd.txt']).join('|'), /fremd\.txt: Originaldatei, auf die keine Codeliste verweist/);
  assert.match(maengel(null).join('|'), /fehlt im Kern/);
});
