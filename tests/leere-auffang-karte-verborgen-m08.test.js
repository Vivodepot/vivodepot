'use strict';
/* Befund M08 (HOCH, Vorschau v998, Entwicklertext): in „Meine Menschen“ stand eine leere Karte „Geburts-Assistent (nicht übernommen)“,
   EN „Guided birth entry (not carried over)“. Ihre Felder sind Auffangfelder (felderNurMitWert): sie erscheinen nur mit Wert.
   Gemessen 04.11.2026 am Kanon 24c58ec3c und 019c070f1: die Karte ist leer schon verborgen (renderSektor: eine Karte ohne sichtbares Feld trägt
   `hidden`), in der Vorschau wie im Depot. Diese Probe hält das fest, für jede Gruppenkarte in jedem Bereich (die Klasse): eine sichtbare
   Karte zeigt mindestens eine Feldzeile. Die Geburts-Karte erscheint, sobald eines ihrer Felder einen Wert trägt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Pruefpasswort-M08-lang-genug!';
const TITEL = 'Geburts-Assistent (nicht übernommen)';

/* Die Karten aus dem gerenderten HTML: Kopf-Tag, Titel und Körper je <details class="feldgruppen-karte">. */
function karten(html) {
  const aus = [];
  // Der Körper reicht bis zur nächsten Karte: eine Karte kann selbst Aufklapper tragen (details.hinweis-lang), deren </details> nicht ihr Ende ist.
  const re = /<details class="feldgruppen-karte"([^>]*)>([\s\S]*?)(?=<details class="feldgruppen-karte"|$)/g;
  let m;
  while ((m = re.exec(html))) {
    const t = /<span class="feldgruppen-karte-titel">([^<]*)<\/span>/.exec(m[2]);
    aus.push({ verborgen: /\shidden(\s|=|$)/.test(m[1]), titel: t ? t[1].trim() : '?', koerper: m[2] });
  }
  return aus;
}

function leereSichtbareKarten(V, document) {
  const aus = [];
  for (const s of V.SEKTOREN) {
    V.renderSektor(s.id);
    for (const k of karten(document.getElementById('content').innerHTML)) {
      if (!k.verborgen && !/class="feld-zeile|data-feld/.test(k.koerper)) aus.push(s.id + ': ' + k.titel);
    }
  }
  return aus;
}

function geburtsKarte(document) {
  return karten(document.getElementById('content').innerHTML).find((k) => k.titel === TITEL);
}

test('[M08] leeres Depot: keine sichtbare Gruppenkarte ohne Feldzeile, in keinem Bereich', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  assert.deepEqual(leereSichtbareKarten(V, document), []);
  V.renderSektor('people');
  const k = geburtsKarte(document);
  assert.ok(!k || k.verborgen, 'die Geburts-Karte ist leer verborgen');
});

test('[M08] mit Wert erscheint die Geburts-Karte samt Feld', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('people', 'guidedBirthEntryChildsNameNot', 'Lena');
  V.renderSektor('people');
  const k = geburtsKarte(document);
  assert.ok(k && !k.verborgen, 'Karte sichtbar');
  assert.ok(k.koerper.includes('Lena'), 'mit dem Wert');
});

test('[M08·Rot-Beweis] eine sichtbare Karte ohne Feldzeile wird gefunden', () => {
  const html = '<details class="feldgruppen-karte" open><summary><span class="feldgruppen-karte-titel">Leer</span></summary><div class="feldgruppen-karte-koerper"></div></details>'
    + '<details class="feldgruppen-karte" hidden><summary><span class="feldgruppen-karte-titel">Verborgen</span></summary></details>';
  const leer = karten(html).filter((k) => !k.verborgen && !/class="feld-zeile|data-feld/.test(k.koerper)).map((k) => k.titel);
  assert.deepEqual(leer, ['Leer']);
});
