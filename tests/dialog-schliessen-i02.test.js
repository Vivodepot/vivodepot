'use strict';
/* Befund I02 (HOCH, Bedienkonzept-Prüfung 01.11.2026, Muster 03 und 15): kein Dialog hatte ein ✕; geschlossen wurde nur mit „Abbrechen“
   als Zweitknopf neben dem Hauptknopf, 45 Dialoge hatten gar keinen Ausweg, Esc und Hintergrund taten nichts.
   Jetzt gilt im Dialog-Baustein (ui.modal), also für jeden Dialog:
   · links oben ein ✕ (Schließen), Esc und ein Klick auf den Hintergrund gehen denselben Weg;
   · ein Blatt mit Eingabe hat unten nur den Hauptknopf; „Abbrechen“ bleibt nur in kurzen Rückfragen ohne Eingabe;
   · hat die Person etwas geändert, fragt der Dialog „Ihre Eingaben verwerfen?“ (Weiter bearbeiten · Verwerfen);
   · ein Dialog, der eine Zusage schuldet, sagt mit `beimSchliessen`, welchen Weg das ✕ geht; eine Pflichtentscheidung trägt `pflicht`.
   Die Klasse: jeder Aufruf ohne „Abbrechen“, dessen Knöpfe mehr tun als schließen, trägt `beimSchliessen` oder `pflicht`.
   Der Aufbau in ui.modal bleibt byte-gleich (die HTML-Senke steht mit Abdruck in der Grundlinie). Das ✕ und die Rückfrage kommen aus der
   Vorlage #modal-teile, ihre Texte setzt der Dialog als Text; das ✕ ist leer, seine Striche zeichnet der Stil (Inter führt U+2715 nicht).
   Der DOM-Stub klont keine Vorlage: die Probe liest dort die gesetzten Eigenschaften, die Vorlage selbst liest sie aus dem Kern.
   Rot-Beweise: der alte Baustein (ohne ✕) und ein Aufrufer ohne die Angabe fallen durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Rein: was die Vorlage und die Einsetz-Funktion über die Schließwege sagen. */
function vorlageFunde(kern) {
  const aus = [];
  const v = (/<template id="modal-teile">([\s\S]*?)<\/template>/.exec(kern) || [])[1] || '';
  if (!/^<div class="modal-kopf"><button type="button" class="modal-x" id="m-x"><\/button><\/div>/.test(v)) aus.push('kein leeres ✕ im Kopf der Vorlage');
  if (!/<div class="modal-verwerfen" id="m-verwerfen-block" hidden role="alertdialog"/.test(v)) aus.push('keine verborgene Rückfrage in der Vorlage');
  if (v.indexOf('id="m-weiter"') < 0 || v.indexOf('id="m-weiter"') > v.indexOf('id="m-verwerfen"')) aus.push('„Weiter bearbeiten“ steht nicht vor „Verwerfen“');
  if (/\u2715/.test(kern)) aus.push('das ✕ als Schriftzeichen im Kern (Inter führt U+2715 nicht)');
  return aus;
}
/* Ein Stub-Element, das gesetzte Attribute und das Entfernen mitschreibt. */
function mitschreiben(el) {
  el.attr = {}; el.entfernt = false;
  el.setAttribute = (k, w) => { el.attr[k] = w; };
  el.remove = () => { el.entfernt = true; };
  return el;
}

