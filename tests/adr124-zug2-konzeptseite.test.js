'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-124, Zug 2 — Konzeptseite Sub-Depots, als Reise (Nachtrag 04.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Rahmensatz, vier Stationen (Anlegen · Aufbewahren · Übergeben · Allein),
   Schlusssatz und Verallgemeinerung — wörtlich aus der Wortlaut-Quelle
   (Auftrag SubDepot_Konzeptseite_Reise, 04.08.2026, Fassung 2). Geprüft: der
   Inhalt steht wirklich, die Sprachwarnung wird eingehalten (das
   Erhebungs-Bild „Umschlag mit falscher Aufschrift" darf NICHT auf die
   Bürgerseite wandern — es erklärt einen Mangel, kein Konzept), U2-ADR-033
   (keine Empfehlung), die Grafik zeigt jedes Depot-Symbol GLEICH GROSS (kein
   kleineres Kästchen im größeren), Routing + Sidebar sind verdrahtet.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Zug2] Rahmensatz, vier Stationen, Schlusssatz und Verallgemeinerung stehen wörtlich im Text', () => {
  const { V } = ladeKern();
  assert.match(V.STRINGS.subKonzeptRahmensatz, /nicht Ihr Ordner für fremde Unterlagen/);
  assert.match(V.STRINGS.subKonzeptRahmensatz, /Depot einer anderen Person/);
  assert.match(V.STRINGS.subKonzeptStation1, /Kind kommt zur Welt/);
  assert.match(V.STRINGS.subKonzeptStation1, /eigenes Passwort, von Anfang an/);
  assert.match(V.STRINGS.subKonzeptStation2, /liegt sein Depot in Ihrem/);
  assert.match(V.STRINGS.subKonzeptStation2, /Depot-Passwort schließt das Depot des Kindes nicht auf/);
  assert.match(V.STRINGS.subKonzeptStation3, /wird volljährig/);
  assert.match(V.STRINGS.subKonzeptStation3, /nimmt die Datei mit/);
  assert.match(V.STRINGS.subKonzeptStation4, /Depot wie jedes andere/);
  assert.match(V.STRINGS.subKonzeptStation4, /kann es umgekehrt Ihres aufnehmen/);
  assert.match(V.STRINGS.subKonzeptSchlusssatz, /Depot gehörte dem Kind von Anfang an/);
  assert.match(V.STRINGS.subKonzeptVerallgemeinerung, /erwachsene Person führen/);
});

test('[Zug2] Sprachwarnung: das Erhebungs-Bild (Umschlag/Schublade/Briefkasten) steht NIRGENDS im Bürgertext', () => {
  const { V } = ladeKern();
  const buergerTexte = [
    V.STRINGS.subKonzeptTitel, V.STRINGS.subKonzeptRahmensatz,
    V.STRINGS.subKonzeptStation1, V.STRINGS.subKonzeptStation2,
    V.STRINGS.subKonzeptStation3, V.STRINGS.subKonzeptStation4,
    V.STRINGS.subKonzeptSchlusssatz, V.STRINGS.subKonzeptVerallgemeinerung,
  ].join(' ');
  assert.doesNotMatch(buergerTexte, /Schublade/i);
  assert.doesNotMatch(buergerTexte, /Briefkasten/i);
  assert.doesNotMatch(buergerTexte, /falsche.*Aufschrift/i);
});

test('[Zug2] U2-ADR-033: keine Empfehlung, kein Rat-Vokabular', () => {
  const { V } = ladeKern();
  const buergerTexte = [
    V.STRINGS.subKonzeptRahmensatz, V.STRINGS.subKonzeptStation1, V.STRINGS.subKonzeptStation2,
    V.STRINGS.subKonzeptStation3, V.STRINGS.subKonzeptStation4,
    V.STRINGS.subKonzeptSchlusssatz, V.STRINGS.subKonzeptVerallgemeinerung,
  ].join(' ');
  assert.doesNotMatch(buergerTexte, /am besten/i);
  assert.doesNotMatch(buergerTexte, /wir empfehlen/i);
  assert.doesNotMatch(buergerTexte, /sinnvollerweise/i);
  assert.doesNotMatch(buergerTexte, /sollten sie/i);
});

