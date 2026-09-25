'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P13 — Die Bürgerin im Vereinigten Königreich
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C3. Dort genannt als „der weiteste
   Sprung der geplanten Reihenfolge".

   WARUM DER WEITESTE: P17 (Österreich) und P19 (Ecuador) haben ein Meldewesen,
   einen Notar und ein zentrales Register — nur je andere. **Das Vereinigte
   Königreich hat KEIN Meldewesen, KEINEN Personalausweis und KEINEN Notar im
   kontinentalen Sinn.** Es fehlen nicht Übersetzungen, es fehlen die
   Einrichtungen selbst.

   DER UNTERSCHIED ZU DEN ANDEREN DREI PERSONAS DIESER NACHT, und er ist der
   Ertrag: P17 zeigt eine falsche BESCHRIFTUNG, P15 einen fehlenden ZWEITEN ORT.
   P13 zeigt ein Feld, das GAR KEINE ENTSPRECHUNG hat — und das ist ein dritter
   Mangel, den weder ein Textsatz noch ein zweites Feld heilt. Ein leeres Feld
   sieht aus wie eine Lücke in den Angaben und ist eine Lücke im Weltbild.

   WAS SIE BRICHT, IST HIER NICHT REPARIERT — so beauftragt.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten. Die National Insurance
   Number ist nach der echten Form gebildet (zwei Buchstaben, sechs Ziffern, ein
   Buchstabe), die NHS Number nach der zehnstelligen Form.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P13';
const TITEL = 'Die Bürgerin im Vereinigten Königreich';
const PASSWORT = 'p13-no-id-card-2026';

const NI_NUMMER = 'QQ 12 34 56 C';        // National Insurance Number
const NHS_NUMMER = '943 476 5919';        // NHS Number, zehnstellig
const UTR = '1234567890';                 // Unique Taxpayer Reference, HMRC
const REISEPASS = '533401372';

/* Die vier Einrichtungen, die es NICHT gibt — und was an ihre Stelle tritt.
   Sie sind der Gegenstand dieser Persona. */
const OHNE_ENTSPRECHUNG = Object.freeze([
  { was: 'Meldewesen', kernFeld: 'identity.reRegistrationWithTheResidents',
    stattdessen: 'Es gibt kein Einwohnermeldeamt. Wohnsitz wird über den Wählerregistereintrag '
      + '(electoral roll), Council-Tax-Bescheide und Rechnungen belegt — jeweils bei einer '
      + 'anderen Stelle und ohne zentrale Führung.' },
  { was: 'Personalausweis', kernFeld: 'identitaet.ausweis_nr',
    stattdessen: 'Es gibt keinen Personalausweis. Ausweisdokument ist der Reisepass oder der '
      + 'Führerschein; wer beides nicht hat, hat kein Ausweisdokument.' },
  { was: 'Notar', kernFeld: 'vorsorge (Wortlaut und Beurkundung)',
    stattdessen: 'Ein solicitor ist kein Notar. Eine Lasting Power of Attorney wird beim Office '
      + 'of the Public Guardian REGISTRIERT, nicht beurkundet — und ohne Registrierung ist sie '
      + 'unwirksam, anders als die deutsche Vorsorgevollmacht.' },
  { was: 'Zentrales Vorsorgeregister', kernFeld: 'vorsorge (Registerangabe)',
    stattdessen: 'Das Office of the Public Guardian führt das Register selbst und ist zugleich '
      + 'die eintragende Stelle — in Deutschland sind das zwei verschiedene.' },
]);

const MENSCHEN = Object.freeze([
  { schluessel: 'tochter', name: 'Freya Ashcombe', beziehung: 'Tochter', tel: '+44 7700 900118' },
  { schluessel: 'attorney', name: 'Nigel Ashcombe', beziehung: 'Attorney unter der LPA' },
  { schluessel: 'gp', name: 'Dr. Priya Raman', beziehung: 'GP (Hausärztin)' },
]);

