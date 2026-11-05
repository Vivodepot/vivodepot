#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   pod-live-beleg.js — der einmalige Beleg der Pod-Brücke gegen einen echten Pod (27.10.2026, U2-ADR-512 und Nachtrag Stufe 2)
   ─────────────────────────────────────────────────────────────────
   Die Strecke gegen einen lokalen Community Solid Server (tests/e2e-pod/pod-bruecke.spec.js) läuft wiederholbar. Gegen einen
   gehosteten Pod gibt es dagegen einen einmaligen Lauf: Die Person legt aus dem Kern über die Brücke ab, holt ab und nimmt zurück.
   Dieses Werkzeug misst von außen, ohne Anmeldung, was dabei sichtbar sein muss, und wertet es aus. Es kennt kein Token und kein
   Passwort, und es schreibt nichts in den Pod.

   DAS PROTOKOLL (JSON, von der Person nach dem Lauf ausgefüllt; Pfade relativ zur Protokolldatei):
     { "fassung": 1, "issuer": "<Aussteller>", "webid": "<WebID der Person>", "webidStelle": "<WebID des zweiten Kontos>",
       "adressen": { "eigen": "<Adresse der Sicherung>", "stelle": "<Adresse der Freigabe an die Stelle>", "link": "<Adresse des Freigabe-Links>" },
       "dateien": { "eigenAbgelegt": "<Sicherungskopie aus dem Kern>", "eigenAbgeholt": "<in der Brücke abgeholt>",
                    "stelleAbgeholt": "<vom zweiten Konto abgeholt>", "linkAbgeholt": "<Freigabe-Link abgeholt>" } }
   Felder, die wie Zugangsdaten heißen, und Werte in der Form eines Tokens oder einer JWE weist das Werkzeug ab.

   ZWEI MESSUNGEN (je ein Lauf von --messen): „abgelegt“ direkt nach dem Ablegen, „zurueckgenommen“ nach der Rücknahme aller drei.
   Gemessen werden je Adresse Status und SHA-256 des Rumpfs ohne Anmeldung, beim Freigabe-Link auch sein Container, dazu das
   öffentliche WebID-Profil (Aussteller und Speicher) und die Kopfzeile Cross-Origin-Opener-Policy an der Anmeldeseite.

   WAS DER BELEG VERLANGT
     1. Alle Adressen https, ohne Zugangsdaten, im Speicher aus dem Profil; der Freigabe-Link mit einem Pfad aus 128 Bit Zufall.
     2. Das Profil nennt den Aussteller als solid:oidcIssuer, nach derselben Regel wie die Brücke (die Funktion wird aus
        pod/solid-oidc.js gelesen, nicht nachgebaut).
     3. Abgelegt: Sicherung und Freigabe an die Stelle ohne Anmeldung 401 oder 403; der Freigabe-Link 200 und byte-gleich mit dem
        Abgeholten; sein Container 401/403 oder ohne den Namen der Ressource.
     4. Die Sicherung (abgelegt über den Datei-Weg, Stufe 1) ist abgeholt byte-gleich. Jede abgeholte Datei besteht die Tür der
        Brücke für ihre Art (pod/chiffrat-pruefen.js, passtZurArt): Was das zweite Konto aus seiner Freigabe holt, ist Chiffrat
        in der Form des Kerns. Ob nur diese WebID liest, zeigt die Messung ohne Anmeldung (3) zusammen mit dem Abholen durch
        das zweite Konto; mehr sieht ein Werkzeug ohne Anmeldung nicht.
     5. Zurückgenommen: alle drei Adressen ohne Anmeldung 401, 403 oder 404, und kein Rumpf trägt einen Teil des Chiffrats.
     6. Die Anmeldeseite sendet kein Cross-Origin-Opener-Policy: same-origin (sonst riss Stufe 2 die Verbindung zum Kern ab).

   Aufruf:
     node tools/pod-live-beleg.js                                   wertet das eingebaute erfundene Beispiel aus (so läuft es in der Suite)
     node tools/pod-live-beleg.js --protokoll <p> --messen --aus <m>  misst ohne Anmeldung und schreibt die Messung
     node tools/pod-live-beleg.js --protokoll <p> --messung <m1> --messung <m2>   wertet aus; Exit 1 bei einem Befund
   Probe: tests/pod-live-beleg.test.js
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const ARTEN = Object.freeze(['eigen', 'stelle', 'link']);
const DATEIEN = Object.freeze(['eigenAbgelegt', 'eigenAbgeholt', 'stelleAbgeholt', 'linkAbgeholt']);
const PHASEN = Object.freeze(['abgelegt', 'zurueckgenommen']);
const GESCHUETZT = Object.freeze([401, 403]);
const WEG = Object.freeze([401, 403, 404]);

