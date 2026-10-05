#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   opencode-spiegel.js — der Spiegel nach openCoDE trägt das signierte Tag unverändert und legt das Release an (02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   WARUM. Beim Release v1.0.857 kam das Tag auf openCoDE flach an, ohne Signatur: `actions/checkout` legt bei einem Lauf
   für ein Tag dieses Tag als leichtgewichtiges an, und der Spiegel schob alle `v*` so weiter, wie sie im Checkout lagen.
   Das signierte Tag, das Release und die Pakete wurden danach von Hand mit einem eigenen Skript und einem persönlichen Token
   nach. Dieser Spiegel macht das selbst:
     1. die Tags werden vor dem Schieben vom Ursprung neu geholt (`fetch --force`), also annotiert und signiert;
     2. geschoben wird nur, was den Lauf ausgelöst hat: bei einem Tag genau dieses Tag, bei main nur main;
     3. vorher wird geprüft: das Tag ist annotiert, und ab v1.0.857 ist seine Signatur gut gegen die veröffentlichte
        Liste der Unterzeichnenden (https://vivodepot.de/.well-known/vivodepot-allowed-signers, SECURITY.md 2.1);
     4. danach legt er Pakete und Release an (tools/opencode-release-vorbereiten.js baut die Anhänge aus dem Tag-Stand)
        und liest jede Datei zurück. Besteht das Release schon, lädt er nichts neu hoch.
   Das Token kommt allein aus der Umgebung (`OPENCODE_TOKEN`, ein Secret des öffentlichen Repos). Es steht in keiner
   Datei und in keiner Ausgabe. Es muss ein Projekt-Token sein (Bot-Nutzer), kein persönliches; läuft es in weniger als
   14 Tagen ab, warnt jeder Lauf; ist es abgelaufen, bricht er ab. Der Job läuft in einem GitHub-Environment, das nur
   main und Tags v* zulässt: opencode-spiegel für main, opencode-spiegel-release für Tags, dort mit Pflichtfreigabe.

   Aufruf (im Workflow .github/workflows/mirror-to-opencode.yml):
     node tools/opencode-spiegel.js --plan                         Refspecs für diesen Lauf (aus GITHUB_REF_TYPE/_NAME)
     node tools/opencode-spiegel.js --pruefen <tag> --unterzeichnende <datei>
     node tools/opencode-spiegel.js --token-frist                  Projekt-Token? Warnung < 14 Tage, Abbruch wenn abgelaufen
     node tools/opencode-spiegel.js --release <tag> --quelle <ordner>
   Probe: tests/opencode-spiegel.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const R = require('./opencode-release-vorbereiten.js');

const HOST = 'https://gitlab.opencode.de';
const API = `${HOST}/api/v4/projects/${R.PROJEKT_ID}`;
const ERSTE_SIGNIERTE = 857;   // ab v1.0.857 sind die Tags SSH-signiert (SECURITY.md 2.1)
const WARN_TAGE = 14;
const FASSUNG = /^v1\.0\.(\d+)$/;

/* Rein: welche Refs dieser Lauf nach openCoDE schiebt. Nie mehr als das, was ihn ausgelöst hat. */
function spiegelPlan({ refTyp, refName, ereignis }) {
  if (refTyp === 'tag') {
    if (!FASSUNG.test(refName || '')) return { fehler: 'Tag ' + refName + ' ist kein Fassungs-Tag v1.0.<n>' };
    return { tag: refName, refspecs: ['refs/tags/' + refName + ':refs/tags/' + refName] };
  }
  if ((refTyp === 'branch' && refName === 'main') || ereignis === 'workflow_dispatch') {
    return { refspecs: ['refs/remotes/origin/main:refs/heads/main'] };
  }
  return { fehler: 'kein Spiegel für ' + refTyp + ' ' + refName };
}

/* Rein: ist das Tag annotiert, und ab der ersten signierten Fassung gut signiert? */
function tagPruefen(tag, { art, signaturGut }) {
  const m = FASSUNG.exec(tag || '');
  if (!m) return { ok: false, grund: tag + ' ist kein Fassungs-Tag' };
  if (art(tag) !== 'tag') return { ok: false, grund: tag + ' ist im Checkout leichtgewichtig — die Tags wurden nicht vom Ursprung geholt' };
  if (Number(m[1]) >= ERSTE_SIGNIERTE && !signaturGut(tag)) return { ok: false, grund: tag + ': keine gute Signatur gegen die veröffentlichten Unterzeichnenden' };
  return { ok: true };
}

/* Rein: wie lange gilt das Token noch? `expiresAt` ist 'YYYY-MM-DD' oder null (ohne Ablauf). */
function tokenFrist(expiresAt, heute = new Date()) {
  if (!expiresAt) return { tage: null, warnen: false, abgelaufen: false };
  const ende = Date.parse(expiresAt + 'T00:00:00Z');
  const tage = Math.floor((ende - Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), heute.getUTCDate())) / 86400000);
  return { tage, warnen: tage < WARN_TAGE, abgelaufen: tage <= 0 };
}

