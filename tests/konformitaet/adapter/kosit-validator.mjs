/* ═══════════════════════════════════════════════════════════════════════════════════════
   kosit-validator.mjs — Adapter: XML nach einem FIM-Leistungsschema gegen den KoSIT-Validator (U2-ADR-465)
   ───────────────────────────────────────────────────────────────────────────────────────
   WAS GEPRÜFT WIRD: die Datei, die der Kern über ein eingelassenes Format-Modul (`xml@1`, `wurzel`, `namensraum`,
   `hinweis`) schreibt, gegen das XSD der Leistung. Das XSD erzeugt der amtliche Umwandler des FIM-Portals
   (`/tools/xdf2-xsd-converter`, s. tools/fim-schema-beschaffen.mjs), nicht eine eigene Ableitung.

   ZWEI LÄUFE, EIN ADAPTER:
     · In der Suite: die ERFUNDENE Leistung S99000001 (tests/fixtures/fim-schema/S99000001-antrag.xsd und
       -format-modul.json). Sie hält den Weg Kern → Datei → KoSIT, ohne dass FIM-Inhalt im Repo steht.
     · Echt: VD_FIM_XSD (das gepinnte XSD der Leistung) und VD_FIM_MODUL (das Modul), beide außerhalb des Repos,
       solange die FITKO der Nutzung der Inhalte nicht zugestimmt hat (U2-ADR-456, U2-ADR-465).
   Das Modul wird hier mit `ungeprueft: false` gebaut, als hätte der Einlassweg seine Signatur verifiziert — die
   Signaturbedingung selbst hält tests/u2-adr-465-format-bereiche-fest-namensraum.test.js. Geprüft wird hier, ob
   die geschriebene Datei das Schema erfüllt.

   DAS URTEIL kommt aus dem Bericht (createReportInput), nicht aus dem Rückgabecode: gelesen = ein Szenario hat
   gegriffen und es gibt keinen Wohlgeformtheitsfehler; gültig = dazu kein Fehler der XSD-Prüfung. Ohne Bericht
   (nicht wohlgeformt, kein Szenario) gibt es kein Urteil, nie ein geratenes Grün.

   GEPINNT ist das offizielle Release-Asset (github.com/itplr-kosit/validator, v1.6.3, Apache-2.0).
   Aufruf: node tools/kosit-beschaffen.mjs. Die Suite beschafft nie selbst: ohne diesen Schritt ist der Lauf ungemessen.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { javaPfad, cacheWurzel } from './_umgebung.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HIER, '..', '..', '..');
const require = createRequire(import.meta.url);
const FX = path.join(REPO, 'tests', 'fixtures', 'fim-schema');

export const WERKZEUG = Object.freeze({
  version: '1.6.3',
  url: 'https://github.com/itplr-kosit/validator/releases/download/v1.6.3/validator-1.6.3-standalone.jar',
  sha256: '799e64befca97d4080e03608c80b85dd5a5ecc5f4ae4f35d1116ec2855b9a7c9',
  datei: 'validator-1.6.3-standalone.jar',
});
export const ARTEFAKTE = Object.freeze([
  { id: 'kosit-validator-1.6.3', art: 'werkzeug', version: WERKZEUG.version, lizenz: 'Apache-2.0', url: WERKZEUG.url, sha256: WERKZEUG.sha256 },
]);
export const FIXTURE = Object.freeze({
  xsd: path.join(FX, 'S99000001-antrag.xsd'),
  modul: path.join(FX, 'S99000001-format-modul.json'),
});

export function cacheVerzeichnis() { return process.env.KOSIT_CACHE || path.join(cacheWurzel(), 'kosit-validator-' + WERKZEUG.version); }
function jar() { return path.join(cacheVerzeichnis(), WERKZEUG.datei); }
function jarOk() { return fs.existsSync(jar()) && crypto.createHash('sha256').update(fs.readFileSync(jar())).digest('hex') === WERKZEUG.sha256; }

let _arbeit = null;
function arbeit() { return _arbeit || (_arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-kosit-'))); }

export async function beschaffen({ ausgabe = () => {} } = {}) {
  fs.mkdirSync(cacheVerzeichnis(), { recursive: true });
  if (!jarOk()) {
    ausgabe('lade ' + WERKZEUG.url);
    const antwort = await fetch(WERKZEUG.url);
    if (!antwort.ok) throw new Error('Download ' + antwort.status);
    fs.writeFileSync(jar(), Buffer.from(await antwort.arrayBuffer()));
    if (!jarOk()) { fs.rmSync(jar(), { force: true }); throw new Error('SHA-256 weicht ab vom Pin ' + WERKZEUG.sha256); }
  }
  if (!javaPfad(11)) throw new Error('kein Java 11+ gefunden (JAVA_HOME, PATH oder Homebrew openjdk)');
  ausgabe('KoSIT-Validator ' + WERKZEUG.version + ' in ' + jar());
}

/** Der Namensraum (targetNamespace) und der Name des Wurzelelements eines XSD, ohne XML-Bibliothek. */
export function schemaKopf(xsdText) {
  const ns = (/targetNamespace="([^"]+)"/.exec(xsdText) || [])[1] || null;
  const wurzel = (/<xs:element\s+name="([^"]+)"/.exec(xsdText) || [])[1] || null;
  return { ns, wurzel };
}

