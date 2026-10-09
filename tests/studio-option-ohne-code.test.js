'use strict';
/* Befund STUDIO-OPTION-OHNE-CODE-STILL-VERWORFEN (HOCH, 06.10.2026).

   Im Studio hat eine Auswahl-Option drei Kästchen: Code, Klartext-Anzeige, Synonym. Wer nur den
   sichtbaren Text einträgt („Fördermitglied"), lässt den Code leer. `.filter((c) => c.code)` in
   `_normalisiereFeldRein` warf diese Option weg: sie fehlte in Vorschau und signiertem Paket, und die
   Vorprüfung meldete trotzdem „Alle Felder kommen beim Empfänger an". Derselbe Verlust im CSV-Weg
   (`parseCodeWerte`, Zelle „:Fördermitglied").

   Jetzt: eine Option mit Inhalt kommt immer an. Fehlt der Code, entsteht er aus dem Anzeigetext
   (eindeutig im Feld). Nur eine ganz leere Zeile fällt weg — sie trägt keine Angabe.

   Rot-Beweis: gegen das Studio ohne diesen Fix (018390ee5) fallen alle neun Proben dieser Datei,
   jede an ihrer Behauptung, keine an einem Ladefehler.

   Die Klassenprobe unten hält jede `.filter`-Stelle im Ausgabeweg Feld → Paket fest: jede steht mit
   Grund in der Liste; eine neue fällt auf. Kern und Lese-App dürfen beim Einlass keine Code-Werte
   herausfiltern. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const REPO = path.join(__dirname, '..');
const { V: G } = ladeGenerator();
const KT = G.KERN_TORWAECHTER;
const j = (x) => JSON.parse(JSON.stringify(x));

const MITGLIEDSART = {
  feldname: 'Mitgliedsart', feldtyp: 'auswahl', pflicht: false, bereich: 'identity',
  codeWerte: [
    { code: 'option-1', anzeige: 'Ordentliches Mitglied' },
    { code: '', anzeige: 'Fördermitglied' },
    { code: '   ', anzeige: 'Ehrenmitglied', synonym: 'Ehren' },
    { code: '', anzeige: '' },
  ],
};

test('[Option ohne Code] jede Option mit Anzeigetext übersteht die Normalisierung, der Code entsteht aus dem Text', () => {
  const feld = j(G.normalisiereFeld(MITGLIEDSART));
  assert.deepEqual(feld.codeWerte.map((c) => c.anzeige), ['Ordentliches Mitglied', 'Fördermitglied', 'Ehrenmitglied']);
  assert.deepEqual(feld.codeWerte.map((c) => c.code), ['option-1', 'foerdermitglied', 'ehrenmitglied']);
  assert.equal(feld.codeWerte[2].synonym, 'Ehren');
  assert.equal(KT.validateTemplate({ felder: [feld] }), null, 'der Kern nimmt das Feld an');
});

test('[Option ohne Code] abgeleitete Codes sind im Feld eindeutig; ein Text ohne Buchstaben bekommt eine Nummer', () => {
  const feld = j(G.normalisiereFeld({ feldname: 'Wahl', feldtyp: 'auswahl', bereich: 'identity', codeWerte: [
    { code: 'ja', anzeige: 'Ja' }, { code: '', anzeige: 'Ja' }, { code: '', anzeige: 'JA!' }, { code: '', anzeige: '???' }] }));
  const codes = feld.codeWerte.map((c) => c.code);
  assert.deepEqual(codes, ['ja', 'ja-2', 'ja-3', 'option-4']);
  assert.equal(new Set(codes).size, codes.length);
});

test('[Option ohne Code] dasselbe in Unterfeldern einer Liste', () => {
  const feld = j(G.normalisiereFeld({ feldname: 'Kinder', feldtyp: 'liste', bereich: 'identity', unterFelder: [
    { feldname: 'Status', feldtyp: 'auswahl', codeWerte: [{ code: 'a', anzeige: 'Schule' }, { code: '', anzeige: 'Ausbildung' }] }] }));
  assert.deepEqual(feld.unterFelder[0].codeWerte, [{ code: 'a', anzeige: 'Schule' }, { code: 'ausbildung', anzeige: 'Ausbildung' }]);
});

test('[Option ohne Code] das signierte Paket trägt alle drei Optionen', () => {
  const t = j(G.baueTemplateObjekt({ felder: [MITGLIEDSART] }));
  const f = (t.template || t).felder.find((x) => x.feldname === 'Mitgliedsart');
  assert.equal(f.codeWerte.length, 3, JSON.stringify(f.codeWerte));
});

test('[Option ohne Code] CSV: eine Zelle „:Fördermitglied" verliert die Option nicht', () => {
  const roh = j(G.parseCodeWerte('ord:Ordentliches Mitglied;:Fördermitglied;;'));
  assert.equal(roh.length, 2, JSON.stringify(roh));
  const feld = j(G.normalisiereFeld({ feldname: 'M', feldtyp: 'auswahl', bereich: 'identity', codeWerte: roh }));
  assert.deepEqual(feld.codeWerte.map((c) => c.code), ['ord', 'foerdermitglied']);
});

test('[Vorprüfung] ein Unterfeld ohne Namen, aber mit Inhalt, wird gemeldet — beim Anlegen und in der Fehlstellen-Auskunft', () => {
  const roh = { feldname: 'Kinder', feldtyp: 'liste', bereich: 'identity', unterFelder: [
    { feldname: 'Name', feldtyp: 'text' }, { feldname: '', feldtyp: 'auswahl', codeWerte: [{ code: 'x', anzeige: 'X' }] }] };
  const b = j(G.normalisiereFeldBefund(roh));
  assert.equal(b.feld.unterFelder.length, 1);
  assert.ok(b.angeglichen.some((a) => a.was === 'unterFelder'), JSON.stringify(b.angeglichen));
  const saetze = G.fehlstellenSaetze(G.fehlstellenAuskunft({ felder: [roh] }));
  assert.ok(saetze.length >= 1, 'die Vorprüfung meldet keine Vollständigkeit, wenn etwas fehlt');
});

test('[Vorprüfung] eine Option ohne Code ist kein Verlust mehr — die Auskunft bleibt leer', () => {
  // STATE.felder trägt im Studio immer die normalisierte Form (Editor, CSV, Bündel gehen über normalisiereFeldBefund).
  const feld = G.normalisiereFeld(MITGLIEDSART);
  assert.equal(j(feld).codeWerte.length, 3);
  assert.deepEqual(j(G.fehlstellenSaetze(G.fehlstellenAuskunft({ felder: [feld] }))), []);
});

/* ── Klassenprobe ──────────────────────────────────────────────────────────────────────────── */
const STUDIO = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
function funktionsKoerper(quelle, name) {
  const i = quelle.indexOf('\nfunction ' + name + '(');
  assert.ok(i >= 0, 'Funktion ' + name + ' fehlt im Studio — Ausgabeweg umbenannt? Liste unten nachziehen');
  const ende = quelle.indexOf('\n}\n', i);
  return quelle.slice(i, ende);
}
/* Der Ausgabeweg Feld → Paket. Jede `.filter`-Stelle darin steht hier mit Grund. Verwirft eine Stelle
   Inhalt, braucht sie eine Meldung (angeglichen) und eine Probe oben. */
