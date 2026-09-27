'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A534 (25.08.2026) — Befund: ein gestern angelegtes Depot,
   heute wieder geöffnet, zeigte JEDES Feld überall als "nicht hinterlegt",
   ohne einen einzigen Eintragspunkt — kein Fehler, keine Meldung, nichts.
   ────────────────────────────────────────────────────────────────────────
   URSACHENKETTE (gemessen, nicht angenommen): `betreteApp()` etabliert den
   Wiedereintritts-Akteur in `try { inhaberAkteurEtablieren(); } catch (_) {}`
   — lautlos. Schlägt das fehl (die Produktentscheidung traf das an einem Depot, das
   gerade eine echte Schema-Migration durchlaufen hatte), bleibt
   `sitzungsAkteur` für die ganze Sitzung `null`, `darfBearbeiten()` liefert
   `false` app-weit, und JEDE Eintrags-Affordanz rendert read-only — ohne
   jede Meldung. Erneutes Öffnen half (die Migration lief dann nicht mehr,
   nur der Akteur-Bootstrap erneut) — genau das ist jetzt der Hinweistext.

   NACHTRAG (Produktentscheidung, direkt nach dem ersten Fix): eine Meldung, die den Fehlschlag nur ERKLÄRT,
   reicht nicht — „das darf einer echten Nutzerin auf keinen Fall passieren". Zwei weitere
   Schichten, in dieser Datei mitgeprüft:
   1) `inhaberAkteurEtablieren` selbst ist jetzt mehrstufig defensiv (jeder Teilschritt sein
      eigenes Sicherheitsnetz) — ein Fehlschlag an EINER Stelle darf die übrigen
      Ausweichstufen nicht mitreißen. Strukturell schwerer zu erreichen, nicht nur sichtbarer.
   2) Eine Migrationsmatrix-Probe läuft `inhaberAkteurEtablieren()` gegen das Ergebnis JEDER
      Schema-Migrationsstufe in `tests/fixtures/migrations-stufen.js` (Zahl dort gemessen,
      nicht hier wiederholt) — nicht nur, dass `depotLaden` nicht bricht (das prüft schon
      `migrationsassistent-altdepots.test.js`), sondern dass am Ende ein ECHTER, bearbeitbarer
      Sitzungs-Akteur steht. Künftige Migrationsstufen, die diese Kette brechen, fallen hier
      auf — nicht erst bei einer echten Nutzerin.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'akteur-bootstrap-fehler-pw';

test('[A534] Gegenprobe — ein normal angelegtes Depot löst den Hinweis NIE aus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  assert.equal(V.akteurBootstrapFehlerNoetig(), false,
    'der normale Anlege-Weg etabliert den Akteur sofort — kein Fehlschlag, kein Hinweis');
  assert.ok(V.aktuellerSitzungsAkteur(), 'ein Sitzungs-Akteur muss stehen');
});

test('[A534] Gegenprobe — ein normal geladenes (nicht migriertes) Depot löst den Hinweis NIE aus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  V.betreteApp();
  assert.equal(V.akteurBootstrapFehlerNoetig(), false);
  assert.ok(V.aktuellerSitzungsAkteur());
});

test('[A534] das Flag zeigt den Hinweis genau einmal — dieselbe Bauart wie migrationsHinweisZeigen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.getData()._akteurBootstrapFehlerNoetig = true;
  let modalAufgerufen = null;
  const echtesUiModal = V.ui.modal;
  V.ui.modal = (opt) => { modalAufgerufen = opt; };
  V.akteurBootstrapFehlerHinweisZeigen();
  assert.ok(modalAufgerufen, 'der Hinweis wurde tatsächlich angezeigt');
  assert.equal(modalAufgerufen.titel, V.STRINGS.akteurBootstrapFehlerTitel);
  assert.match(modalAufgerufen.koerperHTML, /schließen Sie dieses Fenster und öffnen Sie die Datei erneut/i);
  assert.equal(modalAufgerufen.ohneAbbrechen, true, 'kein zusätzlicher Abbrechen-Knopf nötig — "Verstanden" ist der Ausweg');
  assert.equal(V.akteurBootstrapFehlerNoetig(), false, 'nach dem Zeigen ist der Hinweis konsumiert');
  V.ui.modal = echtesUiModal;
});

test('[A534] ohne gesetztes Flag erscheint kein Hinweis', () => {
  const { V } = ladeKern();
  let modalAufgerufen = false;
  const echtesUiModal = V.ui.modal;
  V.ui.modal = () => { modalAufgerufen = true; };
  V.akteurBootstrapFehlerHinweisZeigen();
  assert.equal(modalAufgerufen, false);
  V.ui.modal = echtesUiModal;
});

