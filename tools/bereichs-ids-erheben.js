#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Erhebung: wo setzt der Bestand eine bestimmte BEREICHS-ID voraus?
   ────────────────────────────────────────────────────────────────────────
   Entstanden für Glied 2 der Abendkette vom 17.08.2026. Der Grund, warum
   dieses Werkzeug im Repo steht und nicht in der internen Ablage: A286 hat dieselben
   Zahlen von Hand gegen HEAD 08cff01 erhoben, und der Auftrag verlangt sie
   vor dem Bau NEU — eine Handmessung, die man wiederholen muss, ist ein
   Werkzeug, das noch nicht geschrieben wurde.

   ZÄHLGEGENSTAND (§7, Regel 3): Vorkommen einer Sektor-ID als STRING-LITERAL
   in einfachen Anführungszeichen ('gesundheit'), getrennt nach
   „innerhalb des SEKTOREN-Blocks" und „außerhalb". Die Zahlen sind darum
   nicht mit einer Suche nach dem blossen Wort vergleichbar.

   DER TEMPLATE-GENERATOR IST FÜR grep BINÄR (NUL-Byte, s. Fund vom 17.08.).
   Dieses Werkzeug liest die Dateien selbst und ist davon nicht betroffen —
   das ist einer der Gründe, warum die Messung nicht aus der Shell kommt.

   Aufruf:
     node tools/bereichs-ids-erheben.js              → volle Erhebung
     node tools/bereichs-ids-erheben.js --json       → maschinenlesbar
     node tools/bereichs-ids-erheben.js --listen     → nur die Bereichslisten
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.resolve(__dirname, '..');
const P = (...t) => path.join(WURZEL, ...t);

const KERN = P('vivodepot.html');
const LESE = P('vivodepot-lesen.html');
const GENERATOR = P('vivodepot-studio.html');
const ISSUER = P('vivodepot-vc-issuer.html');
const SCHEMA_DATEI = P('docs', 'template-generator', 'submission-schema.json');

function lies(p) { return fs.readFileSync(p, 'utf8'); }

/* ── Die kanonische Liste kommt aus dem Kern, nicht aus einer Konstante hier ──
   Ein Werkzeug, das seine eigene Bereichsliste mitbringt, wäre die N+1-te
   Kopie — genau das, wogegen dieser Auftrag gebaut wird. */
/* Das eingebettete Buendel, oder null, wenn die Datei keins traegt (die Lese-App). Faellt das
   Parsen, WIRFT es — ein still uebersprungenes Buendel liesse den Erheber auf den leeren
   Quelltext-Block zurueckfallen und dort nichts finden: grün ohne Gegenstand. */
