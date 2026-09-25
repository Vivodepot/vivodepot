'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-295 (Auftrag, 05.09.2026) — drittes Template, wieder auf dem
   Pro-Modul, diesmal strukturell ANDERS als U2-ADR-287 (Notarin): keine
   Kammer, kein Berufsrecht, kein Herausgeber außer Vivodepot selbst.
   Zuschnitt der wörtlich: „individuelle Kunden, zb geschäftsführer
   kleiner gmbhs, die Nachfolge, Vertretung, Notfall klären wollen." Die drei
   Worte sind der Inhalt, drei Abschnitte, klein gehalten.

   Diese Datei prüft, wie U2-ADR-287, das Bundle ISOLIERT über den echten
   Fremdmodul-Einlass (Node-Kern) UND die Erreichbarkeit über dokumentHTML().
   Die Erreichbarkeit über den ECHTEN Browser-Klickweg (Datei-Upload, Karte,
   Öffnen-Knopf) steht separat in tests/e2e/pro-geschaeftsfuehrerin-
   notfallmappe-abnahme.spec.js — Auflage aus demselben Auftrag: „Erreichbarkeit
   beweisen, nicht nur Gültigkeit", nachdem an diesem Tag drei Fälle auftraten,
   in denen etwas korrekt gebaut war und nie ankam (der Erbschein-Vorbereitungs-
   auszug, U2-ADR-288, war einer davon).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const BUNDLE_TEXT = fs.readFileSync(
  path.join(__dirname, '..', 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul.json'), 'utf8');

// U2-ADR-379 (08.09.2026): lädt jetzt das EINE ausgelieferte Bereichs-Modul-Artefakt statt es
// inline zu definieren — diese Datei trug vorher ihre eigene Kopie (sechs Sektoren, herkunft
// 'urn:...:v1'), zweiter Ort für dieselbe Sache. Ihre sechs Sektoren/Labels waren die RICHTIGEN
// (gegengeprüft, identisch zum Artefakt) — die anfängliche Artefakt-Fassung hatte fälschlich nur
// vier, aus dem abgeleitet, was DIESES Logikmodul referenziert (falsche Richtung: Struktur ist
// Obermenge der Nutzung, nicht ihr Abbild, s. ADR).
const BEREICH_TEXT = fs.readFileSync(
  path.join(__dirname, '..', 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereich.json'), 'utf8');

// Dasselbe Muster wie tests/pro-notar-kanzleivertretung-u2-adr-287.test.js — ein Bereichs-Modul
// über den echten Fremdmodul-Einlass (kein Test-Sonderweg).
function proBereicheEinlassen(V) {
  const r = V.modulEinlassen(BEREICH_TEXT);
  assert.equal(r.angenommen, true, 'Vorbedingung: die Pro-Bereiche müssen andocken — ' + (r.grund || ''));
  V._bereichsModuleAusDepotAnmelden(V.getData());
}

function geschaeftsfuehrerinEinlassen(V) {
  const r = V.modulEinlassen(BUNDLE_TEXT, V.getData(), null, null);
  assert.equal(r.angenommen, true, 'Vorbedingung: das Bundle muss angenommen werden — ' + (r.grund || ''));
  return r;
}

test('[Pro-Geschäftsführerin] das Bundle wird ANGENOMMEN, ohne einen einzigen verworfenen Schlüssel', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('Pro-GF-Einlass-2026!');
  proBereicheEinlassen(V);
  const r = geschaeftsfuehrerinEinlassen(V);
  assert.deepEqual(r.verworfene, []);
});

test('[Pro-Geschäftsführerin·Gegenprobe] OHNE die Pro-Bereiche vorher anzudocken wird das Bundle verworfen (sektor unbekannt)', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('Pro-GF-Ohne-Bereiche-2026!');
  const r = V.modulEinlassen(BUNDLE_TEXT, V.getData(), null, null);
  assert.equal(r.angenommen, false, 'ohne die Pro-Bereiche kennt SEKTOR_BY_ID pro-vertretung-vollmachten nicht');
});

test('[Pro-Geschäftsführerin] leeres Depot: jede Frage bleibt sichtbare Lücke, kein Verschwinden', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('Pro-GF-Leer-2026!');
  proBereicheEinlassen(V);
  geschaeftsfuehrerinEinlassen(V);
  const html = V.dokumentHTML('pro-geschaeftsfuehrerin-notfallmappe');
  assert.ok(html.includes('Vertretungsregelung der Gesellschaft?'));
  assert.ok(html.includes('Wer weiß, dass dieses Depot existiert?'));
  assert.ok(html.includes('— nicht erfasst —'));
  assert.ok(!html.includes('undefined'));
});

test('[Pro-Geschäftsführerin] volles Depot: alle drei Abschnitte (Vertretung/Nachfolge/Notfall) liefern die echten, gesetzten Werte', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('Pro-GF-Voll-2026!');
  proBereicheEinlassen(V);
  geschaeftsfuehrerinEinlassen(V);
  const d0 = V.getData();
  d0.sektoren['pro-vertretung-vollmachten'] = Object.assign({}, d0.sektoren['pro-vertretung-vollmachten'], {
    tpl_vertretungsregelung: 'Einzelvertretungsberechtigt, befreit von §181 BGB',
    tpl_prokura: [
      { tpl_wer: 'Herr Beispiel' },
      { tpl_wer: 'Frau Muster' },
    ],
    tpl_patientenverfuegung_ablageort: 'Bankschließfach Hauptfiliale',
  });
  d0.sektoren['pro-gesellschaft-nachfolge'] = Object.assign({}, d0.sektoren['pro-gesellschaft-nachfolge'], {
    tpl_nachfolgeklausel_im_gesellschaftsvertrag_vorhanden: 'ja',
    tpl_gesellschafterliste: [
      { tpl_fassung_vom: '2025-03-01' },
      { tpl_fassung_vom: '' },   // fehlender Wert — darf nicht als Lücke im Array auftauchen
    ],
    tpl_testament_oder_erbvertrag_ablageort: 'Notariat Beispielstadt, Urkundenrolle 42/2024',
  });
  d0.sektoren['pro-kontakte-vertretungsplan'] = Object.assign({}, d0.sektoren['pro-kontakte-vertretungsplan'], {
    tpl_wer_uebernimmt_welche_aufgabe: [
      { tpl_aufgabe: 'Zahlungsverkehr freigeben', tpl_person: 'Prokuristin Beispiel' },
      { tpl_aufgabe: 'Kundenkontakt halten', tpl_person: 'Vertriebsleiter Muster' },
    ],
  });
  d0.sektoren['pro-aufbewahrung-ordnung'] = Object.assign({}, d0.sektoren['pro-aufbewahrung-ordnung'], {
    tpl_wer_von_diesem_depot_weiss: [
      { tpl_name: 'Steuerberaterin Beispiel' },
      { tpl_name: 'Ehepartner Muster' },
    ],
  });
  // U2-ADR-421 §6: kontakt_telefon/kontakt_email lesen die Notfallmappe Telefon und E-Mail aus identity — Pro ersetzt identity nicht mehr.
  d0.sektoren.identity = Object.assign({}, d0.sektoren.identity, {
    telephone: '030 7654321', email: 'gf@beispiel-gmbh.invalid',
  });
  V.setData(d0);

  const html = V.dokumentHTML('pro-geschaeftsfuehrerin-notfallmappe');
  assert.ok(html.includes('Einzelvertretungsberechtigt'), 'Teil A: Vertretungsregelung fehlt');
  assert.ok(html.includes('Herr Beispiel') && html.includes('Frau Muster'), 'Teil A: Prokura-Liste fehlt oder unvollständig');
  assert.ok(html.includes('2025-03-01'), 'Teil B: Gesellschafterliste-Fassung fehlt');
  assert.ok(html.includes('Notariat Beispielstadt'), 'Teil B: Testament/Erbvertrag-Ablageort fehlt');
  assert.ok(html.includes('Zahlungsverkehr freigeben') && html.includes('Kundenkontakt halten'), 'Teil C: Vertretungsplan-Aufgaben fehlen');
  assert.ok(html.includes('Prokuristin Beispiel') && html.includes('Vertriebsleiter Muster'), 'Teil C: Vertretungsplan-Personen fehlen');
  assert.ok(html.includes('Steuerberaterin Beispiel') && html.includes('Ehepartner Muster'), 'Teil C: Wer-weiss-vom-Depot-Liste fehlt');
  assert.ok(html.includes('Bankschließfach Hauptfiliale'), 'Teil C: Patientenverfügung-Ablageort fehlt');
  // U2-ADR-421 §6: die beiden Kontaktfelder kommen aus identity, das Pro nicht ersetzt.
  assert.ok(html.includes('030 7654321') && html.includes('gf@beispiel-gmbh.invalid'),
    'Kontaktfelder aus identity (seit 17.09.2026) fehlen');
  // Die leere Fassung (Gesellschafterliste-Zeile ohne tpl_fassung_vom) darf NICHT als leerer
  // Eintrag im gerenderten Array auftauchen — dieselbe Filterregel wie bei U2-ADR-287.
  assert.ok(!html.includes('undefined'));
});

