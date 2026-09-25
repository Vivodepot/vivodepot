'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die KI-Stufe zieht die Werte einer alten Akte auch in Pro um (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Schema 39 → 40 zieht die flachen ki_*-Werte aus `verwaltung` in eine Zeile der
   Vorsorge-Instrumente (tests/migration-40-ki-ort.test.js, dort nur in Privat geprüft). Welche
   Werte umziehen, entscheidet die DEKLARATION: die Unterfelder der Instrumenten-Liste, gelesen über
   `_listenFeldDef`. Das fragte den ANZEIGE-Index. `depotNormalisieren` läuft vor dem späten
   Index-Neubau; in Pro ruht `advanceCare` dort, die Deklaration war leer — keine KI-Zeile, und die
   Werte blieben als Waisen in `administration`, unter alten Namen, die kein Feld mehr kennt.

   EINMALIG: Die Stufe hängt an der Schemazahl. Wer seine alte Akte zuerst in Pro öffnete und
   sicherte, bekam die KI-Verfügung auch in Privat nie wieder als Zeile. Die dritte Probe geht genau
   diesen Weg.

   ROT-BEWEIS, GEMESSEN (16.09.2026, Kanon 662b4d39): pro-de legte weder beim direkten Normalisieren
   noch beim Öffnen der verschlüsselten Datei eine KI-Zeile an; die ki_*-Werte standen danach in
   `administration`. privat-de legte die Zeile an. Mit `_listenFeldDef` über den Katalog sind die
   Pro-Proben grün, die Privat-Gegenprobe bleibt es.

   WIE DIE DATEI ENTSTEHT: kein eingecheckter Binärstand, sondern ein Umschlag, den der heutige
   Kern um einen wörtlich eingefrorenen Datenstand mit Schema 39 legt. Das Öffnen läuft damit
   denselben Weg wie eine alte Datei — Entschlüsseln, `depotNormalisieren` ab Schema 39, später
   Index-Neubau. Nicht geprüft ist, dass ein Kern von damals denselben Umschlag geschrieben hätte.

   GESEHEN, NICHT HIER: Stufe 58 → 59 (Dokument-Referenz auf eine Instrument-Zeile) fragt die Rolle
   unter der ALTEN Bereichskennung `vorsorge`, die seit dem Kennungs-Umbau kein Produkt kennt.
   Gemessen am selben Tag in privat-de UND pro-de: die Referenz bekommt keine `zeilenId`. Das ist
   eine andere Klasse als diese — nicht Pro, sondern alte Kennung — und gehört eigens gemessen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const gebaut = new Map();
function produktKern(slug) {
  if (!gebaut.has(slug)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    if (!p) throw new Error('Unbekanntes Produkt „' + slug + '"');
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-ki-stufe-' + slug + '-'));
    const r = konfektionieren({
      ziel, slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut.get(slug);
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern(); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}

/* Wörtlich eingefroren, Stand vor dem Umbau der KI-Verfügung — nicht aus dem heutigen Modell
   erzeugt, sonst wanderte der Altbestand mit jedem Umbau mit. */
const SCHEMA_39 = Object.freeze({
  schemaVersion: 39,
  sektoren: {
    verwaltung: {
      bundid_status: 'hoch',
      ki_grundentscheidung: 'erlaubnis',
      ki_zweck: ['erinnerung', 'trauer'],
      ki_raum: 'privat',
    },
    vorsorge: {},
  },
});
const PASSWORT = 'ki-stufe-pro-probe-2026';
const kiZeile = (d) => (((d.sektoren || {}).advanceCare || {}).provisionInstruments || [])
  .find((r) => r && r.instrument === 'ki-verfuegung') || null;
const kiWaisen = (d) => Object.keys(((d.sektoren || {}).administration) || {}).filter((k) => k.startsWith('ki_'));

function erwarteUmzug(d, wo) {
  const z = kiZeile(d);
  assert.ok(z, wo + ': keine KI-Zeile entstanden');
  assert.equal(z.basicDecision, 'erlaubnis', wo);
  assert.deepEqual(z.purpose, ['erinnerung', 'trauer'], wo);
  assert.equal(z.scope, 'privat', wo);
  assert.deepEqual(kiWaisen(d), [], wo + ': ki_*-Werte stehen noch in administration');
}

let UMSCHLAG = null;
async function alteDatei() {
  if (!UMSCHLAG) {
    const Q = produktKern('privat-de').V;
    await Q.depotAnlegen(PASSWORT);
    const alt = JSON.parse(JSON.stringify(Q.getData()));
    Object.assign(alt, JSON.parse(JSON.stringify(SCHEMA_39)));
    Q.setData(alt);
    UMSCHLAG = await Q.depotSerialisieren();
  }
  return JSON.parse(JSON.stringify(UMSCHLAG));
}

test('[KI-Stufe·pro-de] eine alte Datei, in Pro geöffnet, bekommt ihre KI-Zeile', async () => {
  const V = produktKern('pro-de').V;
  await V.depotLaden(await alteDatei(), PASSWORT);
  erwarteUmzug(V.getData(), 'pro-de Datei');
});

test('[KI-Stufe·pro-en] dasselbe im englischen Pro', async () => {
  const V = produktKern('pro-en').V;
  await V.depotLaden(await alteDatei(), PASSWORT);
  erwarteUmzug(V.getData(), 'pro-en Datei');
});

test('[KI-Stufe·Einmaligkeit] zuerst in Pro geöffnet und gesichert, danach in Privat: die Zeile ist da', async () => {
  const pro = produktKern('pro-de').V;
  await pro.depotLaden(await alteDatei(), PASSWORT);
  const gesichert = await pro.depotSerialisieren();
  const privat = produktKern('privat-de').V;
  await privat.depotLaden(gesichert, PASSWORT);
  erwarteUmzug(privat.getData(), 'privat-de nach Pro');
});

test('[KI-Stufe·pro-de] auch das direkte Normalisieren zieht um', () => {
  const V = produktKern('pro-de').V;
  erwarteUmzug(V.depotNormalisieren(JSON.parse(JSON.stringify(SCHEMA_39))), 'pro-de normalisiert');
});

test('[KI-Stufe·Gegenprobe] in privat-de zieht die Datei um wie bisher', async () => {
  const V = produktKern('privat-de').V;
  await V.depotLaden(await alteDatei(), PASSWORT);
  erwarteUmzug(V.getData(), 'privat-de Datei');
});
