'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P11 — Altes Ehepaar ohne Kinder
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT: **den Fall ohne Türöffner.** Beide um die achtzig, keine
   Kinder, keine Geschwister mehr. Wenn beide füreinander Vertrauensperson sind
   und beide gleichzeitig ausfallen — wohin zeigt das Depot dann?

   Das Papier nennt es die Konstellation, für die die Victorinox-Metapher am
   ehesten bricht. Diese Persona baut sie und misst, was die Anwendung dann
   sagt: einen Vorschlag zum Ankerwechsel, keine Lösung.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P11';
const TITEL = 'Altes Ehepaar ohne Kinder';
const PASSWORT = 'p11-friedrich-pw';

const MENSCHEN = Object.freeze([
  { schluessel: 'ehefrau', name: 'Lotte Behnke', beziehung: 'Ehefrau', tel: '04321 5551101' },
  { schluessel: 'hausarzt', name: 'Sven Ohlsen', beziehung: 'Hausarzt', tel: '04321 5551102' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'verein', name: 'Tierschutzverein Mittelholstein e. V.' },
  { schluessel: 'notariat', name: 'Notariat Neumünster-Mitte' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Ein GEMEINSAMES Testament zugunsten eines Vereins — die Instrument-Zeile kennt `testament` '
  + 'und `testament_bedachte` als Personen-Verweis. Eine juristische Person als Bedachte hat '
  + 'dort keinen Platz; hier über den Vermächtnis-Freitext geführt, damit sie nicht verschwindet.',
  'Das Haus — `housing` kennt `ownedOrRented: eigentum`, aber weder Grundbuchblatt noch '
  + 'Miteigentumsanteil. Für ein Ehepaar mit gemeinsamem Haus ist das die halbe Auskunft.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Friedrich');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Friedrich', familyName: 'Behnke', birthDate: '1944-05-02',
    maritalStatus: 'verheiratet',
    streetAddress: 'Gartenstraße 21', postcodeCity: '24534 Neumünster', telephone: '04321 5551100',
  });
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner',
    { ref: String(p.ehefrau || '') });

  /* Gegenseitige Vollmacht — sie ist seine einzige Bevollmächtigte, und es gibt
     niemanden dahinter. Das ist der Gegenstand. */
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'enduring-power-of-attorney',
    form: 'notariell',
    certifyingBody: 'Notariat Neumünster-Mitte',
    storageLocation: 'Ordner „Vorsorge"',
    dateOfLastChange: '2018-04-26',
    authorizedPersons: [{ ref: String(p.ehefrau || '') }],
    howDoThePeopleRepresentYou: 'allein',
    healthCareGeneralDecision: 'ja',
    assetManagementGeneral: 'ja',
    representationWithAuthorities: 'ja',
  });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'will',
    form: 'notariell',
    certifyingBody: 'Notariat Neumünster-Mitte',
    storageLocation: 'Beim Nachlassgericht hinterlegt',
    dateOfLastChange: '2018-04-26',
    personalNotesOnThis: 'Gemeinschaftliches Testament. Nach dem Tod des Längerlebenden geht der '
      + 'Nachlass an den Tierschutzverein Mittelholstein e. V. — eine juristische Person, für '
      + 'die es kein Bedachten-Feld gibt.',
  });
  setze('health', {
    generalPractitioner: [{ ref: String(p.hausarzt || '') }],
    medicationOngoing: [{ text: 'Marcumar' }, { text: 'Bisoprolol 5 mg' }],
    bloodType: 'A+',
  });
  setze('housing', { ownedOrRented: 'eigentum', specialLivingSituation: 'Eigenes Haus, seit 1979.' });
  setze('personal', { typeOfFuneral: 'erdbestattung', funeralAlreadyPlannedInAdvance: 'ja' });
  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'DER FALL OHNE TÜRÖFFNER: die einzige Bevollmächtigte ist gleich alt',
      fn: (V) => {
        const d = V.getData();
        const instrument = (d.sektoren.advanceCare.provisionInstruments || [])
          .find((i) => i.instrument === 'enduring-power-of-attorney');
        const bevoll = (instrument.authorizedPersons || []);
        assert.equal(bevoll.length, 1, 'genau eine — es gibt niemanden dahinter');
        const person = d.menschen.find((m) => m.id === bevoll[0].ref);
        assert.equal(person.beziehung, 'Ehefrau');
        /* Und keine Ersatz-Person: das Modell KENNT `alternatePerson`, hier steht nichts —
           weil es niemanden gibt. Ein erfundener Ersatz wäre die Unwahrheit dieser Persona. */
        assert.ok(!instrument.alternatePerson);
      } },
    { name: 'die Anwendung erfindet keinen Nachfolger — sie hat einen Vorschlag, keine Lösung',
      fn: (V) => {
        const d = V.getData();
        assert.ok(Object.prototype.hasOwnProperty.call(d, 'ankerWechselEmpfehlung'),
          'der Slot für eine Empfehlung existiert');
        assert.ok(!d.ankerWechselEmpfehlung,
          'und er ist LEER: eine Empfehlung entsteht aus einem Anlass, nicht aus dem Alter');
        assert.equal((d.verwalteteDepots || []).length, 0, 'kein Sub-Depot, kein Türöffner');
      } },
    { name: 'die juristische Person im Testament steht als Freitext — der Befund, nicht die Lösung',
      fn: (V) => {
        const t = (V.getData().sektoren.advanceCare.provisionInstruments || [])
          .find((i) => i.instrument === 'will');
        assert.match(String(t.personalNotesOnThis), /Tierschutzverein/);
        assert.ok(!t.personsNamedInTheWill || t.personsNamedInTheWill.length === 0,
          'kein Personen-Verweis — ein Verein ist keine Person im Register, und er wird auch keine');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
