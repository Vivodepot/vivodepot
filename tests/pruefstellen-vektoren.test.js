'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Feste Ein-/Ausgabe-Vektoren je Prüfstelle der externen Krypto-Prüfung (U2-ADR-062, Auflage 1)
   ────────────────────────────────────────────────────────────────────────────
   Vier Stellen machen aus einem Passwort oder Code direkt einen Schlüssel, außerhalb des VdCrypto-Blocks. Für sie gab es
   Rundlauf- und Rot-Proben, aber keinen festen Vektor: ein Rundlauf bleibt grün, wenn Schreiber und Leser denselben Fehler
   teilen. Hier wird jede Stelle gegen einen Wert geprüft, den eine ZWEITE Implementierung gerechnet hat:
     1. QR-Übergabe v1 (Kern schreibt, Lese-App öffnet), gerechnet mit node:crypto;
     2. Antwort v1 mit Einmalpasswort (nur Lese-App), der eingefrorene Umschlag einer ausgelieferten Fassung, mit
        node:crypto gegengerechnet;
     3. JWE PBES2-HS512+A256KW (Kern und Lese-App), der Vektor aus RFC 7520 Abschnitt 5.3;
     4. Wiederherstellungs-Code (Kern), gerechnet mit node:crypto.

   Die Funktionen kommen als Text aus den ausgelieferten Dateien, nicht aus einem Nachbau: geprüft wird der Code, der
   ausgeliefert wird. Der Rot-Beweis kippt je Stelle genau eine Stelle in diesem Text und verlangt, dass der Vektor fällt.

   Alle Testwerte tragen die Probe-Marke (MARKE) oder sind aus ihr abgeleitet; sie stammen nie aus echtem Material, und
   die letzte Probe hält fest, dass die Marke und die Testwerte in keiner versionierten Datei außerhalb von tests/ stehen.
   Die Vektordatei ist mit SHA-256 eingefroren und wird nicht neu erzeugt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { webcrypto } = nodeCrypto;
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const LESEN = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
const FIXTURE_REL = 'tests/fixtures/pruefstellen-vektoren/vektoren.json';
const FIXTURE_SHA256 = '32749d9c5e45cdb5f2ffb80661faf41df9fd9bea75b974ace831336bcf72e972';
const V1_FIXTURE_REL = 'tests/fixtures/antwort-v1-umschlaege.json';
const MARKE = 'NURPROBE' + 'pruef';   // zusammengesetzt, damit diese Probe selbst die Marke nicht als Literal trägt
const VEK = JSON.parse(fs.readFileSync(path.join(REPO, FIXTURE_REL), 'utf8'));

