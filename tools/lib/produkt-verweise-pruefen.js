'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   produkt-verweise-pruefen — jeder Verweis eines gebauten Produkts löst auf (07.10.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Befund PRO-ASSISTENT-ZIEL-OHNE-BEREICH: der Konfektionierer setzte Module zusammen, ohne zu prüfen, ob sie zueinander
   passen. Pro trug zwei Assistenten (pvwiz/kiwiz), deren Zielbereich `advanceCare` es nicht führt; „Fertig“ führte auf eine
   leere Seite ohne Markierung. Diese Wache prüft die KLASSE: jeder Verweis jedes Moduls im fertigen Produkt — Assistenten-Ziel,
   `sektor` eines Auszugs, Dokuments oder einer Vorlage, Listen- und Feld-Kennung darin — zeigt auf etwas, das das Produkt
   trägt. Gilt für jedes Produkt, auch White Label und künftige.

   Die Bereiche des Produkts sind die der gebackenen `bereich`-Module (seit dem Schnitt kommen auch die dreizehn nativen über
   die Ab-Werk-Region). Was heute schon ins Leere zeigt, steht einzeln in tools/produkt-verweise-grundlinie.json („Ziel fehlt,
   Entscheidung offen“); die Liste darf nur sinken. Ein neuer Verweis ins Leere ist rot.

   Aufrufer: der Auslieferungsweg und tools/vier-produkte-erzeugen.js (bricht den Bau ab), Probe
   tests/produkt-verweise-aufloesen.test.js (am geladenen Kern, mit den Verweisen, die nur der Kern kennt).
   ═════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const GRUNDLINIE_PFAD = path.join(__dirname, '..', 'produkt-verweise-grundlinie.json');

/* Die Bereiche eines Produkts aus seinen gebackenen Modulen: Kennung → Definition. */
function bereicheAusModulen(roheModule) {
  const bereiche = new Map();
  for (const m of roheModule || []) {
    if (m && m.modulTyp === 'bereich' && m.bereiche && typeof m.bereiche === 'object') {
      for (const [id, def] of Object.entries(m.bereiche)) if (!bereiche.has(id)) bereiche.set(id, def);
    }
  }
  return bereiche;
}

/* Jeder Verweis in einem Modul: ein Objekt mit `sektor` (Zeichenkette), dazu `liste`/`listeId`/`feld`, falls genannt. */
function verweiseSammeln(roh, modulName) {
  const raus = [];
  const gehe = (o, pfad) => {
    if (Array.isArray(o)) { o.forEach((x, i) => gehe(x, pfad + '[' + i + ']')); return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.sektor === 'string') {
      raus.push({ modul: modulName, pfad: pfad || '.', sektor: o.sektor,
        liste: typeof o.liste === 'string' ? o.liste : (typeof o.listeId === 'string' ? o.listeId : null),
        feld: typeof o.feld === 'string' ? o.feld : null });
    }
    for (const [k, v] of Object.entries(o)) gehe(v, pfad + '.' + k);
  };
  if (roh && roh.modulTyp !== 'bereich') gehe(roh, '');
  return raus;
}

function _feldIds(def) {
  const ids = new Set();
  for (const s of (def && Array.isArray(def.sektionen)) ? def.sektionen : []) {
    for (const f of (s && Array.isArray(s.felder)) ? s.felder : []) if (f && typeof f.id === 'string') ids.add(f.id);
  }
  return ids;
}

/* Prüft Verweise gegen die Bereiche. Liefert je Verstoß einen stabilen Schlüssel „produkt|modul|pfad|art:ziel“. */
function verweisePruefen({ produkt, verweise, bereiche }) {
  const verstoesse = [];
  for (const v of verweise) {
    const def = bereiche.get(v.sektor);
    if (!def) { verstoesse.push({ produkt, modul: v.modul, pfad: v.pfad, art: 'bereich-fehlt', ziel: v.sektor }); continue; }
    const felder = _feldIds(def);
    if (v.liste && felder.size && !felder.has(v.liste)) verstoesse.push({ produkt, modul: v.modul, pfad: v.pfad, art: 'liste-fehlt', ziel: v.sektor + '.' + v.liste });
    if (v.feld && felder.size && !felder.has(v.feld)) verstoesse.push({ produkt, modul: v.modul, pfad: v.pfad, art: 'feld-fehlt', ziel: v.sektor + '.' + v.feld });
  }
  return verstoesse;
}

const schluessel = (v) => [v.produkt, v.modul, v.pfad, v.art + ':' + v.ziel].join('|');

function grundlinieLesen(pfad) {
  const g = JSON.parse(fs.readFileSync(pfad || GRUNDLINIE_PFAD, 'utf8'));
  return new Set((g.eintraege || []).map(schluessel));
}

/* Für den Bau: Verweise der gebackenen Module eines Produkts prüfen; jeder Verstoß, der nicht in der Grundlinie steht, wirft. */
/* `module`: die gebackenen Module als { roh, basisname } (dieselbe Form wie in produktTextErzeugen). */
function produktVerweiseMessen(produkt, module) {
  const roh = (module || []).map((m) => m.roh);
  const verweise = [];
  for (const m of module || []) verweise.push(...verweiseSammeln(m.roh, m.basisname));
  return verweisePruefen({ produkt, verweise, bereiche: bereicheAusModulen(roh) });
}
function produktVerweiseSichern(produkt, module, opts = {}) {
  const verstoesse = produktVerweiseMessen(produkt, module);
  const erlaubt = opts.grundlinie || grundlinieLesen(opts.grundlinienPfad);
  const neu = verstoesse.filter((v) => !erlaubt.has(schluessel(v)));
  if (neu.length) {
    throw new Error('Produkt „' + produkt + '“: ' + neu.length + ' Verweis(e) ins Leere — der Bau bricht ab (tools/lib/produkt-verweise-pruefen.js):\n  '
      + neu.map(schluessel).join('\n  '));
  }
  return verstoesse;
}

module.exports = { bereicheAusModulen, verweiseSammeln, verweisePruefen, schluessel, grundlinieLesen, produktVerweiseMessen, produktVerweiseSichern, GRUNDLINIE_PFAD };
