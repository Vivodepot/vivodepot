'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio nach dem Sichern: oben die Anfrage für die Person am Schalter, darunter die Vorlage für andere Stellen, dann Speichern
   (Produktverantwortung 18.11.2026 „Die Idee war, dass die Person am Schalter den QR-Code scannt“; Dummy 14.11.2026 Z. 201).
   ─────────────────────────────────────────────────────────────────
   (1) Ohne signierte Anfrage steht oben „Anfrage für Personen erstellen“; sie führt in den Anfrage-Weg. Kein QR-Code der Vorlage.
   (2) Mit signierter Anfrage stehen oben „Link kopieren“ (der Link der Anfrage, direkt in die Anwendung) und die QR-Zeile ohne Code:
       den QR-Code gibt es erst mit der kurzen Adresse der Ablage, kein Code führt ins Leere.
   (3) Die Vorlage steht unter „Weitergeben an andere Stellen“ (Datei, Link zur Vorlage), Datei und PDF unter „Speichern“.
   (4) Entsteht die signierte Anfrage nach dem Sichern, steht sie oben auf der Seite, ohne neues Sichern.
   (5) Link und QR-Code der Vorlage zeigen auf die Abholseite. Sie ist live (ABHOLSEITE_LIVE an); die Datei des QR-Codes geht beim
       Sichern hinaus (Ausgabe in drei Wegen). Der Schalter bleibt, falls die Seite einmal nicht steht. Der QR-Teil der Anfrage verlinkt sie nicht.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Fassung vor diesem Umbau> node --test tests/studio-nach-sichern-anfrage-oben.test.js → rot.
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

test('[Anfrage oben · 1] ohne signierte Anfrage: „Anfrage für Personen erstellen“ oben, kein QR-Code der Vorlage', () => {
  const { g, gebaut, pos } = seite(false);
  assert.ok(pos('ns-liste-personen') >= 0 && pos('ns-weg-anfrage-erstellen') > pos('ns-liste-personen'), '„Anfrage für Personen erstellen“ fehlt oben');
  assert.ok(pos('ns-liste-stellen') > pos('ns-weg-anfrage-erstellen'), 'die Vorlage steht nicht unter der Anfrage');
  assert.ok(!gebaut.some((b) => b.tag === 'img'), 'die Seite zeigt einen QR-Code der Vorlage');
  assert.equal(pos('ns-weg-anfrage-link'), -1);
  let schritt = null, eingetreten = false;
  g.sandbox.zeigeSchritt = (s) => { schritt = s; };
  g.sandbox.anfrageAssistentEintreten = () => { eingetreten = true; };
  gebaut[pos('ns-weg-anfrage-erstellen')].attrs.onclick();
  assert.ok(eingetreten && schritt === 'anfrage', 'die Zeile führt nicht in den Anfrage-Weg');
});

test('[Anfrage oben · 2] mit signierter Anfrage: „Link kopieren“ kopiert den Link der Anfrage; die QR-Zeile zeigt keinen Code', async () => {
  const { g, gebaut, pos } = seite(true);
  const link = gebaut[pos('ns-weg-anfrage-link')];
  assert.ok(link && link.tag === 'button', '„Link kopieren“ der Anfrage fehlt');
  assert.ok(pos('ns-weg-anfrage-link') < pos('ns-liste-stellen'), '„Link kopieren“ steht nicht oben');
  let kopiert = null;
  g.sandbox.textKopieren = async (t) => { kopiert = t; return true; };
  await link.attrs.onclick();
  assert.equal(kopiert, g.V.anfrageAlsLink ? g.V.anfrageAlsLink(UMSCHLAG) : g.sandbox.anfrageAlsLink(UMSCHLAG), 'kopiert wird nicht der Link der Anfrage');
  assert.ok(!/share\.vivodepot\.de\/anfrage\.html/.test(kopiert), 'der Link der Anfrage führt über die Abholseite statt direkt in die Anwendung');
  const qr = gebaut[pos('ns-weg-anfrage-qr')];
  assert.ok(qr && qr.tag === 'div', 'die QR-Zeile ist ein Knopf, obwohl es keinen Code gibt');
  assert.ok(!gebaut.some((b) => b.tag === 'img'), 'ein QR-Code steht da, obwohl die kurze Adresse fehlt');
});

test('[Anfrage oben · 3] die Vorlage unter „Weitergeben an andere Stellen“, Datei und PDF unter „Speichern“', () => {
  const { gebaut, pos } = seite(false);
  const st = pos('ns-liste-stellen'), sp = pos('ns-liste-aufbewahren');
  assert.ok(st >= 0 && sp > st, 'die Reihenfolge der Gruppen stimmt nicht');
  assert.ok(pos('ns-weg-vorlage-datei') > st && pos('ns-weg-vorlage-datei') < sp);
  assert.ok(pos('ns-weg-vorlage-link') > st && pos('ns-weg-vorlage-link') < sp);
  assert.ok(pos('ns-weg-datei') > sp && pos('ns-weg-pdf') > sp);
  const koepfe = gebaut.filter((b) => b.attrs.class === 'gruppe-kopf').map(text);
  assert.deepEqual(koepfe, ['Teilen mit Personen', 'Weitergeben an andere Stellen', 'Speichern']);
});

test('[Anfrage oben · 4] entsteht die signierte Anfrage nach dem Sichern, steht ihr Link oben', () => {
  const g = ladeGenerator();
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [], e }); return e; };
  g.sandbox.vorlageErgebnisZeigen(ERG);
  assert.ok(!gebaut.some((b) => b.attrs.id === 'ns-weg-anfrage-link'));
  g.sandbox.nachSichernAnfrageMerken(UMSCHLAG, {});
  assert.ok(gebaut.some((b) => b.attrs.id === 'ns-weg-anfrage-link'), 'nach dem Signieren steht der Link der Anfrage nicht oben');
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
