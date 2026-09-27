#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-9 (Auftrag N1, 08.08.2026, Zug 1) — Verweis auf abgeräumtes Feld
   ────────────────────────────────────────────────────────────────────────────
   Prüft, ob jede Feld-ID, auf die ein Zeiger im Schema zeigt, dort auch als
   Felddefinition existiert — über die ECHTEN Produkt-Resolver, nicht über
   eine eigene Nachbildung: `feldDefFuer(sektor, feld)` (der Resolver, den
   `notfallKernModell()` selbst für NOTFALL_KERN_FELDER nutzt, kennt bereits
   die `liste:<f>:<typ>:<uf>`-Selektor-Form) und `crossRefFeldUndRoh(quelle,
   feld)` (der Resolver hinter `akutZeileHTML()`, kennt zusätzlich die
   virtuelle `instrument:<typ>`-Existenzfrage, die `meine-menschen`/`menschen`-
   Sonderform und `sit:<id>`-Cross-Situations-Verweise). Eine eigene
   Nachbildung dieser Fallunterscheidung wäre eine zweite Wahrheit neben der
   im Produkt — genau die Fehlerklasse, die dieser Wächter selbst prüft.

   Drei geprüfte Zeiger-Quellen:
     · NOTFALL_KERN_FELDER — über `feldDefFuer`.
     · SITUATIONEN[].bloecke[].eintraege[] mit { quelle, feld } — über
       `crossRefFeldUndRoh`. Einträge der Form { feld: {id,...} } definieren
       ihr Feld selbst und sind kein Zeiger.
     · Angehörigen-Blätter (Vorlage) — dieselbe Form, derselbe Resolver.

   Export-Mappings (Zug 3, W-10) sind bewusst NICHT Teil dieses Wächters —
   eigener Auftrags-Zug, eigene Datenquelle.

   REGEL 23 — Abweichung von der SP-Lesung, benannt: die im Auftrag genannten
   drei Gate-Felder (`vollmacht_vorhanden`/`patientenverf_vorhanden`/
   `betreuungsverfuegung` als FLACHES Feld) existieren im heutigen Code an
   KEINER Stelle mehr — weder als Ziel noch als Zeiger. `WIZARD_DOKUMENT_MAP`
   ist seit U2-ADR-100 auf `{typ, sektorId}` umgestellt, kein Flachfeld-Gate
   mehr; die SP-Lesung (mtime 08.08. 14:51) beschreibt einen Zustand, der vor
   diesem Auftrag bereits abgebaut war.

   GRUNDLINIE, NICHT NULLTOLERANZ — Bauart wie `tools/tote-strings-pruefen.js`:
   die heute gefundenen Fälle sind bekannt, der Wächter wird rot bei einem
   NEUEN Fund, den die Grundlinie nicht kennt.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'w9-feldverweise-grundlinie.json');

function pruefeNotfallKernFelder(V) {
  const funde = [];
  for (const e of V.NOTFALL_KERN_FELDER || []) {
    const feld = V.feldDefFuer(e.sektor, e.feld);
    if (!feld) {
      funde.push({ klasse: 'NOTFALL_KERN_FELDER', zeiger: e.sektor + '.' + e.feld,
        grund: `feldDefFuer('${e.sektor}', '${e.feld}') liefert nichts` });
    }
  }
  return funde;
}

function pruefeSituationsQuellen(V, situationen, klasse) {
  const funde = [];
  for (const sit of situationen || []) {
    for (const blk of sit.bloecke || []) {
      for (const e of blk.eintraege || []) {
        if (!e.quelle) continue;   // { feld: {id,...} } — definiert sein eigenes Feld, kein Zeiger
        if (typeof e.feld !== 'string') continue;   // Form-Abweichung, hier nicht Gegenstand
        const r = V.crossRefFeldUndRoh(e.quelle, e.feld);
        if (!r || !r.feld) {
          funde.push({ klasse, zeiger: sit.id + ': ' + e.quelle + '.' + e.feld,
            grund: `crossRefFeldUndRoh('${e.quelle}', '${e.feld}') liefert kein Feld` });
        }
      }
    }
  }
  return funde;
}

function alleFunde(V) {
  return [
    ...pruefeNotfallKernFelder(V),
    ...pruefeSituationsQuellen(V, V.SITUATIONEN, 'SITUATIONEN'),
    ...pruefeSituationsQuellen(V, (typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : []), 'ANGEHOERIGEN_BLAETTER'),
  ];
}

function ladeGrundlinie() {
  if (!fs.existsSync(GRUNDLINIE)) return null;
  return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
}

function gateBewerten(funde, grundlinie) {
  const bekannt = new Set(grundlinie.map((f) => f.klasse + '|' + f.zeiger));
  const neu = funde.filter((f) => !bekannt.has(f.klasse + '|' + f.zeiger));
  return { neu, rot: neu.length > 0 };
}

async function ermittleFunde() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  // crossRefFeldUndRoh liest `data` (das Vorsorge-Instrument-Register etc.) — ohne offene
  // Sitzung ist `data` null und jeder Zeiger sähe fälschlich tot aus. Eine leere Sitzung genügt,
  // hier geht es um SCHEMA-Existenz, nicht um Inhalte.
  await V.depotAnlegen('w9-probe-pw');
  return alleFunde(V);
}

async function main() {
  const argv = process.argv.slice(2);
  const funde = await ermittleFunde();

  if (argv.includes('--grundlinie-schreiben')) {
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(funde, null, 1) + '\n');
    console.log('Grundlinie geschrieben: ' + funde.length + ' bekannte Verweise ins Leere · '
      + path.relative(REPO, GRUNDLINIE));
    return;
  }

  const grundlinie = ladeGrundlinie();

  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ funde, bewertung: grundlinie ? gateBewerten(funde, grundlinie) : null }, null, 1) + '\n');
    return;
  }

  if (argv.includes('--gate')) {
    if (!grundlinie) { console.error('GATE: keine Grundlinie — erst `--grundlinie-schreiben`.'); process.exit(2); }
    const { neu, rot } = gateBewerten(funde, grundlinie);
    if (!rot) { console.log('GATE grün — kein neuer Verweis ins Leere gegen die Grundlinie (' + grundlinie.length + ' bekannt).'); return; }
    console.error('GATE ROT — Verweis auf ein Feld, das nicht existiert, den die Grundlinie nicht kennt:');
    for (const f of neu) console.error('    NEU: [' + f.klasse + '] ' + f.zeiger + ' — ' + f.grund);
    process.exit(1);
  }

  console.log('W-9: ' + funde.length + ' Verweis(e) ins Leere.');
  for (const f of funde) console.log('  [' + f.klasse + '] ' + f.zeiger + ' — ' + f.grund);
}

if (require.main === module) main();
module.exports = { pruefeNotfallKernFelder, pruefeSituationsQuellen, alleFunde, gateBewerten, ermittleFunde, GRUNDLINIE };
