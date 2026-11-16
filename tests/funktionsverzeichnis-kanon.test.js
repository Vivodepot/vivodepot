'use strict';
/* Probe am Kanon zu tools/funktionsverzeichnis-erheben.js (Lücke der Verteiler-Stellen, Inventur 14.11.2026).
   ROT-BEWEIS: die Stellen renderContentInner und renderSektor lieferten 0 Einträge; die Probe liest die Stelle
   aus dem Quelltext des Repos und verlangt Aufrufe. Der gepflanzte Fall entfernt alle Aufrufe; das Werkzeug muss dann
   den Hinweis „Messung unvollständig“ setzen (nicht still 0). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require(path.join(__dirname, '..', 'tools', 'funktionsverzeichnis-erheben.js'));

const KANON = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Funktionsverzeichnis·Kanon] renderContentInner liefert die Verteilungen (Aufrufe), nicht 0', () => {
  const s = W.messeStelle(KANON, 'renderContentInner');
  assert.ok(s.eintraege.length > 0, 'keine Einträge');
  const namen = s.eintraege.map((e) => e.kennung);
  assert.ok(namen.includes('renderNotfall'), 'renderNotfall fehlt');
  assert.ok(namen.includes('renderEintragenUebersicht'), 'renderEintragenUebersicht fehlt');
});

test('[Funktionsverzeichnis·Kanon] renderSektor liefert die Verdrahtungs-Aufrufe und den Laufzeit-Hinweis', () => {
  const s = W.messeStelle(KANON, 'renderSektor');
  const namen = s.eintraege.map((e) => e.kennung);
  assert.ok(namen.includes('verdrahteSektorAktionen'), 'verdrahteSektorAktionen fehlt');
  assert.ok(s.hinweis && /Laufzeit/.test(s.hinweis), 'Laufzeit-Hinweis fehlt');
});

test('[Funktionsverzeichnis·Kanon·Rot-Beweis] ohne Aufrufe in der Stelle wird der Lücken-Hinweis gesetzt, nicht still 0', () => {
  const gepflanzt = 'function renderContentInner() {\n  const x = 1;\n}\n';
  const s = W.messeStelle(gepflanzt, 'renderContentInner');
  assert.equal(s.eintraege.length, 0);
  assert.match(s.hinweis, /Messung unvollständig/);
});
