'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorführung (AB_WERK_SHOWCASE, 15.09.2026) — ein gebackenes Beispiel-Depot,
   das nichts verlässt.
   ────────────────────────────────────────────────────────────────────────
   Zwei Kerne in einer Datei, mit Absicht:
     • der Ab-Werk-Kern (Block `null`) — er muss sich verhalten wie vorher;
     • eine gebackene Kopie in os.tmpdir() über tools/vorfuehrung-showcase-
       erzeugen.js — Start, Sperren, Schleife, Leerlauf.
   Der gebackene Kern wird über KERN_HTML_PATH geladen; load-kern.js liest den
   Pfad beim Laden des Moduls, darum wird es für den zweiten Kern frisch geladen.
   Zeit ist gemockt (node:test mock.timers) — kein Test wartet 90 Sekunden.
   ════════════════════════════════════════════════════════════════════════ */
const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const WERKZEUG = require('../tools/vorfuehrung-showcase-erzeugen.js');
const { ladeKern } = require(LOAD_KERN);
const PRODUKT = require('./produkt-html-erzeugen.js');

// Die Vorführung wird NIE auf dem blanken Kern gebaut (Regel im Kopf des Werkzeugs, 21.09.2026): Kern und Text kommen aus dem
// erzeugten Produkt.
const PRODUKT_DE_TEXT = fs.readFileSync(PRODUKT.produktHtml('privat-de'), 'utf8');

// Nutzlast und gebackene Kopie EINMAL, gegen das erzeugte Produkt.
const NUTZLAST_DE = WERKZEUG.vorfuehrungNutzlastErzeugen({ sprache: 'de', V: PRODUKT.kernAus(PRODUKT.produktHtml('privat-de')).V });
const GEBACKEN_PFAD = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-vorfuehrung-')), 'vivodepot.html');
// S8 (U2-ADR-428): die Vorführung wird in das deutsche Standardprodukt gebacken — das nackte Gerüst trägt keinen deutschen Satz.
fs.writeFileSync(GEBACKEN_PFAD, WERKZEUG.showcaseInKernBacken(
  fs.readFileSync(require('./produkt-html-erzeugen.js').produktHtml('privat-de'), 'utf8'), NUTZLAST_DE), 'utf8');

function ladeGebacken() {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = GEBACKEN_PFAD;
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern(); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}

function modal(k) {
  return String(k.document.getElementById('modal-inhalt').innerHTML || '');
}

// ── Ab Werk ──────────────────────────────────────────────────────────────

test('[Ab Werk] Block ist null, nichts ist gebacken, der Willkommensschirm bleibt der Einstieg', () => {
  const { V } = ladeKern();
  assert.equal(V.AB_WERK_SHOWCASE, null);
  assert.equal(V.vorfuehrungGebacken(), false);
  V.booteEingang();
  assert.equal(V.getData(), null, 'Kaltstart ohne Block legt kein Depot an');
  assert.equal(V.imVorfuehrung(), false);
});

test('[Ab Werk] Vorschau ohne Vorführung: Download führt weiter zum Passwort (unverändert)', async () => {
  const k = ladeKern();
  k.V.flowVorschauBetreten();
  assert.equal(k.V.imVorfuehrung(), false);
  const weg = await k.V.dateiAusgeben({ type: 'application/json', text: async () => '{}' }, 'x.json', 'application/json');
  assert.equal(weg, 'vorschau');
  assert.match(modal(k), /modal-logo/, 'der Passwort-Dialog öffnet sich wie bisher');
});

test('[Ab Werk·Rot-Beweis] die Freigabe der geschützten Angaben greift nie außerhalb der Vorführung — echtes Depot und Vorschau bekommen kein Bündel', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('ein-echtes-passwort-123');
  V.akteurSelbstErklaeren('Echte Person');
  V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [V.chipAusEingabe('icd10', 'Hypertonie')]);
  assert.equal(V.imVorfuehrung(), false);
  assert.equal(V.vorfuehrungFhirIpsBundle(), null, 'echtes Depot: keine Freigabe am Schritt der Bürgerin vorbei');
  V.flowVorschauBetreten();
  assert.equal(V.vorfuehrungFhirIpsBundle(), null, 'gewöhnliche Vorschau: ebenso nicht');
});

// ── Werkzeug ─────────────────────────────────────────────────────────────

