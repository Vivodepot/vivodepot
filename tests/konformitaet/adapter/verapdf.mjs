/* ═══════════════════════════════════════════════════════════════════════════════════════
   verapdf.mjs — Adapter: die PDFs des Kerns gegen veraPDF (PDF Association / veraPDF-Konsortium)
   ───────────────────────────────────────────────────────────────────────────────────────
   WAS GEPRÜFT WIRD: PDF/A-3b (ISO 19005-3) an echten Kern-PDFs — Vollmappe, Notfallkarte, Anlass —, erzeugt im
   Browser mit dem echten jsPDF über tools/kern-pdfs-erzeugen.mjs. Bis hierher sah veraPDF nur ein synthetisches
   Fixture (tests/fixtures/verapdf-kandidat.pdf); das belegte nichts über das Produkt.

   DAS URTEIL HAT ZWEI TEILE (Entscheid der Gegenlesung, 30.09.2026): `gelesen` heißt, veraPDF hat die Datei ohne
   Parse-Fehler und ohne Ausnahme verarbeitet — das ist die Gültigkeit, die der Kern heute zusichert. `gueltig` heißt
   PDF/A-3b-konform. Heute sind die Kern-PDFs gelesen, aber nicht konform (Befund PDF-A-3B: Klauseln 6.2.4.3 und
   6.6.2.1); die Fälle tragen darum erwartet 'ungueltig' mit genau diesen Klauseln, und eine neue Klausel ist ein Fund.

   GEPINNT IST DAS OFFIZIELLE ARCHIV, nicht eine Paketverwaltung: das Homebrew-Paket „1.30.1" meldet sich als
   1.30.0. beschaffen() lädt verapdf-greenfield-1.30.1-installer.zip (SHA-256 gepinnt), installiert es unbeaufsichtigt
   (IzPack, nur Skripte und Validierungsmodell) in den Cache außerhalb des Baums und prüft die Versionsangabe.
   Aufruf: node tools/verapdf-beschaffen.mjs. Die Suite beschafft nie selbst: ohne diesen Schritt ist der Lauf ungemessen.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { javaPfad, cacheWurzel } from './_umgebung.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HIER, '..', '..', '..');

export const WERKZEUG = Object.freeze({
  version: '1.30.1',
  url: 'https://software.verapdf.org/releases/1.30/verapdf-greenfield-1.30.1-installer.zip',
  sha256: '9f03fc5da454348329f4054256351aa6c6a91683329978e8294f21fe8a5d7abc',
  installer: 'verapdf-greenfield-1.30.1/verapdf-izpack-installer-1.30.1.jar',
});
// Der Positivfall: eine PDF/A-3b-Datei mit eingebetteter Datei aus dem offiziellen veraPDF-Testkorpus (CC BY 4.0,
// github.com/veraPDF/veraPDF-corpus), gepinnt am Commit — kein Kern-PDF ist heute PDF/A-3b.
export const KORPUS = Object.freeze({ id: 'verapdf-corpus-6-8-t02-pass-a', art: 'daten', version: 'bb75f4f0073d9350dfd058c0162a367e6fadf25e', lizenz: 'CC-BY-4.0',
  url: 'https://raw.githubusercontent.com/veraPDF/veraPDF-corpus/bb75f4f0073d9350dfd058c0162a367e6fadf25e/PDF_A-3b/6.8%20Embedded%20files/veraPDF%20test%20suite%206-8-t02-pass-a.pdf',
  sha256: '5b8fdee7090f0a0fb7266d10dd0f6f1f8a37d286e3c06b1aa82e01d6d4f0a8a4' });
export const ARTEFAKTE = Object.freeze([
  { id: 'verapdf-1.30.1', art: 'werkzeug', version: WERKZEUG.version, lizenz: 'GPL-3.0-or-later OR MPL-2.0', url: WERKZEUG.url, sha256: WERKZEUG.sha256 },
  KORPUS,
]);
function korpusPfad() { return path.join(cacheVerzeichnis(), KORPUS.id + '.pdf'); }
function korpusOk() { return fs.existsSync(korpusPfad()) && crypto.createHash('sha256').update(fs.readFileSync(korpusPfad())).digest('hex') === KORPUS.sha256; }
// Was die Kern-PDFs heute verletzen (gemessen 01.10.2026, veraPDF 1.30.1, Profil 3b). Weniger ist ein Fortschritt
// (dann die Liste kürzen), mehr ist ein Fund.
export const BEKANNTE_KLAUSELN = Object.freeze(['6.2.4.3', '6.6.2.1']);

export function cacheVerzeichnis() { return process.env.VERAPDF_CACHE || path.join(cacheWurzel(), 'verapdf-' + WERKZEUG.version); }
function skript() { return path.join(cacheVerzeichnis(), 'install', 'verapdf'); }
function javaHome() {
  const j = javaPfad(11);
  return j && path.isAbsolute(j) ? path.dirname(path.dirname(fs.realpathSync(j))) : null;
}
function umgebung() { const h = javaHome(); return h ? { ...process.env, JAVA_HOME: h } : process.env; }

let _arbeit = null;
function arbeit() { return _arbeit || (_arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-verapdf-'))); }

/** Die Versionsangabe des installierten veraPDF, oder null. */
function installierteVersion() {
  if (!fs.existsSync(skript())) return null;
  const r = spawnSync(skript(), ['--version'], { encoding: 'utf8', env: umgebung(), timeout: 60000 });
  const m = /veraPDF (\d+\.\d+\.\d+)/.exec(String(r.stdout || ''));
  return m ? m[1] : null;
}

