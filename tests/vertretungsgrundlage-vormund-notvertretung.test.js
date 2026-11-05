'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Probe: Vormundschaft und Notvertretung durch Ehegatten als Grundlage der Vertretung (01.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Der Befund: Der Katalog RECHTSGRUNDLAGEN_VERTRETUNG kannte zwei gesetzliche Grundlagen nicht. Ein Vormund
   (§§ 1773 ff. BGB) fand keine passende Grundlage, die vertretende Person nach § 1358 BGB auch nicht, obwohl das
   Produkt mit ihr rechnet (notvertretungAblaufText, U2-ADR-433). Die Notvertretung reicht nur auf Gesundheit
   (Entscheidung 23.09.2026): Ein Empfängerkreis unter dieser Grundlage trägt nur den Bereich Gesundheit; das
   Sub-Depot sperrt nichts, es ist die ganze Datei der vertretenen Person.
   Dazu der Befund aus demselben Bau (MITTEL): Alle Beschriftungen des Katalogs waren deutsche Literale im Kern; das
   englische Produkt zeigte sie deutsch. Sie kommen jetzt aus dem Textsatz.

   Klassen-Wächter:
   - jede wählbare Grundlage steht in VERTRETUNG_ROLECODES, mit Code oder mit `code: null`;
   - keine Beschriftung des Katalogs ist ein Literal im Kern, und jede hat einen englischen Text;
   - Lese-App und Studio führen keine eigene Kopie des Katalogs; führt eine davon Schlüssel, dann alle.
   GERÜST-TEST für die Sperre: der Rot-Beweis entfernt die Prüfung im QUELLTEXT des Kerns.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const KERN = path.join(WURZEL, 'vivodepot.html');
const PW = 'Inhaberin-2026!';
const PW_FACH = 'Gesundheit-Probe-2026!';
const JETZT = new Date('2026-11-01T10:00:00Z');
const kern = () => require('./load-kern.js').ladeKern;
const rpAus = (bundle) => bundle.entry.map((e) => e.resource).find((r) => r.resourceType === 'RelatedPerson');

const NEU = { vormundschaft: 'Vormundschaft (minderjähriges Kind, Bestellung durch das Familiengericht)', ehegattennotvertretung: 'Notvertretung durch Ehegatten in Gesundheitsfragen' };
const NEU_EN = { vormundschaft: 'Guardianship (minor child, appointed by the family court)', ehegattennotvertretung: 'Emergency representation by a spouse in health matters' };
const textKennung = (schluessel) => 'strings:grundlageLabel' + schluessel.split('_').map((t) => t[0].toUpperCase() + t.slice(1)).join('') + '.text';

async function inhaberin() {
  const { V } = kern()();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Gerda Beispiel');
  return V;
}

test('[Vormund·Notvertretung] beide Grundlagen sind wählbar, kein Instrument, mit Beschriftung de und en', () => {
  const { V } = kern()();
  const K = V.RECHTSGRUNDLAGEN_VERTRETUNG;
  const html = V.vertretungsGrundlageOptionenHTML('');
  const en = V.TEXTSATZ_EN_QUELLE.texte;
  for (const [s, label] of Object.entries(NEU)) {
    assert.equal(K[s].grundlageWaehlbar, true, s);
    assert.equal(K[s].instrumentWaehlbar, false, s);
    assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: s }), label);
    assert.match(html, new RegExp('value="' + s + '"'));
    assert.equal(en[textKennung(s)], NEU_EN[s]);
  }
});