const TUER = require('../pod/chiffrat-pruefen.js');
const TUER_ART = Object.freeze({ eigenAbgeholt: 'eigen', stelleAbgeholt: 'stelle', linkAbgeholt: 'link' });
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

/* Die Profilregel der Brücke, aus ihrer Quelle gelesen: so misst der Beleg genau das, woran die Brücke scheitern würde. */
function profilRegelDerBruecke(quelle = fs.readFileSync(path.join(REPO, 'pod', 'solid-oidc.js'), 'utf8')) {
  const stueck = (name) => {
    const a = quelle.indexOf('function ' + name + '(');
    if (a < 0) throw new Error('pod/solid-oidc.js: ' + name + ' fehlt');
    let tiefe = 0; let i = quelle.indexOf('{', a);
    for (; i < quelle.length; i++) { if (quelle[i] === '{') tiefe++; else if (quelle[i] === '}' && --tiefe === 0) break; }
    return quelle.slice(a, i + 1);
  };
  const kontext = {};
  vm.runInNewContext(stueck('turtleOhneKommentarUndLiteral') + '\n' + stueck('ausstellerDerWebid') + '\nthis.f = ausstellerDerWebid;', kontext);
  return (text) => Array.from(kontext.f(text));   // aus dem fremden Kontext als gewöhnliches Array
}

/* Der Speicher aus dem Profil, mit jedem Präfix, das auf den pim-Namensraum zeigt (der Community Solid Server schreibt `space:`). */
function speicherAusProfil(text, webid) {
  const t = text || '';
  const praefixe = [...t.matchAll(/(?:@prefix|PREFIX)\s+([A-Za-z][\w-]*)?:\s*<http:\/\/www\.w3\.org\/ns\/pim\/space#>/gi)].map((x) => x[1] || '');
  const namen = ['<http:\\/\\/www\\.w3\\.org\\/ns\\/pim\\/space#storage>', ...praefixe.map((p) => p + ':storage')];
  const m = new RegExp('(?:' + namen.join('|') + ')\\s+<([^>]+)>').exec(t);
  if (!m) return null;
  try { return new URL(m[1], webid).href; } catch (_) { return null; }
}

/* Keine Zugangsdaten und kein Chiffrat im Protokoll. */
const GEHEIM_NAME = /token|passw|secret|geheim|schluessel|schlüssel|key|authori|cookie|session|dpop|code_verifier/i;
const GEHEIM_WERT = /^eyJ[\w-]*\.[\w-]*\./;
function geheimesImProtokoll(o, pfad = []) {
  const funde = [];
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (GEHEIM_NAME.test(k)) funde.push([...pfad, k].join('.'));
      funde.push(...geheimesImProtokoll(v, [...pfad, k]));
    }
  } else if (typeof o === 'string' && GEHEIM_WERT.test(o)) funde.push(pfad.join('.') + ' (Wert in Token- oder JWE-Form)');
  return funde;
}

function adresseBefunde(name, adresse, speicher) {
  let u;
  try { u = new URL(adresse); } catch (_) { return [name + ': keine Adresse']; }
  const b = [];
  if (u.protocol !== 'https:') b.push(name + ': nicht https');
  if (u.username || u.password) b.push(name + ': Zugangsdaten in der Adresse');
  if (speicher && !u.href.startsWith(speicher)) b.push(name + ': nicht im Speicher aus dem Profil (' + speicher + ')');
  return b;
}
function containerVon(adresse) { const u = new URL(adresse); u.pathname = u.pathname.replace(/[^/]+$/, ''); u.search = ''; u.hash = ''; return u.href; }
function letzterTeil(adresse) { return new URL(adresse).pathname.split('/').pop(); }

