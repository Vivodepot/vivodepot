'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-109 — „Kinder und Schutzbefohlene" sind EINE Liste
   ────────────────────────────────────────────────────────────────────────
   BEFUND: `kinder` (Liste) und `schutzbefohlene` (Freitext) standen in ZWEI Sektionen
   nebeneinander, und der Freitext verwies auf die Liste darüber („Verweis auf die
   Kinder-Liste oben genügt"). Zwei Erfassungsstellen für dieselben Menschen.

   Die Kategorie ist die rechtliche Verantwortung für einen Menschen, nicht das Alter:
   in `kinder` standen ohnehin schon Mündel und Pflegekinder; bei erwachsenen Betreuten
   ändert die Volljährigkeit nur die ART der Vertretung.

   RECHTSBEGRIFFE AM GESETZESTEXT BELEGT (26.07.2026, gesetze-im-internet.de):
   · § 1815 Abs. 1 Satz 1 BGB: „Der Aufgabenkreis eines Betreuers besteht aus einem oder
     mehreren Aufgabenbereichen." — beide Begriffe gelten, in einem VERHÄLTNIS. Welche
     Bereiche es im Einzelnen gibt, ist NICHT abschließend aufgezählt; darum Freitext
     statt erfundenem Enum.
   · § 1814 BGB: das Betreuungsgericht bestellt; die Bestellung entfällt, wenn eine
     Vorsorgevollmacht dasselbe regeln kann (Abs. 3).
   · § 1358 BGB: Ehegattennotvertretung — nur Gesundheitsangelegenheiten, erlischt nach
     SECHS MONATEN ab dem ärztlich festgestellten Zeitpunkt (Abs. 3 Nr. 4).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-109';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'u2-109-alt-depot-wird-eine-liste-ohne-geratene-art',
  'u2-109-ohne-art-ist-nichts-versteckt',
  'u2-109-die-art-bestimmt-die-feldgruppe',
  'u2-109-notvertretung-zeigt-ihren-ablauf',
];

const KIND_ARTEN = ['leiblich', 'adoptiert', 'pflege', 'stief', 'muendel'];
const NUR_MINDERJAEHRIG = ['legalRepresentationParental', 'custodyAdditionalDetailPartial', 'custodyArrangement',
                          'training', 'trainingExpectedToEnd', 'birthCertificateStorage'];
const NUR_BETREUUNG = ['basisOfRepresentation', 'areasOfResponsibility', 'careCourt',
                       'fileReferenceNumber', 'validSince'];

function kinderFeld(V) {
  return V.SEKTOR_BY_ID['people'].sektionen
    .flatMap(s => s.felder || []).find(f => f.id === 'childrenAndDependants');
}
function altDepot41() {
  return {
    schemaVersion: 41,
    menschen: [{ id: 'p1', name: 'Nina Muster' }],
    verwalteteDepots: [{ depotUUID: 'd1', kindRegisterId: 'p1' }],
    sektoren: { 'meine-menschen': {
      kinder: [{ id: 'k1', kind: { ref: 'p1', override: '' }, kind_beziehung: 'pflege',
                 sorgerecht_kind: 'vormund', betreuungsmodell: 'Wechselmodell' }],
      schutzbefohlene: 'Anna (12) und Lukas (9); Pflegekind Mia (7)',
    } },
  };
}

