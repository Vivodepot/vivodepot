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
