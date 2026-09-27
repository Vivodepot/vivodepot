'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Palette-Aufnahmekriterium (Palettentausch 04.08.2026, Zug 5/6)
   ────────────────────────────────────────────────────────────────────────
   Das Kriterium, festgeschrieben in U2-ADR-124-Nachtrag Farbe und im
   Begriffs-Glossar (Vivodepot-intern/docs/ux/): eine Palettenfarbe für ein
   eingehängtes Depot muss mindestens 3:1 gegen das Chrome ihres Themes
   erreichen und mindestens 4,5:1 für den Text, der auf ihr steht. Diese Datei
   ist der Prüfer, auf den beide Dokumente verweisen.

   DREI PROBEN, wie im Auftrag und der Zug-5/6-Freigabe verlangt:
   1) Fläche gegen Fläche — jede der sechs Farben gegen Salbei-dunkel, in allen
      drei Themes. Freigabe, Punkt 4: Ton (3,03) und Flieder (3,06) bestehen
      ohne Puffer — sie werden NAMENTLICH mit ihrem Wert geführt, nicht in
      einer Sammelzahl „sechs von sechs bestanden", die die Nähe zur Grenze
      verdeckt.
   2) Keine Farbe mit Zweitbedeutung — jede der sechs setzt beim Betreten
      einen echten Override gegen die Anker-Chrome (Zug 3). Coupled an
      `setzeSubDepotAkzent`/`entferneSubDepotAkzentOverride`, nicht an eine
      Kopie ihrer Logik (§7.5).
   3) Die Kopfzeile bleibt Salbei — im Sub-Kontext trägt sie dieselbe Fläche
      und dieselbe Textfarbe wie im Anker, in allen drei Themes (Zug 2).

   BEFUND, der das Kriterium erst nötig machte: alle bestehenden Kontrastproben
   maßen Text gegen Fläche INNERHALB einer Farbe; Fläche gegen Fläche maß
   keine — das ist der Bruch, den der Palettentausch behebt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { verhaeltnis } = require('../tools/lib/kontrast.js');
const { ladeKern } = require('./load-kern.js');

const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });

// Gerechnete Werte (Palette-Zug-4-Bericht, freigegeben) — dieselben Hex in allen drei Themes,
// weil Salbei-dunkel sich zwischen den Themes kaum bewegt (#4F6539 hell/Nacht, #4a5f3a HC).
const PALETTE = {
  hafer: '#D9C9A3', ton: '#D3A98F', altrose: '#D2B3B0',
  flieder: '#B8AECB', nebel: '#A9B8C4', kiesel: '#C3B5A8',
};
const DUNKLER_TEXT = '#1c2a1e';
const CHROME_JE_THEME = { Hell: '#4F6539', Hochkontrast: '#4a5f3a', Nacht: '#4F6539' };
const MIN_FLAECHE = 3.0;
const MIN_TEXT = 4.5;

/* ── 1 · Fläche gegen Fläche — Ton und Flieder NAMENTLICH, nicht in einer Sammelzahl ── */

test('[Aufnahmekriterium] jede Palettenfarbe ≥3:1 gegen Salbei-dunkel, in jedem Theme — Ton und Flieder einzeln benannt', () => {
  const ohnePuffer = new Set(['ton', 'flieder']);   // Freigabe Punkt 4: keine Reserve, Regression hier zuerst sichtbar
  const werte = {};
  for (const [theme, chromeHex] of Object.entries(CHROME_JE_THEME)) {
    werte[theme] = {};
    for (const [name, farbHex] of Object.entries(PALETTE)) {
      const c = verhaeltnis(hex(farbHex), hex(chromeHex));
      werte[theme][name] = c;
      assert.ok(c >= MIN_FLAECHE, `${theme}/${name}: ${c}:1 muss ≥${MIN_FLAECHE}:1 gegen Salbei-dunkel (${chromeHex}) sein`);
    }
  }
  // Punkt 4 der Freigabe wörtlich: Ton und Flieder NAMENTLICH mit ihrem Wert, nicht verdeckt.
  for (const name of ohnePuffer) {
    const hellWert = werte.Hell[name];
    assert.ok(hellWert < 3.10, `${name}: erwartungsgemäß knapp (gemessen ${hellWert}) — wird die Zahl komfortabel, diesen Kommentar nachziehen`);
  }
  assert.equal(werte.Hell.ton.toFixed(2), '3.03', 'Ton, Hell — exakter gerechneter Wert, keine Rundung auf "besteht"');
  assert.equal(werte.Hell.flieder.toFixed(2), '3.06', 'Flieder, Hell — exakter gerechneter Wert, keine Rundung auf "besteht"');
});

