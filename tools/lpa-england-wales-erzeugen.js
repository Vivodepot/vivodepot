#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   lpa-england-wales-erzeugen.js — die LPA-Ausfüllhilfe für England und Wales, Stufe 1 (U2-ADR-477)
   ────────────────────────────────────────────────────────────────────────────
   EINE Definition, fünf Moduldateien in tools/lpa-england-wales/:
     rechtsraum-gb-eng-wls.json       Rechtsraum-Modul, Geltungsbereich ["GB-ENG","GB-WLS"], Quelle (OGL v3.0),
                                       Formvorschriften als Zitate mit Fundstelle
     bereich-de.json / bereich-en.json  der Bereich „LPA England und Wales": die Fragen in der Reihenfolge des
                                       Formulars, Feldbezeichnungen wörtlich aus LP1F/LP1H, Bedienung je Sprache
     uebertragungsliste-de.json / -en.json  das Logikmodul, das die Übertragungsliste ausgibt — ein eigenes
                                       Dokument mit Vivodepot-Fußzeile, ausdrücklich kein Formular

   WORTLAUT. Jeder Text, der in `AMTLICH(...)` steht, ist aus dem PDF-Text der gepinnten Formularstände
   LP1F/LP1H (08.25) übernommen; tests/lpa-england-wales-wortlaut.test.js hält ihn dagegen
   (tools/lpa-formular-wortlaut-pruefen.js). Alles andere ist Bedienungstext: er beschreibt, was die Anwendung
   tut, nie was die Person tun „sollte". Eine Wartefrist nach LP3 steht absichtlich nirgends (die amtlichen
   Quellen nennen drei und vier Wochen). Die Gebühr steht nur als Zitat mit Adresse und Abrufdatum.

   KEIN PRODUKT. Die Dateien sind dockbare Module, keine Ab-Werk-Saat: Rechtsinhalt für ein fremdes Land geht
   erst mit einer Produktentscheidung in eine Auslieferung (tools/lib/vier-produkte.js bleibt unverändert).

   AUFRUF
     node tools/lpa-england-wales-erzeugen.js            schreibt die fünf Dateien
     node tools/lpa-england-wales-erzeugen.js --pruefen  (auch --check) Exit 1, wenn eine Datei vom Erzeugten abweicht
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const ZIEL = path.join(__dirname, 'lpa-england-wales');
const BEREICH_ID = 'lpa-england-wales';
const LOGIK_ID = 'lpa-england-wales-uebertragungsliste';
const P = 'tpl_lpa_';
const TRENNER = ' · ';   // eigener Trenner zwischen amtlichen Teilen eines Titels; der Wächter teilt an ihm

/* Herkunft der amtlichen Texte. Stand und Prüfsumme der PDFs stehen im Wächter (LPA_FORMULARE). */
const QUELLE = Object.freeze({
  behoerde: 'Office of the Public Guardian',
  titel: 'LP1F Lasting power of attorney: property and financial affairs (08.25); LP1H Lasting power of attorney: health and welfare (08.25)',
  lizenz: 'Open Government Licence v3.0',
  lizenzAdresse: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  // Die Publikationsseite zog am 20.04.2026 um (die frühere Adresse …/make-a-lasting-power-of-attorney leitet hierher weiter);
  // die PDFs LP1F/LP1H unter ihren Adressen sind am 18.10.2026 byte-gleich mit den Pins (tools/lpa-formular-wortlaut-pruefen.js).
  url: 'https://www.gov.uk/government/publications/lasting-power-of-attorney-forms',
  stand: '08.25',
  abgerufen: '2026-10-18',
});
const ONLINE_DIENST = 'https://www.lastingpowerofattorney.service.gov.uk';
const GEBUEHR = Object.freeze({
  text: 'Applying to register an LPA costs £92 unless you get a reduction or exemption.',
  url: 'https://www.gov.uk/power-of-attorney',
  abgerufen: '2026-10-18',
});
/* Das Formular LPA120 (Gebühr ermäßigen oder erlassen), auf das Abschnitt 14 verweist: nur Adresse und Fassung, kein
   Zitat daraus. Neue Fassung vom 20.04.2026 (Weg: gov.uk Content-API der Publikationsseite, details.attachments). */
