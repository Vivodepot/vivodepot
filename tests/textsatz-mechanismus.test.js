'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Textsatz (U2-ADR-141) — Auftragskette Nacht Andockbarkeit, Glied 1.
   ────────────────────────────────────────────────────────────────────────────
   DER ROT-BELEG, DEN DER AUFTRAG VERLANGT, STEHT HIER: „Ein Feld ohne
   hinterlegten Text muss auffallen, nicht stillschweigend leer bleiben."
   Zwei Richtungen, beide gebaut:
     · ein Knoten OHNE `label` und OHNE Eintrag im Satz → `TEXTSATZ_FEHLSTELLEN`
       ist nicht leer → diese Suite rot.
     · ein Eintrag im Satz, den KEIN Knoten abholt → Tippfehler oder totes Feld
       → ebenfalls rot. Ohne diese Gegenrichtung wäre eine verschriebene
       Kennung ein stiller Nichteffekt.

   WAS HIER NICHT BEHAUPTET WIRD: dass die Oberfläche mehrsprachig ist. Sie ist
   es nicht, und sie soll es in diesem Zug nicht werden. Geprüft ist der
   MECHANISMUS — dass ein angedockter Satz greift, wenn eine andere Sprache
   aktiv ist. Wie eine Sprache gewählt wird, ist offene Frage 1 des ADR.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const { ladeKern } = require('./load-kern.js');
/* Schnitt-Reparatur (18.09.2026) — Umzug der Quelle für Pro/bereichsErsatz, kein neuer
   Mechanismus: `bereicheAlle()` liefert im UNKONFEKTIONIERTEN Kern (so lädt `ladeKern()` ihn)
   strukturell NULL Pro-Sektoren — bereichsErsatz existiert erst, nachdem
   `produkt-konfektionieren.js` ein Produkt zusammensetzt. Ein pro-de-konfektionierter Kern wird
   darum ZUSÄTZLICH geladen und mit DENSELBEN `knoten`/`feld`-Läufern begangen (dieselbe
   `TEXTSATZ_ARTEN`-Konstante, byte-identisch über beide Kerne, da beide aus derselben
   vivodepot.html gebaut sind) — kein sechster Sonder-Namensraum wie institutionsArt:/wizard:/
   anlass:/dok:/vollmacht:, sondern derselbe generische Baum-Läufer auf einem zweiten,
   vollständig gebauten Kern. */
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const fs = require('node:fs');

/* Träger der Kennungen 'dok:<id>#…': die Ab-Werk-Auszüge des Kerns UND die Templates der Privat-Produkte (seit 21.09.2026 steht der
   Zugangs-Auszug als Template im Rezept, U2-ADR-427, nicht mehr im Kern). Die Kennungen gehören weiter in den Satz, solange der
   deutsche Textsatz im Gerüst liegt; ihr Träger ist das gebaute Produkt. */
const abWerkTexte = (V) => (V.AB_WERK_AUSZUG_BUNDLE_TEXTE || []).concat(
  [...new Set(PRODUKTE.filter((p) => p.slug.startsWith('privat-')).flatMap((p) => p.templatePfade || []))]
    .map((pfad) => fs.readFileSync(pfad, 'utf8')));

/* Wörtlich derselbe Helfer wie tests/v515-testdepot.test.js#ladeKernAus — ein zweiter,
   konfektionierter Kern neben dem nativen, ohne den globalen require-Cache dauerhaft
   umzubiegen. */
async function _konfektioniertenKernLaden(kernPfad) {
  const REPO_LOKAL = path.join(__dirname, '..');
  const vorherigerPfad = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve(path.join(REPO_LOKAL, 'tests', 'load-kern.js'))];
  const { ladeKern: ladeKernLokal } = require(path.join(REPO_LOKAL, 'tests', 'load-kern.js'));
  const paar = ladeKernLokal();
  if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorherigerPfad;
  delete require.cache[require.resolve(path.join(REPO_LOKAL, 'tests', 'load-kern.js'))];
  return paar;
}

/* ── 0. Das Umstell-Werkzeug: der Kommentar-Maskierer ─────────────────────────
   Eigene Proben, weil genau hier der teuerste Fehler dieser Nacht lag: ein
   ASCII-Doppelquote als deutsches Schlusszeichen IN EINEM KOMMENTAR liess den
   Klammern-Zähler jede schliessende Klammer überlesen. Das Werkzeug meldete
   daraufhin 203 von 207 Texten als „geschützt" und stellte sie nicht um — ohne
   Fehlermeldung, weil der Baum unverändert blieb. */

const { _maskiereKommentare } = require('../tools/textsatz-umstellen.js');

test('[Textsatz·Werkzeug] der Maskierer ist längentreu und blendet beide Kommentarformen aus', () => {
  const q = "a: 'x', // weg\nb: 'y', /* auch weg */ c: 'z'";
  const m = _maskiereKommentare(q);
  assert.equal(m.length, q.length, 'längentreu — sonst stimmen alle Positionen nicht mehr');
  assert.ok(!m.includes('weg'), 'Kommentarinhalt ist fort');
  assert.ok(m.includes("a: 'x'") && m.includes("c: 'z'"), 'Code bleibt unangetastet');
});

test('[Textsatz·Werkzeug] DER FALL, DER ES AUSLÖSTE: ein ASCII-Quote im Kommentar öffnet keine Zeichenkette', () => {
  const q = '// „Aufenthaltstitel" (11.08.2026)\nfelder: [{ a: 1 }],';
  const m = _maskiereKommentare(q);
  assert.ok(!m.includes('Aufenthaltstitel'));
  assert.ok(m.includes('felder: [{ a: 1 }],'), 'die Klammern nach dem Kommentar bleiben zählbar');
});

test('[Textsatz·Werkzeug] ein `//` INNERHALB einer Zeichenkette ist kein Kommentar', () => {
  const q = "url: 'https://vivodepot.de', x: 1";
  assert.equal(_maskiereKommentare(q), q);
});

/* ── 0b. Die Ortung der verbliebenen Texte (Zug 3, 17.08.2026) ───────────────
   Die Regel "ein `label` neben einem `wert:` ist Anzeigetext" traegt ein Drittel
   des Ortes `SEKTOREN`: ohne sie zaehlte die Messung 106 deutsche Auswahlwerte
   (ledig, weiblich) als technische Bezeichner. Eine Regel, die so viel
   verschiebt, gehoert geprueft. */

const { art } = require('../tools/anzeigetexte-orten.js');

test('[Anzeigetexte] die Form entscheidet: Leerzeichen, Umlaut oder Satzzeichen heisst Anzeigetext', () => {
  assert.equal(art('Reisepass \u2014 g\u00fcltig bis', false), 'anzeigetext');
  assert.equal(art('Marke / Modell', false), 'anzeigetext');
  assert.equal(art('enduring-power-of-attorney', false), 'bezeichner');
  assert.equal(art('C1E', false), 'bezeichner');
  assert.equal(art('Version', false), 'unklar', 'ein einzelnes grosses Wort bleibt ehrlich unklar');
});

test('[Anzeigetexte] DIE AUSNAHME: in einem optionen-Eintrag ist das label immer Anzeigetext', () => {
  // "ledig" sieht aus wie eine Kennung und ist ein deutsches Wort, das eine Buergerin liest.
  assert.equal(art('ledig', false), 'bezeichner', 'ohne Nachbarschaft traegt nur die Form');
  assert.equal(art('ledig', true), 'anzeigetext', 'mit wert:-Nachbarn entscheidet die Position');
});

/* ── 1. Der eingebaute Satz und der Baum passen zusammen ──────────────────── */

test('[Textsatz] keine Fehlstelle: jeder Knoten hat seine Beschriftung', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.TEXTSATZ_FEHLSTELLEN, [],
    'ein Feld ohne label und ohne Eintrag im Satz — genau der Fall, der nicht still bleiben darf');
});

