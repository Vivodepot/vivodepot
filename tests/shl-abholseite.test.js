'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — die Abhol-Seite (share/empfangen.*), Nachtrag zu U2-ADR-183
   ────────────────────────────────────────────────────────────────────────
   Dieselbe Bauform wie die Ablage-Seite, andere Richtung: die Ablage-Seite
   LEGT AB, diese HOLT AB — und zwar von FREMDEN Hosts, denn die Freigabe
   einer Aerztin liegt auf ihrem Server, nicht auf unserem.

   WARUM DIESE SEITE EINE EIGENE PROBE BRAUCHT: sie haelt fuer einige Sekunden
   ENTSCHLUESSELTES Gesundheits-FHIR im Speicher. Die App selbst sieht nie
   etwas anderes als Chiffretext. Dieser Unterschied ist der Grund fuer jede
   Strenge unten — und fuer die Sperre, dass der Kern NICHT mitgelockert wird.

   Die Probe ist bewusst STRUKTURELL und braucht keinen Browser: sie haelt die
   ausgelieferten Dateien gegen die Zusagen. Der Lauf gegen einen echten Host
   ist tools/shl-empfangen-probe.js und laeuft nicht in der Suite.

   Anlass, gemessen: Gazelle TI-751 am 23.09.2026 — Manifest-Weg mit Passcode,
   Aufloesung ueber `location`, Entschluesselung im Browser. Die Seite war zu
   dem Zeitpunkt nicht versioniert; genau das schliesst diese Probe.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const S = (name) => fs.readFileSync(path.join(WURZEL, 'share', name), 'utf8');

test('[U2-ADR-183] die drei Dateien der Abhol-Seite sind versioniert', () => {
  for (const f of ['empfangen.html', 'empfangen.js', 'empfangen.css']) {
    const p = path.join(WURZEL, 'share', f);
    assert.ok(fs.existsSync(p), `share/${f} fehlt — die Seite lebte sonst nur auf dem Webhost`);
    assert.ok(fs.statSync(p).size > 500, `share/${f} ist verdaechtig klein`);
  }
});

test('[U2-ADR-183] der KERN bleibt bei connect-src none — diese Seite lockert ihn nicht', () => {
  /* Die eigentliche Sperre. Die Abhol-Seite darf ins Netz; die Anwendung nicht.
     Wer das je zusammenlegt, bricht die Zusage „die App macht zu keinem
     Zeitpunkt einen Netzaufruf". */
  for (const kern of ['vivodepot.html', 'vivodepot-lesen.html']) {
    assert.deepEqual(kernSperreBefund(fs.readFileSync(path.join(WURZEL, kern), 'utf8')), [], kern);
  }
});

function kernSperreBefund(t) {
  const fehler = [];
  if (!/connect-src\s+'none'/.test(t)) fehler.push("connect-src 'none' fehlt");
  if (/connect-src\s+https:/.test(t)) fehler.push('connect-src https: gehoert NICHT in den Kern');
  if (t.includes('empfangen.js')) fehler.push('die Abhol-Seite gehoert nicht in den Kern');
  return fehler;
}

test('[Negativprobe] Rot-Beweis zu U2-ADR-183: ein gelockerter Kern fällt, connect-src https: und die eingebundene Abhol-Seite', () => {
  // Am 25.09.2026 einmal von Hand gefahren (Kern-CSP auf connect-src https:), seit 26.09.2026 hier festgeschrieben.
  const echt = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
  const gelockert = echt.replace("connect-src 'none'", 'connect-src https:');
  assert.notEqual(gelockert, echt, 'Vorbedingung: die CSP-Zeile ließ sich ändern');
  assert.ok(kernSperreBefund(gelockert).includes('connect-src https: gehoert NICHT in den Kern'));
  assert.ok(kernSperreBefund(echt + '\n<script src="empfangen.js"></script>').includes('die Abhol-Seite gehoert nicht in den Kern'));
});

