'use strict';
/* U2-ADR-333 — die Wortlaute der Dokument-Module werden ueberschreibbar
   ---------------------------------------------------------------------------
   DER GEGENSTAND: 121 Wortlaute in den vier Dokument-Modulen und den zwei
   Schritt-Katalogen standen ausserhalb JEDES Textsatz-Laufs. Kein Sprachmodul
   erreichte sie — auch nicht in Dokumenten, die eine Buergerin einer Behoerde
   vorlegt.

   DIE GRENZE, damit sie nicht fuer mehr gehalten wird: dieser Zug macht die
   Wortlaute UEBERSCHREIBBAR. Er holt sie nicht aus dem Kern. Das ist etwas
   anderes als U2-ADR-320, wo der Bereichsbestand die Datei wirklich verlassen
   hat.

   WAS DIESE PROBEN FANDEN, BEVOR EIN MENSCH ES SAH — beide Fehler lagen im
   Bau selbst und waren am Code nicht zu sehen:

     1. Der Rueckweg nahm den inline stehenden `satz` weg (seine Kennung stand
        im Satz), der Fuellweg setzte ihn nicht neu (ihm fehlte die Art).
        Ergebnis: `satz === undefined`, mitten in einem Betreuungsverfuegungs-
        Dokument. Ein Text, der verschwindet, weil zwei Wege verschiedene
        Vokabulare haben — und keiner der beiden Wege ist fuer sich falsch.
     2. Das Vokabular kannte nur den halben Knoten: die neun neuen Arten, aber
        nicht `titel`/`einleitung`/`label`. Der Abschnitts-Titel wurde nicht
        uebersetzt, obwohl seine Kennung im Satz stand. Die Luecke sieht aus
        wie ein fehlender Satz-Eintrag und ist ein fehlendes Vokabular — man
        sucht an der falschen Stelle.

   WER EINE VORKEHRUNG HALB KOPIERT, BAUT DIE LUECKE EIN, GEGEN DIE SIE GEBAUT
   WAR. Der Kern trug die Antwort auf Fehler 1 bereits: `_textsatzTunAssistent`
   bildet BEIDE Richtungen ab, mit dem Kommentar "damit kein Aufrufer die Grenze
   umgeht". */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { fingerabdruck, vergleiche } = require('../tools/dokumentmodul-folge-fingerabdruck.js');

const MODULE = ['PV_MODUL', 'VOLLMACHT_MODUL', 'KI_MODUL', 'BETREUUNG_MODUL'];
const RAEUME = /^(dok:|pvBmj|kiKorpus|vollmachtBmj)/;

/* Ein Sprachmodul, das genau die uebergebenen Kennungen ersetzt. `sprache: 'zz'`
   ist reserviert-frei und nicht der eingebaute Code. */
const satzMit = (texte) => ({
  modulTyp: 'textsatz', sprache: 'zz', moduleVersion: 1, anbieterId: 'pruefstoff', texte,
});

function mitSprache(V, texte) {
  const d = V.leeresDepot();
  d.textsatzModule = [satzMit(texte)];
  d.textsprache = 'zz';
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  return d;
}

function zurueckAufDeutsch(V, d) {
  d.textsprache = 'de';
  V.setData(d);
  V.textsatzNeuAnwenden();
}

/* --- 1. DIE AUSBEUTE ZUERST -----------------------------------------------
   Eine Probe, die nichts findet, ist nicht von einer zu unterscheiden, die
   nichts zu finden hat. Die Untergrenzen liegen unter den heutigen Werten: sie
   fangen den Ausfall des Gangs, nicht das Wachsen des Bestandes. */
test('[ADR-333·Ausbeute] der Gang erreicht die Dokument-Module ueberhaupt', () => {
  const { V } = ladeKern();
  const kennungen = [];
  V._textsatzOrteBegehen((knoten, kennung) => {
    if (typeof kennung === 'string' && RAEUME.test(kennung)) kennungen.push(kennung);
  });
  assert.ok(kennungen.length >= 100,
    'zu wenige Knoten in den Dokument-Raeumen erreicht: ' + kennungen.length);
  const imSatz = Object.keys(V.TEXTSATZ_DE_QUELLE.texte).filter((k) => RAEUME.test(k));
  assert.ok(imSatz.length >= 110,
    'zu wenige Kennungen im Satz: ' + imSatz.length + ' — der Satz ist eingebrochen');
  assert.deepEqual(V.TEXTSATZ_FEHLSTELLEN, [], 'keine Fehlstelle durch den neuen Lauf');
});

