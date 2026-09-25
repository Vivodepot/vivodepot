'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-379 (08.09.2026, nach U2-ADR-378-Fund)
   ────────────────────────────────────────────────────────────────────────
   „Modul Pro" war strukturell KEIN einzelnes Artefakt — ein logikModul
   (tests/fixtures/pro-logikmodul-testschablone-de.json,
   längst ausgeliefert) UND ein Bereichs-Modul (definiert den Sektor
   'pro-vertretung-vollmachten' u. a.), das nur INLINE in zwei Testdateien
   existierte (tests/e2e/pro-geschaeftsfuehrerin-notfallmappe-abnahme.spec.js,
   tests/pro-geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js — mit
   abweichendem herkunft-Wert und abweichender Sektor-Zahl, vier gegen
   sechs). Diese Datei belegt das neue, EINE ausgelieferte Artefakt
   (tests/fixtures/…-bereich.json): der rote Beweis zuerst — ohne den Sektor
   scheitert das logikModul weiterhin mit grund:'sektor' (das ist die
   Reihenfolge, kein Fehler), dann der grüne — mit dem Artefakt gelingt
   der Einlass.

   GEHÖRT ZUM PRO-MODUL, NICHT ZUM GERÜST (Lesart, hier bestätigt):
   das Gerüst kennt keine Bereiche, es trägt nichts Fachliches — der Sektor
   ist Teil dessen, was "Pro" als Produkt inhaltlich ausmacht.

   NACHTRAG (08.09.2026): der erste Entwurf leitete die
   Sektoren-MENGE des Artefakts aus dem her, was das Logikmodul REFERENZIERT
   (vier Sektoren) — eine falsche Ableitungsrichtung. Das Bereichs-Modul
   sagt, welche Bereiche ein Pro-DEPOT hat; das Logikmodul (die Notfallmappe)
   ist nur EIN Auszug, der aus einigen davon schöpft. Die Struktur ist die
   OBERMENGE der Nutzung, nicht ihr Abbild — das Artefakt trägt darum jetzt
   alle SECHS Sektoren aus tests/pro-geschaeftsfuehrerin-notfallmappe-u2-adr-
   295.test.js (das hatte recht), und der Wächter unten prüft eine BEZIEHUNG
   (jeder referenzierte Sektor muss existieren), NIE Gleichheit — ein Sektor
   im Artefakt, den kein Logikmodul braucht, ist der Normalfall, kein Fund.

   U2-ADR-421-NACHTRAG (08.09.2026, Produktentscheidung: „Identität reinnehmen, aber
   als Pro-Bereich"): ein siebter Sektor, pro-identitaet (Telefon/E-Mail),
   kam dazu — SECHS oben ist der historische Auftragswortlaut, die Probe
   unten zählt die tatsächliche Menge, keine hartcodierte Sechs mehr.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const BEREICH_DATEI = path.join(__dirname, 'fixtures', 'pro-bereich-testschablone.json');
const LOGIKMODUL_DATEI = path.join(__dirname, 'fixtures', 'pro-logikmodul-testschablone-de.json');
const BEREICH_TEXT = fs.readFileSync(BEREICH_DATEI, 'utf8');
const LOGIKMODUL_TEXT = fs.readFileSync(LOGIKMODUL_DATEI, 'utf8');

async function frischerKern() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

function referenzierteSektoren(logikmodul) {
  return new Set(
    Object.values(logikmodul.datenSchema).map((def) => def.sektor).filter((s) => s.startsWith('pro-')));
}

test('[U2-ADR-379] das Bereichs-Modul-Artefakt ist gültiges JSON und trägt alle sechs Pro-Sektoren', () => {
  const bereich = JSON.parse(BEREICH_TEXT);
  assert.equal(bereich.modulTyp, 'bereich');
  assert.deepEqual(Object.keys(bereich.bereiche).sort(), [
    'pro-aufbewahrung-ordnung', 'pro-betrieb-zugaenge', 'pro-finanzen-verbindlichkeiten',
    'pro-gesellschaft-nachfolge', 'pro-kontakte-vertretungsplan', 'pro-vertretung-vollmachten',
  ], 'sechs Sektoren, wie das Pro-Depot sie fuehrt (seit 17.09.2026 ohne pro-identitaet: Pro trägt identity) — nicht nur die vier, die EIN Auszug braucht');
});

test('[U2-ADR-379] JEDER vom logikModul referenzierte Sektor existiert im Artefakt (Beziehung, nicht Gleichheit)', () => {
  const bereich = JSON.parse(BEREICH_TEXT);
  const logikmodul = JSON.parse(LOGIKMODUL_TEXT);
  for (const sektor of referenzierteSektoren(logikmodul)) {
    assert.ok(Object.prototype.hasOwnProperty.call(bereich.bereiche, sektor),
      'das Artefakt definiert nicht ' + sektor + ', das logikModul referenziert ihn aber');
  }
});

test('[U2-ADR-379·Rot-Beweis] ein vom logikModul benötigter Sektor fehlt im Artefakt → der ECHTE Einlass scheitert wieder mit grund:\'sektor\'', async () => {
  const { V } = await frischerKern();
  const bereich = JSON.parse(BEREICH_TEXT);
  // Verstümmelt: derselbe Bereich, aber ohne 'pro-vertretung-vollmachten' — genau der Sektor,
  // den das logikModul für sein erstes Datenschema-Feld braucht.
  const verstuemmelt = Object.assign({}, bereich,
    { bereiche: Object.fromEntries(Object.entries(bereich.bereiche).filter(([k]) => k !== 'pro-vertretung-vollmachten')) });
  const bereichRaus = V.modulEinlassen(JSON.stringify(verstuemmelt));
  assert.equal(bereichRaus.angenommen, true, 'der verstümmelte Bereich selbst bleibt gültig');
  V._bereichsModuleAusDepotAnmelden(V.getData());

  const logikRaus = V.modulEinlassen(LOGIKMODUL_TEXT);
  assert.equal(logikRaus.angenommen, false);
  assert.equal(logikRaus.grund, 'sektor',
    'ohne pro-vertretung-vollmachten scheitert der ECHTE Einlass wieder — die Beziehung ist real, kein Zahlenspiel');
});

test('[U2-ADR-379·Gegenprobe] ein Sektor im Artefakt, den KEIN Logikmodul braucht, ist erlaubt (der Normalfall)', () => {
  const bereich = JSON.parse(BEREICH_TEXT);
  const logikmodul = JSON.parse(LOGIKMODUL_TEXT);
  const gebraucht = referenzierteSektoren(logikmodul);
  const ungebraucht = Object.keys(bereich.bereiche).filter((s) => !gebraucht.has(s));
  assert.ok(ungebraucht.length > 0,
    'Vorbedingung: es gibt wirklich Sektoren, die dieser eine Auszug nicht braucht — sonst prüft '
    + 'diese Gegenprobe nichts. pro-finanzen-verbindlichkeiten/pro-betrieb-zugaenge gehören zum '
    + 'Pro-Depot, auch wenn die Notfallmappe sie nicht abfragt.');
});

test('[U2-ADR-379·Rot-Beweis] ohne das Bereichs-Modul scheitert das logikModul weiterhin mit grund:\'sektor\'', async () => {
  const { V } = await frischerKern();
  const raus = V.modulEinlassen(LOGIKMODUL_TEXT);
  assert.equal(raus.angenommen, false);
  assert.equal(raus.grund, 'sektor',
    'das ist die Reihenfolge, kein Fehler — der Sektor muss zuerst da sein');
});

test('[U2-ADR-379] mit dem Bereichs-Modul-Artefakt gelingt der Einlass', async () => {
  const { V } = await frischerKern();
  const bereichRaus = V.modulEinlassen(BEREICH_TEXT);
  assert.equal(bereichRaus.angenommen, true, bereichRaus.grund || '');
  V._bereichsModuleAusDepotAnmelden(V.getData());

  const logikRaus = V.modulEinlassen(LOGIKMODUL_TEXT);
  assert.equal(logikRaus.angenommen, true, logikRaus.grund || '');
});
