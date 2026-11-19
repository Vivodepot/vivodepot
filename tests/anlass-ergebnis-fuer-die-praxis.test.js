'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Anlass-Herausgabe: Zeilenknopf statt Hinweissatz, Ergebnis für die Praxis (Abnahme v1053, B2 und B3, 11.11.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   B2: Geht nichts mit, stand im Herausgabe-Dialog ein Satz, der auf den Zurückhalten-Weg verwies („es geht nur mit, wenn Sie
       es unter ‚Zurückhalten‘ freigeben“). Verlangt: je zurückgehaltener Angabe ihr Knopf „Doch mitgeben“ in der Zeile.
   B3: Nach dem Herausgeben stand nur der Dateiname aus Präfix und Kennung des Anlasses mit „Herunterladen“ und „Link senden“; das PDF lag
       auf einem anderen Weg. Verlangt: zwei gleichrangige Wege, PDF zum Ausdrucken oder Zeigen und die Datei zum Einlesen,
       je mit ihrem Dateinamen; der Name spricht (Titel des Anlasses, Kürzel des Standards, wo er gilt).
       Seit U-5 Rest (17.11.2026, Dummy „Fertig“) stehen die Wege nicht mehr in einem Dialog, sondern auf der Seite „Fertig“: je Datei
       eine Zeile mit Namen, „Link senden“ als Knopf darunter. Die Prüfung B3 liest darum die Seite.
   Rot-Beweise: die Prüfungen schlagen auf den alten Formen an (Hinweissatz, Name nach der Kennung, ein Weg).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Der entfernte Satz (bis v1053), wörtlich: an ihm schlägt die Prüfung B2 an.
const ALTER_HINWEIS = 'Alles Eingetragene in diesem Bereich ist besonders geschützt — es geht nur mit, wenn Sie es unter „Zurückhalten“ freigeben.';

// Der alte Name: Präfix, Unterstrich, Kennung (zusammengesetzt, damit die Probe keinen Dateinamen nennt).
const ALT = ['Vivodepot', 'arzt'].join('_');

const MARKEN = {
  chronicConditionsDiagnoses: 'MARKE-Rheuma',
  allergiesMedicationFoodOther: 'MARKE-Penicillin',
  medicationOngoing: 'MARKE-Methotrexat',
};

async function depot() {
  const k = ladeKern();
  await k.V.depotAnlegen('ergebnis-praxis-pw-2026');
  k.V.akteurSelbstErklaeren('Elena Beispiel');
  for (const [feld, marke] of Object.entries(MARKEN)) k.V.sektorFeldSetzen('health', feld, [{ text: marke }]);
  return k;
}

// Prüfung B2: jede zurückgehaltene Zeile trägt ihren Knopf, und kein Satz verweist auf den Zurückhalten-Weg.
function zeilenknopfFehler(html, felder, hinweis) {
  const fehler = [];
  if (hinweis && String(html).includes(hinweis)) fehler.push('Hinweissatz statt Zeilenknopf');
  for (const f of felder) {
    // Seit „Häkchen in Gruppen“ (17.11.2026) ist der Zeilenknopf das Häkchen der Angabe.
    if (!new RegExp('<input type="checkbox" class="export-haken" id="[^"]+" data-sektor="[^"]+" data-feld="' + f + '"').test(String(html))) fehler.push('kein Zeilenknopf: ' + f);
  }
  return fehler;
}

