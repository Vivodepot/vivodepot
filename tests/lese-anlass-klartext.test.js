'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Lese-App liest den herausgegebenen Datensatz als Klartext-Datei
   ────────────────────────────────────────────────────────────────────────
   vivodepot-anlass@1 kam bisher nur im verschlüsselten Antwort-Umschlag bei der
   Lese-App an. Die Klartext-Datei aus Anlass und Zusammenstellung fiel in
   `erkenneFormat` auf „unbekannt“.

   Rundlauf: der Kern gibt den Datensatz aus, die Lese-App öffnet genau diese
   Datei, und jeder Wert steht auf dem Blatt. Dazu, was das Blatt sagen muss:
   wer herausgegeben hat, was fehlt und was zurückgehalten wurde.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

async function ausgabeAusDemKern() {
  const { V } = ladeKern();
  await V.depotAnlegen('lese-anlass-pw');
  V.akteurSelbstErklaeren('Hedwig Brandt');
  const setze = (k, w) => { const s = V.kennungZuSelektor(k); V.sektorFeldSetzen(s.sektorId, s.feldId, w); };
  setze('identity.givenName', 'Hedwig');
  setze('identity.familyName', 'Brandt');
  setze('health.healthInsurance', { override: 'AOK Bayern' });
  setze('health.insuranceNumber', 'A123456780');
  setze('health.medicationOngoing', [{ text: 'Metformin 500' }]);
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', storageLocation: 'Ordner im Wohnzimmer' });
  const ds = V.zusammenstellungDatensatz(
    ['identity.givenName', 'identity.familyName', 'health.healthInsurance', 'health.insuranceNumber',
      'health.medicationOngoing', 'advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation', 'identity.birthDate'],
    { id: 'heimaufnahme', titel: 'Heimaufnahme' }, { sensibel: true });
  return JSON.parse(JSON.stringify(ds, null, 2));   // genau die Datei, die hinausgeht
}

function blatt(L, document, obj) {
  L.verarbeiteDatei(obj);
  const app = document.getElementById('app');
  return String((app && app.innerHTML) || '');
}

test('[Rundlauf] Kern gibt aus, Lese-App öffnet die Klartext-Datei: jeder Wert steht auf dem Blatt', async () => {
  const ds = await ausgabeAusDemKern();
  assert.ok(ds.felder.length >= 6, 'Voraussetzung: der Datensatz trägt die Angaben');
  const { V: L, document } = ladeLesen();
  assert.equal(L.erkenneFormat(ds), 'anlass');
  const html = blatt(L, document, ds);
  assert.match(html, /id="anlass-blatt"/);
  assert.match(html, /Heimaufnahme/);
  for (const f of ds.felder) {
    assert.ok(html.includes(L.escapeHTML(String(f.wert))), 'fehlt auf dem Blatt: ' + f.label + ' = ' + f.wert);
  }
  assert.match(html, /id="anlass-fehlend"/, 'was fehlt, wird genannt');
});

test('[Vertretung] wer in Vertretung herausgab, steht auf dem Blatt; ohne Vertretung wird auch das gesagt', async () => {
  const ds = await ausgabeAusDemKern();
  const { V: L, document } = ladeLesen();
  assert.match(blatt(L, document, ds), /Herausgegeben von der Person selbst/);
  const mit = Object.assign({}, ds, { vertretung: { handelnd: 'Klara Reiter', fuer: 'Hedwig Brandt', eigenschaft: 'enduring-power-of-attorney', eigenschaftText: 'Vorsorgevollmacht' } });
  const html = blatt(L, document, mit);
  assert.match(html, /id="anlass-vertretung"/);
  assert.match(html, /Klara Reiter/);
  assert.match(html, /Grundlage der Vertretung: Vorsorgevollmacht/);
});

test('[Zurückgehalten] was die Ausgabe zurückhielt, wird gezählt statt verschwiegen', async () => {
  const ds = await ausgabeAusDemKern();
  const { V: L, document } = ladeLesen();
  const html = blatt(L, document, Object.assign({}, ds, { zurueckgehalten: { sensibel: 2 } }));
  assert.match(html, /id="anlass-zurueckgehalten"/);
});

test('[Sicherheit·Rot-Beweis] ein Anführungszeichen im Feld-Label bricht nicht aus dem Attribut aus', async () => {
  const ds = await ausgabeAusDemKern();
  const boese = 'Vorname" onmouseover="alert(1)';
  const vergiftet = Object.assign({}, ds, {
    felder: ds.felder.map((f, i) => (i === 0 ? Object.assign({}, f, { label: boese }) : f)),
  });
  const { V: L, document } = ladeLesen();
  const html = blatt(L, document, vergiftet);
  assert.ok(!html.includes('" onmouseover="alert(1)'),
    'ein Label aus der Datei darf im Attribut data-anlass-feld nicht aus dem Anführungszeichen ausbrechen');
  assert.ok(html.includes(L.escapeHTML(boese)) || html.includes(boese.replace(/"/g, '&quot;')),
    'der volle Label-Text bleibt sichtbar, nur maskiert');
});

/* Drei weitere Senken derselben escapeHTML-Kopie (data-antwort-feld, data-sektor, data-situation)
   haben ihre eigene Probe in tests/lese-escape-attribut-ausbruch.test.js — die existieren schon
   vor dieser Datei und brauchen die Anlass-Feature nicht, um geprüft zu werden. Hier bleibt nur
   die Probe an der Senke, die es ohne diese Feature gar nicht gibt (data-anlass-feld). */

test('[Abgrenzung] eine spätere Fassung bleibt unbekannt; eine gesicherte Antwort bekommt das Antwort-Blatt', async () => {
  const ds = await ausgabeAusDemKern();
  const { V: L, document } = ladeLesen();
  assert.equal(L.erkenneFormat(Object.assign({}, ds, { formatKennung: 'vivodepot-anlass@2' })), 'unbekannt');
  assert.equal(L.erkenneFormat({ format: 'vivodepot-anlass', felder: [] }), 'unbekannt', 'ohne Kennung kein Vertrag');
  const antwort = Object.assign({}, ds, { anfrage: { von: 'Pflegeheim Sonnenhof', zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: 'AUF-1' } });
  const html = blatt(L, document, antwort);
  assert.match(html, /id="antwort-blatt"/);
  assert.match(html, /Pflegeheim Sonnenhof/);
});
