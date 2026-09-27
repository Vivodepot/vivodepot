'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Sensibel ist eine Voreinstellung, keine Sperre"
   (11.08.2026), Zug 3: die Freigabe bleibt sichtbar.

   GEMESSEN (Regel 23), nicht angenommen: `uebergabeProtokoll.umfang` ist
   vollständig freies Textfeld, von der Bürgerin selbst eingetragen — es
   gibt HEUTE keine automatische Vorbelegung aus der Export-Auswahl und
   KEINE Filterung/Kürzung, die eine Erwähnung eines freigegebenen
   schema-sensiblen Felds unterdrücken könnte. „Erscheint als das, was sie
   ist" ist damit erfüllt: nichts verschweigt es, die Bürgerin kann es
   wortgetreu eintragen. Eine automatische Herleitung des Umfangs aus der
   Export-Auswahl wäre ein neues Feature, vom Auftrag nicht verlangt —
   nicht gebaut, im Bericht vermerkt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Sensibel-Freigabe·Zug3] uebergabeProtokollEintragen speichert den Umfang-Text wortgetreu — keine Kürzung, keine Filterung', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('sicherung-2026');
  V.akteurSelbstErklaeren('Tester');
  const umfang = 'Staatsangehörigkeit (besonders geschützt, bewusst freigegeben), Vorname, Nachname';
  const eintrag = V.uebergabeProtokollEintragen({ empfaenger: 'Klinik Test', zweck: 'Aufnahme', umfang });
  assert.equal(eintrag.umfang, umfang, 'der Text kommt wortgetreu an — keine stille Kürzung oder Filterung');
  const gespeichert = V.getData().uebergabeProtokoll.find((e) => e.kennung === eintrag.kennung);
  assert.equal(gespeichert.umfang, umfang, 'und bleibt im Depot wortgetreu erhalten');
});

test('[Sensibel-Freigabe·Zug3] der Umfang-Text ist FREI — kein Katalog, keine Werteliste, die eine Erwähnung ausschließen könnte', async () => {
  const { V } = ladeKern();
  const feld = V.STRINGS.uebergabeUmfangLabel;
  assert.ok(feld, 'Label existiert');
  // Gemessen (Regel 23): _uebergabeFelderHTML rendert #up-umfang als reines <input type="text">,
  // kein <select>, kein Katalog — bestätigt am Markup-Erzeuger selbst, nicht angenommen.
  const html = V._uebergabeFelderHTML();
  assert.match(html, /<input id="up-umfang" class="eingabe" type="text"/,
    'Freitext-Eingabe, keine Auswahl aus einer festen Liste');
});
