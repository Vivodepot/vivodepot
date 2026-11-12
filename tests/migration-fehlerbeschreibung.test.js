'use strict';
/* Die Fehlerbeschreibung nach einem Migrationswurf.

   Wirft die Migration beim Öffnen einer Datei oder beim Betreten eines Subs, bleibt das Depot nur lesend
   (tests/import-a6-migrationswurf.test.js). Der Hinweis dazu trägt einen Knopf, der eine kleine Textdatei speichert.
   Die Datei sagt von sich „keine Inhalte aus Ihrem Depot“. Das hält die Positivliste der Felder [·Felder], und die
   Fälle je Einfallstor zeigen, dass weder die Fehlermeldung noch ein Name in die Datei kommt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A6 = require('./import-a6-helfer.js');
const { ladeKern } = require('./load-kern.js');
const { depotImProduktAnlegen } = require('./produkt-html-erzeugen.js');

/* Der Wurf aus tests/import-a6-helfer.js trägt keinen Inhalt. Diese Fälle lassen die Migration mit einem Inhalt werfen.
   Der Name der Änderung unterscheidet die Kerne, die der Helfer je Name zwischenspeichert. */
const AUFRUF = '  try { depotNormalisieren(ziel); return { ok: true, grund: null, verworfene: [] }; }\n';
function aenderung(name, ersetzen, wurf) {
  const f = (quelle) => {
    let q = quelle;
    for (let i = 0; ersetzen && i < ersetzen.length; i += 2) {
      if (!q.includes(ersetzen[i])) throw new Error('die Stelle steht nicht mehr im Kern: ' + ersetzen[i]);
      q = q.replace(ersetzen[i], () => ersetzen[i + 1]);
    }
    if (wurf) {
      if (!q.includes(AUFRUF)) throw new Error('der Aufruf in _migrationVersuchen steht nicht mehr so im Kern');
      q = q.replace(AUFRUF, () => "  try { if (ziel && ziel.zzProbeMigrationWurf) { _zzProbeWerfen(); } depotNormalisieren(ziel); return { ok: true, grund: null, verworfene: [] }; }\n");
      q = q.replace('function _migrationVersuchen(', () => 'function _zzProbeWerfen() { ' + wurf + ' }\nfunction _migrationVersuchen(');
    }
    return q;
  };
  Object.defineProperty(f, 'name', { value: name });
  return f;
}

async function nachWurf(aendern) {
  const { V } = await A6.ankerOeffnen({ aendern: aendern || null });
  assert.equal(V.migrationFehlerErgebnis().grund, 'migration-fehler', 'Vorbedingung: die Migration hat geworfen');
  return { V, text: V.migrationFehlerBeschreibungText() };
}

const MIT_INHALT = "throw new Error('Hedwig wirft bei Wiltrudis-Feldwert');";
const FEHLERART_AUS_MELDUNG = ['fehlerart: _fehlerKlassenName(e)', "fehlerart: (e && e.message) ? String(e.message) : null"];