/* ── Probe 1 · Migration: zusammengeführt, nichts geraten ─────────────────── */
function migrationsVerstoesse(d) {
  const fehler = [];
  const mm = (d.sektoren && d.sektoren['people']) || {};
  const l = Array.isArray(mm.childrenAndDependants) ? mm.childrenAndDependants : [];
  if (l.length !== 2) return ['erwartet 2 Zeilen (Bestand + Alt-Freitext), gefunden ' + l.length];
  const [z0, z1] = l;
  if (!z0.person || z0.person.ref !== 'p1') fehler.push('Zeile 1: `person` fehlt oder zeigt falsch');
  if (z0.kind !== undefined) fehler.push('Zeile 1: `kind` steht noch da');
  if (z0.type !== 'pflege') fehler.push('Zeile 1: `type` nicht aus `kind_beziehung` abgeleitet');
  if (z0.kind_beziehung !== undefined) fehler.push('Zeile 1: `kind_beziehung` steht noch da');
  if (z0.custodyArrangement !== 'Wechselmodell') fehler.push('Zeile 1: übriger Wert verändert');
  if (mm.schutzbefohlene !== undefined) fehler.push('Alt-Freitextfeld steht noch da');
  // Der Kern der Entscheidung: die Art wird NICHT geraten.
  if (z1.type !== undefined) fehler.push('Zeile 2: `type` ist GESETZT („' + z1.type + '") — geraten');
  if (z1.note !== 'Anna (12) und Lukas (9); Pflegekind Mia (7)') fehler.push('Zeile 2: Text nicht in `note`');
  const vd = (d.verwalteteDepots || [])[0] || {};
  if (vd.vertreteneRegisterId !== 'p1') fehler.push('Sub-Depot-Schlüssel nicht umbenannt');
  if (vd.kindRegisterId !== undefined) fehler.push('alter Schlüssel `kindRegisterId` steht noch da');
  return fehler;
}

test('u2-109-alt-depot-wird-eine-liste-ohne-geratene-art', () => {
  const { V } = ladeKern();
  const alt = altDepot41();
  // Positivkontrollen: die Alt-Form liegt wirklich vor, sonst prüft die Probe nichts.
  assert.equal(typeof alt.sektoren['meine-menschen'].schutzbefohlene, 'string');
  assert.ok(alt.sektoren['meine-menschen'].kinder[0].kind, 'Alt-Zeile trägt `kind`');

  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));

  assert.deepEqual(migrationsVerstoesse(d), [],
    'Die Zusammenführung ist verlustfrei — und die Art des Alt-Freitextes wird NICHT geraten: '
    + '„Anna (12) und Lukas (9)" nennt Kinder, nicht einen betreuten Erwachsenen.');
});

test('[Negativprobe] u2-109-Probe-1: eine geratene Art wuerde auffallen', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren(altDepot41());
  // MUTATION: dem Alt-Freitext eine Art geben — genau das, was der Auftrag verbietet.
  d.sektoren['people'].childrenAndDependants[1].type = 'betreuter_erwachsener';
  const fehler = migrationsVerstoesse(d);
  assert.equal(fehler.length, 1, 'die Probe MUSS das melden');
  assert.match(fehler[0], /geraten/);
});

/* ── Probe 2 · ohne Art ist NICHTS versteckt ──────────────────────────────── */
// Der Fall, den die Migration ausdrücklich erzeugt. Ein positives Gate (`sichtbarWenn`)
// würde hier ALLE art-abhängigen Felder verstecken — die Bürgerin sähe eine fast leere
// Zeile und keinen Weg hinein. Genau darum ist das Gate negativ (U2-ADR-102/109).
// Das Ergebnis-Array wird LOKAL aufgebaut, nicht per `unter.filter().map()`: `unter` stammt aus dem
// VM-Kontext des Kerns, ein daraus abgeleitetes Array traegt dessen Prototyp, und `deepStrictEqual`
// schlaegt fehl, obwohl beide Seiten leer sind. Dieselbe Falle wie bei U2-ADR-104/105.
function versteckteOhneArt(V) {
  const zeileOhneArt = { id: 'x' };            // KEINE `art`
  const versteckt = [];
  for (const u of kinderFeld(V).unterFelder) {
    if (!V.feldSichtbar(u, zeileOhneArt)) versteckt.push(u.id);
  }
  return versteckt;
}

