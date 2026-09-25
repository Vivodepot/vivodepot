'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-111 — der Wechselmoment: ein Prädikat, zwei Aufrufer, ein Wächter
   ────────────────────────────────────────────────────────────────────────
   BEFUND (26.07.2026, empirisch mit Positivkontrolle): eine Instrument-Zeile vom Typ
   `enduring-power-of-attorney` mit gefülltem `zvr_nummer`, Typ auf `testament` gewechselt — der
   Wert BLEIBT gespeichert, die Sichtbarkeit kippt von `true` auf `false`, und NIEMAND
   FRAGT. 41 Unterfelder können so verwaisen; elf davon kamen mit U2-ADR-109 an einem
   einzigen Nachmittag dazu.

   DER WÄCHTER IST DER EIGENTLICHE ERTRAG, nicht der Handler. Er macht aus der 41 eine
   Aussage über die FLÄCHE statt über den Aufwand: weil das Prädikat generisch an der
   Felddefinition hängt, ist der zweiundvierzigste Fall automatisch gedeckt — und der
   Wächter wird rot, falls ein leitfeld-getriebenes Feld doch einmal durchfällt.
   Dieselbe Form wie der Schema-Governance-Wächter: der nächste Fall kann nicht
   vergessen werden.

   ES WIRD NICHTS GELÖSCHT — das ist keine Nachlässigkeit, sondern die Verwaisungsregel
   des Datenmodell-Konzepts. Die Rückfrage ist eine SICHTBARKEITS-Ankündigung.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-111';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'u2-111-jedes-leitfeld-getriebene-feld-ist-erfasst',
  'u2-111-wechsel-nimmt-nichts-weg-und-fragt-nur-bei-betroffenen',
  'u2-111-import-meldet-und-normalisiert-nicht',
];

const INSTR = ['advanceCare', 'provisionInstruments'];
const feldVon = (V, s, f) => V.feldDefFuer(s, f);

/* ── Probe 1 · DER WÄCHTER ────────────────────────────────────────────────── */
/* Diskriminante: welches leitfeld-getriebene Unterfeld wird vom Prädikat NICHT erfasst?
   Für jedes gegatete Feld wird ein Zustand konstruiert, in dem es gefüllt und unsichtbar ist —
   das Prädikat MUSS es dann melden. Ein Feld, das dabei durchfällt, wäre genau der Fall, den
   der Handler still übergeht. */
function nichtErfassteFelder(V) {
  const durchgefallen = [];
  for (const s of V.SEKTOREN) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.typ !== 'liste' || !Array.isArray(f.unterFelder)) continue;
        for (const u of f.unterFelder) {
          const g = u.sichtbarWenn || u.verborgenWenn;
          if (!g || !g.feld) continue;
          const leitDef = f.unterFelder.find(x => x.id === g.feld);
          if (!leitDef || !Array.isArray(leitDef.optionen)) continue;   // Wertemenge unbekannt
          // Ein Leitfeld-Wert, bei dem `u` UNSICHTBAR ist — sonst kann es nie verwaisen.
          const versteckenderWert = leitDef.optionen
            .map(o => o.wert).find(w => !V.feldSichtbar(u, { [g.feld]: w }));
          if (versteckenderWert === undefined) continue;                // kann nicht verwaisen
          const zeile = { [g.feld]: versteckenderWert, [u.id]: _fuellwert(u) };
          const gemeldet = V.zeileVerwaisteFelder(f, zeile).some(v => v.id === u.id);
          if (!gemeldet) durchgefallen.push(s.id + '.' + f.id + ' / ' + u.id
            + ' (bei ' + g.feld + '=' + versteckenderWert + ' unsichtbar, aber NICHT gemeldet)');
        }
      }
    }
  }
  return durchgefallen;
}
// Ein Wert, den `feldEingetragen` für diesen Typ als „gefüllt" anerkennt.
function _fuellwert(u) {
  if (u.typ === 'auswahl' && Array.isArray(u.optionen) && u.optionen.length) return u.optionen[0].wert;
  if (u.typ === 'mehrfachauswahl') return [(u.optionen && u.optionen[0] || {}).wert || 'x'];
  if (u.typ === 'ref') return { ref: '', override: 'Testwert' };
  if (u.typ === 'refMehrfach') return [{ ref: '', override: 'Testwert' }];
  if (u.typ === 'datum') return '2020-01-01';
  return 'Testwert';
}

