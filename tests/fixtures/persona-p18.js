'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P18 — Die Kammer, die ein Modul zurückzieht
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C5.

   SIE IST KEINE BÜRGERIN, und das ist ihr Gegenstand. Sie ist der Fall, den das
   Produktmodell braucht und den bisher niemand durchgespielt hat: **eine Kammer
   liefert ihren Mitgliedern ein Modul, die Bürgerin trägt Daten ein, und dann
   zieht die Kammer das Modul zurück** — Anbieterwechsel, Insolvenz, Widerruf des
   Zertifikats, oder schlicht eine Datei, die die Bürgerin löscht.

   DIE ZUSICHERUNG, gegen die gemessen wird, steht im Kern (Schema 63→64,
   U2-ADR-050): **UMZUG, KEINE LÖSCHUNG.** Unbekannte Bereichsdaten wandern nach
   `data.bereicheVerwaist[<id>]` und bleiben dort vollständig liegen. Kommt der
   Bereich zurück, wandern sie zurück — **und zwar OHNE vorhandene Werte zu
   überschreiben**, denn in der Zwischenzeit kann die Bürgerin dort etwas
   eingetragen haben.

   WARUM SIE HIER ALS PERSONA STEHT UND NICHT ALS PROBE AM MECHANISMUS: der
   Mechanismus ist geprüft. Was NICHT geprüft war, ist der ganze Weg — anlegen,
   eintragen, zurückziehen, wiederkommen — mit den Augen dessen, dem es passiert.

   ERFUNDEN: die Kammer, ihre Kennungen und alle Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P18';
const TITEL = 'Die Kammer, die ein Modul zurückzieht';
const PASSWORT = 'p18-kammer-zieht-zurueck-2026';

const HERKUNFT = 'zzkammer';
const BEREICH_ID = 'zzkammerpflicht';
const BEREICH_LABEL = 'Kammerpflichten (Prüfstoff)';

const MODUL = Object.freeze({
  modulTyp: 'bereich', sprache: 'de',
  moduleVersion: 1,
  herkunft: HERKUNFT,
  anbieterId: HERKUNFT,
  bereiche: { [BEREICH_ID]: { label: BEREICH_LABEL } },
});

/* Was die Bürgerin in die Rubrik der Kammer geschrieben hat. Vier Angaben, die
   sie nirgendwo sonst hat. */
const EINGETRAGEN = Object.freeze({
  mitgliedsnummer: 'K-2019-04471',
  fortbildungspunkte: '182 Punkte, Stichtag 31.12.2025',
  berufshaftpflicht: 'Police 4471-A, Deckung 3 Mio., jährlich fällig 01.03.',
  aufsichtsstelle: 'Kammerbezirk Nord, Referat 2',
});

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'DER RÜCKZUG IST KEIN VORGANG, DEN DIE ANWENDUNG KENNT. Es gibt keinen Knopf „Modul '
  + 'zurückziehen" und keinen Weg, auf dem eine Kammer eine Rücknahme ANKÜNDIGT. Das Modul '
  + 'verschwindet, weil die Bürgerin es entfernt, weil das Zertifikat abläuft oder weil eine '
  + 'neue Fassung es ersetzt. **Die Rettung greift; die ANSAGE fehlt.** SCHICHT 3 — und der '
  + 'Unterschied zwischen „die Daten sind noch da" und „die Bürgerin weiss, dass sie noch da '
  + 'sind" ist genau der, um den es hier geht.',
  'DIE VERWAISTEN DATEN HABEN KEINEN ORT IN DER OBERFLÄCHE. `data.bereicheVerwaist` ist ein '
  + 'Rettungsslot, kein Bildschirm. Wer die Rubrik der Kammer nicht mehr sieht, sieht auch '
  + 'nicht, dass ihre Werte irgendwo liegen. SCHICHT 2 oder Kern — das ist eine Frage der '
  + 'Bedienung, nicht des Datenmodells, und sie ist eine Produktentscheidung.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Mitglied');

  /* 1 · Die Kammer liefert. */
  const d = V.getData();
  const eingelassen = V.modulEinlassen(MODUL, d);
  if (!eingelassen.angenommen) throw new Error('das Prüfstoff-Modul kam nicht an: ' + eingelassen.grund);
  V._bereichsModuleAusDepotAnmelden(d);

  /* 2 · Die Bürgerin trägt ein — in die Rubrik, die es ohne das Modul nicht gäbe. */
  d.sektoren[BEREICH_ID] = Object.assign({}, EINGETRAGEN);

  /* 3 · Sie trägt auch im Kern etwas ein, damit sich beides unterscheiden lässt. */
  V.sektorFeldSetzen('identity', 'givenName', 'Ilse');
  V.sektorFeldSetzen('identity', 'familyName', 'Kammermitglied');

  return { modul: MODUL, bereichId: BEREICH_ID };
}

