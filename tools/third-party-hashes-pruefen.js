#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   third-party-hashes-pruefen.js — jede SHA-256 in THIRD_PARTY_LICENSES gegen ihren Gegenstand (03.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: Die SHA-256 der PDF-Inter in Eintrag 5 standen nach dem Neuschnitt vom 23.09.2026 zehn Tage veraltet; die des
   jsPDF-Blocks in Eintrag 1 seit dem Juni. sbom-pflegen prüft nur die SBOM, nicht diese Datei. Dieses Werkzeug rechnet jede
   64-stellige Prüfsumme der Datei nach — über ihren Kontext:
     · „SHA-256 (inline-Block): H“ in einem Eintrag mit @vd-lib-Namen → der Skriptblock nach dem Marker im Kern (dieselbe
       Rechnung wie sbom-pflegen: Inhalt zwischen <script…> und </script>),
     · eine Tabellenzeile „<Bezeichnung> <Datei> H“ unter einer Zeile, die ein Verzeichnis „(tools/…/)“ nennt → diese Datei,
     · eine Tabellenzeile unter „git show <ref>:<pfad>, die vier @font-face-Blöcke“ → die Blöcke dieser Fassung, in Reihenfolge,
     · steht die Git-Historie nicht zur Verfügung (öffentlicher Zuschnitt ohne die Historie des Arbeits-Repos), zählen die
       Zeilen der Git-Fassung als OHNE HISTORIE — genannt, nicht geprüft, nie still übergangen,
     · im Eintrag noble-ed25519 (eingebettet zwischen zwei Markierungen, eine Zeile geändert): „Eingebettet: SHA-256 H“ → der Text
       der Bibliothek zwischen den Markierungen im Kern; die vorangehende „SHA-256 H“ des Upstream-Builds → derselbe Text mit der
       einen Zeile zurückgetauscht (dieselbe Rechnung wie tests/halter-schluessel-noble.test.js),
     · „sha256 der Rohdatei: H“ → EXTERN: die Rohdatei liegt nicht im Repo; das Werkzeug zählt sie und nennt sie, prüft sie aber
       nicht (es lädt nichts herunter). Jede andere Fundstelle ist ein Fehler — keine Prüfsumme bleibt unzugeordnet.
   Aufruf: node tools/third-party-hashes-pruefen.js [--datei <THIRD_PARTY_LICENSES>] [--kern <vivodepot.html>] → Exit 1 bei Abweichung
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const LIB_JE_EINTRAG = Object.freeze({ 'jsPDF': 'jspdf', 'qrcode-generator': 'qrcode-generator' });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

function inlineBlock(kern, name) {
  const m = kern.indexOf('@vd-lib name="' + name + '"');
  if (m < 0) return null;
  const e = kern.indexOf('-->', m), s = kern.indexOf('<script', e), t = kern.indexOf('>', s) + 1;
  return kern.slice(t, kern.indexOf('</script>', t));
}

/* noble-ed25519: nur der Text der Bibliothek zwischen den Markierungen (U2-ADR-457 Nachtrag v865) und genau die eine geänderte Zeile. */
const NOBLE = Object.freeze({
  anfang: '// noble-ed25519 fa14496 — Anfang der eingebetteten Bibliothek\n',
  ende: '// noble-ed25519 fa14496 — Ende der eingebetteten Bibliothek\n',
  zeileEingebettet: 'const nodeCrypto = undefined;\n',
  zeileUpstream: "import nodeCrypto from 'crypto';\n",
});
function nobleBibliothek(kern) {
  const block = inlineBlock(kern, 'noble-ed25519');
  if (!block) return null;
  const a = block.indexOf(NOBLE.anfang), e = block.indexOf(NOBLE.ende);
  return a >= 0 && e > a ? block.slice(a + NOBLE.anfang.length, e) : null;
}

