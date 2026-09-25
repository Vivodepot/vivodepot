'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Lese-App zeigt in der Listen-Zusammenfassung ALLE gefüllten Felder.
   ────────────────────────────────────────────────────────────────────────
   Bewusst KEINE Parität mit dem Kern an dieser Stelle — das ist der Kern
   dieses Tests und der Grund, warum er so heißt und nicht mehr
   „…-paritaet".

   VORGESCHICHTE, weil sie die Regel erklärt: Am 23.07.2026 fiel auf, dass
   die Lese-App `zusammenfassungFelder` und
   `unterdrueckeInZusammenfassungWennGesetzt` in ihren Deklarationen trug,
   ihre Zusammenfassung sie aber nicht auswertete. Das sah nach einem
   Paritäts-Bruch aus. Der Versuch, ihn zu schliessen, zeigte das
   Gegenteil: Mit der Kürzung verschwanden SECHZEHN von dreiundzwanzig
   Unterfeldern — darunter der Ablageort ALLER Instrumente und die
   ZVR-Nummer, über die ein Gericht die Vollmacht überhaupt erst findet.

   Der Kern darf kürzen, weil daneben die Zeilen-Detailansicht steht: Was
   die Kurzzeile weglässt, ist einen Klick entfernt. Die Lese-App hat sie
   nicht — dort ist die Zusammenfassung die einzige Sicht. Gleiche
   Mechanik, ungleiche Information.

   Die beiden Flags sind darum aus den Lese-App-Deklarationen ENTFERNT,
   mit Begründung am Ort. Dieser Test hält fest, dass das so bleibt:
   Wer sie wieder einzieht, nimmt der Sicht, die eine Institution liest,
   ihre wichtigsten Angaben.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const feldVon = (V, sektorId, feldId) => (V.SEKTOR_BY_ID[sektorId].sektionen || [])
  .flatMap(s => s.felder || []).find(f => f.id === feldId);
const leseApp = () => { const Lr = ladeLesen(); return Lr.V || Lr; };

/* DIE DISKRIMINANTEN — geteilt zwischen Waechter und Negativprobe (§7.5).
   Vorher rechneten beide Waechter inline: sie konnten gruen sein, ohne dass je
   jemand gesehen haette, dass sie rot werden KOENNEN. */
function kuerzungsFlags(L) {
  const treffer = [];
  for (const s of Object.values(L.SEKTOR_BY_ID || {})) {
    for (const sek of s.sektionen || []) {
      for (const f of sek.felder || []) {
        if (Array.isArray(f.zusammenfassungFelder)) treffer.push(s.id + '.' + f.id + ': zusammenfassungFelder');
        for (const u of f.unterFelder || []) {
          if (u.unterdrueckeInZusammenfassungWennGesetzt) {
            treffer.push(s.id + '.' + f.id + '.' + u.id + ': unterdrueckeInZusammenfassungWennGesetzt');
          }
        }
      }
    }
  }
  return treffer;
}

test('[ZusVoll] die Lese-App traegt KEINE Kuerzungs-Flags in ihren Deklarationen', () => {
  const treffer = kuerzungsFlags(leseApp());
  assert.equal(treffer.join('\n'), '',
    'Diese Flags kuerzen die Zusammenfassung. In der Lese-App ist sie die EINZIGE Sicht auf den '
    + 'Eintrag — hier zu kuerzen heisst zu verbergen. Wer kuerzen will, braucht zuerst eine '
    + 'Detailansicht:\n' + treffer.join('\n'));
});

test('[ZusVoll] der Ablageort erscheint — bei JEDEM Instrument-Typ', () => {
  const L = leseApp();
  const f = feldVon(L, 'advanceCare', 'provisionInstruments');
  const typen = ((f.unterFelder || []).find(u => u.id === 'instrument').optionen || []).map(o => o.wert);
  const ORT = 'beim Notariat Dr. Sommer';
  const fehlt = typen.filter(t => !L.listenEintragZusammenfassung(f, { id: 'x', instrument: t, storageLocation: ORT }).includes(ORT));
  assert.equal(fehlt.join(', '), '',
    'Der Ablageort ist die Kernauskunft des Vorsorge-Bereichs — „wo liegt es". Fehlt er beim '
    + 'Vorzeigen, hat das Festhalten seinen Zweck verloren: ' + fehlt.join(', '));
});

function unsichtbareUnterfelder(L) {
  const f = feldVon(L, 'advanceCare', 'provisionInstruments');
  const fehlt = [];
  for (const u of f.unterFelder || []) {
    if (u.typ === 'hinweis') continue;                    // traegt keinen Wert
    let wert, erwartet;
    if (u.typ === 'auswahl') { const o = (u.optionen || [])[0]; if (!o) continue; wert = o.wert; erwartet = o.label; }
    else if (u.typ === 'datum') { wert = '2026-01-01'; erwartet = '2026-01-01'; }
    else if (u.typ === 'ref' || u.typ === 'refMehrfach') continue;   // brauchen ein Register
    else { wert = 'Probe-' + u.id; erwartet = wert; }
    const z = L.listenEintragZusammenfassung(f, { id: 'x', [u.id]: wert });
    if (!z.includes(erwartet)) fehlt.push(u.id);
  }
  return fehlt;
}

