'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   studio-vorlage-formatfassung-typfeld.test.js — Formatfassung und Typfeld der Vorlage, Schreibseite (12.10.2026)
   ───────────────────────────────────────────────────────────────────────────
   Befund VORLAGE-FASSUNGSUNABHAENGIG-UNGEPRUEFT: eine Vorlage trug keine Angabe, in welcher Fassung ihres Formats sie
   geschrieben ist, und keine, dass sie eine Vorlage ist. Ein Leser konnte „zu neu für mich“ darum nie sagen.

   ZUGESICHERT, je mit Rot-Beweis:
     1 · Jede Vorlage, die das Studio erzeugt, trägt `nutzlastTyp` und `formatFassung` auf der obersten Ebene, auch in
         der Nutzlast, die signiert und geprüft wird (nicht nur im Paket daneben).
     2 · Genau eine Feldquelle: `felder`, nie ein zweiter Schlüssel für Felder daneben.
     3 · Kein Modul-Erzeuger schreibt `nutzlastTyp`, und kein `modulTyp` des Studios hat den Wert des Typfelds.
     4 · Das Einreich-Schema kennt beide Felder, in Studio, Ausgabestelle und Datei gleich; ohne die Felder bleibt eine
         Einreichung gültig (alle vorher signierten Vorlagen), mit falschem Wert fällt sie.
     5 · Der heutige Kern lässt eine Vorlage mit beiden Feldern ein (er prüft sie noch nicht; das Lesen ist ein
         eigener Schritt).
     6 · Die ab Werk mitgelieferten Vorlagen bleiben ohne beide Felder und haben die alte Gestalt (`felder`, kein
         `modulTyp`): an ihr erkennt ein Leser sie als Vorlage der Fassung 1.

   NICHT HIER: der Leser (was ein Kern mit einer höheren Fassung tut) und die Stelle, die Einreichungen gegenzeichnet.
   Die ausgelieferten älteren Kerne sind nicht Teil dieser Probe.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const rein = (x) => JSON.parse(JSON.stringify(x));
const lies = (...teile) => fs.readFileSync(path.join(REPO, ...teile), 'utf8');
const BEISPIEL = JSON.parse(lies('docs', 'template-generator', 'beispiel-submission.json'));
const SCHEMA_DATEI = JSON.parse(lies('docs', 'template-generator', 'submission-schema.json'));
const TYP = 'vivodepot-vorlage';
const FELD = { feldname: 'Aufnahmedatum', feldtyp: 'datum', bereich: 'health' };

/* Zustände, aus denen das Studio Vorlagen baut: von leer bis mit allen freiwilligen Angaben. */
const ZUSTAENDE = [
  ['nur Felder', { felder: [FELD] }],
  ['mit Kennung, Inhaltsstand und Ablauf', { felder: [FELD], vorlageId: 'aufnahme', version: 7, gueltigBis: '2030-01-01' }],
  ['mit Wortlaut', { felder: [FELD], wortlaut: 'Erfundener Wortlaut.', wortlautQuelle: { behoerde: 'Erfundene Stelle', titel: 'Erfundener Titel', lizenz: 'frei erfunden' } }],
  ['mit Widerruf', { felder: [FELD], vorlageId: 'aufnahme', version: 8, widerruf: { grund: 'Erfundener Grund.' } }],
  ['ohne Zustand', undefined],
];

/* Welche Schlüssel einer Vorlage Felder tragen könnten: `felder` und alles, was so heißt wie eine zweite Feldliste. */
const feldquellen = (vorlage) => Object.keys(vorlage).filter((k) => /^felder/i.test(k) || /feld(er|liste)$/i.test(k));

