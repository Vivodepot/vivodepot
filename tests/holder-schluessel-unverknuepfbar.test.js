'use strict';
/* Kein gleichbleibender Holder-Schlüssel über Stellen hinweg (Nachtrag U2-ADR-457 und U2-ADR-501, 02.11.2026).
   Schutzziel: Datenschutz durch Technikgestaltung (Art. 25 DSGVO), Gewährleistungsziel Nichtverkettung (SDM V3.1, C1.5). Aus den kryptographischen Teilen zweier
   Ausgaben an verschiedene Stellen folgt nicht, dass sie von derselben Person stammen.
     P1  zwei SD-JWT-VC-Ausgaben derselben Sitzung tragen verschiedene Schlüssel (cnf.jwk, kid);
     P2  je Ausgabe: kid = Thumbprint(jwk) = Thumbprint(cnf.jwk); die Signatur prüft unabhängig gegen den eingebetteten jwk; der eigene
         Import nimmt sie an;
     P3  der Zufall je Ausgabe wird nach dem Signieren überschrieben; kein generateKey und kein exportKey für Ed25519;
     P4  kein Ausgabeweg ruft den Schlüssel je Depot (_halterSignaturHolen); der Weg der Präsentation bleibt beim Schlüssel je Stelle;
     P5  zwei unsignierte Anfragen mit derselben anbieterId ergeben verschiedene Schlüssel, dieselbe Anfrage denselben;
     P6  signiert: bleibt byte-gleich (Testvektor U2-ADR-501 Punkt 28);
     P7  eine alte Ausgabe mit dem Schlüssel je Depot prüft weiter.
   Klassenwächter: jede Stelle, die einen Ed25519-Privatschlüssel importiert, steht mit ihrer Bindung in BINDUNG; eine Bindung „je Depot“
   hat keinen Aufrufer außerhalb ihrer Kette. Rot-Beweise: P1 und P5 gegen eine Kernkopie mit dem alten Weg. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const nodeCrypto = require('node:crypto');
const { ladeKern, webcrypto } = require('./load-kern.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const KERN = fs.readFileSync(KERN_PFAD, 'utf8');
const PW = 'holder-schluessel-probe-lang-genug-2026';
const OEFFENTLICH_AUS_SEED = (seed) => require('./helfer/noble-ed25519.js').harnessBibliothek().getPublicKey(seed);
const s = webcrypto.subtle;
const b64uJson = (t) => JSON.parse(Buffer.from(t, 'base64url').toString('utf8'));
const NAMEN = ['sdjwtSchluesselJeAusgabe', '_ed25519SchluesselAusSeed', '_halterSignaturHolen', 'antwortSignieren', 'antwortSchluesselJeStelle',
  'antwortSchluesselInfo'];

async function depot(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  V.sektorFeldSetzen('identity', 'birthDate', '1964-08-12');
  return V;
}
const kopfUndNutzlast = (ser) => { const [h, p] = ser.split('~')[0].split('.'); return { kopf: b64uJson(h), nutzlast: b64uJson(p) }; };
async function unabhaengigPruefen(ser) {
  const [h, p, sig] = ser.split('~')[0].split('.');
  const kopf = b64uJson(h);
  const key = await s.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: kopf.jwk.x }, { name: 'Ed25519' }, false, ['verify']);
  return s.verify({ name: 'Ed25519' }, key, new Uint8Array(Buffer.from(sig, 'base64url')), new TextEncoder().encode(h + '.' + p));
}
function anfrage(extra) {
  return Object.assign({
    modulTyp: 'anfrage', anfrageVersion: 1, von: 'Verein Beispiel', anbieterId: 'gleich/kennung', zweck: 'Mitgliedschaft', grundlage: 'Satzung',
    vorgang: 'V-1', gestelltAm: '2026-11-02', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }], antwort: { art: 'datei' },
  }, extra || {});
}
const jwsKopf = (jws) => b64uJson(jws.split('.')[0]);

function kernKopie(ersetzen) {
  let html = KERN;
  for (const [alt, neu] of ersetzen) { assert.equal(html.split(alt).length, 2, 'Vorbedingung: genau einmal: ' + alt); html = html.replace(alt, neu); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-holder-schluessel-rot-'));
  const p = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(p, html);
  return { p, weg: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

/* ══ A · SD-JWT-VC: ein Schlüssel je Ausgabe ══ */

