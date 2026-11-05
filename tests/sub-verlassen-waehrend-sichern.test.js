'use strict';
/* Ein Sub-Depot verlassen, WÄHREND das Sichern noch läuft — der Anker darf seine Sicht nicht verlieren (S8, gefunden am Firefox-Gate des pre-push).
   Der Fund: `depotInternSichern` und `depotInDateiSichern` tauschen im Sub-Kontext `data` kurz auf den Anker, warten auf den Speicher und setzen `data`
   danach in einem `finally` zurück auf den Sub. Wurde der Sub in der Wartezeit verlassen (`subKontextVerlassen`: data = Anker, Kontext = Anker), setzte das
   `finally` den SUB als `data` in den Anker-Kontext zurück: die Verwaltung zeigte keine verwalteten Depots mehr, und ein nächstes Speichern hätte den Sub-Inhalt
   in den Anker-Umschlag geschrieben. Gemessen im echten Firefox: ohne S8 nie in acht Läufen, mit S8 in jedem zweiten — das Depot ist um das deutsche Sprachmodul
   gewachsen, die Wartezeit des Speicherns wird länger, und das Fenster zwischen „Foto hochgeladen" und „Verlassen" liegt in ihr.
   Die Zusicherung ist WIRKUNG: nach dem Verlassen trägt der Anker seinen Eintrag noch — auch wenn das Sichern erst danach fertig wird. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const ANKER_PW = 'Anker-Verlassen-2026!';
const SUB_PW = 'Sub-Verlassen-2026!';

async function ankerMitBetretenemSub() {
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: HOSTED });
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Verwalterin');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Kind', inhaberin: 'Kind', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  return { V, uuid: e.depotUUID };
}
function langsamerSpeicher(V, ms) {
  const holen = V.VdStore.holen.bind(V.VdStore);
  const setzen = V.VdStore.setzen.bind(V.VdStore);
  const zustand = { schreibtGerade: false };
  V.VdStore.holen = async (id) => { await warte(ms); return holen(id); };
  V.VdStore.setzen = async (rec) => { zustand.schreibtGerade = true; try { await warte(ms); return await setzen(rec); } finally { zustand.schreibtGerade = false; } };
  return zustand;
}

test('[Verlassen·während Sichern] der Anker behält seine verwalteten Depots, wenn der Sub verlassen wird, während das interne Sichern noch wartet', async () => {
  const { V, uuid } = await ankerMitBetretenemSub();
  assert.equal(V.ankerDaten().verwalteteDepots.length, 1, 'Vorbedingung: der Anker führt den Sub');
  const speicher = langsamerSpeicher(V, 40);
  const sichern = V.depotInternSichern({ still: true });   // wartet im Sub-Kontext auf den Speicher
  // Warten, bis das Sichern WIRKLICH im Speicher steht — nicht eine geratene Zeit, sondern der Zustand selbst. (Bis 02.11.2026 hing das Sichern
  // dabei `data` auf den Anker um; seit SUB-SICHERN-FENSTER bleibt `data` beim Sub, s. tests/sub-sichern-fenster.test.js.)
  for (let i = 0; i < 400 && !speicher.schreibtGerade; i++) await warte(5);
  assert.equal(speicher.schreibtGerade, true, 'Vorbedingung: das Sichern wartet auf den Speicher');
  assert.equal(V.imSubKontext(), true, 'Vorbedingung: noch im Sub-Kontext');
  await V.subKontextVerlassen();                            // … und der Sub wird verlassen
  await sichern;                                            // erst danach wird das Sichern fertig
  assert.equal(V.imSubKontext(), false, 'wir sind im Anker-Kontext');
  const liste = (V.ankerDaten() && V.ankerDaten().verwalteteDepots) || [];
  assert.equal(liste.length, 1, 'der Anker trägt seinen Sub weiter — das späte finally des Sicherns hat `data` nicht auf den Sub zurückgesetzt');
  assert.equal(liste[0].depotUUID, uuid);
});

test('[Verlassen·während Sichern·Gegenprobe] ohne Verlassen bleibt die Sicht im Sub — das finally stellt weiter zurück', async () => {
  const { V, uuid } = await ankerMitBetretenemSub();
  langsamerSpeicher(V, 5);
  const daten = V.getData ? V.getData() : null;
  await V.depotInternSichern({ still: true });
  assert.equal(V.imSubKontext(), true, 'der Sub-Kontext bleibt aktiv');
  assert.equal(V.ankerDaten().verwalteteDepots.length, 1);
  assert.ok(uuid);
  if (daten) assert.equal(V.getData(), daten, 'data zeigt weiter auf den Sub');
});

/* ── Gegen die Klasse, nicht nur den Einzelfall ───────────────────────────────────────────────────────────────────────────────────────────
   Bis 02.11.2026 tauschten beide Sichern-Wege im Sub-Kontext `data` für die Wartezeit auf den Anker (`const _subData = data;`) und mussten den Rücktausch
   absichern. Seit SUB-SICHERN-FENSTER gibt es keinen Tausch mehr: der Anker wird der Serialisierung übergeben. Damit gibt es auch keinen Rücktausch, den ein
   Verlassen stören könnte. Dieser Wächter verlangt das: kein Tausch, kein ungesicherter Rücktausch. Den breiteren Wächter (kein `data = _ankerData` außer beim
   Verlassen, keine Zuweisung an `data` in einem finally) führt tests/sub-sichern-fenster.test.js. */
const fs = require('node:fs');
const path = require('node:path');
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const TAUSCH = /const _subData = data;/g;
const UNGESICHERT = /finally\s*\{\s*data\s*=\s*_subData;/g;
const GESICHERT = /finally\s*\{\s*if\s*\(aktiverSubKontext === _subUUID\)\s*data\s*=\s*_subData;/g;

function befund(text) {
  return { tausch: (text.match(TAUSCH) || []).length, ungesichert: (text.match(UNGESICHERT) || []).length, gesichert: (text.match(GESICHERT) || []).length };
}

test('[Klasse·Rücktausch] kein Sichern-Weg tauscht data auf den Anker, also gibt es keinen Rücktausch', () => {
  const b = befund(KERN);
  assert.equal(b.tausch, 0, 'kein `const _subData = data;` mehr im Kern');
  assert.equal(b.ungesichert, 0, 'kein ungesicherter Rücktausch');
  assert.equal(b.gesichert, 0, 'kein Rücktausch');
});

test('[Klasse·Rücktausch·Rot-Beweis] ein wieder eingebauter Tausch mit ungesichertem Rücktausch wird gefunden', () => {
  const stelle = '    let _idbMarke;\n    try { _idbMarke = await depotInIdbSichern(anker); }';
  assert.ok(KERN.includes(stelle), 'Anker der Pflanzung gefunden');
  const kaputt = KERN.replace(stelle, '    const _subData = data; data = _ankerData;\n    try { await depotInIdbSichern(); } finally { data = _subData; }\n' + stelle);
  const b = befund(kaputt);
  assert.equal(b.tausch, 1);
  assert.equal(b.ungesichert, 1, 'der ungesicherte Rücktausch wird als solcher erkannt');
});
