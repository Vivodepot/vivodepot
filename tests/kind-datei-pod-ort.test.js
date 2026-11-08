'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kind-Datei im Solid Pod — der dritte Ort (05.11.2026, neu aufgesetzt 06.11.2026; U2-ADR-454, Nachtrag zu U2-ADR-512, U2-ADR-520)
   ────────────────────────────────────────────────────────────────────────────
   Die Website sagt: „Ihr Kind kann es später übernehmen, ohne dass Sie mitwirken müssen.“ Gemessen am Kern davor: die Kind-Datei
   hatte zwei Orte (Datei-Handle, Ausgabe); im Pod legte jedes Ablegen eine neue Datei an, eine Adresse, die bleibt und die das
   Kind lesen darf, gab es nicht.

   Jetzt: `KIND_DATEI_ORTE.pod`. Für die Brücke ist das Kind eine Stelle (Art `stelle`): derselbe Schreibweg über
   pod/aussenablage.js, dieselbe Regel `<#stelle>` (nur Lesen), Grant per POST, Verzeichnis und Ablaufliste. Jedes weitere Sichern
   ersetzt den Stand an derselben Adresse (`ersetzen`). Gehalten wird je Bedingung der Krypto-Gegenlesung:
   1. Hülle: hinaus gehen nur die Felder aus AUSSENABLAGE_HUELLE_FELDER; das Kind öffnet die Datei allein mit seinem Passwort.
   2. Adresse: die Brücke wählt den Zufallspfad; der Kern hält Adresse und ETag in `ziel`, keinen Namen, kein Datum, keine depotUUID.
   3. If-Match: das erste Schreiben mit If-None-Match: *, jedes weitere mit dem ETag des letzten Stands; 412 schreibt nichts und
      ist ein Konflikt. `*` oder kein ETag weist die Brücke ab. Ohne ETag in der Antwort: `kind-ohne-etag`.
   4. Grant: wie bei jeder Stelle — mit Dienst per POST, `bis` = Ablauf; ohne Dienst und Inbox steht die Ablage mit Regel, ohne Grant.
   5. Das Kind bekommt nur acl:Read; der Ablauf liegt KIND_POD_FRIST_JAHRE nach der Volljährigkeit und in der Zukunft.
   6. Die WebID trägt die Person ein und bestätigt sie mit dem Klick; sie steht in `ziel.webid` und im Satz vor dem Klick.
   Ersetzen: nur ein eigener, gültiger, nicht abgelaufener Verzeichnis-Eintrag der Art `stelle` im Ablageordner; nur eine
   Depot-Datei; die Nachricht trägt genau Adresse und ETag, keine Art und keine Stelle. Rot-Beweise je Bedingung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');
const C = require('../pod/chiffrat-pruefen.js');

const ANKER_PW = 'Anker-Kind-Pod-2026!';
const SUB_PW = 'Sub-Kind-Pod-2026!';
const KIND = 'https://kind.example/profile/card#me';
const HERKUNFT = 'https://pod.vivodepot.de';

async function elternMitKind() {
  const k = ladeKern({ Blob });
  const { V } = k;
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Mutter');
  // Das Kind steht unter den Menschen, mit Geburtsdatum; das Sub-Depot ist mit ihm verknüpft (daraus das Geburtsjahr).
  V.ankerDaten().menschen.push({ id: 'kind-lea', name: 'Lea', birthDate: '2015-03-04' });
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet', vertreteneRegisterId: 'kind-lea' }, SUB_PW);
  return { V, e };
}

// Ein Brückenfenster zum Mitschreiben: jeder Auftrag landet in `auftraege`, `antworten(...)` schickt die Antwort der Brücke.
function bruecke() {
  const hoerer = new Set();
  const auftraege = [];
  const w = { postMessage: (n) => { if (n.typ === 'vd-pod-ablegen') auftraege.push(n); } };
  const o = {
    oeffnen: () => w,
    ziel: { addEventListener: (t, f) => { if (t === 'message') hoerer.add(f); }, removeEventListener: (t, f) => hoerer.delete(f) },
    uhr: () => 1, uhrAus: () => {}, jetzt: () => 1000000,
  };
  const senden = (data) => { for (const f of [...hoerer]) f({ source: w, origin: HERKUNFT, data }); };
  const naechster = () => new Promise((r) => setImmediate(r));
  return { o, auftraege, senden, naechster };
}
async function schreibenMit(V, e, antwort) {
  const b = bruecke();
  const p = V.KIND_DATEI_ORTE.pod.schreiben(e.depotUUID, V.depotDateiAusUmschlag(e.umschlag), e.kindDatei.ziel, e.kindDatei.stand, b.o);
  b.senden({ typ: 'vd-pod-bereit', fassung: 1 });
  await b.naechster();
  const a = b.auftraege[0];
  antwort(b, a);
  return { r: await p, a };
}
async function eingerichtet() {
  const { V, e } = await elternMitKind();
  const ziel = await V.KIND_DATEI_ORTE.pod.einrichten(e.depotUUID, { webid: KIND });
  e.kindDatei = { ort: 'pod', ziel, eingerichtet_am: '2026-11-05T00:00:00Z', geschrieben_am: null, stand: null };
  return { V, e, ziel };
}
const ADRESSE = 'https://speicher.example/person/vivodepot/d/' + 'Z'.repeat(22);
const abgelegt = (a, etag, adresse) => ({ typ: 'vd-pod-abgelegt', fassung: 1, id: a.id, adresse: adresse || ADRESSE, etag });
const ERST_FELDER = ['ablauf', 'art', 'bis', 'daten', 'fassung', 'id', 'stelle', 'typ'];
const ERSETZEN_FELDER = ['adresse', 'bis', 'daten', 'etag', 'fassung', 'id', 'typ'];

test('[Kind-Pod·Ort] der Pod ist ein Ort wie die anderen und schreibt nie still', async () => {
  const { V } = await elternMitKind();
  const pod = V.KIND_DATEI_ORTE.pod;
  for (const f of ['verfuegbar', 'einrichten', 'sitzungsbereit', 'schreiben']) assert.equal(typeof pod[f], 'function', f);
  assert.equal(pod.sitzungsbereit('x'), false, 'jedes Schreiben öffnet die Brücke und braucht eine Geste');
  await assert.rejects(() => V.podAblegen('kind', 'x', bruecke().o), /pod-art/, 'keine eigene Art: das Kind ist eine Stelle');
  await assert.rejects(() => V.podAblegen('eigen', 'x', Object.assign(bruecke().o, { kind: { webid: KIND, ablauf: null, adresse: null, etag: null } })),
    /pod-kind/, 'Kind-Felder nur an der Art stelle');
});

