'use strict';
/* Der Klassenwächter gegen „ein `continue` nach fehlgeschlagener Modul-Prüfung, das keine Spur hinterlässt"
   (tools/stumme-zurueckweisung-pruefen.js, 22.09.2026). Er hält die FORM fest, nicht die drei Zeilen der Lese-App:
   (1) der echte Bestand ist grün, (2) Rot-Beweise für jede Weise, auf der die Klasse wiederkäme — mit Positivkontrolle davor,
   (3) die Kommandozeile. Das Verhalten (dass ein Leser die Spur zeigt) steht in tests/lese-app-stumme-zurueckweisung.test.js. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const W = require('../tools/stumme-zurueckweisung-pruefen.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'stumme-zurueckweisung-pruefen.js');
const GRUNDLINIE = JSON.parse(fs.readFileSync(W.GRUNDLINIE_PFAD, 'utf8'));
const LESEN = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const probe = (p) => { const f = path.join(REPO, p); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
const echt = () => ({ 'vivodepot-lesen.html': LESEN, 'vivodepot.html': KERN });
const fehlerVon = (texte, g = GRUNDLINIE) => W.pruefen(texte, g, probe).fehler;

/* ── (1) der echte Bestand ────────────────────────────────────────────────────────────────── */

test('[Klassenwächter] der echte Bestand entspricht der Grundlinie: jede Stelle hat eine Spur oder steht mit Grund da', () => {
  assert.ok(LESEN.length > 1e5 && KERN.length > 1e6, 'Vorbedingung: beide Dateien sind gelesen');
  assert.deepEqual(fehlerVon(echt()), []);
});

test('[Klassenwächter] die drei Stellen der Lese-App tragen eine Spur, und die Grundlinie führt sie als `spur`', () => {
  const stellen = W.stellenFinden(LESEN);
  for (const ort of ['logikModulAbschnitteHTML', '_textsatzModuleAusDepotAnmelden', '_angehoerigenVorlagenAusDepotAnmeldenLesen']) {
    const s = stellen.find((x) => x.ort === ort);
    assert.ok(s, ort + ' wird als Stelle der Form gefunden (Positivkontrolle: der Scanner sieht sie)');
    assert.ok(GRUNDLINIE.spurFunktionen.some((f) => s.rumpf.includes(f)), ort + ' schreibt eine Spur');
    assert.equal(GRUNDLINIE.dateien['vivodepot-lesen.html'].find((e) => e.ort === ort).art, 'spur');
  }
});

/* ── (2) Rot-Beweise ──────────────────────────────────────────────────────────────────────── */

test('[Klassenwächter·Rot-Beweis] die Vergleichsgrundlage ist grün (sonst beweisen die roten Fälle nichts)', () => {
  assert.deepEqual(fehlerVon(echt()), []);
});

test('[Klassenwächter·Rot-Beweis] die alte Form kommt zurück: die Spur wird aus dem Logik-Modul-Weg gestrichen → rot', () => {
  const alt = LESEN.replace("{ _verwurfSpurLesen('logik', roh.id, geprueft.grund); continue; }", 'continue;');
  assert.notEqual(alt, LESEN, 'Vorbedingung: die Streichung ist wirksam');
  const f = fehlerVon({ ...echt(), 'vivodepot-lesen.html': alt }).join('|');
  assert.match(f, /logikModulAbschnitteHTML.*als `spur` geführt, aber der Rumpf ruft keine Spur-Funktion mehr auf/);
});

test('[Klassenwächter·Rot-Beweis] eine VIERTE, neue Stelle derselben Form (andere Funktion, anderer Name) ist rot', () => {
  const neu = LESEN + '\n<script>\nfunction _fremdModuleAnmelden(liste) {\n  for (const m of liste) {\n    const p = fremdPruefen(m);\n    if (!p.gueltig) continue;\n    reg.push(m);\n  }\n}\n</script>\n';
  const f = fehlerVon({ ...echt(), 'vivodepot-lesen.html': neu }).join('|');
  assert.match(f, /_fremdModuleAnmelden.*in keiner Sorte steht/);
});

test('[Klassenwächter·Rot-Beweis] die Form mit Klammern und mehreren Zeilen wird ebenso gefunden', () => {
  const s = W.stellenFinden('function f(l) {\n  for (const m of l) {\n    const g = p(m);\n    if (!g || !g.gueltig) {\n      log();\n      continue;\n    }\n  }\n}\n');
  assert.equal(s.length, 1);
  assert.equal(s[0].ort, 'f');
  assert.equal(s[0].bedingung, '!g || !g.gueltig');
});

test('[Klassenwächter·Erkenner] ein Kommentar mit der Form zählt nicht, eine Zeichenkette auch nicht als Kommentar-Beginn (Grenze (d), benannt)', () => {
  assert.equal(W.stellenFinden('function f(){\n  // if (!g.gueltig) continue;\n  /* if (!g.gueltig) continue; */\n}\n').length, 0);
  assert.equal(W.stellenFinden("function f(){ const u = 'http://x'; if (!g.gueltig) continue; }").length, 1, 'ein // in einer Zeichenkette verschluckt den Rest nicht');
  assert.equal(W.stellenFinden('function f(){ if (!ok) continue; }').length, 0, 'eine Bedingung ohne `gueltig` ist eine andere Form (Grenze (a))');
});

