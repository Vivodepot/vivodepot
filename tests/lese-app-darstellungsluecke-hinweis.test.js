'use strict';
/* ════════════════════════════════════════════════════════════════════════
   LA1 (DoD-Schlußmessung Punkt 4, 19.09.2026) — „Ein Rest steht offen:
   „Hinweis auf nicht Darstellbares: KEINER"." (dod-v1-schlussmessung-2026-09-18.md)

   Die Lese-App gab bis hierhin keinen sichtbaren Hinweis, wenn eine Datei einen
   Bereich oder eine Erweiterung trägt, die diese Anwendung nicht kennt bzw. nicht
   einlesen konnte — nicht leer, sondern schlicht abwesend, ohne Spur (U2-ADR-145:
   „ein Hinweis ohne Anlass ist Rauschen", hier umgekehrt: ein Anlass ohne Hinweis
   ist eine Lücke). Der Fix: `_darstellungsLuecken()` (vivodepot-lesen.html, direkt
   vor `sidebarHTML()`) liest zwei bereits vorhandene Quellen — `data.sektoren`
   gegen `bereicheAlleLesen()` (unbekannte Bereiche) und `BEREICHS_MODUL_VERWORFEN_LESEN`
   (verworfene Bereichs-Module) — und `_lueckenBlockHTML()` rendert daraus einen
   bedingten Block, der `sidebarHTML()` voranschließt, damit `tools/lese-app-
   bereichsluecke-messen.js` ihn ohne eigene Änderung über die bestehende
   `ganzeSicht`-Erhebung (sidebar + alleSektorenHTML) sieht.

   Der Wortlaut ist bewusst so gewählt, dass er die Stichworte trifft, die jenes
   Werkzeug bereits sucht (`nicht darstellen`/`nicht dargestellt`) — kein Zufall,
   das ist der Vertrag zwischen Fund und Probe.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

test('[LA1] ein unbekannter Bereich in data.sektoren erzeugt einen sichtbaren Hinweis', () => {
  const { V } = ladeLesen();
  V.setData({ sektoren: { 'unbekannter-bereich-xyz': { feld1: 'wert' }, identitaet: {} } });
  const luecken = V._darstellungsLuecken();
  assert.equal(luecken.bereichIds.length, 1);
  assert.equal(luecken.bereichIds[0], 'unbekannter-bereich-xyz');
  assert.equal(luecken.modulAnzahl, 0);
  const sb = V.sidebarHTML();
  assert.ok(sb.includes('luecken-hinweis'), 'der Block steht in der Sidebar');
  assert.ok(sb.includes('nicht darstellen'), 'trifft das Stichwort aus lese-app-bereichsluecke-messen.js');
  assert.ok(sb.includes('unbekannter-bereich-xyz'), 'nennt die Kennung, nicht nur eine Zahl');
});

test('[LA1] ein verworfenes Bereichs-Modul erzeugt einen sichtbaren Hinweis', () => {
  const { V } = ladeLesen();
  V.setData({ sektoren: { identitaet: {} }, bereichsModule: [
    /* moduleVersion 0 ist ungültig, und das Modul TRÄGT einen Bereich: es geht etwas verloren. (Bis 22.09.2026 stand hier
       `bereiche: {}`, ein leeres Modul; das ist nach der Grenze „nur Verluste zählen" kein Anlass mehr, s.
       tests/lese-app-stumme-zurueckweisung.test.js.) */
    { modulTyp: 'bereich', moduleVersion: 0, herkunft: 'kaputt', bereiche: { 'x-bereich': { label: 'X' } } },
  ] });
  V._foldVollmachtenLesen(V.getData());
  assert.equal(V.BEREICHS_MODUL_VERWORFEN_LESEN.length, 1, 'Vorbedingung: das Modul wurde wirklich verworfen');
  const sb = V.sidebarHTML();
  assert.ok(sb.includes('luecken-hinweis'));
  assert.ok(sb.includes('nicht dargestellt'), 'trifft das Stichwort aus lese-app-bereichsluecke-messen.js');
});

test('[LA1] beide Lücken zugleich ergeben den zusammengesetzten Satz', () => {
  const { V } = ladeLesen();
  V.setData({ sektoren: { 'unbekannter-bereich-abc': { f: 1 }, identitaet: {} }, bereichsModule: [
    { modulTyp: 'bereich', moduleVersion: 0, herkunft: 'kaputt2', bereiche: { 'y-bereich': { label: 'Y' } } },
  ] });
  V._foldVollmachtenLesen(V.getData());
  const luecken = V._darstellungsLuecken();
  assert.equal(luecken.bereichIds.length, 1);
  assert.equal(luecken.bereichIds[0], 'unbekannter-bereich-abc');
  assert.equal(luecken.modulAnzahl, 1);
  const satz = V._lueckenBlockHTML(luecken);
  assert.ok(satz.includes('unbekannter-bereich-abc') && satz.includes('1 Erweiterung'));
});

test('[LA1·Gegenprobe] ohne Anlass bleibt die Sidebar ohne Hinweis (U2-ADR-145)', () => {
  const { V } = ladeLesen();
  V.setData({ sektoren: { identitaet: {} } });
  V._foldVollmachtenLesen(V.getData());
  const luecken = V._darstellungsLuecken();
  assert.equal(luecken.bereichIds.length, 0);
  assert.equal(luecken.modulAnzahl, 0);
  assert.equal(V._lueckenBlockHTML(luecken), '', 'ein Hinweis ohne Anlass ist Rauschen');
  const sb = V.sidebarHTML();
  assert.ok(!sb.includes('luecken-hinweis'), 'kein Schalter, kein Rest-Markup ohne Anlass');
});
