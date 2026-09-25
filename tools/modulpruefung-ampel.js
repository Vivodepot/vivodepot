#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   modulpruefung-ampel.js — das fehlende Verdikt der automatisierten Modulprüfung
   ────────────────────────────────────────────────────────────────────────────
   Auftrag, 04.09.2026, über 2: „schafft sie es, eine
   neue Fassung einer bestehenden Vorlage ohne menschliche Durchsicht
   durchzulassen oder zu verwerfen?" Der „Modulprüfung schließen"
   (23.08.2026) ist vollständig geschlossen (fünf Posten, alle belegt) — er hat
   eine STRUKTURIERTE LISTE gebaut (`tools/einreichung-auffaelligkeiten-
   sammeln.js`), nie eine AMPEL. Die Bestandsaufnahme vom selben Tag benennt
   das selbst: „eine Liste, die ein Mensch durchsehen kann, keine einzelne
   Ampel." Dieses Werkzeug ist die Ampel — und nur die Ampel.

   ►►► DIE FEHLRICHTUNG DIESES WERKZEUGS IST "FRAGT EINEN MENSCHEN", NIE
       "WINKT DURCH". Alles, was dieses Werkzeug nicht kennt, nicht einordnen
       kann oder nicht ausdrücklich als sicher erkannt hat, ergibt
       `mensch-noetig` — niemals `automatisch-sicher` durch Auslassung,
       Zeitüberschreitung, einen unbekannten Feldtyp, eine unbekannte
       Register-Art oder einen Programmfehler. Wer dieses Werkzeug erweitert:
       ein neuer Fall wird ausdrücklich auf `automatisch-sicher` geprüft, nie
       implizit angenommen. ◄◄◄

   KEIN NEUER PRÜFMECHANISMUS. Komponiert ausschließlich, was bereits geprüft
   ist:
     - Signaturkette: `V.modulEinlassenGeprueft` (→ `verifiziereProviderCredential`
       + `_verifiziereTemplateSignatur`) — VERIFIZIERT, signiert NICHTS. Dieses
       Werkzeug rührt an keinem Schlüsselmaterial, auch nicht als Zusatzschalter.
     - Struktur/Größe/Tiefe/reservierte Kennungen: dieselben `reg.pruefen()` je
       `EINLASS_REGISTER`-Eintrag, die auch der reguläre Einlassweg nutzt.
     - Fassungsvergleich: KEINE eigene Nachbildung von `modulFassungEntscheiden`
       (Kette „Aktualisierung eines Moduls", 20.08.2026) — dieses Werkzeug reicht
       die Vorgängerfassung in DASSELBE Ziel-Depot ein wie die neue und liest
       `raus.fassung`/`fassungVon`/`fassungNach`, die `modulEinlassen` intern
       ohnehin schon berechnet (`_einbettenMitFassung` → `modulFassungEntscheiden`)
       — derselbe Weg, den der Bestandsweg beim Bürger nutzt, hier zum ersten
       Mal als eigener Prüfschritt VOR dem Verteilen gelesen, nicht dupliziert.
     - Anbieter-Identität: `V._modulAnbieterKennung` (A437) — trennt normalisiert
       (getrimmt, klein geschrieben), null-sicher.
   Neu ist ausschließlich die ZUSAMMENFÜHRUNG zu einem einzigen Verdikt mit
   Exit-Code, und der Fassungsvergleich als PUBLIKATIONS-Vorprüfung (bisher
   existierte er nur als Bestands-Einbett-Logik beim Bürger, nie als eigener
   Prüfschritt vor dem Verteilen).

   WOFÜR DIESES VERDIKT NICHT STEHT — ausdrücklich in JEDEM Ergebnis mitgeführt
   (`grenzen`), nicht nur hier dokumentiert:
     - Fachliche Richtigkeit und Aktualität der Rechtslage des Inhalts.
     - Reale Identität des Anbieters — die Signaturkette bestätigt, dass die
       Einreichung vom Besitzer des Schlüssels für DIESE Anbieterkennung
       stammt, nicht dass die Kennung real zu der genannten Institution gehört
       (diese Bindung entsteht bei der Ausstellung, außerhalb dieses Codes).
     - Sinnhaftigkeit des Zuschnitts über strukturelle Verdachtsmomente hinaus
       (Erzeuger-Warnungen wie „keine Pflichtfelder" sind ein schwaches Signal,
       keine semantische Prüfung).

   FASSUNGSVERGLEICH, DREI FÄLLE (Auflage 3):
     a) keine Vorgängerfassung übergeben → `mensch-noetig`, ausdrücklich als
        „Erstprüfung, kein Vergleich möglich" benannt. Ein erstmals gesehenes
        Modul hat keinen Bestand, gegen den ein Verdikt automatisch tragen
        könnte — dieselbe konservative Grundregel wie überall in diesem
        Werkzeug, hier auf den Randfall „nichts zum Vergleichen" angewandt.
     b) `moduleVersion` echt höher (`modulFassungEntscheiden` → 'aktualisiert')
        → Vergleich läuft, kann bei sonst sauberem Befund `automatisch-sicher`
        ergeben.
     c) `moduleVersion` gleich oder niedriger (→ 'aeltere-fassung') → KEIN
        Werkzeug-Fehler, ein BEFUND (Rücknahme oder Verwechslung) —
        `mensch-noetig`, Grund im Klartext.

   ANBIETERWECHSEL (Auflage 4): ändert sich Register-Typ, Kennung
   (`reg.kennung`) oder Anbieter (`_modulAnbieterKennung`) zwischen den beiden
   Fassungen, ist das NIE automatisch sicher — legitimer Herausgeberwechsel und
   Übernahme sehen für dieses Werkzeug identisch aus, ein Mensch muss den
   Unterschied sehen. Ist eine Fassung erst verteilt, holt sie niemand zurück —
   das ist die Einbahnstraße, die dieses Werkzeug bewacht.

   Aufruf:
     node tools/modulpruefung-ampel.js (zwei eingebaute Fixtures)
     node tools/modulpruefung-ampel.js --vorlage <pfad> (Erstprüfung)
     node tools/modulpruefung-ampel.js --vorlage <neu> --vorherige <alt> (Fassungsvergleich)
   Exit-Code: 0 nur bei `automatisch-sicher`. Jeder andere Fall (inkl. jedes
   nicht abgefangenen Fehlers) beendet mit Exit 1 — das Verdikt-Objekt selbst
   steht als JSON auf stdout.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const { ladeKern, webcrypto } = require(path.join(REPO, 'tests', 'load-kern.js'));
