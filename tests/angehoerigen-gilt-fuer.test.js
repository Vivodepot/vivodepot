'use strict';
/* „Gilt für: Deutschland" / „Applies in: Germany" (Wortlaut vom 19.09.2026, Bürgersprache).
   Der Ländername kommt aus der VORLAGE (rechtsraumName in ihrer Sprache), nicht aus dem Code; der
   Rahmentext („Gilt für: %s") kommt aus dem Textsatz der Sprache. Kern und Lese-App, Deutsch und
   Englisch — nativ geschrieben, nicht übersetzt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gebackenLaden } = require('./lib/gebackenes-produkt-laden.js');
const { ladeLesen } = require('./load-lesen.js');

const REPO = path.join(__dirname, '..');
const lesen = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));

for (const [slug, erwartet, nichtErwartet] of [
  ['privat-de', 'Gilt für: Deutschland', /Applies in/],
  ['privat-en', 'Applies in: Germany', /Gilt für/],
]) {
  test('[Kern · ' + slug + '] das Blatt sagt „' + erwartet + '"', async () => {
    const { V, document } = await gebackenLaden(slug);
    await V.depotAnlegen('pw-gilt-fuer');
    V.betreteApp();
    assert.equal(V.oeffneAngehoerigenBlatt('beerdigung'), true);
    const html = document.getElementById('content').innerHTML;
    assert.ok(html.includes('ang-herkunft">' + erwartet + '<'), 'Herkunftszeile: ' + erwartet);
    assert.doesNotMatch(html, nichtErwartet);
    assert.ok(!/Rechtsraum|jurisdiction/i.test(html.match(/ang-herkunft">[^<]*</)[0]), 'kein Fachwort in der Herkunftszeile');
  });
}

test('[Lese-App · DE] die Datei eines deutschen Produkts: „Gilt für: Deutschland"', () => {
  const { V } = ladeLesen();
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    abWerkMitschrift: { angehoerigen: [lesen('tools/angehoerigen-vorlagen/vivodepot-angehoerigen-de.json')] } };
  V._foldVollmachtenLesen(obj); V.setData(obj);
  assert.match(V.angehoerigenBlattHTML('krankenhausakut'), /angehoerigen-herkunft">Gilt für: Deutschland</);
});

test('[Lese-App · EN] die Datei eines englischen Produkts: „Applies in: Germany"', () => {
  const { V } = ladeLesen();
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    abWerkMitschrift: { sprache: lesen('tools/textsatz-en-modul.json'),
      angehoerigen: [lesen('tools/angehoerigen-vorlagen/vivodepot-angehoerigen-en.json')] } };
  V._foldVollmachtenLesen(obj); V.setData(obj);
  const html = V.angehoerigenBlattHTML('krankenhausakut');
  assert.match(html, /angehoerigen-herkunft">Applies in: Germany</);
  assert.match(html, /Hospital/, 'auch der Titel des Blatts ist englisch');
});

test('[Lese-App] ohne Namen in der Vorlage steht der Wert der Vorlage, nie ein erfundener Ländername', () => {
  const { V } = ladeLesen();
  const vorlage = lesen('tools/angehoerigen-vorlagen/vivodepot-angehoerigen-de.json');
  delete vorlage.rechtsraumName;
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    abWerkMitschrift: { angehoerigen: [vorlage] } };
  V._foldVollmachtenLesen(obj); V.setData(obj);
  const html = V.angehoerigenBlattHTML('krankenhausakut');
  assert.match(html, /angehoerigen-herkunft">Gilt für: DE</);
  assert.doesNotMatch(html, /Deutschland/);
});

test('[Prüfer · Rot-Beweis] Kern und Lese-App lassen die Namen zu, verwerfen aber eine Vorlage mit leerem oder nicht-textuellem Namen', () => {
  const { ladeKern } = require('./load-kern.js');
  const K = ladeKern({ blank: true }).V;
  const L = ladeLesen().V;
  const modul = (extra) => Object.assign({ modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'x', sprache: 'de', rechtsraum: 'DE',
    situationen: { 'blatt-a': { titel: 'A', icon: 'users', bloecke: [] } } }, extra);
  for (const P of [K.angehoerigenVorlagePruefen, L.angehoerigenVorlagePruefenLesen]) {
    assert.equal(P(modul({ rechtsraumName: 'Deutschland' })).gueltig, true);
    assert.equal(P(modul({ rechtsraumName: 5 })).grund, 'rechtsraumName');
    assert.equal(P(modul({ berufsstandName: '  ' })).grund, 'berufsstandName');
    assert.equal(P(modul({ modulTyp: 'angehoerigen-vorlage' })).grund, 'modulTyp', 'der Typ-Schlüssel ist angehoerigenVorlage');
  }
  assert.equal(K.angehoerigenVorlagePruefen(modul({ rechtsraumName: 'Deutschland' })).situationen[0].rechtsraumName, 'Deutschland');
});
