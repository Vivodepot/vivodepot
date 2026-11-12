'use strict';
/* Angeschlossen heißt: derselbe Satz (04.11.2026, Befund IMPORT-VERWIRFT-OHNE-ANZEIGE, Anschluss der Arten)
   Die Stellen, an denen ein Import abgewiesen wird, bilden jetzt das Anzeige-Modell und zeigen dessen Text. Der Satz, den
   die Person liest, darf sich dadurch nicht ändern: je Art und Grund ist der Text des Modells genau der Satz, den die Stelle
   vorher selbst gewählt hat. Die Erwartung steht hier ausgeschrieben, nicht aus der Satzquelle des Kerns abgeleitet. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');

/* Je Art: [Grund, Kontext oder null, Satz wie die Stelle ihn vorher wählte]. */
function erwartungen(V) {
  const S = V.STRINGS, vd = (k) => V.vorDepotText(k);
  return {
    'depot-datei': [
      ['krypto-fassung', { code: 'krypto-fassung' }, vd('dateiFassungUnbekannt')],
      ['datei-defekt', { code: 'datei-defekt' }, vd('dateiNichtLesbar')],
      ['passwort', new Error('GCM'), vd('entsperrPasswortFalsch')],
    ],
    'interner-stand': [
      ['kein-stand', null, vd('oeffnenKeinStand')],
      ['passwort-oder-beschaedigt', { code: 'passwort-oder-beschaedigt' }, vd('idbPasswortUndBeschaedigt')],
      ['passwort', new Error('GCM'), vd('entsperrPasswortFalsch')],
    ],
    'wiederherstellungs-code': [
      ['abgeschrieben', null, vd('whcFehlerAbgeschrieben')],
      ['keine-huelle', null, vd('whcFehlerKeineHuelle')],
      ['passt-nicht', null, vd('whcFehlerPasstNicht')],
    ],
    'mappe-datei': [
      ['datei-zu-gross', null, S.mappeDateiZuGross],
      ['mappe-fehler', null, S.mappeFehler],
    ],
    'kdl': [
      ['kdl-ohne-version', null, S.kdlFehler_kdl_ohne_version || S.kdlFehler_kdl_kein_codesystem],
      ['zz-probe-unbekannt', null, S.kdlFehler_kdl_kein_codesystem],
    ],
    /* Gruppe 2 · die Import-Wege. Ein ungültiger Plan reicht sich selbst als Kontext weiter (Ablehnungssatz, widerrufen). */
    ...Object.fromEntries(['voll-depot-json', 'b16-migration', 'bereichs-format'].map((art) => [art, [
      ['signiert-pruefung-fehlt', { ungueltig: true, grund: 'signiert-pruefung-fehlt' }, S.importSignierterNachweisPruefungFehlt],
      ['depot-zu-neu', { ungueltig: true, grund: 'depot-zu-neu' }, S.importZuNeu],
      ['abgewiesen', { ungueltig: true, ablehnungText: 'ZZ-Probe-Ablehnungssatz' }, 'ZZ-Probe-Ablehnungssatz'],
      ['abgewiesen', { ungueltig: true, widerrufen: true }, S.importWiderrufen],
      ['abgewiesen', { ungueltig: true }, S.importUngueltig],
      ['kein-plan', null, S.importUngueltig],
    ]])),
    'autoritatives-dokument': [
      ['depot-zu-gross', null, S.depotGesamtZuGross],
      ['nicht-erkannt', null, S.importUngueltig],
    ],
    'vereinbarung-antwort': [['abgewiesen', null, S.vereinbarungAntwortAbgewiesen]],
  };
}
const ANGESCHLOSSEN = Object.freeze(['depot-datei', 'interner-stand', 'wiederherstellungs-code', 'mappe-datei', 'kdl',
  'autoritatives-dokument', 'vereinbarung-antwort', 'voll-depot-json', 'b16-migration', 'bereichs-format']);
