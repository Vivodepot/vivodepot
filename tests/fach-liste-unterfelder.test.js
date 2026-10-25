'use strict';
/* Befund FACH-LISTE-UNTERFELDER-UNGEFILTERT (20.10.2026, HOCH): Das Fach in der eigenen Depot-Datei bekommt aus dem Zuschnitt
   (empfaengerZuschnittModell) nur die NAMEN der Einheiten und öffnet damit die vollen Einheiten des Depots. Der Zuschnitt hält ein
   geschütztes Unterfeld einer Liste zurück (die IBAN einer Kontenliste) oder eines, das die Person zurückgenommen hat; das Fach
   öffnete trotzdem die ganze Liste. Gemessen am Kern von v937: das Fach, mit seinem Passwort geöffnet, trug beides.
   Jetzt kommt eine Bereichsfeld-Einheit, deren Wert im Zuschnitt vom vollen Wert abweicht, nicht ins Fach (_empfaengerFaecherFuerSchreibweg):
   lieber fehlt die Liste dort, als dass Zurückgehaltenes mitgeht. Die Richtung „zu wenig“ bleibt offen (AUSGABE-LISTE-UNTERFELDER-
   STUMM-GESTRICHEN); eine eigene, gefilterte Einheit für das Fach wäre eine Änderung am Zerfall. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'Fach-Liste-Inhaberin-2026!';
const PW_FACH = 'Fach-Liste-Kreis-2026!';
const w = (o) => JSON.stringify(o);
const KERN = path.join(__dirname, '..', 'vivodepot.html');
const FILTER_ZEILE = "        .filter((e) => _kanonischJSON(e.wert) === voll.get(e.name) || (FACH_DEFINITIONSEINHEITEN.includes(e.name) && voll.has(e.name)))\n";

async function depotMitFach(fuellen, bausteine, opts) {
  const { V } = ladeKern(opts);
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Anna', familyName: 'Muster' };
  fuellen(d);
  V.setData(d);
  await V.empfaengerkreisSetzen({ name: 'Vertretung', bausteine });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH);
  const datei = JSON.parse(JSON.stringify(await V.depotSerialisierenV4()));
  return { V, datei };
}

async function oeffnen(datei, pw, opts) {
  const { V } = ladeKern(opts);
  await V.depotLaden(JSON.parse(JSON.stringify(datei)), pw);
  return { V, text: w(V.getData()) };
}

const konten = (d) => { d.sektoren.finance = { accounts: [{ bank: 'MARKER-FACH-BANK', iban: 'MARKER-FACH-IBAN' }], taxSoftware: 'MARKER-FACH-STEUER' }; };

test('[Fach·Liste·Unterfeld] das Fach eines markierten Bereichs trägt das ab Werk geschützte Unterfeld einer Liste nicht', async () => {
  const { V, datei } = await depotMitFach(konten, ['bereich:finance']);
  assert.doesNotMatch(w(V.empfaengerZuschnittModell(V.empfaengerkreiseListe()[0])), /MARKER-FACH-IBAN/, 'Vorbedingung: das Modell hält die IBAN zurück');
  const inhaberin = await oeffnen(datei, PW);
  assert.match(inhaberin.text, /MARKER-FACH-IBAN/, 'Positivkontrolle: die Inhaberin sieht die IBAN');
  const fach = await oeffnen(datei, PW_FACH);
  assert.doesNotMatch(fach.text, /MARKER-FACH-IBAN/, 'das Fach trägt das geschützte Unterfeld der Liste');
});

test('[Fach·Liste·Unterfeld] ein von der Person zurückgenommenes Unterfeld steht nicht im Fach', async () => {
  const { V, datei } = await depotMitFach((d) => {
    d.sektoren.advanceCare = { provisionInstruments: [{ instrument: 'living-will', storageLocation: 'MARKER-FACH-ABLAGE', dateOfLastChange: '2026-01-01' }] };
    d.sensibelFelder = { advanceCare: { 'liste:provisionInstruments:living-will:storageLocation': true } };
  }, ['bereich:advanceCare']);
  assert.doesNotMatch(w(V.empfaengerZuschnittModell(V.empfaengerkreiseListe()[0])), /MARKER-FACH-ABLAGE/, 'Vorbedingung: das Modell hält das Unterfeld zurück');
  const fach = await oeffnen(datei, PW_FACH);
  assert.doesNotMatch(fach.text, /MARKER-FACH-ABLAGE/, 'das Fach trägt das zurückgenommene Unterfeld');
});

test('[Fach·Liste·Unterfeld] was der Zuschnitt unverändert gibt, steht weiter im Fach', async () => {
  const { datei } = await depotMitFach(konten, ['bereich:finance']);
  const fach = await oeffnen(datei, PW_FACH);
  assert.match(fach.text, /MARKER-FACH-STEUER/, 'ein Feld ohne Zurückgehaltenes geht weiter ins Fach');
});

test('[Fach·Liste·Unterfeld·Rot-Beweis] ohne die Prüfung auf abweichende Einheiten trägt das Fach die IBAN', async () => {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.equal(html.split(FILTER_ZEILE).length, 2, 'die Prüfung steht nicht mehr an ihrem Ort — die Probe muss nachgezogen werden');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fach-liste-'));
  try {
    const ohne = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(ohne, html.replace(FILTER_ZEILE, ''));
    const { datei } = await depotMitFach(konten, ['bereich:finance'], { htmlPfad: ohne, backen: true });
    const fach = await oeffnen(datei, PW_FACH, { htmlPfad: ohne, backen: true });
    assert.match(fach.text, /MARKER-FACH-IBAN/, 'ohne die Prüfung öffnet das Fach die ganze Liste — die Probe sieht den Befund');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Der Wächter gegen die Klasse: tools/ausgabe-listen-senken-pruefen.js zählt das Fach als Senke (FACH_SENKEN). */
const SENKEN = require('../tools/ausgabe-listen-senken-pruefen.js');

test('[Ausgabe-Senken · Fach] das Fach steht als Senke im Wächter und ruft den abgedeckten Zuschnitt', () => {
  const r = SENKEN.pruefen(fs.readFileSync(KERN, 'utf8'));
  assert.ok(r.senken.includes('_empfaengerFaecherFuerSchreibweg'), 'das Fach ist als Senke erhoben');
  assert.deepEqual(r.probleme, []);
});

test('[Ausgabe-Senken · Fach · Rot-Beweis] ein Fach, das den Zuschnitt umgeht, ist rot', () => {
  const html = fs.readFileSync(KERN, 'utf8');
  const ALT = '      const zuschnitt = empfaengerZuschnittModell(k, quelle);\n';
  assert.equal(html.split(ALT).length, 2, 'Vorbedingung: das Fach ruft den Zuschnitt an seinem Ort');
  const r = SENKEN.pruefen(html.replace(ALT, '      const zuschnitt = quelle;\n'));
  assert.ok(r.probleme.some((p) => p.includes('Zuschnitt umgangen') && p.includes('_empfaengerFaecherFuerSchreibweg')), 'rot: ' + r.probleme.join(' | '));
  const weg = SENKEN.pruefen(html.replace('function _empfaengerFaecherFuerSchreibweg(', 'function _faecherUmbenannt('));
  assert.ok(weg.probleme.some((p) => p.includes('nicht mehr im Kern')), 'rot, wenn die Senke umbenannt wird: ' + weg.probleme.join(' | '));
});