test('[Kind-Pod·1 Hülle] hinaus gehen nur die Felder der Positivliste; die Tür nimmt sie als Depot-Datei der Art stelle', async () => {
  const { V, e } = await eingerichtet();
  const { a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  const text = new TextDecoder().decode(new Uint8Array(a.daten));
  const roh = JSON.parse(V.magicStrippen(text).json);
  for (const k of Object.keys(roh)) assert.ok(V.AUSSENABLAGE_HUELLE_FELDER.includes(k), k + ' steht nicht in der Positivliste');
  assert.equal(C.pruefen(text).art, 'depot');
  assert.equal(C.passtZurArt(text, 'stelle', Buffer.byteLength(text)), true, 'die Tür der Brücke nimmt sie an');
});

test('[Kind-Pod·1 Hülle] das Kind öffnet die Datei aus dem Pod allein mit seinem Passwort', async () => {
  const { V, e } = await eingerichtet();
  const { a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  const text = new TextDecoder().decode(new Uint8Array(a.daten));
  const K = ladeKern().V;
  assert.equal(K.getData(), null, 'Vorbedingung: das Kind hat keine Sitzung der Eltern');
  await K.depotLaden(K.umschlagEntpacken(JSON.parse(K.magicStrippen(text).json)), SUB_PW);
  assert.ok(K.getData(), 'das Kind hat ein eigenes Depot');
});

test('[Kind-Pod·2 Adresse] der Kern hält nur WebID, Ablauf, Adresse und ETag; die Adresse wählt die Brücke', async () => {
  const { V, e, ziel } = await eingerichtet();
  assert.deepEqual(Object.keys(ziel).sort(), ['ablauf', 'adresse', 'etag', 'webid']);
  assert.equal(ziel.adresse, null);
  const verraet = (t) => [e.depotUUID, e.depotUUID.replace(/-/g, ''), 'Lea', 'lea', '2015'].some((s) => String(t).includes(s));
  const { a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  assert.deepEqual(Object.keys(a).sort(), ERST_FELDER, 'das erste Schreiben: Art, Stelle und Ablauf, keine Adresse');
  assert.equal(a.art, 'stelle');
  assert.equal(verraet(JSON.stringify(Object.assign({}, a, { daten: null }))), false, 'der Auftrag nennt weder Namen noch depotUUID');
  assert.equal(verraet('Lea'), true, 'Rot-Beweis: ein Name fällt auf');
  assert.equal(ziel.adresse, ADRESSE, 'die Adresse aus der Antwort der Brücke');
});

test('[Kind-Pod·3 If-Match] das zweite Schreiben ersetzt: genau Adresse und ETag des ersten, keine Art und keine Stelle', async () => {
  const { V, e, ziel } = await eingerichtet();
  const eins = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  assert.equal(eins.r, 'geschrieben');
  assert.equal(ziel.etag, '"E1"');
  const zwei = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E2"')));
  assert.equal(zwei.r, 'geschrieben');
  assert.deepEqual(Object.keys(zwei.a).sort(), ERSETZEN_FELDER);
  assert.equal(zwei.a.adresse, ADRESSE);
  assert.equal(zwei.a.etag, '"E1"', 'If-Match auf den zuletzt geschriebenen Stand');
  assert.equal(ziel.etag, '"E2"');
  assert.equal(ziel.adresse, ADRESSE);
});

test('[Kind-Pod·3 If-Match] Konflikt: nichts übernommen; eine Antwort ohne ETag oder mit anderer Adresse zählt nicht', async () => {
  const { V, e, ziel } = await eingerichtet();
  await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  const k = await schreibenMit(V, e, (b, x) => b.senden({ typ: 'vd-pod-konflikt', fassung: 1, id: x.id }));
  assert.equal(k.r, 'konflikt');
  assert.equal(ziel.etag, '"E1"', 'das ETag bleibt beim letzten eigenen Stand');
  for (const falsch of [(x) => abgelegt(x, undefined), (x) => abgelegt(x, '"E9"', 'https://speicher.example/person/vivodepot/d/anders'),
    (x) => ({ typ: 'vd-pod-abgelegt', fassung: 1, id: x.id, adresse: ADRESSE, etag: '"E9"', art: 'stelle' })]) {
    const b = bruecke();
    const p = V.KIND_DATEI_ORTE.pod.schreiben(e.depotUUID, V.depotDateiAusUmschlag(e.umschlag), ziel, null, b.o);
    let fertig = false; p.then(() => { fertig = true; });
    b.senden({ typ: 'vd-pod-bereit', fassung: 1 });
    await b.naechster();
    const d = falsch(b.auftraege[0]); if (d.etag === undefined) delete d.etag;
    b.senden(d);
    await b.naechster();
    assert.equal(fertig, false, 'unbrauchbare Antwort wird nicht angenommen');
  }
});

test('[Kind-Pod·3 If-Match] beim ersten Schreiben gibt es keinen Konflikt; ohne ETag in der Antwort bleibt das Ziel leer', async () => {
  const { V, e, ziel } = await eingerichtet();
  const b = bruecke();
  const p = V.KIND_DATEI_ORTE.pod.schreiben(e.depotUUID, V.depotDateiAusUmschlag(e.umschlag), ziel, null, b.o);
  let fertig = false; p.then(() => { fertig = true; });
  b.senden({ typ: 'vd-pod-bereit', fassung: 1 });
  await b.naechster();
  const x = b.auftraege[0];
  b.senden({ typ: 'vd-pod-konflikt', fassung: 1, id: x.id });
  const ohne = abgelegt(x, '"E1"'); delete ohne.etag; b.senden(ohne);
  await b.naechster();
  assert.equal(fertig, false);
  assert.equal(ziel.adresse, null);
  // Adresse ohne ETag (oder umgekehrt) ist kein Ziel, an das der Kern schreibt.
  assert.equal(await V.KIND_DATEI_ORTE.pod.schreiben(e.depotUUID, {}, Object.assign({}, ziel, { adresse: ADRESSE }), null, bruecke().o), 'kein-ziel');
});

test('[Kind-Pod·5 Ablauf] zum Jahreswechsel nach dem 24. Lebensjahr; ohne Geburtsjahr kein Ablauf', async () => {
  const { V } = await elternMitKind();
  // Frühestens zum 24. Geburtstag: Hemmung der Verjährung bis 21 (§§ 207, 209 BGB) plus drei Jahre (§ 195 BGB).
  assert.equal(V.KIND_POD_FRIST_JAHRE, 6);
  assert.equal(V.KIND_POD_VOLLJAEHRIG_JAHRE, 18);
  const ab = V._kindPodAblauf(2015);
  assert.equal(ab, Date.UTC(2040, 0, 1), 'mit Ablauf des 31.12. des Jahres, in dem das Kind 24 wird');
  assert.ok(ab >= Date.UTC(2039, 2, 4), 'nie vor dem 24. Geburtstag');
  // Rot-Beweis: die vorläufigen zwei Jahre endeten vor dem 24. Geburtstag.
  assert.ok(Date.UTC(2015 + 18 + 2, 2, 4) < Date.UTC(2039, 2, 4));
  assert.equal(V._kindPodAblauf(''), null);
  const { e, ziel } = await eingerichtet();
  assert.equal(ziel.ablauf, ab);
  const { a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  assert.equal(a.ablauf, ab, 'der Ablauf geht mit dem ersten Auftrag');
});

test('[Kind-Pod·6 WebID] nur eine https-WebID; sie steht im Eintrag und geht als Stelle mit dem ersten Auftrag', async () => {
  const { V, e, ziel } = await eingerichtet();
  for (const falsch of ['', 'http://kind.example/#me', 'https://a:b@kind.example/', 'kein text', undefined]) {
    await assert.rejects(() => V.KIND_DATEI_ORTE.pod.einrichten(e.depotUUID, { webid: falsch }), /WebID/, String(falsch));
  }
  assert.equal(ziel.webid, KIND);
  const { a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  assert.equal(a.stelle, KIND);
});

test('[Kind-Pod·6 WebID] der Dialog trägt die WebID ein; ohne gültige WebID richtet er nichts ein', async () => {
  const { V, e } = await elternMitKind();
  let opt = null;
  V.ui.modal = (o) => { opt = o; return () => {}; };
  const meldungen = [];
  V.ui.toast = (t, art) => meldungen.push(art);
  V.flowKindDateiEinrichten(e.depotUUID);
  assert.match(opt.koerperHTML, /id="kind-datei-webid"/);
  assert.equal(opt.zweitAktion.label, V.STRINGS.btnKindDateiPod);
  let geschlossen = false;
  await opt.zweitAktion.handler(() => { geschlossen = true; });   // das Feld ist im DOM-Ersatz leer
  assert.equal(geschlossen, false);
  assert.deepEqual(meldungen, ['fehler']);
  assert.equal(e.kindDatei, undefined, 'nichts eingerichtet');
});

/* ── Brücke (pod/bruecke.js, vm-Kontext; Anmeldung und Pod gestellt, Chiffrat-Tür und Schreibweg sind die echten) ── */
const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'bruecke.js'), 'utf8');
const KONFIG = fs.readFileSync(path.join(__dirname, '..', 'pod', 'konfiguration.js'), 'utf8');
const AUSSEN = fs.readFileSync(path.join(__dirname, '..', 'pod', 'aussenablage.js'), 'utf8');
const WEBID = 'https://person.example/profile/card#me';
const SPEICHER = 'https://speicher.example/person/';
const ABLAGE = SPEICHER + 'vivodepot/d/';
const DIENST = SPEICHER + 'grants/';
const DEPOT = 'VIVODEPOT\u0001' + JSON.stringify({ kryptoVersion: 3, depotUUID: 'u', pbkdf2: { salt: 's' }, depotSalt: 'd', iv: 'i', ct: 'c' });
const KERN = 'https://privat-de.vivodepot.org';
const ABLAUF = Date.UTC(2040, 0, 1);   // Jahreswechsel nach dem 24. Lebensjahr bei Geburtstag 04.03.2015
const puffer = (s) => { const u = new TextEncoder().encode(s); return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); };
const warten = (ms) => new Promise((r) => setTimeout(r, ms));

/* status: Antwort auf das PUT der Ablage; etag: ihr ETag-Kopf (null = keiner); dienst: der Speicher bietet einen Grant-Dienst;
   vorher: das lokale Verzeichnis beim Laden; loeschenScheitert: jedes DELETE antwortet 500. */
async function seite({ quelle = QUELLE, status = 201, etag = '"NEU"', dienst = false, vorher, loeschenScheitert = false, grantScheitert = false } = {}) {
  const elemente = {};
  const el = (id) => (elemente[id] = elemente[id] || { id, hidden: false, readOnly: false, textContent: '', value: '', onclick: null, onchange: null, files: [], appendChild() {} });
  const anfragen = [];
  const anOpener = [];
  const opener = { postMessage: (n, ziel) => anOpener.push({ n: JSON.parse(JSON.stringify(n)), ziel }) };
  const lager = { v: vorher ? JSON.parse(JSON.stringify(vorher)) : undefined };
  let hoerer = null;
  const antwort = (st, kopf, json) => ({ ok: st < 300, status: st, headers: { get: (h) => (kopf && kopf[h] !== undefined ? kopf[h] : null) },
    json: async () => json || null, text: async () => '' });
  const A = {
    ruecksprungVerarbeiten: async () => WEBID, sitzung: async () => ({ webid: WEBID }), speicherSetzen: async () => {},
    abmelden: async () => 'lokal-geloescht',
    podFetch: async (adresse, o = {}) => {
      const a = String(adresse);
      const methode = (o.method || 'GET').toUpperCase();
      anfragen.push({ adresse: a, methode, kopf: o.headers || {}, koerper: o.body });
      if (methode === 'DELETE' && loeschenScheitert) return antwort(500);
      if (methode === 'GET' && a.endsWith('vivodepot/k/v1.jose')) return antwort(503);   // Kopie gesperrt: kein Warten auf den Kern
      if (methode === 'GET' && a.endsWith('vivodepot/k/a1.json')) return antwort(404);
      if (methode === 'HEAD' && a === SPEICHER) return antwort(200, dienst ? { Link: '<' + SPEICHER + 'beschreibung>; rel="http://www.w3.org/ns/solid/terms#storageDescription"' } : {});
      if (methode === 'GET' && a === SPEICHER + 'beschreibung') return antwort(200, {}, { service: [{ type: 'AccessGrantService', id: DIENST }] });
      if (methode === 'POST' && a === DIENST) return grantScheitert ? antwort(500) : antwort(201, { Location: DIENST + 'g1' });
      if (methode === 'PUT' && a.startsWith(ABLAGE) && a !== ABLAGE && !a.endsWith('.acl')) return antwort(status, etag === null ? {} : { ETag: etag });
      return antwort(methode === 'HEAD' ? 200 : 201);
    },
    verzeichnis: { lesen: async () => lager.v && JSON.parse(JSON.stringify(lager.v)), schreiben: async (v) => { lager.v = JSON.parse(JSON.stringify(v)); }, loeschen: async () => { lager.v = undefined; } },
  };
  const kontext = {
    vdPodAnmeldung: A, vdPodChiffrat: C, vdPodLws: require('../pod/lws.js'),
    document: { readyState: 'complete', getElementById: el, createElement: () => el('neu-' + Math.random()), querySelector: () => null },
    window: { opener, addEventListener: (t, f) => { if (t === 'message') hoerer = f; } },
    fetch: async () => ({ ok: true, text: async () => '<#me> <http://www.w3.org/ns/pim/space#storage> <' + SPEICHER + '>.\n' }),
    crypto: webcrypto, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), Blob, URL, Promise, Date, Number, String, Error, Uint8Array, JSON,
    ArrayBuffer, TextDecoder, Object, setTimeout, clearTimeout,
  };
  kontext.self = kontext;
  vm.createContext(kontext);
  vm.runInContext(KONFIG, kontext);
  vm.runInContext(AUSSEN, kontext);
  vm.runInContext(quelle, kontext);
  await warten(20);
  el('ziel-ja').onclick();
  await warten(20);
  const senden = (data) => hoerer({ source: opener, origin: KERN, data });
  const ja = async () => { await warten(850); el('auftrag-ja').onclick(); await warten(60); };
  const ablagePuts = () => anfragen.filter((x) => x.methode === 'PUT' && x.adresse.startsWith(ABLAGE) && x.adresse !== ABLAGE && !x.adresse.endsWith('.acl'));
  const antworten = () => anOpener.map((x) => x.n).filter((n) => n.typ !== 'vd-pod-bereit');
  return { el, ja, anfragen, anOpener, senden, ablagePuts, antworten, lager, B: kontext.vdPodBruecke };
}
const ID = 'A'.repeat(22);
const erstAuftrag = (extra) => Object.assign({ typ: 'vd-pod-ablegen', fassung: 1, id: ID, art: 'stelle', bis: Date.now() + 600000,
  daten: puffer(DEPOT), stelle: KIND, ablauf: ABLAUF }, extra || {});
const EIGENE = ABLAGE + 'B'.repeat(22);
const eintrag = (extra) => Object.assign({ adresse: EIGENE, art: 'stelle', stelle: KIND, bis: ABLAUF, am: 1, grant: null, ueberDienst: false, benachrichtigt: false }, extra || {});
const ersetzAuftrag = (extra) => Object.assign({ typ: 'vd-pod-ablegen', fassung: 1, id: ID, bis: Date.now() + 600000, daten: puffer(DEPOT),
  adresse: EIGENE, etag: '"ALT"' }, extra || {});

function nurLesenFuerDasKind(s, adresse) {
  const acl = s.anfragen.find((x) => x.methode === 'PUT' && x.adresse === adresse + '.acl');
  assert.ok(acl, 'die Regel für die Ablage wird gesetzt');
  const kindRegel = acl.koerper.split('\n').find((z) => z.includes('<' + KIND + '>'));
  assert.ok(kindRegel, 'eine Regel für die WebID des Kindes');
  assert.match(kindRegel, /^<#stelle> a acl:Authorization; .*acl:mode acl:Read\.$/, 'die Regel einer Stelle: nur Lesen');
  assert.doesNotMatch(kindRegel, /Write|Control|Append/);
}

test('[Kind-Pod·Brücke·erstes] als Stelle: Satz mit WebID, Zufallspfad, If-None-Match, nur Lesen, Grant beim Dienst mit dem Ablauf, Antwort mit ETag', async () => {
  const s = await seite({ dienst: true });
  s.senden(erstAuftrag());
  assert.match(s.el('auftrag-satz').textContent, /Kind-Datei.*WebID https:\/\/kind\.example\/profile\/card#me/, 'die Person sieht die WebID vor dem Klick');
  assert.equal(s.el('stelle').value, KIND);
  assert.equal(s.el('stelle').readOnly, true, 'die WebID kommt aus der Anwendung und ist hier nicht zu ändern');
  assert.equal(s.ablagePuts().length, 0, 'vor dem Klick nichts');
  await s.ja();
  const p = s.ablagePuts();
  assert.equal(p.length, 1);
  assert.match(p[0].adresse, /^https:\/\/speicher\.example\/person\/vivodepot\/d\/[A-Za-z0-9_-]{22}$/, 'neutraler Ordner, Zufallspfad');
  assert.equal(p[0].kopf['If-None-Match'], '*');
  nurLesenFuerDasKind(s, p[0].adresse);
  const grant = s.anfragen.find((x) => x.methode === 'POST' && x.adresse === DIENST);
  assert.ok(grant, 'der Grant geht per POST an den Dienst');
  const g = JSON.parse(grant.koerper);
  assert.deepEqual(g.access[0].action, ['read']);
  assert.equal(g.access[0].assignee, KIND);
  assert.equal(Date.parse(g.access[0].constraint.find((c) => c.leftOperand === 'dateTime').rightOperand), ABLAUF, 'der Grant läuft zum Jahresende des 24. Lebensjahrs ab');
  assert.ok(!s.anfragen.some((x) => x.methode === 'PUT' && /grant/i.test(x.adresse)), 'kein Grant als Datei im Pod');
  assert.deepEqual(s.lager.v.map((e) => [e.adresse, e.art, e.stelle, e.bis]), [[p[0].adresse, 'stelle', KIND, ABLAUF]], 'Verzeichnis mit Ablauf');
  const a1 = s.anfragen.find((x) => x.methode === 'PUT' && x.adresse.endsWith('vivodepot/k/a1.json'));
  assert.deepEqual(JSON.parse(a1.koerper).ablagen, [{ adresse: p[0].adresse, bis: ABLAUF }], 'Ablaufliste');
  assert.deepEqual(s.antworten(), [{ typ: 'vd-pod-abgelegt', fassung: 1, id: ID, adresse: p[0].adresse, etag: '"NEU"' }]);
});

test('[Kind-Pod·Brücke·erstes] ohne Dienst und Inbox: die Ablage steht mit Regel und Ablauf, ohne Grant', async () => {
  const s = await seite();
  s.senden(erstAuftrag());
  await s.ja();
  const p = s.ablagePuts();
  assert.equal(p.length, 1);
  nurLesenFuerDasKind(s, p[0].adresse);
  assert.ok(!s.anfragen.some((x) => x.methode === 'POST'), 'kein Grant');
  assert.deepEqual(s.lager.v.map((e) => [e.art, e.grant, e.bis]), [['stelle', null, ABLAUF]]);
  assert.equal(s.antworten()[0].etag, '"NEU"');
});

test('[Kind-Pod·Brücke·erstes] ohne ETag in der Antwort bleibt nichts liegen (kind-ohne-etag)', async () => {
  const s = await seite({ etag: null });
  s.senden(erstAuftrag());
  await s.ja();
  const p = s.ablagePuts();
  assert.equal(p.length, 1);
  assert.ok(s.anfragen.some((x) => x.methode === 'DELETE' && x.adresse === p[0].adresse), 'die eben angelegte Ablage wird zurückgenommen');
  assert.equal(s.el('fehler').textContent, 'kind-ohne-etag');
  assert.deepEqual(s.antworten(), []);
  assert.equal(s.lager.v, undefined, 'kein Verzeichnis-Eintrag');
});

test('[Kind-Pod·Brücke·erstes] ein Ablauf in der Vergangenheit wird abgewiesen, bevor etwas geschrieben wird', async () => {
  const s = await seite();
  s.senden(erstAuftrag({ ablauf: Date.now() - 1000 }));
  assert.equal(s.el('auftrag-satz').textContent, '', 'die Nachricht wird verworfen');
  await assert.rejects(() => s.B.ablegen(DEPOT, 'stelle', KIND, null, { bis: Date.now() - 1000 }), /ablauf-vergangen/);
  await assert.rejects(() => s.B.ablegen(DEPOT, 'eigen', null, null, { bis: ABLAUF }), /ablauf-vergangen/, 'ein Ablauf nur an der Art stelle');
  assert.equal(s.ablagePuts().length, 0);
});

test('[Kind-Pod·Brücke·ersetzen] If-Match auf das ETag, keine Regel, kein Grant, kein Verzeichnis; Antwort mit neuem ETag', async () => {
  const s = await seite({ vorher: [eintrag()] });
  s.senden(ersetzAuftrag());
  assert.match(s.el('auftrag-satz').textContent, /ersetzen/);
  assert.match(s.el('auftrag-satz').textContent, new RegExp(EIGENE));
  await s.ja();
  const p = s.ablagePuts();
  assert.equal(p.length, 1);
  assert.equal(p[0].adresse, EIGENE);
  assert.equal(p[0].kopf['If-Match'], '"ALT"');
  assert.equal(p[0].kopf['If-None-Match'], undefined);
  const sonst = s.anfragen.filter((x) => (x.methode === 'PUT' || x.methode === 'POST' || x.methode === 'DELETE') && x.adresse !== EIGENE);
  assert.deepEqual(sonst, [], 'keine Regel, kein Grant, keine Ablaufliste, keine Kopie');
  assert.deepEqual(s.lager.v, [eintrag()], 'das Verzeichnis bleibt, wie es ist');
  assert.deepEqual(s.antworten(), [{ typ: 'vd-pod-abgelegt', fassung: 1, id: ID, adresse: EIGENE, etag: '"NEU"' }]);
});

test('[Kind-Pod·Brücke·ersetzen] 412: Konflikt an die Anwendung, nichts weiter geschrieben', async () => {
  const s = await seite({ status: 412, vorher: [eintrag()] });
  s.senden(ersetzAuftrag());
  await s.ja();
  assert.equal(s.ablagePuts().length, 1);
  assert.deepEqual(s.antworten(), [{ typ: 'vd-pod-konflikt', fassung: 1, id: ID }]);
  assert.deepEqual(s.lager.v, [eintrag()]);
});

test('[Kind-Pod·Brücke·ersetzen] ohne ETag in der Antwort: kind-ohne-etag, keine Antwort an die Anwendung', async () => {
  const s = await seite({ etag: null, vorher: [eintrag()] });
  await assert.rejects(() => s.B.ersetzen(EIGENE, DEPOT, '"ALT"'), /kind-ohne-etag/);
  assert.equal(s.anfragen.filter((x) => x.methode !== 'PUT' || x.adresse !== EIGENE).filter((x) => x.methode === 'PUT' || x.methode === 'DELETE').length, 0);
});

test('[Kind-Pod·Brücke·ersetzen·Rot-Beweise] fremde Adresse, Adresse aus vivodepot/k/, abgelaufener Eintrag, andere Art: nichts geschrieben', async () => {
  const intern = SPEICHER + 'vivodepot/k/v1.jose';
  const faelle = [
    [[eintrag()], 'https://anders.example/vivodepot/d/' + 'B'.repeat(22), 'fremder Speicher'],
    [[eintrag()], ABLAGE + 'C'.repeat(22), 'nicht im Verzeichnis'],
    [[eintrag({ adresse: intern })], intern, 'Verzeichnisordner'],
    [[eintrag({ bis: Date.now() - 1000 })], EIGENE, 'abgelaufen'],
    [[eintrag({ art: 'eigen', stelle: null })], EIGENE, 'Art eigen'],
    [[eintrag({ adresse: SPEICHER + 'vivodepot/freigaben/' + 'B'.repeat(22) })], SPEICHER + 'vivodepot/freigaben/' + 'B'.repeat(22), 'alter Ordner'],
  ];
  for (const [vorher, adresse, was] of faelle) {
    // Einen abgelaufenen Eintrag nimmt die Brücke schon beim Laden zurück; scheitert das, steht er noch und ersetzen weist ihn ab.
    const s = await seite({ vorher, loeschenScheitert: true });
    assert.equal((s.lager.v || []).length, 1, was + ': der Eintrag steht noch');
    const vorAufruf = s.anfragen.length;
    await assert.rejects(() => s.B.ersetzen(adresse, DEPOT, '"ALT"'), /ersetzen-fremde-adresse/, was);
    assert.equal(s.anfragen.slice(vorAufruf).filter((x) => x.methode === 'PUT' || x.methode === 'POST' || x.methode === 'DELETE').length, 0, was + ': nichts geschrieben');
  }
  // Gegenprobe: derselbe Aufruf mit dem eigenen Eintrag schreibt.
  const s = await seite({ vorher: [eintrag()] });
  assert.deepEqual(JSON.parse(JSON.stringify(await s.B.ersetzen(EIGENE, DEPOT, '"ALT"'))), { adresse: EIGENE, etag: '"NEU"' });
});

test('[Kind-Pod·Brücke·ersetzen·Rot-Beweise] nur eine Depot-Datei; If-Match nur mit einem ETag aus dem Kern', async () => {
  const s = await seite({ vorher: [eintrag()] });
  const antwortJwe = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..' + 'a'.repeat(16) + '.' + 'b'.repeat(40) + '.' + 'c'.repeat(22);
  await assert.rejects(() => s.B.ersetzen(EIGENE, JSON.stringify({ name: 'Lea' }), '"ALT"'), /nicht-chiffrat/, 'Klartext');
  if (!C.pruefen(antwortJwe).fehler) await assert.rejects(() => s.B.ersetzen(EIGENE, antwortJwe, '"ALT"'), /ersetzen-nur-depot/, 'eine Antwort-JWE ersetzt keine Kind-Datei');
  for (const falsch of ['*', '', undefined, null, 'ALT', '"A\u0001"', '"' + 'x'.repeat(260) + '"', 5]) {
    await assert.rejects(() => s.B.ersetzen(EIGENE, DEPOT, falsch), /ersetzen-etag/, String(falsch));
  }
  assert.equal(s.ablagePuts().length, 0);
  await s.B.ersetzen(EIGENE, DEPOT, 'W/"schwach"');
  assert.equal(s.ablagePuts()[0].kopf['If-Match'], 'W/"schwach"', 'Gegenprobe: ein schwaches ETag gilt');
});

test('[Kind-Pod·Brücke·Nachricht] verworfen: Zusatzfeld, Art oder Stelle beim Ersetzen, fehlendes ETag, Kind-Felder an einer anderen Art, falsche WebID', async () => {
  const s = await seite({ vorher: [eintrag()] });
  const ohneEtag = ersetzAuftrag(); delete ohneEtag.etag;
  const faelle = [
    [ersetzAuftrag({ extra: 1 }), 'Zusatzfeld beim Ersetzen'], [ersetzAuftrag({ art: 'stelle' }), 'Art beim Ersetzen'],
    [ersetzAuftrag({ stelle: KIND }), 'Stelle beim Ersetzen'], [ohneEtag, 'ohne ETag'], [ersetzAuftrag({ etag: '*' }), 'ETag *'],
    [erstAuftrag({ extra: 1 }), 'Zusatzfeld beim ersten'], [erstAuftrag({ art: 'eigen' }), 'Kind-Felder an der Art eigen'],
    [erstAuftrag({ stelle: 'nicht eine adresse' }), 'WebID'], [erstAuftrag({ ablauf: 'morgen' }), 'Ablauf keine Zahl'],
    [erstAuftrag({ daten: puffer(JSON.stringify({ name: 'Lea' })) }), 'Klartext'],
  ];
  for (const [d, was] of faelle) { s.senden(d); assert.equal(s.el('auftrag-satz').textContent, '', was + ' wird verworfen'); }
  s.senden(ersetzAuftrag());
  assert.match(s.el('auftrag-satz').textContent, /ersetzen/, 'Gegenprobe: der richtige Auftrag wird angenommen');
});

test('[Kind-Pod·Brücke·Weg] ersetzen schreibt nur über den einen Schreibweg; ein direkter fetch fiele dem Wächter auf', () => {
  const start = QUELLE.indexOf('function ersetzen(');
  const ende = QUELLE.indexOf('function verzeichnis()', start);
  const rumpf = QUELLE.slice(start, ende);
  assert.match(rumpf, /W\.schreiben\(A\.podFetch, 'PUT', adresse, 'chiffrat', text, \{ 'Content-Type': 'application\/octet-stream', 'If-Match': etag \}\)/);
  // Dasselbe Muster wie tests/aussenablage-einziger-weg.test.js (MUSTER „methode“).
  const methode = /\bmethod\s*:\s*(['"`])(PUT|POST|PATCH|PROPPATCH|MKCOL|COPY|MOVE)\1/gi;
  assert.equal([...rumpf.matchAll(methode)].length, 0);
  const direkt = rumpf.replace(/W\.schreiben\(A\.podFetch, 'PUT', adresse, 'chiffrat', text, (\{[^}]*\})\)/, "fetch(adresse, { method: 'PUT', body: text, headers: $1 })");
  assert.notEqual(direkt, rumpf, 'Vorbedingung: die Stelle gibt es');
  assert.equal([...direkt.matchAll(methode)].length, 1, 'Rot-Beweis: ein direkter fetch ist eine Schreibstelle');
});

/* ── Befund KIND-ABLAUF-VERRAET-GEBURTSDATUM (HOCH, 07.11.2026) ──────────────────────────────────────────────────────────
   Ablaufliste und Grant liegen im Klartext beim Pod-Anbieter. Der Ablauf war der 24. Geburtstag: der Anbieter las daraus das
   genaue Geburtsdatum des Kindes. Jetzt ist er der Jahreswechsel nach dem Jahr, in dem das Kind 24 wird (bis zum Befund
   KIND-POD-OHNE-ABLAUF der 31.12. 00:00 desselben Jahres).
   Klasse: kein Ablauf, der in Ablaufliste oder Grant geht, folgt aus einem Datum des Depots, außer auf das Jahresende gerundet.
   Gehalten an beiden Toren: podAblegen im Kern nimmt für die Kind-Datei nur ein Jahresende an (ein früher gespeicherter Ablauf
   wird vorher gerundet), die Brücke nimmt einen vorgegebenen Ablauf nur als Jahresende an (Nachricht und ablegen).
   ROT-BEWEIS je Tor an einer Kopie ohne die Prüfung, und für den Befund mit der alten Formel. */
const GEBURTSTAG = '2010-03-17';
const JAHRESENDE_24 = Date.UTC(2035, 0, 1);   // mit Ablauf des 31.12.2034
function podKlartext(s) {
  return s.anfragen.map((x) => (typeof x.koerper === 'string' ? x.koerper : '')).join('\n') + '\n' + JSON.stringify(s.lager.v || null);
}
function verraetGeburtstag(text) {
  return ['2034-03-17', '17.03', '03-17', String(Date.UTC(2034, 2, 17))].filter((m) => text.includes(m));
}
async function kernKopie(ersetzen) {
  const os = require('node:os');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const neu = ersetzen(kern);
  assert.notEqual(neu, kern, 'Vorbedingung: die Stelle steht im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kind-ablauf-'));
  const kopie = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(kopie, neu);
  const k = ladeKern({ Blob, htmlPfad: kopie, backen: true });
  fs.rmSync(ordner, { recursive: true, force: true });
  return k.V;
}
// Ob podAblegen den Auftrag am Tor abweist (die Nachricht 'pod-kind') oder auf die Brücke wartet ('offen').
async function torAntwort(V, ablauf) {
  const b = bruecke();
  const p = V.podAblegen('stelle', DEPOT, Object.assign({}, b.o, { kind: { webid: KIND, ablauf, etag: null, adresse: null } }));
  return Promise.race([p.then(() => 'ok', (e) => e.message), new Promise((r) => setImmediate(() => r('offen')))]);
}

test('[Kind-Pod·Befund·Geburtsdatum] Geburtstag 17.03.2010: im Klartext beim Pod steht 2035-01-01, weder 2034-03-17 noch 17.03', async () => {
  const { V, e } = await elternMitVerknuepftemKind({ birthDate: GEBURTSTAG });
  const ziel = await V.KIND_DATEI_ORTE.pod.einrichten(e.depotUUID, { webid: KIND });
  assert.equal(ziel.ablauf, JAHRESENDE_24, 'der Kern rechnet das Jahresende');
  e.kindDatei = { ort: 'pod', ziel, eingerichtet_am: '2026-11-07T00:00:00Z', geschrieben_am: null, stand: null };
  const { a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  assert.equal(a.ablauf, JAHRESENDE_24, 'an die Brücke geht das Jahresende');
  const s = await seite({ dienst: true });
  s.senden(erstAuftrag({ ablauf: a.ablauf }));
  await s.ja();
  assert.equal(s.ablagePuts().length, 1, 'Vorbedingung: abgelegt');
  const a1 = s.anfragen.find((x) => x.methode === 'PUT' && x.adresse.endsWith('vivodepot/k/a1.json'));
  assert.equal(JSON.parse(a1.koerper).ablagen[0].bis, JAHRESENDE_24, 'Ablaufliste: das Jahresende');
  const grant = JSON.parse(s.anfragen.find((x) => x.methode === 'POST' && x.adresse === DIENST).koerper);
  assert.match(grant.access[0].constraint.find((c) => c.leftOperand === 'dateTime').rightOperand, /^2035-01-01T/, 'Grant: das Jahresende');
  assert.deepEqual(verraetGeburtstag(podKlartext(s)), [], 'kein Tag und Monat der Geburt beim Pod');
  // ROT-BEWEIS: mit dem Ablauf der alten Formel (der 24. Geburtstag) stünde der Geburtstag beim Pod.
  const altAblauf = Date.UTC(2034, 2, 17);
  const s2 = await seite({ dienst: true, quelle: QUELLE.replace(/\n\s*if \(!jahreswechsel\(d\.ablauf\)\) return;/, '').replace(/\n\s*if \(zb != null && !jahreswechsel\(zb\)\)[^\n]*/, '') });
  s2.senden(erstAuftrag({ ablauf: altAblauf }));
  await s2.ja();
  assert.ok(verraetGeburtstag(podKlartext(s2)).length >= 1, 'Rot-Beweis: der alte Ablauf verriete den Geburtstag');
});

test('[Kind-Pod·Wächter·Kern] podAblegen nimmt für die Kind-Datei nur einen Jahreswechsel; ein gespeicherter Ablauf geht gehoben hinaus', async () => {
  const { V, e, ziel } = await eingerichtet();
  assert.equal(V._kindPodIstJahreswechsel(ziel.ablauf), true);
  // Ein Ablauf, der vor dem Fix gespeichert wurde, geht nur gehoben hinaus.
  ziel.ablauf = Date.UTC(2039, 2, 4);
  const { a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"')));
  assert.equal(a.ablauf, Date.UTC(2040, 0, 1));
  assert.equal(ziel.ablauf, Date.UTC(2040, 0, 1), 'und bleibt gehoben stehen');
  for (const ab of [Date.UTC(2039, 2, 4), Date.UTC(2040, 0, 1) + 1, Date.UTC(2039, 11, 31), NaN, null]) {
    assert.equal(await torAntwort(V, ab), 'pod-kind', 'abgewiesen: ' + ab);
  }
  assert.equal(await torAntwort(V, Date.UTC(2040, 0, 1)), 'offen', 'ein Jahreswechsel geht an die Brücke');
  // ROT-BEWEIS: ohne die Prüfung am Tor ginge der Geburtstag an die Brücke.
  const ohne = await kernKopie((k) => k.replace('_kindPodIstJahreswechsel(kind.ablauf)\n', '(kind.ablauf === null || Number.isFinite(kind.ablauf))\n'));
  assert.equal(await torAntwort(ohne, Date.UTC(2039, 2, 4)), 'offen', 'Rot-Beweis: ohne Tor kein Abweisen');
});

test('[Kind-Pod·Wächter·Brücke] die Brücke nimmt einen vorgegebenen Ablauf nur als Jahreswechsel; Rot-Beweis ohne die Prüfung', async () => {
  const s = await seite({ dienst: true });
  s.senden(erstAuftrag({ ablauf: Date.UTC(2039, 2, 4) }));
  assert.equal(s.el('auftrag-satz').textContent, '', 'die Nachricht wird verworfen');
  await assert.rejects(s.B.ablegen(DEPOT, 'stelle', KIND, null, { bis: Date.UTC(2039, 2, 4) }), /ablauf-jahresende/);
  await assert.rejects(s.B.ablegen(DEPOT, 'stelle', KIND, null, { bis: Date.UTC(2040, 0, 1) + 3600000 }), /ablauf-jahresende/);
  // Ein Ablauf aus der Zahl der Tage, die die Person in der Brücke eingibt, bleibt erlaubt: er folgt aus keinem Datum des Depots.
  const tage = QUELLE.match(/var bis = z\.bis != null \? z\.bis : \(tage \? Date\.now\(\) \+ tage \* 86400000 : null\);/);
  assert.ok(tage, 'Vorbedingung: der Ablauf aus Tagen');
  // ROT-BEWEIS: ohne die Prüfung nähme die Brücke den Geburtstag an.
  const ohne = await seite({ dienst: true, quelle: QUELLE.replace(/\n\s*if \(!jahreswechsel\(d\.ablauf\)\) return;/, '') });
  ohne.senden(erstAuftrag({ ablauf: Date.UTC(2039, 2, 4) }));
  assert.notEqual(ohne.el('auftrag-satz').textContent, '', 'Rot-Beweis: ohne Prüfung angenommen');
});

/* ── Befund KIND-POD-OHNE-ABLAUF (HOCH, 07.11.2026) ─────────────────────────────────────────────────────────────────────
   Der Bedienweg (flowKindDateiEinrichten → kindDateiEinrichten(depotUUID, 'pod', { webid })) gab kein Geburtsjahr mit: der
   Ablauf war null, die Kind-Datei lief im Pod nie ab. Die Frist stand in Code und Probe, nicht im Produkt.
   Jetzt holt der Pod-Ort das Geburtsjahr selbst aus der verknüpften Person (vertreteneRegisterId → data.menschen). Der Ablauf
   ist der Jahreswechsel nach dem Jahr, in dem das Kind 24 wird (01.01. 00:00 UTC, also mit Ablauf des 31.12., § 199 Abs. 1
   BGB). Fehlt das Geburtsjahr, sperrt der Dialog den Pod-Schritt mit einem Hinweis; ohne Ablauf legt nichts ab.
   Klasse: keine Kind-Datei geht ohne Ablauf in den Pod. Gehalten an drei Stellen: der Pod-Ort richtet ohne Geburtsjahr nichts
   ein und schreibt ohne Ablauf nicht, podAblegen nimmt für die Kind-Datei nur einen Jahreswechsel an (nie null), die Brücke
   nimmt die erste Kind-Ablage nur mit einem Jahreswechsel an. ROT-BEWEIS je Tor an einer Kopie ohne die Prüfung. */
const JAHRESWECHSEL_24 = Date.UTC(2035, 0, 1);   // Kind geboren 2010: 24 im Jahr 2034, Ablauf mit dem 31.12.2034

async function elternMitVerknuepftemKind(person) {
  const k = ladeKern({ Blob });
  const { V } = k;
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Mutter');
  if (person) V.ankerDaten().menschen.push(Object.assign({ id: 'kind-lea', name: 'Lea' }, person));
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet',
    vertreteneRegisterId: person ? 'kind-lea' : null }, SUB_PW);
  return { k, V, e };
}
// Der Dialog, wie die Person ihn bedient: WebID eintragen, „Im Pod ablegen“ klicken. Die Brücke ist das Fenster aus bruecke().
async function bedienwegPod(k, V, e) {
  let opt = null;
  V.ui.modal = (o) => { opt = o; return () => {}; };
  const meldungen = [];
  V.ui.toast = (t, art) => meldungen.push([art, t]);
  V.flowKindDateiEinrichten(e.depotUUID);
  const b = bruecke();
  k.window.open = b.o.oeffnen;
  k.window.addEventListener = b.o.ziel.addEventListener;
  k.window.removeEventListener = b.o.ziel.removeEventListener;
  const feld = k.document.getElementById('kind-datei-webid');
  if (feld) feld.value = KIND;
  let lauf = null;
  if (opt.zweitAktion) {
    lauf = opt.zweitAktion.handler(() => {});
    await b.naechster();
    b.senden({ typ: 'vd-pod-bereit', fassung: 1 });
    await b.naechster();
    if (b.auftraege[0]) b.senden(abgelegt(b.auftraege[0], '"E1"'));
    await lauf;
  }
  return { opt, auftraege: b.auftraege, meldungen };
}

test('[Kind-Pod·Bedienweg setzt Ablauf] WebID eintragen und klicken: der Ablauf ist der Jahreswechsel nach dem 24. Lebensjahr', async () => {
  const { k, V, e } = await elternMitVerknuepftemKind({ birthDate: '2010-03-17' });
  const { opt, auftraege } = await bedienwegPod(k, V, e);
  assert.ok(opt.zweitAktion, 'der Pod-Schritt steht im Dialog');
  assert.equal(auftraege.length, 1, 'ein Auftrag an die Brücke');
  assert.equal(auftraege[0].ablauf, JAHRESWECHSEL_24, 'der Auftrag trägt den Ablauf');
  assert.equal(e.kindDatei && e.kindDatei.ziel && e.kindDatei.ziel.ablauf, JAHRESWECHSEL_24, 'und das Ziel hält ihn');
  // Nur das Geburtsjahr: dasselbe Jahr ohne Tag ergibt denselben Ablauf.
  const nurJahr = await elternMitVerknuepftemKind({ yearOfBirthIfTheExactDayIs: '2010' });
  const r2 = await bedienwegPod(nurJahr.k, nurJahr.V, nurJahr.e);
  assert.equal(r2.auftraege[0] && r2.auftraege[0].ablauf, JAHRESWECHSEL_24, 'das Geburtsjahr allein reicht');
});

test('[Kind-Pod·Bedienweg ohne Geburtsjahr] der Pod-Schritt ist gesperrt, mit Hinweis; nichts geht ohne Ablauf an die Brücke', async () => {
  for (const person of [null, { birthDate: '' }]) {
    const { k, V, e } = await elternMitVerknuepftemKind(person);
    const { opt, auftraege } = await bedienwegPod(k, V, e);
    assert.equal(opt.zweitAktion, undefined, 'kein Pod-Schritt');
    assert.doesNotMatch(opt.koerperHTML, /id="kind-datei-webid"/, 'kein WebID-Feld');
    assert.ok(opt.koerperHTML.includes(V.escapeHTML(V.STRINGS.kindDateiPodOhneGeburtsjahr.replaceAll('{name}', 'Lea'))), 'der Hinweis steht da');
    assert.equal(auftraege.length, 0);
    await assert.rejects(() => V.kindDateiEinrichten(e.depotUUID, 'pod', { webid: KIND }), (x) => x.message === V.STRINGS.kindDateiPodOhneGeburtsjahr.replaceAll('{name}', 'Lea'));
    assert.equal(e.kindDatei, undefined, 'nichts eingerichtet');
  }
  // Ein Ziel, das vor dem Fix ohne Ablauf eingerichtet wurde: ohne Geburtsjahr schreibt der Ort nicht …
  const alt = await elternMitVerknuepftemKind(null);
  const zielAlt = { webid: KIND, ablauf: null, etag: null, adresse: null };
  const b = bruecke();
  assert.equal(await V_schreiben(alt.V, alt.e, zielAlt, b), 'ohne-ablauf');
  assert.equal(b.auftraege.length, 0, 'kein Auftrag ohne Ablauf');
  // … mit Geburtsjahr holt er den Ablauf nach.
  const nach = await elternMitVerknuepftemKind({ birthDate: '2010-03-17' });
  const zielNach = { webid: KIND, ablauf: null, etag: null, adresse: null };
  const b2 = bruecke();
  const p = V_schreiben(nach.V, nach.e, zielNach, b2);
  b2.senden({ typ: 'vd-pod-bereit', fassung: 1 });
  await b2.naechster();
  b2.senden(abgelegt(b2.auftraege[0], '"E1"'));
  assert.equal(await p, 'geschrieben');
  assert.equal(b2.auftraege[0].ablauf, JAHRESWECHSEL_24);
  assert.equal(zielNach.ablauf, JAHRESWECHSEL_24);
});
function V_schreiben(V, e, ziel, b) {
  return V.KIND_DATEI_ORTE.pod.schreiben(e.depotUUID, V.depotDateiAusUmschlag(e.umschlag), ziel, null, b.o);
}

test('[Kind-Pod·Wächter·ohne Ablauf] podAblegen und Brücke nehmen die Kind-Ablage nie ohne Ablauf; Rot-Beweis ohne die Prüfung', async () => {
  const { V } = await elternMitKind();
  assert.equal(await torAntwort(V, null), 'pod-kind', 'der Kern weist null ab');
  const s = await seite({ dienst: true });
  s.senden(erstAuftrag({ ablauf: null }));
  assert.equal(s.el('auftrag-satz').textContent, '', 'die Brücke verwirft die Nachricht ohne Ablauf');
  // ROT-BEWEIS Kern: mit dem alten Tor ginge null an die Brücke.
  const ohne = await kernKopie((q) => q.replace('_kindPodIstJahreswechsel(kind.ablauf)\n', '(kind.ablauf === null || _kindPodIstJahreswechsel(kind.ablauf))\n'));
  assert.equal(await torAntwort(ohne, null), 'offen', 'Rot-Beweis: ohne Tor geht null durch');
  // ROT-BEWEIS Brücke: mit der alten Prüfung nähme sie null an.
  const alt = await seite({ dienst: true, quelle: QUELLE
    .replace("if (typeof d.ablauf !== 'number' || !isFinite(d.ablauf) || d.ablauf <= Date.now()) return;",
      "if (d.ablauf !== null && (typeof d.ablauf !== 'number' || !isFinite(d.ablauf) || d.ablauf <= Date.now())) return;")
    .replace('if (!jahreswechsel(d.ablauf)) return;', 'if (d.ablauf !== null && !jahreswechsel(d.ablauf)) return;') });
  alt.senden(erstAuftrag({ ablauf: null }));
  assert.notEqual(alt.el('auftrag-satz').textContent, '', 'Rot-Beweis: ohne Prüfung angenommen');
});

test('[Kind-Pod·Jahreswechsel] mit Ablauf des 31.12.: 01.01. 00:00 UTC des Folgejahres; der 31.12. 00:00 ist rot', async () => {
  const { V } = await elternMitKind();
  assert.equal(V._kindPodAblauf(2010), JAHRESWECHSEL_24);
  assert.equal(V._kindPodAblauf('2010'), JAHRESWECHSEL_24);
  assert.equal(V._kindPodAblauf(null), null);
  assert.ok(JAHRESWECHSEL_24 > Date.UTC(2034, 11, 31, 23, 59, 59), 'die Ablage steht den ganzen 31.12. noch');
  // Ein früher gespeicherter Ablauf (31.12. 00:00 aus 5f8bfb253, oder ein Geburtstag) wird auf den nächsten Jahreswechsel gehoben.
  assert.equal(V._kindPodJahreswechsel(Date.UTC(2034, 11, 31)), JAHRESWECHSEL_24);
  assert.equal(V._kindPodJahreswechsel(Date.UTC(2034, 2, 17)), JAHRESWECHSEL_24);
  assert.equal(V._kindPodJahreswechsel(JAHRESWECHSEL_24), JAHRESWECHSEL_24);
  // ROT-BEWEIS: ein Ablauf am 31.12. 00:00 nähme dem Kind den letzten Tag; Kern und Brücke weisen ihn ab.
  assert.equal(await torAntwort(V, Date.UTC(2034, 11, 31)), 'pod-kind');
  assert.equal(await torAntwort(V, JAHRESWECHSEL_24), 'offen');
  const s = await seite({ dienst: true });
  await assert.rejects(s.B.ablegen(DEPOT, 'stelle', KIND, null, { bis: Date.UTC(2039, 11, 31) }), /ablauf-jahresende/);
  s.senden(erstAuftrag({ ablauf: Date.UTC(2039, 11, 31) }));
  assert.equal(s.el('auftrag-satz').textContent, '', 'die Brücke verwirft den 31.12. 00:00');
});

/* ── KIND-POD-OHNE-ABLAUF, Rest: Nachtrag des Ablaufs und nachträgliches Verknüpfen (07.11.2026) ─────────────────────────
   Eine Kind-Datei, die vor dem Fix ohne Ablauf in den Pod ging, liegt dort ohne Ablaufliste und mit einem Grant ohne Ende.
   Das Ersetzen allein ändert daran nichts. Jetzt erkennt der Kern solche Einträge (Ziel mit Adresse, ohne Ablauf) und bietet
   „Ablauf nachtragen“ an: der nächste Auftrag ist ein Ersetzen mit Ablauf, und die Brücke trägt Ablauf, Ablaufliste und einen
   neuen Grant mit Ablauf ein und nimmt den alten Grant zurück. Ein Sub-Depot ohne verknüpfte Person bekommt im Pod-Schritt
   eine Auswahl „Person verknüpfen“ aus Meine Menschen. Der Befund ist erst mit diesen Proben ganz geschlossen. */
const ALT_ADRESSE = ADRESSE;
const PRUEFUNG_A = "if (nachtrag && e.bis != null && (jahreswechsel(e.bis) || nachtragBis !== jahreswechselNach(e.bis))) throw new Error('nachtrag-hat-ablauf');";
const zielOhneAblauf = () => ({ webid: KIND, ablauf: null, etag: '"E0"', adresse: ALT_ADRESSE });

test('[Kind-Pod·Nachtrag·Kern] ein Ziel im Pod ohne Ablauf: der Kern trägt ihn mit dem nächsten Auftrag nach und zeigt den Knopf', async () => {
  const { V, e } = await elternMitKind();   // verknüpft, geboren 2015
  const ziel = zielOhneAblauf();
  e.kindDatei = { ort: 'pod', ziel, eingerichtet_am: '2026-11-06T00:00:00Z', geschrieben_am: '2026-11-06T00:00:00Z', stand: 'alt' };
  // Die Karte bietet den Nachtrag an, nicht das stille Aktualisieren.
  assert.ok(V._kindDateiKarteHTML(e).includes(V.escapeHTML(V.STRINGS.btnKindDateiAblaufNachtragen)), 'Knopf „Ablauf nachtragen“');
  const { r, a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"', ALT_ADRESSE)));
  assert.deepEqual(Object.keys(a).sort(), ERSETZEN_FELDER.concat(['ablauf']).sort(), 'Ersetzen mit Ablauf');
  assert.equal(a.ablauf, ABLAUF);
  assert.equal(r, 'geschrieben');
  assert.equal(ziel.ablauf, ABLAUF, 'erst nach dem Auftrag hält das Ziel den Ablauf');
  assert.ok(!V._kindDateiKarteHTML(e).includes(V.escapeHTML(V.STRINGS.btnKindDateiAblaufNachtragen)), 'danach kein Nachtrag mehr');
  // Das nächste Ersetzen trägt keinen Ablauf mehr.
  const { a: a2 } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E2"', ALT_ADRESSE)));
  assert.deepEqual(Object.keys(a2).sort(), [...ERSETZEN_FELDER].sort());
});

test('[Kind-Pod·Nachtrag·Kern] scheitert der Nachtrag, bleibt das Ziel ohne Ablauf; ohne Geburtsjahr geht kein Auftrag', async () => {
  const { V, e } = await elternMitKind();
  const ziel = zielOhneAblauf();
  e.kindDatei = { ort: 'pod', ziel, eingerichtet_am: '2026-11-06T00:00:00Z', geschrieben_am: null, stand: null };
  const { r } = await schreibenMit(V, e, (b, x) => b.senden({ typ: 'vd-pod-konflikt', fassung: 1, id: x.id }));
  assert.equal(r, 'konflikt');
  assert.equal(ziel.ablauf, null, 'kein Ablauf ohne gelungenen Nachtrag');
  const ohne = await elternMitVerknuepftemKind(null);
  const b = bruecke();
  assert.equal(await V_schreiben(ohne.V, ohne.e, zielOhneAblauf(), b), 'ohne-ablauf');
  assert.equal(b.auftraege.length, 0);
});

test('[Kind-Pod·Nachtrag·Brücke] Ablauf, Ablaufliste und neuer Grant mit Ablauf; der alte Grant ohne Ablauf fällt', async () => {
  const ALT_GRANT = DIENST + 'alt';
  const s = await seite({ dienst: true, vorher: [eintrag({ bis: null, grant: ALT_GRANT, ueberDienst: true })] });
  s.senden(ersetzAuftrag({ ablauf: ABLAUF }));
  assert.match(s.el('auftrag-satz').textContent, /Ablauf/, 'der Satz nennt den Nachtrag');
  await s.ja();
  const put = s.anfragen.find((x) => x.methode === 'PUT' && x.adresse === EIGENE);
  assert.ok(put && put.kopf['If-Match'] === '"ALT"', 'ersetzt mit If-Match');
  const grant = JSON.parse(s.anfragen.find((x) => x.methode === 'POST' && x.adresse === DIENST).koerper);
  assert.equal(Date.parse(grant.access[0].constraint.find((c) => c.leftOperand === 'dateTime').rightOperand), ABLAUF, 'neuer Grant mit Ablauf');
  assert.ok(s.anfragen.some((x) => x.methode === 'DELETE' && x.adresse === ALT_GRANT), 'der alte Grant wird zurückgenommen');
  assert.deepEqual(s.lager.v.map((x) => [x.adresse, x.bis, x.grant]), [[EIGENE, ABLAUF, DIENST + 'g1']], 'Verzeichnis mit Ablauf und neuem Grant');
  const a1 = s.anfragen.filter((x) => x.methode === 'PUT' && x.adresse.endsWith('vivodepot/k/a1.json')).pop();
  assert.deepEqual(JSON.parse(a1.koerper).ablagen, [{ adresse: EIGENE, bis: ABLAUF }], 'Ablaufliste');
  assert.equal(s.antworten()[0].typ, 'vd-pod-abgelegt');
});

test('[Kind-Pod·Nachtrag·Brücke·Rot-Beweise] nur ein Jahreswechsel, nur an einem Eintrag ohne anderen Ablauf; ohne Nachtrag bleibt alles ohne Ablauf', async () => {
  const s = await seite({ vorher: [eintrag({ bis: null })] });
  for (const [d, was] of [[ersetzAuftrag({ ablauf: Date.UTC(2039, 11, 31) }), '31.12. 00:00'], [ersetzAuftrag({ ablauf: 'bald' }), 'keine Zahl'],
    [ersetzAuftrag({ ablauf: ABLAUF, extra: 1 }), 'Zusatzfeld']]) {
    s.senden(d); assert.equal(s.el('auftrag-satz').textContent, '', was + ' wird verworfen');
  }
  await assert.rejects(s.B.ersetzen(EIGENE, DEPOT, '"ALT"', Date.UTC(2039, 11, 31)), /ablauf-jahresende/);
  const anders = await seite({ vorher: [eintrag({ bis: Date.UTC(2041, 0, 1) })] });
  await assert.rejects(anders.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF), /nachtrag-hat-ablauf/);
  const gleich = await seite({ vorher: [eintrag({ bis: ABLAUF })] });
  await assert.rejects(gleich.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF), /nachtrag-hat-ablauf/, '(a) auch derselbe Ablauf: der Eintrag hat schon einen');
  // ROT-BEWEIS (a): ohne die Prüfung am Eintrag nähme die Brücke den Nachtrag an.
  const ohneA = await seite({ quelle: QUELLE.replace(PRUEFUNG_A, ''), vorher: [eintrag({ bis: ABLAUF })] });
  assert.ok(await ohneA.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF), 'Rot-Beweis (a): ohne Prüfung angenommen');
  // ROT-BEWEIS: das Ersetzen ohne Nachtrag lässt Eintrag und Ablaufliste ohne Ablauf.
  const ohne = await seite({ dienst: true, vorher: [eintrag({ bis: null })] });
  ohne.senden(ersetzAuftrag());
  await ohne.ja();
  assert.equal(ohne.lager.v[0].bis, null);
  assert.ok(!ohne.anfragen.some((x) => x.methode === 'POST'), 'kein Grant ohne Nachtrag');
});

test('[Kind-Pod·Nachtrag·Brücke·Reihenfolge] (b) der alte Grant fällt erst nach Ablaufliste und neuem Grant; scheitert der neue, bleibt er', async () => {
  const ALT_GRANT = DIENST + 'alt';
  const vorher = [eintrag({ bis: null, grant: ALT_GRANT, ueberDienst: true })];
  const s = await seite({ dienst: true, vorher });
  await s.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF);
  const i = (pruef) => s.anfragen.findIndex(pruef);
  const iGrant = i((x) => x.methode === 'POST' && x.adresse === DIENST);
  const iListe = i((x) => x.methode === 'PUT' && x.adresse.endsWith('vivodepot/k/a1.json'));
  const iAlt = i((x) => x.methode === 'DELETE' && x.adresse === ALT_GRANT);
  assert.ok(iGrant >= 0 && iListe > iGrant && iAlt > iListe, 'neuer Grant, Ablaufliste, dann der alte Grant: ' + [iGrant, iListe, iAlt]);
  // Scheitert der neue Grant: der alte bleibt, der Eintrag bleibt ohne Ablauf, der Fehler geht weiter.
  const f = await seite({ dienst: true, vorher, grantScheitert: true });
  await assert.rejects(f.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF), /grant-dienst-500/);
  assert.ok(!f.anfragen.some((x) => x.methode === 'DELETE' && x.adresse === ALT_GRANT), 'der alte Grant bleibt');
  assert.equal(f.lager.v[0].bis, null);
  assert.equal(f.lager.v[0].grant, ALT_GRANT);
  // Über die Nachricht: die Anwendung erfährt keinen Erfolg.
  const n = await seite({ dienst: true, vorher, grantScheitert: true });
  n.senden(ersetzAuftrag({ ablauf: ABLAUF }));
  await n.ja();
  assert.deepEqual(n.antworten(), [], 'keine Erfolgsmeldung an die Anwendung');
  assert.match(n.el('fehler').textContent, /grant-dienst-500/);
  // ROT-BEWEIS (b): fiele der alte Grant zuerst, wäre er nach dem Scheitern weg.
  const zuerst = await seite({ dienst: true, vorher, grantScheitert: true,
    quelle: QUELLE.replace('var schritte = [grantNeu, eintragNeu, grantAltWeg];', 'var schritte = [grantAltWeg, grantNeu, eintragNeu];') });
  await assert.rejects(zuerst.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF));
  assert.ok(zuerst.anfragen.some((x) => x.methode === 'DELETE' && x.adresse === ALT_GRANT), 'Rot-Beweis (b): der alte Grant wäre weg');
});

