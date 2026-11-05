'use strict';
/* Eine geöffnete Datei bringt keinen Bereich doppelt — in jedem der vier Produkte, mit der Datei jedes Produkts.

   Vorbeugung zu Code-Review 16.09.2026, Befund M1 (HOCH): pro-de öffnete seine eigene Datei mit 14 statt 7
   Pro-Bereichen, jeder doppelt in der Navigation. Die Probe zu M1 hält zwei Paare
   (pro-de → pro-de, pro-de → privat-de). Dieser Wächter hält die Klasse über alle 16 Paare: eine frisch angelegte
   Datei von Produkt A, verschlüsselt gesichert, in Produkt B mit Passwort geöffnet. Danach steht jede Bereichs-Id
   genau einmal, und die eigenen Bereiche von B sind alle noch da.

   Jedes Paar läuft zweimal: mit einer heutigen Datei und mit einer Datei, deren Mitschrift einen Bereichsersatz trägt
   (`abWerkMitschrift.bereichsErsatz.neu`), wie die Pro-Dateien vom 16.09.2026. Eine heutige Datei schreibt keinen
   Ersatz mehr (Schnitt 17.09.2026); nur die ältere Form erreicht die Stelle, an der M1 lag.

   M1 ist heute mehrfach gehalten: der Riegel „das laufende Produkt gewinnt“, die Abweisung `reserviert` im Modulprüfer
   `doppelt-ab-werk` in der Saat und beim Zusammenführen der Registry, und zuletzt die Dublettensperre in
   `_bereicheKanonischOrdnen` (gemessen 03.11.2026: ohne den Riegel allein, und auch ohne die ersten vier, entstehen
   keine Doppelten). Rot-Beweis: pro-de, gebaut aus einem Kern ohne alle fünf, öffnet seine eigene Datei mit Ersatz
   mit doppelten Bereichen. */
const { after } = require('node:test');
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const PW = 'Bereiche-einmal-Passwort-lang-genug-2026';
const M1_RIEGEL = '        if (imKatalog(id) && BEREICH_IDS_EINGEBAUT.indexOf(id) < 0) continue;\n';
/* Die zweite Bremse: der Modulprüfer weist eine Id, die schon im Katalog steht, als `reserviert` ab. Seit es sie
   gibt, hält sie M1 auch ohne den Riegel (gemessen 03.11.2026: ohne Riegel landen die Pro-Bereiche als `reserviert`
   in BEREICHS_MODUL_VERWORFEN, nicht doppelt in der Navigation). Der Rot-Beweis nimmt darum alle heraus. */
/* Die dritte: die Saat nimmt eine Id, die das Produkt schon ab Werk trägt, nicht ein zweites Mal (`doppelt-ab-werk`). */
const SAAT_DOPPELT = "        if (gesehen[b.id]) { BEREICHS_MODUL_VERWORFEN.push({ id: b.id, grund: 'doppelt-ab-werk' }); continue; }\n";
/* Die vierte: beim Zusammenführen der Registry dieselbe Abweisung (`doppelt-ab-werk`, eine Ebene flacher eingerückt). */
const REGISTRY_DOPPELT = "\n    if (gesehen[b.id]) { BEREICHS_MODUL_VERWORFEN.push({ id: b.id, grund: 'doppelt-ab-werk' }); continue; }\n";
/* Die letzte und allgemeinste: die Dublettensperre in `_bereicheKanonischOrdnen` (18.09.2026). */
const DUBLETTENSPERRE = '      if (liste.some((x) => x.id === s.id) || fremd.some((x) => x.id === s.id)) continue;\n';
const PRUEFER_RESERVIERT = "    if (!abWerk && SEKTOREN.some((s) => s.id === id)) { verworfene.push({ id, grund: 'reserviert' }); continue; }\n";

