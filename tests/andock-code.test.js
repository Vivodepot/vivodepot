'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Andock-Code (U2-ADR-006; Code-Slot pro Eintrag)
   ────────────────────────────────────────────────────────────────────────
   Der Kern hält pro skalarem Eintrag einen LEEREN Code-Slot (null) als Andock-
   Vorrichtung. KEINE Code-Tabelle, KEINE Zuordnungs-Logik im Kern — der Slot
   wird erst von einem zertifizierten Template gefüllt (eigener späterer Strang).

   Sektor-frei geprüft gegen einen NEUTRALEN Stub. Die Mechanik darf keinen
   konkreten Sektor-Feldnamen kennen.

   Geprüfte Invarianten:
     1) codeSlotSicherstellen legt Slot mit null an,
     2) liesCode liefert null, wenn kein Slot existiert UND wenn Slot null ist,
     3) sektorFeldSetzen legt den Slot beim Feldwert-Setzen automatisch mit an,
     4) Idempotent: zweites Anlegen ändert nichts (überschreibt nicht),
     5) Unabhängige (sektor, feld)-Paare leben getrennt,
     6) Keine Code-Tabelle im Kern (kein SNOMED/LOINC/ICD).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-andock';
const STUB_SEKTOR = 'test_sektor';
const STUB_FELD   = 'test_feld';

test('codeSlotSicherstellen legt einen LEEREN Slot an (null), Struktur entsteht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.codeSlotSicherstellen(STUB_SEKTOR, STUB_FELD);

  const codes = V.getData().codes;
  assert.equal(typeof codes, 'object', 'codes ist ein Objekt');
  assert.equal(typeof codes[STUB_SEKTOR], 'object', 'sektor-Container angelegt');
  assert.ok(STUB_FELD in codes[STUB_SEKTOR], 'feld-Slot strukturell angelegt');
  assert.equal(codes[STUB_SEKTOR][STUB_FELD], null, 'Slot ist LEER (null)');
});

test('liesCode liefert null vor Anlage UND nach Anlage (leerer Slot)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.equal(V.liesCode(STUB_SEKTOR, STUB_FELD), null, 'vor Anlage: null');
  V.codeSlotSicherstellen(STUB_SEKTOR, STUB_FELD);
  assert.equal(V.liesCode(STUB_SEKTOR, STUB_FELD), null, 'nach Anlage: null (Slot leer)');
});

test('sektorFeldSetzen legt den Code-Slot beim Feldwert-Setzen automatisch mit an', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.sektorFeldSetzen(STUB_SEKTOR, STUB_FELD, 'wert');

  assert.equal(V.getData().sektoren[STUB_SEKTOR][STUB_FELD], 'wert', 'Feldwert gesetzt');
  assert.equal(V.liesCode(STUB_SEKTOR, STUB_FELD), null, 'Code-Slot parallel angelegt, null');
  assert.ok(STUB_FELD in V.getData().codes[STUB_SEKTOR], 'Slot strukturell angelegt');
});

test('Idempotent: zweites Anlegen ändert nichts; nullable Wert wird NICHT zu null überschrieben', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.codeSlotSicherstellen(STUB_SEKTOR, STUB_FELD);
  // Simuliere ein bereits getragenes Code-Objekt (so wie ein Template den Slot füllen würde):
  V.getData().codes[STUB_SEKTOR][STUB_FELD] = { system: 'X', code: '42' };
  // Zweiter Aufruf darf den vorhandenen Eintrag NICHT überschreiben.
  V.codeSlotSicherstellen(STUB_SEKTOR, STUB_FELD);
  assert.deepEqual(
    JSON.parse(JSON.stringify(V.getData().codes[STUB_SEKTOR][STUB_FELD])),
    { system: 'X', code: '42' },
    'gefüllter Slot bleibt unberührt'
  );
});

test('Unabhängige (sektor, feld)-Paare leben getrennt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.codeSlotSicherstellen('s1', 'f1');
  V.codeSlotSicherstellen('s1', 'f2');
  V.codeSlotSicherstellen('s2', 'f1');

  const c = V.getData().codes;
  assert.ok('f1' in c.s1 && 'f2' in c.s1, 's1 hat beide Felder');
  assert.ok('f1' in c.s2 && !('f2' in c.s2), 's2 hat nur f1');
  // Alle initial leer.
  assert.equal(c.s1.f1, null);
  assert.equal(c.s1.f2, null);
  assert.equal(c.s2.f1, null);
});

test('Keine Code-Tabelle im Kern (kein SNOMED/LOINC/ICD-System hardkodiert)', () => {
  const { src } = ladeKern();
  // 1) Listen-ID-Marker auf Feldern (`codeListe: 'snomedAllergen'` u. ä.) sind erlaubt — sie
  //    benennen nur die andockende Liste, enthalten keinen Code. Herausschneiden. Das erfasst
  //    beide Schreibweisen: `codeListe: 'x'` (JS, im SEKTOREN-Quelltext) UND `"codeListe":"x"`
  //    (JSON, im eingebetteten Struktur-Bündel, U2-ADR-292 E4 — der Schlüssel selbst trägt dort
  //    eigene Anführungszeichen, ohne Leerzeichen vor dem Doppelpunkt).
  let snapshot = src.replace(/"?codeListe"?\s*:\s*['"][^'"]+['"]/g, '');
  // 2) Das FHIR-Export-Modul (T3.4 IPS + Stufe-2 Laborbericht) nutzt STANDARD-Codes: LOINC-Struktur-
  //    codes (IPS: 60591-5, 48765-2 …) sowie im Lab-Bundle die klinischen Test-/Blutgruppen-Codes
  //    (LOINC/UCUM/SNOMED CT) — das sind die FHIR-Interchange-Formen, KEINE gestreute Code-Tabelle.
  //    Dieser klar abgegrenzte Block (Header bis Ende flowSektorExport) ist erlaubt und wird
  //    herausgeschnitten, bevor geprüft wird. (Regex-Schwanz robust: bis zum Funktions-Ende, nicht
  //    an eine bestimmte return-Zeile gekoppelt — flowSektorExport wächst mit weiteren Export-Formaten.)
  snapshot = snapshot.replace(/Export-Modul — FHIR R4[\s\S]*?function flowSektorExport\(format\) \{[\s\S]*?\n}/, '');
  // 3) Paket 3 (text+code-Andock): die Code-Systeme leben jetzt LEGITIM in den dedizierten
  //    @vd-codeliste-<script>-Blöcken am Dateiende + im Registry-/Export-Andock. Das ist genau
  //    der designierte Ort (öffentliche Daten, keine Krypto) — analog zum IPS-Block oben
  //    herausgeschnitten. Die Invariante bleibt: KEINE klinischen Code-Systeme in der übrigen
  //    App-Logik gestreut, NUR in diesen klar abgegrenzten Bereichen.
  snapshot = snapshot.replace(/CODE-LISTEN \(Paket 3\)[\s\S]*$/, '');   // alle @vd-codeliste-Seed-Blöcke + Rest der Datei
  // SNOMED und ICD-10 sind klinische Code-Systeme → im (übrigen) Kern weiterhin verboten (kein rc1-Ballast).
  assert.ok(!/SNOMED/i.test(snapshot), 'kein SNOMED-Code-System im Kern');
  assert.ok(!/LOINC/i.test(snapshot), 'kein LOINC außerhalb des klar abgegrenzten IPS-Exports/Code-Listen-Andocks');
  assert.ok(!/\bICD-?10\b/i.test(snapshot), 'kein ICD-10-Code-System im Kern');
});
