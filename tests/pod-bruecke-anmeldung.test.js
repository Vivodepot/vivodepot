'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Pod-Brücke: Rücksprung der Anmeldung (pod/solid-oidc.js) gegen einen gestellten Aussteller
   ────────────────────────────────────────────────────────────────────────
   WAS DIESE PROBE HÄLT
     1. Der gute Rücksprung liefert die WebID; danach liegt kein Token in sessionStorage oder IndexedDB, und ein Erneuerungs-
        Token, das der Aussteller ungefragt schickt, wird nicht übernommen.
     2. ID-Token: falsche Signatur, fremder iss, fremde aud, falsche nonce, abgelaufen, alg none — jedes scheitert.
     3. WebID-Profil: nennt es den Aussteller nicht als solid:oidcIssuer (oder einen anderen), scheitert die Anmeldung.
     4. iss nach RFC 9207: kündigt der Aussteller ihn an, muss er dabeistehen und stimmen; ohne Ankündigung geht der Rücksprung
        ohne iss durch, ein ungefragt mitgeschickter falscher iss scheitert trotzdem.
     5. Der Anmeldevorgang ist einmal benutzbar: nach jedem Rücksprung, auch einem gescheiterten, ist er aus sessionStorage fort.
     6. Eine WebID mit Zeichen, die eine Zugriffsregel aufbrechen könnten, wird nie roh in eine Regel geschrieben.
   Die Seite läuft in einem vm-Kontext mit WebCrypto aus Node; fetch, IndexedDB, sessionStorage und location sind gestellt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'solid-oidc.js'), 'utf8');
const AUSSTELLER = 'https://anmeldung.example/';
const WEBID = 'https://person.example/profile/card#me';
const CLIENT = 'client-1';
const b64u = (b) => Buffer.from(b).toString('base64url');

function fakeIndexedDB() {
  const daten = new Map();
  return {
    daten,
    open() {
      const r = {};
      setImmediate(() => {
        r.result = {
          close() {},
          transaction() {
            const tx = {};
            tx.objectStore = () => ({
              get(k) { const q = { result: daten.get(k) }; return q; },
              put(v, k) { daten.set(k, v); },
              delete(k) { daten.delete(k); }
            });
            setImmediate(() => tx.oncomplete && tx.oncomplete());
            return tx;
          }
        };
        r.onsuccess && r.onsuccess();
      });
      return r;
    }
  };
}
function fakeSpeicher() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), get length() { return m.size; } };
}

async function schluesselpaar() {
  return webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
}
async function idToken(privat, kopf, last) {
  const e = b64u(JSON.stringify(kopf)) + '.' + b64u(JSON.stringify(last));
  const sig = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privat, Buffer.from(e));
  return e + '.' + b64u(sig);
}

