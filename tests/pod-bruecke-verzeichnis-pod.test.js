'use strict';
/* ═════════════════════════════════════════════════════════════════
   Test — Pod-Brücke: das Verzeichnis der Ablagen liegt im eigenen Pod nur als Chiffrat (pod/bruecke.js; U2-ADR-520, das Nr. 3
   des Nachtrags zu U2-ADR-512 vom 29.10.2026 ersetzt; Befunde POD-ABMELDEN-VERLIERT-ABLAGEN und POD-VERZEICHNIS-KLARTEXT)
   ─────────────────────────────────────────────────────────────────
   WAS DIESE PROBE HÄLT
     1. Unter vivodepot/k/ liegen nur v1.jose, das Verzeichnis als Chiffrat, das der Kern verschließt, und a1.json, die
        Ablaufliste mit genau adresse und bis, nur für Ablagen mit Ablauf. Im Chiffrat steht nichts im Klartext. Was der Kern
        öffnet, trägt genau die Felder der Positivliste unten. Eine Datei verzeichnis.json entsteht nicht.
     2. intern/ wird zuerst angelegt und auf die Person allein gesetzt (regelEigen mit Vererbung). Scheitert diese Regel, schreibt
        die Brücke dort nichts (fail-closed).
     3. Mit Kern (Auftrag aus der Anwendung): nach Abmelden, auf einem zweiten Gerät oder nach dem Neuladen kennt die Brücke die
        Ablagen wieder; eine abgelaufene wird gelöscht, Grant und Ressource. Zwei Geräte: was eines zurücknimmt, holt das andere
        nicht zurück; schreiben beide nacheinander, geht keine Ablage verloren (If-Match, bei 412 neu lesen).
     4. Ohne Kern (Datei-Weg, Herkunft 'null'): die Brücke liest und schreibt die Kopie nicht und bittet um nichts; Abgelaufenes
        löscht sie über die Ablaufliste. Den Grant dazu löscht sie, sobald sie die Kopie wieder mit dem Kern öffnet.
     5. Öffnet der Kern die Kopie nicht (anderes Depot), bleibt sie unverändert; das Ablegen läuft. Antworten, die nicht zur
        Bitte passen (fremde id, Nummer, Herkunft, Zusatzfeld), nimmt die Brücke nicht an.
     6. Vor der Bestätigung liest und schreibt die Brücke unter intern/ nichts. Eine veränderte Kopie oder Ablaufliste bringt die
        Brücke nicht dazu, etwas außerhalb ihrer Ordner zu löschen; fremde Felder fallen weg.
     Rot-Beweise: ohne Abgleich kennt das zweite Gerät die Ablagen nicht; mit einer Vereinigung ohne HEAD-Prüfung holt ein Gerät
     die Rücknahme des anderen zurück; ohne die Regel vor dem Schreiben läge die Kopie ungeschützt; bei HEAD 500 als „weg“
     verschwände ein gültiger Eintrag; schriebe die Brücke die Liste statt des Chiffrats, wiese der Schreibweg sie ab.
   bruecke.js läuft in einem vm-Kontext mit dem echten Schreibweg (pod/aussenablage.js) und der echten Tür; Anmeldung, Pod und
   Kern sind gestellt. Der gestellte Kern verschließt ohne Kryptografie (die hält tests/aussenablage-verzeichnis-kern.test.js):
   er gibt ein JWE der Verzeichnis-Form mit zufälligem Inhalt aus und merkt sich die Liste dazu, je Depot.
   ═════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, randomBytes } = require('node:crypto');
const C = require('../pod/chiffrat-pruefen.js');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'bruecke.js'), 'utf8');
const KONFIG = fs.readFileSync(path.join(__dirname, '..', 'pod', 'konfiguration.js'), 'utf8');
// Der einzige Schreibweg (U2-ADR-520) läuft in derselben Seite, wie bruecke.html ihn lädt.
const AUSSENABLAGE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'aussenablage.js'), 'utf8');
const WEBID = 'https://person.example/profile/card#me';
const SPEICHER = 'https://speicher.example/person/';
const INTERN = SPEICHER + 'vivodepot/k/';
const KOPIE = INTERN + 'v1.jose';
const ABLAUF = INTERN + 'a1.json';
const KERN = 'https://privat-de.vivodepot.org';
const STELLE = 'https://stelle.example/profile#id';
const BESCHREIBUNG = SPEICHER + 'beschreibung';
const DIENST = SPEICHER + 'dienst/';
const TAG = 86400000;
// Positivliste der Felder im Verzeichnis (Bedingung (a) der Gegenlesung Krypto, 28.10.2026; VERZEICHNIS_FELDER im Kern).
const FELDER = ['adresse', 'art', 'stelle', 'bis', 'am', 'grant', 'ueberDienst'];

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const SHL = [b64u({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }), '', b64u('iv'), b64u('c'), b64u('tag')].join('.');
const ANTWORT = [b64u({ alg: 'PBES2-HS512+A256KW', enc: 'A256GCM', p2c: 600000, p2s: 'x', typ: 't', cty: 'json', kennung: 'a4WHfFYRmMRfrMf88oNP-Q' }), b64u('ek'), b64u('iv'), b64u('c'), b64u('tag')].join('.');
const DEPOT = 'VIVODEPOT\u0001' + JSON.stringify({ kryptoVersion: 3, depotUUID: 'u', pbkdf2: { salt: 's', iterations: 600000 }, depotSalt: 'd', iv: 'i', ct: 'c' });
const puffer = (s) => { const u = new TextEncoder().encode(s); return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); };
const warten = (ms = 20) => new Promise((r) => setTimeout(r, ms));

/* Der gestellte Kern: verschließt je Depot, öffnet nur, was dasselbe Depot verschlossen hat. */
const TRESOR = new Map();   // JWE → { depot, liste }
function verschliessen(depot, liste) {
  const jwe = [b64u({ alg: 'dir', enc: 'A256GCM', typ: 'vivodepot-verzeichnis+jwe' }), '', randomBytes(12).toString('base64url'),
    randomBytes(48).toString('base64url'), randomBytes(16).toString('base64url')].join('.');
  TRESOR.set(jwe, { depot, liste: JSON.parse(JSON.stringify(liste)) });
  return jwe;
}
function oeffnen(depot, jwe) {
  const t = TRESOR.get(jwe);
  return t && t.depot === depot ? JSON.parse(JSON.stringify(t.liste)) : null;
}

