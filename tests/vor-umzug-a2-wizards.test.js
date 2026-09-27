'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vor-Umzug-Golden-Master — Achse a2-wizards (U2-ADR-346)
   ────────────────────────────────────────────────────────────────────────
   Wörtlicher Spiegel von tests/vor-umzug-a3-dokumentmodule.test.js, für die
   Wizard-Achse statt der Dokumentmodul-Achse. Beantwortet dieselbe Frage,
   die keine Selbstvergleich-Probe beantworten kann: stimmt der ausgelieferte
   Text mit dem VOR dem Umzug (Commit 37038011, derselbe Anker wie A1/A3 —
   er liegt vor JEDEM der heutigen Bündel-Umzüge) überein?

   KEINE „depot"-Proben hier — absichtlich, s. Kopf-Kommentar in
   tools/lib/vor-umzug-achse-a2-wizards.js: die fünf migrierten Wizards
   (gebwiz/anamwiz/pflwiz/heirwiz/umzwiz) haben keine depot-abhängige
   Generator-Ausgabe, nur die „immer"-Achse hat hier einen Gegenstand.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { verlorene } = require('../tools/lib/vor-umzug-textwerte');
const { immerWerte: immerWerteA2 } = require('../tools/lib/vor-umzug-achse-a2-wizards');

// Seit S8 (U2-ADR-428) steht der deutsche Satz im gebackenen Produkt (Sprachmodul, kompakte JSON-Form), nicht im rohen Gerüst.
const KERN = require('./produkt-html-erzeugen.js').produktHtml('privat-de');
const FIXTURE_PFAD = path.join(__dirname, 'fixtures', 'vor-umzug-a2-wizards.json');

function fixtureLesen(pfad) {
  pfad = pfad || FIXTURE_PFAD;
  assert.ok(fs.existsSync(pfad),
    'Fixture fehlt: ' + pfad + ' — ohne sie ist diese Prüfung wirkungslos, kein stiller Erfolg.');
  const roh = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  assert.ok(roh.immerWerte && Array.isArray(roh.immerWerte.werte) && roh.immerWerte.werte.length > 0,
    'Fixture trägt keine immerWerte — leer wäre ein Erfolg ohne Prüfung.');
  return roh;
}

function mitTemporaerVeraendertemKern(transform, tun) {
  const original = fs.readFileSync(KERN, 'utf8');
  const veraendert = transform(original);
  const tmp = path.join(os.tmpdir(), 'vivodepot-vor-umzug-a2-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, veraendert, 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    return tun(require('./load-kern.js').ladeKern);
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(tmp);
  }
}

test('[Vor-Umzug·a2·Ausbeute] die Fixture trägt Provenienz (Commit, Datum) und Werte', () => {
  const fixture = fixtureLesen();
  assert.ok(fixture.quelleCommit, 'Fixture ohne Herkunfts-Commit');
  assert.ok(fixture.quelleCommitDatum, 'Fixture ohne Herkunfts-Datum');
  assert.equal(fixture.immerWerte.anzahl, fixture.immerWerte.werte.length);
});

test('[Vor-Umzug·a2·immer] der Wortlaut der fünf migrierten Wizards ist gegenüber dem Beleg (37038011) erhalten — 0 verloren', () => {
  const fixture = fixtureLesen();
  const { V } = ladeKern();
  const aktuell = immerWerteA2(V);
  const verl = verlorene(fixture.immerWerte.werte, aktuell);
  assert.deepEqual(verl, [],
    'Verlorene Textwerte gegenüber ' + fixture.quelleCommit + ': ' + JSON.stringify(verl.slice(0, 5)));
});

test('[Vor-Umzug·a2·Rot-Beweis] ein verfälschter Textwert wird gefunden — die Prüfung wirkt wirklich', () => {
  const fixture = fixtureLesen();
  const verfaelscht = fixture.immerWerte.werte.slice();
  const original = verfaelscht[0];
  verfaelscht[0] = 'GEÄNDERTER TESTSATZ, NICHT DER AMTLICHE';
  const verl = verlorene(fixture.immerWerte.werte, verfaelscht);
  assert.ok(verl.includes(original), 'ein ersetzter Wert muss als verloren auffallen');
});

test('[Vor-Umzug·a2·Rot-Beweis Ende-zu-Ende] eine echte Kern-Verfälschung bricht die immer-Prüfung', () => {
  const fixture = fixtureLesen();
  const marker = '"wizard:gebwiz.titel":"Geburt eines Kindes",';
  mitTemporaerVeraendertemKern(
    (q) => {
      assert.ok(q.includes(marker), 'Anker für den gebwiz-Titel im Textsatz nicht gefunden — Test veraltet');
      return q.split(marker).join('"wizard:gebwiz.titel":"GEFAELSCHTER TITEL",');
    },
    (laden) => {
      const { V } = laden();
      const aktuell = immerWerteA2(V);
      const verl = verlorene(fixture.immerWerte.werte, aktuell);
      assert.ok(verl.length > 0, 'eine echte Verfälschung im Kern muss die Prüfung brechen');
    },
  );
});

test('[Vor-Umzug·a2·Gegenprobe] eine unveränderte Kopie bleibt grün — der Umweg selbst verfälscht nichts', () => {
  const fixture = fixtureLesen();
  const verl = verlorene(fixture.immerWerte.werte, fixture.immerWerte.werte.slice());
  assert.deepEqual(verl, []);
});

test('[Vor-Umzug·a2·Rot-Beweis Schwelle] eine fehlende Fixture-Datei wirft, meldet nicht "0 Abweichungen"', () => {
  assert.throws(() => fixtureLesen(path.join(__dirname, 'fixtures', 'vor-umzug-a2-wizards-GIBT-ES-NICHT.json')),
    /Fixture fehlt/);
});

test('[Vor-Umzug·a2·Rot-Beweis Schwelle] eine leere Fixture-Datei wirft, meldet nicht "0 Abweichungen"', () => {
  const tmp = path.join(os.tmpdir(), 'vor-umzug-a2-leer-' + process.pid + '-' + Date.now() + '.json');
  fs.writeFileSync(tmp, JSON.stringify({ immerWerte: { werte: [] } }), 'utf8');
  try {
    assert.throws(() => fixtureLesen(tmp), /keine immerWerte/);
  } finally {
    fs.unlinkSync(tmp);
  }
});
