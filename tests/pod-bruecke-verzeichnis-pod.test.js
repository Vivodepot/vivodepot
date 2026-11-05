'use strict';
/* ═════════════════════════════════════════════════════════════════
   Test — Pod-Brücke: das Verzeichnis der Ablagen liegt zusätzlich im eigenen Pod (pod/bruecke.js; Befund
   POD-ABMELDEN-VERLIERT-ABLAGEN, Teil 2; Nachtrag zu U2-ADR-512 Nr. 9)
   ─────────────────────────────────────────────────────────────────
   WAS DIESE PROBE HÄLT
     1. Nach Abmelden, gelöschten Website-Daten oder auf einem zweiten Gerät kennt die Brücke die Ablagen wieder, sobald die
        Person sich anmeldet und ihren Speicher bestätigt: eine inzwischen abgelaufene Ablage wird gelöscht, Grant und Ressource.
     2. Die Kopie liegt unter vivodepot/intern/verzeichnis.json und trägt genau die Felder der Positivliste unten. Bei `link` ist
        die Adresse die Fähigkeit; ein Teil des SHL-Links oder ein Schlüssel aus dem Fragment steht nie darin.
     3. intern/ wird zuerst angelegt und auf die Person allein gesetzt (regelEigen mit Vererbung). Scheitert diese Regel, schreibt
        die Brücke keine Kopie (fail-closed).
     4. Nach der Bestätigung gilt die Kopie im Pod. Ein Eintrag, den nur dieses Gerät kennt, kommt nur hinzu, wenn seine Ressource
        noch besteht (HEAD 200). Zwei Geräte: was eines zurücknimmt, holt das andere nicht zurück; schreiben beide nacheinander,
        geht keine Ablage verloren (If-Match, bei 412 neu lesen).
     5. Vor der Bestätigung liest und schreibt die Brücke die Kopie nicht.
     6. Eine veränderte Kopie bringt die Brücke nicht dazu, etwas außerhalb ihrer Ordner zu löschen; fremde Felder fallen weg.
     Rot-Beweise: ohne den Abgleich nach der Bestätigung bleibt die abgelaufene Ablage liegen; mit einer Vereinigung ohne
     HEAD-Prüfung holt ein Gerät die Rücknahme des anderen zurück; ohne die Regel vor dem Schreiben läge die Kopie ungeschützt.
   bruecke.js läuft in einem vm-Kontext; Anmeldung und Pod sind gestellt, der Pod hält Zustand und ETags.
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
const KOPIE = SPEICHER + 'vivodepot/intern/verzeichnis.json';
const INTERN = SPEICHER + 'vivodepot/intern/';
const TAG = 86400000;
// Positivliste der Felder in der Kopie (Bedingung (a) der Gegenlesung Krypto, 28.10.2026). Wer ein Feld hinzunimmt, ändert
// diese Zeile und holt dafür die Gegenlesung.
const FELDER = ['adresse', 'art', 'stelle', 'bis', 'am', 'grant', 'ueberDienst'];

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
// Wie in tests/pod-bruecke-ziel.test.js: die Antwort-JWE, die die Tür für eine Stelle annimmt.
const SHL = [b64u({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }), '', b64u('iv'), b64u('c'), b64u('tag')].join('.');
const ANTWORT = [b64u({ alg: 'PBES2-HS512+A256KW', enc: 'A256GCM', p2c: 600000, p2s: 'x', typ: 't', cty: 'json', vorgang: 'v' }), b64u('ek'), b64u('iv'), b64u('c'), b64u('tag')].join('.');

function podStellen({ aclScheitert = () => false, headStatus = () => null } = {}) {
  const res = new Map();      // adresse → { koerper, etag }
  const acl = new Map();      // adresse → Regeln
  let n = 0;
  const ablauf = [];
  const antwort = (status, { koerper = null, etag = null } = {}) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: (k) => (k === 'ETag' ? etag : null) },
    json: async () => (typeof koerper === 'string' ? JSON.parse(koerper) : koerper), text: async () => String(koerper || '')
  });
  async function podFetch(adresse, o = {}) {
    const methode = (o.method || 'GET').toUpperCase();
    const h = o.headers || {};
    ablauf.push(methode + ' ' + adresse);
    if (adresse.endsWith('.acl')) {
      const ziel = adresse.slice(0, -4);
      if (methode === 'PUT') { if (aclScheitert(ziel)) return antwort(403); acl.set(ziel, o.body); return antwort(201); }
      return antwort(acl.has(ziel) ? 200 : 404);
    }
    const r = res.get(adresse);
    if (methode === 'HEAD' && headStatus(adresse)) return antwort(headStatus(adresse));
    if (methode === 'HEAD' || methode === 'GET') return r ? antwort(200, { koerper: r.koerper, etag: r.etag }) : antwort(404);
    if (methode === 'PUT') {
      if (h['If-None-Match'] === '*' && r) return antwort(412);
      if (h['If-Match'] && (!r || h['If-Match'] !== r.etag)) return antwort(412);
      const etag = '"' + (++n) + '"';
      res.set(adresse, { koerper: o.body === undefined ? '' : o.body, etag });
      return antwort(r ? 204 : 201, { etag });
    }
    if (methode === 'DELETE') { const da = res.delete(adresse); acl.delete(adresse); return antwort(da ? 204 : 404); }
    return antwort(405);
  }
  return { res, acl, ablauf, podFetch, kopie: () => (res.has(KOPIE) ? JSON.parse(res.get(KOPIE).koerper) : null) };
}

/* Ein Laden der Seite auf einem Gerät: `speicher` ist dessen IndexedDB (lokales Verzeichnis) und überdauert das Neuladen;
   der Pod ist allen Geräten gemeinsam. */
