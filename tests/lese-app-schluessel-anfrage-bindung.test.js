'use strict';
/* U2-ADR-501, Wagen V3b — die Empfangs-Schlüsseldatei trägt ihre Anfrage, und die Lese-App bindet daran.

   Das Studio erzeugt das Empfangspaar seit V3b für GENAU EINE Anfrage: erst wird die Anfrage mit dem öffentlichen Teil signiert,
   dann die Schlüsseldatei geschrieben. Sie trägt die Anfrage ungeschützt (`anfrage`) und ihren Abdruck im verschlüsselten JWK
   (`anfrageAbdruck`). Die Lese-App hält beim Öffnen einer Antwort die Kette:
     Abdruck → öffentlicher Teil = Empfangsschlüssel der Anfrage → Zertifikat und Anfrage-Signatur zum Tag `gestelltAm` →
     `anbieterId` aus dem signierten Zertifikat. Erst dann wird `aud` einer signierten Antwort abgeglichen; der Vorgang kommt aus der
     Anfrage, nicht aus dem JWE-Kopf.

   Was gehalten wird (alles hier zur Laufzeit erzeugt, kein Schlüssel liegt im Repo):
     · Studio → Lese-App: eine echte Schlüsseldatei aus dem Tresor des Studios öffnet eine signierte Antwort, `aud` ist abgeglichen;
       ein fremdes `aud` wird abgewiesen; der Vorgang kommt aus der Anfrage.
     · jeder Bruch der Kette (ausgetauschte Anfrage, fremder Schlüssel, ein Teil fehlt) weist ab, mit Satz, ohne Code;
     · ohne Zertifikat keine gebundene Kennung: kein Abgleich, wie vor V3b;
     · Tagesregel (Wort der Gegenlesung 15.10.2026): Ausstellungs- und Ablauftag tragen, ein ganz innerhalb des Tages gültiges
       Zertifikat trägt, ein am Vortag abgelaufenes nicht;
     · Sicherbarkeit: eine neue Schlüsseldatei öffnet in der AUSGELIEFERTEN Lese-App v929 eine Antwort wie bisher (die vollständige
       Datei als Fixture, per sha256 gepinnt), und eine ältere Schlüsseldatei ohne Anfrage öffnet in der neuen Lese-App wie bisher.
   Rot-Beweise: eine Lese-App, die die gebundene Kennung nicht weiterreicht, nimmt das fremde `aud` an; eine, die den Vorgang aus dem
   JWE-Kopf nimmt, nimmt die umetikettierte Antwort an. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { webcrypto } = nodeCrypto;
const { ladeLesen, LESEN_PATH } = require('./load-lesen.js');
const { ladeGenerator } = require('./load-generator.js');

const STELLE = 'heim/sonnenhof';
const VORGANG = 'AUF-2026-1015';
const TAG = '2026-10-15';
const PW = 'probe-passwort-bindung';
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const json = (o) => JSON.parse(JSON.stringify(o));
/* Die ausgelieferte Lese-App v929, vollständig, gzip-gepackt (der Inhalt ist die ausgelieferte Datei; der sha256 gilt dem entpackten Text). */
const V929 = path.join(__dirname, 'fixtures', 'lese-app-v929', 'vivodepot-lesen.v929.html.gz');
const V929_SHA256 = '72ba66a010547fd61f5e10e181f2132401b31e4ac602206e846f1f213ce26e87';

async function edPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
/* Ein Anbieter-Zertifikat unter einem frisch erzeugten Anker (wie tests/anfrage-kompakt.test.js); `zeit` setzt die Gültigkeit. */
async function zertifikat(G, anker, stelle, zeit) {
  const cert = Object.assign({
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: STELLE, anbieterName: 'Pflegeheim Sonnenhof', anbieterTyp: 'institution/pflege', publicKeyJwk: stelle.pub },
  }, zeit || {});
  return G._signJWS(cert, await G._jwsImportSignKey(anker.priv), {});
}
const ankerOpt = (anker) => ({ ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: anker.pub.x } });

/* Die Schlüsseldatei über den echten Tresor des Studios: das Paar entsteht, `bauen` signiert die Anfrage mit dem öffentlichen Teil,
   dann schreibt der Tresor die Hülle. `mitZertifikat: false` = eine Anfrage ohne Zertifikat und ohne Signatur. */
