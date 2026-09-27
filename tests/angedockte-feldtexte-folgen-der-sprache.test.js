'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Feldtexte angedockter Bereiche folgen der Sprache (Privat-Pro-Probe, Befund B3, 16.09.2026; U2-ADR-398)
   ────────────────────────────────────────────────────────────────────────────
   Eine pro-en-Datei zeigte ihre Pro-Bereiche in privat-en deutsch, obwohl das Sprachmodul die
   englischen Texte trägt: nur Bereichs- und Sektionsname lasen den Textsatz, Feld, Unterfeld und
   Option blieben die Fassung aus der Datei. pro-en liest dieselben Kennungen über
   `_bereichsErsatzFelderLebendigMachen`. Jetzt lesen sie auch angedockte, nicht eingebaute
   Bereiche — im Kern (`_templateFeldMitTexten`) und in der Lese-App, die dazu die Kennungsformen
   des Kerns für angedockte Bereiche annimmt. Gemessen an ECHT konfektionierten Produkten.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const PW = 'Feldtexte-folgen-der-Sprache-2026';
const BEREICH = 'pro-vertretung-vollmachten';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'feldtexte-sprache-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const gebaut = new Map();
function kern(slug) {
  if (!gebaut.has(slug)) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    const r = konfektionieren({
      ziel: path.join(TMP, slug), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: VP.modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut.get(slug);
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern().V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}

/* B3: alle Beschriftungen der Pro-Bereiche einer pro-en-Datei (mit viertem Fach) in privat-en
   gegen pro-en selbst. */
function beschriftungenAbweichend(privat, pro) {
  const v = [];
  for (const b of pro.bereicheAlle().filter((x) => x.id.startsWith('pro-'))) {
    for (const sek of b.sektionen || []) {
      for (const f of sek.felder || []) {
        let fp = null;
        try { fp = privat.feldDefFuer(b.id, f.id); } catch (_) { fp = null; }
        if (!fp) { v.push(b.id + '.' + f.id + ' fehlt'); continue; }
        if (fp.label !== f.label) v.push(b.id + '.' + f.id + ': „' + fp.label + '" statt „' + f.label + '"');
        for (const o of f.optionen || []) {
          const op = (fp.optionen || []).find((x) => x.wert === o.wert);
          if (!op || op.label !== o.label) v.push(b.id + '.' + f.id + '/' + o.wert + ': „' + (op && op.label) + '" statt „' + o.label + '"');
        }
      }
    }
  }
  return v;
}

test('[Feldtexte·B3] eine pro-en-Datei zeigt ihre Pro-Bereiche in privat-en englisch wie in pro-en', async () => {
  const pro = kern('pro-en');
  await pro.depotAnlegen(PW);
  const umschlag = JSON.parse(JSON.stringify(await pro.depotSerialisieren()));
  const V = kern('privat-en');
  await V.depotLaden(umschlag, PW);
  const abweichend = beschriftungenAbweichend(V, pro);
  assert.deepEqual(abweichend, [], abweichend.slice(0, 8).join('\n'));
});

/* Die Lese-App: dieselbe Lücke eine Datei weiter. Ein angedockter Pro-Bereich zeigte der
   Empfängerin Feld und Option deutsch, obwohl das englische Sprachmodul in der Datei reist. */
function leseAppBeschriftungen(sprachModul, sprache) {
  const { ladeLesen } = require('./load-lesen.js');
  const { V } = ladeLesen();
  const fid = 'tpl_weitere_vertretungsberechtigte_person_vorhanden';
  const modul = { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'probe', sprache: 'de', bereiche: { [BEREICH]: {
    label: 'Vertretung und Vollmachten', icon: 'folder',
    sektionen: [{ id: 'block-1', label: 'Block 1', felder: [{ id: fid, typ: 'auswahl', label: 'Weitere vertretungsberechtigte Person vorhanden', optionen: [{ wert: 'ja', label: 'Ja' }] }] }],
  } } };
  V.setData({ sektoren: {}, menschen: [], textsprache: sprache || 'en', bereichsModule: [modul], textsatzModule: sprachModul ? [sprachModul] : [] });
  V._textsatzModuleAusDepotAnmelden(V.getData());
  const feld = V.bereichsModulPruefenLesen(modul).bereiche[0].sektionen[0].felder[0];
  return { label: feld.label, option: feld.optionen[0].label, dateiLabel: modul.bereiche[BEREICH].sektionen[0].felder[0].label };
}

test('[Feldtexte·Lese-App] ein angedockter Pro-Bereich liest Feld und Option aus dem englischen Sprachmodul, die Datei bleibt unberührt', () => {
  const r = leseAppBeschriftungen(JSON.parse(fs.readFileSync(VP.EN_MODUL_PFAD, 'utf8')));
  assert.deepEqual(r, { label: 'Additional authorized representative exists', option: 'Yes', dateiLabel: 'Weitere vertretungsberechtigte Person vorhanden' });
});

/* Von B3 (19.09.2026) bis S1 (21.09.2026) trug die Lese-App die englische Ab-Werk-Saat selbst, `textsprache: 'en'` brauchte kein Sprachmodul in
   der Datei. Seit S1 trägt sie keine mehr: Englisch kommt aus dem Sprachmodul der Datei (abWerkMitschrift.sprache, textsatzModule), sonst
   bleibt die Beschriftung der Datei stehen, deutsch. Das ist der gemessene Preis von S1 (Dateien von vor dem 08.09.2026, U2-ADR-426). */
test('[Feldtexte·Lese-App·Gegenprobe] in einer Sprache ohne Sprachmodul bleibt die Beschriftung aus der Datei', () => {
  const r = leseAppBeschriftungen(null, 'fr');
  assert.deepEqual(r, { label: 'Weitere vertretungsberechtigte Person vorhanden', option: 'Ja', dateiLabel: 'Weitere vertretungsberechtigte Person vorhanden' });
});

test('[Feldtexte·Lese-App·S1] Englisch braucht das Sprachmodul der Datei: ohne es bleibt die Beschriftung aus der Datei, deutsch (keine eingebaute Saat mehr)', () => {
  const r = leseAppBeschriftungen(null, 'en');
  assert.deepEqual(r, { label: 'Weitere vertretungsberechtigte Person vorhanden', option: 'Ja', dateiLabel: 'Weitere vertretungsberechtigte Person vorhanden' });
});

module.exports = {
  PROBEN: [
    { fuer: '[Feldtexte·B3] eine pro-en-Datei zeigt ihre Pro-Bereiche in privat-en englisch wie in pro-en', diskriminante: beschriftungenAbweichend },
  ],
};
