#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════
   demo-bauen.js — Demos zum Selbst-Durchklicken für die Website (26.09.2026)
   ───────────────────────────────────────────────────────────
   Eine Demo ist eine Folge von Schritten über ECHTE Ansichten, mit einer Leiste Zurück · Weiter · Selbst ausprobieren
   (Handsteuerung der Vorführung, U2-ADR-413-Nachtrag). Kein Passwort, keine Datei: jedes Beispiel ist in die Seite gebacken
   und schon geöffnet. Ein Schritt liegt auf einer Seite — der Anwendung mit einem bestimmten Beispiel (`app-<beispiel>/`) oder der
   Lese-App der Empfängerin (`lesen/`). Jede Seite trägt die relativen Adressen aller Schritte (`schrittAdressen`, mit
   `?schritt=<nr>`) und navigiert nach der globalen Nummer; die Seiten lesen nur ihre eigene Adresse — kein Speicher, kein Netz.

   ALLES ÜBER DEN KERN DES PRODUKTS, NICHTS VON HAND:
   - ein Beispiel-Depot wird über die Schreibwege des Kerns gebaut (showcaseNutzlastErzeugen, dieselben Wächter wie bei einer
     Bürgerin);
   - ein abgeleitetes Beispiel („zuschnitt“) ist der Zuschnitt eines Empfängerkreises aus einem anderen Beispiel
     (empfaengerZuschnittModell) — genau die Datei, die die Empfängerin bekäme;
   - die Antwort in der Lese-App entsteht über den echten Antwort-Weg (anfrageAntwortDatensatz) aus dem Beispiel.
   Die Seiten sind das Produkt plus gebackener Block (AB_WERK_SHOWCASE bzw. AB_WERK_VORFUEHRUNG_LESEN), sonst byte-gleich.

   Aufruf:
     node tools/demo-bauen.js --szenario <name> --produkt <vivodepot.html eines erzeugten Produkts> --aus <ordner> [--sprache de|en] [--lesen <vivodepot-lesen.html>]
     → <ordner>/index.html (führt zum ersten Schritt), <ordner>/app-<beispiel>/vivodepot.html (+ sw.js, manifest.webmanifest),
       <ordner>/lesen/vivodepot-lesen.html, <ordner>/pruefung.json.
   Das Szenario liegt in tools/demo-szenarien/<name>.json (Format demoSzenario/1).
   ═══════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const S = require('./vorfuehrung-showcase-erzeugen.js');

const REPO = path.join(__dirname, '..');
const SZENARIEN = path.join(__dirname, 'demo-szenarien');
const LESEN_BEGIN = '/* AB_WERK_VORFUEHRUNG_LESEN:BEGIN */';
const LESEN_ENDE = '/* AB_WERK_VORFUEHRUNG_LESEN:END */';
const TEXT_PFLICHT = ['streifen', 'zurueck', 'weiter', 'selbstAusprobieren', 'schrittVon', 'tippen', 'leerlaufHinweis', 'weiterAnsehen', 'gesperrt', 'schliessen', 'situationTitel', 'ueberblick', 'notizLabel', 'mehr', 'weniger'];

function szenarioLaden(name) {
  const p = path.join(SZENARIEN, name + '.json');
  if (!fs.existsSync(p)) throw new Error('Szenario ' + name + ' gibt es nicht (' + path.relative(REPO, p) + ').');
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (s.format !== 'demoSzenario/1') throw new Error(name + ': unbekanntes Format ' + s.format);
  return s;
}

/* Die Beispiel-Depots, aus denen ein Szenario mit „produkt: pro“ baut (22.10.2026): sie tragen Pro-Felder, die ein
   Privat-Produkt nicht kennt. Klassenwächter über den Szenarienordner bauen sie darum auf dem Pro-Produkt. Dateinamen im Ordner. */
function proDepots() {
  const aus = new Set();
  for (const n of fs.readdirSync(SZENARIEN).filter((x) => x.endsWith('.json'))) {
    const s = JSON.parse(fs.readFileSync(path.join(SZENARIEN, n), 'utf8'));
    if (s.format !== 'demoSzenario/1' || s.produkt !== 'pro') continue;
    for (const b of Object.values(s.beispiele || {})) if (b.depot) aus.add(b.depot);
  }
  return aus;
}

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');

// Zeitstempel aus dem Bau machen zwei Läufe verschieden — sie werden auf den festen Stand des Szenarios gesetzt.
function standFestschreiben(o, stand) {
  if (Array.isArray(o)) return o.map((x) => standFestschreiben(x, stand));
  if (o && typeof o === 'object') {
    const aus = {};
    for (const [k, v] of Object.entries(o)) aus[k] = (['zeitpunkt', 'erstelltAm', 'stand', 'exportiertAm'].includes(k) && typeof v === 'string') ? stand : standFestschreiben(v, stand);
    return aus;
  }
  return o;
}

// Zufalls-ids (uuidV4) aus dem Bau durch feste ersetzen, in Reihenfolge ihres ersten Auftretens — wie das Vorführ-Werkzeug
// für das Beispiel-Depot. Innerhalb eines Blocks bleiben Verweis und Ziel gleich, zwei Läufe ergeben dieselben Bytes.
function idsFestschreiben(o, praefix) {
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/g;
  const fest = new Map();
  return JSON.parse(JSON.stringify(o).replace(uuid, (u) => { if (!fest.has(u)) fest.set(u, praefix + String(fest.size + 1).padStart(4, '0')); return fest.get(u); }));
}

function lesenInBacken(lesenText, nutzlast) {
  const a = lesenText.indexOf(LESEN_BEGIN);
  const b = lesenText.indexOf(LESEN_ENDE);
  if (a < 0 || b < a || lesenText.indexOf(LESEN_BEGIN, a + 1) >= 0) throw new Error('AB_WERK_VORFUEHRUNG_LESEN-Marker fehlt oder ist doppelt — nachsehen, nicht raten.');
  return lesenText.slice(0, a + LESEN_BEGIN.length) + '\nconst AB_WERK_VORFUEHRUNG_LESEN = ' + JSON.stringify(nutzlast) + ';\n' + lesenText.slice(b);
}

const seiteVon = (schritt) => (schritt.seite === 'lesen' ? 'lesen' : 'app-' + schritt.beispiel);
const dateiVon = (seite) => (seite === 'lesen' ? 'vivodepot-lesen.html' : 'vivodepot.html');
const adresse = (seite, nr) => '../' + seite + '/' + dateiVon(seite) + '?schritt=' + nr;

