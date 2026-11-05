'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   verursacher.js — der rote Wagen: zuordnen, herausnehmen, dem Eigentümer melden (Werkzeug-Zug 2, 27.10.2026; Testkonzept
   Punkt 11, entschieden 26.10.2026)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   EINGABE ist die Fehlerzeile eines roten Zugkopfs (tools/lib/fehlerzeile.js): die rote Datei und der letzte Wagen, der sie
   im Zug ändert.

   ZUORDNEN. Sicher ist der Verursacher nur, wenn ein Wagen des Zugs die rote Datei selbst ändert. Ändert keiner sie
   („Datei im Zug unverändert“), ist er offen: dann wird nichts herausgenommen, die Meldung sagt es. Der Eigentümer ist der
   Zweig, aus dem der Wagen gepickt wurde (Zeile „(cherry picked from commit …)“ von `git cherry-pick -x`, das der Zugkopf
   immer setzt): sein erster Namensteil. Ohne Quelle der Zugzweig selbst — dann ist der Zugkopf der Eigentümer.

   HERAUSNEHMEN (nur sicher zugeordnet, nur auf einem Zugzweig zug-*, nur mit sauberem Arbeitsbaum): vorher die Sicherungsref
   sicherung-verursacher-<kurz>-<datum>, dann EIN Schritt `git rebase --onto <wagen>^ <wagen>`, Exit geprüft; hält er an,
   `git rebase --abort`, und der Zug bleibt wie er war (Regel für destruktive Git-Operationen: einzeln, nie in einer Kette).
   Der Zug fährt danach ohne den Wagen neu; das startet der Zugkopf, nicht dieses Werkzeug.

   MELDEN. Eine Zeile an den Eigentümer, in der Ausgabe der Landung und als JSON-Zeile nach
   <git-common-dir>/vd-verursacher.ndjson. Zustellen tut, wer die Landung führt; das Werkzeug schreibt nur.
   Probe: tests/verursacher.test.js.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const VERURSACHER_DATEI = 'vd-verursacher.ndjson';
const QUELLE_MUSTER = /\(cherry picked from commit ([0-9a-f]{7,40})\)/g;

/** Die Quelle eines gepickten Commits (die letzte -x-Zeile), sonst null. */
function quelleAusNachricht(nachricht) {
  const alle = [...String(nachricht || '').matchAll(QUELLE_MUSTER)];
  return alle.length ? alle[alle.length - 1][1] : null;
}

