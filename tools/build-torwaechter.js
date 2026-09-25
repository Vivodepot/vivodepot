#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   build-torwaechter.js — der Torwächter des Empfängers, im Erzeuger
   ────────────────────────────────────────────────────────────────────────────
   A5 (Fehlstellen-Auskunft), Laufzettel „nach der Entscheidungsrunde", Posten 3.

   DIE AUFLAGE, die alles bestimmt: **die Auskunft prüft gegen den Empfängersatz,
   nicht gegen das eigene Vokabular.** Der Fall, aus dem sie kommt, steht in SP
   Pros Satz vom 20.08.: *„Der Erzeuger kannte zehn Feldarten und war mit sich im
   Reinen, während der Kern sechs kannte und alles verwarf."* Eine Auskunft, die
   sich selbst befragt, meldet Vollzug, wo nichts angekommen ist.

   DER WEG IST NICHT NEU, NUR SEIN GEGENSTAND. Der Erzeuger trägt schon zwei
   erzeugte Regionen aus demselben Kern (`BEREICHE`, `FELDKATALOG`). Diese dritte
   trägt keine Liste, sondern den PRÜFER SELBST — wörtlich denselben Quelltext,
   der beim Empfänger entscheidet.

   WÖRTLICH, NICHT NACHGEBAUT, und das ist der ganze Unterschied: der
   Spiegel-Wächter aus A376 hält beide Seiten auf derselben ZAHL von Feldarten.
   Er prüft eine Zahl, kein Verhalten — alles, was `validateTemplate` darüber
   hinaus tut (codeWerte bei `auswahl`, Unterfeld-Typen bei `liste`, die
   Terminologie-URIs, vier Längen-Obergrenzen), stünde weiter in zweiter,
   handgepflegter Fassung. **Eine Kopie bleibt eine Kopie; erzeugter Quelltext
   ist dieselbe Sache.**

   WAS MITGEHT und warum genau das:
     · die sechs `_TEMPLATE_*`-Konstanten — Grenzwerte und Typmengen,
     · `validateTemplate` selbst,
     · die geführten Terminologie-URIs als DATEN (im Kern eine Funktion über
       `CODE_LISTEN`; die ganze Code-Listen-Tabelle mitzunehmen wäre eine dritte
       Kopie einer Sache, die der Erzeuger schon führt),
     · `_TEMPLATE_RENDER_TYPEN` — nicht für das Tor, sondern für die zweite
       Frage der Auskunft: ein Feld kann ANKOMMEN und trotzdem nicht angezeigt
       werden.

   WAS NICHT MITGEHT: der Übersetzer (`_templateFeldZuModell`). Er entscheidet
   nicht über Annahme, sondern über die Form danach — und er greift auf den
   Feldkatalog und die Bereichsliste zu, die der Erzeuger bereits erzeugt führt.

   DIE EINE LÜCKE, benannt und nicht wegdefiniert: eine erzeugte Region prüft
   gegen die Kern-Fassung, die BEIM ERZEUGEN galt. Der Empfänger kann eine
   ältere haben. Die Gegenrichtung ist gebaut — `appVersion` (F5) ist eine
   Untergrenze an die Anwendung und wird im Einlassweg geprüft. Was der
   Empfänger WIRKLICH hat, weiss der Erzeuger ohne Rückkanal nicht, und ein
   Rückkanal ist hier nicht gewollt.

   Aufruf:
     node tools/build-torwaechter.js            → schreibt die Region
     node tools/build-torwaechter.js --check    → schreibt nichts, meldet Drift (Exit 1)
     node tools/build-torwaechter.js --generator <pfad>   → --check gegen EINE Kopie
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const GENERATOR = path.join(REPO, 'vivodepot-template-generator.html');

const BEGIN = '/* TORWAECHTER:BEGIN — generierter Bereich (tools/build-torwaechter.js); Quelle: vivodepot.html validateTemplate */';
const ENDE = '/* TORWAECHTER:END */';

/* Ein Block aus dem Kern, von einer Ankerzeile bis zu einer Endzeile — beide MÜSSEN
   genau einmal vorkommen. Ein Anker, der zweimal trifft, schneidet irgendwo; ein Anker,
   der gar nicht trifft, erzeugt eine leere Region, und die sähe aus wie ein Prüfer. */
function block(quelle, von, bis) {
  const a = quelle.indexOf(von);
  if (a < 0) throw new Error('Anker nicht gefunden: ' + von.slice(0, 60));
  if (quelle.indexOf(von, a + 1) >= 0) throw new Error('Anker mehrdeutig: ' + von.slice(0, 60));
  const b = quelle.indexOf(bis, a);
  if (b < 0) throw new Error('Endanker nicht gefunden: ' + bis.slice(0, 60));
  return quelle.slice(a, b + bis.length);
}

