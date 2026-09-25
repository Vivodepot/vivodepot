'use strict';
/* Die ADR-Fristen-Ratsche (tools/adr-fristen-pruefen.js, 22.09.2026). Sie liest das DATUM der Frist offener Konformitäts-Klauseln, nicht ihre
   Existenz. (1) Der echte Bestand ist gedeckt: jede abgelaufene oder frist-lose offene Klausel steht in der Grundlinie oder ist geschlossen.
   (2) Rot-Beweise auf der reinen Funktion: jede Weise, auf der ein Ablauf still bliebe. (3) Die Kommandozeile gegen einen Fixture-Ordner,
   auch dort, wo ihr Gegenstand fehlt. Der Fehler, gegen den sie steht: ein Test, der nur zählt, wie viele Klauseln ein `frist:`-Feld tragen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const F = require('../tools/adr-fristen-pruefen.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'adr-fristen-pruefen.js');
const GRUNDLINIE = JSON.parse(fs.readFileSync(F.GRUNDLINIE_STANDARD, 'utf8'));
const HEUTE = '2026-09-22';
const klausel = (o) => ({ adr: 'U2-ADR-999', datei: 'vivodepot-U2-ADR-999-x.md', zeile: 10, aussage: 'Eine Aussage über etwas', frist: '2026-11-30', ...o });
const erhebung = (...k) => ({ klauseln: k, klauselnGesamt: 5 });
const leer = { deckel: 0, zeilen: [] };
const zeileFuer = (k, o) => ({ adr: k.adr, aussage: k.aussage, art: 'abgelaufen', grund: 'Grund, der lang genug ist, um eine bewusste Handlung zu sein.', erstmals: k.frist || '2026-09-01', neueFrist: '2026-12-31', verlaengert: 0, ...o });
const mitZeile = (z) => ({ deckel: 1, zeilen: [z] });

/* ── (1) der echte Bestand ────────────────────────────────────────────────────────────────── */

test('[Fristen·Bestand] jede abgelaufene oder frist-lose offene Klausel des echten Bestands ist gedeckt oder geschlossen', () => {
  const K = require('../tools/adr-konformitaet-pruefen.js');
  const e = F.fristenErheben(K);
  assert.ok(e.klauselnGesamt > 100, 'Positivkontrolle: der Bestand ist gelesen (' + e.klauselnGesamt + ' Klauseln)');
  assert.ok(e.klauseln.length > 0, 'Positivkontrolle: es gibt offene Klauseln, sonst prüfte diese Probe nichts');
  const heute = new Date().toISOString().slice(0, 10);
  assert.deepEqual(F.fristenPruefen(e, GRUNDLINIE, heute).fehler, []);
});

/* ── (2) Rot-Beweise auf der reinen Funktion ──────────────────────────────────────────────── */

test('[Fristen·Rot-Beweis] eine abgelaufene offene Klausel ohne Zeile ist rot und nennt beide Wege heraus', () => {
  const k = klausel({ frist: '2026-09-20' });
  const r = F.fristenPruefen(erhebung(k), leer, HEUTE);
  assert.equal(r.fehler.length, 1);
  assert.match(r.fehler[0], /U2-ADR-999.*Frist 2026-09-20 ist abgelaufen, ungedeckt/);
  assert.match(r.fehler[0], /schließen oder die Frist im ADR neu setzen, ODER eine Zeile/);
});

test('[Fristen·Rot-Beweis] die Frist wird als DATUM gelesen: gestern ist abgelaufen, heute und morgen nicht — und ein Feld, das nur DA ist, hilft nicht', () => {
  assert.equal(F.fristenPruefen(erhebung(klausel({ frist: '2026-09-21' })), leer, HEUTE).fehler.length, 1, 'gestern: abgelaufen');
  assert.deepEqual(F.fristenPruefen(erhebung(klausel({ frist: '2026-09-22' })), leer, HEUTE).fehler, [], 'heute: noch nicht abgelaufen');
  assert.deepEqual(F.fristenPruefen(erhebung(klausel({ frist: '2026-09-23' })), leer, HEUTE).fehler, [], 'morgen: gültig');
  // Die Falle: ein Test, der nur zählt, ob `frist:` vorhanden ist, wäre bei dieser Klausel grün.
  assert.equal(F.fristenPruefen(erhebung(klausel({ frist: '2026-01-01' })), leer, HEUTE).fehler.length, 1, 'ein vorhandenes, aber altes Datum ist rot');
});

test('[Fristen·Rot-Beweis] keine oder keine gültige Frist an einer offenen Klausel ist rot (U2-ADR-098: Pflicht)', () => {
  for (const frist of [null, '', 'bald', '2026-13-40', '30.11.2026', '2026-02-30']) {
    const r = F.fristenPruefen(erhebung(klausel({ frist })), leer, HEUTE);
    assert.equal(r.fehler.length, 1, 'frist=' + JSON.stringify(frist));
    assert.match(r.fehler[0], /keine gültige Frist/);
  }
});

