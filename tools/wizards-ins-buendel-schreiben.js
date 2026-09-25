'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-346 (A2) — FÜNF WIZARDS wandern ins eingebettete Bündel
   ────────────────────────────────────────────────────────────────────────
   Wörtlicher Spiegel von tools/situationen-ins-buendel-schreiben.js (U2-ADR-341b).

   NICHT ALLE SIEBEN: `pvwiz`/`kiwiz` bleiben nativ, endgültig, kein Rest. Ihre `.schritte`
   entstehen aus `PV_BMJ.steps`/`KI_KORPUS.steps`, deren Array-IDENTITÄT über `.splice()`
   erhalten bleiben muss, damit lazy Leser (`PV_MODUL.bezugFuer` u. a.) dieselbe Referenz
   weiterlesen (U2-ADR-344 §3/§4.1) — ein `JSON.parse(JSON.stringify(...))`-Schnappschuss, wie
   dieses Werkzeug ihn für die übrigen fünf Wizards zieht, würde genau diese Identität brechen
   (real getroffen, 06.09.2026: PV_BMJ.steps[].feld.optionen[].label verschwand testweise). Die
   fünf Wizards HIER (gebwiz, anamwiz, pflwiz, heirwiz, umzwiz) haben keinen solchen amtlichen
   Dokument-Bezug — ihr Weg ist der U2-ADR-341b-Weg, nicht der U2-ADR-344-Weg. Zwei Wege,
   zwei Bündel-Schlüssel (`wizards` hier, `dokumente` bei U2-ADR-344), keiner ein Versehen.

   Textsatz-injizierte Eigenschaften (Wizard: titel/einleitung, Schritt: frage, Feld: label/
   beispiel/hilfetext) werden NICHT einzeln ausgelistet, sondern durch den Kern ohne deutschen Satz (seit S8 das rohe Gerüst)
   vermieden — dann injiziert der Mechanismus an KEINER
   Stelle deutschen Text, und `V.WIZARDS` ist die pristine, native Struktur
   (Auflage 1, 06.09.2026). GEMESSEN: mit leerem Katalog verschwinden `titel`/`einleitung`,
   `abschluss.toast`, `frage`, `label`/`beispiel` — der Rest bootet fehlerfrei.

   ZWEITE, DAVON UNABHÄNGIGE MINE (gemessen, nicht angenommen): `_wizardOptionenAusMaterialisieren`
   läuft unabhängig vom Textsatz und würde `geburt_kind_kv`s `optionenAus`-Verweis
   (U2-ADR-341) im Klon SOFORT auflösen — jedes Feld mit `optionenAus` verliert darum sein
   `optionen` beim Schreiben; die Referenz bleibt, der materialisierte Wert nicht.

   Aufruf: node tools/wizards-ins-buendel-schreiben.js [--check]
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = path.join(REPO, 'vivodepot.html');
const NUR_PRUEFEN = process.argv.includes('--check');
const LOAD_KERN_PFAD = path.join(REPO, 'tests', 'load-kern.js');

// U2-ADR-346/344: die Erlaubnisliste steht auch im Kern (`WIZARD_BUENDEL_VERBOTENE_IDS`,
// wörtlicher Zwilling hier) — zwei unabhängige Lesungen derselben Grenze, keine geteilte
// Konstante (dieselbe Bauform wie die übrigen Anker-Paare dieses Abends).
const WIZARD_IDS_UMZIEHBAR = Object.freeze(['gebwiz', 'anamwiz', 'pflwiz', 'heirwiz', 'umzwiz']);
const WIZARD_IDS_NATIV_BLEIBEND = Object.freeze(['pvwiz', 'kiwiz']);