const LPA120 = Object.freeze({
  adresse: 'https://assets.publishing.service.gov.uk/media/69e6434584ac36aaf2cc9307/20260420-lpa120-get-help-with-paying-lpa-fees.pdf',
  fassung: '2026-04-20',
  abgerufen: '2026-10-18',
});
/* Wann eine LPA besteht und wirkt — geltendes Recht, wörtlich aus legislation.gov.uk (Mental Capacity Act 2005, Stand
   des Datensatzes am Abruftag). Text im Modul, kein Kernfeld: ein strukturiertes Feld `wirksamkeit` kommt mit einem
   eigenen Wagen (U2-ADR-477, Abschnitt „Wirksamkeit“). */
const MCA_WIRKSAMKEIT = Object.freeze([
  Object.freeze({
    text: 'A lasting power of attorney is not created unless— … (b) an instrument conferring authority of the kind mentioned in subsection (1) is made and registered in accordance with Schedule 1',
    fundstelle: 'Mental Capacity Act 2005, section 9(2)(b)',
    uri: 'https://www.legislation.gov.uk/ukpga/2005/9/section/9',
    abgerufen: '2026-10-18',
  }),
  Object.freeze({
    text: 'An instrument which— (a) purports to create a lasting power of attorney, but (b) does not comply with this section, section 10 or Schedule 1, confers no authority.',
    fundstelle: 'Mental Capacity Act 2005, section 9(3)',
    uri: 'https://www.legislation.gov.uk/ukpga/2005/9/section/9',
    abgerufen: '2026-10-18',
  }),
  Object.freeze({
    text: 'Where a lasting power of attorney authorises the donee (or, if more than one, any of them) to make decisions about P\'s personal welfare, the authority— (a) does not extend to making such decisions in circumstances other than those where P lacks, or the donee reasonably believes that P lacks, capacity',
    fundstelle: 'Mental Capacity Act 2005, section 11(7)(a)',
    uri: 'https://www.legislation.gov.uk/ukpga/2005/9/section/11',
    abgerufen: '2026-10-18',
    formular: 'LP1H',
  }),
]);
const OGL_ZEILE = 'Contains public sector information licensed under the Open Government Licence v3.0.';

/* Die zwei Sachsätze der Gegenlesung (Auflage vom 02.10.2026), zeichengenau. */
const SACHSATZ = Object.freeze({
  de: Object.freeze({
    unterschreiben: 'Unterschreiben, Bezeugen und Bescheinigen geschieht auf dem gedruckten Formular. Vivodepot übernimmt diese Schritte nicht.',
    registrieren: 'Registriert wird beim Office of the Public Guardian. Vivodepot reicht nichts ein.',
  }),
  en: Object.freeze({
    unterschreiben: 'Signing, witnessing and certifying happen on the printed form. Vivodepot does not do these steps.',
    registrieren: 'Registration is with the Office of the Public Guardian. Vivodepot does not submit anything.',
  }),
});

