#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   TEIL B, NACHTRAG — ALLE FALSCH ABGELEGTEN ANFÄNGE AUF EINMAL
   ────────────────────────────────────────────────────────────────────────────
   ANLASS (Auftrag „Der grosse Zug", Teil B Nachtrag, 21.08.2026): Punkt 4 des
   A445-Berichts — CC hatte EINEN Fall gemeldet und nicht nach weiteren gesucht.

   WARUM DAS DER PUNKT IST, AN DEM DER SCHNITT SCHEITERN KANN: Wird nur
   `bav_rentenbeginn` umgemarkt und fällt später ein zweites falsch abgelegtes
   Feld auf, ist das eine ZWEITE Migrationsstufe über Dateien, die niemand
   einsammeln kann — genau das, wogegen der gemeinsame Schnitt gebaut wird.

   ZWEI RICHTUNGEN, EINE LISTE:
     R1 — trägt `laeuftAb`, ist aber ein ANFANG.
     R2 — trägt GAR KEINE Marke, ist aber ein Anfang. Ein solches Feld verliert
          heute nichts; bekommt es später eine Marke, zieht sein Wert um — und
          das ist wieder eine Migration.

   KEIN UMMARKEN. Die Liste wird erhoben, nicht ausgeführt.

   WAS EIN „ANFANG" IST, und das Kriterium steht hier und nicht im Bericht:
   der Wert benennt den Zeitpunkt, AB DEM etwas gilt — nicht ein Ereignis, das
   einmal stattfand. Ein Geburtsdatum ist kein Gültigkeitsbeginn, ein
   „Bestellt seit" ist einer. Wo die Beschriftung BEIDES nennt, wird der Fall
   BENANNT und nicht entschieden.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const ANFANG = 'anfang', ENDE = 'ende', BEIDES = 'beides-genannt', KEIN_FALL = 'kein-fall';

/* Je Feld eine Zeile: [einordnung, begruendung]. Jedes Datumsfeld und jedes
   markierte Feld MUSS hier stehen — ein Feld ohne Zeile lässt den Lauf durchfallen,
   damit nichts stillschweigend wegfällt. */
const ENTSCHEIDUNG = {
  /* ── Richtung 1 · trägt `laeuftAb` ───────────────────────────────────────── */
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): die fünf `..._gueltig`-Flachfelder unten
  // sind zu Listen-Unterfeldern geworden (`ausweis/gueltig` u. a., Schlüssel mit `/` statt `_`,
  // s. `felderSammeln`). Reine Umbenennung — keines trägt als Unterfeld noch `laeuftAb` (das
  // Listen-Unterfeld hat gar keine Marke mehr, s. `korb1-mehrwertig-pruefermine.test.js`), die
  // Einordnung ENDE bleibt inhaltlich unverändert.
  'identity.idDocuments/validUntil': [ENDE, 'gültig bis — ein Ende'],
  'identity.residencePermit/validUntil': [ENDE, 'gültig bis — ein Ende'],
  'mobility.drivingLicenceValidUntil': [ENDE, 'gültig bis — ein Ende'],
  'mobility.passportValidUntil': [ENDE, 'gültig bis — ein Ende'],
  'mobility.elefandRegistrations/validUntil': [ENDE, 'Registrierung gültig bis — ein Ende'],
  'finance.companyPensionAgreedStartDate': [ANFANG, 'BEHOBEN 23.08.2026 (Auftrag „Die Feld-Remarkierung"): war der gemeldete Fall — „bAV — vereinbarter RentenBEGINN" trug `laeuftAb`, der Wert lag in `.bis` und wurde als Ablauf gelesen. Migriert auf `giltAb` (Schema 74→75). Bleibt als ANFANG-Zeile stehen, damit die Selbstprüfung (jedes Feld im Gegenstand trägt eine Zeile) weiter greift — `richtung` zeigt jetzt „R2", weil dieser Erkenner nur auf `laeuftAb` prüft, nicht auf „korrekt giltAb"; das ist eine Ungenauigkeit DIESES Werkzeugs, keine erneute Verwechslung am Feld.'],
  'finance.privatePensionProvisionAgreed': [BEIDES, 'die Beschriftung nennt BEIDES: „vereinbarter Ablauf/Rentenbeginn". Welches Ende gemeint ist, entscheidet man — geraten wäre hier teurer als gefragt'],
  'finance.creditCards/validUntil': [ENDE, 'Karte gültig bis — ein Ende'],
  'health.healthInsuranceCards/validUntilInclEhic': [ENDE, 'Karte gültig bis — ein Ende'],
  'education.employmentContractFixedTerm': [ENDE, 'befristet bis — ein Ende'],
  'socialInsurance.careLevelTimeLimitedUntil': [ENDE, 'befristet bis — ein Ende'],
  'socialInsurance.severeDisabilityCards/validUntil': [ENDE, 'Ausweis gültig bis — ein Ende'],
  'housing.tenancyAgreementFixedTermUntil': [ENDE, 'befristet bis — ein Ende'],
  'housing.furtherHomes/tenancyAgreementFixedTermUntil': [ENDE, 'befristet bis — ein Ende'],
  'emergencyPreparedness.drinkingWaterSupplyCheckShelf': [ENDE, 'Haltbarkeit prüfen bis — ein Ende'],
  'emergencyPreparedness.foodSuppliesCheckShelfLifeBy': [ENDE, 'Haltbarkeit prüfen bis — ein Ende'],

  /* ── Marke `frist` — eigener Gegenstand, nicht Teil dieser Zählung ───────── */
  'socialInsurance.noticeDated': [KEIN_FALL, 'Marke `frist`: eine Frist NIMMT ETWAS WEG, sie ist keine Gültigkeit. Der Wert bleibt im Bereich und wird nur gelesen (A419)'],
  'socialInsurance.gdbReviewReAssessmentDate': [KEIN_FALL, 'Marke `frist` — s. pflegegrad_bescheid_vom'],
  'socialInsurance.terminationDate': [KEIN_FALL, 'Marke `frist` — s. pflegegrad_bescheid_vom'],
  'socialInsurance.registeredAsJobSeekingOn': [KEIN_FALL, 'Marke `frist` — s. pflegegrad_bescheid_vom'],
  'socialInsurance.registeredAsUnemployedOn': [KEIN_FALL, 'Marke `frist` — s. pflegegrad_bescheid_vom'],
  'housing.noticeDate': [KEIN_FALL, 'Marke `frist` — s. pflegegrad_bescheid_vom'],
  'housing.moveOutDate': [KEIN_FALL, 'Marke `frist` — s. pflegegrad_bescheid_vom'],
  'housing.handoverDateNewHome': [KEIN_FALL, 'Marke `frist` — s. pflegegrad_bescheid_vom'],

  /* ── Richtung 2 · Datumsfeld OHNE Marke ──────────────────────────────────── */
  // Schnitt Glied 3: `ausweis_ausgestellt`/`aufenthaltstitel_ausgestellt` sind ebenfalls zu
  // Listen-Unterfeldern geworden (reine Umbenennung, s. Kommentar oben an Richtung 1).
  'identity.idDocuments/issuedOn': [ANFANG, 'DER STÄRKSTE FALL DIESER RICHTUNG: das Ausstellungsdatum IST der Beginn der Gültigkeit, und sein Gegenstück `ausweis/gueltig` trägt bereits `laeuftAb` (bzw. trug es vor Schnitt Glied 3 als Flachfeld). Die zwei Hälften desselben Zeitraums liegen in zwei Feldern, eine markiert, eine nicht'],
  'identity.residencePermit/issuedOn': [ANFANG, 'wie ausweis/ausgestellt — Gegenstück `aufenthaltstitel/gueltig`'],
  'mobility.passportIssuedOn': [ANFANG, 'wie ausweis_ausgestellt — Gegenstück `reisepass_gueltig` trägt `laeuftAb`'],
  'people.childrenAndDependants/validSince': [ANFANG, 'die Beschriftung sagt es wörtlich: „Bestellt / gültig SEIT"'],
  'people.maintenanceObligationsAnd/start': [ANFANG, 'Beschriftung „Beginn"; sein Gegenstück `unterhalt_ende` steht daneben'],
  'advanceCare.provisionInstruments/appointedSince': [ANFANG, 'Beschriftung „Bestellt seit" — ab wann die Betreuung gilt'],
  'administration.ongoingAdministrativeCases/start': [BEIDES, 'die Beschriftung nennt beides: „Datum (Antrag/Beginn)". Ein Antragsdatum ist ein Ereignis, ein Beginn eine Gültigkeit — welches gemeint ist, ist eine Produktentscheidung'],

  /* ── Datumsfelder ohne Marke, die KEIN Anfang sind ───────────────────────── */
  'identity.birthDate': [KEIN_FALL, 'ein Ereignis, das einmal stattfand — kein Gültigkeitsbeginn. Ein Mensch „gilt" nicht ab seinem Geburtstag'],
  'identity.dateOfSeparation': [KEIN_FALL, 'Ereignisdatum'],
  'identity.formerNames/usedUntil': [ENDE, 'ein ENDE ohne Marke. Nicht Gegenstand dieser Zählung (sie sucht Anfänge), aber im selben Durchgang zu bedenken'],
  'people.childrenAndDependants/trainingExpectedToEnd': [ENDE, 'ein Ende ohne Marke — s. gefuehrt_bis'],
  'people.guidedBirthEntryDateOfBirthNot': [KEIN_FALL, 'Zwischenstand des Geburts-Assistenten, noch nicht übernommen — kein Bestandsfeld im Sinne dieser Zählung'],
  'people.maintenanceObligationsAnd/end': [ENDE, 'ein Ende ohne Marke — s. gefuehrt_bis'],
  'advanceCare.provisionInstruments/dateOfLastChange': [KEIN_FALL, '„Datum der letzten Änderung" — ein Ereignis'],
  'advanceCare.provisionInstruments/copyDepositedOn': [KEIN_FALL, '„Abschrift hinterlegt am" — ein Ereignisdatum (wann eine Stelle die Abschrift eingestellt hat), kein Gültigkeitsbeginn; dasselbe Muster wie vorsorge_instrumente/datum daneben (13.09.2026, U2-ADR-410)'],
  'advanceCare.provisionInstruments/timeLimitedUntilIfAgreed': [ENDE, 'ein Ende ohne Marke — s. gefuehrt_bis'],
  'advanceCare.provisionInstruments/nextCourtReviewDateIfKnown': [KEIN_FALL, '„Nächster gerichtlicher Überprüfungstermin" — ein Termin, der Sorte `frist` näher als einer Gültigkeit'],
  'administration.ongoingAdministrativeCases/deadline': [ENDE, 'ein Ende ohne Marke — s. gefuehrt_bis'],
  'emergencyPreparedness.firstAidKitLastChecked': [KEIN_FALL, '„zuletzt geprüft" — ein Ereignis in der Vergangenheit'],
};

