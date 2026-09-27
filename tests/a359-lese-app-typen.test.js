'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A359 · Bauweg 3 — die Lese-App kennt dieselben neun Feldarten wie der Kern,
   und sie hält ein sensibles angedocktes Feld zurück
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND IST EIN ANDERER ALS DER GEMELDETE, und die Korrektur gehört an den
   Anfang: A350 führte „Lese-App `sektorHTML` — eigener eingefrorener Katalog,
   kennt `feldDefinitionen` nicht". **Sie kennt sie** (`_tplAbschnitte`, seit
   A276/A277). Gemessen wurde damals ein Depot OHNE Definitionen — eine LEERE
   Messung, keine negative (s. A397, Zug 0).

   Was wirklich fehlte, ist kleiner und schärfer:

     1 · FÜNF von neun Render-Typen. Der Kern rendert `text`, `textarea`, `zahl`,
         `datum`, `auswahl`, `mehrfachauswahl`, `liste`, `ref`, `refMehrfach`;
         die Lese-App kannte vier. Ein angedocktes Listen- oder Notizfeld war
         beim Empfänger unsichtbar — im Depot, auf dem Blatt aus A389, und auf
         dem Bildschirm der zweiten Säule nicht.
     2 · DIE SENSIBEL-ZURÜCKHALTUNG. Die Lese-App hält ein sensibles KERN-Feld
         unbedingt zurück (Befund 2 vom 12./13.08.) — das angedockte daneben
         zeigte sie an. **Dieselbe Klasse wie die Offenlegung im Vollexport
         (A350 Fund 1), eine Anwendung weiter.**

   Der Renderer konnte die Typen längst; es fehlte die Erlaubnis in der Menge
   und zwei Angaben, die der Adapter fallen liess.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

const SEKTOR = 'education';

function lese(defs, daten, sensibelFelder) {
  const { V } = ladeLesen();
  V.setData({ schemaVersion: 70, menschen: [], urheberschaft: {}, mappe: [],
    sektoren: { [SEKTOR]: daten }, feldDefinitionen: defs,
    sensibelFelder: sensibelFelder || {} });
  return { V, html: V.sektorHTML(SEKTOR) };
}

test('[A359·3·tragend] die Lese-App kennt dieselben neun Render-Typen wie der Kern', () => {
  const { V } = ladeLesen();
  const { V: K } = ladeKern();
  const kern = [...K._TEMPLATE_RENDER_TYPEN].sort();
  const app = [...V._TPL_RENDER_TYPEN].sort();
  assert.deepEqual(app, kern,
    'was der Kern anzeigt, muss der Empfänger anzeigen — sonst ist die zweite Säule eine engere');
  // 12.09.2026: `verweis` (externe Adresse) kam als zehnter Render-Typ dazu, auf beiden Seiten.
  assert.equal(kern.length, 10);
});

test('[A359·3] ein angedocktes Notiz-, Listen- und Mehrfachfeld erscheint beim Empfänger', () => {
  const { html } = lese([
    { sektorId: SEKTOR, feldId: 'tpl_notiz', typ: 'textarea', label: 'Notiz' },
    { sektorId: SEKTOR, feldId: 'tpl_nachweise', typ: 'liste', label: 'Nachweise',
      unterFelder: [{ id: 'titel', typ: 'text', label: 'Titel' }] },
    { sektorId: SEKTOR, feldId: 'tpl_tags', typ: 'mehrfachauswahl', label: 'Schlagworte' },
  ], {
    tpl_notiz: 'Zeile 1\nZeile 2',
    tpl_nachweise: [{ titel: 'Zeugnis' }, { titel: 'Urkunde' }],
    tpl_tags: ['a', 'b'],
  });
  assert.match(html, /Zeile 1/, 'textarea');
  assert.match(html, /Zeugnis/, 'liste — über die Unterfelder, die der Adapter jetzt durchreicht');
  assert.match(html, /Urkunde/, 'und JEDE Zeile, nicht nur die erste');
  assert.match(html, /Schlagworte/, 'mehrfachauswahl');
});