const AUSGABEWEG_FILTER = {
  parseCodeWerte: { 'Boolean': 'nur ganz leere Teile der Zelle (kein Code, kein Text)' },
  csvParseZeilen: { "(z) => z.some((x) => String(x).trim() !== '')": 'nur ganz leere CSV-Zeilen' },
  csvZuFelder: {},
  normalisiereFeldBefund: {},
  _codeWertHatInhalt: {},
  _codeAusText: { 'Boolean': 'nur leere Wortteile beim Ableiten des Codes' },
  _codeWerteNormalisieren: {
    '_codeWertHatInhalt': 'nur ganz leere Options-Zeilen; fehlt nur der Code, entsteht er aus dem Text',
    'Boolean': 'nur leere Codes beim Sammeln der vergebenen — keine Option',
  },
  _normalisiereFeldRein: {
    'Boolean': 'nur leere Marken nach trim',
    '(u) => u.feldname': 'Unterfeld ohne Namen; mit Inhalt gemeldet in normalisiereFeldBefund (was: unterFelder)',
  },
  felderAngleichungen: {},
  baueTemplateObjekt: {},
  baueSubmission: {},
  baueSammelSubmission: {},
};

test('[Klassenprobe] jede .filter-Stelle im Ausgabeweg Feld → Paket steht mit Grund in der Liste', () => {
  for (const [fn, erlaubt] of Object.entries(AUSGABEWEG_FILTER)) {
    const koerper = funktionsKoerper(STUDIO, fn);
    const gefunden = [];
    const re = /\.filter\(/g;
    let m;
    while ((m = re.exec(koerper))) {
      // das Prädikat bis zur schließenden Klammer auf gleicher Tiefe
      let tiefe = 1, k = m.index + m[0].length;
      while (k < koerper.length && tiefe) { if (koerper[k] === '(') tiefe++; else if (koerper[k] === ')') tiefe--; k++; }
      gefunden.push(koerper.slice(m.index + m[0].length, k - 1).trim());
    }
    for (const p of gefunden) {
      assert.ok(Object.prototype.hasOwnProperty.call(erlaubt, p),
        fn + ': .filter(' + p + ') ist nicht benannt. Verwirft es Inhalt, braucht es eine Meldung und eine Probe; dann hier mit Grund eintragen.');
    }
    for (const p of Object.keys(erlaubt)) {
      assert.ok(gefunden.includes(p), fn + ': der Eintrag .filter(' + p + ') steht nicht mehr im Code — Liste nachziehen');
    }
  }
});

test('[Klassenprobe] Studio, Kern und Lese-App filtern Code-Werte nicht nach dem Code', () => {
  for (const datei of ['vivodepot-studio.html', 'vivodepot.html', 'vivodepot-lesen.html']) {
    const zeilen = fs.readFileSync(path.join(REPO, datei), 'utf8').split('\n');
    const treffer = zeilen.map((z, i) => [i + 1, z]).filter(([, z]) => /\.filter\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\s*&&\s*\w+\.code\s*\)|\.filter\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\.code\s*\)/.test(z));
    assert.deepEqual(treffer, [], datei + ': Code-Werte werden nach dem Code gefiltert — eine Option ohne Code fiele still weg');
  }
});