function jsStringSicher(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/* Seit S8 (U2-ADR-428) trägt das Gerüst keinen deutschen Satz mehr: der Kern, der roh aus vivodepot.html geladen wird (KERN_HTML_PATH gesetzt, nicht das gebackene
   Standardprodukt), hat ein leeres Textsatz-Register — genau der Zustand, den früher ein Klon mit geleerter Konstante herstellte. Ein Klon ist darum nicht mehr nötig. */
function textsatzEingebautLeeren(html) {
  return html;
}

function ladeKernMitLeeremTextsatz() {
  const roh = fs.readFileSync(HTML_PFAD, 'utf8');
  const geleert = textsatzEingebautLeeren(roh);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wizards-ins-buendel-'));
  const kernPfad = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(kernPfad, geleert, 'utf8');
  const vorherigerPfad = process.env.KERN_HTML_PATH;
  try {
    process.env.KERN_HTML_PATH = kernPfad;
    delete require.cache[LOAD_KERN_PFAD];
    return require(LOAD_KERN_PFAD).ladeKern();
  } finally {
    if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH;
    else process.env.KERN_HTML_PATH = vorherigerPfad;
    delete require.cache[LOAD_KERN_PFAD];
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* Fund (06.09.2026) — DIESELBE KLASSE WIE `optionenAus`, EINE STUFE TIEFER: acht Wizard-Felder
   lasen ihre `optionen` nativ über `get optionen() { return _katalogOptionen(sektorId, feldId,
   erlaubteWerte); } }` — LIVE, bei jedem Zugriff neu (U2-ADR-304: ein zur Laufzeit angedockter
   Bereich, oder ein leeres SEKTOREN, U2-ADR-312, muss den Assistenten erreichen, nicht nur den
   Bereich selbst). `JSON.parse(JSON.stringify(...))` friert einen Getter zu seinem Wert beim
   Erfassungszeitpunkt ein — GEMESSEN, real getroffen: `heirwiz.familienstand` verlor genau diese
   Lebendigkeit, `tests/sektoren-leer-ueberlebt.test.js` fing es auf.

   GENERISCH GEFUNDEN, NICHT AUS EINER LISTE (Auflage): `_katalogOptionenGetterErheben`
   scannt den NATIVEN Quelltext der fünf Wizards nach dem Getter-Muster selbst UND vergleicht die
   Trefferzahl gegen die am LEBENDEN Objekt (`Object.getOwnPropertyDescriptor`) gefundenen
   Getter — eine neunte Stelle, die eines der beiden Verfahren nicht kennt, lässt die Zahlen
   auseinanderlaufen und wirft, statt lautlos zu fehlen. */
function _katalogOptionenGetterErheben(html) {
  const treffer = new Map();
  const re = /_katalogOptionen\('([a-z-]+)',\s*'([a-z0-9_]+)'(?:,\s*(\[[^\]]*\]))?\)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, sektorId, katalogFeldId, erlaubteWerteText] = m;
    // eslint-disable-next-line no-new-func
    const erlaubteWerte = erlaubteWerteText ? new Function('return ' + erlaubteWerteText)() : undefined;
    if (treffer.has(katalogFeldId)) {
      throw new Error('_katalogOptionenGetterErheben: „' + katalogFeldId + '" mehrfach als '
        + '_katalogOptionen-Zielfeld gefunden — die Zuordnung über den Feldnamen ist dann nicht '
        + 'mehr eindeutig.');
    }
    treffer.set(katalogFeldId, { sektorId, feldId: katalogFeldId, erlaubteWerte });
  }
  return treffer;
}

function feldOptionenAusBereinigen(originalFeld, neuFeld, katalogTreffer, zaehler) {
  if (!neuFeld || typeof neuFeld !== 'object') return;
  if (originalFeld && originalFeld.optionenAus) { delete neuFeld.optionen; }
  else {
    const beschreibung = originalFeld && Object.getOwnPropertyDescriptor(originalFeld, 'optionen');
    if (beschreibung && typeof beschreibung.get === 'function') {
      zaehler.lebendeGetter++;
      const ref = katalogTreffer.get(neuFeld.id);
      if (!ref) {
        throw new Error('feldOptionenAusBereinigen: Feld „' + neuFeld.id + '" hat einen live '
          + '`optionen`-Getter, aber `_katalogOptionenGetterErheben` fand keinen passenden '
          + '`_katalogOptionen`-Aufruf im Quelltext — Feldname geändert, oder ein neues '
          + 'Getter-Muster, das dieses Werkzeug noch nicht kennt.');
      }
      delete neuFeld.optionen;
      neuFeld.katalogOptionenAus = ref;
      zaehler.zugeordnet++;
    }
  }
  if (Array.isArray(neuFeld.unterFelder)) {
    const origUnter = (originalFeld && Array.isArray(originalFeld.unterFelder)) ? originalFeld.unterFelder : [];
    neuFeld.unterFelder.forEach((uf, i) => feldOptionenAusBereinigen(origUnter[i], uf, katalogTreffer, zaehler));
  }
}

