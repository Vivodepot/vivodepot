'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-1 — Betrag ohne Zahl („Die vier übrigen Wächter", 09.08.2026,
   Zug 1)
   ────────────────────────────────────────────────────────────────────────
   Prüft: kein Feld, dessen Beispiel einen Geldwert nennt, ist `typ:'text'`.
   Da der Feldtyp `'zahl'` im Schema heute nirgends existiert (gemessen, 0
   Vorkommen), kann kein Betragsfeld ihn tragen — die eigentliche Aussage
   dieser Klasse.

   Nicht vollständig entscheidbar wie W-8/W-7/W-12: „nennt einen Geldwert"
   ist eine Bedeutungsfrage. Enges, geldwert-spezifisches Muster (Ziffernfolge
   unmittelbar neben EUR/€) statt eines breiten Geld-Vokabular-Stichwortnetzes
   (Wörter wie „Wert"/„Guthaben"/„Rente" matchen sonst auch Nicht-Betragsfelder
   — gemessen: 25 Treffer mit einem Vokabular-Netz gegen 10 mit dem engen
   Zahl-Muster, 15 davon falsch-positiv). Grundlinie-geführt, rot nur bei
   einem NEUEN Fund.
   REICHWEITE (A443, 21.08.2026): Dieser Waechter laeuft ueber `SEKTOREN` — den EINGEBAUTEN
   Katalog. Angedockte Modul-Felder gibt es zur Bauzeit nicht; sie entstehen erst auf dem Geraet
   der Buergerin. Die REGEL greift dort trotzdem, weil die Traegererkennung `label` mitliest, und
   das ist belegt: `tools/andock-regeln-pruefen.js` faehrt sie gegen ein Fixture-Modul, in dem
   genau ein Feld sie verletzt, mit Positivkontrolle an einem sauberen Modul.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'w1-betrag-ohne-zahl-grundlinie.json');

// Ziffernfolge unmittelbar neben EUR/€ — ein echter Geldwert, kein Geld-Vokabular-Treffer.
const GELDWERT_MUSTER = /\d[\d.,]*\s?(EUR|€)|\b(EUR|€)\s?\d/;

function betragFunde(V) {
  const funde = [];
  const pruefe = (f, ort, carrier) => {
    if (f.typ !== 'text') return;
    const hay = (f.label || '') + ' ' + (f.beispiel || '');
    if (GELDWERT_MUSTER.test(hay)) funde.push({ carrier, id: f.id, label: f.label, beispiel: f.beispiel, ort });
  };
  for (const s of V.bereicheAlle()) {
    for (const sek of s.sektionen || []) {
      for (const f of sek.felder || []) {
        pruefe(f, s.id, 'Sektorfeld');
        for (const u of f.unterFelder || []) pruefe(u, s.id + '.' + f.id, 'Listen-Unterfeld');
      }
    }
  }
  return funde;
}

function schluesselFund(f) { return f.carrier + '|' + f.ort + '|' + f.id; }
function ladeGrundlinie() { return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')); }
function gateBewerten(funde, grundlinie) {
  const bekannt = new Set(grundlinie.map(schluesselFund));
  const neu = funde.filter((f) => !bekannt.has(schluesselFund(f)));
  return { neu, rot: neu.length > 0 };
}
function ermittleFunde(V) { return betragFunde(V); }

if (require.main === module) {
  const { ladeKern } = require('../tests/load-kern.js');
  const args = process.argv.slice(2);
  const { V } = ladeKern();
  const funde = ermittleFunde(V);
  if (args.includes('--grundlinie-schreiben')) {
    const vorhandene = fs.existsSync(GRUNDLINIE) ? ladeGrundlinie() : [];
    const bekannt = new Map(vorhandene.map((f) => [schluesselFund(f), f]));
    const ausgabe = funde.map((f) => bekannt.get(schluesselFund(f)) || Object.assign({}, f, {
      vermerk: 'Entscheidung offen', begruendung: 'automatisch übernommen — noch nicht klassifiziert',
    }));
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(ausgabe, null, 2) + '\n');
    console.log('Grundlinie geschrieben:', ausgabe.length, 'Einträge');
  } else if (args.includes('--json')) {
    console.log(JSON.stringify(funde, null, 2));
  } else if (args.includes('--gate')) {
    const grundlinie = ladeGrundlinie();
    const { neu, rot } = gateBewerten(funde, grundlinie);
    if (rot) {
      console.log('GATE ROT —', neu.length, 'neue(r) Fund(e) gegen die Grundlinie:');
      for (const f of neu) console.log(' ', schluesselFund(f));
      process.exitCode = 1;
    } else {
      console.log('GATE grün — kein neuer Fund gegen die Grundlinie (' + grundlinie.length + ' bekannt).');
    }
  } else {
    console.log(funde.length, 'Funde,', funde.length, 'gegen Grundlinie zu prüfen (--gate) oder --json/--grundlinie-schreiben');
  }
}

module.exports = { betragFunde, schluesselFund, ladeGrundlinie, gateBewerten, ermittleFunde, GELDWERT_MUSTER };