test('[Holder·je Ausgabe P1] zwei Ausgaben derselben Sitzung tragen verschiedene Schlüssel', async () => {
  const { V } = ladeKern();
  await depot(V);
  const a = kopfUndNutzlast((await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}))).serialisierung);
  const b = kopfUndNutzlast((await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}))).serialisierung);
  assert.notEqual(a.kopf.jwk.x, b.kopf.jwk.x, 'jwk im Kopf');
  assert.notEqual(a.kopf.kid, b.kopf.kid, 'kid');
  assert.notEqual(a.nutzlast.cnf.jwk.x, b.nutzlast.cnf.jwk.x, 'cnf.jwk');
});

test('[Holder·je Ausgabe P2] kid, jwk und cnf passen zueinander; die Signatur prüft unabhängig; der eigene Import nimmt sie an', async () => {
  const { V } = ladeKern();
  await depot(V);
  const ser = (await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}))).serialisierung;
  const { kopf, nutzlast } = kopfUndNutzlast(ser);
  assert.equal(kopf.kid, await V.jwkThumbprintOkp(kopf.jwk));
  assert.deepEqual(nutzlast.cnf, { jwk: kopf.jwk });
  assert.equal(await unabhaengigPruefen(ser), true);
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser);
  assert.ok(!plan.ungueltig, plan.grund);
});

test('[Holder·je Ausgabe P3] der Zufall wird überschrieben; privat nicht extrahierbar; kein generateKey/exportKey für Ed25519', async () => {
  const { V } = ladeKern({ zusatzBindungen: NAMEN });
  await depot(V);
  const zufall = new Uint8Array(32).fill(7);
  const k = await V.__zusatz.sdjwtSchluesselJeAusgabe(() => zufall);
  assert.equal(k.schluessel.extractable, false);
  assert.ok(zufall.every((b) => b === 0), 'der Zufall ist nach dem Signieren überschrieben');
  // Unabhängig nachgerechnet: derselbe Seed ergibt mit node:crypto denselben öffentlichen Schlüssel.
  const pk8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.alloc(32, 7)]);
  const x = nodeCrypto.createPublicKey(nodeCrypto.createPrivateKey({ key: pk8, format: 'der', type: 'pkcs8' })).export({ format: 'jwk' }).x;
  assert.equal(k.jwk.x, x);
  assert.ok(!/generateKey\(\s*\{\s*name:\s*'Ed25519'/.test(KERN), 'kein generateKey für Ed25519 (exportKey zählt tools/krypto-aufrufer-pruefen.js)');
});

test('[Holder·je Ausgabe P4] kein Ausgabeweg ruft den Schlüssel je Depot; der SD-JWT-Weg nimmt den Schlüssel je Ausgabe', () => {
  const ohneKommentar = KERN.split('/** @license')[0].replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
  assert.deepEqual(wegZumDepotSchluessel(ohneKommentar), [], 'kein Weg zum Schlüssel je Depot');
  assert.match(ohneKommentar, /opt\.signatur\(\) : sdjwtSchluesselJeAusgabe\(\)\)/, 'der SD-JWT-Weg nimmt den Schlüssel je Ausgabe');
  // Beide Ausgabewege (Registry-Export und EUDI-Wallet-Dialog) gehen ohne eigenen Schlüssel durch eudiwSdJwtVcSerialisieren.
  const ohneSignatur = ohneKommentar.match(/eudiwSdJwtVcSerialisieren\((?:roh|vc)\)/g) || [];
  assert.equal(ohneSignatur.length, 2, 'Registry-Export und EUDI-Dialog');
  const mitSignatur = ohneKommentar.match(/eudiwSdJwtVcSerialisieren\([^)]*\{ signatur: [^}]*\}\)/g) || [];
  assert.equal(mitSignatur.length, 1, 'nur die Präsentation reicht einen eigenen Schlüssel (je Stelle)');
  assert.match(mitSignatur[0], /signatur: \(\) => Promise\.resolve\(halter\)/);
});

/* ══ B · unsignierte Anfrage: ein Schlüssel je Anfrage ══ */

