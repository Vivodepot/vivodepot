/* ═════════════════════════════════════════════════════════════════════════
   itb-shacl.mjs — Adapter: eingehende Bildungsnachweise (EDC) gegen das offizielle
   EDC-Anwendungsprofil, Prüfer ITB SHACL Validator der Kommission (U2-ADR-443)
   ─────────────────────────────────────────────────────────────────────────
   HOLDER, NICHT AUSSTELLER (U2-ADR-097 §6): es gibt keinen Generator. Die gueltig-Fälle
   sind die amtlichen EU-Beispiele (tests/fixtures/edci-europass-*, ELM-Repo Commit
   9d7c5d22 — derselbe Commit wie die gepinnten Shapes), und zwar NACH dem echten Kernweg
   Einlesen → Mappe → Herunterladen (herkunft 'kern-rundweg'). Geprüft wird, was der Kern
   wieder herausgibt, nicht die Eingangsdatei. Dieselben Dateien roh laufen daneben als
   'offizielles-beispiel' — sie allein trügen nie ein „echt" (Standards-Schnittstelle, Holder-Regel).

   Signierte EDCs sind JWS-General-JSON mit unencoded payload (RFC 7797): SHACL prüft die
   Nutzlast — das Credential selbst nennt sein Schema (`credentialSchema: …/ap/edc-generic-full,
   ShaclValidator2017`). Ob die OFFIZIELLE EDC-Prüfung SHACL genau auf diese Nutzlast anwendet:
   nicht verifiziert. Das Siegel prüft dieser Adapter nicht (eigener Posten, DSS).

   DER WEG ZUM PRÜFER (entschieden 28.09.2026: Docker per Digest, gemessen am selben Tag):
   Der ITB SHACL Validator wird offline NUR als Docker-Image verteilt (Release 1.13.0 vom
   25.09.2026 ohne JAR-Asset; itb.ec.europa.eu/shacl-offline/…/validator.jar → 404; Maven Central
   ohne Treffer — gemessen 28.09.2026). Gepinnt ist das Image `isaitb/shacl-validator` per Digest
   (WERKZEUG.docker), das Image ist für arm64 und amd64 gebaut. Ein anderes Image nur über
   ITB_SHACL_DOCKER_IMAGE und nur mit Digest.
   Beschaffen (Image ziehen, Shapes und Kontexte in den Cache, je SHA-256 geprüft):
     node tools/itb-shacl-beschaffen.mjs
   Die Suite zieht nie selbst: fehlt etwas, ist der Lauf „ungemessen" (todo), nie grün.

   DER AUFRUF, WIE ER GEMESSEN IST: Ein Container ohne Netz (`--network none`) trägt die
   Domäne `edc` (config.properties + beide Shapes aus dem Cache, read-only eingehängt). Ohne Netz
   gibt es keine Port-Weiterleitung, und im Image fehlen curl und ein Java-Compiler. Die Anfrage an
   die REST-Schnittstelle (`POST /shacl/edc/api/validate`, Inhalt BASE64, Bericht als JSON) geht
   darum per `docker exec` über bash `/dev/tcp` im Container selbst. Der Container beendet sich nach
   15 Minuten selbst (`timeout`), falls ein Lauf abbricht, bevor aufraeumen() ihn stoppt.

   JSON-LD VOR SHACL: SHACL prüft RDF. Die Kontexte (w3.org/2018/credentials/v1, edc-ap) sind
   gepinnt und werden lokal aufgelöst, nie über das Netz. Der edc-ap-Kontext ist die Fassung,
   auf die die amtliche Adresse heute auflöst (Cellar `20230928-0`) — sie weicht von der
   Repo-Kopie am Commit 9d7c5d22 ab (Tippfehler resultDestribution korrigiert, vier Begriffe
   dazu, nationalID geändert; gemessen 28.09.2026).
   GEMESSEN (28.09.2026): Ohne Netz lehnt ITB ein Credential mit Kontext-ADRESSEN ab
   („The document could not be loaded or parsed [code=LOADING_DOCUMENT_FAILED]"). „Lokal
   aufgelöst" heißt darum: urteile() ersetzt jede gepinnte Kontext-Adresse durch den Inhalt der
   gepinnten Datei (`@context`), sonst bleibt alles, wie der Kern es herausgab. Eine Adresse ohne
   Pin ist kein Urteil, sondern ein Fehler.

   DAS UNGESIEGELTE EU-BEISPIEL IST EIN ENTWURF (gemessen 28.09.2026): ihm fehlen `issued` und der
   `eidasLegalIdentifier` des Ausstellers; beides kommt erst mit der Siegelung, die gesiegelte
   Fassung derselben Urkunde trägt beides. edc-generic-full verlangt beides (EDC-generic-no-cv.ttl:
   IssuerNodeShape, elm:eidasLegalIdentifier sh:minCount 1; cred:issued sh:minCount 1), ITB lehnt
   den Entwurf mit genau diesen zwei Verstößen ab. Er steht darum als `ungueltig` mit Grund da —
   gemessen, nicht erwartet. Der Kern verwahrt ihn trotzdem: die Bürgerin behält, was sie hat.
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
const FIXTURES = path.join(HIER, '..', '..', 'fixtures');

/* Die gepinnten Artefakte. Wandern in das gemeinsame Beschaffungs-Manifest der
   Standards-Schnittstelle, sobald es existiert; bis dahin hier, damit die Pins nicht in
   einem Bericht, sondern im Baum liegen. SHA-256 erhoben am 28.09.2026 (curl + shasum -a 256). */
