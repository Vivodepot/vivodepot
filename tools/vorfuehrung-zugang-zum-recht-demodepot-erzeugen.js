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
            --en füllt zusätzlich Textsprache Englisch (derselbe Inhalt).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');

const STANDARD_PASSWORT = 'zugang-zum-recht-vorfuehrung-2026';
const DATEI_MAGIC_PREFIX = 'VIVODEPOT' + String.fromCharCode(1);

async function baueDemodepot({ passwort = STANDARD_PASSWORT, sprache = 'de' } = {}) {
  const { V } = ladeKern();
  await V.depotAnlegen(passwort);
  V.akteurSelbstErklaeren('Elisabeth');
  if (sprache === 'en') {
    // Englisch ist ein ANDOCKBARES Sprachmodul, kein bloßes Datenfeld — nur `textsprache: 'en'`
    // zu setzen ließe den Kern auf die eingebauten DEUTSCHEN Texte zurückfallen (live gemessen,
    // s. Bericht). Der echte Weg (Einstellungen → Module → Einlassen) dockt
    // `tools/textsatz-en-modul.json` über `modulEinlassen` an, GENAU wie eine Bürgerin es täte.
    const enModulPfad = path.join(__dirname, 'textsatz-en-modul.json');
    const enModul = JSON.parse(fs.readFileSync(enModulPfad, 'utf8'));
    const angenommen = V.modulEinlassen(JSON.stringify(enModul));
    if (!angenommen.angenommen) throw new Error('EN-Sprachmodul wurde nicht angenommen: ' + angenommen.grund);
    V._textsatzModuleAusDepotAnmelden(V.getData());
    V.getData().textsprache = 'en';
    V.textsatzNeuAnwenden();
  }

  // Teil 0 — die Person. Dieselbe Fixture-Persona wie der Auszug-Rendertest.
  V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  V.sektorFeldSetzen('identity', 'familyName', 'Wredenhagen');
  V.sektorFeldSetzen('identity', 'secondLastName', 'Sonnenschein');
  V.sektorFeldSetzen('identity', 'birthDate', '1958-03-14');
  V.sektorFeldSetzen('identity', 'streetAddress', 'Lindenweg 4');
  V.sektorFeldSetzen('identity', 'postcodeCity', '80331 München');
  V.sektorFeldSetzen('identity', 'telephone', '0171 2345678');
  V.sektorFeldSetzen('identity', 'email', 'elisabeth.ews@beispielpost.example');

  // Teil A — wirtschaftliche Verhältnisse.
  V.sektorFeldSetzen('assets', 'yourOwnIncomeNetMonthly', '1.180 €');
  V.sektorFeldSetzen('assets', 'incomeOfOtherPeopleInThe', '210 € Witwenrente');
  V.sektorFeldSetzen('assets', 'maintenanceObligations', 'keine');
  V.sektorFeldSetzen('assets', 'monthlyCommitments', 'Krankenzusatzversicherung 38 €');
  V.sektorFeldSetzen('assets', 'livingSituation', 'mit_angehoerigen');
  V.sektorFeldSetzen('assets', 'housingCostsOwnShare', '340 €');
  V.sektorFeldSetzen('assets', 'numberOfPeopleInTheHome', '2');

  // Teil B — Vermögen.
  V.sektorFeldSetzen('finance', 'ongoingLoansDebts', 'keine');
  V.sektorFeldSetzen('finance', 'valuablesStorageLocations', 'keine nennenswerten');

  // Teil C — die Angelegenheit.
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', {
    authority: 'Amtsgericht München', typeOfCase: 'Mieterhöhung, Widerspruch prüfen',
    opposingParty: 'Vermieterin (Hausverwaltung Musterweg GmbH)',
    alreadyAdvisedBy: 'noch keine',
  });

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

module.exports = { baueDemodepot, STANDARD_PASSWORT, DATEI_MAGIC_PREFIX };
