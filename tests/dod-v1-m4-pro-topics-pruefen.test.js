'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Guard für tools/dod-v1-m4-pro-topics-pruefen.js (Abnahmezeile M4, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DAS HIER IST NICHT DIE ABNAHME — derselbe Schnitt wie die übrigen dod-v1-Proben: geprüft wird
   die reine Vergleichsfunktion `pruefeGenauDieseThemen()` (synthetisch, kein Bau) und dass das
   Werkzeug gegen die eingefrorene Fixture (zwei harmlose, cluster-freie Test-Bereiche) tatsächlich
   baut und zählt — nicht die echten sechs Pro-Themen (die liegen in einem eigenen Arbeitsbaum,
   nicht im Repo, s. Kopf-Kommentar des Werkzeugs).

   DIE ECHTE ROT-HEUTE-ZAHL, außerhalb dieser Datei: `node tools/dod-v1-m4-pro-topics-pruefen.js
   --templates-ordner <die sechs echten Templates> --identitaet-id identity` — gemessen am
   17.09.2026: KEIN Themen-Zählfehler, sondern ein KERN-ABSTURZ beim Laden
   ("Cannot access '_BEREICH_CLUSTER_FORM' before initialization", sobald ein Template ein
   `cluster`-Feld trägt) — unabhängig bestätigt über ein eigenes Werkzeug und gemeldet.
   Vor diesem Fund war ohne `cluster`-Feld schon gemessen:
   19 Themen statt 7 (alle 13 nativen PLUS die sechs Pro-Templates, rein additiv) — der Befund,
   den M4 eigentlich zeigen sollte, steht also noch aus, weil der Bau vorher abstürzt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { themenAusTemplatesBauen, pruefeGenauDieseThemen, FIXTURE_ORDNER } = require('../tools/dod-v1-m4-pro-topics-pruefen.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/* ── pruefeGenauDieseThemen() — reine Funktion ─────────────────────────────── */

test('[pruefeGenauDieseThemen] exakte Übereinstimmung: GRÜN', () => {
  const r = pruefeGenauDieseThemen(['identity', 'a', 'b'], ['identity', 'a', 'b']);
  assert.deepEqual(r, { gruen: true, zuViel: [], zuWenig: [] });
});

test('[pruefeGenauDieseThemen·Rot-Beweis] zusätzliches natives Thema wird als "zu viel" benannt — der M4-Rotfall', () => {
  const r = pruefeGenauDieseThemen(['identity', 'a', 'wohnen', 'gesundheit'], ['identity', 'a']);
  assert.equal(r.gruen, false);
  assert.deepEqual(r.zuViel.sort(), ['gesundheit', 'wohnen']);
  assert.deepEqual(r.zuWenig, []);
});

test('[pruefeGenauDieseThemen·Rot-Beweis] fehlendes erwartetes Thema wird als "zu wenig" benannt', () => {
  const r = pruefeGenauDieseThemen(['identity'], ['identity', 'a']);
  assert.equal(r.gruen, false);
  assert.deepEqual(r.zuViel, []);
  assert.deepEqual(r.zuWenig, ['a']);
});

test('[pruefeGenauDieseThemen] Reihenfolge/Duplikate in der Eingabe verfälschen das Ergebnis nicht (Mengenvergleich, keine Listengleichheit)', () => {
  const r = pruefeGenauDieseThemen(['b', 'a', 'a'], ['a', 'b']);
  assert.equal(r.gruen, true);
});

/* ── themenAusTemplatesBauen() — echter Bau gegen die eingefrorene Fixture ─── */

test('[themenAusTemplatesBauen] seit dem Schnitt trägt ein Produkt genau die Themen seiner Templates — kein natives Bündel mehr daneben', () => {
  // Bis 18.09.2026 standen die 13 nativen Themen (BUERGERMODUL_BUENDEL) neben den Templates (additiv, das war
  // der M4-Befund). Der Schnitt hat das Bündel entfernt: ohne Templates zeigt ein leeres Depot kein Thema,
  // mit den Fixture-Templates genau deren zwei.
  const leererZiel = fs.mkdtempSync(path.join(os.tmpdir(), 'm4-guard-leer-'));
  const mitFixturenZiel = fs.mkdtempSync(path.join(os.tmpdir(), 'm4-guard-mit-'));
  try {
    const ohneTemplates = themenAusTemplatesBauen([], leererZiel);
    const mitFixturen = themenAusTemplatesBauen(
      fs.readdirSync(FIXTURE_ORDNER).filter((n) => n.endsWith('.json')).map((n) => path.join(FIXTURE_ORDNER, n)),
      mitFixturenZiel,
    );
    assert.deepEqual(ohneTemplates, [], 'ohne Templates darf kein natives Thema mehr im Kern stehen (Schnitt 18.09.2026)');
    assert.deepEqual(mitFixturen, ['fixture-thema-a', 'fixture-thema-b'],
      'ROT ERWARTET, wenn ein natives Bündel oder ein Filter wieder Themen neben den Templates einführt.');
  } finally {
    fs.rmSync(leererZiel, { recursive: true, force: true });
    fs.rmSync(mitFixturenZiel, { recursive: true, force: true });
  }
});

test('[themenAusTemplatesBauen] ein Template ohne Pflichtfeld (label) wird BEIM BAU verworfen, nicht heimlich als Thema gezählt', () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'm4-guard-ohne-label-'));
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'm4-guard-ohne-label-ziel-'));
  try {
    fs.writeFileSync(path.join(ordner, 'kaputt.json'), JSON.stringify({
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de',
      kennung: 'vivodepot/kaputt', fassung: 1,
      bereiche: { 'kaputtes-thema': { id: 'kaputtes-thema', format: 'GENERISCH', icon: 'briefcase', sektionen: [] } },
    }), 'utf8');
    const ids = themenAusTemplatesBauen([path.join(ordner, 'kaputt.json')], ziel);
    assert.ok(!ids.includes('kaputtes-thema'), 'ein Thema ohne label darf nicht in bereicheAlle() auftauchen');
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
    fs.rmSync(ziel, { recursive: true, force: true });
  }
});
