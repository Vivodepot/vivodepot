'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Code-Review Teil 3 der Kennungs-Kampagne (15.09.2026), Befunde K1–K6.
   Ein Depot von VOR dem Umbau (Schema 80) wird geöffnet; geprüft wird, was
   die Bürgerin danach sieht und was hinausgeht.

     K1  die Sicherungskopie der Stufe 81 geht nicht mit dem Export hinaus
     K2  `bereichssatz` folgt den Bereichen — die Seitenleiste bleibt gefüllt
     K3  angedockte Felddefinitionen folgen ihrem Bereich
     K4  Dokument-Verweise (`felder[]`, `leitfeld`) folgen ihrem Feld
     K5  Ausnahmen eines Empfängerkreises halten das Feld weiter zurück
     K6  Zusammenstellungen und Anfragen zeigen auf heutige Kennungen

   Rot-Beweis je Befund: dieselbe Probe gegen eine Kern-Kopie, in der genau die
   zuständige Zeile fehlt (KERN_HTML_PATH), muss scheitern.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

function ladeKernAus(pfad) {
  const lader = require.resolve('./load-kern.js');
  const vorher = process.env.KERN_HTML_PATH;
  if (pfad) process.env.KERN_HTML_PATH = pfad; else delete process.env.KERN_HTML_PATH;
  delete require.cache[lader];
  try { return require(lader).ladeKern().V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[lader];
  }
}

function mitKernOhne(zeile, fn) {
  const quelle = fs.readFileSync(KERN, 'utf8');
  assert.equal(quelle.split(zeile).length, 2, 'Anker für den Rot-Beweis trifft nicht genau einmal: ' + zeile.slice(0, 80));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-k-'));
  const ziel = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(ziel, quelle.replace(zeile, '/* MUTATION */'));
  try { return fn(ladeKernAus(ziel)); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
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

/* ── die Proben, je Befund eine Funktion — einmal gegen den Kern, einmal gegen die Mutation ── */
const PROBEN = {
  K1: (V) => {
    const d = V.depotNormalisieren(altDepot());
    V.setData(d);
    const text = JSON.stringify(V.vollExportJSON({ sensibel: false })) + JSON.stringify(V.vollExportJSON({ sensibel: true }));
    assert.ok(!text.includes('_migrationSicherung81'), 'die Sicherungskopie steht im Export');
    assert.ok(!JSON.stringify(V.vollExportJSON({ sensibel: false })).includes('GEHEIM-123'), 'ein sensibler Wert geht über die Sicherungskopie hinaus');
    assert.ok(d._migrationSicherung81, 'Vorbedingung: die Kopie bleibt im Depot selbst');
  },
  K2: (V) => {
    V.setData(V.depotNormalisieren(altDepot()));
    assert.deepEqual(V.bereicheAlle().map((s) => s.id).sort(), ['advanceCare', 'health', 'identity']);
  },
  K3: (V) => {
    const d = V.depotNormalisieren(altDepot());
    assert.equal(d.feldDefinitionen[0].sektorId, 'advanceCare');
    assert.equal(d.sektoren.advanceCare.tpl_probe, 'angedockter Wert', 'Wert und Definition liegen im selben Bereich');
  },
  K4: (V) => {
    const d = V.depotNormalisieren(altDepot());
    assert.deepEqual(JSON.parse(JSON.stringify(d.dokumente[0].felder[0])),
      { sektorId: 'identity', feldId: 'idDocuments', unterfeldId: 'validUntil', zeilenId: 'a1' });
    assert.deepEqual(JSON.parse(JSON.stringify(d.dokumente[0].leitfeld)), { sektorId: 'identity', feldId: 'idDocuments' });
    assert.equal(d.dokumente[0].sektorId, 'identity');
  },
  K5: (V) => {
    V.setData(V.depotNormalisieren(altDepot()));
    const kreis = V.getData().empfaengerkreise[0];
    assert.deepEqual([...kreis.ausnahmen], ['health.bloodType']);
  },
  K6: (V) => {
    const d = V.depotNormalisieren(altDepot());
    assert.deepEqual([...d.zusammenstellungen[0].kennungen], ['identity.givenName', 'identity.idDocuments[a1].validUntil']);
    assert.equal(d.anfragen[0].felder[0].kennung, 'health.bloodType');
  },
};

/* Die Zeile, ohne die der Befund zurückkehrt. */
const ANKER = {
  K1: "  if (kopie && Object.prototype.hasOwnProperty.call(kopie, '_migrationSicherung81')) delete kopie._migrationSicherung81;",
  K2: "  if (Array.isArray(depot.bereichssatz)) depot.bereichssatz = depot.bereichssatz.map((b) => (typeof b === 'string' ? bereich(b) : b));",
  K3: "    depot[name] = depot[name].map((d) => (d && typeof d.sektorId === 'string' && nach.bereichAltZuNeu.has(d.sektorId)",
  K4: '    if (Array.isArray(doc.felder)) doc.felder = doc.felder.map(verweisNeu);',
  K5: '    kreis.ausnahmen = kreis.ausnahmen.map((k) => {',
  K6: '    if (z && Array.isArray(z.kennungen)) z.kennungen = z.kennungen.map(kennungNeu);',
};
// K3/K5 brauchen den ganzen Ausdruck — die Mutation ersetzt ihn durch einen, der nichts ändert.
const MUTATION_ERSATZ = {
  K3: "    depot[name] = depot[name].map((d) => (false",
  K5: '    kreis.ausnahmen = kreis.ausnahmen.map((k) => k); void ((k) => {',
};

for (const k of Object.keys(PROBEN)) {
  test('[Review ' + k + '] ein Vor-Umbau-Depot — ' + k, () => { PROBEN[k](ladeKernAus(null)); });
  test('[Review ' + k + ' · Rot-Beweis] ohne die zuständige Zeile scheitert die Probe', () => {
    const quelle = fs.readFileSync(KERN, 'utf8');
    assert.equal(quelle.split(ANKER[k]).length, 2, 'Anker trifft nicht genau einmal');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-k-'));
    const ziel = path.join(tmp, 'vivodepot.html');
    fs.writeFileSync(ziel, quelle.replace(ANKER[k], MUTATION_ERSATZ[k] || '/* MUTATION ' + k + ' */'));
    try {
      assert.throws(() => PROBEN[k](ladeKernAus(ziel)), undefined, k + ': die Probe bleibt ohne die Zeile grün — sie prüft nicht, was der Fix leistet');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });
}
void mitKernOhne;
