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
const { execFileSync } = require('node:child_process');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

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
  assert.deepEqual(funde(fs.readFileSync(KERN, 'utf8')), []);
  assert.ok(ERLAUBT.every((e) => e.grund.length > 10), 'jeder Eintrag nennt einen Grund');
});

test('[Kern·Zeitgeber·Rot-Beweis] ein neuer ungeschützter Zeitgeber über 1 s fällt, ein kurzer oder geschützter nicht', () => {
  const q = fs.readFileSync(KERN, 'utf8');
  assert.equal(funde(q + '\nsetTimeout(() => neu(), 5000);\n').length, 1);
  assert.equal(funde(q + '\nsetTimeout(() => neu(), 200);\n').length, 0);
  assert.equal(funde(q + '\n_ohneProzessHalt(setTimeout(() => neu(), 5000));\n').length, 0);
});

const bisZumEnde = (kernPfad) => {
  const t0 = Date.now();
  const ladeOpts = kernPfad ? JSON.stringify({ htmlPfad: kernPfad, backen: true }) : '';
  execFileSync(process.execPath, ['-e', 'const { V } = require(' + JSON.stringify(path.join(__dirname, 'load-kern.js')) + ').ladeKern(' + ladeOpts + '); V.ui.toast("Probe", "info");'],
    { stdio: 'ignore', env: { ...process.env, NODE_TEST_CONTEXT: '' } });
  return Date.now() - t0;
};
test('[Kern·Zeitgeber·Toast] ein Prozess, der eine Meldung zeigt, endet ohne Warten — ohne den Helfer wartet er sie ab (Rot-Beweis)', () => {
  const ohne = bisZumEnde(null);
  assert.ok(ohne < 2500, 'ui.toast() hält den Prozess nicht offen (' + ohne + ' ms)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-zeitgeber-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    const quelle = fs.readFileSync(KERN, 'utf8');
    const ohneHelfer = quelle.replace('_ohneProzessHalt(setTimeout(() => el.remove(), aktion ? 8000 : 3200))', 'setTimeout(() => el.remove(), aktion ? 8000 : 3200)');
    assert.notEqual(ohneHelfer, quelle, 'die Stelle der Meldungsleiste steht im Kern');
    fs.writeFileSync(kopie, ohneHelfer);
    const mit = bisZumEnde(kopie);
    assert.ok(mit >= 3000 && mit - ohne >= 2000, 'Rot-Beweis: ohne den Helfer wartet der Prozess die Meldung ab (' + mit + ' gegen ' + ohne + ' ms)');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
