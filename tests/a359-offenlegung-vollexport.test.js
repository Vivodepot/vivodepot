'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A359 · Fund 1 — die Sensibel-Markierung gilt auch für ein angedocktes Feld
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND (A350, Fund 1, seit 19.08. offen): Die Bürgerin markiert ein
   angedocktes Feld als sensibel. Beim Export „ohne sensible Daten" wird das
   Kern-Feld zurückgehalten — **das angedockte ging mit.**

   DAS IST DER EINZIGE DER FÜNF A350-FUNDE, BEI DEM DATEN HINAUSGEHEN statt
   auszubleiben. Er wiegt schwerer als jede Anzeigelücke: eine fehlende Angabe
   kann man nachreichen, eine herausgegebene nicht zurückholen. Die Markierung
   ist ein ausdrücklicher Wille, und er wurde übergangen.

   DIE URSACHE war dieselbe wie überall in dieser Liste: die Schleife lief über
   `s.sektionen[].felder` — den Kern-Katalog —, und dort steht ein angedocktes
   Feld nicht. Geschlossen über DIESELBE eine Prüfung (`feldIstSensibel`), nicht
   über eine zweite Regel.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, _standardProduktBaken } = require('./load-kern.js');

const SEKTOR = 'education';
const KERN_FELD = 'school';

function depot(V, opt) {
  const d = V.leeresDepot();
  d.feldDefinitionen = [
    Object.assign({ sektorId: SEKTOR, feldId: 'tpl_markiert', typ: 'text', label: 'Kammernummer' }, (opt && opt.defZusatz) || {}),
    { sektorId: SEKTOR, feldId: 'tpl_frei', typ: 'text', label: 'Frei' },
  ];
  d.sektoren[SEKTOR] = { tpl_markiert: 'K-4711', tpl_frei: 'darf hinaus', [KERN_FELD]: 'Realschule Nord' };
  if (!(opt && opt.ohneMarkierung)) d.sensibelFelder = { [SEKTOR]: { tpl_markiert: true, [KERN_FELD]: true } };
  V.setData(d);
  return d;
}

test('[A359·Fund1·tragend] ein als sensibel MARKIERTES angedocktes Feld bleibt zurück', () => {
  const { V } = ladeKern();
  depot(V);
  const raus = V.vollExportJSON({ sensibel: false }).depot.sektoren[SEKTOR];
  assert.equal(Object.prototype.hasOwnProperty.call(raus, 'tpl_markiert'), false,
    'die Markierung der Bürgerin gilt: ' + JSON.stringify(raus));
  assert.equal(Object.prototype.hasOwnProperty.call(raus, KERN_FELD), false,
    'Gegenprobe: das Kern-Feld war immer zurückgehalten');
  assert.equal(raus.tpl_frei, 'darf hinaus',
    'und ein NICHT markiertes angedocktes Feld geht weiter mit — sonst wäre die Reparatur eine Sperre');
});

test('[A359·Fund1] mit Opt-in reist alles mit — die Bürgerin entscheidet, nicht der Katalog', () => {
  const { V } = ladeKern();
  depot(V);
  const raus = V.vollExportJSON({ sensibel: true }).depot.sektoren[SEKTOR];
  assert.equal(raus.tpl_markiert, 'K-4711');
  assert.equal(raus[KERN_FELD], 'Realschule Nord');
});

test('[A359·Fund1] auch das SCHEMA-Flag einer angedockten Vorlage trägt', () => {
  const { V } = ladeKern();
  depot(V, { ohneMarkierung: true, defZusatz: { sensibel: true } });
  const raus = V.vollExportJSON({ sensibel: false }).depot.sektoren[SEKTOR];
  assert.equal(Object.prototype.hasOwnProperty.call(raus, 'tpl_markiert'), false,
    'die Vorlage selbst kann ein Feld als sensibel erklären — dieselbe eine Prüfung');
});

test('[A359·Fund1·Gegenprobe] ohne jede Markierung wird nichts zurückgehalten', () => {
  const { V } = ladeKern();
  depot(V, { ohneMarkierung: true });
  const raus = V.vollExportJSON({ sensibel: false }).depot.sektoren[SEKTOR];
  assert.equal(raus.tpl_markiert, 'K-4711');
  assert.equal(raus.tpl_frei, 'darf hinaus');
});

test('[A359·Fund1·Rot-Beweis] ohne den Griff geht das markierte Feld wieder hinaus', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const kernPfad = path.join(__dirname, '..', 'vivodepot.html');
  const original = fs.readFileSync(kernPfad, 'utf8');
  const anker = "      const _angDefs = (kopie && Array.isArray(kopie.feldDefinitionen)) ? kopie.feldDefinitionen : [];";
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const tmp = path.join(os.tmpdir(), 'a359-offenlegung-rot-' + process.pid + '.html');
  // Schnitt-Nachtrag (17.09.2026): ladeKern() bäckt bei eigenem KERN_HTML_PATH bewusst NICHT
  // (der Anker-Mutations-Zweck hier ist ein anderer) — ohne diesen expliziten Bake existiert
  // SEKTOR ('education') im nackten Gerüst gar nicht mehr, der Rot-Beweis prüfte dann nichts.
  fs.writeFileSync(tmp, _standardProduktBaken(original.replace(anker, '      const _angDefs = [];   // Rot-Probe')));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern();
    depot(V);
    const raus = V.vollExportJSON({ sensibel: false }).depot.sektoren[SEKTOR];
    assert.equal(raus.tpl_markiert, 'K-4711',
      'mutiert: das markierte Feld geht wieder hinaus — der Zustand vor dieser Reparatur');
    assert.equal(Object.prototype.hasOwnProperty.call(raus, KERN_FELD), false,
      'und das Kern-Feld blieb auch vorher zurück — genau daran war der Fund zu erkennen');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(tmp);
    assert.equal(fs.readFileSync(kernPfad, 'utf8'), original, 'das Original ist unberührt');
  }
});

test('[A359·Fund1] die Rückhaltung folgt derselben Prüfung wie im Kern — nicht einer zweiten Regel', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const q = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const i = q.indexOf('function vollExportJSON');
  const rumpf = q.slice(i, q.indexOf('\nfunction ', i + 10));
  const pruefungen = (rumpf.match(/feldIstSensibel\s*\(/g) || []).length;
  assert.ok(pruefungen >= 2, 'Kern-Feld und angedocktes Feld laufen durch dieselbe Funktion');
  assert.equal(/sensibelFelder\s*\[/.test(rumpf), false,
    'kein zweiter, direkter Griff in die Markierungstabelle — das wäre die zweite Regel');
});
