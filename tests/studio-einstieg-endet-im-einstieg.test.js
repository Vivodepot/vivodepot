'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Jede Kachel des Einstiegs endet im Einstieg (Studio-Umbau „Einstieg und Expertensicht“, Wagen 1, 09.11.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Befund (RbB Studio Einstieg/Fachebene, 05.11.2026): „Daten bereitstellen“ und „Eigenes Erscheinungsbild“ führten aus dem
   Eingang ohne Übergang in die Expertensicht (die Fachebene, `#raum-start` mit dem Dialog „Weitere Möglichkeiten“), mitten in
   Formatfelder für IT-Fachleute. Der Eingang ist die Ebene ohne Fachbegriffe (U2-ADR-493). Seit 14.11.2026 gibt es
   eine Arbeitsfläche ohne Kopf-Schalter; ihr Start ist ein Ziel des Einstiegs, die Module dahinter sind es nicht.
   Gehalten wird, am Quelltext (ohne Browser):
     1 · jede Kachel in #raum-eingang außer „Etwas anderes“ (ein-anderes) hat ein Ziel im Einstieg (Eingang, Start der einen
         Arbeitsfläche, Anfrage, Antworten) und keines in einem Modul oder mitten in der Arbeitsfläche — oder sie ist eine Hinweiskachel ohne Ziel (Klasse eingang-hinweis);
     2 · eine Hinweiskachel ist entweder der wahre Hinweis „Dokumente empfangen“ (ein-empfangen) oder steht in der benannten
         Ausnahmeliste AUSSTEHEND (Kachel „in Arbeit“, Klasse eingang-folgt, aria-disabled): die Kachel, deren Assistent noch fehlt;
     3 · die Ausnahmeliste kann nur sinken: Deckel 2, und ein Eintrag, dessen Kachel ein Ziel bekommen hat, ist zu streichen.
   ROT-BEWEIS: der Stand vor diesem Wagen meldet ein-bereitstellen und ein-erscheinung (hier am Nachbau der Basis a8609a2c7;
   gegen die Basis selbst: `git show a8609a2c7:vivodepot-studio.html > /tmp/b.html; GENERATOR_HTML_PATH=/tmp/b.html node --test
   tests/studio-einstieg-endet-im-einstieg.test.js` → rot).
   Seit dem Vorgabe-Dummy (S-1, 16.11.2026) gibt es keinen eigenen Eingang mehr: Das Studio beginnt im Start, die Ziel-Kacheln,
   die nicht auf den Start zurückführten, stehen unter „Weitere Wege“ (#start-weitere), und „Etwas anderes“ ist dort „Weitere
   Möglichkeiten zeigen“ (start-module). Die Regeln 1–3 gelten für die Kacheln unter „Weitere Wege“ unverändert.
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
});   // ein-erscheinung steht seit 17.11.2026 nicht mehr auf dem Start (Dummy 14.11.2026), bis ihr Assistent fertig ist
const AUSSTEHEND_DECKEL = 1;
const WAHRER_HINWEIS = ['ein-empfangen'];        // keine Studio-Funktion trägt das (studio-eingang.test.js, Eingang · 6)
const GEWOLLT_EXPERTENSICHT = [];   // der bewusste Ausgang für IT-Fachleute ist seit S-1 der Knopf start-module, keine Kachel

/* Seit 14.11.2026 gibt es eine Arbeitsfläche: ihr Start (Schritt „fachebene“, `#raum-start`: Name der Stelle, Beispiele, Kacheln)
   ist ein Ziel des Einstiegs. Ein Sprung in ein Modul oder mitten in die Arbeitsfläche bleibt ein Befund. */
const EINSTIEG = ['willkommen', 'fachebene', 'anfrage', 'antworten'];

function eingangVon(html) {
  const a = html.indexOf('<details class="start-weitere" id="start-weitere">');
  assert.ok(a > 0, 'keine Weiteren Wege (#start-weitere)');
  return html.slice(a, html.indexOf('</details>', a));
}
function kacheln(html) {
  return [...eingangVon(html).matchAll(/<button type="button" class="(kachel eingang-kachel[^"]*)" id="([^"]+)"([^>]*)>/g)]
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
    const fach = z.filter((x) => !EINSTIEG.includes(x) || (x === 'fachebene' && z.includes('modul')));
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
  return b.replace("an('ein-empfangen', 'click',", "an('ein-bereitstellen', 'click', () => { zeigeSchritt('fachebene'); modulOeffnen('fm'); });\n"
    + "  an('ein-empfangen', 'click',");
}

