'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sidebar-EINTRAGEN-Liste gruppiert sich in fünf Themen-Cluster
   ────────────────────────────────────────────────────────────────────────
   Bezug: U2-ADR-171 (25.08.2026), UX-Konzept §7 (Nachtrag).

   DER BEFUND. Mit einem angedockten Pro-Modul wurde aus der flachen
   Zwölfer-Liste ein 13. gleichrangiger Eintrag — Screenshot-Befund
   „überwältigend, nicht ruhig". `bereicheNachCluster()` gruppiert
   `bereicheAlle()` in fünf feste Cluster + ein automatisches Auffangbecken
   „module" für alles, was zu keinem der fünf gehört (angedockte Module,
   auch künftige) — kein manuelles Nachpflegen bei jedem neuen Modul.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ALLE_DREIZEHN = [
  'identity', 'people', 'mobility', 'finance', 'health', 'education',
  'socialInsurance', 'advanceCare', 'administration', 'housing', 'emergencyPreparedness', 'personal',
  'assets',
];

describe('[BEREICH_CLUSTER_ZUORDNUNG] alle dreizehn eingebauten Bereiche gehören zu einem der FÜNF festen Cluster', () => {
  test('kein eingebauter Bereich fällt heute ins Auffangbecken "module"', () => {
    const { V } = ladeKern();
    for (const id of ALLE_DREIZEHN) {
      const cluster = V.BEREICH_CLUSTER_ZUORDNUNG[id];
      assert.ok(cluster, `${id}: keine Cluster-Zuordnung gefunden`);
      assert.notEqual(cluster, 'module', `${id}: fällt ins Auffangbecken — sollte einem der fünf festen Cluster gehören`);
    }
  });

  test('jeder der fünf festen Cluster hat mindestens einen Bereich', () => {
    const { V } = ladeKern();
    const belegt = new Set(Object.values(V.BEREICH_CLUSTER_ZUORDNUNG));
    for (const c of ['ich-mensch', 'alltag', 'geld-absicherung', 'gesundheit-krisen', 'bildung-verwaltung']) {
      assert.ok(belegt.has(c), `Cluster "${c}" hat keinen einzigen Bereich`);
    }
  });

  test('Rotmachbarkeit: eine unbekannte id fällt tatsächlich ins Auffangbecken "module"', () => {
    const { V } = ladeKern();
    assert.equal(V.BEREICH_CLUSTER_ZUORDNUNG['erfundenes-pro-modul'], undefined,
      'eine erfundene id hat keinen Eintrag — genau das erzwingt den ||-Fallback auf "module" in bereicheNachCluster()');
  });
});

describe('[BEREICH_CLUSTER_ZUORDNUNG] Persönliches gehört zu Ich & Mensch (Korrektur 26.08.2026)', () => {
  test('persoenliches ist NICHT mehr im Cluster alltag', () => {
    const { V } = ladeKern();
    assert.notEqual(V.BEREICH_CLUSTER_ZUORDNUNG['personal'], 'alltag',
      'persoenliches sollte laut Produktkorrektur (26.08.2026) zu ich-mensch gehören, nicht mehr zu alltag');
  });

  test('persoenliches ist im Cluster ich-mensch', () => {
    const { V } = ladeKern();
    assert.equal(V.BEREICH_CLUSTER_ZUORDNUNG['personal'], 'ich-mensch');
  });
});

/* „Bereichsschnitt und Unterzeilen" (09.09.2026, entschieden,
   Vorlage navigations-unterzeilen-entwurf-2026-09-09.md). Zwei Bereiche hängen um:
   `emergencyPreparedness` (Vorräte/Notfallplan stehen zu Hause, neben Wohnen/Mobilität) von
   `gesundheit-krisen` zu `alltag`; `socialInsurance` (18 von 22 Feldern sind
   Pflege-Gegenstand, derselbe wie Gesundheit) von `geld-absicherung` zu
   `gesundheit-krisen`. Die Cluster-BEZEICHNER bleiben unverändert — nur die Zuordnung
   und die Anzeigetitel. SCHÄRFER als vorher, nicht schwächer: die alte Probe kannte nur
   `mobility`/`housing` in `alltag` und `socialInsurance` in `geld-absicherung`; diese
   Probe hier prüft beide neuen vollständigen Mengen, nicht nur die Abwesenheit der alten. */
describe('[BEREICH_CLUSTER_ZUORDNUNG] Bereichsschnitt 09.09.2026: krisenvorsorge → alltag, sozialversicherung → gesundheit-krisen', () => {
  test('Cluster alltag trägt krisenvorsorge, mobilitaet, wohnen — genau diese drei', () => {
    const { V } = ladeKern();
    const belegt = Object.entries(V.BEREICH_CLUSTER_ZUORDNUNG).filter(([, c]) => c === 'alltag').map(([id]) => id);
    assert.deepEqual(belegt.sort(), ['emergencyPreparedness', 'housing', 'mobility']);
  });

  test('Cluster geld-absicherung trägt finanzen, vermoegen, vorsorge — genau diese drei, sozialversicherung nicht mehr', () => {
    const { V } = ladeKern();
    const belegt = Object.entries(V.BEREICH_CLUSTER_ZUORDNUNG).filter(([, c]) => c === 'geld-absicherung').map(([id]) => id);
    assert.deepEqual(belegt.sort(), ['advanceCare', 'assets', 'finance']);
  });

  test('Cluster gesundheit-krisen trägt gesundheit, sozialversicherung — genau diese zwei, krisenvorsorge nicht mehr', () => {
    const { V } = ladeKern();
    const belegt = Object.entries(V.BEREICH_CLUSTER_ZUORDNUNG).filter(([, c]) => c === 'gesundheit-krisen').map(([id]) => id);
    assert.deepEqual(belegt.sort(), ['health', 'socialInsurance']);
  });
});