/* Ein Lauf: baut den Aussteller nach `fall`, legt einen Anmeldevorgang ab und ruft ruecksprungVerarbeiten. */
async function lauf(fall = {}) {
  const aussteller = await schluesselpaar();
  const jwk = await webcrypto.subtle.exportKey('jwk', aussteller.publicKey);
  const fremd = await schluesselpaar();
  const jetzt = Math.floor(Date.now() / 1000);
  const last = Object.assign({ iss: AUSSTELLER, aud: CLIENT, iat: jetzt, exp: jetzt + 300, nonce: 'N', webid: WEBID, sub: WEBID }, fall.last || {});
  const kopf = Object.assign({ alg: 'ES256', kid: 'k1', typ: 'JWT' }, fall.kopf || {});
  let token = await idToken(fall.fremdSigniert ? fremd.privateKey : aussteller.privateKey, kopf, last);
  if (fall.algNone) token = b64u(JSON.stringify({ alg: 'none' })) + '.' + b64u(JSON.stringify(last)) + '.';
  const konf = Object.assign({
    issuer: AUSSTELLER, authorization_endpoint: AUSSTELLER + 'auth', token_endpoint: AUSSTELLER + 'token',
    jwks_uri: AUSSTELLER + 'jwks', registration_endpoint: AUSSTELLER + 'reg', code_challenge_methods_supported: ['S256']
  }, fall.konf || {});
  const profil = fall.profil !== undefined ? fall.profil
    : '@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n<#me> solid:oidcIssuer <' + AUSSTELLER + '>.\n';
  const antwort = Object.assign({ access_token: 'ZUGANG', token_type: 'DPoP', expires_in: 300, id_token: token }, fall.antwort || {});
  const gesendet = [];
  const fetch = async (adresse, o = {}) => {
    gesendet.push({ adresse: String(adresse), o });
    const json = (j, status = 200) => ({ ok: status < 400, status, headers: new Map(), json: async () => j, text: async () => JSON.stringify(j) });
    if (adresse === AUSSTELLER + '.well-known/openid-configuration') return json(konf);
    if (adresse === AUSSTELLER + 'jwks') return json({ keys: [Object.assign({ kid: 'k1', use: 'sig', alg: 'ES256' }, jwk)] });
    if (adresse === AUSSTELLER + 'token') return json(antwort);
    if (adresse === WEBID.split('#')[0]) return { ok: true, status: 200, text: async () => profil };
    return json({}, 404);
  };
  fetch.headersGet = true;
  const idb = fakeIndexedDB();
  const ss = fakeSpeicher();
  const suche = fall.suche !== undefined ? fall.suche : '?code=C&state=S';
  const kontext = {
    crypto: webcrypto, TextEncoder, TextDecoder, URL, URLSearchParams, Headers, Promise, JSON, Date, Math, Array, Object, String, Number, Error,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    fetch: async (a, o) => { const r = await fetch(a, o); if (!(r.headers instanceof Map)) return r; const h = r.headers; r.headers = { get: (k) => h.get(k) || null }; return r; },
    indexedDB: idb, sessionStorage: ss,
    location: { search: suche, origin: 'https://pod.vivodepot.de', pathname: '/bruecke.html', assign() {} },
    history: { replaceState() {} }
  };
  kontext.self = kontext;
  if (fall.probeSchalter) kontext.VD_POD_SPIKE = true;
  vm.createContext(kontext);
  vm.runInContext(fall.quelle || QUELLE, kontext);
  const A = kontext.vdPodAnmeldung;
  if (fall.vorgang !== null) ss.setItem('vd-pod-pkce', JSON.stringify(Object.assign({ verifier: 'V', state: 'S', nonce: 'N', aussteller: AUSSTELLER }, fall.vorgang || {})));
  idb.daten.set('client', { aussteller: AUSSTELLER, rueckspung: 'https://pod.vivodepot.de/bruecke.html', client_id: CLIENT });
  const dpop = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  idb.daten.set('dpop', dpop);
  let ergebnis, fehler;
  try { ergebnis = await A.ruecksprungVerarbeiten(); } catch (x) { fehler = x.message; }
  return { ergebnis, fehler, A, idb, ss, gesendet };
}

test('[Pod·Anmeldung] der gute Rücksprung liefert die WebID; kein Token bleibt liegen', async () => {
  const r = await lauf({ antwort: { refresh_token: 'UNGEFRAGT' } });
  assert.equal(r.fehler, undefined);
  assert.equal(r.ergebnis, WEBID);
  assert.equal(r.ss.length, 0, 'Anmeldevorgang gelöscht');
  const abgelegt = JSON.stringify([...r.idb.daten.entries()].filter(([k]) => k !== 'dpop'));
  assert.ok(!/ZUGANG|UNGEFRAGT/.test(abgelegt), 'kein Token in IndexedDB: ' + abgelegt);
  assert.deepEqual(Object.keys(await r.A.sitzung()).sort(), ['aussteller', 'webid']);
  const anfrage = r.gesendet.find((g) => g.adresse === AUSSTELLER + 'token');
  assert.equal(new URLSearchParams(anfrage.o.body).get('grant_type'), 'authorization_code');
});

test('[Pod·Anmeldung·Rot-Beweis] ID-Token: Signatur, iss, aud, nonce, Ablauf, alg none', async () => {
  const faelle = [
    [{ fremdSigniert: true }, 'id-token-signatur'],
    [{ last: { iss: 'https://andere.example/' } }, 'id-token-iss'],
    [{ last: { aud: 'fremder-client' } }, 'id-token-aud'],
    [{ last: { aud: [CLIENT, 'anderer'] } }, 'id-token-azp'],
    [{ last: { nonce: 'X' } }, 'id-token-nonce'],
    [{ last: { exp: Math.floor(Date.now() / 1000) - 10 } }, 'id-token-abgelaufen'],
    [{ last: { iat: Math.floor(Date.now() / 1000) + 3600 } }, 'id-token-iat'],
    [{ algNone: true }, 'id-token-alg'],
    [{ last: { webid: undefined } }, 'id-token-webid']
  ];
  for (const [fall, erwartet] of faelle) {
    const r = await lauf(fall);
    assert.equal(r.fehler, erwartet, JSON.stringify(fall));
    assert.equal(r.ss.length, 0, 'Anmeldevorgang auch nach Fehler gelöscht');
    assert.equal(await r.A.sitzung(), null);
  }
});