async function schluesseldateiAusStudio(optionen) {
  const o = optionen || {};
  const { V: G } = ladeGenerator();
  const anker = o.anker || await edPaar();
  const stelle = await edPaar();
  const zert = o.mitZertifikat === false ? null : await zertifikat(G, anker, stelle, o.zeit);
  const erg = await G.EMPFANGS_TRESOR.erzeugen({ passwort: PW, bauen: async (publicJwk) => {
    const state = {
      anbieter: { anbieterId: STELLE, anbieterName: 'Pflegeheim Sonnenhof' }, publicKeyJwk: stelle.pub, zertifikatJws: zert,
      anfrage: { zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: VORGANG, gestelltAm: o.tag || TAG, gueltigBis: '2099-12-31',
        antwortArt: 'schluesselpaar', empfangPublicJwk: publicJwk, felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }] },
    };
    const u = await G.baueAnfrageSigniert(state, zert ? stelle.priv : null);
    return { text: G.anfrageAlsText(u), vorgang: u.anfrage.vorgang, gestelltAm: u.anfrage.gestelltAm };
  } });
  let text = ''; G.EMPFANGS_TRESOR.privatHerunterladen((t) => { text = t; });
  G.EMPFANGS_TRESOR.verwerfen('bestaetigt');
  return { text, pub: erg.publicJwk, anker, G };
}
/* Was die Lese-App aus der Datei liest: das JWK hinter dem Passwort und die getragene Anfrage. */
async function schluesselAus(L, text) {
  const w = JSON.parse(text);
  return { privateJwk: await L.entschluesseleSchluesselJwk(w, PW), anfrageText: w.anfrage };
}

/* ── Die signierte Antwort der Person (zur Laufzeit), wie tests/lese-app-signierte-antwort.test.js ── */
function edPaarNode() {
  const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('ed25519');
  const jwk = publicKey.export({ format: 'jwk' });
  return { privateKey, jwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x } };
}
function audVon(id) { return 'signiert:anbieter:' + String(Buffer.byteLength(id)).padStart(4, '0') + ':' + id; }
function datensatz(vorgang) {
  return {
    erstelltAm: '2026-10-15T09:00:00.000Z',
    anfrage: { von: 'Pflegeheim Sonnenhof', anbieterId: STELLE, zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: vorgang || VORGANG, gueltigBis: '2099-12-31' },
    felder: [{ kennung: 'identity.givenName', label: 'Vorname', wert: 'Hedwig', zweck: 'Anrede' }],
    fehlend: [], unbekannt: [], vollstaendig: true, absender: { name: 'Hedwig Brandt', rolle: 'selbst' },
  };
}
function signiere(nutzlast) {
  const paar = edPaarNode();
  const thumb = b64u(nodeCrypto.createHash('sha256').update(JSON.stringify({ crv: paar.jwk.crv, kty: paar.jwk.kty, x: paar.jwk.x })).digest());
  const kopf = { alg: 'Ed25519', typ: 'vivodepot-antwort+jwt', kid: thumb, jwk: paar.jwk };
  const eingabe = b64u(JSON.stringify(kopf)) + '.' + b64u(JSON.stringify(nutzlast));
  return eingabe + '.' + b64u(nodeCrypto.sign(null, Buffer.from(eingabe), paar.privateKey));
}
const signiertFuer = (aud, vorgang) => signiere(Object.assign(datensatz(vorgang), { iat: 1760518800, aud: audVon(aud) }));
async function verschluessele(L, klartext, empfaengerPub, kopfExtra) {
  const empf = await webcrypto.subtle.importKey('jwk', empfaengerPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const fl = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const e = await webcrypto.subtle.exportKey('jwk', fl.publicKey);
  const kopf = Object.assign({ alg: 'ECDH-ES', typ: 'vivodepot-antwort+jwe', enc: 'A256GCM', vorgang: VORGANG, anbieter: STELLE }, kopfExtra || {});
  kopf.epk = { kty: e.kty, crv: e.crv, x: e.x, y: e.y };
  kopf.apv = b64u(Buffer.from(kopf.vorgang));
  const z = new Uint8Array(await webcrypto.subtle.deriveBits({ name: 'ECDH', public: empf }, fl.privateKey, 256));
  const cek = await L._jweConcatKdf(z, 'A256GCM', new Uint8Array(0), new Uint8Array(Buffer.from(kopf.vorgang)), 256);
  const key = await webcrypto.subtle.importKey('raw', new Uint8Array(cek), { name: 'AES-GCM' }, false, ['encrypt']);
  const k = b64u(JSON.stringify(kopf));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: Buffer.from(k), tagLength: 128 }, key, Buffer.from(klartext)));
  return [k, '', b64u(iv), b64u(ct.subarray(0, ct.length - 16)), b64u(ct.subarray(ct.length - 16))].join('.');
}
async function abgewiesen(L, versuch, textSchluessel) {
  let fehler = null;
  try { await versuch(); } catch (e) { fehler = e; }
  assert.ok(fehler, 'angenommen, erwartet war die Abweisung „' + textSchluessel + '“');
  assert.equal(fehler.antwortTextSchluessel, textSchluessel);
  const satz = L.antwortOeffnenFehlerText(fehler);
  assert.equal(satz, L.STRINGS[textSchluessel]);
  assert.ok(!/antwort-signatur-|jws|jwe|\baud\b|abdruck/i.test(satz), 'kein Code im Satz: ' + satz);
}

