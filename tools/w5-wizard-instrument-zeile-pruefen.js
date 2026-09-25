#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-5 (Auftrag N1, 08.08.2026, Zug 2) — Wizard schreibt in undeklarierte
   Felder / erzeugt kein Vorsorge-Instrument
   ────────────────────────────────────────────────────────────────────────────
   ZWEI PRÜFUNGEN, beide gegen `tests/wizard-schreibziele.test.js` abgeglichen
   (der Auftrag verlangt das ausdrücklich, bevor ein zweiter Wächter entsteht):

   TEIL A — geprüft, NICHT neu gebaut. Die SP-Lesung nannte 29 `pv_*`-Felder
   von `pvwiz`, die in keiner Felddefinition stehen. Gemessen: der bestehende
   Wächter (`waisenSchritte` in wizard-schreibziele.test.js) kennt eine
   Korpus-Freistellung (U2-ADR-089) — Felder aus `PV_BMJ.steps`, die NIRGENDS
   im Schema als Felddefinition existieren, gelten als wizard-interne
   Korpus-Felder, kein Waisen-Write. Alle 29 `pv_*`-Felder erfüllen diese
   Bedingung (geprüft unten, `korpusFreistellungGreift`). Das ist keine
   Wächter-Lücke, sondern die dokumentierte Architektur — hier NICHT erneut
   als Fund gezählt.

   TEIL B — der reale Fund, hier geprüft. `WIZARD_DOKUMENT_MAP` bildet einen
   Wizard auf einen `vorsorge_instrumente`-Typ ab (die Instrument-Frage, die
   die Notfall-/Situationsblätter über `instrument:<typ>` stellen). Ist dieser
   Typ eine gültige Option der Instrument-Liste, MUSS `wizard.ziel.liste ===
   'vorsorge_instrumente' && wizard.ziel.typ === derselbe Typ` gelten — sonst
   schreibt der Wizard NIE eine Instrument-Zeile, und jeder Zeiger, der genau
   diese Zeile lesen will (Notfall-Kern, Situationsblätter), findet für immer
   nichts, unabhängig vom W-9-Befund (der nur die SCHEMA-Existenz des
   Zielfelds prüft, nicht ob je eine Zeile entsteht).

   Heutiger Befund: `kiwiz` erfüllt die Bedingung, `pvwiz` NICHT — genau der
   SP-Lesung-Fund, nur an der richtigen Stelle gemessen.

   GRUNDLINIE, NICHT NULLTOLERANZ — Bauart wie `tools/tote-strings-pruefen.js`.
   REICHWEITE (A443, 21.08.2026): dieser Waechter misst Wizard-Schritte gegen Vorsorge-Instrumente.
   Ein Modul bringt keinen Wizard mit — die Regel hat auf dem angedockten Weg keinen Gegenstand.
   Das ist KEINE Luecke, und darum steht W5 nicht in `tools/andock-regeln-pruefen.js`.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'w5-wizard-instrument-zeile-grundlinie.json');

/** Ist f.id NIRGENDS im Schema (SEKTOREN) als Felddefinition vorhanden — die U2-ADR-089-Bedingung? */
function irgendwoDefiniert(V, feldId) {
  for (const s of Object.values(V.SEKTOR_BY_ID)) {
    for (const sek of s.sektionen || []) {
      for (const f of sek.felder || []) {
        if (f.id === feldId) return true;
        for (const u of f.unterFelder || []) if (u.id === feldId) return true;
      }
    }
  }
  return false;
}

/** Teil A: gibt die pv_*-Felder zurück, die die Korpus-Freistellung NICHT erfüllen — sollte immer leer sein. */
function korpusFreistellungLoecher(V) {
  const korpus = (V.PV_BMJ && V.PV_BMJ.steps ? V.PV_BMJ.steps : []).map((s) => s.feld.id);
  return korpus.filter((id) => irgendwoDefiniert(V, id));
}

/** Instrument-Typ-Optionen der vorsorge_instrumente-Liste, direkt aus dem Schema gelesen. */
function instrumentTypOptionen(V) {
  const s = V.SEKTOR_BY_ID.advanceCare;
  for (const sek of s.sektionen || []) {
    for (const f of sek.felder || []) {
      if (f.id !== 'provisionInstruments') continue;
      const t = (f.unterFelder || []).find((u) => u.id === 'instrument');
      return new Set((t && t.optionen || []).map((o) => o.wert));
    }
  }
  return new Set();
}

