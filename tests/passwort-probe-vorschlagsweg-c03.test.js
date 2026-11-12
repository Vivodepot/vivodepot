'use strict';
/* Befund C03 (HOCH, Vorschau v998, Gestaltungsleitung): die Passwort-Bestätigung im Vorschlagsweg war unklar, derselbe Fehler wie C02.
   C02 war nur im Anlege-Dialog in zwei Schritten behoben. Acht weitere Dialoge zeigen sechs vorgeschlagene Wörter (pwVorschlagHTML):
   Passwort setzen, Passwort wechseln, Code-Öffnen, Anlegen ohne zwei Schritte, drei Empfängerkreise, Unterdepot-Passwort. Dort stand
   „Tippen Sie sie zur Bestätigung noch einmal, mit den Bindestrichen …“ und darunter, weiter unten, „Passwort bestätigen“.
   Jetzt gilt, für jeden dieser Dialoge (die Klasse):
   · der Satz unter den Wörtern bittet nicht mehr um ein zweites Tippen, er sagt nur „auf Papier schreiben“;
   · das zweite Feld heißt `<feld>2`, und beim Vorschlag lautet seine Beschriftung „Wörter zur Probe abtippen“ (pwVorschlagVerdrahten);
   · jedes richtig getippte Wort wird oben markiert (dieselbe Markierung wie in C02).
   Rot-Beweis: der alte Satz und ein Dialog, dessen zweites Feld anders heißt, fallen durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
// Öffentlich gehen die Pro-Textsätze nicht hinaus; dort prüft die Probe die zwei Privat-Textsätze.
const baubar = (slug) => require('../tools/lib/vier-produkte.js').PRODUKTE.some((p) => p.slug === slug);
const MODULE = ['textsatz-de-modul.json', 'textsatz-en-modul.json'].concat(baubar('pro-de') ? ['textsatz-de-pro-modul.json', 'textsatz-en-pro-modul.json'] : [])
  .map((d) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', d), 'utf8')));

function satzFunde(satz) {
  return /Bestätigung|noch einmal|to confirm|again/i.test(String(satz)) ? ['der Satz bittet um ein zweites Tippen: ' + satz] : [];
}

/* Jede Stelle mit dem Vorschlag in voller Form, je mit der Frage, ob das Feld `<id>2` samt Beschriftung im selben Körper steht. */
function vorschlagsDialoge(kern) {
  const aus = [];
  const re = /pwVorschlagHTML\('([a-z0-9-]+)'(?:, [A-Za-z]+)?\)/g;
  let m;
  while ((m = re.exec(kern))) {
    const id = m[1];
    const umgebung = kern.slice(m.index, m.index + 1500);
    aus.push({ id, zweitesFeld: umgebung.includes('<input id="' + id + '2"') && umgebung.includes('<label for="' + id + '2"') });
  }
  return aus;
}

test('[C03] der Satz unter den Wörtern bittet nicht mehr um ein zweites Tippen (DE, EN, beide Produkte)', () => {
  for (const mod of MODULE) assert.deepEqual(satzFunde(mod.texte['strings:pwVorschlagErklaerung.text']), []);
  const { V } = ladeKern();
  assert.equal(V.STRINGS.pwVorschlagErklaerung, 'Die Wörter stehen schon im Feld. Schreiben Sie sie jetzt auf Papier.');
});

test('[C03·Klasse] jeder Dialog mit dem Vorschlag trägt sein zweites Feld als `<feld>2` mit Beschriftung', () => {
  const d = vorschlagsDialoge(KERN);
  // 8 → 7 (07.11.2026): der namenlose Passwort-Dialog (pw-neu) entfiel mit dem Rückbau des Vorschau-Passwortwegs.
  assert.ok(d.length >= 7, 'Vorbedingung: die Vorschlags-Dialoge gefunden (' + d.length + ')');
  assert.deepEqual(d.filter((x) => !x.zweitesFeld).map((x) => x.id), []);
});

test('[C03] der Baustein benennt das zweite Feld beim Vorschlag um und markiert die Wörter', () => {
  const a = KERN.indexOf('function pwVorschlagVerdrahten(');
  const f = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.match(f, /document\.getElementById\(o\.probeId \|\| \(o\.schlicht \? '' : feldId \+ '2'\)\)/, 'das zweite Feld ist die Probe');
  assert.match(f, /text\('anlegenPwProbeLabel'\)/, 'Beschriftung beim Vorschlag');
  assert.match(f, /probe\.addEventListener\('input', hakenMalen\)/, 'Markierung je Wort');
});

test('[C03·Rot-Beweis] der alte Satz und ein anders benanntes zweites Feld fallen durch', () => {
  assert.equal(satzFunde('Die Wörter stehen schon im Feld. Tippen Sie sie zur Bestätigung noch einmal, mit den Bindestrichen.').length, 1);
  const alt = KERN.replace('<input id="kreis-pw2"', '<input id="kreis-pw-wdh"');
  assert.notEqual(alt, KERN, 'Vorbedingung');
  assert.deepEqual(vorschlagsDialoge(alt).filter((x) => !x.zweitesFeld).map((x) => x.id), ['kreis-pw']);
});
