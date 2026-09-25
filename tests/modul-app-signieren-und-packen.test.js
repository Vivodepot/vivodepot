'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/modul-app-signieren-und-packen.js (31.08.2026)
   ────────────────────────────────────────────────────────────────────────
   WOZU: der bisherige Drei-Schritte-Weg (Modul bauen → tools/modul-erzeugen.js
   → tools/modul-app-packen.js, mit einer von Hand gemerkten Zwischendatei)
   ließ genau am 31.08.2026 einen Sitzungswechsel zwischen Signieren und
   Packen zu — das gepackte Bündel auf der Tester-Seite blieb auf altem
   Stand. Vorgänger-Werkzeug war fest auf den Slug „englisch" verdrahtet;
   dieser Nachfolger nimmt Slug/Herausgeber/Modul(e) als echte Argumente,
   weil ein Slug mehrere signierte Module tragen kann (Betriebssatz z. B.
   Bereichs-Modul DE + Textsatz-Overlay EN).

   Wie tests/modul-app-packen.test.js: nur die reinen Argv-Bauer, kein
   Git/keine echte Signatur — die Vorbedingungen dafür sind Seiteneffekte
   auf einem fremden Klon bzw. echtem Schlüsselmaterial und gehören nicht
   in die Suite (dieselbe Abgrenzung wie im Geschwister-Test).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const {
  argAlleWerte, _erzeugenArgs, _packenArgs,
  merkeLesen, merkeSchreiben, pfadEntscheidung, loeseStehendePfadeAuf, MERKDATEI,
} = require('../tools/modul-app-signieren-und-packen.js');

const REPO = path.join(__dirname, '..');

function wegwerfMerkdatei() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'modul-app-signieren-merke-')), 'merke.json');
}

test('[Modul-App-Signieren-Packen] argAlleWerte sammelt ALLE Vorkommen eines wiederholbaren Flags', () => {
  assert.deepEqual(argAlleWerte(['--modul', 'a.json', '--modul', 'b.json'], '--modul'), ['a.json', 'b.json']);
});

test('[Modul-App-Signieren-Packen·Gegenprobe] argAlleWerte liefert leeres Array, wenn das Flag fehlt', () => {
  assert.deepEqual(argAlleWerte(['--slug', 'englisch'], '--modul'), []);
});

test('[Modul-App-Signieren-Packen] _erzeugenArgs ruft modul-erzeugen.js mit dem übergebenen Herausgeber + allen Pfaden auf', () => {
  const args = _erzeugenArgs({
    modulPfad: '/tmp/modul.json',
    herausgeberId: 'vivodepot-sprachmodul-en',
    herausgeberName: 'Vivodepot — Englisch',
    herausgeberTyp: 'vivodepot',
    ausgabeVdkey: '/pfad/ausgabe.vdkey.json',
    ausstellerZertifikat: '/pfad/ausstellerzertifikat.json',
    ausgabedateiPfad: '/tmp/buendel.json',
  });
  assert.ok(args[0].endsWith(path.join('tools', 'modul-erzeugen.js')));
  assert.deepEqual(args.slice(1), [
    '--herausgeber-id', 'vivodepot-sprachmodul-en',
    '--herausgeber-name', 'Vivodepot — Englisch',
    '--herausgeber-typ', 'vivodepot',
    '--modul', '/tmp/modul.json',
    '--ausgabe-vdkey', '/pfad/ausgabe.vdkey.json',
    '--ausstellerzertifikat', '/pfad/ausstellerzertifikat.json',
    '--ausgabedatei', '/tmp/buendel.json',
  ]);
});

