/* ═════════════════════════════════════════════════════════════════════════
   sd-jwt-jose.mjs — Adapter: die sd-jwt-vc-*-Exporte (selbst signiertes SD-JWT, U2-ADR-457) gegen eine unabhängige
   Bibliothek
   ─────────────────────────────────────────────────────────────────────────
   Einen offiziellen Offline-Prüfer für SD-JWT VC gibt es nicht (Recherche P4a, 27.09.2026). Geurteilt wird darum mit
   `jose` (panva/jose, MIT), einer verbreiteten, vom Kern unabhängigen JOSE-Bibliothek, gepinnt nach Version und SHA-256
   des npm-Pakets (tools/standards-artefakte.json, id jose-6.2.12), außerhalb des Repos im Cache.

   Was das Urteil heißt (Abnahme der Befund-Ratsche SDJWTVC-OHNE-PRUEFER):
     gueltig = die Signatur ist nach jose gültig gegen den jwk im eigenen Kopf (alg Ed25519, RFC 9864), typ dc+sd-jwt,
               jede Offenlegung steht als SHA-256-Digest im _sd (RFC 9901 §4.2.3), vct gesetzt, cnf.jwk = Kopf-jwk.
     NICHT geurteilt wird das Vertrauen in den Aussteller: es ist für eine Selbst-Signatur nicht gegeben (weder https-iss
     noch x5c, draft-ietf-oauth-sd-jwt-vc-19 „Issuer-signed JWT Verification Key Validation“). Das steht als erwarteter
     Hinweis im Urteil, nicht als Fehler.

   jose arbeitet asynchron, der Prüfrahmen ruft synchron: urteileAlle fährt EINEN Node-Kindprozess für alle Dateien.
   ═════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { artefaktPfad } from './_umgebung.mjs';

const require = createRequire(import.meta.url);
const HIER = path.dirname(fileURLToPath(import.meta.url));

export const WERKZEUG = Object.freeze({ id: 'jose-6.2.12', version: '6.2.12', herkunft: 'npm-Paket, gepinnt nach SHA-256' });
export const AUSSTELLER_VERTRAUEN = 'nicht gegeben (selbst ausgestellt, weder https-iss noch x5c) — erwartet';

let _arbeit = null;
function arbeit() { return _arbeit || (_arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-sd-jwt-jose-'))); }
export function aufraeumen() { if (_arbeit) { fs.rmSync(_arbeit, { recursive: true, force: true }); _arbeit = null; } }

// Der Paketordner von jose: VD_JOSE_PFAD (ein `npm i jose@6.2.12`) oder der Cache aus dem Manifest (entpackt: package/).
function josePaket() {
  const kandidaten = [process.env.VD_JOSE_PFAD, artefaktPfad(WERKZEUG.id)].filter(Boolean);
  for (const k of kandidaten) {
    for (const p of [path.join(k, 'node_modules', 'jose'), path.join(k, 'package'), k]) {
      try {
        const pj = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8'));
        if (pj.name === 'jose') return { pfad: p, version: pj.version };
      } catch (_) { /* nächster Kandidat */ }
    }
  }
  return null;
}

// Das Prüfskript für den Kindprozess: liest { jose, dateien } von stdin, schreibt je Datei ein Urteil als JSON.
const PRUEFSKRIPT = `
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const eingabe = JSON.parse(fs.readFileSync(0, 'utf8'));
const jose = await import(pathToFileURL(path.join(eingabe.jose, 'dist', 'webapi', 'index.js')).href);
const raus = {};
for (const datei of eingabe.dateien) {
  const fehler = [];
  try {
    const text = fs.readFileSync(datei, 'utf8').trim();
    const teile = text.split('~');
    const jwt = teile[0];
    const kopf = jose.decodeProtectedHeader(jwt);
    if (kopf.typ !== 'dc+sd-jwt') fehler.push('typ ist ' + kopf.typ + ', nicht dc+sd-jwt');
    if (kopf.alg !== 'Ed25519') fehler.push('alg ist ' + kopf.alg + ', nicht Ed25519');
    if (!kopf.jwk) throw new Error('kein jwk im Kopf');
    const r = await jose.compactVerify(jwt, await jose.importJWK(kopf.jwk, 'Ed25519'), { algorithms: ['Ed25519'] });
    const n = JSON.parse(new TextDecoder().decode(r.payload));
    if (typeof n.vct !== 'string' || !n.vct) fehler.push('vct fehlt');
    if (!n.cnf || JSON.stringify(n.cnf.jwk) !== JSON.stringify(kopf.jwk)) fehler.push('cnf.jwk ist nicht der Schlüssel im Kopf');
    if (n._sd_alg !== 'sha-256') fehler.push('_sd_alg ist ' + n._sd_alg);
    const sd = new Set(n._sd || []);
    for (const d of teile.slice(1).filter(Boolean)) {
      const h = crypto.createHash('sha256').update(d, 'ascii').digest('base64url');
      if (!sd.has(h)) fehler.push('Offenlegung ohne Digest im _sd: ' + d.slice(0, 16) + '…');
    }
  } catch (e) { fehler.push('jose: ' + (e.code || '') + ' ' + e.message); }
  raus[datei] = { gelesen: true, gueltig: fehler.length === 0, fehler };
}
process.stdout.write(JSON.stringify(raus));
`;

