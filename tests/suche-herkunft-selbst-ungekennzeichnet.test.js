'use strict';
/* Selbst Eingetragenes wird nicht gekennzeichnet (17.11.2026).
   Befund: am Stand von U-8 trug jeder Suchtreffer einer selbst eingetragenen Angabe die Zeile „Eingetragen von <Name>“ und als
   Icon die Initiale der Person; eine Angabe ohne Stempel hieß „Eingetragen ohne Namensvermerk“. Entschieden ist: eingelesene
   Angaben behalten Zeichen und Stelle, selbst eingetragene und solche ohne Stempel tragen keine Kennzeichnung.
   Klasse: kein Weg, der einen Angabe-Treffer baut, setzt Herkunftszeile oder Initiale an sucheHerkunft vorbei, und
   sucheHerkunft gibt beides nur bei eingelesenem Stempel. Rot-Beweis: der Kern mit der früheren Verdrahtung fällt. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function funktion(kern, name) {
  const a = kern.indexOf('function ' + name + '(');
  if (a < 0) return '';
  const b = kern.indexOf('\n}\n', a);
  return kern.slice(a, b < 0 ? undefined : b);
}

function maengel(kern) {
  const f = [];
  const bau = funktion(kern, '_sucheAngabenEintraege');
  if (/herkunftKurzText\(|herkunftInitiale\(/.test(bau)) f.push('Treffer setzt Herkunft an sucheHerkunft vorbei');
  if (!/\.\.\.sucheHerkunft\(/.test(bau)) f.push('Treffer nimmt die Herkunft nicht aus sucheHerkunft');
  const sh = funktion(kern, 'sucheHerkunft');
  if (!/eingabeArt !== 'import'\) return \{ initiale: '', herkunftZeile: '' \}/.test(sh)) f.push('sucheHerkunft kennzeichnet nicht nur Eingelesenes');
  if (!/if \(e && e\.quelle === 'angabe'\) return e\.initiale \? escapeHTML\(e\.initiale\) : '';/.test(funktion(kern, '_sucheQuelleIcon'))) f.push('eigene Angabe trägt ein Icon');
  if (!/e\.quelle === 'angabe' && e\.herkunftZeile\) html \+= '<span class="suche-treffer-quelle">'/.test(kern)) f.push('Trefferseite zeigt eine leere Herkunftszeile');
  return f;
}

test('[Herkunft·ungekennzeichnet] Suchtreffer kennzeichnen nur Eingelesenes', () => {
  assert.deepEqual(maengel(KERN), []);
});

test('[Herkunft·ungekennzeichnet·Rot-Beweis] die frühere Verdrahtung fällt', () => {
  const alt = KERN.replace('...sucheHerkunft(s.id, feldId), alltag: [],',
    'initiale: herkunftInitiale(s.id, feldId), herkunftZeile: herkunftKurzText(s.id, feldId), alltag: [],');
  assert.notEqual(alt, KERN, 'Vorbedingung: die Stelle steht im Kern');
  assert.deepEqual(maengel(alt), ['Treffer setzt Herkunft an sucheHerkunft vorbei', 'Treffer nimmt die Herkunft nicht aus sucheHerkunft']);
  const immer = KERN.replace("if (!st || st.eingabeArt !== 'import') return { initiale: '', herkunftZeile: '' };", 'if (!st) return { initiale: \'\', herkunftZeile: \'\' };');
  assert.notEqual(immer, KERN, 'Vorbedingung: die Stelle steht im Kern');
  assert.deepEqual(maengel(immer), ['sucheHerkunft kennzeichnet nicht nur Eingelesenes']);
  const person = KERN.replace("return e.initiale ? escapeHTML(e.initiale) : '';", 'return e.initiale ? escapeHTML(e.initiale) : svgIcon(ICONS.user, 16);');
  assert.notEqual(person, KERN, 'Vorbedingung: die Stelle steht im Kern');
  assert.deepEqual(maengel(person), ['eigene Angabe trägt ein Icon']);
});

test('[Herkunft·ohne-Stempel] ohne Stempel keine Zeile; ein Text für „ohne Vermerk“ steht in keinem Textsatz mehr', () => {
  for (const d of ['textsatz-de-modul.json', 'textsatz-en-modul.json']) {
    const roh = fs.readFileSync(path.join(__dirname, '..', 'tools', d), 'utf8');
    assert.equal(/herkunftOhneNamensvermerk/.test(roh), false, d);
  }
  assert.equal(/STRINGS\.herkunftOhneNamensvermerk/.test(KERN), false);
  const { V } = ladeKern();
  assert.equal(V.STRINGS.herkunftOhneNamensvermerk, undefined);
});

test('[Herkunft·ungekennzeichnet] im Kern: selbst eingetragen ohne Zeile und Initiale, eingelesen mit Quelle und Initiale', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('herkunft-ungekennzeichnet-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'Praxis Eigenhausen');
  const eigen = V._sucheTreffer('Eigenhausen').find((e) => e.quelle === 'angabe');
  assert.deepEqual([eigen.herkunftZeile, eigen.initiale], ['', '']);
  V.bmpPlanUebernehmen(V.bmpXmlLesen('<MP v="026" U="00112233445566778899AABBCCDDEEFF" l="de-DE">'
    + '<P g="Erika" f="Musterfrau" b="19600101"/><A n="Praxis Beispielweg" s="Lindenallee 3" z="12345" c="Musterstadt" t="20261106"/>'
    + '<S><M p="1234567" a="Beispielol 5 mg" m="1" v="1"><W w="Beispielwirkstoff" s="5 mg"/></M></S></MP>').plan);
  const ein = V._sucheTreffer('Beispielol').find((e) => e.quelle === 'angabe');
  assert.equal(ein.herkunftZeile, V.STRINGS.sucheHerkunftQuelle.replace('%s', 'Praxis Beispielweg'));
  assert.equal(ein.initiale, 'P');
});
