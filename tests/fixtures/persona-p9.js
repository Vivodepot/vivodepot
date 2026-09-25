'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P9 — Die Hinterbliebene
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT, und das Papier sagt es in einem Satz: **den einzigen Fall, in
   dem ein Fehlschlag endgültig ist.** Fremdes Depot, kein Mensch mehr zum
   Fragen, ein Zettel mit etwas, das ein Passwort sein könnte.

   „Alles andere lässt sich nach dem Release nachbessern, das hier nicht."

   DIESE PERSONA BAUT ZWEI SEITEN: das Depot des Verstorbenen (mit seinem
   Passwort) und den Versuch, es mit einem falschen zu öffnen. Der zweite Teil
   ist der Gegenstand.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P9';
const TITEL = 'Die Hinterbliebene';
const PASSWORT = 'p9-witwe-eigenes-pw';
const PASSWORT_VERSTORBENER = 'seine-datei-2019-vollstaendig';
const ZETTEL = 'seine-datei-2019';   // was auf dem Zettel steht — beinahe richtig

const MENSCHEN = Object.freeze([
  { schluessel: 'verstorbener', name: 'Wilhelm Radtke', beziehung: 'Ehemann (verstorben)' },
  { schluessel: 'notar', name: 'Katrin Lembke', beziehung: 'Notarin', tel: '0381 5550901' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'bank', name: 'Ostseesparkasse Rostock' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Ein Stick in der Schublade und ein Zettel, auf dem etwas steht, das ein Passwort sein könnte '
  + '— dafür gibt es in IHREM Depot keinen Ort, und es ist auch keiner vorgesehen: das Depot des '
  + 'Verstorbenen ist eine Datei, kein Eintrag. Sie führt es als Dokument-Vermerk.',
  'Erbschein BEANTRAGT — `advanceCare` kennt Instrumente und `personal` die Bestattung, aber '
  + 'kein laufendes Nachlassverfahren mit Aktenzeichen und Stand.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Renate');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Renate', familyName: 'Radtke', birthDate: '1952-01-27',
    maritalStatus: 'verwitwet',
    streetAddress: 'Warnowufer 12', postcodeCity: '18057 Rostock', telephone: '0381 5550900',
  });
  setze('personal', {
    typeOfFuneral: 'feuerbestattung',
    whatElseIWantToSayWhatElse: 'Sein Stick liegt in der Schublade im Flur. Der Zettel daneben ist '
      + 'in seiner Handschrift; ich weiss nicht, ob es das Passwort ist.',
  });
  V.dokumentAnlegen({
    typ: 'sonstiges', name: 'Sterbeurkunde Wilhelm Radtke', sektorId: 'identity',
    gueltigAb: '2026-07-09',
  });
  V.dokumentAnlegen({
    typ: 'sonstiges', name: 'Erbschein — beantragt, Aktenzeichen 12 VI 340/26', sektorId: 'advanceCare',
    gueltigAb: '2026-08-03',
  });
  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'DER FALL, IN DEM EIN FEHLSCHLAG ENDGÜLTIG IST: der Zettel ist beinahe richtig',
      fn: async () => {
        const { ladeKern } = require('../load-kern.js');
        /* Sein Depot — mit seinem echten Passwort angelegt und gesichert. */
        const { V: seins } = ladeKern();
        await seins.depotAnlegen(PASSWORT_VERSTORBENER);
        seins.akteurSelbstErklaeren('Wilhelm');
        seins.sektorFeldSetzen('identity', 'givenName', 'Wilhelm');
        seins.sektorFeldSetzen('identity', 'familyName', 'Radtke');
        const umschlag = await seins.depotSerialisieren();
        assert.ok(umschlag, 'die Datei existiert');

        /* Sie versucht es mit dem, was auf dem Zettel steht. */
        const { V: ihrVersuch } = ladeKern();
        let gescheitert = false;
        try {
          await ihrVersuch.depotLaden(umschlag, ZETTEL);
        } catch (e) { gescheitert = true; }
        assert.equal(gescheitert, true,
          'ein beinahe richtiges Passwort öffnet nichts — es gibt keine Nähe-Toleranz, und das ist richtig');
        assert.equal(ihrVersuch.getData(), null,
          'und es bleibt NICHTS im Speicher zurück: kein halb geöffnetes Depot');
      } },
    { name: 'mit dem VOLLSTÄNDIGEN Passwort geht dieselbe Datei auf — die Datei ist heil',
      fn: async () => {
        const { ladeKern } = require('../load-kern.js');
        const { V: seins } = ladeKern();
        await seins.depotAnlegen(PASSWORT_VERSTORBENER);
        seins.akteurSelbstErklaeren('Wilhelm');
        seins.sektorFeldSetzen('identity', 'givenName', 'Wilhelm');
        const umschlag = await seins.depotSerialisieren();
        const { V: zweiter } = ladeKern();
        await zweiter.depotLaden(umschlag, PASSWORT_VERSTORBENER);
        assert.equal(zweiter.getData().sektoren.identity.givenName, 'Wilhelm',
          'die Gegenprobe: der Fehlschlag lag am Passwort, nicht an der Datei');
      } },
    { name: 'ihr eigenes Depot führt seinen Stick als Vermerk — nicht als Depot',
      fn: (V) => {
        const t = String((V.getData().sektoren.personal || {}).whatElseIWantToSayWhatElse);
        assert.match(t, /Stick/);
        assert.equal((V.getData().verwalteteDepots || []).length, 0,
          'sein Depot ist kein Sub-Depot von ihr — sie verwaltet ihn nicht, er ist tot');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, PASSWORT_VERSTORBENER, ZETTEL, MENSCHEN, INSTITUTIONEN,
  UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
