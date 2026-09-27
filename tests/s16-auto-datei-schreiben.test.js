'use strict';
/* ════════════════════════════════════════════════════════════════════════
   S16 („S16 und S18", 09.08.2026) — die Speicher-Weiche fragt nach
   dem Dateizeiger, nicht nach dem Protokoll.
   ────────────────────────────────────────────────────────────────────────
   Automatisches Schreiben in die gewählte Datei, WENN ein FSA-Handle mit
   erteilter Berechtigung vorliegt — geprüft über `_dateiHandleBerechtigungPruefen`
   (S11), keinen zweiten Prüfweg. `internerSpeicherModus()` bleibt unangetastet
   (zwölf andere Aufrufer hängen daran, s. Explore-Befund vor dem Bau) — eigene,
   enge Weiche nur für diesen neuen Auslöser.

   Drei Grenzen aus dem Auftrag, unverhandelbar:
   · kein Automatismus ohne Picker (Firefox/Safari/Touch) — `_dateiHandle`
     existiert dort nie, die Weiche bleibt von selbst zu.
   · Fehlschlag → S11 greift (Ansage einmal), danach Pause bis zum nächsten
     BEWUSSTEN Sichern — für frei, weil `_depotBlobSpeichern` das Handle bei
     Berechtigungsverlust bereits nullt (bestehendes S11-Verhalten).
   · kein Einstellungs-Schalter.

   `_autoDateiSchreibenAusfuehren` (die eigentliche Schreiblogik) wird direkt
   getestet — ohne auf die 2000-ms-Entprellung zu warten. EIN Test unten
   belegt die Entprellung selbst, real mit der Produktkonstante.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 's16-auto-schreiben-pw-741';

function dateiKisteMitBerechtigung(anfangsBerechtigung) {
  const kiste = { inhalt: null, schreibversuche: 0 };
  const zustand = { berechtigung: anfangsBerechtigung || 'granted', requestAntwort: 'granted' };
  const handle = {
    name: 'Mein-Vivodepot_s16.vivodepot',
    queryPermission: async () => zustand.berechtigung,
    requestPermission: async () => { zustand.berechtigung = zustand.requestAntwort; return zustand.berechtigung; },
    createWritable: async () => {
      if (zustand.berechtigung !== 'granted') { const e = new Error('simuliert'); e.name = 'NotAllowedError'; throw e; }
      kiste.schreibversuche++;
      return {
        write: async (blob) => { kiste.inhalt = typeof blob === 'string' ? blob : await blob.text(); },
        close: async () => {},
      };
    },
  };
  return { kiste, handle, zustand };
}

function modalSichtbarerText(dokument) {
  const el = dokument.getElementById('modal-inhalt');
  return (el && el.innerHTML) || '';
}

async function toastTexte(dokument) {
  return [...dokument.querySelectorAll('.toast')].map((t) => t.textContent);
}

/* ── 1 · kein Handle → kein Automatismus ─────────────────────────────────── */

test('[S16] ohne Dateiziel: _autoDateiSchreibenAusfuehren tut nichts (bleibt bewusstes Sichern)', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.markiereUngespeichert(1);
  await V._autoDateiSchreibenAusfuehren();
  assert.equal(V.istUngespeichert(), true, 'ohne Handle bleibt der Stand unverändert ungespeichert');
  assert.equal(modalSichtbarerText(dok).trim(), '', 'kein Zielwechsel-Hinweis ohne je gemerktes Ziel');
});

/* ── 2 · Handle mit erteilter Berechtigung → schreibt automatisch, still ─── */