test('[Kind-Pod·Nachtrag·Brücke·Konflikt] (c) If-Match zuerst: bei 412 wird nichts angelegt und nichts gelöscht', async () => {
  const ALT_GRANT = DIENST + 'alt';
  const vorher = [eintrag({ bis: null, grant: ALT_GRANT, ueberDienst: true })];
  const s = await seite({ dienst: true, vorher, status: 412 });
  await assert.rejects(s.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF), /konflikt/);
  assert.ok(!s.anfragen.some((x) => x.methode === 'POST' || x.methode === 'DELETE'), 'kein Grant, keine Rücknahme');
  assert.ok(!s.anfragen.some((x) => x.methode === 'PUT' && x.adresse.endsWith('vivodepot/k/a1.json')), 'keine Ablaufliste');
  assert.equal(s.lager.v[0].bis, null);
  const put = s.anfragen.find((x) => x.methode === 'PUT' && x.adresse === EIGENE);
  assert.equal(put.kopf['If-Match'], '"ALT"');
  // ROT-BEWEIS (c): kämen Ablauf und Grant vor dem neuen Stand, stünde bei einem Konflikt schon ein Grant da.
  const vorPut = await seite({ dienst: true, vorher, status: 412,
    quelle: QUELLE.replace('var schritte = [setzen, nachtragen];', 'var schritte = [nachtragen, setzen];') });
  await assert.rejects(vorPut.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF), /konflikt/);
  assert.ok(vorPut.anfragen.some((x) => x.methode === 'POST'), 'Rot-Beweis (c): ein Grant trotz Konflikt');
});

