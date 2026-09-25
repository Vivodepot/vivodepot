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

   DIESER TEST liest den Schwesterrepo LIVE von der Platte, wenn er lokal vorhanden ist (der
   übliche Fall auf einer Entwicklerin-Maschine, die beide Repos nebeneinander ausgecheckt hat —
   wie hier), und hasht den ECHTEN Abschnitt dort gegen den ECHTEN Abschnitt hier. Kein Pin,
   keine zweite, unabhängige Wahrheit.

   Ist der Schwesterrepo nicht lokal vorhanden (CI, ein frischer Checkout, eine fremde Maschine),
   bleibt der Befund UNGEMESSEN (t.skip — zählt NICHT als bestanden) statt STILL GRÜN zu
   erscheinen. Ein `assert.ok(true)` bei fehlendem Schwesterrepo wäre genau die Lücke, die diese
   Datei schließen soll, nur an einer neuen Stelle wieder aufgemacht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { kopierterAbschnitt, codePruefsumme, BEGIN, ENDE } = require('../tools/lib/produkt-text-erzeugen-pruefsumme.js');

const REPO = path.join(__dirname, '..');
const EIGENE_DATEI = path.join(REPO, 'tools', 'lib', 'produkt-text-erzeugen.js');
// Nebeneinander ausgecheckt, wie auf dieser Maschine (~/Documents/VD-GitHub/vivodepot-cleanslate
// UND ~/Documents/VD-GitHub/vivodepot-download-gateway) — überschreibbar für andere Layouts, damit
// diese Probe nicht an einen einzigen Verzeichnisnamen gebunden bleibt.
const { schwesterRepoPfad } = require('../tools/lib/schwester-repo.js');
const SCHWESTERREPO = schwesterRepoPfad('vivodepot-download-gateway', { envName: 'VIVODEPOT_GATEWAY_REPO' });
const SCHWESTER_DATEI = path.join(SCHWESTERREPO, 'src', 'produkt-text-erzeugen.js');

/* Befristete, GENAU benannte Ausnahme (22.09.2026): der kopierte Abschnitt hier trägt die Ab-Werk-Region sprachangebot (Vor-Depot-Sprachangebot) und die Prüfung der Angabe der Urheberin beim Erzeugen
   (Spezifikation 34.7, U2-ADR-431); die Kopie im Schwesterrepo trägt beides noch nicht. Der Nachzug ist ein Auftrag mit zwei Stücken (Abschnitt byte-gleich samt Pin, und die Rezept-Fixtures), keine neue
   Datei: die Prüfung ist im Abschnitt selbstenthalten. Gedeckt ist NUR der Stand, den Gateway-main heute trägt (seine Abschnitts-Prüfsumme, hier festgehalten), nicht irgendeine Abweichung: ein anderer Stand
   dort ist wieder ein Fund. Nach dem Verfall ist die Ausnahme selbst der Fehler (tests/zutaten-pruefsumme-abgleich.test.js hat dieselbe Bauart für die Rezept-Fixtures, dieselbe Frist). Abnahme des Nachzugs:
   dieser Test ist grün OHNE die Ausnahme, und die Suite des Schwesterrepos ist grün mit dem neuen Pin. Ohne Schwesterrepo lokal bleibt der Abgleich UNGEMESSEN; die FRIST wird trotzdem geprüft. */
const AUSNAHME_BIS_GATEWAY_NACHZUG = Object.freeze({
  verfall: '2026-09-26',
  schwesterPruefsumme: '3ed280e82af2dc0b9be2f9595e877f09fc2c22225edd9321b6ade2b122d204e7',
});

const heute = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

