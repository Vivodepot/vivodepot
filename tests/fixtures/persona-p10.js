'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P10 — Die Bevollmächtigte ohne Verwandtschaft
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT: **ob das Vertrauensmodell ausserhalb der Familie trägt — und
   ob die Sprache es tut.** Das Papier nennt den Fall wörtlich: „„Ihre Tochter"
   steht an einigen Stellen als Selbstverständlichkeit."

   Nachbarin seit zwanzig Jahren, Vollmacht, weil es keine Familie gibt. Sie
   kennt weder Konten noch Ärzte.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P10';
const TITEL = 'Die Bevollmächtigte ohne Verwandtschaft';
const PASSWORT = 'p10-hanna-pw';

const MENSCHEN = Object.freeze([
  { schluessel: 'nachbarin', name: 'Hanna Grzeschik', beziehung: 'Nachbarin' },
  { schluessel: 'hausarzt', name: 'Aylin Korkmaz', beziehung: 'Hausärztin', tel: '0234 5551002' },
]);
const INSTITUTIONEN = Object.freeze([]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Ein verschlossener Umschlag mit einem Passwort — dafür gibt es `administration.masterPasswordStorageLocation`, '
  + 'aber das Feld meint den Hauptschlüssel eines Verwalters. Ein Umschlag bei einer Nachbarin '
  + 'ist ein Verwahrort, kein Verwalter; hier als Klartext-Vermerk.',
  'Die Vollmacht liegt auf PAPIER, sonst nichts — sie kennt weder Konten noch Ärzte. Was fehlt, '
  + 'fehlt nicht dem Depot, sondern ihr. Das Depot bildet das ab, statt es zu füllen.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Ingrid');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Ingrid', familyName: 'Bever', birthDate: '1941-03-19',
    maritalStatus: 'ledig',
    streetAddress: 'Alte Hattinger Straße 58', postcodeCity: '44789 Bochum', telephone: '0234 5551000',
  });
  setze('health', {
    generalPractitioner: [{ ref: String(p.hausarzt || '') }],
    bloodType: '0−',
  });
  /* Die Vollmacht — bei einer Frau, die nicht verwandt ist. Genau das ist der Fall. */
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'enduring-power-of-attorney',
    form: 'schriftlich',
    storageLocation: 'Bei Frau Grzeschik im Umschlag',
    dateOfLastChange: '2021-11-08',
    authorizedPersons: [{ ref: String(p.nachbarin || '') }],
    howDoThePeopleRepresentYou: 'allein',
    healthCareGeneralDecision: 'ja',
    determinePlaceOfResidence: 'ja',
    representationWithAuthorities: 'ja',
  });
  setze('administration', {
    masterPasswordStorageLocation: 'Verschlossener Umschlag bei Frau Grzeschik (Nachbarin, Erdgeschoss)',
  });
  return { p };
}

function pruefungen(assert) {
  return [
    { name: 'die Bevollmächtigte ist KEINE Verwandte — und das Modell trägt es ohne Umweg',
      fn: (V) => {
        const d = V.getData();
        const instrument = (d.sektoren.advanceCare.provisionInstruments || [])[0];
        const ref = (instrument.authorizedPersons || [])[0].ref;
        const person = d.menschen.find((m) => m.id === ref);
        assert.equal(person.name, 'Hanna Grzeschik');
        assert.equal(person.beziehung, 'Nachbarin',
          'die Beziehung ist ein freier Text — kein Verwandtschafts-Enum, das „Nachbarin" nicht kennt (U2-ADR-021)');
      } },
    { name: 'DIE SPRACHPROBE: kein Anzeigetext setzt eine Familie voraus',
      fn: (V) => {
        /* Der Fall aus dem Papier: „Ihre Tochter" als Selbstverständlichkeit. Gemessen über
           die ganze Zeichenketten-Tabelle — nicht über eine Stichprobe. Eine Anwendung, die
           von „Ihrer Tochter" spricht, redet an dieser Persona vorbei. */
        const verdaechtig = [];
        for (const [k, v] of Object.entries(V.STRINGS)) {
          if (typeof v !== 'string') continue;
          if (/\b(Ihre|Ihrer|Ihrem|Ihren)\s+(Tochter|Sohn|Kinder|Familie|Angehörigen)\b/.test(v)) {
            verdaechtig.push(k + ': ' + v.slice(0, 80));
          }
        }
        assert.equal(verdaechtig.length, 0,
          'ein Text setzt eine Familie voraus: ' + verdaechtig.join(' | '));
      } },
    { name: 'sie kennt weder Konten noch Ärzte — das Depot bildet das ab, statt es zu füllen',
      fn: (V) => {
        const d = V.getData();
        assert.ok(!(d.sektoren.finance && d.sektoren.finance.accounts),
          'kein erfundenes Konto, nur weil ein Feld da ist');
        assert.equal((d.menschen || []).length, 3,
          'Inhaberin, Nachbarin, Hausärztin — mehr Menschen gibt es in dieser Lage nicht');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
