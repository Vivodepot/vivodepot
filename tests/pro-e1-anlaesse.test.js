'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Pro-Posten E1: die Anlässe führen mit Leitfragen, jedes Feld mit Hinweis steht in einem Anlass (25.10.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Gemessen am gebauten pro-de und pro-en:
   - jeder Block der vier Pro-Anlässe trägt Leitfragen als Block-Hinweis (`hint`, im Kern als `sektion-hint` gezeigt), in
     beiden Sprachen in denselben Blöcken;
   - jedes Feld eines Pro-Bereichs, das einen Hinweis trägt, steht in mindestens einem Anlass;
   - die Felder einzelner Branchen bleiben im Grund-Pro (Spezifikation Abschnitt 2: die Rechtsform blendet nichts aus;
     Entscheidung 23.10.2026: kein Handwerksmodul) und nennen ihre Bedingung am Anfang des Hinweises;
   - zwei Felder, die dieselben Personen zu verschiedenem Zweck erfassen (Kontakt und Registerstand, eines sensibel, das
     andere nicht), bleiben getrennt und nennen im Hinweis einander.
   Rot-Beweis je Regel an einem erfundenen Stand.
   ═════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const P = require('./produkt-html-erzeugen.js');

const PW = 'NURPROBE-' + 'anlaesse'.repeat(2);
const PRO_VIER = ['pro-vertretung', 'pro-uebergabe', 'pro-einarbeitung', 'pro-nachfolge'];
const BRANCHE = Object.freeze({
  'pro-betrieb-zugaenge.tpl_crafts_register': true,
  'pro-kontakte-vertretungsplan.tpl_substitute_technical_manager': true,
  'pro-kontakte-vertretungsplan.tpl_deputy_permit': true,
  'pro-betrieb-zugaenge.tpl_electronic_record_keeping_systems': true,
});
const BEDINGUNG = { de: /^Nur wenn Ihr Betrieb /, en: /^Only if your business / };
// Je Feld die Felder, auf die sein Hinweis zeigen muss.
const GETRENNT = Object.freeze({
  'pro-vertretung-vollmachten.tpl_weitere_vertretungsberechtigte_person_vorhanden': ['pro-vertretung-vollmachten.tpl_weitere_geschaeftsfuehrer_vorstaende'],
  'pro-vertretung-vollmachten.tpl_weitere_geschaeftsfuehrer_vorstaende': ['pro-vertretung-vollmachten.tpl_managing_director_register_details'],
  'pro-vertretung-vollmachten.tpl_managing_director_register_details': ['pro-vertretung-vollmachten.tpl_weitere_geschaeftsfuehrer_vorstaende'],
});

const gebaut = new Map();
async function kern(slug) {
  if (!gebaut.has(slug)) {
    const k = P.kernAus(P.produktHtml(slug));
    await k.V.depotAnlegen(PW);
    gebaut.set(slug, k);
  }
  return gebaut.get(slug);
}
const produkt = async (slug) => (await kern(slug)).V;

// Die Felder der Pro-Bereiche als Ort → Feld.
function proFelder(V) {
  const aus = new Map();
  for (const b of V.bereicheAlle()) {
    if (!b.id.startsWith('pro-')) continue;
    for (const s of b.sektionen || []) for (const f of s.felder || []) aus.set(b.id + '.' + f.id, f);
  }
  return aus;
}
const proSituationen = (V) => V.situationenAlle().filter((s) => PRO_VIER.includes(s.id));

function bloeckeOhneLeitfragen(situationen) {
  return situationen.flatMap((s) => s.bloecke.filter((b) => typeof b.hint !== 'string' || !/\?/.test(b.hint)).map((b) => s.id + '#' + b.id));
}
function hinweisFelderOhneAnlass(felder, situationen) {
  const da = new Set(situationen.flatMap((s) => s.bloecke.flatMap((b) => b.eintraege.map((e) => e.quelle + '.' + e.feld))));
  return [...felder].filter(([ort, f]) => typeof f.hint === 'string' && f.hint.trim() && !da.has(ort)).map(([ort]) => ort);
}
function branchenOhneBedingung(felder, sprache) {
  return Object.keys(BRANCHE).filter((ort) => !felder.has(ort) || !BEDINGUNG[sprache].test(felder.get(ort).hint || ''));
}
function getrenntOhneVerweis(felder) {
  const funde = [];
  for (const [ort, ziele] of Object.entries(GETRENNT)) {
    const f = felder.get(ort);
    for (const z of ziele) {
      const label = felder.get(z) && felder.get(z).label;
      if (!f || !label || !(f.hint || '').includes(label)) funde.push(ort + ' → ' + z);
    }
  }
  return funde;
}

