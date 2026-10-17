'use strict';
/* U2-ADR-501, Wagen V4 — der Kern signiert jede Antwort an eine Stelle (sign-then-encrypt), mit einem Schlüssel je Stelle.

   Was gehalten wird (alles zur Laufzeit erzeugt; kein Schlüssel liegt im Repo):
     · Ableitung: die info-Bytes in fester Form (Länge 2 Byte big-endian) und ein Testvektor, unabhängig mit node:crypto
       nachgerechnet (HKDF-SHA-256 und Ed25519 aus PKCS8), derselbe Vektor wie in U2-ADR-501 Punkt 28;
     · je Stelle: zwei Stellen → zwei Schlüssel, dieselbe Stelle → derselbe, signiert:X ≠ unsigniert:X;
     · Sicherbarkeit (Auflage der Gegenlesung): Sicherung schreiben, in einem frischen Kern öffnen, mit dem Code und neuem Passwort
       wiederherstellen → dieselbe Stelle ergibt denselben öffentlichen Schlüssel;
     · mit Schalter an: die Lese-App öffnet die Antwort des Kerns als signiert, auf beiden Wegen (Schlüsselpaar und Einmalpasswort),
       derselbe Datensatz wie ohne Signatur; ohne Schalter bleibt die Antwort wie bisher;
     · aud: signiert: nur bei frisch geprüfter Anfrage — dazu der Befund ANFRAGE-GESPEICHERT-NIE-GEPRUEFT (16.10.2026): eine
       gespeicherte signierte Anfrage bleibt beim Herausgeben geprüft;
     · Weg-Probe: genau ein Weg führt zu antwortJweSchluessel/antwortJwePasswort, und er geht hinter dem Schalter über das Signieren.
   Rot-Beweise: eine Ableitung ohne Kennung macht zwei Stellen gleich; ein zweiter Weg zu antwortJwe* ohne Signieren wird gefunden;
   ein Eintrag ohne die rohe Anfrage (wie vor dem Fix) ist nicht geprüft. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const KERN = fs.readFileSync(KERN_PFAD, 'utf8');
const SCHALTER_AUS = 'const ANTWORT_SIGNIEREN = false;';
const PW = 'antwort-signieren-probe-2026';
const PW_NEU = 'antwort-signieren-probe-neu-2026';
const EINMAL = 'Einmal-Probe-V4-7fQ2-kP9x';
const STELLE = 'heim/sonnenhof';
const VORGANG = 'AUF-2026-1016';
const b64u = (b) => Buffer.from(b).toString('base64url');
const kopie = (o) => JSON.parse(JSON.stringify(o));

/* Der Kern mit umgelegtem Schalter: eine Kopie der Quelle in einem Wegwerf-Verzeichnis, gebacken wie das Standard-Produkt. */
let _anPfad = null;
function kernMitSchalter() {
  if (!_anPfad) {
    assert.equal(KERN.split(SCHALTER_AUS).length, 2, 'Vorbedingung: der Schalter steht genau einmal und aus');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-antwort-signieren-'));
    _anPfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(_anPfad, KERN.replace(SCHALTER_AUS, 'const ANTWORT_SIGNIEREN = true;'));
    process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} });
  }
  return ladeKern({ htmlPfad: _anPfad, backen: true }).V;
}
async function mitDepot(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  return V;
}
const kennung = (id, geprueft) => (geprueft === false ? 'unsigniert:' : 'signiert:anbieter:') + String(Buffer.byteLength(id)).padStart(4, '0') + ':' + id;
function anfrage(antwort, extra) {
  return Object.assign({
    modulTyp: 'anfrage', anfrageVersion: 1, von: 'Pflegeheim Sonnenhof', anbieterId: STELLE, zweck: 'Aufnahme', grundlage: 'Heimvertrag',
    vorgang: VORGANG, gestelltAm: '2026-10-16', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }], antwort,
  }, extra || {});
}

/* ══ Ableitung ══ */

