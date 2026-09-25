'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P7 — Familie mit einem minderjährigen Kind, chronisch krank
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT: **Gesundheit einer schutzbefohlenen Person — und ob deren
   Daten auf der Notfallkarte landen, obwohl die Karte für den Depot-Inhaber
   gedacht ist.** Das Papier nennt es ausdrücklich eine Datenschutzfrage, keine
   Komfortfrage.

   Die Eltern fangen mit den Gesundheitsdaten des KINDES an, nicht mit den
   eigenen — auch das steht so im Papier.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P7';
const TITEL = 'Familie mit einem minderjährigen Kind, chronisch krank';
const PASSWORT = 'p7-nadja-pw';

const MENSCHEN = Object.freeze([
  { schluessel: 'partner', name: 'Ercan Yildiz', beziehung: 'Ehemann', tel: '0621 5550701' },
  { schluessel: 'kind', name: 'Elif Yildiz', beziehung: 'Tochter' },
  { schluessel: 'kinderarzt', name: 'Ruth Sallinger', beziehung: 'Kinderärztin', tel: '0621 5550702' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'schule', name: 'Gemeinschaftsgrundschule Neckarau', tel: '0621 5550710' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Allergiepass und Notfallausweis DES KINDES — die Gesundheitsfelder des Bereichs gehören der '
  + 'Inhaberin des Depots. Für ein schutzbefohlenes Kind gibt es keinen eigenen Gesundheitsblock; '
  + 'die Angaben landen hier als Anmerkung an der Kind-Zeile. Das ist der Befund dieser Persona, '
  + 'nicht ihre Lösung.',
  'Schulbescheinigung mit Medikamentengabe — es gibt kein Feld für eine Vereinbarung mit der '
  + 'Schule über die Gabe eines Notfallmedikaments. Über das Dokument-Register geführt.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Nadja');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  /* Sie fangen beim Kind an. Die Angaben stehen an der Kind-Zeile, weil der
     Gesundheitsblock dem Depot-Inhaber gehört — genau die Stelle, die geprüft wird. */
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', {
    person: { ref: String(p.kind || '') },
    type: 'leiblich',
    legalRepresentationParental: 'gemeinsam',
    birthCertificateStorage: 'Ordner „Elif", vorne',
    note: 'Erdnuss- und Baumnussallergie, Grad III. Notfallset (Adrenalin-Autoinjektor) '
      + 'im Schulranzen und im Sekretariat. Medikamentenplan der Kinderärztin liegt bei.',
  });

  setze('identity', {
    givenName: 'Nadja', familyName: 'Yildiz', birthDate: '1990-12-05',
    maritalStatus: 'verheiratet',
    streetAddress: 'Rheingoldstraße 7', postcodeCity: '68199 Mannheim', telephone: '0621 5550700',
  });
  /* Die EIGENEN Gesundheitsdaten der Mutter — knapp. Sie sind nicht der Gegenstand. */
  setze('health', {
    bloodType: 'A-',
    healthInsurance: [{ override: 'AOK Baden-Württemberg' }],
    insuranceNumber: 'B234567890',
    emergencyCardPatientId: 'Portemonnaie',
  });
  setze('housing', { ownedOrRented: 'eigentum' });
  V.dokumentAnlegen({
    typ: 'sonstiges', name: 'Schulbescheinigung Medikamentengabe (Elif)', sektorId: 'people',
    gueltigAb: '2026-08-01', pruefIntervallMonate: 12,
  });
  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'DIE DATENSCHUTZFRAGE, gemessen: die Notfallkarte trägt KEIN Kind-Datum',
      fn: (V) => {
        /* Die Karte ist für den Depot-Inhaber gedacht. Sie zieht ihre Felder aus
           `NOTFALL_KERN_FELDER` — einer festen Liste von Bereichs-Feldern des Inhabers.
           Die Angaben des Kindes stehen an der Kind-Zeile und sind dort nicht aufgeführt.
           Das ist die Antwort auf die Frage des Papiers, und sie ist gut: die Karte gibt
           nicht ungefragt die Allergie eines Kindes heraus. */
        const felder = V.NOTFALL_KERN_FELDER.map((e) => e.sektor + '.' + e.feld);
        for (const f of felder) {
          assert.equal(f.startsWith('people.childrenAndDependants'), false,
            'die Kind-Zeile ist keine Quelle der Notfallkarte: ' + f);
        }
        const notfall = JSON.stringify(V.notfallKernModell ? V.notfallKernModell() : {});
        assert.equal(notfall.includes('Erdnuss'), false,
          'die Allergie des Kindes erscheint nicht auf der Karte der Mutter');
      } },
    { name: 'die Angaben des Kindes stehen trotzdem im Depot — sie sind nicht verloren',
      fn: (V) => {
        const kind = (V.getData().sektoren.people.childrenAndDependants || [])[0];
        assert.match(String(kind.note), /Erdnuss/);
        assert.match(String(kind.note), /Autoinjektor/,
          'auch der Ort des Notfallsets — für den, der das Depot öffnet');
      } },
    { name: 'DER BEFUND: es gibt keinen eigenen Gesundheitsblock für ein schutzbefohlenes Kind',
      fn: (V) => {
        /* Gemessen, nicht vermutet: der Bereich `gesundheit` gehört der Inhaberin. Für das
           Kind bleibt die Anmerkung an der Zeile. Ob das reicht, ist eine Produktfrage —
           diese Persona hält den Zustand fest, statt ihn zu bewerten. */
        const s = V._sektorIndexHalter ? V._sektorIndexHalter().health : V.SEKTOR_BY_ID.health;
        const felder = s.sektionen.flatMap((sek) => sek.felder || []).map((f) => f.id);
        const kindBezug = felder.filter((f) => /kind|schutzbefohlen/i.test(f));
        assert.equal(kindBezug.length, 0,
          'kein Gesundheitsfeld nennt ein Kind — die Angaben des Kindes haben dort keinen Ort');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
