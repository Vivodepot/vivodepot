'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P14 — Die ungarische Hebamme mit Beinprothese
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C5.

   ZWEI DINGE AUF EINMAL, und darum steht sie am Ende der Reihe: ein fremder
   Rechtsraum UND ein Körper, für den der Kern eine deutsche Sprache spricht.

   WAS SIE ZU DEN DREI MÄNGELN AUS P17/P15/P13 HINZUFÜGT, ist ein VIERTER, und
   er ist der unangenehmste: **ein Feld, das den falschen GEGENSTAND benennt.**
   `health.implantsProsthesesPacemakers` ist der einzige Ort, an dem eine Prothese landen kann
   — und eine Beinprothese ist kein Implantat. Sie wird nicht eingesetzt, sie
   wird angelegt. Wer sie unter „Implantate" führt, hat sie abgelegt und falsch
   benannt; die Angabe geht nicht verloren, sie wird unwahr.

   Das ist etwas anderes als P17 (falsche Beschriftung bei richtigem Gegenstand)
   und etwas anderes als P13 (kein Gegenstand). Hier gibt es einen Gegenstand,
   er ist besetzt, und er ist der falsche.

   WAS SIE BRICHT, IST HIER NICHT REPARIERT — so beauftragt.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten. Die TAJ-Nummer ist nach der
   echten neunstelligen Form gebildet.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P14';
const TITEL = 'Die ungarische Hebamme mit Beinprothese';
const PASSWORT = 'p14-szuleszno-protezis-2026';

const TAJ = '123 456 789';                 // Társadalombiztosítási Azonosító Jel
const ADOAZONOSITO = '8123456789';         // Adóazonosító jel (Steuer-Kennzeichen)
const KAMMER_NR = 'MESZK-04-11827';        // Magyar Egészségügyi Szakdolgozói Kamara

const MENSCHEN = Object.freeze([
  { schluessel: 'mann', name: 'Nagy Zoltán', beziehung: 'Ehemann' },
  { schluessel: 'tochter', name: 'Nagy Zsófia', beziehung: 'Tochter' },
  { schluessel: 'orthopaedin', name: 'Dr. Kovács Éva', beziehung: 'Orthopädin, Prothesenversorgung' },
]);

