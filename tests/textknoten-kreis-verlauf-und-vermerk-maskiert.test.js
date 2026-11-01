'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Verlauf eines Empfängerkreises und vorbelegter Vermerk: Werte aus der Depotdatei gehen nur als Text ins HTML (26.10.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Der Textknoten-Wächter (tools/textknoten-verkettung-pruefen.js) zählt HTML-Bauer nie als geschützt. Zwei neue Bauer,
   der eingeklappte Verlauf in der Zeile eines Kreises und die Felder des Vermerks mit Vorbelegung, setzen Werte ein,
   die aus einer Depotdatei kommen: Zeitpunkt, Zahl und Art jeder früheren Ausgabe, Empfänger und Umfang. Geprüft:
     · ein Wert mit `<script>` und mit `"><img onerror>` erscheint im Verlauf und im Vermerk nur als Text;
     · Rot-Beweis: ohne die Maskierung an genau diesen Stellen sieht die Probe das Markup.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'textknoten-kreis-probe-passwort';
const SKRIPT = '<script>alert(1)</script>';
const BILD = '"><img src=x onerror=alert(1)>';

function ohneMarkup(html, wo) {
  assert.doesNotMatch(html, /<script/i, wo + ': kein Skript-Tag');
  assert.doesNotMatch(html, /<img/i, wo + ': kein Bild-Tag');
}

async function verlaufHTML(opt) {
  const { V } = ladeKern(opt || {});
  await V.depotAnlegen(PW);
  await V.empfaengerkreisSetzen({ id: 'k1', name: 'Hausärztin', bausteine: ['notfall'] });
  const k = V.empfaengerkreisFinden('k1');
  // so, wie eine fremde oder veränderte Depotdatei den Verlauf tragen könnte
  k.verlauf = [{ art: 'datei', felder: 3, stand: '2026-10-25T10:00:00Z' }, { art: SKRIPT, felder: BILD, stand: SKRIPT }, { art: 'qr', felder: 1, stand: BILD }];
  return V._kreisZeileHTML(k);
}

test('[Textknoten·Kreis-Verlauf] Zeitpunkt, Zahl und Art aus der Depotdatei erscheinen nur als Text', async () => {
  const html = await verlaufHTML();
  assert.match(html, /<details class="einst-hint">/, 'der Verlauf wird gezeigt');
  ohneMarkup(html, 'Verlauf');
});

test('[Textknoten·Vermerk] Empfänger und Umfang der Vorbelegung erscheinen nur als Text', () => {
  const { V } = ladeKern();
  const html = V._uebergabeFelderHTML({ empfaenger: BILD, umfang: SKRIPT });
  ohneMarkup(html, 'Vermerk');
  assert.match(html, /id="up-empfaenger"[^>]* value="&quot;&gt;&lt;img/, 'der Empfänger steht maskiert im Wert');
});

function kernOhne(...paare) {
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  let ohne = kern;
  for (let i = 0; i < paare.length; i += 2) {
    const vorher = ohne;
    ohne = ohne.replace(paare[i], paare[i + 1]);
    assert.notEqual(ohne, vorher, 'die Ersetzung griff: ' + paare[i]);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'textknoten-kreis-'));
  const p = path.join(dir, 'kern.html');
  fs.writeFileSync(p, ohne);
  return { p, dir };
}

test('[Textknoten·Rot-Beweis] ohne Maskierung im Verlauf und im Vermerk sieht die Probe das Markup', async () => {
  // Die Zeile formt den Zeitpunkt über datumKurz schon zu Text; der Rot-Beweis setzt ihn roh ein und nimmt die Maskierung weg.
  const a = kernOhne("'<li>' + escapeHTML(verlaufZeile(v)) + '</li>'", "'<li>' + verlaufZeile(v) + '</li>'",
    "replace('{datum}', datumKurz(v && v.stand))", "replace('{datum}', String(v && v.stand))");
  try {
    assert.match(await verlaufHTML({ htmlPfad: a.p, backen: true }), /<img|<script/i);
  } finally { fs.rmSync(a.dir, { recursive: true, force: true }); }
  const b = kernOhne("' value=\"' + escapeHTML(String(x)) + '\"'", "' value=\"' + String(x) + '\"'");
  try {
    const { V } = ladeKern({ htmlPfad: b.p, backen: true });
    assert.match(V._uebergabeFelderHTML({ empfaenger: BILD }), /<img/i);
  } finally { fs.rmSync(b.dir, { recursive: true, force: true }); }
});
