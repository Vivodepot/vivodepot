#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   pre-push-Gate — SCHALEN_STAND über den GANZEN zu pushenden Bereich
   ────────────────────────────────────────────────────────────────────────
   WARUM EINE ZWEITE AUSGABESTELLE. Der Node-Test prüft eine Commit-Grenze:
   „ändert DIESER Commit die Schale, ohne SCHALEN_STAND zu heben?" Ein Bereich
   kann aber mehrere Commits tragen, von denen keiner einzeln auffällt — genau
   die Form des BUILD_DATUM-Fehlers vom 26.07., hier auf die Schale übertragen.

   git reicht dem Hook auf stdin je Ref eine Zeile:
       <local ref> <local sha> <remote ref> <remote sha>
   Ein remote-sha aus lauter Nullen heisst „neuer Branch" — dann wird gegen
   die ganze erreichbare Historie geprüft statt gegen einen Bereich
   (`schalenBereichsBefund` im Kern trägt dieselbe Fallunterscheidung wie
   `bereichsBefund` im BUILD_DATUM-Kern).

   KEIN STILLES ÜBERSPRINGEN: geht die Messung nicht, ist das Gate ROT.
   Vor einem Push ist git da; ein Fehler hier ist ein Fehler, kein Anlass
   zum Durchwinken (U2-ADR-106). Im flachen Klon ist der Befund UNGEMESSEN
   und wird als Hinweis ausgegeben, aber nicht rot gemacht — derselbe Grund
   wie beim BUILD_DATUM-Kern: die Frage ist dort nicht beantwortbar.
   ════════════════════════════════════════════════════════════════════════ */
const K = require('./schalen-lockstep-kern.js');

const roh = require('node:fs').readFileSync(0, 'utf8').trim();
if (!roh) { console.log('[schalen-lockstep] nichts zu pushen'); process.exit(0); }

if (K.istFlacherKlon()) {
  console.log('[schalen-lockstep] UNGEMESSEN — flacher Klon (Tiefe 1), keine Historie. '
    + '`fetch-depth: 0` gibt dem Gate den Boden zurück.');
  process.exit(0);
}

let rot = false;
for (const zeile of roh.split('\n').filter(Boolean)) {
  const [lokalRef, lokalSha, , remoteSha] = zeile.split(/\s+/);
  if (/^0+$/.test(lokalSha)) continue;   // Löschung eines Refs

  let b;
  try {
    b = K.schalenBereichsBefund(remoteSha, lokalSha);
  } catch (e) {
    console.error(`[schalen-lockstep] ROT — Messung fehlgeschlagen für ${lokalRef}: ${e.message}`);
    console.error('                    Kein Durchwinken: eine Prüfung, die nicht laufen konnte, ist nicht bestanden.');
    rot = true;
    continue;
  }

  if (b) {
    rot = true;
    console.error(`\n[schalen-lockstep] ROT — ${lokalRef}`);
    console.error(`  ${b.grund}`);
    console.error(`  ${b.betroffen} von ${b.gesamt} Commit(s) im Bereich ändern die Schale (vivodepot.html, manifest.webmanifest).`);
    console.error(`\n  Zu tun: SCHALEN_STAND in vivodepot.html auf 'v${b.soll}' oder höher setzen,`);
    console.error('  UND die CACHE-Zeile in sw.js im Lockstep mitziehen, committen, dann erneut pushen.\n');
  } else {
    console.log(`[schalen-lockstep] OK — ${lokalRef}`);
  }
}
process.exit(rot ? 1 : 0);
