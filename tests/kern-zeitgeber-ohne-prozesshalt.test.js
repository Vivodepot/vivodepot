'use strict';
/* Zeitgeber ohne Prozess-Halt (20.10.2026, Befund SUITE-DAUER-WAECHST): zwei Zeitgeber des Kerns — der Rückfall der
   Vor-Depot-Konfiguration (3 s) und die Meldungsleiste ui.toast (3,2 s, mit Knopf 8 s) — hielten jeden Testprozess, der sie
   auslöste, am Ende offen. Gemessen auf dem eigenen Prüfrechner: 125 Dateien lagen mehr als 2 s über ihrer Testzeit, die meisten
   um 3,3 s. Jetzt laufen sie durch _ohneProzessHalt (unref, im Browser ohne Wirkung).
   WÄCHTER GEGEN DIE KLASSE: jeder setTimeout im Kern, dessen Verzögerung nicht als Zahl ≤ 1000 in derselben Zeile steht, läuft
   durch _ohneProzessHalt oder steht unten mit Grund. Rot-Beweis: ein neuer ungeschützter Zeitgeber über 1 s fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
// Gemessen wird der eigene Code: gelistete Fremdbibliotheken (tools/lib/fremdbibliotheken.js) sind ausgeschnitten (17.11.2026).
const kernEigen = () => require('../tools/lib/html-senken.js').ohneFremdbloecke(fs.readFileSync(KERN, 'utf8'));

// Zeitgeber, die den Prozess halten DÜRFEN, mit Grund. Ein Eintrag gilt für die Zeile, die `zeile` enthält.
const ERLAUBT = Object.freeze([
  { zeile: '_vorfuehrungSchleifeTimer = setTimeout(', grund: 'Ablauf der Vorführung; Proben warten auf ihn oder räumen ihn ab' },
  { zeile: '_vorfuehrungWarnTimer = setTimeout(', grund: 'Ablauf der Vorführung (Warnung vor dem Zurücksetzen)' },
  { zeile: '_vorfuehrungLeerlaufTimer = setTimeout(', grund: 'Ablauf der Vorführung (Zurücksetzen nach Leerlauf)' },
  { zeile: 'setTimeout(fertig, VOR_DEPOT_NACHLADEN_DECKEL_MS)', grund: 'Nachladen der Begleitdatei, nur gehostet; im Produkt ausgeschnitten, unter ladeKern nie erreicht' },
  { zeile: 'setTimeout(ende, 600000)', grund: 'Obergrenze eines laufenden Vorgangs; sein Ende ist der Zweck' },
  { zeile: '_hintergrundWipeTimer = setTimeout(', grund: 'Frist des Hintergrund-Wipes; Proben prüfen genau diesen Ablauf' },
  { zeile: '_autoDateiSchreibenTimer = setTimeout(', grund: 'Entprellung des automatischen Dateischreibens; das Schreiben ist der Zweck' },
]);

function funde(quelle) {
  const aus = [];
  quelle.split('\n').forEach((z, i) => {
    if (!/\bsetTimeout\(/.test(z)) return;
    if (/_ohneProzessHalt\(setTimeout\(/.test(z)) return;
    const kurz = /setTimeout\([\s\S]*,\s*(\d+)\s*\)/.exec(z);
    if (kurz && Number(kurz[1]) <= 1000) return;
    if (ERLAUBT.some((e) => z.includes(e.zeile))) return;
    // Mehrzeilig: die Verzögerung steht weiter unten, als Zahl ≤ 1000 in der schließenden Zeile.
    const rest = quelle.split('\n').slice(i + 1, i + 40).join('\n');
    const zu = /^\s*\}\)?\s*,\s*(\d+)\s*\)/m.exec(rest);
    if (zu && Number(zu[1]) <= 1000) return;
    aus.push((i + 1) + ': ' + z.trim().slice(0, 120));
  });
  return aus;
}

test('[Kern·Zeitgeber] jeder setTimeout über 1 s läuft durch _ohneProzessHalt oder steht mit Grund auf der Liste', () => {
  assert.deepEqual(funde(kernEigen()), []);
  assert.ok(ERLAUBT.every((e) => e.grund.length > 10), 'jeder Eintrag nennt einen Grund');
});

test('[Kern·Zeitgeber·Rot-Beweis] ein neuer ungeschützter Zeitgeber über 1 s fällt, ein kurzer oder geschützter nicht', () => {
  const q = kernEigen();
  assert.equal(funde(q + '\nsetTimeout(() => neu(), 5000);\n').length, 1);
  assert.equal(funde(q + '\nsetTimeout(() => neu(), 200);\n').length, 0);
  assert.equal(funde(q + '\n_ohneProzessHalt(setTimeout(() => neu(), 5000));\n').length, 0);
});

/* Gemessen wird im Kind, wie lange der Prozess NACH der Meldung noch lebt — nicht die Gesamtdauer samt Prozessstart und
   ladeKern(), die unter der Last der vollen Suite um Sekunden schwankten (Befund ZEITPROBEN-SUITE-LAST, 05.11.2026). */
