'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Studio · Dateinamen und Inhalt der Einreichung (S4, 10.11.2026)

   Eine Schlüsseldatei je Einreichung: die Sicherung (`.vdkey`). Sie trägt die Warnung vorn im Namen und geht nie hinaus.
   Die Antragsdatei und die Einreichung (und der Umschlag des Erscheinungsbilds) sind öffentlich und tragen auf keiner Ebene
   ein Feld `d` und kein `vivodepotProtectedKey`.

   Gehalten wird (1) der Filter für den Namen (NFC, nur Buchstaben, Ziffern, Bindestrich; U+202E fällt heraus; höchstens
   60 Zeichen; sonst Rückfall auf die Anbieter-Kennung), (2) die Namenstabelle in DE und EN, (3) Bedingung 7 mit Rot-Beweis.
   Abnahme: node --test tests/studio-dateinamen-einreichung.test.js → 0 fail.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ladeGenerator } = require('./load-generator.js');

const PW = 'probe-passwort-dateinamen';   // frei erfunden, nur hier
const klick = () => ({ isTrusted: true, currentTarget: { id: 'pr-submit' }, timeStamp: performance.now() });
const antragKlick = () => ({ isTrusted: true, currentTarget: { id: 'sk-antrag' }, timeStamp: performance.now() });
const RLO = String.fromCharCode(0x202E);

/* Bedingung 7 als Werkzeug: alle Pfade, an denen ein privater Teil steht (Feld `d`, Kennfeld der Sicherung). */
function privatesFinden(x, pfad, treffer) {
  treffer = treffer || []; pfad = pfad || '$';
  if (Array.isArray(x)) x.forEach((v, i) => privatesFinden(v, pfad + '[' + i + ']', treffer));
  else if (x && typeof x === 'object') {
    Object.keys(x).forEach((k) => {
      if (k === 'd' || k === 'vivodepotProtectedKey') treffer.push(pfad + '.' + k);
      privatesFinden(x[k], pfad + '.' + k, treffer);
    });
  }
  return treffer;
}
const stamm = (V, pub) => V.baueAnbieter({ anbieterName: 'Testheim e.V.', rechtsform: 'e.V.', strasse: 'Weg 1', plz: '10115', ort: 'Berlin', land: 'Deutschland',
  kontaktName: 'A B', kontaktFunktion: 'Leitung', kontaktEmail: 'a@b.example.de', kontaktTelefon: '030123', bereich: 'identity', useCase: 'x'.repeat(60) });

test('[Dateinamen] der Filter: Umkehr der Schreibrichtung fällt heraus, NFC, nur Buchstaben/Ziffern/Bindestrich, höchstens 60', () => {
  const { V } = ladeGenerator();
  assert.equal(V.dateinameTeil('Muster' + RLO + 'nosj.exe'), 'Musternosjexe', 'U+202E und Punkt fallen heraus');
  assert.equal(V.dateinameTeil('Haus der Pflege e.V.'), 'Haus-der-Pflege-eV');
  assert.equal(V.dateinameTeil('Café Ä'), 'Café-Ä', 'NFC: e + Akzent wird zu einem Zeichen');
  assert.equal(V.dateinameTeil('a/b\\c:d*e?f"g<h>i|j'), 'abcdefghij', 'Pfad- und Sonderzeichen fallen heraus');
  assert.equal(V.dateinameTeil('x'.repeat(100)).length, 60, 'höchstens 60 Zeichen');
  assert.equal(V.dateinameTeil('-- A --'), 'A');
  assert.equal(V.dateinameTeil(RLO + '...'), '', 'nichts übrig');
  for (const roh of ['Muster' + RLO + 'nosj.exe', 'a‏b', 'x⁦y', 'A\u0000B', 'Ünï Çödé 123'])
    assert.match(V.dateinameTeil(roh), /^[\p{L}\p{N}-]*$/u, 'nur Buchstaben, Ziffern, Bindestrich: ' + JSON.stringify(roh));
});

test('[Dateinamen] Rückfall auf die Anbieter-Kennung, wenn vom Namen nichts bleibt; zuletzt „anbieter“', () => {
  const { V } = ladeGenerator();
  V.STATE.anbieter = { anbieterId: 'testheim_ev', anbieterName: RLO + '...' };
  assert.equal(V.dateinameName(V.STATE.anbieter.anbieterName), 'testheim-ev', 'Rückfall auf anbieterIdFuerDatei(), ebenfalls gefiltert');
  V.STATE.anbieter = null;
  assert.equal(V.dateinameName(''), 'anbieter');
});

