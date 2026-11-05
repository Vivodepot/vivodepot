'use strict';
/* Forschungsentscheidungen und Datenspende nach dem Tod (U2-ADR-518, 02.11.2026).
   Zwei Bausteine: die Liste `health.researchDecisions` (acht Unterfelder) und fünf Unterfelder der Zeile „Patientenverfügung“ in
   `advanceCare.provisionInstruments`, direkt nach der Organspende. Geprüft:
     1. die Liste mit genau diesen Unterfeldern und Optionen, alle sensibel, Ebene wie `operationsProcedures`;
     2. die fünf Vorsorge-Felder an ihrer Stelle, alle sensibel, nur bei `living-will` (bzw. nach der Wahl darüber), keines mit
        Ebene `kern` (dieselbe Ebene wie `organDonation`), die Vertrauensperson als Personen-Verweis;
     3. keines der Felder auf der Notfall-Allowlist und keines im FHIR-IPS-Export, auch mit Freigabe der sensiblen Felder;
     4. die Hinweise in DE und EN, in allen vier Produkten, mit dem Kernsatz zur gesetzlichen Krankenversicherung;
     5. der Zweitknopf der Liste in DE und EN.
     6. an beiden Vorsorge-Hinweisen der erste Satz sichtbar, der Rest hinter dem Aufklapper „Mehr zur Rechtslage“ (Gestaltungsleitung).
   Die Felddefinitionen liest die Probe aus dem Kern (privat-de), die Bereichsvorlagen selbst nicht.
   Rot-Beweis: auf dem Stand vor dem Bau (7d43429ac) fehlen Liste, Felder und Texte; die Proben zu Liste, Vorsorge, Sichtbarkeit,
   Texten, Hinweis und Zweitknopf sind dort rot. Die zwei Ausschluss-Proben (Notfall, IPS) halten den Ausschluss für später fest;
   ihr Rot-Beweis steht unten, mit einem erfundenen Eintrag.
   Die Hinweistexte nennen einen voraussichtlichen Liefertermin und einen Gesetzentwurf; ihr Stand kommt wieder vor:
   @rechtslage datenspende-nach-dem-tod-hinweis */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const lies = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));
const DE = lies('tools/textsatz-de-modul.json').texte;
const EN = lies('tools/textsatz-en-modul.json').texte;

let _kern = null;
const kern = () => (_kern = _kern || ladeKern());
const felder = (sektorId) => kern().V.SEKTOREN.find((s) => s.id === sektorId).sektionen.flatMap((s) => s.felder || []);
const werte = (f) => (f.optionen || []).map((o) => o.wert);
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const UNTERFELDER = [['kind', 'auswahl'], ['institution', 'text'], ['declaredOn', 'datum'], ['scope', 'mehrfachauswahl'],
  ['validUntil', 'datum'], ['storedUntil', 'text'], ['withdrawalRoute', 'textarea'], ['status', 'auswahl']];
const OHNE_WIDERSPRUCH = { feld: 'kind', wert: ['epa-objection', 'ehds-objection'] };
const FUENF = ['postMortemDataDonation', 'postMortemDataDonationScope', 'postMortemDataDonationExcluded', 'postMortemDataDonationTrustee',
  'postMortemDataHolders'];
const SPUR = 'Spurstelle-ZETA-518';

