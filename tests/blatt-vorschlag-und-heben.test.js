'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Ein Modul schlägt vor, die Bürgerin hebt (U2-ADR-157)
   ────────────────────────────────────────────────────────────────────────────
   Entschieden am 21.08.2026: Ein Modul darf ein Feld für ein Angehörigen-Blatt
   VORSCHLAGEN. Sichtbar wird es erst, wenn die Bürgerin es selbst dorthin hebt.

   DIE EIGENTLICHE ZUSICHERUNG, wörtlich aus dem Auftrag: „Ein Modul, das ein
   Blatt-Feld ohne Zutun der Bürgerin sichtbar macht, muss eine Probe rot machen."

   Der Bauteil davor ist der Rückfall auf die angedockte Definition: ohne ihn kam
   der WERT durch und die BESCHRIFTUNG nicht — die Vertrauensperson läse die
   Kennung statt des Namens (gemessen vor dem Bau).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'blatt-probe-2026';
const DEF = {
  sektorId: 'gesundheit', feldId: 'tpl_ernaehrungsform', label: 'Ernährungsform',
  typ: 'text', herkunft: 'Pflegeheim Sonnenhof', blattVorschlag: 'pflegeheimakut',
};

async function depotMitVorschlag(extraDefs) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.feldDefinitionen = [Object.assign({}, DEF)].concat(extraDefs || []);
  d.sektoren.gesundheit = { tpl_ernaehrungsform: 'pürierte Kost' };
  V.setData(d);
  return V;
}

/* ══ DIE EIGENTLICHE ZUSICHERUNG ═══════════════════════════════════════════ */

test('[Blatt·Rot-Beweis] ein Vorschlag ALLEIN macht nichts sichtbar', async () => {
  const V = await depotMitVorschlag();
  assert.deepEqual(V.blattGehobeneEintraege('pflegeheimakut'), [],
    'ein Modul darf das Blatt einer Vertrauensperson nicht von sich aus füllen');
  // Und die Gegenprobe: das Feld IST im Depot, mit Wert — es fehlt nur die Hebung.
  assert.equal(V.getData().sektoren.gesundheit.tpl_ernaehrungsform, 'pürierte Kost');
  assert.equal(V.blattVorschlaege().length, 1, 'der Vorschlag liegt vor');
  assert.equal(V.blattVorschlaege()[0].gehoben, false);
});

test('[Blatt·Rot-Beweis] gehoben erscheint es — mit BESCHRIFTUNG, nicht mit Kennung', async () => {
  const V = await depotMitVorschlag();
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  const eintraege = V.blattGehobeneEintraege('pflegeheimakut');
  assert.equal(eintraege.length, 1);
  const zeile = V.akutZeileHTML(eintraege[0].quelle, eintraege[0].feld);
  assert.ok(zeile.includes('Ernährungsform'), 'die Beschriftung des Moduls trägt');
  assert.ok(!zeile.includes('tpl_ernaehrungsform'), 'und nicht die rohe Kennung');
  assert.ok(zeile.includes('pürierte Kost'), 'der Wert steht daneben');
});

test('[Blatt·Rückfall] auch der TYP reist mit — ein Datum steht nicht roh da', async () => {
  const V = await depotMitVorschlag([{ sektorId: 'gesundheit', feldId: 'tpl_termin',
    label: 'Nächster Termin', typ: 'datum', herkunft: 'Pflegeheim Sonnenhof' }]);
  const d = V.getData(); d.sektoren.gesundheit.tpl_termin = '2026-12-01'; V.setData(d);
  const zeile = V.akutZeileHTML('gesundheit', 'tpl_termin');
  assert.ok(zeile.includes('01.12.2026'), 'über die angedockte Definition als Datum gerendert');
  assert.ok(!zeile.includes('2026-12-01'), 'nicht als roher Text — das war der Zustand vor dem Rückfall');
});

/* ══ Die geschlossene Werteliste ═══════════════════════════════════════════ */

test('[Blatt] die Werteliste sind die BESTEHENDEN Blätter — ein erfundenes wird verworfen', async () => {
  const V = await depotMitVorschlag([{ sektorId: 'gesundheit', feldId: 'tpl_quatsch',
    label: 'X', typ: 'text', herkunft: 'Wer auch immer', blattVorschlag: 'mein-eigenes-blatt' }]);
  assert.equal(V.blattVorschlaege().length, 1, 'nur der gültige Vorschlag zählt');
  // Und das erfundene Blatt wird BENANNT — am Feld, wo die Bürgerin es sieht.
  const zeile = V._blattVorschlagZeileHTML('gesundheit',
    { feldId: 'tpl_quatsch', herkunft: 'Wer auch immer', blattVorschlag: 'mein-eigenes-blatt' }, true);
  assert.match(zeile, /mein-eigenes-blatt/, 'ein Tippfehler sähe sonst aus wie ein Verzicht');
  assert.match(zeile, /Wer auch immer/, 'und der Anbieter steht dabei');
});

