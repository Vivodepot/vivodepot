'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-185 — der Sperrschirm statt der Startseite nach einem Hintergrund-Wipe
   ────────────────────────────────────────────────────────────────────────────
   Wörtlich: "alles ist weg" — gemessen war NICHTS gelöscht (der
   Wipe fasst keinen persistenten Speicher an), aber der Eingangsschirm nach
   U2-ADR-184 teilte genau das mit: er kennt die Bürgerin nicht. Ihre Konvention:
   "zurückkommen und kurz Passwort eingeben und dann an der Stelle weitermachen
   … wie das Fenster einer Bank."

   POSITIVKONTROLLE: dieses Datei lief VOR dem Bau gegen HEAD d3114ec (U2-ADR-184,
   noch ohne diesen Fix) und war an genau den Stellen rot, an denen unten "ROT VOR
   DEM FIX" steht — s. Bericht für die vollständige Ausgabe. Nicht ausgedacht,
   gemessen: `renderWelcome()` kannte weder das Passwortfeld noch eine Stelle,
   die Wache in `renderContentInner()` (U2-ADR-184-Nachtrag) existierte, aber die
   drei Halter (`_gehaltenerUmschlag`/`_wipeStelle`/`_wipeErklaerungZeigen`)
   existierten schlicht nicht — jeder Zugriff über die Getter unten lieferte
   `undefined`, jede Verhaltensprobe scheiterte an der Bildschirm-Form.

   Deckt NICHT den Datei-Öffnen-Weg ab (File System Access API ist DOM-, nicht
   Node-seitig testbar) — dafür tests/e2e/hintergrund-wipe-sperrschirm.spec.js,
   mit ECHTEM visibilitychange, nicht mit einem Direktaufruf des Wipes.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'sperrschirm-pw-1!';

async function internesDepotGespeichert() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Sperrschirm Tester');
  // depotInternSichern() (NICHT das rohe depotInIdbSichern()) — der echte Speicherweg, der
  // auch _ungespeicherteAenderungen zurücksetzt. Ohne diese Rücksetzung bliebe der Wipe unten
  // an Politik A hängen (kein Datenverlust) und _hintergrundWipeVielleicht() täte gar nichts —
  // eine echte Falle, die eine erste Fassung dieser Datei tatsächlich gestellt hat (Bericht).
  await k.V.depotInternSichern();
  return k;
}

function passwortEingeben(document, pw) {
  const pwEl = document.getElementById('co-pw');
  pwEl.value = pw;
}

test('U2-ADR-185: nach dem Wipe zeigt der Schirm das Passwortfeld (Sperrschirm), nicht die Startseite', async () => {
  const { V, document } = await internesDepotGespeichert();
  V._hintergrundWipeVielleicht();
  const html = document.getElementById('overlay-inhalt').innerHTML;
  assert.ok(html.includes('id="co-pw"'), 'Sperrschirm muss das Passwortfeld zeigen');
  assert.ok(!html.includes('id="w-anlass"'), 'NICHT der Erstbesucher-Schirm (Startseite)');
});

test('U2-ADR-185: der erklärende Satz steht NUR nach dem Wipe, mit dem abgenommenen Wortlaut', async () => {
  const { V, document } = await internesDepotGespeichert();
  V._hintergrundWipeVielleicht();
  const html = document.getElementById('overlay-inhalt').innerHTML;
  assert.ok(V.STRINGS.wipeSperrschirmHinweis, 'Vorbedingung: der Wortlaut-Schlüssel muss existieren');
  assert.ok(html.includes(V.STRINGS.wipeSperrschirmHinweis), 'der abgenommene Wortlaut muss stehen');
});

test('U2-ADR-185: derselbe Sperrschirm beim REGULÄREN Öffnen (kein Wipe) zeigt den Satz NICHT', () => {
  const { V, document } = ladeKern();
  V.renderCryptoOverlay(null, true);
  const html = document.getElementById('overlay-inhalt').innerHTML;
  assert.ok(!html.includes(V.STRINGS.wipeSperrschirmHinweis),
    'ein regulärer Öffnen-Weg über denselben Schirm ist kein Wipe-Ergebnis — der Satz wäre hier falsch');
});

test('U2-ADR-185: keinerlei personenbezogener Wert im Sperrschirm-Markup nach dem Wipe', async () => {
  const { V, document } = await internesDepotGespeichert();
  V._hintergrundWipeVielleicht();
  const html = document.getElementById('overlay-inhalt').innerHTML;
  assert.ok(!html.includes('Sperrschirm Tester'), 'kein Name auf dem Sperrschirm');
});

test('U2-ADR-185 Stück 3: NICHTS vom Passwort Abgeleitetes überlebt den Wipe — falsches Passwort scheitert weiterhin', async () => {
  const { V, document } = await internesDepotGespeichert();
  V._hintergrundWipeVielleicht();
  assert.equal(V.getData(), null, 'Vorbedingung: data ist weg');
  assert.equal(V.sessionSubKeys.size, 0, 'Vorbedingung: keine Sub-Schlüssel');
  assert.equal(V.aktuellerSitzungsAkteur(), null, 'Vorbedingung: kein Sitzungs-Akteur mehr');
  passwortEingeben(document, 'falsches-passwort');
  await V.cryptoOverlayOeffnen();
  assert.equal(V.getData(), null,
    'ein falsches Passwort gegen den gehaltenen Umschlag muss weiterhin scheitern — sonst läge dort Klartext, kein Chiffrat');
});