test('[Vormund·Notvertretung·Klasse] keine Beschriftung des Katalogs ist ein Literal im Kern, jede hat de und en', () => {
  const src = fs.readFileSync(KERN, 'utf8');
  const block = src.slice(src.indexOf('const RECHTSGRUNDLAGEN_VERTRETUNG = Object.freeze({'));
  const katalog = block.slice(0, block.indexOf('\n});'));
  assert.doesNotMatch(katalog, /label:\s*'/, 'eine Beschriftung steht als Literal im Katalog');
  const { V } = kern()();
  const de = V.TEXTSATZ_DE_QUELLE.texte;
  const en = V.TEXTSATZ_EN_QUELLE.texte;
  for (const s of Object.keys(V.RECHTSGRUNDLAGEN_VERTRETUNG)) {
    assert.ok(String(de[textKennung(s)] || '').trim(), 'de fehlt: ' + s);
    assert.ok(String(en[textKennung(s)] || '').trim(), 'en fehlt: ' + s);
    assert.notEqual(en[textKennung(s)], de[textKennung(s)], 'en ist der deutsche Text: ' + s);
  }
});

test('[Vormund·Notvertretung·Klasse] jede wählbare Grundlage steht in VERTRETUNG_ROLECODES, mit Code oder null', () => {
  const { V } = kern()();
  const fehlt = (katalog, rollen) => Object.keys(katalog).filter((s) => katalog[s].grundlageWaehlbar)
    .filter((s) => !Object.prototype.hasOwnProperty.call(rollen, s) || !(rollen[s].code === null || typeof rollen[s].code === 'string'));
  assert.deepEqual(fehlt(V.RECHTSGRUNDLAGEN_VERTRETUNG, V.VERTRETUNG_ROLECODES), []);
  assert.equal(V.VERTRETUNG_ROLECODES.vormundschaft.code, 'GUARD');
  assert.equal(V.VERTRETUNG_ROLECODES.ehegattennotvertretung.code, null);
  // Rot-Beweis: ein neuer Schlüssel ohne Zeile fällt auf.
  assert.deepEqual(fehlt(Object.assign({}, V.RECHTSGRUNDLAGEN_VERTRETUNG, { neu: { grundlageWaehlbar: true } }), V.VERTRETUNG_ROLECODES), ['neu']);
});

test('[Vormund·Notvertretung·FHIR] Vormundschaft exportiert GUARD, die Notvertretung keine Rolle', async () => {
  const V = await inhaberin();
  const codes = (grundlage) => rpAus(V.fhirIpsBundle(JETZT, { anker: { name: 'Anna Beispiel', beziehungCode: 'SPS', grundlage } }))
    .relationship.map((r) => r.coding[0].code);
  assert.deepEqual(codes('vormundschaft'), ['SPS', 'GUARD']);
  assert.deepEqual(codes('ehegattennotvertretung'), ['SPS'], 'keine geratene Rolle, die Beziehung trägt SPS');
});

test('[Vormund·Notvertretung·Sperre] unter der Notvertretung trägt ein Kreis nur den Bereich Gesundheit', async () => {
  const V = await inhaberin();
  await V.empfaengerkreisSetzen({ name: 'Ehemann', bausteine: ['bereich:health', 'bereich:finance'] });
  const k = V.empfaengerkreiseListe()[0];
  await assert.rejects(V.empfaengerkreisFachEinrichten(k, PW_FACH, undefined, undefined, 'ehegattennotvertretung'),
    (e) => e.code === 'vertretung-umfang');
  assert.equal('fachSchluessel' in V.empfaengerkreiseListe()[0], false, 'abgewiesen, bevor etwas geschrieben wird');
  await V.empfaengerkreisSetzen({ id: k.id, name: 'Ehemann', bausteine: ['bereich:health'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH, undefined, undefined, 'ehegattennotvertretung');
  assert.equal(V.empfaengerkreiseListe()[0].vertretung, 'ehegattennotvertretung');
  // Danach lässt sich der Kreis nicht still erweitern.
  await assert.rejects(V.empfaengerkreisSetzen({ id: k.id, name: 'Ehemann', bausteine: ['bereich:health', 'bereich:finance'] }),
    (e) => e.code === 'vertretung-umfang');
  assert.deepEqual(V.empfaengerkreiseListe()[0].bausteine, ['bereich:health']);
  // Die Vormundschaft sperrt nichts.
  await V.empfaengerkreisSetzen({ name: 'Vormund', bausteine: ['bereich:health', 'bereich:finance'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[1], PW_FACH, undefined, undefined, 'vormundschaft');
  assert.equal(V.empfaengerkreiseListe()[1].vertretung, 'vormundschaft');
});

test('[Vormund·Notvertretung·Sub-Depot] im Sub-Depot gibt es keine Sperre', async () => {
  const { V } = kern()();
  await V.depotAnlegen(PW);
  for (const s of Object.keys(NEU)) {
    const eintrag = await V.subDepotAnlegen({ vertretungsGrundlage: s, vorname: 'Erika' }, 'subpw12345');
    const inhalt = await V.subDepotVertrauenOeffnen(eintrag.depotUUID, 'subpw12345');
    assert.equal(inhalt.vertretungsGrundlage, s);
  }
});

test('[Vormund·Notvertretung·Sperre·Rot-Beweis] ohne die Prüfung im Fach nimmt der Kern den Kreis mit Finanzen an', async () => {
  const original = fs.readFileSync(KERN, 'utf8');
  const anker = '  _kreisUmfangPruefen(k.bausteine, vertretungNeu === undefined ? k.vertretung : vertretungNeu);';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: die Prüfung steht genau einmal im Fach');
  const tmp = path.join(os.tmpdir(), 'vormund-notvertretung-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, ''));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern({ backen: true });
    await V.depotAnlegen(PW);
    await V.empfaengerkreisSetzen({ name: 'Ehemann', bausteine: ['bereich:health', 'bereich:finance'] });
    await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH, undefined, undefined, 'ehegattennotvertretung');
    assert.equal(V.empfaengerkreiseListe()[0].vertretung, 'ehegattennotvertretung', 'genau die Lücke: Finanzen unter § 1358');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
});

test('[Vormund·Notvertretung·Hinweis] der Hinweis nennt die Grenzen nach § 1358 BGB, de und en', () => {
  const { V } = kern()();
  const de = V.TEXTSATZ_DE_QUELLE.texte;
  const en = V.TEXTSATZ_EN_QUELLE.texte;
  // Im Sub-Depot (Seite der vertretenden Person): befristet, nur bei Bewusstlosigkeit oder Krankheit, kein Getrenntleben.
  assert.deepEqual([/Gesundheitsfragen/, /Bewusstlosigkeit oder Krankheit/, /sechs Monate/, /getrennt/, /ablehnt/, /behandelnden Ärztin/, /bevollmächtigt/, /Betreuer/, /Lebenspartner/, /rechtlich nicht selbst/, /§ 1358 BGB/, /§ 21 LPartG/]
    .filter((r) => !r.test(de['strings:subGrundlageHint.text'])).map(String), []);
  assert.deepEqual([/health matters/, /unconsciousness or illness/, /six months/, /live apart/, /refuses/, /treating doctor/, /authorised/, /court-appointed representative/, /registered life partners/, /legally unable/, /in writing/, /Section 1358/, /Act on Registered Life Partnerships/]
    .filter((r) => !r.test(en['strings:subGrundlageHint.text'])).map(String), []);
  // Am Fach: die Sperre, dann der Wortlaut der Gruppe „Notvertretung“, den [Notvertretung·Wächter] hält.
  assert.match(de['strings:kreiseFachVertretungHint.text'], /nur den Bereich Gesundheit/);
  assert.match(en['strings:kreiseFachVertretungHint.text'], /only see the Health area/);
  const src = fs.readFileSync(KERN, 'utf8');
  assert.match(src, /return STRINGS\.kreiseFachVertretungHint \+ ' ' \+ String\(_textLesenOderRueckfall\('advanceCare#spousal-representation\.hint', ''\)\);/);   // mit Rückfall (textsatz-rueckfall-alle-stellen)
  assert.match(src, /<p class="einst-hint" id="kreis-fach-vertretung-hint">' \+ escapeHTML\(kreiseFachVertretungHinweis\(\)\) \+ '<\/p>'/);
});

test('[Vormund·Notvertretung·Hinweis] „Grundlage der Vertretung“ nennt für Kinder elterliche Sorge und Vormund, de und en', () => {
  const { V } = kern()();
  const k = 'people.childrenAndDependants/basisOfRepresentation.hint';
  assert.match(V.TEXTSATZ_DE_QUELLE.texte[k], /^Für Kinder: die elterliche Sorge oder ein Vormund, den das Familiengericht bestellt\. Für Erwachsene: /);
  assert.match(V.TEXTSATZ_EN_QUELLE.texte[k], /^For children: parental custody, or a guardian appointed by the family court\. For adults: /);
});

/* Lese-App und Studio: keine eigene Kopie des Katalogs. Führt eine Datei den Katalog, dann mit allen wählbaren
   Schlüsseln — sonst zeigte sie eine neue Grundlage als rohen Schlüssel. Kennzeichen einer Kopie sind die Namen der beiden
   Tabellen oder die Schlüssel, die es nur im Katalog gibt (gesetzliche_betreuung, elterliche_sorge, vormundschaft; die
   anderen Schlüssel sind auch Werte anderer Felder, etwa ehegattennotvertretung bei „Grundlage der Vertretung“ der Kinder).
   Gemessen 01.11.2026: beide Dateien führen keine Kopie. */
const NUR_IM_KATALOG = ['gesetzliche_betreuung', 'elterliche_sorge', 'vormundschaft'];
const zitiert = (text, s) => new RegExp("['\"]" + s + "['\"]|\\b" + s + ":").test(text);
function katalogLuecken(text, waehlbar) {
  const kopie = /RECHTSGRUNDLAGEN_VERTRETUNG|VERTRETUNG_ROLECODES/.test(text) || NUR_IM_KATALOG.some((s) => zitiert(text, s));
  return kopie ? waehlbar.filter((s) => !zitiert(text, s)) : [];
}

test('[Vormund·Notvertretung·Klasse] Lese-App und Studio führen keine eigene Kopie des Katalogs', () => {
  const { V } = kern()();
  const K = V.RECHTSGRUNDLAGEN_VERTRETUNG;
  const waehlbar = Object.keys(K).filter((s) => K[s].grundlageWaehlbar);
  for (const datei of ['vivodepot-lesen.html', 'vivodepot-studio.html']) {
    const text = fs.readFileSync(path.join(WURZEL, datei), 'utf8');
    assert.equal(/RECHTSGRUNDLAGEN_VERTRETUNG|VERTRETUNG_ROLECODES/.test(text) || NUR_IM_KATALOG.some((s) => zitiert(text, s)), false, datei + ' führt eine Kopie');
    assert.deepEqual(katalogLuecken(text, waehlbar), [], datei);
  }
  // Rot-Beweis: eine Kopie, die nur die bisherigen Schlüssel kennt, fällt an den neuen.
  const alt = "const K = { vorsorge: 1, bank: 1, gesundheit: 1, general: 1, gesetzliche_betreuung: 1, elterliche_sorge: 1 };";
  assert.deepEqual(katalogLuecken(alt, waehlbar).sort(), ['ehegattennotvertretung', 'vormundschaft']);
});
