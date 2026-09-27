'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Lade-Hilfe für vivodepot-lesen.html (Komponente 2 — Lese-App)
   ────────────────────────────────────────────────────────────────────────
   Analog zu load-kern.js / load-issuer.js: extrahiert die beiden <script>-Blöcke
   (Script 1 = VdCrypto-Block byte-identisch zum Kern; Script 2 = JWS-Block +
   Test-Sentinel + Daten-Definitionen + Lese-Logik) und lädt sie in einen Node-
   Kontext mit echtem WebCrypto und einem DOM-Stub. Die HTML wird NUR GELESEN;
   der Export-Hook wird an die im Speicher zusammengefügte Quelle gehängt, nie an
   die Datei. boot() läuft nicht (Stub-document.addEventListener ist no-op).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { webcrypto } = crypto;

const REPO = path.join(__dirname, '..');
const LESEN_PATH = process.env.LESEN_HTML_PATH
  ? path.resolve(process.env.LESEN_HTML_PATH)
  : path.join(REPO, 'vivodepot-lesen.html');

// Erwarteter VdCrypto-Block-Hash (== Kern == PORT-VERBATIM.js). Umbau „Englisch vor v1"
// (14.09.2026): zwei Kennung-Beispiele im Kopf-Kommentar mitgezogen, s. load-kern.js.
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
  const store = { innerHTML: '', textContent: '', value: '', checked: false, className: '', hidden: false, files: [] };
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
      // CSS-Custom-Properties aufzeichnen, damit Tests gesetzte Variablen lesen können
      // (Vorbild: tests/load-kern.js, dieselbe Begründung — Branding-CSS-Hook, 13.09.2026).
      if (prop === 'setProperty') return (k, v) => { t['__sp__' + k] = String(v); };
      if (prop === 'removeProperty') return (k) => { delete t['__sp__' + k]; };
      if (prop === 'getPropertyValue') return (k) =>
        (Object.prototype.hasOwnProperty.call(t, '__sp__' + k) ? t['__sp__' + k] : '');
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
   Positivkontrolle 16.08.: Menge geleert → 2 Fehlschlaege, die Messung greift also wirklich; mit der vollen Menge fallen NULL. */
const _VORHANDENE_IDS = new Set(
  (fs.readFileSync(LESEN_PATH, 'utf8').match(/\sid="[A-Za-z0-9_-]+"/g) || [])
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
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    get documentElement() { return doc.getElementById('__html'); },
    get body() { return doc.getElementById('__body'); },
  };
  return doc;
}

