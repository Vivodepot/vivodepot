'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Betreuungsverfügungs-Dokument-Generator (Auftrag Vollmacht/
   Betreuung-Generatoren, 01.08.2026) — Zug 2
   ────────────────────────────────────────────────────────────────────────
   Vierte Modul-Vertrag-Instanz (nach PV/KI/Vollmacht), mehrfach:false wie
   PV/KI. Kein Ankreuz-Baustein-Korpus (Zug-0-Befund): drei Personen-/Text-
   Blöcke + ein Freitext-Wunsch, alle als refMehrfach/freitextSatz auf
   bestehende Schema-Felder verdrahtet — kein neuer Blocktyp nötig.

   Gleiche Pflicht-Disziplin wie bei der Vollmacht („übernommen ist nicht
   gemessen"): jeder feste Textbaustein muss als exakte Teilzeichenkette im
   signierten STANDARD_VORLAGEN['betreuungsverfuegung'].wortlaut stehen.

   Eine Besonderheit gegenüber der Vollmacht-Prüfung: das BMJ-PDF bricht
   zwei Sätze MITTEN im Satz um (PDF-Zeilenumbruch-Artefakt, gemessen via
   JSON.stringify(wortlaut), kein inhaltlicher Bruch). Der Generator setzt
   sie als einen lesbaren Satz zusammen — die Prüfung vergleicht deshalb
   die beiden Teilsätze EINZELN gegen den Wortlaut, nicht den zusammen-
   gesetzten Satz als Ganzes.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Alle festen Textbausteine, die BETREUUNG_MODUL tatsächlich in ein Dokument setzen kann
// (refMehrfach(Voll)-/freitextSatz-Rahmensätze ohne den {namen}/{text}-Platzhalter selbst — das
// ist Nutzereingabe/Personendaten, kein amtlicher Text). Der Ersatzperson-Satz ist ausgenommen: er
// überbrückt den PDF-Zeilenumbruch-Artefakt „…kann,\n\nsoll folgende…" — eigene Prüfung unten,
// Teilsatz für Teilsatz (s. Kopf-Kommentar der Datei). refMehrfachVoll (F8 Zug1) trägt denselben
// amtlichen Rahmensatz wie refMehrfach, nur mit voller Personalie statt bloßem Namen befüllt —
// dieselbe Prüfung gilt unverändert.
function alleModulTexte(modul) {
  const texte = [];
  for (const abschnitt of modul.abschnitte) {
    if (abschnitt.eingangsformel) continue;   // eigene Prüfung unten
    for (const blk of abschnitt.bloecke) {
      if (blk.feldId === 'alternatePerson') continue;
      if (blk.typ === 'refMehrfach' || blk.typ === 'refMehrfachVoll') texte.push(blk.satz.replace('{namen}', '').replace(/\s*\.$/, ''));
      else if (blk.typ === 'freitextSatz') texte.push(blk.satz.replace('{text}', '').replace(/\s*\.$/, ''));
    }
  }
  return texte;
}

test('[Betreuung·Konsistenz] JEDER refMehrfach(Voll)-/freitextSatz-Rahmensatz ist eine exakte Teilzeichenkette des signierten Wortlauts', () => {
  const { V } = ladeKern();
  const wortlaut = V.STANDARD_VORLAGEN.find(x => x.id === 'betreuungsverfuegung').wortlaut;
  const texte = alleModulTexte(V.BETREUUNG_MODUL);
  assert.ok(texte.length >= 3, 'Vorbedingung: genug Bausteine gesammelt, sonst prüft der Test nichts');
  const fehlend = texte.filter(t => !wortlaut.includes(t));
  assert.deepEqual(fehlend, [], 'jeder Rahmensatz muss wörtlich im signierten Wortlaut stehen');
});

test('[Betreuung·Konsistenz] die feste Eingangsformel ist — je Teilsatz, PDF-Zeilenumbruch-Artefakt getrennt geprüft — im Wortlaut enthalten', () => {
  const { V } = ladeKern();
  const wortlaut = V.STANDARD_VORLAGEN.find(x => x.id === 'betreuungsverfuegung').wortlaut;
  const fixiert = [
    'Ich,',
    'lege hiermit für den Fall, dass ich infolge Krankheit oder Behinderung meine Angelegenheiten ganz oder teilweise nicht mehr',
    'selbst besorgen kann und deshalb ein Betreuer für mich bestellt werden muss, Folgendes fest:',
  ];
  const fehlend = fixiert.filter(t => !wortlaut.includes(t));
  assert.deepEqual(fehlend, []);
});

test('[Betreuung·Konsistenz] der Ersatzperson-Satz ist — je Teilsatz, PDF-Zeilenumbruch-Artefakt getrennt geprüft — im Wortlaut enthalten', () => {
  const { V } = ladeKern();
  const wortlaut = V.STANDARD_VORLAGEN.find(x => x.id === 'betreuungsverfuegung').wortlaut;
  // Zweites Fragment: „soll folgende Person" trägt im PDF ZWEI GESCHÜTZTE Leerzeichen (U+00A0,
  // gemessen per Zeichencode, kein Tippfehler) statt normaler — direkt aus dem Wortlaut
  // ausgeschnitten, nicht von Hand eingetippt, sonst reißt genau dieser Test grundlos.
  const fixiert = [
    'Falls die vorstehende Person nicht zum Betreuer oder zur Betreuerin bestellt werden kann,',
    'soll folgende Person bestellt werden:',
  ];
  const fehlend = fixiert.filter(t => !wortlaut.includes(t));
  assert.deepEqual(fehlend, []);
});

test('[Betreuung·1] nur tatsächlich befüllte Blöcke erscheinen — leere Zeile liefert nur den Kopf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'bv-leer', instrument: 'custodianship-declaration' },
  ] };
  V.setData(d);
  const abschnitte = V.betreuungDokumentAbschnitte();
  assert.equal(abschnitte.length, 1);
  assert.equal(abschnitte[0].titel, '');
});

