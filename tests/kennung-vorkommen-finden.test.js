'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   kennung-vorkommen-finden — Proben zu tools/kennung-vorkommen-finden.js
   ────────────────────────────────────────────────────────────────────────────
   Je Vorkommensform ein Rot-Beweis: der Prüfer muss die Form finden, die ein Literal-Grep nie
   findet. Die Probe-Kennung wird aus Bruchstücken gebaut und steht NIE als Literal in dieser Datei
   (Regel „Probe gegen Muster-Achse: Wert nicht literal"): sonst wäre die Testdatei selbst ein Fund,
   und der Prüfer scannt sie mit (tests/kennung-vorkommen-finden.test.js steht in seinen ORTEN).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const W = require('../tools/kennung-vorkommen-finden.js');

const K = ['zz', 'probe', 'kennung'].join('');
const WERKZEUG = path.join(__dirname, '..', 'tools', 'kennung-vorkommen-finden.js');

// Ein Wurzelverzeichnis, in dem jeder feste Ort existiert (leer), damit nur das Gewollte trifft.
function wurzel() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kvf-'));
  for (const ort of W.ORTE) {
    if (ort.datei) {
      fs.mkdirSync(path.dirname(path.join(root, ort.datei)), { recursive: true });
      fs.writeFileSync(path.join(root, ort.datei), '');
    } else {
      fs.mkdirSync(path.join(root, ort.glob), { recursive: true });
      fs.writeFileSync(path.join(root, ort.glob, (ort.praefix || 'x') + 'leer' + ort.endungen[0]), '');
    }
  }
  return root;
}
function grundlinie(inhalt) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kvf-gl-')), 'gl.json');
  fs.writeFileSync(p, JSON.stringify(inhalt || {}));
  return p;
}
function mit(root, rel, text) { fs.writeFileSync(path.join(root, rel), text); }
function lauf(args) {
  return spawnSync(process.execPath, [WERKZEUG].concat(args), { encoding: 'utf8' });
}
function formenIn(root, rel, zeilenText) {
  mit(root, rel, zeilenText);
  const r = W.finden(K, { root, grundlinie: grundlinie() });
  return r.treffer.filter((t) => t.datei === rel);
}

test('[Form·wert] ein quotierter Wert wird gefunden', () => {
  const t = formenIn(wurzel(), 'vivodepot.html', `const a = ['${K}'];\nconst b = "${K}";\n`);
  assert.equal(t.length, 2);
  assert.ok(t.every((x) => x.formen.includes('wert')));
});

test('[Form·schluessel] ein unquotierter Objektschlüssel wird gefunden', () => {
  const t = formenIn(wurzel(), 'vivodepot-lesen.html', `const T = {\n  ${K}: true,\n  x: { ${K}: 1 },\n};\n`);
  assert.equal(t.length, 2);
  assert.ok(t.every((x) => x.formen.includes('schluessel')));
});

for (const [name, zeile] of [
  ['Doppelpunkt', `feld: 'instrument:${K}'`],
  ['Doppelpunkt mittig', `'liste:provisionInstruments:${K}:storageLocation'`],
  ['Punkt', `'a.b.${K}.label'`],
  ['Schrägstrich', `'a.b/instrument/${K}.label'`],
  ['Senkrechtstrich', `'behoerden|advanceCare|${K}|x'`],
  ['Punktzugriff', `const z = tabelle.typen.${K}.zweck;`],
]) {
  test('[Form·pfad-segment·' + name + '] die Kennung als Pfad-Segment wird gefunden, wo ein Wert-Grep nichts sieht', () => {
    const t = formenIn(wurzel(), 'tests/fixtures/buergermodul-situationen-ab-werk.json', zeile + '\n');
    assert.equal(t.length, 1, zeile);
    assert.ok(t[0].formen.includes('pfad-segment'));
    assert.ok(!t[0].formen.includes('wert'), 'und kein quotierter Wert: genau die Lücke des Literal-Greps');
  });
}

test('[Orte] jeder feste Ort wird abgesucht — auch die drei Textsatz-Seeds und die Fixtures', () => {
  const root = wurzel();
  const orte = ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json', 'tools/textsatz-en-vollabdeckung-daten.js',
    'tools/textsatz-en-optionswerte-daten.js', 'tests/fixtures/erbschein-vorbereitung-logikmodul.json',
    'tools/rechtsraum-de-modul.json', 'docs/template-generator/submission-schema.json', 'vivodepot-template-generator.html'];
  for (const rel of orte) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    mit(root, rel, `"a.b/instrument/${K}.label": "x"\n`);
  }
  const r = W.finden(K, { root, grundlinie: grundlinie() });
  for (const rel of orte) assert.ok(r.treffer.some((t) => t.datei === rel), 'nicht abgesucht: ' + rel);
});

