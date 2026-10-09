#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Vorlage erzeugen — die Zertifikatskette + Vorlagen-Signatur, ein Kommando
   ────────────────────────────────────────────────────────────────────────────
   WOZU (30.08.2026, „Modul-/Vorlage-Erstellung und Packaging
   automatisieren", Punkt 2). Analog zu tools/modul-erzeugen.js (Punkt 1),
   anderer Vertrauensweg: eine Institution signiert ihre eigene Vorlage
   (Trust-1B, U2-ADR-039/040) mit ihrem EIGENEN Schlüssel — Vivodepot bezeugt
   nur, dass der öffentliche Teil dieses Schlüssels zu dieser Institution
   gehört (dasselbe Kundenzertifikat-Verfahren wie bei einem Modul-Herausgeber,
   U2-ADR-172).

   Ruft ausschließlich bestehende Funktionen auf — keine zweite Implementierung:
     - `baueAnbieter`, `validiereStammdaten`, `baueSubmissionSigniert`,
       `validiereSubmission` aus dem Erzeuger (`tests/load-generator.js`,
       derselbe Weg, den `vivodepot-studio.html` im Browser geht).
     - `tools/kundenzertifikat-ausstellen.js` für die Zertifikat-Ausstellung
       (Wiederverwendung, falls für die Institution schon eine .vdkey vorliegt).

   Fasst den ANKER nie an. Ausgabe-Schlüssel (.vdkey) und Ausstellerzertifikat
   sind Vivodepots bestehende, fertige Betriebs-Infrastruktur — Eingabe-Pfade,
   nie hier erzeugt (wie bei tools/modul-erzeugen.js).

   Automatisiert wird ausdrücklich nur die kryptografische/technische Kette,
   nicht die inhaltliche Prüfung: ob eine Institution und ihre Vorlage
   inhaltlich/rechtlich in Ordnung sind, bleibt eine eigene, nicht
   automatisierte Entscheidung Vivodepots.

   Aufruf:
     node tools/vorlage-erzeugen.js \
       --anbieter <anbieter-formular.json> --vorlage <vorlage-inhalt.json> \
       --ausgabe-vdkey <ausgabe.vdkey.json> --ausstellerzertifikat <ausstellerzertifikat.json> \
       --ausgabedatei <vorlage-buendel.json> \
       [--anbieter-vdkey <pfad>] [--anbieter-zertifikat <pfad>] \
       [--gueltigkeit-monate 18]
     Passphrasen (Ausgabe-Schlüssel, danach Anbieter-Schlüssel) werden
     interaktiv abgefragt (stdin) — nie als Kommandozeilenargument.

   <anbieter-formular.json>: dieselben Felder wie im Browser-Formular
   (anbieterName, rechtsform, adresse{strasse,plz,ort,land}, kontakt{name,
   funktion,email,telefon}, bereich, useCase; optional anbieterId/anbieterTyp/
   ustId — fehlen sie, werden sie wie im Browser aus dem Namen abgeleitet).
   <vorlage-inhalt.json>: die Vorlage selbst (felder[], optional vorlageId/
   version/gueltigBis/widerruf/dokument/wortlaut/wortlautQuelle/
   wortlautQuelleBroschuere/codeListen) — alles, was `baueTemplateObjekt`
   außer `anbieter`/`publicKeyJwk` erwartet (die setzt dieses Werkzeug).

   Ausgabedatei (Bündel): `{ submission, providerCredentialJws,
   ausstellerZertifikatJws }` — `submission` ist das vollständige,
   selbst-signierte Paket (`templatesJws`), `providerCredentialJws` das
   Kundenzertifikat, das den `publicKeyJwk` der Submission bezeugt.
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
  console.error('[vorlage-erzeugen] ' + meldung);
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
    anbieterPfad, vorlagePfad,
    ausgabeSchluesselVdkeyPfad, ausgabePassphrase, ausstellerZertifikatPfad,
    anbieterVdkeyPfad, anbieterZertifikatPfad, anbieterPassphrase,
    ausgabeDateiArg, gueltigkeitMonate,
    anbieterAngaben, anbieterPruefung, ohneAnbieterpruefung,
  } = opts || {};

  if (!anbieterPfad || !vorlagePfad
      || !ausgabeSchluesselVdkeyPfad || !ausgabePassphrase || !ausstellerZertifikatPfad
      || !anbieterPassphrase || !ausgabeDateiArg) {
    abbrechen('Aufruf: node tools/vorlage-erzeugen.js --anbieter <anbieter-formular.json> '
      + '--vorlage <vorlage-inhalt.json> --ausgabe-vdkey <pfad> --ausstellerzertifikat <pfad> '
      + '--ausgabedatei <pfad> [--anbieter-vdkey <pfad>] [--anbieter-zertifikat <pfad>] '
      + '[--gueltigkeit-monate 18]');
    return false;
  }

  const anbieterRes = leseJson(anbieterPfad, 'die Anbieter-Formular-Datei');
  if (!anbieterRes.ok) { abbrechen(anbieterRes.fehler); return false; }
  const vorlageRes = leseJson(vorlagePfad, 'die Vorlage-Inhalt-Datei');
  if (!vorlageRes.ok) { abbrechen(vorlageRes.fehler); return false; }

  const G = ladeGenerator().V;
  const anbieter = G.baueAnbieter(anbieterRes.wert);
  const stammFehler = G.validiereStammdaten(anbieter);
  if (stammFehler.length) {
    abbrechen('Anbieter-Stammdaten unvollständig:\n  - ' + stammFehler.join('\n  - '));
    return false;
  }

  const ISSUER = ladeIssuer().V;
  const vdkeyVorhanden = anbieterVdkeyPfad && fs.existsSync(path.resolve(anbieterVdkeyPfad));

  let anbieterPrivJwk = null;
  let anbieterPubJwk = null;
  let kundenDatei = null;

  if (vdkeyVorhanden) {
    if (!anbieterZertifikatPfad || !fs.existsSync(path.resolve(anbieterZertifikatPfad))) {
      abbrechen('Ein Anbieter-Schlüssel liegt vor, aber kein dazugehöriges Kundenzertifikat (anbieter-zertifikat) — inkonsistenter Stand, nichts wiederverwendet.');
      return false;
    }
    const geparstRes = leseJson(anbieterVdkeyPfad, 'die Anbieter-Schlüssel-Datei');
    if (!geparstRes.ok) { abbrechen(geparstRes.fehler); return false; }
    if (!ISSUER.istGeschuetzteSchluesseldatei(geparstRes.wert)) {
      abbrechen('Die Anbieter-Schlüssel-Datei ist keine geschützte .vdkey.');
      return false;
    }
    try {
      anbieterPrivJwk = await ISSUER.entschluesseleSchluesselJwk(geparstRes.wert, anbieterPassphrase);
    } catch (e) {
      abbrechen('Entsperren des Anbieter-Schlüssels fehlgeschlagen: ' + e.message);
      return false;
    }
    anbieterPubJwk = G._pubAusPriv(anbieterPrivJwk);
    const zertifikatRes = leseJson(anbieterZertifikatPfad, 'die Anbieter-Zertifikat-Datei');
    if (!zertifikatRes.ok) { anbieterPrivJwk = null; abbrechen(zertifikatRes.fehler); return false; }
    kundenDatei = zertifikatRes.wert;
    console.log('[vorlage-erzeugen] bestehendes Kundenzertifikat für „' + anbieter.anbieterId + '" wiederverwendet (kein neues ausgestellt).');
  } else {
    const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    anbieterPubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
    anbieterPrivJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);

    const os = require('node:os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vorlage-erzeugen-'));
    try {
      const pubPfad = path.join(tmp, 'anbieter-public.jwk.json');
      fs.writeFileSync(pubPfad, JSON.stringify(anbieterPubJwk), 'utf8');
      const zielZertifikatPfad = anbieterZertifikatPfad || path.join(tmp, 'anbieter-zertifikat.json');
      // Anbieter-Angaben/Anbieterprüfung (19.09.2026, Ziel L4) — dasselbe Pflichtfeld-Paar wie im
      // Konsolen-Werkzeug selbst, hier nur durchgereicht (derselbe Grund wie in modul-erzeugen.js).
      const ok = await kundenzertifikatAusstellen({
        anbieterId: anbieter.anbieterId, anbieterName: anbieter.anbieterName, anbieterTyp: anbieter.anbieterTyp,
        subjektPublicJwkPfad: pubPfad, ausgabeSchluesselVdkeyPfad, passphrase: ausgabePassphrase,
        ausstellerZertifikatPfad, ausgabeDateiArg: zielZertifikatPfad, gueltigkeitMonate,
        anbieterAngaben, anbieterPruefung, ohneAnbieterpruefung,
      });
      if (ok !== true) { anbieterPrivJwk = null; abbrechen('Kundenzertifikat für „' + anbieter.anbieterId + '" konnte nicht ausgestellt werden.'); return false; }
      kundenDatei = JSON.parse(fs.readFileSync(zielZertifikatPfad, 'utf8'));

      if (anbieterVdkeyPfad) {
        const geschuetzt = await ISSUER.schuetzeSchluesselJwk(anbieterPrivJwk, anbieterPassphrase);
        const tmpVdkeyPfad = path.resolve(anbieterVdkeyPfad) + '.tmp-' + process.pid;
        fs.writeFileSync(tmpVdkeyPfad, JSON.stringify(geschuetzt, null, 2) + '\n', 'utf8');
        fs.renameSync(tmpVdkeyPfad, path.resolve(anbieterVdkeyPfad));
      }
      console.log('[vorlage-erzeugen] neues Kundenzertifikat für „' + anbieter.anbieterId + '" ausgestellt.');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  const state = Object.assign({}, vorlageRes.wert, { anbieter, publicKeyJwk: anbieterPubJwk });
  let submission;
  try {
    submission = await G.baueSubmissionSigniert(state, anbieterPrivJwk);
  } finally {
    anbieterPrivJwk = null; // ab hier nicht mehr gebraucht — kein Verlass auf die Garbage Collection
  }

  const schemaFehler = G.validiereSubmission(submission);
  if (schemaFehler.length) {
    abbrechen('Die erzeugte Submission ist gegen ihr eigenes Schema ungültig — nicht geschrieben:\n  - ' + schemaFehler.join('\n  - '));
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

  console.log('[vorlage-erzeugen] Vorlage-Bündel geschrieben: ' + ausgabePfad);
  console.log('[vorlage-erzeugen] Hinweis: dies automatisiert nur die kryptografische Kette. Ob „' + anbieter.anbieterId
    + '" inhaltlich/rechtlich vertrauenswürdig ist und die Vorlage stimmt, bleibt eine eigene, '
    + 'nicht automatisierte Entscheidung.');
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
    const anbieterPfad = argWert('--anbieter');
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
    if (vdkey.quelle === 'schluesselbund') console.log('[vorlage-erzeugen] Ausgabe-Schlüssel-Pfad aus dem Schlüsselbund gelesen — der Pfad selbst erscheint in keiner Ausgabe.');
    if (zertifikat.quelle === 'schluesselbund') console.log('[vorlage-erzeugen] Ausstellerzertifikat-Pfad aus dem Schlüsselbund gelesen — der Pfad selbst erscheint in keiner Ausgabe.');
    const ausgabeDateiArg = argWert('--ausgabedatei');
    const anbieterVdkeyPfad = argWert('--anbieter-vdkey');
    const anbieterZertifikatPfad = argWert('--anbieter-zertifikat');
    const monateArg = argWert('--gueltigkeit-monate');
    // Nur relevant, wenn KEIN --anbieter-vdkey vorliegt (dann stellt dieses Werkzeug intern ein
    // Kundenzertifikat aus) — Ziel L4, 19.09.2026.
    const anbieterAngabenPfad = argWert('--anbieter-angaben');
    const anbieterAngaben = anbieterAngabenPfad ? JSON.parse(fs.readFileSync(path.resolve(anbieterAngabenPfad), 'utf8')) : undefined;
    const anbieterPruefungPfad = argWert('--anbieterpruefung');
    const anbieterPruefung = anbieterPruefungPfad ? JSON.parse(fs.readFileSync(path.resolve(anbieterPruefungPfad), 'utf8')) : undefined;
    const ohneAnbieterpruefung = argv.includes('--ohne-anbieterpruefung');

    const passphraseAusSchluesselbund = keinSchluesselbund ? null
      : schluesselbundLesen(AUSGABESTELLE_SCHLUESSELBUND_PASSPHRASE_SERVICE, AUSGABESTELLE_SCHLUESSELBUND_KONTO);
    let ausgabePassphrase; let anbieterPassphrase;
    if (passphraseAusSchluesselbund) {
      console.log('[vorlage-erzeugen] Passphrase des Ausgabe-Schlüssels aus dem Schlüsselbund gelesen — keine Eingabe nötig.');
      ausgabePassphrase = passphraseAusSchluesselbund;
      [anbieterPassphrase] = await mehrerePassphrasenVonStdinLesen([
        'Passphrase des Anbieter-Schlüssels (schützt einen neuen oder entsperrt einen bestehenden): ',
      ]);
    } else {
      [ausgabePassphrase, anbieterPassphrase] = await mehrerePassphrasenVonStdinLesen([
        'Passphrase des Ausgabe-Schlüssels: ',
        'Passphrase des Anbieter-Schlüssels (schützt einen neuen oder entsperrt einen bestehenden): ',
      ]);
    }

    const ok = await lauf({
      anbieterPfad, vorlagePfad,
      ausgabeSchluesselVdkeyPfad, ausgabePassphrase, ausstellerZertifikatPfad,
      anbieterVdkeyPfad, anbieterZertifikatPfad, anbieterPassphrase,
      ausgabeDateiArg, gueltigkeitMonate: monateArg ? Number(monateArg) : undefined,
      anbieterAngaben, anbieterPruefung, ohneAnbieterpruefung,
    }).catch((e) => { abbrechen('Unerwarteter Fehler: ' + e.message); return false; });
    if (ok !== true) process.exitCode = 1;
    ausgabePassphrase = null;
    anbieterPassphrase = null;
  })();
}

module.exports = { lauf };
