#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-umstellen.js — U2-ADR-141, Glied 2 der Nachtkette 16./17.08.2026.
   ────────────────────────────────────────────────────────────────────────────
   WAS ES TUT: einen Sektor auf den Textsatz umstellen. Die Anzeigetexte wandern
   aus der Felddefinition in `AB_WERK_TEXTSATZ_DE.texte`; die Definition behält nur ihre
   Kennungen. Kein Wort ändert sich, nur der Ort.

   WARUM ES EIN WERKZEUG IST UND KEINE HANDARBEIT: elf Sektoren, 813 Texte. Von
   Hand wäre jeder einzelne eine Gelegenheit, ein Zeichen zu verlieren — und ein
   verlorenes Zeichen in einer Beschriftung ist nicht auffällig, es sieht nur
   etwas anders aus.

   DIE SICHERUNG IST KEINE REGEX, SONDERN EIN VERGLEICH. Der Kern wird VOR und
   NACH dem Eingriff geladen und der ganze `SEKTOREN`-Baum tief verglichen.
   Weicht auch nur ein Zeichen ab, wird die Datei zurückgesetzt und das Werkzeug
   bricht ab. Die Textersetzung darf also unvollkommen sein — sie darf nur nicht
   unbemerkt falsch sein. (Das ist derselbe Gedanke wie beim Rot-Beleg: nicht
   Sorgfalt behaupten, sondern den Fehlschlag sichtbar machen.)

   WAS AUSDRÜCKLICH STEHEN BLEIBT:
     · `optionen[].label` — Auswahlwerte, oft amtliche Codes; je Sektor eine
       eigene Frage (U2-ADR-141, offene Frage 4).
     · `standardDokumente[].name`/`.hinweis` — hängen am Dokument-Katalog, nicht
       an der Felddefinition.
   Beide Blöcke werden bei der Ersetzung übersprungen, erkannt über Klammerstand.

   AUFRUF
     node tools/textsatz-umstellen.js --sektor wohnen            (schreibt)
     node tools/textsatz-umstellen.js --sektor wohnen --probe    (nur zeigen)
   ════════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
// `titel`/`einfuehrung` seit Zug 2b (17.08.2026): die Sektoren kennen sie nicht (dort gemessen 0),
// die Situationen und ihre Bloecke tragen sie. Ohne sie hob das Werkzeug die BLOCKTITEL still
// nicht mit — `einfach-so` meldete daraufhin „nichts zu tun", obwohl drei Titel dastanden.
/* NACHTRAG 18.08.2026 (Glied 11, Tranche 1): `frage`, `hilfetext` und `toast` dazu.
   Der KERN führt sie seit A287 in `TEXTSATZ_ARTEN` — dieses Werkzeug nicht, und darum meldete
   `--sektor @wizards` „0 gehoben", obwohl 149 Texte inline standen. Die Liste hier war die
   stille Hälfte einer Umstellung, die im Kern schon fertig war. */
/* NACHTRAG 19.08.2026 (Laufzettel Nacht, Strang 3): `einleitung` dazu — die letzte Lücke
   derselben Halbheit. Der Kern führt sie seit A287 in `TEXTSATZ_ARTEN`, mit dem ausdrücklichen
   Vermerk „BEIM BAU GEMESSEN, NICHT ANGENOMMEN: `einleitung` fehlte hier. Die Liste führte
   `einfuehrung` — das ist die Art der SITUATIONEN, nicht die der Assistenten." Genau dieselbe
   Verwechslung stand hier noch, eine Datei weiter: sechs Assistenten-Einleitungen blieben
   inline, ohne dass irgendetwas rot wurde. */
const ARTEN = ['label', 'hint', 'beispiel', 'platzhalter', 'einfuehrungstext', 'titel', 'einfuehrung',
  'frage', 'hilfetext', 'toast', 'einleitung'];
const MARKE = "  /* ── Ende des eingebauten Satzes ──";

