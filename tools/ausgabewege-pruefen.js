#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ausgabewege-pruefen.js — Wächter: jeder Ausgabeweg des Kerns ist eingeordnet
   (MyTerms v1-Schnitt, Teil D, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Sammelt aus den Skriptblöcken von vivodepot.html jede Stelle, an der etwas das Gerät
   verlassen kann — Aufrufe der Senken unten, Kommentare und eingebettete Bibliotheken
   (Zeilen über 2000 Zeichen) ausgenommen — und ordnet sie der umschließenden Funktion
   auf oberster Ebene zu. Jede so gefundene Funktion braucht eine Zeile in
   tools/lib/ausgabewege-einordnung.js.

   ZWEI ARTEN VON ROT (dieselbe Bauart wie ab-werk-rangfolge-pruefen.js):
     UNEINGEORDNET  ein Ausgabeweg im Kern ohne Zeile
     VERALTET       eine Zeile ohne Ausgabeweg im Kern

   DAZU DIE NACHFRAGE (25.10.2026, Pro: „Herausgegeben“ auf allen Wegen, U2-ADR-120): jede Zeile der Klasse
   `weitergabe` sagt mit `nachfrage`, wo die freiwillige Nachfrage nach „Herausgegeben“ steht — 'selbst' (der Rumpf
   ruft sie) oder { in: [...] } (die genannten Einstiege rufen sie) oder { ohne: '<Grund>' } (Ausnahme, braucht ein
   Wort). Rot ist eine Weitergabe-Zeile ohne Angabe oder ohne den Aufruf, und ein Notfall-Weg MIT Aufruf: er darf im
   Ernstfall nicht aufhalten.
     NACHFRAGE      eine Weitergabe ohne Nachfrage, eine Angabe außerhalb der Weitergabe, ein Notfall-Weg mit Nachfrage

   DAZU DER GRUNDSATZ (10.11.2026): Daten gehen an jede Stelle maschinenlesbar im anwendbaren Standard und als PDF hinaus.
   Jede Zeile der Klasse `weitergabe` sagt mit `standard` und `pdf`, wo beides steht; jedes Format der Registry braucht eine
   tragende Registerzeile, jeder eingebaute Bereich ein Format. Was fehlt, steht einzeln in
   tools/ausgabe-grundsatz-grundlinie.json; die Liste darf nur kürzer werden.
     GRUNDSATZ      eine Angabe fehlt oder trägt nicht, eine Lücke steht nicht in der Liste, ein Listeneintrag ist geschlossen

   Wo gesucht und nichts gefunden wurde, sagt die Zeile { keiner: '<Registerzeile>', eigenes: … }. Der Eintrag unter `keinStandard` nennt
   Thema, Suchweg mit öffentlicher Adresse, Datum, Wiedervorlage, Medientyp und Herkunft. Maschinenlesbar und PDF bleiben Pflicht.
   Eine abgelaufene Wiedervorlage nennt das Werkzeug als Hinweis, sie färbt nichts rot.

   Mit --dokument prüft das Werkzeug einen Bericht oder Auftrag auf die Zeile `Ausgabe:`.

   Aufruf: node tools/ausgabewege-pruefen.js [--kern pfad] | --dokument pfad
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { KLASSEN, AUSGABEWEGE_EINORDNUNG } = require('./lib/ausgabewege-einordnung.js');
const { registerLesen } = require('./standards-register-pruefen.js');

const SENKEN = Object.freeze([
  /\bdateiAusgeben\s*\(/, /\bwindow\.print\s*\(/, /\bnavigator\.share\s*\(/,
  /\bshowSaveFilePicker\s*\(/, /\.download\s*=/, /\bURL\.createObjectURL\s*\(/,
  // G2 (TOR-IN-DER-DEFINITION, 26.09.2026): auch Zwischenablage, Nachricht an ein anderes Fenster und QR-Code tragen Inhalt vom
  // Gerät weg — ein QR-Code wird gescannt, die Zwischenablage eingefügt, wo die Person will.
  /\bnavigator\.clipboard\b/, /\.postMessage\s*\(/, /\bqrcode\s*\(/,
]);

// Entfernt Block- und Zeilenkommentare zeilenweise; `imBlock` trägt den Zustand über Zeilen.
function _ohneKommentare(zeile, zustand) {
  let raus = '';
  let i = 0;
  while (i < zeile.length) {
    if (zustand.imBlock) {
      const ende = zeile.indexOf('*/', i);
      if (ende < 0) return raus;
      zustand.imBlock = false; i = ende + 2; continue;
    }
    const block = zeile.indexOf('/*', i);
    const linie = zeile.indexOf('//', i);
    const naechst = [block, linie].filter((x) => x >= 0).sort((a, b) => a - b)[0];
    if (naechst === undefined) { raus += zeile.slice(i); break; }
    // `//` in einer URL-Zeichenkette ('https://…') ist kein Kommentar.
    if (naechst === linie && zeile.charAt(linie - 1) === ':') { raus += zeile.slice(i, linie + 2); i = linie + 2; continue; }
    raus += zeile.slice(i, naechst);
    if (naechst === linie) break;
    zustand.imBlock = true; i = block + 2;
  }
  return raus;
}

function ausgabewegeSammeln(kernText) {
  const zeilen = String(kernText).split('\n');
  const funde = new Map();
  let imSkript = false;
  let funktion = null;
  const zustand = { imBlock: false };
  zeilen.forEach((roh, idx) => {
    if (/<script\b/i.test(roh) && !/<\/script>/i.test(roh)) { imSkript = true; zustand.imBlock = false; funktion = null; return; }
    if (/<\/script>/i.test(roh)) { imSkript = false; return; }
    if (!imSkript || roh.length > 2000) return;
    const kopf = roh.match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
    if (kopf && !zustand.imBlock) funktion = kopf[1];
    else if (!zustand.imBlock && /^(?:const|let|var|class)\s/.test(roh)) funktion = null;
    const code = _ohneKommentare(roh, zustand);
    for (const s of SENKEN) {
      if (!s.test(code)) continue;
      const name = funktion || '(oberste Ebene, Zeile ' + (idx + 1) + ')';
      if (!funde.has(name)) funde.set(name, []);
      funde.get(name).push(idx + 1);
    }
  });
  return funde;
}

// Der Code (ohne Kommentare) je Funktion auf oberster Ebene — dieselbe Zuordnung wie ausgabewegeSammeln.
function funktionsRuempfe(kernText) {
  const zeilen = String(kernText).split('\n');
  const ruempfe = new Map();
  let imSkript = false;
  let funktion = null;
  const zustand = { imBlock: false };
  zeilen.forEach((roh) => {
    if (/<script\b/i.test(roh) && !/<\/script>/i.test(roh)) { imSkript = true; zustand.imBlock = false; funktion = null; return; }
    if (/<\/script>/i.test(roh)) { imSkript = false; return; }
    if (!imSkript || roh.length > 2000) return;
    const kopf = roh.match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
    if (kopf && !zustand.imBlock) funktion = kopf[1];
    else if (!zustand.imBlock && /^(?:const|let|var|class)\s/.test(roh)) funktion = null;
    const code = _ohneKommentare(roh, zustand);
    if (!funktion) return;
    ruempfe.set(funktion, (ruempfe.get(funktion) || '') + code + '\n');
  });
  return ruempfe;
}

const NACHFRAGE_AUFRUF = /\b_nach(?:Weitergabe|Auszug)Nachfragen\s*\(/;

function nachfragePruefen(kernText, tabelle) {
  const t = tabelle || AUSGABEWEGE_EINORDNUNG;
  const ruempfe = funktionsRuempfe(kernText);
  const ruft = (name) => NACHFRAGE_AUFRUF.test(ruempfe.get(name) || '');
  const rot = [];
  for (const [name, z] of Object.entries(t)) {
    const n = z.nachfrage;
    if (z.klasse === 'notfall' && ruft(name)) rot.push(name + ': Notfall-Weg mit Nachfrage');
    if (z.klasse !== 'weitergabe') { if (n !== undefined) rot.push(name + ': Nachfrage außerhalb der Weitergabe'); continue; }
    if (n === 'selbst') { if (!ruft(name)) rot.push(name + ': ruft die Nachfrage nicht'); continue; }
    if (n && Array.isArray(n.in) && n.in.length) {
      for (const e of n.in) if (!ruft(e)) rot.push(name + ': Einstieg ' + e + ' ruft die Nachfrage nicht');
      continue;
    }
    if (n && typeof n.ohne === 'string' && n.ohne.trim()) continue;
    rot.push(name + ': ohne Angabe zur Nachfrage');
  }
  return rot.sort();
}

const PDF_AUFRUF = /\b(?:jsPDF|flowBereichPdf|flowSituationPdf|anlassPdfAusgeben|_dokumentPdfMitPruefung)\s*\(/;
const TRAGENDE_REGISTERSTAENDE = Object.freeze(['echt', 'teilweise']);
const GRUNDLINIE_PFAD = path.join(__dirname, 'ausgabe-grundsatz-grundlinie.json');

function _literalBlock(kernText, name) {
  const start = String(kernText).indexOf('const ' + name + ' = Object.freeze([');
  if (start < 0) return '';
  const ende = kernText.indexOf('\n]);', start);
  return kernText.slice(start, ende < 0 ? undefined : ende);
}

// Die Formate der Registry mit ihrem Bereich, aus dem Literal im Kern.
function exportFormateLesen(kernText) {
  return [..._literalBlock(kernText, 'EXPORT_FORMATE').matchAll(/^\s*\{ id: '([^']+)'([^\n]*)/gm)]
    .map((m) => ({ id: m[1], sektor: (m[2].match(/sektor: '([^']+)'/) || [])[1] }));
}

function eingebauteBereicheLesen(kernText) {
  return [..._literalBlock(kernText, 'BEREICH_IDS_EINGEBAUT').matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
}

function _registerZeilen() {
  const zeilen = [];
  for (const { inhalt } of registerLesen()) zeilen.push(...(inhalt.standards || []));
  return zeilen;
}

// Eine Registerzeile trägt die Ausgabe, wenn sie einen tragenden Stand, eine Fassung und eine Quelle nennt.
function _traegt(z) {
  return Boolean(z && TRAGENDE_REGISTERSTAENDE.includes(z.status) && String(z.version || '').trim() && z.quelle);
}

const KEIN_STANDARD_FELDER = Object.freeze(['thema', 'suchweg', 'datum', 'wiedervorlage', 'medientyp', 'herkunft']);
const MASCHINENLESBAR = /^(?:application\/(?:json|xml|octet-stream|[a-z0-9.-]+\+(?:json|xml))|text\/(?:csv|xml))$/;
const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

// Eine Zeile `keiner`: gesucht, nichts gefunden, und die Ausgabe geht trotzdem maschinenlesbar als Eigenes hinaus.
function _keinerPruefen(name, s, zeile, eintrag, kernText, ruempfe) {
  const rot = [];
  if (!zeile) rot.push(name + ': Registerzeile ' + s.keiner + ' gibt es nicht');
  else if (zeile.status !== 'kein-standard-vorhanden') rot.push(name + ': Registerzeile ' + s.keiner + ' steht nicht auf kein-standard-vorhanden');
  if (!eintrag) return [...rot, name + ': kein Eintrag unter keinStandard'];
  for (const f of KEIN_STANDARD_FELDER) if (!String(eintrag[f] || '').trim()) rot.push(name + ': keinStandard ohne ' + f);
  const such = String(eintrag.suchweg || '');
  if (such.trim() && !/https:\/\/\S/.test(such)) rot.push(name + ': Suchweg ohne öffentliche Adresse');
  if (/\.md\b|\/Users\//.test(such)) rot.push(name + ': Suchweg nennt eine interne Stelle');
  for (const f of ['datum', 'wiedervorlage']) if (eintrag[f] && !ISO_DATUM.test(eintrag[f])) rot.push(name + ': ' + f + ' ist kein Datum');
  const einstiege = s.eigenes === 'selbst' ? [name] : (s.eigenes && Array.isArray(s.eigenes.in) ? s.eigenes.in : []);
  if (!einstiege.length) rot.push(name + ': ohne Angabe zur eigenen Ausgabe');
  if (eintrag.medientyp && !MASCHINENLESBAR.test(eintrag.medientyp)) rot.push(name + ': Medientyp ' + eintrag.medientyp + ' ist nicht maschinenlesbar');
  else if (eintrag.medientyp) for (const e of einstiege) if (!(ruempfe.get(e) || '').includes(eintrag.medientyp)) rot.push(name + ': Einstieg ' + e + ' gibt keine Datei mit ' + eintrag.medientyp + ' aus');
  if (eintrag.herkunft && !String(kernText).includes("'" + eintrag.herkunft + "'")) rot.push(name + ': Herkunft ' + eintrag.herkunft + ' steht nicht im Kern');
  return rot;
}

// Die Einträge, deren Wiedervorlage vor dem Baudatum des Kerns liegt: ein Hinweis, das Urteil bleibt je Baum gleich.
function wiedervorlagenAbgelaufen(kernText, grundlinie) {
  const kein = (grundlinie || JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'))).keinStandard || {};
  const heute = (String(kernText).match(/const BUILD_DATUM = '(\d{4}-\d{2}-\d{2})'/) || [])[1];
  if (!heute) return [];
  return Object.keys(kein).filter((k) => String(kein[k].wiedervorlage || '9') < heute).sort();
}

function grundsatzPruefen(kernText, tabelle, register, grundlinie) {
  const t = tabelle || AUSGABEWEGE_EINORDNUNG;
  const reg = register || _registerZeilen();
  const gl = grundlinie || JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'));
  const liste = gl.luecken;
  const kein = gl.keinStandard || {};
  const genutztKein = new Set();
  const ruempfe = funktionsRuempfe(kernText);
  const ruftPdf = (name) => PDF_AUFRUF.test(ruempfe.get(name) || '');
  const istWeitergabe = (name) => t[name] && t[name].klasse === 'weitergabe';
  const hatGrund = (x) => Boolean(x) && typeof x.fehlt === 'string' && x.fehlt.trim() !== '';
  const rot = [];
  const ist = new Map();
  const lueckeMerken = (schluessel, was) => ist.set(schluessel, [...(ist.get(schluessel) || []), was]);

  for (const [name, z] of Object.entries(t)) {
    if (z.klasse !== 'weitergabe') {
      if (z.standard !== undefined || z.pdf !== undefined) rot.push(name + ': Standard oder PDF außerhalb der Weitergabe');
      continue;
    }
    const s = z.standard;
    if (s && s.register) {
      const zeile = reg.find((r) => r.id === s.register);
      if (!zeile) rot.push(name + ': Registerzeile ' + s.register + ' gibt es nicht');
      else if (!_traegt(zeile)) rot.push(name + ': Registerzeile ' + s.register + ' trägt nicht (Stand ' + zeile.status + ', Fassung und Quelle nötig)');
    } else if (s && s.wie) {
      if (!istWeitergabe(s.wie) || !t[s.wie].standard || t[s.wie].standard.wie) rot.push(name + ': Standard wie ' + s.wie + ' führt nicht zu einer Angabe');
    } else if (s && s.keiner) {
      genutztKein.add('weg:' + name);
      rot.push(..._keinerPruefen(name, s, reg.find((r) => r.id === s.keiner), kein['weg:' + name], kernText, ruempfe));
    } else if (hatGrund(s)) lueckeMerken('weg:' + name, 'standard');
    else if (!(s && s.formate === true)) rot.push(name + ': ohne Angabe zum Standard');
    // `je` (D2, 12.11.2026): ein Weg, der je Fall (z. B. je Anlass) im Standard ausgibt; jeder Fall nennt eine tragende Registerzeile.
    if (s && s.je) {
      for (const [fall, j] of Object.entries(s.je)) {
        const zeile = j && j.register ? reg.find((r) => r.id === j.register) : null;
        if (!zeile) rot.push(name + ' (' + fall + '): Registerzeile ' + (j && j.register) + ' gibt es nicht');
        else if (!_traegt(zeile)) rot.push(name + ' (' + fall + '): Registerzeile ' + j.register + ' trägt nicht (Stand ' + zeile.status + ')');
      }
    }

    const p = z.pdf;
    if (p === 'selbst') { if (!ruftPdf(name)) rot.push(name + ': erzeugt kein PDF'); }
    else if (p && Array.isArray(p.in) && p.in.length) {
      for (const e of p.in) if (!ruftPdf(e)) rot.push(name + ': Einstieg ' + e + ' bietet kein PDF');
    } else if (p && p.wie) {
      if (!istWeitergabe(p.wie) || !t[p.wie].pdf || t[p.wie].pdf.wie) rot.push(name + ': PDF wie ' + p.wie + ' führt nicht zu einer Angabe');
    } else if (hatGrund(p)) lueckeMerken('weg:' + name, 'pdf');
    else rot.push(name + ': ohne Angabe zum PDF');
  }

  const formate = exportFormateLesen(kernText);
  for (const f of formate) {
    if (!reg.some((r) => (r.exportwege || []).includes(f.id) && _traegt(r))) lueckeMerken('format:' + f.id, 'standard');
  }
  const mitFormat = new Set(formate.map((f) => f.sektor));
  for (const b of eingebauteBereicheLesen(kernText)) if (!mitFormat.has(b)) lueckeMerken('bereich:' + b, 'standard');

  for (const [schluessel, was] of ist) {
    const eintrag = liste[schluessel];
    if (!eintrag) rot.push(schluessel + ': Lücke (' + was.join(', ') + ') steht nicht in der Bestandsliste');
    else if ([...eintrag.fehlt].sort().join() !== [...was].sort().join()) rot.push(schluessel + ': Bestandsliste sagt ' + eintrag.fehlt.join(', ') + ', gemessen ' + was.join(', '));
  }
  for (const schluessel of Object.keys(kein)) if (!genutztKein.has(schluessel)) rot.push(schluessel + ': Eintrag unter keinStandard ohne Zeile keiner');
  for (const schluessel of Object.keys(liste)) if (!ist.has(schluessel)) rot.push(schluessel + ': Lücke ist geschlossen, der Eintrag muss aus der Bestandsliste');
  return rot.sort();
}

// Ein Bericht oder Auftrag trägt eine Zeile `Ausgabe:` mit Standard und PDF, oder `Ausgabe: keine`.
function dokumentPruefen(text) {
  const zeilen = String(text).split('\n').map((z) => z.match(/^\s*(?:[-*]\s+)?\**Ausgabe:\**\s*(.*)$/)).filter(Boolean).map((m) => m[1].trim());
  if (!zeilen.length) return ['Zeile „Ausgabe:“ fehlt'];
  const rot = [];
  for (const z of zeilen) {
    if (/^keine\b/i.test(z)) continue;
    if (!/\bStandard\s+\S/.test(z)) rot.push('„Ausgabe: ' + z + '“ nennt keinen Standard');
    if (!/\bPDF\s+\S/.test(z)) rot.push('„Ausgabe: ' + z + '“ nennt kein PDF');
  }
  return rot;
}

function ausgabewegePruefen(kernText, tabelle) {
  const t = tabelle || AUSGABEWEGE_EINORDNUNG;
  const funde = ausgabewegeSammeln(kernText);
  const uneingeordnet = [...funde.keys()].filter((n) => !Object.prototype.hasOwnProperty.call(t, n)).sort();
  const veraltet = Object.keys(t).filter((n) => !funde.has(n)).sort();
  const klasseFalsch = Object.keys(t).filter((n) => !KLASSEN.includes(t[n].klasse) || !String(t[n].grund || '').trim()).sort();
  const nachfrage = nachfragePruefen(kernText, t);
  const grundsatz = grundsatzPruefen(kernText, t);
  return { ok: !uneingeordnet.length && !veraltet.length && !klasseFalsch.length && !nachfrage.length && !grundsatz.length,
    uneingeordnet, veraltet, klasseFalsch, nachfrage, grundsatz, funde };
}

module.exports = { ausgabewegeSammeln, ausgabewegePruefen, funktionsRuempfe, nachfragePruefen, grundsatzPruefen, wiedervorlagenAbgelaufen, dokumentPruefen, exportFormateLesen, SENKEN };

if (require.main === module) {
  const d = process.argv.indexOf('--dokument');
  if (d > 0) {
    const rot = dokumentPruefen(fs.readFileSync(process.argv[d + 1], 'utf8'));
    for (const z of rot) console.log('AUSGABE-ZEILE  ' + z);
    console.log(rot.length ? 'ausgabe-zeile: ROT' : 'ausgabe-zeile: in Ordnung');
    process.exit(rot.length ? 1 : 0);
  }
  const i = process.argv.indexOf('--kern');
  const kernPfad = i > 0 ? process.argv[i + 1] : path.join(__dirname, '..', 'vivodepot.html');
  const r = ausgabewegePruefen(fs.readFileSync(kernPfad, 'utf8'));
  for (const n of r.uneingeordnet) console.log('UNEINGEORDNET  ' + n + '  Zeilen ' + r.funde.get(n).join(', '));
  for (const n of r.veraltet) console.log('VERALTET       ' + n);
  for (const n of r.klasseFalsch) console.log('KLASSE/GRUND   ' + n);
  for (const n of r.nachfrage) console.log('NACHFRAGE      ' + n);
  for (const n of r.grundsatz) console.log('GRUNDSATZ      ' + n);
  for (const n of wiedervorlagenAbgelaufen(fs.readFileSync(kernPfad, 'utf8'))) console.log('HINWEIS        Wiedervorlage abgelaufen: ' + n);
  console.log(r.ok ? 'ausgabewege: ' + r.funde.size + ' eingeordnet' : 'ausgabewege: ROT');
  process.exit(r.ok ? 0 : 1);
}