/* Bedienungstexte je Sprache. Eigener Text — kein Rechtstext. */
const B = Object.freeze({
  de: Object.freeze({
    bereichLabel: 'LPA England und Wales',
    rechtsraumName: 'England und Wales',
    onlineDienst: 'Das OPG bietet einen kostenlosen Online-Dienst, der das Formular für Sie erstellt.',
    onlineAdresse: 'Adresse: ' + ONLINE_DIENST,
    vorbereitung: 'Diese Ausfüllhilfe bereitet vor: Sie sammelt Ihre Angaben an einem Ort, damit Sie sie in den Online-Dienst des OPG oder in das Papierformular LP1F oder LP1H übertragen. Sie ersetzt weder den Dienst noch das Formular.',
    woertlich: 'Die Abschnitte folgen der Reihenfolge des amtlichen Formulars. Abschnittstitel und Feldbezeichnungen stehen wörtlich wie dort, auf Englisch.',
    datum: 'Datumsangaben stehen als Jahr-Monat-Tag; im Formular werden sie als Tag, Monat, Jahr eingetragen.',
    schritt0: 'Der amtliche Weg zuerst',
    keinFormular: 'Diese Liste ist kein Formular und kein amtliches Dokument. Sie wird nicht eingereicht.',
    abschnitt8: 'Dieser Abschnitt hat keine Felder. Alle, die unterschreiben, lesen ihn im amtlichen Formular.',
    nurLp1f: 'Nur im Formular LP1F.',
    nurLp1h: 'Nur im Formular LP1H.',
    gebuehrQuelle: 'Gebühr laut gov.uk (' + GEBUEHR.url + ', abgerufen am 18.10.2026):',
    luecke: '— nicht erfasst —',
    h1: 'Übertragungsliste: Lasting power of attorney, England und Wales',
    titel: 'LPA England und Wales – Übertragungsliste',
    herkunftText: 'Erstellt mit Vivodepot. Eine Liste Ihrer Angaben zum Übertragen in das amtliche Formular oder in den Online-Dienst des Office of the Public Guardian.',
    unterschriftErsatz: 'Diese Liste wird nicht unterschrieben. Unterschrieben wird das gedruckte amtliche Formular.',
    fussText: 'Abschnittstitel, Feldbezeichnungen und Zitate: Office of the Public Guardian, LP1F und LP1H (08.25). ' + OGL_ZEILE,
    toolbarHinweis: 'Kein Formular: übertragen Sie die Angaben in den Online-Dienst des OPG oder in das Formular LP1F oder LP1H.',
    dateiBasis: 'LPA_Uebertragungsliste',
  }),
  en: Object.freeze({
    bereichLabel: 'LPA England and Wales',
    rechtsraumName: 'England and Wales',
    onlineDienst: 'The OPG offers a free online service that creates the form for you.',
    onlineAdresse: 'Address: ' + ONLINE_DIENST,
    vorbereitung: 'This filling-in aid prepares: it keeps your answers in one place so that you can transfer them into the OPG online service or into the paper form LP1F or LP1H. It does not replace the service or the form.',
    woertlich: 'The sections follow the order of the official form. Section titles and field labels are given word for word as on the form.',
    datum: 'Dates are shown as year-month-day; the form asks for day, month, year.',
    schritt0: 'The official online service first',
    keinFormular: 'This list is not a form and not an official document. It is not submitted anywhere.',
    abschnitt8: 'This section has no fields. Everyone who signs reads it on the official form.',
    nurLp1f: 'Only on form LP1F.',
    nurLp1h: 'Only on form LP1H.',
    gebuehrQuelle: 'Fee according to gov.uk (' + GEBUEHR.url + ', retrieved 18 October 2026):',
    luecke: '— not recorded —',
    h1: 'Transfer list: Lasting power of attorney, England and Wales',
    titel: 'LPA England and Wales – transfer list',
    herkunftText: 'Made with Vivodepot. A list of your answers for transferring into the official form or into the online service of the Office of the Public Guardian.',
    unterschriftErsatz: 'This list is not signed. The printed official form is signed.',
    fussText: 'Section titles, field labels and quotations: Office of the Public Guardian, LP1F and LP1H (08.25). ' + OGL_ZEILE,
    toolbarHinweis: 'Not a form: transfer the answers into the OPG online service or into form LP1F or LP1H.',
    dateiBasis: 'LPA_transfer_list',
  }),
});

/* Amtlicher Text — die einzige Stelle, an der ein Text als „aus dem Formular" markiert wird. */
const AMTLICH = (t) => t;

const PERSON = Object.freeze({
  title: AMTLICH('Title'), firstNames: AMTLICH('First names'), lastName: AMTLICH('Last name'),
  dob: AMTLICH('Date of birth'), address: AMTLICH('Address'), postcode: AMTLICH('Postcode'),
  email: AMTLICH('Email address (optional)'),
});
function personFelder(praefix, teile, ueberschreibe) {
  const o = ueberschreibe || {};
  return teile.map((k) => ({ id: praefix + k, typ: k === 'dob' ? 'datum' : 'text', label: o[k] || PERSON[k] }));
}
const ANKREUZ = (id, label) => ({ id, typ: 'checkbox', label: AMTLICH(label) });
const WAHL = (id, label, optionen) => ({ id, typ: 'auswahl', label: AMTLICH(label),
  optionen: optionen.map(([wert, l]) => ({ wert, label: AMTLICH(l) })) });

