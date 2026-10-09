#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Modul erzeugen — die Zertifikatskette + Signatur, ein Kommando statt vier
   ────────────────────────────────────────────────────────────────────────────
   WOZU (30.08.2026, „Modul-/Vorlage-Erstellung und Packaging
   automatisieren"). Die drei Schritte — Kundenzertifikat für einen
   Herausgeber ausstellen (falls noch keins vorliegt, sonst wiederverwenden),
   das Modul mit dessen Schlüssel signieren, das Bündel schreiben — liefen
   bisher nur als feste Demo-Verkettung mit hart codierten Konstanten
   (die Andock-Demo des Pro-Moduls und ihr Erzeuger der Demo-Depotdatei).
   Dieses Werkzeug nimmt echten Input.

   ── WAS DIESES WERKZEUG NICHT TUT — UND NIE TUN SOLL ────────────────────────
   Es fasst den ANKER nie an. Das Ausgabestellen-Zertifikat (einmal im Jahr,
   gegen den Anker, per Zeremonie mit `tools/behoerden-zertifikat-
   ausstellen.js`) und der geschützte Ausgabe-Schlüssel (.vdkey) sind
   Vivodepots eigene, bestehende Betriebs-Infrastruktur — dieses Werkzeug
   nimmt beide als FERTIGE Pfade entgegen (`ausgabeSchluesselVdkeyPfad`,
   `ausstellerZertifikatPfad`) und erzeugt sie nie selbst. Wer sie noch nicht
   hat, stellt sie einmalig über die Geschwister-Werkzeuge her — das bleibt
   ein bewusster, seltener Akt, kein Nebeneffekt dieses Kommandos.

   Ebenso automatisiert wird NUR die kryptografische und technische Kette
   (Zertifikat, Signatur, Bündel). Ob ein Herausgeber vertrauenswürdig ist und
   ob sein Modul-Inhalt stimmt, bleibt eine inhaltliche Produktentscheidung/Vivodepots — dieses Werkzeug prüft das nicht und tut nicht so,
   als täte es das.

   ── WIEDERVERWENDUNG ─────────────────────────────────────────────────────────
   `herausgeberVdkeyPfad`/`herausgeberZertifikatPfad` sind optional. Existiert
   die vdkey-Datei bereits, wird sie mit `herausgeberPassphrase` entsperrt und
   das dazugehörige Kundenzertifikat wiederverwendet — KEINE zweite Ausstellung
   für denselben Herausgeber. Existiert sie nicht (oder wird kein Pfad
   angegeben), wird ein neues Schlüsselpaar erzeugt, ein neues Kundenzertifikat
   über `tools/kundenzertifikat-ausstellen.js` ausgestellt, und — falls ein Pfad
   angegeben wurde — der neue Schlüssel geschützt dorthin geschrieben, damit der
   nächste Lauf für denselben Herausgeber ihn wiederverwenden kann.

   Ruft `tools/kundenzertifikat-ausstellen.js` und die Zertifikator-Funktionen
   aus `tests/load-issuer.js` — keine zweite Ausstellungs- oder Signatur-
   Implementierung.

   Aufruf:
     node tools/modul-erzeugen.js \
       --herausgeber-id <anbieterId> --herausgeber-name <name> --herausgeber-typ <typ> \
       --modul <modul-inhalt.json> \
       --ausgabe-vdkey <ausgabe.vdkey.json> --ausstellerzertifikat <ausstellerzertifikat.json> \
       --ausgabedatei <modul-buendel.json> \
       [--herausgeber-vdkey <pfad>] [--herausgeber-zertifikat <pfad>] \
       [--gueltigkeit-monate 18]
     Passphrasen (Ausgabe-Schlüssel, danach Herausgeber-Schlüssel) werden
     interaktiv abgefragt (stdin) — nie als Kommandozeilenargument.

   Ausgabedatei (Bündel): `{ providerCredentialJws, modulSignaturJws,
   ausstellerZertifikatJws }` — genau das Format, das `modulEinlassenGeprueft`
   beim Import prüft und das `tools/modul-app-packen.js` als `--bundle` nimmt.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { ladeIssuer, webcrypto } = require('../tests/load-issuer.js');
const { lauf: kundenzertifikatAusstellen } = require('./kundenzertifikat-ausstellen.js');
const {
  schluesselbundLesen, pruefeKeinePassphraseInArgv, wertAusArgvOderSchluesselbund,
  AUSGABESTELLE_SCHLUESSELBUND_KONTO, AUSGABESTELLE_SCHLUESSELBUND_VDKEY_SERVICE,
  AUSGABESTELLE_SCHLUESSELBUND_ZERTIFIKAT_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_PASSPHRASE_SERVICE,
} = require('./lib/schluesselbund.js');

function abbrechen(meldung) {
  console.error('[modul-erzeugen] ' + meldung);
}

function leseJson(pfad, bezeichnung) {
  try {
    return { ok: true, wert: JSON.parse(fs.readFileSync(path.resolve(pfad), 'utf8')) };
  } catch (e) {
    return { ok: false, fehler: 'Konnte ' + bezeichnung + ' nicht lesen oder als JSON parsen: ' + e.message };
  }
}

async function lauf(opts) {
  const {
    herausgeberId, herausgeberName, herausgeberTyp, modulPfad,
    ausgabeSchluesselVdkeyPfad, ausgabePassphrase, ausstellerZertifikatPfad,
    herausgeberVdkeyPfad, herausgeberZertifikatPfad, herausgeberPassphrase,
    ausgabeDateiArg, gueltigkeitMonate,
    anbieterAngaben, anbieterPruefung, ohneAnbieterpruefung,
  } = opts || {};

  if (!herausgeberId || !herausgeberName || !herausgeberTyp || !modulPfad
      || !ausgabeSchluesselVdkeyPfad || !ausgabePassphrase || !ausstellerZertifikatPfad
      || !herausgeberPassphrase || !ausgabeDateiArg) {
    abbrechen('Aufruf: node tools/modul-erzeugen.js --herausgeber-id <id> --herausgeber-name <name> '
      + '--herausgeber-typ <typ> --modul <modul-inhalt.json> --ausgabe-vdkey <pfad> '
      + '--ausstellerzertifikat <pfad> --ausgabedatei <pfad> [--herausgeber-vdkey <pfad>] '
      + '[--herausgeber-zertifikat <pfad>] [--gueltigkeit-monate 18]');
    return false;
  }

  const modulRes = leseJson(modulPfad, 'die Modul-Inhalt-Datei');
  if (!modulRes.ok) { abbrechen(modulRes.fehler); return false; }
  const modul = modulRes.wert;
  if (!modul || typeof modul !== 'object' || typeof modul.modulTyp !== 'string') {
    abbrechen('Die Modul-Inhalt-Datei trägt kein gültiges Modul (kein Feld „modulTyp").');
    return false;
  }

  const ISSUER = ladeIssuer().V;
  const vdkeyVorhanden = herausgeberVdkeyPfad && fs.existsSync(path.resolve(herausgeberVdkeyPfad));

  let herausgeberPrivJwk = null;
  let kundenDatei = null;

  if (vdkeyVorhanden) {
    if (!herausgeberZertifikatPfad || !fs.existsSync(path.resolve(herausgeberZertifikatPfad))) {
      abbrechen('Ein Herausgeber-Schlüssel liegt vor, aber kein dazugehöriges Kundenzertifikat (herausgeber-zertifikat) — inkonsistenter Stand, nichts wiederverwendet.');
      return false;
    }
    const geparstRes = leseJson(herausgeberVdkeyPfad, 'die Herausgeber-Schlüssel-Datei');
    if (!geparstRes.ok) { abbrechen(geparstRes.fehler); return false; }
    if (!ISSUER.istGeschuetzteSchluesseldatei(geparstRes.wert)) {
      abbrechen('Die Herausgeber-Schlüssel-Datei ist keine geschützte .vdkey.');
      return false;
    }
    try {
      herausgeberPrivJwk = await ISSUER.entschluesseleSchluesselJwk(geparstRes.wert, herausgeberPassphrase);
    } catch (e) {
      abbrechen('Entsperren des Herausgeber-Schlüssels fehlgeschlagen: ' + e.message);
      return false;
    }
    const zertifikatRes = leseJson(herausgeberZertifikatPfad, 'die Herausgeber-Zertifikat-Datei');
    if (!zertifikatRes.ok) { herausgeberPrivJwk = null; abbrechen(zertifikatRes.fehler); return false; }
    kundenDatei = zertifikatRes.wert;
    console.log('[modul-erzeugen] bestehendes Kundenzertifikat für „' + herausgeberId + '" wiederverwendet (kein neues ausgestellt).');
  } else {
    const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
    herausgeberPrivJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);

    const os = require('node:os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'modul-erzeugen-'));
    try {
      const pubPfad = path.join(tmp, 'herausgeber-public.jwk.json');
      fs.writeFileSync(pubPfad, JSON.stringify(pubJwk), 'utf8');
      const zielZertifikatPfad = herausgeberZertifikatPfad || path.join(tmp, 'herausgeber-zertifikat.json');
      // Anbieter-Angaben/Anbieterprüfung (19.09.2026, Ziel L4) — dasselbe Pflichtfeld-Paar wie im
      // Konsolen-Werkzeug selbst, hier nur durchgereicht: modul-erzeugen.js stellt intern ein
      // Kundenzertifikat aus, wenn keins mitgegeben wird, und dieser Ausstellungsweg unterliegt
      // denselben Auflagen wie ein manueller Aufruf von kundenzertifikat-ausstellen.js.
      const ok = await kundenzertifikatAusstellen({
        anbieterId: herausgeberId, anbieterName: herausgeberName, anbieterTyp: herausgeberTyp,
        subjektPublicJwkPfad: pubPfad, ausgabeSchluesselVdkeyPfad, passphrase: ausgabePassphrase,
        ausstellerZertifikatPfad, ausgabeDateiArg: zielZertifikatPfad, gueltigkeitMonate,
        anbieterAngaben, anbieterPruefung, ohneAnbieterpruefung,
      });
      if (ok !== true) { herausgeberPrivJwk = null; abbrechen('Kundenzertifikat für „' + herausgeberId + '" konnte nicht ausgestellt werden.'); return false; }
      kundenDatei = JSON.parse(fs.readFileSync(zielZertifikatPfad, 'utf8'));

      if (herausgeberVdkeyPfad) {
        const geschuetzt = await ISSUER.schuetzeSchluesselJwk(herausgeberPrivJwk, herausgeberPassphrase);
        const tmpVdkeyPfad = path.resolve(herausgeberVdkeyPfad) + '.tmp-' + process.pid;
        fs.writeFileSync(tmpVdkeyPfad, JSON.stringify(geschuetzt, null, 2) + '\n', 'utf8');
        fs.renameSync(tmpVdkeyPfad, path.resolve(herausgeberVdkeyPfad));
      }
      console.log('[modul-erzeugen] neues Kundenzertifikat für „' + herausgeberId + '" ausgestellt.');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  let herausgeberSignKey;
  try {
    herausgeberSignKey = await ISSUER._jwsImportSignKey(herausgeberPrivJwk);
  } finally {
    herausgeberPrivJwk = null; // ab hier nicht mehr gebraucht — kein Verlass auf die Garbage Collection
  }

  const modulSignaturJws = await ISSUER._signJWS(modul, herausgeberSignKey, {});
  const bundle = {
    providerCredentialJws: kundenDatei.certJws,
    modulSignaturJws,
    ausstellerZertifikatJws: kundenDatei.ausstellerZertifikatJws,
  };

  const ausgabePfad = path.resolve(ausgabeDateiArg);
  const tmpPfad = ausgabePfad + '.tmp-' + process.pid;
  fs.writeFileSync(tmpPfad, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPfad, ausgabePfad);

  console.log('[modul-erzeugen] Modul-Bündel geschrieben: ' + ausgabePfad);
  console.log('[modul-erzeugen] Hinweis: dies automatisiert nur die kryptografische Kette. Ob „' + herausgeberId
    + '" inhaltlich/rechtlich vertrauenswürdig ist und der Modul-Inhalt stimmt, bleibt eine eigene, '
    + 'nicht automatisierte Entscheidung.');
  return true;
}

/* Interaktiv statt Kommandozeilenargument, wie bei den Geschwister-Werkzeugen — eine
   Passphrase als process.argv steht in der Shell-History und der Prozessliste.

   EINE readline-Instanz für ALLE Fragen (Fund 30.08.2026, Live-Probe): zwei
   sequenzielle `createInterface(...).question()`-Aufrufe auf process.stdin funktionieren nur
   bei einem live tippenden Menschen. Bei gepipetem/gescripteten stdin schließt die erste
   Instanz mit dem Stream-Ende, bevor die zweite Frage überhaupt gestellt wird — die zweite
   Antwort löst NIE auf, und weil danach nichts mehr den Node-Prozess am Leben hält, endet er
   still mit Exit-Code 0, ohne Fehlermeldung und ohne Ausgabedatei (belegt: tests/modul-
   erzeugen.test.js#[CLI·Rot-Beweis] — sieht aus wie Erfolg, ist keiner). Eine einzige Instanz,
   die mehrere Fragen nacheinander stellt, hat dieses Problem nicht. */
function mehrerePassphrasenUeberReadlineOhneMaske(prompts) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    const antworten = [];
    const naechste = () => {
      if (antworten.length === prompts.length) { rl.close(); resolve(antworten); return; }
      rl.question(prompts[antworten.length], (antwort) => { antworten.push(antwort); naechste(); });
    };
    naechste();
  });
}

