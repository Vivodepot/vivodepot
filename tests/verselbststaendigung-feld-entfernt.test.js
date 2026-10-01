'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   `verselbststaendigungMoeglich` entfernt (Entscheidung vom 20.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Der Befund (Handbuch-Auftrag desselben Tages): das Flag stand an sechs Stellen im Kern, wurde
   nirgends gelesen, immer nur auf `false` gesetzt — die tatsächliche Verselbstständigung eines
   Sub-Depots lief schon vorher, und läuft weiter, über `subDepotAushaengen(depotUUID,
   { absicht: 'abgeben' })`. Entscheidung: entfernen statt nachrüsten; den echten Weg belegen die
   Proben zu den Sub-Depot-Übergängen.

   DIESE PROBE hält die Rückwärts-Kompatibilität fest, die die Entscheidung ausdrücklich
   verlangte: ein Depot, das den Schlüssel noch aus einer älteren Fassung trägt, läuft
   unverändert weiter — der Altwert wird schlicht nicht mehr gelesen, nichts anderes geht
   dabei verloren. ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Verselbststaendigung-Feld] ein Alt-Depot mit dem entfernten Schlüssel öffnet, entsiegelt und exportiert unverändert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-altfeld-2026!');
  V.akteurSelbstErklaeren('Verwalterin');
  const e = await V.subDepotAnlegen(
    { bezeichnung: 'Depot Altbestand', inhaberin: 'Altbestand', verwaltungsTyp: 'verwaltet' },
    'sub-altfeld-2026!');

  // Ein ECHTES Alt-Depot trüge den Schlüssel schon in seinem gespeicherten JSON — hier von Hand
  // nachgebildet, genau wie beim Laden einer älteren Datei: die Eigenschaft ist einfach da,
  // niemand hat sie extra geschrieben.
  const eintrag = V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID);
  eintrag.verselbststaendigungMoeglich = false;   // der Altwert — beliebig, wird nicht mehr gelesen
  const vorher = JSON.parse(JSON.stringify(eintrag));
  delete vorher.verselbststaendigungMoeglich;
  delete vorher.delegationsGeschichte;   // wächst durch den Export gleich legitim — separat geprüft

  // Kein Bruch beim Entsiegeln — der Alt-Schlüssel steht daneben, betrifft den Krypto-Weg nicht.
  const inhalt = await V.subDepotVertrauenOeffnen(e.depotUUID, 'sub-altfeld-2026!');
  assert.ok(inhalt, 'ein Sub-Depot mit dem Alt-Schlüssel öffnet unverändert');
  V.subDepotVertrauenSchliessen(e.depotUUID);

  // Kein Bruch beim Blackbox-Export — derselbe Weg, den eine Verselbstständigung heute nutzt.
  const exportiert = V.subDepotBlackboxExportieren(e.depotUUID);
  assert.ok(exportiert && exportiert.umschlag, 'der Export funktioniert trotz Alt-Schlüssel am Eintrag');

  // Kein Datenverlust an den ÜBRIGEN Feldern des Eintrags — nur der tote Schlüssel wird ignoriert,
  // alles andere bleibt exakt, wie es war (der Export selbst trägt legitim einen neuen
  // delegationsGeschichte-Eintrag ein, das ist keine Verlust-Frage, sondern das gewollte Audit).
  const nachher = JSON.parse(JSON.stringify(
    V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID)));
  assert.equal(nachher.delegationsGeschichte.length, 1, 'der Export trägt seinen Audit-Eintrag ein');
  assert.equal(nachher.delegationsGeschichte[0].art, 'blackbox-export');
  delete nachher.verselbststaendigungMoeglich;
  delete nachher.delegationsGeschichte;
  assert.deepEqual(nachher, vorher, 'alle übrigen Angaben am Eintrag bleiben unverändert');
});

/* FORMATFELD (28.09.2026): das Exportformat verliert nie einen Schlüssel (paket0-Migrationsbeleg). Der Schlüssel steht
   darum im Voll-Export als festes false, an genau EINER Stelle; der Import lässt ihn draußen. Jedes andere Vorkommen im
   Code ließe das tote Feld still wieder lebendig werden — die Wache unten erlaubt genau zwei Zeilen. */
