'use strict';
/* U2-ADR-474 — ein Speichermodell, ein Wortlaut (Befund B-01 der heuristischen Evaluation vom 02.10.2026).
   Die Probe prüft die Stellen gegen die Tabelle im Kern (SPEICHERMODELL_SAETZE über tools/speichermodell-pruefen.js), nicht gegen eine
   Liste von Sätzen. Rot-Beweis gegen den Stand vor dem Fix (c71971fff): dort sagten Schnellstart 5, das Bereichsende und der Pausen-Hinweis
   des Assistenten im internen Modus, nichts werde gespeichert, und die Pille zitierte einen Knopf, den es nicht gibt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { pruefe, ausBaum, ausCommit } = require('../tools/speichermodell-pruefen.js');

const REPO = path.join(__dirname, '..');
const VOR_DEM_FIX = 'c71971fff';

// Diskriminante: die Befunde des Prüfwerkzeugs für eine Eingabe (Baum oder Commit), als Verletzungsliste.
function speicherBefunde(eingabe) { return pruefe(eingabe).befunde; }

test('dieser Baum: alle Stellen sagen dasselbe über das Speichern, DE und EN', () => {
  const e = ausBaum(REPO);
  assert.deepEqual(speicherBefunde(e), []);
  const { modellSchluessel } = pruefe(e);
  for (const k of ['strings:schnellstartSchritt5.text', 'strings:pausenErlaubnis.text', 'strings:wizPauseHinweis.text', 'hilfe:speichern-sicherung.einleitung']) {
    assert.ok(modellSchluessel.includes(k), k + ' gehört dem Modell');
  }
});

function vorDemFixVorhanden() {
  try { execFileSync('git', ['cat-file', '-e', VOR_DEM_FIX + '^{commit}'], { cwd: REPO, env: ohneGitUmgebung(), stdio: 'ignore' }); return true; } catch (_) { return false; }
}

test('Rot-Beweis: der Stand vor dem Fix fällt mit genau den Widersprüchen aus dem Befund', (t) => {
  if (!vorDemFixVorhanden()) return t.skip('keine Git-Historie');
  const { befunde } = pruefe(ausCommit(VOR_DEM_FIX, REPO));
  const hat = (re) => befunde.some((b) => re.test(b));
  assert.ok(hat(/^\(a\) Schnellstart 5, Modus intern, DE: strings:schnellstartSchritt5\.text/), 'Schnellstart 5 sagt im internen Modus „Sichern Sie die Datei“');
  assert.ok(hat(/^\(a\) Bereichsende, Modus intern, DE: strings:pausenErlaubnis\.text/), 'das Bereichsende sagt „gesichert erst …“');
  assert.ok(hat(/^\(a\) Bereichsende, Modus intern, DE: strings:wizPauseHinweis\.text/), 'der Pausen-Hinweis des Assistenten sagt „bis Sie das Fenster schließen“');
  assert.ok(hat(/^\(c\) DE strings:saveStatusFehlgeschlagenWiederholt\.text: zitiert „Als Datei sichern“/), 'die Pille zitiert einen Knopf, den es nicht gibt');
  assert.ok(hat(/^\(b\) Kein Speichermodell im Kern/));
});

test('Rot-Beweis (b): eine Stelle, die ihren Satz wieder selbst liest, fällt', () => {
  const e = ausBaum(REPO);
  const quelle = e.quelle.replace("escapeHTML(speicherSatz('bereichsende'))", 'STRINGS.pausenErlaubnis');
  assert.notEqual(quelle, e.quelle);
  const { befunde } = pruefe({ ...e, quelle });
  assert.ok(befunde.some((b) => /^\(b\) Bereichsende liest STRINGS\.pausenErlaubnis direkt/.test(b)), befunde.join('\n'));
});

test('Rot-Beweis (d): ein neuer Satz mit einer Speicher-Zusage außerhalb des Modells fällt, DE und EN', () => {
  const e = ausBaum(REPO);
  const de = { ...e.de, 'strings:probeSpeicherzusage.text': 'Ihre Angaben werden automatisch gespeichert.' };
  const en = { ...e.en, 'strings:probeSpeicherzusage.text': 'Your entries are only kept as long as this window stays open.' };
  const { befunde } = pruefe({ ...e, de, en });
  assert.ok(befunde.some((b) => /^\(d\) DE strings:probeSpeicherzusage\.text/.test(b)));
  assert.ok(befunde.some((b) => /^\(d\) EN strings:probeSpeicherzusage\.text/.test(b)));
});

test('Rot-Beweis (c): ein zitiertes Bedienwort ohne Beschriftung fällt', () => {
  const e = ausBaum(REPO);
  const de = { ...e.de, 'strings:schnellstartSchritt5.text': 'Erstellen Sie eine Sicherungskopie über „Jetzt sichern als Datei“.' };
  const { befunde } = pruefe({ ...e, de });
  assert.ok(befunde.some((b) => /^\(c\) DE strings:schnellstartSchritt5\.text: zitiert „Jetzt sichern als Datei“/.test(b)), befunde.join('\n'));
});

test('Rot-Beweis (c), Browser-Zitat: nur ein dem Browser zugeschriebenes Zitat geht durch, eine eigene Beschriftung gleichen Wortlauts nicht', () => {
  const e = ausBaum(REPO);
  const satz = (zusatz) => ({ ...e.de, 'strings:schnellstartSchritt5.text': 'Erstellen Sie eine Sicherungskopie, nicht über „Seite speichern“' + zusatz + '.' });
  const ohneBrowser = pruefe({ ...e, de: satz('') }).befunde;
  assert.ok(ohneBrowser.some((b) => /^\(c\) DE strings:schnellstartSchritt5\.text: zitiert „Seite speichern“/.test(b)), 'ohne Zuschreibung bleibt das Zitat rot');
  const mitBrowser = pruefe({ ...e, de: satz(' des Browsers') }).befunde;
  assert.ok(!mitBrowser.some((b) => /schnellstartSchritt5\.text: zitiert/.test(b)), mitBrowser.join('\n'));
  const en = { ...e.en, 'strings:schnellstartSchritt5.text': 'Create a backup copy, not with “Save page”.' };
  assert.ok(pruefe({ ...e, en }).befunde.some((b) => /^\(c\) EN strings:schnellstartSchritt5\.text: zitiert „Save page“/.test(b)), 'EN ohne „browser’s“ bleibt rot');
});

test('im Kern: die Stellen rendern den Satz des Modells, je nach Modus', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  const vorher = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  try {
    for (const [modus, idb] of [['intern', {}], ['datei', undefined]]) {
      globalThis.indexedDB = idb;
      assert.equal(V.internerSpeicherModus(), modus === 'intern');
      const sicht = V.speicherModellSicht();
      assert.equal(sicht.automatisch, modus === 'intern');
      assert.equal(sicht.ort, modus === 'intern' ? 'geraet' : 'datei');
      const html = V.einstellungenHTML();
      for (const stelle of ['schnellstartEintragen', 'schnellstartSichern']) {
        const satz = V.speicherSatz(stelle);
        assert.ok(satz && !/\{beschriftung:/.test(satz), stelle + ': Platzhalter aufgelöst');
        assert.ok(html.includes(V.escapeHTML ? V.escapeHTML(satz) : satz), modus + ': ' + stelle + ' im Einstellungen-Dialog');
      }
    }
  } finally {
    if (vorher) Object.defineProperty(globalThis, 'indexedDB', vorher); else delete globalThis.indexedDB;
  }
});

test('ein Handgriff: Einstellungen-Knopf und Menüpunkt tragen dieselbe Beschriftung und rufen dieselbe Funktion', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  V.setData({ meta: {}, sektoren: {} });
  const html = V.einstellungenHTML();
  const knopf = /<button[^>]*id="einst-sicherungskopie"[^>]*>([\s\S]*?)<\/button>/.exec(html);
  assert.ok(knopf, 'Knopf unter „Sichern & Wiederherstellen“');
  assert.ok(knopf[1].includes(V.STRINGS.sicherungskopieMenuepunkt));
  const quelle = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.match(quelle, /esk\.onclick = \(\) => sicherungskopieErstellen\(\);/);
  assert.match(quelle, /sicherungskopie\.onclick = \(\) => \{ depotMenueSchliessen\(false\); sicherungskopieErstellen\(\); \};/);
  // Drei Aufrufer desselben Handgriffs: Menüpunkt, Einstellungen und die Erinnerung „nichts liegt still nur im Browserspeicher“
  // auf WebKit im Tab (seit c279dd5af). Ein vierter Aufrufer oder eine zweite Definition fällt hier auf.
  assert.match(quelle, /onPrimaer: \(schliessen\) => \{ schliessen\(\); try \{ sicherungskopieErstellen\(\); \} catch \(_\) \{\} weiter\(\); \}/);
  assert.equal((quelle.match(/sicherungskopieErstellen\(\);/g) || []).length, 3, 'drei Zugänge zum einen Handgriff: Menüpunkt, Einstellungen, WebKit-Erinnerung');
  assert.equal((quelle.match(/function sicherungskopieErstellen\(/g) || []).length, 1, 'der Handgriff ist genau einmal definiert');
});

/* ── Proben-Deklaration (U2-ADR-099): der Wächter ruft die Diskriminante und verlangt ihre Liste leer.
   Die Rot-Beweise, „im Kern“ und „ein Handgriff“ sind Konstruktions-Form (feste Eingaben, feste Stellen), keine Verletzungsliste. */
module.exports = {
  PROBEN: [
    { fuer: 'dieser Baum: alle Stellen sagen dasselbe über das Speichern, DE und EN', diskriminante: speicherBefunde },
  ],
};
