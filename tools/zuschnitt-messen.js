#!/usr/bin/env node
'use strict';
/* ══════════════════════════════════════════════════════════════════════════════
   zuschnitt-messen — welcher Zuschnitt trägt eigene Schlüssel je Einheit?

   ANLASS: Heute ist der Depot-Inhalt EIN Ciphertext, und die Angehörigensicht ist
   ein SCHNAPPSCHUSS mit `stand`-Datum, weil sie veraltet. Zerfiele der Inhalt in
   Einheiten mit je eigenem Schlüssel, bekäme die Vertrauensperson Schlüssel statt
   Kopien. Ob das geht, hängt am Zuschnitt der Einheiten — und der ist messbar.

   DER HARTE TEST (Zug 1 des Auftrags „Erhebung Verschlüsselungs-Zuschnitt",
   18.08.2026): bildet ein Zuschnitt die HEUTIGE Angehörigensicht ohne Verlust ab?
   Der Maßstab ist `angehoerigenCacheModell` mit der Fünf-Blatt-Allowlist. Sie wird
   hier NICHT angefasst — sie ist der Maßstab, an dem gemessen wird.

   „Verlustfrei" heisst BEIDES: nicht weniger (die Vertrauensperson sieht alles, was
   sie heute sieht) und nicht mehr (sie sieht nichts darüber hinaus). Ein einziges
   zusätzlich sichtbares sensibles Feld entscheidet eine Stufe.

   ALLE ZAHLEN SIND GEZÄHLT, NICHT GESCHÄTZT. Der Auftrag verwirft die Zahl 703 aus
   der Vorlage ausdrücklich als Regex-Schätzung.

   Aufruf:  node tools/zuschnitt-messen.js [--json]
   Ohne Argument misst es den Kern dieses Repos — der Gegenstand liegt hier, es gibt
   keinen zweiten. Exit 0, solange die Messung durchläuft; dieses Werkzeug bewertet
   nicht, es zählt (der Auftrag verbietet eine Empfehlung ausdrücklich).
   ══════════════════════════════════════════════════════════════════════════════ */

const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');

const alsJson = process.argv.includes('--json');
const { V } = ladeKern();

/* ── 1 · Der Maßstab: was die Vertrauensperson heute sieht ──────────────────── */

const INSTRUMENT_PRAEFIX = 'instrument:';

function allowlistPaare() {
  const paare = [];
  for (const s of (typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : [])) {
    for (const b of (s.bloecke || [])) {
      for (const e of (b.eintraege || [])) {
        if (!e || !e.quelle || typeof e.feld !== 'string') continue;
        let art = 'sektorfeld';
        if (e.quelle.startsWith('sit:')) art = 'situationsfeld';
        else if (e.feld.startsWith(INSTRUMENT_PRAEFIX)) art = 'instrumentZeile';
        else if (V.bereichFeldHatRolle(e.quelle, e.feld, 'personenListe')) art = 'personenListe';
        else if (e.feld.startsWith('liste:')) art = 'listenUnterfeld';
        paare.push({ blatt: s.id, block: b.id, quelle: e.quelle, feld: e.feld, art });
      }
    }
  }
  return paare;
}

const ALLOW = allowlistPaare();
const ALLOW_SCHLUESSEL = new Set(ALLOW.map(p => p.quelle + '.' + p.feld));

/* Nur echte Sektorfelder lassen sich mit einem Bereichs- oder Sektions-Zuschnitt
   überhaupt adressieren; die vier übrigen Arten (Situationsfeld, Instrument-Zeile,
   Listen-Unterfeld, Personenliste) liegen ausserhalb von `data.sektoren` und werden
   je Stufe getrennt ausgewiesen statt stillschweigend mitgezählt. */
const ALLOW_SEKTOR = ALLOW.filter(p => p.art === 'sektorfeld');

/* ── 2 · Der Bestand: woraus das Depot besteht ──────────────────────────────── */

function sektorFelder() {
  const raus = [];
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        raus.push({ bereich: s.id, sektion: sek.id || sek.label || '(ohne id)', feld: f.id, sensibel: !!f.sensibel });
      }
    }
  }
  return raus;
}

