#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   altbestand-vier-produkte-messen.js — öffnet jeder alte Stand in allen vier Produkten
   ohne Verlust? (16.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: Drei Funde an einem Tag, alle dieselbe Form — ein alter Stand, heute geöffnet, und
   etwas bleibt still zurück. Die KI-Stufe zog alte Werte in Pro nicht um (sie blieben als Waisen
   unter alten Namen), Stufe 58 → 59 band Dokumente unter alten Kennungen an keine Zeile, und ein
   signiertes englisches Sprachbündel von vor dem Kennungs-Umbau zeigte rohe Kennungen statt Text.
   Jeder Fund hat seine Einzelprobe. Dieses Werkzeug fragt die Klasse: jede Datei gegen jedes
   Produkt, mit denselben vier Fragen.

   DIE VIER FRAGEN je Datei und Produkt:
     1. abgelehnt    — Öffnen oder Einlassen wirft oder wird abgewiesen.
     2. roheKennung  — eine Beschriftung, die das Produkt zeigt, ist eine Kennung
                       („identity.givenName.label") statt Text. Geprüft an der Struktur der
                       angezeigten Bereiche UND am gerenderten Inhalt der Bereiche mit Werten.
     3. waise        — ein Wert steht nach dem Öffnen unter einem Schlüssel, den der KATALOG des
                       Produkts nicht kennt; ein Markierungswert aus einer alten Anwendung ist
                       verschwunden oder steht nur an einer solchen Stelle; ein Dokument trifft
                       über seinen Typ eine Listenzeile und ist trotzdem an keine gebunden.
     4. proErreichbar — was eine Datei in privat-de an Werten zeigt, muss in pro-de und pro-en
                       über den Katalog erreichbar sein (Wert da UND Feld deklariert).
   Gefragt wird der KATALOG (`_bereicheImKatalog`/`_sektorAusKatalog`), nicht die Anzeige: Pro
   legt Bürgerbereiche schlafen, die Werte gehören trotzdem zur Akte.

   WAS ALS DATEI GEHT (`--datei`, mehrfach):
     - eine alte ANWENDUNG (.html mit Kern): das Werkzeug legt IN DIESER ALTEN ANWENDUNG ein Depot
       an, füllt jedes Feld ihres eigenen Modells mit einem Markierungswert und lässt den alten Kern
       die verschlüsselte Datei schreiben. Geöffnet wird also, was die alte Fassung wirklich schrieb.
     - eine verschlüsselte Depot-Datei (.vivodepot oder Umschlag-JSON) — mit `--passwort`
       direkt hinter der Datei.
     - ein Klartext-Export (`vivodepot-klartext-export`, auch in der Hülle der v515-Fixture) —
       über den echten Einleseweg (`importPlan('json')` + `importAnwenden`).
     - ein eingefrorener Datenstand (JSON mit `schemaVersion` und `sektoren`, kein Umschlag) — der
       heutige Kern legt einen Umschlag darum, geöffnet wird über `depotLaden`. Nicht geprüft ist,
       dass ein Kern von damals denselben Umschlag geschrieben hätte (Bauart wie
       tests/pro-migration-ki-stufe.test.js).
     - ein Bündel-Stapel (`vorabkonfiguration.js` oder JSON-Array) — über
       `vorDepotKonfigurationAnwenden`, den Weg einer Modul-App beim Start, danach ein neues Depot.

   OHNE ARGUMENT läuft es gegen erfundene Fixtures im Repo, alle in alter Form (Liste in
   STANDARD_DATEIEN). Keine internen Dateien im Repo.

   AUFRUF:
     node tools/altbestand-vier-produkte-messen.js
     node tools/altbestand-vier-produkte-messen.js --datei PFAD [--passwort PW] [--datei PFAD …]
       [--json AUSGABE.json]
   Exit 0 = keine Funde · 1 = Funde · 2 = Werkzeugfehler (Datei unlesbar, Art unbekannt).

   WAS ES NICHT PRÜFT: den Browser (Datei-Picker, Passwort-Dialog, echtes DOM — hier läuft der Kern
   im Node-Harnisch tests/load-kern.js); den internen Wiedereinstieg über den Browser-Speicher;
   Sub-Depots, Übergabe-Protokoll und Nebenablagen außer über ihre Schlüssel in `sektoren`; ob ein
   Wert inhaltlich richtig umgezogen ist (nur: ob er an einer bekannten Stelle steht); Auswahl- und
   Datumswerte aus alten Anwendungen auf Verlust (sie sind nicht eindeutig markierbar — für sie
   greift nur die Schlüssel-Waise).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const LOAD_KERN = path.join(REPO, 'tests', 'load-kern.js');
// Aus der Zusammensetzung gelesen, nicht noch einmal aufgezählt (U2-ADR-386: die Produkte stehen an benannten Orten).
const PRODUKT_SLUGS = require('./lib/vier-produkte.js').PRODUKTE.map((p) => p.slug);
const FIX = path.join(REPO, 'tests', 'fixtures');

/* Die Standard-Proben. Passwörter stehen öffentlich neben den Fixtures (README bzw. Probe). */
const STANDARD_DATEIEN = Object.freeze([
  { pfad: path.join(FIX, 'vorfuehrung-zugang-zum-recht', 'demo-de.vivodepot'), passwort: 'zugang-zum-recht-vorfuehrung-2026' },
  { pfad: path.join(FIX, 'vorfuehrung-zugang-zum-recht', 'demo-en.vivodepot'), passwort: 'zugang-zum-recht-vorfuehrung-2026' },
  { pfad: path.join(FIX, 'v515-ohne-auszuege', 'depot-v515-ohne-auszuege.vivodepot'), passwort: 'v515-fixture-ohne-auszuege-2026' },
  { pfad: path.join(FIX, 'v515-testdepot.json') },
  { pfad: path.join(FIX, 'altbestand-vier-produkte', 'schema-39-ki-und-bezug.json') },
  { pfad: path.join(FIX, 'altbestand-vier-produkte', 'textsatz-en-alte-kennungen.json') },
]);

const PASSWORT_NEU = 'altbestand-vier-produkte-messen-2026';
// Zeilen-Metadaten, die kein Bürgerfeld sind — dieselbe Menge wie tests/altdatei-keine-unbekannten-schluessel.test.js.
const ZEILEN_META = new Set(['id', 'rechtsraum', 'rechtsraumAngenommen', 'katalogStand', 'geprueft',
  'geprueftAm', 'geprueftFuer', 'herkunft', 'subDepotAbgelehnt']);
const MARKE = 'ALTBESTAND·';
const ALT_MARKE = ' — Text liegt unter alter Kennung ';

/* ── Kerne laden ─────────────────────────────────────────────────────────────── */
function kernAus(htmlPfad) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = htmlPfad;
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern(); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}

const _gebaut = new Map();
function produktHtml(slug) {
  if (!_gebaut.has(slug)) {
    const { konfektionieren } = require('./produkt-konfektionieren.js');
    const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');
    const p = PRODUKTE.find((x) => x.slug === slug);
    if (!p) throw new Error('Unbekanntes Produkt „' + slug + '"');
    const r = konfektionieren({
      ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'vd-altbestand-' + slug + '-')), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    _gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  return _gebaut.get(slug);
}

/* ── Art einer Datei ─────────────────────────────────────────────────────────── */
function jsonAb(text, zeichen) {
  const i = text.indexOf(zeichen);
  if (i < 0) return null;
  try { return JSON.parse(zeichen === '[' ? text.slice(i, text.lastIndexOf(']') + 1) : text.slice(i)); } catch (_) { return null; }
}

function artErkennen(pfad, text) {
  if (/\.html?$/i.test(pfad) && text.includes('<script>')) return { art: 'anwendung' };
  if (text.includes('__vorDepotKonfiguration')) {
    const liste = jsonAb(text, '[');
    if (Array.isArray(liste)) return { art: 'buendel', buendel: liste };
  }
  const o = jsonAb(text, text.trimStart().startsWith('[') ? '[' : '{');
  if (Array.isArray(o)) return { art: 'buendel', buendel: o };
  if (!o || typeof o !== 'object') return { art: null };
  if (o.kryptoVersion && o.pbkdf2) return { art: 'umschlag', umschlag: o };
  if (o._typ === 'vivodepot-klartext-export') return { art: 'klartext', text: JSON.stringify(o) };
  if (o.export && o.export._typ === 'vivodepot-klartext-export') return { art: 'klartext', text: JSON.stringify(o.export) };
  if (typeof o.modulTyp === 'string') return { art: 'buendel', buendel: [o] };
  if (o.sektoren && typeof o.sektoren === 'object') return { art: 'datenstand', depot: o };
  return { art: null };
}

/* ── Eine alte Anwendung schreibt ihre Datei ─────────────────────────────────── */
function markeFuer(...teile) { return MARKE + teile.join('·'); }

function wertFuer(def, marke, personId) {
  const opt = (def.optionen || []).map((o) => (o && typeof o === 'object') ? o.wert : o).filter((x) => x != null && x !== '');
  switch (def.typ) {
    case 'text': case 'textarea': return marke;
    case 'datum': return '2021-03-04';
    case 'auswahl': return opt.length ? opt[0] : undefined;
    case 'mehrfachauswahl': return opt.length ? [opt[0]] : undefined;
    case 'checkbox': return true;
    case 'ref': return { ref: '', override: marke };
    case 'refMehrfach': return [{ ref: personId || '', override: marke }];
    default: return undefined;
  }
}

async function anwendungSchreibtDatei(htmlPfad) {
  const { V } = kernAus(htmlPfad);
  if (typeof V.basisVorlagenVerifizieren === 'function') { try { await V.basisVorlagenVerifizieren(); } catch (_) { /* ältere Kerne */ } }
  await V.depotAnlegen(PASSWORT_NEU);
  if (typeof V.akteurSelbstErklaeren === 'function') V.akteurSelbstErklaeren('Altbestand');
  let personId = '';
  try { const p = V.personSicherstellen('Altbestand Person'); personId = (p && p.id) || (typeof p === 'string' ? p : ''); } catch (_) {}
  let gesetzt = 0; const nichtSetzbar = [];
  for (const b of V.bereicheAlle()) {
    for (const sek of b.sektionen || []) {
      for (const f of sek.felder || []) {
        try {
          if (f.typ === 'liste') {
            const zeile = {};
            for (const u of f.unterFelder || []) {
              const w = wertFuer(u, markeFuer(b.id, f.id, u.id), personId);
              if (w !== undefined) zeile[u.id] = w;
            }
            if (Object.keys(zeile).length) { V.listenEintragHinzufuegen(b.id, f.id, zeile); gesetzt++; }
          } else {
            const w = wertFuer(f, markeFuer(b.id, f.id), personId);
            if (w !== undefined) { V.sektorFeldSetzen(b.id, f.id, w); gesetzt++; }
          }
        } catch (e) { nichtSetzbar.push(b.id + '.' + f.id + ': ' + String(e.message).slice(0, 80)); }
      }
    }
  }
  const marken = [...new Set(tiefeStrings(V.getData().sektoren).filter((s) => s.startsWith(MARKE)))];
  return { umschlag: await V.depotSerialisieren(), passwort: PASSWORT_NEU, marken, module: modulKennungen(V.getData()), gesetzt, nichtSetzbar };
}

/* Was ein Depot an Modulen trägt, je Slot „slot:id" — eine alte Datei bringt ihre Ab-Werk-Auszüge,
   Sprach- und Bereichsmodule mit (U2-ADR-398, Mitschrift), und die sollen das Öffnen überleben. */
const MODUL_SLOTS = ['textsatzModule', 'bereichsModule', 'logikModule', 'situationsModule', 'wizardsModule'];
function modulKennungen(d) {
  const raus = [];
  for (const slot of MODUL_SLOTS) {
    for (const m of (d && Array.isArray(d[slot])) ? d[slot] : []) {
      const id = m && (m.id || m.kennung || (m.modulTyp === 'textsatz' ? 'textsatz-' + m.sprache : null));
      if (id) raus.push(slot + ':' + id);
    }
  }
  return [...new Set(raus)].sort();
}

function tiefeStrings(x, raus = []) {
  if (typeof x === 'string') raus.push(x);
  else if (Array.isArray(x)) for (const y of x) tiefeStrings(y, raus);
  else if (x && typeof x === 'object') for (const y of Object.values(x)) tiefeStrings(y, raus);
  return raus;
}

/* ── Öffnen in einem Produkt ─────────────────────────────────────────────────── */
async function oeffnen(slug, quelle) {
  const k = kernAus(produktHtml(slug));
  const V = k.V;
  if (quelle.art === 'umschlag' || quelle.art === 'anwendung') {
    await V.depotLaden(JSON.parse(JSON.stringify(quelle.umschlag)), quelle.passwort);
  } else if (quelle.art === 'datenstand') {
    // Der heutige Kern legt den Umschlag um den eingefrorenen Stand — s. Kopf.
    const Q = kernAus(produktHtml('privat-de')).V;
    await Q.depotAnlegen(PASSWORT_NEU);
    const alt = Object.assign(JSON.parse(JSON.stringify(Q.getData())), JSON.parse(JSON.stringify(quelle.depot)));
    Q.setData(alt);
    await V.depotLaden(await Q.depotSerialisieren(), PASSWORT_NEU);
  } else if (quelle.art === 'klartext') {
    await V.depotAnlegen(PASSWORT_NEU);
    V.akteurSelbstErklaeren('Altbestand');   // ohne Sitzungs-Akteur stempelt kein Eintrag — die Oberfläche fragt ihn vorher ab
    const plan = V.importPlan('json', quelle.text);
    if (!plan || plan.ungueltig) throw new Error('Einlesen abgewiesen: ' + ((plan && plan.grund) || 'kein Plan'));
    V.importAnwenden(plan, { alleKonflikte: true });
  } else if (quelle.art === 'buendel') {
    /* Signierte Bündel über den Start-Weg einer Modul-App; ein unsigniertes Modul über den Weg der
       Bürgerin (Einstellungen → Module → Einlassen) und die Anmeldung, die das Laden auch geht. */
    const signiert = quelle.buendel.filter((b) => b && typeof b.modulSignaturJws === 'string');
    const unsigniert = quelle.buendel.filter((b) => b && typeof b.modulSignaturJws !== 'string');
    if (signiert.length) await V.vorDepotKonfigurationAnwenden(JSON.parse(JSON.stringify(signiert)), null, {});
    await V.depotAnlegen(PASSWORT_NEU);
    const d = V.getData();
    for (const m of unsigniert) {
      const r = V.modulEinlassen(JSON.stringify(m));
      if (!r || !r.angenommen) throw new Error('Modul abgewiesen: ' + ((r && r.grund) || '?'));
    }
    // Dieselbe Anmeldung wie tools/lib/vier-produkte.js (deutscheZeilenImEnglischenProdukt).
    if (unsigniert.length) { V._textsatzModuleAusDepotAnmelden(d); V.textsatzNeuAnwenden(); }
    const eingelassen = MODUL_SLOTS
      .reduce((n, s) => n + (Array.isArray(d[s]) ? d[s].length : 0), 0);
    if (!eingelassen) throw new Error('kein Modul des Stapels eingelassen');
    // Ein Sprachbündel bringt seine Sprache mit; das Produkt zeigt, was die Bündel-App zeigen würde.
    const sprachen = (d.textsatzModule || []).map((m) => m && m.sprache).filter(Boolean);
    if (sprachen.length && !sprachen.includes(d.textsprache)) { d.textsprache = sprachen[0]; V.textsatzNeuAnwenden(); }
  }
  return k;
}

/* ── Die Prüfungen ───────────────────────────────────────────────────────────── */
const KENNUNG_FORM = /^[A-Za-z][\w-]*(\.[\w-]+)+$/;
function istRoheKennung(label, id) {
  if (typeof label !== 'string' || !label.trim()) return true;
  const t = label.trim();
  return KENNUNG_FORM.test(t) || (id != null && t === id && /[a-z][A-Z]|_/.test(t));
}

function katalog(V) {
  return typeof V._bereicheImKatalog === 'function' ? V._bereicheImKatalog() : V.bereicheAlle();
}

function leer(w) {
  return w == null || w === '' || (Array.isArray(w) && !w.length)
    || (typeof w === 'object' && !Array.isArray(w) && !Object.keys(w).length);
}

function bereicheMitWerten(d) {
  return Object.keys((d && d.sektoren) || {}).filter((id) => Object.values(d.sektoren[id] || {}).some((w) => !leer(w)));
}

/* Liegt der Text zu einer roh gezeigten Kennung in einem Sprachmodul des Depots unter ihrer ALTEN
   Kennung? Das trennt die Klasse „Modul von vor dem Kennungs-Umbau" von „Modul deckt die Kennung
   gar nicht ab" — beide zeigen dasselbe Bild, gemessen 16.09.2026: ein kleines Modul mit NEUEN
   Kennungen lässt in privat-en genauso alle übrigen Beschriftungen roh stehen. */
function alteKennungMitText(V, roh) {
  const m = /^(.*?)\.(label|hint|hinweis|hilfe|placeholder|titel|beschreibung|text)$/.exec(roh);
  if (!m) return null;
  const teile = m[1].split('.');
  const tabelle = Array.isArray(V.KENNUNG_MAPPING) ? V.KENNUNG_MAPPING : [];
  let alt = null;
  if (teile.length === 1) {
    const z = tabelle.find((x) => x && x.bereichNeu === teile[0]);
    alt = z ? z.bereichAlt : null;
  } else {
    const neu = teile.length === 2 ? teile.join('.') : teile[0] + '.' + teile[1] + '/' + teile.slice(2).join('.');
    const z = tabelle.find((x) => x && x.kennungNeu === neu);
    alt = z ? z.kennungAlt.replace('/', '.') : null;
  }
  if (!alt) return null;
  const schluessel = alt + '.' + m[2];
  const texte = ((V.getData() || {}).textsatzModule || []).map((x) => (x && x.texte) || {});
  return texte.some((t) => typeof t[schluessel] === 'string') ? schluessel : null;
}

function roheKennungen(k) {
  const V = k.V;
  const raus = new Set();
  const altHinweis = (label) => { const alt = typeof label === 'string' ? alteKennungMitText(V, label.trim()) : null; return alt ? ALT_MARKE + alt : ''; };
  for (const b of V.bereicheAlle()) {
    if (istRoheKennung(b.label, b.id)) raus.add('Bereich ' + b.id + ': ' + String(b.label) + altHinweis(b.label));
    for (const sek of b.sektionen || []) {
      if (sek.titel != null && istRoheKennung(sek.titel)) raus.add(b.id + ' Sektion: ' + sek.titel);
      for (const f of sek.felder || []) {
        if (istRoheKennung(f.label, f.id)) raus.add(b.id + '.' + f.id + ': ' + String(f.label) + altHinweis(f.label));
        for (const u of f.unterFelder || []) {
          if (u.typ !== 'hinweis' && istRoheKennung(u.label, u.id)) raus.add(b.id + '.' + f.id + '/' + u.id + ': ' + String(u.label) + altHinweis(u.label));
        }
      }
    }
  }
  const sichtbar = new Set(V.bereicheAlle().map((b) => b.id));
  for (const sid of bereicheMitWerten(V.getData()).filter((id) => sichtbar.has(id))) {
    let html = '';
    try { V.renderSektor(sid); const c = k.document.getElementById('content'); html = String((c && c.innerHTML) || ''); }
    catch (e) { raus.add('Rendern ' + sid + ' wirft: ' + String(e.message).slice(0, 80)); continue; }
    const text = html.replace(/<[^>]*>/g, '\n');
    for (const zeile of text.split('\n')) {
      const t = zeile.trim();
      if (t && KENNUNG_FORM.test(t) && /\.(label|hint|hinweis|hilfe|placeholder|titel|beschreibung|text)$/.test(t)) raus.add('gerendert ' + sid + ': ' + t);
    }
  }
  return [...raus].sort();
}

function modellSchluessel(V) {
  const felder = new Map();
  for (const s of katalog(V)) {
    for (const sek of s.sektionen || []) {
      for (const f of sek.felder || []) felder.set(s.id + '.' + f.id, new Set((f.unterFelder || []).map((u) => u.id)));
    }
  }
  for (const w of V.WIZARDS || []) {
    for (const st of w.schritte || []) {
      if (!(st && st.feld && st.feld.id && st.ziel && st.ziel.sektor)) continue;
      const key = st.ziel.sektor + '.' + st.feld.id;
      if (!felder.has(key)) felder.set(key, new Set());
    }
  }
  return felder;
}

function waisen(V, marken, module) {
  const d = V.getData() || {};
  const felder = modellSchluessel(V);
  const raus = new Set();
  const markenAnBekannterStelle = new Set();
  for (const [sid, inhalt] of Object.entries(d.sektoren || {})) {
    if (!inhalt || typeof inhalt !== 'object') continue;
    for (const [fid, wert] of Object.entries(inhalt)) {
      if (leer(wert)) continue;
      const key = sid + '.' + fid;
      if (!felder.has(key)) { raus.add('Schlüssel ' + key); continue; }
      const unter = felder.get(key);
      if (Array.isArray(wert) && unter.size) {
        for (const zeile of wert) {
          if (!zeile || typeof zeile !== 'object') continue;
          for (const [u, uw] of Object.entries(zeile)) {
            if (ZEILEN_META.has(u) || leer(uw)) continue;
            if (!unter.has(u)) raus.add('Schlüssel ' + key + '/' + u);
            else for (const s of tiefeStrings(uw)) markenAnBekannterStelle.add(s);
          }
        }
      } else {
        for (const s of tiefeStrings(wert)) markenAnBekannterStelle.add(s);
      }
    }
  }
  if (marken && marken.length) {
    const ueberall = new Set(tiefeStrings(d));
    for (const m of marken) {
      if (markenAnBekannterStelle.has(m)) continue;
      raus.add((ueberall.has(m) ? 'Wert nur an unbekannter Stelle ' : 'Wert verloren ') + m.slice(MARKE.length));
    }
  }
  if (module && module.length) {
    const jetzt = new Set(modulKennungen(d));
    for (const m of module) if (!jetzt.has(m)) raus.add('Modul verloren ' + m);
  }
  // Ein Dokument, dessen Typ eine Zeile seiner Liste trägt, gehört an diese Zeile (Stufe 58 → 59, Weg a).
  for (const doc of d.dokumente || []) {
    for (const ref of (doc && doc.felder) || []) {
      const liste = ref && d.sektoren && d.sektoren[ref.sektorId] && d.sektoren[ref.sektorId][ref.feldId];
      if (!Array.isArray(liste) || liste.length < 2 || ref.zeilenId || !doc.typ) continue;
      if (liste.some((z) => z && typeof z === 'object' && Object.values(z).includes(doc.typ))) {
        raus.add('Dokument ' + doc.id + ' → ' + ref.sektorId + '.' + ref.feldId + ' ohne Zeile, obwohl eine Zeile „' + doc.typ + '" trägt');
      }
    }
  }
  return [...raus].sort();
}

function werteMitStelle(V) {
  const d = V.getData() || {};
  const raus = [];
  for (const [sid, inhalt] of Object.entries(d.sektoren || {})) {
    for (const [fid, w] of Object.entries(inhalt || {})) if (!leer(w)) raus.push(sid + '.' + fid);
  }
  return raus.sort();
}

function proErreichbar(privatStellen, V) {
  const d = V.getData() || {};
  const felder = modellSchluessel(V);
  const raus = [];
  for (const key of privatStellen) {
    const i = key.indexOf('.');
    const w = d.sektoren && d.sektoren[key.slice(0, i)] && d.sektoren[key.slice(0, i)][key.slice(i + 1)];
    if (leer(w)) raus.push(key + ': Wert fehlt');
    else if (!felder.has(key)) raus.push(key + ': im Katalog nicht deklariert');
  }
  return raus;
}

/* ── Eine Datei messen ───────────────────────────────────────────────────────── */
async function dateiMessen(eintrag, protokoll) {
  const text = fs.readFileSync(eintrag.pfad, 'utf8');
  const erkannt = artErkennen(eintrag.pfad, text);
  if (!erkannt.art) throw new Error('Art nicht erkannt: ' + eintrag.pfad);
  const quelle = Object.assign({}, erkannt, { passwort: eintrag.passwort });
  const ergebnis = { datei: eintrag.pfad, art: erkannt.art, produkte: {}, funde: [] };
  if (erkannt.art === 'umschlag' && !eintrag.passwort) throw new Error('Verschlüsselte Datei ohne --passwort: ' + eintrag.pfad);
  if (erkannt.art === 'anwendung') {
    const geschrieben = await anwendungSchreibtDatei(eintrag.pfad);
    Object.assign(quelle, geschrieben);
    ergebnis.alteAnwendung = { gesetzt: geschrieben.gesetzt, marken: geschrieben.marken.length, module: geschrieben.module, nichtSetzbar: geschrieben.nichtSetzbar };
  }
  const fund = (produkt, frage, detail) => ergebnis.funde.push({ produkt, frage, detail });
  let privatStellen = null;
  for (const slug of PRODUKT_SLUGS) {
    protokoll('  ' + slug);
    let k;
    try { k = await oeffnen(slug, quelle); }
    catch (e) { fund(slug, 'abgelehnt', String(e.message).slice(0, 200)); ergebnis.produkte[slug] = { abgelehnt: true }; continue; }
    const roh = roheKennungen(k);
    const w = waisen(k.V, quelle.marken, quelle.module);
    const stellen = werteMitStelle(k.V);
    if (slug === 'privat-de') privatStellen = stellen;
    for (const r of roh) fund(slug, 'roheKennung', r);
    for (const x of w) fund(slug, 'waise', x);
    let pro = [];
    if (slug.startsWith('pro-') && privatStellen && erkannt.art !== 'buendel') {
      pro = proErreichbar(privatStellen, k.V);
      for (const x of pro) fund(slug, 'proErreichbar', x);
    }
    ergebnis.produkte[slug] = { bereicheMitWerten: bereicheMitWerten(k.V.getData()).length, werte: stellen.length,
      roheKennung: roh.length, roheKennungTextUnterAlterKennung: roh.filter((x) => x.includes(ALT_MARKE)).length,
      waise: w.length, proErreichbar: pro.length };
  }
  return ergebnis;
}

async function messen(eintraege, protokoll = () => {}) {
  const dateien = [];
  for (const e of eintraege) {
    protokoll(e.pfad);
    dateien.push(await dateiMessen(e, protokoll));
  }
  return { dateien, funde: dateien.reduce((n, d) => n + d.funde.length, 0) };
}

function argumente(argv) {
  const eintraege = [];
  let json = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--datei') eintraege.push({ pfad: path.resolve(argv[++i] || '') });
    else if (a === '--passwort') { if (!eintraege.length) throw new Error('--passwort gehört hinter eine --datei'); eintraege[eintraege.length - 1].passwort = argv[++i]; }
    else if (a === '--json') json = path.resolve(argv[++i] || '');
    else throw new Error('Unbekanntes Argument: ' + a);
  }
  return { eintraege: eintraege.length ? eintraege : STANDARD_DATEIEN.map((x) => Object.assign({}, x)), json };
}

function bericht(r) {
  const zeilen = [];
  for (const d of r.dateien) {
    zeilen.push(path.relative(process.cwd(), d.datei) + '  [' + d.art + ']  ' + d.funde.length + ' Funde');
    if (d.alteAnwendung) zeilen.push('  alte Anwendung: ' + d.alteAnwendung.gesetzt + ' Felder gesetzt, ' + d.alteAnwendung.marken + ' Markierungswerte, '
      + d.alteAnwendung.module.length + ' Module, ' + d.alteAnwendung.nichtSetzbar.length + ' nicht setzbar');
    for (const [slug, p] of Object.entries(d.produkte)) {
      zeilen.push('  ' + slug.padEnd(10) + (p.abgelehnt ? 'ABGELEHNT'
        : 'Bereiche mit Werten ' + p.bereicheMitWerten + ' · rohe Kennungen ' + p.roheKennung
          + ' (Text unter alter Kennung: ' + p.roheKennungTextUnterAlterKennung + ') · Waisen ' + p.waise + ' · Pro nicht erreichbar ' + p.proErreichbar));
    }
    const nachFrage = new Map();
    for (const f of d.funde) { const key = f.produkt + ' ' + f.frage; if (!nachFrage.has(key)) nachFrage.set(key, []); nachFrage.get(key).push(f.detail); }
    for (const [key, liste] of nachFrage) {
      zeilen.push('    ' + key + ' (' + liste.length + '): ' + liste.slice(0, 5).join(' | ') + (liste.length > 5 ? ' | …' : ''));
    }
  }
  zeilen.push('GESAMT: ' + r.funde + ' Funde');
  return zeilen.join('\n');
}

async function main() {
  let a;
  try { a = argumente(process.argv.slice(2)); } catch (e) { process.stderr.write(e.message + '\n'); process.exit(2); }
  let r;
  try { r = await messen(a.eintraege, (z) => process.stderr.write(z + '\n')); }
  catch (e) { process.stderr.write('FEHLER: ' + e.message + '\n'); process.exit(2); }
  process.stdout.write(bericht(r) + '\n');
  if (a.json) fs.writeFileSync(a.json, JSON.stringify(r, null, 2) + '\n');
  process.exit(r.funde ? 1 : 0);
}

if (require.main === module) main();
module.exports = { STANDARD_DATEIEN, PRODUKT_SLUGS, ALT_MARKE, artErkennen, istRoheKennung, alteKennungMitText, waisen, roheKennungen, proErreichbar,
  modellSchluessel, modulKennungen, anwendungSchreibtDatei, oeffnen, dateiMessen, messen, bericht };