test('[Studio·Vorlage·Fassung] jede Vorlage aus dem Studio trägt Typfeld und Formatfassung auf der obersten Ebene und genau eine Feldquelle', () => {
  const { V } = ladeGenerator();
  assert.deepEqual([V.VORLAGE_NUTZLAST_TYP, V.VORLAGE_FORMAT_FASSUNG], [TYP, 1]);
  for (const [name, zustand] of ZUSTAENDE) {
    const vorlage = rein(V.baueTemplateObjekt(zustand).template);
    assert.equal(vorlage.nutzlastTyp, TYP, name);
    assert.equal(vorlage.formatFassung, 1, name);
    assert.ok(Number.isInteger(vorlage.formatFassung) && vorlage.formatFassung >= 1, name);
    assert.deepEqual(feldquellen(vorlage), ['felder'], name + ': genau eine Feldquelle');
    assert.ok(!Object.prototype.hasOwnProperty.call(vorlage, 'modulTyp'), name + ': eine Vorlage trägt kein modulTyp');
    // Formatfassung ist nicht der Inhaltsstand: beide stehen nebeneinander und unabhängig.
    if (zustand && zustand.version) assert.deepEqual([vorlage.version, vorlage.formatFassung], [zustand.version, 1], name);
  }
  // Über beide Wege, auf denen eine Einreichung entsteht: jede Vorlage darin.
  const sammel = rein(V.baueSammelSubmission(ZUSTAENDE.map(([, z]) => z || {}), { anbieter: BEISPIEL.anbieter, publicKeyJwk: BEISPIEL.publicKeyJwk }));
  assert.equal(sammel.templates.length, ZUSTAENDE.length);
  for (const v of sammel.templates) assert.deepEqual([v.nutzlastTyp, v.formatFassung], [TYP, 1]);
  assert.deepEqual([rein(V.baueSubmission({ felder: [FELD] })).templates[0].nutzlastTyp], [TYP]);
});

test('[Studio·Vorlage·Fassung·signiert] beide Felder stehen in der Nutzlast, die signiert und geprüft wird, und die Einreichung besteht das Schema beider Seiten', async () => {
  const { V } = ladeGenerator();
  const { V: ISS } = ladeIssuer();
  const paar = await V.erzeugeSchluesselpaarRoh();
  const stamm = { anbieter: BEISPIEL.anbieter, publicKeyJwk: paar.publicJwk };
  const paket = await V.baueSammelSubmissionSigniert([ZUSTAENDE[0][1], ZUSTAENDE[1][1]], stamm, paar.privateJwk);
  const verifyKey = await V._jwsImportVerifyKey(paar.publicJwk);
  assert.equal(paket.templatesJws.length, 2);
  for (let i = 0; i < paket.templatesJws.length; i++) {
    const p = await V._verifyJWS(paket.templatesJws[i], verifyKey, {});
    assert.equal(p.gueltig, true, 'Vorlage ' + i);
    const nutzlast = rein(p.nutzlast);
    assert.deepEqual([nutzlast.nutzlastTyp, nutzlast.formatFassung], [TYP, 1], 'Vorlage ' + i + ': in der geprüften Nutzlast');
    assert.deepEqual(nutzlast, rein(paket.templates[i]), 'Vorlage ' + i + ': die signierte Nutzlast ist die Vorlage im Paket');
    // Die Felder stehen in den signierten Bytes selbst, nicht in der Hülle der Signatur.
    const [kopf, mitte] = paket.templatesJws[i].split('.');
    assert.ok(Buffer.from(mitte, 'base64url').toString('utf8').includes('"nutzlastTyp":"' + TYP + '"'));
    assert.ok(!Buffer.from(kopf, 'base64url').toString('utf8').includes('nutzlastTyp'));
  }
  const klar = rein(paket);
  // Der Schema-Prüfer gibt die Liste der Fehler zurück; leer heißt gültig.
  assert.deepEqual(rein(V.validiereSubmission(klar)), [], 'Studio-Schema');
  assert.deepEqual(rein(ISS._validateSchema(ISS.SUBMISSION_SCHEMA, klar)), [], 'Schema der Ausgabestelle');
  // Rot-Beweis: wer ein Feld nach dem Signieren entfernt oder ändert, bricht die Signatur.
  const [kopf0, mitte0, sig0] = paket.templatesJws[0].split('.');
  for (const [name, aendern] of [['Typfeld entfernt', (v) => { delete v.nutzlastTyp; }], ['Fassung gehoben', (v) => { v.formatFassung = 2; }], ['Typfeld umgeschrieben', (v) => { v.nutzlastTyp = 'modul'; }]]) {
    const anders = JSON.parse(Buffer.from(mitte0, 'base64url').toString('utf8')); aendern(anders);
    const gefaelscht = [kopf0, Buffer.from(JSON.stringify(anders), 'utf8').toString('base64url'), sig0].join('.');
    const p = await V._verifyJWS(gefaelscht, verifyKey, {});
    assert.notEqual(p && p.gueltig, true, name);
  }
});

