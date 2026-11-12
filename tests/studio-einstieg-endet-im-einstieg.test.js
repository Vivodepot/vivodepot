'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Jede Kachel des Einstiegs endet im Einstieg (Studio-Umbau „Einstieg und Expertensicht“, Wagen 1, 09.11.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Befund (RbB Studio Einstieg/Fachebene, 05.11.2026): „Daten bereitstellen“ und „Eigenes Erscheinungsbild“ führten aus dem
   Eingang ohne Übergang in die Expertensicht (die Fachebene, `#raum-start` mit dem Dialog „Weitere Möglichkeiten“), mitten in
   Formatfelder für IT-Fachleute. Der Eingang ist die Ebene ohne Fachbegriffe (U2-ADR-493); die Expertensicht erreicht man
   bewusst, über den Kopf-Schalter „Einfach | Expertensicht“ oder die Kachel „Etwas anderes“.
   Gehalten wird, am Quelltext (ohne Browser):
     1 · jede Kachel in #raum-eingang außer „Etwas anderes“ (ein-anderes) hat ein Ziel im Einstieg (Eingang, Assistent,
         Antworten) und keines in der Expertensicht — oder sie ist eine Hinweiskachel ohne Ziel (Klasse eingang-hinweis);
     2 · eine Hinweiskachel ist entweder der wahre Hinweis „Dokumente empfangen“ (ein-empfangen) oder steht in der benannten
         Ausnahmeliste AUSSTEHEND (Kachel „in Arbeit“, Klasse eingang-folgt, aria-disabled): die Kachel, deren Assistent noch fehlt;
     3 · die Ausnahmeliste kann nur sinken: Deckel 2, und ein Eintrag, dessen Kachel ein Ziel bekommen hat, ist zu streichen.
   ROT-BEWEIS: der Stand vor diesem Wagen meldet ein-bereitstellen und ein-erscheinung (hier am Nachbau der Basis a8609a2c7;
   gegen die Basis selbst: `git show a8609a2c7:vivodepot-studio.html > /tmp/b.html; GENERATOR_HTML_PATH=/tmp/b.html node --test
   tests/studio-einstieg-endet-im-einstieg.test.js` → rot).
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PFAD = process.env.GENERATOR_HTML_PATH ? path.resolve(process.env.GENERATOR_HTML_PATH) : path.join(__dirname, '..', 'vivodepot-studio.html');
const HTML = fs.readFileSync(PFAD, 'utf8');

/* Die Kacheln, deren Assistent noch fehlt (Wagen 2: Erscheinungsbild, Wagen 3: Datenangebote). Deckel: nur sinkend. */
const AUSSTEHEND = Object.freeze({
  'ein-bereitstellen': 'Assistent Datenangebote, Studio-Umbau Wagen 3',
  'ein-erscheinung': 'Assistent Erscheinungsbild, Studio-Umbau Wagen 2',
});
const AUSSTEHEND_DECKEL = 2;
const WAHRER_HINWEIS = ['ein-empfangen'];        // keine Studio-Funktion trägt das (studio-eingang.test.js, Eingang · 6)
const GEWOLLT_EXPERTENSICHT = ['ein-anderes'];   // der bewusste Ausgang für IT-Fachleute

const EINSTIEG = ['willkommen', 'assistent', 'anfrage', 'antworten'];

