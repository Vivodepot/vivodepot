'use strict';
/* Lebenslage „Längere Krankheit" — sachliche Hinweise zur Rechtslage kommen aus dem Rechtsraum-Modul, nicht aus dem
   Kern und nicht aus dem Lebenslagen-Katalog. Jeder Hinweis trägt einen Link auf den Normtext (nur https), der Linktext
   ist die Norm. Ohne Rechtsraum-Modul bleibt die Lage ohne Hinweise. Gelesen wird nur aus Modulen, die das Produkt
   ab Werk mitbringt (wie _rechtsraumVorschlagswert). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const RECHTSRAUM_DE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'rechtsraum-de-modul.json'), 'utf8'));
const NORM_HOST = 'https://www.gesetze-im-internet.de/';

function hinweisModul(eintraege) {
  return { modulTyp: 'rechtsraum', rechtsraum: 'XX', moduleVersion: 1, anbieterId: 'beispiel', name: { de: 'Beispielland', en: 'Exampleland' },
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1 } }, lebenslageHinweise: { 'lange-krankheit': eintraege } };
}

test('[Lange Krankheit] das Rechtsraum-Modul DE trägt drei Hinweise, je deutsch und englisch, je mit Norm und https-Quelle', () => {
  const h = RECHTSRAUM_DE.lebenslageHinweise && RECHTSRAUM_DE.lebenslageHinweise['lange-krankheit'];
  assert.ok(Array.isArray(h), 'lebenslageHinweise["lange-krankheit"] fehlt');
  assert.equal(h.length, 3);
  for (const e of h) {
    assert.ok(e.text && e.text.de && e.text.en, 'Text deutsch und englisch');
    assert.ok(e.quelle.startsWith(NORM_HOST), 'Quelle ist der Normtext: ' + e.quelle);
    assert.match(e.norm, /^§ \d+ SGB (V|III)$/);
  }
});

test('[Lange Krankheit] das Lage-Blatt zeigt die drei Hinweise mit Link, darüber die Rechtslage', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('lk-pw-12345678');
  V.akteurSelbstErklaeren('Tester');
  const blatt = V.lebenslageAlsBlatt('lange-krankheit');
  assert.ok(blatt, 'die Lage ist auflösbar');
  assert.equal(blatt.bloecke.length > 0, true, 'die Lage zeigt Felder');
  assert.equal(blatt.rechtsraumHinweise.length, 3);
  V.renderSituation(blatt);
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Rechtslage Deutschland'), 'Herkunft der Sätze steht darüber');
  for (const e of RECHTSRAUM_DE.lebenslageHinweise['lange-krankheit']) {
    assert.ok(html.includes(e.text.de), 'Satz fehlt: ' + e.text.de);
    assert.ok(html.includes('href="' + e.quelle + '"'), 'Link fehlt: ' + e.quelle);
    assert.ok(html.includes('>' + e.norm + '</a>'), 'Linktext ist die Norm: ' + e.norm);
  }
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length >= 3, true);
});

test('[Lange Krankheit] das englische Produkt zeigt die englischen Sätze', async () => {
  const { V, document } = ladeKern({ produkt: 'privat-en' });
  await V.depotAnlegen('lk-pw-12345678');
  V.akteurSelbstErklaeren('Tester');
  V.renderSituation(V.lebenslageAlsBlatt('lange-krankheit'));
  const html = document.getElementById('content').innerHTML;
  for (const e of RECHTSRAUM_DE.lebenslageHinweise['lange-krankheit']) assert.ok(html.includes(e.text.en), 'EN fehlt: ' + e.text.en);
  assert.ok(html.includes('Germany'), 'Herkunft auf Englisch');
});

test('[Lange Krankheit·Rot-Beweis] eine Quelle ohne https, mit fremdem Schema oder ein Eintrag ohne Text fällt weg', () => {
  const { V } = ladeKern();
  const gut = { text: { de: 'Ein Satz.', en: 'A sentence.' }, quelle: 'https://beispiel.example/norm/1', norm: 'Art. 1' };
  const liste = [gut,
    { ...gut, quelle: 'http://beispiel.example/norm/1' },
    { ...gut, quelle: 'javascript:alert(1)' },
    { ...gut, quelle: 'https://beispiel.example/a b' },
    { ...gut, text: { de: '', en: '' } },
    { ...gut, norm: '' },
    'nur ein Text'];
  const aus = V._lebenslageHinweiseAusModulen([hinweisModul(liste)], 'XX', 'lange-krankheit', 'de');
  assert.equal(aus.length, 1, 'nur der eine gültige Eintrag bleibt');
  assert.deepEqual({ ...aus[0] }, { text: 'Ein Satz.', quelle: 'https://beispiel.example/norm/1', norm: 'Art. 1', land: 'Beispielland' });
});

test('[Lange Krankheit·Rot-Beweis] ohne passendes Rechtsraum-Modul gibt es keine Hinweise', () => {
  const { V } = ladeKern();
  const gut = { text: { de: 'Ein Satz.', en: 'A sentence.' }, quelle: 'https://beispiel.example/norm/1', norm: 'Art. 1' };
  assert.deepEqual(V._lebenslageHinweiseAusModulen([], 'DE', 'lange-krankheit', 'de'), []);
  assert.deepEqual(V._lebenslageHinweiseAusModulen([hinweisModul([gut])], 'DE', 'lange-krankheit', 'de'), [], 'anderer Rechtsraum');
  assert.deepEqual(V._lebenslageHinweiseAusModulen([hinweisModul([gut])], 'XX', 'andere-lage', 'de'), [], 'andere Lage');
});

test('[Lange Krankheit·Rot-Beweis] Text und Norm aus dem Modul werden maskiert', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('lk-pw-12345678');
  V.akteurSelbstErklaeren('Tester');
  const blatt = V.lebenslageAlsBlatt('lange-krankheit');
  blatt.rechtsraumHinweise = [{ text: '<img src=x onerror=1>', quelle: 'https://beispiel.example/x', norm: '<b>N</b>', land: '<i>L</i>' }];
  V.renderSituation(blatt);
  const html = document.getElementById('content').innerHTML;
  assert.equal(html.includes('<img src=x'), false);
  assert.equal(html.includes('<b>N</b>'), false);
  assert.equal(html.includes('<i>L</i>'), false);
});
