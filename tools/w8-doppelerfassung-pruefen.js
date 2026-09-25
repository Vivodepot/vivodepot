#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-8 („W-8 Doppelerfassung", 09.08.2026, Zug 1) — ein Sachverhalt,
   eine Quelle
   ────────────────────────────────────────────────────────────────────────────
   Die Register-Definition („kein `sit:`-Feld, das einem Sektorfeld gleicht")
   war zu eng — der Fall, der die Entscheidung auslöste (`pv_organspende` gegen
   `organspende`), ist ein Wizard-Schreibziel gegen ein Listen-Unterfeld, kein
   `sit:`-Feld. Dieser Wächter läuft über ALLE vier Träger einer Felddefinition:

     Sektorfeld        — SEKTOR_BY_ID[].sektionen[].felder[]
     Listen-Unterfeld   — dieselben Felder mit typ:'liste', deren .unterFelder[]
     Situationsfeld     — SITUATIONEN/Angehörigen-Blätter[].bloecke[].eintraege[]
                           mit SELBST definiertem { feld:{id,...} } (kein
                           { quelle, feld }-Zeiger — der ist kein neues Feld,
                           s. W-9)
     Wizard-Schreibziel — WIZARDS[].schritte[].feld

   ZWEI ERKENNUNGSWEGE (Auftrag, wörtlich):

   1. NAMENS-/BEDEUTUNGSÄHNLICHKEIT — NICHT vollständig entscheidbar (das sagt
      das Register für W-8 selbst). Zwei Signale, beide über eine Grundlinie
      geführt wie `W-tote-strings` (der Maßstab): rot nur bei einem NEUEN Fund.
        (a) Gleiches normalisiertes Label, verschiedene Feld-id.
        (b) Gleiche Feld-id, an einem NACHWEISLICH anderen Speicherort
            (verschiedener Träger UND verschiedener Ort — s. `_traegerOrt`).
      Der Wächter FINDET breit (hohe Recall, bewusst über-inklusiv) — die
      Einordnung je Fund (`zu beheben` · `begründete Ausnahme` · `Entscheidung
      offen`) ist Menschenarbeit (Zug 2). Ein Fund mit `begründete Ausnahme`
      ist z. B. ein Wizard mit `ziel:{situation:X}`, dessen Schritt-Feld
      dieselbe id trägt wie ein SELBST definierendes Situationsfeld IN
      DERSELBEN Situation X — das ist per Konstruktion derselbe Speicherort
      (`wizardTascheLesen`/`wizardZielSetzen`, :21105 ff.: `ziel.situation` →
      `data.situationen[situation]`), keine Doppelerfassung. Diese Bewertung
      trifft NICHT der Code, sondern die Grundlinie — absichtlich, s. o.

   2. ÜBERSETZUNGSTABELLEN ZWISCHEN ZWEI EIGENEN FELDERN — der harte,
      VOLLSTÄNDIG entscheidbare Teil. Wo Werte eines eigenen Feldes in die
      Wertemenge eines anderen eigenen Feldes umgerechnet werden, ist die
      Doppelerfassung bereits eingestanden (Beispiel: `PV_ORGANSPENDE_BRUECKE`).
      Erkennungsweg: die Namenskonvention `<NAME>_BRUECKE` — EMPIRISCH geprüft
      (09.08.2026), im ganzen Quelltext gibt es genau eine Konstante dieser
      Form, `PV_ORGANSPENDE_BRUECKE` (:10031), und sieben `*_MAPPING`-Konstanten,
      ausnahmslos Export-Ziele nach außen (XOEV/VC/EDCI/XMELD/B16) — AUSGENOMMEN
      per Auftrag. `B16_FELD_MAPPING` ist eine Alt-Feldname-Migration (`alt` →
      aktuelles Schema), kein Werte-Brücke zwischen zwei GLEICHZEITIG lebenden
      Feldern — ebenfalls kein Übersetzungstabellen-Fund. Diese Namenskonvention
      ist eine Beobachtung des HEUTIGEN Bestands, keine erzwungene Regel — ein
      künftiges internes Brücken-Konstrukt unter anderem Namen träfe dieser
      Erkennungsweg nicht; dafür bleibt Erkennungsweg 1 (Namensähnlichkeit
      zwischen den ZWEI gebrückten Feldern selbst) die Rückfalloption.

   GRUNDLINIE, NICHT NULLTOLERANZ — wie `tools/tote-strings-pruefen.js`.
   REICHWEITE (A443, 21.08.2026): dieser Waechter laeuft ueber die vier Traeger des EINGEBAUTEN
   Katalogs. Die Regel greift auch am angedockten Feld — `label` reist mit, und ein Modul-Feld mit
   dem Label eines vorhandenen ist derselbe Fall. Belegt in `tools/andock-regeln-pruefen.js`.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'w8-doppelerfassung-grundlinie.json');

