'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fixliste Nr. 4 — Text auf Akzentfläche bleibt im Nachtmodus lesbar
   ────────────────────────────────────────────────────────────────────────
   DER DEFEKT. `--white` trug zwei Rollen: FLÄCHE (Karten, Papier — die nachts
   zu Recht dunkeln) und TEXT AUF AKZENT (Knopf-, Topbar-, Sidebar-Beschriftung
   — die es nicht darf). Im Nachtmodus gilt `--white: #1f261f`, `--salbei-dunkel`
   bleibt aber unverändert #4F6539. Ergebnis: dunkler Text auf dunklem Grund,
   2,40 bei Pflicht 4,5. Neun von dreizehn `.btn`-Ausprägungen.

   WAS HIER GEPRÜFT WIRD, IST DIE ROLLE, NICHT DIE SCHREIBWEISE. Die Prüfung
   liest die Token-Werte aus dem Produkt und RECHNET mit `tools/lib/kontrast.js`
   — demselben Modul, mit dem die Kampagne misst und das seine eigenen Prüfungen
   hat. Sie greppt keine Selektoren: ob irgendwo `var(--white)` steht, ist
   gleichgültig; ob die Farbe, die dabei herauskommt, lesbar ist, nicht.

   DIE POSITIVKONTROLLE STEHT AUF EIGENEM GRUND. Sie rechnet mit dem
   DOKUMENTIERTEN ALT-WERT (`#1f261f`, dem Nacht-`--white`) und verlangt, dass
   die Rechnung ihn verwirft. Damit hängt sie nicht daran, dass jemand die
   heutige Datei kaputtmacht — sie bliebe auch dann aussagekräftig, wenn der
   Alt-Wert aus dem Produkt längst verschwunden ist. Ohne sie wäre „alles über
   4,5" von einer Rechnung, die immer ja sagt, nicht zu unterscheiden.

   NICHT GEPRÜFT, weil nicht gemessen: der GEDRÜCKTE Zustand von `.a11y-btn`
   (`background: var(--white); color: var(--salbei-dunkel)`). Er ist derselbe
   Fall mit vertauschten Rollen, aber die Messung erreicht ihn nicht — die
   Fixture drückt den Schalter nicht. Er steht als eigene Zeile in der
   Arbeitsliste; abgeleitet statt gemessen wird hier nichts.

   Der VOLLE Nachweis über alle 8478 Messstellen ist Kampagne-Ebene 4. Diese
   Datei ist der schnelle Wächter im Node-Lauf: sie hält die Ursache fest, nicht
   die Fläche.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const K = require('../tools/lib/kontrast.js');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* `tools/lib/kontrast.js` deutet `rgb()`/`rgba()` — das, was ein Browser liefert.
   Die Token im Quelltext stehen als Hex. Umgerechnet wird HIER und nicht dort:
   die Bibliothek misst, was der Browser sagt, und diese Erweiterung waere eine
   Aenderung an dem Modul, auf dem die ganze Kampagne rechnet. */
