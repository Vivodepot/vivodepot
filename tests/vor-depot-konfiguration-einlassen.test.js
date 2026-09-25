'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-182 Task 2: modulEinlassen akzeptiert den Vor-Depot-Speicher als ziel
   ────────────────────────────────────────────────────────────────────────
   modulEinlassen(rohText, ziel, ...) nahm den ziel-Parameter von Anfang an
   generisch entgegen (`const d = (ziel && typeof ziel === 'object') ? ziel :
   ...`) — der Vor-Depot-Speicher (Task 1, Schlüssel = reg.slot) passt
   strukturell 1:1 auf dieselbe d[reg.slot]-Schreiblogik wie das offene Depot.
   Dieser Test belegt das, statt es anzunehmen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function kern() { return ladeKern().V; }

/* institutionsArt statt branding: branding traegt `nurGeprueft: true` (nur der signierte Weg
   ist erlaubt, s. EINLASS_REGISTER) — ein unsigniertes Branding-Modul wird IMMER mit
   'nur-signiert-erlaubt' verworfen, unabhaengig vom ziel. Das waere ein Fund ueber die
   Signier-Pflicht, keiner ueber den generischen ziel-Mechanismus, den dieser Test belegen soll. */
test('[VDK-Einlassen] ein gültiges institutionsArt-Modul landet im übergebenen Vor-Depot-Ziel, nicht in data', () => {
  const V = kern();
  const ziel = V.vorDepotKonfigurationLeer();
  const modul = { modulTyp: 'institutionsArt', moduleVersion: 1, herkunft: 'probe', sprache: 'de', arten: { 'zz-probe': 'Probe' } };
  const g = V.modulEinlassen(JSON.stringify(modul), ziel);
  assert.equal(g.angenommen, true, 'abgewiesen mit Grund „' + g.grund + '"');
  assert.equal(ziel.institutionsArten.length, 1);
  assert.equal(typeof data, 'undefined',
    'modulEinlassen darf bei übergebenem ziel NIEMALS das globale data anfassen');
});

test('[VDK-Einlassen·Gegenprobe] ohne ziel und ohne offenes Depot bleibt der alte Fehler bestehen (kein-depot)', () => {
  const V = kern();
  const modul = { modulTyp: 'institutionsArt', moduleVersion: 1, herkunft: 'probe', sprache: 'de', arten: { 'zz-probe': 'Probe' } };
  const g = V.modulEinlassen(JSON.stringify(modul), null);
  assert.equal(g.angenommen, false);
  assert.equal(g.grund, 'kein-depot', 'Regressionsschutz — der bestehende Depot-Weg darf sich nicht ändern');
});

/* Branding SEPARAT belegt, mit dem dritten Parameter (anbieterIdGeprueft) — der eigentliche
   nurGeprueft-Fall, den der Test oben bewusst umgeht. Zeigt: der Vor-Depot-Weg unterliegt
   DERSELBEN Signier-Pflicht wie der Depot-Weg, keine Sonderregel fuer Vor-Depot. */
test('[VDK-Einlassen] branding (nurGeprueft) landet im Vor-Depot-Ziel NUR mit geprüfter Anbieterkennung', () => {
  const V = kern();
  const ziel = V.vorDepotKonfigurationLeer();
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', sprache: 'de', farbePrimaer: '#336699' };
  const abgewiesen = V.modulEinlassen(JSON.stringify(modul), ziel);
  assert.equal(abgewiesen.angenommen, false);
  assert.equal(abgewiesen.grund, 'nur-signiert-erlaubt');
  assert.equal(ziel.brandingModule.length, 0);

  const angenommen = V.modulEinlassen(JSON.stringify(modul), ziel, 'probe-anbieter-geprueft');
  assert.equal(angenommen.angenommen, true, 'abgewiesen mit Grund „' + angenommen.grund + '"');
  assert.equal(ziel.brandingModule.length, 1);
});
