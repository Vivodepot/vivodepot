'use strict';
/* ════════════════════════════════════════════════════════════════════════════════
   styleguide-komponenten-abgleich — welche gestalteten Bausteine nennt der Leitfaden?

   Entscheidungsrunde 20.08.2026, Punkt 4 (Möglichkeit A: das bestehende Kapitel wächst),
   schliesst A249 Zug 2 / A252 / G7. Gegenstück zu `design-system-token-abgleich.js`, das
   FARB-TOKEN vergleicht — dieses hier vergleicht KLASSENNAMEN.

   WAS ES NICHT TUT: es sagt nicht, welche Klasse dokumentiert GEHÖRT. Der Leitfaden führt
   in 5.12 ausdrücklich, dass „gebautes CSS ohne Design-Entscheidung dahinter" nicht
   beschrieben wird — eine Beschreibung zu erfinden hiesse, eine Entscheidung zu erfinden.
   Dieses Werkzeug liefert die Menge, aus der ein Mensch wählt, und die Zahl, die im
   Leitfaden steht.

   VARIANTEN WERDEN GEBÜNDELT: `.btn-mini`, `.btn-gefahr`, `.btn:hover` gehören zu `.btn`.
   Ohne das zählt jede Ausprägung als eigener Baustein, und die Zahl ist grösser als die
   Sache. Der Stamm ist der Teil vor dem ersten `-`, sofern es einen Stamm mit eigener Regel
   gibt — sonst ist die Klasse ihr eigener Stamm.

   Aufruf:
     node tools/styleguide-komponenten-abgleich.js            # Zahlen + fehlende Stämme
     node tools/styleguide-komponenten-abgleich.js --alle     # jede Klasse, nicht nur Stämme
     node tools/styleguide-komponenten-abgleich.js --zuschnitt   # eigenstaendig oder Variante?
     node tools/styleguide-komponenten-abgleich.js --inhalt   # Zug 3: Token-Behauptungen gegen die echte Regel
     node tools/styleguide-komponenten-abgleich.js --json
     node tools/styleguide-komponenten-abgleich.js --check    # Waechter: Zahlen in 5.12
     node tools/styleguide-komponenten-abgleich.js --check --leitfaden <pfad>

   ZUG 3 (Oberflächen-Konsistenz-Auftrag, 27.08.2026) — von reiner Namens-Prüfung auf echten
   Inhalts-Abgleich geschärft: `--inhalt` prüft, ob ein im Leitfaden behauptetes Custom-
   Property-Token wirklich in der Regel der genannten Klasse steht — nicht nur, ob der
   Klassenname irgendwo vorkommt (s. `inhaltsAbgleich()` unten für die genaue Grenze).
   Bewusst INFORMATIV, kein `--check`-Gate: die Zuordnung Absatz→Klasse ist eine Näherung
   (mehrere Klassen pro Absatz, keine Satzstruktur-Analyse), ein Fehlalarm darf keinen Commit
   blockieren — anders als die Zahlen in 5.12, die exakt geprüft werden können.
   ════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = process.env.KERN_HTML_PATH || path.join(REPO, 'vivodepot.html');
/* `--leitfaden <pfad>` vor der Umgebungsvariablen: die Wächter-Selbstprobe reicht eine Kopie
   als Argument herein, wie es die Schreibregel für Prüfwerkzeuge verlangt. */
function _argWert(name) {
  const i = process.argv.indexOf(name);
  return (i >= 0 && process.argv[i + 1]) ? process.argv[i + 1] : null;
}
const LEITFADEN = _argWert('--leitfaden') || process.env.STYLEGUIDE_PATH
  || path.join(REPO, 'vivodepot-style-guide.html');

/* Nur der <style>-Block des Kerns — eine Klasse in einem HTML-Attribut ist Verwendung,
   keine Gestaltungsregel. Gezählt wird, was eine eigene Regel HAT. */