test('[Einstieg] jede Kachel unter „Weitere Wege“ endet im Einstieg oder ist ein Hinweis ohne Ziel', () => {
  const alle = kacheln(HTML);
  assert.ok(alle.length > 0, 'Vorbedingung: Kacheln gelesen');
  assert.ok(bindung(HTML, 'ein-anfrage'), 'Vorbedingung: Bindungen gelesen');
  assert.deepEqual(befunde(HTML), []);
});

test('[Einstieg] der Start ist die erste Ebene: keine Kacheln, die nur auf ihn zurückführten („Vorlage erstellen“, „Aufnahmebogen“, „Etwas anderes“); kein Kopf-Schalter', () => {
  for (const id of ['ein-vorlage', 'ein-aufnahme', 'ein-anderes']) {
    assert.ok(!new RegExp('id="' + id + '"').test(HTML), 'Kachel ' + id + ' steht noch');
    assert.equal(bindung(HTML, id), null, 'Bindung ' + id + ' steht noch');
  }
  assert.match(HTML, /<main id="raum-start" class="raum">/);
  assert.doesNotMatch(HTML, /id="kopf-einfach"|id="kopf-fachebene"/);
});

test('[Einstieg · Deckel] die Ausnahmeliste kann nur sinken (Deckel ' + AUSSTEHEND_DECKEL + ')', () => {
  assert.ok(Object.keys(AUSSTEHEND).length <= AUSSTEHEND_DECKEL, 'Ausnahmeliste über dem Deckel');
  for (const [id, grund] of Object.entries(AUSSTEHEND)) assert.match(grund, /Wagen \d/, id + ': ohne Verweis auf den Wagen');
});

test('[Einstieg · Rot-Beweis] der Stand vor Wagen 1 meldet „Daten bereitstellen“', () => {
  const basis = basisNachbau(HTML);
  assert.notEqual(basis, HTML, 'Vorbedingung: der Nachbau ändert etwas');
  assert.deepEqual(befunde(basis), ['ein-bereitstellen führt in die Expertensicht (fachebene, modul)']);
});

test('[Einstieg · Rot-Beweis] ein neuer Hinweis ohne Ausnahme, ein Ziel an einer „in Arbeit“-Kachel und eine Kachel in die Expertensicht fallen auf', () => {
  const neuHinweis = HTML.replace('class="kachel eingang-kachel" id="ein-anfrage"', 'class="kachel eingang-kachel eingang-hinweis" id="ein-anfrage"')
    .replace("an('ein-anfrage', 'click', () => { anfrageAssistentEintreten(); zeigeSchritt('anfrage'); });", '');
  assert.deepEqual(befunde(neuHinweis), ['ein-anfrage ist ein Hinweis ohne Ziel und steht nicht in der Ausnahmeliste']);
  const mitZiel = HTML.replace("an('ein-empfangen', 'click',", "an('ein-bereitstellen', 'click', () => zeigeSchritt('fachebene'));\n  an('ein-empfangen', 'click',");
  assert.deepEqual(befunde(mitZiel), ['ein-bereitstellen ist als Hinweis markiert, hat aber ein Ziel']);
  const fach = HTML.replace("an('ein-anfrage', 'click', () => { anfrageAssistentEintreten(); zeigeSchritt('anfrage'); });", "an('ein-anfrage', 'click', () => zeigeSchritt('template'));");
  assert.notEqual(fach, HTML);
  assert.deepEqual(befunde(fach), ['ein-anfrage führt in die Expertensicht (template)']);
  assert.deepEqual(befunde(HTML, Object.assign({ 'ein-weg': 'Wagen 9' }, AUSSTEHEND)), ['ein-weg steht in der Ausnahmeliste, die Kachel gibt es nicht mehr']);
});