test('[Kind-Pod·Nachtrag·Kern·Fehler] scheitert der Nachtrag ohne Antwort, meldet der Kern ihn und hält keinen Ablauf', async () => {
  const { V, e } = await elternMitKind();
  const ziel = zielOhneAblauf();
  e.kindDatei = { ort: 'pod', ziel, eingerichtet_am: '2026-11-06T00:00:00Z', geschrieben_am: null, stand: null };
  const b = bruecke();
  let frist = null;
  b.o.uhr = (f) => { frist = f; return 1; };
  const p = V_schreiben(V, e, ziel, b);
  b.senden({ typ: 'vd-pod-bereit', fassung: 1 });
  await b.naechster();
  assert.equal(b.auftraege[0].ablauf, ABLAUF, 'Vorbedingung: der Nachtrag ging hinaus');
  frist();
  assert.equal(await p, 'nachtrag-fehler', 'gemeldet, nicht still abgebrochen');
  assert.equal(ziel.ablauf, null);
  const meldungen = [];
  V.ui.toast = (t, art) => meldungen.push([art, t]);
  assert.ok(V.STRINGS.kindDateiPodNachtragFehler.includes('{name}'));
});

test('[Kind-Pod·Person verknüpfen] ohne verknüpfte Person: Auswahl aus Meine Menschen; nach der Wahl steht der Pod-Schritt offen', async () => {
  const { k, V, e } = await elternMitVerknuepftemKind(null);
  V.ankerDaten().menschen.push({ id: 'p-lea', name: 'Lea Beispiel', birthDate: '2010-03-17' }, { id: 'p-oma', name: 'Oma' });
  let opt = null;
  V.ui.modal = (o) => { opt = o; return () => {}; };
  V.ui.toast = () => {};
  V.flowKindDateiEinrichten(e.depotUUID);
  assert.equal(opt.zweitAktion, undefined, 'gesperrt, solange niemand verknüpft ist');
  assert.match(opt.koerperHTML, /<select id="kind-pod-person"/, 'die Auswahl steht im Pod-Schritt');
  assert.match(opt.koerperHTML, /value="p-lea"[^>]*>Lea Beispiel</, 'Personen aus Meine Menschen');
  assert.doesNotMatch(opt.koerperHTML, new RegExp(V.STRINGS.kindDateiPodOhneGeburtsjahr.split('{name}')[0].slice(0, 20) + '[^<]*Meine Menschen'), 'kein Verweis auf „Meine Menschen“');
  const wahl = k.document.getElementById('kind-pod-person');
  wahl.value = 'p-lea';
  await wahl.onchange();
  assert.equal(e.vertreteneRegisterId, 'p-lea', 'verknüpft');
  assert.ok(opt.zweitAktion, 'der Dialog steht neu, jetzt mit dem Pod-Schritt');
  assert.match(opt.koerperHTML, /id="kind-datei-webid"/);
  // ROT-BEWEIS: ohne die Bindung der Auswahl verknüpft die Wahl nichts.
  const os = require('node:os');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const kopie = quelle.replace('if (wahl) wahl.onchange = () => _kindPodPersonVerknuepfen', 'if (false) wahl.onchange = () => _kindPodPersonVerknuepfen');
  assert.notEqual(kopie, quelle, 'Vorbedingung: die Bindung steht im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kind-verknuepfen-'));
  fs.writeFileSync(path.join(ordner, 'vivodepot.html'), kopie);
  const k2 = ladeKern({ Blob, htmlPfad: path.join(ordner, 'vivodepot.html'), backen: true });
  fs.rmSync(ordner, { recursive: true, force: true });
  await k2.V.depotAnlegen(ANKER_PW);
  k2.V.akteurSelbstErklaeren('Mutter');
  k2.V.ankerDaten().menschen.push({ id: 'p-lea', name: 'Lea Beispiel', birthDate: '2010-03-17' });
  const e2 = await k2.V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  k2.V.ui.modal = () => () => {};
  k2.V.flowKindDateiEinrichten(e2.depotUUID);
  const wahl2 = k2.document.getElementById('kind-pod-person');
  wahl2.value = 'p-lea';
  if (typeof wahl2.onchange === 'function') await wahl2.onchange();
  assert.ok(!e2.vertreteneRegisterId, 'Rot-Beweis: ohne Bindung bleibt das Sub-Depot unverknüpft');
});

