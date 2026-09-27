'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die Erhebungsregel für Trefferflächen — WCAG 2.5.8 AA, mindestens 24 px
   ────────────────────────────────────────────────────────────────────────────
   WARUM SIE HIER STEHT UND NICHT ZWEIMAL. Sie stand bis zum 28.07.2026 als
   `ERHEBUNG` in `tests/e2e/fix-6-trefferflaechen.spec.js`, und die Abnahme-Ebene
   (A5) hätte sie abschreiben können. Genau das ist am selben Tag schiefgegangen:
   `ebene4()` trug eine wortgleiche Kopie der Ausleseregel aus
   `kontrast-messen.js` — samt ihres Fehlers. Die Ebene, die Fixliste Nr. 4
   abnimmt, sah keinen einzigen Knopf mit Symbol und wäre grün geworden, ohne
   dass ihr Gegenstand gemessen war (A4).

   Zwei Regeln an zwei Orten sind zwei Regeln. Die Prüfung von Nr. 6 und die
   Abnahme-Ebene 4b messen ab jetzt mit DERSELBEN, und diese hier hat ihre eigene
   rotmachbare Prüfung: `tests/mit-modul/trefferflaechen-erhebungsregel.test.js`.

   ── DIE EINGRENZUNG, und warum sie die Regel IST ──────────────────────────
   Gemessen am 28.07.2026 über neun Theme-Skalen-Kombinationen:
       cursor:pointer .............. 1308 Fälle   ← die Rohzahl, unbrauchbar
       echte Bedienelemente ........  195
       ohne Inline-Links im Text ...  153
       verschiedene Elemente .......   20
   1116 der Rohzahl sind SVG-Knoten — `path`, `svg`, `circle` INNERHALB von
   Knöpfen, die `cursor:pointer` erben. Der Knopf ist gross genug, sein Symbol
   ist es nie. Wer an der Rohzahl repariert, repariert Dekoration.

   ── DIE AUSNAHME, die WCAG 2.5.8 selbst macht ─────────────────────────────
   Links im Fliesstext sind ausgenommen. Sie ist eng gefasst — inline gesetzt UND
   der Elternknoten trägt mehr Text als der Link selbst —, denn eine weit gefasste
   Ausnahme ist ein Scheunentor. Damit sie nicht still wächst, GIBT DIE ERHEBUNG
   SIE AUS: `ausgenommen` führt jeden Link auf, der nur wegen ihr durchgeht.
   Eine Ausnahme, die niemand zählt, ist eine Behauptung.

   ── JEDER AUSNAHMEGRUND WIRD GEZÄHLT (A10, 28.07.2026) ────────────────────
   Bis dahin nannte die Erhebung EINEN ihrer drei Gründe. Die beiden anderen —
   unsichtbar, und kein Bedienelement — standen nirgends, obwohl sie die weitaus
   grössere Menge herausnehmen (die gemessenen Zahlen stehen in der Ebene und im
   Bericht, nicht hier: hier veralteten sie). Das ist der Geltungsbereich,
   angewandt auf die REGEL statt auf den Lauf — §7 verlangt neben jeder Zahl ihre
   Bedingung, und die Bedingung einer Fundzahl ist, was vorher weggefallen ist.
   Seit Reihenfolge II #1 (10.08.2026) ist es ein vierter Grund:
   `gleichwertigesEtikett`, dieselbe Pflicht.

   Warum das mehr ist als Buchführung: bei 31 860 Bedienelementen kann eine
   Ausnahme viel stille Arbeit leisten. Verschiebt sich eine ihrer Bedingungen —
   ein `visibility`-Wechsel, ein `role`, das aus `ECHT` fällt —, sinkt die
   Fundzahl, und eine gesunkene Fundzahl liest sich wie ein besserer Stand. Der
   Trichter zeigt, WO sie gesunken ist.

   ── WAS DIE ERHEBUNG ZURÜCKGIBT, und warum nicht nur die Funde ────────────
   Die vier Zahlen bilden einen Trichter, der aufgehen MUSS — das ist die
   Eingrenzung 1308 → 195 → 153 → 20 als laufende Messung statt als Notiz:

       betrachtet = unsichtbar + gesehen
       gesehen    = keinBedienelement + fliesstext + gleichwertigesEtikett + bedienelemente

   `bedienelemente` ist der Nenner. Ohne ihn ist „null zu kleine Ziele" von „ich
   habe nichts angesehen" nicht zu unterscheiden — dieselbe Falle, in die die
   Ausleseregel von Nr. 4 gefallen war, dort mit `knoepfe > 0` als Ausweg. Die
   Ebene macht ihre Breite darum von `bedienelemente > 0` abhängig.

   Grösse heisst `min(Breite, Höhe)`: bei allen bisherigen Funden war die HÖHE zu
   klein, die Breite nie.
   ════════════════════════════════════════════════════════════════════════════ */

