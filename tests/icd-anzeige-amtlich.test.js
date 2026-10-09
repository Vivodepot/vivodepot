'use strict';
/* ════════════════════════════════════════════════════════════════════════
   ICD-Anzeige: jeder angezeigte ICD-Text ist amtlich oder gekennzeichnet
   (06.10.2026, Befund ICD-TITEL-LIVE-VERAENDERT, Variante (c) mit (d))
   ────────────────────────────────────────────────────────────────────────
   Befund: die Oberfläche zeigte zu ICD-10-GM-Codes eigene, gekürzte Namen
   („Diabetes mellitus Typ 2, ohne Komplikationen“ zu E11.90) — weder der
   amtliche Titel noch als eigener gekennzeichnet (BfArM: Änderungsverbot
   § 62 UrhG). Produktentscheidung: der amtliche Titel der Systematik steht
   immer; daneben ein Begriff aus dem Alphabetischen Verzeichnis zur
   ICD-10-GM; nur wo dieses nichts Verständliches bietet, ein eigener Text mit
   Kennzeichnung. Stehende Regel: keine eigenen Inhalte, wo es offizielle
   gibt — auch die Suchbegriffe kommen aus dem Verzeichnis.
   Gehalten wird:
     · Daten: quellBegriff ist der amtliche Titel (tests/icd10gm-endstaendig);
       Alltagsbegriff und jeder Suchbegriff stehen im mitgeführten Auszug des
       Verzeichnisses zum selben Code, der Alltagsbegriff sonst nur mit
       eigeneBeschreibung; der Auszug trägt nichts, was die Anzeige nicht nutzt.
     · Klasse: dieselbe Regel für JEDE Liste unter code-listen/ mit
       herkunftPflicht, und das Freigabe-Register nennt, welche Liste sie hat.
     · Kern: an allen Anzeigestellen eines Chips (Bearbeiten, gebauter Chip,
       Ansicht) steht der amtliche Titel, jeder angezeigte Text ist amtlich oder
       gekennzeichnet, und ein eigener Text oder ein Code, den die Liste nicht
       mehr führt, trägt die Kennzeichnung.
   Der Auszug wird gegen die echte Datei mit tools/icd-alphabet-begriffe.js
   --alphabet <datei> geprüft; ohne Datei hier gegen eine erfundene Fixture.
   ROT-BEWEIS an E11.90: der alte eigene Name ohne Kennzeichnung fällt in den
   Daten; ein gespeicherter Chip mit ihm zeigt ihn nicht mehr, mit dem alten
   Code E11.9 trägt er die Kennzeichnung; ein Kern ohne die Anzeigestelle
   (Mutation an einer Kopie) zeigt den alten Namen und fällt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const WZ = require('../tools/icd-alphabet-begriffe.js');

const REPO = path.join(__dirname, '..');
const lesen = (d) => fs.readFileSync(path.join(REPO, d), 'utf8');
const LISTE = JSON.parse(lesen('code-listen/icd10.json'));
const ALLE_LISTEN = fs.readdirSync(path.join(REPO, 'code-listen')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(lesen('code-listen/' + f)));
const REGISTER = JSON.parse(lesen('tools/code-listen-freigaben.json')).systeme;
const ALT_EIGEN = 'Diabetes mellitus Typ 2, ohne Komplikationen';
const SATZ_DE = JSON.parse(lesen('tools/textsatz-de-modul.json')).texte;
const KENNUNG = SATZ_DE['strings:codeEigeneBeschreibung.text'];
// Ein Code, den die Liste nicht führt, heißt „nicht amtlich“, nicht „eigene Beschreibung“: sein Text kann aus einem Import stammen.
const NICHT_AMTLICH = SATZ_DE['strings:codeNichtAmtlich.text'];

/* Herkunft je angezeigtem Text einer Liste mit herkunftPflicht: belegt ist, was zeichengleich im mitgeführten Auszug des
   amtlichen Verzeichnisses zum selben Code steht oder der amtliche Titel selbst ist; ein eigener Alltagsbegriff nur mit
   eigeneBeschreibung, ein eigener Suchbegriff nie. kategorie ist eigener Inhalt und hat in einer solchen Liste keinen Platz. */
