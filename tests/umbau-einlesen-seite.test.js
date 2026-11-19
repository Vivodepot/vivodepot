'use strict';
/* ═════════════════════════════════════════════════════════════════
   Umbau U-6, Einlesen als Seite nach dem Desktop-Dummy (16.11.2026).

   „Einlesen“ in der Seitenleiste öffnete den Dialog „Wohin einlesen?“. Nach dem Dummy öffnet es eine Seite: Titel, Unterzeile,
   Ablagefläche mit „Dateien auswählen“ und der Zeile der Formate. Eine Tür für alles (Konzept 31.10.2026, Fassung 3, Umbau U-3):
   keine Liste weiterer Wege; das Ziel ändert die Person in der Vorschau, die Übernahme aus der alten App ist eine Zeile in den
   Einstellungen, die Sicherungskopie öffnet die Startseite. Gezogene oder gewählte Dateien gehen in die Inhaltserkennung
   ohne Bereichsvorwahl. In der Vorschau nach dem Erkennen steht oben eine Zeile: was erkannt wurde, Datei, Herkunft, Ablage und
   „Anderen Bereich wählen“. Eingelesen wird nur ins geöffnete Depot (Entscheidung 16.11.2026).

   Proben (auf Zeichenebene, weil die Test-DOM innerHTML nicht parst):
   [U-6·Knopf]     Kopfleiste, Seitenleiste und Handy-Leiste öffnen die Seite (am Quelltext, die Test-DOM parst innerHTML nicht).
   [U-6·Seite]     das Öffnen zeigt die Seite, keinen Dialog; Ablagefläche, Wählen, Formate, keine Liste weiterer Wege; der Freigabe-Link als eigene Zeile.
   [U-3·Beta]      die Übernahme aus der alten App steht in den Einstellungen und ruft flowImportDatei('vivodepot-beta').
   [U-3·Ziel]      das Ziel ändert die Person in der Vorschau: „Anderen Bereich wählen“ öffnet die Bereichswahl.
   [U-6·Erkannt]   die Erkannt-Zeile nennt Datei, Herkunft und Ablage und trägt „Anderen Bereich wählen“.
   [M26·Stelle]    ohne Aussteller nennt die Erkannt-Zeile keine Herkunft und die Übersicht nur „eingelesen“; der Name des
                   Einlesewegs steht nie als Stelle da (Bildabgleich 375), mit Rot-Beweis.
   [U-6·Autark]    die Seite bietet kein Ziel-Depot an; die Datei geht ohne Depot-Angabe in die Erkennung des geöffneten Depots.
   [U-6·Knopf · Rot-Beweis] ein Kern, dessen Knopf noch den Dialog öffnet, fällt an [U-6·Knopf].
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

async function imDepot(k) {
  await k.V.depotAnlegen('einlesen-seite-pw-2026!');
  k.V.betreteApp();
  k.V.renderSidebar();
  return k;
}

/* Öffnet die Seite wie der Knopf der Seitenleiste (oeffneEinlesen) und meldet, ob ein Dialog aufging und was im Inhalt steht.
   Die Test-DOM parst innerHTML nicht; darum ruft die Probe die Funktion, und [U-6·Knopf] prüft die Bindung am Quelltext. */
function oeffne(k) {
  const { V, document } = k;
  let dialog = null;
  const echt = V.ui.modal;
  V.ui.modal = (opt) => { dialog = opt; return () => {}; };
  try { V.oeffneEinlesen(); } finally { V.ui.modal = echt; }
  return { dialog, inhalt: document.getElementById('content').innerHTML, sb: document.getElementById('sidebar').innerHTML };
}

/* Die Knöpfe (Kopfleiste, Seitenleiste und Handy-Leiste) öffnen die Seite, nicht den Dialog. Liefert die fehlenden Bindungen. */
function knopfLuecken(src) {
  const out = [];
  if (!src.includes("document.querySelectorAll('[data-einlesen-zentral],[data-einlesen-schmal]').forEach(b => {\n    b.onclick = () => (imVorschau() ? umschauEinrichten(null, null) : oeffneEinlesen());")) out.push('Kopfleiste und Seitenleiste');
  if (!src.includes('btEinlesen.onclick = () => oeffneEinlesen();')) out.push('Handy-Leiste');
  return out;
}

