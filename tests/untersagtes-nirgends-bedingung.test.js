'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-102 — „Was untersagt ist, erscheint auf keinem Anzeige- oder
   Ausgabepfad als Bedingung."
   ────────────────────────────────────────────────────────────────────────
   Anlass (Gerätetest v76 / Daten-Hygiene-Messung 26.07.): Die Lese-App zeigte
   der VERTRAUENSPERSON „Ich untersage jede KI-gestützte Nachbildung meiner
   Person nach meinem Tod." und direkt dahinter die Bedingungen, unter denen es
   erlaubt wäre. Diese Sicht wird im Ernstfall gelesen, von Menschen, die nicht
   mehr nachfragen können.

   ZWEI Richtungen, beide tragend — der Wächter prüft BEIDE, weil eine allein
   in die jeweils andere Falle liefe:
     • bei `untersagung` erscheint KEINE Bedingung
     • fehlt die Grundentscheidung, erscheint WEITERHIN ALLES
   Die zweite Richtung hält U2-ADR-100 §6 offen: dort verschwanden beim
   Spiegeln der Kern-Kürzung sechzehn von dreiundzwanzig Unterfeldern. Felder
   dürfen nicht aus MANGEL AN INFORMATION verschwinden, nur aus ausdrücklicher
   Rücknahme. Ein Positiv-Gate hätte genau das gebrochen.

   Kopplung nach operating-manual §7.5: Wächter und Negativprobe rufen dieselbe
   Diskriminante; die Probe wiederholt kein Muster.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-102';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = ['u2-102-lese-app-zeigt-keine-bedingung-bei-untersagung'];

// Werte der Folgefelder + der Text, an dem man sie in der Anzeige erkennt.
const BEDINGUNGEN = {
  purpose:                    [['trauer'],                'Trauerbegleitung'],
  authorizedParties:          ['benannte',                'namentlich benannte Personen'],
  scope:                      ['privat',                  'privater Raum'],
  permittedDataTypes:         [['sprache'],               'Sprachaufnahmen'],
  timeLimit:                  ['jahre',                   'Löschung nach einer bestimmten Anzahl Jahre'],
  numberOfYears:               ['zehn',                    'zehn'],
  behaviouralLimit:           ['belegt',                  'nur belegtes Material'],
  digitalEstateAdministration: ['benannt',                 'bevollmächtigt zum Pausieren'],
};

function zeileVoll(grundentscheidung) {
  const z = { id: 'ki1', typ: 'ki-verfuegung' };
  if (grundentscheidung) z.basicDecision = grundentscheidung;
  for (const [id, [wert]] of Object.entries(BEDINGUNGEN)) z[id] = wert;
  return z;
}

function anzeigeText(V, grundentscheidung) {
  V.setData({
    schemaVersion: 31,
    sektoren: { advanceCare: { provisionInstruments: [zeileVoll(grundentscheidung)] }, administration: {}, identity: {} },
    menschen: [],
  });
  return V.sektorHTML('advanceCare').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

/* ── DIE DISKRIMINANTE — geteilt zwischen Wächter und Probe ───────────────── */
// Liefert die Verstoesse als Liste: sichtbare Bedingungen trotz Untersagung,
// PLUS verschwundene Bedingungen, wo gar keine Untersagung vorliegt.
function untersagungsVerstoesse(V) {
  const verstoesse = [];
  const beiUntersagung = anzeigeText(V, 'untersagung');
  for (const [id, [, marker]] of Object.entries(BEDINGUNGEN)) {
    if (beiUntersagung.includes(marker)) verstoesse.push('trotz Untersagung sichtbar: ' + id + ' („' + marker + '")');
  }
  const ohneEntscheidung = anzeigeText(V, null);
  for (const [id, [, marker]] of Object.entries(BEDINGUNGEN)) {
    if (!ohneEntscheidung.includes(marker)) verstoesse.push('ohne Grundentscheidung UNSICHTBAR (U2-ADR-100 §6): ' + id);
  }
  return verstoesse;
}

/* ── Wächter ─────────────────────────────────────────────────────────────── */
test('u2-102-lese-app-zeigt-keine-bedingung-bei-untersagung', () => {
  const { V } = ladeLesen();
  assert.deepEqual(untersagungsVerstoesse(V), [],
    'U2-ADR-102: die Vertrauensperson darf neben „Ich untersage …" keine Erlaubnis-Bedingung lesen '
    + '— und ohne Grundentscheidung darf nichts verschwinden.');
  // Die Untersagung selbst BLEIBT stehen: sie ist die Aussage, nicht ihre Bedingung.
  assert.ok(anzeigeText(V, 'untersagung').includes('Ich untersage jede KI-gestützte Nachbildung'),
    'die Untersagung selbst muss sichtbar bleiben — sonst stünde die Zeile leer da');
});

/* ── Negativprobe, gekoppelt (operating-manual §7.5) ──────────────────────── */
test('[Negativprobe] u2-102 feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const { V } = ladeLesen();
  assert.deepEqual(untersagungsVerstoesse(V), [], 'Rückstellung: unverändert muss der Wächter grün sein');

  const feld = (() => {
    for (const s of V.SEKTOREN) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || []))
      if (f.id === 'provisionInstruments') return f;
  })();
  const ziel = (feld.unterFelder || []).find(u => u.id === 'scope');
  assert.ok(ziel && ziel.verborgenWenn, 'Anker-Feld ki_raum trägt kein verborgenWenn — Probe misst sonst nichts');

  // MUTATION 1: das Gate an einem Feld entfernen -> es wird trotz Untersagung sichtbar.
  const merk = ziel.verborgenWenn;
  delete ziel.verborgenWenn;
  const rot1 = untersagungsVerstoesse(V);
  assert.ok(rot1.some(v => v.includes('trotz Untersagung sichtbar: scope')),
    'entferntes Gate muss als Verstoß erscheinen, war: ' + JSON.stringify(rot1));
  assert.equal(rot1.length, 1, 'und NUR dieser eine — die Diskriminante darf nicht streuen');
  ziel.verborgenWenn = merk;
  assert.deepEqual(untersagungsVerstoesse(V), [], 'Rückstellung nach Mutation 1 fehlgeschlagen');

  // MUTATION 2: aus dem Negativ- ein POSITIV-Gate machen (der Fehler, den U2-ADR-102 §2
  // ausschließt) -> ohne Grundentscheidung verschwindet das Feld, U2-ADR-100 §6 bricht.
  ziel.verborgenWenn = { feld: 'basicDecision', wert: [undefined, 'untersagung'] };
  const rot2 = untersagungsVerstoesse(V);
  assert.ok(rot2.some(v => v.includes('ohne Grundentscheidung UNSICHTBAR')),
    'ein Positiv-Gate muss die zweite Richtung rot machen, war: ' + JSON.stringify(rot2));
  ziel.verborgenWenn = merk;
  assert.deepEqual(untersagungsVerstoesse(V), [], 'Rückstellung nach Mutation 2 fehlgeschlagen');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-102 nennt diese Pruefung', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

module.exports = {
  PROBEN: [{ fuer: 'u2-102-lese-app-zeigt-keine-bedingung-bei-untersagung', diskriminante: untersagungsVerstoesse }],
};
