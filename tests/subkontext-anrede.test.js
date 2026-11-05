'use strict';
/* ═══════════════════════════════════════════════════════
   subkontext-anrede.test.js — im geöffneten Sub-Depot spricht kein Bereichstext die lesende Person an
   ───────────────────────────────────────────────────────
   BEFUND SUBKONTEXT-ANREDE (MITTEL, 31.10.2026, Vorschau v998): im Sub-Depot stand über der Identität „Name, Foto,
   Kontakt — das Deckblatt Ihres Depots.“ und im Deckblatt der Platzhalter „Ihr Name“. Das Depot gehört dort einer
   anderen Person; wer liest, verwaltet es nur.

   DER WEG: je Bereich eine Sub-Fassung `<bereich>.einfuehrungstextSub` in der dritten Person (Textart in TEXTSATZ_ARTEN,
   nur beim Zeichnen gelesen) und der Platzhalter `strings:deckblattNamePlatzhalterSub`. Gewählt wird an der Zeichenstelle,
   in bereichEinfuehrungImKontext() (Bereichsseite und Vorlesen) — der Sub-Kontext baut die Bereiche aus der Datei neu auf.

   DIE KLASSE: jede Einführung, die im Sub-Kontext gezeigt würde — Sub-Fassung, sonst die gewöhnliche —, in allen vier
   ausgelieferten Sprachmodulen (DE, EN, Pro DE, Pro EN), dazu der Kern selbst im Sub-Kontext. Keine Ausnahmeliste.

   WAS ALS ANREDE ZÄHLT: nur eindeutige Formen. Im Deutschen „Ihr…“/„Ihnen“ (großgeschrieben) und „Sie“ im Satzinneren;
   „Sie“ am Satzanfang kann auch „sie“ (die Person) heißen und zählt darum nicht. Im Englischen „you“/„your“/„yours“.
   ═══════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');
const { baueModul: baueDeModul } = require('../tools/textsatz-de-modul-erzeugen.js');
const { baueModul: baueEnModul } = require('../tools/textsatz-en-modul-erzeugen.js');

const PRO_MODULE = ['textsatz-de-pro-modul.json', 'textsatz-en-pro-modul.json'];

const ANREDE_DE = /\b(?:Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres|Ihnen)\b|(?<=[a-zäöüß,;:]\s+)Sie\b/;
const ANREDE_EN = /\b(?:you|your|yours|yourself)\b/i;

function anrede(text, sprache) {
  const m = (sprache === 'en' ? ANREDE_EN : ANREDE_DE).exec(text);
  return m ? m[0] : null;
}

// Die eine Messfunktion für Probe und Rot-Beweis: was der Getter im Sub-Kontext zeigen würde, je Bereich.
function anredeImSubKontext(texte, sprache) {
  const funde = [];
  for (const k of Object.keys(texte)) {
    if (!k.endsWith('.einfuehrungstext')) continue;
    const sub = texte[k + 'Sub'];
    const gezeigt = (typeof sub === 'string' && sub.trim()) ? sub : texte[k];
    const wort = typeof gezeigt === 'string' ? anrede(gezeigt, sprache) : null;
    if (wort) funde.push(k + ' (' + sprache + ', „' + wort + '“)');
  }
  const platzhalter = texte['strings:deckblattNamePlatzhalterSub.text'];
  if (typeof platzhalter !== 'string' || !platzhalter.trim()) funde.push('strings:deckblattNamePlatzhalterSub.text fehlt (' + sprache + ')');
  else if (anrede(platzhalter, sprache)) funde.push('strings:deckblattNamePlatzhalterSub.text (' + sprache + ')');
  return funde;
}

function proTexte(datei) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', datei), 'utf8')).texte;
}

test('[Sub-Anrede·Module] keine Einführung spricht im Sub-Kontext an, DE, EN, Pro DE und Pro EN', () => {
  const satze = [
    ['de', baueDeModul().texte], ['en', baueEnModul().texte],
    ['de', proTexte(PRO_MODULE[0])], ['en', proTexte(PRO_MODULE[1])],
  ];
  const funde = [];
  for (const [sprache, texte] of satze) {
    assert.ok(Object.keys(texte).filter((k) => k.endsWith('.einfuehrungstext')).length >= 10, 'Vorprüfung: der Satz trägt Einführungen');
    funde.push(...anredeImSubKontext(texte, sprache));
  }
  assert.deepEqual(funde, [], 'Anrede im Sub-Kontext:\n  ' + funde.join('\n  '));
});

test('[Sub-Anrede·Module] Rot-Beweis: eine Einführung ohne Sub-Fassung, eine Sub-Fassung mit Anrede und ein fehlender Platzhalter werden gemeldet', () => {
  const de = {
    'a.einfuehrungstext': 'Das Deckblatt Ihres Depots.',
    'b.einfuehrungstext': 'Was Sie bewegt.', 'b.einfuehrungstextSub': 'Hier halten Sie fest, was es gibt.',
    'c.einfuehrungstext': 'Wo liegen Ihre Konten?', 'c.einfuehrungstextSub': 'Wo liegen die Konten der Person?',
    'd.einfuehrungstext': 'Sie kümmert sich um alles.',
  };
  assert.deepEqual(anredeImSubKontext(de, 'de'), [
    'a.einfuehrungstext (de, „Ihres“)', 'b.einfuehrungstext (de, „Sie“)',
    'strings:deckblattNamePlatzhalterSub.text fehlt (de)',
  ]);
  const en = { 'a.einfuehrungstext': 'The cover page of your depot.', 'strings:deckblattNamePlatzhalterSub.text': 'Your name' };
  assert.deepEqual(anredeImSubKontext(en, 'en'), ['a.einfuehrungstext (en, „your“)', 'strings:deckblattNamePlatzhalterSub.text (en)']);
});

async function subKern(opts) {
  const { V } = ladeKern(Object.assign({ zusatzBindungen: ['deckblattHTML', 'bereichEinfuehrungImKontext'] }, opts || {}));
  await V.depotAnlegen('subkontext-anrede-anker-1!');
  V.akteurSelbstErklaeren('Anker Person');
  const eintrag = await V.subDepotAnlegen({ bezeichnung: 'Sub Testperson', inhaberin: 'Testperson', verwaltungsTyp: 'verwaltet' }, 'subkontext-anrede-sub-1!');
  await V.subDepotVertrauenOeffnen(eintrag.depotUUID, 'subkontext-anrede-sub-1!');
  V.subKontextBetreten(eintrag.depotUUID);
  return V;
}

function kernFunde(V) {
  const funde = [];
  for (const [id, s] of Object.entries(V.SEKTOR_BY_ID)) {
    const t = V.__zusatz.bereichEinfuehrungImKontext(s);
    const wort = typeof t === 'string' ? anrede(t, 'de') : null;
    if (wort) funde.push(id + ' („' + wort + '“)');
  }
  const deckblatt = V.__zusatz.deckblattHTML(V.SEKTOR_BY_ID.identity, {});
  const wort = anrede(deckblatt.replace(/<[^>]*>/g, ' '), 'de');
  if (wort) funde.push('Deckblatt („' + wort + '“)');
  return funde;
}

test('[Sub-Anrede·Kern] im Sub-Kontext zeigt der Kern keine Einführung mit Anrede, das Deckblatt „Name der Person“', async () => {
  const V = await subKern();
  assert.equal(V.imSubKontext(), true, 'Vorbedingung: im Sub-Kontext');
  assert.equal(V.__zusatz.bereichEinfuehrungImKontext(V.SEKTOR_BY_ID.identity), 'Name, Foto, Kontakt — das Deckblatt dieses Depots.');
  assert.match(V.__zusatz.deckblattHTML(V.SEKTOR_BY_ID.identity, {}), /Name der Person/);
  assert.deepEqual(kernFunde(V), []);
  await V.subKontextVerlassen();
  assert.equal(V.__zusatz.bereichEinfuehrungImKontext(V.SEKTOR_BY_ID.identity), 'Name, Foto, Kontakt — das Deckblatt Ihres Depots.', 'im eigenen Depot bleibt die Anrede');
  assert.match(V.__zusatz.deckblattHTML(V.SEKTOR_BY_ID.identity, {}), /Ihr Name/);
});

test('[Sub-Anrede·Kern] Rot-Beweis: ohne den Sub-Zweig an der Zeichenstelle meldet die Probe die Einführungen und das Deckblatt', async () => {
  const kern = fs.readFileSync(HTML_PATH, 'utf8');
  const getter = "try { t = textLesen(s.id + '.einfuehrungstextSub'); } catch (_) { t = null; }";
  const platzhalter = 'imSubKontext() ? STRINGS.deckblattNamePlatzhalterSub : STRINGS.deckblattNamePlatzhalter';
  assert.equal(kern.split(getter).length, 2, 'Vorprüfung: der Sub-Zweig steht genau einmal');
  assert.equal(kern.split(platzhalter).length, 2, 'Vorprüfung: die Platzhalter-Wahl steht genau einmal');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'sub-anrede-'));
  const datei = path.join(ordner, 'kern.html');
  fs.writeFileSync(datei, kern.replace(getter, '').replace(platzhalter, 'STRINGS.deckblattNamePlatzhalter'));
  try {
    const V = await subKern({ htmlPfad: datei, backen: true });
    const funde = kernFunde(V);
    assert.ok(funde.includes('identity („Ihres“)'), 'die Identität wird gemeldet: ' + funde.join(', '));
    assert.ok(funde.some((f) => f.startsWith('Deckblatt')), 'das Deckblatt wird gemeldet: ' + funde.join(', '));
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
