#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-15 („Eine Quelle statt Kopien", Zug 3, 12.08.2026) — der Wächter
   gegen das Vergessen, nicht nur gegen die bekannten Fälle.

   AUSDRÜCKLICHE FRAGE: wie wird verhindert, dass ein achter Katalog-
   Duplikat entsteht, den noch niemand geschrieben hat? W-14 (derselbe Baum,
   „Assistenten fragen, was nicht gelten kann") schützt nur die ZWEI dort
   angeglichenen Kataloge vor dem Zurückwachsen — über eine gepflegte
   REGISTRY. Eine REGISTRY ist selbst dieselbe Fehlerklasse in Grün: sie
   kennt nur, was schon einmal gefunden wurde.

   ZWEI STRUKTURELLE PROBEN, KEINE NAMENSLISTE:

   A) Sektorenlisten (Zug 1). Statt eine Liste bekannter Dateien zu pflegen,
      wird JEDES `tools/*.js` gescannt: enthält es eine Array-Klammer mit
      mindestens fünf der ECHTEN Sektor-IDs (dynamisch aus
      `echteSektorenListe()`, nicht hier hartkodiert) als Zeichenketten-
      Literale, UND fehlt zugleich ein `require('./lib/sektoren.js')` in
      derselben Datei — dann ist das eine Hand-Kopie, unabhängig davon, ob
      sie heute schon bekannt ist.

   B) Assistenten-Kataloge (Zug 2). Jeder Wizard-Schritt mit einem `auswahl`-
      /`mehrfachauswahl`-Feld, dessen `optionen` als LITERALES Array im
      Quelltext steht (nicht über `_katalogOptionen()`/`_situationFeldOptionen()`
      bezogen), wird gegen SEKTOREN UND SITUATIONEN geprüft: führt irgendein
      Sektor- oder Situationsfeld DENSELBEN `id` mit eigenen `optionen` —
      dann dupliziert der Assistenten-Schritt einen Katalog, der schon
      existiert, egal ob dieses Feld heute in einer Auftragsliste steht.

   Beide Proben brauchen keine Pflege, wenn ein neuner Sektor oder ein neuner
   Katalog entsteht — sie messen gegen den LEBENDEN Bestand.

   Aufruf:
     node tools/w15-eine-quelle-statt-kopien-pruefen.js [--check]
     node tools/w15-eine-quelle-statt-kopien-pruefen.js --html <pfad> --tools <ordner>
   `--check`: Exit 1 bei Fund (für Hook/CI). Ohne: Fund wird nur gemeldet.
   REICHWEITE (A443, 21.08.2026): dieser Waechter misst strukturell ueber den EINGEBAUTEN Bestand.
   Die tragende Form gibt es auch am angedockten Weg: ein Modul, das die zwoelf Bereiche als eigene
   Auswahl mitbringt, fuehrt eine zweite Liste neben `bereiche.json`. Belegt in
   `tools/andock-regeln-pruefen.js`.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : s; };
const HTML = arg('html', path.join(REPO, 'vivodepot.html'));
const TOOLS_DIR = arg('tools', path.join(REPO, 'tools'));
const CHECK = argv.includes('--check');

const { echteSektorenListe } = require('./lib/sektoren.js');

/* ── Teil A: Sektorenlisten-Hand-Kopien in tools/*.js ────────────────────── */
function klammerSpannen(text) {
  // Flache Bracket-Erfassung: liefert für jedes '[' den Text bis zu seinem
  // passenden ']' (Tiefenzählung über ALLE Klammertypen, damit verschachtelte
  // Arrays die äußere Spanne nicht vorzeitig schließen).
  const spannen = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '[') continue;
    let tiefe = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '[') tiefe++;
      else if (text[j] === ']') { tiefe--; if (tiefe === 0) { spannen.push(text.slice(i, j + 1)); break; } }
    }
  }
  return spannen;
}

