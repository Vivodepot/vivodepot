'use strict';
/* ════════════════════════════════════════════════════════════════════════
   K1/K2 (VD CR, code-review-teil2-teil3-kennungs-kampagne-2026-09-15.md,
   Schwere HOCH) — Ratschen-Nachmessung durch -cf, 19.09.2026 (im
   Anschluss an EXP1, s. r3-befund-ratsche-durcharbeiten-2026-09-19.md:
   „teil2-teil3#K1/K2 … Migrationspfad Stufe 81, -cf exklusiv").

   BEIDE FUNDE SIND AM HEUTIGEN BESTAND BEREITS BEHOBEN, ohne dass diese
   Sitzung etwas gebaut hätte — die Kommentare an den Fundstellen (Zeile
   23130 „Code-Review K1 (15.09.2026)"; Zeile 42940) datieren die Reparatur
   selbst auf denselben Tag wie den Befund. Diese Proben sind darum reine
   Abnahme-Wächter gegen künftige Regressionen, kein neuer Bau — passend zum
   wiederkehrenden Muster, das die -3a-Sitzung für die Ratsche insgesamt
   gemessen hat („die weit überwiegende Mehrheit der 82 Funde war … bereits
   behoben").

   K1 · Die Sicherungskopie der Stufe 81 (`_migrationSicherung81`, alle
   Bereichswerte unter den alten Schlüsseln, UNGEFILTERT) verließ das Depot
   über `vollExportJSON({ sensibel: false })` — eine als sensibel markierte
   Angabe stand im „ohne sensible Daten"-Export im Klartext, nur unter der
   alten Kennung. Behoben: `vollExportJSON` löscht `_migrationSicherung81`
   UNBEDINGT (vor jeder Sensibel-Prüfung), vivodepot.html:23132.

   K2 · `bereichssatz` (Bereichsauswahl beim Anlegen) wurde von Stufe 81
   nicht umgeschrieben — ein Alt-Depot mit abgewählten Bereichen hätte nach
   dem Öffnen `bereicheAlle()` leer gefunden (Seitenleiste leer, jeder Wert
   unerreichbar, keine Meldung), ebenso ein frisches Depot, das einen alten
   Voll-Export mit `bereichssatz` einliest (`_vollDepotParsen` → `rest` →
   `importAnwenden`). Behoben: `_nebenablagenKennungenUmschreiben` schreibt
   `depot.bereichssatz` um (vivodepot.html:42940); `_vollDepotParsen` ruft
   `depotNormalisieren` bereits VOR der Übernahme in `rest` auf
   (vivodepot.html:24884), darum trifft der Fix auch den Einlese-Weg.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[K1] vollExportJSON({sensibel:false}) hält die Migrations-Sicherungskopie zurück — kein Klartext-Umweg für sensible Felder', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('k1-probe-2026-09-19');
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { nationality: 'GEHEIM-123' });
  d.schemaVersion = 80;
  V.depotNormalisieren(d);
  V.setData(d);
  const text = JSON.stringify(V.vollExportJSON({ sensibel: false }));
  assert.equal(text.includes('_migrationSicherung81'), false, 'die Sicherungskopie der Stufe 81 steht im Export, obwohl kein Import sie je mitnimmt');
  assert.equal(text.includes('GEHEIM-123'), false, 'der sensible Wert verlässt das Depot über den alten Schlüssel der Sicherungskopie');
});

test('[K2·Szenario A] ein Alt-Depot mit bereichssatz zeigt nach dem Öffnen weiterhin seine Bereiche', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('k2a-probe-2026-09-19');
  const d = V.getData();
  d.bereichssatz = ['identitaet', 'gesundheit'];
  d.schemaVersion = 80;
  V.depotNormalisieren(d);
  assert.deepEqual(d.bereichssatz.slice().sort(), ['health', 'identity'], 'bereichssatz trägt nach der Migration noch alte Kennungen');
  V.setData(d);
  assert.equal(V.bereicheAlle().length, 2, 'bereicheAlle() ist nach dem Öffnen leer — die Seitenleiste zeigte nichts, obwohl Werte da sind');
});

test('[K2·Szenario B] ein alter Voll-Export mit bereichssatz zeigt nach dem Einlesen weiterhin seine Bereiche', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('k2b-probe-2026-09-19');
  if (typeof V.akteurSelbstErklaeren === 'function') V.akteurSelbstErklaeren('Elisabeth');
  const altesExport = JSON.stringify({
    _typ: 'vivodepot-klartext-export',
    depot: {
      schemaVersion: 80,
      bereichssatz: ['identitaet', 'gesundheit'],
      sektoren: { identitaet: { vorname: 'Alt-Test' }, gesundheit: { blutgruppe: 'A+' } },
    },
  });
  const plan = V.importPlan('json', altesExport);
  assert.ok(plan && !plan.ungueltig, 'der eigene Einlesekanal lehnt den alten Voll-Export ab');
  V.importAnwenden(plan);
  const d = V.getData();
  assert.deepEqual(d.bereichssatz.slice().sort(), ['health', 'identity'], 'bereichssatz trägt nach dem Einlesen noch alte Kennungen');
  assert.equal(V.bereicheAlle().length, 2, 'bereicheAlle() ist nach dem Einlesen leer — die importierten Werte wären unerreichbar');
});

test('[K1·Rot-Beweis] dieselbe Probe SIEHT den sensiblen Wert, sobald sensibel:true gilt — der Test oben prüft also etwas', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('k1-positivkontrolle-2026-09-19');
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { nationality: 'GEHEIM-123' });
  V.setData(d);
  const text = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  assert.equal(text.includes('GEHEIM-123'), true, 'mit sensibel:true muss der Wert im Export stehen, sonst könnte die Probe oben nie rot werden');
});
