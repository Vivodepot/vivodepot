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

describe('[renderSidebar] Fortsetzen-Fokus: Bereiche-Baum hinter Umschalter, NACHSEHEN offen', () => {
  test('keine Bereichs-Ansicht aktiv (Anlass-/Situationsansicht): "Alle Bereiche zeigen" ist ZU', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    V.oeffneSituation('geburt');   // wechselt aktiveAnsicht auf 'situation', kein Bereich mehr aktiv
    const html = document.getElementById('sidebar').innerHTML;
    const umschalter = html.match(/<details class="bereiche-umschalter"[^>]*>/);
    assert.ok(umschalter, '"Alle Bereiche zeigen"-Umschalter fehlt im Markup');
    assert.ok(!umschalter[0].includes(' open'), 'ohne aktiven Bereich darf der Umschalter nicht offen sein');
  });

  test('ein Bereich ist aktiv: "Alle Bereiche zeigen" ist OFFEN — sonst verschwindet die aktive Markierung hinter dem geschlossenen <details>', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    V.oeffneSektor('health');
    const html = document.getElementById('sidebar').innerHTML;
    const umschalter = html.match(/<details class="bereiche-umschalter"[^>]*>/);
    assert.ok(umschalter, '"Alle Bereiche zeigen"-Umschalter fehlt im Markup');
    assert.ok(umschalter[0].includes(' open'), 'mit aktivem Bereich muss der Umschalter offen sein (Weitermachen zeigt die Markierung nicht mehr ersatzweise an)');
  });

  test('NACHSEHEN-Gruppe ist IMMER offen, unabhängig vom Bereiche-Umschalter', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    const html = document.getElementById('sidebar').innerHTML;
    const nachsehen = html.match(/<div class="gruppe-titel">Nachsehen<\/div>[\s\S]*?(?=<div class="gruppe-titel">|<div class="verlassen")/);
    assert.ok(nachsehen, 'NACHSEHEN-Block nicht gefunden');
    assert.match(nachsehen[0], /Meine Dokumente/);
    assert.match(nachsehen[0], /Herausgegeben/);
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
      'Depot verlassen muss nach Austausch-Gruppe stehen (unverändert aus altem Verhalten übernommen)');
  });
});
