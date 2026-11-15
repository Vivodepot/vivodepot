#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   gestaltung-freie-werte.js — Wächter „freie Werte“ in der Stilquelle des Kerns (Stufe 1)
   ────────────────────────────────────────────────────────────────────────────
   Zählt in `tools/erscheinung/stil/grundlage.css` je Art die Deklarationen mit einer freien Zahl statt `var(--…)`.
   Kommentare sind maskiert, der erzeugte Block der Definition (GESTALTUNG-DEFINITION:BEGIN … END) ist ausgenommen.
     padding      padding, padding-*              (Deklaration mit mindestens einer Zahl mit Einheit ≠ 0)
     margin       margin, margin-*
     gap          gap, row-gap, column-gap
     radius       border-radius, border-*-radius
     trefferMin   min-height / min-width in px zwischen 36 und 56: die Mindestgröße einer Trefferfläche.
                  Nur so abgrenzbar; `height`/`width` allein sagen nichts über eine Trefferfläche und zählen nicht.
     mediaFrei    @media-Blöcke mit einer Breiten- oder Höhenbedingung außerhalb der zwei Umbruchpunkte der Definition
                  (schmal bis 767 px = max-width, breit ab 768 px = min-width). print, prefers-*, pointer zählen nicht.
   Warum ein eigenes Werkzeug und nicht `tools/design-treue.js`: Jenes zählt den fertigen Kern (`vivodepot.html`, drei Orte,
   Familien Farbe/Schrift/Schatten); dieses zählt die Stilquelle selbst und liest die Umbruchpunkte aus der Definition.
   WIE ES WIRKT: Ratsche. `tools/gestaltung-freie-werte-grundlinie.json` hält die heutigen Zahlen; steigt eine, ist es rot;
   sinkt eine, ist es auch rot, bis die Grundlinie nachgezogen ist (`--grundlinie-schreiben`, schreibt nur Senkungen).
   AUFRUFE
     node tools/gestaltung-freie-werte.js                       Selbstprobe gegen die Fixtures im Repo
     node tools/gestaltung-freie-werte.js --check               Exit 1, wenn eine Zahl steigt oder sinkt (Grundlinie nachziehen)
     node tools/gestaltung-freie-werte.js --stellen <art>       Fundstellen (Zeile, Wert)
     node tools/gestaltung-freie-werte.js --grundlinie-schreiben
     Optionen: --css <pfad> --grundlinie <pfad> --definition <pfad>
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLAGE = path.join(REPO, 'tools', 'erscheinung', 'stil', 'grundlage.css');
const DEFINITION = path.join(REPO, 'tools', 'erscheinung', 'definition.json');
const GRUNDLINIE = path.join(__dirname, 'gestaltung-freie-werte-grundlinie.json');
const FIXTURES = path.join(__dirname, 'gestaltung-fixtures');
const ARTEN = ['padding', 'margin', 'gap', 'radius', 'trefferMin', 'mediaFrei'];
const TREFFER_VON_PX = 36;
const TREFFER_BIS_PX = 56;

const EIGENSCHAFTEN = [
  ['padding', /^padding(-[a-z]+)*$/],
  ['margin', /^margin(-[a-z]+)*$/],
  ['gap', /^(row-|column-)?gap$/],
  ['radius', /^border(-[a-z]+)*-radius$|^border-radius$/],
];

