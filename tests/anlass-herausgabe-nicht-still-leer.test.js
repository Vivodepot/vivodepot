'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Anlass-Herausgabe geht nicht still leer hinaus (Durchtest v1052, Befund A1, HOCH)
   ───────────────────────────────────────────────────────────────────────────
   Gefahr: Die Person wählt „Vor einem Arzttermin“ und gibt die Zusammenstellung heraus. Der Dialog hält jedes besonders
   geschützte Feld zurück (Opt-out, U2-ADR-126/137), beim Arzttermin also Diagnosen, Allergien und Medikamente. Der Knopf
   „Herausgeben“ bleibt bei „0 von 3“ aktiv, und die Datei geht ohne eine Gesundheitsangabe hinaus.

   Verlangt:
   · [A1·Vorauswahl] Die Felder, für die ein Anlass da ist (`anlass.zweckFelder` am Anlass im Katalog), stehen beim Öffnen unter „geht mit“.
     Die Wahl des Anlasses ist die Entscheidung der Person (U2-ADR-137: Voreinstellung, keine Sperre); jedes Feld lässt sich
     weiter zurückhalten.
   · Die Untergrenze mit zwei Knöpfen und „kein Kästchen“ sind am 17.11.2026 durch die Entscheidung „Häkchen in Gruppen“ ersetzt
     (Entscheidung 17.11.2026): bei „0 gehen mit“ ist „Herausgeben“ gesperrt. Probe: tests/herausgabe-haekchen-gruppen.test.js [Häkchen·P5].
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'anlass-nicht-leer-pw-2026';
const MARKEN = {
  chronicConditionsDiagnoses: 'MARKE-Rheuma',
  allergiesMedicationFoodOther: 'MARKE-Penicillin',
  medicationOngoing: 'MARKE-Methotrexat',
};
const ZWECK = Object.keys(MARKEN).map((f) => 'health/' + f);

