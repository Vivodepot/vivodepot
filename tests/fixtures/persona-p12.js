'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P12 — Person unter gesetzlicher Betreuung
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT: **ein anderes Rechtsverhältnis als die Vollmacht.** Gerichtlich
   bestellt, in Aufgabenkreisen begrenzt, jederzeit widerrufbar durch das
   Gericht. Das Papier hält fest: „Ob das Datenmodell das von einer Vollmacht
   unterscheidet, ist offen."

   ES IST SEIT A178 NICHT MEHR OFFEN — die Betreuerbestellung ist ein eigenes
   Vorsorge-Instrument mit Gericht, Aktenzeichen, Aufgabenbereichen und
   Überprüfungsdatum. Diese Persona misst den Unterschied, statt ihn zu
   behaupten.

   DER BETREUER RICHTET EIN, nicht die betreute Person — auch das steht im Papier.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P12';
const TITEL = 'Person unter gesetzlicher Betreuung';
const PASSWORT = 'p12-betreuer-pw';

const MENSCHEN = Object.freeze([
  { schluessel: 'betreuer', name: 'Marek Sobotta', beziehung: 'Berufsbetreuer', tel: '0391 5551201' },
  { schluessel: 'schwester', name: 'Doris Hentschel', beziehung: 'Schwester', tel: '0391 5551202' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'gericht', name: 'Amtsgericht Magdeburg, Betreuungsgericht' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Der EINWILLIGUNGSVORBEHALT für Vermögensangelegenheiten — die Betreuerbestellung kennt '
  + '`areasOfResponsibility` als Freitext, aber der Einwilligungsvorbehalt ist '
  + 'etwas anderes als ein Aufgabenkreis: er nimmt der betreuten Person die eigene Wirksamkeit. '
  + 'Hier im Freitext benannt, weil es kein Feld dafür gibt.',
  'Kein eigenes Konto mehr in eigener Verfügung — `finance.accounts` kennt keinen Zustand '
  + '„nur mit Zustimmung des Betreuers". Als Zweck-Vermerk eingetragen.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  /* Der Betreuer richtet ein — der Sitzungs-Akteur ist NICHT die betreute Person. */
  V.akteurSelbstErklaeren('Marek Sobotta (Betreuer)');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Rainer', familyName: 'Hentschel', birthDate: '1978-10-11',
    maritalStatus: 'ledig',
    streetAddress: 'Halberstädter Straße 104', postcodeCity: '39112 Magdeburg',
  });
  setze('health', {
    healthInsurance: [{ override: 'IKK gesund plus' }],
    insuranceNumber: 'S567890123',
    medicationOngoing: [{ text: 'Risperidon 2 mg' }, { text: 'Lorazepam bei Bedarf' }],
    generalPractitioner: [{ override: 'Praxis am Hasselbachplatz' }],
  });

  /* DAS INSTRUMENT: Betreuerbestellung — gerichtlich, nicht bevollmächtigt. */
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'custodian-appointment',
    form: 'gerichtlich',
    storageLocation: 'Beschluss im Ordner „Betreuung", vorne',
    dateOfLastChange: '2024-06-18',
    whoWasAppointedAsCourt: [{ ref: String(p.betreuer || '') }],
    careCourt: 'Amtsgericht Magdeburg',
    fileReferenceNumber: '271 XVII 88/24',
    appointedSince: '2024-06-18',
    nextCourtReviewDateIfKnown: '2031-06-18',
    areasOfResponsibility: 'Gesundheitssorge, Aufenthaltsbestimmung, '
      + 'Vermögensangelegenheiten MIT Einwilligungsvorbehalt (§ 1825 BGB), Behörden- und '
      + 'Sozialleistungsangelegenheiten. Der Einwilligungsvorbehalt hat kein eigenes Feld.',
  });
  V.listenEintragHinzufuegen('finance', 'accounts', {
    accountType: 'girokonto', institution: { override: 'Stadtsparkasse Magdeburg' },
    note: 'Verfügungen nur mit Zustimmung des Betreuers (Einwilligungsvorbehalt)',
  });
  setze('housing', { ownedOrRented: 'miete', specialLivingSituation: 'Betreutes Wohnen, eigene Wohnung.' });
  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'die Betreuung ist ein EIGENES Instrument — nicht eine Vollmacht mit anderem Etikett',
      fn: (V) => {
        const i = (V.getData().sektoren.advanceCare.provisionInstruments || [])[0];
        assert.equal(i.instrument, 'custodian-appointment');
        assert.equal(i.careCourt, 'Amtsgericht Magdeburg',
          'ein Gericht — das hat eine Vollmacht nicht');
        assert.equal(i.fileReferenceNumber, '271 XVII 88/24');
        assert.equal(i.nextCourtReviewDateIfKnown, '2031-06-18',
          'und ein Überprüfungsdatum: eine Betreuung wird vom Gericht wieder angesehen, eine Vollmacht nicht');
        assert.ok(!i.authorizedPersons, 'kein Bevollmächtigter-Feld — der Unterschied ist strukturell');
      } },
    { name: 'der Betreuer richtet ein — der Stempel nennt IHN, nicht die betreute Person',
      fn: (V) => {
        const d = V.getData();
        const stempel = JSON.stringify(d.urheberschaft || {});
        assert.match(stempel, /Sobotta/,
          'die Herkunft der Einträge weist auf den Betreuer: ' + stempel.slice(0, 160));
        assert.equal(d.sektoren.identity.givenName, 'Rainer',
          'das Depot gehört trotzdem der betreuten Person');
      } },
    { name: 'DER BEFUND: der Einwilligungsvorbehalt hat kein eigenes Feld',
      fn: (V) => {
        const i = (V.getData().sektoren.advanceCare.provisionInstruments || [])[0];
        assert.match(String(i.areasOfResponsibility), /Einwilligungsvorbehalt/);
        const s = V._sektorIndexHalter ? V._sektorIndexHalter().advanceCare : V.SEKTOR_BY_ID.advanceCare;
        const liste = s.sektionen.flatMap((sek) => sek.felder || []).find((f) => f.id === 'provisionInstruments');
        const namen = (liste.unterFelder || []).map((u) => u.id);
        assert.equal(namen.some((n) => /einwilligungsvorbehalt/i.test(n)), false,
          'gemessen: es gibt kein Unterfeld dafür — der Vorbehalt steht im Freitext, und das ist gemeldet, nicht gelöst');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