const { ausModulEinlassen } = require(path.join(REPO, 'tools', 'einreichung-auffaelligkeiten-sammeln.js'));

const GRENZEN = Object.freeze([
  'keine fachliche Pruefung des Inhalts, keine Aktualitaets-Pruefung der Rechtslage',
  'keine Pruefung der realen Anbieter-Identitaet ueber die Signaturkette hinaus — die Kette bestaetigt den Schluesselbesitz fuer die genannte Kennung, nicht die reale Zugehoerigkeit der Institution',
  'kein semantisches Urteil ueber die Sinnhaftigkeit des Feld-Zuschnitts — nur strukturelle Verdachtsmomente aus dem Erzeuger fliessen ein',
]);

// EIN Depot als reines Prüf-Substrat — niemals gespeichert, niemals verlassen diese Funktion.
async function _leeresPruefDepot(V) {
  await V.depotAnlegen('modulpruefung-ampel-scratch-' + Math.random().toString(36).slice(2));
  V.akteurSelbstErklaeren('Modulprüfung-Ampel');
  return V.getData();
}

/* Prüft EIN Bündel über den echten, signierten Einlassweg, gegen ein GEGEBENES Ziel-Depot (statt
   immer ein frisches) — nur so sieht `modulEinlassen` eine zuvor bereits eingebettete
   Vorgängerfassung im selben Slot und berechnet den Fassungsvergleich SELBST
   (`_letzteFassungsEntscheidung` → `raus.fassung`/`fassungVon`/`fassungNach`). Keine eigene
   Nachbildung dieser Logik — genau die Wiederverwendung, die der Auftrag verlangt. Wirft nie —
   ein nicht abgefangener Fehler MUSS als `mensch-noetig` landen. */