const rgb = (hex) => {
  const m = String(hex).trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

/** Den Wert eines Tokens aus einem Regelblock lesen. */
function token(block, name) {
  const m = block.match(new RegExp('--' + name + ':\\s*([^;]+);'));
  return m ? m[1].trim() : null;
}
function block(selektor) {
  const i = HTML.indexOf(selektor + ' {');
  assert.notEqual(i, -1, `Regelblock ${selektor} nicht gefunden — die Prüfung misst dann nichts`);
  return HTML.slice(i, HTML.indexOf('\n  }', i));
}

const ROOT = block(':root');
const NACHT = block('html.dark-mode');
const HOCH = block('html.high-contrast');

/* Der dokumentierte Alt-Wert: das Nacht-`--white` vor der Reparatur. */
const ALT_NACHT_WEISS = '#1f261f';
const AKZENT = token(ROOT, 'salbei-dunkel');

/* ── 1 · DER TOKEN EXISTIERT UND KIPPT NICHT INS DUNKLE ───────────────── */

test('[Nr4] die Akzentfläche kippt nachts NICHT — sonst wäre der Defekt woanders', () => {
  assert.equal(token(NACHT, 'salbei-dunkel'), null,
    'Wenn `--salbei-dunkel` im Nachtmodus doch neu gesetzt wird, ist die Annahme dieser Prüfung ' +
    'hinfaellig: dann duerfte die Beschriftung sehr wohl mitkippen. Die Zahlen unten waeren ' +
    'dann gegen die falsche Flaeche gerechnet.');
  assert.ok(/^#[0-9a-fA-F]{6}$/.test(AKZENT || ''), 'Akzentfarbe nicht lesbar: ' + AKZENT);
});

/* ── 2 · DER KERNFALL, in allen drei Themes ──────────────────────────────── */

for (const [name, b] of [['hell', ROOT], ['dark-mode', NACHT], ['high-contrast', HOCH]]) {
  test(`[Nr4] Text auf Akzentfläche haelt 4,5 — Theme ${name}`, () => {
    /* Nicht jedes Theme setzt den Token neu; wer ihn nicht setzt, erbt aus :root. */
    const farbe = token(b, 'auf-akzent') || token(ROOT, 'auf-akzent');
    assert.ok(farbe, `--auf-akzent ist in ${name} weder gesetzt noch erbbar`);
    const k = K.kontrast(rgb(farbe), [rgb(AKZENT)]);
    assert.ok(k, `Farbe nicht deutbar: ${farbe} auf ${AKZENT}`);
    assert.ok(k.wert >= 4.5,
      `${name}: ${farbe} auf ${AKZENT} ergibt ${k.wert} — Pflicht ist 4,5 (WCAG 1.4.3 AA). ` +
      'Genau hier stand Fixliste Nr. 4: die Beschriftung kippte mit, die Flaeche nicht.');
  });
}

/* ── 3 · POSITIVKONTROLLE ─────────────────────────────────────────────────
   Mit dem dokumentierten Alt-Wert MUSS dieselbe Rechnung durchfallen. */

test('[Nr4·Positivkontrolle] mit dem alten Nacht-Weiss faellt dieselbe Rechnung durch', () => {
  const k = K.kontrast(rgb(ALT_NACHT_WEISS), [rgb(AKZENT)]);
  assert.ok(k, 'Alt-Wert nicht deutbar');
  assert.ok(k.wert < 4.5,
    `Der dokumentierte Defekt-Wert ${ALT_NACHT_WEISS} auf ${AKZENT} ergibt ${k.wert} und ` +
    'besteht damit — dann misst diese Pruefung nicht, was sie zu messen behauptet.');
  assert.ok(Math.abs(k.wert - 2.4) < 0.06,
    `erwartet wurden die gemessenen 2,40 aus der Fixliste, gerechnet wurden ${k.wert}. ` +
    'Weicht das ab, hat sich die Akzentfarbe geaendert und die Fixlisten-Zahl gilt nicht mehr.');
});

/* ── 4 · Die drei nachgezogenen Textfarben ───────────────────────────────
   `.regal-karte-titel`, `.deckblatt-name` und `.doku-std-badge` standen nicht
   in der Nachtmodus-Liste und blieben darum bei 2,40 bzw. 2,71. */

test('[Nr4] die drei nachgezogenen Titel stehen in der Nachtmodus-Liste', () => {
  const fehlt = ['regal-karte-titel', 'deckblatt-name', 'doku-std-badge']
    .filter((k) => !new RegExp('html\\.dark-mode \\.' + k + '\\b').test(HTML));
  assert.deepEqual(fehlt, [],
    'Diese Klassen tragen `color: var(--salbei-dunkel)` und brauchen im Nachtmodus die ' +
    'Aufhellung, die die uebrigen Titel laengst haben. Ohne sie: 2,40 bzw. 2,71 ⟦M⟧.');
});

/* ── 5 · B13 · Der GEDRUECKTE a11y-Schalter — dieselbe Rolle, vertauscht ──
   Das Chip kehrt das Verhaeltnis um: helle Flaeche, dunkler Text. Vorher trug
   es `background: var(--white)` — nachts #1f261f, also DUNKEL — mit
   `--salbei-dunkel` darauf: 2,40, derselbe Wert wie beim `.btn`, nur an der
   anderen Seite des Paares.

   BEI 390 px HAT DER KNOPF 0x0 ⟦M⟧ und faellt aus jeder Erhebung — sichtbar
   wird er ab 768 px mit 38x38. Der Fehler lag also NICHT ausserhalb des
   gemessenen ZUSTANDS, wie zunaechst notiert, sondern ausserhalb der gemessenen
   BREITE. Die Kampagne misst nur 390 px; das ist eine eigene Luecke und steht
   als eigene Zeile in der Arbeitsliste. */

test('[B13] der gedrueckte a11y-Schalter haelt 4,5 — helle Flaeche, dunkler Text', () => {
  const regel = HTML.match(/\.a11y-btn\[aria-pressed="true"\]\s*\{[^}]*\}/);
  assert.ok(regel, 'Regel fuer den gedrueckten Zustand nicht gefunden');
  assert.match(regel[0], /background:\s*var\(--auf-akzent\)/,
    'Die Flaeche muss der Token tragen, der in KEINEM Theme ins Dunkle kippt. ' +
    '`--white` war hier falsch: nachts ist er #1f261f.');
  for (const [name, b] of [['hell', ROOT], ['dark-mode', NACHT], ['high-contrast', HOCH]]) {
    const flaeche = token(b, 'auf-akzent') || token(ROOT, 'auf-akzent');
    const k = K.kontrast(rgb(AKZENT), [rgb(flaeche)]);
    assert.ok(k && k.wert >= 4.5,
      `${name}: ${AKZENT} auf ${flaeche} ergibt ${k && k.wert} — der gedrueckte Zustand ist ` +
      'der einzige, in dem eine Buergerin sieht, dass der Schalter an ist.');
  }
});

test('[B13·Positivkontrolle] mit der alten Flaeche faellt dieselbe Rechnung durch', () => {
  const k = K.kontrast(rgb(AKZENT), [rgb(ALT_NACHT_WEISS)]);
  assert.ok(k && k.wert < 4.5,
    `${AKZENT} auf ${ALT_NACHT_WEISS} ergibt ${k && k.wert} und bestuende damit — dann misst ` +
    'diese Pruefung nicht, was sie zu messen behauptet.');
});

test('[B13] aria-pressed wird ABGELEITET, nicht an jeder Stelle gesetzt', () => {
  /* Der zweite Teil des Fundes, und der schwerere: `aria-pressed` wurde an ZWEI
     Umschaltstellen gesetzt, jede nur an ihrem eigenen Knopf. Wer den Nachtmodus
     in den Einstellungen einschaltete, liess den Topbar-Knopf auf „nicht
     gedrueckt" stehen — fuer eine Screenreader-Nutzerin eine falsche Ansage.

     Strukturell geprueft, und das ist hier kein Ausweichen: die Suite laeuft
     gegen einen DOM-Stub, dessen `classList` ein Noop ist (siehe Kopf von
     tests/a11y-schalter.test.js). Ein Verhaltensnachweis braucht den Browser und
     liegt bei der Kampagne. Was hier gehalten wird, ist die Bauform — dass es
     EINE Ableitung gibt und keine zweite Kopie. */
  assert.ok(/function a11ySchalterSpiegeln\(\)/.test(HTML),
    'die Ableitung fehlt — dann traegt jeder Knopf wieder seinen eigenen Zustand');

  const umschalter = [...HTML.matchAll(/toggleHtmlKlasse\('(high-contrast|dark-mode)'\)[^;]*;/g)];
  assert.ok(umschalter.length >= 4, `erwartet vier Umschaltstellen, gefunden ${umschalter.length}`);

  /* KEINE Umschaltstelle setzt aria-pressed selbst. Gesucht wird im Umkreis
     jedes `toggleHtmlKlasse`-Aufrufs, nicht im ganzen Dokument: die Topbar darf
     `aria-pressed` sehr wohl setzen — in `a11ySchalterSpiegeln` und beim
     Vorlese-Schalter, der seinen Zustand aus `vorleseLaeuft()` zieht. */
  const kopien = umschalter
    .map((m) => HTML.slice(m.index, m.index + 220))
    .filter((umkreis) => /setAttribute\('aria-pressed'/.test(umkreis));
  assert.deepEqual(kopien, [],
    'Eine Umschaltstelle setzt `aria-pressed` wieder selbst. Damit gibt es zwei Zustaende, ' +
    'die auseinanderlaufen koennen — und der Knopf, den niemand angefasst hat, sagt das Falsche.');
});

test('[Nr4] die Nacht-Titelfarbe haelt 4,5 auf dem Nachtgrund', () => {
  const grund = token(NACHT, 'cream');
  const k = K.kontrast(rgb('#8eab77'), [rgb(grund)]);
  assert.ok(k && k.wert >= 4.5,
    `#8eab77 auf ${grund} ergibt ${k && k.wert} — die aufgehellten Titel muessen selbst bestehen, ` +
    'sonst ist die Reparatur nur eine andere Zahl unter der Schwelle.');
});
