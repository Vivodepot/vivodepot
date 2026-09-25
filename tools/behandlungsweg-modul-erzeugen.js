'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   behandlungsweg-modul-erzeugen.js — die Vorlage „Mein Behandlungsweg" als
   Module aus EINER Datenquelle, nicht aus getipptem Code
   ────────────────────────────────────────────────────────────────────────────
   WOZU (16.09.2026). Die Feldliste der Vorlage ist eine Produktentscheidung,
   die sich im Pilot ändern soll. Damit eine Änderung eine DATENZEILE ist und kein
   Umbau, liest dieses Werkzeug seine Inhalte aus `tools/behandlungsweg/`:

     situationen.json   modulTyp 'situation' — Zweitmeinung und Reha, beide
                        ziehen nur BESTEHENDE Kernfelder zusammen.
     felder.json        die Feldliste der Vorlage. Heute leer: der Feldinhalt
                        ist eine Produktentscheidung. Solange sie
                        leer ist, entsteht KEIN Vorlagen-Artefakt — das ist
                        kein Fehler, sondern der bewusste Halt.
     textsatz-en.json   die englischen Beschriftungen der Situationen
                        (`<situationId>.label`, der Weg, den
                        `_bereichLabelText` im Kern nimmt).

   MUSTER: `tools/erbschein-vorbereitung-modul-erzeugen.js` — dieselbe Bauart
   für dasselbe Problem (Vivodepots eigenes, unsigniertes Modul, real
   ausgeliefert statt nur getestet; Prüfung über denselben Pfad, den ein echter
   Einlass nimmt). Wie dort: `herkunft: "vivodepot"`, UNSIGNIERT und bewusst so
   — der volle Zertifikatsweg bräuchte Vivodepots Ausgabestelle-Schlüssel, der
   in keinem Arbeitsbaum liegt.

   KEIN KERN-EINGRIFF: Situationen sind seit U2-ADR-246 andockbar, eigene
   Felder kommen über den signierten Vorlagen-Weg. Dieses Werkzeug schreibt
   nur Artefakte unter `tools/`.

   Aufruf:
     node tools/behandlungsweg-modul-erzeugen.js [--ausgabe VERZEICHNIS]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const QUELLE_VERZ = path.join(__dirname, 'behandlungsweg');
const Q_SITUATIONEN = path.join(QUELLE_VERZ, 'situationen.json');
const Q_FELDER = path.join(QUELLE_VERZ, 'felder.json');
const Q_TEXTSATZ_EN = path.join(QUELLE_VERZ, 'textsatz-en.json');

function lese(pfad) {
  return JSON.parse(fs.readFileSync(pfad, 'utf8'));
}

/* Die Situations-IDs, die das Modul mitbringt — die Liste, gegen die der
   Sprach-Wächter die englischen Beschriftungen hält. */
function situationsIds(modul) {
  return Object.keys((modul && modul.situationen) || {});
}

/* Prüft das Situations-Modul über GENAU den Weg, den `modulEinlassen` nimmt
   (`situationsModulPruefen`), und zusätzlich, dass jede gelieferte Situation
   auch ANKOMMT — die Zahl der angekommenen gegen die Zahl der gelieferten,
   Muster A376 („die Zahl, die zählt, ist die der angekommenen"). */
function situationenPruefen(V, modul) {
  const geliefert = situationsIds(modul);
  const r = V.situationsModulPruefen(modul);
  if (!r.gueltig) return { ok: false, grund: 'ungueltig: ' + r.grund, geliefert: geliefert.length, angekommen: 0, verworfene: r.verworfene };
  const angekommen = r.situationen.map((s) => s.id);
  if (r.verworfene.length) return { ok: false, grund: 'verworfene Schluessel beim Einlass', geliefert: geliefert.length, angekommen: angekommen.length, verworfene: r.verworfene };
  if (angekommen.length !== geliefert.length) return { ok: false, grund: 'nicht alle Situationen kommen an', geliefert: geliefert.length, angekommen: angekommen.length, verworfene: r.verworfene };
  return { ok: true, grund: null, geliefert: geliefert.length, angekommen: angekommen.length, verworfene: [], ids: angekommen };
}