function pruefungen(assert) {
  return [
    { name: 'Positivkontrolle — die Rubrik der Kammer steht, und die vier Werte liegen darin',
      fn: (V) => {
        const d = V.getData();
        assert.equal(d.bereichsModule.length, 1, 'das Modul liegt im Depot');
        assert.deepEqual(d.sektoren[BEREICH_ID], Object.assign({}, EINGETRAGEN),
          'die vier Werte stehen in der angedockten Rubrik');
      } },

    { name: 'DER RÜCKZUG: das Modul ist fort — und die Werte sind es NICHT',
      fn: (V) => {
        /* Der Vorgang, um den es geht. Die Kammer zieht zurück; im Depot heisst
           das schlicht: das Modul ist nicht mehr da. */
        const d = V.getData();
        d.bereichsModule = [];
        V._bereichsModuleAusDepotAnmelden(d);
        V.depotNormalisieren(d);

        assert.equal(d.sektoren[BEREICH_ID], undefined,
          'die Rubrik ist fort — sie gibt es ohne das Modul nicht mehr');
        assert.ok(d.bereicheVerwaist && d.bereicheVerwaist[BEREICH_ID],
          'DIE ZUSICHERUNG: die Werte sind nicht gelöscht, sie sind umgezogen');
        assert.deepEqual(d.bereicheVerwaist[BEREICH_ID], Object.assign({}, EINGETRAGEN),
          'und zwar VOLLSTÄNDIG — alle vier, unverändert');
      } },

    { name: 'DIE RÜCKKEHR: dasselbe Modul kommt wieder, und die Werte kommen mit',
      fn: (V) => {
        const d = V.getData();
        d.bereichsModule = [];
        V._bereichsModuleAusDepotAnmelden(d);
        V.depotNormalisieren(d);
        assert.ok(d.bereicheVerwaist[BEREICH_ID], 'Zwischenstand: die Werte liegen im Rettungsslot');

        /* Die Kammer liefert wieder — oder eine andere tut es unter derselben
           Kennung. */
        d.bereichsModule = [MODUL];
        V._bereichsModuleAusDepotAnmelden(d);
        V.depotNormalisieren(d);

        assert.deepEqual(d.sektoren[BEREICH_ID], Object.assign({}, EINGETRAGEN),
          'die vier Werte sind zurück in der Rubrik');
        assert.ok(!d.bereicheVerwaist[BEREICH_ID],
          'und der Rettungsslot ist geleert — keine zweite Kopie, die auseinanderläuft');
      } },

    { name: 'DIE HARTE ZUSICHERUNG: die Rückkehr überschreibt NICHTS, was in der Zwischenzeit entstand',
      fn: (V) => {
        /* Das ist die Stelle, an der eine naive Rettung Daten kostet. Zwischen
           Rückzug und Rückkehr kann die Bürgerin in der Rubrik etwas Neues
           eingetragen haben — etwa weil eine ANDERE Kammer dieselbe Kennung
           benutzt. Wer dann den Rettungsslot einfach zurückkippt, löscht das
           Neue. */
        const d = V.getData();
        d.bereichsModule = [];
        V._bereichsModuleAusDepotAnmelden(d);
        V.depotNormalisieren(d);

        /* Die Rubrik kommt zurück, und die Bürgerin trägt VORHER einen neuen
           Wert an derselben Stelle ein. */
        d.bereichsModule = [MODUL];
        V._bereichsModuleAusDepotAnmelden(d);
        d.sektoren[BEREICH_ID] = { mitgliedsnummer: 'NEU-2026-00001' };
        V.depotNormalisieren(d);

        assert.equal(d.sektoren[BEREICH_ID].mitgliedsnummer, 'NEU-2026-00001',
          'der NEUE Wert bleibt — die Rettung überschreibt ihn nicht');
        assert.equal(d.sektoren[BEREICH_ID].fortbildungspunkte, EINGETRAGEN.fortbildungspunkte,
          'und die alten Werte, die NICHT kollidieren, kommen trotzdem zurück');
      } },

    { name: 'Gegenprobe — ein Kern-Bereich wird von alledem nicht berührt',
      fn: (V) => {
        /* Ohne sie hiesse „die Rubrik ist fort" womöglich, dass `depotNormalisieren`
           alles ausräumt, was es findet. */
        const d = V.getData();
        d.bereichsModule = [];
        V._bereichsModuleAusDepotAnmelden(d);
        V.depotNormalisieren(d);
        assert.equal(d.sektoren.identity.givenName, 'Ilse',
          'der eingebaute Bereich bleibt unangetastet');
        assert.ok(!d.bereicheVerwaist.identitaet,
          'und landet nicht im Rettungsslot');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, baueDepot, pruefungen, UNTERLAGEN_OHNE_FELD,
  MODUL, BEREICH_ID, EINGETRAGEN };
