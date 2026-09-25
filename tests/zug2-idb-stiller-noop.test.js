'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Auftrag „Erfolg ohne Wirkung" (08.08.2026), Zug 2 — der stille No-Op
   ────────────────────────────────────────────────────────────────────────
   depotInIdbSichern() liefert bei fehlender aktuelleDepotUUID (sessionHkdfKey
   dabei GESETZT) ein stilles `return null` — kein Wurf, keine Meldung.
   depotInternSichern() wertete diesen Rückgabewert vor dem Fix nicht aus und
   rief unconditional markiereGespeichert() + den Erfolgs-Toast: „Gespeichert",
   ohne dass irgendetwas in IndexedDB lag.

   Ursachenfrage aus dem Auftrag („wann ist das ein regulärer Zustand?"):
   Gemessen — beide Assignment-Stellen (depotAnlegen, depotLaden) setzen
   sessionHkdfKey vor aktuelleDepotUUID, mit await-Lücken dazwischen (v. a. bei
   depotLaden, wegen der PBKDF2-Ableitung). Diese Lücke liegt aber vollständig
   VOR betreteApp() — der Content-Host, an dem die Autosave-Listener
   (blur/change) hängen, existiert vor betreteApp() noch nicht. Über die drei
   Aufrufer von depotInternSichern() (Speichern-Knopf, „Sichern und schließen",
   Autosave) ist der Zustand nach heutigem Code-Stand NICHT erreichbar — er ist
   eine defensive Absicherung ohne aktiven Auslöser, kein aktives Leck. Die
   Probe stellt ihn deshalb direkt her (V._setzeAktuelleDepotUUID), nicht über
   einen UI-Weg.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'zug2-passwort-555';
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
function hosted() { return ladeKern({ indexedDB: createIdbMock(), location: HOSTED }); }

test('[Zug 2] depotInIdbSichern() liefert null, wenn aktuelleDepotUUID fehlt (sessionHkdfKey gesetzt)', async () => {
  const { V } = hosted();
  await V.depotAnlegen(PW);
  assert.ok(V._aktuelleDepotUUID(), 'Aufbau: depotAnlegen() setzt die UUID');
  V._setzeAktuelleDepotUUID(null);                     // der zu prüfende Grenzfall
  const r = await V.depotInIdbSichern();
  assert.equal(r, null, 'stiller No-Op, kein Wurf');
});

test('[Zug 2] depotInternSichern() darf den stillen No-Op NICHT als Erfolg melden', async () => {
  const { V } = hosted();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Anna');
  assert.ok(V.ungespeichertAnzahl() > 0, 'Aufbau: es gibt offene Edits');
  V._setzeAktuelleDepotUUID(null);
  const weg = await V.depotInternSichern();
  assert.equal(weg, 'fehlgeschlagen', 'null aus depotInIdbSichern() muss als Fehlschlag gelten, wie eine Exception');
  assert.equal(V.saveStatusModell().zustand, 'fehlgeschlagen', 'die Pille darf keinen Erfolg zeigen');
  assert.ok(V.ungespeichertAnzahl() > 0, 'die Edits gelten weiterhin als offen — nichts liegt in IndexedDB');
});

test('[Zug 2] Sub-Kontext-Zweig darf den stillen No-Op ebenfalls nicht als Erfolg melden', async () => {
  const { V } = hosted();
  await V.depotAnlegen(PW);
  const SUB = 'sub-pw-zug2';
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Oma', inhaberin: 'Oma Erna', verwaltungsTyp: 'verwaltet' }, SUB);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB);
  V.subKontextBetreten(e.depotUUID);
  assert.equal(V.getAktiverSubKontext(), e.depotUUID, 'Aufbau: Sub-Kontext ist offen');
  V._setzeAktuelleDepotUUID(null);                     // gilt für den ANKER-Save, den depotInternSichern hier macht
  const weg = await V.depotInternSichern();
  assert.equal(weg, 'fehlgeschlagen', 'auch im Sub-Zweig darf ein null-Rückgabewert nicht als Erfolg gelten');
  assert.equal(V.getAktiverSubKontext(), e.depotUUID, 'die Sicht bleibt im Sub (finally), auch beim Fehlschlag');
});

test('[Zug 2] Gegenprobe — mit gesetzter UUID sichert derselbe Aufruf wie zuvor (keine Regression)', async () => {
  const { V } = hosted();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Anna');
  // U2-ADR-237 (03.09.2026): sektorFeldSetzen() -> markiereUngespeichert() stößt seither selbst
  // einen stillen Auto-Save an — abwarten, damit er nicht zeitgleich mit dem gleich folgenden
  // EXPLIZITEN depotInternSichern()-Aufruf dieser Probe um denselben IDB-Record läuft.
  await V._internAutoSpeichernAbschluss();
  const weg = await V.depotInternSichern();
  assert.equal(weg, 'intern');
  // U2-ADR-237: Ruhezustand ohne Datei ist jetzt 'intern-aktuell' (ruhiger Wortlaut, kein
  // Datei-Bezug) statt des früheren 'keine-datei' — IDB bleibt weiterhin kein Datei-Signal.
  assert.equal(V.saveStatusModell().zustand, 'intern-aktuell', 'Zähler 0, intern aktuell — kein Datei-Bezug im Wortlaut');
  assert.equal(V.ungespeichertAnzahl(), 0);
});
