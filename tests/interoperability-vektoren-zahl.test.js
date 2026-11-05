'use strict';
/* INTEROPERABILITY.md §2 nennt je fremdem Maßstab eine Zahl von Vektoren oder Fällen. Diese Probe zählt die Vektordateien unter
   tests/konformitaet/vectors/ selbst und verlangt dieselben Zahlen im Text. Eine geänderte Vektordatei ohne Textänderung ist rot,
   ebenso eine umformulierte Zeile: jedes Muster muss genau einmal treffen. Schnell, ohne Browser.
   Gehalten werden die Zeilen HMAC-SHA-256, PBKDF2-HMAC-SHA-256, ECDSA (P-256, P-521) und x509-limbo (Umfang und die Fälle, die
   der Leser annimmt, je in einer Liste geführt, damit die Zeile nicht als „besteht alle“ liest), dazu der Weg zum Nachsehen
   (die Probe-Dateien) und der Satz, dass ECDSA und X.509 in der vollen Suite laufen, nicht im Konformitäts-Gate. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const REPO = path.join(__dirname, '..');
const VEK = path.join(REPO, 'tests', 'konformitaet', 'vectors');
const DOK = 'INTEROPERABILITY.md';

const zaehle = (liste) => liste.reduce((m, v) => { m[v.result] = (m[v.result] || 0) + 1; m.alle++; return m; }, { alle: 0 });
const json = (rel) => JSON.parse(fs.readFileSync(path.join(VEK, rel), 'utf8'));
const ecdsa = (datei) => zaehle(json(datei).testGroups.flatMap((g) => g.tests));

async function messen() {
  const modul = async (datei, name) => (await import(pathToFileURL(path.join(VEK, datei)).href))[name];
  const limbo = json('x509-limbo/umfang.json').faelle;
  const eingeteilt = ['umfang.json', 'ausserhalb.json', 'nur-gelistet.json']
    .reduce((n, d) => n + json('x509-limbo/' + d).faelle.length, 0);
  return {
    hmac: zaehle(await modul('wycheproof_hmac_sha256_vectors.mjs', 'wycheproofHmacSha256Vectors')),
    pbkdf2: zaehle(await modul('wycheproof_pbkdf2_hmacsha256_vectors.mjs', 'wycheproofPbkdf2HmacSha256Vectors')),
    p256: ecdsa('ecdsa_secp256r1_sha256_test.json'),
    p521: ecdsa('ecdsa_secp521r1_sha512_test.json'),
    limbo: {
      umfang: limbo.length,
      success: limbo.filter((f) => f.erwartet === 'SUCCESS').length,
      failure: limbo.filter((f) => f.erwartet === 'FAILURE').length,
      alle: eingeteilt,
      angenommen: ['bewusst-anders.json', 'erwartet-angenommen.json', 'befund-offen.json']
        .map((d) => json('x509-limbo/' + d).faelle.length),
    },
  };
}

const zahl = (s) => Number(String(s).replace(/\s/g, ''));

/* Je Zeile ein Muster und die Zahlen, die es tragen muss. */
const ZEILEN = [
  { name: 'HMAC', muster: /\| HMAC-SHA-256 \| Wycheproof \| (\d+) Vektoren, (\d+) gültig, (\d+) ungültig \|/g,
    soll: (m) => [m.hmac.alle, m.hmac.valid || 0, m.hmac.invalid || 0] },
  { name: 'PBKDF2', muster: /\| PBKDF2-HMAC-SHA-256 \| Wycheproof \| (\d+) Vektoren, alle gültig \|/g,
    soll: (m) => [m.pbkdf2.alle], zusatz: (m) => (m.pbkdf2.valid === m.pbkdf2.alle ? null : 'PBKDF2: nicht alle Vektoren gültig') },
  { name: 'ECDSA', muster: /\| ECDSA-Signaturen im X\.509-Leser \| Wycheproof \| P-256\/SHA-256: (\d+) Vektoren, (\d+) gültig, (\d+) ungültig; P-521\/SHA-512: (\d+) Vektoren, (\d+) gültig, (\d+) ungültig \|/g,
    soll: (m) => [m.p256.alle, m.p256.valid, m.p256.invalid, m.p521.alle, m.p521.valid, m.p521.invalid] },
  { name: 'x509-limbo', muster: /\| X\.509-Pfadprüfung \| x509-limbo \(C2SP\) \| (\d+) von ([\d ]+) Fällen im Umfang des Lesers, (\d+) SUCCESS, (\d+) FAILURE; (\d+) der FAILURE-Fälle nimmt der Leser an, jeder in einer Liste geführt: (\d+) bewusst anders, (\d+) nach einer entschiedenen eigenen Regel, (\d+) als offener Befund geduldet \|/g,
    soll: (m) => [m.limbo.umfang, m.limbo.alle, m.limbo.success, m.limbo.failure,
      m.limbo.angenommen.reduce((a, b) => a + b, 0), ...m.limbo.angenommen] },
];

