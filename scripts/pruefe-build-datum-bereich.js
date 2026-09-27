#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   pre-push-Gate — BUILD_DATUM über den GANZEN zu pushenden Bereich
   ────────────────────────────────────────────────────────────────────────
   WARUM EINE ZWEITE AUSGABESTELLE. Der pre-commit-Weg prüft eine
   Commit-Grenze: „ändert DIESER Commit die Datei, ohne BUILD_DATUM zu
   bumpen?" Ein Bereich kann aber elf Commits tragen, von denen sieben die
   Datei ändern, und an keiner einzelnen Grenze auffallen — jeder Commit für
   sich hat BUILD_DATUM „nicht angefasst, war ja vorher schon so".
   Genau das lag am 26.07. vor: elf ungepushte Commits, sieben davon an
   vivodepot.html, BUILD_DATUM durchgehend '2026-07-22'. pre-commit hätte
   nicht gegriffen; dieses Gate greift.

   git reicht dem Hook auf stdin je Ref eine Zeile:
       <local ref> <local sha> <remote ref> <remote sha>
   Ein remote-sha aus lauter Nullen heisst „neuer Branch" — dann wird gegen
   die ganze erreichbare Historie geprüft statt gegen einen Bereich.

   KEIN STILLES ÜBERSPRINGEN: geht die Messung nicht, ist das Gate ROT.
   Vor einem Push ist git da; ein Fehler hier ist ein Fehler, kein Anlass
   zum Durchwinken (U2-ADR-106).
   ════════════════════════════════════════════════════════════════════════ */
const K = require('./build-datum-kern.js');

const roh = require('node:fs').readFileSync(0, 'utf8').trim();
if (!roh) { console.log('[build-datum] nichts zu pushen'); process.exit(0); }

let rot = false;
for (const zeile of roh.split('\n').filter(Boolean)) {
  const [lokalRef, lokalSha, , remoteSha] = zeile.split(/\s+/);
  if (/^0+$/.test(lokalSha)) continue;                    // Löschung eines Refs

  let b;
  try {
    b = K.bereichsBefund(remoteSha, lokalSha);
  } catch (e) {
    console.error(`[build-datum] ROT — Messung fehlgeschlagen für ${lokalRef}: ${e.message}`);
    console.error('             Kein Durchwinken: eine Prüfung, die nicht laufen konnte, ist nicht bestanden.');
    rot = true;
    continue;
  }

  if (b) {
    rot = true;
    console.error(`\n[build-datum] ROT — ${lokalRef}`);
    console.error(`  ${b.grund}`);
    console.error(`  ${b.betroffen} von ${b.gesamt} Commit(s) im Bereich ändern vivodepot.html inhaltlich.`);
    console.error(`  Die App zeigt der Bürgerin in Fußzeile, Einstellungen und Stand-Satz '${b.ist}',`);
    console.error(`  und der Alt-Hinweis (VERSION_HINWEIS_SCHWELLE_TAGE) rechnet von diesem Tag.`);
    console.error(`\n  Zu tun: BUILD_DATUM in vivodepot.html auf '${b.soll}' oder neuer setzen,`);
    console.error(`  committen, dann erneut pushen.\n`);
  } else {
    console.log(`[build-datum] OK — ${lokalRef}`);
  }
}
process.exit(rot ? 1 : 0);
