'use strict';
/* ═══════════════════════════════════════════════════════════
   Wer in einen ruhenden Bereich schreibt, sieht ihn in derselben Sitzung (U2-ADR-160-Nachtrag)
   ───────────────────────────────────────────────────────────
   Ein Pro-Kern zeigt die Bürger-Bereiche nicht (U2-ADR-348). Sie stehen im Katalog. Bis zum
   09.11.2026 verwarfen die Einleser ihre Werte, und ein Schreibweg trug Werte ein, die erst nach
   dem nächsten Öffnen zu sehen waren.

   Geprüft wird am gebackenen Pro-Kern:
     - je Einleseweg: Bereich ruht, nach dem Einlesen steht er da, der Wert ist im Datensatz und
       in der gezeichneten Ansicht. vCard schreibt nach `identity`, das in Pro nie ruht: Dort
       zählt, dass die Werte ankommen.
     - je Schreibweg ohne Einlesen: dasselbe.
     - Gegenproben: Abbruch, leerer Wert, Bereich außerhalb des Katalogs, Privat.
     - die direkten Schreibstellen auf `data.sektoren`: eine neue fällt rot.

   Rot-Beweis, eingebaut: an einer Kernkopie werden die Weckungen und der Parser-Wächter
   zurückgenommen, die Fälle fallen.
   ═══════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const fixture = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8');
const KERN = path.join(__dirname, '..', 'vivodepot.html');
const VCARD = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ada Probe\r\nN:Probe;Ada;;;\r\nTEL:+49301234567\r\nEND:VCARD\r\n';

const IPS = JSON.stringify({ resourceType: 'Bundle', type: 'document', entry: [
  { resource: { resourceType: 'AllergyIntolerance', code: { text: 'Beispielallergen' } } },
] });

const EINLESEN = [
  { name: 'camt.053', format: 'camt053', text: () => fixture('camt053.example.xml'), bereich: 'finance', wert: 'DE89370400440532013000' },
  { name: 'ELSTER', format: 'elster', text: () => fixture('elster.example.json'), bereich: 'finance', wert: 'Finanzamt München Abt. III' },
  { name: 'IPS', format: 'fhir-ips', text: () => IPS, bereich: 'health', wert: 'Beispielallergen' },
];

async function proKern(htmlPfad) {
  const { V, document } = ladeKern(Object.assign({ produkt: 'pro-de', backen: true, zusatzBindungen: ['_ruhendImportZuruecksetzen', 'listenEintragHinzufuegen', '_ruhendeZieleWecken'] }, htmlPfad ? { htmlPfad } : {}));
  await V.basisVorlagenVerifizieren();
  await V.depotAnlegen('pro-weckung-pw');
  V.akteurSelbstErklaeren('Probe');
  return { V, document };
}
const gezeigt = (V, id) => V.bereicheAlle().map((s) => s.id).includes(id);
function einlesen(V, fall) {
  const plan = V.importPlan(fall.format, fall.text());
  assert.equal(plan.ungueltig, false, fall.name + ': Vorbedingung, die Datei ist lesbar');
  V.importAnwenden(plan, { alleKonflikte: true });
}
function ansicht(V, document, id) {
  V.renderSektor(id);
  return document.getElementById('content').innerHTML;
}

for (const fall of EINLESEN) {
  test('[Weckung·Einlesen] ' + fall.name + ': der ruhende Bereich steht nach dem Einlesen da, mit Wert', async () => {
    const { V, document } = await proKern();
    assert.equal(gezeigt(V, fall.bereich), false, 'Vorbedingung: der Bereich ruht');
    einlesen(V, fall);
    assert.equal(gezeigt(V, fall.bereich), true, 'der Bereich steht nicht da');
    assert.ok(JSON.stringify(V.getData().sektoren[fall.bereich]).includes(fall.wert), 'der Wert ist nicht im Datensatz');
    assert.ok(ansicht(V, document, fall.bereich).includes(fall.wert), 'der Wert steht nicht in der Ansicht');
  });
}

test('[Weckung·Einlesen] vCard: die Werte kommen an, identity ruht in Pro nie', async () => {
  const { V, document } = await proKern();
  assert.equal(gezeigt(V, 'identity'), true, 'Vorbedingung: identity steht da');
  einlesen(V, { name: 'vCard', format: 'vcard-identitaet', text: () => VCARD });
  assert.ok(JSON.stringify(V.getData().sektoren.identity).includes('Ada'), 'der Wert ist nicht im Datensatz');
  assert.ok(ansicht(V, document, 'identity').includes('Ada'), 'der Wert steht nicht in der Ansicht');
});

test('[Weckung·Schreiben] sektorFeldSetzen weckt in derselben Sitzung', async () => {
  const { V, document } = await proKern();
  V.sektorFeldSetzen('finance', 'companyPensionSchemeBav', 'Beispielkasse');
  assert.equal(gezeigt(V, 'finance'), true);
  assert.ok(ansicht(V, document, 'finance').includes('Beispielkasse'));
});

test('[Weckung·Schreiben] kernAPI.schreibBereich weckt in derselben Sitzung', async () => {
  const { V, document } = await proKern();
  V.kernAPI.schreibBereich('finance', { companyPensionSchemeBav: 'Beispielkasse' });
  assert.equal(gezeigt(V, 'finance'), true);
  assert.ok(ansicht(V, document, 'finance').includes('Beispielkasse'));
});

test('[Weckung·Schreiben] ein neuer Listeneintrag weckt in derselben Sitzung', async () => {
  const { V } = await proKern();
  V.__zusatz.listenEintragHinzufuegen('finance', 'accounts', { iban: 'DE89370400440532013000' });
  assert.equal(gezeigt(V, 'finance'), true);
});

test('[Weckung·Kennung] eine Kennung im ruhenden Bereich gilt, eine außerhalb des Katalogs bleibt unbekannt', async () => {
  const { V } = await proKern();
  assert.equal(gezeigt(V, 'health'), false, 'Vorbedingung: der Bereich ruht');
  assert.equal(V.kennungPruefen('health.insuranceNumber').ok, true, 'ein ruhender Bereich fehlt nicht');
  assert.deepEqual([V.kennungPruefen('gibtsnicht.feld').grund, V.kennungPruefen('gibtsnicht.feld').teil], ['unbekannt', 'bereich']);
});

test('[Weckung·Gegenprobe] ein Abbruch der Vorschau nimmt die Weckung zurück und schreibt nichts', async () => {
  const { V } = await proKern();
  V.importPlan('camt053', fixture('camt053.example.xml'));
  assert.equal(gezeigt(V, 'finance'), true, 'die Vorschau zeigt die Felder');
  V.__zusatz._ruhendImportZuruecksetzen();
  assert.equal(gezeigt(V, 'finance'), false);
  assert.ok(!JSON.stringify(V.getData().sektoren.finance || {}).includes('DE89'));
});

test('[Weckung·Gegenprobe] ein leerer Wert weckt nicht', async () => {
  const { V } = await proKern();
  V.sektorFeldSetzen('finance', 'companyPensionSchemeBav', '');
  assert.equal(gezeigt(V, 'finance'), false);
});

test('[Weckung·Gegenprobe] ein Bereich außerhalb des Katalogs bleibt draußen', async () => {
  const { V } = await proKern();
  assert.equal(V.__zusatz._ruhendeZieleWecken([{ sektorId: 'gibtsnicht' }]), false);
  assert.equal(gezeigt(V, 'gibtsnicht'), false);
});

test('[Weckung·Kennung] eine Kennung im ruhenden Bereich steht in „fehlend“ und verschwindet nicht', async () => {
  const { V } = await proKern();
  assert.equal(gezeigt(V, 'finance'), false, 'Vorbedingung: der Bereich ruht');
  const z = V.zusammenstellungDatensatz(['finance.companyPensionSchemeBav']);
  assert.ok(z.fehlend.map((f) => f.kennung || f).includes('finance.companyPensionSchemeBav'), 'nicht in fehlend: ' + JSON.stringify(z));
});

test('[Weckung·Gegenprobe] Privat: abgewählter Bereich bleibt weggelassen, Kennung und Einlesen eingeschlossen', async () => {
  const { V } = ladeKern();
  await V.basisVorlagenVerifizieren();
  await V.depotAnlegen('privat-weckung-pw');
  const d = V.getData();
  d.bereichssatz = ['identity', 'health'];
  V.setData(d);
  assert.equal(V.kennungPruefen('finance.companyPensionSchemeBav').grund, 'unbekannt');
  const plan = V.importPlan('camt053', fixture('camt053.example.xml'));
  assert.ok(plan.ungueltig || !(plan.listen || []).some((l) => l.sektorId === 'finance'), 'U2-ADR-160: Weglassen, nicht Umbelegen');
  assert.equal(gezeigt(V, 'finance'), false);
  const erbfall = V.anlassDatensatz('erbfall', {});
  assert.ok(erbfall && Array.isArray(erbfall.fehlend), 'Vorbedingung: der Anlass liefert fehlend');
  assert.deepEqual(erbfall.fehlend.map((f) => f.bereich).filter((b) => b === 'finance'), [], 'ein abgewählter Bereich taucht unter „fehlend“ nicht auf');
});

test('[Weckung·Gegenprobe] Privat: der Bereichssatz der Datei bleibt, wie er ist', async () => {
  const { V } = ladeKern();
  await V.basisVorlagenVerifizieren();
  await V.depotAnlegen('privat-weckung-pw');
  V.akteurSelbstErklaeren('Probe');
  const d = V.getData();
  d.bereichssatz = ['identity', 'health'];
  V.setData(d);
  const vorher = V.bereicheAlle().map((s) => s.id);
  assert.ok(!vorher.includes('finance'), 'Vorbedingung: finance steht nicht im Bereichssatz');
  V.sektorFeldSetzen('finance', 'companyPensionSchemeBav', 'Beispielkasse');
  assert.deepEqual(V.bereicheAlle().map((s) => s.id), vorher);
});

/* ── Die Ratsche: jede direkte Schreibstelle ist bekannt, und die Wege, die Werte eintragen, wecken ── */
const ERLAUBT = ['_listeOder', 'schreibBereich', 'sektorFeldSetzen'];
const MUSS_WECKEN = ['schreibBereich', 'sektorFeldSetzen', 'listenEintragHinzufuegen', 'eintraegeZusammenfuehren'];
const KOPF = /^(?:async )?function ([\w$]+)\(|^ {2}([\w$]+)\([^)]*\) \{$/gm;
function stuecke(quelle) {
  const k = [...quelle.matchAll(KOPF)];
  return k.map((m, i) => ({ name: m[1] || m[2], text: quelle.slice(m.index, i + 1 < k.length ? k[i + 1].index : quelle.length) }));
}
function schreibStellen(quelle) {
  const muster = /data\.sektoren\[[a-zA-Z_.]+\](\[[a-zA-Z_.]+\])? = /;
  return [...new Set(stuecke(quelle).filter((s) => muster.test(s.text)).map((s) => s.name))].sort();
}
const ohneWecken = (quelle) => stuecke(quelle).filter((s) => MUSS_WECKEN.includes(s.name) && !s.text.includes('_nachSchreibenWecken(')).map((s) => s.name);

test('[Weckung·Ratsche] die direkten Schreibstellen sind genau die bekannten, und die Schreibwege wecken', () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  assert.deepEqual(schreibStellen(quelle), ERLAUBT, 'neue direkte Schreibstelle: über `_nachSchreibenWecken` wecken und hier eintragen');
  assert.deepEqual(ohneWecken(quelle), []);
});

