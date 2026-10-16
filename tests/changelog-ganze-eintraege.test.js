'use strict';
/* ═══════════════════════════════════════════════════════════
   CHANGELOG: nur ganze Einträge, und jeder Sicherheitshinweis behält seine Handlungszeile (14.10.2026).

   Anlass: Beim Zusammenführen eines Zugs rutschten vierzehn Zeilen „Was zu tun ist: …“ aus den Abschnitten der Fassungen
   v799 bis v928 als abgerissene Satzreste unter [Unreleased]; den Hinweisen VD-SEC-001 bis -018 fehlte danach in ihrem
   Abschnitt die Handlungszeile. Git meldet so etwas nicht als Konflikt, und der CHANGELOG wird mit jeder Fassung öffentlich.

   Zwei Regeln, über die ganze Datei:
     1. Jede eingerückte Fortsetzungszeile steht unter einem Listenpunkt (nicht nach einer Leerzeile oder Überschrift),
        und keine Überschrift „### …“ steht in einem Abschnitt zweimal.
     2. Jeder Sicherheitshinweis „- VD-SEC-nnn …“ im Abschnitt einer Fassung trägt seine Zeile „Was zu tun ist:“.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CHANGELOG = path.join(__dirname, '..', 'CHANGELOG.md');

function abschnitte(text) {
  return text.split(/^(?=## \[)/m).filter((a) => a.startsWith('## [')).map((a) => ({ kopf: a.split('\n', 1)[0], text: a }));
}

function ganzeEintraegeBefunde(text) {
  const befunde = [];
  for (const { kopf, text: a } of abschnitte(text)) {
    let vor = null;
    const ueberschriften = new Set();
    a.split('\n').slice(1).forEach((z, i) => {
      if (!z.trim()) { vor = 'leer'; return; }
      if (z.startsWith('### ')) {
        if (ueberschriften.has(z)) befunde.push(kopf + ' · doppelte Überschrift ' + z);
        ueberschriften.add(z); vor = 'ueberschrift'; return;
      }
      if (z.startsWith('- ')) { vor = 'punkt'; return; }
      if (z.startsWith('  ')) {
        if (vor !== 'punkt' && vor !== 'fortsetzung') befunde.push(kopf + ' · Zeile ' + (i + 2) + ' ohne Listenpunkt: ' + z.trim().slice(0, 60));
        vor = 'fortsetzung'; return;
      }
      vor = 'text';
    });
  }
  return befunde;
}

function handlungszeileFehlt(text) {
  const raus = [];
  for (const { kopf, text: a } of abschnitte(text)) {
    if (/\[Unreleased\]/.test(kopf)) continue;
    for (const p of a.split(/^(?=- )/m)) {
      const nr = /^- (VD-SEC-\d{3})\b/.exec(p);
      if (nr && !p.includes('Was zu tun ist:')) raus.push(kopf.slice(3) + ' · ' + nr[1]);
    }
  }
  return raus;
}

test('[CHANGELOG·ganze Einträge] jede Fortsetzung steht unter einem Punkt, keine Überschrift doppelt im Abschnitt', () => {
  const text = fs.readFileSync(CHANGELOG, 'utf8');
  assert.ok(abschnitte(text).length > 10, 'Vorbedingung: die Abschnitte werden gelesen');
  assert.deepEqual(ganzeEintraegeBefunde(text), []);
});

test('[CHANGELOG·Sicherheit] jeder Sicherheitshinweis einer Fassung trägt seine Handlungszeile', () => {
  const text = fs.readFileSync(CHANGELOG, 'utf8');
  assert.ok((text.match(/^- VD-SEC-\d{3}/gm) || []).length >= 10, 'Vorbedingung: die Sicherheitshinweise werden gefunden');
  assert.deepEqual(handlungszeileFehlt(text), []);
});

// Rot-Beweis: die Form des Schadens vom 14.10.2026, nachgebaut.
const BESCHAEDIGT = [
  '## [Unreleased]', '', '### Behoben', '- Eine Modul-App startet ohne Netz.', '',
  '  Was zu tun ist: auf v928 aktualisieren. Ab v928 zeigt die Kachel den Titel als Text, und die',
  '  Was zu tun ist: auf v923 aktualisieren.',
  '### Behoben', '- Der Lauf bricht nicht mehr ab.', '',
  '## [v1.0.928] – 2026-10-13', '', '### Sicherheit',
  '- VD-SEC-016 (kritisch): Behoben in v928: Eine Kachel setzte ihren Titel roh.',
  '  Betroffen: die ausgelieferten Fassungen seit v922 bis v927.', '',
].join('\n');

test('[CHANGELOG·Rot-Beweis] abgerissene Handlungszeilen unter [Unreleased] und ein Hinweis ohne Handlungszeile fallen auf', () => {
  const b = ganzeEintraegeBefunde(BESCHAEDIGT);
  assert.ok(b.some((x) => /ohne Listenpunkt: Was zu tun ist: auf v928/.test(x)), b.join(' | '));
  assert.ok(b.some((x) => /doppelte Überschrift ### Behoben/.test(x)), b.join(' | '));
  assert.deepEqual(handlungszeileFehlt(BESCHAEDIGT), ['[v1.0.928] – 2026-10-13 · VD-SEC-016']);
});

