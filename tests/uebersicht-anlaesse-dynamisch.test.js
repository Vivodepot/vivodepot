'use strict';
/* Anlässe der Übersicht und der Seitenleiste nach dem, was ausgefüllt und benutzt ist (17.11.2026).
   Entschieden 17.11.2026. Regel an EINER Stelle (_anlaesseFuerLeiste): zuerst der zuletzt gewählte Anlass, dann die Anlässe mit den
   meisten eigenen Angaben, dann die feste Startauswahl Arzttermin, Geburt eines Kindes, Umzug oder Haushaltsauflösung,
   Vorsorge treffen. Nie ein Anlass ohne konkreten Anlass (Klasse 0) und nie „Ein Todesfall ist eingetreten“.
   Gezählt wird aus allen Anlässen: Katalog, Situationen (Vorlagen, Anwendungen) und über kernAPI.registriereAnlass angemeldete. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frisch() {
  const k = ladeKern({ backen: true });
  await k.V.depotAnlegen('anlaesse-dynamisch-pw-2026!');
  k.V.betreteApp();
  return k.V;
}
const ids = (V, n) => V._anlaesseFuerLeiste(n).map((a) => a.id);

test('[Anlässe·Start] ein frisches Depot zeigt die feste Startauswahl', async () => {
  const V = await frisch();
  assert.deepEqual(ids(V, 4), ['arzt', 'geburt', 'umzug', 'eigene-vorsorge']);
});

test('[Anlässe·Angaben] ein Anlass mit eigenen Angaben steht vor der Startauswahl, der mit den meisten vorn', async () => {
  const V = await frisch();
  V.situationFeldSetzen('pflegeheim', 'ph_einrichtung', 'Haus Linde');
  V.situationFeldSetzen('geburt', 'geburt_datum', '2021-05-06');
  V.situationFeldSetzen('geburt', 'geburt_klinik', 'Klinikum Beispielstadt');
  assert.deepEqual(ids(V, 4), ['geburt', 'pflegeheim', 'arzt', 'umzug']);
});

test('[Anlässe·Zuletzt] der zuletzt gewählte Anlass steht an erster Stelle', async () => {
  const V = await frisch();
  V.situationFeldSetzen('geburt', 'geburt_datum', '2021-05-06');
  V.getData()._letzterAnlass = 'krankenhaus';
  assert.deepEqual(ids(V, 4), ['krankenhaus', 'geburt', 'arzt', 'umzug']);
});

test('[Anlässe·Nie] Klasse 0 und „Ein Todesfall ist eingetreten“ stehen nie unter den Anlässen', async () => {
  for (const letzter of ['todesfall', 'einfach-so', 'umsehen']) {
    const V = await frisch();
    V.getData()._letzterAnlass = letzter;
    assert.deepEqual(ids(V, 4), ['arzt', 'geburt', 'umzug', 'eigene-vorsorge'], letzter);
  }
});

test('[Anlässe·Modul] ein über kernAPI angemeldeter Anlass zählt mit', async () => {
  const V = await frisch();
  V.kernAPI.registriereAnlass({ id: 'probe-modul-anlass', klasse: 1, icon: 'star', label: 'Probe-Anlass', ziel: { bereiche: ['identity'] } });
  V.getData()._letzterAnlass = 'probe-modul-anlass';
  assert.equal(ids(V, 4)[0], 'probe-modul-anlass');
});

test('[Anlässe·Eine Stelle] die Seitenleiste zeigt die ersten drei derselben Reihenfolge wie die Übersicht', async () => {
  const V = await frisch();
  V.situationFeldSetzen('pflegeheim', 'ph_einrichtung', 'Haus Linde');
  assert.deepEqual(ids(V, 3), ids(V, 4).slice(0, 3));
  const html = V._uebersichtHTML();
  const inUebersicht = [...html.matchAll(/class="uebersicht-kachel" data-anlass="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(inUebersicht, ids(V, 4));
});

test('[Anlässe·Rot-Beweis] die bloße Katalogreihenfolge besteht [Anlässe·Angaben] nicht', async () => {
  /* So zeigte die Leiste die Anlässe vor dieser Regel: die ersten sichtbaren Kacheln in der Reihenfolge des Katalogs.
     Mit denselben Angaben wie in [Anlässe·Angaben] ergibt das eine andere Folge — die Probe oben hätte sie gefangen. */
  const V = await frisch();
  V.situationFeldSetzen('pflegeheim', 'ph_einrichtung', 'Haus Linde');
  V.situationFeldSetzen('geburt', 'geburt_datum', '2021-05-06');
  V.situationFeldSetzen('geburt', 'geburt_klinik', 'Klinikum Beispielstadt');
  const katalogFolge = V.anlaesseAlle()
    .filter((a) => Number.isInteger(a.klasse) && a.klasse >= 1 && a.klasse <= 3 && a.id !== 'todesfall' && V._anlassSichtbar(a))
    .map((a) => a.id);
  assert.notDeepEqual(katalogFolge.slice(0, 4), ['geburt', 'pflegeheim', 'arzt', 'umzug']);
  assert.deepEqual(ids(V, 4), ['geburt', 'pflegeheim', 'arzt', 'umzug']);
});
