'use strict';
/* Nach dem Kennungs-Umbau (Stufe 81) steht im Depot keine alte Kennung mehr — gleich in welcher Ablage.

   Vorbeugung zu Code-Review 15.09.2026, Befund K5 (HOCH): Die Ausnahmen eines Empfängerkreises trugen
   nach dem Umbau weiter `gesundheit.blutgruppe`, und das ausdrücklich ausgeschlossene Feld ging hinaus.
   tests/kennungs-umbau-review-k1-k6.test.js hält die sechs bekannten Ablagen einzeln. Dieser Wächter hält
   die Klasse: Er öffnet ein Vor-Umbau-Depot und durchsucht das GANZE Depot nach Kennungen, deren Bereich die
   Umbau-Tabelle (KENNUNG_MAPPING) umbenennt. Eine neue Ablage, die der Umbau nicht kennt, fällt so auf, ohne
   dass jemand sie hier einträgt.

   Ausgenommen sind die Werte der Bürgerin in `sektoren` (freier Text) und die Sicherungskopie der Stufe 81
   (`_migrationSicherung81`), die den alten Stand absichtlich hält.

   GERÜST-TEST: der Rot-Beweis lädt den veränderten Kern als nacktes Gerüst; der Umbau liegt im Gerüst, nicht im Produkt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const FIXTURE = path.join(__dirname, 'fixtures', 'vorfuehrung-zugang-zum-recht', 'altdatei-demo-de-2026-09-10.vivodepot');
const FIXTURE_SHA256 = '6f3bcb135af088005b497bdaa051e3535dab1740439c7246b305fea0b168620f';   // dieselbe gepinnte Vor-Umbau-Fixture wie in der Probe zum Datei-Rundlauf
const PASSWORT = 'zugang-zum-recht-vorfuehrung-2026';   // steht im README der Fixture
const K5_ZEILE = '    kreis.ausnahmen = kreis.ausnahmen.map((k) => {';
const K5_MUTATION = '    kreis.ausnahmen = kreis.ausnahmen.map((k) => k); void ((k) => {';

function ladeKernAus(pfad) {
  const vorher = process.env.KERN_HTML_PATH;
  if (pfad) process.env.KERN_HTML_PATH = pfad; else delete process.env.KERN_HTML_PATH;
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern({ zusatzBindungen: ['KENNUNG_MAPPING'], blank: !!pfad }); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}

function mitKern(ersetzen, fn) {
  const quelle = fs.readFileSync(KERN, 'utf8');
  if (!ersetzen) return fn(ladeKernAus(null).V);
  const [alt, neu] = ersetzen;
  assert.equal(quelle.split(alt).length, 2, 'Anker für den Rot-Beweis trifft nicht genau einmal: ' + alt.slice(0, 80));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'umbau-alt-'));
  const ziel = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(ziel, quelle.replace(alt, neu));
  try { return fn(ladeKernAus(ziel).V); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/* Die alten Bereichs-Kennungen, die der Umbau umbenennt — aus der Tabelle des Kerns, nicht von Hand. */
function alteBereiche(V) {
  const alt = new Set(), neu = new Set();
  for (const z of V.__zusatz.KENNUNG_MAPPING) {
    if (z && z.kennungNeu && z.bereichNeu && z.bereichAlt && z.bereichAlt !== z.bereichNeu) { alt.add(z.bereichAlt); neu.add(z.bereichNeu); }
  }
  return { alt, neu };
}

/* Jede Zeichenkette (Wert oder Schlüssel), die als Kennung mit einem alten Bereich beginnt, mit Pfad. */
function alteKennungen(depot, alt) {
  const funde = [];
  const istAlt = (s) => typeof s === 'string' && [...alt].some((b) => s === b || s.startsWith(b + '.') || s.startsWith(b + '['));
  const gehen = (wert, pfad) => {
    if (pfad === '$._migrationSicherung81') return;
    if (Array.isArray(wert)) { wert.forEach((w, i) => gehen(w, pfad + '[' + i + ']')); return; }
    if (wert && typeof wert === 'object') {
      for (const k of Object.keys(wert)) {
        if (istAlt(k)) funde.push(pfad + ' Schlüssel ' + k);
        if (pfad === '$.sektoren') continue;   // die Werte der Bürgerin: freier Text, kein Verweis
        gehen(wert[k], pfad + '.' + k);
      }
      return;
    }
    if (istAlt(wert)) funde.push(pfad + ' = ' + wert);
  };
  gehen(depot, '$');
  return funde;
}