async function _pruefeBuendelGegen(V, ziel, rohText, opts) {
  try {
    const raus = await V.modulEinlassenGeprueft(rohText, ziel, opts || {});
    const zeilen = ausModulEinlassen(raus);
    return { ok: true, raus, zeilen };
  } catch (e) {
    return { ok: false, fehler: String((e && e.message) || e) };
  }
}

function _neuesVerdikt() {
  // Startzustand ist IMMER mensch-noetig — `automatisch-sicher` wird nie durch Auslassung
  // erreicht, nur durch eine ausdrückliche, positive Zuweisung ganz am Ende der Prüfung.
  return { verdikt: 'mensch-noetig', gruende: [], grenzen: GRENZEN.slice() };
}

/**
 * Prüft eine Einreichung (optional gegen eine Vorgängerfassung) und liefert EIN Verdikt.
 * @param {string} rohNeuText - rohes JSON der neuen Einreichung (signiertes Bündel).
 * @param {string|null} rohVorherigeText - rohes JSON der zuvor akzeptierten Fassung, oder null.
 * @param {object} [opts] - optionaler Anker-Override, ausschließlich für Fixtures/Tests.
 */
async function pruefeEinreichung(rohNeuText, rohVorherigeText, opts) {
  const { V } = ladeKern();
  const verdikt = _neuesVerdikt();
  const ziel = await _leeresPruefDepot(V);

  // Kein Vorgänger: Erstprüfung. Konservativ — Auflage 3, Fall a: kein Bestand, gegen den ein
  // Verdikt automatisch tragen könnte, darum IMMER mensch-noetig, nie durchgewunken, weil
  // „nichts zu vergleichen war" kein Sicherheitsbeleg ist.
  let altKennung = null, altAnbieter = null, altTyp = null;
  if (rohVorherigeText != null) {
    const alt = await _pruefeBuendelGegen(V, ziel, rohVorherigeText, opts);
    if (!alt.ok || !alt.raus || alt.raus.angenommen !== true) {
      verdikt.gruende.push('die als „vorherige Fassung" übergebene Datei ist selbst nicht gültig — kein verlässlicher Vergleichspunkt: '
        + (alt.fehler || (alt.raus && alt.raus.grund) || 'unbekannt'));
      return verdikt;
    }
    altKennung = alt.raus.kennung; altAnbieter = alt.raus.anbieterId; altTyp = alt.raus.typ;
  }

  const neu = await _pruefeBuendelGegen(V, ziel, rohNeuText, opts);
  if (!neu.ok) {
    verdikt.gruende.push('Fehler beim Prüfen der neuen Einreichung: ' + neu.fehler);
    return verdikt;
  }
  if (!neu.raus) {
    verdikt.gruende.push('keine Rückgabe vom Einlassweg — konservativ als ungeklärt behandelt.');
    return verdikt;
  }
  if (neu.raus.grund === 'aeltere-fassung') {
    // Auflage 3, Fall c — KEIN Werkzeug-Fehler, ein Befund: Rücknahme oder Verwechslung.
    verdikt.gruende.push('moduleVersion ist nicht höher als die Vorgängerfassung (vorher ' + neu.raus.fassungVon
      + ', jetzt ' + neu.raus.fassungNach + ') — das ist eine Rücknahme oder eine Verwechslung, kein Aktualisierungsfall.');
    return verdikt;
  }
  if (neu.raus.angenommen !== true) {
    verdikt.gruende.push('neue Einreichung nicht angenommen: ' + (neu.raus.grund || 'unbekannter Grund'));
    for (const z of neu.zeilen) verdikt.gruende.push('  · ' + z.schwere + ' (' + z.quelle + '): ' + z.grund + (z.fundstelle ? ' @ ' + z.fundstelle : ''));
    return verdikt;
  }
  if (neu.zeilen.length) {
    verdikt.gruende.push('neue Einreichung wirft strukturelle Auffälligkeiten:');
    for (const z of neu.zeilen) verdikt.gruende.push('  · ' + z.schwere + ' (' + z.quelle + '): ' + z.grund + (z.fundstelle ? ' @ ' + z.fundstelle : ''));
    return verdikt;
  }

  if (rohVorherigeText == null) {
    verdikt.gruende.push('Erstprüfung, keine Vorgängerfassung übergeben — kein Fassungsvergleich möglich, darum kein automatisches Verdikt.');
    return verdikt;
  }

  // Ab hier gibt es eine Vorgängerfassung. `fassung` kam vom ECHTEN Einbett-Weg
  // (_einbettenMitFassung → modulFassungEntscheiden) — 'neu' heißt: der Weg hat KEINE
  // Übereinstimmung mit der soeben eingebetteten Vorgängerfassung gefunden. Das ist niemals
  // automatisch sicher (Auflage 4) — explizit benannt, woran es lag.
  if (neu.raus.fassung !== 'aktualisiert') {
    if (neu.raus.typ !== altTyp) {
      verdikt.gruende.push('Register-Typ weicht ab: vorher „' + altTyp + '", jetzt „' + neu.raus.typ + '" — keine Fassung desselben Moduls.');
    } else if (neu.raus.kennung !== altKennung) {
      verdikt.gruende.push('Kennung weicht ab: vorher „' + altKennung + '", jetzt „' + neu.raus.kennung + '" — keine Fassung desselben Moduls.');
    } else if (neu.raus.anbieterId !== altAnbieter) {
      verdikt.gruende.push('Anbieter-Kennung weicht zwischen den Fassungen ab (vorher „' + (altAnbieter || '(keine)')
        + '", jetzt „' + (neu.raus.anbieterId || '(keine)') + '") — Herausgeberwechsel oder Übernahme, ein Mensch muss entscheiden.');
    } else {
      verdikt.gruende.push('Fassungsvergleich meldet „' + neu.raus.fassung + '" statt „aktualisiert" — konservativ als ungeklärt behandelt.');
    }
    return verdikt;
  }

  // Einzige Stelle im ganzen Werkzeug, die `automatisch-sicher` vergibt — jede Bedingung oben
  // muss diese Zeile ausdrücklich erreichen, keine fällt hierher durch.
  verdikt.verdikt = 'automatisch-sicher';
  verdikt.gruende.push('Signaturkette gültig, Struktur ohne Auffälligkeit, moduleVersion ' + neu.raus.fassungVon
    + ' → ' + neu.raus.fassungNach + ', Register-Typ/Kennung/Anbieter unverändert.');
  return verdikt;
}

