'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P8 — Geschiedene mit einem pflegebedürftigen und einem fitten Elternteil
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: Personas-Papier vom 28.07.2026. Erzeugt über echte Schreibwege.

   WAS SIE PRÜFT: **Sub-Depot, Einhängen und Abgeben.** Sie legt ein Depot für
   sich an und steht dann vor der Frage, wohin die Mutter gehört. Dazu: eine
   **handschriftliche Vollmacht, die kein Formular kennt.**

   VOM VATER NICHTS — auch das steht im Papier, und es bleibt so: ein Depot, das
   einen Menschen führt, über den es nichts weiss, wäre eine Behauptung.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P8';
const TITEL = 'Geschiedene mit einem pflegebedürftigen und einem fitten Elternteil';
const PASSWORT = 'p8-beate-pw';
const SUB_PASSWORT = 'p8-mutter-sub-pw';

const MENSCHEN = Object.freeze([
  { schluessel: 'mutter', name: 'Gerda Winkelmann', beziehung: 'Mutter', tel: '0511 5550801' },
  { schluessel: 'vater', name: 'Ernst Winkelmann', beziehung: 'Vater', tel: '0511 5550802' },
  { schluessel: 'sohn', name: 'Jannis Kroll', beziehung: 'Sohn', tel: '0511 5550803' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'pflegekasse', name: 'Pflegekasse der AOK Niedersachsen' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Eine HANDSCHRIFTLICHE Vollmacht — die Instrument-Zeile kennt `form: schriftlich` und '
  + '`notariell`, aber eine formlose Handschrift ohne Zeugen ist rechtlich etwas Drittes. Hier '
  + 'als `schriftlich` mit Klartext-Vermerk eingetragen; das Feld sagt nicht, was das Papier ist.',
  'Der laufende Pflegegrad-ANTRAG — `socialInsurance.careLevel` kennt einen Grad, aber keinen '
  + 'Antrag, der läuft. Bis zum Bescheid gibt es dafür keinen Ort ausser einer Anmerkung.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Beate');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Beate', familyName: 'Kroll', birthDate: '1969-09-14',
    birthName: 'Winkelmann', maritalStatus: 'geschieden',
    streetAddress: 'Podbielskistraße 210', postcodeCity: '30655 Hannover', telephone: '0511 5550800',
  });
  setze('health', {
    healthInsurance: [{ override: 'KKH' }], insuranceNumber: 'H345678901', bloodType: 'AB+',
  });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', {
    person: { ref: String(p.sohn || '') },
    type: 'leiblich', training: 'nein',
  });
  /* Die Mutter: pflegebedürftig, der Antrag läuft. Der Grad steht NICHT — es gibt
     noch keinen Bescheid, und ein geratener Grad wäre eine Behauptung. */
  setze('socialInsurance', {
    longTermCareFund: [{ ref: String(inst.pflegekasse || '') }],
    careContractStorageLocation: 'Plastiktüte der Mutter, oberste Lage — noch nicht sortiert',
  });
  setze('advanceCare', {
    dailyRoutineActivities: 'Die Mutter will in ihrer Wohnung bleiben. Der Vater regelt alles selbst.',
  });
  setze('housing', { ownedOrRented: 'miete' });

  /* Das Sub-Depot für die Mutter — der echte Weg, nicht ein Vermerk. */
  const sub = await V.subDepotAnlegen({
    bezeichnung: 'Depot meiner Mutter',
    inhaberin: 'Gerda Winkelmann',
    vorname: 'Gerda', nachname: 'Winkelmann',
    verwaltungsTyp: 'verwaltet',
    vertretungsGrundlage: 'vollmacht',
    vertreteneRegisterId: p.mutter || undefined,
  }, SUB_PASSWORT);

  return { p, inst, sub };
}

function pruefungen(assert) {
  return [
    { name: 'das Sub-Depot der Mutter hängt am Anker — als eigener Umschlag, nicht als Feld',
      fn: (V) => {
        const liste = V.getData().verwalteteDepots || [];
        assert.equal(liste.length, 1, 'genau ein verwaltetes Depot');
        const s = liste[0];
        assert.equal(s.vorname, 'Gerda');
        assert.ok(s.depotUUID, 'es hat eine eigene Kennung — es ist ein Depot, kein Eintrag');
        assert.ok(s.umschlag || s.blob || s.daten,
          'und einen eigenen Umschlag: ' + Object.keys(s).join(','));
      } },
    { name: 'die Vertretungsgrundlage steht NICHT im Klartext — sie liegt hinter dem Sub-Passwort',
      fn: (V) => {
        /* Gemessen, und es ist die Zusage aus U2-ADR-151 §3: „Die Vertretungsgrundlage liegt
           hinter dem Sub-Passwort. Immer, ohne Schwelle." Bis zum 20.08. stand sie als
           Klartext-Metadatum neben dem versiegelten Inhalt und war für jeden lesbar, der den
           Anker öffnet. Was im Klartext BLEIBT, ist die Auswahlliste: Anzeigename, Akzent,
           Verwaltungstyp — damit sie ohne Sub-Passwort lesbar und sortierbar ist (D36).

           Diese Persona hält beides fest: dass die Grundlage weg ist, und dass die Liste
           trotzdem trägt. */
        const s = (V.getData().verwalteteDepots || [])[0];
        const klartext = Object.assign({}, s);
        delete klartext.umschlag;
        assert.equal(/vollmacht/i.test(JSON.stringify(klartext)), false,
          'die Grundlage ist nicht im Klartext: ' + JSON.stringify(klartext).slice(0, 200));
        assert.equal(klartext.verwaltungsTyp, 'verwaltet', 'der Typ bleibt lesbar');
        assert.equal(klartext.vorname, 'Gerda', 'und der Name — sonst wäre die Liste nicht bedienbar');
      } },
    { name: 'vom Vater steht nichts im Depot — und das ist richtig so',
      fn: (V) => {
        const d = V.getData();
        const vater = (d.menschen || []).find((m) => String(m.name).startsWith('Ernst'));
        assert.ok(vater, 'er steht im Register — als Mensch, den es gibt');
        const roh = JSON.stringify(d.sektoren);
        assert.equal(roh.includes(vater.id), false,
          'aber kein Bereichsfeld nennt ihn: ein Depot, das etwas über ihn behauptete, hätte es erfunden');
      } },
    { name: 'DER BEFUND: der laufende Pflegegrad-ANTRAG hat keinen Ort',
      fn: (V) => {
        const soz = V.getData().sektoren.socialInsurance || {};
        assert.ok(!soz.careLevel, 'kein Grad — es gibt noch keinen Bescheid');
        assert.match(String(soz.careContractStorageLocation), /noch nicht sortiert/,
          'die Lage steht als Klartext, weil es kein Feld für „Antrag läuft" gibt');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, SUB_PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
