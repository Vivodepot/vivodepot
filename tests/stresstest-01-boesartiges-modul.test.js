'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 1 · Das bösartige Modul — was hält, hält hier fest
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 1.
   Messwerkzeug: `tools/boesartiges-modul-messen.js` (dort steht der Befund).

   **KEINE BEHEBUNG — so beauftragt.** Diese Datei repariert nichts. Sie hält
   fest, was die Modulschicht heute leistet, damit ein späterer Umbau, der eine
   dieser Grenzen aufgibt, ROT wird und nicht stillschweigend durchgeht.

   [S1·2]/[S1·3] HIELTEN URSPRÜNGLICH EINE LÜCKE FEST, nicht eine Zusage —
   Größe und Schachtelungstiefe waren unbegrenzt, mit dem Vermerk, umzudrehen,
   sobald die Produktentscheidung eine Grenze entscheidet. **Verdrahtet 23.08.2026**
   („Modulprüfung schließen", Posten 2: 512 KB, Tiefe 40) — beide
   Proben sind jetzt Zusagen, nicht mehr eine dokumentierte Lücke.

   WARUM DIESE DATEI IM ÖFFENTLICHEN REPO STEHEN DARF: Die Sonderauflage des
   Laufzettels verbietet, einen ausnutzbaren Fund in einen öffentlichen Commit
   zu schreiben. **Es gibt keinen.** Der einzige Kandidat — ein Absturz beim
   Speichern ab etwa 8 000 Schachtelungsebenen — ist ein Artefakt des
   Node-Harnischs (`JSON.stringify` ist dort rekursiv, der Stapel klein). Im
   ausgelieferten Kern, im echten Chromium gemessen, TRUGEN 50 000 Ebenen und
   32 MB ohne Fehler, BEVOR die Grenze verdrahtet war — heute weist
   `modulEinlassen` beide ab, bevor der rekursive `JSON.stringify`-Pfad
   überhaupt erreicht wird.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/boesartiges-modul-messen.js');

async function gemessen() {
  const { V } = ladeKern();
  await V.depotAnlegen('stresstest-01-pw');
  V.akteurSelbstErklaeren('Prüfung');
  return { V, m: M.messen(V, V.getData()) };
}

test('[S1·1] eine eingebaute Kernkennung lässt sich in KEINEM der fünf Register neu belegen', async () => {
  const { m } = await gemessen();
  assert.equal(m.kennungen.textsatz.grund, 'reserviert', 'Sprache `de`');
  assert.equal(m.kennungen.rechtsraum.grund, 'reserviert', 'Rechtsraum `DE`');
  assert.equal(m.kennungen.format.grund, 'reserviert', 'Format `json`');
  assert.deepEqual(m.kennungen.bereich.verworfene, [{ id: 'health', grund: 'reserviert' }],
    'Bereich `health` wird benannt verworfen, nicht stillschweigend');
  assert.deepEqual(m.kennungen.institutionsArt.verworfene, [{ kennung: 'bank', grund: 'reserviert' }],
    'Institutions-Art `bank` ebenso');
  /* DIE WIRKUNG, nicht nur die Antwort. */
  assert.equal(m.eingebautesLabelHaelt, 'Bank', 'das eingebaute Label steht nach dem Angriff unverändert');
});

test('[S1·1 POSITIVKONTROLLE] dieselbe Form mit EIGENER Kennung geht durch — sonst prüfte oben nichts', async () => {
  const { m } = await gemessen();
  assert.deepEqual(m.kennungenKontrolle, { bereich: true, textsatz: true, format: true });
  assert.equal(m.eigeneArtKamAn, 'Eigene Art', 'und die eigene Institutions-Art ist wirklich angekommen');
});

test('[S1·2] ZUSAGE (verdrahtet 23.08.2026): 512 KB halten, darunter geht ein Modul durch', async () => {
  const { m } = await gemessen();
  for (const g of m.groesse) {
    if (g.mb < 0.5) {
      assert.equal(g.angenommen, true, g.mb + ' MB liegen unter der Grenze und werden angenommen');
      assert.equal(g.grund, null);
    } else {
      assert.equal(g.angenommen, false, g.mb + ' MB liegen über der 512-KB-Grenze und werden abgewiesen');
      assert.equal(g.grund, 'zu-gross');
    }
  }
});

test('[S1·3] ZUSAGE (verdrahtet 23.08.2026): Tiefe 40 hält, darunter geht ein Modul durch', async () => {
  const { m } = await gemessen();
  for (const t of m.tiefe) {
    if (t.t < 40) {
      assert.equal(t.angenommen, true, t.t + ' Ebenen liegen unter der Grenze und werden angenommen');
    } else {
      assert.equal(t.angenommen, false, t.t + ' Ebenen liegen über der Tiefe-40-Grenze und werden abgewiesen');
      assert.equal(t.grund, 'zu-tief');
    }
  }
});

test('[S1·4] kein Modul vergiftet einen Prototyp und keines schreibt in einen Sektor', async () => {
  const { m } = await gemessen();
  assert.deepEqual(m.ueberschreiben.prototypVergiftet, ['unberührt', 'unberührt', 'unberührt'],
    '`__proto__` am Modul, `__proto__` in `texte`, `constructor.prototype` in `regeln`');
  assert.equal(m.ueberschreiben.depotNachnameNachher, m.ueberschreiben.depotNachnameVorher,
    'ein Modul, das `sektoren` mitbringt, ändert im Depot nichts');
});

test('[S1·4b · GELÖST 23.08.2026, A466] der Textsatz benennt Fremdschlüssel jetzt genau wie das Format', async () => {
  /* DIE ASYMMETRIE WAR DER BEFUND (Laufzettel Nacht 22./23.08.2026, Posten 12) — jetzt
     GESCHLOSSEN, nicht nur weiter gemessen: `TEXTSATZ_MODUL_SCHLUESSEL` (neu, wörtlicher
     Spiegel von `FORMAT_MODUL_SCHLUESSEL`) benennt jeden unbekannten Top-Level-Schlüssel
     eines Textsatz-Moduls in `verworfene` — dieselbe Sichtbarkeit, die das Format-Register
     schon hatte. GESPEICHERT wird der Fremdschlüssel weiterhin (`modulEinlassen`s
     `Object.assign({}, modul, …)` bleibt unverändert für BEIDE Register, s. `fremdImSlot`
     unten) — das war nie der Unterschied, nur die BENENNUNG war es. */
  const { m } = await gemessen();
  assert.deepEqual(m.ueberschreiben.fremdImSlot, ['sektoren', 'personen'],
    'die Fremdschlüssel liegen weiterhin im gespeicherten Modul — Speicherverhalten unverändert');
  assert.deepEqual(m.ueberschreiben.fremdBenannt,
    [{ schluessel: 'sektoren', grund: 'unbekannt' }, { schluessel: 'personen', grund: 'unbekannt' }],
    'und werden jetzt benannt, genau wie beim Format');
  assert.deepEqual(m.ueberschreiben.formatBenennt, [{ schluessel: 'boeserSchluessel', grund: 'unbekannt' }],
    'das Format-Register benennt denselben Fall — die frühere Gegenprobe zur Asymmetrie, jetzt keine mehr');
});

test('[S1·5] eine Herkunft, die auf eine fremde Institution zeigt, wird geglaubt — und als ungeprüft markiert', async () => {
  const { m } = await gemessen();
  assert.equal(m.herkunft.angenommen, true, 'die Angabe wird nicht geprüft — es gibt heute nichts, woran');
  assert.equal(m.herkunft.anbieterId, 'bundesaerztekammer', 'die Kennung ist die des Moduls');
  assert.equal(m.herkunft.ungeprueftErzwungen, true,
    'DIE EINE ANTWORT DARAUF: `ungeprueft: true` wird erzwungen, nicht vom Modul gesetzt');
});

test('[S1·6] ein Modul kann NICHT über seine Prüfung und sein Einlassdatum lügen', async () => {
  const { m } = await gemessen();
  assert.equal(m.luegen.ungeprueftImSlot, true,
    'das Modul sagte `ungeprueft: false` — der Einlassweg überschreibt es');
  assert.notEqual(m.luegen.eingelassenAmImSlot, '1999-01-01',
    'und ebenso das behauptete Einlassdatum');
});

test('[S1·6b · GELÖST 23.08.2026, A467] `anbieterIdGeprueft` überlebt die Selbstauskunft NICHT MEHR', async () => {
  /* GEMESSEN am 21.08. als „heute folgenlos" (niemand las den Schlüssel), aber eine
     Behauptung, die niemand widerlegt, ist keine Prüfung — Laufzettel Nacht 22./23.08.2026,
     Posten 13. `modulEinlassen` erzwingt die Marke jetzt auf `false`, GENAU WIE `ungeprueft`
     und `eingelassenAm` schon zuvor — nur der geprüfte Quelle-Zweig darf sie auf `true` heben,
     und den nutzt heute niemand (dieselbe Zeile wie `[S1·5]`). Der zweite Teil der Probe
     (kein LESER im ausgelieferten Bestand) bleibt als zusätzliches Netz stehen — jetzt eine
     Verstärkung, keine einzige Verteidigungslinie mehr. */
  const { m } = await gemessen();
  assert.equal(m.luegen.anbieterIdGeprueftImSlot, false,
    'die Selbstauskunft wird jetzt verworfen — dieselbe erzwungene Gruppe wie ungeprueft/eingelassenAm');
  const fs = require('node:fs');
  const path = require('node:path');
  const wurzel = path.join(__dirname, '..');
  const leser = [];
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-vc-issuer.html',
    'vivodepot-studio.html']) {
    const t = fs.readFileSync(path.join(wurzel, datei), 'utf8');
    /* GESUCHT WIRD DER GESPEICHERTE SCHLÜSSEL, also `.anbieterIdGeprueft` mit
       Punkt davor — der gleichnamige PARAMETER von `modulEinlassen` ist etwas
       anderes und darf nicht mitzählen. (Dass beide gleich heißen, hat den
       ersten Anlauf rot gemacht: `markiert.anbieterId = anbieterIdGeprueft.trim()`
       liest den Parameter, nicht das Modul.) Einzige erlaubte Fundstelle ist das
       Setzen selbst. */
    for (const zeile of t.split('\n')) {
      if (!/\.anbieterIdGeprueft/.test(zeile)) continue;
      if (/markiert\.anbieterIdGeprueft\s*=\s*true/.test(zeile)) continue;
      leser.push(datei + ': ' + zeile.trim().slice(0, 80));
    }
  }
  assert.deepEqual(leser, [],
    'sobald etwas diesen Schlüssel LIEST, wird eine Selbstauskunft zu einer Aussage über Vertrauen');
});

test('[S1·Anzeige] ein feindliches Label kommt maskiert in die Oberfläche', async () => {
  /* GEMESSEN AM GERENDERTEN HTML-STRING. Ein erster Anlauf prüfte auf die
     Zeichenkette `onerror="` und bekam einen Treffer im INERTEN Text — die
     Prüfzeichenkette war falsch, nicht der Code. Was zählt, sind die spitzen
     Klammern. */
  const { m } = await gemessen();
  assert.equal(m.anzeige.spitzeKlammernMaskiert, true,
    '`<` und `>` sind maskiert — das Bild wird nie geladen, der Handler nie gebunden');
  assert.equal(m.anzeige.kennungBrichtAusAttributAus, false,
    'und eine Kennung mit Anführungszeichen bricht nicht aus dem `value`-Attribut aus');
});
