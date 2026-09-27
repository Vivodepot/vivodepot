'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rundlauf-Probe — die beiden bestehenden Logikmodule bestehen den ECHTEN
   Vertrauensweg gegen den Bestand, den sie referenzieren (Strang D, Schritt 5,
   Teil 2/2: Logikmodule, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANDERS ALS BEI WIZARDS gibt es hier keinen materialisierten Kern-Zustand
   zurückzuübersetzen: `tests/fixtures/pro-geschaeftsfuehrerin-notfallmappe-
   logikmodul.json` und `tests/fixtures/pro-logikmodul-testschablone-zwei-de.json`
   sind bereits Template-Form — von Hand entstanden (Strang-D-Arbeitspaket,
   17.09.2026), nicht aus einem Kern extrahiert. Der Rundlauf, der hier etwas
   beweist, ist ein anderer: dass beide den ECHTEN Vertrauens-/Einlassweg
   (`logikModulPruefen`, denselben, den `modulEinlassen()` beim Import nimmt)
   gegen den Bestand bestehen, den sie referenzieren — nicht nur intern
   konsistentes JSON sind.

   GEMESSEN, NICHT ANGENOMMEN: `logikModulPruefen` prüft jeden `datenSchema`-
   Sektor über `_sektorImKatalog(def.sektor)` — eine echte Existenzprüfung
   gegen `SEKTOREN`. Beide Module referenzieren `pro-*`-Sektor-IDs
   (`pro-vertretung-vollmachten`, `pro-gesellschaft-nachfolge`, …), die es NUR
   gibt, wenn Pros `bereichsErsatz` (`PRO_BEREICHS_ERSATZ_PFAD`,
   tools/lib/vier-produkte.js) angewandt ist — im nativen, unkonfektionierten
   Kern (privat-de-Struktur) existieren sie nicht. Die Probe baut darum echt
   ein `pro-de`-Produkt (`tools/produkt-konfektionieren.js`, derselbe Weg wie
   `tests/vier-produkte-zusammensetzung.test.js`), statt eine Prüfung gegen
   den falschen Bestand zu behaupten.

   WAS DIESE PROBE HÄLT:
     (a) beide Module bestehen `logikModulPruefen` gegen den echten `pro-de`-
         Bestand — `gueltig: true`, keine verworfenen Datenschema-Einträge.
     (b) GEGENPROBE: dasselbe Modul gegen den UNKONFEKTIONIERTEN (privat-de-
         artigen) Bestand geprüft, schlägt fehl (`grund: 'sektor'`) — sonst
         prüfte (a) nichts, weil `pro-*`-Sektoren zufällig auch ohne
         bereichsErsatz existieren könnten.
     (c) `logikModulPruefen` prüft `def.sektor`, NICHT `def.feld` gegen einen
         echten Feldkatalog (gemessen im Kern-Quelltext, nicht angenommen) —
         die referenzierten `tpl_*`-Felder sind darum NICHT Teil dieser Probe
         und NICHT Teil des heutigen Strang-D-Feldregisters (das liest
         `privat-de`, s. `tools/build-feldkatalog.js`). Diese Lücke ist
         BENANNT (s. `pro-bereichsersatz-domaene-oder-fragebogen-2026-09-17.md`,
         150/156 tpl_-Felder), nicht stillschweigend mitbehauptet — eine
         Pro-Feldregister-Erweiterung ist eine eigene Entscheidung, keine, die
         diese Probe trifft.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURES = [
  'pro-logikmodul-testschablone-de.json',
  'pro-logikmodul-testschablone-zwei-de.json',
];

function proDeKernBauen() {
  const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
  const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
  const { ladeIssuer } = require('./load-issuer.js');
  const produkt = PRODUKTE.find((p) => p.slug === 'pro-de');
  assert.ok(produkt, 'Vorbedingung: pro-de ist eines der vier Produkte');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'logikmodul-rundlauf-pro-de-'));
  const { V: issuer } = ladeIssuer();
  konfektionieren({
    ziel, slug: 'pro-de', modulauswahl: [],
    vorDepotKonfigurationInhaltFn: issuer.vorDepotKonfigurationDateiInhalt,
    unsignierteModulDateien: modulDateienFuer(produkt),
  });
  return {
    kernPfad: path.join(ziel, 'pro-de', 'vivodepot.html'),
    aufraeumen: () => fs.rmSync(ziel, { recursive: true, force: true }),
  };
}

