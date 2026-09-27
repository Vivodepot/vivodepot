'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   kennung-vorkommen-finden.js — findet ALLE Vorkommensformen einer alten Kennung
   ────────────────────────────────────────────────────────────────────────────
   Aufruf:  node tools/kennung-vorkommen-finden.js <alte-kennung> [--root <dir>]
                                                   [--grundlinie <datei>] [--mehrpfad]

   WARUM (L4-Umbau, 20.09.2026): ein Literal-Grep auf die quotierte Kennung findet nur eine von
   mehreren Formen. Bei den ersten beiden Codes kamen jeweils Stellen erst im Pre-Commit-Lauf ans
   Licht, die kein Grep sah. Dieses Werkzeug führt die Formen auf, die dort gemessen wurden:

     wert          'x' / "x" / `x`               quotierter Wert
     schluessel    x: …                          unquotierter Objektschlüssel
     pfad-segment  a:x:b  a.x.b  a/x.b  a|x|b     Kennung als Segment eines Pfad-Strings
                                                  (auch `.x` als Punktzugriff)

   Ein Feld-Id-Bestandteil (`x_ort`) oder eine Wizard-Id (`x-erbe`) ist KEIN Treffer: die Kennung
   muss von Zeichen außerhalb [A-Za-z0-9_-] begrenzt sein — das sind eigene Kennungs-Achsen.

   ABGESUCHT (fest benannt, jeder Ort MUSS existieren — sonst Abbruch, nie stilles Grün):
   die vier Produkte, alle Bereichs-Templates, Angehörigen-Vorlagen, Bürgermodul-Bündel, alle
   Textsatz-Seeds und -Module, die Situationen-/Erbschein-Fixtures, die erzeugten Rechtsraum-/
   Erbschein-Module, das Einreichungs-Schema — und dieses Werkzeug samt seinem Test (es nimmt sich
   nicht aus: enthielte es die Kennung, wäre es selbst ein Fund).

   GRUNDLINIE (tools/kennung-vorkommen-grundlinie.json): ein Treffer, der bleiben MUSS (z. B. die
   Alt-Seite einer Übersetzungstabelle — sie muss die alte Kennung tragen), steht dort NAMENTLICH
   (`enthaelt: "*"` deckt eine ganze Datei — NUR für eingefrorene Belege, mit Grund),
   mit Datei, Zeilentext-Ausschnitt und Grund. Der Prüfer sieht solche Stellen weiter und meldet
   sie als „geführt"; sie werden nicht wegdefiniert. Ein Eintrag, der nichts mehr trifft, ist
   ebenfalls ein Fund (Grundlinie veraltet).

   --mehrpfad: zusätzlich (heuristisch) die Tabellen, die die Kennung tragen UND von mehr als
   einer Stelle derselben Datei gelesen werden — der Fall, der bei B16_INSTRUMENT_IMPORT den
   Live-Importweg neben der Migration verbarg. Meldung, kein Urteil.

   Exit: 0 sauber (alles geführt) · 1 ungeführte Treffer oder veraltete Grundlinie · 2 Abbruch
   (Ort fehlt/unlesbar, falscher Aufruf).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE_STANDARD = path.join(__dirname, 'kennung-vorkommen-grundlinie.json');

// Feste Orte. `datei`: muss existieren. `glob`: Verzeichnis + Endungen, mindestens EINE Datei.
const ORTE = Object.freeze([
  { datei: 'vivodepot.html' },
  { datei: 'vivodepot-lesen.html' },
  { datei: 'vivodepot-template-generator.html' },
  { datei: 'vivodepot-vc-issuer.html' },
  { glob: 'tools/bereich-templates', endungen: ['.json'] },
  { glob: 'tools/angehoerigen-vorlagen', endungen: ['.json'] },
  { glob: 'tools/buergermodul', endungen: ['.json'] },
  { glob: 'tools/dokument-module', endungen: ['.json'] },
  { glob: 'tools/vorfuehrung', endungen: ['.json'] },
  { glob: 'tests/e2e', endungen: ['.js'], rekursiv: true },
  { glob: 'tests/fixtures', endungen: ['.js', '.json', '.html'], rekursiv: true },
  { datei: 'tools/vd-privat-struktur-bundle.json' },
  { datei: 'tools/bereiche-nativ-katalog-modul.json' },   // Gerüst-Schnitt S7: der Katalog der 13 nativen Bereiche zog aus dem Kern hierher
  { glob: 'tools', praefix: 'textsatz-', endungen: ['.json', '.js'] },
  { datei: 'tests/fixtures/buergermodul-situationen-ab-werk.json' },
  { datei: 'tests/fixtures/erbschein-vorbereitung-logikmodul.json' },
  { datei: 'tools/rechtsraum-de-modul.json' },
  { datei: 'tools/erbschein-vorbereitung-modul.json' },
  { datei: 'docs/template-generator/submission-schema.json' },
  { datei: 'tools/kennung-vorkommen-finden.js' },
  { datei: 'tests/kennung-vorkommen-finden.test.js' },
]);

