#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Zitierte Beschriftung — kein Text zitiert die Beschriftung eines anderen wörtlich (19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER FUND: der Rückweg-Hinweis („So kommen Sie später wieder hinein“) verwies den Erstnutzer auf den Knopf „Schon ein Vivodepot? Datei öffnen“,
   der Startknopf hieß da schon „Schon ein Depot? Datei öffnen“. Der Satz trug die Beschriftung als KOPIE in Anführungszeichen; beim Umbenennen des Knopfs
   blieb sie stehen. Der Test, der das absichern sollte, hielt die Kopie gegen ein eingetipptes Literal. Der Fix setzt die Beschriftung über einen Platzhalter
   (`{knopf}`) aus dem echten Knopf ein — eine Quelle statt Kopien.

   WAS DIESER WÄCHTER MISST (Klasse, nicht Einzelfall): in tools/textsatz-de-modul.json und tools/textsatz-en-modul.json jeder Text, der in Anführungszeichen
   (‚…’ „…“ “…” ‘…’ »…« ‹…›) einen Abschnitt trägt, der — bis auf `{marke}`/„Vivodepot“/„Depot“ (die Umbenennung, die den Fund auslöste, ist genau so eine) —
   mit der Beschriftung eines ANDEREN Textes übereinstimmt (kurze Texte bis 70 Zeichen, das Zitat mindestens zwei Wörter). Gemessen werden Deutsch und Englisch.
   Sie gehören über einen Platzhalter aufgelöst, nicht abgeschrieben: `{beschriftung:schluessel}` (aufgelöst beim Lesen in textLesen, aktive Sprache). Zweite Prüfung:
   jeder Platzhalter zeigt auf einen Schlüssel, den es gibt.

   RATSCHE (Positivliste in der Grundlinie, Konvention wie bei den anderen `*-grundlinie.json`): die heutigen Funde stehen als Paare Zitierender → Zitierter,
   je Sprache. Rot bei einem NEUEN Paar oder einer steigenden Zahl; ein Rückgang ist grün (dann wird die Grundlinie nachgezogen). Grenzen, benannt: nur Texte
   der beiden Textsatz-Module (nicht Kommentare, nicht Code-Strings); ein Zitat, das gar keiner Beschriftung entspricht (etwa ein veraltetes), findet der
   Wächter nicht — er findet die Kopie, die noch stimmt, und die, die nur bis auf die Marke abweicht.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const QUELLEN = { de: path.join(__dirname, 'textsatz-de-modul.json'), en: path.join(__dirname, 'textsatz-en-modul.json') };
const GRUNDLINIE_PFAD = path.join(__dirname, 'zitierte-beschriftung-grundlinie.json');
const MAX_BESCHRIFTUNG = 70;
const MIN_WOERTER = 2;
// Bausteine getrennt gehalten, damit die Zeichenklassen lesbar bleiben.
const AUF = '‚„“‘»‹';
const ZU = '’“”‘«›';
const ZITAT = new RegExp('[' + AUF + ']([^' + AUF + ZU + ']{4,80})[' + ZU + ']', 'g');

function normal(s) {
  return String(s).replace(/\{marke\}|Vivodepot|Depot|depot/g, '§').replace(/\s+/g, ' ').trim().toLowerCase();
}

function texte(pfad) {
  const j = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  const t = j.texte || j.strings || j;
  const aus = {};
  for (const [k, v] of Object.entries(t)) if (k.startsWith('strings:') && typeof v === 'string') aus[k.slice('strings:'.length).replace(/\.text$/, '')] = v;
  return aus;
}

/* Funde einer Textmenge: { zitierender, zitierter, zitat }. */
function zitate(t) {
  const beschriftungen = new Map();
  for (const [k, v] of Object.entries(t)) {
    if (v.length > MAX_BESCHRIFTUNG) continue;
    const n = normal(v);
    if (!beschriftungen.has(n)) beschriftungen.set(n, []);
    beschriftungen.get(n).push(k);
  }
  const funde = [];
  for (const [k, v] of Object.entries(t)) {
    ZITAT.lastIndex = 0;
    let m;
    while ((m = ZITAT.exec(v))) {
      const zit = m[1].trim();
      if (zit.split(/\s+/).length < MIN_WOERTER) continue;
      const treffer = (beschriftungen.get(normal(zit)) || []).filter((z) => z !== k);
      for (const z of treffer) funde.push({ zitierender: k, zitierter: z, zitat: zit });
    }
  }
  return funde;
}

/* Platzhalter `{beschriftung:schluessel}`, deren Schlüssel es in der Textmenge nicht gibt (Tippfehler, gelöschter Text): sie blieben im Satz stehen. */
function platzhalterLuecken(t) {
  const luecken = [];
  for (const [k, v] of Object.entries(t)) {
    for (const m of v.matchAll(/\{beschriftung:([A-Za-z0-9_]+)\}/g)) if (!(m[1] in t)) luecken.push(k + ' → ' + m[1]);
  }
  return luecken;
}

function messen() {
  const je = {};
  for (const [sprache, pfad] of Object.entries(QUELLEN)) {
    je[sprache] = zitate(texte(pfad)).map((f) => f.zitierender + ' → ' + f.zitierter).sort();
  }
  return { summe: { de: je.de.length, en: je.en.length }, paare: je };
}

function grundlinieLesen() { return JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8')); }

function urteil(gemessen, grundlinie) {
  const befunde = [];
  for (const sprache of ['de', 'en']) {
    const bekannt = new Set((grundlinie.paare || {})[sprache] || []);
    for (const p of gemessen.paare[sprache]) {
      if (!bekannt.has(p)) befunde.push(sprache.toUpperCase() + ' NEU: „' + p + '“ zitiert eine Beschriftung wörtlich — über einen Platzhalter aus dem echten Knopf einsetzen (Vorbild: wiedereinstiegHinweisText mit {knopf}), nicht abschreiben');
    }
    if (gemessen.summe[sprache] > ((grundlinie.summe || {})[sprache] || 0)) befunde.push(sprache.toUpperCase() + ': Zahl steigt: ' + grundlinie.summe[sprache] + ' → ' + gemessen.summe[sprache]);
  }
  return { gruen: befunde.length === 0, befunde };
}

if (require.main === module) {
  const gemessen = messen();
  if (process.argv.includes('--grundlinie-schreiben')) {
    fs.writeFileSync(GRUNDLINIE_PFAD, JSON.stringify({ stand: '19.09.2026', summe: gemessen.summe, paare: gemessen.paare }, null, 2) + '\n');
    console.log('Grundlinie geschrieben: DE ' + gemessen.summe.de + ', EN ' + gemessen.summe.en + ' Zitate.');
  } else {
    const u = urteil(gemessen, grundlinieLesen());
    console.log(u.gruen ? 'Zitierte Beschriftung grün: DE ' + gemessen.summe.de + ', EN ' + gemessen.summe.en + ' (Grundlinie).' : u.befunde.join('\n'));
    process.exit(u.gruen ? 0 : 1);
  }
}
module.exports = { normal, texte, zitate, platzhalterLuecken, messen, urteil, grundlinieLesen, QUELLEN };