/* Die drei Import-Wege bilden das Modell über importPlanAbweisungText, das die Art aus dem Format liest. */
const UEBER_FORMAT = Object.freeze({ json: 'voll-depot-json', 'vivodepot-beta': 'b16-migration', 'zz-probe-format': 'bereichs-format' });

function abweichungen(V) {
  const aus = [];
  for (const [art, faelle] of Object.entries(erwartungen(V))) {
    for (const [grund, kontext, satz] of faelle) {
      assert.ok(typeof satz === 'string' && satz, art + ' · ' + grund + ': der erwartete Satz fehlt im Textsatz');
      const text = V.importAnzeigeText(V.importAnzeigeModell(art, { ok: false, grund }), kontext || undefined);
      if (text !== satz) aus.push(art + ' · ' + grund + ': ' + JSON.stringify(text) + ' statt ' + JSON.stringify(satz));
    }
  }
  return aus;
}

test('[Anschluss·Satz] je Art und Grund zeigt das Modell genau den Satz, den die Stelle vorher zeigte', () => {
  assert.deepEqual(abweichungen(ladeKern().V), []);
});

test('[Anschluss·Stellen] die Stellen dieser Arten bilden das Modell, und der alte Satz steht dort nicht mehr selbst', () => {
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  const ohne = ANGESCHLOSSEN.filter((art) => !kern.includes("importAnzeigeModell('" + art + "'"));
  assert.deepEqual(ohne, [], 'diese Arten bildet keine Stelle');
  // Die vorige Satzwahl an den Stellen ist ersetzt, nicht verdoppelt.
  for (const alt of ["ui.toast(vorDepotText('dateiNichtLesbar'), 'warn')", "e.vdMappeZuGross) ? STRINGS.mappeDateiZuGross",
    "zeigeFehler(oeffnenAbweisungText(", "ui.toast(_eigenerWert(STRINGS, 'kdlFehler_'", "ui.toast(importUngueltigNachricht(plan)",
    "ui.toast(zuGross ? STRINGS.depotGesamtZuGross", "ui.toast(STRINGS.vereinbarungAntwortAbgewiesen",
    "teil.opts); } catch (e) { ui.toast(STRINGS.importUngueltig"]) {
    assert.equal(kern.includes(alt), false, 'die Stelle wählt ihren Satz noch selbst: ' + alt);
  }
});

test('[Anschluss·Format] die Import-Wege lesen ihre Art aus dem Format, und der Satz eines ungültigen Plans bleibt', () => {
  const { V } = ladeKern();
  for (const [format, art] of Object.entries(UEBER_FORMAT)) {
    assert.equal(V.importAnzeigeModell(art, { ungueltig: true, formatId: format }).art, art);
    assert.equal(V.importPlanAbweisungText({ ungueltig: true, formatId: format, grund: 'depot-zu-neu' }), V.STRINGS.importZuNeu, format);
    assert.equal(V.importPlanAbweisungText({ ungueltig: true, formatId: format, ablehnungText: 'ZZ-Satz' }), 'ZZ-Satz', format);
  }
  assert.equal(V.importPlanAbweisungText(null), V.STRINGS.importUngueltig);
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  assert.ok(kern.includes("if (!plan || plan.ungueltig) { ui.toast(importPlanAbweisungText(plan), 'fehler'); return; }"), 'die Vorschau bildet das Modell');
});

test('[Anschluss·Satz·Rot-Beweis] ohne die Satzquelle einer Art zeigt das Modell den allgemeinen Satz, und die Probe sieht es', () => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const ZEILE = "  'mappe-datei': (g) => (g === 'datei-zu-gross') ? STRINGS.mappeDateiZuGross : STRINGS.mappeFehler,\n";
  assert.equal(quelle.split(ZEILE).length, 2, 'die Satzquelle der Mappe steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anschluss-satz-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(ZEILE, ''));
    const aus = abweichungen(ladeKern({ htmlPfad: pfad, backen: true }).V);
    assert.ok(aus.some((z) => z.startsWith('mappe-datei · datei-zu-gross')), aus.join('\n'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
