'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-047: SHL-Provider (Offline-Teil)
   ────────────────────────────────────────────────────────────────────────
   Aus einem autoritativen Mappe-Eintrag (U2-ADR-045) wird eine verschlüsselte
   JWE-Datei (RFC 7516 compact, alg:dir, enc:A256GCM) + der shlink:/-Payload
   nach SMART-Health-Links-Spec gebaut (U-Flag: Direkt-GET, kein Manifest-
   Server). Klartext = das VERBATIM importierte Bündel (aus `inhalt` decodiert,
   KEIN Neubau). Erzeugung rein lokal (WebCrypto). Vor dem Upload-Schritt steht ein
   Riegel (shlDateiHochladen): hochgeladen wird über die Ablage-Seite share.vivodepot.de, nie aus dem Kern.

   Eingabe: ein selbst erzeugtes, profiliertes Bündel (`eigenprobe-eu-lab.json`, seit 12.09.2026 —
   Produktentscheidung: kein Fremdmaterial in tests/fixtures/, vorher Bundle-
   SimpleChemistryResultReport.json aus dem eu-laboratory-IG-Paket). Der SHL-Weg ist byte-
   verbatim UND profil-agnostisch (s. Test unten) — der Beweis braucht keinen echten Inhalt.

   Der Kern-Beweis: die JWE wird hier mit dem Payload-`key` entschlüsselt und der
   Klartext ist byte-genau das importierte Original (verbatim, kein Neubau).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const FIXTURE = path.join(__dirname, 'fixtures', 'eigenprobe-eu-lab.json');

function b64uToBuf(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }

// JWE compact (alg:dir, enc:A256GCM) mit dem base64url-key entschlüsseln → { protHdr, ek, klar }.
function jweDirDecrypt(jwe, keyB64u) {
  const [protHdr, ek, ivB, ctB, tagB] = String(jwe).split('.');
  const d = nodeCrypto.createDecipheriv('aes-256-gcm', b64uToBuf(keyB64u), b64uToBuf(ivB));
  d.setAAD(Buffer.from(protHdr, 'ascii'));   // AAD = ASCII(protected header b64u), RFC 7516 §5.1
  d.setAuthTag(b64uToBuf(tagB));             // wirft bei Manipulation/falschem Schlüssel (final())
  const klar = Buffer.concat([d.update(b64uToBuf(ctB)), d.final()]).toString('utf8');
  return { protHdr, ek, klar };
}

async function frischMitLabDoc() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const text = fs.readFileSync(FIXTURE, 'utf8');
  const id = V.importAutoritativDokument(text);   // autoritative Ablage (verbatim)
  assert.ok(id, 'Fixture wird als autoritativer Eintrag erkannt + abgelegt');
  return { V, id, text };
}

test('[U2-ADR-047] JWE round-trip: dir/A256GCM entschlüsselt VERBATIM zum importierten Original', async () => {
  const { V, id, text } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id);
  const parts = String(teile.jwe).split('.');
  assert.equal(parts.length, 5, 'JWE compact = 5 Teile');
  assert.equal(parts[1], '', 'encrypted_key leer (alg:dir)');
  const { protHdr, klar } = jweDirDecrypt(teile.jwe, teile.key);
  const hdr = JSON.parse(b64uToBuf(protHdr).toString('utf8'));
  assert.equal(hdr.alg, 'dir');
  assert.equal(hdr.enc, 'A256GCM');
  assert.equal(hdr.cty, 'application/fhir+json');
  // DER Kern-Beweis: entschlüsselter Klartext == das byte-verbatim importierte Bündel.
  assert.equal(klar, text, 'JWE-Klartext ist byte-genau das Original-Bündel (kein Neubau)');
});

test('[U2-ADR-047] Payload-Felder: key 43 Zeichen base64url, U-Flag, label ≤80, exp in der Zukunft', async () => {
  const { V, id } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id, { label: 'Blutbild Mai' });
  assert.equal(teile.key.length, 43, 'key = 43 Zeichen (32 Bytes base64url ohne Padding)');
  assert.match(teile.key, /^[A-Za-z0-9_-]{43}$/, 'base64url ohne Padding');
  assert.equal(teile.flag, 'U', 'U-Flag: Direkt-GET, kein Manifest-Server');
  assert.equal(teile.label, 'Blutbild Mai');
  assert.ok(teile.exp > Math.floor(Date.now() / 1000), 'exp liegt in der Zukunft');
});

