'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 5: Konflikt-Auflösung (interner Stand vs. Datei)
   ────────────────────────────────────────────────────────────────────────
   GRUNDREGEL: kein Auto-Gewinner. Vergleich über die Klartext-Zeitmarke.
   (a) Gleichstand → kein Dialog (Positiv-Kontrolle).
   (b) Unterschied → Konflikt, beide Zeitmarken korrekt + lesbar.
   (c) Altfall: Datei ohne Zeitmarke → „unbekannt", kein Crash.
   (d) Wahl „Gerät"/„Datei" setzt den richtigen neuen internen Stand, lässt den
       anderen unberührt (Datei wird nie überschrieben).
   (e) Datei-Format: gespeichert_am als Klartext-Geschwisterfeld neben dem Chiffrat,
       NIE im AAD-gebundenen Umschlag-Inneren; bei unverändertem Stand = interne Marke.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'konflikt-passwort-555';
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
function hosted(mock) { const m = mock || createIdbMock(); return { ...ladeKern({ indexedDB: m, location: HOSTED }), mock: m }; }

/* ⚠ KORRIGIERT 27.07.2026 (Posten 21). Diese Prüfung hielt die UTC-Uhrzeit fest —
   sie pinnte den Fehler, nicht das Verhalten. `gespeichert_am` ist ein voller
   UTC-Zeitstempel; der Konflikt-Dialog ist aber genau der Ort, an dem die Bürgerin
   ZWEI STÄNDE NACH DER UHRZEIT vergleicht, um einen zu verwerfen. Eine UTC-Anzeige
   ist dort keine Ungenauigkeit, sondern eine falsche Entscheidungsgrundlage: um
   00:30 Ortszeit stand hier „22:30 Uhr" für etwas eben Gespeichertes.
   Die Erwartung wird darum aus der LOKALEN Zone gerechnet statt hart geschrieben —
   ein hart geschriebener Wert wäre wieder nur in einer Zone richtig. */
const lokalErwartet = (iso) => {
  const d = new Date(iso), p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() +
         ', ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ' Uhr';
};

test('[D43-E5] Zeit-Formatierung: ISO → LOKALES „DD.MM.JJJJ, HH:MM Uhr", ungültig → null', () => {
  const { V } = hosted();
  assert.equal(V._konfliktZeitLesbar('2026-06-12T19:34:07.000Z'), lokalErwartet('2026-06-12T19:34:07.000Z'));
  // Positivkontrolle, dass die Erwartung nicht bloss die Funktion nachbaut: in
  // Europe/Berlin MUSS sie von der UTC-Lesart abweichen (Sommerzeit, +2 h).
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Berlin') {
    assert.equal(V._konfliktZeitLesbar('2026-06-12T19:34:07.000Z'), '12.06.2026, 21:34 Uhr');
  }
  assert.equal(V._konfliktZeitLesbar('keine-marke'), null);
  assert.equal(V._konfliktZeitLesbar(null), null);
});

test('[D43-E5] Modell: Gleichstand → kein Konflikt (Positiv-Kontrolle)', () => {
  const { V } = hosted();
  const T = '2026-06-12T10:00:00.000Z';
  const m = V.standKonfliktModell({ gespeichert_am: T }, { gespeichert_am: T });
  assert.equal(m.konflikt, false);
  assert.equal(m.grund, 'gleich');
});

test('[D43-E5] Modell: Unterschied → Konflikt mit beiden Zeitmarken', () => {
  const { V } = hosted();
  const m = V.standKonfliktModell(
    { gespeichert_am: '2026-06-12T19:00:00.000Z' },
    { gespeichert_am: '2026-06-11T08:30:00.000Z' });
  assert.equal(m.konflikt, true);
  assert.equal(m.internLesbar, lokalErwartet('2026-06-12T19:00:00.000Z'));
  assert.equal(m.dateiLesbar,  lokalErwartet('2026-06-11T08:30:00.000Z'));
});

test('[D43-E5] Altfall: Datei ohne gespeichert_am → Konflikt, dateiLesbar null („unbekannt")', () => {
  const { V } = hosted();
  const m = V.standKonfliktModell(
    { gespeichert_am: '2026-06-12T19:00:00.000Z' },
    { kryptoVersion: 3, ct: 'x' });   // Datei ohne Zeitmarke
  assert.equal(m.konflikt, true, 'unbekanntes Datei-Datum gilt als Konflikt (kein Raten)');
  assert.equal(m.dateiLesbar, null, 'Dialog zeigt „unbekannt" statt zu raten/crashen');
});

test('[D43-E5] Modell: nur interner Stand / nur Datei → kein Dialog', () => {
  const { V } = hosted();
  assert.equal(V.standKonfliktModell(null, { gespeichert_am: 'T' }).grund, 'nur-datei');
  assert.equal(V.standKonfliktModell({ gespeichert_am: 'T' }, null).grund, 'nur-intern');
});

