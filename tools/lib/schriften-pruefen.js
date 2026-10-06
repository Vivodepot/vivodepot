'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   schriften-pruefen.js — die Schriften-Prüfung des Kerns, für den Bau (v896, U2-ADR-473)
   ────────────────────────────────────────────────────────────────────────────
   KEIN SPIEGEL: Die Prüfung von `schriften[]` steht genau einmal im Kern, in zwei Teilen —
     · FORM im <script id="erscheinungsbild"> (_ebSchriftenFormPruefen; ab `const _EB_SCHRIFT_FELDER`
       bis vor `function _ebSchriftenAnwenden`),
     · LESER und TIEFE im Hauptskript (_ebB64Bytes, _ebTtfTabellen, _ebTtfCmap, _ebWoff2Gueltig,
       _ebSchriftenTiefePruefen; ab `const _EB_B64_ZEICHEN` bis vor dem Kommentar `PDF-SCHRIFT EINER MARKE PRÜFEN`).
   Dieses Modul schneidet beide aus dem Kerntext und führt sie in einem leeren vm-Kontext aus (rein: kein DOM, kein
   atob). `_ebSchriftenPruefen` = Form, und für jeden Eintrag ohne Form-Fund die Tiefe. Fehlt ein Anker, wirft es,
   statt still nichts zu prüfen.
   ════════════════════════════════════════════════════════════════════════════ */
const vm = require('node:vm');

const TEILE = [
  ['const _EB_SCHRIFT_FELDER = ', 'function _ebSchriftenAnwenden('],
  ['const _EB_B64_ZEICHEN = ', '/* PDF-SCHRIFT EINER MARKE PRÜFEN'],
];

function schriftenPrueferAusKern(kernText) {
  let code = '';
  for (const [anfang, ende] of TEILE) {
    const a = kernText.indexOf(anfang), e = kernText.indexOf(ende, a);
    if (a < 0 || e < 0) throw new Error('schriften-pruefen: Anker der Schriften-Prüfung im Kern nicht gefunden (' + (a < 0 ? anfang : ende) + ')');
    code += kernText.slice(a, e) + '\n';
  }
  const kontext = vm.createContext({});
  vm.runInContext(code + ';this.__p = { _ebB64Bytes, _ebTtfTabellen, _ebTtfCmap, _ebWoff2Gueltig, _ebSchriftenFormPruefen, _ebSchriftenTiefePruefen };', kontext);
  const p = kontext.__p;
  p._ebSchriftenPruefen = (liste, R) => {
    const form = p._ebSchriftenFormPruefen(liste, R);
    if (!Array.isArray(liste)) return form;
    const mitFund = new Set(form.map((f) => f.schluessel));
    return form.concat(p._ebSchriftenTiefePruefen(liste.map((e, i) => (mitFund.has(i) ? null : e))));
  };
  return p;
}

module.exports = { schriftenPrueferAusKern };
