'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Wiederherstellungs-Code: zwei von drei Befunden aus der Abnahme (28.09.2026), Wortlaut freigegeben
   ───────────────────────────────────────────────────────────────────────────
   (1) Der Warnkasten beantwortet die Frage „Warum eigene Blätter, wenn ich mit beiden reinkomme?“ —
       Ersatzschlüssel-Bild, im Code-Dialog und auf dem Code-Blatt.
   (2) Über dem Kontrollfeld steht, warum abgetippt wird; darunter sagt ein Hinweis beim Tippen, was
       fehlt: leer, unvollständig (mit Zahl), falsch, richtig.
   Rot-Beweis je Probe im selben Testkörper. Die Sätze im Browser: tests/e2e/wiederherstellungs-code.spec.js.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[WHC·UX·1] der Warnkasten beantwortet, warum Code und Passwort getrennt liegen — im Dialog und auf dem Blatt', () => {
  const { V } = ladeKern();
  const t = V.STRINGS.whcNichtZumPasswortText;
  assert.match(t, /Ersatzschlüssel/);
  assert.match(t, /auch ohne Passwort hinein/, 'sagt, dass der Code allein öffnet');
  assert.match(t, /zusammen weg/, 'sagt, was passiert, wenn beide zusammen liegen');
  assert.ok(V.codeblattHTML().includes(t), 'derselbe Satz auf dem Code-Blatt');
  const alt = 'Der Code hilft, wenn das Passwort verloren ist';
  const rot = [alt].filter((x) => !/Ersatzschlüssel/.test(x));
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: der alte Satz ohne das Bild würde nicht bestehen');
});

test('[WHC·UX·2] der Hinweis unter dem Kontrollfeld sagt, was fehlt: leer, noch n Zeichen, falsch, richtig', () => {
  const { V } = ladeKern();
  const code = V.whcCodeErzeugen();
  const g = V.whcCodeGruppiert(code);
  assert.match(V.STRINGS.whcKontrolleLabel, /Abschreibfehler jetzt, nicht erst im Notfall/);
  assert.equal(V.whcKontrolleHinweis('', code), V.STRINGS.whcKontrolleFehlt);
  assert.equal(V.whcKontrolleHinweis(g.slice(0, 9), code), V.STRINGS.whcKontrolleTeil.replace('{n}', '20'), 'acht Zeichen getippt, zwanzig fehlen');
  const falsch = code.slice(0, -1) + (code.endsWith('0') ? '1' : '0');
  assert.equal(V.whcKontrolleHinweis(falsch, code), V.STRINGS.whcKontrolleFalsch);
  assert.equal(V.whcKontrolleHinweis(g.toLowerCase(), code), V.STRINGS.whcKontrolleStimmt, 'klein und mit Bindestrichen zählt');
  const rot = [V.whcKontrolleHinweis('', code), V.whcKontrolleHinweis(g, code)].filter((x) => x === V.STRINGS.whcKontrolleFehlt);
  assert.ok(rot.length > 0 && V.whcKontrolleHinweis(g, code) !== V.STRINGS.whcKontrolleFehlt, 'Rot-Beweis im Test: leer und richtig sind unterscheidbar');
});
