'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Glied 4 — Schreibabbruch und Absturz (Auftrag „Auftragskette Nacht",
   14./15.08.2026): überlebt ein Depot einen abgebrochenen Schreibvorgang?

   Der Schreibpfad (`_depotBlobSpeichern`, vivodepot.html) läuft über die
   File System Access API: `_dateiHandle.createWritable()` → `write(blob)`
   → `close()`. Ein Kommentar an `depotHerunterladen()` (Auftrag „Erfolg ohne
   Wirkung", 08.08.2026) belegt bereits: NUR 'datei'/'geteilt' gelten als
   bestätigter Erfolg — 'download' (Anker-Klick) NIE, weil der Browser dafür
   keine Rückmeldung gibt. Das ist ein bekannter, bereits behobener Fund,
   hier NICHT wiederholt.

   OFFEN und hier geprüft: greift dieselbe Ehrlichkeit auch, wenn `write()`
   oder `close()` selbst scheitern (voller Datenträger, Abbruch zwischen
   Verschlüsselung und Ablage)? Erwartetes Ergebnis: der Fehlschlag fällt
   auf den (ebenfalls unbestätigten) Download-Pfad zurück — NIE ein 'datei',
   das eine unvollständige oder gar keine Schreibung als Erfolg meldet.

   „Zweiter Schreibvorgang auf dieselbe Datei" (die vierte im Auftrag
   genannte Probe): im Node-Headless-Test nicht sinnvoll nachstellbar — die
   FSA-Konkurrenzsemantik (letzter Writer gewinnt, Swap-Datei + atomares
   Rename) ist ausschließlich Browser-/Betriebssystem-intern und wird von
   keiner injizierbaren Attrappe abgebildet. Als Lücke benannt, nicht
   stillschweigend übersprungen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'g4-schreibabbruch-passwort-654';

// Ein FSA-Handle, dessen write()/close() gezielt an einer Stelle scheitern —
// simuliert "voller Datenträger" (QuotaExceededError) oder einen Abbruch
// zwischen Verschlüsselung (write geliefert) und Ablage (close/Rename).
function dateiKisteMitFehlschlag({ scheitertBei, fehlerName }) {
  const kiste = { inhalt: null, writeAufrufe: 0, closeAufrufe: 0 };
  const handle = {
    name: 'Mein-Vivodepot_g4.vivodepot',
    createWritable: async () => ({
      write: async (blob) => {
        kiste.writeAufrufe++;
        if (scheitertBei === 'write') {
          const e = new Error('simulierter Schreibfehler'); e.name = fehlerName || 'QuotaExceededError'; throw e;
        }
        kiste.inhalt = typeof blob === 'string' ? blob : await blob.text();
      },
      close: async () => {
        kiste.closeAufrufe++;
        if (scheitertBei === 'close') {
          const e = new Error('simulierter Abbruch vor der Ablage'); e.name = fehlerName || 'QuotaExceededError'; throw e;
        }
      },
    }),
  };
  return { kiste, handle };
}

test('[G4] voller Datenträger beim write(): kein "datei"-Erfolg, Rückfall auf unbestätigten Weg', async () => {
  const { kiste, handle } = dateiKisteMitFehlschlag({ scheitertBei: 'write' });
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  const weg = await V.depotHerunterladen();
  assert.notEqual(weg, 'datei', 'ein gescheiterter write() darf NIE als bestätigter FSA-Erfolg gemeldet werden');
  assert.equal(kiste.inhalt, null, 'kein Teil-Inhalt in der (simulierten) Zieldatei — write() warf, bevor irgendetwas geschrieben wurde');
  assert.equal(kiste.closeAufrufe, 0, 'close() darf nach einem gescheiterten write() NICHT aufgerufen werden — kein Teil-Commit');
});

test('[G4] Abbruch zwischen Verschlüsselung und Ablage (close() scheitert): kein "datei"-Erfolg', async () => {
  const { kiste, handle } = dateiKisteMitFehlschlag({ scheitertBei: 'close' });
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  const weg = await V.depotHerunterladen();
  assert.notEqual(weg, 'datei', 'ein gescheitertes close() (Abbruch nach write, vor der Ablage) darf NIE als Erfolg gemeldet werden');
  assert.equal(kiste.writeAufrufe, 1, 'write() lief (die Verschlüsselung/Serialisierung war fertig) …');
  assert.equal(kiste.closeAufrufe, 1, '… close() wurde versucht und scheiterte — genau der Auftrags-Fall "Abbruch zwischen Verschlüsselung und Ablage"');
});

test('[G4] nach einem Schreibfehlschlag bleibt der Depot-Status "ungespeichert" — keine falsche Erfolgs-Marke', async () => {
  const { handle } = dateiKisteMitFehlschlag({ scheitertBei: 'write' });
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  V.markiereUngespeichert();   // eine echte Änderung nach dem Anlegen — der Fall, den die Probe braucht
  assert.ok(V.istUngespeichert(), 'nach einer Änderung ist das Depot ungespeichert');
  await V.depotHerunterladen();
  assert.ok(V.istUngespeichert(), 'nach einem gescheiterten Schreibversuch bleibt der Status ungespeichert — die App behauptet keine Sicherung, die nicht stattfand');
});

test('[G4] nach einem Schreibfehlschlag erholt sich ein FOLGENDER, echter Schreibversuch normal', async () => {
  // Das gemerkte Handle wird bei jedem Nicht-AbortError-Fehler genullt (bestehendes Verhalten,
  // s. `_depotBlobSpeichern`) — ein zweiter Versuch fragt darum den Picker erneut, diesmal mit
  // einem GESUNDEN Handle. Das Depot selbst (der Inhalt) ist nie beschädigt worden.
  let anfrageZahl = 0;
  const gesundeKiste = { inhalt: null };
  const kaputterHandle = dateiKisteMitFehlschlag({ scheitertBei: 'write' }).handle;
  const gesunderHandle = {
    name: 'Mein-Vivodepot_g4-erholt.vivodepot',
    createWritable: async () => ({
      write: async (blob) => { gesundeKiste.inhalt = typeof blob === 'string' ? blob : await blob.text(); },
      close: async () => {},
    }),
  };
  const picker = async () => { anfrageZahl++; return anfrageZahl === 1 ? kaputterHandle : gesunderHandle; };
  const { V } = ladeKern({ showSaveFilePicker: picker, Blob });
  await V.depotAnlegen(PW);

  const ersterVersuch = await V.depotHerunterladen();
  assert.notEqual(ersterVersuch, 'datei', 'erster Versuch: der kaputte Handle scheitert wie erwartet');

  const zweiterVersuch = await V.depotHerunterladen();
  assert.equal(zweiterVersuch, 'datei', 'zweiter Versuch: ein gesundes Handle schreibt normal — kein dauerhaft blockierter Zustand');
  assert.ok(gesundeKiste.inhalt, 'der Inhalt kam beim zweiten, gesunden Versuch wirklich an');
});
