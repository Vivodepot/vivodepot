'use strict';
/* Bezug: vivodepot-navigations-panel-ergebnis-2026-08-26.md, Klick-Dummy validiert
   ("sonst einverstanden", 26.08.2026). NACHSEHEN bleibt default offen (Korrektur beider
   Kritiker) — nur die zwölf Bereiche wandern hinter "Alle Bereiche zeigen".

   NACHTRAG (28.08.2026, Entscheidung): "Weitermachen" war ein
   bereits VOR diesem Bau abgelehntes Konzept ("Leute tragen nicht kontinuierlich Sachen ein,
   wo sie vorher waren ist vollkommen egal") — beim ersten echten Durchlauf (leeres/frisches
   Vor-Depot, xShare) zeigte die Seitenleiste trotzdem sofort "Continue"/"Identity & person",
   obwohl nichts eingetragen war: `betreteApp()` ruft selbst `oeffneSektor(aktiverSektorId)`,
   was VOR jeder echten Eingabe schon einen Bereich als "besucht" markierte. Komplett entfernt,
   kein bedingtes Verstecken — die Besuchs-Historie (`_zuletztBesuchteBereicheIds` u. a.) ist
   ersatzlos raus (nirgends sonst gebraucht, geprüft vor dem Entfernen). Die drei betroffenen
   Proben unten sind entsprechend ersetzt; die verbleibenden zwei (NACHSEHEN, Depot verlassen)
   sind vom Wegfall unberührt.

   Rot-Beweis (echter TDD-Lauf VOR der Implementierung): "Weitermachen"-Block verschwindet
   erst NACH dem Entfernen der renderSidebar()-Sektion (vorher lief die neue Probe rot, weil
   der Block noch stand). Positivkontrolle: der Umschalter "Alle Bereiche zeigen" öffnet sich
   jetzt exakt dann, wenn ein Bereich aktiv ist — sonst bliebe die aktive Markierung hinter
   einem geschlossenen <details> verborgen (kein flacher Weitermachen-Knopf zeigt sie mehr). */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

describe('[renderSidebar] Navigation A (05.10.2026): Bereiche sichtbar, EIN eingeklappter Punkt „Austausch und Überblick“', () => {
  test('keine Hülle „Alle Bereiche zeigen“ mehr: die Bereiche stehen direkt unter dem Titel „Bereiche“', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    V.oeffneSituation('geburt');
    const html = document.getElementById('sidebar').innerHTML;
    assert.ok(!/bereiche-umschalter/.test(html), 'der Umschalter „Alle Bereiche zeigen“ ist entfallen');
    assert.ok(html.includes('<div class="gruppe-titel">' + V.STRINGS.gruppeBereiche + '</div>'), 'Titel „Bereiche“');
    assert.ok(html.indexOf(V.STRINGS.gruppeBereiche) < html.indexOf('data-sektor='), 'der Titel steht vor den Bereichen');
  });

  test('„Austausch und Überblick“ ist EIN eingeklappter Punkt, offen nur, wenn eine seiner Sichten aktiv ist', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    V.oeffneSektor('health');
    let html = document.getElementById('sidebar').innerHTML;
    const zu = html.match(/<details class="nav-gruppe nav-gruppe-austausch"[^>]*>/);
    assert.ok(zu, 'der Punkt fehlt im Markup');
    assert.ok(!zu[0].includes(' open'), 'ohne aktive Sicht daraus bleibt er zu');
    V.oeffneMappe();
    html = document.getElementById('sidebar').innerHTML;
    assert.ok(html.match(/<details class="nav-gruppe nav-gruppe-austausch"[^>]*>/)[0].includes(' open'), 'mit aktiver Sicht daraus ist er offen');
  });

  test('jeder Weg des Punkts steht genau einmal in der Seitenleiste und in ihm (nicht mehr zwei Gruppen NACHSEHEN/AUSTAUSCH)', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    const html = document.getElementById('sidebar').innerHTML;
    const start = html.indexOf('<details class="nav-gruppe nav-gruppe-austausch"');
    const punkt = html.slice(start, html.indexOf('</details>', start));
    assert.ok(start >= 0, 'der Punkt fehlt im Markup');
    for (const anker of ['data-einlesen-zentral', 'data-weitergeben-zentral', 'data-uebergabe-protokoll', 'data-mappe', 'data-prueftermine', 'data-verwaltete-depots']) {
      assert.equal(html.split(anker + '=').length - 1, 1, anker + ' genau einmal in der Seitenleiste');
      assert.ok(punkt.includes(anker + '='), anker + ' steht im Punkt „Austausch und Überblick“');
    }
    assert.equal(html.split('class="gruppe-titel"').length - 1, 1, 'nur noch EIN Gruppentitel („Bereiche“), keine Titel NACHSEHEN/AUSTAUSCH');
  });

  test('"Weitermachen" erscheint NIRGENDS mehr — auch nicht nach mehreren Bereichsbesuchen (Entscheidung 28.08.2026)', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    V.oeffneSektor('health');
    V.oeffneSektor('finance');
    V.oeffneSektor('health');   // erneuter Besuch — frühere Auslöser für den Bug
    const html = document.getElementById('sidebar').innerHTML;
    assert.ok(!html.includes('gruppe-titel">Weitermachen'), '"Weitermachen"-Block darf nicht mehr im Markup stehen, egal wie oft navigiert wurde');
    // Der aktive Bereich bleibt trotzdem erkennbar — nur eben ausschließlich im Zwölf-Bereiche-Baum.
    assert.match(html, /<button class="nav-item aktiv" data-sektor="health">/);
  });

  test('Depot verlassen bleibt eigene, kleine Zeile ganz unten, ohne Gruppe', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    const html = document.getElementById('sidebar').innerHTML;
    assert.match(html, /<button class="nav-item nav-item-klein" data-verlassen="1">/);
    assert.ok(html.lastIndexOf('data-verlassen') > html.lastIndexOf('data-verwaltete-depots'),
      'Depot verlassen muss nach dem Punkt „Austausch und Überblick“ stehen');
  });
});