test('[Weckung·Ratsche·Rot-Beweis] eine neue Schreibstelle und eine fehlende Weckung werden gemeldet', () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  assert.ok(schreibStellen(quelle + '\nfunction neuerWeg(a) {\n  data.sektoren[a] = {};\n}\n').includes('neuerWeg'));
  const ohne = quelle.replace('  data.sektoren[sektorId][feldId] = wert;\n  _nachSchreibenWecken(sektorId);\n', '  data.sektoren[sektorId][feldId] = wert;\n');
  assert.notEqual(ohne, quelle, 'die Zeile in sektorFeldSetzen hat sich geändert, der Rot-Beweis prüft nichts mehr');
  assert.deepEqual(ohneWecken(ohne), ['sektorFeldSetzen']);
});

/* ── Rot-Beweis an einer Kernkopie ── */
function kernKopie(ersetzungen) {
  let html = fs.readFileSync(KERN, 'utf8');
  for (const [alt, neu] of ersetzungen) {
    assert.ok(html.includes(alt), 'die Stelle hat sich geändert, der Rot-Beweis prüft nichts mehr: ' + alt);
    html = html.replace(alt, neu);
  }
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-weckung-'));
  const pfad = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(pfad, html);
  return { pfad, weg: () => fs.rmSync(ordner, { recursive: true, force: true }) };
}