/* Die gepflanzten Proben — gegen den Sucher, nicht gegen den Bestand. */
const PROBE_ANFANG = { schluessel: 'probe.probe_mietbeginn', label: 'Mietbeginn — Probe', marken: ['laeuftAb'] };
const PROBE_ENDE = { schluessel: 'probe.probe_ausweis_gueltig', label: 'Ausweis — gültig bis (Probe)', marken: ['laeuftAb'] };

function felderSammeln(V) {
  const raus = [];
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        raus.push({ schluessel: s.id + '.' + f.id, bereich: s.id, feld: f.id,
          label: String(f.label || ''), marken: (f.marken || []).slice(), typ: f.typ });
        for (const u of (f.unterFelder || [])) {
          raus.push({ schluessel: s.id + '.' + f.id + '/' + u.id, bereich: s.id, feld: f.id + '/' + u.id,
            label: String(u.label || ''), marken: (u.marken || []).slice(), typ: u.typ });
        }
      }
    }
  }
  return raus;
}

/* Der Sucher: eine Beschriftung, die einen Beginn benennt. Er ist bewusst GROB —
   entschieden wird in der Tabelle, nicht hier. Er dient allein der Positivkontrolle
   und dem Fangen neuer Felder. */
/* `beginn` steht OHNE vordere Wortgrenze: im Deutschen ist der Anfang meist ein
   Kompositum — Mietbeginn, Rentenbeginn, Vertragsbeginn. Mit `\bbeginn\b` fand der
   Sucher seine eigene Positivkontrolle nicht, und das ist genau der Fall, den eine
   gepflanzte Probe fangen soll: ein Erkenner, der zu kurz greift, meldet still zu wenig. */
