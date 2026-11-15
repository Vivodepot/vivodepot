'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Die Herausgabe kommt ohne Kästchen aus — auch im Ganzes-Depot-Weg (Austausch, 11.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Entscheidung vom 12.08.2026: Der Normalweg zeigt eine Liste zum Lesen; kein Bedienelement an den einzelnen Angaben.
   Abgewählt wird über den Zustandssatz und den Knopf „Zurückhalten“ / „Doch mitgeben“.
   Die Wege mit Bereich, Anlass und Kennungen prüft tests/anlass-herausgabe-nicht-still-leer.test.js ([A1·Kein Kästchen]).
   Diese Probe prüft die Wege, die dort fehlen: das ganze Depot, die eigene Zusammenstellung, die Übergabe an eine
   Wallet und die Ansicht zum Zusammenstellen. Sie prüft die Klasse: jedes Fenster und jede Ansicht, die ein solcher
   Weg öffnet, nicht eine einzelne Stelle.

   Eine Ausnahme, benannt: die Auswahl für das ganze Depot ohne Bereich. Die Entscheidung vom 12.08.2026 führt sie
   unter „Was offen bleibt“; sie trägt bis zu einer Entscheidung darüber Kästchen. Die Probe hält fest, dass es
   genau diese eine ist, und schlägt an, sobald sie entfällt oder eine zweite dazukommt.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'ohne-kaestchen-pw-2026';
const KAESTCHEN = /type="checkbox"|role="checkbox"/;

async function depot() {
  const k = ladeKern();
  const V = k.V;
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Elena Beispiel');
  V.betreteApp();
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'MARKE-Penicillin' }]);
  V.sektorFeldSetzen('education', 'occupationRole', 'Lehrerin');
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: '12 345 678 901' });
  return k;
}

/* Ein Kästchen, mit dem die Person eine fehlende Angabe an Ort und Stelle einträgt (Ja/Nein-Feld im Nachtrag-Editor),
   ist eine Eingabe, keine Auswahl dessen, was hinausgeht. Der Editor steht in einem Block `zus-fuellen`; die Probe
   nimmt genau diese Blöcke heraus und nichts sonst. */
function ohneNachtragEditor(html) {
  let aus = '', i = 0;
  for (;;) {
    const a = html.indexOf('<div class="zus-fuellen"', i);
    if (a < 0) return aus + html.slice(i);
    aus += html.slice(i, a);
    let tiefe = 0, p = a;
    const re = /<div\b|<\/div>/g;
    re.lastIndex = a;
    for (let m; (m = re.exec(html));) {
      tiefe += m[0] === '</div>' ? -1 : 1;
      p = re.lastIndex;
      if (tiefe === 0) break;
    }
    if (tiefe !== 0) return aus + html.slice(a);   // unausgeglichen: den Rest nicht für sauber erklären
    i = p;
  }
}
const hatKaestchen = (html) => KAESTCHEN.test(ohneNachtragEditor(String(html)));

// Fängt jedes Fenster ab, das `fn` öffnet, und gibt die Körper zurück.
function fenster(V, fn) {
  const modale = [], echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  try { fn(); } finally { V.ui.modal = echt; }
  return modale.map((m) => String(m.koerperHTML || ''));
}

/* Die Wege. Jeder Eintrag öffnet mindestens ein Fenster oder zeichnet eine Ansicht; ein neuer Weg in die Herausgabe
   gehört in diese Liste. */
const WEGE = [
  ['ganzes Depot als PDF', (V) => fenster(V, () => V.flowVollDepotPdf({}))],
  ['ganzes Depot, Übersicht ohne Bereich', (V) => fenster(V, () => V.flowExportUebersicht({ sektorId: null, titel: 'Probe', aufFortfahren: () => {} }))],
  ['eigene Zusammenstellung', (V) => fenster(V, () => V.flowZusammenstellungHerausgeben(['health.allergiesMedicationFoodOther', 'education.occupationRole'], 'Probe'))],
  ['Übergabe an eine Wallet', (V) => fenster(V, () => V.flowEudiwUebergabe('identity'))],
  ['Ansicht Zusammenstellen', (V, document) => { V.oeffneZusammenstellen(); return [String(document.getElementById('content').innerHTML)]; }],
];

// Offen laut Entscheidung vom 12.08.2026 („Was offen bleibt“). Fällt das Kästchen dort weg, wird diese Liste leer.
const AUSNAHME_OFFEN = ['ganzes Depot, Übersicht ohne Bereich'];

function funde(V, document) {
  const mit = [];
  let gezeigt = 0;
  for (const [name, weg] of WEGE) {
    const koerper = weg(V, document);
    gezeigt += koerper.length;
    if (koerper.some(hatKaestchen)) mit.push(name);
  }
  return { mit, gezeigt };
}

test('[Austausch·Kein Kästchen] Gesamt-PDF, Zusammenstellung, Wallet und Zusammenstellen zeigen kein Kästchen; eine Ausnahme ist benannt', async () => {
  const { V, document } = await depot();
  const { mit, gezeigt } = funde(V, document);
  assert.ok(gezeigt >= 4, 'Vorbedingung: die Wege öffnen ein Fenster oder zeichnen eine Ansicht (' + gezeigt + ')');
  assert.deepEqual(mit, AUSNAHME_OFFEN, 'kein Kästchen im Herausgabe-Weg, außer in der einen benannten Ausnahme');
});

test('[Austausch·Rot-Beweis] ein Kästchen in einem Fenster des Wegs schlägt die Probe an', async () => {
  const { V } = await depot();
  const koerper = fenster(V, () => V.flowZusammenstellungHerausgeben(['education.occupationRole'], 'Probe'));
  assert.ok(koerper.length >= 1, 'Vorbedingung: der Weg öffnet ein Fenster');
  assert.equal(koerper.some(hatKaestchen), false, 'ohne Pflanzung kein Fund');
  // Die Pflanzung: derselbe Körper mit einem Kästchen.
  assert.equal(hatKaestchen(koerper[0] + '<label><input type="checkbox"> x</label>'), true, 'das gepflanzte Kästchen wird erkannt');
  assert.equal(hatKaestchen(koerper[0] + '<span role="checkbox" aria-checked="true"></span>'), true, 'auch als Rolle');
  // Gegenprobe zur Ausnahme: ein Kästchen im Nachtrag-Editor zählt nicht, eines direkt dahinter zählt.
  const editor = '<div class="zus-fuellen" role="group"><div><input type="checkbox"></div></div>';
  assert.equal(hatKaestchen(editor), false, 'die Eingabe im Nachtrag-Editor ist keine Auswahl');
  assert.equal(hatKaestchen(editor + '<input type="checkbox">'), true, 'ein Kästchen hinter dem Editor fällt auf');
});
