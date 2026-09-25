'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Lade-Hilfe für vivodepot-template-generator.html (Komponente 4)
   ────────────────────────────────────────────────────────────────────────
   Analog zu load-issuer.js / load-kern.js: extrahiert die beiden <script>-
   Blöcke des Generators (Script 1 = VdCrypto-Block byte-identisch zum Kern;
   Script 2 = gemeinsamer JWS-Block + Submission-Schema + Validator +
   Generator-Logik + DOM-Schicht) und lädt sie in einen Node-Kontext mit echtem
   WebCrypto und einem DOM-Stub. Die HTML wird NUR GELESEN; der Export-Hook
   wird an die im Speicher zusammengefügte Quelle gehängt, nie an die Datei.
   boot() läuft nicht (Stub-document.addEventListener ist no-op).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { webcrypto } = crypto;

const REPO = path.join(__dirname, '..');
const GEN_PATH = process.env.GENERATOR_HTML_PATH
  ? path.resolve(process.env.GENERATOR_HTML_PATH)
  : path.join(REPO, 'vivodepot-template-generator.html');

// Erwarteter VdCrypto-Block-Hash (== Kern == Issuer == PORT-VERBATIM.js). Umbau „Englisch vor
// v1" (14.09.2026): zwei Kennung-Beispiele im Kopf-Kommentar mitgezogen, s. load-kern.js --
// per Block-Vertrag (tools/krypto-block-propagation-pruefen.js) auf ALLE Träger (auch Issuer/
// Teiler) durchgezogen, nicht nur die vier Umbau-Dateien.
const BLOCK_HASH_ERWARTET = '732ff4b0dc74e7ae9cce9febc8eb5cb3d8e52150775f88c80ff1f8967a8a6282';

function extrahiereScripts(html) {
  const OPEN = '<script>', CLOSE = '</script>';
  const o1 = html.indexOf(OPEN), o1e = o1 + OPEN.length;
  const c1 = html.indexOf(CLOSE, o1e);
  const o2 = html.indexOf(OPEN, c1), o2e = o2 + OPEN.length;
  const c2 = html.indexOf(CLOSE, o2e);
  if (o1 < 0 || c1 < 0 || o2 < 0 || c2 < 0) throw new Error('Konnte die beiden <script>-Blöcke nicht finden.');
  return { script1: html.slice(o1e, c1), script2: html.slice(o2e, c2) };
}
function kryptoBlock(script1) { return script1.startsWith('\n') ? script1.slice(1) : script1; }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

/* ── DOM-Stub (universelles Element via Proxy) — wie load-issuer.js ───────── */
function makeEl() {
  const store = { innerHTML: '', textContent: '', value: '', checked: false, className: '', files: [], hidden: false };
  let styleObj = null, classListObj = null;
  const noop = () => undefined;
  return new Proxy(store, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'style') { if (!styleObj) styleObj = makeEl(); return styleObj; }
      if (prop === 'classList') {
        if (!classListObj) classListObj = { add: noop, remove: noop, toggle: noop, contains: () => false };
        return classListObj;
      }
      if (prop === 'querySelector') return () => makeEl();
      if (prop === 'querySelectorAll') return () => [];
      if (prop === 'appendChild' || prop === 'removeChild') return (x) => x;
      if (prop === 'addEventListener' || prop === 'removeEventListener') return noop;
      if (prop === 'setProperty' || prop === 'removeProperty') return noop;
      if (prop === 'setAttribute' || prop === 'removeAttribute') return noop;
      if (prop === 'getAttribute') return () => null;
      if (prop === 'focus' || prop === 'click') return noop;
      return noop;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}
/* ── `getElementById` liefert `null`, wenn es die ID nicht gibt (A248, 16.08.2026) ──
   Dieselbe Schaerfung wie in `tests/load-kern.js`; die Begruendung steht dort
   ausfuehrlich. Kurz: ein Stub, der fuer JEDE ID ein Phantom liefert, macht jede
   Probe blind gegen die haeufigste DOM-Fehlerklasse, ohne dass eine davon rot wird.
   Die zwei Sentinel `__html`/`__body` bleiben ausgenommen — `documentElement` und
   `body` sind im Browser nie `null`, sie tragen nur kein id-Attribut. Genau dieser
   Punkt hat zwei fruehere Messungen (378 und 261 „blinde Proben") verdorben.
   Positivkontrolle 16.08.: Menge geleert → 0 Fehlschlaege. Die Proben dieses Harnischs schlagen KEIN Element ueber eine ID nach; die Schaerfung ist hier reine Vorsorge und aendert heute nichts. Das steht hier, damit die Null nicht als gemessene Deckung gelesen wird. */
