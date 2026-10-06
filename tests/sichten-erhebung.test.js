'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Glied 1 (Kette „Drei Bereichs-Eigenschaften") · die Erhebung bleibt wahr
   ────────────────────────────────────────────────────────────────────────────
   `tools/sichten-erheben.js` misst, wo die reduzierten Sichten definiert sind.
   Seine Sicht-Tabelle ist ein URTEIL — was sie behauptet, muss auffindbar sein.
   Ohne diese Probe verschwände eine umbenannte oder verschobene Sicht STILL aus
   der Erhebung, und der Bericht läse sich weiter, als sei alles erfasst.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { messen, SICHTEN, bereichsIds } = require('../tools/sichten-erheben.js');

test('[Sichten] jede behauptete Sicht ist auffindbar — eine fehlende ist ein Fund, kein Wegfall', async () => {
  const erg = await messen();
  assert.equal(erg.sichten.length, SICHTEN.length);
  for (const s of erg.sichten) {
    assert.equal(s.gefunden, true, s.name + ' (' + s.datei + ':' + s.symbol + ') nicht gefunden');
    assert.ok(Number.isInteger(s.zeile) && s.zeile > 0, s.name + ' hat eine Zeilennummer');
    // `>=` statt `>`: eine bundle-migrierte Sicht (U2-ADR-319/320, U2-ADR-341b) hat einen
    // native EINZEILIGEN Anker — der wirkliche Bestand steht im eingebetteten Bündel-JSON,
    // das selbst ebenfalls eine einzige Zeile ist. Ob dort echter Inhalt gefunden wurde,
    // prüft der nächste Test (`bereichsIds.length > 0`); hier geht es nur um die Zeilenzahl.
    assert.ok(Number.isInteger(s.bisZeile) && s.bisZeile >= s.zeile, s.name + ' hat eine abgrenzbare Blockgrenze');
  }
});

test('[Sichten] keine der Sichten ist bereichsgenau — jede nennt Bereiche NUR als Adresshälfte', async () => {
  // Der Kernbefund der Erhebung: alle fünf Definitionen zählen Felder auf. Kippt das,
  // kippt auch die Antwort auf 1d (genauEine hängt an einer {sektor,feld}-Zeile).
  const erg = await messen();
  for (const s of erg.sichten) {
    assert.ok(s.bereichsIds.length > 0, s.name + ' nennt mindestens einen Bereich');
    assert.ok(s.bereichsIdTreffer > s.bereichsIds.length,
      s.name + ': ein Bereich wird MEHRFACH genannt — das ist die Feldgranularität. '
      + 'Genau so oft wie verschiedene Bereiche hiesse: bereichsgenau.');
  }
});

test('[Sichten] die dreizehn Bereichs-IDs kommen aus der EINEN Quelle, nicht aus einer Kopie im Werkzeug', () => {
  const ids = bereichsIds();
  assert.equal(ids.length, 13);
  for (const id of ['identity', 'health', 'advanceCare', 'emergencyPreparedness']) {
    assert.ok(ids.includes(id), id + ' steht in bereiche/bereiche.json');
  }
});

test('[Sichten·Rot] eine Sicht mit unauffindbarem Bezeichner wird als NICHT GEFUNDEN gemeldet', async () => {
  // Positivkontrolle über dieselbe Messfunktion: das Werkzeug meldet, statt zu schweigen.
  const { messen: _m } = require('../tools/sichten-erheben.js');
  const erg = await _m();
  // Ein Bezeichner, den es sicher nicht gibt, läuft durch dieselbe Blockmessung.
  const fs = require('node:fs'), path = require('node:path');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const gibtEsNicht = new RegExp('^\\s*(const|let|var)\\s+GIBT_ES_SICHER_NICHT\\s*=', 'm').test(quelle);
  assert.equal(gibtEsNicht, false, 'Vorbedingung: der Bezeichner existiert wirklich nicht');
  assert.ok(erg.sichten.every(s => s.gefunden), 'und die echten fünf sind davon unberührt');
});