/* WCAG 2.5.8 AA. Nicht 44 px: das wäre 2.5.5 AAA, und AAA bindet nicht. */
const PFLICHT_PX = 24;

/* ── DIESE FUNKTION LÄUFT IM BROWSER ───────────────────────────────────────
   Sie wird als Zeichenkette übertragen (`page.evaluate`) und hat dort KEINEN
   Zugriff auf den Gültigkeitsbereich dieser Datei. Alles, was sie braucht, steht
   in ihr oder kommt als Argument — auch `mindest`, das sonst die naheliegende
   Falle wäre: eine Konstante von aussen, die im Browser `undefined` ist, macht
   jeden Vergleich falsch und die Erhebung still leer.

   `raum` ist ein Selektor auf die NACHFAHREN des Erhebungsraums (`'#content *'`,
   `'.app-fuss *'`, `'body *'`) — der Raum ist eine Bedingung der Zahl und wird
   deshalb übergeben, nicht angenommen. */
function erheben({ mindest, raum }) {
  const ECHT = 'button, a[href], input:not([type=hidden]), select, textarea, summary, ' +
    '[role=button], [role=link], [role=checkbox], [role=radio], [role=tab], [role=switch], [role=menuitem]';
  const sichtbar = (e) => {
    const c = getComputedStyle(e), b = e.getBoundingClientRect();
    return c.display !== 'none' && c.visibility !== 'hidden' && b.width > 0 && b.height > 0;
  };
  /* ── DIE AUSNAHME PRÜFT DEN ZWEITEN HALBSATZ DER NORM (A14, 28.07.2026) ───
     WCAG 2.5.8 macht die Inline-Ausnahme in ZWEI Gliedern:
       (a) „the target is in a sentence" ODER
       (b) „its size is otherwise constrained by the line-height of non-target
            text".

     BIS HEUTE STAND HIER (a) IM KOMMENTAR UND EINE HEURISTIK FÜR (b) IM CODE —
     und beides passte nicht zusammen. Die Erhebung von A14 hat alle sieben
     ausgenommenen Elemente vorgelegt: es sind ausnahmslos Quellenzeilen der Form
     „Behörde · [Link Titel] · Stand — Lizenz" in `<p class="wortlaut-quelle">`.
     KEINE davon ist ein Satz — keine endet mit einem Satzzeichen, alle sind
     `·`-getrennte Nachweise. Sie fallen unter (b), nicht unter (a).

     Ausgenommen sind sie zu Recht: ihre Höhe IST die Zeilenhöhe des Textes, in
     dem sie stehen. Aber die alte Bedingung — „der Elternknoten trägt mehr Text"
     — prüfte (b) nur ungefähr und hatte ein Loch: ein Link, der ALLEIN auf
     seiner Zeile steht (etwa nach einem `<br>`), erfüllte sie und war doch von
     keinem Text beschränkt. Er wäre still durchgerutscht, und niemand hätte es
     bemerkt, weil das Ergebnis der Ebene dann null bleibt.

     JETZT WIRD (b) AN DER STRUKTUR GEPRÜFT statt an der Elterntext-Länge:
     grenzt der Link im Textfluss an Nicht-Ziel-Text — davor oder danach, ohne
     dass ein `<br>` oder ein Block dazwischen steht? Beide Richtungen zählen; ein
     Link, der einen Satz eröffnet, ist so gut beschränkt wie einer, der ihn
     schliesst.

     NICHT AN DER GERENDERTEN ZEILE, und das war ein Irrweg von einer halben
     Stunde: die erste Fassung fragte, ob sich der Link seine ZEILE mit Text
     teilt. Gemessen ⟦M⟧ war die Folge, dass dieselben sieben Quellenzeilen bei
     390 px Fund waren und bei 1280 px ausgenommen — weil der Absatz schmal
     umbricht und der Link auf der letzten Zeile allein landet. Eine Ausnahme,
     die mit der Fensterbreite flackert, ist falsch gebaut: ob ein Ziel im
     Textfluss steht, ist eine Eigenschaft des DOKUMENTS, nicht des Fensters.
     Und eine Grundlinie müsste den Flackerzustand je Breite mitschleppen.

     Ein `<br>` dagegen trennt IMMER, auf jeder Breite — deshalb ist er die
     richtige Grenze und der Zeilenumbruch nicht.

     ANDERE LINKS ZÄHLEN NICHT ALS NICHT-ZIEL-TEXT. Zwei Ziele nebeneinander
     beschränken einander nicht; sie sind beide zu klein. Sonst deckte eine Reihe
     von Knopf-Links sich gegenseitig. */
  const istTrenner = (n) => n.tagName === 'BR' || !getComputedStyle(n).display.startsWith('inline');
  const nichtZielTextDaneben = (e, vorwaerts) => {
    let n = vorwaerts ? e.nextSibling : e.previousSibling;
    while (n) {
      if (n.nodeType === 1) {
        if (istTrenner(n)) return false;              // `<br>` oder Block: hier endet der Fluss
        if (!n.matches('a[href]') && (n.textContent || '').trim()) return true;
      } else if (n.nodeType === 3 && (n.nodeValue || '').trim()) {
        return true;
      }
      n = vorwaerts ? n.nextSibling : n.previousSibling;
    }
    return false;
  };
  const imFliesstext = (e) => {
    if (e.tagName !== 'A') return false;
    if (!getComputedStyle(e).display.startsWith('inline')) return false;
    if (!e.parentElement) return false;
    return nichtZielTextDaneben(e, false) || nichtZielTextDaneben(e, true);
  };
  /* ── DIE ZWEITE AUSNAHME DER NORM: „equivalent target" (Reihenfolge II #1,
     10.08.2026) ──────────────────────────────────────────────────────────
     WCAG 2.5.8 lässt ein zu kleines Ziel auch dann zu, wenn „a sufficiently
     large equivalent target" daneben steht. Beim Kästchen ist das umschliessende
     `<label>` das gleichwertige Element: ein Klick darauf löst denselben
     Zustandswechsel aus wie ein Klick auf das Kästchen selbst.

     ANLASS: beim `gdb_merkmale`-Umbau (F4, 09.08.2026) fiel zum ersten Mal ein
     `mehrfachauswahl`-Kästchen als GEWÖHNLICHES Sektorfeld an — die elf
     bisherigen Fälle stehen alle hinter einem Instrument-Detail-Modal und
     wurden von der Erhebung nie erreicht. A104 (05.08.2026) hatte für diese elf
     bereits entschieden, dass das sichtbare Kästchen 13 px bleibt und die
     Trefferfläche vom Label getragen wird — nur stand diese Entscheidung
     nirgends im WÄCHTER, nur im CSS eines einzelnen Felds
     (`[data-edit-multi="gdb_merkmale"]`). Ein Handgriff, der beim nächsten
     `mehrfachauswahl`-Sektorfeld erneut fällig gewesen wäre.

     GEPRÜFT WIRD DIE STRUKTUR, NICHT DIE BEHAUPTUNG: `e.labels` ist die native
     Zuordnung des Formularfelds — ein umschliessendes `<label>` genauso wie
     eines über `for=`. Das Label muss sichtbar sein UND selbst die 24 Pixel
     erreichen; ein zu kleines oder ausgeblendetes Label trägt keine
     Trefferfläche und die Ausnahme greift nicht. Nur Kästchen und Radios
     kommen infrage — bei ihnen macht WCAG das gleichwertige-Ziel-Beispiel
     ausdrücklich, und eine weitere Öffnung wäre ein Scheunentor, das diese enge
     Prüfung nicht rechtfertigt. */
  const gleichwertigesEtikett = (e) => {
    if (e.tagName !== 'INPUT' || (e.type !== 'checkbox' && e.type !== 'radio')) return null;
    for (const label of e.labels || []) {
      if (!sichtbar(label)) continue;
      const b = label.getBoundingClientRect();
      if (Math.min(b.width, b.height) >= mindest) return label;
    }
    return null;
  };
  /* Die Stelle wird BENANNT, nicht beschrieben: `select`, `a.toc-sprung`. So
     lässt sich ein Fund in einer Probe wiederfinden (`stelle=select`), ohne dass
     der Ausdruck den Text mitschreiben muss, der sich jederzeit ändert. */
  const benennen = (e) => {
    const erste = String(e.className || '').trim().split(/\s+/).filter(Boolean)[0];
    return e.tagName.toLowerCase() + (erste ? '.' + erste : '');
  };
  const notieren = (e) => {
    const b = e.getBoundingClientRect();
    return {
      tag: e.tagName, klasse: String(e.className || '') || '—', stelle: benennen(e),
      text: (e.textContent || '').trim().slice(0, 30),
      breite: +b.width.toFixed(1), hoehe: +b.height.toFixed(1),
      kleinste: +Math.min(b.width, b.height).toFixed(1),
    };
  };

  /* JEDER `continue` OBEN ZÄHLT HIER MIT. Ein Ausnahmegrund ohne Zähler ist der
     Ort, an dem Funde verschwinden, ohne dass die Fundzahl es sagt. */
  const ausnahmen = { unsichtbar: 0, keinBedienelement: 0, fliesstext: 0, gleichwertigesEtikett: 0 };
  let betrachtet = 0, gesehen = 0, bedienelemente = 0;
  const zuKlein = [], ausgenommen = [];
  for (const e of document.querySelectorAll(raum)) {
    betrachtet++;
    if (!sichtbar(e)) { ausnahmen.unsichtbar++; continue; }
    gesehen++;
    if (!e.matches(ECHT)) { ausnahmen.keinBedienelement++; continue; }
    if (imFliesstext(e)) {
      ausnahmen.fliesstext++;
      // In der LISTE nur die, die OHNE die Ausnahme ein Fund wären — sonst
      // stünde dort jeder Link der Anwendung und sie sagte nichts. Gezählt wird
      // trotzdem jeder: die Zahl misst die Reichweite der Ausnahme, die Liste
      // ihre Wirkung.
      const n = notieren(e);
      if (n.kleinste < mindest) ausgenommen.push(n);
      continue;
    }
    if (gleichwertigesEtikett(e)) {
      ausnahmen.gleichwertigesEtikett++;
      const n = notieren(e);
      if (n.kleinste < mindest) ausgenommen.push(n);
      continue;
    }
    bedienelemente++;
    const n = notieren(e);
    if (n.kleinste < mindest) zuKlein.push(n);
  }
  return { betrachtet, gesehen, bedienelemente, ausnahmen, ausgenommen, zuKlein };
}

module.exports = { erheben, PFLICHT_PX };
