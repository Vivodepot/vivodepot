'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-13 („Die Sensibel-Architektur", 09.08.2026, Zug 4):
   Ausgabeweg ohne Sensibel-Prüfung. Statische Quelltext-Prüfung: jeder
   Ausgabeweg muss feldIstSensibel/unterfeldIstSensibel im Aufruf-Baum
   tragen. Bauart wie tests/w1-betrag-ohne-zahl-pruefen.test.js —
   Grundlinie, nicht Nulltoleranz.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  funktionsKoerper, prueftSensibel, schluesselFund, gateBewerten, ermittleFunde, EXPORT_FORMAT_IDS, WEITERE_WEGE,
} = require('../tools/w13-ausgabeweg-ohne-sensibel-pruefen.js');
const { ladeKern } = require('./load-kern.js');

const GRUNDLINIE = require('../tools/w13-ausgabeweg-ohne-sensibel-grundlinie.json');

test('[W-13] jeder Grundlinien-Eintrag trägt einen der drei erlaubten Vermerke', () => {
  const erlaubt = new Set(['zu beheben', 'begründete Ausnahme', 'Entscheidung offen']);
  for (const f of GRUNDLINIE) {
    assert.ok(erlaubt.has(f.vermerk), 'unerlaubter Vermerk "' + f.vermerk + '" bei ' + schluesselFund(f));
    assert.ok(f.begruendung && f.begruendung.trim().length > 0, 'Begründung fehlt bei ' + schluesselFund(f));
  }
});

test('[W-13] echter Kern: kein neuer Fund gegen die Grundlinie, die diese nicht kennt', () => {
  const { html } = ladeKern();
  const funde = ermittleFunde(html);
  const { neu, rot } = gateBewerten(funde, GRUNDLINIE);
  assert.deepEqual(neu.map(schluesselFund), [], 'kein neuer Fund gegen die Grundlinie');
  assert.equal(rot, false);
});

test('[W-13] echter Kern: acht der zehn EXPORT_FORMATE-Wege sind über feldIstSensibel/baueAusMapping strukturell abgedeckt', () => {
  const { html } = ladeKern();
  const funde = ermittleFunde(html).filter((f) => f.carrier === 'EXPORT_FORMATE');
  // 11 -> 10 (U2-ADR-NNN, 18.09.2026): 'json' aus EXPORT_FORMAT_IDS entfernt — der offene
  // JSON-Vollexport ist aus EXPORT_FORMATE entfernt, kein Ausgabeweg mehr, den diese Probe
  // dort finden könnte (vollExportJSON bleibt internes Meßinstrument, unverändert geprüft
  // über tests/u2-adr-102-vollexport-weitergabe-filtert.test.js u. a.).
  assert.equal(EXPORT_FORMAT_IDS.length, 10);
  // „Die Ausgabewege, an denen die Prüfung vorbeiläuft" (12.08.2026), Befund 4:
  // vcardIdentitaet() bekam einen echten feldIstSensibel-Prüfpfad — kein struktureller Fund mehr,
  // Grundlinien-Eintrag entfernt (nicht umgeschrieben). Zwei bleiben als begründete Ausnahmen
  // stehen (kein sensibel-fähiges Sektorfeld betroffen), s. Grundlinie.
  assert.deepEqual(funde.map((f) => f.id).sort(), ['ics-vorsorge', 'vcard-menschen']);
});

test('[W-13] echter Kern: situationModell/akutZeileHTML/angehoerigenCacheModell sind alle abgedeckt (Zug 2)', () => {
  const { html } = ladeKern();
  const funde = ermittleFunde(html).filter((f) => f.carrier === 'Weiterer-Weg');
  assert.equal(WEITERE_WEGE.length, 3);
  assert.deepEqual(funde, [], 'alle drei weiteren Wege müssen abgedeckt sein — Zug 2 hat sie verdrahtet');
});

test('[W-13] funktionsKoerper: Klammerzählung findet das echte Ende, nicht das erste `}` im Text', () => {
  const { html } = ladeKern();
  const koerper = funktionsKoerper(html, 'baueAusMapping');
  assert.ok(koerper, 'baueAusMapping muss gefunden werden');
  assert.match(koerper, /feldIstSensibel/, 'der echte Fix muss im extrahierten Körper stehen');
});

test('[W-13·Rotmachbarkeit] Positivkontrolle: eine erfundene Funktion ohne Sensibel-Aufruf wird gefunden', () => {
  const html = 'function meineTestFunktion(sektorId) { return _liesSektorWertText(sektorId, "x"); }';
  const r = prueftSensibel(html, 'meineTestFunktion', 2);
  assert.equal(r.ok, false);
});

test('[W-13·Rotmachbarkeit] Negativkontrolle: direkter feldIstSensibel-Aufruf macht die Probe grün', () => {
  const html = 'function meineTestFunktion(sektorId) { if (feldIstSensibel(f, sektorId)) return; return _liesSektorWertText(sektorId, "x"); }';
  const r = prueftSensibel(html, 'meineTestFunktion', 2);
  assert.equal(r.ok, true);
});

test('[W-13·Rotmachbarkeit] Negativkontrolle: Aufruf über einen bekannten Zwischenschritt macht die Probe grün', () => {
  const html = 'function aussen(sektorId) { return baueAusMapping(sektorId, []); }\n'
    + 'function baueAusMapping(sektorId, m) { if (feldIstSensibel(f, sektorId)) return; }';
  const r = prueftSensibel(html, 'aussen', 2);
  assert.equal(r.ok, true);
});
