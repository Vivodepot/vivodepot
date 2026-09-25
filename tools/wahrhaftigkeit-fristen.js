'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Block 5 der Prüfarchitektur — der Wahrhaftigkeits-Wächter (B10 · T-Raum)
   ────────────────────────────────────────────────────────────────────────────
   DIE ACHSE, die bisher gar nicht geprüft wurde, und an der der schwerste Fund
   der Projektgeschichte hing: eine Zwölf-Monats-Prüffrist, die Vivodepot
   niemandem zuschreiben konnte, weil es seine eigene Regel war. Kein Test hätte
   sie gefunden — alle prüften, ob die Ampel FUNKTIONIERT, keiner, ob die Zahl
   daneben STIMMT.

   WAS DER WÄCHTER KANN (Bauauftrag Block 5): in jedem sichtbaren Bürgertext
   Zahlen, Fristen, Intervalle und Rechtsaussagen finden und verlangen, dass eine
   benannte Quelle danebensteht — ein Paragraf, ein amtliches Dokument, oder
   ausdrücklich „eigene Setzung".

   WAS ER NICHT KANN: beurteilen, ob die Quelle TRÄGT. Das bleibt Stufe 4, beim
   Menschen. Darum ist „ohne Quelle" hier KEIN Defekt, sondern UNGETESTET.

   ── DIE ZWEI DINGE, DIE ER TUT ─────────────────────────────────────────────
   (1) ERSTLAUF (Vorgabe-Ausgabe): jede Zahl/Frist/Rechtsaussage im Bürgertext,
       mit ihrem Klassifikationsstand aus der Grundlinie. Ohne Grundlinien-
       Eintrag steht sie als UNGETESTET, nie als grün.
   (2) GATE (`--gate`): rot, sobald eine Aussage auftaucht, die die Grundlinie
       NICHT kennt — eine NEUE oder GEÄNDERTE Zahl/Frist. Genau die „erfundene
       Frist" fällt hier hinein: sie ist neu, niemand hat sie klassifiziert.

   Die Klassifikation SELBST (trägt die Quelle?) fällt nicht hier — sie steht in
   `tools/wahrhaftigkeit-grundlinie.json` und wird von einem Menschen gesetzt.
   Der Wächter erzwingt nur, dass jede Aussage EINEN Eintrag hat.

   ── GEMESSEN, NICHT GERATEN (30.07.) ───────────────────────────────────────
   808 Bürgertexte, davon 18 mit Ziffer, 4 mit Frist/Intervall, 1 mit Paragraf.
   Eine ausgeschriebene Frist („sechs Monate") hätte ein reiner Ziffern-Scan
   verfehlt — darum kennt der Tokenizer auch Zahlwörter.

   Der gemessene Gegenstand ist über `KERN_HTML_PATH` umlenkbar (via `ladeKern`),
   damit der Rotlauf auf einer KOPIE pflanzt und nie im Arbeitsbaum.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'wahrhaftigkeit-grundlinie.json');

/* ── Die Aussage-Tokens: Zahlen, Fristen, Intervalle, Rechtsaussagen ────────
   Reihenfolge zählt: die längeren, spezifischeren Muster zuerst, damit „§ 1358
   Abs. 1 BGB" als EIN Rechtsverweis zählt und nicht in „1358" und „1" zerfällt.
   Ausgeschriebene Zahlwörter sind dabei, weil der schwerste Fund als „sechs
   Monate" hätte auftreten können. */
const ZAHLWORT = 'null|einem|einen|eine|ein|zwei|drei|vier|fünf|sechs|sieben|acht|'
  + 'neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|zwanzig|dreißig';
const ZEIT = 'Monat(?:e|en)?|Jahr(?:e|en)?|Tag(?:e|en)?|Woche(?:n)?|Stunde(?:n)?|Minute(?:n)?';
const MUSTER = [
  /§\s*\d+[a-z]?(?:\s*Abs\.?\s*\d+)?(?:\s*[A-ZÄÖÜ][A-Za-zÄÖÜäöü]*)?/g,       // § 1358 Abs. 1 BGB
  /\bArt\.?\s*\d+[a-z]?(?:\s*Abs\.?\s*\d+)?/g,                                // Art. 9
  new RegExp('\\b(?:' + ZAHLWORT + ')\\s+(?:' + ZEIT + ')', 'gi'),           // sechs Monate
  new RegExp('\\d+\\s*(?:' + ZEIT + ')', 'gi'),                               // 6 Monate
  /\d+(?:[.,]\d+)?/g,                                                         // jede übrige Zahl
];

function normalisiere(s) { return s.replace(/\s+/g, ' ').trim(); }

/** Alle Aussage-Tokens eines Textes, überlappungsfrei (früheres Muster gewinnt). */
function tokens(text) {
  const belegt = new Array(text.length).fill(false);
  const funde = [];
  for (const re of MUSTER) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const a = m.index, b = m.index + m[0].length;
      let frei = true;
      for (let i = a; i < b; i++) if (belegt[i]) { frei = false; break; }
      if (!frei) continue;
      for (let i = a; i < b; i++) belegt[i] = true;
      funde.push({ token: normalisiere(m[0]), at: a });
    }
  }
  return funde.sort((x, y) => x.at - y.at).map((f) => f.token);
}

/** Flach: jeder String-Wert in STRINGS, auch in Arrays/verschachtelt. */
function bürgertexte(STRINGS) {
  const paare = [];
  (function sammle(pfad, v) {
    if (typeof v === 'string') paare.push([pfad, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => sammle(pfad + '[' + i + ']', x));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) sammle(pfad + '.' + k, v[k]);
  })('', STRINGS);
  return paare.map(([p, t]) => [p.replace(/^\./, ''), t]);
}

