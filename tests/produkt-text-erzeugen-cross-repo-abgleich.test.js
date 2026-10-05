'use strict';
/* produkt-text-erzeugen-cross-repo-abgleich.test.js — Befund, HOCH (19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DIE LÜCKE, DIE DIESEN TEST RECHTFERTIGT: tests/produkt-text-erzeugen-pruefsumme.test.js
   prüft die eigene Kopie nur gegen einen GEPINNTEN Wert — beide Repositorien pinnen ihn
   unabhängig voneinander, jeder gegen sich selbst. Genau das ließ eine echte Drift durch: seit
   dem 17.09.2026 (Register-Ausbau, U2-ADR-345) trug dieser Abschnitt vier Modultypen mehr
   (situation/wizard/dokumentModul/standardVorlage) als die Kopie im Schwesterrepo
   (vivodepot-download-gateway, src/produkt-text-erzeugen.js) — beide lokalen Tests liefen
   trotzdem grün, weil keiner den jeweils ANDEREN Bestand je gesehen hat (Befund
   gemeldet am 19.09.2026). Erst am selben Tag nachgezogen (byte-für-byte, samt
   frisch gepinnter Prüfsumme in BEIDEN Repositorien).

   DIESER TEST liest den Abschnitt des Schwesterrepos über `git show origin/main:src/produkt-text-erzeugen.js`
   (26.09.2026; vorher aus dem lokalen Arbeitsbaum — der zeigte, was dort gerade ausgecheckt war, nicht was
   ausgeliefert wird) und vergleicht ihn mit dem ECHTEN Abschnitt hier. Kein Pin, keine zweite, unabhängige
   Wahrheit. Die befristete Ausnahme bis zum Gateway-Nachzug (22.–29.09.2026) ist entfernt: der Nachzug ist auf
   Gateway-main gelandet (40b62aa), beide Abschnitte sind byte-gleich, beide Pins wortgleich.

   Ist der Schwesterrepo nicht lokal vorhanden (CI, ein frischer Checkout, eine fremde Maschine),
   bleibt der Befund UNGEMESSEN (t.skip — zählt NICHT als bestanden) statt STILL GRÜN zu
   erscheinen. Ein `assert.ok(true)` bei fehlendem Schwesterrepo wäre genau die Lücke, die diese
   Datei schließen soll, nur an einer neuen Stelle wieder aufgemacht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { kopierterAbschnitt, BEGIN, ENDE } = require('../tools/lib/produkt-text-erzeugen-pruefsumme.js');

const REPO = path.join(__dirname, '..');
const EIGENE_DATEI = path.join(REPO, 'tools', 'lib', 'produkt-text-erzeugen.js');
// Nebeneinander ausgecheckt, wie auf dieser Maschine (~/Documents/VD-GitHub/vivodepot-cleanslate
// UND ~/Documents/VD-GitHub/vivodepot-download-gateway) — überschreibbar für andere Layouts, damit
// diese Probe nicht an einen einzigen Verzeichnisnamen gebunden bleibt.
const { schwesterRepoPfad } = require('../tools/lib/schwester-repo.js');
const SCHWESTERREPO = schwesterRepoPfad('vivodepot-download-gateway', { envName: 'VIVODEPOT_GATEWAY_REPO' });

const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

// Der Abschnitt so, wie Gateway-main ihn trägt — nicht der lokale Arbeitsbaum. null, wenn das Schwesterrepo
// oder sein origin/main hier nicht vorliegt (dann UNGEMESSEN, nicht grün).
function schwesterAbschnittVonMain() {
  if (!fs.existsSync(path.join(SCHWESTERREPO, '.git'))) return null;
  let text;
  try {
    text = execFileSync('git', ['show', 'origin/main:src/produkt-text-erzeugen.js'],
      { cwd: SCHWESTERREPO, env: ohneGitUmgebung(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { return null; }
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'produkt-text-main-'));
  try {
    const datei = path.join(ordner, 'main.js');
    fs.writeFileSync(datei, text);
    return kopierterAbschnitt(datei);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
}

test('[Produkt-Text-Erzeugen·Cross-Repo] der eigene Abschnitt ist byte-gleich mit dem Abschnitt auf Gateway-main', (t) => {
  const schwesterAbschnitt = schwesterAbschnittVonMain();
  if (schwesterAbschnitt === null) {
    t.skip('UNGEMESSEN — Schwesterrepo oder sein origin/main nicht lokal vorhanden (' + SCHWESTERREPO + '); '
      + 'zählt NICHT als bestanden, kein stiller Ersatz für den echten Abgleich.');
    return;
  }
  const eigen = kopierterAbschnitt(EIGENE_DATEI);
  assert.equal(eigen, schwesterAbschnitt,
    'tools/lib/produkt-text-erzeugen.js und src/produkt-text-erzeugen.js auf Gateway-main sind NICHT byte-gleich — '
    + 'der eine muss dem anderen byte-für-byte nachgezogen werden, samt gepinnter Prüfsumme in '
    + 'BEIDEN Repositorien (tools/lib/produkt-text-erzeugen-pruefsumme.js).');
});

test('[Produkt-Text-Erzeugen·Cross-Repo·Rot-Beweis] eine echte inhaltliche Abweichung wird erkannt, nicht nur eine zufällige Übereinstimmung behauptet', () => {
  const fixtureOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'produkt-text-cross-repo-'));
  try {
    const eigenerAbschnitt = kopierterAbschnitt(EIGENE_DATEI);
    const veraendert = eigenerAbschnitt.replace('produktTextErzeugen', 'produktTextErzeugenVERAENDERT');
    assert.notEqual(veraendert, eigenerAbschnitt, 'Testvoraussetzung: die Ersetzung muss überhaupt greifen');
    const fremdeDatei = path.join(fixtureOrdner, 'fremd.js');
    fs.writeFileSync(fremdeDatei, BEGIN + veraendert + ENDE);
    assert.notEqual(kopierterAbschnitt(fremdeDatei), eigenerAbschnitt,
      'eine ECHTE Abweichung muss als Abweichung erkannt werden — sonst prüft dieser Wächter nichts');
  } finally {
    fs.rmSync(fixtureOrdner, { recursive: true, force: true });
  }
});

test('[Produkt-Text-Erzeugen·Cross-Repo·Gegenprobe] identischer Inhalt vergleicht gleich', () => {
  const fixtureOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'produkt-text-cross-repo-'));
  try {
    const eigenerAbschnitt = kopierterAbschnitt(EIGENE_DATEI);
    const identischeDatei = path.join(fixtureOrdner, 'identisch.js');
    fs.writeFileSync(identischeDatei, BEGIN + eigenerAbschnitt + ENDE);
    assert.equal(kopierterAbschnitt(identischeDatei), eigenerAbschnitt);
  } finally {
    fs.rmSync(fixtureOrdner, { recursive: true, force: true });
  }
});
