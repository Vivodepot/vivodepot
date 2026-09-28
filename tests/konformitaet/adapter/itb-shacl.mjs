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

   ZWEI WEGE ZUM PRÜFER — beide vorgesehen, keiner heute auf dieser Maschine:
   Der ITB SHACL Validator wird offline NUR als Docker-Image verteilt (Release 1.13.0 vom
   25.09.2026 ohne JAR-Asset; itb.ec.europa.eu/shacl-offline/…/validator.jar → 404;
   Maven Central ohne Treffer — gemessen 28.09.2026).
     (a) Docker: Image `isaitb/shacl-validator` per Digest gepinnt → ITB_SHACL_DOCKER_IMAGE
         (Form `isaitb/shacl-validator@sha256:…`). Das offizielle Artefakt.
     (b) Eigenbau: Modul `shaclvalidator-jar` aus Tag 1.13.0 (Tag-Objekt b9e8744f) → ITB_SHACL_JAR.
         Gepinnt ist die QUELLE; der JAR-Hash ist nur Cache-Prüfung, denn der Bau ist nicht
         reproduzierbar und sein Hash hält darum keinen Pin.
   Welcher Weg, ist eine Produktentscheidung. Bis dahin ist `vorhanden()` ehrlich „ungemessen", und
   `urteile()` ruft KEIN Werkzeug mit geratenen Schaltern: der Aufruf wird am echten Werkzeug
   gemessen, sobald es beschafft ist, und erst dann hier eingetragen.

   JSON-LD VOR SHACL: SHACL prüft RDF. Die Kontexte (w3.org/2018/credentials/v1, edc-ap) sind
   gepinnt und werden lokal aufgelöst, nie über das Netz. Der edc-ap-Kontext ist die Fassung,
   auf die die amtliche Adresse heute auflöst (Cellar `20230928-0`) — sie weicht von der
   Repo-Kopie am Commit 9d7c5d22 ab (Tippfehler resultDestribution korrigiert, vier Begriffe
   dazu, nationalID geändert; gemessen 28.09.2026).
   ═════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

export const WERKZEUG = Object.freeze({
  version: '1.13.0',
  docker: { image: 'isaitb/shacl-validator', digest: null /* Pin beim Beschaffen */ },
  eigenbau: { repo: 'https://github.com/ISAITB/shacl-validator', tag: '1.13.0', tagObjekt: 'b9e8744f8597743d763d251f7ba438a768ec1ae1', modul: 'shaclvalidator-jar' },
});

const BEISPIELE = [
  { datei: 'edci-europass-certofpart-signed.jsonld', warum: 'Teilnahmezertifikat, gesiegelt (JWS, RFC 7797)' },
  { datei: 'edci-europass-certofpart-unsigned.jsonld', warum: 'Teilnahmezertifikat, ungesiegelt' },
  { datei: 'edci-europass-mc-signed.jsonld', warum: 'Micro-Credential, gesiegelt' },
];

let _arbeit = null;
function arbeit() { return _arbeit || (_arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-itb-shacl-'))); }
// Wer artefakte()/kaputt() gerufen hat, räumt danach das Arbeitsverzeichnis weg.
export function aufraeumen() {
  if (_arbeit) { fs.rmSync(_arbeit, { recursive: true, force: true }); _arbeit = null; }
}

// Die SHACL-Eingabe: bei einer JWS-Hülle die Nutzlast (Credential-JSON-LD), sonst die Datei selbst.
export function shaclEingabe(bytes) {
  const o = JSON.parse(Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, ''));
  return typeof o.payload === 'string' ? o.payload : JSON.stringify(o);
}

function befehlDa(befehl, args) {
  try { execFileSync(befehl, args, { stdio: 'ignore', timeout: 20000 }); return true; } catch (_) { return false; }
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
    const image = process.env.ITB_SHACL_DOCKER_IMAGE || '';
    const jar = process.env.ITB_SHACL_JAR || '';
    if (image) {
      if (!/@sha256:[0-9a-f]{64}$/.test(image)) return { ok: false, grund: 'ITB_SHACL_DOCKER_IMAGE ohne Digest-Pin (…@sha256:<64 hex>)' };
      if (!befehlDa('docker', ['version'])) return { ok: false, grund: 'Docker nicht gefunden' };
      return { ok: false, grund: 'Docker-Weg gewählt, Aufruf noch nicht am echten Werkzeug gemessen (U2-ADR-443)' };
    }
    if (jar) {
      if (!fs.existsSync(jar)) return { ok: false, grund: 'ITB_SHACL_JAR zeigt ins Leere: ' + jar };
      return { ok: false, grund: 'Eigenbau-Weg gewählt, Aufruf noch nicht am echten Werkzeug gemessen (U2-ADR-443)' };
    }
    return { ok: false, grund: 'ITB-SHACL-Validator nicht beschafft — weder ITB_SHACL_DOCKER_IMAGE noch ITB_SHACL_JAR gesetzt; Weg ist offen (Docker per Digest oder Eigenbau aus Tag 1.13.0)' };
  },

  // Bis der Aufruf am echten Werkzeug gemessen ist: kein Urteil, nie ein geratenes Grün.
  urteile(/* umgebung, dateiPfad, standardId */) {
    return { gelesen: false, gueltig: false, fehler: ['Aufruf des ITB-SHACL-Validators noch nicht gemessen — kein Urteil'] };
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
      faelle.push({ name: name + '·kern-rundweg', standard: 'edc-ap', pfad: pKern, erwartet: 'gueltig', herkunft: 'kern-rundweg', warum: b.warum + ' — was der Kern nach dem Verwahren herausgibt' });
      const pRoh = path.join(arbeit(), name + '.offizielles-beispiel.jsonld');
      fs.writeFileSync(pRoh, shaclEingabe(roh));
      faelle.push({ name: name + '·offizielles-beispiel', standard: 'edc-ap', pfad: pRoh, erwartet: 'gueltig', herkunft: 'offizielles-beispiel', warum: b.warum + ' — die EU-Datei selbst (Kontrolle der Shapes)' });
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