/* ══ Studio → Lese-App ══ */

test('[Schlüssel·Anfrage] die Schlüsseldatei aus dem Studio trägt ihre Anfrage, Vorgang und Datum lesbar, den Abdruck verschlüsselt', async () => {
  const { text, pub, G } = await schluesseldateiAusStudio();
  const w = JSON.parse(text);
  assert.equal(typeof w.anfrage, 'string');
  assert.equal(w.vorgang, VORGANG);
  assert.equal(w.gestelltAm, TAG);
  assert.ok(!/"anfrageAbdruck"/.test(text), 'der Abdruck steht nur im verschlüsselten Teil');
  const jwk = await G.entschluesseleSchluesselJwk(w, PW);
  assert.equal(jwk.anfrageAbdruck, await G.empfangAnfrageAbdruck(w.anfrage));
  assert.deepEqual(json(JSON.parse(w.anfrage).anfrage.antwort.publicKeyJwk), json(pub), 'die Anfrage nennt genau diesen Empfangsschlüssel');
  assert.ok(JSON.parse(w.anfrage).anfrageJws, 'die getragene Anfrage ist signiert');
});

test('[Schlüssel·Anfrage] ohne Anfrage entsteht kein Paar (ein Paar je Anfrage)', async () => {
  const { V: G } = ladeGenerator();
  await assert.rejects(G.EMPFANGS_TRESOR.erzeugen({ passwort: PW }), /anfrage-fehlt/);
  await assert.rejects(G.EMPFANGS_TRESOR.erzeugen({ passwort: PW, bauen: async () => ({ text: '' }) }), /anfrage-fehlt/);
  assert.equal(G.EMPFANGS_TRESOR.vorhanden(), false);
});

test('[Schlüssel·Anfrage·gebunden] eine signierte Antwort an diese Stelle öffnet, aud ist abgeglichen', async () => {
  const L = ladeLesen().V;
  const { text, pub, anker } = await schluesseldateiAusStudio();
  const jwe = await verschluessele(L, signiertFuer(STELLE), pub, { cty: 'JWT' });
  const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), await schluesselAus(L, text), ankerOpt(anker));
  assert.equal(r.signatur.zustand, 'signatur');
  assert.equal(r.signatur.abgeglichen, true, 'die Kennung kommt aus dem signierten Zertifikat der getragenen Anfrage');
  assert.equal(r.signatur.stelle, STELLE);
});

test('[Schlüssel·Anfrage·gebunden·rot] eine an eine andere Stelle signierte Antwort wird abgewiesen', async () => {
  const L = ladeLesen().V;
  const { text, pub, anker } = await schluesseldateiAusStudio();
  const jwe = await verschluessele(L, signiertFuer('klinik/andere'), pub, { cty: 'JWT' });
  await abgewiesen(L, async () => L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), await schluesselAus(L, text), ankerOpt(anker)), 'antwortSignaturFremdeStelle');
});

