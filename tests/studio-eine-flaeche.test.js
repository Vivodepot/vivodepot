'use strict';
/* Eine Arbeitsfläche im Studio (U2-ADR-493, Nachtrag „eine Fläche“): rechts steht die Vorschau der Anfrage, über der
   Feldliste Name und Zweck der Vorlage, und in der Feldkarte liegen die technischen Angaben zugeklappt.
   Geprüft wird am Text der Seite; das Verhalten im Browser prüft tests/e2e/studio-eine-flaeche.spec.js.
   Dazu der Start der einen Fläche: Name der Stelle, zugeklappte Angaben, einfache Beispiele; kein zweiter Raum, kein Kopf-Schalter.
   ROT-BEWEIS: die gepflanzten Fälle unten (ein technisches Feld außerhalb der Klappe; eine rechte Spalte ohne Vorschau; ein
   zurückgekehrter Kopf-Schalter, ein zweiter Raum, Angaben außerhalb der Klappe). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

const TECHNISCH = ['ed-codesystem', 'ed-codesystem-frei', 'ed-bereich', 'ed-gruppe', 'ed-provenienz'];
const OFFEN = ['ed-name', 'ed-typ', 'ed-pflicht', 'ed-hilfetext', 'ed-ziel', 'ed-codewert-hinzu', 'ed-speichern', 'ed-loeschen'];

/* Schneidet ein Element mit dieser id samt Inhalt aus dem Text (gleichnamige Tags werden gezählt). */
function block(html, tag, id) {
  const start = html.indexOf('<' + tag + ' ' + (html.includes('<' + tag + ' class="eig-erweitert" id="' + id + '"') ? 'class="eig-erweitert" ' : '') + 'id="' + id + '"');
  const von = start >= 0 ? start : html.search(new RegExp('<' + tag + '\\b[^>]*\\bid="' + id + '"'));
  if (von < 0) return '';
  const re = new RegExp('<(/?)' + tag + '\\b', 'g');
  re.lastIndex = von;
  let tiefe = 0, m;
  while ((m = re.exec(html))) {
    tiefe += m[1] ? -1 : 1;
    if (tiefe === 0) return html.slice(von, html.indexOf('>', m.index) + 1);
  }
  return '';
}
const hatId = (text, id) => new RegExp('\\bid="' + id + '"').test(text);

/* Liefert die Abweichungen von der einen Fläche als Liste von Sätzen. */
function abweichungen(html) {
  const out = [];
  const editor = block(html, 'div', 'feld-editor');
  const klappe = block(editor, 'details', 'ed-technisches');
  if (!klappe) out.push('die Klappe ed-technisches fehlt in der Feldkarte');
  if (/<details\b[^>]*\bid="ed-technisches"[^>]*\bopen\b/.test(klappe)) out.push('die Klappe ed-technisches steht offen');
  for (const id of TECHNISCH) if (!hatId(klappe, id)) out.push(id + ' steht nicht in der Klappe');
  for (const id of OFFEN) {
    if (!hatId(editor, id)) out.push(id + ' fehlt in der Feldkarte');
    else if (hatId(klappe, id)) out.push(id + ' steht in der Klappe');
  }
  const spalte = block(html, 'aside', 'eigenschaften');
  const vorschau = block(spalte, 'div', 'anfrage-vorschau');
  for (const id of ['av-stelle', 'av-titel', 'av-zweck', 'av-felder']) if (!hatId(vorschau, id)) out.push(id + ' fehlt in der Vorschau der Anfrage');
  const tafel = block(html, 'div', 'tafel-felder');
  for (const id of ['tpl-name', 'tpl-zweck']) if (!hatId(tafel, id)) out.push(id + ' fehlt über der Feldliste');
  return out;
}

test('[Eine Fläche] Vorschau der Anfrage rechts, Name und Zweck über der Feldliste, Technisches zugeklappt in der Feldkarte', () => {
  assert.deepEqual(abweichungen(HTML), []);
});

test('[Eine Fläche] die Vorschau nennt Pflicht oder freiwillig und trägt keine Beispieldaten', () => {
  const fn = /function anfrageVorschauRendern\(\) \{[\s\S]*?\n\}/.exec(HTML);
  assert.ok(fn, 'anfrageVorschauRendern fehlt');
  assert.match(fn[0], /L\('Pflicht', 'required'\)/);
  assert.match(fn[0], /L\('freiwillig', 'optional'\)/);
  assert.doesNotMatch(fn[0], /vorschauSteuer|beispiel/i, 'die Vorschau zeigt nur die Anfrage selbst');
});

test('[Eine Fläche] Name und Zweck reisen im Entwurf', () => {
  const bauen = /function entwurfBauen\(\) \{[\s\S]*?\n\}/.exec(HTML);
  assert.ok(bauen && /vorlageName: STATE\.vorlageName/.test(bauen[0]) && /vorlageZweck: STATE\.vorlageZweck/.test(bauen[0]), 'entwurfBauen schreibt Name und Zweck');
  assert.match(HTML, /STATE\.vorlageName = typeof d\.vorlageName === 'string' \? d\.vorlageName : ''/);
  assert.match(HTML, /STATE\.vorlageZweck = typeof d\.vorlageZweck === 'string' \? d\.vorlageZweck : ''/);
});