test('[Holder·je Anfrage P5] dieselbe anbieterId, verschiedene Anfragen → verschiedene Schlüssel; dieselbe Anfrage → derselbe', async () => {
  const { V } = ladeKern({ zusatzBindungen: NAMEN });
  await depot(V);
  const sig = (a) => V.__zusatz.antwortSignieren({ felder: {} }, a, null, { jetzt: '2026-11-02T12:00:00Z' });
  const a1 = jwsKopf(await sig(anfrage({ zweck: 'Mitgliedschaft' })));
  const a2 = jwsKopf(await sig(anfrage({ zweck: 'Mitgliedschaft' })));
  const b = jwsKopf(await sig(anfrage({ zweck: 'Spende', von: 'Andere Stelle' })));
  assert.equal(a1.jwk.x, a2.jwk.x, 'dieselbe Anfrage, derselbe Schlüssel');
  assert.notEqual(a1.jwk.x, b.jwk.x, 'zwei Stellen mit derselben behaupteten Kennung bekommen zwei Schlüssel');
  assert.throws(() => V.__zusatz.antwortSchluesselInfo('antwort', 'unsigniert:0006:gleich'), /zusatz/, 'unsigniert nur mit Abdruck');
  assert.throws(() => V.__zusatz.antwortSchluesselInfo('antwort', 'signiert:anbieter:0006:gleich', new Uint8Array(32)), /zusatz/, 'signiert ohne Abdruck');
});

test('[Holder·je Stelle P6] signiert: bleibt byte-gleich (Testvektor U2-ADR-501 Punkt 28)', async () => {
  const { V } = ladeKern({ zusatzBindungen: NAMEN });
  const info = Buffer.from(V.__zusatz.antwortSchluesselInfo('antwort', 'signiert:anbieter:0014:heim/sonnenhof')).toString('hex');
  assert.equal(info, '7669766f6465706f742f616e74776f72742d7363686c75657373656c2f763100616e74776f72740000257369676e696572743a616e6269657465723a303031343a6865696d2f736f6e6e656e686f66');
  const seed = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
  const k = await V.__zusatz.antwortSchluesselJeStelle('signiert:anbieter:0014:heim/sonnenhof', { antwortSeed: { form: 1, wert: seed.toString('base64url') } });
  assert.equal(k.jwk.x, 'tIlI1AwNs41st1Lx3e5k1e3w3-lppuYUz6P4_UFWTRk');
});

test('[Holder·Bestand P7] eine alte Ausgabe mit dem Schlüssel je Depot prüft weiter', async () => {
  const { V } = ladeKern();
  await depot(V);
  const alt = await V.deriveHalterSignaturV4(await V.importMasterHkdfKey(new Uint8Array(32).fill(3).buffer), new Uint8Array(32), 'alt', OEFFENTLICH_AUS_SEED);
  const ser = (await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}), { signatur: () => Promise.resolve(alt) })).serialisierung;
  assert.equal(await unabhaengigPruefen(ser), true);
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser);
  assert.ok(!plan.ungueltig, plan.grund);
});

/* ══ Klassenwächter: jede Quelle eines Ed25519-Privatschlüssels mit ihrer Bindung ══ */

