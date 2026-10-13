'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   anbieter-angaben.js — der reiche Anbieter-Block für ein ausgestelltes Zertifikat
   (19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Dieselbe Form wie $defs.verantwortlicheStelle in
   docs/template-generator/submission-schema.json (SUBMISSION_SCHEMA.properties.anbieter in
   vivodepot-vc-issuer.html, ohne die submission-eigenen Felder bereich/useCase) — kein zweites,
   hier neu erfundenes Schema.

   „rechtsform bekommt 'natürliche Person', ladungsfähige Anschrift ist dann Pflicht" (Produktentscheidung,
   über -05) — KEIN eigenes personOderInstitution-Feld daneben: die Unterscheidung steckt im
   rechtsform-Wert (seit U2-ADR-495 freier Text, kein Enum mehr). adresse ist ohnehin für jede Rechtsform Pflicht (nicht nur für die natürliche
   Person) — dieselbe Anforderung wie im bestehenden Submission-Schema, hier nur nachvollzogen.
   ════════════════════════════════════════════════════════════════════════════ */

/* U2-ADR-495 (09.10.2026): keine feste deutsche Liste mehr. Die Rechtsform bleibt bei der AUSSTELLUNG Pflicht (wer
   bescheinigt wird, muss benannt sein), aber als freier Text; welche Rechtsformen es gibt, sagt das Rechtsraum-Modul
   (`rechtsformen`), nicht dieses Werkzeug. „natürliche Person“ ist weiter ein Wert wie jeder andere. `rechtsraum` ist
   freiwillig und, wenn gesetzt, ein Kürzel. */
const RECHTSRAUM_KUERZEL = /^[A-Z]{2,8}$/;
const RECHTSFORM_MAX = 120;
const RECHTSFORM_STEUERZEICHEN = /[\u0000-\u001F\u007F-\u009F]/;

function _feldPruefen(wo, obj, pfad, feld) {
  const wert = obj && obj[feld];
  if (!wert || !String(wert).trim()) {
    throw new Error(wo + ': ' + pfad + '.' + feld + ' fehlt.');
  }
}

// Wirft benannt, statt eine Lücke stillschweigend durchzulassen — dieselbe Disziplin wie
// rezeptPruefen/pruefstellenAngabenPruefen. Rot-Beweis der Ausstellungswerkzeuge: „ohne anbieter
// keine Signatur" hängt an dieser Funktion.
function anbieterAngabenPruefen(a) {
  const wo = 'Anbieter-Angaben';
  if (!a || typeof a !== 'object') throw new Error(wo + ' fehlen ganz — ohne sie wird nicht signiert.');
  if (typeof a.rechtsform !== 'string' || !a.rechtsform.trim()) {
    throw new Error(wo + ': rechtsform fehlt.');
  }
  // Sie steht im signierten Zertifikat und wird angezeigt: eine Längengrenze und keine Steuerzeichen.
  if (a.rechtsform.length > RECHTSFORM_MAX || RECHTSFORM_STEUERZEICHEN.test(a.rechtsform)) {
    throw new Error(wo + ': rechtsform ist länger als ' + RECHTSFORM_MAX + ' Zeichen oder enthält Steuerzeichen.');
  }
  if (a.rechtsraum !== undefined && !(typeof a.rechtsraum === 'string' && RECHTSRAUM_KUERZEL.test(a.rechtsraum))) {
    throw new Error(wo + ': rechtsraum ist gesetzt, aber kein Kürzel (zwei bis acht Großbuchstaben).');
  }
  if (!a.adresse || typeof a.adresse !== 'object') {
    throw new Error(wo + ': adresse fehlt — ladungsfähige Anschrift ist Pflicht, auch für „natürliche Person".');
  }
  for (const f of ['strasse', 'plz', 'ort', 'land']) _feldPruefen(wo, a.adresse, 'adresse', f);
  if (!a.kontakt || typeof a.kontakt !== 'object') throw new Error(wo + ': kontakt fehlt.');
  for (const f of ['name', 'funktion', 'email', 'telefon']) _feldPruefen(wo, a.kontakt, 'kontakt', f);
  if (a.ustId !== undefined && (typeof a.ustId !== 'string' || !a.ustId.trim())) {
    throw new Error(wo + ': ustId ist gesetzt, aber leer — entweder weglassen oder einen echten Wert.');
  }
  return a;
}

module.exports = { RECHTSRAUM_KUERZEL, RECHTSFORM_MAX, anbieterAngabenPruefen };
