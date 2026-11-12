'use strict';
/* Drei MITTEL-Funde am englischen Textsatz (04.11.2026), je eine Regel für die ganze Klasse:
   M-EN-NACHBILDUNG   „Nachbildung“ heißt im Englischen „recreation“ (U2-ADR-396), nirgends „replica“.
   M-EN-KATALOGFREMD  Der Satz zu Angaben aus fremden Vorlagen sagt „shown here“ nur einmal, und die Namen stehen in
                      Anführungszeichen der Sprache, nicht fest deutsch.
   M-EN-IMPORTLISTE   Die Glieder der Liste „Not imported: …“ beginnen einheitlich klein.
   Geprüft in allen englischen Textsätzen und am Kern; jede Regel mit Rot-Beweis am Stand vor dem Fix. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
// Öffentlich fehlen die zurückgehaltenen Pro-Textsätze; privat bleibt die volle Zahl Pflicht.
const MINDESTENS = require('./helfer/nur-privat.js').istOeffentlich() ? 1 : 2;
const EN_SAETZE = fs.readdirSync(path.join(REPO, 'tools')).filter((d) => /^textsatz-en.*-?modul\.json$/.test(d));
const lesen = (d) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', d), 'utf8')).texte;

function replicaStellen(texte) {
  return Object.entries(texte).filter(([, t]) => typeof t === 'string' && /\breplicas?\b/i.test(t)).map(([k]) => k);
}
function katalogFremdMaengel(texte) {
  const f = [];
  const satz = [texte['strings:katalogFremdEinzahl.text'], texte['strings:katalogFremdWoBereich.text']].join(' ');
  if ((satz.match(/shown here/gi) || []).length > 1) f.push('„shown here“ doppelt');
  return f;
}
function importListeMaengel(texte) {
  return Object.entries(texte).filter(([k, t]) => /^strings:importVollLabel[A-Za-z]+\.text$/.test(k) && /^\p{Lu}/u.test(String(t)))
    .map(([k]) => k);
}
function kernMaengel(kern) {
  const m = /function katalogFremdSatz\([^)]*\) \{([\s\S]*?)\n\}/.exec(kern);
  if (!m) return ['katalogFremdSatz fehlt'];
  const f = [];
  if (/'„'/.test(m[1])) f.push('festes deutsches Anführungszeichen');
  if (!/anfuehrungszeichen\(/.test(m[1])) f.push('ohne anfuehrungszeichen()');
  return f;
}

test('[EN·Begriffe] es gibt mindestens zwei englische Textsätze', () => {
  assert.ok(EN_SAETZE.length >= MINDESTENS, EN_SAETZE.join(', '));
});

test('[EN·Begriffe·M-EN-NACHBILDUNG] kein englischer Textsatz sagt „replica“', () => {
  for (const d of EN_SAETZE) assert.deepEqual(replicaStellen(lesen(d)), [], d);
});

test('[EN·Begriffe·M-EN-KATALOGFREMD] „shown here“ einmal, Anführung nach Sprache im Kern', () => {
  for (const d of EN_SAETZE) assert.deepEqual(katalogFremdMaengel(lesen(d)), [], d);
  assert.deepEqual(kernMaengel(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8')), []);
});

test('[EN·Begriffe·M-EN-IMPORTLISTE] die Glieder der Liste „Not imported“ beginnen klein', () => {
  for (const d of EN_SAETZE) assert.deepEqual(importListeMaengel(lesen(d)), [], d);
});

/* Deutsch, dieselben zwei Mängel: „angezeigt“ doppelt im katalogFremd-Satz; in der Importliste beginnt ein Glied groß mit einem
   Wort, das klein gehört (Artikel, Fragewort, Konjunktion oder ein Adjektiv vor einem Substantiv). Groß bleiben Substantive und
   die Anrede „Ihr/Ihre/Sie“. */
const DE_SAETZE = fs.readdirSync(path.join(REPO, 'tools')).filter((d) => /^textsatz-de.*-?modul\.json$/.test(d));
const KLEINWORT = new Set(['Der', 'Die', 'Das', 'Ein', 'Eine', 'Wer', 'Was', 'Wie', 'Wo', 'Ob', 'Weitere']);
function katalogFremdMaengelDe(texte) {
  const satz = [texte['strings:katalogFremdEinzahl.text'], texte['strings:katalogFremdWoBereich.text']].join(' ');
  return (satz.match(/angezeigt/g) || []).length > 1 ? ['„angezeigt“ doppelt'] : [];
}
function importListeMaengelDe(texte) {
  return Object.entries(texte).filter(([k]) => /^strings:importVollLabel[A-Za-z]+\.text$/.test(k)).filter(([, t]) => {
    const [erstes, zweites = ''] = String(t).split(' ');
    if (/^(Ihr|Ihre|Sie)$/.test(erstes) || !/^\p{Lu}/u.test(erstes)) return false;
    return KLEINWORT.has(erstes) || (/(e|en|er|es|em)$/.test(erstes) && /^\p{Lu}/u.test(zweites) && !/[-/]/.test(erstes));
  }).map(([k]) => k);
}