test('[A359·3·tragend] ein sensibel MARKIERTES angedocktes Feld bleibt beim Empfänger zurück', () => {
  const { html } = lese(
    [{ sektorId: SEKTOR, feldId: 'tpl_geheim', typ: 'text', label: 'Vertretungspasswort' },
     { sektorId: SEKTOR, feldId: 'tpl_offen', typ: 'text', label: 'Kammernummer' }],
    { tpl_geheim: 'GEHEIMWERT', tpl_offen: 'K-7', schule_name: 'Realschule Nord' },
    { [SEKTOR]: { tpl_geheim: true, schule_name: true } });
  assert.equal(html.includes('GEHEIMWERT'), false,
    'die Markierung galt für das Kern-Feld und gilt ab jetzt auch hier');
  assert.equal(html.includes('Realschule Nord'), false, 'Gegenprobe: das Kern-Feld war immer zurück');
  assert.match(html, /K-7/, 'und ein nicht markiertes angedocktes Feld bleibt sichtbar');
});

test('[A359·3] auch das SCHEMA-Flag der Vorlage hält beim Empfänger', () => {
  const { html } = lese(
    [{ sektorId: SEKTOR, feldId: 'tpl_geheim', typ: 'text', label: 'Tresor', sensibel: true }],
    { tpl_geheim: 'GEHEIMWERT' });
  assert.equal(html.includes('GEHEIMWERT'), false, 'die Vorlage selbst kann ihr Feld als sensibel erklären');
});

test('[A359·3·Rot-Beweis] ohne die Zurückhaltung erscheint das sensible Feld wieder', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const pfad = path.join(__dirname, '..', 'vivodepot-lesen.html');
  const original = fs.readFileSync(pfad, 'utf8');
  const anker = '      return feldEingetragen(f, daten[d.feldId]) && !feldIstSensibel(f, sektorId);';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const tmp = path.join(os.tmpdir(), 'a359-lese-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, '      return feldEingetragen(f, daten[d.feldId]);   // Rot-Probe'));
  const zuvor = process.env.LESEN_HTML_PATH;
  process.env.LESEN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-lesen.js')];
    const { V } = require('./load-lesen.js').ladeLesen();
    V.setData({ schemaVersion: 70, menschen: [], urheberschaft: {}, mappe: [],
      sektoren: { [SEKTOR]: { tpl_geheim: 'GEHEIMWERT' } },
      feldDefinitionen: [{ sektorId: SEKTOR, feldId: 'tpl_geheim', typ: 'text', label: 'Tresor' }],
      sensibelFelder: { [SEKTOR]: { tpl_geheim: true } } });
    assert.match(V.sektorHTML(SEKTOR), /GEHEIMWERT/,
      'mutiert: das markierte Feld erscheint wieder — der Zustand vor diesem Bauweg');
  } finally {
    if (zuvor === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-lesen.js')];
    fs.unlinkSync(tmp);
    assert.equal(fs.readFileSync(pfad, 'utf8'), original, 'das Original ist unberührt');
  }
});

test('[A359·3·verweis, 12.09.2026] eine geprüfte externe Adresse erscheint beim Empfänger, als Text', () => {
  const { html } = lese(
    [{ sektorId: SEKTOR, feldId: 'tpl_register', typ: 'verweis', label: 'Zentrales Register', ziel: 'https://vorsorgeregister.de' }],
    {});
  assert.match(html, /https:\/\/vorsorgeregister\.de/, 'die Adresse kommt aus der Definition (f.ziel), nicht aus daten[feldId] (das bleibt leer)');
});

test('[A359·3·verweis·Fail-closed] ein ungeprüft-ungültiges ziel (z. B. altes Depot) zeigt Leer, nicht die rohe Adresse', () => {
  const { html } = lese(
    [{ sektorId: SEKTOR, feldId: 'tpl_boese', typ: 'verweis', label: 'Böse', ziel: 'javascript:alert(1)' }],
    {});
  assert.equal(html.includes('javascript:'), false, 'kein Ausführungsschema erscheint je als Text im gerenderten Blatt');
});

test('[A359·3·Gegenprobe] ein wirklich unbekannter Typ bleibt aussen vor', () => {
  const { html } = lese(
    [{ sektorId: SEKTOR, feldId: 'tpl_ort', typ: 'geokoordinate', label: 'Standort' }],
    { tpl_ort: '52.5,13.4' });
  assert.equal(html.includes('Standort'), false,
    'die Menge ist gewachsen, nicht aufgehoben — ein Typ, den niemand rendert, wird nicht geraten');
});
