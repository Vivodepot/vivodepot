'use strict';
/* Benannte Ersetzungen EIGENER Fragen gegenüber festen alten Ständen (v872). Proben, die den Kern mit einem alten Beleg
   vergleichen (Vor-Umzug-Achse a3, Rundlauf des Dokument-Umzugs), sammeln auch Vivodepots eigene Fragen, nicht nur
   amtlichen Wortlaut. Wird eine eigene Frage berichtigt, steht sie hier — je Schritt und Feld, alter und neuer
   Wortlaut wörtlich, kein Muster. Ein amtlicher Wortlaut gehört nie in diese Liste.
   Gedeckt ist nur: der alte Wortlaut fehlt UND genau der neue steht an genau diesem Schritt. Eine Streichung ohne Ersatz und
   jeder dritte Wortlaut bleiben rot (Rot-Beweise in beiden Proben). */
const EIGENE_FRAGEN_ERSETZT = Object.freeze([
  Object.freeze({
    schritt: 'healthCareMedicalProcedures',
    feld: 'frage',
    art: 'eigene Frage',
    fundstelle: '§ 1829 Abs. 1 BGB',
    freigegeben: 'v850',
    alt: 'Darf sie in ärztliche Eingriffe einwilligen, auch bei Lebensgefahr? (§ 1829 BGB)',
    neu: 'Darf sie in ärztliche Eingriffe einwilligen, auch bei Lebensgefahr oder Gefahr eines schweren, länger dauernden Gesundheitsschadens? (§ 1829 BGB)',
  }),
  /* Verständlichkeit der Oberflächentexte (31.10.2026, v997): die Notarzt-Frage des PV-Assistenten und zwei Bezeichnungen.
     Eigene Wortlaute; die amtlichen Optionen zu 2.3.4 und 2.6 bleiben wortgleich. */
  Object.freeze({
    schritt: 'emergencyDoctorNotified',
    feld: 'frage',
    art: 'eigene Frage',
    fundstelle: 'BMJ-Baustein 2.3.4 (Option wortgleich)',
    freigegeben: 'v997, v999',   // v999: zweiter Wortlaut der Gestaltungsleitung, die Ziffer steht am Schritt
    alt: 'Soll der Notarzt nicht verständigt bzw. über die Ablehnung informiert werden? (2.3.4)',
    neu: 'Es soll kein Notarzt gerufen werden. Kommt doch einer, soll er sofort erfahren, dass Sie keine Wiederbelebung wollen. Wünschen Sie das?',
  }),
  Object.freeze({
    schritt: 'whoseViewMattersIfUnregulated',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'BMJ-Baustein 2.6 (Option wortgleich)',
    freigegeben: 'v997',
    alt: 'Besondere Bedeutung (ungeregelte Situationen)',
    neu: 'Wessen Meinung zählt, wenn etwas nicht geregelt ist',
  }),
  Object.freeze({
    schritt: 'whoseViewMattersIfDeviatingWill',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'BMJ-Baustein 2.6 (Option wortgleich)',
    freigegeben: 'v997',
    alt: 'Besondere Bedeutung (abweichende Willensäußerung)',
    neu: 'Wessen Meinung zählt, wenn Ihr Wille abzuweichen scheint',
  }),
  /* Verständlichkeit der Oberflächentexte, zweiter Wagen (31.10.2026, v999): fünf Bezeichnungen, vier Hinweise und
     drei Fragen des PV-Assistenten (die alten Fragen mit Ziffer; die Ziffer steht seit v999 am Schritt). Eigene Wortlaute; die amtlichen Optionen bleiben wortgleich. */
  Object.freeze({
    schritt: 'acceptsLifeShorteningFromPain',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'BMJ-Baustein 2.3.2 (Option wortgleich)',
    freigegeben: 'v999',
    alt: 'Lebensverkürzung in Kauf',
    neu: 'Lebensverkürzung durch Schmerzbehandlung in Kauf nehmen',
  }),
  Object.freeze({
    schritt: 'resuscitationInDescribedSituations',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'BMJ-Baustein 2.3.4 A (Option wortgleich)',
    freigegeben: 'v999',
    alt: 'Wiederbelebung (oben beschriebene Situationen)',
    neu: 'Wiederbelebung in den oben beschriebenen Situationen',
  }),
  Object.freeze({
    schritt: 'emergencyDoctorNotified',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'BMJ-Baustein 2.3.4 (Option wortgleich)',
    freigegeben: 'v999',
    alt: 'Notarzt-Hinweis',
    neu: 'Hinweis an den Notarzt',
  }),
  Object.freeze({
    schritt: 'priorityIfOrganDonationConflict',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'BMJ-Baustein 2.9 (Option wortgleich)',
    freigegeben: 'v999',
    alt: 'Vorrang bei Konflikt (Organspende vs. Patientenverfügung)',
    neu: 'Vorrang, wenn Organspende und Patientenverfügung sich widersprechen',
  }),
  Object.freeze({
    schritt: 'validityDurationDeadline',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'BMJ-Baustein 2.14',
    freigegeben: 'v999',
    alt: 'Frist',
    neu: 'Dauer der Befristung',
  }),
  Object.freeze({
    schritt: 'applicableSituations',
    feld: 'hilfetext',
    art: 'eigener Hinweis',
    fundstelle: 'BMJ-Baustein 1 (Optionen wortgleich)',
    freigegeben: 'v999',
    alt: 'Mehrfachauswahl. Es sollten nur Situationen beschrieben werden, die mit einer Einwilligungsunfähigkeit einhergehen können.',
    neu: 'Sie können mehrere Situationen wählen. Wählen Sie nur Situationen, in denen Sie nicht mehr selbst in eine Behandlung einwilligen könnten.',
  }),
  Object.freeze({
    schritt: 'supportFromThesePersons',
    feld: 'hilfetext',
    art: 'eigener Hinweis',
    fundstelle: 'BMJ-Baustein 2.4',
    freigegeben: 'v999',
    alt: 'Personen aus Ihrem Depot wählen oder neu erfassen — bewusste Bestätigung, keine stille Anlage.',
    neu: 'Wählen Sie Personen aus Ihrem Depot oder tragen Sie neue ein. Ohne Ihre Bestätigung wird niemand angelegt.',
  }),
  Object.freeze({
    schritt: 'contentOfTheAdvanceDirective',
    feld: 'hilfetext',
    art: 'eigener Hinweis',
    fundstelle: 'eigener Schritt, kein BMJ-Baustein',
    freigegeben: 'v999',
    alt: 'Haben Sie mit der Person, die Sie in Ihrer Vorsorgevollmacht bevollmächtigt haben, über den Inhalt Ihrer Patientenverfügung gesprochen? Nicht gemeint ist, ob diese Person zugestimmt hat. Ohne Angabe fehlt der Zusatz im gedruckten Dokument — sonst nichts.',
    neu: 'Haben Sie mit der Person, die Sie in Ihrer Vorsorgevollmacht bevollmächtigt haben, über den Inhalt Ihrer Patientenverfügung gesprochen? Es geht nur um das Gespräch, nicht um ihre Zustimmung. Wenn Sie nichts angeben, fehlt im gedruckten Dokument nur dieser eine Zusatz.',
  }),
  Object.freeze({
    schritt: 'contentOfTheAdvanceDirective2',
    feld: 'hilfetext',
    art: 'eigener Hinweis',
    fundstelle: 'eigener Schritt, kein BMJ-Baustein',
    freigegeben: 'v999',
    alt: 'Haben Sie mit der Person, die Sie in Ihrer Betreuungsverfügung als Betreuerin oder Betreuer vorschlagen, über den Inhalt Ihrer Patientenverfügung gesprochen? Nicht gemeint ist, ob diese Person zugestimmt hat. Ohne Angabe fehlt der Zusatz im gedruckten Dokument — sonst nichts.',
    neu: 'Haben Sie mit der Person, die Sie in Ihrer Betreuungsverfügung als Betreuerin oder Betreuer vorschlagen, über den Inhalt Ihrer Patientenverfügung gesprochen? Es geht nur um das Gespräch, nicht um ihre Zustimmung. Wenn Sie nichts angeben, fehlt im gedruckten Dokument nur dieser eine Zusatz.',
  }),
  Object.freeze({
    schritt: 'dialysis',
    feld: 'frage',
    art: 'eigene Frage',
    fundstelle: 'BMJ-Baustein 2.3.6 (Option wortgleich)',
    freigegeben: 'v999',
    alt: 'Dialyse (2.3.6)',
    neu: 'Dialyse (Blutwäsche)',
  }),
  Object.freeze({
    schritt: 'hospiceSupport',
    feld: 'frage',
    art: 'eigene Frage',
    fundstelle: 'BMJ-Baustein 2.4 (Option wortgleich)',
    freigegeben: 'v999',
    alt: 'Wünschen Sie hospizlichen Beistand? (2.4)',
    neu: 'Wünschen Sie Beistand durch einen Hospizdienst?',
  }),
  Object.freeze({
    schritt: 'whoseViewMattersOtherPersonName',
    feld: 'frage',
    art: 'eigene Frage',
    fundstelle: 'BMJ-Baustein 2.6',
    freigegeben: 'v999',
    alt: 'Falls "andere Person": wer? (2.6)',
    neu: 'Falls „andere Person“: Wer?',
  }),
  // Pflege-Assistent (v999): derselbe Hinweis wie am Sektorfeld advanceCare.provisionDocumentsCheckedIn.
  Object.freeze({
    schritt: 'provisionDocumentsCheckedIn',
    feld: 'hilfetext',
    art: 'eigener Hinweis',
    fundstelle: 'eigener Schritt, kein amtlicher Text',
    freigegeben: 'v999',
    alt: 'Vollmacht, Betreuungsverfügung und Patientenverfügung sollten vorliegen, bevor die Pflege übernommen wird — sonst entscheidet im Ernstfall niemand rechtssicher.',
    neu: 'Vollmacht, Betreuungsverfügung und Patientenverfügung sollten vorliegen, bevor die Pflege beginnt. Sonst ist im Ernstfall unklar, wer verbindlich entscheiden darf.',
  }),
  // PV-Assistent (v1000): die Hinweise zu den zwei ankreuzbaren Zusätzen. Der amtliche Wortlaut der Zusätze selbst bleibt.
  Object.freeze({
    schritt: 'acceptsLifeShorteningFromPain',
    feld: 'hilfetext',
    art: 'eigener Hinweis',
    fundstelle: 'BMJ-Baustein 2.3.2',
    freigegeben: 'v1000',
    alt: 'Ein zusätzlich ankreuzbarer Zusatz zur Schmerzbehandlung.',
    neu: 'Ein Zusatz zur Schmerzbehandlung. Sie können ihn auch weglassen.',
  }),
  Object.freeze({
    schritt: 'emergencyDoctorNotified',
    feld: 'hilfetext',
    art: 'eigener Hinweis',
    fundstelle: 'BMJ-Baustein 2.3.4 A',
    freigegeben: 'v1000',
    alt: 'Ein zusätzlich ankreuzbarer Zusatz zur Wiederbelebung.',
    neu: 'Ein Zusatz für den Fall, dass Sie in den beschriebenen Situationen Wiederbelebung ablehnen. Sie können ihn auch weglassen.',
  }),
  /* Verständlichkeit der Oberflächentexte (31.10.2026, v992): drei Bezeichnungen der Einwilligung in eine digitale Nachbildung
     (KI-Korpus). Eigene Bezeichnungen; die Optionen bleiben wortgleich. */
  Object.freeze({
    schritt: 'basicDecision',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'KI-Korpus (Optionen wortgleich)',
    freigegeben: 'v992',
    alt: 'Grundentscheidung',
    neu: 'Erlauben Sie eine digitale Nachbildung?',
  }),
  Object.freeze({
    schritt: 'scope',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'KI-Korpus (Optionen wortgleich)',
    freigegeben: 'v992',
    alt: 'Raum',
    neu: 'Wo die Nachbildung genutzt werden darf',
  }),
  Object.freeze({
    schritt: 'behaviouralLimit',
    feld: 'feld.label',
    art: 'eigene Bezeichnung',
    fundstelle: 'KI-Korpus (Optionen wortgleich)',
    freigegeben: 'v992',
    alt: 'Verhaltensgrenze',
    neu: 'Was die digitale Nachbildung nicht tun darf',
  }),
]);
// Ratsche: die Liste wächst nicht still. Eine neue Ersetzung zieht diese Zahl bewusst nach, mit dem Wort der Gegenlesung.
require('node:assert/strict').equal(EIGENE_FRAGEN_ERSETZT.length, 22, 'neue Ersetzung? bewusst nachziehen, mit Wort');   // 1 → 4 (31.10.2026, v997), 4 → 17 (31.10.2026, v999), 17 → 19 (31.10.2026, v1000), 19 → 22 (31.10.2026, v992)

