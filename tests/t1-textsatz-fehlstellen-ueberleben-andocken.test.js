'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   t1-textsatz-fehlstellen-ueberleben-andocken.test.js — Rot-Beweis für T-1
   (Code-Review vom 16.09.2026, in der
   Befund-Ratsche 18./19.09.2026 nachgetragen).

   `_textsatzAufSektorenAnwenden(liste, tun)` leert TEXTSATZ_FEHLSTELLEN nur,
   wenn `tun` NICHT übergeben wird ("nur der Bau-Lauf ohne tun leert die
   Fehlstellen"). Zwei Andock-Aufrufstellen zur LAUFZEIT (nach dem Boot) —
   `buergermodulSektorErsetzen` und `_bereichAusBuendelErzeugen` — riefen die
   Funktion bis hierher OHNE `tun` auf. Jeder Andock-Vorgang leerte damit
   TEXTSATZ_FEHLSTELLEN und füllte es nur für den EINEN gerade angedockten
   Sektor neu — jede vorher für andere (native oder früher angedockte)
   Sektoren gemessene Fehlstelle ging verloren, ohne dass ein bestehender
   Test das gemerkt hätte (der einzige Wächter, `tests/textsatz-mechanismus.
   test.js`, prüft nur den Boot-Zustand direkt nach `ladeKern()`).

   Fix: beide Aufrufstellen übergeben jetzt `_TEXTSATZ_FUELLEN` explizit als
   `tun` — derselbe Füll-Lauf, der ohnehin als Rückfall gälte, aber OHNE den
   Leer-Zweig auszulösen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Baut Modul-Defs aus dem NATIVEN Bestand selbst, damit `buergermodulSektorErsetzen`
// tatsaechlich etwas annimmt (topLevel.length > 0) und bis zur Textsatz-Aufrufstelle am
// Ende der Funktion durchlaeuft — mit leerem `moduleDefs` kehrt sie vorher zurueck
// ("nichts-angenommen") und die Aufrufstelle wird nie erreicht (dieselbe Form wie
// tests/buergermodul-sektor-ersetzen.test.js#bauModuleDefsAusNativ).
function bauModuleDefsAusNativ(V, sektorId) {
  const sektor = V.SEKTOR_BY_ID[sektorId];
  const defs = [];
  for (const sek of sektor.sektionen) {
    for (const f of sek.felder) {
      const feld = Object.assign({}, f);
      delete feld.label; delete feld.unterFelder;
      defs.push({ sektorId, sektionId: sek.id, feldId: f.id, unterVon: null, feld });
    }
  }
  return defs;
}

test('[T-1·Rot-Beweis] buergermodulSektorErsetzen leert TEXTSATZ_FEHLSTELLEN nicht mehr', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('t1-guard-2026!');
  // Eine echte Fehlstelle vor dem Andocken erzeugen, damit es etwas zu verlieren gibt:
  // ein frei erfundener Sektor mit einer Sektion ohne Textsatz-Eintrag.
  const geist = { id: '_t1_geist', sektionen: [{ id: 'geist_sek', felder: [] }] };
  V._textsatzAufSektorenAnwenden([geist]);
  const vorher = V.TEXTSATZ_FEHLSTELLEN.length;
  assert.ok(vorher > 0, 'Vorbedingung: der erfundene Geist-Sektor muss selbst schon eine Fehlstelle erzeugen');

  const defs = bauModuleDefsAusNativ(V, 'assets');
  const ergebnis = V.buergermodulSektorErsetzen('assets', defs);
  assert.ok(ergebnis.angewandt, 'Vorbedingung: der Ersatz muss wirklich angenommen werden, sonst wird die Ziel-Aufrufstelle nie erreicht');

  assert.ok(V.TEXTSATZ_FEHLSTELLEN.length >= vorher,
    'TEXTSATZ_FEHLSTELLEN ist nach dem Andocken kleiner als vorher — die Fehlstelle des Geist-Sektors ' +
    'wurde beim Andocken stillschweigend geleert, statt erhalten zu bleiben');
});

test('[T-1·Rot-Beweis] die Aufrufstelle übergibt tun explizit — Quelltext-Beleg', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(quelle, /_textsatzAufSektorenAnwenden\(\[sektor\], _TEXTSATZ_FUELLEN\)/,
    'buergermodulSektorErsetzen ruft _textsatzAufSektorenAnwenden ohne tun auf — TEXTSATZ_FEHLSTELLEN würde beim Andocken geleert');
  assert.match(quelle, /_textsatzAufSektorenAnwenden\(\[neu\], _TEXTSATZ_FUELLEN\)/,
    '_bereichAusBuendelErzeugen ruft _textsatzAufSektorenAnwenden ohne tun auf — TEXTSATZ_FEHLSTELLEN würde beim Andocken geleert');
});
