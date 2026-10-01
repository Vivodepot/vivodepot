#!/usr/bin/env node
'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   Kundenzertifikat ausstellen — der Zertifikatsbetrieb, über die Zwischenstufe
   ────────────────────────────────────────────────────────────────────────────
   WOZU (23.08.2026, „Zertifikatsbetrieb", Zug 3). Für zwei Behörden-
   Zertifikate im Jahr war der direkte Weg (Anker signiert jedes Zertifikat
   selbst) richtig. Für ein Geschäft mit vielen Kunden ist er unmöglich: der
   Anker liegt in vier Umschlägen, zwei müssen für JEDES Zertifikat zusammen-
   kommen. Die Zwischenstufe (U2-ADR-172) löst das: der Anker zertifiziert
   EINMAL im Jahr einen Ausgabe-Schlüssel, der Ausgabe-Schlüssel zertifiziert
   danach jeden Kunden — ohne dass der Anker je wieder gebraucht wird.

   Dieses Werkzeug signiert MIT DEM AUSGABE-SCHLÜSSEL, nicht mit dem Anker.
   Ruft `baueProviderVC`/`stelleProviderCredentialAus` aus dem Zertifikator
   (`tests/load-issuer.js`) — dieselbe Ausstellung wie bei
   `tools/behoerden-zertifikat-ausstellen.js`, keine zweite Implementierung.

   ── DER AUSGABE-SCHLÜSSEL IST EIN .vdkey, NICHT AUFGETEILT ──────────────────
   Anders als der Anker (der in Anteile zerfällt) ist der Ausgabe-Schlüssel
   geschützt verwahrt (`.vdkey` + Passphrase) — er wird oft gebraucht, und was
   oft gebraucht wird, kann nicht in vier Umschlägen liegen. Entsperrt wird er
   über `entschluesseleSchluesselJwk` aus dem Zertifikator selbst
   (wie bei `tools/basistemplate-neu-signieren.js`) — kein zweiter
   Entschlüsselungsweg. Die Variable, die ihn hält, wird sofort nach dem
   Signieren genullt.

   ── DAS AUSSTELLERZERTIFIKAT REIST MIT ──────────────────────────────────────
   Der Ausgabe-Schlüssel ist NICHT im Kern eingebettet (anders als der Anker).
   Damit die Bürger-App die Kette prüfen kann, muss das Ausstellerzertifikat
   (einmal im Jahr mit `tools/behoerden-zertifikat-ausstellen.js
   <anbieterId> <anbieterName> <ausgabe-public.jwk.json> <ausgabe.json> …
   vivodepot/ausgabestelle` gegen den Anker ausgestellt) NEBEN jedem Kunden-
   zertifikat mitreisen. Dieses Werkzeug bettet es darum direkt in seine
   Ausgabedatei ein (`ausstellerZertifikatJws`) — eine Datei, kein Suchen nach
   zwei Dateien beim Empfänger.

   Vor dem Signieren: das übergebene Ausstellerzertifikat muss WIRKLICH zum
   geladenen Ausgabe-Schlüssel gehören (dessen `publicKeyJwk.x` muss mit dem
   aus dem entsperrten Privatschlüssel abgeleiteten `x` übereinstimmen) — sonst
   entstünde ein Kundenzertifikat, dessen mitgereichter Aussteller-Beleg gar
   nicht zu ihm passt, und der Fehler zeigte sich erst beim Empfänger.

   Auflagen wie bei den Geschwister-Werkzeugen: Passphrase und Pfade erscheinen
   in keiner Ausgabe/Fehlermeldung, der private Schlüssel wird genullt, keine
   Netzverbindung, keine halbe Ausgabedatei (Temp + rename).

   Aufruf:
     node tools/kundenzertifikat-ausstellen.js <anbieterId> <anbieterName> \
       <anbieterTyp> <subjekt-public.jwk.json> <ausgabe-schluessel.vdkey.json> \
       <ausstellerzertifikat.json> <ausgabedatei.json> [gueltigkeitMonate=18]
   Die Passphrase des Ausgabe-Schlüssels wird danach interaktiv abgefragt (stdin) — nie als
   Kommandozeilenargument (23.08.2026, Zug 3, wie beim Signier-Werkzeug). `lauf()` selbst nimmt
   sie weiterhin als Feld entgegen — das bleibt der Weg für Tests.

   --rolle pruefer --sprachen <fr,ka> --modultypen <textsatz> (19.09.2026, Zertifikatsweg für externe
   Prüfer, U2-ADR-441): DER REGELWEG für eine Prüfstelle, ohne neue Anker-Zeremonie. Das Blatt-Zertifikat
   trägt `rolle: 'pruefer'` und `geltung: { modulTypen, sprachen }`; es zählt als Prüfer-Zertifikat nur unter
   einer Ausgabestelle aus `EIGENE_AUSGABESTELLEN` (der Treuhand). Ohne Geltungsbereich, für Deutsch oder
   Englisch, an einem `vivodepot/*`-Typ oder für mehr als zwölf Monate stellt das Werkzeug nichts aus
   (`tools/lib/pruefer-angaben.js`). Vorgabe für die Laufzeit einer Prüfstelle: zwölf Monate.

   <ausstellerzertifikat.json> ist die Ausgabedatei von
   `tools/behoerden-zertifikat-ausstellen.js` (Feld `certJws` wird gelesen).

   Ausgabedatei: `{ anbieterId, anbieterName, anbieterTyp, issuanceDate,
   expirationDate, certJws, ausstellerZertifikatJws }` — kein Schlüsselmaterial.

   --anbieter-angaben <datei.json> (19.09.2026, Ziel L4) — PFLICHT, keine Abschaltung
   vorgesehen: `{ rechtsform, adresse: {strasse,plz,ort,land}, kontakt: {name,funktion,email,telefon},
   ustId? }`, dieselbe Form wie $defs.verantwortlicheStelle in
   docs/template-generator/submission-schema.json (tools/lib/anbieter-angaben.js). „natürliche
   Person" ist ein rechtsform-Wert wie jeder andere, kein eigenes Feld daneben — ladungsfähige
   Anschrift bleibt für jede Rechtsform Pflicht. Ohne diese Angaben stellt das Werkzeug nichts aus.

   --anbieterpruefung <datei.json> (Produktentscheidung: „auf jeden Fall implementieren, abschaltbar") — Vorgabe
   AN: `{ methode: registerauszug|email-bestaetigung|ausweis-von-hand, geprueftAm, geprueftVon,
   belegHash }` (tools/lib/anbieterpruefung.js; Adapter für belegHash in
   tools/lib/anbieterpruefung-adapter.js, NICHT automatisch aus diesem Werkzeug aufgerufen — keine
   Netzverbindung beim Signieren). `--ohne-anbieterpruefung` schaltet für DIESE Ausstellung ab —
   nie still, `anbieterPruefungAbgeschaltet: true` wird ins Zertifikat geschrieben. Keine
   Rückwirkung: ein Zertifikat von vor dieser Funktion trägt keines der beiden Felder und gilt als
   „ungeprüft (vor Einführung)" (anbieterPruefungStatus in tools/lib/anbieterpruefung.js).
   ════════════════════════════════════════════════════════════════════════════ */
const { zertifikatJwsAusDatei } = require('./lib/zertifikat-datei.js');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { ladeIssuer } = require('../tests/load-issuer.js');
const { pruefstellenAngabenPruefen, MAX_MONATE_PRUEFER } = require('./lib/pruefer-angaben.js');
const { anbieterAngabenPruefen } = require('./lib/anbieter-angaben.js');
const { anbieterPruefungPruefen } = require('./lib/anbieterpruefung.js');

function abbrechen(meldung) {
  console.error('[kundenzertifikat-ausstellen] ' + meldung);
  process.exitCode = 1;
}

// Sekundengenau, wie isoJetzt()/isoSekunden() im Zertifikator selbst — ohne diese Angleichung
// unterscheiden sich Browser-Weg und dieses Werkzeug bei GLEICHEM Ablauf um die Millisekunden-
// Endung ".000Z" vs. "Z", und zwei sonst identische certJws sind es dann nicht mehr (Fund vom
// 23.08.2026, Beleg-Test "Zertifikatsbetrieb ohne Terminal").
function isoSekunden(iso) { return new Date(iso).toISOString().replace(/\.\d{3}Z$/, 'Z'); }

function jwsPayloadDekodieren(jwsCompact) {
  const teile = String(jwsCompact || '').split('.');
  if (teile.length !== 3) return null;
  try { return JSON.parse(Buffer.from(teile[1], 'base64url').toString('utf8')); } catch (e) { return null; }
}

async function lauf(opts) {
  const {
    anbieterId, anbieterName, anbieterTyp,
    subjektPublicJwkPfad, ausgabeSchluesselVdkeyPfad, passphrase,
    ausstellerZertifikatPfad, ausgabeDateiArg, gueltigkeitMonate,
  } = opts || {};
  if (!anbieterId || !anbieterName || !anbieterTyp || !subjektPublicJwkPfad ||
      !ausgabeSchluesselVdkeyPfad || !passphrase || !ausstellerZertifikatPfad || !ausgabeDateiArg) {
    abbrechen('Aufruf: node tools/kundenzertifikat-ausstellen.js <anbieterId> <anbieterName> <anbieterTyp> <subjekt-public.jwk.json> <ausgabe-schluessel.vdkey.json> <ausstellerzertifikat.json> <ausgabedatei.json> [gueltigkeitMonate=18] (Passphrase wird interaktiv abgefragt)');
    return false;
  }
  // Anbieter-Angaben: PFLICHT, keine Abschaltung vorgesehen (19.09.2026) — „ohne
  // anbieter keine Signatur". anbieterAngabenPruefen wirft benannt, abbrechen() fängt es.
  let anbieterAngaben;
  try {
    anbieterAngaben = anbieterAngabenPruefen(opts && opts.anbieterAngaben);
  } catch (e) { abbrechen(e.message); return false; }

  // Anbieterprüfung: Vorgabe AN, je Ausstellungsweg eigener Schalter (dieses Werkzeug:
  // Kundenzertifikat). Abschalten ist möglich, aber nie still — die Abschaltung selbst wird ins
  // Zertifikat geschrieben (credentialSubject.anbieterPruefungAbgeschaltet), keine Rückwirkung
  // auf ältere Zertifikate (Produktentscheidung, 19.09.2026).
  let anbieterPruefung = null;
  const anbieterPruefungAbgeschaltet = !!(opts && opts.ohneAnbieterpruefung);
  if (!anbieterPruefungAbgeschaltet) {
    try {
      anbieterPruefung = anbieterPruefungPruefen(opts && opts.anbieterPruefung);
    } catch (e) { abbrechen(e.message); return false; }
  } else {
    console.error('[kundenzertifikat-ausstellen] Anbieterprüfung AUSDRÜCKLICH abgeschaltet — wird im Zertifikat vermerkt.');
  }

  const rolle = (opts && opts.rolle) || null;
  const pruefAngaben = pruefstellenAngabenPruefen({
    rolle, anbieterTyp, sprachen: opts && opts.sprachen, modulTypen: opts && opts.modulTypen,
    monate: gueltigkeitMonate, erlaubterTyp: (t) => !String(t).startsWith('vivodepot/'),
  });
  if (pruefAngaben.fehler) { abbrechen(pruefAngaben.fehler); return false; }
  const monate = Number.isFinite(gueltigkeitMonate) && gueltigkeitMonate > 0 ? gueltigkeitMonate : (rolle === 'pruefer' ? MAX_MONATE_PRUEFER : 18);

  let subjektPubJwk;
  try {
    subjektPubJwk = JSON.parse(fs.readFileSync(path.resolve(subjektPublicJwkPfad), 'utf8'));
  } catch (e) {
    abbrechen('Konnte die Datei des Subjekt-Schlüssels nicht lesen oder als JSON parsen.');
    return false;
  }
  if (!subjektPubJwk || typeof subjektPubJwk.x !== 'string') {
    abbrechen('Die Datei des Subjekt-Schlüssels enthält keinen öffentlichen Schlüssel (kein Feld „x").');
    return false;
  }
  if (subjektPubJwk.d) {
    abbrechen('Die Datei des Subjekt-Schlüssels trägt ein Feld „d" — hier wird nur der öffentliche Teil erwartet.');
    return false;
  }

  let ausstellerDatei;
  try {
    ausstellerDatei = JSON.parse(fs.readFileSync(path.resolve(ausstellerZertifikatPfad), 'utf8'));
  } catch (e) {
    abbrechen('Konnte die Ausstellerzertifikat-Datei nicht lesen oder als JSON parsen.');
    return false;
  }
  // certJws, proof.jws oder providerCredentialJws — je nach Erzeuger (tools/lib/zertifikat-datei.js).
  let ausstellerZertifikatJws;
  try {
    ausstellerZertifikatJws = zertifikatJwsAusDatei(ausstellerDatei).jws;
  } catch (e) {
    abbrechen('Die Ausstellerzertifikat-Datei: ' + e.message);
    return false;
  }
  const ausstellerPayload = jwsPayloadDekodieren(ausstellerZertifikatJws);
  const ausstellerCsX = ausstellerPayload && ausstellerPayload.credentialSubject && ausstellerPayload.credentialSubject.publicKeyJwk && ausstellerPayload.credentialSubject.publicKeyJwk.x;
  if (!ausstellerCsX) {
    abbrechen('Die Ausstellerzertifikat-JWS trägt keinen lesbaren Subjekt-Public-Key.');
    return false;
  }

  let geparst;
  try {
    geparst = JSON.parse(fs.readFileSync(path.resolve(ausgabeSchluesselVdkeyPfad), 'utf8'));
  } catch (e) {
    abbrechen('Konnte die Ausgabe-Schlüssel-Datei nicht lesen oder als JSON parsen.');
    return false;
  }
  const ISSUER = ladeIssuer().V;
  if (!ISSUER.istGeschuetzteSchluesseldatei(geparst)) {
    abbrechen('Die Ausgabe-Schlüssel-Datei ist keine geschützte .vdkey.');
    return false;
  }
  let ausgabePrivatJwk;
  try {
    ausgabePrivatJwk = await ISSUER.entschluesseleSchluesselJwk(geparst, passphrase);
  } catch (e) {
    abbrechen('Entsperren fehlgeschlagen: ' + e.message);
    return false;
  }
  geparst = null;

  // Beleg VOR jeder Signatur: das mitgegebene Ausstellerzertifikat gehört wirklich zu DIESEM
  // Ausgabe-Schlüssel — sonst reist ein Kundenzertifikat mit einem Beleg, der nicht zu ihm passt.
  if (ausgabePrivatJwk.x !== ausstellerCsX) {
    ausgabePrivatJwk = null;
    abbrechen('Das Ausstellerzertifikat gehört nicht zu diesem Ausgabe-Schlüssel (öffentlicher Teil weicht ab) — nichts ausgestellt.');
    return false;
  }
  if (subjektPubJwk.x === ausgabePrivatJwk.x) {
    ausgabePrivatJwk = null;
    abbrechen('Ausgabe-Schlüssel und Subjekt-Schlüssel sind derselbe Schlüssel — es wird nichts ausgestellt.');
    return false;
  }

  let ausgabeSignKey;
  try {
    ausgabeSignKey = await ISSUER._jwsImportSignKey(ausgabePrivatJwk);
  } finally {
    ausgabePrivatJwk = null; // ab hier nicht mehr gebraucht — kein Verlass auf die Garbage Collection
  }

  // issuanceDate ist injizierbar (23.08.2026, Beleg-Test "Zertifikatsbetrieb ohne Terminal"):
  // der Browser-Weg und dieses Werkzeug müssen bei GLEICHEM issuanceDate zeichengleiche certJws
  // liefern — ohne Override liefe jeder Vergleich am realen Zeitunterschied vorbei.
  const issuanceDate = opts.issuanceDate || isoSekunden(new Date().toISOString());
  // Fund von VD Fix (30.08.2026): eine eigene, hier dupliziert gebaute Monats-Arithmetik ohne
  // Tages-Clamp rollte bei Monatsende-Starttagen in einen kürzeren Zielmonat (z. B. Schaltjahr-
  // Februar) in den Folgemonat, während der Browser-Weg korrekt auf den letzten gültigen Tag
  // klemmte — zwei verschiedene Ablaufdaten aus demselben issuanceDate/gueltigkeitMonate.
  // Behoben durch Wegfall der Duplizierung: derselbe ISSUER.plusMonate wie im Browser-Weg.
  const expirationDate = ISSUER.plusMonate(issuanceDate, monate);
  const vc = ISSUER.baueProviderVC({
    issuer: 'did:web:vivodepot.de',
    anbieterId, anbieterName, anbieterTyp,
    publicKeyJwk: subjektPubJwk,
    issuanceDate, expirationDate,
    rechtsform: anbieterAngaben.rechtsform, adresse: anbieterAngaben.adresse, kontakt: anbieterAngaben.kontakt,
    ustId: anbieterAngaben.ustId,
    anbieterPruefung, anbieterPruefungAbgeschaltet,
  });
  if (rolle) vc.credentialSubject.rolle = rolle;
  if (pruefAngaben.geltung) vc.credentialSubject.geltung = pruefAngaben.geltung;
  let certJws;
  try {
    certJws = await ISSUER.stelleProviderCredentialAus(vc, ausgabeSignKey);
  } catch (e) {
    abbrechen('Ausstellen fehlgeschlagen: ' + e.message);
    return false;
  }

  // Selbstprüfung gegen den Ausgabe-Schlüssel selbst — der Anker ist diesem Werkzeug absichtlich
  // nie zugänglich (das ist der ganze Sinn der Zwischenstufe), darum keine Drei-Stufen-Prüfung hier.
  const ausgabeVerifyKey = await ISSUER._jwsImportVerifyKey({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ausstellerCsX });
  const pruef = await ISSUER._verifyJWS(certJws, ausgabeVerifyKey, {});
  if (!pruef.gueltig) {
    abbrechen('Selbstprüfung fehlgeschlagen: das ausgestellte Zertifikat verifiziert NICHT gegen den Ausgabe-Schlüssel — nicht geschrieben.');
    return false;
  }

  const ausgabePfad = path.resolve(ausgabeDateiArg);
  const tmpPfad = ausgabePfad + '.tmp-' + process.pid;
  const ergebnis = { anbieterId, anbieterName, anbieterTyp, issuanceDate, expirationDate, certJws, ausstellerZertifikatJws };
  if (rolle) ergebnis.rolle = rolle;
  if (pruefAngaben.geltung) ergebnis.geltung = pruefAngaben.geltung;
  ergebnis.rechtsform = anbieterAngaben.rechtsform;
  if (anbieterPruefung) ergebnis.anbieterPruefung = anbieterPruefung;
  if (anbieterPruefungAbgeschaltet) ergebnis.anbieterPruefungAbgeschaltet = true;
  fs.writeFileSync(tmpPfad, JSON.stringify(ergebnis, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPfad, ausgabePfad); // atomar — vor diesem Punkt existiert am Zielpfad nichts Neues

  console.log('[kundenzertifikat-ausstellen] Zertifikat ausgestellt, Selbstprüfung bestanden.');
  console.log('[kundenzertifikat-ausstellen] Ausgabedatei: ' + ausgabePfad);
  console.log('');
  console.log('Für das Protokollblatt:');
  console.log('  anbieterId=' + anbieterId + '  Ablauf=' + expirationDate + '  Subjekt-Thumbprint(x)=' + subjektPubJwk.x);
  return true;
}

/* Interaktiv statt Kommandozeilenargument (23.08.2026, "Zertifikatsbetrieb ohne
   Terminal", Posten 3): eine Passphrase als process.argv steht in der Shell-History und der
   Prozessliste. Nur beim echten CLI-Aufruf gefragt — Tests übergeben die Passphrase weiterhin
   direkt an lauf(). */
function passphraseVonStdinLesen() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    rl.question('Passphrase des Ausgabe-Schlüssels: ', (antwort) => {
      rl.close();
      resolve(antwort);
    });
  });
}

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    const nimmFlag = (name) => { const i = argv.indexOf(name); if (i < 0) return undefined; const w = argv[i + 1]; argv.splice(i, 2); return w; };
    const nimmBoolFlag = (name) => { const i = argv.indexOf(name); if (i < 0) return false; argv.splice(i, 1); return true; };
    const nimmJsonFlag = (name) => { const w = nimmFlag(name); if (w === undefined) return undefined; return JSON.parse(fs.readFileSync(path.resolve(w), 'utf8')); };
    const rolleArg = nimmFlag('--rolle'), sprachenArg = nimmFlag('--sprachen'), modulTypenArg = nimmFlag('--modultypen');
    const anbieterAngabenArg = nimmJsonFlag('--anbieter-angaben');
    const anbieterPruefungArg = nimmJsonFlag('--anbieterpruefung');
    const ohneAnbieterpruefungArg = nimmBoolFlag('--ohne-anbieterpruefung');
    const [anbieterId, anbieterName, anbieterTyp, subjektPublicJwkPfad,
      ausgabeSchluesselVdkeyPfad, ausstellerZertifikatPfad, ausgabeDateiArg, monateArg] = argv;
    const passphrase = await passphraseVonStdinLesen();
    await lauf({
      anbieterId, anbieterName, anbieterTyp, subjektPublicJwkPfad,
      ausgabeSchluesselVdkeyPfad, passphrase, ausstellerZertifikatPfad, ausgabeDateiArg,
      gueltigkeitMonate: monateArg ? Number(monateArg) : undefined,
      rolle: rolleArg, sprachen: sprachenArg, modulTypen: modulTypenArg,
      anbieterAngaben: anbieterAngabenArg, anbieterPruefung: anbieterPruefungArg,
      ohneAnbieterpruefung: ohneAnbieterpruefungArg,
    }).catch((e) => abbrechen('Unerwarteter Fehler: ' + e.message));
  })();
}

module.exports = { lauf };
