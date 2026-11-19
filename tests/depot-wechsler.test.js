'use strict';
/* depot-wechsler.test.js — Depot-Wechsler nach dem Desktop-Dummy (D04–D07)
   ─────────────────────────────────────────────────────────────────
   Die Pille zeigt die Initialen des offenen Depots (D04). Das Menü trägt die Überschrift „Depot wechseln“ (D05), listet das eigene Depot
   und jedes aktive verwaltete Depot mit „Sub-Depot · <Rolle>, Sie vertreten“ (D06, Handy-Dummy Z.155) und darunter „Sub-Depot anlegen“ (D07; Produktentscheidung 17.11.2026, die Beschriftung bleibt „Sub-Depot“). Die bisherigen Einträge
   (Datei, Sub-Depots, Sicherungskopie) bleiben darunter erreichbar und per Pfeiltaste in einer Reihe mit den neuen.
   Rot-Beweis: der frühere Stand (Punkt ohne Initialen, Menü nur mit den drei Einträgen) fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const DE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
const EN = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;

/* Rein: Funde im Kern-Quelltext. */
function funde(kern) {
  const aus = [];
  if (!/_dpAv\.id = 'tb-depot-av';/.test(kern) || !/_dpAv\.textContent = _dpIni;/.test(kern)) aus.push('D04: kein Initialen-Kreis in der Pille');
  const a = kern.indexOf('function _depotWechslerAufbauen(');
  const rumpf = a < 0 ? '' : kern.slice(a, kern.indexOf('\nfunction depotMenueVerdrahten(', a));
  if (!/STRINGS\.depotMenueTitel/.test(rumpf)) aus.push('D05: keine Überschrift „Depot wechseln“');
  if (!/verwalteteDepots/.test(rumpf) || !/SUB_ROLLE_TEXT/.test(rumpf) || !/flowSubKontextBetreten\(d\.depotUUID\)/.test(rumpf)) aus.push('D06: verwaltete Depots fehlen oder ohne Rolle/Wechsel');
  if (!/STRINGS\.depotMenueAnlegen/.test(rumpf) || !/flowSubDepotAnlegen\(\)/.test(rumpf)) aus.push('D07: kein „Sub-Depot anlegen“');
  if (!/const eintraege = \(zurueck \? \[zurueck\] : \[\]\)\.concat\(wechsler, /.test(kern)) aus.push('Tastatur: die neuen Einträge stehen nicht in der Pfeiltasten-Reihe');
  return aus;
}

test('[Depot-Wechsler] Initialen, Überschrift, Depots mit Rolle, Anlegen, Tastatur-Reihe', () => {
  assert.deepEqual(funde(KERN), []);
});

test('[Depot-Wechsler] Wortlaute nach dem Dummy, deutsch und englisch', () => {
  assert.equal(DE['strings:depotMenueTitel.text'], 'Depot wechseln');
  assert.equal(DE['strings:depotMenueIhrDepot.text'], 'Ihr Depot');
  assert.equal(DE['strings:depotMenueSubDepot.text'], 'Sub-Depot');
  assert.equal(DE['strings:depotMenueSieVertreten.text'], 'Sie vertreten');
  assert.equal(DE['strings:depotMenueAnlegen.text'], 'Sub-Depot anlegen');
  for (const k of ['depotMenueTitel', 'depotMenueIhrDepot', 'depotMenueSubDepot', 'depotMenueSieVertreten', 'depotMenueAnlegen']) {
    assert.ok(typeof EN['strings:' + k + '.text'] === 'string' && EN['strings:' + k + '.text'].trim(), 'en: ' + k);
  }
});

test('[Depot-Wechsler] Initialen aus den Feldern, ohne Felder der erste Buchstabe, leer', () => {
  const { V } = ladeKern({ zusatzBindungen: ['_depotInitialen'] });
  // U2-ADR-467: zwei Buchstaben nur aus den getrennt eingetragenen Feldern; der ganze Name wird nie zerlegt.
  assert.equal(V.__zusatz._depotInitialen('Lena Mustermann', { givenName: 'Lena', familyName: 'Mustermann' }), 'LM');
  assert.equal(V.__zusatz._depotInitialen('Maria von der Heide', { givenName: 'Maria', familyName: 'von der Heide' }), 'MV');
  assert.equal(V.__zusatz._depotInitialen('Müller Hans', { givenName: 'Hans', familyName: 'Müller', displayFamilyNameFirst: true }), 'MH');
  assert.equal(V.__zusatz._depotInitialen('Mia Sophie Mustermann'), 'M', 'ohne Felder nur der erste Buchstabe, kein geratener Familienname');
  assert.equal(V.__zusatz._depotInitialen('lena'), 'L');
  assert.equal(V.__zusatz._depotInitialen('  '), '');
});

test('[Depot-Wechsler·Rot-Beweis] der frühere Stand fällt durch', () => {
  const alt = KERN
    .replace("_dpAv.id = 'tb-depot-av';", '')
    .replace('function _depotWechslerAufbauen(', 'function _xAlt(')
    .replace('.concat(wechsler, [liste', '.concat([liste');
  const f = funde(alt);
  for (const teil of ['D04', 'D05', 'D06', 'D07', 'Tastatur']) assert.ok(f.some((x) => x.startsWith(teil)), teil + ': ' + f.join(' | '));
});

/* M01 (Handy-Dummy, Einstieg): der Leitsatz steht auf dem Eingangsschirm über der Unterzeile und wird mit vorgelesen. */
test('[Einstieg·M01] Leitsatz „Ein Ort für die Daten eines ganzen Lebens“ auf dem Eingangsschirm und im Vorlesetext', () => {
  assert.equal(DE['strings:welcomeLeitsatz.text'], 'Ein Ort für die Daten eines ganzen Lebens');
  assert.ok(EN['strings:welcomeLeitsatz.text'], 'en');
  assert.match(KERN, /<p class="welcome-sub" id="w-leitsatz">' \+ escapeHTML\(vorDepotText\('welcomeLeitsatz'\)\)/);
  assert.match(KERN, /if \(STRINGS\.welcomeLeitsatz\) teile\.push\(/);
});

test('[Einstieg·M01·Rot-Beweis] ohne Leitsatz fällt die Probe durch', () => {
  const alt = KERN.replace('id="w-leitsatz"', 'id="w-x"');
  assert.doesNotMatch(alt, /<p class="welcome-sub" id="w-leitsatz">/);
});

/* H01 (Desktop-Dummy Kopf: Marke, Wechsler): unter 460 px weicht nur die Wortmarke, die Bildmarke bleibt im Kopf. */
const CSS = fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
const markeVersteckt = (css) => /\.topbar #tb-marke \{ display: none; \}/.test(css);
test('[Kopf·H01] die Marke bleibt auf schmalen Schirmen im Kopf', () => {
  assert.equal(markeVersteckt(CSS), false);
  assert.match(CSS, /\.topbar \.logo-wort \{ display: none; \}/, 'die Wortmarke weicht weiter');
});
test('[Kopf·H01·Rot-Beweis] der frühere Stand (Marke versteckt) fällt durch', () => {
  assert.equal(markeVersteckt(CSS + '\n    .topbar #tb-marke { display: none; }\n'), true);
});
