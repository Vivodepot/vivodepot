'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Feld-Remarkierung (Auftrag „Die Feld-Remarkierung: der Rest, an dem
   zwei v1-Zeilen hängen", 23.08.2026) — A445/A448
   ────────────────────────────────────────────────────────────────────────
   `finanzen.bav_rentenbeginn` trug seit dem allerersten Commit die falsche
   Marke `laeuftAb` — ein Rentenbeginn ist ein BEGINN, keine Gültigkeit, die
   endet. Korrigiert auf `giltAb`. BEIDE Marken schreiben den Rohwert nicht
   in den Sektor, sondern nach `data.feldGueltigkeit[…]` — `laeuftAb` nach
   `.bis`, `giltAb` nach `.von` — darum braucht die Korrektur eine echte
   Migrationsstufe (Schema 74 → 75), sonst würde ein Bestandswert unter dem
   falschen Schlüssel unsichtbar.

   Rot-Beleg-Pflicht (A348 Zug 4): [Rot-Beleg] markiert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Feld-Remarkierung] bav_rentenbeginn trägt jetzt die Marke `giltAb`, nicht mehr `laeuftAb`', () => {
  const { V } = ladeKern();
  assert.equal(V.feldHatMarke('finance', 'companyPensionAgreedStartDate', 'giltAb'), true);
  assert.equal(V.feldHatMarke('finance', 'companyPensionAgreedStartDate', 'laeuftAb'), false);
});

test('[Feld-Remarkierung] SCHEMA_VERSION_AKTUELL hat die 74→75-Stufe erreicht (mindestens 75)', () => {
  // U2-ADR-246 (04.09.2026): auf exakte Gleichheit geändert — jede spätere Stufe (76, …) hätte
  // diese Probe sonst bei jedem weiteren Schema-Sprung erneut angefasst, ohne dass sich am
  // Gegenstand dieser Probe (die 74→75-Stufe existiert und ist erreicht) etwas geändert hätte.
  // Derselbe Massstab wie in tests/fixtures/migrations-stufen.js (`nachher: … >= 75`).
  const { V } = ladeKern();
  assert.ok(V.SCHEMA_VERSION_AKTUELL >= 75);
});

test('[Feld-Remarkierung] ein frischer Schreibweg legt den Wert unter `.von` ab, nicht unter `.bis`', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('feld-remark-pw!');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('finance', 'companyPensionAgreedStartDate', '2040-05-01');
  assert.equal(V.feldRohwert('finance', 'companyPensionAgreedStartDate'), '2040-05-01');
  const g = V.getData().feldGueltigkeit.finance.companyPensionAgreedStartDate;
  assert.equal(g.von, '2040-05-01');
  assert.equal(g.bis, undefined);
});

test('[Feld-Remarkierung·Rot-Beleg] Migration: ein Bestandswert unter `.bis` (Schema 74) wandert nach `.von`, wird schemaVersion 75', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.schemaVersion = 74;
  d.feldGueltigkeit = { finanzen: { bav_rentenbeginn: { bis: '2035-01-01' } } };
  const migriert = V.depotNormalisieren(d);
  assert.ok(migriert.schemaVersion >= 75);
  assert.equal(migriert.feldGueltigkeit.finance.companyPensionAgreedStartDate.von, '2035-01-01');
  assert.equal(migriert.feldGueltigkeit.finance.companyPensionAgreedStartDate.bis, undefined);
});

test('[Feld-Remarkierung] die Migration ist idempotent — ein zweiter Lauf ändert nichts mehr', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.schemaVersion = 74;
  d.feldGueltigkeit = { finanzen: { bav_rentenbeginn: { bis: '2035-01-01' } } };
  const einmal = V.depotNormalisieren(d);
  const zweimal = V.depotNormalisieren(einmal);
  assert.deepEqual(zweimal.feldGueltigkeit.finance.companyPensionAgreedStartDate, { von: '2035-01-01' });
});

test('[Feld-Remarkierung·Gegenprobe] ein Depot ohne diesen Wert migriert klaglos (kein `feldGueltigkeit` überhaupt)', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.schemaVersion = 74;
  const migriert = V.depotNormalisieren(d);
  assert.ok(migriert.schemaVersion >= 75);
});

test('[Feld-Remarkierung·Gegenprobe] ein Depot, das bereits `.von` trägt (z. B. schon einmal migriert), wird nicht überschrieben', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.schemaVersion = 74;
  d.feldGueltigkeit = { finanzen: { bav_rentenbeginn: { von: '2030-01-01', bis: '2035-01-01' } } };
  const migriert = V.depotNormalisieren(d);
  // Ein `.von` UND ein `.bis` gleichzeitig ist ein Zustand, den der reguläre Schreibweg nie
  // erzeugt (immer nur einer der beiden) — die Migration fasst ihn darum nicht an, statt zu raten.
  assert.equal(migriert.feldGueltigkeit.finance.companyPensionAgreedStartDate.von, '2030-01-01');
});

/* Die Gegenprobe zum ganzen Bestand (Zug 1, „Gibt es weitere Felder mit derselben
   Verwechslung?"): alle ANDEREN `laeuftAb`-markierten Felder halten ihrer Bedeutung stand —
   jedes Label sagt tatsächlich eine ENDENDE Gültigkeit, keine weitere Verwechslung gefunden. */
test('[Feld-Remarkierung·Gegenprobe] alle anderen laeuftAb-Felder bleiben unverändert laeuftAb', () => {
  const { V } = ladeKern();
  const weiterhinLaeuftAb = [
    ['mobility', 'drivingLicenceValidUntil'],
    ['mobility', 'passportValidUntil'],
    ['education', 'employmentContractFixedTerm'],
    ['socialInsurance', 'careLevelTimeLimitedUntil'],
    ['housing', 'tenancyAgreementFixedTermUntil'],
    ['emergencyPreparedness', 'drinkingWaterSupplyCheckShelf'],
    ['emergencyPreparedness', 'foodSuppliesCheckShelfLifeBy'],
  ];
  for (const [sektorId, feldId] of weiterhinLaeuftAb) {
    assert.equal(V.feldHatMarke(sektorId, feldId, 'laeuftAb'), true, sektorId + '.' + feldId + ' sollte weiterhin laeuftAb tragen');
  }
  // `finance.creditCards/validUntil` ist ein LISTEN-Unterfeld — dessen Marke läuft über
  // `prueftermineZeilen` (feldDef.unterFelder[].marken), nicht über `feldHatMarke` (nur für
  // skalare Top-Level-Felder). Direkt gegen den Katalog geprüft, kein zweiter Mechanismus nötig.
  const kreditkarten = V.SEKTOREN.find((s) => s.id === 'finance').sektionen
    .flatMap((sek) => sek.felder || []).find((f) => f.id === 'creditCards');
  const karteGueltig = (kreditkarten.unterFelder || []).find((uf) => uf.id === 'validUntil');
  assert.deepEqual(karteGueltig.marken, ['laeuftAb']);
});