/** Die Aussagen des aktuellen Kerns: [{schluessel, token, text}]. */
function aussagen() {
  const STRINGS = ladeKern().V.STRINGS;
  const raus = [];
  for (const [schluessel, text] of bürgertexte(STRINGS)) {
    for (const token of tokens(text)) raus.push({ schluessel, token, text });
  }
  return raus;
}

/** Schlüssel einer Aussage in der Grundlinie: „<STRINGS-Schlüssel>|<token>". */
const kennung = (a) => a.schluessel + '|' + a.token;

function ladeGrundlinie() {
  if (!fs.existsSync(GRUNDLINIE)) return null;
  return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
}

/* ── DIE GATE-BEWERTUNG, rein (wie gateBewerten bei der Kampagne) ───────────
   Beide Eingänge sind Argumente, damit die Probe sie anspritzen kann. Gibt die
   Kübel zurück; rot ist der Lauf genau dann, wenn `neu` etwas trägt — eine
   Aussage, die die Grundlinie nicht kennt. */
function gateBewerten(aktuelle, grundlinie) {
  const bekannt = new Set(Object.keys(grundlinie.aussagen || {}));
  const neu = [], ungetestet = [], belegt = [];
  for (const a of aktuelle) {
    const k = kennung(a);
    if (!bekannt.has(k)) { neu.push(a); continue; }
    const eintrag = grundlinie.aussagen[k];
    if (eintrag.status === 'ungetestet') ungetestet.push({ ...a, ...eintrag });
    else belegt.push({ ...a, ...eintrag });
  }
  const aktuelleKennungen = new Set(aktuelle.map(kennung));
  const verschwunden = Object.keys(grundlinie.aussagen || {}).filter((k) => !aktuelleKennungen.has(k));
  return { neu, ungetestet, belegt, verschwunden };
}

/* ── CLI ───────────────────────────────────────────────────────────────────
   process.stdout.isTTY erkannt: eine Ausgabe in eine Pipe soll das selbst
   melden (stehende Regel, T-Zeile wert). */
function main() {
  const argv = process.argv.slice(2);
  const aktuelle = aussagen();

  if (argv.includes('--grundlinie-schreiben')) {
    const map = {};
    for (const a of aktuelle) {
      const k = kennung(a);
      // bestehende Klassifikation erhalten, neue als ungetestet anlegen
      const alt = (ladeGrundlinie() || { aussagen: {} }).aussagen[k];
      map[k] = alt || { status: 'ungetestet', quelle: null, notiz: a.text.slice(0, 80) };
    }
    fs.writeFileSync(GRUNDLINIE, JSON.stringify({
      hinweis: 'Block-5-Grundlinie (Wahrhaftigkeit). status: quelle | eigene-setzung | ungetestet. '
        + 'Ob eine Quelle TRÄGT, entscheidet ein Mensch (Stufe 4) — hier steht nur, DASS sie benannt ist.',
      aussagen: map,
    }, null, 1) + '\n');
    console.log('Grundlinie geschrieben: ' + Object.keys(map).length + ' Aussagen · ' + path.relative(REPO, GRUNDLINIE));
    return;
  }

  const grundlinie = ladeGrundlinie();
  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ aussagen: aktuelle,
      bewertung: grundlinie ? gateBewerten(aktuelle, grundlinie) : null }, null, 1) + '\n');
    return;
  }

  if (argv.includes('--gate')) {
    if (!grundlinie) { console.error('GATE: keine Grundlinie — erst `--grundlinie-schreiben`.'); process.exit(2); }
    const { neu, ungetestet, verschwunden } = gateBewerten(aktuelle, grundlinie);
    if (ungetestet.length) {
      console.log('  UNGETESTET (in der Grundlinie, aber ohne belegte Quelle — Stufe 4, Mensch):');
      for (const a of ungetestet) console.log('    [' + a.schluessel + '] „' + a.token + '"');
    }
    if (verschwunden.length) console.log('  VERSCHWUNDEN (nicht mehr im Bürgertext): ' + verschwunden.join(', '));
    if (neu.length) {
      console.error('GATE ROT — diese Aussagen kennt die Grundlinie NICHT (neu oder geändert):');
      for (const a of neu) console.error('    [' + a.schluessel + '] „' + a.token + '"  in: ' + a.text.slice(0, 70));
      console.error('Eine Zahl/Frist ohne Klassifikation ist genau der schwerste Fund. Klassifizieren '
        + '(Quelle/eigene-Setzung/ungetestet) und `--grundlinie-schreiben`, oder die Aussage entfernen.');
      process.exit(1);
    }
    console.log('  GATE grün — keine unklassifizierte Zahl/Frist im Bürgertext.');
    return;
  }

  // Vorgabe: der Erstlauf als Liste.
  if (!process.stdout.isTTY) console.error('[hinweis] Ausgabe geht in eine Pipe/Datei — der Exit-Code zählt, nicht der Text.');
  console.log('ERSTLAUF — Zahlen/Fristen/Rechtsaussagen im Bürgertext (' + aktuelle.length + '):');
  for (const a of aktuelle) {
    const st = grundlinie && grundlinie.aussagen[kennung(a)] ? grundlinie.aussagen[kennung(a)].status : 'UNGETESTET (nicht in Grundlinie)';
    console.log('  [' + a.schluessel + '] „' + a.token + '"  → ' + st);
  }
}

if (require.main === module) main();
module.exports = { tokens, bürgertexte, aussagen, gateBewerten, kennung, GRUNDLINIE };
