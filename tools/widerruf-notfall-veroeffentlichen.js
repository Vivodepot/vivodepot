#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Notfall-Widerruf veröffentlichen — der schmale Weg aus U2-ADR-173
   ────────────────────────────────────────────────────────────────────────────
   WOZU: einen oder mehrere RFC-7638-Thumbprints in `WIDERRUFS_LISTE`
   (`vivodepot.html`) eintragen — GENAU das und sonst nichts in dieser
   Ausführung. Hebt `SCHALEN_STAND`/`sw.js`-`CACHE` im Lockstep, spiegelt die
   Liste in die Lese-App (ruft `tools/build-widerrufsliste.js`, baut nicht
   nach). Kein Netzzugriff, keine Ausnahme von U2-ADR-009 — der Weg endet an
   geänderten Dateien; Commit/Push/Suite laufen unverändert wie bei jeder
   anderen Änderung (U2-ADR-173 verzichtet ausdrücklich auf einen
   Hook-Bypass).

   ANZEIGEN VOR DEM SCHREIBEN, MIT BESTÄTIGUNG (wie bei der Anker-Zeremonie,
   `tools/behoerden-zertifikat-ausstellen.js`): ein falsch eingetragener
   Widerruf sperrt Bürgerinnen grundlos aus — das ist der eine
   fehleranfällige Handgriff dieses Wegs.

   Aufruf:  node tools/widerruf-notfall-veroeffentlichen.js <thumbprint> [<thumbprint2> ...] [--hinweis "Text"]
            oder programmatisch: lauf({ thumbprints, anbieterHinweis, bestaetigen })
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const B = require('./build-widerrufsliste.js');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const SW = path.join(REPO, 'sw.js');

// RFC 7638 §3.1: SHA-256-Base64url — 32 Byte, ohne Padding, also 43 Zeichen aus [A-Za-z0-9_-].
const THUMBPRINT_FORM = /^[A-Za-z0-9_-]{43}$/;

// Setzt NIE process.exitCode selbst — lauf() läuft auch programmatisch (Tests, spätere Aufrufer)
// und darf den Prozess des Aufrufers nicht mit einem Exit-Code beeinflussen. Nur der CLI-Einstieg
// unten setzt exitCode, anhand des Rückgabewerts von lauf().
function abbrechen(text) {
  console.error('[widerruf-notfall-veroeffentlichen] ' + text);
}

function interaktivBestaetigen(vorschauText) {
  return new Promise((resolve) => {
    console.log(vorschauText);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    rl.question('Eintragen? (ja/nein) ', (antwort) => {
      rl.close();
      resolve(antwort.trim().toLowerCase() === 'ja');
    });
  });
}

