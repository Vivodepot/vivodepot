'use strict';
/* ════════════════════════════════════════════════════════════════════════
   BBK-Quelle — zwei Zitate derselben Veröffentlichung dürfen nicht auseinanderlaufen
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-193. Anlass: `krisenvorsorgeBedarfQuelle` (`vivodepot.html:8610`) zitierte die
   "7. Auflage (2019)" der BBK-Checkliste — von BBK längst durch "Vorsorgen für Krisen und
   Katastrophen" ersetzt. Der Kommentar bei den BBK-Ergänzungsfeldern (`:12550-12553`, Zusatz
   vom 24.08.2026) zitierte die aktuelle Veröffentlichung bereits KORREKT, vierzig Zeilen
   darüber, in derselben Datei — nichts band beide aneinander. Dieser Zustand konnte ein
   Vierteljahr unbemerkt bestehen (Zug 0, `bbk-quellenangabe-zug0-2026-09-01.md`).

   Die Bindung läuft über das Datum, das beide Stellen für dieselbe Quelle nennen ("Stand laut
   PDF-Metadaten <Datum>") — bewusst derselbe Wortlaut an beiden Stellen, damit ein einfacher
   Textabgleich reicht und kein Parser für Kommentar UND String-Literal gebraucht wird.

   ROT-BEWEIS geführt (01.09.2026, vor der Korrektur): beide Proben unten liefen gegen den
   unkorrigierten Stand rot — die erste, weil `:8610` noch keine "Stand laut PDF-Metadaten"-Zeile
   trug (eine Fundstelle statt zwei), die zweite, weil die Zeile noch "7. Auflage (2019)" nannte.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Seit S8 (U2-ADR-428) steht der deutsche Satz (auch krisenvorsorgeBedarfQuelle) im Sprachmodul: gescannt wird Kern-Quelltext UND Moduldatei.
const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8');

function standDaten(text) {
  const re = /Stand laut PDF-Metadaten (\d{2}\.\d{2}\.\d{4})/g;
  const treffer = [];
  let m;
  while ((m = re.exec(text))) treffer.push(m[1]);
  return treffer;
}

test('[BBK-Quelle] Zitat und Kommentar nennen denselben Stand', () => {
  const daten = standDaten(HTML);
  // Seit S8 (U2-ADR-428) ist der deutsche Satz eine Moduldatei ohne Kommentare: der frühere zweite Beleg (der Kommentar bei den BBK-Ergänzungsfeldern,
  // er stand im Satz-Block des Kerns) ist mit dem Block entfallen. Es bleibt die Quellenangabe selbst; alle Nennungen im Text müssen denselben Stand tragen.
  assert.ok(daten.length >= 1,
    'Erwartet mindestens eine "Stand laut PDF-Metadaten"-Stelle (krisenvorsorgeBedarfQuelle), gefunden: ' + daten.length);
  const eindeutig = new Set(daten);
  assert.equal(eindeutig.size, 1,
    'BBK-Quellenangaben laufen auseinander — unterschiedliche Stand-Daten gefunden: ' +
    [...eindeutig].join(', '));
});

test('[BBK-Quelle] krisenvorsorgeBedarfQuelle nennt keine überholte Auflage', () => {
  const start = HTML.indexOf('"strings:krisenvorsorgeBedarfQuelle.text":');
  assert.ok(start >= 0,
    'Anker-String krisenvorsorgeBedarfQuelle fehlt — Struktur geändert? Test neu verankern.');
  const zeile = HTML.slice(start, HTML.indexOf('\n', start));
  assert.ok(!/\d+\.\s*Auflage/.test(zeile),
    'krisenvorsorgeBedarfQuelle behauptet weiterhin eine Auflagen-Zählung, die BBK selbst ' +
    'nicht mehr führt: ' + zeile);
  assert.ok(!/\(2019\)/.test(zeile),
    'krisenvorsorgeBedarfQuelle nennt weiterhin 2019 als Stand: ' + zeile);
});
