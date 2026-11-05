'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-fr-pruefen.js — Treue einer französischen Übersetzung zum deutschen Original (29.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Zwei mechanisch prüfbare Eigenschaften, wie beim englischen Satz:
     1. PLATZHALTER — jeder `{…}`-Platzhalter des Deutschen steht unverändert im Französischen, gleich oft
        (dieselbe Prüfung wie tools/textsatz-en-platzhalter-pruefen.js, von dort genommen, nicht kopiert).
     2. GLOSSAR — enthält der deutsche Text einen Begriff aus tools/textsatz-fr-glossar.json, trägt der französische
        eine der festgelegten Fassungen (Groß-/Kleinschreibung gleich). Eine fehlende Kennung ist kein Verstoß: das ist
        Deckung, die der Erzeuger zählt.
   Ob ein Satz natürlich klingt, prüft dieses Werkzeug nicht — das bleibt die Gegenlesung.
   Aufruf:  node tools/textsatz-fr-pruefen.js [--fr <kennung-text.json>] [--json]
   Ohne --fr prüft es die Texte des Repos (tools/textsatz-fr-daten.js) gegen das deutsche Modul. Exit 1 bei Verstößen.
   Probe: tests/textsatz-fr.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { platzhalterVerstoesse } = require('./textsatz-en-platzhalter-pruefen.js');

const GLOSSAR = JSON.parse(fs.readFileSync(path.join(__dirname, 'textsatz-fr-glossar.json'), 'utf8'));

function glossarVerstoesse(de, fr, glossar = GLOSSAR) {
  const raus = [];
  for (const kennung of Object.keys(fr)) {
    const deutsch = de[kennung];
    if (typeof deutsch !== 'string') continue;
    const franzoesisch = String(fr[kennung]).toLowerCase();
    for (const b of glossar.begriffe) {
      if (!deutsch.toLowerCase().includes(b.de.toLowerCase())) continue;
      if (b.fr.some((form) => franzoesisch.includes(form.toLowerCase()))) continue;
      raus.push({ kennung, begriff: b.de, erwartet: b.fr.join(' / '), franzoesisch: fr[kennung] });
    }
  }
  return raus;
}

function pruefen(de, fr, glossar = GLOSSAR) {
  return { platzhalter: platzhalterVerstoesse(de, fr), glossar: glossarVerstoesse(de, fr, glossar) };
}

module.exports = { pruefen, glossarVerstoesse, GLOSSAR };

if (require.main === module) {
  const a = process.argv.slice(2);
  const i = a.indexOf('--fr');
  const fr = i >= 0 ? JSON.parse(fs.readFileSync(path.resolve(a[i + 1]), 'utf8')) : require('./textsatz-fr-daten.js').TEXTSATZ_FR_TEXTE;
  const de = require('./lib/textsatz-de-quelle.js').deTexte();
  const r = pruefen(de, fr);
  if (a.includes('--json')) process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  else {
    for (const v of r.platzhalter) process.stdout.write('PLATZHALTER ' + v.kennung + ': deutsch ' + v.deutsch.join(' ') + ', französisch ' + v.englisch.join(' ') + '\n');
    for (const v of r.glossar) process.stdout.write('GLOSSAR ' + v.kennung + ': „' + v.begriff + '“ verlangt ' + v.erwartet + '\n');
    process.stdout.write('[textsatz-fr-pruefen] ' + Object.keys(fr).length + ' französische Texte, ' + r.platzhalter.length + ' Platzhalter- und '
      + r.glossar.length + ' Glossar-Verstöße.\n');
  }
  process.exitCode = (r.platzhalter.length || r.glossar.length) ? 1 : 0;
}