/* Das Ende eines Aufrufs: die schließende Klammer zu `ui.modal(`, Zeichenketten und Kommentare übersprungen. */
function aufrufEnde(kern, start) {
  let tiefe = 0;
  for (let i = start; i < kern.length; i++) {
    const c = kern[i];
    if (c === "'" || c === '"' || c === '`') { const q = c; for (i++; i < kern.length && kern[i] !== q; i++) if (kern[i] === '\\') i++; continue; }
    if (c === '/' && kern[i + 1] === '/') { i = kern.indexOf('\n', i); continue; }
    if (c === '/' && kern[i + 1] === '*') { i = kern.indexOf('*/', i) + 1; continue; }
    if (c === '(') tiefe++;
    else if (c === ')' && --tiefe === 0) return i;
  }
  return kern.length;
}
/* Die ui.modal-Aufrufe mit ohneAbbrechen, je mit ihrem ganzen Aufruf. */
function aufrufeOhneAbbrechen(kern) {
  const aus = [];
  const re = /ui\.modal\(\{/g;
  let m;
  while ((m = re.exec(kern))) {
    const block = kern.slice(m.index, aufrufEnde(kern, m.index + 'ui.modal'.length));
    if (!/ohneAbbrechen: true/.test(block)) continue;
    aus.push({ zeile: kern.slice(0, m.index).split('\n').length, block });
  }
  return aus;
}
const SCHULDET = /\b(weiter|resolve|danach|beiNein|_nachWeitergabeNachfragen|_anfrageAntwortAusgeben|betreteApp|nachWahl)\(|o\.geschlossen\(/;
function ohneAngabe(kern) {
  return aufrufeOhneAbbrechen(kern).filter((a) => SCHULDET.test(a.block) && !/beimSchliessen: '(zweit|primaer|schliessen)'|pflicht: true/.test(a.block)).map((a) => a.zeile);
}

test('[I02] Blatt mit Eingabe: ✕ mit Namen, kein „Abbrechen“; Rückfrage ohne Eingabe behält „Abbrechen“', () => {
  const { V, document } = ladeKern();
  assert.deepEqual(vorlageFunde(KERN), []);
  const x = mitschreiben(document.getElementById('m-x'));
  const abbr = mitschreiben(document.getElementById('m-abbr'));
  V.ui.modal({ titel: 'Blatt', koerperHTML: '<label>Name<input id="n"></label>', primaerLabel: 'Speichern', onPrimaer: (s) => s() });
  assert.equal(x.attr['aria-label'], V.STRINGS.btnSchliessen, 'das ✕ heißt „Schließen“');
  assert.equal(x.hidden, false, 'das ✕ ist sichtbar');
  assert.equal(abbr.entfernt, true, 'Blatt mit Eingabe: „Abbrechen“ entfernt');
  abbr.entfernt = false;
  V.ui.modal({ titel: 'Löschen?', koerperHTML: '<p>Wirklich löschen?</p>', primaerLabel: 'Löschen', onPrimaer: (s) => s() });
  assert.equal(abbr.entfernt, false, 'Rückfrage ohne Eingabe behält „Abbrechen“');
  assert.equal(V._modalMitEingabe('<input type="hidden" name="x"><p>t</p>'), false, 'ein verstecktes Feld ist keine Eingabe');
  assert.equal(V._modalMitEingabe('<select></select>'), true);
});

test('[I02] ✕ schließt und ruft onAbbrechen; Hintergrund und Esc hängen am offenen Dialog', () => {
  const { V, document } = ladeKern();
  let abgebrochen = 0;
  V.ui.modal({ titel: 'T', koerperHTML: '<input id="a">', primaerLabel: 'OK', onPrimaer: (s) => s(), onAbbrechen: () => abgebrochen++ });
  const host = document.getElementById('modal-rueck');
  assert.equal(typeof host.onclick, 'function', 'Hintergrund-Klick verdrahtet');
  document.getElementById('m-x').onclick();
  assert.equal(abgebrochen, 1);
  assert.equal(host.classList.contains('an'), false, 'geschlossen');
  assert.equal(host.onclick, null, 'nach dem Schließen hängt am Hintergrund nichts mehr');
});

test('[I02] die Verwerfen-Rückfrage: verborgen im Dialog, Frage, „Weiter bearbeiten“ links, „Verwerfen“ als Hauptknopf', () => {
  const { V, document } = ladeKern();
  V.ui.modal({ titel: 'T', koerperHTML: '<input id="a">', primaerLabel: 'OK', onPrimaer: (s) => s() });
  assert.equal(document.getElementById('m-verwerfen-frage').textContent, V.STRINGS.modalVerwerfenFrage);
  assert.equal(document.getElementById('m-weiter').textContent, V.STRINGS.modalWeiterBearbeiten);
  assert.equal(document.getElementById('m-verwerfen').textContent, 'Verwerfen');
  assert.match(KERN, /<button type="button" class="btn" id="m-verwerfen"><\/button>/, '„Verwerfen“ ist der Hauptknopf');
  assert.equal(V.STRINGS.modalVerwerfenFrage, 'Ihre Eingaben verwerfen?');
  assert.equal(V.STRINGS.modalWeiterBearbeiten, 'Weiter bearbeiten');
});

test('[I02] pflicht: kein ✕, kein Hintergrund-Schließen', () => {
  const { V, document } = ladeKern();
  V.ui.modal({ titel: 'Konflikt', koerperHTML: '<p>x</p>', primaerLabel: 'A', onPrimaer: (s) => s(), ohneAbbrechen: true, pflicht: true });
  assert.equal(document.getElementById('m-x').hidden, true, 'das ✕ ist verborgen');
  assert.equal(document.getElementById('modal-rueck').onclick, null);
});

test('[I02] beimSchliessen: das ✕ geht den Weg der zweitAktion bzw. des Hauptknopfs', () => {
  const { V, document } = ladeKern();
  let weg = '';
  V.ui.modal({ titel: 'T', koerperHTML: '<p>x</p>', primaerLabel: 'Ja', onPrimaer: (s) => { s(); weg = 'primaer'; }, ohneAbbrechen: true, beimSchliessen: 'zweit',
    zweitAktion: { label: 'Später', handler: (s) => { s(); weg = 'zweit'; } } });
  document.getElementById('m-x').onclick();
  assert.equal(weg, 'zweit');
});

test('[I02·Klasse] jeder Dialog ohne „Abbrechen“, der eine Zusage schuldet, sagt, was das ✕ tut', () => {
  const alle = aufrufeOhneAbbrechen(KERN);
  assert.ok(alle.length >= 40, 'Vorbedingung: die Aufrufe ohne Abbrechen gefunden (' + alle.length + ')');
  assert.deepEqual(ohneAngabe(KERN), []);
  for (const f of ['flowStandKonfliktDialog', 'flowFassungenDialog', 'flowSpeicherKonfliktDialog', '_whcAblehnenFragen']) {
    const a = KERN.indexOf('function ' + f + '(');
    assert.match(KERN.slice(a, KERN.indexOf('pflicht: true', a) + 13), /pflicht: true$/, f + ' ist Pflicht');
  }
  assert.match(KERN.slice(KERN.indexOf('function flowEinstellungen('), KERN.indexOf('function flowEinstellungen(') + 400), /wendetLiveAn: true/);
});

/* Die Ausnahme „Abbrechen neben einer Eingabe“ (`abbrechenBleibt`) steht nur an benannten Stellen; „Abbrechen“ geht dort den Weg des ✕.
   · _depotIdentitaetUndPasswortAbfragen: Zielbild 01, Fenster mit Schritten.
   · flowAnlassExport: U-5 Rest D94, Fuß „Abbrechen / Herausgeben“ im Fenster „Herausgeben“ des Anlasses (Desktop-Dummy 13.11.2026).
   · flowExportUebersicht reicht die Angabe nur durch (knoepfe.abbrechenBleibt). Jede weitere Stelle ist eine neue Ausnahme und braucht einen eigenen Eintrag. */
const ABBRECHEN_BLEIBT_STELLEN = ['_depotIdentitaetUndPasswortAbfragen', 'flowAnlassExport'];
function abbrechenBleibtStellen(kern) {
  const aus = [];
  const re = /\babbrechenBleibt: /g;
  let m;
  while ((m = re.exec(kern))) {
    const davor = kern.slice(0, m.index);
    const f = [...davor.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)\(/gm)].pop();
    aus.push(f ? f[1] : '(ohne Funktion)');
  }
  return aus;
}

test('[I02·Ausnahme] „Abbrechen“ neben einer Eingabe nur an den benannten Stellen; dort geht es den Weg des ✕', () => {
  assert.deepEqual([...new Set(abbrechenBleibtStellen(KERN))].sort(), [...ABBRECHEN_BLEIBT_STELLEN].sort());
  const { V, document } = ladeKern();
  const abbr = mitschreiben(document.getElementById('m-abbr'));
  V.ui.modal({ titel: 'Herausgeben', koerperHTML: '<label>Mit<input type="checkbox" id="h"></label>', primaerLabel: 'Herausgeben',
    onPrimaer: (s) => s(), abbrechenBleibt: true });
  assert.equal(abbr.entfernt, false, 'mit abbrechenBleibt bleibt „Abbrechen“ neben der Eingabe');
  assert.equal(document.getElementById('m-abbr').onclick, document.getElementById('m-x').onclick, '„Abbrechen“ geht den Weg des ✕');
});

test('[I02·Ausnahme·Rot-Beweis] eine weitere Stelle mit abbrechenBleibt fällt durch', () => {
  const gepflanzt = KERN.replace(/^function flowHerausgebenZentral\(/m, (t) => 'function _probeAusnahme() { return { abbrechenBleibt: true }; }\n' + t);
  assert.notEqual(gepflanzt, KERN, 'Vorbedingung');
  assert.notDeepEqual([...new Set(abbrechenBleibtStellen(gepflanzt))].sort(), [...ABBRECHEN_BLEIBT_STELLEN].sort());
  const ohneAnlass = KERN.replace(/\n    abbrechenBleibt: true,\n    aufFortfahren: bauen,/, '\n    aufFortfahren: bauen,');
  assert.notEqual(ohneAnlass, KERN, 'Vorbedingung: D94 steht im Kern');
  assert.notDeepEqual([...new Set(abbrechenBleibtStellen(ohneAnlass))].sort(), [...ABBRECHEN_BLEIBT_STELLEN].sort());
});

test('[I02·Rot-Beweis] der alte Baustein ohne ✕ und ein Aufrufer ohne Angabe fallen durch', () => {
  const ohneVorlage = KERN.replace(/<template id="modal-teile">[\s\S]*?<\/template>/, '');
  assert.notEqual(ohneVorlage, KERN, 'Vorbedingung: die Vorlage steht im Kern');
  assert.equal(vorlageFunde(ohneVorlage).length, 3, vorlageFunde(ohneVorlage).join(' | '));
  assert.equal(vorlageFunde(KERN + '<button>\u2715</button>').length, 1, 'das ✕ als Zeichen fällt auf');
  const ohne = KERN.replace("ohneAbbrechen: true, beimSchliessen: 'zweit'", 'ohneAbbrechen: true');
  assert.notEqual(ohne, KERN, 'Vorbedingung');
  assert.equal(ohneAngabe(ohne).length, 1);
});
