'use strict';
/* Gerüst-Schnitt S7 (21.09.2026): der Katalog der dreizehn nativen Bereiche (Grundlage der RUHENDEN Bereiche, B12) steht nicht mehr im
   Gerüst, sondern in tools/bereiche-nativ-katalog-modul.json und wird in JEDES der vier Produkte gebacken, byte-gleich.

   B12 („Akte verliert Inhalt in Pro") galt im September schon einmal als behoben und war wieder rot, weil am gestellten Zustand
   geprüft wurde. Darum misst diese Probe am ERZEUGTEN Produkt: konfektioniert, gebootet, Depot angelegt, gespeichert, geöffnet —
   und der Rot-Beweis leert die Region im erzeugten Produkt selbst. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');
const { PRODUKTE, BEREICHE_NATIV_KATALOG_PFAD } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const PW = 'probe-passwort-bereiche-nativ-katalog-2026-09-21';
const MARKER_BEGIN = '/* BEREICHE_NATIV_KATALOG:BEGIN */';
const MARKER_ENDE = '/* BEREICHE_NATIV_KATALOG:END */';
const REGION_LEER = '\nconst BEREICHE_NATIV_KATALOG = null;\n';

const regionAus = (html) => { const a = html.indexOf(MARKER_BEGIN), b = html.indexOf(MARKER_ENDE); return html.slice(a + MARKER_BEGIN.length, b); };

async function katalogIdsNachOeffnen(html) {
  const { V } = kernAus(html);
  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  return V._bereicheImKatalog().map((b) => b.id).sort();
}

test('[Gerüst-Schnitt S7] das Gerüst trägt den Katalog nicht: die Region ist leer', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(regionAus(kern), REGION_LEER);
});

test('[Gerüst-Schnitt S7] jedes der vier Produkte trägt genau die dreizehn Definitionen der Moduldatei', () => {
  const modul = JSON.parse(fs.readFileSync(BEREICHE_NATIV_KATALOG_PFAD, 'utf8'));
  assert.equal(Object.keys(modul.bereiche).length, 13);
  for (const p of PRODUKTE) {
    const region = regionAus(fs.readFileSync(produktHtml(p.slug), 'utf8'));
    const m = region.match(/const BEREICHE_NATIV_KATALOG = (\{[\s\S]*\});/);
    assert.ok(m, p.slug + ': die Region trägt eine Nutzlast');
    assert.deepEqual(JSON.parse(m[1]).bereiche, modul.bereiche, p.slug + ': byte-gleich zur Moduldatei');
  }
});

for (const slug of ['pro-de', 'pro-en']) {
  test('[Gerüst-Schnitt S7·B12] am ERZEUGTEN ' + slug + ' kennt der Katalog nach dem Öffnen alle dreizehn nativen Bereiche', async () => {
    const ids = await katalogIdsNachOeffnen(produktHtml(slug));
    const modul = JSON.parse(fs.readFileSync(BEREICHE_NATIV_KATALOG_PFAD, 'utf8'));
    for (const id of Object.keys(modul.bereiche)) assert.ok(ids.includes(id), slug + ': ' + id + ' fehlt im Katalog');
  });
}

test('[Gerüst-Schnitt S7·B12·Rot-Beweis] dasselbe Produkt mit geleerter Region verliert die zwölf ruhenden Bereiche', async () => {
  const html = fs.readFileSync(produktHtml('pro-de'), 'utf8');
  const a = html.indexOf(MARKER_BEGIN) + MARKER_BEGIN.length, b = html.indexOf(MARKER_ENDE);
  const leer = html.slice(0, a) + REGION_LEER + html.slice(b);
  assert.notEqual(leer, html, 'Voraussetzung: die Region trug etwas');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bereiche-nativ-rot-'));
  try {
    const tmp = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(tmp, leer);
    const ids = await katalogIdsNachOeffnen(tmp);
    const modul = JSON.parse(fs.readFileSync(BEREICHE_NATIV_KATALOG_PFAD, 'utf8'));
    const fehlend = Object.keys(modul.bereiche).filter((id) => !ids.includes(id));
    assert.ok(fehlend.length >= 6, 'ohne die Region fehlen dem Pro-Katalog ganze native Bereiche: ' + fehlend.join(', '));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