/* Die Struktur: Abschnitte des Formulars in ihrer Reihenfolge. `slots` sind die Plätze, die das Papier
   vorsieht (vier Bevollmächtigte, zwei Ersatzbevollmächtigte …); mehr gehen auf die Fortsetzungsbögen,
   und das sagt das Formular selbst (die „More … Use Continuation sheet"-Kästchen). */
const FORMULAR_WAHL = WAHL(P + 'formular', 'Form', [
  ['lp1f', 'Lasting power of attorney for property and financial affairs'],
  ['lp1h', 'Lasting power of attorney for health and welfare'],
]);
const ABSCHNITTE = [
  { nr: 1, titel: AMTLICH('The donor'), slots: [{ felder: personFelder(P + 's1_', ['title', 'firstNames', 'lastName']).concat(
    [{ id: P + 's1_otherNames', typ: 'text', label: AMTLICH('Any other names you’re known by (optional – eg your married name)') }],
    personFelder(P + 's1_', ['dob', 'address', 'postcode', 'email'])) }] },
  { nr: 2, titel: AMTLICH('The attorneys'), slots: [1, 2, 3, 4].map((n) => ({
    felder: personFelder(P + 's2_' + n + '_', ['title', 'firstNames', 'lastName', 'dob', 'address', 'postcode', 'email'])
      .concat(n === 1 ? [Object.assign(ANKREUZ(P + 's2_1_trust', 'This attorney is a trust corporation.'), { nurFormular: 'lp1f' })] : [])
      .concat(n === 4 ? [ANKREUZ(P + 's2_more', 'More attorneys – I want to appoint more than 4 attorneys. Use Continuation sheet 1.')] : []) })) },
  { nr: 3, titel: AMTLICH('How should your attorneys make decisions?'), slots: [{ felder: [
    ANKREUZ(P + 's3_one', 'I only appointed one attorney (turn to section 4)'),
    WAHL(P + 's3_how', 'How do you want your attorneys to work together? (tick one only)', [
      ['jointly-and-severally', 'Jointly and severally'],
      ['jointly', 'Jointly'],
      ['jointly-for-some', 'Jointly for some decisions, jointly and severally for other decisions'],
    ]),
  ] }] },
  { nr: 4, titel: AMTLICH('Replacement attorneys'), slots: [1, 2].map((n) => ({
    felder: personFelder(P + 's4_' + n + '_', ['title', 'firstNames', 'lastName', 'dob', 'address', 'postcode'])
      .concat(n === 1 ? [Object.assign(ANKREUZ(P + 's4_1_trust', 'This attorney is a trust corporation.'), { nurFormular: 'lp1f' })] : [])
      .concat(n === 2 ? [
        ANKREUZ(P + 's4_more', 'More replacements – I want to appoint more than two replacements. Use Continuation sheet 1.'),
        ANKREUZ(P + 's4_change', 'I want to change when or how my attorneys can act (optional). Use Continuation sheet 2.'),
      ] : []) })) },
  { nr: 5, titel: null, slots: [{ felder: [
    Object.assign(WAHL(P + 's5_when', 'When do you want your attorneys to be able to make decisions?', [
      ['registered', 'As soon as my LPA has been registered (and also when I don’t have mental capacity)'],
      ['no-capacity', 'Only when I don’t have mental capacity'],
    ]), { nurFormular: 'lp1f' }),
    Object.assign(WAHL(P + 's5_lst', 'Who do you want to make decisions about life-sustaining treatment? (sign only one option)', [
      ['option-a', 'Option A – I give my attorneys authority to give or refuse consent to life-sustaining treatment on my behalf.'],
      ['option-b', 'Option B – I do not give my attorneys authority to give or refuse consent to life-sustaining treatment on my behalf.'],
    ]), { nurFormular: 'lp1h' }),
  ] }], titelJeFormular: { lp1f: AMTLICH('When can your attorneys make decisions?'), lp1h: AMTLICH('Life-sustaining treatment') } },
  { nr: 6, titel: AMTLICH('People to notify when the LPA is registered'), slots: [1, 2, 3, 4].map((n) => ({
    felder: personFelder(P + 's6_' + n + '_', ['title', 'firstNames', 'lastName', 'address', 'postcode'])
      .concat(n === 4 ? [ANKREUZ(P + 's6_more', 'I want to appoint another person to notify (maximum is 5) – use Continuation sheet 1.')] : []) })) },
  { nr: 7, titel: AMTLICH('Preferences and instructions'), slots: [{ felder: [
    { id: P + 's7_preferences', typ: 'textarea', label: AMTLICH('Preferences – use words like ‘prefer’ and ‘would like’'), sensibel: true },
    ANKREUZ(P + 's7_preferences_more', 'I need more space – use Continuation sheet 2.'),
    { id: P + 's7_instructions', typ: 'textarea', label: AMTLICH('Instructions – use words like ‘must’ and ‘have to’'), sensibel: true },
    ANKREUZ(P + 's7_instructions_more', 'I need more space – use Continuation sheet 2.'),
  ] }] },
  { nr: 8, titel: AMTLICH('Your legal rights and responsibilities'), slots: [], ohneFelder: true },
  { nr: 9, titel: AMTLICH('Signature: donor'), schritt: 'unterschreiben',
    zitateJeFormular: { lp1f: AMTLICH('Sign this page (and any continuation sheets) before anyone signs sections 10 and 11.'),
      lp1h: AMTLICH('Sign this page and section 5 (and any continuation sheets) before anyone signs sections 10 and 11.') },
    slots: [{ felder: [
      { id: P + 's9_witness_name', typ: 'text', label: AMTLICH('Full name of witness') },
      { id: P + 's9_witness_address', typ: 'text', label: PERSON.address },
      { id: P + 's9_witness_postcode', typ: 'text', label: PERSON.postcode },
    ] }] },
  { nr: 10, titel: AMTLICH('Signature: certificate provider'), zitate: [AMTLICH('Only sign this section after the donor has signed section 9'),
    AMTLICH('A certificate provider can’t be one of the attorneys.')],
    slots: [{ felder: personFelder(P + 's10_', ['title', 'firstNames', 'lastName', 'address', 'postcode']) }] },
  { nr: 11, titel: AMTLICH('Signature: attorney or replacement'), zitate: [AMTLICH('Only sign this section after the certificate provider has signed section 10'),
    AMTLICH('All the attorneys and replacement attorneys need to sign.')],
    slots: [1, 2, 3, 4].map((n) => ({ felder: personFelder(P + 's11_' + n + '_', ['title', 'firstNames', 'lastName']).concat([
      { id: P + 's11_' + n + '_witness_name', typ: 'text', label: AMTLICH('Full names of witness') },
      { id: P + 's11_' + n + '_witness_address', typ: 'text', label: PERSON.address },
      { id: P + 's11_' + n + '_witness_postcode', typ: 'text', label: PERSON.postcode },
    ]) })) },
  { nr: 12, titel: AMTLICH('The applicant'), schritt: 'registrieren',
    zitate: [AMTLICH('Before the LPA can be used, it must be registered by the Office of the Public Guardian (OPG).'),
      AMTLICH('If there are any ‘people to notify’ listed in section 6, you must notify them that you are registering the LPA now.'),
      AMTLICH('Fill in and send each of them a copy of the form to notify people – LP3.')],
    slots: [{ nr: null, felder: [WAHL(P + 's12_who', 'Who is applying to register the LPA? (tick one only)', [['donor', 'Donor'], ['attorneys', 'Attorney(s)']])] }]
      .concat([1, 2, 3, 4].map((n) => ({ nr: n, nurWennGefuellt: true, felder: personFelder(P + 's12_' + n + '_', ['title', 'firstNames', 'lastName', 'dob']) }))) },
  { nr: 13, titel: AMTLICH('Who do you want to receive the LPA?'), slots: [{ felder: [
    WAHL(P + 's13_who', 'Who would you like to receive the LPA and any correspondence?', [
      ['donor', 'The donor'], ['attorney', 'An attorney (write name below)'], ['other', 'Other (write name and address below)']]),
  ].concat(personFelder(P + 's13_', ['title', 'firstNames', 'lastName']), [
    { id: P + 's13_company', typ: 'text', label: AMTLICH('Company (optional)') },
  ], personFelder(P + 's13_', ['address', 'postcode']), [
    ANKREUZ(P + 's13_post', 'Post'), ANKREUZ(P + 's13_phone', 'Phone'), ANKREUZ(P + 's13_email', 'Email'),
    ANKREUZ(P + 's13_welsh', 'Welsh'),   // LP1F schreibt „(we will …)", LP1H „(We will …)" — das gemeinsame Wort
  ]) }], kontaktFrage: AMTLICH('How would the person above prefer to be contacted?') },
  { nr: 14, titel: AMTLICH('Application fee'), gebuehr: true,
    zitate: [AMTLICH('For security, don’t write your credit or debit card details here.'),
      AMTLICH('You’ll need to fill in form LPA120 and include it with your application.')],
    slots: [{ felder: [
      WAHL(P + 's14_pay', 'How would you like to pay?', [['card', 'Card'], ['cheque', 'Cheque']]),
      { id: P + 's14_phone', typ: 'text', label: AMTLICH('Your phone number') },
      ANKREUZ(P + 's14_reduced', 'I want to apply to pay a reduced fee'),
      ANKREUZ(P + 's14_repeat', 'I’m making a repeat application'),
      { id: P + 's14_case', typ: 'text', label: AMTLICH('Case number') },
    ] }] },
  { nr: 15, titel: AMTLICH('Signature'), zitate: [AMTLICH('Do not sign this section until after sections 9, 10 and 11 have been signed.')],
    slots: [], ohneFelder: true },
];
const ABSCHNITT_9_11_REIHENFOLGE = AMTLICH('Sections 9, 10 and 11 were signed in order. Section 9 must have been signed first, then section 10, then section 11.');