test('[DE·Begriffe·M-EN-KATALOGFREMD] auch deutsch steht „angezeigt“ nur einmal', () => {
  assert.ok(DE_SAETZE.length >= MINDESTENS, DE_SAETZE.join(', '));
  for (const d of DE_SAETZE) assert.deepEqual(katalogFremdMaengelDe(lesen(d)), [], d);
});

test('[DE·Begriffe·M-EN-IMPORTLISTE] kein Glied der Liste „Nicht übernommen“ beginnt mit großem Artikel, Fragewort oder Adjektiv', () => {
  for (const d of DE_SAETZE) assert.deepEqual(importListeMaengelDe(lesen(d)), [], d);
});

test('[DE·Begriffe·Rot-Beweis] der deutsche Stand vor dem Fix fällt, Anrede und Substantive bleiben groß', () => {
  const alt = {
    'strings:katalogFremdEinzahl.text': 'Eine Angabe aus einer zusätzlichen Vorlage wird hier nicht angezeigt',
    'strings:katalogFremdWoBereich.text': '— diese Art von Feld kann hier nicht angezeigt werden',
    'strings:importVollLabelMappe.text': 'Ihre Dokumente',
    'strings:importVollLabelUrheberschaft.text': 'Wer Ihre Einträge angelegt hat',
    'strings:importVollLabelAnkerWechselEmpfehlung.text': 'Die Anker-Wechsel-Empfehlung',
    'strings:importVollLabelTechnischeVersion.text': 'Technische Versionsangaben',
    'strings:importVollLabelVerwaltungsrolle.text': 'Ob Sie das Depot selbst verwalten oder jemand anderes',
    'strings:importVollLabelSitzungszustand.text': 'Anzeige-/Sitzungszustand dieser Datei',
    'strings:importVollLabelStrukturAllgemein.text': 'weitere Erweiterungen',
  };
  assert.deepEqual(katalogFremdMaengelDe(alt), ['„angezeigt“ doppelt']);
  assert.deepEqual(importListeMaengelDe(alt), ['strings:importVollLabelUrheberschaft.text', 'strings:importVollLabelAnkerWechselEmpfehlung.text',
    'strings:importVollLabelTechnischeVersion.text', 'strings:importVollLabelVerwaltungsrolle.text']);
});

test('[EN·Begriffe·Rot-Beweis] der Stand vor dem Fix fällt in allen drei Regeln', () => {
  const alt = {
    'wizard:kiwiz.basicDecision.label': 'Do you allow a digital replica?',
    'strings:katalogFremdEinzahl.text': 'One detail from an additional template is not shown here',
    'strings:katalogFremdWoBereich.text': '— this kind of field cannot be shown here',
    'strings:importVollLabelStrukturAllgemein.text': 'further extensions',
    'strings:importVollLabelTechnischeVersion.text': 'Technical version details',
  };
  assert.deepEqual(replicaStellen(alt), ['wizard:kiwiz.basicDecision.label']);
  assert.deepEqual(katalogFremdMaengel(alt), ['„shown here“ doppelt']);
  assert.deepEqual(importListeMaengel(alt), ['strings:importVollLabelTechnischeVersion.text']);
  const kernAlt = "function katalogFremdSatz(liste, wo) {\n  const namen = a.map(e => '„' + (e.label) + '\"');\n}";
  assert.deepEqual(kernMaengel(kernAlt), ['festes deutsches Anführungszeichen', 'ohne anfuehrungszeichen()']);
});

/* M-EN-VOLLMACHTEN (04.11.2026): „Vollmachten“ hieß als Bereichsname im Englischen nur „Powers“, unklar ohne „of attorney“. */
function nurPowers(texte) {
  return Object.entries(texte).filter(([, t]) => typeof t === 'string' && /^powers$/i.test(t.trim())).map(([k]) => k);
}
test('[EN·Begriffe·M-EN-VOLLMACHTEN] kein englischer Text heißt nur „Powers“, der Bereich heißt „Powers of attorney“', () => {
  for (const d of EN_SAETZE) {
    assert.deepEqual(nurPowers(lesen(d)), [], d);
    assert.equal(lesen(d)['pro-vertretung-vollmachten.label'], 'Powers of attorney', d);
  }
  assert.deepEqual(nurPowers({ 'pro-vertretung-vollmachten.label': 'Powers' }), ['pro-vertretung-vollmachten.label'], 'Rot-Beweis');
});