/* Kennungs-Umbau „Englisch vor v1" (15.09.2026): beide Ähnlichkeits-Signale vergleichen Feld-IDs
   — gleiche ID an verschiedenem Ort, gleiches Label bei verschiedener ID. Die Umbenennung hat IDs
   zusammengelegt, die vorher verschieden waren (viele Listen-Unterfelder heißen jetzt `note`,
   `validUntil`, `type` …), und auseinandergezogen, die vorher gleich waren (`strasse` →
   `streetAddress`/`streetHouseNumber`). Beides ist ein Namens-, kein Erfassungsbefund. Verglichen
   wird darum an der FRÜHEREN Kennung aus dem eingebackenen KENNUNG_MAPPING (`vergleichsId`);
   Felder ohne Mapping-Eintrag vergleichen mit ihrer eigenen ID. Ausgegeben wird weiter die neue ID. */
function _vergleichsIdFabrik(V) {
  const m = new Map();
  for (const e of (V && Array.isArray(V.KENNUNG_MAPPING)) ? V.KENNUNG_MAPPING : []) m.set(e.kennungNeu, e.kennungAlt.split(/[./]/).pop());
  return (ort, id) => {
    const schluessel = String(ort).includes('.') ? ort + '/' + id : ort + '.' + id;
    return m.get(schluessel) || id;
  };
}