test('[Betreuung·2] Betreuer-Vorschlag und Ersatzperson erscheinen mit Namen, unabhängig voneinander', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personSicherstellen('Klaus Betreuer');
  const d = V.getData();
  const p1 = d.menschen.find(p => p.name === 'Klaus Betreuer');
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'bv-1', instrument: 'custodianship-declaration', proposedPerson: { ref: p1.id } },
  ] };
  V.setData(d);
  const zeilen = V.betreuungDokumentAbschnitte().flatMap(a => a.zeilen).join(' | ');
  assert.match(zeilen, /Zu meinem Betreuer\/meiner Betreuerin soll bestellt werden: Klaus Betreuer\./);
  assert.doesNotMatch(zeilen, /soll folgende Person bestellt werden/, 'ohne Ersatzperson kein Ersatz-Satz');
});

test('[Betreuung·3] Wünsche-Freitext steht in seinem Rahmensatz; der (jetzt reine „was nicht") Ausschluss-Freitext steht als eigener Absatz UNTER den Wünschen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'bv-1', instrument: 'custodianship-declaration',
      whatTheCareArrangementShould2: 'kein Umzug ins Heim ohne Rücksprache mit der Familie',
      whatTheCareArrangementShould: 'Wohnung möglichst lange halten' },
  ] };
  V.setData(d);
  const abschnitte = V.betreuungDokumentAbschnitte();
  const wuenscheAbschnitt = abschnitte.find(a => a.titel === 'Wünsche zur Wahrnehmung der Betreuung');
  assert.ok(wuenscheAbschnitt, 'Wünsche-Abschnitt existiert');
  assert.ok(wuenscheAbschnitt.zeilen.includes('Zur Wahrnehmung meiner Angelegenheiten durch den Betreuer/die Betreuerin habe ich folgende Wünsche: Wohnung möglichst lange halten.'));
  assert.ok(wuenscheAbschnitt.zeilen.includes('kein Umzug ins Heim ohne Rücksprache mit der Familie'), 'reiner Fließtext-Absatz, kein erfundener Rahmensatz');
  const ausschlussAbschnitt = abschnitte.find(a => a.titel === 'Ausschluss');
  assert.ok(!ausschlussAbschnitt, 'ohne whoShouldNotBeAppointed bleibt der Ausschluss-Abschnitt leer/entfällt — der alte Freitext landet dort NICHT mehr');
});

