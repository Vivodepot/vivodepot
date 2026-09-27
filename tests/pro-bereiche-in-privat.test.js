'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Pro-Bereiche in Privat — jede Datei öffnet in jedem Produkt (Entscheidung 16.09.2026, U2-ADR-398)
   ────────────────────────────────────────────────────────────────────────────
   Zwei Befunde, eine Bauform:
   1. Eine Pro-Datei von VOR dem vierten Mitschrift-Fach (Nutzertest-Dateien v701/v705) trug ihre
      Pro-Werte ohne die Definition der Pro-Bereiche. privat-de und privat-en parkten alle Werte
      in `bereicheVerwaist` und zeigten nichts. Jetzt backt der Konfektionierer die Bereiche
      aller Vivodepot-Produkte in jedes Produkt (`AB_WERK_BEREICHE_BEKANNT`), als dritte Quelle.
   2. Die Beschriftungen folgen der Sprache des Produkts (B3, eigener Commit davor:
      tests/angedockte-feldtexte-folgen-der-sprache.test.js).
   Gemessen wird an ECHT konfektionierten Produkten, deutsch und englisch.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const { bekannteBereicheErzeugen, inhalt } = require('../tools/vivodepot-bereiche-bekannt-erzeugen.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const PW = 'Pro-Bereiche-in-Privat-2026';
const BEREICH = 'pro-vertretung-vollmachten';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-bereiche-in-privat-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const gebaut = new Map();
function produktPfad(slug, ohneRegion) {
  const schluessel = slug + (ohneRegion ? '-ohne-region' : '');
  if (!gebaut.has(schluessel)) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    const dateien = VP.modulDateienFuer(p).filter((f) => !ohneRegion || f !== VP.BEREICHE_BEKANNT_PFAD);
    const r = konfektionieren({
      ziel: path.join(TMP, schluessel), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: dateien,
    });
    gebaut.set(schluessel, path.join(r.ordner, 'vivodepot.html'));
  }
  return gebaut.get(schluessel);
}
function kern(slug, ohneRegion) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = produktPfad(slug, ohneRegion);
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern().V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}

/* Eine Pro-Datei wie aus v705: ein Wert in einem Pro-Bereich, KEIN viertes Mitschrift-Fach. */
async function proDateiOhneViertesFach(proSlug, mitWert) {
  const pro = kern(proSlug);
  await pro.depotAnlegen(PW);
  const feld = pro.SEKTOR_BY_ID[BEREICH].sektionen[0].felder.find((f) => f.typ === 'text' || f.typ === 'textarea');
  const d = pro.getData();
  if (mitWert) d.sektoren[BEREICH] = Object.assign({}, d.sektoren[BEREICH] || {}, { [feld.id]: 'Wert aus Pro' });
  // Eine Datei von vor dem vierten Fach kennt weder `bereichsErsatz` noch das heutige Fach `bereich`, in dem ein
  // Pro-Produkt seine Bereichs-Definitionen mitschreibt — beide fallen weg, sonst brächte die Datei die Definitionen
  // selbst mit und die eingebackene Region (die dritte Quelle) würde nie gebraucht.
  delete d.abWerkMitschrift.bereichsErsatz;
  d.abWerkMitschrift.bereich = [];
  pro.setData(d);
  return { umschlag: JSON.parse(JSON.stringify(await pro.depotSerialisieren())), feldId: feld.id, label: pro.feldDefFuer(BEREICH, feld.id).label };
}

