'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   depot-umschlag-diagnose — „Sub-Depot-Klick-Freeze", 31.08.2026
   ────────────────────────────────────────────────────────────────────────────
   Prüft die Umschlag-Diagnose an den beiden Fixtures (v3 einzelner Block,
   v4 Zerfall) UND belegt die härteste Anforderung: der formatierte Bericht
   darf NIE einen Salt-/Chiffrat-Wert selbst enthalten, nur Byte-Längen und
   Zählungen. Ein Werkzeug, das das verspricht und nicht hält, ist falsch
   gebaut — dieser Test ist der Beweis, nicht nur die Behauptung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { diagnostiziereUmschlag, formatiereBericht } = require('../tools/depot-umschlag-diagnose.js');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'depot-diagnose');
const V3_PFAD = path.join(FIXTURE_DIR, 'beispiel-anker-v3.vivodepot');
const V4_PFAD = path.join(FIXTURE_DIR, 'beispiel-anker-v4.vivodepot');

test('[Depot-Umschlag-Diagnose] v3-Fixture: erkannt, alle Pflichtfelder da, heutiger Kern würde lesen', () => {
  const text = fs.readFileSync(V3_PFAD, 'utf8');
  const diag = diagnostiziereUmschlag(text);
  assert.equal(diag.dateiValide, true);
  assert.equal(diag.kryptoVersion, 3);
  assert.equal(diag.kryptoVersionInAllowlist, true);
  assert.equal(diag.format, 'v3 (ein Chiffrat-Block)');
  assert.deepEqual(diag.fehlendePflichtfelder, []);
  assert.equal(diag.heutigerKernWuerdeLesen, true);
  assert.equal(diag.pbkdf2SaltByteLaenge, 16);
  assert.equal(diag.depotSaltByteLaenge, 32);
});

test('[Depot-Umschlag-Diagnose] v4-Fixture: Zerfall erkannt, ein Fach, Feld-Einheiten gezählt', () => {
  const text = fs.readFileSync(V4_PFAD, 'utf8');
  const diag = diagnostiziereUmschlag(text);
  assert.equal(diag.dateiValide, true);
  assert.equal(diag.kryptoVersion, 4);
  assert.equal(diag.format, 'v4 (Zerfall — Feld-Einheiten)');
  assert.deepEqual(diag.fehlendePflichtfelder, []);
  assert.equal(diag.heutigerKernWuerdeLesen, true);
  assert.equal(diag.faecherZahl, 1);
  assert.ok(diag.einheitenZahl > 0, 'ein gefülltes Testdepot hat mindestens eine Feld-Einheit');
  assert.equal(diag.faecher[0].kennungVorhanden, true);
  assert.ok(diag.faecher[0].umschlaegeZahl > 0);
});

test('[Depot-Umschlag-Diagnose·Rot-Beweis] kaputtes JSON wird als solches gemeldet, nicht als leere Struktur', () => {
  const diag = diagnostiziereUmschlag('{ das ist kein JSON');
  assert.equal(diag.dateiValide, false);
  assert.match(diag.fehler, /JSON/);
});

test('[Depot-Umschlag-Diagnose·Rot-Beweis] unbekannte kryptoVersion wird als Ablehnungsgrund gemeldet', () => {
  const diag = diagnostiziereUmschlag({ kryptoVersion: 2, depotUUID: 'x', depotSalt: 'AAAA', pbkdf2: { salt: 'AAAA' } });
  assert.equal(diag.kryptoVersionInAllowlist, false);
  assert.equal(diag.heutigerKernWuerdeLesen, false);
  assert.ok(diag.fehlendePflichtfelder.some((f) => f.includes('kryptoVersion')));
});

test('[Depot-Umschlag-Diagnose·Rot-Beweis] v4 ohne umschlagTabelle wird als fehlend gemeldet (genau der Fall, den _zerfallLesen hart ablehnt)', () => {
  const diag = diagnostiziereUmschlag({
    kryptoVersion: 4, depotUUID: 'x', depotSalt: 'AAAA', pbkdf2: { salt: 'AAAA' }, einheiten: {},
  });
  assert.equal(diag.heutigerKernWuerdeLesen, false);
  assert.ok(diag.fehlendePflichtfelder.some((f) => f.includes('umschlagTabelle')));
});

