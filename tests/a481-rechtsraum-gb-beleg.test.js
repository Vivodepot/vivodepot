'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A481 (Laufzettel Nacht 22./23.08.2026, Posten 17) — der Beleg, den die
   Entscheidung vom 22.08.2026 zur A481-Zeile verlangt:

     "entschieden ist, dass UK im Gerüst MÖGLICH sein muss — nicht, dass UK
     gebaut wird. Ein Beleg, dass es NICHT geht, erfüllt das Ziel ebenfalls."

   `tests/persona-p13-p16.test.js` [C1–C3] misst nur, dass der EINGEBAUTE
   Katalog (`AB_WERK_RECHTSRAUM_DE`) weder `GB` noch `UK` kennt — das ist wahr
   und bleibt wahr, der eingebaute Katalog ist bewusst DE-only.

   Diese Datei misst die andere Hälfte, die noch nicht wörtlich geprüft war:
   trägt der ANDOCK-Weg (`modulEinlassen` → `EINLASS_REGISTER` → Boot-
   Registrierung → `_rechtsraumKatalogLesen`) einen ZWEITEN Rechtsraum,
   ohne dass der Kern angefasst wird? Der Mechanismus selbst ist nicht neu
   — Glied 5 (A271) hat ihn gebaut, `tests/einlassweg-module.test.js` und
   `tests/rechtsraum-modul-vertrag.test.js` docken bereits FR/AT/CH. Neu ist
   nur der wörtliche Beleg für GB, End-zu-Ende über den echten Dateiweg
   (`modulEinlassen`, nicht die interne Einbett-Funktion direkt) — genau der
   Weg, den ein Anbieter-Modul nähme. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}

test('[A481·Beleg] ein GB-Rechtsraum-Modul dockt über den echten Dateiweg an — kein Kern-Code geändert', () => {
  const V = frisch();
  const gbWortlaut = 'Lasting Power of Attorney — Property and Financial Affairs (Vereinigtes Königreich)';
  const rohText = JSON.stringify({
    modulTyp: 'rechtsraum',
    rechtsraum: 'GB',
    sprache: 'en',
    moduleVersion: 1,
    typen: {
      // 'enduring-power-of-attorney' ist ein BEKANNTER Typ (Namensraum-Schutz erlaubt das —
      // s. Kommentar an `_rechtsraumModulUebersetzen`: ein Modul darf zu einem
      // bekannten Typ INHALT beitragen, das beschattet nichts).
      'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: gbWortlaut,
        formvorschriften: { hinweis: 'Registrierung beim Office of the Public Guardian erforderlich' } },
    },
  });

  const d = V.getData();
  const ergebnis = V.modulEinlassen(rohText, d);
  assert.equal(ergebnis.angenommen, true, 'GB-Modul wird angenommen: ' + ergebnis.grund);
  assert.equal(ergebnis.typ, 'rechtsraum');
  assert.equal(ergebnis.kennung, 'GB');
  V.setData(d);

  /* Boot-Registrierung — derselbe Weg, den jedes Laden eines Depots fährt. */
  V._rechtsraumModuleAusDepotAnmelden(V.getData());

  /* Und jetzt der Lese-Weg, den der Kontrollfluss tatsächlich benutzt
     (`_rechtsraumKatalogLesen`, nicht das rohe Datenfeld) — GENAU die Stelle,
     an der ein `enduring-power-of-attorney`-Wortlaut für einen Rechtsraum abgerufen wird. */
  assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'GB', 'wortlaut'), gbWortlaut,
    'der angedockte GB-Wortlaut muss über denselben Lese-Weg wie der eingebaute DE-Wortlaut ankommen');
  assert.equal(
    V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'GB', 'formvorschriften', 'hinweis'),
    'Registrierung beim Office of the Public Guardian erforderlich');

  /* Gegenprobe: der eingebaute Katalog selbst bleibt unverändert DE-only —
     das Andocken schreibt NICHT in `AB_WERK_RECHTSRAUM_DE`. */
  assert.equal(V.getRechtsraumModulRegistry().DE['enduring-power-of-attorney'].GB, undefined,
    'der eingebaute Katalog wird durch das Andocken nicht verändert');
});

test('[A481·Rot-Beweis] ohne Boot-Registrierung bleibt der gelesene Wortlaut leer — der Test prüft also wirklich den Andock-Weg', () => {
  const V = frisch();
  const d = V.getData();
  V.modulEinlassen(JSON.stringify({
    modulTyp: 'rechtsraum', rechtsraum: 'GB', sprache: 'en', moduleVersion: 1,
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: 'GB-Text' } },
  }), d);
  V.setData(d);
  /* Absichtlich KEIN `_rechtsraumModuleAusDepotAnmelden` gerufen. */
  assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'GB', 'wortlaut'), undefined,
    'ohne Boot-Registrierung liest der Kontrollfluss nichts — belegt, dass der obere Test die ' +
    'Registrierung wirklich braucht und nicht zufällig grün ist');
});
