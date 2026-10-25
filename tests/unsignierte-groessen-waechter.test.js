'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wächter gegen die Klasse (U2-ADR-473 W2, Befund zur Mindestschrift im unsignierten Erscheinungs-Weg): KEIN unsigniert
   einlassbarer Größenwert unter der Mindestschrift des Kerns — weder im Kern, noch im Schema, noch am Anwendeort.
   ────────────────────────────────────────────────────────────────────────────
   Der Einzelfall: das Erscheinungs-Modul nahm `1px` für Beschriftung und Wert an; sein Register hat kein `nurGeprueft`, jede
   Datei bringt es unsigniert herein. Geschlossen in `erscheinungModulPruefen` (Untergrenze aus ERSCHEINUNGSBILD_REGELN).
   Die Klasse: jedes Register ohne `nurGeprueft`, dessen Schema ein Feld mit CSS-Längenmaß trägt. Gefunden wird es nicht über eine
   Namensliste, sondern über die Schemas: ein Feld, dessen Muster `16px` oder `1rem` annimmt, aber weder Freitext noch eine Zahl
   ohne Einheit, ist ein Größenfeld. Für jedes verlangt der Wächter, dass Kern UND Schema einen Wert knapp unter
   `schriftMindestPx` ablehnen. Ein neues unsigniertes Register mit Größenfeld ohne Untergrenze wird damit rot.
   Dazu der Anwendeort: `erscheinungAnwenden` liest die Depot-Datei, die sich von Hand ändern lässt, und prüft darum selbst.
   Ohne ajv (Schicht 1): die Muster werden als JS-RegExp gelesen, die Felder flach je Ebene.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');
const { schemaPfad } = require('../tools/modul-schemas-messen.js');
const { ALLE_REGISTER_BEISPIELE } = require('./helfer/register-beispiele.js');

const WURZEL = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');

function groessenFelder(schema) {
  const aus = [];
  const gehe = (s, pfad) => {
    if (!s || typeof s !== 'object') return;
    if (typeof s.pattern === 'string') {
      let re = null;
      try { re = new RegExp(s.pattern); } catch (e) { re = null; }
      // Ein Längenmuster nimmt `16px`/`1rem` an, aber weder Freitext noch eine Zahl ohne Einheit.
      const laenge = re && (re.test('16px') || re.test('1rem')) && !re.test('Probe') && !re.test('16');
      if (laenge) aus.push([pfad, re]);
    }
    for (const [k, v] of Object.entries(s.properties || {})) gehe(v, pfad.concat(k));
    if (s.items) gehe(s.items, pfad.concat('[]'));
  };
  gehe(schema, []);
  return aus;
}
function setzeFeld(modul, pfad, wert) {
  const m = JSON.parse(JSON.stringify(modul));
  if (pfad.length !== 1) return null;   // verschachtelt: heute kein Fall — der Wächter meldet es, statt es zu übergehen
  m[pfad[0]] = wert;
  return m;
}
function feldAngenommen(ergebnis, feld) {
  if (!ergebnis || !ergebnis.gueltig) return false;
  if ((ergebnis.verworfene || []).some((v) => v.schluessel === feld)) return false;
  return true;
}

const { V } = ladeKern({ zusatzBindungen: ['ERSCHEINUNGSBILD_REGELN'] });
const GRENZE = V.__zusatz.ERSCHEINUNGSBILD_REGELN.schriftMindestPx;
// Knapp unter der Grenze, in jeder Einheit des Musters (rem/em zu 16 px).
const ZU_KLEIN = [(GRENZE - 0.1) + 'px', ((GRENZE - 0.1) / 16).toFixed(4) + 'rem', ((GRENZE - 0.1) / 16).toFixed(4) + 'em'];
const UNSIGNIERT = V.EINLASS_REGISTER.filter((r) => !r.nurGeprueft);
const TREFFER = [];
for (const reg of UNSIGNIERT) {
  const p = path.join(WURZEL, schemaPfad(reg.typ));
  if (!fs.existsSync(p)) continue;
  for (const [pfad, re] of groessenFelder(JSON.parse(fs.readFileSync(p, 'utf8')))) TREFFER.push({ reg, pfad, re });
}

test('[Wächter·unsignierte Größen] die Suche findet die bekannten Größenfelder (Positivkontrolle)', () => {
  assert.equal(GRENZE, 10, 'Vorbedingung: die Mindestschrift des Kerns (U2-ADR-473)');
  const erscheinung = TREFFER.filter((t) => t.reg.typ === 'erscheinung').map((t) => t.pfad.join('.')).sort();
  assert.deepEqual(erscheinung, ['abschnitt', 'gruppe', 'label', 'titel', 'wert']);
});