function altProDateiVerstoesse(V, feldId, erwartetesLabel) {
  const v = [];
  const d = V.getData();
  if (!V.bereicheAlle().some((b) => b.id === BEREICH)) v.push('Pro-Bereich nicht im Produkt');
  if (!d.sektoren[BEREICH] || d.sektoren[BEREICH][feldId] !== 'Wert aus Pro') v.push('Wert nicht im Bereich: ' + JSON.stringify(d.sektoren[BEREICH]));
  if (Object.keys(d.bereicheVerwaist || {}).length) v.push('verwaist: ' + Object.keys(d.bereicheVerwaist).join(', '));
  let label = null;
  try { label = V.feldDefFuer(BEREICH, feldId).label; } catch (_) { label = null; }
  if (label !== erwartetesLabel) v.push('Beschriftung „' + label + '" statt „' + erwartetesLabel + '"');
  if (!(d.abWerkMitschrift && d.abWerkMitschrift.bereichsErsatz && d.abWerkMitschrift.bereichsErsatz.neu && d.abWerkMitschrift.bereichsErsatz.neu[BEREICH])) {
    v.push('das vierte Fach trägt die Definition nach dem Öffnen nicht');
  }
  return v;
}

test('[Pro-Bereiche·privat-de] eine Pro-Datei ohne viertes Fach zeigt ihre Pro-Werte, nichts verwaist', async () => {
  const datei = await proDateiOhneViertesFach('pro-de', true);
  const V = kern('privat-de');
  await V.depotLaden(datei.umschlag, PW);
  const verstoesse = altProDateiVerstoesse(V, datei.feldId, datei.label);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Pro-Bereiche·privat-en] eine Pro-Datei ohne viertes Fach zeigt ihre Pro-Werte englisch, nichts verwaist', async () => {
  const datei = await proDateiOhneViertesFach('pro-en', true);
  const V = kern('privat-en');
  await V.depotLaden(datei.umschlag, PW);
  const verstoesse = altProDateiVerstoesse(V, datei.feldId, datei.label);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Pro-Bereiche·Rot-Beweis] ohne die eingebackene Region parkt Privat die Werte wie vorher', async () => {
  const datei = await proDateiOhneViertesFach('pro-de', true);
  const V = kern('privat-de', true);
  await V.depotLaden(datei.umschlag, PW);
  const verstoesse = altProDateiVerstoesse(V, datei.feldId, datei.label);
  assert.ok(verstoesse.some((x) => /verwaist/.test(x)), 'Wächter blind: ' + verstoesse.join(' · '));
});

test('[Pro-Bereiche·Gegenprobe] ohne Pro-Werte zeigt Privat keinen Pro-Bereich und schreibt kein viertes Fach', async () => {
  for (const [pro, privat] of [['pro-de', 'privat-de'], ['pro-en', 'privat-en']]) {
    const datei = await proDateiOhneViertesFach(pro, false);
    const V = kern(privat);
    await V.depotLaden(datei.umschlag, PW);
    assert.deepEqual(V.bereicheAlle().filter((b) => b.id.startsWith('pro-')).map((b) => b.id), [], privat);
    assert.ok(!(V.getData().abWerkMitschrift && V.getData().abWerkMitschrift.bereichsErsatz), privat + ': viertes Fach geschrieben');
  }
});

test('[Pro-Bereiche·Drift] die Datei der bekannten Bereiche entspricht den Bereichsersätzen, und jedes Produkt trägt sie', () => {
  assert.equal(fs.readFileSync(VP.BEREICHE_BEKANNT_PFAD, 'utf8'), inhalt(bekannteBereicheErzeugen()),
    'neu erzeugen: node tools/vivodepot-bereiche-bekannt-erzeugen.js');
  const erwartet = JSON.stringify(bekannteBereicheErzeugen());
  for (const p of VP.PRODUKTE) {
    const text = fs.readFileSync(produktPfad(p.slug), 'utf8');
    assert.ok(text.includes('const AB_WERK_BEREICHE_BEKANNT = ' + erwartet + ';'), p.slug + ' trägt die Region nicht');
  }
});

module.exports = {
  PROBEN: [
    { fuer: '[Pro-Bereiche·privat-de] eine Pro-Datei ohne viertes Fach zeigt ihre Pro-Werte, nichts verwaist', diskriminante: altProDateiVerstoesse },
    { fuer: '[Pro-Bereiche·privat-en] eine Pro-Datei ohne viertes Fach zeigt ihre Pro-Werte englisch, nichts verwaist', diskriminante: altProDateiVerstoesse },
  ],
};
