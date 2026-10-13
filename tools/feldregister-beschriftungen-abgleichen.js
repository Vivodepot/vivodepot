#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   feldregister-beschriftungen-abgleichen.js — Beschriftungen des Feldregisters gegen die Wortlaute der BMJ-Formulare
   ────────────────────────────────────────────────────────────────────────────
   Das Feldregister steht unter CC0. Was wörtlich aus einem amtlichen Mustertext stammt, muss als solches erkennbar sein:
   es trägt den Quellenhinweis in `herkunft` (tools/lib/feldregister-adressen.js, QUELLENHINWEIS), keinen Lizenzvermerk.
   Der Abgleich lief am 06.10.2026 einmal im Scratchpad; hier steht er im Repo, damit er mit jeder Fassung wieder läuft.

   Gemessen wird gegen die BMJ/BZgA-Texte unter tests/fixtures/ (bmj/*.txt und bmj-*.txt) und die Zeichenketten in
   `PV_BMJ` des Kerns. Normalisiert: Kleinschreibung, alles außer Buchstaben und Ziffern wird zu einem Leerzeichen.
     ganz      eine Beschriftung mit mindestens drei Wörtern steht als Ganzes in einem Text
     folge     eine Beschriftung mit mindestens sechs Wörtern teilt eine Folge von vier Wörtern mit einem Text
   Ein Treffer, dessen gemeinsame Folgen alle eine Gesetzesangabe tragen (Paragraphennummer oder bgb, sgb, …), ist als
   `gesetz` markiert: amtliches Werk (§ 5 UrhG).
   `ausserhalbHinweis` listet Treffer in Bereichen, die der Quellenhinweis nicht nennt und die nicht einzeln in
   BEKANNT_AUSSERHALB eingeordnet sind. Die Probe verlangt sie leer.

     node tools/feldregister-beschriftungen-abgleichen.js [--kern <html>] [--register <feldregister.json>] [--json]

   Probe: tests/feldregister-beschriftungen-abgleichen.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures');
const BEREICHE_MIT_HINWEIS = Object.freeze(['advanceCare']);
const GESETZ_RE = /\b(bgb|sgb|urhg|famfg|zpo|gg|\d{3,4}[a-z]?)\b/;
// Treffer außerhalb der Bereiche des Quellenhinweises, einzeln eingeordnet. Ein neuer Eintrag braucht das Wort der
// Gegenlesung im Commit (Register der Gegenlesung, Eintrag feldregister-beschriftungen-bekannt-ausserhalb).
const BEKANNT_AUSSERHALB = Object.freeze({
  'pro-finanzen-verbindlichkeiten.tpl_bankverbindung/tpl_gilt_ueber_den_tod_hinaus':
    'Fachbegriff der Vollmacht über den Tod hinaus; Schutzfähigkeit als offene Prüffrage im Rechtspaket. Wort der Gegenlesung 09.10.2026',
});

function normalisieren(text) {
  return ' ' + String(text).toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
}

function bmjTexteIn(fixtures = FIXTURES) {
  const dateien = [];
  if (fs.existsSync(path.join(fixtures, 'bmj'))) {
    for (const d of fs.readdirSync(path.join(fixtures, 'bmj')).filter((x) => x.endsWith('.txt')).sort()) dateien.push('bmj/' + d);
  }
  for (const d of fs.readdirSync(fixtures).filter((x) => /^bmj-.*\.txt$/.test(x)).sort()) dateien.push(d);
  return dateien.map((rel) => ({ quelle: 'tests/fixtures/' + rel, text: fs.readFileSync(path.join(fixtures, rel), 'utf8') }));
}

// Die Zeichenketten-Literale im Objekt `PV_BMJ` des Kerns. Im Gerüst ist es leer; ein Produkt-Kern trägt die Wortlaute.
function pvBmjAusKern(kernText) {
  const a = kernText.indexOf('const PV_BMJ = Object.freeze({');
  if (a < 0) return '';
  const e = kernText.indexOf('\n});', a);
  const block = kernText.slice(a, e < 0 ? undefined : e);
  const texte = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(block))) texte.push(m[1] || m[2] || m[3] || '');
  return texte.join('\n');
}

function abgleichen({ felder, texte }) {
  const norm = texte.map((t) => ({ quelle: t.quelle, text: normalisieren(t.text) }));
  const treffer = [];
  for (const f of felder) {
    const label = f.label && f.label.de;
    if (!label) continue;
    const n = normalisieren(label);
    const woerter = n.trim().split(' ');
    if (woerter.length >= 3) {
      const in_ = norm.filter((t) => t.text.includes(n)).map((t) => t.quelle);
      if (in_.length) { treffer.push({ art: 'ganz', kennung: f.kennung, bereich: f.bereich, label, quellen: in_, gesetz: GESETZ_RE.test(n) }); continue; }
    }
    if (woerter.length >= 6) {
      const folgen = [];
      const quellen = new Set();
      for (let i = 0; i + 4 <= woerter.length; i++) {
        const folge = ' ' + woerter.slice(i, i + 4).join(' ') + ' ';
        const in_ = norm.filter((t) => t.text.includes(folge)).map((t) => t.quelle);
        if (in_.length) { folgen.push(folge); in_.forEach((q) => quellen.add(q)); }
      }
      // Gesetzesangabe nur, wenn JEDE gemeinsame Folge eine Paragraphennummer oder ein Gesetzeskürzel trägt.
      if (folgen.length) {
        treffer.push({ art: 'folge', kennung: f.kennung, bereich: f.bereich, label, folge: folgen[0].trim(), quellen: [...quellen],
          gesetz: folgen.every((x) => GESETZ_RE.test(x)) });
      }
    }
  }
  const ausserhalbHinweis = treffer.filter((t) => !t.gesetz && !BEREICHE_MIT_HINWEIS.includes(t.bereich) && !BEKANNT_AUSSERHALB[t.kennung]);
  return { geprueft: felder.length, treffer, ausserhalbHinweis };
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf(n); return (i >= 0 && argv[i + 1]) ? path.resolve(argv[i + 1]) : null; };
  const kernPfad = wert('--kern') || path.join(REPO, 'vivodepot.html');
  const felder = wert('--register')
    ? JSON.parse(fs.readFileSync(wert('--register'), 'utf8')).felder
    : JSON.parse(require('./feldregister-bauen.js').bauen({ kernPfad, datum: '2000-01-01' }).json).felder;
  const texte = bmjTexteIn().concat([{ quelle: 'PV_BMJ in ' + path.basename(kernPfad), text: pvBmjAusKern(fs.readFileSync(kernPfad, 'utf8')) }]);
  const r = abgleichen({ felder, texte });
  if (argv.includes('--json')) { process.stdout.write(JSON.stringify(r, null, 2) + '\n'); return; }
  process.stdout.write('feldregister-beschriftungen-abgleichen: ' + r.geprueft + ' Beschriftungen gegen ' + texte.length + ' Texte, '
    + r.treffer.length + ' Treffer\n');
  for (const t of r.treffer) {
    process.stdout.write('  ' + t.art.padEnd(5) + ' ' + (t.gesetz ? 'gesetz ' : '       ') + t.kennung + ' — „' + t.label + '“'
      + (t.folge ? ' (Folge „' + t.folge + '“)' : '') + ' in ' + t.quellen.join(', ') + '\n');
  }
  if (r.ausserhalbHinweis.length) {
    process.stdout.write('ROT: ' + r.ausserhalbHinweis.length + ' Treffer außerhalb der Bereiche des Quellenhinweises ('
      + BEREICHE_MIT_HINWEIS.join(', ') + ') — Quellenhinweis erweitern oder Beschriftung umformulieren.\n');
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try { main(); } catch (e) { process.stderr.write('feldregister-beschriftungen-abgleichen: ABBRUCH — ' + e.message + '\n'); process.exitCode = 1; }
}

module.exports = { normalisieren, bmjTexteIn, pvBmjAusKern, abgleichen, BEREICHE_MIT_HINWEIS, GESETZ_RE, BEKANNT_AUSSERHALB };