// Entscheidet den Abgleich: { ok, hinweis }. Byte-gleich ist gut; der EINE bekannte Vorstand des Schwesterrepos ist bis zum Verfall gedeckt; alles andere ist ein Fund.
function abgleichEntscheiden(eigen, schwester, ausnahme, stichtag) {
  if (eigen === schwester) return { ok: true, hinweis: null };
  if (codePruefsumme(schwester) !== ausnahme.schwesterPruefsumme) return { ok: false, hinweis: 'nicht byte-gleich' };
  if (stichtag > ausnahme.verfall) return { ok: false, hinweis: 'die Ausnahme ist seit ' + ausnahme.verfall + ' abgelaufen und deckt noch die Abweichung — der Gateway-Nachzug fehlt' };
  return { ok: true, hinweis: 'gedeckt bis ' + ausnahme.verfall + ' (Gateway-Nachzug offen)' };
}

test('[Produkt-Text-Erzeugen·Cross-Repo] der eigene Abschnitt ist byte-gleich mit dem ECHTEN Abschnitt im Schwesterrepo', (t) => {
  if (!fs.existsSync(SCHWESTER_DATEI)) {
    t.skip('UNGEMESSEN — Schwesterrepo nicht lokal vorhanden (' + SCHWESTER_DATEI + '); '
      + 'zählt NICHT als bestanden, kein stiller Ersatz für den echten Abgleich.');
    return;
  }
  const eigenerAbschnitt = kopierterAbschnitt(EIGENE_DATEI);
  const schwesterAbschnitt = kopierterAbschnitt(SCHWESTER_DATEI);
  const urteil = abgleichEntscheiden(eigenerAbschnitt, schwesterAbschnitt, AUSNAHME_BIS_GATEWAY_NACHZUG, heute());
  assert.equal(urteil.ok, true,
    'tools/lib/produkt-text-erzeugen.js und ' + SCHWESTER_DATEI + ' sind NICHT byte-gleich (' + urteil.hinweis + ') — '
    + 'der eine muss dem anderen byte-für-byte nachgezogen werden, samt gepinnter Prüfsumme in '
    + 'BEIDEN Repositorien (tools/lib/produkt-text-erzeugen-pruefsumme.js).');
  if (urteil.hinweis) t.diagnostic(urteil.hinweis);
});

test('[Produkt-Text-Erzeugen·Cross-Repo·Frist] die Ausnahme für den offenen Gateway-Nachzug ist nicht abgelaufen — unabhängig davon, ob das Schwesterrepo lokal liegt', () => {
  assert.ok(heute() <= AUSNAHME_BIS_GATEWAY_NACHZUG.verfall,
    'Die befristete Ausnahme ist seit ' + AUSNAHME_BIS_GATEWAY_NACHZUG.verfall + ' abgelaufen: der Gateway-Nachzug (Abschnitt byte-gleich samt Pin, Rezept-Fixtures) ist nicht gelandet. '
    + 'Nachziehen und die Ausnahme streichen — nicht die Frist schieben, ohne den Grund neu zu schreiben.');
});

test('[Produkt-Text-Erzeugen·Cross-Repo·Ausnahme] genau der benannte Vorstand ist gedeckt, ein anderer nicht, nach dem Verfall keiner', () => {
  const eigen = 'EIGEN';
  const alt = 'ALT';
  const ausnahme = { verfall: '2026-09-26', schwesterPruefsumme: codePruefsumme(alt) };
  assert.equal(abgleichEntscheiden(eigen, eigen, ausnahme, '2027-01-01').ok, true, 'byte-gleich ist immer gut, auch nach dem Verfall');
  assert.equal(abgleichEntscheiden(eigen, alt, ausnahme, '2026-09-26').ok, true, 'der benannte Vorstand ist bis zum Verfallstag gedeckt');
  assert.equal(abgleichEntscheiden(eigen, 'ANDERS', ausnahme, '2026-09-22').ok, false, 'ein ANDERER Stand des Schwesterrepos ist wieder ein Fund');
  const nach = abgleichEntscheiden(eigen, alt, ausnahme, '2026-09-27');
  assert.equal(nach.ok, false, 'nach dem Verfall ist die Ausnahme selbst der Fehler');
  assert.match(nach.hinweis, /abgelaufen/);
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
