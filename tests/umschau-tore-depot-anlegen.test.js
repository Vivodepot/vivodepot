'use strict';
/* In der Umschau gibt es kein Schreibrecht (Entscheidung 06.10.2026, Weg A). Jeder Weg, der etwas herausgeben oder sichern
   will, öffnet darum „Depot anlegen“ mit Vorname, Nachname und Passwort, wie jeder Versuch einzutragen. Einen zweiten,
   namenlosen Passwort-Dialog gibt es nicht mehr (Rückbau des Vorschau-Passwortwegs, 07.11.2026).
   Diese Probe hält fest: die drei Tore (dateiAusgeben, depotInternSichern, depotInDateiSichern) und die Schließen-Warnung
   führen in der Umschau in den Anlege-Dialog. Rot-Beweis: eine Kopie des Kerns, in der ein Tor den Anlege-Dialog nicht
   öffnet, fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

/* Der Testkern liefert für jede Kennung ein Element; gelesen wird darum der Inhalt des Dialogs. */
function anlegeDialogOffen(document) {
  const html = String(document.getElementById('modal-inhalt').innerHTML || '');
  return html.includes('id="id-vorname"') && html.includes('id="id-pw"') && !html.includes('id="pw-neu"');
}

const TORE = {
  dateiAusgeben: (V) => V.dateiAusgeben(new Blob(['x'], { type: 'text/plain' }), 'probe.txt', 'text/plain'),
  depotInternSichern: (V) => V.depotInternSichern(),
  depotInDateiSichern: (V) => V.depotInDateiSichern(),
  flowSchliessenWarnung: (V, document) => { V.flowSchliessenWarnung({}); return document.getElementById('m-ok').onclick(() => {}); },
};

async function torOeffnetAnlegen(name, htmlPfad) {
  const { V, document } = ladeKern(htmlPfad ? { htmlPfad } : undefined);
  V.flowVorschauBetreten();
  assert.equal(V.imVorschau(), true, 'Vorbedingung: Umschau');
  assert.equal(anlegeDialogOffen(document), false, 'Vorbedingung: noch kein Anlege-Dialog');
  await TORE[name](V, document);
  return { offen: anlegeDialogOffen(document), vorschau: V.imVorschau() };
}

for (const name of Object.keys(TORE)) {
  test('[Umschau·Tore] ' + name + ' öffnet in der Umschau „Depot anlegen“ (mit Namen), schreibt nichts', async () => {
    const r = await torOeffnetAnlegen(name);
    assert.equal(r.offen, true, name + ' öffnet den Anlege-Dialog');
    assert.equal(r.vorschau, true, 'bis zum Anlegen bleibt es Umschau');
  });
}

test('[Umschau·Tore] den namenlosen Passwort-Weg gibt es nicht mehr', () => {
  const kern = fs.readFileSync(KERN, 'utf8');
  assert.equal((kern.match(/function flowPasswortSetzen\(/g) || []).length, 0);
  assert.equal((kern.match(/function flowVorschauUebernehmen\(/g) || []).length, 0);
});

test('[Umschau·Tore·Rot-Beweis] ein Tor, das den Anlege-Dialog nicht öffnet, fällt', async () => {
  const kern = fs.readFileSync(KERN, 'utf8');
  const stelle = "  if (imVorschau()) { flowDepotAnlegen(); return; }   // Umschau: kein Schreibrecht, Sichern heißt Depot anlegen";
  assert.equal(kern.split(stelle).length, 2, 'Vorbedingung: die Stelle in depotInDateiSichern steht genau einmal im Kern');
  const tmp = path.join(os.tmpdir(), 'umschau-tore-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, kern.replace(stelle, '  if (imVorschau()) { return; }   // Umschau: kein Schreibrecht, Sichern heißt Depot anlegen'));
  try {
    const r = await torOeffnetAnlegen('depotInDateiSichern', tmp);
    assert.equal(r.offen, false, 'ohne den Weg in den Anlege-Dialog öffnet das Tor nichts');
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