function pruefen({ text, kern, repo = REPO, gitShow }) {
  const zeilen = text.split('\n');
  const befunde = [], extern = [], geprueft = [], ohneHistorie = [];
  const gitCache = {};
  let eintrag = null, verzeichnis = null, gitQuelle = null, gitIndex = 0;
  zeilen.forEach((z, i) => {
    const kopf = /^(\d+)\) (\S+)/.exec(z);
    if (kopf) { eintrag = kopf[2].replace(/,$/, ''); verzeichnis = null; gitQuelle = null; gitIndex = 0; }
    if (/^[A-ZÄÖÜ][A-ZÄÖÜ -]{3,}/.test(z)) { eintrag = null; verzeichnis = null; gitQuelle = null; }
    const dir = /\((tools\/[^)\s]+\/)\)/.exec(z);
    if (dir) verzeichnis = dir[1];
    const g = /git show ([0-9a-f]+\^?):(\S+), die vier @font-face-Blöcke/.exec(z);
    if (g) { gitQuelle = g[1] + ':' + g[2]; gitIndex = 0; verzeichnis = null; }
    const h = /\b([0-9a-f]{64})\b/.exec(z);
    if (!h) return;
    const ort = 'THIRD_PARTY_LICENSES:' + (i + 1);
    if (/sha256 der Rohdatei:/.test(z)) { extern.push(ort); return; }
    let ist = null, was = null;
    if (eintrag === 'noble-ed25519' && /SHA-256 [0-9a-f]{64}/.test(z)) {
      const bib = nobleBibliothek(kern);
      if (bib === null) { befunde.push(ort + ': eingebettete noble-ed25519 im Kern nicht gefunden'); return; }
      if (/Eingebettet:\s*$/.test(zeilen[i - 1] || '') || /Eingebettet:\s*SHA-256/.test(z)) {
        ist = sha(Buffer.from(bib, 'utf8')); was = 'noble-ed25519, eingebettet';
      } else {
        ist = sha(Buffer.from(bib.replace(NOBLE.zeileEingebettet, NOBLE.zeileUpstream), 'utf8')); was = 'noble-ed25519, Upstream-Build';
      }
    } else if (/SHA-256 \(inline-Block\):/.test(z)) {
      const name = LIB_JE_EINTRAG[eintrag];
      const block = name && inlineBlock(kern, name);
      if (block === null || block === undefined) { befunde.push(ort + ': inline-Block zu „' + eintrag + '“ nicht gefunden'); return; }
      ist = sha(Buffer.from(block, 'utf8')); was = 'Skriptblock @vd-lib ' + name;
    } else if (verzeichnis) {
      const datei = /^\s+\S+\s+(\S+)\s+[0-9a-f]{64}\s*$/.exec(z);
      if (!datei) { befunde.push(ort + ': Tabellenzeile nicht lesbar'); return; }
      const p = path.join(repo, verzeichnis, datei[1]);
      if (!fs.existsSync(p)) { befunde.push(ort + ': Datei fehlt: ' + path.relative(repo, p)); return; }
      ist = sha(fs.readFileSync(p)); was = path.relative(repo, p);
    } else if (gitQuelle) {
      if (!(gitQuelle in gitCache)) { try { gitCache[gitQuelle] = gitShow(gitQuelle); } catch (_) { gitCache[gitQuelle] = null; } }
      if (gitCache[gitQuelle] === null) { ohneHistorie.push(ort); gitIndex++; return; }
      const blobs = [...gitCache[gitQuelle].matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)"/g)].map((m) => m[1]);
      const b = blobs[gitIndex++];
      if (!b) { befunde.push(ort + ': in ' + gitQuelle + ' kein ' + gitIndex + '. @font-face-Block'); return; }
      ist = sha(Buffer.from(b, 'base64')); was = gitQuelle + ' Block ' + gitIndex;
    } else { befunde.push(ort + ': Prüfsumme ohne zuordenbaren Gegenstand'); return; }
    if (ist !== h[1]) befunde.push(ort + ': steht ' + h[1].slice(0, 12) + '…, ' + was + ' hat ' + ist.slice(0, 12) + '…');
    else geprueft.push(ort);
  });
  return { befunde, extern, geprueft, ohneHistorie };
}

function gitShowAusRepo(ref) {
  return execFileSync('git', ['show', ref], { cwd: REPO, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
  const r = pruefen({
    text: fs.readFileSync(arg('datei', path.join(REPO, 'THIRD_PARTY_LICENSES')), 'utf8'),
    kern: fs.readFileSync(arg('kern', path.join(REPO, 'vivodepot.html')), 'utf8'),
    gitShow: gitShowAusRepo,
  });
  console.log('[third-party-hashes] geprüft ' + r.geprueft.length + ', extern (nicht im Repo, nicht geprüft) ' + r.extern.length
    + (r.ohneHistorie.length ? ', ohne Git-Historie (nicht geprüft) ' + r.ohneHistorie.length : '') + ', Abweichungen ' + r.befunde.length);
  r.befunde.forEach((b) => console.log('  ✗ ' + b));
  process.exit(r.befunde.length ? 1 : 0);
}
module.exports = { pruefen, gitShowAusRepo, inlineBlock };