/* A577 (12.09.2026): an einem echten Terminal stand die Passphrase beim Tippen sichtbar auf dem
   Schirm UND blieb im Scrollback stehen — der Kopf-Kommentar dieses Werkzeugs sagt ausdrücklich
   zu, dass Passphrasen in keiner AUSGABE erscheinen (s. Zeile ~52), die Zusage deckte die
   EINGABE nicht. `readline` mit `terminal:false` verhindert das NICHT: es unterlässt nur die
   eigene Zeilenbearbeitung, das Echo einer echten TTY (Kernel-/Treiberebene) läuft unabhängig
   davon weiter. Maskierung braucht Raw-Modus (`setRawMode`) — der existiert nur, wenn stdin
   wirklich ein TTY ist. Bei gepipetem/gescripteten stdin (Tests, CI) bleibt der Weg oben
   unverändert: dort gibt es kein sichtbares Echo und kein Scrollback, das etwas preisgeben
   könnte, und `setRawMode` existiert dort nicht. */
// stdin/stdout injizierbar (Standard: process.stdin/process.stdout) — allein zur Testbarkeit
// der Maskierung mit einem echten TTY nachgebauten Fake, sonst identisches Verhalten.
function einePassphraseVonTtyMaskiertLesen(prompt, stdin, stdout) {
  stdin = stdin || process.stdin;
  stdout = stdout || process.stdout;
  return new Promise((resolve, reject) => {
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let eingabe = '';
    const aufraeumen = () => { stdin.removeListener('data', aufZeichen); stdin.setRawMode(false); stdin.pause(); };
    // JEDER CHUNK ZEICHENWEISE (16.09.2026): Eingefügtes kommt als EIN data-Chunk, oft mit Zeilenende („geheim\r",
    // „geheim\r\n"). Vorher wurde ein Chunk nur als Ganzes mit „\r" verglichen — ein Einfügen mit Zeilenende löste nie
    // auf, der Lauf hing am Prompt (PTY-Messung am Auslieferungslauf). Ein \n direkt nach \r gehört zum selben
    // Zeilenende; was danach im Chunk steht, geht zurück in den Strom für die nächste Frage.
    // Ein CR LF, das auf zwei Chunks verteilt ankommt: das LF am Anfang der NÄCHSTEN Frage ist kein leeres Enter.
    let ueberspringeLf = stdin._vdLetztesZeilenendeCr === true;
    stdin._vdLetztesZeilenendeCr = false;
    const aufZeichen = (chunk) => {
      const zeichen = Array.from(String(chunk));
      if (ueberspringeLf && zeichen[0] === '\n') zeichen.shift();
      if (zeichen.length) ueberspringeLf = false;
      for (let i = 0; i < zeichen.length; i++) {
        const z = zeichen[i];
        if (z === '\u0003') { aufraeumen(); stdout.write('\n'); reject(new Error('abgebrochen (Strg+C)')); return; }
        if (z === '\r' || z === '\n') {
          const mitLf = z === '\r' && zeichen[i + 1] === '\n';
          const rest = zeichen.slice(i + 1 + (mitLf ? 1 : 0)).join('');
          stdin._vdLetztesZeilenendeCr = z === '\r' && !mitLf && i === zeichen.length - 1;
          aufraeumen();
          if (rest && typeof stdin.unshift === 'function') stdin.unshift(rest);
          stdout.write('\n');
          resolve(eingabe);
          return;
        }
        if (z === '\u007f' || z === '\b') { eingabe = Array.from(eingabe).slice(0, -1).join(''); continue; }
        eingabe += z;
      }
    };
    stdin.on('data', aufZeichen);
  });
}
async function mehrerePassphrasenVonTtyMaskiertLesen(prompts, stdin, stdout) {
  const antworten = [];
  for (const p of prompts) antworten.push(await einePassphraseVonTtyMaskiertLesen(p, stdin, stdout));
  return antworten;
}
function mehrerePassphrasenVonStdinLesen(prompts) {
  return process.stdin.isTTY
    ? mehrerePassphrasenVonTtyMaskiertLesen(prompts)
    : mehrerePassphrasenUeberReadlineOhneMaske(prompts);
}

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    if (pruefeKeinePassphraseInArgv(argv)) {
      abbrechen('Passphrase darf nie als Kommandozeilenargument übergeben werden — Schlüsselbund oder stdin.');
      return;
    }
    const argWert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
    const herausgeberId = argWert('--herausgeber-id');
    const herausgeberName = argWert('--herausgeber-name');
    const herausgeberTyp = argWert('--herausgeber-typ');
    const modulPfad = argWert('--modul');
    // Ausgabe-Schlüssel/-Zertifikat: dieselbe Ausgabestelle wie der Rezepte-Signierer,
    // darum derselbe Schlüsselbund-Weg (20.09.2026, „Zeremonie für die Rezepte",
    // Klassenfehler-Fund: dieses Werkzeug fragte bislang nur Argument/stdin ab, nie den
    // Schlüsselbund — genau der zweite Weg, den der neue Wächter jetzt verhindert).
    const keinSchluesselbund = argv.includes('--kein-schluesselbund');
    const vdkey = wertAusArgvOderSchluesselbund(argv, '--ausgabe-vdkey', {
      keinSchluesselbund, schluesselbundLesenFn: () => schluesselbundLesen(AUSGABESTELLE_SCHLUESSELBUND_VDKEY_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_KONTO),
    });
    const zertifikat = wertAusArgvOderSchluesselbund(argv, '--ausstellerzertifikat', {
      keinSchluesselbund, schluesselbundLesenFn: () => schluesselbundLesen(AUSGABESTELLE_SCHLUESSELBUND_ZERTIFIKAT_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_KONTO),
    });
    const ausgabeSchluesselVdkeyPfad = vdkey.wert;
    const ausstellerZertifikatPfad = zertifikat.wert;
    if (vdkey.quelle === 'schluesselbund') console.log('[modul-erzeugen] Ausgabe-Schlüssel-Pfad aus dem Schlüsselbund gelesen — der Pfad selbst erscheint in keiner Ausgabe.');
    if (zertifikat.quelle === 'schluesselbund') console.log('[modul-erzeugen] Ausstellerzertifikat-Pfad aus dem Schlüsselbund gelesen — der Pfad selbst erscheint in keiner Ausgabe.');
    const ausgabeDateiArg = argWert('--ausgabedatei');
    const herausgeberVdkeyPfad = argWert('--herausgeber-vdkey');
    const herausgeberZertifikatPfad = argWert('--herausgeber-zertifikat');
    const monateArg = argWert('--gueltigkeit-monate');
    // Nur relevant, wenn KEIN --herausgeber-vdkey vorliegt (dann stellt dieses Werkzeug intern ein
    // Kundenzertifikat aus, s. Kopf-Kommentar an kundenzertifikatAusstellen oben) — Ziel L4, 19.09.2026.
    const anbieterAngabenPfad = argWert('--anbieter-angaben');
    const anbieterAngaben = anbieterAngabenPfad ? JSON.parse(fs.readFileSync(path.resolve(anbieterAngabenPfad), 'utf8')) : undefined;
    const anbieterPruefungPfad = argWert('--anbieterpruefung');
    const anbieterPruefung = anbieterPruefungPfad ? JSON.parse(fs.readFileSync(path.resolve(anbieterPruefungPfad), 'utf8')) : undefined;
    const ohneAnbieterpruefung = argv.includes('--ohne-anbieterpruefung');

    const passphraseAusSchluesselbund = keinSchluesselbund ? null
      : schluesselbundLesen(AUSGABESTELLE_SCHLUESSELBUND_PASSPHRASE_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_KONTO);
    let ausgabePassphrase; let herausgeberPassphrase;
    if (passphraseAusSchluesselbund) {
      console.log('[modul-erzeugen] Passphrase des Ausgabe-Schlüssels aus dem Schlüsselbund gelesen — keine Eingabe nötig.');
      ausgabePassphrase = passphraseAusSchluesselbund;
      [herausgeberPassphrase] = await mehrerePassphrasenVonStdinLesen([
        'Passphrase des Herausgeber-Schlüssels (schützt einen neuen oder entsperrt einen bestehenden): ',
      ]);
    } else {
      [ausgabePassphrase, herausgeberPassphrase] = await mehrerePassphrasenVonStdinLesen([
        'Passphrase des Ausgabe-Schlüssels: ',
        'Passphrase des Herausgeber-Schlüssels (schützt einen neuen oder entsperrt einen bestehenden): ',
      ]);
    }

    const ok = await lauf({
      herausgeberId, herausgeberName, herausgeberTyp, modulPfad,
      ausgabeSchluesselVdkeyPfad, ausgabePassphrase, ausstellerZertifikatPfad,
      herausgeberVdkeyPfad, herausgeberZertifikatPfad, herausgeberPassphrase,
      ausgabeDateiArg, gueltigkeitMonate: monateArg ? Number(monateArg) : undefined,
      anbieterAngaben, anbieterPruefung, ohneAnbieterpruefung,
    }).catch((e) => { abbrechen('Unerwarteter Fehler: ' + e.message); return false; });
    if (ok !== true) process.exitCode = 1;
    ausgabePassphrase = null;
    herausgeberPassphrase = null;
  })();
}

module.exports = {
  lauf, mehrerePassphrasenVonTtyMaskiertLesen,
  // Für andere Zeremonie-Werkzeuge (kein Nachbau des A577-Fixes) — der Dispatcher
  // selbst (TTY maskiert, gepipet unmaskiert-aber-ungefährlich) wird gebraucht,
  // nicht nur die TTY-Hälfte.
  mehrerePassphrasenVonStdinLesen,
};