test('[Abgrenzung] Feld-Id-Bestandteil, Wizard-Id und Großschreibung sind KEIN Treffer (eigene Achsen)', () => {
  const t = formenIn(wurzel(), 'vivodepot.html',
    `const a = '${K}_ort';\nconst b = '${K}-erbe';\nconst c = 'x_${K}';\nconst d = '${K[0].toUpperCase() + K.slice(1)}';\nconst e = '${K}s';\n`);
  assert.deepEqual(t, []);
});

test('[Abbruch·Rot-Beweis] fehlt ein fester Ort, bricht der Prüfer laut ab (Exit 2), er meldet nicht „sauber"', () => {
  const root = wurzel();
  fs.unlinkSync(path.join(root, 'tools', 'rechtsraum-de-modul.json'));
  assert.throws(() => W.finden(K, { root, grundlinie: grundlinie() }), (e) => e instanceof W.Abbruch && /rechtsraum-de-modul/.test(e.message));
  const p = lauf([K, '--root', root, '--grundlinie', grundlinie()]);
  assert.equal(p.status, 2);
  assert.match(p.stderr, /ABBRUCH/);
});

test('[Abbruch·Rot-Beweis] ein leeres Verzeichnis (0 Dateien) ist ein Abbruch, kein stilles Grün', () => {
  const root = wurzel();
  for (const n of fs.readdirSync(path.join(root, 'tools', 'bereich-templates'))) fs.unlinkSync(path.join(root, 'tools', 'bereich-templates', n));
  assert.throws(() => W.finden(K, { root, grundlinie: grundlinie() }), W.Abbruch);
});

test('[Abbruch·Rot-Beweis] eine nicht lesbare Datei ist ein Abbruch', () => {
  // Als root ist chmod 000 wirkungslos; kein test-skip (die Skip-Ratsche zählt jede Aussetzung), die Probe entfällt dann.
  if (process.getuid && process.getuid() === 0) return;
  const root = wurzel();
  const p = path.join(root, 'vivodepot.html');
  fs.chmodSync(p, 0o000);
  try { assert.throws(() => W.finden(K, { root, grundlinie: grundlinie() }), (e) => e instanceof W.Abbruch && /nicht lesbar/.test(e.message)); }
  finally { fs.chmodSync(p, 0o644); }
});

test('[Abbruch·Rot-Beweis] eine fehlende Grundlinie ist ein Abbruch', () => {
  assert.throws(() => W.finden(K, { root: wurzel(), grundlinie: '/nicht/vorhanden.json' }), W.Abbruch);
});

test('[Grundlinie] ein ungeführter Treffer ist Exit 1; geführt (namentlich) Exit 0 und weiter sichtbar', () => {
  const root = wurzel();
  mit(root, 'vivodepot.html', `const a = { alt: '${K}', neu: 'x' };\n`);
  assert.equal(lauf([K, '--root', root, '--grundlinie', grundlinie()]).status, 1);
  const gl = grundlinie({ [K]: [{ datei: 'vivodepot.html', enthaelt: "alt: '" + K + "'", grund: 'Alt-Seite der Übersetzungstabelle' }] });
  const p = lauf([K, '--root', root, '--grundlinie', gl]);
  assert.equal(p.status, 0, p.stdout + p.stderr);
  assert.match(p.stdout, /geführt.*Alt-Seite der Übersetzungstabelle/, 'die Stelle wird weiter benannt, nicht wegdefiniert');
});

test('[Grundlinie·Rot-Beweis] ein Eintrag, der nichts mehr trifft, macht den Lauf rot (Grundlinie veraltet)', () => {
  const root = wurzel();
  const gl = grundlinie({ [K]: [{ datei: 'vivodepot.html', enthaelt: 'gibt es nicht', grund: 'x' }] });
  const p = lauf([K, '--root', root, '--grundlinie', gl]);
  assert.equal(p.status, 1);
  assert.match(p.stdout, /GRUNDLINIE VERALTET/);
});

test('[Grundlinie·Rot-Beweis] ein Eintrag deckt nur seine Datei, nicht dieselbe Zeile anderswo', () => {
  const root = wurzel();
  mit(root, 'vivodepot.html', `const a = { alt: '${K}' };\n`);
  mit(root, 'vivodepot-lesen.html', `const a = { alt: '${K}' };\n`);
  const gl = grundlinie({ [K]: [{ datei: 'vivodepot.html', enthaelt: "alt: '" + K + "'", grund: 'x' }] });
  const r = W.finden(K, { root, grundlinie: gl });
  assert.equal(r.ungefuehrt.length, 1);
  assert.equal(r.ungefuehrt[0].datei, 'vivodepot-lesen.html');
});