/* Rein: Protokoll, Hashes der Dateien und die zwei Messungen → Befunde (leer = Beleg erbracht). */
function pruefen({ protokoll, hashes, inhalte = {}, messungen, regel = profilRegelDerBruecke() }) {
  const b = [];
  if (!protokoll || protokoll.fassung !== 1) return ['Protokoll: fassung 1 erwartet'];
  for (const g of geheimesImProtokoll(protokoll)) b.push('Protokoll trägt Zugangsdaten oder Chiffrat: ' + g);
  for (const f of ['issuer', 'webid', 'webidStelle']) if (typeof protokoll[f] !== 'string' || !protokoll[f]) b.push('Protokoll: ' + f + ' fehlt');
  for (const a of ARTEN) if (!protokoll.adressen || typeof protokoll.adressen[a] !== 'string') b.push('Protokoll: Adresse ' + a + ' fehlt');
  for (const d of DATEIEN) if (!hashes || !hashes[d]) b.push('Datei ' + d + ' fehlt');
  if (b.length) return b;

  const nach = Object.fromEntries((messungen || []).map((m) => [m.phase, m]));
  for (const p of PHASEN) if (!nach[p]) b.push('Messung „' + p + '“ fehlt');
  if (b.length) return b;
  const ab = nach.abgelegt; const zu = nach.zurueckgenommen;

  // 1 und 2: Profil, Speicher, Adressen
  const aussteller = regel(ab.profil || '');
  if (aussteller.indexOf(protokoll.issuer.replace(/\/$/, '')) < 0) b.push('Profil: der Aussteller steht nicht als solid:oidcIssuer darin (die Brücke scheiterte an der Anmeldung)');
  const speicher = speicherAusProfil(ab.profil, protokoll.webid);
  if (!speicher) b.push('Profil: kein pim:storage');
  for (const a of ARTEN) b.push(...adresseBefunde('Adresse ' + a, protokoll.adressen[a], speicher));
  if (!/^[A-Za-z0-9_-]{22,}$/.test(letzterTeil(protokoll.adressen.link))) b.push('Freigabe-Link: der Pfad trägt keine 128 Bit Zufall');

  // 3: abgelegt
  const s = (m, a) => (m.adressen && m.adressen[a]) || {};
  for (const a of ['eigen', 'stelle']) if (!GESCHUETZT.includes(s(ab, a).status)) b.push('abgelegt: ' + a + ' ohne Anmeldung ' + s(ab, a).status + ' statt 401/403');
  if (s(ab, 'link').status !== 200) b.push('abgelegt: Freigabe-Link ohne Anmeldung ' + s(ab, 'link').status + ' statt 200');
  else if (s(ab, 'link').sha256 !== hashes.linkAbgeholt) b.push('abgelegt: der Freigabe-Link liefert andere Bytes als abgeholt');
  const c = ab.container || {};
  if (!(GESCHUETZT.includes(c.status) || (c.status === 200 && c.nenntRessource === false))) b.push('abgelegt: der Container des Freigabe-Links ist öffentlich und nennt die Ressource (oder ungemessen)');

  // 4: byte-gleich
  if (hashes.eigenAbgelegt !== hashes.eigenAbgeholt) b.push('Sicherung: abgeholt ist nicht byte-gleich mit abgelegt');
  for (const [d, art] of Object.entries(TUER_ART)) {
    const t = inhalte[d];
    if (typeof t !== 'string' || !TUER.passtZurArt(t, art, Buffer.byteLength(t, 'utf8'))) b.push(d + ': besteht die Tür der Brücke für „' + art + '“ nicht (kein Chiffrat in der Form des Kerns)');
  }

  // 5: zurückgenommen
  for (const a of ARTEN) {
    if (!WEG.includes(s(zu, a).status)) b.push('zurückgenommen: ' + a + ' ohne Anmeldung ' + s(zu, a).status + ' statt 401/403/404');
    if (s(zu, a).traegtChiffrat !== false) b.push('zurückgenommen: der Rumpf von ' + a + ' trägt einen Teil des Chiffrats (oder ungemessen)');
  }

  // 6: Anmeldeseite
  if (typeof ab.coop !== 'string') b.push('Anmeldeseite: Cross-Origin-Opener-Policy ungemessen');
  else if (/^\s*same-origin\s*(;|$)/i.test(ab.coop)) b.push('Anmeldeseite sendet Cross-Origin-Opener-Policy: same-origin');
  return b;
}