/* Jeder Wächter für eine Klausel von U2-ADR-518 ruft eine Funktion, die die Verstöße als Liste liefert, und verlangt die leere Liste. */
function listeVerstoesse(l, op) {
  if (!l) return ['die Liste health.researchDecisions fehlt'];
  const v = [];
  if (l.typ !== 'liste') v.push('typ ist ' + l.typ);
  if (l.sensibel !== true) v.push('die Liste ist nicht sensibel');
  if (l.ebene !== op.ebene) v.push('Ebene ' + l.ebene + ' statt ' + op.ebene + ' (wie operationsProcedures)');
  if (!gleich((l.unterFelder || []).map((u) => [u.id, u.typ]), UNTERFELDER)) v.push('Unterfelder: ' + JSON.stringify((l.unterFelder || []).map((u) => [u.id, u.typ])));
  for (const u of l.unterFelder || []) if (u.sensibel !== true) v.push(u.id + ' ist nicht sensibel');
  const u = (id) => (l.unterFelder || []).find((x) => x.id === id) || {};
  if (!gleich(werte(u('kind')), ['broad-consent', 'study', 'biobank', 'epa-objection', 'ehds-objection', 'data-donation-app', 'other'])) v.push('Optionen kind');
  if (!gleich(werte(u('scope')), ['data', 'biosamples', 'recontact', 'third-countries'])) v.push('Optionen scope');
  if (!gleich(werte(u('status')), ['valid', 'partly-withdrawn', 'withdrawn'])) v.push('Optionen status');
  if (u('declaredOn').keineZukunft !== true) v.push('declaredOn ohne keineZukunft');
  for (const id of ['scope', 'validUntil', 'storedUntil']) if (!gleich(u(id).verborgenWenn, OHNE_WIDERSPRUCH)) v.push(id + ': nicht verborgen bei einem Widerspruch');
  if (!gleich(l.zusammenfassungFelder, ['kind', 'institution', 'status'])) v.push('zusammenfassungFelder');
  if (l.marken !== undefined) v.push('die Marke laeuftAb kommt in einem eigenen Schritt');
  return v;
}
function vorsorgeVerstoesse(unterFelder) {
  const v = [];
  const ids = unterFelder.map((u) => u.id);
  const i = ids.indexOf('organDonationRegister');
  if (!gleich(ids.slice(i + 1, i + 6), FUENF)) v.push('nicht direkt nach organDonationRegister: ' + ids.slice(i + 1, i + 6).join(', '));
  const u = (id) => unterFelder.find((x) => x.id === id) || {};
  const organ = u('organDonation');
  for (const id of FUENF) {
    if (u(id).sensibel !== true) v.push(id + ' ist nicht sensibel');
    if (u(id).ebene === 'kern') v.push(id + ' steht im Kern');
    if (u(id).ebene !== organ.ebene) v.push(id + ': Ebene ' + u(id).ebene + ' statt der Ebene der Organspende');
  }
  const soll = {
    postMortemDataDonation: ['auswahl', { feld: 'instrument', wert: 'living-will' }, ['ja', 'teil', 'nein', 'vertrauensperson']],
    postMortemDataDonationScope: ['textarea', { feld: 'postMortemDataDonation', wert: 'teil' }, []],
    postMortemDataDonationExcluded: ['mehrfachauswahl', { feld: 'postMortemDataDonation', wert: ['ja', 'teil'] }, ['companies', 'third-countries']],
    postMortemDataDonationTrustee: ['ref', { feld: 'postMortemDataDonation', wert: 'vertrauensperson' }, []],
    postMortemDataHolders: ['textarea', { feld: 'postMortemDataDonation', wert: ['ja', 'teil', 'vertrauensperson'] }, []],
  };
  for (const [id, [typ, sw, opt]] of Object.entries(soll)) {
    if (u(id).typ !== typ) v.push(id + ': typ ' + u(id).typ);
    if (!gleich(u(id).sichtbarWenn, sw)) v.push(id + ': sichtbarWenn ' + JSON.stringify(u(id).sichtbarWenn));
    if (!gleich(werte(u(id)), opt)) v.push(id + ': Optionen ' + JSON.stringify(werte(u(id))));
  }
  if (u('postMortemDataDonationTrustee').entitaet !== 'person') v.push('die Vertrauensperson ist kein Personen-Verweis');
  // Das zweite Tor: wechselt das Instrument, verschwinden die Folgefelder mit der Datenspende selbst.
  const ausserPv = { feld: 'instrument', wert: werte(u('instrument')).filter((w) => w !== 'living-will') };
  for (const id of FUENF.slice(1)) if (!gleich(u(id).verborgenWenn, ausserPv)) v.push(id + ': nicht verborgen bei einem anderen Instrument');
  return v;
}
function notfallVerstoesse(allowlist) {
  return allowlist.map((e) => e.sektor + ':' + e.feld).filter((n) => /researchDecisions|postMortem/.test(n)).map((n) => 'auf der Notfall-Allowlist: ' + n);
}
function ipsVerstoesse(bundleText) {
  const v = [];
  if (bundleText.includes(SPUR)) v.push('ein Wert der neuen Felder steht im IPS-Export');
  const m = bundleText.match(/researchDecisions|postMortemData\w*/);
  if (m) v.push('eine Kennung der neuen Felder steht im IPS-Export: ' + m[0]);
  return v;
}
const A = 'advanceCare.provisionInstruments/postMortemDataDonation.hint';
const C = 'health.researchDecisions.hint';
const B = 'advanceCare.provisionInstruments/postMortemDataHolders.hint';
function hinweisVerstoesse(de, en) {
  const v = [];
  const soll = [
    [de[A], /^Hier halten Sie fest, ob Ihre Gesundheitsdaten nach Ihrem Tod der Forschung dienen sollen\./, 'DE A: Anfang'],
    [de[A], /Wenn Sie gesetzlich versichert sind, gelangt ein Teil Ihrer Daten schon nach dem Gesetz in die Forschung\./, 'DE A: gesetzlich versichert'],
    [de[A], /Ihre Angabe hier ersetzt diesen Widerspruch nicht\.$/, 'DE A: ersetzt den Widerspruch nicht'],
    [en[A], /^Here you record whether your health data should be used for research after your death\./, 'EN A: Anfang'],
    [en[A], /If you have statutory health insurance, the law itself already provides for part of your data to go to research\./, 'EN A: statutory health insurance'],
    [en[A], /Your entry here does not replace this objection\.$/, 'EN A: does not replace'],
    [de[B], /§ 630g Abs\. 3 BGB/, 'DE B: § 630g'], [de[B], /§ 344 Abs\. 6 SGB V/, 'DE B: § 344'],
    [en[B], /section 630g \(3\) of the German Civil Code/, 'EN B: section 630g'], [en[B], /section 344 \(6\) of Social Code Book V/, 'EN B: section 344'],
    [de[C], /^Wenn Sie gesetzlich versichert sind, können die Daten Ihrer elektronischen Patientenakte /, 'DE C: gesetzlich versichert'],
    [en[C], /^If you have statutory health insurance, the data in your electronic patient record \(ePA\) can be used /, 'EN C: statutory health insurance'],
  ];
  for (const [text, re, name] of soll) if (typeof text !== 'string' || !re.test(text)) v.push(name);
  // Frühere Entwürfe dürfen nicht stehen: „keine bekannte Stelle“ trug nicht, und § 630g BGB spricht von der Behandlungsakte.
  if (/keine bekannte Stelle/.test(de[A] || '')) v.push('DE A: „keine bekannte Stelle“');
  if (/Einsicht in die Patientenakte/.test(de[B] || '')) v.push('DE B: „Patientenakte“ statt „Behandlungsakte“');
  return v;
}
/* Aufklapper (Gestaltungsleitung, 02.11.2026): an beiden Vorsorge-Hinweisen steht nur der erste Satz, der Rest hinter „Mehr zur Rechtslage“.
   Der Wortlaut bleibt der eine Text unter `.hint` (hinweisVerstoesse prüft ihn ganz); hier: welcher Satz sichtbar ist und dass die
   gezeichneten Teile zusammen genau diesen Text ergeben. Mechanismus und eigene Probe: tests/feld-hinweis-aufklapper.test.js. */
