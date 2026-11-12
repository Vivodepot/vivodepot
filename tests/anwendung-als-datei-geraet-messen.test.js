'use strict';
/* Das Messwerkzeug für „Anwendung als Datei erhalten“ am Gerät (Teil C Nr. 28): der reine Teil — Dateiname gegen Stand,
   das Kriterium „heil“ und die Schlusszeile. Der Browser-Teil läuft als Werkzeug (ohne Argument gegen das Fixture im Repo). */
const test = require('node:test');
const assert = require('node:assert');
const M = require('../tools/lib/anwendung-als-datei-urteil.js');

const KERN = "const SCHALEN_STAND = 'v1046';   // Kommentar";
const heilM = { app: 1, hinweisKopie: 0, knoepfeSichtbar: 3, seitenfehler: [], netzVersuche: 0 };

test('[Gerät·Name] der Dateiname trägt den Stand der Datei; ein anderer Stand oder ein fremder Name fällt durch', () => {
  assert.deepEqual(M.nameUrteil('vivodepot-privat-de-v1046.html', KERN), { ok: true, kennung: 'privat-de', stand: 'v1046' });
  assert.equal(M.nameUrteil('vivodepot-privat-de-v1045.html', KERN).ok, false);
  assert.equal(M.nameUrteil('vivodepot.html', KERN).ok, false);
  assert.equal(M.nameUrteil('vivodepot-privat-de-v1046.html', '<html>').ok, false);
});

test('[Gerät·heil] jedes der fünf Kriterien allein macht die Datei unheil', () => {
  assert.equal(M.heil(heilM), true);
  for (const kaputt of [{ app: 0 }, { app: 2 }, { hinweisKopie: 1 }, { knoepfeSichtbar: 0 }, { seitenfehler: ['x'] }, { netzVersuche: 1 }]) {
    assert.equal(M.heil({ ...heilM, ...kaputt }), false, JSON.stringify(kaputt));
  }
});

test('[Gerät·Schluss] grün nur mit heilem Online-Download, ohne falschen Download offline und mit greifendem Rot-Beweis', () => {
  const gut = { online: { ok: true }, dateiHeil: true, offline: { ok: true }, rotBeweis: true };
  const s = M.schluss([gut, gut]);
  assert.equal(s.ok, true);
  assert.equal(s.zeile, 'heil online: ja · offline: kein falscher Download · rot-beweis: ja');
  assert.equal(M.schluss([gut, { ...gut, offline: { ok: false, download: true } }]).ok, false);
  assert.equal(M.schluss([{ ...gut, rotBeweis: false }]).ok, false);
  assert.equal(M.schluss([{ ...gut, dateiHeil: false }]).ok, false);
  assert.equal(M.schluss([]).ok, false, 'ohne Messung kein Grün');
});

test('[Gerät·Argumente] ohne Argument das Fixture, beide Browser', () => {
  assert.deepEqual(M.argumente([]), { adresse: null, browser: ['chromium', 'webkit'], ausgabe: null });
  assert.deepEqual(M.argumente(['--adresse', 'https://x.example/', '--browser', 'webkit']).browser, ['webkit']);
});