/* Rein: gehört das Token einem Projekt (Bot-Nutzer) und nicht einer Person? `nutzer` ist die Antwort von
   GET /users/:id (Feld `bot`, GitLab-Doku doc/api/users.md, „Retrieve a single user“). */
function tokenArt(nutzer) {
  if (!nutzer || typeof nutzer.bot !== 'boolean') return { ok: false, grund: 'openCoDE nennt nicht, ob das Token einem Bot-Nutzer gehört — ungemessen ist nicht grün' };
  if (!nutzer.bot) return { ok: false, grund: 'das Token gehört einer Person (' + nutzer.username + '), nicht dem Projekt — Projekt-Token anlegen und das Secret ersetzen (Klickweg)' };
  return { ok: true };
}

/* Pakete hochladen, Release anlegen, zurücklesen. `api(methode, pfad, {body, datei})` → { status, text }.
   Ein bestehendes Release wird nicht angefasst, nur nachgeprüft. */
async function veroeffentlichen({ tag, quelle, api, log = () => {} }) {
  const r = R.releaseVorbereiten({ quelle, fassung: tag });
  if (r.fehler.length) throw new Error(r.fehler.join('; '));
  const version = tag.slice(1);
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-opencode-release-'));
  try {
    R.releaseVorbereiten({ quelle, fassung: tag, ziel });
    const besteht = await api('GET', '/releases/' + encodeURIComponent(tag));
    if (besteht.status === 200) {
      log('Release ' + tag + ' besteht schon — nichts hochgeladen');
    } else {
      for (const d of r.dateien) {
        const a = await api('PUT', `/packages/generic/vivodepot/${version}/${d.name}`, { datei: path.join(ziel, d.name) });
        if (a.status !== 200 && a.status !== 201) throw new Error('Hochladen von ' + d.name + ': HTTP ' + a.status);
        log('hochgeladen: ' + d.name);
      }
      const a = await api('POST', '/releases', { body: fs.readFileSync(path.join(ziel, 'release.json'), 'utf8') });
      if (a.status !== 200 && a.status !== 201) throw new Error('Release anlegen: HTTP ' + a.status);
      log('Release ' + tag + ' angelegt');
    }
    const rel = await api('GET', '/releases/' + encodeURIComponent(tag));
    if (rel.status !== 200) throw new Error('Release nicht lesbar: HTTP ' + rel.status);
    const links = (JSON.parse(rel.text).assets || {}).links || [];
    if (links.length !== r.dateien.length) throw new Error('das Release hat ' + links.length + ' statt ' + r.dateien.length + ' Links');
    for (const d of r.dateien) {
      const z = await api('GET', `/packages/generic/vivodepot/${version}/${d.name}`, { binaer: true });
      const ist = z.status === 200 ? crypto.createHash('sha256').update(z.buffer).digest('hex') : null;
      if (ist !== d.sha256) throw new Error(d.name + ' auf openCoDE weicht ab (' + (ist || 'HTTP ' + z.status) + ')');
    }
    log('nachgeprüft: ' + r.dateien.length + ' Dateien byte-gleich, ' + links.length + ' Links');
    return { dateien: r.dateien.length };
  } finally {
    fs.rmSync(ziel, { recursive: true, force: true });
  }
}

