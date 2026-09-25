'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 4: persist() + Eviction-Härtung
   ────────────────────────────────────────────────────────────────────────
   (a) navigator.storage.persist() wird nach dem ersten Save angefragt (einmal).
   (b) Ablehnung/Fehlen von persist() blockiert das Speichern NICHT.
   (c) Export-Erinnerungs-Modell: fällig, wenn nie/zu lange keine Sicherungskopie.
   (d) Sanfter Hinweis erscheint höchstens einmal pro Sitzung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'evict-passwort-321';
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };

function hostedMitNav(nav) {
  const m = createIdbMock();
  return { ...ladeKern({ indexedDB: m, location: HOSTED, navigator: nav }), mock: m };
}

test('[D43-E4] persist() wird nach dem ersten Save angefragt (genau einmal)', async () => {
  let calls = 0;
  const k = hostedMitNav({ storage: { persist: async () => { calls++; return true; } } });
  await k.V.depotAnlegen(PW);
  await k.V.depotInIdbSichern();
  assert.equal(calls, 1, 'persist() einmal angefragt');
  assert.equal(k.V._persistStatus(), true, 'als angefragt vermerkt');
  await k.V.depotInIdbSichern();
  assert.equal(calls, 1, 'kein zweites Mal (idempotent)');
});

test('[D43-E4] persist()-Ablehnung blockiert das Speichern nicht', async () => {
  const k = hostedMitNav({ storage: { persist: async () => { throw new Error('verweigert'); } } });
  await k.V.depotAnlegen(PW);
  const ts = await k.V.depotInIdbSichern();
  assert.ok(ts, 'Save gelingt trotz persist()-Fehler');
  assert.equal((await k.V.VdStore.liste()).length, 1, 'Record geschrieben');
});

test('[D43-E4] persist() fehlt (kein storage) → kein Fehler', async () => {
  const k = hostedMitNav({});   // navigator ohne storage
  await k.V.depotAnlegen(PW);
  const ts = await k.V.depotInIdbSichern();
  assert.ok(ts, 'Save gelingt ohne persist-Verfügbarkeit');
  assert.equal(await k.V.persistAnfragen(), false, 'persistAnfragen meldet false, wirft nicht');
});

test('[D43-E4] Export-Erinnerungs-Modell: nie/zu lange keine Sicherungskopie → fällig', async () => {
  const k = hostedMitNav({ storage: { persist: async () => true } });
  // U2-ADR-211: der Sicherungsstand hängt jetzt an data — ohne geladenes Depot gibt es keins,
  // an das _setzeLetzteSicherungskopie() unten etwas hängen könnte.
  await k.V.depotAnlegen(PW);
  // Nie exportiert → fällig (interner Speicher-Modus).
  let m = k.V.exportErinnerungModell();
  assert.equal(m.faellig, true, 'nie exportiert → fällig');
  assert.equal(m.jeExportiert, false);
  // Gerade eben exportiert → nicht fällig.
  k.V._setzeLetzteSicherungskopie(new Date().toISOString());
  m = k.V.exportErinnerungModell();
  assert.equal(m.faellig, false, 'frische Sicherungskopie → nicht fällig');
  // Vor 20 Tagen → fällig (Schwelle 14), tageHer ~20.
  const vor20 = new Date(Date.now() - 20 * 86400000).toISOString();
  k.V._setzeLetzteSicherungskopie(vor20);
  m = k.V.exportErinnerungModell();
  assert.equal(m.faellig, true, 'alte Sicherungskopie → fällig');
  assert.ok(m.tageHer >= 19 && m.tageHer <= 21, 'tageHer ~20: ' + m.tageHer);
});

test('[D43-E4] Datei-Modus (kein IDB) → Erinnerung nie fällig', () => {
  const f = ladeKern();   // kein indexedDB → Datei-Modus
  assert.equal(f.V.internerSpeicherModus(), false);
  assert.equal(f.V.exportErinnerungModell().faellig, false, 'Datei-Modus sichert ohnehin als Datei');
});

test('[D43-E4] Sanfter Hinweis erscheint höchstens einmal pro Sitzung', async () => {
  const k = hostedMitNav({ storage: { persist: async () => true } });
  await k.V.depotAnlegen(PW);
  // Erster fälliger Save → Hinweis zeigt (true), zweiter → nicht mehr (false).
  assert.equal(k.V.exportErinnerungVielleichtZeigen(), true, 'erster fälliger Hinweis');
  assert.equal(k.V.exportErinnerungVielleichtZeigen(), false, 'kein zweiter Hinweis in derselben Sitzung');
});