// ── Befund KIND-ABLAGE-ALT-BEHAELT-GEBURTSTAG (07.11.2026) ─────────────────────────────────────────────────────────────────
// Eine Kind-Datei, die vor dem Jahreswechsel-Fix abgelegt wurde, liegt mit Ablauf am 24. Geburtstag im Pod. Das nächste
// Sichern stellt ihn auf den 01.01. 00:00 UTC danach um: neuer Grant, Ablaufliste, dann fällt der alte Grant.
const ALT_GEBURTSTAG = Date.UTC(2039, 2, 4);   // 24. Geburtstag bei Geburt am 04.03.2015; Jahreswechsel danach: ABLAUF

test('[Kind-Pod·Geburtstag·Kern] ein Ziel mit Ablauf am Geburtstag: das nächste Sichern stellt ihn auf den Jahreswechsel um', async () => {
  const { V, e } = await elternMitKind();
  const ziel = { webid: KIND, ablauf: ALT_GEBURTSTAG, etag: '"E0"', adresse: ALT_ADRESSE };
  e.kindDatei = { ort: 'pod', ziel, eingerichtet_am: '2026-11-06T00:00:00Z', geschrieben_am: '2026-11-06T00:00:00Z', stand: 'alt' };
  const { r, a } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E1"', ALT_ADRESSE)));
  assert.deepEqual(Object.keys(a).sort(), ERSETZEN_FELDER.concat(['ablauf']).sort(), 'Ersetzen mit Ablauf');
  assert.equal(a.ablauf, ABLAUF, 'der Jahreswechsel nach dem Geburtstag');
  assert.equal(r, 'geschrieben');
  assert.equal(ziel.ablauf, ABLAUF);
  const { a: a2 } = await schreibenMit(V, e, (b, x) => b.senden(abgelegt(x, '"E2"', ALT_ADRESSE)));
  assert.deepEqual(Object.keys(a2).sort(), [...ERSETZEN_FELDER].sort(), 'danach ein Ersetzen ohne Ablauf');
});

