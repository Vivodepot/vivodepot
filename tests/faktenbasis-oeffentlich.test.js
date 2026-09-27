'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Faktenbasis ist öffentlich — ohne Interna (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   docs/faktenbasis.md geht in den öffentlichen Zuschnitt. Sie gab im Abschnitt
   „Gestaltung“ die CSS-Regeln samt Kommentaren wörtlich aus, und die trugen
   interne Kürzel und Arbeitsvermerke („K4 Zug 1“, „A247, Glied 1“, „D44“,
   „F2-Nachbesserung“, „UX-Spec VII“, „toter Code“). Das ADR-Register übernahm
   Titel mit Prozesswörtern („xButton-Auftrag“, „— D43“, „Zug 2“, „… war zur
   Hälfte falsch“). Seit heute: Gestaltung nur mit Klasse und Zahlen, die
   ADR-Titel an der Quelle ohne interne Kürzel.
   Die Probe liest die erzeugte Datei und verlangt: kein CSS-Kommentar, keines
   der Muster unten. ROT-BEWEIS an genau den Stellen, die heute raus sind.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DATEI = path.join(__dirname, '..', 'docs', 'faktenbasis.md');

// Interne Kürzel und Prozesswörter. Ein Code aus Buchstabe und zwei bis drei Ziffern (D43, A247), außer dem
// ADR-Namensraum (B16-ADR-…); Arbeits- und Prozessvermerke.
const MUSTER = [
  { name: 'CSS-Kommentar', re: /\/\*\s/ },
  { name: 'Kürzel', re: /\b[A-Z][0-9]{2,3}[a-z]?\b(?!-ADR)/ },
  { name: 'Zug', re: /\bZug \d|Besitz-Zug/ },
  { name: 'Etappe', re: /\bEtappe \d/ },
  { name: 'Auftrag', re: /\bAuftrag\b|-Auftrag\b/ },
  { name: 'Findings', re: /\bFindings?\b/ },
  { name: 'Selbstbewertung', re: /zur Hälfte falsch|toter Code/ },
  { name: 'Arbeitsvermerk', re: /\bGlied \d|Nachbesserung|UX-Spec|\bStrang\b/ },
  { name: 'Sitzungskürzel', re: /\bKOORD\d|\bVDS\d/ },
];

function befund(text) {
  const funde = [];
  text.split('\n').forEach((zeile, i) => {
    for (const m of MUSTER) if (m.re.test(zeile)) funde.push((i + 1) + ' [' + m.name + '] ' + zeile.slice(0, 120));
  });
  return funde;
}

test('[Faktenbasis·öffentlich] kein CSS-Kommentar, kein internes Kürzel, kein Prozesswort in der erzeugten Datei', () => {
  const text = fs.readFileSync(DATEI, 'utf8');
  assert.ok(/## ADR-Register \(\d+\)/.test(text) && /## Gestaltung/.test(text), 'Vorbedingung: beide Abschnitte stehen da');
  assert.deepEqual(befund(text), []);
});

test('[Faktenbasis·öffentlich·Rot-Beweis] die Zeilen vom 26.09.2026 fallen, je an ihrem Muster', () => {
  const alt = [
    '| U2-ADR-015 | Interner verschlüsselter Arbeitsstand (Zwei-Ebenen-Persistenz, IndexedDB-Senke) — D43 |',
    '| U2-ADR-044 | SHL / xShare (xButton-Auftrag): nicht in v1 — Website-Claim korrigiert |',
    '| U2-ADR-305 | Der Situations-Befund in U2-ADR-301 war zur Hälfte falsch — korrigiert |',
    '| U2-ADR-367 | `TEXTSATZ_EINGEBAUT` wird das deutsche Sprachmodul selbst — Zug 3, Besitz-Zug |',
    '| U2-ADR-190 | Bedingtes skipWaiting — Anwendung von U2-ADR-015 Etappe 8 |',
    '| U2-ADR-052 | Wortlaut-Findings aus dem iOS/Desktop-Test |',
    '| `.topbar` | 36 | 2 | `/* ── Fokus-Ring, global (K4 Zug 1, 10.08.2026) */ .topbar { }` |',
    '| `.btn-notfall` | 2 | 0 (toter Code) | — |',
  ].join('\n');
  const namen = befund(alt).map((f) => f.match(/\[([^\]]+)\]/)[1]);
  for (const erwartet of ['Kürzel', 'Auftrag', 'Selbstbewertung', 'Zug', 'Etappe', 'Findings', 'CSS-Kommentar']) {
    assert.ok(namen.includes(erwartet), erwartet + ' fehlt in ' + JSON.stringify(namen));
  }
  assert.equal(new Set(befund(alt).map((f) => f.split(' ')[0])).size, 8, 'jede der acht Zeilen fällt');
  // Gegenprobe: der ADR-Namensraum und ein Glob sind kein Fund.
  assert.deepEqual(befund('| U2-ADR-094 | Nachtrag zu B16-ADR-106 |\n`tests/e2e/*.spec.js`'), []);
});