test('[S16] mit gewährtem Dateiziel: automatischer Schreibversuch schreibt wirklich, ohne Toast', async () => {
  const { kiste, handle } = dateiKisteMitBerechtigung('granted');
  const { V, document: dok } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  assert.equal(await V.depotHerunterladen(), 'datei', 'erste, bewusste Sicherung setzt das Handle');
  const ersterInhalt = kiste.inhalt;
  V.markiereUngespeichert(1);
  await V._autoDateiSchreibenAusfuehren();
  assert.equal(V.istUngespeichert(), false, 'automatischer Schreibversuch räumt den Zähler ab, wie ein echtes Sichern');
  assert.notEqual(kiste.inhalt, ersterInhalt, 'wirklich neu geschrieben');
  assert.deepEqual(await toastTexte(dok), [], 'automatisches Schreiben bleibt still — kein Toast bei jedem Feld');
});

/* ── 2b · Ein automatischer Schreibversuch ist NICHT „das erste bewusste Sichern" ──
   Selbst gefundener Fehler (Cross-Component-Gate, `offline-garantie.mjs`): ein
   automatischer Schreibversuch als allererstes Datei-Sichern überhaupt zeigte
   den Rückweg-Hinweis (`wiedereinstiegHinweisZeigen`) — einen einmaligen, LEHRENDEN
   Modal-Dialog — mitten in einer unbemerkten Hintergrund-Aktion UND verbrauchte
   dabei den Marker, sodass die Bürgerin die Erklärung beim ersten ECHTEN,
   bewussten Sichern nie zu sehen bekommen hätte. */

test('[S16] automatischer Schreibversuch als allererste Datei-Sicherung zeigt NICHT den Rückweg-Hinweis, verbraucht den Marker nicht', async () => {
  const { handle } = dateiKisteMitBerechtigung('granted');
  const { V, document: dok } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  V.markiereUngespeichert(1);
  // Der allererste Schreibversuch überhaupt läuft hier bereits STILL (ohneToast) — genau
  // der reale Fund: kein vorheriges bewusstes Sichern, direkt der Automatismus zuerst.
  await V.depotInDateiSichern({ ohneToast: true });
  assert.equal(modalSichtbarerText(dok).trim(), '', 'kein Rückweg-Hinweis-Modal bei einem stillen automatischen Schreibversuch');
  assert.equal(V.getData()._wiedereinstiegHinweisGezeigt, false,
    'der Marker bleibt offen — die Bürgerin soll den Hinweis bei ihrem ersten ECHTEN Sichern noch sehen');
});

/* ── 3 · Berechtigung verloren → S11 greift, Automatismus setzt aus ──────── */

test('[S16] Berechtigung verloren: S11-Ansage EINMAL, Handle wird genullt, Automatismus pausiert', async () => {
  const { kiste, handle, zustand } = dateiKisteMitBerechtigung('granted');
  const { V, document: dok } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  await V.depotHerunterladen();
  const inhaltVorher = kiste.inhalt;
  zustand.berechtigung = 'denied';   // Stick gezogen / Berechtigung entzogen
  V.markiereUngespeichert(1);
  await V._autoDateiSchreibenAusfuehren();
  assert.ok(modalSichtbarerText(dok).includes('vd-nav') || modalSichtbarerText(dok).trim() !== '',
    'S11-Zielwechsel-Ansage erscheint');
  assert.equal(kiste.inhalt, inhaltVorher, 'kein Datenverlust — die alte Datei bleibt unverändert, es wurde nichts Falsches geschrieben');
  // Automatismus pausiert: ein zweiter automatischer Versuch (ohne dass die Bürgerin selbst
  // gesichert hat) darf NICHT erneut versuchen — das Handle ist genullt (bestehendes S11-Verhalten).
  V.markiereUngespeichert(1);
  await V._autoDateiSchreibenAusfuehren();
  assert.equal(V.istUngespeichert(), true, 'zweiter automatischer Versuch bleibt aus — der Stand ist weiterhin ungespeichert');
});

/* ── 4 · Vorschau → kein Automatismus (depotInDateiSichern hätte hier flowVorschauUebernehmen ausgelöst) ── */

