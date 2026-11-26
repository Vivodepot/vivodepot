'use strict';
/* Probe — eine Geburtsurkunde nach XPersonenstand wird eingelesen (13.11.2026).
   Standard: XPersonenstand 26.11 (KoSIT, urn:xoev-de:kosit:standard:xinneres.xpersonenstand_26.11), Namensraum
   http://xpsw.domap.de/xpsw2611. Eine eigene Nachricht „Geburtsurkunde" gibt es nicht; den Datenumfang der Urkunde trägt die
   Antwort aus dem Geburtenregister 018011/018012 (Spezifikation Kap. 4.6.2). Gelesen wird die Struktur, keine Schemadatei.
   Belegt:
     • [Erkennen] eine 018011-Antwort wird erkannt, in beiden Bereichen, die sie lesen;
     • [Abbildung·Person] im Bereich Identität gehen Vornamen, Geburtsname, Geburtsdatum, Geburtsort und Geschlecht in ihre Felder;
       der heutige Familienname wird nicht aus der Urkunde gesetzt;
     • [Abbildung·Kind] im Bereich Menschen entsteht ein Eintrag in der Kinder-Liste mit einer Person mit Namen, Geburtsdatum und -ort;
     • [Gleich] [Name] [Offen] Einlesen legt nur ins geöffnete Depot; Name und Geburtsdatum werden mit seiner Identität abgeglichen,
       eine andere Person wird beim Namen genannt, mit den Wegen Unterlage oder Wechsel in ihr Depot;
     • [Unterlage] [Kinder·Doppel] als Unterlage: Datei in der Mappe und Eintrag bei den Kindern, ein gleiches Kind wird ergänzt;
     • [Herkunft] die Quelle nennt das Standesamt und den Registereintrag, die Angabe bleibt eingelesen und nie signiert;
     • [Teilweise bekannt] ein nur mit Jahr bekanntes Geburtsdatum geht ins Jahresfeld, ein Datum wird nicht erfunden;
     • [Geschlecht] ein Code ohne Entsprechung bleibt leer, geraten wird nicht;
     • [Abweisung] eine frei interpretierte Datei ohne XPersonenstand-Nachrichtenelement wird mit Grund abgewiesen (NOOTS-Beispiel);
     • [Rot-Beweis] ohne das Format im Kern fällt jede Zusicherung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const FIX = path.join(__dirname, 'fixtures', 'xpersonenstand');
const URKUNDE = fs.readFileSync(path.join(FIX, 'geburt-018011-erfunden.xml'), 'utf8');
const NOOTS = fs.readFileSync(path.join(FIX, 'noots-fiktiv-urkunde-25-05.xml'), 'utf8');
const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');

async function frisch(opt) {
  const k = ladeKern(opt);
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
const zeile = (plan, feldId) => plan.zeilen.find((z) => z.feldId === feldId);

test('[Erkennen] eine 018011-Antwort wird im Bereich Identität und im Bereich Menschen erkannt', async () => {
  const { V } = await frisch();
  assert.equal(V.importFormatErkennen(URKUNDE, 'identity'), 'xpersonenstand-geburt');
  assert.equal(V.importFormatErkennen(URKUNDE, 'people'), 'xpersonenstand-geburt-kind');
});

test('[Abbildung·Person] die eigene Urkunde füllt die Felder der Identität', async () => {
  const { V } = await frisch();
  const plan = V.importPlan('xpersonenstand-geburt', URKUNDE);
  assert.ok(!plan.ungueltig, 'der Plan ist gültig');
  assert.equal(zeile(plan, 'givenName').neuWert, 'Lina Marie');
  assert.equal(zeile(plan, 'birthName').neuWert, 'Musterkind');
  assert.equal(zeile(plan, 'birthDate').neuWert, '2026-10-01');
  assert.equal(zeile(plan, 'birthPlace').neuWert, 'Beispielstadt');
  assert.equal(zeile(plan, 'gender').neuWert, 'w');
  assert.equal(zeile(plan, 'familyName'), undefined, 'der heutige Familienname steht nicht in der Urkunde');
});

test('[Abbildung·Kind] die Urkunde eines Kindes legt einen Eintrag in der Kinder-Liste an', async () => {
  const { V } = await frisch();
  const plan = V.importPlan('xpersonenstand-geburt-kind', URKUNDE);
  assert.equal(plan.zeilen.length, 0, 'nichts geht in die eigene Identität');
  assert.equal(plan.listen.length, 1);
  assert.equal(plan.listen[0].sektorId, 'people');
  assert.equal(plan.listen[0].feldId, 'childrenAndDependants');
  const p = plan.listen[0].eintraege[0]._person;
  assert.equal(p.name, 'Lina Marie Musterkind');
  assert.equal(p.birthDate, '2026-10-01');
  assert.equal(p.birthPlace, 'Beispielstadt');
  V.importAnwenden(plan);
  const kinder = V.feldRohwert('people', 'childrenAndDependants');
  assert.equal(kinder.length, 1, 'ein Kind steht in der Liste');
  assert.ok(kinder[0].person, 'der Eintrag verweist auf eine Person');
});

// Depots sind autark (Produktentscheidung 13.11.2026): Einlesen legt nur ins geöffnete Depot. Wessen Urkunde es ist, fragt die Anwendung nicht;
// sie gleicht Name und Geburtsdatum mit der Identität des geöffneten Depots ab und sagt, was sie sieht.
const identitaet = (V, vor, nach, geb) => {
  V.sektorFeldSetzen('identity', 'givenName', vor);
  V.sektorFeldSetzen('identity', 'familyName', nach);
  if (geb) V.sektorFeldSetzen('identity', 'birthDate', geb);
};

test('[Gleich] gleicher Name und gleiches Geburtsdatum: die Angaben gehen ohne Rückfrage in die Identität', async () => {
  const { V } = await frisch();
  identitaet(V, 'lina marie', 'Musterkind', '2026-10-01');
  const m = V.xpsGeburtVorschauModell(URKUNDE);
  assert.equal(m.art, 'gleich');
  assert.equal(m.fid, 'xpersonenstand-geburt');
  assert.deepEqual(m.wege, [], 'keine Frage, keine Wahl');
  assert.ok(m.hinweis.includes('Lina Marie Musterkind'), 'die Vorschau nennt den Namen auf der Urkunde');
});

test('[Name] eine andere Person: die Vorschau nennt den Namen und bietet die zwei Wege', async () => {
  const { V } = await frisch();
  identitaet(V, 'Anna', 'Musterfrau', '1990-04-02');
  let m = V.xpsGeburtVorschauModell(URKUNDE);
  assert.equal(m.art, 'andere');
  assert.equal(m.fid, 'xpersonenstand-geburt-kind');
  assert.ok(m.hinweis.includes('Lina Marie Musterkind'), 'der Name von der Urkunde steht im Hinweis');
  // Wortlaut nach dem Desktop-Dummy (Umbau, Zeilen 564–567; Beispiel Mia): der Satz nennt, wer auf der Urkunde steht, wohin sie kommt und wo
  // die eigenen Angaben der Person stehen. Der Genitiv des Vornamens: endet er auf s, ß, x oder z, steht nur der Apostroph, sonst ein s.
  assert.equal(m.hinweis, 'Auf der Urkunde steht Lina Marie Musterkind, nicht Sie. In Ihr Depot kommt sie als Dokument, etwa für die Anmeldung beim Standesamt. Lina Maries eigene Angaben stehen in Lina Maries Depot.');
  assert.deepEqual(m.wege, ['unterlage'], 'ohne Depot für die Person nur die Unterlage');
  V.ankerDaten().verwalteteDepots = [{ depotUUID: 'd-lina', inhaberin: 'Lina Marie Musterkind' }];
  m = V.xpsGeburtVorschauModell(URKUNDE);
  assert.deepEqual(m.wege, ['unterlage', 'depot'], 'mit Depot der Person auch der Wechsel dorthin');
  assert.equal(m.depotUUID, 'd-lina');
  assert.equal(m.labels.depot, 'In Lina Maries Depot einlesen', 'der Wechsel nennt die Person im Genitiv');
  assert.equal(m.labels.unterlage, 'Als Dokument ablegen');   // Wörter des Zuordnens seit 23.11.2026 (Produktentscheidung, Abweichung vom Dummy D72)
  const jonas = V.xpsGeburtVorschauModell(URKUNDE.replace('<name>Lina Marie</name>', '<name>Jonas</name>'));
  assert.equal(jonas.labels.depot, 'In Jonas’ Depot einlesen', 'auf s: nur der Apostroph');
  assert.ok(jonas.hinweis.endsWith('Jonas’ eigene Angaben stehen in Jonas’ Depot.'));
  // Gleicher Name, anderes Geburtsdatum: nicht dieselbe Person.
  identitaet(V, 'Lina Marie', 'Musterkind', '1990-01-01');
  assert.equal(V.xpsGeburtVorschauModell(URKUNDE).art, 'andere');
});

test('[Offen] ein Depot ohne eigene Identität: der Name steht da, und die Person wählt', async () => {
  const { V } = await frisch();
  const m = V.xpsGeburtVorschauModell(URKUNDE);
  assert.equal(m.art, 'offen');
  assert.ok(m.hinweis.includes('Lina Marie Musterkind'));
  assert.deepEqual(m.wege, ['unterlage', 'meine']);
});

test('[Unterlage] die Urkunde einer anderen Person: Datei in der Mappe und Eintrag bei den Kindern, beide mit Herkunft', async () => {
  const { V } = await frisch();
  identitaet(V, 'Anna', 'Musterfrau');
  const r = V.xpsGeburtAlsUnterlage(URKUNDE);
  const kinder = V.feldRohwert('people', 'childrenAndDependants');
  assert.equal(kinder.length, 1, 'ein Kind steht in der Liste');
  const ablage = V.mappeEintrag(r.mappeId);
  assert.ok(ablage, 'die Datei liegt in der Mappe');
  assert.equal(ablage.mime, 'application/xml');
  assert.equal(ablage.autoritativ, true, 'das Original bleibt unverändert');
  assert.match(ablage.aussteller, /Standesamt Beispielstadt/);
  assert.ok(ablage.beschriftung.includes('Lina Marie Musterkind'));
  assert.equal(V.feldRohwert('identity', 'givenName'), 'Anna', 'die eigene Identität bleibt unberührt');
});

test('[Kinder·Doppel] ein Kind mit gleichem Namen und Geburtsdatum wird ergänzt, nicht doppelt angelegt', async () => {
  const { V } = await frisch();
  identitaet(V, 'Anna', 'Musterfrau');
  const ohneOrt = URKUNDE.replace(/<geburtsort>[\s\S]*?<\/geburtsort>/, '');
  V.xpsGeburtAlsUnterlage(ohneOrt);
  V.xpsGeburtAlsUnterlage(URKUNDE);
  const kinder = V.feldRohwert('people', 'childrenAndDependants');
  assert.equal(kinder.length, 1, 'kein zweiter Eintrag');
  const p = V.ankerDaten().menschen.filter((x) => x.name === 'Lina Marie Musterkind');
  assert.equal(p.length, 1, 'keine zweite Person im Register');
  assert.equal(p[0].birthPlace, 'Beispielstadt', 'der fehlende Geburtsort wird ergänzt');
  // Ein anderes Geburtsdatum ist ein anderes Kind.
  V.xpsGeburtAlsUnterlage(URKUNDE.replace('2026-10-01', '2024-02-03'));
  assert.equal(V.feldRohwert('people', 'childrenAndDependants').length, 2);
});

test('[Herkunft] die Quelle nennt Standesamt und Registereintrag, die Angabe ist eingelesen, nicht signiert', async () => {
  const { V } = await frisch();
  const plan = V.importPlan('xpersonenstand-geburt', URKUNDE);
  assert.match(plan.quelleLabel, /Standesamt Beispielstadt/);
  assert.match(plan.quelleLabel, /G 2026\/123/);
  assert.match(plan.quelleLabel, /^Geburtsurkunde · /, 'die Quelle beginnt mit der Art des Dokuments, nicht mit dem Knopftext');
  assert.equal(plan.signiert, false);
  V.importAnwenden(plan);
  const kette = V.liesUrheberschaft('identity', 'birthDate');
  const letzter = kette[kette.length - 1];
  assert.equal(letzter.eingabeArt, 'import');
  assert.match(letzter.quelle, /Standesamt Beispielstadt/);
});

test('[Teilweise bekannt] ein nur mit Jahr bekanntes Geburtsdatum geht ins Jahresfeld', async () => {
  const { V } = await frisch();
  const nurJahr = URKUNDE.replace('<jahrMonatTag>2026-10-01</jahrMonatTag>', '<jahr>1961</jahr>');
  const plan = V.importPlan('xpersonenstand-geburt', nurJahr);
  assert.equal(zeile(plan, 'birthDate'), undefined, 'kein Datum erfunden');
  assert.equal(zeile(plan, 'yearOfBirthIfTheExactDayIs').neuWert, '1961');
});

test('[Geschlecht] ein Code ohne Entsprechung bleibt leer', async () => {
  const { V } = await frisch();
  const plan = V.importPlan('xpersonenstand-geburt', URKUNDE.replace('<kindGeschlecht><code>w</code>', '<kindGeschlecht><code>x</code>'));
  assert.equal(zeile(plan, 'gender'), undefined);
});

test('[Abweisung] das NOOTS-Beispiel ohne XPersonenstand-Nachrichtenelement wird mit Grund abgewiesen', async () => {
  const { V } = await frisch();
  assert.equal(V.importFormatErkennen(NOOTS, 'identity'), 'xpersonenstand-geburt', 'die Datei nennt den Namensraum und wird beansprucht');
  const plan = V.importPlan('xpersonenstand-geburt', NOOTS);
  assert.equal(plan.ungueltig, true);
  assert.equal(plan.grund, 'kein-xpersonenstand-geburtsantwort');
  assert.ok(plan.ablehnungText && plan.ablehnungText.length > 20, 'ein Satz für die Person');
  assert.equal(plan.zeilen.length, 0);
});

test('[Rot-Beweis] ohne das Format im Kern fällt die Zusicherung', async () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const ANKER = "{ id: 'xpersonenstand-geburt', ";
  assert.equal(quelle.split(ANKER).length, 2, 'das Format steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xps-geburt-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(ANKER, "{ id: 'xpersonenstand-geburt-entfernt', "));
    const { V } = await frisch({ htmlPfad: pfad, backen: true });
    assert.notEqual(V.importFormatErkennen(URKUNDE, 'identity'), 'xpersonenstand-geburt');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// [D75·Wechsel] „In <Name>s Depot einlesen“ ist nur der Wechsel: der Knopf öffnet oder wechselt in das Depot der Person und liest dort ein, nicht hier.
// Er schreibt weder in die Daten der geöffneten Person noch in das andere Depot. Die Probe fährt den Knopf, wie ihn die Vorschau baut.
async function wechselKnopfDruecken(opt) {
  const { V } = await frisch(opt);
  identitaet(V, 'Anna', 'Musterfrau', '1990-04-02');
  V.ankerDaten().verwalteteDepots = [{ depotUUID: 'd-lina', inhaberin: 'Lina Marie Musterkind', umschlag: 'versiegelt' }];
  const messen = () => JSON.stringify({
    vor: V.feldRohwert('identity', 'givenName'), nach: V.feldRohwert('identity', 'familyName'), geb: V.feldRohwert('identity', 'birthDate'),
    kinder: V.feldRohwert('people', 'childrenAndDependants') || [], menschen: V.ankerDaten().menschen || [],
    depots: V.ankerDaten().verwalteteDepots,
  });
  const vorher = messen();
  const gesehen = [];
  const echtesModal = V.ui.modal, echtesToast = V.ui.toast;
  V.ui.modal = (o) => { gesehen.push(o); return () => {}; };
  V.ui.toast = () => {};
  try {
    V.flowXpsGeburtVorschau(URKUNDE);
    const vorschau = gesehen.shift();
    assert.ok(vorschau && vorschau.zweitAktion, 'die Vorschau bietet den zweiten Weg');
    assert.equal(vorschau.zweitAktion.label, 'In Lina Maries Depot einlesen');
    vorschau.zweitAktion.handler(() => {});
    await new Promise((r) => setTimeout(r, 20));
  } finally { V.ui.modal = echtesModal; V.ui.toast = echtesToast; }
  return { V, vorher, nachher: messen(), gesehen };
}

test('[D75·Wechsel] der Knopf „In Lina Maries Depot einlesen“ wechselt nur; in die geöffnete Person und in das andere Depot wird nichts geschrieben', async () => {
  const r = await wechselKnopfDruecken();
  assert.equal(r.nachher, r.vorher, 'data der geöffneten Person und das andere Depot bleiben unberührt');
  assert.equal(r.V.imSubKontext(), false, 'das andere Depot ist noch versiegelt: zuerst kommt sein Öffnen (Passwort), das Einlesen folgt dort');
  assert.equal(r.gesehen.length, 1, 'der Wechsel öffnet das Depot der Person (Passwortfrage)');
});

test('[D75·Wechsel·Rot-Beweis] schreibt der Knopf zusätzlich, ist die Probe rot', async () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const ANKER = '  flowSubKontextBetreten(depotUUID);\n  if (typeof ui !== \'undefined\' && ui.toast) ui.toast(STRINGS.importXpsImDepotDanach';
  assert.equal(quelle.split(ANKER).length, 2, 'der Wechsel-Weg steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xps-wechsel-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(ANKER, "  flowSubKontextBetreten(depotUUID);\n  xpsGeburtAlsUnterlage(\"\");\n  sektorFeldSetzen('identity', 'givenName', 'Geschrieben');\n  if (typeof ui !== 'undefined' && ui.toast) ui.toast(STRINGS.importXpsImDepotDanach"));
    const r = await wechselKnopfDruecken({ htmlPfad: pfad, backen: true });
    assert.notEqual(r.nachher, r.vorher, 'ein Knopf, der zusätzlich schreibt, fällt in der Probe auf');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
