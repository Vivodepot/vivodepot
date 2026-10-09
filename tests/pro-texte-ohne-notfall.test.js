'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Pro-Texte ohne Notfall und Ausfall (U2-ADR-243 Teil 2, 02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Anlässe von Pro sind Vertretung, Übergabe, Einarbeitung und Nachfolge — nie Notfall oder Ausfall.
   Der Wächter liest jede sichtbare Zeichenkette, die Pro selbst mitbringt:
   - die Pro-eigenen Moduldateien in den Rezepten pro-de/pro-en (Dateiname beginnt mit `vivodepot-pro-`),
   - die Pro-Kennungen in den beiden Sprachmodulen (`pro-…`, `situation:pro-…`, `anlass:pro-…`).
   Ausgenommen sind nur Kennungen, die niemand sieht: die Schlüssel `id`, `klasse`, `knopfAttr`, und `feld`/`quelle`/`sektor`,
   wo sie eine Zeichenkette sind (ein Verweis auf ein Feld; ein eigenes Feld-Objekt mit Beschriftung bleibt geprüft).
   Der geteilte Produktwortschatz (Notfall-Ansicht, Notfallpass …) ist Funktion von Privat, kein Anlass, und
   steht nicht im Prüfumfang.

   AUSNAHMEN ist eine Ratsche: sie darf nur schrumpfen. Jede Zeile nennt den Posten, der sie auflöst.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const VP = require('../tools/lib/vier-produkte.js');

const MUSTER = /notfall|ausf[aä]ll|emergenc|unavailab/i;
const UNSICHTBAR = new Set(['id', 'klasse', 'knopfAttr']);
const VERWEIS = new Set(['feld', 'quelle', 'sektor']);
const AUSNAHMEN = Object.freeze({});

/* Alle Zeichenketten-Werte eines JSON-Werts mit Pfad, ohne die unsichtbaren Schlüssel. */
function sichtbareTexte(wert, pfad, aus) {
  if (typeof wert === 'string') { aus.push({ pfad, text: wert }); return aus; }
  if (Array.isArray(wert)) { wert.forEach((w, i) => sichtbareTexte(w, pfad + '[' + i + ']', aus)); return aus; }
  if (wert && typeof wert === 'object') {
    for (const [k, w] of Object.entries(wert)) {
      if (UNSICHTBAR.has(k) || (VERWEIS.has(k) && typeof w === 'string')) continue;
      sichtbareTexte(w, pfad + '.' + k, aus);
    }
  }
  return aus;
}
function treffer(texte) {
  return texte.filter((t) => MUSTER.test(t.text)).map((t) => t.pfad);
}

function proEigeneDateien() {
  const dateien = new Set();
  for (const p of VP.PRODUKTE.filter((x) => x.slug.startsWith('pro-'))) {
    for (const f of VP.modulDateienFuer(p)) if (path.basename(f).startsWith('vivodepot-pro-')) dateien.add(f);
  }
  // Das Notar-Template ruht seit 07.10.2026 (Nachtrag U2-ADR-427) und kehrt mit der Berufsmodul-Wahl zurück (ADR 489):
  // es bleibt im Prüfumfang, damit es ohne Notfall-Wörter zurückkommt.
  dateien.add(VP.PRO_NOTAR_TEMPLATE_PFAD_DE); dateien.add(VP.PRO_NOTAR_TEMPLATE_PFAD_EN);
  return [...dateien].sort();
}
const PRO_KENNUNG = /^(pro-|situation:pro-|anlass:pro-)/;

function alleTreffer() {
  const funde = [];
  for (const f of proEigeneDateien()) {
    for (const p of treffer(sichtbareTexte(JSON.parse(fs.readFileSync(f, 'utf8')), '', []))) funde.push(path.basename(f) + p);
  }
  for (const f of [VP.DE_MODUL_PFAD, VP.EN_MODUL_PFAD]) {
    const texte = JSON.parse(fs.readFileSync(f, 'utf8')).texte;
    for (const [k, v] of Object.entries(texte)) {
      if (PRO_KENNUNG.test(k) && treffer(sichtbareTexte(v, '', [])).length) funde.push(path.basename(f) + '#' + k);
    }
  }
  return funde;
}

test('[Prüfumfang] die Pro-eigenen Dateien sind gefunden: Logikmodule, Notar-Template, Situationen, sechs Bereiche, je Sprache', () => {
  const namen = proEigeneDateien().map((f) => path.basename(f));
  assert.ok(namen.includes('vivodepot-pro-situationen-de.json') && namen.includes('vivodepot-pro-situationen-en.json'));
  assert.ok(namen.includes('vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul.json'));
  assert.ok(namen.includes('vivodepot-pro-notar-kanzleivertretung-logikmodul-en.json'));
  assert.equal(namen.filter((n) => n.startsWith('vivodepot-pro-') && VP.BEREICH_TEMPLATE_PFADE_PRO_6.some((p) => path.basename(p) === n)).length, 6);
});

test('[Wächter] keine Pro-Zeichenkette spricht von Notfall oder Ausfall, außer den benannten Ausnahmen', () => {
  const funde = alleTreffer();
  assert.deepEqual(funde.filter((f) => !AUSNAHMEN[f]), []);
});

test('[Ratsche] jede Ausnahme trifft noch — eine aufgelöste wird gestrichen', () => {
  const funde = new Set(alleTreffer());
  assert.deepEqual(Object.keys(AUSNAHMEN).filter((a) => !funde.has(a)), []);
});

test('[Positivkontrolle] ein eingepflanzter Notfall, ein Ausfall, ein emergency werden gefunden; Kennungen nicht', () => {
  const modul = { id: 'x-notfallmappe', klasse: 'x-notfallmappe-dok', titel: 'Vertretung', abschnitte: [{ titel: 'Teil C — Notfall' }],
    dokAusgabe: { knopfAttr: 'x-notfall', toolbarHinweis: 'wenn die Inhaberin ausfällt' }, en: ['Part C — Emergency'],
    zuege: [{ quelle: 'x', feld: 'tpl_im_ausfall' }, { feld: { id: 'f', label: 'Im Notfall' } }] };
  assert.deepEqual(treffer(sichtbareTexte(modul, '', [])), ['.abschnitte[0].titel', '.dokAusgabe.toolbarHinweis', '.en[0]', '.zuege[1].feld.label']);
});
