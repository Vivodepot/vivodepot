'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein Feld steht in seinem Bereich genau EINMAL — in jedem der vier Produkte
   (Pro-DE-Fund bei der Nutzertest-Klickprobe, 15.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Im Pro-DE-Produkt dockte die DE-Vorlage Felder an, die der Pro-Bereichsersatz
   schon nativ führt. `tpl_zustaendiges_registergericht` und zwölf weitere standen
   zweimal auf der Seite, beide Eingaben mit derselben `data-edit`-Kennung. Wer
   ins sichtbare Feld tippte, verlor die Eingabe beim Speichern (Beleg im Browser:
   tests/e2e/pro-de-doppelfeld-rundlauf.spec.js).

   Klassenprüfung: die vier Produkte werden über den ECHTEN Weg gebaut
   (tools/produkt-konfektionieren.js mit der Vor-Depot-Konfiguration des Issuers,
   wie tools/vier-produkte-erzeugen.js), ein Depot angelegt, jeder Bereich gerendert
   — keine `data-edit`-Kennung darf im Bereich zweimal stehen.
   Rot-Beweis: derselbe Pro-DE-Bau aus einer Kern-Kopie ohne den Filter in
   `_templateAbschnitte` zeigt die Doppelung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer, PRO_VORLAGE_DE_PFAD } = require('../tools/lib/vier-produkte.js');
const { ladeIssuer } = require('./load-issuer.js');

const REPO = path.join(__dirname, '..');
const FILTER = '      && !_angedocktVomBereichVerdeckt(sektorId, d.feldId)) : [];';

function ladeKernAus(pfad) {
  const lader = require.resolve('./load-kern.js');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = pfad;
  delete require.cache[lader];
  try { return require(lader).ladeKern(); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[lader];
  }
}

/* Baut ein Produkt in einen Temp-Ordner, wie tools/vier-produkte-erzeugen.js. `zusatz`: weitere
   Moduldateien — für den Rot-Beweis die Pro-Vorlage, die Pro bis v720 mitbrachte (seit 17.09.2026
   nicht mehr, P1). Ohne sie gäbe es in Pro nichts, das der Filter verdecken könnte. */
function produktBauen(p, zusatz) {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'feld-einmal-'));
  const ISSUER = ladeIssuer().V;
  const r = konfektionieren({
    ziel, slug: p.slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
    unsignierteModulDateien: modulDateienFuer(p).concat(zusatz || []),
  });
  return { html: path.join(r.ordner, 'vivodepot.html'), aufraeumen: () => fs.rmSync(ziel, { recursive: true, force: true }) };
}

async function doppelteFelder(htmlPfad) {
  const { V, document } = ladeKernAus(htmlPfad);
  await V.basisVorlagenVerifizieren();
  await V.depotAnlegen('feld-einmal-im-bereich-2026!');
  V.akteurSelbstErklaeren('Probe');
  const funde = [];
  for (const s of V.bereicheAlle()) {
    V.renderSektor(s.id);
    const html = String(document.getElementById('content').innerHTML || '');
    const zaehler = Object.create(null);
    for (const m of html.matchAll(/data-edit="([^"]+)"/g)) zaehler[m[1]] = (zaehler[m[1]] || 0) + 1;
    for (const [k, n] of Object.entries(zaehler)) if (n > 1) funde.push(s.id + '.' + k + ' ×' + n);
  }
  return funde;
}

for (const p of PRODUKTE) {
  test('[Feld einmal im Bereich] ' + p.slug + ': keine Eingabe-Kennung steht in einem Bereich doppelt', async () => {
    const bau = produktBauen(p);
    try {
      assert.deepEqual(await doppelteFelder(bau.html), [], 'doppelte Eingaben im Bereich — die zweite überschreibt beim Speichern die erste');
    } finally { bau.aufraeumen(); }
  });
}

test('[Feld einmal im Bereich · Rot-Beweis] Pro-DE ohne den Filter in _templateAbschnitte zeigt die Doppelung', async () => {
  const quelle = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(quelle.split(FILTER).length, 2, 'Anker für den Rot-Beweis trifft nicht genau einmal');
  // Mutiert wird das GEBAUTE Pro-DE-Produkt — der Konfektionierer liest den Kern aus dem Repo.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feld-einmal-mutation-'));
  const pro = PRODUKTE.find((x) => x.slug === 'pro-de');
  const bau = produktBauen(pro, [PRO_VORLAGE_DE_PFAD]);
  try {
    const gebaut = fs.readFileSync(bau.html, 'utf8');
    assert.equal(gebaut.split(FILTER).length, 2, 'der Filter steht im gebauten Produkt');
    const mutant = path.join(tmp, 'vivodepot.html');
    fs.writeFileSync(mutant, gebaut.replace(FILTER, '      ) : [];'));
    const funde = await doppelteFelder(mutant);
    assert.ok(funde.some((f) => f.startsWith('pro-vertretung-vollmachten.tpl_zustaendiges_registergericht')),
      'ohne den Filter keine Doppelung — die Probe misst nicht, was der Fix leistet: ' + funde.join(', '));
  } finally { bau.aufraeumen(); fs.rmSync(tmp, { recursive: true, force: true }); }
});