// Prüfung B3: zwei Wege (PDF, Datei), derselbe Dateistamm, kein Name nach der Kennung.
function ergebnisFehler(html) {
  const fehler = [];
  const wege = [...String(html).matchAll(/data-fertig-datei="(pdf|datei)"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/g)].map((m) => [m[1], m[2]]);
  const arten = wege.map((w) => w[0]).sort();
  if (JSON.stringify(arten) !== JSON.stringify(['datei', 'pdf'])) fehler.push('nicht zwei Wege PDF und Datei: ' + JSON.stringify(arten));
  const pdf = (wege.find((w) => w[0] === 'pdf') || [])[1] || '';
  const datei = (wege.find((w) => w[0] === 'datei') || [])[1] || '';
  // Die Datei trägt denselben Stamm wie das PDF, höchstens mit dem Kürzel ihres Standards dahinter (D2); das PDF nie.
  const stammPdf = pdf.replace(/\.pdf$/, ''), stammDatei = datei.replace(/\.json$/, '');
  if (!/\.pdf$/.test(pdf) || !/\.json$/.test(datei) || (stammDatei !== stammPdf && !new RegExp('^' + stammPdf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_[A-Z]+$').test(stammDatei))) fehler.push('Dateinamen passen nicht: ' + pdf + ' / ' + datei);
  if (/_IPS\.pdf$/.test(pdf)) fehler.push('das PDF trägt ein Standard-Kürzel, ist aber kein Dokument im Standard');
  if (/_arzt\./.test(pdf + datei)) fehler.push('Name nach der Kennung');
  return fehler;
}

test('[B2·Zeilenknopf] geht nichts mit, trägt jede zurückgehaltene Angabe ihr Häkchen, kein Hinweissatz', async () => {
  const { V } = await depot();
  const kennungen = Object.keys(MARKEN).map((f) => V.anlassKennungen('arzt').find((k) => V.kennungZuSelektor(k).feldId === f));
  const modale = [];
  const echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  try { V.flowExportUebersicht({ kennungen, titel: 'Probe', aufFortfahren: () => {} }); } finally { V.ui.modal = echt; }
  const html = modale[modale.length - 1].koerperHTML;
  assert.deepEqual(zeilenknopfFehler(html, Object.keys(MARKEN), ALTER_HINWEIS), []);
  assert.equal(V.STRINGS.exportNichtsGehtMitHinweis, undefined, 'der alte Hinweissatz ist aus dem Textsatz entfernt');
});

test('[B3·Wege] nach dem Herausgeben beim Arzttermin: zwei gleichrangige Wege, je mit ihrem Dateinamen', async () => {
  const k = await depot();
  const { V } = k;
  const modale = [];
  const echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  const seite = () => String(k.document.getElementById('content').innerHTML || '');
  try {
    V.flowAnlassExport('arzt');
    const uebersicht = modale[modale.length - 1];
    await uebersicht.onPrimaer(() => {});
    const ende = Date.now() + 3000;
    while (!/data-anlass-ergebnis/.test(seite()) && Date.now() < ende) await new Promise((r) => setTimeout(r, 20));
  } finally { V.ui.modal = echt; }
  const html = seite();
  assert.match(html, /data-anlass-ergebnis/, 'die Seite „Fertig“ steht');
  assert.deepEqual(ergebnisFehler(html), []);
  assert.ok(html.includes('data-fertig-link>' + V.STRINGS.linkSendenKnopf + '<'), '„Link senden“ bleibt erreichbar');
});

test('[B3·Name] der Dateiname nennt den Anlass mit seinem Titel, nicht seine Kennung', async () => {
  const { V } = await depot();
  const basis = V._anlassDateinameBasis(V.anlassDef('arzt'));
  assert.ok(/Arzttermin/.test(basis), basis);
  assert.ok(!/_arzt$/.test(basis), basis);
  const stamm = V._anlassDateiStamm(V.anlassDef('arzt'));
  assert.equal(stamm, basis + '_IPS', 'die Datei des Arzttermins nennt ihren Standard (D2)');
  const wege = V._anlassErgebnisWege(basis, stamm);
  assert.deepEqual(wege.map((w) => w.datei), [basis + '.pdf', basis + '_IPS.json'], 'das PDF ohne Kürzel, die Datei mit');
});

test('[B2/B3·Rot-Beweis] die Prüfungen schlagen auf den alten Formen an', async () => {
  const { V } = await depot();
  const hinweis = ALTER_HINWEIS;
  assert.ok(zeilenknopfFehler('<p class="einst-hint">' + hinweis + '</p>', Object.keys(MARKEN), hinweis).length >= 1, 'alter Hinweissatz → rot');
  assert.ok(ergebnisFehler('<p class="einst-hint" id="ausgabe-datei">' + ALT + '.json</p>').length >= 1, 'alter Wahl-Dialog → rot');
  const einWeg = '<div data-fertig-datei="datei"><strong>' + ['Vivodepot', 'Vor-einem-Arzttermin'].join('_') + '.json</strong></div>';
  assert.ok(ergebnisFehler(einWeg).length >= 1, 'nur ein Weg → rot');
  const kennungsName = '<div data-fertig-datei="pdf"><strong>' + ALT + '.pdf</strong></div><div data-fertig-datei="datei"><strong>' + ALT + '.json</strong></div>';
  assert.ok(ergebnisFehler(kennungsName).length >= 1, 'Name nach der Kennung → rot');
});