test('u2-109-ohne-art-ist-nichts-versteckt', () => {
  const { V } = ladeKern();
  const unter = kinderFeld(V).unterFelder;
  assert.ok(unter.length >= 15, 'Positivkontrolle: der Suchraum ist besetzt (' + unter.length + ' Unterfelder)');
  assert.ok(unter.some(u => u.verborgenWenn), 'Positivkontrolle: es GIBT gegatete Felder');
  assert.deepEqual(versteckteOhneArt(V), [],
    'Fehlt die Art, MUSS alles sichtbar bleiben — sonst sieht die Bürgerin nach der Migration '
    + 'eine fast leere Zeile und keinen Weg hinein.');
});

test('[Negativprobe] u2-109-Probe-2: ein positives Gate wuerde Felder verstecken', () => {
  const { V } = ladeKern();
  // MUTATION: dieselbe Bedingung als POSITIVES Gate formuliert.
  const alsPositiv = { id: 'probe', sichtbarWenn: { feld: 'art', wert: KIND_ARTEN } };
  assert.equal(V.feldSichtbar(alsPositiv, { id: 'x' }), false,
    'ein sichtbarWenn-Feld verschwindet ohne Art — genau der Unterschied zur negativen Form');
  assert.equal(V.feldSichtbar({ id: 'probe', verborgenWenn: { feld: 'art', wert: KIND_ARTEN } }, { id: 'x' }), true,
    'die negative Form laesst es stehen');
});

/* ── Probe 3 · die Art bestimmt die Feldgruppe ────────────────────────────── */
function gruppenVerstoesse(V) {
  const unter = kinderFeld(V).unterFelder;
  const fehler = [];
  const sichtbareIds = (zeile) => unter.filter(u => V.feldSichtbar(u, zeile)).map(u => u.id);

  const beiKind = sichtbareIds({ type: 'leiblich' });
  for (const id of NUR_MINDERJAEHRIG) if (!beiKind.includes(id)) fehler.push('Kind-Zeile: `' + id + '` fehlt');
  for (const id of NUR_BETREUUNG) if (beiKind.includes(id)) fehler.push('Kind-Zeile: `' + id + '` erscheint, gehört aber zur Betreuung');

  const beiBetreuung = sichtbareIds({ type: 'betreuter_erwachsener' });
  for (const id of NUR_BETREUUNG) if (!beiBetreuung.includes(id)) fehler.push('Betreuungs-Zeile: `' + id + '` fehlt');
  for (const id of NUR_MINDERJAEHRIG) if (beiBetreuung.includes(id)) fehler.push('Betreuungs-Zeile: `' + id + '` erscheint, gehört aber zur elterlichen Sorge');

  // Immer sichtbar, egal welche Art.
  for (const id of ['person', 'type', 'note']) {
    if (!beiKind.includes(id) || !beiBetreuung.includes(id)) fehler.push('`' + id + '` muss IMMER sichtbar sein');
  }
  return fehler;
}

test('u2-109-die-art-bestimmt-die-feldgruppe', () => {
  const { V } = ladeKern();
  assert.ok(NUR_MINDERJAEHRIG.length && NUR_BETREUUNG.length, 'Positivkontrolle: beide Gruppen besetzt');
  assert.deepEqual(gruppenVerstoesse(V), [],
    'Bei „Kind" erscheinen die Sorgerechts-Felder und KEINE Betreuungs-Felder — und umgekehrt. '
    + 'Die elterliche Sorge besteht kraft Gesetzes (§ 1626), die Betreuung wird bestellt (§ 1814); '
    + 'beides nebeneinander anzuzeigen wäre irreführend.');
});

