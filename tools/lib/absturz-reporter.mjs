// absturz-reporter.mjs — ein abgestürzter Testprozess heißt so, nicht „test failed“ (04.10.2026)
// ────────────────────────────────────────────────────────────────────────────
// Stirbt der Kindprozess einer Testdatei an einem Signal (am 04.10.2026: SIGSEGV im Garbage Collector von V8,
// nodejs/node#62393), meldet der Spec-Reporter nur „✖ <datei> … 'test failed'“ — das liest sich wie ein Testfehler
// ohne Meldung. Der Test-Runner trägt das Signal aber im Ereignis (details.error.signal). Dieser Reporter schreibt dazu
// EINE Zeile, die den Absturz benennt. Er ändert nichts am Ergebnis: der Lauf bleibt rot, nichts wird wiederholt.
// „gemeldet“, nicht „gelaufen“: ein Kindprozess, der stirbt, schickt seine gepufferten Ereignisse nicht mehr — gemessen
// an einer Datei, die nach zwei Tests SIGTERM bekommt: beim Elternprozess kam kein einziges test:start an.
// Eingebunden in package.json (`npm test`, damit auch Schnellstufe, pre-push und der eigene Runner).
import path from 'node:path';

export const KENNUNG_V8 = 'Laufzeit-Absturz (V8)';
export function absturzZeile({ datei, signal, testsGelaufen }) {
  const art = signal === 'SIGSEGV' ? KENNUNG_V8 : `Prozess-Abbruch (${signal})`;
  return `✖ ${art}: ${datei} — der Testprozess starb an ${signal}`
    + (testsGelaufen ? ` nach ${testsGelaufen} gemeldeten Tests` : ', bevor ein Test gemeldet war')
    + '; kein Testfehler. Der Lauf bleibt rot, keine Wiederholung. Absturzbericht: ~/Library/Logs/DiagnosticReports/node-*.ips'
    + (signal === 'SIGSEGV' ? '; bekannt als nodejs/node#62393 (Gegenmittel: --no-sparkplug an jedem Start des Test-Runners).' : '.') + '\n';
}

export default async function* absturzReporter(quelle) {
  const gestartet = new Map();
  for await (const e of quelle) {
    const d = e.data || {};
    if (e.type === 'test:start' && d.file && d.nesting > 0) gestartet.set(d.file, (gestartet.get(d.file) || 0) + 1);
    if (e.type === 'test:start' && d.file && d.nesting === 0 && d.name !== path.basename(d.file)) gestartet.set(d.file, (gestartet.get(d.file) || 0) + 1);
    if (e.type !== 'test:fail') continue;
    const fehler = d.details && d.details.error;
    if (!fehler || !fehler.signal || !d.file) continue;
    yield absturzZeile({ datei: path.relative(process.cwd(), d.file), signal: fehler.signal, testsGelaufen: gestartet.get(d.file) || 0 });
  }
}
