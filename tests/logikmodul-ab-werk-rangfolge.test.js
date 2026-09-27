'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   logikModul-Ab-Werk-Rangfolge (Auftrag, 08.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Dieselbe Drei-Stufen-Rangfolge wie bei textsatz (Ab-Werk-Saat < signiertes
   Vor-Depot-Bündel < Bürgerin), ANDERS umgesetzt: logikModul hat keine
   Ausschließlichkeit (mehrere Module bestehen nebeneinander) und
   `data.logikModule` existiert erst MIT einem Depot. `_abWerkLogikModule`
   ist darum ein eigener, von `data` GETRENNTER Script-Global (wie
   `_vorDepotTextsatzModule`) — der scharfe Rundlauf-Beweis unten hält fest,
   dass er NIE in `data.logikModule` landet, sonst schlägt er beim Sichern
   in die Datei der Bürgerin durch.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ERBSCHEIN_FIXTURE = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8'));

// Eine zweite, UNTERSCHEIDBARE Fassung derselben `id` — für den Kollisionsbeweis. Andere
// `moduleVersion`, sonst prüfte die Probe nichts (Auflage: "nimm eine unterscheidbare
// Fassung, sonst prüft die Probe nichts").
const ERBSCHEIN_ANDERE_FASSUNG = Object.assign({}, ERBSCHEIN_FIXTURE, { moduleVersion: 99 });

// Eine eigene, SYNTHETISCHE id für die Rundlauf-Proben unten — `depotAnlegen()` lässt über
// `_abWerkAuszuegeEinlassen(data)` bereits ECHTE Ab-Werk-Auszüge (Erbschein-Vorbereitung,
// Zugang-zum-Recht) ins frische Depot, unabhängig von dieser Rangfolge (U2-ADR-288). Eine
// Kollision mit deren id würde die Zählung verfälschen — nicht falsch (der Kollisionsschutz
// dedupliziert korrekt), aber irreführend für eine Probe, die die SEED-Wirkung isoliert zeigen
// soll. Eine unbenutzte id umgeht das, statt die Zahl an die bestehende Menge anzupassen.
const SYNTHETISCHES_MODUL = Object.assign({}, ERBSCHEIN_FIXTURE, { id: 'test-ab-werk-synthetisches-modul' });

test('[LogikModul-Ab-Werk] _logikModuleAlle(d) liefert nichts, wenn weder Depot noch Ab-Werk-Liste etwas tragen', async () => {
  const { V } = await ladeKern();
  assert.deepEqual(V._logikModuleAlle({}), []);
  assert.deepEqual(V._logikModuleAlle(null), []);
});

test('[LogikModul-Ab-Werk] eine Ab-Werk-Kennung wird sichtbar, ohne dass die Bürgerin sie eingelassen hat', async () => {
  const { V } = await ladeKern();
  const vorher = V._abWerkLogikModule;
  try {
    V._abWerkLogikModule = [ERBSCHEIN_FIXTURE];
    const alle = V._logikModuleAlle({});
    assert.equal(alle.length, 1);
    assert.equal(alle[0].id, 'erbschein-vorbereitung');
  } finally { V._abWerkLogikModule = vorher; }
});

test('[LogikModul-Ab-Werk·Kollision] hat die Bürgerin dasselbe Modul selbst eingelassen, gewinnt IHRE Fassung — nicht die Ab-Werk-Fassung', async () => {
  const { V } = await ladeKern();
  const vorher = V._abWerkLogikModule;
  try {
    V._abWerkLogikModule = [ERBSCHEIN_ANDERE_FASSUNG]; // moduleVersion 99
    const alle = V._logikModuleAlle({ logikModule: [ERBSCHEIN_FIXTURE] }); // moduleVersion 1, ihre eigene
    assert.equal(alle.length, 1, 'keine Dopplung derselben id');
    assert.equal(alle[0].moduleVersion, 1, 'die Fassung der Bürgerin gewinnt, nicht die Ab-Werk-Fassung (99)');
  } finally { V._abWerkLogikModule = vorher; }
});