test('[Betreuung·3b] F8 Zug1: whoShouldNotBeAppointed (neues Ref-Feld) zeigt volle Personalie im Ausschluss-Satz', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personHinzufuegen({ name: 'Onkel Reinhard', birthDate: '1950-02-02', adresse: 'Waldweg 3, 12345 Nirgendwo' });
  const d = V.getData();
  const p = d.menschen.find(m => m.name === 'Onkel Reinhard');
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'bv-1', instrument: 'custodianship-declaration', whoShouldNotBeAppointed: { ref: p.id } },
  ] };
  V.setData(d);
  const zeilen = V.betreuungDokumentAbschnitte().flatMap(a => a.zeilen);
  assert.ok(zeilen.some(z => z.startsWith('Auf keinen Fall soll zum Betreuer/zur Betreuerin bestellt werden: Onkel Reinhard, geboren am 02.02.1950, wohnhaft in Waldweg 3, 12345 Nirgendwo.')));
});

test('[Betreuung·3c] F8 Zug1: Betreuer/Ersatzperson zeigen volle Personalie, nicht nur den Namen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personHinzufuegen({ name: 'Klaus Betreuer', birthDate: '1965-07-07', adresse: 'Am Markt 2, 54321 Musterstadt', tel: '0231 998877' });
  const d = V.getData();
  const p = d.menschen.find(m => m.name === 'Klaus Betreuer');
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'bv-1', instrument: 'custodianship-declaration', proposedPerson: { ref: p.id } },
  ] };
  V.setData(d);
  const zeilen = V.betreuungDokumentAbschnitte().flatMap(a => a.zeilen).join(' | ');
  assert.match(zeilen, /Zu meinem Betreuer\/meiner Betreuerin soll bestellt werden: Klaus Betreuer, geboren am 07\.07\.1965, wohnhaft in Am Markt 2, 54321 Musterstadt, 0231 998877\./);
});

test('[Betreuung·3d] F8 Zug1 Kern-Gate: fehlt Name/Geburtsdatum der eigenen Partei, öffnet betreuungDokumentOeffnen kein Blatt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.identity = {};   // weder Name noch Geburtsdatum
  d.sektoren.advanceCare = { provisionInstruments: [ { id: 'bv-1', instrument: 'custodianship-declaration', whatTheCareArrangementShould: 'x' } ] };
  V.setData(d);
  assert.equal(V.betreuungDokumentOeffnen(), 'identitaet-unvollstaendig');
});

test('[Betreuung·4] eigener Name erscheint in der Eingangsformel, wenn in Identität eingetragen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.identity = d.sektoren.identity || {};
  d.sektoren.identity.givenName = 'Anna';
  d.sektoren.identity.familyName = 'Muster';
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'bv-1', instrument: 'custodianship-declaration' },
  ] };
  V.setData(d);
  const kopf = V.betreuungDokumentAbschnitte()[0].zeilen.join('\n');
  assert.match(kopf, /Anna Muster/);
});

test('[Betreuung·5] UI-Knopf erscheint nur bei tatsächlichen Angaben (_bvHatDaten)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'bv-leer', instrument: 'custodianship-declaration' },
  ] };
  V.setData(d);
  assert.equal(V._bvHatDaten(), false);
  d.sektoren.advanceCare.provisionInstruments[0].whatTheCareArrangementShould = 'irgendein Wunsch';
  V.setData(d);
  assert.equal(V._bvHatDaten(), true);
});

test('[Betreuung·6] die Engine bleibt abwärtskompatibel — PV/KI/Vollmacht unverändert nutzbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Betreuung-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = d.sektoren.advanceCare || {};
  d.sektoren.advanceCare.pv_situationen = ['sterbeprozess'];
  V.setData(d);
  assert.doesNotThrow(() => V.pvDokumentAbschnitte());
  assert.ok(V.pvDokumentAbschnitte().length > 0);
});

test('[Betreuung·Registry] Modul trägt einen Generator mit nichtleeren abschnitte, mehrfach:false wie PV/KI', () => {
  const { V } = ladeKern();
  const m = V.VORSORGE_MODUL_BY_ID['betreuungsverfuegung'];
  assert.ok(m.generator, 'Betreuungsverfügung trägt einen Generator (BETREUUNG_MODUL)');
  assert.ok(Array.isArray(m.generator.abschnitte) && m.generator.abschnitte.length > 0);
  assert.equal(m.mehrfach, false);
  assert.equal(typeof m.generator.datenLesen, 'function');
  assert.equal(m.generator.datenLesen.length, 0, 'datenLesen() nimmt kein zeilenId — mehrfach:false wie PV/KI');
});