describe('[bereicheNachCluster] Gruppierung, Reihenfolge, Auffangbecken', () => {
  test('liefert die sechs Cluster in BEREICH_CLUSTER_REIHENFOLGE, leere Cluster fehlen (frisches Depot: alle dreizehn, kein Modul)', () => {
    const { V } = ladeKern();
    const gruppen = V.bereicheNachCluster();
    const clusterNamen = gruppen.map((g) => g.cluster);
    assert.deepEqual(clusterNamen, ['ich-mensch', 'alltag', 'geld-absicherung', 'gesundheit-krisen', 'bildung-verwaltung'],
      'ohne angedocktes Modul darf "module" gar nicht erst in der Liste stehen (leere Gruppen werden gefiltert)');
  });

  test('jeder Bereich taucht in GENAU EINEM Cluster auf — keine Dublette, keine Lücke', () => {
    const { V } = ladeKern();
    const gruppen = V.bereicheNachCluster();
    const gesehen = gruppen.flatMap((g) => g.bereiche.map((s) => s.id));
    assert.deepEqual([...gesehen].sort(), [...ALLE_DREIZEHN].sort());
    assert.equal(new Set(gesehen).size, gesehen.length, 'ein Bereich steht doppelt in der Gruppierung');
  });

  test('jeder Cluster trägt einen nicht-leeren Titel (STRINGS aufgelöst)', () => {
    const { V } = ladeKern();
    for (const g of V.bereicheNachCluster()) {
      assert.ok(g.titel && g.titel.length > 0, `Cluster "${g.cluster}" hat keinen Titel`);
    }
  });
});

describe('[renderSidebar] Cluster als <details class="nav-gruppe">, aktiver Bereich klappt seinen Cluster auf', () => {
  const PW = 'pw';
  async function frischMitDepot() {
    const k = ladeKern();
    await k.V.depotAnlegen(PW);
    k.V.akteurSelbstErklaeren('Tester');
    return k;
  }

  test('sb.innerHTML nach renderSidebar(): sechs mögliche Cluster, aktiver Bereich ist offen, andere zu', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    V.oeffneSektor('health');   // Cluster "gesundheit-krisen", Titel seit 09.09.2026 "Gesundheit & Absicherung"
    const sbHtml = document.getElementById('sidebar').innerHTML;

    const gesundheitCluster = sbHtml.match(/<details class="nav-gruppe"( open)?><summary>Gesundheit & Absicherung<\/summary>[\s\S]*?<\/details>/);
    assert.ok(gesundheitCluster, 'Cluster "Gesundheit & Absicherung" nicht im gerenderten Markup gefunden');
    assert.ok(gesundheitCluster[0].includes(' open'), 'der Cluster mit dem aktiven Bereich muss "open" tragen');
    assert.match(gesundheitCluster[0], /class="nav-item aktiv" data-sektor="health"/, 'gesundheit trägt "aktiv" innerhalb seines Clusters');

    const alltagCluster = sbHtml.match(/<details class="nav-gruppe"( open)?><summary>Alltag<\/summary>[\s\S]*?<\/details>/);
    assert.ok(alltagCluster, 'Cluster "Alltag" nicht gefunden');
    assert.ok(!alltagCluster[0].includes(' open'), 'ein Cluster ohne aktiven Bereich darf NICHT offen sein');
  });

  /* „Bereichsschnitt und Unterzeilen" (09.09.2026): die fünf geänderten
     Gruppentitel, gemessen im gerenderten Markup — nicht nur an STRINGS vorbei behauptet. */
  test('alle fünf Cluster-Titel tragen den neuen Wortlaut (Bereichsschnitt 09.09.2026)', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    const sbHtml = document.getElementById('sidebar').innerHTML;
    for (const titel of ['Zur Person', 'Alltag', 'Geld & Recht', 'Gesundheit & Absicherung', 'Bildung & Verwaltung']) {
      assert.ok(sbHtml.includes('<summary>' + titel + '</summary>'), `Gruppentitel "${titel}" fehlt im Markup`);
    }
  });

  /* Jeder der dreizehn Bereiche trägt seine Unterzeile im gerenderten Markup — nicht nur
     als Textsatz-Eintrag, sondern tatsächlich im DOM, unter dem Label, ≤28 Zeichen (der
     eigene Wächter dafür steht in tests/nav-unterzeile-laenge-guard.test.js). */
  test('jeder der dreizehn Bereiche trägt eine nav-item-sub-Unterzeile im Markup', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    const sbHtml = document.getElementById('sidebar').innerHTML;
    for (const id of ALLE_DREIZEHN) {
      const re = new RegExp('data-sektor="' + id + '"[\\s\\S]*?<span class="nav-item-sub">[^<]+</span>');
      assert.match(sbHtml, re, `Bereich "${id}" trägt keine nav-item-sub-Unterzeile im Markup`);
    }
  });

  test('„Alle Bereiche zeigen"-Umschalter steht weiterhin VOR den Clustern (Fortsetzen-Fokus 26.08.2026 — Nachfolger der früheren EINTRAGEN-Überschrift, s. V.STRINGS.gruppeEintragen, das hier nicht mehr im Markup steht)', async () => {
    const { V, document } = await frischMitDepot();
    V.betreteApp();
    const sbHtml = document.getElementById('sidebar').innerHTML;
    assert.ok(sbHtml.indexOf(V.STRINGS.navAlleBereicheZeigen) < sbHtml.indexOf('nav-gruppe'),
      '"Alle Bereiche zeigen" muss weiterhin vor den Clustern stehen');
  });
});