test('[Kind-Pod·Geburtstag·Kern] scheitert die Umstellung, hält das Ziel den alten Ablauf und der Kern meldet', async () => {
  const { V, e } = await elternMitKind();
  const ziel = { webid: KIND, ablauf: ALT_GEBURTSTAG, etag: '"E0"', adresse: ALT_ADRESSE };
  e.kindDatei = { ort: 'pod', ziel, eingerichtet_am: '2026-11-06T00:00:00Z', geschrieben_am: null, stand: null };
  const b = bruecke();
  let frist = null;
  b.o.uhr = (f) => { frist = f; return 1; };
  const p = V_schreiben(V, e, ziel, b);
  b.senden({ typ: 'vd-pod-bereit', fassung: 1 });
  await b.naechster();
  assert.equal(b.auftraege[0].ablauf, ABLAUF);
  frist();
  assert.equal(await p, 'nachtrag-fehler');
  assert.equal(ziel.ablauf, ALT_GEBURTSTAG, 'der alte Ablauf bleibt, bis die Brücke die Umstellung bestätigt');
});

test('[Kind-Pod·Geburtstag·Brücke] Wirkung im Pod: Ablaufliste und neuer Grant mit Jahreswechsel, der alte Grant fällt danach', async () => {
  const ALT_GRANT = DIENST + 'alt';
  const s = await seite({ dienst: true, vorher: [eintrag({ bis: ALT_GEBURTSTAG, grant: ALT_GRANT, ueberDienst: true })] });
  s.senden(ersetzAuftrag({ ablauf: ABLAUF }));
  await s.ja();
  const i = (pruef) => s.anfragen.findIndex(pruef);
  const iGrant = i((x) => x.methode === 'POST' && x.adresse === DIENST);
  const iListe = i((x) => x.methode === 'PUT' && x.adresse.endsWith('vivodepot/k/a1.json'));
  const iAlt = i((x) => x.methode === 'DELETE' && x.adresse === ALT_GRANT);
  assert.ok(iGrant >= 0 && iListe > iGrant && iAlt > iListe, 'neuer Grant, Ablaufliste, dann der alte Grant: ' + [iGrant, iListe, iAlt]);
  const grant = JSON.parse(s.anfragen[iGrant].koerper);
  assert.equal(Date.parse(grant.access[0].constraint.find((c) => c.leftOperand === 'dateTime').rightOperand), ABLAUF, 'neuer Grant mit Jahreswechsel');
  assert.deepEqual(JSON.parse(s.anfragen[iListe].koerper).ablagen, [{ adresse: EIGENE, bis: ABLAUF }], 'Ablaufliste mit Jahreswechsel');
  assert.deepEqual(s.lager.v.map((x) => [x.adresse, x.bis, x.grant]), [[EIGENE, ABLAUF, DIENST + 'g1']], 'Verzeichnis umgestellt');
  assert.equal(s.antworten()[0].typ, 'vd-pod-abgelegt');
});

