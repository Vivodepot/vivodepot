'use strict';
/* Keine Ansicht ist ohne offenes Depot stumm (31.10.2026, Befund ANSICHT-OHNE-DEPOT-STUMM, Backlog 6.13 vom 31.08.2026):
   damals rendern fünf von vierzehn Ansichten ohne Depot nur ihre Überschrift. Gemessen am 31.10.2026 mit diesem Lader:
   übrig war die Ansicht „Prüftermine" — prueftermineSektionHTML() gab ohne Depot nichts zurück, die Seite trug nur den Titel.
   Die Probe öffnet jeden Zweig von renderContentInner() ohne Depot und verlangt mehr als die Überschrift. Ein neuer Zweig
   ohne Eintrag hier fällt auf (Wächter gegen die Klasse). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

const OEFFNEN = {
  verwaltung: (V) => V.oeffneVerwaltung(),
  kartenraster: (V) => V.oeffneEintragenUebersicht(),
  mappe: (V) => V.oeffneMappe(),
  prueftermine: (V) => V.oeffnePrueftermine(),
  'uebergabe-protokoll': (V) => V.oeffneUebergabeProtokoll(),
  'subdepot-konzept': (V) => V.oeffneSubKonzept(),
  lebenslage: (V) => V.oeffneLebenslage(Object.keys(V.BAUSTEIN_BY_ID)[0]),
  zusammenstellen: (V) => V.oeffneZusammenstellen(),
  situation: (V) => V.oeffneSituation(Object.keys(V.SITUATION_BY_ID)[0]),
  sektor: (V) => V.oeffneSektor('identity'),
};
// Zweige, die ohne Depot nicht erreichbar sind, je mit Grund.
const OHNE_DEPOT_UNERREICHBAR = {
  wizard: 'wizardLauf() startet nur mit offenem Depot und scheitert sonst still, ohne die Ansicht zu wechseln',
  anfrage: 'eine Anfrage kommt mit ihrer Datei herein und legt dabei zuerst ein Depot an',
  erledigen: 'die Seite „Erledigen“ öffnet erst nach dem ersten Anlegen eines Depots (betreteApp), ohne Depot führt kein Weg dorthin',
  'angehoerigen-blatt': 'ein Angehörigen-Blatt fällt ohne passendes Blatt auf den Bereich zurück (Zweig sektor)',
};

function textOhneUeberschrift(html) {
  return html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

test('[Ohne-Depot·Zweige] jeder Zweig von renderContentInner() steht in der Probe oder ist mit Grund unerreichbar', () => {
  const i = KERN.indexOf('\nfunction renderContentInner()');
  const koerper = KERN.slice(i, KERN.indexOf('\n}', i));
  const zweige = [...koerper.matchAll(/aktiveAnsicht === '([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(zweige.length >= 12, 'Vorbedingung: die Zweige werden gefunden: ' + zweige);
  for (const z of zweige) assert.ok(OEFFNEN[z] || OHNE_DEPOT_UNERREICHBAR[z], 'Zweig ' + z + ' ohne Probe und ohne Grund');
  assert.match(koerper, /renderSektor\(aktiverSektorId\);\s*$/, 'Vorbedingung: der Rückfall ist der Bereich (Zweig sektor)');
});

for (const [ansicht, oeffnen] of Object.entries(OEFFNEN)) {
  test('[Ohne-Depot] die Ansicht ' + ansicht + ' zeigt ohne Depot mehr als ihre Überschrift', () => {
    const { V, document } = ladeKern();
    V.setData(null);
    oeffnen(V);
    assert.equal(V.getViewState().aktiveAnsicht, ansicht, 'Vorbedingung: die Ansicht ist offen');
    const text = textOhneUeberschrift(document.getElementById('content').innerHTML || '');
    assert.ok(text.length >= 20, ansicht + ' ist ohne Depot stumm: ' + JSON.stringify(text));
  });
}

test('[Ohne-Depot·Prüftermine] ohne Depot steht dieselbe Einführung wie bei einem leeren Depot', () => {
  const html = (d) => { const { V, document } = ladeKern(); V.setData(d(V)); V.oeffnePrueftermine(); return document.getElementById('content').innerHTML; };
  const ohne = html(() => null);
  assert.match(ohne, /class="prueftermine-einfuehrung"/);
  assert.equal(ohne, html((V) => V.leeresDepot()));
});

test('[Ohne-Depot·Rot-Beweis] die Seite des alten Zustands (nur Titel, leere Sektion) gilt als stumm', () => {
  const alt = '<div class="content-narrow"><div class="bereich-kopf"><span class="ico"><svg><circle/></svg></span><h2>Prüftermine</h2></div></div>';
  assert.ok(textOhneUeberschrift(alt).length < 20, JSON.stringify(textOhneUeberschrift(alt)));
  const { V, document } = ladeKern();
  V.setData(null);
  V.oeffnePrueftermine();
  const jetzt = document.getElementById('content').innerHTML;
  assert.notEqual(jetzt.replace(/<section[\s\S]*<\/section>/, ''), jetzt, 'Gegenprobe: der Fix trägt die Sektion, ohne sie wäre die Seite der alte Zustand');
});
