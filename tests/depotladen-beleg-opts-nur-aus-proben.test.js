'use strict';
/* `belegOpts` an depotLaden nur aus Proben (Schutz-Wagen S1/S2, 05.10.2026, Einzelwort der Gegenlesung mit Bedingungen).
   depotLaden(umschlag, password, belegOpts) reicht einen Test-Anker (opts.ankerJwk, Muster modulEinlassenGeprueft) an die
   Ladeprüfung durch. Produktiv fehlt er, geprüft wird gegen den eingebauten Anker. Zwei Zusicherungen:
   (1) Klasse: kein Aufruf von depotLaden oder _depotGeoeffnetUebernehmen außerhalb von tests/ gibt belegOpts mit — einzige Stelle
       ist die Weitergabe in depotLaden selbst. Rot-Beweis gegen einen nachgestellten Aufruf.
   (2) belegOpts entsteht nie aus der Datei: ein Depot, das ankerJwk oder belegOpts in den Daten oder im Umschlag trägt, bleibt
       gegen den eingebauten Anker geprüft — das gegen den Test-Anker signierte Modul gilt nicht als nachgeprüft. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

/* Aufrufe von `name(` mit ihren Argumenten auf oberster Ebene; Deklarationen (`function name(`) zählen nicht. */
function aufrufe(text, name) {
  const raus = [];
  const re = new RegExp('(^|[^\\w$.])(?:[\\w$]+\\.)?' + name + '\\(', 'g');
  let t;
  while ((t = re.exec(text))) {
    const start = t.index + t[0].length;
    if (/function\s*$/.test(text.slice(Math.max(0, t.index - 12), t.index + t[1].length))) continue;
    let tiefe = 1, i = start, argStart = start;
    const args = [];
    while (i < text.length && tiefe > 0) {
      const c = text[i];
      if (c === '(' || c === '[' || c === '{') tiefe++;
      else if (c === ')' || c === ']' || c === '}') tiefe--;
      if ((c === ',' && tiefe === 1) || tiefe === 0) { args.push(text.slice(argStart, i).trim()); argStart = i + 1; }
      i++;
    }
    raus.push({ pos: t.index, args: args.filter((a) => a !== '') });
  }
  return raus;
}
function koerper(text, kopf) {
  const i = text.indexOf(kopf);
  return i < 0 ? null : { von: i, bis: text.indexOf('\n}\n', i) };
}
/* Verstöße in einem Dateitext: depotLaden mit mehr als zwei Argumenten; _depotGeoeffnetUebernehmen mit mehr als vier, außer der einen
   Weitergabe `belegOpts` im Körper von depotLaden. */
function verstoesse(text) {
  const raus = [];
  for (const a of aufrufe(text, 'depotLaden')) if (a.args.length > 2) raus.push('depotLaden mit ' + a.args.length + ' Argumenten bei ' + a.pos);
  const k = koerper(text, 'async function depotLaden(');
  for (const a of aufrufe(text, '_depotGeoeffnetUebernehmen')) {
    if (a.args.length <= 4) continue;
    const weitergabe = k && a.pos > k.von && a.pos < k.bis && a.args.length === 5 && a.args[4] === 'belegOpts';
    if (!weitergabe) raus.push('_depotGeoeffnetUebernehmen mit ' + a.args.length + ' Argumenten bei ' + a.pos);
  }
  return raus;
}
function dateienAusserhalbTests() {
  const raus = [];
  const geh = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (path.relative(REPO, p) !== 'tests') geh(p); }
      else if (/\.(html|js|mjs|cjs)$/.test(e.name)) raus.push(p);
    }
  };
  geh(REPO);
  return raus;
}