test('[Kind-Pod·Geburtstag·Brücke·Grenzen] nur der Jahreswechsel direkt nach dem alten Ablauf; ein Jahreswechsel bleibt, wie er ist', async () => {
  // Ein anderes Jahr als das nach dem alten Ablauf: abgewiesen, nichts angelegt.
  const weiter = await seite({ dienst: true, vorher: [eintrag({ bis: ALT_GEBURTSTAG, grant: DIENST + 'alt', ueberDienst: true })] });
  await assert.rejects(weiter.B.ersetzen(EIGENE, DEPOT, '"ALT"', Date.UTC(2041, 0, 1)), /nachtrag-hat-ablauf/);
  assert.ok(!weiter.anfragen.some((x) => x.methode === 'POST' || x.methode === 'DELETE'), 'kein Grant, keine Rücknahme');
  // Schon ein Jahreswechsel: kein Nachtrag.
  const schon = await seite({ vorher: [eintrag({ bis: ABLAUF })] });
  await assert.rejects(schon.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF), /nachtrag-hat-ablauf/);
  // Scheitert der neue Grant: der alte bleibt, der Eintrag behält den alten Ablauf.
  const f = await seite({ dienst: true, vorher: [eintrag({ bis: ALT_GEBURTSTAG, grant: DIENST + 'alt', ueberDienst: true })], grantScheitert: true });
  await assert.rejects(f.B.ersetzen(EIGENE, DEPOT, '"ALT"', ABLAUF), /grant-dienst-500/);
  assert.ok(!f.anfragen.some((x) => x.methode === 'DELETE' && x.adresse === DIENST + 'alt'), 'der alte Grant bleibt');
  assert.equal(f.lager.v[0].bis, ALT_GEBURTSTAG);
  // ROT-BEWEIS: ohne die Bindung an den Jahreswechsel direkt danach nähme die Brücke ein späteres Jahr an.
  assert.ok(QUELLE.includes(PRUEFUNG_A), 'Vorbedingung: die Prüfung steht in der Brücke');
  const ohne = await seite({ dienst: true, vorher: [eintrag({ bis: ALT_GEBURTSTAG, grant: DIENST + 'alt', ueberDienst: true })],
    quelle: QUELLE.replace(PRUEFUNG_A, "if (nachtrag && e.bis != null && jahreswechsel(e.bis)) throw new Error('nachtrag-hat-ablauf');") });
  assert.ok(await ohne.B.ersetzen(EIGENE, DEPOT, '"ALT"', Date.UTC(2041, 0, 1)), 'Rot-Beweis: ein späteres Jahr angenommen');
});