/* Baut die Demo im Speicher: je Seite der gebackene Text. Wirft bei jedem unbekannten Bezug — kein stiller Rest. */
/* Die Anfrage in der Sprache der Demo (26.09.2026): die Stelle schreibt im Produkt in ihrer eigenen Sprache — in einer
   englischen Demo ist die Stelle eine englischsprachige. Eine deutsche Anfrage in der englischen Fassung las sich wie ein
   Sprachleck (vgl. LEBENSLAGEN-EN-DEUTSCH-LECK). Deutsch steht in `anfrage` selbst, jede andere Sprache in
   `anfrageUebersetzung[sprache]`: von, zweck, grundlage und je Feld der Zweck, in der Reihenfolge der Felder. Fehlt etwas, bricht
   der Bau ab; Kennungen und alles andere bleiben unberührt. */
function anfrageInSprache(sz, sprache) {
  if (!sz || !sz.anfrage || sprache === 'de') return sz;
  const u = sz.anfrageUebersetzung && sz.anfrageUebersetzung[sprache];
  if (!u) throw new Error(sz.name + ': die Anfrage hat keine Übersetzung für ' + sprache + ' (anfrageUebersetzung.' + sprache + ').');
  for (const k of ['von', 'zweck', 'grundlage']) if (typeof u[k] !== 'string' || !u[k].trim()) throw new Error(sz.name + ': Anfrage-Übersetzung ' + sprache + ' ohne ' + k + '.');
  if (!Array.isArray(u.felder) || u.felder.length !== sz.anfrage.felder.length || u.felder.some((z) => typeof z !== 'string' || !z.trim()))
    throw new Error(sz.name + ': Anfrage-Übersetzung ' + sprache + ' braucht je Feld einen Zweck (' + sz.anfrage.felder.length + ').');
  const anfrage = Object.assign({}, sz.anfrage, { von: u.von, zweck: u.zweck, grundlage: u.grundlage,
    felder: sz.anfrage.felder.map((f, i) => Object.assign({}, f, { zweck: u.felder[i] })) });
  return Object.assign({}, sz, { anfrage });
}

/* Das Urteil des Validators an der Station „fhir-ips“ (01.10.2026): gezeigt heißt die Datei UND ihr Prüfergebnis, an derselben Stelle.
   Die Zeile entsteht aus dem Bericht von tools/demo-ips-validieren.js über genau diese Demo, nie von Hand — Zahlen, die niemand
   gemessen hat, kann sie nicht tragen. Der Bericht kommt aus einem ersten Bau; das Bündel hängt am Beispiel, nicht am Text, also ändert
   der zweite Bau nicht, was geprüft wurde. `href` ist relativ zur Seite der Anwendung. */