const { anfuehrungGleich } = require('../../tools/lib/anfuehrung-gleich.js');

function schrittId(st) { return st && st.feld && st.feld.id; }
// Ein Feld ist ein Pfad am Schritt: 'frage' oder 'feld.label' (die Bezeichnung trägt das Feld, nicht der Schritt).
function wertAm(st, feld) { return feld.split('.').reduce((o, k) => (o == null ? undefined : o[k]), st); }
function mitWert(st, feld, wert) {
  const [kopf, ...rest] = feld.split('.');
  return Object.assign({}, st, { [kopf]: rest.length ? mitWert(st[kopf] || {}, rest.join('.'), wert) : wert });
}

/* Die Ziffer des amtlichen Bausteins stand bis v998 am Ende der Frage („… (2.3.4)“); seit v999 steht sie als `bmjBaustein`
   am Schritt. Für den Vergleich mit alten Ständen wird sie zurückgelegt: die Frage trägt wieder genau „<Frage> (<Ziffer>)“,
   der Schlüssel fällt weg. Gedeckt ist damit nur ein Umzug der Ziffer, kein anderer Wortlaut und kein anderer Schlüssel. */
function mitZifferImText(st) {
  if (!st || st.bmjBaustein === undefined) return st;
  const { bmjBaustein, ...rest } = st;
  return typeof rest.frage === 'string' ? Object.assign(rest, { frage: rest.frage + ' (' + bmjBaustein + ')' }) : rest;
}
function zifferZurueck(steps) { return (steps || []).map(mitZifferImText); }

