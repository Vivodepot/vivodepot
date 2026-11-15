'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Studio · Wagen S-A2 (10.11.2026): Einfach-Weg „Vorlage erstellen“ ohne Stolpern
   (Bauplan studio-umbauplan-vergleich-2026-11-10, Zeilen 16, 18, 19, 22)
     Z.16 · Schritt 1 und der Dialog „Einreichen“ zeigen die nötigen Felder mit Stern (.muss) und aria-required; die Felder im
            Dialog bekommen bei fehlender Eingabe denselben roten Rahmen wie .as-eingabe[aria-invalid]. Vor dem ersten Fehler
            steht kein roter Kasten (Meldungen sind hidden).
     Z.18 · „Weiter: Einreichen“ bleibt ohne Namen oder Fragen nicht stumm: Rahmen und kurze Meldung am Namensfeld, bei leerer
            Liste ein Leerzustand mit Knopf „Beispiel nehmen“; Enter im Fragefeld fügt hinzu.
     Z.19 · Schritt 3 („Aussehen“) trägt den Chip „später“.
     Z.22 · „Standardfeld“ steht nirgends als sichtbarer Text oder Beschriftung, nur in Code-Kommentaren.
   ROT-BEWEIS: `git show 50daa495d:vivodepot-studio.html > <kopie>; GENERATOR_HTML_PATH=<kopie> node --test tests/studio-sa2.test.js`
   → Z.16, Z.18, Z.19 rot; Z.22: `git show 7cb49ed99^:vivodepot-studio.html` → rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const PFAD = process.env.GENERATOR_HTML_PATH ? path.resolve(process.env.GENERATOR_HTML_PATH) : path.join(__dirname, '..', 'vivodepot-studio.html');
const HTML = fs.readFileSync(PFAD, 'utf8');

function tag(html, id) {
  const m = html.match(new RegExp('<[a-z]+ [^>]*\\bid="' + id + '"[^>]*>'));
  assert.ok(m, 'kein Element mit id ' + id);
  return m[0];
}
function labelZu(html, id) {
  const m = html.match(new RegExp('<label [^>]*for="' + id + '"[^>]*>'));
  assert.ok(m, 'kein Label zu ' + id);
  return m[0] + html.slice(m.index + m[0].length, m.index + m[0].length + 120);
}
const PFLICHT = ['name', 'strasse', 'plz', 'ort', 'land', 'k-email'];   // k-name: seit S-C (10.11.2026) freiwillig, Probe tests/studio-ansprechperson-freiwillig.test.js

