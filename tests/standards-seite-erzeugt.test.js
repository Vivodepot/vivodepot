'use strict';
/* ═══════════════════════════════════════════════════════════
   Probe: die Seite „Standards und Vereinbarungen“ kommt aus dem Standards-Register (16.11.2026)
   ───────────────────────────────────────────────────────────
   Vorher stand die Seite als feste Liste von Texten im Kern; ein neuer Standard im Register erschien dort nie. Jetzt
   schreibt tools/standards-seite-erzeugen.js den Block STANDARDS_SEITE in den Kern, und _ueberStandardsHTML rendert ihn.
   Die Probe hält: (a) jeder Standard mit Weg steht auf der Seite; (b) ein neuer Register-Eintrag erscheint ohne weitere
   Änderung; (c) die Gestaltung kommt aus den Bausteinen, nicht aus freien Werten; (d) kein Status-Wort des Registers steht
   auf der Seite; (e) jeder Weg auf der Seite steht in STANDARDS.md oder in der Faktenbasis.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const S = require('../tools/standards-seite-erzeugen.js');

const REPO = path.join(__dirname, '..');
const REGISTER = S.registerLesen(REPO);
const SEITE = S.seitenEintraege(REGISTER);
const STATUS_WOERTER = /\b(teilweise|fehlt|orientiert|echt|kein-standard-vorhanden|nicht bestätigt|unbestätigt)\b/i;

function statusWorte(html) { const m = String(html).match(new RegExp(STATUS_WOERTER.source, 'gi')); return m || []; }
function escape(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

test('[Standards-Seite·Ausbeute] das Register liefert Standards mit Weg', () => {
  assert.ok(SEITE.length >= 10, 'Standards mit Weg: ' + SEITE.length);
});

test('[Standards-Seite] jeder Standard mit Weg steht auf der Seite, mit Name und Herausgeber', () => {
  const { V } = ladeKern();
  const html = V._ueberStandardsHTML();
  const marke = (x) => String(x).split('{marke}').join('Vivodepot');
  const fehlt = SEITE.filter((e) => !html.includes(escape(marke(e.name))) || !html.includes(escape(marke(e.herausgeber)))).map((e) => e.id);
  assert.deepEqual(fehlt, [], 'nicht auf der Seite');
});

test('[Standards-Seite·Frische] der Block im Kern ist der aus dem Register erzeugte', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const b = S.blockFinden(kern);
  assert.ok(b, 'Block STANDARDS-SEITE fehlt im Kern');
  assert.equal(b.text, S.blockErzeugen(SEITE), 'node tools/standards-seite-erzeugen.js');
});

test('[Standards-Seite·Rot-Beweis] ein neuer Register-Eintrag mit Weg erscheint im erzeugten Block, einer ohne Weg nicht', () => {
  const neu = { id: 'probe-standard', name: 'Probe-Standard 9', herausgeber: 'Probe-Herausgeber', version: '9.0', richtung: ['lesen'], importwege: ['json'], status: 'echt' };
  const ohneWeg = { id: 'probe-ohne-weg', name: 'Ohne Weg', herausgeber: 'X', version: '1', richtung: ['lesen'], status: 'fehlt' };
  const block = S.blockErzeugen(S.seitenEintraege(REGISTER.concat([neu, ohneWeg])));
  assert.notEqual(block, S.blockErzeugen(SEITE));
  assert.ok(block.includes('"probe-standard"'));
  assert.ok(!block.includes('"probe-ohne-weg"'));
  assert.ok(!block.includes('"status"'), 'das Status-Feld geht nicht in den Block');
});

test('[Standards-Seite·Fassung] eine kurze Kennung bleibt, eine erklärende Fassung entfällt, fassungAnzeige geht vor', () => {
  assert.equal(S.fassung({ version: '2.0.0' }), '2.0.0');
  assert.equal(S.fassung({ version: 'der Kern nennt keine Version; aktuell 27.05' }), '');
  assert.equal(S.fassung({ version: 'lang', fassungAnzeige: 'RFC 6350' }), 'RFC 6350');
});

test('[Standards-Seite·Bausteine] die Seite trägt keine freien Werte: kein style-Attribut, nur Klassen des Erscheinungsbilds', () => {
  const { V } = ladeKern();
  const html = V._ueberStandardsHTML();
  assert.doesNotMatch(html, /\sstyle=/);
  assert.doesNotMatch(html, /#[0-9a-f]{3,8}\b|rgb\(/i);
  const stil = path.join(REPO, 'tools', 'erscheinung', 'stil');
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8')
    + fs.readdirSync(stil).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(stil, f), 'utf8')).join('\n');
  const klassen = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
  const ohneRegel = [...klassen].filter((k) => !new RegExp('\\.' + k.replace(/[-]/g, '\\-') + '\\b').test(kern));
  assert.deepEqual(ohneRegel, [], 'Klassen ohne Regel im Erscheinungsbild');
});

test('[Standards-Seite·Wortlaut] kein Status-Wort des Registers steht auf der Seite', () => {
  const { V } = ladeKern();
  assert.deepEqual(statusWorte(V._ueberStandardsHTML()), []);
});

test('[Standards-Seite·Wortlaut·Rot-Beweis] ein gepflanztes Status-Wort wird gefunden', () => {
  assert.deepEqual(statusWorte('<li>FHIR · fehlt</li>'), ['fehlt']);
  assert.deepEqual(statusWorte('<li>Rechte · Gerechtigkeit</li>'), []);
});

test('[Standards-Seite·Abgleich] jeder Weg auf der Seite steht in STANDARDS.md oder in der Faktenbasis', () => {
  const doku = fs.readFileSync(path.join(REPO, 'STANDARDS.md'), 'utf8') + fs.readFileSync(path.join(REPO, 'docs', 'faktenbasis.md'), 'utf8');
  const fehlt = SEITE.flatMap((e) => e.export.concat(e.import)).filter((w) => !doku.includes('`' + w + '`'));
  assert.deepEqual([...new Set(fehlt)], []);
});

test('[Standards-Seite·Abgleich·Rot-Beweis] ein erfundener Weg fällt auf', () => {
  const doku = fs.readFileSync(path.join(REPO, 'STANDARDS.md'), 'utf8');
  assert.ok(!doku.includes('`probe-weg-gibt-es-nicht`'));
});

test('[Standards-Seite·Eigenes Format] das Register hat keinen Eintrag, der unter fremdem Namen auf der Seite stünde', () => {
  assert.deepEqual(S.seitenFehler(REGISTER), []);
});

test('[Standards-Seite·Eigenes Format·Rot-Beweis] Status fehlt ohne {marke}-Format, orientiert ohne eigenen Namen und ein fremdes Seitenfeld fallen auf', () => {
  const basis = { herausgeber: 'H', richtung: ['lesen'], importwege: ['json'] };
  const fehlt = Object.assign({ id: 'p-fehlt', name: 'ELSTER-Probe', status: 'fehlt' }, basis);
  const orientiert = Object.assign({ id: 'p-orient', name: 'Norm-Probe', status: 'orientiert' }, basis);
  const fremd = Object.assign({ id: 'p-fremd', name: 'N', status: 'echt', seite: { status: 'echt' } }, basis);
  const m = S.seitenFehler([fehlt, orientiert, fremd]);
  assert.equal(m.length, 3, m.join(' | '));
  assert.deepEqual(S.seitenFehler([Object.assign({}, fehlt, { seite: { name: 'Steuer ({marke}-Format, JSON)' } }),
    Object.assign({}, orientiert, { seite: { name: 'Norm-Probe (Felder nach der Norm)' } })]), []);
  assert.deepEqual(S.seitenFehler([Object.assign({}, fehlt, { importwege: [] })]), [], 'ohne Weg steht nichts auf der Seite');
});

test('[Standards-Seite·Seitenfelder] seite überschreibt Name, Herausgeber, Richtung und Wege auf der Seite', () => {
  const s = { id: 'p', name: 'Alt', herausgeber: 'H', richtung: ['lesen', 'pruefen'], importwege: ['a'], status: 'teilweise',
    seite: { name: 'Neu', herausgeber: 'H2', richtung: ['lesen'], importwege: ['b'] } };
  const [e] = S.seitenEintraege([s]);
  assert.deepEqual([e.name, e.herausgeber, e.richtung, e.import], ['Neu', 'H2', ['lesen'], ['b']]);
  const sd = SEITE.find((x) => x.id === 'sd-jwt-vc');
  assert.ok(sd && !sd.richtung.includes('empfangen'), 'SD-JWT VC: fremd signierte Nachweise werden abgewiesen');
  for (const id of ['open-badges-3', 'edc-ap']) assert.ok(!SEITE.find((x) => x.id === id).richtung.includes('pruefen'), id);
});

test('[Standards-Seite·Frische·Rot-Beweis] ein Handtext in der Region STANDARDS-SEITE weicht von der Ausgabe des Registers ab', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const b = S.blockFinden(kern);
  const soll = S.blockErzeugen(SEITE);
  const gepflanzt = kern.slice(0, b.ende - S.ENDE.length) + '/* von Hand: ein Satz */\n' + kern.slice(b.ende - S.ENDE.length);
  assert.notEqual(S.blockFinden(gepflanzt).text, soll, 'Handtext in der Region fällt auf');
  const geaendert = kern.replace(JSON.stringify(SEITE[0].name), JSON.stringify(SEITE[0].name + ' (von Hand)'));
  assert.notEqual(S.blockFinden(geaendert).text, soll, 'ein von Hand geänderter Name fällt auf');
  assert.equal(S.einsetzen(gepflanzt, soll), kern, 'der Erzeuger stellt die Region wieder her');
});

test('[Standards-Seite·Marke·Rot-Beweis] ein fester Herstellername auf einer Karte fällt auf, `{marke}` nicht', () => {
  const basis = { id: 'p-marke', status: 'echt', richtung: ['lesen'], importwege: ['json'] };
  assert.equal(S.seitenFehler([Object.assign({ name: 'Vivodepot-Sicherung', herausgeber: 'H' }, basis)]).length, 1);
  assert.equal(S.seitenFehler([Object.assign({ name: 'N', herausgeber: 'Vivodepot' }, basis)]).length, 1);
  assert.deepEqual(S.seitenFehler([Object.assign({ name: 'N', herausgeber: 'Vivodepot', seite: { herausgeber: '{marke}' } }, basis)]), []);
});
