#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Ausgänge gegen eine FREMDE Implementierung geprüft — vCard/ICS (18.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Beim Messen der drei Ausgänge PDF/vCard/ICS (Auftrag,
   18.09.2026 abends) blieb „öffnet ein handelsüblicher Empfänger sie" für
   vCard/ICS eine Lücke: `file`(libmagic) erkennt die Dateiform, das sagt aber
   nichts darüber, ob die FELDER beim Empfänger ankommen — dieselbe Frage, die
   beim SHL-Fund desselben Abends den Unterschied machte. QuickLook (macOS,
   Contacts/Calendar-Engine) reagierte auf dieser Maschine nicht, und eine
   grafische App zu öffnen ist in einer Suite kein Prüfweg.

   WAS DIESES WERKZEUG TUT: liest eine erzeugte `.vcf`/`.ics`-Datei mit einer
   ECHTEN, FREMDEN Implementierung des jeweiligen Standards — nicht mit
   Vivodepot-eigenem Code, sonst prüfte der Erzeuger sich selbst:
     • vCard (RFC 6350) — `vcard-parser` (MIT, npm)
     • iCalendar (RFC 5545) — `ical.js` (MPL-2.0, Mozilla — dieselbe Bibliothek,
       die Thunderbird für seinen Kalender benutzt)
   Beide sind freie, offene, bereits als devDependencies eingetragene
   Bibliotheken (`package.json`) — kein Installationszirkus bei jedem Lauf,
   `npm ci` genügt, dieselbe Kette wie bei jeder anderen Testabhängigkeit hier.

   Geprüft wird die ANWESENHEIT der Pflichtfelder NACH DEM PARSEN durch die
   fremde Bibliothek — nicht nur, ob unser eigener Text die Zeichenkette
   enthält (das prüft eine strukturelle Probe der Formate bereits).
   Schlägt das Parsen selbst fehl (Wurf in der fremden Bibliothek), ist das
   der schärfste mögliche Fund: ein Standard-Werkzeug lehnt die Datei ab.

   Pflichtfelder je Format (RFC-Minimum, nicht Vivodepot-Konvention):
     vCard  — FN muss vorhanden UND nicht leer sein (RFC 6350 §6.2.1).
     ICS    — jedes VEVENT braucht UID, DTSTAMP, DTSTART (RFC 5545 §3.6.1).

   Aufruf:
     node tools/ausgaenge-fremdparser-pruefen.js --vcf <pfad>
     node tools/ausgaenge-fremdparser-pruefen.js --ics <pfad>
     node tools/ausgaenge-fremdparser-pruefen.js --vcf <pfad> --ics <pfad> [--check]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : null; };
const CHECK = argv.includes('--check');

function pruefeVcf(pfad) {
  const vCardParser = require('vcard-parser');
  const text = fs.readFileSync(pfad, 'utf8');
  let karten;
  try {
    // vcard-parser erwartet EINE Karte je Aufruf; mehrere BEGIN:VCARD-Blöcke (vcard-menschen)
    // werden hier einzeln zerlegt und einzeln geparst — jede Karte ist für sich RFC-gültig
    // oder nicht, eine kaputte Karte darf die übrigen nicht verdecken.
    karten = text.split(/(?=BEGIN:VCARD)/).map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    return { erfolg: false, grund: 'Aufteilung in einzelne Karten fehlgeschlagen: ' + e.message };
  }
  const befunde = [];
  for (let i = 0; i < karten.length; i++) {
    try {
      const geparst = vCardParser.parse(karten[i]);
      const fn = geparst.fn && geparst.fn[0] && String(geparst.fn[0].value || '').trim();
      befunde.push({ index: i, geparst: true, fn: fn || null, fnVorhanden: !!fn });
    } catch (e) {
      befunde.push({ index: i, geparst: false, fehler: e.message });
    }
  }
  const alleOk = befunde.every((b) => b.geparst && b.fnVorhanden);
  return { erfolg: alleOk, anzahlKarten: karten.length, befunde };
}

function pruefeIcs(pfad) {
  const ICAL = require('ical.js');
  const text = fs.readFileSync(pfad, 'utf8');
  let comp;
  try {
    const jcal = ICAL.parse(text);
    comp = new ICAL.Component(jcal);
  } catch (e) {
    return { erfolg: false, grund: 'ical.js lehnt die Datei ab: ' + e.message };
  }
  if (comp.name !== 'vcalendar') {
    return { erfolg: false, grund: 'oberste Komponente ist nicht VCALENDAR, sondern „' + comp.name + '"' };
  }
  const vevents = comp.getAllSubcomponents('vevent');
  const befunde = vevents.map((ve, i) => {
    const ev = new ICAL.Event(ve);
    const uid = ev.uid || null;
    const dtstamp = ve.getFirstPropertyValue('dtstamp');
    const dtstart = ev.startDate || null;
    return {
      index: i,
      uidVorhanden: !!uid,
      dtstampVorhanden: !!dtstamp,
      dtstartVorhanden: !!dtstart,
      summary: ev.summary || null,
    };
  });
  // Ein ICS ohne VEVENT (z. B. "keine datierten Prüftermine") ist kein Fehler des Formats —
  // das ist eine legitime, leere Kalenderdatei (Testament ohne Intervall).
  // Fehlerhaft ist NUR ein VORHANDENES VEVENT ohne Pflichtfeld.
  const alleOk = befunde.every((b) => b.uidVorhanden && b.dtstampVorhanden && b.dtstartVorhanden);
  return { erfolg: alleOk, anzahlVevents: vevents.length, befunde };
}

function main() {
  const vcfPfad = arg('vcf');
  const icsPfad = arg('ics');
  if (!vcfPfad && !icsPfad) {
    throw new Error('ausgaenge-fremdparser-pruefen: --vcf <pfad> und/oder --ics <pfad> angeben.');
  }
  let gesamtOk = true;
  if (vcfPfad) {
    if (!fs.existsSync(vcfPfad)) throw new Error('vCard-Datei nicht gefunden: ' + vcfPfad);
    const r = pruefeVcf(vcfPfad);
    console.log('[Fremdparser·vCard] ' + (r.erfolg ? 'GRÜN' : 'ROT') + ' — ' + path.basename(vcfPfad)
      + (r.anzahlKarten != null ? ' (' + r.anzahlKarten + ' Karte(n))' : ''));
    if (!r.erfolg) { console.log(JSON.stringify(r, null, 2)); gesamtOk = false; }
  }
  if (icsPfad) {
    if (!fs.existsSync(icsPfad)) throw new Error('ICS-Datei nicht gefunden: ' + icsPfad);
    const r = pruefeIcs(icsPfad);
    console.log('[Fremdparser·ICS] ' + (r.erfolg ? 'GRÜN' : 'ROT') + ' — ' + path.basename(icsPfad)
      + (r.anzahlVevents != null ? ' (' + r.anzahlVevents + ' VEVENT(s))' : ''));
    if (!r.erfolg) { console.log(JSON.stringify(r, null, 2)); gesamtOk = false; }
  }
  if (!gesamtOk && CHECK) process.exit(1);
  process.exit(0);
}

if (require.main === module) main();
module.exports = { pruefeVcf, pruefeIcs };
