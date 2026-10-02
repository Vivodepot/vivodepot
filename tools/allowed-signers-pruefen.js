#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   allowed-signers-pruefen.js — `.github/allowed_signers` enthält nur öffentliche Schlüssel (30.09.2026)
   ─────────────────────────────────────────────────────────────────
   Die Datei nennt den öffentlichen Schlüssel, gegen den `git tag -v` die Release-Tags prüft
   (tools/oeffentlich-tag-signieren.js). Sie geht mit dem öffentlichen Zuschnitt hinaus. Diese Prüfung
   hält fest, dass darin nie etwas anderes steht:
     1  kein Hinweis auf privates Schlüsselmaterial („PRIVATE KEY“, „BEGIN OPENSSH“) — sonst sofort rot
     2  jede Zeile hat die Form „Prinzipal [Optionen] Schlüsseltyp Base64 [Kommentar]“
     3  der Schlüsseltyp ist ein öffentlicher SSH-Typ (Liste OEFFENTLICHE_TYPEN)
     4  das Base64 ist gültig und trägt im SSH-Leitungsformat denselben Typ (RFC 4253, 6.6)
     5  mit --prinzipal: mindestens eine Zeile nennt genau diesen Prinzipal (die Tagger-Adresse)
   Meldungen nennen nur Zeilennummern, NIE den Inhalt einer Zeile.

   Aufruf:
     node tools/allowed-signers-pruefen.js [--datei <pfad>] [--prinzipal <adresse>]
   Ohne --datei: .github/allowed_signers im Repo.
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const OEFFENTLICHE_TYPEN = new Set([
  'ssh-ed25519', 'ssh-rsa',
  'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521',
  'sk-ssh-ed25519@openssh.com', 'sk-ecdsa-sha2-nistp256@openssh.com',
]);
const PRIVAT = /PRIVATE KEY|BEGIN OPENSSH/i;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// REIN: welcher Typ steht im SSH-Leitungsformat vorn? (uint32 Länge, dann der Name)
function leitungsTyp(b64) {
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < 4) return null;
  const n = buf.readUInt32BE(0);
  if (n <= 0 || n > 64 || buf.length < 4 + n) return null;
  return buf.subarray(4, 4 + n).toString('latin1');
}

// REIN: Befunde zu einem Dateiinhalt, je mit Zeilennummer, ohne Inhalt
function pruefen(text, { prinzipal } = {}) {
  const befunde = [];
  const t = String(text || '');
  if (PRIVAT.test(t)) return ['die Datei enthält einen Hinweis auf privates Schlüsselmaterial — abgebrochen, Inhalt wird nicht wiedergegeben'];
  const prinzipale = new Set();
  let zeilen = 0;
  t.split('\n').forEach((roh, i) => {
    const z = roh.trim();
    const nr = i + 1;
    if (!z || z.startsWith('#')) return;
    zeilen += 1;
    const teile = z.split(/\s+/);
    const iTyp = teile.findIndex((w, j) => j >= 1 && OEFFENTLICHE_TYPEN.has(w));
    if (iTyp < 1) { befunde.push('Zeile ' + nr + ': kein öffentlicher Schlüsseltyp an der Stelle nach Prinzipal und Optionen'); return; }
    const b64 = teile[iTyp + 1];
    if (!b64 || !BASE64.test(b64)) { befunde.push('Zeile ' + nr + ': nach dem Schlüsseltyp steht kein gültiges Base64'); return; }
    if (leitungsTyp(b64) !== teile[iTyp]) { befunde.push('Zeile ' + nr + ': das Base64 trägt nicht den genannten Schlüsseltyp'); return; }
    for (const p of teile[0].split(',')) prinzipale.add(p.replace(/^"|"$/g, ''));
  });
  if (!zeilen) befunde.push('die Datei enthält keine Schlüsselzeile');
  if (prinzipal && zeilen && !prinzipale.has(prinzipal)) befunde.push('keine Zeile nennt den Prinzipal ' + prinzipal + ' (die Tagger-Adresse)');
  return befunde;
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  const datei = path.resolve(arg('datei') || path.join(__dirname, '..', '.github', 'allowed_signers'));
  if (!fs.existsSync(datei)) { process.stdout.write('[allowed-signers] ROT — Datei fehlt: ' + datei + '\n'); return 1; }
  const befunde = pruefen(fs.readFileSync(datei, 'utf8'), { prinzipal: arg('prinzipal') });
  if (befunde.length) { process.stdout.write('[allowed-signers] ROT\n  ' + befunde.join('\n  ') + '\n'); return 1; }
  process.stdout.write('[allowed-signers] grün — nur öffentliche Schlüssel, Format gültig\n');
  return 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { pruefen, leitungsTyp, OEFFENTLICHE_TYPEN };
