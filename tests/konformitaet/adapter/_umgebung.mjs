/* ═════════════════════════════════════════════════════════════════════════
   _umgebung.mjs — gemeinsame Hilfen der Prüfer-Adapter (docs/standards-schnittstelle.md)
   ─────────────────────────────────────────────────────────────────────────
   javaPfad(min)    Java finden: JAVA_HOME, PATH, dann die Homebrew-Orte (Homebrew verlinkt
                    openjdk bewusst nicht in den PATH — am 26.07.2026 führte das zur Fehldiagnose
                    „kein Java"). Ohne Argument genau die Suche, die externe-validatoren.mjs vorher
                    selbst hatte; mit Argument zusätzlich die Mindestversion.
   artefaktPfad(id) der Ort eines beschafften Artefakts im Cache (VD_STANDARDS_CACHE, Vorgabe
                    ~/.cache/vivodepot-standards/<id>/), oder null.
   arbeitsVerzeichnis() ein frisches Verzeichnis unter os.tmpdir für die Erzeugnisse eines Laufs;
                    arbeitsVerzeichnisRaeumen(dir) räumt es wieder.
   ═════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

/** Die Hauptversion eines Java-Befehls (`java -version` schreibt nach stderr), oder null. */
function hauptversion(befehl) {
  const r = spawnSync(befehl, ['-version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  const m = String(r.stderr || r.stdout).match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  const a = Number(m[1]);
  return a === 1 && m[2] ? Number(m[2]) : a;   // "1.8.0" → 8
}

export function javaPfad(minVersion) {
  const kandidaten = [
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    'java',
    '/opt/homebrew/opt/openjdk@21/bin/java',
    '/opt/homebrew/opt/openjdk/bin/java',
    '/usr/local/opt/openjdk@21/bin/java',
  ].filter(Boolean);
  for (const k of kandidaten) {
    if (minVersion === undefined) {
      try { execFileSync(k, ['-version'], { stdio: 'ignore' }); return k; } catch (_) { continue; }
    }
    const v = hauptversion(k);
    if (v !== null && v >= minVersion) return k;
  }
  return null;
}

export function cacheWurzel() {
  return process.env.VD_STANDARDS_CACHE || path.join(os.homedir(), '.cache', 'vivodepot-standards');
}

export function artefaktPfad(id) {
  const d = path.join(cacheWurzel(), id);
  if (!fs.existsSync(d)) return null;
  const inhalt = fs.readdirSync(d).filter((x) => !x.startsWith('.'));
  return inhalt.length === 1 ? path.join(d, inhalt[0]) : (inhalt.length ? d : null);
}

export function arbeitsVerzeichnis(praefix = 'vd-adapter-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), praefix));
}

/** Räumt ein Arbeitsverzeichnis samt Inhalt — ein Adapter ruft es in seinem aufraeumen(). */
export function arbeitsVerzeichnisRaeumen(dir) {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
}