test('[Textsatz] kein Eintrag im Satz ist tot: jede Kennung wird von einem Knoten abgeholt', async () => {
  const { V } = ladeKern();
  /* MIT DEPOT UND MIT KI-VERFÜGUNG, und das ist keine Bequemlichkeit: `todesfall-uebernahme`
     zeigt seinen KI-Block nur, wenn eine hinterlegt ist. Ohne diesen Zustand hielte die Probe
     seine zwei Kennungen für tot — und die einzige Alternative wäre eine Ausnahmeliste, also
     eine Stelle, die nichts prüft. Der Zustand wird hergestellt, nicht ausgenommen. */
  await V.depotAnlegen('textsatz-tote-kennung-pw');
  V.akteurSelbstErklaeren('Testerin');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'ki-verfuegung', basicDecision: 'erlaubnis' });
  const wege = new Set();
  const knoten = (k, kennung) => {
    for (const art of V.TEXTSATZ_ARTEN) wege.add(kennung + '.' + art);
  };
  const feld = (f, kennung) => {
    knoten(f, kennung);
    for (const uf of (f.unterFelder || [])) {
      feld(uf, kennung + '/' + uf.id);
      /* U2-ADR-291 (05.09.2026) — NACHGEZOGEN, nicht aufgeweicht: `vorschlaegeKennung` lief bis
         hierher NUR fuer Top-Level-Felder (s. u. in der SEKTOREN-Schleife). Der echte Renderweg
         holt sie aber AUCH fuer UnterFelder: die Listen-Zeile ruft `feldInputHTML(uf, …)`, und
         darin steht `_vorschlaegeTextsatz(fid, feld.vorschlaege)`. Der Waechter modellierte die
         Wege damit unvollstaendig und meldete vier LEBENDE Kennungen als tot. Dass es nie auffiel,
         hat einen Grund: alle fuenf bis dahin bestehenden `feld.*.vorschlaege` sassen an
         Top-Level- oder Situationsfeldern — an einem UnterFeld war die Luecke nie erprobt.
         Diese Zeile ERWEITERT die Deckung: ein totes UnterFeld-Vorschlagsfeld faellt jetzt auch auf. */
      vorschlaegeKennung(uf, f.id);
    }
    // Zug 2: Optionswerte sind Knoten im Baum — derselbe Weg, eine Ebene tiefer.
    for (const o of (f.optionen || [])) if (o && typeof o.wert === 'string') knoten(o, kennung + '/' + o.wert);
  };
  // Phase 2 (28.08.2026, "Laufzeit-Audit Sprachmodule"): drei eigene, kleine
  // Kennungsräume neben dem SEKTOREN-Baum — derselbe Grundsatz wie bei institutionsArt
  // oben (Zug 3): ein eigener Läufer je Ort, kein Umbiegen des generischen feld()/knoten().
  //
  // U2-ADR-399 (06.09.2026) — NACHGEZOGEN, wie beim 05.09.-Fund oben: `_vorschlaegeTextsatz`
  // versucht bei einem UnterFeld ZUERST die traegerqualifizierte Kennung
  // (`feld.<traeger>/<feldId>.vorschlaege`) und faellt nur auf die alte, flache Form zurueck,
  // wenn jene nicht im Satz steht (s. vivodepot.html). Der Wächter muss dieselbe Präferenz
  // vorhersagen — sonst meldet er die zwei jetzt aufgelösten `art`-Kennungen als tot, obwohl
  // der echte Renderweg genau sie abholt.
  const vorschlaegeKennung = (f, traeger) => {
    if (!(f && Array.isArray(f.vorschlaege) && f.vorschlaege.length)) return;
    const qualifiziert = traeger ? 'feld.' + traeger + '/' + f.id + '.vorschlaege' : null;
    if (qualifiziert && Object.prototype.hasOwnProperty.call(V.TEXTSATZ_DE_QUELLE.texte, qualifiziert)) wege.add(qualifiziert);
    else wege.add('feld.' + f.id + '.vorschlaege');
  };
  for (const s of V.bereicheAlle()) {
    knoten(s, s.id);
    for (const se of (s.sektionen || [])) {
      knoten(se, s.id + '#' + se.id);
      for (const f of (se.felder || [])) { feld(f, s.id + '.' + f.id); vorschlaegeKennung(f); }
    }
  }
  /* Umzug der Quelle für Pro/bereichsErsatz (Schnitt-Reparatur, 18.09.2026): derselbe Läufer
     wie oben, aber auf einem pro-de-KONFEKTIONIERTEN Kern — `bereicheAlle()` liefert die sechs
     Pro-Sektoren nur, nachdem `produkt-konfektionieren.js` bereichsErsatz tatsächlich einbaut;
     der native `V` von oben sieht sie strukturell nie. Kein sechster Sonder-Namensraum, derselbe
     `knoten`/`feld`-Läufer — nur eine zweite Quelle für dieselbe Art Baum. */
  {
    const proProdukt = PRODUKTE.find((p) => p.slug === 'pro-de');
    const zielOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'textsatz-mechanismus-pro-de-'));
    try {
      const gebaut = konfektionieren({
        ziel: zielOrdner, slug: proProdukt.slug, modulauswahl: [],
        vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
        unsignierteModulDateien: modulDateienFuer(proProdukt),
      });
      const { V: V2 } = await _konfektioniertenKernLaden(path.join(gebaut.ordner, 'vivodepot.html'));
      await V2.depotAnlegen('textsatz-mechanismus-pro-de-pw');
      V2.akteurSelbstErklaeren('Testerin');
      for (const s of V2.bereicheAlle()) {
        knoten(s, s.id);
        if (typeof s.cluster === 'string' && s.cluster) wege.add('cluster:' + s.cluster + '.label');
        for (const se of (s.sektionen || [])) {
          knoten(se, s.id + '#' + se.id);
          for (const f of (se.felder || [])) { feld(f, s.id + '.' + f.id); vorschlaegeKennung(f); }
        }
      }
    } finally {
      fs.rmSync(zielOrdner, { recursive: true, force: true });
    }
  }
  // Feldgruppen-Karten-Titel (SEKTION_STATUSKARTEN_CLUSTER) — seit 29.08.2026 tragen ALLE 55
  // Einträge eine `id` (: Umlaut-Erkennung des Audits unvollständig, Wort
  // "alle"). Die Bedingung `if (c && c.id)` bleibt defensiv stehen, nicht weil ein Eintrag ohne
  // `id` heute vorkäme, sondern falls künftig ein neuer Eintrag ohne Kennung angelegt wird.
  if (V.SEKTION_STATUSKARTEN_CLUSTER) {
    for (const liste of Object.values(V.SEKTION_STATUSKARTEN_CLUSTER)) {
      for (const c of liste) if (c && c.id) wege.add('feldgruppe.' + c.id + '.label');
    }
  }
  // Dokument-Katalog: `name`/`hinweis` an standardDokumente[] (über typ), `name` zusätzlich an
  // VORSORGE_MODULE[]/STANDARD_VORLAGEN[]/den ab-Werk-logikModule-Auszügen (über id) —
  // dieselbe Kennung, vier Sammelstellen, wie _dokumentTextsatzText es auch beim Lesen tut
  // (s. vivodepot.html, logikModuleAlsKarten()/„Weitere Bereiche"-Seitenleiste). Durchklick-
  // Befund P-EN-5 (17.09.2026): die vierte Sammelstelle fehlte hier — die zwei neuen
  // dokument.<id>.name-Kennungen der Werk-Auszüge zählten als „tot", obwohl beide Rendering-
  // Stellen sie lesen.
  for (const s of V.bereicheAlle()) {
    for (const d of (s.standardDokumente || [])) {
      if (!d || !d.typ) continue;
      wege.add('dokument.' + d.typ + '.name');
      if (d.hinweis) wege.add('dokument.' + d.typ + '.hinweis');
    }
  }
  for (const m of (V.VORSORGE_MODULE || [])) if (m && m.id) wege.add('dokument.' + m.id + '.name');
  for (const v of (V.STANDARD_VORLAGEN || [])) if (v && v.id) wege.add('dokument.' + v.id + '.name');
  for (const text of abWerkTexte(V)) {
    const bundle = JSON.parse(text);
    if (bundle && bundle.id) wege.add('dokument.' + bundle.id + '.name');
  }
  // Zug 2b (17.08.2026): die Situationen tragen `titel`/`einfuehrung` am Registereintrag,
  // ihre Blöcke `titel`/`hint` unter der Block-`id`, und ihre eigenen Felder wie Sektorfelder.
  // `bloecke` ist bei allen zehn ein Getter — er wird hier aufgerufen, wie ihn auch die Sicht
  // aufruft.
  for (const sit of V.SITUATIONEN) {
    for (const art of V.TEXTSATZ_ARTEN) wege.add('situation:' + sit.id + '.' + art);
    for (const blk of (sit.bloecke || [])) {
      if (blk.id) for (const art of V.TEXTSATZ_ARTEN) wege.add('situation:' + sit.id + '#' + blk.id + '.' + art);
      for (const e of (blk.eintraege || [])) {
        if (e && e.feld && e.feld.id) { feld(e.feld, 'situation:' + sit.id + '.' + e.feld.id); vorschlaegeKennung(e.feld); }
      }
    }
  }
  // U2-ADR-142: die zwoelf Institutions-Arten-Beschriftungen liegen seit 17.08. ebenfalls im
  // Satz. Sie haengen nicht am SEKTOREN-Baum, sondern an einer eigenen Kennung.
  for (const k of V.INSTITUTION_ART_EINGEBAUT) wege.add('institutionsArt:' + k + '.label');
  // U2-ADR-425 (20.09.2026): Hilfe-Kapitel — ein eigener, kleiner Kennungsraum `hilfe:<themaId>.<feld>`.
  // hilfeThemaModell() holt je Thema titel, einleitung und abschnitt0 .. abschnitt<n-1> (n = anzahlAbschnitte);
  // der Weg wird hier hergestellt, nicht ausgenommen, damit ein verschriebenes Thema weiter als tot auffaellt.
  for (const t of (V.HILFE_THEMEN || [])) {
    wege.add('hilfe:' + t.id + '.titel');
    wege.add('hilfe:' + t.id + '.einleitung');
    for (let i = 0; i < t.anzahlAbschnitte; i++) wege.add('hilfe:' + t.id + '.abschnitt' + i);
  }
  /* Zug 3 (Auftrag „Die Empfängerseite"): fünf weitere Register. Sie werden hier NICHT
     gesondert behandelt — dieselben zwei Läufer (`knoten`, `feld`) begehen sie, nur mit
     ihrem eigenen Kennungsraum. Wer einen Ort hebt und hier nicht einträgt, bekommt sofort
     eine Liste toter Kennungen; das ist die Absicht. */
  for (const w of V.WIZARDS) {
    knoten(w, 'wizard:' + w.id);
    // Nachtrag 17.08.: der Abschluss-Zuruf ist ein eigener Knoten mit eigener Kennung.
    if (w.abschluss && typeof w.abschluss === 'object') knoten(w.abschluss, 'wizard:' + w.id + '.abschluss');
    for (const sch of (w.schritte || [])) {
      if (sch && sch.feld && sch.feld.id) {
        // Nachtrag 17.08.: `frage`/`hilfetext` sitzen am SCHRITT unter der Kennung
        // seines Feldes — derselbe Weg, ein zweiter Knoten daran.
        knoten(sch, 'wizard:' + w.id + '.' + sch.feld.id);
        feld(sch.feld, 'wizard:' + w.id + '.' + sch.feld.id);
        vorschlaegeKennung(sch.feld);
      }
    }
  }
  for (const a of V.ANLAESSE) {
    knoten(a, 'anlass:' + a.id);
    // CW-1 (24.08.2026): ein Zwischenfrage-Ziel hat einen Modal-Titel plus eine
    // Kennung je Options-Ziel — aus dem Modell gelesen (a.ziel.zwischenfrage), nicht als
    // feste Liste, damit ein künftiger weiterer Zwischenfrage-Anlass ohne Pflege hier landet.
    if (a.ziel && Array.isArray(a.ziel.zwischenfrage)) {
      wege.add('anlass:' + a.id + '.zwischenfrage.titel');
      for (const zid of a.ziel.zwischenfrage) wege.add('anlass:' + a.id + '.zwischenfrage.' + zid);
    }
  }
  // (Angehörigen-Blätter stehen seit ANG1 inline in ihrer Vorlage — kein Textsatz-Weg mehr.)
  /* Zug 2: der flache Kennungsraum von `STRINGS`. Kein Baumweg, weil es keinen Baum
     gibt — die Kennung ist der Schlüssel selbst. */
  for (const k of Object.keys(V.STRINGS || {})) wege.add('strings:' + k + '.text');
  /* U2-ADR-333: der Hinweis auf unuebersetzte Passagen wird DIREKT per `textLesen`
     gelesen, nicht ueber einen Knoten im Baum — wie die flachen `strings:`-Kennungen
     darueber. Ohne diese Zeile meldete die Gegenprobe ihn als tote Kennung, obwohl
     ihn `modulDokumentAbschnitte` bei jedem fremdsprachigen Dokument abholt. */
  wege.add('dokument.uebersetzungOffen');
  feld(V.MENSCHEN_REGISTER_FELD, 'menschenRegister');
  feld(V._institutionFelder(), 'institutionsFeld');
  // U2-ADR-112-Nachtrag Zug 2 (27.08.2026): VOLLMACHT_BMJ hat keinen Wizard, der ihn
  // referenziert (U2-ADR-096) — eigener Kennungsraum `'vollmacht:' + feldId`, derselbe
  // `feld`-Läufer wie überall.
  for (const st of V.VOLLMACHT_BMJ.steps) {
    if (st && st.feld && st.feld.id) feld(st.feld, 'vollmacht:' + st.feld.id);
  }
  /* U2-ADR-353 (07.09.2026): die zwei Ab-Werk-Vorlagen (erbschein-vorbereitung,
     zugang-zum-recht-beratungshilfe) sind `data.logikModule[]`-Einträge, pro Depot geladen —
     `_textsatzOrteBegehen` kennt sie nicht (sie sitzen an keinem Kern-Konstanten-Ort, den der
     Gang begeht). EIGENER, VON HAND NACHGEBAUTER WEG, bewusst — dieselbe Form wie VOLLMACHT_BMJ
     direkt darüber, aus demselben Grund (kein Wizard/keine feste Kern-Struktur, die der Gang
     fände). U2-ADR-353 selbst erklärt, warum kein genereller Läufer (Weg A) gebaut wurde: eine
     Architekturentscheidung für ALLE künftigen logikModule bleibt eine Produktentscheidung,
     nicht dieser einzelnen Probe. Kennungsschema identisch zu `_logikModulTexteAufloesen`
     (vivodepot.html) — dieselbe Ableitung, zwei Orte, die nicht auseinanderlaufen sollen. */
  for (const roh of abWerkTexte(V)) {
    let bundle;
    try { bundle = JSON.parse(roh); } catch (e) { continue; }
    if (!bundle || typeof bundle.id !== 'string') continue;
    const wurzel = 'dok:' + bundle.id;
    const anker = (blk, i) => (blk && typeof blk.feldId === 'string' && blk.feldId) ? blk.feldId : String(i);
    (bundle.abschnitte || []).forEach((ab, ai) => {
      const aK = wurzel + '#' + ai;
      if (typeof ab.titel === 'string') wege.add(aK + '.titel');
      (ab.bloecke || []).forEach((blk, bi) => {
        const bK = aK + '/' + anker(blk, bi);
        if (typeof blk.frage === 'string') wege.add(bK + '.frage');
        if (typeof blk.luecke === 'string') wege.add(bK + '.luecke');
        if (Array.isArray(blk.texte)) blk.texte.forEach((t, ti) => { if (typeof t === 'string') wege.add(bK + '.texte[' + ti + ']'); });
      });
    });
    const da = bundle.dokAusgabe || {};
    ['h1', 'herkunftText', 'unterschriftErsatzHinweis', 'fussText', 'toolbarHinweis'].forEach((k) => {
      if (typeof da[k] === 'string') wege.add(wurzel + '.' + k);
    });
  }
  /* U2-ADR-333: die Dokument-Module und die zwei Schritt-Kataloge. Ihre Wege werden
     NICHT von Hand nachgebaut wie die darüber, sondern beim GANG SELBST erfragt —
     `_textsatzOrteBegehen` nimmt einen Aufrufer entgegen und meldet jeden Knoten mit
     seiner Kennung. Ein von Hand nachgebauter Weg wäre eine zweite Landkarte: er
     kennte die Orte, die der Bauende ihm genannt hat, und keinen, den der Gang
     später dazubekommt. Genau daran ist diese Probe für `exporte[].label` schon
     einmal vorbeigelaufen (U2-ADR-322).

     Die Arten kommen aus derselben Quelle wie im Kern; `texte` ist die einzige
     Array-Art und trägt darum eine indizierte Kennung. */
  const DOK_ARTEN = [].concat(V.TEXTSATZ_ARTEN, ['frage', 'hilfetext', 'einleitung', 'toast'],
    ['prefix', 'satz', 'text', 'sektion', 'besprochenEinleitung', 'rollenLabel',
      'abschluss', 'wortlaut', 'feldname']);
  V._textsatzOrteBegehen((knoten, kennung) => {
    if (typeof kennung !== 'string' || !/^(dok:|pvBmj|kiKorpus|vollmachtBmj)/.test(kennung)) return;
    for (const a of DOK_ARTEN) wege.add(kennung + '.' + a);
    if (Array.isArray(knoten.texte)) {
      for (let i = 0; i < knoten.texte.length; i++) wege.add(kennung + '.texte[' + i + ']');
    }
  });

  const tot = Object.keys(V.TEXTSATZ_DE_QUELLE.texte).filter((k) => !wege.has(k));
  assert.deepEqual(tot, [], 'diese Kennungen holt niemand ab — Tippfehler oder entferntes Feld');
});