const _VORHANDENE_IDS = new Set(
  (fs.readFileSync(GEN_PATH, 'utf8').match(/\sid="[A-Za-z0-9_-]+"/g) || [])
    .map((treffer) => treffer.slice(5, -1))
    .concat(['__html', '__body']));

function makeDocument() {
  const cache = new Map();
  const doc = {
    getElementById: (id) => {
      if (!cache.has(id)) {
        if (!_VORHANDENE_IDS.has(id)) return null;
        cache.set(id, makeEl());
      }
      return cache.get(id);
    },
    createElement: () => makeEl(),
    createTextNode: (t) => ({ nodeValue: t }),
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    get documentElement() { return doc.getElementById('__html'); },
    get body() { return doc.getElementById('__body'); },
  };
  return doc;
}

const EXPORT_HOOK = `
;globalThis.__GEN__ = {
  // Glied 10 (18.08.2026): der Textsatz erreicht auch dieses Werkzeug
  TEXTSATZ_SPRACHE_EINGEBAUT, TEXTSATZ_TEXTE_EINGEBAUT, TEXTSATZ_MARKUP_ORTE,
  textsatzModulPruefen, textsatzModulAnwenden, textsatzSpracheAktiv, textLesen,
  textsatzAufMarkupAnwenden,
  // Gemeinsamer JWS-Block
  JWS_TYP, JWS_ALG_PRIMAER, JWS_ALG_FALLBACK,
  _signJWS, _verifyJWS, _jwsImportSignKey, _jwsImportVerifyKey,
  _jwsAlgFuerKey, _jwsWebCryptoParams,
  _jwsB64uFromBytes, _jwsB64uToBytes, _jwsB64uFromString, _jwsB64uToString,
  // Schema + Validator (geteilt mit VC-Issuer)
  SUBMISSION_SCHEMA, _validateSchema,
  // Kette, Auftrag 7, Zug 5 (20.08.2026) — die zweite Ausgabeart: eine Anfrage
  ANFRAGE_SCHEMA, FELDKATALOG, anfrageFelderSuchen, anfrageFeldkatalogKennt,
  // A5 (20.08.2026): der erzeugte Torwaechter des Empfaengers und die Auskunft darueber.
  KERN_TORWAECHTER, fehlstellenAuskunft, fehlstellenSaetze,
  baueAnfrage, validiereAnfrage, pruefeAnfrage, baueAnfrageSigniert,
  anfrageAlsText, anfrageAlsLink, anfrageDateiname,
  anfrageStateLesen, anfrageRendern, anfrageTrefferRendern, anfrageGewaehltRendern, anfrageErzeugen,
  // Kette, Auftrag 8, Zug 1 (20.08.2026) — das Empfangs-Schlüsselpaar (ECDH P-256)
  erzeugeEmpfangsSchluesselpaar, anfrageSchluesselErzeugen, anfrageSchluesselBlockZeigen, anfrageSchluesselLaden,
  // Generator-Kern (DOM-frei)
  GENERATOR_WERKZEUG, GENERATOR_VERSION, BEREICHE, FELDTYPEN, FELDTYP_IDS,
  PRO_BEREICHE, FELD_ZIEL_BEREICHE,   // Nachtrag U2-ADR-289 (16.09.2026): Pro-Bereiche als benannte Feld-Ziele
  // Kennungs-Umbau (15.09.2026): alte Beschriftungen führen auf heutige Bereichs-IDs
  normBereich, bereichLabel, BEREICH_ALT_LABEL,
  // GEN1 (19.09.2026) — die Arbeitsfläche: Zweisprachigkeit, Rechtstexte, Modul-Kacheln
  L, meldungL, MELDUNG_EN, BEREICH_LABEL_EN, RECHTSFORM_EN, RECHTSTEXTE, RECHT_REIHENFOLGE, MODUL_KACHELN, katalogLabel,
  spracheFuerProbeSetzen: (s) => { LANG = s; },
  // GEN1 (19.09.2026) — der Schlüssel-Tresor und der Zustand, gegen den seine Zusicherungen gemessen werden
  SCHLUESSEL_TRESOR, SCHLUESSEL_LIMIT_MS, SCHLUESSEL_KLICK_FRIST_MS, _istSignierSchluessel, STATE, submissionErzeugen, gen1Binden, EMPFANGS_TRESOR, entwurfBauen, signiereMitTresor, paletteEintraege,
  // GEN3 — Angehörigen-Blätter
  BLATT_ICONS, BLATT_MODULTYP, BLATT_FORMAT, blattNeu, blattModulBauen, blattModulPruefen, pruefeBlatt, baueBlattSigniert, blattDateiname, blattSonderzeiger, blattZeigerBekannt, blattErzeugen,
  RECHTSFORMEN, VD_CODE_LISTEN, BEREICH_CODESYSTEME, BEISPIEL_TEMPLATES,
  codeSystemeFuerBereich, uuidV4, isoJetzt, slug, landKuerzel,
  erzeugeSchluesselpaarRoh, publicJwkFuerSubmission,
  csvZuFelder, normalisiereFeld, baueAnbieter,
  // A351 (19.08.2026) — die Meldepflicht. Die Befund-Fassungen sind mit ausgegeben,
  // damit die Probe die MELDUNG prueft und nicht eine zweite, danebenlaufende Fassung
  // davon: NICHT_ABBILDBARE_EIGENSCHAFTEN ist der Gegenstand, nicht eine Kopie.
  // (Dieser Block steht IN einem Template-Literal — kein Backtick, kein Dollar.)
  normFeldtyp, normFeldtypBefund, normalisiereFeldBefund, NICHT_ABBILDBARE_EIGENSCHAFTEN,
  felderAngleichungen, angleichSatz, FELD_BEKANNTE_SCHLUESSEL,
  // Nachtrag 16.09.2026 (alle Feld-Eigenschaften): Kern-Liste plus benannte Eigene
  GENERATOR_EIGENE_FELD_SCHLUESSEL, FELD_NICHT_DURCHGEREICHT, FELD_OHNE_KERN_VERBRAUCHER, feldnameText,
  validiereStammdaten, pruefeKonformitaet, baueSubmission,
  validiereSubmission, submissionDateiname,
  // Trust-1B Schritt 2a — Anbieter signiert das Template
  templateJwsErzeugen, baueSubmissionSigniert,
  // Schnitt 24.08.2026 (A523/Sammelvorlagen) — mehrere Vorlagen in einer Einreichung
  baueTemplateObjekt, baueSammelSubmission, baueSammelSubmissionSigniert,
  // 1E Basistemplate-Treuhand-Signatur (U2-ADR-040)
  basistemplateTreuhandSignieren, _basisInhalt, _pubAusPriv,
  // Code-Review-Fund 27./28.08.2026: zentrale Sign-dann-selbst-verifizieren-Sequenz
  _modulJwsMitSelbstpruefung,
  // EINLASS_REGISTER-Ausbau, institutionsArt (27.08.2026) — dritte Ausgabeart
  INSTITUTION_ART_EINGEBAUT, institutionsArtModulPruefen,
  baueInstitutionsArtModul, pruefeInstitutionsArt, baueInstitutionsArtSigniert,
  institutionsArtAlsText, institutionsArtDateiname,
  institutionsArtStateLesen, institutionsArtZeilenRendern, institutionsArtErzeugen,
  // 22.09.2026 — achte Ausgabeart, Sprachmodul (textsatz): der Generator prüft und gibt aus, er erzeugt nicht
  sprachmodulPruefen, baueSprachmodulModul, pruefeSprachmodul, baueSprachmodulSigniert, sprachmodulAlsText, sprachmodulDateiname,
  sprachmodulBerichtRendern, sprachmodulErzeugen, SPRACHMODUL_GRENZE_DE, SPRACHMODUL_GRENZE_EN,
  _SPRACHMODUL_MAX_BYTES, _SPRACHMODUL_MAX_TIEFE, _SPRACHMODUL_TAG_ODER_REFERENZ, _SPRACHMODUL_SCHLUESSEL,
  // EINLASS_REGISTER-Ausbau, bereich (27.08.2026) — vierte Ausgabeart
  bereichsModulPruefen,
  baueBereichModul, pruefeBereich, baueBereichSigniert,
  bereichAlsText, bereichDateiname,
  bereichStateLesen, bereichZeilenRendern, bereichErzeugen,
  // Strang D (17.09.2026) — sechste Ausgabeart, wizard
  WIZARD_IDS_EINGEBAUT, wizardsModulPruefen,
  baueWizardModul, pruefeWizard, baueWizardSigniert,
  wizardAlsText, wizardDateiname,
  wizardStateLesen, wizardZeilenRendern, wizardErzeugen,
  // Strang D (17.09.2026) — siebte Ausgabeart, logikModul
  logikModulPruefen,
  baueLogikmodulModul, pruefeLogikmodul, baueLogikmodulSigniert,
  logikmodulAlsText, logikmodulDateiname,
  logikmodulStateLesen, logikmodulSektorOptionenRendern, logikmodulErzeugen,
  // EINLASS_REGISTER-Ausbau, rechtsraum (27.08.2026) — fünfte Ausgabeart
  RECHTSRAUM_TYPEN_BEKANNT, rechtsraumModulPruefen,
  baueRechtsraumModul, pruefeRechtsraum, baueRechtsraumSigniert,
  rechtsraumAlsText, rechtsraumDateiname,
  rechtsraumStateLesen, rechtsraumZeilenRendern, rechtsraumErzeugen,
  // EINLASS_REGISTER-Ausbau, format (27.08.2026) — fünfter Register-Typ
  FORMAT_LESER_BEKANNT, formatModulPruefen,
  baueFormatModul, pruefeFormat, baueFormatSigniert,
  formatModulAlsText, formatModulDateiname,
  formatStateLesen, formatZeilenRendern, formatErzeugen,
  // EINLASS_REGISTER-Ausbau, branding (27.08.2026)
  brandingModulPruefen, baueBrandingModul, pruefeBranding, baueBrandingSigniert,
  brandingModulAlsText, brandingModulDateiname,
  brandingStateLesen, brandingErzeugen,
  // U2-ADR-409 Punkt 3/5 (13.09.2026) — eine fehlende Kennung vorschlagen
  _kennungNameSlug, baueKennungVorschlagPaket, kennungVorschlagAlsText, kennungVorschlagDateiname,
  kennungVorschlagMailtoText, kennungVorschlagMailtoLink, KENNUNG_VORSCHLAG_MAILTO_GRENZE,
  kvKennungAktuell, kvZeileHinzufuegen, kvZeilenRendern, kvVorschauAktualisieren, kennungVorschlagErzeugen,
  // MyTerms v1-Schnitt, Teil D (16.09.2026) — ein Angebot beantworten
  VEREINBARUNG_PRAEFIX, vereinbarungAusText, vereinbarungAlsText, baueVereinbarungsAntwort, baueVereinbarungsAntwortSigniert,
};
`;

