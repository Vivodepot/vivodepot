#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   schutz-schluessel-erheben — welche Texte setzt allein die Anwendung selbst
   ────────────────────────────────────────────────────────────────────────────
   DER ZWECK (03.10.2026): der amtliche Wortlaut der Vorsorge-Dokumente und beide Haftungshinweise nach
   U2-ADR-025 kommen nur aus der Anwendung selbst (ab Werk oder intern signiert). Vorher galt das nur für die
   Zusicherungen nach U2-ADR-331 (tools/zusicherungs-schluessel-erheben.js).

   WAS GESCHÜTZT IST (Entscheidung der Gegenlesung, 03.10.2026): jeder Ab-Werk-Text, der in
   ein Dokument zum Unterschreiben eingeht, dazu die Haftung und die
   Zusicherungen. „amtlich“ ist nur eine Teilmenge davon — auch die
   KI-Verfügung ist eigener Text (U2-ADR-396) und wird trotzdem unterschrieben.

   ABGELEITET, NICHT VON HAND, und NICHT aus OFFEN_JURISTISCH: das ist ein
   Rückstands-Register (was auf Englisch noch das deutsche Original zeigt), kein
   Register des amtlichen Wortlauts — 37 amtliche Stellen haben es mit U2-ADR-343
   verlassen und blieben amtlich. Die Menge kommt aus zwei Ankern:
     1 der Namensraum `dok:` im deutschen Ab-Werk-Textsatz — jede Kennung darin
       gehört zum Wortlaut eines Ab-Werk-Dokuments
     2 die Korpora, die der Kern als Schrittsatz eines Dokuments anwendet
       (`_textsatzAufSchrittsatzAnwenden(<KORPUS>, '<wurzel>', …)`) — die Wurzel
       wird aus dem Kern gelesen, nicht hier genannt
   dazu NAMENTLICH die Haftungssätze und die Meldungen der Sperre selbst (auch
   diese Meldungen setzt nur die Anwendung). Jeder Name muss im Textsatz
   stehen, sonst bricht die Erhebung ab, statt eine Sperre festzuschreiben, die
   nichts hält. Die Zusicherungen bleiben in ihrer eigenen Region; der Kern fragt
   beide ab (`_istSchutzKennung`).

   EIN MODUL, DAS SICH SELBST `herkunft:'amtlich'` GIBT, ERWEITERT DIESE MENGE
   NICHT: sie ist eine Bauzeit-Region, kein Laufzeit-Modul liest oder schreibt sie.

   ZWEITER TRÄGER: die Lese-App (Region SCHUTZ-SCHLUESSEL-LESEN, dieselbe Menge). Sie zeigt einem Empfänger
   dieselben Dokumente; ein Modul aus der Datei darf dort so wenig einen geschützten Text setzen wie im Kern.
   --check und --schreiben behandeln beide Träger; weicht einer ab, ist die Erhebung rot.

   Aufruf:
     node tools/schutz-schluessel-erheben.js [--datei <kern>] [--lese <lese-app>] [--textsatz <de-modul>] [--json|--check|--schreiben]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const TEXTSATZ_DE = path.join(REPO, 'tools', 'textsatz-de-modul.json');
const LESE = path.join(REPO, 'vivodepot-lesen.html');

const BEGIN = '/* SCHUTZ-SCHLUESSEL-KERN:BEGIN — generierter Bereich (tools/schutz-schluessel-erheben.js) */';
const ENDE = '/* SCHUTZ-SCHLUESSEL-KERN:END */';
const BEGIN_LESE = '/* SCHUTZ-SCHLUESSEL-LESEN:BEGIN — generierter Bereich (tools/schutz-schluessel-erheben.js) */';
const ENDE_LESE = '/* SCHUTZ-SCHLUESSEL-LESEN:END */';
/* Je Träger: Grenzen der Region, Name der Konstanten, Anker für das erste Einsetzen. */
const TRAEGER = Object.freeze({
  kern: Object.freeze({ begin: BEGIN, ende: ENDE, konstante: 'SCHUTZ_SCHLUESSEL_KERN', anker: '/* ZUSICHERUNGS-SCHLUESSEL-KERN:END */' }),
  lese: Object.freeze({ begin: BEGIN_LESE, ende: ENDE_LESE, konstante: 'SCHUTZ_SCHLUESSEL_LESEN', anker: '/* ZUSICHERUNGS-SCHLUESSEL:END */' }),
});

