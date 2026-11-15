'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund IMPORT-VERWIRFT-OHNE-ANZEIGE (11.10.2026) · die offenen Wege, je eine rote Probe am echten Pfad (04.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Klassenprobe (tests/import-anzeige-modell-klasse.test.js) führt in `OHNE_ERGEBNISOBJEKT` die Wege, die heute kein
   Ergebnis mit Grund liefern. Hier steht je Weg das Verhalten, das der Fix herstellen soll, als Probe gegen den Kern.
   Jede Probe trägt `todo`, solange der Weg offen ist: sie ist heute rot und hält die Suite nicht auf. Wer den Weg
   behebt, nimmt im selben Commit das `todo` und den Eintrag in `OHNE_ERGEBNISOBJEKT` heraus.

   A6 und A8 sind gebaut (07.11.2026); ihre Proben tragen kein todo mehr. A6 öffnet nur lesend, siehe die Proben unten.
   Eigentümer der Fixe: der Kern-Strang des Imports. A6 zuerst, weil dort ein halb gehobener Stand eingelesen wird
   und beim nächsten Speichern Daten verloren gehen können.

   Verlangt wird je Weg nur das Beobachtbare, keine Form des Fixes:
     A6 ×3   Wirft die Migration, wird nichts eingelesen, und der Weg nennt einen Grund als Kennung.
     A4      Ein Voll-Depot mit neuerer schemaVersion wird mit einem Grund abgewiesen; es werden keine Felder übernommen.
     A5      Eine Ressource des FHIR-Bundles, die der Leser nicht übernimmt, steht als verworfen im Ergebnis.
     A8      Eine fallengelassene Datei mit anderer Endung ergibt eine Meldung.
     Einhängen  Ein ungültiger Umschlag ergibt einen Grund als Kennung statt Freitext.

   A6 lässt die Migration über eine Marke im Inhalt werfen (`zzProbeMigrationWirft`). Die Marke wirkt nur in einer
   mutierten Kopie des Kerns; die Gegenprobe ohne `todo` hält, dass die Mutation greift.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'zz-probe-offene-Wege-Passwort-4';
const SUB_PW = 'zz-probe-offene-Wege-Sub-Passwort-4';

/* ── Der mutierte Kern für A6 ─────────────────────────────────────────── */
const NORMALISIEREN_KOPF = 'function depotNormalisieren(d) {';
const MARKE_WIRFT = " if (d && d.zzProbeMigrationWirft) throw new Error('zz-probe: die Migration wirft');";
const _mutiert = new Map();
/* `aendern` (nur für den Rot-Beweis): nimmt den Kerntext und gibt ihn verändert zurück, bevor die Marke eingesetzt wird. */
function mutierterKernPfad(aendern) {
  const schluessel = aendern ? aendern.name || 'geaendert' : 'heute';
  if (_mutiert.has(schluessel)) return _mutiert.get(schluessel);
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  if (quelle.split(NORMALISIEREN_KOPF).length !== 2) throw new Error('der Kopf von depotNormalisieren steht nicht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-offene-wege-'));
  process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* aufräumen */ } });
  const pfad = path.join(dir, 'migration-wirft.html');
  fs.writeFileSync(pfad, (aendern ? aendern(quelle) : quelle).replace(NORMALISIEREN_KOPF, NORMALISIEREN_KOPF + MARKE_WIRFT));
  _mutiert.set(schluessel, pfad);
  return pfad;
}
const mutierterKern = (aendern) => ladeKern({ htmlPfad: mutierterKernPfad(aendern), backen: true }).V;
const { ohneZurueckholen } = require('./import-a6-helfer.js');
const NUR_LESEN = (e) => e && e.code === 'migration-fehler-nur-lesen';
const altInhaltMitMarke = () => ({ schemaVersion: 80, zzProbeMigrationWirft: true,
  sektoren: { identitaet: { vorname: 'Hedwig' } }, menschen: [], institutionen: [] });