/* Der Sprach-Wächter des Werkzeugs: zu jeder Situation ein englischer Titel.
   Deutsch trägt das Modul selbst (`titel`), Englisch der Textsatz. */
function sprachenPruefen(modul, textsatzEn, felderQuelle) {
  const fehlend = [];
  const satz = (textsatzEn && textsatzEn.texte) || {};
  const hatSatz = (kennung) => typeof satz[kennung] === 'string' && satz[kennung].trim();
  for (const id of situationsIds(modul)) {
    if (!hatSatz(id + '.label')) fehlend.push(id);
  }
  if (felderQuelle && felderQuelle.bereichId) {
    if (!hatSatz(felderQuelle.bereichId + '.label')) fehlend.push(felderQuelle.bereichId);
  }
  /* Ein Feld traegt seine Sprachen SELBST: `feldname` als Sprachvarianten-Objekt
     (Kern: `_istSprachvariantenObjekt`, U2-ADR-164). Ein Feld mit nur einem String
     waere einsprachig — genau das, was der Waechter verhindern soll. */
  for (const f of ((felderQuelle && felderQuelle.felder) || [])) {
    const n = f && f.feldname;
    if (!n || typeof n !== 'object' || !n.de || !n.en) fehlend.push('feld: ' + JSON.stringify(n).slice(0, 40));
  }
  return { ok: !fehlend.length, fehlend };
}

/* Quellenpflicht: ein Hinweistext, der eine Frist, einen Anspruch oder eine
   Dauer behauptet, braucht eine Fundstelle. Vivodepot berät nicht — ein Satz
   über Wochen oder Ansprüche ohne amtliche Quelle wäre Beratung.
   Geprüft wird auf `hinweis`/`hilfetext`/`hint` in Feldern und Situationen. */
const ANSPRUCH_MUSTER = /(frist|anspruch|woche|monate|§|absatz|anzurechnen|verjähr)/i;

function quellenpflichtPruefen(knoten, pfad, funde) {
  pfad = pfad || 'wurzel';
  funde = funde || [];
  if (Array.isArray(knoten)) {
    knoten.forEach((k, i) => quellenpflichtPruefen(k, pfad + '[' + i + ']', funde));
    return funde;
  }
  if (!knoten || typeof knoten !== 'object') return funde;
  for (const schluessel of ['hinweis', 'hilfetext', 'hint']) {
    const text = knoten[schluessel];
    if (typeof text === 'string' && ANSPRUCH_MUSTER.test(text)) {
      const quelle = knoten.quelle || knoten.fundstelle || knoten.rechtsgrundlage;
      if (typeof quelle !== 'string' || !quelle.trim()) funde.push({ pfad: pfad + '.' + schluessel, text: text.slice(0, 80) });
    }
  }
  for (const k of Object.keys(knoten)) quellenpflichtPruefen(knoten[k], pfad + '.' + k, funde);
  return funde;
}

/* Schutzmarke: jedes Feld mit Gesundheits-, Verlaufs- oder Studienbezug trägt
   `sensibel: true`, damit es ohne ausdrückliche Freigabe nicht im IPS landet
   (Kern: `feldIstSensibel` im Kopf von `fhirIpsBundle`). Reine Kontaktlisten
   sind ausgenommen — sie stehen in der Liste `OHNE_SCHUTZ`. */
const OHNE_SCHUTZ = Object.freeze([
  'Behandelnde Stellen', 'Ansprechpersonen in der Klinik', 'Termine',
  'behandelndeStellen', 'ansprechpersonen', 'termine',
]);

/* Der deutsche Name ist der stabile Schluessel: `feldname` ist entweder ein String
   oder ein Sprachvarianten-Objekt (U2-ADR-164), und `id` gibt es an dieser Stelle
   noch nicht — die Feld-Id entsteht erst im Kern (`_tplFeldId`). */
function feldSchluessel(f) {
  const n = f && f.feldname;
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object') return n.de || Object.values(n)[0] || '';
  return (f && f.id) || '';
}

