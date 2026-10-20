'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Befund APP-SCRIPT-OHNE-GRENZE (MITTEL, 18.10.2026). Jede HTML-Anwendung, die den Krypto-Block trägt, hat ein App-Script, das
   mit ihm arbeitet. Hat dieses Script keine Funktionsgrenze, liegt sein ganzer Zustand in der globalen lexikalischen Umgebung
   und ist aus jedem anderen Script derselben Seite erreichbar. In der Lese-App gehört dazu `let data`, das entschlüsselte
   Depot. Der Kern hat seine Grenze seit dem 18.09.2026 (Script 2 ist ein IIFE, `@vd-kern-verschluss-ende`).

   Diese Probe zählt die Träger aus dem Quelltext auf, nicht aus einer Liste. Für jeden sagt sie, ob das App-Script eine
   Grenze hat. Die offenen stehen als `todo` mit der Kennung da, so ist die Lücke bei jedem Lauf sichtbar. Ein neuer Träger
   ohne Zeile in ERWARTET macht die Probe rot. Abnahme je Träger: Verschluss wie im Kern, dann die Hülle um den Krypto-Block,
   dann die Erreichbarkeitsprobe für diesen Träger. Reihenfolge: Lese-App, Studio, Schlüssel-Teilen, VC-Issuer.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const SIGNATUR = 'const VdCrypto = ' + '(function';   // geteilt, sonst zählt die Block-Propagation diese Datei als Träger

/* Die inline-<script>-Elemente einer Seite, nur echte Tags am Zeilenanfang (der Block nennt `<script>` auch in Kommentaren). */
function skripte(html) {
  const raus = [];
  const re = /^[ \t]*<script(\s[^>]*)?>[ \t]*$/gm;
  let m;
  while ((m = re.exec(html))) {
    if (/\ssrc=/.test(m[1] || '')) continue;
    const start = m.index + m[0].length;
    const ende = html.indexOf('</script>', start);
    raus.push({ start, text: html.slice(start, ende) });
  }
  return raus;
}
/* Hat das Script eine Funktionsgrenze um seinen ganzen Inhalt? Erlaubt davor nur die Direktive "use strict". */
function hatGrenze(text) {
  const ohne = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').trim()
    .replace(/^(['"])use strict\1;?\s*/, '');
  return /^\((async\s+)?(function\b|\(\)\s*=>)/.test(ohne) && /\}\)\(\);?$/.test(ohne);
}
/* Das App-Script: das längste Script nach dem Block, das einen Top-Level-Namen des Blocks benutzt. */
function appScript(html) {
  const s = skripte(html);
  const i = s.findIndex((x) => x.text.includes(SIGNATUR));
  assert.ok(i >= 0, 'Vorbedingung: der Krypto-Block steht in einem Script');
  const namen = [...s[i].text.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1] || m[2]);
  const nutzer = s.slice(i + 1).filter((x) => namen.some((n) => new RegExp('(^|[^\\w$.])' + n.replace(/\$/g, '\\$') + '\\b').test(x.text)));
  assert.ok(nutzer.length, 'Vorbedingung: ein Script nach dem Block benutzt ihn');
  return nutzer.reduce((a, b) => (b.text.length > a.text.length ? b : a));
}
function traeger() {
  return fs.readdirSync(REPO).filter((f) => f.endsWith('.html'))
    .filter((f) => fs.readFileSync(path.join(REPO, f), 'utf8').includes(SIGNATUR)).sort();
}

/* Der Stand je Träger. Wird ein Träger geschlossen, wird seine Zeile `true` und sein todo fällt. */
const ERWARTET = {
  'vivodepot.html': true,
  'vivodepot-lesen.html': false,
  'vivodepot-studio.html': false,
  'vivodepot-schluessel-teilen.html': false,
  'vivodepot-vc-issuer.html': false,
};
const vorhanden = (f) => fs.existsSync(path.join(REPO, f));
const grenze = (f) => hatGrenze(appScript(fs.readFileSync(path.join(REPO, f), 'utf8')).text);

test('[App-Script·Träger] jeder Träger des Krypto-Blocks steht in der Aufzählung', () => {
  assert.deepEqual(traeger(), Object.keys(ERWARTET).filter(vorhanden).sort(), 'ein Träger ohne Zeile in ERWARTET oder eine Zeile ohne Träger');
});
test('[App-Script·Grenze] Kern: das App-Script hat eine Funktionsgrenze', () => {
  assert.equal(grenze('vivodepot.html'), true);
});
test('[App-Script·Grenze] Lese-App: das App-Script hat eine Funktionsgrenze (auch `let data`)', { todo: 'APP-SCRIPT-OHNE-GRENZE offen: Lese-App' }, () => {
  assert.equal(grenze('vivodepot-lesen.html'), true);
});
test('[App-Script·Grenze] Studio: das App-Script hat eine Funktionsgrenze', { todo: 'APP-SCRIPT-OHNE-GRENZE offen: Studio' }, () => {
  assert.equal(grenze('vivodepot-studio.html'), true);
});
test('[App-Script·Grenze] Schlüssel-Teilen: das App-Script hat eine Funktionsgrenze', { todo: 'APP-SCRIPT-OHNE-GRENZE offen: Schlüssel-Teilen' }, () => {
  assert.equal(grenze('vivodepot-schluessel-teilen.html'), true);
});
test('[App-Script·Grenze] VC-Issuer: das App-Script hat eine Funktionsgrenze', { todo: 'APP-SCRIPT-OHNE-GRENZE offen: VC-Issuer' }, () => {
  assert.equal(grenze('vivodepot-vc-issuer.html'), true);
});
test('[App-Script·Stand] die Liste der offenen Träger stimmt mit ERWARTET überein', () => {
  const offen = Object.keys(ERWARTET).filter(vorhanden).filter((f) => !grenze(f)).sort();
  const soll = Object.keys(ERWARTET).filter(vorhanden).filter((f) => !ERWARTET[f]).sort();
  assert.deepEqual(offen, soll, 'offen ohne Grenze: ' + JSON.stringify(offen));
});

test('[App-Script·Rot-Beweis] die Erkennung unterscheidet offen und begrenzt', () => {
  assert.equal(hatGrenze("'use strict';\nlet data = null;\nfunction boot() {}\ndocument.addEventListener('DOMContentLoaded', boot);\n"), false);
  assert.equal(hatGrenze('"use strict";\n(function() {\nlet data = null;\n})();\n'), true);
  assert.equal(hatGrenze('(() => {\nlet data = null;\n})();'), true);
  assert.equal(hatGrenze('(function() { let a; })();\nlet b = 1;\n'), false, 'Code nach der Grenze ist offen');
});
