#!/usr/bin/env node
'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   Basistemplate-Neusignatur — der lebende Pfad bei Treuhandschlüssel-Rotation
   ────────────────────────────────────────────────────────────────────────────
   WOZU (22.08.2026, Auftrag `…_Werkzeug_Basistemplate_Neusignatur_2026-08-22.md`,
   dringend, hängt an der laufenden Schlüsselzeremonie). Abschnitt 4 der Zeremonie
   („vier Template-Signaturen neu") war am Tisch nicht ausführbar: die interne UI
   dafür (`?intern=basistemplate`) ist am 10.08.2026 mit K9 Zug 3 entfallen, und
   `basistemplateTreuhandSignieren(inhalte, privateKeyJwk)` — der laut Vermerk im
   Kopf von `vivodepot-studio.html` verbliebene lebende Pfad — hatte
   keinen Aufrufer mehr. Eine Funktion ohne Aufrufer ist kein Pfad. Dieses
   Werkzeug ist der Aufrufer, damit die Alternative (Browser-Konsole mit dem
   privaten Treuhandschlüssel im Klartext) nicht nötig wird.

   Signiert NICHT selbst — ruft ausschließlich `basistemplateTreuhandSignieren`
   im geladenen Generator auf (`tests/load-generator.js`, wie die Tests). Kein
   Nachbau der Signaturlogik, keine zweite Wahrheit.

   ── DER PRIVATE SCHLÜSSEL ─────────────────────────────────────────────────
   Kommt AUSSCHLIESSLICH aus der als erstes Argument genannten JWK-Datei.
   NIEMALS aus einem Repo-Pfad, NIEMALS aus einer Umgebungsvariable — beides
   ist hier bewusst nicht verdrahtet, nicht nur ungenutzt. Der Dateipfad selbst
   erscheint in KEINER Ausgabe dieses Werkzeugs (auch nicht in Fehlermeldungen)
   — nur der Aufrufer kennt ihn, er kam als sein eigenes Argument.

   Die Variable, die den privaten Schlüssel hält, wird auf null gesetzt, sobald
   sie nicht mehr gebraucht wird (nach dem Signieren) — kein Verlass auf die
   Garbage Collection, ein expliziter Schritt.

   ── DER WÄCHTER (Auftragspunkt 6) ─────────────────────────────────────────
   Vor dem Signieren: kanonischer Inhalt der vier Einträge in
   `docs/template-generator/basistemplate-inhalte.json` MUSS mit den
   `STANDARD_VORLAGEN` der Bürger-App übereinstimmen (`V._basisInhaltMatcht`,
   derselbe Vergleich wie in `tests/trust-basistemplate-signatur.test.js`,
   1b-Wächter). Schlägt er an, wird NICHT signiert und NICHTS geschrieben —
   lieber vor dem Signieren abbrechen als einen falschen Inhalt signieren.

   Nach dem Signieren prüft `basistemplateTreuhandSignieren` selbst jede
   Signatur gegen den aus dem Private abgeleiteten Public (wirft bei
   Abweichung) — dieses Werkzeug meldet nur das Ergebnis, baut die Prüfung
   nicht nach.

   ── KEINE HALBE AUSGABEDATEI ──────────────────────────────────────────────
   Geschrieben wird in eine Temp-Datei neben dem Zielpfad, dann per `rename`
   (atomar auf demselben Dateisystem) an den Zielpfad verschoben. Bricht das
   Werkzeug vorher ab (Wächter, Signierfehler), existiert am Zielpfad nichts
   Neues.

   ── KEINE NETZVERBINDUNG ──────────────────────────────────────────────────
   Dieses Werkzeug ruft keinen Netzwerk-Code auf — Signieren und Prüfen laufen
   vollständig über WebCrypto im eigenen Prozess (wie der Kern selbst, G11).

   Aufruf:
     node tools/basistemplate-neu-signieren.js <schluesseldatei> <ausgabedatei.json>
   Die Passphrase wird danach interaktiv abgefragt (stdin) — nie als Kommandozeilenargument
   (23.08.2026, Zug 3: Shell-History und Prozessliste sind kein Ort für eine Passphrase im
   Tagesgeschäft). `lauf()` selbst nimmt sie weiterhin als drittes Argument entgegen — das bleibt
   der Weg für Tests, die kein Terminal simulieren.

   <schluesseldatei> ist entweder eine rohe JWK mit Feld `d`, oder eine vom
   Zertifikator geschützte `.vdkey`-Datei (`vivodepotProtectedKey: 1`) — dann
   ist [passphrase] Pflicht. Erkennung über `istGeschuetzteSchluesseldatei`,
   Entsperren über `entschluesseleSchluesselJwk` — beide aus dem Zertifikator
   selbst (`tests/load-issuer.js`), kein Nachbau (23.08.2026, Auftrag
   `…_Zeremonie_Kette_schliessen_2026-08-23.md`, Zug 1: die rohe Datei entsteht
   dadurch nie — der bessere Weg gegenüber einem eigenen Entsperr-Werkzeug).
   Die Passphrase erscheint in keiner Ausgabe und keiner Fehlermeldung und wird
   nach dem Entsperren ebenso genullt wie der private Schlüssel selbst.

   Ausgabedatei: JSON-Array `[{ id, behoerde, templateJws }, …]` — kein `d`,
   kein Schlüsselmaterial, nur die vier signierten Templates.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');
const { ladeGenerator } = require('../tests/load-generator.js');
const { ladeIssuer } = require('../tests/load-issuer.js');
const { mehrerePassphrasenVonStdinLesen } = require('./modul-erzeugen.js');

/* Interaktiv statt Kommandozeilenargument (23.08.2026, "Zertifikatsbetrieb ohne
   Terminal", Posten 3): eine Passphrase als process.argv steht in der Shell-History und der
   Prozessliste. Nur beim echten CLI-Aufruf gefragt — Tests übergeben die Passphrase weiterhin
   direkt an lauf(). A577 (12.09.2026, echter Vorfall am scharfen Lauf der Zeremonie, die dieses
   Werkzeug aufruft): `readline` mit `terminal: false` unterlässt nur die eigene Zeilenbearbeitung
   — das TTY-Echo läuft unabhängig weiter, die Passphrase stand im Klartext auf dem Schirm. Kein
   Nachbau: `mehrerePassphrasenVonStdinLesen` aus tools/modul-erzeugen.js behebt genau das. */
function passphraseVonStdinLesen() {
  return mehrerePassphrasenVonStdinLesen(['Passphrase (leer, wenn die Schlüsseldatei roh ist): ']).then(([a]) => a);
}

function abbrechen(meldung) {
  console.error('[basistemplate-neu-signieren] ' + meldung);
  process.exitCode = 1;
}

async function lauf(keyDateiArg, ausgabeDateiArg, passphraseArg) {
  if (!keyDateiArg || !ausgabeDateiArg) {
    abbrechen('Aufruf: node tools/basistemplate-neu-signieren.js <schluesseldatei> <ausgabedatei.json> [passphrase]');
    return false;
  }

  let geparst;
  try {
    // Der aufgelöste Pfad lebt nur in dieser Funktion und wird nirgends ausgegeben.
    const roh = fs.readFileSync(path.resolve(keyDateiArg), 'utf8');
    geparst = JSON.parse(roh);
  } catch (e) {
    abbrechen('Konnte die Schlüsseldatei nicht lesen oder als JSON parsen.');
    return false;
  }

  const ISSUER = ladeIssuer().V;
  let privateKeyJwk;
  if (ISSUER.istGeschuetzteSchluesseldatei(geparst)) {
    if (!passphraseArg) {
      abbrechen('Die Schlüsseldatei ist geschützt (.vdkey) — Passphrase als drittes Argument nötig.');
      return false;
    }
    try {
      privateKeyJwk = await ISSUER.entschluesseleSchluesselJwk(geparst, passphraseArg);
    } catch (e) {
      abbrechen('Entsperren fehlgeschlagen: ' + e.message);
      return false;
    } finally {
      passphraseArg = null; // ab hier nicht mehr gebraucht — kein Verlass auf die Garbage Collection
    }
  } else if (geparst && typeof geparst === 'object' && geparst.d) {
    privateKeyJwk = geparst;
  } else {
    abbrechen('Die Datei enthält weder eine geschützte .vdkey noch eine rohe JWK mit Feld "d".');
    return false;
  }
  geparst = null;

  // BASISTEMPLATE_INHALTE_PATH: dieselbe Umlenk-Konvention wie KERN_HTML_PATH (tests/load-kern.js)
  // — kein Nachbau, s. den Automaten der Basistemplate-Zeremonie (Nachtrag, 07.09.2026,
  // echter Vorfall: ohne diese Umlenkung liest dieses Werkzeug IMMER die echten Produktionsdaten,
  // unabhängig davon, wo der Aufrufer selbst umgelenkt hat).
  const inhalteDateiPfad = process.env.BASISTEMPLATE_INHALTE_PATH
    ? path.resolve(process.env.BASISTEMPLATE_INHALTE_PATH)
    : path.join(__dirname, '..', 'docs', 'template-generator', 'basistemplate-inhalte.json');
  const inhalte = JSON.parse(fs.readFileSync(inhalteDateiPfad, 'utf8'));

  // Gerüst-Schnitt S4: das Gerüst trägt keine Standardvorlagen; geladen wird das gebackene Produkt (bei umgelenkten Pfaden die Kopie).
  const { V } = ladeKern({ backen: true,
    standardVorlagenVerzeichnis: process.env.STANDARDVORLAGEN_PATH ? require('path').resolve(process.env.STANDARDVORLAGEN_PATH) : undefined });
  if (inhalte.length !== V.STANDARD_VORLAGEN.length) {
    privateKeyJwk = null;
    abbrechen('Wächter: Zahl der Inhalte (' + inhalte.length + ') weicht von STANDARD_VORLAGEN (' +
      V.STANDARD_VORLAGEN.length + ') ab — nicht signiert.');
    return false;
  }
  const stdById = {};
  for (const v of V.STANDARD_VORLAGEN) stdById[v.id] = v;
  for (const e of inhalte) {
    const soll = stdById[e.id];
    if (!soll) {
      privateKeyJwk = null;
      abbrechen('Wächter: "' + e.id + '" ist kein STANDARD_VORLAGEN-Eintrag der Bürger-App — nicht signiert.');
      return false;
    }
    if (!V._basisInhaltMatcht(soll, e)) {
      privateKeyJwk = null;
      abbrechen('Wächter: Inhalt von "' + e.id + '" weicht von STANDARD_VORLAGEN ab — nicht signiert.');
      return false;
    }
  }

  const G = ladeGenerator().V;
  let ergebnis;
  try {
    ergebnis = await G.basistemplateTreuhandSignieren(inhalte, privateKeyJwk);
  } catch (e) {
    privateKeyJwk = null;
    abbrechen('Signieren fehlgeschlagen: ' + e.message);
    return false;
  }

  const oeffentlicherTeil = G._pubAusPriv(privateKeyJwk);
  const thumbprint = await V._jwkThumbprint(oeffentlicherTeil);
  privateKeyJwk = null; // ab hier nicht mehr gebraucht — kein Verlass auf die Garbage Collection

  const ausgabePfad = path.resolve(ausgabeDateiArg);
  const tmpPfad = ausgabePfad + '.tmp-' + process.pid;
  fs.writeFileSync(tmpPfad, JSON.stringify(ergebnis, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPfad, ausgabePfad); // atomar — vor diesem Punkt existiert am Zielpfad nichts Neues

  console.log('[basistemplate-neu-signieren] ' + ergebnis.length + ' Templates signiert, Selbstprüfung + Wächter bestanden.');
  console.log('[basistemplate-neu-signieren] Ausgabedatei: ' + ausgabePfad);
  console.log('');
  console.log('Für das Protokollblatt:');
  for (const e of ergebnis) {
    console.log('  id=' + e.id + '  behoerde=' + e.behoerde + '  Selbstprüfung: bestanden');
  }
  console.log('  Treuhand-Public-Thumbprint: ' + thumbprint);
  return true;
}

if (require.main === module) {
  (async () => {
    const passphrase = await passphraseVonStdinLesen();
    await lauf(process.argv[2], process.argv[3], passphrase || undefined).catch((e) => {
      abbrechen('Unerwarteter Fehler: ' + e.message);
    });
  })();
}

module.exports = { lauf };