function situationsFelder() {
  const raus = [];
  for (const s of V.SITUATIONEN) {
    for (const b of (s.bloecke || [])) {
      for (const e of (b.eintraege || [])) {
        if (e && e.feld && typeof e.feld === 'object' && e.feld.id) {
          raus.push({ situation: s.id, feld: e.feld.id, sensibel: !!e.feld.sensibel });
        }
      }
    }
  }
  return raus;
}

const SEKTORFELDER = sektorFelder();
const SITFELDER = situationsFelder();

/* Listen-Unterfelder zählen als eigene Einheit nur auf der Feld-Stufe — auf jeder
   gröberen liegen sie ohnehin in ihrem Feld. Gezählt wird die DEKLARATION, nicht
   die Zeile: wie viele Zeilen ein Depot trägt, weiss der Katalog nicht. */
function listenUnterfelder() {
  let n = 0;
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (Array.isArray(f.unterFelder)) n += f.unterFelder.length;
        for (const t of (Array.isArray(f.typen) ? f.typen : [])) {
          if (Array.isArray(t.unterFelder)) n += t.unterFelder.length;
        }
      }
    }
  }
  return n;
}

/* Die Schlüssel der obersten Ebene, die neben `sektoren` echten Inhalt tragen —
   aus `leeresDepot()` gelesen, nicht aus einer gepflegten Liste. */
function obersteSchluessel() {
  const d = V.leeresDepot();
  return Object.keys(d).filter(k => k !== 'sektoren' && k !== 'schemaVersion' && k !== 'kryptoVersion');
}

/* ── 3 · Die vier Stufen ────────────────────────────────────────────────────── */

function stufeFeld() {
  const einheiten = SEKTORFELDER.length + SITFELDER.length + listenUnterfelder() + obersteSchluessel().length;
  return {
    stufe: 'Feld',
    einheiten,
    zusammensetzung: {
      sektorfelder: SEKTORFELDER.length,
      situationsfelder: SITFELDER.length,
      listenUnterfelder: listenUnterfelder(),
      obersteSchluessel: obersteSchluessel().length,
    },
    verlustfrei: true,
    zuvielSichtbar: [],
    bemerkung: 'Die Einheit ist genau der Gegenstand der Allowlist — der Schnitt kann sie ohne Rest abbilden.',
  };
}

function stufeSektion() {
  const beruehrt = new Set(ALLOW_SEKTOR.map(p => {
    const t = SEKTORFELDER.find(f => f.bereich === p.quelle && f.feld === p.feld);
    return t ? p.quelle + '§' + t.sektion : null;
  }).filter(Boolean));
  const zuviel = SEKTORFELDER.filter(f =>
    beruehrt.has(f.bereich + '§' + f.sektion) && !ALLOW_SCHLUESSEL.has(f.bereich + '.' + f.feld));
  /* Gezählt werden Sektionen MIT Feldern. Der Katalog führt 25 Sektionen, eine davon
     (`meine-menschen§menschen-liste`) trägt kein Feld — ihr Inhalt liegt in
     `data.menschen`, also auf der obersten Ebene und nicht in `data.sektoren`. Eine
     Sektion ohne Feld wäre eine Einheit ohne Inhalt. */
  const einheiten = new Set(SEKTORFELDER.map(f => f.bereich + '§' + f.sektion)).size;
  return {
    stufe: 'Sektion (Block)',
    einheiten: einheiten + SITFELDER.length + obersteSchluessel().length,
    zusammensetzung: { sektionen: einheiten, situationsfelder: SITFELDER.length, obersteSchluessel: obersteSchluessel().length },
    beruehrteEinheiten: beruehrt.size,
    verlustfrei: zuviel.length === 0,
    zuvielSichtbar: zuviel.map(f => ({ name: f.bereich + '.' + f.feld, sensibel: f.sensibel })),
  };
}

