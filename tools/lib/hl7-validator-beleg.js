'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   hl7-validator-beleg.js — welcher HL7-Validator hat geprüft? Name, Fassung und Prüfsumme in jedem Bericht (04.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund HL7-VALIDATOR-FASSUNG (MITTEL, als Klasse): Die Wrapper um validator_cli nahmen ein freies --jar und hielten
   weder Fassung noch Prüfsumme fest; der Bericht der myHealth-Demo nannte die Fassung nicht, sie war nur erschlossen.
   Dieser Helfer ist die eine Stelle, über die jedes Werkzeug den Jar nimmt (Wächter: tests/hl7-validator-beleg-pflicht.test.js).

   - jarFassung(jar): SHA-256 des Jars. Gleich dem Pin aus tools/lib/hl7-validator-pin.json → gepinnt, Fassung = Pin.
     Sonst Fassung aus fhir-build.properties im Jar (gepinnt: false). Ohne lesbare Fassung: Fehler — ein freies Jar
     gibt es nur mit Fassung im Bericht, sonst gar nicht.
   - belegKopf(...): genau die Felder, die ein Beleg trägt — Validator-Name, Fassung, SHA-256, Datum (UTC), geprüfter
     Kern-Hash, Ergebnis. Nie ein Pfad, nie ein Hostname.
   - berichtPruefen(bericht): was einem Bericht fehlt (leer = in Ordnung).
   - gateBelegSchreiben(beleg): der letzte Lauf je Kern-Hash, außerhalb des Kanons unter GATE_BELEG_DATEI.
   Probe: tests/hl7-validator-beleg.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { version: PIN_VERSION, sha256: PIN_SHA256 } = require('./hl7-validator-pin.json');   // die eine Stelle für Fassung und Prüfsumme
const PIN = { VERSION: PIN_VERSION, SHA256: PIN_SHA256 };

const NAME = 'HL7 FHIR Validator (validator_cli)';
const GATE_BELEG_DATEI = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'vivodepot-hl7-validator', 'gate-belege.json');

function sha256Datei(datei) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(datei, 'r');
  try {
    const puffer = Buffer.alloc(1 << 20);
    let n;
    while ((n = fs.readSync(fd, puffer, 0, puffer.length, null)) > 0) h.update(puffer.subarray(0, n));
  } finally { fs.closeSync(fd); }
  return h.digest('hex');
}

/* Die Fassung aus fhir-build.properties im Jar (ein Zip). `unzip -p` gibt es auf macOS und Linux; fehlt es, ist die Fassung
   nicht lesbar — und dann gilt der Jar als nicht belegbar, nicht als gültig. */
function fassungAusJar(jar, unzip = 'unzip') {
  const r = spawnSync(unzip, ['-p', jar, 'fhir-build.properties'], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout) return null;
  const m = /^\s*(?:orgfhir\.)?version\s*=\s*(\S+)\s*$/m.exec(r.stdout);
  return m ? m[1] : null;
}

function jarFassung(jar, { pin = PIN, unzip } = {}) {
  if (!jar || !fs.existsSync(jar)) throw new Error('validator_cli.jar nicht angegeben oder nicht vorhanden');
  const sha256 = sha256Datei(jar);
  if (sha256 === pin.SHA256) return { name: NAME, fassung: pin.VERSION, sha256, gepinnt: true };
  const fassung = fassungAusJar(jar, unzip);
  if (!fassung) throw new Error('freies Jar ohne lesbare Fassung (fhir-build.properties) — nicht verwendbar; den gepinnten Jar verwenden (Fassung und Prüfsumme: tools/lib/hl7-validator-pin.json)');
  return { name: NAME, fassung, sha256, gepinnt: false };
}

function belegKopf({ validator, kernHash = null, ergebnis, jetzt = new Date() }) {
  return {
    validator: { name: validator.name, fassung: validator.fassung, sha256: validator.sha256, gepinnt: !!validator.gepinnt },
    datum: new Date(jetzt).toISOString(),
    kernHash,
    ergebnis,
  };
}

/* Was einem Bericht fehlt. Leer = in Ordnung. Der Bericht trägt den Kopf `validator` (aus jarFassung/belegKopf). */
function berichtPruefen(bericht) {
  const fehlt = [];
  const v = bericht && bericht.validator;
  if (!v || typeof v.name !== 'string' || !v.name.trim()) fehlt.push('validator.name');
  if (!v || typeof v.fassung !== 'string' || !v.fassung.trim()) fehlt.push('validator.fassung');
  if (!v || !/^[0-9a-f]{64}$/.test(String(v.sha256 || ''))) fehlt.push('validator.sha256');
  return fehlt;
}

/* Kein Pfad, kein Hostname in einem Beleg — er kann einen Rechner verlassen. */
function pfadFunde(wert, host = os.hostname()) {
  const text = JSON.stringify(wert);
  const funde = [];
  for (const re of [/\/Users\//, /\/home\//, /[A-Z]:\\\\/, /\/private\/var\//, /\/tmp\//]) if (re.test(text)) funde.push(String(re));
  if (host && host.length > 2 && text.includes(host)) funde.push('Hostname');
  return funde;
}

function gateBelegSchreiben(beleg, datei = GATE_BELEG_DATEI) {
  const p = pfadFunde(beleg);
  if (p.length) throw new Error('Gate-Beleg trägt Pfad oder Hostname: ' + p.join(', '));
  let alle = {};
  try { alle = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (_) { alle = {}; }
  alle[beleg.kernHash || 'ohne-kern-hash'] = beleg;
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, JSON.stringify(alle, null, 1) + '\n');
  return datei;
}

module.exports = { NAME, GATE_BELEG_DATEI, sha256Datei, fassungAusJar, jarFassung, belegKopf, berichtPruefen, pfadFunde, gateBelegSchreiben };
