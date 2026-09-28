'use strict';
/* TOR-IN-DER-DEFINITION (HOCH, 26.09.2026) — die Klasse hinter DATENSATZ-ROH (25.09.): von 18 Assistenten-Schritten mit `verborgenWenn`
   hatten 18 kein Gegenstück in der Felddefinition. Das Tor stand NUR im Assistenten (PV_VERBORGEN_WENN und das KI-Tor im Kern, drei
   Schritte im Ab-Werk-Modul der Wizards); Listen-Editor, Datensatz, Export und Sub-Depot kannten es nicht. Der Zwischenfix v799 las es
   für den Datensatz aus WIZARDS — eine Quelle, aber am falschen Ort.
   Jetzt steht jedes Tor als `verborgenWenn` an der Definition des Felds (Bereichs-Template bzw. Unterfeld der Ziel-Liste; für die
   PV-Felder, die keine Bereichsdefinition haben, das Feld im Dokumentmodul), und der Assistent liest es von dort (`wizardSchrittTor`).

   G4  kein Assistenten-Schritt trägt ein eigenes Tor; jedes Tor, das ein Assistent anwendet, kommt aus der Definition
   G1  `vollExportJSON` hat im Kern keinen Aufrufer (der offene JSON-Vollexport kehrt nicht zurück, U2-ADR-NNN vom 17.09.)
   G2  jede Senke ist eingeordnet (tools/ausgabewege-pruefen.js, seit heute auch QR, Zwischenablage, postMessage); hier dazu der Beleg,
       dass die eine postMessage keine Depot-Daten trägt */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

// Die 18 Tore vom 25.09., je Wizard und Feld — die Liste, die die Inhaberin vor der Signierung liest.
const TORE = Object.freeze({
  pvwiz: ['whoseViewMattersOtherPersonName', 'whoseViewMattersIfDeviatingOther', 'priorityIfOrganDonationConflict', 'validityDurationDeadline'],
  kiwiz: ['purpose', 'authorizedParties', 'namedIndividuals', 'scope', 'permittedDataTypes', 'timeLimit', 'numberOfYears', 'date',
    'behaviouralLimit', 'digitalEstateAdministration', 'digitalEstateAdministration2'],
  pflwiz: ['longTermCareAllowanceAmount'],
  umzwiz: ['tenancyTerminationHandover', 'noticeDate'],
});

async function kern() {
  const { V } = ladeKern();
  await V.depotAnlegen('tor-in-der-definition-pw-2026');
  V.akteurSelbstErklaeren('Gertrud Beispiel');
  return V;
}
function schritteMitTor(V) {
  const raus = {};
  for (const w of V.WIZARDS) for (const s of (w.schritte || [])) {
    if (V.wizardSchrittTor(w, s)) (raus[w.id] = raus[w.id] || []).push(s.feld.id);
  }
  return raus;
}

/* Ein Schritt-Tor im Quelltext: ein Objekt-Literal mit `verborgenWenn:` im Bau eines Schritts. Erkannt an den beiden Bauformen, die es
   gab — die Zuordnung `verborgenWenn: {` in einem Schritt-Literal und die Tabelle, aus der Schritte ihr Tor zogen. */