function herkunftBefund(liste) {
  const funde = [];
  const id = liste.systemId;
  const auszug = (liste.alphabet && liste.alphabet.eintraege) || [];
  const imAuszug = (code, t) => auszug.some((a) => a.code === code && a.text === t);
  const genutzt = new Set();
  for (const d of liste.daten || []) {
    if (typeof d.quellBegriff !== 'string' || !d.quellBegriff) { funde.push(id + ' ' + d.code + ': amtlicher Titel (quellBegriff) fehlt'); continue; }
    const belegt = (t) => t === d.quellBegriff || imAuszug(d.code, t);
    if (imAuszug(d.code, d.anzeigeName)) genutzt.add(d.code + '|' + d.anzeigeName);
    if (!belegt(d.anzeigeName) && d.eigeneBeschreibung !== true) funde.push(id + ' ' + d.code + ': „' + d.anzeigeName + '“ ist weder amtlich noch als eigene Beschreibung gekennzeichnet');
    for (const s of d.synonyme || []) {
      if (imAuszug(d.code, s)) genutzt.add(d.code + '|' + s);
      if (!belegt(s)) funde.push(id + ' ' + d.code + ': Suchbegriff „' + s + '“ ist nicht amtlich');
    }
    if (d.kategorie !== undefined) funde.push(id + ' ' + d.code + ': kategorie ist eigener Inhalt');
  }
  for (const a of auszug) if (!genutzt.has(a.code + '|' + a.text)) funde.push(id + ' ' + a.nr + ': im Auszug, aber nicht genutzt');
  return funde;
}

test('[ICD-Anzeige·Daten] amtlicher Titel je Code; Alltagsbegriff und Suchbegriffe aus dem Verzeichnis', () => {
  assert.ok(LISTE.herkunftPflicht && LISTE.daten.length >= 4, 'Vorbedingung: die Liste trägt herkunftPflicht und Codes');
  assert.ok(LISTE.daten.some((d) => d.code === 'C56'), 'Vorbedingung: C56 (Vorführung „Patientin“) steht in der Liste');
  assert.deepEqual(herkunftBefund(LISTE), []);
  assert.match(LISTE.lizenz, /Diagnosenthesaurus des Zentralinstituts für die kassenärztliche Versorgung/, 'Quellenangabe Band 2 (Zi) im Wortlaut');
});

test('[ICD-Anzeige·Daten·Rot-Beweis] E11.90 mit dem alten eigenen Namen, ein eigener Suchbegriff und ein ungenutzter Auszug fallen', () => {
  const k = JSON.parse(JSON.stringify(LISTE));
  const e = k.daten.find((d) => d.code === 'E11.90');
  e.anzeigeName = ALT_EIGEN;
  e.synonyme = [...e.synonyme, 'Zuckerkrankheit'];
  const f = herkunftBefund(k).join('\n');
  assert.match(f, /icd10 E11\.90: „Diabetes mellitus Typ 2, ohne Komplikationen“ ist weder amtlich noch/);
  assert.match(f, /Suchbegriff „Zuckerkrankheit“/);
  assert.match(f, /icd10 99043: im Auszug, aber nicht genutzt/);
  e.eigeneBeschreibung = true;
  assert.doesNotMatch(herkunftBefund(k).join('\n'), /E11\.90: „Diabetes/, 'gekennzeichnet ist der eigene Text zulässig');
  const c = k.daten.find((d) => d.code === 'C56');
  c.kategorie = 'Onkologie';
  delete c.quellBegriff;
  assert.match(herkunftBefund(k).join('\n'), /icd10 C56: amtlicher Titel \(quellBegriff\) fehlt/);
});

test('[ICD-Anzeige·Klasse] jede Liste mit herkunftPflicht: jeder angezeigte Text amtlich oder gekennzeichnet; Register und Liste stimmen überein', () => {
  const mit = ALLE_LISTEN.filter((l) => l.herkunftPflicht);
  assert.ok(mit.some((l) => l.systemId === 'icd10'), 'Vorbedingung: der Suchraum enthält mindestens ICD-10-GM');
  assert.deepEqual(mit.flatMap(herkunftBefund), []);
  const abw = ALLE_LISTEN.filter((l) => !!(REGISTER[l.systemId] || {}).herkunftPflicht !== !!l.herkunftPflicht).map((l) => l.systemId);
  assert.deepEqual(abw, [], 'herkunftPflicht steht im Freigabe-Register und in der Liste gleich');
  assert.ok(REGISTER.icd10.herkunftPflicht, 'Vorbedingung: ICD-10-GM ist als amtliches Begriffswerk geführt');
});