const atob = (b) => Buffer.from(b, 'base64').toString('binary');
const btoa = (s) => Buffer.from(s, 'binary').toString('base64');
const b64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
const b64u = (s) => new Uint8Array(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
const hex = (b) => Buffer.from(b).toString('hex');

/* Eine Top-Level-Funktion bzw. -Konstante als Text aus der Datei. */
function funktionsText(quelle, name) {
  const m = new RegExp('^(async )?function ' + name + '\\(', 'm').exec(quelle);
  assert.ok(m, 'Vorbedingung: ' + name + ' steht in der Datei');
  return quelle.slice(m.index, quelle.indexOf('\n}\n', m.index) + 2);
}
function konstText(quelle, name) {
  const m = new RegExp('^const ' + name + ' = [^\\n]*$', 'm').exec(quelle);
  assert.ok(m, 'Vorbedingung: ' + name + ' steht in der Datei');
  return m[0];
}

/* Baut die genannten Konstanten und Funktionen aus dem Dateitext zu einem Objekt. `optional` sind Konstanten, die erst eine
   spätere Fassung trägt; sie kommen nur mit, wenn die Datei sie hat. `kippen` ersetzt für den Rot-Beweis genau eine
   Zeichenfolge in einer Funktion; sie muss dort vorkommen, sonst wäre der Rot-Beweis leer. */
function bauen(quelle, { konstanten = [], optional = [], funktionen }, kippen) {
  const teile = konstanten.map((k) => konstText(quelle, k))
    .concat(optional.filter((k) => new RegExp('^const ' + k + ' = ', 'm').test(quelle)).map((k) => konstText(quelle, k)));
  for (const f of funktionen) {
    let t = funktionsText(quelle, f);
    if (kippen && kippen.funktion === f) {
      assert.ok(t.includes(kippen.von), 'Vorbedingung Rot-Beweis: „' + kippen.von + '“ steht in ' + f);
      t = t.replace(kippen.von, kippen.nach);
    }
    teile.push(t);
  }
  if (kippen) assert.ok(funktionen.includes(kippen.funktion), 'Vorbedingung Rot-Beweis: ' + kippen.funktion + ' wird gebaut');
  return new Function('crypto', 'TextEncoder', 'TextDecoder', 'atob', 'btoa',
    teile.join('\n') + '\nreturn {' + funktionen.join(', ') + '};')(webcrypto, TextEncoder, TextDecoder, atob, btoa);
}

/* ── Stelle 1: QR-Übergabe v1 ── */
const QR_KERN = { konstanten: ['PBKDF2_ITERATIONS'], funktionen: ['_empfaengerQrSchluesselVerschluesseln'] };
/* Die Lese-App nimmt v1 nach dem QR-Nachtrag zu U2-ADR-156 nur bis zu einem Stichtag an; geprüft wird darum am Tag der
   Vektoren. Fällt der v1-Zweig ganz weg, wird diese Stelle auf einen v2-Vektor umgestellt. */
const QR_PRUEFTAG = Date.UTC(2026, 9, 7);
const QR_LESEN = { konstanten: ['PBKDF2_ITERATIONS'], optional: ['EMPFAENGER_QR_AAD', 'EMPFAENGER_QR_V1_ANNAHME_BIS'],
  funktionen: ['base64ToBytes', '_empfaengerQrSchluesselEntschluesseln', '_empfaengerQrEntschluesseln'] };
async function qrKernChiffrat(kippen) {
  const v = VEK.qrV1;
  const K = bauen(KERN, QR_KERN, kippen);
  const key = await K._empfaengerQrSchluesselVerschluesseln(v.testPasswort, b64(v.salzB64));
  return new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: b64(v.ivB64) }, key,
    new TextEncoder().encode(v.nutzlastJson)));
}
async function qrLesenOeffnen(kippen) {
  return bauen(LESEN, QR_LESEN, kippen)._empfaengerQrEntschluesseln(VEK.qrV1.payloadB64u, VEK.qrV1.testPasswort, QR_PRUEFTAG);
}

/* ── Stelle 2: Antwort v1 mit Einmalpasswort ── */
const V1_LESEN = { konstanten: ['ANG_PBKDF2_ITERATIONEN', 'ANTWORT_FORMAT_ID'],
  funktionen: ['base64ToBytes', '_angDeriveKey', '_antwortAad', '_antwortOeffnen', 'antwortEntschluesselnPasswort'] };
async function v1Oeffnen(kippen) {
  const f = JSON.parse(fs.readFileSync(path.join(REPO, V1_FIXTURE_REL), 'utf8')).einmalpasswort;
  return bauen(LESEN, V1_LESEN, kippen).antwortEntschluesselnPasswort(f.umschlag, f.testPasswort);
}

/* ── Stelle 3: JWE PBES2, RFC 7520 Abschnitt 5.3 wörtlich: Passwort Figur 96, CEK Figur 97, p2s Figur 99, p2c 8192 (5.3.3),
   Encrypted Key Figur 100 (https://www.rfc-editor.org/rfc/rfc7520.txt). Rechenweg aller Stellen im README der Fixture. ── */
const JWE = { konstanten: ['ANTWORT_JWE_PBES2'], funktionen: ['_jweVerbinden', '_jwePbes2Schluessel'] };
async function jweCek(quelle, kippen) {
  const v = VEK.jwePbes2Rfc7520;
  const kek = await bauen(quelle, JWE, kippen)._jwePbes2Schluessel(v.passwort, b64u(v.p2sB64u), v.p2c);
  const cek = await webcrypto.subtle.unwrapKey('raw', b64u(v.encryptedKeyB64u), kek, 'AES-KW',
    { name: 'HMAC', hash: 'SHA-256', length: 256 }, true, ['sign']);
  return new Uint8Array(await webcrypto.subtle.exportKey('raw', cek));
}

/* ── Stelle 4: Wiederherstellungs-Code ── */
const WHC = { konstanten: ['PBKDF2_ITERATIONS', 'HKDF_KEY_LENGTH_BITS', 'WHC_AAD_KENNUNG'],
  funktionen: ['base64ToBytes', 'deriveMasterBits', '_whcCodeBits', '_whcCodeSchluessel', '_whcEinwickeln', '_whcAad', '_whcAuspacken'] };