test('[Textsatz] auch der NUR-MIT-DATEN sichtbare Block holt seine Kennungen ab', async () => {
  // Ohne Depot existiert der KI-Block von `todesfall-uebernahme` nicht — die Probe oben
  // könnte seine zwei Kennungen darum nie finden und hielte sie für tot. Statt sie
  // auszunehmen (eine Ausnahme, die nichts prüft) wird hier der Zustand hergestellt,
  // in dem der Block existiert: ein Depot mit einer KI-Verfügung.
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-ki-block-pw');
  V.akteurSelbstErklaeren('Testerin');   // ohne Sitzungs-Akteur wirft jeder Listen-Eintrag
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'ki-verfuegung', basicDecision: 'erlaubnis' });
  const sit = V.SITUATIONEN.find((s) => s.id === 'todesfall-uebernahme');
  const blk = (sit.bloecke || []).find((b) => b.id === 'digitale-nachbildung-ki-verfuegung');
  assert.ok(blk, 'mit KI-Daten erscheint der Block');
  assert.equal(blk.titel, 'Digitale Nachbildung (KI-Verfügung)');
  assert.match(blk.hint, /^Die verstorbene Person hat Angaben/);
});

/* ── 2. Der umgestellte Sektor zeigt DASSELBE wie vorher ──────────────────────
   Kein Wort hat sich geändert; nur der Ort. Die Werte hier sind aus dem Stand
   VOR der Umstellung übernommen — sie sind der Beleg dafür, nicht eine Kopie
   dessen, was der Satz gerade sagt. */

test('[Textsatz·mobilitaet] Sektor, Sektion, Feld und Unterfeld tragen unverändert ihren Text', () => {
  const { V } = ladeKern();
  const m = V.SEKTOR_BY_ID['mobility'];
  assert.equal(m.label, 'Mobilität & Reise');
  assert.equal(m.einfuehrungstext, 'Was Sie bewegt — und was Sie brauchen, wenn Sie unterwegs sind oder im Ausland Hilfe nötig wird.');
  assert.equal(m.sektionen[0].label, 'Fahrzeuge und Führerschein');
  const feld = (id) => m.sektionen[0].felder.find((f) => f.id === id);
  assert.equal(feld('passportNo').label, 'Reisepass-Nr.');
  assert.equal(feld('passportNo').beispiel, 'C123456789');
  // Schnitt Glied 3 (A448, U2-ADR-161): `elefand_gueltig` ist als Skalarfeld entfallen — der
  // Hinweistext lebt unverändert am `validUntil`-Unterfeld der Liste `elefandRegistrations` weiter.
  const elefandGueltig = feld('elefandRegistrations').unterFelder.find((u) => u.id === 'validUntil');
  assert.equal(elefandGueltig.hint, 'Registrierungsende, meist an Ihre geplante Reisedauer gekoppelt. Danach neu registrieren.');
  const uf = feld('vehicles').unterFelder.find((u) => u.id === 'vehicleRegistrationDocument');
  assert.equal(uf.label, 'Fahrzeugausweis — Ablageort');
  assert.equal(uf.hint, 'Wird für Ummeldung oder Verkauf benötigt.');
  assert.equal(uf.beispiel, 'Handschuhfach');
});

test('[Textsatz·mobilitaet] die Führerschein-Klassen bleiben INLINE — sie sind Datenwerte, keine Anzeigetexte', () => {
  const { V } = ladeKern();
  const f = V.SEKTOR_BY_ID['mobility'].sektionen[0].felder.find((x) => x.id === 'drivingLicenceClasses');
  assert.equal(f.optionen.find((o) => o.wert === 'C1E').label, 'C1E');
  const imSatz = Object.keys(V.TEXTSATZ_DE_QUELLE.texte).filter((k) => k.startsWith('mobility.drivingLicenceClasses.optionen'));
  assert.deepEqual(imSatz, [], 'Klassenbezeichnungen gehören nicht in den Textsatz');
});

/* ── 3. Die Leseregel ─────────────────────────────────────────────────────── */

