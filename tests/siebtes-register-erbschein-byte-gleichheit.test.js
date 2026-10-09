'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Siebtes Register — Erbschein-Vorbereitungsauszug als echtes .json-Bundle,
   Byte-Gleichheit gegen den vorher fest verdrahteten Stand
   ────────────────────────────────────────────────────────────────────────
   Dasselbe Nachweis-Muster wie K8 (tests/k8-byte-gleichheit.test.js): die
   Fixtures in tests/fixtures/siebtes-register-vorher/*.html sind VOR jeder
   Änderung an diesem Auftrag eingefroren worden (echtes dokumentHTML() der
   damals noch fest verdrahteten ERBSCHEIN_MODUL, Rezept identisch mit dem
   „Zug 2 · Positiv"-Test in erbschein-modul-mechanik.test.js).

   Das Bundle (tests/fixtures/erbschein-vorbereitung-logikmodul.json) läuft
   NICHT über einen Testpfad, sondern über den ECHTEN Fremdmodul-Einlass
   (modulEinlassen) — genau der Weg, den ein Sprachmodul auch nimmt (Zug 2
   des Auftrags: „ein Testdepot dockt das Erbschein-Modul über den
   regulären Fremdmodul-Einlass an, nicht über eine feste Kern-Verdrahtung").
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const BUNDLE_TEXT = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8');

/* escapeHTML maskiert seit 16.09.2026 auch Anführungszeichen (v1-Blocker Sicherheit). Die Fixtures bleiben
   der Stand VOR dem Umbau; verglichen wird beidseitig mit `&quot;`/`&#39;` als Zeichen — eng, jede
   andere Abweichung bleibt rot. Im Browser rendern beide Formen gleich. */
/* Teil C (27.09.2026, U2-ADR-439, Wortlaut gegengelesen) ist ein GEWOLLTER Zusatz nach dem eingefrorenen Stand: die Urkunden
   für den Nachweis nach § 352 Abs. 3 FamFG. Verglichen wird darum der Auszug OHNE genau diesen einen Abschnitt — alles
   andere bleibt byte-gleich — und der Abschnitt selbst muss da sein, sonst wäre das Herausschneiden eine stille Lücke. */
const TEIL_C = /<section class="pv-dok-abschnitt"><h2>Teil C — Urkunden für den Nachweis<\/h2>[\s\S]*?<\/section>/;
function ohneTeilC(html) {
  assert.match(html, TEIL_C, 'Teil C fehlt im Auszug — dann wäre der Vergleich unten keiner');
  return html.replace(TEIL_C, '');
}
/* Haftung C (HAFTUNG-C-FEHLT-IM-DOKUMENT-PDF, 08.10.2026) ist ebenfalls ein GEWOLLTER Zusatz: der Dokument-Fuß trägt seine Segmente
   [Rechtsraum-Satz, Quelle, C] je in einem <div>. Verglichen wird der Fuß in der eingefrorenen Form (die Quelle allein); C muss als
   letztes Segment dastehen, sonst wäre das Zurückführen eine stille Lücke. */
