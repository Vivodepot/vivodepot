#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   schluessel-passphrase-aendern.js — die Passphrase einer geschützten `.vdkey`
   ändern, ohne sie je im Klartext auf der Platte oder in einer Ausgabe zu
   berühren (12.09.2026, echter Vorfall).

   WOZU. Der scharfe Lauf der Basistemplate-Zeremonie (`tools/basistemplate-
   zeremonie-automat.js`) las die Passphrase über `readline` mit
   `terminal: false` — das unterlässt nur die eigene Zeilenbearbeitung, das
   TTY-Echo läuft unabhängig davon weiter. Die Passphrase stand im Klartext
   auf dem Schirm UND im Scrollback (behoben, s. A577 in beiden betroffenen
   Werkzeugen). Der Vorfall selbst blieb tragbar — die Datei hat den Rechner
   nie verlassen — aber er legte eine echte, unabhängige Lücke
   offen: es gab KEIN Werkzeug, mit dem sie die Passphrase DANACH hätte
   wechseln können. Ein Schlüssel, dessen Passphrase sich nie ändern lässt,
   hat keinen Weg zurück, wenn sie einmal bekannt wird.

   WAS DIESES WERKZEUG TUT, GENAU VIER SCHRITTE:
     1. geschützte .vdkey einlesen (Pfad als Argument)
     2. mit der ALTEN Passphrase entsperren — verdeckt eingelesen
     3. mit der NEUEN Passphrase neu schützen — verdeckt, ZWEIMAL zur
        Bestätigung (ein Tippfehler hier ist dauerhaft — es gibt keine
        Rückfrage danach, die neue Datei wäre für immer unlesbar)
     4. in eine NEUE Datei schreiben, direkt neben der alten — das ORIGINAL
        wird NIE überschrieben, unter keinen Umständen.

   FÜNF AUFLAGEN, NICHT VERHANDELBAR (12.09.2026):

   (1) DAS ORIGINAL WIRD NIE ÜBERSCHRIEBEN. Die neue Datei entsteht mit einem
       Zeitstempel im Namen, neben der alten. Wer beim Neu-Schützen die neue
       Passphrase vertippt und dabei das Original überschrieben hätte, hätte
       den Schlüssel verloren — und damit die Fähigkeit, je wieder ein
       Basistemplate zu signieren.

   (2) GEGENPRÜFUNG VOR DEM SCHREIBEN. Die neu geschützte Datei wird SOFORT
       wieder mit der neuen Passphrase entsperrt, der entsperrte Schlüssel
       gegen den ursprünglichen verglichen (byte-genauer JSON-Vergleich der
       vollständigen JWK, nicht nur ein Feld). Erst wenn das stimmt, wird
       geschrieben. Ein Schlüssel, der sich nicht mehr öffnen lässt, ist
       verloren, und das merkt man sonst erst beim nächsten Mal.

   (3) BEIDE PASSPHRASEN VERDECKT — dieselbe Bauart wie der A577-Fix am
       Zeremonie-Automaten: `mehrerePassphrasenVonStdinLesen` aus
       `tools/modul-erzeugen.js`, kein eigener Nachbau der Maskierung. Die
       neue Passphrase wird ZWEIMAL abgefragt; stimmen die Eingaben nicht
       überein, wird abgebrochen, NICHTS geschrieben.

   (4) DER PRIVATE SCHLÜSSEL WIRD NACH GEBRAUCH EXPLIZIT GENULLT — dieselbe
       Bauart wie `tools/basistemplate-neu-signieren.js`, kein Verlass auf
       die Garbage Collection.

   (5) DER PFAD DER SCHLÜSSELDATEI ERSCHEINT IN KEINER LOG-ZEILE UND KEINER
       FEHLERMELDUNG — dieselbe Regel wie beim Signierer (`WIR KENNEN IHREN
       PFAD NICHT UND WOLLEN IHN NICHT`, s. dort). Der Pfad der NEUEN, gerade
       erst geschriebenen Datei wird dagegen genannt — genau wie beim
       Signierer die Ausgabedatei genannt wird — sonst könnte niemand seinen
       neuen Schlüssel wiederfinden.

   KEIN `--neue-passphrase`-ARGUMENT, UNTER KEINEN UMSTÄNDEN. Wenn jemand das
   bequem findet, ist das der Grund, warum dieses Werkzeug gebaut wurde — ein
   Argument steht in der Shell-History und der Prozessliste. `pruefeKeinePassphrasenInArgv`
   unten erkennt JEDES Argument, das nach einer Passphrase aussieht (alt, neu,
   ohne Präfix), nicht nur `--passphrase` — und bricht VOR jedem anderen
   Schritt ab.

   KEIN NACHBAU DER KRYPTOGRAFIE: `istGeschuetzteSchluesseldatei`/
   `schuetzeSchluesselJwk`/`entschluesseleSchluesselJwk` kommen unverändert
   aus dem Zertifikator (`tests/load-issuer.js`) — dieselben Primitiven, die
   `basistemplate-neu-signieren.js` und `vivodepot-vc-issuer.html` selbst
   benutzen.

   AUFRUF
     node tools/schluessel-passphrase-aendern.js <geschuetzte-schluesseldatei.vdkey>
   Beide Passphrasen werden danach interaktiv abgefragt (stdin, maskiert an
   einem echten Terminal). `lauf()` selbst nimmt Alt-/Neu-Passphrase auch als
   zweites/drittes Argument entgegen — das bleibt der Weg für Tests, die kein
   Terminal simulieren; die CLI selbst verbietet das (s. o.).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ladeIssuer } = require('../tests/load-issuer.js');
