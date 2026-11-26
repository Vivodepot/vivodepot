#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   sprachluecken-messen.js — welche Beschriftungen zeigt die Oberfläche in einer anderen Sprache
   nicht übersetzt? (11.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: Im englischen Sub-Depot-Dialog stand Deutsch. Die Ursache war kein fehlender Text im
   Sprachmodul, sondern ein Katalog im Kern, dessen deutsche Anzeige immer gezeigt wird
   (`BEZIEHUNGS_CODES[…].displayDe`). Darum misst dieses Werkzeug zwei Wege, nicht einen.

   TEIL A — DER TEXTSATZ. Soll ist jede Kennung des deutschen Moduls (`tools/textsatz-de-modul.json`,
   für Pro das deutsche Pro-Modul, wo es im Baum liegt). Ist ist jedes andere Sprachmodul derselben Familie:
   `tools/textsatz-<sprache>-modul.json` bzw. das Pro-Modul der Sprache, und für eine Sprache ohne gebautes Modul
   die Daten `tools/textsatz-<sprache>-daten.js` (Export `TEXTSATZ_<SPRACHE>_TEXTE`). Je Kennung:
     · fehlt     — keine Kennung im Modul;
     · deutsch   — derselbe Wert wie im Deutschen und mindestens ein Wort aus drei Buchstaben.
   Amtlicher Wortlaut, der mit Absicht deutsch bleibt (`OFFEN_JURISTISCH` in
   `tools/textsatz-en-juristisch-offen.js`, U2-ADR-363), wird getrennt gezählt und ist keine Lücke.
   Gleiche Wörter in beiden Sprachen („Name“, „Status“) stehen in der Liste mit; die Zahl „mit Umlaut
   oder ß“ ist die Teilmenge, die sicher deutsch ist.
   Die Art folgt der Form der Kennung: `strings:` → Dialog und Meldung; `…/<wert>.label` → Auswahl;
   `.label`, `.hint`, `.beispiel`, `.placeholder`, `.frage` → Feld; sonst → sonstige.

   TEIL B — FESTE DEUTSCHE ANZEIGE IM KERN. Gesucht wird jeder Zugriff `.<name>De` (z. B. `displayDe`,
   `labelDe`) im Kern und in der Lese-App, außerhalb von Kommentarzeilen. Ein solcher Zugriff liefert
   in jeder Sprache Deutsch. Steht in derselben Zeile eine Ausgabe in die Seite (`escapeHTML`,
   `textContent`, `innerHTML`, `<option`, `opt(`), gilt die Stelle als Oberfläche, sonst als „prüfen“
   (z. B. eine Ausgabe, die mit Absicht deutsch ist).

   TEIL C (mit --mit-kern) — TEXT-TRÄGER OHNE KENNUNG: siehe `teilC` unten. Der Kern wird dafür geladen.

   TEIL D (mit --mit-kern) — AUSWAHL IN ENGLISCH: siehe `teilDAmKern` unten. Jeder Eintrag jeder Auswahlliste, den der
   Kern baut, wird in Deutsch und in Englisch gelesen; steht in Englisch derselbe Text wie in Deutsch, ist das ein Fund
   (Klasse EN-BEZIEHUNGSLISTE-DEUTSCH, 19.11.2026). Ausnahmen nur über tools/sprachluecken-auswahl-ausnahmen.json, je Eintrag
   mit Wort. Dazu zählt `auswahlBaustellen` die Stellen im Kern, die Einträge bauen: ein neuer Bauer hebt die Zahl.

   GRENZEN: Studio, Begleitmodule (`*-en.json`) und Texte, die als Literal im Quelltext einer Funktion
   stehen (nicht in einem Objekt des Bestands), misst dieses Werkzeug nicht. Für diese Texte zählt der
   Gerüst-Wächter die Sätze.

   Aufruf:  node tools/sprachluecken-messen.js [--wurzel <pfad>] [--mit-kern] [--json] [--fundstellen <n>]   (Teil C und D nur mit --mit-kern)
   Ohne --wurzel misst es die Vorlage tests/fixtures/sprachluecken-messen (die Probe kennt ihre Zahlen);
   für den echten Stand --wurzel . im Repo. Exit 0, das Werkzeug misst und urteilt nicht.
   Probe: tests/sprachluecken-messen.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const VORLAGE = path.join(__dirname, '..', 'tests', 'fixtures', 'sprachluecken-messen');
const WORT = /[A-Za-zÄÖÜäöüß]{3,}/;
const UMLAUT = /[ÄÖÜäöüß]/;
const AUSGABE = /escapeHTML|textContent|innerHTML|<option|\bopt\(/;

function art(kennung) {
  if (kennung.startsWith('strings:')) return 'dialog';
  if (/\/[^./]+\.label$/.test(kennung)) return 'auswahl';
  if (/\.(label|hint|beispiel|placeholder|frage)$/.test(kennung)) return 'feld';
  return 'sonstige';
}

const leseJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function amtlicheKennungen(tools) {
  const p = path.join(tools, 'textsatz-en-juristisch-offen.js');
  if (!fs.existsSync(p)) return new Set();
  return new Set(require(p).OFFEN_JURISTISCH || []);
}

/* Je Familie (kern, pro) das deutsche Soll und die Module der anderen Sprachen. */
function moduleFinden(tools) {
  const dateien = fs.existsSync(tools) ? fs.readdirSync(tools).sort() : [];
  const familien = [];
  for (const [familie, endung] of [['kern', '-modul.json'], ['pro', '-pro-modul.json']]) {
    const deDatei = path.join(tools, 'textsatz-de' + endung);
    if (!fs.existsSync(deDatei)) continue;
    const muster = new RegExp('^textsatz-([a-z]{2})' + endung.replace(/[.-]/g, (z) => '\\' + z) + '$');
    const ist = [];
    for (const f of dateien) {
      const m = muster.exec(f);
      if (!m || m[1] === 'de') continue;
      if (familie === 'kern' && f.endsWith('-pro-modul.json')) continue;
      ist.push({ sprache: m[1], quelle: 'tools/' + f, texte: leseJson(path.join(tools, f)).texte || {} });
    }
    if (familie === 'kern') {
      for (const f of dateien) {
        const m = /^textsatz-([a-z]{2})-daten\.js$/.exec(f);
        if (!m || ist.some((x) => x.sprache === m[1])) continue;
        const exp = require(path.join(tools, f))['TEXTSATZ_' + m[1].toUpperCase() + '_TEXTE'];
        if (exp && typeof exp === 'object') ist.push({ sprache: m[1], quelle: 'tools/' + f + ' (Daten, kein gebautes Modul)', texte: exp });
      }
    }
    familien.push({ familie, soll: leseJson(deDatei).texte || {}, ist });
  }
  return familien;
}

function teilA(tools) {
  const amtlich = amtlicheKennungen(tools);
  const raus = [];
  for (const { familie, soll, ist } of moduleFinden(tools)) {
    for (const mod of ist) {
      const zaehl = { fehlt: {}, deutsch: {} };
      const fehlt = [], deutsch = [];
      let amtlichDeutsch = 0, umlaut = 0;
      for (const [k, de] of Object.entries(soll)) {
        const a = art(k);
        if (!Object.prototype.hasOwnProperty.call(mod.texte, k)) {
          if (amtlich.has(k)) continue;
          zaehl.fehlt[a] = (zaehl.fehlt[a] || 0) + 1; fehlt.push({ kennung: k, art: a, de });
          continue;
        }
        if (mod.texte[k] !== de || typeof de !== 'string' || !WORT.test(de)) continue;
        if (amtlich.has(k)) { amtlichDeutsch++; continue; }
        zaehl.deutsch[a] = (zaehl.deutsch[a] || 0) + 1;
        if (UMLAUT.test(de)) umlaut++;
        deutsch.push({ kennung: k, art: a, de, umlaut: UMLAUT.test(de) });
      }
      raus.push({
        familie, sprache: mod.sprache, quelle: mod.quelle, soll: Object.keys(soll).length,
        fehlt: fehlt.length, deutsch: deutsch.length, deutschMitUmlaut: umlaut, amtlichDeutsch,
        jeArt: zaehl, fundstellen: { fehlt, deutsch },
      });
    }
  }
  return raus;
}

function teilB(wurzel) {
  const stellen = [];
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const p = path.join(wurzel, datei);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach((zeile, i) => {
      const t = zeile.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      const re = /\.([A-Za-z]+De)\b(?!\s*:)/g;
      let m;
      while ((m = re.exec(zeile))) {
        stellen.push({ datei, zeile: i + 1, eigenschaft: m[1], art: AUSGABE.test(zeile) ? 'oberflaeche' : 'pruefen', text: t.slice(0, 160) });
      }
    });
  }
  return stellen;
}

/* TEIL C — TEXT-TRÄGER OHNE KENNUNG. Der Bestand des geladenen Kerns wird mit dem Träger-Erheber
   (`tools/textsatz-traeger-erheben.js`) abgelaufen. Ein Träger, dessen Wert nicht im deutschen Satz steht,
   läuft am Textsatz vorbei und erscheint in jeder Sprache so, wie er im Kern steht. Zu den Arten des Kerns
   kommen die Eigenschaften `<name>De`, die Teil B im Quelltext findet. Die Art im Bericht folgt dem Pfad:
   `optionen` → Auswahl, `titel`, `text`, `toast`, `frage`, `einleitung` → Dialog, sonst → Feld. */
function artAusPfad(pfad, eigenschaft) {
  if (/\.optionen\b|\.optionen\[|\.optionen\./.test(pfad) || /CODES\b/.test(pfad)) return 'auswahl';
  if (/^(titel|text|toast|frage|einleitung|einfuehrung)$/.test(eigenschaft)) return 'dialog';
  return 'feld';
}

/* `quelltext` (optional): eine Wurzel, deren Name im Quelltext außerhalb von Kommentarzeilen nur einmal
   vorkommt (ihre Definition), liest niemand. Ihre Träger erscheinen nicht und zählen getrennt als „ungelesen“. */
function vorkommen(quelltext, name) {
  let n = 0;
  const re = new RegExp('\\b' + name + '\\b');
  for (const zeile of quelltext.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')) {
    const t = zeile.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    if (re.test(zeile)) n++;
  }
  return n;
}

/* Ein Füll-Platzhalter (`fuellByWert`/`refByWert` … `.platzhalter`) wird nicht angezeigt: er ist das Suchwort,
   an dessen Stelle der Erzeuger den Wert der Person setzt; trägt die Option der Anzeigesprache ihn nicht, nimmt
   `_dokPlatzhalterErsetzen` ihre eine Klammergruppe. Ob das in jeder Sprache trägt, prüft der Klassenwächter in
   tests/dokument-platzhalter-sprache.test.js — hier ist er kein Träger. */
const FUELL_PLATZHALTER = /\.(fuellByWert|refByWert)\.[^.]+\.platzhalter$/;

function teilC(wurzeln, deWerte, arten, quelltext) {
  const { traegerErheben } = require('./textsatz-traeger-erheben.js');
  const roh = traegerErheben(wurzeln, { satzWerte: deWerte, arten });
  const erg = Object.assign({}, roh, { ungedeckt: roh.ungedeckt.filter((t) => !FUELL_PLATZHALTER.test(t.pfad)) });
  const gelesen = new Map();
  const istGelesen = (w) => {
    if (typeof quelltext !== 'string') return true;
    if (!gelesen.has(w)) gelesen.set(w, vorkommen(quelltext, w) > 1);
    return gelesen.get(w);
  };
  const alle = erg.ungedeckt.map((t) => {
    const wurzel = t.pfad.split('.')[0];
    return { pfad: t.pfad, wurzel, eigenschaft: t.art, art: artAusPfad(t.pfad, t.art), text: t.text, gelesen: istGelesen(wurzel) };
  });
  const liste = alle.filter((t) => t.gelesen);
  const jeArt = {}, jeWurzel = {};
  for (const t of liste) { jeArt[t.art] = (jeArt[t.art] || 0) + 1; jeWurzel[t.wurzel] = (jeWurzel[t.wurzel] || 0) + 1; }
  const ungelesen = {};
  for (const t of alle) if (!t.gelesen) ungelesen[t.wurzel] = (ungelesen[t.wurzel] || 0) + 1;
  return { ungedeckt: liste.length, unklar: erg.zahlen.unklar, jeArt, jeWurzel, ungelesen, fundstellen: liste };
}

/* Gemessen wird nach Kennung, nicht nach Wert: der Kern des englischen Produkts, nachdem der Textsatz
   angewendet ist. Ein Träger, den eine Kennung erreicht, trägt danach einen Wert aus dem englischen Satz
   (oder, als Rückfall, aus dem deutschen — den zählt Teil A). Ein Träger ohne Kennung behält den Text
   aus dem Kern, auch wenn derselbe Text zufällig unter einer anderen Kennung im deutschen Satz steht.
   So zählt ein Bauplan-Text, den der Satz zur Laufzeit ersetzt (`vollmachtBmj#<feldId>.hilfetext`), nicht mit. */
function teilCAmKern(wurzel, deSchluessel) {
  const { ladeKern } = require(path.join(wurzel, 'tests', 'load-kern.js'));
  const { deTexte } = require(path.join(wurzel, 'tools', 'lib', 'textsatz-de-quelle.js'));
  const { satzWerte } = require('./textsatz-traeger-erheben.js');
  const { V } = ladeKern({ produkt: 'privat-en' });
  V.textsatzNeuAnwenden();
  const ziel = {};
  for (const f of ['textsatz-en-modul.json']) {
    const p = path.join(wurzel, 'tools', f);
    if (fs.existsSync(p)) Object.assign(ziel, leseJson(p).texte || {});
  }
  /* Deutsche Satzwerte decken mit: die Quellen ab Werk (`AB_WERK_*`) tragen den deutschen Ursprung, übersetzt
     wird erst das abgeleitete Modul. Grenze: ein Text ohne eigene Kennung gilt als gedeckt, wenn derselbe Text
     unter einer anderen Kennung steht. Für Dokument-Titel prüft das darum `dokTitelOhneKennung` nach Kennung. */
  const werte = satzWerte(deTexte(), V._markePlatzhalterAufloesen);
  for (const w of satzWerte(ziel, V._markePlatzhalterAufloesen)) werte.add(w);
  const arten = [].concat(V.TEXTSATZ_ARTEN || [], ['frage', 'hilfetext', 'einleitung', 'toast'], deSchluessel);
  const quelltext = fs.readFileSync(path.join(wurzel, 'vivodepot.html'), 'utf8');
  const c = teilC(V, werte, arten, quelltext);
  c.dokTitelOhneKennung = dokTitelOhneKennung(V, deTexte(), amtlicheKennungen(path.join(wurzel, 'tools')));
  return c;
}

/* Jeder Abschnittstitel eines Dokument-Moduls (Register `VORSORGE_MODULE[].generator`) wird über
   `dok:<id>#<i>.titel` übersetzt (`_textsatzAufDokumentModulAnwenden`). Fehlt die Kennung im deutschen Satz,
   bleibt der Titel in jeder Sprache deutsch — auch wenn Teil C ihn über einen gleichen Wert anderswo für gedeckt
   hält oder ihn als einzelnes Wort „unklar“ nennt. `amtlich` sagt, ob das Modul sonst amtlichen Wortlaut trägt. */
function dokTitelOhneKennung(V, de, amtlich) {
  const raus = [];
  for (const e of (V.VORSORGE_MODULE || [])) {
    const m = e && e.generator;
    if (!m || !m.id || !Array.isArray(m.abschnitte)) continue;
    const modulAmtlich = Object.keys(de).some((k) => k.startsWith('dok:' + m.id + '#') && k.endsWith('.titel') && amtlich.has(k));
    m.abschnitte.forEach((a, i) => {
      if (!a || typeof a.titel !== 'string' || !a.titel.trim()) return;
      const k = 'dok:' + m.id + '#' + i + '.titel';
      if (!Object.prototype.hasOwnProperty.call(de, k)) raus.push({ kennung: k, titel: a.titel, modulAmtlich });
    });
  }
  return raus;
}

/* TEIL D — AUSWAHL IN ENGLISCH. Gelesen wird, was die Auswahl zeigt, nicht eine Kennung: die Bauer der Auswahllisten im
   geladenen Kern, einmal in Deutsch und einmal, nachdem der englische Satz angewendet ist. `sammeln` kennt die Bauer mit Namen;
   die Feldauswahl (`feldInputHTML`, case 'auswahl') liest `optionen[].label` aus SEKTOREN, darum läuft der Bestand ganz ab.
   Ein Eintrag mit Daten der Person (Namen, Dateien) entsteht hier nicht, weil das Depot dafür leer ist. */
const AUSWAHL_BAUER = ['beziehung', 'vertretungsGrundlage', 'rhythmus', 'institutionsArt', 'instrument', 'platzhalter',
  'jaNein', 'bankvollmacht', 'bedingung', 'feld'];

const ENTITAET = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
function optionenAusHtml(h) {
  return [...String(h).matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map((m) => ({
    wert: ((/value="([^"]*)"/.exec(m[1]) || [])[1] || ''),
    text: m[2].replace(/&(amp|lt|gt|quot|#39);/g, (z) => ENTITAET[z]),
  }));
}

function feldOptionen(sektoren) {
  const raus = [];
  const gesehen = new WeakSet();
  const lauf = (o, pfad, tiefe) => {
    if (!o || typeof o !== 'object' || tiefe > 8 || gesehen.has(o)) return;
    gesehen.add(o);
    if (Array.isArray(o)) { o.forEach((x, i) => lauf(x, pfad + '[' + ((x && x.id) || i) + ']', tiefe + 1)); return; }
    if (Array.isArray(o.optionen) && o.optionen.length && o.optionen.every((x) => x && typeof x === 'object' && 'wert' in x)) {
      raus.push({ stelle: 'feld:' + pfad, optionen: o.optionen.map((x) => ({ wert: String(x.wert), text: String(x.label) })) });
    }
    for (const k of Object.keys(o)) {
      if (k === 'optionen') continue;
      let v;
      try { v = o[k]; } catch (_) { continue; }
      if (v && typeof v === 'object') lauf(v, pfad + '.' + k, tiefe + 1);
    }
  };
  lauf(sektoren, 'SEKTOREN', 0);
  return raus;
}

function sammeln(V) {
  const raus = [];
  const nimm = (stelle, optionen) => raus.push({ stelle, optionen: optionen.map((o) => ({ wert: String(o.wert), text: String(o.text) })) });
  const sel = [];
  V._beziehungsAuswahlFuellen({ appendChild: (o) => sel.push({ wert: o.value, text: o.textContent }) }, '');
  nimm('beziehung', sel);
  nimm('vertretungsGrundlage', optionenAusHtml(V.vertretungsGrundlageOptionenHTML('')));
  nimm('rhythmus', optionenAusHtml(V._dokumentRhythmusOptionenHTML(0)));
  nimm('institutionsArt', V.institutionsArtenAlle().map((o) => ({ wert: o.wert, text: o.label })));
  nimm('instrument', V.instrumentZeileOptionen().map((o) => ({ wert: o.wert, text: o.label })));
  nimm('platzhalter', optionenAusHtml(V._auswahlPlatzhalterHTML(true) + V._auswahlEntfernenHTML(false)).map((o, i) => ({ wert: 'platz' + i, text: o.text })));
  nimm('jaNein', V._jaNeinOptionen().map((o) => ({ wert: o.wert, text: o.label })));
  const d = V.getData();
  d.sektoren = d.sektoren || {};
  const vorher = d.sektoren.advanceCare;
  d.sektoren.advanceCare = Object.assign({}, vorher || {}, { provisionInstruments: [{ id: 'teil-d-bv', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank' }] });
  try { nimm('bankvollmacht', V.bankvollmachtVorschlag().map((o) => ({ wert: o.id, text: o.name }))); }
  finally { if (vorher === undefined) delete d.sektoren.advanceCare; else d.sektoren.advanceCare = vorher; }
  nimm('bedingung', ((V.bedingungskatalog() || {}).eintraege || []).map((e) => ({ wert: e.kennung, text: e.kennung })));
  for (const f of feldOptionen(V.bereicheAlle())) raus.push(f);
  return raus;
}

/* Ein Code in Großbuchstaben (Währung „EUR“, Steuerklasse „III“, Kennung „SD-BASE-DP“) lautet in jeder Sprache gleich und ist kein Wort. */
const CODE = /^[A-Z0-9][A-Z0-9 .\-]*$/;

/* Vergleich je Stelle und Wert. Fund: in Englisch derselbe Text wie in Deutsch, mit einem Wort aus drei Buchstaben, und nicht in
   der Ausnahmeliste (`<stelle>|<wert>`). Fehlt eine Stelle oder ein Wert in Englisch, steht das unter `fehlt`. */
function teilDVergleichen(de, en, ausnahmen) {
  const enMap = new Map();
  for (const s of en) for (const o of s.optionen) enMap.set(s.stelle + '|' + o.wert, o.text);
  const funde = [], fehlt = [], ausgenommen = [];
  let eintraege = 0;
  for (const s of de) {
    for (const o of s.optionen) {
      eintraege++;
      const k = s.stelle + '|' + o.wert;
      if (!enMap.has(k)) { fehlt.push({ stelle: s.stelle, wert: o.wert, de: o.text }); continue; }
      if (enMap.get(k) !== o.text || !WORT.test(o.text) || CODE.test(o.text)) continue;
      if (ausnahmen.has(k)) { ausgenommen.push(k); continue; }
      funde.push({ stelle: s.stelle, wert: o.wert, text: o.text });
    }
  }
  const jeBauer = {};
  for (const f of funde) { const b = f.stelle.split(':')[0]; jeBauer[b] = (jeBauer[b] || 0) + 1; }
  const bauer = [...new Set(de.filter((s) => s.optionen.length).map((s) => s.stelle.split(':')[0]))];
  return { stellen: de.length, eintraege, bauer, funde, fehlt, ausgenommen, jeBauer };
}

function auswahlAusnahmen(tools) {
  const p = path.join(tools, 'sprachluecken-auswahl-ausnahmen.json');
  if (!fs.existsSync(p)) return new Set();
  return new Set((leseJson(p).eintraege || []).map((e) => e.stelle + '|' + e.wert));
}

/* Stellen im Kern, die Auswahl-Einträge bauen (`<option`, `createElement('option')`, `new Option`), außerhalb von Kommentarzeilen. */
function auswahlBaustellen(quelltext) {
  let n = 0;
  for (const zeile of String(quelltext).replace(/\/\*[\s\S]*?\*\//g, '').split('\n')) {
    const t = zeile.trim();
    if (t.startsWith('//') || t.startsWith('*')) continue;
    n += (zeile.match(/<option\b|createElement\('option'\)|new Option\(/g) || []).length;
  }
  return n;
}

async function teilDAmKern(wurzel) {
  const { ladeKern } = require(path.join(wurzel, 'tests', 'load-kern.js'));
  const { V } = ladeKern({ backen: true });
  await V.depotAnlegen('sprachluecken-teil-d-2026!');
  V.betreteApp();
  const de = sammeln(V);
  const r = V.modulEinlassen(JSON.stringify(V.TEXTSATZ_EN_QUELLE));
  if (!r || !r.angenommen) throw new Error('englischer Satz nicht angenommen: ' + ((r && r.grund) || ''));
  V._textsatzModuleAusDepotAnmelden(V.getData());
  V.getData().textsprache = 'en';
  V.textsatzNeuAnwenden();
  const en = sammeln(V);
  const d = teilDVergleichen(de, en, auswahlAusnahmen(path.join(wurzel, 'tools')));
  d.baustellen = auswahlBaustellen(fs.readFileSync(path.join(wurzel, 'vivodepot.html'), 'utf8'));
  return d;
}

function messen(wurzel, opts) {
  const b = teilB(wurzel);
  const e = { wurzel, teilA: teilA(path.join(wurzel, 'tools')), teilB: b };
  if (opts && opts.mitKern) e.teilC = teilCAmKern(wurzel, [...new Set(b.map((s) => s.eigenschaft))]);
  return e;
}

/* Mit Teil D (asynchron, der Kern legt ein Depot an). `messen` bleibt synchron für die bestehenden Aufrufer. */
async function messenMitAuswahl(wurzel, opts) {
  const e = messen(wurzel, opts);
  if (opts && opts.mitKern) e.teilD = await teilDAmKern(wurzel);
  return e;
}

function ausgeben(e, n) {
  const z = [];
  z.push('Teil A — Textsatz je Sprachmodul (fehlt / deutsch geblieben, ohne amtlichen Wortlaut)');
  for (const m of e.teilA) {
    const jeArt = (o) => ['feld', 'auswahl', 'dialog', 'sonstige'].map((a) => a + ' ' + (o[a] || 0)).join(', ');
    z.push('  ' + m.familie + '/' + m.sprache + ' (' + m.quelle + '): Soll ' + m.soll + ' · fehlt ' + m.fehlt + ' [' + jeArt(m.jeArt.fehlt) + ']' +
      ' · deutsch ' + m.deutsch + ' [' + jeArt(m.jeArt.deutsch) + '], davon mit Umlaut oder ß ' + m.deutschMitUmlaut +
      ' · amtlich deutsch (gewollt) ' + m.amtlichDeutsch);
    for (const f of m.fundstellen.fehlt.slice(0, n)) z.push('      fehlt   ' + f.art.padEnd(9) + f.kennung + '  „' + String(f.de).slice(0, 60) + '“');
    for (const f of m.fundstellen.deutsch.slice(0, n)) z.push('      deutsch ' + f.art.padEnd(9) + f.kennung + '  „' + String(f.de).slice(0, 60) + '“');
  }
  const ob = e.teilB.filter((s) => s.art === 'oberflaeche');
  z.push('Teil B — feste deutsche Anzeige im Kern (.<name>De): ' + e.teilB.length + ' Stellen, davon in die Oberfläche ' + ob.length);
  for (const s of e.teilB) z.push('  ' + s.art.padEnd(11) + s.datei + ':' + s.zeile + '  .' + s.eigenschaft + '  ' + s.text.slice(0, 100));
  if (e.teilC) {
    const c = e.teilC;
    z.push('Teil C — Text-Träger im Kern ohne Kennung im Satz (gilt für jede Sprache außer Deutsch): ' + c.ungedeckt +
      ' [' + ['feld', 'auswahl', 'dialog'].map((a) => a + ' ' + (c.jeArt[a] || 0)).join(', ') + '], dazu unklar (ein einzelnes Wort) ' + c.unklar);
    z.push('  je Wurzel: ' + Object.entries(c.jeWurzel).map(([w, k]) => w + ' ' + k).join(', '));
    if (Object.keys(c.ungelesen).length) z.push('  nicht gezählt, die Wurzel liest niemand: ' + Object.entries(c.ungelesen).map(([w, k]) => w + ' ' + k).join(', '));
    for (const t of c.fundstellen.slice(0, n)) z.push('  ' + t.art.padEnd(8) + t.pfad + '  „' + String(t.text).slice(0, 70) + '“');
    const d = c.dokTitelOhneKennung || [];
    z.push('Teil C2 — Dokument-Titel ohne Kennung dok:<id>#<i>.titel: ' + d.length);
    for (const t of d) z.push('  ' + t.kennung + '  „' + t.titel + '“' + (t.modulAmtlich ? '  (Modul mit amtlichem Wortlaut)' : ''));
  }
  if (e.teilD) {
    const d = e.teilD;
    z.push('Teil D — Auswahl in Englisch wie in Deutsch: ' + d.funde.length + ' Funde in ' + d.stellen + ' Auswahlen (' + d.eintraege +
      ' Einträge), fehlt in Englisch ' + d.fehlt.length + ', ausgenommen ' + d.ausgenommen.length + ', Baustellen im Kern ' + d.baustellen);
    if (d.funde.length) z.push('  je Bauer: ' + Object.entries(d.jeBauer).map(([b, k]) => b + ' ' + k).join(', '));
    for (const f of d.funde.slice(0, n)) z.push('  ' + f.stelle + ' | ' + f.wert + '  „' + String(f.text).slice(0, 70) + '“');
    for (const f of d.fehlt.slice(0, n)) z.push('  fehlt ' + f.stelle + ' | ' + f.wert + '  „' + String(f.de).slice(0, 70) + '“');
  }
  return z.join('\n') + '\n';
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const wi = a.indexOf('--wurzel');
  const ni = a.indexOf('--fundstellen');
  const wurzel = wi >= 0 ? path.resolve(a[wi + 1]) : VORLAGE;
  const n = ni >= 0 ? Number(a[ni + 1]) : 20;
  messenMitAuswahl(wurzel, { mitKern: a.includes('--mit-kern') }).then((e) => {
    process.stdout.write(a.includes('--json') ? JSON.stringify(e, null, 2) + '\n' : ausgeben(e, n));
  }, (err) => { process.stderr.write(String(err && err.stack || err) + '\n'); process.exitCode = 1; });
}

module.exports = { messen, messenMitAuswahl, art, teilC, artAusPfad, dokTitelOhneKennung, teilDVergleichen, teilDAmKern, auswahlBaustellen, optionenAusHtml, AUSWAHL_BAUER, VORLAGE };