const nachDerMeldung = (kernPfad, vorlaufMs = 0) => {
  const ladeOpts = kernPfad ? JSON.stringify({ htmlPfad: kernPfad, backen: true }) : '';
  const skript = 'const _bis = Date.now() + ' + Number(vorlaufMs) + '; while (Date.now() < _bis) {} ' + 'const { V } = require(' + JSON.stringify(path.join(__dirname, 'load-kern.js')) + ').ladeKern(' + ladeOpts + '); V.ui.toast("Probe", "info");'
    + ' const t1 = Date.now(); process.on("exit", () => process.stderr.write("\\nNACH_DEM_ENDE " + (Date.now() - t1) + "\\n"));';
  const r = spawnSync(process.execPath, ['-e', skript], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', env: { ...process.env, NODE_TEST_CONTEXT: '' } });
  const m = [...String(r.stderr).matchAll(/NACH_DEM_ENDE (\d+)/g)].pop();
  assert.ok(m, 'das Kind meldet seine Wartezeit (Status ' + r.status + ')');
  return Number(m[1]);
};
test('[Kern·Zeitgeber·Toast] ein Prozess, der eine Meldung zeigt, endet ohne Warten — ohne den Helfer wartet er sie ab (Rot-Beweis)', () => {
  const ohne = nachDerMeldung(null);
  assert.ok(ohne < 2500, 'ui.toast() hält den Prozess nicht offen (' + ohne + ' ms)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-zeitgeber-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    const quelle = fs.readFileSync(KERN, 'utf8');
    const ohneHelfer = quelle.replace('_ohneProzessHalt(setTimeout(() => el.remove(), dauer))', 'setTimeout(() => el.remove(), dauer)');
    assert.notEqual(ohneHelfer, quelle, 'die Stelle der Meldungsleiste steht im Kern');
    fs.writeFileSync(kopie, ohneHelfer);
    const mit = nachDerMeldung(kopie);
    assert.ok(mit >= 3000 && mit - ohne >= 2000, 'Rot-Beweis: ohne den Helfer wartet der Prozess die Meldung ab (' + mit + ' gegen ' + ohne + ' ms)');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Lastsimulation: ein Kind, das vor dem Ende künstlich langsam ist (wie unter der Last der vollen Suite), gilt nicht als
   gehalten. Die alte Messung der Gesamtdauer schlug hier an (Befund ZEITPROBEN-SUITE-LAST, 05.11.2026). */
test('[Kern·Zeitgeber·Toast·Last] ein langsamer Prozessstart zählt nicht als Warten auf einen Zeitgeber', () => {
  const langsam = nachDerMeldung(null, 3000);
  assert.ok(langsam < 2500, 'gemessen wird nur die Wartezeit nach dem Ende (' + langsam + ' ms)');
});
