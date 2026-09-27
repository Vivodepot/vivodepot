'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   auslieferungsweg-klassifikation-pruefen.test.js — „Rangfolge
   bauen", Posten 2 (11.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Positivkontrolle UND Rot-Beweis in beide Richtungen: ein neuer, nicht
   registrierter Ort UND ein verwaister Register-Eintrag müssen beide
   anschlagen — sonst bewacht der Wächter nur eine Hälfte des Auseinanderlaufens.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  entdeckteOrte, pruefeKlassifikation, FIXTURE_ZIEL,
} = require('../tools/auslieferungsweg-klassifikation-pruefen.js');
const { AUSLIEFERUNGSORTE } = require('../tools/lib/auslieferungsorte-register.js');

test('[Klassifikation] entdeckteOrte findet Wurzel + beide Fixture-Modul-Apps', () => {
  const orte = entdeckteOrte(FIXTURE_ZIEL);
  assert.deepEqual(orte.sort(), ['', 'module-apps/betriebssatz', 'module-apps/englisch'].sort());
});

test('[Klassifikation·Positivkontrolle] die Fixture selbst ist vollständig klassifiziert — kein Fund', () => {
  const { funde } = pruefeKlassifikation(FIXTURE_ZIEL);
  assert.deepEqual(funde, []);
});

test('[Klassifikation] das Register selbst deckt genau vier Slugs, davon einer NICHT_VORHANDEN', () => {
  assert.equal(AUSLIEFERUNGSORTE.length, 4);
  const vorhanden = AUSLIEFERUNGSORTE.filter((o) => o.weg !== 'NICHT_VORHANDEN');
  assert.equal(vorhanden.length, 3, 'buerger-de, buerger-en, betriebssatz-de sind heute real');
  const nicht = AUSLIEFERUNGSORTE.find((o) => o.weg === 'NICHT_VORHANDEN');
  assert.equal(nicht.slug, 'betriebssatz-en');
});

test('[Klassifikation·Rot-Beweis] ein neuer Ordner ohne Register-Eintrag wird als „unklassifiziert" gemeldet', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassifikation-neu-'));
  try {
    fs.cpSync(FIXTURE_ZIEL, tmp, { recursive: true });
    fs.mkdirSync(path.join(tmp, 'module-apps', 'ueberraschung'));
    fs.writeFileSync(path.join(tmp, 'module-apps', 'ueberraschung', 'vivodepot.html'), "const SCHALEN_STAND = 'v660';");
    const { funde } = pruefeKlassifikation(tmp);
    assert.equal(funde.length, 1);
    assert.equal(funde[0].art, 'unklassifiziert');
    assert.equal(funde[0].pfad, 'module-apps/ueberraschung');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[Klassifikation·Gegenprobe] ein Ordner OHNE eigene vivodepot.html zählt nicht als Ort (kein Fund)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassifikation-leer-'));
  try {
    fs.cpSync(FIXTURE_ZIEL, tmp, { recursive: true });
    fs.mkdirSync(path.join(tmp, 'module-apps', 'nur-ein-ordner-ohne-datei'));
    const { funde } = pruefeKlassifikation(tmp);
    assert.deepEqual(funde, [], 'ein leerer Ordner ist kein Auslieferungsort und darf nicht anschlagen');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[Klassifikation·Rot-Beweis] ein registrierter Ort, dessen Ordner verschwunden ist, wird als „verwaist" gemeldet', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klassifikation-verwaist-'));
  try {
    fs.cpSync(FIXTURE_ZIEL, tmp, { recursive: true });
    fs.rmSync(path.join(tmp, 'module-apps', 'betriebssatz'), { recursive: true, force: true });
    const { funde } = pruefeKlassifikation(tmp);
    assert.equal(funde.length, 1);
    assert.equal(funde[0].art, 'verwaist');
    assert.equal(funde[0].slug, 'betriebssatz-de');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[Klassifikation] betriebssatz-en (NICHT_VORHANDEN) erzeugt keinen „verwaist"-Fund, obwohl kein Ordner existiert', () => {
  // Die Fixture kennt ohnehin keinen module-apps/betriebssatz-en/-Ordner — die Positivkontrolle
  // oben ist bereits der Beleg, dass das NICHT als Fund zählt (sonst wäre sie nicht leer).
  const { funde } = pruefeKlassifikation(FIXTURE_ZIEL);
  assert.ok(!funde.some((f) => f.slug === 'betriebssatz-en'));
});