/* --- 2. DIE PROBE, DIE ZAEHLT: EIN SPRACHMODUL AENDERT DEN WORTLAUT -------- */
test('[ADR-333] ein Sprachmodul aendert einen Dokument-Wortlaut — ohne eine Zeile im Kern', () => {
  const { V } = ladeKern();
  const m = V.BETREUUNG_MODUL;
  const vorherTitel = m.abschnitte[1].titel;
  const vorherSatz = m.abschnitte[1].bloecke[0].satz;
  assert.ok(vorherTitel && vorherSatz, 'Ausgangsstand ist besetzt');

  const d = mitSprache(V, {
    'dok:betreuungsverfuegung#1.titel': 'ZZ-Titel',
    'dok:betreuungsverfuegung#1/proposedPerson.satz': 'ZZ-Satz {namen}.',
  });
  assert.equal(m.abschnitte[1].titel, 'ZZ-Titel', 'der Titel folgt dem Modul');
  assert.equal(m.abschnitte[1].bloecke[0].satz, 'ZZ-Satz {namen}.', 'der Satz folgt dem Modul');

  /* DER RUECKWEG GEHOERT DAZU. Ohne ihn beweist die Probe nur, dass etwas
     ueberschrieben wurde — nicht, dass es wieder freigegeben wird. Genau daran
     ist ein frueherer Bau gescheitert (der Kommentar an `_TEXTSATZ_ZURUECK`
     sagt es: die Probe "zurueck auf Deutsch" blieb franzoesisch stehen). */
  zurueckAufDeutsch(V, d);
  assert.equal(m.abschnitte[1].titel, vorherTitel, 'zurueck auf Deutsch: der Titel steht wieder');
  assert.equal(m.abschnitte[1].bloecke[0].satz, vorherSatz, 'und der Satz auch, bitgleich');
});

/* --- 3. ROT-BEWEIS AN EINEM ARRAY, NICHT AM ERSTEN ELEMENT -----------------
   `texte` ist die einzige Array-Art. Der Fueller setzt sonst nur Skalare; ohne
   indizierte Kennung waere `texte[1]` unerreichbar, waehrend `texte[0]`
   erreichbar AUSSAEHE — die Luecke faellt dann nur auf, wenn jemand zufaellig
   das zweite Element prueft. */
test('[ADR-333·rot] ein Array-Element wechselt, und zwar NICHT das erste', () => {
  const { V } = ladeKern();
  const block = V.PV_MODUL.abschnitte[10].bloecke[1];
  assert.ok(Array.isArray(block.texte) && block.texte.length >= 4,
    'der Anker traegt mindestens vier Saetze — sonst prueft die Probe nichts');
  const vorher = block.texte.slice();

  const d = mitSprache(V, {
    'dok:patientenverfuegung#10/1.texte[2]': 'ZZ-DRITTER-SATZ',
  });
  assert.equal(block.texte[2], 'ZZ-DRITTER-SATZ', 'das dritte Element folgt dem Modul');
  // U2-ADR-363 (Zug 2, 07.09.2026): 'zz' ist eine reine Testsprache ohne Ab-Werk-Modul — was
  // sie nicht trägt, zeigt seit dem entfernten AB_WERK_TEXTSATZ_DE-Rückfall die eigene Kennung,
  // nicht mehr den unberührten deutschen Text. "Unberührt" bleibt trotzdem WAHR im Sinn, den
  // dieser Test prüfen soll: die drei anderen Indizes folgen NICHT dem geänderten Index 2.
  // Rückfall-Reihenfolge (19.09.2026): was 'zz' nicht trägt, kommt aus dem Rückfall (Englisch, sonst Deutsch) — nie aus dem geänderten Index 2.
  assert.equal(block.texte[0], vorher[0], 'das erste bleibt unberuehrt (Rückfalltext, nicht das dritte Element)');
  assert.equal(block.texte[1], vorher[1], 'das zweite ebenso');
  assert.equal(block.texte[3], vorher[3], 'und das vierte auch');

  zurueckAufDeutsch(V, d);
  assert.deepEqual(block.texte, vorher, 'zurueck auf Deutsch: alle vier stehen wieder');
});

