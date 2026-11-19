'use strict';
/* ═════════════════════════════════════════════════════════════════
   Label in der Anwendung (16.11.2026, Desktop-Dummy „Label mit (i)“).

   Das Bild des Labels steht im Fuß der Seitenleiste über Notfall und Einstellungen, daneben ein Info-Zeichen mit einem Blatt (Titel,
   Herausgeber und Zeit, wofür, Link auf die Seite des Labels). Die Anzeige hängt an EINER Konstante, LABEL_ANZEIGE, Vorgabe aus; das Bild
   an LABEL_BILD (eingebettet, leer bis zur freigegebenen Fassung), der Link an LABEL_SEITE. Die Texte sind bis zum Einschalten neutrale
   Platzhalter.

   Proben (auf Zeichenebene, weil die Test-DOM innerHTML nicht parst):
   [Label·aus]        der Kern, wie er ist: kein Bild, kein Info-Zeichen, kein Wortlaut des Labels in der Seitenleiste.
   [Label·an]         ein Kern mit Konstante an und Bild: Bild mit Alternativtext, Info-Zeichen, Blatt verborgen mit allen vier Teilen,
                      vor Notfall und Einstellungen.
   [Label·ohne Bild]  Konstante und Seite gesetzt, aber kein Bild: nichts im DOM.
   [Label·Sperre]     die Konstante steht genau einmal und auf aus. Wer sie umlegt, ändert diese Probe im selben Commit; das Umlegen
                      ist eine eigene Freigabe.
   [Label·Schema]     eine Seite ohne https (http:, javascript:) zeigt kein Label.
   [Label·an · Rot-Beweis] ein Kern, dessen Seitenleiste das Label nicht einsetzt, fällt an [Label·an].
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const BILD = 'data:image/png;base64,iVBORw0KGgo=';

function kernMit(ersetzungen) {
  let src = fs.readFileSync(KERN, 'utf8');
  for (const [alt, neu] of ersetzungen) {
    assert.equal(src.split(alt).length - 1, 1, 'Vorbedingung: der Anker steht genau einmal: ' + alt);
    src = src.replace(alt, () => neu);
  }
  const tmp = path.join(os.tmpdir(), 'label-in-anwendung-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(tmp, src);
  try { return ladeKern({ htmlPfad: tmp, backen: true }); } finally { fs.rmSync(tmp, { force: true }); }
}
const SEITE = 'https://beispiel.invalid/label/';
const AN = [['const LABEL_ANZEIGE = false;', 'const LABEL_ANZEIGE = true;'], ["const LABEL_BILD = '';", "const LABEL_BILD = '" + BILD + "';"],
  ["const LABEL_SEITE = '';", "const LABEL_SEITE = '" + SEITE + "';"]];

async function leiste(k) {
  const { V, document } = k;
  await V.depotAnlegen('label-probe-pw-2026!');
  V.betreteApp();
  V.renderSidebar();
  return document.getElementById('sidebar').innerHTML;
}

test('[Label·aus] der Kern zeigt kein Label und kein Info-Zeichen dazu', async () => {
  const k = ladeKern({ backen: true });
  const html = await leiste(k);
  assert.ok(html.includes('class="nav-unten"'), 'Vorbedingung: die Seitenleiste ist gezeichnet');
  assert.ok(!html.includes('nav-label'), 'kein Platz für das Label');
  assert.ok(!html.includes(k.V.STRINGS.labelTitel), 'kein Wortlaut des Labels');
});

test('[Label·an] Bild mit Alternativtext, Info-Zeichen und verborgenes Blatt über Notfall und Einstellungen', async () => {
  const k = kernMit(AN);
  const S = k.V.STRINGS;
  const html = await leiste(k);
  const i = html.indexOf('<div class="nav-label">');
  assert.ok(i >= 0, 'das Label steht in der Seitenleiste');
  assert.ok(i < html.indexOf('<div class="nav-unten">'), 'vor Notfall und Einstellungen');
  assert.ok(html.includes('<img class="nav-label-bild" src="' + BILD + '" alt="' + S.labelBildAlt + '">'), 'Bild mit Alternativtext');
  assert.ok(html.includes('id="nav-label-knopf" aria-expanded="false" aria-controls="nav-label-blatt"'), 'Info-Zeichen');
  assert.ok(html.includes('<div class="infoblatt" id="nav-label-blatt" hidden>'), 'das Blatt ist zu');
  for (const s of [S.labelTitel, S.labelWer, S.labelText, S.labelLink, S.btnVerstanden]) assert.ok(html.includes(s), 'im Blatt: ' + s);
  assert.ok(html.includes('href="' + SEITE + '" target="_blank" rel="noopener noreferrer"'), 'Link auf die Seite des Labels');
});

test('[Label·ohne Bild] Konstante an, aber ohne Bild steht nichts da', async () => {
  const html = await leiste(kernMit([AN[0], AN[2]]));
  assert.ok(!html.includes('nav-label'));
});

test('[Label·Schema] eine Seite ohne https zeigt kein Label', async () => {
  for (const seite of ['http://beispiel.invalid/label/', 'javascript:alert(1)']) {
    const html = await leiste(kernMit([AN[0], AN[1], ["const LABEL_SEITE = '';", "const LABEL_SEITE = '" + seite + "';"]]));
    assert.ok(!html.includes('nav-label'), seite);
  }
});

test('[Label·Sperre] LABEL_ANZEIGE steht genau einmal und auf aus', () => {
  const src = fs.readFileSync(KERN, 'utf8');
  assert.equal((src.match(/^const LABEL_ANZEIGE = /gm) || []).length, 1);
  assert.match(src, /^const LABEL_ANZEIGE = false;$/m);
});

test('[Label·an · Rot-Beweis] ein Kern, dessen Seitenleiste das Label nicht einsetzt, fällt auf', async () => {
  const html = await leiste(kernMit(AN.concat([['  html += labelSeitenleisteHTML();', '  html += \'\';']])));
  assert.equal(html.indexOf('<div class="nav-label">'), -1);
});
