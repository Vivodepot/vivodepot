#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kontrast messen — die ganze Hintergrundkette, nicht der erste Treffer
   ────────────────────────────────────────────────────────────────────────────
   WOZU. Die Reparatur der Kontrast-Rechnung braucht einen Prüfvektor, der
   GEMESSEN ist und nicht erfunden: eine echte Stelle in der Anwendung, ihre
   echte Farbkette, und beide Zahlen — die der alten Rechnung und die der neuen.
   Ohne die Messung wäre die Zusicherung im Test eine Zahl, die jemand gewählt
   hat, und die Reparatur bewiese sich selbst.

   Die Seite liefert nur ROHE Zeichenketten: die Textfarbe und die Hintergründe
   der ganzen Vorfahrenkette. Gerechnet wird in Node, mit `tools/lib/kontrast.js` —
   demselben Modul, das die Kampagne benutzt und das die Suite prüft. Zwei
   Rechnungen an zwei Orten wären zwei Ergebnisse.

   Aufruf (die Vorgabe ist der VOLLE Umfang — 3 Themes x 3 Skalen ueber `body`):
     node tools/kontrast-messen.js                      → alle Funde, nach
                                                          Geltungsbereich geordnet
     node tools/kontrast-messen.js --alt 1.66           → gezielt eine Stelle
     node tools/kontrast-messen.js --nur-hell           → nur helles Theme, eine Skala
     node tools/kontrast-messen.js --bereich '#content' → nur der Inhaltsbereich
     node tools/kontrast-messen.js --json
   ════════════════════════════════════════════════════════════════════════════ */
const K = require('./lib/kontrast.js');
const { echteSektorenListe } = require('./lib/sektoren.js');

const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
const PW = 'Kontrast-2026!';
// T11-Muster (31.07.2026): vom Kern gelesen, nicht von Hand gepflegt — die alte Handkopie
// hier führte nur zehn Einträge und driftete lautlos hinter „persoenliches" (U2-ADR-041)
// und jetzt „krisenvorsorge" (F6, 10.08.2026) her. Gefunden beim Stumme-Prüfer-Auftrag.
const SEKTOREN = echteSektorenListe();
const ALT_GESUCHT = arg('alt', null) ? parseFloat(arg('alt')) : null;
/* ── DER VOLLE UMFANG IST DIE VORGABE, nicht der Schalter (28.07.2026, B2) ──
   Bis heute stand hier `--alle-themes` als OPT-IN und `#content` als Bereich.
   Wer das Werkzeug ohne Flags aufrief — also jeder, der es zum ersten Mal
   aufruft —, mass ein Theme, eine Skala und den Inhaltsbereich, und bekam eine
   Zahl, die nach dem ganzen Haus aussah. Die 87 Funde im Nachtmodus lagen
   ausserhalb dieser Vorgabe, die Knöpfe der Topbar auch.

   Ein Messwerkzeug, dessen Vorgabe den Geltungsbereich verengt, meldet auf
   alles ausserhalb nicht „anderer Wert", sondern GAR NICHTS — und ein
   Leerbefund sieht aus wie ein sauberer Befund. Die Verengung braucht deshalb
   den Schalter, nicht die Weite: `--nur-hell` und `--bereich #content`.

   Die neun Kombinationen sind dieselben wie in Ebene 4 der Kampagne. */
const NUR_HELL = argv.includes('--nur-hell');
const BEREICH = arg('bereich', 'body');
const THEMES = NUR_HELL ? [''] : ['', 'dark-mode', 'high-contrast'];
const SKALEN = NUR_HELL ? [''] : ['', 'fs-medium', 'fs-large'];

