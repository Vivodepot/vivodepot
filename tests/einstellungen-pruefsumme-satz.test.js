'use strict';
/* ═════════════════════════════════════════════════════════════════
   EINSTELLUNGEN-PRUEFSUMME-SATZSTUECK (23.11.2026)

   Unter „Über“ stand der Ort der Prüfsumme als Satzstück („für jede Version auf GitHub, …“) in der Festbreiten-Spalte der Werte;
   am Handy brach die Spalte mitten im Wort („D atei“). Jetzt steht dort ein ganzer Satz im Fließtext, nur unter der eigenen Marke.

   Proben:
   [Prüfsumme·Satz]       die Einstellungen zeigen den ganzen Satz als Hinweis, kein Satzstück in der Werte-Spalte.
   [Prüfsumme·Wortlaut]   der Satz ist ganz (Großbuchstabe am Anfang, Punkt am Ende) und nennt SECURITY.md, in jeder Sprache.
   [Prüfsumme·Rot-Beweis] ein Kern mit der alten Zeile fällt durch [Prüfsumme·Satz].
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const { istOeffentlich } = require('./helfer/nur-privat.js');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const escapeHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function befunde(V) {
  const html = V.einstellungenHTML();
  const f = [];
  if (!html.includes('<p class="einst-hint" data-einst-pruefsumme="1">' + escapeHtml(V.STRINGS.einstPruefsummeSatz) + '</p>')) f.push('der ganze Satz fehlt');
  if (/einst-hash/.test(html)) f.push('Satzstück in der Werte-Spalte');
  return f;
}

test('[Prüfsumme·Satz] die Einstellungen zeigen den ganzen Satz, kein Satzstück in der Werte-Spalte', () => {
  const { V } = ladeKern();
  assert.deepEqual(befunde(V), []);
});

test('[Prüfsumme·Wortlaut] ganzer Satz mit SECURITY.md in jeder Sprache', () => {
  // Öffentlich (Kennzeichen „läuft nur im privaten Repo“, tests/helfer/nur-privat.js) fehlen die Pro-Textsätze; privat bleiben alle vier Pflicht.
  for (const d of (istOeffentlich() ? ['de', 'en'] : ['de', 'de-pro', 'en', 'en-pro'])) {
    const t = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-' + d + '-modul.json'), 'utf8')).texte['strings:einstPruefsummeSatz.text'];
    assert.equal(typeof t, 'string', d);
    assert.match(t, /^\p{Lu}/u, d + ': beginnt mit einem Großbuchstaben');
    assert.match(t, /\.$/, d + ': endet mit einem Punkt');
    assert.ok(t.includes('SECURITY.md') && t.includes('Fingerabdruck je Fassung'), d + ': nennt Datei und Abschnitt');
  }
});

/* Rot-Beweis: die Zeile von vorher (Satzstück als Wert mit einst-hash) fällt durch [Prüfsumme·Satz]. */
test('[Prüfsumme·Rot-Beweis] ein Kern mit der alten Zeile fällt durch', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const neu = "? '<p class=\"einst-hint\" data-einst-pruefsumme=\"1\">' + escapeHTML(STRINGS.einstPruefsummeSatz) + '</p>'";
  assert.equal(quelle.split(neu).length, 2, 'Vorbedingung: der Anker steht genau einmal');
  const alt = "? '<div class=\"einst-zeile\"><span class=\"einst-label\">' + STRINGS.fussHashLabel + '</span><span class=\"einst-wert einst-hash\">' + escapeHTML(STRINGS.fussPruefsummeOrt) + '</span></div>'";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pruefsumme-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(neu, alt));
  try {
    const { V } = ladeKern({ backen: true, htmlPfad: datei });
    assert.deepEqual(befunde(V), ['der ganze Satz fehlt', 'Satzstück in der Werte-Spalte']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