// ── Träger einsammeln ─────────────────────────────────────────────────────
function alleTraeger(V) {
  const traeger = [];
  const vid = _vergleichsIdFabrik(V);
  for (const sid of Object.keys(V.SEKTOR_BY_ID || {})) {
    const s = V.SEKTOR_BY_ID[sid];
    for (const sek of s.sektionen || []) {
      for (const f of sek.felder || []) {
        traeger.push({ carrier: 'Sektorfeld', id: f.id, label: f.label, ort: sid, vergleichsId: vid(sid, f.id) });
        for (const u of f.unterFelder || []) {
          traeger.push({ carrier: 'Listen-Unterfeld', id: u.id, label: u.label, ort: sid + '.' + f.id, vergleichsId: vid(sid + '.' + f.id, u.id) });
        }
      }
    }
  }
  for (const [name, liste] of [['SITUATIONEN', V.SITUATIONEN], ['ANGEHOERIGEN_BLAETTER', (typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : [])]]) {
    for (const sit of liste || []) {
      for (const blk of sit.bloecke || []) {
        for (const e of blk.eintraege || []) {
          if (e.quelle) continue;   // { quelle, feld } — Zeiger auf ein bestehendes Feld, kein neues (s. W-9)
          if (e.feld && typeof e.feld === 'object') {
            traeger.push({ carrier: 'Situationsfeld', id: e.feld.id, label: e.feld.label, ort: name + ':' + sit.id });
          }
        }
      }
    }
  }
  /* NACHGEZOGEN („Die W-8-Klassifikation richtigstellen", 13.08.2026, Zug 1): `ort`
     trug bislang IMMER `w.id` (die Wizard-Kennung selbst) — unabhängig davon, wohin der Schritt
     TATSÄCHLICH schreibt. Damit unterschied sich der Ort eines Wizard-Schreibziels von JEDEM
     Sektorfeld/Situationsfeld, per Konstruktion, auch dann, wenn der Schritt via `wizardSchrittZiel`
     (schritt-eigenes `ziel` ODER `def.ziel`) exakt in denselben Speicherort schreibt. Neun Fälle
     erschienen dadurch als „Doppelerfassung an verschiedenem Ort", obwohl sie derselbe Ort waren —
     ein Klassifikationsfehler, kein Produktfehler (s. Bericht). `ort` spiegelt jetzt das ECHTE
     Ziel, im selben Namensraum wie Sektorfeld (`sid`) bzw. Situationsfeld (`LISTE:situationId`). */
  const _angIds = new Set(((typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : [])).map((s) => s.id));
  for (const w of V.WIZARDS || []) {
    for (const schritt of w.schritte || []) {
      if (schritt.feld && typeof schritt.feld === 'object') {
        const ziel = V.wizardSchrittZiel ? V.wizardSchrittZiel(w, schritt) : (schritt.ziel || w.ziel);
        let ort = 'wizard:' + w.id;   // kein erkennbares Ziel — Rückfall, bleibt eindeutig „anders"
        if (ziel && ziel.sektor) ort = ziel.sektor;
        else if (ziel && ziel.situation) ort = (_angIds.has(ziel.situation) ? 'ANGEHOERIGEN_BLAETTER' : 'SITUATIONEN') + ':' + ziel.situation;
        const vidOrt = (ziel && ziel.sektor && ziel.liste) ? ziel.sektor + '.' + ziel.liste : ort;   // Listen-Ziel: Mapping-Schlüssel ist sektor.liste/unterfeld
        traeger.push({ carrier: 'Wizard-Schreibziel', id: schritt.feld.id, label: schritt.feld.label, ort, vergleichsId: vid(vidOrt, schritt.feld.id) });
      }
    }
  }
  return traeger;
}