test('U2-ADR-185 Stück 3: der gehaltene Umschlag ist entschlüsselbar — richtiges Passwort öffnet wieder dasselbe Depot', async () => {
  const { V, document } = await internesDepotGespeichert();
  V._hintergrundWipeVielleicht();
  assert.ok(V._gehaltenerUmschlagHalter(), 'Vorbedingung: ein Umschlag muss gehalten sein');
  passwortEingeben(document, PW);
  await V.cryptoOverlayOeffnen();
  assert.notEqual(V.getData(), null, 'richtiges Passwort muss wieder ein offenes Depot ergeben');
});

test('U2-ADR-185 Stück 3, Nachtrag: der gehaltene Umschlag ist NACH JEDEM Speichern nachgezogen, nicht der erste', async () => {
  const { V, document } = await internesDepotGespeichert();
  V.sektorFeldSetzen('identity', 'givenName', 'Erste Fassung');
  await V.depotInternSichern();
  V.sektorFeldSetzen('identity', 'givenName', 'Zweite Fassung');
  await V.depotInternSichern();   // zweiter Save MUSS den Umschlag erneut nachziehen

  V._hintergrundWipeVielleicht();
  passwortEingeben(document, PW);
  await V.cryptoOverlayOeffnen();

  assert.equal(V.getData().sektoren.identity.givenName, 'Zweite Fassung',
    'ein überholter gehaltener Umschlag wäre "nichts ist verlorengegangen" — still falsch');
});

test('U2-ADR-185 Stück 2: die Navigations-Stelle wird gemerkt und nach richtigem Passwort wieder angefahren', async () => {
  const { V, document } = await internesDepotGespeichert();
  const abseits = V.SEKTOREN[1].id;
  assert.notEqual(abseits, V.getViewState().aktiverSektorId, 'Vorbedingung: das ist NICHT der Standard-Sektor');
  V.oeffneSektor(abseits);
  await V.depotInternSichern();   // sauberer Stand vor dem Wipe (Politik A ließe sonst nicht wipen)

  V._hintergrundWipeVielleicht();
  assert.equal(V.getViewState().aktiverSektorId, V.SEKTOREN[0].id,
    'nach dem Reset steht die Sicht auf dem Standard — das ist der Zustand VOR dem Wiederanfahren');
  assert.equal(V._wipeStelleHalter().sektorId, abseits, 'die Stelle muss VOR dem Reset gemerkt worden sein');

  passwortEingeben(document, PW);
  await V.cryptoOverlayOeffnen();

  assert.equal(V.getViewState().aktiverSektorId, abseits,
    'nach richtigem Passwort muss die Sicht wieder auf der gemerkten Stelle stehen, nicht auf dem Standard');
});

test('U2-ADR-185 Stück 2: verschwundene Stelle (Bereichs-Modul seither abgemeldet) fällt still auf den Standard zurück, statt zu werfen', async () => {
  const { V, document } = await internesDepotGespeichert();
  const abseits = V.SEKTOREN[1].id;
  V.oeffneSektor(abseits);
  // Simuliert: bis zum letzten Save war der Sektor noch im Bereichssatz, seither (z. B. ein
  // Modul-Abmelden) nicht mehr — der Umschlag, der jetzt gehalten wird, trägt den engeren Satz.
  V.getData().bereichssatz = [V.SEKTOREN[0].id];
  await V.depotInternSichern();

  V._hintergrundWipeVielleicht();
  passwortEingeben(document, PW);
  await assert.doesNotReject(() => V.cryptoOverlayOeffnen(),
    'eine nicht mehr existierende gemerkte Stelle darf den Wiedereintritt nie zum Absturz bringen');

  assert.equal(V.getViewState().aktiverSektorId, V.SEKTOREN[0].id,
    'stiller Rückfall auf den Standard, nicht ein halb angefahrener, ungültiger Zustand');
});

test('U2-ADR-185 Stück 1: der Rückweg "Doch neu anfangen" verwirft den gehaltenen Umschlag und die Stelle', async () => {
  const { V, document } = await internesDepotGespeichert();
  V._hintergrundWipeVielleicht();
  assert.ok(V._gehaltenerUmschlagHalter(), 'Vorbedingung: etwas ist gehalten');

  const rueckweg = document.getElementById('co-neu').onclick;
  assert.equal(typeof rueckweg, 'function', 'Vorbedingung: der Rückweg-Knopf muss verdrahtet sein');
  rueckweg();

  assert.equal(V._gehaltenerUmschlagHalter(), null, 'der Rückweg muss den gehaltenen Umschlag verwerfen');
  assert.equal(V._wipeStelleHalter(), null, 'der Rückweg muss auch die gemerkte Stelle verwerfen');
  assert.equal(V._wipeErklaerungZeigenHalter(), false, 'kein Wipe-Satz mehr nach einem bewussten Neuanfang');
});

test('U2-ADR-185: der Wipe-Erklärungssatz ist nach dem Betreten der App verbraucht (nicht noch bei der nächsten Navigation sichtbar)', async () => {
  const { V, document } = await internesDepotGespeichert();
  V._hintergrundWipeVielleicht();
  assert.equal(V._wipeErklaerungZeigenHalter(), true, 'Vorbedingung: der Satz ist nach dem Wipe fällig');
  passwortEingeben(document, PW);
  await V.cryptoOverlayOeffnen();
  assert.equal(V._wipeErklaerungZeigenHalter(), false, 'betreteApp() muss den Merker verbrauchen');
});
