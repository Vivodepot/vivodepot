'use strict';
/* U2-ADR-501, Wagen V3b — das Studio liest eine SIGNIERTE Antwort (`cty` `JWT`), bevor der Kern signiert (Schalter ANTWORT_SIGNIEREN).

   Das Studio öffnet Antworten mit dem Einmalpasswort (Eingegangene Antworten). Es prüft die Signatur GENAU wie die Lese-App: der
   ANTWORT-SIGNATUR-BLOCK, der STELLENKENNUNG-BLOCK, `_kanonischJSON` und `_jwkThumbprint` stehen zeichengleich in beiden. Es gleicht
   `aud` nicht ab (es hält keine gebundene Kennung) und zeigt die Sachangabe, nie „geprüft“.

   Was gehalten wird (die Antwort entsteht hier zur Laufzeit, mit node:crypto; kein Schlüssel liegt im Repo):
     · die Blöcke sind in Studio und Lese-App zeichengleich (Rot-Beweis: eine geänderte Kopie fällt auf);
     · eine gültige signierte Antwort öffnet über den echten Weg „Antworten öffnen“, die Karte zeigt denselben Inhalt wie ohne
       Signatur und die Zeile „Unverändert seit dem Signieren · Schlüssel … · Signiert für …“;
     · ein gekipptes Byte und eine Antwort für einen anderen Vorgang werden abgewiesen, mit einem Satz ohne Code;
     · eine Antwort ohne Signatur öffnet wie bisher, mit „nicht signiert (ältere Fassung)“.
   Rot-Beweis: ein Studio ohne die Signaturprüfung öffnet die signierte Antwort nicht (der JWS ist kein JSON). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { webcrypto } = nodeCrypto;
const { ladeGenerator } = require('./load-generator.js');

const WURZEL = path.join(__dirname, '..');
const STUDIO = fs.readFileSync(path.join(WURZEL, 'vivodepot-studio.html'), 'utf8');
const LESEN = fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8');
const PW = 'probe-einmal-studio';
const VORGANG = 'AUF-2026-1015';
const STELLE = 'heim/sonnenhof';
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const json = (o) => JSON.parse(JSON.stringify(o));

function datensatz(vorgang) {
  return {
    erstelltAm: '2026-10-15T09:00:00.000Z',
    anfrage: { von: 'Pflegeheim Sonnenhof', anbieterId: STELLE, zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: vorgang || VORGANG, gueltigBis: '2099-12-31' },
    felder: [{ kennung: 'identity.givenName', label: 'Vorname', wert: 'Hedwig', zweck: 'Anrede' }],
    fehlend: [], unbekannt: [], vollstaendig: true, absender: { name: 'Hedwig Brandt', rolle: 'selbst' },
  };
}
function signiere(nutzlast) {
  const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('ed25519');
  const j = publicKey.export({ format: 'jwk' });
  const jwk = { kty: j.kty, crv: j.crv, x: j.x };
  const kopf = { alg: 'Ed25519', typ: 'vivodepot-antwort+jwt', jwk };
  const eingabe = b64u(JSON.stringify(kopf)) + '.' + b64u(JSON.stringify(nutzlast));
  return eingabe + '.' + b64u(nodeCrypto.sign(null, Buffer.from(eingabe), privateKey));
}
const audVon = (id) => 'signiert:anbieter:' + String(Buffer.byteLength(id)).padStart(4, '0') + ':' + id;
const signiert = (vorgang) => signiere(Object.assign(datensatz(vorgang), { iat: 1760518800, aud: audVon(STELLE) }));

/* PBES2-HS512+A256KW wie U2-ADR-449 (Salz = alg ‖ 0x00 ‖ p2s, p2c fest), A256GCM, AAD = der Kopf. */
async function einmalJwe(klartext, kopfExtra) {
  const p2s = webcrypto.getRandomValues(new Uint8Array(16));
  const salt = Buffer.concat([Buffer.from('PBES2-HS512+A256KW'), Buffer.from([0]), Buffer.from(p2s)]);
  const basis = await webcrypto.subtle.importKey('raw', Buffer.from(PW), { name: 'PBKDF2' }, false, ['deriveKey']);
  const kw = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-512' }, basis, { name: 'AES-KW', length: 256 }, false, ['wrapKey']);
  const cek = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const ek = new Uint8Array(await webcrypto.subtle.wrapKey('raw', cek, kw, { name: 'AES-KW' }));
  const kopf = Object.assign({ alg: 'PBES2-HS512+A256KW', typ: 'vivodepot-antwort+jwe', cty: 'json', enc: 'A256GCM', vorgang: VORGANG, p2s: b64u(p2s), p2c: 600000 }, kopfExtra || {});
  const k = b64u(JSON.stringify(kopf));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: Buffer.from(k), tagLength: 128 }, cek, Buffer.from(klartext)));
  return [k, b64u(ek), b64u(iv), b64u(ct.subarray(0, ct.length - 16)), b64u(ct.subarray(ct.length - 16))].join('.');
}

/* Der echte Weg „Antworten öffnen“: Dateien und Passwort über die Felder, die Karten über einen Spion an antwortKarte. */
async function oeffneImStudio(jwes, html) {
  const { V, sandbox, document } = ladeGenerator(html ? { html } : undefined);
  const karten = [];
  const echt = sandbox.antwortKarte;
  sandbox.antwortKarte = (name, m, sig) => { karten.push({ name, m, sig }); return echt(name, m, sig); };
  document.getElementById('an-passwort').value = PW;
  document.getElementById('an-dateien').files = jwes.map((t, i) => ({ name: 'antwort-' + i + '.jwe', text: async () => t }));
  await V.antwortenOeffnen();
  return { karten, V };
}