function stufeBlatt() {
  /* Ein Blatt ist KEINE Zerlegung des Depots, sondern eine Projektion darüber. Das
     ist selbst ein Messergebnis und steht darum als eigene Zahl: wie oft ein Feld in
     mehr als einem Blatt vorkommt (dann läge es in zwei Einheiten — eine Kopie, und
     genau davon sollte der Zerfall wegführen), und wie viel des Depots gar kein
     Blatt berührt. */
  const proFeld = new Map();
  for (const p of ALLOW) {
    const k = p.quelle + '.' + p.feld;
    if (!proFeld.has(k)) proFeld.set(k, new Set());
    proFeld.get(k).add(p.blatt);
  }
  const mehrfach = [...proFeld.entries()].filter(([, b]) => b.size > 1);
  const ausserhalb = SEKTORFELDER.filter(f => !ALLOW_SCHLUESSEL.has(f.bereich + '.' + f.feld));
  return {
    stufe: 'Blatt',
    einheiten: (typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : []).length,
    verlustfrei: false,
    keineZerlegung: true,
    inMehrerenBlaettern: mehrfach.map(([k, b]) => ({ name: k, blaetter: [...b] })),
    vomBlattNichtBeruehrt: ausserhalb.length,
    zuvielSichtbar: [],
    bemerkung: 'Fünf Einheiten decken 62 von ' + SEKTORFELDER.length + ' Sektorfeldern; der Rest des Depots hätte keine Einheit. '
      + 'Ein Feld in zwei Blättern läge in zwei Einheiten — das ist die Kopie, die der Zerfall abschaffen soll.',
  };
}

function stufeBereich() {
  const beruehrt = new Set(ALLOW_SEKTOR.map(p => p.quelle));
  const zuviel = SEKTORFELDER.filter(f => beruehrt.has(f.bereich) && !ALLOW_SCHLUESSEL.has(f.bereich + '.' + f.feld));
  return {
    stufe: 'Bereich',
    einheiten: V.bereicheAlle().length + SITFELDER.length + obersteSchluessel().length,
    zusammensetzung: { bereiche: V.bereicheAlle().length, situationsfelder: SITFELDER.length, obersteSchluessel: obersteSchluessel().length },
    beruehrteEinheiten: beruehrt.size,
    beruehrteBereiche: [...beruehrt],
    verlustfrei: zuviel.length === 0,
    zuvielSichtbar: zuviel.map(f => ({ name: f.bereich + '.' + f.feld, sensibel: f.sensibel })),
  };
}

const ERGEBNIS = {
  massstab: {
    blaetter: (typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : []).length,
    bloecke: new Set(ALLOW.map(p => p.blatt + '/' + p.block)).size,
    eintraege: ALLOW.length,
    eindeutigeFelder: ALLOW_SCHLUESSEL.size,
    davonSektorfelder: ALLOW_SEKTOR.length,
    artenAusserhalbDerSektoren: ALLOW.filter(p => p.art !== 'sektorfeld').length,
  },
  stufen: [stufeFeld(), stufeSektion(), stufeBlatt(), stufeBereich()],
};

if (alsJson) {
  console.log(JSON.stringify(ERGEBNIS, null, 2));
  process.exit(0);
}

console.log('zuschnitt-messen — Maßstab ist die Fünf-Blatt-Allowlist (unangetastet)');
console.log('  ' + ERGEBNIS.massstab.blaetter + ' Blätter · ' + ERGEBNIS.massstab.bloecke + ' Blöcke · '
  + ERGEBNIS.massstab.eintraege + ' Einträge · ' + ERGEBNIS.massstab.eindeutigeFelder + ' eindeutige Felder'
  + ' (davon ' + ERGEBNIS.massstab.davonSektorfelder + ' echte Sektorfelder, '
  + ERGEBNIS.massstab.artenAusserhalbDerSektoren + ' ausserhalb von data.sektoren)');
console.log('');
for (const s of ERGEBNIS.stufen) {
  const urteil = s.keineZerlegung ? 'KEINE ZERLEGUNG' : (s.verlustfrei ? 'verlustfrei: JA' : 'verlustfrei: NEIN');
  console.log('── ' + s.stufe + ' — ' + s.einheiten + ' Einheiten — ' + urteil);
  if (s.zusammensetzung) console.log('   Zusammensetzung: ' + JSON.stringify(s.zusammensetzung));
  if (typeof s.beruehrteEinheiten === 'number') console.log('   von der Allowlist berührt: ' + s.beruehrteEinheiten);
  if (s.zuvielSichtbar && s.zuvielSichtbar.length) {
    const sens = s.zuvielSichtbar.filter(f => f.sensibel);
    console.log('   ZU VIEL SICHTBAR: ' + s.zuvielSichtbar.length + ' Felder, davon ' + sens.length + ' schema-sensibel');
    for (const f of s.zuvielSichtbar.slice(0, 12)) console.log('     · ' + f.name + (f.sensibel ? '  [sensibel]' : ''));
    if (s.zuvielSichtbar.length > 12) console.log('     · … (' + (s.zuvielSichtbar.length - 12) + ' weitere, vollständig unter --json)');
  }
  if (s.inMehrerenBlaettern && s.inMehrerenBlaettern.length) {
    console.log('   in MEHREREN Blättern (läge in zwei Einheiten): ' + s.inMehrerenBlaettern.length);
    for (const f of s.inMehrerenBlaettern) console.log('     · ' + f.name + ' → ' + f.blaetter.join(', '));
  }
  if (typeof s.vomBlattNichtBeruehrt === 'number') console.log('   Sektorfelder ohne Blatt: ' + s.vomBlattNichtBeruehrt);
  if (s.bemerkung) console.log('   ' + s.bemerkung);
  console.log('');
}