for (const [slug, sprache] of [['pro-de', 'de'], ['pro-en', 'en']]) {
  test('[Pro·E1] ' + slug + ': jeder Block der vier Anlässe trägt Leitfragen', async () => {
    const sit = proSituationen(await produkt(slug));
    assert.deepEqual(sit.map((s) => s.id), PRO_VIER, 'Vorbedingung: die vier Pro-Anlässe');
    assert.ok(sit.every((s) => s.bloecke.length > 0));
    assert.deepEqual(bloeckeOhneLeitfragen(sit), []);
  });

  test('[Pro·E1] ' + slug + ': jedes Feld mit Hinweis steht in einem Anlass', async () => {
    const V = await produkt(slug);
    const felder = proFelder(V);
    assert.ok([...felder.values()].filter((f) => f.hint).length >= 100, 'Vorbedingung: die Hinweise sind gelesen');
    assert.deepEqual(hinweisFelderOhneAnlass(felder, proSituationen(V)), []);
  });

  test('[Pro·E1] ' + slug + ': Branchenfelder bleiben im Grund-Pro und nennen ihre Bedingung', async () => {
    assert.deepEqual(branchenOhneBedingung(proFelder(await produkt(slug)), sprache), []);
  });

  test('[Pro·E1] ' + slug + ': Kontakte und Registerangaben bleiben getrennt und nennen einander', async () => {
    assert.deepEqual(getrenntOhneVerweis(proFelder(await produkt(slug))), []);
  });
}

/* Gerendert, nicht nur als Datenstruktur: die Block-Titel und Leitfragen eines Pro-Anlasses kommen aus dem Modul, nicht aus
   dem Textsatz (der kennt die Pro-Anlässe nicht). Bis 25.10.2026 legte der Kern sie beim Einlesen ab, und jede Überschrift
   eines Pro-Blocks stand leer da (Befund PRO-ANLASS-BLOCKTITEL-LEER). */
async function gerendert(slug, sitId) {
  const { V, document } = await kern(slug);
  V.renderSituation(sitId);
  const html = document.getElementById('content').innerHTML;
  return {
    titel: [...html.matchAll(/<h3 class="sektion-titel">([^<]*)<\/h3>|<span class="feldgruppen-karte-titel">([^<]*)<\/span>/g)]
      .map((m) => (m[1] !== undefined ? m[1] : m[2]).trim()),
    hinweise: [...html.matchAll(/<p class="sektion-hint">([^<]*)<\/p>/g)].map((m) => m[1].trim()),
  };
}
for (const slug of ['pro-de', 'pro-en']) {
  test('[Pro·E1] ' + slug + ': jeder Block eines Anlasses zeigt seine Überschrift und seine Leitfragen', async () => {
    const V = await produkt(slug);
    for (const s of proSituationen(V)) {
      const g = await gerendert(slug, s.id);
      assert.equal(g.titel.length, s.bloecke.length, s.id + ': ein Block, eine Überschrift');
      assert.deepEqual(g.titel.filter((t) => !t), [], s.id + ': keine leere Überschrift');
      assert.equal(g.hinweise.filter((h) => /\?/.test(h)).length, s.bloecke.length, s.id + ': je Block die Leitfragen');
    }
  });
}

test('[Pro·E1] deutsch und englisch tragen die Leitfragen in denselben Blöcken', async () => {
  const form = (V) => proSituationen(V).map((s) => [s.id, s.bloecke.map((b) => [b.id, typeof b.hint === 'string'])]);
  assert.deepEqual(form(await produkt('pro-en')), form(await produkt('pro-de')));
});

test('[Pro·E1·Rot-Beweis] ein Block ohne Leitfrage, ein Hinweisfeld ohne Anlass, ein Branchenfeld ohne Bedingung, ein Paar ohne Verweis', () => {
  const sit = [{ id: 'pro-x', bloecke: [{ id: 'a', hint: 'Wer?', eintraege: [{ quelle: 'pro-b', feld: 'f1' }] }, { id: 'b', eintraege: [] }] }];
  assert.deepEqual(bloeckeOhneLeitfragen(sit), ['pro-x#b']);
  assert.deepEqual(bloeckeOhneLeitfragen([{ id: 'pro-x', bloecke: [{ id: 'a', hint: 'Eine Aussage.', eintraege: [] }] }]), ['pro-x#a']);
  const felder = new Map([['pro-b.f1', { hint: 'H' }], ['pro-b.f2', { hint: 'H' }], ['pro-b.f3', {}]]);
  assert.deepEqual(hinweisFelderOhneAnlass(felder, sit), ['pro-b.f2']);
  const ort = Object.keys(BRANCHE)[0];
  assert.deepEqual(branchenOhneBedingung(new Map([[ort, { hint: 'Eintrag, Betriebsleitung und Kammer.' }]]), 'de').includes(ort), true);
  const [a, [b]] = Object.entries(GETRENNT)[0];
  assert.deepEqual(getrenntOhneVerweis(new Map([[a, { hint: 'ohne Verweis' }], [b, { label: 'Ziel' }]])).includes(a + ' → ' + b), true);
});
