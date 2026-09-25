'use strict';
/* ════════════════════════════════════════════════════════════════════════
   S11 (Auftrag „Das Stick-Versprechen halten", 09.08.2026) — der Zielwechsel
   wird sichtbar und gewollt, nicht mehr still.
   ────────────────────────────────────────────────────────────────────────
   Vorher: schlägt das Schreiben auf das GEMERKTE Dateiziel fehl (Stick gezogen,
   Datei verschoben, Berechtigung nach längerer Sitzung entzogen), fängt
   `_depotBlobSpeichern` (8257) jeden Fehler außer AbortError ab, nullt das
   Handle (8259) und fällt still auf den Anker-Download durch (8265). Die
   Bürgerin erfährt nichts — weder dass ihr Stick nicht mehr aktuell ist,
   noch wo die Sicherung stattdessen liegt.

   Drei Teile aus dem Auftrag:
     1. VORHER prüfen: `queryPermission`, bei „prompt" `requestPermission`
        (aus der Nutzergeste des Save-Klicks — kein blockierendes Modal davor).
     2. Den Wechsel ANSAGEN, wenn der Fallback trotzdem greift (Modal, kein
        Toast — der schließt sich, während die Bürgerin nicht mehr hinsieht).
     3. Den Zustand BEHALTEN: `_aktuelleDateiSicherung` bleibt false, solange
        nur der Fallback griff.

   NICHT betroffen (Regel: kein „Zielverlust" ohne vorher gemerktes Ziel):
   die erste Sicherung überhaupt, wenn der Picker selbst fehlschlägt — dort
   gab es nie ein Ziel, das „verloren" gehen könnte, das bleibt der normale,
   unveränderte Download-Pfad.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 's11-zielwechsel-passwort-321';

// Ein FSA-Handle, das eine echte Permissions-API nachbildet: `berechtigung` ist der
// gespeicherte Stand, `requestPermission` schreibt ihn — wie beim echten Browser — auf
// das Ergebnis der Nutzer-Entscheidung zurück. `createWritable` scheitert ehrlich mit
// NotAllowedError, wenn zum Zeitpunkt des Schreibens keine Berechtigung vorliegt (auch
// wenn das Produkt den Vorab-Check vergessen sollte — der Test darf sich nicht selbst
// belügen, indem die Attrappe die Prüfung, die sie eigentlich provozieren soll, vorwegnimmt).
function dateiKisteMitBerechtigung(anfangsBerechtigung) {
  const kiste = { inhalt: null };
  const zustand = { berechtigung: anfangsBerechtigung || 'granted', requestAntwort: 'granted', requestAufrufe: 0, queryAufrufe: 0 };
  const handle = {
    name: 'Mein-Vivodepot_s11.vivodepot',
    queryPermission: async () => { zustand.queryAufrufe++; return zustand.berechtigung; },
    requestPermission: async () => { zustand.requestAufrufe++; zustand.berechtigung = zustand.requestAntwort; return zustand.berechtigung; },
    createWritable: async () => {
      if (zustand.berechtigung !== 'granted') { const e = new Error('simuliert'); e.name = 'NotAllowedError'; throw e; }
      return {
        write: async (blob) => { kiste.inhalt = typeof blob === 'string' ? blob : await blob.text(); },
        close: async () => {},
      };
    },
  };
  return { kiste, handle, zustand };
}

// Handle OHNE jede Permissions-API — die heutigen Test-Attrappen und älteren echten
// Handles. Muss unverändert funktionieren (Regel: keine Permission-API → 'granted').
function dateiKisteOhnePermissionApi() {
  const kiste = { inhalt: null };
  const handle = {
    name: 'Mein-Vivodepot_alt.vivodepot',
    createWritable: async () => ({
      write: async (blob) => { kiste.inhalt = typeof blob === 'string' ? blob : await blob.text(); },
      close: async () => {},
    }),
  };
  return { kiste, handle };
}

function modalSichtbarerText(dokument) {
  const el = dokument.getElementById('modal-inhalt');
  return (el && el.innerHTML) || '';
}

/* ── 1 · Regression — Handles ohne Permission-API bleiben unangetastet ──── */

test('[S11] Handle ohne Permission-API: zweites Sichern schreibt weiterhin normal, kein Modal', async () => {
  const { kiste, handle } = dateiKisteOhnePermissionApi();
  const { V, document: dok } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  assert.equal(await V.depotHerunterladen(), 'datei', 'erste Sicherung: normaler FSA-Weg');
  const ersterInhalt = kiste.inhalt;
  assert.equal(await V.depotHerunterladen(), 'datei', 'zweite Sicherung: unverändert normaler FSA-Weg');
  assert.notEqual(kiste.inhalt, ersterInhalt, 'wirklich neu geschrieben (Zeitstempel ändert sich)');
  assert.equal(modalSichtbarerText(dok).trim(), '', 'keine Berechtigung verloren → kein Zielwechsel-Hinweis');
});

/* ── 2 · Vorher prüfen — queryPermission granted: unverändert, kein Umweg ── */

test('[S11] queryPermission=granted: schreibt direkt, requestPermission wird NICHT bemüht', async () => {
  const { handle, zustand } = dateiKisteMitBerechtigung('granted');
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  assert.equal(await V.depotHerunterladen(), 'datei');
  assert.equal(await V.depotHerunterladen(), 'datei');
  assert.equal(zustand.requestAufrufe, 0, 'granted braucht keine Nachfrage');
});

