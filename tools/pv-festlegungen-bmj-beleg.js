#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════
   pv-festlegungen-bmj-beleg.js — leiten sich die 29 Festlegungen der Patientenverfügung aus den
   BMJ-Textbausteinen ab? Je Festlegung belegt (01.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────
   Regel „offizielle Inhalte vor eigenen“: Die Festlegungen (U2-ADR-440, advanceCare, aus PV_BMJ.steps in
   tools/dokument-module/vivodepot-dokumente-de.json) sollen aus den „Textbausteinen Patientenverfügung“ des BMJ
   stammen. Dieses Werkzeug sucht je Festlegung jeden Optionstext (tools/textsatz-de-modul.json,
   advanceCare.<id>/<wert>.label) und die Einleitungssätze (dokEinleitung, bezug) WÖRTLICH im amtlichen Text und
   nennt den Abschnitt (2.x), in dem sie stehen. Leerzeichen, Zeilenumbrüche, Silbentrennung am Zeilenende und
   Aufzählungspunkte zählen nicht; jedes Wort muss stehen.

   Optionen „(kein …)“ sind Platzhalter für „Baustein nicht gewählt“ (U2-ADR-066) und stehen als solche da.
   Freitextfelder (typ text/textarea) haben keinen Optionstext; belegt wird dort der Einleitungssatz, sonst stehen
   sie als „frei“ da — die Textbausteine sehen an diesen Stellen eigene Angaben vor.

   Aufruf:
     node tools/pv-festlegungen-bmj-beleg.js                      gegen den Wortlaut der signierten Standardvorlage
     node tools/pv-festlegungen-bmj-beleg.js --dokument <txt>     gegen eine Textfassung (z. B. pdftotext des BMJ-PDF)
     node tools/pv-festlegungen-bmj-beleg.js --json
   Exit 0, wenn jeder Optionstext und jeder Einleitungssatz belegt ist, sonst 1.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const VORLAGE = path.join(REPO, 'tools', 'dokument-module', 'vivodepot-standardvorlage-patientenverfuegung.json');
const SCHRITTE = path.join(REPO, 'tools', 'dokument-module', 'vivodepot-dokumente-de.json');
const TEXTSATZ = path.join(REPO, 'tools', 'textsatz-de-modul.json');

/** Zum Vergleich: nur Wörter, ohne Trennstriche am Zeilenende, Aufzählungszeichen und Leerraum. */
function norm(t) {
  return String(t).replace(/\u00ad/g, '').replace(/-\s*\n\s*/g, '').replace(/[••▪]/g, ' ').replace(/[„“"‚‘'«»]/g, '"').replace(/\s+/g, ' ').trim();
}

function pvSchritte(modul) {
  let gefunden = null;
  (function such(o) { if (gefunden || !o || typeof o !== 'object') return; if (o.pvBmj) { gefunden = o.pvBmj; return; } for (const v of Object.values(o)) such(v); })(modul);
  if (!gefunden) throw new Error('pvBmj nicht gefunden in ' + SCHRITTE);
  return gefunden.steps;
}

/** Die Abschnitte 2.x mit ihrer Position im normierten Text. */
function abschnitte(textNorm) {
  return [...textNorm.matchAll(/(?:^| )(2\.\d{1,2}) [A-ZÄÖÜ]/g)].map((m) => ({ nr: m[1], pos: m.index }));
}
function abschnittAn(liste, pos) { let a = null; for (const x of liste) if (x.pos <= pos) a = x.nr; return a; }

// Im amtlichen Text hängen Fußnotenziffern am Wort („Indikation10“, „zu12 (ggf.“); sie gehören nicht zum Baustein.
function amtlichNorm(t) { return norm(String(t).replace(/([a-zäöüß.)])\d{1,2}(?=[\s.,;:(]|$)/gim, '$1')); }
// Platzhalter für „Baustein nicht gewählt“ (U2-ADR-066 Punkt 4: Sentinel-Optionen tragen keinen Baustein).
const SENTINEL = /^\(kein[^)]*\)$/;

function belegen({ amtlich, schritte, texte }) {
  const t = amtlichNorm(amtlich);
  const ab = abschnitte(t);
  return schritte.map((s) => {
    const f = s.feld || {};
    const suchen = [];
    for (const k of ['dokEinleitung', 'bezug']) if (s[k]) suchen.push({ art: k, text: s[k] });
    for (const o of f.optionen || []) {
      const label = texte['advanceCare.' + f.id + '/' + o.wert + '.label'];
      if (label !== undefined && SENTINEL.test(String(label).trim())) { suchen.push({ art: 'option ' + o.wert, text: label, sentinel: true }); continue; }
      suchen.push({ art: 'option ' + o.wert, text: label, fehltImTextsatz: label === undefined });
    }
    const funde = suchen.map((x) => {
      if (x.sentinel) return { art: x.art, text: x.text, belegt: true, sentinel: true, abschnitt: null };
      if (x.fehltImTextsatz) return { ...x, belegt: false, abschnitt: null, grund: 'kein Optionstext im Textsatz' };
      const pos = t.indexOf(norm(x.text));
      return { art: x.art, text: x.text, belegt: pos >= 0, abschnitt: pos >= 0 ? abschnittAn(ab, pos) : null };
    });
    const frei = (f.typ === 'text' || f.typ === 'textarea') && !(f.optionen || []).length;
    return { id: f.id, typ: f.typ, frei, abschnitte: [...new Set(funde.filter((x) => x.abschnitt).map((x) => x.abschnitt))], funde,
      belegt: funde.every((x) => x.belegt) };
  });
}

function lesen(dokument) {
  const amtlich = dokument ? fs.readFileSync(dokument, 'utf8')
    : JSON.parse(fs.readFileSync(VORLAGE, 'utf8')).standardVorlagen.patientenverfuegung.wortlaut;
  return { amtlich, schritte: pvSchritte(JSON.parse(fs.readFileSync(SCHRITTE, 'utf8'))),
    texte: JSON.parse(fs.readFileSync(TEXTSATZ, 'utf8')).texte };
}

/* ── Das erzeugte Dokument: jede Zeile Wort für Wort aus den Bausteinen ─────────────────────────────────────
   Referenz ist die Textfassung des BMJ-PDF (tests/fixtures/bmj-patientenverfuegung-textbausteine.txt, pdftotext -layout,
   amtliches Werk § 5 UrhG); dort stehen die Aufzählungspunkte an ihrer Stelle. Eine Zeile wird an den Eingaben der
   Nutzerin geteilt (Namen, Daten, Freitext); jedes übrige Stück muss entweder ein zusammenhängendes Stück des amtlichen
   Textes sein oder ein Bezugssatz, der im amtlichen Text unmittelbar vor einem Aufzählungspunkt endet, gefolgt von einem
   Baustein, der unmittelbar nach einem Aufzählungspunkt beginnt (so setzt das BMJ selbst zusammen: „wünsche ich, • dass …“). */
const REFERENZ = path.join(REPO, 'tests', 'fixtures', 'bmj-patientenverfuegung-textbausteine.txt');
// Ein „(ggf.: …)“-Teil ist eine Ausfüllanweisung des Formulars: er fällt weg oder steht ohne Klammer (U2-ADR-459). Beide
// Fassungen werden der Referenz als eigene Absätze angehängt.
function ggfVarianten(t) {
  const n = norm(t);
  const raus = [];
  for (const m of n.matchAll(/([^.¶]*?) \(ggf\.: ([^)]*)\)([.:]?)/g)) {
    raus.push(m[1] + m[3], m[1] + ' ' + m[2] + m[3]);
  }
  return raus;
}
function referenzMitPunkten(roh) {
  const varianten = ggfVarianten(String(roh).replace(/([a-zäöüß.)])\d{1,2}(?=[\s.,;:(]|$)/gim, '$1'));
  return norm((String(roh) + varianten.map((v) => '\n•\n' + v).join('')).replace(/([a-zäöüß.)])\d{1,2}(?=[\s.,;:(]|$)/gim, '$1').replace(/^\s*oder\s*$/gm, ' ¶ ').replace(/•/g, ' ¶ ')).replace(/\s*¶\s*/g, '¶');
}
function stueckBelegt(stueck, refPunkte) {
  const ohne = refPunkte.replace(/¶+/g, ' ').replace(/\s+/g, ' ');
  if (ohne.includes(stueck)) return true;
  // Bezugssatz + Baustein: der Bezugssatz endet vor ¶, der Baustein beginnt nach ¶ — an irgendeiner Teilungsstelle.
  for (let i = 10; i < stueck.length - 10; i++) {
    if (stueck[i] !== ' ') continue;
    const vorn = stueck.slice(0, i), hinten = stueck.slice(i + 1);
    if (refPunkte.includes(vorn + '¶') && refPunkte.includes('¶' + hinten)) return true;
  }
  return false;
}
function eingabenAus(daten) {
  const out = new Set();
  (function lauf(o) {
    if (typeof o === 'string') { const t = o.trim(); if (t.length > 1 && !/^[a-z_]+$/.test(t)) { out.add(t); const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t); if (m) out.add(m[3] + '.' + m[2] + '.' + m[1]); } }
    else if (o && typeof o === 'object') for (const v of Object.values(o)) lauf(v);
  })(daten);
  return [...out].sort((a, b) => b.length - a.length);
}
/** Die Stücke einer erzeugten Patientenverfügung, die nicht wörtlich aus den Bausteinen stammen. */
function dokumentPruefen(abschnitte, daten, refPunkte) {
  const eingaben = eingabenAus(daten).map(norm);
  const funde = [];
  for (const a of abschnitte) for (const z of a.zeilen) {
    let t = norm(String(z).replace(/^– /, ''));
    for (const e of eingaben) t = t.split(e).join('¦');
    // Die Auslassung „...“ ist eine Lücke zum handschriftlichen Ausfüllen, wie im amtlichen Formular — eine Teilungsstelle.
    t = t.split('...').join('¦');
    // Nur Leerraum und die Trenner direkt an einer Eingabe fallen weg; Satzzeichen eines Bausteins bleiben (zeichengleich).
    const teile = t.split('¦');
    for (let i = 0; i < teile.length; i++) {
      let st = teile[i];
      if (i > 0) st = st.replace(/^[\s,;]+/, '');
      if (i < teile.length - 1) st = st.replace(/[\s,;]+$/, '');
      st = st.trim();
      if (st.replace(/[\s,.;:]/g, '').length <= 3) continue;
      if (!stueckBelegt(st, refPunkte)) funde.push(st);
    }
  }
  return funde;
}
// Der Kopf der Referenzdatei (Quelle, Fundstelle, Stand; Zeilen mit „#“ am Anfang) gehört nicht zum amtlichen Text.
const ohneKopf = (text) => text.replace(/^(#[^\n]*\n)+/, '');
function referenzLesen(pfad = REFERENZ) { return referenzMitPunkten(ohneKopf(fs.readFileSync(pfad, 'utf8'))); }

module.exports = { norm, amtlichNorm, belegen, lesen, SENTINEL, referenzMitPunkten, stueckBelegt, dokumentPruefen, referenzLesen, REFERENZ };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--dokument');
  const ergebnis = belegen(lesen(i >= 0 ? argv[i + 1] : null));
  if (argv.includes('--json')) console.log(JSON.stringify(ergebnis, null, 2));
  else for (const r of ergebnis) {
    console.log((r.belegt ? '✓' : '✗') + ' ' + r.id.padEnd(40) + ' ' + (r.abschnitte.join(', ') || (r.frei ? 'frei' : '—'))
      + r.funde.filter((x) => !x.belegt).map((x) => '\n    fehlt: ' + x.art + ' «' + String(x.text || x.grund).slice(0, 90) + '»').join(''));
  }
  const offen = ergebnis.filter((r) => !r.belegt).length;
  if (!argv.includes('--json')) console.log('\n' + (ergebnis.length - offen) + ' von ' + ergebnis.length + ' Festlegungen belegt.');
  process.exit(offen ? 1 : 0);
}
