'use strict';
/* Demo „Fragen am Eintrag“ (06.11.2026): Gerda Mustermann bereitet zwei gleichrangige Gespräche vor, bei der Bank und in der
   Apotheke. Sie notiert eine Frage am Eintrag, nimmt ein Blatt je Gegenüber mit und trägt die Antwort mit Quelle und Datum ein.
   Der Kern verschickt nichts.
   Gehalten wird:
   · (a) das Blatt für die Bank trägt die Bankfrage, nicht die Apothekenfrage und keine Medikation;
   · (b) das Blatt für die Apotheke trägt die Medikation und die Apothekenfrage, nicht die Bankfrage;
   · (c) der Antwort-Dialog im Antwort-Schritt nennt Quelle und Datum, und eine Antwort ohne beides weist der Kern ab;
   · (d) demoBauen lehnt einen unbekannten Adressaten und ein unbekanntes Frage-Ziel ab;
   · (f) die Medikation steht erst nach der Freigabe in der Übersicht auf dem Apothekenblatt (eigener Schritt davor);
   · (e) Szenario und Depot nennen keine staatliche Gesundheitsakte (Rahmen: Vorbereitung eines Gesprächs auf Augenhöhe);
   · (g) in der Vorführung trägt das Blatt zum Drucken oben einen Chip „Beispiel · erfundene Person“, außerhalb der Vorführung nicht (08.11.2026).
   Die Blätter werden über die gebackene Station gefahren, so wie die Demo sie zeigt.
   Rot-Beweis: gegen den Fragen-Wagen des Kerns ohne die Demo fallen (a) bis (d). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _standardProduktBaken } = require('./load-kern.js');
const D = require('../tools/demo-bauen.js');

const REPO = path.join(__dirname, '..');
const NAME = 'fragen-am-eintrag';
const BANKFRAGE = 'Girokonto ab Januar';
const APOTHEKENFRAGE = 'Ibuprofen';
const MEDIKATION = 'Apixaban';
let _produkt = null;
const produktText = () => (_produkt || (_produkt = _standardProduktBaken(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'))));
const lesenText = () => fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
const bauen = (szenario) => D.demoBauen({ szenario, produktText: produktText(), lesenText: lesenText(), sprache: 'de' });
let _demo = null;
const demo = () => (_demo || (_demo = bauen(NAME)));

function block(text, marke) {
  const m = new RegExp('const ' + marke + ' = (\\{[\\s\\S]*?\\});\\n').exec(text);
  assert.ok(m, 'Block ' + marke + ' gebacken');
  return JSON.parse(m[1]);
}

// Der Kern der Seite eines Schritts, im Vorführ-Zustand; Dialoge werden mitgeschrieben statt gezeichnet.
function kernFuer(nr) {
  const d = demo();
  const seite = d.seiten[d.schritte.find((s) => s.nr === nr).seite];
  const station = block(seite, 'AB_WERK_SHOWCASE').stationen.find((s) => s.nr === nr);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-demo-fragen-'));
  const datei = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(datei, seite, 'utf8');
  let V, doc;
  try { ({ V, document: doc } = require('./produkt-html-erzeugen.js').kernAus(datei, { Blob })); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const dialoge = [];
  V.ui.modal = (o) => { dialoge.push(o); return () => {}; };
  V.ui.toast = () => {};
  V.vorfuehrungDepotErzeugen();
  return { V, doc, dialoge, station };
}

// Das Blatt, das die Station zeigt: derselbe Inhalt, den flowGespraechsblatt für den Adressaten der Station rendert.
// Das Blatt so, wie die Station es zeigt: über die Ausgabe der Vorführung, mit der Freigabe der Station (oder einer geänderten).
async function blattFuer(nr, aendern) {
  const { V, dialoge, station } = kernFuer(nr);
  assert.equal(station.ansicht, 'gespraechsblatt', 'Vorbedingung: Schritt ' + nr + ' zeigt ein Gesprächsblatt');
  assert.equal(station.ziel, undefined, 'das Blatt selbst, nicht die Freigabe davor');
  assert.ok(station.adressat, 'die Station nennt ihren Adressaten');
  await V._vorfuehrungGespraechsblatt(aendern ? aendern({ ...station }) : station);
  const d = dialoge.at(-1);
  assert.ok(d, 'das Blatt steht');
  return String(d.titel || '') + '\n' + String(d.koerperHTML || '');
}

const schrittNr = (pred) => D.szenarioLaden(NAME).schritte.findIndex(pred) + 1;

test('[Demo · Fragen] (a) das Blatt für die Bank trägt nur die Bankfrage, keine Medikation', async () => {
  const nr = schrittNr((s) => s.ansicht === 'gespraechsblatt' && !s.ziel && s.adressat === 'bank');
  assert.ok(nr > 0, 'Vorbedingung: ein Schritt mit dem Blatt für die Bank');
  const blatt = await blattFuer(nr);
  assert.ok(blatt.includes(BANKFRAGE), 'die Bankfrage steht darauf');
  assert.ok(!blatt.includes(APOTHEKENFRAGE), 'die Apothekenfrage fehlt');
  assert.ok(!blatt.includes(MEDIKATION), 'die Medikation fehlt');
});

test('[Demo · Fragen] (b) das Blatt für die Apotheke trägt Medikation und Apothekenfrage, nicht die Bankfrage', async () => {
  const nr = schrittNr((s) => s.ansicht === 'gespraechsblatt' && !s.ziel && s.adressat === 'apotheke');
  assert.ok(nr > 0, 'Vorbedingung: ein Schritt mit dem Blatt für die Apotheke');
  const blatt = await blattFuer(nr);
  assert.ok(blatt.includes(APOTHEKENFRAGE), 'die Apothekenfrage steht darauf');
  assert.ok(blatt.includes(MEDIKATION), 'die Medikation steht darauf');
  assert.ok(!blatt.includes(BANKFRAGE), 'die Bankfrage fehlt');
});

test('[Demo · Fragen] (c) der Antwort-Schritt öffnet die Apothekenfrage zum Antworten; eine Antwort ohne Quelle oder Datum weist der Kern ab', () => {
  const nr = schrittNr((s) => s.ansicht === 'frage');
  const { V, station } = kernFuer(nr);
  assert.equal(station.ziel, 'antworten');
  assert.deepEqual([station.bereich, station.feld], ['health', 'medicationOngoing']);
  const offen = V.fragenOffen({ bereich: station.bereich, feld: station.feld });
  assert.equal(offen.length, 1, 'eine offene Frage an der Medikation');
  assert.ok(offen[0].frage.includes(APOTHEKENFRAGE));
  assert.throws(() => V.frageBeantworten(offen[0].id, { antwort: 'x', antwortAm: '2026-11-07' }), /antwortVon/);
  assert.throws(() => V.frageBeantworten(offen[0].id, { antwort: 'x', antwortVon: offen[0].an }), /antwortAm/);
  assert.equal(V.fragenOffen({ bereich: station.bereich, feld: station.feld }).length, 1, 'nichts gespeichert');
});

test('[Demo · Fragen] (f) die Medikation steht erst nach der Freigabe in der Übersicht auf dem Blatt der Apotheke', async () => {
  const sz = D.szenarioLaden(NAME);
  const nrAuswahl = schrittNr((s) => s.ansicht === 'gespraechsblatt' && s.ziel === 'freigabe');
  const nrBlatt = schrittNr((s) => s.ansicht === 'gespraechsblatt' && !s.ziel && s.adressat === 'apotheke');
  assert.ok(nrAuswahl > 0 && nrBlatt === nrAuswahl + 1, 'die Freigabe ist ein eigener Schritt direkt vor dem Blatt der Apotheke');
  assert.deepEqual(sz.schritte[nrAuswahl - 1].freigabe, ['health.medicationOngoing']);
  assert.deepEqual(sz.schritte[nrBlatt - 1].freigabe, sz.schritte[nrAuswahl - 1].freigabe, 'das Blatt trägt genau die Freigabe der Übersicht');
  const ohne = await blattFuer(nrBlatt, (st) => { delete st.freigabe; return st; });
  assert.ok(!ohne.includes(MEDIKATION), 'ohne Freigabe steht die Medikation nicht darauf');
  assert.ok(ohne.includes(APOTHEKENFRAGE), 'die Frage steht trotzdem darauf');
  const sb = D.szenarioLaden(NAME);
  sb.schritte[nrAuswahl - 1].freigabe = ['gibt.esnicht'];
  assert.throws(() => bauen(sb), /Freigabe „gibt.esnicht“/);
});

test('[Demo · Fragen] (d) demoBauen lehnt einen unbekannten Adressaten und ein unbekanntes Frage-Ziel ab', () => {
  const sz1 = D.szenarioLaden(NAME);
  sz1.schritte[schrittNr((s) => s.adressat === 'bank') - 1].adressat = 'niemand';
  assert.throws(() => bauen(sz1), /Adressat „niemand“/);
  const sz2 = D.szenarioLaden(NAME);
  sz2.schritte[schrittNr((s) => s.ansicht === 'frage') - 1].ziel = 'irgendwas';
  assert.throws(() => bauen(sz2), /Frage-Ziel „irgendwas“/);
});

test('[Demo · Fragen] (e) Szenario und Depot nennen keine staatliche Gesundheitsakte', () => {
  for (const datei of ['fragen-am-eintrag.json', 'gerda-mustermann-depot.json']) {
    const text = fs.readFileSync(path.join(REPO, 'tools', 'demo-szenarien', datei), 'utf8');
    assert.equal((text.match(/\bePA\b|Patientenakte/gi) || []).length, 0, datei);
  }
});

// Das Blatt zum Drucken, wie renderBlattOverlay es an den Körper hängt (der Sandkasten findet angehängte Elemente nicht über die id).
function druckblattVon(V, doc) {
  let ov = null;
  const koerper = doc.body;
  const vorher = koerper.appendChild;
  koerper.appendChild = (el) => { ov = el; return el; };
  try { V.renderBlattOverlay('Hinweis', 'Drucken', '<p>Blatt</p>', () => {}); } finally { koerper.appendChild = vorher; }
  assert.ok(ov, 'das Blatt steht');
  return String(ov.innerHTML || '');
}

test('[Demo · Fragen] (g) in der Vorführung trägt das Blatt zum Drucken den Chip „Beispiel · erfundene Person“, außerhalb der Vorführung nicht', () => {
  const { V, doc } = kernFuer(schrittNr((s) => s.ansicht === 'gespraechsblatt'));
  assert.equal(V.imVorfuehrung(), true, 'Vorbedingung: die Seite ist eine Vorführung');
  const mit = druckblattVon(V, doc);
  assert.match(mit, /<div class="pv-dok-blatt"><p><span class="chip" data-blatt-beispiel>Beispiel · erfundene Person<\/span><\/p><p>Blatt<\/p>/);
  // Gegenprobe: dasselbe Produkt ohne Vorführung druckt das Blatt ohne Chip.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-demo-fragen-'));
  const datei = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(datei, produktText(), 'utf8');
  let ohne;
  try { ohne = require('./produkt-html-erzeugen.js').kernAus(datei, { Blob }); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  assert.equal(ohne.V.imVorfuehrung(), false, 'Vorbedingung: keine Vorführung');
  const blatt = druckblattVon(ohne.V, ohne.document);
  assert.doesNotMatch(blatt, /data-blatt-beispiel/);
  assert.match(blatt, /<div class="pv-dok-blatt"><p>Blatt<\/p>/);
});