/** Eine Szenario-Konfiguration für genau ein XSD: es greift, wenn die Wurzel im Namensraum des Schemas steht. */
export function szenarioXml(ns, xsdName) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<scenarios xmlns="http://www.xoev.de/de/validator/framework/1/scenarios" frameworkVersion="1.1.2">',
    '<name>Vivodepot FIM-Leistung</name><author>Vivodepot</author><date>2026-10-05</date>',
    '<description><p>Nur XSD-Prüfung gegen das Schema der Leistung.</p></description>',
    '<scenario><name>leistung</name><description><p>XSD</p></description>',
    '<match>/*[namespace-uri() = \'' + esc(ns) + '\']</match>',
    '<validateWithXmlSchema><resource><name>XSD der Leistung</name><location>' + esc(xsdName) + '</location></resource></validateWithXmlSchema>',
    '</scenario>',
    '<noScenarioReport><resource><name>kein Szenario</name><location>' + esc(xsdName) + '</location></resource></noScenarioReport>',
    '</scenarios>', ''].join('\n');
}

/** Liest einen KoSIT-Bericht (createReportInput) zu gelesen, gültig und den Meldungen der Fehler. Die Präfixe der
    Namensräume wechseln von Lauf zu Lauf (gemessen 05.10.2026: einmal ns2:scenario, einmal ns3:scenario), darum
    wird nach dem lokalen Namen gesucht. */
export function berichtLesen(xml) {
  const P = '(?:[A-Za-z_][\\w.-]*:)?';
  const abschnitt = (name) => { const m = new RegExp('<' + P + name + '\\b[^>]*?(?:/>|>([\\s\\S]*?)</' + P + name + '>)').exec(xml); return m ? (m[1] || '') : null; };
  const element = (name, text) => (new RegExp('<' + P + name + '>([\\s\\S]*?)</' + P + name + '>').exec(text) || [])[1];
  const fehlerIn = (teil) => (teil == null ? [] : [...teil.matchAll(new RegExp('<' + P + 'xmlSyntaxError>([\\s\\S]*?)</' + P + 'xmlSyntaxError>', 'g'))]
    .filter((x) => /SEVERITY_(?:ERROR|FATAL_ERROR)/.test(x[1]))
    .map((x) => (element('message', x[1]) || 'ohne Meldung').trim()));
  const szenario = new RegExp('<' + P + 'scenario>').test(xml);
  const wohl = abschnitt('validationResultsWellformedness');
  const xsd = abschnitt('validationResultsXmlSchema');
  const wohlFehler = fehlerIn(wohl);
  const xsdFehler = fehlerIn(xsd);
  const gelesen = szenario && wohl !== null && wohlFehler.length === 0 && xsd !== null;
  return { gelesen, gueltig: gelesen && xsdFehler.length === 0, fehler: wohlFehler.concat(xsdFehler) };
}

