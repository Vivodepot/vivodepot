'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Herausgeben aus einem Bereich: erst die Angaben, dann die Übergabe (Austausch, 11.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Vorher wählte die Person zuerst die Form (PDF, Datei für eine Software, Wallet) und sah danach das Fenster mit
   den Angaben; jede Form öffnete dieses Fenster selbst. Jetzt steht das Fenster einmal am Anfang, ohne Form.
   Danach wählt die Person die Form; jede Form nennt die Zahl der Angaben, die sie trägt, und zeigt sie auf Antippen.
   Die Probe prüft je Form: Das Fenster mit den Angaben erscheint genau einmal, und die Form bekommt die Auswahl.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'schrittfolge-pw-2026';
const BEREICH = 'health';

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Elena Beispiel');
  V.betreteApp();
  V.sektorFeldSetzen(BEREICH, 'allergiesMedicationFoodOther', [{ text: 'MARKE-Penicillin' }]);
  // Häkchen in Gruppen (17.11.2026): bei 0 Häkchen bleibt „Herausgeben“ gesperrt; eine Angabe, die die Person als nicht sensibel
  // führt, ist vorausgewählt, damit der Weg zur Übergabe weitergeht.
  V.sektorFeldSetzen(BEREICH, 'bloodType', 'A+');
  V.sensibelFeldSetzen(BEREICH, 'bloodType', false);
  return V;
}

// Schneidet jedes Fenster mit, das `fn` öffnet; das Original wird nicht gerufen.
function mitschnitt(V, fn) {
  const modale = [], echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  try { fn(modale); } finally { V.ui.modal = echt; }
  return modale;
}
// Eine Wahl, wie sie der Schritt Angaben weitergibt: hier jede Angabe des Bereichs, auch die geschützten (von der Person mitgegeben).
const wahl = (V) => { const m = V.exportUebersichtModell(BEREICH); return { gewaehlt: new Set(m.enthalten.concat(m.zurueckgehalten).map((e) => e.sektor + '/' + e.feld)) }; };
// Häkchen in Gruppen (17.11.2026): der Block trägt zusätzlich export-haekchen.
const istAngabenFenster = (m) => /class="export-uebersicht-block[ "]/.test(String(m.koerperHTML || ''));
const istUebergabe = (m) => /data-h-form="/.test(String(m.koerperHTML || ''));
const formen = (m) => [...String(m.koerperHTML || '').matchAll(/data-h-form="([^"]+)"/g)].map((x) => x[1]);

test('[Austausch·Schrittfolge] der Weg aus einem Bereich beginnt mit den Angaben, nicht mit der Form', async () => {
  const V = await depot();
  const modale = mitschnitt(V, () => V.flowHerausgeben(BEREICH));
  assert.equal(modale.length, 1, 'ein Fenster');
  assert.equal(istAngabenFenster(modale[0]), true, 'das erste Fenster zeigt die Angaben');
  assert.equal(istUebergabe(modale[0]), false, 'und noch keine Form');
});

test('[Austausch·Schrittfolge] nach den Angaben folgt die Übergabe: jede Form nennt die Zahl der Angaben, die sie trägt', async () => {
  const V = await depot();
  const modale = mitschnitt(V, (liste) => {
    V.flowHerausgeben(BEREICH);
    liste[0].onPrimaer(() => {});
  });
  assert.equal(modale.length, 2, 'zwei Fenster: Angaben, dann Übergabe');
  assert.equal(istUebergabe(modale[1]), true);
  const f = formen(modale[1]);
  assert.ok(f.includes('pdf'), 'das PDF steht immer zur Wahl');
  const erwartet = ['pdf'].concat(V._herausgabeFormateFuerBereich(BEREICH).map((ex) => ex.format));
  assert.deepEqual(f.filter((x) => x !== 'eudiw'), erwartet, 'jede Form des Bereichs steht zur Wahl');
  for (const id of f) {
    const zahl = new RegExp('data-h-traegt="' + id.replace(/[^\w-]/g, '.') + '"[^>]*>[\\s\\S]*?class="einst-abschnitt-status">(\\d+) ');
    assert.match(String(modale[1].koerperHTML), zahl, 'Form ' + id + ' nennt ihre Zahl');
  }
});

test('[Austausch·Schrittfolge] je Form erscheint das Fenster mit den Angaben genau einmal', async () => {
  const V = await depot();
  const f = formen(mitschnitt(V, (liste) => { V.flowHerausgeben(BEREICH); liste[0].onPrimaer(() => {}); })[1]);
  assert.ok(f.length >= 2, 'Vorbedingung: der Bereich bietet mehr als eine Form (' + f.join(', ') + ')');
  const zweimal = [];
  for (const id of f) {
    const modale = mitschnitt(V, (liste) => {
      V.flowHerausgeben(BEREICH);
      liste[0].onPrimaer(() => {});
      V.herausgabeFormStarten(BEREICH, id, wahl(V));
    });
    const n = modale.filter(istAngabenFenster).length;
    if (n !== 1) zweimal.push(id + ':' + n);
  }
  assert.deepEqual(zweimal, [], 'keine Form öffnet das Fenster mit den Angaben ein zweites Mal');
});

