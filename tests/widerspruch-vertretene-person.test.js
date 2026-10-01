'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Widerspruch der vertretenen Person gegen die Verwaltung (28.09.2026, V3a)
   ────────────────────────────────────────────────────────────────────────
   Produktentscheidung: festhalten und der haltenden Person unübersehbar
   anzeigen, mit dem Depot ausgeben, mit Wiedervorlage — NICHT sperren
   (Vivodepot dokumentiert, entscheidet nicht). Zwei Bedingungen der
   Gegenlesung, je mit Rot-Beweis:
     (1) sichtbar an der Handlung: Export-, Übergabe- und Aushäng-Dialog für
         die Person und das Herausgeben im Sub-Kontext zeigen den Widerspruch
         vor der Bestätigung — über die eine Stelle _widerspruchHinweisHTML;
     (2) nicht still löschbar: Entfernen hinterlässt `entfernt` mit Person
         und Zeit und einen Eintrag in delegationsGeschichte.
   Dazu: „erklärt von" ist Pflicht; der Widerspruch sperrt nichts; eine
   Wiedervorlage erscheint im Prüfblatt.
   Klasse: jede flow-Funktion, die für ein Sub-Depot exportiert oder aushängt
   (subDepotBlackboxExportieren / subDepotAushaengen), geht über die Engstelle.
   ROT-BEWEIS: der Kern vor diesem Commit kennt keinen Widerspruch; ein Dialog
   ohne Engstelle und ein Löschen ohne Spur fallen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

async function mitSub() {
  const { V } = ladeKern();
  await V.depotAnlegen('Widerspruch-2026!');
  V.akteurSelbstErklaeren('Mutter');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet' }, 'Sub-W-2026!');
  return { V, e };
}
function dialoge(V) { const gesehen = []; V.ui.modal = (opt) => { gesehen.push(opt); return () => {}; }; return gesehen; }

test('[Widerspruch] festhalten verlangt Gegenstand und „erklärt von“; der Eintrag nennt, wer erfasst hat', async () => {
  const { V, e } = await mitSub();
  assert.throws(() => V.subDepotWiderspruchErfassen(e.depotUUID, { gegenstand: '', erklaertVon: 'person-selbst' }), /widerspruch-ohne-gegenstand/);
  assert.throws(() => V.subDepotWiderspruchErfassen(e.depotUUID, { gegenstand: 'x' }), /widerspruch-ohne-erklaert-von/);
  assert.throws(() => V.subDepotWiderspruchErfassen(e.depotUUID, { gegenstand: 'x', erklaertVon: 'weitergegeben' }), /widerspruch-ohne-weitergeber/);
  const w = V.subDepotWiderspruchErfassen(e.depotUUID, { gegenstand: 'Weitergabe an die Schule', erklaertVon: 'person-selbst', wiedervorlageAm: '2026-12-01' });
  assert.equal(w.erklaertVon, 'person-selbst');
  assert.ok(w.erfasstVon, 'wer festhält, ist benannt');
  const d = V.getData().verwalteteDepots[0];
  assert.ok(d.delegationsGeschichte.some((g) => g.art === 'widerspruch-festgehalten' && g.widerspruchId === w.id));
});

test('[Widerspruch·Bedingung 1] Export-, Übergabe- und Aushäng-Dialog zeigen ihn vor der Bestätigung; er sperrt nichts', async () => {
  const { V, e } = await mitSub();
  V.subDepotWiderspruchErfassen(e.depotUUID, { gegenstand: 'Weitergabe an die Schule', erklaertVon: 'person-selbst' });
  const gesehen = dialoge(V);
  V.flowSubDepotBlackboxExport(e.depotUUID);
  V.flowSubDepotAushaengen(e.depotUUID);
  gesehen[1].zweitAktion.handler(() => {});   // „Ich gebe es ab." → Bestätigung
  assert.equal(gesehen.length, 3, 'Vorbedingung: Export, Absicht, Bestätigung');
  for (const g of gesehen) assert.match(g.koerperHTML, /Lea hat widersprochen: Weitergabe an die Schule/, 'Hinweis fehlt in: ' + g.titel);
  // sperrt nichts: der Export läuft trotzdem
  const datei = V.subDepotBlackboxExportieren(e.depotUUID);
  assert.equal(datei.dateiTyp, 'vivodepot-blackbox-export');
});

test('[Widerspruch·Bedingung 2] Entfernen hinterlässt eine Spur; der Eintrag bleibt und ist nicht mehr offen', async () => {
  const { V, e } = await mitSub();
  const w = V.subDepotWiderspruchErfassen(e.depotUUID, { gegenstand: 'x', erklaertVon: 'weitergegeben', weitergegebenDurch: 'Frau Ober' });
  V.subDepotWiderspruchEntfernen(e.depotUUID, w.id);
  const d = V.getData().verwalteteDepots[0];
  assert.equal(d.widersprueche.length, 1, 'nichts verschwindet');
  assert.ok(d.widersprueche[0].entfernt && d.widersprueche[0].entfernt.von && d.widersprueche[0].entfernt.am);
  assert.ok(d.delegationsGeschichte.some((g) => g.art === 'widerspruch-entfernt' && g.widerspruchId === w.id));
  const gesehen = dialoge(V);
  V.flowSubDepotBlackboxExport(e.depotUUID);
  assert.doesNotMatch(gesehen[0].koerperHTML, /hat widersprochen/, 'ein entfernter Widerspruch steht nicht mehr am Dialog');
});

test('[Widerspruch] eine Wiedervorlage steht im Prüfblatt', async () => {
  const { V, e } = await mitSub();
  V.subDepotWiderspruchErfassen(e.depotUUID, { gegenstand: 'x', erklaertVon: 'person-selbst', wiedervorlageAm: '2026-12-01' });
  const t = V.prueftermineWidersprueche('2026-09-28');
  assert.equal(t.length, 1);
  assert.equal(t[0].faelligAm, '2026-12-01');
  assert.ok(V.prueftermineAlle('2026-09-28').some((x) => x.id === t[0].id));
});

test('[Widerspruch·Klasse] jede flow-Funktion, die für ein Sub-Depot exportiert oder aushängt, geht über die Engstelle', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const funde = [];
  // Jede Funktion bis zur nächsten Funktionsgrenze auf oberster Ebene — nicht bis zur nächsten flow-Funktion.
  const re = /\n(?:async )?function ([A-Za-z0-9_$]+)\(/g;
  let m;
  const starts = [];
  while ((m = re.exec(kern))) starts.push([m.index, m[1]]);
  starts.forEach(([i, name], k) => {
    if (!/^flow/.test(name)) return;
    const body = kern.slice(i, k + 1 < starts.length ? starts[k + 1][0] : i + 20000);
    if (/subDepotBlackboxExportieren\(|subDepotAushaengen\(/.test(body) && !/_widerspruchHinweisHTML\(/.test(body)) funde.push(name);
  });
  assert.ok(starts.filter(([, n]) => /^flow/.test(n)).length > 50, 'Vorbedingung: flow-Funktionen gefunden');
  assert.deepEqual(funde, []);
  // Rot-Beweis der Klassenprobe: ein Dialog ohne Engstelle fällt.
  const gepflanzt = '\nfunction flowProbe(u) {\n  ui.modal({ onPrimaer: () => subDepotBlackboxExportieren(u) });\n}\n';
  assert.ok(/subDepotBlackboxExportieren\(/.test(gepflanzt) && !/_widerspruchHinweisHTML\(/.test(gepflanzt));
});
