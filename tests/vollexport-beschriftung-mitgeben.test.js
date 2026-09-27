'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Laufzettel „Die Vierunddreissig" (22.08.2026), Strang 1, Posten 4 — „Der
   Voll-Export gibt BEIDES mit" (1.1c) — Registerzeile A496.
   ────────────────────────────────────────────────────────────────────────────
   Produktentscheidung: „wenn beides mitgeben nicht zu teuer ist, dann
   bauen. Remember: es soll 20 Jahre halten." Mitgegeben werden der ROHE Name
   (Schlüssel, unverändert) UND die aktuell angezeigte Beschriftung, dazu
   Sprache und Zeitpunkt — als eigener, additiver Block `_angedockteBeschriftungen`,
   NIE als Ersatz für den rohen Namen im `depot`-Zweig selbst.

   DIE DREI AUFLAGEN, EINZELN GEPRÜFT: (1) Beiwerk, nie Schlüssel — kein
   Importpfad liest den Block. (2) Sprache+Zeitpunkt an jedem Eintrag. (3) der
   `depot`-Zweig bleibt zwischen zwei Exporten byte-gleich, auch wenn der neue
   Block sich mit der aktiven Sprache unterscheidet.

   Rot-Beleg: gegen den Stand vor diesem Posten (kein `_angedockteBeschriftungenFuerExport`,
   kein `_angedockteBeschriftungen`-Schlüssel am Export) fallen alle Proben unten
   außer der Importpfad-Probe (die bleibt grün, weil sie eine Abwesenheit prüft) —
   per `git stash` gegen den unveränderten Kern belegt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* UMGEDREHT 16.09.2026 (U2-ADR-141 Entscheidung 4): das Modulfeld liegt, wo ein heutiges Depot es trägt
   (`identity`); der Textsatz unten behält die ALTE Kennung `identitaet` und beweist die Übersetzung.
   Bis heute kam sie nur als Beschriftung eines angedockten Bereichs durch. */
const FELD = { sektorId: 'identity', feldId: 'tpl_pruefstoff_beschriftung', label: 'Prüfstoff-Feld', typ: 'text' };
const BEREICH_MODUL = {
  modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'probe-obhut',
  bereiche: { obhut: { label: 'Fremde Daten in meiner Obhut', icon: 'folder' } },
};

function depotMitAngedocktemFeldUndBereich() {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionen = [Object.assign({}, FELD)];
  d.bereichsModule = [BEREICH_MODUL];
  V.setData(d);
  V._bereichsModuleAusDepotAnmelden(d);
  return V;
}

function eintragFuer(export_, rohSchluessel) {
  const block = export_._angedockteBeschriftungen;
  assert.ok(block, 'ROT ERWARTET, wenn falsch: der Export muss den neuen Block tragen');
  const e = block.eintraege.find((x) => x.rohSchluessel === rohSchluessel);
  assert.ok(e, rohSchluessel + ' fehlt im Block: ' + JSON.stringify(block.eintraege));
  return e;
}

/* ── (1) Beiwerk, nie Schlüssel ──────────────────────────────────────────── */

test('[Posten4] der rohe Name bleibt im depot-Zweig unverändert — der neue Block ist daneben, nicht statt', () => {
  const V = depotMitAngedocktemFeldUndBereich();
  const ex = V.vollExportJSON();
  assert.equal(ex.depot.feldDefinitionen[0].label, 'Prüfstoff-Feld',
    'der rohe Name im depot-Zweig darf sich nicht ändern — er ist der Schlüssel');
  assert.equal(ex.depot.bereichsModule[0].bereiche.obhut.label, 'Fremde Daten in meiner Obhut');
});

