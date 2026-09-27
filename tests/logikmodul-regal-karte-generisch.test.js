'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — generische Regal-Karte für JEDES eingelassene logikModul
   (29.08.2026, "Generische Andockstelle für Fremdmodule")
   ────────────────────────────────────────────────────────────────────────
   Fund (beim Bau des Erbschein-EN-Mechanik-Belegs, Commit 7e1667d): ein
   zweites logikModul (andere id als 'erbschein-vorbereitung') hatte KEINEN
   echten Klickweg — `vorsorgeRegalHTML` iterierte nur die statische
   VORSORGE_MODULE-Liste, Erbscheins eigener Öffnen-Knopf
   (`erbscheinAuszugSektionHTML`) ist auf die literale DE-id hardcodiert.

   Report-before-Build (Architektur-Entscheidung) — Produktvorschlag
   bestätigt: "zwei Karten jetzt, Gruppierung später bei Bedarf". Dieser Test
   prüft GENAU das, mit dem EN-Mechanik-Testbundle als zweitem, unabhängigem
   Beispiel (nicht Erbschein selbst — dessen eigener, zusätzlicher Sonderfall
   bleibt unangetastet, s. erbschein-modul-mechanik.test.js).

   GEMESSEN, NICHT ANGENOMMEN — zwei Korrekturen beim Bau: (1) die Karte kann
   NICHT `data-` + `dokAusgabe.knopfAttr` wiederverwenden (dieselbe K8-Schleife,
   die Erbscheins eigenen Knopf verdrahtet) — Erbscheins Bundle setzt `knopfAttr`
   explizit auf seinen bestehenden Knopf; dieselbe Kennung auf der Karte ergäbe
   ZWEI Elemente mit demselben Selektor (Playwright: "strict mode violation:
   resolved to 2 elements", real reproduziert). Die Karte hat darum ihre EIGENE
   Verdrahtung über `data-modul-karte` (eigener kleiner Loop in
   verdrahteSektorAktionen). (2) Klick-Wiring/Overlay-Inhalt sind im Node-
   Sandkasten NICHT sinnvoll prüfbar — `document.querySelector` liefert dort
   IMMER ein Phantom-Element zurück, unabhängig vom tatsächlichen Markup (s.
   tests/load-kern.js, `makeEl()`); ein Test, der das nicht wüsste, wäre grün,
   auch wenn die Karte nie gerendert würde. Geprüft wird darum, was im
   Sandkasten ECHT ist (der von `vorsorgeRegalHTML` erzeugte HTML-STRING) — der
   echte Klick+Overlay-Beleg steht in
   tests/e2e/erbschein-en-mechanik-durchgang.spec.js (echter Browser).

   Rot-Beweis geführt: vor `logikModuleAlsKarten()` schlugen drei der fünf
   Proben fehl (keine Karte im Regal, keine zweite Karte neben Erbschein) —
   verifiziert, dann erst implementiert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const EN_BUNDLE_TEXT = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul-mechanik-en.json'), 'utf8');
const EN_MODUL_ID = 'erbschein-vorbereitung-mechanik-en';

async function frischOffenesDepot() {
  const { V, document } = ladeKern();
  await V.depotAnlegen('Regal-Karte-Generisch-2026!');
  return { V, document };
}

test('[Regal-Karte-Generisch] ein eingelassenes logikModul (andere id, kein Sonderfall) bekommt eine Regal-Karte', async () => {
  const { V } = await frischOffenesDepot();
  const r = V.modulEinlassen(EN_BUNDLE_TEXT, V.getData(), null, null);
  assert.equal(r.angenommen, true, r.grund || '');
  const html = V.vorsorgeRegalHTML('advanceCare');
  assert.match(html, new RegExp('data-modul-karte="' + EN_MODUL_ID + '"'), 'die Karte steht im Regal');
  assert.match(html, /Erbschein — Vorbereitungsauszug \(EN, Mechanik-Test\)/, 'trägt ihren eigenen Titel');
});

test('[Regal-Karte-Generisch] die Karte trägt KEIN dokAusgabe.knopfAttr — eigene Kennung, keine Kollision mit einem bundle-eigenen Knopf', async () => {
  const { V } = await frischOffenesDepot();
  V.modulEinlassen(EN_BUNDLE_TEXT, V.getData(), null, null);
  const html = V.vorsorgeRegalHTML('advanceCare');
  const ab = html.indexOf('data-modul-karte="' + EN_MODUL_ID + '"');
  const karteHtml = html.slice(html.lastIndexOf('<button', ab), html.indexOf('>', ab) + 1);
  assert.doesNotMatch(karteHtml, /data-erbschein-dokument-en-mechanik/,
    'das Bundle-eigene knopfAttr landet NICHT auf der Karte — s. Kopfkommentar, Kollisionsgefahr');
});

test('[Regal-Karte-Generisch] ohne Einlass erscheint keine Karte — kein Phantom-Eintrag', async () => {
  const { V } = await frischOffenesDepot();
  const html = V.vorsorgeRegalHTML('advanceCare');
  assert.doesNotMatch(html, new RegExp('data-modul-karte="' + EN_MODUL_ID + '"'));
});

test('[Regal-Karte-Generisch] „Auszug ansehen" als Status — ein Wegweiser-Auszug ist kein Instrument mit hat/hat-nicht', async () => {
  const { V } = await frischOffenesDepot();
  V.modulEinlassen(EN_BUNDLE_TEXT, V.getData(), null, null);
  const html = V.vorsorgeRegalHTML('advanceCare');
  const ab = html.indexOf('data-modul-karte="' + EN_MODUL_ID + '"');
  const karteHtml = html.slice(ab, html.indexOf('</button>', ab));
  assert.match(karteHtml, /Auszug ansehen/);
  assert.doesNotMatch(karteHtml, />keine</, 'kein "keine" an DIESER Karte — der Auszug fehlt nicht, er ist nur noch nicht angesehen');
});

test('[Regal-Karte-Generisch] zwei logikModule (DE-Erbschein + EN-Mechanik) — zwei getrennte Karten, keine Gruppierung (Produktentscheidung, 29.08.2026)', async () => {
  const { V } = await frischOffenesDepot();
  const DE_BUNDLE_TEXT = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8');
  V.modulEinlassen(DE_BUNDLE_TEXT, V.getData(), null, null);
  V.modulEinlassen(EN_BUNDLE_TEXT, V.getData(), null, null);
  const html = V.vorsorgeRegalHTML('advanceCare');
  assert.match(html, /data-modul-karte="erbschein-vorbereitung"/, 'DE-Karte (Erbscheins eigener Sonderfall bleibt daneben bestehen)');
  assert.match(html, new RegExp('data-modul-karte="' + EN_MODUL_ID + '"'), 'EN-Karte, generisch');
});