test('[Zug2] kein Rollentausch-Versprechen: Posten 103 wird im Text nicht angedeutet', () => {
  const { V } = ladeKern();
  const buergerTexte = [
    V.STRINGS.subKonzeptStation1, V.STRINGS.subKonzeptStation2,
    V.STRINGS.subKonzeptStation3, V.STRINGS.subKonzeptStation4,
  ].join(' ');
  assert.match(V.STRINGS.subKonzeptStation4, /wenn Sie es abgeben/, 'Station 4 formuliert die Umkehr als Bedingung, nicht als Knopf');
  assert.doesNotMatch(buergerTexte, /Knopf/i);
  assert.doesNotMatch(buergerTexte, /mit einem Klick/i);
});

test('[Zug2] die Grafik zeigt jedes Depot-Symbol mit DENSELBEN Maßen — kein kleineres Kästchen im größeren', () => {
  const { V } = ladeKern();
  const svg = V.subKonzeptGrafikSVG();
  const treffer = svg.match(/width="48" height="60"/g) || [];
  assert.equal(treffer.length, 7, 'sieben Depot-Symbole (1 Anlegen + 2 Aufbewahren + 2 Übergeben + 2 Allein), alle mit identischen Maßen 48×60');
  // Keine ANDERE Rechteck-Größe für ein Depot-Symbol im Markup (sonst wäre eines größer/kleiner).
  const alleRects = svg.match(/<rect x="0" y="0" width="\d+" height="\d+"/g) || [];
  const einzigartig = new Set(alleRects);
  assert.equal(einzigartig.size, 1, 'nur EINE Depot-Grundform im gesamten SVG: ' + [...einzigartig].join(', '));
});

/* ── Nachbesserung 04.08.2026 (Bildschirmabnahme, Zug 1): Station Allein trägt die
   verbliebene, gedämpfte Kopie — sonst widerspricht das Bild Station 3s Text
   ("Die Kopie, die bei Ihnen bleibt, ist ... weiter lesbar") und Allein sieht
   identisch zu Anlegen aus. Geprüft an den Zonen-Grenzen (die drei vertikalen
   Trennlinien bei x=190/380/570 aus subKonzeptGrafikSVG selbst), nicht an
   geratenen Pixelwerten — bricht nicht, wenn das Layout innerhalb der Zonen
   verschoben wird. */
test('[Zug2·Nachbesserung] Station Allein (letzte Zone) trägt MEHR als ein Depot-Symbol', () => {
  const { V } = ladeKern();
  const svg = V.subKonzeptGrafikSVG();
  const letzteTrennlinie = Math.max(...[...svg.matchAll(/<line x1="(\d+)"/g)].map((m) => Number(m[1])));
  assert.ok(letzteTrennlinie > 0, 'Positivkontrolle: es gibt Trennlinien zwischen den Zonen');
  const symbolCx = [...svg.matchAll(/<g transform="translate\((\d+),\d+\)">\s*<rect x="0" y="0" width="48"/g)]
    .map((m) => Number(m[1]) + 24);   // _depotSymbolSVG zeichnet ab cx-24
  const inLetzterZone = symbolCx.filter((cx) => cx > letzteTrennlinie);
  assert.ok(inLetzterZone.length > 1,
    'Station Allein zeigt nur ' + inLetzterZone.length + ' Symbol(e) — die verbliebene Kopie fehlt im Bild');
});

test('[Zug2·Nachbesserung] das gedämpfte Symbol bleibt AA-kontrastfähig (Deckkraft, keine verblassende Farbe)', () => {
  const { V } = ladeKern();
  const svg = V.subKonzeptGrafikSVG();
  assert.match(svg, /<g opacity="0\.5">/, 'die Dämpfung läuft über eine deckkraft-gesteuerte Gruppe, nicht über eine hellere Ink-Variable');
  assert.doesNotMatch(svg, /--ink3/, 'keine der drei blassen Text-Ink-Stufen im SVG — die Dämpfung ist rein grafisch, kein Lesbarkeits-Downgrade');
});

test('[Zug2] die Grafik trägt KEINEN Text — nur die HTML-Beschriftungen daneben (Druckbarkeit/Übersetzbarkeit)', () => {
  const { V } = ladeKern();
  const svg = V.subKonzeptGrafikSVG();
  assert.doesNotMatch(svg, /<text/, 'kein <text> im SVG-Markup selbst');
});

