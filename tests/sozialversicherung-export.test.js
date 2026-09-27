'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sozialversicherung als unsignierter SD-JWT-VC-Selbstauskunft-Export (U2-ADR-030, Variante A)
   ────────────────────────────────────────────────────────────────────────
   Bereich 7 erhält einen Export analog Finanzen: SD-JWT-VC, selbst-erklärt, NICHT signiert,
   kein Tor 3. Pflegegrad reist hier (Sozial-Pfad), nicht im klinischen FHIR-IPS (U2-ADR-018/019).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frisch() {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Maria');
  return V;
}

test('Soz-1: Builder erzeugt SD-JWT-VC-Selbstauskunft mit Konventions-vct, unsigniert', async () => {
  const V = await frisch();
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');
  V.sektorFeldSetzen('socialInsurance', 'careLevelSinceYear', '2019');
  V.sektorFeldSetzen('socialInsurance', 'degreeOfDisabilityGdb', '50');
  // pflegegrad/pflegegrad_seit/gdb sind seit Zug 3 (Sensibel-Architektur, 09.08.2026)
  // schema-sensibel — dieser Test prüft die Mapping-Form selbst, darum mit Opt-in.
  const vc = V.sdJwtVcSozialversicherung({ sensibel: true });
  assert.equal(vc.vct, 'urn:vivodepot:sozialversicherung', 'vct folgt der Konvention urn:vivodepot:<bereich>');
  assert.equal(vc.iss, 'urn:vivodepot:selbstauskunft', 'Selbstauskunft — kein externer Aussteller');
  // Pflicht-Anker Pflegegrad reist mit (auswahl → menschenlesbarer Label-Text).
  assert.equal(vc.claims.care_level, 'Pflegegrad 3');
  assert.equal(vc.claims.care_level_since, '2019');
  assert.equal(vc.claims.disability_degree, '50');
  // Unsigniert: keine Signatur-/Proof-Struktur, nur die Selbstauskunft.
  assert.ok(!('proof' in vc) && !('signature' in vc), 'kein Signatur-/Proof-Feld (Variante A)');
});

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `rentenversicherungsnummer` ist zu einer Liste
// geworden (`pensionInsuranceNumbers`, mehrwertig). Die Mapping-Zeile in VC_SOZIALVERSICHERUNG_MAPPING
// ist darum ENTFALLEN, nicht auf einen Eintrag geraten (dokumentierter Gap, eigener Zug offen) —
// die SV-Nummer erscheint im SD-JWT-VC-Export heute in KEINEM Fall, unabhängig vom Sensibel-Flag.
test('Soz-2: SV-Nummer fehlt im Export unabhängig vom Sensibel-Flag (Mapping entfallen, s. Kommentar)', async () => {
  const V = await frisch();
  V.listenEintragHinzufuegen('socialInsurance', 'pensionInsuranceNumbers', { system: '', pensionInsuranceNumber: '12 345678 A 123' });
  const ohne = V.sdJwtVcSozialversicherung({});
  const mit  = V.sdJwtVcSozialversicherung({ sensibel: true });
  assert.ok(!('social_insurance_number' in ohne.claims), 'ohne Zustimmung: SV-Nummer NICHT im Export');
  assert.ok(!('social_insurance_number' in mit.claims), 'mit Zustimmung: heute ebenfalls nicht — kein Mapping mehr vorhanden');
});

test('Soz-3: nutzer-markierte Sensibilität wird respektiert (wie alle Export-Wege)', async () => {
  const V = await frisch();
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '4');
  V.sensibelFeldSetzen('socialInsurance', 'careLevel', true);
  const ohne = V.sdJwtVcSozialversicherung({});
  const mit  = V.sdJwtVcSozialversicherung({ sensibel: true });
  assert.ok(!('care_level' in ohne.claims), 'als sensibel markiert → ohne Opt-in draußen');
  assert.equal(mit.claims.care_level, 'Pflegegrad 4', 'mit Opt-in enthalten');
});