function ladeGenerator(optionen) {
  // `optionen.html`: ein Quelltext statt der Datei — für die Rot-Beweise (eine absichtlich verschlechterte Fassung).
  const html = (optionen && typeof optionen.html === 'string') ? optionen.html : fs.readFileSync(GEN_PATH, 'utf8');
  const { script1, script2 } = extrahiereScripts(html);

  const documentStub = makeDocument();
  const windowStub = { crypto: webcrypto, addEventListener: () => {}, location: { href: '' }, scrollTo: () => {} };
  const sandbox = {
    crypto: webcrypto,
    TextEncoder, TextDecoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    console, setTimeout, clearTimeout, performance,
    window: windowStub, document: documentStub,
    // Reine URL()-Konstruktor-Faehigkeit noetig seit dem `verweis`-Feldtyp (12.09.2026) —
    // dieselbe Korrektur wie in load-kern.js/load-lesen.js: vorher ein Capability-Objekt
    // ohne die echte Klasse, jetzt echtes Node-`URL`, erweitert um die Blob-Methoden.
    URL: Object.assign(class extends URL {}, { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} }),
    Blob: function () {},
    FileReader: function () {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const source = script1 + '\n' + script2 + '\n' + EXPORT_HOOK;
  vm.runInContext(source, sandbox, { filename: path.basename(GEN_PATH) + '(concat)' });

  return { V: sandbox.__GEN__, document: documentStub, html, script1, script2, sandbox, windowStub };
}

module.exports = {
  ladeGenerator, extrahiereScripts, kryptoBlock, sha256,
  GEN_PATH, BLOCK_HASH_ERWARTET, webcrypto,
};