/* ── GESCHLOSSEN 28.07.2026 — die Hypothese ist tot, die Messung bleibt ────
   Fix-CC hat seine Kette gemeldet: `grundGefunden: true`, Grund [5], Ausgabe
   5,5. Sein Werkzeug hat NIE falsch gerechnet. Die 5,23 stammt aus einer
   Handprobe, die im Bericht an die Stelle des gemessenen Werts geriet — daher
   auch der unerklaerte Rest von 0,01: er war nie eine Rechnung, er war Rundung
   von Hand.

   Damit sind BEIDE Fassungen der Hypothese hinfaellig, die grobe wie die feine.
   Was bleibt, ist nicht die Vermutung, sondern ihr Nebenergebnis: ueber 4617
   Messstellen faellt das Urteil zwischen beiden Rechenwegen an KEINER Stelle
   auseinander, und beide liefern 87. Das ist der Beleg dafuer, dass die
   Zaehlungen nicht davon abhaengen, welchen Grund man nimmt — und er ist
   unabhaengig davon, ob je ein Werkzeug so gerechnet hat.

   Die Funktion bleibt deshalb stehen, aber als VARIANTE, nicht als Verdacht.
   Wer sie als Verdacht liest, jagt eine Frage, die zu ist. Das ist mir bereits
   passiert: ich habe die Kettenmeldung als „einzigen Weg" gefordert, nachdem sie
   schon geliefert war.

   ── Die urspruengliche Fragestellung, als Herkunft ────────────────────────── */

/* ── Die HYPOTHESE ueber das verworfene Werkzeug ───────────────────────────
   Sie steht hier und NICHT in `lib/kontrast.js`: dort gehoert die geltende
   Rechnung hin, nicht eine zweite, von der wir annehmen, dass sie falsch ist.
   `kontrastAlt` steht dort nur, weil es die Negativkontrolle der Reparatur ist.

   Was sie nachstellt: die Kette wird komponiert, aber der ERSTE deckende Grund
   wird uebersprungen und gegen den naechsten dahinter gerechnet. Beim Foto-Griff
   ergibt das 5,22 — nahe genug an den gemeldeten 5,23, um die Ursache zu
   vermuten, und nicht nah genug, um sie zu behaupten. Der Rest von 0,01 bleibt
   unerklaert, bis Fix-CC seine Kette und sein Grund-Glied meldet.

   GEMESSEN 28.07., und es hat die Hypothese in ihrer ersten Fassung WIDERLEGT:
   wer JEDEN ersten deckenden Grund ueberspringt — auch den des Elements selbst —,
   bekommt auf jedem Knopf Kontrast 1,00, weil heller Text dann gegen die helle
   Karte statt gegen den dunklen Knopf gerechnet wird. Fix-CC hat fuer `.btn`
   aber 2,40 gemeldet, nicht 1,00. Die grobe Fassung scheidet damit aus; geprueft
   wird die feine, die den EIGENEN Grund behaelt und nur Vorfahren ueberspringt.
   Beide Fassungen stehen hier, weil der Unterschied zwischen ihnen die Messung ist. */
function kontrastUebersprungen(farbe, kette, eigenenGrundBehalten = true) {
  let ersterDeckenderWeg = false;
  const rest = [];
  for (let i = 0; i < kette.length; i++) {
    const f = K.parseFarbe(kette[i]);
    // [0] ist der Hintergrund des Elements SELBST. Ihn zu ueberspringen ist eine
    // andere und viel groebere Operation als einen Vorfahren zu ueberspringen —
    // siehe die Messung unten.
    const eigener = i === 0 && eigenenGrundBehalten;
    if (f && f.a >= 1 && !ersterDeckenderWeg && !eigener) { ersterDeckenderWeg = true; continue; }
    rest.push(kette[i]);
  }
  if (!ersterDeckenderWeg) return null;      // ohne uebersprungenen Grund gibt es keinen Unterschied
  return K.kontrast(farbe, rest);
}

/* Was im Browser abgelesen wird — Zeichenketten, keine Zahlen. Die Seite
   rechnet nicht; sie berichtet. */
