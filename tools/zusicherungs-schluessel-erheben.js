#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   zusicherungs-schluessel-erheben — welche Zeichenketten sagen etwas über den
   ZUSTAND des Dokuments, statt eine Sache zu benennen
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS (06.09.2026, am Kanon gemessen): ein fremdes Textsatz-Modul
   in einer nicht eingebauten Sprache kann in der Lese-App die Sätze
   überschreiben, mit denen die Anwendung über sich selbst spricht — den
   Klartext-Warnsatz und die Herkunftszeile. Ein unverschlüsseltes Depot sagt
   dem Empfänger dann, es sei verschlüsselt.

   WARUM NICHT EINE HANDLISTE. Eine von Hand gepflegte Sperrliste bewacht die
   Landkarte ihres Erbauers: sie schützt, woran er gedacht hat, und schweigt
   über den Satz, der morgen dazukommt. Diese Erhebung leitet die Menge darum
   aus dem Bau der Anwendung ab.

   DER STRUKTURELLE ANKER, und er ist nicht mein Urteil über den Wortlaut:
   die Anwendung markiert ihre Zustands-Aussagen im Markup selbst — sie stehen
   in Blöcken mit einer eigenen Klasse (`klartext-warn`, `herkunft-marke`,
   `stand-marke`, `vorlage-marke`). Diese Klassen sind da, WEIL der Block etwas
   über den Zustand sagt; sie sind kein nachträgliches Etikett.

   Erhoben wird darum:
     1 jede Stelle im Markup, die eine dieser Klassen setzt
     2 die STRINGS-Schlüssel, die in derselben Anweisung stehen
     3 die Schlüssel EINES Funktionssprungs weiter — die Satzbauer, die von
       dort gerufen werden (`modulHerkunftSatz`, `moduleStandSatz`, …)

   WAS DAS NICHT LEISTET, ausdrücklich: eine NEUE Zustands-Klasse fände die
   Erhebung nicht von selbst. Dagegen steht die Gegenprobe unten — jede Klasse,
   die die Warn-Farbvariablen der Anwendung trägt, muss im Anker stehen.
   Der Anker ist damit selbst bewacht, statt geglaubt.

   Aufruf:
     node tools/zusicherungs-schluessel-erheben.js [--datei <pfad>] [--json]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const LESE = path.join(REPO, 'vivodepot-lesen.html');
const KERN = path.join(REPO, 'vivodepot.html');

/* Die Zustands-Klassen. Der Anker der Erhebung — und selbst geprüft (s. gegenprobe).
   `logikmodul-marke` (C1, 06.09.2026): dieselbe Bauform wie `vorlage-marke`, für ein
   eingelassenes logikModul statt eine importierte Vorlage — eigene Klasse, damit die Erhebung
   sie als eigenen Fund sieht, statt sie unter einem fremden Namen mitzuzählen.
   `luecken-hinweis` (LA1, 19.09.2026): derselbe Grund — sagt etwas über den Zustand des
   Dokuments (Inhalt, den diese Anwendung nicht darstellen kann), nicht eine Sache. */
const ZUSTAND_KLASSEN = Object.freeze(['klartext-warn', 'herkunft-marke', 'stand-marke', 'vorlage-marke', 'logikmodul-marke', 'luecken-hinweis', 'zurueckgehalten-marke']);

/* DER KERN TRÄGT KEINE DIESER KLASSEN (ZS2, 19.09.2026, gemessen: null Treffer für alle fünf
   Zustands-Klassen und für `--warn-bg`/`--warn-tinte` im ganzen Dokument) — er kennzeichnet
   seine Zustands-Sätze nicht im Markup, sondern in den SATZBAUERN selbst: `modulHerkunftSatz`/
   `moduleStandSatz` (Bildschirm) und `modulHerkunftFussText`/`moduleStandFussText` (Fußzeile,
   dieselbe Aussage, kürzer). Der Anker der Kern-Erhebung ist darum die FUNKTION, nicht die
   Klasse — aber die Erhebungs-LOGIK (Funktionskörper lesen, STRINGS.xxx darin sammeln) ist
   dieselbe wie oben, wörtlich wiederverwendet (s. erhebenAusFunktionen). */
const ZUSTAND_FUNKTIONEN_KERN = Object.freeze(['modulHerkunftSatz', 'modulHerkunftFussText', 'moduleStandSatz', 'moduleStandFussText', 'vorlageZustandsSatz']);