/* --- 4. DER SONDERFALL abschnitte[0] --------------------------------------
   Er traegt NUR `eingangsformel`, keinen `titel` und keine `bloecke`. Ein
   Laeufer, der stur `a.titel` und `a.bloecke` liest, uebergeht ihn
   stillschweigend — und niemand merkt es, weil nichts fehlt, was jemand
   suchte. */
test('[ADR-333] der erste Abschnitt ohne Titel und Bloecke wird nicht uebergangen', () => {
  const { V } = ladeKern();
  for (const name of MODULE) {
    const a0 = V[name].abschnitte[0];
    assert.ok(a0 && !a0.titel && !a0.bloecke,
      name + ': abschnitte[0] ist weiterhin der Sonderfall (nur eingangsformel) — '
      + 'aendert sich das, gilt diese Probe einem anderen Gegenstand');
  }
  /* Der Beleg, dass der Gang ihn besucht: seine Kennung taucht auf. */
  const besucht = new Set();
  V._textsatzOrteBegehen((k, kennung) => { if (typeof kennung === 'string') besucht.add(kennung); });
  for (const name of MODULE) {
    const id = V[name].id;
    assert.ok(besucht.has('dok:' + id + '#0'),
      'der Gang besucht abschnitte[0] von ' + id + ' — sonst faellt er still heraus');
  }
});

/* --- 5. DAS VOKABULAR BERUEHRT KEINEN BESTEHENDEN KNOTEN ------------------
   Gemessen vor dem Bau: von den Knoten, die der Gang schon vorher begangen hat,
   traegt keiner eine der neuen Arten. Als Messung galt das an einem Tag; als
   Probe gilt es morgen. */
test('[ADR-333] die neuen Arten treffen keinen Knoten der bestehenden Orte', () => {
  const { V } = ladeKern();
  const NEU = ['prefix', 'satz', 'text', 'sektion', 'besprochenEinleitung',
    'rollenLabel', 'abschluss', 'wortlaut', 'feldname', 'texte'];
  const treffer = [];
  const objektArten = [];
  V._textsatzOrteBegehen((knoten, kennung) => {
    if (typeof kennung !== 'string' || RAEUME.test(kennung)) return;   // nur die ALTEN Orte
    for (const a of NEU) {
      const v = knoten && knoten[a];
      if (v === undefined) continue;
      /* NUR ein nicht-leerer STRING (oder ein String-Array) kann von einem Fueller
         ueberhaupt beruehrt werden — er setzt Text, sonst nichts. Ein Objekt unter
         demselben Namen ist ein eigener Knoten mit eigener Kennung: `wizard.abschluss`
         ist der Abschluss-Zuruf, den `_textsatzAufWizardsAnwenden` als KNOTEN begeht,
         nicht als Text. Es mitzuzaehlen machte die Probe rot, ohne dass irgendetwas
         anders liefe — und eine Probe, die aus dem falschen Grund rot ist, wird
         entschaerft statt beachtet. */
      if (typeof v === 'string' && v.trim() !== '') { treffer.push(kennung + '.' + a); continue; }
      if (Array.isArray(v) && v.some((x) => typeof x === 'string' && x.trim() !== '')) {
        treffer.push(kennung + '.' + a); continue;
      }
      if (v && typeof v === 'object') objektArten.push(kennung + '.' + a);
    }
  });
  assert.deepEqual(treffer, [],
    'ein bestehender Knoten traegt eine der neuen Arten ALS TEXT — dann aendert das '
    + 'erweiterte Vokabular sein Verhalten, und das war beim Bau ausdruecklich ausgeschlossen');

  /* Die Gegenkontrolle: dass ueberhaupt Knoten mit diesen NAMEN existieren. Ohne sie
     bestuende die Probe auch dann, wenn der Gang gar nichts mehr besuchte. */
  assert.ok(objektArten.length >= 7,
    'erwartet: die sieben Assistenten mit ihrem `abschluss`-Knoten. Gefunden: '
    + objektArten.length + ' — findet die Probe sie nicht mehr, prueft sie ins Leere');
});