/* Die Messung der Eingabewege bestätigt keine Einlese-Vorschau und nimmt sie darum nach jedem Schritt
   zurück. Eine bestätigte Weckung steht in den Daten und muss das überstehen, sonst zählte die Messung einen echten Eingabeweg nicht. */
test('[Weckung·Bestätigt] ein bestätigtes Einlesen übersteht das Zurücknehmen der Vorschau', async () => {
  const { V } = await proKern();
  einlesen(V, EINLESEN[0]);
  V.__zusatz._ruhendImportZuruecksetzen();
  assert.equal(gezeigt(V, 'finance'), true);
});

test('[Weckung·Bestätigt·Rot-Beweis] ohne die Weckung über die Daten fällt der Bereich mit der Vorschau weg', async () => {
  const k = kernKopie([['function _ruhendeBereichIds(quelle) {\n', 'function _ruhendeBereichIds(quelle) {\n  return [];\n']]);
  try {
    const { V } = await proKern(k.pfad);
    einlesen(V, EINLESEN[0]);
    V.__zusatz._ruhendImportZuruecksetzen();
    assert.equal(gezeigt(V, 'finance'), false);
  } finally { k.weg(); }
});

test('[Weckung·Rot-Beweis] ohne die Weckungen bleibt der Bereich nach Einlesen und Schreiben verborgen', async () => {
  const k = kernKopie([
    ['function _nachSchreibenWecken(sektorId) {\n', 'function _nachSchreibenWecken(sektorId) {\n  return false;\n'],
    ['function _ruhendeZieleWecken(eintraege) {\n', 'function _ruhendeZieleWecken(eintraege) {\n  return false;\n'],
  ]);
  try {
    for (const fall of EINLESEN) {
      const { V } = await proKern(k.pfad);
      einlesen(V, fall);
      assert.equal(gezeigt(V, fall.bereich), false, fall.name);
    }
    const { V } = await proKern(k.pfad);
    V.kernAPI.schreibBereich('finance', { companyPensionSchemeBav: 'Beispielkasse' });
    assert.equal(gezeigt(V, 'finance'), false, 'schreibBereich');
  } finally { k.weg(); }
});

test('[Weckung·Rot-Beweis] vCard: ohne den Wächter auf den Katalog kommt nichts an', async () => {
  const k = kernKopie([["  if (!_bereichGefuehrt(ZIEL)) return [];\n  const out = [];\n  const push = (feldId, w) => { if (w != null", '  return [];\n  const out = [];\n  const push = (feldId, w) => { if (w != null']]);
  try {
    const { V } = await proKern(k.pfad);
    const plan = V.importPlan('vcard-identitaet', VCARD);
    V.importAnwenden(plan, { alleKonflikte: true });
    assert.ok(!JSON.stringify(V.getData().sektoren.identity || {}).includes('Ada'));
  } finally { k.weg(); }
});
