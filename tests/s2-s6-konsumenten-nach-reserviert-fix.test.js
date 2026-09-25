'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   S2–S6 (Code-Review Schranke2, 16.09.2026) — gemessen, nicht angenommen: bereits
   grün, keine eigene Reparatur nötig
   ────────────────────────────────────────────────────────────────────────────
   Nach dem reserviert-Riegel-Fix (18.09.2026, „eine Akte bringt ihre Kennungen mit")
   können native, produktausgeschlossene Bereiche (z. B. advanceCare in Pro) jetzt
   über die Mitschrift ankommen. -79 hat richtig gestoppt: der Bericht vom 16.09.
   nannte fünf Konsumenten, die über `SEKTOR_BY_ID` (den Anzeige-Index) statt über
   `bereicheAlle()`/den Katalog lasen — solange ein ausgeschlossener Bereich nie
   ankam, war das folgenlos; jetzt könnte es scharf werden.

   NACHGEMESSEN, EINZELN, MIT ECHTEN INSTRUMENTENDATEN (nicht nur Definition ohne
   Werte — das Wecken selbst hängt an einem echten Wert, s. `_ruhendeBereichIds`):

     S2 (_instrumentTypLabel/_vorsorgeFeldDef/_listenTypLabel) — nutzen bereits
        `_sektorAusKatalog`/`bereichListenUnterfeldHatRolle`, seit dem 16.09.-Fix
        selbst („Katalog, nicht Anzeige-Index"). GRÜN.
     S3 (crossRefFeldUndRoh/notfallKernModell/sektorFeldSetzen) — `bereichKann`,
        `feldDefFuer`, `listenZeilenWaehlen` (liest `data.sektoren` direkt, nie den
        Index) — GRÜN, mit echtem Wert nachgemessen (dieser Test).
     S4 (Dokument-Bindung, Stufe 59/`instrumentDokumentNachtragen`) — hängt am
        `bereichFeldHatRolle`-Wächter (fixiert) und liest `data.sektoren` direkt für
        die Instrumenten-ID/das Datum. GRÜN.
     S5 (Empfänger-/Angehörigen-Modelle, `empfaengerZuschnittModell`/
        `angehoerigenCacheModell`) — `feldRohwert` (roh, kein Index),
        `bereichFeldHatRolle`, `crossRefFeldUndRoh` — GRÜN.
     S6 (Import, `_importPlanZeile`/`importAnwenden`) — `feldDefFuer`/`feldRohwert`
        — GRÜN.

   WARUM KEIN ROT-BEWEIS ÜBER EINE KÜNSTLICHE RÜCKSETZUNG: hier gibt es keine EINE
   Zeile, deren Deaktivierung den alten Zustand reproduziert — der 16.09.-Katalog-
   Umbau ist über viele Funktionen verteilt und lag VOR diesem Abend. Diese Probe
   ist ein Merkposten-Gegenstück zum Merkposten von vorhin: sie hält den HEUTIGEN,
   GUTEN Zustand fest, damit ein künftiger Rückbau (z. B. „SEKTOR_BY_ID ist doch
   schneller") ihn sichtbar bricht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = require.resolve('./load-kern.js');

function baueUndLade(slug) {
  const p = PRODUKTE.find((x) => x.slug === slug);
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-s2s6-konsumenten-' + slug + '-'));
  const r = konfektionieren({
    ziel, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(p),
  });
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
  delete require.cache[require.resolve(LOAD_KERN)];
  const kern = require(LOAD_KERN).ladeKern();
  if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
  delete require.cache[require.resolve(LOAD_KERN)];
  return kern;
}

function proMitWachemAdvanceCare() {
  const priv = baueUndLade('privat-de');
  const d = priv.V.leeresDepot();
  priv.V.setData(d);
  priv.V._abWerkStrukturInsDepot(d);
  const mitschrift = JSON.parse(JSON.stringify(d.abWerkMitschrift));

  const pro = baueUndLade('pro-de');
  const dPro = pro.V.leeresDepot();
  dPro.abWerkMitschrift = mitschrift;
  dPro.sektoren.advanceCare = {
    provisionInstruments: [{ instrument: 'living-will', storageLocation: 'Aktenordner im Büro', dateOfLastChange: '2026-09-01' }],
  };
  pro.V.setData(dPro);
  pro.V._bereichsModuleAusDepotAnmelden(dPro);
  return pro;
}

test('[S2] _instrumentTypLabel/_listenTypLabel liefern das deutsche Label, keinen Rohschlüssel', () => {
  const pro = proMitWachemAdvanceCare();
  assert.equal(pro.V._instrumentTypLabel('living-will'), 'Patientenverfügung');
  assert.equal(pro.V._listenTypLabel('advanceCare', 'provisionInstruments', 'living-will'), 'Patientenverfügung');
});

test('[S3] crossRefFeldUndRoh liefert Ablageort UND virtuelle Instrument-Zeile korrekt', () => {
  const pro = proMitWachemAdvanceCare();
  const ablageort = pro.V.crossRefFeldUndRoh('advanceCare', 'liste:provisionInstruments:living-will:storageLocation');
  assert.equal(ablageort.roh, 'Aktenordner im Büro');
  const zeile = pro.V.crossRefFeldUndRoh('advanceCare', 'instrument:living-will');
  assert.equal(zeile.feld.label, 'Patientenverfügung');
});

test('[S3] notfallKernModell() zeigt die Karten-Zeile mit Instrument-Namen, nicht leer', () => {
  const pro = proMitWachemAdvanceCare();
  const zeilen = pro.V.notfallKernModell();
  const treffer = zeilen.find((z) => z.sektor === 'advanceCare');
  assert.ok(treffer, 'ROT ERWARTET, wenn falsch: die Notfallkarte muss die advanceCare-Zeile tragen');
  assert.equal(treffer.label, 'Patientenverfügung liegt');
  assert.equal(treffer.wert, 'Aktenordner im Büro');
});

test('[S4] instrumentDokumentNachtragen wird über den (fixierten) Rollen-Wächter erreicht', () => {
  const pro = proMitWachemAdvanceCare();
  assert.equal(pro.V.bereichFeldHatRolle('advanceCare', 'provisionInstruments', 'instrumenteListe'), true,
    'ROT ERWARTET, wenn falsch: ohne diese Rolle löst die Dokument-Nachtragung für advanceCare nie aus');
});

test('[S5] Empfänger-/Angehörigen-Bausteine ziehen ein advanceCare-Feld korrekt', () => {
  const pro = proMitWachemAdvanceCare();
  const wert = pro.V.feldRohwert('advanceCare', 'provisionInstruments');
  assert.ok(Array.isArray(wert) && wert.length === 1, 'ROT ERWARTET, wenn falsch: feldRohwert muss den echten Wert liefern, unabhängig vom Anzeige-Index');
});