/* --- 6. KEINE SIGNATUR IST UEBER DEN TEXTSATZ ERREICHBAR ------------------
   Ein Filter ueber die FORM einer Zeichenkette faengt Signaturen: ein JWS
   traegt Punkte und sieht fuer einen Satzzeichen-Filter wie ein Satz aus. Weil
   dieses Vokabular ART-basiert ist, faellt sie strukturell heraus, statt
   ausgenommen werden zu muessen. "0 Treffer" ist eine Messung, "kann nicht"
   waere ein Argument. */
test('[ADR-333] keine signaturtragende Eigenschaft ist ueber den Satz erreichbar', () => {
  const { V } = ladeKern();
  const imSatz = Object.keys(V.TEXTSATZ_DE_QUELLE.texte);
  assert.deepEqual(imSatz.filter((k) => /templateJws|\.jws$|signatur/i.test(k)), [],
    'eine signaturtragende Kennung steht im Satz — ein praepariertes Modul koennte '
    + 'einer Vorlage eine andere unterschieben');

  /* Und die Gegenprobe am Bestand: die Vorlagen tragen ihre Signatur weiterhin,
     sie ist nur nicht erreichbar. Ohne diese Haelfte pruefte die Probe auch dann
     gruen, wenn es gar keine Signaturen mehr gaebe. */
  const mitJws = (V.STANDARD_VORLAGEN || []).filter((v) => v && typeof v.templateJws === 'string');
  assert.ok(mitJws.length >= 1,
    'die Vorlagen tragen weiterhin Signaturen — sonst prueft die Haelfte darueber nichts');
});

/* --- 7. DIE FOLGE IST EINGEFROREN, NICHT IHRE LAENGE ----------------------
   Die Kennungen tragen einen Index, weil null von 35 Abschnitten und null von
   75 Bloecken eine `id` haben. Eine Zaehlung faenge ein Einfuegen — aber ein
   TAUSCH laesst die Zahl unveraendert, und ein Tausch ist der Fall, der still
   den falschen Text an die falsche Stelle liefert. */
const FOLGE_EINGEFROREN = {
  PV_MODUL: 12, VOLLMACHT_MODUL: 11, KI_MODUL: 7, BETREUUNG_MODUL: 5,
};

test('[ADR-333] die Folge der Abschnitte und Bloecke ist unveraendert', () => {
  const { V } = ladeKern();
  for (const name of MODULE) {
    const abdruck = fingerabdruck(V[name]);
    assert.ok(abdruck.length > 0, name + ': der Fingerabdruck ist leer — der Anker zeigt ins Leere');
    assert.equal(abdruck.split('|').length, FOLGE_EINGEFROREN[name],
      name + ': die Zahl der Abschnitte hat sich geaendert. Eingefuegtes braucht nachgezogene '
      + 'Kennungen; Entferntes laesst tote Kennungen zurueck.');
  }
});

test('[ADR-333·rot] ein TAUSCH faellt auf, obwohl die Zahl gleich bleibt', () => {
  const { V } = ladeKern();
  const echt = V.BETREUUNG_MODUL;
  const getauscht = {
    id: echt.id,
    abschnitte: echt.abschnitte.slice(),
  };
  const [a, b] = [getauscht.abschnitte[1], getauscht.abschnitte[2]];
  getauscht.abschnitte[1] = b;
  getauscht.abschnitte[2] = a;

  assert.equal(getauscht.abschnitte.length, echt.abschnitte.length,
    'die ZAHL ist gleich — genau darum faengt eine Zaehlung diesen Fall nicht');

  const befund = vergleiche(echt, getauscht);
  assert.equal(befund.gleich, false, 'der Fingerabdruck sieht den Tausch');
  assert.equal(befund.art, 'getauscht', 'und benennt ihn als Tausch, nicht als Aenderung');
  assert.match(befund.meldung, /REIHENFOLGE GETAUSCHT ab Position 1/,
    'die Meldung sagt, WO — wer sie liest, muss die Stelle finden koennen');
  assert.match(befund.meldung, /bricht bestehende Uebersetzungen/,
    'und sagt, was es kostet: das unterscheidet den Tausch vom harmlosen Einfuegen');
});