/* Die Nummer eines Platzes: ausdrücklich am Platz (`nr`, auch null für „ohne Nummer"), sonst die Position, wenn es
   mehr als einen Platz gibt. Eine Ziffer allein ist eigene Zählung, kein Formulartext; der Wächter lässt sie zu. */
function slotNummer(a, slot, i) {
  if (slot && Object.prototype.hasOwnProperty.call(slot, 'nr')) return slot.nr;
  return a.slots.length > 1 ? i + 1 : null;
}
function abschnittTitel(a, nr) {
  const teile = [AMTLICH('Section ' + a.nr)];
  if (a.titel) teile.push(a.titel);
  if (nr) teile.push(String(nr));
  return teile.join(TRENNER);
}

/* ── Rechtsraum-Modul ── */
function rechtsraumModul() {
  return {
    modulTyp: 'rechtsraum',
    rechtsraum: ['GB-ENG', 'GB-WLS'],
    // Der Anzeigename je Sprache im Feld `name` des Modul-Schemas (U2-ADR-495); die Liste der Codes erscheint nie.
    name: { de: B.de.rechtsraumName, en: B.en.rechtsraumName },
    moduleVersion: 1,
    sprache: 'en',
    anbieterId: 'vivodepot',
    quelle: QUELLE,
    typen: {
      'enduring-power-of-attorney': {
        katalogVersion: 1,
        wortlaut: null,
        formvorschriften: {
          paragraf: 'Mental Capacity Act 2005, Schedule 1 paragraph 1(1)(a)',
          formulare: ['LP1F', 'LP1H'],
          onlineDienst: ONLINE_DIENST,
          regeln: [
            { text: ABSCHNITT_9_11_REIHENFOLGE, fundstelle: 'LP1F/LP1H, checklist' },
            { text: AMTLICH('The witness must not be an attorney or replacement attorney appointed under this LPA, and must be aged 18 or over.'), fundstelle: 'LP1F/LP1H, section 9' },
            { text: AMTLICH('A certificate provider can’t be one of the attorneys.'), fundstelle: 'LP1F/LP1H, section 10' },
            { text: AMTLICH('Before the LPA can be used, it must be registered by the Office of the Public Guardian (OPG).'), fundstelle: 'LP1F/LP1H, Register your LPA' },
            { text: GEBUEHR.text, fundstelle: GEBUEHR.url, abgerufen: GEBUEHR.abgerufen },
            { text: AMTLICH('You’ll need to fill in form LPA120 and include it with your application.'), fundstelle: 'LP1F/LP1H, section 14',
              formularAdresse: LPA120.adresse, formularFassung: LPA120.fassung, abgerufen: LPA120.abgerufen },
          ].concat(MCA_WIRKSAMKEIT.map((r) => Object.assign({}, r))),
        },
        fristenVorrang: null,
        zweck: ['vermoegenssorge', 'gesundheitssorge'],
        rechtsgrundlage: { paragraf: 'Mental Capacity Act 2005, section 9', uri: 'https://www.legislation.gov.uk/ukpga/2005/9/section/9' },
      },
    },
  };
}

