'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-11 — Mehrere Sachverhalte in einem Feld („Die vier übrigen
   Wächter", 09.08.2026, Zug 4)
   ────────────────────────────────────────────────────────────────────────
   Prüft: kein Beispiel mit mehr als zwei Angaben. „Angabe" ist hier
   strukturell gemessen — ein durch Komma oder Semikolon getrennter,
   nicht-leerer Abschnitt des Beispieltexts. Das ist ein INDIZ, kein
   Beweis (so der Auftrag selbst): ein aufzählendes Beispiel (drei
   Lebensmittel, drei Wünsche) zählt strukturell genauso wie ein Beispiel,
   das mehrere Sachverhalte in ein Feld quetscht (Bank + Betrag + Kontoart).
   Die Trennung leistet die Grundlinie, nicht dieser Zähler — jeder
   Eintrag trägt eine Einordnung (aufzählend/quetschend) in der
   Begründung, bei „Entscheidung offen" zusätzlich einen Zerlegungs-
   Vorschlag.

   GEMESSEN: 16 Fundstellen (Auftrag zitiert „mindestens zwölf" — trifft,
   16 ≥ 12).
   REICHWEITE (A443, 21.08.2026): dieser Waechter misst allein `beispiel`. Gemessen an
   `_templateDefAlsFeld`: `beispiel` reist NIE an ein angedocktes Feld mit. Die Regel laeuft dort
   strukturell ins Leere — ihre Auslassung ist folgerichtig, KEINE Luecke. Festgenagelt in
   `tests/a443-andock-regeln.test.js`: reist `beispiel` eines Tages doch mit, wird die Probe rot
   und W11 gehoert neu bewertet.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'w11-mehrere-sachverhalte-grundlinie.json');

function segmente(beispiel) {
  if (!beispiel) return [];
  return beispiel.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function sachverhalteFunde(V) {
  const funde = [];
  const pruefe = (f, ort, carrier) => {
    if (f.typ !== 'text' && f.typ !== 'textarea') return;
    const seg = segmente(f.beispiel);
    if (seg.length > 2) funde.push({ carrier, id: f.id, label: f.label, beispiel: f.beispiel, ort, angaben: seg.length });
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
function ermittleFunde(V) { return sachverhalteFunde(V); }

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

module.exports = { sachverhalteFunde, segmente, schluesselFund, ladeGrundlinie, gateBewerten, ermittleFunde };
