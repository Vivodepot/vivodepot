'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A425 / U2-ADR-167 (23.08.2026) — die leise Prüf-Rhythmus-Ansage
   ────────────────────────────────────────────────────────────────────────
   „Drei Entscheidungen", Punkt 1: ändert eine Institution den
   vorgeschlagenen Prüf-Rhythmus eines Modul-Feldes, erfährt die Bürgerin
   davon — leise, an der Feldzeile selbst, kein Hinweis beim Öffnen, keine
   Sammelmeldung, kein Zähler.

   Rot-Beweis-Pflicht (A348 Zug 4): [Rot-Beweis] markiert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'a425-pw';

async function frischesDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  return V;
}

test('[A425·Vorbedingung] _templateFeldZuModell reicht pruefIntervallMonate jetzt durch', () => {
  const V = require('./load-kern.js').ladeKern().V;
  const g = { feldname: 'Testfeld', bereich: 'health', feldtyp: 'text', pruefIntervallMonate: 6 };
  const r = V._templateFeldZuModell(g, 67, null, 'kammer/test');
  assert.equal(r.def.pruefIntervallMonate, 6);
});

test('[A425·Vorbedingung] _templateDefAlsFeld reicht pruefIntervallMonate an den Renderer durch', () => {
  const V = require('./load-kern.js').ladeKern().V;
  const feld = V._templateDefAlsFeld({ feldId: 'tpl_x', typ: 'text', label: 'X', pruefIntervallMonate: 12 });
  assert.equal(feld.pruefIntervallMonate, 12);
});

test('[A425] eine nicht-positive oder fehlende Zahl wird NICHT durchgereicht', () => {
  const V = require('./load-kern.js').ladeKern().V;
  assert.equal(V._templateDefAlsFeld({ feldId: 'x', typ: 'text', label: 'X', pruefIntervallMonate: 0 }).pruefIntervallMonate, undefined);
  assert.equal(V._templateDefAlsFeld({ feldId: 'x', typ: 'text', label: 'X', pruefIntervallMonate: -1 }).pruefIntervallMonate, undefined);
  assert.equal(V._templateDefAlsFeld({ feldId: 'x', typ: 'text', label: 'X' }).pruefIntervallMonate, undefined);
});

test('[A425] eine neuere Fassung DESSELBEN Anbieters mit geändertem Prüf-Rhythmus merkt sich den alten Wert', async () => {
  const V = await frischesDepot();
  // `_vorlageVersion` stammt normalerweise aus `_templateFelderUebersetzen` (template.version) —
  // hier direkt gesetzt, weil dieser Test die untere Übersetzungsstelle isoliert prüft.
  const g1 = { feldname: 'Testfeld', bereich: 'health', feldtyp: 'text', pruefIntervallMonate: 6, _vorlageVersion: 1 };
  const def1 = V._templateFeldZuModell(g1, 67, null, 'kammer/test').def;
  const d = V.getData();
  d.feldDefinitionen = [def1];
  d.importierteVorlagen = [{ id: 'x', vorlageId: 'vorlage-x', vorlageVersion: 1,
    anbieterId: 'kammer/test', sektorId: 'health', feldIds: [def1.feldId] }];
  V.setData(d);

  const g2 = { feldname: 'Testfeld', bereich: 'health', feldtyp: 'text', pruefIntervallMonate: 12, _vorlageVersion: 2 };
  const def2 = V._templateFeldZuModell(g2, 67, null, 'kammer/test').def;
  const erg = V.importAnwenden({ signiert: true, zeilen: [], listen: [], register: [], verworfeneFelder: [],
    feldDefinitionen: [def2], vorlageId: 'vorlage-x', vorlageVersion: 2, anbieterId: 'kammer/test' }, {});
  assert.equal(erg.defAktualisiert, 1);

  const neueDef = V.getData().feldDefinitionen.find((x) => x.feldId === def1.feldId);
  assert.equal(neueDef.pruefIntervallMonate, 12, 'der neue Vorschlag gilt');
  assert.equal(neueDef._pruefIntervallVorherigerWert, 6, 'der alte Vorschlag ist gemerkt');
});

