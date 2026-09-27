'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kein Sprungziel ohne Ziel.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, vor dem Bau geschrieben und rot.

   DIE ABSCHLUSS-BEDINGUNG DES UMBAUS HAT SICH GEÄNDERT (Freigabe Block H):
   „Keine Doppel-Karte" war trivial erfüllt und prüfte eine Klasse, die es
   nicht gibt — es war nie eine Angabe an zwei Orten ERFASSBAR. An ihre
   Stelle tritt: kein Sprungziel ohne Ziel.

   WAS DIESER TEST FÄNGT: Der Umbau hat die fünf Instrument-Sektionen
   entfernt (`living-will`, `enduring-power-of-attorney`, … sind in die eine
   Liste `provisionInstruments` aufgegangen) und die Navigation dorthin
   stehen lassen. Fünf Regal-Karten springen auf Anker, die nicht mehr
   gerendert werden. Für die Bürgerin heisst das: Antippen, und nichts
   passiert — kein Fehler, keine Meldung, nur Stillstand.

   Das ist nicht die auffälligste Fehlerklasse dieses Tages, aber dieselbe:
   Ein Verweis zeigt ins Leere, und niemand erfährt davon.

   Geprüft wird gegen die Anker, die WIRKLICH gerendert werden —
   `id="sek-<sektion.id>"` für Sektionen, `id="rec-<record.id>"` für
   Listen-Zeilen. Nicht gegen eine Liste im Test: Fällt beim nächsten Umbau
   wieder eine Sektion weg, schlägt diese Prüfung an, ohne dass jemand sie
   anfasst.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

/* Alle Anker, die der Sektor-Bau tatsächlich erzeugt. Sektionen immer; Record-Anker nur,
   wenn ein Listen-Eintrag eine stabile id trägt (U2-ADR-071-Nachtrag). */
function gerenderteAnker(V) {
  const anker = new Set();
  for (const s of Object.values(V.SEKTOR_BY_ID || {})) {
    for (const sek of s.sektionen || []) if (sek && sek.id) anker.add('sek-' + sek.id);
  }
  const d = (V.getData && V.getData()) || {};
  for (const [, inhalt] of Object.entries((d && d.sektoren) || {})) {
    for (const wert of Object.values(inhalt || {})) {
      if (!Array.isArray(wert)) continue;
      for (const e of wert) if (e && e.id) anker.add('rec-' + e.id);
    }
  }
  return anker;
}

/* Die Sprungziele der Regal-Karten, aus dem Modell gelesen statt aus dem HTML geparst:
   Heimat-Karte springt auf ihren Abschnitt, Fremd-Karte in ihren Heimatsektor. */
function regalZiele(V) {
  return (V.VORSORGE_MODULE || []).map(m => {
    const z = V.modulKarteZiel(m);
    return { modul: m.id, titel: m.titel, sektor: z.sektor, anker: z.anker };
  });
}

/* DIE DISKRIMINANTE — geteilt zwischen Waechter und Negativprobe (operating-manual §7.5).
   Vorher stand die Rechnung inline im Test: der Waechter konnte gruen sein, ohne dass je
   jemand gesehen haette, dass er rot werden KANN. Jetzt ruft die Probe dieselbe Funktion. */
function toteSprungziele(V) {
  const anker = gerenderteAnker(V);
  return regalZiele(V).filter(z => !anker.has(z.anker)).map(z => z.titel + '  →  #' + z.anker);
}

test('[Sprung] jede Regal-Karte springt auf einen Anker, den es gibt', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 40, sektoren: { advanceCare: {} }, menschen: [] });
  const tot = toteSprungziele(V);
  assert.equal(tot.join('\n'), '',
    'Diese Regal-Karten zeigen auf Anker, die nirgends gerendert werden. Antippen tut nichts — '
    + 'kein Fehler, keine Meldung, nur Stillstand:\n' + tot.join('\n'));
});

