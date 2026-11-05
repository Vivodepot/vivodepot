'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   sprachmodul-texte-zaehlen — wie viele Texte eine weitere Sprache übersetzen muss (29.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Gemessen am englischen Satz, weil er schon für Menschen ohne Deutsch geschrieben ist (Entscheid 21.10.2026
   „Französisch als signiertes Sprachmodul“). Gezählt werden verschiedene Texte und ihre Wörter in drei Teilen:
     · Textsatz: die Werte jedes englischen Textsatz-Moduls tools/textsatz-en*-modul.json (Kern, Lese-App, Pro);
     · Begleitmodule: Zeichenketten mit Wortzwischenraum aus jeder Datei tools/**\/*-en.json, ohne die schon im Textsatz;
     · Studio: `data-en="…"` und das zweite Argument von `L(de, en)` in vivodepot-studio.html.
   Aufruf:  node tools/sprachmodul-texte-zaehlen.js [--wurzel <pfad>] [--json]
   Ohne --wurzel zählt es die kleine Vorlage tests/fixtures/sprachmodul-texte-zaehlen (die Probe kennt ihre Zahlen);
   für den echten Stand --wurzel . im Repo.
   Probe: tests/sprachmodul-texte-zaehlen.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const VORLAGE = path.join(__dirname, '..', 'tests', 'fixtures', 'sprachmodul-texte-zaehlen');
const TEXTSATZ_EN = /^textsatz-en(-[a-z]+)?-modul\.json$/;
const woerter = (s) => String(s).split(/\s+/).filter(Boolean).length;
const summe = (menge) => [...menge].reduce((a, x) => a + woerter(x), 0);

function enDateien(ordner) {
  const raus = [];
  if (!fs.existsSync(ordner)) return raus;
  for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) raus.push(...enDateien(p));
    else if (/-en\.json$/.test(e.name)) raus.push(p);
  }
  return raus.sort();
}

function zaehlen(wurzel) {
  const textsatz = new Set();
  const werkzeuge = path.join(wurzel, 'tools');
  const module = fs.existsSync(werkzeuge) ? fs.readdirSync(werkzeuge).filter((f) => TEXTSATZ_EN.test(f)).sort() : [];
  for (const f of module) for (const v of Object.values(JSON.parse(fs.readFileSync(path.join(werkzeuge, f), 'utf8')).texte || {})) textsatz.add(String(v));
  const begleit = new Set();
  const sammeln = (x) => {
    if (typeof x === 'string') { if (/[A-Za-z]{3}/.test(x) && x.includes(' ') && !textsatz.has(x)) begleit.add(x); }
    else if (x && typeof x === 'object') for (const v of Object.values(x)) sammeln(v);
  };
  const dateien = enDateien(werkzeuge).filter((p) => !TEXTSATZ_EN.test(path.basename(p)));
  for (const p of dateien) sammeln(JSON.parse(fs.readFileSync(p, 'utf8')));
  const studio = new Set();
  const sp = path.join(wurzel, 'vivodepot-studio.html');
  if (fs.existsSync(sp)) {
    const st = fs.readFileSync(sp, 'utf8');
    for (const m of st.matchAll(/data-en="([^"]+)"/g)) studio.add(m[1]);
    for (const m of st.matchAll(/\bL\(\s*(['"`])(?:(?!\1).)*\1\s*,\s*(['"`])((?:(?!\2).)*)\2/g)) studio.add(m[3]);
  }
  const teile = {
    textsatz: { texte: textsatz.size, woerter: summe(textsatz) },
    begleitmodule: { dateien: dateien.length, texte: begleit.size, woerter: summe(begleit) },
    studio: { texte: studio.size, woerter: summe(studio) },
  };
  return Object.assign(teile, {
    gesamt: { texte: textsatz.size + begleit.size + studio.size, woerter: summe(textsatz) + summe(begleit) + summe(studio) },
  });
}

module.exports = { zaehlen, VORLAGE };

if (require.main === module) {
  const a = process.argv.slice(2);
  const i = a.indexOf('--wurzel');
  const z = zaehlen(i >= 0 ? path.resolve(a[i + 1]) : VORLAGE);
  if (a.includes('--json')) process.stdout.write(JSON.stringify(z, null, 2) + '\n');
  else {
    process.stdout.write(`Textsatz (Kern, Lese-App, Pro): ${z.textsatz.texte} Texte, ${z.textsatz.woerter} Wörter\n`
      + `Begleitmodule (${z.begleitmodule.dateien} Dateien), zusätzlich: ${z.begleitmodule.texte} Texte, ${z.begleitmodule.woerter} Wörter\n`
      + `Studio: ${z.studio.texte} Texte, ${z.studio.woerter} Wörter\n`
      + `Texte gesamt: ${z.gesamt.texte} (${z.gesamt.woerter} Wörter)\n`);
  }
}
