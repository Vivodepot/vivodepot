'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   KDL selbst laden (U2-ADR-468, Nachtrag 02.10.2026)
   ───────────────────────────────────────────────────────────────────────────
   Entscheidung vom 01.10.2026: „wir backen das nie ein, sondern man kann es unter GPL selber reinladen.“ Die KDL (DVMD e.V.) steht unter
   GPL-3.0-or-later. Der Kern kennt genau zwei Codes und die System-URL; die Person bringt die amtliche Datei selbst mit.
   Geprüft:
     1. kdlPruefen: die gültige Datei besteht; JEDER Abweisungsgrund hat seinen Rot-Beweis (falsche URL, fehlender Code,
        leerer Text, kein CodeSystem, abgeschnittenes JSON, ohne Fassung, zu tief, zu groß).
     2. kdlEinlesen: aus JSON und aus dem Paket (.tgz) beider Fassungen (2025, 2026: anderer Dateiname, gefunden über
        Verzeichnis und url) — gespeichert werden nur die zwei Begriffe mit Herkunft (sha256 der Datei; Vermerk, Quelle,
        Gewährleistungsausschluss und Lizenz nach § 4 GPL-3.0), nie die übrige Liste; Paket ohne die Datei und kaputtes gzip
        werden abgewiesen, ohne etwas zu speichern.
     3. Das Tor (Freigabe U2-ADR-468, Nachtrag 28.10.2026): ohne KDL `kdl-nicht-geladen`, mit KDL entsteht die Datei mit dem
        Text aus dem Depot. Rot-Beweis an einer Kern-Kopie ohne Freigabe: `kdl-freigabe-ausstehend`, kein Weg schreibt eine Datei.
     4. Die eingelesene KDL reist mit der eigenen Sicherung (Rundlauf) — und mit keiner Ausgabe an Dritte außer der ISiK-Datei,
        die nur Code und Anzeigetext der zwei Einträge trägt (Klasse über alle Registry-Formate, das IPS und den
        Erbschein-Auszug; Rot-Beweis: ein Format, das data.kdlEingelesen mitnimmt).
   GERÜST-TEST für zwei Proben: [KDL·Tor·Rot] und [KDL·Lizenz] lesen den rohen Kern als TEXT (die Freigabe-Konstante, die
   Region KDL-LIZENZ) — das Gerüst ist ihr Gegenstand; geladen wird jeder Kern über ladeKern (gebacken, die Kopie mit backen).
   Alle KDL-Texte hier sind ERFUNDEN (die amtlichen stehen nirgends im Repo; tests/kdl-nicht-im-kern.test.js prüft, dass kein
   erfundener Text einem amtlichen gleicht).
   ═══════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const MARKE_V = 'Erfundene Klasse Bevollmaechtigung Probe 7Q';
const MARKE_P = 'Erfundene Klasse Selbstauskunft Probe 7Q';
const FASSUNG_NEU = '2099';   // eine Fassung, die es nicht gibt: sie steht nie in KDL_FASSUNGEN

function codeSystem(V, aenderung) {
  const [cv, cp] = [V.KDL_GEBRAUCHT.kdlVollmacht, V.KDL_GEBRAUCHT.kdlPatienteneigen];
  const cs = {
    resourceType: 'CodeSystem', url: V.KDL_SYSTEM, version: V.KDL_FASSUNGEN[0], status: 'active',
    concept: [{ code: 'XX', display: 'Erfundene Oberklasse', concept: [
      { code: 'XX01', display: 'Erfundene Unterklasse', concept: [{ code: cv, display: MARKE_V }, { code: cp, display: MARKE_P }] },
      { code: 'XX02', display: 'Erfundene Nachbarklasse ohne Bedeutung' },
    ] }],
  };
  if (aenderung) aenderung(cs);
  return cs;
}
const bytesVon = (obj) => new Uint8Array(Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj), 'utf8'));

