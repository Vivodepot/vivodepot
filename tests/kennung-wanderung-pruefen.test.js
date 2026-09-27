'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   kennung-wanderung-pruefen.test.js — Rot-Beweis für tools/kennung-wanderung-
   pruefen.js (Bereich→Template-Schnitt, Strang C, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER WÄCHTER, DER DIESEN ZUG TRÄGT: ein Bereich-Template (modulTyp:'bereich',
   Stufe 2, 09.09.2026) darf keine Text-Rolle (label/hint/frage/hilfetext/...)
   als literalen Wert tragen — Text kommt aus der Sprachachse, nie aus dem
   Modul (wörtliche Auflage, 17.09.2026) — UND keine quer liegende Kennungs-
   Gruppe (strings:/wizard:/situation:/dokument./vollmacht:/pro-/feldgruppe./
   angSituation:/anlass:) darf im Bereich-Modul selbst auftauchen, statt in den
   gemeinsamen Sprachmodulen zu bleiben.

   AUSNAHME, GEMESSEN GEGEN DEN ECHTEN LAUF (nicht geraten): standardDokumente
   [].name/.hinweis sind KEINE gewanderte Kennung — eigene, bereits verdrahtete
   Lesestelle `_dokumentTextsatzText` (vivodepot.html:15378, sechs generische
   Aufrufstellen), Deutsch als `rueckfall`, exakt dieselbe Konvention wie bei
   Feld-Labels. Ohne diese Ausnahme meldete das Werkzeug am ECHTEN Artefakt
   `tools/bereich-templates/vivodepot-mobility.json` (aus einem Wegwerf-
   Arbeitsbaum für den Mobilitäts-Bereich) sechs falsche Funde.

   ZWEITER FUND AM EIGENEN WERKZEUG: `wizard` ohne Trennzeichen fängt auch die
   STRUKTUR-Eigenschaft `bereich.wizards` (Array von Wizard-IDs) — kein
   Textsatz-Schlüssel. Gemessen an der bereits gelandeten housing/wohnen-
   Nutzlast (`BEREICH_QUELLEN_EINGEBAUT`, vivodepot.html): 1 falscher Fund vor
   der Korrektur auf `wizard:` (mit Doppelpunkt). Die Rot-Beweise unten prüfen
   beide Fundarten UND beide vermiedenen Fehlalarme.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pruefeBereichsModul } = require('../tools/kennung-wanderung-pruefen.js');

test('[Kennungs-Wanderung] sauberes Bereich-Modul: 0 Funde in allen drei Kategorien', () => {
  const modul = {
    modulTyp: 'bereich', kennung: 'vivodepot/fixture', sprache: 'de',
    bereiche: { fixture: { id: 'fixture', wizards: ['umzwiz'], sektionen: [
      { id: 'block-1', felder: [{ id: 'feldA', typ: 'text' }] },
    ] } },
  };
  const ergebnis = pruefeBereichsModul(modul, {});
  assert.equal(ergebnis.textInModul.length, 0);
  assert.equal(ergebnis.querLiegendGefunden.length, 0, 'bereich.wizards (Struktur) darf NICHT als quer-liegende Kennung zaehlen');
});

test('[Kennungs-Wanderung·Rot-Beweis] gewanderte Kennung (label literal im Modul) wird gefunden', () => {
  const modul = {
    modulTyp: 'bereich', bereiche: { fixture: { id: 'fixture', sektionen: [
      { id: 'block-1', felder: [{ id: 'feldA', typ: 'text', label: 'Feld A (literal, falsch)' }] },
    ] } },
  };
  const ergebnis = pruefeBereichsModul(modul, {});
  assert.equal(ergebnis.textInModul.length, 1);
  assert.match(ergebnis.textInModul[0].pfad, /label$/);
});

test('[Kennungs-Wanderung·Rot-Beweis] quer liegende Kennung (wizard:) im Bereich-Modul wird gefunden', () => {
  const modul = {
    modulTyp: 'bereich', bereiche: { fixture: { id: 'fixture', sektionen: [],
      'wizard:irgendwas.frage': 'darf hier nicht stehen' } },
  };
  const ergebnis = pruefeBereichsModul(modul, {});
  assert.equal(ergebnis.querLiegendGefunden.length, 1);
  assert.equal(ergebnis.querLiegendGefunden[0], 'wizard:irgendwas.frage');
});

test('[Kennungs-Wanderung·Ausnahme] standardDokumente[].name/.hinweis sind KEIN Fund (eigene, verdrahtete Lesestelle)', () => {
  const modul = {
    modulTyp: 'bereich', bereiche: { fixture: { id: 'fixture',
      standardDokumente: [{ typ: 'reisepass', name: 'Reisepass', hinweis: 'Zehn Jahre gueltig.' }],
      sektionen: [],
    } },
  };
  const ergebnis = pruefeBereichsModul(modul, {});
  assert.equal(ergebnis.textInModul.length, 0, 'standardDokumente[].name/.hinweis duerfen literal deutsch stehen — Konvention wie Feld-Labels');
});

test('[Kennungs-Wanderung·Stamm] --stamm situationen: text-in-modul und quer-liegend greifen, kennung-fehlt bleibt leer', () => {
  const modul = {
    modulTyp: 'situation',
    situationen: { geburt: { id: 'geburt', felder: [{ id: 'x', typ: 'text', label: 'literal, falsch' }],
      'wizard:fremd.frage': 'darf hier nicht stehen' } },
  };
  const ergebnis = pruefeBereichsModul(modul, { stamm: 'situationen', deTexte: {}, enTexte: {} });
  assert.equal(ergebnis.textInModul.length, 1, 'text-in-modul ist struktur-agnostisch, muss auch unter situationen greifen');
  assert.equal(ergebnis.querLiegendGefunden.length, 1, 'quer-liegend ist struktur-agnostisch, muss auch unter situationen greifen');
  assert.equal(ergebnis.kennungFehlt.length, 0, 'kennung-fehlt ist NUR fuer stamm=bereiche gemessen, bleibt fuer situationen bewusst leer statt zu raten');
});

test('[Kennungs-Wanderung·Rot-Beweis] kennung-fehlt: fehlende Sprachachsen-Kennung wird gefunden', () => {
  const modul = {
    modulTyp: 'bereich', bereiche: { fixture: { id: 'fixture', sektionen: [
      { id: 'block-1', felder: [{ id: 'feldA', typ: 'text' }] },
    ] } },
  };
  const ergebnis = pruefeBereichsModul(modul, { deTexte: {}, enTexte: { 'fixture.feldA.label': 'Field A' } });
  const fehlend = ergebnis.kennungFehlt.find((f) => f.kennung === 'fixture.feldA.label');
  assert.ok(fehlend, 'fixture.feldA.label fehlt im DE-Satz (leeres deTexte) und muss gemeldet werden');
  assert.equal(fehlend.fehltDe, true);
  assert.equal(fehlend.fehltEn, false);
});