const EXPORT_HOOK = `
;globalThis.__LESEN__ = {
  // VdCrypto-Surface (Script 1)
  VdCrypto, deriveDepotKeyV2, deriveMasterBits, importMasterHkdfKey,
  bytesToBase64, base64ToBytes, _AAD_DEPOT_V2, CRYPTO_VERSION_AKTUELL, PBKDF2_ITERATIONS,
  /* Fund 18.09.2026, Krypto-Kapselung Weg A: dieser Getter exportierte den LEBENDEN
     Sitzungsschlüssel als lesbare Eigenschaft — genau der Zugriff, den Weg A ausschließen
     soll, auch für Tests (s. Kopf-Kommentar an tests/vdcrypto-sitzungsschluessel-
     unerreichbar.test.js). Ungenutzt (kein Aufrufer im ganzen Repo, gemessen) und seit der
     Kapselung ohnehin defekt — sessionHkdfKey liegt closure-privat in VdCrypto, ein Aufruf
     hätte ReferenceError: sessionHkdfKey is not defined geworfen. Entfernt statt repariert:
     kein Ersatz gebaut, weil kein Aufrufer eine Zusicherung dafür braucht — wer Sitzungs-
     zustand prüfen will, nimmt VdCrypto.sitzungOffen() (Ja/Nein, s. dort). KEINE Backticks
     in diesem Kommentar — EXPORT_HOOK ist selbst ein Template-Literal. */
  // Gemeinsamer JWS-Block + Test-Sentinel
  JWS_TYP, _signJWS, _verifyJWS, _jwsImportVerifyKey, _jwsImportSignKey,
  // A359 Zug 0: die Render-Typen der Lese-App gegen die des Kerns — messbar statt behauptet.
  _TPL_RENDER_TYPEN, _tplAbschnitte, sektorHTML,
  TEST_SENTINEL_PUBLIC_JWK, TEST_SENTINEL_ISSUER,
  verifiziereProviderCredentialGegenSentinel, istTestSentinelKey,
  // A318 Zug 2 (20.08.2026): die VC-Lese-Schicht ist wach — Anker, Kette, Pruefstand.
  TRUST_AUTHORITY_PUBLIC_JWK, verifiziereProviderCredential, verifiziereTemplateKette,
  _verifiziereTemplateSignatur, vorlagenPruefstandBerechnen, vorlagenMarkeHTML,
  vorlagenStandZuruecksetzen,
  // Der Stand ist eine let-Bindung — ein Wert-Export waere der Schnappschuss „noch nicht
  // gerechnet". Setzer statt Getter, weil die Anzeige-Probe ihn STELLEN muss, ohne die
  // asynchrone Kette zu fahren (sie prueft das Markup, nicht die Krypto).
  _vorlagenStandSetzen: (k) => { _vorlagenStand = k; _vorlagenStandFuer = k ? data : null; },
  // Daten-Definitionen
  /* U2-ADR-323: SEKTOR_BY_ID ist seit der Bereichs-Anmeldung eine let-Bindung. Als Wert
     exportiert waere es der Schnappschuss VOR dem Anmelden — eine Probe saehe die
     angedockten Bereiche nie, egal wie richtig der Code ist. Getter statt Wert. */
  STRINGS, SEKTOREN, NOTFALL_KERN_FELDER,
  // SIT2a: die Situationen kommen aus der Datei und sind let-Bindungen — Getter statt Wert.
  get SITUATIONEN() { return SITUATIONEN; }, get SITUATION_BY_ID() { return SITUATION_BY_ID; },
  situationenAlleLesen, situationByIdLesen, _situationenAusDepotAnmeldenLesen, SITUATIONEN_VERWORFEN_LESEN,
  situationAufgeloestLesen, situationenAufgeloestLesen, _situationKennungenLesen, _istSituationKennungLesen,
  // L4 (20.09.2026, Glied-9-Umbau): dieselbe Textarten-Tabelle, die die Lese-App selbst beim
  // Auflösen benutzt — exportiert, damit tools/lokalisierbarkeit-erheben.js den Template-/
  // Mitschrift-Kanal gegen die LEBENDE Quelle zählt, keine zweite, abgeschriebene Fassung.
  _SITUATION_TEXTARTEN_LESEN,
  TEXTSATZ_EINGEBAUT_LESEN, _textsatzKennungEingebautLesen, feldZeileHTML,
  get SEKTOR_BY_ID() { return SEKTOR_BY_ID; },
  // Lese-Logik (DOM-frei testbar) — U2-ADR-078: notfallCacheAusUmschlag entfernt
  erkenneFormat, leseDepotUmschlag, leseSubUmschlag,
  subBannerHTML,   // U2-ADR-156: trägt den Empfänger-Ausschnitt-Satz
  magicStrippen,
  parseNotfallQrText, qrTeilAufnehmen, _qrRahmenParsen,
  verarbeiteQrText, verarbeiteDatei,   // U2-ADR-082: QR-Kette Ende-zu-Ende testbar
  // Kette, Auftrag 8 (20.08.2026) — der verschlüsselte Rückweg
  ANTWORT_FORMAT_ID, ANTWORT_FORMAT_VERSION, ANTWORT_VERFAHREN, ANTWORT_ECDH_KURVE,
  ANTWORT_HKDF_INFO, ANTWORT_PBKDF2_ITERATIONEN, _antwortAad,
  antwortEntschluesselnPasswort, antwortEntschluesselnSchluessel, istAntwortUmschlag,
  antwortAnzeigeModell, qrTeileZusammensetzen,
  renderAntwortOeffnen, renderAntwort, antwortWeitergeben, anlassAnzeigeModell, renderAnlass,
  renderKamera, kameraStoppen, kameraMoeglich, kameraLeserMoeglich,
  feldEingetragen, feldWertText, listenEintragZusammenfassung, entitaetAnzeige,
  // Angedockte Template-Felder (U2-ADR-037) — Adapter und Gruppierung, seit 17.08.2026
  // mit Code- und Optionen-Aufloesung (Zug 1 „Die Empfaengerseite").
  _tplDefAlsFeld, _tplAbschnitte,
  feldSensibelUeberschreibung, feldIstSensibel, unterfeldIstSensibel,
  personName, institutionName, mappeName, mappeEintrag, _mappeInhaltAlsQuelleLesen, entitaetAnzeige, _wertTextMenschlich, _datumDeutsch, situationModell, notfallKernModell,
  _bankvollmachtRecordsLesen, _kiHatDatenLesen, _bereichLabelTextLesen,
  liesUrheberschaft, stempelName, urheberschaftZeileHTML, aktuellerAnkerName,
  /* U2-ADR-325: die Datenlesen-Schicht der Logik-Module. Eine Probe ueber sektorHTML allein
     kann NICHT zeigen, WELCHE Zeile zurueckgehalten wurde — sie sieht nur, was am Ende dasteht.
     Fuer die Sensibel-Pruefung je Zeile braucht es das Primitiv selbst. Der Praefix kommt aus
     derselben Instanz, nicht als abgeschriebene Zeichenkette: eine Kopie wuerde die Probe
     gruen lassen, wenn das Produkt seinen Schluesselraum aendert.
     (Keine Backticks hier — dieser Block ist selbst ein Template-Literal, s. Hinweis oben.) */
  /* U2-ADR-331: die erzeugte Sperrliste und ihr Praedikat. Die Probe vergleicht sie gegen die
     Erhebung — eine abgeschriebene Liste im Test verglichen zwei Kopien miteinander. */
  ZUSICHERUNGS_SCHLUESSEL_LESEN: (typeof ZUSICHERUNGS_SCHLUESSEL_LESEN !== 'undefined' ? ZUSICHERUNGS_SCHLUESSEL_LESEN : undefined),
  ZUSICHERUNG_TEXTE_EN: (typeof ZUSICHERUNG_TEXTE_EN !== 'undefined' ? ZUSICHERUNG_TEXTE_EN : undefined),
  LESE_TEXTE_EN: (typeof LESE_TEXTE_EN !== 'undefined' ? LESE_TEXTE_EN : undefined),
  _textsatzModuleBelegPruefen: (typeof _textsatzModuleBelegPruefen !== 'undefined' ? _textsatzModuleBelegPruefen : undefined),
  bereicheSichtbarLesen: (typeof bereicheSichtbarLesen !== 'undefined' ? bereicheSichtbarLesen : undefined),
  HILFE_LESEN_FRAGEN: (typeof HILFE_LESEN_FRAGEN !== 'undefined' ? HILFE_LESEN_FRAGEN : undefined),
  hilfeEmpfaengerinModell: (typeof hilfeEmpfaengerinModell !== 'undefined' ? hilfeEmpfaengerinModell : undefined),
  hilfeEmpfaengerinHTML: (typeof hilfeEmpfaengerinHTML !== 'undefined' ? hilfeEmpfaengerinHTML : undefined),
  bereichUebersetztLesen: (typeof bereichUebersetztLesen !== 'undefined' ? bereichUebersetztLesen : undefined),
  nichtUebersetzteZeigenSetzenLesen: (typeof nichtUebersetzteZeigenSetzenLesen !== 'undefined' ? nichtUebersetzteZeigenSetzenLesen : undefined),
  _depotUebernehmenGeprueft: (typeof _depotUebernehmenGeprueft !== 'undefined' ? _depotUebernehmenGeprueft : undefined),
  _textsatzModulBelegtInfo: (typeof _textsatzModulBelegtInfo !== 'undefined' ? _textsatzModulBelegtInfo : undefined),
  _TEXTSATZ_BELEGT: (typeof _TEXTSATZ_BELEGT !== 'undefined' ? _TEXTSATZ_BELEGT : undefined),
  sprachfassungLueckenAnzahl: (typeof sprachfassungLueckenAnzahl !== 'undefined' ? sprachfassungLueckenAnzahl : undefined),
  sprachfassungHinweisHTML: (typeof sprachfassungHinweisHTML !== 'undefined' ? sprachfassungHinweisHTML : undefined),
  TEXTSATZ_RUECKFALL_SPRACHE: (typeof TEXTSATZ_RUECKFALL_SPRACHE !== 'undefined' ? TEXTSATZ_RUECKFALL_SPRACHE : undefined),
  _textsatzZusicherungFormOk: (typeof _textsatzZusicherungFormOk !== 'undefined' ? _textsatzZusicherungFormOk : undefined),
  _istZusicherungsKennung: (typeof _istZusicherungsKennung !== 'undefined' ? _istZusicherungsKennung : undefined),
  _istBereichLabelKennungLesen: (typeof _istBereichLabelKennungLesen !== 'undefined' ? _istBereichLabelKennungLesen : undefined),
  LISTEN_UNTERFELD_PRAEFIX: (typeof LISTEN_UNTERFELD_PRAEFIX !== 'undefined' ? LISTEN_UNTERFELD_PRAEFIX : undefined),
  LOGIK_DATEN_TYPEN_LESEN: (typeof LOGIK_DATEN_TYPEN_LESEN !== 'undefined' ? LOGIK_DATEN_TYPEN_LESEN : undefined),
  _datenPrimitivLesenLesen: (typeof _datenPrimitivLesenLesen !== 'undefined' ? _datenPrimitivLesenLesen : undefined),
  datenSchemaLesenLesen: (typeof datenSchemaLesenLesen !== 'undefined' ? datenSchemaLesenLesen : undefined),
  logikModulPruefenLesen: (typeof logikModulPruefenLesen !== 'undefined' ? logikModulPruefenLesen : undefined),
  // C1 (06.09.2026, "Der Beleg bleibt im Depot") — derselbe Prüfstand wie oben (vorlagen*),
  // für logikModule. _logikModulStandSetzen spiegelt _vorlagenStandSetzen (s. dort): der
  // Stand ist eine let-Bindung, ein Setzer stellt ihn ohne die asynchrone Kette zu fahren.
  logikModulPruefstandBerechnen: (typeof logikModulPruefstandBerechnen !== 'undefined' ? logikModulPruefstandBerechnen : undefined),
  logikModulMarkeHTML: (typeof logikModulMarkeHTML !== 'undefined' ? logikModulMarkeHTML : undefined),
  logikModulStandZuruecksetzen: (typeof logikModulStandZuruecksetzen !== 'undefined' ? logikModulStandZuruecksetzen : undefined),
  logikModulAbschnitteHTML: (typeof logikModulAbschnitteHTML !== 'undefined' ? logikModulAbschnitteHTML : undefined),
  _logikModuleAlleLesen: (typeof _logikModuleAlleLesen !== 'undefined' ? _logikModuleAlleLesen : undefined),
  _logikModulStandSetzen: (k) => { _logikModulStand = k; _logikModulStandFuer = k ? data : null; },
  // Render (Zeichenketten-Erzeuger, DOM-frei)
  sektorHTML, situationContentHTML, sidebarHTML,
  angehoerigenVorlagePruefenLesen, _angehoerigenVorlagenAusDepotAnmeldenLesen, angehoerigenSituationenAlleLesen, angehoerigenBlattHTML,
  ANGEHOERIGEN_VORLAGEN_VERWORFEN_LESEN,
  // Der Fold-Einstieg des OEFFNEN-Pfads. Muss exportiert sein, damit Tests den echten Weg gehen
  // koennen: setData weist nur zu und laeuft an allen Lese-Spiegeln vorbei — ein Test darueber
  // prueft die Folds NICHT, sondern nur, was ohnehin schon in der Datei stand.
  // (Keine Backticks in diesem Block: die Exportliste wird als Template-Literal ausgewertet.)
  _foldVollmachtenLesen, instrumentZeileModellLesen,
  /* U2-ADR-323 (06.09.2026): angedockte Bereiche erreichen den Empfaenger. Mit
     typeof-Absicherung — parallele Zweige tragen diese Fassung der Lese-App noch nicht, und ein
     fehlender Name beendete hier nicht diese eine Probe, sondern JEDE Probe der Lese-App mit
     einem ReferenceError. SEKTOR_BY_ID ist seit dieser Aenderung eine let-Bindung: als Getter
     exportiert, sonst waere der Export der Schnappschuss VOR der Anmeldung. */
  bereichsModulPruefenLesen: (typeof bereichsModulPruefenLesen !== 'undefined' ? bereichsModulPruefenLesen : undefined),
  _bereichsModuleAusDepotAnmeldenLesen: (typeof _bereichsModuleAusDepotAnmeldenLesen !== 'undefined' ? _bereichsModuleAusDepotAnmeldenLesen : undefined),
  bereicheAlleLesen: (typeof bereicheAlleLesen !== 'undefined' ? bereicheAlleLesen : undefined),
  // LA1 (19.09.2026) — der Hinweis auf nicht Darstellbares (DoD-Schlußmessung Punkt 4).
  _darstellungsLuecken: (typeof _darstellungsLuecken !== 'undefined' ? _darstellungsLuecken : undefined),
  _verwuerfeLesen: (typeof _verwuerfeLesen !== 'undefined' ? _verwuerfeLesen : undefined),
  get MODUL_VERWURF_SPUR_LESEN() { return (typeof MODUL_VERWURF_SPUR_LESEN !== 'undefined' ? MODUL_VERWURF_SPUR_LESEN : undefined); },
  _lueckenBlockHTML: (typeof _lueckenBlockHTML !== 'undefined' ? _lueckenBlockHTML : undefined),
  get BEREICHS_MODUL_VERWORFEN_LESEN() { return (typeof BEREICHS_MODUL_VERWORFEN_LESEN !== 'undefined' ? BEREICHS_MODUL_VERWORFEN_LESEN : undefined); },
  // Glied 8 (18.08.2026): die uebrigen Andockschluessel erreichen den Empfaenger
  TEXTSATZ_SPRACHE_EINGEBAUT, textsatzModulPruefen, _textsatzModuleAusDepotAnmelden,
  textsatzSpracheAktiv, textLesen, _textsatzKennungBekannt,
  AB_WERK_TEXTSATZ_EN: (typeof AB_WERK_TEXTSATZ_EN !== 'undefined' ? AB_WERK_TEXTSATZ_EN : undefined),
  // A479 — die Regeln (Schreibrichtung/Sprachkennung wirksam, die übrigen vier geprüft
  // aber wirkungslos wie im Kern)
  textsatzRegeln, textsatzSchreibrichtungAnwenden, textsatzSprachkennungAnwenden,
  TEXTSATZ_REGELN_EINGEBAUT, TEXTSATZ_REGELN_ERLAUBT, datumKurz,
  _rechtsraumModuleAusDepotAnmelden, rechtsraumModulFuer, rechtsraumModuleAlle,
  // U2-ADR-258 (04.09.2026) — die Herkunft eines Moduls erreicht den Empfaenger
  MODUL_SLOTS, modulHerkunftStand, modulHerkunftBerechnen, modulHerkunftGiltAlsGeprueft,
  modulHerkunftOhnePruefung, modulHerkunftAnzahl, modulHerkunftSatz, herkunftBlockHTML,
  // U2-ADR-259 (04.09.2026) — die zweite Angabe auf demselben Weg (Stand statt Herkunft)
  moduleStandBerechnen, moduleStandAnzahl, moduleStandSatz, standBlockHTML,
  antwortAnzeigeModell, renderAntwort, renderVollExport, renderSituationOnly, renderNotfall,
  renderQrPdf, renderQrBereich,   // U2-ADR-082 — schreiben in document.getElementById('app')
  // QR-Übergabe empfangen (b16-Wiedereinbau, Krisenvorsorge-Auftrag 24.08.2026, Zug 3c)
  EMPFAENGER_QR_HASH_PRAEFIX, _empfaengerQrHashLesen, _empfaengerQrEntschluesseln,
  renderEmpfaengerQrPasswort, boot,
  // (10.09.2026) — Branding erreicht die Lese-App, U2-ADR-362-Interceptor gespiegelt
  _markeName, _markeDomain, _markePlatzhalterAufloesen, _markeAnzeigeAnwenden, escapeHTML, topbarHTML,
  // Nachtrag 13.09.2026 — derselbe Zug für die Topbar-FARBE (U2-ADR-400, vormals REST-OFFEN)
  _markeFarbeAnwenden, _brandingKontrastVerhaeltnisHex, _brandingTopbarKontrastText,
  _VD_BRANDING_TOPBAR_CSS_EIGENSCHAFTEN,
  // Nachtrag 13.09.2026 — die fünf Palette-Tokens (Fund, direkt im Anschluss an U2-ADR-408)
  _markePaletteAnwenden, _lesenPaletteAbleiten, _brandingHexZuHsl, _brandingHslZuHex,
  _brandingMarkentonTragfaehig, _hexZuRgb, _LESEN_BRANDING_PALETTE_ROLLEN,
  _LESEN_BRANDING_PALETTE_PAARE, _LESEN_BRANDING_PALETTE_MIN_KONTRAST,
  // Zustand
  getData: () => data,
  setData: (v) => { data = v; _situationenAusDepotAnmeldenLesen(v); },
  getLeseModus: () => leseModus,
  setLeseModus: (v) => { leseModus = v; },
  getSubInfo: () => subInfo,
  setSubInfo: (v) => { subInfo = v; },
  setNotfallStufe1: (v) => { notfallStufe1 = v; },
  setKlartextWarnung: (v) => { klartextWarnung = v; },
  entladen,
};
`;