test('[Pod·Anmeldung·Rot-Beweis] ein Profil ohne diesen Aussteller als solid:oidcIssuer scheitert', async () => {
  assert.equal((await lauf({ profil: '<#me> a <http://xmlns.com/foaf/0.1/Person>.\n' })).fehler, 'webid-aussteller-nicht-im-profil');
  assert.equal((await lauf({ profil: '<#me> <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://andere.example/>.\n' })).fehler, 'webid-aussteller-nicht-im-profil');
  assert.equal((await lauf({ profil: '<#me> <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://anmeldung.example.boese.example/>.\n' })).fehler, 'webid-aussteller-nicht-im-profil');
  // ohne die Prüfung ginge ein fremdes Profil durch
  const ohne = QUELLE.replace('return ausstellerImProfil(last.webid, konf.issuer).then(function () { return last.webid; });', 'return last.webid;');
  assert.notEqual(ohne, QUELLE);
  assert.equal((await lauf({ profil: '<#me> a <http://xmlns.com/foaf/0.1/Person>.\n', quelle: ohne })).fehler, undefined);
  // die Langform und die Form ohne abschließenden Schrägstrich gelten
  assert.equal((await lauf({ profil: '<#me> <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://anmeldung.example>.\n' })).fehler, undefined);
});

test('[Pod·Anmeldung·K3] iss nach RFC 9207 nur, wenn angekündigt; ein falscher scheitert immer', async () => {
  const an = { authorization_response_iss_parameter_supported: true };
  assert.equal((await lauf({ konf: an, suche: '?code=C&state=S&iss=' + encodeURIComponent(AUSSTELLER) })).fehler, undefined);
  assert.equal((await lauf({ suche: '?code=C&state=S' })).fehler, undefined, 'ohne Ankündigung geht es ohne iss');
});
test('[Pod·Anmeldung·K3·Rot-Beweis] angekündigt und fehlend, angekündigt und falsch, ungefragt und falsch', async () => {
  const an = { authorization_response_iss_parameter_supported: true };
  assert.equal((await lauf({ konf: an, suche: '?code=C&state=S' })).fehler, 'iss-abweichend');
  assert.equal((await lauf({ konf: an, suche: '?code=C&state=S&iss=https%3A%2F%2Fandere.example%2F' })).fehler, 'iss-abweichend');
  assert.equal((await lauf({ suche: '?code=C&state=S&iss=https%3A%2F%2Fandere.example%2F' })).fehler, 'iss-abweichend');
  // ohne die Prüfung ginge der angekündigte, aber fehlende iss durch
  const ohne = QUELLE.replace("if (konf.authorization_response_iss_parameter_supported === true && q.get('iss') !== konf.issuer) throw new Error('iss-abweichend');", '');
  assert.notEqual(ohne, QUELLE);
  assert.equal((await lauf({ konf: an, suche: '?code=C&state=S', quelle: ohne })).fehler, undefined);
});

test('[Pod·Anmeldung·Rot-Beweis] state abweichend, kein Vorgang, zweiter Rücksprung mit demselben Code', async () => {
  assert.equal((await lauf({ vorgang: { state: 'ANDERS' } })).fehler, 'state-abweichend');
  assert.equal((await lauf({ vorgang: null })).fehler, 'kein-anmeldevorgang');
  const r = await lauf();
  assert.equal(r.fehler, undefined);
  let zweiter; try { await r.A.ruecksprungVerarbeiten(); } catch (x) { zweiter = x.message; }
  assert.equal(zweiter, 'kein-anmeldevorgang');
});

test('[Pod·Anmeldung] ohne Erneuerung: ein abgelaufenes Zugangs-Token verlangt die neue Anmeldung', async () => {
  assert.equal((await lauf()).A._probe, undefined, 'der Probe-Haken fehlt ohne Schalter');
  const r = await lauf({ probeSchalter: true });
  await r.A.speicherSetzen('https://person.example/');
  r.A._probe.zugangAblaufen();
  const vorher = r.gesendet.length;
  let f; try { await r.A.podFetch('https://person.example/x'); } catch (x) { f = x.message; }
  assert.equal(f, 'neu-anmelden');
  assert.equal(r.gesendet.length, vorher, 'keine Anfrage an den Aussteller oder den Pod');
});

test('[Pod·Anmeldung] Abmelden löscht Schlüssel, Registrierung, Vorgang und Sitzung', async () => {
  const r = await lauf();
  r.ss.setItem('vd-pod-pkce', '{}');
  assert.equal(await r.A.abmelden(), 'lokal-geloescht');
  assert.equal(r.idb.daten.has('dpop'), false);
  assert.equal(r.idb.daten.has('client'), false);
  assert.equal(r.ss.length, 0);
  assert.equal(await r.A.sitzung(), null);
});

/* Die WebID der Stelle wird in eine Zugriffsregel (Turtle) geschrieben. iri() aus pod/bruecke.js darf nie ein Zeichen
   durchlassen, das die Regel schließt und eine zweite anhängt. */
