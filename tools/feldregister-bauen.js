#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   feldregister-bauen.js — der Bestand nach außen, fertig zum Hochladen
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-409, Punkt 9 (13.09.2026). Das Feldregister braucht keinen Server:
   die Ausgabe ist eine erzeugte Feldliste, ausgeliefert wie der Kern, und
   abrufbar unter `https://register.vivodepot.de` — dem Webspace-Verzeichnis
   `register/`, das dort bereits besteht und heute einen Platzhalter hält.

   Dieses Werkzeug erzeugt genau das, was in dieses Verzeichnis gehört:

     feldregister.json          die Liste, maschinenlesbar
     feldregister.json.sha256   die Prüfsumme, Format wie `vivodepot.html.sha256`
     index.html                 die Registerseite, die den Platzhalter ablöst
     index.json                 der KATALOG-INDEX (Register-Katalog-Plan §6 Schritt 3,
                                 14.09.2026) — nennt, welche Achsen-Register es unter diesem
                                 Verzeichnis gibt, je mit Fassung+Prüfsumme. Heute EIN Eintrag
                                 (feld), reine Umbenennung der Zusage „eine Datei" zu „ein
                                 Verzeichnis mit Index" — kein neues Verhalten der drei
                                 bestehenden Artefakte. Künftige Achsen-Register (Rechtsraum,
                                 Sprache, …) tragen sich hier additiv ein, jedes mit seinem
                                 eigenen Erzeuger — dieses Werkzeug schreibt nur den Eintrag für
                                 seine eigene Achse (feld), niemals für eine fremde.

   WARUM DIE PRÜFSUMME — die Begründung steht im ADR, Punkt 9, und sie ist
   kein Ordnungsfimmel: das Register liegt an ZWEI Orten (HiDrive-Ablage und
   Webspace). Ohne Prüfsumme ist nicht feststellbar, ob die Liste unter der
   Adresse dem entspricht, was der Erzeuger zuletzt gebaut hat. Genau diese
   Lücke besteht heute bereits einmal — die ausgelieferte Fassung auf
   `vivodepot.de` hängt hinter dem Kanon zurück, ohne dass es jemandem
   auffällt. Zweimal derselbe Fehler wäre keiner mehr, sondern eine Bauart.

   ERZEUGT, NICHT GEPFLEGT. Jedes der drei Artefakte trägt die Kopfzeile des
   Feldkatalogs — `Nicht von Hand bearbeiten` —, weil ein Register, das
   jemand nachträglich am Webspace korrigiert, seine eigene Zusage bricht.
   Die `.sha256`-Datei trägt sie NICHT: sie muss die reine Ausgabeform von
   `shasum -a 256` behalten, damit `shasum -c` sie lesen kann.

   DIE STANDZAHL WIRD GELESEN, NIE GESCHRIEBEN. `SCHALEN_STAND` steht in
   `vivodepot.html` und wird dort von `tools/build-standzahlen.js` und den
   Lockstep-Wächtern geführt. Dieses Werkzeug nimmt sie nur als Fassungsangabe
   mit — und WIRFT, wenn der Anker sie nicht findet, statt still ein leeres
   Feld zu liefern.

   QUELLE IST DER ERZEUGTE KATALOG, nicht der Kern: `bereiche/feldkatalog.json`
   entsteht aus `vivodepot.html SEKTOREN` (`tools/build-feldkatalog.js`, seit
   13.09.2026 mit Unterfeldern). Hier noch einmal in den Kern zu greifen hieße,
   dieselbe Sammlung zweimal zu bauen — und irgendwann verschieden.

   KEINE NAMEN VON PERSONEN. Der Katalog trägt Kennung, Bereich und
   Beschriftung; Werte stehen dort nirgends. Im Fuß steht die Vivodepot GmbH,
   wie im Platzhalter — keine Person.

   Aufruf:
     node tools/feldregister-bauen.js                      → schreibt nach register-ausgabe/
     node tools/feldregister-bauen.js --ziel <ordner>       → anderer Zielordner
     node tools/feldregister-bauen.js --katalog <datei>     → andere Quelle (Fixture/Probe)
     node tools/feldregister-bauen.js --kern <datei>        → andere Kern-Datei (Standzahl)
     node tools/feldregister-bauen.js --datum JJJJ-MM-TT    → Fassungsdatum setzen (sonst heute)
     node tools/feldregister-bauen.js --generator-url <url> → Generator-Link auf der Seite (sonst weggelassen)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { INDEX_DATEI, indexEintragBauen, indexJsonBauen, vorhandenenIndexLesen } = require('./lib/register-index.js');