test('[Studio·Vorlage·Fassung·Schema] das Einreich-Schema kennt beide Felder, an allen drei Stellen gleich; ohne sie gültig, mit falschem Wert nicht', () => {
  const { V } = ladeGenerator();
  const { V: ISS } = ladeIssuer();
  const eigenschaften = (schema) => rein(schema).properties.templates.items.properties;
  for (const [name, schema] of [['Datei', SCHEMA_DATEI], ['Studio', V.SUBMISSION_SCHEMA], ['Ausgabestelle', ISS.SUBMISSION_SCHEMA]]) {
    const e = eigenschaften(schema);
    assert.equal(e.nutzlastTyp.const, TYP, name);
    assert.deepEqual([e.formatFassung.type, e.formatFassung.minimum], ['integer', 1], name);
    const pflicht = rein(schema).properties.templates.items.required;
    assert.ok(!pflicht.includes('nutzlastTyp') && !pflicht.includes('formatFassung'), name + ': beide freiwillig, vorher signierte Vorlagen tragen sie nicht');
  }
  const gilt = (paket) => rein(V._validateSchema(V.SUBMISSION_SCHEMA, paket)).length === 0 && rein(ISS._validateSchema(ISS.SUBMISSION_SCHEMA, paket)).length === 0;
  const faellt = (paket) => rein(V._validateSchema(V.SUBMISSION_SCHEMA, paket)).length > 0 && rein(ISS._validateSchema(ISS.SUBMISSION_SCHEMA, paket)).length > 0;
  const mit = (aendern) => { const p = rein(BEISPIEL); aendern(p.templates[0]); return p; };
  assert.equal(gilt(rein(BEISPIEL)), true, 'ohne beide Felder: die Einreichung von gestern bleibt gültig');
  assert.ok(!('nutzlastTyp' in BEISPIEL.templates[0]) && !('formatFassung' in BEISPIEL.templates[0]), 'das Beispiel ist die alte Gestalt');
  assert.equal(gilt(mit((v) => { v.nutzlastTyp = TYP; v.formatFassung = 1; })), true, 'mit beiden Feldern');
  assert.equal(gilt(mit((v) => { v.formatFassung = 2; })), true, 'eine höhere Fassung ist am Schema keine falsche Form');
  for (const [name, aendern] of [
    ['anderer Wert', (v) => { v.nutzlastTyp = 'vorlage'; }], ['andere Schreibweise', (v) => { v.nutzlastTyp = 'Vivodepot-Vorlage'; }],
    ['Leerraum am Rand', (v) => { v.nutzlastTyp = TYP + ' '; }], ['kein Text', (v) => { v.nutzlastTyp = 1; }],
    ['Fassung 0', (v) => { v.formatFassung = 0; }], ['Fassung als Bruch', (v) => { v.formatFassung = 1.5; }],
    ['Fassung als Text', (v) => { v.formatFassung = '1'; }], ['Fassung null', (v) => { v.formatFassung = null; }],
    ['unbekannter Schlüssel daneben', (v) => { v.felderNeu = v.felder; }],
  ]) assert.equal(faellt(mit(aendern)), true, name + ': fällt an beiden Seiten');
});

