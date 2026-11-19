'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Studio · Wagen S-A2 (10.11.2026): Einfach-Weg „Vorlage erstellen“ ohne Stolpern
   (Bauplan studio-umbauplan-vergleich-2026-11-10, Zeilen 16, 18, 19, 22)
     Z.16 · Schritt 1 und der Dialog „Einreichen“ zeigen die nötigen Felder mit Stern (.muss) und aria-required; die Felder im
            Dialog bekommen bei fehlender Eingabe denselben roten Rahmen wie .as-eingabe[aria-invalid]. Vor dem ersten Fehler
            steht kein roter Kasten (Meldungen sind hidden).
     Z.18 · „Fertigstellen“ bleibt ohne Namen oder Felder nicht stumm: Rahmen und Meldung am Namensfeld in „Wer reicht ein?“, bei
            leerer Vorlage ein Leerzustand und der Weg zur Bausteinliste. (Enter im Feld „Eigene Frage“ kehrt mit dem Baustein zurück.)
     Z.19 · entfallen mit der Schrittleiste (14.11.2026): es wird kein späterer Schritt mehr angekündigt.
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
  for (const id of ['sd-fehler']) assert.match(tag(HTML, id), /\bhidden\b/, id + ' ist von Anfang an sichtbar');
});

/* ── Z.18 (seit 14.11.2026 an der einen Arbeitsfläche) ─────────────────────── */
test('[S-A2 · Z.18] „Fertigstellen“ ohne Namen ist nicht stumm: es öffnet „Wer reicht ein?“, das Namensfeld bekommt Rahmen und Meldung', () => {
  const g = ladeGenerator();
  const { V, sandbox, document } = g;
  V.spracheFuerProbeSetzen('de');
  V.ASSISTENT.name = ''; V.ASSISTENT.art = '';
  V.startBeispielLaden('verein');
  sandbox.fertigOeffnen();
  assert.equal(V.STATE.anbieter, null);
  assert.equal(sandbox.naechsterFertigSchritt(), 'stammdaten');
  const fehler = JSON.parse(JSON.stringify(V.validiereStammdaten(sandbox.leseStammdatenForm())));
  assert.ok(fehler.some((f) => V.STAMMDATEN_FEHLER_FELD[f] === 'sd-name'), 'der fehlende Name wird gemeldet');
  const gesetzt = {};
  const name = document.getElementById('sd-name'); name.setAttribute = (k, v) => { gesetzt[k] = v; };
  const box = document.getElementById('sd-fehler'); box.hidden = true;
  sandbox.stammdatenFehlerZeigen(fehler);
  assert.equal(gesetzt['aria-invalid'], 'true', 'kein roter Rahmen am Namensfeld');
  assert.equal(box.hidden, false, 'keine sichtbare Meldung');
});
test('[S-A2 · Z.18] ohne Felder ist die Arbeitsfläche nicht stumm: „Noch keine Felder“, in der Vorschau „Noch kein Datenfeld.“, und die Prüfung nennt den Weg zur Bausteinliste', () => {
  assert.match(HTML, /chip\.textContent = L\('Noch keine Felder', 'No fields yet'\)/);
  assert.match(HTML, /class: 'av-leer', text: L\('Hier erscheinen die Datenfelder Ihrer Vorlage\.', 'The data fields of your template appear here\.'\)/);   // Wortlaut seit S-1 nach dem Dummy (N64)
  const { V } = ladeGenerator();
  const res = V.pruefeKonformitaet({ felder: [] }, { nurInhalt: true });
  const leer = res.blocker.find((b) => /^Es ist noch kein Feld definiert\./.test(b));
  assert.ok(leer, 'kein Blocker zum fehlenden Feld');
  const ziel = JSON.parse(JSON.stringify(V.meldungZiel(leer, [])));
  assert.equal(ziel.fokus, 'palette', 'der Weg führt zur Bausteinliste');   // seit S-2 ohne Gesamtsuche
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