// Die angehakten Zeilen (Häkchen in Gruppen, 17.11.2026): je Angabe ein Häkchen mit data-sektor/data-feld.
const gehtMit = (html) => [...String(html).matchAll(/<input type="checkbox" class="export-haken" id="[^"]+" data-sektor="([^"]+)" data-feld="([^"]+)" checked>/g)]
  .map((m) => m[1] + '/' + m[2]);

async function depot(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Elena Beispiel');
  for (const [feld, marke] of Object.entries(MARKEN)) V.sektorFeldSetzen('health', feld, [{ text: marke }]);
  return V;
}

// Öffnet den Dialog und gibt das zuletzt geöffnete Fenster zurück; `fn` ruft den Weg auf.
function fenster(V, fn) {
  const modale = [];
  const echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  try { fn(); } finally { V.ui.modal = echt; }
  assert.ok(modale.length >= 1, 'ein Fenster öffnet sich');
  return modale[modale.length - 1];
}

// Was eine Herausgabe mit der Wahl `o` aus dem Dialog hinausgibt: der Datensatz derselben Kennungen.
const marken = (ds) => Object.values(MARKEN).filter((m) => JSON.stringify(ds).includes(m));

test('[A1·Vorauswahl] Arzttermin: Diagnosen, Allergien und Medikamente stehen beim Öffnen unter „geht mit“', async () => {
  const V = await depot(ladeKern().V);
  assert.ok(V.anlassDef('arzt'), 'Voraussetzung: der Anlass Arzttermin ist geladen');
  for (const z of ZWECK) assert.ok(V.anlassKennungen('arzt').some((k) => V.kennungZuSelektor(k).sektorId + '/' + V.kennungZuSelektor(k).feldId === z), 'Voraussetzung: ' + z + ' gehört zum Anlass');
  const f = fenster(V, () => V.flowAnlassExport('arzt'));
  const mit = gehtMit(f.koerperHTML);
  for (const z of ZWECK) assert.ok(mit.includes(z), z + ' steht unter „geht mit“, gesehen: ' + JSON.stringify(mit));
});

test('[A1·Vorauswahl] die Herausgabe trägt die drei Angaben, ohne dass die Person etwas umschaltet', async () => {
  const V = await depot(ladeKern().V);
  const kennungen = V.anlassKennungen('arzt');
  let ds = null;
  // Derselbe Dialog wie beim Anlass, mit der Vorauswahl des Anlasses; gebaut wird der Datensatz dieser Kennungen.
  // Häkchen P4 (17.11.2026): Sensibles ist nur beim Arzttermin vorausgewählt — der Weg nennt den Anlass.
  const f = fenster(V, () => V.flowExportUebersicht({ kennungen, titel: 'Probe', vorauswahl: V.anlassZweckFelder('arzt'), vorauswahlAnlassId: 'arzt',
    aufFortfahren: (o) => { ds = V.zusammenstellungDatensatz(kennungen, null, o); } }));
  await f.onPrimaer(() => {});
  assert.ok(ds, 'die Herausgabe lief');
  assert.deepEqual(marken(ds), Object.values(MARKEN), 'alle drei Angaben gehen hinaus');
});

test('[A1·Vorauswahl] weiterhin zurückzuhalten: ein Klick nimmt ein vorausgewähltes Feld zurück', async () => {
  const V = await depot(ladeKern().V);
  const f = fenster(V, () => V.flowAnlassExport('arzt'));
  for (const z of ZWECK) {
    const [s, feld] = z.split('/');
    assert.ok(new RegExp('<input type="checkbox" class="export-haken" id="[^"]+" data-sektor="' + s + '" data-feld="' + feld + '"').test(f.koerperHTML), z + ' hat ein Häkchen zum Abwählen');
  }
});

/* ── Rot-Beweise: der alte Zustand, in eine Kopie des Kerns gepflanzt ── */
/* Auflage Gestaltung 11.11.2026: die Vorauswahl ist als solche erkennbar, mit dem Namen des Anlasses und der Zahl der gewählten
   Zeilen; jede Zeile lässt sich abwählen ([A1·Vorauswahl] oben), Zurückgehaltenes bleibt zurückgehalten. */
const chip = (html) => { const m = /<p class="export-vorauswahl" data-vorauswahl><span class="export-vorauswahl-chip">([^<]*)<\/span>/.exec(String(html)); return m ? m[1] : null; };
async function erkennbar(V) {
  const f = fenster(V, () => V.flowAnlassExport('arzt'));
  const text = chip(f.koerperHTML);
  assert.ok(text, 'beim Arzttermin steht über der Liste ein Vorauswahl-Chip');
  return { f, text };
}

test('[A1·Erkennbar] der Chip nennt den Anlass und die Zahl der vorausgewählten Zeilen', async () => {
  const V = await depot(ladeKern().V);
  const { f, text } = await erkennbar(V);
  // D89 (17.11.2026): der Titel heißt „Herausgeben“, der Anlass steht darunter; der Chip nennt den Anlass.
  const anlass = V.anlassDef('arzt').titel;
  assert.ok(text.includes(anlass), 'Anlass im Chip: ' + text + ' / ' + anlass);
  assert.ok(/\b3\b/.test(text), 'drei Zeilen gezählt: ' + text);
  // Ohne Vorauswahl kein Chip; die Zahl folgt dem, was wirklich mitgeht.
  const kennungen = V.anlassKennungen('arzt');
  const ohne = fenster(V, () => V.flowExportUebersicht({ kennungen, titel: 'Probe', aufFortfahren: () => {} }));
  assert.equal(chip(ohne.koerperHTML), null);
  const eins = fenster(V, () => V.flowExportUebersicht({ kennungen, vorauswahl: ['health/medicationOngoing'], vorauswahlAnlass: 'Probe', vorauswahlAnlassId: 'arzt', titel: 'Probe', aufFortfahren: () => {} }));
  assert.ok(/\b1\b/.test(chip(eins.koerperHTML)), 'eine Zeile: ' + chip(eins.koerperHTML));
});

/* X1 (Review 11.11.2026): ein leeres Depot gab beim Arzttermin über einen aktiven „Herausgeben“ eine Datei ohne Angaben heraus.
   Steht nichts zur Herausgabe, schließt der einzige Knopf das Fenster; herausgegeben wird nichts. */
async function leerFall(V, tag) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Elena Beispiel');
  const kennungen = V.anlassKennungen('arzt');
  let herausgegeben = 0, geschlossen = 0;
  const f = fenster(V, () => V.flowExportUebersicht({ kennungen, titel: 'Probe', aufFortfahren: () => { herausgegeben++; } }));
  await f.onPrimaer(() => { geschlossen++; });
  if (f.zweitAktion) await f.zweitAktion.handler(() => { geschlossen++; });
  assert.equal(herausgegeben, 0, tag + ': ohne Angaben gibt kein Knopf etwas heraus');
  return f;
}

test('[A1·Leer] ohne jede Angabe gibt kein Knopf heraus: der einzige Knopf schließt', async () => {
  const V = ladeKern().V;
  const f = await leerFall(V, 'leer');
  assert.equal(f.primaerLabel, V.STRINGS.btnSchliessen);
  assert.ok(!f.zweitAktion, 'kein zweiter Knopf');
  assert.equal(f.ohneAbbrechen, true, 'kein „Abbrechen“ neben „Schließen“');
  // Auch der Anlass-Weg selbst (flowAnlassExport) landet hier.
  const g = fenster(V, () => V.flowAnlassExport('arzt'));
  assert.equal(g.primaerLabel, V.STRINGS.btnSchliessen);
});

