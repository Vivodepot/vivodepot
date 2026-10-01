/* ═════════════════════════════════════════════════════════════════════════
   1edtech-validator.mjs — Adapter: eingehende Open Badges 3.0 gegen den offiziellen Prüfer
   von 1EdTech (Digital Credentials Public Validator), U2-ADR-445
   ─────────────────────────────────────────────────────────────────────────
   HOLDER, NICHT AUSSTELLER (U2-ADR-097 §6): es gibt keinen Generator. Die Fälle sind die
   Testdateien des Prüfers selbst (tests/fixtures/ob3-*, Apache-2.0, Quelle ob3-QUELLE.md), und
   zwar NACH dem echten Kernweg Einlesen → Mappe → Herunterladen (herkunft 'kern-rundweg').
   Dieselben Dateien roh laufen daneben als 'offizielles-beispiel'; sie allein trügen nie ein „echt".

   DER PRÜFER IST „AUS OFFIZIELLER QUELLE GEBAUT", KEIN OFFIZIELLES ARTEFAKT: 1EdTech verteilt kein
   Image und kein Release-JAR (gemessen 28.09.2026: keine Release-Assets, ghcr.io 401, Docker Hub
   ohne offizielles Image). tools/1edtech-validator/Dockerfile baut ihn aus dem Quellarchiv am Commit
   des Tags v1.11.3 (SHA-256 gepinnt) auf Basis-Images per Digest; das Kernmodul inspector-core kommt
   als Binärdatei aus dem öffentlichen Maven-Server von 1EdTech. Das gebaute JAR ist nicht
   reproduzierbar, der Pin ist die Quelle. Bauen: node tools/1edtech-validator-beschaffen.mjs.
   ═════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HIER, '..', '..', '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures');

export const WERKZEUG = Object.freeze({
  version: 'v1.11.3',
  quelle: {
    repo: 'https://github.com/1EdTech/digital-credentials-public-validator',
    commit: '9995ad9da1fbc5475ef9841c466e59f83d300b5f',
    archivSha256: '221504cabced1532e25a2c708831edcb4dab4f2eb0ab0657fdb0c671cb271068',
  },
  dockerfile: 'tools/1edtech-validator/Dockerfile',
  image: 'vivodepot/1edtech-validator:v1.11.3-9995ad9d',   // lokal gebaut; ein Tag, kein Pin — gepinnt ist die Quelle
  herkunft: 'aus offizieller Quelle gebaut',
});

// Die gepinnten Bausteine des Prüfers (dieselben Werte stehen im Dockerfile; die Hülle prüft den Gleichlauf).
export const ARTEFAKTE = Object.freeze([
  { id: '1edtech-dcpv-v1.11.3', art: 'quelle', version: 'v1.11.3', lizenz: 'Apache-2.0',
    url: 'https://github.com/1EdTech/digital-credentials-public-validator/archive/9995ad9da1fbc5475ef9841c466e59f83d300b5f.tar.gz',
    sha256: '221504cabced1532e25a2c708831edcb4dab4f2eb0ab0657fdb0c671cb271068' },
  { id: 'maven-3.9.9-temurin-17', art: 'image', lizenz: 'Apache-2.0 (Maven), GPLv2+CE (Temurin)',
    url: 'maven:3.9.9-eclipse-temurin-17', sha256: 'f58d59b6273e785ac0a4477f6e9b5ba1d7731c75b906c0f7b34076f1851318cc' },
  { id: 'temurin-17-jdk-jammy', art: 'image', lizenz: 'GPLv2+CE (Temurin)',
    url: 'eclipse-temurin:17-jdk-jammy', sha256: '60fcdd4a85c94a23ef86d0d55867c6a8dbc4f7c3efc8286e259956c3ea4ef08c' },
]);

// Je Form ein Badge (ob3-QUELLE.md), die Erwartung GEMESSEN am Werkzeug (28.09.2026, ohne Netz).
export const BEISPIELE = [
  { datei: 'ob3-simple.json', erwartet: 'gueltig', warum: 'JSON-LD, eingebetteter Beweis (eddsa-rdfc-2022)' },
  { datei: 'ob3-simple-jwt-aus-svg.jwt', erwartet: 'gueltig', warum: 'VC-JWT, kompakte JWS (aus ob3-simple-jwt.svg herausgelöst, s. ob3-QUELLE.md)' },
  { datei: 'ob3-simple-json.png', erwartet: 'gueltig', warum: 'PNG, gebacken, JSON-LD' },
  { datei: 'ob3-simple-jwt.png', erwartet: 'gueltig', warum: 'PNG, gebacken, JWS' },
  { datei: 'ob3-simple-json.svg', erwartet: 'gueltig', warum: 'SVG, gebacken, JSON-LD' },
  { datei: 'ob3-simple-jwt.svg', erwartet: 'gueltig', warum: 'SVG, gebacken, JWS' },
  // Gemessen ungültig — Befunde an der Datei, keine Folge des fehlenden Netzes:
  { datei: 'ob3-simple.jwt', erwartet: 'ungueltig',
    warum: 'VC-JWT im Entwurfsstand: alter Kontext (imsglobal.github.io), ohne achievement und validFrom, JWS ohne jwk/kid' },
  { datei: 'ob3-complete.json', erwartet: 'ungueltig', warum: 'abgelaufen (validUntil 2020-01-01)' },
];

let _arbeit = null;
let _dienst = null;
function arbeit() { return _arbeit || (_arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-1edtech-'))); }
export function aufraeumen() {
  if (_dienst) { try { execFileSync(_dienst.docker, ['rm', '-f', _dienst.name], { stdio: 'ignore', timeout: 30000 }); } catch (_) { /* schon weg */ } _dienst = null; }
  if (_arbeit) { fs.rmSync(_arbeit, { recursive: true, force: true }); _arbeit = null; }
}

