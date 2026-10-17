#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   qr-adresse-pruefen.js — ein QR-Code mit Webadresse zeigt die Adresse lesbar daneben (Klasse QR-ADRESSE-NICHT-LESBAR)
   ────────────────────────────────────────────────────────────────────────
   Ein QR-Code ist für Menschen nicht lesbar. Führt er auf eine Webadresse, sieht die Person erst nach dem Scannen, wohin.
   Darum, über alle Oberflächen gleich:

     Jede Stelle, die einen QR-Code erzeugt (`qrcode(`), steht mit ihrer Funktion in der Liste STELLEN unten.
     Trägt der Code eine Webadresse (sorte `adresse`), dann schreibt die genannte Anzeige-Funktion die Adresse als
     Text neben den Code, an einem Element mit `data-qr-adresse`.
     Trägt er keine (sorte `keine-adresse`), steht daneben, was er stattdessen trägt.

   WOHIN die Adresse führen darf, steht je Eintrag in `host`:
     `marke`  — nur eine Adresse aus MARKEN_ADRESSEN (gehalten von tools/marken-adressen-pruefen.js).
     `stelle` — die Adresse gibt die Stelle selbst ein (U2-ADR-460: die kompakte Anfrage liegt auf ihrem eigenen Webspace
                oder auf der Ablage der Marke). Hier gibt es keine Host-Liste; geprüft wird die Lesbarkeit, und weil der
                Code auf einem Aushang ohne die Seite gescannt wird, muss die Adresse auch IM heruntergeladenen Bild
                stehen: `bild` nennt die Funktion, die es zeichnet, und deren Text muss `fillText(` enthalten.

   Eine neue `qrcode(`-Stelle ohne Eintrag ist ein Befund: wer sie baut, entscheidet die Sorte hier, nicht nebenbei.
   Ein Eintrag ohne Stelle ist ebenfalls ein Befund (die Liste veraltet nicht still).

   Woher die Adresse kommen darf, hält tools/marken-adressen-pruefen.js (Adressen der Marke nur an der Marken-Stelle).
   Dieses Werkzeug prüft nur die Lesbarkeit neben dem Code.

   OBERFLÄCHE wie in tools/marken-adressen-pruefen.js (Signatur, nicht Dateiname).

   Aufruf:  node tools/qr-adresse-pruefen.js [--datei <pfad>]…   (ohne --datei: alle Oberflächen)
   Exit 0 ohne Fund, 1 mit Fund. Probe: tests/qr-adresse-lesbar.test.js
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const { OBERFLAECHEN, ohneKommentare } = require('./marken-adressen-pruefen.js');

const MARKE = 'data-qr-adresse';

/* Je QR-Stelle: Datei, Funktion mit dem `qrcode(`-Aufruf, Sorte, Inhalt. Bei sorte `adresse` zusätzlich `anzeige`:
   die Funktion, die Code und Adresse auf den Bildschirm bringt (oft dieselbe). */
const STELLEN = Object.freeze([
  Object.freeze({ datei: 'vivodepot.html', funktion: 'flowNotfallQR', sorte: 'keine-adresse', inhalt: 'vCard der Notfallkontakte' }),
  Object.freeze({ datei: 'vivodepot.html', funktion: 'flowNotfallkartePdf', sorte: 'keine-adresse', inhalt: 'dieselbe vCard, im PDF der Notfallkarte' }),
  Object.freeze({ datei: 'vivodepot.html', funktion: '_vereinbarungAngebotZeigen', sorte: 'keine-adresse', inhalt: 'Vereinbarung als Text (Präfix VDVB1:)' }),
  Object.freeze({ datei: 'vivodepot.html', funktion: 'uebergabeWiderrufPdfErzeugen', sorte: 'keine-adresse', inhalt: 'Widerruf-Nutzlast als JSON, ohne Adressfeld' }),
  Object.freeze({ datei: 'vivodepot.html', funktion: '_empfaengerQrErgebnisModal', sorte: 'adresse', host: 'marke', anzeige: '_empfaengerQrErgebnisModal',
    inhalt: 'Adresse der Lese-Seite (MARKEN_ADRESSEN.empfaengerQrLesen), der verschlüsselte Inhalt im Fragment' }),
  Object.freeze({ datei: 'vivodepot.html', funktion: '_eudiwAusgeben', sorte: 'keine-adresse', inhalt: 'Datenrahmen der mehrteiligen Ausgabe' }),
  Object.freeze({ datei: 'vivodepot-studio.html', funktion: 'kurzlinkAushangBild', sorte: 'adresse', host: 'stelle', anzeige: 'anfrageQrTeilAnhaengen', bild: 'kurzlinkAushangBild',
    inhalt: 'dieselbe kurze Adresse, als Bild für den Aushang mit der Adresse als Text im Bild' }),
  Object.freeze({ datei: 'vivodepot-studio.html', funktion: 'kurzlinkQrDataUrl', sorte: 'adresse', host: 'stelle', anzeige: 'anfrageQrTeilAnhaengen', bild: 'kurzlinkAushangBild',
    inhalt: 'kurze https-Adresse der Stelle (eigener Webspace oder MARKEN_ADRESSEN.anfrageAblage)' }),
]);

