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
  // U2-ADR-465 Nachtrag: jeder Pflicht-Anhang ist über eine Rolle zugeordnet, also trägt das Modul keinen Hinweis mehr
  assert.ok(modul.zuordnung.some((z) => z.anhang && z.pflicht), 'die erfundene Leistung hat einen Pflicht-Anhang');
  assert.equal(modul.hinweis, undefined);
});

test('[KoSIT·Lauf] der KoSIT-Validator 1.6.3 ist beschafft', async (t) => {
  const { v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
});

test('[KoSIT·Lauf] die Datei des Kerns mit eingebetteten Anhängen erfüllt das Schema der Leistung', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const [fall] = await a.artefakte();
  assert.equal(fall.herkunft, 'generator');
  // KoSIT prüft hier den Rest der Datei: die Anhang-Elemente sind xs:anyType. Rundlauf und Base64-Form: tests/fim-anhang.test.js
  // Die Form des Pflicht-Anhangs kennt nur die erfundene Leistung; im echten Lauf (VD_FIM_*) urteilt KoSIT allein.
  if (!a.echt()) assert.match(fs.readFileSync(fall.pfad, 'utf8'), /<F99000011>[A-Za-z0-9+/=]+<\/F99000011>/, 'der Pflicht-Anhang steht in der Datei');
  const u = a.urteile(v, fall.pfad);
  assert.equal(u.gelesen, true, u.fehler.join(' | '));
  assert.equal(u.gueltig, true, u.fehler.join(' | '));
});

/* M4 (05.11.2026): der Weg der Person. Das Modul kommt als signiertes Bündel über den geprüften Einlass ins Depot (Anker und
   Anbieter-Schlüssel erzeugt die Probe zur Laufzeit), der Kanal aus den Ausgabeformaten des Depots; kein gesetzter Beleg. */
test('[KoSIT·Einlass] das signiert eingelassene Modul gibt einen Kanal, und seine Datei aus dem Depot erfüllt das Schema der Leistung', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const fall = await a.einlassArtefakt();
  assert.deepEqual(fall.gruende.filter((g) => 'einlass' in g), [{ einlass: true, grund: null }], 'der geprüfte Einlass nimmt das Bündel an');
  assert.ok(fall.pfad, 'der Kanal schreibt eine Datei: ' + JSON.stringify(fall.gruende));
  const u = a.urteile(v, fall.pfad);
  assert.equal(u.gelesen, true, u.fehler.join(' | '));
  assert.equal(u.gueltig, true, u.fehler.join(' | '));
});

