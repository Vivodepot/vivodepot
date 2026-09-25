'use strict';
/* Register der Ab-Werk-Auszüge (tools/auszuege-register-pruefen.js, 21.09.2026): jeder Auszug, den der
   Erzeuger in die Kern-Region schreibt, steht mit einer Zeile im Register, offen oder verschoben. Die Wahrheit
   ist die Liste QUELLEN des Erzeugers, nicht der Kommentar im Kern. (1) Der echte Bestand ist grün und die
   Zahl der Offenen exakt. (2) Rot-Beweis an synthetischen Eingaben für jede Lücke. (3) Die Kommentar-Zahl
   wird erkannt und gemeldet, nicht als Sollwert genommen. Die Auszug-ids der Proben sind erfunden. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pruefen, regionText, stehtInRegion, kommentarZahlen, bootRiegelImKern, GRUNDLINIE_PFAD, REGION } = require('../tools/auszuege-register-pruefen.js');
const schreiber = require('../tools/ab-werk-logikmodul-auszuege-kern-schreiben.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(schreiber.KERN, 'utf8');
const REGISTER = JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'));
const QUELLEN_IDS = schreiber.QUELLEN.map((q) => JSON.parse(fs.readFileSync(q, 'utf8')).id);
const fixtureVorhanden = (p) => fs.existsSync(path.join(REPO, p));

/* ── (1) der echte Bestand ────────────────────────────────────────────────────────────────── */

test('[Auszüge-Register] der echte Bestand ist grün: jeder Auszug der QUELLEN-Liste steht im Register', () => {
  assert.ok(Array.isArray(QUELLEN_IDS), 'Vorbedingung: der Erzeuger führt eine Liste (seit Schema 87 ist sie leer: beide Auszüge sind Templates im Rezept)');
  const region = regionText(KERN, REGION);
  assert.ok(region, 'Vorbedingung: die Kern-Region steht im Kern');
  assert.deepEqual(pruefen({ quellenIds: QUELLEN_IDS, register: REGISTER, region, fixtureVorhanden, kern: KERN }).fehler, []);
});

test('[Auszüge-Register] die Zahl der Offenen ist exakt und kann nur sinken', () => {
  const offen = REGISTER.auszuege.filter((z) => z.status === 'offen').length;
  assert.equal(REGISTER.offenDeckel, offen, 'exakt, kein Puffer');
  // Diese Zeile ist die Ratsche der Zahl: sie zu erhöhen heißt, sie hier bewusst zu ändern.
  assert.ok(REGISTER.offenDeckel <= 1, 'ein neuer offener Auszug ist ein Rückschritt');
  assert.ok(REGISTER.auszuege.some((z) => z.status === 'verschoben'), 'das Register kennt auch, was schon verschoben ist: die Zahl der Auszüge ist damit belegt');
});

/* ── (2) Rot-Beweis an synthetischen Eingaben ─────────────────────────────────────────────── */

const region = (...ids) => '/* R:BEGIN */\nconst R = Object.freeze([' + ids.map((i) => '{ "id": "' + i + '" }').join(', ') + ']);\n/* R:END */';
const offen = (id) => ({ id, fixture: 'tests/synthetisch/' + id + '.json', status: 'offen', posten: 'S99', bootRiegel: false });
const verschoben = (id) => ({ id, fixture: 'tests/synthetisch/' + id + '.json', status: 'verschoben', bootRiegel: false, ort: 'lebt heute im Sprachmodul des Produkts, gemessen' });
const basis = (ueber = {}) => ({
  quellenIds: ['auszug-a'], region: region('auszug-a'), fixtureVorhanden: () => true,
  register: { offenDeckel: 1, auszuege: [offen('auszug-a'), verschoben('auszug-b')] }, ...ueber,
});

test('[Auszüge-Register·Rot-Beweis] die Vergleichsgrundlage ist grün (sonst beweisen die roten Fälle nichts)', () => {
  assert.deepEqual(pruefen(basis()).fehler, []);
});

test('[Auszüge-Register·Rot-Beweis] ein DRITTER Auszug in QUELLEN ohne Zeile im Register ist rot', () => {
  const r = pruefen(basis({ quellenIds: ['auszug-a', 'auszug-neu'], region: region('auszug-a', 'auszug-neu') }));
  assert.ok(r.fehler.some((f) => f.startsWith('auszug-neu: steht in QUELLEN des Erzeugers, aber nicht im Register')), JSON.stringify(r.fehler));
});

test('[Auszüge-Register·Rot-Beweis] "offen" ohne Eintrag in QUELLEN, ohne Modul in der Region oder ohne Posten ist rot', () => {
  assert.match(pruefen(basis({ quellenIds: [] })).fehler.join('|'), /schreibt ihn nicht mehr/);
  assert.match(pruefen(basis({ region: region() })).fehler.join('|'), /steht nicht mehr in der Kern-Region/);
  const ohnePosten = basis();
  ohnePosten.register.auszuege[0].posten = '';
  assert.match(pruefen(ohnePosten).fehler.join('|'), /ohne Posten/);
});

