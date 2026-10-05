'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   ISiK Stufe 6 · Vollmacht und IPS als DocumentReference (U2-ADR-468, v863)
   ───────────────────────────────────────────────────────────────────────────
   Geprüft:
     1. DAS TOR: ohne eingelesene KDL (GPL-3.0-or-later, die Person lädt sie selbst) entsteht nie eine Datei — weder im Builder
        noch über den Ausgabeweg. Tor mit eingelesener KDL und Rot-Beweis mit Freigabe: tests/kdl-selbst-laden.test.js.
     2. Interne Probe mit den Texten zur Laufzeit (opt.anzeigetexte): zwei DocumentReferences nach ISiKDokumentenMetadaten.
     3. DIE URSCHRIFT, drei Fälle (entschieden am 01.10.2026): eine von Vivodepot erzeugte Datei ist nie DR 1 — am
        Mappe-Kennzeichen UND am Merkmal in der Datei („vivodepot-kern/“, auch wieder eingelegt); eine fremde Datei erst nach
        Bestätigung; ein Scan mit Bestätigung wird DR 1, unverändert.
     4. Gates: ohne KVNR und ohne Freigabe der sensiblen Felder keine Datei, der Grund steht da.
   Der Kern kennt von der KDL genau die zwei Codes und die System-URL (KDL_GEBRAUCHT, KDL_SYSTEM), keinen Text.
   Die amtlichen Anzeigetexte stehen hier NICHT — die Probe setzt Platzhalter ein; gegen den Validator mit den echten Texten
   prüft tools/isik-validieren.js, das sie zur Laufzeit aus dem lokalen Paket-Cache liest.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PROFIL = 'https://gematik.de/fhir/isik/StructureDefinition/ISiKDokumentenMetadaten';
const KDL = 'http://dvmd.de/fhir/CodeSystem/kdl';

// Eine gültige Krankenversichertennummer (Prüfziffer nach demselben Verfahren wie im Kern) — erfunden.
function kvnr(buchstabe, acht) {
  const zwei = String(buchstabe.charCodeAt(0) - 64).padStart(2, '0');
  const z = (zwei + acht).split('').map(Number);
  let summe = 0;
  z.forEach((d, i) => { const p = d * (i % 2 === 0 ? 1 : 2); summe += p > 9 ? Math.floor(p / 10) + (p % 10) : p; });
  return buchstabe + acht + (summe % 10);
}
const KVNR = kvnr('A', '12345678');

// Platzhalter je Code — die Probe braucht nur „ein Text ist da“, nie den amtlichen Wortlaut.
function platzhalter(V) {
  const kdl = Object.fromEntries(Object.entries(V.KDL_GEBRAUCHT).map(([k, code]) => [k, { system: V.KDL_SYSTEM, code }]));
  const T = Object.assign({}, V.IPS_BEGRIFFE.isik, kdl);
  const aus = {};
  for (const k of ['kdlVollmacht', 'kdlPatienteneigen', 'xdsTyp', 'xdsKlasse', 'einrichtung', 'fachrichtung']) aus[T[k].system + '|' + T[k].code] = 'Platzhalter ' + k;
  return aus;
}
const pdfBytes = (text) => 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n' + text + '\n%%EOF').toString('base64');

