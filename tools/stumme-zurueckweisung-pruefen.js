#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   stumme-zurueckweisung-pruefen.js — ein `continue` nach fehlgeschlagener Prüfung, das keine Spur hinterlässt (22.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS. Die Lese-App hatte drei stumme Zurückweisungen: ein ungültiges Logik-Modul, ein ungültiges Sprachmodul und eine
   Liste verworfener Angehörigen-Vorlagen, die niemand las. In allen dreien ging die Datei auf, der Inhalt fehlte, und nichts
   sagte der Bürgerin, dass etwas fehlte. Drei Zeilen zu reparieren schließt die Klasse nicht; sie kommt als vierte wieder.
   Dieser Wächter hält die FORM fest, nicht die Zeilen.

   DIE FORM. Ein `if`, dessen Bedingung `gueltig` nennt und dessen Rumpf ein `continue` enthält:
       if (!geprueft.gueltig) continue;
       if (!geprueft || !geprueft.gueltig) { …; continue; }
   Jede solche Stelle steht in tools/stumme-zurueckweisung-grundlinie.json, mit Ort (die umgebende Funktion) und Bedingung
   (nicht mit einer Zeilennummer: die wandert), und ist genau eine von drei Sorten:
     spur     der Rumpf ruft eine der `spurFunktionen` auf (die Zurückweisung schreibt eine Zeile, die ein Leser findet).
              Wird die Spur gestrichen, ist die Stelle rot.
     ausnahme kein Verlust oder die Spur steht anderswo, mit Grund (mindestens 40 Zeichen) und einer Probe (Testdatei, die
              existiert und den Ort nennt). „Eine Ausnahme mit gutem Grund ist schwerer zu finden als eine ohne": darum steht sie
              hier und nicht im Kopf einer Funktion.
     offen    bekannt, noch stumm, benannt. Die ZAHL der offenen (`offenDeckel`) ist exakt und kann nur sinken. Trägt eine offene
              Stelle inzwischen eine Spur, ist das ein Fund („Zeile umstellen"): die Zahl soll fallen, nicht stehen bleiben.
   Eine Stelle, die in keiner Sorte steht, ist rot: Unbekanntes gilt als Inhalt.

   WAS DER WÄCHTER NICHT KANN. (a) Er erkennt die Form „Bedingung nennt `gueltig`". Ein Modul, das über einen anderen Namen
   geprüft wird (`ok`, `valid`, ein Rückgabewert `null`), sieht er nicht; die Form ist dort eine andere. (b) Er prüft, dass der
   Rumpf eine Spur-Funktion AUFRUFT, nicht dass ein Leser die Spur je zeigt: das ist die Aufgabe von
   tests/lese-app-stumme-zurueckweisung.test.js (Verhalten an echten Produktdateien). (c) Ein `break` oder `return` an der Stelle
   eines `continue` ist dieselbe Klasse in anderer Gestalt; sie steht nicht drin. (d) Kommentare werden vor der Suche entfernt
   (einfach: Zeichenketten und Vorlagen werden erkannt, Regex-Literale nicht).

   ERSTE MESSUNG (22.09.2026, mit diesem Werkzeug): vivodepot-lesen.html trägt fünf Stellen dieser Form, vivodepot.html
   zehn. Die Lese-App war Gegenstand des Baus; die zehn im Kern stehen als `offen`, benannt, mit exakter Zahl.

   Aufruf: node tools/stumme-zurueckweisung-pruefen.js [--wurzel <Ordner>] [--grundlinie-datei <Datei>] [--vorschlag]
   Ohne Argument gegen das Repo. Exit 0 = grün, 1 = Fund. `--vorschlag` druckt die gefundenen Stellen als JSON.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE_PFAD = path.join(__dirname, 'stumme-zurueckweisung-grundlinie.json');
const SORTEN = ['spur', 'ausnahme', 'offen'];
const GRUND_MINDESTLAENGE = 40;

/** Ersetzt Kommentare durch Leerzeichen gleicher Länge (Zeilenumbrüche bleiben). Zeichenketten und Vorlagen bleiben. */
function kommentareEntfernen(text) {
  let raus = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    const d = text[i + 1];
    if (c === '/' && d === '/') {
      const e = text.indexOf('\n', i);
      const ende = e < 0 ? n : e;
      raus += ' '.repeat(ende - i);
      i = ende;
    } else if (c === '/' && d === '*') {
      const e = text.indexOf('*/', i + 2);
      const ende = e < 0 ? n : e + 2;
      raus += text.slice(i, ende).replace(/[^\n]/g, ' ');
      i = ende;
    } else if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1;
      while (j < n && text[j] !== c) { if (text[j] === '\\') j += 1; j += 1; }
      raus += text.slice(i, j + 1);
      i = j + 1;
    } else {
      raus += c;
      i += 1;
    }
  }
  return raus;
}