function pruefungsZeile(pruefbericht, texte, buendelSha256) {
  const { inhalt, href } = pruefbericht;
  // Das Urteil gilt nur für die Datei, die geprüft wurde (03.10.2026): Bündel-Hash der Demo gegen den Hash im Bericht.
  if (!inhalt || typeof inhalt.buendelSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(inhalt.buendelSha256)) throw new Error('pruefbericht: ohne buendelSha256 — der Bericht ist älter als die Bindung an die Datei, neu prüfen (tools/demo-ips-validieren.js).');
  if (inhalt.buendelSha256 !== buendelSha256) throw new Error('pruefbericht: gilt für ein anderes Bündel (' + inhalt.buendelSha256.slice(0, 12) + ' statt ' + String(buendelSha256).slice(0, 12) + ') — die Datei hat sich geändert, neu prüfen (tools/demo-ips-validieren.js).');
  if (!/^[\w./-]+$/.test(String(href || '')) || /^\//.test(href) || /\.\.\/\.\./.test(href)) throw new Error('pruefbericht.href: ein relativer Pfad, nicht ' + href);
  const fall = inhalt && Array.isArray(inhalt.bericht) && inhalt.bericht.find((b) => b.erwartet === 'gueltig');
  if (!fall || !Array.isArray(fall.fehler) || !Array.isArray(fall.warnungen)) throw new Error('pruefbericht: kein Fall „gueltig“ mit fehler und warnungen — der Bericht ist älter als die Warnungs-Zählung oder nicht von demo-ips-validieren.js.');
  const rot = inhalt.bericht.find((b) => b.erwartet === 'ungueltig');
  if (!rot || rot.ist !== 'ungueltig') throw new Error('pruefbericht: ohne gefallenen Rot-Beweis ist das Urteil keines.');
  for (const k of ['pruefungZeile', 'pruefungGueltig', 'pruefungUngueltig', 'pruefungBericht']) if (typeof texte[k] !== 'string' || !texte[k].trim()) throw new Error('Text ' + k + ' fehlt (Prüfzeile).');
  const werte = { urteil: fall.ist === 'gueltig' ? texte.pruefungGueltig : texte.pruefungUngueltig, fehler: fall.fehler.length, warnungen: fall.warnungen.length, pakete: (inhalt.pakete || []).join(', ') };
  return { text: texte.pruefungZeile.replace(/\{(\w+)\}/g, (m, k) => (k in werte ? String(werte[k]) : m)), href, linkText: texte.pruefungBericht };
}

function demoBauen({ szenario, produktText, lesenText, sprache = 'de', pruefbericht = null }) {
  const sz = anfrageInSprache(typeof szenario === 'string' ? szenarioLaden(szenario) : szenario, sprache);
  if (!['de', 'en'].includes(sprache)) throw new Error('Sprache de|en, nicht ' + sprache);
  S._produktPruefen(produktText);
  const ps = S._produktSprache(produktText);
  if (ps && ps !== sprache) throw new Error('Das Produkt ist ' + ps + ', verlangt ist ' + sprache + '.');
  const texte = (sz.texte || {})[sprache];
  if (!texte) throw new Error(sz.name + ': keine Texte für ' + sprache);
  for (const k of TEXT_PFLICHT) if (typeof texte[k] !== 'string' || !texte[k].trim()) throw new Error(sz.name + ': Text ' + k + ' (' + sprache + ') fehlt.');
  const V = S._kernAusProdukt(produktText);
  const ansichten = V.VORFUEHRUNG_ANSICHTEN;

  // 1 · Beispiele: erst die mit eigenem Depot, dann die abgeleiteten.
  const beispiele = {};
  const rohDepot = {};
  const kontakte = {};
  let antwort = null;
  for (const [key, b] of Object.entries(sz.beispiele || {})) {
    if (!b.depot) continue;
    const daten = JSON.parse(fs.readFileSync(path.join(SZENARIEN, b.depot), 'utf8'));
    if (Array.isArray(b.dokumente)) daten.documents = b.dokumente;   // „Meine Dokumente“ eines Beispiels gehört zum Szenario, nicht zur Depot-Datei (Demo Schwerbehindertenausweis, 14.10.2026)
    const depot = S.showcaseNutzlastErzeugen({ daten, V, sprache, dokumentOrdner: SZENARIEN });   // Dateien unter `documents` liegen neben der Depot-Datei bzw. relativ zum Szenarienordner (Italien-Demo, 15.10.2026)
    if (Array.isArray(daten.kreise)) {
      depot.empfaengerkreise = daten.kreise.map((k) => ({ id: k.id, name: k.name, bausteine: k.bausteine.slice(), ausnahmen: [], stand: sz.stand, letzteAusgabe: null }));
      for (const k of depot.empfaengerkreise) for (const id of k.bausteine) if (!V._empfaengerBausteinById(id)) throw new Error(key + ': Baustein ' + id + ' kennt der Kern nicht.');
    }
    /* Zurückgehalten für dieses Szenario (06.11.2026, Demo fragen-am-eintrag): eine Depot-Datei dient mehreren Demos. Gibt sie
       eine geschützte Angabe dauerhaft frei, die Geschichte des Szenarios aber noch nicht, nimmt `zurueckgehalten` am Beispiel diese
       Freigabe zurück, über den Schreibweg des Kerns. So zeigt die Demo die Freigabe als eigenen Schritt. */
    if (b.zurueckgehalten !== undefined) {
      if (!Array.isArray(b.zurueckgehalten)) throw new Error(key + ': zurueckgehalten ist keine Liste.');
      for (const kennung of b.zurueckgehalten) {
        const s = V.kennungZuSelektor(kennung);
        if (!s || !V.kennungFeldDef(kennung)) throw new Error(key + ': zurueckgehalten — Kennung ' + kennung + ' ist dem Kern unbekannt.');
        V.sensibelFeldSetzen(s.sektorId, s.feldId, true);
      }
      depot.sensibelFelder = JSON.parse(JSON.stringify(V.getData().sensibelFelder || {}));
    }
    beispiele[key] = depot;
    // Adressaten der Demo „Fragen am Eintrag“ (06.11.2026): Schlüssel der Depot-Datei → Kennung des Kontakts im Depot.
    // Die Reihenfolge bleibt beim Schreiben erhalten (institutionHinzufuegen je Eintrag, s. showcaseNutzlastErzeugen).
    kontakte[key] = new Map((daten.institutions || []).map((i, n) => [i.key, ((depot.institutionen || [])[n] || {}).id]));
    // Solange dieses Depot im Kern offen ist: der Zuschnitt für abgeleitete Beispiele und die Antwort.
    rohDepot[key] = JSON.parse(JSON.stringify(V.getData()));
    rohDepot[key].empfaengerkreise = depot.empfaengerkreise || [];
    if (sz.antwort && sz.antwort.aus === key) {
      const ds = V.anfrageAntwortDatensatz(sz.anfrage);
      if (!ds) throw new Error(sz.name + ': die Anfrage ist ungültig — anfragePruefen lehnt sie ab.');
      if (ds.unbekannt && ds.unbekannt.length) throw new Error(sz.name + ': Kennungen der Anfrage kennt der Kern nicht: ' + ds.unbekannt.map((u) => u.kennung).join(', '));
      antwort = idsFestschreiben(standFestschreiben(ds, sz.stand), 'demo-');
    }
  }
  for (const [key, b] of Object.entries(sz.beispiele || {})) {
    if (!b.zuschnitt) continue;
    const quelle = rohDepot[b.zuschnitt.aus];
    if (!quelle) throw new Error(key + ': Zuschnitt aus unbekanntem Beispiel ' + b.zuschnitt.aus);
    const kreis = quelle.empfaengerkreise.find((k) => k.id === b.zuschnitt.kreis);
    if (!kreis) throw new Error(key + ': Kreis ' + b.zuschnitt.kreis + ' gibt es in ' + b.zuschnitt.aus + ' nicht.');
    V.setData(quelle);
    const subset = V.empfaengerZuschnittModell(kreis, quelle);
    /* Der Teil trägt die Freigabe-Entscheidung der Mutter nicht mit (das Produkt gibt `sensibelFelder` nicht weiter). Wer
       ihn hält, entscheidet selbst — `zuschnitt.freigegeben` ist diese Entscheidung, gesetzt wie im Produkt. Die Antwort
       entsteht aus dem Teil mit IHRER Entscheidung, nicht mit der der Mutter (26.09.2026: sonst hielt der Dialog in Annas
       Teil zurück, was die Antwort an die Klinik zeigte). */
    V.setData(Object.assign(JSON.parse(JSON.stringify(quelle)), JSON.parse(JSON.stringify(subset)), { empfaengerkreise: [], sensibelFelder: {} }));
    for (const kennung of b.zuschnitt.freigegeben || []) {
      const s = V.kennungZuSelektor(kennung);
      if (!s || !V.kennungFeldDef(kennung)) throw new Error(key + ': freigegeben — Kennung ' + kennung + ' ist dem Kern unbekannt.');
      V.sensibelFeldSetzen(s.sektorId, s.feldId, false);
    }
    if (Object.keys(V.getData().sensibelFelder || {}).length) subset.sensibelFelder = JSON.parse(JSON.stringify(V.getData().sensibelFelder));
    const depot = {};
    for (const f of S.INHALTS_FELDER) if (subset[f] !== undefined && subset[f] !== null) depot[f] = subset[f];
    beispiele[key] = idsFestschreiben(standFestschreiben(depot, sz.stand), 'showcase-');
    // Die Antwort kann auch aus dem Teil kommen, den eine Angehörige bekam (Todesfall: sie antwortet dem Standesamt).
    if (sz.antwort && sz.antwort.aus === key) {
      const ds = V.anfrageAntwortDatensatz(sz.anfrage);
      if (!ds) throw new Error(sz.name + ': die Anfrage ist ungültig — anfragePruefen lehnt sie ab.');
      antwort = idsFestschreiben(standFestschreiben(ds, sz.stand), 'demo-');
    }
  }

  // 2 · Schritte: Nummer, Seite, und wo der Nachbar auf einer anderen Seite liegt, dessen Adresse.
  const schritte = (sz.schritte || []).map((st, i) => {
    const nr = i + 1;
    const seite = seiteVon(st);
    if (st.seite !== 'lesen' && !beispiele[st.beispiel]) throw new Error('Schritt ' + nr + ': Beispiel „' + st.beispiel + '“ gibt es nicht.');
    if (st.seite === 'lesen' && !antwort) throw new Error('Schritt ' + nr + ': Lese-App ohne Antwort — `antwort.aus` fehlt im Szenario.');
    if (st.seite !== 'lesen') {
      /* Fragen am Eintrag (06.11.2026): Szenario-Fehler vor den Kern-Fehlern melden. Ein Gesprächsblatt nennt seinen Adressaten
         als Schlüssel einer Institution des Beispiels; die Frage-Ansicht kennt nur das Ziel `antworten`. */
      if (st.adressat !== undefined && !(kontakte[st.beispiel] && kontakte[st.beispiel].get(st.adressat))) throw new Error('Schritt ' + nr + ': Adressat „' + st.adressat + '“ gibt es im Beispiel ' + st.beispiel + ' nicht.');
      const blatt = st.ansicht === 'gespraechsblatt';
      if (blatt && st.ziel !== undefined && st.ziel !== 'freigabe') throw new Error('Schritt ' + nr + ': Gesprächsblatt-Ziel „' + st.ziel + '“ gibt es nicht (nur freigabe).');
      if (blatt && st.adressat === undefined) throw new Error('Schritt ' + nr + ': ein Gesprächsblatt braucht einen Adressaten.');
      /* Freigabe (06.11.2026): eine besonders geschützte Angabe kommt nur angekreuzt auf das Blatt, über die Übersicht vor der
         Ausgabe. `freigabe` nennt die angekreuzten Felder; jedes muss ein Feld des Kerns sein. */
      if (st.freigabe !== undefined && (!blatt || !Array.isArray(st.freigabe) || !st.freigabe.every((z) => typeof z === 'string' && V.kennungFeldDef(z)))) throw new Error('Schritt ' + nr + ': Freigabe „' + [].concat(st.freigabe).join(', ') + '“ ist kein Feld eines Gesprächsblatts.');
      if (st.ansicht === 'frage' && st.ziel !== 'antworten') throw new Error('Schritt ' + nr + ': Frage-Ziel „' + st.ziel + '“ gibt es nicht (nur antworten).');
      if (st.ansicht === 'frage' && !(V.FRAGEN_ZIELFELDER || []).includes(st.feld)) throw new Error('Schritt ' + nr + ': Feld „' + st.feld + '“ trägt keine Fragen.');
      if (st.ansicht === 'frage' && (typeof texte.antwortBeispiel !== 'string' || !texte.antwortBeispiel.trim())) throw new Error(sz.name + ': Text antwortBeispiel (' + sprache + ') fehlt.');
      if (!ansichten.includes(st.ansicht)) throw new Error('Schritt ' + nr + ': Ansicht „' + st.ansicht + '“ kennt der Kern nicht.');
      if (st.ansicht === 'bereich' && !V.SEKTOR_BY_ID[st.ziel]) throw new Error('Schritt ' + nr + ': Bereich „' + st.ziel + '“ gibt es nicht.');
      // Notfall-Ansicht: `ziel` ist die Kennung der Zeile, die in den Blick gehört (z. B. die Notfallkontakte).
      if (st.ansicht === 'notfall' && st.ziel && !V.kennungFeldDef(st.ziel)) throw new Error('Schritt ' + nr + ': Kennung „' + st.ziel + '“ kennt der Kern nicht.');
      if (st.ansicht === 'blatt' && !V._angSituationById(st.ziel)) throw new Error('Schritt ' + nr + ': Blatt „' + st.ziel + '“ gibt es nicht.');
      if ((st.ansicht === 'anfrage' || st.ansicht === 'freigabe') && !sz.anfrage) throw new Error('Schritt ' + nr + ': Ansicht ' + st.ansicht + ' ohne Anfrage im Szenario.');
      // Freigabe in zwei Schritten (06.10.2026): ohne Ziel die Auswahl, mit 'bestaetigen' das Einmalpasswort und „Antworten“.
      if (st.ansicht === 'freigabe' && st.ziel !== undefined && st.ziel !== 'bestaetigen') throw new Error('Schritt ' + nr + ': Freigabe-Ziel „' + st.ziel + '“ gibt es nicht (nur bestaetigen).');
      // Ausgabe (06.10.2026): ziel ist ein Ausgabeweg, den die Vorführung des Kerns wirklich fahren kann — sonst wäre die Station leer.
      if (st.ansicht === 'ausgabe') {
        const wege = V.VORFUEHRUNG_AUSGABEN || {};
        if (!Object.prototype.hasOwnProperty.call(wege, st.ziel)) throw new Error('Schritt ' + nr + ': Ausgabeweg „' + st.ziel + '“ kann die Vorführung nicht fahren (' + Object.keys(wege).join(', ') + ').');
        if (st.ziel === 'ausgabe:anfrage-antwort' && !sz.anfrage) throw new Error('Schritt ' + nr + ': Ausgabe der Antwort ohne Anfrage im Szenario.');
        for (const k of ['ausgabeKopf', 'ausgabeChiffrat']) if (typeof texte[k] !== 'string' || !texte[k].trim()) throw new Error(sz.name + ': Text ' + k + ' (' + sprache + ') fehlt — ohne ihn steht die Datei unbeschriftet da.');
      }
    }
    const text = st.text && st.text[sprache];
    if (typeof text !== 'string' || !text.trim()) throw new Error('Schritt ' + nr + ': Text (' + sprache + ') fehlt.');
    const aus = { nr, text };
    if (st.titel && st.titel[sprache]) aus.titel = st.titel[sprache];
    // Anker der Notiz (01.10.2026, wie in der Vorführung): ein Selektor; die Notiz klebt an der Ecke dieses Elements.
    if (st.anker) aus.anker = String(st.anker);
    // Die Rolle, in der man schaut (26.09.2026, Rollenbalken): Art (empfaenger | vollmacht) wählt die Farbe, der Text steht im Balken.
    if (st.rolle) {
      /* „person“: die Person antwortet selbst (Heimeinzug, 26.09.2026). Sie steht auf derselben Seite wie eine bevollmächtigte
         Person — dem Depot gegenüber der fragenden Stelle —, also dieselbe Spalte. */
      if (!['empfaenger', 'vollmacht', 'person'].includes(st.rolle.art)) throw new Error('Schritt ' + nr + ': Rolle „' + st.rolle.art + '“ gibt es nicht (empfaenger | vollmacht | person).');
      if (!st.rolle.text || typeof st.rolle.text[sprache] !== 'string' || !st.rolle.text[sprache].trim()) throw new Error('Schritt ' + nr + ': Rollentext (' + sprache + ') fehlt.');
      aus.rolle = { art: st.rolle.art, text: st.rolle.text[sprache] };
    }
    if (st.seite !== 'lesen') {
      aus.ansicht = st.ansicht; if (st.ziel) aus.ziel = st.ziel;
      if (st.adressat !== undefined) aus.adressat = kontakte[st.beispiel].get(st.adressat);
      if (st.freigabe !== undefined) aus.freigabe = st.freigabe.slice();
      if (st.ansicht === 'frage') { aus.bereich = st.feld.split('.')[0]; aus.feld = st.feld.split('.').slice(1).join('.'); }
      if (st.ansicht === 'fhir-ips' && pruefbericht) {
        const IPS = require('./demo-ips-validieren.js');
        aus.pruefung = pruefungsZeile(pruefbericht, texte, IPS.buendelSha256(IPS.buendelAusDepot(S._kernAusProdukt(produktText), beispiele[st.beispiel])));
      }
      // Wer in der Demo herausgibt, bekommt das Einmalpasswort aus der Geschichte, sonst ist der Dialog eine Sackgasse (28.09.2026).
      const art = (sz.anfrage && sz.anfrage.antwort && sz.anfrage.antwort.art) || 'einmalpasswort';
      if ((st.ansicht === 'freigabe' || st.ansicht === 'ausgabe') && art === 'einmalpasswort') {
        for (const k of ['einmalpasswortSzene', 'einmalpasswortBeispiel']) if (typeof texte[k] !== 'string' || !texte[k].trim()) throw new Error(sz.name + ': Text ' + k + ' (' + sprache + ') fehlt — ohne ihn ist das Herausgeben in der Demo eine Sackgasse.');
        if (!texte.einmalpasswortSzene.includes(texte.einmalpasswortBeispiel)) throw new Error(sz.name + ': die Szene nennt das Einmalpasswort nicht (' + sprache + ').');
      }
    }
    else if (st.ansicht === 'anfrage') {
      /* Die Anfrage der Stelle, bevor es eine Antwort gibt (Kalt-Lesetest 26.09.2026: die Demo zeigte das Ergebnis vor dem Vorgang).
         Zu sehen ist, was sie fragt und wozu — nichts hervorzuheben, keine Szene. */
      if (!sz.anfrage) throw new Error('Schritt ' + nr + ': Anfrage-Ansicht ohne Anfrage im Szenario.');
      if (st.szene || st.hervorheben || st.hervorhebenFelder || st.fokus) throw new Error('Schritt ' + nr + ': die Anfrage-Ansicht zeigt keine Antwort, also nichts hervorzuheben.');
      // 'anfrageNichtProdukt' (28.09.2026): diese Ansicht gibt es nur in der Demo — sie sagt es selbst, damit niemand sie für das Produkt hält.
      for (const k of ['anfrageTitel', 'anfrageGefragt', 'anfrageNichtProdukt']) if (typeof texte[k] !== 'string' || !texte[k].trim()) throw new Error(sz.name + ': Text ' + k + ' (' + sprache + ') fehlt.');
      aus.ansicht = 'anfrage';
    }
    else {
      aus.ansicht = 'antwort';
      if (st.hervorheben) {
        // herkunft: der Herkunftsvermerk je Angabe; aktionen: die Weitergabe der Antwort in die Software der Stelle.
        if (!['herkunft', 'aktionen'].includes(st.hervorheben)) throw new Error('Schritt ' + nr + ': Hervorheben „' + st.hervorheben + '“ gibt es nicht (herkunft | aktionen).');
        aus.hervorheben = st.hervorheben;
      }
      if (st.hervorhebenFelder) {
        // Die Stelle in der Antwort, nicht die Beschriftung: zwei Angaben können gleich heißen („Ablageort").
        aus.hervorhebenStellen = st.hervorhebenFelder.map((kennung) => {
          const i = antwort.felder.findIndex((x) => x.kennung === kennung);
          if (i < 0) throw new Error('Schritt ' + nr + ': Feld ' + kennung + ' steht nicht in der Antwort.');
          return i;
        });
      }
      // Die Szene: vor der ersten Ansicht, wer die Person ist und wer man selbst ist — statt einer Ansicht.
      if (st.szene) {
        if (typeof st.szene[sprache] !== 'string' || !st.szene[sprache].trim()) throw new Error('Schritt ' + nr + ': Szene (' + sprache + ') fehlt.');
        if (st.hervorhebenFelder || st.fokus) throw new Error('Schritt ' + nr + ': eine Szene zeigt keine Antwort, also nichts hervorzuheben.');
        aus.szene = st.szene[sprache];
      }
      if (st.kopf) {
        if (typeof st.kopf[sprache] !== 'string' || !st.kopf[sprache].trim()) throw new Error('Schritt ' + nr + ': Kopf (' + sprache + ') fehlt.');
        aus.kopf = st.kopf[sprache];
      }
      if (st.fokus) {
        if (!aus.hervorhebenStellen || !aus.hervorhebenStellen.length) throw new Error('Schritt ' + nr + ': Fokus ohne hervorgehobene Angabe zeigt nichts.');
        aus.fokus = true;
      }
    }
    return { seite, station: aus };
  });
  if (!schritte.length) throw new Error(sz.name + ': keine Schritte.');
  /* Der Rollenwechsel bekommt eine ruhige Zwischenkarte (Kalt-Lesetest 26.09.2026): wo die Rolle eines Schritts eine andere ist als die
     des vorigen, sagt die Seite beim Ankommen zuerst „Jetzt wechseln Sie die Seite", dann erst die Ansicht. */
  for (let i = 1; i < schritte.length; i++) {
    const vor = schritte[i - 1].station.rolle, jetzt = schritte[i].station.rolle;
    const eigen = sz.schritte[i].wechsel && sz.schritte[i].wechsel[sprache];
    if (vor && jetzt && vor.art !== jetzt.art) {
      // Der Satz der Karte: je Wechsel eigener (wer die andere Seite ist, wo sie ist), sonst der allgemeine aus den Texten.
      const text = (typeof eigen === 'string' && eigen.trim()) ? eigen : texte.wechsel;
      if (typeof text !== 'string' || !text.trim()) throw new Error(sz.name + ': Text wechsel (' + sprache + ') fehlt, Schritt ' + (i + 1) + ' wechselt die Rolle.');
      schritte[i].station.wechsel = text;
    } else if (sz.schritte[i].wechsel) throw new Error('Schritt ' + (i + 1) + ': Zwischenkarte ohne Rollenwechsel.');
  }
  const gesamt = schritte.length;
  // Je Schritt die Adresse seiner Seite — die Seiten navigieren nach der globalen Nummer (eine Seite kann 1, 2 und 5 tragen).
  const schrittAdressen = schritte.map((s) => adresse(s.seite, s.station.nr));
  // Die Schrittleiste im Rollenbalken: jede Seite kennt die Titel aller Schritte, auch der auf anderen Seiten.
  const schrittTitel = schritte.map((s) => s.station.titel || '');
  /* Die Situation (U2-ADR-413 Nachtrag (3)): zwei, drei Sätze, wer die Person ist, was geschehen ist, woher der Teil kommt — oben in
     der Spalte, auf jeder Seite derselbe Text. Ohne sie zeigt die Spalte Rolle, Schritte und Knöpfe. */
  let situation = null;
  if (sz.situation) {
    if (typeof sz.situation[sprache] !== 'string' || !sz.situation[sprache].trim()) throw new Error(sz.name + ': Situation (' + sprache + ') fehlt.');
    situation = sz.situation[sprache];
  }

  // 3 · Seiten backen.
  const seiten = {};
  const { _serviceWorkerVorhandenAufText } = require('./lib/produkt-text-erzeugen.js');
  for (const seite of [...new Set(schritte.map((s) => s.seite))]) {
    const stationen = schritte.filter((s) => s.seite === seite).map((s) => s.station);
    if (seite === 'lesen') {
      seiten[seite] = lesenInBacken(lesenText, {
        format: 'vorfuehrungLesen/1', sprache, gesamt, schrittAdressen, schrittTitel, situation, texte: Object.assign({}, texte), stationen,
        // Was die Stelle gefragt hat — für die Anfrage-Ansicht, bevor es eine Antwort gibt.
        // Die Beschriftung je Feld aus dem Kern (Heimeinzug, 26.09.2026): eine zurückgehaltene Angabe steht nicht in der Antwort,
        // und ohne Beschriftung zeigte die Anfrage-Ansicht die Kennung („finance.accounts") — Klasse Rohwert.
        anfrage: sz.anfrage ? { von: sz.anfrage.von, zweck: sz.anfrage.zweck, felder: sz.anfrage.felder.map((f) => {
          const def = V.kennungFeldDef(f.kennung);
          if (!def || typeof def.label !== 'string' || !def.label.trim()) throw new Error(sz.name + ': Kennung ' + f.kennung + ' hat im Kern keine Beschriftung.');
          return { kennung: f.kennung, zweck: f.zweck, label: def.label };
        }) } : null,
        antwort, umschlag: { vorgang: (sz.anfrage && sz.anfrage.vorgang) || '' },
      });
    } else {
      const beispiel = seite.slice('app-'.length);
      const nutzlast = {
        format: 'showcase/1', sprache, steuerung: 'hand', gesamt, schrittAdressen, schrittTitel, situation,
        stationSekunden: 8, leerlaufSekunden: 180, warnSekunden: 15,
        texte: Object.assign({}, texte), stationen, depot: beispiele[beispiel],
      };
      if (sz.anfrage) nutzlast.anfrage = sz.anfrage;
      seiten[seite] = _serviceWorkerVorhandenAufText(S.showcaseInKernBacken(produktText, nutzlast), true, 'dem übergebenen Produkt');
    }
  }
  const erste = schritte[0];
  // noindex (01.10.2026, wie die Einzelseiten-Vorführung): verlangt das Szenario es, trägt JEDE Seite der Demo das Meta, nie der Kern.
  const noindex = sz.noindex === true;
  if (noindex) for (const s of Object.keys(seiten)) seiten[s] = noindexEinsetzen(seiten[s]);
  // U2-ADR-470: das Backen ändert Blöcke (Vorführung, Service-Worker-Vermerk) — zuletzt die CSP-Hashes je Seite.
  const { cspNachBau } = require('./lib/csp-nach-bau.js');
  for (const s of Object.keys(seiten)) seiten[s] = cspNachBau(seiten[s]);
  return { name: sz.name, sprache, gesamt, seiten, noindex, start: erste.seite + '/' + dateiVon(erste.seite) + '?schritt=1', schritte: schritte.map((s) => ({ nr: s.station.nr, seite: s.seite })) };
}

/* Das Robots-Meta hinter die Zeichensatz-Zeile des Kopfes. Steht sie nicht genau einmal da, wirft es, statt still nichts zu schreiben.
   noindex hält Suchmaschinen fern; wer den Link hat, sieht die Demo. */
const NOINDEX_META = S.NOINDEX_META;
function noindexEinsetzen(text) {
  const treffer = String(text).match(/<meta charset="utf-8">/gi) || [];
  if (treffer.length !== 1) throw new Error('noindex: die Zeichensatz-Zeile steht ' + treffer.length + '-mal im Kopf, erwartet einmal — nachsehen.');
  if (text.includes(NOINDEX_META)) return text;
  return text.replace(treffer[0], treffer[0] + '\n' + NOINDEX_META);
}

/* DIE EINSTIEGSSEITE (v872, 02.10.2026): keine automatische Weiterleitung (vorher `meta refresh` — eine Seite, die von selbst
   weiterspringt, liest niemand, und die Prüfung der Website wertet sie als Fund), sondern Titel, der sichtbare Bau-Satz und ein
   Knopf zum Start. Der Bau-Satz nennt den Commit, aus dem die Demo gebaut ist: mit der veröffentlichten Fassung der Anwendung (`fassung`,
   seit 25.10.2026 „Anwendung: Vivodepot v1.0.N · Demo-Stand <hash>“, denn der Demo-Stand kann ein späterer Commit sein) oder
   als Vorschau aus einem Entwicklungsstand. Die Vorschau-Form ist die, die werkstatt/demo-pruefen.py erkennt. `namensnennung` (aus
   dem Szenario) trägt Pflicht-Nennungen wie die der IHE-D-Bezeichnungen (CC BY 4.0); URLs darin werden zu Links. noindex wie jede
   Demo-Seite; eine Probe der Startseite hält das.
   GESTALTUNG (04.10.2026, Entwurf der Website-Gestaltung): ein Block inline-CSS, die Seite steht allein im Ordner und lädt nichts nach. Inter
   mit Systemschrift-Rückfall, keine Serifen; Farben aus vd.css der Website (salbei-dunkel, cream, ink). Kopfleiste, Kennzeile,
   Titel, ein Einleitungssatz aus dem Szenariofeld `kurz` (fehlt er, entfällt der Absatz), Knopf, darunter klein Bau-Satz,
   „erfunden“-Satz und Namensnennung. Titel und Text brechen auch ein überlanges Wort um, statt die Seite auf dem Handy seitlich
   zu verschieben: eine Browser-Probe der Einstiegsseite hält das (360 und 390 px, alle Szenariotitel, mit Gegenprobe). */
const BAU_SATZ = {
  de: { fassung: (f, c) => 'Anwendung: Vivodepot ' + f + ' · Demo-Stand ' + c, vorschau: (c) => 'Vorschau, gebaut aus dem Entwicklungsstand ' + c + ' — noch keine freigegebene Fassung.', start: 'Demo starten',
    kennung: 'Demo · erfundene Beispielpersonen', erfunden: 'Alle Personen, Orte und Daten sind erfunden.', fuss: 'Vivodepot · läuft im Browser, ohne Konto' },
  en: { fassung: (f, c) => 'Application: Vivodepot ' + f + ' · demo build ' + c, vorschau: (c) => 'Preview built from development state ' + c + ' — not yet a released version.', start: 'Start the demo',
    kennung: 'Demo · fictional example people', erfunden: 'All people, places and data are fictional.', fuss: 'Vivodepot · runs in the browser, no account' },
};
function bauSatz(bau, sprache) {
  const t = BAU_SATZ[sprache] || BAU_SATZ.en;
  if (!bau || !/^[0-9a-f]{7,40}$/.test(String(bau.commit || ''))) throw new Error('Einstiegsseite: der Bau-Commit fehlt oder ist kein Commit-Hash (--bau-commit).');
  if (bau.fassung && !/^v1\.0\.\d+$/.test(bau.fassung)) throw new Error('Einstiegsseite: --fassung hat die Form v1.0.<n>.');
  return bau.fassung ? t.fassung(bau.fassung, bau.commit) : t.vorschau(bau.commit);
}
// Der Einleitungssatz ist ein Satz, keine zweite Lage-Beschreibung (die steht als `situation` in der Demo selbst).
const KURZ_HOECHSTENS = 240;
/* Ein zweiter Weg unter dem Startknopf (08.10.2026, Konzept „Studio als Einstieg“): das Szenariofeld `weiter` trägt je Sprache einen kurzen
   Linktext und eine https-Adresse, z. B. den Studio-Einstieg der Website. Nur https, keine Abfrage-Kennung — die Adresse ist dieselbe Tür
   wie auf der Website. Fehlt das Feld, entfällt der Absatz. */
const WEITER_TEXT_HOECHSTENS = 90;
function weiterPruefen(weiter) {
  if (weiter == null) return null;
  if (!weiter || typeof weiter.text !== 'string' || !weiter.text.trim() || weiter.text.length > WEITER_TEXT_HOECHSTENS) throw new Error('Einstiegsseite: `weiter.text` ist ein kurzer Linktext mit höchstens ' + WEITER_TEXT_HOECHSTENS + ' Zeichen.');
  if (typeof weiter.href !== 'string' || !/^https:\/\/[a-z0-9.-]+\/[^\s?#"<>]*$/i.test(weiter.href)) throw new Error('Einstiegsseite: `weiter.href` ist eine https-Adresse ohne Abfrage und ohne Anker.');
  return { text: weiter.text, href: weiter.href };
}
const EINSTIEG_STIL = ':root{--salbei-dunkel:#4F6539;--salbei-mid:#7B9A6A;--cream:#F6F5F1;--ink:#1C2A1E;--ink2:#4A5E4F;--ink3:#637568;--rand:#D8D2C4;'
  + "--font:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}\n"
  + '*{box-sizing:border-box}\nhtml{-webkit-text-size-adjust:100%}\n'
  + 'body,main,h1,p{overflow-wrap:anywhere;word-break:normal}\nh1,.lead,.bau p{hyphens:auto;-webkit-hyphens:auto}\n'
  + 'body{margin:0;background:var(--cream);color:var(--ink);font:400 17px/1.6 var(--font);min-height:100vh;display:flex;flex-direction:column}\n'
  + 'header{background:var(--salbei-dunkel);color:#fff;padding:14px 16px;font-weight:600;letter-spacing:.01em}\n'
  + 'header span{font-weight:400;opacity:.85;margin-left:10px}\n'
  + 'main{flex:1;width:100%;min-width:0;max-width:720px;margin:0 auto;padding:clamp(32px,8vw,64px) 16px 48px}\n'
  + '.kennung{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);margin:0 0 14px}\n'
  + 'h1{font-weight:700;font-size:clamp(24px,6.4vw,40px);line-height:1.18;color:var(--salbei-dunkel);margin:0 0 20px;letter-spacing:-.01em}\n'
  + '.lead{color:var(--ink2);margin:0 0 32px;max-width:60ch}\n'
  + '.knopf{display:inline-block;max-width:100%;text-align:center;background:var(--salbei-dunkel);color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;min-height:48px}\n'
  + '.knopf:hover,.knopf:focus-visible{background:var(--ink);outline:3px solid var(--salbei-mid);outline-offset:2px}\n'
  + '.weiter{margin:18px 0 0}\n.weiter a{color:var(--salbei-dunkel);font-weight:600}\n'
  + '.bau{margin-top:48px;padding-top:20px;border-top:1px solid var(--rand);font-size:14px;color:var(--ink3)}\n'
  + '.bau p{margin:0 0 8px}\n.bau a{color:var(--salbei-dunkel)}\n'
  + 'footer{padding:20px 16px;color:var(--ink3);font-size:13px;text-align:center}\n';
/* Das Seitenzeichen der Einstiegsseiten (13.10.2026): dasselbe `<link rel="icon">` wie die Produktseiten, als data:-Adresse, damit die Seite
   weiterhin nichts nachlädt. Die EINE Quelle ist vivodepot.html; fehlt dort das Tag, bricht der Bau ab, statt Seiten ohne Zeichen zu bauen. */
const ICON_LINK = /<link rel="icon" type="image\/png" href="data:image\/png;base64,[A-Za-z0-9+\/=]+">/;
let _iconLink = null;
function iconLink() {
  if (_iconLink) return _iconLink;
  const m = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8').match(ICON_LINK);
  if (!m) throw new Error('Einstiegsseite: vivodepot.html trägt kein <link rel="icon"> als data:-Adresse; die Seiten bekämen kein Seitenzeichen.');
  return (_iconLink = m[0]);
}
function startSeite(start, titel, sprache, { bau, namensnennung, kurz, weiter } = {}) {
  const t = String(titel || 'Demo');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const verlinkt = (s) => esc(s).replace(/https:\/\/[^\s<)]+/g, (u) => '<a href="' + u + '">' + u.replace(/^https:\/\//, '') + '</a>');
  const w = BAU_SATZ[sprache] || BAU_SATZ.en;
  if (kurz != null && (typeof kurz !== 'string' || !kurz.trim() || kurz.length > KURZ_HOECHSTENS)) throw new Error('Einstiegsseite: `kurz` ist ein Satz mit höchstens ' + KURZ_HOECHSTENS + ' Zeichen.');
  return '<!doctype html>\n<html lang="' + sprache + '"><head><meta charset="utf-8">\n'
    + '<meta name="robots" content="noindex, nofollow">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + iconLink() + '\n'
    + '<title>' + esc(t) + '</title>\n<style>\n' + EINSTIEG_STIL + '</style></head>\n'
    + '<body>\n<header>Vivodepot<span>Demo</span></header>\n<main>\n'
    + '<p class="kennung">' + esc(w.kennung) + '</p>\n'
    + '<h1>' + esc(t) + '</h1>\n'
    + (kurz ? '<p class="lead">' + esc(kurz) + '</p>\n' : '')
    + '<p><a class="knopf" href="' + esc(start) + '">' + esc(w.start) + '</a></p>\n'
    + (weiterPruefen(weiter) ? '<p class="weiter"><a href="' + esc(weiter.href) + '">' + esc(weiter.text) + '</a></p>\n' : '')
    + '<div class="bau">\n<p>' + esc(bauSatz(bau, sprache)) + '</p>\n'
    + '<p>' + esc(w.erfunden) + '</p>\n'
    + (namensnennung ? '<p>' + verlinkt(namensnennung) + '</p>\n' : '')
    + '</div>\n</main>\n<footer>' + esc(w.fuss) + '</footer>\n</body></html>\n';
}

function demoSchreiben(demo, ziel, { produktText, lesenText, titel, bau, namensnennung, kurz, weiter } = {}) {
  fs.mkdirSync(ziel, { recursive: true });
  // Nur die eigenen Unterordner werden ersetzt; was die Website daneben ablegt, bleibt stehen.
  for (const seite of Object.keys(demo.seiten)) {
    const ordner = path.join(ziel, seite);
    fs.rmSync(ordner, { recursive: true, force: true });
    fs.mkdirSync(ordner, { recursive: true });
    fs.writeFileSync(path.join(ordner, dateiVon(seite)), demo.seiten[seite], 'utf8');
    if (seite !== 'lesen') for (const f of ['sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(REPO, f), path.join(ordner, f));
  }
  fs.writeFileSync(path.join(ziel, 'index.html'), startSeite(demo.start, titel, demo.sprache, { bau, namensnennung, kurz, weiter }), 'utf8');
  const pruefung = {
    szenario: demo.name, sprache: demo.sprache, schritte: demo.schritte, start: demo.start,
    produkt: produktText ? sha256(produktText) : null, lesen: lesenText ? sha256(lesenText) : null,
    seiten: Object.fromEntries(Object.entries(demo.seiten).map(([s, t]) => [s, sha256(t)])),
  };
  fs.writeFileSync(path.join(ziel, 'pruefung.json'), JSON.stringify(pruefung, null, 2) + '\n', 'utf8');
  return pruefung;
}

function _arg(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(name + ' braucht einen Wert.');
  return argv[i + 1];
}

function main(argv) {
  const name = _arg(argv, '--szenario');
  const produkt = _arg(argv, '--produkt');
  const ziel = _arg(argv, '--aus');
  const sprache = _arg(argv, '--sprache') || 'de';
  const lesen = _arg(argv, '--lesen') || path.join(REPO, 'vivodepot-lesen.html');
  if (!name || !produkt || !ziel) throw new Error('Aufruf: --szenario <name> --produkt <vivodepot.html eines erzeugten Produkts> --aus <ordner> [--sprache de|en] [--lesen <datei>] [--bau-commit <hash>] [--fassung v1.0.<n>]');
  // Der Bau-Commit steht sichtbar auf der Einstiegsseite. Vorgabe: der Commit dieses Baums; --fassung nur, wenn er eine veröffentlichte Fassung ist.
  const bauCommit = _arg(argv, '--bau-commit') || require('node:child_process').execFileSync('git', ['rev-parse', '--short=9', 'HEAD'], { cwd: REPO, encoding: 'utf8', env: require('./lib/ohne-git-umgebung.js').ohneGitUmgebung() }).trim();
  const fassung = _arg(argv, '--fassung');
  const produktText = fs.readFileSync(produkt, 'utf8');
  require('./lib/erscheinungsbild-zustand.js').keinGeruest(produktText, 'demo-bauen');   // v894: nie das nackte Gerüst
  const lesenText = fs.readFileSync(lesen, 'utf8');
  const sz = szenarioLaden(name);
  const demo = demoBauen({ szenario: sz, produktText, lesenText, sprache });
  demoSchreiben(demo, ziel, { produktText, lesenText, titel: sz.titel && sz.titel[sprache], bau: { commit: bauCommit, fassung }, namensnennung: sz.namensnennung && sz.namensnennung[sprache], kurz: sz.kurz && sz.kurz[sprache], weiter: sz.weiter && sz.weiter[sprache] });
  console.log('Demo ' + name + ' (' + sprache + '): ' + demo.gesamt + ' Schritte, Seiten ' + Object.keys(demo.seiten).join(', ') + ' → ' + ziel);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error('FEHLER:', e.message); process.exitCode = 1; }
}

module.exports = { proDepots, noindexEinsetzen, pruefungsZeile, demoBauen, anfrageInSprache, demoSchreiben, startSeite, bauSatz, szenarioLaden, lesenInBacken, standFestschreiben, idsFestschreiben, LESEN_BEGIN, LESEN_ENDE, TEXT_PFLICHT };