test('[Auszüge-Register·Rot-Beweis] "verschoben", obwohl QUELLEN ihn noch führt oder die Region ihn noch trägt, ist rot', () => {
  assert.match(pruefen(basis({ quellenIds: ['auszug-a', 'auszug-b'] })).fehler.join('|'), /auszug-b.*steht noch in QUELLEN/s);
  assert.match(pruefen(basis({ region: region('auszug-a', 'auszug-b') })).fehler.join('|'), /auszug-b.*steht noch als Modul in der Kern-Region/s);
  const ohneOrt = basis();
  ohneOrt.register.auszuege[1].ort = 'zu kurz';
  assert.match(pruefen(ohneOrt).fehler.join('|'), /ohne Ort/);
});

test('[Auszüge-Register·Rot-Beweis] eine Zahl der Offenen ungleich dem Deckel, eine fehlende Fixture und ein doppelter Eintrag sind rot', () => {
  const zuHoch = basis();
  zuHoch.register.offenDeckel = 2;
  assert.match(pruefen(zuHoch).fehler.join('|'), /Deckel senken/);
  const zuWenig = basis();
  zuWenig.register.offenDeckel = 0;
  assert.match(pruefen(zuWenig).fehler.join('|'), /kann nur sinken/);
  assert.match(pruefen(basis({ fixtureVorhanden: () => false })).fehler.join('|'), /gibt es nicht/);
  const doppelt = basis();
  doppelt.register.auszuege.push(offen('auszug-a'));
  assert.match(pruefen(doppelt).fehler.join('|'), /zweimal im Register/);
});

test('[Auszüge-Register] stehtInRegion trennt ein Modul-Objekt von einer bloßen Erwähnung der id', () => {
  assert.equal(stehtInRegion(region('a-b'), 'a-b'), true);
  assert.equal(stehtInRegion('/* nur ein Kommentar über a-b */', 'a-b'), false);
  assert.equal(stehtInRegion(region('a-bc'), 'a-b'), false);
});

/* ── (3) die Kommentar-Zahl ───────────────────────────────────────────────────────────────── */

test('[Auszüge-Register·Kommentar] die Zahl im Kommentar wird gelesen, aber nicht als Sollwert genommen', () => {
  const t = kommentarZahlen('x\n// hier die drei PRODUKTUNABHÄNGIGEN Ab-Werk-Auszüge stehen\ny die 2 PRODUKTUNABHÄNGIGEN Ab-Werk-Auszüge');
  assert.deepEqual(t.map((k) => [k.zeile, k.zahl]), [[2, 3], [3, 2]]);
  assert.equal(kommentarZahlen(KERN).length, 0, 'der echte Kern trägt keinen Satz mit einer Auszug-Zahl mehr: die Zahl stand in einem Kommentar und verhinderte nichts');
});

test('[Auszüge-Register·CLI] der Prüfer läuft gegen das Repo: Exit 0; eine Abweichung des Kommentars wird GENANNT, nicht rot', () => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'auszuege-register-pruefen.js')], { encoding: 'utf8', timeout: 60000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK — jeder Auszug steht im Register/);
  assert.doesNotMatch(r.stdout, /ABWEICHUNG/, 'ohne Kommentar-Zahl im Kern gibt es nichts zu nennen');
});

/* ── Der Boot-Riegel ──────────────────────────────────────────────────────────────────────── */

test('[Auszüge-Register·Boot-Riegel] der Kern ruft _abWerkAuszugPflicht nicht mehr auf, und keine Zeile führt einen Riegel', () => {
  for (const z of REGISTER.auszuege) assert.equal(typeof z.bootRiegel, 'boolean', z.id);
  assert.ok(REGISTER.auszuege.every((z) => z.bootRiegel === false), 'kein Auszug hat mehr einen Riegel: das leere Gerüst startet');
  assert.equal(bootRiegelImKern(KERN, 'erbschein-vorbereitung'), false, 'der Kern ruft _abWerkAuszugPflicht nicht mehr auf');
  assert.equal(bootRiegelImKern(KERN, 'gibt-es-nicht'), false);
});

test('[Auszüge-Register·Boot-Riegel·Rot-Beweis] ein Riegel, den die Zeile nicht nennt (oder umgekehrt), und eine Zeile ohne bootRiegel sind rot', () => {
  const kern = "const X = _abWerkAuszugPflicht('auszug-a');";
  assert.deepEqual(pruefen(basis({ kern, register: { offenDeckel: 1, auszuege: [{ ...offen('auszug-a'), bootRiegel: true }, verschoben('auszug-b')] } })).fehler, []);
  assert.match(pruefen(basis({ kern })).fehler.join('|'), /bootRiegel sagt false, der Kern ruft _abWerkAuszugPflicht mit dieser id auf/);
  assert.match(pruefen(basis({ kern: '// kein Riegel', register: { offenDeckel: 1, auszuege: [{ ...offen('auszug-a'), bootRiegel: true }, verschoben('auszug-b')] } })).fehler.join('|'), /bootRiegel sagt true, der Kern ruft _abWerkAuszugPflicht nicht mehr/);
  const ohne = basis();
  delete ohne.register.auszuege[0].bootRiegel;
  assert.match(pruefen(ohne).fehler.join('|'), /ohne bootRiegel/);
});
