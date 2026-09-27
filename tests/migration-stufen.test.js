'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-108 — je Schema-Sprung eine Probe
   ────────────────────────────────────────────────────────────────────────
   BEFUND (26.07.2026): Die Kette 24 → 41 ist achtzehn Stufen lang und lückenlos.
   Geprüft war die Minderzahl — ein Depot migrierte über zehn Stufen, ohne dass eine
   Probe den Weg belegte. Ein Migrationsfehler wäre erst am Gerät aufgefallen, an
   fremden Daten.

   DIE GEKOPPELTE KONTROLLE STECKT IN DER FORM (§7.5, ohne Zusatz-Test je Stufe):
   Jeder Eintrag nennt `vorher` und `nachher`. Auf dem konstruierten Alt-Depot muss
   `vorher` WAHR und `nachher` FALSCH sein — nach der Migration umgekehrt. Fiele eine
   Stufe aus, wäre der Zustand danach derselbe wie davor, und die Probe würde rot.
   Das ist keine Behauptung, sondern wird unten für JEDE Stufe mitgeprüft.

   Ein Eintrag, dessen `vorher` schon auf dem Alt-Depot falsch ist, prüft nichts — er
   fällt beim Vakuum-Wächter auf, nicht still durch.

   ALLE DEPOTS SIND KONSTRUIERT (migrationsfreies Fenster, U2-ADR-100 §8). Diese Proben
   belegen die Migration gegen gebaute Fälle, nicht gegen Bestand.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');
const { STUFEN } = require('./fixtures/migrations-stufen.js');

const ADR = 'U2-ADR-108';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'u2-108-jede-stufe-loest-ihre-zusage-ein',
  'u2-108-jede-stufe-ist-vor-der-migration-noch-offen',
  'u2-108-eine-uebersprungene-stufe-aendert-nichts-wenn-sie-ueberfluessig-heisst',
];

const MIT_PROBE = STUFEN.filter(s => typeof s.baue === 'function');
const MIT_VERWEIS = STUFEN.filter(s => s.geprueftIn);
const NICHT_PRUEFBAR = STUFEN.filter(s => s.nichtPruefbar);

function migriere(stufe) {
  const { V } = ladeKern();
  const alt = stufe.baue();
  const kopie = JSON.parse(JSON.stringify(alt));
  return { alt, neu: V.depotNormalisieren(kopie) };
}

/* ── Probe 1 · jede Stufe löst ihre Zusage ein ────────────────────────────── */
// Diskriminante: welche Stufe hält ihre Zusage nach der Migration NICHT?
function stufenOhneWirkung(ergebnisse) {
  const offen = [];
  for (const e of ergebnisse) {
    if (!e.nachherWahr) offen.push('→ ' + e.nach + ': ' + e.was + '  (nachher-Zusage nicht eingelöst)');
    if (e.zielVersion !== e.erwarteteEndversion) {
      offen.push('→ ' + e.nach + ': Endversion ' + e.zielVersion + ' statt ' + e.erwarteteEndversion);
    }
  }
  return offen;
}

function ergebnisseSammeln() {
  const raus = [];
  const { V } = ladeKern();
  const aktuell = V.SCHEMA_VERSION_AKTUELL;
  for (const s of MIT_PROBE) {
    const { alt, neu } = migriere(s);
    raus.push({
      nach: s.nach, was: s.was,
      vorherWahr: !!s.vorher(alt),
      // Auf dem ALT-Depot darf die Zusage noch NICHT gelten — sonst prüft die Stufe nichts.
      nachherSchonVorher: (() => { try { return !!s.nachher(alt); } catch (_) { return false; } })(),
      nachherWahr: !!s.nachher(neu),
      zielVersion: neu.schemaVersion,
      // Die Kette läuft IMMER bis zur aktuellen Version durch — Zwischenstände gibt es nicht.
      erwarteteEndversion: aktuell,
    });
  }
  return raus;
}

