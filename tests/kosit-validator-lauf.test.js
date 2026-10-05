'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Prüferlauf für die XML-Ausgabe nach einem FIM-Leistungsschema — gegen den KoSIT-Validator 1.6.3 (U2-ADR-465)
   ────────────────────────────────────────────────────────────────────────
   In der Suite mit der ERFUNDENEN Leistung S99000001 (tests/fixtures/fim-schema/S99000001-antrag.xsd, -format-modul.json):
   der Kern schreibt die Datei über das Format-Modul, der KoSIT-Validator prüft sie gegen das XSD. Fehlt das Werkzeug
   (nicht beschafft: node tools/kosit-beschaffen.mjs), steht der Lauf als `todo` — sichtbar, nie grün — ABER NUR im
   öffentlichen Klon (Weiche `kositWeiche`, Bedingung der Gegenlesung 05.10.2026). Auf dem Arbeitsrechner und auf der
   Air ist ein fehlender Validator ROT: dort ist er beschaffbar, ein stilles `todo` wäre ein Lauf, der nichts prüft.
   Bewusst KEINE Verzweigung auf GITHUB_ACTIONS: der Prüfrechner (Air) läuft selbst als Runner und gälte sonst als
   „todo erlaubt“.
   Den Bericht und die Szenario-Erzeugung prüft diese Datei ohne Werkzeug.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { istOeffentlich } = require('./helfer/nur-privat.js');

const ADAPTER = path.join(__dirname, 'konformitaet', 'adapter', 'kosit-validator.mjs');
/* Die Weiche: 'lauf' mit Werkzeug; ohne Werkzeug 'todo' nur im öffentlichen Klon (keine Privat-Marke), sonst 'rot'.
   Rein, damit der Rot-Beweis unten sie ohne Umgebung prüfen kann. */
function kositWeiche(vorhanden, oeffentlich) {
  if (vorhanden) return 'lauf';
  return oeffentlich ? 'todo' : 'rot';
}
const OHNE_WERKZEUG_TODO = kositWeiche(false, istOeffentlich()) === 'todo';
const laden = async () => (await import(ADAPTER)).default;
after(async () => (await laden()).aufraeumen());

async function umgebungOderTodo(t) {
  const a = await laden();
  const v = a.vorhanden();
  if (!v.ok) {
    if (OHNE_WERKZEUG_TODO) t.todo('KoSIT ungemessen: ' + v.grund);
    else assert.fail('KoSIT-Validator fehlt auf einem Rechner, auf dem er beschaffbar ist: ' + v.grund);
  }
  return { a, v };
}

test('[KoSIT·Weiche·Rot-Beweis] todo nur im öffentlichen Klon — auf Arbeitsrechner und Air ist ein fehlender Validator rot', () => {
  assert.equal(kositWeiche(false, false), 'rot', 'Arbeitsrechner/Air ohne Jar: rot, nicht todo');
  assert.equal(kositWeiche(false, true), 'todo', 'öffentlicher Klon ohne Jar: todo');
  assert.equal(kositWeiche(true, true), 'lauf', 'mit Jar läuft er überall');
  assert.equal(kositWeiche(true, false), 'lauf');
  assert.throws(() => { if (kositWeiche(false, false) !== 'todo') assert.fail('fehlt'); }, /fehlt/,
    'außerhalb der Weiche wird der fehlende Validator zum Fehlschlag');
});