test('[Modul-App-Signieren-Packen·Gegenprobe] _erzeugenArgs hängt --herausgeber-vdkey/-zertifikat NUR an, wenn übergeben (Wiederverwendung optional)', () => {
  const basis = {
    modulPfad: 'm', herausgeberId: 'h', herausgeberName: 'H', herausgeberTyp: 't', ausgabeVdkey: 'a', ausstellerZertifikat: 'z', ausgabedateiPfad: 'o',
  };
  const ohne = _erzeugenArgs(basis);
  assert.ok(!ohne.includes('--herausgeber-vdkey'));
  const mit = _erzeugenArgs({ ...basis, herausgeberVdkey: '/pfad/herausgeber.vdkey.json', herausgeberZertifikat: '/pfad/herausgeber-zert.json' });
  assert.ok(mit.includes('--herausgeber-vdkey'));
  assert.equal(mit[mit.indexOf('--herausgeber-vdkey') + 1], '/pfad/herausgeber.vdkey.json');
  assert.ok(mit.includes('--herausgeber-zertifikat'));
  assert.equal(mit[mit.indexOf('--herausgeber-zertifikat') + 1], '/pfad/herausgeber-zert.json');
});

test('[Modul-App-Signieren-Packen] _packenArgs ruft modul-app-packen.js mit dem übergebenen Slug + dem Bündel-Pfad', () => {
  const args = _packenArgs({ slug: 'betriebssatz', buendelPfad: '/tmp/buendel-liste.json', push: false });
  assert.ok(args[0].endsWith(path.join('tools', 'modul-app-packen.js')));
  assert.deepEqual(args.slice(1), ['--slug', 'betriebssatz', '--bundle', '/tmp/buendel-liste.json']);
});

test('[Modul-App-Signieren-Packen·Gegenprobe] _packenArgs hängt --push NUR an, wenn ausdrücklich verlangt', () => {
  const ohnePush = _packenArgs({ slug: 'englisch', buendelPfad: '/tmp/b.json', push: false });
  assert.ok(!ohnePush.includes('--push'));
  const mitPush = _packenArgs({ slug: 'englisch', buendelPfad: '/tmp/b.json', push: true });
  assert.ok(mitPush.includes('--push'));
});

test('[Modul-App-Signieren-Packen] verschiedene Slugs erzeugen verschiedene --slug-Argumente (kein Slug fest verdrahtet)', () => {
  const englisch = _packenArgs({ slug: 'englisch', buendelPfad: '/tmp/b.json', push: false });
  const betriebssatz = _packenArgs({ slug: 'betriebssatz', buendelPfad: '/tmp/b.json', push: false });
  assert.equal(englisch[englisch.indexOf('--slug') + 1], 'englisch');
  assert.equal(betriebssatz[betriebssatz.indexOf('--slug') + 1], 'betriebssatz');
});

test('[Modul-App-Signieren-Packen·CLI] ohne Pflicht-Argumente bricht es mit Exit-Code 1 und einer klaren Meldung ab', () => {
  const skriptPfad = path.join(__dirname, '..', 'tools', 'modul-app-signieren-und-packen.js');
  assert.throws(() => {
    execFileSync('node', [skriptPfad], { encoding: 'utf8', stdio: 'pipe' });
  }, (e) => {
    assert.equal(e.status, 1);
    assert.match(e.stderr, /--slug/);
    assert.match(e.stderr, /--herausgeber-id/);
    assert.match(e.stderr, /--modul/);
    return true;
  });
});

test('[Modul-App-Signieren-Packen·CLI] mit --slug + Herausgeber, aber OHNE --modul und OHNE --sprachmodul-en, bricht es ebenfalls ab', () => {
  const skriptPfad = path.join(__dirname, '..', 'tools', 'modul-app-signieren-und-packen.js');
  assert.throws(() => {
    execFileSync('node', [
      skriptPfad,
      '--slug', 'betriebssatz', '--herausgeber-id', 'vivodepot', '--herausgeber-name', 'Vivodepot', '--herausgeber-typ', 'vivodepot',
      '--ausgabe-vdkey', '/pfad/a.json', '--ausstellerzertifikat', '/pfad/z.json',
    ], { encoding: 'utf8', stdio: 'pipe' });
  }, (e) => {
    assert.equal(e.status, 1);
    return true;
  });
});

/* ════════════════════════════════════════════════════════════════════════
   Gedächtnis für die zwei stehenden Pfade — Auftrag, 01.09.2026
   ────────────────────────────────────────────────────────────────────────
   Immer gegen eine WEGWERF-Merkdatei in os.tmpdir(), NIE gegen die echte
   MERKDATEI dieses Repos — dieselbe Grenze wie beim Rest der Datei.
   ════════════════════════════════════════════════════════════════════════ */