test('[ADR-333] ein EINGEFUEGTER Abschnitt wird anders gemeldet als ein Tausch', () => {
  const { V } = ladeKern();
  const echt = V.BETREUUNG_MODUL;
  const erweitert = { id: echt.id, abschnitte: echt.abschnitte.concat([{ titel: 'Ein neuer Abschnitt', bloecke: [] }]) };
  const befund = vergleiche(echt, erweitert);
  assert.equal(befund.art, 'eingefuegt',
    'ein Einfuegen ist harmlos und braucht nur nachgezogene Kennungen — es darf nicht '
    + 'wie ein Tausch aussehen, sonst sucht der Leser am falschen Ende');
  assert.match(befund.meldung, /NEU: Ein neuer Abschnitt/, 'und die Meldung nennt, was dazukam');
});

/* --- 8. WAS NICHT UEBERSETZT IST, STEHT DA UND SAGT ES --------------------
   Produktentscheidung (06.09.2026): der deutsche Wortlaut steht da, und
   daneben steht, dass er deutsch ist und warum. Keine leere Stelle in einer
   Vorsorgevollmacht — dieselbe Antwort wie U2-ADR-263 fuer nicht darstellbare
   Zeichen ("ein stiller Ersatz ist in keinem Fall zulaessig").

   DIE ZAHL WIRD GEMESSEN, NICHT GEFUEHRT. Eine gefuehrte Zahl driftet, sobald
   jemand eine Passage uebersetzt; diese hier faellt von selbst. Genau das
   pruefen die zwei Proben unten — die zweite ist die, die zaehlt: sie
   uebersetzt zwei Stellen und verlangt, dass die Zahl um zwei sinkt. */
const HINWEIS_EN = 'This document is not yet fully available in English (legal review pending). '
  + '{anzahl} passages are shown in their German wording.';

test('[ADR-333] ohne fremde Sprache gibt es nichts zu melden', () => {
  const { V } = ladeKern();
  assert.equal(V._dokumentUnuebersetzteStellen(V.BETREUUNG_MODUL), 0,
    'auf Deutsch ist nichts unuebersetzt — ein Hinweis waere hier sinnlos und stuende trotzdem da');
});

test('[ADR-333] die Zahl der unuebersetzten Stellen faellt, wenn jemand uebersetzt', () => {
  const { V } = ladeKern();
  const ohne = mitSprache(V, { 'dokument.uebersetzungOffen': HINWEIS_EN });
  const vorher = V._dokumentUnuebersetzteStellen(V.BETREUUNG_MODUL);
  assert.ok(vorher >= 5,
    'die Betreuungsverfuegung traegt mindestens fuenf unuebersetzte Stellen: ' + vorher);

  mitSprache(V, {
    'dokument.uebersetzungOffen': HINWEIS_EN,
    'dok:betreuungsverfuegung#1.titel': 'ZZ-Titel',
    'dok:betreuungsverfuegung#1/proposedPerson.satz': 'ZZ-Satz {namen}.',
  });
  const nachher = V._dokumentUnuebersetzteStellen(V.BETREUUNG_MODUL);
  assert.equal(vorher - nachher, 2,
    'zwei uebersetzte Passagen muessen die Zahl um genau zwei senken — sonst zaehlt sie eine '
    + 'Liste statt der Wirklichkeit, und die Bauform traegt nicht');
  zurueckAufDeutsch(V, ohne);
});

test('[ADR-333] der Hinweis steht im Dokument, mit der gemessenen Zahl', () => {
  const { V } = ladeKern();
  const d = mitSprache(V, { 'dokument.uebersetzungOffen': HINWEIS_EN });
  const offen = V._dokumentUnuebersetzteStellen(V.BETREUUNG_MODUL);
  const ab = V.modulDokumentAbschnitte(V.BETREUUNG_MODUL, null);
  const kopf = ab[0];
  assert.ok(kopf && Array.isArray(kopf.zeilen) && kopf.zeilen.length,
    'das Dokument hat einen Kopf-Abschnitt');
  assert.match(kopf.zeilen[0], /not yet fully available in English/,
    'der Hinweis steht VOR dem amtlichen Dokumentkopf — er betrifft das ganze Dokument');
  assert.match(kopf.zeilen[0], new RegExp(String(offen) + ' passages'),
    'und traegt die GEMESSENE Zahl, nicht eine gefuehrte');
  assert.doesNotMatch(kopf.zeilen[0], /\{anzahl\}/, 'der Platzhalter ist ersetzt');

  /* Die Gegenkontrolle: auf Deutsch erscheint er NICHT. Ohne sie bestuende die
     Probe auch dann, wenn der Hinweis immer im Dokument staende. */
  zurueckAufDeutsch(V, d);
  const abDe = V.modulDokumentAbschnitte(V.BETREUUNG_MODUL, null);
  assert.doesNotMatch(abDe[0].zeilen[0], /not yet fully available/,
    'auf Deutsch gehoert kein Hinweis ins Dokument');
});

