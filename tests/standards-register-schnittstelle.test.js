'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Standards-Register und Prüf-Rahmen — die Schnittstelle (docs/standards-schnittstelle.md)
   ────────────────────────────────────────────────────────────────────────
   Läuft in der Node-Suite ohne ein einziges Prüfwerkzeug: sie hält die FORM von Register,
   Manifest und Adaptern und ihre Querbezüge. Ob ein Standard wirklich besteht, misst
   tests/konformitaet/externe-validatoren.mjs — das Register behauptet es nicht selbst.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../tools/standards-register-pruefen.js');

const REPO = path.join(__dirname, '..');

/* ── Ein gültiges Minimum als Ausgang für die Rot-Beweise ─────────────────── */
const MANIFEST = [
  { id: 'werkzeug-x-1.0', art: 'werkzeug', version: '1.0', lizenz: 'Apache-2.0', url: 'https://example.org/x.jar', sha256: 'a'.repeat(64) },
];
const KONTEXT = {
  manifest: MANIFEST, adapterIds: new Set(['adapter-x']), exportIds: new Set(['weg-x']), importIds: new Set(['ein-x']),
  bezuegeIds: new Set(['ds-1']), adapterStandards: new Map([['adapter-x', ['std-x']]]),
};
const zeile = (extra = {}) => ({
  id: 'std-x', name: 'Standard X', version: '1.0', herausgeber: 'Herausgeber X',
  quelle: { url: 'https://example.org/x', abgerufen: '2026-09-28' },
  lizenz: { status: 'geprueft', text: 'CC0-1.0, aus der Paketangabe' },
  richtung: ['schreiben'], bereich: 'gesundheit', status: 'echt',
  artefakte: ['werkzeug-x-1.0'], exportwege: ['weg-x'], importwege: [], bezuege: null, grund: null, ...extra,
});
const datei = (familie, standards, adapter = 'adapter-x') => [{ datei: 'tools/standards-register/' + familie + '.json', inhalt: { familie, adapter, standards } }];

test('[Standards·Register] das gültige Minimum hat keine Mängel (Ausgang der Rot-Beweise)', () => {
  assert.deepEqual(R.pruefeRegister(datei('fhir-ig', [zeile()]), KONTEXT), []);
  assert.deepEqual(R.pruefeManifest(MANIFEST), []);
});

test('[Standards·Register·Rot-Beweis] unbekannte Familie, echt ohne Adapter, echt mit offener Lizenz, echt ohne Artefakt im Manifest', () => {
  const m = (d) => R.pruefeRegister(d, KONTEXT).join(' | ');
  assert.match(m(datei('xml-schemata', [zeile()])), /unbekannte familie/);
  assert.match(m(datei('fhir-ig', [zeile()], null)), /echt ohne adapter/);
  assert.match(m(datei('fhir-ig', [zeile({ lizenz: { status: 'rueckfrage-offen', text: 'offen', rueckfrage: { an: 'Herausgeber', datum: '2026-09-28' } } })])), /echt verlangt lizenz\.status geprueft/);
  assert.match(m(datei('fhir-ig', [zeile({ artefakte: ['fehlt-im-manifest'] })])), /Artefakt fehlt-im-manifest fehlt im Manifest/);
  assert.match(m(datei('fhir-ig', [zeile({ id: 'std-y' })])), /urteilt über diesen Standard nicht/);
});

test('[Standards·Register·Rot-Beweis] Status mit Grund, Lizenz-Rückfrage, Wege und Bezüge gegen den Kern', () => {
  const m = (z) => R.pruefeRegister(datei('fhir-ig', [z]), KONTEXT).join(' | ');
  assert.match(m(zeile({ status: 'kein-standard-vorhanden', grund: null })), /verlangt grund/);
  assert.match(m(zeile({ status: 'teilweise', lizenz: { status: 'rueckfrage-offen', text: 'x' } })), /rueckfrage\.an und rueckfrage\.datum/);
  assert.match(m(zeile({ exportwege: ['gibt-es-nicht'] })), /exportweg gibt-es-nicht/);
  assert.match(m(zeile({ bezuege: ['ds-unbekannt'] })), /bezuege ds-unbekannt/);
  assert.match(m(zeile({ bezuege: 'ds-1' })), /null oder eine Liste/);
  assert.deepEqual(R.pruefeRegister(datei('fhir-ig', [zeile({ bezuege: ['ds-1'] })]), KONTEXT), []);
});