test('[Merkdatei] merkeSchreiben/merkeLesen — Rundreise über eine echte Datei', () => {
  const pfad = wegwerfMerkdatei();
  merkeSchreiben(pfad, { ausgabeVdkey: '/pfad/ausgabe.vdkey.json', ausstellerZertifikat: '/pfad/ausstellerzertifikat.json' });
  assert.deepEqual(merkeLesen(pfad), {
    ausgabeVdkey: '/pfad/ausgabe.vdkey.json', ausstellerZertifikat: '/pfad/ausstellerzertifikat.json',
  });
});

test('[Merkdatei·Gegenprobe] merkeLesen liefert {} statt zu werfen, wenn die Datei fehlt oder kaputt ist', () => {
  assert.deepEqual(merkeLesen('/pfad/den/es/nicht/gibt.json'), {});
  const pfad = wegwerfMerkdatei();
  fs.writeFileSync(pfad, '{ das ist kein JSON');
  assert.deepEqual(merkeLesen(pfad), {});
});

test('[Merkdatei·Rot-Beweis] merkeSchreiben lässt eine mitgegebene Passphrase NIEMALS in die Datei — feste Allowlist, kein Durchreichen', () => {
  const pfad = wegwerfMerkdatei();
  merkeSchreiben(pfad, {
    ausgabeVdkey: '/pfad/a.json', ausstellerZertifikat: '/pfad/z.json',
    ausgabePassphrase: 'GEHEIM-NIE-SPEICHERN', herausgeberPassphrase: 'AUCH-GEHEIM',
  });
  const roh = fs.readFileSync(pfad, 'utf8');
  assert.doesNotMatch(roh, /GEHEIM/, 'keine Passphrase darf je in der Merkdatei landen, auch nicht bei einem Aufrufer-Fehler');
  assert.deepEqual(Object.keys(JSON.parse(roh)).sort(), ['ausgabeVdkey', 'ausstellerZertifikat'].sort());
});

test('[Merkdatei] die echte MERKDATEI ist gitignored', () => {
  assert.ok(MERKDATEI.startsWith(REPO), 'Vorbedingung: MERKDATEI liegt im Repo');
  const geprueft = execFileSync('git', ['check-ignore', MERKDATEI], { cwd: REPO, encoding: 'utf8' }).trim();
  assert.equal(geprueft, MERKDATEI, 'git check-ignore muss die Merkdatei selbst als ignoriert bestätigen');
});

test('[Pfad-Entscheidung] ein explizites Argument schlägt IMMER den gemerkten Wert, ohne Ausnahme', () => {
  const e = pfadEntscheidung('/explizit.json', '/gemerkt.json', () => true);
  assert.equal(e.wert, '/explizit.json');
  assert.equal(e.quelle, 'explizit');
});

test('[Pfad-Entscheidung] ohne Argument wird der gemerkte Pfad genutzt, WENN er noch existiert', () => {
  const e = pfadEntscheidung(null, '/gemerkt.json', () => true);
  assert.equal(e.wert, '/gemerkt.json');
  assert.equal(e.quelle, 'gemerkt');
});

test('[Pfad-Entscheidung·Rot-Beweis] ein gemerkter Pfad, der nicht mehr existiert, wird NICHT stillschweigend benutzt', () => {
  const e = pfadEntscheidung(null, '/verschwunden.json', () => false);
  assert.equal(e.wert, null, 'kein Raten — null verlangt eine neue Frage, statt einen toten Pfad zu übernehmen');
  assert.equal(e.quelle, 'gemerkt-verschwunden');
});

test('[Pfad-Entscheidung] weder Argument noch Gedächtnis: nichts zu tun außer fragen', () => {
  const e = pfadEntscheidung(null, null, () => true);
  assert.equal(e.wert, null);
  assert.equal(e.quelle, 'keins');
});

