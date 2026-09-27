'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Tests — Datei-Magic-Bytes (U2-ADR-043, Option A: binärer Präfix "VIVODEPOT" + Versions-Byte)
   ────────────────────────────────────────────────────────────────────────
   Vier Tests über BEIDE Apps (Bürger + Lese). U2-ADR-078: der passwortlose Notfall-Cache-Pfad ist
   ENTFERNT; Test 3 pinnt, dass eine Magic-Datei kein Klartext-Cache-Geschwister trägt. Reine
   Datei-Hülle — der Integritäts-/Vertraulichkeits-
   schutz bleibt AES-GCM; Magic Bytes ersetzen ihn nicht. Beim Lesen tolerant: Alt-Dateien ohne
   Kennung (bare JSON) laden verlustfrei. Der Präfix wird aus der QUELLE abgeleitet (dateiMitMagic /
   DATEI_MAGIC_PREFIX), nicht im Test hartkodiert — so kann das Versions-Byte nicht divergieren.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

test('[Klausel] Bindung an U2-ADR-043 über das Fundament', () => {
  bindungPruefen('U2-ADR-043', 'entscheidung', [
    '1) Magic-Round-Trip (Bürger-App): Datei mit Magic schreiben, mit Strip lesen, entschlüsseln',
    '2) Legacy: Alt-Datei ohne Magic (bare JSON) lädt weiter (Bürger-App)',
  ], __filename);
});

async function frischesDepotMitNotfall() {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');        // Art-9-Feld (früher im Klartext-Cache)
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]); // Art-9-Feld (früher im Klartext-Cache)
  const umschlag = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
  return { V, umschlag };
}

/* 1 — Round-Trip mit Magic (Bürger-App): schreiben mit Magic → strippen → entschlüsseln → Inhalt gleich. */
test('1) Magic-Round-Trip (Bürger-App): Datei mit Magic schreiben, mit Strip lesen, entschlüsseln', async () => {
  const { V, umschlag } = await frischesDepotMitNotfall();
  const dateiText = V.dateiMitMagic(JSON.stringify(umschlag));
  assert.ok(dateiText.startsWith('VIVODEPOT'), 'Datei trägt die Magic-Kennung am Anfang');
  assert.equal(dateiText, V.DATEI_MAGIC_PREFIX + JSON.stringify(umschlag), 'Präfix + JSON');

  const strip = V.magicStrippen(dateiText);
  assert.equal(strip.magic, true, 'Magic erkannt');
  assert.equal(strip.version, 1, 'Format-Version 1');

  const data2 = await V.depotLaden(JSON.parse(strip.json), 'pw');
  assert.equal(data2.sektoren.identity.givenName, 'Maria', 'Inhalt aus der Magic-Datei entschlüsselt');
});

/* 2 — Alt-Datei (bare JSON, ohne Magic) lädt verlustfrei (Bürger-App) — Migrations-Toleranz. */
test('2) Legacy: Alt-Datei ohne Magic (bare JSON) lädt weiter (Bürger-App)', async () => {
  const { V, umschlag } = await frischesDepotMitNotfall();
  const bareText = JSON.stringify(umschlag);            // KEIN Magic-Präfix (Alt-Format)
  const strip = V.magicStrippen(bareText);
  assert.equal(strip.magic, false, 'kein Magic → als Alt-Datei behandelt');
  assert.equal(strip.json, bareText, 'bare JSON unverändert durchgereicht');

  const data2 = await V.depotLaden(JSON.parse(strip.json), 'pw');
  assert.equal(data2.sektoren.identity.givenName, 'Maria', 'Alt-Datei verlustfrei geladen');
});

/* 3 — U2-ADR-078: KEIN passwortloser Notfall-Cache-Pfad mehr — in BEIDEN Apps. Eine Magic-Datei
   trägt kein notfallCache-Klartext-Geschwister; die passwortlose Lese-Funktion ist entfernt. */
test('3) U2-ADR-078: Magic-Datei trägt keinen passwortlosen Notfall-Cache (Bürger + Lese-App)', async () => {
  const { V, umschlag } = await frischesDepotMitNotfall();
  const dateiText = V.dateiMitMagic(JSON.stringify(umschlag));

  const uB = JSON.parse(V.magicStrippen(dateiText).json);
  assert.equal('notfallCache' in uB, false, 'Bürger-App: kein notfallCache-Sibling in der Magic-Datei');
  assert.equal(typeof V.notfallCacheAusUmschlag, 'undefined', 'Bürger-App: passwortlose Lese-Funktion entfernt');
  // Kein Art-9-Wert liegt im Klartext-Rahmen (nur im Ciphertext):
  const rahmenB = JSON.stringify({ ...uB, ct: '' });
  assert.ok(!rahmenB.includes('Penicillin') && !rahmenB.includes('A +'), 'kein Gesundheitsdatum im Klartext');

  const { V: L } = ladeLesen();   // Lese-App: eigenes magicStrippen
  const uL = JSON.parse(L.magicStrippen(dateiText).json);
  assert.equal('notfallCache' in uL, false, 'Lese-App: kein notfallCache-Sibling in der Magic-Datei');
  assert.equal(typeof L.notfallCacheAusUmschlag, 'undefined', 'Lese-App: passwortlose Lese-Funktion entfernt');
});

/* 4 — Strip-Semantik: deterministisch, tolerant, in BEIDEN Apps identisch (Magic/Legacy/leer). */
test('4) Magic-Strip-Semantik identisch in beiden Apps (Magic/Legacy/leer)', () => {
  const { V } = ladeKern();
  const { V: L } = ladeLesen();
  const magicText = V.dateiMitMagic('{"a":1}');   // echte Kennung + Versions-Byte aus der Quelle
  for (const M of [V, L]) {
    const m = M.magicStrippen(magicText);          // Magic-Datei
    assert.equal(m.magic, true);  assert.equal(m.version, 1);  assert.equal(m.json, '{"a":1}');
    const b = M.magicStrippen('{"a":1}');          // Alt-Datei (bare JSON)
    assert.equal(b.magic, false); assert.equal(b.json, '{"a":1}');
    assert.equal(M.magicStrippen('').magic, false);   // leer → kein Crash, kein Magic
    assert.equal(M.magicStrippen(null).magic, false); // null → kein Crash
  }
  // dateiMitMagic ist die exakte Umkehrung von magicStrippen (Bürger-App schreibt).
  assert.equal(V.magicStrippen(V.dateiMitMagic('{"x":2}')).json, '{"x":2}');
});
