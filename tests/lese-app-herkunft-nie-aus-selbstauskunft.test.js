'use strict';
/* Die Lese-App sagt zu keinem Modul „geprüft“, weil das Depot es von sich behauptet (U2-ADR-258, U2-ADR-335). Die Felder
   `ungeprueft`, `pruefstufe` und `abWerk` stehen in der Datei, die der Absender vollständig in der Hand hat — sie sind
   Selbstauskunft. Diese Probe hält das Verhalten fest, über jede Kombination dieser drei Felder:
   - `modulHerkunftStand` ergibt nur „ungeprueft“ oder „unbekannt“, nie „geprueft“;
   - `modulHerkunftBerechnen` zählt nie ein Modul als geprüft, und die Gesamtaussage „gilt als geprüft“ fällt nie.
   Rot-Beweis: eine Fassung, die der Selbstauskunft glaubt (die Umkehrung von „geprueft“ entfernt), wird erkannt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeLesen, LESEN_PATH } = require('./load-lesen.js');

const HTML = fs.readFileSync(LESEN_PATH, 'utf8');
const FELDER = [];
for (const ungeprueft of [true, false, undefined]) {
  for (const pruefstufe of ['intern', 'extern-geprueft:pruefer', 'extern-geprueft:herausgeber', 'extern-ungeprueft', undefined]) {
    for (const abWerk of [true, false, undefined]) FELDER.push({ ungeprueft, pruefstufe, abWerk });
  }
}
function modul(f) {
  const m = { id: 'probe-modul', modulTyp: 'logik' };
  for (const [k, v] of Object.entries(f)) if (v !== undefined) m[k] = v;
  return m;
}
function verletzungen(V) {
  const v = [];
  for (const f of FELDER) {
    const stand = V.modulHerkunftStand(modul(f));
    if (!['ungeprueft', 'unbekannt'].includes(stand)) v.push(JSON.stringify(f) + ' → ' + stand);
    const depot = {};
    for (const slot of V.MODUL_SLOTS) depot[slot] = [modul(f), modul(f)];
    const h = V.modulHerkunftBerechnen(depot);
    if (h.geprueft !== 0) v.push(JSON.stringify(f) + ' → geprueft gezählt: ' + h.geprueft);
    if (V.modulHerkunftGiltAlsGeprueft(h)) v.push(JSON.stringify(f) + ' → gilt als geprüft');
  }
  return v;
}

test('[Lese-App · Herkunft] aus Selbstauskunft (ungeprueft, pruefstufe, abWerk) wird nie „geprüft“, nur „ungeprüft“ oder „unbekannt“', () => {
  const { V } = ladeLesen();
  assert.equal(FELDER.length, 45);
  assert.deepEqual(verletzungen(V), []);
});

test('[Lese-App · Herkunft · Rot-Beweis] eine Fassung, die der Selbstauskunft glaubt, wird gemeldet', () => {
  const a = "  return behauptet === 'geprueft' ? 'ungeprueft' : behauptet;";
  assert.equal(HTML.split(a).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const { V } = ladeLesen({ html: HTML.replace(a, '  return behauptet;') });
  const funde = verletzungen(V);
  assert.ok(funde.length > 0, 'Nicht-leer-Wache: die verschlechterte Fassung fällt auf');
  assert.ok(funde.some((x) => x.includes('→ geprueft')), funde.join('\n'));
});

/* Fall B (Schutz-Wagen, 04.10.2026): ein selbst gesetztes `abWerk: true` ließ ein Modul aus der Zählung verschwinden („Herkunft: keine
   Erweiterung“), obwohl es fremd war. Ab Werk ist nur, was beim Öffnen nach INHALT als ab Werk festgestellt wurde (Fingerabdruck gegen
   REZEPT_FINGERABDRUECKE_LESEN, im Einstieg _depotUebernehmenGeprueft). */
test('[Lese-App · Herkunft · Fall B] ein Modul mit selbst gesetztem abWerk verschwindet nie aus der Zählung', async () => {
  const { V } = ladeLesen();
  const d = { textsatzModule: [{ sprache: 'fr', moduleVersion: 1, abWerk: true, texte: {} }] };
  await V._depotUebernehmenGeprueft(d);
  const h = V.modulHerkunftBerechnen(d);
  assert.equal(h.geprueft + h.ungeprueft + h.unbekannt, 1, 'das Modul wird gezählt');
  assert.equal(h.geprueft, 0);
});

test('[Lese-App · Herkunft · Fall B · Gegenprobe] ein nach Inhalt ab Werk geliefertes Modul zählt nicht als Erweiterung, auch ohne Feld', async () => {
  const { V } = ladeLesen();
  const enAbWerk = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
  const d = { textsatzModule: [enAbWerk] };
  await V._depotUebernehmenGeprueft(d);
  const h = V.modulHerkunftBerechnen(d);
  assert.equal(h.geprueft + h.ungeprueft + h.unbekannt, 0);
});

test('[Lese-App · Herkunft · Fall B · Rot-Beweis] eine Fassung, die dem Feld abWerk glaubt, läßt das Modul verschwinden und fällt', async () => {
  const a = '        if (_abWerkGleichLesen(m)) continue;';
  assert.equal(HTML.split(a).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const { V } = ladeLesen({ html: HTML.replace(a, '        if (m.abWerk === true) continue;') });
  const d = { textsatzModule: [{ sprache: 'fr', moduleVersion: 1, abWerk: true, texte: {} }] };
  await V._depotUebernehmenGeprueft(d);
  const h = V.modulHerkunftBerechnen(d);
  assert.equal(h.geprueft + h.ungeprueft + h.unbekannt, 0, 'die verschlechterte Fassung zählt das Modul nicht — genau das fängt die Probe oben');
});