test('[Fristen·Deckung] eine Zeile deckt bis zu ihrer neueFrist — danach ist dieselbe Klausel wieder rot, und der Grund dafür steht im Fund', () => {
  const k = klausel({ frist: '2026-09-20' });
  const z = zeileFuer(k, { neueFrist: '2026-10-15' });
  assert.deepEqual(F.fristenPruefen(erhebung(k), mitZeile(z), HEUTE).fehler, [], 'gedeckt');
  const r = F.fristenPruefen(erhebung(k), mitZeile(z), '2026-10-16');
  assert.equal(r.fehler.length, 1);
  assert.match(r.fehler[0], /die Deckung in der Grundlinie lief am 2026-10-15 ab/);
});

test('[Fristen·Deckung] eine Zeile für eine frist-lose Klausel (art ohne-frist) deckt, eine mit falscher art nicht', () => {
  const k = klausel({ frist: null });
  assert.deepEqual(F.fristenPruefen(erhebung(k), mitZeile(zeileFuer(k, { art: 'ohne-frist' })), HEUTE).fehler, []);
  assert.match(F.fristenPruefen(erhebung(k), mitZeile(zeileFuer(k, { art: 'abgelaufen' })), HEUTE).fehler.join('|'), /führt sie als "abgelaufen", gemessen ist "ohne-frist"/);
});

test('[Fristen·Rot-Beweis] eine Zeile ohne ausreichenden Grund, ohne Datum oder mit unbekannter art ist selbst ein Fehler', () => {
  const k = klausel({ frist: '2026-09-20' });
  const fehlerMit = (o) => F.fristenPruefen(erhebung(k), mitZeile(zeileFuer(k, o)), HEUTE).fehler.join('|');
  assert.match(fehlerMit({ grund: 'zu kurz' }), /kein Grund/);
  assert.match(fehlerMit({ grund: '' }), /kein Grund/);
  assert.match(fehlerMit({ neueFrist: 'morgen' }), /`neueFrist` ist kein Datum/);
  assert.match(fehlerMit({ neueFrist: undefined }), /`neueFrist` ist kein Datum/);
  assert.match(fehlerMit({ art: 'egal' }), /erlaubt sind abgelaufen und ohne-frist/);
  assert.match(fehlerMit({ erstmals: undefined }), /`erstmals` ist kein Datum/);
  assert.match(fehlerMit({ verlaengert: undefined }), /`verlaengert` ist keine Zahl/);
  assert.match(fehlerMit({ verlaengert: -1 }), /`verlaengert` ist keine Zahl/);
  assert.match(fehlerMit({ erstmals: '2027-01-01' }), /liegt nach `neueFrist`/);
});

test('[Fristen·Verlängerung] die erste Frist wird nicht still nachgezogen: `erstmals` muss die Frist im ADR sein, sonst rot — und der Zähler ist im Bericht zu sehen', () => {
  const k = klausel({ frist: '2026-09-20' });
  const nachgezogen = F.fristenPruefen(erhebung(k), mitZeile(zeileFuer(k, { erstmals: '2026-09-25' })), HEUTE);
  assert.match(nachgezogen.fehler.join('|'), /`erstmals` \(2026-09-25\) ist nicht die Frist im ADR \(2026-09-20\)/);
  const gedeckt = F.fristenPruefen(erhebung(k), mitZeile(zeileFuer(k, { verlaengert: 2 })), HEUTE);
  assert.deepEqual(gedeckt.fehler, []);
  assert.match(gedeckt.gedeckt[0], /erstmals 2026-09-20, 2x verlängert/, 'die Zahl der Verlängerungen steht in der Ausgabe: dieselbe Klausel dreimal zu verschieben fällt auf');
});

test('[Fristen·Verteilung] die Verteilung der Fristen zeigt eine Häufung, bevor sie am selben Morgen zugleich rot wird', () => {
  const k = (frist) => klausel({ frist });
  const v = F.fristVerteilung([k('2026-11-30'), k('2026-11-30'), k('2026-11-30'), k('2026-10-31'), k(null), k('bald')]);
  assert.deepEqual(v.map((x) => x.datum), ['(ohne gültige Frist)', '2026-10-31', '2026-11-30']);
  assert.deepEqual(v.map((x) => x.n), [2, 1, 3]);
  assert.deepEqual(v.map((x) => x.haeufung), [false, false, true]);
});