test('[Kind-Pod·Geburtstag·Kern·Rot-Beweis] ohne die Umstellung im Kern bliebe der Geburtstag: das Ersetzen trüge keinen Ablauf', async () => {
  const os = require('node:os');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const stelle = 'const nachtrag = ziel.adresse != null && (ziel.ablauf == null || !_kindPodIstJahreswechsel(ziel.ablauf));';
  assert.ok(quelle.includes(stelle), 'Vorbedingung: die Umstellung steht im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kind-geburtstag-'));
  fs.writeFileSync(path.join(ordner, 'vivodepot.html'), quelle.replace(stelle, 'const nachtrag = ziel.adresse != null && ziel.ablauf == null;'));
  const k2 = ladeKern({ Blob, htmlPfad: path.join(ordner, 'vivodepot.html'), backen: true });
  fs.rmSync(ordner, { recursive: true, force: true });
  await k2.V.depotAnlegen(ANKER_PW);
  k2.V.akteurSelbstErklaeren('Mutter');
  k2.V.ankerDaten().menschen.push({ id: 'kind-lea', name: 'Lea', birthDate: '2015-03-04' });
  const e2 = await k2.V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  e2.vertreteneRegisterId = 'kind-lea';
  const ziel = { webid: KIND, ablauf: ALT_GEBURTSTAG, etag: '"E0"', adresse: ALT_ADRESSE };
  e2.kindDatei = { ort: 'pod', ziel, eingerichtet_am: '2026-11-06T00:00:00Z', geschrieben_am: null, stand: null };
  const { a } = await schreibenMit(k2.V, e2, (b, x) => b.senden(abgelegt(x, '"E1"', ALT_ADRESSE)));
  assert.equal(a.ablauf, undefined, 'Rot-Beweis: ohne Umstellung kein Ablauf im Auftrag, der Pod behielte den Geburtstag');
});
