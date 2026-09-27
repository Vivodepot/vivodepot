'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-7 („W-7 und W-12", 09.08.2026, Zug 2): Frist ohne
   Datum. Bauart wie tests/w8-doppelerfassung-pruefen.test.js — Grundlinie,
   nicht Nulltoleranz; Rotmachbarkeit mit gepflanzten Fällen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  fristFunde, schluesselFund, gateBewerten, ermittleFunde,
} = require('../tools/w7-fristen-pruefen.js');
const { ladeKern } = require('./load-kern.js');

const GRUNDLINIE = require('../tools/w7-fristen-grundlinie.json');

test('[W-7] jeder Grundlinien-Eintrag trägt einen der drei erlaubten Vermerke', () => {
  const erlaubt = new Set(['zu beheben', 'begründete Ausnahme', 'Entscheidung offen']);
  for (const f of GRUNDLINIE) {
    assert.ok(erlaubt.has(f.vermerk), 'unerlaubter Vermerk "' + f.vermerk + '" bei ' + schluesselFund(f));
    assert.ok(f.begruendung && f.begruendung.trim().length > 0, 'Begründung fehlt bei ' + schluesselFund(f));
  }
});

test('[W-7] echter Kern: kein neuer Fund gegen die Grundlinie, die diese nicht kennt', () => {
  const { V } = ladeKern();
  const funde = ermittleFunde(V);
  const { neu, rot } = gateBewerten(funde, GRUNDLINIE);
  assert.deepEqual(neu.map(schluesselFund), [], 'kein neuer Fund gegen die Grundlinie');
  assert.equal(rot, false);
});

test('[W-7·Zug3] erb_schulden ist gelöst — erb_schulden_kenntnis existiert als eigenes Bezugsfeld und ist kein Fund mehr', () => {
  const { V } = ladeKern();
  assert.equal(!!GRUNDLINIE.find((f) => f.id === 'erb_schulden'), false,
    'kein Grundlinien-Eintrag mehr nötig — der Fund existiert nicht mehr (s. Kopf-Kommentar in tools/w7-fristen-pruefen.js zur situations-weiten hatDatum-Prüfung)');
  const funde = fristFunde(V);
  assert.equal(funde.some((f) => f.id === 'erb_schulden'), false);
});

test('[W-7·Rotmachbarkeit] Positivkontrolle: ein gepflanztes Situationsfeld mit Fristsprache ohne Datum wird gefunden', () => {
  const V = {
    SITUATIONEN: [{
      id: 'test_situation',
      bloecke: [{ eintraege: [
        { feld: { id: 'test_frist_feld', label: 'Testfeld', typ: 'text', beispiel: 'binnen drei Wochen erledigen' } },
      ] }],
    }],
  };
  const funde = fristFunde(V);
  assert.equal(funde.length, 1);
  assert.equal(funde[0].id, 'test_frist_feld');
  const { rot } = gateBewerten(funde, GRUNDLINIE);
  assert.equal(rot, true, 'ein neuer Fristsprache-Fund muss das Gate rot machen');
});

test('[W-7·Rotmachbarkeit] Negativkontrolle: dieselbe Situation MIT einem Datumsfeld bleibt grün', () => {
  const V = {
    SITUATIONEN: [{
      id: 'test_situation',
      bloecke: [{ eintraege: [
        { feld: { id: 'test_frist_feld', label: 'Testfeld', typ: 'text', beispiel: 'binnen drei Wochen erledigen' } },
        { feld: { id: 'test_bezugsdatum', label: 'Bezugsdatum', typ: 'datum' } },
      ] }],
    }],
  };
  assert.deepEqual(fristFunde(V), [], 'ein Datumsfeld irgendwo in derselben Situation erfüllt die Anforderung');
});

test('[W-7·Rotmachbarkeit] Negativkontrolle: ein Feld ohne Fristsprache bleibt grün', () => {
  const V = {
    SITUATIONEN: [{
      id: 'test_situation',
      bloecke: [{ eintraege: [
        { feld: { id: 'test_normal', label: 'Ganz normales Feld', typ: 'text', beispiel: 'Irgendein Text' } },
      ] }],
    }],
  };
  assert.deepEqual(fristFunde(V), []);
});
