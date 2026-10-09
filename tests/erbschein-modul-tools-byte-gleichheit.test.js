'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Erbschein-Vorbereitungsmodul — die ausgelieferte Kopie unter tools/ bleibt
   byte-gleich zur einzigen Quelle unter tests/fixtures/
   ────────────────────────────────────────────────────────────────────────
   WOZU (05.09.2026, Auftrag, Nachtrag zu `tools/erbschein-
   vorbereitung-modul-erzeugen.js`). `tests/erbschein-modul-mechanik.test.js`
   warnt in seinem eigenen Kommentar ausdrücklich vor „einem zweiten, leicht
   abweichenden Test-Bundle" — genau das entstünde, wenn die reale, an
   Institutionen ausgelieferte Kopie (`tools/erbschein-vorbereitung-
   modul.json`) unbemerkt vom geprüften Original (`tests/fixtures/erbschein-
   vorbereitung-logikmodul.json`) abwiche: zwei Bündel, beide „gebaut", eines
   davon ungeprüft und potenziell falsch — die schlimmere Fassung von
   „gebaut, nie verdrahtet".

   Dieser Wächter hält die Byte-Gleichheit selbst UND beweist mit einem
   Rot-Beweis, dass er eine echte Abweichung auch tatsächlich fände (nicht
   nur zwei leere Zustände vergleicht).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const QUELLE = path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json');
const AUSGELIEFERT = path.join(__dirname, '..', 'tools', 'erbschein-vorbereitung-modul.json');

test('[Erbschein-Modul·Tools] die ausgelieferte Kopie existiert', () => {
  assert.ok(fs.existsSync(AUSGELIEFERT),
    'tools/erbschein-vorbereitung-modul.json fehlt — node tools/erbschein-vorbereitung-modul-erzeugen.js ausführen');
});

test('[Erbschein-Modul·Tools] Quelle und ausgelieferte Kopie sind byte-gleich', () => {
  const quelle = fs.readFileSync(QUELLE, 'utf8');
  const ausgeliefert = fs.readFileSync(AUSGELIEFERT, 'utf8');
  assert.equal(ausgeliefert, quelle,
    'tools/erbschein-vorbereitung-modul.json ist von tests/fixtures/erbschein-vorbereitung-logikmodul.json '
    + 'abgewichen — node tools/erbschein-vorbereitung-modul-erzeugen.js neu ausführen, nicht von Hand angleichen');
});

test('[Erbschein-Modul·Tools·Rot-Beweis] eine künstlich veränderte Kopie wird NICHT als gleich erkannt', () => {
  const quelle = fs.readFileSync(QUELLE, 'utf8');
  const verfaelscht = quelle.replace('"herkunft": "vivodepot"', '"herkunft": "irgendwer"');
  assert.notEqual(verfaelscht, quelle, 'Vorbedingung: die Verfälschung muss den Text wirklich ändern');
  assert.notEqual(verfaelscht, fs.readFileSync(AUSGELIEFERT, 'utf8'),
    'der Wächter müsste diese Abweichung erkennen — täte er es nicht, prüfte der Test oben nichts');
});

test('[Erbschein-Modul·Tools] die ausgelieferte Kopie ist selbst ein gültiges logikModul (0 verworfene Schlüssel)', async () => {
  const { V } = await ladeKern();
  const modul = JSON.parse(fs.readFileSync(AUSGELIEFERT, 'utf8'));
  const r = V.logikModulPruefen(modul);
  assert.equal(r.gueltig, true, 'Grund: ' + r.grund);
  assert.deepEqual(r.verworfene, []);
});

test('[Erbschein-Modul·Tools] die ausgelieferte Kopie läuft über den echten Einlassweg an (Selbst-Einlass, ungeprueft:true)', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('Erbschein-Tools-Einlass-2026!');
  // U2-ADR-288 (05.09.2026): depotAnlegen() seedet das Bundle seither selbst ab Werk — geleert,
  // damit dieser manuelle Einlass ein echter Erst-Einlass bleibt (sonst "aeltere-fassung").
  V.getData().logikModule = [];
  const bundleText = fs.readFileSync(AUSGELIEFERT, 'utf8');
  const ergebnis = V.modulEinlassen(bundleText, V.getData(), null, null);
  assert.equal(ergebnis.angenommen, true, 'Grund: ' + ergebnis.grund);
  assert.equal(ergebnis.ungeprueft, true, 'Selbst-Einlass — kein geprüfter Herausgeber, keine Fremdsignatur');
});

/* Drift-Wächter für den ERZEUGER selbst („Drift-Wächter vervollständigen",
   09.09.2026) — die Proben oben halten nur zwei eingecheckte Dateien (tools/erbschein-
   vorbereitung-modul.json und tests/fixtures/erbschein-vorbereitung-logikmodul.json) gegeneinander
   byte-gleich, rufen `tools/erbschein-vorbereitung-modul-erzeugen.js` aber NIE selbst auf — driftet
   die QUELLE unbemerkt (z.B. durch eine versehentliche Handbearbeitung von
   erbschein-vorbereitung-modul.json), fiele das hier nie auf. `leseModul()` liest exakt das, was
   der Erzeuger beim Schreiben unverändert übernimmt (s. Kopf-Kommentar am Erzeuger). EIN ROTER
   DRIFT-WÄCHTER HEISST PRÜFEN, NICHT NEU BACKEN: erst nachsehen, welche der beiden Seiten von der
   Quelle abgewichen ist, bevor der Erzeuger erneut läuft. */
test('[Erbschein-Modul·Tools·Drift-Wächter] der frische Erzeuger-Lauf liefert exakt die ausgelieferte Kopie', () => {
  delete require.cache[require.resolve('../tools/erbschein-vorbereitung-modul-erzeugen.js')];
  const { leseModul } = require('../tools/erbschein-vorbereitung-modul-erzeugen.js');
  const frisch = leseModul();
  const eingecheckt = JSON.parse(fs.readFileSync(AUSGELIEFERT, 'utf8'));
  assert.deepEqual(eingecheckt, frisch,
    'tools/erbschein-vorbereitung-modul.json weicht vom frischen Erzeuger-Lauf ab — '
    + 'node tools/erbschein-vorbereitung-modul-erzeugen.js neu ausführen, nicht von Hand angleichen');
});