async function geraet(pod, { quelle = QUELLE, zielBestaetigen = true, speicher = { lokal: undefined } } = {}) {
  const elemente = {};
  const el = (id) => (elemente[id] = elemente[id] || { id, hidden: false, textContent: '', value: '', onclick: null, onchange: null, files: [], appendChild() {} });
  let abgemeldet = false;
  const A = {
    ruecksprungVerarbeiten: async () => WEBID,
    sitzung: async () => (abgemeldet ? null : { webid: WEBID }),
    speicherSetzen: async () => {},
    abmelden: async () => { abgemeldet = true; return 'lokal-geloescht'; },
    podFetch: (adresse, o) => pod.podFetch(adresse, o),
    verzeichnis: {
      lesen: async () => (speicher.lokal ? speicher.lokal.slice() : undefined),
      schreiben: async (v) => { speicher.lokal = v.slice(); },
      loeschen: async () => { speicher.lokal = undefined; }
    }
  };
  const kontext = {
    vdPodAnmeldung: A, vdPodChiffrat: C, vdPodLws: require('../pod/lws.js'),
    document: { readyState: 'complete', getElementById: el, createElement: () => el('neu-' + Math.random()), body: { dataset: {} } },
    window: { opener: null, addEventListener: () => {} },
    fetch: async () => ({ ok: true, text: async () => '<#me> <http://www.w3.org/ns/pim/space#storage> <' + SPEICHER + '>.\n' }),
    crypto: webcrypto, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), Blob, URL, Promise, Date, Number, String, Error, Uint8Array, JSON,
    ArrayBuffer, TextDecoder, Object, Array
  };
  kontext.self = kontext;
  vm.createContext(kontext);
  vm.runInContext(KONFIG, kontext);
  vm.runInContext(quelle, kontext);
  const warten = () => new Promise((r) => setTimeout(r, 20));
  await warten();
  const g = {
    el, warten, B: kontext.vdPodBruecke,
    lokal: () => speicher.lokal,
    lokalSetzen: (v) => { speicher.lokal = v.slice(); },
    async bestaetigen() { el('ziel-ja').onclick(); await warten(); },
    async klick(id) { await el(id).onclick(); await warten(); },
    // Neu laden und anmelden: dieselbe IndexedDB, ein neuer Seitenzustand ohne bestätigtes Ziel.
    neuLaden: () => geraet(pod, { quelle, zielBestaetigen: false, speicher })
  };
  if (zielBestaetigen) await g.bestaetigen();
  return g;
}

/* Eine Ablage für eine Stelle mit Ablauf in `tage` Tagen; danach den Ablauf in der Kopie und lokal vorziehen. */
async function ablegenStelle(g) {
  return g.B.ablegen(ANTWORT, 'stelle', 'https://stelle.example/profile#id', 1, {});
}
function ablaufVorziehen(pod, g, adresse) {
  const k = pod.kopie();
  k.ablagen.forEach((e) => { if (e.adresse === adresse) e.bis = Date.now() - TAG; });
  const r = pod.res.get(KOPIE); pod.res.set(KOPIE, { koerper: JSON.stringify(k), etag: r.etag });
  if (g.lokal()) g.lokalSetzen(g.lokal().map((e) => (e.adresse === adresse ? Object.assign({}, e, { bis: Date.now() - TAG }) : e)));
}

