'use strict';
/* ═══════════════════════════════════════════════════════════
   Ruhende Bereiche im Pro-Produkt (15.09.2026)
   ───────────────────────────────────────────────────────────
   DoD 07.09.2026: „das v515-Testdepot öffnet sich in jedem der vier Produkte".
   U2-ADR-348 tauscht die dreizehn Privat-Bereiche gegen sieben `pro-*` — der Tausch
   gilt dem ANGEBOT. Trägt ein Depot Werte für einen ersetzten Bereich, muss er
   wieder lesbar sein, sonst ist die Bürgerin an ihre eigenen Daten gesperrt.

   Diese Probe misst die Regel am echten, konfektionierten Pro-Kern, nicht am Quelltext:
   frisches Pro-Depot → sieben Bereiche (U2-ADR-348 unverändert) · Depot mit Privat-Werten
   → genau diese Bereiche zusätzlich · leere Hülle zählt nicht.

   Nachtrag 16.09.2026 (Katalog-Schnitt K2): `feldDefFuer` fragt seither den KATALOG, nicht den
   Anzeige-Index — die Definition eines Feldes ist eine Datenfrage. Bis dahin stand hier
   „ohne Werte nicht auflösbar" als Stellvertreter für „nicht angezeigt". Der Stellvertreter
   alterte mit der Entscheidung; gemessen wird die Anzeige jetzt über `bereicheAlle()` selbst,
   und die Auflösbarkeit steht als eigene, umgekehrte Zeile daneben.
   Der Browser-Weg (einlesen, bearbeiten, Datei-Rundlauf) steht in
   tests/e2e/v515-testdepot-browser-rundlauf.spec.js.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const PRO = PRODUKTE.find((p) => p.slug === 'pro-de');

async function ladeKernAus(kernPfad) {
  const vorherigerPfad = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const paar = ladeKern();
  if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorherigerPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  return paar;
}

async function proKernMitDepot() {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-ruhend-'));
  const r = konfektionieren({
    ziel, slug: PRO.slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(PRO),
  });
  const { V, document } = await ladeKernAus(path.join(r.ordner, 'vivodepot.html'));
  await V.basisVorlagenVerifizieren();
  await V.depotAnlegen('pro-ruhende-bereiche-pw');
  return { V, document, aufraeumen: () => fs.rmSync(ziel, { recursive: true, force: true }) };
}

test('[Ruhende Bereiche] frisches Pro-Depot zeigt nur die Pro-Bereiche — U2-ADR-348 unverändert', async () => {
  const { V, aufraeumen } = await proKernMitDepot();
  try {
    const ids = V.bereicheAlle().map((s) => s.id);
    // Seit 17.09.2026 ersetzt Pro identity nicht mehr (Variante a) — identity steht, die übrigen Bürger-Bereiche ruhen.
    assert.ok(ids.length && ids.every((id) => id.startsWith('pro-') || id === 'identity'), 'frisches Pro-Depot zeigt ruhende Bürger-Bereiche: ' + ids.join(', '));
    assert.ok(!ids.includes('finance'), 'ein ersetzter Bereich ohne Werte wird angezeigt');
    assert.ok(V.feldDefFuer('finance', 'companyPensionSchemeBav'), 'die Definition eines ruhenden Bereichs ist nicht auflösbar — sie ist Katalog, nicht Anzeige (Katalog-Schnitt K2)');
  } finally { aufraeumen(); }
});

test('[Ruhende Bereiche] ein Depot mit Privat-Werten macht genau diese Bereiche wieder lesbar', async () => {
  const { V, aufraeumen } = await proKernMitDepot();
  try {
    const d = V.getData();
    d.sektoren.finance = Object.assign({}, d.sektoren.finance, { companyPensionSchemeBav: 'Beispielkasse' });
    V._sektorIndexNeuBauen();
    const ids = V.bereicheAlle().map((s) => s.id);
    assert.ok(ids.includes('finance'), 'der Bereich mit Werten fehlt: ' + ids.join(', '));
    assert.ok(!ids.includes('health'), 'ein Bereich OHNE Werte ist mitgekommen — die Regel greift zu weit');
    assert.ok(V.feldDefFuer('finance', 'companyPensionSchemeBav'), 'die Felddefinition des geweckten Bereichs fehlt');   // trennt seit K2 nicht mehr: auflösbar ist sie auch ruhend, die Weckung prüft die Zeile `ids.includes` darüber
  } finally { aufraeumen(); }
});

test('[Ruhende Bereiche·Rot-Beweis] eine leere Hülle weckt keinen Bereich', async () => {
  const { V, aufraeumen } = await proKernMitDepot();
  try {
    const d = V.getData();
    d.sektoren.finance = { companyPensionSchemeBav: '', accounts: [] };
    V._sektorIndexNeuBauen();
    assert.ok(!V.bereicheAlle().map((s) => s.id).includes('finance'),
      'ein Bereich ohne einen einzigen Wert erscheint — dann zeigte jedes Pro-Depot alle dreizehn');
  } finally { aufraeumen(); }
});

/* ── Code-Review B1 (15.09.2026): Werte, die NEBEN `sektoren` liegen, wecken ihren Bereich ── */
test('[Ruhende Bereiche·B1] ein Ablaufdatum allein (feldGueltigkeit) weckt seinen Bereich', async () => {
  const { V, aufraeumen } = await proKernMitDepot();
  try {
    const d = V.getData();
    d.feldGueltigkeit = Object.assign({}, d.feldGueltigkeit, { housing: { tenancyAgreementFixedTermUntil: { bis: '2028-06-30' } } });
    V._sektorIndexNeuBauen();
    const ids = V.bereicheAlle().map((s) => s.id);
    assert.ok(ids.includes('housing'), 'der Bereich mit einem Ablaufdatum in feldGueltigkeit bleibt unsichtbar: ' + ids.join(', '));
    assert.ok(!ids.includes('health'), 'ein Bereich OHNE Angaben ist mitgekommen');
  } finally { aufraeumen(); }
});