export const ARTEFAKTE = Object.freeze([
  { id: 'edc-ap-shapes-generic-full-1.1.0', art: 'daten', version: '1.1.0', lizenz: 'CC-BY-4.0 (im Inhalt, Z. 34); Repo EUPL-1.2',
    url: 'https://raw.githubusercontent.com/european-commission-empl/European-Learning-Model/9d7c5d22002237c3afeb1750b7038e6fe2cdd371/rdf/ap/edc/EDC-generic-full.ttl',
    sha256: '5e409f5bb79e0013867f63b8e5174ae4013bb971a0d729fd77ba2fb531e1be8b' },
  { id: 'edc-ap-shapes-generic-no-cv-1.1.0', art: 'daten', version: '1.1.0', lizenz: 'CC-BY-4.0 (im Inhalt, Z. 32); Repo EUPL-1.2',
    url: 'https://raw.githubusercontent.com/european-commission-empl/European-Learning-Model/9d7c5d22002237c3afeb1750b7038e6fe2cdd371/rdf/ap/edc/EDC-generic-no-cv.ttl',
    sha256: '14e691293cad67283301f032b946fdf104687547327bfd0eef747afa3316115d' },
  { id: 'edc-ap-kontext-20230928-0', art: 'daten', version: '20230928-0', lizenz: 'ohne eigene Angabe; Herausgeber EU-Kommission',
    url: 'https://op.europa.eu/o/opportal-service/euvoc-download-handler?cellarURI=http://publications.europa.eu/resource/distribution/snb-model/20230928-0/jsonld/owl/edc-ap-context.jsonld',
    sha256: 'fde0b3fd92e98a8870c173fb98baff361be6dd07e44653a9a5ac6c0fe626b411', kontextFuer: 'http://data.europa.eu/snb/model/context/edc-ap' },
  { id: 'w3c-credentials-v1-kontext', art: 'daten', version: '1.1', lizenz: 'W3C Document License',
    url: 'https://www.w3.org/2018/credentials/v1',
    sha256: 'ab4ddd9a531758807a79a5b450510d61ae8d147eab966cc9a200c07095b0cdcc', kontextFuer: 'https://www.w3.org/2018/credentials/v1' },
]);

// Digest gemessen am 28.09.2026 (hub.docker.com/v2/repositories/isaitb/shacl-validator/tags, Tag 1.13.0;
// `docker pull` bestätigt denselben Digest). Das ist das offizielle Artefakt der Kommission.
export const WERKZEUG = Object.freeze({
  version: '1.13.0',
  docker: { image: 'isaitb/shacl-validator', digest: 'sha256:877d7e696a19c215b1104a6c69bb4e0744365f8eed906c3f6cf52f4ff70c2eea' },
});
export const IMAGE = WERKZEUG.docker.image + '@' + WERKZEUG.docker.digest;
const SHAPES = [
  { artefakt: 'edc-ap-shapes-generic-full-1.1.0', datei: 'EDC-generic-full.ttl' },
  { artefakt: 'edc-ap-shapes-generic-no-cv-1.1.0', datei: 'EDC-generic-no-cv.ttl' },
];