const VEKTOR = {
  seed: Buffer.from(Array.from({ length: 32 }, (_, i) => i)),
  kennung: 'signiert:anbieter:0014:heim/sonnenhof',
  info: '7669766f6465706f742f616e74776f72742d7363686c75657373656c2f763100616e74776f72740000257369676e696572743a616e6269657465723a303031343a6865696d2f736f6e6e656e686f66',
  x: 'tIlI1AwNs41st1Lx3e5k1e3w3-lppuYUz6P4_UFWTRk',
};
const seedZiel = (seed) => ({ antwortSeed: { form: 1, wert: b64u(seed) } });

test('[Antwort-Signatur·Vektor] info in fester Form und der öffentliche Schlüssel aus dem Vektor, unabhängig nachgerechnet', async () => {
  const { V } = ladeKern();
  assert.equal(Buffer.from(V.antwortSchluesselInfo('antwort', VEKTOR.kennung)).toString('hex'), VEKTOR.info);
  // Unabhängig: node:crypto (HKDF, Ed25519 aus PKCS8), nicht der Kern.
  const okm = Buffer.from(nodeCrypto.hkdfSync('sha256', VEKTOR.seed, Buffer.alloc(0), Buffer.from(VEKTOR.info, 'hex'), 32));
  const pk8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), okm]);
  const x = nodeCrypto.createPublicKey(nodeCrypto.createPrivateKey({ key: pk8, format: 'der', type: 'pkcs8' })).export({ format: 'jwk' }).x;
  assert.equal(x, VEKTOR.x, 'der Vektor im ADR stimmt');
  const s = await V.antwortSchluesselJeStelle(VEKTOR.kennung, seedZiel(VEKTOR.seed));
  assert.equal(s.jwk.x, VEKTOR.x, 'der Kern findet denselben Schlüssel');
  assert.equal(s.schluessel.extractable, false, 'privat nicht herausholbar');
  assert.throws(() => V.antwortSchluesselInfo('sdjwt-halter', VEKTOR.kennung), /domaene/, 'sdjwt-halter ist nur vorgemerkt');
  assert.throws(() => V.antwortSchluesselInfo('antwort', 'heim/sonnenhof'), /kennung/, 'nur eine Kennung aus stellenKennung');
});

test('[Antwort-Signatur·je Stelle] zwei Stellen, zwei Schlüssel; dieselbe Stelle, derselbe; signiert und unsigniert getrennt', async () => {
  const { V } = ladeKern();
  const z = seedZiel(nodeCrypto.randomBytes(32));
  const a1 = await V.antwortSchluesselJeStelle(kennung('heim/a'), z);
  const a2 = await V.antwortSchluesselJeStelle(kennung('heim/a'), z);
  const b = await V.antwortSchluesselJeStelle(kennung('heim/b'), z);
  const u = await V.antwortSchluesselJeStelle(kennung('heim/a', false), z);
  assert.equal(a1.jwk.x, a2.jwk.x);
  assert.notEqual(a1.jwk.x, b.jwk.x);
  assert.notEqual(a1.jwk.x, u.jwk.x, 'eine unsignierte Anfrage mit der Kennung einer geprüften Stelle ergibt nie deren Schlüssel');
  const anderesDepot = await V.antwortSchluesselJeStelle(kennung('heim/a'), seedZiel(nodeCrypto.randomBytes(32)));
  assert.notEqual(a1.jwk.x, anderesDepot.jwk.x);
});

