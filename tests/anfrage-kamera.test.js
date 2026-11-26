'use strict';
/* ANFRAGE-KAMERA (22.11.2026, U2-ADR-460 Nachtrag): die Hauptanwendung liest den QR einer Anfrage mit der Kamera. Die Kamera selbst
   prüft die E2E-Probe (tests/e2e/anfrage-kamera.spec.js, Fake-Kamera); hier stehen die Teile ohne Kamera: die Sammlung einer Serie,
   der Knopf nur mit Browser-Leser, die drei Grenzen im Quelltext. Erfundene Anfrage, wie in tests/anfrage-kompakt.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1, von: 'Pflegeheim am Beispielpark',
  zweck: 'Aufnahme in die vollstationäre Pflege', grundlage: 'Heimvertrag und Pflegeplanung',
  vorgang: 'BSP-2026-0002', gestelltAm: '2026-11-22', gueltigBis: '2099-12-31',
  felder: [
    { kennung: 'identity.givenName', zweck: 'Anrede im Aufnahmebogen', pflicht: true },
    { kennung: 'identity.familyName', zweck: 'Anrede im Aufnahmebogen', pflicht: true },
    { kennung: 'identity.birthDate', zweck: 'Abgleich mit der Pflegekasse', pflicht: true },
  ],
  antwort: { art: 'einmalpasswort', an: 'aufnahme@example.de' },
};
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Anfrage·Kamera] eine Serie wird ohne Doppel gesammelt und ergibt dieselbe Anfrage wie Einfügen', async () => {
  const { V } = ladeKern();
  const text = JSON.stringify(ANFRAGE);
  const teile = V.qrTeilePacken(text, 120).map((t) => t.rahmen);
  assert.ok(teile.length >= 2, 'die Probe braucht eine echte Serie, nicht einen Teil: ' + teile.length);
  const eingefuegt = await V.anfrageAusEingabeAsync(teile.join('\n'));
  assert.equal(eingefuegt.ok, true);

  let gesammelt = [];
  let f = await V.anfrageKameraFund(gesammelt, teile[0]);
  assert.equal(f.fertig, false);
  assert.equal(f.grund, 'unvollstaendig');
  gesammelt = f.gesammelt;
  f = await V.anfrageKameraFund(gesammelt, teile[0]);            // derselbe Rahmen ein zweites Mal vor der Kamera
  assert.equal(f.gesammelt.length, 1, 'kein Doppel');
  gesammelt = f.gesammelt;
  for (const t of teile.slice(1).reverse()) { f = await V.anfrageKameraFund(gesammelt, t); gesammelt = f.gesammelt; }
  assert.equal(f.fertig, true, 'in beliebiger Reihenfolge vollständig');
  const ausKamera = await V.anfrageAusEingabeAsync(f.text);
  assert.deepEqual(ausKamera.umschlag.anfrage, eingefuegt.umschlag.anfrage);
});

test('[Anfrage·Kamera] ein QR ohne Anfrage wird benannt, ein einzelner Anfrage-Text ist sofort fertig', async () => {
  const { V } = ladeKern();
  const fremd = await V.anfrageKameraFund([], 'https://example.org/irgendwas');
  assert.equal(fremd.fertig, false);
  assert.equal(fremd.grund, 'keine-anfrage');
  assert.deepEqual(fremd.gesammelt, [], 'ein fremder QR blockiert die Sammlung nicht');
  const einzeln = await V.anfrageKameraFund([], JSON.stringify(ANFRAGE));
  assert.equal(einzeln.fertig, true);
});

test('[Anfrage·Kamera] ohne Browser-Leser kein Knopf, der Satz steht da', () => {
  const { V } = ladeKern();
  const ohne = V.anfrageKameraHTML();
  assert.equal(V.anfrageKameraMoeglich(), false, 'im Node-Lauf gibt es weder Kamera noch BarcodeDetector');
  assert.ok(!ohne.includes('anfrage-kamera-start'), 'kein Knopf ohne Leser');
  assert.ok(ohne.includes(V.escapeHTML(V.STRINGS.anfrageKameraGehtNicht)), 'der Satz nennt den Grund und den Einfüge-Weg');
});

test('[Anfrage·Kamera·Rot-Beweis] eine Serie mit fehlendem Teil wird nie fertig, ein Block ohne Schließen fällt bei der Grenzen-Prüfung', async () => {
  const { V } = ladeKern();
  const teile = V.qrTeilePacken(JSON.stringify(ANFRAGE), 120).map((t) => t.rahmen);
  let gesammelt = [];
  let f;
  for (const t of teile.slice(0, -1)) { f = await V.anfrageKameraFund(gesammelt, t); gesammelt = f.gesammelt; }
  assert.equal(f.fertig, false, 'ohne den letzten Teil öffnet keine Anfrage');
  assert.equal(f.grund, 'unvollstaendig');
  const start = KERN.indexOf('function _anfrageKameraVerdrahten()');
  const block = KERN.slice(start, KERN.indexOf('\n}\n', start));
  const ohneSchliessen = block.replace('if (!video.isConnected) { anfrageKameraStoppen()', 'if (!video.isConnected) { (function () {})()');
  assert.notEqual(ohneSchliessen, block, 'die Mutation trifft den Block');
  assert.ok(!/if \(!video\.isConnected\) \{ anfrageKameraStoppen\(\)/.test(ohneSchliessen), 'die Grenzen-Prüfung erkennt das fehlende Schließen');
});

test('[Anfrage·Kamera] die drei Grenzen stehen im Quelltext: Klick, Schließen beim Fund und beim Verlassen, kein Netz', () => {
  const start = KERN.indexOf('function _anfrageKameraVerdrahten()');
  const ende = KERN.indexOf('\n}\n', start);
  assert.ok(start > 0 && ende > start);
  const block = KERN.slice(start, ende);
  assert.ok(/knopf\.addEventListener\('click'/.test(block), 'die Kamera öffnet nur im Klick-Hörer');
  assert.equal((block.match(/getUserMedia/g) || []).length, 1, 'genau ein Öffnen');
  assert.ok(/if \(f\.fertig\) \{\s*anfrageKameraStoppen\(\)/.test(block), 'beim Fund zuerst zu');
  assert.ok(/if \(!video\.isConnected\) \{ anfrageKameraStoppen\(\)/.test(block), 'Dialog weg: Kamera zu');
  assert.ok(!/fetch\(|XMLHttpRequest|import\(|src\s*=\s*['"]https?:/.test(block), 'kein Nachladen aus dem Netz');
  const flow = KERN.slice(KERN.indexOf('function flowAnfrageEmpfangen()'), KERN.indexOf('_anfrageKameraVerdrahten();\n}'));
  assert.ok(/onPrimaer: async \(schliessen\) => \{\s*anfrageKameraStoppen\(\);/.test(flow), 'der Hauptknopf schließt die Kamera');
  assert.ok(flow.includes('anfrageSignaturPruefen(umschlag)'), 'die Signaturprüfung bleibt im Weg');
});