async function whcHuelle(kippen) {
  const v = VEK.wiederherstellungsCode;
  const K = bauen(KERN, WHC, kippen);
  const codeBits = await K._whcCodeBits(v.testStellen, b64(v.salzB64));
  return K._whcEinwickeln(b64(v.masterBitsB64), codeBits, b64(v.ivB64), K._whcAad(v.depotUUID, v.kryptoVersion));
}

test('[Prüfstellen-Vektoren] die Vektordatei ist eingefroren, und ihre Testwerte tragen die Probe-Marke', () => {
  assert.equal(hex(nodeCrypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, FIXTURE_REL))).digest()), FIXTURE_SHA256,
    'die Vektordatei wurde verändert; sie wird nicht neu erzeugt');
  assert.ok(VEK.qrV1.testPasswort.startsWith(MARKE));
  assert.ok(VEK.wiederherstellungsCode.depotUUID.startsWith(MARKE));
  assert.ok(VEK.testwerte.includes(MARKE));
  assert.equal(VEK.wiederherstellungsCode.testStellen.length, 27);
});

test('[Prüfstellen-Vektoren] die zweite Implementierung (node:crypto) rechnet heute dieselben Werte', () => {
  const q = VEK.qrV1;
  const qk = nodeCrypto.pbkdf2Sync(q.testPasswort, b64(q.salzB64), q.iterationen, 32, 'sha256');
  const c = nodeCrypto.createCipheriv('aes-256-gcm', qk, b64(q.ivB64));
  assert.equal(Buffer.concat([c.update(q.nutzlastJson, 'utf8'), c.final(), c.getAuthTag()]).toString('base64'), q.chiffratMitTagB64);

  const w = VEK.wiederherstellungsCode;
  const wk = nodeCrypto.pbkdf2Sync(w.testStellen, b64(w.salzB64), w.iterationen, 32, 'sha256');
  const wc = nodeCrypto.createCipheriv('aes-256-gcm', wk, b64(w.ivB64));
  wc.setAAD(Buffer.from(JSON.stringify(['vivodepot-wiederherstellung-1', w.depotUUID, w.kryptoVersion]), 'utf8'));
  assert.equal(Buffer.concat([wc.update(b64(w.masterBitsB64)), wc.final(), wc.getAuthTag()]).toString('base64'), w.huelleB64);
  assert.equal(Buffer.from(nodeCrypto.hkdfSync('sha256', b64(w.masterBitsB64), Buffer.alloc(0), w.hkdfInfo, 32)).toString('base64'),
    w.hkdfAbgeleitetB64);

  const j = VEK.jwePbes2Rfc7520;
  const salz = Buffer.concat([Buffer.from('PBES2-HS512+A256KW'), Buffer.from([0]), b64u(j.p2sB64u)]);
  const kek = nodeCrypto.pbkdf2Sync(Buffer.from(j.passwort, 'utf8'), salz, j.p2c, 32, 'sha512');
  const d = nodeCrypto.createDecipheriv('id-aes256-wrap', kek, Buffer.from('A6A6A6A6A6A6A6A6', 'hex'));
  assert.equal(hex(Buffer.concat([d.update(b64u(j.encryptedKeyB64u)), d.final()])), hex(b64u(j.cekB64u)), 'RFC 7520 §5.3 mit OpenSSL');
});

test('[Prüfstellen-Vektoren · Stelle 1] der Kern verschlüsselt die QR-Nutzlast genau zum Vektor', async () => {
  assert.equal(Buffer.from(await qrKernChiffrat()).toString('base64'), VEK.qrV1.chiffratMitTagB64);
});

test('[Prüfstellen-Vektoren · Stelle 1] die Lese-App öffnet die QR-Nutzlast des Vektors', async () => {
  assert.deepEqual(await qrLesenOeffnen(), JSON.parse(VEK.qrV1.nutzlastJson));
});

test('[Prüfstellen-Vektoren · Stelle 2] die Lese-App öffnet den eingefrorenen v1-Umschlag zum gegengerechneten Klartext', async () => {
  const klar = await v1Oeffnen();
  assert.equal(hex(nodeCrypto.createHash('sha256').update(JSON.stringify(klar), 'utf8').digest()),
    VEK.antwortV1Einmalpasswort.klartextSha256);
});

for (const [name, quelle] of [['Kern', KERN], ['Lese-App', LESEN]]) {
  test('[Prüfstellen-Vektoren · Stelle 3] ' + name + ': _jwePbes2Schluessel löst RFC 7520 §5.3 (CEK aus dem Encrypted Key)', async () => {
    assert.equal(hex(await jweCek(quelle)), hex(b64u(VEK.jwePbes2Rfc7520.cekB64u)));
  });
}

