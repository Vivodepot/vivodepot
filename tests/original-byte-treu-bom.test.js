'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-233: die maßgebliche Kopie wird byte-treu abgelegt
   ────────────────────────────────────────────────────────────────────────
   Vorlauf: Bericht „Urkunde-Byte-Genauigkeit" (03.09.2026) — datei.text()
   entfernt ein führendes UTF-8-BOM VOR jedem Vivodepot-Code, unsichtbar. Die
   maßgebliche Ablage (autoritatives med. Dokument, ADR-086) verlor dadurch
   genau die BOM-Bytes gegenüber der wahren Originaldatei.

   Rot-Beweis geführt (Auftrag Zug A, zweiseitig): Probe 1 schlug vor dem Fix mit
   ungleichen Hashes fehl (drei Byte Differenz, exakt die BOM-Länge) — Fix eingespielt, dann
   grün. Probe 2 ist die Gegenprobe zum naiven Fix: ein erster Entwurf (BOM einfach nicht mehr
   entfernen, ohne Trennung von Erkennung/Ablage) hätte hier rot geschlagen (Erkennung driftet
   auf den generischen fhir-ips-Fallback ab) — mit der tatsächlichen Lösung (U2-ADR-233,
   Erkennung bleibt auf dem dekodierten Text, nur die Ablage wechselt auf rohe Bytes) grün.

   Zwei Proben, ZWEISEITIG (Auftrag Zug A):
   1. Byte-Identität: die herausgegebene Datei ist bit-für-bit gleich der
      wahren Originaldatei MIT BOM — nicht nur gleich dem, was Vivodepot nach
      dem Decodieren gespeichert hat.
   2. Erkennung bleibt korrekt: derselbe BOM-behaftete eu-lab-Bericht wird
      weiterhin als 'fhir-lab' erkannt, nicht als der generische 'fhir-ips'-
      Fallback (der Kommentar an der Registry-Stelle warnt genau davor: der
      Fallback matcht jedes Bundle). Ein Fix, der nur Probe 1 bestünde, hätte
      die Erkennung stillschweigend gebrochen — gemessen im Vorlaufbericht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const EU_LAB_PROFIL = 'http://hl7.eu/fhir/laboratory/StructureDefinition/Bundle-eu-lab';
const PW = 'pw';

function labBundleJson() {
  return JSON.stringify({
    resourceType: 'Bundle',
    type: 'document',
    meta: { profile: [EU_LAB_PROFIL] },
    identifier: { system: 'urn:ietf:rfc:3986', value: 'urn:uuid:11111111-1111-4111-8111-111111111111' },
    timestamp: '2026-05-20T09:00:00Z',
    entry: [
      { resource: { resourceType: 'Composition', title: 'Laborbericht' } },
      { resource: { resourceType: 'Organization', name: 'Laborzentrum München' } },
      { resource: { resourceType: 'Observation', code: { text: 'Hämoglobin' }, valueQuantity: { value: 14.2, unit: 'g/dL' } } },
    ],
  }, null, 2) + '\n';
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function machtCapturingBlob() {
  const erzeugte = [];
  function CapturingBlob(parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; erzeugte.push(this); }
  return { CapturingBlob, erzeugte };
}

// Bildet NACH, was flowImportAuto/flowImportDatei aus der gewählten Datei machen (arrayBuffer()
// EINMAL lesen, text() via TextDecoder ABLEITEN — Standardverhalten, BOM wird für die Erkennung wie
// bisher entfernt) — ohne echtes File/DOM, aber mit derselben Bytefolge und demselben Decoder.
function simuliereDateiEinlesen(rohBytes) {
  const bytes = new Uint8Array(rohBytes);
  const text = new TextDecoder().decode(bytes);
  return { bytes, text };
}

test('[U2-ADR-233] BOM-behaftete eu-lab-Datei: Original-Download ist byte-identisch zur WAHREN Originaldatei (mit BOM)', async () => {
  const jsonText = labBundleJson();
  const wahresOriginal = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(jsonText, 'utf8')]);
  const { bytes, text } = simuliereDateiEinlesen(wahresOriginal);

  const { CapturingBlob, erzeugte } = machtCapturingBlob();
  const { V } = ladeKern({ Blob: CapturingBlob });
  await V.depotAnlegen(PW);

  const id = V.importAutoritativDokument(text, bytes);
  assert.notEqual(id, null, 'als autoritatives Dokument erkannt und abgelegt');

  await V.flowMappeOriginalHerunterladen(id);
  assert.equal(erzeugte.length, 1, 'genau ein Blob erzeugt');
  const ausgabeBytes = Buffer.from(erzeugte[0].parts[0]);

  assert.equal(sha256(ausgabeBytes), sha256(wahresOriginal), 'Hash der Ausgabe gleich Hash der wahren Originaldatei (BOM inklusive)');
  assert.equal(Buffer.compare(ausgabeBytes, wahresOriginal), 0, 'byte-identisch zur wahren Originaldatei');
});

test('[U2-ADR-233] BOM-behaftete eu-lab-Datei: Erkennung bleibt "fhir-lab", nicht der generische "fhir-ips"-Fallback', async () => {
  const jsonText = labBundleJson();
  const wahresOriginal = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(jsonText, 'utf8')]);
  const { text } = simuliereDateiEinlesen(wahresOriginal);

  const { V } = ladeKern();
  const fid = V.importFormatErkennen(text, 'gesundheit');
  assert.equal(fid, 'fhir-lab', 'BOM darf die Erkennung nicht auf den generischen fhir-ips-Fallback abdrängen');
  const def = V.importFormatFuerId(fid);
  assert.equal(def && def.autoritativDoc, true, 'erkanntes Format bleibt der autoritative Ablage-Zweig');
});

test('[U2-ADR-233] Ohne BOM: Verhalten unverändert (Rückfall auf den bisherigen Text-Weg, wenn keine Bytes übergeben werden)', async () => {
  const jsonText = labBundleJson();
  const { CapturingBlob, erzeugte } = machtCapturingBlob();
  const { V } = ladeKern({ Blob: CapturingBlob });
  await V.depotAnlegen(PW);
  const id = V.importAutoritativDokument(jsonText);   // EIN Argument, wie der Bestand es aufruft
  assert.notEqual(id, null);
  await V.flowMappeOriginalHerunterladen(id);
  // Der Download-Weg ist seit U2-ADR-233 immer byte-basiert (kein TextDecoder-Umweg mehr) — die
  // Bytes müssen UTF-8-decodiert byte-identisch zum ursprünglichen Text sein.
  assert.equal(Buffer.from(erzeugte[0].parts[0]).toString('utf8'), jsonText, 'ohne Bytes-Parameter weiterhin byte-identisch (über die Bytes verglichen, nicht über einen String-Zwischenschritt)');
});