test('u2-108-jede-stufe-loest-ihre-zusage-ein', () => {
  assert.ok(MIT_PROBE.length >= 15,
    'Positivkontrolle: der Suchraum ist besetzt (' + MIT_PROBE.length + ' Stufen mit eigener Probe)');
  assert.deepEqual(stufenOhneWirkung(ergebnisseSammeln()), [],
    'Eine Migrationsstufe löst ihre Zusage nicht ein. MELDEN, nicht beheben — ein echter '
    + 'Migrationsfehler ist ein eigener Posten mit eigener Abnahme.');
});

/* ── Probe 2 · der Vakuum-Wächter: die Zusage war vorher WIRKLICH offen ──── */
// Ohne diese Prüfung könnte eine Stufe grün sein, weil ihr Alt-Depot den Zielzustand
// schon trug — die Probe hätte dann nie etwas gemessen.
function stufenOhneVorherZustand(ergebnisse) {
  const taub = [];
  for (const e of ergebnisse) {
    if (!e.vorherWahr) taub.push('→ ' + e.nach + ': `vorher` ist auf dem Alt-Depot FALSCH — das Fixture trägt den Alt-Zustand nicht');
    if (e.nachherSchonVorher) taub.push('→ ' + e.nach + ': `nachher` gilt SCHON vor der Migration — die Probe wäre vakuum-grün');
  }
  return taub;
}

test('u2-108-jede-stufe-ist-vor-der-migration-noch-offen', () => {
  const ergebnisse = ergebnisseSammeln();
  assert.ok(ergebnisse.length >= 15, 'Positivkontrolle: es gibt etwas zu prüfen');
  assert.deepEqual(stufenOhneVorherZustand(ergebnisse), [],
    'Diese Stufen prüfen nichts: entweder liegt der Alt-Zustand im Fixture gar nicht vor, oder der '
    + 'Zielzustand galt schon vorher. Beides macht die Probe wertlos, ohne dass sie rot würde.');
});

test('[Negativprobe] u2-108: eine Stufe ohne echten Alt-Zustand faellt auf', () => {
  // MUTATION: ein Eintrag, dessen `nachher` schon vor der Migration gilt.
  const taub = stufenOhneVorherZustand([
    { nach: 99, was: 'Attrappe', vorherWahr: true, nachherSchonVorher: true, nachherWahr: true },
  ]);
  assert.equal(taub.length, 1, 'der Vakuum-Wächter MUSS das melden');
  assert.match(taub[0], /vakuum-grün/);
  // Positivkontrolle: ein sauberer Eintrag fällt NICHT auf.
  assert.deepEqual(stufenOhneVorherZustand([
    { nach: 99, was: 'Attrappe', vorherWahr: true, nachherSchonVorher: false, nachherWahr: true },
  ]), []);
});

/* ── Die Unterscheidung, die eine „nicht pruefbare" Stufe einordnet ───────────
   UEBERFLUESSIG (Folgestufe taete dasselbe) vs. TRAGEND ABER UNGESCHUETZT (Folgestufe
   setzt voraus, dass sie lief). Nur der erste Fall ist harmlos. Die Probe faehrt denselben
   Ausgangszustand einmal VOR und einmal AB der Stufe durch die Kette: kommt beides am selben
   Ergebnis an, ist die Stufe ueberfluessig. Macht jemand die Folgestufe spaeter davon
   abhaengig, wird diese Probe ROT — die Einordnung kann also nicht still veralten. */
function abweichendeErgebnisseOhneStufe(stufen) {
  const { V } = ladeKern();
  const ohneUuid = (o) => JSON.stringify(o).replace(/"id":"[0-9a-f-]{36}"/g, '"id":"<uuid>"');
  const abweichend = [];
  for (const s of stufen) {
    if (!s.vorbeiAnStufe) continue;
    const mit  = ohneUuid(V.depotNormalisieren(JSON.parse(JSON.stringify(s.vorbeiAnStufe.mit()))));
    const ohne = ohneUuid(V.depotNormalisieren(JSON.parse(JSON.stringify(s.vorbeiAnStufe.ohne()))));
    // Die deklarierte Ausgangsversion unterscheidet sich zwangslaeufig — sie ist nicht der Punkt.
    if (mit !== ohne) abweichend.push('→ ' + s.nach + ': das Ergebnis UNTERSCHEIDET sich, wenn die '
      + 'Stufe uebersprungen wird — sie ist also TRAGEND, nicht ueberfluessig, und niemand macht '
      + 'sie rot, wenn sie kaputtgeht.\n      mit:  ' + mit.slice(0, 200) + '\n      ohne: ' + ohne.slice(0, 200));
  }
  return abweichend;
}