/* --- 9. UEBERNOMMEN AUS DER GERETTETEN ARBEIT EINER AUSGEFALLENEN SITZUNG ---
   Zwei Proben stammen nicht aus diesem Zug, sondern aus dem geretteten Stand
   einer Sitzung, die heute frueh ausgefallen ist (als
   Patch gerettet). Sie schliessen zwei echte Luecken in den Proben
   oben — beide sind Gegenkontrollen, also genau die Haelfte, die man vergisst.

   Sie sind hier NICHT nachgebaut, sondern uebernommen und auf die Bauform
   dieses Zuges gezogen. Der Gedanke gehoert der anderen Sitzung. */

test('[ADR-333] die vier Dokument-Module teilen einen Kontrakt — ein Anwender genuegt', () => {
  /* Gemessen habe ich das vor dem Bau (alle 8/8), aber nur GEMESSEN — eine
     Messung gilt heute, eine Probe morgen. `PV_MODUL` traegt eine Eigenschaft
     mehr (`bezugFuer`); das ist kein Vertragsbruch, sondern ein Modul mit einer
     zusaetzlichen Faehigkeit. Geprueft wird darum, was der EINE Anwender wirklich
     braucht — faellt davon etwas weg, liefe er still ins Leere. */
  const { V } = ladeKern();
  const KONTRAKT = ['id', 'abschnitte', 'datenLesen', 'optLabel', 'rolleLabel', 'eingangsformel'];
  for (const n of MODULE) {
    const hat = Object.keys(V[n]);
    const fehlt = KONTRAKT.filter((k) => !hat.includes(k));
    assert.deepEqual(fehlt, [], n + ' erfuellt den gemeinsamen Kontrakt nicht — es fehlt: ' + fehlt.join(', '));
    assert.ok(Array.isArray(V[n].abschnitte) && V[n].abschnitte.length > 0,
      n + ' traegt keine Abschnitte — der Anwender liefe ins Leere');
  }
});

test('[ADR-333·Positivkontrolle] die Signatur-Probe erkennt eine echte JWS', () => {
  /* DIE LUECKE, DIE SIE SCHLIESST: die Signatur-Probe oben meldet "0 Treffer".
     Sie waere auch dann gruen, wenn ihr Muster nie zutraefe — dann prueft sie
     nichts als ihre eigene Strenge. Erst diese Haelfte macht aus der Null einen
     Befund. Dieselbe Klasse wie ein Anker, der ins Leere zeigt. */
  const { V } = ladeKern();
  const JWS = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;
  const echte = (V.STANDARD_VORLAGEN || [])
    .map((v) => v && v.templateJws).filter((x) => typeof x === 'string');
  assert.ok(echte.length > 0,
    'keine Vorlage traegt eine Signatur — dann misst die Signatur-Probe oben nichts');
  for (const j of echte) {
    assert.ok(JWS.test(j), 'das Muster erkennt die echte Signatur nicht: ' + String(j).slice(0, 40));
  }
  /* Und die Gegenrichtung auf die Bauform dieses Zuges gezogen: `templateJws`
     darf in keinem der Alphabete stehen, mit denen ein Fueller arbeitet. */
  const alphabete = [].concat(V.TEXTSATZ_ARTEN, ['prefix', 'satz', 'text', 'sektion',
    'besprochenEinleitung', 'rollenLabel', 'abschluss', 'wortlaut', 'feldname', 'texte']);
  assert.equal(alphabete.includes('templateJws'), false,
    'templateJws steht in einem Fueller-Alphabet — ein Modul duerfte die Signatur austauschen');
});