/* Längentreue Maske: Kommentare und der erzeugte Block werden zu Leerzeichen, die Zeilen bleiben. */
function maskieren(css) {
  let t = css.replace(/\/\*[\s\S]*?\*\//g, (k) => k.replace(/[^\n]/g, ' '));
  // der erzeugte Block steht in einem Kommentar-Paar; seine Marken sind dort schon maskiert, darum am Original suchen
  const a = css.indexOf('GESTALTUNG-DEFINITION:BEGIN');
  const e = css.indexOf('GESTALTUNG-DEFINITION:END');
  if (a >= 0 && e > a) {
    const von = css.indexOf('*/', a) + 2;
    const bis = css.lastIndexOf('/*', e);
    if (von > 1 && bis > von) t = t.slice(0, von) + t.slice(von, bis).replace(/[^\n]/g, ' ') + t.slice(bis);
  }
  return t;
}
/* Die var(…)-Teile (auch verschachtelt) herausnehmen: was übrig bleibt, ist frei. */
function ohneVar(wert) {
  let s = wert;
  for (let i = 0; i < 6; i++) { const n = s.replace(/var\([^()]*\)/g, ' '); if (n === s) break; s = n; }
  return s;
}
/* Eine Zahl mit Einheit, nicht null: 4px, 0.5rem, 50%, 2em, 10vh. */
function freieZahlen(wert) {
  const rest = ohneVar(wert);
  const aus = [];
  const re = /(?<![\w.#-])(-?\d*\.?\d+)(px|rem|em|%|vh|vw|vmin|vmax|dvh|svh|lvh|ch|ex|pt)\b|(?<![\w.#-])(-?\d*\.?\d+)(%)/g;
  let m;
  while ((m = re.exec(rest))) { const n = parseFloat(m[1] || m[3]); if (n !== 0) aus.push(m[0]); }
  return aus;
}
function zeilenStarts(t) { const s = [0]; for (let i = 0; i < t.length; i++) if (t.charCodeAt(i) === 10) s.push(i + 1); return s; }
function zeileVon(starts, pos) { let lo = 0; let hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; }

function erlaubteUmbrueche(def) {
  const u = def.grundwerte.umbrueche;
  return { max: new Set([u.schmal_bis_px]), min: new Set([u.breit_ab_px]) };
}

function messen(cssText, def) {
  const t = maskieren(cssText);
  const starts = zeilenStarts(t);
  const stellen = Object.fromEntries(ARTEN.map((a) => [a, []]));
  // Deklarationen: Name vor ':' nach '{', ';' oder Zeilenanfang; Wert bis ';' oder '}'
  const dekl = /(?:^|[{;\s])((?:padding|margin|gap|row-gap|column-gap|border|min-height|min-width)[a-z-]*)\s*:\s*([^;{}]*)/g;
  let m;
  while ((m = dekl.exec(t))) {
    const name = m[1];
    const wert = m[2].replace(/!important/i, '').trim();
    const pos = m.index + m[0].indexOf(name);
    const zeile = zeileVon(starts, pos);
    if (name === 'min-height' || name === 'min-width') {
      const px = /^(\d+(?:\.\d+)?)px$/.exec(wert);
      if (px && +px[1] >= TREFFER_VON_PX && +px[1] <= TREFFER_BIS_PX) stellen.trefferMin.push({ zeile, wert });
      continue;
    }
    const art = (EIGENSCHAFTEN.find(([, r]) => r.test(name)) || [])[0];
    if (!art) continue;
    // `border`-Kurzschrift trägt keinen Radius; nur die Radius-Eigenschaften zählen unter radius
    if (freieZahlen(wert).length) stellen[art].push({ zeile, wert });
  }
  // @media
  const erlaubt = erlaubteUmbrueche(def);
  const media = /@media\b([^{]*)\{/g;
  while ((m = media.exec(t))) {
    const bed = m[1].trim();
    const maße = [...bed.matchAll(/\(\s*(min|max)-(width|height)\s*:\s*(\d+(?:\.\d+)?)px\s*\)/g)];
    const frei = maße.filter((x) => !(x[2] === 'width' && erlaubt[x[1]].has(+x[3])));
    if (frei.length) stellen.mediaFrei.push({ zeile: zeileVon(starts, m.index), wert: bed });
  }
  const zahlen = Object.fromEntries(ARTEN.map((a) => [a, stellen[a].length]));
  return { zahlen, stellen };
}

function vergleichen(ist, grundlinie) {
  const gestiegen = []; const gefallen = [];
  for (const a of ARTEN) {
    const soll = grundlinie.zahlen[a];
    if (typeof soll !== 'number') { gestiegen.push(`${a}: Grundlinie fehlt`); continue; }
    if (ist[a] > soll) gestiegen.push(`${a}: ${soll} → ${ist[a]}`);
    else if (ist[a] < soll) gefallen.push(`${a}: ${soll} → ${ist[a]}`);
  }
  return { gestiegen, gefallen };
}

function arg(n) { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; }
function main() {
  const def = JSON.parse(fs.readFileSync(arg('--definition') || DEFINITION, 'utf8'));
  const css = arg('--css') || GRUNDLAGE;
  const glPfad = arg('--grundlinie') || GRUNDLINIE;
  if (process.argv.includes('--stellen')) {
    const art = arg('--stellen');
    const { stellen } = messen(fs.readFileSync(css, 'utf8'), def);
    if (!stellen[art]) { console.error('Art: ' + ARTEN.join(', ')); process.exit(2); }
    for (const s of stellen[art]) console.log(`${s.zeile}\t${s.wert}`);
    return;
  }
  if (process.argv.includes('--grundlinie-schreiben')) {
    const { zahlen } = messen(fs.readFileSync(css, 'utf8'), def);
    const alt = fs.existsSync(glPfad) ? JSON.parse(fs.readFileSync(glPfad, 'utf8')) : null;
    if (alt) {
      const { gestiegen } = vergleichen(zahlen, alt);
      if (gestiegen.length) { console.error('Eine Zahl steigt, die Grundlinie wird nicht angehoben:\n  ' + gestiegen.join('\n  ')); process.exit(1); }
    }
    const neu = { gegenstand: 'Deklarationen mit freier Zahl statt var(--…) in tools/erscheinung/stil/grundlage.css (Kommentare maskiert, erzeugter Block der Definition ausgenommen), je Art. Zählweg: tools/gestaltung-freie-werte.js. Die Zahl kann nur sinken.',
      stichtag: new Date().toISOString().slice(0, 10), zahlen };
    fs.writeFileSync(glPfad, JSON.stringify(neu, null, 1) + '\n');
    console.log('Grundlinie geschrieben: ' + JSON.stringify(zahlen));
    return;
  }
  if (process.argv.includes('--check')) {
    const { zahlen } = messen(fs.readFileSync(css, 'utf8'), def);
    const { gestiegen, gefallen } = vergleichen(zahlen, JSON.parse(fs.readFileSync(glPfad, 'utf8')));
    console.log(JSON.stringify(zahlen));
    if (gestiegen.length) { console.error('ROT, gestiegen:\n  ' + gestiegen.join('\n  ')); process.exit(1); }
    if (gefallen.length) { console.error('ROT, gesunken — Grundlinie nachziehen (--grundlinie-schreiben):\n  ' + gefallen.join('\n  ')); process.exit(1); }
    console.log('gestaltung-freie-werte: grün');
    return;
  }
  // ohne Argument: Selbstprobe gegen die Fixtures
  const fdef = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'definition-gut.json'), 'utf8'));
  const gut = messen(fs.readFileSync(path.join(FIXTURES, 'frei-gut.css'), 'utf8'), fdef).zahlen;
  const roh = messen(fs.readFileSync(path.join(FIXTURES, 'frei-roh.css'), 'utf8'), fdef).zahlen;
  console.log('frei-gut: ' + JSON.stringify(gut));
  console.log('frei-roh: ' + JSON.stringify(roh));
  const ok = ARTEN.every((a) => gut[a] === 0 && roh[a] === 1);
  console.log(ok ? 'Selbstprobe grün (gut: 0, roh: je Art 1)' : 'Selbstprobe ROT');
  process.exit(ok ? 0 : 1);
}

module.exports = { messen, vergleichen, freieZahlen, maskieren, ARTEN, GRUNDLAGE, DEFINITION, GRUNDLINIE, FIXTURES };
if (require.main === module) main();