/* Der Grund, den ein Weg nennt: die Kennung eines Wurfs (`code`) oder der Grund eines Rückgabeobjekts. */
async function grundVon(fn) {
  try {
    const r = await fn();
    if (r && typeof r === 'object') {
      for (const k of ['abgewiesen', 'grund']) if (typeof r[k] === 'string' && r[k]) return { grund: r[k], r };
    }
    return { grund: null, r };
  } catch (e) {
    return { grund: (e && typeof e.code === 'string' && e.code) ? e.code : null, wurf: e };
  }
}

test('[Offene Wege·A6·Gegenprobe] im mutierten Kern wirft die Migration genau bei der Marke', () => {
  const V = mutierterKern();
  assert.throws(() => V.depotNormalisieren(altInhaltMitMarke()), /zz-probe: die Migration wirft/);
  const ohne = altInhaltMitMarke(); delete ohne.zzProbeMigrationWirft;
  assert.doesNotThrow(() => V.depotNormalisieren(ohne));
});

/* A6 ist gebaut (Commit 1ebfcf6d1, „fix(import): ein Wurf der Migration liest den halb gehobenen Stand nicht mehr still ein
   (A6)“; Plan und Entscheidung vom 07.11.2026, interner Bericht). Gebaut wurde: Datei und Sub öffnen
   den Stand vor der Migration NUR LESEND, mit dem Grund migration-fehler; „Ganzes Depot“ lehnt mit diesem Grund ab. Die
   drei Proben halten genau das; der Rot-Beweis nimmt das Zurückholen aus _migrationVersuchen heraus
   (tests/import-a6-helfer.js#ohneZurueckholen, wie in tests/import-a6-migrationswurf.test.js). */