test('[Textsatz·Situationen] Titel und Einführung kommen aus dem Satz, unverändert', () => {
  const { V } = ladeKern();
  const sit = V.SITUATIONEN.find((s) => s.id === 'geburt');
  assert.equal(sit.titel, 'Bei der Geburt eines Kindes');
  assert.ok(sit.einfuehrung.startsWith('Was rund um die Geburt zu regeln ist'));
  assert.equal(V.textLesen('situation:erbfall.titel'), 'Im Erbfall');
});

test('[Textsatz·Situationen] die Blöcke tragen stabile Kennungen statt Positionen', () => {
  const { V } = ladeKern();
  // Die Grenze von Glied 3 („Blocktexte gehören noch nicht in den Satz") ist mit Zug 2b
  // aufgehoben — sie war technisch begründet, nicht inhaltlich: `bloecke` war beim Bau des
  // Registers nicht lesbar. Seit der Getter über ALLE zehn läuft, ist sie fort. Was bleibt,
  // ist die Bedingung, unter der sie fallen durfte: eine Kennung, die keine Position ist.
  for (const sit of V.SITUATIONEN) {
    const ids = (sit.bloecke || []).map((b) => b.id);
    assert.ok(ids.every(Boolean), sit.id + ': ein Block ohne id — seine Kennung wäre eine Position');
    assert.equal(new Set(ids).size, ids.length, sit.id + ': zwei Blöcke mit derselben id');
  }
  const positionsKennungen = Object.keys(V.TEXTSATZ_DE_QUELLE.texte).filter((k) => /^situation:[^.]+#\d+\./.test(k));
  assert.deepEqual(positionsKennungen, [], 'keine Kennung darf an einer Position hängen');
});

test('[Textsatz·Situationen] der dynamische Block wächst mit — und bleibt im Satz auffindbar', () => {
  const { V } = ladeKern();
  // `todesfall-uebernahme` fügt den KI-Block je nach Depot-Inhalt IN DER MITTE ein. Genau
  // deshalb taugt eine Position nicht als Kennung; diese Probe hält den Grund fest.
  const sit = V.SITUATIONEN.find((s) => s.id === 'todesfall-uebernahme');
  const ohne = (sit.bloecke || []).map((b) => b.id);
  assert.ok(ohne.includes('rechtliche-einordnung'), 'der letzte Block ist da');
  assert.ok(!ohne.includes('digitale-nachbildung-ki-verfuegung'), 'ohne KI-Daten fehlt der KI-Block');
  // Der letzte Block liegt ohne KI-Block an einer anderen Stelle als mit ihm — die id nicht.
  assert.notEqual(ohne.indexOf('rechtliche-einordnung'), ohne.length, 'Position ist datenabhängig');
});

test('[Textsatz] textLesen liefert den eingebauten Text — und null statt eines erfundenen', () => {
  const { V } = ladeKern();
  assert.equal(V.textLesen('mobility.deutschlandticketPublic.label'), 'Deutschlandticket / ÖPNV');
  assert.equal(V.textLesen('mobility.gibtesnicht.label'), null);
});

test('[Textsatz] ohne gesetzte Sprache gilt der eingebaute Satz', () => {
  const { V } = ladeKern();
  assert.equal(V.textsatzSpracheAktiv(), 'de');
});

/* ── 4. Die Modul-Regeln — dieselben vier wie beim Rechtsraum-Modul ───────── */

test('[Textsatz·Modul] der eingebaute Sprachcode ist reserviert', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen({ sprache: 'de', moduleVersion: 1, texte: { 'mobility.deutschlandticketPublic.label': 'x' } });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'reserviert');
});

test('[Textsatz·Modul] moduleVersion muss eine ganze Zahl ab 1 sein', () => {
  const { V } = ladeKern();
  for (const v of [0, -1, 1.5, '2', null, undefined]) {
    const r = V.textsatzModulPruefen({ sprache: 'fr', moduleVersion: v, texte: {} });
    assert.equal(r.gueltig, false, 'moduleVersion ' + String(v));
    assert.equal(r.grund, 'moduleVersion');
  }
});

test('[Textsatz·Modul] eine unbekannte Kennung wird VERWORFEN, ohne das Modul zu verwerfen', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen({
    sprache: 'fr', moduleVersion: 1,
    texte: { 'mobility.deutschlandticketPublic.label': 'Abonnement', 'mobility.erfunden.label': 'nichts', 'mobility.passportNo.label': '' },
  });
  assert.equal(r.gueltig, true);
  assert.deepEqual(Object.keys(r.texte), ['mobility.deutschlandticketPublic.label']);
  assert.deepEqual(r.verworfene.map((v) => v.grund).sort(), ['kein-text', 'unbekannt']);
});

test('[Textsatz·Modul] Aktualisieren-statt-Einfrieren: nur eine höhere moduleVersion ersetzt', () => {
  const { V } = ladeKern();
  const alt = { sprache: 'fr', moduleVersion: 2, texte: {} };
  const gleich = V.textsatzModulEinbetten([alt], { sprache: 'fr', moduleVersion: 2, texte: { a: 'b' } });
  assert.equal(gleich[0].moduleVersion, 2);
  assert.equal(Object.keys(gleich[0].texte).length, 0, 'kein Rückschritt, kein Gleichstand-Tausch');
  const hoeher = V.textsatzModulEinbetten([alt], { sprache: 'fr', moduleVersion: 3, texte: { a: 'b' } });
  assert.equal(hoeher[0].moduleVersion, 3);
  const andere = V.textsatzModulEinbetten([alt], { sprache: 'it', moduleVersion: 1, texte: {} });
  assert.equal(andere.length, 2, 'ein neuer Sprachcode wird angehängt');
});

/* ── 5. Der volle Weg: angedockter Satz greift, sobald seine Sprache aktiv ist ── */

test('[Textsatz·Modul] ein angedockter Satz ersetzt den Text — und nur den, den er trägt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-modul-pw');
  V.getData().textsprache = 'fr';
  V.getData().textsatzModule = [{
    sprache: 'fr', moduleVersion: 1,
    texte: { 'mobility.deutschlandticketPublic.label': 'Abonnement de transport' },
  }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  V.textsatzNeuAnwenden();

  const feld = (id) => V.SEKTOR_BY_ID['mobility'].sektionen[0].felder.find((f) => f.id === id);
  assert.equal(feld('deutschlandticketPublic').label, 'Abonnement de transport');
  // Rückfall-Reihenfolge: textLesen() selbst bleibt bei null; die Anzeige fragt Modulsprache, dann Englisch (nur wo ein EN-Modul liegt), dann Deutsch.
  // Seit S1 (20.09.2026) trägt der Kern keinen englischen Satz: was das Modul nicht trägt, fällt auf Deutsch zurück — nicht auf die Kennung.
  assert.equal(feld('passportNo').label, V.TEXTSATZ_DE_QUELLE.texte['mobility.passportNo.label'], 'was das Modul nicht trägt, kommt aus dem deutschen Rückfall');

  // Zurück auf Deutsch — der Baum darf nicht französisch stehenbleiben.
  V.getData().textsprache = 'de';
  V.textsatzNeuAnwenden();
  assert.equal(feld('deutschlandticketPublic').label, 'Deutschlandticket / ÖPNV');
});

/* ── U2-ADR-401 (11.09.2026, „Achsen-Verriegelung") ────────────────────────
   Fund aus der Achsen-Erhebung vom selben Tag: zwei depot-eigene Module DESSELBEN Fachs
   ([sprache,rechtsraum]) von verschiedenen Anbietern überschrieben sich lautlos — „letztes
   gewinnt" stand bereits im Kommentar, aber niemand konnte den Widerspruch SEHEN. Anders als
   bei Branding ist das Register hier legitim mehrwertig (mehrere FÄCHER nebeneinander sind
   normal) — der Fix ändert darum nicht, WER gewinnt, sondern macht den Widerspruch messbar. */

test('[Textsatz·Modul·U2-ADR-401] zwei Module DESSELBEN Fachs, verschiedene Anbieter: Widerspruch wird festgehalten', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-modul-pw');
  V.getData().textsatzModule = [
    { sprache: 'fr', moduleVersion: 1, anbieterId: 'anbieter-a', texte: { 'mobility.deutschlandticketPublic.label': 'Version A' } },
    { sprache: 'fr', moduleVersion: 1, anbieterId: 'anbieter-b', texte: { 'mobility.deutschlandticketPublic.label': 'Version B' } },
  ];
  V._textsatzModuleAusDepotAnmelden(V.getData());
  const konflikte = V.getTextsatzKonflikte();
  assert.equal(konflikte.length, 1, 'ROT ERWARTET, wenn falsch: der Widerspruch bleibt unsichtbar, wie vor dem Fix');
  assert.deepEqual(konflikte[0], { sprache: 'fr', rechtsraum: '', behalten: 'anbieter-a', verworfen: 'anbieter-b' });
});

test('[Textsatz·Modul·U2-ADR-401·Gegenprobe] zwei Module VERSCHIEDENER Fächer: kein Widerspruch, beide bleiben stehen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-modul-pw');
  V.getData().textsatzModule = [
    { sprache: 'fr', moduleVersion: 1, anbieterId: 'anbieter-a', texte: { 'mobility.deutschlandticketPublic.label': 'Version FR' } },
    { sprache: 'en', moduleVersion: 1, anbieterId: 'anbieter-b', texte: { 'mobility.deutschlandticketPublic.label': 'Version EN' } },
  ];
  V._textsatzModuleAusDepotAnmelden(V.getData());
  assert.deepEqual(V.getTextsatzKonflikte(), [], 'zwei verschiedene Fächer sind kein Widerspruch — beide nebeneinander ist der Normalfall');
});