test('[D43-E5] Wahl „Gerät": interner Stand wird Wahrheit, Datei unberührt', async () => {
  const k = hosted();
  await k.V.depotAnlegen(PW);
  k.V.getData().sektoren.identity = { givenName: 'GeraetStand' };
  await k.V.depotInIdbSichern();                       // interner Stand = GeraetStand
  // Datei-Stand (gleiche Session, anderer Inhalt, andere Marke)
  k.V.getData().sektoren.identity = { givenName: 'DateiStand' };
  const fileU = await k.V.depotSerialisieren();
  fileU.gespeichert_am = '2026-06-11T08:00:00.000Z';

  await k.V.konfliktWaehleGeraet(PW);
  assert.equal(k.V.getData().sektoren.identity.givenName, 'GeraetStand', 'interner Stand geladen');
  assert.equal(fileU.gespeichert_am, '2026-06-11T08:00:00.000Z', 'Datei-Objekt unberührt');
  // IDB unverändert: frisch laden zeigt weiter GeraetStand.
  const k2 = hosted(createIdbMock({ _dbs: k.mock._dbs }));
  await k2.V.depotAusIdbLaden(PW);
  assert.equal(k2.V.getData().sektoren.identity.givenName, 'GeraetStand', 'IDB-Stand unverändert');
});

test('[D43-E5] Wahl „Datei": Datei-Inhalt wird neuer interner Stand, Datei unberührt', async () => {
  const k = hosted();
  await k.V.depotAnlegen(PW);
  k.V.getData().sektoren.identity = { givenName: 'GeraetStand' };
  await k.V.depotInIdbSichern();
  k.V.getData().sektoren.identity = { givenName: 'DateiStand' };
  const fileU = await k.V.depotSerialisieren();
  fileU.gespeichert_am = '2026-06-13T09:00:00.000Z';

  await k.V.konfliktWaehleDatei(fileU, PW);
  assert.equal(k.V.getData().sektoren.identity.givenName, 'DateiStand', 'Datei-Inhalt geladen');
  assert.equal(fileU.gespeichert_am, '2026-06-13T09:00:00.000Z', 'Datei-Objekt unberührt (nur gelesen)');
  // IDB ist jetzt der Datei-Stand.
  const k2 = hosted(createIdbMock({ _dbs: k.mock._dbs }));
  await k2.V.depotAusIdbLaden(PW);
  assert.equal(k2.V.getData().sektoren.identity.givenName, 'DateiStand', 'interner Stand = Datei');
});

test('[D43-E5] Datei-Format: gespeichert_am Klartext-Geschwister; gleich-Erkennung end-to-end', async () => {
  let captured = null;
  function CapBlob(parts) { captured = parts && parts[0]; }
  const mock = createIdbMock();
  const k = ladeKern({ indexedDB: mock, location: HOSTED, Blob: CapBlob });
  await k.V.depotAnlegen(PW);
  k.V.getData().sektoren.identity = { givenName: 'Sichern' };
  const ts = await k.V.depotInIdbSichern();            // interne Marke gesetzt
  const weg = await k.V.depotHerunterladen();          // Datei-Export (Stand unverändert/clean)
  assert.equal(weg, 'download');
  // U2-ADR-043: die Download-Datei trägt jetzt die Magic-Kennung am Anfang; Inneres = unverändert der v3-Umschlag.
  assert.ok(String(captured).startsWith('VIVODEPOT'), 'Download trägt die Magic-Kennung (U2-ADR-043)');
  const geschält = k.V.magicStrippen(captured);
  assert.equal(geschält.magic, true, 'Magic erkannt'); assert.equal(geschält.version, 1);
  const fileObj = JSON.parse(geschält.json);
  // A345: das Innere ist der Umschlag, den der Kern schreibt — seit dem Schnitt v4.
  // Geprüft wird, dass die Magic-Kennung ihn unverändert umhüllt, nicht seine Generation.
  assert.equal(fileObj.kryptoVersion, k.V.CRYPTO_VERSION_ZERFALL, 'Umschlag-Inneres unverändert durchgereicht');
  assert.equal(fileObj.gespeichert_am, ts, 'Datei trägt dieselbe Klartext-Marke wie der interne Stand');
  assert.ok(fileObj.einheiten && Object.keys(fileObj.einheiten).length > 0,
    'Chiffrat vorhanden — die Marke liegt NEBEN den Feld-Einheiten, nicht in ihnen');

  // Gleiche Marke intern wie in der Datei → Boot erkennt „gleich" → kein Dialog.
  const internMeta = await k.V.internerStandMeta();
  assert.equal(k.V.standKonfliktModell(internMeta, fileObj).grund, 'gleich', 'kein Konflikt bei gleichem Stand');
});