test('[U2-ADR-047] frischer Schlüssel je Aufruf (kein Wiederverwenden von Schlüssel/IV)', async () => {
  const { V, id } = await frischMitLabDoc();
  const a = await V.shlProviderPayload(id);
  const b = await V.shlProviderPayload(id);
  assert.notEqual(a.key, b.key, 'zwei Aufrufe → verschiedene Schlüssel');
  assert.notEqual(a.jwe, b.jwe, 'zwei Aufrufe → verschiedene Chiffren');
});

test('[U2-ADR-047] shlUriBauen: shlink:/-URI decodiert zu {url,key,flag:U,label,exp}', async () => {
  const { V, id } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id);
  const url = 'https://shl.example.org/f/' + 'a'.repeat(40);
  const uri = V.shlUriBauen(teile, url);
  assert.ok(uri.startsWith(V.SHL_URI_PRAEFIX), 'shlink:/-Präfix');
  const payload = JSON.parse(b64uToBuf(uri.slice(V.SHL_URI_PRAEFIX.length)).toString('utf8'));
  assert.equal(payload.url, url);
  assert.equal(payload.key, teile.key);
  assert.equal(payload.flag, 'U');
  assert.equal(payload.label, teile.label);
  assert.equal(payload.exp, teile.exp);
  assert.throws(() => V.shlUriBauen(teile, 'https://x/' + 'y'.repeat(200)), /zu lang/, 'url-Grenze 128 (Spec)');
});

test('[U2-ADR-047] Upload nie aus dem Kern — der Riegel wirft, der volle Weg endet dort', async () => {
  const { V, id } = await frischMitLabDoc();
  await assert.rejects(() => V.shlDateiHochladen('a.b.c.d.e'), /nicht aus dem Kern/);
  await assert.rejects(() => V.shlProviderErzeugen(id), /nicht aus dem Kern/);   // Offline-Teil lief, Upload nur über die Ablage-Seite
});

test('[U2-ADR-047] nur autoritative Einträge teilbar; nicht-autoritativ wirft', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const normId = V.mappeEintragHinzufuegen({ beschriftung: 'Foto', inhalt: 'data:image/png;base64,QUJD', mime: 'image/png' });
  await assert.rejects(() => V.shlProviderPayload(normId), /nur autoritative/);
});

test('[U2-ADR-048] SHL-Round-Trip auch für eu-hdr (Entlassbrief) — byte-verbatim, profil-agnostisch', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const hdr = fs.readFileSync(path.join(__dirname, 'fixtures', 'eigenprobe-eu-hdr.json'), 'utf8');
  const id = V.importAutoritativDokument(hdr);
  assert.ok(id, 'HDR wird als autoritativer Eintrag erkannt');
  const teile = await V.shlProviderPayload(id);
  const { klar } = jweDirDecrypt(teile.jwe, teile.key);
  assert.equal(klar, hdr, 'JWE-Klartext ist byte-genau das HDR-Original (SHL ist profil-agnostisch)');
});

test('[U2-ADR-049] SHL-Round-Trip auch für IPS (Patientenkurzakte) — byte-verbatim', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const ips = fs.readFileSync(path.join(__dirname, 'fixtures', 'eigenprobe-ips.json'), 'utf8');
  const id = V.importAutoritativDokument(ips);
  assert.ok(id, 'IPS wird als autoritativer Eintrag erkannt');
  const teile = await V.shlProviderPayload(id);
  const { klar } = jweDirDecrypt(teile.jwe, teile.key);
  assert.equal(klar, ips, 'JWE-Klartext ist byte-genau das IPS-Original');
});

