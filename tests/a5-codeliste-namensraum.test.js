'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Anbieter geht in die Listen-Kennung — die Namensraum-Lücke bei Code-Listen
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „nach der Entscheidungsrunde" (20.08.2026), Posten 4:
   *„Der Anbieter geht in die Listen-Kennung, derselbe Griff, der bei Feldern
   schon gebaut ist. Rot-Beweis: zwei Kammern mit gleichnamiger Liste, beide
   Listen bleiben unterscheidbar."*

   DIE LÜCKE, gemessen: `_tplFeldId` trennt zwei Anbieter seit U2-ADR-151
   (`tpl_<anbieter>__<slug>`, sobald ein fremder Anbieter den schlichten Namen
   belegt hat). `_tplCodeListeId` kannte den Anbieter nicht. Zwei Kammern mit
   einer Liste `fachgebiete` ergaben dieselbe `tpl_fachgebiete` — **die zweite
   wurde als `id-kollision` verworfen**, und die Vorlage der zweiten Kammer kam
   ohne ihre Codes an.

   UND DER GEFÄHRLICHERE TEIL: käme sie durch, lösten ihre Felder gegen das
   Vokabular der ERSTEN Kammer auf — ein Code aus fremdem System, der aussieht
   wie ein Treffer. Dieselbe Klasse, die A378 für den Datensatz benannt hat.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const KOELN = 'institution/kammer-koeln';
const BONN = 'institution/kammer-bonn';

function mitListeVon(V, anbieterId, systemId) {
  const d = V.getData() || V.leeresDepot();
  if (!Array.isArray(d.codeListen)) d.codeListen = [];
  d.codeListen.push({ systemId: systemId, anbieterId: anbieterId, eintraege: [{ code: 'a', anzeigeName: 'A' }] });
  V.setData(d);
}

function template(systemId) {
  return { codeListen: [{ systemId: systemId, eintraege: [{ code: 'x', anzeige: 'X' }] }] };
}

test('[Posten 4·tragend] zwei Kammern mit gleichnamiger Liste bleiben unterscheidbar', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  // Die erste Kammer reicht ihre Liste ein — sie bekommt die schlichte Kennung.
  const erste = V._templateCodeListenUebersetzen(template('fachgebiete'), KOELN);
  assert.equal(erste.codeListen.length, 1);
  assert.equal(erste.codeListen[0].systemId, 'tpl_fachgebiete');
  assert.equal(erste.codeListen[0].anbieterId, KOELN, 'der Anbieter reist mit der Liste');
  mitListeVon(V, KOELN, erste.codeListen[0].systemId);

  // Die zweite Kammer, gleicher Name, anderer Anbieter.
  const zweite = V._templateCodeListenUebersetzen(template('fachgebiete'), BONN);
  assert.equal(zweite.codeListen.length, 1, 'sie wird NICHT mehr verworfen: '
    + JSON.stringify(zweite.verworfeneCodeListen));
  assert.equal(zweite.codeListen[0].systemId, 'tpl_institution_kammer_bonn__fachgebiete');
  assert.notEqual(zweite.codeListen[0].systemId, erste.codeListen[0].systemId,
    'zwei Vokabulare, zwei Kennungen');
});

test('[Posten 4] wer zuerst da war, behält seine Kennung', () => {
  /* Sonst änderte sich eine bereits GESPEICHERTE Kennung nachträglich — und die Felder der
     ersten Kammer zeigten auf eine Liste, die es unter dem Namen nicht mehr gibt. */
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  mitListeVon(V, KOELN, 'tpl_fachgebiete');
  const nochmal = V._templateCodeListenUebersetzen(template('fachgebiete'), KOELN);
  assert.equal(nochmal.codeListen[0].systemId, 'tpl_fachgebiete',
    'derselbe Anbieter behält den schlichten Namen');
});

test('[Posten 4] die Feld-Auflösung folgt der neuen Kennung — nicht dem fremden Vokabular', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  mitListeVon(V, KOELN, 'tpl_fachgebiete');
  const tpl = {
    codeListen: [{ systemId: 'fachgebiete', eintraege: [{ code: 'x', anzeige: 'X' }] }],
    felder: [{ feldname: 'Fachgebiet', feldtyp: 'auswahl', bereich: 'education', gruppe: 'G',
      codeSystem: 'fachgebiete', codeWerte: [{ code: 'x', anzeige: 'X' }] }],
  };
  const cl = V._templateCodeListenUebersetzen(tpl, BONN);
  const u = V._templateFelderUebersetzen(tpl, 23, cl.map, BONN);
  assert.equal(u.feldDefinitionen.length, 1);
  assert.equal(u.feldDefinitionen[0].codeSystemId, 'tpl_institution_kammer_bonn__fachgebiete',
    'das Feld zeigt auf DIE EIGENE Liste, nicht auf die der anderen Kammer');
});

test('[Posten 4·Rot-Beweis] ohne den Anbieter fällt die zweite Liste wieder heraus', () => {
  /* Der Zustand vor diesem Griff, in derselben Anwendung nachgestellt: ohne Anbieter-Angabe
     entsteht zweimal dieselbe Kennung. Die Probe zeigt, dass die Trennung am ANBIETER hängt
     und nicht an etwas anderem, das zufällig mitläuft. */
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  mitListeVon(V, KOELN, 'tpl_fachgebiete');
  const ohne = V._templateCodeListenUebersetzen(template('fachgebiete'), null);
  assert.equal(ohne.codeListen[0].systemId, 'tpl_fachgebiete',
    'ohne Anbieter dieselbe Kennung wie die erste Kammer — genau der alte Zustand');
  assert.equal(ohne.codeListen[0].anbieterId, null, 'und ohne Anbieter am Eintrag');
});

test('[Posten 4·Gegenprobe] die Kollision INNERHALB einer Vorlage bleibt eine Kollision', () => {
  /* Zwei Listen desselben Anbieters mit demselben Slug sind ein Fehler der Vorlage, kein
     Namensraum-Problem — und sie werden weiter namentlich verworfen. Ohne diese Gegenprobe
     hiesse „unterscheidbar" womöglich „alles geht durch". */
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const doppelt = V._templateCodeListenUebersetzen({ codeListen: [
    { systemId: 'fachgebiete', eintraege: [{ code: 'a', anzeige: 'A' }] },
    { systemId: 'Fachgebiete', eintraege: [{ code: 'b', anzeige: 'B' }] },
  ] }, KOELN);
  assert.equal(doppelt.codeListen.length, 1);
  assert.equal(doppelt.verworfeneCodeListen.length, 1);
  assert.equal(doppelt.verworfeneCodeListen[0].grund, 'id-kollision');
});

test('[Posten 4] derselbe Griff wie bei den Feldern — nicht ein zweiter', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const q = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const listen = q.slice(q.indexOf('function _tplCodeListeId'), q.indexOf('function _templateCodeListenUebersetzen'));
  assert.match(listen, /_tplSlug\(anbieterId\)/, 'die Listen-Kennung benutzt dieselbe Slug-Bildung');
  assert.match(listen, /__/, 'und dieselbe Trennform wie `_tplFeldId`');
});
