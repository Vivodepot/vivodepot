'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Beziehungscode beim Anlegen eines Sub-Depots (05.11.2026; U2-ADR-079)
   ────────────────────────────────────────────────────────────────────────────
   Die Website sagt, die Beziehung zur vertretenen Person werde „mit einem internationalen Beziehungscode hinterlegt“.
   Gemessen am Kern vor diesem Commit: `subDepotAnlegen` setzte `beziehungZu: null` und nahm keinen Code an; gefragt wurde
   erst am delegierten IPS-Export, und die Wahl dort ging verloren — beim nächsten Export stand wieder nichts vorgewählt.

   Jetzt: der Anlegen-Dialog fragt die Beziehung (Codes aus BEZIEHUNGS_CODES, ohne OTH), `subDepotAnlegen` legt sie in den
   versiegelten Inhalt (wie die Vertretungsgrundlage: eine Aussage über einen Menschen, nicht im Klartext des Ankers), der
   Export wählt sie vor, und eine Wahl am Export wird gespeichert.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'Beziehung-Anker-2026!';
const SUB_PW = 'Beziehung-Sub-2026!';

async function mitSub(extra) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Mutter');
  const e = await V.subDepotAnlegen(Object.assign({ vorname: 'Lea', verwaltungsTyp: 'verwaltet' }, extra || {}), SUB_PW);
  return { V, e };
}
async function geoeffnet(V, e) {
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  return V._beziehungZuLesen(e);
}
// Was ein Leser des Ankers ohne das Sub-Passwort sieht: der Eintrag ohne den versiegelten Umschlag.
function klartext(e) { const k = Object.assign({}, e); delete k.umschlag; return JSON.stringify(k); }

test('[Beziehung·Anlegen] eine beim Anlegen gewählte Beziehung steht im versiegelten Inhalt, nicht im Klartext', async () => {
  const { V, e } = await mitSub({ beziehungZu: 'CHILD' });
  assert.equal(await geoeffnet(V, e), 'CHILD', 'nach dem Öffnen ist die Beziehung da');
  assert.ok(!klartext(e).includes('CHILD'), 'der Anker zeigt sie ohne Sub-Passwort nicht');
  assert.equal(e.beziehungZu, null);
});

test('[Beziehung·Anlegen] ohne Wahl, mit OTH oder einem fremden Wert bleibt sie leer', async () => {
  for (const wert of [undefined, '', 'OTH', 'XYZ', 'toString']) {
    const { V, e } = await mitSub({ beziehungZu: wert });
    assert.equal(await geoeffnet(V, e), '', 'Wert ' + String(wert));
  }
});

test('[Beziehung·Export] der delegierte IPS-Export wählt die gespeicherte Beziehung vor', async () => {
  const { V, e } = await mitSub({ beziehungZu: 'CHILD' });
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  const gesehen = [];
  V.ui.modal = (opt) => { gesehen.push(opt); return () => {}; };
  V.flowDelegationsExportEntscheid(() => {});
  assert.equal(gesehen.length, 1);
  assert.match(gesehen[0].koerperHTML, /<option value="CHILD" selected>/, 'die gespeicherte Beziehung ist vorgewählt');
  assert.equal((gesehen[0].koerperHTML.match(/ selected>/g) || []).length, 1, 'genau eine Vorwahl');
});

test('[Beziehung·Export] eine Wahl am Export wird gespeichert und bleibt nach dem Neu-Versiegeln', async () => {
  const { V, e } = await mitSub();
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  assert.equal(V.subDepotBeziehungSetzen(e.depotUUID, 'GRNDCHILD'), true);
  assert.equal(V._beziehungZuLesen(e), 'GRNDCHILD');
  assert.equal(V.subDepotBeziehungSetzen(e.depotUUID, 'OTH'), false, 'OTH ist keine Beziehung');
  assert.equal(V.subDepotBeziehungSetzen(e.depotUUID, 'XYZ'), false);
  await V.subDepotNeuVersiegeln(e.depotUUID);
  V.subDepotVertrauenSchliessen(e.depotUUID);
  assert.equal(V._beziehungZuLesen(e), '', 'geschlossen ist sie nicht lesbar');
  assert.equal(await geoeffnet(V, e), 'GRNDCHILD', 'wieder geöffnet ist sie da');
});

test('[Beziehung·Export] ein Bestandswert am Eintrag wird weiter gelesen', async () => {
  const { V, e } = await mitSub();
  e.beziehungZu = 'SPS';
  assert.equal(V._beziehungZuLesen(e), 'SPS');
  e.beziehungZu = 'OTH';
  assert.equal(V._beziehungZuLesen(e), '');
});

test('[Beziehung·Dialog] der Anlegen-Dialog eines Sub-Depots fragt die Beziehung und reicht sie an subDepotAnlegen', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const rumpf = (name) => { const i = kern.indexOf('\nfunction ' + name + '('); assert.ok(i > 0, name); return kern.slice(i, kern.indexOf('\n}\n', i)); };
  const dialog = rumpf('_depotIdentitaetUndPasswortAbfragen');
  assert.match(dialog, /\(sub \? [^\n]*id="sub-beziehung"/, 'die Auswahl steht nur im Sub-Zweig');
  assert.match(dialog, /_beziehungsAuswahlFuellen\(document\.getElementById\('sub-beziehung'\)/, 'die Auswahl wird gefüllt');
  assert.match(dialog, /onFertig\(\{[^}]*\bbeziehung\b/, 'der Dialog reicht die Beziehung an onFertig');
  assert.match(rumpf('flowSubDepotAnlegen'), /beziehungZu: beziehung/, 'flowSubDepotAnlegen gibt sie an subDepotAnlegen');
});

test('[Beziehung·Dialog] die Auswahl trägt jeden Code außer OTH, leer zuerst, die gespeicherte vorgewählt', async () => {
  const { V } = await mitSub();
  const optionen = [];
  V._beziehungsAuswahlFuellen({ appendChild: (o) => optionen.push(o) }, 'SIB');
  assert.equal(optionen[0].value, '');
  assert.deepEqual(optionen.slice(1).map((o) => o.value), Object.keys(V.BEZIEHUNGS_CODES).filter((c) => c !== 'OTH'));
  assert.equal(optionen.filter((o) => o.selected === true).map((o) => o.value).join(), 'SIB');
  assert.equal(optionen[1].textContent, V.BEZIEHUNGS_CODES[optionen[1].value].displayDe, 'der Text geht als textContent hinein');
});

/* Rot-Beweis: der Kern vor diesem Commit nahm `beziehungZu` nicht an. Nachgestellt mit einem Eintrag, dessen Beziehung nie
   gespeichert wurde — die Prüfung der ersten Probe fällt dort. */
test('[Beziehung·Rot-Beweis] eine nicht gespeicherte Beziehung fällt in der Anlegen-Probe', async () => {
  const { V, e } = await mitSub();   // wie früher: der Code geht nirgends hin
  const gelesen = await geoeffnet(V, e);
  assert.throws(() => assert.equal(gelesen, 'CHILD'), /Expected values to be strictly equal/);
});