async function a6VollDepot(V) {
  const text = JSON.stringify({ _typ: 'vivodepot-klartext-export', depot: altInhaltMitMarke() });
  return grundVon(() => V.IMPORT_FORMAT_BY_ID.json.parse(text));
}
async function a6DepotDatei(V) {
  const A = mutierterKern();
  await A.depotAnlegen(PW);
  const personId = A.personHinzufuegen({ name: 'Hedwig Probe', birthDate: '1940-01-01' });
  A.setData(Object.assign(A.getData(), { schemaVersion: 80, zzProbeMigrationWirft: true }));
  const umschlag = JSON.parse(JSON.stringify(await A.depotSerialisieren()));
  await V.depotLaden(umschlag, PW);
  return personId;
}
async function a6SubBetreten(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tochter Probe');
  const umschlag = await V.subDepotVersiegeln(altInhaltMitMarke(), SUB_PW);
  const e = V.subDepotEinhaengen(V.depotDateiAusUmschlag(umschlag), { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Probe' });
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
}

test('[Offene Wege·A6·Voll-Depot] wirft die Migration, übernimmt das Einlesen nichts und nennt den Grund migration-fehler', async () => {
  const { grund, r } = await a6VollDepot(mutierterKern());
  assert.equal(grund, 'migration-fehler', 'ein Grund statt eines halb gehobenen Stands: ' + JSON.stringify(r && Object.keys(r)));
  assert.equal((r.felder || []).length, 0, 'keine Felder aus dem halb gehobenen Stand');
});

test('[Offene Wege·A6·Depot-Datei] wirft die Migration, öffnet die Datei nur lesend und nennt den Grund migration-fehler', async () => {
  const V = mutierterKern();
  const personId = await a6DepotDatei(V);
  assert.equal(V.migrationFehlerErgebnis().grund, 'migration-fehler');
  assert.equal(V.getData().zzProbeMigrationWirft, true, 'es gilt der Stand vor der Migration');
  assert.equal(V.neuereFassungNurLesen(), true, 'nur lesend');
  assert.throws(() => V.personAktualisieren(personId, { birthDate: '1960-01-01' }), NUR_LESEN);
  assert.ok(V.STRINGS.migrationFehlerNurLesenText && V.STRINGS.migrationFehlerNurLesenText !== V.STRINGS.entsperrPasswortFalsch,
    'der Hinweis hat einen eigenen Satz, nicht den für ein falsches Passwort');
});

test('[Offene Wege·A6·Sub betreten] wirft die Migration, ist das Sub nur lesend und der Grund migration-fehler genannt', async () => {
  const V = mutierterKern();
  await a6SubBetreten(V);
  assert.equal(V.migrationFehlerErgebnis().grund, 'migration-fehler');
  assert.equal(V.neuereFassungNurLesen(), true, 'im Sub liest der Kern nur');
  assert.throws(() => V.sektorFeldSetzen('identity', 'givenName', 'Ada'), NUR_LESEN);
});

test('[Offene Wege·A6·Rot-Beweis] ohne das Zurückholen in _migrationVersuchen nennt keiner der drei Wege einen Grund', async () => {
  const voll = await a6VollDepot(mutierterKern(ohneZurueckholen));
  assert.notEqual(voll.grund, 'migration-fehler', '„Ganzes Depot“ liest die Datei ein');
  const D = mutierterKern(ohneZurueckholen);
  await a6DepotDatei(D);
  assert.equal(D.migrationFehlerErgebnis(), null, 'die Datei öffnet ohne Ergebnis eines Wurfs');
  assert.equal(D.neuereFassungNurLesen(), false, 'und beschreibbar');
  const S = mutierterKern(ohneZurueckholen);
  await a6SubBetreten(S);
  assert.equal(S.migrationFehlerErgebnis(), null, 'das Sub ohne Ergebnis eines Wurfs');
  assert.equal(S.neuereFassungNurLesen(), false, 'und beschreibbar');
});

test('[Offene Wege·A4] ein Voll-Depot aus einer neueren Fassung wird mit Grund abgewiesen, keine Felder', () => {
  const { V } = ladeKern();
  const text = JSON.stringify({ _typ: 'vivodepot-klartext-export',
    depot: { schemaVersion: V.SCHEMA_VERSION_AKTUELL + 1, sektoren: { identity: { givenName: 'ZZ-Probe' } }, menschen: [] } });
  const r = V.IMPORT_FORMAT_BY_ID.json.parse(text);
  assert.ok(r && typeof r.abgewiesen === 'string' && r.abgewiesen, 'ein Grund „zu neu“: ' + JSON.stringify(r && Object.keys(r)));
  assert.equal((r.felder || []).length, 0);
  // Die Person liest den Satz „zu neu“, nicht „ungültig“: der Plan trägt den Grund, die Meldung folgt ihm.
  const plan = V.importPlan('json', text);
  assert.equal(plan.ungueltig, true);
  assert.equal(V.importUngueltigNachricht(plan), V.STRINGS.importZuNeu);
  assert.equal(V.importAnzeigeModell('voll-depot-json', plan).zuNeu, true);
});

test('[Offene Wege·A4·Rot-Beweis] ohne das Tor liest der Einleser die Felder der neueren Fassung', () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const TOR = "  if (typeof d.schemaVersion === 'number' && d.schemaVersion > SCHEMA_VERSION_AKTUELL) return { abgewiesen: 'depot-zu-neu' };\n";
  assert.equal(quelle.split(TOR).length, 2, 'das Tor steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'offene-wege-a4-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(TOR, ''));
    const { V } = ladeKern({ htmlPfad: pfad, backen: true });
    const text = JSON.stringify({ _typ: 'vivodepot-klartext-export',
      depot: { schemaVersion: V.SCHEMA_VERSION_AKTUELL + 1, sektoren: { identity: { givenName: 'ZZ-Probe' } }, menschen: [] } });
    const r = V.IMPORT_FORMAT_BY_ID.json.parse(text);
    assert.equal(r && r.abgewiesen, undefined, 'ohne Tor kein Grund');
    assert.ok((r.felder || []).length > 0, 'ohne Tor werden Felder übernommen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Offene Wege·A5] eine nicht übernommene FHIR-Ressource steht als verworfen im Ergebnis', () => {
  const { V } = ladeKern();
  const bundle = { resourceType: 'Bundle', type: 'document', entry: [
    { resource: { resourceType: 'Patient', name: [{ family: 'Probe', given: ['Zora'] }] } },
    { resource: { resourceType: 'Device', id: 'zz-probe-geraet' } },
  ] };
  const r = V.IMPORT_FORMAT_BY_ID['fhir-ips'].parse(JSON.stringify(bundle));
  assert.ok(r && Array.isArray(r.felder) && r.felder.length > 0, 'Gegenprobe: der Patient wird gelesen');
  const verworfen = Array.isArray(r.verworfene) ? r.verworfene : [];
  assert.ok(verworfen.some((v) => v && /Device/.test(String(v.name || v.was || '')) && typeof v.grund === 'string'),
    'die Ressource Device steht mit Grund unter verworfene: ' + JSON.stringify(r.verworfene));
  assert.ok(!verworfen.some((v) => v && v.name === 'Patient'), 'der gelesene Patient steht nicht unter verworfene');
});

test('[Offene Wege·A5·Gründe] zweiter Patient, Eintrag ohne Text und der Aufbau des Dokuments', () => {
  const { V } = ladeKern();
  const bundle = { resourceType: 'Bundle', type: 'document', entry: [
    { resource: { resourceType: 'Composition', title: 'zz-probe' } },
    { resource: { resourceType: 'Patient', name: [{ family: 'Probe', given: ['Zora'] }] } },
    { resource: { resourceType: 'Patient', name: [{ family: 'Probe', given: ['Zweit'] }] } },
    { resource: { resourceType: 'Condition', code: {} } },
    { resource: { resourceType: 'Device' } }, { resource: { resourceType: 'Device' } },
  ] };
  const r = V.IMPORT_FORMAT_BY_ID['fhir-ips'].parse(JSON.stringify(bundle));
  const kurz = r.verworfene.map((v) => v.name + ':' + v.grund + ':' + v.anzahl).sort();
  assert.deepEqual(kurz, ['Device:ressource-nicht-gelesen:2', 'Patient:weiterer-patient:1']);
  assert.equal(r.verworfeneFelder.length, 1, 'der Eintrag ohne Text steht genau einmal, beim Feld');
  assert.equal(r.verworfeneFelder[0].grund, 'nicht-lesbar');
});

test('[Offene Wege·A5·Rot-Beweis] mit dem früheren Einleser stünde nichts unter verworfene', () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const NEU = "return { angenommen: felder.length > 0, felder, verworfene: _fhirIpsVerworfene(o), verworfeneFelder, quelle: _fhirIpsQuelle(o) }; } },";
  assert.equal(quelle.split(NEU).length, 2, 'die Rückgabe steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'offene-wege-a5-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(NEU, 'return { felder, verworfeneFelder, quelle: _fhirIpsQuelle(o) }; } },'));
    const { V } = ladeKern({ htmlPfad: pfad, backen: true });
    const r = V.IMPORT_FORMAT_BY_ID['fhir-ips'].parse(JSON.stringify({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Device' } }] }));
    assert.equal(r.verworfene, undefined);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* A8: der drop-Listener steht anonym in booteEingang. Die Probe nimmt seinen Text aus dem Kern und ruft ihn mit
   Aufzeichnern für jede Meldungsform, die der Kern kennt. */
function dropListener(quelle) {
  const kopf = "ov.addEventListener('drop', (e) => {";
  const a = quelle.indexOf(kopf);
  if (a < 0 || quelle.indexOf(kopf, a + 1) >= 0) throw new Error('der drop-Listener steht nicht genau einmal im Kern');
  let tiefe = 0, i = a + kopf.length - 1;
  for (; i < quelle.length; i++) {
    if (quelle[i] === '{') tiefe++;
    else if (quelle[i] === '}' && --tiefe === 0) break;
  }
  return quelle.slice(a + "ov.addEventListener('drop', ".length, i + 1);
}
/* Die Helfer, die der Listener ruft, kommen wörtlich aus dem Kern (seit A8); fehlt einer, bleibt der Listener ohne sie. */
function kernTeil(quelle, kopf) {
  const a = quelle.indexOf(kopf);
  if (a < 0) return '';
  if (kopf.startsWith('const ')) return quelle.slice(a, quelle.indexOf('\n', a) + 1);
  let tiefe = 0, i = quelle.indexOf('{', a);
  for (; i < quelle.length; i++) {
    if (quelle[i] === '{') tiefe++;
    else if (quelle[i] === '}' && --tiefe === 0) break;
  }
  return quelle.slice(a, i + 1) + '\n';
}
function dropAufzeichnen(quelle, name) {
  const gerufen = [];
  const rec = (was) => (...a) => { gerufen.push(was); return a[0]; };
  const ui = { toast: rec('ui.toast'), meldung: rec('ui.meldung') };
  const helfer = ['const DATEI_OEFFNEN_MIT_ENDUNG', 'function dateiOeffnenMitPruefen(', 'function dateiOeffnenMitUebergeben(']
    .map((k) => kernTeil(quelle, k)).join('');
  const fn = new Function('renderCryptoOverlay', 'zeigeFehler', 'ui', 'vorDepotText', 'STRINGS', 'importAnzeigeZeigen', 'importAnzeigeText', 'importAnzeigeModell',
    helfer + 'return ' + dropListener(quelle))(
    rec('renderCryptoOverlay'), rec('zeigeFehler'), ui, (k) => k, new Proxy({}, { get: (_, k) => String(k) }),
    rec('importAnzeigeZeigen'), () => 'zz-probe-text', (art, erg) => erg);
  fn({ preventDefault() {}, dataTransfer: { files: [{ name }] } });
  return gerufen;
}

test('[Offene Wege·A8·Gegenprobe] der drop-Listener wird aus dem Kern gelesen und öffnet eine .vivodepot-Datei', () => {
  assert.deepEqual(dropAufzeichnen(fs.readFileSync(KERN_PFAD, 'utf8'), 'zz-probe.vivodepot'), ['renderCryptoOverlay']);
});

test('[Offene Wege·A8] eine fallengelassene Datei mit anderer Endung ergibt eine Meldung', () => {
  const gerufen = dropAufzeichnen(fs.readFileSync(KERN_PFAD, 'utf8'), 'zz-probe-notiz.txt');
  assert.ok(gerufen.some((g) => g !== 'renderCryptoOverlay'), 'eine Meldung statt Stille: ' + JSON.stringify(gerufen));
  assert.ok(!gerufen.includes('renderCryptoOverlay'), 'die Datei wird nicht als Depot geöffnet');
});

test('[Offene Wege·A8·Rot-Beweis] mit dem früheren Listener bliebe die fallengelassene Datei ohne Meldung', () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const NEU = "          if (!f) return;\n          const zeigen = () => renderCryptoOverlay(f);\n          // A8: eine Datei mit anderer Endung wird genannt, nicht still übergangen.\n          dateiOeffnenMitUebergeben(dateiOeffnenMitPruefen(f), zeigen);\n";
  const ALT = "          if (f && /\\.(vivodepot|json)$/i.test(f.name || '')) renderCryptoOverlay(f);\n";
  assert.equal(quelle.split(NEU).length, 2, 'der heutige Listener steht genau einmal im Kern');
  assert.deepEqual(dropAufzeichnen(quelle.replace(NEU, ALT), 'zz-probe-notiz.txt'), []);
});

test('[Offene Wege·Einhängen] ein ungültiger Umschlag ergibt einen Grund als Kennung statt Freitext', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tochter Probe');
  const datei = Object.assign(V.depotDateiAusUmschlag(await V.subDepotVersiegeln({ sektoren: {} }, SUB_PW)), { kryptoVersion: 99 });
  const vorher = (V.getData().verwalteteDepots || []).length;
  const { grund, wurf } = await grundVon(() => V.subDepotEinhaengen(datei, { bezeichnung: 'X', inhaberin: 'X' }));
  assert.equal((V.getData().verwalteteDepots || []).length, vorher, 'Gegenprobe: nichts eingehängt');
  assert.ok(wurf || grund, 'Gegenprobe: der Weg weist ab');
  assert.ok(grund, 'eine Kennung, nicht nur: ' + String(wurf && wurf.message));
  assert.equal(grund, 'krypto-fassung', 'ein Umschlag einer fremden Krypto-Fassung');
});

test('[Offene Wege·Einhängen·Gründe] kein Umschlag, eine verletzte Form und ein schon verwaltetes Depot', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tochter Probe');
  const gut = V.depotDateiAusUmschlag(await V.subDepotVersiegeln({ sektoren: {} }, SUB_PW));
  const kaputt = Object.assign({}, gut, { depotUUID: 'zz-probe-keine-uuid' });
  assert.equal((await grundVon(() => V.subDepotEinhaengen({ zz: 'probe' }, { bezeichnung: 'X', inhaberin: 'X' }))).grund, 'keine-depot-datei');
  assert.equal((await grundVon(() => V.pruefeBlackboxUmschlag(kaputt))).grund, 'umschlag-form');
  V.subDepotEinhaengen(gut, { bezeichnung: 'X', inhaberin: 'X' });
  assert.equal((await grundVon(() => V.subDepotEinhaengen(gut, { bezeichnung: 'Y', inhaberin: 'Y' }))).grund, 'bereits-verwaltet');
});

test('[Offene Wege·Einhängen·Rot-Beweis] ohne Kennung am Wurf bliebe nur der Text', async () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const KENNUNG = '  e.code = code;\n  return e;\n';
  assert.equal(quelle.split(KENNUNG).length, 2, 'die Kennung wird an genau einer Stelle gesetzt');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'offene-wege-einh-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(KENNUNG, '  return e;\n'));
    const { V } = ladeKern({ htmlPfad: pfad, backen: true });
    await V.depotAnlegen(PW);
    V.akteurSelbstErklaeren('Tochter Probe');
    const { grund, wurf } = await grundVon(() => V.subDepotEinhaengen({ zz: 'probe' }, { bezeichnung: 'X', inhaberin: 'X' }));
    assert.ok(wurf, 'der Weg weist weiter ab');
    assert.equal(grund, null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Autoritatives Dokument (Wort vom 04.11.2026, HOCH im selben Befund): importAutoritativDokument liefert null oder die
   Kennung des Mappe-Eintrags. Das Anzeige-Modell liest einen Erfolg darum als Abweisung — eine falsche Aussage. */
function falschGelesen(modell, erfolg) {
  if (!modell || typeof modell !== 'object') return ['kein Modell'];
  const aus = [];
  if (erfolg && modell.abgewiesen != null) aus.push('ein Erfolg heißt abgewiesen: ' + modell.abgewiesen);
  if (erfolg && !modell.angenommen) aus.push('ein Erfolg heißt nicht angenommen');
  if (!erfolg && (modell.abgewiesen == null || modell.abgewiesen === 'kein-ergebnis' || modell.abgewiesen === 'abgewiesen')) aus.push('eine Abweisung ohne eigenen Grund: ' + modell.abgewiesen);
  return aus;
}
const HDR_TEXT = () => fs.readFileSync(path.join(__dirname, 'fixtures', 'eigenprobe-eu-hdr.json'), 'utf8');

test('[Offene Wege·Autoritativ·Rot-Beweis] die Prüfung erkennt einen als abgewiesen gelesenen Erfolg und lässt ein richtiges Modell durch', () => {
  assert.equal(falschGelesen({ angenommen: 0, abgewiesen: 'kein-ergebnis' }, true).length, 2);
  assert.equal(falschGelesen({ angenommen: 0, abgewiesen: 'kein-ergebnis' }, false).length, 1);
  assert.deepEqual(falschGelesen({ angenommen: 1, abgewiesen: null }, true), []);
  assert.deepEqual(falschGelesen({ angenommen: 0, abgewiesen: 'zz-probe-grund' }, false), []);
  assert.equal(falschGelesen({ angenommen: 0, abgewiesen: 'abgewiesen' }, false).length, 1, 'der Ersatzgrund des Modells ist kein eigener Grund');
});

test('[Offene Wege·Autoritativ·Gegenprobe] die Eigenprobe wird als autoritatives Dokument abgelegt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.ok(V.importAutoritativDokument(HDR_TEXT()), 'der Weg geht auf');
});

test('[Offene Wege·Autoritativ] ein abgelegtes Dokument heißt angenommen, eine Abweisung nennt ihren Grund', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const aus = falschGelesen(V.importAnzeigeModell('autoritatives-dokument', V.importAutoritativDokument(HDR_TEXT())), true)
    .concat(falschGelesen(V.importAnzeigeModell('autoritatives-dokument', V.importAutoritativDokument('{ zz-probe kein json')), false));
  assert.deepEqual(aus, []);
  assert.equal(V.importAnzeigeModell('autoritatives-dokument', null).abgewiesen, 'nicht-erkannt');
});

test('[Offene Wege·Autoritativ·Rot-Beweis am Kern] ohne die Lesart hieße ein abgelegtes Dokument „kein Ergebnis“', async () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const LESART = "  if (art === 'autoritatives-dokument' && (typeof ergebnis === 'string' || ergebnis === null)) {\n";
  assert.equal(quelle.split(LESART).length, 2, 'die Lesart steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'offene-wege-autoritativ-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(LESART, "  if (false) {\n"));
    const { V } = ladeKern({ htmlPfad: pfad, backen: true });
    await V.depotAnlegen(PW);
    assert.ok(falschGelesen(V.importAnzeigeModell('autoritatives-dokument', V.importAutoritativDokument(HDR_TEXT())), true).length > 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* b16-migration (Wort vom 04.11.2026, HOCH im selben Befund): Plan und Anwende-Ergebnis tragen weder ok noch grund. */
const BETA_TEXT = JSON.stringify({ __fokus__: 1, bundid_email: 'zz-probe@example.org', typeOfFuneral: 'Erdbestattung' });

test('[Offene Wege·B16·Gegenprobe] eine Beta-Datei ergibt einen gültigen Plan, und das Anwenden übernimmt ihn', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Probe');
  const plan = V.importPlan('vivodepot-beta', BETA_TEXT);
  assert.equal(plan.ungueltig, false);
  assert.ok(plan.zeilen.length > 0, 'der Plan trägt Zeilen');
  assert.ok(V.importAnwenden(plan, {}), 'das Anwenden liefert ein Ergebnis');
});

test('[Offene Wege·B16] eine übernommene Beta-Datei heißt angenommen, eine unlesbare nennt ihren Grund', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Probe');
  const plan = V.importPlan('vivodepot-beta', BETA_TEXT);
  const aus = falschGelesen(V.importAnzeigeModell('b16-migration', plan), true)
    .concat(falschGelesen(V.importAnzeigeModell('b16-migration', V.importAnwenden(plan, {})), true))
    .concat(falschGelesen(V.importAnzeigeModell('b16-migration', V.importPlan('vivodepot-beta', '{ zz-probe kein json')), false));
  assert.deepEqual(aus, []);
});

test('[Offene Wege·B16·Rot-Beweis am Kern] ohne die Lesart hieße eine übernommene Beta-Datei abgewiesen', async () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const LESART = "  } else if (art === 'b16-migration' && (typeof e.gesetzt === 'number' || (Array.isArray(e.zeilen) && typeof e.ungueltig === 'boolean'))) {\n";
  assert.equal(quelle.split(LESART).length, 2, 'die Lesart steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'offene-wege-b16-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(LESART, "  } else if (false) {\n"));
    const { V } = ladeKern({ htmlPfad: pfad, backen: true });
    await V.depotAnlegen(PW);
    V.akteurSelbstErklaeren('Probe');
    const plan = V.importPlan('vivodepot-beta', BETA_TEXT);
    assert.ok(falschGelesen(V.importAnzeigeModell('b16-migration', plan), true).length > 0);
    assert.ok(falschGelesen(V.importAnzeigeModell('b16-migration', V.importAnwenden(plan, {})), true).length > 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