test('[ICD-Anzeige·Klasse·Rot-Beweis] eine andere Liste mit herkunftPflicht fällt mit eigenem Text; ihr amtlicher Titel als Anzeige ist belegt', () => {
  const fremd = { systemId: 'probe', herkunftPflicht: true, daten: [
    { code: 'P1', quellBegriff: 'Amtlicher Titel eins', anzeigeName: 'Amtlicher Titel eins' },
    { code: 'P2', quellBegriff: 'Amtlicher Titel zwei', anzeigeName: 'Eigene Kurzform', synonyme: ['Eigener Suchbegriff'] },
  ] };
  const f = herkunftBefund(fremd).join('\n');
  assert.doesNotMatch(f, /P1/, 'der amtliche Titel als Anzeige braucht keinen Auszug');
  assert.match(f, /probe P2: „Eigene Kurzform“ ist weder amtlich noch/);
  assert.match(f, /probe P2: Suchbegriff „Eigener Suchbegriff“ ist nicht amtlich/);
  // Register und Liste auseinander: fällt.
  const listen = [...ALLE_LISTEN.filter((l) => l.systemId !== 'icd10'), Object.assign({}, LISTE, { herkunftPflicht: false })];
  const abw = listen.filter((l) => !!(REGISTER[l.systemId] || {}).herkunftPflicht !== !!l.herkunftPflicht).map((l) => l.systemId);
  assert.deepEqual(abw, ['icd10']);
});

/* Die Texte zwischen den Tags eines Chip-Inhalts: das ist, was am Bildschirm steht. */
const texteIn = (html) => html.split(/<[^>]+>/).map((s) => s.trim()).filter(Boolean);
const chipInhalt = (html) => { const m = /<span class="chip"[^>]*>([\s\S]*?)<button/.exec(html); return m ? m[1] : ''; };

function anzeigeBefund(V, liste, feld, chip, erlaubt) {
  const funde = [];
  for (const [wo, html] of [['Chip', V.codeChipInhaltHTML(liste, chip)], ['Ansicht', V.feldWertHTML(feld, [chip])], ['Bearbeiten', chipInhalt(V.feldInputHTML(feld, [chip]))]]) {
    for (const t of texteIn(html)) if (!erlaubt.has(t)) funde.push(wo + ': „' + t + '“ ist weder amtlich noch gekennzeichnet');
  }
  return funde;
}

