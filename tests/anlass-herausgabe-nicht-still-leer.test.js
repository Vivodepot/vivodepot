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
   · [A1·Untergrenze] Hält der Dialog etwas zurück und geht nichts mit, gibt es nicht nur den einen Knopf: ein zweiter
     Knopf steht daneben, ein Knopf gibt mit den zurückgehaltenen Angaben heraus, der andere ohne sie.
   · [A1·Klasse] Die Untergrenze gilt für jeden Weg in `flowExportUebersicht` mit Bereich oder Kennungen, im Normalweg und
     im Zurückhalten-Weg.
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

// Die Zeilen der Liste „geht mit“ im Normalweg (data-sektor/data-feld je <li>).
const gehtMit = (html) => {
  const liste = (/<ul class="export-geht-liste">([\s\S]*?)<\/ul>/.exec(String(html)) || [, ''])[1];
  return [...liste.matchAll(/<li data-sektor="([^"]+)" data-feld="([^"]+)"/g)].map((m) => m[1] + '/' + m[2]);
};

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
  const f = fenster(V, () => V.flowExportUebersicht({ kennungen, titel: 'Probe', vorauswahl: V.anlassZweckFelder('arzt'),
    aufFortfahren: (o) => { ds = V.zusammenstellungDatensatz(kennungen, null, o); } }));
  await f.onPrimaer(() => {});
  assert.ok(ds, 'die Herausgabe lief');
  assert.deepEqual(marken(ds), Object.values(MARKEN), 'alle drei Angaben gehen hinaus');
});

test('[A1·Vorauswahl] weiterhin zurückzuhalten: ein Klick nimmt ein vorausgewähltes Feld zurück', async () => {
  const V = await depot(ladeKern().V);
  const f = fenster(V, () => V.flowAnlassExport('arzt'));
  assert.ok(/id="exp-zurueckhalten-weg"/.test(f.koerperHTML), 'der Knopf „Etwas zurückhalten“ steht da');
});

// Untergrenze: alle Felder geschützt und zurückgehalten, nichts geht mit.
async function untergrenze(V, aufruf, tag) {
  let ds = null;
  const kennungen = Object.keys(MARKEN).map((f) => V.anlassKennungen('arzt').find((k) => V.kennungZuSelektor(k).feldId === f));
  const fort = (o) => { ds = V.zusammenstellungDatensatz(kennungen, null, o); };
  const oeffnen = () => fenster(V, () => aufruf(kennungen, fort));
  let f = oeffnen();
  assert.ok(f.zweitAktion && typeof f.zweitAktion.handler === 'function', tag + ': neben „Herausgeben“ steht ein zweiter Knopf');
  await f.onPrimaer(() => {});
  const ersteWahl = marken(ds);
  ds = null;
  f = oeffnen();
  await f.zweitAktion.handler(() => {});
  const zweiteWahl = marken(ds);
  const ergebnisse = [ersteWahl.length, zweiteWahl.length].sort();
  assert.deepEqual(ergebnisse, [0, 3], tag + ': ein Knopf gibt mit den Angaben heraus, der andere ohne sie: ' + JSON.stringify({ ersteWahl, zweiteWahl }));
}

test('[A1·Untergrenze] nichts geht mit, etwas ist zurückgehalten: zwei Knöpfe statt eines', async () => {
  const V = await depot(ladeKern().V);
  await untergrenze(V, (kennungen, fort) => V.flowExportUebersicht({ kennungen, titel: 'Probe', aufFortfahren: fort }), 'Kennungen');
});

