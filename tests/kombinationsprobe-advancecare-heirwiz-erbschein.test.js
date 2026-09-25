'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kombinationsprobe — alle drei Register EINES echten Themas zusammen
   (Strang D, Schritt 6, 17.09.2026, vor dem Umbau auf Templates)
   ────────────────────────────────────────────────────────────────────────────
   BISHER hat jeder Strang sein eigenes Register einzeln bewiesen: Bereiche
   (bereichsersatz-struktur-achse), Wizards (wizards-template-rundlauf.test.js,
   heute), Logikmodule (siebtes-register-erbschein-byte-gleichheit.test.js —
   aber dort werden Feldwerte direkt in `data.sektoren` gesetzt, nie über einen
   echten Wizard-Schritt). NIEMAND hat bisher Bereich → Wizard → Logikmodul als
   EINE Kette für dasselbe Thema gefahren. Genau diese Lücke prüft diese Datei —
   VOR dem Umbau (Strang A: die zwölf Bereiche werden individuell ladbare
   Templates), solange der native Bestand noch der Vergleichsmaßstab ist: nach
   dem Schnitt gibt es diesen Weg nicht mehr, ein Formfehler wäre dann eine
   Suche statt ein Vergleich.

   DAS THEMA (Vorsorge/Erbe/Vertretung) UND SEIN DREIECK — GEMESSEN, nicht
   erfunden (17.09.2026, gegengeprüft hier):
     Bereich:    `advanceCare` (nativ, im eingebetteten BUERGERMODUL_BUENDEL —
                 noch keine eigene tools/bereich-templates/-Datei)
     Wizard:     `heirwiz` (einer der fünf reinen Wizards aus Schritt 5, Ziel
                 `identity`, sein erster Schritt schreibt `maritalStatus`)
     Logikmodul: `erbschein-vorbereitung` (tests/fixtures/erbschein-vorbereitung-
                 logikmodul.json, seit U2-ADR-288 AB WERK bei jedem
                 `depotAnlegen()` gesät — kein manueller Einlass nötig) — sein
                 `datenSchema.familienstand` liest `identity.maritalStatus`.

   Alle drei Bausteine sind darum in einem GANZ GEWÖHNLICHEN, frisch angelegten
   Depot bereits vorhanden — kein Docking, kein Fremdmodul-Einlass, kein
   erfundener Gegenstand. Die Probe fährt den ECHTEN Bürger-Weg: ein Wizard-
   Schritt setzen (`wizardSchrittSetzen`, derselbe Weg wie `tests/wizard-
   heirwiz.test.js`), danach dasselbe Feld über den Logikmodul-Auszug lesen
   (`dokumentHTML('erbschein-vorbereitung')`, derselbe Weg wie die Byte-
   Gleichheit-Probe) — nicht den Feldwert von Hand in `data.sektoren` schreiben,
   wie die bestehenden Logikmodul-Proben es tun. Das ist der Unterschied, der
   hier etwas beweist: dass der Bürger-Weg (Assistent ausfüllen) tatsächlich
   bis in den Auszug durchreicht, nicht nur, dass ein von Hand gesetzter Wert
   dort ankommt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frischesDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen('Kombinationsprobe-2026!');
  V.akteurSelbstErklaeren('Tester');
  return V;
}

test('[Kombinationsprobe] Vorbedingung — alle drei Bausteine sind in einem frischen Depot bereits vorhanden, ohne jedes Docking', async () => {
  const V = await frischesDepot();
  assert.ok(V.SEKTOR_BY_ID.advanceCare, 'Bereich advanceCare fehlt');
  const heirwiz = V.WIZARD_BY_ID.heirwiz;
  assert.ok(heirwiz, 'Wizard heirwiz fehlt');
  assert.equal(heirwiz.ziel.sektor, 'identity', 'Vorbedingung für Schritt 0: heirwiz zielt auf identity');
  assert.equal(heirwiz.schritte[0].feld.id, 'maritalStatus', 'Vorbedingung: erster Schritt schreibt maritalStatus');
  // Seit Schema 87 ist der Erbschein-Auszug Saat des Produkts (Template im Rezept), nicht mehr Eintrag im Depot: gelesen über die eine Lesestelle.
  const erbschein = V._logikModuleAlle(V.getData()).find((m) => m.id === 'erbschein-vorbereitung');
  assert.ok(erbschein, 'Logikmodul erbschein-vorbereitung wurde nicht ab Werk gesät');
  assert.ok(erbschein.datenSchema.familienstand
    && erbschein.datenSchema.familienstand.sektor === 'identity'
    && erbschein.datenSchema.familienstand.feld === 'maritalStatus',
    'Vorbedingung: das Logikmodul liest exakt das Feld, das heirwiz schreibt');
});

test('[Kombinationsprobe] ein echter Wizard-Schritt (heirwiz) erreicht den Logikmodul-Auszug (erbschein-vorbereitung) — Bereich, Wizard und Logikmodul greifen als EINE Kette', async () => {
  const V = await frischesDepot();
  const vorher = V.dokumentHTML('erbschein-vorbereitung');
  assert.match(vorher, /Familienstand\? — nicht erfasst —/, 'Vorbedingung: ohne Eintrag zeigt der Auszug die Lücke');

  V.wizardSchrittSetzen('heirwiz', 0, 'verh');   // derselbe Weg wie tests/wizard-heirwiz.test.js #2

  assert.equal(V.getData().sektoren.identity.maritalStatus, 'verh',
    'der Wizard-Schritt muss wirklich in den Bereich schreiben — sonst prüft der Rest nichts');

  const nachher = V.dokumentHTML('erbschein-vorbereitung');
  assert.doesNotMatch(nachher, /Familienstand\? — nicht erfasst —/,
    'nach dem Wizard-Schritt darf die Lücke bei Familienstand nicht mehr stehen');
  assert.match(nachher, /Familienstand\? verheiratet/,
    'der Auszug muss den über den Wizard gesetzten Wert zeigen, nicht nur irgendeinen');
});

test('[Kombinationsprobe · Gegenprobe] OHNE den Wizard-Schritt bleibt die Lücke bei Familienstand stehen — die Positiv-Probe prüft wirklich eine Wirkung, nicht ein Depot, das die Lücke ohnehin nie zeigt', async () => {
  const V = await frischesDepot();
  const html = V.dokumentHTML('erbschein-vorbereitung');
  assert.match(html, /Familienstand\? — nicht erfasst —/,
    'ROT ERWARTET wäre hier GRÜN: bestünde die vorherige Probe auch ohne den Wizard-Schritt, '
    + 'bewiese sie die Kette nicht');
});