/* ══════════════════════════════════════════════════════════════════════════════
   ZUG 2 — was die tragfähige Stufe kostet

   Gerechnet wird nur für die Stufe, die Zug 1 besteht (Feld). Für eine Stufe, die
   den harten Test nicht besteht, wäre eine Kostenrechnung eine Antwort auf eine
   Frage, die sich nicht stellt.

   DIE GRUNDLAGE IST EIN ECHTES DEPOT, nicht eine Annahme: das Referenzdepot aus
   `tests/fixtures/referenzdepot.js` (alle 261 Sektorfelder befüllt, 15 Menschen,
   4 Institutionen). Es ist das dichteste Depot, das das Repo kennt — die Zahlen
   sind damit eine OBERGRENZE für die Zahl der Einheiten und zugleich der günstigste
   Fall für den Overhead-Anteil, weil jedes Feld auch Inhalt trägt.

   NICHT GERECHNET, SONDERN GEMESSEN wird die Öffnungszeit — sie steht in der
   Playwright-Probe `tests/e2e/zuschnitt-oeffnungszeit.spec.js`, weil eine gerechnete
   Zeit keine Zeit ist.
   ══════════════════════════════════════════════════════════════════════════════ */

const AES_GCM_TAG = 16;   // Byte, an den Ciphertext angehängt
const AES_GCM_IV = 12;    // Byte, 96-bit-Nonce (crypto.getRandomValues(new Uint8Array(12)))
const SCHLUESSEL_BYTES = 32;   // AES-256

function b64Zeichen(bytes) { return Math.ceil(bytes / 3) * 4; }

/* Ein Einheit-Umschlag im Depot, so wie ihn `encryptData` heute schreibt:
   {"iv":"<b64 12B>","ct":"<b64 (n+16)B>"} — plus Schlüsselname und Komma. */
function einheitRahmen(nameLaenge, klartextBytes) {
  const ivZeichen = b64Zeichen(AES_GCM_IV);              // 16
  const ctZeichen = b64Zeichen(klartextBytes + AES_GCM_TAG);
  const json = 7 + ivZeichen + 8 + ctZeichen + 2;        // {"iv":" … ","ct":" … "}
  return json + nameLaenge + 4;                          // "name": + Komma
}

/* Ein Schlüsselumschlag je Einheit und Empfänger: der Einheit-Schlüssel (32 B),
   AES-GCM-gewickelt (IV 12 B + Tag 16 B), base64, mit JSON-Rahmen. */
function umschlagZeichen(empfaenger) {
  const eine = b64Zeichen(AES_GCM_IV) + b64Zeichen(SCHLUESSEL_BYTES + AES_GCM_TAG) + 20;
  return eine * empfaenger;
}

