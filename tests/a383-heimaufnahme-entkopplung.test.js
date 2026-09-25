'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A383 — die Heimaufnahme entkoppelt und vervollständigt
   (Entscheidungsrunde 20.08.2026, Punkt 2; Laufzettel-Strang 3a)
   ────────────────────────────────────────────────────────────────────────
   DER FALL: eine Registry speiste zwei Fragen. `_ANG_SITUATIONEN` beschrieb
   den ANLASS (was gehört auf das Blatt „Pflegeheim-Aufnahme"?) UND bestimmte,
   was in den ANGEHÖRIGEN-CACHE wandert (was sieht jemand OHNE Depot-Passwort?).

   Die Folge war keine Entscheidung, sondern eine Nebenwirkung: wer das Blatt
   vervollständigte, erweiterte ungefragt den Kreis dessen, was ein Angehöriger
   sieht — und darum blieb das Blatt unvollständig.

   DIE TRAGENDE PROBE ist darum nicht „das Blatt hat mehr Felder", sondern
   „ein neues Blatt-Feld erreicht den Cache NICHT". Das erste ist eine Zahl,
   das zweite ist die Entkopplung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, _standardProduktBaken } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const HTML = path.join(REPO, 'vivodepot.html');

async function depotMitWerten(V) {
  await V.depotAnlegen('pw-a383');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.sektorFeldSetzen('identity', 'familyName', 'Muster');
  V.sektorFeldSetzen('identity', 'birthDate', '1940-03-02');
  V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456789');
  V.sektorFeldSetzen('advanceCare', 'dailyRoutineActivities', 'Früh aufstehen');
  return V;
}

function blattFelder(V, blattId) {
  const s = V.angehoerigenSituationenAlle().find(x => x.id === blattId);
  return (s.bloecke || []).flatMap(b => (b.eintraege || []).map(e => e.quelle + '|' + e.feld));
}

/* ══ Die tragende Probe ═══════════════════════════════════════════════════ */

test('[A383 · tragend] das Blatt trägt das Geburtsdatum — der Cache NICHT', async () => {
  const { V } = ladeKern();
  await depotMitWerten(V);

  assert.ok(blattFelder(V, 'pflegeheimakut').includes('identity|birthDate'),
    'Vorbedingung: die Heimaufnahme führt das Geburtsdatum');

  const cache = V.angehoerigenCacheModell();
  assert.equal((cache.sektoren.identity || {}).birthDate, undefined,
    'DIE ENTKOPPLUNG: ein Feld auf dem Blatt wandert nicht mehr von selbst in die Angehörigen-Sicht');

  // Und die Gegenprobe, damit „undefined" nicht heißt „der Cache ist leer".
  assert.equal((cache.sektoren.identity || {}).givenName, 'Hedwig',
    'der Banner-Name steht weiterhin — er ist fest verdrahtet, nicht abgeleitet');
  assert.equal((cache.sektoren.advanceCare || {}).dailyRoutineActivities, 'Früh aufstehen',
    'und ein geführtes Blatt-Feld kommt weiterhin an');
});

test('[A383 · tragend · Rot-Beweis] ohne die eigene Liste steht das Geburtsdatum im Cache', async () => {
  /* Mutation AM GEGENSTAND, auf einer Kopie: die eine Filterzeile entfernen. Dann ist die alte
     Kopplung zurück, und das neue Blatt-Feld erscheint ungefragt in der Angehörigen-Sicht —
     genau der Zustand, den dieser Auftrag beendet. */
  const original = fs.readFileSync(HTML, 'utf8');
  const anker = "        if (!_ANG_CACHE_ERLAUBT.has(s.id + '|' + e.quelle + '|' + e.feld)) continue;\n";
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: die Filterzeile steht genau einmal');
  const tmp = path.join(os.tmpdir(), 'a383-probe-' + process.pid + '.html');
  // Die Blätter kommen aus der ab-Werk-Vorlage des Produkts — eine mutierte Kopie wird nicht von
  // ladeKern() gebacken, also hier ausdrücklich.
  fs.writeFileSync(tmp, _standardProduktBaken(original.replace(anker, '')));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern();
    await depotMitWerten(V);
    const cache = V.angehoerigenCacheModell();
    assert.equal((cache.sektoren.identity || {}).birthDate, '1940-03-02',
      'ohne die Liste ist die Kopplung zurück — das ist der Beweis, dass sie wirkt');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.equal(fs.readFileSync(HTML, 'utf8'), original, 'die Probe darf den echten Kern nicht verändern');
});

