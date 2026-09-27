'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Sensibel-Architektur", 09.08.2026, Zug 2 — Situations-
   blätter und Angehörigen-Modus lesen das Schema-Flag.

   Zwei getrennte Lücken, zwei getrennte Reichweiten:

   1) situationModell (Situationsblätter des EIGENTÜMERS, z. B. das PDF zu
      „Nach einem Todesfall"): der `eintrag.quelle`-Zweig (ein ECHTES
      Sektorfeld in ein Blatt gezogen) prüfte GAR NICHT — jetzt wie überall.
      Konsistent mit den übrigen Export-Wegen (PDF/DOCX/JSON), kein Grund
      für eine Ausnahme.

   2) Der Angehörigen-Modus (`akutZeileHTML`, `angehoerigenCacheModell`):
      NUR die situations-eigenen Felder (`sit:`-Quelle, z. B. `erb_notar`)
      werden jetzt geprüft — das war die tatsächliche Lücke aus dem Auftrag
      („sieben Felder im Erbfall- und im Notar-Blatt ungeschützt"). SEKTOR-
      Felder bleiben in diesem Modus bewusst UNGEFILTERT: Reise 3/4 (echte
      UI-Probe, tests/mit-modul/reisen-3-4-registry.test.js) belegt, dass
      „Blutgruppe" (schema-sensibel) auf dem Krankenhaus-Blatt stehen MUSS —
      die AUFNAHME eines Sektorfelds in die `_ANG_SITUATIONEN`-Allowlist ist
      dort selbst die Vertrauensgrenze, nicht das allgemeine Flag. Ein
      breiterer Filter hätte diese Probe zerbrochen (live gefunden, hier
      dokumentiert statt still übergangen).
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Sensibel-U2] situationModell: ein schema-sensibles SEKTORFELD über eintrag.quelle wird ausgelassen', () => {
  const { V } = ladeKern();
  const fakeSit = { id: 'test-sit', titel: 'Test', bloecke: [
    { titel: 'Block', eintraege: [{ quelle: 'health', feld: 'bloodType' }] },
  ] };
  const modell = V.situationModell(fakeSit);
  assert.deepEqual(modell.bloecke, [], 'blutgruppe ist schema-sensibel — der Block darf keine Zeile tragen und fällt darum ganz weg');
});

test('[Sensibel-U2] situationModell: ein NICHT-sensibles Sektorfeld über eintrag.quelle bleibt unverändert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'telephone', '089 1234567');
  const fakeSit = { id: 'test-sit', titel: 'Test', bloecke: [
    { titel: 'Block', eintraege: [{ quelle: 'identity', feld: 'telephone' }] },
  ] };
  const modell = V.situationModell(fakeSit);
  assert.equal(modell.bloecke.length, 1, 'ein nicht-sensibles Sektorfeld bleibt wie zuvor enthalten');
});

test('[Sensibel-U2] situationModell: das SIT-eigene Feld bleibt beim bisherigen, alleinigen Schema-Check (f.sensibel) — unverändert', () => {
  const { V } = ladeKern();
  const fakeSit = { id: 'test-sit', titel: 'Test', bloecke: [
    { titel: 'Block', eintraege: [{ feld: { id: 'x', label: 'X', typ: 'text', sensibel: true } }] },
  ] };
  const modell = V.situationModell(fakeSit);
  assert.deepEqual(modell.bloecke, [], 'situations-eigenes Feld mit sensibel:true blieb schon vor Zug 2 draußen — Regression-Anker');
});

/* ── Angehörigen-Modus: nur sit:-Quellen, Regel 18 real belegt ─────────────────── */

const echterSit = 'erbfall';
const echtesFeld = 'erb_notar';
function ecgTeraFeldObjekt(V) {
  const sit = V.SITUATION_BY_ID[echterSit];
  const eintrag = sit.bloecke.flatMap((b) => b.eintraege).find((e) => e.feld && e.feld.id === echtesFeld);
  return eintrag.feld;
}

after(() => {
  // Die reale Registry lebt für den ganzen Prozess — Mutation zurücknehmen, egal welcher
  // Testlauf zuletzt dran war (jede Zeile hier ist idempotent, falls schon zurückgesetzt).
  const { V } = ladeKern();
  const f = ecgTeraFeldObjekt(V);
  delete f.sensibel;
});

test('[Sensibel-U2·Regel 18] akutZeileHTML: ein situations-eigenes sensibles Feld (sit:) wird real gefunden — VOR der Markierung enthalten', () => {
  const { V } = ladeKern();
  const f = ecgTeraFeldObjekt(V);
  delete f.sensibel;
  const html = V.akutZeileHTML('sit:' + echterSit, echtesFeld);
  assert.match(html, /feld-zeile/, 'vor der Markierung: real gesehen enthalten');
});

test('[Sensibel-U2·Regel 18] akutZeileHTML: dasselbe Feld fehlt NACH der Markierung — real gesehen, nicht abgeleitet', () => {
  const { V } = ladeKern();
  const f = ecgTeraFeldObjekt(V);
  f.sensibel = true;
  const html = V.akutZeileHTML('sit:' + echterSit, echtesFeld);
  assert.equal(html, '', 'nach der Markierung: real gesehen leer');
  delete f.sensibel;
});

test('[Sensibel-U2] akutZeileHTML: ein sensibles SEKTORFELD (Blutgruppe) bleibt im Angehörigen-Modus UNGEFILTERT (Regression-Anker Reise 3/4)', () => {
  const { V } = ladeKern();
  const html = V.akutZeileHTML('health', 'bloodType');
  assert.match(html, /feld-zeile/, 'die Allowlist-Aufnahme selbst ist hier die Vertrauensgrenze, nicht das Schema-Flag');
});

test('[Sensibel-U2·Regel 18] angehoerigenCacheModell: dasselbe sit:-Feld VOR/NACH der Markierung im Cache', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.situationFeldSetzen(echterSit, echtesFeld, 'Notariat Dr. Beispiel');
  const f = ecgTeraFeldObjekt(V);
  delete f.sensibel;
  const vorher = V.angehoerigenCacheModell();
  assert.equal((vorher.situationen[echterSit] || {})[echtesFeld], 'Notariat Dr. Beispiel', 'vor der Markierung: im Cache enthalten');
  f.sensibel = true;
  const nachher = V.angehoerigenCacheModell();
  assert.equal((nachher.situationen[echterSit] || {})[echtesFeld], undefined, 'nach der Markierung: nicht mehr im Cache');
  delete f.sensibel;
});

test('[Sensibel-U2] angehoerigenCacheModell: ein sensibles SEKTORFELD (Blutgruppe) bleibt im Cache UNGEFILTERT (Regression-Anker Reise 3/4)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  const modell = V.angehoerigenCacheModell();
  assert.equal(modell.sektoren.health.bloodType, 'A+');
});