const ERLAUBT = [
  /^\s*if \(kopie\) kopie\.verselbststaendigungMoeglich = false;$/,                       // die eine Schreibstelle (vollExportJSON)
  /^\s*'verwaltungsTyp', 'verselbststaendigungMoeglich',$/,                               // EMPFAENGER_NIE
];
function codeVorkommen(html) {
  return html.split('\n').filter((z) => z.includes('verselbststaendigungMoeglich'))
    .filter((z) => !/^\s*(\/\/|\/\*|\*)/.test(z))
    .filter((z) => !ERLAUBT.some((re) => re.test(z)));
}

test('[Verselbststaendigung-Feld] der Export trägt den Schlüssel als false, obwohl das Depot ihn nicht mehr hat', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('formatfeld-2026!');
  V.akteurSelbstErklaeren('Tester');
  assert.equal(Object.prototype.hasOwnProperty.call(V.getData(), 'verselbststaendigungMoeglich'), false, 'Vorbedingung: das Depot trägt den Schlüssel nicht');
  const aus = V.vollExportJSON({ sensibel: true });
  assert.equal(aus.depot.verselbststaendigungMoeglich, false);
  assert.equal(Object.prototype.hasOwnProperty.call(V.getData(), 'verselbststaendigungMoeglich'), false, 'der Export schreibt nicht ins Depot zurück');
});

test('[Verselbststaendigung-Feld] ein Import mit true ändert nichts — der Import nimmt den Schlüssel nicht mit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('formatfeld-import-2026!');
  V.akteurSelbstErklaeren('Tester');
  const aus = V.vollExportJSON({ sensibel: true });
  aus.depot.verselbststaendigungMoeglich = true;
  const fmt = V.IMPORT_FORMATE.find((f) => f.id === 'json');
  const plan = fmt.parse(JSON.stringify(aus));
  assert.ok(plan, 'Vorbedingung: der Import liest die Datei');
  assert.equal(JSON.stringify(plan).includes('verselbststaendigungMoeglich'), false, 'der Import-Plan trägt den Schlüssel nicht');
  assert.equal(V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL.includes('verselbststaendigungMoeglich'), false, 'der Import nimmt ihn nicht mit');
});

test('[Verselbststaendigung-Feld] kein Lesen und kein Schreiben außerhalb der einen Exportstelle', () => {
  const { html } = ladeKern();
  assert.deepEqual(codeVorkommen(html), [], 'ein weiteres Vorkommen im Code macht das tote Feld wieder lebendig');
  for (const re of ERLAUBT) assert.ok(html.split('\n').some((z) => re.test(z)), 'die erlaubte Stelle fehlt: ' + re);
});

test('[Verselbststaendigung-Feld·Rot-Beweis] ein gepflanztes Lesen des Schlüssels fällt auf', () => {
  const { html } = ladeKern();
  const gepflanzt = html.replace('function vollExportJSON(optionen) {', 'function vollExportJSON(optionen) {\n  if (data.verselbststaendigungMoeglich) return null;');
  assert.equal(codeVorkommen(gepflanzt).length, 1);
});



test('[Verselbststaendigung-Feld·Rot-Beweis] der Kern vor der Entfernung trägt das Feld — dieselbe Wache schlägt an', (t) => {
  const { execFileSync } = require('node:child_process');
  let alt;
  const path = require('node:path');
  const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
  const repo = path.join(__dirname, '..');
  const hatHistorie = (() => { try { execFileSync('git', ['cat-file', '-e', '1e5ce03a7'], { cwd: repo, env: ohneGitUmgebung(), stdio: 'ignore' }); return true; } catch (_) { return false; } })();
  // Ohne Git-Historie (öffentlicher Zuschnitt) nicht messbar — nur DAS darf aussetzen, und sichtbar, nie als stilles Grün.
  // Der gepflanzte Rot-Beweis oben läuft immer.
  if (!hatHistorie) return t.skip('keine Git-Historie');
  alt = execFileSync('git', ['show', '1e5ce03a7:vivodepot.html'], { cwd: repo, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.ok(codeVorkommen(alt).length > 0, 'die Wache muss am alten Kern anschlagen');
});
