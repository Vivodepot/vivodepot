'use strict';
/* Digitale Wohnsitzanmeldung (05.11.2026): der Bereich Wohnen führt zwei Dokumentarten — die Meldebescheinigung
   (§ 18 BMG) und die Wohnungsgeberbestätigung (§ 19 BMG). Jede verweist auf die Felder des Feldregisters, die
   sie belegt (Einzugsdatum, Doktorgrad; Eigentümerangaben und Zuordnungsmerkmal des Wohnungsgebers).
   Die Probe hält fest: (1) beide Arten stehen im Katalog des Bereichs, in jedem Produkt, das den Bereich Wohnen führt
   (die beiden Privat-Produkte; die Pro-Produkte führen Wohnen nicht);
   (2) jeder Feldverweis zeigt auf ein Feld, das der Katalog kennt — ein Verweis ins Leere fiele sonst erst
   beim Anlegen des Dokuments auf; (3) im englischen Produkt tragen beide einen englischen Namen.
   Rot-Beweis: ein Verweis auf ein unbekanntes Feld wird gemeldet. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');
const VP = require('../tools/lib/vier-produkte.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wohnsitz-dok-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
const TYPEN = ['registration-certificate', 'landlord-confirmation'];

function kennt(V, sektorId, feldId) {
  const b = V._bereicheImKatalog().find((x) => x.id === sektorId);
  return !!(b && (b.sektionen || []).some((s) => (s.felder || []).some((f) => f.id === feldId)));
}
function leereVerweise(V, katalog) {
  const f = [];
  for (const k of katalog) for (const v of (k.felder || [])) if (!kennt(V, v.sektorId, v.feldId)) f.push(k.typ + ' → ' + v.sektorId + '.' + v.feldId);
  return f;
}

for (const p of VP.PRODUKTE.filter((x) => x.slug.startsWith('privat-'))) {
  test('[Wohnsitz-Dokumente·' + p.slug + '] Meldebescheinigung und Wohnungsgeberbestätigung stehen im Katalog, ihre Feldverweise treffen', () => {
    const { V } = kernAus(produktHtml(p.slug, TMP));
    const katalog = V.standardDokumenteFuer('housing').filter((k) => TYPEN.includes(k.typ));
    assert.deepEqual(katalog.map((k) => k.typ).sort(), [...TYPEN].sort());
    assert.deepEqual(leereVerweise(V, katalog), [], 'Verweis ins Leere');
    if (p.sprache === 'en') {
      const namen = TYPEN.map((t) => V._dokumentTextsatzText(t, 'name', ''));
      assert.ok(namen.every((n) => n && !/Melde|Wohnungsgeber/.test(n)), 'englische Namen: ' + namen.join(' | '));
    }
  });
}

test('[Wohnsitz-Dokumente·Rot-Beweis] ein Verweis auf ein unbekanntes Feld wird gemeldet', () => {
  const { V } = kernAus(produktHtml('privat-de', TMP));
  const f = leereVerweise(V, [{ typ: 'probe', felder: [{ sektorId: 'housing', feldId: 'gibtEsNicht' }] }]);
  assert.deepEqual(f, ['probe → housing.gibtEsNicht']);
});
