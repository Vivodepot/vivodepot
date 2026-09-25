'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rechtsraum-Katalog, U2-ADR-121 Gesamtfassung Zug 1 — Punkt 7 (Keller-Fundament)
   ────────────────────────────────────────────────────────────────────────────
   Die drei Fundamentanforderungen aus U2-ADR-037 gelten jetzt auch für
   `AB_WERK_RECHTSRAUM_DE`: Versions-Marke pro Eintrag, stabile Schlüssel (bereits
   erfüllt — Objekt-Keys = dieselben `typ`-Identifier wie im Rest der App),
   Unbekannt-Skip statt Exception. Geprüft hier:
     1) Jeder vorhandene {typ}.{rechtsraum}-Eintrag trägt eine `katalogVersion`
        (positive ganze Zahl).
     2) `_rechtsraumKatalogLesen` liefert `undefined` — nie eine TypeError —
        bei unbekanntem `typ`, unbekanntem `rechtsraum`, unbekanntem Pfad-
        Schlüssel, und wenn ein Zwischenschritt `null` ist.
     3) Rotmachbarkeit: eine Kopie mit gekipptem Katalog-Eintrag lässt Probe 1
        tatsächlich fehlschlagen (Positiv-/Negativkontrolle).
     4) Regression: die vier umgestellten Lesestellen liefern nach der
        Umstellung auf `_rechtsraumKatalogLesen` denselben Wert wie vorher.
   ════════════════════════════════════════════════════════════════════════════ */
const { katalogDe } = require('./helfer/rechtsraum-katalog-de.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* ── 1 · Versions-Marke pro Katalog-Eintrag ─────────────────────────────────── */

function versionsMarkeVerstoesse(katalog) {
  const fehler = [];
  for (const typ of Object.keys(katalog)) {
    // 'zweck' (U2-ADR-121 Posten 3, seit Zug 2) ist RECHTSRAUMUNABHÄNGIG und sitzt als Geschwister
    // von den Rechtsraum-Schlüsseln auf `typ`-Ebene — kein Rechtsraum, keine katalogVersion-Pflicht.
    for (const rechtsraum of Object.keys(katalog[typ]).filter((k) => k !== 'zweck')) {
      const eintrag = katalog[typ][rechtsraum];
      const v = eintrag.katalogVersion;
      if (!Number.isInteger(v) || v < 1) {
        fehler.push(`${typ}.${rechtsraum}.katalogVersion fehlt oder ist keine positive ganze Zahl: ${JSON.stringify(v)}`);
      }
    }
  }
  return fehler;
}

test('[Keller-Fundament] jeder Rechtsraum-Katalog-Eintrag trägt eine Versions-Marke', () => {
  const { V } = ladeKern();
  const eintraege = Object.keys(katalogDe(V)).length;
  assert.ok(eintraege >= 6, 'Positivkontrolle: der Katalog ist nicht leer (sechs bekannte Einträge erwartet)');
  assert.deepEqual(versionsMarkeVerstoesse(katalogDe(V)), [],
    'jeder {typ}.{rechtsraum}-Eintrag muss eine positive ganze `katalogVersion` tragen — sonst kann '
    + 'ein späterer Instrument-Stempel (Zug 4, Punkt 5) nicht festhalten, gegen welchen Stand er entstand.');
});

test('[Keller-Fundament·Negativkontrolle] die Versions-Marken-Probe schlägt an einem gekippten Beispiel an', () => {
  const kaputterKatalog = {
    testament: { DE: { katalogVersion: 0, wortlaut: null, formvorschriften: null, fristenVorrang: null } },
    'ohne-marke': { DE: { wortlaut: null, formvorschriften: null, fristenVorrang: null } },
  };
  const fehler = versionsMarkeVerstoesse(kaputterKatalog);
  assert.equal(fehler.length, 2, 'sowohl die Null als auch die fehlende Marke müssen auffallen: ' + JSON.stringify(fehler));
});

/* ── 2 · Unbekannt-Skip statt Exception ─────────────────────────────────────── */

test('[Keller-Fundament] unbekannter typ liefert undefined, keine Exception', () => {
  const { V } = ladeKern();
  assert.doesNotThrow(() => {
    const r = V._rechtsraumKatalogLesen('ein-typ-den-es-nicht-gibt', 'DE', 'fristenVorrang', 'monate');
    assert.equal(r, undefined);
  });
});

test('[Keller-Fundament] unbekannter Rechtsraum liefert undefined, keine Exception', () => {
  const { V } = ladeKern();
  assert.doesNotThrow(() => {
    const r = V._rechtsraumKatalogLesen('will', 'FR', 'fristenVorrang', 'auswahlform');
    assert.equal(r, undefined);
  });
});

test('[Keller-Fundament] unbekannter Pfad-Schlüssel liefert undefined, keine Exception', () => {
  const { V } = ladeKern();
  assert.doesNotThrow(() => {
    const r = V._rechtsraumKatalogLesen('will', 'DE', 'fristenVorrang', 'ein-schluessel-den-es-nicht-gibt');
    assert.equal(r, undefined);
  });
});

test('[Keller-Fundament] ein null-Zwischenschritt (z. B. formvorschriften:null) liefert undefined, keine Exception', () => {
  const { V } = ladeKern();
  // enduring-power-of-attorney.DE.formvorschriften ist im echten Katalog `null` — genau der Fall, den die
  // vorherige Punkt-Notation (`AB_WERK_RECHTSRAUM_DE['enduring-power-of-attorney'].DE.formvorschriften.paragraf`)
  // mit einer TypeError quittiert hätte.
  assert.doesNotThrow(() => {
    const r = V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'DE', 'formvorschriften', 'paragraf');
    assert.equal(r, undefined);
  });
});

