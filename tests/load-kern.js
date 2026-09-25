'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-Teststrategie (U2-ADR-004) — Lade-Hilfe der stehenden Suite
   ────────────────────────────────────────────────────────────────────────
   Extrahiert die beiden <script>-Blöcke aus vivodepot.html
   zur LAUFZEIT und lädt sie in einen Node-Kontext mit echtem WebCrypto und
   einem DOM-Stub. Die HTML wird NUR GELESEN — es werden KEINE Test-Haken in
   sie eingebaut. Der Export-Hook, der die internen Bindings sichtbar macht,
   wird an die im Speicher zusammengefügte Quelle angehängt, nie an die Datei.

   Beide Blöcke laufen als EINE vm-Quelle, damit sie — wie im Browser — einen
   gemeinsamen Lexical Scope teilen (Script 2 sieht die top-level-Bindings von
   Script 1). Jeder ladeKern()-Aufruf baut einen FRISCHEN Kontext: Test-Zustand
   (data, sessionSubKeys) leckt nicht zwischen Tests.

   Für CI/Gate-Nachweis kann die HTML-Quelle über KERN_HTML_PATH umgelenkt
   werden (z. B. auf eine Kopie mit gekipptem Byte), ohne das Produkt zu
   berühren.

   ABDECKUNGSWEG (Auftrag „Belegkette und Lücken", Glied 1, 14./15.08.2026):
   `new Function(...)`-erzeugter Code trägt keine Source-URL — V8-Coverage
   (`node --experimental-test-coverage`) kann ausgeführte Zeilen darum nicht
   auf `vivodepot.html` zurückabbilden. Mit `KERN_ABDECKUNG_TEMPDATEI=1`
   gesetzt schreibt `ladeKern()` denselben Quelltext zusätzlich in eine reale
   Temp-Datei und lädt ihn über `vm.Script`/`runInThisContext` (läuft im
   AKTUELLEN Realm, nicht in einem `vm.createContext`-Fremd-Realm — die
   Prototyp-Fallen vom 27.07. bleiben damit vermieden, s. Kommentar unten bei
   `ladeKern`). Normalbetrieb bleibt vollständig auf `new Function(...)`.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { webcrypto } = crypto;

const ABDECKUNG_TEMPDATEI = !!process.env.KERN_ABDECKUNG_TEMPDATEI;
const ABDECKUNG_PFAD = path.join(os.tmpdir(), 'vivodepot-kern-abdeckung-' + process.pid + '.js');

// Baut einen Text EXAKT derselben Länge/Zeilenstruktur wie `html`: jedes
// Zeichen AUSSERHALB der beiden <script>-Körper wird durch ein Leerzeichen
// ersetzt (Zeilenumbrüche bleiben stehen). Ergebnis: script1/script2 landen
// in der Rekonstruktion auf GENAU denselben Zeilennummern wie in
// `vivodepot.html` — kein einzelner linearer Offset könnte das leisten, weil
// zwischen den beiden <script>-Blöcken beliebig viel HTML liegt (der Grund,
// warum der Auftrag „Zeilenversatz ist der Kern der Aufgabe" nennt). Robuster
// als ein von Hand berechneter `lineOffset`: die Übereinstimmung folgt aus
// der Konstruktion, nicht aus einer Rechnung, die falsch sein könnte.
function baueZeilentreueQuelle(html, bounds) {
  const chars = html.split('');
  for (let i = 0; i < chars.length; i++) {
    let drin = false;
    for (const [a, b] of bounds) { if (i >= a && i < b) { drin = true; break; } }
    if (!drin && chars[i] !== '\n') chars[i] = ' ';
  }
  return chars.join('');
}

/* ── Die async-Falle laut machen (27.07.2026, Posten 41) ──────────────────
   DER ANLASS. Eine Messung rief `subDepotEntsiegeln` — eine async-Funktion —
   in einem `try/catch` OHNE `await`. Der Aufruf gibt ein Promise zurück und
   wirft nicht; das `catch` fing nichts, und die Messung meldete
   „lesbar ohne Passwort — Bruch". Ein Krypto-Bruch, den es nicht gibt.

   Aufgefallen ist es nur, weil die unbehandelte Ablehnung das Skript
   abbrach — Zufall, kein Mechanismus. Hätte das Skript danach noch etwas
   ausgegeben, wäre die Falschmeldung stehen geblieben.

   `node --test` fängt das bereits: die Datei faellt, auch wenn der einzelne
   Test gruen durchlaeuft (gemessen). Ungeschuetzt sind die AD-HOC-Messungen,
   und ihr gemeinsamer Engpass ist dieses Modul — jede Messung gegen den Kern
   geht durch `ladeKern()`. Darum steht der Schalter hier und nicht in einem
   Satz, an den jemand denken muesste.

   57 Kern-Exporte sind async; die Angriffsflaeche ist entsprechend breit. */
if (!process.env.KERN_KEINE_REJECTION_WACHE && !process.__vdRejectionWache) {
  process.__vdRejectionWache = true;
  process.on('unhandledRejection', (grund) => {
    const e = grund instanceof Error ? grund : new Error(String(grund));
    e.message = 'UNBEHANDELTE PROMISE-ABLEHNUNG — vermutlich ein async-Aufruf ohne `await`.\n' +
      'Ein try/catch faengt so NICHTS und meldet Erfolg, wo etwas geworfen hat:\n  ' + e.message;
    throw e;
  });
}

const REPO = path.join(__dirname, '..');
const HTML_PATH = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH)
  : path.join(REPO, 'vivodepot.html');
const PORT_VERBATIM_PATH = path.join(REPO, 'vivodepot-krypto-kern-PORT-VERBATIM.js');

// Erwarteter Hash des Krypto-Blocks (== vivodepot-krypto-kern-PORT-VERBATIM.js).
// Umbau „Englisch vor v1" (14.09.2026): der Block selbst (Krypto-Logik) ist byte-identisch
// geblieben -- nur ZWEI Kennung-BEISPIELE im Kopf-Kommentar wurden mitgezogen (sozialversicherung.gdb
// -> socialInsurance.degreeOfDisabilityGdb, gesundheit.blutgruppe/identitaet.vorname ->
// health.bloodType/identity.givenName), wie jede andere Kennung-Erwähnung im restlichen Kern auch.
// Neuer Pin gegen PORT-VERBATIM.js nachgerechnet (beide weiterhin byte-identisch).
const BLOCK_HASH_ERWARTET = '732ff4b0dc74e7ae9cce9febc8eb5cb3d8e52150775f88c80ff1f8967a8a6282';

/* ── Script-Block-Extraktion ─────────────────────────────────────────────── */
function extrahiereScripts(html) {
  const OPEN = '<script>', CLOSE = '</script>';
  const o1 = html.indexOf(OPEN), o1e = o1 + OPEN.length;
  const c1 = html.indexOf(CLOSE, o1e);
  const o2 = html.indexOf(OPEN, c1), o2e = o2 + OPEN.length;
  const c2 = html.indexOf(CLOSE, o2e);
  if (o1 < 0 || c1 < 0 || o2 < 0 || c2 < 0) {
    throw new Error('Konnte die beiden <script>-Blöcke nicht finden.');
  }
  return { script1: html.slice(o1e, c1), script2: html.slice(o2e, c2), bounds: [[o1e, c1], [o2e, c2]] };
}

// Kanonischer Krypto-Block: Inhalt zwischen den Tags, ohne das eine führende
// Zeilenende direkt hinter "<script>". Entspricht byte-genau dem Inhalt der
// Zeilen 216–474 (== PORT-VERBATIM.js).
function kryptoBlock(script1) {
  return script1.startsWith('\n') ? script1.slice(1) : script1;
}

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

/* ── DOM-Stub: universelles Element via Proxy ────────────────────────────── */
function makeEl() {
  const store = { innerHTML: '', textContent: '', value: '', checked: false, className: '' };
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
      if (prop === 'insertAdjacentHTML') return (pos, html) => {
        if (pos === 'afterbegin') t.innerHTML = String(html) + (t.innerHTML || '');
        else t.innerHTML = (t.innerHTML || '') + String(html);
      };
      // CSS-Custom-Properties aufzeichnen, damit Tests gesetzte Variablen lesen können
      // (z. B. --vm-chrome beim Sub-Depot-Betreten). Rein additiv; vorher noop.
      if (prop === 'setProperty') return (k, v) => { t['__sp__' + k] = String(v); };
      if (prop === 'removeProperty') return (k) => { delete t['__sp__' + k]; };
      if (prop === 'getPropertyValue') return (k) =>
        (Object.prototype.hasOwnProperty.call(t, '__sp__' + k) ? t['__sp__' + k] : '');
      if (prop === 'getAttribute') return () => null;
      return noop; // focus/remove/setAttribute/addEventListener/onclick…
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}
/* ── `getElementById` liefert `null`, wenn es die ID nicht gibt (A248, 16.08.2026) ──
   BIS HEUTE gab der Stub fuer JEDE angefragte ID ein Phantom zurueck, nie `null`.
   Das machte jede Probe blind gegen die haeufigste DOM-Fehlerklasse ueberhaupt:
   ein Element holen, das es nicht gibt, und ungeprueft weiterverwenden. Im
   Browser wirft das; hier lief es durch.

   DIE MESSUNG, DIE DEN SCHALTER UMGELEGT HAT. Zwei Anlaeufe zuvor nannten 378
   bzw. 261 blinde Proben. Beide Zahlen waren Artefakte des MESSMODELLS, nicht
   des Produkts: sie liessen auch `document.documentElement` und `document.body`
   zu `null` werden. Beide sind im Browser NIE `null` — sie tragen nur kein
   `id`-Attribut, weshalb eine Vorbelegung aus den `id="…"`-Attributen sie
   verfehlt. Mit dieser einen Korrektur faellt die Zahl auf NULL: das Produkt
   ist an jeder Stelle, die eine echte ID nachschlaegt, bereits abgesichert.

   WARUM DAS KEINE LEERMESSUNG IST. Positivkontrolle gefahren: EINE echte ID
   (`app`) aus der Menge genommen → 198 Fehlschlaege. Die Null ist also
   gemessen, nicht erschlichen. `tests/load-kern-null-modell.test.js` haelt
   diese Kontrolle dauerhaft, damit der Stub nicht still zum Phantom-fuer-alles
   zurueckfaellt.

   DIE GRENZE, die dazugehoert: die Menge kommt aus den statischen
   `id="…"`-Attributen der HTML-Quelle. Ein Element, das der Code zur Laufzeit
   mit einer neuen ID erzeugt und danach sucht, gaebe hier `null` — heute
   passiert das nirgends (sonst waere die Suite rot). Geschieht es einmal,
   faellt es auf, und das ist die richtige Richtung.

   `getAttribute` liefert im selben Stub weiterhin unbedingt `null` — und das
   BLEIBT so, jetzt aber gemessen statt offengelassen (16.08.2026, Zug 5 des
   Produkt-Reste-Auftrags):

   Ueber die gesamte Suite wird der Stub-`getAttribute` GENAU ZWEIMAL gerufen,
   beide Male mit `data-bereich`, beide aus derselben Stelle im Kern
   (`flowMappeMetadaten`). Vier `.getAttribute(`-Stellen stehen in den Proben
   selbst; drei davon laufen unter Playwright am echten DOM, die vierte
   (`fix-a62-geltungsbereich`) zerlegt einen String und fasst kein Element an.

   Warum trotzdem nicht geschaerft: es gibt hier nichts zu schaerfen. Bei
   `getElementById` existiert ein Modell der Wahrheit — die statischen IDs der
   HTML-Quelle. Fuer Attribute existiert keines: der Stub haelt keine Elemente,
   also auch keine Attributwerte. Ein `getAttribute`, das wirft, wuerde wieder
   das Modell messen statt den Browser — genau der Fehler, den A248 abgestellt
   hat.

   Der eine Ort, an dem die Luecke etwas verdeckte, ist stattdessen dort
   benannt worden, wo sie wirkt: `tests/mappe-upload.test.js` behauptete
   „Default-Bereich aus der Knopfreihe" und pruefte in Wahrheit die
   Normalisierung in `mappeEintragHinzufuegen`. Beschriftung richtiggestellt,
   Rest als Playwright-Luecke benannt. */