test('[Sprung] auch die Verweis-Karten zeigen auf existierende Anker', () => {
  const { V } = ladeKern();
  // Eine Bankvollmacht anlegen — sie erzeugt die eine Projektion nach finanzen.
  V.setData({ schemaVersion: 40, sektoren: { advanceCare: { provisionInstruments: [
    { id: 'bv-1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', storageLocation: 'Sparkasse' },
  ] } }, menschen: [] });
  const anker = gerenderteAnker(V);
  const karten = V.modulSichtbarkeitsKarten('finance') || [];
  assert.ok(karten.length, 'die Bankvollmacht-Projektion existiert (sonst prueft der Test nichts)');
  const tot = karten
    .map(k => k.verweisAuf.id ? ('rec-' + k.verweisAuf.id) : ('sek-' + k.modul.id))
    .filter(a => !anker.has(a));
  assert.equal(tot.join(', '), '', 'Verweis-Karte ohne Ziel: ' + tot.join(', '));
});

test('[Sprung] ein Instrument OHNE Eintrag springt trotzdem irgendwohin', () => {
  // Der haeufige Fall: Die Karte steht im Regal, obwohl noch nichts hinterlegt ist („keine").
  // Sie muss dann an den Ort fuehren, an dem man es anlegt — nicht ins Leere.
  const { V } = ladeKern();
  V.setData({ schemaVersion: 40, sektoren: { advanceCare: {} }, menschen: [] });
  const anker = gerenderteAnker(V);
  const ohne = regalZiele(V).filter(z => !anker.has(z.anker)).map(z => z.modul);
  assert.equal(ohne.join(', '), '',
    'Ohne Eintrag hat die Karte kein Ziel — dabei ist genau das der Moment, in dem die Buergerin '
    + 'hingeschickt werden muesste: ' + ohne.join(', '));
});

/* ── Der gateFeld-Lesepfad ───────────────────────────────────────────────────────────── */

test('[Sprung] modulKarteStatus liest kein entfallenes Gate-Feld mehr', () => {
  const { V } = ladeKern();
  // Alle sechs Gate-Felder sind mit U2-ADR-096 entfallen; der Pfad las immer undefined.
  // Ein Alt-Depot mit gesetztem Gate darf den Status NICHT mehr bestimmen.
  V.setData({ schemaVersion: 40, sektoren: { advanceCare: {
    testament_vorhanden: 'ja', patientenverf_vorhanden: 'plant', vollmacht_vorhanden: 'ja',
  } }, menschen: [] });
  const status = {};
  for (const m of V.VORSORGE_MODULE || []) status[m.id] = V.modulKarteStatus(m);
  assert.equal(status['testament-erbe'], 'keine',
    'Ein Flachfeld-Rest darf die Karte nicht auf „vorhanden" stellen — die Buergerin koennte ihn '
    + 'nirgends mehr aendern');
  assert.notEqual(status['living-will'], 'in Vorbereitung',
    '„in Vorbereitung" ist mit den Gates entfallen (U2-ADR-096 E2) und darf nicht wiederauftauchen');
});

test('[Sprung] der Status kommt aus dem Record — mit Eintrag „vorhanden", ohne „keine"', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 40, sektoren: { advanceCare: { provisionInstruments: [
    { id: 't1', instrument: 'will', storageLocation: 'beim Notar' },
  ] } }, menschen: [] });
  const s = {};
  for (const m of V.VORSORGE_MODULE || []) s[m.id] = V.modulKarteStatus(m);
  assert.equal(s['testament-erbe'], 'vorhanden', 'mit Record');
  assert.equal(s['patientenverfuegung'], 'keine', 'ohne Record');   // Schlüssel = Modul-Id
  assert.equal(s['sorgerechtsverfuegung'], 'keine', 'ohne Record');
});

/* ── Die leere Sektion und die Kollision ─────────────────────────────────────────────── */

/* Eine Sektion ohne `felder` ist NICHT automatisch leer: Manche tragen ihren Inhalt ueber einen
   eigenen Renderer. Diese Freistellung traegt darum den Beleg, nicht nur den Namen — sonst faengt
   die Pruefung den legitimen Fall mit, und genau daran ist am 23.07. schon eine Sonde gescheitert
   (31 gemeldete Waisen, davon 29 amtlicher Korpus). */