test('[ZusVoll] JEDES deklarierte Unterfeld erscheint, wenn es gefuellt ist', () => {
  /* Generisch statt an einzelnen Feldern: So waechst die Zusicherung mit. Ein Unterfeld, das
     spaeter dazukommt — etwa `zvr_nummer`, das heute noch Umbau-Rueckstand ist und im
     Paritaets-Test als befristete Ausnahme steht — ist damit automatisch abgedeckt, ohne dass
     jemand daran denken muss.

     (Die erste Fassung dieses Tests pruefte `zvr_nummer` namentlich und schlug fehl, weil das
     Feld in der Lese-App noch gar nicht deklariert ist. Ein Test, der ein nicht existierendes
     Feld einfordert, misst nicht die Anzeige, sondern den Spiegel-Rueckstand — und der hat
     seinen eigenen Ort.) */
  const fehlt = unsichtbareUnterfelder(leseApp());
  assert.equal(fehlt.join(', '), '',
    'Diese Unterfelder fallen aus der Zusammenfassung — in der Lese-App heisst das: fuer die '
    + 'Institution unsichtbar, ohne Hinweis: ' + fehlt.join(', '));
});

test('[ZusVoll] jedes gefuellte Unterfeld kommt an, keines faellt still weg', () => {
  const L = leseApp();
  const f = feldVon(L, 'advanceCare', 'provisionInstruments');
  // Eine Vollmacht mit allem, was an ihr haengen kann.
  const e = { id: 'v', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', form: 'beglaubigt',
    certifyingBody: 'Notariat Sommer', storageLocation: 'Sparkasse', morePreciseDescription: 'nur Konto 4711' };
  const z = L.listenEintragZusammenfassung(f, e);
  const fehlt = ['Sparkasse', 'Notariat Sommer', 'nur Konto 4711'].filter(w => !z.includes(w));
  assert.equal(fehlt.join(', '), '', 'still weggefallen: ' + fehlt.join(', ') + '\n  Zeile: ' + z);
});

/* ── Der Kern bleibt, wie er ist ─────────────────────────────────────────────────────── */

