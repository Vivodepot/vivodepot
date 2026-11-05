#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   hinweistexte-bestand.js — Bestandsliste der Hinweis-, Erklär- und Leerzustandstexte der Oberfläche
   ────────────────────────────────────────────────────────────────────────────
   Grundlage für die Prüfung des Bedienkonzepts: Welche Texte erklären etwas, das ein übliches Bedienmuster
   (Aufklapper mit Pfeil, Chip mit ›, Leerzustand mit Knopf, Schalter, Symbol mit Tooltip, Link, Platzhalter)
   ebenso sagen könnte — und welche müssen als Satz bleiben.

   AUSWAHL nach Schlüssel (`art`):
     *.hint / *.hilfetext                         Feldhinweis / Feldhilfe
     *.einfuehrungstext / *.einfuehrung / *.einleitung   Einführung (hilfe:* → Hilfeseite)
     *.navUnterzeile                              Unterzeile in der Navigation
     *Hinweis* / *.hinweis                        Hinweis
     strings:*Leer* (nicht „Leeren“)              Leerzustand
     (nicht: strings:*Knopf, *Spaeter, *Ok, *Ja, *Nein, *Titel, *Label … — Knöpfe und Titel)
     strings:*Erklaer*|*Einfuehrung*|*Intro*|*Tipp*|*Info*|*Beschreibung*|*Untertitel*   Erklärung
     strings:*Text.text                           Erklärtext
   Platzhalter-Werte („...“) und leere Texte zählen nicht.

   MUSTER (`muster`) ist ein VORSCHLAG nach Regeln, keine Entscheidung — die fällt bei der Gestaltung.
   Reihenfolge der Regeln, die erste trifft:
     0. Marke „übernommen“         Hinweis aus einer Datenumstellung („Automatisch übernommen …“)
     0a. bleibt: Satzanfang        Text endet auf „…“ (Satzanfang im Formular, etwa in der Patientenverfügung)
     0c. bleibt: Wortlaut der Verfügung   Text in der ersten Person ohne Anrede (Erklärungstext einer Verfügung)
     0b. bleibt: ist schon Marke   klein beginnend, bis 45 Zeichen, ohne Punkt („besonders geschützt“)
     1. bleibt: Folge oder Recht   Text nennt Unumkehrbares, Löschen, Gericht, Haftung, § (nicht bei Unterzeilen)
     2. bleibt: Eingabeprüfung     Leerzustand, der mit „Bitte“ beginnt (Meldung bei leerem Feld)
     3. Leerzustand mit Knopf      Leerzustand, der „noch kein/nichts/niemand“ sagt; andere Leer-Texte sind Status
     4. Link oder Chip mit ›       Text schickt an einen anderen Ort („unter „…““, „wählen Sie „…““);
                                   über 160 Zeichen: Aufklapper mit Pfeil, darin Link
     5. Schalter                   Text beschreibt Ein-/Ausschalten
     6. Hilfeseite bleibt          hilfe:* (ist selbst das Nachschlagemuster)
     7. Platzhalter im Feld        Feldhinweis bis 90 Zeichen, der mit dem Beispiel beginnt („z. B.“, „etwa“)
     8. Symbol mit Tooltip         Feldhinweis/Hinweis bis 90 Zeichen
     9. Aufklapper mit Pfeil       alles über 160 Zeichen
    10. kurzer Satz bleibt         der Rest (Unterzeilen, kurze Erklärungen)

   PRODUKT: „Pro“ für die Pro-Bereiche (pro-*); die übrigen Texte zeigen Privat und Pro gleichermaßen,
   soweit der Bereich im Produkt vorkommt.

   ORT: der Schlüsselbereich (Teil vor „:“/„.“/„#“) und, mit --kern, die erste Zeile im Kern, die den
   Schlüssel nennt (`STRINGS.<name>` oder der Schlüssel in Anführungszeichen); Bereichstexte werden im Kern
   über ihren Bereich gebaut und haben dort keine eigene Zeile („—“).

   AUFRUF
     node tools/hinweistexte-bestand.js                                   gegen die Fixtures (Suite)
     node tools/hinweistexte-bestand.js --modul <textsatz.json> [--modul <pro.json>] [--kern <html>] [--aus <datei.tsv>]
   Mehrere --modul: die erste Datei ist die Grundlage, jede weitere wird nur mit ihren abweichenden oder
   zusätzlichen Texten gelistet (Spalte `modul`). Ohne --aus geht die Tabelle nach stdout.
   Die Zusammenfassung (Zählung je Art und Muster) geht nach stderr. Exit 0, 2 bei falschem Aufruf.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures', 'hinweistexte-bestand');

const KURZ = 90;
const LANG = 160;

function artBestimmen(schluessel) {
  const name = schluessel.startsWith('strings:') ? schluessel.slice(8).replace(/\.text$/, '') : null;
  if (schluessel.startsWith('hilfe:') && /\.(einleitung|abschnitt\d+)$/.test(schluessel)) return 'Hilfeseite';
  if (/\.hint$/.test(schluessel)) return 'Feldhinweis';
  if (/\.hilfetext$/.test(schluessel)) return 'Feldhilfe';
  if (/\.(einfuehrungstext|einfuehrung|einleitung)$/.test(schluessel)) return 'Einführung';
  if (/\.navUnterzeile$/.test(schluessel)) return 'Unterzeile';
  if (/\.hinweis$|Hinweis$/.test(schluessel)) return 'Hinweis';
  if (name === null) return null;
  // Knöpfe und Titel eines Hinweis-Dialogs (migrationsHinweisSpaeter, wiedereinstiegHinweisOk) sind keine Hinweistexte.
  if (/(Knopf|Spaeter|Ok|Ja|Nein|Titel|Label|Abbrechen|Weiter|Schliessen)$/.test(name)) return null;
  if (/Leer(?!en)/.test(name)) return 'Leerzustand';
  if (/Hinweis/.test(name)) return 'Hinweis';
  if (/Erklaer|Einfuehrung|Intro|Tipp|Info|Beschreibung|Untertitel/.test(name)) return 'Erklärung';
  if (/Text$/.test(name)) return 'Erklärtext';
  return null;
}

const RE_FOLGE = /unumkehrbar|endgültig|nicht rückgängig|gelöscht|löscht|nicht mehr (lesbar|abrufbar|zu öffnen)|Gericht|haftet|Haftung|§/i;
const RE_LEER = /^(Noch|Hier ist noch)|noch (kein|nichts|niemand)/i;
const RE_ORT = /(unter|in|über|wählen Sie( dort)?|öffnen Sie( dort)?) „[^“]+“/;
const RE_SCHALTER = /einschalten|ausschalten|aktivieren|deaktivieren|abschalten/i;
const RE_BEISPIEL = /z\. ?B\.|zum Beispiel|etwa /;

function musterVorschlagen(art, schluessel, text) {
  const n = text.length;
  if (/^Automatisch übernommen/.test(text)) return 'Marke „übernommen“ mit Tooltip';
  if (/…$/.test(text)) return 'bleibt: Satzanfang im Formular';
  if (/(^|\s)(ich|mein|meine|meinen|meiner|mir|mich)\s/i.test(text) && !/\b(Sie|Ihr|Ihre)\b/.test(text)) return 'bleibt: Wortlaut der Verfügung';
  if (/^[a-zäöü]/.test(text) && n <= 45 && !/\.$/.test(text)) return 'bleibt: ist schon Marke';
  if (art !== 'Unterzeile' && RE_FOLGE.test(text)) return 'bleibt: Folge oder Recht';
  if (art === 'Leerzustand' && /^Bitte /.test(text)) return 'bleibt: Eingabeprüfung';
  if (art === 'Leerzustand') return RE_LEER.test(text) ? 'Leerzustand mit Knopf' : 'kurzer Satz bleibt';
  if (RE_ORT.test(text)) return n > LANG ? 'Aufklapper mit Pfeil, darin Link' : 'Link oder Chip mit ›';
  if (RE_SCHALTER.test(text)) return 'Schalter';
  if (art === 'Hilfeseite') return 'Hilfeseite bleibt';
  if ((art === 'Feldhinweis' || art === 'Feldhilfe') && n <= KURZ && RE_BEISPIEL.test(text.slice(0, 12))) return 'Platzhalter im Feld';
  if ((art === 'Feldhinweis' || art === 'Feldhilfe' || art === 'Hinweis') && n <= KURZ) return 'Symbol mit Tooltip';
  if (n > LANG) return 'Aufklapper mit Pfeil';
  return 'kurzer Satz bleibt';
}

function bereich(schluessel) {
  return schluessel.split(/[:.#]/)[0];
}

// Ein Durchlauf über den Kern: erste Zeile je `STRINGS.<name>` und je Name in Anführungszeichen.
function kernIndex(kernText) {
  if (!kernText) return null;
  const erste = new Map();
  kernText.split('\n').forEach((z, i) => {
    for (const m of z.matchAll(/STRINGS\.([A-Za-z0-9_]+)|['"]([^'"\s]{3,120})['"]/g)) {
      const name = m[1] || m[2];
      if (!erste.has(name)) erste.set(name, i + 1);
    }
  });
  return erste;
}

function kernOrt(index, schluessel) {
  if (!index) return '';
  const name = schluessel.startsWith('strings:') ? schluessel.slice(8).replace(/\.text$/, '') : schluessel;
  return index.has(name) ? String(index.get(name)) : '—';
}

function bestandErheben({ module, kern }) {
  const index = kernIndex(kern);
  const reihen = [];
  const basis = module[0].texte;
  module.forEach((m, idx) => {
    for (const [schluessel, roh] of Object.entries(m.texte)) {
      if (typeof roh !== 'string') continue;
      const text = roh.trim();
      if (!text || /^\.{3}$|^…$/.test(text)) continue;
      if (idx > 0 && basis[schluessel] === roh) continue;
      const art = artBestimmen(schluessel);
      if (!art) continue;
      reihen.push({
        modul: m.name,
        schluessel,
        bereich: bereich(schluessel),
        produkt: bereich(schluessel).startsWith('pro-') ? 'Pro' : '',
        kernZeile: kernOrt(index, schluessel),
        art,
        zeichen: text.length,
        woerter: text.split(/\s+/).length,
        muster: musterVorschlagen(art, schluessel, text),
        text,
      });
    }
  });
  return reihen;
}

function tsv(reihen) {
  const kopf = ['modul', 'schluessel', 'bereich', 'produkt', 'kernZeile', 'art', 'zeichen', 'woerter', 'muster', 'text'];
  const zelle = (v) => String(v).replace(/[\t\n\r]+/g, ' ');
  return [kopf.join('\t'), ...reihen.map((r) => kopf.map((k) => zelle(r[k])).join('\t'))].join('\n') + '\n';
}

function zusammenfassen(reihen) {
  const zaehl = (feld) => reihen.reduce((a, r) => ((a[r[feld]] = (a[r[feld]] || 0) + 1), a), {});
  const zeichen = reihen.reduce((a, r) => a + r.zeichen, 0);
  return { texte: reihen.length, zeichen, jeArt: zaehl('art'), jeMuster: zaehl('muster'), jeModul: zaehl('modul'), jeProdukt: zaehl('produkt') };
}

function argsLesen(argv) {
  const a = { module: [], kern: null, aus: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--modul') a.module.push(argv[++i]);
    else if (k === '--kern') a.kern = argv[++i];
    else if (k === '--aus') a.aus = argv[++i];
    else return { fehler: `unbekanntes Argument: ${k}` };
  }
  if (a.module.some((m) => !m) || (a.kern === undefined) || (a.aus === undefined)) return { fehler: 'Argument ohne Wert' };
  return a;
}

function main(argv) {
  const a = argsLesen(argv);
  if (a.fehler) {
    process.stderr.write(a.fehler + '\n');
    return 2;
  }
  if (a.module.length === 0) {
    a.module = [path.join(FIXTURES, 'textsatz-privat.json'), path.join(FIXTURES, 'textsatz-pro.json')];
    a.kern = a.kern || path.join(FIXTURES, 'kern.html');
  }
  const module = a.module.map((p) => ({ name: path.basename(p, '.json'), texte: JSON.parse(fs.readFileSync(p, 'utf8')).texte || {} }));
  const kern = a.kern ? fs.readFileSync(a.kern, 'utf8') : null;
  const reihen = bestandErheben({ module, kern });
  const ausgabe = tsv(reihen);
  if (a.aus) fs.writeFileSync(a.aus, ausgabe);
  else process.stdout.write(ausgabe);
  process.stderr.write(JSON.stringify(zusammenfassen(reihen), null, 2) + '\n');
  return 0;
}

module.exports = { artBestimmen, musterVorschlagen, bestandErheben, zusammenfassen, tsv };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