/* ── Den Baum eines Sektors als Kennung→Text-Karte ─────────────────────────── */
function karteLesen(sektorId) {
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const sektor = V.SEKTOR_BY_ID[sektorId];
  if (!sektor) throw new Error('Unbekannter Sektor: ' + sektorId);
  const karte = [];
  const knoten = (k, kennung) => {
    for (const art of ARTEN) {
      if (typeof k[art] === 'string' && k[art].trim() !== '' && !(kennung + '.' + art in deTexte())) {
        karte.push({ kennung: kennung + '.' + art, art, text: k[art] });
      }
    }
  };
  const feld = (f, kennung) => {
    knoten(f, kennung);
    for (const uf of (f.unterFelder || [])) feld(uf, kennung + '/' + uf.id);
  };
  knoten(sektor, sektor.id);
  for (const se of (sektor.sektionen || [])) {
    knoten(se, sektor.id + '#' + se.id);
    for (const f of (se.felder || [])) feld(f, sektor.id + '.' + f.id);
  }
  return karte;
}

/* Glied 3: `SITUATIONEN`. Gehoben werden `titel` und `einfuehrung` je Registereintrag —
   die Blocktexte NICHT, weil `bloecke` bei mindestens einer Situation ein Getter über `data`
   ist (s. Kommentar im Kern). Die Kennung folgt derselben Regel: `situation:<id>.<art>`. */
/* Zug 2b (17.08.2026): die BLOCK-Texte und die situationseigenen Felder EINER
   Situation. Getrennt je Situation, damit in Tranchen umgestellt werden kann.
   Kennung wie im Kern: `situation:<sid>#<blockid>.titel` bzw.
   `situation:<sid>.<feldid>.label`. */
function karteSituationsBloecke(sitId) {
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const sit = V.SITUATIONEN.find((s) => s.id === sitId);
  if (!sit) throw new Error('Unbekannte Situation: ' + sitId);
  const karte = [];
  const nimm = (knoten, kennung) => {
    for (const art of ARTEN) {
      const k = kennung + '.' + art;
      if (typeof knoten[art] === 'string' && knoten[art].trim() !== '' && !(k in deTexte())) {
        karte.push({ kennung: k, art, text: knoten[art] });
      }
    }
  };
  const feld = (f, kennung) => {
    nimm(f, kennung);
    for (const uf of (f.unterFelder || [])) feld(uf, kennung + '/' + uf.id);
  };
  for (const blk of (sit.bloecke || [])) {
    if (blk.id) nimm(blk, 'situation:' + sitId + '#' + blk.id);
    for (const e of (blk.eintraege || [])) {
      if (e && e.feld && e.feld.id) feld(e.feld, 'situation:' + sitId + '.' + e.feld.id);
    }
  }
  return karte;
}

/* Zug 3 (17.08.2026): die fuenf Orte ausserhalb von SEKTOREN und SITUATIONEN, die
   `tools/anzeigetexte-orten.js` als naechstgroesste gemessen hat. Alle folgen derselben
   Regel — die Kennung ist der Weg im Baum, und der Weg fuehrt ueber `id`, nie ueber eine
   Position. Die Kennungsraeume sind getrennt (`wizard:`, `anlass:`, `angSituation:`,
   `menschenRegister`, `institutionsFeld`), weil dieselbe `id` in mehreren Registern
   vorkommt: `beerdigung` steht in SITUATIONEN und stand (bis ANG1) in den Angehörigen-Blättern. */