/* Für den Vergleich ganzer Schritte: der ALTE Stand wird an genau diesem Schritt und Feld auf den neuen Wortlaut gesetzt.
   Steht im neuen Stand etwas anderes, bricht der folgende deepEqual weiter. */
function alteSchritteNachgefuehrt(steps, liste) {
  liste = liste || EIGENE_FRAGEN_ERSETZT;
  return (steps || []).map((st) => {
    return liste.filter((x) => x.schritt === schrittId(st) && wertAm(st, x.feld) === x.alt)
      .reduce((neuSt, e) => mitWert(neuSt, e.feld, e.neu), st);
  });
}

/* Für flache Wertlisten: ein verlorener Wert ist gedeckt, wenn er der alte Wortlaut einer Ersetzung ist und der Schritt im
   neuen Stand genau den neuen trägt. */
function verloreneOhneErsetzte(verloren, neueSteps, liste) {
  liste = liste || EIGENE_FRAGEN_ERSETZT;
  const steps = neueSteps || [];
  // Eine alte Frage mit Ziffer ist gedeckt, wenn ein Schritt MIT Baustein genau sie ergibt (Frage + Ziffer). Die verlorenen
  // Werte kommen mit gleichgesetzten Anführungszeichen (tools/lib/anfuehrung-gleich.js), die Frage darum ebenso.
  return verloren.filter((w) => !steps.some((n) => n && n.bmjBaustein !== undefined && anfuehrungGleich(mitZifferImText(n).frage) === w)
    && !liste.some((e) => e.alt === w && steps.some((st) => schrittId(st) === e.schritt && wertAm(st, e.feld) === e.neu)));
}

module.exports = { EIGENE_FRAGEN_ERSETZT, alteSchritteNachgefuehrt, verloreneOhneErsetzte, zifferZurueck };
