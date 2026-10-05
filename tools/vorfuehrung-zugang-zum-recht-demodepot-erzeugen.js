#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vorfuehrung-zugang-zum-recht-demodepot-erzeugen.js — „Vorführung Zugang zum Recht" (10.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Baut ein echtes, passwortgeschütztes `.vivodepot`-Vorführ-Depot: Testpersona
   „Elisabeth Wredenhagen-Sonnenschein" (dieselbe Fixture-Person wie
   tests/lese-app-zugang-zum-recht-auszug.test.js/tests/fixtures/persona-p*.js —
   kein neuer Name, ein etablierter). Alle 19 Fragen des Beratungshilfe-Auszugs
   (U2-ADR-326) sind mit einem Wert belegt — keine „— nicht erfasst —"-Lücke.

   Kein echter Name, keine echte Adresse, keine echte Bankverbindung — frei
   erfunden, dieselbe Sorgfalt wie tools/depot-format-testvektoren-erzeugen.js.

   Bauform wie tools/pro-modul-demo-depotdatei-erzeugen.js (echter
   depotAnlegen()/depotSerialisieren()-Weg), ohne den dortigen Modul-
   Zertifikatsteil — der Auszug ist ab Werk da, kein Einlass nötig
   (U2-ADR-326, tests/zugang-zum-recht-ab-werk-einlass.test.js).

   Aufruf:  node tools/vorfuehrung-zugang-zum-recht-demodepot-erzeugen.js [ziel] [--en]
            --en baut im englischen Produkt, mit den englischen Antworten aus DEPOT_DATEN.uebersetzung.en (05.10.2026;
            vorher derselbe deutsche Inhalt).

   SEIT 04.10.2026 IM PRODUKT ab Werk: das Depot entsteht im Privat-Produkt seiner Sprache (privat-de bzw. privat-en,
   tests/produkt-html-erzeugen.js), nicht im nackten Kern mit eingelassenem Sprachmodul. Seine Module sind damit die
   ausgelieferten, und es öffnet ohne Sperr-Hinweis. Die Dateien davor stehen als benannte Altdateien in
   tests/fixtures/vorfuehrung-zugang-zum-recht/altdatei-demo-*-2026-09-10.vivodepot (sie tragen ein eingelassenes Sprachmodul einer nie ausgelieferten Fassung).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');
const { produktHtml } = require('../tests/produkt-html-erzeugen.js');

const STANDARD_PASSWORT = 'zugang-zum-recht-vorfuehrung-2026';
const DATEI_MAGIC_PREFIX = 'VIVODEPOT' + String.fromCharCode(1);

/* Teil 0 — die Person (dieselbe Fixture-Persona wie der Auszug-Rendertest). Teil A — wirtschaftliche Verhältnisse.
   Teil B — Vermögen. Teil C — die Angelegenheit. */
const DEPOT_DATEN = Object.freeze({
  fields: {
    'identity.givenName': 'Elisabeth',
    'identity.familyName': 'Wredenhagen',
    'identity.secondLastName': 'Sonnenschein',
    'identity.birthDate': '1958-03-14',
    'identity.streetAddress': 'Lindenweg 4',
    'identity.postcodeCity': '80331 München',
    'identity.telephone': '0171 2345678',
    'identity.email': 'elisabeth.ews@beispielpost.example',
    'assets.yourOwnIncomeNetMonthly': '1.180 €',
    'assets.incomeOfOtherPeopleInThe': '210 € Witwenrente',
    'assets.maintenanceObligations': 'keine',
    'assets.monthlyCommitments': 'Krankenzusatzversicherung 38 €',
    'assets.livingSituation': 'mit_angehoerigen',
    'assets.housingCostsOwnShare': '340 €',
    'assets.numberOfPeopleInTheHome': '2',
    'finance.ongoingLoansDebts': 'keine',
    'finance.valuablesStorageLocations': 'keine nennenswerten',
  },
  lists: {
    'administration.ongoingAdministrativeCases': [{
      authority: 'Amtsgericht München', typeOfCase: 'Mieterhöhung, Widerspruch prüfen',
      opposingParty: 'Vermieterin (Hausverwaltung Musterweg GmbH)',
      alreadyAdvisedBy: 'noch keine',
    }],
  },
  uebersetzung: {
    en: {
      'fields.assets.incomeOfOtherPeopleInThe': '€210 widow’s pension',
      'fields.assets.maintenanceObligations': 'none',
      'fields.assets.monthlyCommitments': 'Supplementary health insurance €38',
      'fields.finance.ongoingLoansDebts': 'none',
      'fields.finance.valuablesStorageLocations': 'none worth mentioning',
      'lists.administration.ongoingAdministrativeCases.0.typeOfCase': 'Rent increase, check whether to object',
      'lists.administration.ongoingAdministrativeCases.0.opposingParty': 'Landlord (Hausverwaltung Musterweg GmbH)',
      'lists.administration.ongoingAdministrativeCases.0.alreadyAdvisedBy': 'nobody yet',
    },
  },
});

async function baueDemodepot({ passwort = STANDARD_PASSWORT, sprache = 'de' } = {}) {
  const { V } = ladeKern({ htmlPfad: produktHtml(sprache === 'en' ? 'privat-en' : 'privat-de') });
  await V.depotAnlegen(passwort);
  V.akteurSelbstErklaeren('Elisabeth');

  // Die Werte als Daten im Format der Showcase-Depots (fields/lists), mit Tabelle je weiterer Sprache: eine englische
  // Vorführung zeigt englische Antworten (05.10.2026). Derselbe Wächter wie dort — uebersetzungAnwenden wirft bei einem
  // Freitext ohne Übersetzung (tools/vorfuehrung-showcase-erzeugen.js; die Probe hält es über alle englischen Vorführungen).
  const { uebersetzungAnwenden } = require('./vorfuehrung-showcase-erzeugen.js');
  const daten = uebersetzungAnwenden(V, DEPOT_DATEN, sprache);
  for (const [kennung, wert] of Object.entries(daten.fields)) {
    const [sektor, feld] = kennung.split('.');
    V.sektorFeldSetzen(sektor, feld, wert);
  }
  for (const [kennung, eintraege] of Object.entries(daten.lists)) {
    const [sektor, feld] = kennung.split('.');
    for (const e of eintraege) V.listenEintragHinzufuegen(sektor, feld, e);
  }

  const umschlag = await V.depotSerialisieren();
  return { umschlag, passwort };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const enFlag = argv.includes('--en');
  const zielArg = argv.find((a) => !a.startsWith('--'));
  baueDemodepot({ sprache: enFlag ? 'en' : 'de' }).then(({ umschlag, passwort }) => {
    const ziel = zielArg || ('vorfuehrung-zugang-zum-recht' + (enFlag ? '-en' : '-de') + '.vivodepot');
    const text = DATEI_MAGIC_PREFIX + JSON.stringify(umschlag, null, 2);
    fs.writeFileSync(ziel, text, 'utf8');
    console.log('Demo-Depot geschrieben: ' + ziel);
    console.log('Passwort zum Öffnen: ' + passwort);
  }).catch((e) => { console.error('FEHLER:', e); process.exitCode = 1; });
}

module.exports = { baueDemodepot, STANDARD_PASSWORT, DATEI_MAGIC_PREFIX, DEPOT_DATEN };
