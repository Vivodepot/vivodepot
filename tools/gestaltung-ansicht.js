#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   gestaltung-ansicht.js — Wächter „Ansicht“ (Gestaltungsdefinition, Stufe 7, läuft ab Stufe 3 je Baustein mit)
   ────────────────────────────────────────────────────────────────────────────
   Zählt in einer GERENDERTEN Ansicht die sichtbaren Elemente, die zu keinem Baustein gehören. Ein Element gehört zu
   einem Baustein, wenn es selbst oder ein Vorfahr `data-baustein="<name>"` trägt. Ziel je Ansicht: 0 (Anteil 100 %).
   Gemessen wird im Browser (tests/e2e/gestaltung-ansicht.spec.js): `SAMMLER` läuft dort per page.evaluate und liefert
   eine flache Liste; `zaehlen` und `vergleichen` laufen in Node und sind ohne Browser gegen Fixtures geprüft.

   WAS ZÄHLT
     sichtbar    getClientRects().length > 0 und visibility ≠ hidden/collapse (display:none hat keine Rechtecke)
     nicht       html, head, body und alles, was nichts zeigt (script, style, template, noscript, meta, link, br, wbr);
                 die Kinder eines <svg> (das <svg> selbst zählt als ein Element).
     unbekannt   ein `data-baustein`, dessen Name nicht im geschlossenen Satz der Definition steht
                 (`bausteine` in tools/erscheinung/definition.json). Das ist immer rot, ohne Grundlinie.
                 Trägt die Definition noch keinen Satz, bleibt die Namensprüfung aus und die Ausgabe sagt das.

   WIE ES WIRKT: Ratsche. `tools/gestaltung-ansicht-grundlinie.json` hält je Ansicht die Zahl ohne Baustein.
     steigt eine Zahl                   rot
     sinkt eine Zahl                    rot, bis die Grundlinie nachgezogen ist (`--grundlinie-schreiben`)
     Ansicht gemessen, nicht in der     rot („nicht erhoben“); erhoben wird mit `--grundlinie-schreiben`
       Grundlinie
     Ansicht in der Grundlinie, nicht   rot („nicht gemessen“): eine Ansicht verschwindet nicht still aus der Messung
       gemessen
   `--grundlinie-schreiben` schreibt Senkungen und neue Ansichten, nie eine Steigung. Eine neue Ansicht ist eine
   Erhebung und braucht im Commit den Trailer der Gegenlesung (die Grundlinie steht im Register der Zähler).

   AUFRUFE
     node tools/gestaltung-ansicht.js                                  Selbstprobe gegen tools/gestaltung-fixtures/ansicht-*
     node tools/gestaltung-ansicht.js --check --messung <json>         Exit 1 bei rot (Messung aus der E2E-Probe)
     node tools/gestaltung-ansicht.js --grundlinie-schreiben --messung <json>
     node tools/gestaltung-ansicht.js --stellen <ansicht> --messung <json>   die Elemente ohne Baustein (Pfad, Tag)
     Optionen: --grundlinie <pfad> --definition <pfad>
   Messung: { "<ansicht>": [ { "pfad": "…", "tag": "div", "baustein": "knopf"|null, "innerhalb": true|false }, … ] }
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'gestaltung-ansicht-grundlinie.json');
const DEFINITION = path.join(REPO, 'tools', 'erscheinung', 'definition.json');
const FIXTURES = path.join(__dirname, 'gestaltung-fixtures');