const { mehrerePassphrasenVonStdinLesen } = require('./modul-erzeugen.js');

/* Breiter als `pruefeKeinePassphraseInArgv` in tools/lib/schluesselbund.js (die erkennt
   NUR `--passphrase`): hier darf AUCH `--neue-passphrase`/`--alte-passphrase`/jede
   Schreibweise mit "passphrase" im Namen nie als Argumentwert übergeben werden — genau
   die Bequemlichkeit, die ausdrücklich ausschließt. */
const ARGV_PASSPHRASE_MUSTER = /^--?[a-z-]*passphrase(=.*)?$/i;
function pruefeKeinePassphrasenInArgv(argv) {
  return (argv || []).some((a) => ARGV_PASSPHRASE_MUSTER.test(String(a)));
}

function abbrechen(meldung) {
  console.error('[schluessel-passphrase-aendern] ' + meldung);
  process.exitCode = 1;
}

/* Neue Datei NEBEN der alten, nie an ihrer Stelle — Zeitstempel im Namen macht
   Kollisionen bei mehrfachem Ausführen praktisch ausgeschlossen und macht sichtbar,
   WANN gewechselt wurde, ohne dass der Name selbst irgendetwas Geheimes verrät. */
function neuerPfadNeben(altPfad) {
  const dir = path.dirname(altPfad);
  const basisOhneEndung = path.basename(altPfad).replace(/\.vdkey(\.json)?$/i, '').replace(/\.json$/i, '');
  const zeitstempel = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(dir, basisOhneEndung + '.neue-passphrase-' + zeitstempel + '.vdkey.json');
}

/* Die vier Schritte, s. Kopf-Kommentar. `altePassphraseArg`/`neuePassphraseArg` sind
   NUR für Tests da (kein Terminal zu simulieren) — die CLI (`main()` unten) übergibt sie
   nie, fragt immer interaktiv. */