const ERSTER_SATZ = {
  de: { postMortemDataDonation: 'Hier halten Sie fest, ob Ihre Gesundheitsdaten nach Ihrem Tod der Forschung dienen sollen.',
    postMortemDataHolders: 'Nach Ihrem Tod können Ihre Erben und Ihre nächsten Angehörigen unter bestimmten Voraussetzungen Einsicht in die Behandlungsakte bei Praxen und Kliniken verlangen, wenn Ihr Wille dem nicht entgegensteht (§ 630g Abs. 3 BGB).' },
  en: { postMortemDataDonation: 'Here you record whether your health data should be used for research after your death.',
    postMortemDataHolders: 'After your death, your heirs and your closest relatives are, under certain conditions, entitled to inspect your medical records held by practices and hospitals, unless this is against your wishes (section 630g (3) of the German Civil Code, BGB).' },
};
const AUFKLAPPER = { de: 'Mehr zur Rechtslage', en: 'More on the legal position' };
function aufklapperVerstoesse(sprache, html, texte, ent) {
  const v = [];
  for (const id of ['postMortemDataDonation', 'postMortemDataHolders']) {
    const zeile = new RegExp('<div class="feld-zeile feld-zeile-sub" data-sub-zeile="' + id + '"[^>]*>([\\s\\S]*?)(?=<div class="feld-zeile feld-zeile-sub"|$)').exec(html);
    const m = zeile && /<div class="feld-hint" id="[^"]+">([^<]*)<\/div><details class="feld-hint feld-hint-mehr"><summary>([^<]*)<\/summary><p>([^<]*)<\/p><\/details>/.exec(zeile[1]);
    if (!m) { v.push(sprache + ' ' + id + ': kein Aufklapper'); continue; }
    if (m[1] !== ent(ERSTER_SATZ[sprache][id])) v.push(sprache + ' ' + id + ': sichtbar ist nicht der erste Satz');
    if (m[2] !== ent(AUFKLAPPER[sprache])) v.push(sprache + ' ' + id + ': Beschriftung ' + m[2]);
    if (m[1] + ' ' + m[3] !== ent(texte['advanceCare.provisionInstruments/' + id + '.hint'])) v.push(sprache + ' ' + id + ': sichtbar und aufgeklappt ergeben nicht den geprüften Wortlaut');
  }
  return v;
}
const KOPPLUNG = { PROBEN: [
  { fuer: '[U2-ADR-518·Liste] health.researchDecisions: acht Unterfelder, Typen, Optionen, alle sensibel, Ebene wie operationsProcedures', diskriminante: listeVerstoesse },
  { fuer: '[U2-ADR-518·Vorsorge] fünf Felder direkt nach organDonationRegister, sensibel, nur bei living-will, keines mit Ebene kern', diskriminante: vorsorgeVerstoesse },
  { fuer: '[U2-ADR-518·IPS] mit Freigabe der sensiblen Felder: weder Forschungsentscheidung noch Datenspende im FHIR-IPS-Export', diskriminante: ipsVerstoesse },
  { fuer: '[U2-ADR-518·Hinweis] Datenspende und Datenorte: der geprüfte Wortlaut, DE und EN, mit dem Satz zur gesetzlichen Krankenversicherung', diskriminante: hinweisVerstoesse },
  { fuer: '[U2-ADR-518·Hinweis·Aufklapper] Datenspende und Datenorte: erster Satz sichtbar, der Rest hinter „Mehr zur Rechtslage“, DE und EN', diskriminante: aufklapperVerstoesse },
] };
void KOPPLUNG;

