'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P2 — Die Alleinlebende, Anfang siebzig
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT, DAS SONST NICHTS PRÜFT: **ein veraltetes Vorsorgedokument.**
   Sie trägt eine Patientenverfügung von 2009 ein, ohne auf das Datum zu achten
   — wörtlich aus dem Papier. Die Frage ist nicht, ob die App etwas dazu sagt,
   sondern ob sie etwas WAHRES sagt. An dieser Stelle hing der schwerste Fund
   der Projektgeschichte (die Zwölf-Monats-Prüffrist).

   DAZU: ein Ort, an dem ein Schlüssel liegt, OHNE dass eine Person dazugehört —
   der Nachbar hat den Schlüssel, steht aber nicht im Register.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P2';
const TITEL = 'Die Alleinlebende, Anfang siebzig';
const PASSWORT = 'p2-margarete-pw';

const MENSCHEN = Object.freeze([
  { schluessel: 'tochter', name: 'Ines Brandt', beziehung: 'Tochter', tel: '0511 5550301' },
  { schluessel: 'hausarzt', name: 'Ludger Peine', beziehung: 'Hausarzt', tel: '0341 5550302' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'bestatter', name: 'Bestattungshaus Sonnenhof' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Beerdigungsvorsorge-Vertrag — `personal.preArrangementContractStorage` nimmt den Nachweis '
  + 'auf, aber nicht Vertragsnummer, Einzahlungsstand und Treuhandkonto. Für einen laufenden '
  + 'Vorsorgevertrag ist das die halbe Auskunft.',
  'Der Wohnungsschlüssel beim Nachbarn — die Liste `administration.homeKeyWhoHoldsOne` hat ein '
  + 'Personen-Feld, aber der Nachbar steht nicht im Register und soll es auch nicht: sie will ihn '
  + 'nicht als Vertrauensperson führen. Hier steht der Ort mit Anmerkung und OHNE Person.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Margarete');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };
  const ref = (x) => [{ ref: String(x || '') }];

  /* „Gesundheit zuerst, weil der Medikamentenplan obenauf liegt." */
  setze('health', {
    generalPractitioner: ref(p.hausarzt),
    medicationOngoing: [{ text: 'L-Thyroxin 75' }, { text: 'Ramipril 5 mg' }, { text: 'ASS 100' }],
    chronicConditionsDiagnoses: [{ text: 'Schilddrüsenunterfunktion' }, { text: 'Bluthochdruck' }],
    bloodType: 'B+',
    healthInsurance: [{ override: 'AOK Niedersachsen' }],
    insuranceNumber: 'N987654321',
    emergencyCardPatientId: 'Portemonnaie, hinter dem Ausweis',
  });
  setze('identity', {
    givenName: 'Margarete', familyName: 'Sommer', birthDate: '1954-02-09',
    birthName: 'Brandt', birthPlace: 'Celle', maritalStatus: 'verwitwet',
    streetAddress: 'Am Kirchweg 3', postcodeCity: '31137 Hildesheim', telephone: '05121 5550300',
  });
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): rentenversicherungsnummer ist jetzt Unterfeld
  // `nr` der Liste `rentenversicherung` — kein sektorFeldSetzen mehr (U2-ADR-104-Wächter).
  V.listenEintragHinzufuegen('socialInsurance', 'pensionInsuranceNumbers',
    { system: 'DE', pensionInsuranceNumber: '65 090254 S 012' });

  /* DER KERN DIESER PERSONA: eine Patientenverfügung von 2009. Sie trägt sie ein,
     ohne auf das Datum zu achten — genau so steht es im Papier. */
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'living-will',
    form: 'schriftlich',
    storageLocation: 'Ordner „Wichtiges", ganz vorne',
    dateOfLastChange: '2009-05-14',
    medicalSupervisionBy: { ref: String(p.hausarzt || '') },
  });
  setze('advanceCare', {
    dailyRoutineActivities: 'So lange wie möglich in der Wohnung bleiben.',
  });

  /* Und dasselbe Papier als DOKUMENT — der Weg, über den ein Prüfrhythmus überhaupt
     entsteht. Dass beides nötig ist, ist der Befund dieser Persona (s. `pruefungen`). */
  V.dokumentAnlegen({
    typ: 'living-will', name: 'Patientenverfügung', sektorId: 'advanceCare',
    gueltigAb: '2009-05-14', pruefIntervallMonate: 12,
  });

  /* Der Schlüssel liegt beim Nachbarn — Ort und Anmerkung, KEINE Person. */
  V.listenEintragHinzufuegen('administration', 'homeKeyWhoHoldsOne', {
    note: 'Zweitschlüssel beim Nachbarn im Erdgeschoss (Herr Kolbe) — er ist keine '
      + 'Vertrauensperson und soll auch keine werden.',
  });

  setze('personal', {
    typeOfFuneral: 'erdbestattung',
    funeralAlreadyPlannedInAdvance: 'ja',
    funeralHome: 'Bestattungshaus Sonnenhof',
    preArrangementContractStorage: 'Vertrag im Ordner „Wichtiges", hinten',
  });
  V.listenEintragHinzufuegen('finance', 'accounts', {
    accountType: 'sparbuch', institution: { override: 'Sparkasse Hildesheim' }, note: 'Rücklage',
  });
  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'die Patientenverfügung von 2009 steht mit ihrem Datum im Depot — ungeschönt',
      fn: (V) => {
        const liste = (V.getData().sektoren.advanceCare || {}).provisionInstruments;
        assert.ok(Array.isArray(liste) && liste.length === 1);
        assert.equal(liste[0].instrument, 'living-will');
        assert.equal(liste[0].dateOfLastChange, '2009-05-14',
          'das Datum wird nicht stillschweigend auf heute gezogen');
      } },
    { name: 'die Anwendung sagt etwas dazu — und was sie sagt, ist wahr',
      fn: (V) => {
        /* Nicht geprüft wird, WIE der Satz lautet — das ist Wortlaut und ist eine Produktentscheidung.
           Geprüft wird, dass die siebzehn Jahre alte Verfügung überhaupt einen Prüftermin
           erzeugt und dass er als überfällig geführt wird. Eine Anwendung, die dazu schweigt,
           hat die Frage nicht gestellt. */
        const termine = V.prueftermineAlle();
        const treffer = termine.filter((t) => String(t.name || '').includes('Patientenverfügung'));
        assert.equal(treffer.length, 1, 'genau ein Termin: ' + JSON.stringify(termine).slice(0, 200));
        assert.equal(treffer[0].aktualisiertAm, '2009-05-14', 'er rechnet vom echten Datum');
        assert.ok(typeof treffer[0].stufe === 'string' && treffer[0].stufe,
          'und er trägt eine Ampelstufe — nicht „kein Rhythmus"');
      } },
    { name: 'DER BEFUND: das Instrument ALLEIN erzeugt keinen Prüftermin — nur das Dokument tut es',
      fn: async (V) => {
        /* Gemessen, nicht vermutet: die Prüftermine kommen aus `data.dokumente[]`. Eine
           Vorsorgevollmacht, die nur als Instrument-Zeile im Bereich steht, bleibt stumm —
           auch mit einem Datum von 2009. Wer beides für dasselbe hält, hält eine Verfügung
           für geprüft, die niemand geprüft hat.

           Diese Persona trägt darum BEIDES ein. Der Befund gehört gemeldet, nicht repariert:
           ob eine Instrument-Zeile automatisch ein Dokument erzeugen soll, ist eine
           Produktentscheidung. */
        const { ladeKern } = require('../load-kern.js');
        const { V: V2 } = ladeKern();
        await V2.depotAnlegen('p2-gegenprobe-pw');
        V2.akteurSelbstErklaeren('Gegenprobe');
        V2.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
          instrument: 'living-will', form: 'schriftlich', dateOfLastChange: '2009-05-14',
          storageLocation: 'Ordner',
        });
        assert.equal(V2.prueftermineAlle().length, 0,
          'ohne Dokument-Eintrag schweigt die Anwendung zu einer Verfügung von 2009');
      } },
    { name: 'ein Schlüssel-Ort OHNE Person ist zulässig — nicht jede Hilfe ist eine Vertrauensperson',
      fn: (V) => {
        const liste = (V.getData().sektoren.administration || {}).homeKeyWhoHoldsOne;
        assert.ok(Array.isArray(liste) && liste.length === 1);
        assert.ok(!liste[0].who, 'kein Personen-Bezug');
        assert.match(String(liste[0].note), /Nachbarn/);
        const namen = (V.getData().menschen || []).map((m) => m.nachname);
        assert.equal(namen.includes('Kolbe'), false,
          'der Nachbar landet NICHT im Personenregister — sonst führte das Depot jemanden, den sie nicht führen will');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
