'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Register-Ausbau — bauzeit-eingebackene Logikmodule über
   AB_WERK_LOGIK_MODUL_QUELLEN (VDM1-Auftrag, 17.09.2026 — umgeschrieben
   nach dem Schnitt, 18.09.2026)
   ────────────────────────────────────────────────────────────────────────
   WAS DIESER TEST BEHAUPTET, UND WAS NICHT: Bauzeit-eingebackene Logikmodule
   erreichen `_logikModuleAlle()` bedingungslos — das ist beabsichtigt. Die
   Region wird VOR der Auslieferung textlich ersetzt und ist danach
   `Object.freeze`/`const`, ohne Laufzeit- oder Depot-Schreibzugriff
   (gemessen, nicht angenommen — die einzige Zuweisung im ganzen Bestand
   ist ihre eigene Definition). Was hier einbäckt, ist per Konstruktion
   vertrauenswürdig und braucht kein Einlasstor. Der Einlassweg für
   DEPOT-Module (von der Bürgerin selbst angedockt) ist ein ANDERER und
   wird hier NICHT geprüft.

   FIXTURES SIND ERFUNDEN, NICHT AUS DEM BESTAND KOPIERT: die ursprüngliche
   Fassung dieses Tests nutzte die beiden echten civilen Module
   (erbschein-vorbereitung, zugang-zum-recht-beratungshilfe) — genau die
   zwei, die (Fund 18.09.2026, morgens) zusätzlich über diese generische
   Region liefen, obwohl sie schon einen eigenen, gegateten Weg haben
   (`_abWerkAuszuegeEinlassen` → `modulEinlassen` →
   `AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN`, depot-zustandsabhängig). Diese
   Dublette wurde entfernt (`tools/lib/vier-produkte.js`,
   `AB_WERK_FIXTURE_PFADE_4`) — ein Test, der weiter auf die echten Module
   zeigt, würde entweder rot werden oder bei der nächsten Umbenennung
   unbemerkt wieder auf sie zurückfallen. Erfundene Fixtures halten den
   Test unabhängig vom Inhalt der beiden echten Module.

   VORHER LAS DIESER TEST DAS ECHTE, EINGEBETTETE BUENDEL
   (`BUERGERMODUL_BUENDEL`) als „native Wahrheit" für den Vergleich — dieser
   Anker ist seit dem Schnitt tot (`BUERGERMODUL_BUENDEL = null`, kein
   `JSON.parse`-Literal mehr). Er wird nicht ersetzt, sondern entfällt: die
   erfundenen Fixtures SIND die Wahrheit, gegen die verglichen wird.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AB_WERK_REGIONEN } = require('../tools/lib/produkt-text-erzeugen.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

// Erfunden, kein Bezug zum echten Bestand — s. Kopf-Kommentar.
const LM1 = {
  modulTyp: 'logikModul', id: 'test-erfundenes-logikmodul-eins', titel: 'Test-Auszug Eins',
  sektor: 'assets', moduleVersion: 1, herkunft: 'vivodepot',
  datenSchema: { testFeld: { typ: 'feld', sektor: 'identity', feld: 'givenName' } },
  abschnitte: [{ titel: 'T1', bloecke: [{ typ: 'immer', texte: ['erfundener Testtext eins'] }] }],
  dokAusgabe: { h1: 'Test-Auszug Eins', unterschrift: false, unterschriftErsatzHinweis: 'Kein Antrag.', knopfAttr: 'test-eins-dokument' },
};
const LM2 = {
  modulTyp: 'logikModul', id: 'test-erfundenes-logikmodul-zwei', titel: 'Test-Auszug Zwei',
  sektor: 'finance', moduleVersion: 1, herkunft: 'vivodepot',
  datenSchema: { testFeld: { typ: 'feld', sektor: 'identity', feld: 'familyName' } },
  abschnitte: [{ titel: 'T2', bloecke: [{ typ: 'immer', texte: ['erfundener Testtext zwei'] }] }],
  dokAusgabe: { h1: 'Test-Auszug Zwei', unterschrift: false, unterschriftErsatzHinweis: 'Kein Antrag.', knopfAttr: 'test-zwei-dokument' },
};

function regionNutzlastSetzen(quelle, region, wert) {
  const begin = quelle.indexOf(region.begin);
  const ende = quelle.indexOf(region.ende);
  assert.ok(begin >= 0 && ende >= 0, 'Region fehlt/beschädigt: ' + region.kennung);
  return quelle.slice(0, begin + region.begin.length) + '\nconst ' + region.kennung + ' = ' + JSON.stringify(wert) + ';\n' + quelle.slice(ende);
}

function kernMitAbWerkFixturesBauen(module) {
  const html = fs.readFileSync(KERN, 'utf8');
  const region = AB_WERK_REGIONEN.find((r) => r.kennung === 'AB_WERK_LOGIK_MODUL_QUELLEN');
  assert.ok(region, 'AB_WERK_LOGIK_MODUL_QUELLEN fehlt in AB_WERK_REGIONEN');
  return regionNutzlastSetzen(html, region, module);
}

async function mitTemporaeremKern(module, tun) {
  const neuesHtml = kernMitAbWerkFixturesBauen(module);
  const tmp = path.join(os.tmpdir(), 'vivodepot-register-ausbau-logikmodule-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, neuesHtml, 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { ladeKern } = require('./load-kern.js');
    const { V } = ladeKern();
    await V.depotAnlegen('register-ausbau-logikmodul-probe-pw');
    return await tun(V);
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(tmp);
  }
}

test('[Register-Ausbau·Logikmodule] die erfundenen Fixtures bestehen logikModulPruefen', () => {
  for (const lm of [LM1, LM2]) {
    assert.equal(lm.modulTyp, 'logikModul');
    assert.ok(typeof lm.id === 'string' && lm.id.trim());
    assert.ok(typeof lm.titel === 'string' && lm.titel.trim());
    assert.ok(typeof lm.sektor === 'string' && lm.sektor.trim());
    assert.ok(lm.datenSchema && typeof lm.datenSchema === 'object');
    assert.ok(Array.isArray(lm.abschnitte) && lm.abschnitte.length > 0);
    assert.ok(lm.dokAusgabe && typeof lm.dokAusgabe.h1 === 'string' && lm.dokAusgabe.h1.trim());
  }
});

test('[Register-Ausbau·Logikmodule] AB_WERK-gespeist: beide erfundenen Module kommen an, byte-gleich zur Region', async () => {
  await mitTemporaeremKern([LM1, LM2], (V) => {
    const alle = V._logikModuleAlle(V.data);
    const gefundeneIds = alle.map((m) => m.id).sort();
    assert.deepEqual(gefundeneIds, [LM1.id, LM2.id].sort(),
      'Beide erfundenen Module sollten über den AB_WERK-Pfad ankommen, sonst nichts.');
    for (const original of [LM1, LM2]) {
      const geladen = alle.find((m) => m.id === original.id);
      assert.ok(geladen, 'Modul „' + original.id + '" fehlt aus dem AB_WERK-Pfad.');
      assert.equal(geladen.titel, original.titel);
      assert.equal(geladen.sektor, original.sektor);
      assert.deepEqual(geladen.datenSchema, original.datenSchema);
      assert.deepEqual(geladen.abschnitte, original.abschnitte);
      assert.equal(geladen.dokAusgabe.h1, original.dokAusgabe.h1);
    }
  });
});

test('[Register-Ausbau·Logikmodule·Rot-Beweis] eine Fixture aus der Region genommen — nur die andere kommt an', async () => {
  await mitTemporaeremKern([LM1], (V) => {
    const alle = V._logikModuleAlle(V.data);
    assert.deepEqual(alle.map((m) => m.id), [LM1.id],
      'Nur die eine Fixture in der Region sollte auch nur die eine liefern — sonst hängt hier noch etwas anderes daran.');
  });
});

test('[Register-Ausbau·Logikmodule·Rot-Beweis] leere Region: kein Logikmodul kommt an', async () => {
  await mitTemporaeremKern([], (V) => {
    const alle = V._logikModuleAlle(V.data);
    assert.deepEqual(alle.map((m) => m.id), [],
      'Ohne befüllte AB_WERK-Region sollten 0 Logikmodule stehen.');
  });
});