test('Soz-4: nur reale Sektor-Felder gemappt — kein erfundenes Feld', () => {
  const { V } = ladeKern();
  const ziele = new Set(V.VC_SOZIALVERSICHERUNG_MAPPING.map(m => m.feld));
  // Pflicht-Anker vorhanden:
  assert.ok(ziele.has('careLevel') && ziele.has('careLevelSinceYear'), 'Pflegegrad-Anker gemappt');
  // Im Inventur-Auftrag genannte Phantom-Felder dürfen NICHT auftauchen:
  assert.ok(!ziele.has('pflegeversicherung_privat'), 'pflegeversicherung_privat existiert nicht — nicht gemappt');
  assert.ok(!ziele.has('pflegedokumentation'), 'pflegedokumentation existiert nicht — nicht gemappt');
  // Jedes gemappte Feld existiert auch wirklich im Sektor:
  const sek = V.SEKTOR_BY_ID['socialInsurance'];
  const echte = new Set(sek.sektionen.flatMap(s => s.felder || []).map(f => f.id));
  for (const m of V.VC_SOZIALVERSICHERUNG_MAPPING) {
    assert.ok(echte.has(m.feld), 'gemapptes Feld „' + m.feld + '" existiert im Sektor');
  }
});

test('Soz-5: Sektor verdrahtet — exporte-Knopf, Registry, EUDIW-Anbindung, Etikett SD_JWT_VC', () => {
  const { V } = ladeKern();
  const sek = V.SEKTOR_BY_ID['socialInsurance'];
  assert.equal(sek.exporte.length, 1, 'Sektor hat genau einen Export');
  assert.equal(sek.exporte[0].format, 'sd-jwt-vc-sozialversicherung');
  assert.ok(V.EXPORT_FORMAT_BY_ID['sd-jwt-vc-sozialversicherung'], 'Format in der Registry');
  // Etikett-Korrektur: war W3C_VC (totes Etikett), jetzt der real gebaute Pfad.
  assert.equal(sek.format, 'SD_JWT_VC', 'format-Etikett auf den real gebauten Pfad korrigiert');
  // eudiw:true → EUDIW-Übergabe (eudiwSdJwtVcSerialisieren) automatisch über die Registry.
  assert.ok(V.eudiwDefFuerSektor('socialInsurance'), 'EUDIW-Übergabe-Definition gefunden');
});