const REPO = path.join(__dirname, '..');
const KATALOG_PFAD = path.join(REPO, 'bereiche', 'feldkatalog.json');
const BEREICHE_PFAD = path.join(REPO, 'bereiche', 'bereiche.json');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const ZIEL_VORGABE = path.join(REPO, 'register-ausgabe');

const JSON_DATEI = 'feldregister.json';
const PRUEFSUMMEN_DATEI = JSON_DATEI + '.sha256';
const SEITEN_DATEI = 'index.html';

const KOPFZEILE = 'ERZEUGT von tools/feldregister-bauen.js aus bereiche/feldkatalog.json. '
  + 'Nicht von Hand bearbeiten — der Kern ist die Quelle.';

/* ── Quellen ──────────────────────────────────────────────────────────── */

/** Die Standzahl des Kerns — GELESEN. Wirft, wenn der Anker sie nicht findet. */
function standzahlLesen(kernPfad) {
  const html = fs.readFileSync(kernPfad || KERN_PFAD, 'utf8');
  const m = /const SCHALEN_STAND = '(v\d+)'/.exec(html);
  if (!m) {
    throw new Error('feldregister-bauen: SCHALEN_STAND nicht gefunden in '
      + (kernPfad || KERN_PFAD) + ' — Format geändert? Nicht raten, nachsehen.');
  }
  return m[1];
}

/** Liest den erzeugten Feldkatalog und prüft ihn auf das, was ein Register braucht. */
function katalogLesen(katalogPfad) {
  const roh = JSON.parse(fs.readFileSync(katalogPfad || KATALOG_PFAD, 'utf8'));
  const felder = Array.isArray(roh.felder) ? roh.felder : null;
  if (!felder || !felder.length) {
    throw new Error('feldregister-bauen: keine Felder in ' + (katalogPfad || KATALOG_PFAD)
      + ' — eine leere Liste ist kein Register.');
  }
  for (const f of felder) {
    if (!f || typeof f.kennung !== 'string' || !f.kennung
      || typeof f.bereich !== 'string' || !f.bereich
      || !(typeof f.label === 'string' ? f.label : (f.label && f.label.de))) {
      throw new Error('feldregister-bauen: unvollständiger Katalogeintrag ' + JSON.stringify(f)
        + ' — kennung, bereich und label sind Pflicht.');
    }
  }
  /* Der Katalog trägt seine Zahl selbst. Stimmt sie nicht, wurde er von Hand
     angefaßt — und genau das schließt seine eigene Kopfzeile aus. */
  if (typeof roh.anzahl === 'number' && roh.anzahl !== felder.length) {
    throw new Error('feldregister-bauen: ' + (katalogPfad || KATALOG_PFAD) + ' meldet anzahl '
      + roh.anzahl + ', führt aber ' + felder.length + ' Einträge.');
  }
  /* SPRACHFREI (U2-ADR-409 Punkt 12): die Kennung ist undurchsichtig und muss darum aus
     reinem ASCII bestehen — eine Kennung mit Umlaut oder in fremder Schrift wäre schon eine
     Sprache. Gemessen am 13.09.2026: alle 457 erfüllen das. */
  for (const f of felder) {
    if (!/^[\x21-\x7e]+$/.test(f.kennung)) {
      throw new Error('feldregister-bauen: Kennung "' + f.kennung + '" ist nicht reines ASCII — '
        + 'eine Kennung trägt keine Sprache (U2-ADR-409 Punkt 12).');
    }
  }
  return felder.map((f) => ({ kennung: f.kennung, bereich: f.bereich, label: f.label }));
}

/* ── Status je Kennung (U2-ADR-409 Punkt 10) ─────────────────────────── */
/* Wörter nach der IANA-Konvention (HTTP Field Name Registry, RFC 9110 §16.3.1; RFC 8126 §9.6):
   permanent · deprecated · obsoleted. `provisional` fehlt bewusst — ein offener Vorschlag wird
   nicht veröffentlicht (U2-ADR-409 Punkt 1a: „Vorschläge" bleiben im Postfach, nie im Register).

   INAKTIVIERUNG WIE SNOMED, NIE LÖSCHEN (U2-ADR-409 Punkt 6/10): eine überholte Kennung bleibt
   im Register sichtbar, trägt aber ihren Status und — bei `obsoleted` Pflicht, bei `deprecated`
   optional — den Nachfolger. Diese Tabelle ist die einzige Quelle dafür. Sie ist heute leer, weil
   noch keine Kennung inaktiviert wurde — der Freigabeweg dafür ist Teil dessen, was in U2-ADR-409
   unter „Was offen ist" steht. Einträge kommen NUR hinzu, werden nie entfernt. */