export default {
  id: 'sd-jwt-jose',
  familie: 'signatur',
  autoritaet: 'panva/jose (MIT), unabhängige JOSE-Bibliothek — kein offizieller SD-JWT-VC-Prüfer verfügbar (Recherche P4a)',
  prueft: 'die sd-jwt-vc-*-Exporte: Ed25519-Signatur gegen den jwk im Kopf, typ, vct, cnf, jede Offenlegung im _sd (RFC 9901); Aussteller-Vertrauen bewusst nicht',
  werkzeugVersion: WERKZEUG.version,
  werkzeug: WERKZEUG.id,
  standards: ['sd-jwt-vc'],

  vorhanden() {
    if (process.env.VD_JOSE_AUS) return { ok: false, grund: 'jose abgeschaltet (VD_JOSE_AUS)' };
    const p = josePaket();
    if (!p) return { ok: false, grund: 'jose nicht beschafft: VD_JOSE_PFAD setzen oder ' + WERKZEUG.id + ' in den Standards-Cache legen' };
    if (p.version !== WERKZEUG.version) return { ok: false, grund: 'jose ' + p.version + ' statt gepinnt ' + WERKZEUG.version };
    return { ok: true, jose: p.pfad };
  },

  urteileAlle(umgebung, pfade) {
    const leer = (grund) => new Map(pfade.map((p) => [p, { gelesen: false, gueltig: false, fehler: [grund] }]));
    if (!umgebung || !umgebung.ok) return leer('jose nicht beschafft — kein Urteil');
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', PRUEFSKRIPT],
      { input: JSON.stringify({ jose: umgebung.jose, dateien: pfade }), encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) return leer('Prüfprozess: ' + String(r.stderr || r.error).slice(0, 300));
    const je = JSON.parse(r.stdout);
    return new Map(pfade.map((p) => [p, je[p]]));
  },
  urteile(umgebung, dateiPfad) { return this.urteileAlle(umgebung, [dateiPfad]).get(dateiPfad); },

  // Die drei Exporte, wie der Kern sie aus dem Referenzdepot herausgibt (dieselben Bytes wie der Download).
  async artefakte() {
    const M = require(path.join(HIER, '..', '..', '..', 'tools', 'rundlauf-matrix.js'));
    const V = await M.depotMitReferenz();
    const faelle = [];
    for (const id of ['sd-jwt-vc-identitaet', 'sd-jwt-vc-finanzen', 'sd-jwt-vc-sozialversicherung']) {
      const inhalt = await V.formatExportInhalt(V.EXPORT_FORMAT_BY_ID[id], { sensibel: true });
      const p = path.join(arbeit(), id + '.sd-jwt');
      fs.writeFileSync(p, inhalt);
      faelle.push({ name: id, standard: 'sd-jwt-vc', pfad: p, erwartet: 'gueltig', herkunft: 'generator',
        warum: 'selbst signierter Export des Kerns; Aussteller-Vertrauen ' + AUSSTELLER_VERTRAUEN });
    }
    return faelle;
  },

  // Eine Offenlegung nachträglich verändert: ihr Digest steht nicht im signierten _sd.
  async kaputt() {
    const [fall] = await this.artefakte();
    const teile = fs.readFileSync(fall.pfad, 'utf8').split('~');
    teile[1] = Buffer.from(JSON.stringify(['salz', 'given_name', 'Mallory'])).toString('base64url');
    const p = path.join(arbeit(), 'veraenderte-offenlegung.sd-jwt');
    fs.writeFileSync(p, teile.join('~'));
    return [{ standard: 'sd-jwt-vc', pfad: p, warum: 'eine Offenlegung ohne Digest im signierten _sd (RFC 9901 §4.2.3)' }];
  },
};
