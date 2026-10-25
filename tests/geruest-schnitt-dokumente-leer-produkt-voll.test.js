'use strict';
/* Gerüst-Schnitt S2+S6 (20.09.2026): AB_WERK_DOKUMENT_MODULE und AB_WERK_DOKUMENTE_DE sind im Gerüst leer,
   der Inhalt kommt aus den Moduldateien des Rezepts.

   Beide Regionen hängen zusammen: bei leerem DOKUMENT_MODULE und gefülltem DOKUMENTE_DE wirft
   _dokumenteAusBuendelMaterialisieren (gefunden === 0). Darum ist die Leerform von DOKUMENTE_DE `null`,
   nicht `{}`. Die Probe prüft am ERZEUGTEN Produkt (konfektioniert, dann gebootet), nicht am gestellten Zustand. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const { ladeIssuer } = require('./load-issuer.js');

const REPO = path.join(__dirname, '..');

function kernLaden(kernPfad, opts) {
  const vorher = process.env.KERN_HTML_PATH;
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern(opts || { blank: true });
  if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  return V;
}

function produktKernLaden(slug, modulDateien) {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'geruest-s2-s6-'));
  try {
    const r = konfektionieren({
      ziel, slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: ladeIssuer().V.vorDepotKonfigurationDateiInhalt,
      unsignierteModulDateien: modulDateien,
    });
    return kernLaden(path.join(r.ordner, 'vivodepot.html'));
  } finally {
    fs.rmSync(ziel, { recursive: true, force: true });
  }
}

test('[Gerüst-Schnitt S2+S6] das Gerüst bootet mit leeren Regionen und trägt keinen Dokument-Inhalt', () => {
  const V = kernLaden(null, { blank: true });
  assert.equal(V.AB_WERK_DOKUMENTE_DE, null);
  assert.deepEqual([...V.AB_WERK_DOKUMENT_MODULE], []);
  assert.equal(V.PV_BMJ.steps.length, 0);
  assert.equal(V.KI_KORPUS.steps.length, 0);
  assert.equal(V.VOLLMACHT_BMJ.steps.length, 0);
  assert.equal(V.PV_MODUL.abschnitte.length, 0);
});

/* Pro P2 (24.10.2026, U2-ADR-243 §9): Pro bietet keine Gesundheit an. Benannt, welche Produkte nur die Schritte der Patientenverfügung
   tragen (die Quelle der ruhenden Festlegungen) und sonst keinen Dokument-Inhalt; alle übrigen tragen alles wie bisher. */
const NUR_FESTLEGUNGEN = Object.freeze(['pro-de', 'pro-en']);

test('[Gerüst-Schnitt S2+S6] jedes Produkt außer Pro trägt die Dokument-Inhalte aus seinen Moduldateien', () => {
  for (const p of PRODUKTE.filter((x) => !NUR_FESTLEGUNGEN.includes(x.slug))) {
    const V = produktKernLaden(p.slug, modulDateienFuer(p));
    assert.equal(V.AB_WERK_DOKUMENT_MODULE.length, 4, p.slug + ': vier Dokumentmodule');
    assert.deepEqual(Object.keys(V.AB_WERK_DOKUMENTE_DE.dokumente).sort(), ['kiKorpus', 'pvBmj', 'vollmachtBmj'], p.slug);
    assert.ok(V.PV_BMJ.steps.length > 0, p.slug + ': PV_BMJ.steps');
    assert.ok(V.KI_KORPUS.steps.length > 0, p.slug + ': KI_KORPUS.steps');
    assert.ok(V.VOLLMACHT_BMJ.steps.length > 0, p.slug + ': VOLLMACHT_BMJ.steps');
    assert.ok(V.PV_MODUL.abschnitte.length > 0, p.slug + ': PV_MODUL.abschnitte');
  }
});

test('[Gerüst-Schnitt S2+S6·Pro] Pro trägt nur die Schritte der Patientenverfügung, kein Dokumentmodul, keinen Korpus, keine Vollmacht', () => {
  const pro = PRODUKTE.filter((x) => NUR_FESTLEGUNGEN.includes(x.slug));
  assert.deepEqual(pro.map((x) => x.slug), [...NUR_FESTLEGUNGEN], 'Voraussetzung: beide Pro-Produkte sind gebaut');
  for (const p of pro) {
    const V = produktKernLaden(p.slug, modulDateienFuer(p));
    assert.equal(V.AB_WERK_DOKUMENT_MODULE.length, 0, p.slug + ': kein Dokumentmodul');
    assert.deepEqual(Object.keys(V.AB_WERK_DOKUMENTE_DE.dokumente), ['pvBmj'], p.slug);
    assert.ok(V.PV_BMJ.steps.length > 0, p.slug + ': PV_BMJ.steps');
    assert.equal(V.KI_KORPUS.steps.length, 0, p.slug + ': KI_KORPUS.steps');
    assert.equal(V.VOLLMACHT_BMJ.steps.length, 0, p.slug + ': VOLLMACHT_BMJ.steps');
    assert.equal(V.PV_MODUL.abschnitte.length, 0, p.slug + ': PV_MODUL.abschnitte');
  }
});

test('[Gerüst-Schnitt S2+S6·Rot-Beweis] ein Produkt ohne die Dokumente-Datei trägt die Dokument-Schritte nicht', () => {
  const p = PRODUKTE[0];
  const ohne = modulDateienFuer(p).filter((f) => !/vivodepot-dokumente-de\.json$/.test(f));
  assert.equal(ohne.length, modulDateienFuer(p).length - 1, 'Voraussetzung: die Datei war in der Liste');
  const V = produktKernLaden(p.slug, ohne);
  assert.equal(V.AB_WERK_DOKUMENTE_DE, null);
  assert.equal(V.PV_BMJ.steps.length, 0);
  assert.ok(V.PV_MODUL.abschnitte.length > 0, 'die Dokumentmodule kommen weiter aus ihren eigenen Dateien');
});