const BINDUNG = Object.freeze({
  deriveHalterSignaturV4: 'je Depot (U2-ADR-457 Nr. 2) — nur noch für alte Ausgaben in Proben; kein Ausgabeweg ruft ihn (P4)',
  _ed25519SchluesselAusSeed: 'kein eigener Schlüssel: macht aus 32 Seed-Bytes den Schlüssel; die Bindung trägt der Aufrufer',
});
const AUFRUFER_SEED = Object.freeze({
  antwortSchluesselJeStelle: 'je geprüfter Stelle (signiert:) bzw. je Anfrage (unsigniert: mit Abdruck), U2-ADR-501 Nr. 9',
  sdjwtSchluesselJeAusgabe: 'je Ausgabe aus Zufall, U2-ADR-457 Nachtrag 02.11.2026',
});
function funktionenMit(muster, quelle) {
  const ohne = quelle.split('/** @license')[0];
  const raus = new Set();
  const rx = /(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m; const starts = [];
  while ((m = rx.exec(ohne))) starts.push({ name: m[1], i: m.index });
  starts.forEach((st, j) => { const ende = j + 1 < starts.length ? starts[j + 1].i : ohne.length; if (muster.test(ohne.slice(st.i, ende))) raus.add(st.name); });
  return [...raus].sort();
}
/* Der Schlüssel je Depot (deriveHalterSignaturV4 in der Krypto-Hülle, VdCrypto.halterSignatur, _halterSignaturHolen) hat keinen
   Ausgabeweg mehr. Erlaubt bleiben nur die Glieder der alten Kette selbst, bis zu ihrem Rückbau: die Hülle ruft die Ableitung
   einmal, _halterSignaturHolen ruft die Hülle einmal, und niemand ruft _halterSignaturHolen. */
function wegZumDepotSchluessel(ohneKommentar) {
  const fehler = [];
  const zahl = (re) => (ohneKommentar.match(re) || []).length;
  if (zahl(/(?<!function )\b_halterSignaturHolen\(/g) !== 0) fehler.push('ein Weg ruft den Schlüssel je Depot (_halterSignaturHolen)');
  if (zahl(/\bhalterSignatur\(/g) !== 1) fehler.push('VdCrypto.halterSignatur hat einen weiteren Aufrufer');
  if (zahl(/(?<!function )\bderiveHalterSignaturV4\(/g) !== 1) fehler.push('deriveHalterSignaturV4 hat einen weiteren Aufrufer');
  return fehler;
}
/* Andere Oberflächen tragen die Krypto-Hülle zeichengleich: sie selbst ruft die Ableitung höchstens einmal, sonst niemand. */
function andereOberflaeche(quelle) {
  const q = quelle.replace(/\/\*[\s\S]*?\*\//g, '');
  const zahl = (re) => (q.match(re) || []).length;
  const fehler = [];
  if (zahl(/(?<!function )\b_halterSignaturHolen\(/g) !== 0) fehler.push('_halterSignaturHolen');
  if (zahl(/\bhalterSignatur\(/g) !== 0) fehler.push('VdCrypto.halterSignatur');
  if (zahl(/(?<!function )\bderiveHalterSignaturV4\(/g) > 1) fehler.push('deriveHalterSignaturV4 außerhalb der Hülle');
  return fehler;
}
function waechter(quelle) {
  const fehler = [];
  const quellen = funktionenMit(/importKey\(\s*'pkcs8'[\s\S]{0,120}?Ed25519/, quelle);
  for (const n of quellen) if (!BINDUNG[n]) fehler.push('neue Quelle eines Ed25519-Privatschlüssels ohne Bindung: ' + n);
  for (const n of Object.keys(BINDUNG)) if (!quellen.includes(n)) fehler.push('verschwunden: ' + n);
  const aufrufer = funktionenMit(/_ed25519SchluesselAusSeed\(/, quelle).filter((n) => n !== '_ed25519SchluesselAusSeed');
  for (const n of aufrufer) if (!AUFRUFER_SEED[n]) fehler.push('neuer Aufrufer ohne Bindung: ' + n);
  for (const n of Object.keys(AUFRUFER_SEED)) if (!aufrufer.includes(n)) fehler.push('verschwunden: ' + n);
  const ohneKommentar = quelle.split('/** @license')[0].replace(/\/\*[\s\S]*?\*\//g, '');
  fehler.push(...wegZumDepotSchluessel(ohneKommentar));
  return fehler;
}

test('[Holder·Klasse] jede Quelle eines Ed25519-Privatschlüssels steht mit Bindung da; „je Depot“ hat keinen Ausgabeweg', () => {
  assert.deepEqual(waechter(KERN), []);
});

test('[Holder·Klasse·Rot-Beweis] eine neue Quelle, ein neuer Aufrufer und ein Weg zurück zum Schlüssel je Depot fallen auf', () => {
  const neu = KERN.replace('async function sdjwtSchluesselJeAusgabe(', 'async function _fremd() { await crypto.subtle.importKey(\'pkcs8\', x, { name: \'Ed25519\' }, false, [\'sign\']); }\nasync function sdjwtSchluesselJeAusgabe(');
  assert.ok(waechter(neu).some((f) => /ohne Bindung: _fremd/.test(f)));
  const aufr = KERN.replace('async function sdjwtSchluesselJeAusgabe(', 'async function _fremd2() { return _ed25519SchluesselAusSeed(s, p, f); }\nasync function sdjwtSchluesselJeAusgabe(');
  assert.ok(waechter(aufr).some((f) => /Aufrufer ohne Bindung: _fremd2/.test(f)));
  const zurueck = KERN.replace('opt.signatur() : sdjwtSchluesselJeAusgabe())', 'opt.signatur() : _halterSignaturHolen())');
  assert.notEqual(zurueck, KERN);
  assert.ok(waechter(zurueck).some((f) => /je Depot/.test(f)));
  const direkt = KERN.replace('opt.signatur() : sdjwtSchluesselJeAusgabe())', 'opt.signatur() : VdCrypto.halterSignatur(aktuelleDepotSalt, aktuelleDepotUUID, _ed25519OeffentlichAusSeed))');
  assert.ok(waechter(direkt).some((f) => /weiteren Aufrufer/.test(f)), 'auch ein direkter Aufruf der Hülle fällt auf');
});

test('[Holder·Klasse·andere Oberflächen] keine andere Oberfläche ruft eine Ableitung des Schlüssels je Depot', () => {
  for (const datei of fs.readdirSync(REPO).filter((d) => d.endsWith('.html') && d !== 'vivodepot.html')) {
    assert.deepEqual(andereOberflaeche(fs.readFileSync(path.join(REPO, datei), 'utf8')), [], datei);
  }
});

test('[Holder·Klasse·andere Oberflächen·Rot-Beweis] ein Aufruf der Hülle in einer anderen Oberfläche fällt auf', () => {
  const lesen = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  assert.deepEqual(andereOberflaeche(lesen), [], 'Vorbedingung: die Lese-App ist heute sauber');
  const gepflanzt = lesen.replace('</script>', 'async function _fremd3() { return VdCrypto.halterSignatur(s, u, o); }\n</script>');
  assert.notEqual(gepflanzt, lesen);
  assert.ok(andereOberflaeche(gepflanzt).some((f) => /halterSignatur/.test(f)));
  const zweiter = lesen.replace('</script>', 'async function _fremd4() { return deriveHalterSignaturV4(k, s, u, o); }\n</script>');
  assert.ok(andereOberflaeche(zweiter).some((f) => /deriveHalterSignaturV4/.test(f)));
});

/* ══ Rot-Beweise gegen den alten Weg ══ */

test('[Holder·Rot-Beweis P1] mit dem Schlüssel je Depot trügen zwei Ausgaben denselben Schlüssel', async () => {
  const k = kernKopie([['opt.signatur() : sdjwtSchluesselJeAusgabe())', 'opt.signatur() : _halterSignaturHolen())']]);
  try {
    const { V } = ladeKern({ htmlPfad: k.p, backen: true });
    await depot(V);
    const a = kopfUndNutzlast((await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}))).serialisierung);
    const b = kopfUndNutzlast((await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}))).serialisierung);
    assert.equal(a.nutzlast.cnf.jwk.x, b.nutzlast.cnf.jwk.x, 'der alte Weg verknüpft — P1 oben würde rot');
  } finally { k.weg(); }
});

test('[Holder·Rot-Beweis P5] ohne den Abdruck in der Ableitung ergäbe dieselbe anbieterId denselben Schlüssel', async () => {
  const k = kernKopie([['const zusatz = aud.startsWith(\'unsigniert:\') ? abdruckBytes : undefined;', 'const zusatz = aud.startsWith(\'unsigniert:\') ? new Uint8Array(32) : undefined;']]);
  try {
    const { V } = ladeKern({ htmlPfad: k.p, backen: true, zusatzBindungen: NAMEN });
    await depot(V);
    const sig = (a) => V.__zusatz.antwortSignieren({ felder: {} }, a, null, { jetzt: '2026-11-02T12:00:00Z' });
    const a = jwsKopf(await sig(anfrage({ zweck: 'Mitgliedschaft' })));
    const b = jwsKopf(await sig(anfrage({ zweck: 'Spende', von: 'Andere Stelle' })));
    assert.equal(a.jwk.x, b.jwk.x, 'ohne Abdruck verknüpft die Kennung — P5 oben würde rot');
  } finally { k.weg(); }
});
