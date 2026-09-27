'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-verweise-pruefen.js — findet Texte, die eine andere Bedienstelle
   NENNEN, deren genannter Name aber zu KEINEM tatsächlichen Label passt
   ────────────────────────────────────────────────────────────────────────────
   KEIN SPRACHTHEMA — prüft Deutsch UND Englisch, unabhängig voneinander. Der
   erste Name dieses Werkzeugs (`textsatz-en-verweise-pruefen.js`) prüfte nur
   Englisch; zwei der drei am 01.09.2026 gefundenen Fälle standen aber bereits
   im DEUTSCHEN Original falsch — ein Label wurde vermutlich umbenannt, die
   darauf verweisenden Texte wurden nicht nachgezogen. Das ist ein Produkt-
   fehler, keine Übersetzungsfrage, darum jetzt in beiden Sprachen geprüft und
   umbenannt (U2-ADR-196).

   DIE DREI GEFUNDENEN FÄLLE, zur Einordnung (Bericht „Englischer Bürgersatz",
   01.09.2026):
   - `strings:exportNichtsGehtMitHinweis.text` verwies auf „Etwas zurückhalten"
     (DE) / „Withhold something" (EN) — der tatsächliche Knopf
     (`strings:exportZurueckhaltenKnopf.text`) heißt nur „Zurückhalten"/
     „Withhold". BEIDE Sprachen falsch — behoben.
   - `strings:identitaetKernFehltHinweis.text` verwies auf „Meine Identität"
     (DE) / „My Identity" (EN) — der tatsächliche Bereichs-Label
     (`identitaet.label`) heißt „Identität & Person"/„Identity & person".
     BEIDE Sprachen falsch — behoben.
   - `advanceCare.provisionInstruments/note.hint` verwies im
     EN-Overlay auf „power of attorney for care", die tatsächliche
     EN-Options-Beschriftung heißt „Power of attorney (advance care)".
     Deutsch war hier bereits stimmig (nennt „Vorsorgevollmacht" wortgleich
     zum deutschen Label) — reiner Übersetzungsfehler, gehört zur
     Sprachkampagne (U2-ADR-195), nicht zu diesem Wächter, NICHT hier
     behoben.

   METHODISCHE GRENZE, AUSDRÜCKLICH — hier UND im ADR, nicht nur im Bericht:
   die Probe findet NUR ausdrücklich IN ANFÜHRUNGSZEICHEN zitierte Verweise
   (ASCII "…" für Englisch, deutsche „…" für Deutsch). Ein umschriebener,
   nicht wörtlich zitierter Verweis entgeht ihr vollständig. Sie belegt keine
   Vollständigkeit — sie findet einen Fehlertyp, keinen erschöpfenden Katalog.
   Einfache Anführungszeichen sind ausgeschlossen: sie kollidieren im
   Englischen mit Apostrophen/Kontraktionen (don't, it's) und würden das
   Signal in Rauschen ertränken.

   DIE ZUSICHERUNG, DIE DAS TRÄGT: nicht „Verweise stimmen mit Labels
   überein" — sondern: ein Text, der die Bürgerin irgendwohin verweist, nennt
   den Ort so, wie er dort tatsächlich steht. Sonst sucht sie etwas, das es
   nicht gibt, und hält sich für ungeschickt statt das Produkt für ungenau.

   Aufruf: node tools/textsatz-verweise-pruefen.js [--json]
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { ladeDeutsch, ladeEnglisch } = require(path.join(__dirname, 'textsatz-en-begriffe-pruefen.js'));

const ZITAT_REGEX_ASCII = /"([^"]{3,80})"/g;
// Schliessendes Zeichen ABSICHTLICH auch ASCII " zugelassen (nicht nur “): mindestens eine
// Fundstelle im Bestand öffnet mit „ und schliesst mit ASCII \" (Tippfehler/Kopierfehler an
// der Quelle) -- ein reiner “-Regex läuft dort über die naechste „…“-Stelle hinweg und liefert
// eine falsch zusammengezogene Extraktion statt zweier sauberer Treffer.
const ZITAT_REGEX_DE = /„([^„“"]{3,80})[“"]/g;

function normalisiert(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function labelWerteBauen(sprachSatz) {
  const werte = new Set();
  for (const k of Object.keys(sprachSatz)) {
    if (!k.endsWith('.label')) continue;
    if (typeof sprachSatz[k] === 'string') werte.add(normalisiert(sprachSatz[k]));
  }
  return werte;
}

function alleWerteBauen(sprachSatz) {
  const werte = new Set();
  for (const k of Object.keys(sprachSatz)) {
    if (typeof sprachSatz[k] === 'string') werte.add(normalisiert(sprachSatz[k]));
  }
  return werte;
}

// Zitat-Kandidaten aus NICHT-Label-Kennungen ziehen (ein Label zitiert sich nicht selbst).
// BEIDE Anführungszeichen-Stile geprüft, unabhängig von der Sprache des sprachSatz -- eine
// deutsche Kennung könnte in seltenen Fällen englische Anführungszeichen tragen (Zitat aus
// einem Formular) und umgekehrt; das Muster entscheidet, nicht die Sprache der Quelle.
function zitateExtrahieren(sprachSatz) {
  const treffer = [];
  for (const k of Object.keys(sprachSatz)) {
    if (k.endsWith('.label')) continue;
    const wert = sprachSatz[k];
    if (typeof wert !== 'string') continue;
    for (const re of [ZITAT_REGEX_ASCII, ZITAT_REGEX_DE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(wert))) {
        treffer.push({ kennung: k, zitat: m[1], satz: wert });
      }
    }
  }
  return treffer;
}

function proSprache(sprachSatz) {
  const labelWerte = labelWerteBauen(sprachSatz);
  const alleWerte = alleWerteBauen(sprachSatz);
  const zitate = zitateExtrahieren(sprachSatz);
  const kaputt = [];
  const passtNurLose = [];
  for (const z of zitate) {
    const norm = normalisiert(z.zitat);
    if (labelWerte.has(norm)) continue; // exakter Treffer -- in Ordnung
    if (alleWerte.has(norm)) { passtNurLose.push(z); continue; } // trifft IRGENDeinen Wert, nur kein Label
    kaputt.push(z);
  }
  return {
    gesamt: Object.keys(sprachSatz).length,
    labelAnzahl: labelWerte.size,
    zitateGesamt: zitate.length,
    kaputt,
    passtNurLose,
  };
}

function messen() {
  const de = proSprache(ladeDeutsch());
  const en = proSprache(ladeEnglisch());
  return { de, en };
}

function bericht(m) {
  const z = [];
  for (const [name, s] of [['Deutsch', m.de], ['Englisch', m.en]]) {
    z.push('── ' + name + ': ' + s.gesamt + ' Kennungen · ' + s.labelAnzahl + ' Labels · '
      + s.zitateGesamt + ' Zitate gefunden ──');
    z.push('KAPUTTE VERWEISE (' + s.kaputt.length + '):');
    for (const k of s.kaputt) z.push('  ' + k.kennung + ': zitiert „' + k.zitat + '“');
    if (s.passtNurLose.length) {
      z.push('Zitat trifft einen Wert, aber kein Label (' + s.passtNurLose.length + '):');
      for (const k of s.passtNurLose.slice(0, 15)) z.push('  ' + k.kennung + ': zitiert „' + k.zitat + '“');
    }
    z.push('');
  }
  return z.join('\n');
}

if (require.main === module) {
  const m = messen();
  console.log(process.argv.includes('--json') ? JSON.stringify(m, null, 2) : bericht(m));
}

module.exports = { messen, bericht, proSprache, zitateExtrahieren, labelWerteBauen, alleWerteBauen };
