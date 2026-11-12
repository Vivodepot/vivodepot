'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Geburt verweist auf Krisenvorsorge (Auftrag „Krisenvorsorge
   Sichtbarkeit", Zug 3, 10.08.2026; neuer Ort seit C14, 07.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Bis C14 trug der Kindergeld-Schritt des Geburts-Assistenten einen Hilfetext:
   mit einem weiteren Familienmitglied ändert sich der Notvorrat, die Rechnung
   in Krisenvorsorge passt sich an. Seit C14 (Assistenten-Urteil W03, Wort vom
   07.11.2026) fragt der Assistent nur noch nach dem Kind; der
   Kindergeld-Schritt ist entfallen. Der Verweis zieht ohne neuen Satz an das
   Blatt „Geburt“, auf dem der Assistent endet: ein Chip mit dem Namen des
   Bereichs, der auf die Personenzahl der Bedarfsrechnung springt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

function blattGeburt(V, document) {
  V.renderSituation('geburt');
  return document.getElementById('content').innerHTML;
}

test('[Geburt·Krisenvorsorge] das Blatt „Geburt“ trägt den Chip zum Bereich Krisenvorsorge, Ziel ist die Personenzahl', () => {
  const { V, document } = ladeKern();
  const html = blattGeburt(V, document);
  const m = /<button type="button" class="chip" data-verweis-bereich="emergencyPreparedness"[^>]*>([^<]*)<\/button>/.exec(html);
  assert.ok(m, 'der Chip steht im Blatt');
  assert.match(m[0], /data-klick-sektor="emergencyPreparedness"/);
  assert.match(m[0], /data-klick-feld="numberOfPeopleForTheSupply"/, 'der Sprung landet bei der Personenzahl');
  assert.equal(m[1], V.SEKTOR_BY_ID.emergencyPreparedness.label + ' ›', 'der Name des Bereichs, kein Satz');
  assert.ok(!/Liter|BBK/.test(html), 'keine Wiederholung der BBK-Systematik im Blatt');
});

test('[Geburt·Krisenvorsorge] der Geburts-Assistent endet auf diesem Blatt: drei Schritte zum Kind, Ziel ist die Situation „Geburt“', () => {
  const { V } = ladeKern();
  const def = V.WIZARD_BY_ID.gebwiz;
  assert.ok(def, 'gebwiz registriert');
  assert.deepEqual(def.schritte.map((s) => s.feld && s.feld.id),
    ['guidedBirthEntryChildsNameNot', 'guidedBirthEntryDateOfBirthNot', 'guidedBirthEntryRelationship']);
  assert.equal(def.ziel.situation, 'geburt', 'nach „Fertig“ öffnet das Blatt „Geburt“ (wizardAbschluss → oeffneSituation)');
});

test('[Geburt·Krisenvorsorge·Rot-Beweis] ohne den Verweis in der Quelle steht kein Chip im Blatt', () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'buergermodul-situationen-ab-werk.json'), 'utf8'));
  assert.ok(Array.isArray(j.situationen.geburt.verweisBereiche), 'Vorbedingung: die Quelle trägt den Verweis');
  const { _standardProduktBaken } = require('./load-kern.js');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const gebacken = _standardProduktBaken(kern);
  const anker = '/* AB_WERK_SITUATIONEN_QUELLEN:BEGIN */\nconst AB_WERK_SITUATIONEN_QUELLEN = ';
  const i = gebacken.indexOf(anker);
  assert.ok(i >= 0, 'Anker der Situations-Quelle');
  const start = i + anker.length;
  const ende = gebacken.indexOf(';\n/* AB_WERK_SITUATIONEN_QUELLEN:END */', start);
  const quellen = JSON.parse(gebacken.slice(start, ende));
  const mod = quellen.find((q) => q && q.situationen && q.situationen.geburt);
  assert.ok(mod && mod.situationen.geburt.verweisBereiche, 'Vorbedingung: die gebackene Quelle trägt den Verweis');
  delete mod.situationen.geburt.verweisBereiche;
  const tmp = path.join(os.tmpdir(), 'geburt-verweis-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, gebacken.slice(0, start) + JSON.stringify(quellen) + gebacken.slice(ende));
  try {
    const { V, document } = ladeKern({ htmlPfad: tmp });
    assert.ok(!blattGeburt(V, document).includes('data-verweis-bereich='), 'ohne Verweis kein Chip');
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
