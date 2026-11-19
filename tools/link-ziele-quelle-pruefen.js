#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   link-ziele-quelle-pruefen.js — jedes Link- und QR-Ziel auf einem eigenen Host hat eine Quelle im Repo
   (Befund QR-ABHOLSEITE-ANFRAGE-FEHLT, 16.11.2026)
   ─────────────────────────────────────────────────────────────────
   Das Studio zeigte Stellen eine Abholseite an, die live nicht antwortete und im Repo keine Quelle hatte. Die Klasse: eine
   Adresse in der Anwendung, hinter der keine versionierte Seite steht. Die Regel:

     Eine Adresse unter share.vivodepot.de oder pod.vivodepot.de verweist auf eine Datei unter share/ bzw. pod/ im Repo
     (Pfad `/` heißt index.html), oder sie steht in der Positivliste. Jede andere Adresse unter vivodepot.de oder vivodepot.org steht in der Positivliste
     tools/link-ziele-quelle-grundlinie.json — mit Grund, warum ihre Quelle nicht in diesem Repo liegt. Die Liste darf nur
     sinken (tests/link-ziele-quelle-pruefen.test.js). Kennungen in Adressform (Schema-`$id`, Nachweis-Kontext) sind keine Ziele.

   Aufruf:  node tools/link-ziele-quelle-pruefen.js [--datei <pfad>]…   (ohne --datei: vivodepot.html, vivodepot-studio.html)
   Exit 0 ohne Fund, 1 mit Fund.
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE_PFAD = path.join(__dirname, 'link-ziele-quelle-grundlinie.json');
const STANDARD_DATEIEN = Object.freeze(['vivodepot.html', 'vivodepot-studio.html']);

// Hosts, deren Seiten dieses Repo als Quelle trägt: Host → Verzeichnis.
const HOSTS_MIT_QUELLE = Object.freeze({ 'share.vivodepot.de': 'share', 'pod.vivodepot.de': 'pod' });
// Kennungen in Adressform, nie aufgerufen (wie in tools/marken-adressen-pruefen.js).
const KENNUNGEN = Object.freeze(['vivodepot.de/schemas/', 'vivodepot.de/credentials/']);

const ADRESSE = /https?:\/\/((?:[a-z0-9-]+\.)*vivodepot\.(?:de|org))(\/[^\s"'`<>)\\?#]*)?[^\s"'`<>)\\]*/gi;

function grundlinieLesen(pfad = GRUNDLINIE_PFAD) { return JSON.parse(fs.readFileSync(pfad, 'utf8')); }

// Alle Ziele eines Textes als normalisierte Form `host/pfad` (ohne Schema, Abfrage, Gatter), in Reihenfolge, ohne Dopplung.
function ziele(text) {
  const aus = [];
  for (const m of String(text).matchAll(ADRESSE)) {
    const z = m[1].toLowerCase() + (m[2] || '/');
    if (KENNUNGEN.some((k) => z.startsWith(k))) continue;
    if (!aus.includes(z)) aus.push(z);
  }
  return aus;
}

function quelleVon(ziel, repo = REPO) {
  const i = ziel.indexOf('/');
  const host = ziel.slice(0, i);
  const verz = HOSTS_MIT_QUELLE[host];
  if (!verz) return null;
  const rest = ziel.slice(i + 1);
  const datei = path.posix.join(verz, rest === '' || rest.endsWith('/') ? rest + 'index.html' : rest);
  return fs.existsSync(path.join(repo, datei)) ? datei : null;
}

// Befunde zu einem Text: [{ ziel, grund }]. `positivliste`: Array von { adresse, grund }.
function pruefeText(text, positivliste, repo = REPO) {
  const befunde = [];
  const erlaubt = new Set((positivliste || []).map((e) => e.adresse));
  for (const z of ziele(text)) {
    const host = z.slice(0, z.indexOf('/'));
    if (erlaubt.has(z)) continue;
    if (HOSTS_MIT_QUELLE[host]) {
      if (!quelleVon(z, repo)) befunde.push({ ziel: z, grund: 'keine Datei unter ' + HOSTS_MIT_QUELLE[host] + '/ im Repo' });
    } else {
      befunde.push({ ziel: z, grund: 'weder Quelle im Repo noch in der Positivliste' });
    }
  }
  return befunde;
}

// Positivliste-Einträge, die in keiner der Dateien mehr vorkommen (Grundlinie nachziehen: sie darf nur sinken).
function veralteteEintraege(texte, positivliste) {
  const alle = new Set();
  for (const t of texte) for (const z of ziele(t)) alle.add(z);
  return (positivliste || []).filter((e) => !alle.has(e.adresse)).map((e) => e.adresse);
}

function pruefen(dateien = STANDARD_DATEIEN, opt = {}) {
  const repo = opt.repo || REPO;
  const gl = opt.grundlinie || grundlinieLesen();
  const befunde = [];
  for (const d of dateien) {
    const p = path.isAbsolute(d) ? d : path.join(repo, d);
    for (const b of pruefeText(fs.readFileSync(p, 'utf8'), gl.ohneQuelle, repo)) befunde.push(Object.assign({ datei: d }, b));
  }
  return befunde;
}

if (require.main === module) {
  const arg = process.argv.slice(2);
  const dateien = [];
  for (let i = 0; i < arg.length; i++) if (arg[i] === '--datei' && arg[i + 1]) dateien.push(arg[++i]);
  const b = pruefen(dateien.length ? dateien : STANDARD_DATEIEN);
  for (const f of b) console.error(f.datei + ': ' + f.ziel + ' — ' + f.grund);
  if (b.length) { console.error(b.length + ' Ziel(e) ohne Quelle'); process.exit(1); }
  console.log('OK: jedes Link-Ziel auf eigenem Host hat eine Quelle oder steht in der Positivliste');
}

module.exports = { ziele, quelleVon, pruefeText, pruefen, veralteteEintraege, grundlinieLesen, GRUNDLINIE_PFAD, STANDARD_DATEIEN, HOSTS_MIT_QUELLE };
