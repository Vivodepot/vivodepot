'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   „Herausgegeben“ auf allen Wegen (25.10.2026, U2-ADR-120)
   ─────────────────────────────────────────────────────────────────────────────
   Jeder Weg, auf dem ein Auszug an eine Stelle geht, fragt danach freiwillig nach einem Eintrag in „Herausgegeben“ —
   bis hierher taten das nur drei (Registry-Formate, FHIR-IPS, SMART Health Link); der Anlass-Auszug, über den eine
   Pro-Vertretung ihren Auszug bekommt, hinterließ keinen. Geprüft:
     · die gemeinsame Stelle fragt nach einer geglückten Ausgabe, nicht nach Abbruch, Vorschau oder mit Vereinbarung;
     · was die App vom Weg kennt (Empfänger, Umfang), steht im Feld und bleibt änderbar; „Später“ legt nichts an;
     · ein echter Weg (Erbschein-XML, Datei eines Empfängerkreises) öffnet die Nachfrage nach der Datei;
     · der Wächter der Ausgabewege hält beide Richtungen: jede Weitergabe fragt, kein Notfall-Weg fragt (Rot-Beweise).
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ausgabewegePruefen, nachfragePruefen } = require('../tools/ausgabewege-pruefen.js');
const { AUSGABEWEGE_EINORDNUNG } = require('../tools/lib/ausgabewege-einordnung.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const PW = 'anker-pw-herausgegeben-123';

// Der Test-DOM kennt jede statische ID der Quelle — offen ist die Nachfrage, wenn der Dialog ihre Felder trägt.
const inhalt = (document) => String((document.getElementById('modal-inhalt') || {}).innerHTML || '');
const offen = (document) => inhalt(document).includes('id="up-empfaenger"');

test('[Herausgegeben] die gemeinsame Stelle fragt nach einer geglückten Ausgabe, mit Vorbelegung', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V._nachWeitergabeNachfragen('anlass:pro-vertretung', 'download', null, { empfaenger: 'Frau Berger', umfang: 'Vertretung' });
  assert.ok(offen(document), 'Nachfrage offen');
  assert.match(inhalt(document), /id="up-empfaenger" class="eingabe" type="text" autocomplete="off" value="Frau Berger">/);
  assert.match(inhalt(document), /id="up-umfang" class="eingabe" type="text" autocomplete="off" value="Vertretung">/);
  assert.match(inhalt(document), /id="up-zweck" class="eingabe" type="text" autocomplete="off">/, 'der Zweck kommt von der Person');
  document.getElementById('up-empfaenger').value = 'Herr Berger';   // änderbar
  document.getElementById('up-umfang').value = 'Vertretung';
  document.getElementById('up-zweck').value = 'Urlaubsvertretung';
  await document.getElementById('m-ok').onclick();
  const e = V.getData().uebergabeProtokoll;
  assert.equal(e.length, 1);
  assert.equal(e[0].empfaenger, 'Herr Berger');
  assert.equal(e[0].umfang, 'Vertretung');
  assert.equal(e[0].herkunft, 'export:anlass:pro-vertretung');
});

test('[Herausgegeben] keine Nachfrage nach Abbruch, in der Vorschau, ohne Ausgabe oder mit Vereinbarung', async () => {
  for (const [ergebnis, vb] of [['abgebrochen', null], ['vorschau', null], [null, null], ['download', { kennung: 'v1' }]]) {
    const { V, document } = ladeKern();
    await V.depotAnlegen(PW);
    V._nachWeitergabeNachfragen('bereich-pdf:health', ergebnis, vb, { umfang: 'Gesundheit' });
    assert.equal(offen(document), false, 'keine Nachfrage bei ' + JSON.stringify([ergebnis, vb]));
  }
});

test('[Herausgegeben] ohne Vorbelegung bleiben die Felder leer wie bisher, und Werte werden maskiert', async () => {
  const a = ladeKern();
  await a.V.depotAnlegen(PW);
  a.V._nachWeitergabeNachfragen('shl', 'gesendet', null);
  assert.match(inhalt(a.document), /id="up-empfaenger" class="eingabe" type="text" autocomplete="off">/);
  const b = ladeKern();
  await b.V.depotAnlegen(PW);
  b.V._nachWeitergabeNachfragen('anfrage-antwort', 'download', null, { empfaenger: 'A "B" <c>' });
  assert.match(inhalt(b.document), /value="A &quot;B&quot; &lt;c&gt;"/);
});

test('[Herausgegeben] „Später“ legt keinen Eintrag an', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V._nachWeitergabeNachfragen('situation-pdf', 'download', null, { umfang: 'Vertretung' });
  document.getElementById('m-zweit').onclick();
  assert.equal(V.getData().uebergabeProtokoll.length, 0);
});