test('[Pod·Kopie] eine Ablage schreibt die Kopie nach intern/, mit genau den Feldern der Positivliste, nach der Regel', async () => {
  const pod = podStellen();
  let g = await geraet(pod);
  const adresse = await ablegenStelle(g);
  const link = await g.B.ablegen(SHL, 'link', '', null, {});
  const k = pod.kopie();
  assert.equal(k.fassung, 1);
  assert.deepEqual(k.ablagen.map((e) => e.adresse), [adresse, link]);
  for (const e of k.ablagen) {
    assert.deepEqual(Object.keys(e).sort(), FELDER.slice().sort(), 'genau die Felder der Positivliste');
    assert.ok(!e.adresse.includes('#') && !(e.grant || '').includes('#'), 'kein Fragment an Adresse oder Grant');
  }
  const koerper = pod.res.get(KOPIE).koerper;
  assert.ok(!/shlink:|"key"|"k":/.test(koerper), 'kein SHL-Link, kein Schlüssel');
  assert.ok(!koerper.includes(SHL) && !koerper.includes(ANTWORT), 'kein Chiffrat in der Kopie');
  const regel = pod.acl.get(INTERN);
  assert.ok(regel, 'intern/ trägt eine Regel');
  assert.match(regel, /acl:agent <https:\/\/person\.example\/profile\/card#me>/);
  assert.match(regel, /acl:default <https:\/\/speicher\.example\/person\/vivodepot\/intern\/>/);
  assert.ok(!/agentClass|stelle\.example/.test(regel), 'nur die WebID der Person');
  const i = pod.ablauf.indexOf('PUT ' + INTERN + '.acl');
  assert.ok(i >= 0 && i < pod.ablauf.lastIndexOf('PUT ' + KOPIE), 'die Regel steht, bevor die Kopie geschrieben wird');
});

test('[Pod·Kopie] abmelden, Ablagen lassen, neu anmelden: die inzwischen abgelaufene Ablage wird gelöscht', async () => {
  const pod = podStellen();
  let g = await geraet(pod);
  const adresse = await ablegenStelle(g);
  const grant = pod.kopie().ablagen[0].grant;
  assert.ok(pod.res.has(adresse) && pod.res.has(grant));
  await g.klick('abmelden');
  assert.match(g.el('abmelden-satz').textContent, /Liste davon liegt in Ihrem Pod/);
  await g.klick('abmelden-lassen');
  assert.equal(g.lokal(), undefined, 'lokal gelöscht');
  ablaufVorziehen(pod, g, adresse);
  g = await g.neuLaden();
  await g.bestaetigen();
  assert.ok(!pod.res.has(adresse), 'Ressource gelöscht');
  assert.ok(!pod.res.has(grant), 'Grant gelöscht');
  assert.deepEqual(pod.kopie().ablagen, [], 'die Kopie ist leer');
  assert.deepEqual(g.lokal(), []);
});

test('[Pod·Kopie] ein zweites Gerät mit leerem Browser kennt die Ablagen nach der Bestätigung und kann zurücknehmen', async () => {
  const pod = podStellen();
  let a = await geraet(pod);
  const adresse = await ablegenStelle(a);
  let b = await geraet(pod);
  assert.deepEqual(b.lokal().map((e) => e.adresse), [adresse]);
  await b.B.zuruecknehmen(adresse);
  assert.ok(!pod.res.has(adresse));
  assert.deepEqual(pod.kopie().ablagen, []);
});

test('[Pod·Kopie] zwei Geräte schreiben nacheinander: keine Ablage geht verloren', async () => {
  const pod = podStellen();
  let a = await geraet(pod);
  let b = await geraet(pod);
  const x = await ablegenStelle(a);
  const y = await ablegenStelle(b);   // b hält das ETag von vor x: 412, neu lesen, dieselbe Änderung noch einmal
  assert.deepEqual(pod.kopie().ablagen.map((e) => e.adresse).sort(), [x, y].sort());
  assert.ok(pod.ablauf.some((z, i) => z === 'PUT ' + KOPIE && pod.ablauf.slice(i + 1).includes('GET ' + KOPIE)), 'nach dem Konflikt neu gelesen');
});

test('[Pod·Kopie] was ein Gerät zurücknimmt, holt das andere nicht zurück; was nur lokal und noch da ist, kommt hinzu', async () => {
  const pod = podStellen();
  let a = await geraet(pod);
  const x = await ablegenStelle(a);
  let b = await geraet(pod);
  assert.deepEqual(b.lokal().map((e) => e.adresse), [x]);
  await a.B.zuruecknehmen(x);
  // b kennt x noch lokal; nach einem Neuladen bestätigt b wieder.
  b = await b.neuLaden();
  await b.bestaetigen();
  assert.deepEqual(pod.kopie().ablagen, [], 'x kommt nicht zurück in die Kopie');
  assert.deepEqual(b.lokal(), [], 'und verschwindet auch lokal');
  // Umgekehrt: die Kopie ist verloren, die Ressource steht noch: der lokale Eintrag kommt hinzu.
  const y = await ablegenStelle(a);
  pod.res.delete(KOPIE);
  a = await a.neuLaden();
  await a.bestaetigen();
  assert.deepEqual(pod.kopie().ablagen.map((e) => e.adresse), [y]);
});

test('[Pod·Kopie] scheitert die Regel für intern/, schreibt die Brücke keine Kopie', async () => {
  const pod = podStellen({ aclScheitert: (ziel) => ziel === INTERN });
  let g = await geraet(pod);
  await assert.rejects(ablegenStelle(g), /acl-403/);
  assert.equal(pod.res.has(KOPIE), false, 'keine ungeschützte Kopie');
  assert.ok(!pod.ablauf.includes('PUT ' + KOPIE));
});

test('[Pod·Kopie] vor der Bestätigung liest und schreibt die Brücke die Kopie nicht', async () => {
  const pod = podStellen();
  let g = await geraet(pod, { zielBestaetigen: false });
  g.lokalSetzen([{ adresse: SPEICHER + 'vivodepot/links/l', art: 'link', stelle: null, bis: null, am: 1, grant: null, ueberDienst: null }]);
  await g.klick('ziel-nein');
  assert.ok(!pod.ablauf.some((z) => z.endsWith(KOPIE)), 'die Kopie wird nicht angefasst');
});

test('[Pod·Kopie] eine veränderte Kopie: fremde Adressen und Felder fallen weg, gelöscht wird nur in den eigenen Ordnern', async () => {
  const pod = podStellen();
  const fremd = [
    { adresse: 'https://anderswo.example/x', art: 'eigen', stelle: null, bis: 1, am: 1, grant: null, ueberDienst: null },
    { adresse: SPEICHER + 'vivodepot/intern/verzeichnis.json', art: 'eigen', stelle: null, bis: 1, am: 1, grant: null, ueberDienst: null },
    { adresse: SPEICHER + 'vivodepot/links/a#schluessel', art: 'link', stelle: null, bis: 1, am: 1, grant: null, ueberDienst: null },
    { adresse: SPEICHER + 'vivodepot/freigaben/b', art: 'stelle', stelle: 'https://stelle.example/#id', bis: 1, am: 1, grant: 'https://anderswo.example/g', ueberDienst: false },
    { adresse: SPEICHER + 'vivodepot/sicherungen/c', art: 'unbekannt', stelle: null, bis: 1, am: 1, grant: null, ueberDienst: null }
  ];
  const gut = { adresse: SPEICHER + 'vivodepot/sicherungen/d', art: 'eigen', stelle: null, bis: Date.now() + TAG, am: 1, grant: null, ueberDienst: null, geheim: 'x' };
  pod.res.set(KOPIE, { koerper: JSON.stringify({ fassung: 1, ablagen: fremd.concat([gut]) }), etag: '"k"' });
  pod.res.set(gut.adresse, { koerper: 'c', etag: '"d"' });
  let g = await geraet(pod);
  assert.ok(!pod.ablauf.some((z) => z.startsWith('DELETE ')), 'nichts gelöscht, obwohl die fremden Einträge abgelaufen wären');
  assert.deepEqual(g.lokal().map((e) => e.adresse), [gut.adresse]);
  assert.deepEqual(Object.keys(g.lokal()[0]).sort(), FELDER.slice().sort(), 'das fremde Feld fällt weg');
});

/* Ein nur lokaler Eintrag, dessen Prüfung mit 500 scheitert: Die Brücke ändert nichts und sagt es. */
async function abgleichScheitert(quelle) {
  let kaputt = null;
  const pod = podStellen({ headStatus: (adresse) => (adresse === kaputt ? 500 : null) });
  let g = await geraet(pod, { quelle });
  const y = await ablegenStelle(g);
  pod.res.delete(KOPIE);
  kaputt = y;
  g = await g.neuLaden();
  await g.bestaetigen();
  return { pod, g, y };
}

test('[Pod·Kopie] scheitert die Prüfung eines nur lokalen Eintrags (HEAD 500), bleibt alles, wie es war, und die Seite sagt es', async () => {
  const { pod, g, y } = await abgleichScheitert(QUELLE);
  assert.equal(pod.res.has(KOPIE), false, 'keine Kopie geschrieben');
  assert.deepEqual([...g.lokal().map((e) => e.adresse)], [y], 'das lokale Verzeichnis bleibt');
  assert.ok(pod.res.has(y), 'nichts im Pod gelöscht');
  assert.match(g.el('fehler').textContent, /^Die Liste der Ablagen ließ sich nicht abgleichen\. Nichts wurde geändert, abgelaufene Ablagen sind noch nicht gelöscht\./);
  assert.doesNotMatch(g.el('fehler').textContent, /kopie-pruefen/);
  assert.equal(g.el('ablage-bereich').hidden, true, 'ohne Abgleich keine Ablage');
});

test('[Pod·Kopie·Rot-Beweis] ohne den Abgleich nach der Bestätigung bleibt die abgelaufene Ablage liegen', async () => {
  const stelle = 'return kopieUebernehmen().then(abgelaufeneLoeschen, ';
  assert.ok(QUELLE.includes(stelle));
  const pod = podStellen();
  const quelle = QUELLE.replace(stelle, 'return Promise.resolve().then(abgelaufeneLoeschen, ');
  let g = await geraet(pod, { quelle });
  const adresse = await ablegenStelle(g);
  await g.klick('abmelden');
  await g.klick('abmelden-lassen');
  ablaufVorziehen(pod, g, adresse);
  g = await g.neuLaden();
  await g.bestaetigen();
  assert.ok(pod.res.has(adresse), 'ohne Abgleich liegt die abgelaufene Ablage weiter im Pod');
});

test('[Pod·Kopie·Rot-Beweis] mit einer Vereinigung ohne HEAD-Prüfung holt ein Gerät die Rücknahme des anderen zurück', async () => {
  const stelle = /function lokalBehalten\(e\) \{[\s\S]*?\n  \}\n/;
  assert.match(QUELLE, stelle);
  const quelle = QUELLE.replace(stelle, 'function lokalBehalten(e) { return Promise.resolve(true); }\n');
  const pod = podStellen();
  let a = await geraet(pod, { quelle });
  const x = await ablegenStelle(a);
  let b = await geraet(pod, { quelle });
  await a.B.zuruecknehmen(x);
  b = await b.neuLaden();
  await b.bestaetigen();
  assert.deepEqual(pod.kopie().ablagen.map((e) => e.adresse), [x], 'die zurückgenommene Ablage steht wieder in der Kopie');
});

test('[Pod·Kopie·Rot-Beweis] ohne die Regel vor dem Schreiben läge die Kopie trotz gescheiterter Regel im Pod', async () => {
  const stelle = "return ordnerBereit(s.wurzel, s.webid, 'intern').then(function () {";
  assert.ok(QUELLE.includes(stelle));
  const quelle = QUELLE.replace(stelle, "return ordnerBereit(s.wurzel, s.webid, 'intern').catch(function () {}).then(function () {");
  const pod = podStellen({ aclScheitert: (ziel) => ziel === INTERN });
  let g = await geraet(pod, { quelle });
  await ablegenStelle(g);
  assert.equal(pod.res.has(KOPIE), true);
});

test('[Pod·Kopie·Rot-Beweis] verwürfe die Brücke bei HEAD 500 den Eintrag, fehlte er nach dem Lauf', async () => {
  const stelle = "throw new Error('kopie-pruefen-' + r.status);";
  assert.ok(QUELLE.includes(stelle));
  const { g } = await abgleichScheitert(QUELLE.replace(stelle, 'return false;'));
  assert.deepEqual([...g.lokal()], [], 'der gültige Eintrag ist aus dem Verzeichnis verschwunden');
});
