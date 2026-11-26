'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Über ein Fach geöffnet heißt lesen, auch am Anker (23.11.2026, Befund FACH-SITZUNG-SCHREIBT-INHABER-DATEI, HOCH)
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-432 sagt zu: über ein Fach geöffnet ist jedes Depot nur lesend. Durchgesetzt war das nur im Sub-Pfad
   (_subNurLesendAktiv aus subKontextBetreten). Öffnete ein Empfänger die Datei der Inhaberin direkt mit seinem
   Fach-Passwort (depotLaden, auch aus dem Gerätespeicher), setzte der Kern nur „Schlüssel ungewiss“. Der Empfänger
   konnte bearbeiten; Autosave schrieb seinen Ausschnitt unter dem Fach-Passwort in den Datensatz der Inhaberin, und eine
   Sicherung mit gemerktem Ort in ihre Datei. Danach öffnete ihr eigenes Passwort ihr Depot nicht mehr.

   Die Probe spielt das an einem geteilten Gerät durch: die Inhaberin legt an, richtet ein Fach ein, der Stand liegt im
   Gerätespeicher; der Empfänger öffnet ihn dort mit dem Fach-Passwort, ändert etwas, die stille Sicherung läuft; danach
   öffnet die Inhaberin mit ihrem Passwort ihr ganzes Depot. Dazu das Bearbeitungstor, die Sicherung in die Datei und die
   Oberfläche (keine Bearbeitung angeboten). Gegenprobe: die Inhaberin selbst schreibt weiter.
   Rot-Beweis: dasselbe ohne die Marke im Tor und in darfBearbeiten; dann bietet die Oberfläche Bearbeitung an und der
   Empfänger überschreibt den Stand der Inhaberin. Dieselbe Senke für jeden Nur-lesen-Zustand: tests/nur-lesen-senke-tabelle.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const GEHOSTET = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const PW_INHABERIN = 'Inhaberin-Probe-2026!';
const PW_FACH = 'Fach-Probe-2026-Gesundheit!';

async function ablauf(opts) {
  const basis = createIdbMock();
  const k0 = ladeKern({ indexedDB: basis, location: GEHOSTET, ...(opts || {}) });
  const V0 = k0.V;
  await V0.depotAnlegen(PW_INHABERIN);
  V0.akteurSelbstErklaeren('Gerda Beispiel');
  const d = V0.getData();
  d.sektoren.health = { ongoingTreatmentNext: 'WERT-GESUNDHEIT' };
  d.sensibelFelder = { health: { ongoingTreatmentNext: false } };
  d.sektoren.finance = { companyPensionScheme: 'WERT-FINANZEN-DER-INHABERIN' };
  V0.setData(d);
  await V0.empfaengerkreisSetzen({ name: 'Anna Gesundheit', bausteine: ['bereich:health'] });
  await V0.empfaengerkreisFachEinrichten(V0.empfaengerkreiseListe()[0], PW_FACH);
  V0.markiereUngespeichert(1);
  await V0._internAutoSpeichernAbschluss();

  const E = ladeKern({ indexedDB: createIdbMock({ _dbs: basis._dbs }), location: GEHOSTET, ...(opts || {}) }).V;
  assert.ok(await E.depotAusIdbLaden(PW_FACH), 'das Fach-Passwort öffnet den Stand im Gerätespeicher');
  assert.equal(E.getData().sektoren.finance && E.getData().sektoren.finance.companyPensionScheme, undefined, 'der Empfänger sieht nur sein Fach');
  // Mit Sitzungs-Akteur, wie in der Oberfläche: sonst wäre darfBearbeiten() schon wegen des fehlenden Akteurs false und die Prüfung leer.
  E.akteurSelbstErklaeren('Anna Gesundheit');

  // Der Empfänger ändert etwas, wie ein Feld-Commit in der Oberfläche, und die stille Sicherung läuft.
  let tor = null;
  try { E.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'VOM-EMPFAENGER'); } catch (e) { tor = e; }
  const e2 = E.getData();
  e2.sektoren.health = { ...(e2.sektoren.health || {}), ongoingTreatmentNext: 'VOM-EMPFAENGER-DIREKT' };
  E.markiereUngespeichert(1);
  await E._internAutoSpeichernAbschluss();
  let serialisiert = null, sicherungFehler = null;
  try { serialisiert = await E.depotSerialisieren(); } catch (e) { sicherungFehler = e; }

  // Die Inhaberin öffnet danach mit ihrem Passwort.
  const I = ladeKern({ indexedDB: createIdbMock({ _dbs: basis._dbs }), location: GEHOSTET, ...(opts || {}) }).V;
  let inhaberinOeffnet = null, inhaberinFehler = null;
  try { inhaberinOeffnet = await I.depotAusIdbLaden(PW_INHABERIN); } catch (e) { inhaberinFehler = e; }
  const iData = inhaberinOeffnet ? I.getData() : null;
  return { tor, serialisiert, sicherungFehler, inhaberinOeffnet, inhaberinFehler, iData, E, I };
}

