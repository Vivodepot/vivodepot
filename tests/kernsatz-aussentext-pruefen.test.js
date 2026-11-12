'use strict';
/* Kernsatz in Außentexten (04.11.2026). Entschieden ist: nachbaubar ist der Kern, nicht die Produkte. Das Werkzeug
   tools/kernsatz-aussentext-pruefen.js meldet „Open Source“, „Quelltext ist offen“, „source code is open“ und „quelloffen“,
   wenn derselbe Satz den Kern nicht nennt, dazu „Anhang III“ und „Wir behandeln Vivodepot als“ ohne Ausnahme. Gelesen werden
   sichtbarer Text, Meta-Attribute und JSON-LD.
   ROT-BEWEIS: die schlechte Fixture trägt die Sätze, die nach dem Upload vom 04.11.2026 live standen, und jede wird gemeldet —
   auch dann, wenn der Kern im Satz DANEBEN steht. Die gute Fixture trägt die erlaubten Formen und bleibt ohne Fund. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const K = require('../tools/kernsatz-aussentext-pruefen.js');

const FIX = path.join(__dirname, 'fixtures', 'kernsatz-aussentext');
const WERKZEUG = path.join(__dirname, '..', 'tools', 'kernsatz-aussentext-pruefen.js');
const kurz = (fs) => fs.map((f) => f.muster + ' | ' + f.satz);

test('[Kernsatz·Rot-Beweis] die schlechte Fixture: jede Aussage ohne Kern wird gemeldet, an jeder Stelle der Seite', () => {
  assert.deepEqual(kurz(K.pruefen([path.join(FIX, 'schlecht')])).sort(), [
    'anhang-iii | Wir behandeln Vivodepot als wichtiges Produkt der Klasse I (CRA, Anhang III Nr.',
    'behandeln-als | Wir behandeln Vivodepot als wichtiges Produkt der Klasse I (CRA, Anhang III Nr.',
    'open-source | Beispielseite – Open Source, Mission und Konzept',
    'open-source | Datei, offline, ohne Konto, EUPL, Open Source',
    'open-source | Kostenlos · ohne Konto · Open Source',
    'open-source | Offene Standards, signierte Vorlagen, Open Source (EUPL-1.2).',
    'open-source | Open Source · Mission · Konzept',
    'open-source | Vivodepot ist Open Source und folgt diesem Gedanken.',
    'quelltext-offen | Der Quellcode der Anwendung ist offen.',
    'quelltext-offen | Der Quelltext ist offen (EUPL-1.2).',
    'source-code-open | The source code is open (EUPL-1.2).',
  ]);
});

test('[Kernsatz] die gute Fixture: Kern im selben Satz, Eigennamen Dritter, Stil, Kommentar und Skript zählen nicht', () => {
  assert.deepEqual(K.pruefen([path.join(FIX, 'gut')]), []);
});

test('[Kernsatz·Satzgrenze] der Kern zählt nur im selben Satz; Inline-Tags trennen keinen Satz, Block-Tags schon', () => {
  assert.deepEqual(kurz(K.funde('<p>Der Quelltext ist offen. Der Kern ist es auch.</p>')), ['quelltext-offen | Der Quelltext ist offen.']);
  assert.deepEqual(K.funde('<p>Der Quelltext des <em>Kerns</em> ist offen.</p>'), []);
  assert.deepEqual(kurz(K.funde('<div>Kern</div><div>Open Source</div>')), ['open-source | Open Source']);
  assert.deepEqual(K.funde('<p>Open Source im core.</p>'), []);
  assert.deepEqual(kurz(K.funde('Absatz eins über den Kern.\n\nOpen Source.', 'md')), ['open-source | Open Source.']);
  assert.deepEqual(kurz(K.funde('<p>Open&nbsp;Source</p>')), ['open-source | Open Source'], 'Entitäten werden gelesen');
  assert.deepEqual(kurz(K.funde('<p>Eine open-source Lösung.</p>')), ['open-source | Eine open-source Lösung.']);
});

test('[Kernsatz·CLI] Exit 1 mit Fund, 0 ohne Argument (gute Fixture), 2 bei falschem Aufruf', () => {
  const lauf = (args) => { try { execFileSync(process.execPath, [WERKZEUG, ...args], { stdio: 'pipe' }); return 0; } catch (e) { return e.status; } };
  assert.equal(lauf([]), 0);
  assert.equal(lauf(['--dokument', path.join(FIX, 'schlecht')]), 1);
  assert.equal(lauf(['--unbekannt']), 2);
  assert.equal(lauf(['--dokument', path.join(FIX, 'gibt-es-nicht')]), 2);
});

/* Ausnahmen (Wort vom 2026-11-04): je Fundstelle ein wörtlicher Satzteil einer Werkbeschreibung auf der Literaturseite. */
const AUSNAHMEN_DECKEL = 12;
test('[Kernsatz·Ausnahmen·Rot-Beweis] nur der wörtliche Satzteil auf literatur.html ist frei; ein neuer Satz über Vivodepot dort bleibt rot', () => {
  const zitat = K.AUSNAHMEN[0].satzteil + ', aus europäischer Sicht.';
  assert.deepEqual(K.funde('<p>' + zitat + '</p>', 'html', '/x/literatur.html'), []);
  assert.equal(K.funde('<p>' + zitat + '</p>', 'html', '/x/index.html').length, 1, 'auf einer anderen Seite gilt die Ausnahme nicht');
  assert.equal(K.funde('<p>' + zitat + '</p>').length, 1, 'ohne Dateinamen gilt keine Ausnahme');
  assert.deepEqual(kurz(K.funde('<p>' + zitat + '</p><p>Vivodepot ist Open Source.</p>', 'html', '/x/literatur.html')), ['open-source | Vivodepot ist Open Source.']);
});