test('[Pro-Geschäftsführerin] das Bundle landet unsigniert im logikModule-Slot (Selbst-Einlass, wie Erbschein und Notarin)', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('Pro-GF-Slot-2026!');
  proBereicheEinlassen(V);
  geschaeftsfuehrerinEinlassen(V);
  const d = V.getData();
  assert.ok(Array.isArray(d.logikModule));
  // U2-ADR-288 seedet seither zusätzlich den Erbschein-Vorbereitungsauszug ab Werk in
  // logikModule — die Länge ist darum mindestens 2, nicht 1; der eigentliche Beleg (das
  // Geschäftsführerin-Bundle ist unsigniert angekommen) bleibt unverändert.
  const eintrag = d.logikModule.find((m) => m && m.id === 'pro-geschaeftsfuehrerin-notfallmappe');
  assert.ok(eintrag, 'das Geschäftsführerin-Bundle fehlt in logikModule');
  assert.equal(eintrag.ungeprueft, true);
  assert.equal(eintrag.anbieterIdGeprueft, false);
});

test('[Pro-Geschäftsführerin] Rot-Beweis: ohne die drei Abschnitte Vertretung/Nachfolge/Notfall wäre der Zuschnitt nicht erfüllt', async () => {
  const { V } = await ladeKern();
  const modul = JSON.parse(BUNDLE_TEXT);
  const titel = modul.abschnitte.map((a) => a.titel);
  assert.deepEqual(titel, ['Teil A — Vertretung', 'Teil B — Nachfolge', 'Teil C — Notfall'],
    'genau diese drei Worte sind als Inhalt genannt — s. Auftrag, 05.09.2026');
});
