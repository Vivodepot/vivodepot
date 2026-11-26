'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zuordnungen prüfen (22.11.2026): Stufe, Herkunft und Fassung je Zuordnung
   ────────────────────────────────────────────────────────────────────────
   tools/zuordnungen-pruefen.js prüft jede Zeile aus bereiche/bezuege.json mechanisch: Format (Pflichtangaben, Listenwerte,
   ISO-Daten, Bestätigung nur mit Datum), Ziel in der genannten Fassung der gepinnten Quelle (ohne gepinnte Datei: „Quelle nicht
   gepinnt"), Dublette, Widerspruch. --fassung-neu setzt die Zeilen eines Datensatzes, dessen Fassung neu gepinnt ist, auf
   „zu-pruefen", statt sie zu löschen. Der Register-Erzeuger ruft die Prüfung vor jeder Ausgabe; rot heißt: nichts gebaut.
   Rot-Beweis je Prüfung an der erfundenen Fixture unter tests/fixtures/zuordnungen-pruefen/.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Z = require('../tools/zuordnungen-pruefen.js');

const REPO = path.join(__dirname, '..');
const kopie = (o) => JSON.parse(JSON.stringify(o));
const fixture = () => kopie(Z.eingaben([]));
const arten = (r) => r.befunde.map((b) => b.art).sort();
const lauf = (e) => Z.pruefen(e);

test('[Zuordnungen] die Fixture ist ohne Befund, auch mit den Quelldateien; die Listen sind die vereinbarten', () => {
  assert.deepEqual(lauf(fixture()).befunde, []);
  const e = fixture();
  assert.deepEqual(Z.pruefen({ ...e, quellOrdner: Z.FIXTURE_QUELLEN }).befunde, []);
  assert.deepEqual([...Z.STUFEN], ['vorgeschlagen', 'mechanisch-geprueft', 'fachlich-bestaetigt', 'aufgenommen', 'strittig', 'abgelehnt', 'zu-pruefen']);
  assert.deepEqual([...Z.GRADE], ['exakt', 'naeherung', 'eng', 'weit']);
});

test('[Zuordnungen·Rot-Beweis·Format] fehlende Angabe, unbekannte Stufe und Grad, kein ISO-Datum, Bestätigung ohne Datum, Datum ohne Beleg', () => {
  const faelle = [
    ['stufe fehlt', (z) => { delete z.stufe; }],
    ['unbekannte Stufe', (z) => { z.stufe = 'freigegeben'; }],
    ['unbekannter Grad', (z) => { z.grad = 'aehnlich'; }],
    ['begruendung leer bei neuer Zeile', (z) => { z.datum = '2026-12-01'; z.begruendung = ''; }],
    ['begruendung fehlt ganz', (z) => { delete z.begruendung; }],
    ['vorgeschlagenVon fehlt', (z) => { delete z.vorgeschlagenVon; }],
    ['vorgeschlagenVon in fremder Form', (z) => { z.vorgeschlagenVon = 'Redaktion Nord'; }],
    ['bestaetigtVon fehlt ganz', (z) => { delete z.bestaetigtVon; }],
    ['datum kein ISO', (z) => { z.datum = '02.01.2026'; }],
    ['datum kein Kalendertag', (z) => { z.datum = '2026-02-30'; }],
    ['bestätigt ohne bestaetigtAm', (z) => { z.bestaetigtVon = 'https://ror.org/0abcde123'; }],
    ['bestaetigtAm ohne Bestätiger', (z) => { z.bestaetigtAm = '2026-01-05'; }],
    ['fachlich bestätigt ohne Bestätiger', (z) => { z.stufe = 'fachlich-bestaetigt'; }],
    ['leeres Datum ohne den Satz', (z) => { z.datum = ''; }],
    ['Tabulator im Text', (z) => { z.begruendung = 'a\tb'; }],
    ['zu prüfen ohne Sachsatz', (z) => { z.stufe = 'zu-pruefen'; z.begruendung = ''; }],
  ];
  for (const [name, aendern] of faelle) {
    const e = fixture();
    aendern(e.tabelle.zeilen[0]);
    assert.deepEqual(arten(lauf(e)), ['format'], name);
  }
});

test('[Zuordnungen·Rot-Beweis·Ziel] ohne gepinnte Datei: „Quelle nicht gepinnt"; mit Quellordner: Ziel fehlt in der Datei, Datei verändert', () => {
  let e = fixture();
  e.tabelle.zeilen[0].fassung = '1.1.0';
  let r = lauf(e);
  assert.deepEqual(arten(r), ['quelle-nicht-gepinnt']);
  assert.match(r.befunde[0].text, /Quelle nicht gepinnt/);

  e = fixture();
  e.tabelle.zeilen[3].fassung = '2.0';
  assert.deepEqual(arten(lauf(e)), ['quelle-nicht-gepinnt'], 'XDF-Zeile: Kennung in dieser Fassung nicht gepinnt');

  e = fixture();
  e.lock.quellen = e.lock.quellen.filter((q) => q.datensatz !== 'probe-xdf');
  assert.deepEqual(arten(lauf(e)), ['quelle-nicht-gepinnt'], 'Datensatz ganz ohne Lock-Eintrag');

  e = fixture();
  e.tabelle.zeilen[0].ziel = 'http://beispiel.invalid/eins#keinTerm';
  assert.deepEqual(arten(lauf(e)), [], 'ohne Quellordner prüft das Werkzeug nur die Lock-Datei');
  assert.deepEqual(arten(Z.pruefen({ ...e, quellOrdner: Z.FIXTURE_QUELLEN })), ['ziel-fehlt']);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zuordnungen-quelle-'));
  try {
    fs.cpSync(Z.FIXTURE_QUELLEN, tmp, { recursive: true });
    fs.appendFileSync(path.join(tmp, 'turtle', 'eins.ttl'), '# verändert\n');
    assert.deepEqual(arten(Z.pruefen({ ...fixture(), quellOrdner: tmp })), ['quelle-veraendert']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Zuordnungen·Rot-Beweis·Dublette] dieselbe Kennung, dasselbe Ziel, dieselbe Fassung zweimal', () => {
  const e = fixture();
  e.tabelle.zeilen.push(kopie(e.tabelle.zeilen[0]));
  assert.deepEqual(arten(lauf(e)), ['dublette']);
});

test('[Zuordnungen·Rot-Beweis·Widerspruch] zweimal „exakt" auf verschiedene Ziele desselben Vokabulars; aufgenommen neben abgelehnt', () => {
  let e = fixture();
  e.tabelle.zeilen.push({ ...kopie(e.tabelle.zeilen[0]), ziel: 'http://beispiel.invalid/eins#nachname' });
  assert.deepEqual(arten(lauf(e)), ['widerspruch']);

  e = fixture();
  e.tabelle.zeilen.push({ ...kopie(e.tabelle.zeilen[0]), stufe: 'abgelehnt', fassung: '1.0.0', grad: 'naeherung' });
  assert.deepEqual(arten(lauf(e)), ['widerspruch']);

  e = fixture();
  e.tabelle.zeilen.push({ ...kopie(e.tabelle.zeilen[0]), kennung: 'identity.birthName', ziel: 'http://beispiel.invalid/eins#nachname' });
  assert.deepEqual(arten(lauf(e)), [], 'Positivkontrolle: zwei Kennungen auf dasselbe Ziel sind kein Widerspruch');
});

test('[Zuordnungen·Fassung neu] eine neu gepinnte Fassung setzt die betroffenen Zeilen auf zu-pruefen und lässt die alte Fassung stehen', () => {
  const e = fixture();
  e.lock.quellen.find((q) => q.datensatz === 'probe-turtle').dateien[0].fassung = '1.1.0';
  assert.ok(lauf(e).befunde.some((b) => b.art === 'quelle-nicht-gepinnt'), 'vorher: die alte Fassung ist nicht mehr gepinnt');
  const { tabelle, geaendert } = Z.fassungNeu(e.tabelle, e.lock, 'probe-turtle');
  assert.equal(geaendert.length, 3);
  const turtle = tabelle.zeilen.filter((z) => z.datensatz === 'probe-turtle');
  assert.ok(turtle.every((z) => z.stufe === 'zu-pruefen' && z.fassung === '1.0.0'), 'Stufe zu-pruefen, Fassung bleibt die alte');
  assert.equal(tabelle.zeilen.find((z) => z.datensatz === 'probe-xdf').stufe, 'aufgenommen', 'ein anderer Datensatz bleibt unberührt');
  const r = lauf({ ...e, tabelle });
  assert.deepEqual(r.befunde, [], 'danach ohne Befund: zu-pruefen trägt die alte Fassung bis zur Bestätigung');
  assert.equal(r.hinweise.length, 3);
  assert.equal(e.tabelle.zeilen[0].stufe, 'aufgenommen', 'die Eingabe wird nicht verändert');
});

test('[Zuordnungen·Kommandozeile] ohne Argument gegen die Fixture: Exit 0; mit kaputter Tabelle Exit 1; --fassung-neu schreibt die Datei', () => {
  const ohne = spawnSync(process.execPath, [path.join(REPO, 'tools', 'zuordnungen-pruefen.js')], { encoding: 'utf8', cwd: REPO });
  assert.equal(ohne.status, 0, ohne.stdout + ohne.stderr);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zuordnungen-cli-'));
  try {
    const e = fixture();
    const bez = path.join(tmp, 'bezuege.json');
    const lock = path.join(tmp, 'bezuege-quellen.json');
    e.tabelle.zeilen[0].stufe = 'freigegeben';
    fs.writeFileSync(bez, JSON.stringify(e.tabelle, null, 2) + '\n');
    fs.writeFileSync(lock, JSON.stringify(e.lock, null, 2) + '\n');
    const rot = spawnSync(process.execPath, [path.join(REPO, 'tools', 'zuordnungen-pruefen.js'), '--bezuege', bez, '--quellen', lock], { encoding: 'utf8' });
    assert.equal(rot.status, 1);
    assert.match(rot.stdout, /BEFUND format/);

    e.tabelle.zeilen[0].stufe = 'aufgenommen';
    e.lock.quellen.find((q) => q.datensatz === 'probe-turtle').dateien[0].fassung = '1.1.0';
    fs.writeFileSync(bez, JSON.stringify(e.tabelle, null, 2) + '\n');
    fs.writeFileSync(lock, JSON.stringify(e.lock, null, 2) + '\n');
    const neu = spawnSync(process.execPath, [path.join(REPO, 'tools', 'zuordnungen-pruefen.js'), '--bezuege', bez, '--quellen', lock, '--fassung-neu', 'probe-turtle'], { encoding: 'utf8' });
    assert.equal(neu.status, 0, neu.stdout + neu.stderr);
    const nachher = JSON.parse(fs.readFileSync(bez, 'utf8'));
    assert.equal(nachher.zeilen.filter((z) => z.stufe === 'zu-pruefen').length, 3);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Zuordnungen·Begründung] im Bestand darf sie leer sein, eine neue Zeile braucht sie', () => {
  const e = fixture();
  e.tabelle.zeilen[0].begruendung = '';
  assert.deepEqual(lauf(e).befunde, [], 'Bestand ohne belegbare Begründung: leer ist erlaubt');
  e.tabelle.zeilen[0].datum = Z.BESTAND_STICHTAG;
  assert.deepEqual(lauf(e).befunde, [], 'am Stichtag noch Bestand');
  e.tabelle.zeilen[0].datum = '2026-11-23';
  assert.deepEqual(arten(lauf(e)), ['format'], 'neue Zeile ohne Begründung');
  e.tabelle.zeilen[0].begruendung = 'Gleiche Definition, gleiche Datenart.';
  assert.deepEqual(lauf(e).befunde, [], 'neue Zeile mit Begründung');
});

test('[Zuordnungen·echt] der Bestand in bereiche/bezuege.json ist ohne Befund; jede Zeile aufgenommen oder zu prüfen mit Sachsatz, von der Redaktion, ohne erfundenen Bestätiger', () => {
  const e = Z.eingaben(['--bezuege', path.join(REPO, 'bereiche', 'bezuege.json'), '--quellen', path.join(REPO, 'bereiche', 'bezuege-quellen.json')]);
  assert.ok(e.tabelle.zeilen.length >= 131, 'Positivkontrolle: der Bestand ist gelesen (' + e.tabelle.zeilen.length + ')');
  assert.deepEqual(Z.pruefen(e).befunde, []);
  for (const z of e.tabelle.zeilen) {
    assert.ok(z.stufe === 'aufgenommen' || (z.stufe === 'zu-pruefen' && /^Zu prüfen: /.test(z.kommentar) && z.begruendung === ''), z.kennung + ': aufgenommen, oder zu prüfen mit Sachsatz');
    assert.equal(z.vorgeschlagenVon, 'vivodepot-redaktion', z.kennung);
    assert.equal(z.bestaetigtVon, '', z.kennung + ': kein Bestätiger im Bestand');
    assert.ok(!('bestaetigtAm' in z), z.kennung + ': kein Bestätigungsdatum im Bestand');
    assert.ok(z.datum === '' ? /Datum der Erhebung nicht belegt/.test(z.begruendung) : /^\d{4}-\d{2}-\d{2}$/.test(z.datum), z.kennung);
  }
});