test('[Studio·Vorlage·Fassung·Module] kein Modul-Erzeuger schreibt das Typfeld, und kein modulTyp hat seinen Wert', () => {
  const { V } = ladeGenerator();
  const quelle = lies('vivodepot-studio.html');
  // Im Quelltext: geschrieben wird der Schlüssel an genau einer Stelle, im Vorlagen-Erzeuger.
  const schreibstellen = quelle.split('\n').map((z, i) => [i, z]).filter(([, z]) => /\bnutzlastTyp\s*:/.test(z) && !/^\s*(\/\*|\*|\/\/|")/.test(z));
  assert.equal(schreibstellen.length, 1, 'Schreibstellen: ' + schreibstellen.map(([i]) => i + 1).join(', '));
  const ab = quelle.indexOf('function baueTemplateObjekt(');
  const bis = quelle.indexOf('\nfunction ', ab + 10);
  assert.ok(quelle.slice(ab, bis).includes('nutzlastTyp: VORLAGE_NUTZLAST_TYP'), 'die eine Stelle liegt im Vorlagen-Erzeuger');
  // Am Ergebnis: jeder Modul-Erzeuger, der sich ohne Angaben aufrufen lässt.
  const erzeuger = Object.keys(V).filter((n) => /^baue.*Modul$/.test(n) || n === 'baueAnfrage').sort();
  const gebaut = [];
  for (const n of erzeuger) {
    let modul;
    try { modul = rein(V[n]({})); } catch { continue; }
    if (!modul) continue; // ohne Angaben baut nicht jeder Erzeuger ein Modul (Sprachmodul: null)
    gebaut.push(n);
    assert.ok(!JSON.stringify(modul).includes('nutzlastTyp'), n);
    assert.equal(typeof modul.modulTyp, 'string', n);
    assert.notEqual(modul.modulTyp, TYP, n);
  }
  assert.ok(gebaut.length >= 6, 'Ausbeute: ' + gebaut.join(', '));
  // Jeder modulTyp-Wert, der im Studio als Text vorkommt.
  const werte = [...quelle.matchAll(/modulTyp\s*:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(werte.length >= 8, 'Ausbeute: ' + werte.length);
  assert.ok(!werte.includes(TYP));
  assert.ok(werte.every((w) => !w.startsWith('vivodepot-')), 'kein modulTyp trägt die Vorsilbe des Typfelds');
});

test('[Studio·Vorlage·Fassung·Kern heute] der Kern dieses Stands lässt eine Vorlage mit beiden Feldern ein, wie eine ohne', () => {
  const { V } = ladeGenerator();
  const { V: KERN } = ladeKern();
  const neu = rein(V.baueTemplateObjekt({ felder: [FELD] }).template);
  const alt = rein(neu); delete alt.nutzlastTyp; delete alt.formatFassung;
  assert.equal(KERN.validateTemplate(neu), null, 'mit beiden Feldern');
  assert.equal(KERN.validateTemplate(alt), null, 'ohne beide Felder');
  // Gegenprobe, dass die Prüfung hier überhaupt etwas abweist: ohne Felder fällt die ganze Vorlage.
  const ohneFelder = rein(neu); delete ohneFelder.felder;
  assert.equal(typeof KERN.validateTemplate(ohneFelder), 'string');
});

test('[Studio·Vorlage·Fassung·ab Werk] jede ab Werk mitgelieferte Vorlage bleibt ohne beide Felder und hat die alte Gestalt', () => {
  const { V } = ladeGenerator();
  const inhalte = JSON.parse(lies('docs', 'template-generator', 'basistemplate-inhalte.json'));
  assert.ok(Array.isArray(inhalte) && inhalte.length >= 4, 'Ausbeute: ' + inhalte.length);
  for (const v of inhalte) {
    const signiert = rein(V._basisInhalt(v));   // genau das, was die Signatur dieser Vorlagen deckt
    assert.ok(!('nutzlastTyp' in signiert) && !('formatFassung' in signiert), v.id + ': ohne beide Felder');
    assert.ok(Array.isArray(signiert.felder) && signiert.felder.length > 0 && !('modulTyp' in signiert), v.id + ': alte Gestalt');
  }
  // Rot-Beweis für den Tag, an dem jemand die Felder in die signierte Auswahl aufnähme: die Auswahl kennt sie nicht.
  assert.deepEqual(Object.keys(rein(V._basisInhalt({ felder: [FELD], nutzlastTyp: TYP, formatFassung: 1, wortlaut: 'x' }))).sort(), ['felder', 'wortlaut']);
});