/** Eigentümer aus einem Zweignamen: der erste Namensteil (krypto-zug2-… → krypto). */
function eigentuemerAusZweig(zweig) {
  const z = String(zweig || '').replace(/^refs\/heads\//, '');
  const teil = z.split('-')[0];
  return teil && teil !== 'zug' ? teil : null;
}

/** Ordnet zu. `git(args)` → stdout. Ergebnis: { sicher, wagen, kurz, quelle, zweig, eigentuemer, grund }. */
function zuordnen(fehler, git) {
  const w = fehler && fehler.wagen;
  if (!w || !w.kurz) return { sicher: false, grund: 'kein Wagen in der Fehlerzeile' };
  if (w.unveraendert) return { sicher: false, kurz: w.kurz, grund: 'die rote Datei ändert kein Wagen des Zugs — Verursacher offen' };
  const voll = String(git(['rev-parse', '--verify', '--quiet', w.kurz + '^{commit}']) || '').trim();
  if (!/^[0-9a-f]{40}$/.test(voll)) return { sicher: false, kurz: w.kurz, grund: 'Wagen ' + w.kurz + ' nicht auflösbar' };
  const quelle = quelleAusNachricht(git(['log', '-1', '--format=%B', voll]));
  let zweig = null;
  if (quelle) {
    const zweige = String(git(['branch', '--format=%(refname:short)', '--contains', quelle]) || '').split('\n').map((x) => x.trim())
      .filter((x) => x && !/^(zug-|sicherung-|u2-kanon$)/.test(x));
    zweig = zweige[0] || null;
  }
  if (!zweig) zweig = String(git(['rev-parse', '--abbrev-ref', 'HEAD']) || '').trim() || null;
  return { sicher: true, wagen: voll, kurz: voll.slice(0, 9), quelle, zweig, eigentuemer: eigentuemerAusZweig(zweig) || 'Zugkopf', grund: null };
}

/** Nimmt den Wagen heraus. Gibt { raus, grund, sicherung }. Nie mehr als ein destruktiver Schritt, jeder Exit geprüft. */
function herausnehmen(z, { git, gitStatus, jetzt = new Date() }) {
  if (!z.sicher) return { raus: false, grund: z.grund };
  const zug = String(git(['rev-parse', '--abbrev-ref', 'HEAD']) || '').trim();
  if (!/^zug-/.test(zug)) return { raus: false, grund: 'kein Zugzweig (HEAD ' + (zug || '?') + ') — herausnehmen nur auf zug-*' };
  if (gitStatus(['status', '--porcelain', '--untracked-files=no']).stdout.trim()) return { raus: false, grund: 'der Arbeitsbaum weicht von HEAD ab' };
  const basis = String(git(['rev-parse', '--verify', '--quiet', z.wagen + '^']) || '').trim();
  if (!basis) return { raus: false, grund: 'der Wagen hat keinen Vorgänger' };
  // Als Ref, nie als Zweig: ein Zweig mit den Patches des Zugs liest sich als verdeckter Pick (Probe: Sicherung als Ref).
  const sicherung = 'refs/sicherung/verursacher-' + z.kurz + '-' + jetzt.toISOString().slice(0, 16).replace(/[-:T]/g, '');
  if (gitStatus(['update-ref', sicherung, 'HEAD']).status !== 0) return { raus: false, grund: 'Sicherungsref nicht gesetzt — nichts geändert' };
  const r = gitStatus(['rebase', '--onto', basis, z.wagen]);
  if (r.status !== 0) {
    const a = gitStatus(['rebase', '--abort']);
    return { raus: false, sicherung, grund: 'Herausnehmen hielt an (Konflikt mit einem späteren Wagen); ' + (a.status === 0 ? 'zurückgesetzt, der Zug ist unverändert' : 'rebase --abort scheiterte — Zug von Hand prüfen, Sicherung ' + sicherung) };
  }
  return { raus: true, sicherung, grund: null };
}

/** Die Meldezeile an den Eigentümer. */
function meldung(z, fehler, raus, zug) {
  if (!z.sicher) return 'VERURSACHER offen im Zug ' + (zug || '?') + ': ' + z.grund + ' — ' + ((fehler && fehler.zeile) || '');
  return 'VERURSACHER an ' + z.eigentuemer + ': Wagen ' + z.kurz + (z.zweig ? ' (' + z.zweig + ')' : '') + ' macht den Zug ' + (zug || '?') + ' rot — '
    + (fehler.test || '?') + ' in ' + (fehler.datei || '?') + ': ' + (fehler.meldung || '') + ' · '
    + (raus.raus ? 'herausgenommen (Sicherung ' + raus.sicherung + '), der Zug fährt ohne ihn neu' : 'nicht herausgenommen: ' + raus.grund);
}

/** Zuordnen, herausnehmen (wenn `raus`), melden, ablegen. Wirft nie. */
function verursacherBehandeln(fehler, { git, gitStatus, ort = null, raus = true, jetzt = new Date() }) {
  try {
    const zug = String(git(['rev-parse', '--abbrev-ref', 'HEAD']) || '').trim();
    const z = zuordnen(fehler, git);
    const h = raus ? herausnehmen(z, { git, gitStatus, jetzt }) : { raus: false, grund: 'Herausnehmen ausgeschaltet' };
    const zeile = meldung(z, fehler, h, zug);
    if (ort) {
      try { fs.appendFileSync(path.join(ort, VERURSACHER_DATEI), JSON.stringify({ zeit: jetzt.toISOString(), zug, ...z, raus: h.raus, sicherung: h.sicherung || null, grund: h.grund || z.grund, zeile }) + '\n'); } catch (_) { /* Messung */ }
    }
    return { zuordnung: z, heraus: h, zeile };
  } catch (e) { return { zuordnung: null, heraus: { raus: false }, zeile: 'VERURSACHER nicht bestimmt: ' + e.message }; }
}

module.exports = { zuordnen, herausnehmen, meldung, verursacherBehandeln, quelleAusNachricht, eigentuemerAusZweig, VERURSACHER_DATEI };
