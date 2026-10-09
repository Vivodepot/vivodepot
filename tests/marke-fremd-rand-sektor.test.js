'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-296: ein Sektor aus einem fremden Marken-Modul trägt einen
   Rand (Klasse `marke-fremd`), die dreizehn eingebauten Sektoren nie
   ────────────────────────────────────────────────────────────────────────
   "Rand, nicht Fläche" (U2-ADR-236) auf Sektor-Ebene. Kriterium: Fremdheit,
   nicht bloße Anwesenheit einer herkunft (s. Kommentar an
   `_bereichFremdeMarkeHerkunft` im Kern) — heute, vor "VD Privat" als
   eigenem Modul, ist jede vorhandene herkunft fremd.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function fremdesBereichsModul() {
  return {
    modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'urn:marke-fremd-probe:v1',
    bereiche: { 'probe-fremder-bereich': { label: 'Fremder Bereich', icon: 'folder' } },
  };
}

test('[U2-ADR-296] ein Sektor aus einem fremden Marken-Modul trägt die Klasse marke-fremd', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen('Marke-Fremd-Test-2026!');
  V.akteurSelbstErklaeren('Test');
  const r = V.modulEinlassen(JSON.stringify(fremdesBereichsModul()), V.getData());
  assert.equal(r.angenommen, true, 'Bereichs-Modul angenommen: ' + r.grund);
  V._bereichsModuleAusDepotAnmelden(V.getData());

  V.renderSektor('probe-fremder-bereich');
  const html = dok.getElementById('content').innerHTML;
  assert.match(html, /class="content-narrow marke-fremd"/, 'der fremde Sektor muss die Klasse tragen');
});

test('[U2-ADR-296·Gegenprobe] ein eingebauter Sektor (identitaet) trägt marke-fremd NIE', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen('Marke-Fremd-Test-2026!');
  V.akteurSelbstErklaeren('Test');

  V.renderSektor('identity');
  const html = dok.getElementById('content').innerHTML;
  assert.match(html, /class="content-narrow"/, 'die Klasse muss ohne Fremdmarke stehen (kein Anhängsel)');
  assert.doesNotMatch(html, /marke-fremd/, 'ein eingebauter Sektor gehört der Datei selbst, nie einer Marke');
});

test('[U2-ADR-296] _bereichFremdeMarkeHerkunft liefert die herkunft für einen angedockten, null für einen eingebauten Sektor', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Marke-Fremd-Test-2026!');
  V.akteurSelbstErklaeren('Test');
  V.modulEinlassen(JSON.stringify(fremdesBereichsModul()), V.getData());
  V._bereichsModuleAusDepotAnmelden(V.getData());

  assert.equal(V._bereichFremdeMarkeHerkunft('probe-fremder-bereich'), 'urn:marke-fremd-probe:v1');
  assert.equal(V._bereichFremdeMarkeHerkunft('identitaet'), null);
  assert.equal(V._bereichFremdeMarkeHerkunft('nie-existierender-sektor'), null);
});