test('[Schlüssel·Anfrage·Vorgang] der Vorgang kommt aus der Anfrage: ein umetikettierter JWE-Kopf hilft nicht', async () => {
  const L = ladeLesen().V;
  const { text, pub, anker } = await schluesseldateiAusStudio();
  // Antwort für einen anderen Vorgang, Kopf passend umetikettiert: abgewiesen (früher hielt der Kopf den Vergleichswert).
  const fremd = await verschluessele(L, signiertFuer(STELLE, 'AUF-ANDERS'), pub, { cty: 'JWT', vorgang: 'AUF-ANDERS' });
  await abgewiesen(L, async () => L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(fremd), await schluesselAus(L, text), ankerOpt(anker)), 'antwortSignaturFremderVorgang');
  // Antwort für diesen Vorgang unter einem anderen Kopf: angenommen, denn der Kopf ist nicht der Vergleichswert.
  const umetikettiert = await verschluessele(L, signiertFuer(STELLE), pub, { cty: 'JWT', vorgang: 'AUF-ANDERS' });
  const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(umetikettiert), await schluesselAus(L, text), ankerOpt(anker));
  assert.equal(r.signatur.zustand, 'signatur');
});

/* ══ Brüche der Kette ══ */

test('[Schlüssel·Anfrage·Bruch] eine ausgetauschte Anfrage fällt am Abdruck auf', async () => {
  const L = ladeLesen().V;
  const { text, pub, anker } = await schluesseldateiAusStudio();
  const s = await schluesselAus(L, text);
  const u = JSON.parse(s.anfrageText); u.anfrage.zweck = 'Etwas anderes';
  const jwe = await verschluessele(L, signiertFuer(STELLE), pub, { cty: 'JWT' });
  await abgewiesen(L, () => L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), { privateJwk: s.privateJwk, anfrageText: JSON.stringify(u, null, 2) }, ankerOpt(anker)), 'antwortSchluesselAnfrageBruch');
});

test('[Schlüssel·Anfrage·Bruch] eine Anfrage mit einem anderen Empfangsschlüssel passt nicht, auch mit stimmendem Abdruck', async () => {
  const L = ladeLesen().V;
  const eins = await schluesseldateiAusStudio();
  const zwei = await schluesseldateiAusStudio({ anker: eins.anker });
  const s1 = await schluesselAus(L, eins.text);
  const s2 = await schluesselAus(L, zwei.text);
  // Die Anfrage von zwei, ihr Abdruck in das JWK von eins geschrieben (wer das JWK hielte, könnte das): der Schlüssel passt nicht.
  const jwk = Object.assign({}, s1.privateJwk, { anfrageAbdruck: await L.empfangAnfrageAbdruck(s2.anfrageText) });
  const jwe = await verschluessele(L, signiertFuer(STELLE), eins.pub, { cty: 'JWT' });
  await abgewiesen(L, () => L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), { privateJwk: jwk, anfrageText: s2.anfrageText }, ankerOpt(eins.anker)), 'antwortSchluesselAnfrageBruch');
});

test('[Schlüssel·Anfrage·Bruch] fehlt einer der beiden Teile, öffnet nichts', async () => {
  const L = ladeLesen().V;
  const { text, pub, anker } = await schluesseldateiAusStudio();
  const s = await schluesselAus(L, text);
  const jwe = await verschluessele(L, signiertFuer(STELLE), pub, { cty: 'JWT' });
  await abgewiesen(L, () => L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), { privateJwk: s.privateJwk }, ankerOpt(anker)), 'antwortSchluesselAnfrageBruch');
  const ohneAbdruck = Object.assign({}, s.privateJwk); delete ohneAbdruck.anfrageAbdruck;
  await abgewiesen(L, () => L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), { privateJwk: ohneAbdruck, anfrageText: s.anfrageText }, ankerOpt(anker)), 'antwortSchluesselAnfrageBruch');
});

test('[Schlüssel·Anfrage·ohne Zertifikat] keine gebundene Kennung: kein Abgleich, der Vorgang kommt trotzdem aus der Anfrage', async () => {
  const L = ladeLesen().V;
  const { text, pub } = await schluesseldateiAusStudio({ mitZertifikat: false });
  const s = await schluesselAus(L, text);
  const andere = await verschluessele(L, signiertFuer('klinik/andere'), pub, { cty: 'JWT' });
  const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(andere), s, {});
  assert.equal(r.signatur.abgeglichen, false, 'ohne geprüfte Identität kein Abgleich — und kein „andere Stelle“');
  const fremd = await verschluessele(L, signiertFuer(STELLE, 'AUF-ANDERS'), pub, { cty: 'JWT', vorgang: 'AUF-ANDERS' });
  await abgewiesen(L, () => L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(fremd), s, {}), 'antwortSignaturFremderVorgang');
});