const BRUECKE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'bruecke.js'), 'utf8');
const iriQuelle = BRUECKE.match(/function iri\(s\) \{[\s\S]*?\n {2}\}/)[0];
const iri = new Function(iriQuelle + '; return iri;')();
test('[Pod·WebID·Rot-Beweis] eine WebID mit > oder Leerzeichen bricht keine Zugriffsregel auf', () => {
  for (const boese of ['https://x.example/a> ; acl:mode acl:Write .\n<#b', 'https://x.example/a>\n<#zwei> a acl:Authorization', 'https://x.example/"a"']) {
    let aus; try { aus = iri(boese); } catch (x) { aus = x.message; }
    assert.ok(aus === 'webid-form' || /^<[^<>"\s]+>$/.test(aus), boese + ' → ' + aus);
  }
  assert.throws(() => iri('javascript:alert(1)'), /webid-form/);
  assert.equal(iri('https://stelle.example/profile/card#me'), '<https://stelle.example/profile/card#me>');
});

/* Fund der Sec-Lesung vom 22.10.2026: Ein Aussteller, dessen `issuer` keinen abschließenden Schrägstrich trägt (die verbreitete
   Form), wurde beim Rücksprung als `https://anmeldung.example.well-known/…` gesucht, ein anderer Host; die Anmeldung brach ab. */
const OHNE = AUSSTELLER.replace(/\/$/, '');
test('[Pod·Anmeldung] ein Aussteller ohne abschließenden Schrägstrich: der Rücksprung findet seine Discovery', async () => {
  const r = await lauf({ konf: { issuer: OHNE }, last: { iss: OHNE }, vorgang: { aussteller: OHNE },
    profil: '<#me> <http://www.w3.org/ns/solid/terms#oidcIssuer> <' + OHNE + '>.\n' });
  assert.equal(r.fehler, undefined);
  assert.equal(r.ergebnis, WEBID);
  assert.ok(!r.gesendet.some((g) => /\.example\.well-known/.test(g.adresse)), 'keine Anfrage an einen falschen Host');
});

/* Niedrige Punkte derselben Lesung: Profil nicht als bloße Textsuche, azp auch bei einem aud, Endpunkte nur https. */
const SOLID = '@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n';
test('[Pod·Anmeldung] das Profil: Präfixform, Langform und ein zweiter Aussteller in einer Objektliste gelten', async () => {
  assert.equal((await lauf({ profil: SOLID + '<#me> solid:oidcIssuer <' + AUSSTELLER + '>.\n' })).fehler, undefined);
  assert.equal((await lauf({ profil: SOLID + '<#me> solid:oidcIssuer <https://andere.example/>, <' + AUSSTELLER + '>.\n' })).fehler, undefined);
});
test('[Pod·Anmeldung·Rot-Beweis] ein Satz in Kommentar oder Literal und ein umgebogenes Präfix gelten nicht', async () => {
  const nein = 'webid-aussteller-nicht-im-profil';
  assert.equal((await lauf({ profil: SOLID + '# <#me> solid:oidcIssuer <' + AUSSTELLER + '>.\n<#me> a <http://xmlns.com/foaf/0.1/Person>.\n' })).fehler, nein);
  assert.equal((await lauf({ profil: SOLID + '<#me> <http://xmlns.com/foaf/0.1/name> "solid:oidcIssuer <' + AUSSTELLER + '>".\n' })).fehler, nein);
  assert.equal((await lauf({ profil: SOLID + '<#me> <http://schema.org/description> """mehrzeilig\nsolid:oidcIssuer <' + AUSSTELLER + '>""".\n' })).fehler, nein);
  assert.equal((await lauf({ profil: '@prefix solid: <https://boese.example/ns#>.\n<#me> solid:oidcIssuer <' + AUSSTELLER + '>.\n' })).fehler, nein);
});
test('[Pod·Anmeldung·Rot-Beweis] azp bei einem einzelnen aud muss die eigene Registrierung nennen', async () => {
  assert.equal((await lauf({ last: { azp: 'fremder-client' } })).fehler, 'id-token-azp');
  assert.equal((await lauf({ last: { azp: CLIENT } })).fehler, undefined);
});
test('[Pod·Anmeldung·Rot-Beweis] ein Endpunkt der Discovery über http wird abgelehnt', async () => {
  assert.equal((await lauf({ konf: { token_endpoint: 'http://anmeldung.example/token' } })).fehler, 'endpunkt-nicht-https:token_endpoint');
  assert.equal((await lauf({ konf: { jwks_uri: 'http://anmeldung.example/jwks' } })).fehler, 'endpunkt-nicht-https:jwks_uri');
});
test('[Pod·Anmeldung] ohne Probenschalter erreicht die Seite nur das Verzeichnis, nicht Schlüssel und Registrierung', async () => {
  const r = await lauf();
  assert.equal(r.A._ablage, undefined);
  assert.deepEqual(Object.keys(r.A.verzeichnis).sort(), ['lesen', 'loeschen', 'schreiben']);
  assert.ok((await lauf({ probeSchalter: true })).A._ablage);
});
