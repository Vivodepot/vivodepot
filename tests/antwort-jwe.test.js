'use strict';
/* U2-ADR-449 — die Antwort auf eine Anfrage als JWE (RFC 7516 Compact, ECDH-ES bzw. PBES2-HS512+A256KW, A256GCM).
   Der Kern schreibt, die Lese-App öffnet; beide tragen denselben ANTWORT-JWE-BLOCK zeichengleich (Spiegel-Probe unten).
   Konformität ohne neue Abhängigkeit: die Concat KDF gegen den Vektor aus RFC 7518 Anhang C. Gegen die Bibliothek `jose`
   wurde am 29.09.2026 in beide Richtungen gemessen (Werkzeug außerhalb der Suite, s. ADR); hier läuft nur, was ohne Netz
   und ohne Fremdmodul geht.
   GERÜST-TEST: die Spiegel-Probe und ihr Rot-Beweis lesen den QUELLTEXT beider Dateien. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const WURZEL = path.join(__dirname, '..');
const PW_DEPOT = 'Antwort-JWE-Probe-2026!';
const EINMAL = 'Einmal-Probe-7fQ2-kP9x-Lm4Z';
const VORGANG = 'AUF-2026-0929';

async function empfangsPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function anfrage(antwort) {
  return {
    modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Heim', zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: VORGANG,
    gestelltAm: '2026-09-29', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }],
    antwort,
  };
}
async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW_DEPOT);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  return V;
}
const kopfVon = (jwe) => JSON.parse(Buffer.from(jwe.split('.')[0], 'base64url').toString('utf8'));
function mitKopf(jwe, aendern) {
  const t = jwe.split('.');
  const k = kopfVon(jwe);
  aendern(k);
  t[0] = Buffer.from(JSON.stringify(k)).toString('base64url');
  return t.join('.');
}

const { jweLesbarerTeil } = require('./helfer/jwe-lesbar.js');

test('[Antwort·JWE] Schlüsselpaar: der Kern schreibt eine JWE, die Lese-App öffnet sie zum selben Datensatz', async () => {
  const V = await depot();
  const paar = await empfangsPaar();
  const a = anfrage({ art: 'schluesselpaar', an: 'aufnahme@probe.example', publicKeyJwk: paar.pub });
  const ds = V.anfrageAntwortDatensatz(a, { sensibel: false });
  const jwe = await V.antwortVerschluesseln(ds, a, {});
  assert.equal(typeof jwe, 'string');
  assert.equal(jwe.split('.').length, 5);
  const k = kopfVon(jwe);
  assert.equal(k.alg, 'ECDH-ES');
  assert.equal(k.enc, 'A256GCM');
  assert.equal(k.typ, 'vivodepot-antwort+jwe');
  assert.equal(Buffer.from(k.apv, 'base64url').toString(), VORGANG, 'der Vorgang ist in die Schlüsselableitung gebunden');
  assert.equal(jwe.split('.')[1], '', 'ECDH-ES direkt: kein verpackter Schlüssel');
  const L = ladeLesen().V;
  const offen = await L.antwortJweOeffnen(jwe, { privateJwk: paar.priv });
  assert.deepEqual(JSON.parse(offen.klartext), JSON.parse(JSON.stringify(ds)));
});

test('[Antwort·JWE] Einmalpasswort: PBES2-HS512+A256KW mit festem p2c, die Lese-App öffnet', async () => {
  const V = await depot();
  const a = anfrage({ art: 'einmalpasswort', an: 'aufnahme@probe.example' });
  const ds = V.anfrageAntwortDatensatz(a, { sensibel: false });
  const jwe = await V.antwortVerschluesseln(ds, a, { passwort: EINMAL });
  const k = kopfVon(jwe);
  assert.equal(k.alg, 'PBES2-HS512+A256KW');
  assert.equal(k.p2c, 600000);
  const L = ladeLesen().V;
  assert.deepEqual(JSON.parse((await L.antwortJweOeffnen(jwe, { passwort: EINMAL })).klartext), JSON.parse(JSON.stringify(ds)));
  await assert.rejects(L.antwortJweOeffnen(jwe, { passwort: 'falsch' }), 'ein falsches Passwort öffnet nicht');
});

test('[Antwort·JWE·Konformität] die Concat KDF ergibt den Schlüssel aus RFC 7518 Anhang C', async () => {
  const L = ladeLesen().V;
  const alice = { kty: 'EC', crv: 'P-256', x: 'gI0GAILBdu7T53akrFmMyGcsF3n5dO7MmwNBHKW5SV0', y: 'SLW_xSffzlPWrHEVI30DHM_4egVwt3NQqeUD7nMFpps', d: '0_NxaRPUMQoAJt50Gz8YiTr8gRTwyEaCumd-MToTmIo' };
  const bob = { kty: 'EC', crv: 'P-256', x: 'weNJy2HscCSM6AEDTDg04biOvhFhyyWvOHQfeF_PxMQ', y: 'e8lnCO-AlStT-NJVX-crhB7QRYhiix03illJOVAOyck' };
  const priv = await webcrypto.subtle.importKey('jwk', alice, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const pub = await webcrypto.subtle.importKey('jwk', bob, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const z = new Uint8Array(await webcrypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256));
  const k = await L._jweConcatKdf(z, 'A128GCM', new TextEncoder().encode('Alice'), new TextEncoder().encode('Bob'), 128);
  assert.equal(Buffer.from(k).toString('base64url'), 'VqqN6vgjbSBcIijNcacQGg');
});

test('[Antwort·JWE·Rot-Beweis] ein umetikettierter Vorgang, ein geänderter Kopf, ein gekipptes Byte: nichts öffnet sich', async () => {
  const V = await depot();
  const paar = await empfangsPaar();
  const a = anfrage({ art: 'schluesselpaar', an: 'x@probe.example', publicKeyJwk: paar.pub });
  const jwe = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(a, { sensibel: false }), a, {});
  const L = ladeLesen().V;
  const anderer = mitKopf(jwe, (k) => { k.vorgang = 'ANDERER'; k.apv = Buffer.from('ANDERER').toString('base64url'); });
  await assert.rejects(L.antwortJweOeffnen(anderer, { privateJwk: paar.priv }), 'Vorgang getauscht');
  const nurKopf = mitKopf(jwe, (k) => { k.anbieter = 'fremd'; });
  await assert.rejects(L.antwortJweOeffnen(nurKopf, { privateJwk: paar.priv }), 'Kopf geändert, AAD passt nicht');
  const t = jwe.split('.');
  const ct = Buffer.from(t[3], 'base64url'); ct[0] ^= 1; t[3] = ct.toString('base64url');
  await assert.rejects(L.antwortJweOeffnen(t.join('.'), { privateJwk: paar.priv }), 'Chiffrat gekippt');
  assert.ok(await L.antwortJweOeffnen(jwe, { privateJwk: paar.priv }), 'Gegenprobe: unverändert öffnet');
});

test('[Antwort·JWE·Rot-Beweis] ein anderes p2c und ein zip-Kopf werden abgelehnt, bevor gerechnet wird', async () => {
  const V = await depot();
  const a = anfrage({ art: 'einmalpasswort', an: 'x@probe.example' });
  const jwe = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(a, { sensibel: false }), a, { passwort: EINMAL });
  const L = ladeLesen().V;
  await assert.rejects(L.antwortJweOeffnen(mitKopf(jwe, (k) => { k.p2c = 2000000; }), { passwort: EINMAL }), /jwe-p2c/);
  await assert.rejects(L.antwortJweOeffnen(mitKopf(jwe, (k) => { k.zip = 'DEF'; }), { passwort: EINMAL }), /jwe-zip/);
});

test('[Antwort·JWE] jede Antwort trägt einen eigenen flüchtigen Schlüssel, und der Kopf trägt keinen Feldwert', async () => {
  const V = await depot();
  const paar = await empfangsPaar();
  const a = anfrage({ art: 'schluesselpaar', an: 'x@probe.example', publicKeyJwk: paar.pub });
  const ds = V.anfrageAntwortDatensatz(a, { sensibel: false });
  const j1 = await V.antwortVerschluesseln(ds, a, {});
  const j2 = await V.antwortVerschluesseln(ds, a, {});
  assert.notEqual(kopfVon(j1).epk.x, kopfVon(j2).epk.x);
  assert.equal(jweLesbarerTeil(j1).includes('Hedwig'), false, 'kein Feldwert im dekodierten Kopf, auch nicht in apu/apv');
  assert.equal(j1.includes('Hedwig'), false);
});

test('[Antwort·JWE·Stufen] Klartexte verschiedener Länge landen auf einer Stufe oder ein Zeichen darunter', async () => {
  const K = ladeKern().V;
  const paar = await empfangsPaar();
  const stufen = ladeLesen().V.ANTWORT_JWE_STUFEN;
  for (const n of [10, 300, 900, 1700, 2600, 4200]) {
    const t = await K.antwortJweSchluessel('x'.repeat(n), paar.pub, { vorgang: 'V' });
    const s = stufen.find((x) => x >= t.length);
    assert.ok(s - t.length <= 1, n + ' Zeichen Klartext → ' + t.length + ', Stufe ' + s);
  }
});

test('[Antwort·JWE] die Lese-App erkennt eine JWE-Antwort als Datei-Text und über die QR-Serie', async () => {
  const V = await depot();
  const paar = await empfangsPaar();
  const a = anfrage({ art: 'schluesselpaar', an: 'x@probe.example', publicKeyJwk: paar.pub });
  const jwe = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(a, { sensibel: false }), a, {});
  const L = ladeLesen().V;
  const u = L.antwortJweAlsUmschlag(jwe + '\n');
  assert.deepEqual({ verfahren: u.verfahren, vorgang: u.vorgang }, { verfahren: 'schluesselpaar', vorgang: VORGANG });
  const teile = V.qrTeilePacken(jwe, 300);
  assert.ok(teile.length >= 2);
  const z = L.qrTeileZusammensetzen(teile.map((t) => t.rahmen).reverse());
  assert.equal(z.fertig, true);
  assert.ok(L.antwortJweAlsUmschlag(z.text));
  assert.equal(L.antwortJweAlsUmschlag('{"dateiTyp":"vivodepot-antwort"}'), null, 'Gegenprobe: ein JSON ist keine JWE');
});

/* ── Spiegel: der Block steht in Kern und Lese-App zeichengleich ── */
const BLOCK_ANFANG = '/* ══ ANTWORT-JWE-BLOCK (U2-ADR-449)';
const BLOCK_ENDE = '/* ══ ENDE ANTWORT-JWE-BLOCK ══ */';
function block(text) {
  const a = text.indexOf(BLOCK_ANFANG);
  const e = text.indexOf(BLOCK_ENDE);
  if (a < 0 || e < a || text.indexOf(BLOCK_ANFANG, a + 1) >= 0) return null;
  return text.slice(a, e + BLOCK_ENDE.length);
}
test('[Antwort·JWE·Spiegel] der Block steht in Kern und Lese-App genau einmal und zeichengleich', () => {
  const k = block(fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8'));
  const l = block(fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8'));
  assert.ok(k && l, 'der Block steht in beiden Dateien genau einmal');
  assert.equal(k, l);
});
test('[Antwort·JWE·Spiegel·Rot-Beweis] eine geänderte Zeile in einer Kopie wird bemerkt', () => {
  const k = block(fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8'));
  const l = block(fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8').replace('const ANTWORT_JWE_P2C = 600000;', 'const ANTWORT_JWE_P2C = 10000;'));
  assert.notEqual(k, l);
});
test('[Antwort·JWE·Fläche] der Kern schreibt nur, die Lese-App öffnet nur: jede Datei trägt allein ihre Hälfte', () => {
  const kern = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
  const lesen = fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8');
  assert.equal(/async function antwortJweOeffnen\(/.test(kern), false, 'kein Öffnen im Kern — Krypto-Fläche ohne Zweck');
  assert.equal(/async function antwortJweSchluessel\(|async function antwortJwePasswort\(/.test(lesen), false, 'kein Schreiben in der Lese-App');
  assert.equal(/async function antwortJweSchluessel\(/.test(kern) && /async function antwortJweOeffnen\(/.test(lesen), true);
});

/* Die Fehlercodes `jwe-*` sind für Proben und Protokoll, nie für die Person: jeder Fehlschlag beim Schreiben erreicht sie als
   Satz aus dem Textsatz (STRINGS.antwortFehlgeschlagen), nie als roher Code. Die Lese-Seite hält T-CROSS-18 im Browser fest. */
test('[Antwort·JWE·Rohwert] ein Fehlschlag beim Schreiben zeigt der Person einen Satz aus dem Textsatz, keinen Code', async () => {
  const V = await depot();
  const gesehen = [];
  V.ui.toast = (text, art) => gesehen.push({ text: String(text), art });
  const a = anfrage({ art: 'schluesselpaar', an: 'x@probe.example', publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'kaputt', y: 'kaputt' } });
  const eintrag = { anfrage: a, anbieterId: null };
  await V._anfrageAntwortSchreiben(eintrag, V.anfrageAntwortDatensatz(a, { sensibel: false }), {});
  assert.ok(gesehen.length >= 1, 'die Person erfährt, dass es nicht ging');
  const letzte = gesehen[gesehen.length - 1];
  assert.equal(letzte.text, V.STRINGS.antwortFehlgeschlagen);
  assert.equal(/jwe-|Error/.test(letzte.text), false);
});
test('[Antwort·JWE·Rohwert·Rot-Beweis] zeigt der Fehlerweg die rohe Meldung, fängt die Probe es', async () => {
  const os = require('node:os');
  const KERN = path.join(WURZEL, 'vivodepot.html');
  const original = fs.readFileSync(KERN, 'utf8');
  const anker = "    if (ui && ui.toast) ui.toast(STRINGS.antwortFehlgeschlagen, 'warn');";
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Fehlerweg steht genau einmal im Kern');
  const tmp = path.join(os.tmpdir(), 'antwort-jwe-rohwert-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, "    if (ui && ui.toast) ui.toast(String(e && e.message), 'warn');"));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern({ backen: true });
    await V.depotAnlegen(PW_DEPOT);
    V.akteurSelbstErklaeren('Hedwig Brandt');
    const gesehen = [];
    V.ui.toast = (text) => gesehen.push(String(text));
    const a = anfrage({ art: 'schluesselpaar', an: 'x@probe.example', publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'kaputt', y: 'kaputt' } });
    await V._anfrageAntwortSchreiben({ anfrage: a, anbieterId: null }, V.anfrageAntwortDatensatz(a, { sensibel: false }), {});
    assert.notEqual(gesehen[gesehen.length - 1], V.STRINGS.antwortFehlgeschlagen, 'genau der Rohwert: die Person sähe eine Technik-Meldung');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
});

/* Nicht extrahierbar ist jeder Schlüssel, den der Block erzeugt oder importiert — mit genau einer Ausnahme: der CEK im
   PBES2-Weg, den `wrapKey` verpacken muss. Gelesen wird der Quelltext der beiden JWE-Teile je Datei. */
function jweTeile(text) {
  const teile = [];
  for (const [a, e] of [['/* ══ ANTWORT-JWE-BLOCK (U2-ADR-449)', '/* ══ ENDE ANTWORT-JWE-BLOCK ══ */'],
    ['/* ══ ANTWORT-JWE SCHREIBEN', '/* ══ ENDE ANTWORT-JWE SCHREIBEN ══ */'], ['/* ══ ANTWORT-JWE ÖFFNEN', '/* ══ ENDE ANTWORT-JWE ÖFFNEN ══ */']]) {
    const i = text.indexOf(a);
    if (i >= 0) teile.push(text.slice(i, text.indexOf(e, i)));
  }
  return teile.join('\n');
}
function extrahierbar(quelltext) {
  const raus = [];
  const re = /(importKey|deriveKey|generateKey|unwrapKey)\(([\s\S]*?)\)\s*[;)]/g;
  let m;
  while ((m = re.exec(quelltext))) {
    const arg = m[2].replace(/\s+/g, ' ');
    if (/,\s*true\s*,\s*\[/.test(arg)) raus.push(m[1] + '(' + arg.slice(0, 60) + '…');
  }
  return raus;
}
test('[Antwort·JWE·Schlüssel] nur der CEK im PBES2-Weg ist extrahierbar, jeder andere Schlüssel nicht', () => {
  const kern = extrahierbar(jweTeile(fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8')));
  const lesen = extrahierbar(jweTeile(fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8')));
  assert.equal(kern.length, 1, 'genau eine Ausnahme im Kern: ' + kern.join(' | '));
  assert.match(kern[0], /^generateKey\(\{ name: 'AES-GCM', length: 256 \}/);
  assert.deepEqual(lesen, [], 'die Lese-App erzeugt keinen extrahierbaren Schlüssel');
});
test('[Antwort·JWE·Schlüssel·Rot-Beweis] ein weiterer extrahierbarer Schlüssel wird gefunden', () => {
  const kern = jweTeile(fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8'))
    .replace("generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])", "generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])");
  assert.equal(extrahierbar(kern).length, 2);
});
