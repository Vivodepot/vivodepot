'use strict';
/* Die Fälle für tools/link-senden-validator-beleg.js (19.10.2026): erfundene, kleine Auszüge, die der Kern über
   auszugLinkTeile in einen SMART Health Link packt. Ein FHIR-Auszug geht mit seinen Bytes hinein, die anderen als FHIR
   Binary. Die PDF-ähnlichen Bytes sind als UTF-8 ungültig, damit ein Text-Umweg auffiele (wie in
   tests/link-senden-auszug.test.js). Gelesen von der Probe tests/link-senden-validator-beleg.test.js. */

const PDF_AEHNLICH = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
  0xff, 0xfe, 0x00, 0x80]);
const FHIR_AUSZUG = JSON.stringify({ resourceType: 'Bundle', type: 'collection', entry: [] });
const JSON_AUSZUG = JSON.stringify({ dateiTyp: 'vivodepot-anlass', felder: { name: 'Klara Probe' } }, null, 2);

// erwartet: 'gueltig' — jeder Validator muss sie annehmen. weg: der Freigabeweg des Kerns ('direkt' = U-Flag).
const FAELLE = Object.freeze([
  Object.freeze({ name: 'fhir-auszug-direkt', mime: 'application/fhir+json', inhalt: FHIR_AUSZUG, weg: 'direkt', label: 'Auszug FHIR', binary: false }),
  Object.freeze({ name: 'pdf-auszug-direkt', mime: 'application/pdf', inhalt: PDF_AEHNLICH, weg: 'direkt', label: 'Auszug PDF', binary: true }),
  Object.freeze({ name: 'json-auszug-manifest', mime: 'application/json', inhalt: JSON_AUSZUG, weg: 'manifest', label: 'Auszug JSON', binary: true }),
]);

module.exports = { PDF_AEHNLICH, FHIR_AUSZUG, JSON_AUSZUG, FAELLE };
