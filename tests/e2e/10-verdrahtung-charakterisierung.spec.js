'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A62 — Charakterisierung der VERDRAHTUNG von `renderSektor`
   ────────────────────────────────────────────────────────────────────────────
   DAS NETZ, DAS DER RENDER-AUFNAHME FEHLT. `tests/render-charakterisierung.test.js`
   hält 22 Aufnahmen des erzeugten HTML — byte-identisch, mit Gate-Nachweis und
   (seit A66) einer Maske für das Datum des Laufs. Sie deckt die eine Hälfte von
   `renderSektor` vollständig ab und die andere gar nicht:

   GEMESSEN AM DOM-STUB (`tests/load-kern.js`): `querySelectorAll` liefert dort
   UNBEDINGT `[]`. Im Verdrahtungsblock nach `c.innerHTML = html` (157 Zeilen)
   stehen **19 querySelectorAll-Schleifen gegen 1 getElementById** ⟦M⟧ — im
   Node-Harnisch läuft also genau eine von zwanzig. **Verliert die Verdrahtung
   beim Herauslösen ihren Aufrufer, bleibt die HTML-Aufnahme GRÜN**, denn das HTML
   ist unverändert. Genau diese Lücke schliesst diese Datei, und nur sie.

   ── DIE ERWARTUNGEN SIND IM BROWSER ERHOBEN, NICHT ABGELEITET ─────────────
   Ein erster Entwurf las sie aus den Render-Aufnahmen. Das ging schief, und der
   Grund ist der Merksatz dieser Datei: **Aufnahme-Zustand ist nicht
   Browser-Zustand.** `data-herausgeben` steht 11-mal in den Aufnahmen und
   erscheint im Browser **einmal** — es hängt daran, dass der Sektor Einträge
   trägt, und ein frisch angelegtes Depot hat sie nur in `identitaet`.
   Alle Zahlen unten stammen aus einem Lauf über alle elf Sektoren ⟦M⟧.

   ── UND DIE TRENNUNG, DIE EIN NAIVER LESER VERFEHLT ───────────────────────
   `data-modul-karte` findet **6** Elemente und **keines** trägt einen Handler —
   die Regal-Karten des eigenen Sektors sind `<a href="#…">`, ein Anker-Sprung
   braucht kein `onclick`. Sie hier mitzuzählen hätte die Aufnahme dauerhaft rot
   gemacht und wie ein Befund ausgesehen. Geführt werden darum nur die
   `<button>`-Anker; die Karten stehen als benannte Ausnahme mit ihrer Begründung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

/* Erhoben im Browser über alle elf Sektoren, frisch angelegtes Depot ⟦M⟧.
   `n` ist die gemessene Zahl — sie ist Teil der Zusage: fällt sie, ist entweder ein Anker
   verschwunden oder der Aufbau hat sich geändert, und beides will gelesen werden. */
/* `data-sensibel-toggle` stand hier von A64 (30.07.2026) bis 12.08.2026 (zuletzt bei n:256,
   gewachsen über 17 zwischenzeitliche Aufträge — s. Git-Historie dieser Datei für die volle
   Kette). ENTFERNT mit dem „Die Herausgabe kommt ohne Kästchen aus" (Zug 5): der
   Feldzeilen-Knopf ist komplett aus dem Kern entfernt (Erzeuger UND Verdrahtung), nicht nur
   „0 gefunden" — ein Eintrag mit n:0 hätte die Vorprüfung „mindestens 10 Sektoren" nicht
   verletzt, aber stillschweigend eine Karteileiche mitgeschleppt. Die einzige verbleibende
   Bedienstelle für Sensibilität ist der Herausgabe-Dialog. */
const BUTTON_ANKER = [
  { sel: 'data-herausgeben',  n: 1 },
  { sel: 'data-einlesen',     n: 7 },   // C7/U2-ADR-118: vorsorge verlor seinen Einlese-Knopf (ICS-Import entfernt) — 8 → 7
  { sel: 'data-wizard-start', n: 13 },
];