/* Wegwerf-Sentinel-Anker, Wegwerf-Anbieter-Schlüssel — derselbe Aufbau wie
   tests/modul-einlassen-geprueft.test.js, hier wiederverwendet statt neu erfunden. KEY tabu:
   diese Schlüssel sind reine Testfixtur, nie Produktionsmaterial, und dieses Werkzeug signiert
   an keiner anderen Stelle irgendetwas — nur hier, zum Bau der eigenen Prüf-Fixturen. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const FIXTUR_JETZT = '2026-09-04T00:00:00Z';
const FIXTUR_OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: FIXTUR_JETZT });

async function _signiertesFixturBuendel(V, anbieterPrivJwk, anbieterPubJwk, anbieterId, modul) {
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Ampel-Fixture-Anbieter', publicKeyJwk: anbieterPubJwk },
  };
  const key = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const providerCredentialJws = await V._signJWS(cert, key, {});
  const anbieterKey = await V._jwsImportSignKey(anbieterPrivJwk);
  const modulSignaturJws = await V._signJWS(modul, anbieterKey, {});
  return JSON.stringify({ providerCredentialJws, modulSignaturJws });
}

/* Zwei Fixturen, wie Auflage 5 verlangt — nicht eine: eine, die sauber durchgeht, eine, die
   auffällt. Beide echt signiert (derselbe Sentinel-Anker), damit `automatisch-sicher`
   tatsächlich erreichbar ist und nicht nur theoretisch existiert. */
