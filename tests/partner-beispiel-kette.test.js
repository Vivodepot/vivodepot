'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Partner-Beispiel: die ganze Kette einer Einrichtung, die eine eigene Vorlage herausgibt (08.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Studio (Beispiel „Bibliotheksausweis“) → Partner signiert die Vorlage → Zertifikat aus einem
   Test-Anker → Einlesen im Kern über den Fachpfad `provider-credential` → Ausfüllen → Ausgabe als Blatt
   mit Herkunftszeile. Die Einrichtung ist erfunden (Fixture `fixtures/partner-beispiel/`).

   KEIN SCHLÜSSEL IM REPO: Partner-Schlüssel und Test-Anker entstehen bei jedem Lauf mit WebCrypto neu.
   Den Test-Anker kennt der Kern nur über `opts.ankerJwk`, das die App setzt und nie aus einer Datei liest.

   GEGENPROBE (Bedingung zum Wort für den Test-Anker): jedes ausgelieferte Produkt — privat und pro, de und
   en, echt konfektioniert — lehnt dieselbe Kette ohne Test-Injektion ab, auf beiden Einlasswegen
   (Fachpfad und signiertes Modulbündel). Die Diskriminante zeigt, dass es nur am Anker liegt: dasselbe
   Produkt nimmt die Kette an, sobald die Probe den Test-Anker injiziert.

   Lese-App und Studio prüfen Zertifikate selbst und werden mit ausgeliefert: dieselbe Gegenprobe gilt für sie.

   KLASSENWÄCHTER (tools/anker-aus-daten-pruefen.js): kein Codeweg setzt einen Anker aus Daten — Anker-Schlüssel
   stehen nur in der Durchreichung an die Ausgabestelle, und die vier Anker-Konstanten jedes gebauten Produkts sind
   textgleich mit denen des Kanons.

   ROT-BEWEISE (im Lauf): `lehntAb` meldet „nimmt an“, wenn der Test-Anker im Anker-Satz eines Produkts
   stünde (über `opts.ankerSatz` nachgestellt); der Wächter fällt bei jeder Schreibform eines Anker-Schlüssels und bei
   jeder geänderten Anker-Konstante; eine nach dem Signieren geänderte Vorlage kommt nicht durch.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeIssuer } = require('./load-issuer.js');
const { ladeGenerator } = require('./load-generator.js');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'partner-beispiel');
const FIX = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'einrichtung.json'), 'utf8'));

async function schluesselpaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

/* Die Kette einmal je Lauf. Glied 1–2 im Studio, Glied 3 Partner-Signatur (Studio) und Zertifikat (Issuer, Test-Anker). */
let _kette = null;
async function kette() {
  if (_kette) return _kette;
  const G = ladeGenerator().V;
  const I = ladeIssuer().V;
  const basis = G.BEISPIEL_TEMPLATES[FIX.basis];
  assert.ok(basis && Array.isArray(basis.felder) && basis.felder.length, 'Glied 1: das Studio-Beispiel „' + FIX.basis + '“ fehlt');
  const template = { felder: basis.felder, wortlaut: FIX.wortlaut, wortlautQuelle: FIX.wortlautQuelle };
  const partner = await schluesselpaar();
  const anker = await schluesselpaar();
  const vc = I.baueProviderVC(Object.assign({ issuer: 'did:web:vivodepot.de', publicKeyJwk: partner.pub }, FIX.einrichtung, FIX.zertifikat));
  const certJws = await I.stelleProviderCredentialAus(vc, await I._jwsImportSignKey(anker.priv));
  const templateJws = await G.templateJwsErzeugen(template, partner.priv);
  assert.equal(typeof templateJws, 'string', 'Glied 3: das Studio hat die Vorlage nicht signiert');
  _kette = { template, certJws, templateJws, ankerPub: anker.pub, partnerPriv: partner.priv, G };
  return _kette;
}

test('[Partner-Kette] Fixture vollständig und ohne Schlüssel', () => {
  for (const k of ['basis', 'einrichtung', 'wortlaut', 'wortlautQuelle', 'zertifikat', 'jetzt', 'werte']) assert.ok(FIX[k], 'Fixture-Feld fehlt: ' + k);
  for (const datei of fs.readdirSync(FIXTURE_DIR)) {
    const text = fs.readFileSync(path.join(FIXTURE_DIR, datei), 'utf8');
    assert.doesNotMatch(text, /"(d|x|kty|privateKey\w*|publicKey\w*)"\s*:/, datei + ': die Fixture darf keinen Schlüssel tragen');
  }
});