function wizardOhneMaterialisierteOptionen(wizard, katalogTreffer, zaehler) {
  const neu = JSON.parse(JSON.stringify(wizard));
  const schritte = Array.isArray(neu.schritte) ? neu.schritte : [];
  const origSchritte = Array.isArray(wizard.schritte) ? wizard.schritte : [];
  for (let i = 0; i < schritte.length; i++) {
    if (schritte[i] && schritte[i].feld) {
      feldOptionenAusBereinigen(origSchritte[i] && origSchritte[i].feld, schritte[i].feld, katalogTreffer, zaehler);
    }
  }
  return neu;
}

/* KEIN „ohne frage werfen" hier — anders als bei `_pvwizEigeneSchritte` (U2-ADR-344, live
   Getter, außerhalb dieses Werkzeugs) ist bei den fünf Wizards HIER JEDER Schritt regulär
   textsatz-getrieben: `frage` fehlt im Klon für ALLE, nicht nur einen Sonderfall — genau wie
   `titel`/`einfuehrung` bei SITUATIONEN (U2-ADR-341b) IMMER fehlen. Das ist der Normalfall,
   kein Fund. Die Zusicherung, die zählt, sitzt im Kern selbst: `_wizardAusBuendelErzeugen`
   ruft `_textsatzAufWizardsAnwenden([neu])`, und der Anwender baut `moduleDefs` beim Bootstrap
   aus dem so entstandenen, LEBENDEN `WIZARD_BY_ID[wizardId].schritte` — nicht aus diesem
   Bündel-Eintrag direkt (s. Kommentar bei `buergermodulBuendelAnwenden`s Wizard-Zweig). */
function wizardsAlsObjekt(WIZARDS, html) {
  const katalogTreffer = _katalogOptionenGetterErheben(html);
  const zaehler = { lebendeGetter: 0, zugeordnet: 0 };
  const o = {};
  for (const w of WIZARDS) {
    if (!w || !w.id) continue;
    if (!WIZARD_IDS_UMZIEHBAR.includes(w.id)) continue;
    const eintrag = wizardOhneMaterialisierteOptionen(w, katalogTreffer, zaehler);
    delete eintrag.id; // die ID ist der Schlüssel, nicht auch noch ein Feld im Wert (Spiegel `situationen`/`bereiche`)
    o[w.id] = eintrag;
  }
  const fehlend = WIZARD_IDS_UMZIEHBAR.filter((id) => !o[id]);
  if (fehlend.length) {
    throw new Error('wizards-ins-buendel-schreiben: WIZARD_IDS_UMZIEHBAR nennt ' + fehlend.join(', ')
      + ', aber im nativen Bestand nicht gefunden — umbenannt oder entfernt?');
  }
  // Auflage: die generische Erhebung (Quelltext-Regex) und der lebende Bestand
  // (Property-Deskriptor) müssen dieselbe Zahl finden — eine dritte, unabhängig gebaute Kontrolle,
  // die eine neunte Stelle fängt, egal welches der beiden Verfahren sie zuerst verpasst hätte.
  if (katalogTreffer.size !== zaehler.lebendeGetter || zaehler.zugeordnet !== katalogTreffer.size) {
    throw new Error('wizards-ins-buendel-schreiben: Quelltext-Erhebung fand ' + katalogTreffer.size
      + ' `_katalogOptionen`-Aufrufe, der lebende Bestand ' + zaehler.lebendeGetter + ' Getter, '
      + zaehler.zugeordnet + ' zugeordnet — alle drei Zahlen müssen gleich sein.');
  }
  if (katalogTreffer.size === 0) {
    throw new Error('wizards-ins-buendel-schreiben: keinen einzigen `_katalogOptionen`-Getter '
      + 'gefunden — Muster geändert, oder die acht Stellen sind alle verschwunden. Ein '
      + 'Durchlauf, der nichts findet, darf nicht grün aussehen.');
  }
  return o;
}

