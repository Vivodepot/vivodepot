'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorlesen nur mit einer Stimme auf dem Gerät (30.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund VORLESEN-OHNE-LOKALE-STIMME (HOCH). Vorher setzte „Vorlesen“ am Passwort-Vorschlag nur die Sprache, und die
   allgemeine Vorlesefunktion nahm die erste Stimme der passenden Sprache. Ist das eine Netzstimme (localService false,
   etwa „Google Deutsch“ in Chrome oder „… Online (Natural)“ in Edge), geht der Text an deren Anbieter: das Passwort
   selbst oder Depot-Inhalt. Die Probe hält fest:
   - Wirkung: Gesprochen wird nur mit einer Stimme, deren localService true ist. Steht eine Netzstimme vor einer
     lokalen, wird die lokale genommen. Gibt es keine lokale, wird nicht gesprochen, und die Oberfläche sagt kurz warum.
     Das gilt für die Sicht (vorleseStarten) und für den Passwort-Vorschlag.
   - Wächter gegen die Klasse: Jedes speak( in den ausgelieferten Seiten steht in der einen geprüften Funktion
     vorleseSprechen; ein Utterance-Bau außerhalb ebenso wenig.
   Rot-Beweis: ein direkter speechSynthesis.speak und eine Stimmenwahl ohne localService fallen auf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const SEITEN = fs.readdirSync(REPO).filter((f) => f.endsWith('.html'));
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

function macheStubEngine(stimmen) {
  const log = { speak: [], cancel: 0 };
  return { log, speak(u) { log.speak.push(u); }, cancel() { log.cancel++; }, getVoices() { return stimmen || []; }, addEventListener() {} };
}
const NETZ_DE = { lang: 'de-DE', name: 'Google Deutsch', localService: false };
const LOKAL_DE = { lang: 'de-DE', name: 'Anna', localService: true };

function funktionsKoerper(text, name) {
  const m = new RegExp('^(async )?function ' + name + '\\(', 'm').exec(text);
  if (!m) return null;
  const naechste = /^(async )?function [A-Za-z_$][\w$]*\(/gm;
  naechste.lastIndex = m.index + m[0].length;
  const n = naechste.exec(text);
  return text.slice(m.index, n ? n.index : text.length);
}
function ohneKommentare(js) {
  return js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}
// → Liste der Stellen, an denen außerhalb von vorleseSprechen gesprochen oder eine Utterance gebaut wird.
function waechterUrteil(seiten) {
  const raus = [];
  for (const [name, text] of Object.entries(seiten)) {
    // Erlaubt: speak( und der Aufruf der Utterance-Fabrik in vorleseSprechen, `new SpeechSynthesisUtterance` nur in der Fabrik.
    const geprueft = funktionsKoerper(text, 'vorleseSprechen') || '';
    const fabrik = funktionsKoerper(text, 'vorleseMacheUtterance') || '';
    let rest = text;
    for (const k of [geprueft, fabrik]) if (k) rest = rest.replace(k, '');
    rest = ohneKommentare(rest);
    if (/\.speak\s*\(/.test(rest)) raus.push(name + ': speak( außerhalb von vorleseSprechen');
    if (/new\s+(window\.)?SpeechSynthesisUtterance\s*\(|vorleseMacheUtterance\s*\(/.test(rest)) {
      raus.push(name + ': Utterance außerhalb von vorleseSprechen');
    }
  }
  return raus;
}
function stimmenUrteil(text) {
  const w = funktionsKoerper(text, 'waehleVorleseStimme') || '';
  return /localService\s*===\s*true/.test(w) ? [] : ['waehleVorleseStimme wählt ohne localService'];
}

test('[Vorlesen·lokal·Wirkung] nur eine Stimme auf dem Gerät spricht; eine Netzstimme davor wird übergangen', () => {
  const { V } = ladeKern();
  const eng = macheStubEngine([NETZ_DE, LOKAL_DE]);
  V._setVorleseEngine(eng);
  try {
    assert.equal(V.vorleseStarten('Geheimer Inhalt'), true);
    assert.equal(eng.log.speak.length, 1);
    assert.equal(eng.log.speak[0].voice, LOKAL_DE, 'die lokale Stimme, nicht die Netzstimme davor');
  } finally { V._setVorleseEngine(null); }
});

test('[Vorlesen·lokal·Wirkung] nur Netzstimmen oder gar keine: es wird nicht gesprochen, und die Oberfläche sagt warum', () => {
  for (const stimmen of [[NETZ_DE], [], [{ lang: 'de-DE', name: 'ohne Angabe' }]]) {
    const { V } = ladeKern();
    const meldungen = [];
    V.ui.toast = (t) => meldungen.push(String(t));
    const eng = macheStubEngine(stimmen);
    V._setVorleseEngine(eng);
    try {
      assert.equal(V.vorleseStarten('Geheimer Inhalt'), false, JSON.stringify(stimmen));
      assert.equal(eng.log.speak.length, 0, 'nichts gesprochen: ' + JSON.stringify(stimmen));
      assert.equal(V.vorleseLaeuft(), false);
    } finally { V._setVorleseEngine(null); }
    assert.ok(V.STRINGS.vorleseKeineLokaleStimme, 'der Satz steht im Textsatz');
    assert.deepEqual(meldungen, [V.STRINGS.vorleseKeineLokaleStimme], 'ein kurzer Satz, warum');
  }
});

test('[Vorlesen·lokal·Wirkung] der Passwort-Vorschlag spricht über dieselbe Prüfung', () => {
  const { V } = ladeKern();
  const netz = macheStubEngine([NETZ_DE]);
  V._setVorleseEngine(netz);
  try {
    assert.equal(V.vorleseSprechen('tinte, wolke, hafen', { rate: 0.8 }), false);
    assert.equal(netz.log.speak.length, 0, 'ein Passwort geht nie an eine Netzstimme');
    const lokal = macheStubEngine([LOKAL_DE]);
    V._setVorleseEngine(lokal);
    assert.equal(V.vorleseSprechen('tinte, wolke, hafen', { rate: 0.8 }), true);
    assert.equal(lokal.log.speak[0].voice, LOKAL_DE);
    assert.equal(lokal.log.speak[0].rate, 0.8);
  } finally { V._setVorleseEngine(null); }
  const verdrahtung = funktionsKoerper(KERN, 'pwVorschlagVerdrahten') || '';
  assert.match(verdrahtung, /vorleseSprechen\(/, 'der Vorlese-Knopf am Vorschlag ruft vorleseSprechen');
});

test('[Vorlesen·lokal·Wächter] jedes speak( und jede Utterance der ausgelieferten Seiten steht in vorleseSprechen; die Stimmenwahl prüft localService', () => {
  const seiten = Object.fromEntries(SEITEN.map((f) => [f, fs.readFileSync(path.join(REPO, f), 'utf8')]));
  assert.ok(Object.keys(seiten).includes('vivodepot.html'));
  assert.deepEqual(waechterUrteil(seiten), []);
  assert.deepEqual(stimmenUrteil(KERN), []);
});

test('[Vorlesen·lokal·Wächter·Rot-Beweis] ein direkter speechSynthesis.speak und eine Wahl ohne localService fallen auf', () => {
  const direkt = KERN.replace('function vorleseStoppen() {', 'function vorleseStoppen() {\n  speechSynthesis.speak(new SpeechSynthesisUtterance("x"));');
  assert.notEqual(direkt, KERN, 'Vorbedingung: vorleseStoppen steht so im Kern');
  const u = waechterUrteil({ 'vivodepot.html': direkt });
  assert.ok(u.some((x) => /speak\( außerhalb/.test(x)), u.join('\n'));
  assert.ok(u.some((x) => /Utterance außerhalb/.test(x)), u.join('\n'));
  const w = funktionsKoerper(KERN, 'waehleVorleseStimme');
  assert.deepEqual(stimmenUrteil(KERN.replace(w, w.replace(/localService\s*===\s*true/g, 'true'))), ['waehleVorleseStimme wählt ohne localService']);
});