test('[Werkzeug] zwei Läufe ergeben dieselbe Nutzlast (feste ids, keine Zeitstempel)', () => {
  const zweiter = WERKZEUG.vorfuehrungNutzlastErzeugen({ sprache: 'de', V: PRODUKT.kernAus(PRODUKT.produktHtml('privat-de')).V });
  assert.deepEqual(zweiter, NUTZLAST_DE);
  assert.doesNotMatch(JSON.stringify(NUTZLAST_DE), /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/, 'keine Zufalls-uuid');
  assert.equal(NUTZLAST_DE.depot.urheberschaft, undefined, 'Urheberschafts-Stempel gehören nicht in die Nutzlast');
});

test('[Werkzeug] Beispielperson über die Kennungen des Kerns, codiert aus den mitgeführten Listen', () => {
  const s = NUTZLAST_DE.depot.sektoren;
  assert.equal(s.identity.givenName, 'Mira');
  assert.equal(s.health.allergiesMedicationFoodOther[0].code.code, '91936005');
  assert.equal(s.health.medicationOngoing[0].code.code, 'C09AA05');
  assert.equal(s.health.chronicConditionsDiagnoses[0].code.code, 'I10');
  assert.equal(s.advanceCare.provisionInstruments[0].instrument, 'enduring-power-of-attorney');
  assert.equal(s.advanceCare.provisionInstruments[0].typeOfPowerOfAttorney, 'vorsorge', 'Pflichtfeld — sonst meldet der Anlass „unstimmig"');
});

test('[Werkzeug] jedes Feld der Beispielperson besteht feldValidieren — kein „unstimmig" am Stand', () => {
  const { V } = ladeKern();
  WERKZEUG.showcaseNutzlastErzeugen({ V });
  const funde = [];
  for (const [sektor, felder] of Object.entries(V.getData().sektoren)) {
    for (const [feld, wert] of Object.entries(felder)) {
      const r = V.feldValidieren(V.feldDefFuer(sektor, feld), wert);
      if (!r.ok) funde.push(sektor + '.' + feld + ': ' + JSON.stringify(r));
    }
  }
  assert.deepEqual(funde, []);
});

test('[Werkzeug·Rot-Beweis] unbekannte Kennung, erfundener Code, unbekannte Ansicht → wirft', () => {
  const daten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'vorfuehrung', 'showcase-depot.json'), 'utf8'));
  assert.throws(() => WERKZEUG.showcaseNutzlastErzeugen({ V: PRODUKT.kernAus(PRODUKT.produktHtml('privat-de')).V, daten: { ...daten, fields: { 'identity.gibtEsNicht': 'x' } } }), /unbekannt/);
  assert.throws(() => WERKZEUG.showcaseNutzlastErzeugen({ V: PRODUKT.kernAus(PRODUKT.produktHtml('privat-de')).V, daten: { ...daten, fields: { 'health.medicationOngoing': [{ codeListe: 'atc', text: 'Levothyroxin' }] } } }), /kein erfundener Code/);
  const szenen = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'vorfuehrung', 'showcase-szenen.json'), 'utf8'));
  assert.throws(() => WERKZEUG.vorfuehrungNutzlastErzeugen({ V: PRODUKT.kernAus(PRODUKT.produktHtml('privat-de')).V, szenen: { ...szenen, stationen: [{ ansicht: 'bilder', text: { de: 'x' } }] } }), /kennt der Kern nicht/);
});

test('[Werkzeug] keine Fixture-Person der Suite in der Vorführung', () => {
  const text = JSON.stringify(NUTZLAST_DE);
  for (const name of ['Wredenhagen', 'Sonnenschein', 'Musterfrau', 'Mustermann']) {
    assert.ok(!text.includes(name), name + ' gehört nicht in die Vorführung');
  }
});

// ── Werkzeug: nie auf dem blanken Kern ──────────────────────────

// Bereichsquellen einer erzeugten Datei: die Bereiche (id → Definition), die sie WIRKLICH trägt (nicht die, die der Test-Lader von der Platte kennt).
function gebackeneBereiche(text) {
  const P = require('../tools/lib/produkt-text-erzeugen.js');
  const region = P.AB_WERK_REGIONEN.find((r) => r.kennung === 'AB_WERK_BEREICH_QUELLEN');
  const sp = P._regionSpanne(text, region, 'Vorführdatei');
  const literal = text.slice(sp.innenStart, sp.innenEnde).replace(/^\s*const AB_WERK_BEREICH_QUELLEN = /, '').replace(/;\s*$/, '');
  return Object.assign({}, ...JSON.parse(literal).map((m) => m.bereiche || {}));
}

