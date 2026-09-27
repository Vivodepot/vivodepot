'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — `select` und `input[type="date"]` erben die App-Schrift (Inter)
   AUCH AUSSERHALB von `.feld-zeile`
   ────────────────────────────────────────────────────────────────────────
   Screenshot-Review Fund 1 (26.08.2026): ein Dropdown ("— bitte wählen —")
   und ein Datumsfeld erschienen in der Browser-Standardschrift statt Inter.

   DER BEFUND. `.feld-zeile input, .feld-zeile select { font-family: inherit; ... }`
   trug die Reparatur schon lange, aber NUR für Feld-Zeilen im normalen
   Bereichs-Formular. Drei weitere Render-Pfade zeigen denselben Feld-Typ
   OHNE diese Zeile:
     - der Vorsorge-Wizard (`.wizard-eingabe input/select`, bekam am 25.08.
       einen Rand — s. tests/wizard-eingabe-rand-kontrast.test.js —, aber
       nie die Schriftart),
     - das Sub-Depot-Anlegen-Modal (`#sub-grundlage`, exakt das im Screenshot
       sichtbare "— bitte wählen —"-Dropdown, STRINGS.subGrundlageLeer),
     - das Dokumente-Panel (`.doku-select`, `.doku-input[type="date"]`).

   Statt jeden Wrapper einzeln nachzuziehen: ein globaler Reset
   (`textarea, select, input[type="date"] { font-family: inherit; }`)
   schließt die Lücke für ALLE heutigen und künftigen Vorkommen — dieselbe
   Technik, die `textarea` schon seit K4 Zug 3 (10.08.2026) trägt (Kommentar
   direkt darüber im Kern).

   Geprüft wird die REGEL (ein globaler, ungescopeter Selektor), nicht nur
   die drei Fundstellen von heute.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

function leafRegeln(css) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const out = [];
  let m;
  while ((m = re.exec(css)) !== null) out.push({ selector: m[1].trim(), decl: m[2] });
  return out;
}

/* Anker über die Kennung `id="design-system"`, nicht über die Position (Fund 18.09.2026,
   Rahmen-Schutz-Nachtrag): „das erste <style>" und, unabhängig davon, „das erste </style>"
   kreuzen sich, sobald ein weiteres <style>-Element davorsteht — real getroffen durch den
   Rahmen-Schutz-Block. Beide Enden jetzt an derselben, benannten Stelle verankert. */
function ladeStyleBlock() {
  const html = fs.readFileSync(KERN, 'utf8');
  const MARKER = '<style id="design-system">';
  const markerAt = html.indexOf(MARKER);
  const start = markerAt === -1 ? -1 : markerAt + MARKER.length;
  const end = start === -1 ? -1 : html.indexOf('</style>', start);
  assert.ok(start > -1 && end > start, '<style id="design-system">-Block gefunden');
  return html.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
}

// Ein "globaler" Teilselektor trägt keinen Klassen-/ID-/Nachfahren-Bezug — anders als
// `.feld-zeile select`, das nur INNERHALB dieses einen Wrappers greift.
function istGlobalerTeilselektor(teil) {
  return /^\s*(select|input\[type="date"\]|textarea)\s*$/.test(teil);
}

describe('[Select/Datum-Schriftart] globaler Reset statt Wrapper-für-Wrapper', () => {
  test('eine Regel setzt font-family: inherit auf ungescoptes `select` UND `input[type="date"]`', () => {
    const regeln = leafRegeln(ladeStyleBlock());
    const treffer = regeln.filter((r) => {
      const teile = r.selector.split(',').map((s) => s.trim());
      const traegtSelect = teile.some((t) => t === 'select');
      const traegtDatum = teile.some((t) => t === 'input[type="date"]');
      return traegtSelect && traegtDatum;
    });
    assert.ok(treffer.length >= 1,
      'keine Regel kombiniert ein ungescoptes `select` mit `input[type="date"]" — die Wrapper-Lücke bleibt offen');
    assert.ok(treffer.some((r) => /font-family\s*:\s*inherit/.test(r.decl)),
      'die gefundene Regel setzt nicht font-family: inherit');
  });

  test('die drei betroffenen Fundstellen bleiben außerhalb von `.feld-zeile` (Diagnose-Beleg)', () => {
    const html = fs.readFileSync(KERN, 'utf8');
    // #sub-grundlage: Sub-Depot-Anlegen-Modal, das exakte "— bitte wählen —"-Dropdown im Screenshot.
    assert.match(html, /<select id="sub-grundlage">/, 'sub-grundlage-Select nicht gefunden — Diagnose veraltet?');
    // .doku-select/.doku-input: Dokumente-Panel, Datum + Rhythmus-Dropdown nebeneinander.
    assert.match(html, /class="doku-select"/, 'doku-select nicht gefunden — Diagnose veraltet?');
    assert.match(html, /type="date" id="doku-neu-datum" class="doku-input"/, 'doku-neu-datum nicht gefunden — Diagnose veraltet?');
    // .wizard-eingabe: Vorsorge-Wizard, rendert denselben feldInputHTML-Renderer wie .feld-zeile.
    assert.match(html, /class="feld-wert wizard-eingabe"/, 'wizard-eingabe-Wrapper nicht gefunden — Diagnose veraltet?');
  });
});

describe('[Select/Datum-Schriftart·Rotmachbarkeit] die Maschine kann tatsächlich rot werden', () => {
  test('ein Reset, der nur `select` (ohne das Datumsfeld) trägt, fällt durch', () => {
    const nurSelect = 'select { font-family: inherit; }';
    const regeln = leafRegeln(nurSelect);
    const treffer = regeln.filter((r) => {
      const teile = r.selector.split(',').map((s) => s.trim());
      return teile.some((t) => t === 'select') && teile.some((t) => t === 'input[type="date"]');
    });
    assert.deepEqual(treffer, [], 'ein Reset ohne input[type="date"] darf die Probe nicht bestehen');
  });

  test('eine auf `.wizard-eingabe` gescopte Regel fällt durch (das ist genau die alte Lücke)', () => {
    const nurWizard = '.wizard-eingabe input, .wizard-eingabe textarea, .wizard-eingabe select { font-family: inherit; }';
    const regeln = leafRegeln(nurWizard);
    const treffer = regeln.filter((r) => {
      const teile = r.selector.split(',').map((s) => s.trim());
      return teile.some((t) => t === 'select') && teile.some((t) => t === 'input[type="date"]');
    });
    assert.deepEqual(treffer, [], 'eine gescopte Regel (nur .wizard-eingabe) darf die globale Probe nicht bestehen');
  });

  test('istGlobalerTeilselektor unterscheidet `select` von `.feld-zeile select`', () => {
    assert.ok(istGlobalerTeilselektor('select'));
    assert.ok(!istGlobalerTeilselektor('.feld-zeile select'));
  });
});
