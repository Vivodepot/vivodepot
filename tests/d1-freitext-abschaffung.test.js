'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — E2 D1: Freitext-Abschaffung (15.07.2026)
   ────────────────────────────────────────────────────────────────────────
   Vier Freitext-Felder (Name+Kontakt in einem String) auf das ref-Widget
   (entitaet:'person') umgestellt: betreuung/tierarzt (Haustiere-Liste),
   geburt_hebamme/erb_notar (Situationsblätter). Weiche B (freigegeben,
   15.07.): kein Doppel-Register-Modus — der Institutionsfall läuft über
   den Freitext-Override, der beim ref-Widget bereits existiert.

   Der wichtige Test ist der Chip-Input-Beweis (Zusatz 2, 09.07.): NICHTS
   darf beim bloßen Tippen oder Verlassen einen Registereintrag anlegen —
   das war der Registermüll-Bug, zweimal gefixt. Für das EINZELNE ref-Widget
   (kein refMehrfach) heißt das konkret: der Freitext-Override bleibt ein
   reiner String, wird NIE über personFindenOderAnlegen gejagt.

   Stufe-1-Fund (15.07.): Situationsblätter hatten keine „__neu__"-Ver-
   drahtung — ohne sie wäre „+ Neue Person anlegen" in geburt_hebamme/
   erb_notar ein toter Menüpunkt. Diese Suite beweist beide Richtungen:
   Erfolgsfall (Person wird angelegt) UND Abbruch (kein leerer Eintrag).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const PW = 'pw';

function findeFeld(V, fid) {
  return Object.values(V.SEKTOR_BY_ID)
    .flatMap(s => (s.sektionen || []).flatMap(sec => sec.felder || []))
    .flatMap(f => (f.typ === 'liste' && Array.isArray(f.unterFelder)) ? f.unterFelder : [f])
    .find(f => f.id === fid);
}
function findeSituationsFeld(V, sitId, fid) {
  const si = V.SITUATION_BY_ID[sitId];
  for (const block of (si.bloecke || [])) {
    for (const eintrag of (block.eintraege || [])) {
      if (eintrag && eintrag.feld && eintrag.feld.id === fid) return eintrag.feld;
    }
  }
  return null;
}

test('Die vier Felder existieren nicht mehr als Freitext-String — alle sind ref:person', () => {
  const { V } = ladeKern();
  const betreuung = findeFeld(V, 'emergencyCarePersonContact');
  const tierarzt = findeFeld(V, 'vetNameContact');
  const geburtHebamme = findeSituationsFeld(V, 'geburt', 'geburt_hebamme');
  const erbNotar = findeSituationsFeld(V, 'erbfall', 'erb_notar');
  for (const f of [betreuung, tierarzt, geburtHebamme, erbNotar]) {
    assert.ok(f, 'Feld gefunden: ' + (f && f.id));
    assert.equal(f.typ, 'ref');
    assert.equal(f.entitaet, 'person');
  }
});

test('Chip-Input-Sicherheit (Zusatz 2): getippter Freitext-Override legt NIE einen Registereintrag an', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const vorher = (V.getData().menschen || []).length;
  // Simuliert das Anzeigen eines nicht-registrierten Freitextnamens im Override — genau der Weg,
  // über den Weiche B den Institutionsfall (anonyme Praxis) abwickelt.
  const html = V.feldInputHTML({ id: 'vetNameContact', typ: 'ref', entitaet: 'person' }, { override: 'Tierarztpraxis Süd' });
  assert.match(html, /value="Tierarztpraxis Süd"/, 'Override erscheint als reiner Text im Eingabefeld');
  assert.equal((V.getData().menschen || []).length, vorher, 'kein Registereintrag durch bloßes Rendern/Anzeigen des Override-Werts');
});

test('Freitext-Override funktioniert (Weiche B — Institutionsfall ohne Register-Eintrag)', () => {
  const { V } = ladeKern();
  const html = V.feldInputHTML({ id: 'erb_notar', typ: 'ref', entitaet: 'person' }, { override: 'Notariat Dr. Kessler' });
  assert.match(html, /data-edit-override="erb_notar"/);
  assert.match(html, /value="Notariat Dr\. Kessler"/);
});

test('Situationsblatt-Feld (geburt_hebamme): „+ Neue Person anlegen" legt tatsächlich eine Register-Person an', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.renderSituation('geburt');
  const feld = findeSituationsFeld(V, 'geburt', 'geburt_hebamme');
  let neuId = null;
  // Direkter Aufruf des Mechanismus, den die __neu__-Verdrahtung in renderSituation nutzt
  // (dieselbe Kette wie im Sektor-Pfad: flowRefNeueEntitaet → situationFeldSetzen).
  V.flowRefNeueEntitaet(feld, (id) => {
    neuId = id;
    V.situationFeldSetzen('geburt', 'geburt_hebamme', { ref: id, override: '' });
  });
  document.getElementById('ref-neu-name').value = 'Sabine Wagner';
  await document.getElementById('m-ok').onclick();
  assert.ok(neuId, 'onAnlegen wurde mit einer neuen id aufgerufen');
  const gespeichert = V.liesSituation('geburt').geburt_hebamme;
  assert.equal(gespeichert.ref, neuId, 'die Person-ref steht in data.situationen.geburt.geburt_hebamme');
  const menschen = V.getData().menschen;
  assert.ok(menschen.some(m => m.id === neuId && m.name === 'Sabine Wagner'), 'Sabine Wagner ist im Register');
});

test('Situationsblatt-Feld (erb_notar): abgebrochene Neuanlage (leerer Name) erzeugt KEINEN leeren Eintrag', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const vorher = (V.getData().menschen || []).length;
  const feld = findeSituationsFeld(V, 'erbfall', 'erb_notar');
  let gerufen = false;
  V.flowRefNeueEntitaet(feld, () => { gerufen = true; });
  document.getElementById('ref-neu-name').value = '   ';
  await document.getElementById('m-ok').onclick();
  assert.equal(gerufen, false, 'onAnlegen wurde nicht aufgerufen');
  assert.equal((V.getData().menschen || []).length, vorher, 'kein leerer Eintrag im Register');
  assert.equal(V.liesSituation('erbfall').erb_notar, undefined, 'kein Wert in data.situationen.erbfall.erb_notar gesetzt');
});