test('[Werkzeug·Rot-Beweis] der blanke Kern und ein fehlendes Produkt werden abgewiesen, nicht still gebaut', () => {
  const blank = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.throws(() => WERKZEUG.vorfuehrungDateiErzeugen({ sprache: 'de', produktText: blank }), /blanke Kern/);
  assert.throws(() => WERKZEUG.vorfuehrungDateiErzeugen({ sprache: 'de' }), /Kein Produkt/);
  assert.throws(() => WERKZEUG.vorfuehrungNutzlastErzeugen({ sprache: 'de' }), /V fehlt/);
});

test('[Werkzeug] die erzeugte Vorführdatei trägt die Bereichsfelder ihrer Stationen — Felder, nicht nur Titel', () => {
  for (const sprache of ['de', 'en']) {
    const produktText = fs.readFileSync(PRODUKT.produktHtml('privat-' + sprache), 'utf8');
    const { text, nutzlast } = WERKZEUG.vorfuehrungDateiErzeugen({ sprache, produktText });
    const bereiche = gebackeneBereiche(text);
    assert.ok(Object.keys(bereiche).length > 0, sprache + ': die Datei trägt gebackene Bereichsquellen');
    for (const st of nutzlast.stationen.filter((x) => x.ansicht === 'bereich')) {
      assert.ok(bereiche[st.ziel], sprache + ': Bereich „' + st.ziel + '" steht als Feldsatz in der Datei');
    }
    // Und jedes Feld des Beispieldepots steht in der Definition seines Bereichs — Feld, nicht Titel. Statisch am Text: die Datei
    // wird nicht gebootet (ein gebootetes Vorführprodukt hält mit seiner Schleife den Testprozess offen).
    const daten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'vorfuehrung', 'showcase-depot.json'), 'utf8'));
    for (const kennung of [...Object.keys(daten.fields || {}), ...Object.keys(daten.lists || {})]) {
      const [sektor, feld] = kennung.split('.');
      if (!bereiche[sektor]) continue;   // Bereiche außerhalb der Module (nativ im Gerüst) prüft feldValidieren beim Bau
      assert.ok(JSON.stringify(bereiche[sektor].sektionen).includes('"id":"' + feld + '"'), sprache + ': Feld ' + kennung + ' steht in der Bereichsdefinition der Datei');
    }
  }
});

test('[Werkzeug·Rot-Beweis] ein Beispieldepot mit ungültigem Auswahlwert besteht die Feldprüfung nicht (Gerdas „vorsorgevollmacht", 21.09.2026)', () => {
  const daten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'vorfuehrung', 'showcase-depot.json'), 'utf8'));
  const schlecht = JSON.parse(JSON.stringify(daten));
  schlecht.lists['advanceCare.provisionInstruments'][0].instrument = 'vorsorgevollmacht';
  assert.throws(() => WERKZEUG.showcaseNutzlastErzeugen({ V: PRODUKT.kernAus(PRODUKT.produktHtml('privat-de')).V, daten: schlecht }), /Feldprüfung nicht/);
});

test('[Werkzeug·Rot-Beweis] Produkt und Sprache müssen zusammenpassen', () => {
  assert.throws(() => WERKZEUG.vorfuehrungDateiErzeugen({ sprache: 'en', produktText: PRODUKT_DE_TEXT }), /dieselbe Sprache/);
});

// ── Gebacken ─────────────────────────────────────────────────────────────

test('[Gebacken] Kaltstart geht in die Vorführung: Vorschau-Zustand mit Beispieldaten, Schleife läuft', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());
  const fehler = [];
  const echt = console.error;
  console.error = (...a) => { fehler.push(a.map(String).join(' ')); };
  t.after(() => { console.error = echt; });
  const { V } = ladeGebacken();
  assert.equal(V.vorfuehrungGebacken(), true);
  V.booteEingang();
  assert.equal(V.imVorfuehrung(), true);
  assert.equal(V.imVorschau(), true, 'alle Vorschau-Sperren gelten weiter');
  assert.equal(V.getData().sektoren.identity.givenName, 'Mira');
  assert.equal(V.vorfuehrungSchleifeLaeuft(), true);
  mock.timers.tick(8000 * NUTZLAST_DE.stationen.length);
  assert.equal(V.vorfuehrungSchleifeLaeuft(), true, 'die Schleife läuft rund, alle Stationen ohne Wurf');
  assert.deepEqual(fehler.filter((f) => f.includes('[Vorführung]')), [], 'keine Station wirft');
});

