#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════
   anker-aus-daten-pruefen.js — kein Weg, auf dem ein Vertrauensanker aus Daten ins Produkt kommt (08.11.2026)
   ───────────────────────────────────────────────────────────
   Anlass: das Partner-Beispiel prüft eine Kette, deren Zertifikat ein Test-Anker signiert. Der Anker entsteht in der
   Probe je Lauf neu; in ein ausgeliefertes Produkt käme er nur über einen Codeweg, der einen Anker aus Daten annimmt.
   Diese Wege schließt der Wächter als Klasse:

   (1) STELLEN: In Kern, Lese-App und Studio steht ein Anker-Name (`ankerJwk`, `ankerSatz`, `ankerWiderrufen`) schreibend
       nur in der Durchreichung an die Prüfung der Ausgabestelle (`const ausstellerOpts = { … }`). Dort reicht die
       Prüfung die Optionen ihres eigenen Aufrufers weiter; jede andere Stelle könnte einen Anker setzen und ist ein Fund.
       Schreibend heißt: `ankerJwk:`, `.ankerJwk =`, `['ankerJwk']` und die Kurzform `{ ankerJwk }`.
   (2) ANKER-KONSTANTEN: TRUST_AUTHORITY_PUBLIC_JWK, ANKER_OHNE_KID, ANKER_SATZ und ANKER_WIDERRUFEN einer gebauten Datei
       sind textgleich mit denen des Kanons — auch ein künftiges Rezept, das Anker oder Schlüsselwerte schreibt, fällt
       damit auf. Der Anker-Satz allein nennt den Schlüssel nur beim Namen; darum zählt die Konstante mit.

   Aufruf:
     node tools/anker-aus-daten-pruefen.js [--datei <pfad> …] [--vergleich <gebaute.html> …]
     Ohne --datei: vivodepot.html, vivodepot-lesen.html, vivodepot-studio.html des Repos. --vergleich prüft (2) gegen
     den Block der gleichnamigen Datei im Repo. Exit 0 ohne Fund, 1 mit Fund.
   ═══════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const STANDARD = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html'];
const NAME = '(?:ankerJwk|ankerSatz|ankerWiderrufen)';
const SCHLUESSEL = new RegExp([
  '\\b' + NAME + '\\s*:',                 // { ankerJwk: … }
  '\\.' + NAME + '\\s*=(?![=>])',         // o.ankerJwk = …
  '\\[\\s*[\'"`]' + NAME + '[\'"`]\\s*\\]',  // o['ankerJwk']
  '[{,]\\s*' + NAME + '\\s*[,}]',         // { ankerJwk } und { a, ankerJwk, b }
  '^\\s*' + NAME + '\\s*,?\\s*$',        // Kurzform über mehrere Zeilen
].join('|'));
const KONSTANTEN = ['TRUST_AUTHORITY_PUBLIC_JWK', 'ANKER_OHNE_KID', 'ANKER_SATZ', 'ANKER_WIDERRUFEN'];
const ERLAUBT = /^\s*const ausstellerOpts = \{ ankerJwk: o\.ankerJwk, ankerSatz: o\.ankerSatz, ankerWiderrufen: o\.ankerWiderrufen, widerrufsListe: o\.widerrufsListe, jetzt: o\.jetzt \};\s*$/;

/* (1) Jede Zeile mit einem Anker-Schlüssel außerhalb der erlaubten Durchreichung. */
function ankerStellen(text) {
  const funde = [];
  String(text).split('\n').forEach((zeile, i) => {
    if (SCHLUESSEL.test(zeile) && !ERLAUBT.test(zeile)) funde.push({ zeile: i + 1, text: zeile.trim().slice(0, 160) });
  });
  return funde;
}

/* (2) Eine Konstante vom Kopf bis zum Ende ihrer Anweisung: dieselbe Zeile oder die erste mit `});`/`]);` in Spalte 0. */
function konstantenBlock(text, name) {
  const zeilen = String(text).split('\n');
  const kopf = new RegExp('^const ' + name + ' = ');
  const start = zeilen.findIndex((z) => kopf.test(z));
  if (start < 0) return null;
  if (/;\s*(\/\/.*)?$/.test(zeilen[start])) return zeilen[start];
  const ende = zeilen.findIndex((z, i) => i > start && /^[}\]]\);/.test(z));
  return ende < 0 ? null : zeilen.slice(start, ende + 1).join('\n');
}

function blockGleich(gebautText, kanonText) {
  const abweichend = KONSTANTEN.filter((n) => {
    const a = konstantenBlock(gebautText, n);
    return a === null || a !== konstantenBlock(kanonText, n);
  });
  return { gleich: abweichend.length === 0, abweichend };
}

function main(argv) {
  const dateien = [], vergleiche = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--datei') dateien.push(argv[++i]);
    else if (argv[i] === '--vergleich') vergleiche.push(argv[++i]);
  }
  const liste = dateien.length ? dateien : STANDARD.map((d) => path.join(REPO, d));
  let fund = 0;
  for (const d of liste) {
    for (const f of ankerStellen(fs.readFileSync(d, 'utf8'))) { fund++; console.log('anker-aus-daten: ' + path.basename(d) + ':' + f.zeile + ' ' + f.text); }
  }
  for (const d of vergleiche) {
    const kanon = fs.readFileSync(path.join(REPO, path.basename(d)), 'utf8');
    const v = blockGleich(fs.readFileSync(d, 'utf8'), kanon);
    if (!v.gleich) { fund++; console.log('anker-aus-daten: ' + d + ': weicht vom Kanon ab: ' + v.abweichend.join(', ')); }
  }
  console.log('anker-aus-daten: ' + (fund ? fund + ' Fund(e)' : 'grün') + ' (' + liste.length + ' Datei(en), ' + vergleiche.length + ' Vergleich(e))');
  return fund ? 1 : 0;
}

module.exports = { ankerStellen, konstantenBlock, blockGleich, KONSTANTEN, STANDARD };
if (require.main === module) process.exit(main(process.argv.slice(2)));
