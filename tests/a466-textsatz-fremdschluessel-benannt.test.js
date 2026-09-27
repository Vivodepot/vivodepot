'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A466 (Laufzettel Nacht 22./23.08.2026, Posten 12) — Schicht 3: der Textsatz
   benennt Fremdschlüssel jetzt, wie das Format-Register
   ────────────────────────────────────────────────────────────────────────────
   GEMESSEN am 21.08. (Stresstest 1, `tests/stresstest-01-boesartiges-modul.
   test.js`): ein Textsatz-Modul mit `sektoren`/`personen` wurde angenommen,
   die Fremdschlüssel reisten über `modulEinlassen`s `Object.assign({}, modul,
   …)` für immer ins gespeicherte Modul, und `verworfene` blieb leer — anders
   als beim Format-Register (`FORMAT_MODUL_SCHLUESSEL`), das denselben Fall
   benannt hätte. DIE ASYMMETRIE WAR DER BEFUND, nicht eine Wirkung (beide
   Register speichern das rohe Modul gleichermassen).

   GEBAUT: `TEXTSATZ_MODUL_SCHLUESSEL`, wörtlicher Spiegel von
   `FORMAT_MODUL_SCHLUESSEL` — inklusive der Marken, die `modulEinlassen`
   selbst nachträglich anfügt (`ungeprueft`/`eingelassenAm`/`anbieterId`/
   `anbieterIdGeprueft`), sonst würde ein bereits angedocktes, legitimes Modul
   beim nächsten Laden fälschlich seine eigenen Marken als „unbekannt" melden
   (Test „Gegenprobe" unten).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[A466] ein Textsatz-Modul mit Fremdschlüsseln bleibt gültig, benennt sie aber jetzt', () => {
  const { V } = ladeKern();
  const geprueft = V.textsatzModulPruefen({
    modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, texte: {},
    sektoren: { identitaet: { vorname: 'Bösartig' } }, personen: [{ name: 'Fremd' }],
  });
  assert.equal(geprueft.gueltig, true, 'das Modul bleibt gültig — nur benannt, nicht abgewiesen');
  assert.deepEqual(geprueft.verworfene.filter((v) => v.grund === 'unbekannt').map((v) => v.schluessel).sort(),
    ['personen', 'sektoren']);
});

test('[A466] ein sauberes Modul ohne Fremdschlüssel bleibt ohne jeden Verworfen-Eintrag', () => {
  const { V } = ladeKern();
  const geprueft = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'es', moduleVersion: 1,
    texte: {}, regeln: { schreibrichtung: 'ltr' }, rechtsraum: 'AT' });
  assert.equal(geprueft.gueltig, true);
  assert.deepEqual(geprueft.verworfene, [], 'alle sechs legitimen Schlüssel sind bekannt');
});

test('[A466·Gegenprobe] die eigenen nachträglichen Marken des Kerns gelten NICHT als Fremdschlüssel', () => {
  // Genau die Marken, die modulEinlassen() nachträglich anfügt (Object.assign) — ein bereits
  // angedocktes Modul wird beim nächsten Laden über _textsatzModuleAusDepotAnmelden erneut
  // durch textsatzModulPruefen geprüft und darf dabei nicht plötzlich "unbekannt" melden.
  const { V } = ladeKern();
  const geprueft = V.textsatzModulPruefen({
    modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, texte: {}, appVersion: 1,
    ungeprueft: true, eingelassenAm: '23.08.2026', anbieterId: 'kammer-fr', anbieterIdGeprueft: true,
  });
  assert.equal(geprueft.gueltig, true);
  assert.deepEqual(geprueft.verworfene, [], 'keine der sechs Kern-Marken gilt als unbekannt');
});

test('[A466] die Gegenprobe zum Format-Register: beide benennen denselben Fremdschlüssel gleich', () => {
  const { V } = ladeKern();
  const formatGeprueft = V.formatModulPruefen({ modulTyp: 'format', sprache: 'de', moduleVersion: 1,
    format: 'eig', richtung: 'import', sektor: 'identitaet', label: 'L', akzeptiert: '.json',
    leser: 'json', erkennen: [], zuordnung: [], sektoren: { x: 1 } });
  const textsatzGeprueft = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'de', moduleVersion: 1,
    texte: {}, sektoren: { x: 1 } });
  const formatFund = formatGeprueft.verworfene.find((v) => v.schluessel === 'sektoren');
  const textsatzFund = textsatzGeprueft.verworfene.find((v) => v.schluessel === 'sektoren');
  assert.ok(formatFund && textsatzFund, 'beide Register benennen den Fund');
  assert.deepEqual(formatFund, textsatzFund, 'in derselben Form — keine Asymmetrie mehr');
});
