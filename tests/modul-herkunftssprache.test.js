'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   1.0a — EINE MODUL-BESCHRIFTUNG SAGT, IN WELCHER SPRACHE SIE STEHT
   ────────────────────────────────────────────────────────────────────────────
   Entschieden am 22.08.2026 („1a", Entscheidungsvorlage „Vier
   Fragen zum Bau"): die Angabe ist PFLICHT — für neue Module wie für den
   Bestand. Ohne sie wird das Modul abgewiesen, BENANNT.

   WOZU SIE ÜBERHAUPT DA IST, und das ist der Grund für die Strenge: ohne sie
   weiss die Migration aus 1.4b nicht, unter welcher Sprache sie ein
   Bestands-Label ablegen soll. Aus `data.textsprache` darf sie es NICHT nehmen —
   das ist die Sprache der BÜRGERIN, die Beschriftung gehört dem ANBIETER.
   Gemessen in `tools/schnitt-migration-messen.js` (A492) als die einzige
   Reihenfolge, die der Schnitt erzwingt.

   WARUM JETZT: es gibt NULL ausgelieferte Module. Ab dem ersten fremden Modul
   ist die strenge Form nicht mehr zu haben.

   DIE GRENZE, und sie ist gemessen und nicht geraten: die Pflicht gilt NUR, wo
   es eine Beschriftung gibt. Ein Modul ohne menschenlesbaren Text braucht keine
   Sprachangabe — die Pflicht hätte dort keinen Gegenstand und zöge Bestand um,
   ohne etwas zu sichern. Das ist derselbe Massstab, den der Laufzettel für 1.3
   setzt: es gewinnt die Form, die den wenigsten Bestand umzieht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_DATEI = process.env.KERN_HTML_PATH || path.join(__dirname, '..', 'vivodepot.html');

/* Je Register ein Modul, das eine Beschriftung trägt — und ihre Stelle. Die
   Liste ist der Gegenstand dieser Datei: ein Register, das künftig eine
   Beschriftung dazubekommt, gehört hier und in `_modulTraegtBeschriftung`
   eingetragen. Die letzte Probe hält fest, dass keines fehlt. */
const MIT_BESCHRIFTUNG = Object.freeze([
  {
    register: 'bereich', stelle: 'bereiche{}.label',
    bauen: (sprache) => Object.assign({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'probe',
      bereiche: { zzprobe: { label: 'Probe-Rubrik' } } }, sprache ? { sprache } : {}),
    pruefen: (V, m) => V.bereichsModulPruefen(m),
  },
  {
    register: 'institutionsArt', stelle: 'arten[]',
    bauen: (sprache) => Object.assign({ modulTyp: 'institutionsArt', moduleVersion: 1, herkunft: 'probe',
      arten: { 'zz-probe': 'Probe-Art' } }, sprache ? { sprache } : {}),
    pruefen: (V, m) => V.institutionsArtModulPruefen(m),
  },
  {
    register: 'format', stelle: 'label',
    bauen: (sprache) => Object.assign({ modulTyp: 'format', moduleVersion: 1, format: 'zz-probe-csv',
      richtung: 'import', sektor: 'finance', label: 'Probe-CSV', leser: 'json@1', quelle: 'eintraege',
      zuordnung: [{ feld: 'taxIdsTaxNumbers', ziel: 'steuernummer' }] }, sprache ? { sprache } : {}),
    pruefen: (V, m) => V.formatModulPruefen(m),
  },
  {
    // U2-ADR-246 (04.09.2026): wörtlicher Spiegel des `bereich`-Eintrags oben.
    register: 'situation', stelle: 'situationen{}.titel',
    bauen: (sprache) => Object.assign({ modulTyp: 'situation', moduleVersion: 1, herkunft: 'probe',
      situationen: { 'zz-probe': { titel: 'Probe-Situation' } } }, sprache ? { sprache } : {}),
    pruefen: (V, m) => V.situationsModulPruefen(m),
  },
]);

function kern() { return ladeKern().V; }

/* ── Die Pflicht ─────────────────────────────────────────────────────────── */

for (const r of MIT_BESCHRIFTUNG) {
  test('[1.0a] ' + r.register + ': mit Sprachangabe kommt das Modul durch', () => {
    const g = r.pruefen(kern(), r.bauen('de'));
    assert.equal(g.gueltig, true, 'abgewiesen mit Grund „' + g.grund + '"');
  });

  test('[1.0a·Rot-Beleg] ' + r.register + ': OHNE Sprachangabe wird es abgewiesen — benannt', () => {
    /* „Benannt, nicht stillschweigend" ist die halbe Entscheidung: ein Anbieter,
       der „angenommen" hört und nichts bewirkt hat, ist genau die Klasse, gegen
       die A476 geschrieben ist. */
    const g = r.pruefen(kern(), r.bauen(null));
    assert.equal(g.gueltig, false, r.stelle + ' trägt eine Beschriftung ohne Sprache und kommt durch');
    assert.equal(g.grund, 'sprache', 'der Grund muss `sprache` heissen, nicht etwas anderes');
  });

  test('[1.0a·Rot-Beleg] ' + r.register + ': eine unsinnige Sprachangabe fällt durch', () => {
    const g = r.pruefen(kern(), r.bauen('Deutsch bitte'));
    assert.equal(g.gueltig, false);
    assert.equal(g.grund, 'sprache-form',
      'eine Freitext-Angabe ist keine Sprachkennung — sonst genügt jeder Tippfehler');
  });
}

/* ── Die Grenze: ohne Beschriftung keine Pflicht ─────────────────────────── */

test('[1.0a·Gegenprobe] ein Modul OHNE Beschriftung braucht keine Sprachangabe', () => {
  /* Sonst zöge die Pflicht Bestand um, ohne etwas zu sichern. Ein Format-Modul
     hat immer ein `label`; ein Bereichs-Modul mit leerer Liste hat keine
     Beschriftung — und `bereiche: []` fällt an seiner eigenen Prüfung, nicht an
     der Sprache. Der belastbare Fall ist darum die reine Funktion. */
  const V = kern();
  assert.equal(V._modulTraegtBeschriftung({ modulTyp: 'bereich', moduleVersion: 1, bereiche: {} }), false);
  assert.equal(V._modulSpracheGrund({ modulTyp: 'bereich', moduleVersion: 1, bereiche: {} }), null,
    'ohne Beschriftung gibt es nichts einzuordnen');
});

test('[1.0a] jede der sechs Beschriftungs-Stellen wird erkannt', () => {
  /* Wird eine Stelle vergessen, greift die Pflicht dort still nicht — und ein
     Modul mit Beschriftung ohne Sprache käme durch, ohne dass ein Lauf rot wird.
     logikModul ergänzt (Code-Review 28.08.2026) — war beim Siebtes-Register-Bau
     (27.08.2026) nicht nachgezogen worden. situation ergänzt (U2-ADR-246,
     04.09.2026) — dasselbe Nachziehen für das achte Register. */
  const V = kern();
  const faelle = [
    ['format.label', { label: 'x' }],
    ['bereich.bereiche{}.label', { bereiche: { a: { label: 'x' } } }],
    ['institutionsArt.arten[]', { arten: { a: 'x' } }],
    ['rechtsraum.typen[].wortlaut', { typen: { t: { wortlaut: 'x' } } }],
    ['logikModul.titel', { titel: 'x', abschnitte: [] }],
    ['situation.situationen{}.titel', { situationen: { a: { titel: 'x' } } }],
  ];
  for (const [name, m] of faelle) {
    assert.equal(V._modulTraegtBeschriftung(m), true, name + ' wird nicht als Beschriftung erkannt');
  }
});

/* ── Der Textsatz läuft NICHT hier durch ─────────────────────────────────── */

test('[1.0a] der Textsatz behält seine eigene Sprachprüfung', () => {
  /* Dort ist die Sprache der Registry-SCHLÜSSEL und wird schon vorher geprüft.
     Liefe er zusätzlich durch `_modulSpracheGrund`, gäbe es zwei Prüfungen für
     dieselbe Sache — und die zweite könnte irgendwann anders entscheiden. */
  const V = kern();
  const ohne = V.textsatzModulPruefen({ modulTyp: 'textsatz', moduleVersion: 1, texte: {} });
  assert.equal(ohne.gueltig, false);
  assert.equal(ohne.grund, 'sprache', 'der Textsatz weist unverändert selbst ab');
  const mit = V.textsatzModulPruefen({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'zz', texte: {} });
  assert.equal(mit.gueltig, true, 'und er nimmt unverändert an');
});

/* ── Die Kopplung an das Register der Beschriftungs-Stellen ──────────────── */

test('[1.0a] die Sprachform steht als benannte Konstante im Kern', () => {
  /* Ein Muster, das in einer Bedingung versteckt liegt, kann niemand nachlesen —
     und wer es lockert, tut es unbemerkt. */
  const quelle = fs.readFileSync(KERN_DATEI, 'utf8');
  assert.ok(/const _MODUL_SPRACHE_FORM = \//.test(quelle),
    '`_MODUL_SPRACHE_FORM` steht nicht mehr als benannte Konstante');
  const V = kern();
  for (const gut of ['de', 'es', 'es-EC', 'zz', 'hu']) {
    assert.equal(V._modulSpracheGrund({ label: 'x', sprache: gut }), null, gut + ' sollte gelten');
  }
  for (const schlecht of ['', 'D', 'deutsch bitte', '123', 'de_DE']) {
    assert.notEqual(V._modulSpracheGrund({ label: 'x', sprache: schlecht }), null,
      '„' + schlecht + '" sollte durchfallen');
  }
});