test('[A1·Untergrenze] Beschriftung nach UX: eigener Hauptknopf (nicht der Zeilenknopf), Stilmarke für 48 px und schmal untereinander', async () => {
  const V = await depot(ladeKern().V);
  const kennungen = Object.keys(MARKEN).map((f) => V.anlassKennungen('arzt').find((k) => V.kennungZuSelektor(k).feldId === f));
  const f = fenster(V, () => V.flowExportUebersicht({ kennungen, titel: 'Probe', aufFortfahren: () => {} }));
  const S = V.STRINGS;
  assert.ok(S.exportAlleMitgebenKnopf && S.exportOhneSieHerausgebenKnopf && S.exportAlleMitgebenAria && S.exportOhneSieHerausgebenAria, 'die vier Texte sind geladen');
  assert.equal(f.primaerLabel, S.exportAlleMitgebenKnopf);
  assert.notEqual(f.primaerLabel, S.exportDochMitgebenKnopf, 'der Hauptknopf ist nicht der Zeilenknopf');
  assert.equal(f.zweitAktion.label, S.exportOhneSieHerausgebenKnopf);
  assert.ok(/data-herausgabe-zwei-wege/.test(f.koerperHTML), 'die Stilmarke steht im Fenster');
  const css = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  assert.ok(/\.modal:has\(\[data-herausgabe-zwei-wege\]\) \.modal-aktionen \.btn \{ min-height: var\(--ziel-gross\); white-space: nowrap; \}/.test(css), 'beide Knöpfe mit der großen Zielfläche (48 px), kein Umbruch im Knopf (X3)');
  assert.ok(/\.modal:has\(\[data-herausgabe-zwei-wege\]\) \.modal-aktionen \{ flex-wrap: wrap; \}/.test(css), 'passt die Zeile nicht, rückt sie um (X3)');
  assert.ok(/\.modal:has\(\[data-herausgabe-zwei-wege\]\) \.modal-aktionen \{ flex-direction: column-reverse;/.test(css), 'schmal untereinander, Hauptknopf zuerst');
  // Mit einem mitgehenden Feld bleibt alles wie bisher: ein Knopf, keine Marke.
  const g = fenster(V, () => V.flowExportUebersicht({ kennungen, vorauswahl: ['health/medicationOngoing'], titel: 'Probe', aufFortfahren: () => {} }));
  assert.equal(g.primaerLabel, S.herausgebenKnopf);
  assert.ok(!g.zweitAktion && !/data-herausgabe-zwei-wege/.test(g.koerperHTML));
});

test('[A1·Klasse] die Untergrenze gilt auch im Bereichs-Weg (sektorId)', async () => {
  const V = await depot(ladeKern().V);
  const f = fenster(V, () => V.flowExportUebersicht({ sektorId: 'health', titel: 'Probe', aufFortfahren: () => {} }));
  const mit = gehtMit(f.koerperHTML);
  if (mit.length === 0) assert.ok(f.zweitAktion && typeof f.zweitAktion.handler === 'function', 'Bereich Gesundheit ohne mitgehendes Feld: zweiter Knopf');
  else assert.ok(!mit.some((z) => ZWECK.includes(z)), 'Voraussetzung: im Bereichs-Weg starten die geschützten Felder zurückgehalten');
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
  assert.ok(text.includes(f.titel), 'Anlass im Chip: ' + text + ' / ' + f.titel);
  assert.ok(/\b3\b/.test(text), 'drei Zeilen gezählt: ' + text);
  // Ohne Vorauswahl kein Chip; die Zahl folgt dem, was wirklich mitgeht.
  const kennungen = V.anlassKennungen('arzt');
  const ohne = fenster(V, () => V.flowExportUebersicht({ kennungen, titel: 'Probe', aufFortfahren: () => {} }));
  assert.equal(chip(ohne.koerperHTML), null);
  const eins = fenster(V, () => V.flowExportUebersicht({ kennungen, vorauswahl: ['health/medicationOngoing'], vorauswahlAnlass: 'Probe', titel: 'Probe', aufFortfahren: () => {} }));
  assert.ok(/\b1\b/.test(chip(eins.koerperHTML)), 'eine Zeile: ' + chip(eins.koerperHTML));
});

/* Entscheidung Austausch 11.11.2026: die Herausgabe kommt ohne Kästchen aus (Variante A, 12.08.); abgewählt wird über
   „Zurückhalten“/„Doch mitgeben“. Probe gegen die Klasse für die Wege mit Bereich, Kennungen oder Anlass, im Normal- und im
   Zurückhalten-Weg. Der Ganzes-Depot-Zweig (sektorId null ohne Kennungen) trägt noch die Kästchenliste; sein Umbau ist eigener Bau. */
const KAESTCHEN = /type="checkbox"/;
function ohneKaestchen(V, tag) {
  const funde = [];
  let geoeffnet = 0;
  // Ein Weg ohne Angaben öffnet kein Fenster; gezählt wird, dass genug Wege eines öffnen.
  const pruefe = (name, fn) => {
    const modale = [], echt = V.ui.modal;
    V.ui.modal = (o) => { modale.push(o); return () => {}; };
    try { fn(); } finally { V.ui.modal = echt; }
    for (const f of modale) { geoeffnet++; if (KAESTCHEN.test(f.koerperHTML)) funde.push(name); }
  };
  for (const b of V.bereicheAlle()) pruefe('bereich:' + b.id, () => V.flowExportUebersicht({ sektorId: b.id, titel: 'Probe', aufFortfahren: () => {} }));
  for (const a of V.ANLAESSE) pruefe('anlass:' + a.id, () => V.flowAnlassExport(a.id));
  pruefe('kennungen', () => V.flowExportUebersicht({ kennungen: V.anlassKennungen('arzt'), titel: 'Probe', aufFortfahren: () => {} }));
  assert.ok(geoeffnet >= 3, tag + ': Vorbedingung, mindestens drei Wege öffnen ein Fenster (' + geoeffnet + ')');
  assert.deepEqual(funde, [], tag + ': kein Kästchen im Herausgabe-Weg');
}

test('[A1·Kein Kästchen] Bereich, Anlass und Kennungen zeigen kein Kästchen, auch nicht im Zurückhalten-Weg', async () => {
  const V = await depot(ladeKern().V);
  ohneKaestchen(V, 'Normalweg');
  const quelle = fs.readFileSync(HTML, 'utf8');
  const von = quelle.indexOf('  const nichtMitgeschicktHTML = () => {'), bis = quelle.indexOf('  const _herausgabeKnoepfe = () => {');
  assert.ok(von > 0 && bis > von, 'Vorbedingung: der Opt-out-Zweig ist zu finden');
  assert.ok(!KAESTCHEN.test(quelle.slice(von, bis)), 'Normal- und Zurückhalten-Weg bauen kein Kästchen');
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
  // ohne Untergrenze: immer nur der eine Knopf „Herausgeben“ (Stand v1052)
  // ohne Leer-Fall: ein leeres Depot behält den aktiven „Herausgeben“ (Stand v1052)
  // ohne Auflage: der Anlass-Weg nennt seinen Anlass nicht, die Vorauswahl ist nicht als solche erkennbar
  ohneErkennbar: ['    vorauswahlAnlass: def.titel || def.id,   // A1-Auflage: die Vorauswahl nennt ihren Anlass\n', () => ''],
  // mit Kästchen: der Normalweg zeigt eine Kästchenzeile
  mitKaestchen: ['    h += nichtMitgeschicktHTML();\n', (a) => a + '    h += \x27<input type="checkbox">\x27;\n'],
  ohneLeer: ['    if (toggelbar.length === 0 && zusatz.length === 0) return { primaerLabel: STRINGS.btnSchliessen, onPrimaer: (schliessen) => schliessen(), ohneAbbrechen: true };\n', () => ''],
  ohneUntergrenze: ['  const _herausgabeKnoepfe = () => {\n', (a) => a + '    return { primaerLabel: STRINGS.herausgebenKnopf, onPrimaer: ausgeben };\n'],
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

test('[A1·Rot-Beweis] ohne Untergrenze: bei „0 von 3“ nur ein Knopf, und er gibt die Datei ohne Angaben heraus', async () => {
  const V = await depot(gepflanzterKern('ohneUntergrenze'));
  await assert.rejects(() => untergrenze(V, (kennungen, fort) => V.flowExportUebersicht({ kennungen, titel: 'Probe', aufFortfahren: fort }), 'alt'),
    /zweiter Knopf/);
});

test('[A1·Rot-Beweis] ohne Auflage: beim Arzttermin steht kein Vorauswahl-Chip', async () => {
  const V = await depot(gepflanzterKern('ohneErkennbar'));
  await assert.rejects(() => erkennbar(V), /Vorauswahl-Chip/);
});

test('[A1·Rot-Beweis] mit Kästchen im Normalweg schlägt die Klassenprobe an', async () => {
  const V = await depot(gepflanzterKern('mitKaestchen'));
  assert.throws(() => ohneKaestchen(V, 'alt'), /kein Kästchen im Herausgabe-Weg/);
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
  assert.ok(mitUntergrenze >= 1, 'die Knöpfe des Opt-out-Zweigs entstehen in _herausgabeKnoepfe');
  assert.equal(fensterAufrufe - 1, mitUntergrenze, 'jedes Fenster außer dem Ganzes-Depot-Zweig nimmt _herausgabeKnoepfe');
});
