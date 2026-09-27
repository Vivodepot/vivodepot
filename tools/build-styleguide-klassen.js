#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════════
   build-styleguide-klassen.js — schreibt Abschnitt 10.3 des StyleGuide
   ────────────────────────────────────────────────────────────────────────────────
   Quelle der Wahrheit ist `tools/styleguide-klassen-vollstaendig-messen.js` gegen
   den Kern. Ersetzt NUR die Region zwischen den Markern
   KLASSEN-VOLLSTAENDIG:BEGIN … KLASSEN-VOLLSTAENDIG:END (Muster wie
   `build-code-listen.js`, CODE-LISTEN:BEGIN/END).

   Staffelung MECHANISCH: ein Vorkommen → Name, Fundstellenzahl, Zeile (Minimum).
   Mehr als ein Vorkommen → zusätzlich jede CSS-Regel wörtlich (volle Beschreibung).

   Aufruf:
     node tools/build-styleguide-klassen.js              # schreibt die Datei
     node tools/build-styleguide-klassen.js --check       # nur prüfen, Exit 1 bei Drift
     node tools/build-styleguide-klassen.js --leitfaden <pfad> --kern <pfad>
   ════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { messen } = require('./styleguide-klassen-vollstaendig-messen.js');

const REPO = path.join(__dirname, '..');
function _argWert(name) {
  const i = process.argv.indexOf(name);
  return (i >= 0 && process.argv[i + 1]) ? process.argv[i + 1] : null;
}
const KERN = path.resolve(_argWert('--kern') || path.join(REPO, 'vivodepot.html'));
const LEITFADEN = path.resolve(_argWert('--leitfaden') || path.join(REPO, 'vivodepot-style-guide.html'));
const BEGIN = '<!-- KLASSEN-VOLLSTAENDIG:BEGIN — generierter Bereich (tools/build-styleguide-klassen.js) -->';
const END = '<!-- KLASSEN-VOLLSTAENDIG:END -->';

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function zeile(v) {
  if (!v.fundstellenZeilen.length) return '<em>0 (nur über zusammengesetzten Selektor/JS-Konkatenation wirksam)</em>';
  if (v.fundstellenZeilen.length === 1) return 'Zeile ' + v.fundstellenZeilen[0];
  const ersteFuenf = v.fundstellenZeilen.slice(0, 5).join(', ');
  return 'Zeilen ' + ersteFuenf + (v.fundstellenZeilen.length > 5 ? ', …' : '');
}

function regelText(v) {
  if (!v.regeln.length) return '<em>keine eigene Regel gefunden (Widerspruch zur Erfassung)</em>';
  return '<ul class="klv-regeln">' + v.regeln.map(r =>
    '<li><code>' + escapeHTML(r.selektor) + '</code> { ' + escapeHTML(r.deklaration) + ' }</li>'
  ).join('') + '</ul>';
}

function tabelle(daten) {
  const zeilen = daten.klassen.map((v) => {
    const voll = v.fundstellenZahl > 1;
    return '<tr class="' + (voll ? 'klv-voll' : 'klv-minimum') + '">' +
      '<td><code>.' + escapeHTML(v.klasse) + '</code></td>' +
      '<td>' + v.fundstellenZahl + '</td>' +
      '<td>' + zeile(v) + '</td>' +
      '<td>' + (voll ? regelText(v) : '<em>Minimum-Eintrag — genau eine Fundstelle</em>') + '</td>' +
      '</tr>';
  }).join('\n      ');

  return '\n    <p class="klv-summe">Gemessen: <strong>' + daten.klassenGesamt + '</strong> Klassen mit eigener Regel — ' +
    '<strong>' + daten.einVorkommen + '</strong> mit genau einer Fundstelle (Minimum-Eintrag), ' +
    '<strong>' + daten.mehrVorkommen + '</strong> mit mehr als einer (volle Beschreibung), davon ' +
    '<strong>' + daten.nullVorkommen + '</strong> ohne jede Fundstelle außerhalb von <code>&lt;style&gt;</code> ' +
    '(wirken nur über einen zusammengesetzten Selektor eines Eltern-/Geschwisterelements, oder sind tote Regeln).</p>\n' +
    '    <table class="spec-table klv-table">\n' +
    '      <thead><tr><th>Klasse</th><th>Fundstellen</th><th>Wo (Zeile)</th><th>Regel (bei mehr als einer Fundstelle)</th></tr></thead>\n' +
    '      <tbody>\n      ' + zeilen + '\n      </tbody>\n' +
    '    </table>\n  ';
}

function main() {
  const daten = messen(KERN);
  const region = BEGIN + tabelle(daten) + END;

  const alt = fs.readFileSync(LEITFADEN, 'utf8');
  const startIdx = alt.indexOf(BEGIN);
  const endIdx = alt.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    console.error('Marker KLASSEN-VOLLSTAENDIG:BEGIN/END nicht gefunden in ' + LEITFADEN);
    process.exit(1);
  }
  const neu = alt.slice(0, startIdx) + region + alt.slice(endIdx + END.length);

  if (process.argv.includes('--check')) {
    if (neu !== alt) {
      console.error('build-styleguide-klassen: DRIFT — Region weicht vom aktuellen Kern-Stand ab. ' +
        'node tools/build-styleguide-klassen.js ausführen.');
      process.exit(1);
    }
    console.log('build-styleguide-klassen --check: kein Drift — ' + daten.klassenGesamt + ' Klassen.');
    return;
  }
  fs.writeFileSync(LEITFADEN, neu, 'utf8');
  console.log('build-styleguide-klassen: geschrieben — ' + daten.klassenGesamt + ' Klassen (' +
    daten.einVorkommen + ' Minimum, ' + daten.mehrVorkommen + ' volle Beschreibung).');
}

if (require.main === module) main();
module.exports = { tabelle };