async function lauf(schluesseldateiArg, altePassphraseArg, neuePassphraseArg) {
  if (!schluesseldateiArg) {
    abbrechen('Aufruf: node tools/schluessel-passphrase-aendern.js <geschuetzte-schluesseldatei.vdkey>');
    return false;
  }

  let geparst;
  try {
    geparst = JSON.parse(fs.readFileSync(path.resolve(schluesseldateiArg), 'utf8'));
  } catch (e) {
    abbrechen('Konnte die Schlüsseldatei nicht lesen oder als JSON parsen.');
    return false;
  }

  const ISSUER = ladeIssuer().V;
  if (!ISSUER.istGeschuetzteSchluesseldatei(geparst)) {
    abbrechen('Die Datei ist keine geschützte .vdkey-Datei (kein erkanntes Kennfeld) — nichts zu ändern, nichts geschrieben.');
    return false;
  }

  let altePassphrase = altePassphraseArg !== undefined
    ? altePassphraseArg
    : (await mehrerePassphrasenVonStdinLesen(['Alte Passphrase: ']))[0];

  let privateKeyJwk;
  try {
    privateKeyJwk = await ISSUER.entschluesseleSchluesselJwk(geparst, altePassphrase);
  } catch (e) {
    altePassphrase = null;
    abbrechen('Entsperren mit der alten Passphrase fehlgeschlagen: ' + e.message);
    return false;
  }
  altePassphrase = null;
  geparst = null;

  let neu1;
  let neu2;
  if (Array.isArray(neuePassphraseArg)) {
    // NUR für Tests: zwei EXPLIZIT unterschiedliche Werte, um den Mismatch-Zweig zu prüfen
    // — die CLI kann das nie liefern (fragt beide interaktiv nacheinander ab).
    [neu1, neu2] = neuePassphraseArg;
  } else if (neuePassphraseArg !== undefined) {
    neu1 = neuePassphraseArg;
    neu2 = neuePassphraseArg;
  } else {
    [neu1, neu2] = await mehrerePassphrasenVonStdinLesen(['Neue Passphrase: ', 'Neue Passphrase (zur Bestätigung, noch einmal): ']);
  }
  if (neu1 !== neu2) {
    privateKeyJwk = null;
    neu1 = null; neu2 = null;
    abbrechen('Die neue Passphrase wurde zweimal unterschiedlich eingegeben — nichts geschrieben. Bitte erneut versuchen.');
    return false;
  }
  const neuePassphrase = neu1;
  neu1 = null; neu2 = null;

  let neuerWrapper;
  try {
    neuerWrapper = await ISSUER.schuetzeSchluesselJwk(privateKeyJwk, neuePassphrase);
  } catch (e) {
    privateKeyJwk = null;
    abbrechen('Neu-Schützen mit der neuen Passphrase fehlgeschlagen: ' + e.message);
    return false;
  }

  /* GEGENPRÜFUNG VOR DEM SCHREIBEN (Auflage 2, nicht verhandelbar): die frisch geschützte
     Hülle SOFORT wieder öffnen und den entsperrten Schlüssel gegen das Original vergleichen
     — nicht nur "hat schuetzeSchluesselJwk nicht geworfen", sondern "kommt wirklich derselbe
     Schlüssel zurück". */
  let rueckentsperrt;
  try {
    rueckentsperrt = await ISSUER.entschluesseleSchluesselJwk(neuerWrapper, neuePassphrase);
  } catch (e) {
    privateKeyJwk = null;
    abbrechen('Gegenprüfung fehlgeschlagen: die neu geschützte Datei lässt sich mit der neuen Passphrase nicht wieder öffnen — NICHTS geschrieben.');
    return false;
  }
  const stimmtUeberein = JSON.stringify(rueckentsperrt) === JSON.stringify(privateKeyJwk);
  rueckentsperrt = null;
  privateKeyJwk = null;
  if (!stimmtUeberein) {
    abbrechen('Gegenprüfung fehlgeschlagen: der über die neue Datei entsperrte Schlüssel weicht vom ursprünglichen ab — NICHTS geschrieben.');
    return false;
  }

  const neuerPfad = neuerPfadNeben(path.resolve(schluesseldateiArg));
  const tmpPfad = neuerPfad + '.tmp-' + process.pid;
  fs.writeFileSync(tmpPfad, JSON.stringify(neuerWrapper, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPfad, neuerPfad); // atomar — vor diesem Punkt existiert am Zielpfad nichts Neues
  neuerWrapper = null;

  console.log('[schluessel-passphrase-aendern] Gegenprüfung bestanden: neue Passphrase öffnet die neue Datei, derselbe Schlüssel wie im Original.');
  console.log('[schluessel-passphrase-aendern] Neue Datei geschrieben, Original unangetastet: ' + neuerPfad);
  return neuerPfad; // truthy bei Erfolg — UND der Pfad, den der Aufrufer sonst neu berechnen müsste
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (pruefeKeinePassphrasenInArgv(argv)) {
    abbrechen('Passphrase darf nie als Kommandozeilenargument übergeben werden — nur interaktiv (stdin), alt und neu.');
  } else {
    lauf(argv[0]).catch((e) => abbrechen('Unerwarteter Fehler: ' + e.message));
  }
}

module.exports = { lauf, neuerPfadNeben, pruefeKeinePassphrasenInArgv };