/* Befund PRO-AB-WERK-ALS-FREMD-GERAHMT (07.10.2026): die Bereiche, die ein Produkt SELBST ab Werk mitbringt (Pro-Bereiche,
   Berufsmodule), sind nicht fremd — gemessen an der Quelle (Back-Region AB_WERK_BEREICH_QUELLEN, gefüllt vom Konfektionierer),
   nie an Kennung oder Herkunftsfeld. Rot-Beweis (07.10.2026): am Stand vor dem Fix trug jeder Pro-Bereich marke-fremd. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after } = require('node:test');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const PROBE_PW = 'NURPROBE-' + 'rand'.repeat(4);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'marke-fremd-ab-werk-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
const gebaut = new Map();
function produkt(slug, beruf) {
  const schluessel = slug + (beruf ? '+' + beruf : '');
  if (!gebaut.has(schluessel)) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    const sprache = slug.endsWith('-en') ? 'en' : 'de';
    const zusatz = beruf ? ['bereich', 'logikmodul'].map((t) => path.join(__dirname, '..', 'tools', 'berufsmodule', 'vivodepot-pro-' + beruf + '-' + t + '-' + sprache + '.json')) : [];
    const r = konfektionieren({ ziel: path.join(TMP, schluessel), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: [...VP.modulDateienFuer(p), ...zusatz] });
    gebaut.set(schluessel, path.join(r.ordner, 'vivodepot.html'));
  }
  return ladeKern({ htmlPfad: gebaut.get(schluessel) });
}
const PRO_BEREICH = 'pro-betrieb-zugaenge';

test('[Ab Werk·Pro] kein Pro-Bereich trägt marke-fremd, im Anlegen wie im Vorschau-Start', async () => {
  const { V, document: dok } = produkt('pro-de');
  const ids = V.bereicheAlle().map((b) => b.id).filter((id) => /^pro-/.test(id));
  assert.ok(ids.length >= 6, 'Vorbedingung: Pro trägt seine Bereiche ab Werk');
  for (const id of ids) assert.equal(V._bereichFremdeMarkeHerkunft(id), null, 'vor dem Anlegen: ' + id);
  await V.depotAnlegen(PROBE_PW);
  for (const id of ids) {
    assert.equal(V._bereichFremdeMarkeHerkunft(id), null, id);
    V.renderSektor(id);
    assert.doesNotMatch(dok.getElementById('content').innerHTML, /marke-fremd/, id + ' ohne Rand');
  }
});

test('[Ab Werk·Berufsmodul] Pro mit Steuerberatung ab Werk: das Berufsmodul trägt keinen Rand', async () => {
  const { V, document: dok } = produkt('pro-de', 'steuerberatung');
  await V.depotAnlegen(PROBE_PW);
  assert.ok(V.bereicheAlle().some((b) => b.id === 'pro-steuerberatung'), 'Vorbedingung: das Berufsmodul ist ab Werk da');
  assert.equal(V._bereichFremdeMarkeHerkunft('pro-steuerberatung'), null);
  V.renderSektor('pro-steuerberatung');
  assert.doesNotMatch(dok.getElementById('content').innerHTML, /marke-fremd/);
});

test('[Ab Werk·Rot-Beweis] ein fremdes Modul, das die Kennung eines Pro-Bereichs nachahmt, behält den Rand', async () => {
  const { V, document: dok } = produkt('privat-de');
  await V.depotAnlegen(PROBE_PW);
  V.akteurSelbstErklaeren('Test');
  const fremd = { modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'vivodepot',
    bereiche: { [PRO_BEREICH]: { label: 'Betrieb', icon: 'folder' } } };
  const r = V.modulEinlassen(JSON.stringify(fremd), V.getData());
  assert.equal(r.angenommen, true, 'Vorbedingung: Modul angenommen: ' + r.grund);
  V._bereichsModuleAusDepotAnmelden(V.getData());
  assert.equal(V._bereichFremdeMarkeHerkunft(PRO_BEREICH), 'vivodepot', 'Kennung und Herkunftsfeld machen nichts zu „ab Werk“');
  V.renderSektor(PRO_BEREICH);
  assert.match(dok.getElementById('content').innerHTML, /marke-fremd/);
});

test('[Ab Werk·Rot-Beweis] ein Pro-Bereich aus der Mitschrift einer Datei behält in Privat den Rand', async () => {
  const pro = produkt('pro-de');
  await pro.V.depotAnlegen(PROBE_PW);
  pro.V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  pro.V.sektorFeldSetzen(PRO_BEREICH, 'tpl_laufender_auftrags_projektstand', 'Wert aus Pro');
  const umschlag = JSON.parse(JSON.stringify(await pro.V.depotSerialisieren()));
  const { V } = produkt('privat-de');
  await V.depotLaden(umschlag, PROBE_PW);
  assert.ok(V.bereicheAlle().some((b) => b.id === PRO_BEREICH), 'Vorbedingung: Privat führt den Pro-Bereich aus der Mitschrift');
  assert.notEqual(V._bereichFremdeMarkeHerkunft(PRO_BEREICH), null, 'aus der Datei, nicht aus dem Produkt: fremd');
});

test('[Ab Werk·geweckt] ein nativer Bereich, den eine Pro-Datei mit Altwert weckt (health), trägt in Pro keinen Rand', async () => {
  const privat = produkt('privat-de');
  await privat.V.depotAnlegen(PROBE_PW);
  privat.V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  privat.V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Heuschnupfen' }]);
  const umschlag = JSON.parse(JSON.stringify(await privat.V.depotSerialisieren()));
  const { V, document: dok } = produkt('pro-de');
  await V.depotLaden(umschlag, PROBE_PW);
  assert.ok(V.bereicheAlle().some((b) => b.id === 'health'), 'Vorbedingung: Pro weckt health mit dem Altwert');
  assert.equal(V._bereichFremdeMarkeHerkunft('health'), null);
  V.renderSektor('health');
  assert.doesNotMatch(dok.getElementById('content').innerHTML, /marke-fremd/);
});