function _buendelAusQuelle(quelle) {
  const m = /(?:const|let)\s+BUERGERMODUL_BUENDEL = JSON\.parse\('/.exec(quelle);
  if (!m) return null;
  const auf = m.index + m[0].length;
  const zu = quelle.indexOf("');", auf);
  if (zu < 0) throw new Error('BUERGERMODUL_BUENDEL: Ende des Literals nicht gefunden');
  const roh = quelle.slice(auf, zu);
  if (roh === 'null' || roh === '') return null;
  try {
    return JSON.parse(roh.replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  } catch (e) {
    throw new Error('BUERGERMODUL_BUENDEL laesst sich nicht lesen: ' + e.message);
  }
}

function sektorenBlockGrenzen(quelle) {
  /* U2-ADR-319: `SEKTOREN` ist im Kern jetzt `let` (der Bereich kann aus dem eingebetteten
     Bündel entstehen), in der Lese-App weiter `const`. Derselbe Anker muss beide Formen
     nehmen — genau wie der `SEKTOR_BY_ID`-Anker darunter es seit A389 tut. */
  const _startTreffer = /(?:const|let)\s+SEKTOREN = /.exec(quelle);
  const start = _startTreffer ? _startTreffer.index : -1;
  if (start < 0) throw new Error('SEKTOREN-Block nicht gefunden (Anker verrutscht?)');
  /* A389: der Index heisst seit dem fünften Einlass-Register `let SEKTOR_BY_ID` statt
     `const` — er wächst mit angedockten Bereichen. Der Anker nimmt darum beide Formen;
     an `const` allein hing er, und der Wächter fiel mit „Ende nicht gefunden" aus,
     was wie ein Bereichs-Drift aussah und keiner war. */
  const m = /(?:const|let)\s+SEKTOR_BY_ID/.exec(quelle.slice(start));
  const ende = m ? start + m.index : -1;
  if (ende < 0) throw new Error('Ende des SEKTOREN-Blocks nicht gefunden');
  return [start, ende];
}

// IDs aus dem Block: `id: 'x'` auf oberster Ebene der Sektor-Objekte. Wir nehmen
// die Reihenfolge des Vorkommens — das IST die Bereichsreihenfolge.
/* Die ab Werk GESAETEN Bereiche aus dem Quelltext — die Gegenstuecke zu `_buendelAusQuelle`.
   Beide Regionen sind Literale; hier wird nur nach den Bereichs-SCHLUESSELN gefragt, nicht
   nach ihrem Inhalt. Wirft nie: fehlt die Konstante (aeltere Kern-Staende), ist die Antwort
   eine leere Liste, und der Erheber verhaelt sich wie zuvor. */
function _gesaeteBereichsIds(quelle) {
  const ids = [];
  for (const name of ['BEREICH_QUELLEN_EINGEBAUT', 'AB_WERK_BEREICH_QUELLEN']) {
    const a = quelle.indexOf('const ' + name + ' =');
    if (a === -1) continue;
    const ende = quelle.indexOf('\n', quelle.indexOf(');', a));
    const block = quelle.slice(a, ende === -1 ? quelle.length : ende);
    /* Umbau „Englisch vor v1" (14.09.2026): zwei Bugs, gemessen statt angenommen.
       (1) Zeichenklasse war lowercase-only — die neuen camelCase-Bereichs-IDs
       (z. B. `housing` selbst ist zwar klein, aber Nachbar-IDs wie
       `emergencyPreparedness` sind es nicht, und dieselbe Klasse wird unten
       fürs Kanon-Array wiederverwendet) fielen durch. (2) Escaping: dieser
       Block liegt roh (unverarbeitet) im Quelltext, innerhalb eines
       `JSON.parse("…")`-Strings — jedes `"` steht dort als `\"`. Der alte
       Anker `"bereiche":{"` erwartete unescaped Anführungszeichen und fand
       nie eine Übereinstimmung; `housing` (gesät über
       `BEREICH_QUELLEN_EINGEBAUT`) verschwand dadurch komplett aus der
       Erhebung, nicht nur unsortiert. `\\?"` nimmt beide Formen (escaped und
       unescaped, falls `AB_WERK_BEREICH_QUELLEN` künftig ein rohes
       Objekt-Literal statt eines JSON.parse-Strings trägt). */
    const re = /\\?"bereiche\\?"\s*:\s*\{\s*\\?"([A-Za-z0-9-]+)\\?"/g;
    let m;
    while ((m = re.exec(block)) !== null) if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

/* Die kanonische Folge, wie sie `bereicheAlle()` zur Laufzeit herstellt. */
function _eingebauteIdsAusQuelle(quelle) {
  const a = quelle.indexOf('const BEREICH_IDS_EINGEBAUT');
  if (a === -1) return [];
  const ende = quelle.indexOf(';', a);
  const block = quelle.slice(a, ende === -1 ? a + 2000 : ende);
  const ids = [];
  // Umbau „Englisch vor v1" (14.09.2026): Zeichenklasse erweitert — die kanonische Reihenfolge
  // trägt jetzt camelCase-IDs (`socialInsurance`, `advanceCare`, `emergencyPreparedness`), die
  // alte lowercase-only-Klasse liess genau diese drei aus dem Kanon fallen. Kein Absturz, aber
  // ein stiller Reihenfolge-Fehler: `bereichsIdsAusBlock` hängt fehlende Kanon-Einträge unten
  // in Fundreihenfolge an, statt sie an ihrer echten Stelle zu belassen.
  const re = /'([A-Za-z0-9-]+)'/g;
  let m;
  while ((m = re.exec(block)) !== null) ids.push(m[1]);
  return ids;
}

function bereichsIdsAusBlock(quelle) {
  /* ⚠ SEIT U2-ADR-320 STEHT DER BESTAND IM BUENDEL, NICHT IM QUELLTEXT-BLOCK (06.09.2026).

     Der Block zwischen `SEKTOREN` und `SEKTOR_BY_ID` ist im Kern leer; ein Erheber, der weiter
     dort sucht, liefert eine LEERE Liste — und W-16 („Kern und Lese-App fuehren dieselben
     Bereiche in derselben Reihenfolge") verglichen dann nichts gegen dreizehn und waeren still
     gruen geworden. Fuer die Lese-App gilt das NICHT: sie traegt ihren Bestand weiter nativ,
     und dort ist der Block der richtige Ort. Beide Wege stehen darum nebeneinander.

     REIHENFOLGE BLEIBT REIHENFOLGE: die Bereiche stehen im Buendel in derselben Ordnung wie
     zuvor im Literal — `Object.keys` einer JSON-Abbildung haelt die Einfuegereihenfolge fuer
     Zeichenketten-Schluessel, und die Gleichheit mit dem eingefrorenen nativen Bestand ist
     Feld fuer Feld belegt (tests/fixtures/sektoren-EINGEFROREN-…json). */
  /* STUFE 2 (09.09.2026) — DER BESTAND STEHT NICHT MEHR NUR IM BUENDEL.

     Der Kommentar darueber beschreibt denselben Fehler eine Stufe frueher: U2-ADR-320 zog den
     Bestand vom Quelltext-Block ins Buendel, und ein Erheber, der weiter im Block suchte,
     lieferte eine LEERE Liste. Jetzt zieht ein eingebauter Bereich vom Buendel in
     `BEREICH_QUELLEN_EINGEBAUT` — und ein Erheber, der nur das Buendel liest, liefert einen
     ZU WENIG. W-16 verglich dann zwoelf gegen dreizehn.

     Beide Quellen werden darum zusammengefuehrt, in der KANONISCHEN Folge aus
     `BEREICH_IDS_EINGEBAUT` — dieselbe Ordnung, die `bereicheAlle()` zur Laufzeit herstellt.
     Ohne sie stuende der gesaete Bereich am Ende und W-16 meldete eine Reihenfolge-Abweichung,
     wo keine ist.

     FUER DIE LESE-APP GILT DAS NICHT: sie traegt ihren Bestand weiter nativ im Block; dort
     ist keine Saat, also auch keine zweite Quelle. */
  const buendel = _buendelAusQuelle(quelle);
  if (buendel) {
    const ausBuendel = Object.keys(buendel.bereiche || {});
    const gesaet = _gesaeteBereichsIds(quelle);
    if (!gesaet.length) return ausBuendel;
    const alle = new Set(ausBuendel.concat(gesaet));
    const kanon = _eingebauteIdsAusQuelle(quelle);
    if (!kanon.length) {
      throw new Error('BEREICH_IDS_EINGEBAUT nicht gefunden, obwohl gesaete Bereiche vorliegen '
        + '— ohne die kanonische Folge waere die Reihenfolge geraten. Nicht raten, nachsehen.');
    }
    const geordnet = kanon.filter((id) => alle.has(id));
    for (const id of ausBuendel.concat(gesaet)) if (!geordnet.includes(id)) geordnet.push(id);
    return geordnet;
  }
  const [a, b] = sektorenBlockGrenzen(quelle);
  const block = quelle.slice(a, b);
  const ids = [];
  // Ein Sektor beginnt mit `{ id: '…', label…` bzw. `{\n    id: '…'`. Sektionen
  // tragen ebenfalls `id:` — sie stehen aber tiefer eingerückt. Wir nehmen darum
  // nur `id:`-Zeilen, die auf ein `label:` UND ein `sektionen:` im selben Objekt
  // folgen; robuster: die IDs, die auch als Schlüssel in data.sektoren auftauchen.
  // Umbau „Englisch vor v1" (14.09.2026): Zeichenklasse erweitert, s. Kommentar bei
  // `_eingebauteIdsAusQuelle` — hier betrifft es die Lese-App, die ihren Bestand weiter nativ
  // in diesem Block trägt (kein Bündel-Umweg). `socialInsurance`/`advanceCare`/
  // `emergencyPreparedness` fielen sonst komplett aus der erhobenen Liste, nicht nur unsortiert.
  // Teil 3 (17.09.2026, tools/build-sektoren-lesen.js): der Block ist jetzt generiertes
  // JSON.stringify-Literal (`"id": "identity"`, wie SITUATIONEN schon vorher) statt
  // handgetippter JS-Syntax (`id: 'identity'`) — das Schlüsselwort trägt jetzt eigene
  // Anführungszeichen, der Wert doppelte statt einfache. Der Anker nimmt beide Formen,
  // sonst liest dieses Werkzeug die Lese-App als leer (gemessen: W-16 fiel genau darauf).
  const re = /\n\s{0,4}\{\s*\n?\s*"?id"?:\s*['"]([A-Za-z0-9-]+)['"]/g;
  let m;
  while ((m = re.exec(block)) !== null) ids.push(m[1]);
  if (ids.length) return ids;
  /* STUFE 3 (Schnitt-Reparatur, 18.09.2026) — dieselbe Fehlerklasse eine Stufe weiter:
     `BUERGERMODUL_BUENDEL = null;` ist jetzt ein blankes JS-`null`, kein
     `JSON.parse('null')` mehr — `_buendelAusQuelle` erkennt die Deklaration darum gar
     nicht erst (Regex verlangt `JSON.parse('`) und liefert null, UNUNTERSCHEIDBAR vom
     Lese-App-Fall („trägt gar kein Bündel"). Beide fallen auf denselben Block-Scan
     zurück — für die Lese-App richtig (ihr Block ist weiter nativ gefüllt), für den
     Kern falsch: der Block ist seit dem Schnitt LEER (Bereiche liegen nur noch als
     Templates), `ids` bleibt `[]`, W-16 verglich 0 gegen 13. Letzter Fallback, NUR wenn
     der Block wirklich nichts liefert: `BEREICH_IDS_EINGEBAUT` — dieselbe kanonische
     Konstante, die `_eingebauteIdsAusQuelle` oben schon für die Reihenfolge-Korrektur im
     Bündel-Zweig liest, hier als eigenständige Quelle statt nur als Sortierschlüssel. */
  return _eingebauteIdsAusQuelle(quelle);
}

function zaehleIdLiterale(quelle, ids, blockGrenzen) {
  const drin = Object.create(null), draussen = Object.create(null);
  let summeDrin = 0, summeDraussen = 0;
  for (const id of ids) {
    const re = new RegExp("'" + id.replace(/[-]/g, '\\-') + "'", 'g');
    let m; drin[id] = 0; draussen[id] = 0;
    while ((m = re.exec(quelle)) !== null) {
      const imBlock = blockGrenzen && m.index >= blockGrenzen[0] && m.index < blockGrenzen[1];
      if (imBlock) { drin[id]++; summeDrin++; } else { draussen[id]++; summeDraussen++; }
    }
  }
  return { drin, draussen, summeDrin, summeDraussen };
}

/* ── Art einer Fundstelle: Steuerfluss, Schlüssel, Kommentar oder Daten ──
   Dieselbe Einteilung wie A286, hier als nachlesbares Kriterium statt als
   Handurteil. Gemessen wird die ZEILE um die Fundstelle. */
function artDerZeile(zeile, id) {
  const t = zeile.trim();
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return 'kommentar';
  const q = "'" + id + "'";
  // Steuerfluss: Vergleich, case, includes, Ternär-Bedingung
  if (new RegExp('[=!]==?\\s*' + q).test(zeile)) return 'steuerfluss';
  if (new RegExp(q + '\\s*[=!]==?').test(zeile)) return 'steuerfluss';
  if (new RegExp('case\\s+' + q).test(zeile)) return 'steuerfluss';
  if (new RegExp('includes\\(\\s*' + q).test(zeile)) return 'steuerfluss';
  if (new RegExp('startsWith\\(\\s*' + q).test(zeile)) return 'steuerfluss';
  // Schlüsselzugriff / Objektschlüssel
  if (new RegExp('\\[\\s*' + q + '\\s*\\]').test(zeile)) return 'schluessel';
  if (new RegExp('^\\s*' + q + '\\s*:').test(zeile)) return 'schluessel';
  return 'daten';
}

function nachArt(quelle, ids, blockGrenzen) {
  const zeilen = quelle.split('\n');
  // Zeilenanfangs-Offsets für die Zuordnung Fundstelle → Zeile
  const offsets = []; let off = 0;
  for (const z of zeilen) { offsets.push(off); off += z.length + 1; }
  const zaehler = { steuerfluss: 0, schluessel: 0, kommentar: 0, daten: 0 };
  const steuerflussStellen = [];
  for (const id of ids) {
    const re = new RegExp("'" + id.replace(/[-]/g, '\\-') + "'", 'g');
    let m;
    while ((m = re.exec(quelle)) !== null) {
      if (blockGrenzen && m.index >= blockGrenzen[0] && m.index < blockGrenzen[1]) continue;
      // binäre Suche der Zeile
      let lo = 0, hi = offsets.length - 1, zi = 0;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (offsets[mid] <= m.index) { zi = mid; lo = mid + 1; } else hi = mid - 1; }
      const art = artDerZeile(zeilen[zi], id);
      zaehler[art]++;
      if (art === 'steuerfluss') steuerflussStellen.push({ zeile: zi + 1, id, text: zeilen[zi].trim().slice(0, 140) });
    }
  }
  return { zaehler, steuerflussStellen };
}

/* ── Bereichslisten im Bestand finden (Vorlage für den Wächter aus Zug 1) ── */
function bereichslistenOrte(kernIds) {
  const orte = [];
  const kern = lies(KERN), lese = lies(LESE), gen = lies(GENERATOR);
  orte.push({ datei: 'vivodepot.html', anker: 'SEKTOREN', zeile: zeileVon(kern, 'let SEKTOREN = '), art: 'ID-Liste', eintraege: bereichsIdsAusBlock(kern).length });
  orte.push({ datei: 'vivodepot-lesen.html', anker: 'const SEKTOREN', zeile: zeileVon(lese, 'const SEKTOREN = '), art: 'ID-Liste', eintraege: bereichsIdsAusBlock(lese).length });
  const genIdx = gen.indexOf('const BEREICHE = ');
  if (genIdx >= 0) {
    const bis = gen.indexOf(']', genIdx);
    const roh = gen.slice(genIdx, bis);
    const labels = [...roh.matchAll(/'([^']+)'/g)].map(m => m[1]);
    orte.push({ datei: 'vivodepot-studio.html', anker: 'const BEREICHE', zeile: zeileVon(gen, 'const BEREICHE = '), art: 'Label-Liste (deutsch)', eintraege: labels.length, werte: labels });
  }
  // bereich-Enum im Einreich-Schema, an allen drei Orten
  for (const [name, datei] of [['Schema-Datei', SCHEMA_DATEI], ['VC-Issuer', ISSUER], ['Generator', GENERATOR]]) {
    if (!fs.existsSync(datei)) continue;
    const q = lies(datei);
    let idx = -1;
    while ((idx = q.indexOf('"bereich"', idx + 1)) >= 0) {
      // NUR das enum, das zu DIESER Eigenschaft gehört: das Fenster endet an der
      // ersten schliessenden Klammer. Ohne diese Grenze fing die Suche die enums
      // von `verwaltungsTyp` und `feldtyp` mit ein — drei falsche Treffer je
      // Kopie, die im ersten Lauf wie zusätzliche Bereichslisten aussahen.
      const zu = q.indexOf('}', idx);
      const fenster = q.slice(idx, zu < 0 ? idx + 600 : zu);
      const enumIdx = fenster.indexOf('"enum"');
      if (enumIdx < 0) continue;
      const bis = fenster.indexOf(']', enumIdx);
      if (bis < 0) continue;
      const werte = [...fenster.slice(enumIdx, bis).matchAll(/"([^"]+)"/g)].map(m => m[1]).filter(w => w !== 'enum');
      if (!werte.length) continue;
      orte.push({ datei: path.relative(WURZEL, datei), anker: '"bereich" enum (' + name + ')', zeile: zeileAmOffset(q, idx), art: 'Enum', eintraege: werte.length, werte });
    }
  }
  return orte;
}

function zeileVon(quelle, anker) { const i = quelle.indexOf(anker); return i < 0 ? null : zeileAmOffset(quelle, i); }
function zeileAmOffset(quelle, i) { return quelle.slice(0, i).split('\n').length; }

/* ── Fremdschlüssel: wo wird eine sektorId ohne Prüfung übernommen? ──────── */
function fremdschluesselStellen() {
  const treffer = [];
  for (const [name, datei] of [['Kern', KERN], ['Lese-App', LESE]]) {
    const q = lies(datei); const zeilen = q.split('\n');
    zeilen.forEach((z, i) => {
      if (/d\.sektorId\s*===|\.sektorId\s*===\s*sektorId/.test(z) && /feldDefinitionen/.test(zeilen.slice(Math.max(0, i - 3), i + 1).join('\n'))) {
        treffer.push({ komponente: name, datei: path.relative(WURZEL, datei), zeile: i + 1, text: z.trim().slice(0, 140) });
      }
    });
  }
  return treffer;
}

function main() {
  const argv = process.argv.slice(2);
  const kern = lies(KERN), lese = lies(LESE);
  const kernGrenzen = sektorenBlockGrenzen(kern), leseGrenzen = sektorenBlockGrenzen(lese);
  const ids = bereichsIdsAusBlock(kern);
  const leseIds = bereichsIdsAusBlock(lese);

  const listen = bereichslistenOrte(ids);
  if (argv.includes('--listen')) {
    console.log(JSON.stringify(listen, null, 2));
    return;
  }

  const kernZahl = zaehleIdLiterale(kern, ids, kernGrenzen);
  const leseZahl = zaehleIdLiterale(lese, leseIds, leseGrenzen);
  const kernArt = nachArt(kern, ids, kernGrenzen);
  const leseArt = nachArt(lese, leseIds, leseGrenzen);

  const ergebnis = {
    bereichsIds: { kern: ids, leseApp: leseIds, gleicheMenge: ids.slice().sort().join(',') === leseIds.slice().sort().join(','), gleicheReihenfolge: ids.join(',') === leseIds.join(',') },
    vorkommen: {
      kern: { inDerDefinition: kernZahl.summeDrin, ausserhalb: kernZahl.summeDraussen },
      leseApp: { inDerDefinition: leseZahl.summeDrin, ausserhalb: leseZahl.summeDraussen },
      summeAusserhalb: kernZahl.summeDraussen + leseZahl.summeDraussen,
    },
    nachArt: { kern: kernArt.zaehler, leseApp: leseArt.zaehler },
    steuerflussStellen: { kern: kernArt.steuerflussStellen, leseApp: leseArt.steuerflussStellen },
    bereichslisten: listen,
    fremdschluessel: fremdschluesselStellen(),
  };

  if (argv.includes('--json')) { console.log(JSON.stringify(ergebnis, null, 2)); return; }

  console.log('── Bereichs-IDs, kanonisch aus dem Kern ──────────────────────────');
  console.log('Kern      (' + ids.length + '): ' + ids.join(', '));
  console.log('Lese-App  (' + leseIds.length + '): ' + leseIds.join(', '));
  console.log('gleiche Menge: ' + ergebnis.bereichsIds.gleicheMenge + ' · gleiche Reihenfolge: ' + ergebnis.bereichsIds.gleicheReihenfolge);
  console.log('');
  console.log('── Vorkommen als String-Literal ──────────────────────────────────');
  console.log('Kern:     in der Definition ' + kernZahl.summeDrin + ' · ausserhalb ' + kernZahl.summeDraussen);
  console.log('Lese-App: in der Definition ' + leseZahl.summeDrin + ' · ausserhalb ' + leseZahl.summeDraussen);
  console.log('Summe ausserhalb: ' + ergebnis.vorkommen.summeAusserhalb);
  console.log('');
  console.log('── Nach Art (ausserhalb der Definition) ──────────────────────────');
  for (const [k, v] of Object.entries(kernArt.zaehler)) console.log('Kern     ' + k.padEnd(12) + v);
  for (const [k, v] of Object.entries(leseArt.zaehler)) console.log('Lese-App ' + k.padEnd(12) + v);
  console.log('');
  console.log('── Bereichslisten im Bestand ─────────────────────────────────────');
  for (const o of listen) console.log(o.datei + ':' + o.zeile + '  ' + o.anker + '  [' + o.art + ', ' + o.eintraege + ']');
  console.log('');
  console.log('── Fremdschlüssel ohne Prüfung ───────────────────────────────────');
  for (const f of ergebnis.fremdschluessel) console.log(f.datei + ':' + f.zeile + '  ' + f.text);
}

if (require.main === module) main();
module.exports = { bereichsIdsAusBlock, sektorenBlockGrenzen, bereichslistenOrte, zaehleIdLiterale, nachArt, artDerZeile, KERN, LESE, GENERATOR, ISSUER, SCHEMA_DATEI };
