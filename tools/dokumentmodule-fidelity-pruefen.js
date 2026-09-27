#!/usr/bin/env node
'use strict';
/* dokumentmodule-fidelity-pruefen.js — prueft, ob die acht extrahierten Dokumentmodul-/
   Standardvorlagen-Dateien (tools/dokument-module/) denselben lebenden Kontrakt erzeugen wie
   der heutige Bundle-Weg (BUERGERMODUL_BUENDEL.dokumentModule/.standardVorlagen ->
   _dokumentModulAusBuendelErzeugen()/_standardVorlageAusBuendelErzeugen()), U2-ADR-345.

   Vergleicht bei Dokumentmodulen NUR abschnitte (reine Daten) + motor — die sechzehn echten
   Motor-Funktionen (datenLesen/optLabel/...) sind Closures aus dem Kern selbst, zwei getrennte
   Funktionsobjekte koennen nie isDeepStrictEqual sein; geprueft wird stattdessen, dass jeder
   Funktions-Slot ueberhaupt gefuellt ist (kein undefined). STANDARD_VORLAGEN traegt keinen
   Motor-Kontrakt (reine Daten, s. _standardVorlageAusBuendelErzeugen-Kommentar im Kern) — dort
   voller isDeepStrictEqual.

   Aufruf: node tools/dokumentmodule-fidelity-pruefen.js [--ordner <pfad>] [--kern <pfad>] */
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');

const REPO = path.join(__dirname, '..');
function _argWert(name) { const i = process.argv.indexOf(name); return (i >= 0 && process.argv[i + 1]) ? process.argv[i + 1] : null; }

const DOKMOD_MAP = Object.freeze({
  patientenverfuegung: 'PV_MODUL',
  'ki-verfuegung': 'KI_MODUL',
  vorsorgevollmacht: 'VOLLMACHT_MODUL',
  betreuungsverfuegung: 'BETREUUNG_MODUL',
});
const STANDARDVORLAGEN_IDS = Object.freeze(['patientenverfuegung', 'betreuungsverfuegung', 'vorsorgevollmacht', 'organspende']);
const FUNKTIONS_SLOTS = Object.freeze(['datenLesen', 'optLabel', 'istSentinel', 'refmNamen', 'rolleLabel', 'eingangsformel']);

function pruefen({ ordner, kernPfad }) {
  const vorherigerPfad = process.env.KERN_HTML_PATH;
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  if (kernPfad) { if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorherigerPfad; }

  const ergebnisse = [];

  for (const [id, feldname] of Object.entries(DOKMOD_MAP)) {
    const dateiPfad = path.join(ordner, 'vivodepot-dokumentmodul-' + id + '.json');
    const datei = JSON.parse(fs.readFileSync(dateiPfad, 'utf8'));
    const roh = datei.dokumentModule[id];
    const nachbau = V._dokumentModulAusBuendelErzeugen(id, roh);
    const original = V[feldname];
    const abschnitteGleich = isDeepStrictEqual(nachbau.abschnitte, original.abschnitte);
    const motorGleich = nachbau.motor === original.motor;
    const funktionenVorhanden = FUNKTIONS_SLOTS.every((k) => typeof nachbau[k] === 'function');
    ergebnisse.push({ art: 'dokumentModul', id, gleich: abschnitteGleich && motorGleich && funktionenVorhanden, abschnitteGleich, motorGleich, funktionenVorhanden });
  }

  for (const id of STANDARDVORLAGEN_IDS) {
    const dateiPfad = path.join(ordner, 'vivodepot-standardvorlage-' + id + '.json');
    const datei = JSON.parse(fs.readFileSync(dateiPfad, 'utf8'));
    const roh = datei.standardVorlagen[id];
    const nachbau = V._standardVorlageAusBuendelErzeugen(id, roh);
    const original = V.STANDARD_VORLAGEN.find((v) => v.id === id);
    const gleich = isDeepStrictEqual(nachbau, original);
    ergebnisse.push({ art: 'standardVorlage', id, gleich });
  }

  return ergebnisse;
}

function main() {
  const ordner = _argWert('--ordner') || path.join(REPO, 'tools', 'dokument-module');
  const kernPfad = _argWert('--kern') ? path.resolve(_argWert('--kern')) : null;
  const ergebnisse = pruefen({ ordner, kernPfad });
  let alleGleich = true;
  for (const e of ergebnisse) {
    console.log((e.gleich ? 'OK  ' : 'ROT ') + e.art + ' "' + e.id + '"' + (e.gleich ? '' : ' — ' + JSON.stringify(e)));
    if (!e.gleich) alleGleich = false;
  }
  process.exitCode = alleGleich ? 0 : 1;
}
if (require.main === module) main();
module.exports = { pruefen, DOKMOD_MAP, STANDARDVORLAGEN_IDS };