// Wie `klammerSpannen`, aber ab einem BEKANNTEN Start-Index (der auf ein '[' zeigt) — spart den
// vollen Datei-Scan über die (bei vivodepot.html ~2 MB große) Quelle, wenn die Fundstelle schon
// über einen Anker/Marker bekannt ist (Teil B, s. u.).
function klammerSpanneAb(text, startIdx) {
  let tiefe = 0;
  for (let j = startIdx; j < text.length; j++) {
    if (text[j] === '[') tiefe++;
    else if (text[j] === ']') { tiefe--; if (tiefe === 0) return text.slice(startIdx, j + 1); }
  }
  throw new Error('klammerSpanneAb: keine schließende Klammer für Index ' + startIdx + ' gefunden.');
}

// Entfernt verschachtelte { … }-Objektinhalte aus einer Array-Spanne — was übrig bleibt, sind
// nur noch TOP-LEVEL-Elemente des Arrays selbst. Das trennt den echten Fund (ein FLACHES Array
// aus Sektor-ID-Strings, `[ 'identitaet', 'gesundheit', … ]` — die Bauform aller sechs
// historischen Fälle) von harmlosen Tabellen, in denen `sektor: 'x'` nur EINE Eigenschaft unter
// mehreren je Eintrag ist (z. B. Mapping-Tabellen wie in w10/w4 — beim ersten Lauf gefunden,
// beide falsch positiv, deshalb diese Verschärfung).
function nurTopLevelInhalt(spanne) {
  let vorher;
  let text = spanne;
  do {
    vorher = text;
    text = text.replace(/\{[^{}]*\}/g, '');
  } while (text !== vorher);
  return text;
}

