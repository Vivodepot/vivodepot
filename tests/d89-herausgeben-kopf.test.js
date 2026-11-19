'use strict';
/* ═════════════════════════════════════════════════════════════════
   D89 (Desktop-Dummy, Kopf des Fensters „Herausgeben“, 17.11.2026): der Titel heißt „Herausgeben“, der Anlass steht leise
   darunter. Vorher trug das Fenster den Anlassnamen als Titel. Das Kreuz bleibt links (Muster I02); das prüft
   tests/dialog-schliessen-i02.test.js.

   [D89·Kopf]       flowAnlassExport öffnet das Fenster mit dem Titel „Herausgeben“ und dem Anlass als Unterzeile.
   [D89·Text]       der Untertitel geht als reiner Text in den Titel, auch mit Zeichen wie < und &.
   [D89·Ohne]       ein Fenster ohne Untertitel bleibt, wie es war.
   [D89·Rot-Beweis] ein Kern, der den Anlass wieder als Titel gibt, fällt durch.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'd89-herausgeben-kopf-2026';

function fenster(V, fn) {
  const modale = [];
  const echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  try { fn(); } finally { V.ui.modal = echt; }
  assert.ok(modale.length >= 1, 'ein Fenster öffnet sich');
  return modale[modale.length - 1];
}

async function kopf(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Elena Beispiel');
  const def = V.anlassDef('arzt');
  assert.ok(def && def.titel, 'Voraussetzung: der Anlass Arzttermin ist geladen');
  return { def, f: fenster(V, () => V.flowAnlassExport('arzt')) };
}

test('[D89·Kopf] Titel „Herausgeben“, darunter der Anlass', async () => {
  const { V } = ladeKern();
  const { def, f } = await kopf(V);
  assert.equal(f.titel, V.STRINGS.herausgebenTitel, 'der Titel heißt „Herausgeben“');
  assert.ok(f.titelHTML, 'der Titel trägt eine Unterzeile');
  assert.ok(f.titelHTML.startsWith(V.escapeHTML(V.STRINGS.herausgebenTitel) + '<span class="modal-unterzeile" data-modal-unterzeile>'),
    'zuerst der Titel, dann die Unterzeile: ' + f.titelHTML);
  assert.ok(f.titelHTML.includes('>' + V.escapeHTML(def.titel) + '</span>'), 'die Unterzeile nennt den Anlass');
});

test('[D89·Text] der Untertitel ist reiner Text', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const f = fenster(V, () => V.flowExportUebersicht({ titel: 'Herausgeben', untertitel: 'A<b>&B', kennungen: V.anlassKennungen('arzt'), aufFortfahren: () => {} }));
  assert.ok(f.titelHTML.includes('A&lt;b&gt;&amp;B'), 'maskiert: ' + f.titelHTML);
  assert.ok(!f.titelHTML.includes('<b>'), 'kein Markup aus dem Untertitel');
});

test('[D89·Ohne] ohne Untertitel kein titelHTML', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const f = fenster(V, () => V.flowExportUebersicht({ titel: 'Auswahl', kennungen: V.anlassKennungen('arzt'), aufFortfahren: () => {} }));
  assert.equal(f.titelHTML, undefined);
  assert.equal(f.titel, 'Auswahl');
});

test('[D89·Rot-Beweis] gibt der Kern den Anlass wieder als Titel, fällt die Probe', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const alt = "    titel: STRINGS.herausgebenTitel,\n    untertitel: def.titel || def.id,\n";
  assert.equal(quelle.split(alt).length, 2, 'Anker der Probe steht genau einmal im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'd89-'));
  const tmp = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(tmp, quelle.replace(alt, '    titel: def.titel || def.id,\n'));
  let V;
  try { V = ladeKern({ htmlPfad: tmp, backen: true }).V; } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
  const { def, f } = await kopf(V);
  assert.equal(f.titel, def.titel, 'Gegenprobe: der alte Kern gibt den Anlass als Titel');
  assert.notEqual(f.titel, V.STRINGS.herausgebenTitel);
  assert.equal(f.titelHTML, undefined, 'und keine Unterzeile');
});
