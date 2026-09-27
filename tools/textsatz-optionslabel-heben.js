'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-optionslabel-heben.js — hebt inline `optionen[].label`-Werte aus
   Feld-Definitionen in TEXTSATZ_EINGEBAUT (U2-ADR-112-Nachtrag, 27.08.2026,
   Vorbereitung eines englischen Bürgermoduls)
   ────────────────────────────────────────────────────────────────────────────
   BEFUND: `_textsatzKnotenFuellenOhnePflicht` überspringt jeden Knoten, dessen
   `label` bereits ein nicht-leerer String ist (vivodepot.html, Kommentar an
   dieser Funktion) — ein Optionswert mit inline `label:` erreicht `textLesen`
   nie und ist darum für ein angedocktes Sprachmodul nie überschreibbar. Der
   Kern führt diese Zahl selbst (Kommentar an derselben Stelle: „281 Optionswerte
   im Kern"). Referenzfall, der zeigt, wie es aussehen MUSS, wenn gehoben:
   `identity.maritalStatus`-Optionen tragen `{ wert: 'ledig' }` — KEIN `label`
   mehr im Objekt, der Text lebt ausschließlich in
   `TEXTSATZ_EINGEBAUT['identity.maritalStatus/ledig.label']`.

   ZWEITER LAUF (27.08.2026): erste Fassung deckte nur SEKTOREN/SITUATIONEN/WIZARDS ab (359
   Werte, davon 313 SEKTOREN/SITUATIONEN/eigene WIZARDS-Felder plus PV_BMJ/KI_KORPUS über
   pvwiz/kiwiz-Objektreferenz). VOLLMACHT_BMJ war der einzige der drei Vorlagen-Kataloge OHNE
   Wizard-Verdrahtung (kein vvwiz, U2-ADR-096) — dafür entstand eigens
   `_textsatzAufVollmachtBmjAnwenden` (vivodepot.html, aufgerufen aus `_textsatzOrteBegehen`),
   Kennung `'vollmacht:' + feldId`. Erst seither trägt auch dieser dritte Katalog Optionswerte
   bei (46). Objekt-Identität ist Pflicht (s. `besucht`-Set unten): `_katalogOptionen`/
   `_situationFeldOptionen` geben Options-Objekte per REFERENZ zurück (heirwiz.maritalStatus
   teilt sich seine Optionen wortwörtlich mit identity.maritalStatus) — ohne Dedup zählt ein
   einziges Objekt an jeder Einhängestelle erneut, obwohl nur EINE Quelltext-Deklaration existiert.

   VERFAHREN — zwei UNABHÄNGIGE Erhebungen, gegeneinander geprüft, nicht eine
   Vermutung, die sich selbst bestätigt:
     (A) die LEBENDIGE, bereits geladene Kern-Struktur (`V.SEKTOREN`/`V.SITUATIONEN`/
         `V.WIZARDS`/`V.VOLLMACHT_BMJ.steps`) wird mit GENAU derselben Kennung-
         Konstruktionsregel durchlaufen, die der jeweilige `_textsatzAuf*Anwenden`-Lauf im
         Kern selbst benutzt (sektorId.feldId, `/ufId` für Unterfelder, `/wert` für Optionen) —
         Kennung + aktueller Inline-Text je Option, in Baum-Reihenfolge, jedes Options-Objekt
         nur beim ERSTEN Antreffen (Dedup gegen geteilte Referenzen).
     (B) der ROHE QUELLTEXT wird unabhängig nach `label: '...'`-Vorkommen
         INNERHALB eines `optionen: [...]`-Blocks durchsucht (Klammertiefe
         verfolgt), in Datei-Reihenfolge.
   Stimmen (A) und (B) in ANZAHL überein, werden sie 1:1 nach Reihenfolge
   gepaart — eine Fehlpaarung wäre nur möglich, wenn Baum-Reihenfolge und
   Datei-Reihenfolge auseinanderliefen, was für eine EINMAL geparste, direkt
   aus der Literal-Deklaration gebaute Struktur nicht der Fall ist (keine
   Sortierung, kein Merge zwischen Deklaration und Lauf).

   SICHERHEITSNETZ: nach der Transformation muss `tests/render-charakterisierung.
   test.js` OHNE `RENDER_AUFNAHME_NEU=1` weiterhin grün sein — bytegleiches
   Rendering ist der Beweis, dass sich an keiner sichtbaren Stelle etwas
   geändert hat, nur die QUELLE des Texts.

   Aufruf:
     node tools/textsatz-optionslabel-heben.js --dry-run   (nur Bericht, keine Datei-Änderung)
     node tools/textsatz-optionslabel-heben.js --write     (schreibt vivodepot.html um)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = path.join(REPO, 'vivodepot.html');

// ── (A) Baum-Erhebung — GENAU dieselbe Kennung-Regel wie _textsatzFeldFuellen ──
//
// EIGENTUMS-VORBEHALT: `_katalogOptionen`/`_situationFeldOptionen` (vivodepot.html) geben
// Options-OBJEKTE per REFERENZ zurück, nicht als Kopie ("Eine Quelle statt Kopien", Auftrag
// 12.08.2026) — z. B. teilt `heirwiz.maritalStatus` seine `optionen`-Einträge wortwörtlich mit
// `identity.maritalStatus`. Ein Baum-Durchlauf ohne Objekt-Dedup zählt so ein EINZIGES Options-
// Objekt an jeder Stelle, an der es eingehängt ist — es gibt aber nur EINE Quelltext-Deklaration
// zum Heben. `besucht` verankert die Kennung an der ERSTEN Fundstelle (Durchlaufreihenfolge
// SEKTOREN → SITUATIONEN → WIZARDS, identisch mit `_textsatzOrteBegehen`) — genau die Fassung,
// die zur Laufzeit tatsächlich zuerst gefüllt wird und darum bei jeder weiteren Fundstelle als
// „schon belegt" übersprungen wird.
function baumErhebung(V) {
  const treffer = [];
  const besucht = new Set();
  function feldGehen(feld, kennung) {
    if (feld && Array.isArray(feld.optionen)) {
      for (const o of feld.optionen) {
        if (o && typeof o.wert === 'string' && typeof o.label === 'string' && o.label.trim() !== '' && !besucht.has(o)) {
          besucht.add(o);
          treffer.push({ kennung: kennung + '/' + o.wert + '.label', text: o.label, wert: o.wert });
        }
      }
    }
    if (feld && Array.isArray(feld.unterFelder)) {
      for (const uf of feld.unterFelder) feldGehen(uf, kennung + '/' + uf.id);
    }
  }
  for (const sektor of V.bereicheAlle()) {
    for (const sektion of (sektor.sektionen || [])) {
      for (const feld of (sektion.felder || [])) feldGehen(feld, sektor.id + '.' + feld.id);
    }
  }
  // SITUATIONEN: dieselbe Kennung-Regel wie _textsatzAufSituationenAnwenden/_textsatzBloeckeFuellen
  // — 'situation:<sitId>.<feldId>' je Block-Eintrags-Feld.
  for (const sit of (V.SITUATIONEN || [])) {
    const kennung = 'situation:' + sit.id;
    for (const block of (sit.bloecke || [])) {
      for (const eintrag of (block.eintraege || [])) {
        if (eintrag && eintrag.feld && eintrag.feld.id) feldGehen(eintrag.feld, kennung + '.' + eintrag.feld.id);
      }
    }
  }
  // WIZARDS: 'wizard:<wId>.<feldId>' je Schritt-Feld.
  for (const w of (V.WIZARDS || [])) {
    for (const schritt of (w.schritte || [])) {
      if (schritt && schritt.feld && schritt.feld.id) feldGehen(schritt.feld, 'wizard:' + w.id + '.' + schritt.feld.id);
    }
  }
  // VOLLMACHT_BMJ: 'vollmacht:<feldId>' je Schritt-Feld (U2-ADR-112-Nachtrag Zug 2, 27.08.2026 —
  // _textsatzAufVollmachtBmjAnwenden, vivodepot.html). Eigener Namensraum statt der SEKTOREN-
  // Kennung, weil dieselbe (feldId,wert)-Kombination dort einen ANDEREN Text trägt (generisches
  // UI-Label vs. amtliche Dokument-Klausel).
  for (const st of ((V.VOLLMACHT_BMJ && V.VOLLMACHT_BMJ.steps) || [])) {
    if (st && st.feld && st.feld.id) feldGehen(st.feld, 'vollmacht:' + st.feld.id);
  }
  return treffer;
}

// PV_BMJ und KI_KORPUS sind über `pvwiz`/`kiwiz` verdrahtet: sie spreizen `PV_BMJ.steps`/
// `KI_KORPUS.steps` per `...X.steps.map(...)` in ihre `schritte[]` — dieselben Feld-OBJEKTE
// (Referenz, keine Kopie) werden dadurch Teil von `V.WIZARDS`, und `_textsatzAufWizardsAnwenden`
// ruft generisch `_textsatzFeldFuellen` auf JEDES `schritt.feld`. VOLLMACHT_BMJ trug bis zum
// U2-ADR-112-Nachtrag Zug 2 (27.08.2026) KEINE solche Verdrahtung (kein Wizard referenziert
// seinen Katalog, U2-ADR-096) — seither ruft `_textsatzOrteBegehen` eigens
// `_textsatzAufVollmachtBmjAnwenden(VOLLMACHT_BMJ.steps, tun)` (vivodepot.html), Kennung
// `'vollmacht:' + feldId` (eigener Namensraum, da dieselbe (feldId,wert)-Kombination in
// `advanceCare.provisionInstruments/<feldId>/<wert>.label` einen ANDEREN Text trägt — generisches
// UI-Label vs. amtliche Dokument-Klausel). Alle drei Kataloge sind damit Teil desselben Baums.
//
// ALT_LABEL_REGISTER bleibt der einzige echte Ausschluss: ein archivarisches Register
// ENTFERNTER Felder (U2-ADR-096-Konformitätsklausel, „ein Feld zu entfernen HEISST, seinen
// Registereintrag zu schreiben"). Die Feld-Objekte darin beschreiben einen vergangenen Zustand —
// kein Sektor/keine Situation/kein Wizard referenziert sie, sie werden nie gerendert. Heben würde
// nichts sichtbar machen und nur einen historischen Beleg verändern.
function ausgeschlosseneBereiche(quelle) {
  const bereiche = [];
  for (const name of ['ALT_LABEL_REGISTER']) {
    // Der Katalog kann als Objekt (`Object.freeze({`) oder als Liste (`Object.freeze([`)
    // deklariert sein (ALT_LABEL_REGISTER ist eine Liste) — beide Klammer-Arten zulassen.
    const marker = 'const ' + name + ' = Object.freeze(';
    const markerStart = quelle.indexOf(marker);
    if (markerStart < 0) continue;
    const start = markerStart;
    const auf = quelle[markerStart + marker.length];
    const zu = auf === '[' ? ']' : '}';
    let tiefe = 0, i = markerStart + marker.length, ende = -1;
    for (; i < quelle.length; i++) {
      if (quelle[i] === auf) tiefe++;
      else if (quelle[i] === zu) { tiefe--; if (tiefe === 0) { ende = i; break; } }
    }
    if (ende !== -1) bereiche.push([start, ende]);
  }
  return bereiche;
}
function inAusgeschlossenemBereich(pos, bereiche) {
  return bereiche.some(([a, b]) => pos >= a && pos <= b);
}

// ── (B) Quelltext-Erhebung — `label: '...'` innerhalb eines optionen:[...]-Blocks ──
function quellErhebung(quelle) {
  const treffer = [];
  const ausgeschlossen = ausgeschlosseneBereiche(quelle);
  const marker = 'optionen:';
  let i = 0;
  while ((i = quelle.indexOf(marker, i)) !== -1) {
    if (inAusgeschlossenemBereich(i, ausgeschlossen)) { i += marker.length; continue; }
    // Block-Grenzen: ab der ersten '[' nach 'optionen:' bis zur passenden ']'.
    const auf = quelle.indexOf('[', i);
    if (auf === -1) break;
    let tiefe = 0, ende = -1;
    for (let j = auf; j < quelle.length; j++) {
      if (quelle[j] === '[') tiefe++;
      else if (quelle[j] === ']') { tiefe--; if (tiefe === 0) { ende = j; break; } }
    }
    if (ende === -1) break;
    const block = quelle.slice(auf, ende + 1);
    const paarMuster = /wert:\s*'([^']*)'\s*,\s*label:\s*'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = paarMuster.exec(block))) {
      treffer.push({ wert: m[1], text: m[2].replace(/\\'/g, "'"), start: auf + m.index, ende: auf + m.index + m[0].length, roh: m[0] });
    }
    i = ende + 1;
  }
  return treffer;
}

function main() {
  const modus = process.argv.includes('--write') ? 'write' : 'dry-run';
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const quelle = fs.readFileSync(HTML_PFAD, 'utf8');

  const A_roh = baumErhebung(V);
  // Referenzfall `identity.maritalStatus/ledig` (s. Kopf-Kommentar dieser Datei) ist BEREITS
  // gehoben — sein `label` kommt zur Baum-Zeit aus TEXTSATZ_EINGEBAUT, nicht aus einem Quell-
  // Literal. Jeder Treffer, dessen Kennung schon im eingebauten Satz steht, hat darum KEINE
  // literale Entsprechung mehr in (B) und muss vor der Zählprüfung herausgenommen werden.
  const A = A_roh.filter((a) => !(V.TEXTSATZ_EINGEBAUT && Object.prototype.hasOwnProperty.call(V.TEXTSATZ_EINGEBAUT, a.kennung)));
  const bereitsGehoben = A_roh.length - A.length;
  const B = quellErhebung(quelle);

  console.log('Baum-Erhebung (A):   ' + A.length + ' Optionswerte mit inline label'
    + (bereitsGehoben ? ' (' + bereitsGehoben + ' bereits gehoben, übersprungen)' : ''));
  console.log('Quelltext-Erhebung (B): ' + B.length + ' `label:` in optionen:[...]-Blöcken');

  if (A.length !== B.length) {
    console.error('ABBRUCH: die beiden Erhebungen stimmen nicht überein (' + A.length + ' vs. ' + B.length + ') — keine automatische Paarung ohne Übereinstimmung.');
    // Multiset-Differenz nach (wert,text) — zeigt, welche Quell-Treffer in der Baum-Erhebung fehlen.
    const zaehlA = new Map();
    for (const a of A) { const k = a.wert + '\x00' + a.text; zaehlA.set(k, (zaehlA.get(k) || 0) + 1); }
    const fehlend = [];
    for (const b of B) {
      const k = b.wert + '\x00' + b.text;
      const n = zaehlA.get(k) || 0;
      if (n > 0) zaehlA.set(k, n - 1); else fehlend.push(b);
    }
    console.error(fehlend.length + ' Quell-Treffer ohne Baum-Entsprechung:');
    for (const f of fehlend.slice(0, 40)) {
      const zeile = quelle.slice(0, f.start).split('\n').length;
      console.error('  Zeile ' + zeile + ': wert=' + f.wert + ' text=' + JSON.stringify(f.text));
    }
    process.exit(1);
  }

  // Stichprobe: wert muss an denselben Positionen übereinstimmen — Vorbedingung fuer die Paarung.
  let abweichung = 0;
  for (let k = 0; k < A.length; k++) {
    if (A[k].wert !== B[k].wert || A[k].text !== B[k].text) {
      abweichung++;
      if (abweichung <= 10) {
        console.error('Abweichung an Position ' + k + ': Baum={wert:' + A[k].wert + ', text:' + JSON.stringify(A[k].text) + '} Quelle={wert:' + B[k].wert + ', text:' + JSON.stringify(B[k].text) + '}');
      }
    }
  }
  if (abweichung > 0) {
    console.error('ABBRUCH: ' + abweichung + ' Positions-Abweichungen — Reihenfolge oder Text stimmt nicht überein.');
    process.exit(1);
  }
  console.log('Alle ' + A.length + ' Paare stimmen an Wert UND Text überein — Paarung sicher.');

  if (modus === 'dry-run') {
    console.log('\n--dry-run: keine Datei geändert. Erste 5 Kennungen:');
    for (const t of A.slice(0, 5)) console.log('  ' + t.kennung + ' = ' + JSON.stringify(t.text));
    return;
  }

  // Schreiben: von HINTEN nach VORNE ersetzen (Indizes bleiben gültig), `, label: '...'` entfernen.
  let neu = quelle;
  for (let k = B.length - 1; k >= 0; k--) {
    const b = B[k];
    const ersatz = "wert: '" + b.wert + "'";
    neu = neu.slice(0, b.start) + ersatz + neu.slice(b.ende);
  }

  // Neue TEXTSATZ_EINGEBAUT-Zeilen VOR der Einfüge-Marke einfügen, in Baum-Reihenfolge.
  const marker = '  /* ── Ende des eingebauten Satzes ── (Einfüge-Marke für tools/textsatz-umstellen.js —';
  const markerPos = neu.indexOf(marker);
  if (markerPos === -1) { console.error('ABBRUCH: Einfüge-Marke nicht gefunden.'); process.exit(1); }
  // Kennungen OHNE 'strings:'-Präfix (Feld-Label-Form, wie identity.maritalStatus/ledig.label).
  const echteZeilen = A.map((t) => "  '" + t.kennung + "': " + JSON.stringify(t.text) + ',').join('\n');
  neu = neu.slice(0, markerPos) + '  // U2-ADR-112-Nachtrag (27.08.2026, Zug 1a) — ' + A.length + ' Optionswerte aus Feld-Definitionen gehoben (tools/textsatz-optionslabel-heben.js).\n'
    + echteZeilen + '\n' + neu.slice(markerPos);

  fs.writeFileSync(HTML_PFAD, neu, 'utf8');
  console.log('\n--write: ' + A.length + ' Optionswerte gehoben, vivodepot.html geschrieben.');
  console.log('Nächster Schritt: node --test tests/render-charakterisierung.test.js (OHNE RENDER_AUFNAHME_NEU) — muss grün bleiben.');
}

main();