test('u2-111-jedes-leitfeld-getriebene-feld-ist-erfasst', () => {
  const { V } = ladeKern();
  // Positivkontrolle: der Suchraum ist besetzt — sonst liefe der Wächter über nichts.
  let gegatet = 0;
  for (const s of V.SEKTOREN) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
    if (f.typ === 'liste' && Array.isArray(f.unterFelder)) {
      gegatet += f.unterFelder.filter(u => u.sichtbarWenn || u.verborgenWenn).length;
    }
  }
  assert.ok(gegatet >= 40, 'Positivkontrolle: ' + gegatet + ' gegatete Unterfelder im Modell');
  assert.deepEqual(nichtErfassteFelder(V), [],
    'Ein leitfeld-getriebenes Feld wird vom Wechselmoment-Prädikat NICHT erfasst. Genau das darf '
    + 'nicht passieren: der Handler ist generisch, damit auch der nächste Datenmodell-Zug gedeckt '
    + 'ist, ohne dass jemand daran denkt.');
});

test('[Negativprobe] u2-111-Waechter: ein nicht erfasstes Feld faellt auf', () => {
  const { V } = ladeKern();
  // MUTATION: ein Feld, dessen Gate das Prädikat nicht kennt — hier nachgestellt, indem der
  // Zustand direkt gegen das Prädikat gehalten wird.
  const feld = { unterFelder: [
    { id: 'leit', typ: 'auswahl', optionen: [{ wert: 'a' }, { wert: 'b' }] },
    { id: 'abhaengig', typ: 'text', sichtbarWenn: { feld: 'leit', wert: 'a' } },
  ] };
  const verwaist = V.zeileVerwaisteFelder(feld, { leit: 'b', abhaengig: 'Wert' });
  assert.equal(verwaist.length, 1, 'das Prädikat MUSS ein unsichtbares, gefülltes Feld melden');
  assert.equal(verwaist[0].id, 'abhaengig');
  // Und es meldet NICHT, was sichtbar ist (sonst fragte der Handler bei jedem Speichern).
  assert.deepEqual((V.zeileVerwaisteFelder(feld, { leit: 'a', abhaengig: 'Wert' })), [],
    'ein sichtbares Feld darf NICHT gemeldet werden');
});

/* ── Probe 2 · der Wechsel nimmt nichts weg, und fragt nur bei Betroffenen ── */
function wechselVerstoesse(V) {
  const fehler = [];
  const feld = feldVon(V, INSTR[0], INSTR[1]);

  // (a) Wechsel MIT betroffenem Unterfeld → gemeldet, Wert bleibt
  const mit = { instrument: 'will', centralRegisterOfPowersOf: 'ZVR-9' };
  const v = V.zeileVerwaisteFelder(feld, mit);
  if (!v.length) fehler.push('Wechsel mit betroffenem Unterfeld wird NICHT gemeldet');
  if (mit.centralRegisterOfPowersOf !== 'ZVR-9') fehler.push('das Prädikat hat den Wert VERÄNDERT — es muss rein lesen');

  // (b) Wechsel OHNE betroffenes Unterfeld → NICHT gemeldet (kein Über-Fragen)
  const ohne = { instrument: 'will', storageLocation: 'Tresor' };
  if (V.zeileVerwaisteFelder(feld, ohne).length) fehler.push('ohne betroffenes Unterfeld wird trotzdem gefragt (Über-Fragen)');

  // (c) Der Text nennt Labels, keine Feld-ids — Bürgerinnen-Sprache
  const text = V.wechselmomentText(feld, mit, v);
  if (/centralRegisterOfPowersOf|typ:|\{art\}|\{felder\}/.test(text)) fehler.push('der Text zeigt Datenmodell-Vokabular: ' + text);
  if (!/gehen nicht verloren/.test(text)) fehler.push('der Text sagt nicht, dass nichts verlorengeht');
  // Zwei Sätze — der Prüfstein aus dem Auftrag.
  const saetze = text.split(/(?<=\.)\s+/).filter(Boolean);
  if (saetze.length !== 2) fehler.push('der Hinweis hat ' + saetze.length + ' Sätze statt zwei');
  return fehler;
}

