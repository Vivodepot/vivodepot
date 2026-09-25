'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P4 — Alleinerziehende mit einem erwachsenen Kind
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT: **den Vertrauenspersonen-Weg — und ob verständlich wird,
   welchen Umfang die Freigabe hat.** Sie trägt das Kind als Vertrauensperson
   ein und stockt bei der Frage, was sie damit weggibt.

   DAZU: **ein Dokument, das war und nicht mehr gilt** — der Unterhaltstitel ist
   abgelaufen, das Kind ist Mitte zwanzig.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P4';
const TITEL = 'Alleinerziehende mit einem erwachsenen Kind';
const PASSWORT = 'p4-carmen-pw';

const MENSCHEN = Object.freeze([
  { schluessel: 'kind', name: 'Levi Oswald', beziehung: 'Sohn', tel: '0221 5550401' },
  { schluessel: 'anwaeltin', name: 'Petra Rennert', beziehung: 'Rechtsanwältin', tel: '0221 5550402' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'rentenversicherung', name: 'Deutsche Rentenversicherung Rheinland' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Scheidungsurteil — es gibt `identity.maritalStatus` und `dateOfSeparation`, aber keinen Ort '
  + 'für das Urteil selbst (Gericht, Aktenzeichen, Rechtskraft). Hier über das Dokument-Register '
  + 'geführt, weil der Bereich kein Feld dafür hat.',
  'Ein Ordner mit Belegen aus der Trennung — dafür gibt es keinen Gegenstand, und das ist '
  + 'richtig so: ein Ordner ist kein Datum. Benannt, damit niemand ihn später „vergessen" nennt.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Carmen');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };
  const ref = (x) => [{ ref: String(x || '') }];

  setze('identity', {
    givenName: 'Carmen', familyName: 'Oswald', birthDate: '1971-08-22',
    birthName: 'Deppe', birthPlace: 'Leverkusen', maritalStatus: 'geschieden',
    dateOfSeparation: '2009-04-01',
    streetAddress: 'Gereonswall 44', postcodeCity: '50670 Köln', telephone: '0221 5550400',
  });

  /* Das erwachsene Kind — als Kind-Zeile UND als die Person, der sie vertraut. */
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', {
    person: { ref: String(p.kind || '') },
    type: 'leiblich',
    training: 'nein',
    note: 'Lebt eigenständig in Aachen. Er ist die Person, der ich im Ernstfall vertraue.',
  });

  /* Der Unterhaltstitel: er WAR und gilt nicht mehr. Als Zeile mit Ende in der
     Vergangenheit — nicht gelöscht, denn er ist Teil ihrer Geschichte. */
  V.listenEintragHinzufuegen('people', 'maintenanceObligationsAnd', {
    person: { ref: String(p.kind || '') },
    type: 'kindesunterhalt',
    end: '2021-07-31',
    note: 'Titel vom Amtsgericht Köln, ausgelaufen mit dem Ende der Ausbildung.',
  });

  setze('education', {
    occupationRole: 'Bürokauffrau',
    typeOfIncome: ['angestellt'],
  });
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): rentenversicherungsnummer ist jetzt Unterfeld
  // `nr` der Liste `rentenversicherung` — kein sektorFeldSetzen mehr (U2-ADR-104-Wächter).
  V.listenEintragHinzufuegen('socialInsurance', 'pensionInsuranceNumbers',
    { system: 'DE', pensionInsuranceNumber: '12 220871 O 049' });
  setze('housing', { ownedOrRented: 'miete', tenancyAgreementStorage: 'Ordner „Wohnung"' });
  setze('health', {
    healthInsurance: [{ override: 'Barmer' }],
    insuranceNumber: 'K456789012',
  });
  V.dokumentAnlegen({
    typ: 'sonstiges', name: 'Scheidungsurteil (Amtsgericht Köln)', sektorId: 'identity',
    gueltigAb: '2010-11-04',
  });
  V.dokumentAnlegen({
    typ: 'sonstiges', name: 'Rentenauskunft', sektorId: 'socialInsurance',
    gueltigAb: '2025-02-10', pruefIntervallMonate: 24,
  });
  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'die Vertrauensperson bekommt NICHT das ganze Depot — die Freigabe hat eine Liste',
      fn: async (V) => {
        /* Ihre Frage lautet: „was gebe ich damit weg?" Die Antwort ist messbar: der
           Angehörigen-Cache trägt genau die Felder aus `_ANG_CACHE_ERLAUBT`, nicht das Depot.
           Geprüft wird der UMFANG, nicht der Wortlaut der Erklärung. */
        const modell = V.angehoerigenCacheModell();
        assert.ok(modell && modell.sektoren, 'der Cache hat ein Modell');
        const drin = [];
        for (const [sek, felder] of Object.entries(modell.sektoren)) {
          for (const f of Object.keys(felder)) drin.push(sek + '|' + f);
        }
        const erlaubt = new Set([...V._ANG_CACHE_ERLAUBT].map((k) => k.split('|').slice(1).join('|')));
        /* Zwei Felder stehen zusätzlich drin, und zwar mit Grund: `identitaet.vorname` und
           `nachname` speisen das Banner der Angehörigen-Sicht („Depot von …"). Ohne sie wüsste
           die Vertrauensperson nicht, WESSEN Depot sie geöffnet hat. Sie werden hier benannt
           statt weggelassen — eine Ausnahme, die niemand nennt, wächst still. */
        const bannerFelder = new Set(['identity|givenName', 'identity|familyName']);
        for (const k of drin) {
          assert.ok(erlaubt.has(k) || bannerFelder.has(k),
            'im Cache steht etwas, das weder freigegeben noch Banner ist: ' + k);
        }
        const alleFelder = Object.values(V.getData().sektoren).reduce((n, o) => n + Object.keys(o).length, 0);
        assert.ok(drin.length < alleFelder,
          'die Freigabe ist ECHT kleiner als das Depot (' + drin.length + ' von ' + alleFelder + ')');
      } },
    { name: 'ein Dokument, das war und nicht mehr gilt, bleibt sichtbar — mit seinem Ende',
      fn: (V) => {
        const liste = (V.getData().sektoren.people || {}).maintenanceObligationsAnd;
        assert.ok(Array.isArray(liste) && liste.length === 1);
        assert.equal(liste[0].end, '2021-07-31',
          'das Ende steht am Eintrag — gelöscht wäre die Geschichte weg, und sie gehört ihr');
      } },
    { name: 'das erwachsene Kind ist EINE Person, in zwei Rollen',
      fn: (V) => {
        const d = V.getData();
        const kind = (d.sektoren.people.childrenAndDependants || [])[0];
        const unterhalt = (d.sektoren.people.maintenanceObligationsAnd || [])[0];
        assert.equal(kind.person.ref, unterhalt.person.ref,
          'derselbe Registereintrag — kein zweiter Mensch für dieselbe Person (U2-ADR-021)');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
