'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Pro E7: Meldungen bei Vertretung, Übergabe oder Aufgabe als eine Feldgruppe (25.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Posten E7 der Pro-Spezifikation (docs/spezifikation/pro.md §9): Kammer, KV/KZV, Versorgungswerk, BG, Gewerbeamt und
   Finanzamt in einer Gruppe; die Stelle wählt man aus, darum kein Berufsmodul. Eine unabhängige Quellenprüfung vom 25.10.2026
   ergänzte Handelsregister, Agentur für Arbeit und Zulassungsausschuss und verlangte „je nach Beruf und Betrieb“: keine Stelle
   gilt für jeden Betrieb. Gebaut ohne zweites Feld: das P4-Feld
   „Anzeigen an Gemeinde und Finanzamt“ (pro-betrieb-zugaenge.tpl_tax_registration_of_business) war schon eine Meldeliste für
   zwei der sechs Stellen. Es heißt jetzt „Meldungen bei Vertretung, Übergabe oder Aufgabe“, sein Hinweis nennt alle sechs, das
   Unterfeld „Finanzamt“ heißt „Stelle“ (Kennung tpl_tax_office bleibt), hinten kommt „Zu melden bis“ dazu.
   Gehalten, in pro-de und pro-en, an den echt konfektionierten Produkten:
     [Pro·E7] der Hinweis nennt alle Stellen, das Feld trägt Anlass, Gemeldet am, Stelle und Zu melden bis;
     [Pro·E7·Werterhalt] ein Depot, dessen Eintrag das Unterfeld „Finanzamt“ unter den Kennungen von vor dem Umbenennen trägt,
       öffnet mit demselben Wert, und er steht unter „Stelle“. Die Kennungen sind die des Felds vor E7 (7e90b3ab5), hier
       wörtlich festgehalten, damit die Probe auch ohne Git-Geschichte läuft. Pro-Kennungen entstehen an manchen Stellen aus dem
       deutschen Feldnamen (tools/lib/pro-felder-aus-vorlage.js); entstünde diese hier daraus, fände der Wert sein Unterfeld nicht mehr;
     [Pro·E7·eine Gruppe] kein zweites Pro-Feld erfasst eine Meldung an eine dieser Stellen bei Vertretung, Übergabe oder Aufgabe.
   Je ein Rot-Beweis. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const { after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const PW = 'E7-Meldungen-Probe-2026!';
const BEREICH = 'pro-betrieb-zugaenge';
const FELD = 'tpl_tax_registration_of_business';
// Die Unterfelder vor E7 (7e90b3ab5), Kennung und Typ; ihr deutscher Name war Anlass, Angezeigt am, Finanzamt.
const VORHER = [['tpl_occasion', 'text'], ['tpl_notified_on', 'datum'], ['tpl_tax_office', 'text']];
const NEU = ['tpl_notify_by', 'datum'];
const STELLEN = {
  'pro-de': [/Kammer/, /Kassenärztliche/, /Kassenzahnärztliche/, /Zulassungsausschuss/, /Versorgungswerk/, /Berufsgenossenschaft/, /Gewerbeamt/, /Finanzamt/, /Handelsregister/, /Agentur für Arbeit/, /je nach Beruf und Betrieb/],
  'pro-en': [/chamber/, /KV\/KZV/, /Zulassungsausschuss/, /pension fund/, /Berufsgenossenschaft/, /trade office/, /tax office/, /commercial register/, /Agentur für Arbeit/, /depending on your profession and business/],
};
const BESCHRIFTUNG = {
  'pro-de': { tpl_occasion: 'Anlass', tpl_tax_office: 'Stelle', tpl_notify_by: 'Zu melden bis' },
  'pro-en': { tpl_occasion: 'Occasion', tpl_tax_office: 'Body', tpl_notify_by: 'To be notified by' },
};
const STELLE = /Handelsregister|commercial register|Agentur für Arbeit|Employment Agency|Zulassungsausschuss|admissions committee|Kammer|chamber|Kassen(zahn)?ärztlich|KZV|\bKV\b|Versorgungswerk|pension fund|Berufsgenossenschaft|Gewerbeamt|trade office|Finanzamt|tax office/i;
const MELDUNG = /meld|anzeig|notif/i;
const ANLASS = /vertret|übergab|aufgab|deputis|handover|handing over|closure|closing/i;

const gebaut = new Map();
const zielOrdner = [];
after(() => { for (const z of zielOrdner) fs.rmSync(z, { recursive: true, force: true }); });
function produktPfad(slug) {
  if (!gebaut.has(slug)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-pro-meldungen-' + slug + '-'));
    zielOrdner.push(ziel);
    const r = konfektionieren({
      ziel, slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  return gebaut.get(slug);
}
// Genau das konfektionierte Produkt, ungebacken: htmlPfad für diesen Aufruf, ohne den Kern der Umgebung umzulenken.
function produktKern(slug) {
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern({ htmlPfad: produktPfad(slug) }); } finally {
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}
const felderVon = (s) => (s.sektionen || []).flatMap((x) => x.felder || []);
const feldIn = (V) => felderVon(V.SEKTOR_BY_ID[BEREICH]).find((f) => f.id === FELD);

function gruppeFunde(feld, slug) {
  const funde = [];
  if (!feld) return ['Feld ' + FELD + ' fehlt'];
  for (const re of STELLEN[slug]) if (!re.test(feld.hint || '')) funde.push('Hinweis nennt ' + re.source + ' nicht');
  const ist = (feld.unterFelder || []).map((u) => [u.id, u.typ]);
  if (JSON.stringify(ist.slice(0, VORHER.length)) !== JSON.stringify(VORHER)) funde.push('die alten Unterfelder stehen nicht unverändert vorn');
  if (!ist.some(([id, typ]) => id === NEU[0] && typ === NEU[1])) funde.push('Unterfeld ' + NEU[0] + ' fehlt');
  for (const [id, label] of Object.entries(BESCHRIFTUNG[slug])) {
    const u = (feld.unterFelder || []).find((x) => x.id === id);
    if (!u || u.label !== label) funde.push(id + ' heißt nicht „' + label + '“');
  }
  return funde;
}

// Den Wert eines Eintrags so lesen, wie die Oberfläche ihn zeigt: über die Kennung des Unterfelds mit dieser Beschriftung.
function wertUnter(feld, eintrag, label) {
  const u = (feld.unterFelder || []).find((x) => x.label === label);
  return u ? eintrag[u.id] : undefined;
}

function andereMeldefelder(V) {
  const funde = [];
  for (const [id, s] of Object.entries(V.SEKTOR_BY_ID)) {
    if (!id.startsWith('pro-')) continue;
    for (const f of felderVon(s)) {
      if (id === BEREICH && f.id === FELD) continue;
      const text = [f.label, f.hint, ...(f.unterFelder || []).map((u) => u.label)].filter(Boolean).join(' ');
      if (MELDUNG.test(text) && STELLE.test(text) && ANLASS.test(text)) funde.push(id + '.' + f.id);
    }
  }
  return funde;
}

for (const slug of ['pro-de', 'pro-en']) {
  test('[Pro·E7] ' + slug + ': eine Gruppe für die Meldungen an alle Stellen, mit Stelle, Anlass, Gemeldet am und Zu melden bis', () => {
    const { V } = produktKern(slug);
    assert.deepEqual(gruppeFunde(feldIn(V), slug), []);
  });

  test('[Pro·E7·Werterhalt] ' + slug + ': ein eingetragenes Finanzamt steht nach dem Öffnen unverändert unter „Stelle“', async () => {
    const { V } = produktKern(slug);
    await V.depotAnlegen(PW);
    const eintrag = { tpl_occasion: 'Aufgabe', tpl_notified_on: '2026-09-01', tpl_tax_office: 'Finanzamt Musterstadt' };
    V.getData().sektoren[BEREICH] = { [FELD]: [Object.assign({}, eintrag)] };
    const umschlag = await V.depotSerialisieren();
    const { V: V2 } = produktKern(slug);
    await V2.depotLaden(umschlag, PW);
    const liste = (V2.getData().sektoren[BEREICH] || {})[FELD];
    assert.deepEqual(liste, [eintrag], 'der Eintrag kommt Kennung für Kennung zurück');
    assert.equal(wertUnter(feldIn(V2), liste[0], BESCHRIFTUNG[slug].tpl_tax_office), 'Finanzamt Musterstadt');
  });

  test('[Pro·E7·eine Gruppe] ' + slug + ': kein zweites Pro-Feld erfasst eine Meldung an diese Stellen bei Vertretung, Übergabe oder Aufgabe', () => {
    const { V } = produktKern(slug);
    assert.deepEqual(andereMeldefelder(V), []);
  });
}

test('[Pro·E7·Rot-Beweis] fehlende Stelle, umgestelltes oder fehlendes Unterfeld, alter Name: jedes fällt auf', () => {
  const gut = {
    id: FELD, hint: 'je nach Beruf und Betrieb: Gewerbeamt, Finanzamt, Handelsregister, Agentur für Arbeit, Berufsgenossenschaft, Kassenärztliche oder Kassenzahnärztliche Vereinigung und Zulassungsausschuss, Kammer und Versorgungswerk',
    unterFelder: [
      { id: 'tpl_occasion', typ: 'text', label: 'Anlass' }, { id: 'tpl_notified_on', typ: 'datum', label: 'Gemeldet am' },
      { id: 'tpl_tax_office', typ: 'text', label: 'Stelle' }, { id: 'tpl_notify_by', typ: 'datum', label: 'Zu melden bis' }],
  };
  assert.deepEqual(gruppeFunde(gut, 'pro-de'), [], 'Positivkontrolle');
  const mit = (aend) => Object.assign(JSON.parse(JSON.stringify(gut)), aend);
  assert.match(gruppeFunde(mit({ hint: gut.hint.replace(' und Versorgungswerk', '') }), 'pro-de').join(' '), /Versorgungswerk/);
  assert.match(gruppeFunde(mit({ unterFelder: [gut.unterFelder[2], gut.unterFelder[0], gut.unterFelder[1], gut.unterFelder[3]] }), 'pro-de').join(' '), /nicht unverändert vorn/);
  assert.match(gruppeFunde(mit({ unterFelder: gut.unterFelder.slice(0, 3) }), 'pro-de').join(' '), /tpl_notify_by fehlt/);
  const alt = mit({}); alt.unterFelder[2].label = 'Finanzamt';
  assert.match(gruppeFunde(alt, 'pro-de').join(' '), /tpl_tax_office heißt nicht „Stelle“/);
  assert.match(gruppeFunde(undefined, 'pro-de').join(' '), /fehlt/);
});

test('[Pro·E7·Werterhalt·Rot-Beweis] entstünde die Kennung aus dem neuen Namen, fände der alte Wert sein Unterfeld nicht', () => {
  const eintrag = { tpl_occasion: 'Aufgabe', tpl_tax_office: 'Finanzamt Musterstadt' };
  const feld = { unterFelder: [{ id: 'tpl_occasion', label: 'Anlass' }, { id: 'tpl_tax_office', label: 'Stelle' }] };
  assert.equal(wertUnter(feld, eintrag, 'Stelle'), 'Finanzamt Musterstadt', 'Positivkontrolle');
  const ausDemNamen = { unterFelder: [{ id: 'tpl_occasion', label: 'Anlass' }, { id: 'tpl_stelle', label: 'Stelle' }] };
  assert.equal(wertUnter(ausDemNamen, eintrag, 'Stelle'), undefined, 'ROT ERWARTET: eine aus „Stelle“ gebildete Kennung liest den Wert nicht');
});

test('[Pro·E7·eine Gruppe·Rot-Beweis] ein zweites Feld mit Meldung, Stelle und Anlass fällt auf, eine Meldung ohne Anlass nicht', () => {
  const V = { SEKTOR_BY_ID: { [BEREICH]: { sektionen: [{ felder: [
    { id: FELD, label: 'Meldungen bei Vertretung, Übergabe oder Aufgabe', hint: 'Kammer, Finanzamt' },
    { id: 'tpl_kasse', label: 'Kassen', hint: 'wann dem Finanzamt gemeldet?' },
    { id: 'tpl_zweit', label: 'Anzeige an die Kammer', hint: 'bei Übergabe der Praxis' }] }] } } };
  assert.deepEqual(andereMeldefelder(V), [BEREICH + '.tpl_zweit']);
});
