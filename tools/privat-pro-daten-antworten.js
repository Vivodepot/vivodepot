#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Dieselbe Datei gibt in Privat und Pro dieselben DATEN-Antworten (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Produktentscheidung vom 16.09.2026: Privat und Pro dürfen sich in der SICHTBARKEIT
   unterscheiden, nicht in dem, was sie über Daten sagen. Am selben Tag wurden drei Schranken
   derselben Klasse von Hand gefunden (Modul-Prüfung, Feldkatalog, Merkmale und Rollen) — jede
   fragte den Anzeige-Index, wo sie den Katalog meinte. Dieses Werkzeug sucht die Klasse, statt
   einzelne Stellen aufzuzählen.

   WIE:
   1. Zwei Dateien, beide in Pro angelegt und verschlüsselt gesichert:
      - `voll`: jedes Feld jedes Bereichs, den das Produkt kennt (Bürger- UND Pro-Bereiche), trägt
        einen Wert nach seinem Feldtyp. Alles ist wach.
      - `leer`: ein frisches Depot ohne einen einzigen Wert. In Pro RUHEN dann die Bürger-Bereiche.
      Beides braucht es: die Klasse, gegen die das Werkzeug gebaut ist, zeigt sich an RUHENDEN
      Bereichen. Im vollen Depot ist keiner ruhend — ein Anzeige-Index, der dort den Katalog
      vertritt, fällt dort nicht auf. Gemessen am 16.09.2026: `bereichRolle` auf den Anzeige-Index
      zurückgebaut meldet `leer` sofort, `voll` gar nicht.
   2. Dieselbe Datei geöffnet in Privat und in Pro derselben Sprache, je in einem frischen Kern.
   3. Die Funktionen werden aus dem QUELLTEXT gesammelt: jede Funktion auf oberster Ebene mit einem
      Parameter `sektorId`. Keine Handliste — kommt eine neue hinzu, wird sie ohne Zutun gefragt.
   4. Die übrigen Parameter werden nach einer NAMENSREGEL belegt (PARAMETER_REGEL unten), nicht je
      Funktion. Ein Name ohne Regel bleibt `undefined` und wird im Ergebnis benannt.
   5. Beide Kerne bekommen dieselben Eingaben; verglichen wird die kanonisch serialisierte Antwort.
      Dazu `depotNormalisieren` und `vollExportJSON` auf demselben Datenstand.

   AUSGENOMMEN wird nur, was benannt ist (AUSNAHMEN, mit Art und Grund): Anzeige-Funktionen, deren
   Antwort abweichen DARF, und Funktionen, die schreiben. Eine Funktion, die beim Aufruf die Daten
   verändert und NICHT ausgenommen ist, steht im Ergebnis unter `unbenanntSchreibend` — der Wächter
   macht daraus Rot, damit niemand eine schreibende Funktion still mitlaufen lässt.

   GRENZE DIESER ERKENNUNG, gemessen am 16.09.2026: sie sieht nur, was sich in `getData()` ändert.
   Eine Funktion, die in anderen Kern-Zustand schreibt, fällt hier nicht auf — ihre Folgen tauchen
   dann als Scheinfund in LATEREN Funktionen auf. So erschienen im zweiten Erkundungslauf
   `erkennungsVorschlaege` und 30 zurückgehaltene Dokumente als Abweichung, solange
   `_dokumentTypRegistrieren` und `dokumentAusStandard` noch mitliefen; mit beiden auf der
   Ausnahmeliste verschwanden beide Funde. Ein neuer Fund, der nach einer neuen Funktion auftaucht,
   ist darum zuerst auf diese Ursache zu prüfen.

   Aufruf:  node tools/privat-pro-daten-antworten.js [--sprache de|en] [--szenario voll|leer] [--aus DATEI]
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('./produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const LOAD_KERN = path.join(REPO, 'tests', 'load-kern.js');
const PASSWORT = 'privat-pro-daten-antworten-2026';
const JETZT = '2026-09-16T10:00:00.000Z';
const MAX_AUFRUFE_JE_FUNKTION_UND_BEREICH = 200;

/* Wer hier steht, wird NICHT verglichen. Jede Zeile trägt ihre Art und ihren Grund; eine Zeile,
   deren Funktion es im Kern nicht mehr gibt, macht der Wächter rot. */
const AUSNAHMEN = Object.freeze({
  _bereichFremdeMarkeHerkunft: { art: "anzeige", grund: "Anzeige: entscheidet, ob ein Bereich im Rahmen einer fremden Marke erscheint. In Privat stammen die Pro-Bereiche aus der Mitschrift einer fremden Datei, in Pro sind sie eigen; das soll sich unterscheiden." },
  templateAbschnitteHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  _blattVorschlagZeileHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  dokumentPanelHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen. Gemessen: nur der Aufklapp-Zustand des Panels weicht ab." },
  verdrahteDokumentPanel: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  logikModulAuszugKartenHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  vorsorgeRegalHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  nichtInstrumentSprunglisteHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  verdrahteSektorAktionen: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  verdrahteSektorEingaben: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  feldgruppenKarteHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  feldZeileHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  feldGueltigkeitZeileHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  ausdruecklichKeineZeileHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  stellenRegisterHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  urheberschaftZeileHTML: { art: "anzeige", grund: "Anzeige: liefert HTML oder baut DOM; darf zwischen Produkten abweichen." },
  oeffneSektor: { art: "anzeige", grund: "Anzeige: navigiert (öffnet einen Bereich oder springt zu einem Feld), liefert keine Daten-Antwort." },
  oeffneSektorFeld: { art: "anzeige", grund: "Anzeige: navigiert (öffnet einen Bereich oder springt zu einem Feld), liefert keine Daten-Antwort." },
  prueftermineSpringeZuFeld: { art: "anzeige", grund: "Anzeige: navigiert (öffnet einen Bereich oder springt zu einem Feld), liefert keine Daten-Antwort." },
  blattFeldHeben: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  blattFeldSenken: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  ausdruecklichKeineSetzen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  _ausdruecklichKeineAutoLoeschen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  urheberschaftAnhaengen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  codeSlotSicherstellen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  sektorFeldSetzen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  sensibelFeldSetzen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  _listeOder: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest. Legt die Liste an, wenn sie fehlt." },
  listenEintragHinzufuegen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  listenEintragAktualisieren: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  listenEintragEntfernen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  listenEintragVerschieben: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  _ereignisFlachesFeldMarkieren: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest. Vergibt dabei Zufallskennungen." },
  feldAlsGeprueft: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  feldRohwertSetzen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  feldGueltigkeitSetzen: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest." },
  _dokumentTypRegistrieren: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest. Legt Dokument-Einträge an." },
  dokumentAusStandard: { art: "schreibt", grund: "Schreibt in das Depot; ein Aufruf verändert den Stand, den der Vergleich danach liest. Legt über dokumentAnlegen ein Dokument an." },
  buergermodulSektorErsetzen: { art: "schreibt", grund: "Baut die Bereichsliste des Kerns um (Bündel-Aufbau beim Booten), kein Aufruf auf einem geöffneten Depot." },
  _bereichAusBuendelErzeugen: { art: "schreibt", grund: "Erzeugt eine Bereichsdefinition beim Bündel-Aufbau; verändert Kern-Strukturen." },
  _bereichsErsatzFelderLebendigMachen: { art: "schreibt", grund: "Setzt Getter an die Felder eines Ersatzbereichs (defineProperty); ein zweiter Aufruf wirft." },
  flowEinlesen: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  flowImportAuto: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  flowBereichPdf: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  flowEudiwUebergabe: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  _eudiwAusgeben: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  flowHerausgeben: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  flowListenEintragHinzufuegen: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  flowListenEintragBearbeiten: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  flowListenEintragEntfernen: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
  flowKindSubDepotAnlegen: { art: "ablauf", grund: "Ablauf mit Dialog, Datei oder Ausgabe; kein Rückgabewert über Daten, im Test nicht bedienbar." },
});

/* ── 1. Funktionen aus dem Quelltext ─────────────────────────────────── */
function parameterNamen(roh) {
  const namen = [];
  let tiefe = 0, aktuell = '';
  for (const ch of roh) {
    if (ch === '{' || ch === '[' || ch === '(') tiefe++;
    if (ch === '}' || ch === ']' || ch === ')') tiefe--;
    if (ch === ',' && tiefe === 0) { namen.push(aktuell); aktuell = ''; continue; }
    aktuell += ch;
  }
  if (aktuell.trim()) namen.push(aktuell);
  return namen.map((n) => {
    const t = n.trim();
    if (t.startsWith('{') || t.startsWith('[')) return '__struktur';
    return t.replace(/=.*$/s, '').replace(/^\.\.\./, '').trim();
  });
}
function sammleFunktionen(kernText) {
  const raus = [];
  const re = /^(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/gm;
  let m;
  while ((m = re.exec(kernText))) {
    const params = parameterNamen(m[3]);
    if (params.includes('sektorId')) raus.push({ name: m[2], params, async: !!m[1] });
  }
  return raus;
}

/* ── 2. Kerne ──────────────────────────────────────────────────────────── */
function produktKern(slug, zusatzBindungen, kernPatch) {
  const p = PRODUKTE.find((x) => x.slug === slug);
  if (!p) throw new Error('Unbekanntes Produkt „' + slug + '"');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-datenantworten-' + slug + '-'));
  const r = konfektionieren({
    ziel, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    // Seit v746 (U2-ADR-414) kommen die Bereiche als Module ins Produkt, nicht aus dem Kern: ohne sie
    // sähe das Werkzeug keinen einzigen Bereich und verglich nichts (neu aufgesetzt 28.09.2026).
    unsignierteModulDateien: modulDateienFuer(p),
  });
  const kernPfad = path.join(r.ordner, 'vivodepot.html');
  if (kernPatch) fs.writeFileSync(kernPfad, kernPatch(fs.readFileSync(kernPfad, 'utf8')), 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern({ zusatzBindungen }); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
    fs.rmSync(ziel, { recursive: true, force: true });
  }
}

/* ── 3. Das volle Depot ────────────────────────────────────────────────── */
const felderVon = (bereich) => ((bereich && bereich.sektionen) || []).flatMap((s) => s.felder || []);
function wertFuer(feld, bereichId) {
  const erste = (feld.optionen || [])[0];
  switch (feld.typ) {
    case 'text': case 'textarea': return 'Wert ' + bereichId + '.' + feld.id;
    case 'datum': return '2024-03-15';
    case 'auswahl': return erste ? erste.wert : undefined;
    case 'mehrfachauswahl': return erste ? [erste.wert] : undefined;
    case 'checkbox': return true;
    case 'ref': return { ref: '', override: 'Beispielperson' };
    case 'refMehrfach': return [{ ref: '', override: 'Beispielperson' }];
    case 'liste': {
      const zeile = { id: 'zeile-' + bereichId + '-' + feld.id };
      for (const u of (feld.unterFelder || [])) {
        const w = wertFuer(u, bereichId);
        if (w !== undefined) zeile[u.id] = w;
      }
      return [zeile];
    }
    default: return undefined;   // `hinweis` und Unbekanntes tragen keinen Wert
  }
}
async function volleDatei(sprache, szenario) {
  const pro = produktKern('pro-' + sprache, ['_bereicheImKatalog']).V;
  await pro.depotAnlegen(PASSWORT);
  const d = pro.getData();
  const bereiche = pro.__zusatz._bereicheImKatalog();
  if (szenario !== 'voll') return { umschlag: await pro.depotSerialisieren(), bereichIds: bereiche.map((b) => b.id) };
  for (const b of bereiche) {
    const werte = Object.assign({}, d.sektoren[b.id]);
    for (const f of felderVon(b)) {
      const w = wertFuer(f, b.id);
      if (w !== undefined) werte[f.id] = w;
    }
    d.sektoren[b.id] = werte;
  }
  pro._sektorIndexNeuBauen();
  return { umschlag: await pro.depotSerialisieren(), bereichIds: bereiche.map((b) => b.id) };
}

/* ── 4. Belegung der Parameter nach Namen ─────────────────────────────── */
/* Zeitstempel und Zufallskennungen entstehen beim Aufruf, nicht aus der Datei — zwei Kerne, die
   dieselbe Datei gleich behandeln, erzeugen sie trotzdem verschieden. Maskiert wird nur die FORM
   (ISO-Zeitpunkt mit Uhrzeit, UUID v4); ein Datum ohne Uhrzeit bleibt Datenwert und wird verglichen. */
const ZEITPUNKT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function kanonisch(x) {
  const gesehen = new Set();
  const ordne = (v) => {
    if (v === undefined) return '[undefined]';
    if (typeof v === 'string' && ZEITPUNKT.test(v)) return '[Zeitpunkt]';
    if (typeof v === 'string' && UUID.test(v)) return '[uuid]';
    if (typeof v === 'function') return '[Funktion]';
    if (typeof v === 'number' && !Number.isFinite(v)) return '[' + String(v) + ']';
    if (!v || typeof v !== 'object') return v;
    if (v instanceof Date) return v.toISOString();
    if (gesehen.has(v)) return '[zyklisch]';   // nur echte Zyklen: der Pfad, nicht jede geteilte Referenz
    gesehen.add(v);
    let raus;
    if (v instanceof Map) raus = { '[Map]': ordne([...v.entries()]) };
    else if (v instanceof Set) raus = { '[Set]': ordne([...v.values()]) };
    else if (Array.isArray(v)) raus = v.map(ordne);
    else { raus = {}; for (const k of Object.keys(v).sort()) raus[k] = ordne(v[k]); }
    gesehen.delete(v);
    return raus;
  };
  try { return JSON.stringify(ordne(x)); } catch (e) { return '[nicht serialisierbar: ' + e.message + ']'; }
}

/* Die Regel: Parametername → Werte. Eine Liste heißt „für jeden davon einmal aufrufen". */
function belegungen(fn, bereich, ctx) {
  const listen = felderVon(bereich).filter((f) => f.typ === 'liste');
  const achsen = [];
  const unbelegt = [];
  for (const p of fn.params) {
    switch (p) {
      case 'sektorId': achsen.push([['sektorId', bereich.id]]); break;
      case 'feldId': achsen.push(felderVon(bereich).map((f) => ['feldId', f.id])); break;
      case 'listeId': achsen.push(listen.map((f) => ['listeId', f.id])); break;
      case 'unterfeldId': achsen.push(listen.flatMap((l) => (l.unterFelder || []).map((u) => ['unterfeldId', u.id, l.id]))); break;
      case 'typWert': case 'typ': achsen.push(listen.flatMap((l) => ((l.unterFelder || []).find((u) => (u.optionen || []).length) || { optionen: [] }).optionen.map((o) => [p, o.wert, l.id]))); break;
      case 'merkmal': achsen.push(ctx.merkmale.map((m) => ['merkmal', m])); break;
      case 'rolle': achsen.push(ctx.rollen.map((r) => ['rolle', r])); break;
      case 'index': achsen.push([['index', 0]]); break;
      case 'jetzt': case 'stichtag': achsen.push([[p, 'DATUM']]); break;
      case 'd': case 'daten': case 'depot': achsen.push([[p, 'DATEN']]); break;
      case 'sektorDaten': achsen.push([[p, 'BEREICHSDATEN']]); break;
      case 'feld': case 'unterfeldDef': achsen.push(felderVon(bereich).map((f) => [p, 'FELD', f.id])); break;
      case 'wert': case 'roh': case 'neuWert': achsen.push(felderVon(bereich).map((f) => [p, 'WERT', f.id])); break;
      case 'eintrag': achsen.push(listen.map((l) => [p, 'EINTRAG', l.id])); break;
      case 'optionen': achsen.push(felderVon(bereich).filter((f) => (f.optionen || []).length).map((f) => [p, 'OPTIONEN', f.id])); break;
      default: achsen.push([[p, undefined]]); unbelegt.push(p);
    }
  }
  // Kartesisches Produkt, gedeckelt — gezählt, wenn der Deckel greift.
  let kombis = [[]];
  let gedeckelt = false;
  for (const achse of achsen) {
    const naechste = [];
    for (const k of kombis) for (const a of (achse.length ? achse : [[null, undefined]])) {
      if (naechste.length >= MAX_AUFRUFE_JE_FUNKTION_UND_BEREICH) { gedeckelt = true; break; }
      naechste.push(k.concat([a]));
    }
    kombis = naechste;
  }
  return { kombis, unbelegt, gedeckelt };
}
function argumente(kombi, bereich, V, schnappschuss) {
  const def = (feldId) => felderVon(bereich).find((f) => f.id === feldId);
  return kombi.map(([name, wert, bezug]) => {
    if (wert === 'DATUM') return new Date(JETZT);
    if (wert === 'DATEN') return JSON.parse(JSON.stringify(schnappschuss));
    if (wert === 'BEREICHSDATEN') return JSON.parse(JSON.stringify((schnappschuss.sektoren || {})[bereich.id] || {}));
    if (wert === 'FELD') return JSON.parse(JSON.stringify(def(bezug) || null));
    if (wert === 'WERT') return JSON.parse(JSON.stringify((((schnappschuss.sektoren || {})[bereich.id] || {})[bezug]) ?? null));
    if (wert === 'EINTRAG') return JSON.parse(JSON.stringify(((((schnappschuss.sektoren || {})[bereich.id] || {})[bezug]) || [])[0] || null));
    if (wert === 'OPTIONEN') return JSON.parse(JSON.stringify((def(bezug) || {}).optionen || []));
    return wert;
  });
}
/* Die Konsole schweigt während eines Aufrufs: Anzeige-Funktionen melden fehlende Icons zu Zehntausenden,
   und ein Protokoll in dieser Größe liest niemand. Geschluckt wird nur die Ausgabe, nicht der Wurf. */
const STUMM = ['log', 'info', 'warn', 'error', 'debug'];
async function aufrufen(V, name, args) {
  const f = V.__zusatz[name];
  if (typeof f !== 'function') return { antwort: '[nicht erreichbar]' };
  const alt = STUMM.map((k) => console[k]);
  STUMM.forEach((k) => { console[k] = () => {}; });
  try {
    const r = f(...args);
    return { antwort: kanonisch(r && typeof r.then === 'function' ? await r : r) };
  } catch (e) { return { antwort: kanonisch({ wirft: String((e && e.message) || e).slice(0, 200) }) }; }
  finally { STUMM.forEach((k, i) => { console[k] = alt[i]; }); }
}

/* Wo zwei Antworten auseinandergehen: die ersten Pfade, an denen sie sich unterscheiden. */
function abweichungen(a, b, max = 4) {
  let x, y;
  try { x = JSON.parse(a); y = JSON.parse(b); } catch (e) { return [{ pfad: '', privat: a.slice(0, 160), pro: b.slice(0, 160) }]; }
  const raus = [];
  const kurz = (v) => { const t = JSON.stringify(v); return t === undefined ? '«fehlt»' : t.slice(0, 160); };
  (function geh(u, v, pfad) {
    if (raus.length >= max) return;
    if (JSON.stringify(u) === JSON.stringify(v)) return;
    if (u && v && typeof u === 'object' && typeof v === 'object' && Array.isArray(u) === Array.isArray(v)) {
      const schluessel = [...new Set(Object.keys(u).concat(Object.keys(v)))];
      for (const k of schluessel) geh(u[k], v[k], pfad + (Array.isArray(u) ? '[' + k + ']' : '.' + k));
      return;
    }
    raus.push({ pfad: pfad || '(ganz)', privat: kurz(u), pro: kurz(v) });
  })(x, y, '');
  return raus;
}

/* ── 5. Messen ─────────────────────────────────────────────────────────── */
async function messe({ sprache = 'de', szenario = 'voll', kernPatch = null, nurFunktionen = null, ausnahmen = AUSNAHMEN } = {}) {
  const start = Date.now();
  const kernText = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const gesammelt = sammleFunktionen(kernText);
  // `nurFunktionen` engt nur die AUFRUFE ein (Rot-Beweis in Sekunden statt Minuten), nie die Sammlung.
  const alle = nurFunktionen ? gesammelt.filter((f) => nurFunktionen.includes(f.name)) : gesammelt;
  const namen = alle.map((f) => f.name).concat(['depotNormalisieren', 'vollExportJSON', '_bereicheImKatalog']);
  const { umschlag, bereichIds } = await volleDatei(sprache, szenario);

  const oeffnen = async (slug) => {
    const { V } = produktKern(slug, namen, kernPatch);
    await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PASSWORT);
    /* Mit Akteur: ohne ihn wirft jede schreibende Funktion am Modus-Gate, statt zu schreiben — sie
       bliebe als „liefert in beiden Produkten denselben Wurf" unauffällig und würde still mitgezählt. */
    const ich = Object.keys(V.getData().menschen || {})[0];
    if (ich) V.setzeSitzungsAkteur({ personId: ich, eigenschaft: 'selbst' });
    return V;
  };
  const P = await oeffnen('privat-' + sprache);
  const Q = await oeffnen('pro-' + sprache);
  const schnappschuss = JSON.parse(JSON.stringify(P.getData()));
  /* Vor jeder Funktion: der geöffnete Datenstand selbst. Weicht er ab, hat schon das ÖFFNEN in einem
     der beiden Produkte etwas angelegt, verändert oder verloren. */
  const offenP = kanonisch(P.getData()), offenQ = kanonisch(Q.getData());
  /* Die Wiederherstellung nach einem Schreibfund braucht den vollen Stand; der Vergleich davor nicht. */
  const sicherP = JSON.parse(JSON.stringify(P.getData())), sicherQ = JSON.parse(JSON.stringify(Q.getData()));
  /* SCHREIBERKENNUNG OHNE DIE MITSCHRIFT IM TEXT. `abWerkMitschrift` trägt in einem englischen Produkt das
     ganze Sprachmodul; es in jeden Vorher/Nachher-Text zu nehmen, machte die Probe achtmal langsamer
     (gemessen 16.09.2026). Geprüft wird sie stattdessen über die IDENTITÄT ihrer Fächer: wird ein Fach
     ersetzt, entfernt oder kommt eines hinzu, fällt es auf. Nicht auffallen würde eine Änderung INNERHALB
     eines Fachs am selben Objekt — benannte Grenze. (Ein Längenvergleich hätte das Modul wieder
     serialisiert und nichts gespart; gemessen.) */
  const kennungen = new WeakMap();
  let naechste = 1;
  const identitaet = (o) => {
    if (!o || typeof o !== 'object') return String(o);
    if (!kennungen.has(o)) kennungen.set(o, '#' + (naechste++));
    return kennungen.get(o);
  };
  const stand = (V) => {
    const d = V.getData();
    const m = d && d.abWerkMitschrift;
    const mitschrift = m && typeof m === 'object'
      ? identitaet(m) + '{' + Object.keys(m).map((k) => k + ':' + identitaet(m[k])).join(',') + '}'
      : String(m);
    return JSON.stringify(d, (k, v) => (k === 'abWerkMitschrift' ? undefined : v)) + '|' + mitschrift;
  };

  // Bereichsdefinitionen: aus dem Katalog des Pro-Kerns (der kennt alle); Privat fragt dieselben Ids.
  const katalog = new Map(Q.__zusatz._bereicheImKatalog().map((b) => [b.id, b]));
  for (const b of P.__zusatz._bereicheImKatalog()) if (!katalog.has(b.id)) katalog.set(b.id, b);
  const ctx = { merkmale: [...P.BEREICH_MERKMALE_ERLAUBT], rollen: [...P.BEREICH_ROLLEN_ERLAUBT] };

  const ergebnis = {
    nachDemOeffnen: offenP === offenQ ? [] : abweichungen(offenP, offenQ, 12),
    sprache, szenario, gesammelt: gesammelt.length, eingeengt: !!nurFunktionen, bereiche: [...katalog.keys()], dateiBereiche: bereichIds,
    funde: [], fundStellen: [], ausgenommen: [], unbenanntSchreibend: [], instabil: [], unbelegteParameter: {}, gedeckelt: [],
    aufrufe: 0, toteAusnahmen: Object.keys(ausnahmen).filter((n) => !gesammelt.some((f) => f.name === n)),
  };

  for (const fn of alle) {
    if (ausnahmen[fn.name]) { ergebnis.ausgenommen.push(fn.name); continue; }
    let fundeHier = 0;
    for (const bereich of katalog.values()) {
      const { kombis, unbelegt, gedeckelt } = belegungen(fn, bereich, ctx);
      if (unbelegt.length) ergebnis.unbelegteParameter[fn.name] = unbelegt;
      if (gedeckelt && !ergebnis.gedeckelt.includes(fn.name)) ergebnis.gedeckelt.push(fn.name);
      for (const kombi of kombis) {
        const args = argumente(kombi, bereich, P, schnappschuss);
        /* Hat der Aufruf geschrieben? Dafür genügt der UNSORTIERTE Text desselben Objekts vorher und
           nachher. Die kanonische Form sortiert jeden Schlüssel — gemessen am 16.09.2026 kostete das in
           einem englischen Kern 67 statt 8 Sekunden je Lauf, weil `abWerkMitschrift.sprache` dort das
           ganze Sprachmodul trägt (rund 343 000 Zeichen). Die Laufzeit war ein Werkzeug-, kein
           Produktbefund; der Produktbefund ist die Dateigröße. */
        const vorP = stand(P), vorQ = stand(Q);
        const a = await aufrufen(P, fn.name, args);
        const b = await aufrufen(Q, fn.name, argumente(kombi, bereich, Q, schnappschuss));   // eigene Kopien, gleiche Eingabe
        ergebnis.aufrufe += 2;
        const schrieb = stand(P) !== vorP || stand(Q) !== vorQ;
        if (schrieb) {
          if (!ergebnis.unbenanntSchreibend.includes(fn.name)) ergebnis.unbenanntSchreibend.push(fn.name);
          P.setData(JSON.parse(JSON.stringify(sicherP))); Q.setData(JSON.parse(JSON.stringify(sicherQ)));
        }
        if (a.antwort === b.antwort) continue;
        const nochmal = await aufrufen(P, fn.name, args);
        if (nochmal.antwort !== a.antwort) { if (!ergebnis.instabil.includes(fn.name)) ergebnis.instabil.push(fn.name); continue; }
        fundeHier++;
        /* Die STELLE (Funktion @ Bereich) wird immer gezählt, das BEISPIEL nur bis fünf je Funktion —
           sonst hinge die Grundlinie am Deckel: eine Abweichung in fünf Bereichen erschiene als eine. */
        const stelle = fn.name + ' @ ' + bereich.id;
        if (!ergebnis.fundStellen.includes(stelle)) ergebnis.fundStellen.push(stelle);
        if (fundeHier <= 5) {
          ergebnis.funde.push({
            funktion: fn.name, bereich: bereich.id,
            argumente: kombi.map(([n, w, bezug]) => n + '=' + (bezug ? bezug + ':' : '') + (typeof w === 'string' ? w : kanonisch(w))).join(', '),
            abweichungen: abweichungen(a.antwort, b.antwort),
          });
        }
      }
    }
    if (fundeHier > 5) ergebnis.funde.push({ funktion: fn.name, weitere: fundeHier - 5 });
  }

  // Die beiden Ganz-Depot-Antworten
  if (!nurFunktionen) for (const [name, args] of [['depotNormalisieren', () => [JSON.parse(JSON.stringify(schnappschuss))]], ['vollExportJSON', () => [{}]], ['vollExportJSON', () => [{ sensibel: true }]]]) {
    const a = await aufrufen(P, name, args());
    const b = await aufrufen(Q, name, args());
    ergebnis.aufrufe += 2;
    if (a.antwort !== b.antwort) {
      ergebnis.funde.push({ funktion: name, bereich: '*', argumente: kanonisch(args()).slice(0, 60), abweichungen: abweichungen(a.antwort, b.antwort, 8) });
      if (!ergebnis.fundStellen.includes(name + ' @ *')) ergebnis.fundStellen.push(name + ' @ *');
    }
  }
  ergebnis.dauerSekunden = Math.round((Date.now() - start) / 1000);
  return ergebnis;
}

/* Die Funde als vergleichbare Schlüssel: Funktion und Bereich, ohne die Werte — die Werte stehen
   im Bericht, der Schlüssel hält die Grundlinie stabil gegen Wortlautänderungen. */
function fundSchluessel(ergebnis) {
  const vorn = ergebnis.sprache + ' ' + ergebnis.szenario + ' ';
  const oeffnen = (ergebnis.nachDemOeffnen || []).map((a) => vorn + 'Öffnen @ ' + a.pfad.split(/[.[]/).filter(Boolean).slice(0, 2).join('.'));
  return [...new Set(oeffnen.concat(ergebnis.fundStellen.map((st) => vorn + st)))].sort();
}

module.exports = { sammleFunktionen, parameterNamen, messe, fundSchluessel, AUSNAHMEN, kanonisch, abweichungen,
  // für schmale Messungen einzelner Funktionen, ohne den ganzen Vergleich (z. B. Laufzeit je Sprache)
  _innen: { produktKern, volleDatei, belegungen, argumente, aufrufen, felderVon, PASSWORT } };

if (require.main === module) {
  (async () => {
    const i = process.argv.indexOf('--sprache');
    const sprache = i > 0 ? process.argv[i + 1] : 'de';
    const k = process.argv.indexOf('--szenario');
    const szenario = k > 0 ? process.argv[k + 1] : 'voll';
    const j = process.argv.indexOf('--aus');
    const e = await messe({ sprache, szenario });
    const text = JSON.stringify(Object.assign({ schluessel: fundSchluessel(e) }, e), null, 2);
    if (j > 0) fs.writeFileSync(process.argv[j + 1], text); else console.log(text);
    console.error('gesammelt ' + e.gesammelt + ', Aufrufe ' + e.aufrufe + ', Funde ' + fundSchluessel(e).length
      + ', unbenannt schreibend ' + e.unbenanntSchreibend.length + ', instabil ' + e.instabil.length);
    process.exit(0);
  })().catch((err) => { console.error(err); process.exit(1); });
}