test('u2-108-eine-uebersprungene-stufe-aendert-nichts-wenn-sie-ueberfluessig-heisst', () => {
  const mitProbe = STUFEN.filter(s => s.vorbeiAnStufe);
  assert.ok(mitProbe.length >= 1, 'Positivkontrolle: es gibt eine Stufe, die als ueberfluessig gefuehrt wird');
  assert.deepEqual(abweichendeErgebnisseOhneStufe(STUFEN), [],
    'Eine als „ueberfluessig" gefuehrte Stufe ist in Wahrheit TRAGEND. Das ist der gefaehrliche '
    + 'Fall: sie traegt etwas, und nichts macht sie rot, wenn sie ausfaellt. Einordnung korrigieren '
    + 'und die Luecke ausdruecklich benennen.');
});

test('[Negativprobe] u2-108: eine tragende Stufe wuerde auffallen', () => {
  // MUTATION: ein Eintrag, dessen beide Wege verschieden ausgehen.
  const erfunden = [{ nach: 99, vorbeiAnStufe: {
    mit:  () => ({ schemaVersion: 41, sektoren: { a: { x: 'eins' } }, menschen: [], verwalteteDepots: [] }),
    ohne: () => ({ schemaVersion: 41, sektoren: { a: { x: 'zwei' } }, menschen: [], verwalteteDepots: [] }),
  } }];
  assert.equal(abweichendeErgebnisseOhneStufe(erfunden).length, 1,
    'unterschiedliche Ergebnisse MUESSEN auffallen — sonst prueft die Unterscheidung nichts');
});

test('[Bilanz] die Deckung der Kette wird BENANNT, nicht geglaettet', () => {
  const gesamt = STUFEN.length;
  assert.equal(MIT_PROBE.length + MIT_VERWEIS.length + NICHT_PRUEFBAR.length, gesamt,
    'jede Stufe faellt in genau eine Klasse');
  // Gepinnt: die Zahl der NICHT belegbaren Stufen kann nicht still wachsen.
  assert.equal(NICHT_PRUEFBAR.length, 1,
    'Waechst diese Zahl, ist eine weitere Stufe von aussen nicht mehr belegbar — das gehoert '
    + 'benannt und begruendet, nicht nebenbei gehoben.');
  for (const s of NICHT_PRUEFBAR) {
    assert.ok(typeof s.nichtPruefbar === 'string' && s.nichtPruefbar.length > 40,
      '→ ' + s.nach + ': „nicht pruefbar" braucht einen GEMESSENEN Grund, keine Floskel');
  }
  console.log('\n  Ketten-Deckung: ' + MIT_PROBE.length + ' mit eigener Probe · '
    + MIT_VERWEIS.length + ' ueber eine eigene Testdatei · ' + NICHT_PRUEFBAR.length
    + ' nicht pruefbar (begruendet) · ' + gesamt + ' Stufen gesamt\n');
});

/* ── Verweis-Deckung sichtbar halten ─────────────────────────────────────── */
test('[Deckung] Stufen mit `geprueftIn` zeigen auf eine Datei, die es gibt', () => {
  const fs = require('node:fs'), path = require('node:path');
  const fehlend = MIT_VERWEIS
    .filter(s => !fs.existsSync(path.join(__dirname, '..', s.geprueftIn)))
    .map(s => '→ ' + s.nach + ' verweist auf ' + s.geprueftIn);
  assert.deepEqual(fehlend, [],
    'Ein Verweis auf eine Testdatei, die es nicht gibt, ist dieselbe Klasse wie eine falsche '
    + 'Zusage im Kommentar (U2-ADR-106).');
  assert.ok(MIT_VERWEIS.length >= 1, 'Positivkontrolle: es gibt Verweis-Eintraege');
});