// Diskriminante des Klassenwächters: jedes unsignierte Größenfeld, das Schema oder Kern unter der Mindestschrift annimmt.
function groessenVerstoesse(treffer) {
  const fehler = [];
  for (const { reg, pfad, re } of treffer) {
    const beispiel = ALLE_REGISTER_BEISPIELE.find((b) => b.typ === reg.typ);
    if (!beispiel) { fehler.push('kein Register-Beispiel für ' + reg.typ); continue; }
    for (const wert of ZU_KLEIN) {
      if (re.test(wert)) fehler.push(`${reg.typ}.${pfad.join('.')}: Schema nimmt ${wert} an`);
      const m = setzeFeld(beispiel.modul, pfad, wert);
      if (!m) { fehler.push(`${reg.typ}.${pfad.join('.')}: verschachteltes Größenfeld — Wächter erweitern`); continue; }
      if (feldAngenommen(reg.pruefen(m), pfad[0])) fehler.push(`${reg.typ}.${pfad.join('.')}: Kern nimmt ${wert} an`);
    }
  }
  return fehler;
}
test('[Wächter·unsignierte Größen] jedes unsignierte Größenfeld lehnt unter der Mindestschrift ab — im Kern und im Schema', () => {
  assert.deepEqual(groessenVerstoesse(TREFFER), []);
});

test('[Wächter·unsignierte Größen·Rot-Beweis] ein Größenfeld ohne Untergrenze wird gefunden und schlägt an', () => {
  const ohneGrenze = { type: 'object', properties: { groesse: { type: 'string', pattern: '^\\d+(\\.\\d+)?(px|rem|em)$' }, name: { type: 'string', pattern: '^[a-z]+$' } } };
  const gefunden = groessenFelder(ohneGrenze);
  assert.deepEqual(gefunden.map(([pfad]) => pfad.join('.')), ['groesse'], 'nur das Größenfeld, nicht das Namensfeld');
  assert.ok(ZU_KLEIN.every((w) => gefunden[0][1].test(w)), 'das Muster ohne Grenze nimmt jeden zu kleinen Wert an — der Wächter meldete es');
  // Und der Kern-Teil: ein Prüfer, der alles annimmt, wird als „nimmt an“ erkannt.
  assert.equal(feldAngenommen({ gueltig: true, verworfene: [] }, 'groesse'), true);
  assert.equal(feldAngenommen({ gueltig: true, verworfene: [{ schluessel: 'groesse', grund: 'mindestgroesse' }] }, 'groesse'), false);
});

/* Der Anwendeort am echten Quelltext, mit dem echten Prüfer des Kerns: ein zu kleiner Wert aus der Datei setzt nichts. */
function anwendeortSetzt(text, erscheinung) {
  const a = text.indexOf('function erscheinungAnwenden(');
  const quelle = text.slice(a, text.indexOf('\n}\n', a) + 2);
  const k = text.indexOf('const _VD_ERSCHEINUNG_FS_CSS_EIGENSCHAFTEN');
  const tabelle = text.slice(k, text.indexOf('});', k) + 3);
  const ctx = vm.createContext({ erscheinungModulPruefen: V.erscheinungModulPruefen });
  vm.runInContext(tabelle + '\n' + quelle + '\nglobalThis.__anwenden = erscheinungAnwenden;', ctx);
  const werte = {};
  ctx.__anwenden(erscheinung, { style: { setProperty(n, w) { werte[n] = w; }, removeProperty(n) { delete werte[n]; } } });
  return werte;
}
test('[Wächter·unsignierte Größen·Anwendeort] erscheinungAnwenden setzt aus der Datei nur, was der Einlass auch annähme', () => {
  assert.deepEqual(anwendeortSetzt(KERN, { label: '1px', wert: '13px', titel: '0.1em', gruppe: '16px' }), { '--fs-role-gruppe': '16px' });
  assert.deepEqual(anwendeortSetzt(KERN, { label: '10px', wert: '14px' }), { '--fs-role-label': '10px', '--fs-role-wert': '14px' }, 'Gegenprobe: an der Grenze gilt');
});
test('[Wächter·unsignierte Größen·Anwendeort·Rot-Beweis] ohne die Prüfung am Anwendeort käme 1px an', () => {
  const zeile = "      if (typeof e[feld] === 'string' && e[feld] && zulaessig(feld, e[feld])) r.style.setProperty(eigenschaft, e[feld]);";
  assert.ok(KERN.includes(zeile), 'die Zeile steht im Anwendeort');
  const ohne = KERN.replace(zeile, "      if (typeof e[feld] === 'string' && e[feld]) r.style.setProperty(eigenschaft, e[feld]);");
  assert.equal(anwendeortSetzt(ohne, { label: '1px' })['--fs-role-label'], '1px');
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Positivkontrolle, Anwendeort und Rot-Beweise sind Konstruktions-Form (feste Werte gegen erwartete Ergebnisse). */
module.exports = {
  PROBEN: [
    { fuer: '[Wächter·unsignierte Größen] jedes unsignierte Größenfeld lehnt unter der Mindestschrift ab — im Kern und im Schema', diskriminante: groessenVerstoesse },
  ],
};
