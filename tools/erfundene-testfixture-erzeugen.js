#!/usr/bin/env node
'use strict';
/* erfundene-testfixture-erzeugen.js — Lizenz-Fund 18.09.2026:
   erzeugt strukturgleiche, erfundene Ersatzfixtures für die kommerziellen Pro-
   Templates (tools/templates/vivodepot-pro-*.json), damit tests/fixtures/ keinen
   verkäuflichen Inhalt mehr trägt (blanket-öffentlich per Schichtgrenze-Regel).

   Auflage (wörtlich): kein echter Bezeichner (feldname/gruppe/anzeige/
   titel/frage/texte), aber STRUKTURGLEICH (Feldanzahl, feldtyp-/bereich-
   Verteilung, codeWerte-/unterFelder-Anzahl) — sonst prüfen die abhängigen
   Tests nach dem Umbau weniger als vorher, unbemerkt.

   TECHNISCHE BEZEICHNER BLEIBEN UNVERÄNDERT (datenSchema-Schlüssel, `id`,
   `sektor`, `feldtyp`, `icon`, `cluster`) — sie sind Registry-/Struktur-Angaben,
   keine Geschäftsprosa; nur Inhalts-Strings (Auflage oben) werden erfunden.
   Probe, die das hält: tests/pro-testschablone-keine-echten-bezeichner.test.js.

   Aufruf: node tools/erfundene-testfixture-erzeugen.js <echte-datei> <ziel-datei> <vorlage|logikmodul|bereich> */
const fs = require('node:fs');
const path = require('node:path');

const REAL = process.argv[2];
const OUT = process.argv[3];

let counter = 0;
function neu(praefix) {
  counter += 1;
  return praefix + counter;
}
function tplKennung() {
  counter += 1;
  return 'tpl_leuchtturm_' + counter;
}

function transformVorlage(d) {
  counter = 0;
  return {
    modulTyp: d.modulTyp,
    anbieterId: 'vivodepot-test',
    felder: d.felder.map((f) => {
      const neues = {
        feldname: neu('Testfeld '),
        feldtyp: f.feldtyp,
        bereich: f.bereich,
        gruppe: neu('Testgruppe '),
      };
      if (f.pflicht) neues.pflicht = true;
      if (f.codeWerte) {
        neues.codeWerte = f.codeWerte.map((c, i) => ({ code: 'testcode_' + (i + 1), anzeige: neu('Testoption ') }));
      }
      if (f.unterFelder) {
        neues.unterFelder = f.unterFelder.map((u) => ({ feldname: neu('TestUnterfeld '), feldtyp: u.feldtyp }));
      }
      return neues;
    }),
  };
}

function transformLogikModul(d) {
  counter = 0;
  const kennungMap = new Map();
  const kennungFuer = (alt) => {
    if (!kennungMap.has(alt)) kennungMap.set(alt, tplKennung());
    return kennungMap.get(alt);
  };
  const neuesSchema = {};
  const feldIdMap = new Map();
  for (const [k, v] of Object.entries(d.datenSchema)) {
    // Schlüssel bleibt (technischer Bezeichner, keine Geschäftsprosa) — nur
    // die WERTE mit echtem Feld-Bezug (tpl_-Kennungen) werden erfunden.
    feldIdMap.set(k, k);
    const eintrag = { typ: v.typ, sektor: v.sektor, feld: v.sektor === 'identity' ? v.feld : kennungFuer(v.feld) };
    if (v.unterfeld) eintrag.unterfeld = kennungFuer(v.sektor + '::' + v.feld + '::' + v.unterfeld);
    neuesSchema[k] = eintrag;
  }
  const neueAbschnitte = d.abschnitte.map((a, ai) => ({
    titel: 'Testabschnitt ' + (ai + 1),
    bloecke: a.bloecke.map((b) => {
      if (b.typ === 'immer') return { typ: 'immer', texte: b.texte.map(() => neu('Testtext ')) };
      const neuerBlock = { typ: b.typ, feldId: feldIdMap.get(b.feldId) || b.feldId, frage: neu('Testfrage '), luecke: b.luecke };
      if (b.format) neuerBlock.format = b.format;
      return neuerBlock;
    }),
  }));
  return {
    modulTyp: d.modulTyp,
    id: d.id, // technischer Bezeichner (Registry-Schlüssel), keine Geschäftsprosa — bleibt
    titel: neu('Testmodul-Titel '),
    sektor: d.sektor,
    moduleVersion: d.moduleVersion,
    herkunft: d.herkunft,
    datenSchema: neuesSchema,
    abschnitte: neueAbschnitte,
    dokAusgabe: {
      h1: neu('Test-H1 '),
      klasse: 'test-logikmodul-dok',
      herkunftText: neu('Test-Herkunftstext '),
      unterschrift: d.dokAusgabe.unterschrift,
      unterschriftErsatzHinweis: neu('Test-Hinweis '),
      fussText: neu('Test-Fusstext '),
      knopfAttr: 'test-logikmodul-dokument',
      dateiBasis: 'Test-Logikmodul',
      toolbarHinweis: neu('Test-Toolbarhinweis '),
    },
  };
}

function transformBereich(d) {
  counter = 0;
  const neu2 = {};
  for (const [id, v] of Object.entries(d.bereiche)) {
    neu2[id] = { label: neu('Testbereich '), icon: v.icon };
  }
  return { modulTyp: d.modulTyp, sprache: d.sprache, moduleVersion: d.moduleVersion, herkunft: 'vivodepot-test', bereiche: neu2 };
}

const real = JSON.parse(fs.readFileSync(REAL, 'utf8'));
const art = process.argv[4];
let ergebnis;
if (art === 'vorlage') ergebnis = transformVorlage(real);
else if (art === 'logikmodul') ergebnis = transformLogikModul(real);
else if (art === 'bereich') ergebnis = transformBereich(real);
else throw new Error('unbekannte Art: ' + art);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(ergebnis, null, 2) + '\n');
console.log('geschrieben:', OUT);
