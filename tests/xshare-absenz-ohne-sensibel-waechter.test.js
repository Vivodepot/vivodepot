'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Absenz-Aussage" (19.08.2026, Fassung 2), Zug 0 —
   den Bestand einfrieren, bevor irgendetwas angefasst wird
   ────────────────────────────────────────────────────────────────────────
   Gegenstand: die fünf SNOMED-CT-Absenz-Aussagen aus A182 (716186003 /
   787481004 / 160245001 / 787480003 / 787483001) erscheinen im IPS-Bundle
   MIT UND OHNE sensible Daten — also auch dann, wenn die Bürgerin im
   Herausgabe-Dialog „ohne sensible Daten" wählt und der Gesundheits-Bereich
   damit gefiltert wird (`fhirIpsBundle`, `inklSensibel`-Zweig).

   WARUM DIESE DATEI ÜBERHAUPT ENTSTEHT: dieser Zustand war gebaut, aber
   ungeprüft. Alle FHIR-Fälle in `tests/ausdruecklich-keine.test.js` laufen
   mit `{sensibel: true}` (:117, :127, :147, :162, :244). Die xShare-Zusage
   („der leere Zustand ist im IPS ausdrücklich ausgedrückt, nicht bloss
   weggelassen") hing damit an keinem Gate — ein Umbau am Sensibel-Filter
   hätte sie lautlos entfernen können, ohne eine einzige rote Probe.

   Diese Datei baut NICHTS um. Sie hält fest, was am 19.08.2026 erzeugt wird.
   Wird sie rot, ist der Umbau falsch, nicht die Probe.

   Der zweite Teil (Bedienbarkeit) hält die Vorbedingung fest, unter der die
   Aussage wahr bleibt: der Setzen-Knopf erscheint NUR, solange das Feld leer
   ist. Ohne diese Sperre wäre der Zustand „Flag gesetzt UND echte Einträge
   vorhanden" erreichbar — und der Vorrang echter Daten (`!refs.length`)
   greift bei zurückgehaltenem Bereich NICHT, weil die Liste dort filter-
   bedingt leer ist. Gemessen am gerenderten HTML-String, nicht am DOM-Stub.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const PW = 'xshare-absenz-pw';
const JETZT = new Date('2026-08-19T10:00:00Z');
const SNOMED = 'http://snomed.info/sct';

const FELDER = [
  { id: 'allergiesMedicationFoodOther',    code: '716186003', loinc: '48765-2' },
  { id: 'medicationOngoing',               code: '787481004', loinc: '10160-0' },
  { id: 'chronicConditionsDiagnoses',      code: '160245001', loinc: '11450-4' },
  { id: 'operationsProcedures',            code: '787480003', loinc: '47519-4' },
  { id: 'implantsProsthesesPacemakers',    code: '787483001', loinc: '46264-8' },
];

async function neuesDepot(V0) {
  const { V } = V0 ? { V: V0 } : ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  return V;
}
function sektionVon(bundle, loinc) {
  const comp = bundle.entry.find((e) => e.resource.resourceType === 'Composition').resource;
  return comp.section.find((s) => s.code.coding[0].code === loinc);
}
function echterEintrag(V, feldId) {
  if (feldId === 'operationsProcedures') V.listenEintragHinzufuegen('health', feldId, { procedure: 'Blinddarm', year: '2008' });
  else if (feldId === 'implantsProsthesesPacemakers') V.sektorFeldSetzen('health', feldId, 'Hüft-TEP rechts');
  else V.sektorFeldSetzen('health', feldId, [{ text: 'Echteintrag' }]);
}

/* ── Teil 1: die Aussage steht in beiden Herausgabe-Lagen ──────────────── */

for (const f of FELDER) {
  for (const sensibel of [true, false]) {
    test('[xShare·Absenz] ' + f.id + ' · sensibel=' + sensibel
       + ': Flag gesetzt, keine Einträge → SNOMED-Absenz-Code im Bundle', async () => {
      const V = await neuesDepot();
      V.ausdruecklichKeineSetzen('health', f.id, true);
      const bundle = V.fhirIpsBundle(JETZT, { sensibel });
      const sek = sektionVon(bundle, f.loinc);
      assert.equal(sek.emptyReason, undefined,
        f.id + ' (sensibel=' + sensibel + '): die Sektion darf NICHT auf emptyReason zurückfallen');
      assert.ok(sek.entry && sek.entry.length === 1,
        f.id + ' (sensibel=' + sensibel + '): genau ein Eintrag — die Absenz-Aussage selbst');
      const res = bundle.entry.find((e) => e.fullUrl === sek.entry[0].reference).resource;
      const kern = res.code || res.medicationCodeableConcept
        || (res.resourceType === 'DeviceUseStatement'
            ? bundle.entry.find((e) => e.fullUrl === res.device.reference).resource.type : null);
      assert.equal(kern.coding[0].system, SNOMED, f.id + ': SNOMED CT');
      assert.equal(kern.coding[0].code, f.code, f.id + ': der Absenz-Code aus A182');
    });
  }
}

test('[xShare·Absenz] alle fünf Aussagen stehen gleichzeitig, auch ohne sensible Daten', async () => {
  const V = await neuesDepot();
  for (const f of FELDER) V.ausdruecklichKeineSetzen('health', f.id, true);
  const roh = JSON.stringify(V.fhirIpsBundle(JETZT, { sensibel: false }));
  for (const f of FELDER) assert.ok(roh.includes(f.code), f.id + ': ' + f.code + ' fehlt im Bundle');
});

test('[xShare·Absenz] Positivmaßstab: ohne Flag bleibt es bei notasked (die Probe kann unterscheiden)', async () => {
  const V = await neuesDepot();
  const roh = JSON.stringify(V.fhirIpsBundle(JETZT, { sensibel: false }));
  for (const f of FELDER) assert.ok(!roh.includes(f.code), f.id + ': ohne Flag darf kein Absenz-Code entstehen');
  assert.ok(sektionVon(V.fhirIpsBundle(JETZT, { sensibel: false }), '48765-2').emptyReason);
});

/* ── Teil 2: die Bedienung schließt den widersprüchlichen Zustand aus ──── */

for (const f of FELDER) {
  test('[xShare·Absenz·Bedienung] ' + f.id + ': bei vorhandenem Eintrag erscheint KEIN Setzen-Knopf', async () => {
    const V = await neuesDepot();
    echterEintrag(V, f.id);
    const roh = V.feldRohwert('health', f.id);
    const html = V.ausdruecklichKeineZeileHTML('health', f.id, roh, true);
    assert.equal(html, '',
      f.id + ': ein befülltes Feld darf die dritte Aussage gar nicht erst anbieten');
  });
}

test('[xShare·Absenz·Bedienung] Positivmaßstab: am leeren Feld erscheint der Knopf sehr wohl', async () => {
  const V = await neuesDepot();
  for (const f of FELDER) {
    const html = V.ausdruecklichKeineZeileHTML('health', f.id, undefined, true);
    assert.match(html, /data-ausdruecklich-keine-setzen/, f.id + ': leeres Feld bietet die Erklärung an');
  }
});

for (const f of FELDER) {
  test('[xShare·Absenz·Bedienung] ' + f.id + ': ein neuer Eintrag nimmt ein stehendes Flag automatisch zurück', async () => {
    const V = await neuesDepot();
    V.ausdruecklichKeineSetzen('health', f.id, true);
    echterEintrag(V, f.id);
    assert.equal(V.ausdruecklichKeineGesetzt('health', f.id), false,
      f.id + ': _ausdruecklichKeineAutoLoeschen greift auf dem Schreibweg');
  });
}

/* ── Rotproben (Regel 18) — Mutation auf einer Kopie, Original unberührt ── */

async function mitMutation(anker, ersatz, pruefung) {
  const original = fs.readFileSync(HTML_PATH, 'utf8');
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const tmp = path.join(os.tmpdir(), 'xshare-absenz-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, ersatz));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern();
    await neuesDepot(V);
    await pruefung(V);
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.equal(fs.readFileSync(HTML_PATH, 'utf8'), original, 'die Probe darf den echten Kern nicht verändert haben');
}

test('[Rotmachbarkeit] fällt ein Absenz-Block weg, schlägt dieser Wächter an', async () => {
  await mitMutation(
    "if (!medRefs.length && ausdruecklichKeineGesetzt('health', 'medicationOngoing')) {",
    "if (false && ausdruecklichKeineGesetzt('health', 'medicationOngoing')) {",
    async (V) => {
      V.ausdruecklichKeineSetzen('health', 'medicationOngoing', true);
      const sek = sektionVon(V.fhirIpsBundle(JETZT, { sensibel: false }), '10160-0');
      assert.ok(sek.emptyReason, 'mutiert: die Sektion fällt auf emptyReason zurück — genau das, was Teil 1 verbietet');
    });
});

test('[Rotmachbarkeit] wird die Aussage an sensible Daten gekoppelt, schlägt NUR dieser Wächter an', async () => {
  // Die schärfere Probe: `tests/ausdruecklich-keine.test.js` prüft ausschließlich mit
  // {sensibel: true} und bliebe unter dieser Mutation vollständig grün. Der xShare-Fall
  // („ohne sensible Daten") hängt allein an dieser Datei.
  await mitMutation(
    "if (!allergieRefs.length && ausdruecklichKeineGesetzt('health', 'allergiesMedicationFoodOther')) {",
    "if (inklSensibel && !allergieRefs.length && ausdruecklichKeineGesetzt('health', 'allergiesMedicationFoodOther')) {",
    async (V) => {
      V.ausdruecklichKeineSetzen('health', 'allergiesMedicationFoodOther', true);
      const mit = sektionVon(V.fhirIpsBundle(JETZT, { sensibel: true }), '48765-2');
      assert.ok(mit.entry && mit.entry.length === 1, 'mutiert: mit sensiblen Daten unverändert — die alte Suite bliebe grün');
      const ohne = sektionVon(V.fhirIpsBundle(JETZT, { sensibel: false }), '48765-2');
      assert.ok(ohne.emptyReason, 'mutiert: ohne sensible Daten verschwindet die Aussage — dieser Wächter wird rot');
    });
});
