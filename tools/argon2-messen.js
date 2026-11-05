#!/usr/bin/env node
'use strict';
require('./lib/schalter-pruefen.js').schalterPruefen(module);   // --help und unbekannte Schalter halten an, bevor etwas läuft
/* ════════════════════════════════════════════════════════════════════════════
   argon2-messen.js — Argon2 mit dem eingebauten crypto.argon2Sync von Node: richtig rechnen, Kosten messen (25.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: U2-ADR-213 bleibt bei PBKDF2 und stellt Argon2id zurück. Der ADR stützt sich auf eigene Messungen; dieses Werkzeug
   macht den Teil davon wiederholbar, der ohne fremde Bibliothek geht. Es nutzt nur Node (`crypto.argon2Sync`, OpenSSL) — keine
   Abhängigkeit in package.json, kein Ladeweg an der Lieferkettenprüfung vorbei. Ob Browser Argon2id selbst anbieten und wie sich
   Bibliotheken für den Browser verhalten, misst es NICHT; das ist eine eigene, noch offene Frage.

   TEIL 1 (ohne Schalter): crypto.argon2Sync gegen die Testvektoren aus RFC 9106 §5 (Argon2d, Argon2i, Argon2id, je mit Secret
   und Associated Data). Schnell, ohne Platz; die Suite fährt es über tests/argon2-messen.test.js.
   TEIL 2 (--messen): Laufzeit je Profil auf dieser Maschine, Median aus --laeufe Läufen nach einem Aufwärmlauf, dazu der
   Zuwachs des residenten Speichers und die Last beim Start. Profile aus U2-ADR-213: OWASP-Minimum (19 MiB, t=2, p=1) und die
   zweite Empfehlung aus RFC 9106 (64 MiB, t=3, p=4). Teil 2 verlangt einen Klein-Platz des Platzverwalters im Repo (erkennbar
   an VD_KLEIN_GEHALTEN oder VD_SUITE_PLATZ_GEHALTEN) und eine ruhige Maschine; ohne Platz hält er an.

   Aufruf:
     node tools/argon2-messen.js                                 Teil 1 gegen tests/fixtures/rfc9106-testvektoren.json
     node tools/argon2-messen.js --vektoren <pfad>               Teil 1 gegen eine andere Vektordatei
     node tools/argon2-messen.js --messen [--laeufe <n>] [--ziel <datei.json>]   nur in einem Klein-Platz
   Exit 0: alle Vektoren getroffen (und bei --messen gemessen). Exit 1: ein Vektor verfehlt. Exit 2: --messen ohne Platz.
   Probe: tests/argon2-messen.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const STANDARD_VEKTOREN = path.join(__dirname, '..', 'tests', 'fixtures', 'rfc9106-testvektoren.json');
const PROFILE = [
  { name: 'OWASP-Minimum', speicherKiB: 19 * 1024, durchlaeufe: 2, parallelitaet: 1 },
  { name: 'RFC 9106 zweite Empfehlung', speicherKiB: 64 * 1024, durchlaeufe: 3, parallelitaet: 4 },
];

const bytes = (e) => Buffer.alloc(e.laenge, e.byte);

/* Die RFC-Fälle: { name, variante, passwort, salt, secret, ad, speicherKiB, durchlaeufe, parallelitaet, tagLaenge, erwartet } */
function rfcFaelle(datei = STANDARD_VEKTOREN) {
  const d = JSON.parse(fs.readFileSync(datei, 'utf8'));
  const e = d.eingaben, p = d.parameter;
  return d.vektoren.map((v) => ({
    name: 'RFC 9106 §' + v.abschnitt + ' ' + v.variante, variante: v.variante,
    passwort: bytes(e.passwort), salt: bytes(e.salt), secret: bytes(e.secret), ad: bytes(e.associatedData),
    speicherKiB: p.speicherKiB, durchlaeufe: p.durchlaeufe, parallelitaet: p.parallelitaet, tagLaenge: p.tagLaenge,
    erwartet: v.tag,
  }));
}

function rechnen(f, argon2 = crypto.argon2Sync) {
  const o = { message: f.passwort, nonce: f.salt, parallelism: f.parallelitaet, tagLength: f.tagLaenge, memory: f.speicherKiB, passes: f.durchlaeufe };
  if (f.secret) o.secret = f.secret;
  if (f.ad) o.associatedData = f.ad;
  return argon2(f.variante, o).toString('hex');
}

