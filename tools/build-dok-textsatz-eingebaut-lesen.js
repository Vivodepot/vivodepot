#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   build-dok-textsatz-eingebaut-lesen.js — die Lese-App erkennt die Kennungen
   der zwei Ab-Werk-Vorlagen als übersetzbar (U2-ADR-357, 07.09.2026)
   ────────────────────────────────────────────────────────────────────────
   GESCHWISTER von tools/build-textsatz-eingebaut-lesen.js (U2-ADR-349,
   55/0b, 07.09.2026), NICHT Teil davon — abgesprochen mit `0b`:
   „gleicher Mechanismus, aber eigenständiges Stück. Meine Tabelle zieht aus
   V.SEKTOREN, deine Kennungen kommen aus einer ganz anderen Kern-Struktur
   (den logikModul-Vorlagen) — meine Tabelle hat davon keine Ahnung und
   sollte auch keine kriegen, sonst wird sie zur Sammelstelle für zwei
   unabhängige Registrierungen, die nur zufällig in derselben Datei landen."

   WORAN ES HÄNGT: U2-ADR-353 gibt den zwei Ab-Werk-Vorlagen
   (erbschein-vorbereitung, zugang-zum-recht-beratungshilfe) im KERN
   Textsatz-Kennungen (`dok:<id>#<abschnittIndex>/<feldId-oder-Index>.<art>`,
   83 Stellen, 57 verschiedene Wortlaute — lokal, s. dortiges ADR). Die
   Lese-App führt für diese zwei Vorlagen eine EIGENE, gespiegelte
   Interpreter-Kopie (`LOGIK_BLOCK_HANDLER_LESEN`, `logikModulAbschnitteHTML`)
   mit einem EIGENEN `textLesen()`, das — anders als der Kern — KEINEN
   „eingebaut"-Fallback kennt: es liefert `null`, wenn kein Sprachmodul die
   Kennung überschreibt, und der Aufrufer fällt dann auf den literalen
   Bundle-Text zurück (derselbe Rückfall wie im Kern,
   `_logikModulTexteAufloesenLesen`, vivodepot-lesen.html).

   DIESES WERKZEUG LIEFERT NUR DEN KENNUNGSRAUM (für `_textsatzKennungBekannt()`
   — denselben Gate-Zweck wie `TEXTSATZ_EINGEBAUT_LESEN` bei den
   Sektor-/Feldbeschriftungen), NICHT die Rendering-Logik — die sitzt fest
   verdrahtet in `logikModulAbschnitteHTML`/`_logikModulTexteAufloesenLesen`
   (vivodepot-lesen.html), nicht Teil dieses Erzeugers, weil sie keine
   Tabelle ist, sondern Kontrollfluss.

   WARUM ERZEUGT UND NICHT VON HAND: 83 Kennungen von Hand abzutippen ist
   exakt die Bauform, die die 41 zurückgehaltenen sensiblen Felder aus
   U2-ADR-347 erzeugt hat — eine Kopie, bei der eine Stelle nicht mitkommt.

   Aufruf:
     node tools/build-dok-textsatz-eingebaut-lesen.js            → schreibt die Region
     node tools/build-dok-textsatz-eingebaut-lesen.js --check    → schreibt nichts, meldet Drift (Exit 1)
   ════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const LESEN = path.join(REPO, 'vivodepot-lesen.html');
const BEGIN = '/* TEXTSATZ_EINGEBAUT_LESEN_DOK:BEGIN — generierter Bereich (tools/build-dok-textsatz-eingebaut-lesen.js); Quelle: vivodepot.html TEXTSATZ_EINGEBAUT, Praefixe dok:erbschein-vorbereitung/dok:zugang-zum-recht-beratungshilfe */';
const ENDE = '/* TEXTSATZ_EINGEBAUT_LESEN_DOK:END */';

// Die zwei Ab-Werk-Vorlagen-IDs — dieselbe geschlossene Liste wie AB_WERK_AUSZUG_BUNDLE_TEXTE
// im Kern (vivodepot.html). Wächst ein drittes logikModul mit eigenen Kennungen dazu, ist das
// ein Fall für Weg A (genereller Läufer, s. U2-ADR-353 Abschnitt 3) — nicht ein Nachtrag hier.
const PRAEFIXE = Object.freeze(['dok:erbschein-vorbereitung', 'dok:zugang-zum-recht-beratungshilfe']);

function kennungenAusKern() {
  const raus = {};
  for (const [k, v] of Object.entries(deTexte())) {
    if (typeof v !== 'string') continue;
    if (PRAEFIXE.some((p) => k === p || k.startsWith(p + '#') || k.startsWith(p + '.'))) raus[k] = v;
  }
  if (!Object.keys(raus).length) {
    throw new Error('Keine dok:-Kennungen der zwei Ab-Werk-Vorlagen im Kern gefunden — U2-ADR-353 nicht (mehr) da? Nicht raten, nachsehen.');
  }
  return raus;
}

function region(kennungen) {
  return [
    BEGIN,
    '/* Wörtlicher Auszug aus AB_WERK_TEXTSATZ_DE.texte im Kern — nur die Kennungen der zwei',
    '   Ab-Werk-Vorlagen (U2-ADR-357). GESCHWISTER von TEXTSATZ_EINGEBAUT_LESEN oben, nicht Teil',
    '   davon (abgesprochen mit `0b` — zwei unabhängige Kern-Strukturen, zwei Tabellen). Der',
    '   SCHLÜSSELRAUM ist der Zweck dieser Tabelle — `_textsatzKennungBekannt()` fragt nur',
    '   `hasOwnProperty`, die Werte sind das deutsche Original als Beleg, nicht als eigener',
    '   Konsument (die Lese-App liest den Wert über `textLesen()` + Rückfall auf den Bundle-Text,',
    '   nicht über diese Tabelle — s. `_logikModulTexteAufloesenLesen`). */',
    'const TEXTSATZ_EINGEBAUT_LESEN_DOK = Object.freeze(' + JSON.stringify(kennungen, null, 2) + ');',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('TEXTSATZ_EINGEBAUT_LESEN_DOK-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main() {
  const check = process.argv.includes('--check');
  const kennungen = kennungenAusKern();
  console.log('build-dok-textsatz-eingebaut-lesen: ' + Object.keys(kennungen).length + ' Kennungen aus dem Kern gelesen.');
  const neuRegion = region(kennungen);
  const q = fs.readFileSync(LESEN, 'utf8');
  const neu = regionErsetzen(q, neuRegion, path.basename(LESEN));
  if (neu === q) {
    console.log('build-dok-textsatz-eingebaut-lesen: kein Drift — die Lese-App kennt dieselben Kennungen wie der Kern.');
    return;
  }
  if (check) {
    console.error('build-dok-textsatz-eingebaut-lesen: DRIFT — vivodepot-lesen.html (TEXTSATZ_EINGEBAUT_LESEN_DOK-Region)');
    console.error('  Abhilfe: node tools/build-dok-textsatz-eingebaut-lesen.js');
    process.exit(1);
  }
  fs.writeFileSync(LESEN, neu);
  console.log('build-dok-textsatz-eingebaut-lesen: Region geschrieben.');
}

if (require.main === module) main();
module.exports = { kennungenAusKern, region, regionErsetzen, BEGIN, ENDE, LESEN, PRAEFIXE };