test('[Kernsatz·Ausnahmen] genau so viele Einträge wie der Deckel, jeder mit Grund „Werk Dritter“, jeder trifft die gute Fixture', () => {
  assert.equal(K.AUSNAHMEN.length, AUSNAHMEN_DECKEL, 'eine neue Ausnahme braucht ein Wort und einen neuen Deckel');
  for (const a of K.AUSNAHMEN) {
    assert.ok(['literatur.html', 'souveraenitaet.html'].includes(a.datei), 'nur zwei Seiten: ' + a.datei);
    assert.match(a.grund, /^Werk Dritter\b/);
    if (a.datei === 'souveraenitaet.html') { assert.equal(a.genau, true, 'Kriteriumsname nur als ganzer Satz'); assert.equal(a.quelle, 'SOV-6.3'); }
    assert.ok(a.satzteil.length >= 20, 'ein Satzteil, kein einzelnes Wort: ' + a.satzteil);
  }
  const lit = K.AUSNAHMEN.filter((a) => a.datei === 'literatur.html');
  const text = require('node:fs').readFileSync(path.join(FIX, 'gut', 'literatur.html'), 'utf8');
  for (const a of lit) assert.ok(text.includes(a.satzteil), 'die Fixture trägt jeden Satzteil: ' + a.satzteil);
  // Ohne die Ausnahmen wäre jede Zeile der guten Literatur-Fixture ein Fund.
  assert.equal(K.funde(text).length, lit.length);
  const sov = require('node:fs').readFileSync(path.join(FIX, 'gut', 'souveraenitaet.html'), 'utf8');
  assert.equal(K.funde(sov).length, 2, 'ohne die Ausnahmen wären beide Kriteriumsnamen Funde');
});

test('[Kernsatz·Ausnahmen·SOV-6.3·Rot-Beweis] der Kriteriumsname ist nur auf souveraenitaet.html und nur als ganzer Satz frei', () => {
  const zelle = (t) => '<td>' + t + '</td>';
  assert.deepEqual(K.funde(zelle('Verfügbarkeit von Open Source') + zelle('Availability of open source'), 'html', '/x/souveraenitaet.html'), []);
  assert.deepEqual(kurz(K.funde(zelle('Verfügbarkeit von Open Source'), 'html', '/x/index.html')), ['open-source | Verfügbarkeit von Open Source'],
    'derselbe Satz auf einer anderen Seite bleibt ein Fund');
  assert.deepEqual(kurz(K.funde(zelle('Verfügbarkeit von Open Source ist bei Vivodepot gegeben.'), 'html', '/x/souveraenitaet.html')),
    ['open-source | Verfügbarkeit von Open Source ist bei Vivodepot gegeben.'], 'ein längerer Satz mit dem Namen bleibt ein Fund');
});
