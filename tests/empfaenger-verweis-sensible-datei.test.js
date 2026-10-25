'use strict';
/* Befund VERWEIS-ZIEHT-SENSIBLE-DATEI (21.10.2026, VD-SEC-029, HOCH): ein Verweisfeld (`ref:mappe`) zog die Datei, auf die es zeigt,
   auch eine sensibel markierte, in den engen Zuschnitt eines Empfängerkreises (verweisZieleNachziehen in empfaengerZuschnittModell).
   Gemessen an einem Kreis `[bereich:identity]` mit dem Profilfoto als Verweis. Seitdem entfernt der Zuschnitt an seinem Ausgang
   jede sensible Datei, sobald kein weiter Baustein im Kreis ist. Die Probe gilt der Klasse: JEDER enge Baustein, bei einem Depot,
   in dem jeder Bereich auf die sensible Datei verweist. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'Verweis-Sensibel-2026!';
const KERN = path.join(__dirname, '..', 'vivodepot.html');
const AUSGANG_ZEILE = '    subset.mappe = subset.mappe.filter((m) => !(m && m.sensibel === true));\n';
const ids = (liste) => (Array.isArray(liste) ? liste.map((e) => e.id).sort() : []);

async function depotMitVerweisen(opts) {
  const { V } = ladeKern(opts);
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.mappe = [
    { id: 'm-psych', beschriftung: 'MARKER-SENSIBEL', bereich: 'health', mime: 'application/pdf', inhalt: 'data:application/pdf;base64,AA==', sensibel: true },
    { id: 'm-offen', beschriftung: 'MARKER-OFFEN', bereich: 'health', mime: 'application/pdf', inhalt: 'data:application/pdf;base64,AA==', sensibel: false },
  ];
  for (const s of V.bereicheAlle()) {
    d.sektoren[s.id] = Object.assign({}, d.sektoren[s.id], { verweisAufDatei: { ref: 'm-psych' }, verweisAufOffen: { ref: 'm-offen' } });
  }
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { givenName: 'Ilse', profilePhotoCoverPage: { ref: 'm-psych' } });
  V.setData(d);
  return V;
}
const zuschnitt = (V, bausteine) => V.empfaengerZuschnittModell({ id: 'k-' + bausteine.join('-'), name: 'k', bausteine });
const engeMitSensiblerDatei = (V) => V.empfaengerBausteineAlle().filter((b) => !b.weit)
  .filter((b) => ids(zuschnitt(V, [b.id]).mappe).includes('m-psych')).map((b) => b.id);

test('[Verweis·Sensible-Datei·Klasse] kein enger Baustein zieht über einen Verweis eine sensible Datei nach', async () => {
  const V = await depotMitVerweisen();
  assert.ok(V.empfaengerBausteineAlle().filter((b) => !b.weit).length >= 10, 'Kontrolle: es gibt enge Bausteine');
  assert.deepEqual(engeMitSensiblerDatei(V), []);
});

test('[Verweis·Sensible-Datei] eine offene Datei geht über den Verweis weiter mit, eine sensible mit dem weiten Baustein', async () => {
  const V = await depotMitVerweisen();
  const eng = zuschnitt(V, ['bereich:identity']);
  assert.ok(ids(eng.mappe).includes('m-offen'), 'Kontrolle: der Verweis zieht die offene Datei nach');
  assert.deepEqual(eng.sektoren.identity.profilePhotoCoverPage, { ref: 'm-psych' }, 'der Verweis selbst bleibt stehen');
  const weit = V.empfaengerBausteineAlle().find((b) => b.weit);
  assert.ok(weit, 'Kontrolle: es gibt einen weiten Baustein');
  assert.ok(ids(zuschnitt(V, [weit.id]).mappe).includes('m-psych'), 'weit heißt weit (U2-ADR-156 §3)');
});

test('[Verweis·Sensible-Datei·Rot-Beweis] ohne den Filter am Ausgang zieht ein Verweis die sensible Datei in den engen Zuschnitt', async () => {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.equal(html.split(AUSGANG_ZEILE).length, 2, 'der Filter am Ausgang steht nicht mehr an seinem Ort, die Probe muss nachgezogen werden');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verweis-sensibel-'));
  try {
    const ohne = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(ohne, html.replace(AUSGANG_ZEILE, ''));
    const V = await depotMitVerweisen({ htmlPfad: ohne, backen: true });
    assert.ok(engeMitSensiblerDatei(V).includes('bereich:identity'), 'ohne Filter sieht die Probe den Befund');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