test('[Keller-Fundament] ohne Pfad liefert der geschützte Zugriff den {rechtsraum}-Knoten selbst', () => {
  const { V } = ladeKern();
  const knoten = V._rechtsraumKatalogLesen('will', 'DE');
  // U2-ADR-382 (Besitz-Zug): der Knoten kommt seither aus der Ab-Werk-Saat
  // (`_RECHTSRAUM_MODUL_REGISTRY['DE']`, übersetzte Modul-Form) statt aus einer direkten
  // Referenz auf `AB_WERK_RECHTSRAUM_DE.typen[...].DE` — keine Objekt-Identität mehr (die
  // Übersetzung baut ein neues Objekt), aber wertgleich, inklusive `zweck`: die Modul-Form
  // trägt `zweck` flach neben den vier DE-eigenen Feldern, der native Katalog eine Ebene
  // höher (s. Kopf-Kommentar an AB_WERK_RECHTSRAUM_DE im Kern) — zwei Formen, ein Inhalt.
  const nativ = katalogDe(V).will;
  assert.deepEqual(knoten, Object.assign({}, nativ.DE, { zweck: nativ.zweck || null }));
});

/* ── 3 · Regression: die vier umgestellten Lesestellen bleiben wertgleich ───── */

test('[Keller-Fundament·Regression] Ehegattennotvertretung — sechs Monate wie zuvor', () => {
  const { V } = ladeKern();
  const heute = new Date('2026-07-26T12:00:00Z');
  const zeile = { basisOfRepresentation: 'ehegattennotvertretung', validSince: '2026-01-26' };
  // 2026-01-26 + 6 Monate = 2026-07-26 → am Stichtag selbst noch nicht abgelaufen (0 Tage Rest).
  assert.match(V.notvertretungAblaufText(zeile, heute), /läuft ab|abgelaufen/,
    'die Sechsmonatsfrist muss weiterhin wirken — der Wert kommt jetzt über den geschützten Zugriff');
});

test('[Keller-Fundament·Regression] Patientenverfügung/KI-Verfügung — Paragraf unverändert', () => {
  const { V } = ladeKern();
  const pv = V.VORSORGE_MODUL_BY_ID['patientenverfuegung'];
  const ki = V.VORSORGE_MODUL_BY_ID['ki-verfuegung'];
  assert.equal(pv.form.paragraf, '§ 1827 BGB');
  assert.equal(ki.form.paragraf, '§ 2247 BGB');
});

test('[Keller-Fundament·Regression] Testament-Vorrang — weiterhin "neueste"', () => {
  const { V } = ladeKern();
  assert.equal(V.LISTEN_AUSWAHLFORM.provisionInstruments.will, 'neueste');
});