test('[Fristen·Sinken] eine Zeile ohne abgelaufene Klausel (geschlossen oder Frist verschoben) ist zu streichen, und `deckel` ist exakt', () => {
  const k = klausel({ frist: '2026-11-30' });
  const stale = zeileFuer(k, {});
  assert.match(F.fristenPruefen(erhebung(k), mitZeile(stale), HEUTE).fehler.join('|'), /Zeile der Grundlinie ohne abgelaufene oder frist-lose offene Klausel: U2-ADR-999.*Zeile streichen/);
  assert.match(F.fristenPruefen(erhebung(), mitZeile(stale), HEUTE).fehler.join('|'), /Zeile streichen/, 'auch wenn die Klausel ganz verschwunden ist');
  const abgelaufen = klausel({ frist: '2026-09-20' });
  const zuviel = { deckel: 0, zeilen: [zeileFuer(abgelaufen, {})] };
  const zuwenig = { deckel: 2, zeilen: [zeileFuer(abgelaufen, {})] };
  assert.match(F.fristenPruefen(erhebung(abgelaufen), zuviel, HEUTE).fehler.join('|'), /deckel 0 passt nicht zu 1 Zeilen.*hebt `deckel` bewusst mit an/);
  assert.match(F.fristenPruefen(erhebung(abgelaufen), zuwenig, HEUTE).fehler.join('|'), /`deckel` senken/);
});

test('[Fristen·Positivkontrolle] findet die Prüfung keine einzige Klausel, ist das ein Fehler und kein leeres Grün', () => {
  const r = F.fristenPruefen({ klauseln: [], klauselnGesamt: 0 }, leer, HEUTE);
  assert.match(r.fehler.join('|'), /keine einzige Konformitäts-Klausel gefunden/);
  assert.equal(F.fristenPruefen({ klauseln: [], klauselnGesamt: 12 }, leer, HEUTE).fehler.length, 0, 'Gegenprobe: 12 Klauseln, keine offen: grün');
  assert.match(F.fristenPruefen(erhebung(), leer, 'gestern').fehler.join('|'), /heute ist kein Datum/);
});

test('[Fristen·Erkenner] die Klausel ist an ADR-Nummer und Anfang der Aussage erkennbar, nicht an einer Zeilennummer', () => {
  assert.equal(F.adrNummer('vivodepot-U2-ADR-430-wiederherstellungs-huelle.md'), 'U2-ADR-430');
  assert.equal(F.adrNummer('vivodepot-U2-ADR-NNN2-ende-eigenes.md'), 'U2-ADR-NNN2');
  assert.equal(F.adrNummer('vivodepot-B16-ADR-090-irgendwas.md'), 'B16-ADR-090', 'U2 und B16 nummerieren unabhängig ab 1 — der Präfix ist Teil der Identität');
  assert.equal(F.aussageAnfang('aussage:   Eine erste Zeile\n           und eine zweite Zeile\nzustand:   offen\n'), 'Eine erste Zeile und eine zweite Zeile');
  assert.equal(F.aussageAnfang('- aussage: Im YAML-Stil\n  zustand: offen\n'), 'Im YAML-Stil');
  assert.equal(F.aussageAnfang('aussage: ' + 'x'.repeat(200) + '\nzustand: offen').length, 60);
  assert.ok(F.gueltigesDatum('2026-09-22') && !F.gueltigesDatum('2026-02-30') && !F.gueltigesDatum('22.09.2026') && !F.gueltigesDatum(null));
});

/* ── (3) die Kommandozeile, gegen einen Fixture-Ordner ───────────────────────────────────── */

function lauf(args) {
  const r = spawnSync(process.execPath, [WERKZEUG, ...args], { encoding: 'utf8', timeout: 60000 });
  return { status: r.status, aus: (r.stdout || '') + (r.stderr || '') };
}
function fixture(dateien) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-fristen-'));
  for (const [name, text] of Object.entries(dateien)) fs.writeFileSync(path.join(dir, name), text);
  return dir;
}
const FENZ = (zustand, frist) => '# ADR\n\n```konformitaet\naussage:   Eine Aussage im eingezäunten Stil\nzustand:   ' + zustand + '\n' + (frist ? 'frist:     ' + frist + '\n' : '') + '```\n';
const YAML = (frist) => '# ADR\n\n```yaml\nkonformitaet:\n  - aussage: Eine Aussage im YAML-Stil\n    zustand: offen\n    frist: ' + frist + '\n```\n';
const GL_LEER = (dir) => { const p = path.join(dir, 'gl.json'); fs.writeFileSync(p, JSON.stringify({ deckel: 0, zeilen: [] })); return p; };

