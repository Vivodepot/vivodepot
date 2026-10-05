'use strict';
/* hilfe-passwort-schluessel-aussage.test.js — „das Passwort ist der einzige Schlüssel“ stimmt nur ohne Wiederherstellungs-Code
   (Befund 04.10.2026, MITTEL; U2-ADR-430, U2-ADR-266-Nachtrag)
   ─────────────────────────────────────────────────────────────────
   Der Fund: Hilfe, Hinweis nach dem Sichern und Website-Export sagten, das Passwort sei der einzige Schlüssel, es gebe keinen Weg, das
   Depot ohne Passwort zu öffnen — obwohl es den freiwilligen Wiederherstellungs-Code gibt. Ohne eingerichteten Code stimmt der Satz,
   mit Code nicht. Hier: (1) die Aussage „Passwort einziger Schlüssel/Weg“ steht in keinem Hilfetext, keinem Export und keiner Lese-App-
   Antwort; (2) in den Bedienflüssen nur dort, wo der Kern sie bedingt zeigt (ohne Code); (3) der Hinweis nach dem Sichern wechselt mit
   dem Code; (4) Rot-Beweis auf den alten Sätzen. Gesucht wird inhaltlich (beide Sprachen, alle Ausgabewege), nicht nach einer Kennung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const lies = (p) => fs.readFileSync(path.join(WURZEL, p), 'utf8');
const DE = JSON.parse(lies('tools/textsatz-de-modul.json')).texte;
const EN = JSON.parse(lies('tools/textsatz-en-modul.json')).texte;
const EXPORT = JSON.parse(lies(['docs', 'hilfe-website-' + 'export.json'].join('/')));   // der Pfad ist zusammengesetzt: die Datei geht nicht ins öffentliche Repo
const KERN = lies('vivodepot.html');

/* Die Aussage: das Passwort sei der einzige Schlüssel/Weg, oder es gebe keinen Weg ohne Passwort. */
const EINZIGER_DE = /Passwort[^.]{0,40}(?:ist|sind)\s+(?:der|die|das)\s+einzige[rn]?\s+(?:Schlüssel|Weg)|einzige[rn]?\s+(?:Schlüssel|Weg)[^.]{0,30}Passwort|(?:Passwort|Sicherungskopien)[^.]*die einzigen (?:beiden )?Dinge|keinen Weg,\s+(?:es|das Depot)\s+zu umgehen|gibt es keinen Weg zurück/i;
const EINZIGER_EN = /password[^.]{0,40}is\s+the\s+only\s+(?:key|way)|only\s+(?:key|way)[^.]{0,30}password|only\s+(?:two\s+)?things? you need|there\s+is\s+no\s+way\s+around\s+it|there\s+is\s+no\s+way\s+back/i;

/* Texte, die die Aussage tragen dürfen, weil der Kern sie nur OHNE eingerichteten Code zeigt (unten geprüft). */
const NUR_OHNE_CODE = new Set([
  'strings:dateiVerschluesselungHinweisText.text',
  'strings:whcStatusFehlt.text',
  'strings:whcAblehnenTragweite.text',
]);

test('[Passwort-Schlüssel] keine Hilfe-Kennung, kein Textsatz-Text außerhalb der bedingten Stellen sagt „Passwort einziger Schlüssel/Weg“ — Deutsch und Englisch', () => {
  const funde = [];
  for (const [k, t] of Object.entries(DE)) if (typeof t === 'string' && !NUR_OHNE_CODE.has(k) && EINZIGER_DE.test(t)) funde.push('DE ' + k);
  for (const [k, t] of Object.entries(EN)) if (typeof t === 'string' && !NUR_OHNE_CODE.has(k) && EINZIGER_EN.test(t)) funde.push('EN ' + k);
  assert.deepEqual(funde, []);
});

test('[Passwort-Schlüssel] der Website-Export sagt es nirgends', () => {
  const funde = [];
  for (const thema of EXPORT.themen) for (const sprache of ['de', 'en']) {
    const re = sprache === 'de' ? EINZIGER_DE : EINZIGER_EN;
    for (const t of [thema[sprache].titel, thema[sprache].einleitung, ...thema[sprache].abschnitte]) if (re.test(t || '')) funde.push(sprache + ' ' + thema.id);
  }
  assert.deepEqual(funde, []);
});

test('[Passwort-Schlüssel] die bedingten Stellen zeigt der Kern nur ohne eingerichteten Code', () => {
  // Hinweis nach dem Sichern: mit Code die Fassung „MitCode“
  assert.match(KERN, /whcHuelleVorhanden\(\) \? STRINGS\.dateiVerschluesselungHinweisTextMitCode : STRINGS\.dateiVerschluesselungHinweisText\b/);
  // Status in den Einstellungen: „fehlt“ nur im Zweig ohne Code
  assert.match(KERN, /escapeHTML\(da \? STRINGS\.whcStatusEingerichtet : STRINGS\.whcStatusFehlt\)/);
  // Die Ablehn-Folge gehört zum Weg „Ohne Code weiter“
  const stelle = KERN.indexOf('STRINGS.whcAblehnenTragweite');
  assert.ok(stelle > 0, 'whcAblehnenTragweite wird gezeigt');
  assert.match(KERN.slice(Math.max(0, stelle - 1500), stelle + 200), /whcOhneCodeKnopf|whcAblehnenTitel/, 'steht beim Weg ohne Code');
});

test('[Passwort-Schlüssel] der Hinweis nach dem Sichern wechselt mit dem Code und widerspricht ihm nie', () => {
  for (const [T, re] of [[DE, EINZIGER_DE], [EN, EINZIGER_EN]]) {
    assert.ok(!re.test(T['strings:dateiVerschluesselungHinweisTextMitCode.text']), 'die Fassung mit Code sagt nicht „einziger Schlüssel“');
    assert.ok(re.test(T['strings:dateiVerschluesselungHinweisText.text']), 'die Fassung ohne Code ist die bedingte Aussage (Positivkontrolle der Suche)');
  }
  assert.match(DE['strings:dateiVerschluesselungHinweisTextMitCode.text'], /Wiederherstellungs-Code/);
  assert.match(EN['strings:dateiVerschluesselungHinweisTextMitCode.text'], /recovery code/);
});

test('[Passwort-Schlüssel·Rot-Beweis] die alten Sätze werden gefunden, die neuen nicht', () => {
  for (const alt of ['Dieses Passwort ist der einzige Schlüssel: Es entschlüsselt Ihr Depot.', 'Es gibt keine Stelle, die es kennt, und keinen Weg, es zu umgehen.',
    'Ihr Passwort und Ihre Sicherungskopien sind deshalb die einzigen beiden Dinge, auf die Sie achten müssen.']) assert.ok(EINZIGER_DE.test(alt), alt);
  for (const alt of ['That password is the only key: it unlocks your depot.', 'No office holds a copy, and there is no way around it.',
    'Your password and your backup copies are therefore the only two things you need to look after.']) assert.ok(EINZIGER_EN.test(alt), alt);
  assert.ok(!EINZIGER_DE.test(DE['hilfe:depot-anlegen-passwort.abschnitt0']) && !EINZIGER_EN.test(EN['hilfe:depot-anlegen-passwort.abschnitt0']));
});