/* Anker OHNE Handler-Pflicht, mit Grund — keine Auslassung, eine Entscheidung.
   NACHGEZOGEN 06.09.2026 (U2-ADR-330, zweites Ab-Werk-Template · U2-ADR-332, die Regal-Karte
   kam zurück): der frühere Kommentar zählte die ab-Werk-Karten HART als „die siebte" — ein
   Satz, der bei jedem weiteren Ab-Werk-Template von Hand hätte nachgezogen werden müssen, und
   der genau deshalb still falsch wurde: U2-ADR-330 brachte ein zweites Ab-Werk-Template
   (`zugang-zum-recht-beratungshilfe`), U2-ADR-332 einen Bereichsfilter-Rückbau, der eine dritte
   Regal-Karte zurückbrachte — `nGesamt: 7` stimmte danach nicht mehr, ohne dass ein Wächter es
   verhindert hätte. EINE Wartungssteuer auf eine Zahl ist kein Wächter: sie hebt beim dritten
   Mal jemand an, ohne die Ausnahme selbst zu messen — fast passiert, am 06.09.2026.
   Die Zusicherung liegt darum jetzt in `nOhneHandler`, einer FESTEN Ausnahme (die sechs
   Instrument-Karten bleiben bewusst unverdrahtet, Anker-Sprung statt echtem Öffnen), NICHT in
   `nGesamt`: die Gesamtzahl wird unten aus `data.logikModule.length` ABGELEITET, nicht
   hingeschrieben — jedes künftige Ab-Werk-Template ändert diese Datei dann nicht mehr an. */
const OHNE_HANDLER = [
  { sel: 'data-modul-karte', nOhneHandler: 6, grund: '<a href="#…">, Anker-Sprung im eigenen Sektor (vorsorgeRegalHTML) — sechs Instrument-Karten bleiben bewusst OHNE Handler; jede ab-Werk-logikModule-Karte trägt einen echten onclick (dokumentOeffnen, generische logikModule-Schleife) statt eines Anker-Sprungs.' },
];

async function frischesDepot(page) {
  await oeffneApp(page);
  await depotAnlegen(page);
  // „Das Datei-Signal" (10.08.2026) — der frühere geheZuZuhause()-Aufruf hier war nie
  // korrekt: die Funktion verlässt die ECHTE Sitzung (INV-9, wie der Schließen-Knopf), sie kehrt
  // nicht zu einer „Zuhause"-Ansicht INNERHALB der Sitzung zurück. Er blieb bisher folgenlos, weil
  // direkt nach dem Anlegen IMMER die Schließen-Warnung dazwischenfunkte (der Datei-Signal-Bug,
  // den dieser Auftrag behebt) — ein zufälliges Zusammenspiel zweier Bugs, kein Testverhalten, das
  // man erhalten wollte. `zaehleUeberSektoren` ruft ohnehin `oeffneSektor` für jeden Sektor auf,
  // ein Zurücksetzen davor ist nicht nötig.
  //
  // NICHT MEHR `SEKTOREN.map(...)` („Vier rote E2E nach Stufe 2", 09.09.2026):
  // seit Stufe 2 lebt `wohnen` ab Werk in der Registry (`_BEREICHS_MODUL_REGISTRY`), nicht mehr
  // in `SEKTOREN` — das ist der dokumentierte Zweck der Trennung (Kommentar „V.SEKTOREN und
  // bereicheAlle() überhaupt auseinanderfallen KÖNNEN"). `SEKTOREN` allein ist seither NICHT
  // mehr die vollständige Bereichsmenge, die die Bürgerin sieht: `renderSidebar()` selbst
  // iteriert über `bereicheNachCluster()` → `bereicheAlle()`, nicht über `SEKTOREN`. Ein Sektor,
  // der zwar rendert (Seitenleiste, `oeffneSektor` beide gemessen mit `wohnen`) aber hier nie
  // besucht wurde, sähe wie ein verlorener Anker aus, obwohl er es nicht ist — GEMESSEN, nicht
  // vermutet: `data-sektor="housing"` steht im echten DOM, `oeffneSektor('housing')` öffnet ihn und
  // zeigt seinen `data-wizard-start`-Anker. `bereicheAlle()` ist seit diesem Zug die Menge, die
  // diese Datei meint.
  return page.evaluate(() => window.__vdOeffentlich.bereicheAlle().map((s) => s.id));
}

