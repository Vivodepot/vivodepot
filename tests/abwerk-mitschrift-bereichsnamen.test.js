'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die Ab-Werk-Mitschrift trägt die NAMEN ihrer Bereiche (19.09.2026, Golden-Master-Fund)
   ────────────────────────────────────────────────────────────────────────────
   DER FUND: pro-de backt seine sechs Pro-Bereiche OHNE Inline-Label ein (der Name kommt aus dem
   Textsatz, `<id>.label`), reist aber ohne Sprachmodul (DE ist der eingebaute Rückfall,
   U2-ADR-361). In der Lese-App war der Name darum nirgends auflösbar — ihr Prüfer verwarf jeden
   dieser Bereiche als `kein-label`, samt der Werte darin. Das Golden-Master der Lese-App
   (tests/lese-app-golden-master-vier-produkte.test.js) hielt es fest; DIESE Datei sichert die
   Ursache direkt und billig, ohne die Lese-App zu laden:

     1. Jeder Bereich der Mitschrift trägt einen nichtleeren Namen (Rot-Beweis).
     2. Der Verwurfsgrund eines abgewiesenen GANZEN Moduls bleibt einzeln sichtbar
        (Lese-App-Diagnose; zuvor stand dort nur „leer" ohne das Warum).
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'abwerk-mitschrift-namen-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

function kernFuer(slug) {
  const p = VP.PRODUKTE.find((x) => x.slug === slug);
  const r = konfektionieren({
    ziel: path.join(TMP, slug), slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: VP.modulDateienFuer(p),
  });
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern(); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}

for (const slug of ['pro-de', 'pro-en']) {
  test('[Mitschrift·Bereichsnamen·Rot-Beweis·' + slug + '] jeder Bereich der Mitschrift trägt einen nichtleeren Namen', async () => {
    const { V } = kernFuer(slug);
    const mitschrift = V._abWerkMitschriftErzeugen();
    const ids = [];
    for (const modul of mitschrift.bereich) {
      for (const [id, roh] of Object.entries(modul.bereiche)) {
        ids.push(id);
        assert.ok(roh && typeof roh.label === 'string' && roh.label.trim(),
          slug + ': der Bereich "' + id + '" reist OHNE Namen in der Mitschrift — ein anderes Programm, das die Datei liest '
          + '(die Lese-App), kann ihn nicht benennen und verwirft ihn samt seiner Werte');
      }
    }
    assert.ok(ids.length >= 6, slug + ': Testaufbau — die Mitschrift muss die Pro-Bereiche tragen, gefunden: ' + ids.length);
  });
}

test('[Mitschrift·Bereichsnamen·Diagnose] die Lese-App nennt den Grund je verworfenem Bereich, auch wenn das GANZE Modul verworfen wird', () => {
  const { ladeLesen } = require('./load-lesen.js');
  const L = ladeLesen().V;
  const depot = { abWerkMitschrift: { bereich: [{
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de',
    bereiche: { 'fremd-ohne-namen-diagnose': { id: 'fremd-ohne-namen-diagnose', sektionen: [] } },
  }] } };
  L._bereichsModuleAusDepotAnmeldenLesen(depot);
  const gruende = L.BEREICHS_MODUL_VERWORFEN_LESEN.map((v) => (v.id ? v.id + ':' : '') + v.grund);
  assert.ok(gruende.includes('fremd-ohne-namen-diagnose:kein-label'),
    'die Diagnose zeigt nur, DASS das Modul „leer" war, nicht WARUM — der Golden-Master-Fund vom 19.09.2026 blieb dadurch '
    + 'unsichtbar. Gefunden: ' + JSON.stringify(gruende));
});