test('u2-111-wechsel-nimmt-nichts-weg-und-fragt-nur-bei-betroffenen', () => {
  const { V } = ladeKern();
  assert.deepEqual(wechselVerstoesse(V), [],
    'Der Wechselmoment fragt nur, wenn wirklich etwas aus der Anzeige fällt — und er nimmt in '
    + 'keinem Fall etwas weg. Die Rückfrage ist eine Sichtbarkeits-Ankündigung.');
});

/* ── Probe 3 · Import: melden, nicht normalisieren ────────────────────────── */
function importVerstoesse(V) {
  const fehler = [];
  const plan = { zeilen: [], listen: [{ sektorId: INSTR[0], feldId: INSTR[1], label: 'Instrumente', anzahl: 2,
    eintraege: [
      { instrument: 'will', typeOfPowerOfAttorney: 'vorsorge' },              // inkonsistent
      { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge' },      // POSITIVKONTROLLE: konsistent
    ] }] };
  const vorher = JSON.stringify(plan);
  const hinweise = V.importSichtbarkeitsHinweise(plan);
  if (hinweise.length !== 1) fehler.push('erwartet GENAU einen Hinweis (nur die inkonsistente Zeile), gefunden ' + hinweise.length);
  if (JSON.stringify(plan) !== vorher) fehler.push('der Plan wurde VERÄNDERT — es darf nichts normalisiert werden');
  if (hinweise.length && !/gehen nicht verloren/.test(hinweise[0])) {
    fehler.push('der Import-Hinweis sagt nicht, dass nichts verlorengeht');
  }
  return fehler;
}

test('u2-111-import-meldet-und-normalisiert-nicht', () => {
  const { V } = ladeKern();
  assert.deepEqual(importVerstoesse(V), [],
    'Der Import meldet die Sichtbarkeits-Lücke und lässt die Zeile VOLLSTÄNDIG herein. Normalisieren '
    + 'wäre stiller Datenverlust — dieselbe Form, die heute schon zweimal als Fehler gefunden wurde.');
});

test('[Negativprobe] u2-111-Import: eine Normalisierung wuerde auffallen', () => {
  const { V } = ladeKern();
  const feld = feldVon(V, INSTR[0], INSTR[1]);
  const zeile = { instrument: 'will', typeOfPowerOfAttorney: 'vorsorge' };
  // MUTATION: normalisieren, also den unpassenden Wert entfernen — genau das ist verboten.
  const normalisiert = Object.assign({}, zeile); delete normalisiert.typeOfPowerOfAttorney;
  assert.equal(V.zeileVerwaisteFelder(feld, normalisiert).length, 0,
    'nach dem Entfernen meldet das Prädikat nichts mehr — der Hinweis wäre weg UND der Wert auch');
  assert.equal(V.zeileVerwaisteFelder(feld, zeile).length, 1,
    'unverändert bleibt der Wert erhalten UND der Hinweis erscheint — das ist der gewollte Zustand');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-111 nennt diese drei Pruefungen', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'u2-111-jedes-leitfeld-getriebene-feld-ist-erfasst', diskriminante: nichtErfassteFelder },
    { fuer: 'u2-111-wechsel-nimmt-nichts-weg-und-fragt-nur-bei-betroffenen', diskriminante: wechselVerstoesse },
    { fuer: 'u2-111-import-meldet-und-normalisiert-nicht',       diskriminante: importVerstoesse },
  ],
};