function ablesen(bereich) {
  const sicht = (e) => {
    const c = getComputedStyle(e), b = e.getBoundingClientRect();
    return c.display !== 'none' && c.visibility !== 'hidden' && b.width > 0 && b.height > 0;
  };
  /* EIGENER TEXT statt `textContent`, und KEIN Ausschluss von Elementen mit
     Kindern (28.07.2026, B2).

     Die erste Fassung verlangte `e.children.length === 0` — sie mass nur Blätter.
     Ein Knopf mit Symbol hat aber ein Kind, und sein Text ist trotzdem seiner:
     von SIEBEN sichtbaren `.btn` in einer einzigen Ansicht wurden ZWEI gemessen.
     Ausgerechnet die `.btn`-Werte, um die es in Fixliste Nr. 4 geht, fielen so
     heraus — und das Werkzeug meldete darüber nicht „anderer Wert", sondern GAR
     NICHTS. Ein Leerbefund sieht aus wie ein sauberer Befund.

     Gemessen wird jetzt der Text, der dem Element SELBST gehört: seine direkten
     Textknoten. Er trägt dessen `color` und `font-size`, also ist das Element
     die richtige Messstelle. Kindelemente werden für ihren eigenen Text separat
     gemessen — doppelt gezählt wird nichts. */
  const eigenerText = (e) => [...e.childNodes]
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent.trim())
    .filter(Boolean).join(' ');
  const raus = [];
  for (const e of [...document.querySelectorAll(bereich + ' *')].filter(sicht)) {
    const text = eigenerText(e);
    if (text.length < 2) continue;
    const c = getComputedStyle(e);
    const kette = [];
    for (let p = e; p; p = p.parentElement) kette.push(getComputedStyle(p).backgroundColor);
    raus.push({
      sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : (e.className ? '.' + String(e.className).split(' ')[0] : '')),
      text: text.slice(0, 40),
      farbe: c.color, kette, fs: parseFloat(c.fontSize),
      ariaLabel: e.getAttribute('aria-label') || null,
    });
  }
  return raus;
}

/* ── STUMME-PRÜFER-FUND (10.08.2026): eigene, driftende Kopie ersetzt ─────────
   Diese Funktion baute den Anlege-Weg von Hand nach — Feld für Feld, Knopf per
   Text-Regex gesucht, Erfolg über `#id-pw`-Restbreite geraten. Seit dem Auftrag
   „Depot ist Datei" (08.08.2026) holt der Anlege-Weg ein Dateiziel per
   `showSaveFilePicker()` — OHNE eine Attrappe bleibt der Aufruf im headless
   Chromium unbeantwortet hängen (Grund steht in `fsaStandardAttrappeEinrichten`,
   `tests/e2e/helpers.js`). Diese Kopie kannte die Attrappe nie, driftete lautlos
   hinter dem echten Weg her und brach mit „Depot nicht eingerichtet" ab — ein
   stummer Prüfer, keine Meldung über die eigentliche Ursache.

   Der lebende, gepflegte Weg steht in `tests/e2e/helpers.js`
   (`oeffneApp`/`depotAnlegen`) — von JEDEM E2E-Test verwendet, sofort rot, wenn
   der Anlege-Weg sich wieder ändert. Zwei Kopien desselben Wegs sind zwei Wege,
   die auseinanderdriften können; dieselbe Begründung wie bei T11
   (`tools/lib/sektoren.js`). */
