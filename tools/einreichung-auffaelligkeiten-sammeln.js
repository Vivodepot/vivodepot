#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   einreichung-auffaelligkeiten-sammeln.js — der Sammel-Schritt
   ────────────────────────────────────────────────────────────────────────
   „Modulprüfung schließen" (23.08.2026), Posten 3.

   DER BEFUND, DEN DIESER POSTEN SCHLIESST: jedes der fünf Einlass-Register
   (bereich/format/textsatz/institutionsArt/rechtsraum) meldet strukturiert
   und mit Grund — aber in fünf VERSCHIEDENEN Formen (`{schluessel,grund}`,
   `{kennung,grund}`, `{id,grund}`, `{pfad,grund}`, `{feld,grund}` …). Und der
   Erzeuger für Feld-Vorlagen (`pruefeKonformitaet`) meldet in einer sechsten,
   ganz eigenen Form (fertige Sätze, keine Struktur). „Menschliche Prüfung nur
   bei Auffälligkeit" galt damit bisher auf REGISTER-Ebene, nicht auf
   VORGANGS-Ebene — wer alle Register im Blick behalten will, musste fünf
   verschiedene Formen gleichzeitig lesen.

   KEIN NEUER PRÜFMECHANISMUS. Diese Datei erkennt nichts, was die fünf
   Register und der Erzeuger nicht schon selbst erkennen — sie liest deren
   vorhandene Ausgabe und bringt sie in EINE Form: `{grund, fundstelle,
   schwere, quelle}`. `schwere` ist rein strukturell abgelesen, nicht neu
   beurteilt: `abgewiesen`, wenn die Einreichung als Ganzes daran scheitert
   (`raus.grund`/ein Blocker), `gemeldet`, wenn nur ein Teil (ein Feld, ein
   Fremdschlüssel) verworfen wurde, während der Rest durchging.

   Diese Datei MISST und ändert keine Zeile Produktcode.

   Aufruf:
     node tools/einreichung-auffaelligkeiten-sammeln.js                  (Fixtures im Repo)
     node tools/einreichung-auffaelligkeiten-sammeln.js --datei <pfad>   (ein Einlass-Register-Modul)
     node tools/einreichung-auffaelligkeiten-sammeln.js --vorlage-state <pfad>   (Erzeuger-Zustand)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Ein Eintrag aus `verworfene[]` trägt seinen Ortsbezug unter fünf verschiedenen Namen,
   je nach Register — nie mehr als einen gleichzeitig. Das genau ist die Uneinheitlichkeit,
   die dieser Posten auflöst. */
function fundstelleAus(v) {
  return v.schluessel || v.kennung || v.id || v.pfad || v.ziel || v.feld || null;
}

function ausModulEinlassen(raus) {
  const zeilen = [];
  for (const v of (raus && raus.verworfene) || []) {
    zeilen.push({ grund: v.grund, fundstelle: fundstelleAus(v), schwere: 'gemeldet', quelle: 'einlass' });
  }
  if (raus && raus.angenommen === false && raus.grund) {
    zeilen.push({ grund: raus.grund, fundstelle: raus.kennung || null, schwere: 'abgewiesen', quelle: 'einlass' });
  }
  return zeilen;
}

function ausKonformitaet(pruefungErgebnis) {
  const zeilen = [];
  for (const b of (pruefungErgebnis && pruefungErgebnis.blocker) || []) {
    zeilen.push({ grund: b, fundstelle: null, schwere: 'abgewiesen', quelle: 'vorlage' });
  }
  for (const w of (pruefungErgebnis && pruefungErgebnis.warnungen) || []) {
    zeilen.push({ grund: w, fundstelle: null, schwere: 'gemeldet', quelle: 'vorlage' });
  }
  return zeilen;
}

/* Ein Einlass-Register-Modul erkennt man an `modulTyp`, eine Erzeuger-Vorlage an `felder`
   (Array) — dieselbe Unterscheidung, die `modulEinlassen` selbst über `Array.isArray`/
   `typeof` trifft. Kein Rätselraten: fehlt beides, wird nichts vorgetäuscht. */
async function sammeln(roh) {
  if (roh && typeof roh.modulTyp === 'string') {
    const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
    const { V } = ladeKern();
    await V.depotAnlegen('einreichung-auffaelligkeiten-scratch');
    V.akteurSelbstErklaeren('Sammel-Schritt');
    const d = V.getData();
    const raus = V.modulEinlassen(JSON.stringify(roh), d);
    return ausModulEinlassen(raus);
  }
  if (roh && Array.isArray(roh.felder)) {
    const { ladeGenerator } = require(path.join(REPO, 'tests', 'load-generator.js'));
    const { V } = ladeGenerator();
    return ausKonformitaet(V.pruefeKonformitaet(roh));
  }
  throw new Error('Weder ein Einlass-Register-Modul (modulTyp fehlt) noch eine Erzeuger-Vorlage (felder fehlt).');
}

/* Fixture, damit die Suite dieses Werkzeug auch ohne Argument prüft: ein Bereichs-Modul mit
   einem Fremdschlüssel (meldet) und ein Vorlagen-Zustand mit zwei Erzeuger-Warnungen. */
function fixturen() {
  return [
    { label: 'Einlass-Register (bereich, ein Fremdschlüssel)', roh: {
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fixture', sprache: 'de',
      bereiche: { 'eigene-rubrik': { label: 'Eigene Rubrik' } }, boeserSchluessel: 'x',
    } },
    { label: 'Erzeuger-Vorlage (keine Pflichtfelder, > 50 Felder)', roh: {
      felder: Array.from({ length: 51 }, (_, i) => ({
        feldname: 'feld_' + i, feldtyp: 'text', pflicht: false, bereich: 'identity',
      })),
      anbieter: {
        anbieterName: 'Fixture-Kammer', rechtsform: 'e.V.',
        adresse: { strasse: 'Musterstraße 1', plz: '12345', ort: 'Musterstadt', land: 'Deutschland' },
        kontakt: { name: 'M. Muster', funktion: 'Geschäftsführung', email: 'kontakt@fixture.example.de', telefon: '0123456789' },
        bereich: 'identity', useCase: 'x'.repeat(60),
      },
      publicKeyJwk: { kty: 'OKP' },
    } },
  ];
}

async function main() {
  const argDatei = process.argv.indexOf('--datei');
  const argState = process.argv.indexOf('--vorlage-state');
  let laeufe;
  if (argDatei !== -1 && process.argv[argDatei + 1]) {
    laeufe = [{ label: process.argv[argDatei + 1], roh: JSON.parse(fs.readFileSync(process.argv[argDatei + 1], 'utf8')) }];
  } else if (argState !== -1 && process.argv[argState + 1]) {
    laeufe = [{ label: process.argv[argState + 1], roh: JSON.parse(fs.readFileSync(process.argv[argState + 1], 'utf8')) }];
  } else {
    laeufe = fixturen();
  }
  for (const lauf of laeufe) {
    console.log('══ ' + lauf.label);
    const zeilen = await sammeln(lauf.roh);
    if (!zeilen.length) { console.log('   keine Auffälligkeit.'); continue; }
    for (const z of zeilen) {
      console.log('   [' + z.schwere.padEnd(10) + '] ' + z.quelle.padEnd(7) + ' grund=' + z.grund
        + (z.fundstelle ? '  fundstelle=' + z.fundstelle : ''));
    }
  }
}

if (require.main === module) main();
module.exports = { sammeln, ausModulEinlassen, ausKonformitaet, fundstelleAus, fixturen };
