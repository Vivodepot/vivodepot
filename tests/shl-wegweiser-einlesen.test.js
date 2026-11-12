'use strict';
/* ════════════════════════════════════════════════════════════════════════
   shl-wegweiser-einlesen.test.js — „Wohin einlesen?" führt zum Freigabe-Link
   ────────────────────────────────────────────────────────────────────────
   SHL C (26.09.2026) stellte unter den Chooser einen Wegweiser: erst auf der
   Abhol-Seite abholen und speichern, dann hier einlesen. Seit L6 (02.11.2026,
   Nachtrag U2-ADR-183) liest die Einlese-Tür den Link selbst ein: ein Eintrag
   „Freigabe-Link einlesen“ IM Chooser, gebaut wie die übrigen Einträge. Die
   Abhol-Seite holt nur das Chiffrat, der Kern entschlüsselt. Der alte Satz
   widersprach dem neuen Weg und ist fort; der Weg über die gespeicherte Datei
   steht im Dialog als Rückfall.

   Gehalten wird: der Eintrag steht im Chooser, mit Link-Symbol, und öffnet
   flowShlEmpfangen; kein zweiter Weg daneben; nichts davon im Sende-Dialog;
   die Einlese-Tür ruft nichts ab.
   ROT-BEWEIS: `einlesenBefund` fällt am alten Stand (Wegweiser unter dem
   Chooser, kein Eintrag) und an einem Eintrag außerhalb des Choosers.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frisch() { const k = ladeKern(); await k.V.depotAnlegen(PW); k.V.betreteApp(); return k; }
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;

function einlesenBefund(box) {
  const fehler = [];
  const i = box.indexOf('data-iz-shl-empfangen="1"');
  if (i < 0) return ['kein Eintrag „Freigabe-Link einlesen“'];
  const a = box.indexOf('<div class="herausgeben-chooser">');
  const e = box.indexOf('</div>', a);
  if (a < 0 || i < a || i > e) fehler.push('der Eintrag steht nicht im Chooser');
  if (!/<button type="button" class="btn btn-sek" data-iz-shl-empfangen="1">/.test(box)) fehler.push('anders gebaut als die übrigen Einträge');
  if (/data-iz-shl-abholen/.test(box) || /share\.vivodepot\.de\/empfangen\.html/.test(box)) fehler.push('der alte Wegweiser steht noch daneben');
  return fehler;
}

test('[SHL·Einlesen] „Wohin einlesen?" trägt „Freigabe-Link einlesen“ im Chooser, ohne den alten Wegweiser', async () => {
  const { V, document } = await frisch();
  V.flowEinlesenZentral();
  assert.deepEqual(einlesenBefund(modal(document)), []);
  const knopf = document.querySelector('[data-iz-shl-empfangen]');
  assert.equal(typeof knopf.onclick, 'function', 'verdrahtet');
  knopf.onclick();
  assert.ok(document.getElementById('shl-empfang-link'), 'öffnet den Dialog des Freigabe-Links');
});

test('[SHL·Einlesen·Rot-Beweis] der alte Stand (Wegweiser unter dem Chooser) und ein Eintrag außerhalb fallen', async () => {
  const { V, document } = await frisch();
  V.flowEinlesenZentral();
  const echt = modal(document);
  const ohne = echt.replace(/<button type="button" class="btn btn-sek" data-iz-shl-empfangen="1">[\s\S]*?<\/button>/, '');
  assert.ok(ohne !== echt, 'Vorbedingung: der Eintrag ließ sich herausschneiden');
  const alt = ohne + '<p class="einst-hint"><a href="https://share.vivodepot.de/empfangen.html" target="_blank" rel="noopener noreferrer" data-iz-shl-abholen="1">Freigabe abholen</a></p>';
  assert.deepEqual(einlesenBefund(alt), ['kein Eintrag „Freigabe-Link einlesen“']);
  const draussen = ohne + '<button type="button" class="btn btn-sek" data-iz-shl-empfangen="1">x</button>';
  assert.ok(einlesenBefund(draussen).includes('der Eintrag steht nicht im Chooser'));
});

test('[SHL·Einlesen] der Eintrag steht in der Einlese-Tür, nicht im Sende-Dialog; die Tür ruft nichts ab', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const koerper = (name) => {
    const a = html.search(new RegExp('\\n(async )?function ' + name + '\\('));
    assert.ok(a >= 0, name + ' nicht gefunden');
    return html.slice(a, html.indexOf('\n}\n', a));
  };
  assert.match(html, /\n  shlAbholen: 'https:\/\/share\.vivodepot\.de\/empfangen\.html',\n/, 'die Marken-Stelle trägt die Adresse der Abhol-Seite');
  assert.match(koerper('flowEinlesenZentral'), /svgIcon\(ICONS\.link\)/, 'eigenes Symbol: Link');
  assert.ok(!koerper('flowShlVorbereiten').includes('flowShlEmpfangen'), 'nicht im Sende-Dialog');
  assert.ok(!/\bfetch\s*\(/.test(koerper('flowEinlesenZentral')), 'die Einlese-Tür ruft nichts ab');
});

test('[SHL·Einlesen] der Text des Eintrags steht im deutschen und im englischen Sprachmodul, die alten nicht mehr', () => {
  for (const datei of ['textsatz-de-modul.json', 'textsatz-en-modul.json']) {
    const texte = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', datei), 'utf8')).texte;
    assert.ok(typeof texte['strings:shlEmpfangTitel.text'] === 'string' && texte['strings:shlEmpfangTitel.text'].trim(), datei);
    for (const k of ['strings:einlesenShlHinweis.text', 'strings:einlesenShlLink.text']) assert.equal(texte[k], undefined, datei + ': ' + k);
  }
});
