'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Modul-Vollständigkeit, Zug 1a (27.08.2026) — acht Render-Bypass-Stellen
   ────────────────────────────────────────────────────────────────────────────
   Vorprüfung für ein englisches Bürgermodul (U2-ADR-112-Nachtrag) fand acht
   Stellen, die deutschen Text hartkodiert rendern statt über STRINGS/textLesen
   — keines davon war je durch ein angedocktes Sprachmodul überschreibbar.
   Diese Proben halten fest, dass jede Stelle jetzt über STRINGS läuft, UND
   (Rot-Beweis-Charakter) dass der sichtbare deutsche Standardtext dabei exakt
   derselbe bleibt wie vorher — reine Quelle-wechseln-ohne-Wirkungsänderung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Zug 1a·1] Dokument-Signaturblock: Überschrift + Ort-Datum-Zeile laufen über STRINGS', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw'); V.akteurSelbstErklaeren('Tester');
  const html = V.dokumentHTML('patientenverfuegung');
  assert.match(html, /<h2>Ort, Datum, Unterschrift<\/h2>/, 'Überschrift fehlt oder Wortlaut geändert');
  assert.match(html, /Ort, Datum:&nbsp;/, 'Ort-Datum-Zeile fehlt');
  assert.match(html, /Unterschrift:&nbsp;/, 'Unterschriftszeile fehlt');
  assert.equal(V.STRINGS.dokSigAbschnittTitel, 'Ort, Datum, Unterschrift');
  assert.equal(V.STRINGS.dokOrtDatumLabel, 'Ort, Datum');
  assert.equal(V.STRINGS.unterschriftLabel, 'Unterschrift');
});

test('[Zug 1a·1b] Vollmacht-Dokument trägt beide Unterschriftszeilen (Vollmachtnehmerin/-geberin) über STRINGS', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw'); V.akteurSelbstErklaeren('Tester');
  const eintrag = V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney' });
  const html = V.dokumentHTML('vorsorgevollmacht', eintrag.id);
  assert.match(html, /Unterschrift der Vollmachtnehmerin\/des Vollmachtnehmers:&nbsp;/);
  assert.match(html, /Unterschrift der Vollmachtgeberin\/des Vollmachtgebers:&nbsp;/);
});

test('[Zug 1a·2] "Meine Menschen"-Register: "+ Person hinzufügen" läuft über STRINGS.refmPersonHinzufuegen', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw'); V.akteurSelbstErklaeren('Tester');
  V.oeffneSektor('people');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /data-person-hinzufuegen="1">\+ Person hinzufügen</);
  assert.equal(V.STRINGS.refmPersonHinzufuegen, 'Person hinzufügen');
});

/* Der Test-Sandkasten (tests/load-kern.js) baut per `document.createElement` nur ein sehr
   schmales Stub-Element (innerHTML/textContent/value/checked/className) — kein echtes
   setAttribute/getAttribute. Ein Live-DOM-Test der drei statischen Hüllen-Texte scheitert
   darum nicht an der Quelle, sondern am Stub selbst — Quellprüfung ist hier die verlässlichere
   Probe (dieselbe Technik wie Zug 1a·7 oben). */
test('[Zug 1a·3-6] die vier statischen Hüllen-Texte laufen jetzt über STRINGS, nicht mehr über ein hartkodiertes Literal', () => {
  const { src } = ladeKern();
  assert.match(src, /menue\.setAttribute\('aria-label', offen \? STRINGS\.menueSchliessenLabel : STRINGS\.menueOeffnenLabel\)/,
    'setzeMenueKnopf ist nicht auf STRINGS umgestellt');
  assert.match(src, /a11yLeiste\.setAttribute\('aria-label', STRINGS\.a11yLeisteLabel\)/,
    '.tb-a11y-Sync fehlt oder ist nicht auf STRINGS umgestellt');
  assert.match(src, /swUpdateNeu\.textContent = STRINGS\.swUpdateNeuLadenCta/,
    '#sw-update-neu-Sync fehlt oder ist nicht auf STRINGS umgestellt');
  assert.doesNotMatch(src, /'aria-label', offen \? 'Menü schließen' : 'Menü öffnen'\)/,
    'das alte hartkodierte Literal-Paar darf nicht mehr existieren');
});

test('[Zug 1a·7] STRINGS trägt die drei refSubPicker-Wortlaute (Quelle enthält keine hartkodierten Literale mehr)', () => {
  const { V, src } = ladeKern();
  assert.equal(V.STRINGS.refmSubNamePlatzhalter, 'Name der Person');
  assert.equal(V.STRINGS.refmSubGeburtsjahrPlatzhalter, 'Geburtsjahr (falls Tag unbekannt)');
  assert.equal(V.STRINGS.refmSubGeburtsdatumLabel, 'Geburtsdatum');
  assert.doesNotMatch(src, /const platzhalter = 'Name der Person'/,
    'die alte hartkodierte Zeile darf nicht mehr existieren');
  assert.doesNotMatch(src, /placeholder="Geburtsjahr \(falls Tag unbekannt\)"/,
    'der alte hartkodierte Placeholder darf nicht mehr existieren');
  assert.doesNotMatch(src, /aria-label="Geburtsdatum"/,
    'das alte hartkodierte aria-label darf nicht mehr existieren');
});
