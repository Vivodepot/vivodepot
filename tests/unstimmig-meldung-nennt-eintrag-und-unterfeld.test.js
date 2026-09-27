'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Die Meldung „Diese Angaben sehen unvollständig oder unstimmig aus" nennt, WAS fehlt (22.09.2026).

   ANLASS. In Gerdas Depot (Vorführung) meldete „Als PDF" im Anlass Krankenhaus: „… unvollständig oder unstimmig aus:
   Vorsorge-Instrumente", obwohl zwei Instrumente eingetragen waren. Gemessen: die Prüfung ist eine ECHTE Feldprüfung,
   keine Zählung. `feldValidieren` liefert für eine Vorsorgevollmacht ohne „Art der Vollmacht" (Pflicht bei diesem Instrument)
   { ok: false, grund: 'liste-eintrag', eintrag: 0, feld: 'typeOfPowerOfAttorney', sub: 'pflicht' } — und die Meldung warf Eintrag
   und Unterfeld weg und zeigte nur das Feldlabel. Die Bürgerin sah zwei Einträge und hielt die richtige Meldung für falsch:
   eine richtige Meldung, die wie ein Fehlalarm aussieht, kostet Vertrauen in alle. Jetzt steht da, WELCHER Eintrag und WELCHES
   Unterfeld. Die Ursache in Gerdas Daten (fehlt dort wirklich ein Pflichtfeld?) ist unabhängig davon und hier nicht Gegenstand.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
async function offenesDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen('unstimmig-meldung-pw-2026!');
  return V;
}
const INSTRUMENTE = (V, liste) => { V.getData().sektoren.advanceCare = { provisionInstruments: liste }; };
const feldDef = (V) => V.feldDefFuer('advanceCare', 'provisionInstruments');
const unterfeldLabel = (V, id) => feldDef(V).unterFelder.find((u) => u.id === id).label;

test('[Meldung·Positivkontrolle] zwei vollständige Instrumente erzeugen keinen Fund', async () => {
  const V = await offenesDepot();
  INSTRUMENTE(V, [{ instrument: 'living-will' }, { instrument: 'will' }]);
  assert.deepEqual(V.exportUnstimmigeFelder('advanceCare').map((e) => e.feld), []);
});

test('[Meldung·1] der Fund trägt Eintrag, Unterfeld und Grund des Unterfelds — er wirft sie nicht weg', async () => {
  const V = await offenesDepot();
  INSTRUMENTE(V, [{ instrument: 'living-will' }, { instrument: 'enduring-power-of-attorney' }]);
  const funde = V.exportUnstimmigeFelder('advanceCare');
  assert.equal(funde.length, 1);
  assert.equal(funde[0].feld, 'provisionInstruments');
  assert.equal(funde[0].eintrag, 1, 'der zweite Eintrag (0-basiert 1)');
  assert.equal(funde[0].unterfeld, 'typeOfPowerOfAttorney');
  assert.equal(funde[0].sub, 'pflicht');
});

test('[Meldung·2] der Text nennt Feld, Eintrag (ab 1) und Unterfeld und sagt „fehlt"', async () => {
  const V = await offenesDepot();
  INSTRUMENTE(V, [{ instrument: 'living-will' }, { instrument: 'enduring-power-of-attorney' }]);
  const text = V._unstimmigFundeText(V.exportUnstimmigeFelder('advanceCare'));
  assert.ok(text.includes(V.feldDefFuer('advanceCare', 'provisionInstruments').label), 'das Feld: ' + text);
  assert.ok(text.includes('2'), 'der Eintrag, ab 1 gezählt: ' + text);
  assert.ok(text.includes(unterfeldLabel(V, 'typeOfPowerOfAttorney')), 'das Unterfeld: ' + text);
  assert.match(text, /fehlt/);
  assert.equal(/\{[a-z]+\}/.test(text), false, 'kein unaufgelöster Platzhalter: ' + text);
});

test('[Meldung·3] ein Unterfeld mit unbrauchbarem Wert heißt „unstimmig", nicht „fehlt"', async () => {
  const V = await offenesDepot();
  INSTRUMENTE(V, [{ instrument: 'living-will', dateOfLastChange: 'kein-datum' }]);
  const funde = V.exportUnstimmigeFelder('advanceCare');
  assert.equal(funde.length, 1, 'Vorbedingung: der unbrauchbare Wert wird beanstandet');
  assert.notEqual(funde[0].sub, 'pflicht');
  const text = V._unstimmigFundeText(funde);
  assert.ok(text.includes(unterfeldLabel(V, 'dateOfLastChange')), text);
  assert.match(text, /unstimmig/);
  assert.equal(/fehlt/.test(text), false);
});

test('[Meldung·3b] der Fall aus Gerdas Depot: ein Auswahlwert, den das Feld nicht kennt („vorsorgevollmacht" statt enduring-power-of-attorney), heißt „Instrument ist unstimmig"', async () => {
  const V = await offenesDepot();
  INSTRUMENTE(V, [{ instrument: 'vorsorgevollmacht' }, { instrument: 'betreuungsverfuegung' }]);
  const funde = V.exportUnstimmigeFelder('advanceCare');
  assert.equal(funde.length, 1, 'Vorbedingung: zwei Einträge, EINE Meldung, wie bei Gerda');
  assert.equal(funde[0].unterfeld, 'instrument');
  const text = V._unstimmigFundeText(funde);
  assert.ok(text.includes(unterfeldLabel(V, 'instrument')) && text.includes('1'), text);
  assert.match(text, /unstimmig/);
});

test('[Meldung·4] ein Fund OHNE Eintragsangabe (ein flaches Feld) bleibt beim Feldlabel — nichts wird erfunden', () => {
  const { V } = ladeKern();
  assert.equal(V._unstimmigFundText({ sektor: 'advanceCare', feld: 'x', label: 'Ein Feld', grund: 'pflicht' }), 'Ein Feld');
});

test('[Meldung·5] alle Stellen, die die Meldung bauen, nehmen den Text aus EINER Funktion (keine mehr, die nur das Label zeigt)', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const stellen = [...kern.matchAll(/STRINGS\.exportUnstimmigHinweis/g)];
  assert.ok(stellen.length >= 4, 'Vorbedingung: die vier Stellen werden gefunden (Positivkontrolle)');
  for (const m of stellen) {
    const nach = kern.slice(m.index, m.index + 260);
    assert.ok(nach.includes('_unstimmigFundeText('), 'Stelle ohne den gemeinsamen Text: ' + nach.replace(/\s+/g, ' ').slice(0, 160));
    assert.equal(/\.map\(\(e\) => e\.label\)\.join\(', '\)/.test(nach), false, 'baut die Liste noch selbst aus den Labels');
  }
});

test('[Meldung·6] die beiden neuen Texte stehen in Deutsch UND Englisch, mit allen drei Platzhaltern', () => {
  for (const datei of ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json']) {
    const t = JSON.parse(fs.readFileSync(path.join(REPO, datei), 'utf8')).texte;
    for (const k of ['strings:exportUnstimmigEintragFehlt.text', 'strings:exportUnstimmigEintragUnstimmig.text']) {
      assert.equal(typeof t[k], 'string', datei + ' ohne ' + k);
      for (const p of ['{feld}', '{n}', '{unterfeld}']) assert.ok(t[k].includes(p), datei + ' ' + k + ' ohne ' + p);
    }
  }
});