test('[U2-ADR-518·Liste] health.researchDecisions: acht Unterfelder, Typen, Optionen, alle sensibel, Ebene wie operationsProcedures', () => {
  const f = felder('health');
  assert.deepEqual(listeVerstoesse(f.find((x) => x.id === 'researchDecisions'), f.find((x) => x.id === 'operationsProcedures')), []);
});

test('[U2-ADR-518·Vorsorge] fünf Felder direkt nach organDonationRegister, sensibel, nur bei living-will, keines mit Ebene kern', () => {
  assert.deepEqual(vorsorgeVerstoesse(felder('advanceCare').find((f) => f.id === 'provisionInstruments').unterFelder), []);
});

test('[U2-ADR-518·Vorsorge·Rot-Beweis] ein Feld mit Ebene kern und ein nicht sensibles fallen auf', () => {
  const uf = felder('advanceCare').find((f) => f.id === 'provisionInstruments').unterFelder
    .map((u) => (u.id === 'postMortemDataHolders' ? Object.assign({}, u, { ebene: 'kern' }) : u.id === 'postMortemDataDonationScope' ? Object.assign({}, u, { sensibel: false })
      : u.id === 'postMortemDataDonationTrustee' ? Object.assign({}, u, { verborgenWenn: undefined }) : u));
  const v = vorsorgeVerstoesse(uf);
  assert.ok(v.includes('postMortemDataHolders steht im Kern'), JSON.stringify(v));
  assert.ok(v.includes('postMortemDataDonationScope ist nicht sensibel'), JSON.stringify(v));
  assert.ok(v.includes('postMortemDataDonationTrustee: nicht verborgen bei einem anderen Instrument'), JSON.stringify(v));
});