/* ── 3 · queryPermission=prompt, requestPermission gewährt: stille Erholung ── */

test('[S11] queryPermission=prompt + requestPermission=granted: schreibt nach Nachfrage, KEIN Zielwechsel-Modal', async () => {
  const { handle, zustand } = dateiKisteMitBerechtigung('granted');
  const { V, document: dok } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  assert.equal(await V.depotHerunterladen(), 'datei', 'erste Sicherung legt das Handle an');
  zustand.berechtigung = 'prompt';           // z. B. nach längerer Sitzung erneut zu bestätigen
  zustand.requestAntwort = 'granted';        // die Bürgerin bestätigt beim OS-Dialog
  const weg = await V.depotHerunterladen();
  assert.equal(weg, 'datei', 'Erholung über requestPermission — kein Zielwechsel, kein Downloads-Fallback');
  assert.equal(zustand.requestAufrufe, 1, 'requestPermission wurde genau einmal bemüht');
  assert.equal(modalSichtbarerText(dok).trim(), '', 'eine stille Erholung braucht keine Ansage');
});

/* ── 4 · Der eigentliche Fall — Berechtigung wirklich verloren ──────────── */

test('[S11] queryPermission=denied nach erfolgreicher erster Sicherung: Fallback + ANSAGE + Status bleibt unbestätigt', async () => {
  const { kiste, handle, zustand } = dateiKisteMitBerechtigung('granted');
  const { V, document: dok } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  assert.equal(await V.depotHerunterladen(), 'datei');
  assert.equal(V.saveStatusModell().zustand, 'als-datei', 'Vorbedingung: nach dem ersten Save als aktuell markiert');
  const vorherigerInhalt = kiste.inhalt;

  V.markiereUngespeichert();                 // die Bürgerin hat seither etwas eingetragen
  zustand.berechtigung = 'denied';           // Stick gezogen / Datei verschoben / Zugriff endgültig weg
  const weg = await V.depotHerunterladen();

  assert.equal(weg, 'zielverlust', 'ein eigener Rückgabewert, nicht das normale „download" (Nicht-FSA-Erstweg)');
  const stand = V.saveStatusModell();
  assert.notEqual(stand.zustand, 'als-datei',
    '_aktuelleDateiSicherung darf NICHT auf true stehen — nur der Fallback hat gegriffen, niemand hat das quittiert');
  // Zug 1 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026, S14): der Zielverlust-Fallback ruft
  // ebenfalls markiereDateiSicherungUnbestaetigt() (:8457) — vor diesem Zug war der Zustand gesetzt,
  // aber in saveStatusModell() unerreichbar (der anzahl>0-Zweig griff immer zuerst), darum sah dieser
  // Test bislang 'ungespeichert'. Jetzt bekommt der vierte Zustand seinen Abnehmer — 'unbestaetigt'
  // ist die WAHRERE Aussage: die Änderung WURDE in den Anker-Download aufgenommen, nur unbestätigt.
  assert.equal(stand.zustand, 'unbestaetigt', 'geschrieben, aber unbestätigt — nicht fälschlich als "offen, nichts geschah" verdeckt');
  assert.equal(stand.anzahl, 1, 'der Fallback darf den Zähler nicht selbst auf 0 setzen');

  const text = modalSichtbarerText(dok);
  assert.notEqual(text.trim(), '', 'die Bürgerin bekommt eine ANSAGE, kein stilles Nichts');
  assert.match(text, /nicht mehr aktuell|nicht aktuell/i, 'sagt: der ursprüngliche Ort ist nicht mehr aktuell');
});

test('[S11] queryPermission=prompt + requestPermission=denied: ebenfalls Fallback + Ansage', async () => {
  const { handle, zustand } = dateiKisteMitBerechtigung('granted');
  const { V, document: dok } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  await V.depotHerunterladen();
  V.markiereUngespeichert();
  zustand.berechtigung = 'prompt';
  zustand.requestAntwort = 'denied';         // die Bürgerin lehnt die Nachfrage ab / OS verweigert
  const weg = await V.depotHerunterladen();
  assert.equal(weg, 'zielverlust');
  assert.notEqual(V.saveStatusModell().zustand, 'als-datei');
  assert.notEqual(modalSichtbarerText(dok).trim(), '');
});

/* ── 5 · Grenze — kein gemerktes Ziel, kein „Zielwechsel" ────────────────── */

test('[S11] erste Sicherung überhaupt, Picker scheitert direkt: normaler Download-Pfad, KEIN Zielwechsel-Modal', async () => {
  const picker = async () => { const e = new Error('kaputt'); e.name = 'NotFoundError'; throw e; };
  const { V, document: dok } = ladeKern({ showSaveFilePicker: picker, Blob });
  await V.depotAnlegen(PW);
  const weg = await V.depotHerunterladen();
  assert.equal(weg, 'download', 'kein vorheriges Ziel → der normale, unveränderte Download-Pfad');
  assert.equal(modalSichtbarerText(dok).trim(), '', 'nichts wurde „verloren" — es gab noch nichts zu verlieren');
});

test('[S11] AbortError am Picker bleibt unverändert "abgebrochen", kein Modal', async () => {
  const picker = async () => { const e = new Error('abgebrochen'); e.name = 'AbortError'; throw e; };
  const { V, document: dok } = ladeKern({ showSaveFilePicker: picker, Blob });
  await V.depotAnlegen(PW);
  assert.equal(await V.depotHerunterladen(), 'abgebrochen');
  assert.equal(modalSichtbarerText(dok).trim(), '');
});