function eingangVon(html) {
  const a = html.indexOf('<main id="raum-eingang"');
  assert.ok(a > 0, 'kein Eingang (#raum-eingang)');
  return html.slice(a, html.indexOf('</main>', a));
}
function kacheln(html) {
  return [...eingangVon(html).matchAll(/<button type="button" role="listitem" class="([^"]*)" id="([^"]+)"([^>]*)>/g)]
    .map((m) => ({ id: m[2], klassen: m[1].split(/\s+/), attribute: m[3] }));
}
/* Der Rumpf der Klick-Bindung `an('<id>', 'click', …)`, bis zur schließenden Klammer des Aufrufs. */
function bindung(html, id) {
  const kopf = "an('" + id + "', 'click',";
  const i = html.indexOf(kopf);
  if (i < 0) return null;
  let tiefe = 1, k = i + 2;   // i + 2 ist die öffnende Klammer von an(
  while (k < html.length && tiefe) { const c = html[++k]; if (c === '(') tiefe++; else if (c === ')') tiefe--; }
  return html.slice(i, k + 1);
}
function ziele(rumpf) {
  const raus = [...rumpf.matchAll(/zeigeSchritt\('([a-z]+)'\)/g)].map((m) => m[1]);
  if (/modulOeffnen\(/.test(rumpf)) raus.push('modul');
  return raus;
}

function befunde(html, ausstehend = AUSSTEHEND) {
  const f = [];
  const alle = kacheln(html);
  for (const k of alle) {
    if (GEWOLLT_EXPERTENSICHT.includes(k.id)) continue;
    const rumpf = bindung(html, k.id);
    const z = rumpf ? ziele(rumpf) : [];
    const fach = z.filter((x) => !EINSTIEG.includes(x));
    if (fach.length) { f.push(k.id + ' führt in die Expertensicht (' + fach.join(', ') + ')'); continue; }
    if (k.klassen.includes('eingang-hinweis')) {
      if (z.length) f.push(k.id + ' ist als Hinweis markiert, hat aber ein Ziel');
      else if (!WAHRER_HINWEIS.includes(k.id) && !(k.id in ausstehend)) f.push(k.id + ' ist ein Hinweis ohne Ziel und steht nicht in der Ausnahmeliste');
      if (k.id in ausstehend && !(k.klassen.includes('eingang-folgt') && /aria-disabled="true"/.test(k.attribute))) f.push(k.id + ' steht in der Ausnahmeliste, ist aber nicht als „in Arbeit“ markiert');
      continue;
    }
    if (!z.length) f.push(k.id + ' hat kein Ziel');
    if (k.id in ausstehend) f.push(k.id + ' hat ein Ziel im Einstieg: aus der Ausnahmeliste streichen');
  }
  for (const id of Object.keys(ausstehend)) if (!alle.some((k) => k.id === id)) f.push(id + ' steht in der Ausnahmeliste, die Kachel gibt es nicht mehr');
  return f;
}

/* Nachbau der Basis a8609a2c7: die zwei Kacheln mit Pfeil und mit ihrer damaligen Bindung in die Fachebene. */
function basisNachbau(html) {
  let b = html;
  for (const id of Object.keys(AUSSTEHEND)) {
    b = b.replace(new RegExp('class="kachel eingang-kachel eingang-hinweis eingang-folgt" id="' + id + '" aria-disabled="true">(<span class="ek-glyph"[^]*?</span>)<span class="ek-pfeil ek-folgt" data-en="in progress">in Arbeit</span>'),
      'class="kachel eingang-kachel" id="' + id + '">$1<span class="ek-pfeil" aria-hidden="true">→</span>');
  }
  return b.replace("an('ein-anderes', 'click',", "an('ein-bereitstellen', 'click', () => { zeigeSchritt('fachebene'); modulOeffnen('fm'); });\n"
    + "  an('ein-erscheinung', 'click', () => { zeigeSchritt('fachebene'); modulOeffnen('bd'); });\n  an('ein-anderes', 'click',");
}

test('[Einstieg] jede Kachel des Eingangs außer „Etwas anderes“ endet im Einstieg oder ist ein Hinweis ohne Ziel', () => {
  const alle = kacheln(HTML);
  assert.ok(alle.length > 0, 'Vorbedingung: Kacheln gelesen');
  assert.ok(alle.some((k) => k.id === 'ein-anderes'), 'Vorbedingung: „Etwas anderes“ gefunden');
  assert.ok(bindung(HTML, 'ein-anfrage'), 'Vorbedingung: Bindungen gelesen');
  assert.deepEqual(befunde(HTML), []);
});

test('[Einstieg] „Vorlage erstellen“ steht auf der ersten Ebene und benutzt den Assistenten Aufnahmebogen mit', () => {
  assert.ok(kacheln(HTML).some((k) => k.id === 'ein-vorlage'), 'Kachel ein-vorlage fehlt');
  assert.deepEqual(ziele(bindung(HTML, 'ein-vorlage') || ''), ['assistent']);
  assert.match(bindung(HTML, 'ein-vorlage'), /assistentNeu\(\)/);
});

test('[Einstieg · Deckel] die Ausnahmeliste kann nur sinken (Deckel ' + AUSSTEHEND_DECKEL + ')', () => {
  assert.ok(Object.keys(AUSSTEHEND).length <= AUSSTEHEND_DECKEL, 'Ausnahmeliste über dem Deckel');
  for (const [id, grund] of Object.entries(AUSSTEHEND)) assert.match(grund, /Wagen \d/, id + ': ohne Verweis auf den Wagen');
});

test('[Einstieg · Rot-Beweis] der Stand vor Wagen 1 meldet „Daten bereitstellen“ und „Eigenes Erscheinungsbild“', () => {
  const basis = basisNachbau(HTML);
  assert.notEqual(basis, HTML, 'Vorbedingung: der Nachbau ändert etwas');
  assert.deepEqual(befunde(basis), ['ein-bereitstellen führt in die Expertensicht (fachebene, modul)', 'ein-erscheinung führt in die Expertensicht (fachebene, modul)']);
});

test('[Einstieg · Rot-Beweis] ein neuer Hinweis ohne Ausnahme, ein Ziel an einer „in Arbeit“-Kachel und eine Kachel in die Expertensicht fallen auf', () => {
  const neuHinweis = HTML.replace('class="kachel eingang-kachel" id="ein-vorlage"', 'class="kachel eingang-kachel eingang-hinweis" id="ein-vorlage"')
    .replace("an('ein-vorlage', 'click', () => { assistentNeu(); zeigeSchritt('assistent'); });", '');
  assert.deepEqual(befunde(neuHinweis), ['ein-vorlage ist ein Hinweis ohne Ziel und steht nicht in der Ausnahmeliste']);
  const mitZiel = HTML.replace("an('ein-anderes', 'click',", "an('ein-erscheinung', 'click', () => zeigeSchritt('assistent'));\n  an('ein-anderes', 'click',");
  assert.deepEqual(befunde(mitZiel), ['ein-erscheinung ist als Hinweis markiert, hat aber ein Ziel']);
  const fach = HTML.replace("an('ein-vorlage', 'click', () => { assistentNeu(); zeigeSchritt('assistent'); });", "an('ein-vorlage', 'click', () => zeigeSchritt('template'));");
  assert.deepEqual(befunde(fach), ['ein-vorlage führt in die Expertensicht (template)']);
  assert.deepEqual(befunde(HTML, Object.assign({ 'ein-weg': 'Wagen 9' }, AUSSTEHEND)), ['ein-weg steht in der Ausnahmeliste, die Kachel gibt es nicht mehr']);
});