/* ══ Spiegel ══ */

function zwischen(text, anfang, ende) {
  const a = text.indexOf(anfang), e = text.indexOf(ende, a);
  if (a < 0 || e < a || text.indexOf(anfang, a + 1) >= 0) return null;
  return text.slice(a, e + ende.length);
}
const STUECKE = [
  ['ANTWORT-SIGNATUR-BLOCK', '/* ══ ANTWORT-SIGNATUR-BLOCK (U2-ADR-501', '/* ══ ENDE ANTWORT-SIGNATUR-BLOCK ══ */'],
  ['_kanonischJSON', 'function _kanonischJSON(x) {', '\n}\n'],
  ['_jwkThumbprint', 'async function _jwkThumbprint(jwk) {', '\n}\n'],
];
function spiegelFehler(studio, lesen) {
  return STUECKE.filter(([, a, e]) => { const s = zwischen(studio, a, e); return !s || s !== zwischen(lesen, a, e); }).map(([n]) => n);
}

test('[Studio·Signatur·Spiegel] Prüfblock, _kanonischJSON und _jwkThumbprint stehen in Studio und Lese-App genau einmal und zeichengleich', () => {
  assert.deepEqual(spiegelFehler(STUDIO, LESEN), []);
});

test('[Studio·Signatur·Spiegel·Rot-Beweis] eine geänderte Kopie im Studio fällt auf', () => {
  const zeile = "  if (kopf.crit !== undefined) throw _antwortSignaturFehler('antwortSignaturVerfahren', 'crit');\n";
  assert.ok(STUDIO.includes(zeile), 'Vorbedingung: die Zeile steht im Block');
  assert.deepEqual(spiegelFehler(STUDIO.replace(zeile, ''), LESEN), ['ANTWORT-SIGNATUR-BLOCK']);
});

/* ══ Der echte Weg ══ */

test('[Studio·Signatur] eine signierte Antwort öffnet über „Antworten öffnen“, mit demselben Inhalt wie ohne Signatur und der Sachzeile', async () => {
  const { karten, V } = await oeffneImStudio([await einmalJwe(signiert(), { cty: 'JWT' }), await einmalJwe(JSON.stringify(datensatz()))]);
  assert.equal(karten.length, 2, 'beide Dateien öffnen');
  const [mit, ohne] = karten;
  assert.deepEqual(json(mit.m), json(ohne.m), 'dieselbe Karte, ohne iat und aud');
  assert.equal(mit.sig.stelle, STELLE);
  assert.equal(mit.sig.abgeglichen, false, 'das Studio gleicht aud nicht ab');
  assert.equal(ohne.sig, null);
  const zeile = V.antwortSignaturZeile(mit.sig);
  assert.match(zeile, /^Unverändert seit dem Signieren · Schlüssel \S+ · Signiert für heim\/sonnenhof$/);
  assert.equal(V.antwortSignaturZeile(null), 'Diese Antwort ist nicht signiert (ältere Fassung).');
  for (const t of [zeile, V.antwortSignaturZeile(null)]) assert.doesNotMatch(t, /geprüft|verifiziert|\becht\b/i);
});

test('[Studio·Signatur·Abweisung] ein gekipptes Byte und ein fremder Vorgang: keine Karte mit Inhalt, ein Satz ohne Code', async () => {
  const t = signiert().split('.');
  const p = Buffer.from(t[1], 'base64url'); p[p.indexOf(Buffer.from('Hedwig'))] ^= 0x01; t[1] = b64u(p);
  const { V } = ladeGenerator();
  for (const [jws, schluessel] of [[t.join('.'), 'antwortSignaturUngueltig'], [signiert('AUF-ANDERS'), 'antwortSignaturFremderVorgang']]) {
    const { karten } = await oeffneImStudio([await einmalJwe(jws, { cty: 'JWT' })]);
    assert.equal(karten.length, 0, schluessel + ': keine Karte');
    let fehler = null;
    try { await V.antwortSignaturPruefen(jws, { anbieterId: '', vorgang: VORGANG }); } catch (e) { fehler = e; }
    assert.equal(fehler && fehler.antwortTextSchluessel, schluessel);
    const satz = V.antwortFehlerText(fehler);
    assert.match(satz, /Die Antwort wird nicht angezeigt\.$/);
    assert.doesNotMatch(satz, /antwort-signatur-|jw[se]|\baud\b/i);
  }
});

test('[Studio·Signatur·Rot-Beweis] ohne die Signaturprüfung öffnet das Studio die signierte Antwort nicht', async () => {
  const zweig = '        if (antwortJweTraegtJws(geoeffnet.kopf)) {';
  assert.ok(STUDIO.includes(zweig), 'Vorbedingung: der Zweig steht im Öffnen-Weg');
  const { karten } = await oeffneImStudio([await einmalJwe(signiert(), { cty: 'JWT' })], STUDIO.replace(zweig, '        if (false) {'));
  assert.equal(karten.length, 0, 'ohne Prüfung ist der JWS kein lesbarer Datensatz');
});
