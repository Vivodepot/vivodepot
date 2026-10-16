'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   lese-app-pruefer-geltung.test.js — die Lese-App gibt einem Sprachmodul nie eine höhere Stufe als der Kern
   ────────────────────────────────────────────────────────────────────────────
   Befund LESE-APP-PRUEFER-GELTUNG-UNGEPRUEFT (HOCH, 11.10.2026), behoben am 12.10.2026. Der Kern hält den Geltungsbereich
   der Prüfstelle und die Bindung an die Originalsätze (`_pruefstufeFuerModul`). Die Lese-App trug die Stufe allein aus dem
   Zertifikat ein: ein Sprachmodul unter einer Prüfstelle, deren Geltung es nicht trägt, bekam dort
   `extern-geprueft:pruefer` und durfte Zusicherungssätze übersetzen — die Sätze, die eine empfangende Stelle liest.

   WAS JETZT GILT, je mit Rot-Beweis:
   · die Geltung der Prüfstelle entscheidet in der Lese-App wie im Kern (`_prueferGeltung`, `_geltungPasst`, wortgleich);
   · eine Anwendung verlangt die Summe der Originalsätze für jede Sprache, die sie eingebaut führt: der Kern eine, die
     Lese-App Deutsch und Englisch (`originaleSumme.lesen.de` und `.en`);
   · die Anwendung steht in den gerechneten Bytes: eine Summe des Kerns unter „lesen“ ergibt keine Stufe;
   · KLASSE: bei gleichen genannten Summen ist die Stufe der Lese-App für dieselbe Kette und dasselbe Modul nie höher
     als die des Kerns. Die Summe selbst ist je Anwendung eine andere: ein Modul, das nur die Summen der Lese-App nennt,
     bekommt die Stufe dort und nicht im Kern. Die Bescheinigung gilt je Anwendung für deren Sätze;
   · das Werkzeug der Prüfstelle rechnet dieselbe Summe wie die Lese-App, und der Beleg im Repository nennt die Summen
     dieses Baums — eine Satzänderung, die Bescheinigungen entwertet, steht damit im Diff.

   Wegwerf-Schlüssel, der Anker kommt über `opts.ankerJwk`; nichts Echtes wird signiert. Dasselbe Bündel geht an beide Apps.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen, webcrypto, LESEN_PATH } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');
const OS = require('../tools/lib/originale-summe.js');
const { belegPruefen, BELEG } = require('../tools/originale-summen-beleg.js');

const REPO = path.join(__dirname, '..');
const JETZT = '2026-10-11T12:00:00Z';

