'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Pro trägt eigene Situationen (U2-ADR-243 Teil 2, entschieden 02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Gemessen an ECHT konfektionierten Produkten, deutsch und englisch:
   - pro-de/pro-en bieten genau Vertretung, Übergabe, Einarbeitung, Nachfolge an, keine private Situation;
   - jeder Zug löst auf ein Feld auf, das das Produkt hat, und jeder der sieben Pro-Bereiche wird erreicht;
   - je Situation eine Kachel; privat-de/privat-en bieten weiter ihre zehn an;
   - die Lese-App zeigt einer frischen Pro-Datei die vier Situationen aus der Mitschrift;
   - „fallen heraus" ist keine Einbahnstraße (Bedingung der Gegenlesung): eine Pro-Datei aus der Zeit
     vor Teil 2 mit Einträgen in privaten Situationen öffnet im neuen Pro, wird gespeichert und wieder
     geöffnet, und kein Eintrag fehlt. Die Situationen sind lesbar und exportierbar (RUHENDE SITUATIONEN
     im Kern), aber ohne Kachel, also nicht angeboten.
   Rot-Beweis: gegen den Stand vor Teil 2 scheitern die Angebots-Proben (zehn private statt vier), und ohne
   `_ruhendeSituationenWecken` scheitert die Lesbarkeits-Probe (gemessen: Werte in der Datei, Situation unsichtbar).
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const { ladeLesen } = require('./load-lesen.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const PW = 'Pro-Situationen-Teil-2-2026';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-situationen-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const PRO_VIER = ['pro-vertretung', 'pro-uebergabe', 'pro-einarbeitung', 'pro-nachfolge'];
const PRIVAT_ZEHN = ['geburt', 'volljaehrig', 'hauskauf', 'notar', 'arzt', 'einfach-so', 'krankenhaus', 'pflegeheim', 'erbfall', 'todesfall-uebernahme'];
const PRO_BEREICHE = ['identity', 'pro-vertretung-vollmachten', 'pro-gesellschaft-nachfolge', 'pro-finanzen-verbindlichkeiten',
  'pro-betrieb-zugaenge', 'pro-aufbewahrung-ordnung', 'pro-kontakte-vertretungsplan'];

const gebaut = new Map();
/* `vorTeil2`: das Pro-Produkt, wie es bis Teil 2 gebaut wurde — mit den zehn privaten Situationen statt der vier eigenen. */
function kern(slug, vorTeil2) {
  const schluessel = slug + (vorTeil2 ? '-vor-teil-2' : '');
  if (!gebaut.has(schluessel)) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    let dateien = VP.modulDateienFuer(p);
    if (vorTeil2) dateien = dateien.map((f) => (f === VP.PRO_SITUATIONEN_PFAD_DE || f === VP.PRO_SITUATIONEN_PFAD_EN ? VP.AB_WERK_FIXTURE_PFADE_4[0] : f));
    const r = konfektionieren({
      ziel: path.join(TMP, schluessel), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: dateien,
    });
    gebaut.set(schluessel, path.join(r.ordner, 'vivodepot.html'));
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut.get(schluessel);
  delete require.cache[LOAD_KERN];
  // `blank`: das Produkt ist oben schon konfektioniert, ladeKern backt nichts dazu (tests/kern-html-path-absicht.test.js).
  try { return require(LOAD_KERN).ladeKern({ blank: true }); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}
async function frisch(slug, vorTeil2) {
  const k = kern(slug, vorTeil2);
  await k.V.depotAnlegen(PW);
  k.V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  return k;
}
async function oeffnen(slug, umschlag) {
  const k = kern(slug);
  await k.V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  k.V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  return k;
}
const ids = (V) => V.situationenAlle().map((s) => s.id);
const kacheln = (V) => V.anlaesseAlle().map((a) => a.id);

for (const slug of ['pro-de', 'pro-en']) {
  test(`[Angebot·${slug}] genau die vier Pro-Situationen, je mit Kachel, keine private`, async () => {
    const { V } = await frisch(slug);
    assert.deepEqual(ids(V), PRO_VIER);
    for (const id of PRO_VIER) assert.ok(kacheln(V).includes(id), 'Kachel fehlt: ' + id);
    for (const id of PRIVAT_ZEHN) assert.ok(!kacheln(V).includes(id), 'private Kachel in Pro: ' + id);
  });

  test(`[Züge·${slug}] jeder Zug löst auf ein Feld des Produkts auf, jeder Pro-Bereich wird erreicht`, async () => {
    const { V } = await frisch(slug);
    const felder = new Map(V.bereicheAlle().map((b) => [b.id, new Set(b.sektionen.flatMap((s) => s.felder.map((f) => f.id)))]));
    const erreicht = new Set();
    const tot = [];
    for (const s of V.situationenAlle()) {
      for (const blk of s.bloecke) {
        for (const e of blk.eintraege) {
          if (!felder.has(e.quelle) || !felder.get(e.quelle).has(e.feld)) tot.push(s.id + ': ' + e.quelle + '/' + e.feld);
          erreicht.add(e.quelle);
        }
      }
    }
    assert.deepEqual(tot, []);
    assert.deepEqual(PRO_BEREICHE.filter((b) => !erreicht.has(b)), []);
  });
}

test('[Sprache] pro-en zeigt die Situationen englisch, pro-de deutsch', async () => {
  const de = (await frisch('pro-de')).V.situationenAlle().map((s) => s.titel);
  const en = (await frisch('pro-en')).V.situationenAlle().map((s) => s.titel);
  assert.deepEqual(de, ['Vertretung', 'Übergabe', 'Einarbeitung', 'Nachfolge']);
  assert.deepEqual(en, ['Cover', 'Handover', 'Onboarding', 'Succession']);
});

test('[Privat unverändert] privat-de und privat-en bieten weiter ihre zehn an', async () => {
  for (const slug of ['privat-de', 'privat-en']) {
    const { V } = await frisch(slug);
    assert.deepEqual(ids(V), PRIVAT_ZEHN, slug);
  }
});

test('[Lese-App] eine frische Pro-Datei zeigt die vier Situationen aus ihrer Mitschrift', async () => {
  const { V } = await frisch('pro-de');
  const depot = JSON.parse(JSON.stringify(V.getData()));
  const { V: L } = ladeLesen({ ohneSaat: true });
  L._foldVollmachtenLesen(depot);
  L.setData(depot);
  const html = L.sidebarHTML();
  for (const id of PRO_VIER) assert.ok(html.includes('data-situation="' + id + '"'), 'fehlt in der Lese-App: ' + id);
  for (const id of PRIVAT_ZEHN) assert.ok(!html.includes('data-situation="' + id + '"'), 'private in der Lese-App: ' + id);
});

test('[Kein Verlust] alte Pro-Datei mit Einträgen in privaten Situationen: öffnen, speichern, wieder öffnen — nichts fehlt, lesbar, nicht angeboten', async () => {
  const alt = await frisch('pro-de', true);
  assert.ok(ids(alt.V).includes('notar'), 'Vorbedingung: das alte Produkt bietet notar an');
  alt.V.situationFeldSetzen('notar', 'notar_termin', 'Notariat Beispiel, 14.10.');
  alt.V.situationFeldSetzen('hauskauf', 'hk_objekt', 'Werkstatt Ringstraße');
  const vorher = JSON.stringify(alt.V.getData().situationen);
  const umschlag1 = await alt.V.depotSerialisieren();

  const neu1 = await oeffnen('pro-de', umschlag1);
  assert.equal(JSON.stringify(neu1.V.getData().situationen), vorher, 'Werte nach dem Öffnen');
  for (const id of ['notar', 'hauskauf']) {
    assert.ok(ids(neu1.V).includes(id), 'lesbar: ' + id);
    assert.ok(!kacheln(neu1.V).includes(id), 'nicht angeboten: ' + id);
  }
  assert.ok(!ids(neu1.V).includes('geburt'), 'eine werteleere private Situation bleibt schlafend');
  assert.ok(JSON.stringify(neu1.V.situationModell('notar')).includes('Notariat Beispiel, 14.10.'), 'exportierbar');
  neu1.V.renderSituation('notar');
  assert.ok(neu1.document.getElementById('content').innerHTML.includes('Notariat Beispiel, 14.10.'), 'auf dem Bildschirm');

  const neu2 = await oeffnen('pro-de', await neu1.V.depotSerialisieren());
  assert.equal(JSON.stringify(neu2.V.getData().situationen), vorher, 'Werte nach Speichern und Wiederöffnen');
  assert.ok(ids(neu2.V).includes('notar') && ids(neu2.V).includes('hauskauf'));
});

test('[Kein Übergriff] eine Datei kann eine Situation, die das Produkt anbietet, nicht über ihre Mitschrift ersetzen', async () => {
  const { V } = await frisch('pro-de');
  const d = V.getData();
  const titelVorher = V.situationenAlle().find((s) => s.id === 'pro-vertretung').titel;
  d.situationen = { 'pro-vertretung': { x: 'y' } };
  d.abWerkMitschrift.situationen = [{ modulTyp: 'situation', herkunft: 'fremd', moduleVersion: 1,
    situationen: { 'pro-vertretung': { icon: 'star', titel: 'Fremd', bloecke: [] } } }];
  assert.deepEqual(V._ruhendeSituationenWecken(d), []);
  assert.equal(V.situationenAlle().find((s) => s.id === 'pro-vertretung').titel, titelVorher);
});
