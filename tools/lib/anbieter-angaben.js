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
   rechtsform-Enum. adresse ist ohnehin für jede Rechtsform Pflicht (nicht nur für die natürliche
   Person) — dieselbe Anforderung wie im bestehenden Submission-Schema, hier nur nachvollzogen.
   ════════════════════════════════════════════════════════════════════════════ */

const RECHTSFORMEN = Object.freeze([
  'natürliche Person',
  'e.V.',
  'GmbH',
  'AG',
  'Anstalt öffentlichen Rechts',
  'Behörde',
  'sonstige Körperschaft',
]);

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
  if (!RECHTSFORMEN.includes(a.rechtsform)) {
    throw new Error(wo + ': rechtsform fehlt oder unbekannt (erwartet eine von ' + RECHTSFORMEN.join('/') + ').');
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

module.exports = { RECHTSFORMEN, anbieterAngabenPruefen };
