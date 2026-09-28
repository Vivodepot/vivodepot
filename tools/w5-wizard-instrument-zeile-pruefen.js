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
   ABGELÖST IN DIESEM PUNKT (27.09.2026, U2-ADR-440): die 29 PV-Festlegungen SIND seither Felder des Bereichs Vorsorge
   (Sektion living-will-decisions), damit eine Anfrage sie erfragen kann. Der Grund von U2-ADR-089 bleibt gehalten: die
   Sektion entsteht AUSSCHLIESSLICH zur Laufzeit aus PV_BMJ.steps, keine literale Definition der Felder steht im Kern oder in
   einem Bereichs-Template. Teil A prüft darum jetzt genau das (`pvFestlegungenPruefen`, `pvFestlegungenLiteralImQuelltext`).
   KI_KORPUS bleibt wizard-intern.

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

/** Teil A (U2-ADR-440): die PV-Festlegungen sind Felder in advanceCare/living-will-decisions — abgeleitet, nicht gepflegt.
    fehlen:  eine Festlegung ohne Feld im Bereich
    anderswo: dieselbe Id ist zusätzlich außerhalb der Sektion definiert (Doppelablage)
    literal: ein Feld der Sektion trägt das Merkmal der Ableitung nicht (`pvBmjAbgeleitet`, nicht aufzählbar, gesetzt nur von
             `_pvFestlegungenSektionAbleiten` im Kern) — von Hand eingefügt.
    Alle drei sollten immer leer sein. */
const PV_ABGELEITET = 'pvBmjAbgeleitet';
function pvFestlegungenPruefen(V) {
  const ids = (V.PV_BMJ && V.PV_BMJ.steps ? V.PV_BMJ.steps : []).map((s) => s.feld.id);
  const aus = { fehlen: [], anderswo: [], literal: [] };
  const sek = V.SEKTOR_BY_ID.advanceCare;
  const sektion = (sek && sek.sektionen || []).find((x) => x && x.id === 'living-will-decisions');
  const inSektion = new Map(((sektion && sektion.felder) || []).map((f) => [f.id, f]));
  for (const id of ids) {
    const f = inSektion.get(id);
    if (!f) { aus.fehlen.push(id); continue; }
    const d = Object.getOwnPropertyDescriptor(f, PV_ABGELEITET);
    if (!d || d.value !== true || d.enumerable) aus.literal.push(id);
  }
  for (const s of Object.values(V.SEKTOR_BY_ID)) {
    for (const sk of s.sektionen || []) {
      if (s.id === 'advanceCare' && sk.id === 'living-will-decisions') continue;
      for (const f of sk.felder || []) {
        if (ids.includes(f.id)) aus.anderswo.push(s.id + '.' + f.id);
        for (const u of f.unterFelder || []) if (ids.includes(u.id)) aus.anderswo.push(s.id + '.' + f.id + ':' + u.id);
      }
    }
  }
  return aus;
}

/** Teil A, Quelltext (U2-ADR-440): keine literale Definition einer PV-Festlegung im Kern oder in einem Bereichs-Template.
    `texte` ist { pfad: inhalt }; gesucht wird eine Feld-Definition (`id: '<festlegung>'` bzw. `"id": "<festlegung>"`). */
function pvFestlegungenLiteralImQuelltext(V, texte) {
  const ids = (V.PV_BMJ && V.PV_BMJ.steps ? V.PV_BMJ.steps : []).map((s) => s.feld.id);
  const funde = [];
  for (const [pfad, text] of Object.entries(texte)) {
    for (const id of ids) {
      const re = new RegExp('["\']?id["\']?\\s*:\\s*["\']' + id + '["\']');
      if (re.test(text)) funde.push(pfad + ': ' + id);
    }
  }
  return funde;
}
function pvFestlegungenQuelltexte() {
  const texte = { 'vivodepot.html': fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8') };
  const ordner = path.join(REPO, 'tools', 'bereich-templates');
  for (const d of fs.readdirSync(ordner).filter((x) => x.endsWith('.json'))) texte['tools/bereich-templates/' + d] = fs.readFileSync(path.join(ordner, d), 'utf8');
  return texte;
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

  const pv = pvFestlegungenPruefen(V);
  const literal = pvFestlegungenLiteralImQuelltext(V, pvFestlegungenQuelltexte());
  if (pv.fehlen.length || pv.anderswo.length || pv.literal.length || literal.length) {
    console.error('TEIL A (U2-ADR-440) abweichend: ' + JSON.stringify({ ...pv, literalImQuelltext: literal }));
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
module.exports = { pvFestlegungenPruefen, pvFestlegungenLiteralImQuelltext, pvFestlegungenQuelltexte, instrumentTypOptionen, wizardsOhneInstrumentZeile, gateBewerten, GRUNDLINIE };
