'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   csp-hashes.js — script-src ohne 'unsafe-inline': jeder eigene Inline-Block per sha256 erlaubt (01.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Der Kern trägt heute noch 'unsafe-inline'; seine Umstellung auf Hashes kommt mit einer eigenen Fassung. Diese Datei
   steht vorher im Kanon, weil das Download-Gateway ihren Abschnitt schon als Kopie trägt — und eine Kopie ohne
   Original hat keine Seite, gegen die sie geprüft werden kann.

   EINE reine Funktion, ohne Abhängigkeiten außer node:crypto. Der Abschnitt zwischen den CSP_HASHES-Markern steht
   byte-gleich im Download-Gateway (src/csp-hashes.js, in einer ESM-Hülle). Zwei Proben halten ihn: die gepinnte
   sha256 in tests/csp-hashes-abschnitt.test.js (dieselbe Zahl im Gateway) und der Abgleich gegen Gateway-main in
   tests/csp-hashes-cross-repo-abgleich.test.js. Das Gateway braucht den Abschnitt, weil es beim Bau Blöcke einsetzt
   (Vor-Depot-Konfiguration, Service-Worker-Vermerk, die AB_WERK-Regionen im Kern-Skript) und die Hashes DANACH
   nachziehen muss, als letzten Schritt vor Prüfsumme und Signatur.

   Ausführbar ist ein Inline-Block ohne src und ohne Daten-Typ (application/json, application/ld+json, text/plain,
   text/template). Gehasht wird genau der Text zwischen <script …> und </script>, wie der Browser ihn sieht.
   ════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
/* ==CSP_HASHES:BEGIN== */

const META = /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/g;
const DATENTYP = /\btype\s*=\s*["']?(application\/(ld\+)?json|text\/plain|text\/template)/i;

/** Die ausführbaren Inline-Blöcke einer HTML-Datei, in Reihenfolge. */
function inlineSkripte(html) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  const aus = [];
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/i.test(m[1]) || DATENTYP.test(m[1])) continue;
    aus.push(m[2]);
  }
  return aus;
}

const hashVon = (text) => "'sha256-" + crypto.createHash('sha256').update(text, 'utf8').digest('base64') + "'";

/** Die script-src-Direktive einer Policy mit genau diesen Hashes; 'unsafe-inline' und alte Hashes fallen weg. */
function policyMitHashes(policy, hashes) {
  const teile = policy.split(';').map((t) => t.trim()).filter(Boolean);
  const i = teile.findIndex((t) => /^script-src(\s|$)/.test(t));
  if (i < 0) throw new Error('CSP ohne script-src — es gibt nichts zu härten, das ist ein Fehler im Aufbau');
  const behalten = teile[i].split(/\s+/).slice(1).filter((q) => q !== "'unsafe-inline'" && !/^'sha(256|384|512)-/.test(q));
  teile[i] = ['script-src', ...behalten, ...[...new Set(hashes)]].join(' ');
  return teile.join('; ');
}

function metaZeilen(html) {
  return [...html.matchAll(META)];
}

/** Die CSP der Datei neu schreiben: script-src erlaubt genau die eigenen Inline-Blöcke. Idempotent. */
function cspHashesNachziehen(html) {
  const metas = metaZeilen(html);
  if (metas.length !== 1) throw new Error('erwartet genau EINE CSP-Meta-Zeile, gefunden: ' + metas.length);
  const hashes = inlineSkripte(html).map(hashVon);
  const neu = policyMitHashes(metas[0][2], hashes);
  return html.replace(metas[0][0], metas[0][1] + neu + metas[0][3]);
}

/** Ob die CSP genau zu den Blöcken passt: { ok, fehlend, ueberzaehlig, unsafeInline } */
function cspPruefen(html) {
  const metas = metaZeilen(html);
  if (metas.length !== 1) return { ok: false, grund: 'CSP-Meta-Zeilen: ' + metas.length, fehlend: [], ueberzaehlig: [], unsafeInline: false };
  const ss = (metas[0][2].split(';').map((t) => t.trim()).find((t) => /^script-src(\s|$)/.test(t)) || '').split(/\s+/);
  const inPolicy = new Set(ss.filter((q) => /^'sha256-/.test(q)));
  const soll = new Set(inlineSkripte(html).map(hashVon));
  const fehlend = [...soll].filter((h) => !inPolicy.has(h));
  const ueberzaehlig = [...inPolicy].filter((h) => !soll.has(h));
  const unsafeInline = ss.includes("'unsafe-inline'");
  return { ok: !fehlend.length && !ueberzaehlig.length && !unsafeInline, fehlend, ueberzaehlig, unsafeInline };
}

/* ==CSP_HASHES:END== */
module.exports = { inlineSkripte, hashVon, policyMitHashes, cspHashesNachziehen, cspPruefen };