/* ── Z.16 ──────────────────────────────────────────────────────────────────── */
test('[S-A2 · Z.16] Schritt 1 und der Dialog markieren die nötigen Felder (Stern über .muss, aria-required)', () => {
  for (const f of PFLICHT) {
    for (const vor of ['as-', 'sd-']) {
      const id = vor + f;
      assert.match(labelZu(HTML, id), /class="(?:[^"]* )?muss(?: [^"]*)?"/, id + ': Beschriftung ohne Stern');
      assert.match(tag(HTML, id), /aria-required="true"/, id + ': ohne aria-required');
    }
  }
  assert.match(HTML, /\.muss::after\s*\{\s*content:\s*" \*";\s*color:\s*var\(--fehler\)/, 'Regel .muss::after fehlt');
  for (const frei of ['sd-ustid', 'sd-k-telefon', 'as-rechtsform', 'as-k-name', 'sd-k-name']) assert.doesNotMatch(tag(HTML, frei), /aria-required/, frei + ' ist freiwillig');
});
test('[S-A2 · Z.16] die Felder im Dialog bekommen den roten Rahmen der Regel .as-eingabe[aria-invalid]', () => {
  const m = HTML.match(/([^{}\n]*aria-invalid="true"[^{}\n]*)\{\s*box-shadow:\s*inset 0 0 0 2px var\(--fehler-rand\)/);
  assert.ok(m, 'Regel mit aria-invalid fehlt');
  assert.match(m[1], /\.as-eingabe\[aria-invalid="true"\]/);
  assert.match(m[1], /\.feld-grid input\[aria-invalid="true"\]/, 'die Regel erreicht die Felder im Dialog nicht');
  const dlg = HTML.slice(HTML.indexOf('id="sd-fehler"'), HTML.indexOf('class="fs-mehr"'));
  assert.match(dlg, /class="feld-grid"/);
  for (const f of PFLICHT) assert.ok(dlg.includes('id="sd-' + f + '"'), 'sd-' + f + ' liegt nicht im feld-grid des Dialogs');
});
test('[S-A2 · Z.16] fehlende Eingabe setzt aria-invalid an den Feldern des Dialogs; mit der Eingabe geht der Rahmen', () => {
  const { sandbox, document } = ladeGenerator();
  const gesetzt = {};
  for (const f of PFLICHT) { const e = document.getElementById('sd-' + f); e.setAttribute = (k, v) => { gesetzt[f] = [k, v]; }; e.removeAttribute = () => {}; }
  const box = document.getElementById('sd-fehler');
  sandbox.stammdatenFehlerZeigen(['Bitte geben Sie die Straße an.', 'Bitte geben Sie den Ort an.']);
  assert.deepEqual(gesetzt.strasse, ['aria-invalid', 'true']);
  assert.deepEqual(gesetzt.ort, ['aria-invalid', 'true']);
  assert.equal(gesetzt.plz, undefined);
  assert.equal(box.hidden, false);
  assert.match(fs.readFileSync(PFAD, 'utf8'), /STAMMDATEN_FEHLER_FELD\)\.forEach\(\(id\) => \{ const f = \$\(id\); if \(f\) f\.addEventListener\('input', \(\) => f\.removeAttribute\('aria-invalid'\)\)/);
});
test('[S-A2 · Z.16] vor dem ersten Fehler steht kein roter Kasten: die Meldungen sind verborgen', () => {
  for (const id of ['sd-fehler', 'as-name-meldung', 'as-fragen-meldung']) assert.match(tag(HTML, id), /\bhidden\b/, id + ' ist von Anfang an sichtbar');
});

/* ── Z.18 ──────────────────────────────────────────────────────────────────── */
function gebunden() {
  const g = ladeGenerator();
  const { V, sandbox, document } = g;
  V.spracheFuerProbeSetzen('de');
  V.ASSISTENT.name = ''; V.ASSISTENT.fragen = []; V.ASSISTENT.art = null;
  const handler = {};
  sandbox.assistentBinden((id, ev, fn) => { handler[id + ':' + ev] = fn; });
  const attr = {};
  const name = document.getElementById('as-name');
  name.setAttribute = (k, v) => { attr[k] = v; }; name.removeAttribute = (k) => { delete attr[k]; };
  name.focus = () => { attr.__fokus = 'as-name'; };
  return Object.assign(g, { handler, attr, name });
}
test('[S-A2 · Z.18] „Weiter: Einreichen“ ohne Namen ist nicht stumm: Rahmen und Meldung am Feld; die erste Eingabe nimmt beides zurück', () => {
  const { V, document, handler, attr, name } = gebunden();
  assert.ok(handler['as-weiter-2:click'], 'Knopf nicht gebunden');
  assert.ok(handler['as-name:input'], 'Namensfeld nicht gebunden');
  const meldung = document.getElementById('as-name-meldung');
  meldung.hidden = true;
  handler['as-weiter-2:click']();
  assert.equal(attr['aria-invalid'], 'true', 'kein roter Rahmen am Namensfeld');
  assert.equal(meldung.hidden, false, 'keine sichtbare Meldung');
  assert.equal(attr.__fokus, 'as-name');
  name.value = 'Sportverein'; V.ASSISTENT.name = 'Sportverein';
  handler['as-name:input']();
  assert.equal(attr['aria-invalid'], undefined, 'Rahmen bleibt stehen');
  assert.equal(meldung.hidden, true, 'Meldung bleibt stehen');
});
test('[S-A2 · Z.18] „Weiter: Einreichen“ ohne Fragen zeigt einen Leerzustand mit Knopf „Beispiel nehmen“, der ein Beispiel lädt', () => {
  const { V, sandbox, document, handler } = gebunden();
  V.ASSISTENT.name = 'Sportverein Beispielstadt';
  const leer = document.getElementById('as-fragen-meldung'); leer.hidden = true;
  handler['as-weiter-2:click']();
  assert.equal(leer.hidden, false, 'kein Leerzustand');
  assert.equal(V.ASSISTENT.fragen.length, 0);
  assert.ok(handler['as-beispiel-nehmen:click'], 'der Knopf „Beispiel nehmen“ ist nicht gebunden');
  handler['as-beispiel-nehmen:click']();
  assert.ok(V.ASSISTENT.fragen.length > 0, 'das Beispiel wurde nicht geladen');
  assert.equal(leer.hidden, true, 'der Leerzustand bleibt trotz Fragen stehen');
  assert.match(tag(HTML, 'as-beispiel-nehmen'), /data-en="Use an example"/);
  assert.match(HTML, /id="as-fragen-meldung"[^>]*hidden><span data-en="No question yet\.">Noch keine Frage\.<\/span>/);
  assert.match(HTML, /id="as-name-meldung"[^>]*data-en="Please enter a name\.">Bitte tragen Sie einen Namen ein\./);
  void sandbox;
});
test('[S-A2 · Z.18] Enter im Fragefeld fügt die Frage hinzu', () => {
  const { V, document, handler } = gebunden();
  assert.ok(handler['as-neu-frage:keydown'], 'Enter im Fragefeld ist nicht gebunden');
  V.ASSISTENT.fragen = [];
  document.getElementById('as-neu').dataset = { art: 'text' };
  document.getElementById('as-neu-frage').value = 'Wie heißt Ihr Haustier?';
  let verhindert = false;
  handler['as-neu-frage:keydown']({ key: 'Enter', preventDefault: () => { verhindert = true; } });
  assert.equal(V.ASSISTENT.fragen.length, 1);
  assert.equal(V.ASSISTENT.fragen[0].frage, 'Wie heißt Ihr Haustier?');
  assert.equal(verhindert, true);
  handler['as-neu-frage:keydown']({ key: 'a', preventDefault: () => {} });
  assert.equal(V.ASSISTENT.fragen.length, 1, 'eine andere Taste fügt nichts hinzu');
});

/* ── Z.19 ──────────────────────────────────────────────────────────────────── */
test('[S-A2 · Z.19] Schritt 3 trägt den Chip „später“ (DE und EN)', () => {
  const a = HTML.indexOf('id="as-sl-3"');
  const li = HTML.slice(a, HTML.indexOf('</li>', a));
  assert.match(li, /<span class="as-chip as-chip-klein" data-en="later">später<\/span>/);
  assert.match(HTML, /\.as-chip\.as-chip-klein\s*\{/);
});

/* ── Z.22 ──────────────────────────────────────────────────────────────────── */
test('[S-A2 · Z.22] „Standardfeld“ steht nur in Code-Kommentaren, nie als sichtbarer Text oder Beschriftung', () => {
  const re = /Standard-?feld|Standard field/gi;
  let m, n = 0;
  while ((m = re.exec(HTML))) {
    n++;
    const vor = HTML.slice(0, m.index);
    const imBlock = vor.lastIndexOf('/*') > vor.lastIndexOf('*/') || vor.lastIndexOf('<!--') > vor.lastIndexOf('-->');
    const zeile = vor.slice(vor.lastIndexOf('\n') + 1);
    const imZeilenkommentar = /(^|[^:'"])\/\/ /.test(zeile) || /^\s*\/\//.test(zeile);
    assert.ok(imBlock || imZeilenkommentar, 'sichtbarer Treffer: ' + HTML.slice(m.index - 40, m.index + 40).replace(/\n/g, ' '));
  }
  assert.ok(n >= 0);
});
