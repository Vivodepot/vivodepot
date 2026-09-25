'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Zeitgrenze je Test — ohne dass jede Testdatei oder jeder Aufruf sie selbst setzen muss
   (L3, 19.09.2026, Auftrag; Anlass: ein 11 Stunden verwaister Testlauf hat den L2-Push
   über die Lastschranke getrieben, s. Bericht verwaiste-test-prozesse-zeitgrenze-plan-2026-09-19.md).

   DAS LOCH: node --test kennt --test-timeout, aber ohne das Flag gilt intern der Wert 0
   („kein Limit" — gemessen 19.09.2026: ein Worker-Prozess trägt --test-timeout=0 in seiner
   eigenen execArgv, wenn die Vorgabe nirgends gesetzt wurde). `npm test` trägt das Flag
   (package.json), ein direkter Aufruf `node --test DATEI.test.js` — der übliche Weg beim
   gezielten Prüfen EINER Datei, auch in dieser Sitzung ständig benutzt — trug es bisher NICHT.

   WARUM KEIN PATCH AUF require('node:test'): 146 von rund 1200 Testdateien binden node:test
   OHNE Destrukturierung (`const test = require('node:test'); test(...)`) — sie rufen damit das
   MODUL-OBJEKT SELBST als Funktion auf, nicht eine seiner Eigenschaften. `node:test` liegt zudem
   NICHT in require.cache (gemessen 19.09.2026: 'node:test' in require.cache ist false — ein
   eingebautes Modul, kein dateibasiertes) — der zurückgegebene Funktions-Wert selbst lässt sich
   für spätere require()-Aufrufe darum nicht austauschen, nur seine Eigenschaften ließen sich
   mutieren. Das hätte 146 Dateien ungeschützt gelassen.

   DER WEG HIER STATT DESSEN: dieses Modul (per --require geladen) prüft in `process.execArgv`
   — das trägt im ÄUSSEREN Prozess GENAU die node-Flags des tatsächlichen Aufrufs, nicht die
   volle Vorgabe-Liste (die erscheint erst in den intern gestarteten Worker-Prozessen je
   Testdatei) — ob --test-timeout schon irgendwo gesetzt ist. Fehlt es, startet dieses Modul
   DENSELBEN Aufruf NOCH EINMAL, jetzt mit dem Flag ergänzt, wartet synchron auf das Ergebnis und
   beendet sich mit demselben Exit-Code. Das trifft den echten node --test-Prozess, unabhängig
   davon, WIE die Testdatei node:test bindet — kein Patch, keine Testdatei-Änderung nötig.

   RESTLÜCKE, ehrlich benannt: ein `node --test DATEI` OHNE --require (dieses Modul also gar
   nicht geladen) bleibt technisch ungedeckt — kein Mechanismus im Repo kann das erzwingen, ohne
   in die Shell-Umgebung jedes Aufrufers einzugreifen. Der Rückhalt dafür ist
   tools/verwaiste-test-prozesse-pruefen.js (läuft unabhängig vom Aufrufweg) und die Sofortregel,
   `npm run test:datei -- DATEI` statt eines rohen `node --test DATEI` zu nutzen (dieses Skript
   lädt das Modul hier automatisch).

   DER WERT: 19./20.09.2026 gegen den vollen Bestand auf origin/u2-kanon @ fdfdbfcf gemessen —
   ein Lauf mit --test-timeout=120000 --test-concurrency=1 über den vollen Testbestand
   (tests/ und tools/, dieselben Muster wie im npm-Skript test) — 10468 Tests, 85 Minuten, Last
   unter 8 während des gesamten Laufs. 13 Fehlschläge im Messlauf waren alle
   vorbestehend/umgebungsbedingt (fehlende Fremdmodule vcard-parser/ical.js, ein bekannter
   --arbeitsstand-Befund) — keiner davon ein Hänger, keiner verändert diese Zahl.

   VORGABE 300000 (20.09.2026, nach Rückmeldung zur ersten Fassung mit 688000 — bei einer
   pauschalen Grenze fürs Maximum fräße ein echter Hänger in jeder anderen Datei bis zu elf
   Minuten): Drei Tests lagen im Messlauf über 100000 ms und tragen jetzt eine EIGENE, benannte
   { timeout: N } direkt am Test (wird von diesem Modul nie überschrieben, nur ein FEHLENDES
   timeout wird ergänzt) — pruefstand-jede-probe-wird-vom-waechter-benutzt (229195.58 ms,
   tests/pruefstand-bindung.test.js), „[Stufe 2] 30 von 32 Kandidaten sind scharf" (102063.92 ms,
   trug schon vorher { timeout: 300000 }) und „[Aufräum-Probe] die modul-fixtur-Läufe…"
   (101540.73 ms, beide in tests/klausel-proben-schaerfe-stufe2.test.js). Alle drei sind echte
   Arbeit (Wächter-Instrumentierung bzw. wiederholte Modul-Fixtur-Läufe), kein Hänger. Eine neue,
   echt langsamere Testdatei braucht dieselbe eigene, begründete Ausnahme, nicht eine Anhebung
   dieser Zahl. */
const { spawnSync } = require('node:child_process');

const VORGABE_MS = Number(process.env.VD_TEST_TIMEOUT_MS) || 300000; // s. Kopf-Kommentar: Messung 19./20.09.2026, Vorgabe 20.09.2026
const TEST_TIMEOUT_GESETZT = /^--test-timeout(=|$)/;

function schonGesetzt(execArgv) {
  return execArgv.some((a, i) => TEST_TIMEOUT_GESETZT.test(a) && (a.includes('=') || typeof execArgv[i + 1] !== 'undefined'));
}

function istTestLauf(execArgv) {
  return execArgv.some((a) => a === '--test' || a.startsWith('--test='));
}

function neuStarten() {
  const argv = [...process.execArgv, '--test-timeout=' + VORGABE_MS, ...process.argv.slice(1)];
  const r = spawnSync(process.execPath, argv, { stdio: 'inherit' });
  if (r.error) throw r.error;
  process.exit(r.status === null ? 1 : r.status);
}

if (istTestLauf(process.execArgv) && !schonGesetzt(process.execArgv)) neuStarten();

module.exports = { VORGABE_MS, schonGesetzt, istTestLauf };