test('[Blatt] jedes der fünf bestehenden Blätter ist ein zulässiger Vorschlag', () => {
  const { V } = ladeKern();
  for (const s of V.angehoerigenSituationenAlle()) {
    assert.equal(V.blattVorschlagPruefen(s.id).blatt, s.id);
  }
  assert.equal(V.blattVorschlagPruefen('').blatt, null, 'kein Vorschlag ist kein Fehler');
});

/* ══ Zug 3: das Modul geht ═════════════════════════════════════════════════ */

test('[Blatt·Zug3] verschwindet das Modul, verschwindet das Feld vom Blatt', async () => {
  const V = await depotMitVorschlag();
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  assert.equal(V.blattGehobeneEintraege('pflegeheimakut').length, 1);
  const d = V.getData(); d.feldDefinitionen = []; V.setData(d);
  assert.deepEqual(V.blattGehobeneEintraege('pflegeheimakut'), [],
    'die vorsichtigere der zwei Formen: keine Waise auf einem Notfallblatt');
});

test('[Blatt·Zug3] die Marke der Bürgerin bleibt — kommt das Modul zurück, ist das Feld wieder da', async () => {
  const V = await depotMitVorschlag();
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  const d = V.getData();
  const gemerkt = JSON.parse(JSON.stringify(d.feldDefinitionen));
  d.feldDefinitionen = []; V.setData(d);
  assert.equal(V.blattGehobeneEintraege('pflegeheimakut').length, 0);
  const d2 = V.getData(); d2.feldDefinitionen = gemerkt; V.setData(d2);
  assert.equal(V.blattGehobeneEintraege('pflegeheimakut').length, 1,
    'sie muss nicht ein zweites Mal heben');
});

/* ══ Der Akt selbst ════════════════════════════════════════════════════════ */

test('[Blatt] gehoben wird EINZELN — jedes Feld für sich', async () => {
  const V = await depotMitVorschlag([{ sektorId: 'gesundheit', feldId: 'tpl_mobilitaet',
    label: 'Mobilität', typ: 'text', herkunft: 'Pflegeheim Sonnenhof', blattVorschlag: 'pflegeheimakut' }]);
  const d = V.getData(); d.sektoren.gesundheit.tpl_mobilitaet = 'Rollator'; V.setData(d);
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  assert.equal(V.blattGehobeneEintraege('pflegeheimakut').length, 1,
    'das zweite Feld ist NICHT mitgekommen — kein Sammelschalter');
});

test('[Blatt] zweimal heben legt keinen zweiten Eintrag an', async () => {
  const V = await depotMitVorschlag();
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  assert.equal(V.getData().blattFelder.pflegeheimakut.length, 1);
});

test('[Blatt] senken nimmt es wieder herunter', async () => {
  const V = await depotMitVorschlag();
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  await V.blattFeldSenken('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  assert.deepEqual(V.blattGehobeneEintraege('pflegeheimakut'), []);
});

test('[Blatt] auf ein erfundenes Blatt lässt sich nicht heben', async () => {
  const V = await depotMitVorschlag();
  await assert.rejects(() => V.blattFeldHeben('gibtesnicht', 'gesundheit', 'tpl_ernaehrungsform'));
});

/* ══ Die drei gemessenen Sperren bleiben, was sie sind ═════════════════════ */

test('[Blatt·Sperre] das Heben ändert die eingefrorene Blatt-Registry NICHT', async () => {
  const V = await depotMitVorschlag();
  const vorher = V.angehoerigenSituationenAlle().find((s) => s.id === 'pflegeheimakut');
  const zahlVorher = (vorher.bloecke || []).flatMap((b) => b.eintraege || []).length;
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  const nachher = V.angehoerigenSituationenAlle().find((s) => s.id === 'pflegeheimakut');
  assert.equal((nachher.bloecke || []).flatMap((b) => b.eintraege || []).length, zahlVorher,
    'die Registry bleibt eingefroren — das Gehobene entsteht beim Rendern, nicht in ihr');
  assert.equal(V.angehoerigenSituationenAlle().every((s) => Object.isFrozen(s) && Object.isFrozen(s.bloecke)), true,
    'jedes Blatt der Registry ist eingefroren (die Vorlagen-Prüfung friert es ein)');
});

test('[Blatt·Sperre] ein gehobenes Feld wandert NICHT in den Angehörigen-Cache', async () => {
  const V = await depotMitVorschlag();
  await V.blattFeldHeben('pflegeheimakut', 'gesundheit', 'tpl_ernaehrungsform');
  const subset = V.angehoerigenCacheModell();
  assert.equal(typeof (subset.sektoren.gesundheit || {}).tpl_ernaehrungsform, 'undefined',
    'das ist die Entkopplung aus A383 — was ohne Depot-Passwort sichtbar ist, ist eine EIGENE Frage');
});

/* ══ Die Migrationsstufe ═══════════════════════════════════════════════════ */

test('[Blatt·Stufe 71→72] ein Bestandsdepot bekommt die leere Tafel', () => {
  const { V } = ladeKern();
  const d = Object.assign(V.leeresDepot(), { schemaVersion: 71 });
  delete d.blattFelder;
  V.depotNormalisieren(d);
  assert.deepEqual(d.blattFelder, {});
  assert.ok(d.schemaVersion >= 72);
});
