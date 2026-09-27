'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   LIZ1 — keine BUSL-Kennung mehr im Repo (Auftrag vom 19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Entscheidung (18./19.09.2026, abgestimmter Lizenzvorschlag
   §4/§6): die BUSL-Schicht entfällt ersatzlos, Vivodepot
   steht durchgehend unter EUPL-1.2. Umgesetzt: die 11 Dateien, die vorher die
   SPDX-Kennung für BUSL-1.1 trugen (s. `buslKennung()` unten für den genauen
   Wortlaut), tragen jetzt EUPL-1.2.

   WAS DIESE PROBE HÄLT: keine git-getrackte Datei trägt mehr die SPDX-Kennung
   für BUSL. NICHT geprüft (bewusst): die bloße Erwähnung des Wortes „BUSL" in
   Fließtext — ADRs, Berichte und `tools/veroeffentlichung-zuschnitt.js`s eigene
   Klassifikations-Achse nennen BUSL weiterhin als Historie bzw. als (jetzt tote,
   separat aufzuräumende) Altlast. Das zu bereinigen ist ein eigener, größerer
   Posten (Bau-Werkzeug, nicht Lizenztext) und nicht Teil dieses Auftrags.

   Muster aus Teilen zusammengesetzt (buslKennung()), damit diese Testdatei sich
   nicht selbst als Fund meldet — dieselbe Konvention wie an anderer Stelle im
   Repo (Probe gegen Muster-Achse darf das Muster nicht literal enthalten). */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');

function buslKennung() {
  return 'SPDX-License-Identifier: ' + 'BUSL' + '-1.1';
}

/* Reine Funktion, kein git-Aufruf — der Rot-Beweis unten prüft SIE, nicht den
   Aufrufweg. */
function traegtBuslKennung(text) {
  return text.includes(buslKennung());
}

function gitGrepBusl() {
  try {
    const out = execFileSync(
      'git', ['grep', '-l', buslKennung()],
      { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() },
    );
    return out.split('\n').filter(Boolean);
  } catch (e) {
    if (e.status === 1) return []; // git grep: kein Treffer, kein Fehler
    throw e;
  }
}

describe('[LIZ1] keine BUSL-Kennung mehr', () => {
  test('kein git-getracktes Vorkommen der BUSL-1.1-SPDX-Kennung mehr', () => {
    const treffer = gitGrepBusl();
    assert.deepEqual(treffer, [],
      'BUSL-SPDX-Kennung noch gefunden in: ' + treffer.join(', ')
      + ' — Die Entscheidung (18./19.09.2026) sagt: entfällt ersatzlos, alles EUPL-1.2.');
  });

  test('[Positivkontrolle] LICENSE selbst trägt die Kennung nicht (mehr)', () => {
    const text = fs.readFileSync(path.join(REPO, 'LICENSE'), 'utf8');
    assert.equal(traegtBuslKennung(text), false);
    // Seit 24.09.2026 trägt LICENSE allein den amtlichen Volltext (damit GitHub die Lizenz erkennt);
    // die Kennung steht darum als Titel des Volltexts, nicht als SPDX-Zeile.
    assert.match(text, /EUROPEAN UNION PUBLIC LICENCE v\. 1\.2/,
      'LICENSE muss den EUPL-1.2-Volltext tragen, sonst prüfte diese Probe am falschen Gegenstand');
  });

  test('[Rot-Beweis] traegtBuslKennung() erkennt eine echte Einfügung', () => {
    const echt = fs.readFileSync(path.join(REPO, 'LICENSE'), 'utf8');
    assert.equal(traegtBuslKennung(echt), false, 'Vorbedingung: der echte Text ist sauber');
    const vergiftet = echt + '\n' + buslKennung() + '\n';
    assert.equal(traegtBuslKennung(vergiftet), true,
      'ROT ERWARTET, solange die Kennung nicht erkannt wird — hier MUSS sie erkannt werden');
    assert.equal(traegtBuslKennung(echt), false, 'der echte Text bleibt beim erneuten Prüfen sauber');
  });
});