test('[Selbstscan] das Werkzeug und dieser Test stehen in den festen Orten — keine Selbstausnahme', () => {
  const dateien = W.ORTE.map((o) => o.datei).filter(Boolean);
  assert.ok(dateien.includes('tools/kennung-vorkommen-finden.js'));
  assert.ok(dateien.includes('tests/kennung-vorkommen-finden.test.js'));
  const quelltext = fs.readFileSync(WERKZEUG, 'utf8');
  assert.ok(!/__filename/.test(quelltext.replace(/require\.main === module/g, '')), 'kein Pfadvergleich gegen sich selbst im Scanner');
});

test('[Mehrpfad] eine Tabelle mit zwei Lesestellen wird gemeldet, eine mit einer nicht', () => {
  const root = wurzel();
  mit(root, 'vivodepot.html',
    `const MEHR = Object.freeze([{ typ: '${K}' }]);\nfunction a() { return MEHR.map(x => x); }\nfunction b() { return MEHR.length; }\n`
    + `const EINE = Object.freeze([{ typ: '${K}' }]);\nfunction c() { return EINE.length; }\n`);
  const r = W.finden(K, { root, grundlinie: grundlinie(), mehrpfad: true });
  assert.deepEqual(r.mehrpfad.map((m) => m.tabelle), ['MEHR']);
  assert.equal(r.mehrpfad[0].leserZeilen.length, 2);
});

test('[Bestand] alle umbenannten Codes: jeder Treffer ist geführt, keine Grundlinie veraltet', () => {
  const ALLE = [['test', 'ament'], ['bank', 'vollmacht'], ['vorsorge', 'vollmacht'], ['patienten', 'verfuegung'], ['betreuungs', 'verfuegung'],
    ['sorgerechts', 'verfuegung'], ['betreuer', 'bestellung'], ['ehegatten', 'notvertretung']].map((t) => t.join(''));
  for (const alt of ALLE) {
    const r = W.finden(alt);
    assert.deepEqual(r.ungefuehrt, [], alt + ': ungeführte Vorkommen:\n' + r.ungefuehrt.map((t) => t.datei + ':' + t.zeile + ' ' + t.text).join('\n'));
    assert.deepEqual(r.veraltet, [], alt + ': Grundlinie veraltet');
    assert.ok(r.gefuehrt.length >= 1, alt + ': die Alt-Seite der Übersetzung bzw. der historische Rest wird weiter gesehen');
  }
});

test('[Orte·rekursiv] eine Datei in einem Unterverzeichnis von tests/fixtures und tests/e2e wird gefunden', () => {
  const root = wurzel();
  fs.mkdirSync(path.join(root, 'tests', 'fixtures', 'unter', 'tief'), { recursive: true });
  mit(root, 'tests/fixtures/unter/tief/beleg.json', `{ "x": "${K}" }\n`);
  fs.mkdirSync(path.join(root, 'tests', 'e2e', 'a'), { recursive: true });
  mit(root, 'tests/e2e/a/spec.js', `const a = '${K}';\n`);
  const r = W.finden(K, { root, grundlinie: grundlinie() });
  assert.ok(r.treffer.some((t) => t.datei === 'tests/fixtures/unter/tief/beleg.json'));
  assert.ok(r.treffer.some((t) => t.datei === 'tests/e2e/a/spec.js'));
});

test('[Grundlinie·Wildcard] "*" deckt eine ganze eingefrorene Datei, aber nur diese Datei — und bleibt sichtbar als geführt', () => {
  const root = wurzel();
  fs.mkdirSync(path.join(root, 'tests', 'fixtures'), { recursive: true });
  mit(root, 'tests/fixtures/beleg-a.json', `"${K}"\n"${K}"\n`);
  mit(root, 'tests/fixtures/beleg-b.json', `"${K}"\n`);
  const gl = grundlinie({ [K]: [{ datei: 'tests/fixtures/beleg-a.json', enthaelt: '*', grund: 'eingefroren' }] });
  const r = W.finden(K, { root, grundlinie: gl });
  assert.equal(r.gefuehrt.length, 2);
  assert.equal(r.ungefuehrt.length, 1);
  assert.equal(r.ungefuehrt[0].datei, 'tests/fixtures/beleg-b.json');
});