const _VORHANDENE_IDS = new Set(
  (fs.readFileSync(HTML_PATH, 'utf8').match(/\sid="[A-Za-z0-9_-]+"/g) || [])
    .map((treffer) => treffer.slice(5, -1))
    /* Die zwei Sentinel der Wurzelelemente — sie tragen kein id-Attribut, sind
       im Browser aber immer da. */
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

/* ── Kontext bauen, Blöcke laden, interne Bindings exportieren ───────────── */
// U2-ADR-NNN (18.09.2026, Kern-Verschluss): EXPORT_HOOK selbst muss jetzt INNERHALB des
// Kern-IIFE laufen (s. spliceVorKernVerschluss), sonst sieht es keinen der eingeschlossenen
// Namen. Ein `return` dort würde nur aus DIESEM IIFE zurückkehren, nicht aus der äußeren
// new Function() — sein Ergebnis ginge verloren (V wäre `undefined`). Darum schreibt der Hook
// stattdessen in eine Variable, die AUSSERHALB des IIFE deklariert ist (`var`, hoisted auf die
// äußere Funktion) — die bare Zuweisung von innen löst über die Scope-Kette nach außen auf,
// unabhängig von "use strict". Die äußere Quelle gibt diese Variable danach zurück.
const EXPORT_HOOK = `
;__LOAD_KERN_EXPORT__ = {
  STRINGS, SEKTOR_BY_ID, SEKTOR_FORMATE, leeresDepot, uuidV4, Modus, kernAPI, heuteLokal,
  VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL, VOLLEXPORT_STRUKTURELL_SCHLUESSEL, VOLLEXPORT_FELDWEISE_SCHLUESSEL,
  // Posten „Vollimport ist kein Vollimport" (11.09.2026) — typeof-abgesichert, weil manche
  // Proben (z. B. wizard-optionen-aus-materialisieren-u2-adr-341.test.js über kernVonCommit)
  // ältere Kern-Fassungen laden, die diese Namen noch nicht kennen (s. Regel „Neuer Kern-Export:
  // typeof absichern"). KEINE Backticks in diesem Kommentar — EXPORT_HOOK ist selbst ein
  // Template-Literal, ein Backtick hier bricht es mitten durch (Werkzeug-Falle, s. Memory).
  VOLLIMPORT_MITNEHMEN_SCHLUESSEL: (typeof VOLLIMPORT_MITNEHMEN_SCHLUESSEL !== 'undefined' ? VOLLIMPORT_MITNEHMEN_SCHLUESSEL : undefined),
  VOLLIMPORT_DRAUSSEN_SCHLUESSEL: (typeof VOLLIMPORT_DRAUSSEN_SCHLUESSEL !== 'undefined' ? VOLLIMPORT_DRAUSSEN_SCHLUESSEL : undefined),
  VOLLIMPORT_REST_AUSGENOMMEN: (typeof VOLLIMPORT_REST_AUSGENOMMEN !== 'undefined' ? VOLLIMPORT_REST_AUSGENOMMEN : undefined),
  // STANDARDVORLAGE-NUR-DE (23.09.2026): Sprach-Hinweis an der deutschen Standardvorlage im englischen Produkt.
  wortlautVorlageHTML: (typeof wortlautVorlageHTML !== 'undefined' ? wortlautVorlageHTML : undefined),
  _standardVorlage: (typeof _standardVorlage !== 'undefined' ? _standardVorlage : undefined),
  _standardVorlageSprache: (typeof _standardVorlageSprache !== 'undefined' ? _standardVorlageSprache : undefined),
  vollimportNichtUebernommenNamen: (typeof vollimportNichtUebernommenNamen !== 'undefined' ? vollimportNichtUebernommenNamen : undefined),
  personPatchAusInlineNeuanlage: (typeof personPatchAusInlineNeuanlage !== 'undefined' ? personPatchAusInlineNeuanlage : undefined),
  PERSONEN_SCHLUESSEL_ALT_ZU_NEU_88: (typeof PERSONEN_SCHLUESSEL_ALT_ZU_NEU_88 !== 'undefined' ? PERSONEN_SCHLUESSEL_ALT_ZU_NEU_88 : undefined),
  neuereFassungNurLesen: (typeof neuereFassungNurLesen !== 'undefined' ? neuereFassungNurLesen : undefined),
  // Zerfall in Feld-Einheiten (18.08.2026) — Zug 1 gebaut und belegt, die Stufe wartet.
  CRYPTO_VERSION_ZERFALL, ZERFALL_ADRESSE_BYTES, ZERFALL_FACH_KENNUNG,
  _zerfallEinheiten, _zerfallZusammensetzen, depotSerialisierenV4, depotSerialisierenV3, _zerfallLesen,
  deriveAdressKeyV4, feldAdresseV4, _aadEinheitV4,
  _AAD_DEPOT_V2, deriveDepotKeyV2, importMasterHkdfKey, deriveMasterBits,
  PBKDF2_ITERATIONS,   // U2-ADR-230 (03.09.2026) — Wächter gegen eine Vor-Ort-Änderung der Konstante
  bytesToBase64, base64ToBytes, VdCrypto, normalizePassword,
  _bytesAlsBinaerstring,   // S17 („Die Base64-Grenzen", 09.08.2026)
  importMasterAesKey, deriveKey, _AAD_UEBERGABE_V2, CRYPTO_VERSION_AKTUELL, KRYPTO_VERSION_ALLOWLIST,
  depotAnlegen, depotSerialisieren, depotLaden, depotDateiname, istGueltigerUmschlag, umschlagEntpacken,
  subDepotVersiegeln, subDepotEntsiegeln, subDepotAnlegen, flowKindSubDepotAnlegen,
  subDepotVertrauenOeffnen, subDepotVertrauenSchliessen,
  subDepotBlackboxExportieren, blackboxDateiAusUmschlag,
  subDepotAushaengen, subDepotReaktivieren, verwaltungAktiv,
  uebergabeProtokollEintragen, uebergabeProtokollLoeschen,
  // Schema 82 (MyTerms v1-Schnitt): Bedingung und Annahme am Übergabe-Eintrag
  uebergabeBedingungNormalisieren: (typeof uebergabeBedingungNormalisieren !== 'undefined' ? uebergabeBedingungNormalisieren : undefined),
  uebergabeAnnahmeNormalisieren: (typeof uebergabeAnnahmeNormalisieren !== 'undefined' ? uebergabeAnnahmeNormalisieren : undefined),
  uebergabeBedingungPruefsumme: (typeof uebergabeBedingungPruefsumme !== 'undefined' ? uebergabeBedingungPruefsumme : undefined),
  uebergabeVereinbarungNormalisieren: (typeof uebergabeVereinbarungNormalisieren !== 'undefined' ? uebergabeVereinbarungNormalisieren : undefined),
  UEBERGABE_VEREINBARUNG_STAENDE: (typeof UEBERGABE_VEREINBARUNG_STAENDE !== 'undefined' ? UEBERGABE_VEREINBARUNG_STAENDE : undefined),
  VEREINBARUNG_PRAEFIX: (typeof VEREINBARUNG_PRAEFIX !== 'undefined' ? VEREINBARUNG_PRAEFIX : undefined),
  vereinbarungAngebotErzeugen: (typeof vereinbarungAngebotErzeugen !== 'undefined' ? vereinbarungAngebotErzeugen : undefined),
  vereinbarungAlsText: (typeof vereinbarungAlsText !== 'undefined' ? vereinbarungAlsText : undefined),
  vereinbarungAusText: (typeof vereinbarungAusText !== 'undefined' ? vereinbarungAusText : undefined),
  vereinbarungAntwortPruefen: (typeof vereinbarungAntwortPruefen !== 'undefined' ? vereinbarungAntwortPruefen : undefined),
  vereinbarungAntwortAnwenden: (typeof vereinbarungAntwortAnwenden !== 'undefined' ? vereinbarungAntwortAnwenden : undefined),
  vereinbarungPersonGibtFrei: (typeof vereinbarungPersonGibtFrei !== 'undefined' ? vereinbarungPersonGibtFrei : undefined),
  vereinbarungAusgabeErlaubt: (typeof vereinbarungAusgabeErlaubt !== 'undefined' ? vereinbarungAusgabeErlaubt : undefined),
  vereinbarungAusgabeVermerken: (typeof vereinbarungAusgabeVermerken !== 'undefined' ? vereinbarungAusgabeVermerken : undefined),
  bedingungFestlegungNormalisieren: (typeof bedingungFestlegungNormalisieren !== 'undefined' ? bedingungFestlegungNormalisieren : undefined),
  bedingungFestlegen: (typeof bedingungFestlegen !== 'undefined' ? bedingungFestlegen : undefined),
  vereinbarungFreigabeHolen: (typeof vereinbarungFreigabeHolen !== 'undefined' ? vereinbarungFreigabeHolen : undefined),
  mitVereinbarung: (typeof mitVereinbarung !== 'undefined' ? mitVereinbarung : undefined),
  vereinbarungStatusText: (typeof vereinbarungStatusText !== 'undefined' ? vereinbarungStatusText : undefined),
  vereinbarungBegleitdaten: (typeof vereinbarungBegleitdaten !== 'undefined' ? vereinbarungBegleitdaten : undefined),
  VEREINBARUNG_GRENZEN: (typeof VEREINBARUNG_GRENZEN !== 'undefined' ? VEREINBARUNG_GRENZEN : undefined),
  vereinbarungPdfAnhang: (typeof vereinbarungPdfAnhang !== 'undefined' ? vereinbarungPdfAnhang : undefined),
  _pdfAnhangEinbetten: (typeof _pdfAnhangEinbetten !== 'undefined' ? _pdfAnhangEinbetten : undefined),
  pdfDatenfassungEinbetten: (typeof pdfDatenfassungEinbetten !== 'undefined' ? pdfDatenfassungEinbetten : undefined),
  bedingungAbschnittHTML: (typeof bedingungAbschnittHTML !== 'undefined' ? bedingungAbschnittHTML : undefined),
  flowErbscheinXmlSichern: (typeof flowErbscheinXmlSichern !== 'undefined' ? flowErbscheinXmlSichern : undefined),
  empfaengerDateiHerausgeben: (typeof empfaengerDateiHerausgeben !== 'undefined' ? empfaengerDateiHerausgeben : undefined),
    // U2-ADR-120 — eigenständig, s. Kommentar am Kern
  flowUebergabeProtokollManuellErfassen, flowUebergabeProtokollLoeschen, _uebergabeFelderHTML,
  renderUebergabeProtokoll, oeffneUebergabeProtokoll, uebergabeProtokollZeileHTML,
  flowUebergabeWiderrufErzeugen, uebergabeWiderrufNutzlast, zeichneWiderrufPdf, uebergabeWiderrufPdfErzeugen,
  subDepotEinhaengen, pruefeBlackboxUmschlag, umschlagAusDatei,
  istEntsiegelt, sessionSubKeys,
  // Sub-Depot-Selbstbestimmung (U2-ADR, 01.08.2026) — eigenständiger Passwort-Wechsel + Export
  subDepotEigenerPasswortWechsel, flowSubDepotSelbstbedienung,
  _subSelbstAktionenZeigen, _subSelbstPasswortAendernZeigen, _subSelbstZuruecksetzen,
  _subSelbstUmschlagHalter: () => _subSelbstUmschlag,
  _subSelbstPasswortHalter: () => _subSelbstPasswort,
  // Navigations-Suche (Auftrag Suchfunktion, 01.08.2026)
  _sucheKatalogAufbauen, _sucheTreffer, _sucheVerdrahten, _sucheOeffneSituation,
  SUCHE_ALLTAGSBEGRIFFE, SUCHE_QUELLE_LABEL,
  // Strang 3 / Commit B — Sub-Depot-Akzentfarbe (Palette + Laufzeit-Variabilisierung)
  SUBDEPOT_PALETTE, subDepotAkzentToken, setzeSubDepotAkzent, entferneSubDepotAkzentOverride,
  // Strang 3 / Commit C — Auswahl-UI + pro-Farbe-Textfarbe (D28)
  SUBDEPOT_FARB_NAMEN, subDepotTextFarbe, subDepotAkzentStark,
  subDepotAkzentLinie: (typeof subDepotAkzentLinie !== 'undefined' ? subDepotAkzentLinie : undefined),
  // White-Label-Akzent (12.09.2026, Nutzer-Rückmeldung) — freier Hex neben den acht benannten Tönen
  subDepotAkzentIstHex: (typeof subDepotAkzentIstHex !== 'undefined' ? subDepotAkzentIstHex : undefined),
  subDepotAkzentFarbe: (typeof subDepotAkzentFarbe !== 'undefined' ? subDepotAkzentFarbe : undefined),
  subDepotAkzentPapierLinie: (typeof subDepotAkzentPapierLinie !== 'undefined' ? subDepotAkzentPapierLinie : undefined),
  naechsterFreierAkzent, farbwahlAuswahlHTML,
  subDepotNeuVersiegeln, subKontextBetreten, subKontextVerlassen,
  subDepotNieBetreten: (typeof subDepotNieBetreten !== 'undefined' ? subDepotNieBetreten : undefined),
  aktiverSubName, imSubKontext, ankerDaten,
  sicherungskopieToastText: (typeof sicherungskopieToastText !== 'undefined' ? sicherungskopieToastText : undefined),
  vollmachtBannerHTML, flowSubKontextBetreten, flowSubKontextVerlassen,
  getAktiverSubKontext: () => aktiverSubKontext,
  setzeSitzungsAkteur, aktuellerSitzungsAkteur, akteurSelbstErklaeren,
  inhaberAkteurEtablieren, _inhaberPersonIdFinden,   // Wiedereintritts-Akteur (U2-ADR-005-Folge)
  personSicherstellen, provenancEintrag, urheberschaftAnhaengen,
  liesUrheberschaft, sektorFeldSetzen, codeSlotSicherstellen, liesCode, akteurName,
  // A475 — zwei Fassungen desselben Depots zusammenführen (Erkennen + Anwenden, reine Kern-
  // Fkt.). Guard wie bei textsatzRechtsraumAktiv: ein historischer Kern (docx-streichung-
  // gegenprobe.test.js lädt Commit 3df1b23) kennt diese Funktionen noch nicht.
  fassungenVergleichen: (typeof fassungenVergleichen !== 'undefined' ? fassungenVergleichen : undefined),
  fassungenZusammenfuehren: (typeof fassungenZusammenfuehren !== 'undefined' ? fassungenZusammenfuehren : undefined),
  fassungenHabenAbweichung: (typeof fassungenHabenAbweichung !== 'undefined' ? fassungenHabenAbweichung : undefined),
  // A464/A465 — Größen-/Schachtelungstiefen-Mechanismus (gebaut, nicht verdrahtet). Gleicher
  // Guard-Grund wie bei fassungenVergleichen: ein historischer Kern kennt ihn noch nicht.
  _modulTiefe: (typeof _modulTiefe !== 'undefined' ? _modulTiefe : undefined),
  _modulGroesseTiefePruefen: (typeof _modulGroesseTiefePruefen !== 'undefined' ? _modulGroesseTiefePruefen : undefined),
  _MODUL_EINLASS_MAX_BYTES: (typeof _MODUL_EINLASS_MAX_BYTES !== 'undefined' ? _MODUL_EINLASS_MAX_BYTES : undefined),
  _MODUL_EINLASS_MAX_TIEFE: (typeof _MODUL_EINLASS_MAX_TIEFE !== 'undefined' ? _MODUL_EINLASS_MAX_TIEFE : undefined),
  ankerNameAusIdentitaetSpeisen,
  // „Ausdrücklich keine" (Auftrag 12.08.2026)
  ausdruecklichKeineGesetzt, ausdruecklichKeineDatum, ausdruecklichKeineSetzen,
  ausdruecklichKeineZeileHTML, _ausdruecklichKeineErlaubt, _wertGiltAlsBefuellt,
  // Nutzer-gewählte Sensibilität (Schema 21) — sensibelFeldUmschalten/darfSensibelMarkieren
  // entfernt mit dem Feldzeilen-Knopf („Herausgabe ohne Kästchen", 12.08.2026, Zug 5)
  feldSensibelMarkiert, feldIstSensibel, sensibelFeldSetzen, unterfeldIstSensibel, feldSensibelUeberschreibung,
  // Export-Durchgang: Transparenz-Übersicht + Pro-Bereich-Export (PDF / maschinenlesbar / QR)
  exportUebersichtModell, exportUnstimmigeFelder, flowExportUebersicht, flowHerausgeben, flowHerausgebenZentral, exportAuswahlEphemerAnwenden,
  // Befund 2 („Die Ausgabewege, an denen die Prüfung vorbeiläuft", 12.08.2026)
  _unstimmigeFelderAusPaaren, _unstimmigWarnenMitFundenDannFortfahren, _situationUnstimmigePaare,
  // 22.09.2026: typeof-gesichert, damit ein historischer Kern (KERN_HTML_PATH) ohne diese Funktionen weiter lädt.
  _unstimmigFundText: (typeof _unstimmigFundText !== 'undefined' ? _unstimmigFundText : undefined),
  _unstimmigFundeText: (typeof _unstimmigFundeText !== 'undefined' ? _unstimmigFundeText : undefined),
  geheZuNotfall,   // U2-ADR-059 (Rest — renderNotfall/notfallKernModell/flow*/importFormat* — steht schon weiter unten im Hook)
  _bereichSektionenModell, bereichVollModell, flowBereichPdf, _bereichPdfToastText,
  pruefzifferHinweis, pruefzifferArtFuer, _steueridPlausibel, _kvnrPlausibel, _rvnrPlausibel, _ibanPlausibel,
  kennungBauen, kennungZerlegen, kennungAusSelektor, kennungZuSelektor, kennungFeldDef, kennungPruefen,
  formatKennung, formatKennungAufloesen, formatHerkunftKennung,
  anlassDef, anlassEintraege, anlassKennungen, anlassDatensatz, anlassPdfModell, anlassQrTeile, anlassAusgaben, anlassVertretung,
  _datensatzAusEintraegen,
  zusammenstellungDatensatz, flowAnlassExport, anlaesseMitDaten, flowHerausgebenZentral,
  zusammenstellenTreffer, zusammenstellungAuswahl, zusammenstellungAufnehmen, zusammenstellungEntfernen,
  zusammenstellungZuruecksetzen, zusammenstellungFeldFuellen, zusammenstellungSpeichern, zusammenstellungenLesen,
  renderZusammenstellen, oeffneZusammenstellen, flowZusammenstellungHerausgeben,
  anfragenOrtModell, anfragenOrtHTML, anfragenListe, ANFRAGE_ZUSTAENDE,
  // Kette, Auftrag 7 (20.08.2026) — die Anfrage von aussen
  ANFRAGE_FORMAT_ID, ANFRAGE_FORMAT_VERSION, ANFRAGE_SCHLUESSEL, ANFRAGE_FELD_SCHLUESSEL,
  ANFRAGE_ANTWORT_ARTEN, ANFRAGE_WERT_SCHLUESSEL, ANFRAGE_LINK_MARKE,
  anfragePruefen, anfrageAbgelaufen, anfrageAbgleich, anfrageFeldNachtragen, anfrageAntwortDatensatz,
  anfrageSignaturPruefen, anfrageBestaetigungModell, anfrageAusText,
  anfrageZustand, anfrageMerken, anfrageBeantwortetVermerken, anfrageEinstiegSchritte,
  anfrageEintragFuerId, oeffneAnfrage, renderAnfrage, flowAnfrageEmpfangen, flowAnfrageAntworten,
  flowAnfrageEinstieg, anfrageAusAdresseVielleicht,
  // A378 (20.08.2026) — der Code-Fall: die Form einer Angabe reist mit
  codeSystemPruefen, _codeFormLesen,
  // Kette, Auftrag 8 (20.08.2026) — der verschlüsselte Rückweg
  ANTWORT_FORMAT_ID, ANTWORT_FORMAT_VERSION, ANTWORT_VERFAHREN, ANTWORT_ECDH_KURVE, ANTWORT_HKDF_INFO,
  _antwortAad, antwortVerschluesselnPasswort, antwortEntschluesselnPasswort,
  antwortVerschluesselnSchluessel, antwortEntschluesselnSchluessel,
  antwortVerschluesseln, istAntwortUmschlag,
  qrTeileZusammensetzen, anfrageAusTeilen, anfrageAusEingabe,
  _anfrageAntwortAusgeben, _anfrageAntwortSchreiben,
  modulFassungEntscheiden, _vorlageAbgelaufen, _vorlageDokAusgabe,
  qrTeilePacken, _qrRahmenParsen, _qrGruppenId, QR_TEIL_MAX,
  // An EUDI-Wallet übergeben (Best-Effort SD-JWT-VC-Serialisierung, vorläufig)
  EUDIW_SD_JWT_TYP, EUDIW_SD_HASH_ALG, EUDIW_MIME,
  _eudiwDisclosure, _eudiwDigest, eudiwSdJwtVcSerialisieren, eudiwOid4vpWrapper,
  eudiwDefFuerSektor, flowEudiwUebergabe, _eudiwDateiname,
  datumKurz, urheberschaftZeileHTML, aktuellerAnkerName, stempelName,
  personHinzufuegen, personAktualisieren, personName, personenVorschlag,
  personLoeschen, personReferenzStellen, menschenRegisterHTML, MENSCHEN_REGISTER_FELD,
  // Glied 2 (18.08.2026): das fuenfte Merkmal stellenRegister (KEINE Backticks hier, s. Hinweis oben)
  stellenRegisterHTML, flowStelleRegisterNeu,
  _referenzStellenListeHTML, _referenzStellenVerdrahten,   // M3 (Auftrag M3/M4, 09.08.2026)
  flowPersonRegisterNeu, flowPersonRegisterBearbeiten, flowPersonRegisterEntfernen,
  menschRegisterZeile,
  // „Volle Personalie" (F8, Freigabe vom 10.08.2026)
  personVollzeile, _identitaetPersonalienSatz, _identitaetLuecken, _identitaetKernVollstaendig,
  _identitaetLueckenHinweisHTML,
  // U2-ADR-023 — rechenbares Alter / abgeleitete Minderjährigkeit + Kinder-Live-Filter
  personGeburtsjahr, personAlter, minderjaehrigkeit, kinderMitStatus, kinderGefiltert,
  // U2-ADR-109: berechneter §-1358-Ablauf + das Sichtbarkeits-Praedikat (jetzt mit verborgenWenn).
  notvertretungAblaufText, feldSichtbar,
  // W-7, Zug 3 (09.08.2026) — vier berechnete Fristen. Die vier Einzelfunktionen sind mit
  // A419 Weg 2 (21.08.2026) entfallen: die Regeln stehen deklarativ an den Felddefinitionen.
  _fristHinweisFuerFeld, _fristPlusWerktage, _fristPlusWochen, _fristPlusMonate,
  FELD_FRIST_DAUERN, feldFristRegelPruefen,
  // U2-ADR-110: der Datums-Einstieg selbst — die Probe fragt ihn DIREKT, statt sein Verhalten
  // ueber zwei Zwischenschichten zu erschliessen.
  _heuteTeile,
  // U2-ADR-111: das generische Wechselmoment-Praedikat und sein Buerger-Text.
  zeileVerwaisteFelder, wechselmomentText, importSichtbarkeitsHinweise,
  // U2-ADR-036 — Kind-Verhältnisse: Sorgerecht-Entdopplung, Roll-up, verlustfreie Migration, Export-Guard
  schutzbefohleneRollupHTML, SORGERECHT_LABEL, _kindVerhaeltnisseMigrieren, _SORGERECHT_ENUM, depotNormalisieren,
  // Schnitt Glied 3 (A448, U2-ADR-161) — Korb 1 mehrwertig. typeof-Guard: load-kern ist
  // versionsgebunden — ein historischer Kern vor diesem Glied kennt diese Namen nicht, und ein
  // bloßes Bezeichner-Shorthand wuerfe hier ReferenceError statt undefined zu liefern
  // (docx-streichung-gegenprobe.test.js laedt echte Alt-Commits).
  _korb1MehrwertigMigrieren: (typeof _korb1MehrwertigMigrieren !== 'undefined' ? _korb1MehrwertigMigrieren : undefined),
  _KORB1_GRUPPEN: (typeof _KORB1_GRUPPEN !== 'undefined' ? _KORB1_GRUPPEN : undefined),
  _feldVerifiziertStaemmig, _letzterStempel,
  institutionHinzufuegen, institutionAktualisieren, institutionName, institutionenVorschlag, institutionFinden,
  institutionReferenzStellen, flowInstitutionBearbeiten,   // A210 (Auftragskette 14.08.2026, Glied 9)
  RECHTSGRUNDLAGEN_VERTRETUNG,
  entitaetAnzeige, PERSON_ROLLEN, INSTITUTION_ART, CROSS_SEKTOR_FELDER,
  bankvollmachtAnzeige, bankvollmachtVorschlag,
  MAPPE_BEREICH_DEFAULT, mappeEintragHinzufuegen, mappeEintrag, mappeName, mappeEntfernen,
  // U2-ADR-045/048 — autoritative Original-Ablage (eu-lab-Laborbefund + eu-hdr-Entlassbrief verbatim)
  importAutoritativDokument, _istAutoritativesMedDokument, _autoritativesMedDokumentTyp, _medDokAussteller,
  FHIR_LAB_DOC_IG, FHIR_HDR_DOC_IG, FHIR_IPS_DOC_IG,
  // U2-ADR-049 — Feld-Übernahme aus dem autoritativen Original (nur Typen mit uebernahmeFormat, heute IPS)
  medDokFelderPlan, _autoritativKlartext,
  // U2-ADR-086 — Klasse-4-Datei-Export (Durchreiche): Original unverändert herunterladen
  flowMappeOriginalHerunterladen,
  _fhirNarrativeSicher, _fhirDokumentNarrativeHTML, _fhirDokumentNarrativObjekt,   // U2-ADR-076: FHIR-Narrative-Renderer + Sanitizer + Alles-oder-nichts
  _fhirObservationHTML, _fhirDokumentAnsichtHTML,     // U2-ADR-076 Nachtrag: Observation-Darstellung + kombiniert
  // U2-ADR-047 — SHL-Provider (Offline-Teil): JWE + shlink:/-Payload; Upload = offener Stub
  _jweCompactDir, shlProviderPayload, shlUriBauen, shlDateiHochladen, shlProviderErzeugen, SHL_URI_PRAEFIX,
  flowShlVorbereiten,
  // Yellow-Button-Zeichen an der Funktion (Nachtrag U2-ADR-400, 16.09.2026) — typeof-abgesichert fuer aeltere Kern-Fassungen.
  ybZeichenHTML: (typeof ybZeichenHTML !== 'undefined' ? ybZeichenHTML : undefined),
  depotGroesseBytes, groesseLesbar, oeffneMappe, renderMappe, mappeBereichLabel,
  oeffnePrueftermine, renderPrueftermine,
  prueftermineDokumente, prueftermineDokumenteOhneTermin, prueftermineSektionHTML, prueftermineSpringeZuDokument, verdrahtePrueftermine,
  mappeListeHTML, mappeSuche, flowMappeVorschau,
  // 16.09.2026 (Sicherheit): Deckblatt und die gemeinsame Quellen-Prüfung der Mappe; typeof für ältere Kerne
  deckblattHTML: (typeof deckblattHTML === 'function' ? deckblattHTML : undefined),
  depotMasterHkdfKey: (typeof depotMasterHkdfKey === 'function' ? depotMasterHkdfKey : undefined),   // U2-ADR-002 (23.09.2026, S1)
  _mappeInhaltAlsQuelle: (typeof _mappeInhaltAlsQuelle === 'function' ? _mappeInhaltAlsQuelle : undefined),
  MAPPE_MAX_KANTE, MAPPE_JPEG_QUALITAET, bildSkalierungsMasse, dataUrlGroesse,
  MAPPE_MAX_BYTES, dataUrlZuBlob, mappeDateiAufnehmen, flowMappeOriginalHerunterladen, flowMappeEigenesHerunterladen,
  // „Speichergrenzen" (12.08.2026): Gesamt-Depot-Warnschwelle/harte Grenze.
  MAPPE_GESAMT_WARNSCHWELLE_BYTES, MAPPE_GESAMT_HARTE_GRENZE_BYTES,
  mappeBereichKnopfreiheHTML, flowMappeMetadaten, mappeVorschlag, mappeRefAnzeigeHTML,
  feldWertHTML, feldInputHTML,
  crossSektorAnmelden,
  SITUATIONEN, SITUATION_BY_ID, SITUATION_FELD_EXPORT, situationFeldExportAnmelden,
  BAUSTEINE, AUSSER_BETRACHT,          // Lebenslagen-Katalog (A58/T5, 29.07.2026 in den Kern gezogen)
  // typeof-abgesichert: die Vergleichsprobe docx-streichung-gegenprobe laedt einen aelteren Kern (3df1b23), der es nicht kennt.
  renderAngehoerigenBlatt: (typeof renderAngehoerigenBlatt !== 'undefined' ? renderAngehoerigenBlatt : undefined),
  // A383 (20.08.2026) — die eigene Liste der Angehoerigen-Sicht. Ausgegeben, damit die Probe
  // die ENTKOPPLUNG am Gegenstand prueft und nicht an einer zweiten Fassung davon.
  _ANG_CACHE_ERLAUBT,
  // A361 (20.08.2026) — die Lese-Stelle des einen verschachtelten STRINGS-Schluessels.
  importKlartextFuer,
  // A384 (20.08.2026) — der Wegweiser des Anstosses. Ausgegeben, damit die Probe die
  // ABLEITUNG prueft und nicht eine nachgebaute zweite Fassung davon.
  lageBerichteteBereiche, vorgeschlageneLageBannerHTML,
  akutZeileHTML,
  situationFeldSetzen, liesSituation, renderSituation, situationSektorZeileHTML,
  feldWertText, situationModell, situationPdfMeta, flowSituationPdf, pdfFussText,
  vollDepotModell, vollDepotPdfMeta, zeichneVollDepotPdf, flowVollDepotPdf,
  zeichneSituationPdf,
  // Eingebettete Datenfassung im PDF — reine Textbaustein-Helfer hier (node:test, schnell);
  // der Anhang selbst braucht echtes jsPDF, s. tests/e2e/pdf-datenfassung-anhang.spec.js.
  _pdfUtf8AlsBinaerstring: (typeof _pdfUtf8AlsBinaerstring !== 'undefined' ? _pdfUtf8AlsBinaerstring : undefined),
  _pdfStringEscape: (typeof _pdfStringEscape !== 'undefined' ? _pdfStringEscape : undefined),
  _pdfModDatum: (typeof _pdfModDatum !== 'undefined' ? _pdfModDatum : undefined),
  /* A4 (22.08.2026): Umbruch je Zeile — der Helfer, den alle vier Zeichenwege rufen.
     TOLERANT abgefragt, weil load-kern VERSIONSGEBUNDEN ist: docx-streichung-gegenprobe
     laedt ueber KERN_HTML_PATH einen Kern von vor dieser Nacht, und dort gibt es den Namen
     nicht — eine nackte Nennung waere dort ein ReferenceError beim Laden, nicht erst beim
     Aufruf. (KEINE Backticks in diesem Kommentar: der Block steht in einem Template-String,
     ein Backtick schliesst ihn und macht die ganze Datei zum Syntaxfehler.) */
  pdfZeilenZeichnen: (typeof pdfZeilenZeichnen === 'function' ? pdfZeilenZeichnen : undefined),
  // U2-ADR-263 — reine, in Node ohne window.jspdf testbare Funktionen der Schriftdeckung-Pruefung.
  pdfZeichenOhneDeckung: (typeof pdfZeichenOhneDeckung === 'function' ? pdfZeichenOhneDeckung : undefined),
  _pdfSchriftPruefungInstallieren: (typeof _pdfSchriftPruefungInstallieren === 'function' ? _pdfSchriftPruefungInstallieren : undefined),
  // PDF-Kästchen als Vektor (25.09.2026) — tolerant wie oben (versionsgebunden), s. tests/pdf-kaestchen-vektor.test.js.
  PDF_KAESTCHEN: (typeof PDF_KAESTCHEN !== 'undefined' ? PDF_KAESTCHEN : undefined),
  _pdfKaestchenMass: (typeof _pdfKaestchenMass === 'function' ? _pdfKaestchenMass : undefined),
  _pdfSchriftLueckenBuendeln: (typeof _pdfSchriftLueckenBuendeln === 'function' ? _pdfSchriftLueckenBuendeln : undefined),
  pdfZeichenUnterstuetzt: (typeof pdfZeichenUnterstuetzt === 'function' ? pdfZeichenUnterstuetzt : undefined),
  PDF_WINANSI_ZUSATZ: (typeof PDF_WINANSI_ZUSATZ !== 'undefined' ? PDF_WINANSI_ZUSATZ : undefined),
  // U2-ADR-263-Nachtrag (13.09.2026, PDF-CI) — Sub-Depot-Farbe im PDF. Die Einbettung selbst
  // (addFileToVFS/addFont) ist seit U2-ADR-097-Nachtrag (14.09.2026) kein Kern-Export mehr —
  // sie läuft im vendorten inter-pdf-font-Block, s. tests/pdf-inter-einbetten.test.js.
  _PDF_MARKE_SCHRIFT: (typeof _PDF_MARKE_SCHRIFT !== 'undefined' ? _PDF_MARKE_SCHRIFT : undefined),
  _pdfSubAkzentPrimaerRgb: (typeof _pdfSubAkzentPrimaerRgb === 'function' ? _pdfSubAkzentPrimaerRgb : undefined),
  _SUBDEPOT_PALETTE_HEX: (typeof _SUBDEPOT_PALETTE_HEX !== 'undefined' ? _SUBDEPOT_PALETTE_HEX : undefined),
  _subDepotAkzentHexAufgeloest: (typeof _subDepotAkzentHexAufgeloest === 'function' ? _subDepotAkzentHexAufgeloest : undefined),
  // Marke-Achse-Plan §5/§6 Schritt 6 (14.09.2026) — Sub-Depot-Partner-Palette, Rangfolge-Vorbau.
  _subdepotPartnerPaletteGueltig: (typeof _subdepotPartnerPaletteGueltig === 'function' ? _subdepotPartnerPaletteGueltig : undefined),
  _subdepotPaletteAktiv: (typeof _subdepotPaletteAktiv === 'function' ? _subdepotPaletteAktiv : undefined),
  _subDepotAkzentAlsHexOderNull: (typeof _subDepotAkzentAlsHexOderNull === 'function' ? _subDepotAkzentAlsHexOderNull : undefined),
  AB_WERK_SUBDEPOT_PALETTE_PRODUKT: (typeof AB_WERK_SUBDEPOT_PALETTE_PRODUKT !== 'undefined' ? AB_WERK_SUBDEPOT_PALETTE_PRODUKT : undefined),
  _SUBDEPOT_PARTNER_MIN_KONTRAST: (typeof _SUBDEPOT_PARTNER_MIN_KONTRAST !== 'undefined' ? _SUBDEPOT_PARTNER_MIN_KONTRAST : undefined),
  fhirIpsBundle, flowGesundheitFhirExport, flowSektorExport,
  BEZIEHUNGS_CODES, BEZIEHUNG_ROLECODE_SYSTEM, BEZIEHUNG_NULLFLAVOR_SYSTEM,   // U2-ADR-079 — delegierte RelatedPerson-Codierung
  dateiMitMagic, magicStrippen, DATEI_MAGIC_PREFIX,
  oeffneSituation, oeffneSektorFeld,
  // Wizard-Maschine (Teil 2)
  WIZARDS, WIZARD_BY_ID, wizardLauf, renderWizard, wizardDefAktiv,
  // U2-ADR-341 (06.09.2026) — typeof-geschuetzt (Muster: _situationIndexHalter oben),
  // weil ein historischer Kern-Stand (KERN_HTML_PATH auf einen aelteren Commit) diese
  // Funktion noch nicht kennt. Ungeschuetzt bricht load-kern.js selbst am ReferenceError,
  // bevor der Vergleich zweier Kerne (z. B. docx-streichung-gegenprobe.test.js,
  // u2-adr-257-format-schreiber.test.js) je zum eigentlichen Test kommt — gemessen, nicht
  // angenommen: im Gate real getroffen.
  _wizardOptionenAusMaterialisieren:
    (typeof _wizardOptionenAusMaterialisieren !== 'undefined') ? _wizardOptionenAusMaterialisieren : undefined,
  wizardZielLesen, wizardZielSetzen, wizardSchrittZiel, wizardTascheLesen,
  wizardFortschritt, wizardHatDaten, wizardSichtbareIndizes, wizardSchrittVerborgen,
  wizardZielBereichNamen, _wizZieleSatz,   // Finding 13 (Zielbereiche vor Schritt 1)
  wizardSchrittSetzen, wizardSchrittSpeichern, wizardFehlerText,
  wizardWeiter, wizardZurueck, wizardAbbrechen, wizardAbschluss,
  wizardStartHTML, waehleAnlass,
  // SIT2b: die Kacheln der Situationen kommen aus dem Template — ANLAESSE ist für Proben die fertige Liste (typeof: ältere Kerne).
  get ANLAESSE() { return (typeof anlaesseAlle === 'function') ? anlaesseAlle() : ANLAESSE; },
  anlaesseAlle: (typeof anlaesseAlle === 'function' ? anlaesseAlle : undefined),
  _situationModulAbWerkSeed: (typeof _situationModulAbWerkSeed === 'function' ? _situationModulAbWerkSeed : undefined),
  _abWerkMitschriftAusLebendemTemplateFuellen: (typeof _abWerkMitschriftAusLebendemTemplateFuellen === 'function' ? _abWerkMitschriftAusLebendemTemplateFuellen : undefined),
  renderBestandsAuswahl, waehleLage, oeffneBestandsAuswahl,   // A61 — Achse „Bestand", umgezogen 04.08.2026
  // PV-Dokument (BMJ-Zusammensteller, PV-Bau 10.07.): eine Quelle PV_BMJ für Wizard + Generator
  PV_BMJ, pvDokumentAbschnitte, pvDokumentHTML, pvDokumentOeffnen, _pvOptLabel, _pvRolleLabel, _pvEingangsformel, _pvHatDaten, _pvIstSentinel,
  // U2-ADR-345 (06.09.2026) — Dokumentmodule + STANDARD_VORLAGEN ins Bündel: Motor-Mechanismus,
  // typeof-geschuetzt wie _wizardOptionenAusMaterialisieren oben, weil ein aelterer Kern-Stand
  // (KERN_HTML_PATH) diese Namen noch nicht kennt.
  DOKUMENT_MODUL_MOTOREN_ERLAUBT: (typeof DOKUMENT_MODUL_MOTOREN_ERLAUBT !== 'undefined' ? DOKUMENT_MODUL_MOTOREN_ERLAUBT : undefined),
  _dokumentModulAusBuendelErzeugen: (typeof _dokumentModulAusBuendelErzeugen !== 'undefined' ? _dokumentModulAusBuendelErzeugen : undefined),
  // U2-ADR-NNN2 (17.09.2026): _standardVorlageAusBuendelErzeugen entfernt (A253 fand sie
  // unerreichbar — STANDARD_VORLAGEN kommt seither direkt aus AB_WERK_BASISTEMPLATE_DE, kein
  // "roh"-Objekt mehr zu materialisieren). Kein Export mehr, keine typeof-Rückwärtskompatibilität
  // nötig — kein Test lud einen historischen Kern dafür.
  _dokumentModuleUndVorlagenAusBuendelMaterialisieren: (typeof _dokumentModuleUndVorlagenAusBuendelMaterialisieren !== 'undefined' ? _dokumentModuleUndVorlagenAusBuendelMaterialisieren : undefined),
  // Geteilter Dokument-Generator (Modul-Vertrag, U2-ADR-068): Engine + Blocktyp-Handler + PV-Instanz
  modulDokumentAbschnitte,
  // U2-ADR-333: die Zahl der unuebersetzten Passagen — gemessen, nicht gefuehrt
  _dokumentUnuebersetzteStellen: (typeof _dokumentUnuebersetzteStellen !== 'undefined' ? _dokumentUnuebersetzteStellen : undefined), MODUL_BLOCK_HANDLER, modulSichtbar, PV_MODUL,
  // KI-Verfügung „Verfügung zur digitalen Nachbildung" (U2-ADR-069): zweite Generator-Instanz (Testament-Anlage)
  KI_KORPUS, KI_MODUL, kiDokumentAbschnitte, kiDokumentHTML, _kiOptLabel, _kiEingangsformel, _kiHatDaten,
  // Vollmacht (Auftrag Vollmacht/Betreuung-Generatoren, 01.08.2026) — dritte Modul-Vertrag-
  // Instanz, erste zeilenscharfe (mehrfach:true)
  VOLLMACHT_BMJ, VOLLMACHT_MODUL, vollmachtDokumentAbschnitte, vollmachtDokumentHTML, vollmachtDokumentOeffnen,
  _vmZeile, _vmOptLabel, _vmIstSentinel, _vmZeileHatDaten, _vmEingangsformel,
  // Betreuungsverfügung (Auftrag Vollmacht/Betreuung-Generatoren, 01.08.2026, Zug 2) — vierte
  // Modul-Vertrag-Instanz, mehrfach:false wie PV/KI
  BETREUUNG_MODUL, betreuungDokumentAbschnitte, betreuungDokumentHTML, betreuungDokumentOeffnen,
  _bvZeile, _bvSektorDaten, _bvEingangsformel, _bvHatDaten,
  // Erbschein-Vorbereitungsauszug (Auftrag 27.08.2026) — Zug 1
  ERBSCHEIN_MODUL: (typeof ERBSCHEIN_MODUL !== 'undefined' ? ERBSCHEIN_MODUL : undefined),
  _erbscheinSektorDaten: (typeof _erbscheinSektorDaten !== 'undefined' ? _erbscheinSektorDaten : undefined),
  erbscheinAuszugSektionHTML: (typeof erbscheinAuszugSektionHTML !== 'undefined' ? erbscheinAuszugSektionHTML : undefined),
  erbscheinAuszugXML: (typeof erbscheinAuszugXML !== 'undefined' ? erbscheinAuszugXML : undefined),
  flowErbscheinXmlSichern: (typeof flowErbscheinXmlSichern !== 'undefined' ? flowErbscheinXmlSichern : undefined),
  // Vorlagen-Sprache — Siebtes Register, Zug 1 (27.08.2026)
  bedingungAuswerten: (typeof bedingungAuswerten !== 'undefined' ? bedingungAuswerten : undefined),
  formatSchemaAnwenden: (typeof formatSchemaAnwenden !== 'undefined' ? formatSchemaAnwenden : undefined),
  datenSchemaLesen: (typeof datenSchemaLesen !== 'undefined' ? datenSchemaLesen : undefined),
  _codeListeLabelLesen: (typeof _codeListeLabelLesen !== 'undefined' ? _codeListeLabelLesen : undefined),
  // U2-ADR-366 Teil 1: die Ausgabe wird zur Antwort auf ein benanntes Template (07.09.2026)
  antwortAufTemplateErzeugen: (typeof antwortAufTemplateErzeugen !== 'undefined' ? antwortAufTemplateErzeugen : undefined),
  antwortPasstZuTemplate: (typeof antwortPasstZuTemplate !== 'undefined' ? antwortPasstZuTemplate : undefined),
  _datenSchemaFelderBekannt: (typeof _datenSchemaFelderBekannt !== 'undefined' ? _datenSchemaFelderBekannt : undefined),
  // Instrument-Modul-Registry (U2-ADR-070): sechs Module (PV, Vollmacht, Betreuung, KI voll; zwei leer) für Bild C
  VORSORGE_MODULE, VORSORGE_MODUL_BY_ID, modulIstLeer, moduleMitGenerator,
  // K8 (Auftrag K8/S9, 09.08.2026): eine Ausgabeschicht statt vier
  dokumentHTML, dokumentOeffnen,
  dokSignaturHTML: (typeof dokSignaturHTML !== 'undefined' ? dokSignaturHTML : undefined),
  // Siebtes Register, Zug 1 (27.08.2026): logikModul-Aufloesung neben VORSORGE_MODULE/Vorlagen
  _modulOderVorlage: (typeof _modulOderVorlage !== 'undefined' ? _modulOderVorlage : undefined),
  _logikModulGenerator: (typeof _logikModulGenerator !== 'undefined' ? _logikModulGenerator : undefined),
  // U2-ADR-288 (05.09.2026): Ab-Werk-Einlass des Erbschein-Vorbereitungsauszugs
  _erbscheinVorbereitungAbWerkEinlassen: (typeof _erbscheinVorbereitungAbWerkEinlassen !== 'undefined' ? _erbscheinVorbereitungAbWerkEinlassen : undefined),
  ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT: (typeof ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT !== 'undefined' ? ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT : undefined),
  // S9 (Auftrag K8/S9, 09.08.2026): das Dokument wird eine Datei
  // „Nur PDF" (10.08.2026): dokumentHTMLDatei entfernt, s. Vermerk in vivodepot.html.
  zeichneDokumentPdf, flowDokumentDateiSichern,
  // U2-ADR-263: ersetzt dokumentPdfBlob (geloescht, keine Aufrufer mehr) fuer die
  // Nur-PDF-MIME-Typ-Probe — liest jetzt den lebenden Zeichenweg statt einer toten Kopie.
  _dokumentPdfMitPruefung: (typeof _dokumentPdfMitPruefung !== 'undefined' ? _dokumentPdfMitPruefung : undefined),
  flowDokumentInMappeAblegen, _dokumentWirksamkeitPlain, _dokumentDateiname, _blobZuDataUrl,
  // U2-ADR-089 Teil A Block 1 (17.07.): Vorsorge-Instrument-Liste — Einzigartigkeits-Policy +
  // Speicher-Sperre + generalisierte Existenz-Prüfung
  _instrumentEinzigartig, _instrumentVorhanden, _listenEintragPruefen,
  _vorsorgevollmachtVorhanden, _bankvollmachtRecords, _vollmachtArtLabel,
  // Bild C (U2-Auftrag 11.07.): Regal + Cross-Sektor-Sichtbarkeit (Weg β, Liste-Projektion)
  modulSichtbarkeitsKarten, sichtbarkeitsKartenHTML, vorsorgeRegalHTML, modulKarteStatus, modulKarteHerkunft,
  nichtInstrumentSprunglisteHTML,
  // Phase 2 (28.08.2026, "Laufzeit-Audit Sprachmodule"): Textsatz-Anbindung für
  // Feldgruppen-Karten-Titel, Dokument-Katalog-Namen/-Hinweise, Datalist-Vorschlagslisten.
  // typeof-abgesichert (wie an anderer Stelle in dieser Datei): ein historischer Kern-Stand
  // (z. B. tests/docx-streichung-gegenprobe.test.js, lädt einen Commit von vor dieser Ergänzung)
  // kennt diese Funktionen noch nicht — ohne die Absicherung würfe der bloße Export-Zugriff.
  _feldgruppeLabelText: typeof _feldgruppeLabelText !== 'undefined' ? _feldgruppeLabelText : undefined,
  _dokumentTextsatzText: typeof _dokumentTextsatzText !== 'undefined' ? _dokumentTextsatzText : undefined,
  _vorschlaegeTextsatz: typeof _vorschlaegeTextsatz !== 'undefined' ? _vorschlaegeTextsatz : undefined,
  // Fund (29.08.2026, xShare-Beleg): Chrome-Nachziehen nach In-Depot-Modul-Einlass —
  // s. Kommentar an der Definition. Ebenso typeof-abgesichert (historischer Kern-Stand).
  _moduleEinlassWirken: typeof _moduleEinlassWirken !== 'undefined' ? _moduleEinlassWirken : undefined,
  // U2-ADR-267 (04.09.2026): die eine Stelle, die entscheidet, ob ein Register-Typ den
  // Unerreichbar-Hinweis bekommt — s. Kommentar an der Definition.
  _modulTypUnwiederbringlichHinweis: typeof _modulTypUnwiederbringlichHinweis !== 'undefined' ? _modulTypUnwiederbringlichHinweis : undefined,
  getVerweisRueckweg: () => _verweisRueckweg,
  getWizardState: () => ({ aktiverWizardId, wizardSchrittIndex, wizardFehlerGrund }),
  // Format-Export (Teil 3)
  EXPORT_FORMATE, EXPORT_FORMAT_BY_ID, vollExportJSON, exportDateiname,
  formatExportInhalt, flowFormatExport,
  // 17.09.2026 (Rundlauf): der Ausgabeweg eines Registry-Formats und seine Leer-Prüfung; typeof für ältere Kerne
  _formatExportDownload: (typeof _formatExportDownload === 'function' ? _formatExportDownload : undefined),
  _credentialOhneClaims: (typeof _credentialOhneClaims === 'function' ? _credentialOhneClaims : undefined),
  // Format-Import (Import-Welle 1) — Spiegelbild der Export-Schicht
  IMPORT_FORMATE, IMPORT_FORMAT_BY_ID, importFormateFuerSektor, _sdJwtVctErkenner,
  VC_IDENTITAET_MAPPING, XOEV_VERWALTUNG_MAPPING, EDCI_BILDUNG_MAPPING,
  importPlan, planOhneUebernahme, importAnwenden, flowEinlesen, flowEinlesenZentral, flowImportDatei, flowImportVorschau,
  importVerwaisteEintraege, importZeileBereinigt,
  renderSubDepotKonzept, oeffneSubKonzept, subKonzeptGrafikSVG, _depotSymbolSVG, _linkSymbolSVG,
  // Sicherheit Block C (Ebene 3a) — eingehende Provider-Zertifikat-Verifikation
  importPlanGeprueft, _planAusRoh,
  importUngueltigNachricht: (typeof importUngueltigNachricht === 'function' ? importUngueltigNachricht : undefined),
  sdJwtKompaktLesen: (typeof sdJwtKompaktLesen === 'function' ? sdJwtKompaktLesen : undefined),
  // 1E Basistemplate-Signatur (U2-ADR-040)
  verifiziereTemplateKette, basisVorlagenVerifizieren, _basisVorlageSichtbar, _gepruefteBasisVorlagen,
  _verifiziereTemplateSignatur, STANDARD_VORLAGEN_CERTS,
  _kanonischJSON, _basisInhalt, _basisInhaltMatcht, STANDARD_VORLAGEN,
  // U2-ADR-NNN2 — STANDARD_VORLAGEN materialisiert sich jetzt aus einem eigenen Ab-Werk-Slot
  // (Muster AB_WERK_RECHTSRAUM_DE/U2-ADR-382), nicht mehr aus BUERGERMODUL_BUENDEL.standardVorlagen.
  // typeof-Waechter wie beim Rechtsraum-Vorbild: historische Kerne vor diesem Zug kennen den
  // Namen nicht.
  AB_WERK_BASISTEMPLATE_DE: (typeof AB_WERK_BASISTEMPLATE_DE !== 'undefined' ? AB_WERK_BASISTEMPLATE_DE : undefined),
  // U2-ADR-NNN2 — dieselbe Bewegung wie oben, für .dokumente und .rechtsraumKatalog (dritter/
  // vierter Register-Umzug desselben Zugs). typeof-Waechter aus demselben Grund.
  AB_WERK_DOKUMENTE_DE: (typeof AB_WERK_DOKUMENTE_DE !== 'undefined' ? AB_WERK_DOKUMENTE_DE : undefined),
  AB_WERK_RECHTSRAUM_KATALOG_QUELLE: (typeof AB_WERK_RECHTSRAUM_KATALOG_QUELLE !== 'undefined' ? AB_WERK_RECHTSRAUM_KATALOG_QUELLE : undefined),
  // U2-ADR-121 — Rechtsraum-Katalog über die Instrument-Typen + geschützter Zugriff (Posten 7)
  // typeof-Wächter (U2-ADR-382-Nachtrag, wie beim benachbarten _rechtsraumVorschlagswert-Export
  // unten): historische Kerne vor der Umbenennung (RECHTSRAUM_KATALOG → AB_WERK_RECHTSRAUM_DE)
  // kennen diesen Namen nicht — eine nackte Referenz würfe dort ReferenceError statt den
  // Vergleich zu Ende zu führen (tests/wizard-optionen-aus-materialisieren-u2-adr-341.test.js
  // lädt genau so einen historischen Kern).
  AB_WERK_RECHTSRAUM_DE: (typeof AB_WERK_RECHTSRAUM_DE !== 'undefined' ? AB_WERK_RECHTSRAUM_DE : undefined),
  _rechtsraumKatalogLesen,
  // U2-ADR-254 — Vorschlagswert aus angedockten Rechtsraum-Modulen (ADR-121 Punkt 2)
  // typeof-Wächter: tests/docx-streichung-gegenprobe.test.js lädt einen historischen Kern
  // (3df1b23, vor diesem Zusatz) mit demselben EXPORT_HOOK — eine nackte Referenz würfe dort
  // ReferenceError statt den Vergleich zu Ende zu führen.
  _rechtsraumVorschlagswert: (typeof _rechtsraumVorschlagswert === 'function' ? _rechtsraumVorschlagswert : undefined),
  // U2-ADR-121 Posten 8 (Zug 6) — Rechtsraum-Modul-Payload-Vertrag
  validateRechtsraumModul, _rechtsraumModulUebersetzen, _rechtsraumModulEinbetten,
  _rechtsraumModuleAusDepotAnmelden, _rechtsraumTypBekannt,
  getRechtsraumModulRegistry: () => _RECHTSRAUM_MODUL_REGISTRY,
  // U2-ADR-401 (11.09.2026) — Widersprüche aus dem letzten _rechtsraumModuleAusDepotAnmelden-Lauf
  getRechtsraumKonflikte: () => (typeof _letzteRechtsraumKonflikte !== 'undefined' ? _letzteRechtsraumKonflikte : undefined),
  // U2-ADR-382 — Ab-Werk-Saat für Rechtsraum DE (Besitz-Zug, wie U2-ADR-367 für Sprache)
  _rechtsraumAbWerkRegistrySeed: (typeof _rechtsraumAbWerkRegistrySeed === 'function' ? _rechtsraumAbWerkRegistrySeed : undefined),
  _rechtsraumKatalogAlsModul: (typeof _rechtsraumKatalogAlsModul === 'function' ? _rechtsraumKatalogAlsModul : undefined),
  // U2-ADR-285 — Gerüst-eigener Ladeweg für "DE" (1E-Basistemplate-Form, Test-Schlüssel-bewiesen)
  _rechtsraumGeruestModulLaden: (typeof _rechtsraumGeruestModulLaden === 'function' ? _rechtsraumGeruestModulLaden : undefined),
  getRechtsraumGeruestRegistry: (typeof _RECHTSRAUM_GERUEST_REGISTRY !== 'undefined' ? () => _RECHTSRAUM_GERUEST_REGISTRY : undefined),
  _RECHTSRAUM_GERUEST_MODUL_CERTS: (typeof _RECHTSRAUM_GERUEST_MODUL_CERTS !== 'undefined' ? _RECHTSRAUM_GERUEST_MODUL_CERTS : undefined),
  // Auftrag „Rechtsraum DE als Modul" (07.09.2026) — Boot-Verdrahtung von Weg A
  _rechtsraumGeruestModulBooten: (typeof _rechtsraumGeruestModulBooten === 'function' ? _rechtsraumGeruestModulBooten : undefined),
  _RECHTSRAUM_GERUEST_MODUL_VIVODEPOT_DE_JWS: (typeof _RECHTSRAUM_GERUEST_MODUL_VIVODEPOT_DE_JWS !== 'undefined' ? _RECHTSRAUM_GERUEST_MODUL_VIVODEPOT_DE_JWS : undefined),
  // 1F Cert-Trennung (U2-ADR-038-Nachtrag/U2-ADR-040): Widerruf + Schonfrist + Ablauf-Vorwarnung
  _jwkThumbprint, WIDERRUFS_LISTE, _veralteteBasisVorlagen, _basisAblaufFaellig, _basisAblaufFruehWert,
  // 1B Bürger-App-Import-UI — Bundle-Aufteilung
  _importEingabeAufteilen,
  // 1C Multi-Typ-Validator (Empfänger, additiv)
  validateTemplate,
  // U2-ADR-037 Stufe 2 — Vokabular-Übersetzer + Namensraum-Schutz
  _templateFelderUebersetzen, _templateFeldZuModell, _tplFeldId, _codeSystemId, _TEMPLATE_FELDID_PRAEFIX,
  // U2-ADR-290 — die Feld-/Assistenten-Rollenlisten. Die Proben halten sie gegen die
  // Modul-Erlaubnis; ohne Export waere die Ratsche blind statt rot.
  TEXTSATZ_ARTEN_FELD: (typeof TEXTSATZ_ARTEN_FELD !== 'undefined' ? TEXTSATZ_ARTEN_FELD : undefined),
  TEXTSATZ_ARTEN_ASSISTENT: (typeof TEXTSATZ_ARTEN_ASSISTENT !== 'undefined' ? TEXTSATZ_ARTEN_ASSISTENT : undefined),
  // U2-ADR-282 — die Erste-Partei-Zone. typeof-abgesichert wie die Nachbarn: ein Kern ohne
  // sie (aeltere Fassung im Vergleichslauf) soll nicht am Export scheitern.
  erstePartieFeldDefsPruefen: (typeof erstePartieFeldDefsPruefen !== 'undefined' ? erstePartieFeldDefsPruefen : undefined),
  // U2-ADR-303 — der Aufrufer auf die Erste-Partei-Zone. typeof-abgesichert wie die
  // Nachbarn: ein aelterer Kern im Vergleichslauf soll nicht am Export scheitern.
  buergermodulBuendelAnwenden: (typeof buergermodulBuendelAnwenden !== 'undefined' ? buergermodulBuendelAnwenden : undefined),
  // U2-ADR-307 — die Rechtsraum-Ueberlagerung fuer Feld-Fristen.
  rechtsraumFristUeberlagerungSetzen: (typeof rechtsraumFristUeberlagerungSetzen !== 'undefined' ? rechtsraumFristUeberlagerungSetzen : undefined),
  _rechtsraumFristRegel: (typeof _rechtsraumFristRegel !== 'undefined' ? _rechtsraumFristRegel : undefined),
  // U2-ADR-314 — der Spiegel fuer den Gueltigkeits-Vorschlag, aus demselben Slot.
  _rechtsraumGueltigkeitVorschlag: (typeof _rechtsraumGueltigkeitVorschlag !== 'undefined' ? _rechtsraumGueltigkeitVorschlag : undefined),
  feldGueltigkeitVorschlagPruefen: (typeof feldGueltigkeitVorschlagPruefen !== 'undefined' ? feldGueltigkeitVorschlagPruefen : undefined),
  feldGueltigkeitVorschlag: (typeof feldGueltigkeitVorschlag !== 'undefined' ? feldGueltigkeitVorschlag : undefined),
  _fristHinweisFuerFeld: (typeof _fristHinweisFuerFeld !== 'undefined' ? _fristHinweisFuerFeld : undefined),
  feldFristRegelPruefen: (typeof feldFristRegelPruefen !== 'undefined' ? feldFristRegelPruefen : undefined),
  _buendelBereichZuFeldDefs: (typeof _buendelBereichZuFeldDefs !== 'undefined' ? _buendelBereichZuFeldDefs : undefined),
  BUERGERMODUL_BUENDEL: (typeof BUERGERMODUL_BUENDEL !== 'undefined' ? BUERGERMODUL_BUENDEL : undefined),
  // Fuer die rote Gegenprobe: der Depot-Ladeweg und sein Verwerfungs-Protokoll.
  _bereichsModuleAusDepotAnmelden: (typeof _bereichsModuleAusDepotAnmelden !== 'undefined' ? _bereichsModuleAusDepotAnmelden : undefined),
  _textGetterAnhaengen: (typeof _textGetterAnhaengen !== 'undefined' ? _textGetterAnhaengen : undefined),
  BEREICHS_MODUL_VERWORFEN: (typeof BEREICHS_MODUL_VERWORFEN !== 'undefined' ? BEREICHS_MODUL_VERWORFEN : undefined),
  _BUERGERMODUL_BUENDEL_BERICHT: (typeof _BUERGERMODUL_BUENDEL_BERICHT !== 'undefined' ? _BUERGERMODUL_BUENDEL_BERICHT : undefined),
  // ADR-292 (05.09.2026) — der Ladeweg auf der Zone. typeof-Guard: historische Kern-Staende kennen
  // die neuen Namen nicht.
  buergermodulSektorErsetzen: (typeof buergermodulSektorErsetzen !== 'undefined' ? buergermodulSektorErsetzen : undefined),
  _textsatzAufSektorenAnwenden: (typeof _textsatzAufSektorenAnwenden !== 'undefined' ? _textsatzAufSektorenAnwenden : undefined),
  _erstePartieErlaubteIdsFuerSektor: (typeof _erstePartieErlaubteIdsFuerSektor !== 'undefined' ? _erstePartieErlaubteIdsFuerSektor : undefined),
  // Nachtrag 05.09.2026 (SEKTOREN ab Werk, der Betriebszustand-vs-Tippfehler-Unterschied) —
  // exportiert, damit eine Probe die Grenze direkt gegen die Funktion prüfen kann.
  _katalogOptionen: (typeof _katalogOptionen !== 'undefined' ? _katalogOptionen : undefined),
  // Nachtrag 05.09.2026 (U2-ADR-292, „an Ort und Stelle angleichen") — exportiert, damit ein
  // Spiegel-Ladeweg auf einer anderen Achse (Wizard-Schritte, Situationen) dieselbe Mechanik
  // AUFRUFT statt sie wortgleich zu duplizieren.
  _feldObjektAngleichen: (typeof _feldObjektAngleichen !== 'undefined' ? _feldObjektAngleichen : undefined),
  _optionenArrayAngleichen: (typeof _optionenArrayAngleichen !== 'undefined' ? _optionenArrayAngleichen : undefined),
  // U2-ADR-308 — dasselbe fuer Situationen, wörtlicher Spiegel.
  buergermodulSituationErsetzen: (typeof buergermodulSituationErsetzen !== 'undefined' ? buergermodulSituationErsetzen : undefined),
  _erstePartieErlaubteIdsFuerSituation: (typeof _erstePartieErlaubteIdsFuerSituation !== 'undefined' ? _erstePartieErlaubteIdsFuerSituation : undefined),
  erstePartieBloeckeEintraegePruefen: (typeof erstePartieBloeckeEintraegePruefen !== 'undefined' ? erstePartieBloeckeEintraegePruefen : undefined),
  // U2-ADR-306 — dasselbe fuer Assistenten (WIZARDS), wörtlicher Spiegel.
  buergermodulWizardErsetzen: (typeof buergermodulWizardErsetzen !== 'undefined' ? buergermodulWizardErsetzen : undefined),
  _erstePartieErlaubteIdsFuerWizard: (typeof _erstePartieErlaubteIdsFuerWizard !== 'undefined' ? _erstePartieErlaubteIdsFuerWizard : undefined),
  erstePartieWizardSchritteDefsPruefen: (typeof erstePartieWizardSchritteDefsPruefen !== 'undefined' ? erstePartieWizardSchritteDefsPruefen : undefined),
  // Nachtrag 23.08.2026 — Zug 2, Drittens: generischer Unbekannt-Schlüssel-Check
  _TEMPLATE_FELD_BEKANNTE_SCHLUESSEL: (typeof _TEMPLATE_FELD_BEKANNTE_SCHLUESSEL !== 'undefined' ? _TEMPLATE_FELD_BEKANNTE_SCHLUESSEL : undefined),
  _TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL: (typeof _TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL !== 'undefined' ? _TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL : undefined),
  // Typ-Listen, die der Generator spiegelt (tests/generator-typlisten-gegen-kern.test.js)
  _TEMPLATE_ENTITAET_BEKANNT: (typeof _TEMPLATE_ENTITAET_BEKANNT !== 'undefined' ? _TEMPLATE_ENTITAET_BEKANNT : undefined),
  _RECHTSRAUM_TYP_SCHLUESSEL: (typeof _RECHTSRAUM_TYP_SCHLUESSEL !== 'undefined' ? _RECHTSRAUM_TYP_SCHLUESSEL : undefined),
  _tplCodeListeId, _templateCodeListenUebersetzen, _codeListenAusDepotAnmelden,   // U2-ADR-051 (Template-Code-Listen)
  // U2-ADR-037 Stufe 3 — Render der eingewanderten Template-Felder
  _templateAbschnitte, templateAbschnitteHTML, _templateDefAlsFeld, _TEMPLATE_RENDER_TYPEN, _templateAbschnittSlug,
  // A5 (20.08.2026): die gefuehrten Terminologie-URIs als Quelle der erzeugten Torwaechter-Region.
  _GEFUEHRTE_TERMINOLOGIE_URIS, validateTemplate, _TEMPLATE_FELDTYPEN,
  _feldDef, _wertAusText, _ausMappingZurueck,
  parseVCards, _vcardIdentitaetFelder, _vcardMenschenEintraege, _bdayZuIso,
  // C7: parseICS/_icsFelder/_icsDatumZuIso entfallen — ICS-Import entfernt (reiner Export)
  _sdJwtClaims, _sdJwtIdentitaetFelder, _sdJwtFinanzenFelder, _sdJwtSozialversicherungFelder,
  _fhirRessourcen, _fhirIpsFelder, _xoevFelder, _fimFelder, _edciFelder,
  _vollDepotParsen, _vollDepotFelder,
  // Format-Import (Import-Welle 2) — externe EINLESE-Standards (nurImport)
  parseXML, _xmlLocalName, _xmlDecode, _xKind, _xKinder, _xPfad, _xText, _xTextPfad, _xTief, _xmlDatumIso,
  parseCamt053, _camt053Listen, _camtBetrag,
  parseXMeld, _xmeldFelder, XMELD_IDENTITAET_MAPPING, _edciExternNutzlast, _jsonParse,
  _elsterFelder,
  // Format-Import (Import-Welle 3) — b16-Migration (Bestandsnutzer der alten Beta-App)
  parseVivodepotBeta, _b16Felder, _b16ListeEintrag, _b16Wert,
  // Etappe 2b (Schnitt Glied 2) — typeof-Wache wie bei _MODUL_SPRACHE_FORM oben: ältere Kern-
  // Fassungen (historische Vergleichsläufe, z. B. tests/docx-streichung-gegenprobe.test.js)
  // kennen die Kennung noch nicht, ein nackter Bezeichner würfe dort einen ReferenceError.
  _b16ZielExistiert: (typeof _b16ZielExistiert !== 'undefined') ? _b16ZielExistiert : undefined,
  B16_FELD_MAPPING, B16_SUB, B16_IGNORE, B16_INSTRUMENT_IMPORT, B16_ERKANNTE_SCHLUESSEL, _b16HatMerkmal,
  importFormatErkennen, flowImportAuto,
  // QR (Teil 3.3, U2-ADR-077: QR = Kontakte-vCard, kein Gesundheitsdatum)
  NOTFALL_KERN_FELDER, notfallKernModell, notfallKontakteVcard, flowNotfallQR,
  // Notfall-Dreiklang (Teil 4) — U2-ADR-078: passwortloser Stufe-1-Cache entfernt
  // (notfallCacheBauen/notfallCacheAusUmschlag/flowNotfallAusDatei/notfallStufe1 sind weg).
  renderNotfall,
  notfallKartenMeta, zeichneNotfallkarte, flowNotfallkartePdf,
  // Format-Profile (Teil 3.5)
  baueAusMapping, VC_IDENTITAET_MAPPING, sdJwtVcIdentitaet,
  XOEV_VERWALTUNG_MAPPING, xoevVerwaltung, EDCI_BILDUNG_MAPPING, edciBildung,
  // Weitere Format-Exporte (Welle 1+2)
  sdJwtVcFinanzen, VC_FINANZEN_MAPPING, fimVerwaltung, _codeStand,
  sdJwtVcSozialversicherung, VC_SOZIALVERSICHERUNG_MAPPING,
  vcardIdentitaet, vcardMenschen, icsKalender, icsHatTermine,   // C7: ICS_TERMINE entfallen
  /* flowDocxExport ist am 21.08.2026 entfallen (Entscheidung 'Drei Zwecke, drei Ausgabewege').
     docxBereichModell bleibt: es ist das Datenmodell und der einzige Ort, an dem die
     Verweis-Anreicherung ueber einen GANZEN Bereich laeuft. */
  docxBereichModell,
  verweisExportFelder, PERSON_VERWEIS_MATRIX, INSTITUTION_VERWEIS_MATRIX,
  _verweisExportZeile, _verweisListenEintragZusammenfassung,
  feldEingetragen, feldValidieren, feldWertHTML, feldInputHTML, feldZeileHTML, feldSichtbar,
  // Statuskarten (26.08.2026, Task B.1) — Cluster-Tabelle + Render-Baustein für überladene Sektionen.
  // typeof-abgesichert (s. Kommentar bei fassungenVergleichen oben): ein historischer Kern-Stand vor
  // diesem Bau (docx-streichung-gegenprobe.test.js lädt einen alten Commit) kennt sie nicht.
  SEKTION_STATUSKARTEN_CLUSTER: (typeof SEKTION_STATUSKARTEN_CLUSTER !== 'undefined' ? SEKTION_STATUSKARTEN_CLUSTER : undefined),
  feldgruppenKarteHTML: (typeof feldgruppenKarteHTML !== 'undefined' ? feldgruppenKarteHTML : undefined),
  feldgruppenStatusText: (typeof feldgruppenStatusText !== 'undefined' ? feldgruppenStatusText : undefined),
  // A363 (19.08.2026) — der Paritäts-Wächter prüft den Grund seiner eigenen Freistellung
  AUSDRUECKLICH_KEINE_FELDER,
  // A358 (19.08.2026) — der Meldeweg für katalogfremde Felder (U2-ADR-150, Kern-Seite)
  katalogFremdeFelder, katalogFremdSatz, KATALOG_FREMD_NENNUNGEN_MAX, sektorHatDaten,
  _zeileHTML, _zeilenPfeileHTML,   // K1 (Auftrag K1/K2/K6, 09.08.2026)
  _datumPlausibel, DATUM_JAHR_MIN_GEBURT, DATUM_JAHR_MIN_WEIT, _datumHeuteIso, _datumJahrMaxZukunft,
  _ibanPlausibel, IBAN_LAENGE, _camt053Listen,
  ereignisGeburtMarkieren,
  _datumDeutsch, _datumEingabePlausibel, _wertTextMenschlich,
  _feldEingabePlausibel, _feldWertNormalisiert,   // F7 Zug1 (Auftrag F7/K7, 09.08.2026)
  listenEintragZusammenfassung, listenEintragInputsHTML, liesEintragAusDOM, liesEintragAusWerten,
  listenEintragHinzufuegen, listenEintragAktualisieren, listenEintragEntfernen,
  listenEintragVerschieben, _refmSammeln, _refmInsRegister, personFindenOderAnlegen,
  // „Gebwiz Kind und Sub-Depot" (11.08.2026)
  _gebwizKindEintragErstellen, _gebwizSubDepotVorschlagen, _gebwizSubDepotAblehnen,
  liesEintragAusWerten,
  flowListenEintragHinzufuegen, flowListenEintragBearbeiten, flowListenEintragEntfernen, flowRefNeueEntitaet,
  _listenEintragSystemfelderErhalten,   // U2-ADR-121 Zug 4 — Systemfeld-Erhalt beim Bearbeiten-Speichern
  _institutionFelder, INSTITUTION_ART_LABEL,
  bearbeitungSpeichern, oeffneVerwaltung,
  // D40/D41 — Speicher-Lebenszyklus; D42 — context-aware Datei-Sicherung
  istUngespeichert, ungespeichertAnzahl, markiereUngespeichert, markiereGespeichert,
  markiereAlsDateiGesichert, saveStatusModell, schliessenWarnungNoetig,
  // U2-ADR-237 (03.09.2026) — Testhaken: die stille Auto-Save-Kette abwarten, bevor eine
  // Probe den internen Stand prüft (fire-and-forget in der echten Oberfläche, hier bewusst
  // awaitbar gemacht statt willkürlich zu warten). typeof-Wache: ältere vivodepot.html-Stände
  // (per KERN_HTML_PATH geladen, s. docx-streichung-gegenprobe.test.js) kennen die Funktion
  // nicht — ohne Wache bräche ihr Laden mit ReferenceError.
  _internAutoSpeichernAbschluss: (typeof _internAutoSpeichernAbschluss !== 'undefined' ? _internAutoSpeichernAbschluss : undefined),
  // U2-ADR-212 (02.09.2026) — reine Entscheidung: geht der Sichern-Klick über die Datei?
  // typeof-Wache wie bei _swAktivierenWennMoeglich oben: tests/docx-streichung-gegenprobe.test.js
  // lädt einen HISTORISCHEN Kern-Stand vor diesem ADR — ohne die Wache bricht der Export dort mit
  // ReferenceError, statt den fehlenden Export ehrlich als undefined durchzureichen.
  saveKnopfDateiWeg: (typeof saveKnopfDateiWeg !== 'undefined' ? saveKnopfDateiWeg : undefined),
  // U2-ADR-190 (01.09.2026) — bedingtes skipWaiting: die Seite entscheidet, der Worker gehorcht nur.
  _swAktivierenWennMoeglich: (typeof _swAktivierenWennMoeglich !== 'undefined' ? _swAktivierenWennMoeglich : undefined),
  // Zug 1 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026) — vierter Zustand bekommt einen Abnehmer
  markiereDateiSicherungUnbestaetigt, bestaetigeDateiAngekommen,
  // Zug 2 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026) — S15: Uhrzeit im Nicht-Picker-Namen
  _dateinameMitUhrzeit,
  // Zug 5 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026) — Depot-Pille wird ein echtes Menü
  depotMenueOffen, depotMenueOeffnen, depotMenueSchliessen, depotMenueToggle,
  // Persistenz Stück 5 (U2-ADR-031-Nachtrag, 08.08.2026) — vierter Zustand „fehlgeschlagen"
  markiereSpeichernFehlgeschlagen, speichernOderFehlschlagMarkieren,
  // Gesamtumbau (Nachtrag 08.08.2026) — Zug 1 (Ausweg-Schwelle), Zug 2 (Funktionsprobe), Zug 3 (Fehlermeldung)
  SPEICHER_FEHLSCHLAG_SCHWELLE_WIEDERHOLT,
  _speicherFehlschlagAnzahlInFolge: () => _speicherFehlschlagAnzahlInFolge,
  internSpeicherFunktionsprobe, internSpeicherProbeStarten, _internSpeicherProbeZuruecksetzen,
  _internSpeicherProbeErgebnis: () => _internSpeicherProbeErgebnis,
  _setzeInternSpeicherProbeErgebnis: (v) => { _internSpeicherProbeErgebnis = v; },
  _internSpeicherProbeGelaufenWert: () => _internSpeicherProbeGelaufen,
  fehlermeldungFuer, zeigeKernFehler, zeigeInternenWiedereintritt, zeigeInternerWiedereinstiegBanner,
  _einstiegsmarkeWert: () => _einstiegsmarke,
  depotInDateiSichern, _autoDateiSchreibenAnstossen, _autoDateiSchreibenAusfuehren, AUTO_DATEI_SCHREIBEN_ENTPRELLUNG_MS,
  // Wiedereinstieg App-first (U2-ADR-031) — Einmal-Rückweg-Hinweis beim ersten Datei-Sichern
  wiedereinstiegHinweisNoetig, wiedereinstiegHinweisZeigen,
  // Migrations-Assistent Altdepots (Auftrag 12.08.2026, Zug 2)
  migrationsHinweisNoetig, migrationsHinweisZeigen,
  // A534 (25.08.2026) — Akteur-Bootstrap-Fehlschlag beim Wiedereintritt, jetzt sichtbar
  akteurBootstrapFehlerNoetig: (typeof akteurBootstrapFehlerNoetig !== 'undefined' ? akteurBootstrapFehlerNoetig : undefined),
  akteurBootstrapFehlerHinweisZeigen: (typeof akteurBootstrapFehlerHinweisZeigen !== 'undefined' ? akteurBootstrapFehlerHinweisZeigen : undefined),
  // D43 / U2-ADR-015 — Capability-Gerüst + Speicher-Abstraktion (Etappe 0+)
  hatIndexedDB, hatServiceWorker, hatDateiSpeichernPicker, internerSpeicherModus, _istDateiHerkunft,
  VdStore, _idbInMemoryBackend, _idbIndexedDbBackend, _idbOeffnen,
  VDSTORE_DB, VDSTORE_STORE, VDSTORE_DB_VERSION,
  // Produkt-Trennung im geteilten internen Speicher (02.09.2026, Fund). Geschützt wie
  // akteurBootstrapFehlerNoetig oben — ladeKern() lädt auch ÄLTERE HTML-Schnappschüsse
  // (tests/docx-streichung-gegenprobe.test.js vergleicht gegen einen Commit vor dieser
  // Funktion); eine bare Kurzschreibweise würfe dort ReferenceError, weil die alte Fassung
  // die Kennung nie definiert.
  _speicherProduktKennung: (typeof _speicherProduktKennung !== 'undefined' ? _speicherProduktKennung : undefined),
  _speicherEigenerRecord: (typeof _speicherEigenerRecord !== 'undefined' ? _speicherEigenerRecord : undefined),
  _eigeneInterneListe: (typeof _eigeneInterneListe !== 'undefined' ? _eigeneInterneListe : undefined),
  depotInIdbSichern, depotAusIdbLaden, internerStandMeta, internerStandVorhanden,
  // Stick-Mittelweg (16.09.2026): Auslieferungsform + Räumen der Browser-Kopie
  stickAusgabe: (typeof stickAusgabe !== 'undefined' ? stickAusgabe : undefined),
  stickWegGilt: (typeof stickWegGilt !== 'undefined' ? stickWegGilt : undefined),
  browserKopieRaeumenModell: (typeof browserKopieRaeumenModell !== 'undefined' ? browserKopieRaeumenModell : undefined),
  browserKopieRaeumen: (typeof browserKopieRaeumen !== 'undefined' ? browserKopieRaeumen : undefined),
  _stickRaeumenFehlgeschlagenMelden: (typeof _stickRaeumenFehlgeschlagenMelden !== 'undefined' ? _stickRaeumenFehlgeschlagenMelden : undefined),
  depotInternSichern, depotPersistieren,
  persistAnfragen, exportErinnerungModell, exportErinnerungVielleichtZeigen,
  EXPORT_ERINNERUNG_SCHWELLE_TAGE,
  // Stück 4 (U2-ADR-031) — persist() ehrlich auswerten + iOS-Install-Hinweis
  hatPersistApi, erhoehtesVerlustRisiko, iosNichtInstalliert,
  iosInstallHinweisNoetig, iosInstallHinweisVielleichtZeigen, sitzungEtablieren,
  _persistGewaehrtWert: () => _persistGewaehrt,
  _iosHinweisGezeigt: () => _iosInstallHinweisGezeigt,
  serviceWorkerRegistrieren, _swRegistrierenErlaubt,
  // D43 Etappe 5 — Konflikt-Auflösung
  standKonfliktModell, konfliktWaehleGeraet, konfliktWaehleDatei, _konfliktZeitLesbar,
  speicherKonfliktModell, zielStandDatei, zielStandIntern, flowSpeicherKonfliktDialog,
  depotHerunterladen, booteInternenStandVielleicht,
  // U2-ADR-095 — Passwort-Wechsel + Notfall-Blatt
  passwortWechselDurchfuehren, _passwortProbeRoundtrip, flowPasswortWechseln,
  notfallblattHTML, notfallblattOeffnen, notfallblattAnbieten, passwortWechselAbschlussZeigen,
  _aktuelleSalt: () => aktuelleSalt,
  _aktuellerDepotSalt: () => aktuelleDepotSalt,
  _aktuelleDepotUUID: () => aktuelleDepotUUID,
  // Kern-Fix Umschlagfeld-Verlust (22.09.2026): die gemerkten unbekannten Umschlag-Felder, für die Wisch-Proben (typeof-Guard: ältere Stände kennen sie nicht).
  _umschlagFremdfelder: () => (typeof aktuelleUmschlagFremdfelder !== 'undefined' ? aktuelleUmschlagFremdfelder : undefined),
  // U2-ADR-244: fähigkeitsabhängiger Anlege-Hinweis (typeof-Guard: existiert nicht in älteren
  // geladenen Ständen, z. B. tests/docx-streichung-gegenprobe.test.js gegen einen historischen Commit).
  anlegenSpeicherHinweis: (typeof anlegenSpeicherHinweis !== 'undefined' ? anlegenSpeicherHinweis : undefined),
  // Auftrag „Erfolg ohne Wirkung" (08.08.2026), Zug 2 — Test-Zugriff, um den stillen No-Op-Zustand
  // (sessionHkdfKey gesetzt, aktuelleDepotUUID leer) gezielt zu stellen, ohne auf ein zufälliges
  // Timing im echten Lade-Pfad angewiesen zu sein.
  _setzeAktuelleDepotUUID: (v) => { aktuelleDepotUUID = v; },
  _teilenBevorzugt, istStandaloneWebApp, dateiAusgeben,
  // F5 Zug 2 (21.08.2026): die Abschrift angehoerigenCache und alles um sie herum ist entfallen.
  // Der ZUSCHNITT bleibt — er ist Massstab fuer drei Waechter und war nie die Abschrift selbst.
  angehoerigenCacheModell,
  // Empfängerkreise (U2-ADR-156, 21.08.2026)
  EMPFAENGER_NIE,
  empfaengerBausteineAlle: (typeof empfaengerBausteineAlle !== 'undefined' ? empfaengerBausteineAlle : undefined),
  _empfaengerBausteinById: (typeof _empfaengerBausteinById !== 'undefined' ? _empfaengerBausteinById : undefined),
  _kreisBereichsbausteineSichtbar: (typeof _kreisBereichsbausteineSichtbar !== 'undefined' ? _kreisBereichsbausteineSichtbar : undefined),
  empfaengerBausteinTripel, empfaengerZuschnittModell,
  empfaengerDateiErzeugen, empfaengerDateiname, EMPFAENGER_PW_MIN,
  empfaengerkreiseListe, empfaengerkreisFinden, empfaengerkreisSetzen, empfaengerkreisEntfernen,
  empfaengerkreisAusgabeVermerken, empfaengerDateiHerausgeben, empfaengerkreiseAbschnittHTML,
  empfaengerkreisFachEinrichten, empfaengerkreisFachEntfernen, empfaengerkreisHatFach,
  _ortHinweisFuerUmschlag,   // F5 Zug 1 (21.08.2026): der Torwaechter des Ort-Hinweises
  _empfaengerFaecherFuerSchreibweg, _zerfallAttrappe, _zerfallEintragLesen,
  flowEmpfaengerkreisBearbeiten, flowEmpfaengerkreisDatei, flowEmpfaengerkreisEntfernen,
  flowEmpfaengerkreisFach, flowEmpfaengerkreisFachEntfernen,
  // QR-Übergabe (b16-Wiedereinbau, Krisenvorsorge-Auftrag 24.08.2026, Zug 3c) — typeof-
  // abgesichert: ein historischer Kern-Schnappschuss (docx-streichung-gegenprobe u. ä.) kennt
  // diese Namen nicht.
  empfaengerQrPayloadBauen: (typeof empfaengerQrPayloadBauen !== 'undefined' ? empfaengerQrPayloadBauen : undefined),
  empfaengerQrHerausgeben: (typeof empfaengerQrHerausgeben !== 'undefined' ? empfaengerQrHerausgeben : undefined),
  flowEmpfaengerkreisQr: (typeof flowEmpfaengerkreisQr !== 'undefined' ? flowEmpfaengerkreisQr : undefined),
  EMPFAENGER_QR_LESE_URL: (typeof EMPFAENGER_QR_LESE_URL !== 'undefined' ? EMPFAENGER_QR_LESE_URL : undefined),
  EMPFAENGER_QR_HASH_PRAEFIX: (typeof EMPFAENGER_QR_HASH_PRAEFIX !== 'undefined' ? EMPFAENGER_QR_HASH_PRAEFIX : undefined),
  EMPFAENGER_QR_MAX_ZEICHEN: (typeof EMPFAENGER_QR_MAX_ZEICHEN !== 'undefined' ? EMPFAENGER_QR_MAX_ZEICHEN : undefined),
  prueftermineFristen, prueftermineZeilen, _zeilenBezeichnung, feldHatMarke, feldMarkenPruefen, FELD_MARKEN_ERLAUBT,
  ereignisMarkieren, EREIGNIS_ACHSE_FELDER, EREIGNIS_ARTEN, _inhaberPersonIdFinden, dokumenteFuerEintrag,
  blattVorschlagPruefen, blattVorschlaege, blattFeldGehoben,
  blattFeldHeben, blattFeldSenken, blattGehobeneEintraege, _angedockteFeldDef,
  _blattVorschlagZeileHTML, blattVorschlagVerdrahten, templateAbschnitteHTML, _templateAbschnitte,
  ZERFALL_GEHEIM_POLSTER, _zerfallGeheimKlartext, _zerfallSchreiben,
  // U2-ADR-062-Nachtrag — Ort-Hinweis im Umschlag + Anzeige vor der Passwort-Eingabe
  angehoerigenOrtAusUmschlag, _angOrtHinweisAuffrischen, renderCryptoOverlay,
  _dateiTypErkennen, _dateiErkennungAuffrischen,
  passwortStaerke, pwGrundFehler,
  _standMarke: () => _aktuellerStandGespeichertAm,
  _persistStatus: () => _persistAngefragt,
  // U2-ADR-211: die frühere Arbeitsspeicher-Variable ist entfallen — der Test-Haken setzt
  // seither den persistierten Stand direkt (data.sicherungsStand). Braucht ein geladenes Depot
  // (data != null); ohne eines gibt es nichts, woran ein Sicherungsstand hängen könnte.
  _setzeLetzteSicherungskopie: (iso) => { data.sicherungsStand = { letzteDateiIso: iso, aenderungenDanach: 0 }; },
  // Persistenz Stück 5, Zug 2 (Nachtrag 08.08.2026) — Test-Zugriff auf die Quittierung, um den
  // Grenzfall „Fehlschlag bei Zähler 0 + bereits quittiertem Verlust" ohne echten DOM-Klick zu stellen.
  _dateiVerlustQuittiertWert: () => _dateiVerlustQuittiert,
  _setzeDateiVerlustQuittiert: (v) => { _dateiVerlustQuittiert = !!v; },
  renderVerwalteteDepots, renderSektor, renderContent, oeffneSektor, renderSidebar,
  bereichOhneEintraege,   // K2 (Auftrag K1/K2/K6, 09.08.2026)
  _scrollUndFokusMerken, _scrollUndFokusWiederherstellen,
  verwaltungsTypLabel, vertretungsGrundlageLabel, vertretungsGrundlageOptionenHTML, oeffneVerwaltung,
  geheZuZuhause, renderWelcome, renderTopbar, renderNotfall, betreteApp, verlasseNotfall,
  oeffneMenue, schliesseMenue,
  // Strang 2 / Commit A — Lage B (crypto-overlay) + Eingangs-Dispatcher
  renderCryptoOverlay, cryptoOverlayOeffnen, booteEingang,
  // Befund F4 (22.09.2026): typeof-abgesichert wie die anderen jüngeren Exporte — ältere Kerne
  // (kernVonCommit u. ä.) kennen den Namen noch nicht, ein nackter Verweis würfe ReferenceError.
  _eingangsFehlerAnzeigen: (typeof _eingangsFehlerAnzeigen !== 'undefined' ? _eingangsFehlerAnzeigen : undefined),
  // Vorschau-/Umsehen-Modus (passwortloser Erstbesuch)
  imVorschau, vorschauDepotErzeugen, vorschauHatDaten, vorschauDatenUebernehmen,
  flowVorschauBetreten, flowVorschauUebernehmen, vorschauBannerHTML, vorschauVerwerfenUndZuhause,
  // Vorführung (AB_WERK_SHOWCASE, 15.09.2026) — typeof-gesichert, damit KERN_HTML_PATH auf einen älteren Kern lädt.
  AB_WERK_SHOWCASE: (typeof AB_WERK_SHOWCASE !== 'undefined' ? AB_WERK_SHOWCASE : undefined),
  VORFUEHRUNG_ANSICHTEN: (typeof VORFUEHRUNG_ANSICHTEN !== 'undefined' ? VORFUEHRUNG_ANSICHTEN : undefined),
  vorfuehrungGebacken: (typeof vorfuehrungGebacken === 'function' ? vorfuehrungGebacken : undefined),
  vorfuehrungFhirIpsBundle: (typeof vorfuehrungFhirIpsBundle === 'function' ? vorfuehrungFhirIpsBundle : undefined),
  vorfuehrungFhirAuszug: (typeof vorfuehrungFhirAuszug === 'function' ? vorfuehrungFhirAuszug : undefined),
  imVorfuehrung: (typeof imVorfuehrung === 'function' ? imVorfuehrung : undefined),
  vorfuehrungDepotErzeugen: (typeof vorfuehrungDepotErzeugen === 'function' ? vorfuehrungDepotErzeugen : undefined),
  vorfuehrungStarten: (typeof vorfuehrungStarten === 'function' ? vorfuehrungStarten : undefined),
  vorfuehrungSchleifeStarten: (typeof vorfuehrungSchleifeStarten === 'function' ? vorfuehrungSchleifeStarten : undefined),
  vorfuehrungSchleifeBeenden: (typeof vorfuehrungSchleifeBeenden === 'function' ? vorfuehrungSchleifeBeenden : undefined),
  vorfuehrungSchleifeLaeuft: (typeof vorfuehrungSchleifeLaeuft === 'function' ? vorfuehrungSchleifeLaeuft : undefined),
  vorfuehrungBeruehrt: (typeof vorfuehrungBeruehrt === 'function' ? vorfuehrungBeruehrt : undefined),
  vorfuehrungZuruecksetzen: (typeof vorfuehrungZuruecksetzen === 'function' ? vorfuehrungZuruecksetzen : undefined),
  vorfuehrungSperreMelden: (typeof vorfuehrungSperreMelden === 'function' ? vorfuehrungSperreMelden : undefined),
  _vorfuehrungAusgabeZeigen: (typeof _vorfuehrungAusgabeZeigen === 'function' ? _vorfuehrungAusgabeZeigen : undefined),
  anlegenDialogTitel, anlegenPrimaerLabel,
  // Strang 2 / Commit E — Passwort-Setzungs-Modal + geteilter verlustfreier Abschluss
  flowPasswortSetzen, _depotAusPasswortFinalisieren, flowDepotAnlegen,
  // Sicherheit Block B (Krypto-Gutachten-Befund 1.7) — Passphrase-Stärke + harte Grund-Schranke
  passwortStaerke, pwGrundFehler, pwStaerkeAnzeigeVerdrahten, PW_BLOCKLISTE,
  // D38 — bewusste Eigen-Depot-Einrichtung aus dem Sub-Wunsch (mit Namensfeldern)
  flowEigenesDepotAusSubWunsch,
  depotHatNamen, _d37HinweisFaellig, namenlosHinweisHTML, flowD37NamenErgaenzen,
  depotHatGeburtsdatum, flowFhirGeburtsdatumErgaenzen,
  // Strang 2 / Commit C — D2 Schließen-Warnung + Schluss-Sicht
  flowAppSchliessen, flowSchliessenWarnung, flowSchliessenWarnungEchteSitzung, flowTrotzdemSchliessen, zeigeSchlussSicht, _depotSpeicherZuruecksetzen,
  // U2-ADR-103: Teardown-Garantie pruefbar machen. Die beiden let-Variablen brauchen GETTER —
  // ein Wert-Export waere ein Schnappschuss vom Ladezeitpunkt und immer 0 bzw. null.
  _hintergrundWipeVielleicht,
  _ungespeicherteAnzahl: () => _ungespeicherteAenderungen,
  _ankerDatenHalter: () => _ankerData,
  _aktiverSubKontextHalter: () => aktiverSubKontext,
  // U2-ADR-184: die Frist vor Politik A pruefbar machen — dieselbe Guard-Begruendung wie
  // direkt oberhalb (GETTER statt Schnappschuss). typeof-Guard wie bei fassungenVergleichen
  // weiter oben: ein historischer Kern vor diesem ADR (z. B. docx-streichung-gegenprobe.test.js,
  // laedt einen fest verdrahteten alten Commit) kennt diese Namen noch nicht.
  _hintergrundBeginnen: (typeof _hintergrundBeginnen !== 'undefined' ? _hintergrundBeginnen : undefined),
  _hintergrundBeenden: (typeof _hintergrundBeenden !== 'undefined' ? _hintergrundBeenden : undefined),
  HINTERGRUND_WIPE_FRIST_MS: (typeof HINTERGRUND_WIPE_FRIST_MS !== 'undefined' ? HINTERGRUND_WIPE_FRIST_MS : undefined),
  _hintergrundSeitHalter: () => (typeof _hintergrundSeit !== 'undefined' ? _hintergrundSeit : undefined),
  _hintergrundWipeTimerHalter: () => (typeof _hintergrundWipeTimer !== 'undefined' ? _hintergrundWipeTimer : undefined),
  // U2-ADR-185 — die drei Wiedereintritts-Halter, GETTER wie oben (nicht Schnappschuss).
  // typeof-Guard: vor dem Bau existieren die Variablen noch nicht (Positivkontrolle gegen
  // den alten Stand), danach schon.
  _gehaltenerUmschlagHalter: () => (typeof _gehaltenerUmschlag !== 'undefined' ? _gehaltenerUmschlag : undefined),
  _wipeStelleHalter: () => (typeof _wipeStelle !== 'undefined' ? _wipeStelle : undefined),
  _wipeErklaerungZeigenHalter: () => (typeof _wipeErklaerungZeigen !== 'undefined' ? _wipeErklaerungZeigen : undefined),
  oeffneAnlassAuswahl, renderAnlassAuswahl, schliesseAnlassAuswahl, flowDepotListe,
  // U2-ADR-089 Block 2 — abgeleitete Instrument-Zeile
  INSTRUMENT_ZEILE_PRAEFIX, instrumentZeileModell, instrumentZeileQuellFelder,
  _instrumentTypLabel, _instrumentGateFeldId, crossRefFeldUndRoh, akutZeileHTML,
  // U2-ADR-096 — Unterfeld-Adressierung für typisierte Listen
  LISTEN_AUSWAHLFORM, LISTEN_UNTERFELD_PRAEFIX, listenZeilenWaehlen, listenUnterfeldRoh,
  _listenSelektorZerlegen, modulKarteZiel, _listenUnterfeldDef, feldDefFuer, situationsFeldDefFuer, _listenTypLabel, SCHEMA_VERSION_AKTUELL, ALT_LABEL_REGISTER,
  // Umbauplan "Englisch vor v1", Plan-Commit 3 (Depot-Migration Schema 80->81, KENNUNG-MAPPING:BEGIN/END-Region)
  // typeof-abgesichert (nicht als Kurzform): eine ALTE Kern-Fassung (git show <hash>:vivodepot.html),
  // von A/B-Vergleichstests geladen, kennt diese Konstanten noch nicht -- eine Kurzform {NAME} wirft
  // dort ReferenceError statt undefined zu liefern (gemessen: 7 A/B-Tests rot, vor dieser Absicherung).
  KENNUNG_MAPPING: (typeof KENNUNG_MAPPING !== 'undefined' ? KENNUNG_MAPPING : undefined),
  FORMAT_SCHLUESSEL_MAPPING: (typeof FORMAT_SCHLUESSEL_MAPPING !== 'undefined' ? FORMAT_SCHLUESSEL_MAPPING : undefined),
  _kennungenNachschlageBauen: (typeof _kennungenNachschlageBauen !== 'undefined' ? _kennungenNachschlageBauen : undefined),
  _kennungenElementUmschreiben: (typeof _kennungenElementUmschreiben !== 'undefined' ? _kennungenElementUmschreiben : undefined),
  _sektorenKennungenUmschreiben: (typeof _sektorenKennungenUmschreiben !== 'undefined' ? _sektorenKennungenUmschreiben : undefined),
  _nebenablagenKennungenUmschreiben: (typeof _nebenablagenKennungenUmschreiben !== 'undefined' ? _nebenablagenKennungenUmschreiben : undefined),
  _logikModulKennungenUmschreiben: (typeof _logikModulKennungenUmschreiben !== 'undefined' ? _logikModulKennungenUmschreiben : undefined),
  // Doppel-Knopf-Regression (21.07.2026): die Dialoge selbst prüfbar machen
  ui, _dateiNameErfragen, flowSubDepotNachAnker, flowSubDepotAushaengen,
  renderFooter, BUILD_VERSION, BUILD_SHA256, SCHALEN_STAND,   // F2: _swCacheStandFuellen entfallen (Werkstatt-Labels weg)
  // A70 (31.07.2026) — proaktive Stale-Cache-Warnung: Kern-Vergleich, die Prüfung und der DOM-anhängende Aufruf
  _staleCacheGeneration, _staleCacheWarnungPruefen, _staleCacheWarnungAnzeigen,
  // Datums-Helfer + Versions-Hinweis (Teil 3) — geteilt von der Dokument-Ebene (1b: Erinnerungs-Modell abgelöst)
  BUILD_DATUM, AKTUALISIERUNGEN_LINK, VERSION_HINWEIS_SCHWELLE_TAGE, ERINNERUNG_TERMIN_FENSTER_TAGE,
  _erIsoVon, _erParseIso, _erTageBis, _erDatumPlusMonate,
  versionAlterTage, versionHinweisFaellig,
  // Ampel-Status (grün/gelb/rot) — übernommen aus beta.16, jetzt auf der Dokument-Ebene (1b: erinnerungAmpelStatus → dokumentAmpelStatus)
  ERINNERUNG_AMPEL_GELB_PUFFER_MONATE,
  dokumentAmpelStatus,
  // Dokument-Ebene (U2-ADR-014) — Datenmodell + Migration (Stufe 2, Einheit 1)
  DOKUMENT_QUELLEN, DOKUMENT_FELDER_SETZBAR,
  _dokumenteRoot, _dokumentFelderNormalisieren,
  dokumentLesen, dokumentAnlegen, dokumentSetzen, dokumentAlsGeprueft, dokumentLoeschen,
  dokumentFelder, dokumentAmpel, depotNormalisieren,
  // Zug 3 (17.08.2026): Bereichs-Rettung und M1 generisch
  _bereicheVerwaisteRetten, feldGueltigkeitLesen, feldGueltigkeitSetzen, feldGiltAm,
  // M1 (18.08.2026): die Marke laeuftAb an der Felddefinition
  FELD_MARKEN_ERLAUBT, feldMarkenPruefen, feldHatMarke,
  // M1 Zug 2/3 (18.08.2026): Eingabe und Vorschlag
  feldGueltigkeitZeileHTML, feldGueltigkeitVorschlag, _ausweisGueltigkeitVorschlagWert, FELD_VORSCHLAG_REGELN,
  // U2-ADR-167 — die leise Prüf-Rhythmus-Änderung. Guard wie fassungenVergleichen: ein
  // historischer Kern (docx-streichung-gegenprobe.test.js) kennt sie noch nicht.
  feldPruefIntervallHinweisHTML: (typeof feldPruefIntervallHinweisHTML !== 'undefined' ? feldPruefIntervallHinweisHTML : undefined),
  // U2-ADR-168 — Rücknahme Stufe A/B. Gleicher Guard-Grund.
  importierteVorlagenUebersicht: (typeof importierteVorlagenUebersicht !== 'undefined' ? importierteVorlagenUebersicht : undefined),
  vorlageWerteLeeren: (typeof vorlageWerteLeeren !== 'undefined' ? vorlageWerteLeeren : undefined),
  // U2-ADR-169 — Bereichssatz-Auswahl im Anlage-Weg. Gleicher Guard-Grund.
  _bereichssatzAuswahlHTML: (typeof _bereichssatzAuswahlHTML !== 'undefined' ? _bereichssatzAuswahlHTML : undefined),
  _ankerAusIdentitaetFinalisieren: (typeof _ankerAusIdentitaetFinalisieren !== 'undefined' ? _ankerAusIdentitaetFinalisieren : undefined),
  _depotIdentitaetUndPasswortAbfragen: (typeof _depotIdentitaetUndPasswortAbfragen !== 'undefined' ? _depotIdentitaetUndPasswortAbfragen : undefined),
  // M1 Zug 5 (18.08.2026): die EINE Auflösung „geltender Rohwert"
  feldRohwert, feldRohwertSetzen,
  // M1 Zug 6: die Herkunft reist mit
  feldGueltigkeitHerkunft, _gueltigkeitStempelSchluessel,
  // Nachtrag „Vier Häufungen" (17.08.2026): was ein Bereich kann, als Eigenschaft
  BEREICH_MERKMALE_ERLAUBT, BEREICH_ROLLEN_ERLAUBT, bereichMerkmalePruefen, bereichRollenPruefen,
  bereichKann, bereichRolle, bereichFeldHatRolle,
  // U2-ADR-269 (04.09.2026): Listenzeilen-Form der Rollen, typeof-abgesichert (neuer Export)
  bereichListenUnterfeldHatRolle: (typeof bereichListenUnterfeldHatRolle !== 'undefined' ? bereichListenUnterfeldHatRolle : undefined),
  // Nachtrag Teil B (17.08.2026): das Prüfblatt liest auch Feldwerte
  prueftermineFelder, prueftermineAlle, feldAlsGeprueft, prueftermineSpringeZuFeld,
  _feldTerminId, _feldTerminZerlegen, _feldTerminName,
  // Glied 5 (17.08.2026): EIN Einlassweg für alle Register
  EINLASS_REGISTER, modulEinlassen, eingelasseneModule,
  // U2-ADR-258 (04.09.2026): die Herkunft eines Moduls reist bis zum Empfaenger. typeof-Absicherung,
  // damit ein Bestandstest gegen eine aeltere Kern-Fassung (KERN_HTML_PATH) nicht bricht.
  modulHerkunftStand: (typeof modulHerkunftStand !== 'undefined' ? modulHerkunftStand : undefined),
  modulHerkunftBerechnen: (typeof modulHerkunftBerechnen !== 'undefined' ? modulHerkunftBerechnen : undefined),
  modulHerkunftGiltAlsGeprueft: (typeof modulHerkunftGiltAlsGeprueft !== 'undefined' ? modulHerkunftGiltAlsGeprueft : undefined),
  modulHerkunftOhnePruefung: (typeof modulHerkunftOhnePruefung !== 'undefined' ? modulHerkunftOhnePruefung : undefined),
  modulHerkunftAnzahl: (typeof modulHerkunftAnzahl !== 'undefined' ? modulHerkunftAnzahl : undefined),
  modulHerkunftSatz: (typeof modulHerkunftSatz !== 'undefined' ? modulHerkunftSatz : undefined),
  modulHerkunftFussText: (typeof modulHerkunftFussText !== 'undefined' ? modulHerkunftFussText : undefined),
  // U2-ADR-259 (04.09.2026): die zweite Angabe auf demselben Weg (Stand/moduleVersion statt
  // Herkunft), gleiche typeof-Absicherung gegen einen aelteren Kern-Stand.
  moduleStandBerechnen: (typeof moduleStandBerechnen !== 'undefined' ? moduleStandBerechnen : undefined),
  moduleStandAnzahl: (typeof moduleStandAnzahl !== 'undefined' ? moduleStandAnzahl : undefined),
  moduleStandSatz: (typeof moduleStandSatz !== 'undefined' ? moduleStandSatz : undefined),
  moduleStandFussText: (typeof moduleStandFussText !== 'undefined' ? moduleStandFussText : undefined),
  vorDepotKonfigurationLeer: (typeof vorDepotKonfigurationLeer !== 'undefined' ? vorDepotKonfigurationLeer : undefined),
  vorDepotKonfigurationLaden: (typeof vorDepotKonfigurationLaden !== 'undefined' ? vorDepotKonfigurationLaden : undefined),
  vorDepotKonfigurationAnwenden: (typeof vorDepotKonfigurationAnwenden !== 'undefined' ? vorDepotKonfigurationAnwenden : undefined),
  modulEinlassenGeprueft: (typeof modulEinlassenGeprueft !== 'undefined' ? modulEinlassenGeprueft : undefined),
  _vorDepotModulInsDepotUebernehmen: (typeof _vorDepotModulInsDepotUebernehmen !== 'undefined' ? _vorDepotModulInsDepotUebernehmen : undefined),
  // U2-ADR-252 Teil 2 (04.09.2026) — Halter statt direkter Export, dasselbe Muster wie
  // _subSelbstUmschlagHalter: das Ergebnis von vorDepotKonfigurationAnwenden() lebt in einer
  // modul-privaten let-Variable, nicht auf dem Export-Objekt.
  _vorDepotZielGecachtHalter: (typeof _vorDepotZielGecached !== 'undefined' ? (() => _vorDepotZielGecached) : undefined),
  // U2-ADR-404 (12.09.2026) — Provisionierung verdrahtet mit K9/Weg 2 (vorlage-Zertifikate).
  _vorDepotVorlagenZertifikatePlanHalter: (typeof _vorDepotVorlagenZertifikatePlan !== 'undefined' ? (() => _vorDepotVorlagenZertifikatePlan) : undefined),
  _vorDepotVorlagenZertifikateBerichte: (typeof _vorDepotVorlagenZertifikateBerichte !== 'undefined' ? (() => _vorDepotVorlagenZertifikateBerichte) : undefined),
  _istVorlagenZertifikat: (typeof _istVorlagenZertifikat !== 'undefined' ? _istVorlagenZertifikat : undefined),
  _vorlagenZertifikatPlanAnwenden: (typeof _vorlagenZertifikatPlanAnwenden !== 'undefined' ? _vorlagenZertifikatPlanAnwenden : undefined),
  _vorlagenPlanDefinitionenAnwenden: (typeof _vorlagenPlanDefinitionenAnwenden !== 'undefined' ? _vorlagenPlanDefinitionenAnwenden : undefined),
  // A437 (21.08.2026): der Gleichheitsbegriff der fuenf Einlass-Register.
  _einbettenMitFassung, _modulAnbieterKennung,
  // Glied 7 (18.08.2026): der Format-Kanal als BESCHREIBUNG (U2-ADR-146)
  FORMAT_LESER, leserAufloesen, leserKennungHeute, formatModulPruefen, formatModulZuImportKanal, formatModulZuExportKanal,
  formatModulEinbetten, alleImportFormate, alleExportFormate, importFormatFuerId, exportFormatFuerId,
  FORMAT_MODUL_SCHLUESSEL,   // U2-ADR-255 (Auftrag, 04.09.2026) — derselbe Name wie die Zeile darüber, kein Guard nötig
  /* U2-ADR-257 (Auftrag, 04.09.2026) — die Schreibseite. ALS typeof-Ausdruck: dieser
     Harnisch laedt auch KERNE AUS AELTEREN COMMITS (s. den Absatz weiter unten), und dort
     gibt es diese Namen nicht — ein blosser Name wuerfe dort "is not defined" und risse eine
     fremde Probe mit. Genau dieser Vergleich mit einem aelteren Kern ist der Byte-Beweis der
     Rueckwaertskompatibilitaet in tests/u2-adr-257-format-schreiber.test.js. */
  FORMAT_SCHREIBER: (typeof FORMAT_SCHREIBER !== 'undefined') ? FORMAT_SCHREIBER : undefined,
  FORMAT_SCHREIBER_STANDARD: (typeof FORMAT_SCHREIBER_STANDARD !== 'undefined') ? FORMAT_SCHREIBER_STANDARD : undefined,
  _FORMAT_SCHREIBER_LUECKEN: (typeof _FORMAT_SCHREIBER_LUECKEN !== 'undefined') ? _FORMAT_SCHREIBER_LUECKEN : undefined,
  schreiberAufloesen: (typeof schreiberAufloesen !== 'undefined') ? schreiberAufloesen : undefined,
  schreiberKennungHeute: (typeof schreiberKennungHeute !== 'undefined') ? schreiberKennungHeute : undefined,
  _objektAlsXmlDokument: (typeof _objektAlsXmlDokument !== 'undefined') ? _objektAlsXmlDokument : undefined,
  _formatPfadLesen, _formatUnterPfad,
  // Standard-Dokument-Listen (U2-ADR-014, Stufe 2/Einheit 2) — reine Registry-Leser
  SEKTOREN, standardDokumenteFuer, alleStandardDokumente,
  /* Die Herkunftssprache einer Modul-Beschriftung (1.0a, 22.08.2026).
     ALS typeof-Ausdruck und nicht als blosser Name: dieser Harnisch laedt auch
     KERNE AUS AELTEREN COMMITS (tests/docx-streichung-gegenprobe.test.js gegen
     den Stand vor der Streichung). Ein blosser Name wirft dort "is not defined"
     und reisst eine Probe mit, die mit dieser Sache nichts zu tun hat.
     KEINE BACKTICKS HIER: dieser Kommentar steht INNERHALB des Template-Strings
     EXPORT_HOOK — ein Backtick beendet ihn, und load-kern.js laedt nicht mehr.
     Beim Bau genau so passiert. */
  _MODUL_SPRACHE_FORM: (typeof _MODUL_SPRACHE_FORM !== 'undefined') ? _MODUL_SPRACHE_FORM : undefined,
  _modulTraegtBeschriftung: (typeof _modulTraegtBeschriftung !== 'undefined') ? _modulTraegtBeschriftung : undefined,
  _modulSpracheGrund: (typeof _modulSpracheGrund !== 'undefined') ? _modulSpracheGrund : undefined,
  // Schnitt Glied 6 (23.08.2026, 1.4b) — typeof-geschuetzt wie oben.
  _istSprachvariantenObjekt: (typeof _istSprachvariantenObjekt !== 'undefined') ? _istSprachvariantenObjekt : undefined,
  _sprachvarianteRepraesentativ: (typeof _sprachvarianteRepraesentativ !== 'undefined') ? _sprachvarianteRepraesentativ : undefined,
  _templateLabelAktiv: (typeof _templateLabelAktiv !== 'undefined') ? _templateLabelAktiv : undefined,
  // Posten 3/1.1b (22.08.2026) — typeof-geschuetzt wie oben: der Harnisch laedt auch Kerne aus
  // aelteren Commits, die die Funktion noch nicht kennen.
  _istBereichLabelKennung: (typeof _istBereichLabelKennung !== 'undefined') ? _istBereichLabelKennung : undefined,
  // Auftrag (10.09.2026) — dieselbe typeof-Absicherung: die drei neuen Kennung-Prüfer
  // (Sektion, Feld/UnterFeld, Option) tragen dieselbe eingebaute-Bereich-Grenze wie
  // _istBereichLabelKennung oben, s. dessen Kopf-Kommentare in vivodepot.html.
  _istSektionLabelKennung: (typeof _istSektionLabelKennung !== 'undefined') ? _istSektionLabelKennung : undefined,
  _istModulfeldKennung: (typeof _istModulfeldKennung !== 'undefined') ? _istModulfeldKennung : undefined,
  _istModuloptionKennung: (typeof _istModuloptionKennung !== 'undefined') ? _istModuloptionKennung : undefined,
  // Auftrag „notiz bleibt Notiz" (10.09.2026) — vierter Spiegel, dieselbe
  // typeof-Absicherung: bereichId.feldId.label für ein fest benanntes bereichsErsatz-Feld.
  // KEINE Backticks in diesem Kommentar (EXPORT_HOOK ist selbst ein Template-Literal, s. oben —
  // ein unescapter Backtick hier beendet es vorzeitig, real getroffen beim ersten Anlauf).
  _istBereichsErsatzFeldKennung: (typeof _istBereichsErsatzFeldKennung !== 'undefined') ? _istBereichsErsatzFeldKennung : undefined,
  _istClusterLabelKennung: (typeof _istClusterLabelKennung !== 'undefined') ? _istClusterLabelKennung : undefined,
  // Bereiche als fuenftes Einlass-Register (A389, 20.08.2026)
  BEREICH_IDS_EINGEBAUT, BEREICHS_MODUL_VERWORFEN, bereichsModulPruefen, bereichsModulEinbetten,
  // Stufe 2 (09.09.2026) — die eingebauten Bereiche als Templates, neben ihren IDs.
  // typeof-abgesichert wie die Nachbarn: der Harnisch laedt auch aeltere Kern-Staende.
  BEREICH_QUELLEN_EINGEBAUT: (typeof BEREICH_QUELLEN_EINGEBAUT !== 'undefined' ? BEREICH_QUELLEN_EINGEBAUT : undefined),
  _bereichsModuleAusDepotAnmelden, bereicheAlle, _sektorIndexNeuBauen,
  // typeof-abgesichert wie die Nachbarn: der Harnisch laedt auch aeltere Kern-Staende, die
  // diese (neuere) Funktion noch nicht kennen (gefunden 17.09.2026, docx-streichung-gegenprobe
  // laedt einen historischen Kern-Stand ueber KERN_HTML_PATH).
  _bereichLabelText: (typeof _bereichLabelText !== 'undefined' ? _bereichLabelText : undefined),
  // Der KATALOG neben der Anzeige (16.09.2026, tools/altbestand-vier-produkte-messen.js): was ein
  // Produkt kennt, auch wo es den Bereich nicht zeigt. typeof-geschuetzt, der Harnisch laedt auch
  // aeltere Kerne. KEINE Backticks in diesem Kommentar.
  _bereicheImKatalog: (typeof _bereicheImKatalog !== 'undefined') ? _bereicheImKatalog : undefined,
  _sektorAusKatalog: (typeof _sektorAusKatalog !== 'undefined') ? _sektorAusKatalog : undefined,
  // Vivodepots eigene Treuhand-Kette ist intern (16.09.2026) — typeof-geschuetzt wie oben.
  EIGENE_AUSGABESTELLEN: (typeof EIGENE_AUSGABESTELLEN !== 'undefined') ? EIGENE_AUSGABESTELLEN : undefined,
  _istEigeneTreuhandKette: (typeof _istEigeneTreuhandKette !== 'undefined') ? _istEigeneTreuhandKette : undefined,
  // Der Rückfall in derselben Sprache (16.09.2026) — typeof-geschuetzt wie oben.
  TEXTSATZ_RUECKFAELLE: (typeof TEXTSATZ_RUECKFAELLE !== 'undefined') ? TEXTSATZ_RUECKFAELLE : undefined,
  _textsatzRueckfall: (typeof _textsatzRueckfall !== 'undefined') ? _textsatzRueckfall : undefined,
  // U2-ADR-348 (vorläufig, 07.09.2026) — Struktur-Achse, Tausch statt Ergänzung.
  // typeof-abgesichert: der Harnisch laedt auch Kerne aus aelteren Commits, die diese Namen
  // noch nicht kennen.
  _bereichsErsatzPruefen: (typeof _bereichsErsatzPruefen !== 'undefined') ? _bereichsErsatzPruefen : undefined,
  AB_WERK_BEREICHE_BEKANNT: (typeof AB_WERK_BEREICHE_BEKANNT !== 'undefined') ? AB_WERK_BEREICHE_BEKANNT : undefined,
  _abWerkModulKennungen: (typeof _abWerkModulKennungen !== 'undefined') ? _abWerkModulKennungen : undefined,
  _abWerkMerkmalNeuSetzen: (typeof _abWerkMerkmalNeuSetzen !== 'undefined') ? _abWerkMerkmalNeuSetzen : undefined,
  _bereichIdsErsetztHalter: (typeof _BEREICH_IDS_ERSETZT !== 'undefined') ? (() => _BEREICH_IDS_ERSETZT) : undefined,
  _bereichIdsAusErsatzHalter: (typeof _BEREICH_IDS_AUS_ERSATZ !== 'undefined') ? (() => _BEREICH_IDS_AUS_ERSATZ) : undefined,
  // U2-ADR-246 (04.09.2026) — Situationen andockbar, wörtlicher Spiegel der Zeile darüber.
  // typeof-abgesichert: der Harnisch laedt auch Kerne aus aelteren Commits, die diese Namen
  // noch nicht kennen.
  SITUATION_IDS_EINGEBAUT: (typeof SITUATION_IDS_EINGEBAUT !== 'undefined') ? SITUATION_IDS_EINGEBAUT : undefined,
  SITUATIONEN_MODUL_VERWORFEN: (typeof SITUATIONEN_MODUL_VERWORFEN !== 'undefined') ? SITUATIONEN_MODUL_VERWORFEN : undefined,
  situationsModulPruefen: (typeof situationsModulPruefen !== 'undefined') ? situationsModulPruefen : undefined,
  situationsModulEinbetten: (typeof situationsModulEinbetten !== 'undefined') ? situationsModulEinbetten : undefined,
  _situationsModuleAusDepotAnmelden: (typeof _situationsModuleAusDepotAnmelden !== 'undefined') ? _situationsModuleAusDepotAnmelden : undefined,
  situationenAlle: (typeof situationenAlle !== 'undefined') ? situationenAlle : undefined,
  HILFE_THEMEN: (typeof HILFE_THEMEN !== 'undefined') ? HILFE_THEMEN : undefined,
  hilfeThemaModell: (typeof hilfeThemaModell !== 'undefined') ? hilfeThemaModell : undefined,
  hilfeUebersichtModell: (typeof hilfeUebersichtModell !== 'undefined') ? hilfeUebersichtModell : undefined,
  hilfeThemaHTML: (typeof hilfeThemaHTML !== 'undefined') ? hilfeThemaHTML : undefined,
  hilfeUebersichtHTML: (typeof hilfeUebersichtHTML !== 'undefined') ? hilfeUebersichtHTML : undefined,
  hilfeOverlayHTML: (typeof hilfeOverlayHTML !== 'undefined') ? hilfeOverlayHTML : undefined,
  _situationIndexNeuBauen: (typeof _situationIndexNeuBauen !== 'undefined') ? _situationIndexNeuBauen : undefined,
  // U2-ADR-NNN (19.09.2026) — Angehörigen-Vorlagen, wörtlicher Spiegel der Situationen-Zeilen
  // direkt oberhalb. typeof-abgesichert wie dort: der Harnisch lädt auch ältere Commits.
  angehoerigenVorlagePruefen: (typeof angehoerigenVorlagePruefen !== 'undefined') ? angehoerigenVorlagePruefen : undefined,
  _angehoerigenVorlagenAusDepotAnmelden: (typeof _angehoerigenVorlagenAusDepotAnmelden !== 'undefined') ? _angehoerigenVorlagenAusDepotAnmelden : undefined,
  angehoerigenSituationenAlle: (typeof angehoerigenSituationenAlle !== 'undefined') ? angehoerigenSituationenAlle : undefined,
  _angSituationen: (typeof _angSituationen !== 'undefined') ? _angSituationen : undefined,
  _angSituationById: (typeof _angSituationById !== 'undefined') ? _angSituationById : undefined,
  _kreisBausteinZeileHTML: (typeof _kreisBausteinZeileHTML !== 'undefined') ? _kreisBausteinZeileHTML : undefined,
  _kreisZeileHTML: (typeof _kreisZeileHTML !== 'undefined') ? _kreisZeileHTML : undefined,
  oeffneAngehoerigenBlatt: (typeof oeffneAngehoerigenBlatt !== 'undefined') ? oeffneAngehoerigenBlatt : undefined,
  angehoerigenBlattZurueck: (typeof angehoerigenBlattZurueck !== 'undefined') ? angehoerigenBlattZurueck : undefined,
  get aktiverAngBlattId() { return (typeof aktiverAngBlattId !== 'undefined') ? aktiverAngBlattId : undefined; },
  AB_WERK_ANGEHOERIGEN_QUELLEN: (typeof AB_WERK_ANGEHOERIGEN_QUELLEN !== 'undefined') ? AB_WERK_ANGEHOERIGEN_QUELLEN : undefined,
  ANGEHOERIGEN_VORLAGEN_MODUL_VERWORFEN: (typeof ANGEHOERIGEN_VORLAGEN_MODUL_VERWORFEN !== 'undefined') ? ANGEHOERIGEN_VORLAGEN_MODUL_VERWORFEN : undefined,
  // Wörtlicher Spiegel von _sektorIndexHalter (s. dort): SITUATION_BY_ID ist seit U2-ADR-246
  // eine let-Bindung. Der Wert-Export (Zeile ~394) bleibt der Schnappschuss der eingebauten
  // zehn; wer den LAUFENDEN Index nach dem Andocken braucht, nimmt diesen Getter.
  _situationIndexHalter: (typeof SITUATION_BY_ID !== 'undefined') ? (() => SITUATION_BY_ID) : undefined,
  // U2-ADR-250 (04.09.2026) — Assistenten andockbar, wörtlicher Spiegel der Situationen-Zeilen
  // direkt darüber. typeof-abgesichert, derselbe Grund.
  WIZARD_IDS_EINGEBAUT: (typeof WIZARD_IDS_EINGEBAUT !== 'undefined') ? WIZARD_IDS_EINGEBAUT : undefined,
  WIZARDS_MODUL_VERWORFEN: (typeof WIZARDS_MODUL_VERWORFEN !== 'undefined') ? WIZARDS_MODUL_VERWORFEN : undefined,
  wizardsModulPruefen: (typeof wizardsModulPruefen !== 'undefined') ? wizardsModulPruefen : undefined,
  wizardsModulEinbetten: (typeof wizardsModulEinbetten !== 'undefined') ? wizardsModulEinbetten : undefined,
  _wizardsModuleAusDepotAnmelden: (typeof _wizardsModuleAusDepotAnmelden !== 'undefined') ? _wizardsModuleAusDepotAnmelden : undefined,
  wizardsAlle: (typeof wizardsAlle !== 'undefined') ? wizardsAlle : undefined,
  _wizardIndexNeuBauen: (typeof _wizardIndexNeuBauen !== 'undefined') ? _wizardIndexNeuBauen : undefined,
  // Wörtlicher Spiegel von _situationIndexHalter (s. dort): WIZARD_BY_ID ist seit U2-ADR-250
  // eine let-Bindung. Der Wert-Export (Zeile ~422) bleibt der Schnappschuss der eingebauten
  // sieben; wer den LAUFENDEN Index nach dem Andocken braucht, nimmt diesen Getter.
  _wizardIndexHalter: (typeof WIZARD_BY_ID !== 'undefined') ? (() => WIZARD_BY_ID) : undefined,
  // U2-ADR-251 (04.09.2026) — Ereignis-Achse andockbar, wörtlicher Spiegel der Assistenten-
  // Zeilen direkt darüber. typeof-abgesichert, derselbe Grund. Kein eigener Index-Halter: die
  // Ereignis-Achse hat kein *_BY_ID-Gegenstück (kein natürliches Einzel-Schlüssel-Feld, s.
  // Kopfkommentar bei ereignisAchseModulPruefen im Kern).
  // U2-ADR-253 (Paket 3, Commit A) — reservierter Namensraum, wörtlicher Spiegel von
  // BEREICH_IDS_EINGEBAUT/SITUATION_IDS_EINGEBAUT/WIZARD_IDS_EINGEBAUT, hier bislang NEU.
  EREIGNIS_ACHSE_TRIPEL_EINGEBAUT: (typeof EREIGNIS_ACHSE_TRIPEL_EINGEBAUT !== 'undefined') ? EREIGNIS_ACHSE_TRIPEL_EINGEBAUT : undefined,
  EREIGNIS_ACHSE_MODUL_VERWORFEN: (typeof EREIGNIS_ACHSE_MODUL_VERWORFEN !== 'undefined') ? EREIGNIS_ACHSE_MODUL_VERWORFEN : undefined,
  ereignisAchseModulPruefen: (typeof ereignisAchseModulPruefen !== 'undefined') ? ereignisAchseModulPruefen : undefined,
  ereignisAchseModulEinbetten: (typeof ereignisAchseModulEinbetten !== 'undefined') ? ereignisAchseModulEinbetten : undefined,
  _ereignisAchseModuleAusDepotAnmelden: (typeof _ereignisAchseModuleAusDepotAnmelden !== 'undefined') ? _ereignisAchseModuleAusDepotAnmelden : undefined,
  ereignisAchseFelderAlle: (typeof ereignisAchseFelderAlle !== 'undefined') ? ereignisAchseFelderAlle : undefined,
  // U2-ADR-187 (01.09.2026) — Bereichs-Identität überlebt ihren Bereich. typeof-geschuetzt: der
  // Harnisch laedt auch Kerne aus aelteren Commits, die diese Namen noch nicht kennen.
  bereicheVerwaisteAlle: (typeof bereicheVerwaisteAlle !== 'undefined') ? bereicheVerwaisteAlle : undefined,
  _bereichAnzeigenameAusId: (typeof _bereichAnzeigenameAusId !== 'undefined') ? _bereichAnzeigenameAusId : undefined,
  // Sidebar-Cluster-Gruppierung (U2-ADR-171, 25.08.2026) — typeof-abgesichert: historische
  // Kern-Stände (docx-streichung-gegenprobe u.a.) kennen diese Namen noch nicht.
  BEREICH_CLUSTER_ZUORDNUNG: (typeof BEREICH_CLUSTER_ZUORDNUNG !== 'undefined' ? BEREICH_CLUSTER_ZUORDNUNG : undefined),
  BEREICH_CLUSTER_REIHENFOLGE: (typeof BEREICH_CLUSTER_REIHENFOLGE !== 'undefined' ? BEREICH_CLUSTER_REIHENFOLGE : undefined),
  bereicheNachCluster: (typeof bereicheNachCluster !== 'undefined' ? bereicheNachCluster : undefined),
  bereicheNachClusterSichtbar: (typeof bereicheNachClusterSichtbar !== 'undefined' ? bereicheNachClusterSichtbar : undefined),
  bereichUebersetzt: (typeof bereichUebersetzt !== 'undefined' ? bereichUebersetzt : undefined),
  situationUebersetzt: (typeof situationUebersetzt !== 'undefined' ? situationUebersetzt : undefined),
  nichtUebersetzteZeigenSetzen: (typeof nichtUebersetzteZeigenSetzen !== 'undefined' ? nichtUebersetzteZeigenSetzen : undefined),
  _situationSichtbarInAuswahl: (typeof _situationSichtbarInAuswahl !== 'undefined' ? _situationSichtbarInAuswahl : undefined),
  _anlassSichtbar: (typeof _anlassSichtbar !== 'undefined' ? _anlassSichtbar : undefined),
  // SEKTOR_BY_ID ist seit A389 eine let-Bindung (sie waechst mit angedockten Bereichen).
  // Der Wert-Export oben bleibt fuer die Bestandsaufrufer stehen — er ist der Schnappschuss
  // der eingebauten Zwoelf. Wer den LAUFENDEN Index braucht, nimmt diesen Getter; dieselbe
  // Bauart wie _ankerDatenHalter weiter unten.
  _sektorIndexHalter: () => SEKTOR_BY_ID,
  // Institutions-Arten als fuenfter Andockweg (U2-ADR-142, 17.08.2026)
  INSTITUTION_ART, INSTITUTION_ART_LABEL, INSTITUTION_ART_EINGEBAUT, INSTITUTION_ART_VERWORFEN,
  institutionsArtModulPruefen, institutionsArtModulEinbetten, _institutionsArtenAusDepotAnmelden,
  institutionsArtLabel, institutionsArtenAlle,
  // Blattformat als elfter Andockweg (Auftrag, 07.09.2026). typeof-abgesichert: ein
  // historischer Kern-Stand (Varianten-Proben u.ae.) kennt diese Namen nicht.
  BLATTFORMAT_ALLOWLIST: (typeof BLATTFORMAT_ALLOWLIST !== 'undefined' ? BLATTFORMAT_ALLOWLIST : undefined),
  blattformatModulPruefen: (typeof blattformatModulPruefen !== 'undefined' ? blattformatModulPruefen : undefined),
  blattformatModulEinbetten: (typeof blattformatModulEinbetten !== 'undefined' ? blattformatModulEinbetten : undefined),
  _blattformatModuleAusDepotAnmelden: (typeof _blattformatModuleAusDepotAnmelden !== 'undefined' ? _blattformatModuleAusDepotAnmelden : undefined),
  blattformat: (typeof blattformat !== 'undefined' ? blattformat : undefined),
  felderNurMitWert: (typeof felderNurMitWert !== 'undefined' ? felderNurMitWert : undefined),
  feldNurMitWertUndLeer: (typeof feldNurMitWertUndLeer !== 'undefined' ? feldNurMitWertUndLeer : undefined),
  feldSichtbar: (typeof feldSichtbar !== 'undefined' ? feldSichtbar : undefined),
  bedingungskatalogModulPruefen: (typeof bedingungskatalogModulPruefen !== 'undefined' ? bedingungskatalogModulPruefen : undefined),
  bedingungskatalogModulEinbetten: (typeof bedingungskatalogModulEinbetten !== 'undefined' ? bedingungskatalogModulEinbetten : undefined),
  _bedingungskatalogModuleAusDepotAnmelden: (typeof _bedingungskatalogModuleAusDepotAnmelden !== 'undefined' ? _bedingungskatalogModuleAusDepotAnmelden : undefined),
  bedingungskatalog: (typeof bedingungskatalog !== 'undefined' ? bedingungskatalog : undefined),
  AB_WERK_BEDINGUNGSKATALOG: (typeof AB_WERK_BEDINGUNGSKATALOG !== 'undefined' ? AB_WERK_BEDINGUNGSKATALOG : undefined),
  // Institutions-Branding als sechster Andockweg (A523, 24.08.2026), seit U2-ADR-296
  // (05.09.2026) real verdrahtet (CSS-Custom-Properties + Sektor-Rand bei Fremdmarke).
  // typeof-abgesichert: ein historischer Kern-Stand (docx-streichung-gegenprobe u.ae.) kennt
  // diese Namen noch nicht.
  brandingModulPruefen: (typeof brandingModulPruefen !== 'undefined' ? brandingModulPruefen : undefined),
  brandingModulEinbetten: (typeof brandingModulEinbetten !== 'undefined' ? brandingModulEinbetten : undefined),
  brandingAnwenden: (typeof brandingAnwenden !== 'undefined' ? brandingAnwenden : undefined),
  // Auftrag „Branding anschließen" (07.09.2026) — Fund 1: name/domain waren geprüft,
  // nie angewendet. typeof-abgesichert wie die Geschwister direkt oben.
  _markeName: (typeof _markeName !== 'undefined' ? _markeName : undefined),
  _markeDomain: (typeof _markeDomain !== 'undefined' ? _markeDomain : undefined),
  _markePlatzhalterAufloesen: (typeof _markePlatzhalterAufloesen !== 'undefined' ? _markePlatzhalterAufloesen : undefined),
  // 34.7 (Angaben am Herkunftsort): die Ergänzungen der Ausgangsprüfung sind sichtbar, keine stille Reparatur (tests/herkunftsort-invariante.test.js).
  _HERKUNFTSORT_ERGAENZT: (typeof _HERKUNFTSORT_ERGAENZT !== 'undefined' ? _HERKUNFTSORT_ERGAENZT : undefined),
  // A352-Stolperdraht (tests/anker-und-certs-echte-kette.test.js): die Referenz auf den fire-and-forget Boot-Lauf
  // von basisVorlagenVerifizieren() — await V._basisVorlagenBootPromise statt einer geratenen Zeitgrenze.
  _basisVorlagenBootPromise: (typeof _basisVorlagenBootPromise !== 'undefined' ? _basisVorlagenBootPromise : undefined),
  _herkunftsortAusgabe: (typeof _herkunftsortAusgabe !== 'undefined' ? _herkunftsortAusgabe : undefined),
  _beschriftungPlatzhalterAufloesen: (typeof _beschriftungPlatzhalterAufloesen !== 'undefined' ? _beschriftungPlatzhalterAufloesen : undefined),
  _markeAnzeigeAnwenden: (typeof _markeAnzeigeAnwenden !== 'undefined' ? _markeAnzeigeAnwenden : undefined),
  AB_WERK_BRANDING: (typeof AB_WERK_BRANDING !== 'undefined' ? AB_WERK_BRANDING : undefined),
  _abWerkBrandingErmitteln: (typeof _abWerkBrandingErmitteln !== 'undefined' ? _abWerkBrandingErmitteln : undefined),
  _AB_WERK_BRANDING: (typeof _AB_WERK_BRANDING !== 'undefined' ? _AB_WERK_BRANDING : undefined),
  erscheinungAnwenden: (typeof erscheinungAnwenden !== 'undefined' ? erscheinungAnwenden : undefined),
  _VD_ERSCHEINUNG_FS_CSS_EIGENSCHAFTEN: (typeof _VD_ERSCHEINUNG_FS_CSS_EIGENSCHAFTEN !== 'undefined' ? _VD_ERSCHEINUNG_FS_CSS_EIGENSCHAFTEN : undefined),
  erscheinungModulPruefen: (typeof erscheinungModulPruefen !== 'undefined' ? erscheinungModulPruefen : undefined),
  erscheinungModulEinbetten: (typeof erscheinungModulEinbetten !== 'undefined' ? erscheinungModulEinbetten : undefined),
  _bereichFremdeMarkeHerkunft: (typeof _bereichFremdeMarkeHerkunft !== 'undefined' ? _bereichFremdeMarkeHerkunft : undefined),
  // U2-ADR-297 (05.09.2026) — Fall 2: Vor-Depot-Branding füllt die Kopfzeile.
  _brandingProduktTopbarAnwenden: (typeof _brandingProduktTopbarAnwenden !== 'undefined' ? _brandingProduktTopbarAnwenden : undefined),
  _brandingTopbarKontrastText: (typeof _brandingTopbarKontrastText !== 'undefined' ? _brandingTopbarKontrastText : undefined),
  _brandingKontrastVerhaeltnisHex: (typeof _brandingKontrastVerhaeltnisHex !== 'undefined' ? _brandingKontrastVerhaeltnisHex : undefined),
  _brandingPaletteAbleiten: (typeof _brandingPaletteAbleiten !== 'undefined' ? _brandingPaletteAbleiten : undefined),
  _brandingPaletteAnwenden: (typeof _brandingPaletteAnwenden !== 'undefined' ? _brandingPaletteAnwenden : undefined),
  _brandingMarkentonTragfaehig: (typeof _brandingMarkentonTragfaehig !== 'undefined' ? _brandingMarkentonTragfaehig : undefined),
  _brandingHexZuHsl: (typeof _brandingHexZuHsl !== 'undefined' ? _brandingHexZuHsl : undefined),
  _brandingHslZuHex: (typeof _brandingHslZuHex !== 'undefined' ? _brandingHslZuHex : undefined),
  _VD_BRANDING_PALETTE_ROLLEN: (typeof _VD_BRANDING_PALETTE_ROLLEN !== 'undefined' ? _VD_BRANDING_PALETTE_ROLLEN : undefined),
  _VD_BRANDING_PALETTE_PAARE: (typeof _VD_BRANDING_PALETTE_PAARE !== 'undefined' ? _VD_BRANDING_PALETTE_PAARE : undefined),
  _VD_BRANDING_SEMANTISCHES_GRUEN: (typeof _VD_BRANDING_SEMANTISCHES_GRUEN !== 'undefined' ? _VD_BRANDING_SEMANTISCHES_GRUEN : undefined),
  // Auftrag „White Label bis ins PDF" (10.09.2026) — Transportweg/Reichweite. typeof-
  // abgesichert wie die Geschwister oben.
  AB_WERK_BRANDING_PRODUKT: (typeof AB_WERK_BRANDING_PRODUKT !== 'undefined' ? AB_WERK_BRANDING_PRODUKT : undefined),
  AB_WERK_RECHTSRAUM_PRODUKT: (typeof AB_WERK_RECHTSRAUM_PRODUKT !== 'undefined' ? AB_WERK_RECHTSRAUM_PRODUKT : undefined),
  _letztesBrandingOderAbWerk: (typeof _letztesBrandingOderAbWerk !== 'undefined' ? _letztesBrandingOderAbWerk : undefined),
  _markeFarbePrimaerHex: (typeof _markeFarbePrimaerHex !== 'undefined' ? _markeFarbePrimaerHex : undefined),
  _markeFarbeSekundaerHex: (typeof _markeFarbeSekundaerHex !== 'undefined' ? _markeFarbeSekundaerHex : undefined),
  _hexZuRgb: (typeof _hexZuRgb !== 'undefined' ? _hexZuRgb : undefined),
  _markeFarbePrimaerRgb: (typeof _markeFarbePrimaerRgb !== 'undefined' ? _markeFarbePrimaerRgb : undefined),
  _markeFarbeSekundaerRgb: (typeof _markeFarbeSekundaerRgb !== 'undefined' ? _markeFarbeSekundaerRgb : undefined),
  _dateiNamePraefix: (typeof _dateiNamePraefix !== 'undefined' ? _dateiNamePraefix : undefined),
  VIVODEPOT_HERKUNFT_LINK: (typeof VIVODEPOT_HERKUNFT_LINK !== 'undefined' ? VIVODEPOT_HERKUNFT_LINK : undefined),
  QUELLCODE_LINK: (typeof QUELLCODE_LINK !== 'undefined' ? QUELLCODE_LINK : undefined),
  // Design-Namensraum: Typprüfung statt Namensliste (U2-ADR-339 vorläufig, 06.09.2026)
  DESIGN_TOKEN_RESERVIERT: (typeof DESIGN_TOKEN_RESERVIERT !== 'undefined' ? DESIGN_TOKEN_RESERVIERT : undefined),
  DESIGN_TOKEN_KATEGORIE: (typeof DESIGN_TOKEN_KATEGORIE !== 'undefined' ? DESIGN_TOKEN_KATEGORIE : undefined),
  designTokenWertGueltig: (typeof designTokenWertGueltig !== 'undefined' ? designTokenWertGueltig : undefined),
  designModulPruefen: (typeof designModulPruefen !== 'undefined' ? designModulPruefen : undefined),
  designTokenAnwenden: (typeof designTokenAnwenden !== 'undefined' ? designTokenAnwenden : undefined),
  // Siebtes Register — logikModul (Siebtes-Register-Auftrag, 27.08.2026, Zug 1)
  logikModulPruefen: (typeof logikModulPruefen !== 'undefined' ? logikModulPruefen : undefined),
  logikModulAuszugKartenHTML: (typeof logikModulAuszugKartenHTML !== 'undefined' ? logikModulAuszugKartenHTML : undefined),
  _abWerkAuszuegeEinlassen: (typeof _abWerkAuszuegeEinlassen !== 'undefined' ? _abWerkAuszuegeEinlassen : undefined),
  AB_WERK_AUSZUG_BUNDLE_TEXTE: (typeof AB_WERK_AUSZUG_BUNDLE_TEXTE !== 'undefined' ? AB_WERK_AUSZUG_BUNDLE_TEXTE : undefined),
  // U2-ADR-398 (08.09.2026, Auftrag „das gekündigte Zimmer") — die Mitschrift-Funktionen,
  // für Proben unabhängig von depotAnlegen()s eigentlicher Einfügestelle testbar.
  _abWerkMitschriftErzeugen: (typeof _abWerkMitschriftErzeugen !== 'undefined' ? _abWerkMitschriftErzeugen : undefined),
  _abWerkStrukturInsDepot: (typeof _abWerkStrukturInsDepot !== 'undefined' ? _abWerkStrukturInsDepot : undefined),
  // U2-ADR-421-Nachtrag (08.09.2026): achte Ab-Werk-Saat, Vorlagen-Felder. Name fest (Auflage).
  _abWerkVorlagenFelder: (typeof _abWerkVorlagenFelder !== 'undefined' ? _abWerkVorlagenFelder : undefined),
  _abWerkVorlagenInsDepot: (typeof _abWerkVorlagenInsDepot !== 'undefined' ? _abWerkVorlagenInsDepot : undefined),
  ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT: (typeof ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT !== 'undefined' ? ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT : undefined),
  logikModulEinbetten: (typeof logikModulEinbetten !== 'undefined' ? logikModulEinbetten : undefined),
  // U2-ADR-370 (08.09.2026): 'modul' als DOKUMENT_QUELLE.
  logikModulPruefterminAnlegen: (typeof logikModulPruefterminAnlegen !== 'undefined' ? logikModulPruefterminAnlegen : undefined),
  // dokumentTypExistiert war vor U2-ADR-370 nicht exportiert (dokumentLesen/DOKUMENT_QUELLEN
  // s. weiter oben, bereits vorhanden — hier absichtlich nicht doppelt geführt).
  dokumentTypExistiert: (typeof dokumentTypExistiert !== 'undefined' ? dokumentTypExistiert : undefined),
  // U2-ADR-287 (05.09.2026): listenfeldAlle-Primitiv, bislang nicht exportiert. Typeof-
  // abgesichert wie jeder frische Export — tests/docx-streichung-gegenprobe.test.js lädt über
  // KERN_HTML_PATH auch HISTORISCHE vivodepot.html-Stände, die LOGIK_DATEN_TYPEN noch nicht
  // kennen (Fund am eigenen Bau: ReferenceError bei einer bar referenzierten "bestehenden"
  // Konstante, die tatsächlich nicht in jedem geladenen Stand existiert).
  LOGIK_DATEN_TYPEN: (typeof LOGIK_DATEN_TYPEN !== 'undefined' ? LOGIK_DATEN_TYPEN : undefined),
  // Textsatz (U2-ADR-141, Nachtkette Andockbarkeit 17.08.2026)
  TEXTSATZ_ARTEN, TEXTSATZ_FEHLSTELLEN, TEXTSATZ_SPRACHE_EINGEBAUT,
  textLesen, textsatzSpracheAktiv, textsatzModulPruefen, textsatzModulEinbetten,
  // U2-ADR-285 — Gerüst-eigener Prüfweg für sprache:'de' (Aufrufstellen-Bindung, keine Aufrufer)
  _textsatzModulPruefenGeruest: (typeof _textsatzModulPruefenGeruest === 'function' ? _textsatzModulPruefenGeruest : undefined),
  // Schnitt Glied 4 (23.08.2026, A469): neue Funktion, version-gebunden wie _korb1MehrwertigMigrieren
  // oben — alte Commits (KERN_HTML_PATH) kennen sie nicht, ein bloßer Bezeichner wuerfe dort.
  textsatzRechtsraumAktiv: (typeof textsatzRechtsraumAktiv !== 'undefined' ? textsatzRechtsraumAktiv : undefined),
  _textsatzModuleAusDepotAnmelden, textsatzNeuAnwenden,
  // Stellensatz (U2-ADR-284, 05.09.2026) — neue Symbole, version-gebunden wie textsatzRechtsraumAktiv
  // oben: ein historischer Kern (KERN_HTML_PATH-Override) kennt sie noch nicht, ein bloßer
  // Bezeichner wuerfe dort.
  STELLENSATZ_RECHTSRAUM_EINGEBAUT: (typeof STELLENSATZ_RECHTSRAUM_EINGEBAUT !== 'undefined' ? STELLENSATZ_RECHTSRAUM_EINGEBAUT : undefined),
  STELLENSATZ_EINGEBAUT: (typeof STELLENSATZ_EINGEBAUT !== 'undefined' ? STELLENSATZ_EINGEBAUT : undefined),
  stellensatzModulPruefen: (typeof stellensatzModulPruefen !== 'undefined' ? stellensatzModulPruefen : undefined),
  stellensatzModulEinbetten: (typeof stellensatzModulEinbetten !== 'undefined' ? stellensatzModulEinbetten : undefined),
  stelleLesen: (typeof stelleLesen !== 'undefined' ? stelleLesen : undefined),
  _stellensatzModuleAusDepotAnmelden: (typeof _stellensatzModuleAusDepotAnmelden !== 'undefined' ? _stellensatzModuleAusDepotAnmelden : undefined),
  _stelleFuerFeld: (typeof _stelleFuerFeld !== 'undefined' ? _stelleFuerFeld : undefined),
  getStellensatzModulRegistry: () => (typeof _STELLENSATZ_MODUL_REGISTRY !== 'undefined' ? _STELLENSATZ_MODUL_REGISTRY : undefined),
  // U2-ADR-253 (Paket 3, Commit A) — der Begehungslauf selbst, direkt aufrufbar mit einem
  // eigenen Aufrufer-Argument, damit ein Test beobachten kann, WELCHE Kennungen er besucht
  // (Spion statt AB_WERK_TEXTSATZ_DE/Stelle-2-Umweg, s. tests/paket3-commitA-entkopplung.test.js).
  // KEIN Backtick in diesem Kommentar — EXPORT_HOOK ist selbst ein Template-Literal, ein
  // Backtick hier bricht es (feedback_backtick_im_kommentar_bricht_template_literal, wieder).
  _textsatzOrteBegehen,
  textsatzRegeln, textsatzSchreibrichtungAnwenden, textsatzSprachkennungAnwenden, TEXTSATZ_REGEL_FORM,
  TEXTSATZ_REGELN_EINGEBAUT, TEXTSATZ_REGELN_ERLAUBT, _textsatzRegelnPruefen,
  // Dokument-Panel (U2-ADR-014, Stufe 2/Einheit 3) — Render + Standard-Übernahme-Helfer
  dokumentPanelHTML, dokumentAusStandard, _dokumentRhythmusOptionenHTML, verdrahteDokumentPanel,
  // Eintrag-Bezug (Auftrag M3, 11.08.2026) — Zeilen-Diskriminant-Auflösung für Standard-Doks
  _vorsorgeInstrumentZeileFuerStandardTyp, _standardDokumentFelderMitZeile, dokumenteFuerEintrag,
  // Wizard-Dokument-Registrierung (U2-ADR-014, Stufe 2/Einheit 4) — Dedup-by-typ + Abschluss-Hook
  dokumentFuerTyp, dokumentTypExistiert,
  // Ereignis-Achse („Die Ereignis-Achse", 13.08.2026)
  EREIGNIS_ARTEN, EREIGNIS_ACHSE_FELDER, ereignisMarkieren, dokumentEreignisSchliessen,
  ereignisAchseWaechterFunde, _ereignisAlleEntitaetPersonFelder, _ereignisBetroffeneZeilenIds,
  // A436 (21.08.2026): die Achse fuer angedockte Felder — Eintrag-Aufloeser und Standardmenge.
  _ereignisAchseEintragFuer, EREIGNIS_ACHSE_ANGEDOCKT_STANDARD, _ereignisAchseListen,
  // A435 (21.08.2026): der dritte Satz haengt am Instrument, nicht am Anlass.
  EREIGNIS_VOLLMACHT_TYPEN, _ereignisAnlaesseFuerZeile,
  ereignisBetreuungsbeginnMarkieren,
  // Auftragskette 14.08.2026, Glied 3, Zug 5
  familienstandLageVorschlag, vorgeschlageneLageSchliessen, vorgeschlageneLageBannerHTML,
  WIZARD_DOKUMENT_MAP, _wizardDokumentGueltigAb, wizardDokumentRegistrieren,
  _dokumentTypRegistrieren, instrumentDokumentNachtragen,   // C7/U2-ADR-118 (Weg 3)
  // Erkennung bestehender Standard-Dokumente (U2-ADR-014) — Vorschlag/Annehmen/Ablehnen/Reaktivieren
  ERKENNUNG_LEITFELDER, _erkennungFeldWert, _erkennungVorbelegung,
  erkennungsVorschlagFuer, erkennungsVorschlaege,
  dokumentAusErkennung, erkennungAblehnen, erkennungReaktivieren,
  SCHRIFT_SKALA, naechsteSchriftSkala, aktuelleSchriftSkala, schriftSkalaWeiterschalten,
  setzeSchriftSkala, toggleHtmlKlasse, htmlKlasseAktiv,
  // Vorlesen (Sprachausgabe, Web Speech API) — Text-Erzeuger + Steuerung + Test-Engine-Hook
  vorleseVerfuegbar, vorleseLaeuft, vorleseStarten, vorleseStoppen, vorleseToggle,
  vorleseTextSektor, vorleseTextSituation, vorleseTextWelcome, vorleseTextAktuell,
  waehleVorleseStimme, vorleseStimmen, vorleseZustandSetzen, diktierHinweisHTML,
  _setVorleseEngine,
  flowEinstellungen, einstellungenHTML,
  modusFlaechenKlasse, escapeHTML,
  escapeAttr: (typeof escapeAttr === 'function' ? escapeAttr : undefined),
  // W-8 Zug 5 (09.08.2026) — PWA-Installations-Block: GETTER/SETTER statt Wert-Export, dieselbe
  // Begründung wie bei den anderen let/var-Zustandsvariablen oben (Schnappschuss vom Ladezeitpunkt).
  _installBlockHTML, _installKnopfVerdrahten, _installBlockAktualisieren,
  _appWurdeInstalliertHalter: () => _appWurdeInstalliert,
  _setzeAppWurdeInstalliert: (v) => { _appWurdeInstalliert = !!v; },
  _setzeDeferredInstallPrompt: (v) => { _deferredInstallPrompt = v; },
  getViewState: () => ({ aktiverSektorId, aktiveAnsicht, aktiveSituationId }),
  getData: () => data,
  setData: (v) => { data = v; },
  // Code-Listen-Andock (Paket 3)
  CODE_LISTEN, codeListeAnmelden, liesCodeListe, codeListeSuche, codeWertAus,
  BAUSTEIN_BY_ID, lebenslageFelder,   // A58 — Katalog liegt seit T5 im Kern (BAUSTEINE)
  _bausteinHatEintraege,   // K2 (Auftrag K1/K2/K6, 09.08.2026)
  lebenslageAlsBlatt, oeffneLebenslage, _lageBlattSpeichern, _faltContainer,   // A58/A68 (U2-ADR-117) — das eine Lage-Blatt + Schreibweg
  get aktiveLageId() { return aktiveLageId; },
  istCodierterWert, codeSystemKuerzel, _codeEintraege, chipAusEingabe, chipListeMitNeuem,
  // Gemeinsamer JWS-Block (Krypto-Fundament der drei Säulen)
  JWS_TYP, JWS_ALG_PRIMAER, JWS_ALG_FALLBACK,
  _signJWS, _verifyJWS, _jwsImportSignKey, _jwsImportVerifyKey,
  _jwsAlgFuerKey, _jwsWebCryptoParams,
  _jwsB64uFromBytes, _jwsB64uToBytes, _jwsB64uFromString, _jwsB64uToString,
  // Trust-Authority-Anker (produktiv, Laufzeit) + Test-Sentinel (nur Test-Injektion via opts.ankerJwk)
  TRUST_AUTHORITY_PUBLIC_JWK, TEST_SENTINEL_PUBLIC_JWK, TEST_SENTINEL_ISSUER,
  verifiziereProviderCredential,
  _verifiziereZertifikatGegenSchluessel: (typeof _verifiziereZertifikatGegenSchluessel !== 'undefined' ? _verifiziereZertifikatGegenSchluessel : undefined),
  AUSGABESTELLE_ANBIETERTYP: (typeof AUSGABESTELLE_ANBIETERTYP !== 'undefined' ? AUSGABESTELLE_ANBIETERTYP : undefined),
  VIVODEPOT_PRUEFSTELLE_ANBIETERTYP: (typeof VIVODEPOT_PRUEFSTELLE_ANBIETERTYP !== 'undefined' ? VIVODEPOT_PRUEFSTELLE_ANBIETERTYP : undefined),
  VIVODEPOT_INSTITUTION_ANBIETERTYP: (typeof VIVODEPOT_INSTITUTION_ANBIETERTYP !== 'undefined' ? VIVODEPOT_INSTITUTION_ANBIETERTYP : undefined),
  VIVODEPOT_KERN_ANBIETERTYP: (typeof VIVODEPOT_KERN_ANBIETERTYP !== 'undefined' ? VIVODEPOT_KERN_ANBIETERTYP : undefined),
  // U2-ADR-174 Teilprojekt 2 (25.08.2026) — Karten-Raster-Renderer für den Eintragen-Tab, noch
  // nicht verdrahtet. Guard wie bei den Nachbarn oben: ein historischer Kern kennt ihn nicht.
  renderEintragenKartenraster: (typeof renderEintragenKartenraster !== 'undefined' ? renderEintragenKartenraster : undefined),
  // U2-ADR-174 Teilprojekt 2, Task 4 (25.08.2026) — öffnet die Eintragen-Übersicht (Karten-Raster).
  oeffneEintragenUebersicht: (typeof oeffneEintragenUebersicht !== 'undefined' ? oeffneEintragenUebersicht : undefined),
  // Vor-Depot-Sprachschalter, Strang 4 (27.08.2026). PRE_DEPOT_EN entfernt (U2-ADR-363,
  // Zug 2, 07.09.2026) — ersetzt durch das Sprachangebot AB_WERK_SPRACHANGEBOT_QUELLEN (s. unten).
  vorDepotText: (typeof vorDepotText !== 'undefined' ? vorDepotText : undefined),
  vorDepotSpracheUmschalten: (typeof vorDepotSpracheUmschalten !== 'undefined' ? vorDepotSpracheUmschalten : undefined),
  // U2-ADR-260 (04.09.2026): die Auflösung der Vor-Depot-Sprachkennung und ihr Anwenden ans
  // Dokument — getrennt exportiert, damit die Auflösung ohne DOM prüfbar bleibt.
  vorDepotSprachkennung: (typeof vorDepotSprachkennung !== 'undefined' ? vorDepotSprachkennung : undefined),
  vorDepotSprachkennungAnwenden: (typeof vorDepotSprachkennungAnwenden !== 'undefined' ? vorDepotSprachkennungAnwenden : undefined),
  // U2-ADR-256 (04.09.2026) — EINE Anzeige-Komposition statt 21 unabhängiger Kopien.
  identitaetAnzeigename: (typeof identitaetAnzeigename !== 'undefined' ? identitaetAnzeigename : undefined),
  // U2-ADR-318 (06.09.2026) — Deckung der Sprache-/Rechtsraum-Achse des Bündel-Erzeugers:
  // der reale Einlassweg für ein texte-tragendes Modul, gegen den ein eingefrorener
  // Verweis geprüft wird, statt eine eigene Existenzprüfung nachzubauen.
  textsatzModulPruefen: (typeof textsatzModulPruefen !== 'undefined' ? textsatzModulPruefen : undefined),
  // ZS2 (19.09.2026, U2-ADR-331 im Kern) — wörtlicher Spiegel von ZUSICHERUNGS_SCHLUESSEL_LESEN/
  // _istZusicherungsKennung in tests/load-lesen.js.
  ZUSICHERUNGS_SCHLUESSEL_KERN: (typeof ZUSICHERUNGS_SCHLUESSEL_KERN !== 'undefined' ? ZUSICHERUNGS_SCHLUESSEL_KERN : undefined),
  _istZusicherungsKennung: (typeof _istZusicherungsKennung === 'function' ? _istZusicherungsKennung : undefined),
  _textsatzModuleBelegPruefen: (typeof _textsatzModuleBelegPruefen !== 'undefined' ? _textsatzModuleBelegPruefen : undefined),
  _textsatzModulBelegtInfo: (typeof _textsatzModulBelegtInfo !== 'undefined' ? _textsatzModulBelegtInfo : undefined),
  _textsatzBelegtEintragen: (typeof _textsatzBelegtEintragen !== 'undefined' ? _textsatzBelegtEintragen : undefined),
  _TEXTSATZ_BELEGT: (typeof _TEXTSATZ_BELEGT !== 'undefined' ? _TEXTSATZ_BELEGT : undefined),
  _textsatzZusicherungFormOk: (typeof _textsatzZusicherungFormOk !== 'undefined' ? _textsatzZusicherungFormOk : undefined),
  // S8 (U2-ADR-428): die Lesestellen der Sprachbasis, damit je Stelle eine Probe OHNE Alias über das Modul laufen kann (tests/sprach-basis-modulweg.test.js).
  _sprachBasis: (typeof _sprachBasis !== 'undefined' ? _sprachBasis : undefined),
  _sprachBasisSprache: (typeof _sprachBasisSprache !== 'undefined' ? _sprachBasisSprache : undefined),
  _textsatzKennungBekannt: (typeof _textsatzKennungBekannt !== 'undefined' ? _textsatzKennungBekannt : undefined),
  _textsatzKnotenFuellen: (typeof _textsatzKnotenFuellen !== 'undefined' ? _textsatzKnotenFuellen : undefined),
  _textsatzKnotenFuellenOhnePflicht: (typeof _textsatzKnotenFuellenOhnePflicht !== 'undefined' ? _textsatzKnotenFuellenOhnePflicht : undefined),
  _textsatzListeFuellen: (typeof _textsatzListeFuellen !== 'undefined' ? _textsatzListeFuellen : undefined),
  _TEXTSATZ_ZURUECK: (typeof _TEXTSATZ_ZURUECK !== 'undefined' ? _TEXTSATZ_ZURUECK : undefined),
  _stringsAusSatz: (typeof _stringsAusSatz !== 'undefined' ? _stringsAusSatz : undefined),
  _bezeichnungenJePraefix: (typeof _bezeichnungenJePraefix !== 'undefined' ? _bezeichnungenJePraefix : undefined),
  _praefixUebersetzt: (typeof _praefixUebersetzt !== 'undefined' ? _praefixUebersetzt : undefined),

  sprachfassungLueckenAnzahl: (typeof sprachfassungLueckenAnzahl !== 'undefined' ? sprachfassungLueckenAnzahl : undefined),
  sprachfassungHinweisHTML: (typeof sprachfassungHinweisHTML !== 'undefined' ? sprachfassungHinweisHTML : undefined),
  TEXTSATZ_RUECKFAELLE: (typeof TEXTSATZ_RUECKFAELLE !== 'undefined' ? TEXTSATZ_RUECKFAELLE : undefined),
  TEXTSATZ_RUECKFALL_SPRACHE: (typeof TEXTSATZ_RUECKFALL_SPRACHE !== 'undefined' ? TEXTSATZ_RUECKFALL_SPRACHE : undefined),
  TEXTSATZ_ZUSICHERUNG_PRUEFSTUFEN: (typeof TEXTSATZ_ZUSICHERUNG_PRUEFSTUFEN !== 'undefined' ? TEXTSATZ_ZUSICHERUNG_PRUEFSTUFEN : undefined),
  TEXTSATZ_SPRACHE_EINGEBAUT: (typeof TEXTSATZ_SPRACHE_EINGEBAUT !== 'undefined' ? TEXTSATZ_SPRACHE_EINGEBAUT : undefined),
  textLesen: (typeof textLesen !== 'undefined' ? textLesen : undefined),
  textsatzSpracheAktiv: (typeof textsatzSpracheAktiv !== 'undefined' ? textsatzSpracheAktiv : undefined),
  textsatzVolleSprachen: (typeof textsatzVolleSprachen !== 'undefined' ? textsatzVolleSprachen : undefined),
  textsatzSpracheWaehlen: (typeof textsatzSpracheWaehlen !== 'undefined' ? textsatzSpracheWaehlen : undefined),
  textsatzSprachnameEigen: (typeof textsatzSprachnameEigen !== 'undefined' ? textsatzSprachnameEigen : undefined),
  _sprachWahlHTML: (typeof _sprachWahlHTML !== 'undefined' ? _sprachWahlHTML : undefined),
  _textsatzModuleAusDepotAnmelden: (typeof _textsatzModuleAusDepotAnmelden !== 'undefined' ? _textsatzModuleAusDepotAnmelden : undefined),
  feldDefFuer: (typeof feldDefFuer !== 'undefined' ? feldDefFuer : undefined),
  // U2-ADR-363 (Zug 2, 07.09.2026) — Ab-Werk-Sprachmodule: Registry als Getter/Setter (ein
  // \`let\`, von _textsatzModuleAusDepotAnmelden() zur Laufzeit neu zugewiesen — derselbe Griff
  // wie bei aktiveLageId oben), damit ein Test sie fuer den Rot-Beweis gezielt leeren kann.
  get _TEXTSATZ_MODUL_REGISTRY() { return (typeof _TEXTSATZ_MODUL_REGISTRY !== 'undefined' ? _TEXTSATZ_MODUL_REGISTRY : undefined); },
  set _TEXTSATZ_MODUL_REGISTRY(v) { _TEXTSATZ_MODUL_REGISTRY = v; },
  // U2-ADR-401 (11.09.2026) — Widersprüche aus dem letzten _textsatzModuleAusDepotAnmelden-Lauf
  getTextsatzKonflikte: () => (typeof _letzteTextsatzKonflikte !== 'undefined' ? _letzteTextsatzKonflikte : undefined),
  _textsatzAbWerkRegistrySeed: (typeof _textsatzAbWerkRegistrySeed !== 'undefined' ? _textsatzAbWerkRegistrySeed : undefined),
  _abWerkTextsatzDeAbleiten: (typeof _abWerkTextsatzDeAbleiten !== 'undefined' ? _abWerkTextsatzDeAbleiten : undefined),
  AB_WERK_SPRACHANGEBOT_QUELLEN: (typeof AB_WERK_SPRACHANGEBOT_QUELLEN !== 'undefined' ? AB_WERK_SPRACHANGEBOT_QUELLEN : undefined),
  vorDepotSprachangebotVorhanden: (typeof vorDepotSprachangebotVorhanden === 'function' ? vorDepotSprachangebotVorhanden : undefined),
  _STRINGS_EINGEBAUT: (typeof _STRINGS_EINGEBAUT !== 'undefined' ? _STRINGS_EINGEBAUT : undefined),
  // U2-ADR-387 (Auftrag, Ab-Werk-Rangfolge, 08.09.2026) — das logikModul-Gegenstück zu
  // _TEXTSATZ_MODUL_REGISTRY: ein \`let\`, damit ein Test die Ab-Werk-Liste für den Rot-Beweis
  // gezielt befüllen/leeren kann, ohne AB_WERK_LOGIK_MODUL_QUELLEN (eine gefrorene Konstante)
  // anzufassen.
  AB_WERK_LOGIK_MODUL_QUELLEN: (typeof AB_WERK_LOGIK_MODUL_QUELLEN !== 'undefined' ? AB_WERK_LOGIK_MODUL_QUELLEN : undefined),
  _logikModulAbWerkSeed: (typeof _logikModulAbWerkSeed !== 'undefined' ? _logikModulAbWerkSeed : undefined),
  // Strang A, Schnitt-Vorbedingung (17.09.2026) — die produktunabhängige Ab-Werk-Quelle der
  // zwei Auszüge (erbschein-vorbereitung/zugang-zum-recht-beratungshilfe), unabhängig von
  // AB_WERK_LOGIK_MODUL_QUELLEN (die ist produktspezifisch, s. dort) und vom Bündel.
  AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN: (typeof AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN !== 'undefined' ? AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN : undefined),
  _abWerkAuszugPflicht: (typeof _abWerkAuszugPflicht !== 'undefined' ? _abWerkAuszugPflicht : undefined),
  // U2-ADR-398 (08.09.2026) — Bereich-Pendant, für Proben direkt gegen die Mitschrift-
  // Rangfolge testbar, ohne den Umweg über _bereichsModuleAusDepotAnmelden.
  AB_WERK_BEREICH_QUELLEN: (typeof AB_WERK_BEREICH_QUELLEN !== 'undefined' ? AB_WERK_BEREICH_QUELLEN : undefined),
  _bereichModulAbWerkSeed: (typeof _bereichModulAbWerkSeed !== 'undefined' ? _bereichModulAbWerkSeed : undefined),
  // AB_WERK-Mitschrift Fach 8/9 (18.09.2026, Schnitt-Nachtrag, Fund -d2) — fehlten hier
  // bislang ganz, nicht nur ungeprüft: ein Test, der die Rundlauf-Wirklichkeit dieser beiden
  // Fächer prüfen wollte, konnte sie über V. nicht einmal LESEN. typeof-abgesichert wie die
  // Nachbarn — ein historischer Kern (KERN_HTML_PATH auf einen älteren Commit) kennt sie noch
  // nicht. KEINE Backticks in diesem Kommentar — EXPORT_HOOK ist selbst ein Template-Literal.
  AB_WERK_SITUATIONEN_QUELLEN: (typeof AB_WERK_SITUATIONEN_QUELLEN !== 'undefined' ? AB_WERK_SITUATIONEN_QUELLEN : undefined),
  AB_WERK_DOKUMENT_MODULE: (typeof AB_WERK_DOKUMENT_MODULE !== 'undefined' ? AB_WERK_DOKUMENT_MODULE : undefined),
  // Fach 10 (18.09.2026) — Wizard-Quellen, dieselbe Lücke, dritter Fund.
  AB_WERK_WIZARD_QUELLEN: (typeof AB_WERK_WIZARD_QUELLEN !== 'undefined' ? AB_WERK_WIZARD_QUELLEN : undefined),
  get _abWerkLogikModule() { return (typeof _abWerkLogikModule !== 'undefined' ? _abWerkLogikModule : undefined); },
  set _abWerkLogikModule(v) { _abWerkLogikModule = v; },
  _logikModuleAlle: (typeof _logikModuleAlle !== 'undefined' ? _logikModuleAlle : undefined),
  // 17.09.2026 (Pro-Struktur wie Privat): Übernahmen beim Öffnen und die Karten „Weitere Bereiche".
  VORLAGEN_UEBERNAHME_BEFUND: (typeof VORLAGEN_UEBERNAHME_BEFUND !== 'undefined' ? VORLAGEN_UEBERNAHME_BEFUND : undefined),
  _vorlagenFelderInBereichUebernehmen: (typeof _vorlagenFelderInBereichUebernehmen !== 'undefined' ? _vorlagenFelderInBereichUebernehmen : undefined),
  _proIdentitaetUebernehmen: (typeof _proIdentitaetUebernehmen !== 'undefined' ? _proIdentitaetUebernehmen : undefined),
  logikModuleAlsKarten: (typeof logikModuleAlsKarten !== 'undefined' ? logikModuleAlsKarten : undefined),
  // Auftrag, Ab-Werk-Rangfolge (08.09.2026) — Sprach-Pendant zu AB_WERK_LOGIK_MODUL_QUELLEN:
  // null im nativen Gerüst, von produkt-konfektionieren.js per Text-Ersetzung eingebacken. Bleibt
  // bleibt \`const\` im Kern (kein Setter hier) — Backen geschieht am Dateitext, nicht zur Laufzeit.
  AB_WERK_SPRACHE_PRODUKT: (typeof AB_WERK_SPRACHE_PRODUKT !== 'undefined' ? AB_WERK_SPRACHE_PRODUKT : undefined),
  get _vorDepotSpracheAktiv() { return (typeof _vorDepotSpracheAktiv !== 'undefined' ? _vorDepotSpracheAktiv : undefined); },
  set _vorDepotSpracheAktiv(v) { _vorDepotSpracheAktiv = v; },
  // U2-ADR-363 (Zug 2, Fund): der manuelle Vor-Depot-Schalter — getrennt von
  // _vorDepotSpracheAktiv (Sprache eines echten, geladenen Vor-Depot-Moduls), s. Kopf-
  // Kommentar am VOR-DEPOT-SPRACHSCHALTER-Block in vivodepot.html.
  get _vorDepotSprache() { return (typeof _vorDepotSprache !== 'undefined' ? _vorDepotSprache : undefined); },
  set _vorDepotSprache(v) { _vorDepotSprache = v; },
  get AMTLICHE_UEBERSETZUNG_FESTSTELLUNG() { return (typeof AMTLICHE_UEBERSETZUNG_FESTSTELLUNG !== 'undefined' ? AMTLICHE_UEBERSETZUNG_FESTSTELLUNG : undefined); },
  set AMTLICHE_UEBERSETZUNG_FESTSTELLUNG(v) { AMTLICHE_UEBERSETZUNG_FESTSTELLUNG = v; },
  amtlicheUebersetzungVermerkNoetig: (typeof amtlicheUebersetzungVermerkNoetig !== 'undefined' ? amtlicheUebersetzungVermerkNoetig : undefined),
};
`;

// U2-ADR-NNN (18.09.2026, Kern-Verschluss): Script 2 schließt seither mit einem IIFE, das
// alle Top-Level-Namen bis auf eine benannte, kleine Fläche einschließt (Marker in
// vivodepot.html: `@vd-kern-verschluss-ende`, direkt vor der schließenden Klammer). Sowohl
// EXPORT_HOOK als auch die Codelisten-Blöcke unten rufen Kern-Namen BARE auf — sie müssen
// darum INNERHALB dieser Klammer laufen, nicht dahinter angehängt werden (sonst
// `ReferenceError: <name> is not defined`, gemessen an allen 92 Proben der Batterie).
const KERN_VERSCHLUSS_MARKER = '@vd-kern-verschluss-ende';
function spliceVorKernVerschluss(script2Text, einfuegen) {
  const idx = script2Text.indexOf(KERN_VERSCHLUSS_MARKER);
  if (idx < 0) {
    // U2-ADR-NNN-Nachtrag (18.09.2026): KERN_HTML_PATH ist der im ganzen Modul dokumentierte,
    // ausdrückliche Weg, einen HISTORISCHEN (vor dem Kern-Verschluss liegenden) Kern zu laden
    // (s. Kommentar an HTML_PATH oben; dieselbe Umlenkung nutzen u. a. docx-streichung-
    // gegenprobe.test.js, u2-adr-257-format-schreiber.test.js, wizard-optionen-aus-
    // materialisieren-u2-adr-341.test.js). Ein solcher Stand kennt den Marker naturgemäß
    // nicht — keine Regression, sondern die erklärte Absicht der Testdatei, GENAU diesen
    // älteren Stand zu prüfen. Vor dem Verschluss liefen EXPORT_HOOK/Codelisten im selben,
    // flachen Geltungsbereich wie der Rest von Script 2 (script1 + script2 + Codelisten +
    // EXPORT_HOOK, ohne Splice — s. dceab851); ein Anhängen HINTER dem Text bildet dieses
    // damalige, marker-lose Verhalten unverändert nach.
    //
    // Fehlt der Marker dagegen im STANDARD-Pfad (kein KERN_HTML_PATH gesetzt, also im heutigen
    // vivodepot.html), bleibt es beim harten Fehler unten — dort wäre ein fehlender Marker eine
    // echte Regression (der Kern-Verschluss entfernt oder der Marker umbenannt), kein
    // historischer Stand, und darf nicht still überbrückt werden.
    if (process.env.KERN_HTML_PATH) {
      return script2Text + '\n' + einfuegen;
    }
    throw new Error('load-kern.js: Marker "' + KERN_VERSCHLUSS_MARKER + '" fehlt in Script 2 — '
      + 'EXPORT_HOOK/Codelisten können ohne ihn nicht in den Kern-Geltungsbereich gespleisst werden. '
      + 'Wurde der Kern-Verschluss (IIFE um Script 2) entfernt oder der Marker umbenannt?');
  }
  // Vor die MARKER-ZEILE einfügen, nicht mitten hinein — der Marker bleibt lesbar direkt vor
  // der schließenden Klammer, wie in vivodepot.html selbst.
  const zeilenstart = script2Text.lastIndexOf('\n', idx) + 1;
  return script2Text.slice(0, zeilenstart) + einfuegen + '\n' + script2Text.slice(zeilenstart);
}

// Paket 3: die @vd-codeliste-<script>-Blöcke am Dateiende. Sie rufen das in Script 2
// definierte codeListeAnmelden() — im Browser laufen sie nach der App; hier spleissen wir
// sie in die zusammengefügte Quelle VOR dem Kern-Verschluss (s. spliceVorKernVerschluss).
// jsPDF & andere Blöcke werden NICHT geladen (nur Blöcke, deren Inhalt mit
// `/* @vd-codeliste */` beginnt).
function extrahiereCodelisten(html) {
  const OPEN = '<script>', CLOSE = '</script>';
  const blocks = [];
  let from = 0;
  while (true) {
    const o = html.indexOf(OPEN, from);
    if (o < 0) break;
    const oe = o + OPEN.length;
    const c = html.indexOf(CLOSE, oe);
    if (c < 0) break;
    const inhalt = html.slice(oe, c);
    /* A58 (29.07.2026): `@vd-lebenslagen` kommt hinzu — der generierte Lebenslagen-Katalog ist
       derselbe Fall wie eine Code-Liste (Produktdaten, die nach Script 2 ihren Anmelder rufen).
       Als Liste geführt und nicht als zweite `if`-Zeile, damit der nächste Produktdaten-Block
       eine Marke ergänzt und keinen Zweig. */
    if (['/* @vd-codeliste', '/* @vd-lebenslagen'].some((m) => inhalt.trimStart().startsWith(m))) blocks.push(inhalt);
    from = c + CLOSE.length;
  }
  return blocks;
}

/* ── Minimale, aber ECHT funktionsfähige IndexedDB-Attrappe (Nachtrag 08.08.2026) ──────
   Gesamtumbau-Auftrag Zug 2 führt eine Boot-Zeit-Funktionsprobe ein (öffnen, schreiben,
   zurücklesen, löschen — echt gegen VdStore, kein Sonderpfad), die JETZT bei JEDEM
   ladeKern()-Aufruf automatisch mitläuft (booteEingang() steht unbedingt am Skript-Ende).
   14 bestehende Aufrufstellen reichen `indexedDB: {}` — ein reines Capability-Flag-Objekt
   ohne `.open` — nur um hatIndexedDB()===true zu erzwingen; sie erwarten NIE, dass darauf
   tatsächlich geschrieben wird. Ohne diese Attrappe würde die neue Probe GENAU DAS bei
   jedem dieser Tests versuchen, an der fehlenden `.open`-Methode scheitern und
   internerSpeicherModus() für den Rest des Tests still auf false kippen — ein
   Test-Infrastruktur-Artefakt, keine reale Aussage über echtes Safari. Diese Attrappe
   macht `indexedDB: {}` wieder das, was es immer war: ein funktionierender, isolierter
   Speicher pro ladeKern()-Aufruf. Tests, die eine ECHT kaputte Senke stellen wollen,
   injizieren weiterhin gezielt über `VdStore._backendSetzen(...)` — das hat immer Vorrang
   vor dieser Attrappe, weil es die Backend-Wahl selbst ersetzt statt indexedDB.open(). */
function _fakeIndexedDbFactory() {
  const datenbanken = new Map();   // name -> { version, stores: Map(storeName -> { keyPath, data: Map }) }
  return {
    open(name, version) {
      const req = {};
      queueMicrotask(() => {
        try {
          if (!datenbanken.has(name)) datenbanken.set(name, { version: 0, stores: new Map(), handle: null });
          const db = datenbanken.get(name);
          const zielVersion = typeof version === 'number' ? version : (db.version || 1);
          if (!db.handle) {
            db.handle = {
              objectStoreNames: { contains: (n) => db.stores.has(n) },
              createObjectStore: (n, o) => { db.stores.set(n, { keyPath: (o && o.keyPath) || 'id', data: new Map() }); },
              close: () => {},
              transaction: (storeNames) => {
                const n = Array.isArray(storeNames) ? storeNames[0] : storeNames;
                const store = db.stores.get(n);
                const tx = { oncomplete: null, onabort: null, onerror: null };
                tx.objectStore = () => ({
                  put: (rec) => {
                    const rq = {};
                    queueMicrotask(() => { store.data.set(rec[store.keyPath], rec); if (rq.onsuccess) rq.onsuccess(); if (tx.oncomplete) tx.oncomplete(); });
                    return rq;
                  },
                  get: (key) => {
                    const rq = {};
                    queueMicrotask(() => { rq.result = store.data.get(key); if (rq.onsuccess) rq.onsuccess(); });
                    return rq;
                  },
                  delete: (key) => {
                    const rq = {};
                    queueMicrotask(() => { store.data.delete(key); if (rq.onsuccess) rq.onsuccess(); if (tx.oncomplete) tx.oncomplete(); });
                    return rq;
                  },
                  getAll: () => {
                    const rq = {};
                    queueMicrotask(() => { rq.result = Array.from(store.data.values()); if (rq.onsuccess) rq.onsuccess(); });
                    return rq;
                  },
                });
                return tx;
              },
            };
          }
          req.result = db.handle;
          const brauchtUpgrade = zielVersion > db.version;
          if (brauchtUpgrade) { db.version = zielVersion; if (req.onupgradeneeded) req.onupgradeneeded({ target: req }); }
          if (req.onsuccess) req.onsuccess({ target: req });
        } catch (e) {
          req.error = e;
          if (req.onerror) req.onerror({ target: req });
        }
      });
      return req;
    },
  };
}

// opts (optional, rückwärts-kompatibel): { indexedDB, navigator, location } werden
// in den Sandkasten injiziert. Ohne opts bleibt das Verhalten unverändert
// (kein indexedDB/navigator/location top-level → Node = Datei-Modus/In-Memory).
// Damit lassen sich die echten IDB-/Capability-Pfade gegen einen Mock prüfen,
// ohne Test-Haken in die HTML einzubauen (U2-ADR-004).
/* ── KENNUNGS-PRÜFUNG an den Test-Schreibwegen (Kennungs-Umbau „Englisch vor v1", 15.09.2026) ──
   DER BEFUND, AUS DEM SIE KOMMT. `sektorFeldSetzen`, `listenEintragHinzufuegen` und
   `-Aktualisieren` nehmen eine Kennung, die das Modell nicht kennt, STILL an — einen alten
   Bereich (`identitaet`), ein altes Feld (`vorname`), einen alten Unterfeld-Schlüssel (`nr`).
   Nach der Umbenennung liefen darum rund zwanzig GRÜNE Proben mit alten Schlüsseln: sie
   schrieben ins Leere und prüften nichts, oder sie pinnten einen Kern-Fehler fest, der die
   alten Schlüssel noch las (Unit-Batches 2–5 der Kampagne, Commit-Nachrichten dort).

   WARUM HIER UND NICHT IM PRODUKT (Entscheidung, 15.09.2026). Ein Wurf im Kern könnte
   Import und Migration alter Depots brechen — die DoD verlangt, dass v515-Depots aufgehen.
   Die Prüfung sitzt deshalb NUR an den exportierten Funktionen, die eine Probe direkt ruft.
   Die Kern-internen Aufrufe (Import, Migration, Assistenten) laufen über die Closure-Bindung
   und sehen diese Hülle nicht: ein Fixture-Import über den Migrationsweg ist kein Verstoß.

   GEPRÜFT WIRD GEGEN DAS MODELL, nicht gegen eine Liste: Bereich/Feld über `feldDefFuer`
   (kennt auch den Listen-Selektor), Unterfeld-Schlüssel über `unterFelder` des Listenfelds.
   Ein Bereich, den das Modell GAR NICHT führt, ist nur dann ein Verstoß, wenn er eine frühere
   Bereichs-ID ist (KENNUNG_MAPPING des Kerns, `bereichAlt`). Mechanik-Proben mit einem
   synthetischen Bereich (`test_sektor`) prüfen gerade nicht das Modell und bleiben unberührt.
   Erlaubt sind zusätzlich die Zeilen-Metadaten, die der Kern selbst an eine Zeile stempelt
   (EINTRAG_META_ERLAUBT) und Schlüssel mit `_`-Präfix (Plan-Nutzlast wie `_person`).
   Dasselbe am Personen-Register (`personHinzufuegen`/`-Aktualisieren`): gegen
   MENSCHEN_REGISTER_FELD.unterFelder. Eine Probe, die einen Schlüssel schreibt, den das Register
   nicht führt (seit Schema 88 etwa den alten deutschen Namen statt `birthDate`), schriebe ins
   Leere, weil personHinzufuegen unbekannte Schlüssel still verwirft.

   ABSCHALTEN, wo eine Probe das Unbekannte ABSICHTLICH schreibt (Verwaisungs-, Rettungs-,
   Negativproben): `ladeKern({ kennungsPruefungAus: true })` — oder, mitten in einer Probe, die
   ungehüllte Produktfunktion über `V.__ungeprueft.<name>` (für Proben, die gerade belegen, DASS
   der Kern Unbekanntes klaglos annimmt, A379). Roter Beweis:
   tests/load-kern-kennungspruefung.test.js. */
const EINTRAG_META_ERLAUBT = new Set(['id', 'rechtsraum', 'rechtsraumAngenommen', 'katalogStand',
  'geprueft', 'geprueftAm', 'geprueftFuer', 'herkunft', 'subDepotAbgelehnt']);
// personHinzufuegen nimmt diese zwei an, ohne dass MENSCHEN_REGISTER_FELD sie als Unterfeld führt
// (T3, 31.07.2026: Fachrichtung/Notariatsnummer aus dem b16-Import). `schluessel` ist der
// Nachschlage-Schlüssel der Persona-Fixtures (`p[m.schluessel] = V.personHinzufuegen(m)`) — er wird
// nie gespeichert und gehört nicht zum Modell, ist aber auch kein Kennungsfehler.
const PERSON_ZUSATZ_ERLAUBT = new Set(['id', 'fachrichtung', 'notariatsnummer', 'schluessel']);
function _kennungsPruefungAnlegen(V) {
  /* Dieselben Auflösungswege wie `kennungFeldDef` im Kern: eingebauter Katalog, angedocktes Feld
     (`data.feldDefinitionen`, U2-ADR-037), Rollen-/Cross-Ref-Feld — dazu die flachen Felder, die
     ein Assistent in einen Bereich schreibt, ohne dass der Katalog sie führt (pvwiz). Ohne die
     letzten drei meldete die Prüfung Felder, die es gibt, nur nicht in SEKTOR_BY_ID. */
  const wizardFeld = (s, f) => {
    for (const w of (Array.isArray(V.WIZARDS) ? V.WIZARDS : [])) {
      for (const st of w.schritte || []) {
        if (!st || !st.feld || st.feld.id !== f) continue;
        let z = st.ziel || w.ziel;
        try { if (typeof V.wizardSchrittZiel === 'function') z = V.wizardSchrittZiel(w, st) || z; } catch (_) { /* Rückfall oben */ }
        if (z && z.sektor === s && !z.liste) return st.feld;
      }
    }
    return undefined;
  };
  const defFuer = (s, f) => {
    const versuch = (fn) => { try { return fn(); } catch (_) { return undefined; } };
    return versuch(() => typeof V.feldDefFuer === 'function' && V.feldDefFuer(s, f))
      || versuch(() => typeof V._angedockteFeldDef === 'function' && V._angedockteFeldDef(s, f))
      || versuch(() => { const x = typeof V.crossRefFeldUndRoh === 'function' && V.crossRefFeldUndRoh(s, f); return x && x.feld; })
      || wizardFeld(s, f)
      || undefined;
  };
  const fehler = (text) => {
    const e = new Error('KENNUNGS-PRÜFUNG (tests/load-kern.js): ' + text
      + ' — das Modell kennt diese Kennung nicht. Alte Kennung? Neue steht in '
      + 'docs/umbau-englisch-vor-v1/kennung-mapping.json. Schreibt die Probe das Unbekannte absichtlich: '
      + 'ladeKern({ kennungsPruefungAus: true }).');
    e.code = 'VD_KENNUNG_UNBEKANNT';
    return e;
  };
  const bereichBekannt = (s) => !!(V.SEKTOR_BY_ID && Object.prototype.hasOwnProperty.call(V.SEKTOR_BY_ID, s));
  const bereichFrueher = (s) => Array.isArray(V.KENNUNG_MAPPING) && V.KENNUNG_MAPPING.some((e) => e.bereichAlt === s);
  const bereichPruefen = (s) => {   // true: im Modell, weiter prüfen · false: synthetisch, nichts zu prüfen
    if (bereichBekannt(s)) return true;
    if (bereichFrueher(s)) throw fehler('früherer Bereich „' + s + '"');
    return false;
  };
  const feldPruefen = (s, f) => {
    if (!bereichPruefen(s)) return;
    if (!defFuer(s, f)) throw fehler('Bereich/Feld „' + s + '.' + f + '"');
  };
  const eintragPruefen = (s, f, eintrag) => {
    if (!bereichPruefen(s)) return;
    const def = defFuer(s, f);
    if (!def) throw fehler('Bereich/Liste „' + s + '.' + f + '"');
    if (!eintrag || typeof eintrag !== 'object' || !Array.isArray(def.unterFelder)) return;
    const bekannt = new Set(def.unterFelder.map((u) => u.id));
    const fremd = Object.keys(eintrag).filter((k) => !bekannt.has(k) && !EINTRAG_META_ERLAUBT.has(k) && k[0] !== '_');
    if (fremd.length) throw fehler('Unterfeld-Schlüssel ' + fremd.map((k) => '„' + k + '"').join(', ') + ' in „' + s + '.' + f + '"');
  };
  const personPruefen = (patch) => {
    if (!patch || typeof patch !== 'object') return;
    const reg = V.MENSCHEN_REGISTER_FELD;
    if (!reg || !Array.isArray(reg.unterFelder)) return;
    const bekannt = new Set(reg.unterFelder.map((u) => u.id));
    const fremd = Object.keys(patch).filter((k) => !bekannt.has(k) && !PERSON_ZUSATZ_ERLAUBT.has(k) && k[0] !== '_');
    if (fremd.length) throw fehler('Personen-Register-Schlüssel ' + fremd.map((k) => '„' + k + '"').join(', '));
  };
  const huellen = {
    personHinzufuegen: (orig) => function (patch, ...rest) { personPruefen(patch); return orig.call(this, patch, ...rest); },
    personAktualisieren: (orig) => function (id, patch, ...rest) { personPruefen(patch); return orig.call(this, id, patch, ...rest); },
    sektorFeldSetzen: (orig) => function (s, f, ...rest) { feldPruefen(s, f); return orig.call(this, s, f, ...rest); },
    listenEintragHinzufuegen: (orig) => function (s, f, eintrag, ...rest) { eintragPruefen(s, f, eintrag); return orig.call(this, s, f, eintrag, ...rest); },
    listenEintragAktualisieren: (orig) => function (s, f, idx, eintrag, ...rest) { eintragPruefen(s, f, eintrag); return orig.call(this, s, f, idx, eintrag, ...rest); },
  };
  const ungeprueft = {};
  for (const [name, huelle] of Object.entries(huellen)) {
    if (typeof V[name] === 'function') { ungeprueft[name] = V[name]; V[name] = huelle(V[name]); }
  }
  V.__ungeprueft = Object.freeze(ungeprueft);
}

/* Schnitt-Nachtrag (17.09.2026, bewusste Entscheidung): mit BUERGERMODUL_BUENDEL entfernt ist
   AB_WERK_BEREICH_QUELLEN im nativen Gerüst LEER (bereicheAlle() === 0, gewollt) — jeder Test, der
   ladeKern() bisher unbesehen als "ein Produkt mit dreizehn Bereichen" nutzte, prüfte in Wahrheit
   das nackte Gerüst. `ladeKern()` liefert darum standardmäßig das STANDARD-PRODUKT (privat-de:
   Gerüst + die dreizehn nativen Templates), nicht das nackte Gerüst — Umkehr der bisherigen
   Voreinstellung, nicht neu erfunden: derselbe Weg, den ein echtes Produkt geht
   (tools/lib/produkt-text-erzeugen.js, modulPfade aus tools/lib/vier-produkte.js), keine
   Testkern-Abkürzung. `ladeKern({ blank: true })` fordert das nackte Gerüst ausdrücklich an.
   NUR beim Standard-Pfad (kein KERN_HTML_PATH-Override, kein `blank`) gebacken — ein Test, der
   selbst schon einen bestimmten Kern-Text angibt (eigener Pfad ODER `blank`), meint das absichtlich
   so, keine zusätzliche Bäckerei obendrauf. */
function _standardProduktBaken(html, opts) {
  opts = opts || {};
  const { PRODUKTE } = require('../tools/lib/vier-produkte.js');
  // S1 (20.09.2026, U2-ADR-426): das Gerüst trägt keinen englischen Satz mehr. Ein Test, der „Englisch ist
  // aktiv" misst, bäckt das ENGLISCHE Standardprodukt: `ladeKern({ produkt: 'privat-en' })` oder — für eine
  // ganze Datei — `process.env.VD_TEST_PRODUKT = 'privat-en'` vor dem require. Vorgabe bleibt privat-de.
  const privatDe = PRODUKTE.find((p) => p.slug === (opts.produkt || process.env.VD_TEST_PRODUKT || 'privat-de'));
  if (!privatDe) throw new Error('ladeKern: unbekanntes Produkt ' + (opts.produkt || process.env.VD_TEST_PRODUKT));
  // `opts` reicht wie bisher ganz an modulDateienFuer() durch (bereichTemplateVerzeichnis, abWerkFixtureVerzeichnis,
  // standardVorlagenVerzeichnis, textsatzDeModulPfad); `opts.ohneBereiche` (19.09.2026, U2-ADR-312) filtert davor.
  // Gebacken wird über den Auslieferungs-Backschritt (tests/produkt-test-backen.js), mit der einen benannten
  // Test-Option mitEntwicklerleiste.
  const { testProduktText } = require('./produkt-test-backen.js');
  return testProduktText(html, { ...opts, slug: privatDe.slug, ohneBereiche: !!opts.ohneBereiche });
}

function ladeKern(opts) {
  opts = opts || {};
  let html = fs.readFileSync(HTML_PATH, 'utf8');
  // `opts.backen` (19.09.2026): auch bei umgelenktem KERN_HTML_PATH das Standard-Produkt backen. Für
  // Proben, die den Quelltext MUTIEREN (Rot-Beweis an einer Kopie) und danach ein volles Produkt
  // brauchen — ohne diese Angabe meint KERN_HTML_PATH „genau diesen Text", also das nackte Gerüst.
  if (!opts.blank && (!process.env.KERN_HTML_PATH || opts.backen)) html = _standardProduktBaken(html, opts);
  const { script1, script2, bounds } = extrahiereScripts(html);

  const documentStub = makeDocument();
  const windowStub = { crypto: webcrypto, addEventListener: () => {}, location: opts.location || { href: '' } };
  if (opts.location) windowStub.location = opts.location;
  if (opts.showSaveFilePicker) windowStub.showSaveFilePicker = opts.showSaveFilePicker;
  // Stück 4 (U2-ADR-031): istStandaloneWebApp() liest window.navigator / window.matchMedia —
  // separat injizierbar, um den „als App installiert"-Pfad (kein erhöhtes Risiko, kein Nudge) zu prüfen.
  if (opts.windowNavigator) windowStub.navigator = opts.windowNavigator;
  if (opts.matchMedia) windowStub.matchMedia = opts.matchMedia;
  // Auftrag (12.09.2026): die AB_WERK_SERVICE_WORKER_VORHANDEN-Region backt
  // `window.__abWerkServiceWorkerVorhanden` — hier injizierbar, um _swRegistrierenErlaubt() ohne
  // den echten Kern-Bake zu prüfen (true/false/undefined, nicht nur die zwei Bestandsfälle).
  if (opts.abWerkServiceWorkerVorhanden !== undefined) windowStub.__abWerkServiceWorkerVorhanden = opts.abWerkServiceWorkerVorhanden;
  // U2-ADR-120 Zug 7: jsPDF/qrcode sind im Kern NUR window.jspdf/window.qrcode (inline Libs, Guard
  // vorher) — hier injizierbar, um den PDF+QR-Pfad ohne die echten Libs zu prüfen (Fake-doc genügt).
  if (opts.jspdf) windowStub.jspdf = opts.jspdf;
  if (opts.qrcode) windowStub.qrcode = opts.qrcode;
  const sandbox = {
    crypto: webcrypto,
    TextEncoder, TextDecoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    console,
    setTimeout, clearTimeout,
    queueMicrotask,
    window: windowStub,
    document: documentStub,
    // Vorher ein reines Capability-Objekt ({createObjectURL, revokeObjectURL}) OHNE die
    // eigentliche URL-Klasse — im echten Browser ist `URL` der Web-URL-Parser UND trägt diese
    // zwei statischen Methoden zugleich; nie eines von beiden allein. Fund (12.09.2026, `verweis`-
    // Feldtyp): `new URL(...)` im Kern schlug im Test-Sandkasten fehl ("is not a constructor"),
    // obwohl derselbe Aufruf im echten Browser eine gültige URL parst — der Stub deckte eine
    // Fähigkeit ab, die der Kern längst brauchte, ohne es zu melden (dieselbe Fehlerklasse wie
    // A248: eine Stub-Lücke, die eine Suite nicht sieht). Jetzt die ECHTE Node-`URL`-Klasse
    // (dasselbe WHATWG-Interface wie im Browser), erweitert um die beiden Blob-Methoden.
    URL: Object.assign(class extends URL {}, { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} }),
    Blob: opts.Blob || function () {},
  };
  // `opts.ausgabeErfassen(({ blob, name }) => …)` (19.09.2026, AUS1): fängt jede Datei ab, die der Kern
  // über den Download-Weg herausgibt (`dateiAusgeben` → Objekt-URL + <a download>). Das ist der ERZEUGTE
  // Artefakt-Byte-Strom, den die Proben in tests/ausgabewege-artefakte.test.js mit Fremdwerkzeugen lesen.
  if (typeof opts.ausgabeErfassen === 'function') {
    let letzterBlob = null;
    sandbox.URL.createObjectURL = (b) => { letzterBlob = b; return 'blob:erfasst'; };
    const vorherErzeugen = documentStub.createElement;
    documentStub.createElement = (tag) => {
      const el = vorherErzeugen(tag);
      if (String(tag).toLowerCase() === 'a') el.click = () => opts.ausgabeErfassen({ blob: letzterBlob, name: el.download });
      return el;
    };
  }
  // Ein `.open` in opts.indexedDB gewinnt (Test will EXPLIZIT ein bestimmtes Verhalten, z. B.
  // eine bewusst kaputte open()) — sonst füllt die funktionsfähige Attrappe das reine
  // Capability-Flag-Objekt `{}` zu einem echten, isolierten Speicher auf (s. Kommentar oben).
  if (opts.indexedDB) sandbox.indexedDB = (typeof opts.indexedDB.open === 'function') ? opts.indexedDB : _fakeIndexedDbFactory();
  if (opts.navigator) sandbox.navigator = opts.navigator;
  if (opts.location) sandbox.location = opts.location;
  // A70 (31.07.2026): `caches` ist in echten Browsern ZUGLEICH bare global UND window.caches (dasselbe
  // Objekt) — der Produktcode prüft `typeof caches !== 'undefined'` und ruft dann bare `caches.keys()`;
  // beide Stellen müssen im Sandkasten auf denselben injizierten Mock zeigen, sonst widerspricht sich
  // der Test der Realität, die er nachbilden soll.
  if (opts.caches) { sandbox.caches = opts.caches; windowStub.caches = opts.caches; }
  // opts.Date: erlaubt einem Test, die Uhr des Sandbox-Codes zu kontrollieren (z. B. eine feste
  // „jetzt"-Zeit an der UTC/lokal-Tagesgrenze für die Datums-Plausibilität). Ohne opts.Date bleibt
  // die kontext-eigene Date-Intrinsik unverändert — Bestandsverhalten aller anderen Tests.
  if (opts.Date) sandbox.Date = opts.Date;
  sandbox.globalThis = sandbox;

  /* KEIN vm-KONTEXT MEHR (27.07.2026, Posten 38).
     Früher lief der Kern in einem eigenen Realm (`vm.createContext` +
     `runInContext`). Das kostete an JEDER Zusicherungsgrenze Aufmerksamkeit:
     `deepStrictEqual` vergleicht auch den Prototyp, und ein Array aus dem
     Kern-Realm fiel gegen ein node-Array durch — bei GLEICHEM Inhalt.

     Gemessen am 27.07.: 74 Exporte trugen einen fremden Prototyp, null einen
     node-eigenen. 32 Testdateien trugen einen Kommentar dazu als Krücke,
     während der Mechanismus dagegen (`alsListe`) in GENAU EINER benutzt wurde.
     Sieben Fälle an einem Tag — der letzte in der Datei, die gerade gegen
     diese Falle geschrieben wurde.

     Der Sandkasten war nie ein jsdom, sondern immer ein einfaches Objekt. Also
     werden seine Einträge als PARAMETER übergeben — derselbe Quelltext, dieselben
     Stubs, nur im node-Realm. `globalThis` ist als Parametername zulässig und
     zeigt weiter auf den Sandkasten, so dass die zwei globalThis-Stellen im Kern
     unverändert tragen.

     Die Isolation bleibt: jeder Aufruf erzeugt einen frischen Funktions-Scope,
     genau wie vorher einen frischen Kontext. */
  const namen = Object.keys(sandbox);
  const werte = namen.map((n) => sandbox[n]);
  const codelisten = extrahiereCodelisten(html);
  // U2-ADR-NNN (18.09.2026, Kern-Verschluss): Script 2 endet seither auf ein IIFE, das fast
  // alle Top-Level-Namen einschließt (vorher lagen 1581 offen auf `window`). EXPORT_HOOK und
  // die Codelisten rufen aber genau solche Namen bare auf (codeListeAnmelden, Dutzende Exporte)
  // — vor dem Verschluss hing das am selben flachen Geltungsbereich wie der Rest des Kerns,
  // seither NICHT mehr, wenn man sie einfach HINTER die schließende Klammer hängt (ReferenceError,
  // gemessen: 85 von 92 Proben rot, ALLE mit `<name> is not defined`). Sie werden darum VOR die
  // Klammer gespleisst — der Marker `@vd-kern-verschluss-ende` in vivodepot.html nennt die Stelle.
  // `__LOAD_KERN_EXPORT__` ist AUSSERHALB des Kern-IIFE deklariert (`var`, hoisted auf DIESE
  // äußere new Function()) — EXPORT_HOOK schreibt sie von INNEN bare, die äußere Quelle gibt
  // sie am Ende zurück (s. Kommentar an EXPORT_HOOK/spliceVorKernVerschluss oben).
  const source = 'var __LOAD_KERN_EXPORT__;\n' + script1 + '\n'
    + spliceVorKernVerschluss(script2, codelisten.join('\n') + '\n' + EXPORT_HOOK)
    + '\n;return __LOAD_KERN_EXPORT__;';

  let V;
  if (ABDECKUNG_TEMPDATEI) {
    // Zeilentreue Rekonstruktion (s. `baueZeilentreueQuelle` oben): script1/script2
    // landen auf denselben Zeilennummern wie in `vivodepot.html`. codelisten +
    // EXPORT_HOOK haben keine 1:1-Entsprechung im Original und werden dahinter
    // angehängt (synthetische Zeilen jenseits der echten Dateilänge) — für die
    // Abdeckungsfrage (welche KERN-Zeilen liefen) ist das ohne Belang, da sie
    // reine Daten/Test-Zubehör sind, kein zu prüfender Verzweigungscode.
    const zeilentreu = baueZeilentreueQuelle(html, bounds);
    // Funktions-Wrapper AUF ZEILE 1 angehängt (nicht als eigene Zeile davor) —
    // sonst verschöbe sich jede folgende Zeile um eins. `vivodepot.html`s
    // erste Zeile (typischerweise `<!doctype html>`) ist längst blankiert;
    // wir überschreiben ihren Anfang, die Zeilenzahl bleibt unverändert.
    const zeilen = zeilentreu.split('\n');
    // `var __LOAD_KERN_EXPORT__` auf DIESER äußeren Funktion (nicht im Kern-IIFE) — dieselbe
    // Rückgabe-Brücke wie im `source`-Pfad oben, s. Kommentar an EXPORT_HOOK.
    zeilen[0] = '(function(' + namen.join(',') + '){var __LOAD_KERN_EXPORT__;' + zeilen[0];
    // Derselbe Verschluss-Spleiß wie im `source` oben — sonst dieselben ReferenceErrors, nur
    // unter Abdeckung statt im Normalfall.
    const tempQuelle = spliceVorKernVerschluss(zeilen.join('\n'), codelisten.join('\n') + '\n' + EXPORT_HOOK)
      + '\n;return __LOAD_KERN_EXPORT__;\n})';
    fs.writeFileSync(ABDECKUNG_PFAD, tempQuelle, 'utf8');
    // runInThisContext (NICHT vm.createContext/runInNewContext): läuft im
    // AKTUELLEN Node-Realm — dieselben Array/Object-Prototypen wie der Rest
    // der Suite. Genau die Prototyp-Falle vom 27.07. (deepStrictEqual über
    // Realm-Grenzen) bleibt damit vermieden, obwohl vm.Script beteiligt ist.
    const script = new vm.Script(tempQuelle, { filename: ABDECKUNG_PFAD });
    const fn = script.runInThisContext();
    V = fn(...werte);
  } else {
    // eslint-disable-next-line no-new-func
    V = new Function(...namen, source)(...werte);
  }
  if (process.env.SEKTOREN_POISON && V && V.SEKTOREN) {
    V.SEKTOREN = new Proxy(V.SEKTOREN, {
      get(target, prop, receiver) {
        throw new Error('SEKTOREN_POISON: .SEKTOREN.' + String(prop) + ' aufgerufen');
      },
    });
  }
  if (process.env.BEREICHE_ALLE_POISON && V && typeof V.bereicheAlle === 'function') {
    const orig = V.bereicheAlle;
    V.bereicheAlle = new Proxy(orig, {
      apply(target, thisArg, args) {
        throw new Error('BEREICHE_ALLE_POISON: bereicheAlle() aufgerufen');
      },
    });
  }
  // Seit S1 (20.09.2026) trägt der Kern keinen vollen englischen Satz mehr. Tests, die „den englischen
  // Text zu einer Kennung" als Erwartung brauchen, lesen die QUELLE des EN-Sprachmoduls — kein Kern-Export.
  V.TEXTSATZ_EN_QUELLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
  // Seit S8 (U2-ADR-428) ist auch der deutsche Satz kein Kern-Bestand mehr, sondern das Sprachmodul des Produkts (wie das englische seit S1). Wer den deutschen
  // Text als Erwartung braucht, liest die QUELLE: `V.TEXTSATZ_DE_QUELLE` (oder tools/lib/textsatz-de-quelle.js). Einen Alias auf die alte Konstante gibt es nicht;
  // tests/textsatz-de-quelle-ein-leser.test.js hält jede Datei davon ab, sie zu nennen. Dass der KERN den Satz aus dem Modul liest, belegt tests/sprach-basis-modulweg.test.js.
  V.TEXTSATZ_DE_QUELLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8'));
  sandbox.__VERIFY__ = V;
  if (!opts.kennungsPruefungAus) _kennungsPruefungAnlegen(V);

  return {
    V,
    document: documentStub,
    window: windowStub,
    html, src: html, script1, script2,
  };
}

module.exports = {
  ladeKern,
  // Für Tests mit eigenem KERN_HTML_PATH (mutierte Kopie), die trotzdem die dreizehn nativen
  // Bereiche brauchen: ladeKern() bäckt bei eigenem Pfad bewusst NICHT (s. dessen Kopf-Kommentar,
  // Schnitt 17.09.2026) — dieser Export ist der explizite Opt-in dafür.
  _standardProduktBaken,
  extrahiereScripts,
  kryptoBlock,
  sha256,
  HTML_PATH,
  PORT_VERBATIM_PATH,
  BLOCK_HASH_ERWARTET,
  webcrypto,
  _fakeIndexedDbFactory,
  baueZeilentreueQuelle,
  ABDECKUNG_PFAD,
};