test('[ZusVoll] der KERN kuerzt weiterhin — dort ist es richtig', () => {
  const K = ladeKern().V;
  const f = feldVon(K, 'advanceCare', 'provisionInstruments');
  assert.ok(Array.isArray(f.zusammenfassungFelder),
    'Die Positivliste des Kerns bleibt: Sie entstand am 20.07. gegen eine unlesbar lange Zeile, '
    + 'und im Kern steht die Detailansicht daneben. Diese Entscheidung wird hier NICHT '
    + 'zurueckgenommen — nur nicht gespiegelt.');
  const z = K.listenEintragZusammenfassung(f, { id: 'v', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', storageLocation: 'Sparkasse' });
  assert.ok(!z.includes('Sparkasse'), 'im Kern kuerzt die Positivliste weiterhin: ' + z);
});

/* ── Gegenprobe: Listen ohne Flags waren nie betroffen und sind es weiterhin nicht ──── */

const OHNE_FLAGS = [
  ['finance', 'accounts',            { id: 'k', institution: 'Sparkasse Nord', accountType: 'Girokonto', iban: 'DE02 1234' }],
  ['housing',   'furtherHomes', { id: 'w', streetHouseNumber: 'Seestrasse 4', postcodeCity: '18055 Rostock', serviceCharges: '420' }],
  ['mobility', 'vehicles',       { id: 'f', registrationPlate: 'VW Golf', vehicleRegistrationDocument: 'Handschuhfach' }],
  ['personal', 'personalLettersWordsToPeople', { id: 'b', toWhom: 'meine Tochter Anna', words: 'Liebe Anna, …' }],
];
for (const [sektorId, feldId, eintrag] of OHNE_FLAGS) {
  test('[ZusVoll] Gegenprobe ' + sektorId + '.' + feldId + ' — in beiden Apps gleich', () => {
    const K = ladeKern().V; const L = leseApp();
    const a = K.listenEintragZusammenfassung(feldVon(K, sektorId, feldId), eintrag);
    const b = L.listenEintragZusammenfassung(feldVon(L, sektorId, feldId), eintrag);
    assert.equal(b, a,
      'Listen OHNE Kuerzungs-Flags fassen in beiden Apps identisch zusammen — hier gilt Paritaet '
      + 'sehr wohl:\n  Kern: ' + a + '\n  Lese: ' + b);
    const werte = Object.entries(eintrag).filter(([k]) => k !== 'id').map(([, v]) => String(v));
    const fehlt = werte.filter(w => !b.includes(w));
    assert.equal(fehlt.join(', '), '', 'jeder gefuellte Wert erscheint — diese fehlen: ' + fehlt.join(', '));
  });
}

/* ── Negativproben, gekoppelt (operating-manual §7.5) ────────────────────────
   Beide Waechter behaupten eine LEERE Liste. Ohne diese Proben waere „nichts
   gefunden" von „ueber nichts gelaufen" nicht zu unterscheiden — und genau das ist
   die Klasse, gegen die dieser ganze Strang gebaut ist. Je Mutation zwei Messungen
   mit Rueckstellung, plus eine Positivkontrolle des Suchraums (§3.5b). */
test('[Negativprobe] kuerzungsFlags feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const L = leseApp();
  assert.equal(kuerzungsFlags(L).join('\n'), '', 'Rückstellung: unverändert muss der Wächter grün sein');

  const sektoren = Object.values(L.SEKTOR_BY_ID || {});
  assert.ok(sektoren.length > 0, 'kein Sektor geladen — die Probe liefe über nichts');
  const feld = (() => {
    for (const s of sektoren) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || []))
      if (Array.isArray(f.unterFelder) && f.unterFelder.length) return f;
  })();
  assert.ok(feld, 'kein Listenfeld mit Unterfeldern gefunden — Positivkontrolle des Suchraums');

  // MUTATION 1: das Kuerzungs-Flag auf dem FELD.
  feld.zusammenfassungFelder = ['irgendwas'];
  const rot1 = kuerzungsFlags(L);
  assert.equal(rot1.length, 1, 'genau EIN Treffer erwartet, war: ' + JSON.stringify(rot1));
  assert.match(rot1[0], /zusammenfassungFelder$/, 'und es muss das gesetzte Flag sein');
  delete feld.zusammenfassungFelder;
  assert.equal(kuerzungsFlags(L).join('\n'), '', 'Rückstellung nach Mutation 1 fehlgeschlagen');

  // MUTATION 2: das Unterdrueckungs-Flag auf dem UNTERFELD — der zweite Arm der
  // Diskriminante. Ohne ihn waere die halbe Funktion ungeprueft.
  const uf = feld.unterFelder[0];
  uf.unterdrueckeInZusammenfassungWennGesetzt = true;
  const rot2 = kuerzungsFlags(L);
  assert.equal(rot2.length, 1, 'genau EIN Treffer erwartet, war: ' + JSON.stringify(rot2));
  assert.match(rot2[0], /unterdrueckeInZusammenfassungWennGesetzt$/, 'und es muss der zweite Arm sein');
  delete uf.unterdrueckeInZusammenfassungWennGesetzt;
  assert.equal(kuerzungsFlags(L).join('\n'), '', 'Rückstellung nach Mutation 2 fehlgeschlagen');
});

test('[Negativprobe] unsichtbareUnterfelder feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const L = leseApp();
  assert.equal(unsichtbareUnterfelder(L).join(', '), '', 'Rückstellung: unverändert muss der Wächter grün sein');

  const f = feldVon(L, 'advanceCare', 'provisionInstruments');
  const pruefbar = (f.unterFelder || []).filter(u =>
    u.typ !== 'hinweis' && u.typ !== 'ref' && u.typ !== 'refMehrfach');
  assert.ok(pruefbar.length > 0, 'kein prüfbares Unterfeld — die Probe liefe über nichts');

  // MUTATION: ein deklariertes, GEFUELLTES Unterfeld unsichtbar machen — mit genau
  // dem Mechanismus, den U2-ADR-102 heute eingefuehrt hat. Die Probe-Zeile traegt nur
  // das eine Feld, also trifft eine Bedingung auf ein ABWESENDES Feld mit `undefined`.
  // (Ein erster Anlauf setzte stattdessen einen unbekannten `typ` — der faellt in den
  // Freitext-Zweig und BLEIBT sichtbar; die Mutation griff nicht, und die Probe hat
  // genau das gemeldet, statt gruen zu bleiben.)
  const ziel = pruefbar[0];
  ziel.verborgenWenn = { feld: '__in-der-probe-nicht-gesetzt__', wert: undefined };
  const rot = unsichtbareUnterfelder(L);
  assert.ok(rot.includes(ziel.id), 'das mutierte Unterfeld muss als unsichtbar erscheinen, war: ' + JSON.stringify(rot));
  assert.equal(rot.length, 1, 'und NUR es — die Diskriminante darf nicht streuen: ' + JSON.stringify(rot));
  delete ziel.verborgenWenn;
  assert.equal(unsichtbareUnterfelder(L).join(', '), '', 'Rückstellung fehlgeschlagen');
});

module.exports = {
  PROBEN: [
    { fuer: '[ZusVoll] die Lese-App traegt KEINE Kuerzungs-Flags in ihren Deklarationen', diskriminante: kuerzungsFlags },
    { fuer: '[ZusVoll] JEDES deklarierte Unterfeld erscheint, wenn es gefuellt ist',      diskriminante: unsichtbareUnterfelder },
  ],
};