function podStellen({ aclScheitert = () => false, headStatus = () => null, getStatus = () => null, dienst = false, dienstStatus = null, containerAntwort = null } = {}) {
  const res = new Map();      // adresse → { koerper, etag }
  const acl = new Map();      // adresse → Regeln
  let n = 0;
  const ablauf = [];
  const antwort = (status, { koerper = null, etag = null, kopf = {}, url = undefined, redirected = false } = {}) => ({
    ok: status >= 200 && status < 300, status, url, redirected,
    headers: { get: (k) => (k === 'ETag' ? etag : (kopf[k] || null)) },
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
    // dienst: der Speicher bietet einen Grant-Dienst an (LWS Storage Description); ein POST legt den Grant dort ab.
    if (dienst && methode === 'HEAD' && adresse === SPEICHER) return antwort(200, { kopf: { Link: '<' + BESCHREIBUNG + '>; rel="http://www.w3.org/ns/lws#storageDescription"' } });
    if (dienst && methode === 'GET' && adresse === BESCHREIBUNG) return antwort(200, { koerper: { service: [{ type: 'AccessGrantService', id: DIENST }] } });
    if (dienst && methode === 'POST' && adresse === DIENST) {
      if (dienstStatus) return antwort(dienstStatus);
      const ort = DIENST + 'g' + (++n);
      res.set(ort, { koerper: o.body, etag: '"' + n + '"', typ: h['Content-Type'] || null });
      return antwort(201, { kopf: { Location: ort } });
    }
    // Ein Container (Adresse mit „/“ am Ende) listet seine Kinder als JSON-LD (ldp:contains); containerAntwort ersetzt die Liste.
    if (methode === 'GET' && adresse.endsWith('/')) {
      if (containerAntwort) { const x = containerAntwort(adresse); if (x) return antwort(x.status || 200, x); }
      const kinder = [...res.keys()].filter((k) => k.startsWith(adresse) && k !== adresse && !k.slice(adresse.length).replace(/\/$/, '').includes('/'));
      return antwort(200, { koerper: { '@id': adresse, 'ldp:contains': kinder.map((k) => ({ '@id': k })) } });
    }
    const r = res.get(adresse);
    if (methode === 'HEAD' && headStatus(adresse)) return antwort(headStatus(adresse));
    if (methode === 'GET' && getStatus(adresse)) return antwort(getStatus(adresse));
    if (methode === 'HEAD' || methode === 'GET') return r ? antwort(200, { koerper: r.koerper, etag: r.etag }) : antwort(404);
    if (methode === 'PUT') {
      if (h['If-None-Match'] === '*' && r) return antwort(412);
      if (h['If-Match'] && (!r || h['If-Match'] !== r.etag)) return antwort(412);
      const etag = '"' + (++n) + '"';
      res.set(adresse, { koerper: o.body === undefined ? '' : o.body, etag, typ: h['Content-Type'] || null });
      return antwort(r ? 204 : 201, { etag });
    }
    if (methode === 'DELETE') { const da = res.delete(adresse); acl.delete(adresse); return antwort(da ? 204 : 404); }
    return antwort(405);
  }
  return {
    res, acl, ablauf, podFetch,
    jwe: () => (res.has(KOPIE) ? res.get(KOPIE).koerper : null),
    kopie: (depot = 'D1') => (res.has(KOPIE) ? oeffnen(depot, res.get(KOPIE).koerper) : null),
    ablaufliste: () => (res.has(ABLAUF) ? JSON.parse(res.get(ABLAUF).koerper) : null)
  };
}

/* Ein Laden der Seite auf einem Gerät. `kern`: die Herkunft des Öffners (null = Datei-Weg ohne Öffner), `depot`: welches Depot
   der Kern offen hat, `antworten`: wie der Kern antwortet. `speicher` ist die IndexedDB des Geräts und überdauert das Neuladen. */
async function geraet(pod, { quelle = QUELLE, zielBestaetigen = true, speicher = { lokal: undefined }, kern = KERN, depot = 'D1', antworten = null } = {}) {
  const elemente = {};
  const el = (id) => (elemente[id] = elemente[id] || { id, hidden: false, textContent: '', value: '', onclick: null, onchange: null, files: [], appendChild() {} });
  let abgemeldet = false;
  let hoerer = null;
  const bitten = [];
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
  const opener = kern === null ? null : {
    postMessage: (n, ziel) => {
      if (!/^vd-pod-verzeichnis-/.test(n.typ)) return;
      bitten.push({ n: JSON.parse(JSON.stringify(n)), ziel });
      let d;
      if (n.typ === 'vd-pod-verzeichnis-oeffnen') {
        const liste = oeffnen(depot, n.daten);
        d = { typ: 'vd-pod-verzeichnis-offen', fassung: 1, id: n.id, nr: n.nr };
        if (liste) d.liste = liste; else d.fehler = 'unlesbar';
      } else d = { typ: 'vd-pod-verzeichnis-verschlossen', fassung: 1, id: n.id, nr: n.nr, daten: verschliessen(depot, n.liste) };
      if (antworten) d = antworten(d, n);
      Promise.resolve().then(() => hoerer({ source: opener, origin: kern, data: d }));
    }
  };
  const kontext = {
    vdPodAnmeldung: A, vdPodChiffrat: C, vdPodLws: require('../pod/lws.js'),
    document: { readyState: 'complete', getElementById: el, querySelector: () => null, createElement: () => el('neu-' + Math.random()), body: { dataset: {} } },
    window: { opener, addEventListener: (t, f) => { if (t === 'message') hoerer = f; } },
    fetch: async () => ({ ok: true, text: async () => '<#me> <http://www.w3.org/ns/pim/space#storage> <' + SPEICHER + '>.\n' }),
    crypto: webcrypto, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), Blob, URL, Promise, Date, Number, String, Error, Uint8Array, JSON,
    ArrayBuffer, TextDecoder, Object, Array, setTimeout, clearTimeout
  };
  kontext.self = kontext;
  vm.createContext(kontext);
  vm.runInContext(KONFIG, kontext);
  vm.runInContext(AUSSENABLAGE, kontext);
  vm.runInContext(quelle, kontext);
  await warten();
  const g = {
    el, B: kontext.vdPodBruecke, bitten,
    lokal: () => speicher.lokal,
    lokalSetzen: (v) => { speicher.lokal = v.slice(); },
    async bestaetigen({ ablegen = true, zwischen = null } = {}) {
      el('ziel-ja').onclick(); await warten();
      if (zwischen) zwischen();   // was zwischen dem Bestätigen und dem Eintreffen des Auftrags geschieht
      // Mit Öffner kommt der Auftrag des Kerns. Die Brücke liest dann nur; abgeglichen und geschrieben wird erst nach „Ablegen“,
      // den Schritt davor geht die Probe hier selbst (ablegen: false = die Person hat noch nicht gewählt).
      if (opener) {
        hoerer({ source: opener, origin: kern, data: { typ: 'vd-pod-ablegen', fassung: 1, id: 'A'.repeat(22), art: 'eigen', bis: Date.now() + 600000, daten: puffer(DEPOT) } });
        await warten(60);
        if (ablegen) { await kontext.vdPodBruecke._probe.abgleichen(); await warten(20); }
      }
    },
    async klick(id) { await el(id).onclick(); await warten(60); },
    neuLaden: (zusatz) => geraet(pod, Object.assign({ quelle, zielBestaetigen: false, speicher, kern, depot, antworten }, zusatz || {})),
    kontext
  };
  if (zielBestaetigen) await g.bestaetigen();
  return g;
}

/* Eine Ablage für eine Stelle mit Ablauf in einem Tag. */
async function ablegenStelle(g) { return g.B.ablegen(ANTWORT, 'stelle', STELLE, 1, {}); }
/* Den Ablauf vorziehen: in der Kopie (über den gestellten Kern), in der Ablaufliste und lokal. */
function ablaufVorziehen(pod, g, adresse) {
  if (pod.res.has(KOPIE)) {
    const k = pod.kopie().map((e) => (e.adresse === adresse ? Object.assign({}, e, { bis: Date.now() - TAG }) : e));
    pod.res.set(KOPIE, { koerper: verschliessen('D1', k), etag: pod.res.get(KOPIE).etag });
  }
  if (pod.res.has(ABLAUF)) {
    const a = pod.ablaufliste();
    a.ablagen.forEach((e) => { if (e.adresse === adresse) e.bis = Date.now() - TAG; });
    pod.res.set(ABLAUF, { koerper: JSON.stringify(a), etag: pod.res.get(ABLAUF).etag });
  }
  if (g.lokal()) g.lokalSetzen(g.lokal().map((e) => (e.adresse === adresse ? Object.assign({}, e, { bis: Date.now() - TAG }) : e)));
}

