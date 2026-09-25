'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-386 (08.09.2026, Auftrag) — "ein fünftes Produkt ist EINE
   Zeile an EINEM Ort" wird ein Mechanismus, kein Satz im ADR
   ────────────────────────────────────────────────────────────────────────
   Heute stimmt die Zusicherung NICHT — U2-ADR-383 maß drei Orte. Dieser
   Wächter benennt sie NAMENTLICH und steht umgedreht (wie U2-ADR-378): grün
   heute (drei Orte, wie gemessen), rot sobald ein vierter Ort entsteht oder
   einer der drei verschwindet — beides zwingt zu einer bewussten Entscheidung.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PRODUKTE } = require('../tools/lib/vier-produkte.js');
const {
  DREI_ORTE_NAMENTLICH, traegtZusammensetzung, datenTragendeDateien,
} = require('../tools/lib/vier-produkte-orte.js');

const SLUGS = PRODUKTE.map((p) => p.slug);

test('[U2-ADR-386] die vier aktuellen Produkt-Slugs sind wirklich vier — Vorbedingung für die Messung', () => {
  assert.equal(SLUGS.length, 4);
  assert.deepEqual(SLUGS.slice().sort(), ['pro-de', 'pro-en', 'privat-de', 'privat-en'].sort());
});

test('[U2-ADR-386] HEUTE: genau die drei namentlich genannten Orte tragen die Zusammensetzung — nicht mehr, nicht weniger', () => {
  const gemessen = datenTragendeDateien(SLUGS);
  assert.deepEqual(gemessen, DREI_ORTE_NAMENTLICH.slice().sort(),
    'Wird diese Probe rot, ist entweder ein VIERTER Ort entstanden (Liste nachziehen) oder einer '
    + 'der drei ist verschwunden (Zusammenführung gelungen — dann den Wächter umdrehen: die '
    + 'Zusicherung "eine Zeile an einem Ort" gilt erst, wenn genau EIN Ort übrig bleibt).');
});

test('[U2-ADR-386] `tests/` bleibt ausdrücklich AUSSEN VOR — dort finden sich Slug-Erwähnungen, die nichts mit der Zusammensetzung zu tun haben (gemessen, nicht vermutet)', () => {
  const testOrdner = path.join(__dirname);
  const treffer = datenTragendeDateien(SLUGS, testOrdner, testOrdner);
  assert.ok(treffer.length > 0,
    'Vorbedingung: es MUSS Test-Dateien geben, die alle vier Slugs erwähnen — sonst beweist die '
    + 'Scope-Einschränkung nichts (sie wäre dann nur zufällig richtig).');
});

/* ── Rot-Beweis: die Erkennung selbst, auf einer Fixture-Kopie, nie im echten Baum ────── */

function mitFixture(dateien, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-adr-386-orte-'));
  for (const [relPfad, inhalt] of Object.entries(dateien)) {
    const voll = path.join(tmp, relPfad);
    fs.mkdirSync(path.dirname(voll), { recursive: true });
    fs.writeFileSync(voll, inhalt, 'utf8');
  }
  try { return fn(tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

const VIER_SLUGS = ['privat-de', 'privat-en', 'pro-de', 'pro-en'];
const DREI_SLUGS_ALS_QUELLTEXT = "const x = ['privat-de', 'privat-en', 'pro-de', 'pro-en'];\n";

test('[U2-ADR-386·Rot-Beweis] ein VIERTER Ort mit allen vier Slugs wird gefunden — die Probe würde hier rot', () => {
  mitFixture({
    'a.js': DREI_SLUGS_ALS_QUELLTEXT,
    'b.js': DREI_SLUGS_ALS_QUELLTEXT,
    'c.js': DREI_SLUGS_ALS_QUELLTEXT,
    'ueberraschung.js': DREI_SLUGS_ALS_QUELLTEXT,
  }, (tmp) => {
    const gemessen = datenTragendeDateien(VIER_SLUGS, tmp, tmp);
    assert.deepEqual(gemessen, ['a.js', 'b.js', 'c.js', 'ueberraschung.js'].sort(),
      'vier Dateien statt drei — genau der Fall, der die echte Probe rot machen würde');
    assert.notDeepEqual(gemessen, ['a.js', 'b.js', 'c.js']);
  });
});

test('[U2-ADR-386·Rot-Beweis] einer der drei verschwindet — nur noch zwei werden gefunden', () => {
  mitFixture({
    'a.js': DREI_SLUGS_ALS_QUELLTEXT,
    'b.js': DREI_SLUGS_ALS_QUELLTEXT,
  }, (tmp) => {
    const gemessen = datenTragendeDateien(VIER_SLUGS, tmp, tmp);
    assert.deepEqual(gemessen, ['a.js', 'b.js']);
    assert.notDeepEqual(gemessen, ['a.js', 'b.js', 'c.js']);
  });
});

test('[U2-ADR-386·Gegenprobe] eine Datei mit nur EINEM Slug zählt NICHT als datentragend', () => {
  mitFixture({
    'nur-ein-slug.js': "konfektionieren({ slug: 'privat-de' });\n",
  }, (tmp) => {
    assert.deepEqual(datenTragendeDateien(VIER_SLUGS, tmp, tmp), []);
  });
});

test('[U2-ADR-386] `traegtZusammensetzung` prüft angeführte Literale, keine Teilstrings', () => {
  assert.equal(traegtZusammensetzung("'privat-de-sonderfall'", ['privat-de']), false,
    'ein Slug als Teilstring eines längeren Bezeichners darf nicht zählen');
  assert.equal(traegtZusammensetzung("'privat-de'", ['privat-de']), true);
});
