'use strict';
/* Befund S7-SCHREIBWEG-OHNE-RIEGEL (28.09.2026, HOCH). Eine Vertretung, die das Depot der vertretenen Person über ein Fach
   geöffnet hat (Umfang = das Fach, kryptographisch begrenzt, nur lesend — Entscheidung vom 23.09.2026), sah nur das Fach und
   bekam eine nur lesende Oberfläche (Modus 'vollmacht', darfBearbeiten() === false). Die Schreibwege des Kerns fragten den
   Riegel aber nicht: sektorFeldSetzen schrieb auch in einen Bereich außerhalb des Fachs, und die Antwort an eine anfragende
   Stelle (anfrageAntwortDatensatz) gab den selbst geschriebenen Wert heraus. In der Oberfläche führte die Anfrage-Ansicht
   dorthin: „Was fehlt“ bot ein Eingabefeld zum Nachtragen an, ohne darfBearbeiten() zu prüfen.
   Jetzt: das Bearbeitungstor _bearbeitenErlaubtPruefen (Versionstor + Fach-Riegel) vor jeder Mutation; die Anfrage-Ansicht
   bietet im nur lesenden Kontext kein Eingabefeld (dazu eine Klick-Probe im Browser).
   Abnahme: begrenzte Vollmacht schreibt und gibt außerhalb ihres Umfangs nichts heraus.
   GERÜST-TEST: der Klassenwächter und der Rot-Beweis lesen den QUELLTEXT des Kerns (Funktionsrümpfe, Anker des Riegels);
   ausgeführt wird immer der gebackene Kern über ladeKern — auch der Rot-Beweis (backen: true an der veränderten Kopie). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const PW_MUTTER = 'Mutter-Probe-2026!';
const PW_FACH = 'Gesundheit-Probe-2026!';
const PW_TOCHTER = 'Tochter-Probe-2026!';

async function fachKontext(ladeKern) {
  const M = ladeKern().V;
  await M.depotAnlegen(PW_MUTTER);
  M.akteurSelbstErklaeren('Gerda Beispiel');
  const d = M.getData();
  d.sektoren.identity = { givenName: 'Gerda', familyName: 'Beispiel' };
  d.sektoren.health = { ongoingTreatmentNext: 'WERT-DER-MUTTER-GESUNDHEIT' };
  // Freigegeben (Einzelfreigabe über die Markierung): seit SENSIBEL-FILTER-BEREICHSBAUSTEIN hält ein Bereichs-Baustein
  // sensible Felder zurück (tests/empfaenger-sensibel-filter.test.js); dieses Feld ist ab Werk sensibel.
  d.sensibelFelder = { health: { ongoingTreatmentNext: false } };
  d.sektoren.finance = { companyPensionScheme: 'WERT-DER-MUTTER-FINANZEN' };
  M.setData(d);
  await M.empfaengerkreisSetzen({ name: 'Anna Gesundheit', bausteine: ['bereich:health'] });
  await M.empfaengerkreisFachEinrichten(M.empfaengerkreiseListe()[0], PW_FACH);
  const datei = JSON.parse(JSON.stringify(await M.depotSerialisierenV4()));

  const { V } = ladeKern();
  await V.depotAnlegen(PW_TOCHTER);
  V.akteurSelbstErklaeren('Anna Beispiel');
  const e = V.subDepotEinhaengen(datei, { bezeichnung: 'Mama' });
  const uuid = e.depotUUID || datei.depotUUID;
  await V.subDepotVertrauenOeffnen(uuid, PW_FACH);
  V.subKontextBetreten(uuid);
  return V;
}
const ANFRAGE = Object.freeze({
  modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Klinik', zweck: 'Probe', grundlage: 'Probe', vorgang: 'S7-PROBE',
  gestelltAm: '2026-09-28', gueltigBis: '2099-12-31',
  felder: [{ kennung: 'finance.companyPensionScheme', zweck: 'Probe', pflicht: true }, { kennung: 'health.ongoingTreatmentNext', zweck: 'Probe', pflicht: true }],
  antwort: { art: 'einmalpasswort', an: 'aufnahme@probe.example' },
});
// Jeder Bearbeitungs-Schreiber, der aus der Oberfläche oder einem Weg (Anfrage, Wizard, Import) erreichbar ist.
const SCHREIBER = Object.freeze([
  ['sektorFeldSetzen', (V) => V.sektorFeldSetzen('finance', 'companyPensionScheme', 'SELBST-GESCHRIEBEN')],
  ['sektorFeldSetzen (im Fach-Bereich)', (V) => V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'SELBST-GESCHRIEBEN')],
  ['listenEintragHinzufuegen', (V) => V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', storageLocation: 'SELBST-GESCHRIEBEN' })],
  ['personHinzufuegen', (V) => V.personHinzufuegen({ name: 'SELBST-GESCHRIEBEN' })],
]);

test('[S7·Positivkontrolle] über ein Fach geöffnet: Modus Vollmacht, nur lesend, der Bereich außerhalb fehlt kryptographisch', async () => {
  const V = await fachKontext(require('./load-kern.js').ladeKern);
  assert.equal(V.Modus.aktuell(), 'vollmacht');
  assert.equal(V.Modus.darfBearbeiten(), false, 'die Oberfläche ist nur lesend');
  const inhalt = JSON.stringify(V.getData());
  assert.equal(inhalt.includes('WERT-DER-MUTTER-FINANZEN'), false, 'Finanzen stehen nicht im Fach');
  assert.equal(inhalt.includes('WERT-DER-MUTTER-GESUNDHEIT'), true, 'Gesundheit steht im Fach');
});

test('[S7-SCHREIBWEG-OHNE-RIEGEL] begrenzte Vollmacht schreibt außerhalb ihres Umfangs nichts und gibt nichts Selbstgeschriebenes heraus', async () => {
  const V = await fachKontext(require('./load-kern.js').ladeKern);
  for (const [name, schreib] of SCHREIBER) {
    assert.throws(() => schreib(V), (f) => f && f.code === 'fach-nur-lesen', name + ' wirft im nur lesenden Fach-Kontext');
  }
  // Das Nachtragen aus der Anfrage-Ansicht fängt den Wurf und meldet ihn zurück, statt zu schreiben.
  const r = V.anfrageFeldNachtragen('finance.companyPensionScheme', 'SELBST-GESCHRIEBEN');
  assert.equal(r.ok, false, 'anfrageFeldNachtragen schreibt nicht');
  assert.equal(r.meldung, 'fach-nur-lesen');
  assert.equal(JSON.stringify(V.getData()).includes('SELBST-GESCHRIEBEN'), false, 'nichts ist im Inhalt gelandet');
  const ds = V.anfrageAntwortDatensatz(ANFRAGE, { sensibel: true });
  assert.equal(JSON.stringify(ds).includes('SELBST-GESCHRIEBEN'), false, 'die Antwort an die Klinik trägt nichts Selbstgeschriebenes');
  assert.ok(JSON.stringify(ds).includes('WERT-DER-MUTTER-GESUNDHEIT'), 'Positivkontrolle: was im Fach steht, geht heraus');
});

test('[S7·Gegenprobe] mit eigenem Schlüssel wird voll bearbeitet — im eigenen Depot und in einem selbst angelegten Sub-Depot', async () => {
  const { V } = require('./load-kern.js').ladeKern();
  await V.depotAnlegen(PW_TOCHTER);
  V.akteurSelbstErklaeren('Anna Beispiel');
  V.sektorFeldSetzen('finance', 'companyPensionScheme', 'EIGENES-DEPOT');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Mama', inhaberin: 'Gerda', verwaltungsTyp: 'verwaltet' }, PW_MUTTER);
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW_MUTTER);
  V.subKontextBetreten(e.depotUUID);
  assert.equal(V.Modus.darfBearbeiten(), true);
  V.sektorFeldSetzen('finance', 'companyPensionScheme', 'IM-SUB-MIT-EIGENEM-SCHLUESSEL');
  assert.ok(JSON.stringify(V.getData()).includes('IM-SUB-MIT-EIGENEM-SCHLUESSEL'));
});

test('[S7·Rot-Beweis] ohne den Fach-Riegel im Bearbeitungstor schreibt die Vertretung wieder außerhalb ihres Umfangs', async () => {
  const original = fs.readFileSync(KERN, 'utf8');
  const anker = '  if (_subNurLesendAktiv) {\n    const fehler = new Error(\'fach-nur-lesen\');';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Riegel steht genau einmal im Kern');
  const tmp = path.join(os.tmpdir(), 's7-riegel-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, '  if (false) {\n    const fehler = new Error(\'fach-nur-lesen\');'));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const V = await fachKontext((o) => require('./load-kern.js').ladeKern(Object.assign({ backen: true }, o || {})));
    V.sektorFeldSetzen('finance', 'companyPensionScheme', 'SELBST-GESCHRIEBEN');
    const ds = V.anfrageAntwortDatensatz(ANFRAGE, { sensibel: true });
    assert.equal(JSON.stringify(ds).includes('SELBST-GESCHRIEBEN'), true, 'genau der Befund: der Wert geht an die Klinik');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.equal(fs.readFileSync(KERN, 'utf8'), original, 'die Probe darf den echten Kern nicht verändern');
});

/* Klassenwächter: das Versionstor allein (ohne Fach-Riegel) rufen nur die Speicherwege und das Bearbeitungstor selbst.
   Ein neuer Schreiber, der nur das Versionstor ruft, ginge am Fach-Riegel vorbei — er ist rot, bis er das Bearbeitungstor
   ruft oder hier begründet steht. */
