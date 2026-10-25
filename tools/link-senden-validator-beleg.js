#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   link-senden-validator-beleg.js — „Link senden“ für Auszüge gegen die maßgeblichen Validatoren prüfen (19.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Schalter LINK_SENDEN_FUER_AUSZUEGE im Kern darf erst auf true, wenn die Link-Inhalte gegen die Validatoren geprüft
   sind; tests/link-senden-auszug.test.js (schalterBefund) verlangt dafür den Beleg tools/link-senden-validator-beleg.json.
   Dieses Werkzeug erzeugt ihn aus dem echten Kern: auszugLinkTeile und shlUriBauen, geladen über tests/load-kern.js.

   Fälle (tests/helfer/link-senden-validator-faelle.js): ein FHIR-Auszug, der mit seinen Bytes hineingeht, und zwei andere
   (PDF, JSON), die als FHIR Binary hineingehen; einmal über den Direkt-Weg (U-Flag), einmal über den Manifest-Weg. Dazu
   je Validator ein Rot-Beweis, der fallen MUSS — sonst ist ein Grün kein Urteil.

   VALIDATOR 1, SMART Health Links: smart-on-fhir/health-cards-dev-tools, nur aus der Primärquelle GitHub, gepinnt auf
   einen Commit (das letzte Release kennt kein SHL). Beschaffung in ein Cache-Verzeichnis außerhalb des Repos:
     git init · git fetch <repo> <sha> (voll, kein flacher Fetch) · git checkout FETCH_HEAD · rev-parse HEAD und HEAD^{tree} == Pin
     npm ci --ignore-scripts (Lockfile des Werkzeugs, Integrität je Paket aus dem Lockfile) · tsc -p tsconfig.json
   Geprüft wird OFFLINE über die Programm-Schnittstelle des Werkzeugs (js/src/api.js, README „Programmatic API“):
   shlink und shlpayload mit cascade:false — die Kommandozeile setzt cascade immer und riefe die Ablage-URL ab —,
   die verschlüsselte Datei als Manifest-Eintrag (shlmanifestfile, embedded) und als JWE, beide mit dem Schlüssel.
   Kein Abruf einer Ablage-URL. Die Lifecycle-Skripte des Werkzeugs laufen nicht (postinstall installierte das
   shl-server-Paket ohne Lockfile; sharp brauchte einen Binär-Download und wird für SHL nicht geladen).
   Fehler UND Warnungen des Validators gelten als Befund.

   VALIDATOR 2, FHIR Binary: der HL7-Validator (validator_cli), gepinnt über tools/hl7-validator-beschaffen.js,
   Fassung und Prüfsumme über tools/lib/hl7-validator-beleg.js, FHIR R4 (-version 4.0.1, -tx n/a). Geprüft wird die
   entschlüsselte Binary-Ressource der Nicht-FHIR-Fälle; Rot-Beweis: ein Binary ohne contentType (R4: 1..1).

   Ausgänge je Validator: gruen · rot (Befund, Integritätsabweichung, fehlender Rot-Beweis) · ungemessen (Beschaffung,
   Netz, Java oder Bau gescheitert). Ungemessen ist nie grün. Netz und Java: darum läuft dieses Werkzeug NICHT in der
   Suite; die Probe prüft die reinen Teile ohne Netz und ohne Java.

   Aufruf:  node tools/link-senden-validator-beleg.js [--schreiben | --pruefen] [--jar PFAD] [--cache VERZEICHNIS]
     ohne Schalter  prüfen und Ergebnis ausgeben, nichts schreiben
     --schreiben    den Beleg tools/link-senden-validator-beleg.json schreiben
     --pruefen      den vorhandenen Beleg mit diesem Lauf vergleichen (Validatoren, Fälle, Kern-Weg)
     --jar          validator_cli.jar statt der gepinnten Beschaffung (sonst FHIR_VALIDATOR_JAR, sonst beschaffen)
     --cache        Cache-Wurzel statt XDG_CACHE_HOME bzw. ~/.cache
   Ausgang 0 nur bei grün; 1 rot oder Abweichung; 2 ungemessen.
   Probe: tests/link-senden-validator-beleg.test.js
   ════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');
const VB = require('./lib/hl7-validator-beleg.js');   // Name, Fassung und Prüfsumme des HL7-Validators
const { FAELLE } = require('../tests/helfer/link-senden-validator-faelle.js');

const REPO = path.join(__dirname, '..');
const BELEG = path.join(__dirname, 'link-senden-validator-beleg.json');

