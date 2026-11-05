'use strict';
/* Abdruck der amtlichen Dokumentschritte je Produkt (U2-ADR-507, Nachtrag 29.10.2026): konfektioniert jedes der vier Produkte wie die
   Auslieferung, bootet es und bildet je Gegenstand eine sha256 über die JSON-Form. Gegenstände: PV_BMJ, VOLLMACHT_BMJ, KI_KORPUS (je
   ganz, mit steps), die Schritte der Assistenten pvwiz/kiwiz, die materialisierten Abschnitte von PV_MODUL/KI_MODUL und die Sektion
   der Festlegungen im Bereich Vorsorge. Gleiche Abdrücke vor und nach dem Umzug heißen: kein Wort, kein Feld, keine Reihenfolge hat
   sich geändert. Gebraucht von der Gleichheitsprobe des Umzugs und von der Gegenprobe zur Formvorschrift des KI-Korpus. */
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');

function kernLaden(kernPfad) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern({ blank: true });
  if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  return V;
}

function produktKernLaden(slug, modulDateien) {
  const { konfektionieren } = require(path.join(REPO, 'tools', 'produkt-konfektionieren.js'));
  const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-dokumentschritte-'));
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

function hash(wert) {
  return crypto.createHash('sha256').update(JSON.stringify(wert === undefined ? null : wert)).digest('hex');
}

function abdruckAus(V) {
  const wiz = (id) => { const w = (V.WIZARDS || []).find((x) => x.id === id); return w ? w.schritte : null; };
  const sektor = (V.SEKTOREN || []).find((s) => s.id === 'advanceCare');
  const festlegungen = sektor ? (sektor.sektionen || []).find((s) => s.id === 'living-will-decisions') || null : null;
  return {
    PV_BMJ: hash(V.PV_BMJ),
    VOLLMACHT_BMJ: hash(V.VOLLMACHT_BMJ),
    KI_KORPUS: hash(V.KI_KORPUS),
    pvwiz: hash(wiz('pvwiz')),
    kiwiz: hash(wiz('kiwiz')),
    PV_MODUL_abschnitte: hash(V.PV_MODUL && V.PV_MODUL.abschnitte),
    KI_MODUL_abschnitte: hash(V.KI_MODUL && V.KI_MODUL.abschnitte),
    festlegungen: hash(festlegungen),
    schritte: [V.PV_BMJ.steps.length, V.VOLLMACHT_BMJ.steps.length, V.KI_KORPUS.steps.length],
  };
}

function abdruckJeProdukt(modulDateienFn) {
  const { PRODUKTE, modulDateienFuer } = require(path.join(REPO, 'tools', 'lib', 'vier-produkte.js'));
  const raus = {};
  for (const p of PRODUKTE) raus[p.slug] = abdruckAus(produktKernLaden(p.slug, (modulDateienFn || modulDateienFuer)(p)));
  return raus;
}

module.exports = { abdruckJeProdukt, abdruckAus, produktKernLaden };
if (require.main === module) process.stdout.write(JSON.stringify(abdruckJeProdukt(), null, 2) + '\n');