function kernKlassen(html) {
  const stile = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) stile.push(m[1]);
  const roh = stile.join('\n')
    // Kommentare weg: ein Klassenname in einem Kommentar ist keine Regel.
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const klassen = new Set();
  // Selektoren stehen vor `{`; darin jede `.klasse`. Pseudo-Klassen/-Elemente abschneiden.
  const regelRe = /([^{}]+)\{[^{}]*\}/g;
  let r;
  while ((r = regelRe.exec(roh))) {
    const selektor = r[1];
    if (selektor.indexOf('@') >= 0 && !/[.]/.test(selektor)) continue;
    const treffer = selektor.match(/\.[A-Za-z_][A-Za-z0-9_-]*/g) || [];
    for (const t of treffer) klassen.add(t.slice(1));
  }
  return klassen;
}

/* Wie kernKlassen(), aber statt NUR der Namen liefert es je Klasse den vollen, wörtlichen
   Regel-Text (alle Regelkörper, in denen die Klasse im Selektor vorkommt, zusammengefügt).
   Grundlage für den Inhalts-Abgleich (Zug 3, 27.08.2026) — nicht nur „wird die Klasse
   genannt", sondern „stimmt, WAS über sie behauptet wird, mit ihrer echten Regel überein". */
function kernKlassenRegeln(html) {
  const stile = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) stile.push(m[1]);
  const roh = stile.join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const regeln = new Map();   // klasse -> [koerper, ...]
  const regelRe = /([^{}]+)\{([^{}]*)\}/g;
  let r;
  while ((r = regelRe.exec(roh))) {
    const selektor = r[1], koerper = r[2];
    if (selektor.indexOf('@') >= 0 && !/[.]/.test(selektor)) continue;
    const treffer = selektor.match(/\.[A-Za-z_][A-Za-z0-9_-]*/g) || [];
    for (const t of treffer) {
      const k = t.slice(1);
      if (!regeln.has(k)) regeln.set(k, []);
      regeln.get(k).push(koerper);
    }
  }
  const zusammengefuegt = new Map();
  for (const [k, teile] of regeln) zusammengefuegt.set(k, teile.join(' '));
  return zusammengefuegt;
}

/* ── Inhalts-Abgleich (Zug 3, Oberflächen-Konsistenz-Auftrag, 27.08.2026) ──────────
   Der bisherige `genannt()`-Begriff ist reine Namens-Prüfung: die Klasse kommt im Leitfaden
   VOR, unabhängig davon, ob die Prosa etwas WAHRES über sie behauptet. Genau das hat Zug 0
   wiederholt gefunden — die Sidebar-Prosa nannte `.nav-item.aktiv`, beschrieb aber eine
   Flächenfüllung, die der Kern längst durch eine Randlinie ersetzt hatte.

   GEPRÜFT WIRD, WAS PRÜFBAR IST: Custom-Property-Token (`--token-name`) sind die Einheit,
   in der dieses Dokument tatsächlich schreibt — nicht volle CSS-Deklarationen (die Prosa
   ist Fließtext, kein CSS). Für jeden `<code>--token</code>`-Beleg in einem Prosa-Absatz
   (nur `.cmp-note`, NICHT Abschnitt 10.3 — das ist maschinell erzeugt und per Definition
   wörtlich korrekt), der NICHT als historischer Vergleich markiert ist (Wörter wie „war"/
   „vorher"/„davor"/„damals"/„zuvor" im selben Absatz vor dem Beleg), wird geprüft: taucht
   dieses Token in der echten Regel MINDESTENS EINER Klasse auf, die im selben Absatz genannt
   wird? Bewusst grosszügig über alle Klassen des Absatzes (nicht nur die nächststehende) —
   eine engere Zuordnung wäre eine Vermutung über Satzstruktur, keine Messung.

   WAS DAS NICHT FÄNGT: eine falsche Aussage ÜBER eine reale, anderswo vorkommende Token-
   Verwendung (z. B. eine falsch zugeordnete, aber im Kern irgendwo existierende Kombination).
   Das Werkzeug prüft Token-Existenz in der behaupteten Klassen-Regel, keine vollständige
   CSS-Semantik — dieselbe bewusste Grenze wie beim Namens-Abgleich oben.

   ZWEITE GRENZE, gemessen statt vermutet: der bestehende `genannt()` oben sucht mit `indexOf`
   über beliebige Substrings — für die Zahlen in 5.12 harmlos genug (eine leicht zu hohe Zahl
   fällt niemandem auf). Für die Klassen-Zuordnung HIER wäre dieselbe Suche falsch: kurze,
   generische Klassennamen wie `.an` oder `.ok` sind zugleich gewöhnliche deutsche Wörter
   („…schaltet an…", „Fokusring läuft über…") und würden JEDEN Absatz für sich beanspruchen.
   Zwei Filter, beide gemessen (Probe unten pflanzt genau diesen Fall): Wortgrenzen (`\b`) statt
   freier Substring, UND eine Mindestlänge von drei Zeichen — kurz genug, um `.btn`/`.sd-kopf`
   durchzulassen, lang genug, um `.an`/`.ok` als Wortkollision auszuschließen. Bleibt eine
   bekannte Lücke: eine dreistellige oder längere Klasse, die selbst ein gewöhnliches Wort ist,
   wird dieser Filter nicht fangen — dafür bräuchte es echte Sprachanalyse, keine Messung. */