test('[LogikModul-Ab-Werk·Rundlauf, DER SCHARFE BEWEIS] die Ab-Werk-Saat landet NIE in data.logikModule — sonst würde sie beim Sichern mitgeschrieben', async () => {
  const { V } = await ladeKern();
  const vorher = V._abWerkLogikModule;
  try {
    await V.depotAnlegen('logikmodul-ab-werk-rundlauf-pw!');
    // ERST NACH depotAnlegen setzen: _alleModulRegisterAusDepotAnmelden (Teil von depotAnlegen)
    // sät _abWerkLogikModule bei JEDEM Depot-Übergang aus AB_WERK_LOGIK_MODUL_QUELLEN neu —
    // ein VORHER gesetzter Test-Wert würde durch genau diesen Übergang wieder überschrieben.
    V._abWerkLogikModule = [SYNTHETISCHES_MODUL];
    // die Ab-Werk-Saat ist über _logikModuleAlle SICHTBAR ...
    const alle = V._logikModuleAlle(V.getData());
    assert.ok(alle.some((m) => m && m.id === SYNTHETISCHES_MODUL.id), 'Vorbedingung: die Saat wirkt');
    // ... aber `data.logikModule` selbst, das WIRKLICH gesichert wird (depotSerialisierenV4 ->
    // _zerfallSchreiben liest `data` vollständig, kein Journal), enthält sie NICHT. Das ist der
    // eigentliche Beweis — nicht ob die Saat wirkt, sondern dass sie NIE in die Datei will.
    // (depotAnlegen lässt über _abWerkAuszuegeEinlassen bereits ANDERE, ECHTE Ab-Werk-Auszüge
    // ins Depot, U2-ADR-288 — unabhängig davon, darum wird hier auf die KONKRETE id geprüft,
    // nicht auf eine leere Liste.)
    const roh = V.getData().logikModule;
    const drin = Array.isArray(roh) && roh.some((m) => m && m.id === SYNTHETISCHES_MODUL.id);
    assert.equal(drin, false,
      'data.logikModule enthält die Ab-Werk-Kennung — sie würde beim Sichern in die Datei der Bürgerin geschrieben');
  } finally { V._abWerkLogikModule = vorher; }
});

test('[LogikModul-Ab-Werk·Rundlauf] Export/Reimport (vollExportJSON/_vollDepotParsen) trägt die Ab-Werk-Kennung NICHT mit', async () => {
  const { V } = await ladeKern();
  const vorher = V._abWerkLogikModule;
  try {
    await V.depotAnlegen('logikmodul-ab-werk-export-pw!');
    V._abWerkLogikModule = [SYNTHETISCHES_MODUL]; // nach depotAnlegen setzen, s. Test oben
    assert.ok(V._logikModuleAlle(V.getData()).some((m) => m && m.id === SYNTHETISCHES_MODUL.id),
      'Vorbedingung: die Saat wirkt');
    const exportiert = V.vollExportJSON();
    const wiederGeladen = V._vollDepotParsen(JSON.stringify(exportiert));
    assert.ok(wiederGeladen, 'Vorbedingung: der Export lässt sich zurücklesen');
    const geladeneModule = (wiederGeladen.sektoren ? wiederGeladen : wiederGeladen.depot).logikModule;
    const drin = Array.isArray(geladeneModule) && geladeneModule.some((m) => m && m.id === SYNTHETISCHES_MODUL.id);
    assert.equal(drin, false,
      'der Export trägt die Ab-Werk-Kennung mit — sie ist damit Teil der Datei geworden, nicht nur der Laufzeit');
  } finally { V._abWerkLogikModule = vorher; }
});

/* ── Der Wächter gegen die achte Kopie ── */
const { pruefeInlineLesestellen } = require('./helfer/logikmodul-inline-lesestellen.js');

test('[LogikModul-Ab-Werk] data.logikModule steht im Kern nur noch an den zwei erlaubten Stellen (Helfer + Einlassweg)', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const r = pruefeInlineLesestellen(quelle);
  assert.deepEqual(r.unerlaubt, [], 'unerlaubte Inline-Lesestelle(n) auf data.logikModule/d.logikModule gefunden — über _logikModuleAlle(d) lesen, keine achte Kopie');
});

test('[LogikModul-Ab-Werk·Rot-Beweis] eine künstlich eingefügte achte Inline-Lesestelle wird gefunden', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const verunreinigt = quelle + '\nfunction achteKopie() { return (data && Array.isArray(data.logikModule) ? data.logikModule : []); }\n';
  const r = pruefeInlineLesestellen(verunreinigt);
  assert.ok(r.unerlaubt.length >= 1, 'die künstlich eingefügte achte Stelle wurde nicht gefunden — der Wächter ist blind');
});
