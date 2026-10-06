'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Modulprüfung schließen, Posten 3 (23.08.2026) — der Sammel-Schritt
   ────────────────────────────────────────────────────────────────────────
   `tools/einreichung-auffaelligkeiten-sammeln.js` erkennt nichts Neues — es
   liest die vorhandenen Meldungen der fünf Einlass-Register und des
   Feld-Vorlagen-Erzeugers und bringt sie in eine gemeinsame Form.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../tools/einreichung-auffaelligkeiten-sammeln.js');

test('[Posten3] fundstelleAus liest den jeweils vorhandenen Ortsbezug — egal, wie er heißt', () => {
  assert.equal(S.fundstelleAus({ schluessel: 'x', grund: 'unbekannt' }), 'x');
  assert.equal(S.fundstelleAus({ kennung: 'y', grund: 'unbekannt' }), 'y');
  assert.equal(S.fundstelleAus({ id: 'z', grund: 'reserviert' }), 'z');
  assert.equal(S.fundstelleAus({ pfad: 'p', grund: 'erkenner-pfad' }), 'p');
  assert.equal(S.fundstelleAus({ feld: 'f', grund: 'feld-unbekannt' }), 'f');
  assert.equal(S.fundstelleAus({ grund: 'erkenner-kein-objekt' }), null, 'ohne jeden Ortsbezug bleibt es null, nicht erraten');
});

test('[Posten3] ausModulEinlassen: ein Fremdschlüssel bei sonst angenommenem Modul ist "gemeldet"', () => {
  const raus = { angenommen: true, grund: null, verworfene: [{ schluessel: 'boeserSchluessel', grund: 'unbekannt' }] };
  const zeilen = S.ausModulEinlassen(raus);
  assert.deepEqual(zeilen, [{ grund: 'unbekannt', fundstelle: 'boeserSchluessel', schwere: 'gemeldet', quelle: 'einlass' }]);
});

test('[Posten3] ausModulEinlassen: ein abgewiesenes Modul ist "abgewiesen", auch ohne verworfene[]', () => {
  const raus = { angenommen: false, grund: 'zu-gross', verworfene: [], kennung: null };
  const zeilen = S.ausModulEinlassen(raus);
  assert.deepEqual(zeilen, [{ grund: 'zu-gross', fundstelle: null, schwere: 'abgewiesen', quelle: 'einlass' }]);
});

test('[Posten3·Gegenprobe] ein sauberes, angenommenes Modul liefert eine leere Liste', () => {
  assert.deepEqual(S.ausModulEinlassen({ angenommen: true, grund: null, verworfene: [] }), []);
});

test('[Posten3·Rot-Beweis] ein wirklich abgewiesenes Modul (reservierte Bereichs-ID) wird "abgewiesen" gemeldet', async () => {
  /* Kein erfundenes Beispiel: dieselbe reservierte Kennung, die tools/boesartiges-modul-messen.js
     als echten Angriffsfall führt. Der Sammel-Schritt erkennt hier nichts Neues — er liest nur,
     was `modulEinlassen` bereits verweigert, und meldet es in der einheitlichen Form. */
  const zeilen = await S.sammeln({
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'rot-beweis', sprache: 'de',
    bereiche: { health: { label: 'UEBERNOMMEN' } },
  });
  // Die zweite Zeile trägt als fundstelle die vom Modul selbst behauptete `herkunft` (`reg.kennung`
  // beim Bereichs-Register) — nicht die verworfene Bereichs-ID, die steht schon in Zeile 1.
  assert.deepEqual(zeilen, [
    { grund: 'reserviert', fundstelle: 'health', schwere: 'gemeldet', quelle: 'einlass' },
    { grund: 'leer', fundstelle: 'rot-beweis', schwere: 'abgewiesen', quelle: 'einlass' },
  ]);
});

test('[Posten3] ausKonformitaet: Blocker werden "abgewiesen", Warnungen "gemeldet"', () => {
  const zeilen = S.ausKonformitaet({ blocker: ['B1'], warnungen: ['W1', 'W2'] });
  assert.deepEqual(zeilen, [
    { grund: 'B1', fundstelle: null, schwere: 'abgewiesen', quelle: 'vorlage' },
    { grund: 'W1', fundstelle: null, schwere: 'gemeldet', quelle: 'vorlage' },
    { grund: 'W2', fundstelle: null, schwere: 'gemeldet', quelle: 'vorlage' },
  ]);
});

test('[Posten3] sammeln() erkennt ein Einlass-Register-Modul an modulTyp — echter Weg über modulEinlassen', async () => {
  const zeilen = await S.sammeln({
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    bereiche: { 'eigene-rubrik': { label: 'Eigene Rubrik' } }, boeserSchluessel: 'x',
  });
  assert.deepEqual(zeilen, [{ grund: 'unbekannt', fundstelle: 'boeserSchluessel', schwere: 'gemeldet', quelle: 'einlass' }]);
});

test('[Posten3] sammeln() erkennt eine Erzeuger-Vorlage an felder[] — echter Weg über pruefeKonformitaet', async () => {
  const zeilen = await S.sammeln({ felder: [] });
  assert.ok(zeilen.some((z) => z.quelle === 'vorlage' && z.schwere === 'abgewiesen'),
    'ohne jedes Feld blockiert der Erzeuger selbst — dieselbe Regel wie im Generator');
});

test('[Posten3] sammeln() ohne modulTyp und ohne felder wirft benannt, statt zu raten', async () => {
  await assert.rejects(() => S.sammeln({ irgendwas: 1 }), /Weder ein Einlass-Register-Modul/);
});

test('[Posten3] die eingebauten Fixturen laufen beide ohne Wurf und liefern die erwarteten Klassen', async () => {
  const [einlass, vorlage] = S.fixturen();
  const zEinlass = await S.sammeln(einlass.roh);
  assert.ok(zEinlass.some((z) => z.quelle === 'einlass'));
  const zVorlage = await S.sammeln(vorlage.roh);
  assert.ok(zVorlage.every((z) => z.quelle === 'vorlage'));
  assert.ok(zVorlage.some((z) => /keine Pflichtfelder/.test(z.grund)));
  assert.ok(zVorlage.some((z) => /mehr als 50 Felder/.test(z.grund)));
  assert.ok(zVorlage.every((z) => z.schwere === 'gemeldet'), 'die Fixture-Vorlage ist vollständig ausgefüllt — nichts blockiert');
});