const STATUS_ERLAUBT = Object.freeze(['permanent', 'deprecated', 'obsoleted']);
const INAKTIVIERT = Object.freeze({
  // 'bereich.alte-kennung': { status: 'obsoleted', nachfolger: 'bereich.neue-kennung' },
});

/** Hängt Status und ggf. Nachfolger an — U2-ADR-409 Punkt 10. Ohne Eintrag in `inaktiviert`
    gilt eine Kennung als `permanent`. Wirft bei unbekanntem Statuswort, bei `obsoleted` ohne
    Nachfolger, bei einem Nachfolger, der im Register nicht existiert, und bei einem Nachfolger
    an einer Kennung, die nicht `obsoleted` ist. */
function statusAnhaengen(felder, inaktiviert) {
  const tabelle = inaktiviert || INAKTIVIERT;
  const kennungen = new Set(felder.map((f) => f.kennung));
  return felder.map((f) => {
    const eintrag = tabelle[f.kennung];
    const status = eintrag ? eintrag.status : 'permanent';
    if (!STATUS_ERLAUBT.includes(status)) {
      throw new Error('feldregister-bauen: ' + f.kennung + ' trägt unbekanntes Statuswort "'
        + status + '" — erlaubt sind ' + STATUS_ERLAUBT.join(', ') + ' (U2-ADR-409 Punkt 10).');
    }
    const nachfolger = eintrag ? eintrag.nachfolger : undefined;
    if (status === 'obsoleted' && !nachfolger) {
      throw new Error('feldregister-bauen: ' + f.kennung + ' ist obsoleted ohne nachfolger — '
        + 'bei obsoleted ist der Nachfolger Pflicht (U2-ADR-409 Punkt 10).');
    }
    if (status === 'permanent' && nachfolger) {
      throw new Error('feldregister-bauen: ' + f.kennung + ' ist permanent und trägt trotzdem '
        + 'einen nachfolger — bei permanent darf kein Nachfolger stehen.');
    }
    if (nachfolger && !kennungen.has(nachfolger)) {
      throw new Error('feldregister-bauen: ' + f.kennung + ' nennt Nachfolger "' + nachfolger
        + '", der als Kennung im Register nicht existiert.');
    }
    const geordnet = { kennung: f.kennung, bereich: f.bereich, status };
    if (nachfolger) geordnet.nachfolger = nachfolger;
    geordnet.label = f.label;
    return geordnet;
  });
}

/* ── Beschriftungen je Sprache (U2-ADR-409 Punkt 12) ─────────────────── */
/* Die Bedeutung einer Kennung steht NICHT in der Kennung, sondern in ihren Beschriftungen.
   Quelle sind dieselben Sprachmodule, die das Produkt benutzt — keine zweite Übersetzung.
   Trägt ein Eintrag schon {de, en} (Fixture/Probe), gilt das; trägt er einen String (der
   erzeugte Katalog), wird Englisch aus dem Modul gelesen. Fehlt es: WERFEN — ein Register mit
   stiller Lücke in einer Sprache ist gerade nicht sprachfrei. */