export async function beschaffen({ ausgabe = () => {} } = {}) {
  const ziel = cacheVerzeichnis();
  fs.mkdirSync(ziel, { recursive: true });
  const zip = path.join(ziel, 'installer.zip');
  if (!fs.existsSync(zip)) {
    ausgabe('lade ' + WERKZEUG.url);
    const antwort = await fetch(WERKZEUG.url);
    if (!antwort.ok) throw new Error('Download ' + antwort.status);
    fs.writeFileSync(zip, Buffer.from(await antwort.arrayBuffer()));
  }
  const ist = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
  if (ist !== WERKZEUG.sha256) { fs.rmSync(zip, { force: true }); throw new Error('SHA-256 weicht ab: ' + ist + ' statt ' + WERKZEUG.sha256); }
  const java = javaPfad(11);
  if (!java) throw new Error('kein Java 11+ gefunden (JAVA_HOME, PATH oder Homebrew openjdk)');
  const entpackt = path.join(ziel, 'entpackt');
  fs.rmSync(entpackt, { recursive: true, force: true });
  execFileSync('unzip', ['-q', zip, '-d', entpackt]);
  const install = path.join(ziel, 'install');
  fs.rmSync(install, { recursive: true, force: true });
  const auto = path.join(ziel, 'auto-install.xml');
  fs.writeFileSync(auto, [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<AutomatedInstallation langpack="eng">',
    '<com.izforge.izpack.panels.htmlhello.HTMLHelloPanel id="welcome"/>',
    '<com.izforge.izpack.panels.target.TargetPanel id="install_dir"><installpath>' + install + '</installpath></com.izforge.izpack.panels.target.TargetPanel>',
    '<com.izforge.izpack.panels.packs.PacksPanel id="sdk_pack_select">',
    '<pack index="0" name="veraPDF GUI" selected="false"/>',
    '<pack index="1" name="veraPDF Mac and *nix Scripts" selected="true"/>',
    '<pack index="2" name="veraPDF Validation model" selected="true"/>',
    '<pack index="3" name="veraPDF Documentation" selected="false"/>',
    '<pack index="4" name="veraPDF Sample Plugins" selected="false"/>',
    '</com.izforge.izpack.panels.packs.PacksPanel>',
    '<com.izforge.izpack.panels.install.InstallPanel id="install"/>',
    '<com.izforge.izpack.panels.finish.FinishPanel id="finish"/>',
    '</AutomatedInstallation>', ''].join('\n'));
  execFileSync(java, ['-jar', path.join(entpackt, WERKZEUG.installer), auto], { stdio: 'ignore', timeout: 300000 });
  fs.rmSync(entpackt, { recursive: true, force: true });
  const v = installierteVersion();
  if (v !== WERKZEUG.version) throw new Error('installiert ist ' + v + ', gepinnt ' + WERKZEUG.version);
  ausgabe('veraPDF ' + v + ' in ' + install);
  if (!korpusOk()) {
    const antwort = await fetch(KORPUS.url);
    if (!antwort.ok) throw new Error('Korpus-Download ' + antwort.status);
    fs.writeFileSync(korpusPfad(), Buffer.from(await antwort.arrayBuffer()));
    if (!korpusOk()) { fs.rmSync(korpusPfad(), { force: true }); throw new Error('SHA-256 der Korpusdatei weicht ab'); }
  }
  ausgabe('Positivfall ' + KORPUS.id);
}

