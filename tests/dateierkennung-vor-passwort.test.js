'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Startseite und Oberfläche" (12.08.2026, Zug 1, Posten 2
   Entscheidung B): nach der Dateiwahl, VOR der Passwortabfrage, sagt eine
   Zeile, was erkannt wurde — Anker-Datei (eigenes Depot) oder eine
   übergebene Blackbox-Datei. Reine Klartext-Erkennung, keine Entschlüsselung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const PW = 'pw';

test('[Erkennung] _dateiTypErkennen unterscheidet Anker-Hülle von Blackbox-Hülle', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const anker = await V.depotSerialisieren();
  assert.equal(V._dateiTypErkennen(anker), 'anker');

  /* A345: der ANKER schreibt in Feld-Einheiten (v4). Eine Blackbox-Hülle trägt dagegen
     einen SUB-Depot-Umschlag, und Sub-Depots zerfallen nicht — sie bleibt v3. Hier wird
     sie darum aus `depotSerialisierenV3` gebaut, nicht aus dem Anker-Schreibweg. */
  const alsSub = await V.depotSerialisierenV3();
  const blackbox = {
    dateiTyp: 'vivodepot-blackbox-export', formatVersion: 1,
    umschlag: { kryptoVersion: alsSub.kryptoVersion, depotUUID: alsSub.depotUUID,
      pbkdf2: alsSub.pbkdf2, depotSalt: alsSub.depotSalt, iv: alsSub.iv, ct: alsSub.ct },
  };
  assert.equal(V._dateiTypErkennen(blackbox), 'blackbox');
});

test('[Erkennung·Rotmachbarkeit] eine kaputte/unbekannte Datei liefert null (still, keine Behauptung)', async () => {
  const { V } = ladeKern();
  assert.equal(V._dateiTypErkennen(null), null);
  assert.equal(V._dateiTypErkennen({ nichts: 'davon' }), null);
  assert.equal(V._dateiTypErkennen({ dateiTyp: 'vivodepot-blackbox-export' }), null,
    'Blackbox-Marker ohne echten Umschlag darf nicht als „blackbox" durchgehen');
});

test('[Erkennung] Anmeldeschirm zeigt die Erkennungs-Zeile ÜBER dem Passwort-Feld, ohne jede Eingabe', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const anker = await V.depotSerialisieren();

  const k2 = ladeKern();
  k2.V.renderCryptoOverlay(null, false, false);   // normaler Eintritt, kein Angehörigen-Modus
  const markup = k2.document.getElementById('overlay-inhalt').innerHTML || '';
  assert.ok(markup.includes('id="co-datei-erkennung"'), 'die Zeile steht im Anmeldeschirm');
  assert.ok(markup.indexOf('id="co-datei-erkennung"') < markup.indexOf('id="co-pw"'),
    'und zwar ÜBER dem Passwort-Feld');

  k2.document.getElementById('co-datei').files = [{ text: async () => JSON.stringify(anker) }];
  await k2.V._dateiErkennungAuffrischen();

  const zeile = k2.document.getElementById('co-datei-erkennung');
  assert.equal(zeile.hidden, false, 'Zeile ist sichtbar');
  assert.equal(zeile.textContent, k2.V.STRINGS.dateiErkennungAnker, 'Anker-Text steht drin');
  // Der Beweis, dass nichts entschlüsselt wurde: es gab nie ein Passwort.
});

test('[Erkennung] eine Blackbox-Datei zeigt den Übergabe-Text, nicht den Anker-Text', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  // A345: eine Blackbox-Hülle trägt einen Sub-Depot-Umschlag — der bleibt v3.
  const alsSub = await V.depotSerialisierenV3();
  const blackbox = {
    dateiTyp: 'vivodepot-blackbox-export', formatVersion: 1,
    umschlag: { kryptoVersion: alsSub.kryptoVersion, depotUUID: alsSub.depotUUID,
      pbkdf2: alsSub.pbkdf2, depotSalt: alsSub.depotSalt, iv: alsSub.iv, ct: alsSub.ct },
  };

  const k2 = ladeKern();
  k2.V.renderCryptoOverlay(null, false, false);
  k2.document.getElementById('co-datei').files = [{ text: async () => JSON.stringify(blackbox) }];
  await k2.V._dateiErkennungAuffrischen();

  const zeile = k2.document.getElementById('co-datei-erkennung');
  assert.equal(zeile.hidden, false);
  assert.equal(zeile.textContent, k2.V.STRINGS.dateiErkennungBlackbox);
  assert.notEqual(zeile.textContent, k2.V.STRINGS.dateiErkennungAnker);
});

test('[Erkennung] keine lesbare Datei → Zeile bleibt versteckt (kein leerer Rahmen, keine Behauptung)', async () => {
  const { V } = ladeKern();
  const k2 = ladeKern();
  V.STRINGS && null; // no-op, hält den Import konsistent
  k2.V.renderCryptoOverlay(null, false, false);
  k2.document.getElementById('co-datei').files = [{ text: async () => 'kein-json{{{' }];
  await k2.V._dateiErkennungAuffrischen();
  const zeile = k2.document.getElementById('co-datei-erkennung');
  assert.equal(zeile.hidden, true);
  assert.equal(zeile.textContent, '');
});

test('[Erkennung] interner Eintritt (kein Datei-Picker) rendert die Zeile gar nicht erst', async () => {
  const k2 = ladeKern();
  k2.V.renderCryptoOverlay(null, true, false);   // internModus
  const markup = k2.document.getElementById('overlay-inhalt').innerHTML || '';
  assert.ok(!markup.includes('id="co-datei-erkennung"'), 'kein Datei-Picker, nichts zu erkennen');
});
