'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kontextgebundener Zustand steht an EINER Stelle (19.09.2026, Fehlerpfad 3/5·B).
   Anlass: subKontextVerlassen() ließ einen offenen Wizard des Sub-Depots stehen; ein „Weiter" danach
   hätte die Antwort der Sub-Inhaberin in den ANKER-Umschlag geschrieben — Daten in fremder Hand.
   Beim Betreten setzte eine handgeschriebene Teilliste nur zwei Variablen zurück. Die Klasse: wer eine
   neue kontextgebundene Variable anlegt und sie in keiner Liste führt, baut den nächsten Fall.

   Der Wächter: jede top-level `let`-Variable von Namensart Ansicht/Wizard/Dialog/Auswahl in
   vivodepot.html muss in KONTEXT_ZUSTAND stehen (wird beim Kontextwechsel zurückgesetzt) oder hier
   mit Grund als kontextfrei geführt sein. Beide Kontextwechsel rufen kontextZustandZuruecksetzen().
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

/* Namensart der Kandidaten: aktiv…, wizard…, sowie …Modal…, …Dialog…, …Overlay…, …Zusammenstellung…
   (Auswahl/Suche einer Zusammenstellung, Personen-Dialog). */
const KANDIDAT = /^(aktiv\w*|wizard\w*|\w*(?:Modal|Dialog|Overlay|Zusammenstellung)\w*)$/;

/* Bewusst KONTEXTFREI — Name und Grund. Eine Aufnahme hier ist eine Entscheidung, kein Ausweg. */
const KONTEXTFREI = {
  aktiverSubKontext: 'ist der Kontext selbst; subKontextBetreten/-Verlassen setzen ihn ausdrücklich',
};

function letNamen(quelle) {
  const namen = [];
  for (const m of quelle.matchAll(/^let\s+([A-Za-z_$][\w$]*)\b/gm)) namen.push(m[1]);
  return namen;
}

function registerNamen(quelle) {
  const a = quelle.indexOf('const KONTEXT_ZUSTAND = [');
  assert.ok(a >= 0, 'KONTEXT_ZUSTAND fehlt in vivodepot.html');
  const e = quelle.indexOf('\n];', a);
  assert.ok(e > a, 'Ende von KONTEXT_ZUSTAND nicht gefunden');
  return [...quelle.slice(a, e).matchAll(/^\s*\['([A-Za-z_$][\w$]*)'/gm)].map((m) => m[1]);
}

/* Reine Entscheidung — für den Rot-Beweis mit fingiertem Quelltext. */
function urteil(quelle) {
  const fehler = [];
  const register = registerNamen(quelle);
  const lets = new Set(letNamen(quelle));
  for (const n of lets) {
    if (KANDIDAT.test(n) && !register.includes(n) && !KONTEXTFREI[n]) {
      fehler.push('let ' + n + ': kontextgebunden nach Namensart, steht aber weder in KONTEXT_ZUSTAND noch als kontextfrei mit Grund');
    }
  }
  for (const n of register) if (!lets.has(n)) fehler.push('KONTEXT_ZUSTAND nennt ' + n + ', eine solche let-Variable gibt es nicht (tot)');
  for (const n of Object.keys(KONTEXTFREI)) if (register.includes(n)) fehler.push(n + ' steht als kontextfrei UND in KONTEXT_ZUSTAND');
  return fehler;
}

function funktionsKoerper(quelle, name) {
  const a = quelle.search(new RegExp('^(async )?function ' + name + '\\('.replace(/\\\\/g, '\\'), 'm'));
  assert.ok(a >= 0, 'function ' + name + ' fehlt');
  const e = quelle.indexOf('\n}\n', a);
  return quelle.slice(a, e);
}

test('[Kontextzustand] jede kontextgebundene Variable steht in KONTEXT_ZUSTAND oder ist mit Grund kontextfrei; kein toter Eintrag', () => {
  assert.deepEqual(urteil(fs.readFileSync(KERN, 'utf8')), []);
});

test('[Kontextzustand·Rot-Beweis] eine NEUE kontextgebundene let-Variable ohne Eintrag ist rot; ein toter Eintrag ebenfalls', () => {
  const echt = fs.readFileSync(KERN, 'utf8');
  const neu = echt.replace('let aktiverWizardId = null;', 'let aktiverWizardId = null;\nlet aktiveNeueAuswahlId = null;');
  assert.notEqual(neu, echt, 'der Fixture-Eingriff hat nichts verändert');
  assert.match(urteil(neu).join('\n'), /let aktiveNeueAuswahlId: kontextgebunden/);
  const ohneEintrag = echt.replace("  ['wizardFehlerGrund', () => { wizardFehlerGrund = null; }],\n", '');
  assert.notEqual(ohneEintrag, echt);
  assert.match(urteil(ohneEintrag).join('\n'), /let wizardFehlerGrund: kontextgebunden/, 'ein aus der Liste entfernter Eintrag muss auffallen');
  const tot = echt.replace("['aktiveLageId', () => { aktiveLageId = null; }],", "['aktiveLageId', () => { aktiveLageId = null; }],\n  ['gibtEsNicht', () => {}],");
  assert.match(urteil(tot).join('\n'), /gibtEsNicht.*tot/);
});

test('[Kontextzustand·Gegenprobe] eine Variable anderer Namensart braucht keinen Eintrag', () => {
  const echt = fs.readFileSync(KERN, 'utf8');
  const fremd = echt.replace('let aktiverWizardId = null;', 'let aktiverWizardId = null;\nlet _unverfaengliches = null;');
  assert.deepEqual(urteil(fremd), []);
});

test('[Kontextzustand·Wechsel] Betreten UND Verlassen rufen kontextZustandZuruecksetzen()', () => {
  const q = fs.readFileSync(KERN, 'utf8');
  for (const f of ['subKontextBetreten', 'subKontextVerlassen']) {
    assert.match(funktionsKoerper(q, f), /kontextZustandZuruecksetzen\(\)/, f + ' setzt den kontextgebundenen Zustand nicht zurück');
  }
});

test('[Kontextzustand·Wechsel·Rot-Beweis] ohne den Aufruf im Verlassen ist die Probe rot', () => {
  const q = fs.readFileSync(KERN, 'utf8').replace('  kontextZustandZuruecksetzen();\n  entferneSubDepotAkzentOverride();', '  entferneSubDepotAkzentOverride();');
  assert.doesNotMatch(funktionsKoerper(q, 'subKontextVerlassen'), /kontextZustandZuruecksetzen\(\)/);
});
