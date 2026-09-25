'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Jedes Import-Format sagt der Bürgerin, was die Datei IST — Posten 19
   ────────────────────────────────────────────────────────────────────────
   DER ANLASS (27.07.2026). Der Satz „Vivodepot kennt diese Art von Datei —
   {quelle}." setzte zunächst das `label` des Formats ein. Die Labels sind
   aber Menü-Einträge im Imperativ:

       „Vivodepot kennt diese Art von Datei — Steuerdaten einlesen
        (Steuerbescheid)."

   Gemessen brach das bei ALLEN siebzehn Formaten — keines ist ein Nomen,
   jedes endet auf „einlesen" oder „übernehmen". In einen Satz gestellt liest
   sich das wie eine Knopfbeschriftung, nicht wie Deutsch.

   DIE ANTWORT ist ein eigenes Feld statt einer Umformulierung des Satzes:
   `strings:importKlartext.<formatId>.text` — Nomen mit Artikel, aus Sicht der Bürgerin.
   Nicht wie der Standard heißt, sondern was die Datei für sie ist.

   WARUM ALS DAUERTEST. Ein neues Format bringt sein `label` selbstverständlich
   mit — die Klartextbezeichnung würde man vergessen, und der Satz fiele
   still auf das Menü-Label zurück. Genau das fällt hier sofort auf.

   NEBENERTRAG: die Bezeichnungen sind reines L1. Sie sind übersetzbar, ohne
   dass am Datenmodell irgendetwas passiert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const SATZ = (k) => `Vivodepot kennt diese Art von Datei — ${k}.`;

/* A361 (20.08.2026): `importKlartext` ist gehoben — es gibt keine Karte `STRINGS.importKlartext`
   mehr, sondern siebzehn Kennungen `strings:importKlartext.<formatId>.text` und die Lese-Stelle
   `importKlartextFuer`. Diese Probe liest ab jetzt DORT, wo die Anwendung liest; die Karte unten
   wird für die Verwaist-Richtung aus dem Satz gebildet, nicht aus einer zweiten Quelle. */
const KENNUNG = 'strings:importKlartext.';
function idsUndKlartext() {
  const { V } = ladeKern();
  const ids = [...(V.IMPORT_FORMATE || [])].map((f) => f.id);
  const klar = Object.create(null);
  for (const k of Object.keys(V.TEXTSATZ_DE_QUELLE.texte)) {
    if (k.indexOf(KENNUNG) !== 0) continue;
    const formatId = k.slice(KENNUNG.length, k.length - '.text'.length);
    klar[formatId] = V.importKlartextFuer(formatId);
  }
  return { V, ids, klar };
}

test('[Klartext] JEDES Import-Format trägt eine Klartextbezeichnung', () => {
  const { ids, klar } = idsUndKlartext();
  assert.ok(ids.length >= 15, `zu wenige Formate (${ids.length}) — der Test prüft sonst nichts`);
  const fehlt = ids.filter((id) => !klar[id]);
  assert.deepEqual(fehlt, [],
    'Diese Formate haben keine Klartextbezeichnung. Der Satz „Vivodepot kennt diese Art\n' +
    'von Datei — …" fiele bei ihnen auf das Menü-Label zurück, und das ist ein Imperativ:\n  ' +
    fehlt.join('\n  ') + '\nEin Nomen mit Artikel als `strings:importKlartext.<formatId>.text` ergänzen.');
});

test('[Klartext] und KEINE steht dort, die zu keinem Format gehört', () => {
  // Die andere Richtung: eine Bezeichnung für ein entferntes Format ist toter
  // Text, der beim nächsten Lesen wie geltend aussieht.
  const { ids, klar } = idsUndKlartext();
  const verwaist = Object.keys(klar).filter((id) => !ids.includes(id));
  assert.deepEqual(verwaist, [], 'verwaiste Klartextbezeichnungen ohne Format');
});

test('[Klartext] jede ist ein Nomen mit Artikel — kein Menü-Eintrag', () => {
  const { ids, klar } = idsUndKlartext();
  const schlecht = [];
  for (const id of ids) {
    const k = klar[id];
    if (!k) continue;
    // Artikel am Anfang: das ist es, was den Satz tragen lässt.
    if (!/^(ein|eine|mehrere) /.test(k)) schlecht.push(`${id}: „${k}" beginnt ohne Artikel`);
    // Und kein Imperativ-Rest aus der Menü-Welt.
    if (/einlesen|übernehmen|wählen/i.test(k)) schlecht.push(`${id}: „${k}" ist eine Handlungsaufforderung`);
  }
  assert.deepEqual(schlecht, [],
    'Diese Bezeichnungen tragen den Satz nicht:\n  ' + schlecht.join('\n  ') +
    '\nProbe: ' + SATZ('eine Meldung von einer Behörde'));
});

/* ── POSITIVKONTROLLE (§3.5b) ─────────────────────────────────────────── */
test('[Klartext·Positivkontrolle] ein Format OHNE Bezeichnung wird gemeldet', () => {
  const { klar } = idsUndKlartext();
  // Genau der Zustand, der beim nächsten neuen Format entsteht.
  const ids = ['elster', '__probe-neues-format'];
  const fehlt = ids.filter((id) => !klar[id]);
  assert.deepEqual(fehlt, ['__probe-neues-format'],
    'die Lücken-Prüfung muss ein unbekanntes Format namentlich melden — und nur dieses');
});

test('[Klartext·Positivkontrolle] ein Menü-Label fällt durch die Sprachprüfung', () => {
  // Ohne sie belegte nichts, dass die Prüfung Imperative erkennt: eine Prüfung,
  // die alles durchlässt, wäre oben ebenso grün (§3.5d).
  const label = 'Steuerdaten einlesen (Steuerbescheid)';
  assert.ok(!/^(ein|eine|mehrere) /.test(label), 'kein Artikel');
  assert.match(label, /einlesen/, 'und ein Imperativ — genau der gemessene Ausgangszustand');
});

/* ── Der Satz, für den das Ganze gebaut ist ────────────────────────────── */
test('[Klartext] der fertige Satz enthält keinen Platzhalter-Rest', () => {
  const { V, ids, klar } = idsUndKlartext();
  for (const id of ids) {
    const fertig = V.STRINGS.importOhneAngaben.replaceAll('{quelle}', klar[id]);
    assert.ok(!fertig.includes('{quelle}'), `${id}: Platzhalter blieb stehen`);
    assert.ok(fertig.includes(klar[id]), `${id}: die Bezeichnung steht im Satz`);
  }
});