function zug2Feldstufe(depot) {
  const klartext = Buffer.byteLength(JSON.stringify(depot), 'utf8');
  const heuteCt = b64Zeichen(klartext + AES_GCM_TAG) + b64Zeichen(AES_GCM_IV);

  const einheiten = [];
  for (const b of Object.keys(depot.sektoren || {})) {
    for (const f of Object.keys(depot.sektoren[b])) {
      einheiten.push({ name: b + '.' + f, bytes: Buffer.byteLength(JSON.stringify(depot.sektoren[b][f]), 'utf8') });
    }
  }
  for (const k of Object.keys(depot)) {
    if (k === 'sektoren') continue;
    const w = depot[k];
    if (w == null) continue;
    einheiten.push({ name: k, bytes: Buffer.byteLength(JSON.stringify(w), 'utf8') });
  }

  let zerfallen = 0;
  for (const e of einheiten) zerfallen += einheitRahmen(e.name.length, e.bytes);

  const nutzlast = einheiten.reduce((n, e) => n + e.bytes, 0);
  const proEmpfaenger = (n) => umschlagZeichen(n) * einheiten.length;

  return {
    referenzdepot: { klartextBytes: klartext, einheiten: einheiten.length, nutzlastBytes: nutzlast },
    heute: { ctZeichen: heuteCt },
    zerfallen: {
      ctZeichen: zerfallen,
      umschlaegeAnkerAllein: proEmpfaenger(1),
      umschlaegeAnkerPlusSechs: proEmpfaenger(7),
      gesamtAnkerAllein: zerfallen + proEmpfaenger(1),
      gesamtAnkerPlusSechs: zerfallen + proEmpfaenger(7),
    },
  };
}

if (process.argv.includes('--zug2')) {
  const rd = require(path.join(__dirname, '..', 'tests', 'fixtures', 'referenzdepot.js'));
  const d = V.leeresDepot();
  d.sektoren = rd.baueSektoren();
  d.menschen = rd.MENSCHEN;
  d.institutionen = rd.INSTITUTIONEN;
  const r = zug2Feldstufe(d);
  const kb = (z) => (z / 1024).toFixed(1) + ' KB';
  console.log('ZUG 2 — Feld-Stufe, gerechnet am Referenzdepot');
  console.log('  Klartext: ' + r.referenzdepot.klartextBytes + ' B · ' + r.referenzdepot.einheiten + ' Einheiten · '
    + 'Nutzlast in den Einheiten: ' + r.referenzdepot.nutzlastBytes + ' B');
  console.log('  heute, EIN Ciphertext:            ' + kb(r.heute.ctZeichen));
  console.log('  zerfallen, nur die Einheiten:     ' + kb(r.zerfallen.ctZeichen)
    + '   (×' + (r.zerfallen.ctZeichen / r.heute.ctZeichen).toFixed(2) + ')');
  console.log('  + Schlüsselumschläge, Anker allein: ' + kb(r.zerfallen.umschlaegeAnkerAllein)
    + '  → gesamt ' + kb(r.zerfallen.gesamtAnkerAllein)
    + '  (×' + (r.zerfallen.gesamtAnkerAllein / r.heute.ctZeichen).toFixed(2) + ')');
  console.log('  + Schlüsselumschläge, Anker + 6:   ' + kb(r.zerfallen.umschlaegeAnkerPlusSechs)
    + '  → gesamt ' + kb(r.zerfallen.gesamtAnkerPlusSechs)
    + '  (×' + (r.zerfallen.gesamtAnkerPlusSechs / r.heute.ctZeichen).toFixed(2) + ')');
}

module.exports = { ERGEBNIS, zug2Feldstufe, einheitRahmen, umschlagZeichen };

/* ══════════════════════════════════════════════════════════════════════════════
   NACHMESSUNG (Auftrag „Nachmessung zum Verschlüsselungs-Zuschnitt", 18.08.2026)

   ZUG 1 — die Umschlagslast bei REALISTISCHEM Zuschnitt.
   Die Zahl aus der ersten Erhebung (198 KB Umschläge bei sechs Kreisen) rechnet
   sechs mal 528 Umschläge: jeder Kreis bekäme Zugriff auf JEDES Feld. Das ist genau
   der Zustand, den Empfängerkreise abschaffen sollen — die Zahl ist also eine
   Obergrenze und bleibt als solche stehen, sie wird hier nicht ersetzt.

   DIE ANNAHME JE ZUSCHNITT WIRD BENANNT. Eine Zahl ohne ihre Annahme ist keine.
   Die Kreisgrößen sind nicht erfunden, sondern GEMESSEN: die fünf Angehörigen-
   Blätter sind die einzigen Empfängerkreise, die es im Bestand wirklich gibt.

   ZUG 2 — die Grundlast an einem gefüllten Depot. Der Overhead je Einheit ist
   konstant, die Nutzlast wächst; der Faktor muss also mit dem Füllstand sinken.
   Wie „gefüllt" zustande kommt, steht an der Erzeugung — der Weg gehört zur Zahl.
   ══════════════════════════════════════════════════════════════════════════════ */