/* NAMENTLICH GEFÜHRTE SCHLÜSSEL (ZS2-Nachtrag, 19.09.2026) — Vertrauens- und Haftungsaussagen, die in
   GROSSEN Render-/PDF-Funktionen stehen (`einstellungenHTML`, `renderAnfrage`, `zeichneVollDepotPdf`,
   …). Deren ganzen Körper in den Funktionsanker zu nehmen hieße, jede Beschriftung der Sicht zu
   sperren (Begründung s. `erheben`, eigenerBlock). Darum hier der Schlüssel selbst, nicht die
   Funktion. Jeder Name wird gegen den Quelltext gemessen: wird der Schlüssel nirgends mehr als
   `STRINGS.<name>` gelesen, bricht die Erhebung ab (umbenannt oder entfernt), statt eine Sperre
   festzuschreiben, die nichts mehr hält. Aufnahmekriterium: die Aussage betrifft Herkunft, Prüfung,
   Widerruf/Ablauf oder Vollständigkeit von etwas, das die Empfängerin nicht selbst prüfen kann.
   Bewusst NICHT hier: Leerzustände, Stand-/Versions-Beschriftungen, Link-Beschriftungen. */
const ZUSTAND_SCHLUESSEL_KERN_EXPLIZIT = Object.freeze([
  'angehoerigenUngeprueft', 'anfrageAbgelaufenHinweis', 'anfrageGeprueftBadge', 'anfrageUngeprueftBadge',
  'betreuungHerkunftText', 'vollmachtHerkunftText', 'k9VorlageHerkunftText',
  'exportZustandZurueckgehalten',
  'herkunftLizenzhinweis', 'herkunftPoweredBy',
  'krisenvorsorgeBedarfHerkunftAbgeleitet', 'krisenvorsorgeBedarfHerkunftUeberschrieben',
  'modulHerkunftUnbekanntHinweis', 'modulPruefstufeGeprueftZusatz', 'modulPruefstufeUngeprueftZusatz',
  'moduleUngeprueftHinweis', 'moduleUngeprueftZeile',
  'pdfHerkunftTeilauszugEins', 'pdfHerkunftTeilauszugMehrere', 'pdfHerkunftVersion', 'pdfHerkunftVollstaendig',
  'vereinbarungAnnahmeUngeprueft', 'vereinbarungAnnahmeUngeprueftText', 'vereinbarungStatusUngeprueft',
  'vorlagenAbgelaufenZusatz', 'vorlagenWiderrufenZusatz', 'zurueckgehaltenVorhanden',
]);

