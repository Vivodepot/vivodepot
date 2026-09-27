'use strict';
/* ════════════════════════════════════════════════════════════════════════
   R4-1-Fund (VDCR, 17.09.2026): escapeHTML() der Lese-App maskierte bis hierhin nur
   &, < und > — das reicht für Textknoten, nicht für Attribute. Ein Label aus einer
   fremden, unverschlüsselten Datei konnte mit einem Anführungszeichen aus dem
   Attribut ausbrechen und ein zweites einschleusen (Zwilling des Kern-Fundes, dort
   am 16.09.2026 in vivodepot.html behoben — hier war die eigene Kopie der Lese-App
   nie nachgezogen).

   Der Fix ist EINE Zeile an der gemeinsamen Funktion (vivodepot-lesen.html:
   escapeHTML) — das hier sind drei Rot-Beweise dafür, keine drei Fixe. Fällt eine Senke
   später an escapeHTML vorbei (eigene Verkettung ohne die Funktion), fällt genau
   ihr Test um. Eine vierte Senke (data-anlass-feld) existiert erst mit der
   Klartext-Anlass-Datei (eigener Strang) und hat dort ihre eigene Probe.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

async function ausgabeAusDemKern() {
  const { V } = ladeKern();
  await V.depotAnlegen('lese-anlass-pw');
  V.akteurSelbstErklaeren('Hedwig Brandt');
  const setze = (k, w) => { const s = V.kennungZuSelektor(k); V.sektorFeldSetzen(s.sektorId, s.feldId, w); };
  setze('identity.givenName', 'Hedwig');
  setze('identity.familyName', 'Brandt');
  setze('health.healthInsurance', { override: 'AOK Bayern' });
  setze('health.insuranceNumber', 'A123456780');
  setze('health.medicationOngoing', [{ text: 'Metformin 500' }]);
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', storageLocation: 'Ordner im Wohnzimmer' });
  const ds = V.zusammenstellungDatensatz(
    ['identity.givenName', 'identity.familyName', 'health.healthInsurance', 'health.insuranceNumber',
      'health.medicationOngoing', 'advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation', 'identity.birthDate'],
    { id: 'heimaufnahme', titel: 'Heimaufnahme' }, { sensibel: true });
  return JSON.parse(JSON.stringify(ds, null, 2));   // genau die Datei, die hinausgeht
}

test('[Sicherheit] Ausbruch-Probe am Antwort-Blatt (data-antwort-feld)', async () => {
  /* Ruft renderAntwort() direkt — nicht über verarbeiteDatei()/erkenneFormat() — weil der
     ROUTING-Weg für einen echten, verschlüsselten Antwort-Umschlag (istAntwortUmschlag)
     eine Chiffrat-Hülle voraussetzt, die hier nichts zur Sache tut. Die Senke selbst
     (data-antwort-feld in renderAntwort) ist unabhängig vom Routing-Weg davor. */
  const ds = await ausgabeAusDemKern();
  const boese = 'Vorname" onmouseover="alert(1)';
  const antwort = Object.assign({}, ds, {
    felder: ds.felder.map((f, i) => (i === 0 ? Object.assign({}, f, { label: boese }) : f)),
    anfrage: { von: 'Pflegeheim Sonnenhof', zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: 'AUF-1' },
  });
  const { V: L, document } = ladeLesen();
  L.renderAntwort(antwort, null);
  const app = document.getElementById('app');
  const html = String((app && app.innerHTML) || '');
  assert.match(html, /id="antwort-blatt"/, 'Voraussetzung: es rendert das Antwort-Blatt');
  assert.ok(!html.includes('" onmouseover="alert(1)'),
    'ein Label aus der Datei darf im Attribut data-antwort-feld nicht aus dem Anführungszeichen ausbrechen');
});

test('[Sicherheit] Ausbruch-Probe in der Sidebar-Navigation (data-sektor, angedockter Bereich)', () => {
  /* Die Bereichs-ID selbst ist regelgebunden (_BEREICH_ID_FORM_LESEN, /^[a-z][a-zA-Z0-9-]{1,39}$/)
     und kann darum kein Anführungszeichen tragen — geprüft, nicht angenommen: ein Modul mit einer
     ID außerhalb dieser Form wird beim Andocken schon verworfen, bevor es die Navigation erreicht.
     Der Angriffsweg ist das LABEL, das nur auf einen nicht-leeren String geprüft wird. */
  const { V: L } = ladeLesen();
  const boeseLabel = 'Vorsorge" onmouseover="alert(1)';
  const modul = {
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'test:sicherheit-sidebar', sprache: 'de',
    bereiche: { 'boeser-bereich': { label: boeseLabel } },
  };
  const depot = {
    schemaVersion: 75, menschen: [], urheberschaft: {}, mappe: [],
    sektoren: {}, feldDefinitionen: [], sensibelFelder: {}, logikModule: [],
    bereichsModule: [modul],
  };
  L.setData(depot);
  L._foldVollmachtenLesen(depot);
  const nav = L.sidebarHTML();
  assert.ok(nav.includes('data-sektor="boeser-bereich"'),
    'Voraussetzung: der angedockte Bereich steht überhaupt in der Navigation');
  assert.ok(!nav.includes('" onmouseover="alert(1)'),
    'ein Bereichs-Label aus einer angedockten Datei darf im Attribut data-sektor nicht ausbrechen');
});

test('[Sicherheit] Ausbruch-Probe bei den Situationsblättern (data-situation)', () => {
  // Seit SIT2a kommen die Situationen aus der Datei: ein bösartiger Titel im Template (Mitschrift) darf im
  // Attribut nicht ausbrechen — derselbe Aufruf wie bei den anderen Senken.
  const { V: L } = ladeLesen({ ohneSaat: true });
  L.setData({ schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    abWerkMitschrift: { situationen: [{ modulTyp: 'situation', herkunft: 'vivodepot', moduleVersion: 1, situationen: {
      geburt: { icon: 'baby', modus: 'eigen', titel: 'Geburt" onmouseover="alert(1)', bloecke: [] } } }] } });
  const nav = L.sidebarHTML();
  assert.ok(nav.includes('data-situation="geburt"'), 'Voraussetzung: die Situation steht in der Navigation');
  assert.ok(!nav.includes('" onmouseover="alert(1)'),
    'ein Situationstitel aus dem Template darf im Attribut data-situation nicht ausbrechen');
});