function protokollLesen(datei) {
  const protokoll = JSON.parse(fs.readFileSync(datei, 'utf8'));
  const basis = path.dirname(path.resolve(datei));
  const hashes = {}; const inhalte = {};
  for (const d of DATEIEN) {
    const p = protokoll.dateien && protokoll.dateien[d];
    if (typeof p !== 'string') continue;
    try { const buf = fs.readFileSync(path.resolve(basis, p)); hashes[d] = sha256(buf); inhalte[d] = buf.toString('utf8'); } catch (_) { /* fehlt: Befund in pruefen */ }
  }
  return { protokoll, hashes, inhalte };
}

/* Teile des Chiffrats, nach denen ein Rumpf nach der Rücknahme gesucht wird: je Datei ein Stück aus der Mitte. */
function chiffratTeile(inhalte) {
  return Object.values(inhalte).filter((t) => t && t.length >= 96).map((t) => t.slice(Math.floor(t.length / 2) - 24, Math.floor(t.length / 2) + 24));
}

/* Misst ohne Anmeldung. fetch ist einsetzbar, damit die Probe ohne Netz läuft. */
async function messen({ protokoll, inhalte, phase, abruf = fetch }) {
  if (!PHASEN.includes(phase)) throw new Error('--phase abgelegt oder zurueckgenommen');
  const holen = async (url, kopf = {}) => {
    const r = await abruf(url, { redirect: 'manual', credentials: 'omit', headers: kopf });
    const t = await r.text().catch(() => '');
    return { status: r.status, text: t, kopf: r.headers };
  };
  const teile = chiffratTeile(inhalte);
  const m = { fassung: 1, phase, gemessen: new Date().toISOString(), adressen: {} };
  for (const a of ARTEN) {
    const r = await holen(protokoll.adressen[a]);
    m.adressen[a] = { status: r.status, sha256: sha256(Buffer.from(r.text, 'utf8')), traegtChiffrat: teile.some((x) => r.text.includes(x)) };
  }
  const c = await holen(containerVon(protokoll.adressen.link), { Accept: 'text/turtle' });
  m.container = { status: c.status, nenntRessource: c.text.includes(letzterTeil(protokoll.adressen.link)) };
  if (phase === 'abgelegt') {
    m.profil = (await holen(protokoll.webid.split('#')[0], { Accept: 'text/turtle' })).text;
    const disc = await holen(protokoll.issuer.replace(/\/$/, '') + '/.well-known/openid-configuration');
    let ziel = null; try { ziel = JSON.parse(disc.text).authorization_endpoint; } catch (_) { ziel = null; }
    m.coop = ziel ? ((await holen(ziel)).kopf.get('cross-origin-opener-policy') || '') : null;
  }
  return m;
}

/* Das erfundene Beispiel eines vollständigen Belegs, im Werkzeug statt als Dateien: Protokoll, Dateiinhalte und zwei Messungen.
   Die Depot-Dateien trennen „VIVODEPOT“ und Hülle mit einem Zeilenumbruch statt mit dem Steuerzeichen des Kerns; die Tür der
   Brücke liest beides gleich. */
