'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   last-waehrend-lauf-messen.js — misst die Systemlast WÄHREND ein Kommando läuft
   ────────────────────────────────────────────────────────────────────────────
   WARUM ES IM REPO LIEGT UND NICHT IN EINER SITZUNG: die Entscheidung, ob ein
   teures Gate in einen Hook darf, hängt an dieser Zahl. Eine Zahl, die einmal in
   einem Fenster gemessen und dann zitiert wird, ist beim nächsten Mal nicht
   nachprüfbar. Dieses Werkzeug macht sie wiederholbar.

   DER ANLASS: in der Nacht zum 06.09.2026 hat der Rechner unter der Last
   gleichzeitiger Testsuiten eine Kernel-Panik ausgelöst. Die dokumentierte
   Obergrenze liegt seither bei drei gleichzeitigen Suiten, die Abbruchschwelle
   bei einer Last von 25. Wer ein weiteres Gate einbaut, muss wissen, was SEIN
   Lauf allein kostet — nicht, was er im besten Fall kostet.

   AUFRUF:
     node tools/last-waehrend-lauf-messen.js -- npm run test:e2e
     node tools/last-waehrend-lauf-messen.js --abstand 2 -- <kommando…>

   Ohne Kommando läuft eine kurze Selbstprobe (schlafen), damit die Suite das
   Werkzeug prüfen kann, ohne eine echte Testsuite zu starten.
   ════════════════════════════════════════════════════════════════════════════ */
const os = require('node:os');
const { spawn } = require('node:child_process');

/* Die drei Mittelwerte des Systems. `os.loadavg()` liefert sie ohne Kindprozess —
   ein `sysctl`-Aufruf je Messpunkt würde die Messung selbst zur Last. */
function lastJetzt() {
  const [m1, m5, m15] = os.loadavg();
  return { m1, m5, m15, kerne: os.cpus().length };
}

function auswerten(proben) {
  if (!proben.length) return null;
  const m1 = proben.map((p) => p.m1);
  return {
    proben: proben.length,
    kerne: proben[0].kerne,
    startLast: +m1[0].toFixed(2),
    spitzeLast: +Math.max(...m1).toFixed(2),
    endLast: +m1[m1.length - 1].toFixed(2),
    mittelLast: +(m1.reduce((a, b) => a + b, 0) / m1.length).toFixed(2),
  };
}

function messen(kommando, args, abstandSek) {
  return new Promise((fertig) => {
    const proben = [lastJetzt()];
    const begonnen = Date.now();
    const ticker = setInterval(() => proben.push(lastJetzt()), abstandSek * 1000);
    const kind = spawn(kommando, args, { stdio: 'inherit' });
    kind.on('close', (code) => {
      clearInterval(ticker);
      proben.push(lastJetzt());
      fertig({ code, sekunden: Math.round((Date.now() - begonnen) / 1000), last: auswerten(proben) });
    });
  });
}

module.exports = { lastJetzt, auswerten, messen };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const trenner = argv.indexOf('--');
  const flaggen = trenner < 0 ? argv : argv.slice(0, trenner);
  const rest = trenner < 0 ? [] : argv.slice(trenner + 1);
  const iAbstand = flaggen.indexOf('--abstand');
  const abstand = iAbstand >= 0 ? Number(flaggen[iAbstand + 1]) : 5;
  const [kommando, ...args] = rest.length ? rest : ['sleep', '3'];
  messen(kommando, args, abstand).then((erg) => {
    console.log('\n── Lastmessung ──');
    console.log(JSON.stringify({ kommando: [kommando, ...args].join(' '), ...erg }, null, 2));
    process.exit(erg.code === 0 ? 0 : 1);
  });
}