test('[Schlüssel·Anfrage] eine Antwort ohne Signatur öffnet mit der neuen Schlüsseldatei wie bisher', async () => {
  const L = ladeLesen().V;
  const { text, pub, anker } = await schluesseldateiAusStudio();
  const jwe = await verschluessele(L, JSON.stringify(datensatz()), pub, { cty: 'json' });
  const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), await schluesselAus(L, text), ankerOpt(anker));
  assert.equal(r.signatur.zustand, 'ohne');
  assert.equal(r.datensatz.felder[0].wert, 'Hedwig');
});

/* ══ Tagesregel ══ */

test('[Schlüssel·Anfrage·Tag] Ausstellungstag, Ablauftag und ein ganz innerhalb des Tages gültiges Zertifikat tragen; der Vortag nicht', async () => {
  const L = ladeLesen().V;
  const { V: G } = ladeGenerator();
  const anker = await edPaar(), stelle = await edPaar();
  const mit = async (zeit) => L._anfrageZertifikatZumTag(await zertifikat(G, anker, stelle, zeit), TAG, ankerOpt(anker));
  assert.ok(await mit({ validFrom: TAG + 'T15:00:00Z' }), 'ab dem Nachmittag gültig: der Ausstellungstag trägt');
  assert.ok(await mit({ expirationDate: TAG + 'T09:00:00Z' }), 'bis zum Vormittag gültig: der Ablauftag trägt');
  assert.ok(await mit({ validFrom: TAG + 'T08:00:00Z', expirationDate: TAG + 'T20:00:00Z' }), 'nur innerhalb des Tages gültig: trägt');
  assert.equal(await mit({ expirationDate: '2026-10-14T23:59:59Z' }), null, 'am Vortag abgelaufen: trägt nicht');
  assert.equal(await mit({ validFrom: '2026-10-16T00:00:00Z' }), null, 'erst ab dem Folgetag: trägt nicht');
  assert.equal(await L._anfrageZertifikatZumTag(await zertifikat(G, anker, stelle), '15.10.2026', ankerOpt(anker)), null, 'kein ISO-Tag: keine Bindung');
});

test('[Schlüssel·Anfrage·Tag] ein am Anfragetag abgelaufenes Zertifikat bindet weiter, ein am Vortag abgelaufenes nicht', async () => {
  const L = ladeLesen().V;
  const anker = await edPaar();
  const traegt = await schluesseldateiAusStudio({ anker, zeit: { expirationDate: TAG + 'T09:00:00Z' } });
  const jwe1 = await verschluessele(L, signiertFuer(STELLE), traegt.pub, { cty: 'JWT' });
  assert.equal((await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe1), await schluesselAus(L, traegt.text), ankerOpt(anker))).signatur.abgeglichen, true);
  const vortag = await schluesseldateiAusStudio({ anker, zeit: { expirationDate: '2026-10-14T12:00:00Z' } });
  const jwe2 = await verschluessele(L, signiertFuer(STELLE), vortag.pub, { cty: 'JWT' });
  assert.equal((await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe2), await schluesselAus(L, vortag.text), ankerOpt(anker))).signatur.abgeglichen, false);
});

/* ══ Sicherbarkeit: alte Lese-App, neue Datei — neue Lese-App, alte Datei ══ */

test('[Schlüssel·Anfrage·Sicherbarkeit] die ausgelieferte Lese-App v929 öffnet mit einer neuen Schlüsseldatei eine Antwort wie bisher', async () => {
  const html = require('node:zlib').gunzipSync(fs.readFileSync(V929)).toString('utf8');
  assert.equal(nodeCrypto.createHash('sha256').update(html, 'utf8').digest('hex'), V929_SHA256, 'die Fixture ist die ausgelieferte v929-Datei');
  const { text, pub } = await schluesseldateiAusStudio();
  // Der echte Lese-Weg der alten App, mit einem FileReader, der die Datei liefert.
  function FileReader() {}
  FileReader.prototype.readAsText = function (datei) { this.result = datei.inhalt; Promise.resolve().then(() => this.onload()); };
  const ALT = ladeLesen({ html, FileReader, exportHook: 'globalThis.__ALT__ = { antwortMitSchluesseldateiOeffnen, _antwortOeffnenJeFassung, antwortJweAlsUmschlag, entschluesseleSchluesselJwk, _jweConcatKdf };' }).V;
  const umschlag = ALT.antwortJweAlsUmschlag(await verschluessele(ALT, JSON.stringify(datensatz()), pub, { cty: 'json' }));
  const fehler = [];
  const ok = await ALT.antwortMitSchluesseldateiOeffnen(umschlag, { inhalt: text }, PW, (f) => fehler.push(f));
  assert.deepEqual(fehler, [], 'die alte App meldet nichts');
  assert.equal(ok, true);
  const jwk = await ALT.entschluesseleSchluesselJwk(JSON.parse(text), PW);
  const ds = await ALT._antwortOeffnenJeFassung(umschlag, { privateJwk: jwk });
  assert.equal(ds.felder[0].wert, 'Hedwig', 'derselbe Inhalt');
});