const FUSS_NEU = /<footer class="pv-dok-fuss">((?:<div>[^<]*<\/div>)*)<\/footer>/;
function fussWieVorher(html, C) {
  const m = html.match(FUSS_NEU);
  assert.ok(m, 'der Dokument-Fuß fehlt');
  const segmente = [...m[1].matchAll(/<div>([^<]*)<\/div>/g)].map((x) => x[1]);
  assert.equal(segmente[segmente.length - 1], C, 'Haftung C steht als letztes Segment im Fuß');
  return html.replace(FUSS_NEU, '<footer class="pv-dok-fuss">' + segmente.slice(0, -1).join('') + '</footer>');
}
function anfuehrungszeichenGleich(html) {
  // Dazu seit 16.09.2026 die typografische Umstellung der eigenen Sätze (tools/lib/anfuehrung-gleich.js).
  return require('../tools/lib/anfuehrung-gleich.js').anfuehrungGleich(html.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
}
function golden(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', 'siebtes-register-vorher', name + '.html'), 'utf8');
}

async function leeresDepotMitBundle(V) {
  await V.depotAnlegen('K8-Erbschein-Leer!');
  // U2-ADR-288 (05.09.2026): depotAnlegen() seedet das Bundle seither selbst ab Werk — geleert,
  // damit der folgende manuelle Einlass ein echter Erst-Einlass bleibt (sonst "aeltere-fassung",
  // weil dieselbe moduleVersion bereits steht) und dieser Test weiterhin den vollen, echten
  // Einlassweg von Grund auf prüft.
  V.getData().logikModule = [];
  const ergebnis = V.modulEinlassen(BUNDLE_TEXT, V.getData(), null, null);
  assert.equal(ergebnis.angenommen, true, 'Vorbedingung: das Bundle muss angenommen werden — sonst prüft dieser Test nichts');
  return ergebnis;
}

async function volles_depotMitBundle(V) {
  await V.depotAnlegen('K8-Erbschein-Voll!');
  const kindId = V.personHinzufuegen({ name: 'Tochter Beispiel' });
  const erbeId = V.personHinzufuegen({ name: 'Neffe Beispiel' });
  const bedachtId = V.personHinzufuegen({ name: 'Freundin Beispiel' });
  const d0 = V.getData();
  d0.sektoren.identity = Object.assign({}, d0.sektoren.identity, {
    nationality: 'deutsch', streetAddress: 'Musterweg 1', postcodeCity: '80331 München',
    maritalStatus: 'verh',
  });
  // U2-ADR-248: `childrenAndDependants` lebt im Sektor 'people', nicht 'identity'.
  d0.sektoren['people'] = Object.assign({}, d0.sektoren['people'], {
    childrenAndDependants: [{ id: 'k1', person: { ref: kindId }, art: 'leiblich' }],
  });
  d0.sektoren.advanceCare = Object.assign({}, d0.sektoren.advanceCare, {
    provisionInstruments: [
      { id: 't1', instrument: 'will', form: 'beurkundet', personsNamedInTheWill: [{ ref: bedachtId }] },
    ],
    heirsBriefOverview: [{ ref: erbeId }],
  });
  V.setData(d0);
  // U2-ADR-288: s. Kommentar in leeresDepotMitBundle — derselbe Grund.
  V.getData().logikModule = [];
  const ergebnis = V.modulEinlassen(BUNDLE_TEXT, V.getData(), null, null);
  assert.equal(ergebnis.angenommen, true, 'Vorbedingung: das Bundle muss angenommen werden — sonst prüft dieser Test nichts');
  return ergebnis;
}

test('[Siebtes-Register·Byte-Gleichheit] leeres Depot — das Bundle ueber den echten Einlassweg liefert BYTE-GLEICH dasselbe wie die vorher fest verdrahtete ERBSCHEIN_MODUL', async () => {
  const { V } = await ladeKern();
  await leeresDepotMitBundle(V);
  const html = V.dokumentHTML('erbschein-vorbereitung');
  assert.equal(anfuehrungszeichenGleich(fussWieVorher(ohneTeilC(html), V.escapeHTML(V._dokFussHaftungMitMarke()))), anfuehrungszeichenGleich(golden('erbschein-leer')));
});

test('[Siebtes-Register·Byte-Gleichheit] volles Depot — das Bundle ueber den echten Einlassweg liefert BYTE-GLEICH dasselbe wie die vorher fest verdrahtete ERBSCHEIN_MODUL', async () => {
  const { V } = await ladeKern();
  await volles_depotMitBundle(V);
  const html = V.dokumentHTML('erbschein-vorbereitung');
  assert.equal(anfuehrungszeichenGleich(fussWieVorher(ohneTeilC(html), V.escapeHTML(V._dokFussHaftungMitMarke()))), anfuehrungszeichenGleich(golden('erbschein-voll')));
});

test('[Siebtes-Register] das Bundle wird ANGENOMMEN, ohne einen einzigen verworfenen Schluessel', async () => {
  const { V } = await ladeKern();
  const ergebnis = await leeresDepotMitBundle(V);
  assert.deepEqual(ergebnis.verworfene, [], 'ein Bundle, das etwas verliert, waere kein Nachweis fuer verlustfreie Uebersetzung');
});

test('[Siebtes-Register] das Bundle landet im logikModule-Slot, unsigniert (Selbst-Einlass)', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('K8-Erbschein-Slot!');
  V.modulEinlassen(BUNDLE_TEXT, V.getData(), null, null);
  const d = V.getData();
  assert.ok(Array.isArray(d.logikModule));
  /* U2-ADR-326: `depotAnlegen()` seedet mehrere Ab-Werk-Auszuege — die Zahl 1 wuerde hier nur
     zufaellig stimmen. Gemessen wird, was die Probe wirklich meint: der Erbschein steht GENAU
     EINMAL im Slot (der Einlass oben hat ihn nicht verdoppelt) und traegt `ungeprueft`. */
  const erbschein = d.logikModule.filter((m) => m && m.id === 'erbschein-vorbereitung');
  assert.equal(erbschein.length, 1, 'genau ein Erbschein-Eintrag — kein Duplikat durch den Einlass');
  assert.equal(erbschein[0].ungeprueft, true);
});

