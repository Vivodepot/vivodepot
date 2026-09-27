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
  V.VdStore.holen = async (id) => { await warte(ms); return holen(id); };
  V.VdStore.setzen = async (rec) => { await warte(ms); return setzen(rec); };
}

test('[Verlassen·während Sichern] der Anker behält seine verwalteten Depots, wenn der Sub verlassen wird, während das interne Sichern noch wartet', async () => {
  const { V, uuid } = await ankerMitBetretenemSub();
  assert.equal(V.ankerDaten().verwalteteDepots.length, 1, 'Vorbedingung: der Anker führt den Sub');
  langsamerSpeicher(V, 40);
  const sichern = V.depotInternSichern({ still: true });   // tauscht im Sub-Kontext data auf den Anker und wartet auf den Speicher
  // Warten, bis das Sichern WIRKLICH im getauschten Zustand steht (data = Anker, Kontext noch Sub) — nicht eine geratene Zeit, sondern der Zustand selbst.
  for (let i = 0; i < 200 && V.getData() !== V.ankerDaten(); i++) await warte(5);
  assert.equal(V.getData(), V.ankerDaten(), 'Vorbedingung: das Sichern hat data auf den Anker getauscht und wartet auf den Speicher');
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
   Jede Stelle, die im Sub-Kontext `data` für die Wartezeit auf den Anker tauscht (`const _subData = data;`), muss den Rücktausch absichern: nur zurück, wenn
   der Sub-Kontext noch derselbe ist. Ein ungesicherter Rücktausch (`finally { data = _subData; }`) ist genau der Fund. Die Probe oben belegt den Weg des
   internen Speicherns; der Datei-Weg (`depotInDateiSichern`) hat dieselbe Bauform und braucht einen Browser-Download — hier hält ihn dieser Wächter. */
const fs = require('node:fs');
const path = require('node:path');
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const TAUSCH = /const _subData = data;/g;
const UNGESICHERT = /finally\s*\{\s*data\s*=\s*_subData;/g;
const GESICHERT = /finally\s*\{\s*if\s*\(aktiverSubKontext === _subUUID\)\s*data\s*=\s*_subData;/g;

function befund(text) {
  return { tausch: (text.match(TAUSCH) || []).length, ungesichert: (text.match(UNGESICHERT) || []).length, gesichert: (text.match(GESICHERT) || []).length };
}

test('[Klasse·Rücktausch] jeder Tausch von data auf den Anker hat einen gesicherten Rücktausch — keinen ungesicherten', () => {
  const b = befund(KERN);
  assert.ok(b.tausch >= 2, 'die Tauschstellen sind gefunden (Positivkontrolle): ' + b.tausch);
  assert.equal(b.ungesichert, 0, 'ein ungesicherter Rücktausch `finally { data = _subData; }` setzt nach einem Verlassen den Sub in den Anker-Kontext');
  assert.equal(b.gesichert, b.tausch, 'jeder Tausch hat genau einen gesicherten Rücktausch');
});

test('[Klasse·Rücktausch·Rot-Beweis] ein ungesicherter Rücktausch wird gefunden, ein gesicherter nicht', () => {
  const kaputt = KERN.replace('finally { if (aktiverSubKontext === _subUUID) data = _subData; }', 'finally { data = _subData; }');
  assert.notEqual(kaputt, KERN, 'der Eingriff greift');
  const b = befund(kaputt);
  assert.ok(b.ungesichert >= 1, 'der ungesicherte Rücktausch wird als solcher erkannt');
  assert.notEqual(b.gesichert, b.tausch);
});