const INSTITUTIONEN = Object.freeze([
  { schluessel: 'opg', name: 'Office of the Public Guardian' },
  { schluessel: 'hmrc', name: 'HM Revenue & Customs' },
  { schluessel: 'nhs', name: 'NHS England' },
  { schluessel: 'council', name: 'Bristol City Council' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'DIE NATIONAL INSURANCE NUMBER HAT KEINEN ORT. Sie ist die einzige Kennziffer, die eine '
  + 'britische Bürgerin lebenslang trägt — für Rente, Beiträge und Steuer zugleich. Der Kern '
  + 'führt `rentenversicherungsnummer`; das trifft einen Teil ihrer Bedeutung und benennt sie '
  + 'falsch. SCHICHT 2 — derselbe Befund wie bei P17, hier mit einer weiteren Bedeutung.',
  'DER PERSONALAUSWEIS EXISTIERT NICHT. `identitaet` führt `ausweis_nr`, `ausweis_ausgestellt` '
  + 'und `ausweis_gueltig` — drei Felder für ein Dokument, das es in diesem Rechtsraum nicht '
  + 'gibt. Sie bleiben leer, und ein leeres Feld sieht aus wie eine fehlende Angabe. '
  + 'SCHICHT 3 — welche Ausweisdokumente ein Rechtsraum kennt, ist Rechtsraum-Sache. Und es '
  + 'ist ein DRITTER Mangel neben falscher Beschriftung und fehlendem zweiten Ort: das Feld '
  + 'ist nicht falsch benannt, es ist gegenstandslos.',
  'DIE UMMELDUNG HAT KEINEN GEGENSTAND. `identity.reRegistrationWithTheResidents` bildet die deutsche '
  + 'Meldepflicht ab. Es gibt sie hier nicht; wer umzieht, meldet sich bei Council Tax, '
  + 'Wählerregister, GP und Bank getrennt. SCHICHT 3, und dieselbe Klasse wie der Ausweis.',
  'DIE LPA IST ERST MIT REGISTRIERUNG WIRKSAM. Die deutsche Vorsorgevollmacht wirkt mit der '
  + 'Unterschrift; die Registrierung im ZVR ist eine Auffindbarkeits-Frage. Bei der Lasting '
  + 'Power of Attorney ist die Registrierung beim OPG WIRKSAMKEITSVORAUSSETZUNG. Der Kern '
  + 'führt `gueltigAb` je Dokument — er kann den Unterschied ablegen, aber er kennt ihn nicht. '
  + 'SCHICHT 3, und eine Rechtsfolge statt eines Wortlauts: dasselbe Muster wie die '
  + 'Drei-Zeugen-Regel bei P17.',
  'DIE NHS NUMBER IST KEINE VERSICHERUNGSNUMMER. Der NHS ist steuerfinanziert; es gibt keine '
  + 'Krankenkasse und keine Mitgliedschaft. `health.healthInsurance` fragt nach der Art der '
  + 'Versicherung — die Frage hat hier keine Antwort. SCHICHT 3.',
  'DIE WÄHRUNG IST GBP. Die Textsatz-Regel `waehrung` steht auf `EUR` und hängt an der '
  + 'SPRACHE. Englisch sprechen auch Irland (EUR), die USA (USD) und Australien (AUD). '
  + 'SCHICHT 3, mit einem Schlüssel, der die falsche Dimension trägt — derselbe Befund wie '
  + 'bei P19 (Spanien/Ecuador) und bei P17 (Deutschland/Österreich). DREI Personas, EIN Grund.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Margaret');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Margaret',
    familyName: 'Ashcombe',
    birthName: 'Whitcombe',
    birthDate: '1952-02-19',
    nationality: 'britisch',
    birthPlace: 'Taunton, Somerset',
    streetAddress: '14 Cotham Brow',
    postcodeCity: 'BS6 6AR Bristol',
    telephone: '+44 117 5550119',
    email: 'm.ashcombe@example.de',
    maritalStatus: 'verw',
    /* AUSDRÜCKLICH NICHT GESETZT: `ausweis` (Schnitt Glied 3: seit A448 eine Liste, bleibt
       hier leer/ungesetzt — nicht nur ein Eintrag ohne Nummer), `umzug_ummeldung`. Nicht
       weil die Angaben fehlen, sondern weil es die Dokumente nicht gibt. Sie hier mit dem
       Reisepass zu füllen wäre ein Behelf, der den Befund verdeckt — genau das, was bei P19
       beim Land vermieden wurde. Prüfstein 2 der Entscheidung vom 21.08. („Ein Land hat die
       Sache gar nicht") — das Feld bleibt leer, ohne dass etwas fehlt oder mahnt. */
  });

  setze('health', {
    insuranceNumber: NHS_NUMMER,
    insuredThrough: 'Margaret Ashcombe',
    bloodType: 'A-',
    /* `kv_art` bleibt LEER. Der NHS ist steuerfinanziert; es gibt keine Art
       der Versicherung, nach der zu fragen wäre. */
  });

  // Schnitt Glied 3 (A448, U2-ADR-161): rentenversicherungsnummer/steuerid sind Listen.
  V.listenEintragHinzufuegen('socialInsurance', 'pensionInsuranceNumbers', { system: '', pensionInsuranceNumber: NI_NUMMER });
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: '', taxNumber: UTR });

  V.dokumentAnlegen({ typ: 'enduring-power-of-attorney',
    name: 'Lasting Power of Attorney (Property and Financial Affairs), registriert beim OPG',
    sektorId: 'advanceCare', gueltigAb: '2021-06-14' });
  V.dokumentAnlegen({ typ: 'will',
    name: 'Last Will and Testament, zwei Zeugen (Wills Act 1837)',
    sektorId: 'advanceCare', gueltigAb: '2019-11-02' });

  setze('identity', {
    furtherDetails: [
      'National Insurance Number: ' + NI_NUMMER + ' (Rente, Beiträge und Steuer zugleich)',
      'NHS Number: ' + NHS_NUMMER + ' — keine Versicherungsnummer, der NHS ist steuerfinanziert',
      'Unique Taxpayer Reference (HMRC): ' + UTR,
      'Reisepass: ' + REISEPASS + ' — das einzige Ausweisdokument; einen Personalausweis gibt es nicht',
      '',
      'Kein Meldewesen: Wohnsitz wird über Wählerregister, Council Tax und Rechnungen belegt.',
      'Kein Notar: ein solicitor beurkundet nicht. Die LPA ist erst mit der Registrierung',
      'beim Office of the Public Guardian WIRKSAM — nicht erst auffindbar.',
      'Alle Beträge in GBP; Vivodepot rechnet in EUR.',
    ].join('\n'),
  });

  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'Positivkontrolle — das Depot entsteht, und was es gibt, steht drin',
      fn: (V) => {
        const d = V.getData();
        assert.equal(d.sektoren.identity.givenName, 'Margaret');
        assert.equal(d.sektoren.socialInsurance.pensionInsuranceNumbers[0].pensionInsuranceNumber, NI_NUMMER);
        assert.equal(d.sektoren.health.insuranceNumber, NHS_NUMMER);
        assert.equal((d.dokumente || []).length, 2);
      } },

    { name: 'DER DRITTE MANGEL: vier Felder bleiben leer, weil es die DOKUMENTE nicht gibt',
      fn: (V) => {
        /* Das ist der Ertrag dieser Persona. Bei P17 ist die Beschriftung falsch,
           bei P15 fehlt der zweite Ort — hier ist das Feld GEGENSTANDSLOS. Ein
           leeres Feld sieht aus wie eine Lücke in den Angaben und ist eine Lücke
           im Weltbild. Weder ein Textsatz noch ein zweites Feld heilt das. */
        const ident = V.getData().sektoren.identity;
        for (const f of ['idDocuments', 'reRegistrationWithTheResidents']) {
          assert.equal(ident[f], undefined,
            f + ' ist gesetzt — dann verdeckt ein Behelf den Befund');
        }
        /* Und die Gegenprobe: die Felder EXISTIEREN im Kern. Sie fehlen nicht,
           sie haben hier keinen Gegenstand. */
        const bekannt = [];
        (function geh(n) {
          if (!n) return;
          if (Array.isArray(n)) return n.forEach(geh);
          if (n.id && n.typ) bekannt.push(n.id);
          if (n.felder) n.felder.forEach(geh);
          if (n.sektionen) n.sektionen.forEach(geh);
        })(V.SEKTOREN.find((s) => s.id === 'identity').sektionen);
        for (const f of ['idDocuments', 'reRegistrationWithTheResidents']) {
          assert.ok(bekannt.includes(f), f + ' gibt es im Kern gar nicht — dann misst diese Probe nichts');
        }
      } },

    { name: 'DIE NI-NUMMER trägt DREI Bedeutungen und liegt in einem Feld, das eine nennt',
      fn: (V) => {
        const sv = V.getData().sektoren.socialInsurance;
        assert.equal(sv.pensionInsuranceNumbers[0].pensionInsuranceNumber, NI_NUMMER, 'der Wert kommt unversehrt an');
        const notiz = String(V.getData().sektoren.identity.furtherDetails || '');
        assert.match(notiz, /Rente, Beiträge und Steuer zugleich/,
          'die zwei anderen Bedeutungen stehen im Freitext, weil sie keinen Ort haben');
      } },

    { name: 'Gegenprobe — `kv_art` bleibt leer, und das ist eine Aussage und kein Versäumnis',
      fn: (V) => {
        const g = V.getData().sektoren.health;
        assert.equal(g.healthInsurance, undefined,
          'der NHS ist steuerfinanziert: die Frage nach der ART der Versicherung hat keine Antwort');
        assert.equal(g.insuranceNumber, NHS_NUMMER,
          '… die NUMMER dagegen gibt es — der Bereich ist also nicht insgesamt leer');
      } },

    { name: 'DREI PERSONAS, EIN GRUND: die Währung hängt an der Sprache, nicht am Rechtsraum',
      fn: (V) => {
        /* P19 traf es an Spanien/Ecuador, P17 an Deutschland/Österreich, P13 an
           Irland/UK/USA/Australien. Dreimal derselbe Schlüssel mit der falschen
           Dimension — und das ist kein Zufall mehr, sondern ein Muster. */
        const regeln = V.TEXTSATZ_REGELN_EINGEBAUT;
        assert.equal(regeln.waehrung, 'EUR', 'die eingebaute Regel steht auf EUR');
        const satz = { modulTyp: 'textsatz', sprache: 'en-GB', moduleVersion: 1,
          texte: {}, regeln: { waehrung: 'GBP' } };
        const geprueft = V.textsatzModulPruefen(satz);
        assert.equal(geprueft.gueltig, true);
        assert.equal(geprueft.regeln.waehrung, 'GBP',
          'GBP KÖNNTE ankommen — aber nur unter einer eigenen SPRACHKENNUNG, '
          + 'und Englisch spricht auch Irland mit EUR');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, baueDepot, pruefungen, UNTERLAGEN_OHNE_FELD,
  NI_NUMMER, NHS_NUMMER, UTR, OHNE_ENTSPRECHUNG, MENSCHEN, INSTITUTIONEN };
