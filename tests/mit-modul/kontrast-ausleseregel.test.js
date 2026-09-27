'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Ausleseregel von `tools/kontrast-messen.js` lässt keinen Knopf aus
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND, gemessen am 28.07.2026 (B2). `ablesen()` verlangte
   `e.children.length === 0` — es mass nur Blätter. Ein Knopf mit Symbol hat
   aber ein Kindelement, und sein Text ist trotzdem seiner: von SIEBEN
   sichtbaren `.btn` in einer einzigen Ansicht wurden ZWEI gemessen.

   WARUM DAS SCHLIMMER IST ALS EIN FALSCHER WERT. Ausgerechnet die
   `.btn`-Werte, um die es in Fixliste Nr. 4 geht, fielen heraus — und das
   Werkzeug meldete darüber nicht „anderer Wert", sondern GAR NICHTS. Ein
   Leerbefund sieht aus wie ein sauberer Befund. Nach der Reparatur sind es
   693 gemessene Knöpfe statt faktisch keiner.

   DIESE PRÜFUNG IST ROTMACHBAR, und zwar an genau der Zeile, die den Defekt
   trug: wer `e.children.length` wieder als Ausschluss einführt, macht die
   erste Prüfung rot. Nachgewiesen am 28.07.

   KEINE DATEI IM ARBEITSBAUM. Der Prüfling wird über `setContent` in die Seite
   gelegt, nicht als Kopie neben `vivodepot.html`. Am selben Tag ist eine
   liegengebliebene 2,6-MB-Probe-Fixture einer anderen Ebene aufgefallen, die
   ein abgebrochener Lauf zurückgelassen hatte. Was nie auf die Platte kommt,
   kann dort nicht liegenbleiben.

   SIE PRÜFT DIE AUSLESEREGEL, NICHT DIE RECHNUNG. Die Kontrast-Rechnung hat
   ihre eigenen Prüfungen in `tools/lib/kontrast.js`. Hier geht es allein um die
   Frage, WELCHE Stellen überhaupt in die Rechnung kommen — die Frage, an der
   dieses Werkzeug schwieg.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { ablesen } = require(path.join(__dirname, '..', '..', 'tools', 'kontrast-messen.js'));

/* Ein Prüfling, der jeden Fall genau einmal enthält. */
const SEITE = `
  <style>
    body { background: #fff; color: #000; }
    .weg { display: none; }
  </style>
  <button class="btn" id="knopf-mit-symbol"><svg width="8" height="8"></svg>Knopf mit Symbol</button>
  <span id="blatt">Blattelement ohne Kinder</span>
  <div id="huelle"><span id="innen">Text liegt im Kind</span></div>
  <div id="nur-leerraum">   </div>
  <div id="einbuchstabe">x</div>
  <div class="weg" id="unsichtbar">Unsichtbarer Text</div>
`;

async function lesen() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const seite = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await seite.setContent(SEITE);
    const gelesen = await seite.evaluate(`(${ablesen.toString()})("body")`);
    return gelesen.map((r) => r.text);
  } finally { await browser.close(); }
}

let gelesen = null;
const einmal = async () => (gelesen ||= await lesen());

/* ── 1 · DER KERNFALL ─────────────────────────────────────────────────── */

test('[Ausleseregel] ein Knopf MIT Symbol wird gemessen — er hat ein Kind und trotzdem eigenen Text',
  { timeout: 120000 }, async () => {
    const texte = await einmal();
    assert.equal(texte.includes('Knopf mit Symbol'), true,
      'Genau hier schwieg das Werkzeug: `e.children.length === 0` liess jeden Knopf mit Symbol ' +
      'aus, und die Ausgabe sah trotzdem vollstaendig aus. Gemessen wurde: ' + JSON.stringify(texte));
  });

/* ── 2 · NEGATIVKONTROLLEN — die Regel ist nicht einfach weiter ────────────
   Ohne sie waere „liest den Knopf" auch von einer Regel erfuellt, die alles
   liest, was ihr unterkommt — und dann zaehlte jeder Text mehrfach. */

test('[Ausleseregel·Negativkontrolle] ein Blattelement wird weiterhin gemessen',
  { timeout: 120000 }, async () => {
    const texte = await einmal();
    assert.equal(texte.includes('Blattelement ohne Kinder'), true,
      'die Erweiterung darf den alten Fall nicht verlieren');
  });

test('[Ausleseregel·Negativkontrolle] eine Huelle ohne eigenen Text zaehlt NICHT mit',
  { timeout: 120000 }, async () => {
    const texte = await einmal();
    assert.equal(texte.filter((t) => t === 'Text liegt im Kind').length, 1,
      'der Text gehoert dem Kind. Zaehlte die Huelle mit, stuende jede Zeile doppelt in der ' +
      'Statistik — und eine Fundzahl, die doppelt zaehlt, ist so unbrauchbar wie eine, die auslaesst.');
  });

test('[Ausleseregel·Negativkontrolle] Leerraum, ein einzelner Buchstabe und Unsichtbares bleiben draussen',
  { timeout: 120000 }, async () => {
    const texte = await einmal();
    assert.equal(texte.some((t) => t.trim() === ''), false, 'reiner Leerraum ist kein Text');
    assert.equal(texte.includes('x'), false, 'ein einzelnes Zeichen ist keine Textstelle (Schwelle: 2)');
    assert.equal(texte.includes('Unsichtbarer Text'), false, '`display:none` wird nicht gerendert und nicht gemessen');
  });