test('[belegOpts·Klasse] außerhalb von tests/ gibt kein Aufruf von depotLaden/_depotGeoeffnetUebernehmen belegOpts mit', () => {
  const funde = [];
  let gesehen = 0;
  for (const p of dateienAusserhalbTests()) {
    const text = fs.readFileSync(p, 'utf8');
    if (!/depotLaden\(|_depotGeoeffnetUebernehmen\(/.test(text)) continue;
    gesehen++;
    for (const v of verstoesse(text)) funde.push(path.relative(REPO, p) + ': ' + v);
  }
  assert.ok(gesehen >= 2, 'Vorbedingung: der Kern und mindestens ein Werkzeug rufen depotLaden auf (gesehen: ' + gesehen + ')');
  assert.deepEqual(funde, []);
});

test('[belegOpts·Klasse] die eine Weitergabe steht in depotLaden, und die produktiven Aufrufer im Kern rufen mit zwei Argumenten', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const weiter = aufrufe(kern, '_depotGeoeffnetUebernehmen').filter((a) => a.args.length === 5);
  assert.equal(weiter.length, 1);
  const dl = aufrufe(kern, 'depotLaden').filter((a) => a.args.length > 0);   // ohne Argumente: Erwähnungen in Kommentaren
  assert.ok(dl.length >= 4, 'Vorbedingung: die Öffnen-Wege des Kerns rufen depotLaden (' + dl.length + ')');
  assert.deepEqual(dl.map((a) => a.args.length).filter((n) => n !== 2), []);
});

test('[belegOpts·Klasse·Rot-Beweis] ein nachgestellter Aufruf mit belegOpts wird gefunden — im Kern und in einem Werkzeug', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.deepEqual(verstoesse(kern), []);
  assert.equal(verstoesse(kern + '\nasync function x() { await depotLaden(u, pw, { ankerJwk: k }); }\n').length, 1);
  assert.equal(verstoesse(kern + '\nasync function y() { await _depotGeoeffnetUebernehmen(u, o, a, b, belegOpts); }\n').length, 1);
  assert.equal(verstoesse('await V.depotLaden(umschlag, pw, OPTS);').length, 1);
  assert.equal(verstoesse('await V.depotLaden(umschlag, pw);').length, 0);
});

/* (2) Nie aus der Datei. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-09-01T09:00:00Z' });
const PW = 'beleg-opts-nur-aus-proben-1!';

async function signiertesBuendel(V, modul) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'institution/beleg-opts-probe', anbieterTyp: 'institution/test', anbieterName: 'Probe', publicKeyJwk: pub },
  };
  const s = async (p, k) => V._signJWS(p, await V._jwsImportSignKey(k), {});
  return { providerCredentialJws: await s(cert, SENTINEL_PRIVATE_JWK), modulSignaturJws: await s(modul, priv) };
}
async function depotMitSelbstauskunft() {
  const V = ladeKern().V;
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Probe');
  const modul = { modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'probe-beleg-opts', richtung: 'import',
    sektor: 'health', label: 'Probe', leser: 'json', zuordnung: [{ feld: 'medicationOngoing', ziel: 'meds' }] };
  const r = await V.modulEinlassenGeprueft(JSON.stringify(await signiertesBuendel(V, modul)), null, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: eingelassen — ' + r.grund);
  const d = V.getData();
  d.ankerJwk = SENTINEL_PUBLIC_JWK;
  d.belegOpts = { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: OPTS.jetzt };
  const umschlag = await V.depotSerialisieren();
  umschlag.ankerJwk = SENTINEL_PUBLIC_JWK;
  umschlag.belegOpts = { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: OPTS.jetzt };
  return umschlag;
}

test('[belegOpts·nie aus der Datei] ankerJwk/belegOpts in Daten und Umschlag: das Modul gilt nicht als nachgeprüft', async () => {
  const umschlag = await depotMitSelbstauskunft();
  const L = ladeKern().V;
  await L.depotLaden(umschlag, PW);
  const m = L.getData().formatModule.find((x) => x && x.format === 'probe-beleg-opts');
  assert.ok(m, 'Vorbedingung: das Modul reist in der Datei');
  assert.equal(L.modulBelegGeprueft(m), null);
});

test('[belegOpts·nie aus der Datei·Gegenprobe] derselbe Umschlag mit dem Test-Anker aus der Probe: nachgeprüft', async () => {
  const umschlag = await depotMitSelbstauskunft();
  const L = ladeKern().V;
  await L.depotLaden(umschlag, PW, OPTS);
  const m = L.getData().formatModule.find((x) => x && x.format === 'probe-beleg-opts');
  assert.ok(L.modulBelegGeprueft(m), 'mit dem Anker der Probe trägt die Kette');
});