test('[Textsatz·Modul·U2-ADR-401·Gegenprobe] Ab-Werk-Saat gegen ein depot-eigenes Modul desselben Fachs ist kein Widerspruch', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-modul-pw');
  // 'de'/'' ist die Ab-Werk-Saat (AB_WERK_TEXTSATZ_DE) — ein depot-eigenes deutsches Modul
  // ersetzt sie wie bisher, das ist die gewollte Rangfolge, kein Anbieter-Widerspruch.
  V.getData().textsatzModule = [{ sprache: 'de', moduleVersion: 1, anbieterId: 'anbieter-a', texte: { 'mobility.deutschlandticketPublic.label': 'Eigene Fassung' } }];
  V._textsatzModuleAusDepotAnmelden(V.getData());
  assert.deepEqual(V.getTextsatzKonflikte(), []);
});

/* ROT-BELEG ZU ZUG 3: die fünf weiteren Register schalten MIT um — und wieder zurück.

   OHNE DIESE PROBE WÄRE DER FUND UNSICHTBAR GEBLIEBEN, und er war schon da:
   `textsatzNeuAnwenden` lief bis zum 17.08. nur über `SEKTOREN`. Selbst die Situationen
   hätten ihre Titel deutsch stehenlassen — kein Wurf, keine Meldung, ein halb übersetztes
   Register. Der Bau hat daraus EINE Liste der Orte gemacht (`_textsatzOrteBegehen`); diese
   Probe ist ihre Gegenprobe, und sie prüft beide Richtungen, denn nur der Rückweg zeigt,
   dass wirklich zurückgenommen und nicht bloss überschrieben wird. */
test('[Textsatz·Modul·Zug 3] Assistent, Anlass, Menschen-Register und Institutionsfeld schalten mit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-zug3-pw');
  V.getData().textsprache = 'fr';
  V.getData().textsatzModule = [{
    sprache: 'fr', moduleVersion: 1,
    texte: {
      'wizard:gebwiz.titel': 'Naissance d’un enfant',
      'wizard:gebwiz.geburt_klinik.label': 'Maternité',
      'anlass:umzug.label': 'Déménagement',
      'menschenRegister/name.label': 'Nom',
      'institutionsFeld/anmerkung.label': 'Remarque',
    },
  }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  V.textsatzNeuAnwenden();

  const wiz = V.WIZARDS.find((w) => w.id === 'gebwiz');
  const mrfName = () => V.MENSCHEN_REGISTER_FELD.unterFelder.find((f) => f.id === 'name');
  const instAnm = () => V._institutionFelder().unterFelder.find((f) => f.id === 'anmerkung');

  assert.equal(wiz.titel, 'Naissance d’un enfant');
  assert.equal(wiz.schritte[0].feld.label, 'Maternité');
  assert.equal(V.ANLAESSE.find((a) => a.id === 'umzug').label, 'Déménagement');
  assert.equal(mrfName().label, 'Nom');
  assert.equal(instAnm().label, 'Remarque');

  // Seit S1 (20.09.2026): was das Modul NICHT trägt, fällt auf Deutsch zurück — kein
  // Flächenbrand trotzdem: nur DIESE eine Kennung ist betroffen, nichts Umliegendes.
  assert.equal(V.ANLAESSE.find((a) => a.id === 'notar').label, V.TEXTSATZ_DE_QUELLE.texte['anlass:notar.label']);

  /* DER RÜCKWEG. Genau hier ist der erste Bau gescheitert (an den Sektoren, gemessen):
     wer die aus dem Satz stammenden Werte am WERTVERGLEICH erkennt statt an der Kennung,
     gibt einen bereits ersetzten Text nie wieder frei. */
  V.getData().textsprache = 'de';
  V.textsatzNeuAnwenden();
  assert.equal(wiz.titel, 'Geburt eines Kindes');
  assert.equal(wiz.schritte[0].feld.label, 'Geburtsklinik / Geburtsort');
  assert.equal(V.ANLAESSE.find((a) => a.id === 'umzug').label, 'Umzug oder Haushaltsauflösung');
  assert.equal(mrfName().label, 'Name');
  assert.equal(instAnm().label, 'Anmerkung');
});

test('[Textsatz·Zug 3] der Situations-Getter wird genau einmal gelegt — kein Wachsen bei jedem Anmelden', async () => {
  /* Der Getter für `bloecke` wickelt den vorigen ein. Ohne Riegel wüchse die Kette mit
     JEDEM `textsatzNeuAnwenden`, und ein Depot, das seinen Satz mehrfach anmeldet, würde
     mit jedem Mal langsamer — messbar erst spät, erklärbar nie. Der Riegel ist das nicht
     aufzählbare `_textsatzRoh`; diese Probe hält ihn fest. */
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-getter-pw');
  const vorher = V.SITUATIONEN[0].bloecke.length;
  for (let i = 0; i < 5; i++) V.textsatzNeuAnwenden();
  assert.equal(V.SITUATIONEN[0].bloecke.length, vorher, 'die Blöcke bleiben, was sie waren');
  assert.ok(Object.keys(V.SITUATIONEN[0]).indexOf('_textsatzRoh') < 0,
    '_textsatzRoh ist nicht aufzählbar — es gehört zum Mechanismus, nicht zum Register');
});

/* Fund (19.09.2026, DoD-Punkt 1): `_TEXTSATZ_ZURUECK` versuchte `delete knoten[art]`
   auf `label`/`einfuehrungstext` — an einem über `bereichsModulPruefen()` erzeugten,
   angedockten Bereich sind das LIVE-GETTER, keine Dateneigenschaften, und angedockte Bereiche
   werden bewusst eingefroren. `delete` auf einem Getter eines eingefrorenen Objekts ist ein
   TypeError IN STRICT MODE — geprüft, aber ABSICHTLICH NICHT als `ladeKern()`-Probe HIER
   gebaut: `ladeKern()`/dieser Testlauf werten den Kern nicht im selben Strict-Mode-Kontext aus
   wie ein echter Browser (gemessen, nicht angenommen — `delete` auf genau demselben
   eingefrorenen Getter blieb hier ohne Fehler, in Chromium bricht es). Eine Probe an dieser
   Stelle wäre immer grün, mit oder ohne Fix — schlimmer als keine Probe. Der echte, browser-
   verifizierte Rot-vor-Fix/Grün-nach-Fix-Beweis steht in tests/e2e/klicktest-kern-verschluss-
   2026-09-19.spec.js (drei aufeinanderfolgende Läufe, s. dortiger Kopf-Kommentar und der
   Bericht klicktest-textsatz-frozen-fix-cf-2026-09-19.md). */

test('[Textsatz·Modul] ein Modul mit dem reservierten Code wird beim Anmelden nicht registriert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-modul-pw-2');
  V.getData().textsatzModule = [{ sprache: 'de', moduleVersion: 9, texte: { 'mobility.deutschlandticketPublic.label': 'gekapert' } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 0);
  V.textsatzNeuAnwenden();
  const f = V.SEKTOR_BY_ID['mobility'].sektionen[0].felder.find((x) => x.id === 'deutschlandticketPublic');
  assert.equal(f.label, 'Deutschlandticket / ÖPNV', 'der eingebaute Satz ist nicht überschreibbar');
});

/* ══ ZUG 2 — DIE FORM GEGEN DIE GESAMTMENGE ════════════════════════════════
   „Die Lokalisierbarkeit der ganzen Suite" (17.08.2026), Zug 2.
   Entscheidung: alles lokalisierbar und anpassbar — Versionen für andere
   Länder, Sprachen und Kulturen.

   ZWEI DINGE WERDEN HIER BELEGT, und sie sind verschieden:

   1 · OPTIONSWERTE BRAUCHEN KEINE NEUE FORM. Sie galten nach der Erhebung aus Zug 1
       als der grösste Einzelposten, für den das Schema erweitert werden müsste — 281
       im Kern, 290 in der Lese-App. Sie müssen es nicht: eine Option hat zwar keine
       `id`, aber einen `wert`, und der ist in ihrer Liste eindeutig. Damit ist die
       Kennung derselbe Baumweg wie überall, nur eine Ebene tiefer.

   2 · DER KOPF TRÄGT REGELN, KEINE TEXTE. Der Befund aus Zug 1: kein `Intl.*`, kein
       `dir="rtl"` — je null Vorkommen. Ein Modul könnte eine arabische Oberfläche
       vollständig beschreiben, und die Anwendung setzte sie von links nach rechts.
       Ein Datumsformat als Text getarnt müsste an jeder Ausgabestelle einzeln stehen
       und liefe sofort auseinander. */