/* ── Probe 4 · Ehegattennotvertretung: der Ablauf wird BERECHNET ──────────── */
// § 1358 Abs. 3 Nr. 4 BGB: sechs Monate. Berechnet, NIE gespeichert (U2-ADR-023) — ein
// abgelegtes Ablaufdatum veraltet in dem Moment, in dem es abgelegt wird.
function ablaufVerstoesse(V, heute) {
  const fehler = [];
  const alt = { basisOfRepresentation: 'ehegattennotvertretung', validSince: '2025-01-01' };
  const frisch = { basisOfRepresentation: 'ehegattennotvertretung', validSince: '2026-07-01' };
  const keine = { basisOfRepresentation: 'betreuung', validSince: '2025-01-01' };

  const tAlt = V.notvertretungAblaufText(alt, heute);
  const tFrisch = V.notvertretungAblaufText(frisch, heute);
  const tKeine = V.notvertretungAblaufText(keine, heute);

  if (!/abgelaufen/.test(tAlt)) fehler.push('länger als sechs Monate her → kein „abgelaufen"-Hinweis: ' + JSON.stringify(tAlt));
  if (!/läuft ab/.test(tFrisch)) fehler.push('innerhalb der Frist → kein „läuft ab"-Hinweis: ' + JSON.stringify(tFrisch));
  if (tKeine !== '') fehler.push('eine Betreuung (§ 1814) darf KEINEN Ablauf-Hinweis tragen: ' + JSON.stringify(tKeine));
  return fehler;
}

test('u2-109-notvertretung-zeigt-ihren-ablauf', () => {
  const { V } = ladeKern();
  const heute = new Date('2026-07-26T12:00:00Z');
  assert.deepEqual(ablaufVerstoesse(V, heute), [],
    'Die Ehegattennotvertretung erlischt nach sechs Monaten (§ 1358 Abs. 3 Nr. 4 BGB). Ein stiller '
    + 'abgelaufener Eintrag in einem Notfall-Dokument wäre eine Falschaussage.');
});

test('[Negativprobe] u2-109-Probe-4: der Ablauf wird BERECHNET, nie gespeichert', () => {
  const { V } = ladeKern();
  const heute = new Date('2026-07-26T12:00:00Z');
  const zeile = { basisOfRepresentation: 'ehegattennotvertretung', validSince: '2025-01-01' };
  const vorher = JSON.stringify(zeile);
  V.notvertretungAblaufText(zeile, heute);
  assert.equal(JSON.stringify(zeile), vorher,
    'die Berechnung darf die Zeile NICHT verändern — ein abgelegtes Ablaufdatum veraltet sofort '
    + '(U2-ADR-023: abgeleitete Werte werden nie gespeichert)');
  // Und sie hängt wirklich am Datum: ein anderer „heute" ergibt ein anderes Urteil.
  assert.match(V.notvertretungAblaufText(zeile, new Date('2025-03-01T00:00:00Z')), /läuft ab/,
    'zum früheren Zeitpunkt war dieselbe Zeile NICHT abgelaufen — die Rechnung lebt');
});

/* ── Roll-up und Sub-Depot-Hinweis (Weg A und Weg C) ──────────────────────── */
test('[Weg A] der Roll-up zeigt auch einen betreuten Erwachsenen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  const kid = V.personHinzufuegen({ name: 'Nina', yearOfBirthIfTheExactDayIs: '2015' });
  const eltern = V.personHinzufuegen({ name: 'Olga', yearOfBirthIfTheExactDayIs: '1940' });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', { person: { ref: kid }, type: 'leiblich', legalRepresentationParental: 'allein' });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants',
    { person: { ref: eltern }, type: 'betreuter_erwachsener', basisOfRepresentation: 'betreuung' });
  const html = V.schutzbefohleneRollupHTML(new Date('2026-07-26T12:00:00Z'));
  assert.ok(html.includes('Nina') && html.includes('alleinige elterliche Sorge'), 'Kind mit Sorge-Label');
  assert.ok(html.includes('Olga'), 'der betreute Erwachsene erscheint — Filter ist weg (Weg A)');
  // Wortlaut seit 22.09.2026 ohne Paragraph (Auftrag „Paragraphen raus", Nr. 14–16, VERTRETUNG_ART_LABEL): die
  // Zeile trug „§ 1814 BGB" nur als Beleg dafür, dass Olga ihre eigene, von der Sorgerechts-Zeile verschiedene
  // Grundlage bekommt (VERTRETUNG_ART_LABEL.betreuung), nicht als eigenständige Aussage — die Probe prüft das
  // jetzt direkt: die Betreuung-Zeile trägt das Grundlage-Label, nicht das Sorgerechts-Label von Nina.
  const olgaZeile = html.split('Olga')[1] || '';
  assert.ok(olgaZeile.includes('gesetzliche Betreuung'), 'und mit seiner Grundlage (gesetzliche Betreuung)');
  assert.ok(!olgaZeile.includes('elterliche Sorge'), 'nicht mit einem Sorgerechts-Label');
  assert.ok(!/data-edit|<input|<select/.test(html), 'read-only — keine zweite Schreibquelle');
});

