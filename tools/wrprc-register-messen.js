#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   wrprc-register-messen.js — misst ein Register von Stellen (TS5-Lese-API) als Prüfstoff für U2-ADR-501 Punkt 18
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Gegenstand: die Antwort von GET <register>/wrp (ein vom Register signiertes JWS; die Nutzlast `data` ist die Liste der Stellen)
   und die Kette der Access-CA (<register>/pki/chain, PEM). Das Werkzeug misst, es bewertet nicht:
     · wie viele Stellen, wie viele mit Zugangszertifikat (accessCertificate.pem), wie viele Registrierungszertifikate (WRPRC);
     · je WRPRC den Kopf (typ, alg, Länge von x5c), die Signatur gegen x5c[0] (node:crypto, unabhängig vom Kern), die Formate in
       `credentials` und die Form eines dc+sd-jwt-Eintrags (`claim` oder `claims`), `status.status_list`, eine Zwischenstelle
       (`act` oder `intermediary`);
     · die Bindung: `sub` gegen den organizationIdentifier des Zugangszertifikats derselben Stelle (node:crypto liest ihn), dazu
       der nicht genormte Abdruck `wrpac_binding.certificate_sha256` gegen den SHA-256 des Zugangszertifikats;
     · jede Zugangskette durch den X.509-Leser des Kerns (_x509StellePruefen), die Access-CA als einziger Anker.
   Was der Kern einmal annehmen soll, entscheidet nicht dieses Werkzeug, sondern U2-ADR-501 und die Probe des Kern-Wagens.

     node tools/wrprc-register-messen.js                                   Fixtures (tests/fixtures/wrprc/), ohne Netz
     node tools/wrprc-register-messen.js --register <basis-url>            misst ein öffentliches Register, MIT Netz (von Hand)
     node tools/wrprc-register-messen.js --wrp <datei> --kette <pem>       misst gespeicherte Antworten
       [--zeitpunkt <ISO>] [--ausgabe <datei.json>]
   Vorgabe-Zeitpunkt: für die Fixtures 2026-11-04T12:00:00Z, sonst jetzt. Exit 0 gemessen · 2 Eingabe unlesbar.
   Das Netz braucht nur --register; die Suite fährt die Fixtures (Probe: tests/wrprc-pruefstoff.test.js).
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIX = path.join(REPO, 'tests', 'fixtures', 'wrprc');
const FIX_ZEITPUNKT = '2026-11-04T12:00:00Z';
const ALG_HASH = { ES256: 'sha256', ES384: 'sha384', ES512: 'sha512' };

function argumente(argv) {
  const a = { register: null, wrp: null, kette: null, zeitpunkt: null, ausgabe: null };
  for (let i = 0; i < argv.length; i++) {
    const n = argv[i];
    if (n === '--register') a.register = argv[++i];
    else if (n === '--wrp') a.wrp = argv[++i];
    else if (n === '--kette') a.kette = argv[++i];
    else if (n === '--zeitpunkt') a.zeitpunkt = argv[++i];
    else if (n === '--ausgabe') a.ausgabe = path.resolve(argv[++i]);
    else throw new Error('unbekanntes Argument: ' + n);
  }
  return a;
}

function jwsTeile(text) {
  const t = String(text).trim().split('.');
  if (t.length !== 3) throw new Error('kein JWS Compact');
  return { kopf: JSON.parse(Buffer.from(t[0], 'base64url')), nutzlast: JSON.parse(Buffer.from(t[1], 'base64url')), eingabe: t[0] + '.' + t[1], sig: Buffer.from(t[2], 'base64url') };
}

/* Signatur eines JWS gegen x5c[0], unabhängig vom Kern. → 'gueltig' | 'ungueltig' | 'nicht-pruefbar' */
function signaturGegenX5c(j) {
  try {
    const hash = ALG_HASH[j.kopf.alg];
    if (!hash || !Array.isArray(j.kopf.x5c) || !j.kopf.x5c.length) return 'nicht-pruefbar';
    const zert = new crypto.X509Certificate(Buffer.from(j.kopf.x5c[0], 'base64'));
    return crypto.verify(hash, Buffer.from(j.eingabe), { key: zert.publicKey, dsaEncoding: 'ieee-p1363' }, j.sig) ? 'gueltig' : 'ungueltig';
  } catch (_) { return 'nicht-pruefbar'; }
}

const pemListe = (text) => String(text).match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
const pemDer = (pem) => Buffer.from(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), 'base64');

/* organizationIdentifier (2.5.4.97) aus dem Inhaber, wie node:crypto ihn ausgibt; null, wenn keiner da ist. */
function orgKennung(der) {
  const s = new crypto.X509Certificate(der).subject;
  const m = /^(?:organizationIdentifier|2\.5\.4\.97)=(.*)$/m.exec(s);
  return m ? m[1].trim() : null;
}

const zaehle = (o, k) => { o[k] = (o[k] || 0) + 1; };

