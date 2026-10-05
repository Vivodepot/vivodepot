'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Prüferlauf für die PDFs des Kerns — gegen veraPDF 1.30.1 (Befund PDF-A-3B)
   ────────────────────────────────────────────────────────────────────────
   Echte Kern-PDFs (tools/kern-pdfs-erzeugen.mjs: Vollmappe, Notfallkarte, Anlass) gegen PDF/A-3b. Fehlt das
   Werkzeug auf einer Maschine (nicht beschafft: node tools/verapdf-beschaffen.mjs), steht jeder Fall als `todo` —
   sichtbar, nie grün. Ist es da, gilt: jede Datei wird gelesen (fehlerfrei geparst), und sie verletzt genau die
   bekannten Klauseln. Eine neue Klausel ist ein Fund; eine weggefallene heißt, BEKANNTE_KLAUSELN im Adapter kürzen.
   Ist die Liste leer, sind die PDFs PDF/A-3b und der Befund geschlossen.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ADAPTER = path.join(__dirname, 'konformitaet', 'adapter', 'verapdf.mjs');
const laden = async () => (await import(ADAPTER)).default;
after(async () => (await laden()).aufraeumen());

async function umgebungOderTodo(t) {
  const a = await laden();
  const v = a.vorhanden();
  if (!v.ok) t.todo('veraPDF ungemessen: ' + v.grund);
  return { a, v };
}

test('[veraPDF·Bericht] der mrr-Bericht wird je Datei zu gelesen, konform und verletzten Klauseln', async () => {
  const { berichtLesen } = await import(ADAPTER);
  const xml = '<report><jobs>'
    + '<job><item size="1"><name>/t/a.pdf</name></item><validationReport jobEndStatus="normal" isCompliant="false">'
    + '<details><rule specification="ISO 19005-3:2012" clause="6.6.2.1" testNumber="1" status="failed" failedChecks="1"/>'
    + '<rule specification="ISO 19005-3:2012" clause="6.2.4.3" testNumber="2" status="failed" failedChecks="5"/>'
    + '<rule specification="ISO 19005-3:2012" clause="6.1.2" testNumber="1" status="passed"/></details></validationReport></job>'
    + '<job><item size="1"><name>/t/b.pdf</name></item><taskException type="PARSE" isExecuted="true" isSuccess="false"/></job>'
    + '</jobs></report>';
  const je = berichtLesen(xml);
  assert.deepEqual(je.get('/t/a.pdf'), { gelesen: true, konform: false, klauseln: ['6.2.4.3', '6.6.2.1'] });
  assert.equal(je.get('/t/b.pdf').gelesen, false, 'eine Parse-Ausnahme ist nicht gelesen');
});

test('[veraPDF·Lauf] veraPDF 1.30.1 ist beschafft', async (t) => {
  const { v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
});

test('[veraPDF·Lauf] jedes Kern-PDF wird gelesen und verletzt genau die bekannten Klauseln; die Korpusdatei ist PDF/A-3b', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const faelle = await a.artefakte();
  assert.equal(faelle.filter((f) => f.herkunft === 'kern').length, 3, 'Vorbedingung: drei Kern-PDFs');
  assert.ok(faelle.some((f) => f.erwartet === 'gueltig'), 'Vorbedingung: ein gültiger Positivfall (Korpus)');
  const urteile = a.urteileAlle(v, faelle.map((f) => f.pfad));
  for (const f of faelle) {
    const u = urteile.get(f.pfad);
    assert.equal(u.gelesen, true, f.name + ': nicht gelesen — ' + u.fehler.join(' | '));
    assert.deepEqual(u.klauseln, [...f.klauseln], f.name + ': verletzte Klauseln weichen ab — ' + u.fehler.join(' | '));
    assert.equal(u.gueltig, f.erwartet === 'gueltig', f.name);
  }
});

test('[veraPDF·Lauf·Negativkontrolle] ein abgeschnittenes PDF wird nicht gelesen, ein PDF ohne Ausstattung abgelehnt', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const k = a.abgeschnitten();
  assert.equal(a.urteile(v, k.pfad, k.standard).gelesen, false, 'veraPDF liest, was es nicht lesen dürfte: ' + k.warum);
  for (const f of await a.kaputt()) {
    const u = a.urteile(v, f.pfad, f.standard);
    assert.equal(u.gelesen, true, 'das Fixture muss lesbar sein');
    assert.equal(u.gueltig, false, f.warum);
  }
});
