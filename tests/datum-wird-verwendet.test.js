'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-110 — ein übergebenes Datum wird auch verwendet
   ────────────────────────────────────────────────────────────────────────
   BEFUND (26.07.2026): `_heuteTeile` prüfte `heute instanceof Date`. Über VM-Kontexte
   hinweg ist das IMMER falsch — der Kern läuft im Test in einem eigenen Realm. Die
   Funktion fiel still auf „heute" zurück, ohne Fehler.

   WARUM DAS SCHWERER WIEGT ALS EIN FALSCHER WERT: an `_heuteTeile` hängt die
   Altersrechnung und damit `minderjaehrigkeit()`. Ein Test, der ein festes Datum
   übergibt, um eine Volljährigkeits-Grenze zu prüfen, hätte gegen das ECHTE Heute
   gemessen — und wäre GRÜN gewesen, aus dem falschen Grund. Nicht rot, grün. Diese
   Klasse fällt nicht auf; sie ist die Vakuum-Grün-Form.

   GEMESSENE REICHWEITE, damit hier nicht mehr steht als belegt ist:
   · Die bestehenden Tests entgingen dem NUR, weil sie STRINGS übergeben
     (`'2026-06-23'`) — dafür gibt es einen eigenen Zweig. Das war Glück, keine Absicht.
   · KEINE Bürgerin war betroffen: der einzige App-seitige Aufruf (`renderSektor`)
     übergibt gar kein Datum, und im Browser gibt es ohnehin nur einen Realm.
   Es ist also eine TEST-Falle — aber eine, die grün macht statt rot, und darum die
   gefährlichere Sorte.

   Diese Datei pinnt, dass ein übergebenes Datum in BEIDEN Formen ankommt. Ohne sie
   wäre die Umstellung auf die Entenprobe selbst unbelegt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-110';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'u2-110-ein-uebergebenes-datum-wird-verwendet',
  'u2-110-ohne-datum-gilt-weiterhin-heute',
  'u2-110-der-kern-selbst-nimmt-ein-fremdes-date-an',
];

// Die Einstiege, die ein „heute" annehmen. Je Eintrag: wie gerufen, und was das Ergebnis
// bei einem FRÜHEN und einem SPÄTEN Datum sein muss. Ein Einstieg, der beide gleich
// beantwortet, ignoriert das Datum.
const DATUMS_EINSTIEGE = [
  { name: 'minderjaehrigkeit(person, heute)',
    frueh: (V, h) => V.minderjaehrigkeit({ name: 'K', yearOfBirthIfTheExactDayIs: '2010' }, h).minderjaehrig,
    spaet: (V, h) => V.minderjaehrigkeit({ name: 'K', yearOfBirthIfTheExactDayIs: '2010' }, h).minderjaehrig,
    erwartetFrueh: true, erwartetSpaet: false },
  { name: 'personAlter(person, heute)',
    frueh: (V, h) => V.personAlter({ name: 'K', birthDate: '2010-01-01' }, h),
    spaet: (V, h) => V.personAlter({ name: 'K', birthDate: '2010-01-01' }, h),
    erwartetFrueh: 5, erwartetSpaet: 30 },
];
const FRUEH = '2015-01-01';
const SPAET = '2040-01-01';

/* Diskriminante: welcher Einstieg antwortet auf ein Date-OBJEKT anders als auf denselben
   Tag als String — oder liefert bei früh und spät dasselbe? Beides heißt: das Datum kommt
   nicht an. */
function einstiegeOhneDatumsWirkung(V) {
  const taub = [];
  for (const e of DATUMS_EINSTIEGE) {
    const alsString = { frueh: e.frueh(V, FRUEH), spaet: e.spaet(V, SPAET) };
    const alsDate = { frueh: e.frueh(V, new Date(FRUEH + 'T00:00:00Z')),
                      spaet: e.spaet(V, new Date(SPAET + 'T00:00:00Z')) };
    if (alsString.frueh !== e.erwartetFrueh || alsString.spaet !== e.erwartetSpaet) {
      taub.push(e.name + ': String-Form liefert nicht das Erwartete ('
        + JSON.stringify(alsString) + ')');
      continue;
    }
    if (alsDate.frueh !== alsString.frueh || alsDate.spaet !== alsString.spaet) {
      taub.push(e.name + ': ein Date-OBJEKT wird anders behandelt als derselbe Tag als String — '
        + 'Realm-Falle (String ' + JSON.stringify(alsString) + ' vs. Date ' + JSON.stringify(alsDate) + ')');
    }
    if (alsDate.frueh === alsDate.spaet) {
      taub.push(e.name + ': früh und spät liefern DASSELBE — das übergebene Datum wird ignoriert');
    }
  }
  return taub;
}

