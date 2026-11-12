'use strict';
/* Größenleiter (11.11.2026): die Leiter als Daten (tools/groessenleiter.json) und die reinen Prüfteile
   (tools/lib/schriftgroessen-leiter.js), ROT-BEWEIS an erfundenen Fixtures (tools/schriftgroessen-leiter-fixtures/).
   Ohne Browser: der Quelltext-Weg liest die Fixture-HTML, der Flächen-Weg bewertet eine im Browser (Chromium) aufgenommene
   Erfassung der Fixture knopf-ueberlauf.html (Modus --fixtures-browser des Browser-Werkzeugs der Leiter, Feld `roh`).
   Die Probe gegen die Anwendungsdateien selbst kommt mit dem Umstellungs-Wagen. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/lib/schriftgroessen-leiter.js');

const leiter = W.leiterLaden();
const lies = (n) => fs.readFileSync(path.join(W.FIXTURE_ORDNER, n), 'utf8');
const stufe = (name) => leiter.stufen.find((s) => s.stufe === name);

test('Leiter: jede Stufe hat Token, px bei 1024 und 390, Gewicht und Zielbild-Fundstelle', () => {
  assert.ok(leiter.stufen.length >= 7);
  const tokens = new Set();
  for (const s of leiter.stufen) {
    assert.match(s.token, /^--fs-role-[a-z]+$/, s.stufe);
    assert.ok(!tokens.has(s.token), 'Token doppelt: ' + s.token); tokens.add(s.token);
    for (const k of ['px_1024', 'px_390', 'gewicht']) assert.equal(typeof s[k], 'number', s.stufe + ' ' + k);
    assert.ok(s.px_1024 >= 14 && s.px_390 >= 14, s.stufe + ': unter 14 px');
    assert.ok(String(s.zielbild || '').length > 10, s.stufe + ': keine Zielbild-Fundstelle');
  }
});

test('Leiter: Rangfolge des Zielbilds (größer und kräftiger nach oben, Abschnitt nie kleiner als Label)', () => {
  for (const spalte of ['px_1024', 'px_390']) {
    const reihe = ['anzeige', 'titel', 'abschnitt', 'gruppe', 'text', 'label'].map((n) => stufe(n)[spalte]);
    for (let i = 1; i < reihe.length; i++) assert.ok(reihe[i - 1] >= reihe[i], spalte + ': ' + reihe.join(' ≥ '));
    assert.ok(stufe('abschnitt')[spalte] > stufe('label')[spalte]);
    assert.ok(stufe('label')[spalte] >= stufe('hilfe')[spalte]);
  }
  assert.ok(stufe('titel').gewicht > stufe('abschnitt').gewicht - 1 && stufe('abschnitt').gewicht > stufe('text').gewicht);
  assert.ok(stufe('label').gewicht > stufe('text').gewicht);
});

test('leiterPx: unter 768 px gilt die Telefon-Spalte', () => {
  assert.deepEqual(W.leiterPx(leiter, 1024), [...new Set(leiter.stufen.map((s) => s.px_1024))].sort((a, b) => a - b));
  assert.deepEqual(W.leiterPx(leiter, 390), [...new Set(leiter.stufen.map((s) => s.px_390))].sort((a, b) => a - b));
  assert.ok(!W.leiterPx(leiter, 1024).includes(13));
});

test('deklarationPruefen: Token der Leiter und erlaubte Formen gelten, alles andere ist ein Verstoß', () => {
  assert.equal(W.deklarationPruefen('var(--fs-role-text)', leiter), null);
  assert.equal(W.deklarationPruefen('inherit', leiter), null);
  assert.equal(W.deklarationPruefen('max(16px, var(--fs-role-wert))', leiter), null);
  assert.equal(W.deklarationPruefen('13px', leiter), 'fester Wert');
  assert.equal(W.deklarationPruefen('.85rem', leiter), 'fester Wert');
  assert.match(W.deklarationPruefen('var(--fs-sm)', leiter), /außerhalb der Leiter/);
  assert.match(W.deklarationPruefen('var(--fs-lg, 1.15rem)', leiter), /außerhalb der Leiter/);
  assert.equal(W.deklarationPruefen('var(--fs-role-text, 15px)', leiter), 'Leiter-Token mit Rückfallwert');
  assert.equal(W.deklarationPruefen('max(16px, var(--fs-sm))', leiter), 'fester Wert');
  assert.equal(W.deklarationPruefen('', leiter), 'zusammengesetzt (Skript)');
});

test('deklarationenLesen: CSS, Skript und Zeilennummern; Kommentare zählen nicht', () => {
  const d = W.deklarationenLesen('a{font-size:12px}\n/* font-size: 99px */\nb { font-size: var(--x) !important; }\nel.style.fontSize = "11px";\n');
  assert.deepEqual(d.map((x) => [x.zeile, x.wert, x.weg]), [[1, '12px', 'css'], [3, 'var(--x)', 'css'], [4, '11px', 'js']]);
});

test('ROT-BEWEIS Quelltext: leiter-gut.html ohne Verstoß, leiter-13px.html mit 13px, altem Token und Skript-Größe', () => {
  assert.deepEqual(W.dateiPruefen(lies('leiter-gut.html'), leiter).verstoesse, []);
  const rot = W.dateiPruefen(lies('leiter-13px.html'), leiter).verstoesse;
  assert.deepEqual(rot.map((v) => v.wert).sort(), ['12px', '13px', 'var(--fs-sm)']);
  assert.ok(rot.find((v) => v.wert === '13px').zeile > 1);
  assert.deepEqual(W.zaehlenNachWert(rot).map(([w, n]) => w + '=' + n).sort(), ['12px=1', '13px=1', 'var(--fs-sm)=1']);
});

test('ROT-BEWEIS Flächen: die Erfassung von knopf-ueberlauf.html findet Überlauf, Umbruch, Überdeckung, 13 px und Seitenüberlauf', () => {
  const m = JSON.parse(lies('knopf-ueberlauf-erfassung.json'));
  const funde = W.erfassungAuswerten(m.erfassung, leiter, m.breite);
  const art = (a) => funde.filter((f) => f.art === a);
  assert.ok(art('ueberlauf').some((f) => /Sicherungskopie/.test(f.text)), JSON.stringify(funde));
  assert.ok(art('umbruch').some((f) => /Neue Person/.test(f.text)), JSON.stringify(funde));
  assert.ok(art('schneidet').length >= 1, JSON.stringify(funde));
  assert.ok(art('groesse').some((f) => /^13px/.test(f.wert)), JSON.stringify(funde));
  assert.equal(art('seite').length, 1);
  // Der Fließtext auf der Leiter ist kein Fund.
  assert.ok(!funde.some((f) => f.text === 'Fließtext auf der Leiter.'));
});

test('Flächen: dieselbe Erfassung ohne die Fehler bleibt ohne Fund (Gegenprobe)', () => {
  const m = JSON.parse(lies('knopf-ueberlauf-erfassung.json'));
  const sauber = {
    elemente: m.erfassung.elemente.filter((e) => e.fs === 15).map((e) => ({ ...e, zeilen: 1, ueberlauf: false, schneidet: undefined })),
    seitenUeberlauf: false,
  };
  assert.ok(sauber.elemente.length >= 2);
  assert.deepEqual(W.erfassungAuswerten(sauber, leiter, m.breite), []);
});
