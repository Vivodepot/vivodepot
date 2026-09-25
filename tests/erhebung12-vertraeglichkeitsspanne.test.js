'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ERHEBUNG 12 (Laufzettel „Nach den dreizehn", Posten 12) — die erklärte
   Verträglichkeit eines Bündels
   ────────────────────────────────────────────────────────────────────────────
   ANGEORDNET am 21.08.2026. Vier Angaben sind auf einem
   Marktplatz üblich — Herausgeber, Version, Signatur, erklärte Verträglichkeit.
   Die ersten drei stehen. Die vierte ist der Gegenstand.

   GEMESSEN mit `tools/vertraeglichkeitsspanne-messen.js`:

     1 Untergrenze `appVersion` am MODUL-Weg geprüft, benannt abgelehnt (verlangt/vorhanden)
     2 dieselbe Prüfung über ALLE FÜNF Register (sie steht im EINEN Einlassweg)
     3 Obergrenze GIBT ES NICHT
     4 die VORLAGE kann nichts sagen — und wird trotzdem nicht rot
     5 die Lese-App kennt keine dieser Angaben

   DER SCHÄRFSTE BEFUND IST PUNKT 4, und er ist genau die Unterscheidung, die der
   Auftrag verlangt: eine gepflanzte unmögliche Angabe (`appVersion: 9999`) im
   Vorlagen-Bündel macht NICHTS rot. `validateTemplate` ist ein Torwächter über
   BEKANNTE Schlüssel, nicht über den Umfang — ein unbekannter Schlüssel läuft
   stillschweigend durch. Eine Kammer, die ihre Verträglichkeit erklärt, bekäme
   also „angenommen" zurück und hätte nichts erklärt. Das Einreich-Schema führt
   `additionalProperties: false`, die LAUFENDE Prüfung setzt das nicht durch.

   MESSEN, NICHT BAUEN — so beauftragt. Ob ein Bündel eine Spanne deklarieren
   MUSS, ob sie geprüft wird und was bei Nichtpassen geschieht, ist eine Produktentscheidung. Diese Datei hält den Stand fest, an dem sie entscheidet.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/vertraeglichkeitsspanne-messen.js');

test('[E12·Positivkontrolle] jedes der fünf Register nimmt sein Modul OHNE Versionsangabe an', () => {
  /* Ohne diese Kontrolle sagt „abgelehnt" nichts über die Zahl: ein Fixture, das aus einem
     ZWEITEN Grund scheitert, macht die ganze Messung stumm. Beim ersten Lauf am 21.08. war
     genau das der Fall — zwei der fünf Fixtures fielen aus eigenem Mangel durch. */
  const { V } = ladeKern();
  for (const [name, modul] of Object.entries(M.MODULE)) {
    const d = V.leeresDepot();
    V.setData(d);
    const r = V.modulEinlassen(JSON.stringify(modul), d);
    assert.equal(r.angenommen, true, name + ' wird schon ohne Versionsangabe abgelehnt (' + r.grund + ')');
  }
});

test('[E12] die Untergrenze wird geprüft — und BENANNT abgelehnt, mit beiden Zahlen', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  const ab = M.appVersionAbtasten(V, d);
  assert.equal(typeof ab.grenze, 'number', 'keine Grenze gefunden — die Angabe wirkt nicht');
  assert.equal(ab.meldung.grund, 'app-zu-alt');
  assert.equal(ab.meldung.verlangtAppVersion, ab.abgelehntBei, 'die verlangte Zahl wird genannt');
  assert.equal(ab.meldung.appVersion, ab.grenze, 'und die vorhandene daneben — `grund` allein sagt der Bürgerin nichts');
});

test('[E12] es gibt KEINE Obergrenze — ein Bündel für einen älteren Kern läuft', () => {
  /* Der Fall, der in der Praxis eintritt, ist der umgekehrte: die Bürgerin aktualisiert nicht.
     Für ihn gibt es die Angabe; für den anderen nicht. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  const r = V.modulEinlassen(JSON.stringify(Object.assign({}, M.MODULE.bereich, { appVersion: 1 })), d);
  assert.equal(r.angenommen, true, 'ein Bündel für Stand 1 wird abgelehnt — dann gäbe es doch eine Obergrenze');
});

test('[E12·DER BEFUND] eine VORLAGE kann ihre Verträglichkeit nicht erklären — und merkt es nicht', () => {
  const { V } = ladeKern();
  const felder = [{ feldname: 'X', feldtyp: 'text', bereich: 'verwaltung' }];
  /* (a) Das Schema kennt den Schlüssel nicht. */
  const schema = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'docs', 'template-generator', 'submission-schema.json'), 'utf8'));
  const tpl = schema.properties.templates.items;
  assert.equal(tpl.additionalProperties, false, 'das Schema ist geschlossen …');
  assert.equal('appVersion' in (tpl.properties || {}), false, '… und führt `appVersion` nicht');
  /* (b) Die LAUFENDE Prüfung setzt das nicht durch — das ist der Unterschied zwischen
     „wird akzeptiert" und „wird ignoriert", den der Auftrag messen lässt. */
  assert.equal(V.validateTemplate({ felder, appVersion: 9999 }), null,
    'die gepflanzte unmögliche Angabe wird abgelehnt — dann ist dieser Befund überholt');
  assert.equal(V.validateTemplate({ felder, dieseAngabeGibtEsNicht: true }), null,
    'auch eine frei erfundene Angabe läuft durch: die Prüfung wacht über bekannte Schlüssel, nicht über den Umfang');
});

test('[E12] die Lese-App — die zweite Anwendung, die veröffentlicht — kennt keine dieser Angaben', () => {
  const lese = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  for (const wort of ['APP_VERSION', 'appVersion', 'anfrageVersion']) {
    assert.equal(lese.split(wort).length - 1, 0, '`' + wort + '` kommt in der Lese-App vor — Befund überholt');
  }
  assert.ok(lese.split('moduleVersion').length - 1 > 0,
    'Gegenprobe: `moduleVersion` kommt sehr wohl vor — die Datei ist nicht einfach leer an Versionsbegriffen');
});
