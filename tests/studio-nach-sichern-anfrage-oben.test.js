'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio nach dem Sichern wie im freigegebenen Dummy vom 14.11.2026 (Z. 201–211; N74, Entscheidung 22.11.2026 „Wie im Dummy“;
   N75 in der kleinen Form).
   ─────────────────────────────────────────────────────────────────
   (1) Gleich nach dem Sichern, ohne signierte Anfrage: oben „Vorlage an Personen geben“ mit „Link kopieren“ (Link der Vorlage auf
       der Abholseite) und „QR-Code zeigen“; ein Druck zeigt den Code der Vorlage, ein zweiter verbirgt ihn.
   (2) Mit signierter Anfrage kopiert „Link kopieren“ den Link der Anfrage, direkt in die Anwendung.
   (3) Zwei Gruppen, Köpfe wie im Dummy: „Vorlage an Personen geben“, „Vorlage aufbewahren“ (Datei und PDF).
   (4) Entsteht die signierte Anfrage nach dem Sichern, kopiert „Link kopieren“ danach ihren Link, ohne neues Sichern.
   (5) Link und QR-Code der Vorlage zeigen auf die Abholseite. Sie ist live (ABHOLSEITE_LIVE an); die Datei des QR-Codes geht beim
       Sichern hinaus (Ausgabe in drei Wegen). Der Schalter bleibt, falls die Seite einmal nicht steht. Der QR-Teil der Anfrage verlinkt sie nicht.
   (6) Ohne Abholseite (kein Link der Vorlage) stehen beide Zeilen ohne Knopf mit dem Grund da.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Kanon efb4b7886> node --test tests/studio-nach-sichern-anfrage-oben.test.js → (1), (3), (6) rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const text = (b) => String(b.attrs.text != null ? b.attrs.text : b.kinder.filter((k) => typeof k === 'string').join(''));
const ERG = { pdf: true, name: 'Bibliotheksausweis', stelle: 'Stadtbibliothek Probestadt', zahl: 9, dateiSpeichern: () => {}, pdfSpeichern: () => {},
  qr: { art: 'inhalt', link: 'https://share.vivodepot.de/anfrage.html#vorlage=abc', qr: { dataUrl: 'data:image/gif;base64,R0lGOD' } } };
const UMSCHLAG = { format: 'vivodepot-anfrage@1', anfrage: { modulTyp: 'anfrage', vorgang: 'BIB-1', von: 'Stadtbibliothek Probestadt' }, anfrageJws: 'kopf.inhalt.signatur' };

function seite(mitAnfrage) {
  const g = ladeGenerator();
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [], e }); return e; };
  if (mitAnfrage) g.sandbox.nachSichernAnfrageMerken(UMSCHLAG, {});
  g.sandbox.vorlageErgebnisZeigen(ERG);
  const pos = (id) => gebaut.findIndex((b) => b.attrs.id === id);
  return { g, gebaut, pos };
}

test('[Anfrage oben · 1] gleich nach dem Sichern: „Link kopieren“ kopiert den Link der Vorlage, „QR-Code zeigen“ zeigt und verbirgt den Code', async () => {
  const { g, gebaut, pos } = seite(false);
  assert.ok(pos('ns-liste-personen') >= 0 && pos('ns-weg-anfrage-link') > pos('ns-liste-personen'), '„Link kopieren“ fehlt oben');
  assert.ok(pos('ns-weg-qr') > pos('ns-weg-anfrage-link'), '„QR-Code zeigen“ fehlt unter „Link kopieren“');
  const link = gebaut[pos('ns-weg-anfrage-link')];
  assert.equal(link.tag, 'button');
  let kopiert = null;
  g.sandbox.textKopieren = async (t) => { kopiert = t; return true; };
  await link.attrs.onclick();
  assert.equal(kopiert, ERG.qr.link, 'kopiert wird nicht der Link der Vorlage');
  const bild = gebaut.find((b) => b.tag === 'img' && b.attrs.id === 'ns-qr');
  assert.ok(bild, 'der QR-Code der Vorlage steht nicht auf der Seite');
  assert.equal(bild.attrs.src, ERG.qr.qr.dataUrl);
  assert.equal(bild.attrs.hidden, '', 'der Code steht zu Beginn offen da');
  const qr = gebaut[pos('ns-weg-qr')];
  assert.equal(qr.tag, 'button');
  assert.equal(g.sandbox.qrZeigenUmschalten(bild.e), 'Verbergen');
  assert.equal(bild.e.hidden, false, 'der Code bleibt verborgen');
  assert.equal(g.sandbox.qrZeigenUmschalten(bild.e), 'Zeigen');
  assert.equal(bild.e.hidden, true, 'der Code bleibt offen');
});

