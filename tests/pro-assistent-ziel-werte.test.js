'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Wo landen die Werte der Vorsorge-Assistenten in Pro? (07.10.2026, Befund PRO-ASSISTENT-ZIEL-OHNE-BEREICH)
   ─────────────────────────────────────────────────────────────────────────────
   pvwiz (Patientenverfügung) und kiwiz (KI-Verfügung) schreiben in `advanceCare.provisionInstruments`
   (tools/dokument-module/vivodepot-dokumente-de.json, korpusWizard[].ziel). Pro trägt den Bereich `advanceCare`
   nicht. Diese Probe hält fest, was mit solchen Werten in einer Pro-Datei geschieht — aus einem Pro, das die
   Assistenten noch anbot (Altdatei), und aus einer Privat-Datei, die in Pro geöffnet wird: sie dürfen nicht
   verloren gehen, und sie müssen sichtbar bleiben.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const { ladeKern } = require('./load-kern.js');

const PW = 'NURPROBE-' + 'ziel'.repeat(4);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-assistent-ziel-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
const gebaut = new Map();
function produkt(slug) {
  if (!gebaut.has(slug)) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    const r = konfektionieren({ ziel: path.join(TMP, slug), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n', unsignierteModulDateien: VP.modulDateienFuer(p) });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  return ladeKern({ htmlPfad: gebaut.get(slug) });
}
const EINTRAEGE = [
  { id: 'probe-pv-1', instrument: 'living-will', storageLocation: 'Ordner Vorsorge, Fach 2' },
  { id: 'probe-ki-1', instrument: 'ki-verfuegung', storageLocation: 'Ordner Vorsorge, Fach 3' },
];
/* Welche der EINTRAEGE fehlen in einem Depot (im Bereich oder geparkt in bereicheVerwaist)? */
function fehlende(d) {
  const liste = (d.sektoren.advanceCare && d.sektoren.advanceCare.provisionInstruments)
    || (d.bereicheVerwaist && d.bereicheVerwaist.advanceCare && d.bereicheVerwaist.advanceCare.provisionInstruments) || [];
  return EINTRAEGE.filter((e) => !liste.some((x) => x && x.id === e.id && x.storageLocation === e.storageLocation)).map((e) => e.id);
}

test('[Werte·Rot-Beweis] fehlt ein Eintrag oder ist sein Ablageort verändert, meldet die Prüfung ihn', () => {
  const d = { sektoren: { advanceCare: { provisionInstruments: [EINTRAEGE[0], Object.assign({}, EINTRAEGE[1], { storageLocation: 'anderswo' })] } } };
  assert.deepEqual(fehlende(d), ['probe-ki-1']);
  assert.deepEqual(fehlende({ sektoren: {} }), ['probe-pv-1', 'probe-ki-1']);
});

async function dateiMitVorsorge(slug) {
  const { V } = produkt(slug);
  await V.depotAnlegen(PW);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  const d = V.getData();
  d.sektoren.advanceCare = Object.assign({}, d.sektoren.advanceCare, { provisionInstruments: JSON.parse(JSON.stringify(EINTRAEGE)) });
  return JSON.parse(JSON.stringify(await V.depotSerialisieren()));
}

for (const herkunft of ['pro-de', 'privat-de']) {
  test('[Werte·' + herkunft + '→pro-de] die Einträge der Vorsorge-Assistenten gehen beim Öffnen und Speichern nicht verloren', async () => {
    const umschlag = await dateiMitVorsorge(herkunft);
    const k1 = produkt('pro-de');
    await k1.V.depotLaden(umschlag, PW);
    const k2 = produkt('pro-de');
    await k2.V.depotLaden(JSON.parse(JSON.stringify(await k1.V.depotSerialisieren())), PW);
    assert.deepEqual(fehlende(k2.V.getData()), []);
  });

  test('[Werte·' + herkunft + '→pro-de] die Einträge sind in Pro sichtbar (der Bereich wird geführt oder geweckt)', async () => {
    const umschlag = await dateiMitVorsorge(herkunft);
    const { V } = produkt('pro-de');
    await V.depotLaden(umschlag, PW);
    assert.ok(V.bereicheAlle().some((b) => b.id === 'advanceCare'), 'advanceCare steht in der Anzeige von Pro');
  });
}

/* Gegenlesung 07.10.2026 (a)/(b): angeboten und gestartet wird ein Assistent genau dann, wenn das Produkt seinen Zielbereich
   ANZEIGT — in Pro ohne advanceCare nie, in Pro mit einer Datei, die advanceCare weckt, wieder; „Fertig“ öffnet dann den Bereich. */
test('[Angebot·a] Pro ohne advanceCare: kein Startknopf, kein Start — „Fertig“ ist nicht erreichbar', async () => {
  const { V } = produkt('pro-de');
  await V.depotAnlegen(PW);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  assert.ok(!V.bereicheAlle().some((b) => b.id === 'advanceCare'), 'Vorbedingung: Pro zeigt advanceCare nicht');
  assert.equal(V.wizardStartHTML('pvwiz'), '');
  assert.equal(V.wizardLauf('pvwiz'), false);
  assert.equal(V.wizardDefAktiv(), null, 'kein Assistent läuft');
});

test('[Angebot·b] Pro mit geweckter advanceCare: der Assistent wird wieder angeboten, „Fertig“ öffnet den Bereich', async () => {
  const umschlag = await dateiMitVorsorge('privat-de');
  const { V, document: dok } = produkt('pro-de');
  await V.depotLaden(umschlag, PW);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  assert.ok(V.bereicheAlle().some((b) => b.id === 'advanceCare'), 'Vorbedingung: geweckt');
  assert.notEqual(V.wizardStartHTML('pvwiz'), '', 'angeboten');
  assert.notEqual(V.wizardLauf('pvwiz'), false, 'gestartet');
  V.wizardAbschluss();
  const html = dok.getElementById('content').innerHTML;
  assert.match(html, /data-sektor-id="advanceCare"/, 'nach „Fertig“ steht der Bereich');
  assert.ok(!html.includes(V.STRINGS.bereichLeer), 'keine leere Seite');
});