/* ── Bereichs-Modul (Fragen) ── */
function bereichModul(spr) {
  const b = B[spr];
  const sektionen = [{ id: 'formular', label: FORMULAR_WAHL.label, hint: [b.onlineDienst, b.onlineAdresse, b.vorbereitung].join(' '), felder: [FORMULAR_WAHL] }];
  for (const a of ABSCHNITTE) {
    if (a.ohneFelder) continue;
    a.slots.forEach((slot, i) => {
      const nr = slotNummer(a, slot, i);
      const sektion = { id: 'section-' + a.nr + (nr ? '-' + nr : ''), label: abschnittTitel(a, nr),
        felder: slot.felder.map((f) => {
          const kopie = Object.assign({}, f);
          delete kopie.nurFormular;
          if (f.nurFormular) kopie.hint = f.nurFormular === 'lp1f' ? b.nurLp1f : b.nurLp1h;
          return kopie;
        }) };
      if (a.schritt && i === 0) sektion.hint = SACHSATZ[spr][a.schritt];
      if (a.kontaktFrage) sektion.hint = a.kontaktFrage;
      sektionen.push(sektion);
    });
  }
  return {
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: spr,
    kennung: 'vivodepot/' + BEREICH_ID, fassung: 1,
    bereiche: { [BEREICH_ID]: {
      id: BEREICH_ID, icon: 'scale', label: b.bereichLabel,
      einfuehrungstext: [b.onlineDienst, b.onlineAdresse, b.vorbereitung, b.woertlich].join(' '),
      sektionen,
    } },
  };
}

