'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   SEKTOREN quelltextlich leer — der Kern bootet, WIZARDS bindet auf Lesezeit
   05.09.2026, U2-ADR-304 (Landkarte) → dieser Bau (der eigentliche Schnitt).
   ────────────────────────────────────────────────────────────────────────────
   ADR-304 maß zehn Stellen, alle in `const WIZARDS`, die bei quelltextlich leerem
   `SEKTOREN` die Skript-AUSWERTUNG selbst zum Absturz bringen — acht über
   `_katalogOptionen`, zwei über den `pvwiz`-Guard. Beide Stellen banden ihre
   Katalog-Auflösung bei der KONSTRUKTION, nicht beim Lesen.

   BEHOBEN, nicht nur gemessen: alle acht `_katalogOptionen`-Aufrufe in `WIZARDS`
   sind `get optionen()`, nicht mehr `optionen: …` — die Auflösung läuft bei jedem
   Lesezugriff frisch, nicht einmalig bei der Auswertung. `_katalogOptionen` selbst
   unterscheidet seither zwei Zustände, ohne Kennzeichen, ohne Modus:
     Bereich fehlt GANZ (kein Bündel geladen)  → Betriebszustand   → [] statt Wurf
     Bereich BEFÜLLT, DIESES Feld fehlt        → echter Tippfehler → Wurf wie vorher
   Der `pvwiz`-Guard folgt derselben Unterscheidung, ebenfalls auf Lesezeit verschoben
   (`get feld()`/`get frage()`/`get hilfetext()`).

   DER ROT-BELEG LÄUFT AN EINER VERWORFENEN KOPIE, nicht an der echten Datei:
   `KERN_HTML_PATH` lenkt `tests/load-kern.js` auf eine Kopie im Temp-Ordner um,
   in der das `SEKTOREN`-Array-Literal durch `[]` ersetzt ist — derselbe Kunstgriff
   wie in `tests/inline-texte-ratsche.test.js`. Der Arbeitsbaum wird nicht angefasst.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
/* Der Zustand „der Bereich fehlt GANZ" (U2-ADR-312/319) wird über `ladeKern({ ohneBereiche: true })`
   hergestellt: das Standard-Produkt ohne seine Bereichs-Module, Wizards und Situationen bleiben.
   (Bis 19.09.2026 schrieb diese Probe den Quelltext um — das eingebettete BUERGERMODUL_BUENDEL
   gibt es seit dem Schnitt nicht mehr, die Umschreibung warf „nicht gefunden".) */
function mitLeeremSektoren(fn) {
  const { ladeKern } = require('./load-kern.js');
  return fn({ ladeKern: (opts) => ladeKern(Object.assign({ ohneBereiche: true }, opts)) });
}

test('[SEKTOREN-leer] der Kern bootet mit quelltextlich leerem SEKTOREN — die zehn ADR-304-Stellen werfen nicht mehr', () => {
  mitLeeremSektoren(({ ladeKern }) => {
    const { V } = ladeKern();
    assert.equal(V.SEKTOREN.length, 0, 'Vorbedingung: SEKTOREN ist wirklich leer');
    assert.equal(V.WIZARDS.length, 7, 'alle sieben Assistenten werden weiterhin gebaut — die Auswertung bricht nicht ab');
  });
});

test('[SEKTOREN-leer] _katalogOptionen liefert [] statt zu werfen, wenn der Bereich ganz fehlt — und der Wizard liest den nativen Katalog', () => {
  mitLeeremSektoren(({ ladeKern }) => {
    const { V } = ladeKern();
    // B12-Reparatur (19.09.2026): die vierte Quelle (BEREICHE_NATIV_KATALOG) kennt die dreizehn
    // nativen Bereiche auch ohne gebackenes Bereichs-Modul — für sie fehlt „der Bereich ganz"
    // nicht mehr. Ein Bereich, den KEINE Quelle kennt, bleibt der Betriebszustand „leer, kein Wurf".
    assert.deepEqual(V._katalogOptionen('kein-solcher-bereich', 'irgendeine_kennung'), [], 'leerer Katalog + irgendeine Kennung → [], kein Wurf');
    const heirwiz = V.WIZARDS.find((w) => w.id === 'heirwiz');
    const fam = heirwiz.schritte.find((s) => s.feld && s.feld.id === 'maritalStatus');
    assert.deepEqual(fam.feld.optionen.map((o) => o.wert), ['verh', 'elp'], 'der native Katalog trägt die Optionswerte, auch ohne gebackenen Bereich');
  });
});

test('[SEKTOREN-leer] pvwiz liefert feld:null statt zu werfen, wenn der Bereich vorsorge ganz fehlt', () => {
  mitLeeremSektoren(({ ladeKern }) => {
    const { V } = ladeKern();
    const pvwiz = V.WIZARDS.find((w) => w.id === 'pvwiz');
    const besprochen = pvwiz.schritte.filter((s) =>
      s.ziel && s.ziel.sektor === 'advanceCare' && s.feld === null);
    assert.equal(besprochen.length, 2, 'beide "besprochen"-Schritte liefern feld:null, keiner wirft');
  });
});

test('[Optionslabel·ROT] _katalogOptionen wirft weiterhin, wenn der Bereich BEFÜLLT ist und GENAU DIESES Feld fehlt — kein Tippfehler verschwindet lautlos', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  assert.ok(V.SEKTOR_BY_ID.identity, 'Vorbedingung: der Bereich ist befüllt (echter Kern, echtes Bündel)');
  assert.throws(() => V._katalogOptionen('identity', 'ratsche_erfundene_kennung'),
    /kein Katalogfeld/,
    'ein befüllter Bereich mit einer erfundenen Feld-Kennung muss weiterhin werfen — sonst verschwindet ein echter Tippfehler lautlos');
});

test('[Optionslabel] _katalogOptionen liefert den echten Katalog, wenn der Bereich befüllt UND die Kennung echt ist', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  const opts = V._katalogOptionen('identity', 'maritalStatus');
  assert.ok(Array.isArray(opts) && opts.length > 0, 'ein echter, befüllter Katalog liefert echte Optionen, kein []');
});