test('[Standards·Register·Rot-Beweis] Holder-Regel: ein SD-JWT-Nachweis oder ein Bildungsnachweis wird nie geschrieben', () => {
  const sdjwt = R.pruefeRegister(datei('signatur', [zeile({ id: 'sd-jwt-vc', richtung: ['schreiben'], bereich: 'identitaet', status: 'fehlt' })]), KONTEXT);
  assert.ok(sdjwt.some((x) => /Holder-Regel/.test(x)), sdjwt.join(' | '));
  const bildung = R.pruefeRegister(datei('rdf-shacl', [zeile({ id: 'edc', richtung: ['schreiben'], bereich: 'bildung', status: 'fehlt' })]), KONTEXT);
  assert.ok(bildung.some((x) => /Holder-Regel/.test(x)));
  // Gegenprobe: empfangen/prüfen/verwahren/vorzeigen und die Selbstauskunft sind erlaubt.
  assert.deepEqual(R.pruefeRegister(datei('signatur', [zeile({ id: 'sd-jwt-vc', richtung: ['empfangen', 'pruefen', 'verwahren', 'vorzeigen', 'selbstauskunft-ausgeben'], bereich: 'identitaet', status: 'fehlt', artefakte: [] })]), KONTEXT), []);
});

test('[Standards·Manifest·Rot-Beweis] ohne SHA-256, Docker nach Tag, zwei Formen, Quelle ohne Tag-Objekt', () => {
  const m = (a) => R.pruefeManifest([{ id: 'a', art: 'werkzeug', version: '1', lizenz: 'x', ...a }]).join(' | ');
  assert.match(m({ url: 'https://example.org/a.jar' }), /sha256 fehlt/);
  assert.match(m({ docker: 'isaitb/shacl-validator:1.13.0' }), /nur nach Digest/);
  assert.match(m({ docker: 'isaitb/shacl-validator@sha256:' + 'b'.repeat(64), url: 'https://example.org/a.jar', sha256: 'c'.repeat(64) }), /genau eine Form/);
  assert.match(m({ quelle: 'https://github.com/ISAITB/shacl-validator@1.13.0' }), /Tag-Objekt-SHA/);
  assert.deepEqual(R.pruefeManifest([{ id: 'a', art: 'werkzeug', version: '1', lizenz: 'x', docker: 'isaitb/shacl-validator@sha256:' + 'b'.repeat(64) }]), []);
  assert.deepEqual(R.pruefeManifest([{ id: 'a', art: 'werkzeug', version: '1', lizenz: 'x', quelle: 'https://github.com/ISAITB/shacl-validator@' + 'd'.repeat(40) }]), []);
});

test('[Standards·Adapter·Rot-Beweis] ein Adapter ohne kaputt() fällt; kaputt() darf Objekt oder Liste sein', async () => {
  const { ladeAdapter } = await import('./konformitaet/adapter/_lader.mjs');
  const adapter = await ladeAdapter();
  assert.ok(adapter.length >= 1, 'Positivkontrolle: mindestens ein Adapter im Ordner');
  for (const a of adapter) assert.deepEqual(R.pruefeAdapter(a, a._datei), [], a._datei);
  const ohneKaputt = { ...adapter[0] }; delete ohneKaputt.kaputt;
  assert.ok(R.pruefeAdapter(ohneKaputt, 'x').some((x) => /kaputt fehlt/.test(x)));
  assert.deepEqual(R.kaputtListe({ pfad: '/a' }), [{ pfad: '/a' }]);
  assert.deepEqual(R.kaputtListe([{ pfad: '/a' }, { pfad: '/b' }]).length, 2);
  // Jeder Adapter urteilt nur über Standards seiner Familie, die im Register stehen.
  const register = R.registerLesen();
  for (const a of adapter) {
    const zeilen = register.filter((d) => d.inhalt.familie === a.familie).flatMap((d) => d.inhalt.standards.map((s) => s.id));
    assert.deepEqual(a.standards.filter((sid) => !zeilen.includes(sid)), [], a.id + ': standards ohne Registerzeile');
  }
});