const WEGE = ['tests/konformitaet/krypto-vektoren.mjs', 'tests/x509-leser.test.js', 'tests/x509-limbo.test.js',
  'tests/konformitaet/vectors/x509-limbo/README.md'];

function befunde(text, m) {
  const b = [];
  for (const z of ZEILEN) {
    const treffer = [...text.matchAll(z.muster)];
    if (treffer.length !== 1) { b.push(`${z.name}: Muster trifft ${treffer.length}-mal statt einmal`); continue; }
    const ist = treffer[0].slice(1).map(zahl);
    const soll = z.soll(m);
    if (JSON.stringify(ist) !== JSON.stringify(soll)) b.push(`${z.name}: Text ${ist.join('/')}, Vektordateien ${soll.join('/')}`);
    const extra = z.zusatz && z.zusatz(m);
    if (extra) b.push(extra);
  }
  for (const w of WEGE) if (!text.includes('`' + w + '`')) b.push(`Weg fehlt: ${w}`);
  if (!/ECDSA und die X\.509-Pfadprüfung in der vollen\s+Suite/.test(text)) b.push('Einleitung: ECDSA/X.509 in der vollen Suite fehlt');
  if (/Alle Läufe hängen im\s+Konformitäts-Gate/.test(text)) b.push('Einleitung: „Alle Läufe hängen im Konformitäts-Gate“ stimmt nicht mehr');
  return b;
}

const TEXT = fs.readFileSync(path.join(REPO, DOK), 'utf8');

test('[Interop·Vektoren] §2 nennt die Zahlen der Vektordateien und die Probe-Dateien als Weg', async () => {
  const m = await messen();
  assert.ok(m.hmac.alle > 0 && m.p256.alle > 0 && m.limbo.umfang > 0, 'Vektordateien gelesen');
  assert.deepEqual(befunde(TEXT, m), []);
});

test('[Interop·Vektoren·Rot-Beweis] eine geänderte Vektorzahl, ein fehlender Weg und der alte Einleitungssatz fallen', async () => {
  const m = await messen();
  const mehr = { ...m, hmac: { ...m.hmac, alle: m.hmac.alle + 1, invalid: m.hmac.invalid + 1 } };
  assert.ok(befunde(TEXT, mehr).some((f) => /^HMAC: Text/.test(f)), 'Vektordatei wächst, Text nicht');
  const limboAnders = TEXT.replace(/(\| X\.509-Pfadprüfung \| x509-limbo \(C2SP\) \| )\d+/, '$1' + (m.limbo.umfang + 1));
  assert.ok(befunde(limboAnders, m).some((f) => /^x509-limbo: Text/.test(f)), 'Zahl im Text geändert');
  assert.ok(befunde(TEXT.replace('`tests/x509-limbo.test.js`', 'die limbo-Probe'), m).some((f) => /Weg fehlt/.test(f)), 'Weg');
  const alt = TEXT.replace(/Die Läufe hängen im\s+Konformitäts-Gate/, 'Alle Läufe hängen im\nKonformitäts-Gate');
  assert.ok(befunde(alt, m).some((f) => /stimmt nicht mehr/.test(f)), 'alter Einleitungssatz');
  assert.ok(befunde(TEXT.replace('| HMAC-SHA-256 | Wycheproof |', '| HMAC SHA-256 | Wycheproof |'), m)
    .some((f) => /HMAC: Muster trifft 0-mal/.test(f)), 'umformulierte Zeile');
});