/* SIT2a: die Situationen kommen aus der Datei (`abWerkMitschrift.situationen`). Ein Test, der ein Depot ohne
   diese Mitschrift setzt, bekommt die Saat des Standard-Produkts (aus dem gebackenen Kern) hineingelegt — so wie
   ein echtes, von einem Produkt angelegtes Depot sie trägt. `ladeLesen({ ohneSaat: true })` schaltet das ab. */
let _situationenSaatGemerkt = null;
function _situationenSaat() {
  if (!_situationenSaatGemerkt) _situationenSaatGemerkt = JSON.stringify(require('./load-kern.js').ladeKern().V.AB_WERK_SITUATIONEN_QUELLEN);
  return JSON.parse(_situationenSaatGemerkt);
}

function ladeLesen(opts) {
  opts = opts || {};
  const html = fs.readFileSync(LESEN_PATH, 'utf8');
  const { script1, script2 } = extrahiereScripts(html);

  const documentStub = makeDocument();
  // Ein einziges, GETEILTES location-Objekt (window.location UND das bare globale `location`,
  // wie im echten Browser dieselbe Sache) — nötig, damit ein Test einen QR-Fragment-Hash setzen
  // kann, bevor `_empfaengerQrHashLesen()`/`boot()` laufen (Krisenvorsorge-Auftrag, Zug 3c).
  const locationStub = { href: '', hash: '', pathname: '', search: '' };
  const windowStub = { crypto: webcrypto, addEventListener: () => {}, location: locationStub };
  const sandbox = {
    crypto: webcrypto,
    TextEncoder, TextDecoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    console, setTimeout, clearTimeout,
    window: windowStub, document: documentStub, location: locationStub,
    history: { replaceState: () => {} },
    FileReader: function () {}, Blob: function () {},
    // Vorher ein reines Capability-Objekt ({createObjectURL, revokeObjectURL}) OHNE die echte
    // URL-Klasse — im Browser ist `URL` beides zugleich. Fund (12.09.2026, `verweis`-Feldtyp,
    // s. dieselbe Korrektur in load-kern.js): `new URL(...)` schlug im Sandkasten fehl, obwohl
    // derselbe Aufruf im echten Browser eine gültige URL parst. Jetzt die echte Node-`URL`-
    // Klasse, erweitert um die beiden Blob-Methoden.
    URL: Object.assign(class extends URL {}, { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} }),
    navigator: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const source = script1 + '\n' + script2 + '\n' + EXPORT_HOOK;
  vm.runInContext(source, sandbox, { filename: path.basename(LESEN_PATH) + '(concat)' });

  if (!opts.ohneSaat) {
    const V = sandbox.__LESEN__;
    const setDataRoh = V.setData;
    V.setData = (v) => {
      if (v && typeof v === 'object' && !Object.isFrozen(v) && !(v.abWerkMitschrift && Array.isArray(v.abWerkMitschrift.situationen))) {
        v.abWerkMitschrift = Object.assign({}, v.abWerkMitschrift, { situationen: _situationenSaat() });
      }
      return setDataRoh(v);
    };
  }
  return { V: sandbox.__LESEN__, document: documentStub, html, script1, script2, location: locationStub };
}

module.exports = {
  ladeLesen, extrahiereScripts, kryptoBlock, sha256,
  LESEN_PATH, BLOCK_HASH_ERWARTET, webcrypto,
};