async function messen({ wrpText, ketteText, zeitpunkt, kern }) {
  const aussen = jwsTeile(wrpText);
  const stellen = Array.isArray(aussen.nutzlast.data) ? aussen.nutzlast.data : [];
  const anker = pemListe(ketteText).map((p) => new Uint8Array(pemDer(p)));
  const jetzt = Date.parse(zeitpunkt);
  const m = {
    zeitpunkt, aussenSignatur: signaturGegenX5c(aussen), seiten: aussen.nutzlast.pagination || null, ankerInKette: anker.length,
    stellen: stellen.length, mitZugangszertifikat: 0, wrprc: 0,
    kopfTyp: {}, kopfAlg: {}, x5cLaenge: {}, signatur: {}, formate: {}, sdJwtEintraege: 0, sdJwtAngabenFeld: {},
    mitStatusliste: 0, mitZwischenstelle: 0, bindungSub: {}, bindungAbdruck: {}, zugang: {},
  };
  for (const s of stellen) {
    const pem = s && s.accessCertificate && s.accessCertificate.pem;
    let zDer = null, zKennung = null;
    if (pem) {
      m.mitZugangszertifikat++;
      zDer = pemDer(pem);
      try { zKennung = orgKennung(zDer); } catch (_) { zKennung = null; }
      let r;
      try { r = await kern._x509StellePruefen([zDer.toString('base64')], anker, jetzt); } catch (e) { r = { gueltig: false, grund: 'warf' }; }
      zaehle(m.zugang, r.gueltig ? 'gueltig' : r.grund);
    }
    for (const rc of (s && s.registrationCertificates) || []) {
      m.wrprc++;
      let j;
      try { j = jwsTeile(rc.jws); } catch (_) { zaehle(m.signatur, 'form'); continue; }
      zaehle(m.kopfTyp, String(j.kopf.typ));
      zaehle(m.kopfAlg, String(j.kopf.alg));
      zaehle(m.x5cLaenge, String(Array.isArray(j.kopf.x5c) ? j.kopf.x5c.length : 0));
      zaehle(m.signatur, signaturGegenX5c(j));
      const n = j.nutzlast;
      for (const c of n.credentials || []) {
        zaehle(m.formate, String(c.format));
        if (c.format === 'dc+sd-jwt') { m.sdJwtEintraege++; zaehle(m.sdJwtAngabenFeld, 'claim' in c ? 'claim' : 'claims' in c ? 'claims' : 'keines'); }
      }
      if (n.status && n.status.status_list && Number.isInteger(n.status.status_list.idx) && typeof n.status.status_list.uri === 'string') m.mitStatusliste++;
      if (n.act || n.intermediary) m.mitZwischenstelle++;
      zaehle(m.bindungSub, !zDer ? 'ohne-zugangszertifikat' : n.sub === zKennung ? 'gleich' : 'ungleich');
      const abdruck = n.wrpac_binding && n.wrpac_binding.certificate_sha256;
      zaehle(m.bindungAbdruck, !abdruck ? 'fehlt' : !zDer ? 'ohne-zugangszertifikat'
        : abdruck === crypto.createHash('sha256').update(zDer).digest('hex') ? 'gleich' : 'ungleich');
    }
  }
  return m;
}

function kernLaden() {
  const { ladeKern } = require('../tests/load-kern.js');
  return ladeKern({ zusatzBindungen: ['_x509StellePruefen'] }).V.__zusatz;
}

async function holen(url) {
  const r = await fetch(url, { redirect: 'error' });
  if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
  return r.text();
}

async function main(argv, { schreiben = (t) => process.stdout.write(t), kern = null } = {}) {
  const a = argumente(argv);
  let wrpText, ketteText, zeitpunkt;
  try {
    if (a.register) {
      const basis = a.register.replace(/\/+$/, '');
      wrpText = await holen(basis + '/wrp');
      ketteText = await holen(basis + '/pki/chain');
      zeitpunkt = a.zeitpunkt || new Date().toISOString();
    } else {
      wrpText = fs.readFileSync(a.wrp || path.join(FIX, 'test-register-wrp.jwt'), 'utf8');
      ketteText = fs.readFileSync(a.kette || path.join(FIX, 'test-register-kette.crt'), 'utf8');
      zeitpunkt = a.zeitpunkt || (a.wrp ? new Date().toISOString() : FIX_ZEITPUNKT);
    }
  } catch (e) {
    schreiben('[wrprc-register-messen] Eingabe nicht lesbar: ' + e.message + '\n');
    return 2;
  }
  let m;
  try { m = await messen({ wrpText, ketteText, zeitpunkt, kern: kern || kernLaden() }); } catch (e) {
    schreiben('[wrprc-register-messen] Eingabe nicht lesbar: ' + e.message + '\n');
    return 2;
  }
  const text = JSON.stringify(m, null, 2) + '\n';
  if (a.ausgabe) fs.writeFileSync(a.ausgabe, text);
  schreiben(text);
  return 0;
}

module.exports = { messen, main, jwsTeile, signaturGegenX5c, orgKennung, FIX_ZEITPUNKT };
if (require.main === module) main(process.argv.slice(2)).then((c) => { process.exitCode = c; });