function funktionsIndex(quelle) {
  return [...quelle.matchAll(/^function ([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => ({ name: m[1], idx: m.index }));
}
function funktionAn(index, pos) {
  let letzte = '(top-level)';
  for (const f of index) { if (f.idx < pos) letzte = f.name; else break; }
  return letzte;
}
/* Der Körper endet an der ersten schliessenden Klammer AM ZEILENANFANG — so formatiert diese
   Datei jede Funktion auf oberster Ebene. Die naheliegendere Grenze „bis zur nächsten
   `function`-Zeile" trägt NICHT: zwischen zwei Funktionen stehen Konstanten und Pfeilfunktionen,
   und der Schnitt zog 45 fremde Zeilen mit — die Erhebung meldete darauf neun Export-
   Beschriftungen als Zusicherung. Gemessen, nicht vermutet: `vorlagenMarkeHTML` endet auf Zeile
   5071, die nächste `function`-Zeile steht auf 5116. */
function koerperVon(quelle, index, name) {
  const i = index.findIndex((f) => f.name === name);
  if (i < 0) return '';
  const von = index[i].idx;
  const ende = quelle.indexOf('\n}', von);
  if (ende < 0) throw new Error('Funktionsende von ' + name + ' nicht gefunden — der Anker traegt nicht mehr.');
  return quelle.slice(von, ende + 2);
}
function stringsSchluessel(text) {
  return [...text.matchAll(/STRINGS\.([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
}

function erheben(quelle) {
  const index = funktionsIndex(quelle);
  const zeilen = quelle.split('\n');
  const treffer = [];           // { klasse, funktion, zeile }
  const direkt = new Set();
  const satzbauer = new Set();

  zeilen.forEach((zeile, i) => {
    const klasse = ZUSTAND_KLASSEN.find((k) => zeile.includes('class="' + k) || zeile.includes("class=\\'" + k));
    if (!klasse) return;
    const pos = zeilen.slice(0, i).join('\n').length;
    const fn = funktionAn(index, pos);
    treffer.push({ klasse, funktion: fn, zeile: i + 1 });
    /* ZWEI FÄLLE, und der Unterschied ist strukturell, nicht nach Gefühl:

       · Eine Funktion, deren GANZE Aufgabe der Zustandsblock ist, erkennt man am Namen
         (`…BlockHTML`, `…MarkeHTML`). Dort zählt der ganze Körper — der Satz steht
         regelmäßig in der Zeile UNTER der Klasse, und die Satzbauer werden als Argument
         gerufen, nicht auf der Klassenzeile.

       · Steht die Klasse mitten in einer großen Render-Funktion, zählt nur die Zeile
         selbst. Der Körper enthielte dort die Beschriftungen der ganzen Sicht — jede
         davon mitzunehmen hiesse, die Sperre auf alles auszudehnen, was angezeigt wird. */
    const eigenerBlock = /(Block|Marke)HTML$/.test(fn);
    const bereich = eigenerBlock ? koerperVon(quelle, index, fn) : zeile;
    for (const k of stringsSchluessel(bereich)) direkt.add(k);
    for (const m of bereich.matchAll(/\b([a-zA-Z_][A-Za-z0-9_]*Satz)\s*\(/g)) {
      if (m[1] !== fn) satzbauer.add(m[1]);
    }
  });

  const ueberSatzbauer = new Set();
  for (const name of satzbauer) {
    for (const k of stringsSchluessel(koerperVon(quelle, index, name))) ueberSatzbauer.add(k);
  }

  const alle = new Set([...direkt, ...ueberSatzbauer]);
  return {
    treffer,
    satzbauer: [...satzbauer].sort(),
    direkt: [...direkt].sort(),
    ueberSatzbauer: [...ueberSatzbauer].sort(),
    schluessel: [...alle].sort(),
  };
}

/* KERN-ERHEBUNG (ZS2, 19.09.2026) — dieselbe Logik wie erheben() ab dem Punkt, wo dort der
   Funktionskörper gelesen wird (koerperVon, stringsSchluessel), nur mit einem anderen ANKER:
   statt "jede Zeile mit einer Zustands-Klasse" hier "jede benannte Funktion, ganz". Kein
   zweiter Scan-Algorithmus — der Unterschied ist nur, WELCHE Funktionen den Körper liefern.
   Ein Name, der nicht gefunden wird, ist ein FEHLSCHLAG (umbenannt oder entfernt), kein leerer
   Fund — der Aufrufer (main) bricht dann ab, statt eine geschrumpfte Sperre festzuschreiben. */
function erhebenAusFunktionen(quelle, funktionsNamen, explizit) {
  const index = funktionsIndex(quelle);
  const schluessel = new Set();
  const gelesen = new Set(stringsSchluessel(quelle));
  const explizitListe = Array.isArray(explizit) ? explizit : [];
  for (const k of explizitListe) if (gelesen.has(k)) schluessel.add(k);
  const gefunden = [];
  for (const name of funktionsNamen) {
    const koerper = koerperVon(quelle, index, name);
    if (!koerper) continue;
    gefunden.push(name);
    for (const k of stringsSchluessel(koerper)) schluessel.add(k);
  }
  return {
    funktionenGefunden: gefunden,
    funktionenFehlend: funktionsNamen.filter((n) => gefunden.indexOf(n) < 0),
    explizitFehlend: explizitListe.filter((k) => !gelesen.has(k)),
    schluessel: [...schluessel].sort(),
  };
}

/* GEGENPROBE zum Anker: jede Klasse, die die Warn-Farbvariablen der Anwendung trägt, muss in
   ZUSTAND_KLASSEN stehen. Ohne sie bewachte die Erhebung wieder nur die bekannten Orte. */
function gegenprobe(quelle) {
  const fehlend = [];
  for (const m of quelle.matchAll(/^\s*\.([a-z][a-z0-9-]*)[^{]*\{[^}]*var\(--warn-(?:bg|tinte)\)/gm)) {
    const klasse = m[1];
    if (!ZUSTAND_KLASSEN.some((k) => klasse === k || klasse.startsWith(k))) fehlend.push(klasse);
  }
  return [...new Set(fehlend)];
}

const BEGIN = '/* ZUSICHERUNGS-SCHLUESSEL:BEGIN — generierter Bereich (tools/zusicherungs-schluessel-erheben.js) */';
const ENDE = '/* ZUSICHERUNGS-SCHLUESSEL:END */';

/* Die erzeugte Region traegt den Kopf mit — wer die Liste liest, liest den Grund daneben, und
   die Grenze der Erhebung steht dort, wo sie gilt. */
function region(schluessel) {
  return [
    BEGIN,
    '/* ERZEUGT, nicht von Hand gepflegt — und der Grund dafür ist der Gegenstand selbst.',
    '   Eine von Hand gepflegte Sperrliste bewacht die Landkarte ihres Erbauers: sie schützt, woran er',
    '   gedacht hat, und schweigt über den Satz, der morgen dazukommt. Beim ersten Lauf standen sechs',
    '   `vorlage*`-Schlüssel in der erhobenen Menge, an die niemand gedacht hatte.',
    '',
    '   ABGELEITET AUS DEM BAU, nicht aus einem Urteil über Wortlaute: die Anwendung markiert ihre',
    '   Zustands-Aussagen im Markup selbst — sie stehen in Blöcken mit eigener Klasse',
    '   (`klartext-warn`, `herkunft-marke`, `stand-marke`, `vorlage-marke`, `logikmodul-marke`). Die',
    '   Klasse ist da, WEIL',
    '   der Block über den Zustand spricht.',
    '',
    '   DIE GRENZE DER ERHEBUNG, benannt statt verschwiegen: eine NEUE Zustands-Klasse fände sie nicht',
    '   von selbst. Dagegen steht ihre Gegenprobe — jede Klasse, die die Warn-Farbvariablen trägt, muss',
    '   im Anker stehen. Der Anker ist bewacht, nicht geglaubt. */',
    'const ZUSICHERUNGS_SCHLUESSEL_LESEN = Object.freeze([',
    ...schluessel.map((k) => "  '" + k + "',"),
    ']);',
    ENDE,
  ].join('\n');
}
function regionErsetzen(quelle, neu, datei, begin, ende) {
  begin = begin || BEGIN; ende = ende || ENDE;
  const a = quelle.indexOf(begin), b = quelle.indexOf(ende);
  if (a < 0 || b < 0) throw new Error('ZUSICHERUNGS-SCHLUESSEL-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ende.length);
}

/* RATSCHE (U2-ADR-336, dieselbe Bauform wie die Rückstands-Ratsche in U2-ADR-322, hier umgekehrt:
   die Menge darf wachsen, nie schrumpfen). Ohne sie schreibt `--schreiben` eine durch Umbenennung
   verkleinerte Erhebung klaglos fest — die Fehlermeldung der Gegenprobe empfiehlt genau diesen
   Lauf als Reparatur, und er ist der, der die Lücke dauerhaft macht. Ein Wegfall ist ein BEFUND
   (eine Zustands-Klasse ist verschwunden oder wurde umbenannt), kein Zustand, den man einfach
   fortschreibt. */
function alteSchluesselAus(quelle, begin, ende) {
  begin = begin || BEGIN; ende = ende || ENDE;
  const a = quelle.indexOf(begin), b = quelle.indexOf(ende);
  if (a < 0 || b < 0) return null;   // erster Lauf, noch kein Anker geschrieben
  return [...quelle.slice(a, b).matchAll(/^\s*'([^']+)',$/gm)].map((m) => m[1]);
}

/* KERN-REGION (ZS2, 19.09.2026) — eigene Marker, eigener Konstantenname, dieselbe Bauform wie
   region()/regionErsetzen()/alteSchluesselAus() oben, nur mit dem Funktions-Anker statt des
   Klassen-Ankers erklärt (s. Kopf-Kommentar an ZUSTAND_FUNKTIONEN_KERN). */
const BEGIN_KERN = '/* ZUSICHERUNGS-SCHLUESSEL-KERN:BEGIN — generierter Bereich (tools/zusicherungs-schluessel-erheben.js) */';
const ENDE_KERN = '/* ZUSICHERUNGS-SCHLUESSEL-KERN:END */';
function regionKern(schluessel) {
  return [
    BEGIN_KERN,
    '/* ERZEUGT, nicht von Hand gepflegt — dieselbe Begründung wie ZUSICHERUNGS_SCHLUESSEL_LESEN.',
    '',
    '   ANDERER ANKER ALS DORT (gemessen, 19.09.2026: der Kern trägt keine der fünf Zustands-Klassen',
    '   der Lese-App, keine `--warn-bg`/`--warn-tinte`-Variable — null Treffer für beide). Der Kern',
    '   kennzeichnet seinen Vertrauens-Zustand nicht im Markup, sondern in den SATZBAUERN selbst:',
    '   `modulHerkunftSatz`/`moduleStandSatz` (Bildschirm, U2-ADR-258/259) und',
    '   `modulHerkunftFussText`/`moduleStandFussText` (Fußzeile, dieselbe Aussage, kürzer). Die',
    '   Erhebungs-LOGIK ist dieselbe wie bei der Lese-App — Funktionskörper lesen, STRINGS.xxx darin',
    '   sammeln (erhebenAusFunktionen, wörtlich dieselben Helfer wie erheben()) — nur der Anker, WO',
    '   gesucht wird, unterscheidet sich, weil das Markup selbst sich unterscheidet.',
    '',
    '   DIE GRENZE DER ERHEBUNG: eine NEUE Vertrauens-Aussage außerhalb dieser vier Funktionen fände',
    '   sie nicht von selbst — es gibt hier keine CSS-Gegenprobe wie bei der Lese-App, weil es keine',
    '   Farbvariable gibt, an der sie anschlagen könnte. Die Ratsche unten (wachsen darf, schrumpfen',
    '   nur mit Klärung) UND der harte Abbruch, wenn eine der vier Funktionen nicht mehr gefunden',
    '   wird (main(), s. dort), sind der Ersatz dafür. */',
    'const ZUSICHERUNGS_SCHLUESSEL_KERN = Object.freeze([',
    ...schluessel.map((k) => "  '" + k + "',"),
    ']);',
    ENDE_KERN,
  ].join('\n');
}

function mainKern(a, datei) {
  const quelle = fs.readFileSync(datei, 'utf8');
  const r = erhebenAusFunktionen(quelle, ZUSTAND_FUNKTIONEN_KERN, ZUSTAND_SCHLUESSEL_KERN_EXPLIZIT);
  if (r.explizitFehlend.length) {
    console.error('zusicherungs-schluessel-kern: diese namentlich geführten Schlüssel (ZUSTAND_SCHLUESSEL_KERN_EXPLIZIT) '
      + 'werden in ' + path.basename(datei) + ' nirgends mehr als STRINGS.<name> gelesen: ' + r.explizitFehlend.join(', ')
      + '.\nUmbenannt oder entfernt? Erst den Anker nachziehen, dann erheben.');
    process.exit(1);
  }
  if (r.funktionenFehlend.length) {
    console.error('zusicherungs-schluessel-kern: der Anker ist unvollständig — diese Funktionen stehen '
      + 'in ZUSTAND_FUNKTIONEN_KERN, sind aber nicht mehr in ' + path.basename(datei) + ' zu finden: '
      + r.funktionenFehlend.join(', ') + '.\n'
      + 'Umbenannt oder entfernt? Erst den Anker nachziehen, dann erheben — sonst schreibt die Sperre '
      + 'eine Liste fest, die einen Satzbauer nicht mehr kennt.');
    process.exit(1);
  }
  if (a.includes('--schreiben') || a.includes('--check')) {
    const check = a.includes('--check');
    const alte = alteSchluesselAus(quelle, BEGIN_KERN, ENDE_KERN);
    const weggefallen = alte ? alte.filter((k) => !r.schluessel.includes(k)) : [];
    if (weggefallen.length) {
      console.error('zusicherungs-schluessel-kern: ' + weggefallen.length + ' Schlüssel fallen aus der '
        + 'Sperre — das ist ein BEFUND, kein Zustand, den man fortschreibt: ' + weggefallen.join(', ') + '.\n'
        + 'Erst klären, warum sie verschwinden, bevor die Liste schrumpft. Wachsen darf sie; schrumpfen '
        + 'nur mit einer benannten Klärung.');
      process.exit(1);
    }
    const neuQuelle = regionErsetzen(quelle, regionKern(r.schluessel), path.basename(datei), BEGIN_KERN, ENDE_KERN);
    const drift = neuQuelle !== quelle;
    if (drift && !check) fs.writeFileSync(datei, neuQuelle, 'utf8');
    if (drift && check) {
      console.error('zusicherungs-schluessel-kern: die Sperrliste in ' + path.basename(datei)
        + ' weicht von der Erhebung ab. Beheben mit: npm run zusicherungen:build');
      process.exit(1);
    }
    console.log('zusicherungs-schluessel-kern: ' + r.schluessel.length + ' Schlüssel — '
      + (drift ? 'geschrieben.' : 'nichts zu tun.'));
    return;
  }
  if (a.includes('--json')) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log('── Zusicherungs-Schlüssel (Kern), erhoben aus ' + path.basename(datei) + ' ──');
  console.log('');
  console.log('Funktionen im Anker: ' + r.funktionenGefunden.join(', '));
  console.log('');
  console.log('ERHOBENE SCHLÜSSEL (' + r.schluessel.length + '):');
  for (const k of r.schluessel) console.log('  ' + k);
}

function main() {
  const a = process.argv;
  const i = a.indexOf('--datei');
  const datei = (i >= 0 && a[i + 1]) ? path.resolve(a[i + 1]) : LESE;
  if (datei === KERN) { mainKern(a, datei); return; }
  const quelle = fs.readFileSync(datei, 'utf8');
  const r = erheben(quelle);
  const fehlend = gegenprobe(quelle);
  if (fehlend.length) {
    console.error('zusicherungs-schluessel: der Anker ist unvollständig — diese Klassen tragen die '
      + 'Warn-Farben, stehen aber nicht in ZUSTAND_KLASSEN: ' + fehlend.join(', ') + '.\n'
      + 'Erst den Anker nachziehen, dann erheben — sonst schreibt die Sperre eine Liste fest, die '
      + 'einen Zustandsblock nicht kennt.');
    process.exit(1);
  }
  if (a.includes('--schreiben') || a.includes('--check')) {
    const check = a.includes('--check');
    const alte = alteSchluesselAus(quelle);
    const weggefallen = alte ? alte.filter((k) => !r.schluessel.includes(k)) : [];
    if (weggefallen.length) {
      console.error('zusicherungs-schluessel: ' + weggefallen.length + ' Schlüssel fallen aus der Sperre — '
        + 'das ist ein BEFUND, kein Zustand, den man fortschreibt: ' + weggefallen.join(', ') + '.\n'
        + 'Erst klären, warum sie verschwinden (eine Zustands-Klasse umbenannt oder entfernt?), '
        + 'bevor die Liste schrumpft. Wachsen darf sie; schrumpfen nur mit einer benannten Klärung.');
      process.exit(1);
    }
    const neuQuelle = regionErsetzen(quelle, region(r.schluessel), path.basename(datei));
    const drift = neuQuelle !== quelle;
    if (drift && !check) fs.writeFileSync(datei, neuQuelle, 'utf8');
    if (drift && check) {
      console.error('zusicherungs-schluessel: die Sperrliste in ' + path.basename(datei)
        + ' weicht von der Erhebung ab. Beheben mit: npm run zusicherungen:build');
      process.exit(1);
    }
    console.log('zusicherungs-schluessel: ' + r.schluessel.length + ' Schlüssel — '
      + (drift ? 'geschrieben.' : 'nichts zu tun.'));
    return;
  }
  if (a.includes('--json')) { console.log(JSON.stringify({ ...r, ankerLuecken: fehlend }, null, 2)); return; }
  console.log('── Zusicherungs-Schlüssel, erhoben aus ' + path.basename(datei) + ' ──');
  console.log('');
  console.log('Fundstellen (Klasse · Funktion · Zeile):');
  for (const t of r.treffer) console.log('  ' + t.klasse.padEnd(16) + t.funktion.padEnd(24) + ':' + t.zeile);
  console.log('');
  console.log('Satzbauer einen Sprung weiter: ' + (r.satzbauer.join(', ') || '—'));
  console.log('');
  console.log('ERHOBENE SCHLÜSSEL (' + r.schluessel.length + '):');
  for (const k of r.schluessel) console.log('  ' + k);
  console.log('');
  console.log('Gegenprobe zum Anker — Warn-Klassen ausserhalb von ZUSTAND_KLASSEN: '
    + (fehlend.length ? fehlend.join(', ') + '  ← ANKER UNVOLLSTÄNDIG' : 'keine'));
}

if (require.main === module) main();
module.exports = {
  erheben, gegenprobe, region, regionErsetzen, ZUSTAND_KLASSEN, BEGIN, ENDE, LESE,
  erhebenAusFunktionen, regionKern, ZUSTAND_FUNKTIONEN_KERN, ZUSTAND_SCHLUESSEL_KERN_EXPLIZIT, BEGIN_KERN, ENDE_KERN, KERN,
};