function pruefeSektorenHandKopien() {
  const echt = echteSektorenListe();
  const funde = [];
  if (!fs.existsSync(TOOLS_DIR)) return funde;
  // Führendes `_` ist im Repo die etablierte Konvention für Einmal-Skripte außerhalb der Suite
  // (`_w3-liste-transkribieren.js`, `_zug2-mutant-probe.js` u. a.) — keine Ad-hoc-Ausnahme für
  // diese eine Datei, sondern derselbe Namensraum, den das Repo an sechs Stellen schon nutzt.
  const dateien = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  for (const datei of dateien) {
    const pfad = path.join(TOOLS_DIR, datei);
    const quelle = fs.readFileSync(pfad, 'utf8');
    if (/require\(['"]\.\/lib\/sektoren\.js['"]\)/.test(quelle)) continue; // bezieht schon von dort
    for (const spanne of klammerSpannen(quelle)) {
      const flach = nurTopLevelInhalt(spanne);
      const treffer = echt.filter((sid) => new RegExp(`['"]${sid}['"]`).test(flach));
      if (treffer.length >= 5) {
        funde.push({ datei: `tools/${datei}`, gefundeneSektoren: treffer, anzahl: treffer.length });
        break; // eine Fundstelle je Datei reicht als Beleg
      }
    }
  }
  return funde;
}

/* ── Teil B: Assistenten-Schritte, die einen Katalog duplizieren ─────────── */
function pruefeAssistentenDuplikate(htmlText) {
  const { ladeKern } = require('../tests/load-kern.js');
  const funde = [];

  // Alle Feld-ids mit eigenen `optionen`, die außerhalb der Wizards leben —
  // aus SEKTOREN UND SITUATIONEN, jeweils mit Fundort für die Meldung.
  const echteKataloge = new Map(); // feldId -> { ort }
  function ladeQuelle() {
    /* Umzug der Quelle (Schnitt-Reparatur, 18.09.2026), kein neuer Mechanismus: `ladeKern()`
       ohne `KERN_HTML_PATH`-Übergabe lädt `vivodepot.html` UNKONFEKTIONIERT — seit native
       Bereiche als Templates docken, liefert `bereicheAlle()` dort strukturell 0 Sektoren statt
       13 (gemessen), `echteKataloge` blieb leer, die Positivkontrolle war grün, weil sie nichts
       mehr sah, nicht weil nichts dupliziert wurde. Der Kommentar unten „auch ohne vollständig
       lauffähigen Kern (Playwright etc.)" bleibt wahr: `produkt-konfektionieren.js` braucht
       weder Browser noch Playwright, nur Node — dieselbe Grenze, ein anderer Bauweg. `privat-de`,
       nicht `pro-de`: die hier geprüften Wizards (gebwiz/kiwiz/…) referenzieren native
       SEKTOREN-Felder, keine Pro-Bereiche. */
    let V;
    try {
      const { konfektionieren } = require('./produkt-konfektionieren.js');
      const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');
      const fs = require('node:fs');
      const os = require('node:os');
      const privat = PRODUKTE.find((p) => p.slug === 'privat-de');
      const zielOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'w15-privat-de-'));
      try {
        const gebaut = konfektionieren({
          ziel: zielOrdner, slug: privat.slug, modulauswahl: [],
          vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
          unsignierteModulDateien: modulDateienFuer(privat),
        });
        const vorherigerPfad = process.env.KERN_HTML_PATH;
        process.env.KERN_HTML_PATH = path.join(gebaut.ordner, 'vivodepot.html');
        delete require.cache[require.resolve('../tests/load-kern.js')];
        V = require('../tests/load-kern.js').ladeKern().V;
        if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorherigerPfad;
        delete require.cache[require.resolve('../tests/load-kern.js')];
      } finally {
        fs.rmSync(zielOrdner, { recursive: true, force: true });
      }
    } catch (e) {
      // Konfektionieren fehlgeschlagen (z. B. fehlende Abhängigkeit außerhalb des Repos) —
      // fällt auf den rohen Kern zurück, LAUT statt still: eine leere `echteKataloge` durch
      // einen unbemerkten Rückfall ist genau der Fund, der diesen Zug ausgelöst hat.
      process.stderr.write('[w15] Konfektionieren fehlgeschlagen (' + e.message + ') — Rückfall auf den rohen Kern, echteKataloge kann leer bleiben.\n');
      V = ladeKern().V;
    }
    for (const s of V.bereicheAlle()) {
      for (const sek of s.sektionen || []) {
        for (const f of sek.felder || []) {
          if (f.optionen) echteKataloge.set(f.id, { ort: `SEKTOREN.${s.id}.${sek.id}` });
        }
      }
    }
    for (const sit of V.SITUATIONEN || []) {
      for (const block of sit.bloecke || []) {
        for (const eintrag of block.eintraege || []) {
          if (eintrag.feld && eintrag.feld.optionen) echteKataloge.set(eintrag.feld.id, { ort: `SITUATIONEN.${sit.id}` });
        }
      }
    }
    return V;
  }
  const V = ladeQuelle();

  /* EIN SCAN-FENSTER, ABER DAS RICHTIGE (Schnitt-Reparatur Teil 1, 18.09.2026; 21.09.2026 auf eines verengt): der Textsatz-Zug
     (17.09.2026) zerlegte den früheren `WIZARDS = Object.freeze([…])`-Literalblock, an dem die
     vier NACHTRÄGE unten hingen, in zwei getrennte Quellen — die Zeile lautet seither
     `WIZARDS = Object.freeze(_textsatzAufWizardsAnwenden(AB_WERK_KORPUS_WIZARD_QUELLEN.map(…)))`,
     KEIN Literal-Array mehr an dieser Stelle. Ein fünfter Anker auf denselben toten Punkt hätte
     genau das fünfte Mal derselben Fehlerklasse gebaut (leeres/falsches Fenster, s. u.). Gemessen
     (Offsets in DIESEM Baum, Marker vor `WIZARDS=`-Zeile ~433 000 Zeichen auseinander — der Beleg,
     der aus der Vermutung einen Befund machte): AB_WERK_WIZARD_QUELLEN:BEGIN bei Zeichen 1 723 754,
     der alte `WIZARDS = Object.freeze(`-Anker bei 2 157 160, `WIZARD_BY_ID`-Ende bei 2 157 444 —
     das alte Fenster lag vollständig HINTER der Region, in der die Kataloge heute stehen.
     Reale Wizard-Kataloge leben jetzt an EINEM Ort: `AB_WERK_WIZARD_QUELLEN` — Ab-Werk-Bereich mit
     echten BEGIN/END-Markern, JSON-Form NACH DEM BACKEN (gebwiz/anamwiz/pflwiz/heirwiz/umzwiz). Der
     frühere zweite Ort, der Umschlag von pvwiz/kiwiz im Gerüst, trug nie ein Feld mit Optionen und steht
     seit dem 21.09.2026 gar nicht mehr im Gerüst, sondern in der Moduldatei `dokumente`.
     Das Fenster braucht den GEBACKENEN Kern — ein Aufrufer,
     der schon eine bestimmte (ggf. mutierte) Fassung übergibt, meint das absichtlich so (s.
     Rotmachbarkeits-Probe in tests/w15-eine-quelle-statt-kopien.test.js), keine zusätzliche
     Bäckerei obendrauf: gebacken wird NUR, wenn die Marker-Region noch ihren nativen
     Leer-Platzhalter trägt.
     Die Fund-Regex selbst braucht wegen (2) eine zweite Anpassung: JSON.stringify liefert
     `"feld":{"id":"…","optionen":[` (durchweg doppelt zitierte Schlüssel), nicht mehr nur die
     alte JS-Literal-Form `feld: { id: '…', optionen: [` — dieselbe optionale-Anführungszeichen-
     Behandlung wie zuvor schon in tools/anzeigetexte-orten.js, keine neue Technik.
     NACHTRÄGE zur Vorgeschichte des alten Ankers (U2-ADR-250, U2-ADR-346, 17.08.–07.09.2026):
     ein fester Anker auf `WIZARDS = Object.freeze(` ist an genau dieser Stelle VIER Mal
     gebrochen — durch `const`→`let` bei WIZARD_BY_ID, durch `const`→`let` bei WIZARDS selbst,
     und zweimal durch reine Umformulierung der Zeile. Jedes Mal blieb die Positivkontrolle grün,
     weil ein leerer Suchbereich per Definition keine Duplikate enthält — gefangen hat es nur der
     Rot-Beweis (Teil B), der genau dafür gebaut ist. Der Fenster-leer-Fall ist deshalb ab jetzt
     eine EIGENE, laute Prüfung (Teil 2 unten), nicht mehr nur auf den Rot-Beweis angewiesen. */
  const { AB_WERK_REGIONEN, _regionSpanne } = require('./lib/produkt-text-erzeugen.js');
  const wizardRegion = AB_WERK_REGIONEN.find((r) => r.kennung === 'AB_WERK_WIZARD_QUELLEN');
  let htmlGebacken = htmlText;
  {
    const { innenStart, innenEnde } = _regionSpanne(htmlText, wizardRegion, 'w15-eine-quelle-statt-kopien-pruefen (Vorprüfung)');
    const innenNativ = 'const ' + wizardRegion.kennung + ' = ' + wizardRegion.nativerWert + ';';
    if (htmlText.slice(innenStart, innenEnde).trim() === innenNativ) {
      const { _standardProduktBaken } = require('../tests/load-kern.js');
      htmlGebacken = _standardProduktBaken(htmlText);
    }
  }

  const wbStart = htmlGebacken.indexOf(wizardRegion.begin);
  const wbEnde = htmlGebacken.indexOf(wizardRegion.ende);
  if (wbStart < 0 || wbEnde < 0 || wbEnde < wbStart) {
    throw new Error('pruefeAssistentenDuplikate: Marker-Region ' + wizardRegion.kennung + ' nicht '
      + 'gefunden — Kern-Marker verschoben? Nicht raten, nachsehen.');
  }
  const bakedWizardText = htmlGebacken.slice(wbStart + wizardRegion.begin.length, wbEnde);

  // Teil 2 (Schnitt-Reparatur, 18.09.2026), dieselbe Bauform wie in tools/sichten-erheben.js:
  // ein leeres Fenster darf nie „keine Duplikate" heißen. Beide Anker/Marker wurden zwar
  // GEFUNDEN (sonst wäre schon oben geworfen worden), aber ihr Inhalt könnte trotzdem leer sein
  // (z. B. weil die Bäckerei fehlschlug und der native Platzhalter stehen blieb, oder weil eine
  // künftige Umbenennung ZWAR den Anker trifft, aber den falschen Inhalt einschließt). Kein
  // Feld-„id" in BEIDEN Fenstern ist genau der Fall, in dem der Wächter bisher (vier Mal, s.
  // oben) still zufrieden war, obwohl er nichts geprüft hatte.
  const feldIdMuster = /"?id"?\s*:\s*['"][a-zA-Z0-9_]+['"]/;
  if (!feldIdMuster.test(bakedWizardText)) {
    throw new Error('pruefeAssistentenDuplikate: das Scan-Fenster (' + wizardRegion.kennung
      + ') enthält keine einzige Feld-„id" — ein leeres Fenster darf nie '
      + '„keine Duplikate" heißen. Anker/Marker/Bäckerei prüfen, bevor das grün gemeldet wird.');
  }

  // Literale `feld: { id: 'X', ..., optionen: [` bzw. (JSON-Form nach dem Backen)
  // `"feld":{"id":"X",...,"optionen":[` — NICHT über `_katalogOptionen(`/`_situationFeldOptionen(`/
  // `optionenAus`/`katalogOptionenAus` bezogen (die erscheinen nie als `optionen: [`/`"optionen":[`).
  const re = /"?feld"?\s*:\s*\{\s*"?id"?\s*:\s*['"]([a-zA-Z0-9_]+)['"][^}]*?"?optionen"?\s*:\s*\[/g;
  const geprueft = new Set();
  for (const text of [bakedWizardText]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const feldId = m[1];
      geprueft.add(feldId);
      if (echteKataloge.has(feldId)) {
        funde.push({ feldId, katalogOrt: echteKataloge.get(feldId).ort });
      }
    }
  }
  return { funde, geprueft: [...geprueft], katalogeGesamt: echteKataloge.size };
}

function main() {
  const sektorenFunde = pruefeSektorenHandKopien();
  const htmlText = fs.readFileSync(HTML, 'utf8');
  const { funde: assistentenFunde, geprueft, katalogeGesamt } = pruefeAssistentenDuplikate(htmlText);

  console.log(`W-15 · Teil A (Sektorenlisten): ${sektorenFunde.length} Fund(e) in tools/*.js.`);
  for (const f of sektorenFunde) console.log(`  · ${f.datei}: ${f.anzahl} echte Sektor-IDs ohne require('./lib/sektoren.js') — ${f.gefundeneSektoren.join(', ')}`);

  console.log(`W-15 · Teil B (Assistenten-Kataloge): ${assistentenFunde.length} Fund(e), ${geprueft.length} Wizard-Felder mit literalem optionen-Array geprüft gegen ${katalogeGesamt} bekannte Kataloge.`);
  for (const f of assistentenFunde) console.log(`  · Feld „${f.feldId}" trägt eine eigene optionen-Liste im Wizard-Schritt, obwohl ${f.katalogOrt} denselben Feld-id bereits mit optionen führt.`);

  const gesamtFunde = sektorenFunde.length + assistentenFunde.length;
  if (gesamtFunde && CHECK) process.exit(1);
  process.exit(0);
}

if (require.main === module) main();
module.exports = { pruefeSektorenHandKopien, pruefeAssistentenDuplikate, klammerSpannen };
