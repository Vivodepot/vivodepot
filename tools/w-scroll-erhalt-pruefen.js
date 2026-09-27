#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-Scroll-Erhalt (Auftrag N5, 09.08.2026, Zug 3) — Missbrauch des
   Navigations-Sprungs
   ────────────────────────────────────────────────────────────────────────────
   U2-ADR-127 dreht den Default: `renderContent()` ohne Argument ERHÄLT Scroll
   und Fokus, `renderContent(true)` ist die ausdrückliche Navigation (Sicht
   beginnt oben). Der Risiko-Fall ist damit UMGEKEHRT zu vorher (Muster B/N5-
   Zug-0-Erhebung): nicht mehr „ein Re-Render bleibt naked und springt
   ungewollt", sondern „ein neuer `renderContent(true)`-Aufruf wird an einer
   Stelle ergänzt, die keine echte Navigation ist" — der Fluchtweg wird zum
   Angriffsziel, weil er der einzige Weg ist, das neue sichere Verhalten
   auszuhebeln.

   MESSWEG: jedes `renderContent(true)` außerhalb eines Kommentars, der
   NÄCHSTE umschließende Funktionsname (rückwärts gesucht — Zeilennummern
   verschieben sich mit jedem Commit, Funktionsnamen sind stabiler). Bauart
   wie `W-tote-strings`: Grundlinie bekannter, im N5-Zug-0 als Navigation
   eingestufter Funktionen; rot nur bei einem NEUEN Funktionsnamen, den die
   Grundlinie nicht kennt.

   Kein Gate gegen Schrumpfung (§7.5): verliert eine bekannte Stelle ihren
   `renderContent(true)`-Aufruf (z. B. weil sie fortan doch Re-Render ist),
   ist das kein Fund — nur ein NEUER Name macht rot.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH)
  : path.join(REPO, 'vivodepot.html');
const GRUNDLINIE = path.join(REPO, 'tools', 'w-scroll-erhalt-grundlinie.json');

function naechsteUmschliessendeFunktion(zeilen, abIndex) {
  for (let j = abIndex; j >= 0; j--) {
    const m1 = zeilen[j].match(/^(?:async function|function)\s+(\w+)\s*\(/);
    if (m1) return m1[1];
    const m2 = zeilen[j].match(/^\s*(\w+):\s*\([^)]*\)\s*=>\s*\{/);
    if (m2) return m2[1];
  }
  return null;
}

function ermittleFunde() {
  const html = fs.readFileSync(HTML_PFAD, 'utf8');
  const zeilen = html.split('\n');
  const funde = [];
  for (let i = 0; i < zeilen.length; i++) {
    if (!/renderContent\(true\)/.test(zeilen[i])) continue;
    if (/^\s*\/\//.test(zeilen[i])) continue;   // Kommentar-Zeile, kein echter Aufruf
    funde.push({ zeile: i + 1, funktion: naechsteUmschliessendeFunktion(zeilen, i) });
  }
  return funde;
}

function ladeGrundlinie() {
  if (!fs.existsSync(GRUNDLINIE)) return null;
  return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
}

function gateBewerten(funde, grundlinie) {
  const bekannt = new Set(grundlinie.funktionen || []);
  const neu = funde.filter((f) => !bekannt.has(f.funktion));
  return { neu, rot: neu.length > 0 };
}

function main() {
  const argv = process.argv.slice(2);
  const funde = ermittleFunde();

  if (argv.includes('--grundlinie-schreiben')) {
    const funktionen = [...new Set(funde.map((f) => f.funktion))].sort();
    fs.writeFileSync(GRUNDLINIE, JSON.stringify({ funktionen }, null, 1) + '\n');
    console.log('Grundlinie geschrieben: ' + funktionen.length + ' bekannte Navigations-Funktionen · '
      + path.relative(REPO, GRUNDLINIE));
    return;
  }

  const grundlinie = ladeGrundlinie();

  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ funde, bewertung: grundlinie ? gateBewerten(funde, grundlinie) : null }, null, 1) + '\n');
    return;
  }

  if (argv.includes('--gate')) {
    if (!grundlinie) { console.error('GATE: keine Grundlinie — erst `--grundlinie-schreiben`.'); process.exit(2); }
    const { neu, rot } = gateBewerten(funde, grundlinie);
    if (!rot) { console.log('GATE grün — kein neuer renderContent(true)-Aufruf gegen die Grundlinie (' + (grundlinie.funktionen || []).length + ' bekannt).'); return; }
    console.error('GATE ROT — renderContent(true) an einer neuen, unbekannten Stelle:');
    for (const f of neu) console.error('    NEU: ' + f.funktion + ' (Zeile ' + f.zeile + ')');
    process.exit(1);
  }

  console.log('W-Scroll-Erhalt: ' + funde.length + ' renderContent(true)-Aufrufe.');
  for (const f of funde) console.log('  ' + f.funktion + ' (Zeile ' + f.zeile + ')');
}

if (require.main === module) main();
module.exports = { ermittleFunde, gateBewerten, GRUNDLINIE };
