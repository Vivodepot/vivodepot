'use strict';
/* Der Rückfall „keine Vor-Depot-Konfiguration“ (20.10.2026, Befund SUITE-DAUER-WAECHST): unter ladeKern() nimmt der Kern beim
   Start diesen Rückfall — kein eingebackenes Array, kein Nachladen —, und sein Zeitgeber über VOR_DEPOT_NACHLADEN_DECKEL_MS
   hielt jeden Testprozess am Ende 3 s offen. Der Zeitgeber ist jetzt unref(): der Rückfall wirkt wie zuvor, nur hält er den
   Prozess nicht mehr. Hier: der Rückfall selbst, und der Wächter gegen die Klasse — ein Prozess, der nur ladeKern() ruft, endet
   ohne Warten; Rot-Beweis an einer Kopie des Kerns ohne unref(). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');

test('[Vor-Depot·Rückfall] ohne Konfiguration wartet der Kern den Deckel ab und liefert „keine Konfiguration“', async () => {
  const { V } = ladeKern();
  const halten = setInterval(() => {}, 1000);   // der Zeitgeber selbst hält den Prozess nicht mehr; hier wartet ein Test auf ihn
  try {
    const t0 = Date.now();
    const roh = await V.vorDepotKonfigurationLaden();
    assert.deepEqual(roh, [], 'der Rückfall liefert ein leeres Array');
    assert.ok(Date.now() - t0 >= 2500, 'der Rückfall wartet den Deckel ab');
  } finally { clearInterval(halten); }
});

test('[Vor-Depot·Rückfall·Browser] gibt setTimeout eine Zahl zurück wie im Browser, löst die unref()-Zeile nichts aus', async () => {
  const echt = global.setTimeout;
  let gerufen = 0;
  // Browser-Form: eine Zahl, kein unref. ladeKern() übernimmt setTimeout beim Laden in seinen Kontext — darum vorher ersetzen.
  global.setTimeout = (f, ms) => { if (ms >= 1000) gerufen += 1; echt(f, Math.min(ms || 0, 10)); return 42; };
  let V;
  try { ({ V } = ladeKern()); } finally { global.setTimeout = echt; }
  try {
    const roh = await V.vorDepotKonfigurationLaden();
    assert.deepEqual(roh, [], 'der Rückfall liefert wie im Browser ein leeres Array, ohne Fehler');
    assert.ok(gerufen >= 1, 'der Rückfall-Zeitgeber wurde gestellt');
  } finally { /* schon zurückgesetzt */ }
});

/* Gemessen wird im Kind, wie lange der Prozess NACH dem Ende des Skripts noch lebt — nicht die Gesamtdauer samt Prozessstart
   und ladeKern(). Die schwankten unter der Last der vollen Suite um Sekunden und machten die Probe rot, ohne dass ein
   Zeitgeber hielt (Befund ZEITPROBEN-SUITE-LAST, 05.11.2026). Der Deckel-Zeitgeber steht am Ende von ladeKern(); ohne unref()
   wartet das Kind ihn also fast ganz ab. */
const nachDemEnde = (kernPfad, vorlaufMs = 0) => {
  const skript = 'const _bis = Date.now() + ' + Number(vorlaufMs) + '; while (Date.now() < _bis) {} ' + 'require(' + JSON.stringify(path.join(__dirname, 'load-kern.js')) + ').ladeKern(' + (kernPfad ? JSON.stringify({ htmlPfad: kernPfad, backen: true }) : '') + ');'
    + ' const t1 = Date.now(); process.on("exit", () => process.stderr.write("\\nNACH_DEM_ENDE " + (Date.now() - t1) + "\\n"));';
  const r = spawnSync(process.execPath, ['-e', skript], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', env: { ...process.env, NODE_TEST_CONTEXT: '' } });
  const m = [...String(r.stderr).matchAll(/NACH_DEM_ENDE (\d+)/g)].pop();
  assert.ok(m, 'das Kind meldet seine Wartezeit (Status ' + r.status + ')');
  return Number(m[1]);
};
test('[Vor-Depot·Zeitgeber] ein Prozess mit ladeKern() endet ohne Warten — ohne unref() wartet er den Deckel ab (Rot-Beweis)', () => {
  const ohne = nachDemEnde(null);
  assert.ok(ohne < 2000, 'ladeKern() hält den Prozess nicht offen (' + ohne + ' ms)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vor-depot-zeitgeber-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
    const ohneUnref = quelle.replace('_ohneProzessHalt(setTimeout(() => resolve(undefined), VOR_DEPOT_NACHLADEN_DECKEL_MS))', 'setTimeout(() => resolve(undefined), VOR_DEPOT_NACHLADEN_DECKEL_MS)');
    assert.notEqual(ohneUnref, quelle, 'die unref()-Stelle steht im Kern');
    fs.writeFileSync(kopie, ohneUnref);
    const mit = nachDemEnde(kopie);
    assert.ok(mit >= 2800 && mit - ohne >= 2000, 'Rot-Beweis: ohne unref() wartet der Prozess den Deckel ab (' + mit + ' gegen ' + ohne + ' ms)');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Lastsimulation: ein Kind, das vor dem Ende künstlich langsam ist (wie unter der Last der vollen Suite), gilt nicht als
   gehalten. Die alte Messung der Gesamtdauer schlug hier an (Befund ZEITPROBEN-SUITE-LAST, 05.11.2026). */
test('[Vor-Depot·Zeitgeber·Last] ein langsamer Prozessstart zählt nicht als Warten auf einen Zeitgeber', () => {
  const langsam = nachDemEnde(null, 3000);
  assert.ok(langsam < 2000, 'gemessen wird nur die Wartezeit nach dem Ende (' + langsam + ' ms)');
});