test('[Fristen·CLI] beide Klausel-Formen werden gelesen; abgelaufen ist rot (Exit 1), nichts abgelaufen ist grün (Exit 0)', () => {
  const dir = fixture({
    'vivodepot-U2-ADR-901-a.md': FENZ('offen', '2026-09-20'),
    'vivodepot-U2-ADR-902-b.md': YAML('2026-09-19'),
    'vivodepot-U2-ADR-903-c.md': FENZ('offen', '2026-12-31'),
    'vivodepot-U2-ADR-904-d.md': FENZ('geprüft', null),
  });
  try {
    const rot = lauf(['--adr-ordner', dir, '--grundlinie', GL_LEER(dir), '--heute', HEUTE]);
    assert.equal(rot.status, 1, rot.aus);
    assert.match(rot.aus, /U2-ADR-901.*Frist 2026-09-20 ist abgelaufen/);
    assert.match(rot.aus, /U2-ADR-902.*Frist 2026-09-19 ist abgelaufen/, 'die YAML-Form wird ebenso gelesen');
    assert.doesNotMatch(rot.aus, /U2-ADR-903|U2-ADR-904/, 'weder die Klausel mit späterer Frist noch die nicht offene wird gemeldet');
    const gruen = lauf(['--adr-ordner', dir, '--grundlinie', GL_LEER(dir), '--heute', '2026-09-01']);
    assert.equal(gruen.status, 0, gruen.aus);
    assert.match(gruen.aus, /1 Klausel fällig am 2026-12-31/, 'die Verteilung steht in jeder Ausgabe, auch der grünen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Fristen·CLI·Gegenstand fehlt] ein leerer oder nicht vorhandener Ordner ist ein Fehler, kein Grün', () => {
  const leerDir = fixture({});
  try {
    const gl = GL_LEER(leerDir);
    const leerLauf = lauf(['--adr-ordner', leerDir, '--grundlinie', gl, '--heute', HEUTE]);
    assert.equal(leerLauf.status, 1, leerLauf.aus);
    assert.match(leerLauf.aus, /keine einzige Konformitäts-Klausel gefunden/);
    const fehlt = lauf(['--adr-ordner', path.join(leerDir, 'gibt-es-nicht'), '--grundlinie', gl, '--heute', HEUTE]);
    assert.equal(fehlt.status, 1, fehlt.aus);
  } finally { fs.rmSync(leerDir, { recursive: true, force: true }); }
});

test('[Fristen·CLI·Rot-Beweis am echten Bestand] an einem fernen Tag ist jede offene Klausel des echten Bestands ungedeckt abgelaufen', () => {
  // An einem so fernen Tag ist JEDE Deckung (auch eine bestehende Grundlinien-Zeile) selbst abgelaufen — die Meldung trägt dann
  // „Deckung … lief ab" statt „ungedeckt". Beide Wortlaute sind ein Befund; gezählt wird die Absicht (ein Fund je offener
  // Klausel), nicht ein einzelnes Wort — sonst hielte diese Probe nur ein Format, kein Verhalten.
  const r = lauf(['--heute', '2099-01-01']);
  assert.equal(r.status, 1, r.aus);
  const offen = /davon (\d+) offen/.exec(r.aus);
  assert.ok(offen && Number(offen[1]) > 0, 'Vorbedingung: es gibt offene Klauseln');
  const funde = (r.aus.match(/ungedeckt|Deckung in der Grundlinie lief am .* ab/g) || []).length;
  assert.equal(funde, Number(offen[1]), 'jede einzelne wird gemeldet');
});

test('[Fristen·CLI] eine Zeile der Grundlinie deckt in der Kommandozeile; ohne lesbare Grundlinie ist der Lauf rot', () => {
  const dir = fixture({ 'vivodepot-U2-ADR-901-a.md': FENZ('offen', '2026-09-20') });
  try {
    const gl = path.join(dir, 'gl.json');
    fs.writeFileSync(gl, JSON.stringify({ deckel: 1, zeilen: [{ adr: 'U2-ADR-901', aussage: 'Eine Aussage im eingezäunten Stil', art: 'abgelaufen', grund: 'Der Umzug ist beschlossen, die Frist war zu knapp gesetzt worden.', erstmals: '2026-09-20', neueFrist: '2026-10-31', verlaengert: 1 }] }));
    const ok = lauf(['--adr-ordner', dir, '--grundlinie', gl, '--heute', HEUTE]);
    assert.equal(ok.status, 0, ok.aus);
    assert.match(ok.aus, /gedeckt bis 2026-10-31/);
    const spaeter = lauf(['--adr-ordner', dir, '--grundlinie', gl, '--heute', '2026-11-01']);
    assert.equal(spaeter.status, 1, spaeter.aus);
    const kaputt = lauf(['--adr-ordner', dir, '--grundlinie', path.join(dir, 'gibt-es-nicht.json'), '--heute', HEUTE]);
    assert.equal(kaputt.status, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