test('[Fach am Anker] über ein Fach geöffnet: Bearbeitungstor sperrt, keine Sicherung in die Datei, keine Bearbeitung angeboten', async () => {
  const r = await ablauf();
  assert.ok(r.tor && r.tor.code === 'fach-nur-lesen', 'das Bearbeitungstor ließ den Empfänger schreiben: ' + (r.tor && r.tor.code));
  assert.ok(r.sicherungFehler && !r.serialisiert, 'die Sicherung in die Datei lief über ein Fach');
  assert.equal(r.E.Modus.darfBearbeiten(), false, 'die Oberfläche bietet über ein Fach Bearbeitung an');
});

test('[Fach am Anker] nach der Sitzung des Empfängers öffnet die Inhaberin ihr ganzes Depot mit ihrem Passwort', async () => {
  const r = await ablauf();
  assert.ok(r.inhaberinOeffnet, 'die Inhaberin öffnet ihr Depot nicht mehr: ' + (r.inhaberinFehler && (r.inhaberinFehler.code || r.inhaberinFehler.message)));
  assert.equal(r.iData.sektoren.finance.companyPensionScheme, 'WERT-FINANZEN-DER-INHABERIN', 'ihre Angaben außerhalb des Fachs fehlen');
  assert.equal(r.iData.sektoren.health.ongoingTreatmentNext, 'WERT-GESUNDHEIT', 'der Empfänger hat ihren Stand verändert');
  assert.ok(Array.isArray(r.iData.empfaengerkreise) && r.iData.empfaengerkreise.length === 1, 'das Fach ist verschwunden');
});

test('[Fach am Anker·Gegenprobe] die Inhaberin selbst schreibt und sichert weiter', async () => {
  const r = await ablauf();
  const I = r.I;
  I.akteurSelbstErklaeren('Gerda Beispiel');
  I.sektorFeldSetzen('finance', 'companyPensionScheme', 'NEU-VON-DER-INHABERIN');
  assert.ok(await I.depotSerialisieren(), 'die Inhaberin kann sichern');
});

test('[Fach am Anker·Rot-Beweis] ohne die Marke im Tor überschreibt der Empfänger den Stand der Inhaberin', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  const anker = ' || _ankerUeberFach; }';
  assert.ok(quelle.includes('function _ankerNurLesen() {') && quelle.includes(anker), 'Rot-Beweis ohne Anker: die Marke steht nicht in _ankerNurLesen');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'fach-anker-'));
  const pfad = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(pfad, quelle.replace(anker, '; }').replace('&& !_ankerUeberFachAktiv()', ''));
  try {
    const r = await ablauf({ htmlPfad: pfad, backen: true });
    assert.equal(r.E.Modus.darfBearbeiten(), true, 'ohne die Marke hätte die Oberfläche Bearbeitung anbieten müssen');
    const ueberschrieben = !r.inhaberinOeffnet
      || r.iData.sektoren.finance === undefined || (r.iData.sektoren.finance || {}).companyPensionScheme !== 'WERT-FINANZEN-DER-INHABERIN';
    assert.ok(ueberschrieben, 'ohne die Marke hätte der Empfänger den Stand der Inhaberin überschreiben müssen');
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});
