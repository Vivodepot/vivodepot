'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Bilanz Nr. 5 (Rang 1) — der Import trägt eine Art herein, die es nicht gibt
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN 29.07.2026 gegen u2-kanon @ 2297286, jede Zahl mit Positivkontrolle:

     · Import-Plan:  eine Zeile mit `typ` ausserhalb der Optionsmenge kommt
                     VOLLSTÄNDIG durch — auf keinem Weg wird der Wert geprüft.
     · Danach:       0 Würfe (Selektor, Prädikat, Editor-HTML) — es bricht nichts.
     · Selektor:     0 von 6 gültigen Typwerten treffen die Zeile je.
     · Konsumenten:  alle 11 realen `liste:`-Selektoren zeigen auf
                     `vorsorge_instrumente`.

   DER DEFEKT IST DIE STILLE ABWESENHEIT BEI SICHTBARER ANWESENHEIT. Die Zeile
   steht im Bereich, die Bürgerin sieht sie — und in Notfallkarte, Situations-
   blättern, ICS und Export ist sie nicht. Kein Absturz, keine Meldung, nichts.

   WARUM U2-ADR-111 DAS NICHT DECKT — der entscheidende Punkt. Jenes Prädikat
   fragt „ist ein gefülltes Feld UNSICHTBAR?". Bei `vorsorge_instrumente`
   (`sichtbarWenn`-Gates) schlug es zufällig mit an, sagte aber „bei der
   gewählten Art" — die es gar nicht gibt. Bei `people.childrenAndDependants`, wo alle
   elf Gates `verborgenWenn` sind, meldet es STRUKTURELL NICHTS: ein unbekannter
   Wert versteckt dort nichts, er zeigt alles. Zwei Gate-Formen, zwei Ergebnisse,
   derselbe Defekt — deshalb ein eigenes Prädikat und nicht eine Verbreiterung.

   DIE PROBE IST EIN WÄCHTER, kein Beispiel: sie konstruiert für JEDES typisierte
   Listenfeld des Modells den Fall. Der nächste Datenmodell-Zug ist damit gedeckt,
   ohne dass jemand daran denkt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-114';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'fix-bilanz5-jede-typisierte-liste-meldet-eine-unbekannte-art',
  'fix-bilanz5-fehlende-und-gueltige-art-erzeugen-keinen-hinweis',
  'fix-bilanz5-import-meldet-ersetzt-und-normalisiert-nicht',
];

const UNBEKANNT = 'zzz-diesen-wert-gibt-es-im-modell-nicht';

/* Alle Listenfelder mit einem Leitfeld, das eine Optionsmenge trägt — aus dem Modell
   gelesen, nie aus einer Liste. Genau der Suchraum, über den der Wächter läuft. */
function typisierteListen(V) {
  const raus = [];
  for (const s of V.SEKTOREN) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.typ !== 'liste' || !Array.isArray(f.unterFelder)) continue;
        const leitIds = new Set();
        for (const u of f.unterFelder) {
          const g = u.sichtbarWenn || u.verborgenWenn;
          if (g && g.feld) leitIds.add(g.feld);
        }
        for (const lid of leitIds) {
          const ld = f.unterFelder.find(x => x.id === lid);
          if (ld && Array.isArray(ld.optionen) && ld.optionen.length) {
            raus.push({ sektorId: s.id, feldId: f.id, leit: lid,
              label: ld.label || lid, werte: ld.optionen.map(o => o.wert) });
          }
        }
      }
    }
  }
  return raus;
}

const hinweise = (V, sektorId, feldId, eintraege) =>
  V.importSichtbarkeitsHinweise({ zeilen: [], listen: [{ sektorId, feldId, eintraege }] });

/* ── Probe 1 · DER WÄCHTER ────────────────────────────────────────────────
   Diskriminante: welches typisierte Listenfeld lässt einen unbekannten Leitwert
   still durch? Für jedes wird der Fall konstruiert; jedes MUSS melden, und der
   Satz MUSS den fremden Wert benennen — sonst kann die Bürgerin ihren Eintrag
   nicht wiederfinden. */
function stilleListen(V) {
  const durchgefallen = [];
  for (const t of typisierteListen(V)) {
    const h = hinweise(V, t.sektorId, t.feldId, [{ [t.leit]: UNBEKANNT }]);
    if (!h.length) {
      durchgefallen.push(t.sektorId + '.' + t.feldId + ' / ' + t.leit
        + ' — unbekannter Wert kommt herein und wird NICHT gemeldet');
      continue;
    }
    if (!h.some(x => x.includes(UNBEKANNT))) {
      durchgefallen.push(t.sektorId + '.' + t.feldId + ' / ' + t.leit
        + ' — gemeldet, aber der Satz nennt den fremden Wert nicht: ' + h[0]);
    }
  }
  return durchgefallen;
}