test('[Gebacken] Sperren: Passwort setzen, Übernehmen, Depot anlegen, Modul-Einlass', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());
  const k = ladeGebacken();
  const { V } = k;
  V.booteEingang();
  V.vorfuehrungSchleifeBeenden();
  for (const [name, aufruf] of [['flowPasswortSetzen', () => V.flowPasswortSetzen()],
    ['flowVorschauUebernehmen', () => V.flowVorschauUebernehmen()],
    ['flowDepotAnlegen', () => V.flowDepotAnlegen()]]) {
    k.document.getElementById('modal-inhalt').innerHTML = '';
    aufruf();
    assert.equal(modal(k), '', name + ' öffnet in der Vorführung keinen Dialog');
    assert.equal(V.imVorfuehrung(), true, name + ' verlässt die Vorführung nicht');
  }
  assert.equal(V.modulEinlassen('{}').grund, 'vorfuehrung');
});

test('[Gebacken] Download: ansehen ja, herunterladen nein — kein Passwort-Dialog, der Inhalt wird gezeigt', async (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());
  const k = ladeGebacken();
  k.V.booteEingang();
  k.V.vorfuehrungSchleifeBeenden();
  const weg = await k.V.dateiAusgeben({ type: 'application/json', text: async () => '{"resourceType":"Bundle"}' }, 'x.json', 'application/json');
  await new Promise((r) => setImmediate(r));
  assert.equal(weg, 'vorschau');
  assert.doesNotMatch(modal(k), /modal-logo/, 'kein Passwort-Dialog');
  assert.match(modal(k), /resourceType/);
});

test('[Gebacken] FHIR-IPS-Station trägt Allergie, Medikation und Diagnose der Beispielperson — nicht „No diagnoses recorded"', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());
  const { V } = ladeGebacken();
  V.booteEingang();
  V.vorfuehrungSchleifeBeenden();
  const codes = V.vorfuehrungFhirIpsBundle().entry
    .map((e) => e.resource)
    .flatMap((r) => ((r.code && r.code.coding) || []).map((c) => r.resourceType + ':' + c.code));
  assert.ok(codes.includes('Condition:I10'), 'Diagnose I10 fehlt: ' + codes.join(', '));
  assert.ok(codes.includes('AllergyIntolerance:91936005'), 'Allergie fehlt: ' + codes.join(', '));
  const auszug = V.vorfuehrungFhirAuszug(V.vorfuehrungFhirIpsBundle());
  assert.deepEqual([...new Set(auszug.entry.map((e) => e.resource.resourceType))].sort(), ['AllergyIntolerance', 'Condition', 'MedicationStatement', 'Provenance']);
  assert.ok(auszug.meta.profile.some((p) => /Bundle-uv-ips/.test(p)), 'die Profile stehen im Auszug');
});

test('[Gebacken] Leerlauf: nach 90 s ohne Berührung zurück auf die gebackenen Daten, Schleife wieder an', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());
  const { V } = ladeGebacken();
  V.booteEingang();
  V.vorfuehrungSchleifeBeenden();
  assert.equal(V.vorfuehrungSchleifeLaeuft(), false);
  V.getData().sektoren.identity.givenName = 'Geändert';
  mock.timers.tick(89000);
  assert.equal(V.getData().sektoren.identity.givenName, 'Geändert', 'vor Ablauf bleibt die Bedienung stehen');
  mock.timers.tick(2000);
  assert.equal(V.getData().sektoren.identity.givenName, 'Mira');
  assert.equal(V.vorfuehrungSchleifeLaeuft(), true);
});

test('[Gebacken·Rot-Beweis] eine Berührung verschiebt den Leerlauf', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());
  const { V } = ladeGebacken();
  V.booteEingang();
  V.vorfuehrungSchleifeBeenden();
  mock.timers.tick(60000);
  V.vorfuehrungBeruehrt();
  mock.timers.tick(60000);
  assert.equal(V.vorfuehrungSchleifeLaeuft(), false, '120 s seit Start, aber nur 60 s seit der letzten Berührung');
});