/* ══ Der Schnitt ändert am Bestand nichts ═════════════════════════════════ */

test('[A383] die eigene Liste ist beim Schnitt zeichengleich mit dem, was die Ableitung ergab', () => {
  const { V } = ladeKern();
  /* Der Schnitt war zustandserhaltend: JEDER Eintrag der eigenen Liste stammt aus einem Blatt.
     Die Gegenrichtung gilt bewusst NICHT — die Heimaufnahme trägt seit heute fünf Felder mehr,
     und genau darum geht es. */
  const ausBlaettern = new Set();
  for (const s of V.angehoerigenSituationenAlle()) {
    for (const b of (s.bloecke || [])) {
      for (const e of (b.eintraege || [])) ausBlaettern.add(s.id + '|' + e.quelle + '|' + e.feld);
    }
  }
  const verwaist = Array.from(V._ANG_CACHE_ERLAUBT).filter(k => !ausBlaettern.has(k));
  assert.deepEqual(verwaist, [],
    'ein Eintrag der Angehörigen-Liste ohne Blatt zeigt ins Leere: ' + verwaist.join(', '));
  assert.equal(V._ANG_CACHE_ERLAUBT.size, 75, 'der gemessene Stand vom 20.08.2026');
});

test('[A383] die fünf neuen Blatt-Felder stehen bewusst NICHT in der Angehörigen-Liste', () => {
  const { V } = ladeKern();
  const neu = ['identity|givenName', 'identity|familyName', 'identity|birthDate',
    'health|healthInsurance', 'health|insuranceNumber'];
  const aufDemBlatt = blattFelder(V, 'pflegeheimakut');
  for (const paar of neu) {
    assert.ok(aufDemBlatt.includes(paar), paar + ' fehlt auf der Heimaufnahme');
    assert.equal(V._ANG_CACHE_ERLAUBT.has('pflegeheimakut|' + paar), false,
      paar + ' ist ungefragt in die Angehörigen-Sicht gewandert — was dort hineingehört, ist eine eigene Frage');
  }
});

/* ══ Die Vervollständigung ════════════════════════════════════════════════ */

test('[A383] die Heimaufnahme trägt Person, Krankenversicherung, Pflege und Wünsche', () => {
  const { V } = ladeKern();
  const f = blattFelder(V, 'pflegeheimakut');
  // Die vier Gruppen aus der Begründung, je an einem Vertreter geprüft.
  assert.ok(f.includes('identity|birthDate'), 'Person');
  assert.ok(f.includes('health|insuranceNumber'), 'Krankenversicherung — nicht die Pflegekasse');
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `pflegekasse_nr` -> `pflegekasse_nummer` (Liste).
  assert.ok(f.includes('socialInsurance|longTermCareFundNumbers'), 'Pflegekasse (stand schon da)');
  assert.ok(f.includes('advanceCare|dailyRoutineActivities'), 'Pflegewünsche (standen schon da)');
});

test('[A383] die zwei neuen Blöcke tragen eine Überschrift', () => {
  const { V } = ladeKern();
  const s = V.angehoerigenSituationenAlle().find(x => x.id === 'pflegeheimakut');
  for (const id of ['zur-person', 'krankenversicherung']) {
    const block = s.bloecke.find(b => b.id === id);
    assert.ok(block, 'Block ' + id + ' fehlt');
    assert.ok(block.titel && block.titel.trim(), 'Block ' + id + ' hat keine Überschrift');
  }
});
