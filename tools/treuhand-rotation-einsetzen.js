#!/usr/bin/env node
'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   Treuhand-Rotation einsetzen — der Handarbeits-Rest nach einer Schlüssel-
   Rotation, als ein geprüfter Schritt
   ────────────────────────────────────────────────────────────────────────────
   WOZU (12.09.2026, wörtlich die Produktentscheidung: „ich brauche
   keinen ablaufplan, ich will das hinter mir haben"). Anlass: eine Passphrase
   landete durch einen Werkzeugfehler im Klartext auf dem Bildschirm. Befund
   vorab (Bericht `signierschluessel-nachgeordnete-stufe-befund-2026-09-12.md`): der Treuhandschlüssel ist bereits die nachgeordnete Stufe unter
   dem Anker (`TRUST_AUTHORITY_PUBLIC_JWK`) — eine Rotation braucht KEINE neue
   Architektur, nur zwei neue, schon ausgestellte Bescheinigungen und drei
   Handgriffe im Kern. Dieses Werkzeug ersetzt genau diese drei Handgriffe.

   ── WAS DIESES WERKZEUG NICHT TUT ───────────────────────────────────────────
   ES ERZEUGT KEINEN SCHLÜSSEL. ES STELLT KEIN ZERTIFIKAT AUS. Beides bleibt
   bei (neues Schlüsselpaar über `vivodepot-vc-issuer.html`) und
   bei `tools/behoerden-zertifikat-ausstellen.js` (zwei Aufrufe, mit den
   Wurzel-Anteilen, einmal für `bmj`, einmal für `bzga`) — dieselbe Zeremonie
   wie bisher, nur mit dem neuen Schlüssel als Subjekt. Dieses Werkzeug nimmt
   die ZWEI AUSGABEDATEIEN dieser Ausstellungen entgegen und setzt sie ein.
   ES SIGNIERT DIE VIER TEMPLATE-JWS NICHT NEU — und das ist die dritte, bisher ungenannte Auslassung:
   NACH DER ROTATION MÜSSEN DIE VIER `templateJws` MIT `tools/basistemplate-neu-signieren.js` NEU SIGNIERT
   WERDEN, sonst werden die vier Vorlagen (Patientenverfügung, Vorsorgevollmacht, Betreuungsverfügung,
   Organspende) nicht mehr gerendert (U2-ADR-039: „Ein Anbieter-Template ohne gültige `templateJws` wird nicht
   mehr gerendert"). Der neue Treuhand-Public steht danach in den Certs; die alten `templateJws` prüfen gegen
   ihn nicht. Diese Werkzeugkette nennt die Rotation nirgends: tools/basistemplate-zeremonie-automat.js kettet das
   Neusignieren, kennt die Rotation aber nicht. Nach dem Neusignieren steht der Golden Master
   (tests/fixtures/golden-master-ausgabewege-baseline.json) mit den vier `templateJws` abgeleitet mit: er wird NEU ERZEUGT
   (tools/landung-vorbereiten.js), nicht gemerged. EIN WÄCHTER für diese Kette (pre-push: ändert ein Commit den Treuhand-Public
   in den Certs, ohne die vier `templateJws` mitzuändern, geht der Push nicht durch) ist NOCH NICHT GEBAUT — bis er im Kanon
   steht, schützt nur diese Sperre.

   STEHENDE SPERRE (21.09.2026, ausgesprochen): DIESES WERKZEUG WIRD NICHT GEFAHREN, BIS DIE KETTE ZU IST — also bis das
   Neusignieren der vier `templateJws` Teil desselben Zuges ist und diesen Satz ersetzt. Das hat heute niemand vor;
   genau darum kostet die Sperre nichts und rettet in vier Wochen jemanden.

   ── WAS ES EINSETZT, UND WARUM DIESE DREI ─────────────────────────────────
   1. `STANDARD_VORLAGEN_CERTS` im Kern (`vivodepot.html`) — die beiden neuen
      Bescheinigungen ersetzen die beiden alten, chirurgisch (nur die zwei
      `certJws`-Werte, kein Neubau des umgebenden Objekt-Literals).
   2. `WIDERRUFS_LISTE` im Kern — der Thumbprint des ALTEN Treuhandschlüssels
      wird angehängt. GELESEN aus der bisherigen, bereits eingebetteten
      Bescheinigung, NICHT als Argument entgegengenommen — ein getippter
      Thumbprint in einer Widerrufsliste ist der Fehler, der niemandem
      auffällt: er widerruft dann nichts, sieht aber aus wie ein Widerruf.
   3. `SCHALEN_STAND` — im Lockstep über die vier Träger (`vivodepot.html`,
      `sw.js`, `STANDARDS.md`, `docs/faktenbasis.md`, s. `tools/standzahl-
      frei-pruefen.js`), weil beide Änderungen oben den Kern inhaltlich
      ändern und ausgeliefert werden müssen, damit der Widerruf bei einer
      Bürgerin überhaupt wirkt (`WIDERRUFS_LISTE` ist statisch eingebettet,
      kein Live-Abruf — s. Bericht oben, Abschnitt 1c).

   ── DIE FÜNF PRÜFUNGEN, VOR JEDEM SCHREIBEN ─────────────────────────────────
   (a) Jedes der zwei NEUEN Zertifikate muss gegen den Anker verifizieren
       (`verifiziereProviderCredential` aus dem Kern selbst — keine zweite
       Prüf-Implementierung). Scheitert eine, wird NICHTS geschrieben.
   (b) Beide neuen Zertifikate müssen DENSELBEN Schlüssel als Subjekt nennen
       (ein Paar, ein neuer Treuhandschlüssel) — sonst Abbruch.
   (c) Jede Datei muss die erwartete `anbieterId` tragen (`behoerde/bmj` bzw.
       `behoerde/bzga`) — eine Gegenprobe gegen vertauschte Dateien.
   (d) Der aus dem Bestand GELESENE alte Thumbprint darf nicht mit dem neuen
       identisch sein — sonst wäre keine Rotation im Gang, nur ein
       versehentlicher Lauf mit dem alten Schlüssel.
   (e) Nach dem Schreiben: der frisch geschriebene Kern-Abschnitt wird erneut
       gelesen und die zwei neuen Zertifikate ein zweites Mal gegen den Anker
       verifiziert — dieselbe Selbstprüfung wie bei den Ausstellungs-
       Werkzeugen, nicht blind vertrauen, dass die Textersetzung getroffen hat.

   ── ATOMAR, WIE BEIM ZEREMONIE-AUTOMATEN ────────────────────────────────────
   Vor jedem Schreiben eine Sicherungskopie ALLER VIER Trägerdateien, AUSSER-
   HALB des Repos (`os.tmpdir()`, eigenes `mkdtempSync`-Verzeichnis je Lauf).
   Scheitert die Selbstprüfung (e) oder irgendein Schreibschritt, werden ALLE
   VIER Dateien aus der Sicherung wiederhergestellt, bevor das Werkzeug mit
   einem Fehler endet — entweder alle vier Träger ändern sich, oder keiner.

   KEIN COMMIT DURCH DIESES WERKZEUG — es endet mit `git add` der vier
   geänderten Dateien und einer vorgeschlagenen Commit-Nachricht; der
   eigentliche `git commit` bleibt eine eigene, bewusste Handlung.

   Aufruf:
     node tools/treuhand-rotation-einsetzen.js --bmj <bmj-zertifikat.json> \
       --bzga <bzga-zertifikat.json> [--trocken]
   `--trocken` führt alle fünf Prüfungen aus und zeigt, was sich ändern
   würde (alter/neuer Thumbprint, alte/neue Standzahl) — schreibt NICHTS.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('../tests/load-kern.js');
const { zertifikatJwsAusDatei } = require('./lib/zertifikat-datei.js');

const REPO = path.join(__dirname, '..');

// Dieselbe Umlenk-Konvention wie tests/load-kern.js/tools/basistemplate-zeremonie-automat.js —
// KERN_HTML_PATH existiert schon, kein Nachbau. Für die drei weiteren Träger je eine eigene,
// gleich benannte Umlenkung, damit Tests keinen der vier echten Repo-Pfade berühren müssen.
const HTML_PFAD_STANDARD = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH) : path.join(REPO, 'vivodepot.html');
const SW_PFAD_STANDARD = process.env.SW_JS_PATH
  ? path.resolve(process.env.SW_JS_PATH) : path.join(REPO, 'sw.js');
const STANDARDS_PFAD_STANDARD = process.env.STANDARDS_MD_PATH
  ? path.resolve(process.env.STANDARDS_MD_PATH) : path.join(REPO, 'STANDARDS.md');
const FAKTENBASIS_PFAD_STANDARD = process.env.FAKTENBASIS_MD_PATH
  ? path.resolve(process.env.FAKTENBASIS_MD_PATH) : path.join(REPO, 'docs', 'faktenbasis.md');

// U2-ADR-232: execFileSync('git', …) verliert nie die GIT_*-Umgebung eines äußeren Hook-Laufs —
// sonst griffe ein aus einem pre-commit/pre-push heraus gestarteter Aufruf auf dessen eigenes,
// internes Fixture-Repo statt auf das echte (GIT_DIR/GIT_INDEX_FILE-Leck). Kopiert das Muster aus
// tools/repo-adresse-pruefen.js — keine zweite Implementierung.
function _ohneGitUmgebung() {
  const env = Object.assign({}, process.env);
  for (const k of Object.keys(env)) { if (k.startsWith('GIT_')) delete env[k]; }
  return env;
}

// Liest die Nutzlast eines JWS Compact OHNE die Signatur zu prüfen — bewusst nur für den BEREITS
// im Kern eingebetteten, vertrauten alten Cert benutzt (dessen Thumbprint wir ohnehin nur LESEN,
// nicht neu vertrauen wollen). Für alles, was von AUSSEN hereinkommt (die zwei neuen Dateien),
// läuft ausschließlich die echte, signaturprüfende Kern-Funktion `verifiziereProviderCredential`.
function _jwsNutzlastRoh(jwsCompact) {
  const teile = String(jwsCompact).split('.');
  if (teile.length !== 3) throw new Error('kein gültiges JWS Compact (drei durch "." getrennte Teile erwartet)');
  const json = Buffer.from(teile[1], 'base64url').toString('utf8');
  return JSON.parse(json);
}

function _credentialSubject(nutzlast) {
  return (nutzlast && (nutzlast.credentialSubject || (nutzlast.vc && nutzlast.vc.credentialSubject))) || null;
}

// Ersetzt GENAU den Regex-Treffer in `text` durch `bauNeu(treffer)` — Ersetzung über Indizes,
// nicht über `.replace(string, …)` (das nur den ERSTEN Treffer träfe, aber implizit, ohne dass
// ein Aufrufer prüfen könnte, ob es wirklich derselbe war, den der Regex fand).
function _ankerErsetzen(text, regex, bauNeu) {
  const m = text.match(regex);
  if (!m) return null;
  const neu = bauNeu(m);
  return text.slice(0, m.index) + neu + text.slice(m.index + m[0].length);
}

async function rotationEinsetzen(opts) {
  const o = opts || {};
  const htmlPfad = o.htmlPfad || HTML_PFAD_STANDARD;
  const swPfad = o.swPfad || SW_PFAD_STANDARD;
  const standardsPfad = o.standardsPfad || STANDARDS_PFAD_STANDARD;
  const faktenbasisPfad = o.faktenbasisPfad || FAKTENBASIS_PFAD_STANDARD;
  const trocken = !!o.trocken;

  if (!o.bmjPfad || !o.bzgaPfad) {
    return { ok: false, grund: 'Aufruf: --bmj <zertifikat.json> --bzga <zertifikat.json> [--trocken]' };
  }

  let bmjDatei, bzgaDatei;
  try { bmjDatei = JSON.parse(fs.readFileSync(path.resolve(o.bmjPfad), 'utf8')); }
  catch (e) { return { ok: false, grund: 'Konnte die bmj-Zertifikatsdatei nicht lesen/parsen: ' + e.message }; }
  try { bzgaDatei = JSON.parse(fs.readFileSync(path.resolve(o.bzgaPfad), 'utf8')); }
  catch (e) { return { ok: false, grund: 'Konnte die bzga-Zertifikatsdatei nicht lesen/parsen: ' + e.message }; }
  // certJws, proof.jws oder providerCredentialJws — je nach Erzeuger (tools/lib/zertifikat-datei.js).
  let bmjJws, bzgaJws;
  try { bmjJws = zertifikatJwsAusDatei(bmjDatei).jws; } catch (e) { return { ok: false, grund: 'Die bmj-Datei: ' + e.message }; }
  try { bzgaJws = zertifikatJwsAusDatei(bzgaDatei).jws; } catch (e) { return { ok: false, grund: 'Die bzga-Datei: ' + e.message }; }

  const KERN = ladeKern().V;
  // Test-Injektion wie in tests/trust-basistemplate-signatur.test.js (opts.ankerJwk statt des
  // Produktiv-Ankers) — Produktivlauf lässt beides weg, dann greift TRUST_AUTHORITY_PUBLIC_JWK.
  const pruefOpts = {};
  if (o.ankerJwk) pruefOpts.ankerJwk = o.ankerJwk;
  if (o.widerrufsListe) pruefOpts.widerrufsListe = o.widerrufsListe;

  // (a) Vom Anker ausgestellt — dieselbe Kern-Funktion, keine zweite Prüfung.
  const bmjRes = await KERN.verifiziereProviderCredential(bmjJws, pruefOpts);
  if (!bmjRes.gueltig) return { ok: false, grund: 'Neues bmj-Zertifikat verifiziert NICHT gegen den Anker: ' + (bmjRes.grund || '') };
  const bzgaRes = await KERN.verifiziereProviderCredential(bzgaJws, pruefOpts);
  if (!bzgaRes.gueltig) return { ok: false, grund: 'Neues bzga-Zertifikat verifiziert NICHT gegen den Anker: ' + (bzgaRes.grund || '') };

  const bmjCs = _credentialSubject(bmjRes.nutzlast);
  const bzgaCs = _credentialSubject(bzgaRes.nutzlast);
  if (!bmjCs || !bmjCs.publicKeyJwk) return { ok: false, grund: 'Neues bmj-Zertifikat trägt keinen publicKeyJwk.' };
  if (!bzgaCs || !bzgaCs.publicKeyJwk) return { ok: false, grund: 'Neues bzga-Zertifikat trägt keinen publicKeyJwk.' };

  // (c) Gegenprobe gegen vertauschte Dateien.
  if (bmjCs.anbieterId !== 'behoerde/bmj') {
    return { ok: false, grund: 'Die als --bmj übergebene Datei nennt anbieterId "' + bmjCs.anbieterId + '", erwartet "behoerde/bmj" — vertauscht?' };
  }
  if (bzgaCs.anbieterId !== 'behoerde/bzga') {
    return { ok: false, grund: 'Die als --bzga übergebene Datei nennt anbieterId "' + bzgaCs.anbieterId + '", erwartet "behoerde/bzga" — vertauscht?' };
  }

  // (b) Beide neuen Zertifikate müssen denselben Schlüssel nennen.
  const neuerThumbBmj = await KERN._jwkThumbprint(bmjCs.publicKeyJwk);
  const neuerThumbBzga = await KERN._jwkThumbprint(bzgaCs.publicKeyJwk);
  if (neuerThumbBmj !== neuerThumbBzga) {
    return { ok: false, grund: 'Die beiden neuen Zertifikate nennen VERSCHIEDENE Schlüssel als Subjekt (' + neuerThumbBmj + ' vs ' + neuerThumbBzga + ') — kein einheitlicher neuer Treuhandschlüssel, nichts eingesetzt.' };
  }
  const neuerThumbprint = neuerThumbBmj;

  // Alten Bestand lesen.
  let htmlText;
  try { htmlText = fs.readFileSync(htmlPfad, 'utf8'); }
  catch (e) { return { ok: false, grund: 'Konnte den Kern nicht lesen (' + htmlPfad + '): ' + e.message }; }

  const certsRegex = /^const STANDARD_VORLAGEN_CERTS = Object\.freeze\((\{[\s\S]*?\})\);/m;
  const certsMatch = htmlText.match(certsRegex);
  if (!certsMatch) return { ok: false, grund: 'STANDARD_VORLAGEN_CERTS im Kern nicht gefunden — Form geändert? Nicht raten, nachsehen.' };
  let alteCerts;
  try { alteCerts = new Function('return (' + certsMatch[1] + ');')(); }
  catch (e) { return { ok: false, grund: 'STANDARD_VORLAGEN_CERTS im Kern nicht als Objekt lesbar: ' + e.message }; }
  if (typeof alteCerts.bmj !== 'string' || typeof alteCerts.bzga !== 'string') {
    return { ok: false, grund: 'STANDARD_VORLAGEN_CERTS trägt heute keinen bmj- oder bzga-Eintrag — nicht die erwartete Form.' };
  }

  // Alten Thumbprint LESEN, nicht eingeben — aus der bereits eingebetteten, vertrauten Bescheinigung.
  let alteNutzlastBmj, alteNutzlastBzga;
  try { alteNutzlastBmj = _jwsNutzlastRoh(alteCerts.bmj); alteNutzlastBzga = _jwsNutzlastRoh(alteCerts.bzga); }
  catch (e) { return { ok: false, grund: 'Alte Bescheinigung im Kern nicht lesbar: ' + e.message }; }
  const alteCsBmj = _credentialSubject(alteNutzlastBmj);
  const alteCsBzga = _credentialSubject(alteNutzlastBzga);
  if (!alteCsBmj || !alteCsBmj.publicKeyJwk || !alteCsBzga || !alteCsBzga.publicKeyJwk) {
    return { ok: false, grund: 'Alte Bescheinigung im Kern trägt keinen publicKeyJwk.' };
  }
  const alterThumbBmj = await KERN._jwkThumbprint(alteCsBmj.publicKeyJwk);
  const alterThumbBzga = await KERN._jwkThumbprint(alteCsBzga.publicKeyJwk);
  if (alterThumbBmj !== alterThumbBzga) {
    return { ok: false, grund: 'Die zwei heute eingebetteten Zertifikate (bmj/bzga) nennen bereits VERSCHIEDENE Schlüssel — Bestand uneindeutig, nichts automatisch widerrufen. Von Hand prüfen.' };
  }
  const alterThumbprint = alterThumbBmj;

  // (d) Keine Rotation ohne Unterschied.
  if (alterThumbprint === neuerThumbprint) {
    return { ok: false, grund: 'Neuer und alter Treuhandschlüssel sind IDENTISCH (' + neuerThumbprint + ') — keine Rotation, nichts eingesetzt.' };
  }

  // WIDERRUFS_LISTE lesen.
  const wlRegex = /^const WIDERRUFS_LISTE = Object\.freeze\((\[[\s\S]*?\])\);/m;
  const wlMatch = htmlText.match(wlRegex);
  if (!wlMatch) return { ok: false, grund: 'WIDERRUFS_LISTE im Kern nicht gefunden — Form geändert? Nicht raten, nachsehen.' };
  let alteListe;
  try { alteListe = new Function('return (' + wlMatch[1] + ');')(); }
  catch (e) { return { ok: false, grund: 'WIDERRUFS_LISTE im Kern nicht als Array lesbar: ' + e.message }; }
  const widerrufNeu = alteListe.indexOf(alterThumbprint) === -1;
  const neueListe = widerrufNeu ? alteListe.concat([alterThumbprint]) : alteListe.slice();

  // SCHALEN_STAND lesen, Lockstep-Zahl bestimmen.
  const standRegex = /const SCHALEN_STAND = '(v)(\d+)';/;
  const standMatch = htmlText.match(standRegex);
  if (!standMatch) return { ok: false, grund: 'SCHALEN_STAND im Kern nicht gefunden.' };
  const alteZahl = parseInt(standMatch[2], 10);
  const neueZahl = alteZahl + 1;
  const alteStandzahl = 'v' + alteZahl;
  const neueStandzahl = 'v' + neueZahl;

  const ergebnis = {
    ok: true,
    trocken,
    alterThumbprint, neuerThumbprint,
    alteStandzahl, neueStandzahl,
    widerrufNeu,
    bmjAnbieterName: bmjCs.anbieterName, bzgaAnbieterName: bzgaCs.anbieterName,
    bmjAblauf: bmjRes.nutzlast.expirationDate, bzgaAblauf: bzgaRes.nutzlast.expirationDate,
  };
  if (trocken) return ergebnis;

  // ── Ab hier: schreiben. Sicherung zuerst, AUSSERHALB des Repos ──────────────────────────────
  let swText, standardsText, faktenbasisText;
  try { swText = fs.readFileSync(swPfad, 'utf8'); }
  catch (e) { return { ok: false, grund: 'Konnte sw.js nicht lesen (' + swPfad + '): ' + e.message }; }
  try { standardsText = fs.readFileSync(standardsPfad, 'utf8'); }
  catch (e) { return { ok: false, grund: 'Konnte STANDARDS.md nicht lesen (' + standardsPfad + '): ' + e.message }; }
  try { faktenbasisText = fs.readFileSync(faktenbasisPfad, 'utf8'); }
  catch (e) { return { ok: false, grund: 'Konnte docs/faktenbasis.md nicht lesen (' + faktenbasisPfad + '): ' + e.message }; }

  const sicherungsVerzeichnis = fs.mkdtempSync(path.join(os.tmpdir(), 'vivodepot-treuhand-rotation-'));
  const sicherungen = {
    html: path.join(sicherungsVerzeichnis, 'vivodepot.html'),
    sw: path.join(sicherungsVerzeichnis, 'sw.js'),
    standards: path.join(sicherungsVerzeichnis, 'STANDARDS.md'),
    faktenbasis: path.join(sicherungsVerzeichnis, 'faktenbasis.md'),
  };
  fs.writeFileSync(sicherungen.html, htmlText, 'utf8');
  fs.writeFileSync(sicherungen.sw, swText, 'utf8');
  fs.writeFileSync(sicherungen.standards, standardsText, 'utf8');
  fs.writeFileSync(sicherungen.faktenbasis, faktenbasisText, 'utf8');

  function wiederherstellen() {
    fs.writeFileSync(htmlPfad, fs.readFileSync(sicherungen.html, 'utf8'), 'utf8');
    fs.writeFileSync(swPfad, fs.readFileSync(sicherungen.sw, 'utf8'), 'utf8');
    fs.writeFileSync(standardsPfad, fs.readFileSync(sicherungen.standards, 'utf8'), 'utf8');
    fs.writeFileSync(faktenbasisPfad, fs.readFileSync(sicherungen.faktenbasis, 'utf8'), 'utf8');
  }

  try {
    // 1. STANDARD_VORLAGEN_CERTS — chirurgisch, nur die zwei certJws-Werte im Block ersetzen.
    let neuHtml = _ankerErsetzen(htmlText, certsRegex, (m) => {
      let block = m[1];
      const bmjRe = /(\bbmj\s*:\s*')([^']*)(')/;
      const bzgaRe = /(\bbzga\s*:\s*')([^']*)(')/;
      if (!bmjRe.test(block) || !bzgaRe.test(block)) throw new Error('bmj/bzga im STANDARD_VORLAGEN_CERTS-Block nicht im erwarteten Muster gefunden.');
      block = block.replace(bmjRe, (mm, a, _alt, c) => a + bmjJws + c);
      block = block.replace(bzgaRe, (mm, a, _alt, c) => a + bzgaJws + c);
      return m[0].replace(m[1], block);
    });
    if (neuHtml == null) throw new Error('STANDARD_VORLAGEN_CERTS beim Schreiben nicht wiedergefunden.');

    // 2. WIDERRUFS_LISTE — alten Thumbprint anhängen (dedupliziert).
    const listeText = '[' + neueListe.map((t) => "'" + t + "'").join(', ') + ']';
    neuHtml = _ankerErsetzen(neuHtml, wlRegex, () => 'const WIDERRUFS_LISTE = Object.freeze(' + listeText + ');');
    if (neuHtml == null) throw new Error('WIDERRUFS_LISTE beim Schreiben nicht wiedergefunden.');

    // 3a. SCHALEN_STAND im Kern.
    neuHtml = _ankerErsetzen(neuHtml, standRegex, (m) => "const SCHALEN_STAND = '" + neueStandzahl + "';");
    if (neuHtml == null) throw new Error('SCHALEN_STAND beim Schreiben nicht wiedergefunden.');

    // 3b. sw.js CACHE.
    const swRegex = /(const CACHE = 'vivodepot-shell-v)(\d+)(';)/;
    const neuSw = _ankerErsetzen(swText, swRegex, (m) => m[1] + neueZahl + m[3]);
    if (neuSw == null) throw new Error('CACHE-Konstante in sw.js nicht gefunden.');

    // 3c. STANDARDS.md.
    const standardsRegex = /(`SCHALEN_STAND` v)(\d+)/;
    const neuStandards = _ankerErsetzen(standardsText, standardsRegex, (m) => m[1] + neueZahl);
    if (neuStandards == null) throw new Error('SCHALEN_STAND-Erwähnung in STANDARDS.md nicht gefunden.');

    // 3d. docs/faktenbasis.md.
    const faktenbasisRegex = /(SCHALEN_STAND: v)(\d+)/;
    const neuFaktenbasis = _ankerErsetzen(faktenbasisText, faktenbasisRegex, (m) => m[1] + neueZahl);
    if (neuFaktenbasis == null) throw new Error('SCHALEN_STAND-Erwähnung in docs/faktenbasis.md nicht gefunden.');

    // Schreiben — atomar je Datei (Temp + rename).
    for (const [zielPfad, inhalt] of [[htmlPfad, neuHtml], [swPfad, neuSw], [standardsPfad, neuStandards], [faktenbasisPfad, neuFaktenbasis]]) {
      const tmp = zielPfad + '.tmp-' + process.pid;
      fs.writeFileSync(tmp, inhalt, 'utf8');
      fs.renameSync(tmp, zielPfad);
    }

    // (e) Selbstprüfung: frisch geschriebenen Kern-Abschnitt erneut lesen und gegen den Anker
    // verifizieren — dieselbe Disziplin wie bei den Ausstellungs-Werkzeugen, nicht blind vertrauen,
    // dass die Textersetzung getroffen hat.
    const nachher = fs.readFileSync(htmlPfad, 'utf8');
    const nachherMatch = nachher.match(certsRegex);
    if (!nachherMatch) throw new Error('Selbstprüfung: STANDARD_VORLAGEN_CERTS nach dem Schreiben nicht mehr auffindbar.');
    let nachherCerts;
    try { nachherCerts = new Function('return (' + nachherMatch[1] + ');')(); }
    catch (e) { throw new Error('Selbstprüfung: STANDARD_VORLAGEN_CERTS nach dem Schreiben nicht als Objekt lesbar: ' + e.message); }
    if (nachherCerts.bmj !== bmjJws || nachherCerts.bzga !== bzgaJws) {
      throw new Error('Selbstprüfung: geschriebene Werte weichen von den eingesetzten Zertifikaten ab.');
    }
    const nachherBmjRes = await KERN.verifiziereProviderCredential(nachherCerts.bmj, pruefOpts);
    const nachherBzgaRes = await KERN.verifiziereProviderCredential(nachherCerts.bzga, pruefOpts);
    if (!nachherBmjRes.gueltig || !nachherBzgaRes.gueltig) {
      throw new Error('Selbstprüfung: die geschriebenen Zertifikate verifizieren nach dem Schreiben NICHT mehr gegen den Anker.');
    }
  } catch (e) {
    wiederherstellen();
    return { ok: false, grund: 'Fehlschlag beim Einsetzen — alle vier Träger auf den Stand vor diesem Lauf zurückgesetzt: ' + e.message };
  }

  ergebnis.sicherungsVerzeichnis = sicherungsVerzeichnis;

  const istEchterRepoPfad = htmlPfad === HTML_PFAD_STANDARD && !process.env.KERN_HTML_PATH;
  if (istEchterRepoPfad) {
    try {
      execFileSync('git', ['add', 'vivodepot.html', 'sw.js', 'STANDARDS.md', 'docs/faktenbasis.md'], { cwd: REPO, env: _ohneGitUmgebung(), stdio: 'inherit' });
      ergebnis.gitAddAusgefuehrt = true;
    } catch (e) {
      ergebnis.gitAddAusgefuehrt = false;
      ergebnis.gitAddFehler = e.message;
    }
  } else {
    ergebnis.gitAddAusgefuehrt = false;
  }

  return ergebnis;
}

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    const opts = { trocken: argv.includes('--trocken') };
    const bmjIdx = argv.indexOf('--bmj');
    const bzgaIdx = argv.indexOf('--bzga');
    if (bmjIdx !== -1) opts.bmjPfad = argv[bmjIdx + 1];
    if (bzgaIdx !== -1) opts.bzgaPfad = argv[bzgaIdx + 1];

    const r = await rotationEinsetzen(opts);
    if (!r.ok) {
      console.error('[treuhand-rotation-einsetzen] ' + r.grund);
      process.exitCode = 1;
      return;
    }
    console.log('[treuhand-rotation-einsetzen] ' + (r.trocken ? 'TROCKENLAUF — nichts geschrieben.' : 'Eingesetzt.'));
    console.log('  Alter Treuhand-Thumbprint: ' + r.alterThumbprint + (r.widerrufNeu ? '  → wird in WIDERRUFS_LISTE aufgenommen' : '  → stand bereits in WIDERRUFS_LISTE'));
    console.log('  Neuer Treuhand-Thumbprint: ' + r.neuerThumbprint);
    console.log('  bmj:  ' + r.bmjAnbieterName + '  Ablauf ' + r.bmjAblauf);
    console.log('  bzga: ' + r.bzgaAnbieterName + '  Ablauf ' + r.bzgaAblauf);
    console.log('  SCHALEN_STAND: ' + r.alteStandzahl + ' → ' + r.neueStandzahl);
    if (!r.trocken) {
      console.log('  Sicherung (vor dem Lauf): ' + r.sicherungsVerzeichnis);
      if (r.gitAddAusgefuehrt) {
        console.log('  git add ausgeführt (vivodepot.html, sw.js, STANDARDS.md, docs/faktenbasis.md). KEIN Commit — das bleibt ein eigener, bewusster Schritt.');
        console.log('  Vorschlag für die Commit-Nachricht:');
        console.log('    fix(trust): Treuhandschlüssel rotiert, alten Schlüssel widerrufen, ' + r.neueStandzahl);
      } else if (r.gitAddFehler) {
        console.log('  git add fehlgeschlagen: ' + r.gitAddFehler + ' — von Hand nachholen.');
      } else {
        console.log('  Umgelenkte Träger (KERN_HTML_PATH o.ä. gesetzt) — kein git add, kein Bezug zu einem Repo-Arbeitsbaum.');
      }
    }
  })().catch((e) => {
    console.error('[treuhand-rotation-einsetzen] Unerwarteter Fehler: ' + e.message);
    process.exitCode = 1;
  });
}

module.exports = { rotationEinsetzen };