async function depotEinrichten(seite) {
  const { oeffneApp, depotAnlegen } = require('../tests/e2e/helpers.js');
  await oeffneApp(seite);
  await depotAnlegen(seite, { name: 'Marlies Beispiel', pw: PW });
  // Kein Rückgabewert zu deuten: `depotAnlegen` wirft (Playwright-Timeout) bei jedem
  // Fehlschlag selbst, mit dem Schritt, an dem es hängen blieb — genauer als die alte
  // Ja/Nein-Ratefrage über eine verbliebene `#id-pw`-Restbreite.
}

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const stellen = [];
  try {
    const seite = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await depotEinrichten(seite);
    for (const th of THEMES) for (const sk of SKALEN) for (const sid of SEKTOREN) {
      const ok = await seite.evaluate(([t, s, sekt]) => {
        document.documentElement.className = [t, s].filter(Boolean).join(' ');
        try { window.__vdOeffentlich.oeffneSektor(sekt); return true; } catch (_) { return false; }
      }, [th, sk, sid]);
      if (!ok) continue;
      await seite.waitForTimeout(60);
      const abgelesen = await seite.evaluate(`(${ablesen.toString()})(${JSON.stringify(BEREICH)})`);
      for (const r of abgelesen) {
        stellen.push({ ...r, sektor: sid, theme: th || 'hell', skala: sk || 'normal' });
      }
    }
    await seite.close();
  } finally { await browser.close(); }

  /* ZUSTANDSANSAGE: sind ueberhaupt Stellen mit Farbe gemessen worden? */
  if (!stellen.length) {
    console.error('KEINE EINZIGE STELLE gemessen — das ist kein Ergebnis, sondern ein Abbruch.');
    process.exit(2);
  }

  const zeilen = [];
  for (const s of stellen) {
    const neu = K.kontrast(s.farbe, s.kette);
    const alt = K.kontrastAlt(s.farbe, K.ersterNichtTransparenter(s.kette));
    if (!neu || alt == null) continue;
    const uebersprungen = kontrastUebersprungen(s.farbe, s.kette);
    const soll = s.fs >= 18.66 ? 3 : 4.5;
    zeilen.push({ ...s, alt, neu: neu.wert, soll, gedeckt: neu.gedeckt,
      uebersprungen: uebersprungen ? uebersprungen.wert : null,
      dreht: alt < soll && neu.wert >= soll });
  }

  const gedreht = zeilen.filter((z) => z.dreht);
  const gesucht = ALT_GESUCHT != null ? zeilen.filter((z) => Math.abs(z.alt - ALT_GESUCHT) < 0.005) : [];

  /* ── DIE FUNDE, mit dem Geltungsbereich als ERSTEM Schlüssel ──────────────
     Eine Kontrastzahl ohne Theme ist keine Zahl — das ist die Lehre aus dem
     gestrichenen Posten Nr. 5 der Fixliste. Darum wird nicht eine Gesamtzahl
     gemeldet und der Geltungsbereich dahinter, sondern umgekehrt. */
  const funde = zeilen.filter((z) => z.neu < z.soll);
  const bereiche = {};
  for (const z of funde) {
    const schluessel = `${z.theme}/${z.skala}`;
    (bereiche[schluessel] ||= { funde: 0, stellen: new Set(), sektoren: new Set() });
    bereiche[schluessel].funde++;
    bereiche[schluessel].stellen.add(z.sel);
    bereiche[schluessel].sektoren.add(z.sektor);
  }
  const bereicheFlach = Object.fromEntries(Object.entries(bereiche).map(([k, v]) =>
    [k, { funde: v.funde, verschiedeneStellen: v.stellen.size, sektoren: v.sektoren.size }]));

  /* ── ZUSTANDSANSAGE: sind die Knöpfe wirklich dabei? ──────────────────────
     Der Mangel, den B2 behebt, war kein falscher Wert, sondern ein FEHLENDER:
     `.btn` wurde gar nicht abgelesen, und die Ausgabe sah trotzdem vollständig
     aus. Eine Zahl, die diese Klasse nicht enthält, darf nicht als Zahl über
     das Haus gelten — also wird gezählt und gesagt, nicht angenommen. */
  const knoepfe = zeilen.filter((z) => /\.btn|button/.test(z.sel)).length;
  if (!knoepfe) {
    console.error('ABBRUCH: kein einziger Knopf gemessen. Genau dieser Leerbefund sah bis zum\n' +
      '28.07. wie ein sauberer Befund aus — die Ausleseregel liess Elemente mit\n' +
      'Kindelementen aus und damit jeden Knopf mit Symbol. Wer diese Meldung sieht,\n' +
      'hat entweder den Bereich zu eng gewaehlt oder die Regel ist wieder verengt.');
    process.exit(2);
  }

  if (argv.includes('--json')) {
    console.log(JSON.stringify({
      gemessen: zeilen.length, knoepfe, geltungsbereich: { themes: THEMES.map((t) => t || 'hell'),
        skalen: SKALEN.map((s) => s || 'normal'), bereich: BEREICH, breite: 390 },
      nachGeltungsbereich: bereicheFlach, funde, gedreht, gesucht,
    }, null, 1));
    return;
  }
  const unter = (feld) => zeilen.filter((z) => z[feld] != null && z[feld] < z.soll).length;
  const mitU = zeilen.filter((z) => z.uebersprungen != null);
  const strittig = mitU.filter((z) => (z.neu < z.soll) !== (z.uebersprungen < z.soll));
  console.log(`Kontrast gemessen an ${zeilen.length} Stellen · ${THEMES.length}x${SKALEN.length}x${SEKTOREN.length} Kombinationen · Bereich ${BEREICH} · 390 px`);
  console.log(`davon Knöpfe: ${knoepfe}${NUR_HELL ? '   ⚠ --nur-hell: der Nachtmodus ist NICHT gemessen' : ''}\n`);
  console.log('  FUNDE NACH GELTUNGSBEREICH (Theme/Skala zuerst — eine Kontrastzahl ohne Theme ist keine Zahl):');
  for (const [k, v] of Object.entries(bereicheFlach).sort((a, b) => b[1].funde - a[1].funde)) {
    console.log(`    ${k.padEnd(26)} ${String(v.funde).padStart(4)} Funde · ${v.verschiedeneStellen} verschiedene Stellen · ${v.sektoren} Bereiche`);
  }
  if (!funde.length) console.log('    keine — kein Element unter seiner Schwelle');
  console.log('');
  console.log(`  ALT unter Schwelle            : ${unter('alt')}`);
  console.log(`  NEU unter Schwelle            : ${unter('neu')}`);
  console.log(`  ÜBERSPRUNGEN unter Schwelle   : ${unter('uebersprungen')}  (Hypothese ueber das verworfene Werkzeug)`);
  console.log(`  von der Reparatur umgedreht   : ${gedreht.length}`);
  console.log(`  Stellen mit uebersprungenem Grund: ${mitU.length} · davon URTEILSVERSCHIEDEN: ${strittig.length}\n`);
  if (strittig.length) {
    console.log('  URTEILSVERSCHIEDEN — hier trennen sich die beiden Rechnungen:');
    for (const z of strittig.slice(0, 10)) {
      console.log(`    ${z.theme}/${z.skala}/${z.sektor} ${z.sel} „${z.text.slice(0, 30)}"  neu ${z.neu} vs. uebersprungen ${z.uebersprungen} (soll ${z.soll})`);
    }
    console.log('');
  }
  const zeig = (liste, titel) => {
    if (!liste.length) return;
    console.log(titel);
    const gesehen = new Set();
    for (const z of liste) {
      const schluessel = z.sel + '|' + z.farbe + '|' + z.kette.join(',');
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      console.log(`  ${z.sektor}/${z.sel}  „${z.text}"`);
      console.log(`     alt ${z.alt}  →  neu ${z.neu}   (soll ${z.soll}${z.gedeckt ? '' : ', Grund angenommen weiss'})`);
      console.log(`     Farbe ${z.farbe}`);
      console.log(`     Kette ${JSON.stringify(z.kette.slice(0, 6))}`);
    }
    console.log('');
  };
  zeig(gesucht, `STELLEN MIT ALT = ${ALT_GESUCHT}:`);
  zeig(gedreht.slice(0, 12), 'VON DER REPARATUR UMGEDREHT (Auswahl):');
}

if (require.main === module) {
  main().catch((e) => { console.error('KONTRAST-MESSUNG GESCHEITERT:', e.message); process.exit(1); });
}
module.exports = { ablesen };