async function depot(opts, { mitKvnr = true, datei } = {}) {
  const k = ladeKern(opts);
  const { V } = k;
  await V.depotAnlegen('isik-probe-2026!');
  V.akteurSelbstErklaeren('Maria Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  if (mitKvnr) V.sektorFeldSetzen('health', 'insuranceNumber', KVNR);
  let mappeId = null;
  if (datei) {
    mappeId = V.mappeEintragHinzufuegen(Object.assign({ beschriftung: 'Vollmacht', dateiname: 'vollmacht.pdf', mime: 'application/pdf', groesse: 100, bereich: 'advanceCare' }, datei));
    const doc = V.dokumentAnlegen({ typ: 'enduring-power-of-attorney', sektorId: 'advanceCare', name: 'Vorsorgevollmacht', gueltigAb: '2025-03-01' });
    V.dokumentSetzen(doc.id, 'mappeRef', { ref: mappeId });
  }
  return { V, mappeId };
}
const drNach = (b, code) => b.entry.map((e) => e.resource).find((r) => r.type.coding[0].code === code);

test('[ISiK·Tor·Kern] wie ausgeliefert trägt der Kern keinen KDL-Text — das Tor ist zu, und kein Weg erzeugt eine Datei', async () => {
  const dateien = [];
  const { V, mappeId } = await depot({ ausgabeErfassen: (d) => dateien.push(d) }, { datei: { inhalt: pdfBytes('Scan') } });
  assert.equal(V.IPS_BEGRIFFE.kdl, undefined, 'kein gebackener KDL-Block');
  assert.deepEqual(V.isikErlaubnisFehlt(), ['kdl-nicht-geladen']);
  const texte = { 'irgendein|code': 'Platzhalter' };
  assert.ok(V.isikDokumente(undefined, { sensibel: true, urschriftBestaetigt: mappeId, anzeigetexte: texte }).gruende.includes('kdl-nicht-geladen'),
    'auch eine interne Probe mit Texten kommt ohne Texte zu den KDL-Codes nicht durch');
  assert.equal(V.flowIsikExport({ sensibel: true, urschriftBestaetigt: mappeId }), 'tor');
  assert.equal(dateien.length, 0);
});

test('[ISiK·Tor] ohne eingelesene KDL: kein Bundle, der Grund steht da — und der Ausgabeweg schreibt keine Datei', async () => {
  const dateien = [];
  const { V, mappeId } = await depot({ ausgabeErfassen: (d) => dateien.push(d) }, { datei: { inhalt: pdfBytes('Scan') } });
  assert.deepEqual(V.isikErlaubnisFehlt(), ['kdl-nicht-geladen'], 'IHE-D ist unter Creative Commons BY 4.0 belegt (NOTICE), offen ist allein die KDL (GPL-3.0-or-later)');
  const r = V.isikDokumente(undefined, { sensibel: true, urschriftBestaetigt: mappeId });
  assert.equal(r.bundle, null);
  assert.deepEqual(r.gruende.slice(0, 1), ['kdl-nicht-geladen']);
  assert.equal(V.flowIsikExport({ sensibel: true, urschriftBestaetigt: mappeId }), 'tor');
  assert.equal(V.flowIsikExport(), 'tor');
  assert.equal(dateien.length, 0, 'ohne Erlaubnis entsteht nie eine Datei');
  // Positivkontrolle im selben Depot: mit den Texten (nur intern) entstünden DocumentReferences — die leere Ausgabe oben ist das Tor,
  // kein Depot, aus dem ohnehin nichts entstünde.
  const probe = V.isikDokumente(undefined, { sensibel: true, urschriftBestaetigt: mappeId, anzeigetexte: platzhalter(V) });
  assert.ok(probe.dokumente.length > 0, 'Positivkontrolle: mit Texten entstehen DocumentReferences');
});


test('[ISiK·DR] interne Probe: zwei DocumentReferences nach ISiKDokumentenMetadaten, DR 1 die Urschrift unverändert, DR 2 die IPS', async () => {
  const scan = pdfBytes('eingescannte unterschriebene Vollmacht');
  const { V, mappeId } = await depot(undefined, { datei: { inhalt: scan } });
  const r = V.isikDokumente('2026-10-01T12:00:00Z', { sensibel: true, urschriftBestaetigt: mappeId, anzeigetexte: platzhalter(V) });
  assert.deepEqual(r.gruende, []);
  assert.equal(r.bundle.type, 'collection');
  assert.equal(r.bundle.entry.length, 2);
  for (const e of r.bundle.entry) {
    const d = e.resource;
    assert.deepEqual(d.meta.profile, [PROFIL]);
    assert.match(d.masterIdentifier.value, /^urn:oid:2\.25\.\d+$/);
    assert.deepEqual(d.subject.identifier, { system: 'http://fhir.de/sid/gkv/kvid-10', value: KVNR });
    assert.equal(d.content.length, 1, 'ISiK: content höchstens einer');
    assert.ok(d.type.coding.every((c) => c.display), 'jedes Coding trägt seinen Text');
    assert.equal(d.context.facilityType.coding[0].code, 'PAT');
  }
  const dr1 = drNach(r.bundle, 'AM160103');
  assert.equal(dr1.type.coding[0].system, KDL);
  assert.equal(dr1.content[0].attachment.contentType, 'application/pdf');
  assert.equal(dr1.content[0].attachment.data, scan.split(',')[1], 'die Urschrift geht unverändert hinaus');
  const dr2 = drNach(r.bundle, 'AM160199');
  const ips = JSON.parse(Buffer.from(dr2.content[0].attachment.data, 'base64').toString('utf8'));
  assert.equal(ips.resourceType, 'Bundle');
  assert.equal(dr2.content[0].attachment.contentType, 'application/fhir+json');
  assert.equal(dr2.content[0].format.code, 'urn:ihe:iti:xds:2017:mimeTypeSufficient');
});

test('[ISiK·Urschrift] von Vivodepot erzeugt (Kennzeichen oder Merkmal in der Datei) ist nie DR 1, auch nicht bestätigt', async () => {
  for (const datei of [
    { inhalt: pdfBytes('Entwurf'), erzeugtVonVivodepot: true },
    { inhalt: pdfBytes('/Creator (vivodepot-kern/v858)') },
    { inhalt: pdfBytes('<xmp:CreatorTool>vivodepot-kern/v858</xmp:CreatorTool>') },
    { inhalt: 'data:application/pdf;base64,' + Buffer.concat([Buffer.from('%PDF-1.4\n/Creator <FEFF'), Buffer.from(Buffer.from('vivodepot-kern/v858', 'utf16le').swap16().toString('hex').toUpperCase()), Buffer.from('>\n')]).toString('base64') },
  ]) {
    const { V, mappeId } = await depot(undefined, { datei });
    const r = V.isikDokumente(undefined, { sensibel: true, urschriftBestaetigt: mappeId, anzeigetexte: platzhalter(V) });
    assert.deepEqual(r.gruende, ['urschrift-ist-entwurf'], JSON.stringify(Object.keys(datei)));
    assert.equal(drNach(r.bundle, 'AM160103'), undefined);
    assert.ok(drNach(r.bundle, 'AM160199'), 'die IPS geht trotzdem');
  }
});

test('[ISiK·Urschrift] ohne Bestätigung oder ohne Zuordnung kein DR 1, mit sichtbarem Grund', async () => {
  const a = await depot(undefined, { datei: { inhalt: pdfBytes('Scan') } });
  assert.deepEqual(a.V.isikDokumente(undefined, { sensibel: true, anzeigetexte: platzhalter(a.V) }).gruende, ['urschrift-unbestaetigt']);
  assert.deepEqual(a.V.isikDokumente(undefined, { sensibel: true, urschriftBestaetigt: 'eine-andere-id', anzeigetexte: platzhalter(a.V) }).gruende, ['urschrift-unbestaetigt']);
  const b = await depot(undefined, {});
  assert.deepEqual(b.V.isikDokumente(undefined, { sensibel: true, anzeigetexte: platzhalter(b.V) }).gruende, ['urschrift-fehlt']);
  for (const g of ['urschrift_fehlt', 'urschrift_unbestaetigt', 'urschrift_ist_entwurf', 'kvnr_fehlt', 'sensibel_nicht_freigegeben', 'kdl_nicht_geladen', 'kdl_freigabe_ausstehend', 'erlaubnis_ihed']) {
    assert.ok(a.V.STRINGS['isikGrund_' + g], 'der Grund wird gesagt: ' + g);
  }
});

test('[ISiK·Gates] ohne KVNR oder ohne Freigabe der sensiblen Felder entsteht nichts', async () => {
  const a = await depot(undefined, { mitKvnr: false });
  const r1 = a.V.isikDokumente(undefined, { sensibel: true, anzeigetexte: platzhalter(a.V) });
  assert.equal(r1.bundle, null);
  assert.deepEqual(r1.gruende, ['kvnr-fehlt']);
  const b = await depot(undefined, {});
  const r2 = b.V.isikDokumente(undefined, { sensibel: false, anzeigetexte: platzhalter(b.V) });
  assert.equal(r2.bundle, null);
  assert.deepEqual(r2.gruende, ['sensibel-nicht-freigegeben']);
  b.V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456789');
  assert.ok(b.V.isikDokumente(undefined, { sensibel: true, anzeigetexte: platzhalter(b.V) }).gruende.includes('kvnr-fehlt'), 'falsche Prüfziffer');
});

test('[ISiK·Mappe] ein selbst abgelegtes Vivodepot-Dokument trägt das Kennzeichen, eine eigene Datei nicht', async () => {
  const { V } = await depot(undefined, {});
  const eigen = V.mappeEintragHinzufuegen({ beschriftung: 'Scan', inhalt: pdfBytes('Scan') });
  const erzeugt = V.mappeEintragHinzufuegen({ beschriftung: 'Entwurf', inhalt: pdfBytes('x'), erzeugtVonVivodepot: true });
  const m = V.getData().mappe;
  assert.equal(m.find((e) => e.id === eigen).erzeugtVonVivodepot, undefined);
  assert.equal(m.find((e) => e.id === erzeugt).erzeugtVonVivodepot, true);
});

test('[ISiK·Texte] jeder Grund ohne Datei wird wirklich erzeugt, und der Dialog liest genau seinen Text; die Kurzbeschriftung kommt aus dem Katalog', async () => {
  // Bedingung der Gegenlesung (02.10.2026, tote-STRINGS-Ausnahme): je Schlüssel belegt, dass er entsteht UND gelesen wird.
  const erzeugt = new Set();
  const a = await depot(undefined, { datei: { inhalt: pdfBytes('Scan') } });
  a.V.isikErlaubnisFehlt().forEach((g) => erzeugt.add(g));                                   // kdl-nicht-geladen
  a.V.isikDokumente(undefined, { sensibel: false, anzeigetexte: platzhalter(a.V) }).gruende.forEach((g) => erzeugt.add(g));
  a.V.isikDokumente(undefined, { sensibel: true, anzeigetexte: platzhalter(a.V) }).gruende.forEach((g) => erzeugt.add(g));   // urschrift-unbestaetigt
  const b = await depot(undefined, { mitKvnr: false });
  b.V.isikDokumente(undefined, { sensibel: true, anzeigetexte: platzhalter(b.V) }).gruende.forEach((g) => erzeugt.add(g));   // kvnr-fehlt
  const d = await depot(undefined, {});
  d.V.isikDokumente(undefined, { sensibel: true, anzeigetexte: platzhalter(d.V) }).gruende.forEach((g) => erzeugt.add(g));   // urschrift-fehlt
  const c = await depot(undefined, { datei: { inhalt: pdfBytes('x'), erzeugtVonVivodepot: true } });
  c.V.isikDokumente(undefined, { sensibel: true, anzeigetexte: platzhalter(c.V) }).gruende.forEach((g) => erzeugt.add(g));   // urschrift-ist-entwurf
  await c.V.kdlEinlesen('kdl.json', new Uint8Array(Buffer.from(JSON.stringify({ resourceType: 'CodeSystem', url: c.V.KDL_SYSTEM, version: '0-erfunden',
    concept: Object.values(c.V.KDL_GEBRAUCHT).map((code) => ({ code, display: 'Erfundene Klasse ' + code })) }))));
  c.V.isikErlaubnisFehlt().forEach((g) => erzeugt.add(g));                                   // kdl-freigabe-ausstehend
  c.V.ipsBegriffeAnmelden({ isik: { erlaubnis: {} } });                                      // ohne IHE-D-Erlaubnis
  c.V.isikErlaubnisFehlt().forEach((g) => erzeugt.add(g));                                   // erlaubnis-ihed
  const erwartet = ['erlaubnis-ihed', 'kdl-freigabe-ausstehend', 'kdl-nicht-geladen', 'kvnr-fehlt', 'sensibel-nicht-freigegeben',
    'urschrift-fehlt', 'urschrift-ist-entwurf', 'urschrift-unbestaetigt'];
  assert.ok(erzeugt.size > 0, 'Nicht-leer-Wache: die Gründe entstehen');
  assert.deepEqual([...erzeugt].sort(), erwartet);
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(html.includes("_eigenerWert(STRINGS, 'isikGrund_' + g.replace(/-/g, '_'))"), 'der Dialog liest isikGrund_<grund>');
  for (const g of erwartet) assert.ok(a.V.STRINGS['isikGrund_' + g.replace(/-/g, '_')], 'Text zu ' + g);
  const katalog = fs.readFileSync(path.join(__dirname, '..', 'tools', 'bereiche-nativ-katalog-modul.json'), 'utf8');
  assert.ok(katalog.includes('"labelSchluessel": "isikExportKurz"') && a.V.STRINGS.isikExportKurz, 'isikExportKurz: über labelSchluessel gelesen, mit Text');
});