test('[ICD-Anzeige·Kern] jede Anzeigestelle zeigt den amtlichen Titel, jeder Text ist amtlich oder gekennzeichnet; abgelöster Code trägt die Kennzeichnung', () => {
  const { V } = ladeKern();
  const liste = V.liesCodeListe('icd10');
  assert.ok(liste.herkunftPflicht, 'Vorbedingung: der Kern kennt herkunftPflicht');
  assert.ok(KENNUNG && NICHT_AMTLICH, 'Vorbedingung: beide Kennzeichnungen stehen im Sprachsatz');
  const feld = { id: 'probe', typ: 'text', codeListe: 'icd10', label: 'Probe' };
  for (const d of LISTE.daten) {
    const chip = V.chipAusEingabe('icd10', d.anzeigeName);
    assert.equal(chip.code.code, d.code, 'Vorbedingung: der Alltagsbegriff trifft den Code');
    const erlaubt = new Set([d.anzeigeName, d.quellBegriff, LISTE.kuerzel + ' ' + d.code].map(V.escapeHTML));
    assert.deepEqual(anzeigeBefund(V, liste, feld, chip, erlaubt), []);
    for (const [wo, html] of [['Chip', V.codeChipInhaltHTML(liste, chip)], ['Ansicht', V.feldWertHTML(feld, [chip])], ['Bearbeiten', V.feldInputHTML(feld, [chip])]]) {
      assert.ok(html.includes(V.escapeHTML(d.quellBegriff)), wo + ' ' + d.code + ': amtlicher Titel fehlt');
      assert.ok(html.includes(V.escapeHTML(d.anzeigeName)), wo + ' ' + d.code + ': Alltagsbegriff fehlt');
      assert.ok(!html.includes(V.escapeHTML(NICHT_AMTLICH)), wo + ' ' + d.code + ': amtlich, also ohne Kennzeichnung');
    }
    assert.equal(V.chipAusEingabe('icd10', d.quellBegriff).code.code, d.code, 'die Suche trifft auch den amtlichen Titel');
    assert.ok(V.codeListeSuche('icd10', d.quellBegriff.slice(0, 12)).some((e) => e.code === d.code), 'die Vorschlagsliste trifft den amtlichen Titel');
  }
  // Rot-Beweis 1: ein gespeicherter Chip von früher mit dem alten eigenen Namen am noch geführten Code E11.90 — angezeigt wird
  // nicht der gespeicherte Text, sondern der Text der Liste.
  const e1190 = LISTE.daten.find((d) => d.code === 'E11.90');
  const frueher = { text: ALT_EIGEN, code: { system: liste.uri, code: 'E11.90' } };
  const erlaubtE = new Set([e1190.anzeigeName, e1190.quellBegriff, 'ICD-10-GM E11.90'].map(V.escapeHTML));
  assert.deepEqual(anzeigeBefund(V, liste, feld, frueher, erlaubtE), []);
  // Rot-Beweis 2: alter Code E11.9, den die Liste nicht mehr führt — der eigene Text steht nur gekennzeichnet da.
  const alt = { text: ALT_EIGEN, code: { system: liste.uri, code: 'E11.9' } };
  for (const html of [V.codeChipInhaltHTML(liste, alt), V.feldWertHTML(feld, [alt])]) {
    assert.ok(html.includes(V.escapeHTML(NICHT_AMTLICH)) && !html.includes(V.escapeHTML(KENNUNG)), 'abgelöster Code: „nicht amtlich“, nicht „eigene Beschreibung“');
  }
  const ohneKennung = new Set(['ICD-10-GM E11.9'].map(V.escapeHTML));
  assert.match(anzeigeBefund(V, liste, feld, alt, ohneKennung).join('\n'), /Ansicht: „Diabetes mellitus Typ 2, ohne Komplikationen“ ist weder amtlich/,
    'Diskriminante: ohne die Kennzeichnung in der erlaubten Menge meldet die Probe den eigenen Text');
  // Freitext der Bürgerin (ohne Code) ist kein ICD-Titel und bleibt, wie er ist.
  assert.equal(V.codeChipInhaltHTML(liste, { text: 'Rücken seit 2019' }), 'Rücken seit 2019');
  // Ein Altwert als Einzelwert (vor der Chip-Mechanik) geht durch dieselbe Anzeigestelle.
  const einzel = V.feldWertHTML({ id: 'x', typ: 'text' }, { anzeigeName: ALT_EIGEN, code: 'E11.90', system: liste.uri, systemId: 'icd10' });
  assert.ok(einzel.includes(V.escapeHTML(e1190.quellBegriff)) && !einzel.includes(V.escapeHTML(ALT_EIGEN)), 'Einzel-Altwert: amtlich statt eigenem Namen');
});