/* Die fünf Blätter, je als eigener Kreis — gemessen, nicht angenommen. */
function kreiseAusBlaettern() {
  return (typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : []).map(s => {
    const set = new Set();
    for (const b of (s.bloecke || [])) for (const e of (b.eintraege || [])) set.add(e.quelle + '.' + e.feld);
    return { name: s.id, felder: set.size };
  });
}

function umschlagslast(kreisGroessen) {
  const eineB = b64Zeichen(AES_GCM_IV) + b64Zeichen(SCHLUESSEL_BYTES + AES_GCM_TAG) + 20;
  return kreisGroessen.reduce((n, g) => n + g * eineB, 0);
}

/* Ein realistisch GEFÜLLTES Depot — der Weg gehört zur Zahl:
   Referenzdepot (alle 261 Sektorfelder vorhanden, aber kurze Werte)
   + in jedes `textarea`-Feld ein Absatz von 600 Zeichen, wie ihn eine Bürgerin
     schreibt, die ihre Pflegewünsche wirklich ausformuliert (23 Felder)
   + zehn Dokument-Einträge im Register
   AUSDRÜCKLICH OHNE `mappe`: Dateiinhalte sind base64-Blobs, die jede Verhältnis-
   zahl erschlagen und dabei nichts über den Zuschnitt sagen — sie wären in jedem
   Zuschnitt genau eine Einheit. */
function depotGefuellt() {
  const rd = require(path.join(__dirname, '..', 'tests', 'fixtures', 'referenzdepot.js'));
  const d = V.leeresDepot();
  d.sektoren = rd.baueSektoren();
  d.menschen = rd.MENSCHEN;
  d.institutionen = rd.INSTITUTIONEN;
  const absatz = 'Ich möchte, dass meine Wünsche hier ausführlich festgehalten sind. '.repeat(9).slice(0, 600);
  let textareas = 0;
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.typ !== 'textarea') continue;
        (d.sektoren[s.id] || (d.sektoren[s.id] = {}))[f.id] = absatz;
        textareas++;
      }
    }
  }
  d.dokumente = Array.from({ length: 10 }, (_, i) => ({
    id: 'dok-' + i, typ: 'personalausweis', nummer: 'X' + i, ort: 'Ordner Ausweise', geprueftAm: '2026-08-01',
  }));
  return { depot: d, textareas, dokumente: d.dokumente.length };
}

function depotLeer() { return V.leeresDepot(); }

