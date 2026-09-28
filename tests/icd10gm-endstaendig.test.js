'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Jeder ICD-10-GM-Code der Code-Liste ist endständig; ein eingetragener
   Titel ist der amtliche (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund: die Liste führte E11.9, I10 und J45.9 — in der ICD-10-GM 2026 ist
   keiner davon endständig (je eine 5. Stelle verlangt). Seitdem führt sie die
   unspezifische Ausprägung der 5. Stelle: E11.90, I10.90, J45.99. Den
   amtlichen Titel (quellBegriff) trägt die Liste noch nicht — bis der
   Gerüst-Wächter Terminologie-Daten einordnen kann, fehlt coding.display wie
   bei ATC und LOINC. Steht einer da, muss er der amtliche sein.
   AUSZUG unten: aus dem Systematischen Verzeichnis der ICD-10-GM Version 2026
   des BfArM, abgerufen 27.09.2026
   (https://klassifikationen.bfarm.de/icd-10-gm/kode-suche/htmlgm2026/), je
   Kategorie der Titel der 4. Stelle und die 5. Stellen wörtlich. Der Titel
   eines fünfstelligen Codes ist „<Titel der 4. Stelle>: <5. Stelle>“ — so auch
   die Zi-Kodierhilfe (ICD-10-GM 2025, z. B. E11.90, I10.90).
   ROT-BEWEIS: E11.9 (nicht endständig); ein Titel, der vom amtlichen abweicht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const LISTE = require(path.join(__dirname, '..', 'code-listen', 'icd10.json'));
const BFARM_2026 = Object.freeze({
  'E11.9': { titel: 'Diabetes mellitus, Typ 2: Ohne Komplikationen', fuenfte: { 0: 'Nicht als entgleist bezeichnet', 1: 'Als entgleist bezeichnet' } },
  'I10.9': { titel: 'Essentielle Hypertonie, nicht näher bezeichnet', fuenfte: { 0: 'Ohne Angabe einer hypertensiven Krise', 1: 'Mit Angabe einer hypertensiven Krise' } },
  'J45.9': { titel: 'Asthma bronchiale, nicht näher bezeichnet', fuenfte: {
    0: 'Als gut kontrolliert und nicht schwer bezeichnet', 1: 'Als teilweise kontrolliert und nicht schwer bezeichnet',
    2: 'Als unkontrolliert und nicht schwer bezeichnet', 3: 'Als gut kontrolliert und schwer bezeichnet',
    4: 'Als teilweise kontrolliert und schwer bezeichnet', 5: 'Als unkontrolliert und schwer bezeichnet', 9: 'Ohne Angabe zu Kontrollstatus und Schweregrad' } },
});
// Kategorien ohne endständige Form unterhalb der 5. Stelle (Nicht-endständig im Auszug belegt).
const NICHT_ENDSTAENDIG = new Set(['E11', 'E11.9', 'I10', 'I10.9', 'J45', 'J45.9']);

function befund(daten) {
  const funde = [];
  for (const d of daten) {
    if (NICHT_ENDSTAENDIG.has(d.code)) { funde.push(d.code + ': nicht endständig'); continue; }
    const m = /^([A-Z]\d{2}\.\d)(\d)$/.exec(d.code);
    const k = m && BFARM_2026[m[1]];
    if (!k || !k.fuenfte[m[2]]) { funde.push(d.code + ': nicht im BfArM-Auszug'); continue; }
    const amtlich = k.titel + ': ' + k.fuenfte[m[2]];
    if (d.quellBegriff !== undefined && d.quellBegriff !== amtlich) funde.push(d.code + ': quellBegriff „' + d.quellBegriff + '" statt „' + amtlich + '"');
  }
  return funde;
}

test('[ICD-10-GM·endständig] jeder Code der Liste ist endständig; ein eingetragener Titel ist der amtliche der Fassung 2026', () => {
  assert.equal(LISTE.version, 'ICD-10-GM-2026-amtlich');
  assert.ok(LISTE.daten.length >= 3, 'Vorbedingung: die Liste trägt Codes');
  assert.deepEqual(befund(LISTE.daten), []);
});

test('[ICD-10-GM·endständig·Rot-Beweis] E11.9 und ein abweichender Titel fallen', () => {
  assert.deepEqual(befund([{ code: 'E11.9', quellBegriff: 'Diabetes mellitus Typ 2, ohne Komplikationen' }]), ['E11.9: nicht endständig']);
  assert.equal(befund([{ code: 'E11.90', quellBegriff: 'Diabetes mellitus Typ 2, ohne Komplikationen' }]).length, 1);
});
