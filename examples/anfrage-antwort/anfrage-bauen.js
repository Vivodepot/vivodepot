#!/usr/bin/env node
'use strict';
/* Example: build a data request (Anfrage) for a Vivodepot user, without any Vivodepot server.

   What it does
     1. Reads your request details (who asks, why, legal basis, case number, fields) from a JSON file.
     2. Checks every field ID against the public field register (feldregister.json). A field the register does not
        know is refused here: a request names existing fields only (docs/adr/…U2-ADR-409…).
     3. Prepares the return channel:
          · schluesselpaar  — generates a P-256 key pair; the public half goes into the request, the private half is
                              written to a file that only you keep (mode 600). The reply can be opened only with it.
          · einmalpasswort  — generates a one-time password. Give it to the person by another channel (paper, phone);
                              it is NOT written into the request.
     4. Writes the request as plain JSON and as a link fragment `#anfrage=<base64url(JSON)>`.

   The request is UNSIGNED. The app accepts it and shows the person an extra step that names who asks and where the
   reply goes (U2-ADR-152, point 6). Signing needs a provider certificate; this example does not imitate one.

   Usage
     node anfrage-bauen.js --register <feldregister.json> [--angaben <file>] [--art schluesselpaar|einmalpasswort]
                           [--aus <dir>] [--app <https address of the app>]

   Without --register it uses bereiche/feldkatalog.json of this repository (same `felder[].kennung` list).
   Node 22 or later, no dependencies. */
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');

const HIER = __dirname;
const ARTEN = ['schluesselpaar', 'einmalpasswort'];
// Keys that would carry personal values. A request names fields, never values (U2-ADR-152, point 1).
const WERT_SCHLUESSEL = ['wert', 'werte', 'value', 'inhalt', 'daten', 'betrifft', 'person'];

function argumente(argv) {
  const a = {
    angaben: path.join(HIER, 'beispiel-angaben.json'),
    register: path.join(HIER, '..', '..', 'bereiche', 'feldkatalog.json'),
    art: 'schluesselpaar',
    aus: path.join(process.cwd(), 'ausgabe'),
    app: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (!(k in a) || argv[i + 1] === undefined) throw new Error('unknown or incomplete argument: ' + argv[i]);
    a[k] = argv[++i];
  }
  if (!ARTEN.includes(a.art)) throw new Error('--art must be one of: ' + ARTEN.join(', '));
  return a;
}

/* The register as a map kennung → entry. Entries with status `obsoleted` are refused, `deprecated` ones are named. */
function registerLesen(datei) {
  const r = JSON.parse(fs.readFileSync(datei, 'utf8'));
  if (!r || !Array.isArray(r.felder)) throw new Error('not a field register (expected felder[]): ' + datei);
  return new Map(r.felder.map((f) => [f.kennung, f]));
}

function felderPruefen(felder, register) {
  const fehler = [], hinweise = [];
  if (!Array.isArray(felder) || !felder.length) fehler.push('felder: at least one field');
  for (const f of felder || []) {
    const eintrag = register.get(f && f.kennung);
    if (!f || typeof f.kennung !== 'string') fehler.push('a field without kennung');
    else if (!eintrag) fehler.push(f.kennung + ': not in the field register');
    else if (eintrag.status === 'obsoleted') fehler.push(f.kennung + ': obsoleted in the register');
    else if (eintrag.status === 'deprecated') hinweise.push(f.kennung + ': deprecated in the register');
    if (f && !(typeof f.zweck === 'string' && f.zweck.trim())) fehler.push((f.kennung || '?') + ': every field needs its own zweck');
  }
  return { fehler, hinweise };
}

function anfrageBauen(angaben, antwort, heute) {
  for (const k of Object.keys(angaben)) {
    if (WERT_SCHLUESSEL.includes(k)) throw new Error('a request carries no values: key "' + k + '"');
  }
  for (const k of ['von', 'zweck', 'grundlage', 'vorgang', 'gueltigBis']) {
    if (!(typeof angaben[k] === 'string' && angaben[k].trim())) throw new Error('missing: ' + k);
  }
  return {
    modulTyp: 'anfrage',
    anfrageVersion: 1,
    von: angaben.von,
    zweck: angaben.zweck,
    grundlage: angaben.grundlage,
    vorgang: angaben.vorgang,
    gestelltAm: heute,
    gueltigBis: angaben.gueltigBis,
    felder: angaben.felder.map((f) => ({ kennung: f.kennung, zweck: f.zweck, pflicht: f.pflicht !== false })),
    antwort,
  };
}

/* The return channel. The private key must be exportable here: it leaves this process as your key file, and you
   are the one who keeps it. Nothing else is exported. */
async function rueckweg(art) {
  if (art === 'schluesselpaar') {
    const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
    const privat = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
    return { antwort: { art, publicKeyJwk: { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y } }, privat };
  }
  // 18 random bytes → 24 base64url characters, grouped for reading aloud.
  const roh = Buffer.from(webcrypto.getRandomValues(new Uint8Array(18))).toString('base64url');
  return { antwort: { art }, passwort: roh.match(/.{1,6}/g).join('-') };
}

async function hauptprogramm(argv) {
  const a = argumente(argv);
  const angaben = JSON.parse(fs.readFileSync(a.angaben, 'utf8'));
  const pruefung = felderPruefen(angaben.felder, registerLesen(a.register));
  for (const h of pruefung.hinweise) console.warn('note: ' + h);
  if (pruefung.fehler.length) {
    for (const f of pruefung.fehler) console.error('error: ' + f);
    return 1;
  }
  const weg = await rueckweg(a.art);
  const anfrage = anfrageBauen(angaben, weg.antwort, new Date().toISOString().slice(0, 10));
  const fragment = '#anfrage=' + Buffer.from(JSON.stringify(anfrage), 'utf8').toString('base64url');

  fs.mkdirSync(a.aus, { recursive: true });
  fs.writeFileSync(path.join(a.aus, 'anfrage.json'), JSON.stringify(anfrage, null, 2) + '\n');
  fs.writeFileSync(path.join(a.aus, 'anfrage-link.txt'), (a.app ? a.app.replace(/#.*$/, '') : '') + fragment + '\n');
  if (weg.privat) {
    fs.writeFileSync(path.join(a.aus, 'antwort-schluessel.privat.jwk'), JSON.stringify(weg.privat) + '\n', { mode: 0o600 });
  }
  console.log('request:  ' + path.join(a.aus, 'anfrage.json'));
  console.log('link:     ' + path.join(a.aus, 'anfrage-link.txt') + (a.app ? '' : '  (prefix it with the address of the app)'));
  if (weg.privat) console.log('your key: ' + path.join(a.aus, 'antwort-schluessel.privat.jwk') + '  (keep it; do not send it)');
  if (weg.passwort) console.log('one-time password, give it to the person separately: ' + weg.passwort);
  return 0;
}

if (require.main === module) {
  hauptprogramm(process.argv.slice(2)).then((code) => { process.exitCode = code; },
    (e) => { console.error('error: ' + e.message); process.exitCode = 1; });
}
module.exports = { argumente, registerLesen, felderPruefen, anfrageBauen, rueckweg, hauptprogramm };