const BEISPIELE = [
  { datei: 'edci-europass-certofpart-signed.jsonld', erwartet: 'gueltig', warum: 'Teilnahmezertifikat, gesiegelt (JWS, RFC 7797)' },
  { datei: 'edci-europass-certofpart-unsigned.jsonld', erwartet: 'ungueltig',
    warum: 'Teilnahmezertifikat, ungesiegelter Entwurf: ohne issued und ohne eidasLegalIdentifier des Ausstellers (s. Kopf)' },
  { datei: 'edci-europass-mc-signed.jsonld', erwartet: 'gueltig', warum: 'Micro-Credential, gesiegelt' },
];

let _arbeit = null;
let _dienst = null;   // { name } des laufenden Prüf-Containers, einmal je Prozess gestartet
function arbeit() { return _arbeit || (_arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-itb-shacl-'))); }
// Wer artefakte()/kaputt()/urteile() gerufen hat, räumt danach Container und Arbeitsverzeichnis weg.
export function aufraeumen() {
  if (_dienst) { try { execFileSync(_dienst.docker, ['rm', '-f', _dienst.name], { stdio: 'ignore', timeout: 30000 }); } catch (_) { /* schon weg */ } _dienst = null; }
  if (_arbeit) { fs.rmSync(_arbeit, { recursive: true, force: true }); _arbeit = null; }
}

// Der Cache der gepinnten Daten (Shapes, Kontexte) — außerhalb des Baums, gefüllt von tools/itb-shacl-beschaffen.mjs.
export function cacheVerzeichnis() {
  return process.env.ITB_SHACL_CACHE || path.join(os.homedir(), '.cache', 'vivodepot', 'itb-shacl');
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
function cacheDatei(artefakt) { return path.join(cacheVerzeichnis(), artefakt.id); }
// null, wenn jede gepinnte Datei im Cache liegt und ihre Prüfsumme trägt; sonst der Grund.
function cacheMangel() {
  for (const x of ARTEFAKTE) {
    const p = cacheDatei(x);
    if (!fs.existsSync(p)) return x.id + ' fehlt im Cache ' + cacheVerzeichnis();
    if (sha256(fs.readFileSync(p)) !== x.sha256) return x.id + ': SHA-256 weicht vom Pin ab';
  }
  return null;
}
// Beschaffung, nur von Hand oder aus dem Werkzeug — nie aus der Suite: Image per Digest ziehen, Daten laden und prüfen.
export async function beschaffen({ ausgabe = () => {} } = {}) {
  fs.mkdirSync(cacheVerzeichnis(), { recursive: true });
  for (const x of ARTEFAKTE) {
    const p = cacheDatei(x);
    if (fs.existsSync(p) && sha256(fs.readFileSync(p)) === x.sha256) { ausgabe('vorhanden ' + x.id); continue; }
    const r = await fetch(x.url, { redirect: 'follow' });
    if (!r.ok) throw new Error(x.id + ': HTTP ' + r.status + ' von ' + x.url);
    const buf = Buffer.from(await r.arrayBuffer());
    if (sha256(buf) !== x.sha256) throw new Error(x.id + ': SHA-256 ' + sha256(buf) + ' ≠ Pin ' + x.sha256);
    fs.writeFileSync(p, buf);
    ausgabe('geladen ' + x.id);
  }
  const docker = dockerPfad();
  if (!docker) throw new Error('Docker nicht gefunden');
  execFileSync(docker, ['pull', bild()], { stdio: 'inherit' });
  ausgabe('Image ' + bild());
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
function bild() { return process.env.ITB_SHACL_DOCKER_IMAGE || IMAGE; }

// Synchron warten, ohne CPU zu brennen (urteile() ist synchron wie bei allen Adaptern).
function schlafe(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function dienstStarten(docker) {
  if (_dienst) return _dienst;
  const res = path.join(arbeit(), 'resources');
  fs.mkdirSync(path.join(res, 'edc', 'shapes'), { recursive: true });
  for (const sh of SHAPES) fs.copyFileSync(cacheDatei(ARTEFAKTE.find((x) => x.id === sh.artefakt)), path.join(res, 'edc', 'shapes', sh.datei));
  fs.writeFileSync(path.join(res, 'edc', 'config.properties'), [
    'validator.type = edc-ap',
    'validator.shaclFile.edc-ap = ' + SHAPES.map((sh) => 'shapes/' + sh.datei).join(', '),
    'validator.channels = rest_api',
    'validator.loadImports = false',
    '',
  ].join('\n'));
  const name = 'vd-itb-shacl-' + process.pid + '-' + crypto.randomBytes(3).toString('hex');
  execFileSync(docker, ['run', '-d', '--rm', '--name', name, '--network', 'none',
    '--label', 'vivodepot.pruefer=itb-shacl',
    '-v', res + ':/validator/resources:ro', '-e', 'validator.resourceRoot=/validator/resources/',
    '--entrypoint', 'timeout', bild(),
    '900', 'java', '-XX:+ExitOnOutOfMemoryError', '-jar', '/validator/validator.jar'], { stdio: 'ignore', timeout: 60000 });
  _dienst = { docker, name };
  const bis = Date.now() + 90000;
  while (Date.now() < bis) {
    let log = '';
    try { log = execFileSync(docker, ['logs', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 }); } catch (e) { log = String((e.stdout || '') + (e.stderr || '')); }
    if (/Started Application/.test(log)) return _dienst;
    schlafe(500);
  }
  throw new Error('ITB-Container ' + name + ' nicht in 90 s bereit');
}

// Gepinnte Kontext-Adressen durch den Inhalt der gepinnten Datei ersetzen (s. Kopf: ohne Netz die einzige Auflösung).
export function kontexteEinbetten(json) {
  const o = JSON.parse(json);
  const fehlend = [];
  const ersetze = (v) => {
    if (Array.isArray(v)) return v.map(ersetze);
    if (typeof v !== 'string') return v;
    const pin = ARTEFAKTE.find((x) => x.kontextFuer === v);
    if (!pin) { fehlend.push(v); return v; }
    return JSON.parse(fs.readFileSync(cacheDatei(pin), 'utf8'))['@context'];
  };
  o['@context'] = ersetze(o['@context']);
  return { json: JSON.stringify(o), fehlend };
}

// Die SHACL-Eingabe: bei einer JWS-Hülle die Nutzlast (Credential-JSON-LD), sonst die Datei selbst.
export function shaclEingabe(bytes) {
  const o = JSON.parse(Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, ''));
  return typeof o.payload === 'string' ? o.payload : JSON.stringify(o);
}


export default {
  id: 'itb-shacl',
  familie: 'rdf-shacl',
  autoritaet: 'Europäische Kommission, DIGIT — ITB SHACL Validator (ISAITB/shacl-validator), mit den offiziellen EDC-AP-Shapes der GD EMPL',
  prueft: 'eingehende European Digital Credentials gegen das EDC-Anwendungsprofil edc-generic-full 1.1.0, nach dem Rundweg durch den Kern',
  werkzeugVersion: WERKZEUG.version,
  werkzeug: 'itb-shacl-validator-1.13.0',
  standards: ['edc-ap'],

  vorhanden() {
    const image = bild();
    if (!/@sha256:[0-9a-f]{64}$/.test(image)) return { ok: false, grund: 'ITB_SHACL_DOCKER_IMAGE ohne Digest-Pin (…@sha256:<64 hex>)' };
    if (process.env.ITB_SHACL_AUS) return { ok: false, grund: 'ITB-SHACL-Validator abgeschaltet (ITB_SHACL_AUS) — nicht beschafft für diesen Lauf' };
    const mangel = cacheMangel();
    if (mangel) return { ok: false, grund: 'ITB-SHACL-Daten nicht beschafft: ' + mangel + ' — node tools/itb-shacl-beschaffen.mjs' };
    const docker = dockerPfad();
    if (!docker) return { ok: false, grund: 'ITB-SHACL-Validator nicht beschafft: Docker fehlt oder läuft nicht' };
    try { execFileSync(docker, ['image', 'inspect', image], { stdio: 'ignore', timeout: 20000 }); }
    catch (_) { return { ok: false, grund: 'ITB-SHACL-Validator nicht beschafft: Image ' + image + ' fehlt lokal — node tools/itb-shacl-beschaffen.mjs' }; }
    return { ok: true, docker, image };
  },

  // Gemessen am echten Werkzeug (28.09.2026): REST, Inhalt BASE64, Bericht im GITB-TRL-JSON
  // (`result` SUCCESS/FAILURE, `reports.error[]` mit description/location). Ohne Werkzeug: kein Urteil.
  urteile(umgebung, dateiPfad, standardId) {
    if (!umgebung || !umgebung.ok) return { gelesen: false, gueltig: false, fehler: ['ITB-SHACL-Validator nicht beschafft — kein Urteil'] };
    if (standardId !== 'edc-ap') return { gelesen: false, gueltig: false, fehler: ['Standard ' + standardId + ' urteilt dieser Adapter nicht'] };
    const { json, fehlend } = kontexteEinbetten(fs.readFileSync(dateiPfad, 'utf8'));
    if (fehlend.length) return { gelesen: false, gueltig: false, fehler: ['Kontext ohne Pin: ' + fehlend.join(', ')] };
    const d = dienstStarten(umgebung.docker);
    const koerper = JSON.stringify({ contentToValidate: Buffer.from(json, 'utf8').toString('base64'), embeddingMethod: 'BASE64',
      contentSyntax: 'application/ld+json', validationType: 'edc-ap', reportSyntax: 'application/json' });
    const anfrage = 'POST /shacl/edc/api/validate HTTP/1.0\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\n'
      + 'Content-Length: ' + Buffer.byteLength(koerper) + '\r\n\r\n' + koerper;
    let antwort;
    try {
      antwort = execFileSync(d.docker, ['exec', '-i', d.name, 'bash', '-c', 'exec 3<>/dev/tcp/127.0.0.1/8080; cat >&3; cat <&3'],
        { input: anfrage, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    } catch (e) { return { gelesen: false, gueltig: false, fehler: ['Aufruf gescheitert: ' + e.message] }; }
    const trenn = antwort.indexOf('\r\n\r\n');
    const status = /^HTTP\/1\.[01] (\d{3})/.exec(antwort);
    if (!status || status[1] !== '200' || trenn < 0) return { gelesen: false, gueltig: false, fehler: ['ITB antwortet ' + antwort.slice(0, 300)] };
    let bericht;
    try { bericht = JSON.parse(antwort.slice(trenn + 4)); } catch (_) { return { gelesen: false, gueltig: false, fehler: ['Bericht kein JSON'] }; }
    const fehler = ((bericht.reports && bericht.reports.error) || []).map((x) => (x.description || '') + ' — ' + (x.location || ''));
    return { gelesen: true, gueltig: bericht.result === 'SUCCESS' && fehler.length === 0, fehler };
  },

  async artefakte() {
    const { ladeMitAusgabe, warteAufDateien } = require('../../ausgabe-fang.js');
    const faelle = [];
    for (const b of BEISPIELE) {
      const roh = fs.readFileSync(path.join(FIXTURES, b.datei));
      const k = ladeMitAusgabe();
      await k.V.depotAnlegen('pw');
      k.V.akteurSelbstErklaeren('Konformitaet');
      const id = k.V.importAutoritativDokument(roh.toString('utf8'), new Uint8Array(roh));
      if (!id) throw new Error(b.datei + ': der Kern legt das EDC nicht als Original ab');
      await k.V.flowMappeOriginalHerunterladen(id);
      if (await warteAufDateien(k, 1, 4000) !== 1) throw new Error(b.datei + ': der Kern gibt das Original nicht heraus');
      const raus = await k.bytes(0);
      const name = b.datei.replace(/\.jsonld$/, '');
      const pKern = path.join(arbeit(), name + '.kern-rundweg.jsonld');
      fs.writeFileSync(pKern, shaclEingabe(raus));
      faelle.push({ name: name + '·kern-rundweg', standard: 'edc-ap', pfad: pKern, erwartet: b.erwartet, herkunft: 'kern-rundweg', warum: b.warum + ' — was der Kern nach dem Verwahren herausgibt' });
      const pRoh = path.join(arbeit(), name + '.offizielles-beispiel.jsonld');
      fs.writeFileSync(pRoh, shaclEingabe(roh));
      faelle.push({ name: name + '·offizielles-beispiel', standard: 'edc-ap', pfad: pRoh, erwartet: b.erwartet, herkunft: 'offizielles-beispiel', warum: b.warum + ' — die EU-Datei selbst (Kontrolle der Shapes)' });
    }
    return faelle;
  },

  // Pflichtangabe entfernt: der Aussteller fehlt — EDC-generic-no-cv.ttl Z. 1047–1060: cred:issuer sh:minCount 1, sh:Violation.
  async kaputt() {
    const o = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'edci-europass-certofpart-unsigned.jsonld'), 'utf8'));
    delete o.issuer;
    const p = path.join(arbeit(), 'edc-ohne-aussteller.jsonld');
    fs.writeFileSync(p, JSON.stringify(o));
    return [{ standard: 'edc-ap', pfad: p, warum: 'cred:issuer ist Pflicht im EDC-Anwendungsprofil' }];
  },
};