const gebaut = new Map();
const tempOrdner = [];
after(() => { for (const d of tempOrdner) fs.rmSync(d, { recursive: true, force: true }); });
function produktPfad(slug, kernQuelle) {
  const schluessel = slug + (kernQuelle ? '·mutiert' : '');
  if (!gebaut.has(schluessel)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-bereiche-einmal-' + slug + '-'));
    tempOrdner.push(ziel);
    const r = konfektionieren({
      ziel, slug, modulauswahl: [], kernQuelle,
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(schluessel, path.join(r.ordner, 'vivodepot.html'));
  }
  return gebaut.get(schluessel);
}
function kernAus(pfad) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = pfad;
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern({ blank: true }).V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}
const doppelt = (ids) => ids.filter((x, i) => ids.indexOf(x) !== i);

/* Die Bereiche des Produkts, die nicht eingebaut sind, als Ersatz in die Mitschrift — die Form der Pro-Dateien vom 16.09.2026. */
function ersatzMitschreiben(A) {
  const eingebaut = A.BEREICH_IDS_EINGEBAUT || [];
  const neu = {};
  for (const b of A.bereicheAlle()) {
    if (eingebaut.includes(b.id)) continue;
    neu[b.id] = JSON.parse(JSON.stringify({ label: b.label, icon: b.icon, sektionen: b.sektionen || [] }));
  }
  const d = A.getData();
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift, { bereichsErsatz: { modulTyp: 'bereichsErsatz', ersetzt: [], neu } });
  return Object.keys(neu).length;
}

async function oeffnen(pfadA, pfadB, mitErsatz) {
  const A = kernAus(pfadA);
  await A.depotAnlegen(PW, {});
  if (mitErsatz) ersatzMitschreiben(A);
  const umschlag = await A.depotSerialisieren();
  const frischB = kernAus(pfadB);
  await frischB.depotAnlegen(PW, {});
  const eigene = frischB.bereicheAlle().map((b) => b.id);
  const B = kernAus(pfadB);
  await B.depotLaden(umschlag, PW);
  return { eigene, nachher: B.bereicheAlle().map((b) => b.id) };
}

for (const a of PRODUKTE.map((p) => p.slug)) {
  test('[Bereiche einmal·' + a + '] eine Datei aus ' + a + ' bringt in keinem der vier Produkte einen Bereich doppelt', async () => {
    for (const b of PRODUKTE.map((p) => p.slug)) {
      for (const mitErsatz of [false, true]) {
        const wie = a + ' → ' + b + (mitErsatz ? ' (Datei mit Ersatz)' : '');
        const { eigene, nachher } = await oeffnen(produktPfad(a), produktPfad(b), mitErsatz);
        assert.ok(nachher.length > 0, wie + ': keine Bereiche — dann prüft der Wächter nichts');
        assert.deepEqual(doppelt(nachher), [], wie + ': doppelt');
        assert.deepEqual(eigene.filter((id) => !nachher.includes(id)), [], wie + ': eigene Bereiche fehlen nach dem Öffnen');
      }
    }
  });
}

test('[Bereiche einmal·Vorbedingung] pro-de hat Bereiche, die als Ersatz mitgehen — sonst prüft die zweite Form nichts', async () => {
  const A = kernAus(produktPfad('pro-de'));
  await A.depotAnlegen(PW, {});
  assert.ok(ersatzMitschreiben(A) > 0);
});

test('[Bereiche einmal·Rot-Beweis] ohne die fünf Bremsen öffnet pro-de seine eigene Datei mit doppelten Bereichen', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  for (const anker of [M1_RIEGEL, PRUEFER_RESERVIERT, SAAT_DOPPELT, REGISTRY_DOPPELT, DUBLETTENSPERRE]) assert.equal(quelle.split(anker).length, 2, 'Anker für den Rot-Beweis trifft nicht genau einmal: ' + anker.trim().slice(0, 60));
  const mutiert = produktPfad('pro-de', quelle.replace(M1_RIEGEL, '').replace(PRUEFER_RESERVIERT, '').replace(SAAT_DOPPELT, '').replace(REGISTRY_DOPPELT, '\n').replace(DUBLETTENSPERRE, ''));
  const { nachher } = await oeffnen(mutiert, mutiert, true);
  assert.ok(doppelt(nachher).length > 0, 'ohne die fünf Bremsen bleibt es bei einfachen Bereichen — der Wächter prüft dann nicht, was der Fix leistet');
});