const altDepot = () => ({
  schemaVersion: 80, menschen: [],
  sektoren: {
    identitaet: { vorname: 'Anna', nationalitaet: 'GEHEIM-123' },
    gesundheit: { blutgruppe: 'A+' },
    vorsorge: { tpl_probe: 'angedockter Wert' },
  },
  bereichssatz: ['identitaet', 'gesundheit', 'vorsorge'],
  empfaengerkreise: [{ id: 'k1', name: 'Angehörige', bausteine: ['notfall'], ausnahmen: ['gesundheit.blutgruppe'] }],
  feldDefinitionen: [{ sektorId: 'vorsorge', feldId: 'tpl_probe', label: 'Probe', typ: 'text' }],
  dokumente: [{ id: 'd1', typ: 'personalausweis', sektorId: 'identitaet',
    felder: [{ sektorId: 'identitaet', feldId: 'ausweis', unterfeldId: 'gueltig', zeilenId: 'a1' }],
    leitfeld: { sektorId: 'identitaet', feldId: 'ausweis' } }],
  zusammenstellungen: [{ id: 'z1', name: 'Wohnung', kennungen: ['identitaet.vorname', 'identitaet.ausweis[a1].gueltig'] }],
  anfragen: [{ id: 'q1', felder: [{ kennung: 'gesundheit.blutgruppe' }] }],
});

test('[Umbau·Klasse] Vorbedingung: die Tabelle benennt alte Bereiche, und kein neuer Name ist ein alter', () => {
  const { V } = ladeKernAus(null);
  const { alt, neu } = alteBereiche(V);
  assert.ok(alt.has('gesundheit') && alt.has('identitaet'), 'die Umbau-Tabelle trägt die alten Bereiche nicht — dann prüft der Wächter nichts');
  assert.deepEqual([...alt].filter((b) => neu.has(b)), [], 'ein neuer Bereichsname ist zugleich ein alter — der Wächter könnte beide nicht trennen');
});

test('[Umbau·Klasse] das gebaute Vor-Umbau-Depot trägt nach dem Umbau keine alte Kennung', () => {
  mitKern(null, (V) => {
    const vorher = alteKennungen(altDepot(), alteBereiche(V).alt);
    assert.ok(vorher.length >= 6, 'Vorbedingung: das Depot trägt alte Kennungen in mehreren Ablagen');
    assert.deepEqual(alteKennungen(V.depotNormalisieren(altDepot()), alteBereiche(V).alt), []);
  });
});

test('[Umbau·Klasse] die Vor-Umbau-Datei (Schema 80) trägt nach dem Öffnen keine alte Kennung', async () => {
  const bytes = fs.readFileSync(FIXTURE);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), FIXTURE_SHA256, 'die Vor-Umbau-Fixture wurde getauscht');
  const roh = bytes.toString('utf8');
  const { V } = ladeKernAus(null);
  await V.depotLaden(JSON.parse(roh.slice(roh.indexOf('{'))), PASSWORT);
  const d = V.getData();
  assert.ok(Object.keys(d.sektoren || {}).length > 0, 'Vorbedingung: die Datei bringt Bereiche mit');
  assert.deepEqual(alteKennungen(d, alteBereiche(V).alt), []);
});

test('[Umbau·Klasse·Rot-Beweis] ohne die K5-Zeile findet der Wächter die alte Ausnahme', () => {
  mitKern([K5_ZEILE, K5_MUTATION], (V) => {
    const funde = alteKennungen(V.depotNormalisieren(altDepot()), alteBereiche(V).alt);
    assert.ok(funde.some((f) => f.includes('empfaengerkreise') && f.includes('gesundheit.blutgruppe')), 'nicht gefunden: ' + funde.join(' | '));
  });
});

test('[Umbau·Klasse·Rot-Beweis] eine neue Ablage, die der Umbau nicht kennt, fällt auf, ohne dass sie hier steht', () => {
  mitKern(null, (V) => {
    const d = altDepot();
    d.neueAblageOhneUmbau = [{ verweis: 'gesundheit.blutgruppe' }];
    const funde = alteKennungen(V.depotNormalisieren(d), alteBereiche(V).alt);
    assert.ok(funde.some((f) => f.startsWith('$.neueAblageOhneUmbau')), 'nicht gefunden: ' + funde.join(' | '));
  });
});