const DOKUMENT_NAMENSRAUM = 'dok:';

/* Namentlich: die beiden Haftungssätze (U2-ADR-025), die Meldungen der Sperre, der Vermerk über ersetzte Ab-Werk-Fassungen (E4) und die Warnung der Klartext-Bindung
   (U2-ADR-156-Nachtrag, 05.10.2026) — ein Modul darf nicht überschreiben, was eine veränderte Datei meldet —, und der Hinweis „kein PDF ohne geprüfte Schrift“
   (Rückfallstufe 3 der PDF-Schrift, U2-ADR-473 W4), und die Sprachangabe eines Rückfalls — ein Modul darf nicht verbergen, dass ein Satz in einer
   anderen Sprache steht (HAFTUNG-SPRACHGRENZE F3, 06.10.2026). */
const NAMENTLICH = Object.freeze([
  'strings:fussHaftung.text',
  'strings:dokFussHaftung.text',
  'strings:rueckfallSprachangabe.text',   // die Sprachangabe eines Rückfalls (HAFTUNG-SPRACHGRENZE F3, 06.10.2026)
  'strings:erweiterungGesperrtTitel.text',
  'strings:erweiterungGesperrtText.text',
  'strings:erweiterungGesperrtVermerk.text',
  'strings:erweiterungEinlesenGesperrt.text',
  'strings:erweiterungTeilweiseErsetzt.text',
  'strings:abWerkFassungErsetztTitel.text',
  'strings:abWerkFassungErsetztText.text',
  'strings:klartextBindungTitel.text',
  'strings:klartextBindungOrtText.text',
  'strings:klartextBindungOrtKeinText.text',
  'strings:klartextBindungFremdText.text',
  'strings:pdfOhneSchriftHinweis.text',
]);