test('[Aufnahmekriterium] jede Palettenfarbe: dunkler Text ≥4,5:1 auf der Fläche, in jedem Theme', () => {
  for (const theme of Object.keys(CHROME_JE_THEME)) {
    for (const [name, farbHex] of Object.entries(PALETTE)) {
      const c = verhaeltnis(hex(DUNKLER_TEXT), hex(farbHex));
      assert.ok(c >= MIN_TEXT, `${theme}/${name}: Text-Kontrast ${c}:1 muss ≥${MIN_TEXT}:1 sein`);
    }
  }
});

test('[Aufnahmekriterium·Gate-Nachweis] eine geplante Farbe unter der Schwelle macht die Probe rot', () => {
  const zuNah = verhaeltnis(hex('#4F6539'), hex('#55693d'));   // nahezu identisch mit Salbei-dunkel
  assert.ok(zuNah < MIN_FLAECHE, 'Detektor: eine salbei-nahe Farbe unterschreitet 3:1 — die Probe hätte sie gefangen');
});

/* ── 2 · Keine Farbe mit Zweitbedeutung ───────────────────────────────────── */

test('[Aufnahmekriterium] jede der sechs Farben setzt beim Betreten einen echten Override — keine Sonderrolle mehr', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.betreteApp();
  for (const tok of V.SUBDEPOT_PALETTE) {
    const e = await V.subDepotAnlegen({ bezeichnung: tok, inhaberin: 'K', verwaltungsTyp: 'verwaltet', akzent: tok }, 'pw');
    await V.subDepotVertrauenOeffnen(e.depotUUID, 'pw');
    V.subKontextBetreten(e.depotUUID);
    const chrome = document.documentElement.style.getPropertyValue('--vm-chrome');
    assert.equal(chrome, 'var(--' + tok + ')', tok + ': echter Override, keine Farbe bleibt „wie ohne Akzent"');
    await V.subKontextVerlassen();
  }
});

test('[Aufnahmekriterium] entferneSubDepotAkzentOverride ist der einzige farbfreie Weg — keine Palettenfarbe übernimmt diese Rolle', () => {
  const { V } = ladeKern();
  assert.equal(typeof V.entferneSubDepotAkzentOverride, 'function', 'eigener, farbfreier Weg existiert');
  // Whitelist-Fallback: kein Palettenwert heisst „kein Akzent" — unbekannte/alte Werte (auch
  // 'schiefer') fallen auf eine ECHTE Farbe zurück, nicht auf einen impliziten Default-Zustand.
  assert.ok(V.SUBDEPOT_PALETTE.includes(V.subDepotAkzentToken('schiefer')), 'Fallback ist eine echte Palettenfarbe');
});

/* ── 3 · Die Kopfzeile bleibt Salbei, in allen drei Themes ────────────────── */

function themeBlock(html, sel) {
  const i = html.indexOf(sel);
  return html.slice(i, html.indexOf('\n  }', i) + 4);
}