/* Alle Funktionsanfänge einer Datei, in Reihenfolge: `function name(` am Zeilenanfang (auch eingerückt, auch async). */
function funktionen(text) {
  const liste = [];
  const re = /^[ \t]*(?:async[ \t]+)?function[ \t]*\*?[ \t]*([A-Za-z_$][\w$]*)[ \t]*\(/gm;
  let m;
  while ((m = re.exec(text)) !== null) liste.push({ name: m[1], index: m.index });
  return liste;
}
function zeileVon(text, index) { return text.slice(0, index).split('\n').length; }

/* Die Funktion, in der `index` liegt: der letzte Funktionsanfang davor. Verschachtelte Hilfsfunktionen zählen als eigene
   Funktion — eine QR-Stelle in einer solchen wird unter deren Namen eingetragen. */
function funktionBei(liste, index) {
  let treffer = null;
  for (const f of liste) { if (f.index <= index) treffer = f; else break; }
  return treffer;
}
/* Der Text einer benannten Funktion: von ihrem Anfang bis zum nächsten Funktionsanfang auf derselben oder geringerer Einrückung
   ist statisch nicht sicher zu bestimmen; darum bis zum nächsten Funktionsanfang am ZEILENBEGINN (Spalte 0). */
function koerper(text, name) {
  const re = new RegExp('^(?:async[ \\t]+)?function[ \\t]*\\*?[ \\t]*' + name.replace(/[$]/g, '\\$') + '[ \\t]*\\(', 'm');
  const m = re.exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const n = /^(?:async[ \t]+)?function[ \t]*\*?[ \t]*[A-Za-z_$]/m.exec(rest);
  return text.slice(m.index, n ? m.index + m[0].length + n.index : text.length);
}

function pruefeText(datei, roh, stellen = STELLEN) {
  const text = ohneKommentare(roh);
  const befunde = [];
  const liste = funktionen(text);
  const gefunden = new Set();
  const re = /\bqrcode\(/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const f = funktionBei(liste, m.index);
    const name = f ? f.name : '(außerhalb einer Funktion)';
    const eintrag = stellen.find((s) => s.datei === datei && s.funktion === name);
    if (!eintrag) {
      // Die eingebettete Bibliothek ruft sich selbst nicht als `qrcode(` auf; ein Treffer ohne Eintrag ist eine neue Stelle.
      befunde.push({ datei, zeile: zeileVon(text, m.index), funktion: name, grund: 'QR-Stelle ohne Eintrag in STELLEN (Sorte entscheiden: adresse oder keine-adresse)' });
      continue;
    }
    gefunden.add(eintrag);
    if (eintrag.sorte !== 'adresse') continue;
    const k = koerper(text, eintrag.anzeige);
    if (k === null) befunde.push({ datei, zeile: zeileVon(text, m.index), funktion: name, grund: 'Anzeige-Funktion ' + eintrag.anzeige + ' nicht gefunden' });
    else if (!k.includes(MARKE)) befunde.push({ datei, zeile: zeileVon(text, m.index), funktion: name, grund: 'QR-Code mit Webadresse ohne lesbare Adresse daneben (' + MARKE + ' fehlt in ' + eintrag.anzeige + ')' });
    if (!['marke', 'stelle'].includes(eintrag.host)) befunde.push({ datei, zeile: zeileVon(text, m.index), funktion: name, grund: 'Eintrag ohne host (marke oder stelle)' });
    if (eintrag.host === 'stelle') {
      const b = eintrag.bild ? koerper(text, eintrag.bild) : null;
      if (b === null || !b.includes('fillText(')) befunde.push({ datei, zeile: zeileVon(text, m.index), funktion: name, grund: 'Adresse der Stelle ohne Bild mit lesbarer Adresse (U2-ADR-460: ' + (eintrag.bild || 'bild fehlt') + ' zeichnet keinen Text)' });
      else if (!k.includes(eintrag.bild + '(')) befunde.push({ datei, zeile: zeileVon(text, m.index), funktion: name, grund: 'Anzeige ' + eintrag.anzeige + ' bietet das Bild mit Adresse nicht an (' + eintrag.bild + ' ohne Aufruf)' });
    }
  }
  for (const s of stellen) {
    if (s.datei === datei && !gefunden.has(s)) befunde.push({ datei, zeile: 0, funktion: s.funktion, grund: 'Eintrag in STELLEN ohne QR-Stelle (Eintrag entfernen oder Funktion umbenannt?)' });
  }
  return befunde;
}

function pruefen(dateien = OBERFLAECHEN, repo = REPO) {
  const befunde = [];
  for (const d of dateien) befunde.push(...pruefeText(path.basename(d), fs.readFileSync(path.isAbsolute(d) ? d : path.join(repo, d), 'utf8')));
  return befunde;
}

module.exports = { STELLEN, MARKE, pruefeText, pruefen, funktionen, koerper };

if (require.main === module) {
  const args = process.argv.slice(2);
  const dateien = [];
  for (let i = 0; i < args.length; i++) if (args[i] === '--datei' && args[i + 1]) dateien.push(args[++i]);
  const befunde = pruefen(dateien.length ? dateien : OBERFLAECHEN);
  for (const b of befunde) console.log(b.datei + ':' + b.zeile + '  ' + b.funktion + '  ' + b.grund);
  console.log(befunde.length ? befunde.length + ' Befund(e)' : 'QR-Stellen: ohne Befund');
  process.exit(befunde.length ? 1 : 0);
}
