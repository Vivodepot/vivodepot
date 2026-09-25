#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   bereich-umzug-rundlauf-pruefen.js — Fidelity-Wächter für den Bereich-Umzug
   (DoD-Umbau „Gerüst/Templates/Module", 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   PRÜFT GENAU EINES: verschwindet Inhalt, wenn ein Bereich als `modulTyp:'bereich'`-
   Datei über `AB_WERK_BEREICH_QUELLEN` in einen Depot-Kern eingebacken wird?

   SCHNITT-NACHTRAG (17.09.2026): bis zum Schnitt lebte ein Bereich an einer
   von drei Stellen im nativen Kern (bundle/eingebaut/ersatz) — die ERSTE Fassung
   dieses Werkzeugs verglich SEKTOR_BY_ID VOR und NACH einem simulierten Umzug aus
   einer dieser drei Stellen. Mit dem Schnitt (BUERGERMODUL_BUENDEL entfernt,
   BEREICH_QUELLEN_EINGEBAUT entfernt, bereichsErsatz retired) gibt es keine dieser
   drei Stellen mehr — bereicheAlle() im nativen Kern liefert 0. Der Vergleich läuft
   seither gegen die MODUL-DATEI SELBST als Referenz (ihr eigenes `.bereiche.<id>`,
   VOR jeder Einbackung) statt gegen einen nativen Kern-Zustand — dieselbe Fidelity-
   Frage („kommt der Inhalt unverändert an"), nur die Quelle der Wahrheit ist jetzt
   die Datei, nicht mehr der Kern. `QUELLEN` ist seither nur noch `['modul']`.

   WARUM ES DIESES WERKZEUG BRAUCHT — GEMESSEN, NICHT VERMUTET (17.09.2026):
   ein erster Handtest verglich `SEKTOR_BY_ID[id]` ohne geöffnetes Depot — die volle
   Ab-Werk-Kette (`_bereichModulAbWerkSeed`/`_sektorIndexNeuBauen` mit der Saat) läuft
   aber erst bei `depotAnlegen()`. Der Handtest zeigte darum eine Abweichung, die es bei
   korrektem Aufbau nicht gibt. Elf weitere Bereiche wandern, verteilt auf mehrere
   Sitzungen — genau dieser Fehler (Vergleich ohne geöffnetes Depot) wiederholt sich sonst
   bei jeder einzelnen. Darum ein Werkzeug im Repo, nicht ein Skript im Kopf.

   WAS ES NICHT PRÜFT: ob das Rezept eines Produkts die richtigen Bereiche NENNT (das ist
   Gateway-/Konfektionierer-Ebene, s. `tools/konfektion-nativ-vergleichen.js`
   `nativVergleichenMitBereichsErsatz` als Vorbild für eine spätere, dort anzusiedelnde
   Generalisierung auf `AB_WERK_BEREICH_QUELLEN`). Dieses Werkzeug prüft nur die KERN-Fidelity:
   überlebt der Bereich den Ortswechsel inhaltlich unverändert.

   BEKANNTE, GEWÄCHTERTE ABWEICHUNG (kein Fund, keine Ausnahme, die stillschweigend
   toleriert wird — benannt): der Ab-Werk-Weg setzt `angedockt:true` und
   `herkunft:'ab-werk'` auf jeden gesäten Bereich. Für eine ID aus `BEREICH_IDS_EINGEBAUT`
   ist das folgenlos — `_bereichFremdeMarkeHerkunft()` (vivodepot.html) gibt für jede
   solche ID `null` zurück, unabhängig von diesen beiden Feldern. Dieses Werkzeug ignoriert
   sie beim Vergleich AUSDRÜCKLICH, mit Begründung, nicht kommentarlos.

   ECHTER FUND, KEINE WERKZEUG-ABWEICHUNG (17.09.2026, `-d2` an `identity`): Bereiche mit
   `.exporte[].labelSchluessel` (statt `.label`) verlieren ihre Export-Beschriftung auf dem
   Ab-Werk-Weg — `_exportBeschriftungenAnhaengen()` (vivodepot.html ~28594) löst den
   Schlüssel nur auf dem BÜNDEL/`bereichsErsatz`-Erzeugungsweg (`_bereichAusBuendelErzeugen`)
   auf, NICHT auf dem Bereichs-Modul-Registry-Weg, den `AB_WERK_BEREICH_QUELLEN`/
   `BEREICH_QUELLEN_EINGEBAUT`/Depot-Module nehmen (`_templateExportePruefen`,
   vivodepot.html ~15642, reicht `.exporte` unverändert durch). Dieses Werkzeug MELDET das
   korrekt als Abweichung — das ist der Wächter, der funktioniert, nicht ein Fehler in ihm.
   Der Fix gehört in den Kern (Registry-Weg muss dieselbe Auflösung bekommen), nicht hier.

   Aufruf:
     node tools/bereich-umzug-rundlauf-pruefen.js
       — ohne Argument: prüft die Fixture unter tests/fixtures/bereich-umzug-rundlauf/
         (Bereich `mobility` — stehende Regel: Prüfwerkzeuge laufen ohne Argument gegen
         Fixtures im Repo, damit die Suite sie auch ohne den zu prüfenden echten Bestand
         mitfährt).
     node tools/bereich-umzug-rundlauf-pruefen.js --bereich <id> [--modul <pfad>]
       — prüft einen echten Bereich: liest `.bereiche.<id>` aus der Modul-Datei (Standard
         ohne --modul: `tools/bereich-templates/vivodepot-<id>.json`) und vergleicht sie
         gegen SEKTOR_BY_ID[<id>] nach dem Einbacken über AB_WERK_BEREICH_QUELLEN.
     node tools/bereich-umzug-rundlauf-pruefen.js --kern <pfad>
       — Kern-Datei überschreiben (Standard: vivodepot.html neben diesem Werkzeug),
         für Proben aus einem anderen Arbeitsbaum.
   ════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');

const REPO = path.join(__dirname, '..');
const QUELLEN = Object.freeze(['modul']);

function _argWert(name) {
  const i = process.argv.indexOf(name);
  return (i >= 0 && process.argv[i + 1]) ? process.argv[i + 1] : null;
}

// Schlüssel, die der Ab-Werk-Weg zusätzlich setzt und die für eine BEREICH_IDS_EINGEBAUT-ID
// folgenlos sind (s. Kopf-Kommentar) — beim Vergleich ignoriert, nicht Teil der Fidelity-Aussage.
// `label`/`einfuehrungstext`/`navUnterzeile` NUR an der SEKTOR-WURZEL (nicht rekursiv, s. u.):
// `_textsatzAufSektorenAnwenden` setzt sie auf JEDEN Sektor, unabhängig vom Ursprung — vor dem
// Schnitt standen sie auf beiden Vergleichsseiten gleich (beide bereits textsatz-behandelt) und
// fielen nie auf; jetzt ist die Referenz die rohe, nie textsatz-behandelte Modul-Datei.
const IGNORIERTE_SCHLUESSEL = Object.freeze(['angedockt', 'herkunft', 'label', 'einfuehrungstext', 'navUnterzeile']);

// Schnitt-Nachtrag (17.09.2026): die Referenz ist jetzt die ROHE Modul-Datei (nie durch
// `_textsatzAufSektorenAnwenden` gelaufen — dieselbe Regel wie in tools/kennung-wanderung-
// pruefen.js: „Text kommt immer aus der Sprachachse, nie aus dem Modul"), das Materialisat dagegen
// IMMER (jeder Boot, unabhängig vom Bereich-Ursprung). Vor dem Schnitt verglich dieses Werkzeug
// zwei bereits textsatz-behandelte Zustände (nativ vs. umgezogen) — dieselbe TEXT_ROLLEN-Liste
// stand auf beiden Seiten gleich und fiel nie auf. Dieselbe Liste wie dort, nicht neu erfunden.
// NUR IN `sektionen` entfernt, NICHT überall (Fund 17.09.2026, an `identity` gemessen): `exporte[].
// label` ist KEINE Textsatz-Zugabe, sondern der lebendige Getter aus `_exportBeschriftungenAnhaengen`
// — genau das, was dieses Werkzeug prüfen soll (der A558-artige Fund vom selben Tag). Eine blinde
// Rekursion über das GANZE Objekt hätte diesen echten Verlust stillschweigend mitgestrichen.
const { TEXT_ROLLEN } = require('./kennung-wanderung-pruefen.js');
function _ohneTextRollenRekursiv(wert) {
  if (Array.isArray(wert)) return wert.map(_ohneTextRollenRekursiv);
  if (wert && typeof wert === 'object') {
    const kopie = {};
    for (const [k, v] of Object.entries(wert)) {
      if (TEXT_ROLLEN.includes(k)) continue;
      kopie[k] = _ohneTextRollenRekursiv(v);
    }
    return kopie;
  }
  return wert;
}

function _ohneIgnorierteSchluessel(objekt) {
  const kopie = Object.assign({}, objekt);
  for (const k of IGNORIERTE_SCHLUESSEL) delete kopie[k];
  if (kopie.sektionen) kopie.sektionen = _ohneTextRollenRekursiv(kopie.sektionen);
  return kopie;
}

/* `exporte[].labelSchluessel` (deklariert) → `exporte[].label` (materialisiert, lebendiger
   Getter aus `_exportBeschriftungenAnhaengen`, vivodepot.html ~28704) — eine GEWOLLTE
   Umbenennung, kein Verlust, s. Kopf-Kommentar „BEKANNTE, GEWÄCHTERTE ABWEICHUNG". VOR dem
   Vergleich normalisiert, damit isDeepStrictEqual nicht auf die Umbenennung selbst anschlägt —
   aber HART geprüft, dass die Auflösung wirklich stattfand (ein `label` von `undefined`/fehlend
   ist der ECHTE Fund vom 17.09.2026, keine Formalie, s. Kopf-Kommentar). */
function _exportLabelAufloesungNormalisieren(deklariert, materialisiert) {
  if (!Array.isArray(deklariert.exporte)) return; // kein exporte-Schlüssel: nichts zu normalisieren, nichts erfinden
  const dExporte = deklariert.exporte;
  const mExporte = Array.isArray(materialisiert.exporte) ? materialisiert.exporte : [];
  if (dExporte.length !== mExporte.length) return; // Längen-Abweichung: isDeepStrictEqual soll das selbst melden
  const dNeu = dExporte.map((e, i) => {
    if (!e || typeof e.labelSchluessel !== 'string') return e;
    const m = mExporte[i];
    if (!m || typeof m.label !== 'string' || !m.label.trim()) {
      throw new Error('exporte[' + i + '].labelSchluessel "' + e.labelSchluessel + '" löst NICHT zu einem '
        + 'echten .label auf (bekommen: ' + JSON.stringify(m && m.label) + ') — echter Verlust, keine Formalie.');
    }
    const kopie = Object.assign({}, e);
    delete kopie.labelSchluessel;
    kopie.label = m.label;
    return kopie;
  });
  deklariert.exporte = dNeu;
}

/* Baut aus dem geladenen Kern-Text + einer Modul-Datei einen temporären, veränderten Kern:
   das Modul kommt über `AB_WERK_BEREICH_QUELLEN` hinein — derselbe Weg, den der
   Konfektionierer später fährt. Seit dem Schnitt (17.09.2026) die einzige Bahn: es gibt
   keine native Quelle mehr, aus der ein Bereich zuerst entfernt werden müsste. */
function _kernMitUmzugBauen(kernText, modul) {
  const regionMatch = kernText.match(/const AB_WERK_BEREICH_QUELLEN = Object\.freeze\(\[\]\);/);
  if (!regionMatch) {
    throw new Error('AB_WERK_BEREICH_QUELLEN (leere Region) nicht gefunden — '
      + 'schon befüllt, oder Region umbenannt/entfernt?');
  }
  const modulListeJs = '[' + JSON.stringify(modul) + ']';
  return kernText.replace(regionMatch[0],
    'const AB_WERK_BEREICH_QUELLEN = Object.freeze(' + modulListeJs + ');');
}

async function _sektorNachDepotAnlegen(kernPfad, passphrase) {
  const vorherigerPfad = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  await V.depotAnlegen(passphrase);
  if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorherigerPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  return V;
}

/* Der eigentliche Rundlauf — rein, außer dem einen Dateisystem-Nebeneffekt (Temp-Datei), der
   danach immer aufgeräumt wird, auch bei einem Wurf. Rückgabe statt process.exit, damit die
   Suite (`tests/bereich-umzug-rundlauf-pruefen.test.js`) es direkt verwenden kann.
   Referenz ist die MODUL-DATEI SELBST (ihr eigenes `.bereiche.<id>`), nicht mehr ein nativer
   Kern-Zustand — s. Kopf-Kommentar, Schnitt-Nachtrag 17.09.2026. `quelle` bleibt im Rückgabewert
   ('modul', fest) für Aufrufer, die es aus der Zeit vor dem Schnitt noch lesen. */
async function bereichUmzugPruefen({ kernPfad, bereichId, modul }) {
  if (!modul || !modul.bereiche || !modul.bereiche[bereichId]) {
    throw new Error('Bereich "' + bereichId + '" nicht in der Modul-Datei (.bereiche.' + bereichId + ' fehlt).');
  }
  // S8 (U2-ADR-428): das nackte Gerüst trägt keinen deutschen Satz — die Beschriftungen (labelSchluessel) lösen erst im Produkt auf. Ein nacktes Gerüst wird
  // darum um das deutsche Standardprodukt OHNE seine Bereichs-Module ergänzt (die Bereichs-Region bleibt leer); ein Produkt oder eine Kopie mit Sprachmodul bleibt, wie es ist.
  let kernTextNativ = fs.readFileSync(kernPfad, 'utf8');
  if (/const AB_WERK_SPRACHE_PRODUKT = null;/.test(kernTextNativ)) {
    kernTextNativ = require(path.join(REPO, 'tests', 'load-kern.js'))._standardProduktBaken(kernTextNativ, { ohneBereiche: true });
  }
  const sektorDeklariert = _ohneIgnorierteSchluessel(JSON.parse(JSON.stringify(modul.bereiche[bereichId])));

  const kernTextUmgezogen = _kernMitUmzugBauen(kernTextNativ, modul);
  const tmp = path.join(os.tmpdir(), 'vivodepot-bereich-umzug-rundlauf-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, kernTextUmgezogen, 'utf8');
  let sektorUmgezogen;
  try {
    const umgezogen = await _sektorNachDepotAnlegen(tmp, 'bereich-umzug-rundlauf-probe-pw');
    if (!umgezogen.SEKTOR_BY_ID[bereichId]) {
      throw new Error('Bereich "' + bereichId + '" ist nach dem Einbacken NICHT in '
        + 'SEKTOR_BY_ID — das Modul kam nicht an (Validierung gescheitert, falsche Region-Kennung?).');
    }
    sektorUmgezogen = _ohneIgnorierteSchluessel(JSON.parse(JSON.stringify(umgezogen.SEKTOR_BY_ID[bereichId])));
  } finally {
    fs.unlinkSync(tmp);
  }

  // isDeepStrictEqual statt JSON.stringify-Vergleich: der Einlassweg (bereichsModulPruefen)
  // baut das Ergebnisobjekt mit einer ANDEREN Schlüsselreihenfolge als die Modul-Datei selbst
  // (gemessen 17.09.2026 — gleiche Schlüssel, gleiche Werte, verschiedene Einfügereihenfolge).
  // JSON.stringify ist reihenfolgeempfindlich und meldete darum eine Abweichung, die keine war.
  _exportLabelAufloesungNormalisieren(sektorDeklariert, sektorUmgezogen);
  const gleich = isDeepStrictEqual(sektorDeklariert, sektorUmgezogen);
  return {
    gleich,
    bereichId,
    quelle: 'modul',
    schluesselNativ: Object.keys(sektorDeklariert).sort(),
    schluesselUmgezogen: Object.keys(sektorUmgezogen).sort(),
    sektorNativ: sektorDeklariert,
    sektorUmgezogen,
  };
}

function main() {
  const bereichArg = _argWert('--bereich');
  const kernArg = _argWert('--kern');
  const modulArg = _argWert('--modul');

  let kernPfad, bereichId, modulPfad;
  if (bereichArg) {
    kernPfad = kernArg ? path.resolve(kernArg) : path.join(REPO, 'vivodepot.html');
    bereichId = bereichArg;
    modulPfad = modulArg
      ? path.resolve(modulArg)
      : path.join(REPO, 'tools', 'bereich-templates', 'vivodepot-' + bereichArg + '.json');
  } else {
    // Ohne Argument: gegen die Fixture, damit die Suite dieses Werkzeug auch ohne den
    // vollständigen, noch im Bau befindlichen Bestand mitfährt (stehende Regel).
    kernPfad = kernArg ? path.resolve(kernArg) : path.join(REPO, 'vivodepot.html');
    bereichId = 'mobility';
    modulPfad = path.join(REPO, 'tests', 'fixtures', 'bereich-umzug-rundlauf', 'vivodepot-fixture-bereich.json');
  }

  if (!fs.existsSync(modulPfad)) {
    console.error('bereich-umzug-rundlauf-pruefen: Modul-Datei nicht gefunden: ' + modulPfad);
    process.exit(1);
  }
  let modul;
  try { modul = JSON.parse(fs.readFileSync(modulPfad, 'utf8')); }
  catch (e) { console.error('bereich-umzug-rundlauf-pruefen: Modul-Datei kein gültiges JSON: ' + e.message); process.exit(1); }

  bereichUmzugPruefen({ kernPfad, bereichId, modul }).then((ergebnis) => {
    if (ergebnis.gleich) {
      console.log('bereich-umzug-rundlauf-pruefen: OK — "' + ergebnis.bereichId + '" (Quelle: ' + ergebnis.quelle
        + ') überlebt den Umzug inhaltlich unverändert (ignoriert: ' + IGNORIERTE_SCHLUESSEL.join(', ') + ').');
      process.exit(0);
    } else {
      console.error('bereich-umzug-rundlauf-pruefen: ABWEICHUNG bei "' + ergebnis.bereichId + '" (Quelle: '
        + ergebnis.quelle + ') — der Umzug verändert Inhalt.');
      console.error('  Schlüssel nativ    : ' + ergebnis.schluesselNativ.join(', '));
      console.error('  Schlüssel umgezogen: ' + ergebnis.schluesselUmgezogen.join(', '));
      process.exit(1);
    }
  }).catch((e) => {
    console.error('bereich-umzug-rundlauf-pruefen: FEHLER — ' + e.message);
    process.exit(1);
  });
}

if (require.main === module) main();
module.exports = {
  bereichUmzugPruefen, IGNORIERTE_SCHLUESSEL, QUELLEN,
  _kernMitUmzugBauen,
};