/* Teil 1. `argon2` ist austauschbar, damit die Probe eine falsch rechnende Funktion einsetzen kann. */
function vektorenPruefen({ vektorDatei = STANDARD_VEKTOREN, argon2 = crypto.argon2Sync } = {}) {
  if (typeof argon2 !== 'function') return { ok: false, faelle: [], fehlt: 'crypto.argon2Sync fehlt in dieser Node-Fassung (' + process.version + ')' };
  const faelle = rfcFaelle(vektorDatei).map((f) => {
    const tag = rechnen(f, argon2);
    return { name: f.name, getroffen: tag === f.erwartet, tag, erwartet: f.erwartet };
  });
  return { ok: faelle.length > 0 && faelle.every((f) => f.getroffen), faelle, fehlt: null };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* Teil 2. `profile` und `jetzt` sind austauschbar (Probe mit winzigem Profil). */
function messen({ profile = PROFILE, laeufe = 5, argon2 = crypto.argon2Sync, jetzt = () => performance.now() } = {}) {
  const ergebnis = { node: process.version, openssl: process.versions.openssl, plattform: process.platform + ' ' + os.arch(),
    cpu: (os.cpus()[0] || {}).model || null, kerne: os.cpus().length, lastBeimStart: os.loadavg()[0], laeufe, profile: [] };
  for (const p of profile) {
    const f = { variante: 'argon2id', passwort: Buffer.from('Korrekt Pferd Batterie Heftklammer'), salt: Buffer.from('0123456789abcdef'),
      speicherKiB: p.speicherKiB, durchlaeufe: p.durchlaeufe, parallelitaet: p.parallelitaet, tagLaenge: 32 };
    rechnen(f, argon2);   // Aufwärmlauf
    const rssVor = process.memoryUsage().rss;
    const zeiten = [];
    for (let i = 0; i < laeufe; i++) { const t0 = jetzt(); rechnen(f, argon2); zeiten.push(jetzt() - t0); }
    ergebnis.profile.push({ name: p.name, speicherKiB: p.speicherKiB, durchlaeufe: p.durchlaeufe, parallelitaet: p.parallelitaet,
      medianMs: Math.round(median(zeiten) * 10) / 10, minMs: Math.round(Math.min(...zeiten) * 10) / 10,
      maxMs: Math.round(Math.max(...zeiten) * 10) / 10, rssZuwachsMiB: Math.round((process.memoryUsage().rss - rssVor) / 1048576) });
  }
  return ergebnis;
}

function imPlatz(env = process.env) { return !!(env.VD_KLEIN_GEHALTEN || env.VD_SUITE_PLATZ_GEHALTEN); }

function main(argv = process.argv.slice(2), { schreiben = (t) => process.stdout.write(t), fehler = (t) => process.stderr.write(t), env = process.env } = {}) {
  const wert = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const v = vektorenPruefen({ vektorDatei: wert('--vektoren') ? path.resolve(wert('--vektoren')) : STANDARD_VEKTOREN });
  if (v.fehlt) { fehler('[argon2-messen] ' + v.fehlt + '\n'); return 1; }
  for (const f of v.faelle) schreiben((f.getroffen ? '  getroffen  ' : '  VERFEHLT   ') + f.name + (f.getroffen ? '' : ' — ' + f.tag + ' statt ' + f.erwartet) + '\n');
  if (!v.ok) { fehler('[argon2-messen] crypto.argon2Sync verfehlt einen RFC-9106-Vektor — nichts weiter gemessen.\n'); return 1; }
  schreiben('[argon2-messen] crypto.argon2Sync trifft alle RFC-9106-Vektoren.\n');
  if (!argv.includes('--messen')) return 0;
  if (!imPlatz(env)) {
    fehler('[argon2-messen] ABBRUCH: --messen braucht einen Klein-Platz (VD_KLEIN_GEHALTEN fehlt). Den Befehl im Klein-Platz des\n'
      + '  Platzverwalters starten: … -- node tools/argon2-messen.js --messen\n');
    return 2;
  }
  const laeufe = Number.parseInt(wert('--laeufe') || '5', 10);
  const e = messen({ laeufe: Number.isInteger(laeufe) && laeufe > 0 ? laeufe : 5 });
  for (const p of e.profile) schreiben('  ' + p.name.padEnd(28) + ' Median ' + p.medianMs + ' ms (' + p.minMs + '–' + p.maxMs + '), RSS +' + p.rssZuwachsMiB + ' MiB\n');
  schreiben('[argon2-messen] Last beim Start ' + e.lastBeimStart.toFixed(1) + ' bei ' + e.kerne + ' Kernen — unter Last sind die Zeiten nicht aussagekräftig.\n');
  if (wert('--ziel')) fs.writeFileSync(path.resolve(wert('--ziel')), JSON.stringify(e, null, 1) + '\n');
  return 0;
}

module.exports = { STANDARD_VEKTOREN, PROFILE, rfcFaelle, rechnen, vektorenPruefen, messen, imPlatz, main };

if (require.main === module) process.exitCode = main();