test('[A534] die Texte sind Bürgersprache — kein "Akteur"/"Bootstrap" im sichtbaren Text', () => {
  const { V } = ladeKern();
  assert.doesNotMatch(V.STRINGS.akteurBootstrapFehlerTitel, /[Aa]kteur|[Bb]ootstrap/);
  assert.doesNotMatch(V.STRINGS.akteurBootstrapFehlerText, /[Aa]kteur|[Bb]ootstrap/);
  assert.match(V.STRINGS.akteurBootstrapFehlerText, /Datei erneut/i,
    'der Text muss die tatsächlich wirksame Abhilfe nennen — erneutes Öffnen behebt es');
});

/* ── Die strukturelle Härtung, nicht nur die Meldung ──────────────────────────
   Produktentscheidung, direkt nach dem ersten Fix: „das ist die Art Fehler, die einem echten
   Nutzer AUF KEINEN FALL passieren darf." Eine Meldung danach ist Schadensbegrenzung,
   kein Schutz. Die beiden Proben unten prüfen die eigentliche Härtung. */

test('[A534·Härtung] ein Wurf in depotNormalisieren darf inhaberAkteurEtablieren nicht mitreißen', async () => {
  // Reproduziert denselben Rot-Beweis wie migrationsassistent-altdepots.test.js
  // ("depotLaden bricht NIE, selbst wenn depotNormalisieren wirft") — hier zusätzlich
  // geprüft, dass der Akteur-Bootstrap DANACH trotzdem einen echten Akteur liefert,
  // nicht nur, dass das Laden selbst nicht bricht.
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const dat = V.getData();
  dat.schemaVersion = 'KAPUTT';   // depotNormalisieren prüft typeof vor jedem Bump — echter Wurf möglich
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);   // depotNormalisieren wirft intern, depotLaden fängt es ab
  let wurf = null, akteur = null;
  try { akteur = V.inhaberAkteurEtablieren(); } catch (e) { wurf = e; }
  assert.equal(wurf, null, 'inhaberAkteurEtablieren darf selbst nach einem depotNormalisieren-Wurf nicht werfen');
  assert.ok(akteur && akteur.personId, 'ein echter, bearbeitbarer Sitzungs-Akteur muss trotzdem stehen');
});

test('[A534·Migrationsmatrix] jede Schema-Migrationsstufe endet in einem funktionierenden Akteur-Bootstrap', () => {
  const { STUFEN } = require('./fixtures/migrations-stufen.js');
  assert.ok(STUFEN.length > 10, 'Vorbedingung: die Fixture-Liste ist wirklich geladen, kein leeres Array');
  const fehlgeschlagen = [];
  let geprueft = 0;
  for (const stufe of STUFEN) {
    // Manche Stufen tragen `geprueftIn` statt `baue` (eigene, ausführliche Testdatei, s.
    // Kopfkommentar der Fixture) — hier nichts zu bauen, kein Fehlschlag.
    if (typeof stufe.baue !== 'function') continue;
    geprueft++;
    const { V } = ladeKern();
    let roh;
    try { roh = stufe.baue(); } catch (e) { fehlgeschlagen.push(`Stufe ${stufe.nach}: baue() wirft — ${e.message}`); continue; }
    try { V.depotNormalisieren(roh); } catch (e) { fehlgeschlagen.push(`Stufe ${stufe.nach}: depotNormalisieren wirft — ${e.message}`); continue; }
    V.setData(roh);
    let akteur = null, wurf = null;
    try { akteur = V.inhaberAkteurEtablieren(); } catch (e) { wurf = e; }
    if (wurf) fehlgeschlagen.push(`Stufe ${stufe.nach} ("${stufe.was}"): inhaberAkteurEtablieren wirft — ${wurf.message}`);
    else if (!akteur || !akteur.personId) fehlgeschlagen.push(`Stufe ${stufe.nach} ("${stufe.was}"): kein echter Sitzungs-Akteur nach dem Bootstrap`);
  }
  assert.ok(geprueft > 10, 'Vorbedingung: es wurden wirklich mehrere Stufen mit `baue` geprüft, kein leerer Durchlauf');
  assert.deepEqual(fehlgeschlagen, [],
    'A534: jede Migrationsstufe muss in einem funktionierenden, bearbeitbaren Akteur enden — sonst rendert das '
    + 'Depot einer echten Nutzerin app-weit read-only, ohne dass sie es merkt:\n  ' + fehlgeschlagen.join('\n  '));
});