test('[U2-ADR-183] CSP der Abhol-Seite: alles zu, nur connect-src offen', () => {
  const h = S('empfangen.html');
  const m = h.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(m, 'CSP-Meta fehlt');
  const csp = m[1];
  assert.match(csp, /default-src 'none'/, 'default-src none');
  assert.match(csp, /script-src 'self'/, 'nur eigene Skripte');
  assert.match(csp, /connect-src https:/, 'der EINE Unterschied zur Ablage-Seite');
  assert.match(csp, /base-uri 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.ok(!csp.includes('unsafe-inline'), 'kein unsafe-inline');
  assert.ok(!csp.includes('unsafe-eval'), 'kein unsafe-eval');
  assert.ok(!/frame-ancestors/.test(csp), 'frame-ancestors wird in einer Meta-CSP ignoriert — gehoert nicht hinein');
});

test('[U2-ADR-183] kein Inline-Skript, keine fremden Quellen', () => {
  const h = S('empfangen.html');
  for (const tag of h.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) || []) {
    assert.match(tag, /\ssrc="/, 'jedes <script> hat ein src — kein Inline-Code');
    assert.match(tag, /<script[^>]*>\s*<\/script>/, '<script src> hat keinen Rumpf');
  }
  for (const ref of h.match(/(?:src|href)="([^"]+)"/g) || []) {
    const v = ref.split('"')[1];
    assert.ok(!/^https?:/i.test(v) && !v.startsWith('//'),
      `fremde Quelle in der Seite: ${v} — alles kommt vom eigenen Host`);
  }
  assert.ok(!/\son\w+=/.test(h), 'keine Inline-Ereignisbehandler (onclick=…)');
});

test('[U2-ADR-183] beide Freigabewege werden bedient — U und Manifest', () => {
  const j = S('empfangen.js');
  assert.match(j, /flag[^\n]*includes\('U'\)/, 'der Direkt-Weg wird am U-Flag erkannt');
  assert.match(j, /flag[^\n]*includes\('P'\)/, 'der Passcode wird am P-Flag erkannt');
  assert.match(j, /method:\s*'GET'/, 'U-Flag: GET');
  assert.match(j, /method:\s*'POST'/, 'Manifest: POST');
  assert.match(j, /searchParams\.set\('recipient'/, 'U-Flag: recipient als Abfrageparameter');
  assert.match(j, /\{\s*recipient:/, 'Manifest: recipient im Koerper');
  assert.match(j, /location/, 'das Manifest darf statt embedded eine location liefern');
});

test('[U2-ADR-183] der Passcode wird NUR bei P-Flag mitgeschickt', () => {
  const j = S('empfangen.js');
  assert.match(j, /if \(brauchtPasscode\(p\)\) koerper\.passcode =/,
    'der Passcode haengt an der Flag-Pruefung, nicht am Vorhandensein einer Eingabe');
});

test('[U2-ADR-183] die Entschluesselung bindet den Kopf als Zusatzdaten (AAD)', () => {
  /* RFC 7516 §5.1: AAD ist der KODIERTE geschuetzte Kopf als ASCII. Fehlt das,
     schlaegt jede echte JWE fehl — und es sieht aus wie ein Verbindungsfehler. */
  const j = S('empfangen.js');
  assert.match(j, /name:\s*'AES-GCM'/);
  assert.match(j, /additionalData:\s*new TextEncoder\(\)\.encode\(/, 'AAD wird gesetzt');
  assert.match(j, /tagLength:\s*128/);
});

test('[U2-ADR-183] der Schluessel verlaesst das Geraet nicht', () => {
  const j = S('empfangen.js');
  for (const stelle of j.match(/fetch\([\s\S]{0,400}?\)/g) || []) {
    assert.ok(!/\bkey\b/.test(stelle), `der Schluessel taucht in einem fetch auf:\n${stelle.slice(0, 200)}`);
  }
});

test('[U2-ADR-183] der Download-Anker haengt im Dokument, bevor er geklickt wird', () => {
  /* Ohne appendChild feuert click() in mehreren Browsern nicht — die Buergerin
     haelt das Dokument dann fuer verloren, und die Freigabe ist verbraucht. */
  const j = S('empfangen.js');
  assert.match(j, /appendChild\(a\);\s*a\.click\(\)/, 'erst einhaengen, dann klicken');
});

test('[U2-ADR-183] die Seite nennt keinen festen Host — sie folgt dem Link', () => {
  const j = S('empfangen.js');
  assert.ok(!/share\.vivodepot\.de/.test(j),
    'die Adresse kommt aus dem Freigabe-Link der Absenderin, nicht aus unserem Code');
});

/* Kopplung Wächter ↔ Probe (operating-manual §7.5): der Prüfstand ersetzt kernSperreBefund durch einen Ersatz,
   der immer meldet, und verlangt, dass der Wächter oben dann rot wird — so ist belegt, dass er sie wirklich ruft. */
module.exports = {
  PROBEN: [
    { fuer: '[U2-ADR-183] der KERN bleibt bei connect-src none — diese Seite lockert ihn nicht', diskriminante: kernSperreBefund },
  ],
};
