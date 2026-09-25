'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P15 — Die deutsch-türkische Doppelstaatlerin
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C2. Erzeugt über echte Schreibwege,
   wie P1–P12, P19/P20 und P17.

   WAS SIE BELEGT: die Schlüsselfrage **„ein Wert oder mehrere"**. P17 fragt, ob
   der Rechtsraum eine eigene Dimension braucht; diese hier fragt etwas anderes
   und Kleineres — ob ein Feld, das EINEN Wert führt, zwei tragen muss. Sie ist
   damit der billigste Prüfstein für die Frage, die morgen am Tisch liegt.

   IHR LEBEN IST EINES, IHRE AKTEN SIND ZWEI. Zwei Staatsangehörigkeiten, zwei
   Sozialversicherungsnummern, zwei Krankenversicherungen, zwei Steuernummern,
   zwei Meldeadressen. **Nichts davon ist ein Sonderfall** — es ist die Lage
   jeder Doppelstaatlerin, die in beiden Ländern gearbeitet hat.

   DER UNTERSCHIED ZU P17, und er ist der Grund für beide: bei P17 ist EIN Wert
   richtig und die BESCHRIFTUNG falsch. Hier sind ZWEI Werte richtig und es gibt
   nur EINEN Ort. Das sind zwei verschiedene Mängel, und ein Modul heilt nur den
   ersten.

   NACHTRAG — Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): DAS HIER GEBROCHENE IST JETZT
   REPARIERT, für genau die Felder aus Korb 1. `socialInsurance.rentenversicherungsnummer`
   und `finance.taxIdsTaxNumbers` sind mehrwertige Listen geworden (`rentenversicherung`/`steuerid`,
   je Eintrag `{system, nr}`) — die deutsche UND die türkische Nummer stehen jetzt NEBENEINANDER,
   unterschieden durch `system`, nicht mehr eine im Feld und eine im Freitext. Dasselbe gilt für
   `identity.ausweis_nr` (jetzt `ausweis`, Liste). Was WEITERHIN im Freitext bleibt, bleibt es
   aus einem ANDEREN Grund, nicht mehr aus Feldmangel: `nationalitaet` ist Korb 2 (nicht Teil
   dieses Umbaus), `kv_art` ist ein Verweis-Feld (Korb 2), die T.C. Kimlik No ist keine
   Ausweisnummer (bleibt bewusst Freitext, s. u.), und die zwei nebeneinanderlaufenden
   Rentenzeiten sind weiterhin die offene dritte Schlüsselfrage.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten. Die T.C. Kimlik No ist nach
   der echten Form gebildet (elf Ziffern), trägt aber keine gültige Prüfziffer.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P15';
const TITEL = 'Die deutsch-türkische Doppelstaatlerin';
const PASSWORT = 'p15-iki-vatan-2026';

/* DIE ZWEI PAARE, um die es geht. Je Paar: ein Ort im Kern, zwei Werte im Leben. */
const RV_DE = '12 030675 M 123';                 // deutsche Rentenversicherungsnummer
const SGK_TR = '12345678901';                    // türkische SGK-Nummer (= T.C. Kimlik No)
const KIMLIK = '12345678901';                    // T.C. Kimlik No, elfstellig
const STEUER_DE = '86 095 742 719';              // deutsche Steuer-Identifikationsnummer
const STEUER_TR = '9876543210';                  // türkische Vergi Kimlik Numarası

const MENSCHEN = Object.freeze([
  { schluessel: 'mutter', name: 'Emine Yıldırım', beziehung: 'Mutter', tel: '+90 232 5550101' },
  { schluessel: 'bruder', name: 'Kerem Yıldırım', beziehung: 'Bruder' },
  { schluessel: 'mann', name: 'Stefan Reiter', beziehung: 'Ehemann' },
]);