const HTML = path.join(__dirname, '..', 'vivodepot.html');
const PFLANZEN = {
  // ohne Vorauswahl: kein Anlass nennt Zweck-Felder, alles Geschützte startet zurückgehalten (Stand v1052)
  ohneVorauswahl: ['function anlassZweckFelder(anlassId) {\n', (a) => a + '  return [];\n'],
  // ohne Leer-Fall: ein leeres Depot behält den aktiven „Herausgeben“ (Stand v1052); seit den Häkchen (17.11.2026) hält zusätzlich
  // „bei 0 gesperrt“ (P5) — der alte Zustand braucht darum beide Stellen entfernt.
  // ohne Auflage: der Anlass-Weg nennt seinen Anlass nicht, die Vorauswahl ist nicht als solche erkennbar
  ohneErkennbar: ['    vorauswahlAnlass: def.titel || def.id,   // A1-Auflage: die Vorauswahl nennt ihren Anlass\n', () => ''],
  ohneLeer: ['    if (toggelbar.length === 0 && zusatz.length === 0) return { primaerLabel: STRINGS.btnSchliessen, onPrimaer: (schliessen) => schliessen(), ohneAbbrechen: true };\n' +
    '    return { primaerLabel: (opt && opt.nurAuswahl) ? STRINGS.wizWeiter : STRINGS.herausgebenKnopf,\n' +
    '      onPrimaer: (schliessen) => (mitZahl() > 0 ? ausgeben(schliessen) : undefined) };\n',
  () => '    return { primaerLabel: STRINGS.herausgebenKnopf, onPrimaer: (schliessen) => ausgeben(schliessen) };\n'],
};
function gepflanzterKern(art) {
  const original = fs.readFileSync(HTML, 'utf8');
  const [anker, ersatz] = PFLANZEN[art];
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker steht genau einmal: ' + anker);
  const tmp = path.join(os.tmpdir(), 'anlass-nicht-leer-' + art + '-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, ersatz(anker)));
  try { return ladeKern({ htmlPfad: tmp, backen: true }).V; } finally { fs.rmSync(tmp, { force: true }); }
}

test('[A1·Rot-Beweis] ohne Zweck-Felder fällt die Vorauswahl: beim Arzttermin geht keine Gesundheitsangabe mit', async () => {
  const V = await depot(gepflanzterKern('ohneVorauswahl'));
  const f = fenster(V, () => V.flowAnlassExport('arzt'));
  const mit = gehtMit(f.koerperHTML);
  assert.ok(!ZWECK.some((z) => mit.includes(z)), 'alter Zustand: nichts Geschütztes unter „geht mit“, gesehen: ' + JSON.stringify(mit));
});

test('[A1·Rot-Beweis] ohne Auflage: beim Arzttermin steht kein Vorauswahl-Chip', async () => {
  const V = await depot(gepflanzterKern('ohneErkennbar'));
  await assert.rejects(() => erkennbar(V), /Vorauswahl-Chip/);
});

test('[A1·Rot-Beweis] ohne Leer-Fall: im leeren Depot gibt „Herausgeben“ eine Datei ohne Angaben heraus', async () => {
  const V = gepflanzterKern('ohneLeer');
  await assert.rejects(() => leerFall(V, 'alt'), /ohne Angaben gibt kein Knopf etwas heraus/);
});

test('[A1·Klasse] jeder Aufruf von flowExportUebersicht im Kern geht durch dieselbe Stelle (keine eigene Herausgeben-Taste daneben)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const start = html.indexOf('function flowExportUebersicht(opt) {');
  const ende = html.indexOf('\nfunction ', start + 10);
  const koerper = html.slice(start, ende);
  // Jedes Fenster des Opt-out-Zweigs bekommt seine Knöpfe aus einer Stelle, die die Untergrenze kennt.
  const fensterAufrufe = (koerper.match(/ui\.modal\(/g) || []).length;
  const mitUntergrenze = (koerper.match(/_herausgabeKnoepfe\(/g) || []).length;
  assert.ok(mitUntergrenze >= 1, 'die Knöpfe des Häkchen-Zweigs entstehen in _herausgabeKnoepfe');
  assert.equal(fensterAufrufe - 1, mitUntergrenze, 'jedes Fenster außer dem Ganzes-Depot-Zweig nimmt _herausgabeKnoepfe');
});