test('[Antwort-Signatur·je Stelle·Rot-Beweis] eine Ableitung ohne die Kennung in info machte zwei Stellen gleich', async () => {
  const zeile = '  info.set(k, i);\n  return info;';
  assert.equal(KERN.split(zeile).length, 2, 'Vorbedingung: die Zeile steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-antwort-signieren-rot-'));
  try {
    const p = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(p, KERN.replace(zeile, '  return info.slice(0, i - 2);'));
    const V = ladeKern({ htmlPfad: p, backen: true }).V;
    const z = seedZiel(nodeCrypto.randomBytes(32));
    const a = await V.antwortSchluesselJeStelle(kennung('heim/a'), z);
    const b = await V.antwortSchluesselJeStelle(kennung('heim/b'), z);
    assert.equal(a.jwk.x, b.jwk.x, 'die geschwächte Ableitung trennt die Stellen nicht');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Antwort-Signatur·Sicherbarkeit] Sicherung, frischer Kern, Wiederherstellung mit Code und neuem Passwort: derselbe Schlüssel je Stelle', async () => {
  const { V } = ladeKern();
  await mitDepot(V);
  const vorher = (await V.antwortSchluesselJeStelle(kennung(STELLE))).jwk.x;
  const code = V.whcCodeErzeugen();
  await V.whcHuelleWickeln(PW, code.slice(0, V.WHC_STELLEN));
  const datei = kopie(await V.depotSerialisieren());
  const W = ladeKern().V;
  await W.depotLaden(kopie(datei), PW);
  assert.equal((await W.antwortSchluesselJeStelle(kennung(STELLE))).jwk.x, vorher, 'frisches Profil, dieselbe Sicherung');
  const X = ladeKern().V;
  await X.depotMitCodeLaden(kopie(datei), V.whcCodeGruppiert(code), PW_NEU);
  assert.equal((await X.antwortSchluesselJeStelle(kennung(STELLE))).jwk.x, vorher, 'nach Wiederherstellung mit neuem Passwort');
  assert.notEqual((await X.antwortSchluesselJeStelle(kennung('heim/andere'))).jwk.x, vorher);
});

/* ══ Signierte Antwort, Kern → Lese-App ══ */

async function empfangsPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
const kopfVon = (jwe) => JSON.parse(Buffer.from(jwe.split('.')[0], 'base64url').toString('utf8'));

test('[Antwort-Signatur·Schalter aus] ab Werk bleibt die Antwort unsigniert (cty json), wie vor dem Wagen', async () => {
  const { V } = ladeKern();
  assert.equal(V.ANTWORT_SIGNIEREN, false);
  await mitDepot(V);
  const a = anfrage({ art: 'einmalpasswort' });
  const jwe = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(a, { sensibel: false }), a, { passwort: EINMAL });
  assert.equal(kopfVon(jwe).cty, 'json');
});

test('[Antwort-Signatur·an] Schlüsselpaar und Einmalpasswort: die Lese-App öffnet die Antwort des Kerns als signiert, mit demselben Datensatz', async () => {
  const V = kernMitSchalter();
  assert.equal(V.ANTWORT_SIGNIEREN, true);
  await mitDepot(V);
  const L = ladeLesen().V;
  const erwartet = (await V.antwortSchluesselJeStelle(kennung(STELLE, false))).jwk;
  const paar = await empfangsPaar();
  for (const [art, a, opt, schluessel] of [
    ['schluesselpaar', anfrage({ art: 'schluesselpaar', publicKeyJwk: paar.pub }), {}, { privateJwk: paar.priv }],
    ['einmalpasswort', anfrage({ art: 'einmalpasswort' }), { passwort: EINMAL }, { passwort: EINMAL }]]) {
    const ds = V.anfrageAntwortDatensatz(a, { sensibel: false });
    const jwe = await V.antwortVerschluesseln(ds, a, opt);
    assert.equal(kopfVon(jwe).cty, 'JWT', art + ': cty JWT');
    const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), schluessel);
    assert.equal(r.signatur.zustand, 'signatur', art);
    assert.equal(r.signatur.aud, kennung(STELLE, false), art + ': ohne geprüfte Anfrage unsigniert:');
    assert.equal(r.signatur.abdruck, await V.jwkThumbprintOkp(erwartet), art + ': der Schlüssel dieser Stelle');
    assert.deepEqual(kopie(r.datensatz), kopie(ds), art + ': derselbe Datensatz');
  }
});

/* ══ aud und der Befund ANFRAGE-GESPEICHERT-NIE-GEPRUEFT ══ */

async function signierteAnfrage(V) {
  const paar = async () => { const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']); return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) }; };
  const anker = await paar(), stelle = await paar();
  const A = anfrage({ art: 'einmalpasswort' }, { format: 'vivodepot-anfrage@1' });
  const cert = { issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: STELLE, anbieterName: 'Pflegeheim Sonnenhof', anbieterTyp: 'institution/pflege', publicKeyJwk: stelle.pub } };
  const zertifikat = await V._signJWS(cert, await V._jwsImportSignKey(anker.priv), {});
  const anfrageJws = await V._signJWS(A, await V._jwsImportSignKey(stelle.priv), {});
  return { u: { format: 'vivodepot-anfrage@1', anfrage: A, zertifikat, anfrageJws },
    opt: { jetzt: '2026-10-16T10:00:00Z', ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: anker.pub.x } } };
}