function klammerEnde(t, start, auf, zu) {
  let tiefe = 0;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1;
      while (j < t.length && t[j] !== c) { if (t[j] === '\\') j += 1; j += 1; }
      i = j;
    } else if (c === auf) tiefe += 1;
    else if (c === zu) { tiefe -= 1; if (tiefe === 0) return i; }
  }
  return -1;
}

/**
 * Alle Stellen der Form „Bedingung nennt `gueltig`, Rumpf enthält `continue`".
 * @returns {{ort:string, bedingung:string, rumpf:string, nr:number}[]}  `nr`: laufende Nummer je (ort, bedingung), ab 1
 */
function stellenFinden(text) {
  const t = kommentareEntfernen(text);
  const funktionen = [];
  for (const m of t.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g)) funktionen.push({ pos: m.index, name: m[1] });
  const ortVon = (pos) => { let name = '(oberste Ebene)'; for (const f of funktionen) { if (f.pos <= pos) name = f.name; else break; } return name; };
  const raus = [];
  const gezaehlt = Object.create(null);
  for (const m of t.matchAll(/\bif\s*\(/g)) {
    const kopfAuf = m.index + m[0].length - 1;
    const kopfZu = klammerEnde(t, kopfAuf, '(', ')');
    if (kopfZu < 0) continue;
    const bedingung = t.slice(kopfAuf + 1, kopfZu).replace(/\s+/g, ' ').trim();
    if (!/\bgueltig\b/.test(bedingung)) continue;
    let p = kopfZu + 1;
    while (p < t.length && /\s/.test(t[p])) p += 1;
    let rumpf;
    if (t[p] === '{') { const e = klammerEnde(t, p, '{', '}'); rumpf = e < 0 ? '' : t.slice(p, e + 1); } else { const e = t.indexOf(';', p); rumpf = e < 0 ? '' : t.slice(p, e + 1); }
    if (!/\bcontinue\b/.test(rumpf)) continue;
    const ort = ortVon(m.index);
    const schluessel = ort + '|' + bedingung;
    gezaehlt[schluessel] = (gezaehlt[schluessel] || 0) + 1;
    raus.push({ ort, bedingung, rumpf: rumpf.replace(/\s+/g, ' ').trim(), nr: gezaehlt[schluessel] });
  }
  return raus;
}

const schluesselVon = (s) => s.ort + '|' + s.bedingung + '|' + (s.nr || 1);
const tragtSpur = (rumpf, spurFunktionen) => spurFunktionen.some((f) => rumpf.includes(f));

/**
 * @param {{ [datei:string]: string|null }} texte       Datei → Inhalt (null = fehlt)
 * @param {object} grundlinie
 * @param {(pfad:string)=>string|null} probeInhalt       Testdatei → Inhalt (null = gibt es nicht)
 * @returns {{fehler:string[], offen:number}}
 */