test('Soz-6: zwei optionale Ablauf-Felder (U2-ADR-030 Nachtrag) — gemappt, leer=weg, gefüllt=da, kein sensibel', async () => {
  const { V } = ladeKern();
  // 17 → 16 am 29.07.2026: `care_service_contact` ist mit `pflegedienst_kontakt` entfallen
  // (U2-ADR-116 §7), folgenlos — es gibt keinen Empfänger. `outpatient_care_service` bleibt.
  // 16 → 17 am 09.08.2026 („W-7 und W-12", Zug 3): `noticeDated`
  // (Bezugsdatum für die Widerspruchsfrist, § 84 Abs. 1 SGG) neu gemappt auf `care_level_decision_date`.
  // 17 → 19 am 11.08.2026 („F4", Zug 3): pflegegeld trennt sich in Leistungsart
  // (bleibt `care_allowance`) + zwei neue Claims `care_allowance_amount`/`_previous_note` —
  // sd-jwt-vc-sozialversicherung bleibt so vollständig gedeckt (W-10).
  // Auftragskette 14.08.2026, Glied 3: vier neue Arbeitslosigkeit-Felder gemappt, 19 → 23.
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): rentenversicherungsnummer/pflegekasse_nr/
  // schwerbehindertenausweis_ort/_gueltig sind mehrwertig geworden, vier Zeilen entfallen, 23 → 19.
  assert.equal(V.VC_SOZIALVERSICHERUNG_MAPPING.length, 19, 'Feldzahl 17 → 19 → 23 → 19');
  assert.ok(!V.VC_SOZIALVERSICHERUNG_MAPPING.some(m => m.ziel === 'care_service_contact'),
    'der Claim ist wirklich weg, nicht nur ungezählt');
  assert.ok(V.VC_SOZIALVERSICHERUNG_MAPPING.some(m => m.ziel === 'outpatient_care_service'),
    'und der präzisere Nachbar-Claim steht noch — sonst wäre die Zahl aus dem falschen Grund gefallen');
  const byZiel = new Map(V.VC_SOZIALVERSICHERUNG_MAPPING.map(m => [m.ziel, m]));
  assert.ok(byZiel.has('care_level_valid_until') && byZiel.has('disability_review_due'), 'beide neuen Claims gemappt');
  assert.equal(byZiel.get('care_level_valid_until').feld, 'careLevelTimeLimitedUntil');
  assert.equal(byZiel.get('disability_review_due').feld, 'gdbReviewReAssessmentDate');
  assert.ok(byZiel.get('care_level_valid_until').sd && byZiel.get('disability_review_due').sd, 'beide sd:true');
  // Die Mapping-eigene `m.sensibel`-Kopie ist seit Zug 4 (Sensibel-Architektur, 09.08.2026) tot
  // — baueAusMapping liest das echte Schema-Flag. Beide Felder SIND schema-sensibel (Liste 1,
  // Sozialversicherung Gruppe A) — die Aussage unten bleibt über die (jetzt wirkungslose)
  // Mapping-Kopie wahr, s. Opt-in unten für den tatsächlichen Werte-Check.
  assert.ok(!byZiel.get('care_level_valid_until').sensibel && !byZiel.get('disability_review_due').sensibel, 'kein sensibel (Mapping-eigene Kopie, seit Zug 4 ungelesen)');

  // leer = gültig → beide Claims fehlen im Export (kein Opt-in nötig).
  const V2 = ladeKern().V;
  await V2.depotAnlegen('pw'); V2.akteurSelbstErklaeren('Maria');
  const leer = V2.sdJwtVcSozialversicherung({});
  assert.ok(!('care_level_valid_until' in leer.claims) && !('disability_review_due' in leer.claims), 'leer → beide weg');

  // gefüllt → beide Claims im Export (reine Datumsfelder, Bürger-Freitext, kein Code).
  // Beide Felder sind schema-sensibel (Liste 1) — Opt-in nötig, um den Mapping-Mechanismus
  // selbst zu prüfen (dieser Test prüft die Mapping-Form, nicht das Zurückhalten).
  V2.sektorFeldSetzen('socialInsurance', 'careLevelTimeLimitedUntil', '2027-06-30');
  V2.sektorFeldSetzen('socialInsurance', 'gdbReviewReAssessmentDate', '2026-12-01');
  const voll = V2.sdJwtVcSozialversicherung({ sensibel: true });
  assert.equal(voll.claims.care_level_valid_until, '2027-06-30');
  assert.equal(voll.claims.disability_review_due, '2026-12-01');
});

test('Soz-7: Wahrheits-Filter — verifiziert-stämmig fällt raus, Weg-1 + selbst bleiben, __-Meta nicht in der Datei', async () => {
  const V = await frisch();
  // Weg 2 (signiert-geprüft → struktureller verifiziert:true-Stempel): darf NICHT als Selbstauskunft raus.
  V.sektorFeldSetzen('socialInsurance', 'degreeOfDisabilityGdb', '50', { eingabeArt: 'import', verifiziert: true });
  // Weg 1 (Selbst-Round-Trip: eingabeArt:'import' OHNE verifiziert) → bleibt, ist wahr selbst.
  // C10/Schema 43: `longTermCareFund` ist ein ref-Feld — Freitext ohne Register-Eintrag ist {override},
  // dieselbe Form, die der Import erzeugt (`vivodepot.html:9098`). Der Weg bleibt der echte.
  V.sektorFeldSetzen('socialInsurance', 'longTermCareFund', { override: 'AOK Bayern' }, { eingabeArt: 'import' });
  // selbst eingetragen → bleibt.
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');
  // pflegekasse/pflegegrad sind seit Zug 3 (Sensibel-Architektur, 09.08.2026) schema-sensibel —
  // Opt-in, damit dieser Test den Wahrheits-Filter prüft, nicht das (hier nicht gemeinte)
  // Zurückhalten. gdb bleibt trotz Opt-in draußen — sein Ausschluss läuft über den
  // verifiziert-stämmig-Filter, eine andere, unabhängige Prüfung.
  const vc = V.sdJwtVcSozialversicherung({ sensibel: true });
  assert.ok(!('disability_degree' in vc.claims), 'verifiziert-stämmiges GdB-Feld NICHT in der Selbstauskunft');
  assert.equal(vc.claims.care_insurance_fund, 'AOK Bayern', 'Weg-1-Selbst-Round-Trip bleibt enthalten');
  assert.equal(vc.claims.care_level, 'Pflegegrad 3', 'selbst eingetragen bleibt enthalten');
  assert.equal(vc.__zurueckgehalten.join(','), 'disability_degree', 'zurückgehaltenes Feld sichtbar gemeldet (UI-Meta)');
  // __-UI-Meta darf NICHT in die serialisierte Datei; der ausgeschlossene Claim auch nicht.
  const def = V.EXPORT_FORMAT_BY_ID['sd-jwt-vc-sozialversicherung'];
  const inhalt = V.formatExportInhalt(def, { sensibel: true });
  assert.equal(inhalt.indexOf('__zurueckgehalten'), -1, '__zurueckgehalten nicht in der Datei');
  assert.equal(inhalt.indexOf('disability_degree'), -1, 'verifiziert-stämmiger Claim nicht in der Datei');
  assert.ok(inhalt.indexOf('care_insurance_fund') !== -1, 'Weg-1-Claim ist in der Datei');
});