test('[KoSIT·Bericht] gelesen und gültig kommen aus dem Bericht, unabhängig vom Präfix der Namensräume', async () => {
  const { berichtLesen } = await import(ADAPTER);
  const kopf = (p, q) => '<' + p + 'createReportInput xmlns:' + (p || 'x:').slice(0, -1) + '="urn:c" xmlns:' + q.slice(0, -1) + '="urn:s">'
    + '<' + q + 'scenario><' + q + 'name>leistung</' + q + 'name></' + q + 'scenario>';
  const ende = (p) => '</' + p + 'createReportInput>';
  const gut = kopf('ns2:', 'ns3:') + '<ns2:validationResultsWellformedness/><ns2:validationResultsXmlSchema><ns3:resource/></ns2:validationResultsXmlSchema>' + ende('ns2:');
  assert.deepEqual(berichtLesen(gut), { gelesen: true, gueltig: true, fehler: [] });
  const schlecht = kopf('a:', 'b:') + '<a:validationResultsWellformedness/><a:validationResultsXmlSchema><a:xmlSyntaxError><a:message>cvc-x</a:message>'
    + '<a:severityCode>SEVERITY_ERROR</a:severityCode></a:xmlSyntaxError><a:xmlSyntaxError><a:message>nur Warnung</a:message>'
    + '<a:severityCode>SEVERITY_WARNING</a:severityCode></a:xmlSyntaxError></a:validationResultsXmlSchema>' + ende('a:');
  assert.deepEqual(berichtLesen(schlecht), { gelesen: true, gueltig: false, fehler: ['cvc-x'] }, 'eine Warnung ist kein Fehler');
});

test('[KoSIT·Bericht·Rot-Beweis] ohne Szenario oder ohne XSD-Abschnitt gibt es kein Urteil, kein geratenes Grün', async () => {
  const { berichtLesen } = await import(ADAPTER);
  assert.equal(berichtLesen('<createReportInput><validationResultsWellformedness/><validationResultsXmlSchema/></createReportInput>').gueltig, false, 'ohne Szenario');
  assert.equal(berichtLesen('<createReportInput><scenario></scenario><validationResultsWellformedness/></createReportInput>').gelesen, false, 'ohne XSD-Prüfung');
});

test('[KoSIT·Szenario] das Szenario greift am Namensraum des Schemas, die Fixture ist erfunden (Nummernkreis 99)', async () => {
  const { szenarioXml, schemaKopf, FIXTURE } = await import(ADAPTER);
  const k = schemaKopf(fs.readFileSync(FIXTURE.xsd, 'utf8'));
  assert.deepEqual(k, { ns: 'urn:xoev-de:xfall:standard:fim-s99000001_1.0', wurzel: 'fim.S99000001.00000001001000' });
  assert.match(szenarioXml(k.ns, 'leistung.xsd'), /<match>\/\*\[namespace-uri\(\) = 'urn:xoev-de:xfall:standard:fim-s99000001_1\.0'\]<\/match>/);
  const modul = JSON.parse(fs.readFileSync(FIXTURE.modul, 'utf8'));
  assert.equal(modul.wurzel, k.wurzel);
  assert.equal(modul.namensraum, k.ns);
  assert.match(modul.hinweis, /nicht einreichbar ohne Anhang/);
  assert.match(modul.label, /nicht einreichbar ohne Anhang/);
});

test('[KoSIT·Lauf] der KoSIT-Validator 1.6.3 ist beschafft', async (t) => {
  const { v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
});

test('[KoSIT·Lauf] die Datei des Kerns erfüllt das Schema der Leistung und trägt den Hinweis', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const [fall] = await a.artefakte();
  assert.equal(fall.herkunft, 'generator');
  assert.match(fs.readFileSync(fall.pfad, 'utf8'), /^<\?xml[^>]*\?>\n<!-- [^\n]*nicht einreichbar ohne Anhang -->\n/);
  const u = a.urteile(v, fall.pfad);
  assert.equal(u.gelesen, true, u.fehler.join(' | '));
  assert.equal(u.gueltig, true, u.fehler.join(' | '));
});

test('[KoSIT·Lauf·Rot-Beweis] fehlt ein Pflichtfeld im Depot, lehnt KoSIT die Datei ab — der Kern erfindet nichts', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const [fall] = await a.kaputt();
  const u = a.urteile(v, fall.pfad);
  assert.equal(u.gelesen, true, u.fehler.join(' | '));
  assert.equal(u.gueltig, false);
  assert.ok(u.fehler.some((f) => /cvc-complex-type/.test(f)), u.fehler.join(' | '));
});