test('[ICD-Anzeige·Kern·Rot-Beweis] ein Kern ohne die Anzeigestelle (Mutation an einer Kopie) zeigt den gespeicherten eigenen Namen und fällt', () => {
  const quelle = lesen('vivodepot.html');
  const zeile = '  if (!liste || !liste.herkunftPflicht) return escapeHTML(text) + codeHTML;';
  assert.equal(quelle.split(zeile).length, 2, 'Vorbedingung: die Weiche der Anzeigestelle steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icd-anzeige-'));
  try {
    const pfad = path.join(dir, 'kern.html');
    fs.writeFileSync(pfad, quelle.replace(zeile, '  return escapeHTML(text) + codeHTML;'));
    const { V } = ladeKern({ htmlPfad: pfad, backen: true });
    const liste = V.liesCodeListe('icd10');
    const e1190 = LISTE.daten.find((d) => d.code === 'E11.90');
    const frueher = { text: ALT_EIGEN, code: { system: liste.uri, code: 'E11.90' } };
    const erlaubt = new Set([e1190.anzeigeName, e1190.quellBegriff, 'ICD-10-GM E11.90'].map(V.escapeHTML));
    const funde = anzeigeBefund(V, liste, { id: 'probe', typ: 'text', codeListe: 'icd10', label: 'Probe' }, frueher, erlaubt).join('\n');
    assert.match(funde, /Ansicht: „Diabetes mellitus Typ 2, ohne Komplikationen“ ist weder amtlich/);
    assert.match(funde, /Bearbeiten: „Diabetes mellitus Typ 2, ohne Komplikationen“/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[ICD-Anzeige·Werkzeug] der Auszug wird zeichengleich gegen das Verzeichnis geprüft; Rot-Beweis an Text, Code und Druckkennzeichen', () => {
  const dir = path.join(REPO, 'tests', 'fixtures', 'icd-alphabet');
  const text = fs.readFileSync(path.join(dir, 'alphabet.txt'), 'utf8');
  const liste = JSON.parse(fs.readFileSync(path.join(dir, 'liste.json'), 'utf8'));
  assert.deepEqual(WZ.befund(text, liste), []);
  const falsch = { alphabet: { eintraege: [
    { nr: '90002', code: 'X00.00', text: 'Beispielkrankheit, ohne Komplikation' },
    { nr: '90005', code: 'X00.00', text: 'Andere Beispielkrankheit' },
    { nr: '90004', code: 'X00.00', text: 'Beispielleiden, nur elektronisch' },
    { nr: '99999', code: 'X00.00', text: 'gibt es nicht' },
  ] } };
  const f = WZ.befund(text, falsch).join('\n');
  for (const r of [/90002: „Beispielkrankheit, ohne Komplikation“/, /90005: Code X00\.00 statt X00\.10/, /90004: nicht in der Buchfassung/, /99999: Nummer nicht im Verzeichnis/]) assert.match(f, r);
  assert.deepEqual(WZ.kandidaten(text, 'X00.00').map((z) => z.split('  ')[0]), ['90002', '90003']);
  // Dieselbe Prüfung mit Zeilenende CRLF, wie die BfArM-Datei sie trägt.
  assert.deepEqual(WZ.befund(text.replace(/\n/g, '\r\n'), liste), []);
});

/* Die Beispiel-Vorlagen des Studios (BEISPIEL_TEMPLATES in vivodepot-studio.html) tragen eigene codeWerte. Am 06.10.2026
   stand dort zu E11.90 „Diabetes mellitus Typ 2“, ein eigener Name, der nicht im Verzeichnis steht. Jeder ICD-Text dort ist
   belegt wie in der Liste. Ein Code, den die Liste nicht führt, steht unten mit seiner BfArM-Nummer (Alphabetisches Verzeichnis
   2026, Druckkennzeichen 1; nachsehen: awk -F'|' '$4=="F03"' icd10gm2026alpha_edvtxt_20250926.txt). Die Liste kann nur schrumpfen. */
const STUDIO_AUSSERHALB_DER_LISTE = Object.freeze({ 'F03|Demenz': '13678' });
function studioIcdBefund(html) {
  const funde = [];
  const block = /codeSystem: 'http:\/\/fhir\.de\/CodeSystem\/bfarm\/icd-10-gm',\s*codeWerte: \[([\s\S]*?)\]/g;
  for (const m of html.matchAll(block)) {
    for (const w of m[1].matchAll(/\{ code: '([^']+)', anzeige: '([^']+)' \}/g)) {
      const [, code, text] = w;
      const d = LISTE.daten.find((x) => x.code === code);
      const belegt = d
        ? text === d.quellBegriff || LISTE.alphabet.eintraege.some((a) => a.code === code && a.text === text)
        : Object.prototype.hasOwnProperty.call(STUDIO_AUSSERHALB_DER_LISTE, code + '|' + text);
      if (!belegt) funde.push(code + ': „' + text + '“');
    }
  }
  return funde;
}
test('[ICD-Anzeige·Studio] jeder ICD-Text der Studio-Beispielvorlagen ist amtlich belegt', () => {
  const html = lesen('vivodepot-studio.html');
  assert.ok(/codeSystem: 'http:\/\/fhir\.de\/CodeSystem\/bfarm\/icd-10-gm'/.test(html), 'Vorbedingung: die Vorlage mit ICD-Werten wird gefunden');
  assert.deepEqual(studioIcdBefund(html), []);
  const alt = html.replace("{ code: 'E11.90', anzeige: 'Typ-2-Diabetes mellitus ohne Komplikation' }", "{ code: 'E11.90', anzeige: 'Diabetes mellitus Typ 2' }");
  assert.notEqual(alt, html, 'Vorbedingung des Rot-Beweises: die Stelle wird ersetzt');
  assert.deepEqual(studioIcdBefund(alt), ['E11.90: „Diabetes mellitus Typ 2“'], 'Rot-Beweis: der alte eigene Name fällt');
});

/* Klartextwege (PDF, QR, Notfallkarte über feldWertText): auch dort steht bei einem älteren Depot nicht der früher
   gespeicherte eigene Name, sondern der Begriff der Liste; ein Code, den die Liste nicht führt, trägt „nicht amtlich“. */
test('[ICD-Anzeige·Klartext] PDF/QR und Notfallkarte zeigen den Begriff der Liste; abgelöster Code gekennzeichnet; Rot-Beweis am alten Namen', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  V.akteurSelbstErklaeren('Tester');   // ohne Sitzungs-Akteur stempelt sektorFeldSetzen nicht
  const liste = V.liesCodeListe('icd10');
  const e1190 = LISTE.daten.find((d) => d.code === 'E11.90');
  const feld = { id: 'probe', typ: 'text', codeListe: 'icd10', label: 'Probe' };
  const frueher = { text: ALT_EIGEN, code: { system: liste.uri, code: 'E11.90' } };
  const abgeloest = { text: ALT_EIGEN, code: { system: liste.uri, code: 'E11.9' } };
  assert.equal(V.feldWertText(feld, [frueher]), e1190.anzeigeName);
  assert.equal(V.feldWertText(feld, [abgeloest]), ALT_EIGEN + ' (' + NICHT_AMTLICH + ')');
  assert.equal(V.feldWertText(feld, [{ text: 'Rücken seit 2019' }]), 'Rücken seit 2019', 'Freitext bleibt, wie er ist');
  V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [frueher]);
  const karte = JSON.stringify(V.notfallKernModell());
  assert.ok(karte.includes(e1190.anzeigeName) && !karte.includes(ALT_EIGEN), 'Notfallkarte: Begriff der Liste statt des alten Namens');
  // Rot-Beweis: der gespeicherte Text allein (der Weg bis zum 06.10.2026) trüge den alten eigenen Namen.
  assert.equal(frueher.text, ALT_EIGEN);
  assert.notEqual(V.codeChipKlartext(liste, frueher), frueher.text);
});

/* Die Quellenangabe Band 2 (Zi-Diagnosenthesaurus) ist Wortlaut des Rechteinhabers. Ihre Quelle steht mit Abrufdatum und
   sha256 im Freigabe-Register; nachsehen: unzip -p icd10gm2026alpha-txt.zip downloadbedingungen-2025.pdf | shasum -a 256. */
test('[ICD-Anzeige·Quelle] Band 2 der Quellenangabe nennt Datei, Abrufdatum und sha256; der Wortlaut trägt das Zi', () => {
  const q = REGISTER.icd10.lizenzQuelleBand2 || {};
  assert.ok(q.datei && q.fassung && /^\d{4}-\d{2}-\d{2}$/.test(q.abgerufen || ''), 'Datei, Fassung, Abrufdatum');
  assert.match(q.sha256Datei || '', /^[0-9a-f]{64}$/);
  assert.match(q.sha256Zip || '', /^[0-9a-f]{64}$/);
  assert.match(lesen('code-listen/wortlaut/icd-10-gm-quellenangabe.txt'), /Zentralinstitut für die kassenärztliche Versorgung/);
});