/* ── Logikmodul (Übertragungsliste) ── */
function logikModul(spr) {
  const b = B[spr];
  const datenSchema = {};
  const lesen = (f) => {
    datenSchema[f.id] = Object.assign({ typ: 'feld', sektor: BEREICH_ID, feld: f.id }, f.sensibel ? { sensibelErlaubt: true } : {});
  };
  const zeile = (f, sichtbarWenn, nurWennGefuellt) => {
    lesen(f);
    let blk;
    if (f.typ === 'checkbox') blk = { typ: 'auswahlFest', feldId: f.id, wert: true, text: '☒ ' + f.label };
    else if (nurWennGefuellt) blk = { typ: 'freitextSatz', feldId: f.id, satz: f.label + ': {text}' };
    else {
      blk = { typ: 'frageAntwortOderLuecke', feldId: f.id, frage: f.label + ':', luecke: b.luecke };
      if (f.typ === 'auswahl') blk.format = { typ: 'codeListeLabel', sektor: BEREICH_ID, feld: f.id };
    }
    if (sichtbarWenn) blk.sichtbarWenn = sichtbarWenn;
    return blk;
  };
  const abschnitte = [{
    titel: b.schritt0,
    bloecke: [
      { typ: 'immer', texte: [b.onlineDienst, b.onlineAdresse, b.vorbereitung, b.keinFormular, b.woertlich, b.datum] },
      zeile(FORMULAR_WAHL),
    ],
  }];
  for (const a of ABSCHNITTE) {
    const kopf = [];
    if (a.schritt) kopf.push({ typ: 'immer', texte: [SACHSATZ[spr][a.schritt]] });
    if (a.nr === 9) kopf.push({ typ: 'immer', texte: [ABSCHNITT_9_11_REIHENFOLGE] });
    if (a.zitate) kopf.push({ typ: 'immer', texte: a.zitate.slice() });
    if (a.zitateJeFormular) {
      for (const [form, t] of Object.entries(a.zitateJeFormular)) kopf.push({ typ: 'immer', texte: [t], sichtbarWenn: { feld: FORMULAR_WAHL.id, wert: form } });
    }
    if (a.gebuehr) kopf.push({ typ: 'immer', texte: [b.gebuehrQuelle, GEBUEHR.text] });
    if (a.ohneFelder) {
      if (a.nr === 8) kopf.push({ typ: 'immer', texte: [b.abschnitt8] });
      abschnitte.push({ titel: abschnittTitel(a), bloecke: kopf });
      continue;
    }
    if (a.titelJeFormular) {
      /* Abschnitt 5 heißt in LP1F und LP1H verschieden; der Titel des Formulars, das die Person gewählt hat,
         steht als erste Zeile, die Frage des anderen Formulars erscheint nicht. */
      const bloecke = kopf.slice();
      for (const [form, titel] of Object.entries(a.titelJeFormular)) {
        bloecke.push({ typ: 'immer', texte: [titel], sichtbarWenn: { feld: FORMULAR_WAHL.id, wert: form } });
        for (const f of a.slots[0].felder.filter((x) => x.nurFormular === form)) bloecke.push(zeile(f, { feld: FORMULAR_WAHL.id, wert: form }));
      }
      abschnitte.push({ titel: abschnittTitel(a), bloecke });
      continue;
    }
    a.slots.forEach((slot, i) => {
      /* Der erste Platz zeigt jede Lücke; weitere Plätze nur, was eingetragen ist — das Papier hat vier
         Plätze für Bevollmächtigte, die wenigsten Menschen füllen alle. */
      const nurGefuellt = !!slot.nurWennGefuellt || i > 0;
      const bloecke = (i === 0 ? kopf.slice() : []).concat(slot.felder.map((f) => zeile(f,
        f.nurFormular ? { feld: FORMULAR_WAHL.id, wert: f.nurFormular } : null, nurGefuellt && f.typ !== 'auswahl')));
      if (a.kontaktFrage) {
        const k = bloecke.findIndex((x) => x.feldId === P + 's13_post');
        bloecke.splice(k, 0, { typ: 'immer', texte: [a.kontaktFrage] });
      }
      abschnitte.push({ titel: abschnittTitel(a, slotNummer(a, slot, i)), bloecke });
    });
  }
  return {
    modulTyp: 'logikModul', id: LOGIK_ID, titel: b.titel, sektor: BEREICH_ID, moduleVersion: 1,
    herkunft: 'vivodepot', sprache: spr, datenSchema, abschnitte,
    dokAusgabe: {
      h1: b.h1, herkunftText: b.herkunftText, unterschrift: false, unterschriftErsatzHinweis: b.unterschriftErsatz,
      fussText: b.fussText, knopfAttr: 'lpa-uebertragungsliste', dateiBasis: b.dateiBasis, toolbarHinweis: b.toolbarHinweis,
    },
  };
}