const INSTITUTIONEN = Object.freeze([
  { schluessel: 'dr', name: 'Deutsche Rentenversicherung Bund' },
  { schluessel: 'sgk', name: 'Sosyal Güvenlik Kurumu (SGK)' },
  { schluessel: 'aok', name: 'AOK Bayern' },
  { schluessel: 'konsulat', name: 'Türkisches Generalkonsulat München' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'ZWEI STAATSANGEHÖRIGKEITEN, EIN FELD. `identity.nationality` ist ein Textfeld und '
  + 'führt EINEN Wert. Beide Staatsangehörigkeiten stehen darum in einem String, durch '
  + 'Komma getrennt — ein BEHELF: nichts im Kern weiss, dass es zwei sind, und kein Export '
  + 'kann sie trennen. SCHICHT 2 (Korb 2, nicht Teil von A448) — bleibt offen.',
  'ZWEI KRANKENVERSICHERUNGEN. `health.healthInsurance` ist ein Verweis-Feld und nimmt eine '
  + 'Kasse. Wer in beiden Ländern versichert ist — und das ist bei Rentenzeiten in beiden '
  + 'Ländern der Regelfall —, hat zwei. SCHICHT 2 (Korb 2, nicht Teil von A448) — bleibt offen.',
  'DIE T.C. KIMLIK NO HAT WEITERHIN KEINEN ORT — aus einem anderen Grund als vorher. Sie ist '
  + 'die türkische Personenkennziffer, kein Ausweisdokument; sie in `identity.idDocuments` zu '
  + 'legen wäre falsch, selbst mehrwertig — ein Systemwert ändert nichts daran, dass es kein '
  + 'Ausweis ist. Bleibt bewusst im Freitext.',
  'DIE ZWEI ZEITRÄUME HABEN KEINEN ORT — und das ist der Befund, der die dritte '
  + 'Schlüsselfrage berührt („ein Zeitraum oder zwei"). Rentenzeiten in Deutschland und in '
  + 'der Türkei laufen NEBENEINANDER, nicht nacheinander; das deutsch-türkische '
  + 'Sozialversicherungsabkommen rechnet sie zusammen. Ein Listen-Eintrag trägt heute EINEN '
  + '`nr`-Wert, kein Zeitraum-Unterfeld — GEBLIEBEN OFFEN, auch nach A448.',
  /* NACHGEZOGEN (Schnitt Glied 3, 22.08.2026): die zwei Punkte „ZWEI SOZIALVERSICHERUNGSNUMMERN"
     und „ZWEI STEUERNUMMERN" sind AUFGELÖST — beide Felder sind jetzt mehrwertige Listen mit
     einem `system`-Unterfeld, die deutsche und die türkische Nummer stehen nebeneinander. Aus
     der Liste entfernt, nicht stillschweigend — s. NACHTRAG im Dateikopf. */
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Ayşe');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Ayşe',
    familyName: 'Reiter',
    birthName: 'Yıldırım',
    birthDate: '1975-06-03',
    /* WEITERHIN EIN BEHELF (Korb 2, nicht Teil von A448): zwei Staatsangehörigkeiten in
       EINEM Feld — anders als bei den Korb-1-Nummern unten gibt es hier keine Liste. */
    nationality: 'deutsch, türkisch',
    birthPlace: 'İzmir',
    streetAddress: 'Rosenheimer Straße 84',
    postcodeCity: '81669 München',
    telephone: '+49 89 5550102',
    email: 'ayse.reiter@example.de',
    maritalStatus: 'verh',
  });
  /* Schnitt Glied 3 (A448, U2-ADR-161): `ausweis` ist eine Liste — ein Eintrag je System. */
  V.listenEintragHinzufuegen('identity', 'idDocuments', { system: 'DE', documentNumber: 'L01X00T47' });

  /* AUFGELÖST (Schnitt Glied 3): die deutsche UND die türkische Rentenversicherungsnummer
     stehen jetzt NEBENEINANDER in derselben Liste, unterschieden durch `system` — nicht mehr
     eine im Feld und eine im Freitext. */
  V.listenEintragHinzufuegen('socialInsurance', 'pensionInsuranceNumbers', { system: 'DE', pensionInsuranceNumber: RV_DE });
  V.listenEintragHinzufuegen('socialInsurance', 'pensionInsuranceNumbers', { system: 'TR', pensionInsuranceNumber: SGK_TR });

  setze('health', {
    healthInsurance: [{ override: 'AOK Bayern' }],
    insuredThrough: 'Ayşe Reiter',
    bloodType: 'B+',
  });

  /* AUFGELÖST (Schnitt Glied 3): dieselbe Nebeneinander-Liste für die Steuer-IDs.
     Frühere Fixture-Falle (A379): das Feld heisst `steuerid`, nicht `steuer_id` — ein erster
     Anlauf dieser Fixture schrieb den falschen Namen und `sektorFeldSetzen` nahm ihn klaglos
     an. `listenEintragHinzufuegen` prüft den Feldnamen ebenfalls nicht selbst — die Probe
     „DER FELDNAME IST EIN PHANTOM-RISIKO" unten hält die Lehre weiter fest, jetzt gegen den
     generischen Schreibweg statt gegen sektorFeldSetzen. */
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: STEUER_DE });
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'TR', taxNumber: STEUER_TR });

  /* WAS WEITERHIN KEINEN ORT HAT, steht im einzigen Freitextfeld des Bereichs — die T.C.
     Kimlik No (keine Ausweisnummer) und die nebeneinanderlaufenden Rentenzeiten (offene
     dritte Schlüsselfrage). Die SGK- und Vergi-Kimlik-Nummern selbst stehen jetzt NICHT mehr
     hier — sie sind oben in die Listen gewandert. */
  setze('identity', {
    furtherDetails: [
      'T.C. Kimlik No: ' + KIMLIK + ' (türkische Personenkennziffer — kein Ausweis, kein Feld)',
      'Krankenversicherung Türkei: SGK Genel Sağlık Sigortası, ruhend seit 2009',
      'Rentenzeiten: Türkei 1994-2001 (SGK) UND Deutschland 2002-heute (DRV Bund).',
      'Die Zeiten laufen nach dem deutsch-türkischen Sozialversicherungsabkommen ZUSAMMEN;',
      'die Liste unten führt beide Nummern, aber keinen eigenen Zeitraum je Eintrag.',
    ].join('\n'),
  });

  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'Positivkontrolle — das Depot entsteht, beide Länder stehen in den Listen',
      fn: (V) => {
        const d = V.getData();
        assert.equal(d.sektoren.identity.givenName, 'Ayşe');
        assert.equal(d.sektoren.socialInsurance.pensionInsuranceNumbers.length, 2);
        assert.equal(d.sektoren.finance.taxIdsTaxNumbers.length, 2);
      } },

    { name: 'ZWEI STAATSANGEHÖRIGKEITEN stehen weiterhin in EINEM String — Korb 2, nicht Teil von A448',
      fn: (V) => {
        const n = V.getData().sektoren.identity.nationality;
        assert.equal(n, 'deutsch, türkisch',
          'nationalitaet ist Korb 2 und bleibt unangetastet — anders als die Korb-1-Nummern unten');
        assert.equal(typeof n, 'string',
          'es ist ein String und keine Liste — nichts im Kern weiss, dass es zwei sind');
      } },

    { name: 'AUFGELÖST: die deutsche UND die türkische Nummer stehen NEBENEINANDER, per system unterschieden',
      fn: (V) => {
        /* Der eigentliche Ertrag von Schnitt Glied 3 (A448): anders als bei P17 (falsche
           Beschriftung, ein Wert) fehlte hier ein ZWEITER ORT für einen zweiten, ebenso
           gültigen Wert. Jetzt trägt die Liste beide, ohne dass eine „die richtige" wäre. */
        const rv = V.getData().sektoren.socialInsurance.pensionInsuranceNumbers;
        assert.deepEqual(rv.map((e) => e.system).sort(), ['DE', 'TR']);
        assert.ok(rv.find((e) => e.system === 'DE').pensionInsuranceNumber === RV_DE);
        assert.ok(rv.find((e) => e.system === 'TR').pensionInsuranceNumber === SGK_TR);
        const st = V.getData().sektoren.finance.taxIdsTaxNumbers;
        assert.deepEqual(st.map((e) => e.system).sort(), ['DE', 'TR']);
        assert.ok(st.find((e) => e.system === 'DE').taxNumber === STEUER_DE);
        assert.ok(st.find((e) => e.system === 'TR').taxNumber === STEUER_TR);
      } },

    { name: 'WAS WEITERHIN IM FREITEXT STEHT, steht dort aus einem anderen Grund als vorher',
      fn: (V) => {
        const notiz = String(V.getData().sektoren.identity.furtherDetails || '');
        assert.ok(notiz.includes(KIMLIK), 'T.C. Kimlik No steht weiterhin im Freitext (kein Ausweis, kein Feld)');
        // Hinweis: SGK_TR und KIMLIK sind in dieser Fixture zufällig dieselbe Ziffernfolge (beide
        // erfunden) — darum auf die BESCHRIFTUNG prüfen, nicht auf die blosse Zahl.
        assert.ok(!notiz.includes('SGK-Nummer'), 'SGK-Nummer steht NICHT mehr im Freitext — sie ist in die Liste gewandert');
        assert.ok(!notiz.includes(STEUER_TR), 'Vergi Kimlik Numarası steht NICHT mehr im Freitext — sie ist in die Liste gewandert');
        assert.match(notiz, /ZUSAMMEN/,
          'die zwei Rentenzeiten laufen weiterhin nebeneinander — ein Listen-Eintrag trägt keinen eigenen Zeitraum');
      } },

    { name: 'DER FELDNAME IST EIN PHANTOM-RISIKO — gilt auch für den generischen Listen-Schreibweg',
      fn: (V) => {
        /* A379 am eigenen Bau, jetzt gegen listenEintragHinzufuegen statt sektorFeldSetzen:
           ein erfundener Feldname wird ebenso klaglos angenommen. */
        const felder = [];
        (function geh(n) {
          if (!n) return;
          if (Array.isArray(n)) return n.forEach(geh);
          if (n.id && n.typ) felder.push(n.id);
          if (n.felder) n.felder.forEach(geh);
          if (n.sektionen) n.sektionen.forEach(geh);
        })(V.SEKTOREN.find((s) => s.id === 'finance').sektionen);
        assert.ok(felder.includes('taxIdsTaxNumbers'), 'das Feld heisst `taxIdsTaxNumbers`');
        assert.ok(!felder.includes('steuer_id'), '… und NICHT `steuer_id`');
        V.__ungeprueft.listenEintragHinzufuegen('finance', 'erfundenes_feld_p15', { x: 1 });   // Produktweg ohne Harness-Prüfung — gerade die Toleranz wird belegt
        assert.ok(Array.isArray(V.getData().sektoren.finance.erfundenes_feld_p15),
          'ein erfundener Feldname wird klaglos angenommen — der generische Schreibweg prüft den Katalog auch hier nicht');
        delete V.getData().sektoren.finance.erfundenes_feld_p15;
      } },

    { name: 'Gegenprobe — Ausweis ist jetzt ebenfalls eine Liste, mit genau einem Eintrag (nur DE bekannt)',
      fn: (V) => {
        const ausweis = V.getData().sektoren.identity.idDocuments;
        assert.equal(ausweis.length, 1);
        assert.equal(ausweis[0].system, 'DE');
        assert.equal(ausweis[0].documentNumber, 'L01X00T47');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, baueDepot, pruefungen, UNTERLAGEN_OHNE_FELD,
  RV_DE, SGK_TR, KIMLIK, STEUER_DE, STEUER_TR, MENSCHEN, INSTITUTIONEN };