test('[A6·Fehlerbeschreibung] Weg, Schemanummer und Funktionsnamen, aber keine Meldung und kein Name', async () => {
  const { V, text } = await nachWurf();
  const f = JSON.parse(text);
  assert.equal(f.typ, 'vivodepot-fehlerbeschreibung');
  assert.equal(f.weg, 'datei-oeffnen');
  assert.equal(f.schemaDatei, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(f.schemaProgramm, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(f.fehlerart, 'Error');
  assert.ok(f.stelle.includes('depotNormalisieren'), 'die Fehlerstelle nennt die Funktion: ' + JSON.stringify(f.stelle));
  assert.doesNotMatch(text, /zz-probe|Ada|Probe/, 'weder die Fehlermeldung noch ein Name');
  assert.match(V.migrationFehlerBeschreibungDateiname(new Date(2026, 10, 4)), /^Vivodepot_Fehlerbeschreibung_2026-11-04\.txt$/);
});

test('[A6·Fehlerbeschreibung·Meldung] Name und Feldwert aus der Fehlermeldung stehen nicht in der Datei', async () => {
  const { text } = await nachWurf(aenderung('meldung', null, MIT_INHALT));
  assert.equal(JSON.parse(text).fehlerart, 'Error');
  assert.doesNotMatch(text, /Hedwig|Wiltrudis/);
});

test('[A6·Fehlerbeschreibung·Meldung·Rot-Beweis] nimmt der Helfer die Meldung auf, stehen Name und Feldwert in der Datei', async () => {
  const { text } = await nachWurf(aenderung('meldung-rot', FEHLERART_AUS_MELDUNG, MIT_INHALT));
  assert.match(text, /Hedwig/);
  assert.match(text, /Wiltrudis-Feldwert/);
});

test('[A6·Fehlerbeschreibung·Sub] der Wurf beim Betreten eines Subs nennt seinen Weg', async () => {
  const { V } = await A6.subBetreten();
  assert.equal(JSON.parse(V.migrationFehlerBeschreibungText()).weg, 'sub-betreten');
});

test('[A6·Fehlerbeschreibung·Schema] die Nummer der Datei wird festgehalten, die Rückgabe bleibt, ohne Weg bleibt alles leer', () => {
  const { V } = A6.kernMitWurf();
  const ohneWeg = V._migrationVersuchen({ schemaVersion: 80, zzProbeMigrationWurf: true });
  assert.equal(ohneWeg.ok, false);
  assert.equal(JSON.parse(V.migrationFehlerBeschreibungText()).weg, null, 'das Einlesen „Ganzes Depot“ hält keine Beschreibung fest');
  const r = V._migrationVersuchen({ schemaVersion: 80, zzProbeMigrationWurf: true }, 'datei-oeffnen');
  assert.deepEqual(r, { ok: false, grund: 'migration-fehler', verworfene: [], fehler: 'zz-probe-migrationswurf' });
  assert.equal(JSON.parse(V.migrationFehlerBeschreibungText()).schemaDatei, 80);
  V._migrationVersuchen({ schemaVersion: '80 Hedwig', zzProbeMigrationWurf: true }, 'datei-oeffnen');
  assert.equal(JSON.parse(V.migrationFehlerBeschreibungText()).schemaDatei, null, 'nur eine Zahl wird übernommen');
});

// Der Hinweis sagt „keine Inhalte aus Ihrem Depot“. Das hält diese Positivliste: nur diese Felder, und jede Fehlerstelle ist
// ein Bezeichner aus dem Stapel. Ein Feldwert, ein Dateiname oder ein Personenname mit Leerzeichen passt nicht hinein.
const FELDER = ['hinweis', 'typ', 'fassung', 'build', 'schemaProgramm', 'schemaDatei', 'weg', 'fehlerart', 'stelle'];
function befunde(text) {
  const f = JSON.parse(text);
  const b = [];
  if (JSON.stringify(Object.keys(f)) !== JSON.stringify(FELDER)) b.push('Felder: ' + Object.keys(f).join(','));
  for (const s of f.stelle) {
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(s) || s.length > 80) b.push('Stelle ist kein Bezeichner: ' + s);
  }
  return b;
}

test('[A6·Fehlerbeschreibung·Felder] der Hinweis steht zuerst, nennt die Adresse, und die Datei trägt nur die bekannten Felder', async () => {
  const { V, text } = await nachWurf();
  const f = JSON.parse(text);
  assert.equal(Object.keys(f)[0], 'hinweis');
  assert.match(f.hinweis, /info@vivodepot\.de/);
  assert.match(V.STRINGS.fehlerbeschreibungHinweis, /\{kontakt\}/, 'die Adresse kommt von der Marke, nicht aus dem Textsatz');
  assert.doesNotMatch(f.hinweis, /\{kontakt\}/);
  assert.deepEqual(befunde(text), []);
});

test('[A6·Fehlerbeschreibung·Felder·Rot-Beweis] ein untergeschobenes Feld und eine Fehlerstelle mit Inhalt fallen auf', async () => {
  const feld = await nachWurf(aenderung('feld-rot', ['stelle: f.stelle,\n', "stelle: f.stelle, depot: 'Wiltrudis-Feldwert',\n"]));
  assert.ok(befunde(feld.text).some((b) => /^Felder/.test(b)));
  const stelle = await nachWurf(aenderung('stelle-rot', ['.filter(Boolean).slice(0, 8);', '.filter(Boolean).slice(0, 8).concat([String(e && e.message)]);']));
  assert.ok(befunde(stelle.text).some((b) => /^Stelle/.test(b)));
});

// Eine mehrzeilige Fehlermeldung, deren Zeilen wie Stapelzeilen aussehen (V8: „at Name (“, Firefox: „Name@“).
const STAPELMELDUNG = "throw new Error('zz\\n    at Hedwig (x.js:1:1)\\nWiltrudis@example.org/y.js:2:2');";

test('[A6·Fehlerbeschreibung·Stelle] Wörter aus einer stapelförmigen Fehlermeldung kommen nicht in die Fehlerstelle', async () => {
  const { text } = await nachWurf(aenderung('stapel', null, STAPELMELDUNG));
  assert.doesNotMatch(text, /Hedwig|Wiltrudis/);
  assert.ok(JSON.parse(text).stelle.length > 0, 'Vorbedingung: die echten Stapelzeilen ergeben Funktionsnamen');
});

test('[A6·Fehlerbeschreibung·Stelle·Rot-Beweis] ohne das Herausnehmen der Meldung stünden die Wörter in der Fehlerstelle', async () => {
  const { text } = await nachWurf(aenderung('stapel-rot', ['    if (meldung && stapel.indexOf(meldung) >= 0) stapel = stapel.slice(stapel.indexOf(meldung) + meldung.length);\n', ''], STAPELMELDUNG));
  assert.match(text, /Hedwig|Wiltrudis/);
});

// Wirft die Migration ein Datenobjekt statt eines Fehlers, ist dessen `name` womöglich ein Personenname.
const OBJEKT = "throw { name: 'Erika Beispiel' };";

test('[A6·Fehlerbeschreibung·Objekt] ein geworfenes Datenobjekt mit Feld name hinterlässt keinen Namen, fehlerart ist leer', async () => {
  const { text } = await nachWurf(aenderung('objekt', null, OBJEKT));
  assert.equal(JSON.parse(text).fehlerart, null);
  assert.doesNotMatch(text, /Erika|Beispiel/);
});

test('[A6·Fehlerbeschreibung·Objekt·Rot-Beweis] ohne die Prüfung auf einen Klassennamen stünde der Name in der Datei', async () => {
  const { text } = await nachWurf(aenderung('objekt-rot', ['fehlerart: _fehlerKlassenName(e)', "fehlerart: (e && e.name) ? String(e.name).slice(0, 40) : null"], OBJEKT));
  assert.match(text, /Erika Beispiel/);
});

test('[A6·Fehlerbeschreibung·Sprache] jedes Sprachmodul trägt Knopf und Hinweis, der englische Satz nennt die Adresse', () => {
  const modul = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-' + n + '-modul.json'), 'utf8')).texte;
  // Öffentlich fehlen die zurückgehaltenen Pro-Textsätze; privat sind alle vier Pflicht.
  for (const n of require('./helfer/nur-privat.js').istOeffentlich() ? ['de', 'en'] : ['de', 'de-pro', 'en', 'en-pro']) {
    assert.ok(modul(n)['strings:fehlerbeschreibungSpeichern.text'], 'Knopf in ' + n);
    assert.match(modul(n)['strings:fehlerbeschreibungHinweis.text'], /\{kontakt\}/, 'Hinweis in ' + n);
  }
  assert.match(modul('en')['strings:fehlerbeschreibungHinweis.text'], /no content from your depot/);
});

/* Der Knopf im Dialog, am Kern mit steuerbarem Dialog-Platz. */
function classListMitZustand() {
  const s = new Set();
  return { add: (k) => s.add(k), remove: (k) => s.delete(k), toggle: (k) => (s.has(k) ? s.delete(k) : s.add(k)), contains: (k) => s.has(k) };
}
async function kernMitDialog(umschlag, aendern) {
  const erfasst = [];
  const k = A6.kernMitWurf(aendern || null, { Blob, zusatzBindungen: ['neuereFassungHinweisZeigen'], ausgabeErfassen: (a) => erfasst.push(a) });
  k.document.getElementById('modal-rueck').classList = classListMitZustand();
  await k.V.depotLaden(umschlag, A6.PW);
  assert.equal(k.V.neuereFassungNurLesen(), true, 'Vorbedingung: das Depot ist nur lesend');
  k.V.__zusatz.neuereFassungHinweisZeigen();
  return { k, V: k.V, erfasst, box: k.document.getElementById('modal-inhalt') };
}
async function umschlagMit(veraendern) {
  const s = ladeKern().V;
  await s.depotAnlegen(A6.PW);
  veraendern(s);
  return s.depotSerialisieren();
}
const dateiMitWurf = () => umschlagMit((s) => { s.getData().zzProbeMigrationWurf = true; });
async function neuereDatei() {
  const { umschlag } = await depotImProduktAnlegen('privat-de', A6.PW, (V) => { V.getData().schemaVersion = V.SCHEMA_VERSION_AKTUELL + 1; });
  return umschlag;
}
const KNOPF = 'id="m-zweit"';

test('[A6·Knopf] der Hinweis nach einem Migrationswurf trägt den Knopf, der Hinweis zu einer neueren Fassung nicht', async () => {
  const wurf = await kernMitDialog(await dateiMitWurf());
  assert.match(String(wurf.box.innerHTML), /id="migration-fehler-hinweis"/);
  assert.ok(String(wurf.box.innerHTML).includes(KNOPF), 'der Knopf steht im Hinweis');
  assert.ok(String(wurf.box.innerHTML).includes(wurf.V.STRINGS.fehlerbeschreibungSpeichern));
  const neuer = await kernMitDialog(await neuereDatei());
  assert.match(String(neuer.box.innerHTML), /id="neuere-fassung-hinweis"/);
  assert.ok(!String(neuer.box.innerHTML).includes(KNOPF), 'bei einer neueren Fassung gibt es nichts zu beschreiben');
});

test('[A6·Knopf·Rot-Beweis] hängt der Knopf nicht am Migrationswurf, steht er auch bei einer neueren Fassung', async () => {
  const neuer = await kernMitDialog(await neuereDatei(), aenderung('knopf-rot', ['zweitAktion: mig ? { label: STRINGS.fehlerbeschreibungSpeichern', 'zweitAktion: true ? { label: STRINGS.fehlerbeschreibungSpeichern']));
  assert.ok(String(neuer.box.innerHTML).includes(KNOPF));
});

test('[A6·Knopf·Datei] der Knopf speichert die Beschreibung, der Dialog bleibt, das Depot bleibt unverändert und nur lesend', async () => {
  const { k, V, erfasst, box } = await kernMitDialog(await dateiMitWurf());
  const vorher = JSON.stringify(V.getData());
  await k.document.getElementById('m-zweit').onclick();
  for (let i = 0; i < 20 && !erfasst.length; i += 1) await new Promise((r) => setImmediate(r));
  assert.equal(erfasst.length, 1, 'genau eine Datei');
  assert.match(erfasst[0].name, /^Vivodepot_Fehlerbeschreibung_\d{4}-\d{2}-\d{2}\.txt$/);
  const text = await erfasst[0].blob.text();
  assert.equal(text, V.migrationFehlerBeschreibungText());
  assert.deepEqual(befunde(text), []);
  assert.match(String(box.innerHTML), /id="migration-fehler-hinweis"/, 'der Hinweis steht weiter');
  assert.equal(JSON.stringify(V.getData()), vorher, 'der Depotstand ist unverändert');
  assert.equal(V.neuereFassungNurLesen(), true);
  assert.equal(V.istUngespeichert(), false);
  await assert.rejects(() => V.depotSerialisieren(), (e) => e && e.code === 'migration-fehler-nur-lesen');
});