const INSTITUTIONEN = Object.freeze([
  { schluessel: 'neak', name: 'NEAK — Nemzeti Egészségbiztosítási Alapkezelő' },
  { schluessel: 'meszk', name: 'MESZK — Magyar Egészségügyi Szakdolgozói Kamara' },
  { schluessel: 'sanitaetshaus', name: 'Ortopéd Technika Kft., Debrecen' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'DER VIERTE MANGEL: EIN FELD, DAS DEN FALSCHEN GEGENSTAND BENENNT. `health.implantsProsthesesPacemakers` '
  + 'ist der einzige Ort, an dem eine Prothese landen kann. **Eine Beinprothese ist kein '
  + 'Implantat** — sie wird nicht eingesetzt, sie wird angelegt; sie hat einen Schaft, einen '
  + 'Liner und einen Wartungsrhythmus, und im Notfall muss ein Rettungsdienst wissen, dass sie '
  + 'ABNEHMBAR ist. Die Angabe geht nicht verloren, sie wird UNWAHR. SCHICHT 2, und ein '
  + 'anderer Mangel als bei P17 (falsche Beschriftung), P15 (fehlender zweiter Ort) und P13 '
  + '(kein Gegenstand).',
  'GdB UND MERKZEICHEN SIND DEUTSCHE BEGRIFFE. `socialInsurance.degreeOfDisabilityGdb` und `gdb_merkmale` '
  + 'bilden das deutsche Schwerbehindertenrecht ab. Ungarn führt eine „egészségkárosodás" in '
  + 'Prozent und andere Vergünstigungen. Der Wert passt nicht in die Skala, und die Merkzeichen '
  + 'haben keine Entsprechung. SCHICHT 3 — dasselbe Muster wie die Vorsorge-Instrumente bei P17.',
  'DIE BERUFSANERKENNUNG HAT KEINEN ORT. Eine Hebamme ist ein reglementierter Beruf; wer in '
  + 'Deutschland arbeiten will, braucht die Anerkennung nach Richtlinie 2005/36/EG und eine '
  + 'Registrierung. Der Kern führt `ausbildung`-Felder, aber keine ANERKENNUNG einer fremden '
  + 'Qualifikation — und genau die ist das Dokument, das im Ernstfall zählt. SCHICHT 2.',
  'DIE KAMMER-MITGLIEDSNUMMER HAT KEINEN ORT. MESZK ist die ungarische Kammer der '
  + 'Gesundheitsfachberufe; die Mitgliedschaft ist Berufsausübungsvoraussetzung. Der Kern '
  + 'kennt Institutionen als Adressbuch-Einträge, nicht als Mitgliedschaften mit einer Nummer. '
  + 'SCHICHT 2 oder 3 — das hängt daran, ob Mitgliedschaften eine eigene Rubrik bekommen.',
  'DIE UNGARISCHE NAMENSFOLGE IST UMGEKEHRT. Amtlich heisst sie „Nagy Katalin" — Familienname '
  + 'zuerst. Der Kern führt `vorname` und `nachname` getrennt und stellt sie in deutscher '
  + 'Reihenfolge dar. Der WERT bleibt richtig, die ANZEIGE dreht ihn. SCHICHT 3 — die '
  + 'Namensfolge ist eine Textsatz-Regel, die es nicht gibt (`TEXTSATZ_REGELN_EINGEBAUT` führt '
  + 'sechs Regeln, keine davon ist die Namensfolge).',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Katalin');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Katalin',
    familyName: 'Nagy',
    birthName: 'Szabó',
    birthDate: '1983-09-14',
    nationality: 'ungarisch',
    birthPlace: 'Debrecen',
    streetAddress: 'Piac utca 41',
    postcodeCity: '4025 Debrecen',
    telephone: '+36 52 5550120',
    email: 'nagy.katalin@example.de',
    maritalStatus: 'verh',
  });

  // Schnitt Glied 3 (A448, U2-ADR-161): rentenversicherungsnummer ist jetzt eine Liste.
  // Prüfstein 1 der Entscheidung vom 21.08. ("ein Land bündelt, was Deutschland trennt"):
  // die TAJ-Nummer deckt Kranken- UND Rentenversicherung ab, Deutschland trennt beides.
  V.listenEintragHinzufuegen('socialInsurance', 'pensionInsuranceNumbers', { system: '', pensionInsuranceNumber: TAJ });

  /* DER MESSPUNKT: die Prothese landet in `implantate`, weil es keinen anderen
     Ort gibt. Der Text sagt selbst, dass es keiner ist — das ist der Behelf,
     und er ist der Befund. */
  setze('health', {
    implantsProsthesesPacemakers: 'KEIN IMPLANTAT: Unterschenkelprothese links (Modularprothese, Liner '
      + 'Silikon, Schaft Karbon). ABNEHMBAR. Versorgung durch Ortopéd Technika Kft.; '
      + 'Liner-Wechsel alle 6 Monate, Schaft-Neuanfertigung zuletzt 03/2025.',
    bloodType: 'AB+',
  });

  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: '', taxNumber: ADOAZONOSITO });

  setze('identity', {
    furtherDetails: [
      'TAJ-szám (ungarische Sozialversicherung): ' + TAJ,
      'Adóazonosító jel (Steuer-Kennzeichen): ' + ADOAZONOSITO,
      'MESZK-Mitgliedsnummer: ' + KAMMER_NR + ' — Berufsausübungsvoraussetzung, kein Feld',
      'Berufsanerkennung Hebamme nach Richtlinie 2005/36/EG: beantragt 11/2025, offen',
      'Amtliche Namensfolge ungarisch: Nagy Katalin (Familienname zuerst)',
      'Egészségkárosodás 45 % — kein GdB, andere Skala, andere Folgen',
    ].join('\n'),
  });

  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'Positivkontrolle — das Depot entsteht, und die ungarischen Nummern kommen an',
      fn: (V) => {
        const d = V.getData();
        assert.equal(d.sektoren.identity.givenName, 'Katalin');
        assert.equal(d.sektoren.socialInsurance.pensionInsuranceNumbers[0].pensionInsuranceNumber, TAJ);
        assert.equal(d.sektoren.finance.taxIdsTaxNumbers[0].taxNumber, ADOAZONOSITO);
      } },

    { name: 'DER VIERTE MANGEL: die Prothese steht unter „Implantate", und das ist nicht wahr',
      fn: (V) => {
        /* Der Unterschied zu den drei anderen Mängeln, und er ist der Grund für
           diese Persona: bei P17 ist die Beschriftung falsch und der Gegenstand
           richtig; bei P13 gibt es keinen Gegenstand. HIER gibt es einen, er ist
           besetzt, und er ist der falsche. Die Angabe geht nicht verloren — sie
           wird unwahr, und das ist schlimmer. */
        const g = V.getData().sektoren.health;
        assert.match(String(g.implantsProsthesesPacemakers), /^KEIN IMPLANTAT/,
          'die Prothese steht im Implantate-Feld, und der Text muss es selbst dementieren');
        assert.match(String(g.implantsProsthesesPacemakers), /ABNEHMBAR/,
          'die Angabe, die im Notfall zählt, steht als Freitext in einem Feld, das sie nicht meint');

        /* Und die Gegenprobe: es gibt wirklich keinen anderen Ort. */
        const felder = [];
        (function geh(n) {
          if (!n) return;
          if (Array.isArray(n)) return n.forEach(geh);
          if (n.id && n.typ) felder.push(n.id);
          if (n.felder) n.felder.forEach(geh);
          if (n.sektionen) n.sektionen.forEach(geh);
        })(V.SEKTOREN.find((s) => s.id === 'health').sektionen);
        assert.ok(!felder.some((f) => /prothes|hilfsmittel|orthes/i.test(f)),
          'gäbe es ein Hilfsmittel-Feld, wäre dieser Befund keiner');
      } },

    { name: 'GdB und Merkzeichen sind deutsche Begriffe — der ungarische Wert bleibt draussen',
      fn: (V) => {
        const sv = V.getData().sektoren.socialInsurance;
        assert.equal(sv.degreeOfDisabilityGdb, undefined,
          '45 % egészségkárosodás sind kein GdB — sie hier einzutragen wäre eine erfundene Zahl');
        const notiz = String(V.getData().sektoren.identity.furtherDetails || '');
        assert.match(notiz, /Egészségkárosodás 45 %/, '… und stehen darum im Freitext');
      } },

    { name: 'Gegenprobe — die Namensfolge ist keine der sechs Textsatz-Regeln',
      fn: (V) => {
        /* Sie WÄRE eine: „Familienname zuerst" ist genauso eine Darstellungsregel
           wie das Datumsformat. Der Satz führt sie nicht — und das ist die Sorte
           Lücke, die man erst sieht, wenn jemand sie braucht. */
        const regeln = Object.keys(V.TEXTSATZ_REGELN_EINGEBAUT);
        assert.equal(regeln.length, 6, 'sechs Regeln, gemessen: ' + regeln.join(', '));
        assert.ok(!regeln.some((r) => /name/i.test(r)),
          'keine Regel für die Namensfolge — obwohl sie dieselbe Art Regel wäre wie das Datumsformat');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, baueDepot, pruefungen, UNTERLAGEN_OHNE_FELD,
  TAJ, ADOAZONOSITO, KAMMER_NR, MENSCHEN, INSTITUTIONEN };