const SEKTION_OHNE_FELDER_OK = {
  'people.menschen-liste':
    'U2-ADR-022: Das Sektor-Listenfeld `menschen` ist entfallen; Bereich 2 rendert das Register '
    + 'data.menschen[] direkt (menschenRegisterHTML). Die Sektion bleibt als Traeger/Ueberschrift.',
  'advanceCare.erbschein-vorbereitung':
    'Auftrag 27.08.2026: der Erbschein-Vorbereitungsauszug liest bestehende Daten aus anderen '
    + 'Sektionen (ERBSCHEIN_MODUL.datenLesen) — kein eigenes Eingabefeld. Eigener Renderer '
    + '(erbscheinAuszugSektionHTML) traegt den Knopf, der das Modul-Dokument oeffnet.',
};

test('[Sprung] keine Sektion ohne Inhalt — eine leere Ueberschrift ist ein Sprungziel ohne Ziel', () => {
  const { V } = ladeKern();
  const leer = [];
  for (const s of Object.values(V.SEKTOR_BY_ID || {})) {
    for (const sek of s.sektionen || []) {
      const key = s.id + '.' + sek.id;
      if ((sek.felder || []).length || SEKTION_OHNE_FELDER_OK[key]) continue;
      leer.push(key + '  \u201e' + sek.label + '\u201c');
    }
  }
  assert.equal(leer.join('\n'), '',
    'Diese Sektionen tragen kein Feld und keinen eigenen Renderer. Wer dorthin springt, landet auf '
    + 'einer Ueberschrift und sonst nichts:\n' + leer.join('\n'));
});

test('[Sprung] jede Freistellung ist noch noetig — sonst muss sie weg', () => {
  const { V } = ladeKern();
  const tot = [];
  for (const key of Object.keys(SEKTION_OHNE_FELDER_OK)) {
    const [sid, sekid] = key.split('.');
    const s = V.SEKTOR_BY_ID[sid];
    const sek = s && (s.sektionen || []).find(x => x.id === sekid);
    if (!sek) { tot.push(key + ': Sektion gibt es nicht mehr'); continue; }
    if ((sek.felder || []).length) tot.push(key + ': traegt wieder Felder');
  }
  assert.equal(tot.join('\n'), '',
    'Diese Freistellungen greifen nicht mehr — streichen, damit die Pruefung vollstaendig bleibt:\n'
    + tot.join('\n'));
});

/* ── Negativprobe, gekoppelt (operating-manual §7.5) ─────────────────────────
   Zwei Messungen je Mutation, mit Rueckstellung: ohne sie waere „0 tote Ziele" von
   „ueber nichts gelaufen" nicht zu unterscheiden. */
test('[Negativprobe] toteSprungziele feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const { V } = ladeKern();
  V.setData({ schemaVersion: 40, sektoren: { advanceCare: {} }, menschen: [] });
  assert.deepEqual(toteSprungziele(V), [], 'Rückstellung: unverändert muss der Wächter grün sein');

  // Positivkontrolle des Suchraums: es gibt ueberhaupt Karten zu pruefen. Ohne das
  // waere die Probe selbst vakuum-gruen (§3.5b).
  assert.ok(regalZiele(V).length > 0, 'kein Regal-Modul gefunden — die Probe liefe über nichts');

  // MUTATION: ein Modul in einen Sektor schicken, den es nicht gibt. modulKarteZiel
  // leitet den Anker aus `m.sektor` + `m.listeId` ab (nicht aus einem `sektion`-Feld —
  // ein erster Anlauf mutierte `modul.sektion`, griff NICHT, und die Probe hat genau
  // das gemeldet statt gruen zu bleiben: eine Mutation, die nicht greift, ist ein
  // Fehlschlag der Probe, kein Beleg).
  const modul = V.VORSORGE_MODULE[0];
  const merk = modul.sektor;
  modul.sektor = '__gibt-es-nicht__';
  const rot = toteSprungziele(V);
  assert.equal(rot.length, 1, 'genau EIN totes Ziel erwartet, war: ' + JSON.stringify(rot));
  assert.match(rot[0], new RegExp(modul.id + '|gibt-es-nicht'), 'und es muss das mutierte sein');
  modul.sektor = merk;
  assert.deepEqual(toteSprungziele(V), [], 'Rückstellung fehlgeschlagen');
});

module.exports = {
  PROBEN: [{ fuer: '[Sprung] jede Regal-Karte springt auf einen Anker, den es gibt', diskriminante: toteSprungziele }],
};
