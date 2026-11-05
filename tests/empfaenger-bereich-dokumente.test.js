'use strict';
/* Befund DOKUMENTE-NICHT-IM-BEREICHSTEIL (21.10.2026): Ein Teil aus Bereichsbausteinen trug kein einziges Dokument. Der
   Zuschnitt (empfaengerZuschnittModell) gab `mappe` und `dokumente` nur mit dem weiten Baustein frei, obwohl jeder
   Mappe-Eintrag seinen Bereich trägt (`bereich`) und jeder Dokument-Datensatz seinen (`sektorId`). Gesehen an der Demo
   „Schwerbehindertenausweis“: Ilse gibt Sabine den Gesundheitsbereich, die drei Befunde blieben zurück.
   Seit dem Nachtrag zu U2-ADR-156 vom 21.10.2026 trägt ein Bereichsbaustein die Dokumente seines Bereichs, mit demselben
   Sensibel-Filter wie die Felder. Der QR-Weg trägt keine Dateien und keine Dokument-Datensätze. Das Fach in der Datei der
   Inhaberin öffnet eine nach Bereich gefilterte Mappe weiterhin nicht (Wächter vom 20.10.2026, tests/fach-ganze-einheiten.test.js);
   das bleibt Stufe 2. Die Probe am Demo-Szenario (P6) steht gesondert, solange die Demos drinnen bleiben. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'Bereich-Dokumente-2026!';
const PW_FACH = 'Bereich-Dokumente-Fach-2026!';
const KERN = path.join(__dirname, '..', 'vivodepot.html');
const AUSGANG_ZEILE = '    subset.mappe = subset.mappe.filter((m) => !(m && m.sensibel === true));\n';
// Der Sensibel-Filter des Bereichsbausteins steht im Zuschnitt (empfaengerZuschnittModell), die Sammlung in empfaengerBereichsDokumente.
const FILTER_ZEILE = '      bereichsDokumente.sammeln(baustein.bereich, (e) => !(sensibelFilter && e.sensibel === true));\n';
const pdf = (marke) => 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 ' + marke).toString('base64');

function fuellen(d) {
  d.sektoren.identity = { givenName: 'Ilse', familyName: 'Muster' };
  d.sektoren.health = { chronicConditionsDiagnoses: 'Arthrose' };
  d.sektoren.finance = { taxSoftware: 'Steuer' };
  d.mappe = [
    { id: 'm-herz', beschriftung: 'MARKER-BEFUND-HERZ', bereich: 'health', mime: 'application/pdf', inhalt: pdf('HERZ'), sensibel: false },
    { id: 'm-steuer', beschriftung: 'MARKER-STEUERBESCHEID', bereich: 'finance', mime: 'application/pdf', inhalt: pdf('STEUER'), sensibel: false },
    { id: 'm-allg', beschriftung: 'MARKER-ALLGEMEIN', bereich: 'allgemein', mime: 'application/pdf', inhalt: pdf('ALLG'), sensibel: false },
    { id: 'm-psych', beschriftung: 'MARKER-SENSIBEL', bereich: 'health', mime: 'application/pdf', inhalt: pdf('PSYCH'), sensibel: true },
    { id: 'm-scan', beschriftung: 'MARKER-SCAN-OHNE-BEREICH', bereich: 'allgemein', mime: 'application/pdf', inhalt: pdf('SCAN'), sensibel: false },
  ];
  d.dokumente = [
    { id: 'd-reha', typ: 'reha', name: 'MARKER-DOK-REHA', sektorId: 'health', mappeRef: { ref: 'm-scan', override: null }, felder: [], sensibel: false },
    { id: 'd-konto', typ: 'konto', name: 'MARKER-DOK-KONTO', sektorId: 'finance', mappeRef: null, felder: [], sensibel: false },
  ];
}

async function depot(opts) {
  const { V } = ladeKern(opts);
  await V.depotAnlegen(PW);
  const d = V.getData();
  fuellen(d);
  V.setData(d);
  return V;
}
const kreisGesundheit = { id: 'k-ges', name: 'Tochter', bausteine: ['bereich:identity', 'bereich:health'] };
const ids = (liste) => (Array.isArray(liste) ? liste.map((e) => e.id).sort() : []);

test('[Bereich·Dokumente·P1] ein Bereichsbaustein trägt die Mappe-Einträge seines Bereichs samt Datei, keine aus anderen Bereichen', async () => {
  const V = await depot();
  const z = V.empfaengerZuschnittModell(kreisGesundheit);
  const herz = (z.mappe || []).find((m) => m.id === 'm-herz');
  assert.ok(herz, 'der Gesundheitsbefund steht im Zuschnitt');
  assert.equal(herz.inhalt, pdf('HERZ'), 'mit seiner Datei');
  assert.ok(!ids(z.mappe).includes('m-steuer'), 'kein Eintrag aus Finanzen');
  assert.ok(!ids(z.mappe).includes('m-allg'), 'kein Eintrag ohne Bereich');
});

test('[Bereich·Dokumente·P2] ein sensibler Eintrag bleibt beim Bereichsbaustein zurück und geht mit dem Erbfall mit', async () => {
  const V = await depot();
  assert.ok(!ids(V.empfaengerZuschnittModell(kreisGesundheit).mappe).includes('m-psych'), 'Bereichsbaustein: sensibel bleibt draußen');
  const weit = V.empfaengerBausteineAlle().find((b) => b.weit);
  assert.ok(weit, 'Kontrolle: es gibt einen weiten Baustein');
  assert.ok(ids(V.empfaengerZuschnittModell({ id: 'k-erbe', name: 'Erbe', bausteine: [weit.id] }).mappe).includes('m-psych'),
    'weiter Baustein: weit heißt weit (U2-ADR-156 §3)');
});

/* Zwei Filter halten den sensiblen Eintrag: der im Bereich und der am Ausgang (P7). Der Rot-Beweis nimmt beide. */
test('[Bereich·Dokumente·P2·Rot-Beweis] ohne die Sensibel-Filter trägt der Bereichsbaustein den sensiblen Eintrag', async () => {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.equal(html.split(FILTER_ZEILE).length, 2, 'der Filter steht nicht mehr an seinem Ort, die Probe muss nachgezogen werden');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bereich-dokumente-'));
  try {
    const ohne = path.join(dir, 'vivodepot.html');
    assert.equal(html.split(AUSGANG_ZEILE).length, 2, 'der Filter am Ausgang steht nicht mehr an seinem Ort');
    fs.writeFileSync(ohne, html.replace(FILTER_ZEILE, '      bereichsDokumente.sammeln(baustein.bereich, () => true);\n').replace(AUSGANG_ZEILE, ''));
    const V = await depot({ htmlPfad: ohne, backen: true });
    assert.ok(ids(V.empfaengerZuschnittModell(kreisGesundheit).mappe).includes('m-psych'), 'ohne Filter sieht die Probe den Befund');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Die Lesestelle im Bereich allein (Grundlinie der direkten Lesungen, wie SEC-029 subset.mappe): ohne den Filter am Ausgang
   hält sie den sensiblen Eintrag zurück. Die Gegenseite ist der Rot-Beweis darüber — ohne beide Filter erscheint er. */
test('[Bereich·Dokumente·P2·Bereichsfilter] ohne den Filter am Ausgang lässt der Filter im Bereich den sensiblen Eintrag allein zurück', async () => {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.equal(html.split(AUSGANG_ZEILE).length, 2, 'der Filter am Ausgang steht nicht mehr an seinem Ort');
  assert.equal(html.split(FILTER_ZEILE).length, 2, 'der Filter im Bereich steht nicht mehr an seinem Ort');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bereich-dokumente-'));
  try {
    const ohne = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(ohne, html.replace(AUSGANG_ZEILE, ''));
    const V = await depot({ htmlPfad: ohne, backen: true });
    const mappe = ids(V.empfaengerZuschnittModell(kreisGesundheit).mappe);
    assert.ok(mappe.includes('m-herz'), 'Kontrolle: der Bereich trägt seine Einträge');
    assert.ok(!mappe.includes('m-psych'), 'der Filter im Bereich hält den sensiblen Eintrag zurück');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Bereich·Dokumente·P3] ein Dokument-Datensatz des Bereichs geht mit, samt der Datei, auf die er verweist', async () => {
  const V = await depot();
  const z = V.empfaengerZuschnittModell(kreisGesundheit);
  assert.deepEqual(ids(z.dokumente), ['d-reha'], 'nur der Datensatz aus Gesundheit');
  assert.ok(ids(z.mappe).includes('m-scan'), 'seine Datei aus „allgemein“ kommt über mappeRef mit');
});

test('[Bereich·Dokumente·P4] der QR-Code trägt weder Dateien noch Dokument-Datensätze und bleibt in seiner Grenze', async () => {
  const V = await depot();
  await V.empfaengerkreisSetzen({ name: 'Tochter', bausteine: ['bereich:identity', 'bereich:health'] });
  const kreis = V.empfaengerkreiseListe()[0];
  const { inhalt, zuGross } = await V.empfaengerQrPayloadBauen(kreis, PW_FACH);
  assert.equal(inhalt.mappe, undefined, 'keine Mappe im QR');
  assert.equal(inhalt.dokumente, undefined, 'keine Dokument-Datensätze im QR');
  assert.equal(zuGross, false, 'die Grenze eines Codes hält');
  assert.ok(ids(V.empfaengerZuschnittModell(kreis).mappe).includes('m-herz'), 'Kontrolle: die Datei des Kreises trägt den Befund');
});

test('[Bereich·Dokumente·P5] das Fach in der Datei der Inhaberin öffnet eine nach Bereich gefilterte Mappe nicht', async () => {
  const V = await depot();
  await V.empfaengerkreisSetzen({ name: 'Tochter', bausteine: ['bereich:identity', 'bereich:health'] });
  const kreis = V.empfaengerkreiseListe()[0];
  assert.ok(ids(V.empfaengerZuschnittModell(kreis).mappe).includes('m-herz'), 'Kontrolle: der Zuschnitt trägt den Befund');
  await V.empfaengerkreisFachEinrichten(kreis, PW_FACH);
  const datei = JSON.parse(JSON.stringify(await V.depotSerialisierenV4()));
  const { V: F } = ladeKern();
  await F.depotLaden(datei, PW_FACH);
  const fach = F.getData();
  assert.ok(!ids(fach.mappe).includes('m-steuer'), 'das Fach öffnet keinen Eintrag eines anderen Bereichs');
  assert.ok(!ids(fach.dokumente).includes('d-konto'), 'und keinen Datensatz eines anderen Bereichs');
});

/* Befund VERWEIS-ZIEHT-SENSIBLE-DATEI (21.10.2026, HOCH, Nebenfund aus der Prüfung der Anlagen in der Antwort): ein Verweisfeld
   (`ref:mappe`) zog die Datei, auf die es zeigt, auch eine sensibel markierte, in einen engen Zuschnitt (verweisZieleNachziehen).
   Die Probe gilt der Klasse: JEDER enge Baustein, bei einem Depot, in dem jeder Bereich auf die sensible Datei verweist. */
async function depotMitVerweisen(opts) {
  const V = await depot(opts);
  const d = V.getData();
  for (const s of V.bereicheAlle()) d.sektoren[s.id] = Object.assign({}, d.sektoren[s.id], { verweisAufDatei: { ref: 'm-psych' } });
  d.sektoren.identity.profilePhotoCoverPage = { ref: 'm-psych' };
  V.setData(d);
  return V;
}
const engeMitSensiblerDatei = (V) => V.empfaengerBausteineAlle().filter((b) => !b.weit)
  .filter((b) => ids(V.empfaengerZuschnittModell({ id: 'k-' + b.id, name: 'k', bausteine: [b.id] }).mappe).includes('m-psych'))
  .map((b) => b.id);

test('[Bereich·Dokumente·P7·Klasse] kein enger Baustein zieht über einen Verweis eine sensible Datei nach', async () => {
  const V = await depotMitVerweisen();
  assert.ok(V.empfaengerBausteineAlle().filter((b) => !b.weit).length >= 10, 'Kontrolle: es gibt enge Bausteine');
  assert.deepEqual(engeMitSensiblerDatei(V), []);
  const weit = V.empfaengerBausteineAlle().find((b) => b.weit);
  assert.ok(ids(V.empfaengerZuschnittModell({ id: 'k-w', name: 'Erbe', bausteine: [weit.id] }).mappe).includes('m-psych'), 'weit heißt weit');
});

test('[Bereich·Dokumente·P7·Rot-Beweis] ohne den Filter am Ausgang zieht ein Verweis die sensible Datei in den engen Zuschnitt', async () => {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.equal(html.split(AUSGANG_ZEILE).length, 2, 'der Filter am Ausgang steht nicht mehr an seinem Ort, die Probe muss nachgezogen werden');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bereich-verweis-'));
  try {
    const ohne = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(ohne, html.replace(AUSGANG_ZEILE, ''));
    const V = await depotMitVerweisen({ htmlPfad: ohne, backen: true });
    assert.ok(engeMitSensiblerDatei(V).includes('bereich:identity'), 'ohne Filter sieht die Probe den Befund');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