function schutzPruefen(felder) {
  const fehlend = [];
  for (const f of (felder || [])) {
    if (!f || typeof f !== 'object') continue;
    const schluessel = feldSchluessel(f);
    if (!schluessel) continue;
    if (OHNE_SCHUTZ.includes(schluessel)) continue;
    if (f.sensibel !== true) fehlend.push(schluessel);
  }
  return { ok: !fehlend.length, fehlend };
}

/* W5 — die Linie, an der die Vorlage kein Medizinprodukt wird (Produktentscheidung
   16.09.2026, U2-ADR-025): die Felder halten
   VERWEISE und EIGENE ANGABEN, keine medizinischen Inhalte.

   Strukturell pruefbar ist genau das, was das Feld-Modell an klinischer
   Messung anbietet: `einheit` und `referenzbereich` (ein Messwert mit Norm),
   `mitMessdatum` (eine Messreihe), `warnWennJa` (eine Warnung aus einer
   Antwort) sowie `codeSystem`/`codeWerte`-Bindung an eine klinische
   Terminologie. Traegt ein Feld dieser Vorlage eines davon, will es einen
   Befund halten und nicht einen Verweis — dann haelt dieses Werkzeug an.

   Was es NICHT kann: den Fliesstext eines Feldnamens beurteilen. Ein
   Nebenwirkungs-Tagebuch mit `feldtyp: 'textarea'` faellt hier nicht auf.
   Das ist die Stelle, an der ein Mensch entscheidet — und der Grund, warum
   diese Grenze zusaetzlich im Bauplan steht. */
const MEDIZIN_MERKMALE = Object.freeze(['einheit', 'referenzbereich', 'mitMessdatum', 'warnWennJa', 'codeSystem', 'codeListe']);

function medizinMerkmalePruefen(felder) {
  const funde = [];
  const eins = (f, wo) => {
    if (!f || typeof f !== 'object') return;
    for (const m of MEDIZIN_MERKMALE) {
      if (f[m] !== undefined) funde.push(wo + ' traegt ' + m);
    }
    for (const u of (f.unterFelder || [])) eins(u, wo + '/' + String((u && u.feldname) || '?'));
  };
  for (const f of (felder || [])) eins(f, feldSchluessel(f) || '(ohne Namen)');
  return { ok: !funde.length, funde };
}