const HISTORISCH_MARKER = /(war|vorher|davor|damals|zuvor)\s*$/i;
function _alsWortgrenzenRegex(klasse) {
  return new RegExp('\\b' + klasse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
}
function inhaltsAbgleich() {
  const kernHtml = fs.readFileSync(KERN, 'utf8');
  const leitfadenVoll = fs.readFileSync(LEITFADEN, 'utf8');
  const leitfadenHtml = ohneVollstaendigeListe(leitfadenVoll);
  const klassen = Array.from(kernKlassen(kernHtml)).filter((k) => k.length >= 3);
  const regelInhalte = kernKlassenRegeln(kernHtml);

  const funde = [];
  const absatzRe = /<p class="cmp-note">([\s\S]*?)<\/p>/g;
  let ap;
  while ((ap = absatzRe.exec(leitfadenHtml))) {
    const absatz = ap[1];
    const genannteKlassen = klassen.filter((k) => _alsWortgrenzenRegex(k).test(absatz));
    if (!genannteKlassen.length) continue;
    const kombinierteRegel = genannteKlassen.map((k) => regelInhalte.get(k) || '').join(' ');
    const tokenRe = /<code>(--[A-Za-z][A-Za-z0-9-]*)<\/code>/g;
    let tp;
    while ((tp = tokenRe.exec(absatz))) {
      const token = tp[1];
      const davor = absatz.slice(Math.max(0, tp.index - 40), tp.index);
      if (HISTORISCH_MARKER.test(davor.replace(/<[^>]*>/g, ''))) continue;   // historischer Vergleich, keine aktuelle Behauptung
      if (kombinierteRegel.indexOf(token) >= 0) continue;   // Token steht wirklich in einer der genannten Regeln
      funde.push({ token, klassen: genannteKlassen, absatzAuszug: absatz.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) });
    }
  }
  return { ok: funde.length === 0, funde };
}

/* Der Stamm einer Klasse: `btn-mini` → `btn`, aber nur wenn `btn` selbst eine Regel hat.
   Sonst bleibt `btn-mini` ihr eigener Stamm — sonst erfände das Werkzeug eine Gruppe,
   die es im CSS nicht gibt. */
