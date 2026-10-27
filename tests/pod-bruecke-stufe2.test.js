'use strict';
/* ═════════════════════════════════════════════════════════════════
   Test — Pod-Brücke, Stufe 2: Übergabe aus der Anwendung per postMessage (pod/bruecke.js, Nachtrag zu U2-ADR-512)
   ─────────────────────────────────────────────────────────────────
   WAS DIESE PROBE HÄLT
     1. Bereit meldet sich die Brücke erst nach Anmeldung und bestätigtem Ziel.
     2. Ein Auftrag des öffnenden Fensters wird gezeigt, abgelegt erst nach dem Klick; die Antwort geht nur an dieses Fenster,
        an seine Herkunft, mit genau typ, fassung, id, adresse.
     3. Verworfen ohne Antwort: ein anderes Fenster, eine unbekannte Herkunft, ein Auftrag vor der Ziel-Bestätigung, Klartext,
        ein Chiffrat der falschen Art, ein Zusatzfeld, eine falsche id, kein ArrayBuffer, kein gültiges UTF-8, ein abgelaufenes
        oder fehlendes `bis`.
     4. Herkunft 'null' (Kern vom Stick): der Satz sagt „ohne erkennbare Herkunft“ und warnt; die Antwort trägt nur die Adresse.
     5. Ein Auftrag je Laden; ein Klick in den ersten 800 ms nach dem Erscheinen gilt nicht; nach `bis` legt die Seite auch nach dem Klick nicht ab; eine Stelle ohne gültige WebID schreibt
        nichts in den Pod.
     6. Rot-Beweise: ohne die Prüfung auf das öffnende Fenster nähme die Brücke den Auftrag eines fremden Fensters an; ohne die
        Prüfung der Herkunft den einer fremden Seite.
   bruecke.js läuft in einem vm-Kontext; Anmeldung und Pod sind gestellt, die Chiffrat-Tür ist die echte.
   ═════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const C = require('../pod/chiffrat-pruefen.js');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'bruecke.js'), 'utf8');
const KONFIG = fs.readFileSync(path.join(__dirname, '..', 'pod', 'konfiguration.js'), 'utf8');
const WEBID = 'https://person.example/profile/card#me';
const SPEICHER = 'https://speicher.example/person/';
const DEPOT = 'VIVODEPOT\u0001' + JSON.stringify({ kryptoVersion: 3, depotUUID: 'u', pbkdf2: { salt: 's', iterations: 600000 }, depotSalt: 'd', iv: 'i', ct: 'c' });
const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const SHL = [b64u({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }), '', b64u('iv'), b64u('c'), b64u('tag')].join('.');
const ID = 'A'.repeat(22);
const KERN = 'https://privat-de.vivodepot.org';
const puffer = (s) => { const u = new TextEncoder().encode(s); return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); };

async function seite({ quelle = QUELLE, zielBestaetigen = true } = {}) {
  const elemente = {};
  const el = (id) => (elemente[id] = elemente[id] || { id, hidden: false, textContent: '', value: '', onclick: null, onchange: null, files: [], appendChild() {} });
  const anfragen = [];
  const anOpener = [];
  const opener = { postMessage: (n, ziel) => anOpener.push({ n, ziel }) };
  const fremd = { postMessage: () => { throw new Error('nichts an ein fremdes Fenster'); } };
  let hoerer = null;
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
    window: { opener, addEventListener: (t, f) => { if (t === 'message') hoerer = f; } },
    fetch: async () => ({ ok: true, text: async () => '<#me> <http://www.w3.org/ns/pim/space#storage> <' + SPEICHER + '>.\n' }),
    crypto: webcrypto, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), Blob, URL, Promise, Date, Number, String, Error, Uint8Array, JSON,
    ArrayBuffer, TextDecoder, Object
  };
  kontext.self = kontext;
  vm.createContext(kontext);
  vm.runInContext(KONFIG, kontext);
  vm.runInContext(quelle, kontext);
  await new Promise((r) => setTimeout(r, 20));
  if (zielBestaetigen) { el('ziel-ja').onclick(); await new Promise((r) => setTimeout(r, 20)); }
  const senden = (source, origin, data) => hoerer({ source, origin, data });
  const warten = () => new Promise((r) => setTimeout(r, 20));
  // Die Brücke nimmt einen Klick erst KLICK_SPERRE_MS nach dem Erscheinen des Auftrags an.
  const ja = async () => { await new Promise((r) => setTimeout(r, 850)); el('auftrag-ja').onclick(); await warten(); };
  return { el, ja, anfragen, anOpener, opener, fremd, senden, warten, puts: () => anfragen.filter((a) => a.methode === 'PUT' && !a.adresse.endsWith('/') && !a.adresse.endsWith('.acl')) };
}
const auftrag = (art, text, extra) => Object.assign({ typ: 'vd-pod-ablegen', fassung: 1, id: ID, art, bis: Date.now() + 600000, daten: puffer(text) }, extra || {});

test('[Stufe2] bereit erst mit bestätigtem Ziel; Auftrag gezeigt, abgelegt nach dem Klick, Antwort nur an den Öffner', async () => {
  const ohne = await seite({ zielBestaetigen: false });
  assert.deepEqual(ohne.anOpener, [], 'ohne bestätigtes Ziel meldet sich die Brücke nicht bereit');
  const s = await seite();
  assert.deepEqual(s.anOpener.map((x) => x.n.typ), ['vd-pod-bereit']);
  s.senden(s.opener, KERN, auftrag('eigen', DEPOT));
  assert.equal(s.el('auftrag').hidden, false);
  assert.match(s.el('auftrag-satz').textContent, /^Vivodepot möchte eine verschlüsselte Sicherung \(nur für Sie lesbar\)/);
  assert.doesNotMatch(s.el('auftrag-satz').textContent, /legen Sie nichts ab/, 'bei bekannter Herkunft keine Warnung');
  assert.equal(s.puts().length, 0, 'vor dem Klick wird nichts abgelegt');
  s.el('auftrag-ja').onclick();
  await s.warten();
  assert.equal(s.puts().length, 0, 'ein Klick sofort nach dem Erscheinen gilt nicht (Klicksperre)');
  assert.equal(s.el('auftrag').hidden, false, 'der Auftrag steht weiter');
  await s.ja();
  assert.equal(s.puts().length, 1);
  const antwort = s.anOpener.find((x) => x.n.typ === 'vd-pod-abgelegt');
  assert.ok(antwort, 'die Adresse geht zurück');
  assert.equal(antwort.ziel, KERN, 'an die Herkunft des Auftrags');
  assert.deepEqual(Object.keys(antwort.n).sort(), ['adresse', 'fassung', 'id', 'typ']);
  assert.equal(antwort.n.id, ID);
  assert.ok(antwort.n.adresse.startsWith(SPEICHER + 'vivodepot/sicherungen/'));
  await s.ja();
  assert.equal(s.puts().length, 1, 'ein Auftrag je Klick, kein zweites Ablegen');
});

test('[Stufe2] verworfen ohne Antwort: fremdes Fenster, vor dem Ziel, Klartext, falsche Art, Zusatzfeld, falsche id, falsche Form', async () => {
  const vorZiel = await seite({ zielBestaetigen: false });
  vorZiel.senden(vorZiel.opener, KERN, auftrag('eigen', DEPOT));
  assert.equal(vorZiel.el('auftrag-satz').textContent, '', 'vor der Ziel-Bestätigung entsteht kein Auftrag');
  const s = await seite();
  const faelle = [
    [s.fremd, auftrag('eigen', DEPOT), 'fremdes Fenster'],
    [s.opener, auftrag('eigen', DEPOT, { bis: Date.now() - 1 }), 'abgelaufenes bis'],
    [s.opener, auftrag('eigen', DEPOT, { bis: undefined }), 'bis fehlt'],
    [s.opener, auftrag('eigen', DEPOT, { bis: '9999999999999' }), 'bis keine Zahl'],
    [s.opener, auftrag('eigen', JSON.stringify({ name: 'Klartext' })), 'Klartext'],
    [s.opener, auftrag('eigen', SHL), 'ein Freigabe-Link ist keine Sicherung'],
    [s.opener, auftrag('link', DEPOT), 'eine Depot-Datei ist kein Freigabe-Link'],
    [s.opener, auftrag('eigen', DEPOT, { extra: 1 }), 'Zusatzfeld'],
    [s.opener, auftrag('eigen', DEPOT, { id: 'kurz' }), 'falsche id'],
    [s.opener, auftrag('eigen', DEPOT, { daten: DEPOT }), 'kein ArrayBuffer'],
    [s.opener, auftrag('eigen', DEPOT, { daten: new Uint8Array([0xff, 0xfe]).buffer }), 'kein UTF-8'],
    [s.opener, auftrag('klartext', DEPOT), 'unbekannte Art'],
    [s.opener, auftrag('eigen', DEPOT, { fassung: 2 }), 'andere Fassung'],
  ];
  for (const [quelle, daten, was] of faelle) {
    s.senden(quelle, KERN, daten);
    assert.equal(s.el('auftrag-satz').textContent, '', was + ' wird verworfen');
  }
  s.senden(s.opener, 'https://boese.example', auftrag('link', SHL));
  assert.equal(s.el('auftrag-satz').textContent, '', 'eine unbekannte Herkunft wird verworfen');
  assert.equal(s.anOpener.filter((x) => x.n.typ !== 'vd-pod-bereit').length, 0, 'keine Antwort');
});

test('[Stufe2] Herkunft null (vom Stick): der Satz sagt es, die Antwort trägt nur die Adresse', async () => {
  const s = await seite();
  s.senden(s.opener, 'null', auftrag('eigen', DEPOT));
  assert.match(s.el('auftrag-satz').textContent, /ohne erkennbare Herkunft/);
  assert.match(s.el('auftrag-satz').textContent, /legen Sie nichts ab\.$/, 'die Warnung steht dabei');
  await s.ja();
  const antwort = s.anOpener.find((x) => x.n.typ === 'vd-pod-abgelegt');
  assert.equal(antwort.ziel, '*');
  assert.deepEqual(Object.keys(antwort.n).sort(), ['adresse', 'fassung', 'id', 'typ']);
});

test('[Stufe2] ein Auftrag je Laden; nach bis kein Ablegen; eine Stelle ohne gültige WebID schreibt nichts', async () => {
  const s = await seite();
  s.senden(s.opener, KERN, auftrag('eigen', DEPOT));
  const satz = s.el('auftrag-satz').textContent;
  s.senden(s.opener, KERN, auftrag('link', SHL, { id: 'B'.repeat(22) }));
  assert.equal(s.el('auftrag-satz').textContent, satz, 'der zweite Auftrag ersetzt den gezeigten nicht');
  const spaet = await seite();
  spaet.senden(spaet.opener, KERN, auftrag('eigen', DEPOT, { bis: Date.now() + 30 }));
  assert.match(spaet.el('auftrag-satz').textContent, /möchte/);
  await new Promise((r) => setTimeout(r, 60));
  await spaet.ja();
  assert.equal(spaet.puts().length, 0, 'nach bis wird nicht abgelegt');
  assert.equal(spaet.el('fehler').textContent, 'auftrag-abgelaufen');
  const st = await seite();
  st.el('stelle').value = 'keine webid';
  st.senden(st.opener, KERN, auftrag('stelle', DEPOT));
  await st.ja();
  assert.deepEqual(st.anfragen.filter((a) => a.methode === 'PUT'), [], 'ohne gültige WebID geht kein PUT hinaus, auch kein Ordner');
  assert.equal(st.anOpener.filter((x) => x.n.typ === 'vd-pod-abgelegt').length, 0);
});

test('[Stufe2·Rot-Beweis] ohne die Prüfung der Herkunft nähme die Brücke den Auftrag einer fremden Seite an', async () => {
  const stelle = "if (!bekannt && e.origin !== 'null') return;";
  assert.equal(QUELLE.split(stelle).length, 2, 'die Prüfung steht genau einmal');
  const s = await seite({ quelle: QUELLE.replace(stelle, '') });
  s.senden(s.opener, 'https://boese.example', auftrag('link', SHL));
  assert.match(s.el('auftrag-satz').textContent, /möchte/, 'ROT ohne Prüfung: der Auftrag der fremden Seite steht zur Bestätigung');
});

test('[Stufe2·Rot-Beweis] ohne die Prüfung auf das öffnende Fenster nähme die Brücke einen fremden Auftrag an', async () => {
  const stelle = 'if (!window.opener || e.source !== window.opener) return;';
  assert.equal(QUELLE.split(stelle).length, 2, 'die Prüfung steht genau einmal');
  const s = await seite({ quelle: QUELLE.replace(stelle, '') });
  // Ein anderes Fenster derselben bekannten Herkunft (etwa ein zweiter Tab): nur die Fensterprüfung hält es ab.
  s.senden(s.fremd, KERN, auftrag('eigen', DEPOT));
  assert.match(s.el('auftrag-satz').textContent, /möchte/, 'ROT ohne Prüfung: der fremde Auftrag steht zur Bestätigung');
});
