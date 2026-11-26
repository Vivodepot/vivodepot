'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vor-Umzug-Golden-Master — Achse a2-wizards (U2-ADR-346)
   ────────────────────────────────────────────────────────────────────────
   Wörtlicher Spiegel von tests/vor-umzug-a3-dokumentmodule.test.js, für die
   Wizard-Achse statt der Dokumentmodul-Achse. Beantwortet dieselbe Frage,
   die keine Selbstvergleich-Probe beantworten kann: stimmt der ausgelieferte
   Text mit dem VOR dem Umzug (Commit 37038011, derselbe Anker wie A1/A3 —
   er liegt vor JEDEM der heutigen Bündel-Umzüge) überein?

   KEINE „depot"-Proben hier — absichtlich, s. Kopf-Kommentar in
   tools/lib/vor-umzug-achse-a2-wizards.js: die fünf migrierten Wizards
   (gebwiz/anamwiz/pflwiz/heirwiz/umzwiz) haben keine depot-abhängige
   Generator-Ausgabe, nur die „immer"-Achse hat hier einen Gegenstand.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { verlorene } = require('../tools/lib/vor-umzug-textwerte');
const { immerWerte: immerWerteA2 } = require('../tools/lib/vor-umzug-achse-a2-wizards');
// Ersetzte eigene Wortlaute, je Schritt und Feld wörtlich: tests/helfer/eigene-fragen-ersetzt.js.
const { verloreneOhneErsetzte } = require('./helfer/eigene-fragen-ersetzt.js');

// Seit S8 (U2-ADR-428) steht der deutsche Satz im gebackenen Produkt (Sprachmodul, kompakte JSON-Form), nicht im rohen Gerüst.
const KERN = require('./produkt-html-erzeugen.js').produktHtml('privat-de');
const FIXTURE_PFAD = path.join(__dirname, 'fixtures', 'vor-umzug-a2-wizards.json');

function fixtureLesen(pfad) {
  pfad = pfad || FIXTURE_PFAD;
  assert.ok(fs.existsSync(pfad),
    'Fixture fehlt: ' + pfad + ' — ohne sie ist diese Prüfung wirkungslos, kein stiller Erfolg.');
  const roh = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  assert.ok(roh.immerWerte && Array.isArray(roh.immerWerte.werte) && roh.immerWerte.werte.length > 0,
    'Fixture trägt keine immerWerte — leer wäre ein Erfolg ohne Prüfung.');
  return roh;
}

function mitTemporaerVeraendertemKern(transform, tun) {
  const original = fs.readFileSync(KERN, 'utf8');
  const veraendert = transform(original);
  const tmp = path.join(os.tmpdir(), 'vivodepot-vor-umzug-a2-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, veraendert, 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    return tun(require('./load-kern.js').ladeKern);
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(tmp);
  }
}

test('[Vor-Umzug·a2·Ausbeute] die Fixture trägt Provenienz (Commit, Datum) und Werte', () => {
  const fixture = fixtureLesen();
  assert.ok(fixture.quelleCommit, 'Fixture ohne Herkunfts-Commit');
  assert.ok(fixture.quelleCommitDatum, 'Fixture ohne Herkunfts-Datum');
  assert.equal(fixture.immerWerte.anzahl, fixture.immerWerte.werte.length);
});

/* Werte, die BEWUSST entfallen sind — je mit Begründung (dasselbe Muster wie die Wortlaut-Ausnahmen der
   Bestands-Probe zu U2-ADR-320). Jede Zeile hier hebelt die Prüfung für genau diesen
   Wert aus; wird die Liste lang, ist der Beleg neu aufzunehmen statt weiter auszunehmen. */
/* C14 (07.11.2026, Assistenten-Urteil der Gestaltungsleitung, Wort vom 07.11.): der Anamnese-Assistent ist gestrichen
   (W04), der Geburts-Assistent fragt nur noch nach dem Kind (W03, die Situationsschritte Klinik bis Kindergeld entfallen). Die Zeilen
   unten sind GENAU die Texte dieser Schritte, gemessen aus dem Diff (verlorene gegen den Beleg); ihr Rot-Beweis steht unten. */
const C14_ANAMWIZ = 'C14, Urteil GL 01.11. (W04): der Anamnese-Assistent ist gestrichen; seine Felder stehen auf der Bereichsseite Gesundheit.';
const C14_GEBWIZ = 'C14, Urteil GL 01.11. (W03): der Geburts-Assistent fragt nur nach dem Kind; der Schritt steht als Feld im Blatt „Geburt“.';
/* ASSISTENT-ALT-UND-ABBRUCHSATZ (Entscheidung vom 21.11.2026): der Schlusssatz „Sie können jederzeit
   pausieren.“ fällt mit der ganzen Klasse aus den Einleitungen; die Probe der Klasse ist tests/assistent-ohne-abbruchsatz.test.js. */
