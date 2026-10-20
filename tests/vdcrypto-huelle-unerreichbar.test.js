'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Befund VDCRYPTO-HUELLE-GLOBAL-ERREICHBAR (MITTEL, 18.10.2026). Der gepinnte Krypto-Block steht als eigenes klassisches
   <script> vor dem Kern, ohne Funktionsgrenze. Darum ist `VdCrypto` als `const` Teil der globalen lexikalischen Umgebung:
   nicht `window.VdCrypto`, aber unter dem bloßen Namen aus jedem anderen Script derselben Seite erreichbar. Die Hülle gibt
   den lebenden Sitzungsschlüssel nicht heraus. Über `depotSchluessel()` und `halterSignatur()` leitet sie aber mit ihm ab,
   und das kann jeder, der `VdCrypto` erreicht. Der Grundsatz vom 18.09.2026 (Kommentar im Block: „geschützt wird das
   GEHEIMNIS, nicht der ALGORITHMUS“) gilt für die Primitive. Für die Hülle trägt er nicht, denn sie hält das Geheimnis.

   Gemessen am 17.10.2026 in Chromium, lokale Datei, Kanon 981311a5c: `typeof VdCrypto` === 'object', `typeof
   window.VdCrypto` === 'undefined'. Nach `setupSession` liefert `VdCrypto.depotSchluessel()` aus der Seite einen
   nutzbaren AES-GCM-Schlüssel (extractable=false).

   Diese Probe stellt die Lage ohne Browser nach. Ein vm-Kontext teilt die globale lexikalische Umgebung über mehrere
   Scripts wie ein Realm: der Block läuft als ein Script, die Frage als ein zweites. Voraussetzung eines Angriffs ist
   eingeschleuster Code im Realm; dieselbe Klasse schließt die CSP ohne `unsafe-inline` von der anderen Seite.

   Erwartete Röte: [VdCrypto·Hülle] ist `todo` mit der Kennung, bis der Fix landet. Positivkontrolle und Rot-Beweis
   zeigen, dass die Messung Erreichbarkeit überhaupt sieht und eine Funktionsgrenze sie aufhebt.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const SIGNATUR = 'const VdCrypto = ' + '(function';   // geteilt, sonst zählt die Block-Propagation diese Datei als Träger

/* Das <script>-Element, in dem die Hülle steht, als Text. */
function blockMitHuelle(html) {
  const s = html.indexOf(SIGNATUR);
  assert.ok(s > 0, 'Vorbedingung: der Kern trägt die Hülle');
  // Nur ein echter Tag am Zeilenanfang: der Block nennt `<script>` auch in seinen Kommentaren.
  let auf = -1;
  for (const m of html.matchAll(/^[ \t]*<script(\s[^>]*)?>[ \t]*$/gm)) if (m.index < s) auf = m.index;
  const inhalt = html.indexOf('>', auf) + 1;
  const zu = html.indexOf('</script>', s);
  assert.ok(auf > 0 && zu > s, 'Vorbedingung: die Hülle steht in einem <script>-Element');
  return html.slice(inhalt, zu);
}

/* Führt `quelle` als erstes Script in einem frischen Realm aus und fragt in einem zweiten Script, was es von der Hülle sieht. */
function vonAussen(quelle) {
  const ctx = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, atob, btoa, console });
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  new vm.Script(quelle, { filename: 'block.js' }).runInContext(ctx);
  return new vm.Script(
    "(function () { try { return { typ: typeof VdCrypto, ableiten: typeof VdCrypto.depotSchluessel, signieren: typeof VdCrypto.halterSignatur }; }" +
    " catch (e) { return { typ: 'unerreichbar', fehler: e.name }; } })()", { filename: 'fremd.js' }).runInContext(ctx);
}

test('[VdCrypto·Hülle] ein anderes Script derselben Seite erreicht die Krypto-Hülle nicht', { todo: 'VDCRYPTO-HUELLE-GLOBAL-ERREICHBAR offen: der Block steht ohne Funktionsgrenze, Fix nach RbB (Gegenprüfung Krypto-Strang)' }, () => {
  const sicht = vonAussen(blockMitHuelle(fs.readFileSync(KERN, 'utf8')));
  assert.equal(sicht.typ, 'unerreichbar', 'von außen sichtbar: ' + JSON.stringify(sicht));
});

/* Positivkontrolle und Rot-Beweis an einem kleinen Block derselben Form: ohne Grenze erreichbar, mit Grenze nicht. */
const MUSTER = SIGNATUR + ' () { let s = null; return Object.freeze({ depotSchluessel: () => s, halterSignatur: () => s }); })();\n';
test('[VdCrypto·Hülle·Positivkontrolle] ohne Funktionsgrenze sieht das zweite Script die Hülle samt Ableitung und Signatur', () => {
  // Das Ergebnis kommt aus dem vm-Realm, sein Prototyp ist ein anderer: darum feldweise in ein Objekt dieses Realms gehoben.
  const { typ, ableiten, signieren } = vonAussen(MUSTER);
  assert.deepEqual({ typ, ableiten, signieren }, { typ: 'object', ableiten: 'function', signieren: 'function' });
});
test('[VdCrypto·Hülle·Rot-Beweis] mit Funktionsgrenze um denselben Block ist sie unerreichbar', () => {
  assert.equal(vonAussen('(function () {\n' + MUSTER + '})();\n').typ, 'unerreichbar');
});