const zaehleUeberSektoren = (page, sektoren, sel) => sektoren.reduce(async (accP, sid) => {
  const acc = await accP;
  await page.evaluate((i) => window.__vdOeffentlich.oeffneSektor(i), sid);
  const r = await page.evaluate((s) => {
    const el = [...document.querySelectorAll('[' + s + ']')];
    return { n: el.length, ohne: el.filter((e) => typeof e.onclick !== 'function').length };
  }, sel);
  return { n: acc.n + r.n, ohne: acc.ohne + r.ohne };
}, Promise.resolve({ n: 0, ohne: 0 }));

test('[A62·Verdrahtung] jeder gerenderte Button-Anker trägt einen Handler', async ({ page }) => {
  const sektoren = await frischesDepot(page);
  expect(sektoren.length, 'Vorprüfung: der Suchraum trägt die Zusage').toBeGreaterThanOrEqual(10);

  const befund = [];
  let gesamt = 0;
  for (const a of BUTTON_ANKER) {
    const r = await zaehleUeberSektoren(page, sektoren, a.sel);
    gesamt += r.n;
    if (r.n !== a.n) befund.push(`${a.sel}: ${r.n} gefunden, ${a.n} erwartet`);
    if (r.ohne) befund.push(`${a.sel}: ${r.ohne} von ${r.n} OHNE Handler`);
  }

  /* Die eigentliche Zusage in einem Satz: kein gerenderter Button-Anker bleibt unverdrahtet.
     Das kippt, wenn die Verdrahtung beim Herauslösen ihren Aufrufer verliert — und genau das
     sieht die HTML-Aufnahme NICHT, denn das HTML ist dann unverändert. */
  expect(befund, 'Verdrahtung oder Zahl hat sich geändert:\n  ' + befund.join('\n  ')
    + '\n\nDie Render-Aufnahme bleibt dabei grün. Nur diese Prüfung sieht es.').toEqual([]);

  /* 21 = Herausgeben 1 · Einlesen 7 · Wizard-Start 13. Die Summe stand hier lange aufgebläht
     durch die Sensibel-Knöpfe (A64, zuletzt 256 — volle Historie in der Git-Historie dieser
     Datei, Stand vor dem 12.08.2026) — mit ihrer Erzeugungsstelle komplett aus dem Kern
     entfernt („Die Herausgabe kommt ohne Kästchen aus", Zug 5), fällt ihr Beitrag
     auf 0, nicht auf eine kleinere Zahl. Die Summe steht weiterhin hier, damit ein
     WEGFALLENDER der drei verbleibenden Anker auffällt, den keine Einzelzahl mehr abdeckt. */
  expect(gesamt, 'insgesamt 21 verdrahtete Anker über zwölf Sektoren — sinkt die Zahl, ist das Netz '
    + 'kleiner geworden, ohne dass jemand es beschlossen hat').toBe(21);
});

