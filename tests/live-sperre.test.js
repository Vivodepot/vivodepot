'use strict';
/* ════════════════════════════════════════════════════════════════════════
   live-sperre.test.js — Werkzeuge, die gegen einen Live-Host schreiben,
   laufen nicht aus einer Agentensitzung und nicht aus einem Test
   (26.09.2026, Befund LIVE-FREIGABE-AUS-SITZUNG)
   ────────────────────────────────────────────────────────────────────────
   Eine Sitzung startete tools/shl-empfangen-probe.js mit `--help`, das es
   nicht kannte, und fuhr damit einen echten Lauf gegen share.vivodepot.de.
   Die Probe startet die Werkzeuge NIE selbst: ginge die Sperre verloren,
   schriebe genau dieser Test gegen den Live-Host. Geprüft werden die reine
   Funktion (Umgebung und Terminal injiziert) und, statisch, dass jedes
   Werkzeug die Sperre vor seinem ersten Abruf durchsetzt. Seit 07.10.2026
   fail-closed: gesperrt ist, solange kein Mensch am Terminal bestätigt.
   ROT-BEWEIS: ein Werkzeug-Text ohne die Sperre, und einer, der sie erst
   nach dem Abruf setzt, fallen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { liveSperre, menschNachweis, SPUR_SCHLUESSEL } = require('../tools/lib/live-sperre.js');

const REPO = path.join(__dirname, '..');
// Werkzeug → die Stelle, an der es zum ersten Mal gegen den Host schreibt.
const LIVE_WERKZEUGE = {
  'tools/shl-empfangen-probe.js': "fetch(HOST + '/hochladen.php'",
  'tools/shl-belegstrecke.js': 'await hochladen(jwe)',
};

function sperreBefund(quelle, ersterAbruf) {
  const s = quelle.indexOf('liveSperreDurchsetzen(');
  const a = quelle.indexOf(ersterAbruf);
  if (a < 0) return ['erster Abruf nicht gefunden: ' + ersterAbruf];
  if (s < 0) return ['keine Live-Sperre'];
  if (s > a) return ['die Sperre steht erst nach dem ersten Abruf'];
  return [];
}

/* Fail-closed (07.10.2026): das Terminal wird injiziert. `bestaetigen` zählt mit, damit sichtbar ist, ob überhaupt
   gefragt wurde. */
const terminal = (istTTY, antwort) => { const t = { istTTY, gefragt: 0, bestaetigen() { t.gefragt++; return antwort; } }; return t; };

test('[Live-Sperre·Rot-Beweis] ohne Nachweis gesperrt: ohne Terminal, am Terminal ohne „ja“, im Testprozess', () => {
  assert.match(liveSperre({}, terminal(false, 'ja')), /kein eigenes Terminal/);
  assert.match(liveSperre({}, terminal(true, 'nein')), /nicht mit „ja“ bestätigt/);
  assert.match(liveSperre({}, terminal(true, '')), /nicht mit „ja“ bestätigt/);
  assert.match(liveSperre({ VD_SCHLUESSELBUND_GESPERRT: '1' }, terminal(true, 'ja')), /Testumgebung/);
});

test('[Live-Sperre] mit Nachweis frei: am Terminal „ja“, oder VD_LIVE_MENSCH=1 am Terminal ohne Rückfrage', () => {
  assert.equal(liveSperre({}, terminal(true, 'ja')), null);
  const t = terminal(true, 'nein');
  assert.equal(liveSperre({ VD_LIVE_MENSCH: '1' }, t), null);
  assert.equal(t.gefragt, 0, 'mit der Variable wird nicht gefragt');
});

test('[Live-Sperre·Rot-Beweis] eine Agentensitzung ohne Nachweis bleibt gesperrt, auch wenn sie sich selbst die Variable setzt', () => {
  // So läuft eine Agentensitzung: kein Terminal. Was sie in ihre Umgebung schreibt, öffnet die Sperre nicht.
  const t = terminal(false, 'ja');
  assert.match(liveSperre({ VD_LIVE_MENSCH: '1' }, t), /kein eigenes Terminal/);
  assert.match(liveSperre({ VD_LIVE_MENSCH: '1', BELIEBIG: '1' }, t), /kein eigenes Terminal/);
  assert.equal(t.gefragt, 0, 'ohne Terminal wird nicht einmal gefragt');
});

test('[Live-Sperre] jedes Werkzeug, das live schreibt, setzt die Sperre vor seinem ersten Abruf durch', () => {
  for (const [datei, abruf] of Object.entries(LIVE_WERKZEUGE)) {
    assert.deepEqual(sperreBefund(fs.readFileSync(path.join(REPO, datei), 'utf8'), abruf), [], datei);
  }
});

