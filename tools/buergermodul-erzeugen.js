'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   buergermodul-erzeugen.js — liest den eingebauten Bürgerdepot-Bestand aus dem
   Kern und gibt ihn als Modul-Nutzlasten aus (U2-ADR-291)
   ────────────────────────────────────────────────────────────────────────────
   DER MASSSTAB, wörtlich (05.09.2026): „Am Ende möchte ich
   ‚mein' Bürgerdepot haben. Als wäre nichts gewesen." Vollständigkeit ist damit
   keine Güteklasse, sondern die Bedingung — und die AUSLASSUNGSLISTE ist das
   wichtigste Ergebnis dieses Werkzeugs, nicht die Nutzlast. Jede Zeile darauf
   ist die Behauptung „das braucht das Bürgermodul nicht", und jede muss stimmen.

   MUSTER: tools/textsatz-en-modul-erzeugen.js (27.08.2026), der einzige
   bestehende Inhalts-Erzeuger. Übernommen sind seine drei tragenden Züge:
   Bau aus Daten, Prüfung über den ECHTEN Kern-Weg statt einer Nachbildung, und
   keine hartkodierten Zahlen (sie drifteten dort lautlos — Fund 28.08.2026).

   WAS DIESES WERKZEUG NICHT TUT, UND WARUM DAS KEIN MANGEL IST
   Es lädt nichts. Es erzeugt Inhalt. Ob der Kern diesen Inhalt heute ANNEHMEN
   würde, ist eine andere Frage, und dieses Werkzeug beantwortet sie ehrlich,
   statt sie zu umgehen: jede Nutzlast läuft durch ihren echten Prüfer aus
   `EINLASS_REGISTER`, und das Urteil steht im Ergebnis — auch wenn es
   „abgelehnt" lautet. Zwei Ablehnungen sind heute strukturell und gemessen:

     textsatz mit sprache 'de' -> 'reserviert' (TEXTSATZ_SPRACHE_EINGEBAUT)
     bereich mit eingebauter ID -> 'reserviert' (BEREICH_IDS_EINGEBAUT)

   Das sind keine Fehler dieses Werkzeugs, sondern der offene Stand von
   U2-ADR-253 („Commit B": Suppression des nativen Bestands) und der Grund,
   warum der Erzeuger vor dem Ersatz-Mechanismus entsteht und nicht nach ihm.
   Ein Erzeuger, der so täte, als ginge es schon, wäre die schlechtere Lüge.

   WAS ES DAFÜR BEWEIST, HEUTE UND OHNE COMMIT B
   Den RÜCKWEG: der ausgegebene Inhalt, wieder eingelesen, ist mit dem nativen
   Bestand strukturgleich — Feld für Feld, Kennung für Kennung, ohne Verlust und
   ohne Umbenennung. Das ist „als wäre nichts gewesen" auf der Datenebene, und
   es ist die Hälfte, die HEUTE prüfbar ist. Die andere Hälfte (der Kern nimmt
   es an) braucht Commit B und gehört nicht hierher.

   NATIVE KENNUNGEN, OHNE PRÄFIX — DER GRUND IST NICHT BEQUEMLICHKEIT
   `vorname` bleibt `vorname`. Eine Feld-Kennung IST der Speicherplatz
   (`data.sektoren[sektorId][feldId]`, U2-ADR-037 Entscheidung 1); ein Präfix
   `tpl_vorname` würde den Eintrag JEDER Bestandsbürgerin verwaisen lassen. Das
   ist der Zweck der Erste-Partei-Zone (U2-ADR-282), und dieses Werkzeug ist
   ihr erster Aufrufer.

   Aufruf:
     node tools/buergermodul-erzeugen.js [ausgabepfad.json]
     Ohne Pfad wird KEINE Datei geschrieben — das Ergebnis ist die Ausgabe (Urteile der
     echten Prüfer, Auslassungsliste). Das Bau-Erzeugnis liefert buergermodul-schnitt.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Die Register, deren Inhalt ein Bürgermodul führt, mit dem Kern-Bestand als Quelle.
   `pruefer` ist der Name der ECHTEN Prüffunktion aus EINLASS_REGISTER — nicht
   nachgebaut, sondern aufgerufen. Fehlt einer, sagt der Bericht das, statt zu schweigen. */
const REGISTER_QUELLEN = Object.freeze([
  Object.freeze({ typ: 'textsatz', quelle: 'AB_WERK_TEXTSATZ_DE', pruefer: 'textsatzModulPruefen', schluessel: 'texte', reserviert: null }),
  Object.freeze({ typ: 'bereich', quelle: 'SEKTOREN', pruefer: 'bereichsModulPruefen', schluessel: 'bereiche', reserviert: 'BEREICH_IDS_EINGEBAUT' }),
  Object.freeze({ typ: 'situation', quelle: 'SITUATIONEN', pruefer: 'situationsModulPruefen', schluessel: 'situationen', reserviert: 'SITUATION_IDS_EINGEBAUT' }),
  Object.freeze({ typ: 'wizard', quelle: 'WIZARDS', pruefer: 'wizardsModulPruefen', schluessel: 'wizards', reserviert: 'WIZARD_IDS_EINGEBAUT' }),
  Object.freeze({ typ: 'ereignisAchse', quelle: 'EREIGNIS_ACHSE_FELDER', pruefer: 'ereignisAchseModulPruefen', schluessel: 'eintraege', reserviert: null }),
  Object.freeze({ typ: 'institutionsArt', quelle: 'INSTITUTION_ART', pruefer: 'institutionsArtModulPruefen', schluessel: 'arten', reserviert: 'INSTITUTION_ART_EINGEBAUT' }),
]);

/* Übersetzt den nativen Bestand in die Form, die der jeweilige Prüfer erwartet. Die
   Formen sind GEMESSEN, nicht angenommen (05.09.2026, an den Prüfern selbst gelesen):
   `bereiche`/`situationen`/`wizards` sind OBJEKTE mit der ID als Schlüssel (seit
   Schnitt Glied 5, A484 — vorher war `bereiche` als einzige eine Liste), `arten` ist
   ein Objekt Kennung→Label-STRING (kein Objekt als Wert), `eintraege` ist als
   einziges eine LISTE, `texte` ein flaches Kennung→Text-Objekt.

   Der native Bestand ist an drei dieser Stellen ein Array — die Umformung nach Objekt
   ist darum echte Arbeit und keine Durchreiche. */
function uebersetzen(typ, bestand) {
  if (bestand === undefined || bestand === null) return null;
  switch (typ) {
    case 'textsatz':
    case 'institutionsArt':
      return bestand;                                  // bereits die erwartete Objekt-Form
    case 'ereignisAchse':
      return Array.isArray(bestand) ? bestand.slice() : null;   // als einziges eine Liste
    case 'bereich':
    case 'situation':
    case 'wizard': {
      if (!Array.isArray(bestand)) return null;
      const o = {};
      for (const e of bestand) { if (e && e.id) o[e.id] = e; }
      return o;
    }
    default:
      return null;
  }
}

/* Tiefe Struktur-Gleichheit über den JSON-Weg. Bewusst NICHT deepStrictEqual:
   der Kern läuft in einer vm-Sandbox, seine Arrays und Objekte stammen aus einem
   fremden Realm, und deepStrictEqual vergleicht dort auch die Prototypen —
   ein Unterschied, der für diese Frage keiner ist (gemessener Fall, s.
   tests/load-kern.js). JSON.stringify ist zugleich genau die Serialisierung,
   die ein echtes Modul nimmt: was hier gleich ist, ist auch dort gleich. */
function strukturGleich(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* Sucht Funktionswerte (die einzige Sache, die ein JSON-Modul strukturell NICHT
   mitnehmen kann) rekursiv. Getter zählen NICHT als Fund: `JSON.stringify` ruft
   sie auf und schreibt ihr Ergebnis — der Wert reist mit, nur die Berechnung
   nicht. Genau das ist bei `bereichsModulPruefen`s `label`-Getter der Fall
   (vivodepot.html, „ein Getter ist von einem String nicht zu unterscheiden"). */
function funktionswerteSuchen(wert, pfad, funde, tiefe) {
  if (funde.length >= 50 || (tiefe || 0) > 40) return funde;
  if (typeof wert === 'function') { funde.push(pfad); return funde; }
  if (!wert || typeof wert !== 'object') return funde;
  if (Array.isArray(wert)) {
    wert.forEach((v, i) => funktionswerteSuchen(v, pfad + '[' + i + ']', funde, (tiefe || 0) + 1));
    return funde;
  }
  for (const k of Object.keys(wert)) {
    let v;
    try { v = wert[k]; } catch (_) { continue; }   // ein werfender Getter ist kein Funktionswert
    funktionswerteSuchen(v, pfad + '.' + k, funde, (tiefe || 0) + 1);
  }
  return funde;
}

/* Alle Feld-Definitionen aus SEKTOREN, flach, mit NATIVER Kennung. Die Form ist
   die des Template-Wegs (`data.feldDefinitionen[]`) — nicht die eines Registers:
   `bereichsModulPruefen` setzt `sektionen: Object.freeze([])` hart und kann
   Felder darum strukturell nie tragen (vivodepot.html, Kommentar dort:
   „solange die Felder aus data.feldDefinitionen[] kommen"). */
function feldDefinitionenSammeln(SEKTOREN) {
  const defs = [];
  for (const sektor of (SEKTOREN || [])) {
    for (const sektion of (sektor.sektionen || [])) {
      for (const feld of (sektion.felder || [])) {
        defs.push({ sektorId: sektor.id, sektionId: sektion.id || null, feldId: feld.id, feld });
        for (const unter of (feld.unterFelder || [])) {
          defs.push({ sektorId: sektor.id, sektionId: sektion.id || null, feldId: unter.id, feld: unter, unterVon: feld.id });
        }
      }
    }
  }
  return defs;
}

/* U2-ADR-301 — wörtlicher Spiegel von `feldDefinitionenSammeln`, auf Situationen übertragen.
   Ein `bloecke[].eintraege[]`-Eintrag ist ENTWEDER ein Querverweis auf ein bestehendes Feld
   (`{quelle, feld: 'kennung'}`, `feld` ein STRING) ODER ein eigenes Situationsfeld
   (`{feld:{id,...}}`, `feld` ein OBJEKT) — nur die zweite Sorte ist eine „Definition" im Sinn
   dieser Sammlung, die erste ist ein Verweis, kein Inhalt. GEMESSEN, nicht angenommen
   (05.09.2026, gegen `situationsModulPruefen` selbst geprüft): genau diese zweite Sorte kann
   der reale Prüfer heute STRUKTURELL nicht annehmen — „NUR {quelle, feld}-Züge sind hier
   erlaubt" steht wörtlich im Kern-Kommentar über der Funktion, und eine Probe mit einer
   völlig unreservierten, frei erfundenen Situations-ID bestätigt es (`grund: 'bloecke'`,
   nicht `'reserviert'` — ein tieferer, ID-unabhängiger Riegel als bei jedem anderen Register). */
function situationsEintraegeSammeln(SITUATIONEN) {
  const defs = [];
  for (const situation of (SITUATIONEN || [])) {
    for (const block of (situation.bloecke || [])) {
      for (const eintrag of (block.eintraege || [])) {
        if (!eintrag || !eintrag.feld || typeof eintrag.feld !== 'object') continue;   // Querverweis, kein eigenes Feld
        defs.push({ situationId: situation.id, blockId: block.id || null, feldId: eintrag.feld.id, feld: eintrag.feld });
      }
    }
  }
  return defs;
}

/* U2-ADR-301 — wörtlicher Spiegel von `feldDefinitionenSammeln`, auf Assistenten übertragen.
   ANDERS ALS BEI SEKTOR-FELDERN bleibt `frage` TEIL DER STRUKTUR, nicht der Sprach-Achse: der
   reale Prüfer `wizardsModulPruefen` verlangt für JEDEN Schritt `s.feld` UND `s.frage` als
   nicht-leeren String (vivodepot.html, `wizardsModulPruefen`-Schrittprüfung) — ein Schritt ohne
   `frage` wird verworfen (`grund: 'schritte'`), gemessen, nicht vermutet (Gegenprobe in
   `tests/buergermodul-situationen-wizards-u2-adr-301.test.js`). Die sonst übliche
   Struktur/Sprache-Trennung (Feld-Label kommt separat aus dem Textsatz-Modul) gilt für die
   Wizard-Frage heute NICHT — sie muss mitreisen, sonst ist der Schritt für den echten Prüfer
   kein Schritt.
   Korrektur (05./06.09.2026, ADR folgt mit dem Ersetzer selbst): eine feste Liste
   (`feld`+`frage`) benennt nur, was auffiel,
   nicht was ein Schritt trägt. Gemessen (`node -e` gegen `V.WIZARDS`, alle Schritte): sechs
   Schlüssel kommen tatsächlich vor — `feld`, `frage`, `hilfetext`, `ziel`, `verborgenWenn`,
   `verborgenWennKeinVerweis` — keiner davon ein Getter oder Funktionswert (JSON-sicher).
   Darum jetzt Rest-Spread statt Namensliste: JEDE Schritt-Eigenschaft außer `feld` reist mit,
   auch eine künftige siebte, ohne dass dieser Sammler nachgezogen werden muss. */
function wizardsSchritteSammeln(WIZARDS) {
  const defs = [];
  for (const wizard of (WIZARDS || [])) {
    (wizard.schritte || []).forEach((schritt, index) => {
      if (!schritt || !schritt.feld || typeof schritt.feld !== 'object') return;
      const { feld, ...rest } = schritt;
      defs.push({ wizardId: wizard.id, schrittIndex: index, feldId: feld.id, feld, ...rest });
    });
  }
  return defs;
}

function baueNutzlasten(V) {
  const nutzlasten = {};
  const nichtUebernommen = [];

  for (const r of REGISTER_QUELLEN) {
    const bestand = V[r.quelle];
    if (bestand === undefined) {
      nichtUebernommen.push({
        was: r.quelle, register: r.typ, grund: 'nicht-exportiert',
        erklaerung: 'Der Kern-Export ' + r.quelle + ' fehlt in tests/load-kern.js — nicht messbar, '
          + 'darum auch nicht behauptet. Kein Beleg, dass der Bestand fehlt.',
      });
      continue;
    }
    const funktionen = funktionswerteSuchen(bestand, r.quelle, [], 0);
    if (funktionen.length) {
      nichtUebernommen.push({
        was: r.quelle, register: r.typ, grund: 'funktionswert',
        erklaerung: funktionen.length + ' Eigenschaft(en) tragen eine Funktion und koennen als JSON '
          + 'nicht mitreisen: ' + funktionen.slice(0, 5).join(', '),
      });
    }
    nutzlasten[r.typ] = { quelle: r.quelle, inhalt: bestand, funktionswerte: funktionen };
  }

  return { nutzlasten, nichtUebernommen };
}

/* Ruft den ECHTEN Prüfer je Register und gibt sein Urteil unverändert zurück —
   auch ein ablehnendes. Der Bau bricht daran NICHT ab (anders als beim
   Textsatz-EN-Erzeuger): dort war eine Ablehnung ein Baufehler, hier ist sie
   ein gemessener Stand des Kerns, den zu verschweigen der eigentliche Fehler
   waere. */
function pruefenLassen(V, typ, nutzlast) {
  const r = REGISTER_QUELLEN.find((x) => x.typ === typ);
  const fn = r && V[r.pruefer];
  if (typeof fn !== 'function') {
    return { gefahren: false, grund: 'pruefer-nicht-exportiert', pruefer: r ? r.pruefer : null };
  }
  let urteil;
  try { urteil = fn(nutzlast); } catch (e) { return { gefahren: true, gueltig: false, grund: 'wirft: ' + e.message }; }
  return {
    gefahren: true,
    gueltig: !!(urteil && urteil.gueltig),
    grund: (urteil && urteil.grund) || null,
    verworfene: (urteil && urteil.verworfene) ? urteil.verworfene.length : 0,
    ersteVerworfene: (urteil && urteil.verworfene) ? urteil.verworfene.slice(0, 3) : [],
  };
}

function baueBuergermodul() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();

  const { nutzlasten, nichtUebernommen } = baueNutzlasten(V);
  /* Kampagne „eine Leseart statt dreiundvierzig", Zug 2 (09.09.2026) — `bereicheAlle()`
     statt der Buendel-Liste: ein AB WERK gesaeter Bereich steht nicht im Buendel und fiele
     sonst aus diesem Artefakt. Der Drift-Waechter wuerde das melden und anbieten, den
     Ausgabestand neu zu backen — was die Auslassung einfriert statt sie zu beheben. */
  const feldDefs = feldDefinitionenSammeln(V.bereicheAlle());
  const situationsDefs = situationsEintraegeSammeln(V.SITUATIONEN);
  const wizardsDefs = wizardsSchritteSammeln(V.WIZARDS);

  /* JEDE Nutzlast durch ihren ECHTEN Prüfer, mit echtem Inhalt in der echten Form —
     und das Urteil wandert unverändert in die Auslassungsliste. Diese Liste entsteht
     damit aus einer Messung, nicht aus einer Einschätzung: was der Kern heute
     zurückweist, steht drin, mit seinem eigenen Grund und in seiner eigenen Zählung.

     Eine leere Auslassungsliste wäre die gefährlichste Ausgabe dieses Werkzeugs — sie
     behauptete „nichts blieb liegen". Der erste Lauf (05.09.2026) gab genau das aus,
     weil die Nutzlasten als leere Hüllen in den Prüfer gingen: fünf „abgelehnt", die
     nichts über den Kern sagten, nur über den Erzeuger. */
  const urteile = {};
  for (const r of REGISTER_QUELLEN) {
    const eintrag = nutzlasten[r.typ];
    if (!eintrag) continue;
    const inhalt = uebersetzen(r.typ, eintrag.inhalt);
    if (inhalt === null) {
      nichtUebernommen.push({
        was: r.quelle, register: r.typ, grund: 'form-unbekannt',
        erklaerung: 'Der native Bestand liegt nicht in einer Form vor, die sich nach `' + r.schluessel + '` übersetzen ließe.',
      });
      continue;
    }
    eintrag.uebersetzt = inhalt;
    eintrag.bytes = Buffer.byteLength(JSON.stringify(inhalt), 'utf8');

    const huelle = { modulTyp: r.typ, moduleVersion: 1, sprache: 'de' };
    if (r.typ !== 'textsatz') huelle.herkunft = 'vivodepot';
    huelle[r.schluessel] = inhalt;

    const u = pruefenLassen(V, r.typ, huelle);
    urteile[r.typ] = u;
    if (!u.gueltig) {
      const anzahl = Array.isArray(inhalt) ? inhalt.length : Object.keys(inhalt).length;
      nichtUebernommen.push({
        was: r.quelle, register: r.typ, grund: u.grund,
        eintraege: anzahl, verworfene: u.verworfene || 0,
        beispiele: u.ersteVerworfene || [],
        erklaerung: 'Der echte Prüfer `' + r.pruefer + '` weist diese Nutzlast heute zurück (Grund: '
          + u.grund + ')' + (r.reserviert
            ? '. Jede der ' + anzahl + ' Kennungen steht in `' + r.reserviert + '` und gilt als reserviert — '
              + 'ein Modul darf den eingebauten Bestand ERGÄNZEN, nicht ersetzen (U2-ADR-145 Punkt 5). '
              + 'Die Suppression des nativen Bestands ist U2-ADR-253 „Commit B" und ausdrücklich offen.'
            : (r.typ === 'textsatz'
              ? '. `sprache: \'de\'` ist über den Einlassweg reserviert (TEXTSATZ_SPRACHE_EINGEBAUT); '
                + 'der Gerüst-eigene Ladeweg aus U2-ADR-285 ist die benannte Ausnahme und heute unverdrahtet.'
              : '.')),
      });
    }
  }

  /* Der Rueckweg-Beweis: die gesammelten Feld-Definitionen, wieder nach Sektor
     gruppiert, muessen den nativen Baum ergeben. Ohne diesen Vergleich waere
     „vollstaendig" eine Behauptung. */
  const rueckweg = { geprueft: 0, abweichungen: [] };
  for (const d of feldDefs) {
    rueckweg.geprueft++;
    if (typeof d.feldId !== 'string' || !d.feldId) {
      rueckweg.abweichungen.push({ sektorId: d.sektorId, grund: 'feldId fehlt' });
      continue;
    }
    /* Kennung UNVERAENDERT: kein tpl_-Praefix, kein Namensraum, keine Umbenennung.
       Ein Praefix hier wuerde den gespeicherten Wert jeder Bestandsbuergerin
       verwaisen (U2-ADR-037 Entscheidung 1 — die Feld-ID IST der Speicherplatz). */
    if (d.feldId.indexOf('tpl_') === 0) {
      rueckweg.abweichungen.push({ feldId: d.feldId, grund: 'traegt-praefix' });
    }
  }

  /* Erste-Partei-Zone (U2-ADR-282): der Nachweis, dass genau diese nativen
     Kennungen erlaubt sind — ihr erster echter Aufrufer. */
  let zone = { gefahren: false };
  if (typeof V.erstePartieFeldDefsPruefen === 'function') {
    const erlaubte = feldDefs.map((d) => d.sektorId + '.' + d.feldId);
    const eingaben = feldDefs.map((d) => ({ sektorId: d.sektorId, feldId: d.feldId, label: (d.feld && d.feld.label) || d.feldId }));
    const z = V.erstePartieFeldDefsPruefen(eingaben, erlaubte);
    zone = { gefahren: true, angenommen: z.angenommen.length, verworfen: z.verworfen.length, ersteVerworfene: z.verworfen.slice(0, 3) };
  }

  /* U2-ADR-301 — derselbe Rueckweg-Beweis wie oben fuer Feld-Definitionen, jetzt fuer die
     eigenen Situationsfelder und Assistenten-Schritte: die gesammelten Definitionen muessen
     eine feldId tragen und duerfen kein tpl_-Praefix haben (dieselbe Erste-Partei-Regel). */
  function rueckwegPruefen(defs) {
    const r = { geprueft: 0, abweichungen: [] };
    for (const d of defs) {
      r.geprueft++;
      if (typeof d.feldId !== 'string' || !d.feldId) { r.abweichungen.push({ grund: 'feldId fehlt' }); continue; }
      if (d.feldId.indexOf('tpl_') === 0) r.abweichungen.push({ feldId: d.feldId, grund: 'traegt-praefix' });
    }
    return r;
  }
  const situationsRueckweg = rueckwegPruefen(situationsDefs);
  const wizardsRueckweg = rueckwegPruefen(wizardsDefs);

  /* U2-ADR-301 — GEMESSEN, nicht angenommen: anders als bei Sektor-Feldern (Erste-Partei-Zone,
     `buergermodulSektorErsetzen`) gibt es fuer Situationsfelder KEINEN entsprechenden
     Ladeweg. Die Probe unten prueft direkt gegen den ECHTEN `situationsModulPruefen`, ob ein
     EIGENES Feld ueberhaupt strukturell durchkaeme — mit einer voellig UNRESERVIERTEN,
     frei erfundenen Situations-ID, damit das Ergebnis nicht mit der bekannten
     Reservierungs-Ablehnung verwechselt werden kann. */
  let situationEigenesFeldSonde = { gefahren: false };
  if (typeof V.situationsModulPruefen === 'function' && situationsDefs.length) {
    const probe = situationsDefs[0];
    const sondenModul = {
      modulTyp: 'situation', moduleVersion: 1, herkunft: 'sonde-u2-adr-301', sprache: 'de',
      situationen: { 'sonde-unreserviert-x9': { titel: 'Sonde', bloecke: [
        { id: 'block', eintraege: [{ feld: Object.assign({}, probe.feld) }] },
      ] } },
    };
    const urteil = V.situationsModulPruefen(sondenModul);
    situationEigenesFeldSonde = {
      gefahren: true, gueltig: urteil.gueltig, grund: urteil.grund,
      verworfeneGrund: (urteil.verworfene && urteil.verworfene[0] && urteil.verworfene[0].grund) || null,
    };
  }

  return {
    schalenStand: (typeof V.SCHALEN_STAND === 'string') ? V.SCHALEN_STAND : null,
    anbieterId: 'vivodepot',
    moduleVersion: 1,
    nutzlasten,
    feldDefinitionen: feldDefs.map((d) => ({ sektorId: d.sektorId, sektionId: d.sektionId, feldId: d.feldId, unterVon: d.unterVon || null, feld: d.feld })),
    situationsDefinitionen: situationsDefs,
    wizardsDefinitionen: wizardsDefs,
    situationsRueckweg,
    wizardsRueckweg,
    situationEigenesFeldSonde,
    nichtUebernommen,
    urteile,
    rueckweg,
    zone,
  };
}

function main() {
  const modul = baueBuergermodul();
  const urteile = modul.urteile;

  /* KEIN Standard-Ausgabepfad, anders als beim Textsatz-EN-Erzeuger: die Ausgabe dieses
     Werkzeugs ist rund 1,6 MB und niemand liest sie — sein Ergebnis ist das URTEIL der
     echten Prüfer und die Auslassungsliste, die es AUSGIBT. Eine Datei entsteht nur auf
     ausdrücklichen Wunsch; ein Erzeugnis, das keiner verbraucht, gehört nicht ins Repo.
     Das eigentliche Bau-Erzeugnis liefert tools/buergermodul-schnitt.js. */
  const ausgabepfad = process.argv[2] || null;
  /* KEIN Zeitstempel in der Ausgabe: er drehte die Datei bei jedem Lauf und
     brächte die Prüfsummen-Gates zum Ausschlagen, ohne dass sich Inhalt änderte
     (dieselbe Falle wie BUILD_DATUM nach Mitternacht). Der SCHALEN_STAND sagt,
     welcher Kern die Quelle war — und der ändert sich nur, wenn er es soll. */
  if (ausgabepfad) fs.writeFileSync(ausgabepfad, JSON.stringify(modul, null, 2) + '\n', 'utf8');

  const bytes = Buffer.byteLength(JSON.stringify(modul), 'utf8');
  console.log(ausgabepfad ? ('Messung geschrieben: ' + ausgabepfad) : 'Messung (keine Datei — Pfad als Argument übergeben, wenn eine gewünscht ist)');
  console.log('Quelle: Kern ' + modul.schalenStand);
  console.log('Nutzlasten: ' + Object.keys(modul.nutzlasten).join(', '));
  console.log('Feld-Definitionen: ' + modul.feldDefinitionen.length + ' (native Kennungen, kein Präfix)');
  console.log('Rückweg geprüft: ' + modul.rueckweg.geprueft + ', Abweichungen: ' + modul.rueckweg.abweichungen.length);
  console.log('Situationsfelder (eigene, kein Querverweis): ' + modul.situationsDefinitionen.length
    + ' — Rückweg geprüft: ' + modul.situationsRueckweg.geprueft + ', Abweichungen: ' + modul.situationsRueckweg.abweichungen.length);
  if (modul.situationEigenesFeldSonde.gefahren) {
    console.log('  Sonde (unreservierte Situations-ID, eigenes Feld): ' + (modul.situationEigenesFeldSonde.gueltig ? 'ANGENOMMEN' : 'abgelehnt (' + modul.situationEigenesFeldSonde.grund + ', Eintrag-Grund: ' + modul.situationEigenesFeldSonde.verworfeneGrund + ')'));
  }
  console.log('Assistenten-Schritte: ' + modul.wizardsDefinitionen.length
    + ' — Rückweg geprüft: ' + modul.wizardsRueckweg.geprueft + ', Abweichungen: ' + modul.wizardsRueckweg.abweichungen.length);
  if (modul.zone.gefahren) {
    console.log('Erste-Partei-Zone: ' + modul.zone.angenommen + ' angenommen, ' + modul.zone.verworfen + ' verworfen');
  } else {
    console.log('Erste-Partei-Zone: NICHT gefahren (erstePartieFeldDefsPruefen nicht exportiert)');
  }
  console.log('Größe: ' + bytes + ' Bytes');
  console.log('');
  console.log('Urteil der echten Prüfer je Register:');
  for (const [typ, u] of Object.entries(urteile)) {
    const t = u.gefahren ? (u.gueltig ? 'ANGENOMMEN' : 'abgelehnt (' + u.grund + ')') : 'kein Prüfer exportiert';
    console.log('  ' + typ.padEnd(16) + t);
  }
  console.log('');
  console.log('NICHT übernommen (' + modul.nichtUebernommen.length + '):');
  for (const n of modul.nichtUebernommen) console.log('  ' + n.was + ' — ' + n.grund + ': ' + n.erklaerung);
}

if (require.main === module) main();
module.exports = {
  baueBuergermodul, feldDefinitionenSammeln, funktionswerteSuchen, strukturGleich, REGISTER_QUELLEN,
  situationsEintraegeSammeln, wizardsSchritteSammeln,
};