function stammVon(klasse, alleKlassen) {
  const teile = klasse.split('-');
  for (let n = teile.length - 1; n >= 1; n--) {
    const kandidat = teile.slice(0, n).join('-');
    if (alleKlassen.has(kandidat)) return kandidat;
  }
  return klasse;
}

// Abschnitt 10.3 (23.08.2026) nennt JEDE Klasse mechanisch, ohne Zuschnitt — ein Zweck, der
// bewusst ein ANDERER ist als der dieses Werkzeugs (welche Klassen tragen eine editorische
// BESCHREIBUNG, keine blosse Auflistung). Ohne diesen Ausschluss waere "genannt" nach 10.3
// für jede einzige Klasse wahr, und dieses Werkzeug faende nichts mehr zu berichten — nicht
// weil mehr beschrieben wäre, sondern weil die Frage, die es stellt, eine andere geworden ist.
const KLASSEN_VOLLSTAENDIG_BEGIN = '<!-- KLASSEN-VOLLSTAENDIG:BEGIN';
const KLASSEN_VOLLSTAENDIG_END = '<!-- KLASSEN-VOLLSTAENDIG:END -->';
function ohneVollstaendigeListe(html) {
  const start = html.indexOf(KLASSEN_VOLLSTAENDIG_BEGIN);
  const ende = html.indexOf(KLASSEN_VOLLSTAENDIG_END);
  if (start === -1 || ende === -1) return html;
  return html.slice(0, start) + html.slice(ende + KLASSEN_VOLLSTAENDIG_END.length);
}

function abgleich() {
  const kernHtml = fs.readFileSync(KERN, 'utf8');
  const leitfadenHtml = ohneVollstaendigeListe(fs.readFileSync(LEITFADEN, 'utf8'));
  const klassen = kernKlassen(kernHtml);

  const staemme = new Map();   // stamm -> [klassen]
  for (const k of klassen) {
    const st = stammVon(k, klassen);
    if (!staemme.has(st)) staemme.set(st, []);
    staemme.get(st).push(k);
  }

  /* Genannt = der Klassenname kommt im Leitfaden vor — AUSSERHALB von Abschnitt 10.3, s. oben.
     Bewusst grosszügig sonst: eine Erwähnung in einer Aufzählung zählt. Das Werkzeug misst
     Abdeckung, nicht Beschreibungstiefe — und eine strengere Regel wäre eine erfundene. */
  const genannt = (name) => leitfadenHtml.indexOf(name) >= 0;

  const stammListe = Array.from(staemme.keys()).sort();
  const fehlendeStaemme = stammListe.filter(st => !genannt(st));
  const fehlendeKlassen = Array.from(klassen).filter(k => !genannt(k)).sort();

  return {
    klassenGesamt: klassen.size,
    staemmeGesamt: stammListe.length,
    staemmeGenannt: stammListe.length - fehlendeStaemme.length,
    klassenGenannt: klassen.size - fehlendeKlassen.length,
    fehlendeStaemme,
    fehlendeKlassen,
    // Die grössten unbeschriebenen Familien zuerst — dort sitzt die meiste Sache je Zeile.
    groessteFehlend: fehlendeStaemme
      .map(st => ({ stamm: st, ausprägungen: staemme.get(st).length }))
      .sort((a, b) => b.ausprägungen - a.ausprägungen)
      .slice(0, 25),
  };
}