test('[Textsatz·Zug 2] ein Optionswert kommt aus dem Satz und geht wieder zurück', async () => {
  const { V } = ladeKern();
  const opt = () => V.SEKTOR_BY_ID.identity.sektionen
    .flatMap((s) => s.felder).find((f) => f.id === 'maritalStatus').optionen[0];
  assert.deepEqual(opt(), { wert: 'ledig', label: 'ledig' }, 'eingebaut aus dem Satz gefüllt');

  await V.depotAnlegen('textsatz-zug2-option-pw');
  V.getData().textsprache = 'fr';
  V.getData().textsatzModule = [{ sprache: 'fr', moduleVersion: 1,
    texte: { 'identity.maritalStatus/ledig.label': 'célibataire' } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  V.textsatzNeuAnwenden();
  assert.equal(opt().label, 'célibataire');
  assert.equal(opt().wert, 'ledig', 'der WERT bleibt — er ist Kennung, kein Anzeigetext');

  V.getData().textsprache = 'de';
  V.textsatzNeuAnwenden();
  assert.equal(opt().label, 'ledig', 'der Rückweg gibt den eingebauten Text frei');
});

test('[Textsatz·Zug 2·Rot] eine Optionskennung ohne Eintrag im Satz wird abgelehnt', () => {
  /* Der Riegel, der die Form ehrlich hält: ein Modul kann nur ersetzen, was der
     eingebaute Satz kennt. Ohne ihn könnte ein Modul beliebige Kennungen erfinden,
     und niemand sähe, dass sie nichts treffen.

     Der WERT im Kennungspfad ist erfunden ('nichtvorhanden') statt ein echtes
     Familienstand-Feld (z. B. 'verh') zu nennen — seit tools/textsatz-optionslabel-
     heben.js (27.08.2026) sind ALLE Optionswerte von `identity.maritalStatus`
     gehoben, ein bisher „unbekanntes" echtes Feld wäre also keine verlässliche
     Negativkontrolle mehr, sondern würde bei jeder weiteren Hebung erneut rot. */
  const { V } = ladeKern();
  /* Umgestellt 22.09.2026 (Textsatz-Einlass meldet den Verlust): ein Modul, von dem JEDE Kennung verworfen wird, ist jetzt `leer`. Die erfundene Optionskennung steht
     darum neben einer echten (`ledig`, im Test darüber benutzt); erwartet wird „genau die echte kommt an, die erfundene nicht" — strenger als „keine". */
  const r = V.textsatzModulPruefen({ sprache: 'fr', moduleVersion: 1,
    texte: { 'identity.maritalStatus/nichtvorhanden.label': 'marié', 'identity.maritalStatus/ledig.label': 'célibataire' } });
  assert.equal(r.gueltig, true, 'das Modul bleibt gültig');
  assert.deepEqual(Object.keys(r.texte), ['identity.maritalStatus/ledig.label'], 'die erfundene Kennung greift nicht, die echte schon');
  assert.deepEqual(r.verworfene, [{ kennung: 'identity.maritalStatus/nichtvorhanden.label', grund: 'unbekannt' }]);
});

test('[Textsatz·Zug 2] der Kopf trägt die Regeln — und ein Modul ohne Kopf gilt weiter', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.textsatzRegeln(), V.TEXTSATZ_REGELN_EINGEBAUT, 'ohne Modul der eingebaute Satz');
  const ohneKopf = V.textsatzModulPruefen({ sprache: 'fr', moduleVersion: 1, texte: {} });
  assert.equal(ohneKopf.gueltig, true);
  assert.deepEqual(ohneKopf.regeln, {}, 'der Kopf ist freiwillig');
});

test('[Textsatz·Zug 2] eine unbekannte oder unerlaubte Regel wird NAMENTLICH verworfen — das Modul bleibt gültig', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen({ sprache: 'ar', moduleVersion: 1, texte: {},
    regeln: { schreibrichtung: 'rtl', datumsformat: 'JJJJ-MM-TT', unfug: 'x', dezimaltrenner: '·' } });
  assert.equal(r.gueltig, true, 'ein verworfener Eintrag verwirft nicht das Modul');
  assert.deepEqual(r.regeln, { schreibrichtung: 'rtl', datumsformat: 'JJJJ-MM-TT' });
  assert.deepEqual(r.verworfene.map((v) => v.kennung + ':' + v.grund).sort(),
    ['regeln.dezimaltrenner:unerlaubter-wert', 'regeln.unfug:unbekannte-regel']);
});