test('u2-110-ein-uebergebenes-datum-wird-verwendet', () => {
  const { V } = ladeKern();
  assert.ok(DATUMS_EINSTIEGE.length >= 2, 'Positivkontrolle: der Suchraum ist besetzt');
  assert.deepEqual(einstiegeOhneDatumsWirkung(V), [],
    'Ein übergebenes Datum MUSS ankommen — in beiden Formen. Sonst misst ein Test, der eine '
    + 'Altersgrenze prüft, gegen das echte Heute und ist grün aus dem falschen Grund.');
});

test('u2-110-der-kern-selbst-nimmt-ein-fremdes-date-an', () => {
  /* DIE PROBE IST IHRE EIGENE NEGATIVKONTROLLE — aber sie muss sich die Grenze SELBST bauen.

     Bis zum 27.07.2026 lief der Kern in einem eigenen vm-Realm, und ein hier erzeugtes `Date`
     war dort ohne Zutun fremd. Der Kommentar an dieser Stelle hielt darum fest, ein
     `node:vm`-Geruest sei „ueberfluessig: es stellt eine Grenze nach, die ohnehin da ist".

     Posten 38 hat den Harness auf EINEN Realm umgestellt — die Realm-Falle kostete an jeder
     Zusicherungsgrenze Aufmerksamkeit (sieben Faelle an einem Tag). Damit ist die Grenze NICHT
     mehr ohnehin da: `new Date(...)` waere fuer den Kern ein gewoehnliches Date, die Probe traefe
     mit Entenprobe UND mit `instanceof` zu — und unterschiede nichts mehr. Sie waere gruen
     geblieben und haette aufgehoert zu messen (§3.5e).

     Darum ein vm-Date GENAU HIER. Das ist kein Geruest, sondern der Messgegenstand: mit
     Entenprobe kommt 2040 zurueck, mit `instanceof Date` faellt der Kern auf heute zurueck. */
  const fremdesDate = require('node:vm').runInNewContext('new Date("2040-05-01T00:00:00Z")');
  assert.equal(fremdesDate instanceof Date, false,
    'das Date MUSS aus einem fremden Realm stammen — sonst unterscheidet die Probe nichts');
  const { V } = ladeKern();
  const teile = V._heuteTeile(fremdesDate);
  assert.equal(teile.y, 2040,
    'der Kern MUSS ein Date aus dem aeusseren Realm annehmen — sonst rechnet er still gegen heute');
  assert.notEqual(teile.y, new Date().getFullYear(),
    'und das Ergebnis darf nicht zufaellig das laufende Jahr sein, sonst unterscheidet die Probe nichts');
});

/* ── Der Rückfall bleibt richtig ──────────────────────────────────────────── */
// Ohne Datum ist „heute" das gewollte Verhalten — genau so ruft die App es auf
// (`renderSektor` übergibt nichts). Die Umstellung darf das nicht kaputtmachen.
function rueckfallVerstoesse(V) {
  const fehler = [];
  const jetzt = new Date().getFullYear();
  const alter = V.personAlter({ name: 'K', birthDate: '2000-01-01' }, undefined);
  if (alter !== jetzt - 2000 && alter !== jetzt - 2001) {
    fehler.push('ohne Datum wird nicht gegen heute gerechnet (alter=' + alter + ')');
  }
  for (const murks of [null, '', 'kein-datum', {}, new Date('unsinn')]) {
    const a = V.personAlter({ name: 'K', birthDate: '2000-01-01' }, murks);
    if (a == null) fehler.push('unbrauchbares „heute" (' + JSON.stringify(String(murks)) + ') liefert null statt Rückfall');
  }
  return fehler;
}

test('u2-110-ohne-datum-gilt-weiterhin-heute', () => {
  const { V } = ladeKern();
  assert.deepEqual(rueckfallVerstoesse(V), [],
    'Ohne (oder mit unbrauchbarem) Datum bleibt „heute" richtig — so ruft die App es auf. '
    + 'Die Entenprobe darf den Rückfall nicht kaputtmachen, nur die stille Fehldeutung.');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-110 nennt diese drei Pruefungen', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'u2-110-ein-uebergebenes-datum-wird-verwendet', diskriminante: einstiegeOhneDatumsWirkung },
    { fuer: 'u2-110-ohne-datum-gilt-weiterhin-heute',        diskriminante: rueckfallVerstoesse },
  ],
};