test('Soz-8: Vollmacht-Provenienz — selbst-only / unter-vollmacht / gemischt', async () => {
  // pflegegrad/pflegekasse sind seit Zug 3 (Sensibel-Architektur, 09.08.2026) schema-sensibel —
  // Opt-in überall, damit dieser Test die Vollmacht-Provenienz prüft, nicht das Zurückhalten.
  // selbst-only → kein _eingabe-Block (datensparsam, kein Dritt-Personen-Name).
  const V1 = await frisch();
  V1.sektorFeldSetzen('socialInsurance', 'careLevel', '2');
  const selbst = V1.sdJwtVcSozialversicherung({ sensibel: true });
  assert.ok(!('_eingabe' in selbst), 'selbst-only → kein _eingabe-Block');

  // unter-vollmacht → _eingabe trägt Eigenschaft, Name-Snapshot, Grundlage.
  const V2 = ladeKern().V;
  await V2.depotAnlegen('pw');
  const pid = V2.personHinzufuegen({ name: 'Bevollmächtigte Petra' });
  V2.setzeSitzungsAkteur({ personId: pid, eigenschaft: 'unter-vollmacht', vollmachtsGrundlage: 'depot-XYZ' });
  V2.sektorFeldSetzen('socialInsurance', 'careLevel', '4');
  const vm = V2.sdJwtVcSozialversicherung({ sensibel: true });
  assert.ok(vm._eingabe && Array.isArray(vm._eingabe.unter_vollmacht), 'unter-vollmacht → _eingabe-Block');
  assert.equal(vm._eingabe.unter_vollmacht.length, 1);
  assert.equal(vm._eingabe.unter_vollmacht[0].feld, 'care_level');
  assert.equal(vm._eingabe.unter_vollmacht[0].durch, 'Bevollmächtigte Petra', 'Name-Snapshot getragen');
  assert.ok(!('grundlage' in vm._eingabe.unter_vollmacht[0]), 'keine rohe Sub-Depot-UUID/Grundlage im Credential');
  assert.equal(vm.claims.care_level, 'Pflegegrad 4', 'der Wert selbst bleibt im Credential');
  // Gegenprobe: der interne Bezeichner darf in der serialisierten Datei NIRGENDS auftauchen.
  const vmInhalt = V2.formatExportInhalt(V2.EXPORT_FORMAT_BY_ID['sd-jwt-vc-sozialversicherung'], { sensibel: true });
  assert.equal(vmInhalt.indexOf('depot-XYZ'), -1, 'interne Vollmacht-Grundlage (UUID) erscheint nirgends in der Datei');

  // gemischt → ein weiteres Feld SELBST eintragen; nur das Vollmacht-Feld erscheint in _eingabe.
  V2.akteurSelbstErklaeren('Maria');
  V2.sektorFeldSetzen('socialInsurance', 'longTermCareFund', { override: 'AOK Bayern' });   // C10: ref-Feld
  const gemischt = V2.sdJwtVcSozialversicherung({ sensibel: true });
  assert.equal(gemischt._eingabe.unter_vollmacht.map(e => e.feld).join(','), 'care_level',
    'gemischt: nur das Vollmacht-Feld benannt, das selbst-Feld nicht');
  assert.equal(gemischt.claims.care_insurance_fund, 'AOK Bayern', 'selbst-Feld im Credential, aber nicht in _eingabe');
});