/* ── „Drei Nachzüge" (14.08.2026), Zug 2: notvertretungNurGesundheit — der Roll-up
   zeigte bislang nur den berechneten Ablauf, nicht die Reichweiten-Einschränkung (§ 1358 Abs. 1
   BGB: nur Gesundheitsangelegenheiten). Wer das nicht weiß, überschätzt die Vertretung. Reine
   Rechtsauskunft über die Rechtslage, keine Empfehlung (U2-ADR-025 gewahrt). ──────────────── */
test('[Drei-Nachzüge Zug 2] der Roll-up nennt die Gesundheits-Beschränkung bei Ehegattennotvertretung', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  const partner = V.personHinzufuegen({ name: 'Otto', yearOfBirthIfTheExactDayIs: '1950' });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants',
    { person: { ref: partner }, type: 'betreuter_erwachsener', basisOfRepresentation: 'ehegattennotvertretung', validSince: '2026-06-01' });
  const html = V.schutzbefohleneRollupHTML(new Date('2026-07-26T12:00:00Z'));
  assert.ok(html.includes(V.STRINGS.notvertretungNurGesundheit),
    'ROT ERWARTET, wenn falsch: die Reichweiten-Einschränkung fehlt neben dem berechneten Ablauf');
});

test('[Drei-Nachzüge Zug 2] die Gesundheits-Beschränkung erscheint NICHT bei einer gesetzlichen Betreuung', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  const eltern = V.personHinzufuegen({ name: 'Olga', yearOfBirthIfTheExactDayIs: '1940' });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants',
    { person: { ref: eltern }, type: 'betreuter_erwachsener', basisOfRepresentation: 'betreuung' });
  const html = V.schutzbefohleneRollupHTML(new Date('2026-07-26T12:00:00Z'));
  assert.ok(!html.includes(V.STRINGS.notvertretungNurGesundheit),
    'eine gesetzliche Betreuung ist keine Ehegattennotvertretung — der Hinweis gehört nur dorthin');
});

test('[Weg C] der Sub-Depot-Hinweis nennt Reichweite UND Doppel-Kopie', () => {
  const { V } = ladeKern();
  const t = V.STRINGS.kindSubDepotBetreuungHinweis;
  assert.ok(/Gericht/.test(t),
    'Punkt 1 muss drin bleiben: die Betreuung reicht nur so weit, wie das Gericht sie gesetzt hat');
  assert.ok(/zweimal|zwei ?mal/.test(t) && /Abgleich/.test(t),
    'Punkt 2 muss drin bleiben: ein eigenes Depot führt zu einer zweiten, nicht abgeglichenen Kopie');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-109 nennt diese vier Pruefungen', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'u2-109-alt-depot-wird-eine-liste-ohne-geratene-art', diskriminante: migrationsVerstoesse },
    { fuer: 'u2-109-ohne-art-ist-nichts-versteckt',               diskriminante: versteckteOhneArt },
    { fuer: 'u2-109-die-art-bestimmt-die-feldgruppe',             diskriminante: gruppenVerstoesse },
    { fuer: 'u2-109-notvertretung-zeigt-ihren-ablauf',            diskriminante: ablaufVerstoesse },
  ],
};
