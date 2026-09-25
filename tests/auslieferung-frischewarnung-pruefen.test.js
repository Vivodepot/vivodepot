'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   auslieferung-frischewarnung-pruefen.test.js — „Rangfolge
   bauen", Posten 1 (11.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Positivkontrolle UND Rot-Beweis, damit „grün" hier beweist, dass der
   Prüfer sehen kann, nicht nur, dass er heute nichts fand (Auftrag, 11.09.2026).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  liesSchalenStand, alsZahl, pruefeFrische, FIXTURE_ZIEL, SCHWELLE_DEFAULT,
} = require('../tools/auslieferung-frischewarnung-pruefen.js');

test('[Frischewarnung] liesSchalenStand findet SCHALEN_STAND in echtem HTML-Text', () => {
  assert.equal(liesSchalenStand("const SCHALEN_STAND = 'v668';"), 'v668');
});

test('[Frischewarnung] liesSchalenStand liefert null statt zu werfen, wenn nichts passt', () => {
  assert.equal(liesSchalenStand('kein Treffer hier'), null);
});

test('[Frischewarnung] alsZahl liest die Ziffern aus vNNN, null bei Unsinn', () => {
  assert.equal(alsZahl('v668'), 668);
  assert.equal(alsZahl('unsinn'), null);
  assert.equal(alsZahl(undefined), null);
});

test('[Frischewarnung·Positivkontrolle] Fixture (v660 überall) gegen einen nahen Kanon-Stand bleibt grün', () => {
  const { funde, gemessen } = pruefeFrische(FIXTURE_ZIEL, 'v662', SCHWELLE_DEFAULT);
  assert.deepEqual(funde, [], 'Abstand 2 liegt unter der Schwelle ' + SCHWELLE_DEFAULT + ' — darf nichts melden');
  assert.equal(gemessen.length, 3, 'alle drei existierenden Orte (buerger-de, buerger-en, betriebssatz-de) gemessen');
});

test('[Frischewarnung·Rot-Beweis] derselbe Fixture-Bestand gegen einen weit entfernten Kanon-Stand wird rot', () => {
  const { funde } = pruefeFrische(FIXTURE_ZIEL, 'v700', SCHWELLE_DEFAULT);
  assert.equal(funde.length, 3, 'alle drei existierenden Orte liegen bei Abstand 40 über der Schwelle');
  assert.ok(funde.every((f) => f.art === 'veraltet'));
  assert.ok(funde.some((f) => f.slug === 'buerger-de'));
  assert.ok(funde.some((f) => f.slug === 'buerger-en'));
  assert.ok(funde.some((f) => f.slug === 'betriebssatz-de'));
});

test('[Frischewarnung] betriebssatz-en (NICHT_VORHANDEN im Register) wird nie geprüft — kein Fund, kein „fehlt"', () => {
  const { funde, gemessen } = pruefeFrische(FIXTURE_ZIEL, 'v700', SCHWELLE_DEFAULT);
  assert.ok(!funde.some((f) => f.slug === 'betriebssatz-en'));
  assert.ok(!gemessen.some((g) => g.slug === 'betriebssatz-en'));
});

test('[Frischewarnung·Gegenprobe] eine haargenau an der Schwelle liegende Abweichung bleibt grün, eine Zahl darüber wird rot', () => {
  // Fixture-Stand v660. Schwelle 5 -> Abstand genau 5 (v665) ist NICHT ">"" 5, bleibt grün.
  const grenzeGruen = pruefeFrische(FIXTURE_ZIEL, 'v665', SCHWELLE_DEFAULT);
  assert.deepEqual(grenzeGruen.funde, [], 'Abstand genau an der Schwelle darf noch nicht anschlagen');
  const grenzeRot = pruefeFrische(FIXTURE_ZIEL, 'v666', SCHWELLE_DEFAULT);
  assert.equal(grenzeRot.funde.length, 3, 'ein Abstand EINE Zahl über der Schwelle muss anschlagen');
});

test('[Frischewarnung·Rot-Beweis] ein Ort, dessen erwartete Datei fehlt, wird als eigener Fund gemeldet, nicht als „veraltet"', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frischewarnung-fehlt-'));
  try {
    fs.mkdirSync(path.join(tmp, 'module-apps', 'englisch'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'module-apps', 'betriebssatz'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'vivodepot.html'), "const SCHALEN_STAND = 'v660';");
    fs.writeFileSync(path.join(tmp, 'module-apps', 'englisch', 'vivodepot.html'), "const SCHALEN_STAND = 'v660';");
    // betriebssatz/vivodepot.html bleibt ABSICHTLICH weg.
    const { funde } = pruefeFrische(tmp, 'v662', SCHWELLE_DEFAULT);
    assert.equal(funde.length, 1);
    assert.equal(funde[0].art, 'fehlt');
    assert.equal(funde[0].slug, 'betriebssatz-de');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[Frischewarnung·Rot-Beweis] ein Ort ohne lesbaren SCHALEN_STAND wird als „unlesbar" gemeldet, nicht stillschweigend übersprungen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frischewarnung-unlesbar-'));
  try {
    fs.mkdirSync(path.join(tmp, 'module-apps', 'englisch'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'module-apps', 'betriebssatz'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'vivodepot.html'), 'kein SCHALEN_STAND hier');
    fs.writeFileSync(path.join(tmp, 'module-apps', 'englisch', 'vivodepot.html'), "const SCHALEN_STAND = 'v660';");
    fs.writeFileSync(path.join(tmp, 'module-apps', 'betriebssatz', 'vivodepot.html'), "const SCHALEN_STAND = 'v660';");
    const { funde } = pruefeFrische(tmp, 'v662', SCHWELLE_DEFAULT);
    assert.equal(funde.length, 1);
    assert.equal(funde[0].art, 'unlesbar');
    assert.equal(funde[0].slug, 'buerger-de');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