test('[A425·Gegenprobe] eine Aktualisierung OHNE geänderten Prüf-Rhythmus merkt sich nichts', async () => {
  const V = await frischesDepot();
  const g1 = { feldname: 'Testfeld', bereich: 'health', feldtyp: 'text', pruefIntervallMonate: 6, _vorlageVersion: 1 };
  const def1 = V._templateFeldZuModell(g1, 67, null, 'kammer/test').def;
  const d = V.getData();
  d.feldDefinitionen = [def1];
  d.importierteVorlagen = [{ id: 'x', vorlageId: 'vorlage-x', vorlageVersion: 1,
    anbieterId: 'kammer/test', sektorId: 'health', feldIds: [def1.feldId] }];
  V.setData(d);

  const g2 = { feldname: 'Testfeld', bereich: 'health', feldtyp: 'text', pruefIntervallMonate: 6, hilfetext: 'geändert', _vorlageVersion: 2 };
  const def2 = V._templateFeldZuModell(g2, 67, null, 'kammer/test').def;
  const erg = V.importAnwenden({ signiert: true, zeilen: [], listen: [], register: [], verworfeneFelder: [],
    feldDefinitionen: [def2], vorlageId: 'vorlage-x', vorlageVersion: 2, anbieterId: 'kammer/test' }, {});
  assert.equal(erg.defAktualisiert, 1, 'Vorbedingung: die Aktualisierung selbst muss greifen');

  const neueDef = V.getData().feldDefinitionen.find((x) => x.feldId === def1.feldId);
  assert.equal(neueDef._pruefIntervallVorherigerWert, undefined, 'unveränderter Rhythmus hinterlässt keine Spur');
});

test('[A425] feldPruefIntervallHinweisHTML zeigt die leise Ansage — geänderter Wert', () => {
  const V = require('./load-kern.js').ladeKern().V;
  const feld = { id: 'tpl_x', pruefIntervallMonate: 12, _pruefIntervallVorherigerWert: 6 };
  const html = V.feldPruefIntervallHinweisHTML(feld.id, feld);
  assert.match(html, /alle 6 Monate/);
  assert.match(html, /alle 12 Monate/);
  assert.match(html, /feld-pruefintervall-hinweis/);
});

test('[A425] feldPruefIntervallHinweisHTML zeigt eine andere Ansage, wenn der Vorschlag entfallen ist', () => {
  const V = require('./load-kern.js').ladeKern().V;
  const feld = { id: 'tpl_x', _pruefIntervallVorherigerWert: 6 };
  const html = V.feldPruefIntervallHinweisHTML(feld.id, feld);
  assert.match(html, /alle 6 Monate/);
  assert.doesNotMatch(html, /undefined/);
});

test('[A425·Rot-Beweis] ohne _pruefIntervallVorherigerWert bleibt die Zeile leer — die Ansage ist an den Zustand gebunden', () => {
  const V = require('./load-kern.js').ladeKern().V;
  assert.equal(V.feldPruefIntervallHinweisHTML('tpl_x', { id: 'tpl_x', pruefIntervallMonate: 12 }), '');
  assert.equal(V.feldPruefIntervallHinweisHTML('tpl_x', { id: 'tpl_x' }), '');
});

test('[A425] feldZeileHTML rendert die Ansage an genau der Feldzeile, wenn gesetzt', () => {
  const V = require('./load-kern.js').ladeKern().V;
  const feld = { id: 'tpl_x', typ: 'text', label: 'Testfeld', pruefIntervallMonate: 12, _pruefIntervallVorherigerWert: 6 };
  const html = V.feldZeileHTML(feld, '', null, false, false);
  assert.match(html, /feld-pruefintervall-hinweis/);
  assert.match(html, /alle 12 Monate/);
});

test('[A425·Gegenprobe] feldZeileHTML rendert nichts Zusätzliches, wenn kein Wechsel vorliegt', () => {
  const V = require('./load-kern.js').ladeKern().V;
  const feld = { id: 'tpl_x', typ: 'text', label: 'Testfeld', pruefIntervallMonate: 12 };
  const html = V.feldZeileHTML(feld, '', null, false, false);
  assert.doesNotMatch(html, /feld-pruefintervall-hinweis/);
});

test('[A425] die Anzeige-Funktion ist rein — zweimal aufrufen ergibt zweimal dasselbe, keine Mutation', () => {
  const V = require('./load-kern.js').ladeKern().V;
  const feld = { id: 'tpl_x', pruefIntervallMonate: 12, _pruefIntervallVorherigerWert: 6 };
  const vorher = JSON.stringify(feld);
  const a = V.feldPruefIntervallHinweisHTML(feld.id, feld);
  const b = V.feldPruefIntervallHinweisHTML(feld.id, feld);
  assert.equal(a, b);
  assert.equal(JSON.stringify(feld), vorher, 'das Feld-Objekt selbst bleibt unverändert');
});