test('[Antwort-Signatur·aud] eine gespeicherte signierte Anfrage bleibt beim Herausgeben geprüft, und aud ist signiert:', async () => {
  const { V } = ladeKern();
  await mitDepot(V);
  const { u, opt } = await signierteAnfrage(V);
  const roh = await V.anfrageSignaturPruefen(kopie(u), opt);
  assert.equal(roh.geprueft, true, 'Vorbedingung: die Anfrage ist geprüft');
  const r = V.anfrageMerken(kopie(u), roh);
  const p = await V.anfrageSignaturPruefen(V._anfrageUmschlagAusEintrag(r.eintrag), opt);
  assert.equal(p.geprueft, true, 'über den Eintrag geprüft: ' + p.grund);
  assert.equal(V.antwortAudKennung(r.eintrag.anfrage, p), kennung(STELLE));
  assert.equal(V.antwortAudKennung(r.eintrag.anfrage, null), kennung(STELLE, false), 'ohne Prüfung unsigniert:');
});

test('[Antwort-Signatur·aud·Rot-Beweis] ein Eintrag ohne die rohe Anfrage (wie vor dem Fix) ist beim Herausgeben nicht geprüft', async () => {
  const { V } = ladeKern();
  await mitDepot(V);
  const { u, opt } = await signierteAnfrage(V);
  const r = V.anfrageMerken(kopie(u), await V.anfrageSignaturPruefen(kopie(u), opt));
  const alt = kopie(r.eintrag); delete alt.umschlag.anfrage;
  const p = await V.anfrageSignaturPruefen(V._anfrageUmschlagAusEintrag(alt), opt);
  assert.equal(p.geprueft, false);
  assert.equal(p.grund, 'anfrage-abweichung', 'genau der Befund');
});

/* ══ Weg-Probe ══ */

function wegFunde(quelle) {
  // Aufrufe (nicht Definitionen) der zwei Schreiber, und ob der eine Einstieg sie hinter dem Signieren ruft.
  const aufrufe = (name) => (quelle.match(new RegExp('(?<!function )\\b' + name + '\\(', 'g')) || []).length;
  const a = quelle.indexOf('async function antwortVerschluesseln('), e = quelle.indexOf('\n}\n', a);
  const einstieg = a >= 0 ? quelle.slice(a, e) : '';
  const f = [];
  if (aufrufe('antwortJweSchluessel') !== 1 || !/return antwortJweSchluessel\(klartext,/.test(einstieg)) f.push('antwortJweSchluessel ausserhalb des Einstiegs');
  if (aufrufe('antwortJwePasswort') !== 1 || !/return antwortJwePasswort\(klartext,/.test(einstieg)) f.push('antwortJwePasswort ausserhalb des Einstiegs');
  if (!/const jws = ANTWORT_SIGNIEREN \? await antwortSignieren\(/.test(einstieg) || !/const klartext = jws \|\| JSON\.stringify\(datensatz\);/.test(einstieg)) f.push('Einstieg ohne Signieren');
  return f;
}
test('[Antwort-Signatur·Weg] jeder Weg zu antwortJwe* läuft über den einen Einstieg, und der signiert hinter dem Schalter', () => {
  assert.deepEqual(wegFunde(KERN), []);
});
test('[Antwort-Signatur·Weg·Rot-Beweis] ein zweiter Weg ohne Signieren und ein Einstieg ohne Signieren werden gefunden', () => {
  const zweiter = KERN.replace('async function antwortVerschluesseln(', 'async function nebenweg(t, p) { return antwortJwePasswort(t, p, {}); }\nasync function antwortVerschluesseln(');
  assert.deepEqual(wegFunde(zweiter), ['antwortJwePasswort ausserhalb des Einstiegs']);
  const ohne = KERN.replace('const klartext = jws || JSON.stringify(datensatz);', 'const klartext = JSON.stringify(datensatz);');
  assert.notEqual(ohne, KERN);
  assert.deepEqual(wegFunde(ohne), ['Einstieg ohne Signieren']);
});