// Ein ustar-Archiv, gzip — wie ein FHIR-Paket aufgebaut (package/…): eine Datei (name, inhalt) oder mehrere ([[name, inhalt], …]).
function tgz(name, inhalt) {
  const liste = Array.isArray(name) ? name : [[name, inhalt]];
  return new Uint8Array(zlib.gzipSync(Buffer.concat([...liste.map(([n, t]) => tarEintrag(n, t)), Buffer.alloc(1024, 0)])));
}
function tarEintrag(name, inhalt) {
  const daten = Buffer.from(inhalt);
  const kopf = Buffer.alloc(512, 0);
  kopf.write(name, 0, 100, 'utf8');
  kopf.write('0000644\0', 100, 8, 'ascii');
  kopf.write('0000000\0', 108, 8, 'ascii');
  kopf.write('0000000\0', 116, 8, 'ascii');
  kopf.write(daten.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
  kopf.write('00000000000\0', 136, 12, 'ascii');
  kopf.write('        ', 148, 8, 'ascii');
  kopf.write('0', 156, 1, 'ascii');
  kopf.write('ustar\0', 257, 6, 'ascii');
  kopf.write('00', 263, 2, 'ascii');
  let summe = 0; for (const b of kopf) summe += b;
  kopf.write(summe.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  const fuell = Buffer.alloc((512 - (daten.length % 512)) % 512, 0);
  return Buffer.concat([kopf, daten, fuell]);
}

/* Erfundene Pakete im Aufbau der zwei amtlichen Fassungen (gemessen an dvmd.kdl.r4 2025.0.1 und 2026.0.0, nur Dateiliste und
   Verzeichnis — kein Inhalt der KDL): 2025 mit package/codesystem-kdl.xml.json und Beispielen in package/examples/, 2026 mit
   package/CodeSystem-kdl-2026-0-0.json neben ValueSets und ConceptMaps; beide mit package/.index.json und package/package.json. */
const VERMERK = '2026 Erfundener Herausgeber e.V.';
const VERMERK_2025 = '2025 Erfundener Herausgeber e.V.';
function indexEintrag(datei, r) { return { filename: datei, resourceType: r.resourceType, id: 'erfunden-' + datei, url: r.url, version: r.version }; }
function paket(V, fassung, aenderung) {
  const zw = fassung === 2026;
  const cs = codeSystem(V, (c) => { c.version = zw ? '2026.0.0' : '2025'; c.copyright = zw ? VERMERK : VERMERK_2025; });
  const csDatei = zw ? 'CodeSystem-kdl-2026-0-0.json' : 'codesystem-kdl.xml.json';
  const vs = { resourceType: 'ValueSet', url: 'http://dvmd.de/fhir/ValueSet/kdl', version: cs.version };
  const fremd = { resourceType: 'CodeSystem', url: 'http://example.org/fhir/CodeSystem/erfunden-fremd', version: '1', concept: cs.concept };
  const dateien = {
    'package/package.json': JSON.stringify({ name: 'erfunden.kdl.r4', version: zw ? '2026.0.0-erfunden' : '2025.0.1-erfunden' }),
    ['package/' + (zw ? 'ValueSet-kdl-2026-0-0.json' : 'valueset-kdl.xml.json')]: JSON.stringify(vs),
    'package/CodeSystem-fremd.json': JSON.stringify(fremd),   // ein CodeSystem mit anderer url, vor der KDL im Archiv
    ['package/' + csDatei]: JSON.stringify(cs),
  };
  if (!zw) dateien['package/examples/DocumentReference-example.json'] = JSON.stringify({ resourceType: 'DocumentReference' });
  const index = { 'index-version': zw ? 1786633813027 : 2, files: [indexEintrag(zw ? 'ValueSet-kdl-2026-0-0.json' : 'valueset-kdl.xml.json', vs),
    indexEintrag('CodeSystem-fremd.json', fremd), indexEintrag(csDatei, cs)] };
  dateien['package/.index.json'] = JSON.stringify(index);
  if (aenderung) aenderung(dateien, index);
  return tgz(Object.entries(dateien));
}

async function depot(opts) {
  const { V } = ladeKern(opts);
  await V.depotAnlegen('kdl-probe-2026!');
  return V;
}

test('[KDL·Prüfen] die gültige Datei besteht und liefert genau die zwei Begriffe', async () => {
  const { V } = ladeKern();
  const r = V.kdlPruefen(JSON.stringify(codeSystem(V)));
  assert.equal(r.ok, true);
  assert.equal(r.version, V.KDL_FASSUNGEN[0]);
  assert.deepEqual(Object.keys(r.begriffe).sort(), ['kdlPatienteneigen', 'kdlVollmacht']);
  assert.equal(r.begriffe.kdlVollmacht.display, MARKE_V);
});

test('[KDL·Prüfen·Rot] jeder Abweisungsgrund an seinem Fall', async () => {
  const { V } = ladeKern();
  const fall = (f) => V.kdlPruefen(JSON.stringify(codeSystem(V, f))).grund;
  assert.equal(fall((cs) => { cs.url = 'http://example.org/fhir/CodeSystem/andere'; }), 'kdl-falsche-url');
  assert.equal(fall((cs) => { cs.concept[0].concept[0].concept.pop(); }), 'kdl-code-fehlt');
  assert.equal(fall((cs) => { cs.concept[0].concept[0].concept[0].display = '  '; }), 'kdl-text-leer');
  assert.equal(fall((cs) => { cs.resourceType = 'ValueSet'; }), 'kdl-kein-codesystem');
  assert.equal(fall((cs) => { delete cs.version; }), 'kdl-ohne-version');
  assert.equal(fall((cs) => { cs.version = FASSUNG_NEU; }), 'kdl-fassung-unbekannt');
  assert.equal(fall((cs) => { delete cs.concept; }), 'kdl-ohne-begriffe');
  assert.equal(fall((cs) => { let k = cs.concept[0]; for (let i = 0; i < 14; i++) { const n = { code: 'T' + i, concept: [] }; k.concept = [n]; k = n; } }), 'kdl-zu-tief');
  const text = JSON.stringify(codeSystem(V));
  assert.equal(V.kdlPruefen(text.slice(0, text.length - 7)).grund, 'kdl-kein-json', 'abgeschnittenes JSON');
  assert.equal(V.kdlPruefen('x'.repeat(5 * 1024 * 1024)).grund, 'kdl-zu-gross');
});

test('[KDL·Einlesen] aus JSON: nur die zwei Begriffe und die Herkunft im Depot, nie die übrige Liste', async () => {
  const V = await depot();
  const bytes = bytesVon(codeSystem(V));
  const r = await V.kdlEinlesen('codesystem-kdl.xml.json', bytes);
  assert.deepEqual(r, { ok: true, version: V.KDL_FASSUNGEN[0] });
  const e = V.getData().kdlEingelesen;
  assert.deepEqual(Object.keys(e.begriffe).sort(), ['kdlPatienteneigen', 'kdlVollmacht']);
  assert.equal(e.herkunft.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(e.herkunft.lizenz, 'GPL-3.0-or-later');
  assert.equal(e.herkunft.version, V.KDL_FASSUNGEN[0]);
  const roh = JSON.stringify(e);
  for (const fremd of ['Erfundene Oberklasse', 'Erfundene Unterklasse', 'Nachbarklasse', 'XX02']) assert.ok(!roh.includes(fremd), 'nicht gespeichert: ' + fremd);
});

test('[KDL·Einlesen·Paket] aus dem Paket (.tgz) — und Paket ohne Datei bzw. kaputtes gzip werden abgewiesen, ohne zu speichern', async () => {
  const V = await depot();
  const r = await V.kdlEinlesen('dvmd.kdl.r4.tgz', tgz('package/codesystem-kdl.xml.json', JSON.stringify(codeSystem(V))));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(V.getData().kdlEingelesen.begriffe.kdlPatienteneigen.display, MARKE_P);

  const W = await depot();
  assert.deepEqual(await W.kdlEinlesen('x.tgz', tgz('package/package.json', '{}')), { ok: false, grund: 'kdl-paket-ohne-datei' });
  const kaputt = tgz('package/codesystem-kdl.xml.json', JSON.stringify(codeSystem(W))).slice(0, 40);
  assert.deepEqual(await W.kdlEinlesen('x.tgz', kaputt), { ok: false, grund: 'kdl-paket-unlesbar' });
  assert.equal((await W.kdlEinlesen('x.json', bytesVon(codeSystem(W, (cs) => { cs.url = 'http://example.org/x'; })))).grund, 'kdl-falsche-url');
  assert.equal(W.getData().kdlEingelesen, undefined, 'nach drei Abweisungen ist nichts gespeichert');
});

// Befund KDL-PAKET-2026-DATEINAME (29.10.2026): der Einlass suchte fest package/codesystem-kdl.xml.json; das Paket 2026.0.0 heißt
// die Datei CodeSystem-kdl-2026-0-0.json und wurde mit kdl-paket-ohne-datei abgewiesen. Gesucht wird über resourceType und url.
test('[KDL·Paket·Fassungen] beide Paketfassungen (2025, 2026) werden angenommen — gefunden über Verzeichnis und url, nicht den Namen', async () => {
  const faelle = [[2025, 'package/codesystem-kdl.xml.json', '2025'], [2026, 'package/CodeSystem-kdl-2026-0-0.json', '2026.0.0']];
  const gelesen = [];
  for (const [fassung] of faelle) {
    const V = await depot();
    gelesen.push([V, await V.kdlEinlesen('erfunden.kdl.r4-' + fassung + '.tgz', paket(V, fassung))]);
  }
  assert.deepEqual(gelesen.map(([, r]) => r), faelle.map(([, , version]) => ({ ok: true, version })), 'beide Fassungen angenommen');
  for (const [i, [, datei]] of faelle.entries()) {
    const V = gelesen[i][0];
    const e = V.getData().kdlEingelesen;
    assert.equal(e.herkunft.quelle.datei, datei, 'die KDL-Datei, nicht das fremde CodeSystem davor');
    assert.equal(e.begriffe.kdlVollmacht.display, MARKE_V);
  }
  // Ohne Verzeichnis: die Dateien in package/ werden der Reihe nach gelesen, das fremde CodeSystem übersprungen.
  const O = await depot();
  assert.equal((await O.kdlEinlesen('x.tgz', paket(O, 2026, (d) => { delete d['package/.index.json']; }))).ok, true);
  assert.equal(O.getData().kdlEingelesen.herkunft.quelle.datei, 'package/CodeSystem-kdl-2026-0-0.json');
  // Ein Verzeichnis, das aus package/ hinauszeigt, wird nicht befolgt; ein CodeSystem nur in einem Unterordner zählt nicht.
  const H = await depot();
  const hinaus = paket(H, 2026, (d, index) => {
    d['erfunden-aussen.json'] = d['package/CodeSystem-kdl-2026-0-0.json'];
    delete d['package/CodeSystem-kdl-2026-0-0.json'];
    index.files[2].filename = '../erfunden-aussen.json';
    d['package/.index.json'] = JSON.stringify(index);
  });
  assert.deepEqual(await H.kdlEinlesen('x.tgz', hinaus), { ok: false, grund: 'kdl-paket-ohne-datei' });
  const unter = paket(H, 2025, (d) => { d['package/other/codesystem-kdl.xml.json'] = d['package/codesystem-kdl.xml.json']; delete d['package/codesystem-kdl.xml.json']; });
  assert.deepEqual(await H.kdlEinlesen('x.tgz', unter), { ok: false, grund: 'kdl-paket-ohne-datei' });
  assert.equal(H.getData().kdlEingelesen, undefined);
});

// U2-ADR-468, Nachtrag 28.10.2026: Bedingung der Freigabe ist ein Herkunftseintrag mit den Angaben nach § 4 GPL-3.0.
test('[KDL·Herkunft·§4] der Herkunftseintrag trägt Urheberrechtsvermerk, Quelle, Gewährleistungsausschluss und Lizenzhinweis', async () => {
  const V = await depot();
  await V.kdlEinlesen('erfunden.kdl.r4-2026.tgz', paket(V, 2026));
  const h = V.getData().kdlEingelesen.herkunft;
  assert.equal(h.copyright, VERMERK, 'der Vermerk der Datei, unverändert');
  assert.deepEqual(h.quelle, { system: V.KDL_SYSTEM, paket: 'erfunden.kdl.r4#2026.0.0-erfunden', datei: 'package/CodeSystem-kdl-2026-0-0.json', bezug: V.KDL_QUELLE });
  assert.equal(h.lizenz, 'GPL-3.0-or-later');
  assert.equal(h.gewaehrleistung, 'GPL-3.0-or-later §§ 15, 16', 'die Abschnitte der GPL, die Gewährleistung und Haftung ausschließen');
  assert.equal(h.lizenzHinweis, 'GPL-3.0-or-later, https://www.gnu.org/licenses/gpl-3.0.html', 'Kennung und Wortlaut der Lizenz');
  // Als einzelnes CodeSystem: Quelle ohne Paket; ohne copyright der Herausgeber der Datei.
  const W = await depot();
  await W.kdlEinlesen('kdl.json', bytesVon(codeSystem(W, (cs) => { cs.publisher = 'Erfundener Herausgeber'; })));
  const w = W.getData().kdlEingelesen.herkunft;
  assert.equal(w.copyright, 'Erfundener Herausgeber');
  assert.deepEqual(w.quelle, { system: W.KDL_SYSTEM, paket: null, datei: null, bezug: W.KDL_QUELLE });
  // Ein Eintrag einer älteren Form (vor dem Herkunftseintrag, vor der Fassungsprüfung) öffnet das Tor nicht: die Person liest neu ein.
  assert.equal(W.getData().kdlEingelesen.form, W.KDL_EINGELESEN_FORM);
  assert.equal(W.KDL_EINGELESEN_FORM, 3);
  W.getData().kdlEingelesen.form = 2;
  assert.deepEqual(W.isikErlaubnisFehlt(), ['kdl-nicht-geladen']);
  delete W.getData().kdlEingelesen.form;
  assert.deepEqual(W.isikErlaubnisFehlt(), ['kdl-nicht-geladen']);
});

test('[KDL·Fassung] zugelassen sind nur gemessene Fassungen, die Liste ist eingefroren und nennt die Pakete 2025 und 2026.0.0', () => {
  const { V } = ladeKern();
  assert.ok(Object.isFrozen(V.KDL_FASSUNGEN));
  assert.deepEqual([...V.KDL_FASSUNGEN], ['2025', '2026.0.0'], 'gemessen am 30.10.2026: 2025.0.0/2025.0.1 tragen „2025“, 2026.0.0 trägt „2026.0.0“');
  for (const f of V.KDL_FASSUNGEN) assert.match(f, /^\d{4}(\.\d+\.\d+)?$/, 'eine KDL-Fassung ist ein Jahr, ggf. mit Paketfassung: ' + f);
  assert.ok(!V.KDL_FASSUNGEN.includes(FASSUNG_NEU));
});

test('[KDL·Fassung·Rot-Beweis] eine nicht zugelassene Fassung: abgewiesen ohne zu speichern, und eine früher gespeicherte öffnet das Tor nicht', async () => {
  const V = await depot();
  const neu = await V.kdlEinlesen('kdl.json', bytesVon(codeSystem(V, (cs) => { cs.version = FASSUNG_NEU; })));
  assert.deepEqual(neu, { ok: false, grund: 'kdl-fassung-unbekannt' });
  assert.equal(V.getData().kdlEingelesen, undefined, 'abgewiesen: nichts gespeichert');
  assert.ok(V.STRINGS.kdlFehler_kdl_fassung_unbekannt, 'der Grund wird gesagt');
  // Gegenprobe: jede zugelassene Fassung wird angenommen, steht als eigenes Feld im Eintrag und gilt als geladen …
  for (const f of V.KDL_FASSUNGEN) {
    isikDepot(V);
    assert.deepEqual(await V.kdlEinlesen('kdl.json', bytesVon(codeSystem(V, (cs) => { cs.version = f; }))), { ok: true, version: f });
    assert.equal(V.getData().kdlEingelesen.fassung, f);
    assert.deepEqual(V.isikErlaubnisFehlt(), [], 'mit Freigabe und zugelassener Fassung: ' + f);
  }
  // … steht im Depot eine Fassung, die heute nicht zugelassen ist (etwa aus einer älteren Anwendung), gilt die KDL als nicht geladen.
  V.getData().kdlEingelesen.fassung = FASSUNG_NEU;
  assert.deepEqual(V.isikErlaubnisFehlt(), ['kdl-nicht-geladen']);
  delete V.getData().kdlEingelesen.fassung;
  assert.deepEqual(V.isikErlaubnisFehlt(), ['kdl-nicht-geladen'], 'ohne Fassung ebenso');
});

const PDF = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\nScan\n%%EOF').toString('base64');
function kvnr(b, acht) {
  const z = (String(b.charCodeAt(0) - 64).padStart(2, '0') + acht).split('').map(Number);
  let s = 0; z.forEach((d, i) => { const p = d * (i % 2 === 0 ? 1 : 2); s += p > 9 ? Math.floor(p / 10) + (p % 10) : p; });
  return b + acht + (s % 10);
}
function isikDepot(V) {
  V.akteurSelbstErklaeren('Maria Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('health', 'insuranceNumber', kvnr('A', '12345678'));
  const mappeId = V.mappeEintragHinzufuegen({ beschriftung: 'Vollmacht', dateiname: 'v.pdf', mime: 'application/pdf', groesse: 30, bereich: 'advanceCare', inhalt: PDF });
  const doc = V.dokumentAnlegen({ typ: 'enduring-power-of-attorney', sektorId: 'advanceCare', name: 'Vorsorgevollmacht', gueltigAb: '2025-03-01' });
  V.dokumentSetzen(doc.id, 'mappeRef', { ref: mappeId });
  return mappeId;
}

test('[KDL·Tor] ohne KDL „nicht geladen“; mit KDL und Freigabe entsteht die Datei — mit dem Text aus dem Depot', async () => {
  const V = await depot();
  const mappeId = isikDepot(V);
  assert.equal(V.KDL_FREIGABE && V.KDL_FREIGABE.datum, '2026-10-28', 'ausgeliefert: Freigabe nach U2-ADR-468, Nachtrag 28.10.2026');
  assert.ok(/-weg-2-geschaeftsfuehrung$/.test(V.KDL_FREIGABE.grund), 'der Weg der Freigabe steht im Grund, als Kennung (Gerüst-Wächter: kein Satz im Kern)');
  assert.deepEqual(V.isikErlaubnisFehlt(), ['kdl-nicht-geladen'], 'auch mit Freigabe: ohne eingelesene KDL zu');
  assert.equal(V.isikDokumente(undefined, { sensibel: true, urschriftBestaetigt: mappeId }).bundle, null);
  await V.kdlEinlesen('kdl.json', bytesVon(codeSystem(V)));
  assert.deepEqual(V.isikErlaubnisFehlt(), []);
  const r = V.isikDokumente('2026-10-02T12:00:00Z', { sensibel: true, urschriftBestaetigt: mappeId });
  const codings = r.bundle.entry.filter((e) => e.resource.resourceType === 'DocumentReference').flatMap((e) => e.resource.type.coding).filter((c) => c.system === V.KDL_SYSTEM);
  assert.deepEqual(codings.map((c) => c.display).sort(), [MARKE_P, MARKE_V].sort());
  for (const k of ['kdlLadenKnopf', 'kdlLadenTitel', 'kdlLadenText', 'kdlLadenLizenz', 'kdlLadenDateiWaehlen', 'kdlGeladen']) assert.ok(V.STRINGS[k], k);
});

// Eine Kern-Kopie mit KDL_FREIGABE = null (der Stand vor dem 28.10.2026), gebacken geladen.
async function mitKernOhneFreigabe(fn) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const zeile = /^const KDL_FREIGABE = .*;$/m;
  assert.equal(html.split('\nconst KDL_FREIGABE = ').length, 2, 'die Freigabe steht genau einmal im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-kdl-'));
  const kopie = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(kopie, html.replace(zeile, 'const KDL_FREIGABE = null;'));
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kopie;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    return await fn(require('./load-kern.js').ladeKern);
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}

test('[KDL·Tor·Rot] an einer Kern-Kopie ohne Freigabe bleibt das Tor mit KDL zu („Freigabe ausstehend“) — kein Weg schreibt eine Datei', async () => {
  await mitKernOhneFreigabe(async (lade) => {
    const dateien = [];
    const { V } = lade({ ausgabeErfassen: (d) => dateien.push(d), backen: true });
    await V.depotAnlegen('kdl-probe-2026!');
    const mappeId = isikDepot(V);
    assert.equal(V.KDL_FREIGABE, null);
    await V.kdlEinlesen('kdl.json', bytesVon(codeSystem(V)));
    const gruende = V.isikErlaubnisFehlt();
    assert.ok(gruende.length > 0, 'Nicht-leer-Wache: das Tor nennt einen Grund');
    assert.deepEqual(gruende, ['kdl-freigabe-ausstehend']);
    assert.equal(V.isikDokumente(undefined, { sensibel: true, urschriftBestaetigt: mappeId }).bundle, null);
    assert.equal(V.flowIsikExport({ sensibel: true, urschriftBestaetigt: mappeId }), 'tor');
    assert.equal(dateien.length, 0);
    for (const g of ['kdl_nicht_geladen', 'kdl_freigabe_ausstehend']) assert.ok(V.STRINGS['isikGrund_' + g], 'der Grund wird gesagt: ' + g);
  });
});

test('[KDL·Sicherung] die eingelesene KDL reist mit der eigenen verschlüsselten Sicherung', async () => {
  const V = await depot();
  await V.kdlEinlesen('kdl.json', bytesVon(codeSystem(V)));
  const ser = await V.depotSerialisieren();
  const { V: V2 } = ladeKern();
  await V2.depotLaden(ser, 'kdl-probe-2026!');
  assert.equal(V2.getData().kdlEingelesen.begriffe.kdlVollmacht.display, MARKE_V);
});

// Klasse: keine Ausgabe an Dritte nimmt die eingelesene KDL mit — außer der ISiK-Datei, und die nur Code und Anzeigetext der zwei
// Einträge (U2-ADR-468, Nachtrag 28.10.2026, Ausnahme zu Auflage 2). Gesucht werden die erfundenen Texte (eindeutig) und die Herkunft.
function kdlFunde(text) {
  return [MARKE_V, MARKE_P, FASSUNG_AUSGABE, 'codesystem-kdl.xml.json', VERMERK].filter((m) => String(text).includes(m));
}
// Die Fassung als Fundmarke: „2026.0.0“ statt „2025“, das in jedem Datum stehen kann.
const FASSUNG_AUSGABE = '2026.0.0';
const MIT_HERKUNFT = (V) => bytesVon(codeSystem(V, (cs) => { cs.copyright = VERMERK; cs.version = FASSUNG_AUSGABE; }));
test('[KDL·Ausgabewege] nur die ISiK-Datei trägt etwas aus der KDL, und nur Code und Anzeigetext von AM160103 und AM160199', async () => {
  const M = require('../tools/rundlauf-matrix.js');
  const V = await M.depotMitReferenz();
  const r = await V.kdlEinlesen('codesystem-kdl.xml.json', MIT_HERKUNFT(V));
  assert.equal(r.ok, true);
  const ids = Object.keys(V.EXPORT_FORMAT_BY_ID);
  assert.ok(ids.length > 0, 'Nicht-leer-Wache: die Registry liefert Formate');
  assert.ok(ids.length >= 10, 'Ausbeute: die Registry-Formate (' + ids.length + ')');
  assert.ok(ids.includes('isik'), 'die Ausnahme betrifft ein Format, das es gibt');
  const funde = [];
  for (const id of ids.filter((i) => i !== 'isik')) {
    for (const sensibel of [false, true]) {
      let inhalt;
      try { inhalt = await V.formatExportInhalt(V.EXPORT_FORMAT_BY_ID[id], { sensibel }); } catch (e) { inhalt = ''; }
      const f = kdlFunde(typeof inhalt === 'string' ? inhalt : JSON.stringify(inhalt));
      if (f.length) funde.push(id + (sensibel ? ' (sensibel)' : '') + ': ' + f.join(', '));
    }
  }
  const ips = V.fhirIpsBundle('2026-10-02T12:00:00Z', { sensibel: true });
  if (kdlFunde(JSON.stringify(ips)).length) funde.push('fhirIpsBundle');
  if (kdlFunde(V.erbscheinAuszugXML()).length) funde.push('erbscheinAuszugXML');
  assert.deepEqual(funde, []);
  // Die ISiK-Datei: aus der KDL genau die zwei Codings mit ihrem Text — keine Herkunft, kein anderer Begriff.
  const I = await depot();
  const mappeId = isikDepot(I);
  await I.kdlEinlesen('codesystem-kdl.xml.json', MIT_HERKUNFT(I));
  const isik = I.isikDokumente('2026-10-02T12:00:00Z', { sensibel: true, urschriftBestaetigt: mappeId }).bundle;
  assert.ok(isik, 'mit Freigabe und eingelesener KDL entsteht die ISiK-Datei');
  const roh = JSON.stringify(isik);
  const kdl = [];
  (function lauf(x) {
    if (Array.isArray(x)) { x.forEach(lauf); return; }
    if (!x || typeof x !== 'object') return;
    if (x.system === I.KDL_SYSTEM) kdl.push(x);
    Object.values(x).forEach(lauf);
  })(isik);
  assert.ok(kdl.length > 0, 'Nicht-leer-Wache: die ISiK-Datei trägt KDL-Codings');
  assert.deepEqual([...new Set(kdl.map((c) => c.code))].sort(), ['AM160103', 'AM160199']);
  for (const c of kdl) {
    assert.deepEqual(Object.keys(c).sort(), ['code', 'display', 'system'], 'nur system, code, display');
    assert.equal(c.display, c.code === 'AM160103' ? MARKE_V : MARKE_P);
  }
  const herkunft = I.getData().kdlEingelesen.herkunft;
  for (const fremd of [FASSUNG_AUSGABE, 'codesystem-kdl.xml.json', VERMERK, herkunft.sha256, 'Erfundene Oberklasse', 'Erfundene Unterklasse', 'Nachbarklasse', 'XX01', 'XX02']) {
    assert.ok(!roh.includes(fremd), 'nicht in der ISiK-Datei: ' + fremd);
  }
  // Rot-Beweis: ein Format, das das Depot mitnähme, würde gefunden.
  assert.deepEqual(kdlFunde(JSON.stringify({ depot: V.getData() })).sort(), [FASSUNG_AUSGABE, MARKE_P, MARKE_V, 'codesystem-kdl.xml.json', VERMERK].sort());
});

// Übergangsregion KDL-LIZENZ (tools/geruest-waechter-grundlinie.json, regionen.uebergang; Achse Rechtsraum, Ziel DE-Rechtsraum-
// Modul): genau der rechtsgebundene Lizenzhinweis — SPDX-Kennung und Adresse des GPL-Wortlauts —, sonst nichts.
test('[KDL·Lizenz] die Region KDL-LIZENZ trägt genau den Lizenzhinweis, und der Dialog liest ihn von dort', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const b = html.indexOf('/* KDL-LIZENZ:BEGIN');
  const e = html.indexOf('/* KDL-LIZENZ:END */');
  assert.ok(b > 0 && e > b, 'die Region KDL-LIZENZ steht im Kern');
  const region = html.slice(html.indexOf('*/', b) + 2, e).trim();
  assert.equal(region, "const KDL_LIZENZ_HINWEIS = 'GPL-3.0-or-later, https://www.gnu.org/licenses/gpl-3.0.html';");
  assert.equal(html.split('KDL_LIZENZ_HINWEIS').length, 4, 'definiert und genau zweimal gelesen: im Dialog (als Text, kein Link) und im Herkunftseintrag');
  assert.equal(html.split('gnu.org/licenses/gpl-3.0.html').length, 2, 'die Adresse steht nur in der Region');
});

test('[KDL·Lizenz·Rot] ein zweites Literal in KDL-LIZENZ und eine Region ohne Eintrag in regionen.uebergang werden abgewiesen', () => {
  const G = require('../tools/geruest-waechter-pruefen.js');
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const gl = G.grundlinieLesen();
  const fehler = (text, grundlinie) => G.pruefen(G.messen(text, grundlinie), grundlinie).fehler.filter((f) => f.includes('KDL-LIZENZ'));
  const heute = fehler(html, gl);
  assert.deepEqual(heute, [], 'heute: die Region stimmt mit ihrem Eintrag');
  const zweites = html.replace('/* KDL-LIZENZ:END */', "const KDL_ZWEITER_SATZ = 'Ein zweiter Satz in der Region';\n/* KDL-LIZENZ:END */");
  const r1 = fehler(zweites, gl);
  assert.ok(r1.length > 0, 'Nicht-leer-Wache: ein zweites Literal in der Region ist rot');
  const ohne = JSON.parse(JSON.stringify(gl));
  ohne.regionen.uebergang = ohne.regionen.uebergang.filter((u) => u.name !== 'KDL-LIZENZ');
  assert.ok(fehler(html, ohne).length > 0, 'eine Region ohne Eintrag in regionen.uebergang ist rot');
});

test('[KDL·Texte] jeder Abweisungsgrund wird wirklich erzeugt, und der Dialog liest genau seinen Text', async () => {
  // Bedingung der Gegenlesung (02.10.2026, tote-STRINGS-Ausnahme): je Schlüssel belegt, dass der Grund entsteht UND gelesen wird —
  // nicht nur, dass der Text existiert. Erzeugt wird jeder Grund am echten Einlass; gelesen über denselben Ausdruck wie im Dialog.
  const { V } = ladeKern();
  const pr = (f) => V.kdlPruefen(JSON.stringify(codeSystem(V, f))).grund;
  const erzeugt = new Set([
    V.kdlPruefen('x'.repeat(5 * 1024 * 1024)).grund,
    V.kdlPruefen('{').grund,
    pr((cs) => { cs.resourceType = 'ValueSet'; }),
    pr((cs) => { cs.url = 'http://example.org/x'; }),
    pr((cs) => { delete cs.version; }),
    pr((cs) => { cs.version = FASSUNG_NEU; }),
    pr((cs) => { delete cs.concept; }),
    pr((cs) => { let k = cs.concept[0]; for (let i = 0; i < 14; i++) { const n = { code: 'T' + i, concept: [] }; k.concept = [n]; k = n; } }),
    pr((cs) => { cs.concept[0].concept[0].concept.pop(); }),
    pr((cs) => { cs.concept[0].concept[0].concept[0].display = ''; }),
    (await V.kdlEinlesen('x.json', bytesVon(codeSystem(V)))).grund,   // ohne offenes Depot
  ]);
  const D = await depot();
  erzeugt.add((await D.kdlEinlesen('x.tgz', tgz('package/package.json', '{}'))).grund);
  erzeugt.add((await D.kdlEinlesen('x.tgz', tgz('package/codesystem-kdl.xml.json', '{}').slice(0, 40))).grund);
  const { V: S } = ladeKern();
  await S.depotAnlegen('kdl-probe-2026!');
  const e = await S.subDepotAnlegen({ bezeichnung: 'Depot Probe', inhaberin: 'Probe', verwaltungsTyp: 'verwaltet' }, 'sub-pw-kdl');
  await S.subDepotVertrauenOeffnen(e.depotUUID, 'sub-pw-kdl');
  S.subKontextBetreten(e.depotUUID);
  erzeugt.add((await S.kdlEinlesen('x.json', bytesVon(codeSystem(S)))).grund);
  erzeugt.delete(undefined);
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const genannt = [...new Set([...html.matchAll(/(?:grund|kdlGrund): '(kdl-[a-z-]+)'/g)].map((m) => m[1]))];
  assert.ok(genannt.length > 0, 'Nicht-leer-Wache: der Kern nennt Abweisungsgründe');
  assert.deepEqual([...erzeugt].sort(), genannt.sort(), 'jeder im Kern genannte Grund wird hier wirklich erzeugt');
  // Gelesen: der Dialog schlägt den Text mit genau diesem Ausdruck nach (_kdlSelbstLadenDialog).
  assert.ok(html.includes("_eigenerWert(STRINGS, 'kdlFehler_' + r.grund.replace(/-/g, '_'))"), 'der Dialog liest kdlFehler_<grund>');
  for (const g of erzeugt) assert.ok(V.STRINGS['kdlFehler_' + g.replace(/-/g, '_')], 'Text zu ' + g);
});