class Abbruch extends Error {}

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function formen(kennung) {
  const k = esc(kennung);
  const rand = '[A-Za-z0-9_-]';
  return [
    { form: 'wert', re: new RegExp('([\'"`])' + k + '\\1') },
    { form: 'schluessel', re: new RegExp('(?:^|[\\s{,(])' + k + '\\s*:(?!:)') },
    { form: 'pfad-segment', re: new RegExp('(?:[:./|,]' + k + '(?!' + rand + ')|(?<!' + rand + ')' + k + '[:./|])') },
  ];
}

function rekursivListen(dir, praefix) {
  const raus = [];
  for (const n of fs.readdirSync(path.join(dir, praefix))) {
    const rel = praefix ? praefix + '/' + n : n;
    if (fs.statSync(path.join(dir, rel)).isDirectory()) raus.push(...rekursivListen(dir, rel)); else raus.push(rel);
  }
  return raus;
}

function dateienAus(root) {
  const liste = [];
  for (const ort of ORTE) {
    if (ort.datei) {
      const p = path.join(root, ort.datei);
      if (!fs.existsSync(p)) throw new Abbruch('erwarteter Ort fehlt: ' + ort.datei);
      liste.push(ort.datei);
    } else {
      const dir = path.join(root, ort.glob);
      if (!fs.existsSync(dir)) throw new Abbruch('erwartetes Verzeichnis fehlt: ' + ort.glob);
      const alle = ort.rekursiv ? rekursivListen(dir, '') : fs.readdirSync(dir);
      const treffer = alle
        .filter((n) => (!ort.praefix || path.basename(n).startsWith(ort.praefix)) && ort.endungen.some((e) => n.endsWith(e)))
        .filter((n) => fs.statSync(path.join(dir, n)).isFile())
        .sort();
      if (!treffer.length) throw new Abbruch('erwarteter Ort ist leer (0 Dateien): ' + ort.glob + (ort.praefix ? '/' + ort.praefix + '*' : ''));
      for (const n of treffer) liste.push(ort.glob + '/' + n);
    }
  }
  return Array.from(new Set(liste));
}

function lesen(root, rel) {
  try { return fs.readFileSync(path.join(root, rel), 'utf8'); }
  catch (e) { throw new Abbruch('nicht lesbar: ' + rel + ' (' + e.code + ')'); }
}

function grundlinieLesen(pfad) {
  let roh;
  try { roh = fs.readFileSync(pfad, 'utf8'); }
  catch (e) { throw new Abbruch('Grundlinie nicht lesbar: ' + pfad + ' (' + e.code + ')'); }
  try { return JSON.parse(roh); }
  catch (e) { throw new Abbruch('Grundlinie ist kein JSON: ' + pfad); }
}