function aktuelleListe(kernText) {
  const text = B.listeAusKern(kernText);
  // Der Text ist ein JSON-kompatibles Array-Literal (nur Strings) — sicherer als eval().
  return JSON.parse(text.replace(/'/g, '"'));
}

function versionAnheben(text, muster, ersetzung) {
  if (!muster.test(text)) throw new Error('Versions-Zeile nicht gefunden — Form geändert? Nicht raten, nachsehen.');
  return text.replace(muster, ersetzung);
}

function naechsteVersion(alt) {
  const m = /^v(\d+)$/.exec(alt);
  if (!m) throw new Error('Unbekanntes Versionsformat: ' + alt);
  return 'v' + (Number(m[1]) + 1);
}

async function lauf(opts) {
  const { thumbprints, anbieterHinweis, bestaetigen } = opts || {};
  // Injizierbar für Tests (Kopie statt echtem Repo) — Default ist der echte Bestand.
  const kernPfad = (opts && opts.kernPfad) || KERN;
  const swPfad = (opts && opts.swPfad) || SW;
  const lesenPfad = (opts && opts.lesenPfad) || B.LESEN;
  if (!Array.isArray(thumbprints) || !thumbprints.length) {
    abbrechen('Aufruf: node tools/widerruf-notfall-veroeffentlichen.js <thumbprint> [<thumbprint2> ...] [--hinweis "Text"]');
    return false;
  }
  const ungueltig = thumbprints.filter((t) => !THUMBPRINT_FORM.test(t));
  if (ungueltig.length) {
    abbrechen('Kein gültiger RFC-7638-Thumbprint (43 Zeichen, [A-Za-z0-9_-]): ' + ungueltig.join(', '));
    return false;
  }

  const kernVorher = fs.readFileSync(kernPfad, 'utf8');
  const bestand = aktuelleListe(kernVorher);
  const neuDazu = thumbprints.filter((t) => !bestand.includes(t));
  const schonDrin = thumbprints.filter((t) => bestand.includes(t));

  if (!neuDazu.length) {
    console.log('[widerruf-notfall-veroeffentlichen] Alle angegebenen Thumbprints stehen bereits in der Sperrliste — keine Änderung.');
    return true;
  }

  const vorschau = [
    'NOTFALL-WIDERRUF — vor dem Eintragen prüfen:',
    anbieterHinweis ? '  Anbieter/Anlass: ' + anbieterHinweis : null,
    '  Neu einzutragen (' + neuDazu.length + '): ' + neuDazu.join(', '),
    schonDrin.length ? '  Bereits vorhanden, wird übersprungen: ' + schonDrin.join(', ') : null,
    '  Sperrliste vorher: ' + bestand.length + ' Einträge · nachher: ' + (bestand.length + neuDazu.length) + ' Einträge',
  ].filter(Boolean).join('\n');

  const bestaetigenFn = typeof bestaetigen === 'function' ? bestaetigen : interaktivBestaetigen;
  const ok = await bestaetigenFn(vorschau);
  if (!ok) { console.log('[widerruf-notfall-veroeffentlichen] Abgebrochen — nichts geschrieben.'); return false; }

  const neueListe = bestand.concat(neuDazu);
  const listeText = '[' + neueListe.map((t) => "'" + t + "'").join(', ') + ']';
  let kernNachher = kernVorher.replace(
    /^const WIDERRUFS_LISTE = Object\.freeze\(\[[\s\S]*?\]\);/m,
    'const WIDERRUFS_LISTE = Object.freeze(' + listeText + ');   // RFC-7638-Thumbprints widerrufener Anbieter-Schluessel'
  );

  const schalenAlt = /^const SCHALEN_STAND = 'v(\d+)';/m.exec(kernNachher);
  if (!schalenAlt) throw new Error('SCHALEN_STAND nicht gefunden — Form geändert? Nicht raten, nachsehen.');
  const schalenNeu = naechsteVersion('v' + schalenAlt[1]);
  kernNachher = versionAnheben(kernNachher, /^const SCHALEN_STAND = 'v\d+';/m,
    "const SCHALEN_STAND = '" + schalenNeu + "';   // ⚠ mit sw.js CACHE gemeinsam hochzählen");
  fs.writeFileSync(kernPfad, kernNachher);

  const swVorher = fs.readFileSync(swPfad, 'utf8');
  const swNachher = versionAnheben(swVorher, /^const CACHE = 'vivodepot-shell-v\d+';/m,
    "const CACHE = 'vivodepot-shell-" + schalenNeu + "';");
  fs.writeFileSync(swPfad, swNachher);

  // Lese-App-Spiegelung — ruft auf, baut nicht nach (A405 Zug 2).
  const leseText = fs.readFileSync(lesenPfad, 'utf8');
  const leseNeu = B.regionErsetzen(leseText, B.region(listeText), path.basename(lesenPfad));
  fs.writeFileSync(lesenPfad, leseNeu);

  console.log('[widerruf-notfall-veroeffentlichen] Eingetragen: ' + neuDazu.join(', '));
  console.log('[widerruf-notfall-veroeffentlichen] SCHALEN_STAND/CACHE: ' + schalenAlt[0].match(/v\d+/)[0] + ' → ' + schalenNeu);
  console.log('[widerruf-notfall-veroeffentlichen] Lese-App-Region aktualisiert.');
  console.log('[widerruf-notfall-veroeffentlichen] Nächster Schritt: Suite fahren, dann normal committen und pushen — kein Hook-Bypass.');
  return true;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const hinweisIdx = args.indexOf('--hinweis');
  const anbieterHinweis = hinweisIdx >= 0 ? args[hinweisIdx + 1] : null;
  const thumbprints = args.filter((a, i) => a !== '--hinweis' && (hinweisIdx < 0 || i !== hinweisIdx + 1));
  lauf({ thumbprints, anbieterHinweis })
    .then((ok) => { if (!ok) process.exitCode = 1; })
    .catch((e) => { abbrechen('Unerwarteter Fehler: ' + e.message); process.exitCode = 1; });
}
module.exports = { lauf, THUMBPRINT_FORM, naechsteVersion };