function beispiel() {
  const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  const depot = (salz) => 'VIVODEPOT\n' + JSON.stringify({ kryptoVersion: 3, depotUUID: 'erfunden-' + salz, pbkdf2: { salt: b64u('salz-' + salz), iterations: 600000 },
    depotSalt: b64u('depot-' + salz), iv: b64u('iv-' + salz), ct: b64u('erfundenes-chiffrat-'.repeat(6) + salz) }, null, 2);
  const link = [b64u({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }), '', b64u('iv-iv-iv-iv'), b64u('erfundenes-link-chiffrat-'.repeat(6)), b64u('tag-tag-tag-tag')].join('.');
  const inhalte = { eigenAbgelegt: depot('sicherung'), eigenAbgeholt: depot('sicherung'), stelleAbgeholt: depot('stelle'), linkAbgeholt: link };
  const hashes = Object.fromEntries(Object.entries(inhalte).map(([k, v]) => [k, sha256(Buffer.from(v, 'utf8'))]));
  const S = 'https://pod.beispiel.test/erna-probe/';
  const protokoll = { fassung: 1, issuer: 'https://pod.beispiel.test/', webid: S + 'profile/card#me', webidStelle: 'https://pod.beispiel.test/stelle-probe/profile/card#me',
    adressen: { eigen: S + 'vivodepot/sicherungen/sicherung-2026-10-27.vivodepot', stelle: S + 'vivodepot/freigaben/Q2hhbmdlTWVQbGVhc2VYeQ', link: S + 'vivodepot/links/bm9jaE5pY2h0UmF0YmFyMTI' } };
  const profil = '@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n@prefix space: <http://www.w3.org/ns/pim/space#>.\n# erfundenes Profil\n' +
    '<#me> solid:oidcIssuer <https://pod.beispiel.test/>;\n  space:storage </erna-probe/>.\n';
  const leer = sha256(Buffer.from('', 'utf8'));
  const zu = (status) => ({ status, sha256: leer, traegtChiffrat: false });
  const messungen = [
    { fassung: 1, phase: 'abgelegt', gemessen: '2026-10-27T12:00:00.000Z', adressen: { eigen: zu(401), stelle: zu(401), link: { status: 200, sha256: hashes.linkAbgeholt, traegtChiffrat: true } },
      container: { status: 401, nenntRessource: false }, profil, coop: '' },
    { fassung: 1, phase: 'zurueckgenommen', gemessen: '2026-10-27T12:10:00.000Z', adressen: { eigen: zu(401), stelle: zu(401), link: zu(401) },
      container: { status: 401, nenntRessource: false } },
  ];
  return { protokoll, hashes, inhalte, messungen };
}

function main(argv = process.argv.slice(2)) {
  const wert = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const alle = (n) => argv.reduce((a, x, i) => (x === n && argv[i + 1] ? a.concat(argv[i + 1]) : a), []);
  const pDatei = wert('--protokoll');
  if (!pDatei) {
    const befunde = pruefen(beispiel());
    if (befunde.length) { for (const x of befunde) console.error('BEFUND ' + x); return Promise.resolve(1); }
    console.log('pod-live-beleg: OK — das eingebaute Beispiel ist ein vollständiger Beleg.');
    return Promise.resolve(0);
  }
  const gelesen = protokollLesen(pDatei);
  if (argv.includes('--messen')) {
    const aus = wert('--aus');
    if (!aus) { console.error('pod-live-beleg: --aus <datei> fehlt'); return Promise.resolve(2); }
    const geheim = geheimesImProtokoll(gelesen.protokoll);
    if (geheim.length) { console.error('pod-live-beleg: ABBRUCH, das Protokoll trägt Zugangsdaten: ' + geheim.join(', ')); return Promise.resolve(1); }
    return messen({ ...gelesen, phase: wert('--phase') || 'abgelegt' }).then((m) => {
      fs.writeFileSync(aus, JSON.stringify(m, null, 1) + '\n');
      console.log('pod-live-beleg: Messung „' + m.phase + '“ geschrieben: ' + aus);
      return 0;
    });
  }
  const mDateien = alle('--messung');
  const messungen = mDateien.map((d) => JSON.parse(fs.readFileSync(d, 'utf8')));
  const befunde = pruefen({ ...gelesen, messungen });
  if (befunde.length) { for (const x of befunde) console.error('BEFUND ' + x); console.error('pod-live-beleg: ' + befunde.length + ' Befund(e).'); return Promise.resolve(1); }
  console.log('pod-live-beleg: OK — Ablegen, Freigabe, Link und Rücknahme sind von außen belegt.');
  return Promise.resolve(0);
}

if (require.main === module) main().then((rc) => { process.exitCode = rc; });
module.exports = { pruefen, messen, geheimesImProtokoll, profilRegelDerBruecke, speicherAusProfil, protokollLesen, chiffratTeile, containerVon, beispiel, PHASEN };