function torwaechterAusKern(kernQuelle) {
  const konstanten = block(kernQuelle,
    "const _TEMPLATE_FELDTYPEN = new Set([",
    "const _TEMPLATE_WORTLAUT_MAX = 60 * 1024;  // 1E: Cap auf den amtlichen Wortlaut-Block (unter dem Objekt-Gesamt-Cap)");
  const funktion = block(kernQuelle, 'function validateTemplate(tpl) {', "\n  return null;   // ok (additiv: fehlendes templateType ist erlaubt)\n}");
  const renderTypen = block(kernQuelle,
    "const _TEMPLATE_RENDER_TYPEN = new Set(['text', 'textarea', 'zahl', 'datum', 'auswahl',",
    "'mehrfachauswahl', 'liste', 'ref', 'refMehrfach', 'verweis']);");
  /* Feld-Eigenschaften (16.09.2026, „alle Feld-Eigenschaften"): die EINE Quelle
     für „was der Kern an einem Feld liest" (`_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL`, ihr Kopf sagt
     es selbst). Der Erzeuger reicht danach durch, statt eine zweite Liste zu führen — eine
     Eigenschaft, die der Kern lernt, reist ohne Handarbeit im Erzeuger mit. */
  const schluessel = block(kernQuelle,
    "const _TEMPLATE_ENTITAET_BEKANNT = Object.freeze(['person', 'institution', 'mappe', 'bank-power-of-attorney']);",
    "  'zusammenfassungFelder', 'mitGeburt', 'unterdrueckeInZusammenfassungWennGesetzt', 'sichtbarWenn',\n]));\n// Uebersetzt EIN Generator-Template-Feld");
  /* `validateTemplate` ruft `_istSprachvariantenObjekt` — ohne diese Zeilen warf die Region bei
     einem Feldnamen mit Sprachvarianten einen ReferenceError statt zu prüfen. */
  const sprachform = block(kernQuelle, 'const _MODUL_SPRACHE_FORM = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;', 'const _MODUL_SPRACHE_FORM = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;')
    + '\n' + block(kernQuelle, 'function _istSprachvariantenObjekt(wert) {', "\n  return '';\n}");
  return { konstanten, funktion, renderTypen,
    schluessel: schluessel.slice(0, schluessel.lastIndexOf('\n// Uebersetzt EIN Generator-Template-Feld')),
    sprachform };
}

/* Die geführten Terminologie-URIs. Im Kern eine Funktion über `CODE_LISTEN`; hier als
   Daten, aus dem GELADENEN Kern gezogen — dieselbe Quelle, nur ohne die Tabelle. */
function terminologieUris() {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  return [...V._GEFUEHRTE_TERMINOLOGIE_URIS()].sort();
}

/* Die nativen Situationen als DATEN (16.09.2026) — `situation` ist die Alternative zu `bereich`
   (U2-ADR-246). Wie bei den Bereichen eine benannte Liste, kein freies Ziel. Angedockte
   Situationen aus Modulen kennt der Erzeuger nicht; sie stehen erst im Depot fest. */
function situationIds() {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  return V.SITUATIONEN.map((s) => s.id);
}

function generatorRegion(teile, uris, situationen) {
  return [
    BEGIN,
    '/* WÖRTLICH aus vivodepot.html erzeugt — nicht von Hand bearbeiten. Der Kern ist der',
    '   Empfänger; dies ist sein Tor, damit die Fehlstellen-Auskunft gegen den Empfängersatz',
    '   prüft und nicht gegen das eigene Vokabular (A5). Gekapselt, damit keine Kennung des',
    '   Erzeugers überschrieben wird: erreichbar allein über `KERN_TORWAECHTER`. */',
    'const KERN_TORWAECHTER = (function () {',
    '  const _GEFUEHRTE_URIS = new Set(' + JSON.stringify(uris) + ');',
    '  function _GEFUEHRTE_TERMINOLOGIE_URIS() { return _GEFUEHRTE_URIS; }',
    '  const _SITUATION_IDS = Object.freeze(' + JSON.stringify(situationen || []) + ');',
    teile.sprachform.split('\n').map((z) => '  ' + z).join('\n'),
    teile.schluessel.split('\n').map((z) => '  ' + z).join('\n'),
    teile.konstanten.split('\n').map((z) => '  ' + z).join('\n'),
    teile.renderTypen.split('\n').map((z) => '  ' + z).join('\n'),
    teile.funktion.split('\n').map((z) => '  ' + z).join('\n'),
    '  return Object.freeze({ validateTemplate, RENDER_TYPEN: _TEMPLATE_RENDER_TYPEN,',
    '    FELDTYPEN: _TEMPLATE_FELDTYPEN, UNTERFELD_TYPEN: _TEMPLATE_UNTERFELD_TYPEN,',
    '    FELD_SCHLUESSEL: _TEMPLATE_FELD_BEKANNTE_SCHLUESSEL, UNTERFELD_SCHLUESSEL: _TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL,',
    '    ENTITAET_BEKANNT: _TEMPLATE_ENTITAET_BEKANNT, SITUATION_IDS: _SITUATION_IDS,',
    '    istSprachvariantenObjekt: _istSprachvariantenObjekt, sprachvarianteRepraesentativ: _sprachvarianteRepraesentativ });',
    '})();',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('TORWAECHTER-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main() {
  const check = process.argv.includes('--check');
  const iG = process.argv.indexOf('--generator');
  const nurGenerator = iG >= 0 && process.argv[iG + 1] ? path.resolve(process.argv[iG + 1]) : null;
  const teile = torwaechterAusKern(fs.readFileSync(KERN, 'utf8'));
  const region = generatorRegion(teile, terminologieUris(), situationIds());

  const ziel = nurGenerator || GENERATOR;
  const q = fs.readFileSync(ziel, 'utf8');
  const neu = regionErsetzen(q, region, path.basename(ziel));
  if (neu === q) {
    console.log('build-torwaechter: kein Drift in ' + path.basename(ziel) + ' — der Torwächter ist derselbe.');
    return;
  }
  if (check || nurGenerator) {
    console.error('build-torwaechter: DRIFT — ' + path.basename(ziel) + ' (TORWAECHTER-Region)');
    console.error('  Abhilfe: node tools/build-torwaechter.js');
    process.exit(1);
  }
  fs.writeFileSync(ziel, neu);
  console.log('build-torwaechter: Region geschrieben (' + region.split('\n').length + ' Zeilen).');
}

if (require.main === module) main();
module.exports = { torwaechterAusKern, generatorRegion, regionErsetzen, terminologieUris, situationIds, BEGIN, ENDE, GENERATOR, KERN };
