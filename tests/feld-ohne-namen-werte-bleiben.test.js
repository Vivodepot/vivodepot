'use strict';
/* feld-ohne-namen-werte-bleiben.test.js — abgewiesen wird nur die Felddefinition, nie ein Wert (07.10.2026)
   Seit dem 07.10.2026 weist die Einlassprüfung ein Feld ohne Namen ab, und die Anzeige zeigt kein namenloses Feld mehr
   (Entscheidung „keine technischen Markierungen in der Benutzersicht“). Ein Depot kann aber schon Werte unter einer solchen Kennung
   tragen (Altdatei, früher eingelassene Erweiterung). Zusicherung: Diese Werte gehen beim Öffnen, Speichern und erneuten Öffnen nicht
   verloren, bleiben im Export und sind im aktiven Bereich sichtbar und bearbeitbar: am Ende im Abschnitt mit dem Sammelnamen aus dem
   Textsatz („Weitere Felder“), nie unter der Kennung, nie mit einem Platzhalter. Ein Wert, den die Halterin nicht sieht, aber weitergibt,
   wäre ein verstecktes Datum in ihrem eigenen Depot. Rot-Beweise: ein verlorener Wert und ein unsichtbarer Wert fallen auf. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'feld-ohne-namen-pw-1';
const KENNUNG = 'tpl_probe_ohne_namen';
const WERT = 'Wert 4711 bleibt';

const wertDa = (d) => !!(d && d.sektoren && d.sektoren.finance && d.sektoren.finance[KENNUNG] === WERT);

async function rundlauf(V) {
  const umschlag = await V.depotSerialisieren();
  const k = ladeKern();
  await k.V.depotLaden(umschlag, PW);
  return k;
}

test('[Feld ohne Namen] der Wert übersteht Öffnen, Speichern und erneutes Öffnen, bleibt im Export und zeigt keine Kennung', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  if (!Array.isArray(d.feldDefinitionen)) d.feldDefinitionen = [];
  d.feldDefinitionen.push({ sektorId: 'finance', feldId: KENNUNG, typ: 'text' });   // Altbestand: Definition ohne Namen
  d.sektoren.finance = Object.assign({}, d.sektoren.finance, { [KENNUNG]: WERT });
  const k2 = await rundlauf(V);
  assert.ok(wertDa(k2.V.getData()), 'nach dem ersten Öffnen da');
  const k3 = await rundlauf(k2.V);
  assert.ok(wertDa(k3.V.getData()), 'nach Speichern und erneutem Öffnen da');
  assert.ok(JSON.stringify(k3.V.vollExportJSON()).includes(WERT), 'im Export');
  k3.V.akteurSelbstErklaeren('Maria');   // mit Schreibrecht: der Wert steht als Eingabe da, bearbeitbar wie jeder andere
  k3.V.oeffneSektor('finance');
  const html = k3.document.getElementById('content').innerHTML;
  assert.ok(html.length > 200, 'Voraussetzung: der Bereich wurde gezeichnet');
  assert.ok(!/>\s*undefined\s*</.test(html), 'kein „undefined“ als Name');
  assert.ok(sichtbar(html, k3.V.STRINGS.templateAbschnittDefault), 'der Wert steht im Bereich, als Eingabe, unter dem Sammelnamen');
  const sichtbarerText = html.replace(/<[^>]+>/g, ' ');
  assert.ok(!sichtbarerText.includes(KENNUNG), 'die Kennung steht nicht im sichtbaren Text');
});

/* Sichtbar heißt: im gezeichneten Bereich steht ein Eingabefeld mit genau diesem Wert, und der Sammelname steht als Text da. */
function sichtbar(html, sammelname) {
  return html.includes('value="' + WERT + '"') && html.replace(/<[^>]+>/g, ' ').includes(sammelname);
}

test('[Feld ohne Namen·Rot-Beweis] ein unsichtbarer Wert fällt auf', () => {
  assert.equal(sichtbar('<section><h3>Weitere Felder</h3></section>', 'Weitere Felder'), false, 'ohne Eingabe mit dem Wert ist er nicht sichtbar');
  assert.equal(sichtbar('<h3>Weitere Felder</h3><input value="' + WERT + '">', 'Weitere Felder'), true);
});

test('[Feld ohne Namen·Rot-Beweis] ein verlorener Wert fällt auf', () => {
  assert.equal(wertDa({ sektoren: { finance: {} } }), false);
  assert.equal(wertDa({ sektoren: { finance: { [KENNUNG]: WERT } } }), true);
});