/** Prüft Dateien gegen EIN XSD in einem Werkzeuglauf; je Datei ein Urteil. */
export function pruefeGegenSchema(umg, xsdPfad, pfade) {
  const leer = (grund) => new Map(pfade.map((p) => [p, { gelesen: false, gueltig: false, fehler: [grund] }]));
  if (!umg || !umg.ok) return leer('KoSIT-Validator nicht beschafft — kein Urteil');
  const dir = fs.mkdtempSync(path.join(arbeit(), 'lauf-'));
  const repo = path.join(dir, 'repo'), aus = path.join(dir, 'aus');
  fs.mkdirSync(repo); fs.mkdirSync(aus);
  const xsdText = fs.readFileSync(xsdPfad, 'utf8');
  const { ns } = schemaKopf(xsdText);
  if (!ns) return leer('XSD ohne targetNamespace: ' + xsdPfad);
  fs.writeFileSync(path.join(repo, 'leistung.xsd'), xsdText);
  fs.writeFileSync(path.join(dir, 'scenarios.xml'), szenarioXml(ns, 'leistung.xsd'));
  // Kopien unter festen Namen: der Bericht heißt nach der Datei, zwei gleichnamige Eingaben überschrieben sich.
  const kopien = pfade.map((p, i) => { const k = path.join(dir, 'fall-' + i + '.xml'); fs.copyFileSync(p, k); return k; });
  const r = spawnSync(umg.java, ['-jar', umg.jar, '-s', path.join(dir, 'scenarios.xml'), '-r', repo, '-o', aus, ...kopien],
    { encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return leer('KoSIT-Validator lief nicht: ' + r.error.message);
  return new Map(pfade.map((p, i) => {
    const bericht = path.join(aus, 'fall-' + i + '-report.xml');
    if (!fs.existsSync(bericht)) return [p, { gelesen: false, gueltig: false, fehler: ['kein Bericht (nicht wohlgeformt oder kein Szenario): ' + p] }];
    return [p, berichtLesen(fs.readFileSync(bericht, 'utf8'))];
  }));
}

/** Die Werte des Probe-Depots je `bereich.feld`. Für den echten Lauf aus VD_FIM_WERTE (JSON außerhalb des Repos). */
const PROBE_WERTE = Object.freeze({ 'identity.familyName': 'Muster', 'identity.givenName': 'Erika' });
function probeWerte() { return process.env.VD_FIM_WERTE ? JSON.parse(fs.readFileSync(process.env.VD_FIM_WERTE, 'utf8')) : PROBE_WERTE; }

/** Schreibt die Datei, die der Kern über `modul` aus einem Probe-Depot erzeugt. `ohne` lässt Felder leer; `sensibel`
    ist die Zustimmung, die die Person im Export gibt (ohne sie fehlen sensible Felder wie die Staatsangehörigkeit). */
export async function kernDatei(modul, name, { ohne = [], werte = probeWerte(), sensibel = !!process.env.VD_FIM_WERTE } = {}) {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Probe');
  V.betreteApp();
  for (const [k, wert] of Object.entries(werte)) {
    const [bereich, feld] = k.split('.');
    if (!ohne.includes(feld)) V.sektorFeldSetzen(bereich, feld, wert);
  }
  const kanal = V.formatModulZuExportKanal(Object.assign({}, modul, { ungeprueft: false }));
  if (!kanal) throw new Error('das Modul ergibt keinen Kanal: ' + (V.formatModulPruefen(modul).grund || '?'));
  const pfad = path.join(arbeit(), name + '.xml');
  fs.writeFileSync(pfad, kanal.baue({ sensibel }));
  return pfad;
}

function quelle() {
  const xsd = process.env.VD_FIM_XSD, modul = process.env.VD_FIM_MODUL;
  if (xsd || modul) {
    if (!xsd || !modul) throw new Error('VD_FIM_XSD und VD_FIM_MODUL gehören zusammen');
    return { xsd, modul: JSON.parse(fs.readFileSync(modul, 'utf8')), echt: true };
  }
  return { xsd: FIXTURE.xsd, modul: JSON.parse(fs.readFileSync(FIXTURE.modul, 'utf8')), echt: false };
}

export default {
  id: 'kosit-validator',
  familie: 'xml-xsd',
  autoritaet: 'Koordinierungsstelle für IT-Standards (KoSIT) — KoSIT-Validator, Prüfwerkzeug der XÖV-Standards',
  prueft: 'die XML-Datei eines eingelassenen FIM-Format-Moduls gegen das XSD der Leistung, das der Umwandler des FIM-Portals erzeugt',
  werkzeugVersion: WERKZEUG.version,
  werkzeug: 'kosit-validator-1.6.3',
  standards: ['fim-leistungsschema'],

  vorhanden() {
    if (process.env.KOSIT_AUS) return { ok: false, grund: 'KoSIT-Validator abgeschaltet (KOSIT_AUS)' };
    const java = javaPfad(11);
    if (!java) return { ok: false, grund: 'der KoSIT-Validator braucht Java 11+ — keines gefunden' };
    if (!jarOk()) return { ok: false, grund: 'KoSIT-Validator nicht beschafft — node tools/kosit-beschaffen.mjs' };
    return { ok: true, java, jar: jar() };
  },

  urteileAlle(umg, pfade) { return pruefeGegenSchema(umg, quelle().xsd, pfade); },
  urteile(umg, dateiPfad) { return this.urteileAlle(umg, [dateiPfad]).get(dateiPfad); },

  async artefakte() {
    const q = quelle();
    const pfad = await kernDatei(q.modul, 'kern-' + q.modul.format);
    return [{ name: q.modul.format + '·kern', standard: 'fim-leistungsschema', pfad, erwartet: 'gueltig', herkunft: 'generator',
      warum: q.echt ? 'die Datei des Kerns nach dem gepinnten Schema der Leistung' : 'die Datei des Kerns nach der erfundenen Leistung S99000001' }];
  },

  // Ein Pflichtfeld fehlt im Depot: der Kern erfindet es nicht (U2-ADR-465), also fehlt das Element, und das XSD lehnt ab.
  async kaputt() {
    const q = quelle();
    const feld = (q.modul.zuordnung.find((z) => z.feld) || {}).feld;
    const pfad = await kernDatei(q.modul, 'kern-ohne-' + feld, { ohne: [feld] });
    return [{ standard: 'fim-leistungsschema', pfad, warum: 'ohne ' + feld + ' fehlt ein Pflichtelement; der Kern füllt es nicht' }];
  },

  aufraeumen() { if (_arbeit) { fs.rmSync(_arbeit, { recursive: true, force: true }); _arbeit = null; } },
};