const NUR_VERSIONSTOR = Object.freeze({
  depotSerialisieren: 'Speicherweg: die Tochter sichert ihr eigenes Depot, auch während sie im Fach liest',
  depotInDateiSichern: 'Speicherweg, wie oben',
  _bearbeitenErlaubtPruefen: 'das Bearbeitungstor selbst',
});
function ohneKommentare(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
}
function funktionenMit(src, muster) {
  const text = ohneKommentare(src);
  const re = /^(async )?function ([A-Za-z_$][\w$]*)\s*\(/gm;
  const liste = []; let m;
  while ((m = re.exec(text))) liste.push({ name: m[2], start: m.index });
  return liste.map((f, i) => ({ name: f.name, rumpf: text.slice(f.start, i + 1 < liste.length ? liste[i + 1].start : text.length) }))
    .filter((f) => muster.test(f.rumpf)).map((f) => f.name);
}
function nurVersionstorFremd(src) {
  return funktionenMit(src, /_schreibenErlaubtPruefen\(\)/).filter((n) => n !== '_schreibenErlaubtPruefen' && !NUR_VERSIONSTOR[n]);
}

test('[S7·Klasse] jeder Bearbeitungs-Schreiber ruft das Bearbeitungstor, nur die Speicherwege das Versionstor allein', () => {
  const kern = fs.readFileSync(KERN, 'utf8');
  assert.deepEqual(nurVersionstorFremd(kern), [], 'diese Funktionen rufen das Versionstor ohne den Fach-Riegel');
  const mitTor = funktionenMit(kern, /_bearbeitenErlaubtPruefen\(\)/);
  for (const n of ['urheberschaftAnhaengen', 'personHinzufuegen', 'personAktualisieren', 'personLoeschen']) {
    assert.ok(mitTor.includes(n), n + ' ruft das Bearbeitungstor');
  }
});

test('[S7·Klasse·Rot-Beweis] ein gepflanzter Schreiber, der nur das Versionstor ruft, wird gefunden', () => {
  const kern = fs.readFileSync(KERN, 'utf8');
  const gepflanzt = kern.replace('function _bearbeitenErlaubtPruefen() {',
    'function _gepflanzterSchreiber() {\n  _schreibenErlaubtPruefen();\n  data.x = 1;\n}\nfunction _bearbeitenErlaubtPruefen() {');
  assert.deepEqual(nurVersionstorFremd(gepflanzt), ['_gepflanzterSchreiber']);
});