test('[Prüfstellen-Vektoren · Stelle 4] der Kern wickelt die Master-Bits genau zur Hülle des Vektors', async () => {
  assert.equal(Buffer.from(await whcHuelle()).toString('base64'), VEK.wiederherstellungsCode.huelleB64);
});

test('[Prüfstellen-Vektoren · Stelle 4] der Kern packt die Hülle des Vektors aus; der HKDF-Schlüssel leitet wie OpenSSL ab', async () => {
  const v = VEK.wiederherstellungsCode;
  const K = bauen(KERN, WHC);
  const key = await K._whcAuspacken({ salz: v.salzB64, iv: v.ivB64, huelle: v.huelleB64 }, v.testStellen, v.depotUUID, v.kryptoVersion);
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode(v.hkdfInfo) }, key, 256);
  assert.equal(Buffer.from(bits).toString('base64'), v.hkdfAbgeleitetB64);
  await assert.rejects(() => K._whcAuspacken({ salz: v.salzB64, iv: v.ivB64, huelle: v.huelleB64 }, v.testStellen, v.depotUUID + 'x', v.kryptoVersion),
    'eine fremde Depot-UUID scheitert am Tag');
});

/* ── Rot-Beweis: je Stelle ein gekipptes Zeichen im ausgelieferten Code, und der Vektor fällt ── */
test('[Prüfstellen-Vektoren · Rot-Beweis] ein gekipptes Zeichen im Code macht jeden Vektor rot', async () => {
  assert.notEqual(Buffer.from(await qrKernChiffrat({ funktion: '_empfaengerQrSchluesselVerschluesseln', von: "'SHA-256'", nach: "'SHA-384'" }))
    .toString('base64'), VEK.qrV1.chiffratMitTagB64, 'Stelle 1 Kern');
  await assert.rejects(() => qrLesenOeffnen({ funktion: '_empfaengerQrSchluesselEntschluesseln', von: "'SHA-256'", nach: "'SHA-384'" }),
    'Stelle 1 Lese-App');
  await assert.rejects(() => v1Oeffnen({ funktion: '_antwortAad', von: "join('|')", nach: "join('/')" }), 'Stelle 2');
  for (const [name, quelle] of [['Kern', KERN], ['Lese-App', LESEN]]) {
    await assert.rejects(() => jweCek(quelle, { funktion: '_jwePbes2Schluessel', von: 'new Uint8Array([0])', nach: 'new Uint8Array([1])' }),
      'Stelle 3 ' + name);
  }
  assert.notEqual(Buffer.from(await whcHuelle({ funktion: 'deriveMasterBits', von: "'SHA-256'", nach: "'SHA-384'" })).toString('base64'),
    VEK.wiederherstellungsCode.huelleB64, 'Stelle 4');
});

/* ── Klassenprobe: Marke und Testwerte bleiben in tests/ ── */
function fundeAusserhalbTests(dateien, lesen, werte) {
  const funde = [];
  for (const d of dateien) {
    if (d.startsWith('tests/')) continue;
    let t; try { t = lesen(d); } catch (_) { continue; }
    if (werte.some((w) => t.includes(w))) funde.push(d);
  }
  return funde;
}
const TESTWERTE = [MARKE, VEK.qrV1.testPasswort, VEK.wiederherstellungsCode.testStellen, VEK.wiederherstellungsCode.huelleB64];

test('[Prüfstellen-Vektoren] Probe-Marke und Testwerte stehen in keiner versionierten Datei außerhalb von tests/', () => {
  const dateien = execFileSync('git', ['ls-files', '-z'], { cwd: REPO, env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8').split('\0').filter(Boolean);
  assert.ok(dateien.includes('vivodepot.html'), 'Testvoraussetzung: der Kern ist versioniert');
  assert.deepEqual(fundeAusserhalbTests(dateien, (d) => fs.readFileSync(path.join(REPO, d), 'latin1'), TESTWERTE), []);
});

test('[Prüfstellen-Vektoren · Rot-Beweis] ein Produkt mit einem Testwert wird gefunden, tests/ nicht', () => {
  const welt = { 'vivodepot.html': '… ' + VEK.qrV1.testPasswort + ' …', 'docs/x.md': MARKE, 'tests/y.js': MARKE, 'tools/z.js': 'nichts' };
  assert.deepEqual(fundeAusserhalbTests(Object.keys(welt), (d) => welt[d], TESTWERTE), ['vivodepot.html', 'docs/x.md']);
});