test('[Siebtes-Register] nach Einlass steht das Bundle in moduleMitGenerator() — sonst verdrahtet die K8-Klickschleife seinen Oeffnen-Knopf nie', async () => {
  /* Root-Cause des E2E-Fundes 27.08.2026: die K8-Klickschleife (vivodepot.html ~40560) iteriert
     `moduleMitGenerator()`, das VOR diesem Fix nur VORSORGE_MODULE filterte — ein eingelassenes
     logikModul kam darin nie vor, der Knopf blieb ohne onclick, egal wie knopfAttr lautete. */
  const { V } = await ladeKern();
  await V.depotAnlegen('K8-Erbschein-Wiring!');
  V.modulEinlassen(BUNDLE_TEXT, V.getData(), null, null);
  const treffer = V.moduleMitGenerator().find((m) => m.id === 'erbschein-vorbereitung');
  assert.ok(treffer, 'das eingelassene logikModul fehlt in moduleMitGenerator() — der Oeffnen-Knopf bleibt unverdrahtet');
  assert.equal(treffer.dokAusgabe.knopfAttr, 'erbschein-dokument');
});

test('[Siebtes-Register·Rot-Beweis] OHNE Einlass ist das Modul nicht ueber dokumentHTML erreichbar', async () => {
  /* Der Gegenbeweis zur Byte-Gleichheit: ein Depot, das das Bundle nicht (mehr) traegt,
     kennt 'erbschein-vorbereitung' nicht — der Lookup haengt am echten Registry-Eintrag, nicht an
     fester Verdrahtung wie frueher (ERBSCHEIN_MODUL stand damals fest in VORSORGE_MODULE).
     Schema 87 (21.09.2026): der Erbschein-Auszug ist Saat des PRODUKTS (Template im Rezept), nicht des Kerns — der
     Standard-Testkern ist ein gebackenes privat-de und kennt ihn darum ab Werk. „Kein Einlass" heißt darum: weder im Depot
     noch in der Ab-Werk-Saat (die Liste wird für diese Probe geleert, wie es die Rangfolge-Proben tun). */
  const { V } = await ladeKern();
  await V.depotAnlegen('K8-Erbschein-Kein-Einlass!');
  V.getData().logikModule = [];
  V._abWerkLogikModule = [];
  assert.equal(V._modulOderVorlage('erbschein-vorbereitung'), null,
    'ohne Einlass darf das Modul nicht auffindbar sein — sonst waere es weiterhin fest verdrahtet');
});
