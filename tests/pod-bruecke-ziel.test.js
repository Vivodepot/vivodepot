'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Pod-Brücke: die Person bestätigt den Speicher, bevor die Brücke dort schreibt (pod/bruecke.js)
   ────────────────────────────────────────────────────────────────────────
   Der Speicher kommt aus dem öffentlichen Profil (pim:storage), also aus fremdem Text. Die Brücke zeigt ihn nach der Anmeldung
   und schreibt oder löscht dort erst nach dem Klick „Ja, das ist mein Speicher“.
   WAS DIESE PROBE HÄLT
     1. Vor dem Klick: ablegen() lehnt mit ziel-nicht-bestaetigt ab; kein PUT, kein DELETE am Pod; der Ablagebereich ist zu.
     2. Nach dem Klick: dieselbe Ablage geht an den Pod.
     3. Rot-Beweis: ohne die Prüfung in ablegen() ginge der PUT ohne Klick hinaus.
     4. Die Tür je Art (passtZurArt) gilt auch beim Weg über die Datei: ein Freigabe-Link ist keine Ablage für eine Stelle
        (Rot-Beweis: ohne die Tür ginge er hinaus).
   bruecke.js läuft in einem vm-Kontext; Anmeldung und Pod sind gestellt, die Chiffrat-Tür ist die echte.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const C = require('../pod/chiffrat-pruefen.js');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'bruecke.js'), 'utf8');
const WEBID = 'https://person.example/profile/card#me';
const SPEICHER = 'https://speicher.example/person/';
const DEPOT = 'VIVODEPOT\u0001' + JSON.stringify({ kryptoVersion: 3, depotUUID: 'u', pbkdf2: { salt: 's', iterations: 600000 }, depotSalt: 'd', iv: 'i', ct: 'c' });
const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const STELLE = 'https://stelle.example/profile/card#me';
const SHL = [b64u({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }), '', b64u('iv'), b64u('c'), b64u('tag')].join('.');
const ANTWORT = [b64u({ alg: 'PBES2-HS512+A256KW', enc: 'A256GCM', p2c: 600000, p2s: 'x', typ: 't', cty: 'json', vorgang: 'v' }), b64u('ek'), b64u('iv'), b64u('c'), b64u('tag')].join('.');

async function seite(quelle = QUELLE) {
  const elemente = {};
  const el = (id) => (elemente[id] = elemente[id] || { id, hidden: false, textContent: '', value: '', onclick: null, onchange: null, files: [], appendChild() {} });
  const anfragen = [];
  const A = {
    ruecksprungVerarbeiten: async () => WEBID,
    sitzung: async () => ({ webid: WEBID }),
    speicherSetzen: async () => {},
    abmelden: async () => 'lokal-geloescht',
    podFetch: async (adresse, o = {}) => {
      anfragen.push({ adresse, methode: (o.method || 'GET').toUpperCase() });
      return { ok: true, status: o.method === 'HEAD' ? 200 : 201, headers: { get: () => null }, json: async () => null, text: async () => '' };
    },
    verzeichnis: { lesen: async () => undefined, schreiben: async () => {}, loeschen: async () => {} }
  };
  const kontext = {
    vdPodAnmeldung: A, vdPodChiffrat: C, vdPodLws: require('../pod/lws.js'),
    document: { readyState: 'complete', getElementById: el, createElement: () => el('neu-' + Math.random()) },
    fetch: async () => ({ ok: true, text: async () => '<#me> <http://www.w3.org/ns/pim/space#storage> <' + SPEICHER + '>.\n' }),
    crypto: webcrypto, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), Blob, URL, Promise, Date, Number, String, Error, Uint8Array, JSON
  };
  kontext.self = kontext;
  vm.createContext(kontext);
  vm.runInContext(quelle, kontext);
  await new Promise((r) => setTimeout(r, 20));
  return { B: kontext.vdPodBruecke, el, anfragen, schreibend: () => anfragen.filter((a) => a.methode !== 'GET' && a.methode !== 'HEAD') };
}

test('[Pod·Ziel] vor dem Klick legt die Brücke nichts ab und löscht nichts; nach dem Klick schon', async () => {
  const s = await seite();
  assert.equal(s.el('ziel').hidden, false, 'der Speicher wird gezeigt');
  assert.equal(s.el('ziel-adresse').textContent, SPEICHER + 'vivodepot/');
  assert.equal(s.el('ablage-bereich').hidden, true);
  let f; try { await s.B.ablegen(DEPOT, 'eigen'); } catch (x) { f = x.message; }
  assert.equal(f, 'ziel-nicht-bestaetigt');
  assert.deepEqual(s.schreibend(), []);
  s.el('ziel-ja').onclick();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(s.el('ablage-bereich').hidden, false);
  const adresse = await s.B.ablegen(DEPOT, 'eigen');
  assert.ok(adresse.startsWith(SPEICHER + 'vivodepot/sicherungen/'), adresse);
  assert.ok(s.schreibend().some((a) => a.methode === 'PUT' && a.adresse === adresse));
});

test('[Pod·Ziel·Rot-Beweis] ohne die Prüfung in ablegen() ginge der PUT ohne Klick hinaus', async () => {
  const ohne = QUELLE.replace("if (!zielGilt(s, wurzel)) throw new Error('ziel-nicht-bestaetigt');", '');
  assert.notEqual(ohne, QUELLE);
  const s = await seite(ohne);
  await s.B.ablegen(DEPOT, 'eigen');
  assert.ok(s.schreibend().some((a) => a.methode === 'PUT'));
});

test('[Pod·Ziel] die Tür je Art gilt auch beim Weg über die Datei', async () => {
  const s = await seite();
  s.el('ziel-ja').onclick();
  await new Promise((r) => setTimeout(r, 10));
  let f; try { await s.B.ablegen(ANTWORT, 'link'); } catch (x) { f = x.message; }
  assert.equal(f, 'link-nur-fuer-shl');
  // ein Freigabe-Link (SHL) ist keine Form für eine Stelle: das fängt erst die Tür je Art
  f = undefined; try { await s.B.ablegen(SHL, 'stelle', STELLE); } catch (x) { f = x.message; }
  assert.equal(f, 'passt-nicht-zur-art');
  assert.ok((await s.B.ablegen(ANTWORT, 'stelle', STELLE)).startsWith(SPEICHER + 'vivodepot/freigaben/'));
});
test('[Pod·Ziel·Rot-Beweis] ohne die Tür je Art ginge ein Freigabe-Link als Ablage für eine Stelle hinaus', async () => {
  const ohne = QUELLE.replace("if (!C.passtZurArt(text, art, new Blob([text]).size)) return Promise.reject(new Error('passt-nicht-zur-art'));", '');
  assert.notEqual(ohne, QUELLE);
  const s = await seite(ohne);
  s.el('ziel-ja').onclick();
  await new Promise((r) => setTimeout(r, 10));
  assert.ok((await s.B.ablegen(SHL, 'stelle', STELLE)).startsWith(SPEICHER));
});
