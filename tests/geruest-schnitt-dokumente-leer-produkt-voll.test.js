'use strict';
/* Gerüst-Schnitt S2+S6 (20.09.2026): AB_WERK_DOKUMENT_MODULE und AB_WERK_DOKUMENTE_DE sind im Gerüst leer,
   der Inhalt kommt aus den Moduldateien des Rezepts.

   Beide Regionen hängen zusammen: bei leerem DOKUMENT_MODULE und gefülltem DOKUMENTE_DE wirft
   _dokumenteAusBuendelMaterialisieren (gefunden === 0). Darum ist die Leerform von DOKUMENTE_DE `null`,
   nicht `{}`. Die Probe prüft am ERZEUGTEN Produkt (konfektioniert, dann gebootet), nicht am gestellten Zustand.
   Seit U2-ADR-507 (Nachtrag 29.10.2026) kommen die Schritte von Patientenverfügung und Vollmacht als Bauplan aus dem Rechtsraum-Modul
   (eingesetzt aus der Bauplan-Ergänzung) und der KI-Korpus aus der eigenen Region AB_WERK_KI_KORPUS (Leerform ebenfalls `null`). */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer, RECHTSRAUM_BAUPLAN_PFADE, KI_KORPUS_PFAD } = require('../tools/lib/vier-produkte.js');
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
  assert.equal(V.AB_WERK_KI_KORPUS, null);
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
    assert.deepEqual(Object.keys(V.AB_WERK_DOKUMENTE_DE.dokumente), ['pvBmj'], p.slug + ': nur noch die Textteile der Patientenverfügung');
    assert.ok(V.AB_WERK_KI_KORPUS && V.AB_WERK_KI_KORPUS.kiKorpus, p.slug + ': der KI-Korpus aus seiner eigenen Region');
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
    assert.equal(V.AB_WERK_DOKUMENTE_DE, null, p.slug + ': keine Textteile eines Dokuments');
    assert.equal(V.AB_WERK_KI_KORPUS, null, p.slug + ': kein KI-Korpus');
    assert.ok(V.PV_BMJ.steps.length > 0, p.slug + ': PV_BMJ.steps');
    assert.equal(V.KI_KORPUS.steps.length, 0, p.slug + ': KI_KORPUS.steps');
    assert.equal(V.VOLLMACHT_BMJ.steps.length, 0, p.slug + ': VOLLMACHT_BMJ.steps');
    assert.equal(V.PV_MODUL.abschnitte.length, 0, p.slug + ': PV_MODUL.abschnitte');
  }
});

test('[Gerüst-Schnitt S2+S6·Rot-Beweis] ein Produkt ohne Bauplan-Ergänzung und KI-Datei trägt die Dokument-Schritte nicht', () => {
  const p = PRODUKTE[0];
  const weg = [...RECHTSRAUM_BAUPLAN_PFADE, KI_KORPUS_PFAD];
  const ohne = modulDateienFuer(p).filter((f) => !weg.includes(f));
  assert.equal(ohne.length, modulDateienFuer(p).length - weg.length, 'Voraussetzung: die Dateien waren in der Liste');
  const V = produktKernLaden(p.slug, ohne);
  assert.equal(V.AB_WERK_KI_KORPUS, null);
  assert.equal(V.PV_BMJ.steps.length, 0);
  assert.equal(V.VOLLMACHT_BMJ.steps.length, 0);
  assert.equal(V.KI_KORPUS.steps.length, 0);
  assert.ok(V.AB_WERK_DOKUMENTE_DE && V.AB_WERK_DOKUMENTE_DE.dokumente.pvBmj, 'die Textteile kommen weiter aus der Dokumente-Datei');
  assert.ok(V.PV_MODUL.abschnitte.length > 0, 'die Dokumentmodule kommen weiter aus ihren eigenen Dateien');
});