const ANFANG_MUSTER = /\bseit\b|beginn|\bab\b|ausgestellt|erteilt|bestellt/i;
function riechtNachAnfang(f) {
  return ANFANG_MUSTER.test(f.label) || ANFANG_MUSTER.test(f.feld);
}

function messen(V) {
  const alle = felderSammeln(V);
  const imGegenstand = alle.filter((f) => f.typ === 'datum' || (f.marken || []).length);

  const ohneZeile = imGegenstand.filter((f) => !ENTSCHEIDUNG[f.schluessel]).map((f) => f.schluessel);
  const verwaist = Object.keys(ENTSCHEIDUNG)
    .filter((k) => !imGegenstand.some((f) => f.schluessel === k));

  const funde = [];
  for (const f of imGegenstand) {
    const zeile = ENTSCHEIDUNG[f.schluessel];
    if (!zeile) continue;
    const [einordnung, grund] = zeile;
    if (einordnung !== ANFANG && einordnung !== BEIDES) continue;
    funde.push({ schluessel: f.schluessel, bereich: f.bereich, feld: f.feld, label: f.label,
      richtung: (f.marken || []).includes('laeuftAb') ? 'R1 (falsch markiert)' : 'R2 (gar nicht markiert)',
      einordnung, grund });
  }

  const mitLaeuftAb = imGegenstand.filter((f) => (f.marken || []).includes('laeuftAb'));
  return {
    gegenstand: { datumsfelderUndMarkierte: imGegenstand.length, mitLaeuftAb: mitLaeuftAb.length },
    funde,
    selbstpruefung: {
      ohneZeile, verwaist,
      probeAnfangGefunden: riechtNachAnfang({ label: PROBE_ANFANG.label, feld: 'probe_mietbeginn' }),
      probeEndeGefunden: riechtNachAnfang({ label: PROBE_ENDE.label, feld: 'probe_ausweis_gueltig' }),
    },
  };
}