test('[Textsatz·Zug 2·Rot] ein Modul schaltet die Schreibrichtung um — und wieder zurück', async () => {
  /* DAS IST DIE PROBE, DIE DEN BEFUND AUS ZUG 1 SCHLIESST. Vorher gab es im ganzen
     Kern kein `dir="rtl"`, keinen `[dir=]`-Selektor, kein `direction: rtl` — null.
     Ein Satz ohne Schreibrichtung ist für Arabisch oder Hebräisch kein halber Weg. */
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-zug2-rtl-pw');
  const dok = { documentElement: { _attr: {},
    setAttribute(k, w) { this._attr[k] = w; }, getAttribute(k) { return this._attr[k]; } } };

  assert.equal(V.textsatzSchreibrichtungAnwenden(dok), 'ltr');
  assert.equal(dok.documentElement.getAttribute('dir'), 'ltr');

  V.getData().textsprache = 'ar';
  V.getData().textsatzModule = [{ sprache: 'ar', moduleVersion: 1, texte: {},
    regeln: { schreibrichtung: 'rtl' } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  assert.equal(V.textsatzSchreibrichtungAnwenden(dok), 'rtl');
  assert.equal(dok.documentElement.getAttribute('dir'), 'rtl');
  assert.equal(V.textsatzRegeln().datumsformat, 'TT.MM.JJJJ',
    'was das Modul nicht sagt, bleibt der eingebaute Wert');

  V.getData().textsprache = 'de';
  assert.equal(V.textsatzSchreibrichtungAnwenden(dok), 'ltr', 'der Rückweg gilt auch für Regeln');
});

test('[Textsatz·Zug 2] die Regeln reisen NICHT AUFZÄHLBAR mit — sonst wären sie ein Text', async () => {
  /* Beim Bau der erste Fehler, den die Form gemacht hätte: die Registry, die
     `textLesen` mit `[kennung]` befragt, hätte einen zusätzlichen aufzählbaren
     Schlüssel als Text ausgeliefert. */
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-zug2-nichtaufzaehlbar-pw');
  V.getData().textsprache = 'ar';
  V.getData().textsatzModule = [{ sprache: 'ar', moduleVersion: 1,
    texte: { 'identity.maritalStatus/ledig.label': 'أعزب' }, regeln: { schreibrichtung: 'rtl' } }];
  V._textsatzModuleAusDepotAnmelden(V.getData());
  /* Die Registry selbst ist nicht exportiert — geprüft wird darum an ihrer WIRKUNG,
     und das ist ohnehin die belastbarere Probe: `textLesen` darf die Regeln nicht
     als Text ausliefern, und der Text daneben muss weiterhin ankommen. */
  assert.equal(V.textLesen('_regeln'), null, 'die Regeln sind über textLesen nicht erreichbar');
  assert.equal(V.textLesen('regeln'), null);
  assert.equal(V.textLesen('identity.maritalStatus/ledig.label'), 'أعزب',
    'der Text daneben kommt an — die Registry ist nicht beschädigt');
  assert.equal(V.textsatzRegeln().schreibrichtung, 'rtl', 'und die Regel wirkt trotzdem');
});

test('[Textsatz·Zug 2] STRINGS ist eine Lese-Sicht über den Satz — und bleibt vollständig', () => {
  /* Der flache Kennungsraum: `strings:<schlüssel>.text`. Kein Baumweg, weil es keinen
     Baum gibt — ein erfundener wäre eine Kennung, die nichts beschreibt. */
  const { V } = ladeKern();
  assert.equal(V.STRINGS.navHauptLabel, 'Hauptnavigation', 'aus dem Satz gelesen');
  assert.ok('navHauptLabel' in V.STRINGS, 'der gehobene Schlüssel bleibt im `in`-Operator');
  assert.ok(Object.keys(V.STRINGS).indexOf('navHauptLabel') >= 0,
    'und in Object.keys — sonst wäre die Tabelle nach dem vollständigen Heben leer, '
    + 'ohne dass ein Wert fehlte');
  assert.equal(Object.assign({}, V.STRINGS).navHauptLabel, 'Hauptnavigation', 'auch über Spread');
});

test('[Textsatz·Zug 2] STRINGS bleibt unveränderlich — der Proxy wirft, wo `freeze` schwieg', () => {
  /* Das Ziel ist NICHT mehr eingefroren, und das ist erzwungen: ein Proxy darf über ein
     nicht-erweiterbares Ziel keine zusätzlichen Schlüssel melden (gemessen am 17.08.:
     „trap returned extra keys but proxy target is non-extensible"). Die
     Unveränderlichkeit ist dadurch nicht verloren, sondern strenger — sie wirft jetzt,
     wo `Object.freeze` im sloppy mode still gescheitert wäre. */
  const { V } = ladeKern();
  assert.throws(() => { V.STRINGS.einstAnbieter = 'gekapert'; }, /unveraenderlich/);
  assert.throws(() => { delete V.STRINGS.einstAnbieter; }, /unveraenderlich/);
  assert.throws(() => Object.defineProperty(V.STRINGS, 'neu', { value: 'x' }), /unveraenderlich/);
  assert.equal(V.STRINGS.einstAnbieter, 'Vivodepot GmbH · Berlin', 'der Wert steht unverändert');
});

test('[Textsatz·Zug 2·Rot] ein Modul ersetzt einen STRINGS-Text — und der Rückweg gibt ihn frei', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-zug2-strings-pw');
  V.getData().textsprache = 'fr';
  V.getData().textsatzModule = [{ sprache: 'fr', moduleVersion: 1,
    texte: { 'strings:navHauptLabel.text': 'Navigation principale' } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  assert.equal(V.STRINGS.navHauptLabel, 'Navigation principale');
  // Rückfall-Reihenfolge (19.09.2026): textLesen() bleibt bei null; die Anzeige fragt Modulsprache → Englisch → Deutsch.
  assert.equal(V.STRINGS.einstAnbieter, V.TEXTSATZ_DE_QUELLE.texte['strings:einstAnbieter.text'], 'was das Modul nicht trägt, kommt aus dem deutschen Rückfall (S1)');

  V.getData().textsprache = 'de';
  assert.equal(V.STRINGS.navHauptLabel, 'Hauptnavigation', 'der Rückweg');
});

/* ════════════════════════════════════════════════════════════════════════
   Nachtrag „Alles modular und anpassbar" (17.08.2026) — die Sprachkennung
   ────────────────────────────────────────────────────────────────────────
   Zwei Festlegungen lagen im Quelltext fest und mussten für einen anderen
   Sprachraum anders sein: die Vorlesestimme (`u.lang = 'de-DE'`) und das
   `lang="de"` am Dokument-Element. Sie hängen an EINER Regel, weil es
   dieselbe Angabe in zwei Granularitäten ist — zwei Regeln könnten
   auseinanderlaufen.
   ════════════════════════════════════════════════════════════════════════ */

test('[Textsatz·Nachtrag] die Sprachkennung ist eine Regel im Kopf, kein Text', () => {
  const { V } = ladeKern();
  assert.equal(V.TEXTSATZ_REGELN_EINGEBAUT.sprachkennung, 'de-DE');
  assert.equal(V.textsatzRegeln().sprachkennung, 'de-DE', 'ohne Modul der eingebaute Wert');
  // Sie darf NICHT über textLesen erreichbar sein — sonst wäre sie ein Text.
  assert.equal(Object.keys(V.TEXTSATZ_REGELN_EINGEBAUT).includes('sprachkennung'), true);
});

test('[Textsatz·Nachtrag] die Form wird geprüft, die Sprache nicht bewertet', () => {
  const { V } = ladeKern();
  const pruef = (wert) => V.textsatzModulPruefen({
    sprache: 'xx', moduleVersion: 1, texte: {}, regeln: { sprachkennung: wert } });
  // Angenommen: echte BCP-47-Tags, ohne Rücksicht darauf, WELCHE Sprache.
  for (const gut of ['ar', 'ar-EG', 'de-AT', 'pt-BR', 'zh-Hans-CN', 'fr']) {
    assert.deepEqual(pruef(gut).regeln, { sprachkennung: gut }, 'abgewiesen: ' + gut);
  }
  // Verworfen: alles, was kein Sprach-Tag ist. `lang="<script>"` ist eine
  // Zeichenkette — ohne Formprobe liefe sie durch.
  for (const schlecht of ['<script>', 'DE', 'de_DE', '', '   ', 'de-', 'x'.repeat(40)]) {
    const r = pruef(schlecht);
    assert.deepEqual(r.regeln, {}, 'durchgelassen: ' + JSON.stringify(schlecht));
    assert.equal(r.gueltig, true, 'ein verworfener Eintrag verwirft nicht das Modul');
    assert.equal(r.verworfene.some((v) => v.kennung === 'regeln.sprachkennung'), true,
      'der verworfene Eintrag wird nicht namentlich benannt: ' + JSON.stringify(schlecht));
  }
});

test('[Textsatz·Nachtrag·Rot] ein Modul stellt Dokument-Sprache UND Vorlesestimme um — und wieder zurück', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-nachtrag-sprache-pw');
  const dok = { documentElement: { _attr: {},
    setAttribute(k, w) { this._attr[k] = w; }, getAttribute(k) { return this._attr[k]; } } };

  assert.equal(V.textsatzSprachkennungAnwenden(dok), 'de-DE');
  assert.equal(dok.documentElement.getAttribute('lang'), 'de-DE');

  V.getData().textsprache = 'ar';
  V.getData().textsatzModule = [{ sprache: 'ar', moduleVersion: 1, texte: {},
    regeln: { schreibrichtung: 'rtl', sprachkennung: 'ar-EG' } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);

  assert.equal(V.textsatzSprachkennungAnwenden(dok), 'ar-EG');
  assert.equal(dok.documentElement.getAttribute('lang'), 'ar-EG');
  // Dieselbe Regel trägt die Stimmenwahl — sonst spräche eine deutsche Stimme
  // eine arabische Oberfläche vor.
  const stimmen = [{ lang: 'de-DE', name: 'D' }, { lang: 'ar-EG', name: 'A' }, { lang: 'en-US', name: 'E' }];
  const synth = { getVoices: () => stimmen };
  assert.equal(V.waehleVorleseStimme(synth).name, 'A');

  V.getData().textsprache = 'de';
  assert.equal(V.textsatzSprachkennungAnwenden(dok), 'de-DE', 'der Rückweg gilt auch hier');
  assert.equal(V.waehleVorleseStimme(synth).name, 'D');
});

test('[Textsatz·Nachtrag] die Stimmenwahl fällt auf die Sprache zurück, nie auf eine fremde', () => {
  const { V } = ladeKern();
  const synth = (liste) => ({ getVoices: () => liste });
  // genaue Kennung fehlt, Sprache da → Sprache
  assert.equal(V.waehleVorleseStimme(synth([{ lang: 'de-AT', name: 'AT' }]), 'de-DE').name, 'AT');
  // gar nichts Passendes → null (Systemstimme ist besser als eine falsche)
  assert.equal(V.waehleVorleseStimme(synth([{ lang: 'en-US', name: 'E' }]), 'de-DE'), null);
  // Unterstrich-Schreibweise mancher Systeme wird erkannt
  assert.equal(V.waehleVorleseStimme(synth([{ lang: 'de_DE', name: 'U' }]), 'de-DE').name, 'U');
});

const path = require('node:path');

/* Stufe 2 (09.09.2026) — `bereicheAlle()` statt der Buendel-Liste: seit `housing` ab Werk
   gesaet wird, fuehrt `V.SEKTOREN` zwoelf. Diese Probe trifft eine Aussage ueber ALLE
   Bereiche; mit der Buendel-Liste haette sie einen davon still nicht mehr geprueft und
   waere gruen geblieben. (Erhebung vom 09.09.2026, Klasse „Aussage ueber alle Bereiche".) */
const REPO = path.join(__dirname, '..');

test('[Textsatz·Nachtrag] beide Dokument-Regeln laufen IMMER als Paar, an jeder Stelle nebeneinander', () => {
  const quelle = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  /* War bis 01.09.2026 „genau EIN Aufrufer" (nur depotLaden). U2-ADR-188 ergänzt
     _alleModulRegisterAusDepotAnmelden() als zweiten, bewusst legitimen Aufrufer — dasselbe
     Paar, jetzt auch beim Sub-Kontext-Wechsel/Reset. Die eigentliche Zusage war nie „nur eine
     Stelle", sondern „nie eine Regel ohne die andere, nie eine Sicht statt der Wurzel" — DAS
     prüft dieser Test jetzt direkt (jedes Vorkommen gepaart, statt nur zu zählen). U2-ADR-189
     (Folge-Commit) ergänzt vorDepotKonfigurationAnwenden() als dritten Aufrufer — der Zähler
     wandert dort von 2 auf 3, dieselbe Paar-Prüfung bleibt unverändert.

     (01.09.2026): Zähler UND Gegenstand wechseln im selben Commit — ein Wächter,
     der so umgebaut wird, kann still aufhören zu wachen, ohne dass es auffällt. Rot-Beweis von
     Hand geführt (gegen den vollen Drei-Aufrufer-Stand, dieselbe Paar-Prüfung, zählerunabhängig):
     `textsatzSprachkennungAnwenden();` aus _alleModulRegisterAusDepotAnmelden() entfernt (nicht
     die Zählung — die Paar-Prüfung selbst), Lauf gezeigt „2 !== 3", Fehlertext korrekt „keine
     der beiden Regeln darf allein stehen", Aufruf wiederhergestellt, wieder grün. */
  const schreibrichtung = [...quelle.matchAll(/\n\s*textsatzSchreibrichtungAnwenden\(\);/g)].map((m) => m.index);
  const sprachkennung = [...quelle.matchAll(/\n\s*textsatzSprachkennungAnwenden\(\);/g)].map((m) => m.index);
  // 3 → 4 (21.09.2026, U2-ADR-429): textsatzSpracheWaehlen() ist der vierte, bewusst legitime Aufrufer — dieselbe Paar-
  // Prüfung unten gilt unverändert (die Wahl einer Sprache setzt Schreibrichtung UND Sprachkennung, nie eine allein).
  assert.equal(schreibrichtung.length, 4, 'vier legitime Aufrufer erwartet — depotLaden, _alleModulRegisterAusDepotAnmelden, vorDepotKonfigurationAnwenden, textsatzSpracheWaehlen; eine andere Zahl ist entweder ein verlorener oder ein neuer, ungeprüfter Aufrufer');
  assert.equal(sprachkennung.length, schreibrichtung.length, 'jede Schreibrichtungs-Stelle muss auch eine Sprachkennungs-Stelle haben — keine der beiden Regeln darf allein stehen');
  schreibrichtung.forEach((a, i) => {
    const b = sprachkennung[i];
    assert.ok(b > a && b - a < 400, `Stelle ${i}: die beiden Aufrufe stehen nicht beieinander (a=${a}, b=${b})`);
  });
});

test('[Textsatz·Nachtrag] die feste Sprachkennung ist aus dem Quelltext verschwunden', () => {
  const quelle = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  // Der Fund, den der Nachtrag benannt hat: die feste Zuweisung als ANWEISUNG.
  // Anker am Zeilenanfang, nicht am Vorkommen: der Modul-Kopf ZITIERT die alte
  // Fassung in seinem Kommentar, und ein Anker, der über die eigene
  // Dokumentation stolpert, misst die Dokumentation statt den Code.
  assert.equal(/^\s*u\.lang\s*=\s*'de-DE'\s*;/m.test(quelle), false,
    'die Vorlesestimme steht wieder fest im Quelltext');
  assert.ok(/u\.lang\s*=\s*textsatzRegeln\(\)\.sprachkennung/.test(quelle),
    'die Vorlesestimme kommt nicht aus dem Modul-Kopf');
  // Und die Stimmenwahl darf `de` nicht mehr als Literal führen.
  const stelle = quelle.indexOf('function waehleVorleseStimme');
  const rumpf = quelle.slice(stelle, quelle.indexOf('\n}', stelle));
  assert.equal(/\/\^de/.test(rumpf), false, 'die Stimmenwahl sucht weiterhin fest nach „de"');
});

/* ── Assistenten-Texte (Nachtrag 17.08.2026) ────────────────────────────── */

test('[Textsatz·Nachtrag] die vier Assistenten-Arten stehen im Satz — vier Belege, nicht 149', () => {
  const { V } = ladeKern();
  for (const art of ['frage', 'hilfetext', 'einleitung', 'toast']) {
    assert.ok(V.TEXTSATZ_ARTEN.includes(art), 'die Art „' + art + '" fehlt im Satz');
  }
  const w = V.WIZARDS.find((x) => x.id === 'gebwiz');
  assert.equal(w.einleitung, V.TEXTSATZ_DE_QUELLE.texte['wizard:gebwiz.einleitung']);
  assert.equal(w.schritte[0].frage, V.TEXTSATZ_DE_QUELLE.texte['wizard:gebwiz.geburt_klinik.frage']);
  assert.equal(w.schritte[1].hilfetext, V.TEXTSATZ_DE_QUELLE.texte['wizard:gebwiz.geburt_hebamme.hilfetext']);
  assert.equal(w.abschluss.toast, V.TEXTSATZ_DE_QUELLE.texte['wizard:gebwiz.abschluss.toast']);
});

test('[Textsatz·Nachtrag] die Kennung eines Schritts ist der Baumweg SEINES Feldes — kein zweiter Raum', () => {
  const { V } = ladeKern();
  // Frage/Hilfetext hängen unter derselben Kennung wie label/beispiel des Feldes.
  // Voraussetzung dafür, gemessen statt angenommen: die Feld-Ids sind innerhalb
  // eines Assistenten eindeutig.
  for (const w of V.WIZARDS) {
    const ids = (w.schritte || []).map((s) => s.feld && s.feld.id);
    assert.equal(new Set(ids).size, ids.length, 'doppelte Feld-Id in ' + w.id + ' — die Kennung kollidierte');
  }
  assert.ok(Object.keys(V.TEXTSATZ_DE_QUELLE.texte).includes('wizard:gebwiz.geburt_klinik.frage'));
});

test('[Textsatz·Nachtrag·Rot] ein Modul ersetzt Frage, Hilfetext, Einleitung und Zuruf — und gibt sie wieder frei', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('textsatz-nachtrag-assistenten-pw');
  const w = () => V.WIZARDS.find((x) => x.id === 'gebwiz');
  const vorher = {
    einleitung: w().einleitung, frage: w().schritte[0].frage,
    hilfetext: w().schritte[1].hilfetext, toast: w().abschluss.toast,
  };

  V.getData().textsprache = 'fr';
  V.getData().textsatzModule = [{ sprache: 'fr', moduleVersion: 1, texte: {
    'wizard:gebwiz.einleitung': 'Quelques questions autour de la naissance.',
    'wizard:gebwiz.geburt_klinik.frage': 'Dans quelle clinique votre enfant naîtra-t-il ?',
    'wizard:gebwiz.geburt_hebamme.hilfetext': 'Le nom et le téléphone suffisent.',
    'wizard:gebwiz.abschluss.toast': 'Terminé — vos indications sont enregistrées.',
  } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  V.textsatzNeuAnwenden();
  assert.equal(w().einleitung, 'Quelques questions autour de la naissance.');
  assert.equal(w().schritte[0].frage, 'Dans quelle clinique votre enfant naîtra-t-il ?');
  assert.equal(w().schritte[1].hilfetext, 'Le nom et le téléphone suffisent.');
  assert.equal(w().abschluss.toast, 'Terminé — vos indications sont enregistrées.');

  V.getData().textsprache = 'de';
  V.textsatzNeuAnwenden();
  assert.deepEqual({
    einleitung: w().einleitung, frage: w().schritte[0].frage,
    hilfetext: w().schritte[1].hilfetext, toast: w().abschluss.toast,
  }, vorher, 'der Rückweg gibt die eingebauten Texte nicht frei');
});

test('[Textsatz·Nachtrag] ein noch nicht gehobener Assistenten-Text bleibt unangetastet', () => {
  const { V } = ladeKern();
  /* Die Gegenprobe zum Heben. SIE NENNT KEIN BEISPIEL MEHR: die erste Fassung nagelte
     `gebwiz.geburt_hebamme.frage` fest, und Tranche 1 des Hebens (18.08.2026) hob genau den —
     die Probe wurde rot, obwohl ihre AUSSAGE unverändert richtig ist. Ein Beispiel, das der
     Fortschritt einholt, ist kein Anker; die Invariante ist es. */
  let inline = null;
  for (const w of V.WIZARDS) {
    for (const sch of (w.schritte || [])) {
      if (!sch || !sch.feld || !sch.feld.id) continue;
      for (const art of ['frage', 'hilfetext']) {
        const kennung = 'wizard:' + w.id + '.' + sch.feld.id + '.' + art;
        if (typeof sch[art] === 'string' && sch[art].trim() && !(kennung in V.TEXTSATZ_DE_QUELLE.texte)) {
          inline = inline || { kennung, text: sch[art] };
        }
      }
    }
  }
  assert.ok(inline, 'Vorbedingung: es gibt noch ungehobene Assistenten-Texte — sonst prüft diese '
    + 'Probe nichts mehr und gehört (mit dem Ende des Hebens) gestrichen, nicht angepasst');
  assert.ok(inline.text.length > 0, 'ein inline stehender Text ist verschwunden');
  assert.equal(V.TEXTSATZ_DE_QUELLE.texte[inline.kennung], undefined,
    'was inline steht, steht NICHT zugleich im Satz — sonst stünde derselbe Text an zwei Stellen');
});

/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-208 (02.09.2026, Auftrag 2) — die Sprachkennung ohne
   eigene Modul-Regel
   ────────────────────────────────────────────────────────────────────────
   DER FUND, live gemessen (Zwischenauftrag, echtes ausgeliefertes Englisch-
   Modul v495, echter HTTP-Server, nicht file:// — der Ladepfad für
   vorabkonfiguration.js überspringt file:// ausdrücklich): das Modul trägt
   `_regeln: {}` — leer, keine eigene `sprachkennung`. `textsatzSpracheAktiv()`
   stand dabei korrekt auf `'en'`, `textsatzRegeln().sprachkennung` (und
   damit `document.documentElement.lang`) blieb trotzdem beim eingebauten
   Rückfall `'de-DE'` stehen — der obige Test „ohne Modul der eingebaute
   Wert" (Zeile 618) deckte nur den Fall OHNE jedes Modul ab, nicht den
   Fall MIT Modul, aber OHNE dessen eigene Sprachkennung.

   Betrifft nicht nur Englisch: jedes Modul mit unvollständigen `_regeln`
   hatte denselben Rückfall — eine Vorleserin bekäme die Aussprache der
   FALSCHEN Sprache angesagt (WCAG 3.1.1), unabhängig davon, ob der
   sichtbare Text bereits korrekt umgeschaltet war. */
test('[Textsatz·U2-ADR-208] ein Modul OHNE eigene Sprachkennung bekommt die AKTIVE Sprache, nicht den deutschen Rückfall', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('u2-adr-208-fallback-pw');
  const dok = { documentElement: { _attr: {},
    setAttribute(k, w) { this._attr[k] = w; }, getAttribute(k) { return this._attr[k]; } } };

  // Genau die reale Form (dekodiertes Overlay v495 gemessen): sprache gesetzt, KEIN regeln-Feld.
  V.getData().textsprache = 'en';
  V.getData().textsatzModule = [{ sprache: 'en', moduleVersion: 1, texte: {} }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);

  assert.equal(V.textsatzRegeln().sprachkennung, 'en',
    'ein Modul ohne eigene Sprachkennung fällt auf die aktive Sprache zurück, nicht auf Deutsch');
  assert.equal(V.textsatzSprachkennungAnwenden(dok), 'en');
  assert.equal(dok.documentElement.getAttribute('lang'), 'en');

  V.getData().textsprache = 'de';
  assert.equal(V.textsatzSprachkennungAnwenden(dok), 'de-DE', 'der Rückweg gilt auch hier');
});

test('[Textsatz·U2-ADR-208] eine eigene Modul-Sprachkennung überschreibt weiterhin den neuen Rückfall', () => {
  // Gegenprobe zum Fallback oben: ein Modul, das SELBST eine Sprachkennung nennt, muss die
  // weiterhin gewinnen — der neue bare-Sprache-Rückfall darf nur greifen, wo nichts Genaueres da ist.
  const { V } = ladeKern();
  assert.equal(V.textsatzModulEinbetten([], { sprache: 'ar', rechtsraum: '', moduleVersion: 1,
    texte: {}, regeln: { sprachkennung: 'ar-EG' } }).length, 1);
});

test('[Textsatz·U2-ADR-208·Rot] ohne den Fallback bleibt die Sprachkennung am deutschen Wert hängen', async () => {
  const os = require('node:os');
  const HTML_ADR208 = path.join(REPO, 'vivodepot.html');
  const original = fs.readFileSync(HTML_ADR208, 'utf8');
  // U2-ADR-278 (05.09.2026): der Anker war die alte Zweizeiler-Form, unbedingt VOR jeder
  // `modul`-Prüfung — seit U2-ADR-278 steht die Zuweisung in einem `if (modul) {...}`-Block
  // (s. dortiger ADR-Text, „Einschränkung von U2-ADR-208"). Verkürzt auf die EINE Zeile, mit
  // ihrer echten Einrückung (vier Leerzeichen) als Teil des Ankers — die bloße Zeile ohne
  // Einrückung ist NICHT eindeutig: dieselbe Zeichenkette steht wörtlich, in Backticks, in
  // einem Kommentar direkt darüber (Zeile 9977, erklärt genau diese Einschränkung). Gegengeprüft:
  // `grep -c '    raus.sprachkennung = sprache;' vivodepot.html` → genau 1 Treffer. Diese Form
  // übersteht auch den nächsten Umbau der Nachbarzeile (`modul._regeln`).
  const anker = '    raus.sprachkennung = sprache;';
  assert.ok(original.includes(anker), 'Anker nicht gefunden — Quelle seither umgebaut?');
  assert.equal(original.split(anker).length - 1, 1, 'Anker ist NICHT eindeutig — die Probe spleißt sonst an der falschen Stelle');
  const tmp = path.join(os.tmpdir(), 'u2-adr-208-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, ''));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern();
    await V.depotAnlegen('u2-adr-208-rot-pw');
    V.getData().textsprache = 'en';
    V.getData().textsatzModule = [{ sprache: 'en', moduleVersion: 1, texte: {} }];
    assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
    assert.equal(V.textsatzRegeln().sprachkennung, 'de-DE',
      'genau der Fund von heute — ohne den Fallback bleibt es beim eingebauten Wert, obwohl Englisch aktiv ist');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.equal(fs.readFileSync(HTML_ADR208, 'utf8'), original, 'die Probe darf den echten Kern nicht verändern');
});