const ABBRUCHSATZ = 'ASSISTENT-ALT-UND-ABBRUCHSATZ (21.11.2026): der Schlusssatz „Sie können jederzeit pausieren.“ entfällt; der übrige Text der Einleitung steht unverändert.';
/* Assistent als Anlass-Seite (24.11.2026): alle Fragen stehen auf einer Seite; der Schlusssatz der Einleitung
   „Sie beantworten eine Frage nach der anderen.“ heißt jetzt „Sie beantworten die Fragen auf dieser Seite.“ */
const ANLASS_SEITE = 'Assistent als Anlass-Seite (24.11.2026): alle Fragen auf einer Seite; der Schlusssatz heißt jetzt „Sie beantworten die Fragen auf dieser Seite.“, der übrige Text der Einleitung steht unverändert.';
const BEWUSST_ENTFALLEN = Object.freeze({
  "Ein paar Fragen, damit rund um die Geburt alles beisammen ist — und Sie wissen, wo welche Unterlage hingehört. Sie beantworten eine Frage nach der anderen.": ANLASS_SEITE,
  "Wenn jemand pflegebedürftig wird, ist vieles zugleich zu regeln. Wir gehen die wichtigsten Punkte durch — Pflegegrad, Pflegedienst, Geld, wer pflegt und ob die Vorsorge steht. Sie können jederzeit pausieren.": ABBRUCHSATZ,
  "Eine Heirat oder eingetragene Partnerschaft ändert vieles auf einmal — Name, Güterstand, Steuerklasse, Vorsorge. Wir gehen die Punkte durch, damit nichts untergeht. Sie können jederzeit pausieren.": ABBRUCHSATZ,
  "Ein Umzug zieht viele kleine Schritte nach sich — Ummeldung, Adressänderungen, Versorger, die alte Wohnung. Wir sammeln, was zu tun ist, und halten fest, was schon erledigt ist. Sie können jederzeit pausieren.": ABBRUCHSATZ,
  'Wie lautet Ihre neue Anschrift — Straße & Hausnummer?': 'U2-ADR-467 (01.10.2026): der Umzugs-Assistent fragt die neue '
    + 'Anschrift in vier Teilen (Straße, Hausnummer, Postleitzahl, Ort) statt in zwei Zeilen; die Zeilen-Schritte entfallen.',
  'Straße & Hausnummer': 'U2-ADR-467: Beschriftung des entfallenen Zeilen-Schritts (s. o.).',
  'Und PLZ & Ort?': 'U2-ADR-467: Frage des entfallenen Zeilen-Schritts (s. o.).',
  'PLZ & Ort': 'U2-ADR-467: Beschriftung des entfallenen Zeilen-Schritts (s. o.).',
  'Mit einem weiteren Familienmitglied ändert sich auch der Notvorrat — die Personenzahl für die Bedarfsrechnung in Krisenvorsorge passt sich automatisch an, sobald Sie den Namen im nächsten Schritt eintragen.':
    'v992 (31.10.2026): der Hilfetext von gebwiz.geburt_kindergeld ist neu gefasst; seit C14 (07.11.2026, W03) entfällt der Schritt, der Hinweis steht als Verweis am Ende des Assistenten.',
  "In welcher Klinik kommt Ihr Kind zur Welt — oder wo findet die Geburt statt?": C14_GEBWIZ,
  "Geburtsklinik / Geburtsort": C14_GEBWIZ,
  "Wer ist Ihre Hebamme — und wie ist sie erreichbar?": C14_GEBWIZ,
  "Name und Telefon genügen. Falls noch keine feststeht, lassen Sie das Feld frei.": C14_GEBWIZ,
  "Hebamme — Name & Kontakt": C14_GEBWIZ,
  "Ist die Geburtsurkunde beantragt — und wo wird sie abgelegt?": C14_GEBWIZ,
  "Die Geburtsurkunde beantragen Sie beim Standesamt. Sie wird für Elterngeld, Kindergeld und die Krankenversicherung gebraucht.": C14_GEBWIZ,
  "Geburtsurkunde — beantragt / Ablageort": C14_GEBWIZ,
  "Wie ist Ihr Kind krankenversichert?": C14_GEBWIZ,
  "Krankenversicherung des Kindes": C14_GEBWIZ,
  "Wie steht es um das Elterngeld?": C14_GEBWIZ,
  "Elterngeld — Antrag": C14_GEBWIZ,
  "Wie steht es um das Kindergeld?": C14_GEBWIZ,
  "Kindergeld — Familienkasse": C14_GEBWIZ,
  "Anamnese": C14_ANAMWIZ,
  "Ein paar Fragen zu Ihrer Krankengeschichte — damit Sie sie bei Arztbesuchen, Überweisungen und Klinik-Aufnahmen parat haben und im Ernstfall nichts Wichtiges fehlt.\n\nBei einigen Feldern können Sie aus Vorschlägen wählen; Freitext geht immer. Sie können jederzeit pausieren.": C14_ANAMWIZ,
  "Welche chronischen Erkrankungen oder Diagnosen haben Sie?": C14_ANAMWIZ,
  "Tippen Sie einen Begriff — passende Diagnosen werden Ihnen vorgeschlagen. Freitext ist ebenfalls möglich.": C14_ANAMWIZ,
  "Chronische Erkrankungen / Diagnosen": C14_ANAMWIZ,
  "Welche Allergien oder Unverträglichkeiten haben Sie?": C14_ANAMWIZ,
  "Medikamente, Nahrung oder Sonstiges. Während des Tippens werden Vorschläge angezeigt; Freitext geht auch. Für jede weitere Allergie einen neuen Eintrag anlegen.": C14_ANAMWIZ,
  "Allergien": C14_ANAMWIZ,
  "Welche Medikamente nehmen Sie regelmäßig?": C14_ANAMWIZ,
  "Mit Wirkstoff und Dosierung, wenn möglich. Während des Tippens werden Vorschläge angezeigt. Für jedes weitere Medikament einen neuen Eintrag anlegen.": C14_ANAMWIZ,
  "Medikamente (laufend)": C14_ANAMWIZ,
  "Welche Operation oder welchen Eingriff hatten Sie?": C14_ANAMWIZ,
  "Ihre Anamnese ist im Bereich \"Gesundheit\" gespeichert.": C14_ANAMWIZ,
  "Ein Eingriff hier — weitere tragen Sie anschließend im Bereich \"Gesundheit\" nach.": C14_ANAMWIZ,
  "Operation / Eingriff": C14_ANAMWIZ,
  "Welche Impfungen sind bei Ihnen bekannt?": C14_ANAMWIZ,
  "Falls Sie ein Impfbuch haben, genügt eine Kurzfassung der wichtigsten Impfungen.": C14_ANAMWIZ,
  "Impfungen": C14_ANAMWIZ,
  "Gibt es eine Erkrankung in Ihrer nahen Familie?": C14_ANAMWIZ,
  "Eine Erkrankung hier — weitere tragen Sie anschließend im Bereich \"Gesundheit\" nach. Erkrankungen bei Eltern und Geschwistern sind wichtig für Vorsorge und ärztliche Einschätzung.": C14_ANAMWIZ,
  "Erkrankung in der Familie": C14_ANAMWIZ,
});