function bericht(m) {
  const z = [];
  z.push('Gegenstand: ' + m.gegenstand.datumsfelderUndMarkierte + ' Felder (Datumsfelder + markierte)');
  z.push('            davon mit `laeuftAb`: ' + m.gegenstand.mitLaeuftAb + ' — Rohzahl SP Bau: 16');
  z.push('');
  z.push('DIE LISTE — ' + m.funde.length + ' Fund(e), je Zeile: Feld · Bereich · Richtung · Einordnung');
  for (const f of m.funde) {
    z.push('  ' + f.schluessel);
    z.push('      Beschriftung : ' + f.label);
    z.push('      Richtung     : ' + f.richtung + '   Einordnung: ' + f.einordnung);
    z.push('      Grund        : ' + f.grund);
  }
  z.push('');
  z.push('SELBSTPRÜFUNG');
  z.push('  Feld ohne Entscheidungszeile : ' + (m.selbstpruefung.ohneZeile.join(', ') || 'keines'));
  z.push('  Zeile ohne Feld im Kern      : ' + (m.selbstpruefung.verwaist.join(', ') || 'keine'));
  z.push('  gepflanzter ANFANG gefunden  : ' + (m.selbstpruefung.probeAnfangGefunden ? 'ja' : 'NEIN — der Sucher greift zu kurz'));
  z.push('  gepflanztes ENDE gefunden    : ' + (m.selbstpruefung.probeEndeGefunden ? 'JA — der Sucher greift zu weit' : 'nein'));
  return z.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const m = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(m));
  const s = m.selbstpruefung;
  if (s.ohneZeile.length || s.verwaist.length || !s.probeAnfangGefunden || s.probeEndeGefunden) {
    console.error('\nABBRUCH: die Selbstprüfung ist nicht sauber — die Liste oben ist nicht vollständig belastbar.');
    process.exit(2);
  }
}

module.exports = { messen, bericht, laufen, ENTSCHEIDUNG, felderSammeln, riechtNachAnfang,
  ANFANG, ENDE, BEIDES, KEIN_FALL, PROBE_ANFANG, PROBE_ENDE };