const SPRACHMODULE = Object.freeze({
  de: path.join(REPO, 'tools', 'textsatz-de-modul.json'),
  en: path.join(REPO, 'tools', 'textsatz-en-modul.json'),
});
function sprachtexteLesen(pfade) {
  const aus = {};
  for (const [sprache, pfad] of Object.entries(pfade || SPRACHMODULE)) {
    const roh = JSON.parse(fs.readFileSync(pfad, 'utf8'));
    aus[sprache] = roh.texte || roh;
  }
  return aus;
}
function beschriftungenAnhaengen(felder, sprachtexte) {
  let texte = sprachtexte;
  return felder.map((f) => {
    /* Reihenfolge der Schlüssel im fertigen Eintrag (U2-ADR-409 Punkt 10):
       kennung, bereich, status, (nachfolger), label. */
    const kopf = { kennung: f.kennung, bereich: f.bereich, status: f.status };
    if (f.nachfolger) kopf.nachfolger = f.nachfolger;
    if (f.label && typeof f.label === 'object') {
      if (!f.label.de || !f.label.en) {
        throw new Error('feldregister-bauen: ' + f.kennung + ' trägt nicht de UND en.');
      }
      return { ...kopf, label: { de: f.label.de, en: f.label.en } };
    }
    if (!texte) texte = sprachtexteLesen();
    const de = String((texte.de && texte.de[f.kennung + '.label']) || f.label || '').trim();
    const en = String((texte.en && texte.en[f.kennung + '.label']) || '').trim();
    if (!de || !en) {
      throw new Error('feldregister-bauen: für ' + f.kennung + ' fehlt die '
        + (!de ? 'deutsche' : 'englische') + ' Beschriftung — nicht raten, nachziehen.');
    }
    return { ...kopf, label: { de, en } };
  });
}

/** Reihenfolge und Beschriftung der Bereiche aus `bereiche/bereiche.json` — optional. */
function bereichsOrdnung(bereichePfad) {
  const p = bereichePfad || BEREICHE_PFAD;
  if (!fs.existsSync(p)) return [];
  const roh = JSON.parse(fs.readFileSync(p, 'utf8'));
  return (Array.isArray(roh.bereiche) ? roh.bereiche : [])
    .filter((b) => b && typeof b.id === 'string')
    .map((b) => ({ id: b.id, label: (typeof b.label === 'string' && b.label) ? b.label : b.id }));
}

/** Gruppiert die Felder nach Bereich: Bereichsfolge aus `bereiche.json`, innerhalb
    jedes Bereichs die Katalogfolge (Unterfeld direkt hinter seinem Trägerfeld). */
function gruppieren(felder, ordnung) {
  const nachId = new Map();
  const folge = [];
  for (const f of felder) {
    if (!nachId.has(f.bereich)) { nachId.set(f.bereich, []); folge.push(f.bereich); }
    nachId.get(f.bereich).push(f);
  }
  const label = new Map(ordnung.map((b) => [b.id, b.label]));
  const sortiert = ordnung.map((b) => b.id).filter((id) => nachId.has(id));
  for (const id of folge) if (!sortiert.includes(id)) sortiert.push(id);   // unbekannter Bereich fällt nie aus
  return sortiert.map((id) => ({ id, label: label.get(id) || id, felder: nachId.get(id) }));
}

/* ── Fassungsangabe ───────────────────────────────────────────────────── */

function heute(d) {
  const x = d || new Date();
  const zwei = (n) => String(n).padStart(2, '0');
  return x.getFullYear() + '-' + zwei(x.getMonth() + 1) + '-' + zwei(x.getDate());
}

function datumDeutsch(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? m[3] + '.' + m[2] + '.' + m[1] : iso;
}

const MONATE_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function datumEnglisch(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? (Number(m[3]) + ' ' + MONATE_EN[Number(m[2]) - 1] + ' ' + m[1]) : iso;
}

/* ── Artefakt 1: die Liste ────────────────────────────────────────────── */

function registerJson(felder, fassung) {
  return JSON.stringify({
    hinweis: KOPFZEILE,
    fassung: { datum: fassung.datum, kern: fassung.kern },
    schluesselraum: 'kennung',
    anzahl: felder.length,
    herkunft: {
      quelle: 'bereiche/feldkatalog.json',
      erzeugerDerQuelle: 'tools/build-feldkatalog.js aus vivodepot.html SEKTOREN',
      kennungsform: '<bereich>.<feld> · Unterfelder <bereich>.<listenfeld>/<unterfeld>',
      pruefsumme: PRUEFSUMMEN_DATEI,
    },
    felder,
  }, null, 2) + '\n';
}

/* ── Artefakt 2: die Prüfsumme ────────────────────────────────────────── */
/* Format und Bauart wörtlich nach `tools/build-dateipruefsumme.js`: rohe Bytes,
   kein Text-Encoding, Ausgabeform `<hex>␣␣<datei>\n` — damit ein Abgleich von
   Hand (`shasum -c feldregister.json.sha256`) weiterhin funktioniert. */

