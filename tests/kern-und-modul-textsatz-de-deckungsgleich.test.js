'use strict';
/* ═══════════════════════════════════════════════════════�
   kern-und-modul-textsatz-de-deckungsgleich.test.js — was das deutsche Produkt trägt, ist die Quelle
   ───────────────────────────────────────────────────────�
   URSPRUNG (Schnitt-Reparatur, 18.09.2026): der deutsche Satz stand zweimal da, als Konstante im Kern und als Moduldatei, und beide liefen unbemerkt
   um 195 Kennungen auseinander. Seit S8 (U2-ADR-428) gibt es keine zwei Quellen mehr: die Konstante ist aus dem Kern gegangen, die Moduldatei
   `tools/textsatz-de-modul.json` ist die Quelle, und die deutschen Produkte tragen sie eingebacken (AB_WERK_SPRACHE_PRODUKT).

   WAS DIESER WÄCHTER HEUTE PRÜFT: dass das, was ein deutsches Produkt WIRKLICH trägt (roh, wie im gebackenen Kern geladen), die Kennungsmenge und die Werte der
   committeten Moduldatei sind — ein veralteter Bau (Produkt aus einer älteren Datei) oder ein Konfektionierer, der Kennungen verliert, würde hier rot.
   Er liest die Datei roh, NICHT über `baueModul()`: ein Wächter, der den Erzeuger dazwischenschaltete, prüfte das Modul gegen sich selbst.
   Das nackte Gerüst trägt keinen Satz (Gegenprobe). Rot in BEIDE Richtungen (Rot-Beweise unten).
   ═══════════════════════════════════════════════════════� */
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const MODUL_PFAD = path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json');

function kernKennungen(produkt) {
  const { V } = ladeKern(produkt ? { produkt } : {});
  assert.equal(V.AB_WERK_SPRACHE_PRODUKT.sprache, 'de', 'ein deutsches Produkt trägt ein deutsches Sprachmodul');
  return new Set(Object.keys(V.AB_WERK_SPRACHE_PRODUKT.texte));
}

function modulKennungen() {
  const modul = JSON.parse(fs.readFileSync(MODUL_PFAD, 'utf8'));
  return new Set(Object.keys(modul.texte));
}

test('[Kern↔Modul-DE·Deckungsgleich] das gebackene Sprachmodul des deutschen Produkts und tools/textsatz-de-modul.json tragen dieselbe Kennungsmenge (privat-de und pro-de)', () => {
  for (const p of ['privat-de', 'pro-de']) {
    const k = kernKennungen(p); const m = modulKennungen();
    assert.deepEqual([...m].filter((x) => !k.has(x)).sort(), [], p + ': nur im Modul, fehlt dem Produkt');
    assert.deepEqual([...k].filter((x) => !m.has(x)).sort(), [], p + ': nur im Produkt, fehlt der Quelle');
  }
  const kern = kernKennungen();
  const modul = modulKennungen();
  const nurImModul = [...modul].filter((k) => !kern.has(k)).sort();
  const nurImKern = [...kern].filter((k) => !modul.has(k)).sort();
  assert.deepEqual(nurImModul, [], 'nur im Modul, fehlt dem Produkt (pro-de/privat-de docken kein Sprachmodul)');
  assert.deepEqual(nurImKern, [], 'nur im Kern, fehlt der gepflegten Quelle');
});

test('[Kern↔Modul-DE·Ausbeute] beide Mengen sind überhaupt besetzt, die Probe prüft nicht gegen zwei Leeren', () => {
  const kern = kernKennungen();
  const modul = modulKennungen();
  assert.ok(kern.size > 1000, 'Kern-Kennungsmenge verdächtig klein: ' + kern.size);
  assert.ok(modul.size > 1000, 'Modul-Kennungsmenge verdächtig klein: ' + modul.size);
});

test('[Kern↔Modul-DE·Rot-Beweis] eine nur-im-Modul-Kennung wird erkannt', () => {
  const kern = kernKennungen();
  const modul = modulKennungen();
  modul.add('rot-beweis-nur-im-modul.label');
  const nurImModul = [...modul].filter((k) => !kern.has(k));
  assert.deepEqual(nurImModul, ['rot-beweis-nur-im-modul.label']);
});

test('[Kern↔Modul-DE·Rot-Beweis] eine nur-im-Kern-Kennung wird erkannt', () => {
  const kern = kernKennungen();
  const modul = modulKennungen();
  kern.add('rot-beweis-nur-im-kern.label');
  const nurImKern = [...kern].filter((k) => !modul.has(k));
  assert.deepEqual(nurImKern, ['rot-beweis-nur-im-kern.label']);
});

test('[Kern↔Modul-DE·Gerüst] das nackte Gerüst trägt keinen deutschen Satz (U2-ADR-428)', () => {
  const { V } = ladeKern({ blank: true });
  assert.equal(V.AB_WERK_SPRACHE_PRODUKT, null);
  assert.equal(V.textLesen('strings:welcomeWeiter.text'), null, 'ohne Modul liest der Kern nichts');
});
