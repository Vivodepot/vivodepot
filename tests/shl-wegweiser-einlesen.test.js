'use strict';
/* ════════════════════════════════════════════════════════════════════════
   shl-wegweiser-einlesen.test.js — „Wohin einlesen?" zeigt den Weg zur
   Abhol-Seite (SHL C, 26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Wer einen fremden Freigabe-Link (shlink:/) bekommen hat, holt ihn auf der
   Abhol-Seite ab (share/empfangen.html, versioniert seit B), speichert die
   Datei und liest sie in Vivodepot ein. Die Abhol-Seite verweist am Ende auf
   „Daten einlesen"; dieser Wegweiser schliesst den Kreis in die andere Richtung.

   Ort: die zentrale, bereich-neutrale Tür `flowEinlesenZentral`, als EIGENE
   Zeile UNTER dem Chooser. Kein Chooser-Knopf, denn der Wegweiser ist kein
   Einlese-Ziel. Nicht im Sende-Dialog (`flowShlVorbereiten`): wer einen
   fremden Link bekommen hat, will nichts teilen.

   Ein echter Link (Top-Level-Navigation, target=_blank, rel=noopener
   noreferrer) wie „Ablage öffnen" — kein fetch. Dass der Kern dabei bei
   connect-src 'none' bleibt, hält tests/shl-abholseite.test.js fest.

   ROT-BEWEIS: `wegweiserBefund` fällt an gepflanzten Fehlformen — Wegweiser
   fehlt, rel fehlt, falsches Ziel, Wegweiser als Knopf im Chooser.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ZIEL = 'https://share.vivodepot.de/empfangen.html';
const PW = 'pw';
async function frisch() { const k = ladeKern(); await k.V.depotAnlegen(PW); k.V.betreteApp(); return k; }
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;
function escapeHTML(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function wegweiserBefund(box, S) {
  const fehler = [];
  const i = box.indexOf('href="' + ZIEL + '"');
  if (i < 0) return ['kein Link auf ' + ZIEL];
  const anker = box.slice(box.lastIndexOf('<a', i), box.indexOf('</a>', i) + 4);
  if (!/target="_blank"/.test(anker)) fehler.push('target="_blank" fehlt');
  if (!/rel="noopener noreferrer"/.test(anker)) fehler.push('rel="noopener noreferrer" fehlt');
  if (!anker.includes(escapeHTML(S.einlesenShlLink))) fehler.push('Linktext einlesenShlLink fehlt');
  if (!box.includes(escapeHTML(S.einlesenShlHinweis))) fehler.push('Hinweis einlesenShlHinweis fehlt');
  const chooserEnde = box.indexOf('</div>', box.indexOf('herausgeben-chooser'));
  if (chooserEnde < 0 || i < chooserEnde) fehler.push('Wegweiser steht im Chooser, nicht darunter');
  return fehler;
}

test('[SHL C] „Wohin einlesen?" führt unter dem Chooser zur Abhol-Seite, als echter Link', async () => {
  const { V, document } = await frisch();
  V.flowEinlesenZentral();
  assert.deepEqual(wegweiserBefund(modal(document), V.STRINGS), []);
});

test('[SHL C·Rot-Beweis] fehlender Wegweiser, fehlendes rel, falsches Ziel und ein Knopf im Chooser fallen', async () => {
  const { V, document } = await frisch();
  V.flowEinlesenZentral();
  const echt = modal(document);
  const S = V.STRINGS;
  const ohne = echt.replace(/<p class="einst-hint"[^>]*>[^<]*<a href="https:\/\/share\.vivodepot\.de\/empfangen\.html"[\s\S]*?<\/p>/, '');
  assert.ok(ohne !== echt, 'Vorbedingung: der Wegweiser ließ sich herausschneiden');
  assert.ok(wegweiserBefund(ohne, S).some((f) => f.startsWith('kein Link')));
  assert.ok(wegweiserBefund(echt.replace('rel="noopener noreferrer" data-iz-shl-abholen', 'data-iz-shl-abholen'), S).some((f) => f.startsWith('rel=')));
  assert.ok(wegweiserBefund(echt.replace(ZIEL, 'https://share.vivodepot.de/'), S).some((f) => f.startsWith('kein Link')));
  const imChooser = ohne.replace('<div class="herausgeben-chooser">',
    '<div class="herausgeben-chooser"><a href="' + ZIEL + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(S.einlesenShlLink) + '</a>');
  assert.ok(wegweiserBefund(imChooser, S).includes('Wegweiser steht im Chooser, nicht darunter'));
});

test('[SHL C] der Wegweiser steht in der Einlese-Tür, nicht im Sende-Dialog', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const koerper = (name) => {
    const a = html.search(new RegExp('\\n(async )?function ' + name + '\\('));
    assert.ok(a >= 0, name + ' nicht gefunden');
    return html.slice(a, html.indexOf('\n}\n', a));
  };
  // Seit v847 steht die Adresse nur in MARKEN_ADRESSEN (tools/marken-adressen-pruefen.js); der Link liest sie von dort.
  assert.match(html, /\n  shlAbholen: 'https:\/\/share\.vivodepot\.de\/empfangen\.html',\n/, 'die Marken-Stelle trägt genau diese Adresse');
  assert.ok(koerper('flowEinlesenZentral').includes('MARKEN_ADRESSEN.shlAbholen'));
  assert.ok(!koerper('flowShlVorbereiten').includes('MARKEN_ADRESSEN.shlAbholen') && !koerper('flowShlVorbereiten').includes(ZIEL),
    'die Abhol-Seite gehört nicht in den Sende-Dialog');
  assert.ok(!/\bfetch\s*\(/.test(koerper('flowEinlesenZentral')), 'die Einlese-Tür ruft nichts ab');
});

test('[SHL C] beide Texte stehen im deutschen und im englischen Sprachmodul', () => {
  for (const datei of ['textsatz-de-modul.json', 'textsatz-en-modul.json']) {
    const texte = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', datei), 'utf8')).texte;
    for (const k of ['strings:einlesenShlHinweis.text', 'strings:einlesenShlLink.text']) {
      assert.ok(typeof texte[k] === 'string' && texte[k].trim(), datei + ': ' + k + ' fehlt');
    }
  }
});