test('[Stehende-Pfade] beide Pfade EXPLIZIT übergeben — KEINE Frage wird gestellt, unabhängig vom Gedächtnis', async () => {
  const pfad = wegwerfMerkdatei();
  merkeSchreiben(pfad, { ausgabeVdkey: '/gemerkt/a.json', ausstellerZertifikat: '/gemerkt/z.json' });
  const nieAufrufen = async () => { throw new Error('darf nicht aufgerufen werden — beide Pfade waren schon explizit da'); };
  const werte = await loeseStehendePfadeAuf({
    ausgabeVdkeyArg: '/explizit/a.json', ausstellerZertifikatArg: '/explizit/z.json', merkdateiPfad: pfad,
    fragen: nieAufrufen,
  });
  assert.deepEqual(werte, { ausgabeVdkey: '/explizit/a.json', ausstellerZertifikat: '/explizit/z.json' },
    'explizit muss das Gedächtnis überstimmen, nicht nur zufällig damit übereinstimmen');
});

test('[Stehende-Pfade] beide Pfade gemerkt UND auf der Platte vorhanden — KEINE Frage wird gestellt', async () => {
  const merkPfad = wegwerfMerkdatei();
  const ordner = path.dirname(merkPfad);
  const ausgabePfad = path.join(ordner, 'ausgabe.vdkey.json');
  const ausstellerPfad = path.join(ordner, 'ausstellerzertifikat.json');
  fs.writeFileSync(ausgabePfad, '{}');
  fs.writeFileSync(ausstellerPfad, '{}');
  merkeSchreiben(merkPfad, { ausgabeVdkey: ausgabePfad, ausstellerZertifikat: ausstellerPfad });
  const nieAufrufen = async () => { throw new Error('darf nicht aufgerufen werden — beide gemerkten Pfade existieren wirklich'); };
  const werte = await loeseStehendePfadeAuf({
    ausgabeVdkeyArg: null, ausstellerZertifikatArg: null, merkdateiPfad: merkPfad, fragen: nieAufrufen,
  });
  assert.deepEqual(werte, { ausgabeVdkey: ausgabePfad, ausstellerZertifikat: ausstellerPfad });
});

test('[Stehende-Pfade] ein verschwundener gemerkter Pfad löst eine Frage aus, ein vorhandener nicht', async () => {
  const merkPfad = wegwerfMerkdatei();
  const vorhandenerPfad = path.join(path.dirname(merkPfad), 'existiert-wirklich.json');
  fs.writeFileSync(vorhandenerPfad, '{}');
  merkeSchreiben(merkPfad, { ausgabeVdkey: vorhandenerPfad, ausstellerZertifikat: '/pfad/verschwunden.json' });

  const gestellteFragen = [];
  const fragenMock = async (prompts) => { gestellteFragen.push(...prompts); return prompts.map((_, i) => '/geantwortet/' + i + '.json'); };

  const werte = await loeseStehendePfadeAuf({
    ausgabeVdkeyArg: null, ausstellerZertifikatArg: null, merkdateiPfad: merkPfad, fragen: fragenMock,
  });
  assert.equal(werte.ausgabeVdkey, vorhandenerPfad, 'der vorhandene gemerkte Pfad wird übernommen, keine Frage nötig');
  assert.equal(gestellteFragen.length, 1, 'GENAU EINE Frage — nur für den verschwundenen Pfad, nicht für beide');
  assert.match(gestellteFragen[0], /ausstellerzertifikat/i);
  assert.equal(werte.ausstellerZertifikat, '/geantwortet/0.json');
});

test('[Stehende-Pfade] ganz ohne Argument und ohne Gedächtnis werden BEIDE Pfade nacheinander erfragt', async () => {
  const merkPfad = wegwerfMerkdatei(); // Datei existiert nicht — leeres Gedächtnis
  const gestellteFragen = [];
  const fragenMock = async (prompts) => { gestellteFragen.push(...prompts); return ['/erste.json', '/zweite.json']; };
  const werte = await loeseStehendePfadeAuf({
    ausgabeVdkeyArg: null, ausstellerZertifikatArg: null, merkdateiPfad: merkPfad, fragen: fragenMock,
  });
  assert.equal(gestellteFragen.length, 2);
  assert.deepEqual(werte, { ausgabeVdkey: '/erste.json', ausstellerZertifikat: '/zweite.json' });
});
