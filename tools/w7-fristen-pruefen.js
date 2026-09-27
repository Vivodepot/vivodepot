'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-7 — Frist ohne Datum („W-7 und W-12", 09.08.2026, Zug 2)
   ────────────────────────────────────────────────────────────────────────
   Prüft: kein Situationsfeld, dessen Text (Label/Beispiel/Hinweis) eine
   Frist NENNT, ohne dass in derselben Situation ein Datumsfeld existiert,
   an dem die Frist rechnen kann. Grundlage: interne Wächter-Grundlagen-Erhebung
   vom 08.08.2026, Liste 3b.

   BEWUSST ENGER Umfang als Liste 3b: Liste 3b ist eine Rechtsrecherche —
   sie listet auch Fälle, in denen der HEUTIGE Text „keine Frist" nennt,
   eine Frist aber GESETZLICH existiert (z. B. `erb_sterbeurkunde`, § 28
   PStG). Ein Wächter kann eine Tatsache, die im Text nicht vorkommt,
   strukturell nicht finden — das ist keine Lücke im Wächter, sondern der
   Unterschied zwischen „Text prüfen" und „Recherche nachvollziehen" (wie
   bei W-1 „Betrag ohne Zahl": nicht vollständig entscheidbar). Die
   restlichen Fälle aus Liste 3b stehen darum NICHT hier, sondern bleiben
   Registereintrag/Bericht — der Wächter behauptet über sie nichts.

   Nicht vollständig entscheidbar wie W-8: Stichwort-Netz (auch hier
   bewusst weit: „Frist"/„binnen"/„spätestens"/Zahl+Zeiteinheit) +
   Grundlinie-geführte Klassifikation. Rot nur bei einem NEUEN Fund.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'w7-fristen-grundlinie.json');

const FRIST_SPRACHE = /\bFrist\b|\bbinnen\b|sp(ä|ae)testens|\d+\s*(Woche|Monat|Tag|Werktag|Jahr)/i;

/* GEMESSEN (Zug 3, 09.08.2026): `hatDatum` prüft situations-WEIT, nicht Feld-für-Feld. Nach dem
   Anlegen von `geburt_datum` in der Situation „geburt" verschwand `geburt_elternzeit` (eine
   begründete Ausnahme, s. Grundlinie) mit aus den Funden — ein Datumsfeld IRGENDWO in der
   Situation genügt der Prüfung, auch wenn es fachlich zu einem ANDEREN Feld gehört. Für die vier
   in Liste 3b/diesem Auftrag bekannten Fälle bewusst hingenommen (Feld-für-Feld-Zuordnung bräuchte
   eine Stamm-Heuristik wie bei W-12, die bei den `erb_*`-Feldern — alle mit demselben ersten
   Wortsegment — nicht trennscharf wäre). Ein künftiger echter Fund in einer bereits „erledigten"
   Situation bliebe damit unentdeckt — dieselbe Klasse Grenze wie bei allen nicht vollständig
   entscheidbaren Wächtern dieser Familie. */
function fristFunde(V) {
  const funde = [];
  for (const [name, liste] of [['SITUATIONEN', V.SITUATIONEN], ['ANGEHOERIGEN_BLAETTER', (typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : [])]]) {
    for (const sit of liste || []) {
      let hatDatum = false;
      const kandidaten = [];
      for (const blk of sit.bloecke || []) {
        for (const e of blk.eintraege || []) {
          if (!e.feld || typeof e.feld !== 'object') continue;
          if (e.feld.typ === 'datum') hatDatum = true;
          const hay = (e.feld.label || '') + ' ' + (e.feld.beispiel || '') + ' ' + (e.feld.hint || '');
          if (FRIST_SPRACHE.test(hay)) kandidaten.push({ id: e.feld.id, label: e.feld.label });
        }
      }
      if (!hatDatum) {
        for (const k of kandidaten) funde.push({ carrier: 'Situationsfeld', id: k.id, label: k.label, ort: name + ':' + sit.id });
      }
    }
  }
  return funde;
}

function schluesselFund(f) { return f.carrier + '|' + f.ort + '|' + f.id; }

function ladeGrundlinie() {
  return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
}

function gateBewerten(funde, grundlinie) {
  const bekannt = new Set(grundlinie.map(schluesselFund));
  const neu = funde.filter((f) => !bekannt.has(schluesselFund(f)));
  return { neu, rot: neu.length > 0 };
}

function ermittleFunde(V) {
  return fristFunde(V);
}

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

module.exports = { fristFunde, schluesselFund, ladeGrundlinie, gateBewerten, ermittleFunde, FRIST_SPRACHE };