test('[U2-ADR-518·Sichtbar] im Kern: die Datenspende nur in der Zeile „Patientenverfügung“, die Folgefelder nach der Wahl', () => {
  const { V } = kern();
  const pi = felder('advanceCare').find((f) => f.id === 'provisionInstruments');
  const k = (id) => pi.unterFelder.find((u) => u.id === id);
  for (const id of FUENF) assert.ok(k(id), id + ' fehlt im Kern');
  assert.equal(V.feldSichtbar(k('postMortemDataDonation'), { instrument: 'living-will' }), true);
  for (const instr of ['enduring-power-of-attorney', 'will', 'custodianship-declaration']) {
    assert.equal(V.feldSichtbar(k('postMortemDataDonation'), { instrument: instr }), false, 'nicht bei ' + instr);
  }
  assert.equal(V.feldSichtbar(k('postMortemDataDonationTrustee'), { instrument: 'living-will', postMortemDataDonation: 'ja' }), false);
  assert.equal(V.feldSichtbar(k('postMortemDataDonationTrustee'), { instrument: 'living-will', postMortemDataDonation: 'vertrauensperson' }), true);
  assert.equal(V.feldSichtbar(k('postMortemDataHolders'), { instrument: 'living-will', postMortemDataDonation: 'nein' }), false);
  const h = felder('health').find((f) => f.id === 'researchDecisions');
  assert.ok(h, 'health.researchDecisions fehlt im Kern');
  const scope = h.unterFelder.find((u) => u.id === 'scope');
  assert.equal(V.feldSichtbar(scope, { kind: 'epa-objection' }), false);
  assert.equal(V.feldSichtbar(scope, { kind: 'broad-consent' }), true);
});

test('[U2-ADR-518·Sichtbar·Instrument] nach dem Umstellen des Instruments bleibt keines der Folgefelder stehen', () => {
  const { V } = kern();
  const pi = felder('advanceCare').find((f) => f.id === 'provisionInstruments');
  const instrumentarten = werte(pi.unterFelder.find((u) => u.id === 'instrument'));
  const folge = ['postMortemDataDonationScope', 'postMortemDataDonationExcluded', 'postMortemDataDonationTrustee', 'postMortemDataHolders'];
  const wahl = { postMortemDataDonationScope: 'teil', postMortemDataDonationExcluded: 'ja', postMortemDataDonationTrustee: 'vertrauensperson', postMortemDataHolders: 'ja' };
  assert.equal(V.feldSichtbar(pi.unterFelder.find((u) => u.id === 'postMortemDataHolders'), { instrument: 'will', postMortemDataDonation: 'ja' }), false);
  for (const id of folge) {
    const u = pi.unterFelder.find((x) => x.id === id);
    for (const instr of instrumentarten) {
      assert.equal(V.feldSichtbar(u, { instrument: instr, postMortemDataDonation: wahl[id] }), instr === 'living-will', id + ' bei ' + instr);
    }
  }
});

