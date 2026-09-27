#!/usr/bin/env node
'use strict';
/* Modul-Schemas (26.09.2026): welche Modultypen der Kern kennt, wer sie prüft, mit welchen
   Ablehnungs-Codes, und wo ihr JSON-Schema liegt. Zwei Nutzer:
   - als Werkzeug: `node tools/modul-schemas-messen.js [--kern <pfad>] [--aus <datei>]` schreibt die
     Messtabelle (nur Lesen, nichts bauen);
   - als Bibliothek: die Klassenwache `tests/modul-schemas-klasse.test.js` und der Gleichlauf-Helfer
     `tests/mit-modul/helfer/modul-schema-gleichlauf.js` lesen Typen und Ablehnungs-Codes von HIER, damit
     Messung und Wache dieselbe Menge sehen.
   Die Menge der Modultypen = die Einträge in `EINLASS_REGISTER` ∪ jede `function …ModulPruefen(`
   im Kern (heute nur `designModulPruefen` ohne Register). */
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');

function funktionsKoerper(kern, name) {
  const m = new RegExp('^function ' + name + '\\(', 'm').exec(kern);
  if (!m) return null;
  let j = kern.indexOf('{', m.index), tiefe = 0;
  for (; j < kern.length; j++) {
    if (kern[j] === '{') tiefe++;
    else if (kern[j] === '}' && --tiefe === 0) break;
  }
  return { zeile: kern.slice(0, m.index).split('\n').length, text: kern.slice(m.index, j + 1) };
}

function registerBlock(kern) {
  const start = kern.indexOf('const EINLASS_REGISTER = Object.freeze([');
  if (start < 0) throw new Error('EINLASS_REGISTER nicht gefunden');
  return kern.slice(start, kern.indexOf('function _einlassRegisterFuer(', start));
}

/* typ → Verzeichnisname: institutionsArt → institutions-art, logikModul → logik (sonst „logik-modul-modul“) */
const kebab = (typ) => typ.replace(/Modul$/, '').replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const schemaPfad = (typ) => 'docs/' + kebab(typ) + '-modul/' + kebab(typ) + '-modul-schema.json';
const probePfad = (typ) => 'tests/mit-modul/modul-schema-' + kebab(typ) + '.test.js';

function modulTypen(kern) {
  const block = registerBlock(kern);
  const aus = [];
  const re = /typ: '([A-Za-z]+)', slot: '([A-Za-z]+)',([\s\S]*?)kennung:/g;
  let m;
  while ((m = re.exec(block))) {
    const pf = /pruefen: \(m\) => ([A-Za-z_]+)\(m\)/.exec(m[3]);
    aus.push({ typ: m[1], slot: m[2], pruefer: pf ? pf[1] : null, register: true,
      nurGeprueft: /nurGeprueft: true/.test(m[3]), quelltext: pf ? null : m[3] });
  }
  for (const [, f] of kern.matchAll(/^function ([A-Za-z]+ModulPruefen)\(/gm)) {
    if (!aus.some((r) => r.pruefer === f)) aus.push({ typ: f.replace(/ModulPruefen$/, ''), pruefer: f, register: false });
  }
  return aus.map((r) => ({ ...r, schema: schemaPfad(r.typ), probe: probePfad(r.typ) }));
}

/* Ablehnungs-Codes: jedes literale `gueltig: false, grund: '…'` im Prüfer (bzw. im Inline-Prüfer
   des Registers). Verwerfungs-Codes einzelner Einträge (`verworfene.push`) zählen nicht — sie
   kippen das Urteil nicht. Ein dynamischer Grund (`grund: sprGrund`) ist hier nicht sichtbar. */
function ablehnungsCodes(kern, eintrag) {
  const text = eintrag.pruefer ? (funktionsKoerper(kern, eintrag.pruefer) || { text: '' }).text : eintrag.quelltext;
  const codes = new Set([...text.matchAll(/gueltig: false,\s*grund: '([^']+)'/g)].map((m) => m[1]));
  /* Kurzform: `const nein = (grund) => ({ gueltig: false, grund, … })`, dann `nein('format')`. */
  for (const [, name] of text.matchAll(/const ([A-Za-z_]+) = \(grund[^)]*\) => \(\{ gueltig: false/g)) {
    for (const m of text.matchAll(new RegExp('\\b' + name + "\\('([^']+)'", 'g'))) codes.add(m[1]);
  }
  return [...codes].sort();
}

module.exports = { modulTypen, ablehnungsCodes, funktionsKoerper, kebab, schemaPfad, probePfad };

if (require.main === module) {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const kern = fs.readFileSync(arg('--kern', path.join(WURZEL, 'vivodepot.html')), 'utf8');
  const typen = modulTypen(kern);
  const z = [];
  z.push('# Modul-Schemas — Messung (' + new Date().toISOString().slice(0, 10) + ')');
  z.push('Modultypen: ' + typen.length + ' · davon im EINLASS_REGISTER: ' + typen.filter((t) => t.register).length);
  z.push('');
  z.push('| # | typ | Prüfer | Zeile | Ablehnungs-Codes | Schema | Probe |');
  z.push('|---|---|---|---|---|---|---|');
  typen.forEach((t, i) => {
    const k = t.pruefer && funktionsKoerper(kern, t.pruefer);
    const da = (p) => (fs.existsSync(path.join(WURZEL, p)) ? p : '— (' + p + ')');
    z.push(`| ${i + 1} | ${t.typ}${t.register ? '' : ' (kein Register)'}${t.nurGeprueft ? ' (nurGeprueft)' : ''} | ${t.pruefer || '(inline im Register)'} | ${k ? k.zeile : '—'} | ${ablehnungsCodes(kern, t).join(' ') || '—'} | ${da(t.schema)} | ${da(t.probe)} |`);
  });
  const ziel = arg('--aus', null);
  if (ziel) { fs.writeFileSync(ziel, z.join('\n') + '\n'); console.log('geschrieben: ' + ziel); } else console.log(z.join('\n'));
}
