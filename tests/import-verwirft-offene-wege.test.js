'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund IMPORT-VERWIRFT-OHNE-ANZEIGE (11.10.2026) · die offenen Wege, je eine rote Probe am echten Pfad (04.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Klassenprobe (tests/import-anzeige-modell-klasse.test.js) führt in `OHNE_ERGEBNISOBJEKT` die Wege, die heute kein
   Ergebnis mit Grund liefern. Hier steht je Weg das Verhalten, das der Fix herstellen soll, als Probe gegen den Kern.
   Jede Probe trägt `todo`, solange der Weg offen ist: sie ist heute rot und hält die Suite nicht auf. Wer den Weg
   behebt, nimmt im selben Commit das `todo` und den Eintrag in `OHNE_ERGEBNISOBJEKT` heraus.

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
const TODO_A6 = 'IMPORT-VERWIRFT-OHNE-ANZEIGE A6 (Datenverlust): offen, Eigentümer Kern-Strang des Imports';

/* ── Der mutierte Kern für A6 ─────────────────────────────────────────── */
const NORMALISIEREN_KOPF = 'function depotNormalisieren(d) {';
const MARKE_WIRFT = " if (d && d.zzProbeMigrationWirft) throw new Error('zz-probe: die Migration wirft');";
let _mutiert = null;
function mutierterKernPfad() {
  if (_mutiert) return _mutiert;
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  if (quelle.split(NORMALISIEREN_KOPF).length !== 2) throw new Error('der Kopf von depotNormalisieren steht nicht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-offene-wege-'));
  process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* aufräumen */ } });
  _mutiert = path.join(dir, 'migration-wirft.html');
  fs.writeFileSync(_mutiert, quelle.replace(NORMALISIEREN_KOPF, NORMALISIEREN_KOPF + MARKE_WIRFT));
  return _mutiert;
}
const mutierterKern = () => ladeKern({ htmlPfad: mutierterKernPfad(), backen: true }).V;
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

test('[Offene Wege·A6·Voll-Depot] wirft die Migration, übernimmt das Einlesen nichts und nennt einen Grund', { todo: TODO_A6 }, () => {
  const V = mutierterKern();
  const text = JSON.stringify({ _typ: 'vivodepot-klartext-export', depot: altInhaltMitMarke() });
  const r = V.IMPORT_FORMAT_BY_ID.json.parse(text);
  assert.ok(r && typeof r.abgewiesen === 'string' && r.abgewiesen, 'ein Grund statt eines halb gehobenen Stands: ' + JSON.stringify(r && Object.keys(r)));
  assert.equal((r.felder || []).length, 0, 'keine Felder aus dem halb gehobenen Stand');
});

test('[Offene Wege·A6·Depot-Datei] wirft die Migration, öffnet die Datei nicht und nennt einen Grund', { todo: TODO_A6 }, async () => {
  const A = mutierterKern();
  await A.depotAnlegen(PW);
  A.setData(Object.assign(A.getData(), { schemaVersion: 80, zzProbeMigrationWirft: true }));
  const umschlag = JSON.parse(JSON.stringify(await A.depotSerialisieren()));
  const V = mutierterKern();
  const { grund } = await grundVon(() => V.depotLaden(umschlag, PW));
  assert.ok(grund, 'depotLaden nennt eine Kennung, statt den halb gehobenen Stand zu öffnen');
  assert.notEqual(V.oeffnenAbweisungText({ code: grund }), V.STRINGS.entsperrPasswortFalsch, 'und die Kennung heißt nicht falsches Passwort');
});