/* ── `--zuschnitt`: wie viele der nicht beschriebenen Bausteine sind EIGENSTÄNDIG ──
   Laufzettel „Restliste bis v1" (20.08.2026), Posten 1. Die Entscheidungsvorlage vom 18.08.
   nennt 405 nicht beschriebene Bausteine und hält ausdrücklich fest, was NICHT gemessen ist:
   „wie viele davon überhaupt eigenständig sind — viele sind Varianten desselben Elements."
   Das ist die Zahl, die den Design-Zuschnitt entsperrt, und sie steht hier.

   DIE EINTEILUNG IST MECHANISCH, NICHT GEURTEILT. Es gibt genau drei Fälle, und jeder hat
   ein prüfbares Kriterium:

     A · VARIANTE EINES BESCHRIEBENEN ELEMENTS — der Stamm der Klasse steht im Leitfaden.
         `.btn-mini` bei beschriebenem `.btn`. Das Element IST beschrieben; die Variante
         braucht keine eigene Beschreibung, sondern höchstens einen Satz im selben Abschnitt.
     B · VARIANTE EINES NICHT BESCHRIEBENEN ELEMENTS — es gibt einen Stamm mit eigener Regel,
         aber er steht nicht im Leitfaden. Wird der Stamm beschrieben, fällt die Variante mit
         ihm. Sie ist KEIN eigener Posten.
     C · EIGENSTÄNDIG — die Klasse ist ihr eigener Stamm. Nur diese Menge kann überhaupt eine
         eigene Beschreibung brauchen.

   UND EINE ZWEITE EBENE, weil die erste sie sonst überschätzt: mehrere eigenständige Klassen
   können ein PRÄFIX teilen, das selbst keine Regel hat (`.er-panel`, `.er-karte`, `.er-zeile`).
   Der Stamm-Griff sieht drei Bausteine, die Oberfläche zeigt eine Komponentengruppe. Beide
   Zahlen stehen darum nebeneinander: die eigenständigen Klassen und die Gruppen, in die sie
   zerfallen. Welche der beiden der Zuschnitt nimmt, ist eine Entscheidung, keine Messung. */
function zuschnitt() {
  const kernHtml = fs.readFileSync(KERN, 'utf8');
  const leitfadenHtml = ohneVollstaendigeListe(fs.readFileSync(LEITFADEN, 'utf8'));
  const klassen = kernKlassen(kernHtml);
  const genannt = (name) => leitfadenHtml.indexOf(name) >= 0;

  const A = [], B = [], C = [];
  for (const k of Array.from(klassen).sort()) {
    if (genannt(k)) continue;                       // beschrieben — nicht Gegenstand dieser Zählung
    const st = stammVon(k, klassen);
    if (st === k) { C.push(k); continue; }
    (genannt(st) ? A : B).push({ klasse: k, stamm: st });
  }

  /* Die Gruppen der eigenständigen: das Präfix vor dem ersten `-`, aber nur, wenn es MEHRERE
     eigenständige Klassen mit demselben Präfix gibt. Ein Einzelstück bleibt sein eigener
     Posten — sonst zählte das Werkzeug Gruppen, die niemand als Gruppe sieht. */
  const nachPraefix = new Map();
  for (const k of C) {
    const p = k.split('-')[0];
    if (!nachPraefix.has(p)) nachPraefix.set(p, []);
    nachPraefix.get(p).push(k);
  }
  const gruppen = [], einzelstuecke = [];
  for (const [p, liste] of nachPraefix) {
    if (liste.length > 1) gruppen.push({ praefix: p, klassen: liste.sort() });
    else einzelstuecke.push(liste[0]);
  }
  gruppen.sort((a, b) => b.klassen.length - a.klassen.length || a.praefix.localeCompare(b.praefix));

  return {
    nichtBeschrieben: A.length + B.length + C.length,
    varianteBeschriebenerStamm: A.length,
    varianteNichtBeschriebenerStamm: B.length,
    eigenstaendig: C.length,
    gruppen: gruppen.length,
    einzelstuecke: einzelstuecke.length,
    postenWennGruppenZaehlen: gruppen.length + einzelstuecke.length,
    A, B, C, gruppenListe: gruppen, einzelstueckListe: einzelstuecke.sort(),
  };
}