function finden(kennung, opts) {
  const o = opts || {};
  if (!kennung || !/^[A-Za-z0-9_-]+$/.test(kennung)) throw new Abbruch('Kennung fehlt oder enthält unzulässige Zeichen: ' + JSON.stringify(kennung));
  const root = o.root || REPO;
  const dateien = dateienAus(root);
  const muster = formen(kennung);
  const treffer = [];
  const inhalte = {};
  for (const rel of dateien) {
    const text = lesen(root, rel);
    inhalte[rel] = text;
    text.split('\n').forEach((zeile, i) => {
      const gefunden = muster.filter((m) => m.re.test(zeile)).map((m) => m.form);
      if (gefunden.length) treffer.push({ datei: rel, zeile: i + 1, formen: gefunden, text: zeile.trim().slice(0, 200), voll: zeile.trim() });
    });
  }
  const gl = grundlinieLesen(o.grundlinie || GRUNDLINIE_STANDARD);
  const eintraege = Array.isArray(gl[kennung]) ? gl[kennung] : [];
  const gefuehrt = [];
  const ungefuehrt = [];
  const benutzt = new Set();
  for (const t of treffer) {
    const idx = eintraege.findIndex((e) => e.datei === t.datei && (e.enthaelt === '*' || t.voll.includes(e.enthaelt)));
    if (idx >= 0) { benutzt.add(idx); gefuehrt.push(Object.assign({}, t, { grund: eintraege[idx].grund })); }
    else ungefuehrt.push(t);
  }
  const veraltet = eintraege.map((e, i) => ({ e, i })).filter((x) => !benutzt.has(x.i)).map((x) => x.e);
  const ergebnis = { kennung, dateien: dateien.length, treffer, gefuehrt, ungefuehrt, veraltet };
  if (o.mehrpfad) ergebnis.mehrpfad = mehrpfad(treffer, inhalte);
  return ergebnis;
}

// Heuristik: zu jedem Treffer die umschließende Top-Level-Definition suchen (`const|let|var NAME =`
// in Spalte 0) und zählen, in wie vielen Zeilen NAME sonst vorkommt. ≥2 Lesestellen = Meldung.
function mehrpfad(treffer, inhalte) {
  const raus = [];
  const gesehen = new Set();
  for (const t of treffer) {
    const zeilen = inhalte[t.datei].split('\n');
    let name = null; let defZeile = null;
    for (let i = t.zeile - 1; i >= 0; i--) {
      const m = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(zeilen[i]);
      if (m) { name = m[1]; defZeile = i + 1; break; }
    }
    if (!name || gesehen.has(t.datei + '|' + name)) continue;
    gesehen.add(t.datei + '|' + name);
    const re = new RegExp('(?<![\\w$])' + esc(name) + '(?![\\w$])');
    const leser = [];
    zeilen.forEach((z, i) => { if (i + 1 !== defZeile && re.test(z)) leser.push(i + 1); });
    if (leser.length >= 2) raus.push({ datei: t.datei, tabelle: name, definiertIn: defZeile, leserZeilen: leser });
  }
  return raus;
}

function bericht(r) {
  const z = [];
  z.push('kennung-vorkommen-finden: ' + r.kennung + ' — ' + r.dateien + ' Dateien abgesucht, ' + r.treffer.length + ' Treffer.');
  for (const t of r.ungefuehrt) z.push('  FUND  ' + t.datei + ':' + t.zeile + '  [' + t.formen.join(',') + ']  ' + t.text);
  for (const t of r.gefuehrt) z.push('  geführt  ' + t.datei + ':' + t.zeile + '  [' + t.formen.join(',') + ']  — ' + t.grund);
  for (const e of r.veraltet) z.push('  GRUNDLINIE VERALTET  ' + e.datei + '  „' + e.enthaelt + '" trifft nichts mehr');
  if (r.mehrpfad) for (const m of r.mehrpfad) {
    z.push('  MEHRPFAD  ' + m.datei + '  Tabelle ' + m.tabelle + ' (Def. Z.' + m.definiertIn + ') wird an ' + m.leserZeilen.length + ' Stellen gelesen: Z.' + m.leserZeilen.join(', '));
  }
  return z.join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  const opt = {};
  let kennung = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') opt.root = path.resolve(args[++i]);
    else if (args[i] === '--grundlinie') opt.grundlinie = path.resolve(args[++i]);
    else if (args[i] === '--mehrpfad') opt.mehrpfad = true;
    else if (!kennung) kennung = args[i];
    else throw new Abbruch('unbekanntes Argument: ' + args[i]);
  }
  const r = finden(kennung, opt);
  console.log(bericht(r));
  return (r.ungefuehrt.length || r.veraltet.length) ? 1 : 0;
}

module.exports = { finden, bericht, formen, ORTE, Abbruch };

if (require.main === module) {
  try { process.exit(main(process.argv)); }
  catch (e) {
    if (e instanceof Abbruch) { console.error('kennung-vorkommen-finden: ABBRUCH — ' + e.message); process.exit(2); }
    throw e;
  }
}
