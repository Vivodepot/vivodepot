#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   auszuege-register-pruefen.js — jeder Ab-Werk-Auszug steht im Register, verschoben oder offen (21.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS. Der Schnitt S5 galt als erledigt, weil sein Commit einen Auszug beim Namen nannte und der Name
   stimmte. Der zweite Auszug (der Erbschein) blieb in AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN stehen, 7,4 KiB
   deutscher Sätze, und niemand sah es: kein Register sagt, wie viele Auszüge es gibt. Die Zahl stand die
   ganze Zeit im Kern, aber in einem KOMMENTAR (vivodepot.html, „die zwei PRODUKTUNABHÄNGIGEN Ab-Werk-
   Auszüge"). Eine Zahl, die in einem Kommentar steht, verhindert nichts.

   WAS GEPRÜFT WIRD. Die Wahrheit ist die Liste `QUELLEN` von tools/ab-werk-logikmodul-auszuege-kern-
   schreiben.js: die Fixtures, die der Erzeuger in die Kern-Region schreibt. tools/auszuege-register-
   grundlinie.json führt je Auszug EINE Zeile:
     offen        der Auszug steht in QUELLEN und im Kern (Region AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN), mit
                  dem Posten, der ihn verschiebt. Die Zahl der offenen (`offenDeckel`) ist exakt und kann
                  nur sinken.
     verschoben   der Auszug steht NICHT mehr in QUELLEN und nicht als Modul in der Region; `ort` sagt, wo
                  er heute lebt, und seine Fixture gibt es noch.
   Rot ist: ein Eintrag in QUELLEN ohne Zeile (ein dritter Auszug, der unbemerkt dazukommt), eine Zeile,
   deren Status nicht zur Liste und zum Kern passt (offen, aber nicht mehr im Kern: der Verschiebeposten
   ist fertig, die Zeile gehört auf verschoben; verschoben, aber noch da: der Posten ist nicht fertig),
   eine Zahl der Offenen ungleich dem Deckel.

   DER BOOT-RIEGEL IST EINE EIGENSCHAFT DER ZEILE, nicht der Byte-Zahl. `_abWerkAuszugPflicht('<id>')` läuft im
   Kern beim Start (top-level) und WIRFT, wenn der Auszug in der Region fehlt: mit einer geleerten Auszugs-Region
   startet der Kern nicht. Jede Zeile trägt `bootRiegel` (true/false) und der Prüfer vergleicht es mit dem Kern
   (steht der Aufruf mit dieser id dort?). Eine Zeile "offen" mit Riegel wird also nicht durch Leeren der Region
   verschoben, sondern erst, wenn auch der Riegel weg ist; eine "verschoben"e Zeile trägt keinen mehr.

   DIE KOMMENTAR-ZAHL ist NICHT der Sollwert. Der Prüfer liest im Kern Sätze der Form „die zwei
   PRODUKTUNABHÄNGIGEN Ab-Werk-Auszüge" und vergleicht die Zahl mit der Länge von QUELLEN. Weicht sie ab,
   ist die Abweichung der Fund: sie wird bei jedem Lauf GENANNT (nicht rot, nicht angeglichen); wer den
   Kommentar berichtigt, tut es im Kern, nicht hier. Ein Prüfer, der den Kommentar als Sollwert nähme, hätte
   dieselbe Landkarte wie der Fehler.

   GRENZE. Er zählt Auszüge der Kern-Region. Ein Auszug, der an einer ANDEREN Stelle im Kern stünde, ist
   ihm unbekannt; das deckt der Sollwert der Marker-Regionen (tools/geruest-waechter-pruefen.js) für
   satzförmigen Inhalt ab.

   Aufruf: node tools/auszuege-register-pruefen.js     Exit 0 = grün, 1 = Fund
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE_PFAD = path.join(__dirname, 'auszuege-register-grundlinie.json');
const REGION = 'AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN';
const ZAHLWORTE = { ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8 };

/** Der Inhalt der Region `NAME:BEGIN` … `NAME:END` im Kern, oder null. */
function regionText(kern, name) {
  const a = kern.indexOf(name + ':BEGIN');
  const b = kern.indexOf(name + ':END');
  return a >= 0 && b > a ? kern.slice(a, b) : null;
}

/** Steht ein Modul mit dieser id als Objekt in der Region? (`"id": "<id>"`, wie der Erzeuger es schreibt) */
function stehtInRegion(region, id) {
  return new RegExp('"id":\\s*"' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"').test(region);
}

/** Ruft der Kern beim Start `_abWerkAuszugPflicht('<id>')` auf (wirft, wenn der Auszug in der Region fehlt)? */
function bootRiegelImKern(kern, id) {
  return kern.includes("_abWerkAuszugPflicht('" + id + "')");
}

/** Sätze im Kern der Form „die zwei PRODUKTUNABHÄNGIGEN Ab-Werk-Auszüge": Zeile und genannte Zahl. */
function kommentarZahlen(kern) {
  const treffer = [];
  const muster = /die\s+(ein|eine|zwei|drei|vier|fünf|sechs|sieben|acht|\d+)\s+PRODUKTUNABHÄNGIGEN\s+Ab-Werk-Auszüge/gi;
  let m;
  while ((m = muster.exec(kern)) !== null) {
    const wort = m[1].toLowerCase();
    const zahl = /^\d+$/.test(wort) ? Number(wort) : ZAHLWORTE[wort];
    treffer.push({ zeile: kern.slice(0, m.index).split('\n').length, wort: m[1], zahl });
  }
  return treffer;
}

/**
 * @param {object} p
 * @param {string[]} p.quellenIds     ids der Fixtures aus QUELLEN des Erzeugers
 * @param {object} p.register         { auszuege: [{id, fixture, status, posten|ort}], offenDeckel }
 * @param {string|null} p.region      Text der Kern-Region oder null
 * @param {(pfad:string)=>boolean} p.fixtureVorhanden
 * @param {string|null} [p.kern]      Kern-Text; ohne ihn entfällt der Vergleich des Boot-Riegels
 * @returns {{fehler: string[]}}
 */
function pruefen({ quellenIds, register, region, fixtureVorhanden, kern = null }) {
  const fehler = [];
  const zeilen = Array.isArray(register.auszuege) ? register.auszuege : [];
  if (region == null) fehler.push('Region ' + REGION + ' fehlt im Kern — Auszüge nicht prüfbar.');
  const nachId = new Map();
  for (const z of zeilen) {
    if (nachId.has(z.id)) fehler.push(z.id + ': zweimal im Register.');
    nachId.set(z.id, z);
  }
  for (const id of quellenIds) {
    const z = nachId.get(id);
    if (!z) fehler.push(id + ': steht in QUELLEN des Erzeugers, aber nicht im Register — ein Auszug ohne Zeile ist der Fehler, den dieses Register verhindert.');
    else if (z.status !== 'offen') fehler.push(id + ': steht in QUELLEN, das Register sagt "' + z.status + '" — solange der Erzeuger ihn schreibt, ist er offen.');
  }
  for (const z of zeilen) {
    const wo = z.id + ' (' + z.status + ')';
    if (!['offen', 'verschoben'].includes(z.status)) { fehler.push(wo + ': Status unbekannt (offen, verschoben).'); continue; }
    if (typeof z.fixture !== 'string' || !fixtureVorhanden(z.fixture)) fehler.push(wo + ': die Fixture ' + z.fixture + ' gibt es nicht.');
    const imKern = region != null && stehtInRegion(region, z.id);
    if (typeof z.bootRiegel !== 'boolean') fehler.push(wo + ': ohne bootRiegel (true/false) — ein Auszug mit Boot-Riegel lässt sich nicht durch Leeren der Region verschieben.');
    else if (kern != null && z.bootRiegel !== bootRiegelImKern(kern, z.id)) {
      fehler.push(wo + ': bootRiegel sagt ' + z.bootRiegel + ', der Kern ' + (z.bootRiegel ? 'ruft _abWerkAuszugPflicht nicht mehr mit dieser id auf' : 'ruft _abWerkAuszugPflicht mit dieser id auf')
        + ' — Zeile nachziehen.');
    }
    if (z.status === 'offen') {
      if (typeof z.posten !== 'string' || z.posten.trim().length < 2) fehler.push(wo + ': ohne Posten, der ihn verschiebt.');
      if (!quellenIds.includes(z.id)) fehler.push(wo + ': der Erzeuger schreibt ihn nicht mehr — Zeile auf "verschoben" umstellen, wenn der Posten fertig ist.');
      if (region != null && !imKern) fehler.push(wo + ': steht nicht mehr in der Kern-Region — Zeile auf "verschoben" umstellen.');
    } else {
      if (typeof z.ort !== 'string' || z.ort.trim().length < 20) fehler.push(wo + ': ohne Ort, an dem er heute lebt (mindestens 20 Zeichen).');
      if (quellenIds.includes(z.id)) fehler.push(wo + ': steht noch in QUELLEN des Erzeugers — der Posten ist nicht fertig.');
      if (imKern) fehler.push(wo + ': steht noch als Modul in der Kern-Region — der Posten ist nicht fertig.');
    }
  }
  const offene = zeilen.filter((z) => z.status === 'offen').length;
  if (!Number.isInteger(register.offenDeckel)) fehler.push('offenDeckel fehlt.');
  else if (offene > register.offenDeckel) fehler.push('offen: ' + offene + ' Auszüge bei einem Deckel von ' + register.offenDeckel + ' — die Zahl kann nur sinken.');
  else if (offene < register.offenDeckel) fehler.push('offen: ' + offene + ' Auszüge, Deckel ' + register.offenDeckel + ' — Deckel senken.');
  return { fehler };
}

function main() {
  const schreiber = require('./ab-werk-logikmodul-auszuege-kern-schreiben.js');
  const register = JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'));
  const kern = fs.readFileSync(schreiber.KERN, 'utf8');
  const quellenIds = schreiber.QUELLEN.map((q) => JSON.parse(fs.readFileSync(q, 'utf8')).id);
  const r = pruefen({
    quellenIds, register, region: regionText(kern, REGION), kern,
    fixtureVorhanden: (p) => fs.existsSync(path.join(REPO, p)),
  });
  console.log('[auszuege-register] QUELLEN: ' + quellenIds.length + ' (' + quellenIds.join(', ') + '); Register: '
    + register.auszuege.filter((z) => z.status === 'offen').length + ' offen, ' + register.auszuege.filter((z) => z.status === 'verschoben').length + ' verschoben.');
  for (const k of kommentarZahlen(kern)) {
    if (k.zahl !== quellenIds.length) {
      console.log('[auszuege-register] ABWEICHUNG — Kommentar im Kern (Zeile ' + k.zeile + ') nennt "' + k.wort + '" Auszüge, QUELLEN führt ' + quellenIds.length
        + '. Gemeldet, nicht angeglichen: den Kommentar berichtigt, wer den Kern anfasst.');
    }
  }
  if (r.fehler.length) {
    console.error('[auszuege-register] ROT:');
    for (const f of r.fehler) console.error('  - ' + f);
    process.exitCode = 1;
    return;
  }
  console.log('[auszuege-register] OK — jeder Auszug steht im Register.');
}

if (require.main === module) main();

module.exports = { pruefen, regionText, stehtInRegion, kommentarZahlen, bootRiegelImKern, GRUNDLINIE_PFAD, REGION };