test('[U2-ADR-518·Ereignis] die Vertrauensperson der Datenspende reagiert auf Familienstand und Tod', async () => {
  const { V } = ladeKern();
  const e = V.EREIGNIS_ACHSE_FELDER.find((x) => x.feldId === 'provisionInstruments' && x.unterFeldId === 'postMortemDataDonationTrustee');
  assert.ok(e && !e.ausgenommen, 'die Vertrauensperson ist verdrahtet, nicht ausgenommen');
  assert.deepEqual(e.ereignisse.slice().sort(), ['familienstand', 'tod']);
  await V.depotAnlegen('adr518-ereignis-pw');
  V.akteurSelbstErklaeren('Tester');
  const pid = V.personHinzufuegen({ name: 'Vertrauensperson Probe' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'living-will', postMortemDataDonation: 'vertrauensperson', postMortemDataDonationTrustee: { ref: pid } });
  const zeilenId = V.getData().sektoren.advanceCare.provisionInstruments[0].id;
  for (const typ of ['familienstand', 'tod']) {
    assert.deepEqual(V._ereignisBetroffeneZeilenIds(pid, typ).map((z) => z.sektorId + '.' + z.feldId + '.' + z.zeilenId),
      ['advanceCare.provisionInstruments.' + zeilenId], typ + ' greift');
  }
  assert.deepEqual(V._ereignisBetroffeneZeilenIds(pid, 'betreuung'), [], 'betreuung greift nicht');
  assert.equal(V.ereignisMarkieren('tod', pid, new Date()).length, 1, 'der Tod der Vertrauensperson markiert die Patientenverfügung');
});

test('[U2-ADR-518·Notfall] keines der Felder steht auf der Notfall-Allowlist', () => {
  assert.deepEqual(notfallVerstoesse(kern().V.NOTFALL_KERN_FELDER), []);
  // Rot-Beweis: ein erfundener Eintrag fällt auf.
  assert.equal(notfallVerstoesse([{ sektor: 'health', feld: 'researchDecisions' }]).length, 1);
});

test('[U2-ADR-518·IPS] mit Freigabe der sensiblen Felder: weder Forschungsentscheidung noch Datenspende im FHIR-IPS-Export', () => {
  const { V } = ladeKern();
  V.setData({
    sektoren: {
      identity: { givenName: 'Maria', familyName: 'Mustermann', birthDate: '1950-03-07' },
      health: { bloodType: 'A+', researchDecisions: [{ kind: 'broad-consent', institution: SPUR, status: 'valid', withdrawalRoute: SPUR }] },
      advanceCare: { provisionInstruments: [{ id: 'p1', instrument: 'living-will', organDonation: 'ja', postMortemDataDonation: 'teil',
        postMortemDataDonationScope: SPUR, postMortemDataHolders: SPUR, dateOfLastChange: '2026-10-01' }] },
    },
  });
  assert.deepEqual(ipsVerstoesse(JSON.stringify(V.fhirIpsBundle(new Date('2026-11-02T10:00:00Z'), { sensibel: true }))), []);
  // Rot-Beweis: derselbe Prüfer erkennt einen durchgereichten Wert.
  assert.equal(ipsVerstoesse('{"note":"' + SPUR + '"}').length, 1);
});

const KENNUNGEN = [
  'health.researchDecisions.label', 'health.researchDecisions.hint', 'health.researchDecisions.weitererEintrag',
  ...UNTERFELDER.map(([u]) => 'health.researchDecisions/' + u + '.label'),
  'health.researchDecisions/withdrawalRoute.hint',
  ...['broad-consent', 'study', 'biobank', 'epa-objection', 'ehds-objection', 'data-donation-app', 'other'].map((w) => 'health.researchDecisions/kind/' + w + '.label'),
  ...['data', 'biosamples', 'recontact', 'third-countries'].map((w) => 'health.researchDecisions/scope/' + w + '.label'),
  ...['valid', 'partly-withdrawn', 'withdrawn'].map((w) => 'health.researchDecisions/status/' + w + '.label'),
  ...FUENF.map((u) => 'advanceCare.provisionInstruments/' + u + '.label'),
  A, B,
  ...['ja', 'teil', 'nein', 'vertrauensperson'].map((w) => 'advanceCare.provisionInstruments/postMortemDataDonation/' + w + '.label'),
  ...['companies', 'third-countries'].map((w) => 'advanceCare.provisionInstruments/postMortemDataDonationExcluded/' + w + '.label'),
];