test('[Eine Fläche · Rot-Beweis] ein technisches Feld außerhalb der Klappe und eine Spalte ohne Vorschau werden gemeldet', () => {
  const klappe = block(block(HTML, 'div', 'feld-editor'), 'details', 'ed-technisches');
  const ohneKlappe = HTML.replace(klappe, klappe.replace(/<details\b[^>]*>/, '<div>').replace(/<\/details>$/, '</div>'));
  assert.ok(abweichungen(ohneKlappe).includes('die Klappe ed-technisches fehlt in der Feldkarte'));
  const offen = HTML.replace('<details class="eig-erweitert" id="ed-technisches">', '<details class="eig-erweitert" id="ed-technisches" open>');
  assert.deepEqual(abweichungen(offen), ['die Klappe ed-technisches steht offen']);
  const ohneVorschau = HTML.replace('id="av-felder"', 'id="av-weg"');
  assert.deepEqual(abweichungen(ohneVorschau), ['av-felder fehlt in der Vorschau der Anfrage']);
});

/* ── Start der einen Fläche ─────────────────────────────────────────────── */
function startAbweichungen(html) {
  const out = [];
  if (/\bid="raum-assistent"/.test(html)) out.push('ein zweiter Raum (raum-assistent) steht im Markup');
  if (/\bid="kopf-(einfach|fachebene)"/.test(html)) out.push('ein Kopf-Schalter steht im Markup');
  if (/zeigeSchritt\('assistent'\)/.test(html)) out.push('ein Weg führt in einen Assistenten');
  const start = block(html, 'main', 'raum-start');
  if (!start) { out.push('der Start (raum-start) fehlt'); return out; }
  const klappe = block(start, 'details', 'start-angaben');
  if (!klappe) out.push('die Klappe start-angaben fehlt am Start');
  if (/<details\b[^>]*\bid="start-angaben"[^>]*\bopen\b/.test(klappe)) out.push('die Klappe start-angaben steht von Anfang an offen');
  for (const id of ['as-name', 'as-beispiele', 'start-leer']) {
    if (!hatId(start, id)) out.push(id + ' fehlt am Start');
    else if (hatId(klappe, id)) out.push(id + ' steht in der Klappe');
  }
  for (const id of ['as-art', 'as-strasse', 'as-plz', 'as-ort', 'as-land', 'as-rechtsform', 'as-k-name', 'as-k-email']) if (!hatId(klappe, id)) out.push(id + ' steht nicht in der Klappe');
  return out;
}

test('[Eine Fläche · Start] Name der Stelle, Beispiele und leere Vorlage stehen offen da, die Angaben der Stelle zugeklappt; kein zweiter Raum, kein Kopf-Schalter', () => {
  assert.deepEqual(startAbweichungen(HTML), []);
  assert.ok(HTML.includes("if (id === 'willkommen') { dlgZu('dlg-fertig'); raumZeigen('start');"), 'der Anfang ist der Start (seit S-1, der Eingang davor ist entfallen)');
});

test('[Eine Fläche · Start] „Fertigstellen“ öffnet für jede Vorlage die einfache Darstellung und übernimmt die Angaben vom Start', () => {
  const fn = /function fertigOeffnen\(\) \{[^\n]*\}/.exec(HTML);
  assert.ok(fn, 'fertigOeffnen fehlt');
  assert.match(fn[0], /if \(STATE\.art !== 'blatt'\) startAngabenUebernehmen\(\);/);
  assert.match(fn[0], /fertigEinfach = STATE\.art !== 'blatt';/);
});

test('[Eine Fläche · Start · Rot-Beweis] ein zurückgekehrter Kopf-Schalter, ein zweiter Raum und Angaben außerhalb der Klappe werden gemeldet', () => {
  const schalter = HTML.replace('<main id="raum-start"', '<button type="button" id="kopf-fachebene">Expertensicht</button><main id="raum-start"');
  assert.deepEqual(startAbweichungen(schalter), ['ein Kopf-Schalter steht im Markup']);
  const raum = HTML.replace('<main id="raum-start"', '<main id="raum-assistent" class="raum" hidden></main><main id="raum-start"');
  assert.deepEqual(startAbweichungen(raum), ['ein zweiter Raum (raum-assistent) steht im Markup']);
  const klappe = block(block(HTML, 'main', 'raum-start'), 'details', 'start-angaben');
  assert.ok(klappe, 'Vorbedingung: die Klappe ist da');
  const ohne = HTML.replace(klappe, klappe.replace(/<details\b[^>]*>/, '<div>').replace(/<\/details>$/, '</div>'));
  assert.ok(startAbweichungen(ohne).includes('die Klappe start-angaben fehlt am Start'));
});
