'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   leere-messung-suchen — die Positivkontrolle ist der eigene Anlassfall
   ────────────────────────────────────────────────────────────────────────────
   Nachtlauf 21.08.2026, Abschnitt 2.1. Das Werkzeug legt offen, woran gemessen
   wird: jedes Prüfstoff-Depot mit den Trägerschlüsseln, die es NICHT setzt.

   WARUM DIESE PROBE DIE WICHTIGERE HÄLFTE IST: der erste Anlauf des Werkzeugs
   war eine Heuristik über Abwesenheits-BEHAUPTUNGEN im Code — und **seine
   Positivkontrolle war rot**: er fand den eigenen Anlassfall nicht, weil die
   Behauptung im KOMMENTAR stand und die Datei den Schlüssel anderswo sehr wohl
   setzte. Ein Werkzeug, das seinen Gründungsfall nicht findet, ist keins.

   Der Fall selbst ist hier als FIXTURE nachgebaut, nicht aus der Git-Historie
   gelesen: eine Probe, die eine alte Fassung braucht, misst die Historie mit.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const T = require('../tools/leere-messung-suchen.js');

/* Der Anlassfall in seiner Form: ein Prüfstoff-Depot OHNE `feldDefinitionen`,
   während die Datei von `feldDefinitionen` spricht. Wörtlich die Lage vom
   20.08.2026 in `katalogbindung-messen.js`. */
const ANLASSFALL = `'use strict';
/* Die Lese-App führt einen eigenen Katalog und kennt data.feldDefinitionen nicht. */
const leseDaten = { schemaVersion: 66, sektoren: { bildung: { tpl_x: 'Wert' } } };
L.setData(leseDaten);
const html = L.sektorHTML('bildung');
`;

const OHNE_DEFEKT = `'use strict';
const leseDaten = { schemaVersion: 70, sektoren: { bildung: { tpl_x: 'Wert' } },
  feldDefinitionen: [{ sektorId: 'bildung', feldId: 'tpl_x', typ: 'text', label: 'X' }] };
L.setData(leseDaten);
`;

function mitDatei(inhalt, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leere-messung-'));
  const p = path.join(dir, 'probe.js');
  fs.writeFileSync(p, inhalt);
  try { return fn(p); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[2.1 · Positivkontrolle] der eigene Anlassfall wird gefunden', () => {
  mitDatei(ANLASSFALL, (p) => {
    const e = T.erhebe([p]);
    assert.equal(e.length, 1, 'die Datei trägt ein Prüfstoff-Depot');
    assert.ok(e[0].genannt.includes('feldDefinitionen'), 'sie spricht von dem Träger');
    const ohne = e[0].literale.filter((l) => l.fehlt.includes('feldDefinitionen'));
    assert.equal(ohne.length, 1, 'und ihr einziges Prüfstoff-Depot setzt ihn NICHT');
  });
});

test('[2.1 · Negativkontrolle] dieselbe Datei MIT dem Träger meldet nichts', () => {
  mitDatei(OHNE_DEFEKT, (p) => {
    const e = T.erhebe([p]);
    assert.equal(e.length, 1);
    const ohne = e[0].literale.filter((l) => l.fehlt.includes('feldDefinitionen'));
    assert.equal(ohne.length, 0, 'ein Prüfstoff, der den Schlüssel trägt, ist keine Frage');
  });
});

test('[2.1] die echte Fassung von katalogbindung-messen.js ist sauber — der Fall ist behoben', () => {
  const e = T.erhebe(['tools/katalogbindung-messen.js']);
  assert.equal(e.length, 1, 'sie trägt Prüfstoff-Depots');
  const ohne = e[0].literale.filter((l) => l.fehlt.includes('feldDefinitionen'));
  assert.equal(ohne.length, 0,
    'seit A397 setzt jedes ihrer Prüfstoff-Depots die Definitionen — sonst misst sie wieder leer');
});

test('[2.1] das Werkzeug erkennt ein Depot-Literal an `sektoren:` — und nur daran', () => {
  const code = T.ohneKommentare("const a = { schemaVersion: 70, sektoren: { x: {} } };\nconst b = { foo: 1 };");
  const lit = T.depotLiterale(code);
  assert.equal(lit.length, 1, 'ein Objekt ohne `sektoren` ist kein Prüfstoff-Depot');
});

test('[2.1] Kommentare zählen als AUSSAGE, aber nicht als Prüfstoff', () => {
  /* Beides gehört zusammen: dieses Projekt begründet in Prosa — eine Behauptung steht im
     Kommentar. Ein Depot-Literal in einem auskommentierten Block ist dagegen keins. */
  mitDatei("/* sektoren: { x: {} } — nur ein Beispiel im Kommentar */\nconst a = 1;\n", (p) => {
    assert.deepEqual(T.erhebe([p]), [], 'kein Prüfstoff aus einem Kommentar');
  });
  mitDatei(ANLASSFALL, (p) => {
    const e = T.erhebe([p]);
    assert.ok(e[0].genannt.includes('feldDefinitionen'),
      'die Nennung im Kommentar zählt — dort steht die Aussage');
  });
});
