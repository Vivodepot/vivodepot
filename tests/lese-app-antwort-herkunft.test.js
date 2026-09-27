'use strict';
/* Herkunft je Angabe in der Lese-App (Custody-Bauplan Punkt 1, 26.09.2026). Das Anzeigemodell rechnete `herkunft` je
   Angabe schon aus — 'geprueft' nur bei `verifiziert:true`, also aus einem signiert geprüften Nachweis (U2-ADR-030) —,
   die Antwort zeigte es aber nicht: die Klinik sah nicht, welche Angabe die Person selbst gemacht hat und welche aus einem
   geprüften Nachweis stammt. Gehalten wird: jede Zeile trägt ihren Vermerk, die Zählung darunter stimmt, und nur ein
   ausdrückliches `verifiziert:true` zählt als geprüft — fehlend, falsch oder fremdgeformt heißt „von der Person angegeben“. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const ANFRAGE = { von: 'Klinik', zweck: 'Aufnahme', grundlage: 'Behandlungsvertrag', vorgang: 'V-1' };
function datensatz(felder) {
  return { felder, fehlend: [], anfrage: ANFRAGE, vollstaendig: true };
}
const GEPRUEFT = { kennung: 'health.bloodType', label: 'Blutgruppe', wert: 'A+', herkunft: { verifiziert: true } };
const EINGETRAGEN = { kennung: 'identity.familyName', label: 'Nachname', wert: 'Muster', herkunft: { eingabeArt: 'hand' } };
const OHNE = { kennung: 'identity.givenName', label: 'Vorname', wert: 'Erika' };
const FREMD = { kennung: 'health.allergies', label: 'Allergien', wert: 'keine', herkunft: { verifiziert: 'ja' } };

// Welcher Vermerk steht an welcher Zeile — gelesen aus dem gezeichneten HTML.
function vermerke(html, attr) {
  const aus = {};
  const re = new RegExp('<li ' + attr + '="([^"]*)">[\\s\\S]*?</li>', 'g');
  let m;
  while ((m = re.exec(html))) {
    const h = /data-herkunft="(geprueft|eingetragen)"/.exec(m[0]);
    aus[m[1]] = h ? h[1] : null;
  }
  return aus;
}

test('[Herkunft·Antwort] jede Zeile trägt ihren Vermerk; nur verifiziert:true gilt als geprüft', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz([GEPRUEFT, EINGETRAGEN, OHNE, FREMD]), { vorgang: 'V-1' });
  const html = document.getElementById('app').innerHTML;
  assert.deepEqual(vermerke(html, 'data-antwort-feld'),
    { Blutgruppe: 'geprueft', Nachname: 'eingetragen', Vorname: 'eingetragen', Allergien: 'eingetragen' });
  assert.ok(html.includes(V.STRINGS.antwortHerkunftGeprueft) && html.includes(V.STRINGS.antwortHerkunftEingetragen));
  const zaehlung = V.STRINGS.antwortHerkunftZaehlung.replace('{n}', '1').replace('{m}', '4');
  assert.ok(html.includes('id="antwort-herkunft-zaehlung"') && html.includes(zaehlung), 'die Zählung darunter');
});

test('[Herkunft·Anlass] ein Datensatz ohne Anfrage zeigt dieselben Vermerke', () => {
  const { V, document } = ladeLesen();
  V.renderAnlass({ felder: [GEPRUEFT, EINGETRAGEN], fehlend: [], anlass: { titel: 'Aufnahme' } });
  const html = document.getElementById('app').innerHTML;
  assert.deepEqual(vermerke(html, 'data-anlass-feld'), { Blutgruppe: 'geprueft', Nachname: 'eingetragen' });
  assert.ok(html.includes('id="anlass-herkunft-zaehlung"'));
});

test('[Herkunft·leer] eine Antwort ohne Angaben zeigt keine Zählung', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz([]), { vorgang: 'V-1' });
  assert.ok(!document.getElementById('app').innerHTML.includes('antwort-herkunft-zaehlung'));
});

test('[Herkunft·DE/EN] beide Sprachen führen die drei Texte, die Zählung mit beiden Platzhaltern', () => {
  const { html } = ladeLesen();
  for (const k of ['antwortHerkunftGeprueft', 'antwortHerkunftEingetragen', 'antwortHerkunftZaehlung']) {
    assert.equal((html.match(new RegExp('\\n  ' + k + ': ', 'g')) || []).length, 2, k + ' steht in DE und EN');
  }
  const zeilen = html.split('\n').filter((z) => z.startsWith('  antwortHerkunftZaehlung: '));
  for (const z of zeilen) assert.ok(z.includes('{n}') && z.includes('{m}'), z);
});

test('[Herkunft·Rot-Beweis] eine Anzeige, die alles als geprüft ausgibt, fällt an der ersten Probe durch', () => {
  const { V, document } = ladeLesen();
  const echt = V.antwortAnzeigeModell;
  const falsch = (ds, u) => { const m = echt(ds, u); m.felder.forEach((f) => { f.herkunft = 'geprueft'; }); return m; };
  const html0 = (() => { V.renderAntwort(datensatz([GEPRUEFT, EINGETRAGEN]), { vorgang: 'V-1' }); return document.getElementById('app').innerHTML; })();
  const gefaelscht = html0.replace(/data-herkunft="eingetragen"/g, 'data-herkunft="geprueft"');
  assert.notDeepEqual(vermerke(gefaelscht, 'data-antwort-feld'), vermerke(html0, 'data-antwort-feld'));
  assert.equal(falsch(datensatz([EINGETRAGEN]), {}).felder[0].herkunft, 'geprueft', 'Vorbedingung: die Pflanzung wirkt');
  assert.equal(echt(datensatz([EINGETRAGEN]), {}).felder[0].herkunft, 'eingetragen');
});

test('[Herkunft·keine geprüft] ist keine Angabe geprüft, sagt die Zählung das in einem Satz — nicht „0 von n“', () => {
  const { V, document } = ladeLesen();
  V.renderAntwort(datensatz([EINGETRAGEN, OHNE]), { vorgang: 'V-1' });
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes(V.STRINGS.antwortHerkunftZaehlungKeine.replace('{m}', '2')), 'der Satz für „keine geprüft“');
  assert.ok(!html.includes(V.STRINGS.antwortHerkunftZaehlung.replace('{n}', '0').replace('{m}', '2')), 'nicht „0 von 2“');
});