test('[Aufnahmekriterium] Kopfzeile: kein Theme übersteuert die Topbar-Fläche mit dem Sub-Akzent', () => {
  const { html } = ladeKern();
  // Hell (:root) und Nacht/HC (Theme-Blöcke) — keiner davon darf .topbar auf --vm-chrome setzen.
  // Ein exaktes Selektor-Ende (Komma oder öffnende Klammer, keine Fortsetzung wie `.tb-eng-2`) —
  // sonst träfe ein UNVERWANDTES, längeres Selektor (z. B. eine Breakpoint-Regel auf ein
  // Kind-Element) fälschlich denselben Text-Präfix und würde als Verstoß gelten (Befund
  // 20.09.2026: `#app.modus-vollmacht .topbar.tb-eng-2 #tb-depot-name { max-width: … }` setzt
  // keine Farbe, träfe aber den bisherigen reinen Substring-Vergleich).
  for (const sel of ['#app.modus-vollmacht .topbar', 'html.dark-mode #app.modus-vollmacht .topbar',
    'html.high-contrast #app.modus-vollmacht .topbar']) {
    const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[{,]');
    assert.ok(!re.test(html), `kein Selektor "${sel}" — die Kopfzeile bleibt in jedem Theme aussen vor`);
  }
  // Die Basis-Regel (gilt in allen drei Themes gleich, da --salbei-dunkel sich kaum bewegt)
  // bleibt Salbei — das IST der Beleg für „dieselbe Fläche wie im Anker".
  // U2-ADR-297 (05.09.2026, Fall 2): die Basis-Regel trägt seither einen zweiten Fallback
  // (--vd-branding-topbar-primaer/-text, nur von der Vor-Depot-Konfiguration gesetzt, s. dort)
  // VOR --salbei-dunkel/--auf-akzent — eine andere Achse (welches PRODUKT das ist), nicht der
  // hier geprüfte Sub-Akzent (in welchem eingehängten Depot man liest). Die Probe bleibt
  // scharf für genau das, was sie zusichert: background/color fallen unbedingt auf
  // Salbei/--auf-akzent zurück, nie auf --vm-chrome (die separate `--fokus`-Regel derselben
  // Klasse, .topbar { --fokus: var(--vm-chrome-text); }, ist eine andere Eigenschaft — Fokusring,
  // nicht Fläche/Text — und war schon vor diesem ADR da, unberührt).
  assert.ok(/\.topbar\s*\{[^}]*background:\s*var\((--vd-branding-topbar-primaer,\s*)?var\(--salbei-dunkel\)\)?/.test(html), 'Topbar-Fläche fällt auf Salbei-dunkel zurück, unbedingt');
  assert.ok(/\.topbar\s*\{[^}]*color:\s*var\((--vd-branding-topbar-text,\s*)?var\(--auf-akzent\)\)?/.test(html), 'Topbar-Text fällt auf --auf-akzent zurück, unbedingt (nicht --vm-chrome-text)');
});

test('[Aufnahmekriterium] Kopfzeile: --auf-akzent (Topbar-Text) ist in jedem Theme definiert, unbeeinflusst vom Sub-Akzent', () => {
  const { html } = ladeKern();
  // Hell: Default #ffffff (kein Theme-Block überschreibt es dort separat).
  assert.ok(/--auf-akzent:\s*#ffffff/.test(html), 'Hell: --auf-akzent #ffffff');
  // Nacht: eigener Wert (helles Ink), unabhängig vom Sub-Akzent.
  const dm = themeBlock(html, 'html.dark-mode {');
  assert.ok(/--auf-akzent:\s*#e9ede7/.test(dm), 'Nacht: --auf-akzent #e9ede7');
  // Hochkontrast überschreibt --auf-akzent nicht eigens — erbt #ffffff aus :root (--white bleibt
  // #ffffff in HC), was für Text auf Salbei weiterhin AAA-Kontrast trägt.
  const hc = themeBlock(html, 'html.high-contrast {');
  assert.ok(!hc.includes('--auf-akzent:'), 'HC übersteuert --auf-akzent nicht eigens (erbt aus :root)');
});