/* Der Pin, gemessen am 19.10.2026 mit `gh api repos/smart-on-fhir/health-cards-dev-tools/git/commits/<sha>`:
   main, Merge von PR #227 („Add support for payload 'U' flag“, 04.05.2023), package.json version 1.3.0-2, MIT,
   package-lock.json vorhanden (lockfileVersion 2), Bau: scripts.build = tsc. */
const SHL_PIN = Object.freeze({
  name: 'smart-on-fhir/health-cards-dev-tools',
  repo: 'https://github.com/smart-on-fhir/health-cards-dev-tools.git',
  commit: 'b9b961d9056b6bbc9371d17eeed1b5a42b9b423c',
  baum: 'fce2765aefe23b860e34fed337e34c394c8fffb4',
  version: '1.3.0-2',
  lizenz: 'MIT',
});

const JWE_KOPF = Object.freeze({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' });
// Die Kern-Stellen, deren Quelltext der Beleg festhält: ändert sich eine, ist der Beleg veraltet (--pruefen).
const KERN_WEG = Object.freeze(['_jweCompactDir', '_shlTeile', '_auszugInhaltstyp', '_bytesAlsBase64', 'auszugLinkTeile',
  'shlFreigabeweg', 'shlUriBauen']);

/* ── Cache außerhalb des Repos ─────────────────────────────────────────── */
function cacheWurzel(arg) {
  return arg || process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
}
function shlCacheVerzeichnis(wurzel, pin = SHL_PIN) {
  return path.join(cacheWurzel(wurzel), 'vivodepot-shl-validator', pin.commit);
}
function hl7CacheVerzeichnis(wurzel) {
  return path.join(cacheWurzel(wurzel), 'vivodepot-hl7-validator');   // derselbe Ort wie scripts/pruefe-fhir-gate.js
}

/* ── Ausführen (für die Probe ersetzbar) ───────────────────────────────── */
function ausfuehrenEcht(befehl, args, { cwd, timeout = 900000, input } = {}) {
  const env = befehl === 'git' ? ohneGitUmgebung() : process.env;
  const r = spawnSync(befehl, args, { cwd, env, encoding: 'utf8', timeout, input, maxBuffer: 64 * 1024 * 1024 });
  return { status: r.error ? -1 : r.status, stdout: r.stdout || '', stderr: (r.stderr || '') + (r.error ? String(r.error.message) : '') };
}

/* ── Integrität des SHL-Validators ─────────────────────────────────────── */
function integritaetMessen(verzeichnis, ausfuehren = ausfuehrenEcht) {
  const kopf = ausfuehren('git', ['-C', verzeichnis, 'rev-parse', 'HEAD']);
  const baum = ausfuehren('git', ['-C', verzeichnis, 'rev-parse', 'HEAD^{tree}']);
  if (kopf.status !== 0 || baum.status !== 0) return null;
  return { kopf: kopf.stdout.trim(), baum: baum.stdout.trim() };
}
/** Reine Entscheidung: der gemessene Stand gegen den Pin. Ein anderer Commit oder Baum ist ROT, nie ungemessen. */
function integritaetPruefen(gemessen, pin = SHL_PIN) {
  if (!gemessen) return { art: 'ungemessen', grund: 'Commit und Baum nicht lesbar' };
  if (gemessen.kopf !== pin.commit) return { art: 'integritaetsfehler', grund: 'HEAD ' + gemessen.kopf + ' ist nicht der gepinnte Commit ' + pin.commit };
  if (gemessen.baum !== pin.baum) return { art: 'integritaetsfehler', grund: 'Baum ' + gemessen.baum + ' ist nicht der gepinnte Baum ' + pin.baum };
  return { art: 'erfolg' };
}
function shlPruefsumme(gemessen) {
  return 'git:' + gemessen.kopf + ' tree:' + gemessen.baum;
}

/** Den SHL-Validator beschaffen und bauen. → { status: 'gemessen'|'ungemessen'|'integritaetsfehler', grund?, verzeichnis, pruefsumme? } */
function shlBeschaffen({ verzeichnis, pin = SHL_PIN, ausfuehren = ausfuehrenEcht, dateiDa = fs.existsSync, entfernen } = {}) {
  verzeichnis = verzeichnis || shlCacheVerzeichnis(null, pin);
  entfernen = entfernen || ((p) => fs.rmSync(p, { recursive: true, force: true }));
  const api = path.join(verzeichnis, 'js', 'src', 'api.js');
  const ungemessen = (grund) => ({ status: 'ungemessen', grund, verzeichnis });
  const git = (...a) => ausfuehren('git', ['-C', verzeichnis, ...a]);

  // Wiederverwendung nur bei genau dem Pin, sauberem Arbeitsbaum und fertigem Bau; sonst neu.
  if (dateiDa(path.join(verzeichnis, '.git'))) {
    const gemessen = integritaetMessen(verzeichnis, ausfuehren);
    const sauber = git('status', '--porcelain', '--untracked-files=no');
    if (integritaetPruefen(gemessen, pin).art === 'erfolg' && sauber.status === 0 && sauber.stdout.trim() === '' && dateiDa(api)) {
      return { status: 'gemessen', verzeichnis, pruefsumme: shlPruefsumme(gemessen), wiederverwendet: true };
    }
  }
  // Das Verzeichnis gehört allein diesem Pin (…/vivodepot-shl-validator/<commit>): was nicht wiederverwendbar ist, geht.
  entfernen(verzeichnis);
  fs.mkdirSync(verzeichnis, { recursive: true });
  if (git('init', '-q').status !== 0) return ungemessen('git init gescheitert');
  const holen = git('fetch', '-q', pin.repo, pin.commit);
  if (holen.status !== 0) return ungemessen('git fetch gescheitert (Netz?): ' + holen.stderr.trim().split('\n').pop());
  if (git('checkout', '-q', 'FETCH_HEAD').status !== 0) return ungemessen('git checkout FETCH_HEAD gescheitert');

  const gemessen = integritaetMessen(verzeichnis, ausfuehren);
  const integ = integritaetPruefen(gemessen, pin);
  if (integ.art === 'integritaetsfehler') { entfernen(verzeichnis); return { status: 'integritaetsfehler', grund: integ.grund, verzeichnis }; }
  if (integ.art !== 'erfolg') return ungemessen(integ.grund);
  if (!dateiDa(path.join(verzeichnis, 'package-lock.json'))) return { status: 'integritaetsfehler', grund: 'package-lock.json fehlt am gepinnten Commit', verzeichnis };

  const ci = ausfuehren('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: verzeichnis });
  if (ci.status !== 0) return ungemessen('npm ci gescheitert: ' + ci.stderr.trim().split('\n').slice(-2).join(' '));
  const tsc = ausfuehren(process.execPath, [path.join('node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'], { cwd: verzeichnis });
  if (tsc.status !== 0) return ungemessen('Bau (tsc) gescheitert: ' + (tsc.stdout + tsc.stderr).trim().split('\n').slice(0, 3).join(' '));
  if (!dateiDa(api)) return ungemessen('js/src/api.js fehlt nach dem Bau');
  return { status: 'gemessen', verzeichnis, pruefsumme: shlPruefsumme(gemessen), wiederverwendet: false };
}

/* ── Die Fälle aus dem echten Kern ─────────────────────────────────────── */
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const ausB64u = (s) => Buffer.from(String(s), 'base64url');
const bytesVon = (inhalt) => (typeof inhalt === 'string' ? Buffer.from(inhalt, 'utf8') : Buffer.from(inhalt));
function zufallsUrl() {
  // Die Spezifikation verlangt mindestens 256 Bit Zufall in der url; 32 Byte base64url = 43 Zeichen.
  return 'https://share.vivodepot.de/f/' + b64u(crypto.randomBytes(32));
}

/** Unabhängig entschlüsseln (Node, RFC 7516) → { kopf, bytes }. Wirft bei falschem Schlüssel. */
function jweEntschluesseln(jwe, keyB64u) {
  const [prot, , iv, ct, tag] = String(jwe).split('.');
  const d = crypto.createDecipheriv('aes-256-gcm', ausB64u(keyB64u), ausB64u(iv));
  d.setAAD(Buffer.from(prot, 'ascii'));
  d.setAuthTag(ausB64u(tag));
  return { kopf: JSON.parse(ausB64u(prot).toString('utf8')), bytes: Buffer.concat([d.update(ausB64u(ct)), d.final()]) };
}

/** Jeden Fall über auszugLinkTeile und shlUriBauen bauen. V ist der geladene Kern (ladeKern().V). */
async function faelleBauen(V, { url = zufallsUrl(), faelle = FAELLE } = {}) {
  const raus = [];
  for (const vorlage of faelle) {
    const teile = await V.auszugLinkTeile(new Blob([vorlage.inhalt], { type: vorlage.mime }), { label: vorlage.label, weg: vorlage.weg });
    const shlink = V.shlUriBauen(teile, url);
    raus.push({ vorlage, teile, url, shlink });
  }
  return raus;
}

/** Was an einem gebauten Fall nicht die Form des Kerns hat. Leer = in Ordnung. */
function fallFormPruefen(fall) {
  const f = [];
  const { vorlage, teile, shlink, url } = fall;
  if (!teile || typeof teile.jwe !== 'string' || String(teile.jwe).split('.').length !== 5) return ['keine JWE (compact, fünf Teile)'];
  if (!/^[0-9A-Za-z_-]{43}$/.test(String(teile.key || ''))) f.push('Schlüssel nicht 43 Zeichen base64url');
  let ent;
  try { ent = jweEntschluesseln(teile.jwe, teile.key); } catch (_) { return f.concat('mit dem Schlüssel des Links nicht entschlüsselbar'); }
  if (JSON.stringify(ent.kopf) !== JSON.stringify(JWE_KOPF)) f.push('JWE-Kopf ist nicht ' + JSON.stringify(JWE_KOPF) + ': ' + JSON.stringify(ent.kopf));
  const soll = bytesVon(vorlage.inhalt);
  if (!vorlage.binary) {
    if (!ent.bytes.equals(soll)) f.push('FHIR-Auszug nicht byteweise gleich');
  } else {
    let b = null;
    try { b = JSON.parse(ent.bytes.toString('utf8')); } catch (_) { f.push('Binary ist kein JSON'); }
    if (b) {
      if (b.resourceType !== 'Binary') f.push('resourceType ist nicht Binary');
      if (b.contentType !== vorlage.mime) f.push('contentType ' + b.contentType + ' statt ' + vorlage.mime);
      if (typeof b.data !== 'string' || !Buffer.from(b.data, 'base64').equals(soll)) f.push('Binary.data nicht byteweise gleich');
      const fremd = Object.keys(b).filter((k) => !['resourceType', 'contentType', 'data'].includes(k));
      if (fremd.length) f.push('Binary trägt weitere Felder: ' + fremd.join(', '));
    }
  }
  if (typeof shlink !== 'string' || !shlink.startsWith('shlink:/')) return f.concat('Link beginnt nicht mit shlink:/');
  let p = null;
  try { p = JSON.parse(ausB64u(shlink.slice('shlink:/'.length)).toString('utf8')); } catch (_) { return f.concat('Nutzlast nicht lesbar'); }
  if (p.url !== url) f.push('url der Nutzlast weicht ab');
  if (p.key !== teile.key) f.push('key der Nutzlast ist nicht der Schlüssel der Datei');
  const flagSoll = vorlage.weg === 'manifest' ? undefined : 'U';
  if (p.flag !== flagSoll) f.push('flag ' + p.flag + ' statt ' + flagSoll);
  if (p.label !== vorlage.label) f.push('label weicht ab');
  if (!Number.isFinite(p.exp)) f.push('exp fehlt');
  return f;
}

/* ── SHL-Prüfungen: Aufträge an das Werkzeug und ihr Urteil ─────────────── */
const nutzlastJson = (shlink) => ausB64u(shlink.slice('shlink:/'.length)).toString('utf8');

/** Die Aufträge an die Programm-Schnittstelle: gebaute Fälle (gueltig) und zwei Rot-Beweise (ungueltig). */
function shlAuftraege(faelle) {
  const auftraege = [];
  const faelleListe = [];
  const plus = (fallName, art, text, optionen, klartext) => auftraege.push({ id: fallName + ':' + art, fall: fallName, art, text, optionen, klartext });
  for (const fall of faelle) {
    const klartext = jweEntschluesseln(fall.teile.jwe, fall.teile.key).bytes.toString('utf8');
    const name = fall.vorlage.name;
    faelleListe.push({ name, erwartet: 'gueltig', inhaltstyp: fall.vorlage.mime, weg: fall.vorlage.weg, quelle: 'auszugLinkTeile' });
    plus(name, 'shlink', fall.shlink, { cascade: false });
    plus(name, 'shlpayload', nutzlastJson(fall.shlink), { cascade: false });
    plus(name, 'shlmanifestfile', JSON.stringify({ contentType: 'application/fhir+json', embedded: fall.teile.jwe }), { cascade: true, decryptionKey: fall.teile.key });
    plus(name, 'jwe', fall.teile.jwe, { decryptionKey: fall.teile.key }, klartext);
  }
  if (faelle.length >= 2) {
    // Rot-Beweis 1: die Datei des ersten Falls mit dem Schlüssel des zweiten — die Entschlüsselung muss scheitern.
    const [a, b] = faelle;
    faelleListe.push({ name: 'rot-fremder-schluessel', erwartet: 'ungueltig' });
    plus('rot-fremder-schluessel', 'shlmanifestfile', JSON.stringify({ contentType: 'application/fhir+json', embedded: a.teile.jwe }), { cascade: true, decryptionKey: b.teile.key });
    plus('rot-fremder-schluessel', 'jwe', a.teile.jwe, { decryptionKey: b.teile.key }, jweEntschluesseln(a.teile.jwe, a.teile.key).bytes.toString('utf8'));
  }
  if (faelle.length >= 1) {
    // Rot-Beweis 2: dieselbe Nutzlast mit einem Schlüssel, dem ein Zeichen fehlt (die Spezifikation: 43 Zeichen).
    const p = JSON.parse(nutzlastJson(faelle[0].shlink));
    p.key = p.key.slice(0, 42);
    const json = JSON.stringify(p);
    faelleListe.push({ name: 'rot-schluessel-zu-kurz', erwartet: 'ungueltig' });
    plus('rot-schluessel-zu-kurz', 'shlink', 'shlink:/' + b64u(Buffer.from(json, 'utf8')), { cascade: false });
    plus('rot-schluessel-zu-kurz', 'shlpayload', json, { cascade: false });
  }
  return { auftraege, faelle: faelleListe };
}

/* Das Programm, das im Cache-Verzeichnis die Programm-Schnittstelle des Werkzeugs aufruft. Aufträge über stdin (die
   Wegwerf-Schlüssel landen so in keiner Datei), Ergebnis hinter einer Marke auf stdout. */
const ERGEBNIS_MARKE = '\n@@LINK-SENDEN-ERGEBNIS@@';
const LAEUFER = [
  "const api = require(process.argv[1]);",
  "let roh = '';",
  "process.stdin.setEncoding('utf8');",
  "process.stdin.on('data', (d) => { roh += d; });",
  "process.stdin.on('end', async () => {",
  "  const raus = [];",
  "  for (const a of JSON.parse(roh)) {",
  "    const opt = Object.assign({ logLevel: 2 }, a.optionen);",
  "    try {",
  "      if (a.art === 'jwe') { const x = await api.validate.jwe(a.text, opt); raus.push({ id: a.id, eintraege: x.errors, ergebnis: x.result }); }",
  "      else raus.push({ id: a.id, eintraege: await api.validate[a.art](a.text, opt) });",
  "    } catch (e) { raus.push({ id: a.id, ausnahme: String((e && e.message) || e) }); }",
  "  }",
  "  process.stdout.write(" + JSON.stringify(ERGEBNIS_MARKE) + " + JSON.stringify(raus));",
  "});",
].join('\n');

function shlAusfuehren(verzeichnis, auftraege, ausfuehren = ausfuehrenEcht) {
  const nurAuftrag = auftraege.map(({ id, art, text, optionen }) => ({ id, art, text, optionen }));
  const r = ausfuehren(process.execPath, ['-e', LAEUFER, path.join(verzeichnis, 'js', 'src', 'api.js')],
    { cwd: verzeichnis, input: JSON.stringify(nurAuftrag), timeout: 300000 });
  const i = r.stdout.lastIndexOf(ERGEBNIS_MARKE);
  if (i < 0) return { ergebnisse: null, grund: 'Validator lieferte kein Ergebnis: ' + (r.stderr || '').trim().split('\n').slice(-2).join(' ') };
  return { ergebnisse: JSON.parse(r.stdout.slice(i + ERGEBNIS_MARKE.length)) };
}

/** Reines Urteil: die Ausgaben des Werkzeugs je Fall. Level 2 = Warnung, 3 = Fehler, 4 = fatal (LogLevels im Werkzeug). */
function shlFaelleUrteil(faelle, auftraege, ergebnisse) {
  const jeId = new Map((ergebnisse || []).map((e) => [e.id, e]));
  return faelle.map((fall) => {
    const meine = auftraege.filter((a) => a.fall === fall.name);
    const fehler = [];
    const warnungen = [];
    let ungelesen = !ergebnisse;
    for (const a of meine) {
      const e = jeId.get(a.id);
      if (!e) { ungelesen = true; continue; }
      if (e.ausnahme) fehler.push(a.art + ': Ausnahme ' + e.ausnahme);
      for (const z of e.eintraege || []) {
        const zeile = a.art + ': ' + String(z.message).replace(/\s+/g, ' ').slice(0, 180) + (z.code !== undefined ? ' (code ' + z.code + ')' : '');
        if (z.level >= 3) fehler.push(zeile);
        else if (z.level === 2) warnungen.push(zeile);
      }
      if (a.art === 'jwe' && a.klartext !== undefined && e.ergebnis !== a.klartext) fehler.push('jwe: entschlüsselter Inhalt weicht vom Klartext ab');
    }
    const ist = ungelesen ? 'ungelesen' : ((fehler.length || warnungen.length) ? 'ungueltig' : 'gueltig');
    return { ...fall, ist, fehler, warnungen };
  });
}

/* ── FHIR Binary über den HL7-Validator ────────────────────────────────── */
function binaerFaelle(faelle) {
  const raus = [];
  for (const fall of faelle.filter((f) => f.vorlage.binary)) {
    const klartext = jweEntschluesseln(fall.teile.jwe, fall.teile.key).bytes.toString('utf8');
    raus.push({ name: fall.vorlage.name, erwartet: 'gueltig', inhaltstyp: fall.vorlage.mime, ressource: JSON.parse(klartext) });
  }
  if (raus.length) {
    const ohne = { ...raus[0].ressource };
    delete ohne.contentType;   // R4 Binary.contentType 1..1 — dieser Fall MUSS fallen
    raus.push({ name: 'rot-binary-ohne-contenttype', erwartet: 'ungueltig', ressource: ohne });
  }
  return raus;
}

function javaPfad(ausfuehren = ausfuehrenEcht) {
  const kandidaten = [process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    '/opt/homebrew/opt/openjdk@21/bin/java', '/opt/homebrew/opt/openjdk/bin/java', '/usr/local/opt/openjdk@21/bin/java', 'java'].filter(Boolean);
  for (const k of kandidaten) if (ausfuehren(k, ['-version'], { timeout: 60000 }).status === 0) return k;
  return null;
}

async function hl7Pruefen(bfaelle, { jar, cache } = {}) {
  const basis = { art: 'fhir-binary', name: VB.NAME, fassung: null, pruefsumme: null, fhirVersion: '4.0.1' };
  if (!bfaelle.length) return { ...basis, ergebnis: 'ungemessen', grund: 'kein Binary-Fall' };
  if (!jar) {
    const ziel = hl7CacheVerzeichnis(cache);
    fs.mkdirSync(ziel, { recursive: true });
    const b = await require('./hl7-validator-beschaffen.js').beschaffen({ zielVerzeichnis: ziel, datum: new Date().toISOString().slice(0, 10) });
    if (b.status.ergebnis === 'integritaetsfehler') return { ...basis, ergebnis: 'rot', grund: b.status.grund };
    if (!b.jarPfad) return { ...basis, ergebnis: 'ungemessen', grund: b.status.grund || 'validator_cli.jar nicht beschafft' };
    jar = b.jarPfad;
  }
  let v;
  try { v = VB.jarFassung(jar); } catch (e) { return { ...basis, ergebnis: 'ungemessen', grund: e.message }; }
  const mitJar = { ...basis, fassung: v.fassung, pruefsumme: 'sha256:' + v.sha256, gepinnt: v.gepinnt };
  const java = javaPfad();
  if (!java) return { ...mitJar, ergebnis: 'ungemessen', grund: 'kein lauffähiges Java' };
  const aus = fs.mkdtempSync(path.join(os.tmpdir(), 'link-senden-binary-'));
  try {
    const pfade = bfaelle.map((f) => {
      const p = path.join(aus, f.name + '.json');
      fs.writeFileSync(p, JSON.stringify(f.ressource, null, 1));
      return p;
    });
    const outcome = path.join(aus, 'sammel.outcome.json');
    // Rückgabecode ungleich 0 ist bei Befunden normal — es zählt das OperationOutcome.
    ausfuehrenEcht(java, ['-jar', jar, ...pfade, '-version', '4.0.1', '-tx', 'n/a', '-output', outcome], { timeout: 900000 });
    if (!fs.existsSync(outcome)) return { ...mitJar, ergebnis: 'ungemessen', grund: 'kein OperationOutcome — Lauf gescheitert' };
    const { urteilsZuordnung } = require('./lib/fhir-urteil-zuordnung.js');
    const urteile = urteilsZuordnung(JSON.parse(fs.readFileSync(outcome, 'utf8')), pfade);
    const faelle = bfaelle.map((f, i) => {
      const u = urteile.get(pfade[i]);
      const ist = !u.gelesen ? 'ungelesen' : (u.gueltig ? 'gueltig' : 'ungueltig');
      return { name: f.name, erwartet: f.erwartet, inhaltstyp: f.inhaltstyp, ist, fehler: u.fehler || [], warnungen: u.warnungen || [] };
    });
    return { ...mitJar, ...validatorErgebnis({ beschaffung: { status: 'gemessen' }, faelle }), faelle };
  } finally {
    fs.rmSync(aus, { recursive: true, force: true });
  }
}

/* ── Entscheidung und Beleg ────────────────────────────────────────────── */
/** Reine Entscheidung je Validator: aus Beschaffung und Fall-Urteilen gruen, rot oder ungemessen. */
function validatorErgebnis({ beschaffung, faelle }) {
  if (!beschaffung || beschaffung.status === 'integritaetsfehler') return { ergebnis: 'rot', grund: (beschaffung && beschaffung.grund) || 'Integrität nicht belegt' };
  if (beschaffung.status !== 'gemessen') return { ergebnis: 'ungemessen', grund: beschaffung.grund || 'nicht beschafft' };
  if (!faelle || !faelle.length) return { ergebnis: 'ungemessen', grund: 'kein Fall geprüft' };
  const ungelesen = faelle.filter((f) => f.ist === 'ungelesen');
  if (ungelesen.length) return { ergebnis: 'ungemessen', grund: 'ohne Urteil: ' + ungelesen.map((f) => f.name).join(', ') };
  const abweichend = faelle.filter((f) => f.ist !== f.erwartet);
  if (abweichend.length) return { ergebnis: 'rot', grund: 'abweichend: ' + abweichend.map((f) => f.name + ' (erwartet ' + f.erwartet + ', ist ' + f.ist + ')').join(', ') };
  if (!faelle.some((f) => f.erwartet === 'ungueltig')) return { ergebnis: 'rot', grund: 'kein Rot-Beweis — ein Grün ohne verworfenen Fall ist kein Urteil' };
  if (!faelle.some((f) => f.erwartet === 'gueltig')) return { ergebnis: 'rot', grund: 'kein gültiger Fall geprüft' };
  return { ergebnis: 'gruen' };
}

function gesamtErgebnis(beleg) {
  const e = (beleg.validatoren || []).map((v) => v.ergebnis);
  if (e.length && e.every((x) => x === 'gruen')) return 'gruen';
  if (e.includes('rot')) return 'rot';
  return 'ungemessen';
}

/** Der Quelltext einer Kern-Funktion (bis zur schließenden Klammer in Spalte 0). Wirft, wenn sie fehlt. */
function quellAusschnitt(kern, name) {
  const m = new RegExp('^(?:async )?function ' + name.replace(/\$/g, '\\$') + '\\(', 'm').exec(kern);
  if (!m) throw new Error('Kern-Stelle fehlt: ' + name);
  const ende = kern.indexOf('\n}', m.index);
  if (ende < 0) throw new Error('Kern-Stelle ohne Ende: ' + name);
  return kern.slice(m.index, ende + 2);
}
function kernAngaben(kern) {
  const h = crypto.createHash('sha256');
  for (const n of KERN_WEG) h.update(quellAusschnitt(kern, n) + '\n');
  const typen = /const AUSZUG_INHALTSTYPEN = [\s\S]*?\]\);/.exec(kern);
  if (!typen) throw new Error('Kern-Stelle fehlt: AUSZUG_INHALTSTYPEN');
  h.update(typen[0]);
  return {
    datei: 'vivodepot.html',
    sha256: crypto.createHash('sha256').update(kern).digest('hex'),
    wegSha256: h.digest('hex'),
    wegStellen: [...KERN_WEG, 'AUSZUG_INHALTSTYPEN'],
  };
}

function belegBauen({ kern, faelle, shl, fhir, jetzt = new Date() }) {
  return {
    zweck: 'Validator-Beleg für den Schalter LINK_SENDEN_FUER_AUSZUEGE (tests/link-senden-auszug.test.js, schalterBefund). '
      + 'Erzeugt mit tools/link-senden-validator-beleg.js aus auszugLinkTeile und shlUriBauen des Kerns.',
    datum: new Date(jetzt).toISOString(),
    ergebnis: gesamtErgebnis({ validatoren: [shl, fhir] }),
    kern,
    faelle,
    validatoren: [shl, fhir],
  };
}

/** Was zwischen zwei Belegen zählt — ohne Datum, Kern-Gesamthash und Wegwerf-Werte. */
function vergleichsKern(b) {
  return JSON.stringify({
    weg: b && b.kern && b.kern.wegSha256,
    faelle: ((b && b.faelle) || []).map((f) => [f.name, f.inhaltstyp, f.weg]),
    validatoren: ((b && b.validatoren) || []).map((v) => ({
      art: v.art, name: v.name, fassung: v.fassung, pruefsumme: v.pruefsumme, ergebnis: v.ergebnis,
      faelle: (v.faelle || []).map((f) => [f.name, f.erwartet, f.ist]),
    })),
  });
}

/* ── Lauf ──────────────────────────────────────────────────────────────── */
async function lauf({ jar, cache, ausfuehren = ausfuehrenEcht } = {}) {
  const kernPfad = process.env.KERN_HTML_PATH || path.join(REPO, 'vivodepot.html');
  const kern = kernAngaben(fs.readFileSync(kernPfad, 'utf8'));
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  const gebaut = await faelleBauen(V);
  const form = gebaut.map((f) => [f.vorlage.name, fallFormPruefen(f)]).filter(([, x]) => x.length);
  if (form.length) throw new Error('Fälle haben nicht die Form des Kerns: ' + form.map(([n, x]) => n + ': ' + x.join('; ')).join(' | '));

  const { auftraege, faelle: shlFaelle } = shlAuftraege(gebaut);
  const beschaffung = shlBeschaffen({ verzeichnis: shlCacheVerzeichnis(cache), ausfuehren });
  const shlBasis = { art: 'shl', name: SHL_PIN.name, fassung: SHL_PIN.version + ' (Commit ' + SHL_PIN.commit + ')',
    pruefsumme: beschaffung.pruefsumme || null, quelle: SHL_PIN.repo, lizenz: SHL_PIN.lizenz,
    aufruf: 'js/src/api.js validate.shlink/shlpayload (cascade:false), validate.shlmanifestfile (embedded) und validate.jwe mit Schlüssel; kein Netzabruf der Ablage-URL' };
  let shl;
  if (beschaffung.status !== 'gemessen') {
    shl = { ...shlBasis, ...validatorErgebnis({ beschaffung, faelle: [] }) };
  } else {
    const { ergebnisse, grund } = shlAusfuehren(beschaffung.verzeichnis, auftraege, ausfuehren);
    const faelle = shlFaelleUrteil(shlFaelle, auftraege, ergebnisse);
    shl = { ...shlBasis, ...validatorErgebnis({ beschaffung, faelle }), ...(grund ? { grund } : {}), faelle };
  }
  const fhir = await hl7Pruefen(binaerFaelle(gebaut), { jar, cache });
  const faelle = gebaut.map((f) => ({ name: f.vorlage.name, inhaltstyp: f.vorlage.mime, weg: f.vorlage.weg,
    eingang: f.vorlage.binary ? 'FHIR Binary' : 'FHIR direkt', quelle: 'auszugLinkTeile' }));
  return belegBauen({ kern, faelle, shl, fhir });
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}

async function main() {
  const beleg = await lauf({ jar: arg('--jar') || process.env.FHIR_VALIDATOR_JAR || null, cache: arg('--cache') });
  for (const v of beleg.validatoren) {
    console.log((v.ergebnis === 'gruen' ? '✔ ' : v.ergebnis === 'rot' ? '✖ ' : '⚠ ') + v.art + ': ' + v.name + ' ' + (v.fassung || '?')
      + ' — ' + v.ergebnis.toUpperCase() + (v.grund ? ' (' + v.grund + ')' : ''));
    for (const f of v.faelle || []) {
      console.log('    ' + (f.ist === f.erwartet ? '✔ ' : '✖ ') + f.name + '  erwartet ' + f.erwartet + ', ist ' + f.ist);
      if (f.ist !== f.erwartet || f.erwartet === 'ungueltig') for (const z of [...f.fehler, ...f.warnungen].slice(0, 4)) console.log('        ' + z);
    }
  }
  const pfad = VB.pfadFunde(beleg);
  if (pfad.length) { console.error('✖ Beleg trägt Pfad oder Hostname: ' + pfad.join(', ')); return 1; }
  const ergebnis = beleg.ergebnis;
  if (process.argv.includes('--pruefen')) {
    if (!fs.existsSync(BELEG)) { console.error('✖ kein Beleg vorhanden: tools/link-senden-validator-beleg.json'); return 1; }
    const alt = JSON.parse(fs.readFileSync(BELEG, 'utf8'));
    if (vergleichsKern(alt) !== vergleichsKern(beleg)) { console.error('✖ der vorhandene Beleg weicht von diesem Lauf ab (Validator, Fälle oder Kern-Weg)'); return 1; }
    console.log('✔ der vorhandene Beleg stimmt mit diesem Lauf überein');
  }
  if (process.argv.includes('--schreiben')) {
    fs.writeFileSync(BELEG, JSON.stringify(beleg, null, 2) + '\n');
    console.log('Beleg geschrieben: tools/link-senden-validator-beleg.json (' + ergebnis + ')');
  }
  console.log('Gesamt: ' + ergebnis.toUpperCase());
  return ergebnis === 'gruen' ? 0 : ergebnis === 'rot' ? 1 : 2;
}

module.exports = {
  SHL_PIN, BELEG, JWE_KOPF, KERN_WEG, LAEUFER, ERGEBNIS_MARKE,
  shlCacheVerzeichnis, hl7CacheVerzeichnis, integritaetMessen, integritaetPruefen, shlBeschaffen,
  jweEntschluesseln, faelleBauen, fallFormPruefen, shlAuftraege, shlAusfuehren, shlFaelleUrteil, binaerFaelle,
  validatorErgebnis, gesamtErgebnis, quellAusschnitt, kernAngaben, belegBauen, vergleichsKern, lauf,
};

if (require.main === module) main().then((c) => process.exit(c), (e) => { console.error('✖ ' + (e && e.stack || e)); process.exit(2); });