test('[S16] in der Vorschau: kein automatischer Schreibversuch, auch mit vorhandenem Handle', async () => {
  const { handle } = dateiKisteMitBerechtigung('granted');
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  await V.depotHerunterladen();   // Handle ist jetzt gesetzt, wie im Auftrag beschrieben
  V.vorschauDepotErzeugen();      // wechselt in einen NEUEN, passwortlosen Vorschau-Stand
  assert.equal(V.imVorschau(), true, 'Vorbedingung: Vorschau aktiv');
  V.markiereUngespeichert(1);
  await V._autoDateiSchreibenAusfuehren();
  assert.equal(V.istUngespeichert(), true, 'Vorschau bleibt unberührt vom Automatismus, obwohl ein Handle vorliegt');
});

/* ── 5 · Kein Schreibversuch ohne echte offene Änderung ──────────────────── */

test('[S16] ohne ungespeicherte Änderung: kein Schreibversuch (nichts zu tun)', async () => {
  const { kiste, handle } = dateiKisteMitBerechtigung('granted');
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  await V.depotHerunterladen();
  const inhaltVorher = kiste.inhalt;
  const versucheVorher = kiste.schreibversuche;
  await V._autoDateiSchreibenAusfuehren();   // istUngespeichert() ist false nach dem Sichern eben
  assert.equal(kiste.schreibversuche, versucheVorher, 'kein zweiter Schreibversuch ohne neue Änderung');
  assert.equal(kiste.inhalt, inhaltVorher);
});

/* ── 6 · Die Entprellung selbst, real (Produktkonstante) ─────────────────────
   `document.addEventListener` ist im Test-DOM-Stub ein No-Op (Event-Blindzone,
   U2-ADR-091) — ein echtes Blur-Event kann hier nicht geprüft werden, das ist
   Sache der Browser-Abnahme (Zug 3). Was hier ohne DOM real geprüft werden
   kann: die Entprellungs-Funktion selbst, mit der echten Produktkonstante. */

test('[S16] _autoDateiSchreibenAnstossen entprellt real — erst nach der Wartezeit geschrieben', { timeout: 5000 }, async () => {
  const { kiste, handle } = dateiKisteMitBerechtigung('granted');
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  await V.depotHerunterladen();
  const inhaltVorSchreiben = kiste.inhalt;
  V.markiereUngespeichert(1);
  V._autoDateiSchreibenAnstossen();
  assert.equal(kiste.inhalt, inhaltVorSchreiben, 'unmittelbar nach dem Anstoß ist noch NICHT geschrieben — entprellt');
  await new Promise((r) => setTimeout(r, V.AUTO_DATEI_SCHREIBEN_ENTPRELLUNG_MS + 300));
  assert.notEqual(kiste.inhalt, inhaltVorSchreiben, 'nach der Entprellungszeit ist automatisch geschrieben');
});

test('[S16] _autoDateiSchreibenAnstossen: ein zweiter Anstoß VOR Ablauf setzt den Timer zurück (echte Entprellung)', { timeout: 5000 }, async () => {
  const { kiste, handle } = dateiKisteMitBerechtigung('granted');
  const { V } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  await V.depotHerunterladen();
  const inhaltVorSchreiben = kiste.inhalt;
  V.markiereUngespeichert(1);
  V._autoDateiSchreibenAnstossen();
  await new Promise((r) => setTimeout(r, Math.floor(V.AUTO_DATEI_SCHREIBEN_ENTPRELLUNG_MS * 0.7)));
  V._autoDateiSchreibenAnstossen();   // neue Änderung kurz vor Ablauf — Timer beginnt neu
  await new Promise((r) => setTimeout(r, Math.floor(V.AUTO_DATEI_SCHREIBEN_ENTPRELLUNG_MS * 0.5)));
  assert.equal(kiste.inhalt, inhaltVorSchreiben,
    'zusammen wäre die ERSTE Wartezeit längst abgelaufen — der zweite Anstoß muss sie zurückgesetzt haben');
});
