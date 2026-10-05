'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-213: die Quellenangaben stimmen mit den Primärquellen (05.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund: U2-ADR-213 nannte Argon2id-Parameter als „RFC-9106-typisch“, die RFC 9106
   so nicht empfiehlt (p=1 statt p=4), ein falsches Datum des WICG-Entwurfs,
   Bibliotheksgrößen und Pflegestände ohne Fassung, Durchsatzwerte und eine
   Studienangabe ohne auffindbare Primärquelle und Aussagen über ein Fehlen ohne
   beschriebene Suche. Berichtigt nach einer unabhängigen Prüfung.
   Diese Probe hält den berichtigten Stand: die gestrichenen Angaben kommen nicht
   zurück, die belegten stehen so da, wie die Primärquelle sie nennt.
   ROT-BEWEIS: die Fassung vor der Berichtigung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ORDNER = path.join(__dirname, '..', 'docs', 'adr');
const DATEI = fs.readdirSync(ORDNER).find((n) => /^vivodepot-U2-ADR-213-/.test(n));

// Ohne auffindbare Primärquelle oder Suchweg — gestrichen, darf nicht zurückkommen.
const GESTRICHEN = [/14\.057/, /1\.703/, /\(Specops-Studie/, /40\.000/, /NIST CAVP \(/, /397 KB/, /mindestens 17 Testdateien/,
  /64 MiB\/t=3\/p=1/, /11\.08\.2026/, /8,6 KB/];
// Wie die Primärquelle es nennt (RFC 9106 §4, WICG-Entwurf, README und GitHub der Bibliotheken).
const BELEGT = [/t=3, p=4 und 64 MiB \(§4\)/, /Stand 14\.09\.2026/, /not a W3C Standard nor is it on the W3C Standards Track/,
  /v4\.12\.0 vom 19\.11\.2024/, /< 7 KB minifiziert und gzip/, /laut Datei LICENSE MIT/, /13\.11\.2021/, /PBKDF2-HMAC-SHA-256,\s+die Vivodepot nutzt/, /14 kB\s+JavaScript und 25 kB WASM/, /03\.08\.2023/, /24\.03\.2023/];

function abweichungen(text) {
  return GESTRICHEN.filter((m) => m.test(text)).map((m) => 'gestrichen, steht aber da: ' + m)
    .concat(BELEGT.filter((m) => !m.test(text)).map((m) => 'belegt, fehlt aber: ' + m));
}

test('[U2-ADR-213·Quellen] gestrichene Angaben fehlen, belegte stehen wie in der Primärquelle', () => {
  assert.ok(DATEI, 'U2-ADR-213 liegt unter docs/adr/');
  assert.deepEqual(abweichungen(fs.readFileSync(path.join(ORDNER, DATEI), 'utf8')), []);
});

/* Dieselbe Klasse in zwei älteren ADRs (Klassensuche 05.10.2026): eine Aussage über ein Fehlen ohne Suchweg
   und eine Empfehlung ohne Fassung/Abschnitt bzw. eine Verbreitungsangabe ohne Beleg. */
const KLASSE = [
  { datei: /^vivodepot-B16-ADR-085-Nachtrag-/, gestrichen: [/ist in Web Crypto API nicht nativ/], belegt: [] },
  { datei: /^vivodepot-B16-ADR-031-/, gestrichen: [/seit 2017/, /BSI TR-02102-empfohlen, modern/, /BSI TR-02102-konform/, /dokumentiert die Konformität mit BSI/],
    belegt: [/BSI TR-02102-1 \(Fassung 2026-01, Abschnitt B\.1\.2\)/, /PBKDF2 weicht damit von der BSI TR-02102-1 ab: B\.1\.2 empfiehlt vorrangig einen MAC/] },
];

test('[U2-ADR-213·Quellen·Klasse] dieselben Muster in B16-ADR-085-Nachtrag und B16-ADR-031 sind berichtigt', () => {
  const funde = [];
  for (const k of KLASSE) {
    const name = fs.readdirSync(ORDNER).find((n) => k.datei.test(n));
    assert.ok(name, 'Datei gefunden: ' + k.datei);
    const text = fs.readFileSync(path.join(ORDNER, name), 'utf8');
    for (const m of k.gestrichen) if (m.test(text)) funde.push(name + ': gestrichen, steht aber da: ' + m);
    for (const m of k.belegt) if (!m.test(text)) funde.push(name + ': belegt, fehlt aber: ' + m);
  }
  assert.deepEqual(funde, []);
});

test('[U2-ADR-213·Quellen · Rot-Beweis] die Wortlaute vor der Berichtigung sind rot', () => {
  const alt = 'PBKDF2-600k ≈ 14.057 H/s gegen Argon2id bei RFC-9106-typischen Parametern (64 MiB/t=3/p=1) = 1.703 H/s; '
    + 'ein 40.000-Dollar-Rig (Specops-Studie, über zwei Pressequellen); WICG-Entwurf vom 11.08.2026; openpgpjs/argon2id (8,6 KB).';
  const f = abweichungen(alt);
  assert.ok(f.some((x) => x.includes('14\\.057')) && f.some((x) => x.includes('Specops-Studie')) && f.some((x) => x.includes('p=1')));
  assert.ok(f.some((x) => x.startsWith('belegt, fehlt aber')), 'ohne die belegten Angaben ebenfalls rot');
});