function tokenApi(token) {
  return async (methode, pfad, { body, datei, binaer } = {}) => {
    const kopf = { 'PRIVATE-TOKEN': token };
    if (body) kopf['Content-Type'] = 'application/json';
    const antwort = await fetch(pfad.startsWith('http') ? pfad : API + pfad,
      { method: methode, headers: kopf, body: datei ? fs.readFileSync(datei) : body });
    if (binaer) return { status: antwort.status, buffer: Buffer.from(await antwort.arrayBuffer()) };
    return { status: antwort.status, text: await antwort.text() };
  };
}

function git(args) { return spawnSync('git', args, { encoding: 'utf8' }); }

async function main(argv) {
  const wert = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--plan')) {
    const p = spiegelPlan({ refTyp: process.env.GITHUB_REF_TYPE, refName: process.env.GITHUB_REF_NAME, ereignis: process.env.GITHUB_EVENT_NAME });
    if (p.fehler) { console.error('[spiegel] ' + p.fehler); return 1; }
    console.log(p.refspecs.join('\n'));
    return 0;
  }
  if (wert('--pruefen')) {
    const tag = wert('--pruefen');
    const liste = wert('--unterzeichnende');
    const r = tagPruefen(tag, {
      art: (t) => git(['cat-file', '-t', 'refs/tags/' + t]).stdout.trim(),
      signaturGut: (t) => !!liste && git(['-c', 'gpg.ssh.allowedSignersFile=' + path.resolve(liste), 'tag', '-v', t]).status === 0,
    });
    if (!r.ok) { console.error('[spiegel] ABBRUCH: ' + r.grund); return 1; }
    console.log('[spiegel] ' + tag + ': annotiert' + (Number(FASSUNG.exec(tag)[1]) >= ERSTE_SIGNIERTE ? ', gut signiert' : '') + '.');
    return 0;
  }
  const token = process.env.OPENCODE_TOKEN;
  if (!token) { console.error('[spiegel] OPENCODE_TOKEN fehlt (Secret des öffentlichen Repos).'); return 1; }
  const api = tokenApi(token);
  if (argv.includes('--token-frist')) {
    const s = await api('GET', `${HOST}/api/v4/personal_access_tokens/self`);
    if (s.status !== 200) { console.error('[spiegel] das Token wird abgelehnt (HTTP ' + s.status + ').'); return 1; }
    const selbst = JSON.parse(s.text);
    const n = await api('GET', `${HOST}/api/v4/users/${selbst.user_id}`);
    const art = tokenArt(n.status === 200 ? JSON.parse(n.text) : null);
    if (!art.ok) { console.error('[spiegel] ABBRUCH: ' + art.grund + '.'); return 1; }
    const f = tokenFrist(selbst.expires_at);
    if (f.abgelaufen) { console.error('[spiegel] ABBRUCH: das Token ist abgelaufen.'); return 1; }
    if (f.warnen) console.log('::warning::Das openCoDE-Token läuft in ' + f.tage + ' Tagen ab — neues Projekt-Token anlegen und das Secret OPENCODE_TOKEN ersetzen.');
    else console.log('[spiegel] Token gilt noch ' + (f.tage === null ? 'ohne Ablauf' : f.tage + ' Tage') + '.');
    return 0;
  }
  if (wert('--release')) {
    await veroeffentlichen({ tag: wert('--release'), quelle: path.resolve(wert('--quelle') || '.'), api, log: (z) => console.log('[spiegel] ' + z) });
    return 0;
  }
  console.error('[spiegel] unbekannter Aufruf — s. Kopf der Datei.');
  return 1;
}

if (require.main === module) main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error('[spiegel] ABBRUCH: ' + e.message); process.exitCode = 1; });
module.exports = { spiegelPlan, tagPruefen, tokenFrist, tokenArt, veroeffentlichen, ERSTE_SIGNIERTE, WARN_TAGE };