/* Läuft im Browser (page.evaluate(SAMMLER)). Keine Abhängigkeit nach außen: die Funktion wird als Text übertragen. */
function SAMMLER() {
  const OHNE = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'META', 'LINK', 'BR', 'WBR', 'HEAD', 'TITLE']);
  const aus = [];
  const pfadVon = (el) => {
    const teile = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      let t = e.tagName.toLowerCase();
      if (e.id) { teile.unshift(t + '#' + e.id); break; }
      const geschw = e.parentElement ? [...e.parentElement.children].filter((k) => k.tagName === e.tagName) : [];
      if (geschw.length > 1) t += ':nth-of-type(' + (geschw.indexOf(e) + 1) + ')';
      teile.unshift(t);
    }
    return teile.join(' > ');
  };
  const gehen = (el, innerhalb) => {
    for (const k of el.children) {
      if (OHNE.has(k.tagName)) continue;
      const stil = getComputedStyle(k);
      const name = k.getAttribute('data-baustein');
      const drin = innerhalb || name !== null;
      const sichtbar = k.getClientRects().length > 0 && stil.visibility !== 'hidden' && stil.visibility !== 'collapse';
      if (sichtbar) aus.push({ pfad: pfadVon(k), tag: k.tagName.toLowerCase(), baustein: name, innerhalb: drin });
      // display:none verbirgt den ganzen Teilbaum; visibility:hidden nicht (ein Kind kann visible setzen)
      if (stil.display === 'none') continue;
      if (k.tagName.toLowerCase() === 'svg') continue;
      gehen(k, drin);
    }
  };
  gehen(document.body, document.body.hasAttribute('data-baustein'));
  return aus;
}

function bausteinSatz(def) {
  const b = def && def.bausteine;
  if (!b) return null;
  const liste = Array.isArray(b) ? b : (Array.isArray(b.satz) ? b.satz : Object.keys(b));
  return new Set(liste.map((x) => (typeof x === 'string' ? x : x && x.name)).filter(Boolean));
}

function definitionLesen(p = DEFINITION) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

/** Zahlen einer Ansicht. satz = Set der erlaubten Namen oder null (Namensprüfung aus). */
function zaehlen(elemente, satz = null) {
  let ohne = 0;
  const unbekannt = [];
  for (const e of elemente) {
    if (!e.innerhalb) ohne++;
    if (satz && e.baustein !== null && e.baustein !== undefined && !satz.has(e.baustein)) unbekannt.push(e.baustein);
  }
  const gesamt = elemente.length;
  return { gesamt, ohneBaustein: ohne, anteil: gesamt ? (gesamt - ohne) / gesamt : 1, unbekannt: [...new Set(unbekannt)].sort() };
}

/** Messung gegen Grundlinie. Gibt { ok, zeilen[], zahlen{} } zurück; zeilen beschreiben jedes Rot. */
function vergleichen(messung, grundlinie, satz = null) {
  const soll = (grundlinie && grundlinie.zahlen) || {};
  const zeilen = [];
  const zahlen = {};
  for (const [ansicht, elemente] of Object.entries(messung)) {
    const z = zaehlen(elemente, satz);
    zahlen[ansicht] = z;
    if (z.unbekannt.length) zeilen.push(`${ansicht}: unbekannter Baustein ${z.unbekannt.join(', ')} (nicht im Satz der Definition)`);
    if (!(ansicht in soll)) { zeilen.push(`${ansicht}: nicht erhoben (gemessen ${z.ohneBaustein} ohne Baustein); --grundlinie-schreiben`); continue; }
    if (z.ohneBaustein > soll[ansicht]) zeilen.push(`${ansicht}: ${soll[ansicht]} → ${z.ohneBaustein} Elemente ohne Baustein (gestiegen)`);
    else if (z.ohneBaustein < soll[ansicht]) zeilen.push(`${ansicht}: ${soll[ansicht]} → ${z.ohneBaustein} gesunken; Grundlinie nachziehen (--grundlinie-schreiben)`);
  }
  for (const ansicht of Object.keys(soll)) if (!(ansicht in messung)) zeilen.push(`${ansicht}: in der Grundlinie, aber nicht gemessen`);
  return { ok: zeilen.length === 0, zeilen, zahlen };
}