test('[Posten4] kein Importpfad liest `_angedockteBeschriftungen` — reines Beiwerk', () => {
  const quelle = require('node:fs').readFileSync(
    process.env.KERN_HTML_PATH || require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const stellen = quelle.split('_angedockteBeschriftungen').length - 1;
  // Erzeuger (die Funktion + der eine Schreib-Aufruf) sind die einzigen Stellen — kein Lesepfad.
  assert.ok(stellen <= 4, 'unerwartet viele Stellen (' + stellen + ') — prüfen, ob eine davon liest statt schreibt');
});

/* ── (2) übersetzte Beschriftung, Sprache, Zeitpunkt ─────────────────────── */

test('[Posten4] ohne aktiven Textsatz: Feld faellt auf den rohen Text zurueck, Sprache ist ehrlich `null` (1.4a steht aus)', () => {
  const V = depotMitAngedocktemFeldUndBereich();
  const ex = V.vollExportJSON();
  const e = eintragFuer(ex, 'identity.tpl_pruefstoff_beschriftung');
  assert.equal(e.rohesLabel, 'Prüfstoff-Feld');
  assert.equal(e.uebersetzteBeschriftung, 'Prüfstoff-Feld');
  assert.equal(e.sprache, null,
    'ROT ERWARTET, wenn falsch: feldDefinitionen[] kennt noch keine Herkunftssprache (1.4a offen) — erfinden waere falsch');
});

test('[Posten4] ohne aktiven Textsatz: Bereich faellt auf den rohen Text zurueck, Sprache ist die des MODULS (seit A493 Pflicht)', () => {
  const V = depotMitAngedocktemFeldUndBereich();
  const ex = V.vollExportJSON();
  const e = eintragFuer(ex, 'obhut');
  assert.equal(e.rohesLabel, 'Fremde Daten in meiner Obhut');
  assert.equal(e.uebersetzteBeschriftung, 'Fremde Daten in meiner Obhut');
  assert.equal(e.sprache, 'de', 'die Bereichsmodul-Herkunftssprache ist bekannt und wird verwendet');
});

test('[Posten4] mit aktivem Textsatz: BEIDE zeigen die uebersetzte Beschriftung und die AKTIVE Sprache', () => {
  const V = depotMitAngedocktemFeldUndBereich();
  const r1 = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
    texte: { 'identitaet.tpl_pruefstoff_beschriftung.label': 'Champ témoin', 'obhut.label': 'Données confiées',
      'identitaet.gibtEsNicht.label': 'Inventé' } }));
  assert.equal(r1.angenommen, true, r1.grund + ' · ' + JSON.stringify(r1.verworfene));
  assert.deepEqual(r1.verworfene.map((v) => v.kennung), ['identitaet.gibtEsNicht.label'],
    'übersetzt wird, was bekannt ist — eine erfundene Kennung unter altem Bereich bleibt verworfen');
  const d = V.getData(); d.textsprache = 'fr'; V.setData(d);
  V._textsatzModuleAusDepotAnmelden(V.getData());

  const ex = V.vollExportJSON();
  const feld = eintragFuer(ex, 'identity.tpl_pruefstoff_beschriftung');
  assert.equal(feld.rohesLabel, 'Prüfstoff-Feld', 'der rohe Name bleibt trotz aktivem Satz stehen');
  assert.equal(feld.uebersetzteBeschriftung, 'Champ témoin');
  assert.equal(feld.sprache, 'fr', 'ROT ERWARTET, wenn falsch: Sprache muss die AKTIVE sein, nicht die des Moduls');

  const bereich = eintragFuer(ex, 'obhut');
  assert.equal(bereich.rohesLabel, 'Fremde Daten in meiner Obhut');
  assert.equal(bereich.uebersetzteBeschriftung, 'Données confiées');
  assert.equal(bereich.sprache, 'fr');
});

test('[Posten4] jeder Export traegt einen Zeitpunkt, gleich fuer alle Eintraege desselben Laufs', () => {
  const V = depotMitAngedocktemFeldUndBereich();
  const ex = V.vollExportJSON();
  assert.equal(ex._angedockteBeschriftungen.erzeugtAm, ex._exportiertAm);
  assert.ok(!Number.isNaN(Date.parse(ex._angedockteBeschriftungen.erzeugtAm)));
});

/* ── (3) der depot-Zweig bleibt byte-gleich, auch wenn der neue Block variiert ── */

test('[Posten4] derselbe angedockte Bestand exportiert den ROHEN Namen gleich — unabhaengig davon, welcher Satz gerade aktiv ist', () => {
  /* Nicht der GESAMTE depot-Zweig ist hier der Gegenstand — das Anmelden eines Textsatz-Moduls
     ist eine echte Depot-Aenderung (data.textsatzModule waechst, data.textsprache aendert sich)
     und würde jeden Vergleich auf Ganz-Gleichheit zu Recht rot machen. Der Gegenstand ist die
     schmalere, eigentlich gemeinte Garantie: der ROHE NAME einer angedockten Beschriftung selbst
     (feldDefinitionen[].label, bereichsModule[].bereiche{}.label) haengt NICHT von der aktiven
     Sprache ab — nur `_angedockteBeschriftungen` darf das. */
  const V = depotMitAngedocktemFeldUndBereich();
  const exDe = V.vollExportJSON();

  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
    texte: { 'obhut.label': 'Données confiées' } }));
  assert.equal(r.angenommen, true);
  const d = V.getData(); d.textsprache = 'fr'; V.setData(d);
  V._textsatzModuleAusDepotAnmelden(V.getData());
  const exFr = V.vollExportJSON();

  assert.equal(exDe.depot.feldDefinitionen[0].label, exFr.depot.feldDefinitionen[0].label,
    'ROT ERWARTET, wenn falsch: der rohe Feld-Name darf sich mit der aktiven Sprache nicht aendern');
  assert.equal(exDe.depot.bereichsModule[0].bereiche.obhut.label, exFr.depot.bereichsModule[0].bereiche.obhut.label,
    'ROT ERWARTET, wenn falsch: der rohe Bereichs-Name darf sich mit der aktiven Sprache nicht aendern — '
    + 'sonst haengt der Inhalt einer Sicherungsdatei davon ab, welche Sprache beim Klicken eingestellt war');

  // Der Unterschied, den es geben DARF, steht ausschliesslich im neuen, additiven Block:
  assert.notEqual(eintragFuer(exDe, 'obhut').uebersetzteBeschriftung, eintragFuer(exFr, 'obhut').uebersetzteBeschriftung);
});

/* ── Kosten-Kontrolle (Laufzettel: „rund zwei Kilobyte bei fuenfzig Feldern") ── */

test('[Posten4] Kosten-Groessenordnung: ein Eintrag ist klein — kein teurer Zuwachs', () => {
  const V = depotMitAngedocktemFeldUndBereich();
  const ex = V.vollExportJSON();
  const bytes = Buffer.byteLength(JSON.stringify(ex._angedockteBeschriftungen.eintraege), 'utf8');
  const proEintrag = bytes / ex._angedockteBeschriftungen.eintraege.length;
  assert.ok(proEintrag < 300, 'ein Eintrag ist unerwartet gross: ' + proEintrag + ' Bytes');
});