test('[Live-Sperre·Rot-Beweis] ohne Sperre, und mit der Sperre erst nach dem Abruf, fällt es', () => {
  const echt = fs.readFileSync(path.join(REPO, 'tools/shl-empfangen-probe.js'), 'utf8');
  const abruf = LIVE_WERKZEUGE['tools/shl-empfangen-probe.js'];
  assert.deepEqual(sperreBefund(echt.replace(/liveSperreDurchsetzen\(/g, 'x('), abruf), ['keine Live-Sperre']);
  const spaet = echt.replace(/liveSperreDurchsetzen\(/g, 'x(') + '\nliveSperreDurchsetzen(\'spaet\');\n';
  assert.deepEqual(sperreBefund(spaet, abruf), ['die Sperre steht erst nach dem ersten Abruf']);
});

/* EIN Menschen-Nachweis (07.10.2026, Befund AGENTENSPERRE-FAIL-OPEN): Schlüsselbund, Release und Auslieferungslauf entscheiden
   über menschNachweis — dieselben Regeln wie die Live-Sperre, dazu eine Zeile Spur je Aufruf aus einem Signier- oder
   Schlüsselbund-Weg. Die Spur geht hier nur in ein Wegwerf-Verzeichnis. */
const spurOrdner = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mensch-nachweis-'));
  process.once('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const spurZeilen = (datei) => fs.readFileSync(datei, 'utf8').split('\n').filter(Boolean).map((z) => JSON.parse(z));

test('[Menschen-Nachweis·Rot-Beweis] ohne Terminal gesperrt (auch mit VD_LIVE_MENSCH=1), am Terminal ohne „ja“ gesperrt, im Testprozess gesperrt', () => {
  const t = terminal(false, 'ja');
  assert.match(menschNachweis({}, t), /kein eigenes Terminal/);
  assert.match(menschNachweis({ VD_LIVE_MENSCH: '1' }, t), /kein eigenes Terminal/);
  assert.equal(t.gefragt, 0);
  assert.match(menschNachweis({}, terminal(true, 'nein')), /nicht mit „ja“ bestätigt/);
  assert.match(menschNachweis({ VD_SCHLUESSELBUND_GESPERRT: '1', VD_LIVE_MENSCH: '1' }, terminal(true, 'ja')), /Testumgebung/);
});

test('[Menschen-Nachweis] am Terminal mit „ja“ frei; ein injiziertes Terminal wird nie gemerkt — jede Probe fragt neu', () => {
  const ja = terminal(true, 'ja');
  assert.equal(menschNachweis({}, ja), null);
  assert.equal(ja.gefragt, 1);
  assert.match(menschNachweis({}, terminal(true, 'nein')), /nicht mit „ja“ bestätigt/, 'das „ja“ davor öffnet keinen späteren Aufruf');
  const t = terminal(true, 'nein');
  assert.equal(menschNachweis({ VD_LIVE_MENSCH: '1' }, t), null);
  assert.equal(t.gefragt, 0, 'mit der Variable am Terminal wird nicht gefragt');
});

test('[Menschen-Nachweis·Spur] eine Zeile je Aufruf mit genau den erlaubten Schlüsseln, ohne Werte aus der Umgebung', () => {
  const datei = path.join(spurOrdner(), 'hook-log.ndjson');
  const GEHEIM = 'probe-geheimnis-' + Date.now();
  const env = { VD_TEST_PASSPHRASE: GEHEIM, HOME: '/home/probe-geheimnis-pfad' };
  assert.equal(menschNachweis(env, terminal(true, 'ja'), { werkzeug: 'probe-werkzeug', logDatei: datei }), null);
  assert.match(menschNachweis(env, terminal(false, 'ja'), { werkzeug: 'probe-werkzeug', logDatei: datei }), /kein eigenes Terminal/);
  const roh = fs.readFileSync(datei, 'utf8');
  const zeilen = spurZeilen(datei);
  assert.equal(zeilen.length, 2, 'je Aufruf eine Zeile');
  for (const z of zeilen) {
    assert.deepEqual(Object.keys(z).sort(), [...SPUR_SCHLUESSEL].sort());
    assert.equal(z.hook, 'mensch-nachweis');
    assert.equal(z.werkzeug, 'probe-werkzeug');
    assert.match(z.zeit, /^\d{4}-\d\d-\d\dT[\d:.]+Z$/);
  }
  assert.deepEqual(zeilen.map((z) => z.nachweis), ['ja', 'nein']);
  assert.ok(!roh.includes(GEHEIM), 'das Geheimnis aus der Umgebung steht nicht in der Spur');
  assert.ok(!roh.includes('probe-geheimnis-pfad'), 'kein Pfad aus der Umgebung');
  assert.ok(!/TTY|Terminal|Testumgebung/.test(roh), 'kein Grund-Text');
});

test('[Menschen-Nachweis·Spur·Rot-Beweis] ohne `werkzeug` keine Zeile; eine Zeile mit fremdem Schlüssel fiele auf', () => {
  const datei = path.join(spurOrdner(), 'hook-log.ndjson');
  menschNachweis({}, terminal(true, 'ja'), { logDatei: datei });
  assert.equal(fs.existsSync(datei), false, 'die Live-Sperre allein schreibt keine Spur');
  // Rot-Beweis der Schlüsselprüfung: eine Zeile, die einen Wert trüge, hätte einen Schlüssel mehr.
  const falsch = { zeit: 'x', hook: 'mensch-nachweis', werkzeug: 'w', nachweis: 'ja', passphrase: 'x' };
  assert.notDeepEqual(Object.keys(falsch).sort(), [...SPUR_SCHLUESSEL].sort());
});