function mitKern(kernPfad, lauf) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kernPfad;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    return lauf(require('./load-kern.js').ladeKern());
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-kern.js')];
  }
}

test('[Logikmodul·Rundlauf] Vorbedingung — logikModulPruefen prüft Sektoren, nicht Felder (gemessen im Kern-Quelltext)', () => {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const start = html.indexOf('function logikModulPruefen(modul)');
  assert.ok(start >= 0, 'Anker logikModulPruefen nicht gefunden');
  const ende = html.indexOf('\nfunction ', start + 10);
  const koerper = html.slice(start, ende > start ? ende : start + 6000);
  assert.match(koerper, /_sektorImKatalog\(def\.sektor\)/,
    'die Funktion muss den Sektor jedes datenSchema-Eintrags gegen den echten Katalog prüfen');
  assert.doesNotMatch(koerper, /feldDefFuer\(def\.sektor,\s*def\.feld\).*!==?\s*undefined.*grund/s,
    'informativer Rot-Beweis: eine Feld-Existenzprüfung analog zu _sektorImKatalog gibt es heute '
    + 'nicht (nur die Sensibel-Schranke liest feldDefFuer, nicht als Zurückweisungsgrund) — die '
    + 'tpl_*-Felder bleiben darum bewusst außerhalb dieser Probe, s. Kopf-Kommentar');
});

for (const datei of FIXTURES) {
  test('[Logikmodul·Rundlauf] ' + datei + ' besteht logikModulPruefen gegen den echten pro-de-Bestand', () => {
    const modul = JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'fixtures', datei), 'utf8'));
    const kern = proDeKernBauen();
    try {
      mitKern(kern.kernPfad, ({ V }) => {
        const geprueft = V.logikModulPruefen(modul);
        assert.equal(geprueft.gueltig, true,
          datei + ': logikModulPruefen lehnt ab (' + geprueft.grund + ') — '
          + JSON.stringify(geprueft.verworfene));
        const datenSchemaVerworfen = (geprueft.verworfene || [])
          .filter((v) => v.schluessel && v.schluessel.startsWith('datenSchema.'));
        assert.deepEqual(datenSchemaVerworfen, [],
          datei + ': mindestens ein datenSchema-Eintrag referenziert einen Sektor, den der '
          + 'echte pro-de-Bestand nicht kennt');
      });
    } finally {
      kern.aufraeumen();
    }
  });
}

test('[Logikmodul·Rundlauf · Gegenprobe] dieselben Module scheitern gegen den unkonfektionierten (privat-de) Bestand — die Positiv-Probe prüft wirklich gegen Pro, nicht gegen einen Bestand, der die Sektoren ohnehin überall kennt', () => {
  for (const datei of FIXTURES) {
    const modul = JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'fixtures', datei), 'utf8'));
    const { V } = require('./load-kern.js').ladeKern();
    const geprueft = V.logikModulPruefen(modul);
    assert.equal(geprueft.gueltig, false,
      datei + ': ROT ERWARTET wäre hier GRÜN — bestünde das Modul auch ohne bereichsErsatz, '
      + 'prüfte die Positiv-Probe oben nichts Pro-Spezifisches');
    assert.equal(geprueft.grund, 'sektor',
      datei + ': muss speziell an der fehlenden pro-*-Sektor-Existenz scheitern, nicht an '
      + 'etwas anderem (grund war „' + geprueft.grund + '")');
  }
});