test('[Klassenwächter·Rot-Beweis] eine `offene` Stelle, die inzwischen eine Spur trägt, ist rot: die Zahl soll fallen', () => {
  const g = JSON.parse(JSON.stringify(GRUNDLINIE));
  const offene = g.dateien['vivodepot.html'].find((e) => e.art === 'offen');
  const mitSpur = KERN.replace(new RegExp('(function ' + offene.ort + '[\\s\\S]{0,4000}?if \\(' + offene.bedingung.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)\\s*)continue;'), '$1{ X_VERWORFEN.push({ grund: 1 }); continue; }');
  assert.notEqual(mitSpur, KERN, 'Vorbedingung: die Einfügung ist wirksam');
  assert.match(fehlerVon({ ...echt(), 'vivodepot.html': mitSpur }).join('|'), new RegExp(offene.ort + '.*als `offen` geführt, trägt aber inzwischen eine Spur'));
});

test('[Klassenwächter·Rot-Beweis] der Deckel der offenen Stellen ist exakt: zu niedrig und zu hoch sind rot', () => {
  const tief = { ...GRUNDLINIE, offenDeckel: GRUNDLINIE.offenDeckel - 1 };
  const hoch = { ...GRUNDLINIE, offenDeckel: GRUNDLINIE.offenDeckel + 1 };
  assert.match(fehlerVon(echt(), tief).join('|'), /kann nur sinken/);
  assert.match(fehlerVon(echt(), hoch).join('|'), /Deckel senken/);
});

test('[Klassenwächter·Rot-Beweis] eine Ausnahme ohne Grund, mit fehlender oder falscher Probe ist rot', () => {
  const g = () => JSON.parse(JSON.stringify(GRUNDLINIE));
  const a = g(); const ea = a.dateien['vivodepot-lesen.html'].find((e) => e.art === 'ausnahme'); ea.grund = 'zu kurz';
  assert.match(fehlerVon(echt(), a).join('|'), /Ausnahme ohne Grund/);
  const b = g(); b.dateien['vivodepot-lesen.html'].find((e) => e.art === 'ausnahme').probe = 'tests/gibt-es-nicht.test.js';
  assert.match(fehlerVon(echt(), b).join('|'), /die Probe tests\/gibt-es-nicht\.test\.js gibt es nicht/);
  const c = g(); c.dateien['vivodepot-lesen.html'].find((e) => e.art === 'ausnahme').probe = 'tests/lese-app-stumme-zurueckweisung.test.js';
  assert.match(fehlerVon(echt(), c).join('|'), /nennt den Ort .* nicht — sie hängt nicht an dieser Stelle/);
});

test('[Klassenwächter·Rot-Beweis] eine Zeile der Grundlinie ohne Stelle im Code, eine Datei ohne Grundlinie und eine fehlende Datei sind rot', () => {
  const g = JSON.parse(JSON.stringify(GRUNDLINIE));
  g.dateien['vivodepot-lesen.html'].push({ ort: 'verschwundeneFunktion', bedingung: '!x.gueltig', art: 'spur' });
  assert.match(fehlerVon(echt(), g).join('|'), /verschwundeneFunktion.*wurde aber nicht mehr gefunden/);
  assert.match(fehlerVon({ ...echt(), 'neu.html': 'x' }).join('|'), /neu\.html: steht nicht in der Grundlinie/);
  assert.match(fehlerVon({ ...echt(), 'vivodepot.html': null }).join('|'), /vivodepot\.html: die Datei fehlt/);
});

/* ── (3) die Kommandozeile ────────────────────────────────────────────────────────────────── */

test('[Klassenwächter·CLI] ohne Argument grün gegen das Repo; --wurzel mit einer stummen Stelle Exit 1 und der Ort im Fund', () => {
  const echtLauf = spawnSync(process.execPath, [WERKZEUG], { encoding: 'utf8', timeout: 90000 });
  assert.equal(echtLauf.status, 0, echtLauf.stderr);
  assert.match(echtLauf.stdout, /vivodepot-lesen\.html \d+ Stellen, vivodepot\.html \d+ Stellen; offen \d+/);
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stumm-'));
  try {
    fs.writeFileSync(path.join(tmp, 'vivodepot-lesen.html'), LESEN + '\n<script>\nfunction _viertes(l){ for (const m of l) { if (!p(m).gueltig) continue; } }\n</script>\n');
    fs.writeFileSync(path.join(tmp, 'vivodepot.html'), KERN);
    fs.mkdirSync(path.join(tmp, 'tests'));
    for (const e of [...GRUNDLINIE.dateien['vivodepot-lesen.html'], ...GRUNDLINIE.dateien['vivodepot.html']]) if (e.probe) fs.writeFileSync(path.join(tmp, e.probe), fs.readFileSync(path.join(REPO, e.probe)));
    const rot = spawnSync(process.execPath, [WERKZEUG, '--wurzel', tmp], { encoding: 'utf8', timeout: 90000 });
    assert.equal(rot.status, 1);
    assert.match(rot.stderr, /_viertes/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