function normLabel(s) {
  return String(s || '').toLowerCase()
    .replace(/[.,;:!?()"'„“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Erkennungsweg 1 — Namens-/Bedeutungsähnlichkeit ──────────────────────
function aehnlichkeitsFunde(traeger) {
  const funde = [];
  // (a) gleiches Label, verschiedene id
  const byLabel = new Map();
  for (const t of traeger) {
    const key = normLabel(t.label);
    if (!key) continue;
    if (!byLabel.has(key)) byLabel.set(key, []);
    byLabel.get(key).push(t);
  }
  for (const [key, arr] of byLabel) {
    const ids = new Set(arr.map((a) => a.vergleichsId || a.id));
    if (ids.size < 2) continue;
    funde.push({ art: 'aehnlichkeit', signal: 'label', schluessel: key,
      traeger: arr.map((a) => ({ carrier: a.carrier, id: a.id, ort: a.ort, label: a.label })) });
  }
  // (b) gleiche id, nachweislich anderer Ort.
  // NACHGEZOGEN („Die W-8-Klassifikation richtigstellen", 13.08.2026, Zug 1): der
  // Vergleichsschlüssel war `carrier + '@' + ort` — das zählt zwei Eintraege schon dann als
  // „verschiedener Ort", wenn nur der TRÄGER-TYP verschieden ist (z. B. Sektorfeld vs.
  // Wizard-Schreibziel), selbst wenn `ort` identisch ist (derselbe Sektor). Ein Wizard-Schritt,
  // der per `wizardSchrittZiel` in genau das Sektorfeld schreibt, das er benennt, ist per
  // Konstruktion derselbe Speicherort — der Trägertyp sagt nichts über den Speicherort, nur `ort`
  // selbst tut das (s. auch die Ort-Berechnung fuer Wizard-Schreibziel oben, jetzt korrigiert).
  const byId = new Map();
  for (const t of traeger) {
    const k = t.vergleichsId || t.id;
    if (!byId.has(k)) byId.set(k, []);
    byId.get(k).push(t);
  }
  for (const [id, arr] of byId) {
    const orte = new Set(arr.map((a) => a.ort));
    if (orte.size < 2) continue;
    funde.push({ art: 'aehnlichkeit', signal: 'id', schluessel: id,
      traeger: arr.map((a) => ({ carrier: a.carrier, id: a.id, ort: a.ort, label: a.label })) });
  }
  return funde;
}

// ── Erkennungsweg 2 — Übersetzungstabellen (vollständig entscheidbar) ────
function uebersetzungsFunde(html) {
  const funde = [];
  // [A-Z_] am Anfang, nicht nur [A-Z]: das Haus fuehrt intern-only-Konstanten teils mit
  // fuehrendem Unterstrich (z. B. _AAD_DEPOT_V2, _ANG_CACHE_ERLAUBT) — ein solcher Name waere
  // sonst unsichtbar. GEMESSEN (Rotmachbarkeits-Probe, waechter-selbsttest): eine gepflanzte
  // _TEST_ERFUNDEN_BRUECKE (fuehrender Unterstrich) blieb mit [A-Z] allein unentdeckt, GATE
  // fiel faelschlich gruen aus.
  const re = /^const ([A-Z_][A-Z0-9_]*_BRUECKE)\s*=/gm;
  let m;
  while ((m = re.exec(html))) {
    funde.push({ art: 'uebersetzung', konstante: m[1] });
  }
  return funde;
}

function schluesselFund(f) {
  return f.art === 'aehnlichkeit' ? (f.art + '|' + f.signal + '|' + f.schluessel) : (f.art + '|' + f.konstante);
}

function alleFunde(V, html) {
  return [...aehnlichkeitsFunde(alleTraeger(V)), ...uebersetzungsFunde(html)];
}

function ladeGrundlinie() {
  if (!fs.existsSync(GRUNDLINIE)) return null;
  return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
}

function gateBewerten(funde, grundlinie) {
  const bekannt = new Set(grundlinie.map(schluesselFund));
  const neu = funde.filter((f) => !bekannt.has(schluesselFund(f)));
  return { neu, rot: neu.length > 0 };
}

async function ermittleFunde() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V, html } = ladeKern();
  return alleFunde(V, html);
}

async function main() {
  const argv = process.argv.slice(2);
  const funde = await ermittleFunde();

  if (argv.includes('--grundlinie-schreiben')) {
    // Ohne Vermerk — Zug 2 trägt je Fund einen der drei ein, bevor die Datei als Grundlinie gilt.
    const mitVermerk = funde.map((f) => Object.assign({}, f, { vermerk: 'Entscheidung offen', begruendung: '' }));
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(mitVermerk, null, 1) + '\n');
    console.log('Grundlinie geschrieben: ' + funde.length + ' Fund(e), alle "Entscheidung offen" — '
      + path.relative(REPO, GRUNDLINIE));
    return;
  }

  const grundlinie = ladeGrundlinie();

  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ funde, bewertung: grundlinie ? gateBewerten(funde, grundlinie) : null }, null, 1) + '\n');
    return;
  }

  if (argv.includes('--gate')) {
    if (!grundlinie) { console.error('GATE: keine Grundlinie — erst `--grundlinie-schreiben`.'); process.exit(2); }
    const { neu, rot } = gateBewerten(funde, grundlinie);
    if (!rot) { console.log('GATE grün — kein neuer Doppelerfassungs-Fund gegen die Grundlinie (' + grundlinie.length + ' bekannt).'); return; }
    console.error('GATE ROT — Doppelerfassung, die die Grundlinie nicht kennt:');
    for (const f of neu) console.error('    NEU: ' + schluesselFund(f));
    process.exit(1);
  }

  console.log('W-8: ' + funde.length + ' Fund(e).');
  for (const f of funde) console.log('  ' + schluesselFund(f));
}

if (require.main === module) main();
module.exports = { alleTraeger, normLabel, aehnlichkeitsFunde, uebersetzungsFunde, schluesselFund, alleFunde, gateBewerten, ermittleFunde, GRUNDLINIE };
