'use strict';
/* ═══════════════════════════════════════════════════════
   Erbschein-Vorbereitungsauszug — Ab-Werk-Einlass (U2-ADR-288), seit Schema 87 als Template im Rezept
   ───────────────────────────────────────────────────────
   WOZU (05.09.2026). Seit dem Siebtes-Register-Umbau (27.08.2026) erreichte das Erbschein-Bundle kein reales Depot mehr; diese
   Datei hält den Rot-Beweis, dass eine frisch angelegte Bürgerin den Erbschein-Auszug SIEHT.
   STAND 21.09.2026 (Schema 87): der Auszug steht nicht mehr als Konstante im Kern, sondern als Template im Rezept von privat-de und
   privat-en (templatePfade, U2-ADR-427). Das Produkt stellt es zur Laufzeit als Ab-Werk-Saat bereit (`_logikModuleAlle`), das frische
   Depot trägt keine eigene Kopie. Was hier gehalten wird:
   (1) im gebauten privat-de und privat-en sieht die frische Bürgerin den Auszug ohne jeden Einlass, und die Sektion zeigt die Karte,
   (2) im NACKTEN Gerüst gibt es ihn nicht — das Gerüst verlangt beim Start keinen bestimmten Inhalt (Sollzustand, kein Fund),
   (3) Pro trägt ihn nicht (seine Zielbereiche sind ersetzt; die Ablehnung dort gab es schon vorher, Code-Review 16.09.2026, B13).
   Die Stufe 87 (alte Kopie entfernen) hält tests/schema-87-erbschein-template.test.js.
   GERÜST-TEST: der Rot-Beweis (2) lädt bewusst das nackte Gerüst (`blank: true`, roher Pfad) — er misst, dass es ohne den Auszug startet; roh ist hier Absicht.
   ═══════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { depotImProduktAnlegen, kernAus, produktHtml } = require('./produkt-html-erzeugen.js');

const ID = 'erbschein-vorbereitung';
const PRIVAT = ['privat-de', 'privat-en'];

test('[Erbschein-Ab-Werk] frisch angelegte Bürgerin im gebauten Privat-Produkt: der Auszug steht als Saat da, ohne Kopie im Depot', async () => {
  for (const slug of PRIVAT) {
    const { V } = await depotImProduktAnlegen(slug, 'Erbschein-Ab-Werk-2026!');
    const d = V.getData();
    assert.ok(V._logikModuleAlle(d).some((m) => m && m.id === ID), slug + ': das Template fehlt in der Ab-Werk-Saat des Produkts');
    assert.ok(!(d.logikModule || []).some((m) => m && m.id === ID), slug + ': das frische Depot trägt keine eigene Kopie');
    assert.equal(V._modulOderVorlage(ID) !== null, true, slug + ': _modulOderVorlage findet das Modul — der Torwächter, der die Karte rendert');
  }
});

test('[Erbschein-Ab-Werk] frisch angelegte Bürgerin: renderSektor(advanceCare) zeigt die Karte OHNE manuellen Einlass', async () => {
  for (const slug of PRIVAT) {
    const { V, document } = kernAus(produktHtml(slug));
    await V.depotAnlegen('Erbschein-Ab-Werk-Sektion-2026!');
    V.renderSektor('advanceCare');
    const html = document.getElementById('content').innerHTML;
    assert.match(html, /data-erbschein-dokument/, slug + ': die Karte muss ohne jeden manuellen Einlass erscheinen');
    assert.match(html, /data-erbschein-xml/, slug);
  }
});

test('[Erbschein-Ab-Werk·Rot-Beweis] im nackten Gerüst gibt es den Auszug nicht — es startet trotzdem', async () => {
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(__dirname, '..', 'vivodepot.html');   // gesetzt: ladeKern() bäckt nicht
  let V, document;
  try { ({ V, document } = ladeKern({ blank: true })); } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
  }
  await V.depotAnlegen('Erbschein-Ab-Werk-Nackt-2026!');
  const d = V.getData();
  assert.ok(!V._logikModuleAlle(d).some((m) => m && m.id === ID), 'das nackte Gerüst trägt den Auszug nicht');
  assert.ok(!(d.logikModule || []).some((m) => m && m.id === ID));
});

test('[Erbschein-Ab-Werk] Pro trägt den Auszug nicht: die Zielbereiche sind dort ersetzt', async () => {
  for (const slug of ['pro-de', 'pro-en']) {
    const { V } = await depotImProduktAnlegen(slug, 'Erbschein-Ab-Werk-Pro-2026!');
    assert.ok(!V._logikModuleAlle(V.getData()).some((m) => m && m.id === ID), slug);
  }
});