async function fixturen() {
  const { V } = ladeKern();
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const REGISTER = 'einlass-register-bereich-modul-ampel-fixture';

  const modulV1 = { modulTyp: 'bereich', moduleVersion: 1, herkunft: REGISTER, sprache: 'de', bereiche: { 'ampel-fixture-rubrik': { label: 'Ampel-Fixture-Rubrik' } } };
  const modulV2 = { modulTyp: 'bereich', moduleVersion: 2, herkunft: REGISTER, sprache: 'de', bereiche: { 'ampel-fixture-rubrik': { label: 'Ampel-Fixture-Rubrik, Fassung 2' } } };
  const modulV2Fremdschluessel = { modulTyp: 'bereich', moduleVersion: 2, herkunft: REGISTER, sprache: 'de', bereiche: { 'ampel-fixture-rubrik': { label: 'X' } }, boeserSchluessel: 'x' };

  const vorherige = await _signiertesFixturBuendel(V, privJwk, pubJwk, 'institution/ampel-fixture', modulV1);
  const sauberesUpdate = await _signiertesFixturBuendel(V, privJwk, pubJwk, 'institution/ampel-fixture', modulV2);
  const auffaelligesUpdate = await _signiertesFixturBuendel(V, privJwk, pubJwk, 'institution/ampel-fixture', modulV2Fremdschluessel);

  return [
    { label: 'sauberes Update (v1 → v2, signiert, derselbe Anbieter) — erwartet automatisch-sicher', neu: sauberesUpdate, vorherige, opts: FIXTUR_OPTS },
    { label: 'Auffälligkeit (unbekannter Schlüssel im Modul) — erwartet mensch-noetig', neu: auffaelligesUpdate, vorherige, opts: FIXTUR_OPTS },
  ];
}

async function main() {
  const argVorlage = process.argv.indexOf('--vorlage');
  const argVorherige = process.argv.indexOf('--vorherige');
  let laeufe;
  if (argVorlage !== -1 && process.argv[argVorlage + 1]) {
    const rohNeu = fs.readFileSync(process.argv[argVorlage + 1], 'utf8');
    const rohAlt = (argVorherige !== -1 && process.argv[argVorherige + 1])
      ? fs.readFileSync(process.argv[argVorherige + 1], 'utf8') : null;
    // Ausschliesslich fuer die eigene Testsuite: zwingt den Anker-Override auf den Sentinel-
    // Anker, damit ein echter Prozess-Exit-Code gegen echt signierte Fixtur-Buendel geprueft
    // werden kann (Auflage 1). Nie in einem echten Lauf gesetzt — kein CLI-Schalter, nur eine
    // Umgebungsvariable mit unverwechselbarem Namen, die niemand versehentlich mitschleppt.
    const opts = process.env.MODULPRUEFUNG_AMPEL_TEST_SENTINEL_ANKER === '1' ? FIXTUR_OPTS : {};
    laeufe = [{ label: process.argv[argVorlage + 1], neu: rohNeu, vorherige: rohAlt, opts }];
  } else {
    laeufe = await fixturen();
  }
  let alleSicher = true;
  for (const lauf of laeufe) {
    const verdikt = await pruefeEinreichung(lauf.neu, lauf.vorherige, lauf.opts);
    console.log('══ ' + lauf.label);
    console.log(JSON.stringify(verdikt, null, 2));
    if (verdikt.verdikt !== 'automatisch-sicher') alleSicher = false;
  }
  process.exit(alleSicher ? 0 : 1);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { pruefeEinreichung, fixturen, GRENZEN, SENTINEL_PUBLIC_JWK, FIXTUR_OPTS };
