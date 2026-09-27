#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   feld-eigenschaften-rundlauf-messen.js — welche Feld-Eigenschaften, die der
   Kern versteht, überstehen die Strecke Feldliste → Generator-Paket
   (baueSubmissionSigniert) → Issuer mit Test-Anker → Kern? (Auftrag,
   Messung, 16.09.2026 — Hintergrund: heute fielen im Generator englische
   Feldnamen und Verweise beim Paketbau weg, dieser Auftrag schließt diese Risse)
   ────────────────────────────────────────────────────────────────────────────
   DIE EIGENSCHAFTSLISTE KOMMT AUS DEM KERN, NICHT AUS EINER HANDLISTE:
   `_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL` in vivodepot.html ist bereits die EINE
   Quelle für „was `_templateFeldZuModell` liest" (ihr eigener Kopf-Kommentar
   sagt das wörtlich) — dieses Werkzeug liest sie über `tests/load-kern.js`
   zur LAUFZEIT aus dem geladenen Kern, tippt sie nicht ab. Jede künftige
   Eigenschaft, die der Kern lernt, erscheint hier ohne Änderung an diesem
   Werkzeug.

   DIE STRECKE, EIN LAUF JE EIGENSCHAFT:
     1. Feldliste       ein rohes Feld-Objekt mit GENAU der einen Eigenschaft
                        gesetzt (plus dem Minimum: feldname/feldtyp/bereich)
     2. Generator-Paket  `GEN.baueSubmissionSigniert(state, anbieterPriv)` —
                        derselbe Weg wie im echten Erzeuger (Komponente 4)
     3. Issuer mit Test-Anker  ein Anbieter-Zertifikat, signiert mit einem
                        FESTEN Test-Schlüsselpaar (SENTINEL, unten — identisch
                        zu tests/vorlage-provisionierung-k9-u2-adr-404.test.js),
                        gegen das der Kern mit `opts.ankerJwk` prüft — genau der
                        Weg, den ein echtes, TA-signiertes Anbieter-Zertifikat
                        nimmt, nur mit einem Test- statt Produktiv-Schlüssel.
     4. Kern             `V.vorDepotKonfigurationAnwenden` + `depotAnlegen` —
                        das Ergebnis steht in `V.getData().feldDefinitionen`.

   WAS „ÜBERLEBT" HEISST: die Eigenschaft (ggf. unter ihrem im Kern
   UMBENANNTEN Namen — `gruppe`→`abschnitt`, `hilfetext`→`hint`,
   `codeSystem`→`codeSystemId`, `feldname`-Sprachvariante→`beschriftungen`,
   je eigens geprüft, s. PRUEFUNG unten) steht MIT DEM GESETZTEN WERT in der
   finalen Feld-Definition. Alles andere ist ein Verlust, benannt mit der
   STATION, an der er auftritt:
     verloren-generator   `_normalisiereFeldRein` kennt den Schlüssel nicht
                          (fehlt in `FELD_BEKANNTE_SCHLUESSEL`) — die
                          Eigenschaft verschwindet schon im Paket
     feld-verworfen-kern  der Schlüssel erreicht den Kern, steht aber NICHT in
                          `_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL` — der Kern
                          verwirft dafür NICHT nur die Eigenschaft, sondern
                          das GANZE Feld („unbekannte-eigenschaft")
     verloren-kern        der Schlüssel ist im Kern bekannt (übersteht das
                          Gate), aber `_templateFeldZuModell` kopiert ihn
                          trotzdem nicht in `def` (kein `if (g.xyz…)`-Zweig)

   ZWEITE, KLEINERE MESSUNG (GENERATOR_NUR): vier Eigenschaften, die der
   GENERATOR kennt (`FELD_BEKANNTE_SCHLUESSEL`), die aber NICHT in
   `_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL` stehen — `ziel`, `quelle`,
   `depotSchema`, `kennung`. Ein Feld, das eine davon trägt, kommt sauber
   signiert im Paket an und wird vom Kern beim Übersetzen KOMPLETT verworfen
   (nicht nur die Eigenschaft — das ganze Feld, „unbekannte-eigenschaft").
   `ziel` ist die Adresse eines `feldtyp: 'verweis'`-Felds — GENAU der
   „Verweis"-Verlust aus dem Auftrag.

   AUFRUF
     node tools/feld-eigenschaften-rundlauf-messen.js
     node tools/feld-eigenschaften-rundlauf-messen.js --bericht <pfad.md>
   KERN_HTML_PATH / GENERATOR_HTML_PATH (Umgebungsvariablen, wie
   tests/load-kern.js / tests/load-generator.js sie lesen) lenken auf andere
   Fassungen um, ohne dieses Werkzeug zu ändern.
   ════════════════════════════════════════════════════════════════════════════ */

const path = require('node:path');
const fs = require('node:fs');

const { ladeKern, webcrypto } = require('../tests/load-kern.js');
const { ladeGenerator } = require('../tests/load-generator.js');

/* Test-Anker — FESTES Schlüsselpaar, NIE produktiv, wörtlich identisch zu
   SENTINEL_PRIVATE_JWK/SENTINEL_PUBLIC_JWK in
   tests/vorlage-provisionierung-k9-u2-adr-404.test.js (dieselbe Rolle: Ersatz
   für die echte Treuhand-Anbieter-Signatur, gegen die der Kern mit
   `opts.ankerJwk` prüft). Wörtlich wiederverwendet, nicht zweimal erfunden. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-09-16T00:00:00Z';

function baueCert(publicKeyJwk, anbieterId) {
  const cs = { anbieterId, anbieterName: 'Rundlauf-Test GmbH', anbieterTyp: 'institution/test', publicKeyJwk };
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2030-01-01T00:00:00Z',
    credentialSubject: cs,
  };
}

function gueltigeStammdaten() {
  return {
    anbieterName: 'Rundlauf-Test GmbH', rechtsform: 'GmbH', strasse: 'Teststraße 1', plz: '12345', ort: 'Teststadt',
    land: 'Deutschland', kontaktName: 'Test Kontakt', kontaktFunktion: 'Testleitung', kontaktEmail: 'test@rundlauf.example',
    kontaktTelefon: '+49 30 1234567', bereich: 'health', useCase: 'x'.repeat(60),
  };
}

/* ── EIN Rundlauf: ein rohes Feld → Generator → Test-Anker-Issuer → Kern ──── */
async function rundlauf(GEN, felder, laufId) {
  const anbieterKp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const anbieterPriv = await webcrypto.subtle.exportKey('jwk', anbieterKp.privateKey);
  const anbieterPub = await webcrypto.subtle.exportKey('jwk', anbieterKp.publicKey);
  const anbieterId = 'test/rundlauf-' + laufId;

  const anbieter = GEN.baueAnbieter(gueltigeStammdaten());
  const state = {
    anbieter, publicKeyJwk: anbieterPub, felder,
    wortlaut: 'Rundlauf-Testwortlaut.',
    wortlautQuelle: { behoerde: 'Rundlauf-Test GmbH', titel: 'Rundlauf-Vorlage ' + laufId, lizenz: 'eigenes Werk der Rundlauf-Test GmbH' },
    vorlageId: 'rundlauf-' + laufId, version: 1,
  };
  // Station 2 — Generator-Paket.
  const paket = await GEN.baueSubmissionSigniert(state, anbieterPriv);
  const nachGenerator = paket.templates[0].felder[0];
  const templateJws = paket.templatesJws[0];

  const { V } = ladeKern();   // frischer Kern-Kontext je Lauf — kein Zustand leckt zwischen Läufen
  // Station 3 — Issuer mit Test-Anker: Cert MUSS den Submission-Public-Key tragen
  // (paket.publicKeyJwk, nicht den rohen WebCrypto-Export — sonst schlägt die
  // Template-Signaturprüfung fehl, weil publicJwkFuerSubmission die Formen normalisiert).
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const certJws = await V._signJWS(baueCert(paket.publicKeyJwk, anbieterId), sentinelSign, {});
  const opts = { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws };

  // Station 4 — Kern.
  await V.vorDepotKonfigurationAnwenden([certJws], null, opts);
  await V.depotAnlegen('rundlauf-' + laufId + '-pw');
  V.akteurSelbstErklaeren('Rundlauf-Test');
  const berichte = V._vorDepotVorlagenZertifikateBerichte();
  const bericht = (berichte && berichte[0]) || null;
  const defs = V.getData().feldDefinitionen || [];
  const situationDefs = V.getData().situationFeldDefinitionen || [];

  return { nachGenerator, defs, situationDefs, bericht };
}

/* Rundlauf-Variante mit einer manipulierten Zwischen-Nutzlast — für den
   Rot-Beweis (Zug 2 des Auftrags: „eine gepflanzte Eigenschaft, die im Paket
   absichtlich gestrichen wird, muss als Verlust erscheinen"). Signiert wird
   die MANIPULIERTE Nutzlast, nicht die echte — der Verlust entsteht also
   NACH dem Generator-Schritt, genau wie eine echte Übertragungslücke. */
async function rundlaufMitEingriff(GEN, felder, laufId, eingriff) {
  const anbieterKp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const anbieterPriv = await webcrypto.subtle.exportKey('jwk', anbieterKp.privateKey);
  const anbieterPub = await webcrypto.subtle.exportKey('jwk', anbieterKp.publicKey);
  const anbieterId = 'test/rundlauf-' + laufId;
  const anbieter = GEN.baueAnbieter(gueltigeStammdaten());
  const state = {
    anbieter, publicKeyJwk: anbieterPub, felder,
    wortlaut: 'Rundlauf-Testwortlaut.',
    wortlautQuelle: { behoerde: 'Rundlauf-Test GmbH', titel: 'Rundlauf-Vorlage ' + laufId, lizenz: 'eigenes Werk der Rundlauf-Test GmbH' },
    vorlageId: 'rundlauf-' + laufId, version: 1,
  };
  const paket = await GEN.baueSubmissionSigniert(state, anbieterPriv);
  const manipuliert = eingriff(JSON.parse(JSON.stringify(paket.templates[0])));

  const { V } = ladeKern();
  const signKey = await V._jwsImportSignKey(anbieterPriv);
  const templateJws = await V._signJWS(manipuliert, signKey, {});
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const certJws = await V._signJWS(baueCert(paket.publicKeyJwk, anbieterId), sentinelSign, {});
  const opts = { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws };
  await V.vorDepotKonfigurationAnwenden([certJws], null, opts);
  await V.depotAnlegen('rundlauf-' + laufId + '-pw');
  V.akteurSelbstErklaeren('Rundlauf-Test');
  const defs = V.getData().feldDefinitionen || [];
  return { nachGenerator: manipuliert.felder[0], defs };
}

/* ── Die Eigenschafts-Tabelle ───────────────────────────────────────────────
   `pruefeGenerator`/`pruefeKern` liefern den ÜBERLEBTEN Wert oder `undefined`
   — Default ist derselbe Schlüssel, benannte Ausnahmen für die Umbenennungen,
   die der Kern vornimmt (gruppe→abschnitt, hilfetext→hint, codeSystem→
   codeSystemId, unterFelder→unterFelder[].label/…). */
function schluesselCheck(schluessel) {
  return (obj) => (obj && Object.prototype.hasOwnProperty.call(obj, schluessel) ? obj[schluessel] : undefined);
}

const EIGENSCHAFTEN = [
  { schluessel: 'pflicht', roh: { pflicht: true }, kern: (d) => d.pflicht },
  { schluessel: 'gruppe', roh: { gruppe: 'TestGruppe' }, kern: (d) => d.abschnitt,
    hinweis: 'im Kern umbenannt zu "abschnitt"' },
  { schluessel: 'mehrzeilig', roh: { mehrzeilig: true }, kern: schluesselCheck('mehrzeilig') },
  { schluessel: 'marken', roh: { marken: ['test-marke'] }, kern: (d) => (Array.isArray(d.marken) ? d.marken[0] : undefined) },
  { schluessel: 'sensibel', roh: { sensibel: true }, kern: schluesselCheck('sensibel') },
  { schluessel: 'einheit', roh: { einheit: 'mg' }, kern: schluesselCheck('einheit') },
  { schluessel: 'referenzbereich', roh: { referenzbereich: '3.5-5.0' }, kern: schluesselCheck('referenzbereich') },
  { schluessel: 'warnWennJa', roh: { warnWennJa: true }, kern: schluesselCheck('warnWennJa') },
  { schluessel: 'mitMessdatum', roh: { mitMessdatum: true }, kern: schluesselCheck('mitMessdatum') },
  { schluessel: 'pruefIntervallMonate', roh: { pruefIntervallMonate: 12 }, kern: schluesselCheck('pruefIntervallMonate'),
    hinweis: 'Erzeuger-Oberfläche bietet das laut Kern-Kommentar noch keine Eingabe an' },
  { schluessel: 'verborgenWenn', roh: { verborgenWenn: { feld: 'irgendeinFeld', wert: 'x' } },
    kern: (d) => d.verborgenWenn && d.verborgenWenn.feld },
  { schluessel: 'unterFelder', roh: { unterFelder: [{ feldname: 'Unterfeld-1', feldtyp: 'text' }] },
    kern: (d) => Array.isArray(d.unterFelder) && d.unterFelder[0] && d.unterFelder[0].label,
    hinweis: 'geprüft über unterFelder[0].label' },
  { schluessel: 'hilfetext', roh: { hilfetext: 'Ein Hilfetext' }, kern: (d) => d.hint,
    hinweis: 'im Kern umbenannt zu "hint"' },
  { schluessel: 'codeSystem+codeWerte', roh: { feldtyp: 'auswahl', codeSystem: 'loinc', codeWerte: [{ code: 'X', anzeige: 'X-Anzeige' }] },
    kern: (d) => d.codeSystemId && d.codeWerte && d.codeWerte[0] && d.codeWerte[0].anzeigeName,
    hinweis: 'codeSystem→codeSystemId, codeWerte[].anzeige→codeWerte[].anzeigeName; feldtyp auf "auswahl" gesetzt' },
  { schluessel: 'provenienzPflichtig', roh: { provenienzPflichtig: false }, kern: schluesselCheck('provenienzPflichtig'),
    hinweis: 'Kern-Kommentar nennt sie ausdrücklich "schema-legal, heute NICHT verdrahtet" (A345)' },
  { schluessel: 'entitaet', roh: { entitaet: 'person' }, kern: schluesselCheck('entitaet') },
  { schluessel: 'rolle', roh: { rolle: 'Betreuer' }, kern: schluesselCheck('rolle') },
  { schluessel: 'verweisZweck', roh: { verweisZweck: 'kontakt' }, kern: schluesselCheck('verweisZweck') },
  { schluessel: 'beispiel', roh: { beispiel: 'Ein Beispieltext' }, kern: schluesselCheck('beispiel') },
  { schluessel: 'ebene', roh: { ebene: 'haupt' }, kern: schluesselCheck('ebene') },
  { schluessel: 'eingabeTyp', roh: { eingabeTyp: 'zahl' }, kern: schluesselCheck('eingabeTyp') },
  { schluessel: 'inputmode', roh: { inputmode: 'numeric' }, kern: schluesselCheck('inputmode') },
  { schluessel: 'vorschlaege', roh: { vorschlaege: ['a', 'b'] }, kern: (d) => Array.isArray(d.vorschlaege) && d.vorschlaege[0] },
  { schluessel: 'keineZukunft', roh: { keineZukunft: true }, kern: schluesselCheck('keineZukunft') },
  { schluessel: 'datumJahrMin', roh: { datumJahrMin: 1900 }, kern: schluesselCheck('datumJahrMin') },
  { schluessel: 'gueltigkeitVorschlag', roh: { gueltigkeitVorschlag: { ausFeld: 'irgendeinFeld', regel: 'plus30' } },
    kern: (d) => d.gueltigkeitVorschlag && d.gueltigkeitVorschlag.ausFeld },
  { schluessel: 'fristRegel', roh: { fristRegel: { dauer: 30, quelle: 'ausstellung' } },
    kern: (d) => d.fristRegel && d.fristRegel.dauer },
  { schluessel: 'codeListe', roh: { codeListe: 'test-liste' }, kern: schluesselCheck('codeListe') },
  { schluessel: 'art', roh: { art: 'test-art' }, kern: schluesselCheck('art') },
  { schluessel: 'verweisKontextFeld', roh: { verweisKontextFeld: 'kontextfeld' }, kern: schluesselCheck('verweisKontextFeld') },
  { schluessel: 'zusammenfassungFelder', roh: { zusammenfassungFelder: ['a', 'b'] },
    kern: (d) => Array.isArray(d.zusammenfassungFelder) && d.zusammenfassungFelder[0] },
  { schluessel: 'mitGeburt', roh: { mitGeburt: true }, kern: schluesselCheck('mitGeburt') },
  { schluessel: 'unterdrueckeInZusammenfassungWennGesetzt', roh: { unterdrueckeInZusammenfassungWennGesetzt: 'leer' },
    kern: schluesselCheck('unterdrueckeInZusammenfassungWennGesetzt') },
  { schluessel: 'sichtbarWenn', roh: { sichtbarWenn: { feld: 'irgendeinFeld', wert: 'x' } },
    kern: (d) => d.sichtbarWenn && d.sichtbarWenn.feld },
];
// `_vorlageVersion` wird NICHT vom rohen Feld gelesen, sondern beim Übersetzen aus
// `template.version` synthetisiert — kein per-Feld-Rundlauf, eigene Prüfung unten.
// `situation` ist strukturell exklusiv zu `bereich` (genau eins von beiden) — eigene Prüfung unten.
// `feldname` als Sprachvariante — eigene Prüfung unten (der Auftrags-Anlass selbst).

/* Vier Eigenschaften, die der GENERATOR kennt (FELD_BEKANNTE_SCHLUESSEL), aber die
   NICHT in _TEMPLATE_FELD_BEKANNTE_SCHLUESSEL stehen — ein Feld, das eine davon
   trägt, wird vom Kern GANZ verworfen ("unbekannte-eigenschaft"), nicht nur die
   Eigenschaft. `ziel` ist die Verweis-Adresse (feldtyp 'verweis') — der zweite,
   im Auftrag genannte Verlust. */
const GENERATOR_NUR = [
  { schluessel: 'ziel', roh: { feldtyp: 'verweis', ziel: 'https://beispiel.de/nachweis' }, kern: schluesselCheck('ziel') },
  { schluessel: 'quelle', roh: { quelle: 'neu' }, kern: schluesselCheck('quelle') },
  { schluessel: 'depotSchema', roh: { depotSchema: { typ: 'einfach', sektor: 'identity', feld: 'irgendeinFeld' } }, kern: schluesselCheck('depotSchema') },
  { schluessel: 'kennung', roh: { kennung: 'identity.givenName' }, kern: schluesselCheck('kennung') },
];

function minimalesFeld(zusatz, laufId) {
  return Object.assign({ feldname: 'Testfeld-' + laufId, feldtyp: 'text', bereich: 'identity', pflicht: false }, zusatz);
}

async function messeEigenschaft(GEN, eig, index) {
  const roh = minimalesFeld(eig.roh, 'e' + index);
  const { nachGenerator, defs } = await rundlauf(GEN, [roh], 'e' + index);
  const ueberlebtGenerator = eig.schluessel.split('+').every((teil) => Object.prototype.hasOwnProperty.call(nachGenerator, teil));
  if (!ueberlebtGenerator) return { ...eig, station: 'verloren-generator', wertKern: undefined };
  const def = defs[0];
  if (!def) return { ...eig, station: 'feld-verworfen-kern', wertKern: undefined };
  const wertKern = eig.kern(def);
  const ueberlebtKern = wertKern !== undefined && wertKern !== false && wertKern !== null && wertKern !== '';
  return { ...eig, station: ueberlebtKern ? 'ueberlebt' : 'verloren-kern', wertKern };
}

async function messeGeneratorNur(GEN, eig, index) {
  const roh = minimalesFeld(eig.roh, 'g' + index);
  const { nachGenerator, defs, bericht } = await rundlauf(GEN, [roh], 'g' + index);
  const ueberlebtGenerator = Object.prototype.hasOwnProperty.call(nachGenerator, eig.schluessel);
  const def = defs[0];
  const verworfen = bericht && Array.isArray(bericht.defVerworfen) ? bericht.defVerworfen : [];
  return {
    schluessel: eig.schluessel, ueberlebtGenerator,
    // 'ueberlebt' seit dem Kern-Nachtrag 16.09.2026 (ziel ist im Kern bekannt) — vorher hiess es 'unerwartet'.
    station: !ueberlebtGenerator ? 'verloren-generator' : (def && eig.kern(def) !== undefined ? 'ueberlebt' : (def ? 'verloren-kern' : 'feld-verworfen-kern')),
    verworfenGrund: verworfen.length ? verworfen[0].grund : null,
  };
}

/* ── Sonderfall 1: englischer (mehrsprachiger) Feldname ────────────────────
   Der Auftrags-Anlass wörtlich: „heute fielen im Generator englische
   Feldnamen … beim Paketbau weg". Ein mehrsprachiger `feldname` ist im Kern
   ein `{sprache: text, …}`-Objekt (`_istSprachvariantenObjekt`,
   `def.beschriftungen`) — der Generator liest `roh.feldname` aber über
   `String(roh.feldname || '').trim()` (normalisiereFeldBefund), was ein
   Objekt zu "[object Object]" verkürzt, bevor es überhaupt das Paket erreicht. */
async function messeEnglischerFeldname(GEN) {
  const roh = minimalesFeld({ feldname: { de: 'Notfallkontakt', en: 'Emergency contact' } }, 'feldname-en');
  const { nachGenerator, defs } = await rundlauf(GEN, [roh], 'feldname-en');
  const nachGeneratorIstString = typeof nachGenerator.feldname === 'string';
  const def = defs[0];
  const beschriftungenDa = !!(def && def.beschriftungen && def.beschriftungen.en === 'Emergency contact');
  return {
    schluessel: 'feldname (Sprachvariante, „englischer Feldname“)',
    station: beschriftungenDa ? 'ueberlebt' : 'verloren-generator',
    detail: 'nach Generator: feldname=' + JSON.stringify(nachGenerator.feldname)
      + (nachGeneratorIstString ? ' (String-Zwang verschluckt die Sprachvarianten)' : ''),
  };
}

/* ── Sonderfall 2: `situation` statt `bereich` ─────────────────────────────
   Strukturell exklusiv zu `bereich` (genau eins von beiden pro Feld, s. Kern-
   Kommentar an `_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL`) — ein eigener Rundlauf
   mit einer echten, nativen Situations-Kennung statt eines Bereichs; ohne
   `bereich` im rohen Feld. */
async function messeSituation(GEN, V0) {
  const situationId = Object.keys(V0.SITUATION_BY_ID || {})[0];
  if (!situationId) return { schluessel: 'situation', station: 'nicht-messbar', detail: 'kein nativer Situations-Bestand gefunden' };
  const roh = { feldname: 'Testfeld-situation', feldtyp: 'text', pflicht: false, situation: situationId };
  const { nachGenerator, defs, situationDefs } = await rundlauf(GEN, [roh], 'situation');
  const ueberlebtGenerator = Object.prototype.hasOwnProperty.call(nachGenerator, 'situation');
  if (!ueberlebtGenerator) return { schluessel: 'situation', station: 'verloren-generator', detail: 'situationId=' + situationId };
  const treffer = (situationDefs || []).find((d) => d.situationId === situationId) || defs[0];
  return {
    schluessel: 'situation', station: (treffer && treffer.situationId === situationId) ? 'ueberlebt' : 'verloren-kern',
    detail: 'situationId=' + situationId + ', feldDefinitionen(bereich)=' + defs.length + ', situationFeldDefinitionen=' + (situationDefs || []).length,
  };
}

/* ── Sonderfall 3: `_vorlageVersion` ────────────────────────────────────────
   Wird NICHT vom rohen Feld gelesen — der Generator setzt `template.version`
   aus `state.version` (Vorlagen-, nicht Feld-Eigenschaft), der Kern
   synthetisiert `_vorlageVersion` je Feld erst beim Übersetzen
   (`_templateFelderUebersetzen`) daraus und schreibt sie als
   `def.vorlageVersion`. Eigener, kleiner Rundlauf statt eines Eintrags in der
   Feld-Tabelle. */
async function messeVorlageVersion(GEN) {
  const roh = minimalesFeld({}, 'vv');
  const { defs } = await rundlauf(GEN, [roh], 'vv');   // state.version=1 fest in rundlauf()
  const def = defs[0];
  const ueberlebt = def && def.vorlageVersion === 1;
  return { schluessel: '_vorlageVersion', station: ueberlebt ? 'ueberlebt' : 'verloren-kern', detail: 'def.vorlageVersion=' + (def && def.vorlageVersion) };
}

/* ── Rot-Beweis (Zug 2 des Auftrags) ────────────────────────────────────────
   Eine im Generator-Schritt VORHANDENE Eigenschaft ("gruppe") wird NACH dem
   Generator-Schritt, vor dem Signieren, aus der Nutzlast gestrichen — genau
   „im Paket absichtlich gestrichen". Die Messung MUSS das als Verlust an
   Station Kern zeigen. */
async function rotBeweis(GEN) {
  const roh = minimalesFeld({ gruppe: 'WirdGestrichen' }, 'rot');
  const { defs } = await rundlaufMitEingriff(GEN, [roh], 'rot', (tpl) => {
    delete tpl.felder[0].gruppe;
    return tpl;
  });
  const def = defs[0];
  const abschnittIstFeldname = def && def.abschnitt === def.label;   // Rückfall auf den Feldnamen (s. Kern-Code)
  return { erkanntAlsVerlust: !!abschnittIstFeldname, abschnitt: def && def.abschnitt };
}

async function main() {
  const argv = process.argv.slice(2);
  const berichtIdx = argv.indexOf('--bericht');
  const berichtPfad = berichtIdx !== -1 ? argv[berichtIdx + 1] : null;

  const { V: GEN } = ladeGenerator();
  const { V: V0 } = ladeKern();
  const kernSchluessel = [...(V0._TEMPLATE_FELD_BEKANNTE_SCHLUESSEL || [])];
  const generatorSchluessel = [...(GEN.FELD_BEKANNTE_SCHLUESSEL || [])];

  console.log('Kern kennt ' + kernSchluessel.length + ' Feld-Eigenschaften (_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL, aus dem Kern gelesen).');
  console.log('Generator kennt ' + generatorSchluessel.length + ' Feld-Eigenschaften (FELD_BEKANNTE_SCHLUESSEL).');
  const nurGenerator = generatorSchluessel.filter((s) => !kernSchluessel.includes(s) && s !== '_typRoh');
  console.log('Nur im Generator, nicht im Kern (führt zu vollständiger Feld-Verwerfung): ' + nurGenerator.join(', '));

  const ergebnisse = [];
  for (let i = 0; i < EIGENSCHAFTEN.length; i++) {
    process.stdout.write('.');
    ergebnisse.push(await messeEigenschaft(GEN, EIGENSCHAFTEN[i], i));
  }
  console.log('');

  const generatorNurErgebnisse = [];
  for (let i = 0; i < GENERATOR_NUR.length; i++) {
    generatorNurErgebnisse.push(await messeGeneratorNur(GEN, GENERATOR_NUR[i], i));
  }

  const feldnameErgebnis = await messeEnglischerFeldname(GEN);
  const situationErgebnis = await messeSituation(GEN, V0);
  const vorlageVersionErgebnis = await messeVorlageVersion(GEN);
  const rot = await rotBeweis(GEN);

  const verloren = ergebnisse.filter((e) => e.station !== 'ueberlebt');
  const verlorenGeneratorNur = generatorNurErgebnisse.filter((e) => e.station !== 'ueberlebt');

  console.log('\n═══ Ergebnis ═══');
  for (const e of ergebnisse) {
    console.log((e.station === 'ueberlebt' ? '  überlebt  ' : ('  VERLOREN  (' + e.station + ')').padEnd(28))
      + e.schluessel + (e.hinweis ? '  — ' + e.hinweis : ''));
  }
  console.log('\n  ' + feldnameErgebnis.station.toUpperCase() + '  ' + feldnameErgebnis.schluessel);
  console.log('  ' + situationErgebnis.station.toUpperCase() + '  ' + situationErgebnis.schluessel + '  — ' + situationErgebnis.detail);
  console.log('  ' + vorlageVersionErgebnis.station.toUpperCase() + '  ' + vorlageVersionErgebnis.schluessel + '  — ' + vorlageVersionErgebnis.detail);
  for (const e of generatorNurErgebnisse) {
    console.log('  ' + (e.station === 'ueberlebt' ? 'ÜBERLEBT' : e.station.toUpperCase()) + '  ' + e.schluessel
      + (e.verworfenGrund ? '  — Grund: ' + e.verworfenGrund : ''));
  }
  console.log('\nRot-Beweis (gruppe im Paket gestrichen): '
    + (rot.erkanntAlsVerlust ? 'erkannt — abschnitt fiel auf den Feldnamen zurück' : 'NICHT erkannt — Rot-Beweis fehlgeschlagen!'));

  const sonderfaelle = [feldnameErgebnis, situationErgebnis, vorlageVersionErgebnis];
  const sonderfaelleVerloren = sonderfaelle.filter((e) => e.station !== 'ueberlebt').length;
  console.log('\n' + (ergebnisse.length - verloren.length) + '/' + ergebnisse.length + ' Kern-Eigenschaften (Tabelle) überstehen die Strecke.');
  console.log((sonderfaelle.length - sonderfaelleVerloren) + '/' + sonderfaelle.length + ' Sonderfälle (Sprachvariante/situation/_vorlageVersion) überstehen die Strecke.');
  console.log(verlorenGeneratorNur.length + '/' + generatorNurErgebnisse.length + ' generator-eigene Eigenschaften kommen nicht an (Feld im Kern verworfen oder Wert nicht kopiert).');
  console.log('Verluste gesamt: ' + (verloren.length + verlorenGeneratorNur.length + (feldnameErgebnis.station !== 'ueberlebt' ? 1 : 0)));
  /* Nachtrag 16.09.2026: ein Verlust ist zulässig, wenn er auf der benannten Liste des
     Erzeugers steht (FELD_OHNE_KERN_VERBRAUCHER, je mit Grund) — und das Feld selbst ankommt. */
  const benannt = GEN.FELD_OHNE_KERN_VERBRAUCHER || {};
  const alleVerluste = verloren.map((e) => e.schluessel).concat(verlorenGeneratorNur.map((e) => e.schluessel))
    .concat(sonderfaelle.filter((e) => e.station !== 'ueberlebt').map((e) => e.schluessel));
  const ohneGrund = alleVerluste.filter((k) => !Object.prototype.hasOwnProperty.call(benannt, k));
  const feldVerworfen = verlorenGeneratorNur.filter((e) => e.station === 'feld-verworfen-kern').map((e) => e.schluessel);
  console.log('Verluste ohne benannten Grund: ' + ohneGrund.length + (ohneGrund.length ? ' (' + ohneGrund.join(', ') + ')' : ''));
  console.log('Felder, die der Kern GANZ verwirft: ' + feldVerworfen.length + (feldVerworfen.length ? ' (' + feldVerworfen.join(', ') + ')' : ''));
  for (const k of alleVerluste) if (benannt[k]) console.log('  benannt  ' + k + ' — ' + benannt[k]);

  if (berichtPfad) {
    const zeilen = [];
    zeilen.push('# Feld-Eigenschaften-Rundlauf — Feldliste → Generator-Paket → Issuer mit Test-Anker → Kern\n');
    zeilen.push('Erzeugt von `tools/feld-eigenschaften-rundlauf-messen.js`, ' + new Date().toISOString().slice(0, 10) + '.\n');
    zeilen.push('Eigenschaftsliste aus dem Kern gelesen (`_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL`, ' + kernSchluessel.length + ' Einträge), nicht aus einer Handliste.\n');
    zeilen.push('## Kern-Eigenschaften\n');
    zeilen.push('| Eigenschaft | Ergebnis | Station | Hinweis |');
    zeilen.push('|---|---|---|---|');
    for (const e of ergebnisse) {
      zeilen.push('| `' + e.schluessel + '` | ' + (e.station === 'ueberlebt' ? 'überlebt' : 'VERLOREN') + ' | ' + e.station + ' | ' + (e.hinweis || '') + ' |');
    }
    zeilen.push('| `feldname` (Sprachvariante) | ' + (feldnameErgebnis.station === 'ueberlebt' ? 'überlebt' : 'VERLOREN') + ' | ' + feldnameErgebnis.station + ' | ' + feldnameErgebnis.detail + ' |');
    zeilen.push('| `situation` | ' + (situationErgebnis.station === 'ueberlebt' ? 'überlebt' : 'VERLOREN') + ' | ' + situationErgebnis.station + ' | ' + situationErgebnis.detail + ' |');
    zeilen.push('| `_vorlageVersion` | ' + (vorlageVersionErgebnis.station === 'ueberlebt' ? 'überlebt' : 'VERLOREN') + ' | ' + vorlageVersionErgebnis.station + ' | ' + vorlageVersionErgebnis.detail + ' |');
    zeilen.push('\n## Generator-eigene Eigenschaften (nicht im Kern bekannt — verwerfen das GANZE Feld)\n');
    zeilen.push('| Eigenschaft | Ergebnis | Grund |');
    zeilen.push('|---|---|---|');
    for (const e of generatorNurErgebnisse) {
      zeilen.push('| `' + e.schluessel + '` | ' + (e.station === 'ueberlebt' ? 'überlebt' : e.station) + ' | ' + (e.verworfenGrund || '') + ' |');
    }
    zeilen.push('\n## Rot-Beweis\n');
    zeilen.push('`gruppe` nach dem Generator-Schritt aus der Nutzlast gestrichen: '
      + (rot.erkanntAlsVerlust ? 'als Verlust erkannt (abschnitt fiel auf den Feldnamen zurück).' : '**NICHT erkannt — Rot-Beweis fehlgeschlagen.**'));
    fs.writeFileSync(berichtPfad, zeilen.join('\n') + '\n', 'utf8');
    console.log('\nBericht-Rohdaten geschrieben: ' + berichtPfad);
  }
}

if (require.main === module) {
  main().catch((e) => { console.error('FEHLER:', e && e.stack || e); process.exit(1); });
}

module.exports = { EIGENSCHAFTEN, GENERATOR_NUR, rundlauf, rundlaufMitEingriff };