test('[Ruhende Bereiche·B1] ein „ausdrücklich keine" allein weckt seinen Bereich', async () => {
  const { V, aufraeumen } = await proKernMitDepot();
  try {
    const d = V.getData();
    d.ausdruecklichKeine = Object.assign({}, d.ausdruecklichKeine, { health: { allergiesMedicationFoodOther: true } });
    V._sektorIndexNeuBauen();
    assert.ok(V.bereicheAlle().map((s) => s.id).includes('health'), 'eine ausdrückliche Angabe „keine" macht den Bereich nicht lesbar');
  } finally { aufraeumen(); }
});

test('[Ruhende Bereiche·B1·Rot-Beweis] eine leere Nebenablage weckt keinen Bereich', async () => {
  const { V, aufraeumen } = await proKernMitDepot();
  try {
    const d = V.getData();
    d.feldGueltigkeit = { housing: {} };
    d.ausdruecklichKeine = { health: {} };
    V._sektorIndexNeuBauen();
    const ids = V.bereicheAlle().map((s) => s.id);
    assert.ok(!ids.includes('housing') && !ids.includes('health'), 'leere Nebenablagen wecken Bereiche: ' + ids.join(', '));
  } finally { aufraeumen(); }
});

/* ── Code-Review B2 (15.09.2026): eine abgebrochene Einlese-Vorschau nimmt die geweckten Bereiche wieder heraus ── */
test('[Ruhende Bereiche·B2] Abbruch der Einlese-Vorschau setzt die nur fürs Einlesen geweckten Bereiche zurück', async () => {
  const { V, document, aufraeumen } = await proKernMitDepot();
  try {
    const text = JSON.stringify({ _typ: 'vivodepot-klartext-export', depot: { schemaVersion: V.leeresDepot().schemaVersion, sektoren: { finance: { companyPensionSchemeBav: 'Beispielkasse' } } } });
    const plan = V.importPlan('json', text);
    assert.ok(V.bereicheAlle().map((s) => s.id).includes('finance'), 'Positivkontrolle: der Plan weckt den Bereich für die Vorschau');
    V.flowImportVorschau(plan);
    const abbr = document.getElementById('m-abbr');
    assert.ok(abbr && typeof abbr.onclick === 'function', 'die Vorschau trägt keinen Abbrechen-Knopf');
    abbr.onclick();   // der echte Abbruch-Weg der Bürgerin
    assert.ok(!V.bereicheAlle().map((s) => s.id).includes('finance'), 'nach dem Abbruch bleibt der Privat-Bereich im Pro-Depot stehen');
  } finally { aufraeumen(); }
});