function karteOrt(ort) {
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const karte = [];
  const nimm = (knoten, kennung) => {
    for (const art of ARTEN) {
      const k = kennung + '.' + art;
      if (typeof knoten[art] === 'string' && knoten[art].trim() !== '' && !(k in deTexte())) {
        karte.push({ kennung: k, art, text: knoten[art] });
      }
    }
  };
  /* Ein FELD hat keine `frage` und keinen `hilfetext` — dieselbe Grenze wie im Kern
     (`TEXTSATZ_ARTEN_FELD`). Ohne sie hübe das Werkzeug einen Text unter einer Kennung, die
     der Füller an ZWEI Knoten setzt, und der Baumvergleich schlüge an — genau das ist beim
     ersten Lauf passiert, und die Sicherung hat zurückgesetzt. */
  const ARTEN_FELD = ARTEN.filter((a2) => !['frage', 'hilfetext', 'einleitung', 'toast'].includes(a2));
  const nimmFeld = (knoten, kennung) => {
    for (const art of ARTEN_FELD) {
      const k = kennung + '.' + art;
      if (typeof knoten[art] === 'string' && knoten[art].trim() !== '' && !(k in deTexte())) {
        karte.push({ kennung: k, art, text: knoten[art] });
      }
    }
  };
  const feld = (f, kennung) => {
    nimmFeld(f, kennung);
    for (const uf of (f.unterFelder || [])) feld(uf, kennung + '/' + uf.id);
  };
  if (ort === '@wizards' || ort === '@pvbmj' || ort === '@vollmachtbmj' || ort === '@kikorpus') {
    /* Die Wege sind DIESELBEN wie in `_textsatzAufWizardsAnwenden` im Kern — nicht ähnliche,
       dieselben. Der Abschluss-Zuruf ist ein eigener Knoten (`wizard:<id>.abschluss.toast`);
       `frage`/`hilfetext` sitzen am SCHRITT, tragen aber die Kennung SEINES Feldes, weil es
       derselbe Ort auf dem Bildschirm ist. Wer hier einen eigenen Weg erfände, hübe Texte in
       einen Kennungsraum, den der Füller nie besucht — sie verschwänden aus der Oberfläche. */
    for (const w of V.WIZARDS) {
      nimm(w, 'wizard:' + w.id);
      if (w.abschluss && typeof w.abschluss === 'object') nimm(w.abschluss, 'wizard:' + w.id + '.abschluss');
      for (const sch of (w.schritte || [])) {
        if (sch && sch.feld && sch.feld.id) {
          nimm(sch, 'wizard:' + w.id + '.' + sch.feld.id);
          feld(sch.feld, 'wizard:' + w.id + '.' + sch.feld.id);
        }
      }
    }
  } else if (ort === '@anlaesse') {
    for (const a of V.ANLAESSE) nimm(a, 'anlass:' + a.id);
  } else if (ort === '@menschen') {
    feld(V.MENSCHEN_REGISTER_FELD, 'menschenRegister');
  } else if (ort === '@institutionsfelder') {
    feld(V._institutionFelder(), 'institutionsFeld');
  } else {
    throw new Error('Unbekannter Ort: ' + ort);
  }
  return karte;
}

function karteSituationen() {
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const karte = [];
  for (const sit of V.SITUATIONEN) {
    for (const art of ['titel', 'einfuehrung']) {
      const kennung = 'situation:' + sit.id + '.' + art;
      if (typeof sit[art] === 'string' && sit[art].trim() !== '' && !(kennung in deTexte())) {
        karte.push({ kennung, art, text: sit[art] });
      }
    }
  }
  return karte;
}

/* Der ganze Baum als Vergleichsgrundlage — das ist die eigentliche Sicherung.

   MIT SORTIERTEN SCHLÜSSELN, und das ist kein Detail: ein aus dem Satz nachgetragenes
   `label` landet am ENDE des Objekts, während es vorher vorne stand. `JSON.stringify`
   ist reihenfolgeempfindlich und meldete deshalb im ersten Lauf eine Veränderung, wo
   keine war. Verglichen wird der INHALT, nicht die Schreibreihenfolge — die Reihenfolge
   der Objektschlüssel ist im Produkt nirgends bedeutungstragend (Arrays bleiben
   selbstverständlich in ihrer Reihenfolge, sie sind der Feld- und Abschnittsverlauf). */
function _sortiert(w) {
  if (Array.isArray(w)) return w.map(_sortiert);
  if (w && typeof w === 'object') {
    const raus = {};
    for (const k of Object.keys(w).sort()) raus[k] = _sortiert(w[k]);
    return raus;
  }
  return w;
}
function baumAbdruck() {
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  /* SEITE AN SEITE, seit Zug 2b: die Situationen gehoeren mit in den Abdruck, sonst
     sichert der Vergleich genau den Teil nicht, der gerade umgestellt wird. `bloecke`
     ist inzwischen bei allen zehn ein Getter — er wird hier bewusst AUFGERUFEN, denn
     verglichen wird, was die Sicht zu sehen bekommt, nicht was im Quelltext steht. */
  const situationen = V.SITUATIONEN.map((s) => ({
    id: s.id, titel: s.titel, einfuehrung: s.einfuehrung, bloecke: s.bloecke,
  }));
  /* Zug 3: die fuenf weiteren Orte gehoeren mit hinein, sonst sichert der Vergleich
     genau den Teil nicht, der gerade umgestellt wird — derselbe Grund wie bei den
     Situationen in Zug 2b. `_institutionFelder` wird AUFGERUFEN: verglichen wird, was
     die Sicht zu sehen bekommt. */
  return JSON.stringify(_sortiert({
    sektoren: V.bereicheAlle(), situationen,
    wizards: V.WIZARDS, anlaesse: V.ANLAESSE,
    menschenRegister: V.MENSCHEN_REGISTER_FELD, institutionsFelder: V._institutionFelder(),
  }));
}

