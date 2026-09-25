'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Darkmode-Selektor-Wächter (U2-ADR-350)
   ────────────────────────────────────────────────────────────────────────
   Jede Basisregel mit `color: var(--salbei-dunkel)` braucht eine passende
   `html.dark-mode`-Zeile — sonst bleibt der Text im Nachtmodus auf der
   eigenen Fläche und der Kontrast fällt auf ~2,16–2,71:1 (--salbei-dunkel
   kippt nachts selbst nicht, s. Kommentar an der Nachtliste). Zweimal von
   Hand nachgezogen (28.07.2026, dann erneut beim `.sektion h2`-Umbau) —
   diese Probe hält die Zusicherung als Struktur, nicht als Zeilenzahl.

   Gemessen 07.09.2026 (vor jedem Fix): 4 echte Lücken (nicht die eine, die
   den Anlass gab). Drei sind echte Kontrastfehler, im selben Zug behoben
   (U2-ADR-350, ADR-Text trägt die Zahlen). Die vierte ist keine — eigene
   Fläche, eigener Kontrast, s. AUSNAHMEN unten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { luecken: _luecken, messen } = require('../tools/lib/darkmode-selektor-messen');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

/* Lokaler Durchreicher, NICHT nur ein Re-Export: der Aufruf-Nachweis (operating-manual §7.5,
   tests/pruefstand-bindung.test.js) sucht die Diskriminante als `function NAME(...)`/`const
   NAME = (...) => {...}` IN DIESER DATEI — eine reine `require`-Bindung aus tools/lib
   fände er nicht. */
function luecken(html, ausnahmen) { return _luecken(html, ausnahmen); }

/* Ausnahmen brauchen einen GRUND, keine Stille (07.09.2026) — und einen eigenen
   Rot-Beweis (unten), der zeigt, dass eine entfernte Ausnahme wieder auffällt, statt für
   immer ein Loch zu sein, durch das alles passt. */
const AUSNAHMEN = Object.freeze({
  '.a11y-btn[aria-pressed="true"]':
    'trägt seine EIGENE Fläche (`background: var(--auf-akzent)`, nicht die Seiten- oder '
    + 'Akzentfläche) — im Nachtmodus ist `--auf-akzent` #e9ede7 (hell), `--salbei-dunkel` '
    + 'bleibt #4F6539: 5,45:1, besteht AA. Kein Nachzieh-Fall, sondern eine Regel, die schon '
    + 'ihren eigenen, hellen Hintergrund mitbringt.',
});

function kernLesen() { return fs.readFileSync(KERN, 'utf8'); }

test('[Darkmode-Selektor-Wächter·Ausbeute] die Probe findet überhaupt Basisregeln und Nachtzeilen', () => {
  const { benoetigt, abgedeckt } = messen(kernLesen());
  assert.ok(benoetigt.size > 10, 'zu wenige Basisregeln gefunden — Anker veraltet?');
  assert.ok(abgedeckt.size > 10, 'zu wenige Nachtmodus-Zeilen gefunden — Anker veraltet?');
});

test('[Darkmode-Selektor-Wächter] jede Basisregel mit color:var(--salbei-dunkel) hat eine Nachtzeile oder eine benannte Ausnahme', () => {
  const l = luecken(kernLesen(), Object.keys(AUSNAHMEN));
  assert.deepEqual(l, [],
    'Selektoren ohne Nachtmodus-Übersteuerung UND ohne Ausnahme: '
    + l.map((x) => x.sel + ' (Zeile ' + x.zeile + ')').join(', '));
});

test('[Darkmode-Selektor-Wächter] jede Ausnahme nennt einen Grund mit mindestens einer Kontrastzahl', () => {
  for (const [sel, grund] of Object.entries(AUSNAHMEN)) {
    assert.ok(typeof grund === 'string' && grund.length > 30, sel + ': Grund fehlt oder zu kurz');
    assert.match(grund, /\d[,.]?\d*:1/, sel + ': kein gemessener Kontrastwert im Grund');
  }
});

test('[Darkmode-Selektor-Wächter] keine Ausnahme zeigt auf eine Datei-Zeile, die inzwischen selbst abgedeckt ist (tote Ausnahme)', () => {
  const { abgedeckt } = messen(kernLesen());
  for (const sel of Object.keys(AUSNAHMEN)) {
    assert.ok(!abgedeckt.has(sel),
      sel + ' ist bereits abgedeckt — die Ausnahme ist überflüssig geworden, raus damit');
  }
});

test('[Darkmode-Selektor-Wächter·Rot-Beweis Nachtzeile] eine entfernte Nachtmodus-Zeile wird gefunden', () => {
  const quelle = kernLesen();
  const anker = 'html.dark-mode .doku-std-badge { color: var(--salbei-nacht); border-color: var(--salbei-nacht); }';
  assert.ok(quelle.includes(anker), 'Anker für .doku-std-badge nicht gefunden — Test veraltet');
  const verstuemmelt = quelle.replace(anker, '');
  const l = luecken(verstuemmelt, Object.keys(AUSNAHMEN));
  assert.ok(l.some((x) => x.sel === '.doku-std-badge'),
    'eine entfernte Nachtzeile muss als Lücke auffallen — sonst prüft diese Probe nichts');
});

test('[Darkmode-Selektor-Wächter·Rot-Beweis Ausnahme] eine entfernte Ausnahme wird wieder als Lücke gefunden — kein Loch, durch das alles passt', () => {
  const l = luecken(kernLesen(), []); // AUSNAHMEN absichtlich NICHT übergeben
  assert.ok(l.some((x) => x.sel === '.a11y-btn[aria-pressed="true"]'),
    'ohne die Ausnahmeliste muss der bekannte Sonderfall wieder als Lücke erscheinen — '
    + 'sonst wäre die Ausnahme nie geprüft, nur behauptet');
});

test('[Darkmode-Selektor-Wächter·Gegenprobe] eine unveränderte Kopie bleibt grün', () => {
  const l = luecken(kernLesen(), Object.keys(AUSNAHMEN));
  assert.deepEqual(l, []);
});

/* ── Konvention (operating-manual §7.5): Deklaration per REFERENZ, nicht per Zeichenkette ──
   Alle drei `pruefung:`-Zeilen des ADR-Konformitätsblocks konsumieren den RÜCKGABEWERT von
   `luecken()` (assert.deepEqual/assert.ok(...some(...))), nicht nur einen internen Wurf —
   der Aufruf-Nachweis kann die Diskriminante darum sauber binden. */
module.exports = {
  PROBEN: [
    { fuer: 'jede Basisregel mit color:var(--salbei-dunkel) hat eine Nachtzeile oder eine benannte Ausnahme', diskriminante: luecken },
    { fuer: 'Rot-Beweis Nachtzeile] eine entfernte Nachtmodus-Zeile wird gefunden', diskriminante: luecken },
    { fuer: 'Rot-Beweis Ausnahme] eine entfernte Ausnahme wird wieder als Lücke gefunden', diskriminante: luecken },
  ],
};
