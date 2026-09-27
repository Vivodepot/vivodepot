'use strict';
/* dod-v1-rezept-zu-artefakt-pruefen.test.js — D2 (19.09.2026): die Rezepte-Probe UND die
   Artefaktprobe, nicht nur die Rezepte-Probe.

   `tools/dod-v1-rezepte-pruefen.js` mißt nur, was im REZEPT steht (Feldzahlen). Diese Probe geht
   einen Schritt weiter: sie löst jede `pfad`/`pruefsumme` aus dem Rezept auf eine lokale Datei
   auf (Byte-Treue: die Prüfsumme im Rezept muß mit der lokalen Datei übereinstimmen — sonst weicht
   das Rezept vom Bestand ab, ohne dass ein Feldzähler das sähe), baut daraus ein ECHTES Produkt
   über denselben Konfektionierer, den der Gateway verwendet, und prüft am geladenen Kern, welche
   Bereiche tatsächlich ankommen. Das ist die „repo-lesbare Hälfte" der Artefaktprobe (kein
   Netzwerk, keine HiDrive-Ablage) — die verbleibende Hälfte (das vom GATEWAY gebaute Artefakt)
   ist Gegenstand einer eigenen Probe im Schwesterrepo, s. Bericht. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const REPO = path.join(__dirname, '..');
const REZEPT_ORDNER = path.join(REPO, 'tests', 'fixtures', 'dod-v1-rezepte-stand-2026-09-17');

// Dieselben Suchordner, aus denen tools/lib/vier-produkte.js seine Pfade zieht — die Auflösung
// hier geht NICHT über vier-produkte.js (das würde den eigentlichen Prüfgegenstand, das REZEPT,
// umgehen), sondern sucht unabhängig danach, ob die im Rezept genannte Datei tatsächlich im
// Bestand liegt.
const SUCHORDNER = [
  path.join(REPO, 'tools', 'bereich-templates'),
  path.join(REPO, 'tools', 'dokument-module'),
  path.join(REPO, 'tools', 'angehoerigen-vorlagen'),
  path.join(REPO, 'tools', 'templates'),
  path.join(REPO, 'tools'),
  path.join(REPO, 'tests', 'fixtures'),
];

function sha256Datei(pfad) {
  return crypto.createHash('sha256').update(fs.readFileSync(pfad)).digest('hex');
}

function lokalAufloesen(gatewayPfad) {
  const basisname = path.basename(gatewayPfad);
  for (const ordner of SUCHORDNER) {
    const kandidat = path.join(ordner, basisname);
    if (fs.existsSync(kandidat)) return kandidat;
  }
  throw new Error('keine lokale Datei gefunden für: ' + gatewayPfad + ' (Basisname ' + basisname + ')');
}

function rezeptLesen(slug) {
  return JSON.parse(fs.readFileSync(path.join(REZEPT_ORDNER, slug + '.json'), 'utf8'));
}

function rezeptZuLokalenDateien(rezept) {
  const zutaten = [rezept.sprachmodul && { pfad: rezept.sprachmodul, pruefsumme: rezept.sprachmodulPruefsumme } ]
    .filter(Boolean)
    .concat(rezept.bereichsmodule, rezept.templates);
  return zutaten.map((z) => {
    const lokal = lokalAufloesen(z.pfad);
    assert.equal(sha256Datei(lokal), z.pruefsumme,
      'Rezept-Prüfsumme muss zur lokalen Datei passen: ' + z.pfad + ' -> ' + lokal +
      ' (weicht das Rezept vom Bestand ab, ohne dass ein Feldzähler das sieht)');
    return lokal;
  });
}

function baueUndLade(slug, rezept = rezeptLesen(slug)) {
  const kernPfad = path.join(REPO, 'vivodepot.html');
  assert.equal(sha256Datei(kernPfad), rezept.kernPruefsumme,
    'rezept.kernPruefsumme muss zum lokalen vivodepot.html passen (Rezept zeigt ' +
    rezept.kernStand + ')');
  const unsignierteModulDateien = rezeptZuLokalenDateien(rezept);
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-rezept-artefakt-' + slug + '-'));
  const r = konfektionieren({
    ziel, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien,
  });
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
  delete require.cache[require.resolve(LOAD_KERN)];
  const kern = require(LOAD_KERN).ladeKern();
  if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
  delete require.cache[require.resolve(LOAD_KERN)];
  return kern;
}

const PRIVAT_IDS = Object.freeze([
  'administration', 'advanceCare', 'assets', 'education', 'emergencyPreparedness', 'finance',
  'health', 'housing', 'identity', 'mobility', 'people', 'personal', 'socialInsurance',
]);
const PRO_IDS = Object.freeze([
  'identity', 'pro-aufbewahrung-ordnung', 'pro-betrieb-zugaenge', 'pro-finanzen-verbindlichkeiten',
  'pro-gesellschaft-nachfolge', 'pro-kontakte-vertretungsplan', 'pro-vertretung-vollmachten',
]);

for (const slug of ['privat-de', 'privat-en']) {
  test('[Rezept-zu-Artefakt·' + slug + '] das AUS DEM REZEPT gebaute Produkt trägt alle 13 nativen Bereiche', () => {
    const { V } = baueUndLade(slug);
    const ids = V.bereicheAlle().map((s) => s.id).sort();
    assert.deepEqual(ids, PRIVAT_IDS.slice().sort());
  });
}

for (const slug of ['pro-de', 'pro-en']) {
  test('[Rezept-zu-Artefakt·' + slug + '] das AUS DEM REZEPT gebaute Produkt trägt genau die sieben Pro-Bereiche', () => {
    const { V } = baueUndLade(slug);
    const ids = V.bereicheAlle().map((s) => s.id).sort();
    assert.deepEqual(ids, PRO_IDS.slice().sort());
  });
}

/* ── Rot-Beweise: die Probe wird rot, wenn das Rezept nicht zum Bestand passt ──────────────────
   Ohne sie prüfte die Probe oben nur, dass ein passendes Rezept ein passendes Produkt gibt — nicht,
   dass ein unpassendes auffiele. Beide Weichen sind die, die am 19.09.2026 real gerissen sind
   (eine Kern-Änderung ließ die eingecheckte Prüfsumme stale werden). */
test('[Rezept-zu-Artefakt·Rot-Beweis] ein Rezept mit fremder kernPruefsumme wird abgewiesen, bevor etwas gebaut wird', () => {
  const rezept = Object.assign({}, rezeptLesen('privat-de'), { kernPruefsumme: '0'.repeat(64) });
  assert.throws(() => baueUndLade('privat-de', rezept), /kernPruefsumme muss zum lokalen vivodepot\.html passen/);
});

test('[Rezept-zu-Artefakt·Rot-Beweis] eine verschobene Zutaten-Prüfsumme im Rezept wird abgewiesen', () => {
  const echt = rezeptLesen('privat-de');
  assert.ok(echt.bereichsmodule.length > 0, 'Vorbedingung: das Rezept trägt Zutaten');
  const rezept = Object.assign({}, echt, {
    bereichsmodule: echt.bereichsmodule.map((z, i) => (i === 0 ? Object.assign({}, z, { pruefsumme: '0'.repeat(64) }) : z)),
  });
  assert.throws(() => baueUndLade('privat-de', rezept), /Rezept-Prüfsumme muss zur lokalen Datei passen/);
});