/* ════════════════════════════════════════════════════════════════════════
   Die zwei Freigabewege (Nachtrag zu U2-ADR-047)
   ────────────────────────────────────────────────────────────────────────
   'direkt' (U-Flag) und 'manifest' (kein Flag) sind zwei gleichrangige Werte
   EINES Parameters, keine Regel und keine Ausnahme. Die Spec: „When no U flag
   is present, the … Receiving Application SHALL retrieve a … manifest."

   Der Anlass ist gemessen, nicht gedacht: der Empfänger der Gegenstelle in
   Gazelle TI-727 kann ausschließlich den Manifest-Weg. Mit U-Flag hatte weder
   Schritt 40 noch Schritt 50 einen Gegenstand.
   ════════════════════════════════════════════════════════════════════════ */

function payloadVon(V, uri) {
  return JSON.parse(b64uToBuf(uri.slice(V.SHL_URI_PRAEFIX.length)).toString('utf8'));
}
const TEST_URL = 'https://shl.example.org/f/' + 'a'.repeat(40);

test('[U2-ADR-047] Weg "direkt": U-Flag steht im Payload', async () => {
  const { V, id } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id, { weg: 'direkt' });
  assert.equal(teile.weg, 'direkt');
  assert.equal(teile.flag, 'U');
  const p = payloadVon(V, V.shlUriBauen(teile, TEST_URL));
  assert.equal(p.flag, 'U', 'Direkt-Weg trägt das U-Flag');
});

test('[U2-ADR-047] Weg "manifest": KEIN flag-Feld im Payload — nicht flag:""', async () => {
  const { V, id } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id, { weg: 'manifest' });
  assert.equal(teile.weg, 'manifest');
  assert.equal(teile.flag, '');
  const p = payloadVon(V, V.shlUriBauen(teile, TEST_URL));
  assert.ok(!('flag' in p), 'kein flag-Schlüssel — „kein Flag" IST die Manifest-Form');
  assert.equal(p.url, TEST_URL);
  assert.equal(p.key, teile.key);
  assert.equal(p.label, teile.label);
});

test('[U2-ADR-047] REGRESSION: der leere Flag-Wert darf nicht still zu U werden', async () => {
  /* Die Falle: `teile.flag || 'U'` macht aus dem leeren String (Manifest) wieder 'U',
     weil '' falsy ist. Der Fehler wäre stumm — der Link sähe gültig aus und schickte
     den Empfänger auf den Direkt-Weg, den die Gegenstelle nicht kann. */
  const { V, id } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id, { weg: 'manifest' });
  const p = payloadVon(V, V.shlUriBauen(teile, TEST_URL));
  assert.notEqual(p.flag, 'U', 'Manifest-Weg darf NIE als U-Flag herauskommen');
  assert.notEqual(p.flag, '', 'und auch nicht als leeres flag-Feld');
});

test('[U2-ADR-047] unbekannter Weg fällt auf die Voreinstellung zurück, wirft nicht', async () => {
  const { V, id } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id, { weg: 'gibtesnicht' });
  assert.equal(teile.weg, V.SHL_FREIGABEWEG_STANDARD, 'Rückfall auf die Voreinstellung');
  assert.equal(teile.flag, 'U');
});

test('[U2-ADR-047] Aufrufer OHNE weg (Stand vor der Wahl) verhält sich unverändert', async () => {
  const { V, id } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id);
  assert.equal(teile.flag, 'U', 'Voreinstellung bleibt der Direkt-Weg');
  // Ein Altobjekt ganz ohne `weg` — der Zweig `teile.flag || 'U'` muss weiter greifen.
  const alt = { key: teile.key, label: teile.label, exp: teile.exp };
  const p = payloadVon(V, V.shlUriBauen(alt, TEST_URL));
  assert.equal(p.flag, 'U', 'ohne weg und ohne flag: wie bisher U');
});

test('[U2-ADR-047] die Wege-Tabelle ist eingefroren und vollständig', async () => {
  const { V } = await frischMitLabDoc();
  assert.deepEqual(Object.keys(V.SHL_FREIGABEWEGE).sort(), ['direkt', 'manifest']);
  assert.ok(Object.isFrozen(V.SHL_FREIGABEWEGE), 'die Tabelle ist kein Schalter zum Umlegen');
  assert.equal(V.SHL_FREIGABEWEGE.direkt.flag, 'U');
  assert.equal(V.SHL_FREIGABEWEGE.manifest.flag, '');
});