test('[U2-ADR-518·Texte] jede Kennung in DE und EN; Pro liest dieselben Texte wie Privat', async () => {
  for (const [sprache, t] of [['de', DE], ['en', EN]]) {
    const fehlt = KENNUNGEN.filter((k) => typeof t[k] !== 'string' || !t[k].trim());
    assert.deepEqual(fehlt, [], sprache + ': fehlende Texte');
  }
  for (const [produkt, t] of [['pro-de', DE], ['pro-en', EN]]) {
    const K = await ladeKern({ produkt });
    const W = K.V || K;
    for (const k of KENNUNGEN) assert.equal(W.textLesen(k), t[k], produkt + ' weicht ab: ' + k);
  }
});

test('[U2-ADR-518·Hinweis] Datenspende und Datenorte: der geprüfte Wortlaut, DE und EN, mit dem Satz zur gesetzlichen Krankenversicherung', () => {
  assert.deepEqual(hinweisVerstoesse(DE, EN), []);
});

test('[U2-ADR-518·Hinweis·Rot-Beweis] ohne den Satz zur gesetzlichen Krankenversicherung und mit „Patientenakte“ rot', () => {
  const de = Object.assign({}, DE, {
    [A]: String(DE[A]).replace('Wenn Sie gesetzlich versichert sind, ', ''),
    [B]: String(DE[B]).replace('Einsicht in die Behandlungsakte', 'Einsicht in die Patientenakte'),
    [C]: String(DE[C]).replace('Wenn Sie gesetzlich versichert sind, können die Daten', 'Die Daten'),
  });
  const v = hinweisVerstoesse(de, EN);
  assert.ok(v.includes('DE C: gesetzlich versichert'), JSON.stringify(v));
  assert.ok(v.includes('DE A: gesetzlich versichert'), JSON.stringify(v));
  assert.ok(v.includes('DE B: „Patientenakte“ statt „Behandlungsakte“'), JSON.stringify(v));
});

test('[U2-ADR-518·Hinweis·Aufklapper] Datenspende und Datenorte: erster Satz sichtbar, der Rest hinter „Mehr zur Rechtslage“, DE und EN', async () => {
  for (const [produkt, sprache, texte] of [['privat-de', 'de', DE], ['privat-en', 'en', EN]]) {
    const K = await ladeKern({ produkt });
    const W = K.V || K;
    const pi = W.SEKTOREN.find((s) => s.id === 'advanceCare').sektionen.flatMap((s) => s.felder || []).find((f) => f.id === 'provisionInstruments');
    for (const id of ['postMortemDataDonation', 'postMortemDataHolders']) assert.equal(pi.unterFelder.find((u) => u.id === id).hinweisAufklapper, true, id);
    const html = W.listenEintragInputsHTML(pi, { instrument: 'living-will', postMortemDataDonation: 'ja' });
    assert.deepEqual(aufklapperVerstoesse(sprache, html, texte, W.escapeHTML), [], produkt);
  }
});

test('[U2-ADR-518·Hinweis·Aufklapper·Rot-Beweis] der ganze Hinweis ohne Aufklapper und ein abweichender Rest fallen auf', () => {
  const { V } = kern();
  const pi = felder('advanceCare').find((f) => f.id === 'provisionInstruments');
  const ohne = Object.assign({}, pi, { unterFelder: pi.unterFelder.map((u) => Object.assign({}, u, { hinweisAufklapper: undefined })) });
  const v = aufklapperVerstoesse('de', V.listenEintragInputsHTML(ohne, {}), DE, V.escapeHTML);
  assert.ok(v.includes('de postMortemDataDonation: kein Aufklapper') && v.includes('de postMortemDataHolders: kein Aufklapper'), JSON.stringify(v));
  const de = Object.assign({}, DE, { [A]: DE[A] + ' Erfundener Zusatz.' });
  assert.ok(aufklapperVerstoesse('de', V.listenEintragInputsHTML(pi, {}), de, V.escapeHTML).includes('de postMortemDataDonation: sichtbar und aufgeklappt ergeben nicht den geprüften Wortlaut'));
});

test('[U2-ADR-518·Zweitknopf] der Zweitknopf der Liste, DE und EN', () => {
  assert.equal(DE['health.researchDecisions.weitererEintrag'], 'Weitere Forschungsentscheidung hinzufügen');
  assert.equal(EN['health.researchDecisions.weitererEintrag'], 'Add another research decision');
});