test('[U-6·Knopf] Kopfleiste, Seitenleiste und Handy-Leiste öffnen die Seite', () => {
  assert.deepEqual(knopfLuecken(fs.readFileSync(KERN, 'utf8')), []);
});

test('[U-6·Seite] „Einlesen“ öffnet die Seite mit Ablagefläche, Wählen, Formaten, ohne weitere Wege, keinen Dialog', async () => {
  const k = await imDepot(ladeKern({ backen: true }));
  const S = k.V.STRINGS;
  const { dialog, inhalt, sb } = oeffne(k);
  assert.equal(dialog, null, 'kein Dialog „Wohin einlesen?“');
  assert.equal(k.V.getViewState().aktiveAnsicht, 'einlesen');
  assert.ok(inhalt.includes('data-ansicht="einlesen"'), 'die Seite Einlesen');
  for (const s of [S.einlesenSeiteTitel, S.einlesenSeiteUnter, S.einlesenAblageZiehen, S.einlesenDateienWaehlen, S.einlesenFormate]) {
    assert.ok(inhalt.includes(s), 'auf der Seite: ' + s);
  }
  assert.ok(inhalt.includes('id="einlesen-ablage"'), 'Ablagefläche');
  assert.ok(inhalt.includes('id="einlesen-waehlen"'), 'Knopf „Dateien auswählen“ mit fester ID (Weg ohne Ziehen)');
  assert.match(fs.readFileSync(KERN, 'utf8'), /function einlesenDateiWaehlen\(f\) \{[\s\S]*?<input type="file" id="einlesen-datei" hidden>/, 'die Dateiwahl setzt den Picker ein');
  for (const a of ['data-einlesen-bereich', 'data-iz-ganzes', 'data-iz-beta', 'einlesen-wege']) {
    assert.ok(!inhalt.includes(a), 'kein weiterer Weg auf der Seite: ' + a);
  }
  assert.ok(inhalt.includes('id="einlesen-shl" data-iz-shl-empfangen="1"') && inhalt.includes(S.shlEmpfangTitel), 'Freigabe-Link als eigene Zeile');
  assert.ok(fs.readFileSync(KERN, 'utf8').includes("verdrahteEintritt('einlesen-shl', () => flowShlEmpfangen(''));"), 'Freigabe-Link ruft den Empfang');
  assert.ok(sb.includes('class="nav-item nur-schmal aktiv" data-einlesen-schmal="1"'), 'der Eintrag der Seitenleiste ist als aktiv markiert');
});

test('[U-3·Ziel] das Ziel ändert die Person in der Vorschau', () => {
  const src = fs.readFileSync(KERN, 'utf8');
  assert.match(src, /if \(_anders\) _anders\.onclick = \(\) => \{[\s\S]{0,200}?flowEinlesenZentral\(\);\n  \};/, '„Anderen Bereich wählen“ öffnet die Bereichswahl');
});

test('[U-3·Beta] die Übernahme aus der alten App ist eine Zeile in den Einstellungen', async () => {
  const k = await imDepot(ladeKern({ backen: true }));
  const html = k.V.einstellungenHTML();
  assert.ok(html.includes('id="einst-beta-uebernehmen"') && html.includes(k.V.STRINGS.importBetaLabel.replace(/&/g, '&amp;')), 'Zeile in den Einstellungen');
  assert.ok(fs.readFileSync(KERN, 'utf8').includes("if (ebeta) ebeta.onclick = () => flowImportDatei('vivodepot-beta');"), 'Verdrahtung');
});

test('[U-6·Erkannt] die Erkannt-Zeile nennt Datei, Herkunft und Ablage und bietet „Anderen Bereich wählen“', async () => {
  const k = await imDepot(ladeKern({ backen: true }));
  const { V } = k;
  const S = V.STRINGS;
  const plan = V.importPlan('vivodepot-beta', JSON.stringify({ vorname: 'Erika' }));
  plan.dateiname = 'erika-alt.json';
  plan.aussteller = 'Beispielpraxis';
  plan.zeilen = (plan.zeilen || []).concat([{ sektorId: 'health', status: 'neu', label: 'x', neuText: 'y' }]);
  const html = V.einlesenErkanntZeileHTML(plan);
  assert.ok(html.includes('data-einlesen-erkannt="1"'));
  assert.ok(html.includes('erika-alt.json'), 'Datei');
  assert.ok(html.includes('Beispielpraxis'), 'Herkunft');
  assert.ok(html.includes(S.einlesenErkanntAblage + ' '), 'Ablage');
  assert.ok(html.includes('data-i-anderer-bereich="1"') && html.includes(S.einlesenAndererBereich), 'Anderen Bereich wählen');
});

test('[M26·Stelle] ohne Aussteller keine Stelle aus dem Wegnamen; mit Quelle im Dokument steht die Quelle da', async () => {
  const k = await imDepot(ladeKern({ backen: true }));
  const { V } = k;
  const S = V.STRINGS;
  const weg = S.importFhirLabel;
  assert.ok(weg, 'Wegname des IPS-Einlesens');
  assert.equal(V.einleseStelleAusQuelle(weg), '', 'der Wegname allein ist keine Stelle');
  assert.equal(V.einleseStelleAusQuelle(weg + ' · Praxis Dr. Beispiel'), 'Praxis Dr. Beispiel', 'die Quelle hinter dem Weg');
  assert.equal(V.einleseStelleAusQuelle('Praxis Beispiel'), 'Praxis Beispiel', 'eine Stelle ohne Weg bleibt');
  assert.equal(V.einleseStelleAusQuelle(''), '');
  // Erkannt-Zeile: ohne Aussteller und ohne Quelle im Dokument steht kein Wegname als Herkunft.
  const plan = { formatId: 'fhir-ips', quelleLabel: weg, dateiname: 'beispiel-ips.json', zeilen: [{ sektorId: 'health' }], listen: [] };
  const html = V.einlesenErkanntZeileHTML(plan);
  assert.ok(html.includes('beispiel-ips.json'), 'Datei');
  assert.ok(!html.includes(weg), 'kein Wegname als Herkunft: ' + html);
  plan.quelleLabel = weg + ' · Praxis Dr. Beispiel';
  assert.ok(V.einlesenErkanntZeileHTML(plan).includes('Praxis Dr. Beispiel'), 'die gelesene Quelle steht da');
  // Übersicht: ein Stempel nur mit dem Wegnamen sagt „eingelesen“, ohne „von …“.
  const her = V.uebersichtHerkunft({ eingabeArt: 'import', quelle: weg });
  assert.equal(her.text, S.urheberEingelesen, 'nur „eingelesen“');
  assert.equal(V.uebersichtHerkunft({ eingabeArt: 'import', quelle: weg + ' · Praxis Dr. Beispiel' }).text,
    S.urheberEingelesen + ' ' + S.urheberVon + ' Praxis Dr. Beispiel');
  // Rot-Beweis: die alte Regel (quelle als Stelle) hätte den Wegnamen genannt.
  const alt = (st) => S.urheberEingelesen + ' ' + S.urheberVon + ' ' + st.quelle;
  assert.notEqual(alt({ quelle: weg }), her.text, 'die alte Regel nannte den Wegnamen');
});

test('[U-6·Autark] die Seite bietet kein Ziel-Depot an; die Datei geht ohne Depot-Angabe in die Erkennung', async () => {
  const k = await imDepot(ladeKern({ backen: true }));
  const { inhalt } = oeffne(k);
  for (const fremd of ['data-sub-depot', 'data-depot-wahl', 'data-fuer-wen']) assert.ok(!inhalt.includes(fremd), 'keine Depot-Wahl: ' + fremd);
  const src = fs.readFileSync(KERN, 'utf8');
  assert.match(src, /^async function importAutoDatei\(datei, sektorId, schliessen\) \{$/m, 'die Erkennung kennt kein Ziel-Depot');
  assert.ok(src.includes('  if (f) { importAutoDatei(f, null, () => {}); return; }'), 'die Seite liest ohne Bereichsvorwahl');
});

/* Rot-Beweis: ein Kern, dessen Knopf noch den Dialog öffnet (Stand vor U-6), fällt an [U-6·Knopf]. */
test('[U-6·Knopf · Rot-Beweis] ein Kern, dessen Einlesen-Knopf den Dialog öffnet, fällt auf', () => {
  const src = fs.readFileSync(KERN, 'utf8');
  const anker = 'umschauEinrichten(null, null) : oeffneEinlesen());';
  assert.equal(src.split(anker).length - 1, 1, 'Vorbedingung: der Anker steht genau einmal');
  assert.deepEqual(knopfLuecken(src.replace(anker, 'umschauEinrichten(null, null) : flowEinlesenZentral());')), ['Kopfleiste und Seitenleiste']);
});