/* Fund (06.09.2026, im Anschluss an `ce`s Fund am selben Anker in
   tools/situationen-ins-buendel-schreiben.js): `html.indexOf("');")` ist NICHT escape-bewusst —
   trägt der Bündel-Inhalt ein escapetes `\"` oder eine Zeichenfolge, die zufällig `');` ergibt,
   schneidet der Anker zu früh. Bislang traf es niemanden nur, weil kein bisheriger Bündel-Inhalt
   diese Zeichenfolge enthielt — „Glück der Daten, kein Beleg für richtigen Code" (zitiert nach `ce`). Wizard-Texte (Fragen, Hilfetexte, ggf. amtliche Zitate) sind dafür
   anfälliger als der bisherige Bestand. Diese Funktion scannt darum escape-bewusst bis zum
   ERSTEN unescapeten `'` und wirft, wenn direkt danach nicht `);` folgt — kein Raten, kein
   Weiterschneiden auf Verdacht. */
function jsSingleQuoteStringEnde(html, start) {
  let i = start;
  while (i < html.length) {
    const c = html[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'") return i;
    i++;
  }
  throw new Error('jsSingleQuoteStringEnde: kein unescapetes Ende-Anführungszeichen gefunden — '
    + 'Zeichenkette bis Dateiende offen, das kann nicht stimmen');
}

function buendelMitWizardsSchreiben(html, wizardsObjekt) {
  const startMarker = "const BUERGERMODUL_BUENDEL = JSON.parse('";
  const i = html.indexOf(startMarker);
  if (i < 0) throw new Error('Anker BUERGERMODUL_BUENDEL nicht gefunden');
  const start = i + startMarker.length;
  const stringEnde = jsSingleQuoteStringEnde(html, start);
  if (html.slice(stringEnde, stringEnde + 2) !== ');') {
    throw new Error('buendelMitWizardsSchreiben: nach dem Zeichenketten-Ende folgt nicht `);` — '
      + 'gefunden: „' + html.slice(stringEnde, stringEnde + 10) + '…". Kein Weiterschneiden auf '
      + 'Verdacht.');
  }
  const j = stringEnde;
  const jsonText = html.slice(start, j);
  const bestehend = JSON.parse(jsonText.replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  if (bestehend.wizards) throw new Error('BUERGERMODUL_BUENDEL trägt bereits einen wizards-Schlüssel — nicht überschreiben, sondern prüfen, was da ist');
  bestehend.wizards = wizardsObjekt;
  const neuJson = JSON.stringify(bestehend);
  return html.slice(0, start) + jsStringSicher(neuJson) + html.slice(j);
}

/* Findet die [start, ende)-Spanne JEDES Top-Level-Eintrags im WIZARDS-Array per Klammertiefe —
   kein Klammern-ZÄHLEN über den ganzen Block (fehleranfällig bei ~300 Zeilen verschachtelter
   Objekte), sondern ein echter Scan, der bei Tiefe 0 (relativ zum Array-Anfang) das Ende jedes
   `{ id: '…', … }`-Eintrags erkennt. */
function wizardEintragsSpannen(arrayInhalt) {
  const spannen = [];
  let tiefe = 0;
  let start = -1;
  for (let i = 0; i < arrayInhalt.length; i++) {
    const c = arrayInhalt[i];
    if (c === '{') {
      if (tiefe === 0) start = i;
      tiefe++;
    } else if (c === '}') {
      tiefe--;
      if (tiefe === 0 && start >= 0) {
        spannen.push([start, i + 1]);
        start = -1;
      }
    }
  }
  return spannen;
}

/* Entfernt die FÜNF umziehbaren Wizard-Einträge (samt ihrem eigenen, direkt vorangehenden
   Kommentarblock) aus dem nativen Array-Literal — `pvwiz`/`kiwiz` UND alles außerhalb der
   fünf Einträge (Kommentare zwischen ihnen, die zu WEDER Nachbarn gehören) bleibt unberührt. */
function nativenWizardsTeilweiseLeeren(html) {
  const anker = 'let WIZARDS = Object.freeze(_textsatzAufWizardsAnwenden([';
  const start = html.indexOf(anker);
  if (start < 0) throw new Error('Anker WIZARDS-Deklaration nicht gefunden');
  const inhaltStart = start + anker.length;
  const endeMarker = 'let WIZARD_BY_ID';
  const endeIdx = html.indexOf(endeMarker, inhaltStart);
  if (endeIdx < 0) throw new Error('Anker WIZARD_BY_ID nicht gefunden');
  const listenEnde = html.lastIndexOf(']));', endeIdx);
  if (listenEnde <= inhaltStart) throw new Error('schließende Listenklammer nicht gefunden');

  const arrayInhalt = html.slice(inhaltStart, listenEnde);
  const spannen = wizardEintragsSpannen(arrayInhalt);
  const idMuster = /^\s*\{\s*id:\s*'([a-z]+)'/;
  const eintraege = spannen.map(([a, b]) => {
    const text = arrayInhalt.slice(a, b);
    const m = idMuster.exec(text);
    if (!m) throw new Error('wizards-ins-buendel-schreiben: Eintrag ohne erkennbare `id:` — ' + text.slice(0, 60));
    return { id: m[1], start: a, ende: b };
  });
  const gefundeneIds = eintraege.map((e) => e.id);
  for (const id of WIZARD_IDS_UMZIEHBAR) {
    if (!gefundeneIds.includes(id)) throw new Error('wizards-ins-buendel-schreiben: Eintrag „' + id + '" nicht im Array gefunden');
  }
  for (const id of WIZARD_IDS_NATIV_BLEIBEND) {
    if (!gefundeneIds.includes(id)) throw new Error('wizards-ins-buendel-schreiben: nativ bleibender Eintrag „' + id + '" nicht gefunden — verschoben?');
  }

  // Entfernungs-Spanne je umziehbarem Eintrag: vom ENDE des vorherigen Eintrags (oder Array-
  // Anfang) bis zum ENDE dieses Eintrags — damit der eigene, vorangehende Kommentarblock
  // mitgeht, nicht der Kommentar des Vorgängers.
  let neuerInhalt = '';
  let cursor = 0;
  for (let k = 0; k < eintraege.length; k++) {
    const e = eintraege[k];
    const vorherigesEnde = k === 0 ? 0 : eintraege[k - 1].ende;
    if (WIZARD_IDS_UMZIEHBAR.includes(e.id)) {
      neuerInhalt += arrayInhalt.slice(cursor, vorherigesEnde);
      cursor = e.ende;
    }
  }
  neuerInhalt += arrayInhalt.slice(cursor);

  return html.slice(0, inhaltStart) + neuerInhalt + html.slice(listenEnde);
}

function main() {
  const html0 = fs.readFileSync(HTML_PFAD, 'utf8');
  const { V } = ladeKernMitLeeremTextsatz();
  const wizards = wizardsAlsObjekt(V.WIZARDS, html0);
  const anzahl = Object.keys(wizards).length;
  console.log('wizards-ins-buendel-schreiben: ' + anzahl + ' Wizards aus dem nativen Bestand (Klon, '
    + 'Textsatz leer) gelesen: ' + Object.keys(wizards).join(', '));

  if (anzahl !== WIZARD_IDS_UMZIEHBAR.length) {
    throw new Error('Erwartet ' + WIZARD_IDS_UMZIEHBAR.length + ' umziehbare Wizards, gefunden ' + anzahl);
  }

  if (NUR_PRUEFEN) {
    console.log('--check: nur gemessen, nichts geschrieben.');
    return;
  }

  let html = html0;
  html = buendelMitWizardsSchreiben(html, wizards);
  html = nativenWizardsTeilweiseLeeren(html);
  fs.writeFileSync(HTML_PFAD, html);
  console.log('geschrieben: fünf Wizards im Bündel, ihre nativen Einträge entfernt — pvwiz/kiwiz unberührt.');
}

if (require.main === module) require('./lib/buendel-migration-schranke.js').starten('wizards-ins-buendel-schreiben', HTML_PFAD, () => main());
module.exports = {
  textsatzEingebautLeeren, feldOptionenAusBereinigen, wizardOhneMaterialisierteOptionen,
  _katalogOptionenGetterErheben, wizardsAlsObjekt, buendelMitWizardsSchreiben,
  wizardEintragsSpannen, nativenWizardsTeilweiseLeeren, jsStringSicher, jsSingleQuoteStringEnde,
  WIZARD_IDS_UMZIEHBAR, WIZARD_IDS_NATIV_BLEIBEND,
};