test('[Pod·Verzeichnis] mit Kern: im Pod liegen das Verzeichnis als Chiffrat und die Ablaufliste, nach der Regel, ohne Klartext', async () => {
  const pod = podStellen();
  const g = await geraet(pod);
  const adresse = await ablegenStelle(g);
  const link = await g.B.ablegen(SHL, 'link', '', null, {});
  const jwe = pod.jwe();
  assert.equal(C.pruefen(jwe).art, 'verzeichnis', 'die Kopie hat die Verzeichnis-Form der Tür');
  for (const klar of [adresse, link, STELLE, 'freigaben', 'links', 'stelle']) assert.ok(!jwe.includes(klar) && !Buffer.from(jwe.split('.')[0], 'base64url').toString().includes(klar), 'kein Klartext im Chiffrat: ' + klar);
  const k = pod.kopie();
  assert.deepEqual(k.map((e) => e.adresse), [adresse, link]);
  for (const e of k) assert.deepEqual(Object.keys(e).sort(), FELDER.slice().sort(), 'genau die Felder der Positivliste');
  assert.ok(g.bitten.every((b) => b.ziel === KERN && b.n.id === 'A'.repeat(22)), 'Bitten nur an die Herkunft des Auftrags, mit dessen id');
  assert.deepEqual(pod.ablaufliste(), { fassung: 1, ablagen: [{ adresse, bis: k[0].bis }] }, 'Ablaufliste: nur die Ablage mit Ablauf, nur Adresse und Ablauf');
  assert.ok(![...pod.res.keys()].some((a) => a.endsWith('verzeichnis.json')), 'keine Kopie im Klartext');
  const regel = pod.acl.get(INTERN);
  assert.ok(regel, 'intern/ trägt eine Regel');
  assert.match(regel, /acl:agent <https:\/\/person\.example\/profile\/card#me>/);
  assert.match(regel, /acl:default <https:\/\/speicher\.example\/person\/vivodepot\/k\/>/);
  assert.ok(!/agentClass|stelle\.example/.test(regel), 'nur die WebID der Person');
  const i = pod.ablauf.indexOf('PUT ' + INTERN + '.acl');
  assert.ok(i >= 0 && i < pod.ablauf.indexOf('PUT ' + KOPIE) && i < pod.ablauf.indexOf('PUT ' + ABLAUF), 'die Regel steht vor jedem Schreiben unter intern/');
});

/* U2-ADR-520 Nr. 3: Ohne Grant-Dienst liegt kein Grant im Pod (er nennte Stelle, Adresse und Ablauf im Klartext), und kein
   Pfad verrät Art oder Stelle einer Ablage. */
const SPRECHENDE_ORDNER = /\/vivodepot\/(freigaben|links|sicherungen|grants|intern)\//;
async function grantUndOrdnerLauf(quelle) {
  const pod = podStellen();
  const g = await geraet(pod, { quelle });
  const adresse = await ablegenStelle(g);
  await g.B.ablegen(SHL, 'link', '', null, {});
  return { pod, g, adresse };
}
function grantImPod(pod) {
  return [...pod.res.entries()].filter(([, r]) => r.typ === 'application/ld+json' || /AccessGrant/.test(String(r.koerper)));
}

test('[Pod·Verzeichnis] ohne Grant-Dienst liegt kein Grant im Pod: kein Grant-Eintrag, kein Körper im Klartext mit der Stelle', async () => {
  const { pod, g } = await grantUndOrdnerLauf(QUELLE);
  assert.deepEqual(grantImPod(pod).map(([a]) => a), [], 'kein Grant-Körper im Pod');
  assert.ok(![...pod.res.values()].some((r) => String(r.koerper).includes(STELLE)), 'die WebID der Stelle steht in keinem Körper');
  assert.equal(pod.kopie()[0].grant, null, 'das Verzeichnis nennt keinen Grant');
});

test('[Pod·Verzeichnis·Rot-Beweis] legte die Brücke den Grant ohne Dienst im Pod ab, fände die Probe ihn', async () => {
  const stelle = 'return { grant: null, ueberDienst: false };\n';
  assert.equal(QUELLE.split(stelle).length, 2);
  // An W.schreiben vorbei: den Weg über W sperrt aussenablage.js schon (Probe in aussenablage-klartext-positivliste.test.js).
  const quelle = QUELLE.replace(stelle, "return A.podFetch(new URL('vivodepot/k/g.json', wurzel).href, { method: 'PUT', body: koerper, headers: { 'Content-Type': 'application/ld+json' } }).then(function () { return { grant: null, ueberDienst: false }; });\n");
  const { pod } = await grantUndOrdnerLauf(quelle);
  assert.equal(grantImPod(pod).length, 1);
});

test('[Pod·Verzeichnis] neutrale Ordner: keine Schreibadresse nennt Art oder Stelle, alle Ablagen liegen im selben Ordner', async () => {
  const { pod, adresse } = await grantUndOrdnerLauf(QUELLE);
  const schreib = pod.ablauf.filter((z) => z.startsWith('PUT ') || z.startsWith('POST '));
  assert.ok(schreib.length > 0);
  for (const z of schreib) assert.ok(!SPRECHENDE_ORDNER.test(z), 'sprechender Ordner: ' + z);
  const ablagen = pod.kopie().map((e) => e.adresse);
  assert.ok(ablagen.every((a) => a.startsWith(SPEICHER + 'vivodepot/d/')), 'Stelle und Link im selben Ordner');
  assert.ok(adresse.startsWith(SPEICHER + 'vivodepot/d/'));
});

test('[Pod·Verzeichnis·Rot-Beweis] mit den sprechenden Ordnern früherer Fassungen fiele die Ordner-Probe', async () => {
  const stelle = "var ORDNER = { stelle: 'vivodepot/d/', link: 'vivodepot/d/', eigen: 'vivodepot/d/', intern: 'vivodepot/k/' };";
  assert.equal(QUELLE.split(stelle).length, 2);
  const quelle = QUELLE.replace(stelle, "var ORDNER = { stelle: 'vivodepot/freigaben/', link: 'vivodepot/links/', eigen: 'vivodepot/sicherungen/', intern: 'vivodepot/k/' };");
  const { pod } = await grantUndOrdnerLauf(quelle);
  assert.ok(pod.ablauf.some((z) => SPRECHENDE_ORDNER.test(z)));
});

test('[Pod·Verzeichnis] eine Ablage aus einem alten Ordner samt altem Grant-Eintrag nimmt die Brücke weiter zurück', async () => {
  const pod = podStellen();
  const g = await geraet(pod);
  const alt = SPEICHER + 'vivodepot/freigaben/alt';
  const altGrant = SPEICHER + 'vivodepot/grants/alt.json';
  pod.res.set(alt, { koerper: 'x', etag: '"a1"', typ: 'application/jose' });
  pod.res.set(altGrant, { koerper: '{}', etag: '"a2"', typ: 'application/ld+json' });
  await ablegenStelle(g);
  g.lokalSetzen(g.lokal().concat([{ adresse: alt, art: 'stelle', stelle: STELLE, bis: null, am: 1, grant: altGrant, ueberDienst: false }]));
  await g.B.zuruecknehmen(alt);
  assert.ok(!pod.res.has(alt), 'alte Ablage gelöscht');
  assert.ok(!pod.res.has(altGrant), 'alter Grant-Eintrag gelöscht');
});

/* „Nicht ablegen“ (Entscheidung 04.11.2026): Wer nicht ablegt, dem schreibt die Brücke nichts in den Pod. Abgeglichen und
   geschrieben wird erst nach „Ablegen“. Abgelaufene Grants sind Zugriffsrechte; sie verschwinden trotzdem nicht später. */
const DIENST_GRANT = SPEICHER + 'dienst/g1';
function grantSetzen(pod, g, adresse, { inKopie = true } = {}) {
  pod.res.set(DIENST_GRANT, { koerper: '{}', etag: '"g"', typ: 'application/lws+json' });
  if (g.lokal()) g.lokalSetzen(g.lokal().map((e) => (e.adresse === adresse ? Object.assign({}, e, { grant: DIENST_GRANT, ueberDienst: true }) : e)));
  if (inKopie && pod.res.has(KOPIE)) {
    const k = pod.kopie().map((e) => (e.adresse === adresse ? Object.assign({}, e, { grant: DIENST_GRANT, ueberDienst: true }) : e));
    pod.res.set(KOPIE, { koerper: verschliessen('D1', k), etag: pod.res.get(KOPIE).etag });
  }
}
async function neinLauf(quelle) {
  const pod = podStellen();
  const g1 = await geraet(pod);
  await ablegenStelle(g1);
  // Ein zweites Gerät kennt eine Ablage, die die Kopie nicht kennt: ein Abgleich schriebe die Kopie neu.
  const nurLokal = SPEICHER + 'vivodepot/d/nur-lokal';
  pod.res.set(nurLokal, { koerper: 'x', etag: '"n"', typ: 'application/jose' });
  const g2 = await geraet(pod, { quelle, zielBestaetigen: false, speicher: { lokal: [{ adresse: nurLokal, art: 'eigen', stelle: null, bis: null, am: 1, grant: null, ueberDienst: null }] } });
  const vorher = { jwe: pod.jwe(), ablauf: JSON.stringify(pod.ablaufliste()) };
  pod.ablauf.length = 0;
  await g2.bestaetigen({ ablegen: false });
  await g2.klick('auftrag-nein');
  return { pod, g2, vorher };
}

test('[Pod·Verzeichnis] Auftrag kommt, „Nicht ablegen“: die Brücke schreibt nichts in den Pod, Verzeichnis und Ablaufliste bleiben', async () => {
  const { pod, g2, vorher } = await neinLauf(QUELLE);
  assert.deepEqual(pod.ablauf.filter((z) => /^(PUT|POST|PATCH|DELETE) /.test(z)), [], 'keine schreibende Anfrage');
  assert.equal(pod.jwe(), vorher.jwe, 'das Verzeichnis im Pod ist unverändert');
  assert.equal(JSON.stringify(pod.ablaufliste()), vorher.ablauf, 'die Ablaufliste ist unverändert');
  assert.ok(g2.bitten.every((b) => b.n.typ === 'vd-pod-verzeichnis-oeffnen'), 'der Kern verschließt nichts');
});

test('[Pod·Verzeichnis·Rot-Beweis] glich die Brücke schon beim Eintreffen des Auftrags ab, schriebe sie das Verzeichnis trotz „Nicht ablegen“', async () => {
  const stelle = '    vorab = auftragVorab();\n';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { pod, vorher } = await neinLauf(QUELLE.replace(stelle, '    vorab = auftragVorab().then(auftragAbgleichen);\n'));
  assert.notEqual(pod.jwe(), vorher.jwe);
});

// ohneLokal: der Grant steht nur in der Kopie (leerer Browser); sonst nur im lokalen Verzeichnis, damit allein das Bestätigen ihn
// entfernen kann.
async function grantLauf(quelle, { ohneLokal = false } = {}) {
  const pod = podStellen();
  const g = await geraet(pod, { quelle });
  const adresse = await ablegenStelle(g);
  grantSetzen(pod, g, adresse, { inKopie: ohneLokal });
  ablaufVorziehen(pod, g, adresse);
  const speicher = { lokal: ohneLokal ? undefined : g.lokal() };
  const g2 = await geraet(pod, { quelle, zielBestaetigen: false, speicher });
  await g2.bestaetigen({ ablegen: false });
  await g2.klick('auftrag-nein');
  return { pod, adresse };
}

test('[Pod·Verzeichnis] Auftrag kommt, „Nicht ablegen“: beim Bestätigen entfernt die Ablaufliste die abgelaufene Ablage samt Grant trotzdem', async () => {
  const { pod, adresse } = await grantLauf(QUELLE);
  assert.ok(!pod.res.has(adresse), 'Ablage gelöscht');
  assert.ok(!pod.res.has(DIENST_GRANT), 'Grant gelöscht');
});

test('[Pod·Verzeichnis·Rot-Beweis] nähme die Rücknahme den Grant nicht mit, bliebe er nach dem Bestätigen stehen', async () => {
  const stelle = 'return (e && e.grant ? loeschen(e.grant) : Promise.resolve())';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { pod } = await grantLauf(QUELLE.replace(stelle, 'return Promise.resolve()'));
  assert.ok(pod.res.has(DIENST_GRANT));
});

test('[Pod·Verzeichnis] Grant nur in der Kopie (leerer Browser): beim Eintreffen des Auftrags weg, auch bei „Nicht ablegen“', async () => {
  const { pod } = await grantLauf(QUELLE, { ohneLokal: true });
  assert.ok(!pod.res.has(DIENST_GRANT), 'Grant gelöscht, ohne Ablegen');
});

test('[Pod·Verzeichnis·Rot-Beweis] räumte die Brücke beim Eintreffen nichts ab, bliebe der Grant bis zur nächsten Ablage stehen', async () => {
  const stelle = 'x[0].filter(function (e) { return e.bis && e.bis < Date.now() && eintragGilt(e, s.wurzel); })';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { pod } = await grantLauf(QUELLE.replace(stelle, '[]'), { ohneLokal: true });
  assert.ok(pod.res.has(DIENST_GRANT));
});

async function fremdLauf(quelle) {
  const pod = podStellen();
  const g = await geraet(pod, { quelle });
  await ablegenStelle(g);
  const fremd = 'https://anderswo.example/vivodepot/d/x';
  const k = pod.kopie().concat([{ adresse: fremd, art: 'eigen', stelle: null, bis: Date.now() - TAG, am: 1, grant: 'https://anderswo.example/g', ueberDienst: null }]);
  pod.res.set(KOPIE, { koerper: verschliessen('D1', k), etag: pod.res.get(KOPIE).etag });
  const g2 = await geraet(pod, { quelle, zielBestaetigen: false, speicher: {} });
  pod.ablauf.length = 0;
  await g2.bestaetigen({ ablegen: false });
  await g2.klick('auftrag-nein');
  return pod.ablauf.filter((z) => z.startsWith('DELETE ') && z.includes('anderswo.example'));
}

test('[Pod·Verzeichnis] beim Eintreffen löscht die Brücke nur im bestätigten Speicher, nie an einer fremden Adresse aus der Kopie', async () => {
  assert.deepEqual(await fremdLauf(QUELLE), []);
});

test('[Pod·Verzeichnis·Rot-Beweis] ohne die Grenze auf den bestätigten Speicher ginge ein DELETE an die fremde Adresse', async () => {
  const lesen = '.filter(function (e) { return eintragGilt(e, wurzel); }).map(auswahl)';
  const vorab = ' && eintragGilt(e, s.wurzel); })';
  assert.equal(QUELLE.split(lesen).length, 2);
  assert.equal(QUELLE.split(vorab).length, 2);
  const quelle = QUELLE.replace(lesen, '.map(auswahl)').replace(vorab, '; })');
  assert.ok((await fremdLauf(quelle)).length > 0);
});

async function ablaufLauf(quelle) {
  const pod = podStellen();
  const g = await geraet(pod, { quelle });
  const adresse = await ablegenStelle(g);
  // Anderes Depot: der Kern öffnet die Kopie nicht. Die Ablage läuft zwischen Bestätigen und Auftrag ab.
  const g2 = await geraet(pod, { quelle, zielBestaetigen: false, speicher: {}, depot: 'D2' });
  const vorher = {};
  await g2.bestaetigen({ ablegen: false, zwischen: () => {
    const a = pod.ablaufliste();
    a.ablagen.forEach((e) => { if (e.adresse === adresse) e.bis = Date.now() - 1000; });
    pod.res.set(ABLAUF, { koerper: JSON.stringify(a), etag: pod.res.get(ABLAUF).etag });
    vorher.jwe = pod.jwe(); vorher.ablauf = pod.res.get(ABLAUF).koerper;
    pod.ablauf.length = 0;
  } });
  await g2.klick('auftrag-nein');
  return { pod, adresse, vorher };
}

test('[Pod·Verzeichnis] Kopie nicht lesbar, „Nicht ablegen“: die Ablaufliste entfernt die abgelaufene Ablage, ohne etwas zu schreiben', async () => {
  const { pod, adresse, vorher } = await ablaufLauf(QUELLE);
  assert.ok(!pod.res.has(adresse), 'Ablage gelöscht');
  assert.deepEqual(pod.ablauf.filter((z) => /^(PUT|POST|PATCH) /.test(z)), [], 'nichts geschrieben');
  assert.equal(pod.jwe(), vorher.jwe);
  assert.equal(pod.res.get(ABLAUF).koerper, vorher.ablauf);
});

test('[Pod·Verzeichnis·Rot-Beweis] ohne die Ablaufliste beim Eintreffen bliebe die Ablage bei nicht lesbarer Kopie liegen', async () => {
  const stelle = '.concat(x[1].filter(function (e) { return e.bis < Date.now() && adresseGilt(e.adresse, s.wurzel); }))';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { pod, adresse } = await ablaufLauf(QUELLE.replace(stelle, ''));
  assert.ok(pod.res.has(adresse));
});

// Befund POD-GRANT-NUR-ABLAUFLISTE (MITTEL, entschieden 04.11.2026: so lassen). Ist die Kopie nicht lesbar, kennt die Brücke den
// Grant einer abgelaufenen Ablage nicht, denn die Ablaufliste nennt nur Adresse und Ablauf (U2-ADR-520 Nr. 3). Die Ablage fällt
// beim Eintreffen, der Grant beim nächsten Abgleich mit lesbarer Kopie. Den Zugriff begrenzt bis dahin der Ablauf im Grant selbst.
async function grantDienstLauf(quelle) {
  const pod = podStellen({ dienst: true });
  const g = await geraet(pod, { quelle });
  const adresse = await ablegenStelle(g);
  const grants = [...pod.res.keys()].filter((k) => k.startsWith(DIENST));
  assert.equal(grants.length, 1, 'der Grant liegt beim Dienst');
  const g2 = await geraet(pod, { quelle, zielBestaetigen: false, speicher: {}, depot: 'D2' });
  await g2.bestaetigen({ ablegen: false, zwischen: () => {
    const a = pod.ablaufliste();
    a.ablagen.forEach((e) => { if (e.adresse === adresse) e.bis = Date.now() - 1000; });
    pod.res.set(ABLAUF, { koerper: JSON.stringify(a), etag: pod.res.get(ABLAUF).etag });
  } });
  await g2.klick('auftrag-nein');
  return { pod, adresse, grant: grants[0] };
}
function grantFrist(pod, grant) {
  const c = (JSON.parse(pod.res.get(grant).koerper).access[0].constraint || []).find((x) => x.leftOperand === 'dateTime');
  return c && c.operator === 'lteq' ? Date.parse(c.rightOperand) : null;
}

test('[Pod·Verzeichnis] Kopie nicht lesbar, Grant beim Dienst: die abgelaufene Ablage fällt, der stehende Grant gilt nur bis zum Ablauf', async () => {
  const { pod, adresse, grant } = await grantDienstLauf(QUELLE);
  assert.ok(!pod.res.has(adresse), 'Ablage gelöscht');
  assert.ok(pod.res.has(grant), 'den Grant kennt die Brücke ohne Kopie nicht');
  const frist = grantFrist(pod, grant);
  assert.ok(frist && frist <= Date.now() + 2 * TAG, 'der Grant trägt den Ablauf der Ablage');
});

test('[Pod·Verzeichnis·Rot-Beweis] gäbe die Brücke dem Grant keinen Ablauf mit, gälte der stehende Grant unbegrenzt', async () => {
  const stelle = 'grantAnlegen(wurzel, s, adresse, stelleWebid, bis, z.zweck, z.inbox)';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { pod, grant } = await grantDienstLauf(QUELLE.replace(stelle, 'grantAnlegen(wurzel, s, adresse, stelleWebid, null, z.zweck, z.inbox)'));
  assert.equal(grantFrist(pod, grant), null);
});

// Fremder Browser (leeres Verzeichnis), Auftrag kommt, „Nicht ablegen“: die Ablagen aus der Kopie stehen zum Zurücknehmen da.
async function fremdNeinLauf(quelle) {
  const pod = podStellen({ dienst: true });
  const g = await geraet(pod, { quelle });
  const adresse = await ablegenStelle(g);
  const grant = [...pod.res.keys()].find((k) => k.startsWith(DIENST));
  const g2 = await geraet(pod, { quelle, zielBestaetigen: false, speicher: {} });
  pod.ablauf.length = 0;
  await g2.bestaetigen({ ablegen: false });
  await g2.klick('auftrag-nein');
  const schreibend = pod.ablauf.filter((z) => /^(PUT|POST|PATCH|DELETE) /.test(z));
  const sichtbar = Array.from(await g2.B.verzeichnis(), (e) => e.adresse);   // Array aus diesem Kontext, nicht aus dem der Seite
  return { pod, g2, adresse, grant, schreibend, sichtbar };
}

test('[Pod·Verzeichnis] fremder Browser, „Nicht ablegen“: die Ablage steht zum Zurücknehmen da, und Zurücknehmen nimmt den Grant mit', async () => {
  const { pod, g2, adresse, grant, schreibend, sichtbar } = await fremdNeinLauf(QUELLE);
  assert.deepEqual(schreibend, [], 'bis zum Klick auf „Zurücknehmen“ nichts an den Pod');
  assert.deepEqual(sichtbar, [adresse]);
  assert.ok(Array.from(await g2.B.verzeichnis()).every((e) => e.art === 'stelle'), 'die Liste zeigt die Art, kein „undefined“');
  await g2.B.zuruecknehmen(adresse);
  assert.ok(!pod.res.has(adresse), 'Ablage gelöscht');
  assert.ok(!pod.res.has(grant), 'Grant gelöscht');
});

test('[Pod·Verzeichnis·Rot-Beweis] zeigte die Brücke die Kopie erst nach „Ablegen“, stünde im fremden Browser nichts zum Zurücknehmen da', async () => {
  const stelle = '}, Promise.resolve()).then(function () { return kopieZeigen(x[0], faellig); });';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { sichtbar } = await fremdNeinLauf(QUELLE.replace(stelle, '}, Promise.resolve());'));
  assert.deepEqual(sichtbar, []);
});

// Befund RUECKNAHME-OHNE-AUFTRAG (HOCH): in einem anderen Browser, ohne Auftrag aus der App (kein Kern), stand keine Ablage zum
// Zurücknehmen da. Die Brücke liest darum nach der Bestätigung den Ablageordner und bietet seine Ablagen an.
const ORDNER_D = SPEICHER + 'vivodepot/d/';
async function ohneAuftragLauf(quelle, podOptionen = {}) {
  const pod = podStellen(Object.assign({ dienst: true }, podOptionen));
  const g = await geraet(pod, { quelle: QUELLE });
  const adresse = await ablegenStelle(g);
  pod.ablauf.length = 0;
  const g2 = await geraet(pod, { quelle, speicher: {}, kern: null });
  await warten(60);
  const schreibend = pod.ablauf.filter((z) => /^(PUT|POST|PATCH|DELETE) /.test(z));
  const sichtbar = g2.B.ablagenImOrdner ? Array.from(g2.B.ablagenImOrdner()) : [];
  return { pod, g2, adresse, schreibend, sichtbar };
}

test('[Pod·Verzeichnis] anderer Browser ohne Auftrag: die Ablage aus dem Ablageordner steht zum Zurücknehmen da, Zurücknehmen löscht genau sie', async () => {
  const { pod, g2, adresse, schreibend, sichtbar } = await ohneAuftragLauf(QUELLE);
  assert.deepEqual(schreibend, [], 'bis zum Klick nichts an den Pod');
  assert.deepEqual(sichtbar, [adresse]);
  pod.ablauf.length = 0;
  await g2.B.zuruecknehmenImOrdner(adresse);
  assert.ok(!pod.res.has(adresse), 'Ablage gelöscht');
  assert.deepEqual(pod.ablauf.filter((z) => z.startsWith('DELETE ')), ['DELETE ' + adresse], 'genau eine Adresse gelöscht');
  assert.deepEqual(Array.from(g2.B.ablagenImOrdner()), []);
});

test('[Pod·Verzeichnis·Rot-Beweis] ohne das Lesen des Ablageordners stünde im anderen Browser ohne Auftrag nichts zum Zurücknehmen da', async () => {
  const stelle = '.then(ordnerLesen).then(verzeichnisZeigen).then(bereitMelden);';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { sichtbar } = await ohneAuftragLauf(QUELLE.replace(stelle, '.then(verzeichnisZeigen).then(bereitMelden);'));
  assert.deepEqual(sichtbar, []);
});

// Krypto-Grenzen: die Container-Liste ist Server-Eingabe. Gezeigt und gelöscht wird nur, was genau ein Kind von vivodepot/d/ im
// bestätigten Speicher ist und den Namen trägt, den die Brücke selbst vergibt.
const SCHLECHT = [
  ORDNER_D + '../k/a1.json', ORDNER_D + '..%2Fk%2Fa1.json', ORDNER_D + 'AAAAAAAAAAAAAAAAAAAAAA/', ORDNER_D + 'AAAAAAAAAAAAAAAAAAAA%2E',
  'https://anderswo.example/person/vivodepot/d/AAAAAAAAAAAAAAAAAAAAAA', ORDNER_D + 'x.acl', ORDNER_D + '.meta', ORDNER_D + 'kurz',
  ORDNER_D + 'AAAAAAAAAAAAAAAAAAAAAA?x=1', ORDNER_D + 'AAAAAAAAAAAAAAAAAAAAAA#f', SPEICHER + 'vivodepot/k/AAAAAAAAAAAAAAAAAAAAAA'
];
function gefaelscht(adresse) {
  return adresse === ORDNER_D ? { koerper: { '@graph': [
    { '@id': ORDNER_D, 'ldp:contains': SCHLECHT.map((k) => ({ '@id': k })) },
    { '@id': 'https://anderswo.example/c/', 'ldp:contains': [{ '@id': ORDNER_D + 'BBBBBBBBBBBBBBBBBBBBBB' }] }
  ] } } : null;
}

test('[Pod·Verzeichnis] gefälschte Container-Liste: kein fremder Pfad, kein Unterordner, keine Hilfsdatei wird gezeigt, und kein DELETE geht hinaus', async () => {
  const { pod, g2, schreibend, sichtbar } = await ohneAuftragLauf(QUELLE, { containerAntwort: gefaelscht });
  assert.deepEqual(schreibend, []);
  assert.deepEqual(sichtbar, []);
  pod.ablauf.length = 0;
  for (const k of SCHLECHT.concat([ORDNER_D + 'BBBBBBBBBBBBBBBBBBBBBB'])) await g2.B.zuruecknehmenImOrdner(k).catch(() => {});
  assert.deepEqual(pod.ablauf.filter((z) => z.startsWith('DELETE ')), []);
});

test('[Pod·Verzeichnis·Rot-Beweis] ohne die Namens- und Ordnergrenze zeigte die Brücke Kinder aus der gefälschten Liste', async () => {
  const stelle = 'return !u.search && !u.hash && u.href === ordner + name && ABLAGE_NAME.test(name);';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { sichtbar } = await ohneAuftragLauf(QUELLE.replace(stelle, 'return true;'), { containerAntwort: gefaelscht });
  assert.ok(sichtbar.length > 0);
});

test('[Pod·Verzeichnis] Container-Antwort nach einer Weiterleitung: die Brücke zeigt nichts daraus', async () => {
  const umgeleitet = (adresse) => (adresse === ORDNER_D ? { url: 'https://anderswo.example/d/', redirected: true,
    koerper: { '@id': ORDNER_D, 'ldp:contains': [{ '@id': ORDNER_D + 'CCCCCCCCCCCCCCCCCCCCCC' }] } } : null);
  const { sichtbar } = await ohneAuftragLauf(QUELLE, { containerAntwort: umgeleitet });
  assert.deepEqual(sichtbar, []);
});

test('[Pod·Verzeichnis·Rot-Beweis] ohne die Weiterleitungs-Prüfung übernähme die Brücke die umgeleitete Liste', async () => {
  const stelle = 'if (!r.ok || r.redirected || (r.url && r.url !== ordner)) return [];';
  assert.equal(QUELLE.split(stelle).length, 2);
  const umgeleitet = (adresse) => (adresse === ORDNER_D ? { url: 'https://anderswo.example/d/', redirected: true,
    koerper: { '@id': ORDNER_D, 'ldp:contains': [{ '@id': ORDNER_D + 'CCCCCCCCCCCCCCCCCCCCCC' }] } } : null);
  const { sichtbar } = await ohneAuftragLauf(QUELLE.replace(stelle, 'if (!r.ok) return [];'), { containerAntwort: umgeleitet });
  assert.deepEqual(sichtbar, [ORDNER_D + 'CCCCCCCCCCCCCCCCCCCCCC']);
});

test('[Pod·Verzeichnis] abmelden, Ablagen lassen, mit Kern neu öffnen: die inzwischen abgelaufene Ablage wird gelöscht', async () => {
  const pod = podStellen();
  let g = await geraet(pod);
  const adresse = await ablegenStelle(g);
  assert.ok(pod.res.has(adresse));
  await g.klick('abmelden');
  assert.match(g.el('abmelden-satz').textContent, /verschlüsselte Liste davon liegt in Ihrem Pod/);
  await g.klick('abmelden-lassen');
  assert.equal(g.lokal(), undefined, 'lokal gelöscht');
  ablaufVorziehen(pod, g, adresse);
  g = await g.neuLaden();
  await g.bestaetigen();
  assert.ok(!pod.res.has(adresse), 'Ressource gelöscht');
  assert.deepEqual(pod.kopie(), [], 'die Kopie ist leer');
  assert.deepEqual(pod.ablaufliste().ablagen, [], 'die Ablaufliste ist leer');
  assert.deepEqual(g.lokal(), []);
});

test('[Pod·Verzeichnis] ohne Kern: keine Bitte, kein Lesen der Kopie; Abgelaufenes über die Ablaufliste, danach mit Kern abgeglichen', async () => {
  const pod = podStellen();
  let g = await geraet(pod);
  const adresse = await ablegenStelle(g);
  await g.klick('abmelden'); await g.klick('abmelden-lassen');
  ablaufVorziehen(pod, g, adresse);
  const vorher = pod.jwe();
  pod.ablauf.length = 0;
  g = await g.neuLaden({ kern: null });
  await g.bestaetigen();
  assert.deepEqual(g.bitten, [], 'ohne Öffner keine Bitte');
  assert.ok(!pod.ablauf.some((z) => z.endsWith(KOPIE)), 'die Kopie wird ohne Kern nicht angefasst');
  assert.equal(pod.jwe(), vorher);
  assert.ok(!pod.res.has(adresse), 'die abgelaufene Ressource ist über die Ablaufliste gelöscht');
  // Ein Datei-Ablage ohne Kern: kein Grant im Pod, die Ablaufliste nimmt sie auf.
  const ohne = await ablegenStelle(g);
  assert.deepEqual(grantImPod(pod), [], 'kein Grant beim Datei-Weg');
  assert.ok(pod.ablaufliste().ablagen.some((e) => e.adresse === ohne));
  // Wieder mit Kern: die Kopie nennt die gelöschte Ablage noch; die Brücke verwirft sie.
  g = await g.neuLaden({ kern: KERN });
  await g.bestaetigen();
  assert.deepEqual(pod.kopie().map((e) => e.adresse), [ohne], 'die Datei-Ablage kommt ins Verzeichnis, die gelöschte nicht');
});

test('[Pod·Verzeichnis] Herkunft null (vom Stick): die Brücke bittet nicht um das Verzeichnis und schreibt keine Kopie', async () => {
  const pod = podStellen();
  const g = await geraet(pod, { kern: 'null' });
  await ablegenStelle(g);
  assert.deepEqual(g.bitten, [], 'die Liste ginge an „*“');
  assert.equal(pod.res.has(KOPIE), false);
  assert.equal(pod.ablaufliste().ablagen.length, 1, 'die Ablaufliste entsteht');
});

test('[Pod·Verzeichnis] ein zweites Gerät mit leerem Browser kennt die Ablagen mit Kern und kann zurücknehmen', async () => {
  const pod = podStellen();
  const a = await geraet(pod);
  const adresse = await ablegenStelle(a);
  const b = await geraet(pod);
  assert.deepEqual(b.lokal().map((e) => e.adresse), [adresse]);
  await b.B.zuruecknehmen(adresse);
  assert.ok(!pod.res.has(adresse));
  assert.deepEqual(pod.kopie(), []);
  assert.deepEqual(pod.ablaufliste().ablagen, []);
});

test('[Pod·Verzeichnis] zwei Geräte schreiben nacheinander: keine Ablage geht verloren', async () => {
  const pod = podStellen();
  const a = await geraet(pod);
  const b = await geraet(pod);
  const x = await ablegenStelle(a);
  const y = await ablegenStelle(b);   // b hält die ETags von vor x: 412, neu lesen, dieselbe Änderung noch einmal
  assert.deepEqual(pod.kopie().map((e) => e.adresse).sort(), [x, y].sort());
  assert.deepEqual(pod.ablaufliste().ablagen.map((e) => e.adresse).sort(), [x, y].sort());
  assert.ok(pod.ablauf.some((z, i) => z === 'PUT ' + KOPIE && pod.ablauf.slice(i + 1).includes('GET ' + KOPIE)), 'nach dem Konflikt neu gelesen');
});

test('[Pod·Verzeichnis] was ein Gerät zurücknimmt, holt das andere nicht zurück; was nur lokal und noch da ist, kommt hinzu', async () => {
  const pod = podStellen();
  let a = await geraet(pod);
  const x = await ablegenStelle(a);
  let b = await geraet(pod);
  assert.deepEqual(b.lokal().map((e) => e.adresse), [x]);
  await a.B.zuruecknehmen(x);
  b = await b.neuLaden();
  await b.bestaetigen();
  assert.deepEqual(pod.kopie(), [], 'x kommt nicht zurück in die Kopie');
  assert.deepEqual(b.lokal(), [], 'und verschwindet auch lokal');
  // Umgekehrt: die Kopie ist verloren, die Ressource steht noch: der lokale Eintrag kommt hinzu.
  const y = await ablegenStelle(a);
  pod.res.delete(KOPIE);
  a = await a.neuLaden();
  await a.bestaetigen();
  assert.deepEqual(pod.kopie().map((e) => e.adresse), [y]);
});

test('[Pod·Verzeichnis] anderes Depot: der Kern öffnet die Kopie nicht, sie bleibt unverändert, das Ablegen läuft', async () => {
  const pod = podStellen();
  const a = await geraet(pod);
  await ablegenStelle(a);
  const vorher = pod.jwe();
  const fremd = await geraet(pod, { depot: 'D2' });
  const y = await ablegenStelle(fremd);
  assert.equal(pod.jwe(), vorher, 'die Kopie bleibt, wie sie ist');
  assert.ok(pod.res.has(y), 'abgelegt');
  assert.ok(fremd.lokal().some((e) => e.adresse === y), 'lokal verzeichnet');
});

test('[Pod·Verzeichnis] Antworten, die nicht zur Bitte passen, nimmt die Brücke nicht an', async () => {
  // Ohne passende Antwort wartet die Brücke bis KERN_WARTEN_MS; hier kurz.
  const stelle = 'var KERN_WARTEN_MS = 15000;';
  assert.equal(QUELLE.split(stelle).length, 2);
  const quelle = QUELLE.replace(stelle, 'var KERN_WARTEN_MS = 40;');
  for (const [was, aendern] of [
    ['fremde id', (d) => Object.assign({}, d, { id: 'B'.repeat(22) })],
    ['fremde Nummer', (d) => Object.assign({}, d, { nr: d.nr + 100 })],
    ['Zusatzfeld', (d) => Object.assign({}, d, { schluessel: 'x' })],
    ['falscher Typ', (d) => Object.assign({}, d, { typ: d.typ === 'vd-pod-verzeichnis-offen' ? 'vd-pod-verzeichnis-verschlossen' : 'vd-pod-verzeichnis-offen' })],
  ]) {
    const pod = podStellen();
    const a = await geraet(pod);
    await ablegenStelle(a);   // eine Kopie besteht
    const vorher = pod.jwe();
    const g = await geraet(pod, { quelle, antworten: aendern });
    await warten(80);
    assert.ok(!g.lokal() || g.lokal().length === 0, was + ': die Kopie wird nicht übernommen');
    assert.equal(pod.jwe(), vorher, was + ': die Kopie bleibt');
  }
  const pod = podStellen();
  const g = await geraet(pod, { kern: KERN });
  const vorher = JSON.stringify(g.lokal());
  const fenster = { postMessage() {} };
  g.B.nachrichtAnnehmen({ source: fenster, origin: KERN, data: { typ: 'vd-pod-verzeichnis-offen', fassung: 1, id: 'A'.repeat(22), nr: 1, liste: [] } });
  await warten();
  assert.equal(JSON.stringify(g.lokal()), vorher, 'eine Antwort aus einem anderen Fenster zählt nicht');
});

test('[Pod·Verzeichnis] scheitert die Regel für intern/, schreibt die Brücke dort nichts', async () => {
  const pod = podStellen({ aclScheitert: (ziel) => ziel === INTERN });
  const g = await geraet(pod);
  await assert.rejects(ablegenStelle(g), /acl-403/);
  assert.equal(pod.res.has(KOPIE), false, 'keine ungeschützte Kopie');
  assert.equal(pod.res.has(ABLAUF), false, 'keine ungeschützte Ablaufliste');
});

test('[Pod·Verzeichnis] vor der Bestätigung liest und schreibt die Brücke unter intern/ nichts', async () => {
  const pod = podStellen();
  const g = await geraet(pod, { zielBestaetigen: false });
  g.lokalSetzen([{ adresse: SPEICHER + 'vivodepot/links/l', art: 'link', stelle: null, bis: Date.now() - TAG, am: 1, grant: null, ueberDienst: null }]);
  await g.klick('ziel-nein');
  assert.ok(!pod.ablauf.some((z) => z.includes(INTERN)), 'intern/ wird nicht angefasst');
  assert.deepEqual(g.bitten, []);
});

test('[Pod·Verzeichnis] eine veränderte Kopie oder Ablaufliste: fremde Adressen und Felder fallen weg, gelöscht wird nur in den eigenen Ordnern', async () => {
  const pod = podStellen();
  const fremd = [
    { adresse: 'https://anderswo.example/x', art: 'eigen', stelle: null, bis: 1, am: 1, grant: null, ueberDienst: null },
    { adresse: KOPIE, art: 'eigen', stelle: null, bis: 1, am: 1, grant: null, ueberDienst: null },
    { adresse: SPEICHER + 'vivodepot/links/a#schluessel', art: 'link', stelle: null, bis: 1, am: 1, grant: null, ueberDienst: null },
    { adresse: SPEICHER + 'vivodepot/freigaben/b', art: 'stelle', stelle: STELLE, bis: 1, am: 1, grant: 'https://anderswo.example/g', ueberDienst: false },
    { adresse: SPEICHER + 'vivodepot/sicherungen/c', art: 'unbekannt', stelle: null, bis: 1, am: 1, grant: null, ueberDienst: null }
  ];
  const gut = { adresse: SPEICHER + 'vivodepot/sicherungen/d', art: 'eigen', stelle: null, bis: Date.now() + TAG, am: 1, grant: null, ueberDienst: null, geheim: 'x' };
  pod.res.set(KOPIE, { koerper: verschliessen('D1', fremd.concat([gut])), etag: '"k"' });
  pod.res.set(ABLAUF, { koerper: JSON.stringify({ fassung: 1, ablagen: [{ adresse: 'https://anderswo.example/y', bis: 1 }, { adresse: ABLAUF, bis: 1 }] }), etag: '"a"' });
  pod.res.set(gut.adresse, { koerper: 'c', etag: '"d"' });
  const g = await geraet(pod);
  assert.ok(!pod.ablauf.some((z) => z.startsWith('DELETE ')), 'nichts gelöscht, obwohl die fremden Einträge abgelaufen wären');
  assert.deepEqual(g.lokal().map((e) => e.adresse), [gut.adresse]);
  assert.deepEqual(Object.keys(g.lokal()[0]).sort(), FELDER.slice().sort(), 'das fremde Feld fällt weg');
});

test('[Pod·Verzeichnis] scheitert das Lesen der Ablaufliste, bleibt alles, wie es war, und die Seite sagt es', async () => {
  const pod = podStellen({ getStatus: (a) => (a === ABLAUF ? 500 : null) });
  const g = await geraet(pod, { kern: null });
  assert.match(g.el('fehler').textContent, /^Die Liste der Ablagen ließ sich nicht abgleichen\. Nichts wurde geändert/);
  assert.equal(g.el('ablage-bereich').hidden, true, 'ohne Ablaufliste keine Ablage');
});

/* Ein nur lokaler Eintrag, dessen Prüfung mit 500 scheitert: die Brücke ändert die Kopie nicht. */
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

test('[Pod·Verzeichnis] scheitert die Prüfung eines strittigen Eintrags (HEAD 500), bleibt die Kopie, wie sie war', async () => {
  const { pod, g, y } = await abgleichScheitert(QUELLE);
  assert.equal(pod.res.has(KOPIE), false, 'keine Kopie geschrieben');
  assert.deepEqual([...g.lokal().map((e) => e.adresse)], [y], 'das lokale Verzeichnis bleibt');
  assert.ok(pod.res.has(y), 'nichts im Pod gelöscht');
});

test('[Pod·Verzeichnis·Rot-Beweis] ohne den Abgleich mit dem Kern kennt ein zweites Gerät die Ablagen nicht', async () => {
  const stelle = 'return kopieUebernehmen().then(abgelaufeneLoeschen)';
  assert.equal(QUELLE.split(stelle).length, 2);
  const quelle = QUELLE.replace(stelle, 'return Promise.resolve().then(abgelaufeneLoeschen)');
  const pod = podStellen();
  const a = await geraet(pod, { quelle });
  await a.B.ablegen(DEPOT, 'eigen', '', null, {});
  const b = await geraet(pod, { quelle });
  assert.deepEqual(b.lokal() || [], [], 'ROT ohne Abgleich: das zweite Gerät kennt die Ablage nicht');
});

test('[Pod·Verzeichnis·Rot-Beweis] mit einer Vereinigung ohne HEAD-Prüfung holt ein Gerät die Rücknahme des anderen zurück', async () => {
  const stelle = /function besteht\(adresse\) \{[\s\S]*?\n  \}\n/;
  assert.match(QUELLE, stelle);
  const quelle = QUELLE.replace(stelle, 'function besteht(adresse) { return Promise.resolve(true); }\n');
  const pod = podStellen();
  const a = await geraet(pod, { quelle });
  const x = await ablegenStelle(a);
  let b = await geraet(pod, { quelle });
  await a.B.zuruecknehmen(x);
  b = await b.neuLaden();
  await b.bestaetigen();
  assert.deepEqual(pod.kopie().map((e) => e.adresse), [x], 'die zurückgenommene Ablage steht wieder in der Kopie');
});

test('[Pod·Verzeichnis·Rot-Beweis] ohne die Regel vor dem Schreiben läge die Kopie trotz gescheiterter Regel im Pod', async () => {
  const stelle = "return ordnerBereit(s.wurzel, s.webid, 'intern').then(function () {\n      return kernBitte(";
  assert.equal(QUELLE.split(stelle).length, 2);
  const quelle = QUELLE.replace(stelle, "return ordnerBereit(s.wurzel, s.webid, 'intern').catch(function () {}).then(function () {\n      return kernBitte(")
    .replace("return ordnerBereit(s.wurzel, s.webid, 'intern').then(function () {\n        var kopf", "return ordnerBereit(s.wurzel, s.webid, 'intern').catch(function () {}).then(function () {\n        var kopf");
  const pod = podStellen({ aclScheitert: (ziel) => ziel === INTERN });
  const g = await geraet(pod, { quelle });
  await ablegenStelle(g);
  assert.equal(pod.res.has(KOPIE), true);
});

test('[Pod·Verzeichnis·Rot-Beweis] verwürfe die Brücke bei HEAD 500 den Eintrag, fehlte er nach dem Lauf', async () => {
  const stelle = "throw new Error('kopie-pruefen-' + r.status);";
  assert.equal(QUELLE.split(stelle).length, 2);
  const { g } = await abgleichScheitert(QUELLE.replace(stelle, 'return false;'));
  assert.deepEqual([...g.lokal()], [], 'der gültige Eintrag ist aus dem Verzeichnis verschwunden');
});

test('[Pod·Verzeichnis·Rot-Beweis] schriebe die Brücke die Liste statt des Chiffrats, wiese der Schreibweg sie ab', async () => {
  const stelle = "'chiffrat', d.daten, kopf)";
  assert.equal(QUELLE.split(stelle).length, 2);
  const quelle = QUELLE.replace(stelle, "'chiffrat', JSON.stringify({ fassung: 1, ablagen: rein }), kopf)");
  const pod = podStellen();
  const g = await geraet(pod, { quelle });
  await assert.rejects(ablegenStelle(g), /aussenablage:chiffrat-/);
  assert.equal(pod.res.has(KOPIE), false, 'nichts im Klartext im Pod');
});

// Befund GRANT-PRUEFUNG-NACH-PUT (MITTEL, 04.11.2026): Mit Grant-Dienst wies der Schreibweg einen Grant mit Zweck oder Posteingang
// ohne https erst nach dem PUT von Ressource und Regel ab. Die Freigabe lag dann im Pod, ohne Verzeichnis, Ablauf und Rücknahme.
async function grantFormLauf(quelle, zusatz, dienst = true) {
  const pod = podStellen({ dienst });
  const g = await geraet(pod, { quelle });
  pod.ablauf.length = 0;
  const fehler = await g.B.ablegen(ANTWORT, 'stelle', STELLE, 1, zusatz).then(() => null, (e) => e.message);
  return { pod, fehler, imOrdner: [...pod.res.keys()].filter((k) => k.startsWith(ORDNER_D) && k !== ORDNER_D) };
}

test('[Pod·Grant] mit Grant-Dienst: Zweck oder Posteingang ohne https wird vor dem Ablegen abgewiesen, nichts liegt im Pod', async () => {
  for (const zusatz of [{ zweck: 'http://zweck.example/z' }, { inbox: 'http://stelle.example/inbox/' }]) {
    const { pod, fehler, imOrdner } = await grantFormLauf(QUELLE, zusatz);
    assert.match(fehler || '', /aussenablage:grant-form/, JSON.stringify(zusatz));
    assert.deepEqual(imOrdner, [], 'keine Ressource im Ablageordner: ' + JSON.stringify(zusatz));
    assert.deepEqual(pod.ablauf.filter((z) => /^(PUT|POST|PATCH) /.test(z)), [], 'nichts geschrieben: ' + JSON.stringify(zusatz));
  }
  const gut = await grantFormLauf(QUELLE, { zweck: 'https://zweck.example/z' });
  assert.equal(gut.fehler, null, 'Positivkontrolle: mit https legt die Brücke ab');
  assert.equal(gut.imOrdner.length, 1);
});

// Befund POD-ABLAGE-MIT-ZWECK-SCHEITERT (HOCH, 05.11.2026): Ein Zweck aus einem Vokabular ist eine IRI mit Fragment, etwa
// https://w3id.org/dpv#ServiceProvision. Der Schreibweg wies jede https-Adresse mit # ab, also den Grant; seit der Prüfung vor dem
// PUT endete damit jede Ablage an eine Stelle mit Zweck ohne Adresse, mit und ohne Grant-Dienst (Pod-Strecke [Pod·Grant]).
const ZWECK_DPV = 'https://w3id.org/dpv#ServiceProvision';
test('[Pod·Zweck] Ablage an eine Stelle mit Zweck aus einem Vokabular (IRI mit #) und Posteingang endet mit Adresse', async () => {
  for (const dienst of [false, true]) {
    const r = await grantFormLauf(QUELLE, { zweck: ZWECK_DPV, inbox: 'https://stelle.example/inbox/' }, dienst);
    assert.equal(r.fehler, null, 'ohne Fehler, Grant-Dienst: ' + dienst);
    assert.equal(r.imOrdner.length, 1, 'genau eine Ablage, Grant-Dienst: ' + dienst);
  }
});

// Befund ALTE-GRANTS-KLARTEXT (MITTEL, 04.11.2026): Die ausgelieferte Brücke legte ohne Grant-Dienst jeden Grant im Klartext unter
// vivodepot/grants/<Ablagename>.json ab (Stelle, Adresse, Zweck, Ablauf). Nach der Bestätigung des Speichers räumt die Brücke sie ab,
// auch ohne Kern; anderes in grants/ und außerhalb bleibt.
const GRANTS_ALT = SPEICHER + 'vivodepot/grants/';
async function alteGrantsLauf(quelle) {
  const pod = podStellen();
  const alt = GRANTS_ALT + 'A'.repeat(22) + '.json';
  const fremd = GRANTS_ALT + 'notiz.txt';
  const daneben = SPEICHER + 'vivodepot/anderes/' + 'B'.repeat(22) + '.json';
  for (const a of [alt, fremd, daneben]) pod.res.set(a, { koerper: '{"type":"AccessGrant"}', etag: '"x"' });
  const g = await geraet(pod, { quelle, zielBestaetigen: false, kern: null });
  const vorher = pod.res.has(alt);
  await g.bestaetigen();
  await warten(60);
  return { pod, vorher, alt, fremd, daneben };
}

test('[Pod·Übergang] alte Grant-Dateien unter grants/ löscht die Brücke nach der Bestätigung, auch ohne Kern; sonst nichts', async () => {
  const { pod, vorher, alt, fremd, daneben } = await alteGrantsLauf(QUELLE);
  assert.equal(vorher, true, 'vor der Bestätigung bleibt alles');
  assert.equal(pod.res.has(alt), false, 'der alte Grant im Klartext ist gelöscht');
  assert.ok(pod.res.has(fremd) && pod.res.has(daneben), 'anderes bleibt');
});

test('[Pod·Grant·Rot-Beweis] prüfte die Brücke den Grant erst nach dem Ablegen, ginge die Freigabe trotz Abweisung in den Pod', async () => {
  const stelle = "        if (art === 'stelle') grantKoerper(wurzel, adresse, stelleWebid, bis, z.zweck, z.inbox);\n";
  assert.equal(QUELLE.split(stelle).length, 2);
  const { pod, fehler } = await grantFormLauf(QUELLE.replace(stelle, ''), { zweck: 'http://zweck.example/z' });
  assert.match(fehler || '', /aussenablage:grant-form/);
  assert.ok(pod.ablauf.some((z) => z.startsWith('PUT ' + ORDNER_D) && z !== 'PUT ' + ORDNER_D && !z.endsWith('.acl')),
    'die Freigabe ging in den Pod, lesbar bis zur Rücknahme');
});

test('[Pod·Übergang·Rot-Beweis] ohne das Abräumen nach der Bestätigung bliebe der alte Grant im Klartext liegen', async () => {
  const stelle = '.then(alteGrantsLoeschen)';
  assert.equal(QUELLE.split(stelle).length, 2);
  const { pod, alt } = await alteGrantsLauf(QUELLE.replace(stelle, ''));
  assert.equal(pod.res.has(alt), true);
});

// Befund GRANT-POST-WAISE (NIEDRIG, 04.11.2026): Scheiterte der POST an den Grant-Dienst nach PUT und Regel, lag die Ablage für die
// Stelle lesbar im Pod, ohne Verzeichnis-Eintrag, Ablauf und Rücknahme. Die Brücke nimmt sie dann zurück.
async function dienstScheitertLauf(quelle) {
  const pod = podStellen({ dienst: true, dienstStatus: 500 });
  const g = await geraet(pod, { quelle });
  const fehler = await g.B.ablegen(ANTWORT, 'stelle', STELLE, 1, {}).then(() => null, (e) => e.message);
  return { pod, g, fehler, imOrdner: [...pod.res.keys()].filter((k) => k.startsWith(ORDNER_D) && k !== ORDNER_D) };
}

test('[Pod·Grant] scheitert der Grant-Dienst nach dem Ablegen, nimmt die Brücke die Ablage zurück und meldet den Fehler', async () => {
  const { pod, g, fehler, imOrdner } = await dienstScheitertLauf(QUELLE);
  assert.equal(fehler, 'grant-dienst-500', 'der ursprüngliche Fehler bleibt sichtbar');
  assert.deepEqual(imOrdner, [], 'keine verwaiste Ablage im Pod');
  assert.ok(![...pod.acl.keys()].some((k) => k.startsWith(ORDNER_D) && k !== ORDNER_D), 'keine Regel ohne Ablage');
  assert.ok(!(g.lokal() || []).some((e) => e.art === 'stelle'), 'kein Eintrag im Verzeichnis');
});

test('[Pod·Grant·Rot-Beweis] ohne die Rücknahme nach einem Fehler läge die Ablage verwaist im Pod', async () => {
  const stelle = '.then(function () { return nachDemAblegen(adresse); });';
  assert.equal(QUELLE.split(stelle).length, 2);
  const stelle2 = "              .then(function () { return loeschen(adresse); }).then(weg, weg);";
  assert.equal(QUELLE.split(stelle2).length, 2);
  const { fehler, imOrdner } = await dienstScheitertLauf(QUELLE.replace(stelle2, '              .then(weg, weg);'));
  assert.equal(fehler, 'grant-dienst-500');
  assert.equal(imOrdner.length, 1, 'die Ablage liegt verwaist im Pod');
});
