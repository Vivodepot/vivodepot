'use strict';
/* Hilfe für die Empfängerin in der Lese-App (U2-ADR-425, 20.09.2026, „Hilfe in der Datei").
   Vier feste Fragen — kein eigenes Register wie im Kern, `strings:`-Kennungen wie jeder Bedienfluss-Text
   dieser Datei (kein dritter Weg). die Redaktion hat alle vier Antworten geliefert; der Knopf `#btn-hilfe`
   in der Topbar tauscht `#content` dagegen — derselbe Ersetzungsweg wie ein Sidebar-Klick. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');

const LESEN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');

const VIER_FRAGEN = ['wasIstDas', 'wasKannIchTun', 'werHatEsGeschickt', 'wasPassiertMitMeinenDaten'];

test('[Hilfe-Lesen·Struktur] genau die vier vereinbarten Fragen', () => {
  const { V } = ladeLesen();
  assert.equal(Array.from(V.HILFE_LESEN_FRAGEN).join(','), VIER_FRAGEN.join(','));
});

test('[Hilfe-Lesen·Inhalt] mit den gelieferten Antworten trägt das Modell alle vier Fragen, nichts leer', () => {
  const { V } = ladeLesen();
  const modell = V.hilfeEmpfaengerinModell();
  assert.equal(modell.length, 4);
  for (const f of modell) {
    assert.ok(f.frage && f.frage.length > 0, f.id + ': Frage fehlt');
    assert.ok(f.antwort && f.antwort.length > 0, f.id + ': Antwort fehlt');
  }
});

test('[Hilfe-Lesen·Rendering] die Übersicht zeigt Titel und alle vier Fragen-Blöcke mit Antwort', () => {
  const { V } = ladeLesen();
  const html = V.hilfeEmpfaengerinHTML();
  assert.match(html, /<h1>Hilfe<\/h1>/);
  assert.equal((html.match(/hilfe-frage/g) || []).length, 4, 'alle vier Fragen müssen erscheinen, keine ausgelassen');
  assert.match(html, /Sie sehen eine Zusammenstellung/, 'die Antwort zu wasIstDas muss im Text stehen');
});

test('[Hilfe-Lesen·Aktivierung] die Topbar trägt den Hilfe-Knopf, verdrahtet auf den Tausch von #content', () => {
  assert.match(LESEN_QUELLE, /id="btn-hilfe"/, 'der Knopf muss in topbarHTML erscheinen');
  assert.match(LESEN_QUELLE, /el\('btn-hilfe'\)[\s\S]{0,300}hilfeEmpfaengerinHTML\(\)/,
    'wireTopbar muss #content auf hilfeEmpfaengerinHTML() setzen, kein toter Knopf');
});

test('[Hilfe-Lesen·EN] jede Frage UND Antwort hat eine englische Fassung, eigenständig geschrieben (_STRINGS_EINGEBAUT/LESE_TEXTE_EN-Parität, bestehender Wächter deckt es)', () => {
  const { V } = ladeLesen();
  for (const id of VIER_FRAGEN) {
    const frageSchluessel = 'hilfeEmpfaengerinFrage_' + id;
    const antwortSchluessel = 'hilfeEmpfaengerinAntwort_' + id;
    assert.ok(Object.prototype.hasOwnProperty.call(V.LESE_TEXTE_EN, frageSchluessel), frageSchluessel + ' fehlt in LESE_TEXTE_EN');
    assert.ok(V.LESE_TEXTE_EN[antwortSchluessel] && V.LESE_TEXTE_EN[antwortSchluessel].length > 0, antwortSchluessel + ' fehlt oder ist leer in LESE_TEXTE_EN');
  }
  assert.ok(Object.prototype.hasOwnProperty.call(V.LESE_TEXTE_EN, 'hilfeEmpfaengerinTitel'));
});

/* Dieselbe Ratsche wie tests/hilfe-kapitel.test.js, hier für die vier Lese-App-Antworten
   (Fund, 20.09.2026, nach dem EN-Fund im Kern) — gemessen: null Treffer, also kein zweiter
   Fundort derselben Ingest-Fehlerklasse. */
const VERDAECHTIG = /(^|\s)#{1,6}\s|\*\*|(^|\s)---(\s|$)/;

test('[Hilfe-Lesen·Ratsche] keine Antwort trägt eine mitkopierte Markdown-Überschrift oder Trennlinie aus der Quelldatei', () => {
  const { V } = ladeLesen();
  const gefunden = [];
  for (const id of VIER_FRAGEN) {
    const de = V.STRINGS['hilfeEmpfaengerinAntwort_' + id];
    const en = V.LESE_TEXTE_EN['hilfeEmpfaengerinAntwort_' + id];
    if (VERDAECHTIG.test(de)) gefunden.push('DE ' + id);
    if (VERDAECHTIG.test(en)) gefunden.push('EN ' + id);
  }
  assert.deepEqual(gefunden, [], 'mitkopierte Markdown-Reste: ' + gefunden.join(', '));
});

test('[Hilfe-Lesen·Ratsche·Rot-Beweis] die Erkennung schlägt an gepflanzten Markdown-Resten an und lässt sauberen Text durch', () => {
  assert.ok(VERDAECHTIG.test('Text\n## Eine Überschrift aus der Quelldatei'), 'eine mitkopierte Überschrift muss auffallen');
  assert.ok(VERDAECHTIG.test('Ein **fetter** Rest'), 'ein Markdown-Fettdruck muss auffallen');
  assert.ok(VERDAECHTIG.test('oben --- unten'), 'eine mitkopierte Trennlinie muss auffallen');
  assert.ok(!VERDAECHTIG.test('Ihre Datei enthält Ihre Angaben. Nur Sie können sie öffnen — mit Ihrem Passwort.'), 'sauberer Text bleibt unbeanstandet (Gegenprobe)');
});