async function edPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { pub: { kty: pub.kty, crv: pub.crv, x: pub.x, alg: 'Ed25519' }, priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
const cert = (id, typ, pub, extra) => ({
  '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
  issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
  credentialSubject: Object.assign({ anbieterId: id, anbieterName: 'Probe ' + id, anbieterTyp: typ, publicKeyJwk: pub }, extra || {}),
});

/* Die Summen beider Anwendungen, wie eine Prüfstelle sie in ihr Modul schreibt. */
async function summenBeider() {
  const K = ladeKern().V, L = ladeLesen().V;
  const lesen = (await L._originaleSummenLesen()).werte;
  return { kern: { [K._sprachBasisSprache()]: await K._originaleSummeKern() }, lesen: { de: lesen.de, en: lesen.en } };
}
/* Anker → Prüfstelle (Zwischenstufe mit `rolle: 'pruefer'` und `geltung`) → Anbieter → Sprachmodul mit einem übersetzten
   Zusicherungssatz. `geltung === undefined`: das Zwischenzertifikat nennt keinen Geltungsbereich. `summen === undefined`:
   das Modul trägt die Summen beider Anwendungen; `null`: gar keine. */
async function buendel(geltung, summen) {
  const { V } = ladeLesen();
  const sign = async (nutzlast, priv) => V._signJWS(nutzlast, await V._jwsImportSignKey(priv), {});
  const anker = await edPaar(), stelle = await edPaar(), kunde = await edPaar();
  const extra = { rolle: 'pruefer' };
  if (geltung !== undefined) extra.geltung = geltung;
  const kennung = 'strings:' + V.ZUSICHERUNGS_SCHLUESSEL_LESEN[0] + '.text';
  assert.equal(V._istZusicherungsKennung(kennung), true, 'Vorbedingung: ' + kennung + ' ist ein Zusicherungssatz');
  const modul = { modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: { [kennung]: 'A próba fordítása' } };
  const os = summen === undefined ? await summenBeider() : summen;
  if (os) modul.originaleSumme = os;
  const beleg = {
    ausstellerZertifikatJws: await sign(cert('pruefstelle/probe', 'vivodepot/pruefstelle', stelle.pub, extra), anker.priv),
    providerCredentialJws: await sign(cert('institution/probe-kunde', 'institution/probe', kunde.pub), stelle.priv),
    modulSignaturJws: await sign(modul, kunde.priv),
  };
  return { modul, beleg, opts: { jetzt: JETZT, ankerJwk: anker.pub } };
}
/* Was die Lese-App diesem Modul beim Öffnen zugesteht: die Stufe, mit der es Zusicherungssätze übersetzen darf, sonst null.
   `html`: eine veränderte Lese-App, für den Rot-Beweis. */
async function stufeLesen(b, html) {
  const { V } = ladeLesen(html ? { html } : undefined);
  const d = { textsatzModule: [Object.assign({}, b.modul, { beleg: b.beleg })] };
  await V._textsatzModuleBelegPruefen(d, b.opts);
  const info = V._textsatzModulBelegtInfo(d.textsatzModule[0]);
  return info ? info.pruefstufe : null;
}
/* Was der Kern für dieselbe Kette und dasselbe Modul entscheidet. */
async function stufeKern(b) {
  const { V } = ladeKern();
  const o = Object.assign({}, b.opts, { ausstellerZertifikatJws: b.beleg.ausstellerZertifikatJws });
  const certRes = await V.verifiziereProviderCredential(b.beleg.providerCredentialJws, o);
  assert.equal(certRes.gueltig, true, 'Vorbedingung: die Kette trägt im Kern (' + (certRes.grund || '') + ')');
  return V._pruefstufeFuerModul(certRes, b.modul, { app: 'kern', sprache: V._sprachBasisSprache(), wert: await V._originaleSummeKern() });
}

const PASSEND = Object.freeze({ modulTypen: ['textsatz'], sprachen: ['hu'] });
const NICHT_PASSEND = [
  ['ohne Geltungsbereich', undefined],
  ['andere Sprache', { modulTypen: ['textsatz'], sprachen: ['fr'] }],
  ['anderer Modultyp', { modulTypen: ['bereich'], sprachen: ['hu'] }],
  ['leere Liste', { modulTypen: [], sprachen: ['hu'] }],
  ['kein Objekt', 'alles'],
];

/* ── Die Geltung ──────────────────────────────────────────────────────────── */

test('[Lese-App·Geltung·Vorbedingung] der Kern stuft jedes dieser Bündel als extern-ungeprueft ein und nennt die Geltung als Grund', async () => {
  for (const [was, geltung] of NICHT_PASSEND) {
    const k = await stufeKern(await buendel(geltung));
    assert.equal(k.stufe, 'extern-ungeprueft', was);
    assert.match(String(k.grund), /^geltung-/, was);
  }
});

test('[Lese-App·Geltung·Befund] eine Prüfstelle, deren Geltung das Sprachmodul nicht trägt, gibt ihm in der Lese-App keine Prüfer-Stufe', async () => {
  for (const [was, geltung] of NICHT_PASSEND) {
    assert.equal(await stufeLesen(await buendel(geltung)), null, was + ': das Modul darf in der Lese-App Zusicherungssätze übersetzen');
  }
});

test('[Lese-App·Geltung·Gegenprobe] trägt die Geltung das Modul und nennt es die Summen, bekommt es in Lese-App und Kern die Prüfer-Stufe', async () => {
  const b = await buendel(PASSEND);
  assert.equal(await stufeLesen(b), 'extern-geprueft:pruefer');
  assert.deepEqual(await stufeKern(b), { stufe: 'extern-geprueft:pruefer', grund: null });
});

test('[Lese-App·Geltung·Rot-Beweis] eine Lese-App, die die Stufe wieder allein aus dem Zertifikat nimmt, gibt die Prüfer-Stufe ohne passende Geltung', async () => {
  const html = fs.readFileSync(LESEN_PATH, 'utf8');
  const neu = '_pruefstufeFuerModul(certRes, tv.nutzlast, summen).stufe';
  assert.equal(html.split(neu).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const alt = html.replace(neu, '_modulPruefstufeAusZertifikat(certRes)');
  for (const [was, geltung] of NICHT_PASSEND) {
    assert.equal(await stufeLesen(await buendel(geltung), alt), 'extern-geprueft:pruefer', was);
  }
});

/* ── Die Summen der Originalsätze ─────────────────────────────────────────── */

test('[Lese-App·Summe] die Lese-App verlangt die Summe für beide Sprachen, die sie eingebaut führt', async () => {
  const L = ladeLesen().V;
  assert.deepEqual([...L.ORIGINALE_SPRACHEN_LESEN], ['de', 'en']);
  const voll = await summenBeider();
  assert.match(voll.lesen.de, /^[0-9a-f]{64}$/); assert.match(voll.lesen.en, /^[0-9a-f]{64}$/);
  assert.notEqual(voll.lesen.de, voll.lesen.en);
  const ohne = (sprache) => ({ kern: voll.kern, lesen: Object.assign({}, voll.lesen, { [sprache]: undefined }) });
  const falsch = (sprache) => ({ kern: voll.kern, lesen: Object.assign({}, voll.lesen, { [sprache]: '0'.repeat(64) }) });
  const faelle = [
    ['gar keine Summen', null],
    ['nur die Summen des Kerns', { kern: voll.kern }],
    ['Deutsch fehlt', ohne('de')], ['Englisch fehlt', ohne('en')],
    ['Deutsch weicht ab', falsch('de')], ['Englisch weicht ab', falsch('en')],
    ['die zwei Sprachen vertauscht', { kern: voll.kern, lesen: { de: voll.lesen.en, en: voll.lesen.de } }],
  ];
  for (const [was, summen] of faelle) assert.equal(await stufeLesen(await buendel(PASSEND, summen)), null, was);
});

test('[Lese-App·Summe·Rot-Beweis] eine Summe des Kerns unter „lesen“ ergibt keine Stufe — auch bei gleicher Satzmenge', async () => {
  const K = ladeKern().V, L = ladeLesen().V;
  const voll = await summenBeider();
  const kernSumme = Object.values(voll.kern)[0];
  assert.equal(await stufeLesen(await buendel(PASSEND, { kern: voll.kern, lesen: { de: kernSumme, en: kernSumme } })), null);
  // Gepflanzte Gleichheit: dieselben Sätze, dieselbe Sprache, dieselben Schlüssel in beiden Rechnungen. Die Form des Kerns
  // { sprache, saetze } und die der Lese-App { app, sprache, saetze } ergeben trotzdem verschiedene Summen.
  const texte = {};
  for (const k of L.ZUSICHERUNGS_SCHLUESSEL_LESEN) texte[k] = 'Satz ' + k;
  const inKernForm = OS.summe(Object.fromEntries(Object.entries(texte).map(([k, v]) => ['strings:' + k + '.text', v])), 'de', L.ZUSICHERUNGS_SCHLUESSEL_LESEN);
  assert.notEqual(await L._originaleSummeLesen('de', texte), inKernForm, 'die Anwendung steht in den gerechneten Bytes');
  assert.equal(typeof K._originaleSummeKern, 'function');
});

test('[Lese-App·Summe·Werkzeug] das Werkzeug der Prüfstelle rechnet je Sprache dieselbe Summe wie die Lese-App', async () => {
  const L = ladeLesen().V;
  const ausBaum = OS.originaleSummenAusBaum(REPO);
  for (const sprache of OS.LESE_SPRACHEN) assert.equal(ausBaum.lesen[sprache], await L._originaleSummeLesen(sprache), sprache);
  assert.deepEqual([...OS.LESE_SPRACHEN], [...L.ORIGINALE_SPRACHEN_LESEN]);
  // Positivkontrolle: das Werkzeug liest die Sätze wirklich. Ein geänderter Satz ändert die Summe genau dieser Sprache.
  const leseText = fs.readFileSync(LESEN_PATH, 'utf8');
  const schluessel = OS.zusicherungsSchluesselLesen(leseText);
  assert.ok(schluessel.length > 10, 'die Zusicherungs-Schlüssel der Lese-App sind gelesen');
  const de = OS.satztabelleLesen(leseText, 'de');
  assert.equal(typeof de[schluessel[0]], 'string', 'der erste Zusicherungssatz steht in der deutschen Satztabelle');
  const geaendert = Object.assign({}, de, { [schluessel[0]]: de[schluessel[0]] + ' ' });
  assert.notEqual(OS.summeLesen(geaendert, 'de', schluessel), ausBaum.lesen.de);
});

test('[Lese-App·Summe·Beleg] der Beleg im Repository nennt die Summen dieses Baums — Rot-Beweis: ein geänderter Satz fällt auf', () => {
  const p = belegPruefen(REPO);
  assert.equal(p.gleich, true, BELEG + ' weicht ab: ein Zusicherungssatz oder ein Schlüssel hat sich geändert. Das entwertet Bescheinigungen; mit Absicht: node tools/originale-summen-beleg.js --schreiben');
  const beleg = JSON.parse(p.ist);
  for (const app of ['kern', 'lesen']) for (const sprache of ['de', 'en']) assert.match(beleg[app][sprache], /^[0-9a-f]{64}$/, app + '.' + sprache);
  // Rot-Beweis ohne den Baum anzufassen: derselbe Vergleich gegen einen Beleg mit einer anderen Summe.
  const kaputt = p.ist.replace(beleg.lesen.en, 'f'.repeat(64));
  assert.notEqual(kaputt, p.soll);
});

/* ── Klasse: nie höher als der Kern ───────────────────────────────────────── */

const RANG = { 'extern-ungeprueft': 0, 'extern-geprueft': 1, intern: 2 };
const rang = (stufe) => RANG[String(stufe).split(':')[0]];

test('[Lese-App·Klasse] bei gleichen genannten Summen ist die Stufe der Lese-App für dieselbe Kette und dasselbe Modul nie höher als die des Kerns, über alle Stufenregeln', async () => {
  const K = ladeKern().V, L = ladeLesen().V;
  const voll = await summenBeider();
  const summenK = { app: 'kern', sprache: K._sprachBasisSprache(), wert: await K._originaleSummeKern() };
  const summenL = await L._originaleSummenLesen();
  const TREUHAND = { ausstellerAnbieterTyp: 'vivodepot/ausgabestelle', ausstellerAnbieterId: 'vivodepot-ausgabestelle' };
  const ketten = [
    ['ohne Zwischenstufe, Institution', { nutzlast: { credentialSubject: { anbieterTyp: 'institution/x' } } }],
    ['ohne Zwischenstufe, Kern', { nutzlast: { credentialSubject: { anbieterTyp: 'vivodepot/kern' } } }],
    ['fremde Zwischenstufe', { ausstellerAnbieterTyp: 'vivodepot/institution', ausstellerAnbieterId: 'institution-x', ausstellerRolle: 'herausgeber', nutzlast: { credentialSubject: { anbieterTyp: 'institution/x' } } }],
    ['eigene Treuhand, Herausgeber-Blatt', Object.assign({}, TREUHAND, { nutzlast: { credentialSubject: { anbieterTyp: 'vivodepot/vorlagen', anbieterId: 'vivodepot-vorlagen' } } })],
    ['fremde Ausgabestelle mit Prüfer-Blatt', { ausstellerAnbieterTyp: 'vivodepot/ausgabestelle', ausstellerAnbieterId: 'fremde-stelle', nutzlast: { credentialSubject: { rolle: 'pruefer', anbieterTyp: 'pruefstelle/probe' } } }],
  ];
  for (const [was, geltung] of [['passend', PASSEND], ...NICHT_PASSEND]) {
    ketten.push(['Prüfstelle als Zwischenstufe, Geltung ' + was, { ausstellerAnbieterTyp: 'vivodepot/pruefstelle', ausstellerAnbieterId: 'pruefstelle-x', ausstellerRolle: 'pruefer', ausstellerGeltung: geltung, nutzlast: { credentialSubject: { anbieterTyp: 'institution/x' } } }]);
    const cs = { rolle: 'pruefer', anbieterTyp: 'pruefstelle/probe', anbieterId: 'pruefstelle-probe' };
    if (geltung !== undefined) cs.geltung = geltung;
    ketten.push(['Prüfer unter der Treuhand, Geltung ' + was, Object.assign({}, TREUHAND, { nutzlast: { credentialSubject: cs } })]);
  }
  const module = [
    ['Sprachmodul mit beiden Summen', { modulTyp: 'textsatz', sprache: 'hu', originaleSumme: voll }],
    ['Sprachmodul mit falscher Lese-Summe', { modulTyp: 'textsatz', sprache: 'hu', originaleSumme: { kern: voll.kern, lesen: { de: voll.lesen.de, en: '0'.repeat(64) } } }],
    ['Sprachmodul nur mit Kern-Summe', { modulTyp: 'textsatz', sprache: 'hu', originaleSumme: { kern: voll.kern } }],
    ['Bereichsmodul', { modulTyp: 'bereich' }],
  ];
  let verglichen = 0, pruefer = 0;
  for (const gueltig of [true, false]) for (const [wasK, kette] of ketten) for (const [wasM, modul] of module) {
    const certRes = Object.assign({ gueltig }, kette);
    const k = K._pruefstufeFuerModul(certRes, modul, summenK), l = L._pruefstufeFuerModul(certRes, modul, summenL);
    assert.ok(rang(l.stufe) !== undefined && rang(k.stufe) !== undefined, 'bekannte Stufen: ' + l.stufe + ' / ' + k.stufe);
    assert.ok(rang(l.stufe) <= rang(k.stufe), wasK + ' · ' + wasM + ' · gültig ' + gueltig + ': Lese-App ' + l.stufe + ', Kern ' + k.stufe);
    verglichen++; if (l.stufe === 'extern-geprueft:pruefer') pruefer++;
  }
  assert.equal(verglichen, 2 * ketten.length * module.length);
  assert.ok(pruefer > 0, 'Positivkontrolle: die Klasse besteht nicht, weil die Lese-App nie eine Prüfer-Stufe gibt');
});

test('[Lese = Kern·Geltung] _prueferGeltung und _geltungPasst antworten in Kern und Lese-App gleich — Rot-Beweis je entfernter Regel', () => {
  const K = ladeKern().V, L = ladeLesen().V;
  const plain = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
  const geltungen = [undefined, null, 'alles', {}, PASSEND, { modulTypen: [], sprachen: ['hu'] }, { modulTypen: ['textsatz'], sprachen: 'hu' },
    { modulTypen: ['textsatz'], sprachen: ['fr'] }, { modulTypen: ['bereich'], sprachen: ['hu'] }, { modulTypen: ['textsatz', ' '], sprachen: ['hu'] }];
  const module = [null, { modulTyp: 'textsatz', sprache: 'hu' }, { modulTyp: 'textsatz' }, { modulTyp: 'bereich', sprache: 'hu' }];
  for (const g of geltungen) for (const m of module) assert.deepEqual(plain(L._geltungPasst(g, m)), plain(K._geltungPasst(g, m)), JSON.stringify([g, m]));
  const TREUHAND = { ausstellerAnbieterTyp: 'vivodepot/ausgabestelle', ausstellerAnbieterId: 'vivodepot-ausgabestelle' };
  const ketten = [
    null,
    { ausstellerRolle: 'pruefer', ausstellerGeltung: PASSEND, nutzlast: { credentialSubject: {} } },
    { ausstellerRolle: 'pruefer', nutzlast: { credentialSubject: {} } },
    { ausstellerRolle: 'herausgeber', ausstellerGeltung: PASSEND, nutzlast: { credentialSubject: {} } },
    Object.assign({}, TREUHAND, { nutzlast: { credentialSubject: { rolle: 'pruefer', anbieterTyp: 'pruefstelle/probe', geltung: PASSEND } } }),
    Object.assign({}, TREUHAND, { nutzlast: { credentialSubject: { rolle: 'pruefer', anbieterTyp: 'vivodepot/vorlagen', geltung: PASSEND } } }),
    { ausstellerAnbieterTyp: 'vivodepot/ausgabestelle', ausstellerAnbieterId: 'fremde-stelle', nutzlast: { credentialSubject: { rolle: 'pruefer', anbieterTyp: 'pruefstelle/probe', geltung: PASSEND } } },
  ];
  for (const c of ketten) assert.deepEqual(plain(L._prueferGeltung(c)), plain(K._prueferGeltung(c)), JSON.stringify(c));
  // Rot-Beweis: je eine Regel der Lese-App entfernt — die Probe sieht den Unterschied zum Kern.
  const html = fs.readFileSync(LESEN_PATH, 'utf8');
  const regeln = [
    ["  if (typeof modul.sprache === 'string' && !geltung.sprachen.includes(modul.sprache)) return { passt: false, grund: 'geltung-sprache' };\n", [{ modulTypen: ['textsatz'], sprachen: ['fr'] }, { modulTyp: 'textsatz', sprache: 'hu' }]],
    ["  if (!modul || !geltung.modulTypen.includes(modul.modulTyp)) return { passt: false, grund: 'geltung-modultyp' };\n", [{ modulTypen: ['bereich'], sprachen: ['hu'] }, { modulTyp: 'textsatz', sprache: 'hu' }]],
  ];
  for (const [zeile, [g, m]] of regeln) {
    assert.equal(html.split(zeile).length, 2, 'Vorbedingung: die Regel steht genau einmal in der Lese-App: ' + zeile.trim());
    const ohne = ladeLesen({ html: html.replace(zeile, '') }).V;
    assert.notDeepEqual(plain(ohne._geltungPasst(g, m)), plain(K._geltungPasst(g, m)), zeile.trim());
  }
});
