'use strict';
/* M-ZAHL-EINZAHL (MITTEL, 04.11.2026): die Vorschau „Das wird eingelesen“ sagte „1 neue Einträge werden hinzugefügt“.
   Regel für die ganze Klasse: ein Text, der eine Zahl in einen Satz mit Verb setzt („{n} … werden/wurden/konnten“,
   „{n} … were/are/could“), hat eine eigene Einzahl daneben, und der Kern wählt sie nach der Zahl (nachZahl).
   0 und jede Zahl außer 1 nehmen die Mehrzahl. Geprüft in allen vier Textsätzen und am Kern, mit Rot-Beweis. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
// Öffentlich fehlen die zurückgehaltenen Pro-Textsätze; privat bleibt die volle Zahl Pflicht.
const { istOeffentlich } = require('./helfer/nur-privat.js');
const SAETZE = fs.readdirSync(path.join(REPO, 'tools')).filter((d) => /^textsatz-(de|en)(-pro)?-modul\.json$/.test(d));
const lesen = (d) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', d), 'utf8')).texte;
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

/* Die Zahl steht im Text, ein Verb folgt im selben Satz. „Alle {n}“ ist nie Einzahl und zählt nicht. */
const VERB = /\{(n|anzahl|zahl)\}[^.!?]*?\b(werden|wurden|konnten|erscheinen|sind|were|are|will be|could|have been)\b/;
function einzahlFuer(texte, k) {
  const basis = k.replace(/\.text$/, '').replace(/(Mehrzahl|Mehrere)$/, '');
  const endung = k.endsWith('.text') ? '.text' : '';
  return [basis + 'Einzahl' + endung, basis + 'Eins' + endung].find((e) => typeof texte[e] === 'string');
}
function klassenMaengel(texte) {
  const f = [];
  for (const [k, t] of Object.entries(texte)) {
    if (typeof t !== 'string' || !VERB.test(t) || /\b(Alle|All) \{/.test(t)) continue;
    if (!einzahlFuer(texte, k)) f.push(k + ': ohne Einzahl');
    if (/\w\((n|en|er|e|s)\)/.test(t)) f.push(k + ': Klammerform');
  }
  return f;
}

/* Der Text wird außerhalb zusammengesetzt (Zahl + Leerzeichen + Text): die Einzahl muss trotzdem daneben stehen. */
const ZUSAMMENGESETZT = ['strings:importEintraegeNeu.text'];
const AUFRUFE = [
  ['strings:importEintraegeNeu.text', "nachZahl(l.anzahl, STRINGS.importEintraegeNeuEinzahl, STRINGS.importEintraegeNeu)"],
  ['strings:importTemplateVerworfenAnzahl.text', "nachZahl(_tplV.length, STRINGS.importTemplateVerworfenAnzahlEinzahl, STRINGS.importTemplateVerworfenAnzahl)"],
  ['strings:anlassAusgabeFertigMitZurueck.text', "nachZahl(teile[0], STRINGS.anlassAusgabeFertigMitZurueckEinzahl, STRINGS.anlassAusgabeFertigMitZurueck)"],
  ['strings:fassungenAutomatischHinweis.text', "nachZahl(vergleich.automatisch.length, STRINGS.fassungenAutomatischHinweisEinzahl, STRINGS.fassungenAutomatischHinweis)"],
  ['strings:fassungenAutomatischHinweis.text', "nachZahl(r.uebernommen, STRINGS.fassungenAutomatischHinweisEinzahl, STRINGS.fassungenAutomatischHinweis)"],
  ['strings:moduleEinlassenUnvollstaendig.text', "nachZahl(r.verloreneZuordnungen || 0, STRINGS.moduleEinlassenUnvollstaendigEinzahl, STRINGS.moduleEinlassenUnvollstaendig)"],
  ['dokument.uebersetzungOffen', "nachZahl(_offen, textLesen('dokument.uebersetzungOffenEinzahl'), textLesen('dokument.uebersetzungOffen'))"],
];
function kernMaengel(kern) {
  return AUFRUFE.filter(([, aufruf]) => !kern.includes(aufruf)).map(([k]) => k + ': Kern wählt nicht nach der Zahl');
}

function nachZahlAusKern(kern) {
  const m = /function nachZahl\(n, einzahl, mehrzahl\) \{[\s\S]*?\n\}/.exec(kern);
  assert.ok(m, 'nachZahl fehlt im Kern');
  return new Function(m[0] + '\nreturn nachZahl;')();
}

/* Wie der Kern den Satz bildet: zusammengesetzt (Zahl + Text) oder mit Platzhalter. */
function satz(texte, k, n) {
  const nachZahl = nachZahlAusKern(KERN);
  const t = nachZahl(n, texte[einzahlFuer(texte, k)], texte[k]);
  return ZUSAMMENGESETZT.includes(k) ? n + ' ' + t : t.replace(/\{(n|anzahl)\}/, String(n));
}

test('[Einzahl·Klasse] in allen vier Textsätzen hat jeder Satz „{n} … Verb“ eine Einzahl und keine Klammerform', () => {
  assert.equal(SAETZE.length, istOeffentlich() ? 2 : 4, SAETZE.join(', '));
  for (const d of SAETZE) {
    const texte = lesen(d);
    assert.deepEqual(klassenMaengel(texte), [], d);
    for (const k of ZUSAMMENGESETZT) assert.ok(einzahlFuer(texte, k), d + ' ' + k);
  }
});

test('[Einzahl·Kern] nachZahl: 0 → Mehrzahl, 1 → Einzahl, 2 → Mehrzahl; jede Aufrufstelle wählt danach', () => {
  const nachZahl = nachZahlAusKern(KERN);
  assert.deepEqual([0, 1, 2, '1', '2'].map((n) => nachZahl(n, 'E', 'M')), ['M', 'E', 'M', 'E', 'M']);
  assert.deepEqual(kernMaengel(KERN), []);
});

test('[Einzahl·Sätze] 0, 1 und 2 ergeben in DE und EN den richtigen Satz', () => {
  for (const d of SAETZE) {
    const texte = lesen(d);
    const de = d.startsWith('textsatz-de');
    for (const [k] of AUFRUFE) {
      const [null_, eins, zwei] = [0, 1, 2].map((n) => satz(texte, k, n));
      assert.ok(!/\{\w+\}/.test(eins + zwei + null_), d + ' ' + k + ': Platzhalter bleibt stehen');
      assert.notEqual(eins, zwei.replace('2', '1'), d + ' ' + k + ': Einzahl ist nur die Mehrzahl mit 1');
      assert.equal(null_, zwei.replace('2', '0'), d + ' ' + k + ': 0 nimmt die Mehrzahl');
    }
    assert.equal(satz(texte, 'strings:importEintraegeNeu.text', 1), de ? '1 neuer Eintrag wird hinzugefügt' : '1 new entry will be added', d);
    assert.equal(satz(texte, 'strings:importEintraegeNeu.text', 2), de ? '2 neue Einträge werden hinzugefügt' : '2 new entries will be added', d);
    assert.equal(satz(texte, 'strings:importEintraegeNeu.text', 0), de ? '0 neue Einträge werden hinzugefügt' : '0 new entries will be added', d);
  }
});

test('[Einzahl·Rot-Beweis] der Stand vor dem Fix fällt an Textsatz und Kern', () => {
  const alt = {
    'strings:importTemplateVerworfenAnzahl.text': '{n} Felder aus dieser Vorlage wurden nicht übernommen.',
    'strings:fassungenAutomatischHinweis.text': '{n} Feld(er) wurden automatisch zusammengeführt — nur eine der beiden Fassungen hatte sie geändert.',
    'strings:katalogFremdEinzahl.text': 'Eine Angabe aus einer zusätzlichen Vorlage wird hier nicht angezeigt',
    'strings:katalogFremdMehrzahl.text': '{n} Angaben aus zusätzlichen Vorlagen werden hier nicht angezeigt',
    'strings:iso4217AbgleichStimmt.text': 'All {n} currency entries of the templates and extensions are in it.',
  };
  assert.deepEqual(klassenMaengel(alt), ['strings:importTemplateVerworfenAnzahl.text: ohne Einzahl',
    'strings:fassungenAutomatischHinweis.text: ohne Einzahl', 'strings:fassungenAutomatischHinweis.text: Klammerform']);
  const kernAlt = "koerper += '<li>' + esc(l.label) + ': ' + l.anzahl + ' ' + esc(STRINGS.importEintraegeNeu) + '</li>';";
  assert.equal(kernMaengel(kernAlt).length, AUFRUFE.length);
});
