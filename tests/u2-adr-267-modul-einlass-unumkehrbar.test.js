'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-267 · Ein Modul-Einlass ist unumkehrbar — und niemand sagt es vorher
   ────────────────────────────────────────────────────────────────────────
   Befund (Fundsachen-Erhebung 04.09.2026, Posten B4), gemessen und bestätigt:
   kein EINLASS_REGISTER-Typ kennt einen Weg zurück (kein `modulEntfernen`
   existiert). Von den zehn Registern halten nur vier je Bürger-Werte
   (bereich, situation, wizard über sein Ziel, institutionsArt indirekt) —
   von diesen hat NUR `situation` keine Rettung:
     - bereich rettet verwaiste Werte (`_bereicheVerwaisteRetten`,
       vivodepot.html:34657–34761) — kein Warnsatz nötig, ein Fehlalarm dort
       entwertete die Warnung bei situation.
     - wizard schreibt nie in einen eigenen Namensraum, sondern über
       sektorFeldSetzen/situationFeldSetzen ins Ziel — das Risiko erbt sich
       vom Ziel, wizard selbst trägt keins.
     - institutionsArt verliert nur ein Label, der Rohwert (`art`-Kennung)
       bleibt immer sichtbar/exportfähig — kein Datenverlust.
     - situation: Werte in data.situationen[…] bleiben roh im JSON stehen,
       aber kein Render-Pfad findet sie mehr, wenn das Modul verschwindet —
       der einzige echte Fall.

   `_modulTypUnwiederbringlichHinweis(typ)` ist die EINE Stelle, die das
   entscheidet — kommt die situation-Rettung (wörtlicher Spiegel von
   `_bereicheVerwaisteRetten`, s. ADR), wird sie dort einmal abgeschaltet.

   ZWEI AUFTRITTSORTE, EINE QUELLE:
   - der Bestätigungs-Dialog beim EINLASSEN, nur auf dem unsignierten Weg
     (dort ist der Typ vor dem Schreiben bekannt, s. ADR — der signierte Weg
     kennt ihn erst nach der Krypto-Prüfung, ein Vorher-Dialog wäre dort
     kein billiger Einzug).
   - die dauerhafte Modul-Zeile in den Einstellungen (`einstellungenHTML`),
     deckt BEIDE Wege ab.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'u2-adr-267-pw';

/* ── _modulTypUnwiederbringlichHinweis — die eine Quelle ──────────────────── */

test('[Quelle] situation bekommt den Hinweis, die anderen Register nicht', () => {
  const { V } = ladeKern();
  const registerTypen = V.EINLASS_REGISTER.map((r) => r.typ);
  assert.ok(registerTypen.includes('situation'), 'Voraussetzung: situation ist ein Register');
  // U2-ADR-284: elftes Register (stellensatz) — dieselbe Prüfung gilt für sein `typ` mit,
  // ohne dass diese Probe es namentlich kennen muss (die Schleife unten deckt es automatisch ab).
  // U2-ADR-351 Zug 2: zwölftes Register (erscheinung) — dieselbe generische Abdeckung.
  // „blattformat" (07.09.2026): dreizehntes Register — ebenso.
  // Bedingungskatalog (16.09.2026, MyTerms Teil B): vierzehntes Register — ebenso.
  // ANG1 (19.09.2026): fünfzehntes Register (angehoerigenVorlage) — ebenso. Keine feste Zahl mehr: die Schleife unten fragt JEDES
  // Register, ein neues wird ohne Zutun mitgeprüft. (Die Zahl war die Stelle, an der jedes neue Register diese Probe zerbrach,
  // ohne dass sie etwas Neues aussagte.) Untergrenze nur als Vorbedingung, dass die Register überhaupt gelesen wurden.
  assert.ok(registerTypen.length >= 14, 'Vorbedingung: die Register werden gelesen — ' + registerTypen.join(','));
  for (const typ of registerTypen) {
    const hinweis = V._modulTypUnwiederbringlichHinweis(typ);
    if (typ === 'situation') {
      assert.equal(typeof hinweis, 'string', 'situation muss einen Hinweis bekommen');
      assert.ok(hinweis.length > 0);
    } else {
      assert.equal(hinweis, null, typ + ' darf KEINEN Hinweis bekommen — sonst Fehlalarm');
    }
  }
});

test('[Quelle] der Hinweis nennt keine Zahl und keine Verfahrensangabe, endet mit dem Haussatz', () => {
  const { V } = ladeKern();
  const hinweis = V._modulTypUnwiederbringlichHinweis('situation');
  assert.ok(!/\d/.test(hinweis), 'keine Zahl im Fließtext: ' + hinweis);
  assert.ok(hinweis.trim().endsWith('Das lässt sich nicht rückgängig machen.'),
    'endet mit dem im Haus etablierten Satz (wie mappeEntfernenFrage/vorlagenLeerenText)');
});

test('[Quelle] unbekannter Typ liefert null, nicht undefined-als-Text', () => {
  const { V } = ladeKern();
  assert.equal(V._modulTypUnwiederbringlichHinweis('nie-registriert'), null);
  assert.equal(V._modulTypUnwiederbringlichHinweis(undefined), null);
});

/* ── einstellungenHTML() — dauerhafte Modul-Zeile, deckt beide Einlasswege ── */

async function mitModulZeile(register, modul) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d[register] = [modul];
  V.setData(d);
  return V;
}

test('[einstellungenHTML] eine angedockte, fremde Situation trägt den Unerreichbar-Hinweis dauerhaft', async () => {
  const V = await mitModulZeile('situationsModule', {
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'e2e-probe', sprache: 'de',
    situationen: { 'zz-probe': { titel: 'Probe-Situation' } },
    ungeprueft: true, eingelassenAm: '2026-09-04',
  });
  const html = V.einstellungenHTML();
  assert.match(html, /modul-unwiederbringlich/, 'die Zeile trägt die eigene Klasse');
  assert.match(html, /Das lässt sich nicht rückgängig machen\./);
});

test('[einstellungenHTML·Gegenprobe] ein angedockter, fremder Bereich trägt KEINEN Unerreichbar-Hinweis — er ist gerettet', async () => {
  const V = await mitModulZeile('bereichsModule', {
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'e2e-probe', sprache: 'de',
    bereiche: { 'zz-probe': { label: 'Probe-Bereich' } },
    ungeprueft: true, eingelassenAm: '2026-09-04',
  });
  const html = V.einstellungenHTML();
  assert.doesNotMatch(html, /modul-unwiederbringlich/, 'bereich hat eine Rettung — kein Fehlalarm');
});

test('[einstellungenHTML] ein fremdes Sprachmodul (textsatz) trägt KEINEN Unerreichbar-Hinweis — hält keine Bürger-Werte', async () => {
  const V = await mitModulZeile('textsatzModule', {
    modulTyp: 'textsatz', moduleVersion: 1, sprache: 'en', texte: {},
    ungeprueft: true, eingelassenAm: '2026-09-04',
  });
  const html = V.einstellungenHTML();
  assert.doesNotMatch(html, /modul-unwiederbringlich/);
});
