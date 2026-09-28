'use strict';
/* ════════════════════════════════════════════════════════════════════════
   SNOMED-Positivliste für Auslieferungen (26.09.2026, Befund HOCH)
   ────────────────────────────────────────────────────────────────────────
   Jede SNOMED-CT-Kennung in einem ausgelieferten Artefakt muss in
   tools/snomed-freigabe.json unter „freigegeben" stehen. „Nicht angefragt"
   oder „nicht offen" reicht nicht: der Register-Generator trug bis v806 zwei
   Kennungen, die weder freigegeben noch angefragt waren, eine davon inaktiv.
   Erkannt wird eine Kennung an ihrer Form (tools/snomed-ids-messen.js:
   Verhoeff, Partition, Umkreis um „snomed"), nicht an einer Liste.
   Genutzt von tests/snomed-auslieferung-positivliste.test.js (Quellen im
   Repo) und tools/register-ausliefern.js (der gebaute Upload-Ordner).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { idsInText } = require('../snomed-ids-messen.js');

function freigegebeneKennungen(repo = path.join(__dirname, '..', '..')) {
  return new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(repo, 'tools', 'snomed-freigabe.json'), 'utf8')).freigegeben));
}

// Kennungen im Text, die nicht freigegeben sind — sortiert, leer heißt: in Ordnung.
function nichtFreigegeben(text, freigegeben) {
  if (!/snomed/i.test(text)) return [];
  return [...idsInText(text)].filter((id) => !freigegeben.has(id)).sort();
}

// Über mehrere Dateien: ["<id> in <datei>", …]. `lesen` wirft bei Binärem/Fehlendem → übersprungen.
function befundInDateien(dateien, lesen, freigegeben) {
  const funde = [];
  for (const d of dateien) {
    let text;
    try { text = lesen(d); } catch (_) { continue; }
    for (const id of nichtFreigegeben(text, freigegeben)) funde.push(id + ' in ' + d);
  }
  return funde;
}

module.exports = { freigegebeneKennungen, nichtFreigegeben, befundInDateien };
