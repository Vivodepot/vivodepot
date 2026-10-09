'use strict';
/* Belege für den Gerüst-Wächter (06.10.2026, ICD-Anzeige; Befund ICD-TITEL-LIVE-VERAENDERT).
   Zwei Mengen, beide aus Dateien im Repo, beide in der Form, die der Wächter misst: der Inhalt zwischen den Begrenzern
   eines JSON-kodierten Literals, wie tools/build-code-listen.js es in den Kern schreibt:
   · terminologie — amtliche Begriffe in Listen mit herkunftPflicht: quellBegriff (amtlicher Titel, gehalten von
     tests/icd10gm-endstaendig.test.js), anzeigeName und synonyme nur, wenn sie zeichengleich im mitgeführten Auszug des
     amtlichen Verzeichnisses zum selben Code stehen (tools/icd-alphabet-begriffe.js prüft den Auszug gegen die Datei).
     Ein eigener Text (eigeneBeschreibung) gehört nie hierher — er bleibt Satz.
   · wortlaut — der Inhalt jeder Datei unter code-listen/wortlaut/ (Pflicht-Quellenangaben der Lizenzgeber).
   Gehalten von tests/geruest-waechter-pruefen.test.js ([Gerüst-Wächter·Terminologie], [Gerüst-Wächter·Wortlaut]). */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const literal = (v) => JSON.stringify(v).slice(1, -1);

function listenLesen(repo) {
  const dir = path.join(repo, 'code-listen');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

function terminologieAus(listen) {
  const s = new Set();
  for (const l of listen) {
    if (!l.herkunftPflicht) continue;
    const auszug = (l.alphabet && l.alphabet.eintraege) || [];
    const belegt = (code, t) => auszug.some((a) => a.code === code && a.text === t);
    for (const d of l.daten || []) {
      if (typeof d.quellBegriff === 'string') s.add(literal(d.quellBegriff));
      if (d.eigeneBeschreibung !== true && belegt(d.code, d.anzeigeName)) s.add(literal(d.anzeigeName));
      for (const x of d.synonyme || []) if (belegt(d.code, x)) s.add(literal(x));
    }
  }
  return s;
}

function wortlautAus(repo) {
  const dir = path.join(repo, 'code-listen', 'wortlaut');
  return new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).map((f) => literal(fs.readFileSync(path.join(dir, f), 'utf8'))));
}

function belegeLesen(repo = REPO) {
  return { terminologie: terminologieAus(listenLesen(repo)), wortlaut: wortlautAus(repo) };
}

module.exports = { belegeLesen, terminologieAus, wortlautAus };