test('[A62·Verdrahtung] die sechs Instrument-Regal-Karten brauchen KEINEN Handler — jede ab-Werk-logikModule-Karte trägt einen echten (Zahl ABGELEITET, U2-ADR-330/332)', async ({ page }) => {
  const sektoren = await frischesDepot(page);
  /* Die Gesamtzahl der Regal-Karten ist sechs Instrument-Karten plus die Anzahl der ab-Werk
     eingelassenen logikModule — gemessen am echten Bestand nach `depotAnlegen()` (nicht an
     einem leeren Depot, das im Betrieb nicht vorkommt), NICHT hingeschrieben. Ein drittes
     Ab-Werk-Template ändert diese Zeile dann nicht mehr, s. Kopfkommentar über OHNE_HANDLER. */
  // Gezählt wird, was die Regal-Kartenzeile wirklich zeigt: die Module im Depot UND die Ab-Werk-Saat des Produkts (Gerüst-Schnitt
  // S5: das Zugang-Template steht als Template im Rezept und kommt aus der Saat, nicht als Kopie ins Depot).
  const anzahlAbWerkModule = await page.evaluate(() => window.__vdOeffentlich._logikModuleAlle(window.__vdOeffentlich.ankerDaten()).length);
  for (const a of OHNE_HANDLER) {
    const r = await zaehleUeberSektoren(page, sektoren, a.sel);
    const erwartetGesamt = a.nOhneHandler + anzahlAbWerkModule;
    expect(r.n, `${a.sel}: ${a.grund} — erwartet ${a.nOhneHandler} Instrument-Karten + `
      + `${anzahlAbWerkModule} Ab-Werk-Karte(n) = ${erwartetGesamt}; eine abweichende Zahl heißt: `
      + 'eine Regal-Karte fehlt, oder es liegt eine zu viel im Bestand').toBe(erwartetGesamt);
    /* Die sechs Instrument-Karten bleiben bewusst unverdrahtet (Anker-Sprung, kein onclick) —
       das ist die einzige feste Zahl in dieser Probe. Stiege `r.ohne` über sechs, wäre das keine
       Nebensache — dann gehört die neue Karte nach oben zu den Button-Ankern, nicht hierher.
       Fiele sie unter sechs, hätte eine Instrument-Karte einen Handler bekommen, den sie nicht
       haben soll — in beiden Richtungen ein Befund, den `r.n` allein nicht sehen könnte, weil er
       Zu- und Abnahme gegeneinander verrechnet. */
    expect(r.ohne, `${a.sel}: genau ${a.nOhneHandler} Instrument-Karten bleiben ohne Handler — `
      + `jede ab-Werk-logikModule-Karte trägt einen echten onclick`).toBe(a.nOhneHandler);
  }
});

test('[A62·Gate-Nachweis] ein entfernter Handler wird gefunden — und nur er', async ({ page }) => {
  /* Regel 13, zweite Hälfte: eine Aussage über den WÄCHTER, darum ein erfundener Weg. Ohne sie
     wäre „alle verdrahtet" von „der Leser sieht keine Anker" nicht zu unterscheiden. */
  await frischesDepot(page);
  // `gesundheit` trägt gemessen einen `data-einlesen`-Anker — ein Sektor OHNE Anker würde die
  // Vorbedingung unten vakuum-grün machen und den Gate-Nachweis wertlos.
  await page.evaluate(() => window.__vdOeffentlich.oeffneSektor('health'));
  expect(await page.evaluate(() => document.querySelectorAll('[data-einlesen]').length),
    'Vorbedingung: dieser Sektor trägt überhaupt einen Anker').toBeGreaterThan(0);

  const vorher = await page.evaluate(() =>
    [...document.querySelectorAll('[data-einlesen]')].filter((e) => typeof e.onclick !== 'function').length);
  expect(vorher, 'Vorbedingung: im Ausgangszustand ist jeder Anker verdrahtet').toBe(0);

  const nachher = await page.evaluate(() => {
    const el = document.querySelector('[data-einlesen]');
    el.onclick = null;                                  // GEPFLANZT: genau einer verliert seinen Handler
    return [...document.querySelectorAll('[data-einlesen]')].filter((e) => typeof e.onclick !== 'function').length;
  });
  expect(nachher, 'der gepflanzte Verlust MUSS auffallen — und genau einer, nicht alle').toBe(1);
});