test('[Vor-Umzug·a2·immer] der Wortlaut der fünf migrierten Wizards ist gegenüber dem Beleg (37038011) erhalten — 0 verloren', () => {
  const fixture = fixtureLesen();
  const { V } = ladeKern();
  const aktuell = immerWerteA2(V);
  const schritte = (V.WIZARDS.find((w) => w.id === 'pflwiz') || {}).schritte || [];   // der einzige ersetzte Wortlaut in a2 (v999)
  const verl = verloreneOhneErsetzte(verlorene(fixture.immerWerte.werte, aktuell), schritte).filter((w) => !Object.prototype.hasOwnProperty.call(BEWUSST_ENTFALLEN, w));
  assert.deepEqual(verl, [],
    'Verlorene Textwerte gegenüber ' + fixture.quelleCommit + ': ' + JSON.stringify(verl.slice(0, 5)));
});

test('[Vor-Umzug·a2·Ausnahmen] jede bewusst entfallene Zeile stand wirklich im Beleg und fehlt wirklich heute', () => {
  const fixture = fixtureLesen();
  const aktuell = immerWerteA2(ladeKern().V);
  // Dieselbe Angleichung der Anführungszeichen wie in verlorene() (tools/lib/anfuehrung-gleich.js): die Schlüssel stehen in dieser Form.
  const beleg = require('../tools/lib/anfuehrung-gleich.js').anfuehrungGleich(fixture.immerWerte.werte);
  for (const w of Object.keys(BEWUSST_ENTFALLEN)) {
    assert.ok(beleg.includes(w), 'Ausnahme ohne Gegenstand im Beleg: ' + w);
    assert.ok(verlorene([w], aktuell).length === 1, 'Ausnahme für einen Wert, der heute noch da ist: ' + w);
  }
});