function alleDateien() {
  const json = (o) => JSON.stringify(o, null, 2) + '\n';
  return {
    'rechtsraum-gb-eng-wls.json': json(rechtsraumModul()),
    'bereich-de.json': json(bereichModul('de')),
    'bereich-en.json': json(bereichModul('en')),
    'uebertragungsliste-de.json': json(logikModul('de')),
    'uebertragungsliste-en.json': json(logikModul('en')),
  };
}

function main(argv) {
  const pruefen = argv.includes('--pruefen') || argv.includes('--check');   // --check: Name, den der Frische-Prüfer erwartet
  const dateien = alleDateien();
  const abweichend = [];
  if (!pruefen) fs.mkdirSync(ZIEL, { recursive: true });
  for (const [name, inhalt] of Object.entries(dateien)) {
    const pfad = path.join(ZIEL, name);
    if (pruefen) {
      const ist = fs.existsSync(pfad) ? fs.readFileSync(pfad, 'utf8') : null;
      if (ist !== inhalt) abweichend.push(name);
    } else fs.writeFileSync(pfad, inhalt);
  }
  if (pruefen) {
    if (abweichend.length) { console.error('[lpa-england-wales] weicht vom Erzeugten ab: ' + abweichend.join(', ')); return 1; }
    console.log('[lpa-england-wales] OK — fünf Dateien wie erzeugt.');
    return 0;
  }
  console.log('[lpa-england-wales] geschrieben: ' + Object.keys(dateien).join(', '));
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { B, alleDateien, rechtsraumModul, bereichModul, logikModul, SACHSATZ, QUELLE, GEBUEHR, LPA120, MCA_WIRKSAMKEIT, ONLINE_DIENST,
  OGL_ZEILE, TRENNER, BEREICH_ID, LOGIK_ID, ZIEL, ABSCHNITTE, FORMULAR_WAHL };