if (process.argv.includes('--nachmessung')) {
  const kb = (z) => (z / 1024).toFixed(1) + ' KB';
  const kreise = kreiseAusBlaettern();
  const allowlistFelder = ALLOW_SCHLUESSEL.size;
  const alleEinheiten = stufeFeld().einheiten;

  console.log('NACHMESSUNG · ZUG 1 — Umschlagslast bei realistischem Zuschnitt');
  console.log('  Der Maßstab: die Fünf-Blatt-Allowlist umfasst ' + allowlistFelder + ' von ' + alleEinheiten
    + ' Einheiten = ' + (allowlistFelder / alleEinheiten * 100).toFixed(1) + ' % des Depots.');
  console.log('  Gemessene Kreisgrößen: ' + kreise.map(k => k.name + ' ' + k.felder).join(' · '));
  const median = kreise.map(k => k.felder).sort((a, b) => a - b)[Math.floor(kreise.length / 2)];

  const zuschnitte = [
    { name: 'EIN Kreis in Größe der Allowlist', groessen: [allowlistFelder],
      annahme: 'die Vertrauensperson von heute, unverändert — die Allowlist IST dieser Kreis' },
    { name: 'VIER Kreise', groessen: kreise.filter(k => k.felder > 1).map(k => k.felder),
      annahme: 'die vier Blätter mit mehr als einem Feld (krankenhausakut, pflegeheimakut, beerdigung, behoerden_nachlass) — gemessen, nicht gesetzt' },
    { name: 'SECHS Kreise', groessen: kreise.map(k => k.felder).concat([median]),
      annahme: 'die fünf Blätter plus ein sechster in Median-Größe (' + median + ' Felder); der sechste ist der einzige gesetzte Wert dieser Zeile' },
    /* Die Obergrenze rechnet auf der BEFÜLLTEN Einheitenzahl des Referenzdepots (290),
       nicht auf den 528 Katalog-Einheiten — das ist dieselbe Grundlage wie in A331, und
       nur so sind die zwei Zahlen nebeneinander lesbar. Auf 528 gerechnet wären es 309,4 KB;
       die Grundlage steht darum in der Zeile und nicht in einer Fussnote. */
    { name: 'ANKER + SECHS Kreise mit Vollzugriff (Obergrenze aus A331)', groessen: Array(7).fill(290),
      annahme: 'jeder Kreis darf jedes befüllte Feld (7 × 290) — misst den Fall, den Empfängerkreise gerade abschaffen sollen; bleibt als Obergrenze stehen' },
  ];
  for (const z of zuschnitte) {
    const summe = z.groessen.reduce((a, b) => a + b, 0);
    console.log('   · ' + z.name + ': ' + z.groessen.length + ' Kreise, ' + summe + ' Umschläge → '
      + kb(umschlagslast(z.groessen)));
    console.log('       Annahme: ' + z.annahme);
  }

  console.log('');
  console.log('NACHMESSUNG · ZUG 2 — Grundlast nach Füllstand');
  const gef = depotGefuellt();
  const faelle = [
    { name: 'leer (leeresDepot)', depot: depotLeer() },
    { name: 'Referenzdepot (261 Felder, kurze Werte)', depot: (() => {
        const rd = require(path.join(__dirname, '..', 'tests', 'fixtures', 'referenzdepot.js'));
        const d = V.leeresDepot(); d.sektoren = rd.baueSektoren(); d.menschen = rd.MENSCHEN; d.institutionen = rd.INSTITUTIONEN; return d;
      })() },
    { name: 'gefüllt (+' + gef.textareas + ' Absätze à 600 Z., +' + gef.dokumente + ' Dokumente, ohne mappe)', depot: gef.depot },
  ];
  for (const f of faelle) {
    const r = zug2Feldstufe(f.depot);
    console.log('   · ' + f.name);
    console.log('       Klartext ' + r.referenzdepot.klartextBytes + ' B · ' + r.referenzdepot.einheiten + ' Einheiten · '
      + 'heute ' + kb(r.heute.ctZeichen) + ' → zerfallen ' + kb(r.zerfallen.gesamtAnkerAllein)
      + '  ×' + (r.zerfallen.gesamtAnkerAllein / r.heute.ctZeichen).toFixed(2) + ' (Anker allein)');
  }
}

/* ── Nachmessung Zug 3.2 — was pseudonyme Adressen am Umschlag kosten ─────────
   Heute genügt im Umschlag der gewickelte Schlüssel; die Adresse steht ohnehin
   als Feldname in der Datei. Mit Pseudonymen muss der Umschlag das PAAR führen:
   Pseudonym → Schlüssel. Das Pseudonym ist ein HMAC-SHA256, also 32 Byte; auf
   16 Byte gekürzt bleibt es bei 528 Einheiten kollisionsfrei mit sehr grossem
   Abstand (Geburtstagsgrenze bei 2^64), darum beide Zahlen. */
function umschlagslastPseudonym(kreisGroessen, pseudonymBytes) {
  const eine = b64Zeichen(pseudonymBytes) + b64Zeichen(AES_GCM_IV)
             + b64Zeichen(SCHLUESSEL_BYTES + AES_GCM_TAG) + 12;
  return kreisGroessen.reduce((n, g) => n + g * eine, 0);
}

if (process.argv.includes('--zug3')) {
  const kb = (z) => (z / 1024).toFixed(1) + ' KB';
  const kreise = kreiseAusBlaettern();
  const sechs = kreise.map(k => k.felder).concat([15]);
  const vier = kreise.filter(k => k.felder > 1).map(k => k.felder);
  console.log('NACHMESSUNG · ZUG 3.2 — Umschlagslast mit pseudonymen Adressen');
  for (const [name, g] of [['ein Kreis (Allowlist, 62)', [ALLOW_SCHLUESSEL.size]], ['vier Kreise', vier], ['sechs Kreise', sechs]]) {
    console.log('   · ' + name + ': ohne Pseudonym ' + kb(umschlagslast(g))
      + ' · mit 16-Byte-Pseudonym ' + kb(umschlagslastPseudonym(g, 16))
      + ' · mit 32-Byte-Pseudonym ' + kb(umschlagslastPseudonym(g, 32)));
  }
}