test('[Zug2] renderSubDepotKonzept zeigt Titel, Rahmensatz, alle vier Stationen und die Grafik im DOM', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen('Konzeptseite-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.renderSubDepotKonzept();
  const html = dok.getElementById('content').innerHTML;
  assert.match(html, /<svg/);
  assert.match(html, new RegExp(V.STRINGS.subKonzeptTitel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(html.includes(V.STRINGS.subKonzeptRahmensatz), 'Rahmensatz fehlt im gerenderten Text');
  for (const a of [V.STRINGS.subKonzeptStation1, V.STRINGS.subKonzeptStation2,
    V.STRINGS.subKonzeptStation3, V.STRINGS.subKonzeptStation4]) {
    assert.ok(html.includes(a), 'fehlt im gerenderten Text: ' + a);
  }
  assert.ok(html.includes(V.STRINGS.subKonzeptSchlusssatz), 'Schlusssatz fehlt im gerenderten Text');
  assert.ok(html.includes(V.STRINGS.subKonzeptVerallgemeinerung), 'Verallgemeinerung fehlt im gerenderten Text');
});

/* ── Nachbesserung 04.08.2026, Zug 2: der Rahmensatz ist der tragende Satz der
   Seite — er steht jetzt aufrecht in Fließtextfarbe, wie der Schlussabsatz, nicht
   mehr kursiv/blass über `sektor-intro`. */
test('[Zug2·Nachbesserung] der Rahmensatz steht aufrecht (kein `sektor-intro`), wie der Schlussabsatz', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen('Konzeptseite-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.renderSubDepotKonzept();
  const html = dok.getElementById('content').innerHTML;
  const rahmensatzEsc = V.STRINGS.subKonzeptRahmensatz.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(html, new RegExp('<p>' + rahmensatzEsc + '</p>'),
    'der Rahmensatz muss in einem einfachen <p> ohne sektor-intro-Klasse stehen');
  assert.doesNotMatch(html, new RegExp('sektor-intro">' + rahmensatzEsc),
    'der Rahmensatz darf nicht mehr über sektor-intro (kursiv/--ink3) laufen');
});

test('[Zug2] oeffneSubKonzept setzt die Ansicht und rendert Sidebar+Content', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Konzeptseite-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.oeffneSubKonzept();
  assert.equal(V.getViewState().aktiveAnsicht, 'subdepot-konzept');
});

/* AMENDIERT („Seitenleiste", 10.08.2026, Zug 2): die Konzeptseite ist keine eigene
   Sidebar-Tür mehr — sie erzeugte als NEUNTER Eintrag unter „Auf einen Blick" Verwechslungsgefahr
   mit der Handlung, die sie erklärt (Verwaltete Depots). Ihr Zugang liegt jetzt als Verweis am
   Kopf GENAU dieser Sicht — „wer die Handlung sucht, findet dort jetzt auch die Erklärung". Die
   Probe prüft echte Erreichbarkeit über den ECHTEN Render-/Klick-Pfad, nicht nur eine Zeichenkette
   im Quelltext (S5-Lehre: eine Zeichenkette kann stehen bleiben, obwohl der Pfad tot ist). */
test('[Zug2] „Verwaltete Depots" trägt einen Verweis auf die Konzeptseite, echt erreichbar', async () => {
  // WICHTIG: `document.getElementById` liefert im DOM-Stub IMMER ein frisches Fake-Element (auch
  // für eine nie gerenderte id) — ein bloßer Existenz-/Funktions-Check auf dem Element wäre darum
  // NICHT rotmachbar (er bliebe grün, selbst wenn der Verweis nie ins HTML geschrieben würde).
  // Geprüft wird deshalb zuerst der echte gerenderte HTML-STRING (das ist die Stelle, die diese
  // Änderung tatsächlich anfasst), erst danach der Klickpfad.
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen('Konzeptseite-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.oeffneVerwaltung();
  const contentHtml = dok.getElementById('content').innerHTML;
  assert.match(contentHtml, /id="verwaltete-subkonzept-link"/, 'der Verweis ist am Kopf von „Verwaltete Depots" gerendert');
  assert.match(contentHtml, />Wofür eingehängte Depots da sind</, 'trägt den erwarteten Link-Text');
  const link = dok.getElementById('verwaltete-subkonzept-link');
  assert.equal(typeof link.onclick, 'function', 'die Click-Verdrahtung muss existieren');
  link.onclick();
  assert.equal(V.getViewState().aktiveAnsicht, 'subdepot-konzept', 'Klick öffnet wirklich die Konzeptseite');
});

test('[Zug2] Sidebar trägt KEINEN eigenen Nav-Eintrag mehr für die Konzeptseite', () => {
  const { html } = ladeKern();
  assert.doesNotMatch(html, /data-subdepot-konzept="1"/,
    'kein neunter Sidebar-Eintrag mehr — die Sicht bleibt nur noch über den Verweis erreichbar');
});