test('[Schlüssel·Anfrage·Sicherbarkeit] eine Schlüsseldatei ohne Anfrage (vor V3b) öffnet in der neuen Lese-App wie bisher', async () => {
  const L = ladeLesen().V;
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const alt = JSON.parse(JSON.stringify(await L.schuetzeSchluesselJwk(priv, PW)));
  const s = await schluesselAus(L, JSON.stringify(alt));
  assert.equal(s.anfrageText, undefined);
  const jwe = await verschluessele(L, signiertFuer('klinik/andere'), pub, { cty: 'JWT' });
  const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), s, {});
  assert.equal(r.signatur.zustand, 'signatur');
  assert.equal(r.signatur.abgeglichen, false, 'ohne getragene Anfrage kein Abgleich, wie vor V3b');
});

/* ══ Rot-Beweise ══ */

test('[Schlüssel·Anfrage·Rot-Beweis] ohne Weiterreichen der gebundenen Kennung ginge die fremde Antwort durch', async () => {
  const html = fs.readFileSync(LESEN_PATH, 'utf8');
  const zeile = '      ? { anbieterId: bindung.anbieterId, vorgang: bindung.vorgang }';
  assert.ok(html.includes(zeile), 'Vorbedingung: die Zeile steht im Öffnen-Weg');
  const L = ladeLesen({ html: html.replace(zeile, "      ? { anbieterId: '', vorgang: bindung.vorgang }") }).V;
  const { text, pub, anker } = await schluesseldateiAusStudio();
  const jwe = await verschluessele(L, signiertFuer('klinik/andere'), pub, { cty: 'JWT' });
  const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(jwe), await schluesselAus(L, text), ankerOpt(anker));
  assert.equal(r.signatur.zustand, 'signatur', 'die geschwächte Fassung nimmt die fremde Antwort an');
});

test('[Schlüssel·Anfrage·Rot-Beweis] mit dem Vorgang aus dem JWE-Kopf ginge die umetikettierte Antwort durch', async () => {
  const html = fs.readFileSync(LESEN_PATH, 'utf8');
  const zeile = '      ? { anbieterId: bindung.anbieterId, vorgang: bindung.vorgang }';
  const L = ladeLesen({ html: html.replace(zeile, "      ? { anbieterId: bindung.anbieterId, vorgang: String(offen.kopf.vorgang || '') }") }).V;
  const { text, pub, anker } = await schluesseldateiAusStudio();
  const fremd = await verschluessele(L, signiertFuer(STELLE, 'AUF-ANDERS'), pub, { cty: 'JWT', vorgang: 'AUF-ANDERS' });
  const r = await L.antwortOeffnenMitSignatur(L.antwortJweAlsUmschlag(fremd), await schluesselAus(L, text), ankerOpt(anker));
  assert.equal(r.signatur.zustand, 'signatur', 'die geschwächte Fassung nimmt die umetikettierte Antwort an');
});

test('[Schlüssel·Anfrage·Spiegel] der ANFRAGE-ABDRUCK-BLOCK steht in Studio und Lese-App zeichengleich', () => {
  const block = (p) => {
    const t = fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
    const a = t.indexOf('/* ══ ANFRAGE-ABDRUCK-BLOCK'), e = t.indexOf('/* ══ ENDE ANFRAGE-ABDRUCK-BLOCK ══ */');
    assert.ok(a >= 0 && e > a, 'Block in ' + p);
    return t.slice(a, e);
  };
  assert.equal(block('vivodepot-studio.html'), block('vivodepot-lesen.html'));
});