function schrittToreImQuelltext(text) {
  const funde = [];
  const muster = [/\{\s*verborgenWenn:\s*[{A-Z_]/g, /PV_VERBORGEN_WENN\s*=/g, /verborgenWenn:\s*PV_VERBORGEN_WENN/g];
  for (const m of muster) for (const x of String(text).matchAll(m)) funde.push(x[0]);
  return funde;
}
function schrittToreImModul(json) {
  const funde = [];
  for (const [id, w] of Object.entries((json && json.wizards) || {})) {
    for (const s of (w.schritte || [])) if (s && s.verborgenWenn) funde.push(id + '.' + (s.feld && s.feld.id));
  }
  return funde;
}

test('[G4] die 18 Tore kommen aus der Definition — genau diese, je Wizard', async () => {
  const V = await kern();
  assert.deepEqual(schritteMitTor(V), TORE);
});

test('[G4] kein Assistenten-Schritt trägt ein eigenes Tor — weder zur Laufzeit noch im Kern noch im Ab-Werk-Modul', async () => {
  const V = await kern();
  const eigene = [];
  for (const w of V.WIZARDS) for (const s of (w.schritte || [])) if (s && s.verborgenWenn) eigene.push(w.id + '.' + s.feld.id);
  assert.deepEqual(eigene, []);
  assert.deepEqual(schrittToreImQuelltext(KERN), []);
  for (const rel of ['tests/fixtures/buergermodul-wizards-ab-werk.json', 'tools/wizards-template.json']) {
    assert.deepEqual(schrittToreImModul(JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'))), [], rel);
  }
});

test('[G4·Rot-Beweis] ein Schritt-Tor im Kern oder im Modul würde gefunden', () => {
  assert.equal(schrittToreImQuelltext("    : { verborgenWenn: { feld: 'basicDecision', wert: 'untersagung' } });").length, 1);
  assert.equal(schrittToreImQuelltext('const PV_VERBORGEN_WENN = Object.freeze({').length, 1);
  assert.deepEqual(schrittToreImModul({ wizards: { umzwiz: { schritte: [{ feld: { id: 'noticeDate' }, verborgenWenn: { feld: 'x', wert: 'y' } }] } } }),
    ['umzwiz.noticeDate']);
});

test('[G4·Wirkung] das Tor der Definition wirkt am Bildschirm UND im Datensatz — die KI-Bedingungen einer untersagten Verfügung', async () => {
  const V = await kern();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'ki-verfuegung', basicDecision: 'untersagung', purpose: 'trauer', scope: 'privat' });
  const liste = V._feldDef('advanceCare', 'provisionInstruments');
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  for (const id of ['purpose', 'scope']) {
    const uf = liste.unterFelder.find((u) => u.id === id);
    assert.equal(V.feldSichtbar(uf, zeile), false, id + ': im Listen-Editor verborgen, wie im Assistenten');
  }
  const ds = JSON.stringify(V.zusammenstellungDatensatz(['advanceCare.provisionInstruments'], { id: 'x', titel: '' }, { sensibel: true }));
  assert.ok(!ds.includes('"trauer"') && !ds.includes('"privat"'), 'nicht im Datensatz, auch mit Opt-in');
  assert.equal(zeile.purpose, 'trauer', 'der gespeicherte Wert bleibt — er geht nur nicht mehr hinaus');
});

test('[G4·Wirkung] Bereichsfeld: Pflegegeld-Betrag bei Sachleistung verborgen, im Assistenten und in der Definition', async () => {
  const V = await kern();
  const f = V._feldDef('socialInsurance', 'longTermCareAllowanceAmount');
  assert.equal(V.feldSichtbar(f, { longTermCareAllowanceTypeOf: 'sachleistung', longTermCareAllowanceAmount: '599' }), false);
  assert.equal(V.feldSichtbar(f, { longTermCareAllowanceTypeOf: 'geldleistung', longTermCareAllowanceAmount: '599' }), true);
  assert.equal(V.feldSichtbar(f, { longTermCareAllowanceAmount: '599' }), true, 'unbeantwortet bleibt sichtbar (Negativ-Form, U2-ADR-102)');
});

test('[G4·Word] das Word-Modell (ohne Aufrufer seit 21.08.) zeigt ein Feld hinter einem Tor nicht — wie Bildschirm und PDF', async () => {
  const V = await kern();
  V.sektorFeldSetzen('socialInsurance', 'longTermCareAllowanceTypeOf', 'sachleistung');
  V.sektorFeldSetzen('socialInsurance', 'longTermCareAllowanceAmount', 'MARKER-PFLEGEGELD');
  V.sektorFeldSetzen('housing', 'ownedOrRented', 'eigentum');
  V.sektorFeldSetzen('housing', 'tenancyTerminationHandover', 'MARKER-KUENDIGUNG');
  for (const opt of [{}, { sensibel: true }]) {
    const t = JSON.stringify([V.docxBereichModell('socialInsurance', opt), V.docxBereichModell('housing', opt)]);
    assert.ok(!t.includes('MARKER-PFLEGEGELD') && !t.includes('MARKER-KUENDIGUNG'), 'Word, sensibel=' + !!opt.sensibel);
  }
  V.sektorFeldSetzen('socialInsurance', 'longTermCareAllowanceTypeOf', 'geldleistung');
  assert.ok(JSON.stringify(V.docxBereichModell('socialInsurance', { sensibel: true })).includes('MARKER-PFLEGEGELD'), 'Gegenprobe: ohne Tor steht er drin (der Betrag ist sensibel, darum mit Opt-in)');
});

test('[G1] vollExportJSON hat im Kern keinen Aufrufer', () => {
  const code = KERN.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const aufrufe = [...code.matchAll(/\bvollExportJSON\s*\(/g)].length;
  const definition = [...code.matchAll(/\bfunction\s+vollExportJSON\s*\(/g)].length;
  assert.equal(definition, 1, 'Positivkontrolle: die Definition steht (Wiederherstellung und Proben brauchen sie)');
  assert.equal(aufrufe - definition, 0, 'ein Aufrufer im Kern hieße: der offene Vollexport ist zurück');
});

test('[G1·Rot-Beweis] ein Knopf, der vollExportJSON aufruft, würde gezählt', () => {
  const code = 'function vollExportJSON(o) {}\nconst b = () => dateiAusgeben(JSON.stringify(vollExportJSON({})));';
  assert.equal([...code.matchAll(/\bvollExportJSON\s*\(/g)].length - 1, 1);
});

test('[G2·Nutzlast] jede postMessage des Kerns trägt nur die Konstante SKIP_WAITING — keine Depot-Daten', () => {
  const code = KERN.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const argumente = [...code.matchAll(/\.postMessage\s*\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());
  assert.ok(argumente.length >= 1, 'Positivkontrolle: die Nachricht an den Service Worker ist gefunden');
  assert.deepEqual([...new Set(argumente)], ["{ type: 'SKIP_WAITING' }"]);
});