test('[Partner-Kette] Studio → Signatur → Zertifikat → Einlesen → Ausfüllen → Blatt mit Herkunft (Test-Anker nur über die Probe)', async () => {
  const k = await kette();
  const { V } = ladeKern();
  const plan = await V.importPlanGeprueft('provider-credential', k.certJws, { ankerJwk: k.ankerPub, templateJws: k.templateJws, jetzt: FIX.jetzt });
  assert.equal(plan.ungueltig, false, 'Glied 5: Einlesen abgewiesen: ' + String(plan.grund || ''));
  assert.equal(plan.anbieterName, FIX.einrichtung.anbieterName);
  await V.depotAnlegen('Partner-Beispiel-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const erg = V.importAnwenden(plan, {});
  assert.equal(erg.vorlageAngelegt, true, 'Glied 5: keine Vorlage angelegt');
  const d = V.getData();
  const eintrag = d.importierteVorlagen[0];
  const defs = d.feldDefinitionen.filter((x) => eintrag.feldIds.indexOf(x.feldId) !== -1);
  assert.equal(defs.length, k.template.felder.length, 'Glied 5: nicht jedes Feld der Vorlage ist angekommen');
  // Glied 6: ausfüllen und ausgeben.
  for (const [label, wert] of Object.entries(FIX.werte)) {
    const def = defs.find((x) => x.label === label);
    assert.ok(def, 'Feld fehlt im Depot: ' + label);
    d.sektoren[eintrag.sektorId] = d.sektoren[eintrag.sektorId] || {};
    d.sektoren[eintrag.sektorId][def.feldId] = wert;
  }
  const blatt = V._vorlageDokAusgabe(eintrag);
  const text = JSON.stringify(blatt);
  assert.match(blatt.herkunftText, new RegExp(FIX.einrichtung.anbieterName.replace(/[()]/g, '\\$&')), 'das Blatt nennt die Einrichtung nicht als Herkunft');
  assert.ok(text.includes('Hiermit melde ich mich für einen Leseausweis an.'), 'der Wortlaut fehlt im Blatt');
  for (const [label, wert] of Object.entries(FIX.werte)) assert.ok(text.includes(label + ': ' + wert), 'die Angabe fehlt im Blatt: ' + label);
});

test('[Partner-Kette · Rot-Beweis] eine nach dem Signieren geänderte Vorlage nimmt der Kern nicht an', async () => {
  const k = await kette();
  const { V } = ladeKern();
  const [kopf, nutzlast, signatur] = k.templateJws.split('.');
  const geaendert = JSON.parse(Buffer.from(nutzlast, 'base64url').toString('utf8'));
  geaendert.wortlaut = 'Hiermit trete ich alle Rechte ab.';
  const gefaelscht = [kopf, Buffer.from(JSON.stringify(geaendert), 'utf8').toString('base64url'), signatur].join('.');
  const plan = await V.importPlanGeprueft('provider-credential', k.certJws, { ankerJwk: k.ankerPub, templateJws: gefaelscht, jetzt: FIX.jetzt });
  const angenommen = !plan.ungueltig && plan.wortlaut === geaendert.wortlaut;
  assert.equal(angenommen, false, 'die geänderte Vorlage kam mit ihrem Wortlaut durch');
});

/* ── Gegenprobe über die vier ausgelieferten Produkte ───────────────────────────────────── */
const gebaut = new Map();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-partner-kette-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
function produktKern(slug) {
  if (!gebaut.has(slug)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    const r = konfektionieren({
      ziel: path.join(TMP, slug), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  return ladeKern({ htmlPfad: gebaut.get(slug) }).V;
}

/* Beide Einlasswege eines Produkts mit derselben Kette. `zusatz` ist nur für die Diskriminante und den Rot-Beweis. */
async function lehntAb(V, k, zusatz) {
  const o = Object.assign({ jetzt: FIX.jetzt }, zusatz || {});
  const plan = await V.importPlanGeprueft('provider-credential', k.certJws, Object.assign({ templateJws: k.templateJws }, o));
  const buendel = JSON.stringify({ providerCredentialJws: k.certJws, modulSignaturJws: k.templateJws });
  const modul = await V.modulEinlassenGeprueft(buendel, {}, o);
  // Der Modulweg muss am Zertifikat scheitern, nicht schon an der Form des Bündels.
  assert.notEqual(modul.grund, 'kein-signiertes-bundle', 'das Probe-Bündel hat nicht die Form eines signierten Moduls');
  assert.notEqual(modul.grund, 'kein-json');
  const zertifikat = await V.verifiziereProviderCredential(k.certJws, o);
  return { fachpfad: plan.ungueltig === true, modulZertifikat: zertifikat.gueltig !== true, modul: modul.angenommen !== true,
    modulGrund: modul.grund, zertifikatGrund: zertifikat.grund };
}

for (const { slug } of PRODUKTE) {
  test('[Partner-Kette · Gegenprobe] ' + slug + ' lehnt die Kette mit Test-Anker ab, auf Fachpfad und Modulweg', async () => {
    const k = await kette();
    const V = produktKern(slug);
    const ohne = await lehntAb(V, k);
    assert.deepEqual({ fachpfad: ohne.fachpfad, modulZertifikat: ohne.modulZertifikat, modul: ohne.modul },
      { fachpfad: true, modulZertifikat: true, modul: true }, slug + ' nimmt eine Kette mit Test-Anker an');
    // Der Modulweg scheitert nachweislich am Anker, nicht erst an Signatur oder Stufenprüfung danach.
    assert.equal(ohne.modulGrund, ohne.zertifikatGrund, slug + ': der Modulweg lehnt aus einem anderen Grund ab als das Zertifikat');
    // Klassenwächter (2): die Anker-Konstanten des gebauten Produkts sind textgleich mit denen des Kanons.
    const { blockGleich } = require('../tools/anker-aus-daten-pruefen.js');
    const vergleich = blockGleich(fs.readFileSync(gebaut.get(slug), 'utf8'), fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
    assert.deepEqual(vergleich.abweichend, [], slug + ': Anker-Konstanten weichen vom Kanon ab');
    // Diskriminante: mit injiziertem Test-Anker nimmt dasselbe Produkt die Kette auf dem Fachpfad an.
    const mit = await lehntAb(V, k, { ankerJwk: k.ankerPub });
    assert.equal(mit.fachpfad, false, slug + ': auch mit Test-Anker abgewiesen, die Ablehnung oben belegt dann nichts');
    assert.equal(mit.modulZertifikat, false, slug + ': das Zertifikat besteht auch mit Test-Anker nicht');
  });
}

test('[Partner-Kette · Gegenprobe · Rot-Beweis] stünde der Test-Anker im Anker-Satz eines Produkts, meldete lehntAb „nimmt an“', async () => {
  const k = await kette();
  const slug = PRODUKTE[0].slug;
  const V = produktKern(slug);
  const kopf = JSON.parse(Buffer.from(k.certJws.split('.')[0], 'base64url').toString('utf8'));
  // Ohne `kid` im Kopf wählt der Kern den Anker unter ANKER_OHNE_KID; die Kennung steht im gebauten Produkt.
  const ohneKid = (fs.readFileSync(gebaut.get(slug), 'utf8').match(/const ANKER_OHNE_KID = '([^']+)'/) || [])[1];
  const kid = typeof kopf.kid === 'string' ? kopf.kid : ohneKid;
  assert.equal(typeof kid, 'string', 'Vorbedingung: Kennung des Ankers bestimmbar');
  const ankerSatz = [{ kid, alg: kopf.alg, jwk: k.ankerPub }];
  const r = await lehntAb(V, k, { ankerSatz });
  assert.equal(r.fachpfad, false, 'mit dem Test-Anker im Anker-Satz hätte der Fachpfad annehmen müssen');
  assert.equal(r.modulZertifikat, false, 'mit dem Test-Anker im Anker-Satz hätte das Zertifikat bestehen müssen');
});

/* ── Lese-App und Studio prüfen Zertifikate selbst, je mit eigenem Anker-Satz. Beide werden als eine Datei für alle
   Produkte ausgeliefert (das Konfektionieren baut nur den Kern), darum die Datei des Repos. ───────────────────────── */
test('[Partner-Kette · Gegenprobe] die Lese-App lehnt die Kette mit Test-Anker ab und nimmt sie mit injiziertem Anker an', async () => {
  const k = await kette();
  const { ladeLesen } = require('./load-lesen.js');
  const L = ladeLesen().V;
  const ohne = await L.verifiziereTemplateKette(k.certJws, k.templateJws, { jetzt: FIX.jetzt });
  assert.equal(ohne.gueltig, false, 'die Lese-App nimmt eine Kette mit Test-Anker an');
  const mit = await L.verifiziereTemplateKette(k.certJws, k.templateJws, { jetzt: FIX.jetzt, ankerJwk: k.ankerPub });
  assert.equal(mit.gueltig, true, 'Diskriminante: auch mit injiziertem Anker abgewiesen: ' + String(mit.grund || ''));
});

test('[Partner-Kette · Gegenprobe] das Studio lehnt das Zertifikat mit Test-Anker ab und nimmt es mit injiziertem Anker an', async () => {
  const k = await kette();
  const ohne = await k.G.verifiziereProviderCredential(k.certJws, { jetzt: FIX.jetzt });
  assert.notEqual(ohne.gueltig, true, 'das Studio nimmt ein Zertifikat mit Test-Anker an');
  const mit = await k.G.verifiziereProviderCredential(k.certJws, { jetzt: FIX.jetzt, ankerJwk: k.ankerPub });
  assert.equal(mit.gueltig, true, 'Diskriminante: auch mit injiziertem Anker abgewiesen: ' + String(mit.grund || ''));
});

/* ── Klassenwächter (1): kein Codeweg, der einen Anker aus Daten setzt. Werkzeug tools/anker-aus-daten-pruefen.js. ── */
test('[Partner-Kette · Wächter] Anker-Schlüssel stehen in Kern, Lese-App und Studio nur in der Durchreichung an die Ausgabestelle', () => {
  const { ankerStellen, STANDARD } = require('../tools/anker-aus-daten-pruefen.js');
  for (const datei of STANDARD) {
    const text = fs.readFileSync(path.join(__dirname, '..', datei), 'utf8');
    assert.deepEqual(ankerStellen(text), [], datei + ': Anker-Schlüssel außerhalb der Durchreichung');
    assert.ok(/const ausstellerOpts = \{ ankerJwk:/.test(text), datei + ': Vorbedingung, die erlaubte Durchreichung steht da');
  }
});

test('[Partner-Kette · Wächter · Rot-Beweis] eine gepflanzte Zeile mit Anker-Schlüssel und ein geänderter Anker-Satz fallen auf', () => {
  const { ankerStellen, blockGleich } = require('../tools/anker-aus-daten-pruefen.js');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const gepflanzt = kern.replace('async function verifiziereProviderCredential(jwsCompact, opts) {',
    'async function verifiziereProviderCredential(jwsCompact, opts) {\n  opts = Object.assign({ ankerJwk: (opts || {}).modulAnker }, opts);');
  assert.notEqual(gepflanzt, kern, 'Vorbedingung: die Pflanzstelle steht im Kern');
  assert.equal(ankerStellen(gepflanzt).length, 1, 'die gepflanzte Zeile fällt nicht auf');
  const satz = kern.replace("const ANKER_SATZ = Object.freeze([", "const ANKER_SATZ = Object.freeze([\n  Object.freeze({ kid: 'test', alg: 'EdDSA', jwk: {} }),");
  assert.notEqual(satz, kern, 'Vorbedingung: der Anker-Satz steht im Kern');
  assert.deepEqual(blockGleich(satz, kern).abweichend, ['ANKER_SATZ'], 'ein zusätzlicher Anker fällt nicht auf');
  assert.deepEqual(blockGleich(kern, kern).abweichend, [], 'Vorbedingung: unverändert ist nichts abweichend');
});

test('[Partner-Kette · Wächter · Rot-Beweis] jede Schreibform jedes Anker-Namens fällt auf', () => {
  const { ankerStellen } = require('../tools/anker-aus-daten-pruefen.js');
  const formen = [
    (n) => 'const o = { ' + n + ': daten.a };',
    (n) => 'o.' + n + ' = daten.a;',
    (n) => "o['" + n + "'] = daten.a;",
    (n) => 'o["' + n + '"] = daten.a;',
    (n) => 'const o = { ' + n + ' };',
    (n) => 'const o = { b, ' + n + ', c };',
    (n) => 'const o = {\n  ' + n + ',\n};',
  ];
  for (const n of ['ankerJwk', 'ankerSatz', 'ankerWiderrufen']) {
    for (const f of formen) assert.equal(ankerStellen(f(n)).length, 1, 'fällt nicht auf: ' + f(n));
    assert.deepEqual(ankerStellen('if (o.' + n + ') pruefe(o.' + n + ' === a);'), [], n + ': Lesen ist kein Fund');
  }
});

test('[Partner-Kette · Wächter · Rot-Beweis] jede geänderte Anker-Konstante fällt beim Vergleich auf', () => {
  const { blockGleich } = require('../tools/anker-aus-daten-pruefen.js');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const faelle = [
    ['TRUST_AUTHORITY_PUBLIC_JWK', /(const TRUST_AUTHORITY_PUBLIC_JWK = Object\.freeze\(\{[\s\S]*?\n {2}x: ')[^']+/, '$1gepflanzt'],
    ['ANKER_OHNE_KID', /const ANKER_OHNE_KID = '[^']+'/, "const ANKER_OHNE_KID = 'gepflanzt'"],
    ['ANKER_WIDERRUFEN', 'const ANKER_WIDERRUFEN = Object.freeze([])', "const ANKER_WIDERRUFEN = Object.freeze(['gepflanzt'])"],
  ];
  for (const [name, muster, ersatz] of faelle) {
    const geaendert = kern.replace(muster, ersatz);
    assert.notEqual(geaendert, kern, 'Vorbedingung: ' + name + ' steht im Kern');
    assert.deepEqual(blockGleich(geaendert, kern).abweichend, [name], name + ': die Änderung fällt nicht auf');
  }
  const ohne = kern.replace('const ANKER_SATZ = ', 'const ANKER_SATZ_WEG = ');
  assert.deepEqual(blockGleich(ohne, kern).abweichend, ['ANKER_SATZ'], 'eine fehlende Konstante fällt nicht auf');
});