/** Neue Grundlinie: Senkungen und neue Ansichten, nie eine Steigung. */
function grundlinieNeu(messung, grundlinie, satz = null) {
  const alt = (grundlinie && grundlinie.zahlen) || {};
  const neu = { ...alt };
  const verweigert = [];
  for (const [ansicht, elemente] of Object.entries(messung)) {
    const n = zaehlen(elemente, satz).ohneBaustein;
    if (ansicht in alt && n > alt[ansicht]) { verweigert.push(`${ansicht}: ${alt[ansicht]} → ${n}`); continue; }
    neu[ansicht] = n;
  }
  const sortiert = Object.fromEntries(Object.keys(neu).sort().map((k) => [k, neu[k]]));
  return { grundlinie: { ...(grundlinie || {}), zahlen: sortiert }, verweigert };
}

function selbstprobe() {
  const lesen = (n) => JSON.parse(fs.readFileSync(path.join(FIXTURES, n), 'utf8'));
  const messung = lesen('ansicht-messung.json');
  const satz = bausteinSatz(lesen('ansicht-definition.json'));
  const fehler = [];
  const gleich = lesen('ansicht-soll-gleich.json');
  if (!vergleichen(messung, gleich, satz).ok) fehler.push('gleiche Grundlinie muss grün sein');
  const r = vergleichen(messung, lesen('ansicht-soll-tiefer.json'), satz);
  if (r.ok) fehler.push('Rot-Beweis: eine gestiegene Zahl muss rot sein');
  const fremd = vergleichen({ ...messung, x: [{ pfad: 'div', tag: 'div', baustein: 'erfunden', innerhalb: true }] }, { zahlen: { ...gleich.zahlen, x: 0 } }, satz);
  if (fremd.ok) fehler.push('Rot-Beweis: ein unbekannter Baustein muss rot sein');
  return fehler;
}

function argWert(args, name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }

function main(args) {
  const glPfad = argWert(args, '--grundlinie') || GRUNDLINIE;
  const def = definitionLesen(argWert(args, '--definition') || DEFINITION);
  const satz = bausteinSatz(def);
  const mPfad = argWert(args, '--messung');
  if (!mPfad) {
    const f = selbstprobe();
    if (f.length) { for (const z of f) console.error('gestaltung-ansicht: ' + z); return 1; }
    console.log('gestaltung-ansicht: Selbstprobe grün (Fixtures)');
    return 0;
  }
  const messung = JSON.parse(fs.readFileSync(mPfad, 'utf8'));
  let grundlinie = null;
  try { grundlinie = JSON.parse(fs.readFileSync(glPfad, 'utf8')); } catch (_) { grundlinie = { zahlen: {} }; }
  if (!satz) console.log('gestaltung-ansicht: die Definition trägt noch keinen Satz der Bausteine; Namensprüfung aus');
  const stellen = argWert(args, '--stellen');
  if (stellen) {
    for (const e of (messung[stellen] || []).filter((x) => !x.innerhalb)) console.log(`${e.tag}\t${e.pfad}`);
    return 0;
  }
  if (args.includes('--grundlinie-schreiben')) {
    const { grundlinie: neu, verweigert } = grundlinieNeu(messung, grundlinie, satz);
    if (verweigert.length) { console.error('gestaltung-ansicht: Steigung wird nicht geschrieben: ' + verweigert.join('; ')); return 1; }
    fs.writeFileSync(glPfad, JSON.stringify(neu, null, 1) + '\n');
    console.log('gestaltung-ansicht: Grundlinie geschrieben');
    return 0;
  }
  const r = vergleichen(messung, grundlinie, satz);
  for (const [a, z] of Object.entries(r.zahlen)) console.log(`${a}\t${z.ohneBaustein} ohne Baustein von ${z.gesamt} (${Math.round(z.anteil * 100)} %)`);
  for (const z of r.zeilen) console.error('ROT ' + z);
  return r.ok ? 0 : 1;
}

module.exports = { SAMMLER, zaehlen, vergleichen, grundlinieNeu, bausteinSatz, definitionLesen, selbstprobe, GRUNDLINIE, DEFINITION };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
