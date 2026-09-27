#!/usr/bin/env node
'use strict';
/* sensibel-direktlesung-pruefen.js — Wächter gegen die Klasse „ein Ausgabeweg liest das Schema-Flag `sensibel`
   direkt und sieht die Überschreibung der Inhaberin nicht" (Anlass: drei Stellen im Situationsblatt lasen
   `f.sensibel`, während die Nachbarzeile für Quell-Felder `feldIstSensibel` nutzte; eine dauerhafte
   Zurückhaltung wäre dort ohne Wirkung geblieben).
   Regel: jede Codezeile in vivodepot.html, die `<x>.sensibel` liest (nicht schreibt), steht mit Grund in
   tools/sensibel-direktlesung-grundlinie.json. Neue Lesestelle ohne Eintrag: rot; Eintrag ohne Fund: rot
   (die Liste kann nur sinken); „OFFEN"-Gründe zählen sichtbar mit und dürfen nur weniger werden.
   Aufruf: node tools/sensibel-direktlesung-pruefen.js [--grundlinie-schreiben] */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const GRUNDLINIE = path.join(__dirname, 'sensibel-direktlesung-grundlinie.json');
const LESUNG = /([A-Za-z_$][\w$.\]\[]*)\.sensibel(?![\w-])(?!\s*=[^=])/g;
const ANDERER_GEGENSTAND = /(^|\.)(opt|optionen|zurueckgehalten|datensatz)$/;

/* Gründe je Muster für die Erstaufnahme; was keins trifft, wird „OFFEN". */
const GRUND_REGELN = [
  [/g && g\.sensibel === true|u && u\.sensibel === true|def\.sensibel === true/, 'Schema-Aufbau aus dem Bündel (übernimmt die Vorgabe)'],
  [/felddefs\.some/, 'Modulprüfung: Vorgabe des Schemas, kein Ausgabeweg'],
  [/return !!feld\.sensibel|unterfeldDef\.sensibel/, 'das Prädikat selbst (feldIstSensibel / unterfeldIstSensibel)'],
  [/sensibel: !!p\.sensibel|src\.sensibel === true|e\.sensibel \?/, 'Mappe-Eintrag: eigenes Flag am Eintrag'],
  [/d\.sensibel/, 'Prüftermin-Dokument: eigenes Flag am Dokument'],
  [/sensibelBetroffen: vorhanden\.filter/, 'liest das mit feldIstSensibel berechnete Ergebnis (anreichern), kein Schema-Flag'],
  [/schemaSensibel: !!f\.sensibel|const schemaSensibel = !!f\.sensibel/, 'Herausgabe-Übersicht zeigt die Vorgabe des Schemas an (schemaSensibel neben nutzerMarkiert)'],
];

function normalisiert(zeile) {
  return zeile.replace(/\s\/\/.*$/, '').replace(/\s+/g, ' ').trim();
}

function direkteLesungen(quelltext) {
  const funde = [];
  let imBlock = false;
  quelltext.split('\n').forEach((zeile, i) => {
    const t = zeile.trim();
    if (imBlock) { if (t.includes('*/')) imBlock = false; return; }
    if (t.startsWith('/*') && !t.includes('*/')) { imBlock = true; return; }
    if (/^(\/\/|\/\*|\*)/.test(t)) return;
    const code = normalisiert(zeile);
    LESUNG.lastIndex = 0;
    let m;
    while ((m = LESUNG.exec(code)) !== null) {
      if (ANDERER_GEGENSTAND.test(m[1])) continue;
      funde.push({ zeile: i + 1, text: code });
      break;
    }
  });
  return funde;
}

function pruefe(funde, grundlinie) {
  const erlaubt = (grundlinie && grundlinie.erlaubt) || {};
  const probleme = [];
  const gefunden = new Set(funde.map((f) => f.text));
  for (const f of funde) {
    if (!Object.prototype.hasOwnProperty.call(erlaubt, f.text)) probleme.push('Zeile ' + f.zeile + ': direkte Lesung von .sensibel ohne Eintrag in der Grundlinie: ' + f.text.slice(0, 140));
  }
  for (const text of Object.keys(erlaubt)) {
    if (!gefunden.has(text)) probleme.push('Eintrag der Grundlinie ohne Fund (Stelle entfällt oder hat sich geändert), Eintrag entfernen: ' + text.slice(0, 140));
  }
  const offen = Object.values(erlaubt).filter((g) => /^OFFEN/.test(g)).length;
  if (grundlinie && typeof grundlinie.offenMax === 'number' && offen > grundlinie.offenMax) probleme.push('OFFEN-Einträge ' + offen + ' > ' + grundlinie.offenMax + ' (nur sinkend)');
  return { probleme, offen };
}

function grundlinieAufnehmen(funde) {
  const erlaubt = {};
  for (const f of funde) {
    const regel = GRUND_REGELN.find(([re]) => re.test(f.text));
    erlaubt[f.text] = regel ? regel[1] : 'OFFEN: nicht begründet, prüfen, ob dieser Weg eine Überschreibung sehen muss';
  }
  return { erklaerung: 'Codezeilen in vivodepot.html, die .sensibel lesen, mit Grund. Wächter: tools/sensibel-direktlesung-pruefen.js. Nur sinkend.',
    offenMax: Object.values(erlaubt).filter((g) => /^OFFEN/.test(g)).length, erlaubt };
}

function main() {
  const funde = direkteLesungen(fs.readFileSync(KERN, 'utf8'));
  if (process.argv.includes('--grundlinie-schreiben')) {
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(grundlinieAufnehmen(funde), null, 2) + '\n');
    console.log('[sensibel-direktlesung] Grundlinie geschrieben (' + funde.length + ' Stellen)');
    return;
  }
  const r = pruefe(funde, JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')));
  if (r.probleme.length) { console.error('[sensibel-direktlesung] ' + r.probleme.length + ' Fund(e):\n  ' + r.probleme.join('\n  ')); process.exit(1); }
  console.log('[sensibel-direktlesung] sauber — ' + funde.length + ' Lesestellen, offen ' + r.offen + '.');
}
if (require.main === module) main();
module.exports = { direkteLesungen, pruefe, grundlinieAufnehmen, GRUNDLINIE, KERN };