/* ── Die Quelltext-Scheibe eines Sektors ───────────────────────────────────── */
const SCHEIBEN = {
  '@wizards': ['const WIZARDS = Object.freeze(', '\nconst WIZARD_BY_ID'],
  /* Nachtrag 19.08.2026 (Laufzettel Nacht, Strang 3): DREI Scheiben für EINEN Kennungsraum.
     Der Kommentar weiter unten sagt es seit Zug 3 richtig — „bei `@wizards` liegen 54 der 109
     Texte gar nicht in der Wizard-Scheibe, sondern in `PV_BMJ`, `KI_MODUL` und den dynamisch
     gebauten Schritten von `heirwiz`" —, aber es fehlte der Ort, um sie zu holen. Die Karte
     ist für alle drei DIESELBE (`wizard:<id>.<feldId>.<art>`); nur der Quelltext-Ausschnitt
     unterscheidet sich. Zwei Kennungsräume für eine Bildschirmseite wären eine Erfindung. */
  '@pvbmj': ['const PV_BMJ = Object.freeze(', '\nconst VOLLMACHT_BMJ'],
  '@vollmachtbmj': ['const VOLLMACHT_BMJ = Object.freeze(', '\nconst KI_KORPUS'],
  '@kikorpus': ['const KI_KORPUS = Object.freeze(', '\nconst PV_VERBORGEN_WENN'],
  '@anlaesse': ['const ANLAESSE = Object.freeze(', '\n/* \u2500\u2500 Wizards (Teil 2)'],
  '@menschen': ['const MENSCHEN_REGISTER_FELD = _textsatzFeldFuellen(', '\nfunction menschRegisterZeile'],
  '@institutionsfelder': ['function _institutionFelder(', '\nfunction institutionenVorschlag'],
};