test('fix-bilanz5-jede-typisierte-liste-meldet-eine-unbekannte-art', () => {
  const { V } = ladeKern();
  // Positivkontrolle: der Suchraum ist besetzt — sonst liefe der Wächter über nichts.
  const suchraum = typisierteListen(V);
  assert.ok(suchraum.length >= 2,
    'Positivkontrolle: ' + suchraum.length + ' typisierte Listenfelder im Modell');
  assert.deepEqual(stilleListen(V), [],
    'Ein typisiertes Listenfeld nimmt einen unbekannten Leitwert still an. Genau das ist der '
    + 'Befund: die Zeile steht danach sichtbar im Bereich und fehlt in JEDER abgeleiteten '
    + 'Sicht, ohne dass irgendwo etwas steht.');
});

/* ── Probe 2 · kein Über-Fragen ───────────────────────────────────────────
   Ein FEHLENDER Leitwert ist kein Fund. Das ist keine Lücke, sondern U2-ADR-109:
   eine `kinder`-Zeile ohne `art` gibt es nach der Migration des Alt-Freitextes
   ausdrücklich. Meldete das Prädikat auch Fehlendes, fragte es bei jedem
   migrierten Kind — das Über-Fragen, das U2-ADR-111 §b verbietet. */
function ueberFragen(V) {
  const fehler = [];
  for (const t of typisierteListen(V)) {
    // (a) gültiger Wert → kein Hinweis über die unbekannte Art
    const gueltig = hinweise(V, t.sektorId, t.feldId, [{ [t.leit]: t.werte[0] }]);
    if (gueltig.some(x => x.includes(UNBEKANNT) || /nicht kennt/.test(x))) {
      fehler.push(t.feldId + ': ein GÜLTIGER Wert erzeugt einen Unbekannt-Hinweis');
    }
    // (b) fehlender Wert → kein Unbekannt-Hinweis
    const fehlt = hinweise(V, t.sektorId, t.feldId, [{}]);
    if (fehlt.some(x => /nicht kennt/.test(x))) {
      fehler.push(t.feldId + ': ein FEHLENDER Wert erzeugt einen Unbekannt-Hinweis (Über-Fragen)');
    }
    // (c) leerer String zählt wie fehlend
    const leer = hinweise(V, t.sektorId, t.feldId, [{ [t.leit]: '' }]);
    if (leer.some(x => /nicht kennt/.test(x))) {
      fehler.push(t.feldId + ': ein LEERER Wert erzeugt einen Unbekannt-Hinweis');
    }
  }
  return fehler;
}

test('fix-bilanz5-fehlende-und-gueltige-art-erzeugen-keinen-hinweis', () => {
  const { V } = ladeKern();
  assert.deepEqual(ueberFragen(V), [],
    'Der Hinweis darf nur bei einem GESETZTEN, unbekannten Wert kommen. Ein fehlender Wert ist '
    + 'ein legitimer Zustand (U2-ADR-109, migrierter Alt-Freitext) — dort zu fragen hiesse, bei '
    + 'jedem migrierten Kind zu fragen.');
});