test('[Offene Wege·A6·Sub betreten] wirft die Migration, wird das Sub nicht betreten und ein Grund genannt', { todo: TODO_A6 }, async () => {
  const V = mutierterKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tochter Probe');
  const umschlag = await V.subDepotVersiegeln(altInhaltMitMarke(), SUB_PW);
  const e = V.subDepotEinhaengen(V.depotDateiAusUmschlag(umschlag), { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Probe' });
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  const { grund } = await grundVon(() => V.subKontextBetreten(e.depotUUID));
  assert.ok(grund, 'subKontextBetreten nennt eine Kennung');
  assert.equal(V.imSubKontext(), false, 'der halb gehobene Stand wird nicht betreten');
});

test('[Offene Wege·A4] ein Voll-Depot aus einer neueren Fassung wird mit Grund abgewiesen, keine Felder', { todo: 'IMPORT-VERWIRFT-OHNE-ANZEIGE A4: offen, Eigentümer Kern-Strang des Imports' }, () => {
  const { V } = ladeKern();
  const text = JSON.stringify({ _typ: 'vivodepot-klartext-export',
    depot: { schemaVersion: V.SCHEMA_VERSION_AKTUELL + 1, sektoren: { identity: { givenName: 'ZZ-Probe' } }, menschen: [] } });
  const r = V.IMPORT_FORMAT_BY_ID.json.parse(text);
  assert.ok(r && typeof r.abgewiesen === 'string' && r.abgewiesen, 'ein Grund „zu neu“: ' + JSON.stringify(r && Object.keys(r)));
  assert.equal((r.felder || []).length, 0);
});

test('[Offene Wege·A5] eine nicht übernommene FHIR-Ressource steht als verworfen im Ergebnis', { todo: 'IMPORT-VERWIRFT-OHNE-ANZEIGE A5: offen, Eigentümer Kern-Strang des Imports' }, () => {
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
function dropAufzeichnen(quelle, name) {
  const gerufen = [];
  const rec = (was) => (...a) => { gerufen.push(was); return a[0]; };
  const ui = { toast: rec('ui.toast'), meldung: rec('ui.meldung') };
  const fn = new Function('renderCryptoOverlay', 'zeigeFehler', 'ui', 'vorDepotText', 'STRINGS', 'return ' + dropListener(quelle))(
    rec('renderCryptoOverlay'), rec('zeigeFehler'), ui, (k) => k, new Proxy({}, { get: (_, k) => String(k) }));
  fn({ preventDefault() {}, dataTransfer: { files: [{ name }] } });
  return gerufen;
}

test('[Offene Wege·A8·Gegenprobe] der drop-Listener wird aus dem Kern gelesen und öffnet eine .vivodepot-Datei', () => {
  assert.deepEqual(dropAufzeichnen(fs.readFileSync(KERN_PFAD, 'utf8'), 'zz-probe.vivodepot'), ['renderCryptoOverlay']);
});

test('[Offene Wege·A8] eine fallengelassene Datei mit anderer Endung ergibt eine Meldung', { todo: 'IMPORT-VERWIRFT-OHNE-ANZEIGE A8: offen, Eigentümer Kern-Strang des Imports' }, () => {
  const gerufen = dropAufzeichnen(fs.readFileSync(KERN_PFAD, 'utf8'), 'zz-probe-notiz.txt');
  assert.ok(gerufen.some((g) => g !== 'renderCryptoOverlay'), 'eine Meldung statt Stille: ' + JSON.stringify(gerufen));
});

test('[Offene Wege·Einhängen] ein ungültiger Umschlag ergibt einen Grund als Kennung statt Freitext', { todo: 'IMPORT-VERWIRFT-OHNE-ANZEIGE sub-depot-einhaengen: offen, Eigentümer Kern-Strang des Imports' }, async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tochter Probe');
  const datei = Object.assign(V.depotDateiAusUmschlag(await V.subDepotVersiegeln({ sektoren: {} }, SUB_PW)), { kryptoVersion: 99 });
  const vorher = (V.getData().verwalteteDepots || []).length;
  const { grund, wurf } = await grundVon(() => V.subDepotEinhaengen(datei, { bezeichnung: 'X', inhaberin: 'X' }));
  assert.equal((V.getData().verwalteteDepots || []).length, vorher, 'Gegenprobe: nichts eingehängt');
  assert.ok(wurf || grund, 'Gegenprobe: der Weg weist ab');
  assert.ok(grund, 'eine Kennung, nicht nur: ' + String(wurf && wurf.message));
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

test('[Offene Wege·Autoritativ] ein abgelegtes Dokument heißt angenommen, eine Abweisung nennt ihren Grund', { todo: 'IMPORT-VERWIRFT-OHNE-ANZEIGE autoritatives-dokument (HOCH): offen, Eigentümer Kern-Strang des Imports' }, async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const aus = falschGelesen(V.importAnzeigeModell('autoritatives-dokument', V.importAutoritativDokument(HDR_TEXT())), true)
    .concat(falschGelesen(V.importAnzeigeModell('autoritatives-dokument', V.importAutoritativDokument('{ zz-probe kein json')), false));
  assert.deepEqual(aus, []);
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

test('[Offene Wege·B16] eine übernommene Beta-Datei heißt angenommen, eine unlesbare nennt ihren Grund', { todo: 'IMPORT-VERWIRFT-OHNE-ANZEIGE b16-migration (HOCH): offen, Eigentümer Kern-Strang des Imports' }, async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Probe');
  const plan = V.importPlan('vivodepot-beta', BETA_TEXT);
  const aus = falschGelesen(V.importAnzeigeModell('b16-migration', plan), true)
    .concat(falschGelesen(V.importAnzeigeModell('b16-migration', V.importAnwenden(plan, {})), true))
    .concat(falschGelesen(V.importAnzeigeModell('b16-migration', V.importPlan('vivodepot-beta', '{ zz-probe kein json')), false));
  assert.deepEqual(aus, []);
});