/** Liest einen veraPDF-Bericht (Format mrr) zu je Datei: gelesen, konform, verletzte Klauseln. */
export function berichtLesen(xml) {
  const je = new Map();
  for (const job of xml.split('<job>').slice(1)) {
    const datei = (/<item[^>]*>\s*<name>([^<]+)<\/name>/.exec(job) || [])[1];
    if (!datei) continue;
    const bericht = /<validationReport\b[^>]*>/.exec(job);
    const ausnahme = /<taskException\b/.test(job) || /jobEndStatus="(?!normal)/.test(job);
    const konform = !!bericht && /isCompliant="true"/.test(bericht[0]);
    const klauseln = [...new Set([...job.matchAll(/<rule\b[^>]*clause="([^"]+)"[^>]*status="failed"/g)].map((x) => x[1]))].sort();
    je.set(datei, { gelesen: !!bericht && !ausnahme, konform, klauseln });
  }
  return je;
}

export default {
  id: 'verapdf',
  familie: 'pdf',
  autoritaet: 'veraPDF-Konsortium (PDF Association, Open Preservation Foundation) — veraPDF, der von der PDF Association empfohlene PDF/A-Prüfer',
  prueft: 'die PDFs des Kerns (Vollmappe, Notfallkarte, Anlass) gegen PDF/A-3b (ISO 19005-3); gelesen = fehlerfrei geparst',
  werkzeugVersion: WERKZEUG.version,
  werkzeug: 'verapdf-1.30.1',
  standards: ['pdf-a-3b'],

  vorhanden() {
    if (process.env.VERAPDF_AUS) return { ok: false, grund: 'veraPDF abgeschaltet (VERAPDF_AUS)' };
    if (!javaPfad(11)) return { ok: false, grund: 'veraPDF braucht Java 11+ — keines gefunden' };
    const v = installierteVersion();
    if (!v) return { ok: false, grund: 'veraPDF nicht beschafft — node tools/verapdf-beschaffen.mjs' };
    if (v !== WERKZEUG.version) return { ok: false, grund: 'veraPDF ' + v + ' im Cache, gepinnt ' + WERKZEUG.version + ' — node tools/verapdf-beschaffen.mjs' };
    if (!korpusOk()) return { ok: false, grund: 'Positivfall ' + KORPUS.id + ' nicht beschafft — node tools/verapdf-beschaffen.mjs' };
    return { ok: true, skript: skript() };
  },

  // Ein Lauf für alle Dateien: eine JVM, ein Bericht.
  urteileAlle(umg, pfade) {
    const leer = (grund) => new Map(pfade.map((p) => [p, { gelesen: false, gueltig: false, fehler: [grund] }]));
    if (!umg || !umg.ok) return leer('veraPDF nicht beschafft — kein Urteil');
    const r = spawnSync(umg.skript, ['--format', 'mrr', '--flavour', '3b', ...pfade], { encoding: 'utf8', env: umgebung(), timeout: 300000, maxBuffer: 256 * 1024 * 1024 });
    if (r.error) return leer('veraPDF lief nicht: ' + r.error.message);
    const je = berichtLesen(String(r.stdout || ''));
    return new Map(pfade.map((p) => {
      const b = je.get(p) || je.get(path.resolve(p));
      if (!b) return [p, { gelesen: false, gueltig: false, fehler: ['kein Bericht für ' + p] }];
      return [p, { gelesen: b.gelesen, gueltig: b.gelesen && b.konform, fehler: b.klauseln.map((k) => 'ISO 19005-3 Klausel ' + k), klauseln: b.klauseln }];
    }));
  },
  urteile(umg, dateiPfad) { return this.urteileAlle(umg, [dateiPfad]).get(dateiPfad); },

  async artefakte() {
    const { kernPdfsErzeugen, PDF_WEGE } = await import(path.join(REPO, 'tools', 'kern-pdfs-erzeugen.mjs'));
    const dateien = await kernPdfsErzeugen({ ziel: path.join(arbeit(), 'kern') });
    return [
      ...dateien.map((pfad, i) => ({ name: PDF_WEGE[i] + '·kern', standard: 'pdf-a-3b', pfad, erwartet: 'ungueltig', herkunft: 'kern',
        klauseln: BEKANNTE_KLAUSELN, warum: 'Befund PDF-A-3B: Output Intent und XMP-Metadaten fehlen; gelesen muss die Datei werden' })),
      { name: 'korpus-6-8-t02-pass-a', standard: 'pdf-a-3b', pfad: korpusPfad(), erwartet: 'gueltig', herkunft: 'offizielles-beispiel', klauseln: [],
        warum: 'PDF/A-3b mit eingebetteter Datei aus dem veraPDF-Testkorpus — die Positivkontrolle des Profils' },
    ];
  },

  // Ein lesbares, aber nicht konformes PDF: das synthetische Fixture ohne OutputIntent und XMP. veraPDF muss es lesen
  // (der Extern-Lauf verlangt ein Urteil) und ablehnen. Die abgeschnittene Datei (nicht lesbar) prüft tests/verapdf-lauf.test.js.
  async kaputt() {
    const pfad = path.join(arbeit(), 'kandidat-pdf-a-3b.pdf');
    fs.copyFileSync(path.join(REPO, 'tests', 'fixtures', 'verapdf-kandidat.pdf'), pfad);
    return [{ standard: 'pdf-a-3b', pfad, warum: 'ein PDF ohne OutputIntent und XMP-Metadaten ist kein PDF/A-3b' }];
  },
  abgeschnitten() {
    const quelle = fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'verapdf-kandidat.pdf'));
    const p = path.join(arbeit(), 'abgeschnitten.pdf');
    fs.writeFileSync(p, quelle.subarray(0, Math.floor(quelle.length / 3)));
    return { standard: 'pdf-a-3b', pfad: p, warum: 'ein PDF ohne Querverweistabelle und ohne Ende ist nicht lesbar' };
  },

  aufraeumen() { if (_arbeit) { fs.rmSync(_arbeit, { recursive: true, force: true }); _arbeit = null; } },
};