function korpusWurzeln(kern) {
  const wurzeln = [...kern.matchAll(/^\s*_textsatzAufSchrittsatzAnwenden\(\s*[A-Z_][A-Z0-9_]*\s*,\s*'([A-Za-z][A-Za-z0-9]*)'/gm)].map((m) => m[1]);
  if (!wurzeln.length) throw new Error('schutz-schluessel: kein Aufruf von _textsatzAufSchrittsatzAnwenden im Kern gefunden — der Anker trägt nicht mehr.');
  return [...new Set(wurzeln)].sort();
}

function erheben(kern, texte) {
  const kennungen = Object.keys(texte);
  const wurzeln = korpusWurzeln(kern);
  const ausKorpus = kennungen.filter((k) => wurzeln.some((w) => k.startsWith(w + '#') || k.startsWith(w + ':')));
  const ausDokument = kennungen.filter((k) => k.startsWith(DOKUMENT_NAMENSRAUM));
  const fehlend = NAMENTLICH.filter((k) => !Object.prototype.hasOwnProperty.call(texte, k));
  if (fehlend.length) {
    throw new Error('schutz-schluessel: diese namentlich geschützten Kennungen stehen nicht im deutschen Textsatz: ' + fehlend.join(', ')
      + ' — umbenannt oder entfernt? Erst klären, dann erheben.');
  }
  for (const w of wurzeln) {
    if (!ausKorpus.some((k) => k.startsWith(w))) throw new Error('schutz-schluessel: der Korpus „' + w + '“ hat keine Kennung im Textsatz — der Anker zeigt ins Leere.');
  }
  const schluessel = [...new Set([...ausDokument, ...ausKorpus, ...NAMENTLICH])].sort();
  return { schluessel, wurzeln, anzahl: { dokument: ausDokument.length, korpus: ausKorpus.length, namentlich: NAMENTLICH.length } };
}

function region(schluessel, t) {
  t = t || TRAEGER.kern;
  return t.begin + '\nconst ' + t.konstante + ' = new Set(' + JSON.stringify(schluessel, null, 0).replace(/","/g, '",\n  "').replace(/^\[/, '[\n  ').replace(/\]$/, '\n]') + ');\n' + t.ende;
}

function alteSchluesselAus(kern, t) {
  t = t || TRAEGER.kern;
  const a = kern.indexOf(t.begin);
  const e = kern.indexOf(t.ende);
  if (a < 0 || e < a) return null;
  const m = kern.slice(a, e).match(/new Set\((\[[\s\S]*\])\)/);
  return m ? JSON.parse(m[1]) : null;
}

/* Die Region steht direkt hinter der Zusicherungs-Region — derselbe Ort, dieselbe Bauart, in beiden Trägern. */
function regionErsetzen(kern, neu, t) {
  t = t || TRAEGER.kern;
  const a = kern.indexOf(t.begin);
  const e = kern.indexOf(t.ende);
  if (a >= 0 && e > a) return kern.slice(0, a) + neu + kern.slice(e + t.ende.length);
  const i = kern.indexOf(t.anker);
  if (i < 0) throw new Error('schutz-schluessel: weder die eigene Region noch der Anker ' + t.anker + ' gefunden.');
  return kern.slice(0, i + t.anker.length) + '\n' + neu + kern.slice(i + t.anker.length);
}

function main() {
  const a = process.argv.slice(2);
  const arg = (n, s) => { const i = a.indexOf('--' + n); return i >= 0 && a[i + 1] ? a[i + 1] : s; };
  const datei = path.resolve(arg('datei', KERN));
  const textsatz = path.resolve(arg('textsatz', TEXTSATZ_DE));
  const kern = fs.readFileSync(datei, 'utf8');
  const texte = JSON.parse(fs.readFileSync(textsatz, 'utf8')).texte;
  let r;
  try { r = erheben(kern, texte); } catch (e) { console.error(e.message); process.exit(1); }
  if (a.includes('--json')) { console.log(JSON.stringify(r, null, 2)); return; }
  if (a.includes('--schreiben') || a.includes('--check')) {
    const check = a.includes('--check');
    const ziele = [{ datei, t: TRAEGER.kern }, { datei: path.resolve(arg('lese', LESE)), t: TRAEGER.lese }];
    for (const z of ziele) {
      const text = fs.readFileSync(z.datei, 'utf8');
      const alte = alteSchluesselAus(text, z.t);
      const weggefallen = alte ? alte.filter((k) => !r.schluessel.includes(k)) : [];
      if (weggefallen.length) {
        console.error('schutz-schluessel: ' + weggefallen.length + ' Kennungen fallen in ' + path.basename(z.datei) + ' aus dem Schutz — das ist ein BEFUND, kein Zustand, den man fortschreibt: '
          + weggefallen.join(', ') + '. Erst klären, warum sie verschwinden; wachsen darf die Liste, schrumpfen nur mit benannter Klärung.');
        process.exit(1);
      }
      const neu = regionErsetzen(text, region(r.schluessel, z.t), z.t);
      z.drift = neu !== text;
      if (z.drift && check) {
        console.error('schutz-schluessel: die Schutzliste in ' + path.basename(z.datei) + ' weicht von der Erhebung ab. Beheben mit: npm run schutz:build');
        process.exit(1);
      }
      if (z.drift) fs.writeFileSync(z.datei, neu, 'utf8');
    }
    const geschrieben = ziele.filter((z) => z.drift).map((z) => path.basename(z.datei));
    console.log('schutz-schluessel: ' + r.schluessel.length + ' Kennungen (Dokument ' + r.anzahl.dokument + ', Korpus ' + r.anzahl.korpus
      + ' [' + r.wurzeln.join(', ') + '], namentlich ' + r.anzahl.namentlich + ') — ' + (geschrieben.length ? 'geschrieben: ' + geschrieben.join(', ') + '.' : 'nichts zu tun.'));
    return;
  }
  console.log('Schutz-Kennungen: ' + r.schluessel.length + ' (Dokument ' + r.anzahl.dokument + ', Korpus ' + r.anzahl.korpus + ' [' + r.wurzeln.join(', ') + '], namentlich ' + r.anzahl.namentlich + ')');
}

if (require.main === module) main();
module.exports = { erheben, region, regionErsetzen, alteSchluesselAus, korpusWurzeln, NAMENTLICH, BEGIN, ENDE, BEGIN_LESE, ENDE_LESE, TRAEGER, KERN, LESE, TEXTSATZ_DE };
