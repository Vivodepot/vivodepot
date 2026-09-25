'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Etappe 2f (Schnitt Glied 2, A286) — „Weglassen, nicht Umbelegen",
   Ausgabeweg-Cluster: _ausMappingZurueck (der EINE Funnel für sechs
   Rückrichtungs-Mapping-Tabellen + jede benutzerdefinierte Format-Zuordnung)
   ────────────────────────────────────────────────────────────────────────
   Spiegel von Etappe 2b (`_b16ZielExistiert`), 2c (SITUATIONEN) und 2e
   (CROSS_SEKTOR_FELDER). Vor diesem Bau prüfte `_ausMappingZurueck` NICHT,
   ob `m.feld` (das Ziel-Feld im Katalog) noch existiert — ein totes Ziel
   landete über `sektorFeldSetzen` in einem für niemanden sichtbaren
   Phantom-Slot, dieselbe Fehlerklasse wie B16 vor Etappe 2b. Alle sechs
   Mapping-Tabellen (VC_IDENTITAET_MAPPING, VC_FINANZEN_MAPPING,
   VC_SOZIALVERSICHERUNG_MAPPING, XOEV_VERWALTUNG_MAPPING,
   EDCI_BILDUNG_MAPPING, XMELD_IDENTITAET_MAPPING) sind heute lückenlos
   lebendig (geprüft) — der Wächter ist rein vorbeugend, wie 2c/2e.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const TABELLEN = [
  ['identity', 'VC_IDENTITAET_MAPPING'],
  ['finance', 'VC_FINANZEN_MAPPING'],
  ['socialInsurance', 'VC_SOZIALVERSICHERUNG_MAPPING'],
  ['administration', 'XOEV_VERWALTUNG_MAPPING'],
  ['education', 'EDCI_BILDUNG_MAPPING'],
  ['identity', 'XMELD_IDENTITAET_MAPPING'],
];

test('[2f] keine der sechs Rückrichtungs-Mapping-Tabellen führt ein totes Ziel-Feld', () => {
  const { V } = ladeKern();
  for (const [sektor, name] of TABELLEN) {
    const tabelle = V[name];
    assert.ok(Array.isArray(tabelle) && tabelle.length, name + ' geladen');
    const tote = tabelle.filter((m) => !V._feldDef(sektor, m.feld)).map((m) => m.feld);
    assert.deepEqual(tote, [], name + ': ein neuer toter Zeiger — benennen (mit Grund) oder korrigieren, wie bei B16');
  }
});

test('[2f] Rot-Beleg: ein totes Ziel-Feld entfällt aus _ausMappingZurueck, statt als Phantom-Wert zurückzukommen', () => {
  const { V } = ladeKern();
  const mapping = [{ feld: 'ein_erfundenes_feld_xyz', ziel: 'claimName' }];
  const out = V._ausMappingZurueck('identity', mapping, { claimName: 'wert-der-nirgends-hingehoert' });
  assert.deepEqual(out, [], 'totes Ziel wird weggelassen, kein Phantom-Eintrag');
});

test('[2f] Rot-Beleg gilt auch für den alsListe-Zweig', () => {
  const { V } = ladeKern();
  const mapping = [{ feld: 'ein_erfundenes_listenfeld_xyz', ziel: 'claimListe', alsListe: true }];
  const out = V._ausMappingZurueck('identity', mapping, { claimListe: ['a', 'b'] });
  assert.deepEqual(out, [], 'totes Listen-Ziel wird weggelassen, kein Phantom-Eintrag');
});

test('[2f · Gegenprobe] ein echtes Ziel-Feld bleibt unverändert (VC_IDENTITAET_MAPPING → givenName)', () => {
  const { V } = ladeKern();
  const out = V._ausMappingZurueck('identity', V.VC_IDENTITAET_MAPPING, { given_name: 'Marlies' });
  const treffer = out.find((e) => e.feldId === 'givenName');
  assert.ok(treffer, 'ein lebendiges Ziel-Feld erscheint weiterhin');
  assert.equal(treffer.wert, 'Marlies');
});

test('[2f · Gegenprobe] echter XMeld-Rundlauf bleibt vollständig (_xmeldFelder)', () => {
  const { V } = ladeKern();
  const felder = V._xmeldFelder({ vorname: 'Anna', nachname: 'Muster', geburtsdatum: '', geburtsname: '', geburtsort: '', nationalitaet: '', strasse: '', plz_ort: '', familienstand: '', ausweis_nr: '' });
  const namen = felder.map((f) => f.feldId).sort();
  assert.deepEqual(namen, ['familyName', 'givenName'], 'nur die belegten, lebendigen Felder — leere Ziele bleiben ohnehin schon aussen vor');
});
