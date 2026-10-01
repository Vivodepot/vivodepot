/* ═════════════════════════════════════════════════════════════════════════
   _lader.mjs — lädt die Prüfer-Adapter dieses Ordners (eine Datei je Familie, ohne _-Präfix)
   ─────────────────────────────────────────────────────────────────────────
   externe-validatoren.mjs hängt sie hinter seine inline-Einträge. Getrennt von dort, damit ein
   Test die Adapter laden kann, ohne die [Extern]-Läufe jener Datei mitzuregistrieren.
   ═════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));

export function adapterDateien() {
  return fs.readdirSync(HIER).filter((d) => d.endsWith('.mjs') && !d.startsWith('_')).sort();
}

export async function ladeAdapter() {
  const raus = [];
  for (const d of adapterDateien()) {
    const mod = await import(pathToFileURL(path.join(HIER, d)).href);
    if (!mod.default) throw new Error('Adapter ' + d + ' hat keinen default-Export');
    raus.push({ ...mod.default, _datei: d, _aufraeumen: mod.aufraeumen });
  }
  return raus;
}
