'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Vorwarnung vor der Frage nach dauerhaftem Speicher (Abnahme 28.09.2026) — nur wo der Browser fragt, dazu dauerhaft in
   den Einstellungen
   ───────────────────────────────────────────────────────────────────────────
   Firefox fragt „Daten im dauerhaften Speicher speichern?“ ohne Vorwarnung. Ein erster Bau warnte in jeder Sitzung vorher
   per Hinweis — auch in Chrome, das nie fragt, und brach dabei zwei Browser-Tests, die keine Hinweise erwarten. Keine
   Schnittstelle sagt, ob ein Browser fragen wird (Messung: tools/persist-frage-messen.js — Chromium und Firefox melden
   beide „prompt“). Darum: der Satz steht dauerhaft unter „Sichern & Wiederherstellen“ (jeder Browser), und die Vorwarnung
   kommt nur, wo der Motor Gecko ist. Je Motor geprüft: hier die Entscheidung, in tests/e2e-firefox/speicher-vorwarnung.spec.js
   der echte Firefox, in Chromium die bestehenden Specs, die keine Hinweise erwarten
   (tests/e2e/s4-datei-toast-abnahme.spec.js, tests/e2e/11-wizard-fremder-ausstieg.spec.js).
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const GECKO = { supports: (eig) => eig === '-moz-appearance' };
const CHROMIUM = { supports: () => false };
const WEBKIT = { supports: () => false };

test('[Dauerspeicher·Motor] nur Gecko gilt als fragender Browser; fehlendes oder werfendes CSS gilt als nicht fragend', () => {
  const { V } = ladeKern();
  assert.equal(V._browserFragtNachDauerspeicher(GECKO), true);
  assert.equal(V._browserFragtNachDauerspeicher(CHROMIUM), false);
  assert.equal(V._browserFragtNachDauerspeicher(WEBKIT), false);
  assert.equal(V._browserFragtNachDauerspeicher(null), false);
  assert.equal(V._browserFragtNachDauerspeicher({ supports: () => { throw new Error('x'); } }), false);
});

test('[Dauerspeicher·Vorwarnung] nur wenn der Browser fragt UND der Speicher noch nicht dauerhaft ist', () => {
  const { V } = ladeKern();
  assert.equal(V._persistVorwarnungZeigen(false, true), true);
  assert.equal(V._persistVorwarnungZeigen(true, true), false, 'schon dauerhaft: keine Frage zu erwarten');
  assert.equal(V._persistVorwarnungZeigen(false, false), false, 'Chrome/Safari: kein Hinweis — der Satz steht in den Einstellungen');
  const alterBau = (istDauerhaft) => !istDauerhaft;   // der erste Bau: jede Sitzung ohne dauerhaften Speicher
  assert.notEqual(alterBau(false), V._persistVorwarnungZeigen(false, false), 'Rot-Beweis im Test: der alte Bau hätte in Chrome gewarnt');
});

test('[Dauerspeicher·Chromium-Weg] ohne Gecko fragt der Kern den Speicher an, ohne einen Hinweis zu zeigen', async () => {
  let angefragt = 0;
  const nav = { storage: { persist: async () => { angefragt++; return true; }, persisted: async () => false } };
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://vivodepot.example/app' }, navigator: nav });
  const gesehen = [];
  V.ui.toast = (t) => { gesehen.push(t); };
  await V.persistAnfragen();
  assert.equal(angefragt, 1, 'persist() wird weiterhin angefragt');
  assert.deepEqual(gesehen, []);
});

test('[Dauerspeicher·Einstellungen] der Satz steht unter „Sichern & Wiederherstellen“, für jeden Browser', () => {
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://vivodepot.example/app' } });
  assert.match(V.STRINGS.speicherDauerHinweis, /„Erlauben“/);
  if (!V.internerSpeicherModus()) return assert.fail('Vorbedingung: der Kern läuft hier im Gerätespeicher');
  const html = V.einstellungenHTML();
  assert.ok(html.includes('id="einst-dauerspeicher"'), 'der Absatz steht in den Einstellungen');
  assert.ok(html.includes(V.escapeHTML(V.STRINGS.speicherDauerHinweis)), 'mit dem Satz');
});

/* Der Satz sagt „Sichern Sie es deshalb zusätzlich als Datei“ — darum steht der Knopf direkt darunter, und er ist derselbe
   Weg wie „Sicherungskopie erstellen“ im Kopfzeilen-Menü (sicherungskopieErstellen), kein zweiter. */
test('[Dauerspeicher·Sicherungskopie] Einstellungen und Kopfzeilen-Menü rufen denselben Weg', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const beideRufen = (q) => /sicherungskopie\.onclick = \(\) => \{ depotMenueSchliessen\(false\); sicherungskopieErstellen\(\); \};/.test(q)
    && /esk\.onclick = \(\) => sicherungskopieErstellen\(\);/.test(q);
  assert.ok(beideRufen(kern), 'Menü und Einstellungen rufen sicherungskopieErstellen()');
  const definitionen = kern.match(/^function sicherungskopieErstellen\(/gm) || [];
  assert.equal(definitionen.length, 1, 'genau eine Funktion');
  const rumpf = kern.slice(kern.indexOf('function sicherungskopieErstellen('), kern.indexOf('\n}\n', kern.indexOf('function sicherungskopieErstellen(')));
  assert.match(rumpf, /depotInDateiSichern\(\)/, 'die eine Funktion schreibt die Datei');
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://vivodepot.example/app' } });
  assert.ok(V.einstellungenHTML().includes('id="einst-sicherungskopie"'), 'der Knopf steht unter dem Satz');
  const zweiterWeg = kern.replace('esk.onclick = () => sicherungskopieErstellen();', 'esk.onclick = () => depotInDateiSichern();');
  assert.equal(beideRufen(zweiterWeg), false, 'Rot-Beweis im Test: ein eigener Weg im Einstellungs-Knopf fällt');
});