test('[Herausgegeben] ein Auszug aus JSON und PDF fragt einmal, wenn eine Datei hinausging — nicht bei Schriftlücke', async () => {
  const fall = async (ergebnisse) => {
    const { V, document } = ladeKern();
    await V.depotAnlegen(PW);
    await V._nachAuszugNachfragen('zusammenstellung', ergebnisse.map((w) => Promise.resolve(w)), null, { umfang: 'Mappe' });
    return offen(document);
  };
  assert.equal(await fall(['download', 'download']), true);
  assert.equal(await fall([null, 'download']), true, 'nur das PDF ging hinaus');
  assert.equal(await fall(['abgebrochen', 'kein-jspdf']), false);
  assert.equal(await fall(['download', 'schrift-luecke']), false, 'der Hinweis zur Schriftlücke bleibt sichtbar');
});

test('[Herausgegeben·Weg] die Erbschein-Vorbereitung fragt nach der Datei', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const weg = await V.flowErbscheinXmlSichern();
  assert.notEqual(weg, 'abgebrochen');
  assert.ok(offen(document), 'Nachfrage nach der XML-Datei');
});

test('[Herausgegeben·Weg] die Datei eines Empfängerkreises gibt `vb` an den Aufrufer, der Kreis-Name belegt den Empfänger vor', () => {
  const rumpf = KERN.slice(KERN.indexOf('function flowEmpfaengerkreisDatei('), KERN.indexOf('function flowEmpfaengerkreisQr('));
  assert.match(rumpf, /_nachWeitergabeNachfragen\('empfaengerkreis', r && r\.weg, r && r\.vb, \{ empfaenger: kreis\.name \}\)/);
  const herausgeben = KERN.slice(KERN.indexOf('async function empfaengerDateiHerausgeben('), KERN.indexOf('async function empfaengerDateiHerausgeben(') + 1200);
  assert.match(herausgeben, /return \{ weg, felder, dateiname, vb \};/);
});

test('[Herausgegeben·Wächter] jede Weitergabe-Zeile sagt, wo sie fragt, und der Kern hält es ein', () => {
  assert.deepEqual(nachfragePruefen(KERN), []);
  assert.equal(ausgabewegePruefen(KERN).ok, true);
  const weitergabe = Object.entries(AUSGABEWEGE_EINORDNUNG).filter(([, z]) => z.klasse === 'weitergabe');
  assert.ok(weitergabe.length >= 18, 'die Weitergabe-Wege sind gezählt, nicht vermutet');
  assert.deepEqual(weitergabe.filter(([, z]) => z.nachfrage && z.nachfrage.ohne).map(([n]) => n), [], 'zum Start keine Ausnahme');
  for (const [n, z] of Object.entries(AUSGABEWEGE_EINORDNUNG)) {
    if (z.klasse === 'notfall') assert.equal(z.nachfrage, undefined, n + ' fragt nie');
  }
});

test('[Herausgegeben·Wächter·Rot-Beweis] ein Weitergabe-Weg ohne Aufruf wird rot', () => {
  const ohne = KERN.replace("_nachWeitergabeNachfragen('bereich-pdf:' + sektorId", "void ('bereich-pdf:' + sektorId");
  assert.notEqual(ohne, KERN, 'die Ersetzung griff');
  assert.deepEqual(nachfragePruefen(ohne), ['flowBereichPdf: ruft die Nachfrage nicht']);
});

test('[Herausgegeben·Wächter·Rot-Beweis] ein Einstieg ohne Aufruf wird rot, auch über `in`', () => {
  const ohne = KERN.replace("_nachWeitergabeNachfragen('empfaengerkreis', r && r.weg", "void ('empfaengerkreis', r && r.weg");
  assert.notEqual(ohne, KERN);
  assert.deepEqual(nachfragePruefen(ohne), ['empfaengerDateiHerausgeben: Einstieg flowEmpfaengerkreisDatei ruft die Nachfrage nicht']);
});

test('[Herausgegeben·Wächter·Rot-Beweis] ein Notfall-Weg mit Nachfrage wird rot', () => {
  const kopf = 'function flowNotfallkartePdf(';
  const i = KERN.indexOf(kopf);
  assert.ok(i > 0);
  const auf = KERN.indexOf('{', i) + 1;
  const mit = KERN.slice(0, auf) + "\n  _nachWeitergabeNachfragen('notfallkarte', 'download', null);" + KERN.slice(auf);
  assert.deepEqual(nachfragePruefen(mit), ['flowNotfallkartePdf: Notfall-Weg mit Nachfrage']);
});

test('[Herausgegeben·Wächter·Rot-Beweis] eine Weitergabe-Zeile ohne Angabe wird rot, eine Angabe außerhalb der Weitergabe auch', () => {
  const t = Object.assign({}, AUSGABEWEGE_EINORDNUNG, {
    flowSituationPdf: Object.assign({}, AUSGABEWEGE_EINORDNUNG.flowSituationPdf, { nachfrage: undefined }),
    flowVollDepotPdf: Object.assign({}, AUSGABEWEGE_EINORDNUNG.flowVollDepotPdf, { nachfrage: 'selbst' }),
  });
  assert.deepEqual(nachfragePruefen(KERN, t), ['flowSituationPdf: ohne Angabe zur Nachfrage', 'flowVollDepotPdf: Nachfrage außerhalb der Weitergabe']);
});
