'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fixliste Nr. 6 — Trefferflächen unter 24 px (WCAG 2.5.8 AA)
   ────────────────────────────────────────────────────────────────────────
   Gemessen wird die GERENDERTE Fläche, nicht die CSS-Regel. Eine Zusicherung
   auf `min-height: 24px` im Quelltext wäre Hülle statt Sache: sie hielte auch
   dann, wenn eine spätere Regel sie überschreibt.

   DIE EINGRENZUNG, und warum sie zur Prüfung gehört (⟦M⟧, 28.07.2026, neun
   Theme-Skalen-Kombinationen):
       cursor:pointer .............. 1308 Fälle   ← die Rohzahl, unbrauchbar
       echte Bedienelemente ........  195
       ohne Inline-Links im Text ...  153
       verschiedene Elemente .......   20   ← alle innerhalb von `#content`
   Von den 1308 sind 1116 SVG-Knoten — `path`, `svg`, `circle` INNERHALB von
   Knöpfen, die `cursor:pointer` erben. Der Knopf ist gross genug, sein Symbol
   ist es nie. Wer an der Rohzahl repariert, repariert Dekoration.

   DIE AUSNAHME, die WCAG 2.5.8 selbst macht: Links im Fliesstext sind
   ausgenommen. Im Bereich Gesundheit stehen zwei davon („Organspendeausweis
   nach § 2 TPG", „Informationsportal organspende") mit 15 px in einem längeren
   Absatz. Sie stehen bewusst NICHT auf der Reparaturliste — sie hier
   mitzuzählen hiesse, eine Norm strenger zu lesen, als sie ist, und den
   Fliesstext auseinanderzureissen.

   Grösse heisst hier `min(Breite, Höhe)`: bei den Funden war stets die HÖHE zu
   klein, die Breite nie.

   DER ERHEBUNGSRAUM VON NR. 6 IST `#content`, und das ist eine Bedingung, keine
   Nebensache. Im GANZEN Dokument waren es 23 statt 20: drei Fusszeilen-Links
   (Kontakt-Adresse, Codeberg, „Aktualisierungen") rendern 18,6 px und liegen
   ausserhalb. Sie waren NICHT Teil von Nr. 6 — der Posten wurde in `#content`
   gemessen.

   ERWEITERT AM 28.07.2026 — B12 der Arbeitsliste. Hier stand: „Wer diese Prüfung
   erweitert, erweitert damit den Posten." Der Satz gilt, und genau deshalb steht
   die Erweiterung als eigener Posten und geschieht nicht nebenbei. Die drei sind
   repariert, und die zwei B12-Prüfungen unten messen die Fusszeile mit — in
   einem eigenen Erhebungsraum, damit die Zahl von Nr. 6 ihre Bedingung behält.

   Die offene Frage war, ob die Fusszeile mitzählt. GEMESSEN, nicht abgewogen:
   die drei rendern `display: block`, jeder auf eigener Zeile. Die Inline-Ausnahme
   gilt für Ziele, deren Grösse durch die Zeilenhöhe umgebenden Textes bedingt ist
   — hier ist keiner.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { oeffneApp, depotAnlegen } = require('./helpers');

const SEKTOREN = ['identity', 'health', 'finance', 'housing', 'mobility',
  'advanceCare', 'administration', 'people', 'education', 'socialInsurance'];

/* ── DIE EINGRENZUNG STEHT SEIT A5 AN EINEM ORT (28.07.2026) ───────────────
   Sie stand hier als `ERHEBUNG` — dreissig Zeilen, die die Abnahme-Ebene 4b der
   Kampagne hätte abschreiben müssen. Genau das ist am selben Tag einmal
   passiert: `ebene4()` trug eine wortgleiche Kopie der Ausleseregel aus
   `kontrast-messen.js` samt ihres Fehlers und hätte Fixliste Nr. 4 grün
   abgenommen, ohne deren Gegenstand je gemessen zu haben (A4).

   Zwei Regeln an zwei Orten sind zwei Regeln. Diese Prüfung und Ebene 4b messen
   ab jetzt mit derselben, und die Regel hat ihre eigene rotmachbare Prüfung:
   `tests/mit-modul/trefferflaechen-erhebungsregel.test.js`.

   AN DEN ZAHLEN DIESES POSTENS ÄNDERT DAS NICHTS — die Regel ist Zeile für Zeile
   dieselbe, sie liegt nur woanders. Was hinzukommt, ist der NENNER
   (`bedienelemente`) und die gezählte Ausnahme (`ausgenommen`); die Funde stehen
   unverändert in `.zuKlein`. */
const { erheben: ERHEBUNG, PFLICHT_PX } = require(
  path.join(__dirname, '..', '..', 'tools', 'lib', 'trefferflaechen.js'));

/* Bereichswechsel über `window.__vdOeffentlich.oeffneSektor`, NICHT über den Klick auf die
   Seitenleiste. Grund, gemessen: am Handy-Ausschnitt liegt die Leiste hinter dem
   Menü, der Klick wird nie sichtbar und der Lauf läuft in den Timeout. Derselbe
   Weg, den die Kampagne fährt.
   Was dadurch NICHT geprüft wird: der Navigationsweg selbst. Das ist hier auch
   nicht der Gegenstand — Nr. 6 fragt nach der Grösse der Bedienelemente IM
   Bereich, und die Leisten-Knöpfe sind bei 390 px ohnehin nicht sichtbar. */
async function erhebeUeberAlleBereiche(page, mindest) {
  const funde = [];
  for (const sid of SEKTOREN) {
    await page.evaluate((s) => { window.__vdOeffentlich.oeffneSektor(s); }, sid);
    await page.waitForSelector('#content .bereich-kopf');
    const { zuKlein } = await page.evaluate(ERHEBUNG, { mindest, raum: '#content *' });
    for (const f of zuKlein) funde.push({ bereich: sid, ...f });
  }
  return funde;
}

/* Gemessen wird am HANDY-Ausschnitt (390×900). Nicht aus Bequemlichkeit: dort
   bedient die Zielgruppe, und die Fixliste begründet den Posten genau damit
   („am Handy, oft mit unruhiger Hand"). Bei breiterem Ausschnitt fallen Elemente
   aus der Erhebung, die hier zu klein sind — die erste Fassung dieser Prüfung
   sah bei 500 px siebzehn Elemente, gemessen waren zwanzig. */
const HANDY = { width: 390, height: 900 };

test.describe('Fixliste Nr. 6 — Trefferflächen', () => {
  test('kein Bedienelement unter 24 px — zehn Bereiche × drei Themes × drei Schriftskalen', async ({ page }) => {
    await page.setViewportSize(HANDY);
    await oeffneApp(page);
    await depotAnlegen(page);

    const alle = [];
    // Die Abnahmebedingung lautet „in allen Themes UND Skalen". Beide Achsen zu
    // fahren ist der Unterschied zwischen der Bedingung und einem Ausschnitt.
    for (const theme of ['', 'dark-mode', 'high-contrast']) {
      for (const skala of ['', 'fs-medium', 'fs-large']) {
        await page.evaluate(([t, s]) => {
          document.documentElement.className = [t, s].filter(Boolean).join(' ');
        }, [theme, skala]);
        for (const f of await erhebeUeberAlleBereiche(page, PFLICHT_PX)) {
          alle.push({ theme: theme || 'hell', skala: skala || 'normal', ...f });
        }
      }
    }

    const bericht = alle.map((f) =>
      `  ${f.theme}/${f.skala}/${f.bereich}: <${f.tag.toLowerCase()}> .${f.klasse} — ${f.breite}×${f.hoehe} px ` +
      `(kleinste ${f.kleinste}) „${f.text}"`).join('\n');
    expect(alle, `Trefferflächen unter ${PFLICHT_PX} px (WCAG 2.5.8 AA):\n${bericht}`).toEqual([]);
  });

  /* ── POSITIVKONTROLLE (§3.5b) ────────────────────────────────────────────
     Ohne sie ist diese Prüfung von einer, die nie etwas findet, nicht zu
     unterscheiden. Die Schwelle wird auf einen Wert gehoben, den die reparierten
     Elemente sicher unterschreiten — findet die Erhebung dann NICHTS, misst sie
     an der falschen Stelle, und das grüne Ergebnis oben ist wertlos. */
  test('Positivkontrolle: bei angehobener Schwelle findet dieselbe Erhebung sehr wohl etwas', async ({ page }) => {
    await page.setViewportSize(HANDY);
    await oeffneApp(page);
    await depotAnlegen(page);
    const funde = await erhebeUeberAlleBereiche(page, 48);
    expect(funde.length,
      'Bei 48 px muss die Erhebung Elemente melden — sonst greift sie ins Leere und ihr Schweigen bei 24 px bedeutet nichts.')
      .toBeGreaterThan(0);
  });

  /* ── NEGATIVKONTROLLE (§3.5d) ────────────────────────────────────────────
     Die Ausnahme darf nicht zum Scheunentor werden: die beiden Fliesstext-Links
     im Bereich Gesundheit sind mit 15 px kleiner als 24 und werden trotzdem
     nicht gemeldet. Diese Prüfung hält fest, dass sie EXISTIEREN und WARUM sie
     draussen bleiben — sonst fiele die Ausnahme eines Tages still weg oder
     wüchse still an. */
  test('Negativkontrolle: Links im Fliesstext bleiben ausgenommen — und es gibt sie wirklich', async ({ page }) => {
    await page.setViewportSize(HANDY);
    await oeffneApp(page);
    await depotAnlegen(page);
    await page.evaluate(() => { window.__vdOeffentlich.oeffneSektor('health'); });
    await page.waitForSelector('#content .bereich-kopf');
    const ausgenommen = await page.evaluate(() => {
      const raus = [];
      for (const a of document.querySelectorAll('#content a[href]')) {
        const b = a.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        const inline = getComputedStyle(a).display.startsWith('inline');
        const eltern = a.parentElement;
        const imText = eltern && (eltern.textContent || '').trim().length > (a.textContent || '').trim().length;
        if (inline && imText && Math.min(b.width, b.height) < 24) {
          raus.push({ text: (a.textContent || '').trim().slice(0, 40), kleinste: +Math.min(b.width, b.height).toFixed(1) });
        }
      }
      return raus;
    });
    expect(ausgenommen.length,
      'Ohne einen echten Fliesstext-Link unter 24 px prüft die Ausnahme nichts — dann wäre sie eine Behauptung.')
      .toBeGreaterThan(0);
  });

  /* ── B12 · Die Fusszeile (28.07.2026) ────────────────────────────────────
     Der Kopf dieser Datei sagte: „Wer diese Prüfung erweitert, erweitert damit
     den Posten." Genau das ist hier gewollt und entschieden — B12 der
     Arbeitsliste.

     Die offene Frage lautete, ob die Fusszeile mitzählt. Sie ist GEMESSEN
     beantwortet, nicht abgewogen: die drei Links rendern `display: block`, jeder
     auf eigener Zeile. Die Inline-Ausnahme von WCAG 2.5.8 gilt für Ziele, deren
     Grösse durch die Zeilenhöhe umgebenden Textes bedingt ist — hier ist keiner.
     Derselbe Fall wie die elf Sprungmarken, nur eine Etage tiefer. */
  test('B12: kein Bedienelement der Fusszeile unter 24 px', async ({ page }) => {
    await page.setViewportSize(HANDY);
    await oeffneApp(page);
    await depotAnlegen(page);
    await page.waitForSelector('.app-fuss a');
    const { zuKlein: funde } = await page.evaluate(ERHEBUNG, { mindest: PFLICHT_PX, raum: '.app-fuss *' });
    expect(funde, 'Fusszeilen-Ziele unter ' + PFLICHT_PX + ' px:\n' + JSON.stringify(funde, null, 1))
      .toEqual([]);
  });

  /* Ohne sie wäre „null Funde in der Fusszeile" auch von einer Erhebung erfüllt,
     die dort gar nichts sieht — die Klasse Fehler, an der `#content` selbst schon
     einmal zu eng war. */
  test('B12·Positivkontrolle: bei angehobener Schwelle findet dieselbe Erhebung die Fusszeile sehr wohl', async ({ page }) => {
    await page.setViewportSize(HANDY);
    await oeffneApp(page);
    await depotAnlegen(page);
    await page.waitForSelector('.app-fuss a');
    const { zuKlein: funde } = await page.evaluate(ERHEBUNG, { mindest: 40, raum: '.app-fuss *' });
    expect(funde.length,
      'Bei 40 px muss die Erhebung in der Fusszeile fündig werden. Tut sie es nicht, misst sie dort nichts — ' +
      'und die Null oben wäre ein Leerbefund, kein Ergebnis.')
      .toBeGreaterThan(0);
  });
});