test('[KoSIT·Einlass·Rot-Beweis] unsigniert eingelassen gibt ein Modul mit fremdem Namensraum keinen Kanal und keine Datei', async () => {
  const a = await laden();
  const fall = await a.einlassArtefakt({ signiert: false });
  assert.match(String(fall.namensraum), /^urn:xoev-de:/, 'das Modul behauptet einen fremden Standard');
  assert.deepEqual(fall.gruende.filter((g) => 'einlass' in g), [{ einlass: true, grund: null }],
    'das Modul liegt im Depot — es fehlt allein der Kanal, nicht der Einlass');
  assert.equal(fall.pfad, null, 'ohne Signatur kein Kanal: ' + JSON.stringify(fall.gruende));
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

test('[KoSIT·Lauf·Rot-Beweis] ohne den Pflicht-Anhang lehnt KoSIT die Datei ab', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const [fall] = await a.ohnePflichtAnhang();
  assert.ok(fall, 'das Modul hat einen Pflicht-Anhang oder ein Pflicht-Element `leer`');
  if (!a.echt()) assert.equal(fall.element, 'F99000011');
  const u = a.urteile(v, fall.pfad);
  assert.equal(u.gelesen, true, u.fehler.join(' | '));
  assert.equal(u.gueltig, false);
  assert.ok(u.fehler.some((f) => f.includes(fall.element)), fall.element + ' nicht gemeldet: ' + u.fehler.join(' | '));
});

/* U2-ADR-465 Nachtrag (W6, 04.11.2026): Gleichlauf der Vorprüfung des Kerns mit KoSIT an der erfundenen Leistung. Die gültige Datei
   ist bei beiden grün; jede verdorbene Datei nennt die Vorprüfung mit Feld und Grund, und KoSIT lehnt sie ebenso ab. Verdorben wird
   über das Depot (Länge, Muster, Pflicht) oder über einen festen Wert bzw. die Folge im Modul (Aufzählung, Bereich, Typ, Reihenfolge). */
test('[KoSIT·Vorprüfung] die Vorprüfung des Kerns läuft mit KoSIT gleich: gültig bei beiden, jede verdorbene Datei bei beiden rot', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const { kernDatei, FIXTURE } = await import(ADAPTER);
  const modul = JSON.parse(fs.readFileSync(FIXTURE.modul, 'utf8'));
  const fest = (ziel, wert) => Object.assign({}, modul, { zuordnung: modul.zuordnung.map((z) => (z.ziel === ziel ? { fest: wert, ziel } : z)) });
  const getauscht = Object.assign({}, modul, { zuordnung: [modul.zuordnung[1], modul.zuordnung[0], ...modul.zuordnung.slice(2)] });
  const werte = { 'identity.familyName': 'Muster', 'identity.givenName': 'Erika' };
  const faelle = [
    { name: 'gut', modul, opt: {}, erwartet: null },
    { name: 'laenge', modul, opt: { werte: Object.assign({}, werte, { 'identity.familyName': 'M'.repeat(41) }) }, erwartet: 'G99000002.F99000003:laenge' },
    { name: 'muster', modul, opt: { werte: Object.assign({}, werte, { 'identity.givenName': 'erika' }) }, erwartet: 'G99000002.F99000004:muster' },
    { name: 'pflicht', modul, opt: { werte, ohne: ['familyName'] }, erwartet: 'G99000002.F99000003:pflicht' },
    { name: 'werte', modul: fest('G99000002.F99000005', 'vielleicht'), opt: {}, erwartet: 'G99000002.F99000005:werte' },
    { name: 'bereich', modul: fest('G99000002.F99000012', '12'), opt: {}, erwartet: 'G99000002.F99000012:bereich' },
    { name: 'typ', modul: fest('G99000002.F99000012', 'drei'), opt: {}, erwartet: 'G99000002.F99000012:typ' },
    { name: 'reihenfolge', modul: getauscht, opt: {}, erwartet: 'G99000002.F99000003:reihenfolge' },
  ];
  for (const f of faelle) {
    f.aus = {};
    f.pfad = await kernDatei(f.modul, 'vorpruefung-' + f.name, Object.assign({ werte }, f.opt, { aus: f.aus }));
    assert.ok(f.pfad, f.name + ': der Kern schreibt die Datei');
    const vp = f.aus.vorpruefung;
    assert.ok(vp, f.name + ': die Vorprüfung lief');
    assert.deepEqual(vp.nichtVorgeprueft, [], f.name);
    if (f.erwartet === null) assert.deepEqual(vp.fehler, [], f.name + ': ' + JSON.stringify(vp.fehler));
    else assert.deepEqual(vp.fehler.map((x) => x.ziel + ':' + x.grund), [f.erwartet], f.name);
  }
  const urteile = a.urteileAlle(v, faelle.map((f) => f.pfad));
  for (const f of faelle) {
    const u = urteile.get(f.pfad);
    assert.equal(u.gelesen, true, f.name + ': ' + u.fehler.join(' | '));
    assert.equal(u.gueltig, f.erwartet === null, f.name + ' — KoSIT: ' + u.fehler.join(' | '));
  }
});

test('[KoSIT·XSD-Muster] ein Muster mit `$` am Ende lehnt eine übliche Adresse ab; die Gegenprobe ohne `$` nimmt sie an (Rot-Beweis)', async (t) => {
  const { v } = await umgebungOderTodo(t);
  if (!v.ok) return;
  const { messen } = await import(path.join(__dirname, '..', 'tools', 'xsd-muster-messen.mjs'));
  const r = await messen({ werte: ['anna@example.de', 'anna@example.de$'] });
  assert.equal(r.ok, true, 'jeder Wert hat ein Urteil');
  const urteil = (el) => Object.fromEntries(r.ergebnisse.find((e) => e.elemente.includes(el)).werte.map((w) => [w.wert, w.gueltig]));
  assert.deepEqual(urteil('X99000001'), { 'anna@example.de': false, 'anna@example.de$': true }, 'Muster mit wörtlichem $');
  assert.deepEqual(urteil('X99000002'), { 'anna@example.de': true, 'anna@example.de$': false }, 'Gegenprobe ohne $');
});