/* ── `--check`: die Zahlen IM Leitfaden gegen die Messung ──────────────────────────
   Der Leitfaden nennt in 5.12 drei Zahlen. Eine korrigierte Handkopie ist in vier Wochen
   wieder falsch — und sie veraltet ausgerechnet dann, wenn jemand das Kapitel erweitert,
   also im Moment der Sorgfalt. Darum geprüft statt gepflegt.

   ERZEUGT WIRD SIE NICHT: der Satz drumherum ist Prosa mit einer Begründung, keine Tabelle.
   Ein Generator müsste den Satz besitzen; eine Prüfung lässt ihn dem Menschen und meldet nur,
   wenn die Zahl darin nicht mehr stimmt. */
function pruefe() {
  const e = abgleich();
  const text = fs.readFileSync(LEITFADEN, 'utf8');
  /* JEDE ZAHL AN IHREM EIGENEN ETIKETT, nicht irgendwo im Dokument. Der erste Entwurf suchte
     mit `indexOf` über die ganze Datei — und blieb grün, als die Familienzahl auf 46 zurückgesetzt
     wurde, weil „46" anderswo vorkommt. Ein Wächter, der bei gepflanztem Fehler grün bleibt,
     ist keiner. Gebunden wird darum an den Wortlaut, der die Zahl trägt. */
  const erwartet = [
    { zahl: e.klassenGesamt, was: 'Klassen mit eigener Gestaltungsregel',
      muster: (n) => new RegExp('führt\\s+' + n + '\\s+Klassen mit eigener Gestaltungsregel') },
    { zahl: e.staemmeGesamt, was: 'Familien',
      muster: (n) => new RegExp('gebündelt sind es\\s+' + n + '\\b') },
    { zahl: e.staemmeGenannt, was: 'im Leitfaden genannte Familien',
      muster: (n) => new RegExp('nennt\\s+' + n + '\\s+davon') },
  ];
  const flach = text.replace(/\s+/g, ' ');
  const fehlend = erwartet.filter(x => !x.muster(x.zahl).test(flach));
  return { ok: fehlend.length === 0, fehlend, gemessen: erwartet.map(x => ({ zahl: x.zahl, was: x.was })) };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--inhalt')) {
    const r = inhaltsAbgleich();
    if (argv.includes('--json')) { process.stdout.write(JSON.stringify(r, null, 2) + '\n'); return; }
    if (r.ok) {
      process.stdout.write('styleguide-komponenten-abgleich --inhalt: keine Token-Abweichung gefunden.\n');
      return;
    }
    process.stdout.write('styleguide-komponenten-abgleich --inhalt: ' + r.funde.length
      + ' möglicherweise veraltete Token-Behauptung(en):\n\n');
    for (const f of r.funde) {
      process.stdout.write('  ' + f.token + '  (genannte Klasse(n): ' + f.klassen.map(k => '.' + k).join(', ') + ')\n');
      process.stdout.write('    … ' + f.absatzAuszug + ' …\n\n');
    }
    process.stdout.write('Informativ, kein Gate — ein Mensch prüft, ob die Prosa nachzuziehen ist\n'
      + 'oder der Fund ein Fehlalarm (z. B. ein historischer Vergleich, den der Marker-Filter\n'
      + 'nicht erkannt hat).\n');
    return;
  }
  if (argv.includes('--check')) {
    const r = pruefe();
    if (r.ok) {
      process.stdout.write('styleguide-komponenten-abgleich --check: die Zahlen in 5.12 stimmen ('
        + r.gemessen.map(x => x.zahl).join(' · ') + ').\n');
      return;
    }
    process.stderr.write('styleguide-komponenten-abgleich --check: Abweichung in '
      + path.basename(LEITFADEN) + '\n');
    for (const f of r.fehlend) {
      process.stderr.write('  gemessen ' + f.zahl + ' (' + f.was + ') — steht so nicht im Leitfaden\n');
    }
    process.stderr.write('  Nachziehen in Abschnitt 5.12. Die Zahlen kommen aus diesem Werkzeug.\n');
    process.exit(1);
  }
  if (argv.includes('--zuschnitt')) {
    const z = zuschnitt();
    if (argv.includes('--json')) { process.stdout.write(JSON.stringify(z, null, 2) + '\n'); return; }
    process.stdout.write('Kern: ' + KERN + '\nLeitfaden: ' + LEITFADEN + '\n\n');
    process.stdout.write('Nicht im Leitfaden genannte Klassen mit eigener Regel: ' + z.nichtBeschrieben + '\n\n');
    process.stdout.write('  A · Variante eines BESCHRIEBENEN Elements   ' + String(z.varianteBeschriebenerStamm).padStart(4)
      + '   (der Stamm steht im Leitfaden)\n');
    process.stdout.write('  B · Variante eines nicht beschriebenen      ' + String(z.varianteNichtBeschriebenerStamm).padStart(4)
      + '   (faellt mit ihrem Stamm)\n');
    process.stdout.write('  C · EIGENSTAENDIG                           ' + String(z.eigenstaendig).padStart(4)
      + '   (eigener Stamm, kein Elternteil mit Regel)\n\n');
    process.stdout.write('Die eigenstaendigen zerfallen in ' + z.gruppen + ' Gruppen mit gemeinsamem Praefix und '
      + z.einzelstuecke + ' Einzelstuecke.\n');
    process.stdout.write('Zaehlt man Gruppen als EINEN Posten: ' + z.postenWennGruppenZaehlen + ' Posten statt '
      + z.eigenstaendig + '.\n\n');
    process.stdout.write('Die 20 groessten Gruppen:\n');
    for (const g of z.gruppenListe.slice(0, 20)) {
      process.stdout.write('  .' + g.praefix.padEnd(20) + String(g.klassen.length).padStart(3) + '  '
        + g.klassen.map(k => '.' + k).join(' ').slice(0, 110) + '\n');
    }
    process.stdout.write('\nDas Werkzeug sagt NICHT, welche davon beschrieben gehoert — nur, wie viele\n'
      + 'Gegenstaende ueberhaupt in Frage kommen. Ob der Zuschnitt Gruppen oder Klassen zaehlt,\n'
      + 'ist eine Entscheidung.\n');
    return;
  }
  const e = abgleich();
  if (argv.includes('--json')) { process.stdout.write(JSON.stringify(e, null, 2) + '\n'); return; }
  process.stdout.write('Kern: ' + KERN + '\nLeitfaden: ' + LEITFADEN + '\n\n');
  process.stdout.write('Gestaltungsregeln (Klassen mit eigener Regel): ' + e.klassenGesamt
    + ' · davon im Leitfaden genannt: ' + e.klassenGenannt + '\n');
  process.stdout.write('Zu Familien gebündelt (Stämme):               ' + e.staemmeGesamt
    + ' · davon genannt: ' + e.staemmeGenannt + '\n\n');
  if (argv.includes('--alle')) {
    process.stdout.write('Nicht genannte Klassen (' + e.fehlendeKlassen.length + '):\n');
    for (const k of e.fehlendeKlassen) process.stdout.write('  .' + k + '\n');
    return;
  }
  process.stdout.write('Die 25 grössten nicht genannten Familien:\n');
  for (const g of e.groessteFehlend) {
    process.stdout.write('  .' + g.stamm.padEnd(28) + g.ausprägungen + ' Ausprägung(en)\n');
  }
  process.stdout.write('\nDas Werkzeug sagt NICHT, welche davon beschrieben gehört.\n'
    + 'Leitfaden 5.12: gebautes CSS ohne Design-Entscheidung wird nicht beschrieben —\n'
    + 'eine Beschreibung zu erfinden hiesse, eine Entscheidung zu erfinden.\n');
}

if (require.main === module) main();
module.exports = { abgleich, pruefe, zuschnitt, kernKlassen, kernKlassenRegeln, stammVon, inhaltsAbgleich };