function hashVonText(text) {
  return crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function pruefsummenZeile(hash) {
  return hash + '  ' + JSON_DATEI + '\n';
}

/* ── Artefakt 4: der Katalog-Index (Register-Katalog-Plan §6 Schritt 3) ──────
   Der Merge-Mechanismus selbst sitzt in tools/lib/register-index.js (gemeinsam mit
   den anderen Achsen-Registern, Schritt 4) — hier nur der Aufruf für die eigene
   Achse (`feld`). */
const INDEX_ACHSE = 'feld';

function indexEintrag(felderAnzahl, fassung, hash) {
  return indexEintragBauen({
    achse: INDEX_ACHSE, datei: JSON_DATEI, pruefsummeDatei: PRUEFSUMMEN_DATEI,
    hash, anzahl: felderAnzahl, fassung,
  });
}

function indexJson(vorhandenerIndex, eintrag) {
  return indexJsonBauen(vorhandenerIndex, eintrag);
}

/* ── Artefakt 3: die Seite ────────────────────────────────────────────── */

function htmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Aussehen und Texte sind die des Platzhalters, der seit Längerem unter
   `https://register.vivodepot.de` steht — übernommen, nicht neu entworfen.
   Ersetzt ist allein der Abschnitt „Stand": statt „noch nicht veröffentlicht"
   steht dort jetzt die Liste selbst. Kein externes Skript, keine externe
   Schrift, kein Tracker — dieselbe Zusage wie beim Kern. */
function seiteHtml(gruppen, fassung, hash, generatorUrl) {
  const anzahl = gruppen.reduce((n, g) => n + g.felder.length, 0);
  const stand = datumDeutsch(fassung.datum);
  const z = [];

  z.push('<!doctype html>');
  z.push('<html lang="de">');
  z.push('<head>');
  z.push('<meta charset="utf-8">');
  z.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  /* KEIN `noindex` — Produktentscheidung vom 13.09.2026 (U2-ADR-409 Punkt 10): die
     Platzhalter-Seite trug ihn zu Recht, weil dort nichts stand, worauf jemand verweisen sollte.
     Diese Seite trägt den Bestand. Ein Register, das Suchmaschinen nicht führen dürfen, findet
     auch der nicht, der danach sucht — und die Vorbilder sind sämtlich indexiert. */
  z.push('<title>Feldregister — Vivodepot</title>');
  z.push('<!-- ' + KOPFZEILE);
  z.push('     Fassung ' + stand + ' · Kern ' + fassung.kern + ' · ' + anzahl + ' Kennungen. -->');
  z.push('<style>');
  z.push('  :root { --salbei: #4F6539; --cream: #FAF8F3; --ink: #21261F; --ink2: #5A6154; --line: #DDD9CE; }');
  z.push('  * { box-sizing: border-box; }');
  z.push('  body { margin: 0; background: var(--cream); color: var(--ink);');
  z.push('         font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;');
  z.push('         line-height: 1.6; }');
  z.push('  main { max-width: 34rem; margin: 0 auto; padding: 4rem 1.5rem; }');
  z.push('  h1 { font-size: 1.5rem; font-weight: 600; color: var(--salbei); margin: 0 0 1.5rem; letter-spacing: 0.01em; }');
  z.push('  h2 { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em;');
  z.push('       color: var(--ink2); margin: 2.5rem 0 0.75rem; }');
  z.push('  h3 { font-size: 0.95rem; font-weight: 600; color: var(--salbei); margin: 2rem 0 0.5rem; }');
  z.push('  h3 .zahl { font-weight: 400; color: var(--ink2); font-size: 0.85rem; }');
  z.push('  p { margin: 0 0 1rem; }');
  z.push('  .lang-en { color: var(--ink2); }');
  z.push('  .fassung { font-size: 0.95rem; }');
  z.push('  .hash { font-size: 0.75rem; word-break: break-all; color: var(--ink2); margin-bottom: 0.5rem; }');
  z.push('  .nachpruefen { font-size: 0.85rem; color: var(--ink2); }');
  z.push('  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }');
  z.push('  .bereichsindex { list-style: none; margin: 0 0 1rem; padding: 0; font-size: 0.9rem; }');
  z.push('  .bereichsindex li { display: inline; }');
  z.push('  .bereichsindex li::after { content: " · "; color: var(--ink2); }');
  z.push('  .bereichsindex li:last-child::after { content: ""; }');
  z.push('  .kennungen { list-style: none; margin: 0; padding: 0; }');
  z.push('  .kennungen li { padding: 0.35rem 0; border-bottom: 1px solid var(--line); }');
  z.push('  .kennungen code { font-size: 0.8rem; word-break: break-all; }');
  z.push('  .kennungen .label { display: block; font-size: 0.9rem; color: var(--ink2); }');
  z.push('  .status { display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.03em;');
  z.push('            text-transform: uppercase; margin-left: 0.5rem; color: var(--ink2); }');
  z.push('  .status-deprecated, .status-obsoleted { color: #9a5b1f; }');
  z.push('  .status-nachfolger { text-transform: none; font-weight: 400; }');
  z.push('  footer { border-top: 1px solid var(--line); margin-top: 3rem; padding-top: 1rem;');
  z.push('           font-size: 0.85rem; color: var(--ink2); }');
  z.push('  a { color: var(--salbei); }');
  z.push('</style>');
  z.push('</head>');
  z.push('<body>');
  z.push('<main>');
  z.push('  <h1>Feldregister</h1>');
  z.push('');
  /* Wörtlich vom Platzhalter — diese beiden Absätze gelten unverändert weiter. */
  z.push('  <p>Unter dieser Adresse wird das Feldregister von Vivodepot veröffentlicht: das');
  z.push('  Verzeichnis der Feldkennungen, gegen die Vorlagen gebaut werden.</p>');
  z.push('');
  z.push('  <p>Eine Kennung bezeichnet dauerhaft dieselbe Angabe. Wer eine Vorlage erstellt,');
  z.push('  verweist darauf, statt ein eigenes Feld zu beschreiben — so bleibt eine Angabe');
  z.push('  auffindbar, auch wenn der Anbieter wechselt.</p>');
  z.push('');
  z.push('  <h2>Stand</h2>');
  z.push('  <p class="fassung">Fassung vom ' + stand + ' · Kern ' + htmlText(fassung.kern)
    + ' · ' + anzahl + ' Kennungen in ' + gruppen.length + ' Bereichen.</p>');
  z.push('  <p>Maschinenlesbar: <a href="' + JSON_DATEI + '">' + JSON_DATEI + '</a> ·');
  z.push('  Prüfsumme: <a href="' + PRUEFSUMMEN_DATEI + '">' + PRUEFSUMMEN_DATEI + '</a></p>');
  z.push('  <p class="hash"><code>' + hash + '  ' + JSON_DATEI + '</code></p>');
  z.push('  <p class="nachpruefen">Nachzusehen mit <code>shasum -a 256 ' + JSON_DATEI + '</code>:');
  z.push('  stimmt die Zeile überein, ist die Liste unter dieser Adresse die, die der Erzeuger');
  z.push('  gebaut hat.</p>');
  z.push('');
  z.push('  <p class="undurchsichtig">Eine Kennung ist ein Name zum Wiederfinden, nicht zum');
  z.push('  Übersetzen: ihre Bedeutung steht in den Beschriftungen, auf Deutsch und auf Englisch.</p>');
  z.push('');
  /* U2-ADR-409 Punkt 10 — Status nach der IANA-Konvention (RFC 9110 §16.3.1; RFC 8126 §9.6).
     Eine Kennung wird nie gelöscht, nur inaktiviert: sie bleibt hier stehen und trägt fortan
     ihren Status. `provisional` fehlt bewusst — ein offener Vorschlag wird nicht veröffentlicht. */
  z.push('  <p class="statuserklaerung">Jeder Eintrag trägt einen Status: <strong>permanent</strong>');
  z.push('  gilt unverändert; <strong>deprecated</strong> gilt noch, wird aber nicht mehr empfohlen;');
  z.push('  <strong>obsoleted</strong> ist abgelöst — der Nachfolger steht daneben. Eine Kennung wird');
  z.push('  nie gelöscht, nur inaktiviert.</p>');
  z.push('  <p class="statuserklaerung lang-en" lang="en">Every entry carries a status:');
  z.push('  <strong>permanent</strong> applies unchanged; <strong>deprecated</strong> still applies but');
  z.push('  is discouraged; <strong>obsoleted</strong> has been superseded — its successor is shown');
  z.push('  alongside it. An identifier is never deleted, only inactivated.</p>');
  z.push('');
  /* U2-ADR-409 Punkt 3/5/7/9 (13.09.2026, Entscheidung „Konvention wie IANA"): der Vorgang,
     mit dem eine fehlende Kennung entsteht — Einreichung per E-Mail, kein eigener Server.
     Freigabe „Vivodepot GmbH", KEINE Namen (dieselbe Auflage wie in feldregister-bauen.js'
     Kopfkommentar: „Keine Namen von Personen"). Der Generator-Link erscheint NUR, wenn eine
     Adresse übergeben wurde — der Auslieferungsweg des Generators auf die Subdomain ist in
     U2-ADR-409 ausdrücklich noch offen (Abschnitt „Was offen ist"). */
  z.push('  <h2>Neue Kennung vorschlagen</h2>');
  z.push('  <p>Fehlt eine Angabe, die eine Vorlage braucht, wird sie <strong>vorgeschlagen</strong> —');
  z.push('  nicht selbst erfunden. Der Vorschlag geht per E-Mail an');
  z.push('  <a href="mailto:register@vivodepot.de">register@vivodepot.de</a>; der Eingang wird automatisch');
  z.push('  bestätigt. Über die Aufnahme entscheidet die <strong>Vivodepot GmbH</strong> binnen');
  z.push('  höchstens fünf Arbeitstagen. Wird die Kennung freigegeben, gilt sie ab diesem');
  z.push('  Zeitpunkt — ohne auf eine neue Fassung dieses Registers zu warten. Eine abgelehnte');
  z.push('  oder überholte Kennung wird nie gelöscht, nur inaktiviert (s. oben).</p>');
  if (generatorUrl) {
    z.push('  <p>Zusammengestellt und geprüft wird der Vorschlag mit dem');
    z.push('  <a href="' + htmlText(generatorUrl) + '">Template-Generator</a>.</p>');
  }
  z.push('  <p class="lang-en" lang="en">Propose a new identifier: if a template needs a field this');
  z.push('  register does not carry yet, it gets <strong>proposed</strong>, not invented on the spot.');
  z.push('  Send the proposal by e-mail to');
  z.push('  <a href="mailto:register@vivodepot.de">register@vivodepot.de</a>; receipt is confirmed');
  z.push('  automatically. <strong>Vivodepot GmbH</strong> decides within five business days at the');
  z.push('  latest. Once approved, the identifier applies immediately — no need to wait for the next');
  z.push('  edition of this register. A rejected or superseded identifier is never deleted, only');
  z.push('  inactivated (see above).</p>');
  z.push('');
  z.push('  <h2>Bereiche</h2>');
  z.push('  <ul class="bereichsindex">');
  for (const g of gruppen) {
    z.push('    <li><a href="#bereich-' + htmlText(g.id) + '">' + htmlText(g.label) + '</a> '
      + g.felder.length + '</li>');
  }
  z.push('  </ul>');
  z.push('');
  for (const g of gruppen) {
    z.push('  <section id="bereich-' + htmlText(g.id) + '">');
    z.push('    <h3>' + htmlText(g.label) + ' <span class="zahl">' + g.felder.length + '</span></h3>');
    z.push('    <ul class="kennungen">');
    for (const f of g.felder) {
      const statusSpan = '<span class="status status-' + htmlText(f.status) + '">' + htmlText(f.status)
        + (f.nachfolger ? ' <span class="status-nachfolger">→ <code>' + htmlText(f.nachfolger)
          + '</code></span>' : '') + '</span>';
      z.push('      <li><code>' + htmlText(f.kennung) + '</code>' + statusSpan
        + '<span class="label">' + htmlText(f.label.de) + '</span>'
        + '<span class="label label-en" lang="en">' + htmlText(f.label.en) + '</span></li>');
    }
    z.push('    </ul>');
    z.push('  </section>');
    z.push('');
  }
  /* Wörtlich vom Platzhalter bis auf den letzten Satz — er sagte, das Register sei
     noch nicht veröffentlicht, und das ist der eine Satz, der nicht mehr gilt. */
  z.push('  <h2 lang="en">In English</h2>');
  z.push('  <p class="lang-en" lang="en">This address publishes the Vivodepot field register:');
  z.push('  the directory of field identifiers that templates are built against. An identifier');
  z.push('  always denotes the same item, so data stays findable when a provider changes.');
  z.push('  This edition is dated ' + datumEnglisch(fassung.datum) + ' (core ' + htmlText(fassung.kern) + ')');
  z.push('  and lists ' + anzahl + ' identifiers in ' + gruppen.length + ' areas; the machine-readable list and its');
  z.push('  SHA-256 checksum are linked above. An identifier is a name to look up, not to');
  z.push('  translate: its meaning is carried by the labels, given in German and English.</p>');
  z.push('');
  z.push('  <footer>');
  z.push('    <p>Vivodepot GmbH · <a href="https://vivodepot.de">vivodepot.de</a></p>');
  z.push('  </footer>');
  z.push('</main>');
  z.push('</body>');
  z.push('</html>');
  return z.join('\n') + '\n';
}

/* ── Bauen und Schreiben ──────────────────────────────────────────────── */

function bauen(opt) {
  const o = opt || {};
  const mitStatus = statusAnhaengen(katalogLesen(o.katalogPfad), o.inaktiviert || null);
  const felder = beschriftungenAnhaengen(mitStatus, o.sprachtexte || null);
  const gruppen = gruppieren(felder, bereichsOrdnung(o.bereichePfad));
  const fassung = { datum: o.datum || heute(), kern: standzahlLesen(o.kernPfad) };
  const json = registerJson(felder, fassung);
  const hash = hashVonText(json);
  return {
    fassung,
    anzahl: felder.length,
    gruppen,
    json,
    hash,
    pruefsumme: pruefsummenZeile(hash),
    html: seiteHtml(gruppen, fassung, hash, o.generatorUrl || null),
    indexEintrag: indexEintrag(felder.length, fassung, hash),
  };
}

function schreiben(zielOrdner, artefakt) {
  fs.mkdirSync(zielOrdner, { recursive: true });
  const index = indexJson(vorhandenenIndexLesen(zielOrdner), artefakt.indexEintrag);
  const dateien = [
    [JSON_DATEI, artefakt.json],
    [PRUEFSUMMEN_DATEI, artefakt.pruefsumme],
    [SEITEN_DATEI, artefakt.html],
    [INDEX_DATEI, index],
  ];
  return dateien.map(([name, inhalt]) => {
    const p = path.join(zielOrdner, name);
    fs.writeFileSync(p, inhalt);
    return { name, pfad: p, bytes: Buffer.byteLength(inhalt, 'utf8') };
  });
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (flagge) => {
    const i = argv.indexOf(flagge);
    return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null;
  };
  const ziel = wert('--ziel') ? path.resolve(wert('--ziel')) : ZIEL_VORGABE;
  const datum = wert('--datum');
  if (datum && !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    console.error('feldregister-bauen: --datum erwartet JJJJ-MM-TT, bekam "' + datum + '".');
    process.exit(1);
  }

  const artefakt = bauen({
    katalogPfad: wert('--katalog') ? path.resolve(wert('--katalog')) : null,
    kernPfad: wert('--kern') ? path.resolve(wert('--kern')) : null,
    bereichePfad: wert('--bereiche') ? path.resolve(wert('--bereiche')) : null,
    // U2-ADR-409, Abschnitt „Was offen ist": der Auslieferungsweg des Generators auf die
    // Subdomain steht noch aus — ohne diese Option bleibt der Link auf der Registerseite
    // weg, statt auf eine Adresse zu zeigen, die es dort noch nicht gibt.
    generatorUrl: wert('--generator-url'),
    datum,
  });
  const geschrieben = schreiben(ziel, artefakt);

  console.log('feldregister-bauen: ' + artefakt.anzahl + ' Kennungen in '
    + artefakt.gruppen.length + ' Bereichen · Fassung ' + artefakt.fassung.datum
    + ' · Kern ' + artefakt.fassung.kern + ' (gelesen, nicht gesetzt)');
  for (const g of geschrieben) {
    console.log('  ' + g.name.padEnd(26) + (g.bytes / 1024).toFixed(1).padStart(7) + ' KB  ' + g.pfad);
  }
  console.log('  SHA-256 ' + artefakt.hash);
}

if (require.main === module) main();
module.exports = {
  standzahlLesen, katalogLesen, statusAnhaengen, bereichsOrdnung, gruppieren,
  registerJson, hashVonText, pruefsummenZeile, seiteHtml, htmlText,
  heute, datumDeutsch, datumEnglisch, bauen, schreiben,
  indexEintrag, indexJson, vorhandenenIndexLesen,
  JSON_DATEI, PRUEFSUMMEN_DATEI, SEITEN_DATEI, INDEX_DATEI, INDEX_ACHSE, KOPFZEILE,
  KATALOG_PFAD, BEREICHE_PFAD, KERN_PFAD, ZIEL_VORGABE,
  STATUS_ERLAUBT, INAKTIVIERT,
};