test('[Vor-Umzug·a2·C14·Rot-Beweis] jede C14-Zeile trägt: ohne sie fiele genau dieser Text als verloren auf; die Zeilen nennen nur gestrichene Schritte', () => {
  const fixture = fixtureLesen();
  const { V } = ladeKern();
  const aktuell = immerWerteA2(V);
  const c14 = Object.keys(BEWUSST_ENTFALLEN).filter((w) => BEWUSST_ENTFALLEN[w] === C14_ANAMWIZ || BEWUSST_ENTFALLEN[w] === C14_GEBWIZ);
  assert.ok(c14.length > 0, 'Vorbedingung: die C14-Zeilen stehen da');
  const verlorenHeute = verlorene(fixture.immerWerte.werte, aktuell);
  for (const w of c14) assert.ok(verlorenHeute.includes(w), 'ohne die Zeile fiele der Text auf: ' + w.slice(0, 60));
  // Gegenstand: anamwiz gibt es nicht mehr, gebwiz hat nur noch die drei Schritte zum Kind.
  assert.equal(V.WIZARDS.find((w) => w.id === 'anamwiz'), undefined, 'anamwiz ist gestrichen');
  assert.deepEqual(V.WIZARDS.find((w) => w.id === 'gebwiz').schritte.map((x) => x.feld.id),
    ['guidedBirthEntryChildsNameNot', 'guidedBirthEntryDateOfBirthNot', 'guidedBirthEntryRelationship']);
});

test('[Vor-Umzug·a2·Rot-Beweis] ein verfälschter Textwert wird gefunden — die Prüfung wirkt wirklich', () => {
  const fixture = fixtureLesen();
  const verfaelscht = fixture.immerWerte.werte.slice();
  const original = verfaelscht[0];
  verfaelscht[0] = 'GEÄNDERTER TESTSATZ, NICHT DER AMTLICHE';
  const verl = verlorene(fixture.immerWerte.werte, verfaelscht);
  assert.ok(verl.includes(original), 'ein ersetzter Wert muss als verloren auffallen');
});

test('[Vor-Umzug·a2·Rot-Beweis Ende-zu-Ende] eine echte Kern-Verfälschung bricht die immer-Prüfung', () => {
  const fixture = fixtureLesen();
  const marker = '"wizard:gebwiz.titel":"Geburt eines Kindes",';
  mitTemporaerVeraendertemKern(
    (q) => {
      assert.ok(q.includes(marker), 'Anker für den gebwiz-Titel im Textsatz nicht gefunden — Test veraltet');
      return q.split(marker).join('"wizard:gebwiz.titel":"GEFAELSCHTER TITEL",');
    },
    (laden) => {
      const { V } = laden();
      const aktuell = immerWerteA2(V);
      const verl = verlorene(fixture.immerWerte.werte, aktuell);
      assert.ok(verl.length > 0, 'eine echte Verfälschung im Kern muss die Prüfung brechen');
    },
  );
});

test('[Vor-Umzug·a2·Gegenprobe] eine unveränderte Kopie bleibt grün — der Umweg selbst verfälscht nichts', () => {
  const fixture = fixtureLesen();
  const verl = verlorene(fixture.immerWerte.werte, fixture.immerWerte.werte.slice());
  assert.deepEqual(verl, []);
});

test('[Vor-Umzug·a2·Rot-Beweis Schwelle] eine fehlende Fixture-Datei wirft, meldet nicht "0 Abweichungen"', () => {
  assert.throws(() => fixtureLesen(path.join(__dirname, 'fixtures', 'vor-umzug-a2-wizards-GIBT-ES-NICHT.json')),
    /Fixture fehlt/);
});

test('[Vor-Umzug·a2·Rot-Beweis Schwelle] eine leere Fixture-Datei wirft, meldet nicht "0 Abweichungen"', () => {
  const tmp = path.join(os.tmpdir(), 'vor-umzug-a2-leer-' + process.pid + '-' + Date.now() + '.json');
  fs.writeFileSync(tmp, JSON.stringify({ immerWerte: { werte: [] } }), 'utf8');
  try {
    assert.throws(() => fixtureLesen(tmp), /keine immerWerte/);
  } finally {
    fs.unlinkSync(tmp);
  }
});