test('[Dateinamen] die Tabelle: Warnung vorn, Endung .vdkey nur bei Schlüsseldateien, DE und EN', () => {
  const { V, sandbox } = ladeGenerator();
  V.STATE.anbieter = { anbieterId: 'testheim_ev', anbieterName: 'Testheim e.V.' };
  const datum = V.dateinameDatum();
  assert.match(datum, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(V.sicherungDateiname(), 'NICHT-VERSENDEN-Sicherung-Testheim-eV-' + datum + '.vdkey');
  assert.equal(V.antragsdateiDateiname(), 'Fuer-Antragsformular-Testheim-eV.json');
  assert.equal(V.submissionDateiname(V.STATE.anbieter, 'a1b2c3d4-0000-4000-8000-000000000000'), 'Per-E-Mail-an-Vivodepot-Testheim-eV-a1b2c3d4.json');
  assert.equal(V.brandingModulDateiname('Testheim e.V.'), 'Per-E-Mail-an-Vivodepot-Erscheinungsbild-Testheim-eV.json');
  V.STATE.anfrage = { empfangFuer: { vorgang: 'V 1', gestelltAm: '2026-11-10' } };
  assert.equal(V.empfangDateiname(), 'NICHT-VERSENDEN-Empfang-Testheim-eV-V-1-2026-11-10.vdkey');
  // Die Warnung steht vorn: jede Schlüsseldatei beginnt mit ihr, keine ausgehende Datei trägt sie, nur Schlüsseldateien enden auf .vdkey.
  assert.ok(V.sicherungDateiname().startsWith('NICHT-VERSENDEN-') && V.empfangDateiname().startsWith('NICHT-VERSENDEN-'));
  for (const n of [V.antragsdateiDateiname(), V.submissionDateiname(V.STATE.anbieter, 'a1b2c3d4'), V.brandingModulDateiname('X')])
    assert.ok(!n.includes('NICHT-VERSENDEN') && !n.endsWith('.vdkey') && n.endsWith('.json'), n);
  vm.runInContext("LANG = 'en'", sandbox);
  assert.equal(V.sicherungDateiname(), 'DO-NOT-SEND-Backup-Testheim-eV-' + datum + '.vdkey');
  assert.equal(V.antragsdateiDateiname(), 'For-Application-Form-Testheim-eV.json');
  assert.equal(V.submissionDateiname(V.STATE.anbieter, 'a1b2c3d4'), 'By-E-Mail-to-Vivodepot-Testheim-eV-a1b2c3d4.json');
});

/* Bedingung 7: die Probe-Werkzeuge selbst, mit Rot-Beweis, bevor sie etwas freisprechen. */
test('[Inhalt·Rot-Beweis] das Suchwerkzeug findet `d` und das Kennfeld auf jeder Ebene', async () => {
  assert.deepEqual(privatesFinden({ a: { b: [{ d: 'x' }] } }), ['$.a.b[0].d']);
  assert.deepEqual(privatesFinden({ jwk: { vivodepotProtectedKey: 1 } }), ['$.jwk.vivodepotProtectedKey']);
  assert.deepEqual(privatesFinden({ jwk: { x: 'y' }, liste: ['d', { e: 1 }] }), [], 'ein Wert „d“ ist kein Feld `d`');
  // Die echte Sicherung trägt das Kennfeld: das Werkzeug schlägt an (rot), die öffentlichen Dateien unten nicht.
  const g = ladeGenerator();
  const geladen = [];
  g.sandbox.blobDownload = (name, text) => { geladen.push({ name, text }); };
  g.document.getElementById('sk-pw1').value = PW; g.document.getElementById('sk-pw2').value = PW;
  g.V.STATE.anbieter = stamm(g.V);
  await g.V.ladePrivate();
  assert.equal(geladen.length, 1);
  assert.ok(privatesFinden(JSON.parse(geladen[0].text)).includes('$.vivodepotProtectedKey') || privatesFinden(JSON.parse(geladen[0].text)).length > 0,
    'Rot-Beweis: die echte Sicherung wird vom Werkzeug als privat erkannt');
  assert.match(geladen[0].name, /^NICHT-VERSENDEN-Sicherung-.*\.vdkey$/);
});

async function mitSchluessel() {
  const g = ladeGenerator();
  const geladen = [];
  g.sandbox.blobDownload = (name, text) => { geladen.push({ name, text }); };
  const el = (id) => g.document.getElementById(id);
  el('sk-pw1').value = PW; el('sk-pw2').value = PW;
  g.V.STATE.anbieter = stamm(g.V);
  await g.V.ladePrivate();
  return { ...g, el, geladen, lauf: (c) => vm.runInContext(c, g.sandbox) };
}

test('[Inhalt] Antragsdatei, Einreichung und Umschlag tragen auf keiner Ebene ein Feld `d` und kein vivodepotProtectedKey', async () => {
  const g = await mitSchluessel();
  const { V } = g;
  const pub = V.STATE.publicKeyJwk;
  // Antragsdatei
  const antrag = await V.antragsdateiErstellen(antragKlick());
  assert.ok(antrag && antrag.besitznachweis, 'Vorbedingung: Antragsdatei entstanden: ' + g.el('sk-antrag-meldung').textContent);
  assert.deepEqual(privatesFinden(antrag), [], 'Antragsdatei');
  assert.deepEqual(privatesFinden(JSON.parse(g.geladen[1].text)), [], 'Antragsdatei, wie heruntergeladen');
  assert.equal(g.geladen[1].name, 'Fuer-Antragsformular-Testheim-eV.json');
  // Einreichung (die Sicherung ist heruntergeladen, die Antragsdatei erstellt: das Tor steht offen)
  g.lauf("ladeBeispiel('pflegeheim')");
  V.STATE.anbieter = stamm(V);
  await g.lauf('submissionErzeugen')(klick());
  const paket = V.STATE.letzteSubmission;
  assert.ok(paket, 'Vorbedingung: Einreichung entstanden');
  assert.deepEqual(privatesFinden(paket), [], 'Einreichung');
  const namen = g.geladen.map((d) => d.name);
  assert.ok(namen.some((n) => /^Per-E-Mail-an-Vivodepot-Testheim-eV-[0-9a-f]{8}\.json$/.test(n)), 'die Einreichung heißt, wohin sie geht: ' + namen.join(' | '));
  const aus = g.geladen.filter((d) => !/\.vdkey$/.test(d.name));
  assert.equal(aus.length, 2, 'zwei ausgehende Dateien');
  aus.forEach((d) => assert.deepEqual(privatesFinden(JSON.parse(d.text)), [], d.name));
  assert.equal(g.geladen.filter((d) => /\.vdkey$/.test(d.name)).length, 1, 'genau eine Schlüsseldatei');
  // Der Mailtext nennt den genauen Dateinamen (Bedingung 5)
  assert.ok(V.absendenMailtext(paket).text.includes(g.geladen.find((d) => /^Per-E-Mail/.test(d.name)).name), 'Mailtext nennt den genauen Dateinamen');
  // Umschlag (Erscheinungsbild)
  const g2 = await mitSchluessel();
  const umschlag = await g2.V.SCHLUESSEL_TRESOR.signiereEinmal(klick(), (k) => g2.V.baueBrandingSigniert({ publicKeyJwk: g2.V.STATE.publicKeyJwk, branding: { moduleVersion: 1, name: 'Test-Institution' } }, k));
  assert.ok(umschlag && umschlag.modulSignaturJws, 'Vorbedingung: Umschlag signiert');
  assert.deepEqual(privatesFinden(umschlag), [], 'Umschlag');
  // Rot-Beweis auf den echten Dateien: mit eingeschleustem `d` oder Kennfeld schlägt dieselbe Prüfung an.
  const mit = (o, k) => Object.assign({}, o, { jwk: Object.assign({}, o.jwk, { [k]: 'x' }) });
  assert.deepEqual(privatesFinden(mit(antrag, 'd')), ['$.jwk.d'], 'Rot: Antragsdatei mit d');
  assert.deepEqual(privatesFinden(Object.assign({}, paket, { publicKeyJwk: Object.assign({}, paket.publicKeyJwk, { d: 'x' }) })), ['$.publicKeyJwk.d'], 'Rot: Einreichung mit d');
  assert.deepEqual(privatesFinden(Object.assign({}, umschlag, { modul: { x: { vivodepotProtectedKey: 1 } } })), ['$.modul.x.vivodepotProtectedKey'], 'Rot: Umschlag mit Kennfeld');
  void pub;
});

test('[Schlusskarte] jede Datei steht mit genauem Namen und Chip da, die Sicherung zuletzt', async () => {
  const g = await mitSchluessel();
  const { V } = g;
  await V.antragsdateiErstellen(antragKlick());
  g.lauf("ladeBeispiel('pflegeheim')");
  V.STATE.anbieter = stamm(V);
  await g.lauf('submissionErzeugen')(klick());
  const liste = JSON.parse(JSON.stringify(V.fertigDateiListe(V.STATE.letzteSubmission)));   // über die Grenze des vm-Kontexts
  assert.deepEqual(liste.map((z) => z.art), ['hinaus', 'hinaus', 'behalten'], 'Einreichung, Antragsdatei, zuletzt die Sicherung');
  assert.deepEqual(liste.map((z) => z.chip), ['per E-Mail an Vivodepot', 'dem Antragsformular beilegen', 'bei Ihnen behalten']);
  assert.match(liste[2].name, /^NICHT-VERSENDEN-Sicherung-Testheim-eV-\d{4}-\d{2}-\d{2}\.vdkey$/);
  assert.equal(V.STATE.sicherungDateiname.startsWith('NICHT-VERSENDEN-Sicherung-'), true);
  assert.equal(V.STATE.antragDateiname, 'Fuer-Antragsformular-Testheim-eV.json');
});