/* ── Probe 3 · nichts normalisiert, nichts abgewiesen, und EIN Satz statt zwei ── */
function importVerstoesse(V) {
  const fehler = [];
  const S = 'advanceCare', F = 'provisionInstruments';
  const feld = V.feldDefFuer(S, F);
  // Das gegatete Feld darf SELBST KEIN Leitfeld sein — sonst prüfte die Probe zwei
  // unbekannte Arten statt „unbekannte Art trifft verwaistes Feld". `form` ist eines
  // (drei Optionen, gegatet von `typ`); genau daran ist diese Probe erst rot geworden.
  const leitIds = new Set((feld.unterFelder || [])
    .map(u => (u.sichtbarWenn || u.verborgenWenn || {}).feld).filter(Boolean));
  const gegatet = (feld.unterFelder || []).find(u => {
    const g = u.sichtbarWenn || u.verborgenWenn;
    return g && g.feld === 'instrument' && !leitIds.has(u.id) && u.typ !== 'auswahl';
  });
  assert.ok(gegatet, 'Positivkontrolle des Aufbaus: ein von `typ` gegatetes Nicht-Leitfeld muss es geben');
  const plan = { zeilen: [], listen: [{ sektorId: S, feldId: F, label: 'Instrumente', anzahl: 2, eintraege: [
    { instrument: UNBEKANNT, [gegatet.id]: 'Wert' },          // unbekannte Art UND verwaistes Feld
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge' },      // POSITIVKONTROLLE: gültig, kein Hinweis
  ] }] };
  const vorher = JSON.stringify(plan);
  const h = V.importSichtbarkeitsHinweise(plan);

  if (JSON.stringify(plan) !== vorher) {
    fehler.push('der Plan wurde VERÄNDERT — es darf nichts normalisiert und nichts abgewiesen werden');
  }
  // Genau EIN Hinweis: der unbekannte-Art-Satz ERSETZT den Wechselmoment-Satz.
  if (h.length !== 1) fehler.push('erwartet GENAU einen Hinweis, gefunden ' + h.length + ': ' + JSON.stringify(h));
  if (h.length && /bei der gewählten Art/.test(h[0])) {
    fehler.push('der Wechselmoment-Satz steht neben dem Unbekannt-Satz — sie widersprechen einander');
  }
  if (h.length && !h[0].includes(UNBEKANNT)) fehler.push('der Satz nennt den fremden Wert nicht');
  if (h.length && !/in keiner Übersicht/.test(h[0])) {
    fehler.push('der Satz sagt nicht die FOLGE — dass der Eintrag in keiner Übersicht erscheint');
  }
  if (h.length && /\btyp\b|unterFelder|sichtbarWenn/.test(h[0])) {
    fehler.push('der Satz zeigt Datenmodell-Vokabular: ' + h[0]);
  }
  // Zwei Sätze — derselbe Prüfstein wie beim Wechselmoment (U2-ADR-111 §4).
  if (h.length) {
    const saetze = h[0].split(/(?<=\.)\s+/).filter(Boolean);
    if (saetze.length !== 2) fehler.push('der Hinweis hat ' + saetze.length + ' Sätze statt zwei');
  }
  return fehler;
}

test('fix-bilanz5-import-meldet-ersetzt-und-normalisiert-nicht', () => {
  const { V } = ladeKern();
  assert.deepEqual(importVerstoesse(V), [],
    'Die Zeile kommt VOLLSTÄNDIG herein — abweisen wäre Datenverlust am Rand, normalisieren '
    + 'wäre stiller Datenverlust. Gemeldet wird die genauere der beiden Auskünfte, nicht beide.');
});

/* ── Negativprobe · fiele der Fix weg, wird es rot ───────────────────────── */
test('[Negativprobe] fix-bilanz5: ohne den Unbekannt-Satz faellt der Waechter', () => {
  const { V } = ladeKern();
  const S = 'advanceCare', F = 'provisionInstruments';
  // MUTATION nachgestellt: das ALTE Verhalten war „nur das Wechselmoment-Prädikat".
  // Für eine Zeile, deren gefüllte Felder alle SICHTBAR sind, meldete es nichts —
  // und genau so eine Zeile fällt heute noch komplett aus allen Übersichten.
  const feld = V.feldDefFuer('people', 'childrenAndDependants');
  const zeileOhneVerwaisung = { type: UNBEKANNT, note: 'Wert' };
  assert.deepEqual(V.zeileVerwaisteFelder(feld, zeileOhneVerwaisung), [],
    'das ALTE Prädikat meldet hier nichts — alle elf Gates sind `verborgenWenn`, ein '
    + 'unbekannter Wert versteckt dort nichts');
  // Der neue Weg meldet sie trotzdem — das ist der Ertrag des Fixes.
  const h = hinweise(V, 'people', 'childrenAndDependants', [zeileOhneVerwaisung]);
  assert.equal(h.length, 1, 'der neue Hinweis MUSS greifen, wo das alte Prädikat blind ist');
  assert.ok(h[0].includes(UNBEKANNT), 'und er MUSS den fremden Wert benennen');

  // Positivkontrolle der Negativprobe: eine gültige Zeile bleibt still.
  assert.deepEqual(hinweise(V, 'people', 'childrenAndDependants', [{ type: 'leiblich', note: 'Wert' }]), [],
    'eine gültige Zeile darf keinen Hinweis erzeugen — sonst misst die Probe nur Rauschen');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-114 nennt diese drei Pruefungen', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'fix-bilanz5-jede-typisierte-liste-meldet-eine-unbekannte-art', diskriminante: stilleListen },
    { fuer: 'fix-bilanz5-fehlende-und-gueltige-art-erzeugen-keinen-hinweis', diskriminante: ueberFragen },
    { fuer: 'fix-bilanz5-import-meldet-ersetzt-und-normalisiert-nicht', diskriminante: importVerstoesse },
  ],
};