test('[Anfrage oben · 2] mit signierter Anfrage: „Link kopieren“ kopiert den Link der Anfrage', async () => {
  const { g, gebaut, pos } = seite(true);
  const link = gebaut[pos('ns-weg-anfrage-link')];
  assert.ok(link && link.tag === 'button', '„Link kopieren“ fehlt');
  let kopiert = null;
  g.sandbox.textKopieren = async (t) => { kopiert = t; return true; };
  await link.attrs.onclick();
  assert.equal(kopiert, g.V.anfrageAlsLink ? g.V.anfrageAlsLink(UMSCHLAG) : g.sandbox.anfrageAlsLink(UMSCHLAG), 'kopiert wird nicht der Link der Anfrage');
  assert.ok(!/share\.vivodepot\.de\/anfrage\.html/.test(kopiert), 'der Link der Anfrage führt über die Abholseite statt direkt in die Anwendung');
});

test('[Anfrage oben · 3] zwei Gruppen wie im Dummy: „Vorlage an Personen geben“, „Vorlage aufbewahren“ mit Datei und PDF', () => {
  const { gebaut, pos } = seite(false);
  const pe = pos('ns-liste-personen'), sp = pos('ns-liste-aufbewahren');
  assert.ok(pe >= 0 && sp > pe, 'die Reihenfolge der Gruppen stimmt nicht');
  assert.ok(pos('ns-weg-datei') > sp && pos('ns-weg-pdf') > sp);
  assert.equal(pos('ns-liste-stellen'), -1, 'die dritte Gruppe steht noch da');
  const koepfe = gebaut.filter((b) => b.attrs.class === 'gruppe-kopf').map(text);
  assert.deepEqual(koepfe, ['Vorlage an Personen geben', 'Vorlage aufbewahren']);
});

test('[Anfrage oben · 4] entsteht die signierte Anfrage nach dem Sichern, kopiert „Link kopieren“ ihren Link', async () => {
  const g = ladeGenerator();
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [], e }); return e; };
  g.sandbox.vorlageErgebnisZeigen(ERG);
  g.sandbox.nachSichernAnfrageMerken(UMSCHLAG, {});
  const links = gebaut.filter((b) => b.attrs.id === 'ns-weg-anfrage-link');
  let kopiert = null;
  g.sandbox.textKopieren = async (t) => { kopiert = t; return true; };
  await links[links.length - 1].attrs.onclick();
  assert.equal(kopiert, g.V.anfrageAlsLink ? g.V.anfrageAlsLink(UMSCHLAG) : g.sandbox.anfrageAlsLink(UMSCHLAG), 'nach dem Signieren kopiert der Knopf nicht den Link der Anfrage');
});

test('[Anfrage oben · 6] ohne Link der Vorlage stehen „Link kopieren“ und „QR-Code zeigen“ ohne Knopf mit dem Grund da', () => {
  const g = ladeGenerator();
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [], e }); return e; };
  g.sandbox.vorlageErgebnisZeigen(Object.assign({}, ERG, { qr: null }));
  for (const id of ['ns-weg-anfrage-link', 'ns-weg-qr']) assert.equal(gebaut.find((b) => b.attrs.id === id).tag, 'div', id + ' ist ein Knopf ohne Ziel');
  assert.ok(gebaut.some((b) => b.attrs.class === 't' && /Abholseite nicht erreichbar/.test(text(b))));
  assert.ok(!gebaut.some((b) => b.tag === 'img'));
});

test('[Anfrage oben · 5] Link und QR-Code der Vorlage mit live stehender Abholseite; die QR-Datei geht beim Sichern hinaus', () => {
  assert.match(HTML, /\nlet ABHOLSEITE_LIVE = true;\n/, 'der Schalter fehlt oder steht aus, obwohl die Abholseite live ist');
  const i = HTML.indexOf('async function vorlageSichern(');
  const f = HTML.slice(i, HTML.indexOf('\n}\n', i));
  assert.match(f, /const qr = ABHOLSEITE_LIVE \? await vorlageQr\(template\) : null;/, 'der QR-Code der Vorlage entsteht ohne den Schalter');
  assert.match(f, /if \(qr\) blobDownload\(basis \+ \(qr\.aushang \? '-qr\.png' : '-qr\.gif'\)/, 'die QR-Datei geht beim Sichern nicht mehr hinaus');
  const j = HTML.indexOf('async function anfrageQrTeilAnhaengen(');
  const t = HTML.slice(j, HTML.indexOf('\n}\n', j));
  assert.ok(!/markeAdresse\('anfrageAblage'\)/.test(t), 'der QR-Teil der Anfrage verlinkt die Abholseite');
});
