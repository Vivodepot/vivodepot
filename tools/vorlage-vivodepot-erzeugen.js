#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Vorlage erzeugen, für Vivodepots EIGENE Feld-Vorlagen — die Zertifikatskette
   + Vorlagen-Signatur, ein Kommando (U2-ADR-289, 05.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   WOZU. tools/vorlage-erzeugen.js automatisiert Trust-1B (U2-ADR-039/040):
   eine FREMDE Institution signiert ihre EIGENE Vorlage mit ihrem EIGENEN
   Schlüssel, nachdem sie ein Anbieter-Formular ausgefüllt hat, das
   validiereStammdaten besteht — inklusive eines `bereich`-Felds aus den 13
   eingebauten Vivodepot-Bereichen (dasselbe Dropdown wie im Browser-Formular).

   Vivodepots EIGENE Feld-Vorlagen (z. B. das Pro-Modul, tools/betriebssatz-
   inhalte.js) tragen KEINEN Anbieter-Formular-Bereich, sondern ihre eigenen,
   modulinternen Bereichs-Bezeichner (z. B. `pro-vertretung-vollmachten`) — das
   ist eine andere Achse als die 13 eingebauten Bereiche und war es nie gedacht,
   deren Enum zu erfüllen. GEMESSEN (05.09.2026, tests/pro-modul-vorlage-
   echtdaten.test.js): ein Lauf von tools/vorlage-erzeugen.js mit Vivodepots
   eigenen 54 Feldern scheitert an validiereSubmission — „$.templates[0].
   felder[N].bereich: Wert nicht im enum", für jedes einzelne Feld. Das ist
   KEIN Bug in vorlage-erzeugen.js (das Werkzeug tut genau, wofür es gebaut
   wurde), sondern ein Kategoriefehler, Vivodepots eigenen Inhalt durch den
   FREMDEN Weg zu schicken.

   Der TATSÄCHLICH tragende Weg für Vivodepots eigenen Feld-Inhalt ist bereits
   bewiesen — manuell zusammengesetzt in der Probe der Betriebssatz-Inhalte
   („Kern-Probe·Ende-zu-Ende") und in den Fremd-Haltungs-Messungen tools/
   pro-durchstich-messen.js / tools/pruefstoff-betriebsuebergabe-messen.js:
   `baueSubmissionSigniert` (derselbe Erzeuger, der auch fremde Vorlagen baut)
   + eine direkt ausgestellte Kundenzertifikat (wie bei tools/modul-erzeugen.js,
   NICHT über ein Anbieter-Formular) + `importPlanGeprueft('provider-
   credential', …)`, der Weg, den `modulEinlassenGeprueft` beim echten Import
   prüft. Dieses Werkzeug macht daraus ein einziges Kommando mit echtem Input
   statt einer Testfixture — analog zu tools/modul-erzeugen.js, nur mit einer
   signierten VORLAGE (`baueSubmissionSigniert`) statt einem signierten MODUL
   (`_signJWS` über den rohen Modul-Inhalt) als Nutzlast.

   ── WAS DIESES WERKZEUG NICHT TUT — UND NIE TUN SOLL ────────────────────────
   Es fasst den ANKER nie an. Ausgabe-Schlüssel (.vdkey) und Ausstellerzertifikat
   sind Vivodepots bestehende, fertige Betriebs-Infrastruktur — Eingabe-Pfade,
   nie hier erzeugt (wie bei tools/modul-erzeugen.js).

   Automatisiert wird ausdrücklich nur die kryptografische/technische Kette,
   nicht die inhaltliche Prüfung: ob der Feld-Inhalt stimmt, bleibt eine eigene,
   nicht automatisierte Entscheidung Vivodepots.

   Kein Anbieter-Formular, keine validiereStammdaten/validiereSubmission-Prüfung
   — die sind für den FREMDEN Weg gebaut (13 eingebaute Bereiche, Adresse/
   Kontakt einer Institution). Herausgeber-Identität kommt wie bei
   tools/modul-erzeugen.js direkt als Kommandozeilen-Argument, es gibt keine
   dritte Instanz, die Vivodepots eigene Stammdaten prüfen müsste.

   Aufruf:
     node tools/vorlage-vivodepot-erzeugen.js \
       --herausgeber-id <id> --herausgeber-name <name> --herausgeber-typ <typ> \
       --vorlage <vorlage-inhalt.json> \
       --ausgabe-vdkey <ausgabe.vdkey.json> --ausstellerzertifikat <ausstellerzertifikat.json> \
       --ausgabedatei <vorlage-buendel.json> \
       [--herausgeber-vdkey <pfad>] [--herausgeber-zertifikat <pfad>] \
       [--gueltigkeit-monate 18]
     Passphrasen (Ausgabe-Schlüssel, danach Herausgeber-Schlüssel) werden
     interaktiv abgefragt (stdin) — nie als Kommandozeilenargument.

   <vorlage-inhalt.json>: `{ felder: [...] }` — genau die Form, die
   die Feldliste des Betriebssatzes als FELDER_DE/FELDER_EN exportiert
   (s. dessen Aufbereitung, vorlage-inhalt-de.json/
   vorlage-inhalt-en.json).

   Ausgabedatei (Bündel): `{ submission, providerCredentialJws,
   ausstellerZertifikatJws }` — dieselbe Form wie tools/vorlage-erzeugen.js,
   `submission` trägt `templatesJws` (je Vorlage eine eigene Signatur).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ladeIssuer, webcrypto } = require('../tests/load-issuer.js');
const { ladeGenerator } = require('../tests/load-generator.js');
const { lauf: kundenzertifikatAusstellen } = require('./kundenzertifikat-ausstellen.js');
const { mehrerePassphrasenVonStdinLesen } = require('./modul-erzeugen.js');
const {
  schluesselbundLesen, pruefeKeinePassphraseInArgv, wertAusArgvOderSchluesselbund,
  AUSGABESTELLE_SCHLUESSELBUND_KONTO, AUSGABESTELLE_SCHLUESSELBUND_VDKEY_SERVICE,
  AUSGABESTELLE_SCHLUESSELBUND_ZERTIFIKAT_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_PASSPHRASE_SERVICE,
} = require('./lib/schluesselbund.js');

function abbrechen(meldung) {
  console.error('[vorlage-vivodepot-erzeugen] ' + meldung);
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
    herausgeberId, herausgeberName, herausgeberTyp, vorlagePfad,
    ausgabeSchluesselVdkeyPfad, ausgabePassphrase, ausstellerZertifikatPfad,
    herausgeberVdkeyPfad, herausgeberZertifikatPfad, herausgeberPassphrase,
    ausgabeDateiArg, gueltigkeitMonate,
    anbieterAngaben, anbieterPruefung, ohneAnbieterpruefung,
  } = opts || {};

  if (!herausgeberId || !herausgeberName || !herausgeberTyp || !vorlagePfad
      || !ausgabeSchluesselVdkeyPfad || !ausgabePassphrase || !ausstellerZertifikatPfad
      || !herausgeberPassphrase || !ausgabeDateiArg) {
    abbrechen('Aufruf: node tools/vorlage-vivodepot-erzeugen.js --herausgeber-id <id> '
      + '--herausgeber-name <name> --herausgeber-typ <typ> --vorlage <vorlage-inhalt.json> '
      + '--ausgabe-vdkey <pfad> --ausstellerzertifikat <pfad> --ausgabedatei <pfad> '
      + '[--herausgeber-vdkey <pfad>] [--herausgeber-zertifikat <pfad>] [--gueltigkeit-monate 18]');
    return false;
  }

  const vorlageRes = leseJson(vorlagePfad, 'die Vorlage-Inhalt-Datei');
  if (!vorlageRes.ok) { abbrechen(vorlageRes.fehler); return false; }
  const felder = vorlageRes.wert && vorlageRes.wert.felder;
  if (!Array.isArray(felder) || felder.length < 1) {
    abbrechen('Die Vorlage-Inhalt-Datei trägt kein gültiges Feld „felder" (nicht-leeres Array).');
    return false;
  }

  const ISSUER = ladeIssuer().V;
  const vdkeyVorhanden = herausgeberVdkeyPfad && fs.existsSync(path.resolve(herausgeberVdkeyPfad));

  let herausgeberPrivJwk = null;
  let herausgeberPubJwk = null;
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
    const G0 = ladeGenerator().V;
    herausgeberPubJwk = G0._pubAusPriv(herausgeberPrivJwk);
    const zertifikatRes = leseJson(herausgeberZertifikatPfad, 'die Herausgeber-Zertifikat-Datei');
    if (!zertifikatRes.ok) { herausgeberPrivJwk = null; abbrechen(zertifikatRes.fehler); return false; }
    kundenDatei = zertifikatRes.wert;
    console.log('[vorlage-vivodepot-erzeugen] bestehendes Kundenzertifikat für „' + herausgeberId + '" wiederverwendet (kein neues ausgestellt).');
  } else {
    const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    herausgeberPubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
    herausgeberPrivJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);

    const os = require('node:os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vorlage-vivodepot-erzeugen-'));
    try {
      const pubPfad = path.join(tmp, 'herausgeber-public.jwk.json');
      fs.writeFileSync(pubPfad, JSON.stringify(herausgeberPubJwk), 'utf8');
      const zielZertifikatPfad = herausgeberZertifikatPfad || path.join(tmp, 'herausgeber-zertifikat.json');
      // Anbieter-Angaben/Anbieterprüfung (19.09.2026, Ziel L4) — s. modul-erzeugen.js/vorlage-erzeugen.js.
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
      console.log('[vorlage-vivodepot-erzeugen] neues Kundenzertifikat für „' + herausgeberId + '" ausgestellt.');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  const G = ladeGenerator().V;
  const state = {
    anbieter: { anbieterId: herausgeberId, anbieterName: herausgeberName, anbieterTyp: herausgeberTyp },
    publicKeyJwk: herausgeberPubJwk,
    felder,
  };
  let submission;
  try {
    submission = await G.baueSubmissionSigniert(state, herausgeberPrivJwk);
  } finally {
    herausgeberPrivJwk = null; // ab hier nicht mehr gebraucht — kein Verlass auf die Garbage Collection
  }

  if (!submission.templatesJws || !submission.templatesJws[0]) {
    abbrechen('Die Vorlage wurde nicht signiert (kein templatesJws) — nichts geschrieben.');
    return false;
  }

  const bundle = {
    submission,
    providerCredentialJws: kundenDatei.certJws,
    ausstellerZertifikatJws: kundenDatei.ausstellerZertifikatJws,
  };

  const ausgabePfad = path.resolve(ausgabeDateiArg);
  const tmpPfad = ausgabePfad + '.tmp-' + process.pid;
  fs.writeFileSync(tmpPfad, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPfad, ausgabePfad);

  console.log('[vorlage-vivodepot-erzeugen] Vorlage-Bündel geschrieben: ' + ausgabePfad);
  console.log('[vorlage-vivodepot-erzeugen] Hinweis: dies automatisiert nur die kryptografische Kette. '
    + 'Ob der Feld-Inhalt stimmt, bleibt eine eigene, nicht automatisierte Entscheidung.');
  return true;
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
    const vorlagePfad = argWert('--vorlage');
    // Ausgabe-Schlüssel/-Zertifikat: dieselbe Ausgabestelle wie der Rezepte-Signierer und
    // tools/modul-erzeugen.js (s. Kopf-Kommentar tools/lib/schluesselbund.js) — derselbe
    // Schlüsselbund-Weg, kein zweiter Satz Namen.
    const keinSchluesselbund = argv.includes('--kein-schluesselbund');
    const vdkey = wertAusArgvOderSchluesselbund(argv, '--ausgabe-vdkey', {
      keinSchluesselbund, schluesselbundLesenFn: () => schluesselbundLesen(AUSGABESTELLE_SCHLUESSELBUND_VDKEY_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_KONTO),
    });
    const zertifikat = wertAusArgvOderSchluesselbund(argv, '--ausstellerzertifikat', {
      keinSchluesselbund, schluesselbundLesenFn: () => schluesselbundLesen(AUSGABESTELLE_SCHLUESSELBUND_ZERTIFIKAT_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_KONTO),
    });
    const ausgabeSchluesselVdkeyPfad = vdkey.wert;
    const ausstellerZertifikatPfad = zertifikat.wert;
    if (vdkey.quelle === 'schluesselbund') console.log('[vorlage-vivodepot-erzeugen] Ausgabe-Schlüssel-Pfad aus dem Schlüsselbund gelesen — der Pfad selbst erscheint in keiner Ausgabe.');
    if (zertifikat.quelle === 'schluesselbund') console.log('[vorlage-vivodepot-erzeugen] Ausstellerzertifikat-Pfad aus dem Schlüsselbund gelesen — der Pfad selbst erscheint in keiner Ausgabe.');
    const ausgabeDateiArg = argWert('--ausgabedatei');
    const herausgeberVdkeyPfad = argWert('--herausgeber-vdkey');
    const herausgeberZertifikatPfad = argWert('--herausgeber-zertifikat');
    const monateArg = argWert('--gueltigkeit-monate');
    const anbieterAngabenPfad = argWert('--anbieter-angaben');
    const anbieterAngaben = anbieterAngabenPfad ? JSON.parse(fs.readFileSync(path.resolve(anbieterAngabenPfad), 'utf8')) : undefined;
    const anbieterPruefungPfad = argWert('--anbieterpruefung');
    const anbieterPruefung = anbieterPruefungPfad ? JSON.parse(fs.readFileSync(path.resolve(anbieterPruefungPfad), 'utf8')) : undefined;
    const ohneAnbieterpruefung = argv.includes('--ohne-anbieterpruefung');

    const passphraseAusSchluesselbund = keinSchluesselbund ? null
      : schluesselbundLesen(AUSGABESTELLE_SCHLUESSELBUND_PASSPHRASE_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_KONTO);
    let ausgabePassphrase; let herausgeberPassphrase;
    if (passphraseAusSchluesselbund) {
      console.log('[vorlage-vivodepot-erzeugen] Passphrase des Ausgabe-Schlüssels aus dem Schlüsselbund gelesen — keine Eingabe nötig.');
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
      herausgeberId, herausgeberName, herausgeberTyp, vorlagePfad,
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

module.exports = { lauf };
