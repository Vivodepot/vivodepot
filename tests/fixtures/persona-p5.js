'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P5 — Getrennte Ehepartner, ein minderjähriges und ein erwachsenes Kind
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT, und das Papier nennt es die härteste Frage am Datenmodell:
   **dieselbe Person in ZWEI Depots, mit unterschiedlichen Angaben.**
   Jeder Elternteil legt sein eigenes Depot an, beide tragen dasselbe Kind ein.

   DIE ANTWORT, die dieser Durchgang festhält, ist am 20.08.2026 entschieden
   worden: **ein Wert darf in zwei Depots liegen, und das ist kein Fehler.**
   Kein Abgleich zwischen den Kopien — jedes Depot steht für sich, offline.
   Diese Persona hält den Zustand fest, damit die Frage nicht bei jeder Vorlage
   neu aufgemacht wird.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P5';
const TITEL = 'Getrennte Ehepartner, ein minderjähriges und ein erwachsenes Kind';
const PASSWORT = 'p5-andrea-pw';
const PASSWORT_ZWEITES = 'p5-holger-pw';

const MENSCHEN = Object.freeze([
  { schluessel: 'expartner', name: 'Holger Reineke', beziehung: 'getrennt lebender Ehemann', tel: '0361 5550502' },
  { schluessel: 'kindKlein', name: 'Mira Reineke', beziehung: 'Tochter' },
  { schluessel: 'kindGross', name: 'Tobias Reineke', beziehung: 'Sohn', tel: '0361 5550503' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'familienkasse', name: 'Familienkasse Thüringen' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Trennungsvereinbarung und Umgangsregelung — es gibt `identity.dateOfSeparation` und die '
  + 'Kind-Zeile mit `custodyArrangement`, aber keinen Ort für die Vereinbarung als Dokument mit '
  + 'Datum und Beteiligten. Hier über das Dokument-Register geführt.',
  'Ein gemeinsames Konto in Auflösung — `finance.accounts` kennt keinen Zustand „in Auflösung" '
  + 'und keinen zweiten Kontoinhaber. Als Zweck-Vermerk eingetragen, damit die Lage nicht '
  + 'verschwindet.',
]);

/* Das ZWEITE Depot — derselbe Weg, anderer Mensch. Es wird von der Probe
   gebaut, nicht vom Läufer: nur diese Persona braucht zwei. */
async function baueZweitesDepot(ladeKern) {
  const { V } = ladeKern();
  await V.depotAnlegen(PASSWORT_ZWEITES);
  V.akteurSelbstErklaeren('Holger');
  const kind = V.personHinzufuegen({ name: 'Mira Reineke', beziehung: 'Tochter' });
  V.sektorFeldSetzen('identity', 'givenName', 'Holger');
  V.sektorFeldSetzen('identity', 'familyName', 'Reineke');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verheiratet');
  V.sektorFeldSetzen('identity', 'dateOfSeparation', '2026-01-15');
  V.sektorFeldSetzen('housing', 'ownedOrRented', 'miete');
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', {
    person: { ref: String(kind) },
    type: 'leiblich',
    legalRepresentationParental: 'gemeinsam',
    /* DIESELBE Person, ANDERE Angabe: er führt die Krankenversicherung, sie das Kindergeld. */
    custodyArrangement: 'Wechselmodell, Woche/Woche',
    note: 'Krankenversichert über mich.',
  });
  return { V, kind };
}

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Andrea');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Andrea', familyName: 'Reineke', birthDate: '1983-06-30',
    birthName: 'Kuhnert', maritalStatus: 'verheiratet', dateOfSeparation: '2026-01-15',
    streetAddress: 'Juri-Gagarin-Ring 9', postcodeCity: '99084 Erfurt', telephone: '0361 5550500',
  });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', {
    person: { ref: String(p.kindKlein || '') },
    type: 'leiblich',
    legalRepresentationParental: 'gemeinsam',
    custodyArrangement: 'Wechselmodell, Woche/Woche',
    note: 'Kindergeld läuft über mich.',
  });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', {
    person: { ref: String(p.kindGross || '') },
    type: 'leiblich',
    training: 'ja',
    trainingExpectedToEnd: '2027-09-30',
  });
  setze('housing', { ownedOrRented: 'miete', tenancyAgreementStorage: 'Ordner „Wohnung Erfurt"' });
  V.listenEintragHinzufuegen('finance', 'accounts', {
    accountType: 'girokonto', institution: { override: 'Sparkasse Mittelthüringen' },
    note: 'Gemeinsames Konto, in Auflösung — noch beide Namen',
  });
  V.dokumentAnlegen({
    typ: 'sonstiges', name: 'Trennungsvereinbarung', sektorId: 'people',
    gueltigAb: '2026-02-02',
  });
  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'dieselbe Person steht in ZWEI Depots — mit unterschiedlichen Angaben, ohne Abgleich',
      fn: async (V) => {
        const { ladeKern } = require('../load-kern.js');
        const zweites = await baueZweitesDepot(ladeKern);
        const hier = (V.getData().sektoren.people.childrenAndDependants || [])[0];
        const dort = (zweites.V.getData().sektoren.people.childrenAndDependants || [])[0];
        const nameHier = (V.getData().menschen.find((m) => m.id === hier.person.ref) || {}).name;
        const nameDort = (zweites.V.getData().menschen.find((m) => m.id === dort.person.ref) || {}).name;
        assert.equal(nameHier, 'Mira Reineke');
        assert.equal(nameDort, 'Mira Reineke', 'dasselbe Kind in beiden Depots');
        assert.notEqual(hier.person.ref, dort.person.ref,
          'ZWEI Registereinträge — jedes Depot führt sein eigenes Register, offline, ohne gemeinsame Kennung');
        assert.notEqual(hier.note, dort.note,
          'und die Angaben unterscheiden sich: Kindergeld hier, Krankenversicherung dort');
      } },
    { name: 'es gibt KEINEN Abgleich zwischen den Kopien — und das ist die Entscheidung, kein Mangel',
      fn: async (V) => {
        /* Entschieden am 20.08.2026: „Ein Wert darf in zwei Depots liegen, und das ist kein
           Fehler." Kein Abgleich, keine gemeinsame Kennung, keine Meldung. Geprüft wird, dass
           das Depot dazu auch nichts BEHAUPTET — kein Feld, das eine Zweitkopie kennt. */
        const d = V.getData();
        const verdaechtig = Object.keys(d).filter((k) => /abgleich|synchron|zweitdepot/i.test(k));
        assert.equal(verdaechtig.length, 0, 'kein Schlüssel, der eine Kopie in einem anderen Depot kennt');
      } },
    { name: 'das minderjährige und das erwachsene Kind stehen nebeneinander — mit verschiedenen Angaben',
      fn: (V) => {
        const kinder = V.getData().sektoren.people.childrenAndDependants || [];
        assert.equal(kinder.length, 2);
        assert.equal(kinder[0].legalRepresentationParental, 'gemeinsam', 'nur beim minderjährigen Kind');
        assert.equal(kinder[1].training, 'ja', 'und nur beim erwachsenen die Ausbildung');
        assert.ok(!kinder[1].legalRepresentationParental, 'kein Sorgerecht am erwachsenen Kind');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen, baueZweitesDepot };