function scheibe(quelle, sektorId) {
  if (SCHEIBEN[sektorId]) {
    const [auf, zu] = SCHEIBEN[sektorId];
    const start = quelle.indexOf(auf);
    if (start < 0) throw new Error('Ortsanfang nicht gefunden: ' + auf);
    const ende = quelle.indexOf(zu, start);
    if (ende < 0) throw new Error('Ortsende nicht gefunden: ' + zu);
    return { start, ende };
  }
  if (sektorId === '@situationen' || sektorId.startsWith('@situation:')) {
    const start = quelle.indexOf('const SITUATIONEN = Object.freeze(');
    if (start < 0) throw new Error('SITUATIONEN nicht gefunden');
    const ende = quelle.indexOf('\nconst SITUATION_BY_ID', start);
    return { start, ende };
  }
  const start = quelle.indexOf("  { id: '" + sektorId + "',");
  if (start < 0) throw new Error('Sektor-Zeile nicht gefunden: ' + sektorId);
  // Ende = nächste Sektor-Zeile auf derselben Einrückung, sonst das Listenende.
  const rest = quelle.slice(start + 5);
  const m = rest.search(/\n  \{ id: '/);
  const ende = (m >= 0) ? start + 5 + m + 1 : quelle.indexOf('\n]));', start) + 1;
  return { start, ende };
}

/* Kommentare ausblenden, LÄNGENTREU (jedes Zeichen wird zu einem Leerzeichen, Zeilenumbrüche
   bleiben). Alle Positionen des Originals gelten damit unverändert weiter.

   WARUM DAS SEIN MUSS, gemessen und nicht vermutet: der Kern schreibt deutsche
   Anführungszeichen teils als `„…"` — mit einem ASCII-Doppelquote als Schlusszeichen, IN EINEM
   KOMMENTAR. Ein Klammern-Zähler, der Kommentare nicht kennt, hält dieses Zeichen für den
   Anfang einer Zeichenkette und überliest von da an jede schliessende Klammer. Folge im ersten
   Lauf: der `standardDokumente`-Block von `identitaet` schien bis zum Sektorende zu reichen,
   und 84 von 86 Texten galten als „geschützt". Derselbe Fund bei `vorsorge` (119 von 121).
   Die Zahl sah nach einem Formatierungsproblem aus und war ein Parser-Problem. */
function _maskiereKommentare(text) {
  let raus = '';
  let inStr = null, inZeile = false, inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], d = text[i + 1];
    if (inZeile) { if (c === '\n') { inZeile = false; raus += c; } else raus += ' '; continue; }
    if (inBlock) { if (c === '*' && d === '/') { inBlock = false; raus += '  '; i++; } else raus += (c === '\n' ? c : ' '); continue; }
    if (inStr) {
      raus += c;
      if (c === '\\') { raus += (text[i + 1] === undefined ? '' : text[i + 1]); i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && d === '/') { inZeile = true; raus += '  '; i++; continue; }
    if (c === '/' && d === '*') { inBlock = true; raus += '  '; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; raus += c; continue; }
    raus += c;
  }
  return raus;
}

/* Klammerstand: liegt `pos` innerhalb eines `optionen:`- oder
   `standardDokumente:`-Arrays? Gezählt wird über eckige Klammern ab dem
   Array-Beginn; Klammern in Zeichenketten werden übersprungen. */
function inGeschuetztemBlock(maske, pos) {
  const text = maske;
  /* BEIDE SCHREIBWEISEN (U2-ADR-320): im Quelltext `standardDokumente: [`, im eingebetteten
     Bündel `"standardDokumente":[`. Die Schutzliste kannte nur die erste. Seit der Bestand im
     JSON steht, griff der Schutz nicht mehr — und fünfundzwanzig ausdrücklich geschützte Texte
     erschienen als frische Doppelzustände. Kein neuer Verstoß, sondern ein Schutz, der seinen
     Gegenstand nicht mehr erkannte. Gemessen gegen den Kanon: dort null, hier fünfundzwanzig,
     bei unverändertem Inhalt. */
  for (const schluessel of ['optionen:', 'standardDokumente:', '"optionen":', '"standardDokumente":']) {
    let i = 0;
    while (true) {
      i = text.indexOf(schluessel, i);
      if (i < 0 || i > pos) break;
      /* DIE ECKIGE KLAMMER MUSS DAS ERSTE ZEICHEN NACH DEM SCHLÜSSEL SEIN, sonst ist es
         gar kein Inline-Array und es gibt nichts zu schützen. Der erste Lauf nahm die
         NÄCHSTE Klammer irgendwo dahinter — und `optionen: _situationFeldOptionen('geburt',
         'geburt_kind_kv')` hat keine eigene. Der Zähler lief dann von einem fremden Array
         los und erklärte einen halben Assistenten für geschützt: `--sektor @wizards` meldete
         „138 Texte, 0 gehoben", obwohl die Literale nachweislich in der Scheibe standen.
         Dieselbe Klasse wie der Kommentar-Fund darüber — ein Zähler, der etwas anderes zählt
         als er soll, meldet nicht Fehler, sondern Vollständigkeit. */
      let auf = i + schluessel.length;
      while (auf < text.length && (text[auf] === ' ' || text[auf] === '\t' || text[auf] === '\n')) auf++;
      if (text[auf] !== '[') { i = i + schluessel.length; continue; }
      let tiefe = 0, j = auf, inStr = null;
      for (; j < text.length; j++) {
        const c = text[j];
        if (inStr) { if (c === '\\') { j++; continue; } if (c === inStr) inStr = null; continue; }
        if (c === "'" || c === '"') { inStr = c; continue; }
        if (c === '[') tiefe++;
        else if (c === ']') { tiefe--; if (tiefe === 0) break; }
      }
      if (pos > auf && pos < j) return true;
      i = auf + 1;
    }
  }
  return false;
}

/** Ein JS-String-Literal für den Textsatz — bevorzugt einfache Anführungszeichen. */
function alsLiteral(s) {
  // Zeilenumbrüche MÜSSEN escaped werden: ein einfach-quotierter JS-String über zwei Zeilen
  // ist ein Syntaxfehler, und der Satz landet im ausgelieferten Kern.
  if (s.includes("'") || /[\n\r\t]/.test(s)) return JSON.stringify(s);
  return "'" + s.replace(/\\/g, '\\\\') + "'";
}

/* ── Der Eingriff ──────────────────────────────────────────────────────────── */
function umstellen(sektorId, nurProbe) {
  const vorher = baumAbdruck();
  const karte = SCHEIBEN[sektorId] ? karteOrt(sektorId)
    : (sektorId === '@situationen') ? karteSituationen()
    : sektorId.startsWith('@situation:') ? karteSituationsBloecke(sektorId.slice('@situation:'.length))
    : karteLesen(sektorId);
  if (!karte.length) { console.log(`[textsatz] ${sektorId}: nichts zu tun (schon umgestellt).`); return 0; }

  const original = fs.readFileSync(KERN, 'utf8');
  const { start, ende } = scheibe(original, sektorId);
  let block = original.slice(start, ende);

  let entfernt = 0;
  const nichtGefunden = [];
  for (const eintrag of karte) {
    // Gesucht wird die EXAKTE Paarung `art: <literal>` mit genau diesem Text —
    // in beiden Anführungsformen, wie sie im Kern vorkommen.
    /* ZWISCHEN SCHLÜSSEL UND WERT STEHT NICHT IMMER GENAU EIN LEERZEICHEN. In den
       älteren Sektoren (`identitaet`, `vorsorge`) sind die Feldzeilen in Spalten
       ausgerichtet — `label:` gefolgt von zehn Leerzeichen. Der erste Lauf suchte
       starr nach `label: '…'` und fand in diesen beiden Sektoren 203 von 207
       Zuweisungen NICHT; die Einträge landeten trotzdem im Satz, und weil ein
       inline stehender Text nicht überschrieben wird, blieb der Baum gleich und
       nichts brach — die Zählung meldete „umgestellt", der Quelltext war es nicht.
       Genau die Sorte stiller Halbzustand, gegen die die Invariante steht. */
    let gefunden = false;
    /* DRITTE SCHREIBWEISE: einfach-quotiert MIT Escapes. Drei Assistenten-Einleitungen tragen
       Absätze (`\n\n`); im Quelltext stehen sie als ZWEI Zeichen, im geladenen Baum als eines.
       Beide bisherigen Kandidaten gingen daran vorbei — der erste suchte einen echten
       Zeilenumbruch, der zweite die doppelt-quotierte Form. Ergebnis war kein Fehler, sondern
       ein „liegt anderswo": drei Texte blieben inline, und nichts wurde rot. */
    const escaped = eintrag.text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    for (const lit of ["'" + eintrag.text.replace(/\\/g, '\\\\') + "'", JSON.stringify(eintrag.text), "'" + escaped + "'"]) {
      let von = 0;
      let maske = _maskiereKommentare(block);
      while (true) {
        const wert = maske.indexOf(lit, von);
        if (wert < 0) break;
        // Rückwärts: Leerraum, dann `art:` — so trifft die Suche auch ausgerichtete Spalten.
        let k = wert;
        while (k > 0 && (maske[k - 1] === ' ' || maske[k - 1] === '\t')) k--;
        const kopf = eintrag.art + ':';
        if (maske.slice(k - kopf.length, k) !== kopf) { von = wert + 1; continue; }
        const anfang = k - kopf.length;
        if (inGeschuetztemBlock(maske, anfang)) { von = wert + 1; continue; }
        // Mitnehmen, was sonst als Rest stehenbliebe: ein folgendes Komma + Leerraum.
        let bis = wert + lit.length;
        if (block[bis] === ',') bis++;
        while (block[bis] === ' ') bis++;
        // Steht die Zuweisung allein auf ihrer Zeile, fällt die ganze Zeile.
        const zeilenAnfang = block.lastIndexOf('\n', anfang) + 1;
        const nurLeerraumDavor = /^[ \t]*$/.test(block.slice(zeilenAnfang, anfang));
        if (nurLeerraumDavor && block[bis] === '\n') block = block.slice(0, zeilenAnfang) + block.slice(bis + 1);
        else block = block.slice(0, anfang) + block.slice(bis);
        entfernt++; gefunden = true; eintrag.gehoben = true; break;
      }
      if (gefunden) break;
    }
    if (!gefunden) nichtGefunden.push(eintrag.kennung);
  }

  /* NUR WAS AUCH VERSCHWUNDEN IST, kommt in den Satz. Zug 3 hat gezeigt, warum das
     eine Regel sein muss und keine Sorgfalt: bei `@wizards` liegen 54 der 109 Texte gar
     nicht in der Wizard-Scheibe, sondern in `PV_BMJ`, `KI_MODUL` und den dynamisch
     gebauten Schritten von `heirwiz`. Waeren sie trotzdem eingetragen worden, staende
     jeder von ihnen an ZWEI Stellen — genau der stille Halbzustand, gegen den die
     Invariante steht, und die Ratsche haette ihn nicht gesehen (sie ueberspringt
     Kennungen, die der Satz kennt). */
  const gehoben = karte.filter((e) => e.gehoben);
  const zeilen = gehoben.map((e) => `  ${alsLiteral(e.kennung)}: ${alsLiteral(e.text)},`);
  const satzBlock = `\n  /* ── ${sektorId} ──────────────────────────────────────────────────── */\n` + zeilen.join('\n') + '\n';

  if (nurProbe) {
    console.log(`[textsatz] ${sektorId}: ${karte.length} Texte, ${entfernt} gehoben, `
      + `${nichtGefunden.length} liegen anderswo (bleiben unangetastet).`);
    if (nichtGefunden.length) console.log('  nicht gefunden: ' + nichtGefunden.join(', '));
    return karte.length;
  }

  const markeIdx = original.indexOf(MARKE);
  if (markeIdx < 0) throw new Error('Einfüge-Marke im Textsatz nicht gefunden: ' + MARKE);
  const neu = original.slice(0, markeIdx) + satzBlock + original.slice(markeIdx);
  // Der Block liegt VOR der Marke, also vor `start` — die Scheibe verschiebt sich um seine Länge.
  const versatz = satzBlock.length;
  const endgueltig = neu.slice(0, start + versatz) + block + neu.slice(ende + versatz);

  fs.writeFileSync(KERN, endgueltig, 'utf8');
  let nachher;
  try { nachher = baumAbdruck(); } catch (e) { fs.writeFileSync(KERN, original, 'utf8'); throw new Error('Kern lädt nach dem Eingriff nicht: ' + e.message); }
  if (nachher !== vorher) {
    if (process.env.TEXTSATZ_DIFF === '1') {
      const a1 = JSON.parse(vorher), b1 = JSON.parse(nachher);
      const zeige = (x, y, weg) => {
        if (JSON.stringify(x) === JSON.stringify(y)) return;
        if (x && y && typeof x === 'object' && typeof y === 'object') {
          for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) zeige(x[k], y[k], weg + '/' + k);
          return;
        }
        console.error('  ABWEICHUNG ' + weg + '\n    vorher: ' + JSON.stringify(x) + '\n    nachher: ' + JSON.stringify(y));
      };
      zeige(a1, b1, '');
    }
    fs.writeFileSync(KERN, original, 'utf8');
    throw new Error(`[textsatz] ${sektorId}: der Baum hat sich verändert — zurückgesetzt, nichts geschrieben.`);
  }
  console.log(`[textsatz] ${sektorId}: ${gehoben.length} Texte umgezogen, `
    + `${nichtGefunden.length} liegen ausserhalb dieser Scheibe — Baum unverändert.`);
  if (nichtGefunden.length) console.log('  nicht gehoben (bleiben ganz inline): ' + nichtGefunden.join(', '));
  return gehoben.length;
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--sektor');
  if (i < 0 || !argv[i + 1]) { console.error('Aufruf: node tools/textsatz-umstellen.js --sektor <id> [--probe]'); process.exit(2); }
  umstellen(argv[i + 1], argv.includes('--probe'));
}

if (require.main === module) main();
module.exports = { umstellen, karteLesen, karteSituationsBloecke, karteOrt, inGeschuetztemBlock, _maskiereKommentare };