function pruefen(texte, grundlinie, probeInhalt) {
  const fehler = [];
  const spurFunktionen = Array.isArray(grundlinie.spurFunktionen) ? grundlinie.spurFunktionen : [];
  if (!spurFunktionen.length) fehler.push('spurFunktionen: die Grundlinie nennt keine Funktion, die eine Spur schreibt.');
  const dateien = grundlinie.dateien && typeof grundlinie.dateien === 'object' ? grundlinie.dateien : {};
  let offen = 0;
  for (const datei of Object.keys(texte)) {
    if (texte[datei] == null) { fehler.push(datei + ': die Datei fehlt.'); continue; }
    if (!dateien[datei]) { fehler.push(datei + ': steht nicht in der Grundlinie.'); continue; }
    const gefunden = stellenFinden(texte[datei]);
    const bekannt = new Map();
    for (const e of dateien[datei]) bekannt.set(schluesselVon(e), e);
    for (const s of gefunden) {
      const wo = datei + ' · ' + s.ort + ' · if (' + s.bedingung + ')' + (s.nr > 1 ? ' [' + s.nr + '.]' : '');
      const e = bekannt.get(schluesselVon(s));
      if (!e) { fehler.push(wo + ': ein `continue` nach fehlgeschlagener Prüfung, das in keiner Sorte steht (spur, ausnahme, offen). Unbekanntes gilt als Inhalt: schreib eine Spur oder benenne die Ausnahme.'); continue; }
      if (SORTEN.indexOf(e.art) < 0) { fehler.push(wo + ': Sorte „' + e.art + '" unbekannt (' + SORTEN.join(', ') + ').'); continue; }
      const spur = tragtSpur(s.rumpf, spurFunktionen);
      if (e.art === 'spur' && !spur) fehler.push(wo + ': als `spur` geführt, aber der Rumpf ruft keine Spur-Funktion mehr auf (' + spurFunktionen.join(', ') + ') — die Zurückweisung ist wieder stumm.');
      if (e.art === 'ausnahme') {
        if (typeof e.grund !== 'string' || e.grund.trim().length < GRUND_MINDESTLAENGE) fehler.push(wo + ': Ausnahme ohne Grund (mindestens ' + GRUND_MINDESTLAENGE + ' Zeichen).');
        const probe = typeof e.probe === 'string' ? probeInhalt(e.probe) : null;
        if (probe == null) fehler.push(wo + ': die Probe ' + e.probe + ' gibt es nicht.');
        else if (!probe.includes(s.ort)) fehler.push(wo + ': die Probe ' + e.probe + ' nennt den Ort ' + s.ort + ' nicht — sie hängt nicht an dieser Stelle.');
      }
      if (e.art === 'offen') {
        offen += 1;
        if (spur) fehler.push(wo + ': als `offen` geführt, trägt aber inzwischen eine Spur — umstellen auf `spur`, die Zahl der offenen soll fallen.');
      }
    }
    const gefundenSchluessel = new Set(gefunden.map(schluesselVon));
    for (const e of dateien[datei]) {
      if (!gefundenSchluessel.has(schluesselVon(e))) fehler.push(datei + ' · ' + e.ort + ' · if (' + e.bedingung + '): steht in der Grundlinie, wurde aber nicht mehr gefunden — Zeile streichen (die Stelle ist weg oder hat ihre Form geändert).');
    }
  }
  if (!Number.isInteger(grundlinie.offenDeckel)) fehler.push('offenDeckel fehlt.');
  else if (offen > grundlinie.offenDeckel) fehler.push('offen: ' + offen + ' stumme Stellen bei einem Deckel von ' + grundlinie.offenDeckel + ' — die Zahl kann nur sinken.');
  else if (offen < grundlinie.offenDeckel) fehler.push('offen: ' + offen + ' stumme Stellen, Deckel ' + grundlinie.offenDeckel + ' — Deckel senken.');
  return { fehler, offen };
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const wurzel = wert('--wurzel') ? path.resolve(wert('--wurzel')) : REPO;
  const glDatei = wert('--grundlinie-datei') ? path.resolve(wert('--grundlinie-datei')) : GRUNDLINIE_PFAD;
  const les = (p) => { const f = path.join(wurzel, p); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
  if (argv.includes('--vorschlag')) {
    const raus = {};
    for (const d of ['vivodepot-lesen.html', 'vivodepot.html']) { const t = les(d); raus[d] = t == null ? null : stellenFinden(t).map((s) => ({ ort: s.ort, bedingung: s.bedingung, ...(s.nr > 1 ? { nr: s.nr } : {}), rumpf: s.rumpf })); }
    console.log(JSON.stringify(raus, null, 1));
    return;
  }
  const grundlinie = JSON.parse(fs.readFileSync(glDatei, 'utf8'));
  const texte = {};
  for (const d of Object.keys(grundlinie.dateien || {})) texte[d] = les(d);
  const r = pruefen(texte, grundlinie, (p) => les(p));
  console.log('[stumme-zurueckweisung] ' + Object.keys(texte).map((d) => d + ' ' + stellenFinden(texte[d] || '').length + ' Stellen').join(', ') + '; offen ' + r.offen + '.');
  if (r.fehler.length) {
    console.error('[stumme-zurueckweisung] ROT:');
    for (const f of r.fehler) console.error('  - ' + f);
    process.exitCode = 1;
    return;
  }
  console.log('[stumme-zurueckweisung] OK — jede Stelle hat eine Spur oder steht mit Grund in der Grundlinie.');
}

if (require.main === module) main();

module.exports = { kommentareEntfernen, stellenFinden, pruefen, schluesselVon, GRUNDLINIE_PFAD, SORTEN };