// Docker Desktop legt die Kommandozeile nach ~/.docker/bin und verlinkt sie nicht immer in den PATH.
function dockerPfad() {
  const kandidaten = ['docker', path.join(os.homedir(), '.docker', 'bin', 'docker'), '/usr/local/bin/docker',
    '/Applications/Docker.app/Contents/Resources/bin/docker'];
  for (const k of kandidaten) {
    try { execFileSync(k, ['version', '--format', '{{.Server.Version}}'], { stdio: 'ignore', timeout: 20000 }); return k; } catch (_) { /* nächster */ }
  }
  return null;
}
function schlafe(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

// Ein Container je Prozess, ohne Netz, beendet sich nach 15 Minuten selbst (falls aufraeumen() nicht mehr läuft).
function dienstStarten(docker) {
  if (_dienst) return _dienst;
  const name = 'vd-1edtech-' + process.pid + '-' + crypto.randomBytes(3).toString('hex');
  execFileSync(docker, ['run', '-d', '--rm', '--name', name, '--network', 'none', '--label', 'vivodepot.pruefer=1edtech-validator',
    '--entrypoint', 'timeout', WERKZEUG.image, '900', 'java', '-jar', '/app.jar'], { stdio: 'ignore', timeout: 60000 });
  _dienst = { docker, name };
  const bis = Date.now() + 90000;
  while (Date.now() < bis) {
    let log = '';
    try { log = execFileSync(docker, ['logs', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 }); } catch (e) { log = String((e.stdout || '') + (e.stderr || '')); }
    if (/Started ValidatorApplication/.test(log)) return _dienst;
    schlafe(500);
  }
  throw new Error('1EdTech-Container ' + name + ' nicht in 90 s bereit');
}

export default {
  id: '1edtech-validator',
  familie: 'json-schema',
  autoritaet: '1EdTech Consortium — Digital Credentials Public Validator (aus offizieller Quelle gebaut, Tag v1.11.3)',
  prueft: 'eingehende Open Badges 3.0 in allen vier Formen, nach dem Rundweg durch den Kern',
  werkzeugVersion: WERKZEUG.version,
  werkzeug: '1edtech-dcpv-v1.11.3',   // Kennung im Beschaffungs-Manifest tools/standards-artefakte.json
  standards: ['open-badges-3'],

  vorhanden() {
    if (process.env.OB3_VALIDATOR_AUS) return { ok: false, grund: '1EdTech-Prüfer abgeschaltet (OB3_VALIDATOR_AUS) — nicht beschafft für diesen Lauf' };
    const docker = dockerPfad();
    if (!docker) return { ok: false, grund: '1EdTech-Prüfer nicht beschafft: Docker fehlt oder läuft nicht' };
    try { execFileSync(docker, ['image', 'inspect', WERKZEUG.image], { stdio: 'ignore', timeout: 20000 }); }
    catch (_) { return { ok: false, grund: '1EdTech-Prüfer nicht beschafft: Image ' + WERKZEUG.image + ' fehlt lokal — node tools/1edtech-validator-beschaffen.mjs' }; }
    return { ok: true, docker, image: WERKZEUG.image };
  },

  /* Gemessen am gebauten Werkzeug (28.09.2026): Container ohne Netz, POST /api/validate?validatorId=OB30Inspector
     (multipart, Feld `file`), per docker exec über bash /dev/tcp. Der Bericht trägt fatals, errors, exceptions,
     warnings. Gültig heißt: keine fatals, errors, exceptions. Warnungen bleiben Hinweise — ohne Netz meldet der
     Prüfer z. B. „url … in issuer is not accessible"; das ist eine Folge des Offline-Laufs, kein Befund. */
  urteile(umgebung, dateiPfad, standardId) {
    if (!umgebung || !umgebung.ok) return { gelesen: false, gueltig: false, fehler: ['1EdTech-Prüfer nicht beschafft — kein Urteil'] };
    if (standardId !== 'open-badges-3') return { gelesen: false, gueltig: false, fehler: ['Standard ' + standardId + ' urteilt dieser Adapter nicht'] };
    const d = dienstStarten(umgebung.docker);
    const grenze = '----vivodepot' + crypto.randomBytes(8).toString('hex');
    const koerper = Buffer.concat([
      Buffer.from('--' + grenze + '\r\nContent-Disposition: form-data; name="file"; filename="' + path.basename(dateiPfad).replace(/"/g, '') + '"\r\n'
        + 'Content-Type: application/octet-stream\r\n\r\n'),
      fs.readFileSync(dateiPfad),
      Buffer.from('\r\n--' + grenze + '--\r\n'),
    ]);
    const anfrage = Buffer.concat([Buffer.from('POST /api/validate?validatorId=OB30Inspector HTTP/1.0\r\nHost: 127.0.0.1\r\n'
      + 'Content-Type: multipart/form-data; boundary=' + grenze + '\r\nContent-Length: ' + koerper.length + '\r\n\r\n'), koerper]);
    let antwort;
    try {
      antwort = execFileSync(d.docker, ['exec', '-i', d.name, 'bash', '-c', 'exec 3<>/dev/tcp/127.0.0.1/8080; cat >&3; cat <&3'],
        { input: anfrage, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    } catch (e) { return { gelesen: false, gueltig: false, fehler: ['Aufruf gescheitert: ' + e.message] }; }
    const trenn = antwort.indexOf('\r\n\r\n');
    const status = /^HTTP\/1\.[01] (\d{3})/.exec(antwort);
    if (!status || status[1] !== '200' || trenn < 0) return { gelesen: false, gueltig: false, fehler: ['Prüfer antwortet ' + antwort.slice(0, 300)] };
    let r;
    try { r = JSON.parse(antwort.slice(trenn + 4)); } catch (_) { return { gelesen: false, gueltig: false, fehler: ['Bericht kein JSON'] }; }
    if (!r.summary) return { gelesen: false, gueltig: false, fehler: ['Bericht ohne summary'] };
    const zeile = (x) => (x.title || '') + ': ' + (x.message || '');
    const fehler = ['fatals', 'errors', 'exceptions'].flatMap((k) => (r[k] || []).map((x) => k + ' — ' + zeile(x)));
    return { gelesen: true, gueltig: fehler.length === 0, fehler, hinweise: (r.warnings || []).map(zeile), ergebnis: r.summary.outcome };
  },

  async artefakte() {
    const { ladeMitAusgabe, warteAufDateien } = require(path.join(REPO, 'tests', 'ausgabe-fang.js'));
    const faelle = [];
    for (const b of BEISPIELE) {
      const roh = fs.readFileSync(path.join(FIXTURES, b.datei));
      const k = ladeMitAusgabe();
      await k.V.depotAnlegen('pw');
      k.V.akteurSelbstErklaeren('Konformitaet');
      const id = k.V.importAutoritativDokument(new TextDecoder().decode(roh), new Uint8Array(roh));
      if (!id) throw new Error(b.datei + ': der Kern legt den Badge nicht als Original ab');
      await k.V.flowMappeOriginalHerunterladen(id);
      if (await warteAufDateien(k, 1, 4000) !== 1) throw new Error(b.datei + ': der Kern gibt das Original nicht heraus');
      const raus = await k.bytes(0);
      const endung = path.extname(b.datei);
      const name = b.datei.slice(0, -endung.length);
      const pKern = path.join(arbeit(), name + '.kern-rundweg' + endung);
      fs.writeFileSync(pKern, raus);
      faelle.push({ name: name + '·kern-rundweg', standard: 'open-badges-3', pfad: pKern, erwartet: b.erwartet, herkunft: 'kern-rundweg', warum: b.warum + ' — was der Kern nach dem Verwahren herausgibt' });
      faelle.push({ name: name + '·offizielles-beispiel', standard: 'open-badges-3', pfad: path.join(FIXTURES, b.datei), erwartet: b.erwartet, herkunft: 'offizielles-beispiel', warum: b.warum + ' — die Testdatei des Prüfers selbst' });
    }
    return faelle;
  },

  // Die Negativfälle des Prüfers selbst: kein OB-Typ, Aussteller fehlerhaft.
  // ob3-simple-err-type.json fehlt bewusst: an ihm wirft der Prüfer eine Ausnahme („No value present",
  // gemessen 28.09.2026) — das ist kein sauberes Urteil und taugt nicht als Negativkontrolle.
  async kaputt() {
    return [{ standard: 'open-badges-3', pfad: path.join(FIXTURES, 'ob3-simple-err-issuer.json'), warum: 'kein Aussteller-Knoten (IssuerProbe: no issuer node found)' }];
  },
};