/* ── Rotmachbarkeit gegen eine ECHTE kaputte Migration („Pruefebene, zweiter
   Durchgang", Zug 4a, 13.08.2026) ──────────────────────────────────────────────────────
   Bisher bewies nur `schema-governance-guard.test.js`s eine Migration mutiert absichtlich
   und zeigt Rot — die Migrationsassistent-Altdepots-Auftrag (12.08.2026) hatte dieselbe Probe
   für DIESE Datei (38 Stufen, je mit `vorher`/`nachher`) vorgesehen, sie entfiel aber (Zug 1
   des dortigen Auftrags wurde durch den Zug-0-Befund gegenstandslos) und wurde nie nachgeholt.
   Ohne diese Probe ist unbewiesen, dass ein kaputter EINZELSCHRITT hier wirklich auffällt,
   statt dass Stufe 25 zufällig immer bestünde. Bricht Stufe 25 (24→25, impfungen/implantate:
   codiert → Klartext) in einer KOPIE der echten HTML — derselbe `KERN_HTML_PATH`-Umlenkweg wie
   bei den Wächter-Proben — und belegt, dass die Migration dann NICHT mehr ihre `nachher`-Zusage
   einlöst. */
test('[Rotmachbarkeit] eine absichtlich kaputte Stufe 25 loest ihre nachher-Zusage NICHT mehr ein', () => {
  const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const REPO = path.join(__dirname, '..');
  const alt = "if (istCodierterWert(_g25[fid])) _g25[fid] = _g25[fid].anzeigeName;";
  const neuKaputt = "if (false && istCodierterWert(_g25[fid])) _g25[fid] = _g25[fid].anzeigeName;";
  const quelle = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(quelle.split(alt).length - 1, 1, 'Anker fuer Stufe 25 nicht mehr eindeutig — Test nachziehen');

  const laufSkript = `
    const { ladeKern } = require(${JSON.stringify(path.join(__dirname, 'load-kern.js'))});
    const { STUFEN } = require(${JSON.stringify(path.join(__dirname, 'fixtures', 'migrations-stufen.js'))});
    const s = STUFEN.find(x => x.nach === 25);
    const { V } = ladeKern();
    const alt = s.baue();
    const neu = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
    process.stdout.write(JSON.stringify({ nachherWahr: !!s.nachher(neu) }));
  `;

  const pruefe = (html) => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'w-migration-rot-')), 'vivodepot.html');
    fs.writeFileSync(tmp, html);
    try {
      const out = execFileSync('node', ['-e', laufSkript], { cwd: REPO, encoding: 'utf8', env: { ...process.env, KERN_HTML_PATH: tmp } });
      return JSON.parse(out);
    } finally {
      fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
    }
  };

  const echtesErgebnis = pruefe(quelle);
  assert.equal(echtesErgebnis.nachherWahr, true, 'Positivkontrolle: die UNVERAENDERTE Stufe muss ihre Zusage einloesen');

  const kaputt = quelle.replace(alt, neuKaputt);
  const kaputtesErgebnis = pruefe(kaputt);
  assert.equal(kaputtesErgebnis.nachherWahr, false,
    'ROT ERWARTET, wenn falsch: eine kaputte Migrationsstufe muss ihre nachher-Zusage verfehlen — ' +
    'sonst waere unbewiesen, dass migration-stufen.test.js einen echten Ausfall ueberhaupt bemerkt.');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-108 nennt diese drei Pruefungen', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'u2-108-jede-stufe-loest-ihre-zusage-ein',            diskriminante: stufenOhneWirkung },
    { fuer: 'u2-108-jede-stufe-ist-vor-der-migration-noch-offen', diskriminante: stufenOhneVorherZustand },
    { fuer: 'u2-108-eine-uebersprungene-stufe-aendert-nichts-wenn-sie-ueberfluessig-heisst',
      diskriminante: abweichendeErgebnisseOhneStufe },
  ],
};