test('[Standards·Bestand] Register und Manifest des Repos sind stimmig; FHIR steht mit ips und eu-eps am inline-Eintrag', () => {
  const kontext = R.kontextLesen();
  assert.deepEqual([...R.pruefeManifest(kontext.manifest), ...R.pruefeRegister(R.registerLesen(), kontext)], []);
  const fhir = R.registerLesen().find((d) => d.inhalt.familie === 'fhir-ig');
  assert.ok(fhir, 'Positivkontrolle: tools/standards-register/fhir-ig.json');
  assert.equal(fhir.inhalt.adapter, 'hl7-fhir-validator');
  // + kbv-mio-pka (29.09.2026, v835): der Weglauf-Code aus dem KBV-CodeSystem, Status teilweise.
  // + eu-lab (01.10.2026): der Import fhir-lab steht im Register, mit Kandidat statt Prüfer.
  // + isik-dokumente (03.10.2026): der Export isik (U2-ADR-468), Prüfer tools/isik-validieren.js, Status teilweise.
  assert.deepEqual(fhir.inhalt.standards.map((s) => s.id).sort(), ['eu-eps', 'eu-lab', 'ips', 'isik-dokumente', 'kbv-mio-pka']);
  assert.ok(kontext.adapterIds.has('hl7-fhir-validator'), 'der inline-Eintrag in VALIDATOREN wird über seine id aufgelöst');
});

test('[Standards·Spiegel] die Daten-Artefakte des EDC-Adapters stehen gleich im Manifest', async () => {
  const { ARTEFAKTE } = await import('./konformitaet/adapter/itb-shacl.mjs');
  const man = new Map(R.manifestLesen().map((a) => [a.id, a]));
  const abweichend = ARTEFAKTE.filter((a) => !man.has(a.id) || man.get(a.id).sha256 !== a.sha256 || man.get(a.id).url !== a.url).map((a) => a.id);
  assert.deepEqual(abweichend, []);
});

test('[Standards·Sammelaufruf·Rot-Beweis] HL7 urteilt alle Artefakte in genau einem Aufruf; ein Einzelweg für einen Sammelpflicht-Prüfer ist rot', async () => {
  const { urteileHolen } = await import('./konformitaet/adapter/_urteile.mjs');
  const faelle = [{ pfad: '/a.json' }, { pfad: '/b.json' }, { pfad: '/c.json' }];
  let alle = 0; let einzeln = 0;
  const spion = {
    id: 'hl7-probe', sammelPflicht: true,
    urteileAlle: (u, pfade) => { alle += 1; return new Map(pfade.map((p) => [p, { gelesen: true, gueltig: true, fehler: [] }])); },
    urteile: () => { einzeln += 1; return { gelesen: true, gueltig: true, fehler: [] }; },
  };
  const r = urteileHolen(spion, {}, faelle);
  assert.deepEqual([alle, einzeln, r.size], [1, 0, 3], 'genau ein Sammelaufruf für drei Artefakte, kein Einzelaufruf');
  // Rot-Beweis: ein Sammelpflicht-Prüfer ohne urteileAlle fiele in den Einzelweg — das ist ein Fehler, kein Rückfall.
  const ohneSammel = { ...spion }; delete ohneSammel.urteileAlle;
  assert.throws(() => urteileHolen(ohneSammel, {}, faelle), /sammelPflicht, aber kein urteileAlle/);
  // Gegenprobe: ein Prüfer ohne Sammelpflicht urteilt je Datei.
  einzeln = 0;
  urteileHolen({ id: 'einzeln', urteile: spion.urteile }, {}, faelle);
  assert.equal(einzeln, 3);
  // Der echte HL7-Eintrag trägt die Pflicht und den Sammelaufruf, und der Lauf holt Urteile nur über diese eine Stelle.
  const text = fs.readFileSync(path.join(REPO, 'tests', 'konformitaet', 'externe-validatoren.mjs'), 'utf8');
  const hl7 = text.slice(text.indexOf("id: 'hl7-fhir-validator'"), text.indexOf('artefakte: async'));
  assert.match(hl7, /sammelPflicht: true/);
  assert.match(hl7, /urteileAlle:/);
  assert.equal((text.match(/urteileHolen\(/g) || []).length, 2, 'Registry-Lauf und Negativprobe holen Urteile nur über urteileHolen');
  assert.doesNotMatch(text.slice(text.indexOf('/* ── Der Lauf')), /v\.urteile\(/, 'kein direkter Einzelaufruf im Lauf');
});