test('[Depot-Umschlag-Diagnose·Rot-Beweis] v4 mit leerer umschlagTabelle wird als fehlend gemeldet', () => {
  const diag = diagnostiziereUmschlag({
    kryptoVersion: 4, depotUUID: 'x', depotSalt: 'AAAA', pbkdf2: { salt: 'AAAA' }, einheiten: {}, umschlagTabelle: [],
  });
  assert.equal(diag.heutigerKernWuerdeLesen, false);
  assert.ok(diag.fehlendePflichtfelder.some((f) => f.includes('umschlagTabelle')));
});

// ── Die härteste Zusicherung: nie ein Geheimnis im Bericht ─────────────────────
test('[Depot-Umschlag-Diagnose·Sicherheit] der formatierte Bericht enthält NIE den Salt-/Chiffrat-Wert selbst, nur Längen/Zählungen', () => {
  for (const pfad of [V3_PFAD, V4_PFAD]) {
    const text = fs.readFileSync(pfad, 'utf8');
    const roh = JSON.parse(text);
    const diag = diagnostiziereUmschlag(text);
    const bericht = formatiereBericht(diag, pfad);

    // Die tatsaechlichen Geheim-/Salt-Strings duerfen an KEINER Stelle im Bericht auftauchen.
    assert.ok(!bericht.includes(roh.depotSalt), 'depotSalt-Wert darf nicht im Bericht stehen');
    assert.ok(!bericht.includes(roh.pbkdf2.salt), 'pbkdf2.salt-Wert darf nicht im Bericht stehen');
    if (roh.kryptoVersion === 3) {
      assert.ok(!bericht.includes(roh.iv), 'iv darf nicht im Bericht stehen');
      assert.ok(!bericht.includes(roh.ct), 'ct (Chiffrat) darf nicht im Bericht stehen');
    }
    if (roh.kryptoVersion === 4) {
      assert.ok(!bericht.includes(JSON.stringify(roh.einheiten)), 'einheiten-Chiffrate duerfen nicht im Bericht stehen');
      for (const eintrag of roh.umschlagTabelle) {
        if (eintrag.geheim) assert.ok(!bericht.includes(JSON.stringify(eintrag.geheim)), 'geheim-Block darf nicht im Bericht stehen');
      }
    }
    // depotUUID ist bewusst UNKRITISCH (kein Geheimnis, s. Kommentar im Werkzeug) und darf stehen —
    // hier NICHT gegen den Bericht geprueft, das waere ein falsches Verbot.
  }
});

test('[Depot-Umschlag-Diagnose·Sicherheit] der Bericht nennt ausdrücklich, was NICHT geprüft wurde (schemaVersion, Sub-Depots)', () => {
  const diag = diagnostiziereUmschlag(fs.readFileSync(V4_PFAD, 'utf8'));
  const bericht = formatiereBericht(diag, V4_PFAD);
  assert.match(bericht, /schemaVersion/);
  assert.match(bericht, /verwalteteDepots/);
});

/* VD-CR-B11 (code-review-dod-stand-2026-09-16.md, MITTEL, gemessen 18.09.2026 noch offen):
   beide Fixtures oben sind nacktes JSON ohne Magic-Kopf — genau die Lücke, die B11 fand
   (der Kern schreibt den Magic-Kopf seit c56c18bb, 02.07.2026, jede echte Datei trägt ihn).
   Hier mit einem ECHT magic-präfixierten Umschlag reproduziert und geschlossen. */
test('[VD-CR-B11·Rot-Beweis] eine echte, magic-präfixierte Datei ("VIVODEPOT"+Version-Byte) ist lesbar', () => {
  const roh = fs.readFileSync(V3_PFAD, 'utf8');
  const mitMagic = 'VIVODEPOT' + String.fromCharCode(1) + roh;
  const diag = diagnostiziereUmschlag(mitMagic);
  assert.equal(diag.dateiValide, true,
    'eine echte Datei (mit Magic-Kopf) muss lesbar sein — das Werkzeug wäre sonst für jede seit Juli erzeugte Datei blind');
  assert.equal(diag.kryptoVersion, 3);
});

test('[VD-CR-B11·Gegenprobe] eine Alt-Datei ohne Magic-Kopf bleibt weiterhin lesbar (Rückwärtskompatibilität)', () => {
  const roh = fs.readFileSync(V3_PFAD, 'utf8');
  const diag = diagnostiziereUmschlag(roh);
  assert.equal(diag.dateiValide, true, 'nacktes JSON ohne Magic-Kopf darf durch die Reparatur nicht brechen');
});