test('[Austausch·Schrittfolge] eine Form trägt nur, was gewählt ist; ohne Wahl trägt sie nichts', async () => {
  const V = await depot();
  const auswahl = wahl(V);
  assert.ok(auswahl.gewaehlt.size >= 1, 'Vorbedingung: es ist etwas gewählt');
  const alles = V.herausgabeFormTraegt(BEREICH, undefined, auswahl);
  assert.equal(alles.length, auswahl.gewaehlt.size, 'das PDF trägt alles Gewählte');
  assert.deepEqual(V.herausgabeFormTraegt(BEREICH, undefined, { gewaehlt: new Set() }), [], 'ohne Wahl nichts');
});

test('[Austausch·Schrittfolge·Rot-Beweis] der alte Ablauf fällt auf: Form zuerst, und ein zweites Fenster mit den Angaben', () => {
  const formWaehler = { koerperHTML: '<div class="herausgeben-chooser"><button data-h-form="pdf" data-h-pdf="1">PDF</button></div>' };
  const angaben = { koerperHTML: '<div class="export-uebersicht-block"><ul class="export-geht-liste"></ul></div>' };
  assert.equal(istAngabenFenster(formWaehler), false, 'der Form-Wähler ist kein Fenster mit Angaben: als erstes Fenster fiele er auf');
  assert.equal(istUebergabe(formWaehler), true);
  assert.equal([angaben, formWaehler, angaben].filter(istAngabenFenster).length, 2, 'ein zweites Fenster mit Angaben wird gezählt');
});

// ── Standard und PDF bei jeder Herausgabe aus einem Bereich ───────────────────────────────────────────────────────────────
// Der Wächter der Ausgabewege (tools/ausgabewege-pruefen.js) sucht den PDF-Aufruf an der Stelle, die die Einordnung als
// Einstieg nennt: herausgabeFormStarten. Diese Probe hält, dass jede Form der Übergabe genau dort durchläuft und dass das
// PDF bei jedem Bereich als erste Form angeboten wird. Liefert die Liste der Abweichungen am Quelltext.
const fs = require('node:fs');
const path = require('node:path');
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
function rumpf(quelle, kopf) {
  const a = quelle.indexOf(kopf);
  return a < 0 ? '' : quelle.slice(a, quelle.indexOf('\n}\n', a));
}
function pdfWegBefund(quelle) {
  const fehler = [];
  const uebergabe = rumpf(quelle, 'function flowHerausgabeUebergabe(sektorId, auswahl) {');
  const starten = rumpf(quelle, 'function herausgabeFormStarten(sektorId, formId, auswahl) {');
  const formen = rumpf(quelle, 'function _herausgabeFormen(sektorId) {');
  if (!/const formen = \[\{ id: 'pdf', label: STRINGS\.herausgebenPdf \}\];/.test(formen)) fehler.push('das PDF ist nicht die erste Form jedes Bereichs');
  if (!/if \(formId === 'pdf'\) return flowBereichPdf\(sektorId, undefined, vorab\);/.test(starten)) fehler.push('herausgabeFormStarten erzeugt kein PDF');
  if (!/b\.onclick = \(\) => herausgabeFormStarten\(sektorId, b\.getAttribute\('data-h-form'\), auswahl\);/.test(uebergabe)) fehler.push('ein Knopf der Übergabe läuft nicht über herausgabeFormStarten');
  const knoepfe = (uebergabe.match(/<button type="button"/g) || []).length;
  const mitForm = (uebergabe.match(/<button type="button" class="btn btn-sek" data-h-form=/g) || []).length;
  if (knoepfe === 0 || knoepfe !== mitForm) fehler.push('ein Knopf der Übergabe trägt kein data-h-form (' + mitForm + ' von ' + knoepfe + ')');
  if (/\b(?:flowSektorExport|flowEudiwUebergabe|flowBereichPdf)\s*\(/.test(uebergabe)) fehler.push('die Übergabe startet eine Form an herausgabeFormStarten vorbei');
  return fehler;
}

test('[Austausch·Standard und PDF] jede Form der Übergabe läuft über herausgabeFormStarten, das PDF steht bei jedem Bereich zur Wahl', async () => {
  assert.deepEqual(pdfWegBefund(KERN), []);
  const V = await depot();
  assert.equal(V._herausgabeFormen(BEREICH)[0].id, 'pdf', 'das PDF ist die erste Form des Bereichs');
});

test('[Austausch·Standard und PDF·Rot-Beweis] ein Knopf an herausgabeFormStarten vorbei und ein fehlendes PDF werden gefunden', () => {
  const vorbei = KERN.replace("b.onclick = () => herausgabeFormStarten(sektorId, b.getAttribute('data-h-form'), auswahl);", "b.onclick = () => flowSektorExport(b.getAttribute('data-h-form'));");
  assert.notEqual(vorbei, KERN, 'Vorbedingung: die Stelle zum Verändern existiert');
  assert.ok(pdfWegBefund(vorbei).includes('ein Knopf der Übergabe läuft nicht über herausgabeFormStarten'));
  const ohnePdf = KERN.replace("if (formId === 'pdf') return flowBereichPdf(sektorId, undefined, vorab);", '');
  assert.ok(pdfWegBefund(ohnePdf).includes('herausgabeFormStarten erzeugt kein PDF'));
});