// „pvwiz und die ADR-Kollision" (10.08.2026) — die vorherige SEITENEFFEKT_ERFUELLT-
// Ausnahme (pvwiz legte seine Zeile nur über einen benannten Organspende-Seiteneffekt an, den
// diese Struktur-Prüfung nicht generisch sehen konnte) ist ENTFALLEN: `pvwiz.ziel` trägt jetzt
// selbst liste+typ wie kiwiz (U2-ADR-100 gewinnt die Kollision mit U2-ADR-066 §3, s. U2-ADR-132),
// die Struktur-Prüfung unten sieht den Fall darum direkt, ohne Ausnahme.

/** Teil B: Wizards, die laut WIZARD_DOKUMENT_MAP ein gültiges Instrument abbilden, aber keine Zeile anlegen. */
function wizardsOhneInstrumentZeile(V) {
  const typen = instrumentTypOptionen(V);
  const funde = [];
  for (const [wizardId, e] of Object.entries(V.WIZARD_DOKUMENT_MAP || {})) {
    if (e.sektorId !== 'advanceCare' || !typen.has(e.typ)) continue;   // kein Instrument-Fall
    const w = (V.WIZARDS || []).find((x) => x.id === wizardId);
    if (!w) continue;
    const legtZeileAn = w.ziel && w.ziel.liste === 'provisionInstruments' && w.ziel.instrument === e.typ;
    if (!legtZeileAn) {
      funde.push({ wizard: wizardId, typ: e.typ,
        grund: `WIZARD_DOKUMENT_MAP bildet '${wizardId}' auf Instrument-Typ '${e.typ}' ab, aber `
          + `ziel.liste/ziel.instrument legen keine provisionInstruments-Zeile dieses Typs an — `
          + `ziel: ${JSON.stringify(w.ziel)}` });
    }
  }
  return funde;
}

function ladeGrundlinie() {
  if (!fs.existsSync(GRUNDLINIE)) return null;
  return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
}

function gateBewerten(funde, grundlinie) {
  const bekannt = new Set(grundlinie.map((f) => f.wizard + '|' + f.typ));
  const neu = funde.filter((f) => !bekannt.has(f.wizard + '|' + f.typ));
  return { neu, rot: neu.length > 0 };
}

function main() {
  const argv = process.argv.slice(2);
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();

  const loecher = korpusFreistellungLoecher(V);
  if (loecher.length) {
    console.error('TEIL A abweichend von der Annahme: diese PV-Korpus-Felder sind DOCH irgendwo '
      + 'als Felddefinition vorhanden — die U2-ADR-089-Freistellung greift für sie nicht mehr: '
      + loecher.join(', '));
  }

  const funde = wizardsOhneInstrumentZeile(V);

  if (argv.includes('--grundlinie-schreiben')) {
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(funde, null, 1) + '\n');
    console.log('Grundlinie geschrieben: ' + funde.length + ' bekannte Wizard(s) ohne Instrument-Zeile · '
      + path.relative(REPO, GRUNDLINIE));
    return;
  }

  const grundlinie = ladeGrundlinie();

  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ funde, korpusLoecher: loecher, bewertung: grundlinie ? gateBewerten(funde, grundlinie) : null }, null, 1) + '\n');
    return;
  }

  if (argv.includes('--gate')) {
    if (!grundlinie) { console.error('GATE: keine Grundlinie — erst `--grundlinie-schreiben`.'); process.exit(2); }
    const { neu, rot } = gateBewerten(funde, grundlinie);
    if (!rot) { console.log('GATE grün — kein neuer instrument-loser Wizard gegen die Grundlinie (' + grundlinie.length + ' bekannt).'); return; }
    console.error('GATE ROT — Wizard bildet laut WIZARD_DOKUMENT_MAP ein Instrument ab, legt aber keine Zeile an:');
    for (const f of neu) console.error('    NEU: ' + f.wizard + ' (' + f.typ + ') — ' + f.grund);
    process.exit(1);
  }

  console.log('W-5 Teil B: ' + funde.length + ' Wizard(s) ohne Instrument-Zeile.');
  for (const f of funde) console.log('  ' + f.wizard + ' (' + f.typ + ') — ' + f.grund);
}

if (require.main === module) main();
module.exports = { korpusFreistellungLoecher, instrumentTypOptionen, wizardsOhneInstrumentZeile, gateBewerten, GRUNDLINIE };