function main() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();

  const situationen = lese(Q_SITUATIONEN);
  const felderQuelle = lese(Q_FELDER);
  const textsatzEn = lese(Q_TEXTSATZ_EN);

  if (situationen.herkunft !== 'vivodepot') {
    console.error('ABBRUCH: die Quelle traegt nicht `herkunft: "vivodepot"` — dieses Werkzeug liefert '
      + 'ausdruecklich nur Vivodepots eigenes, unsigniertes Modul aus.');
    process.exit(1);
  }

  const sit = situationenPruefen(V, situationen);
  if (!sit.ok) {
    console.error('ABBRUCH Situations-Modul: ' + sit.grund);
    for (const v of sit.verworfene.slice(0, 20)) console.error('  ' + JSON.stringify(v));
    process.exit(1);
  }

  const spr = sprachenPruefen(situationen, textsatzEn, felderQuelle);
  if (!spr.ok) {
    console.error('ABBRUCH: englische Beschriftung fehlt fuer: ' + spr.fehlend.join(', '));
    process.exit(1);
  }

  const tsr = V.textsatzModulPruefen(textsatzEn);
  if (!tsr.gueltig) {
    console.error('ABBRUCH Textsatz-Modul (en): ' + tsr.grund);
    process.exit(1);
  }

  const quellenFunde = quellenpflichtPruefen(situationen).concat(quellenpflichtPruefen(felderQuelle));
  if (quellenFunde.length) {
    console.error('ABBRUCH Quellenpflicht: Hinweistext ueber Frist oder Anspruch ohne Fundstelle:');
    for (const f of quellenFunde) console.error('  ' + f.pfad + ': ' + f.text);
    process.exit(1);
  }

  const ausgabeIdx = process.argv.indexOf('--ausgabe');
  const ausgabeVerz = ausgabeIdx > 0 ? process.argv[ausgabeIdx + 1] : __dirname;
  const zielSituationen = path.join(ausgabeVerz, 'behandlungsweg-situationen-modul.json');
  const zielTextsatz = path.join(ausgabeVerz, 'behandlungsweg-textsatz-en-modul.json');

  fs.writeFileSync(zielSituationen, fs.readFileSync(Q_SITUATIONEN, 'utf8'), 'utf8');
  fs.writeFileSync(zielTextsatz, fs.readFileSync(Q_TEXTSATZ_EN, 'utf8'), 'utf8');

  console.log('Situations-Modul geschrieben: ' + path.relative(REPO, zielSituationen));
  console.log('  situationsModulPruefen: gueltig, ' + sit.angekommen + ' von ' + sit.geliefert
    + ' Situationen angekommen, 0 verworfen (' + sit.ids.join(', ') + ').');
  console.log('Textsatz-Modul (en) geschrieben: ' + path.relative(REPO, zielTextsatz));

  /* Die Rubrik: ein Bereichs-Modul, geprueft ueber denselben Pfad wie beim Einlass
     (`bereichsModulPruefen`). Ohne angedockte Rubrik verwirft der Uebersetzer jedes
     Feld benannt (`grund: 'bereich'`) — die Rubrik gaebe es dann nicht. */
  if (felderQuelle.bereich) {
    const br = V.bereichsModulPruefen(felderQuelle.bereich);
    if (!br.gueltig) {
      console.error('ABBRUCH Bereichs-Modul: ' + br.grund);
      for (const v of (br.verworfene || []).slice(0, 20)) console.error('  ' + JSON.stringify(v));
      process.exit(1);
    }
    const zielBereich = path.join(ausgabeVerz, 'behandlungsweg-bereich-modul.json');
    fs.writeFileSync(zielBereich, JSON.stringify(felderQuelle.bereich, null, 2) + '\n', 'utf8');
    console.log('Bereichs-Modul geschrieben: ' + path.relative(REPO, zielBereich)
      + ' (Rubrik ' + Object.keys(felderQuelle.bereich.bereiche).join(', ') + ').');
  }

  const felder = Array.isArray(felderQuelle.felder) ? felderQuelle.felder : [];
  if (!felder.length) {
    console.log('Vorlagen-Artefakt: NICHT geschrieben — die Feldliste in '
      + path.relative(REPO, Q_FELDER) + ' ist leer.');
    console.log('  Grund: der Feldinhalt und der Arbeitstitel sind eine Produktentscheidung '
      + '(Bauplan 6.2). Sobald die Liste steht, traegt dieselbe Datei sie, und dieser Lauf '
      + 'erzeugt die Vorlage — ohne Aenderung an diesem Werkzeug.');
    return;
  }

  const medizin = medizinMerkmalePruefen(felder);
  if (!medizin.ok) {
    console.error('ABBRUCH Grenze zur Medizin: diese Felder wollen einen Befund halten, keinen Verweis:');
    for (const f of medizin.funde) console.error('  ' + f);
    console.error('  Die Vorlage haelt Verweise und eigene Angaben. Vor einer Aenderung dieser Grenze fragen.');
    process.exit(1);
  }

  const schutz = schutzPruefen(felder);
  if (!schutz.ok) {
    console.error('ABBRUCH Schutzmarke: diese Felder tragen kein `sensibel: true`: ' + schutz.fehlend.join(', '));
    process.exit(1);
  }

  const tpl = { felder };
  const grund = V.validateTemplate(tpl);
  if (grund) {
    console.error('ABBRUCH Vorlage: validateTemplate meldet: ' + grund);
    process.exit(1);
  }
  const zielVorlage = path.join(ausgabeVerz, 'behandlungsweg-vorlage.json');
  fs.writeFileSync(zielVorlage, JSON.stringify(tpl, null, 2) + '\n', 'utf8');
  console.log('Vorlage geschrieben: ' + path.relative(REPO, zielVorlage) + ' (' + felder.length + ' Felder).');
}

if (require.main === module) main();
module.exports = { lese, situationsIds, medizinMerkmalePruefen, MEDIZIN_MERKMALE, feldSchluessel, situationenPruefen, sprachenPruefen, quellenpflichtPruefen, schutzPruefen, OHNE_SCHUTZ, ANSPRUCH_MUSTER, Q_SITUATIONEN, Q_FELDER, Q_TEXTSATZ_EN };
