'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Gekoppelte Proben — Reisen-Registry (Auftrag §7.5)
   ────────────────────────────────────────────────────────────────────────────
   Jede Probe unten hat eine Negativkontrolle: der kaputte Fall wird rot, der
   erlaubte/zurückgedrehte Fall bleibt grün. Ohne die zweite Hälfte wäre eine
   Probe, die immer rot wird, von einer echten nicht zu unterscheiden.

   BROWSER-PROBEN MUTIEREN EINE KOPIE, NIE `vivodepot.html` SELBST (A11-Prinzip,
   wie im Selbsttest der Wächter) — Mutation in eine Datei NEBEN dem Original
   (relative Ressourcen der App bleiben auflösbar), Aufräumen im `finally`, und
   am Ende ein Hash-Vergleich, dass das Original unverändert blieb. Wer diese
   Trennung verletzt, hinterlässt Schaden, den niemand sucht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

const {
  ermittleRueckmeldung, harteFundeAusZustand, vergleicheProtokolle, reiseAusfuehren,
  pdfTjTexteAuslesen, maskiereFluechtigeWerte, dateiExportPruefen, harteFundeAusDateiExport,
} = require('../../tools/lib/reisen-kern.js');
const { REISEN, PW } = require('../../tools/reisen-registry.js');
const { einmalDialogeSchliessen, feldgruppenKartenOeffnen } = require('../e2e/helpers.js');

const REISE_1 = REISEN.find((r) => r.id === 'reise-1-marlies');
/* Schnitt-Nachtrag (18.09.2026): mit BUERGERMODUL_BUENDEL entfernt ist AB_WERK_BEREICH_QUELLEN
   im nativen Gerüst leer (gewollt, s. tests/e2e/global-setup.js) — die Reise gegen die rohe
   vivodepot.html erreichte keine echten Bereiche/Felder. Derselbe Weg wie überall sonst
   (`konfektionieren()`, synchron), Standard-Produkt privat-de. `HTML_PFAD` bleibt die EINE
   Quelle für alle Aufrufer unten — auch für `mitMutierterKopie()`: deren Kopie-neben-dem-
   Original-Prinzip (A11) und der Hash-Rückvergleich gelten jetzt für die GEBACKENE Datei, nicht
   mehr für das Original im Repo — sie bleibt trotzdem unverändert, nur die Referenz ist eine
   andere. */
const _gebacken = konfektionieren({
  ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'reisenregistry-buergerweg-')),
  slug: 'privat-de',
  modulauswahl: [],
  vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
  unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === 'privat-de')),
});
const HTML_PFAD = path.join(_gebacken.ordner, 'vivodepot.html');

function abdruck(pfad) { return crypto.createHash('sha256').update(fs.readFileSync(pfad)).digest('hex'); }

/* Mutierte Kopie NEBEN dem Original ablegen (Konvention aus
   tests/mit-modul/axe-region-landmarks.test.js) — relative Ressourcen (Manifest
   etc.) bleiben auflösbar. `ersetzeVon`/`ersetzeZu`: exakter, geprüft eindeutiger
   Ausschnitt — schlägt der Ersatz fehl (Anker verschoben), bricht die Probe
   LAUT ab statt still gegen das unveränderte Original zu laufen. */
async function mitMutierterKopie(ersetzeVon, ersetzeZu, lauf) {
  const original = fs.readFileSync(HTML_PFAD, 'utf8');
  const vorherHash = abdruck(HTML_PFAD);
  assert.equal((original.match(new RegExp(ersetzeVon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1,
    'ABBRUCH: der Anker für die Mutation ist nicht (mehr) genau einmal im Quelltext — Probe passt nicht mehr.');
  const mutiert = original.replace(ersetzeVon, ersetzeZu);
  const tempDatei = path.join(path.dirname(HTML_PFAD), '.reisen-probe-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tempDatei, mutiert);
  try {
    return await lauf('file://' + tempDatei);
  } finally {
    fs.rmSync(tempDatei, { force: true });
    assert.equal(abdruck(HTML_PFAD), vorherHash,
      'PROBE HAT DAS ORIGINAL VERÄNDERT — vivodepot.html trägt jetzt, was die nächste Grundlinie als Normalzustand messen würde.');
  }
}

async function bisDialogOeffnen(htmlUrl) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const seite = await browser.newPage({ viewport: REISE_1.viewport, hasTouch: true, isMobile: true });
    // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
    // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
    // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
    await seite.addInitScript(() => {
      Object.defineProperty(window, "showSaveFilePicker", {
        configurable: true,
        value: async () => ({
          name: "reise-messung.vivodepot",
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        }),
      });
    });
    const { protokoll } = await reiseAusfuehren(seite, REISE_1, { htmlUrl, bisSchrittId: 'S2-anlege-dialog-oeffnen' });
    await seite.close();
    return protokoll.schritte.find((s) => s.id === 'S2-anlege-dialog-oeffnen');
  } finally {
    await browser.close();
  }
}

/* ── 1 · Geänderter Hinweistext macht den Lauf rot ──────────────────────── */

test('[Reisen·Probe 1] geänderter Hinweistext im Produktivcode ändert das erfasste Protokoll',
  { timeout: 60000 }, async () => {
    const schritt = await bisDialogOeffnen('file://' + HTML_PFAD);
    assert.ok(schritt.hinweise.some((h) => h.includes('Niemand kann es zurücksetzen')),
      'ABBRUCH: der erwartete Warntext steht nicht im Original-Protokoll — Anker geprüft?');

    const von = 'Niemand kann es zurücksetzen — auch wir nicht.';
    const zu = 'Ein Zurücksetzen ist über den Support jederzeit möglich.';
    const mutiert = await mitMutierterKopie(von, zu, bisDialogOeffnen);

    const basis = { schritte: [schritt] };
    const neu = { schritte: [mutiert] };
    const diff = vergleicheProtokolle(basis, neu);
    assert.equal(diff.gleich, false, 'ROT ERWARTET: ein geänderter Sicherheits-Hinweis muss den Grundlinien-Diff auslösen.');
    assert.ok(diff.unterschiede.some((u) => u.includes('hinweise')),
      'der gemeldete Unterschied muss das Feld „hinweise" nennen, nicht irgendein anderes:\n  ' + diff.unterschiede.join('\n  '));
  });

test('[Reisen·Probe 1·Negativkontrolle] unveränderter Text bleibt grün gegen sich selbst',
  { timeout: 60000 }, async () => {
    const a = await bisDialogOeffnen('file://' + HTML_PFAD);
    const b = await bisDialogOeffnen('file://' + HTML_PFAD);
    const diff = vergleicheProtokolle({ schritte: [a] }, { schritte: [b] });
    assert.equal(diff.gleich, true, 'GRÜN ERWARTET: zwei Läufe gegen denselben, unveränderten Quelltext dürfen nicht abweichen:\n  ' +
      diff.unterschiede.join('\n  '));
  });

/* ── 2 · Entfernter Rückweg macht rot ───────────────────────────────────── */

test('[Reisen·Probe 2] ein global unterdrückter Abbrechen-Knopf lässt „Rückweg vorhanden" auf false kippen',
  { timeout: 60000 }, async () => {
    const original = await bisDialogOeffnen('file://' + HTML_PFAD);
    assert.equal(original.rueckwegVorhanden, true, 'ABBRUCH: der Original-Dialog hat schon keinen erkannten Rückweg — Probe misst nichts.');
    assert.ok(original.aktionen.includes('Abbrechen'), 'ABBRUCH: „Abbrechen" fehlt schon im Original — Anker geprüft?');

    // ui.modal()'s generische Render-Zeile — trifft JEDEN Dialog der App, nicht nur den
    // Anlege-Dialog. Genau deshalb ein ehrlicher Test für „der Rückweg verschwindet":
    // keine Attrappe an einer Stelle, sondern der echte, geteilte Mechanismus.
    // 16.09.2026: ui.modal maskiert die Beschriftung selbst — der Anker trägt darum escapeHTML(String(…)).
    const von = "(ohneAbbrechen ? '' : '<button class=\"btn btn-sek\" id=\"m-abbr\">' + escapeHTML(String(STRINGS.btnAbbrechen)) + '</button>') +";
    const zu = "('') +";
    const mutiert = await mitMutierterKopie(von, zu, bisDialogOeffnen);

    assert.equal(mutiert.rueckwegVorhanden, false,
      'ROT ERWARTET: ohne „Abbrechen"-Knopf darf die Erfassung keinen Rückweg mehr melden.');
    assert.ok(!mutiert.aktionen.includes('Abbrechen'), '„Abbrechen" darf nach der Mutation nicht mehr unter den Aktionen stehen.');

    const diff = vergleicheProtokolle({ schritte: [original] }, { schritte: [mutiert] });
    assert.equal(diff.gleich, false, 'ROT ERWARTET: der Grundlinien-Diff muss den verschwundenen Rückweg als Unterschied melden.');
    assert.ok(diff.unterschiede.some((u) => u.includes('rueckwegVorhanden') || u.includes('aktionen')),
      'der Unterschied muss „rueckwegVorhanden" oder „aktionen" nennen:\n  ' + diff.unterschiede.join('\n  '));
  });

test('[Reisen·Probe 2·Negativkontrolle] mit vorhandenem Abbrechen-Knopf bleibt „Rückweg vorhanden" true',
  { timeout: 60000 }, async () => {
    const schritt = await bisDialogOeffnen('file://' + HTML_PFAD);
    assert.equal(schritt.rueckwegVorhanden, true, 'GRÜN ERWARTET: der unveränderte Dialog trägt „Abbrechen" — Rückweg muss erkannt werden.');
  });

/* ── 3 · Selektor-nur-Erfassung wäre gegen Probe 1 blind (Beleg für §2) ──── */

test('[Reisen·Beleg §2] eine Erfassung, die nur Selektor-Existenz prüft, sieht den Hinweistext-Wechsel aus Probe 1 NICHT',
  { timeout: 60000 }, async () => {
    // Absichtlich naiv, NUR für diese Probe — genau der Fehler, den der Auftrag (§2)
    // ausschließen will: „ob ein Element existiert" statt „was daneben steht".
    const nurSelektor = () => !!document.querySelector('.modal-warnung');

    const { chromium } = require('playwright');
    const messen = async (htmlUrl) => {
      const browser = await chromium.launch();
      try {
        const seite = await browser.newPage({ viewport: REISE_1.viewport });
        // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
        // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
        // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
        await seite.addInitScript(() => {
          Object.defineProperty(window, "showSaveFilePicker", {
            configurable: true,
            value: async () => ({
              name: "reise-messung.vivodepot",
              createWritable: async () => ({ write: async () => {}, close: async () => {} }),
            }),
          });
        });
        await seite.goto(htmlUrl);
        await seite.click('#w-anfangen', { timeout: 5000 });
        await seite.click('#tb-pw-hinweis', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'visible', timeout: 5000 });
        return await seite.evaluate(nurSelektor);
      } finally { await browser.close(); }
    };

    const original = await messen('file://' + HTML_PFAD);
    const von = 'Niemand kann es zurücksetzen — auch wir nicht.';
    const zu = 'Ein Zurücksetzen ist über den Support jederzeit möglich.';
    let mutiertErgebnis;
    const alterOriginal = fs.readFileSync(HTML_PFAD, 'utf8');
    const vorherHash = abdruck(HTML_PFAD);
    assert.equal((alterOriginal.match(new RegExp(von.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) || []).length, 1);
    const mutiert = alterOriginal.replace(von, zu);
    const tempDatei = path.join(path.dirname(HTML_PFAD), '.reisen-probe-selektor-' + process.pid + '-' + Date.now() + '.html');
    fs.writeFileSync(tempDatei, mutiert);
    try {
      mutiertErgebnis = await messen('file://' + tempDatei);
    } finally {
      fs.rmSync(tempDatei, { force: true });
      assert.equal(abdruck(HTML_PFAD), vorherHash, 'PROBE HAT DAS ORIGINAL VERÄNDERT.');
    }

    assert.equal(original, true);
    assert.equal(mutiertErgebnis, true);
    assert.equal(original, mutiertErgebnis,
      'BELEG: eine reine Selektor-Existenzprüfung bleibt bei geändertem Wortlaut UNVERÄNDERT (beide „true") ' +
      '— sie hätte Probe 1 nicht bestanden. Die echte Erfassung (erfasseZustandBrowser) erfasst Text, genau darum.');
  });

/* ── 4 · Sackgassen-Prüfung — künstliche Sackgasse gefunden, Negativkontrolle,
         UND: eine entschärfte Prüfung würde dieselbe Sackgasse übersehen ──── */

const SCHRITT_BASIS = { id: 'x', titel: 'Testschritt', veraendernd: false, geraetepunkt: null };

test('[Reisen·Probe 3] eine künstlich gebaute Sackgasse (keine Aktion, kein Rückweg) wird gefunden', () => {
  const zustand = { aktionen: [], rueckwegVorhanden: false };
  const funde = harteFundeAusZustand(SCHRITT_BASIS, zustand, null, []);
  assert.ok(funde.some((f) => f.art === 'sackgasse'), 'ROT ERWARTET: kein Weg vorwärts, kein Weg zurück — das ist die Definition einer Sackgasse.');
});

test('[Reisen·Probe 3·Negativkontrolle] derselbe leere Aktionen-Zustand MIT Rückweg ist keine Sackgasse', () => {
  // Ähnlich, aber erlaubt (Konvention aus dem Register aller Wächter): keine
  // bedienbaren Elemente im Blick, aber ein erkannter Rückweg — z. B. ein reiner
  // Lese-Zwischenschritt mit „Abbrechen"/„Zurück" als einziger Aktion, die selbst
  // wieder aus der Aktionenliste erkannt wurde.
  const zustand = { aktionen: [], rueckwegVorhanden: true };
  const funde = harteFundeAusZustand(SCHRITT_BASIS, zustand, null, []);
  assert.ok(!funde.some((f) => f.art === 'sackgasse'), 'GRÜN ERWARTET: ein vorhandener Rückweg ist keine Sackgasse, auch ohne weitere Aktionen.');
});

test('[Reisen·Probe 3·Entschärfungs-Kontrolle] eine Prüfung ohne die Sackgassen-Bedingung übersieht dieselbe künstliche Sackgasse',
  () => {
    // „Prüfung entschärfen → Probe rot" (Auftrag §7.5): eine Kopie von
    // harteFundeAusZustand, der GENAU die Sackgassen-Bedingung fehlt, muss an
    // demselben Fall versagen, den Probe 3 oben fängt — sonst wäre die Bedingung
    // in der echten Funktion nicht das, was den Unterschied macht.
    function entschaerft(schritt, zustand) {
      // absichtlich OHNE den Sackgassen-Block — der Rest ist irrelevant für diese Kontrolle.
      return [];
    }
    const zustand = { aktionen: [], rueckwegVorhanden: false };
    const echteFunde = harteFundeAusZustand(SCHRITT_BASIS, zustand, null, []);
    const entschaerfteFunde = entschaerft(SCHRITT_BASIS, zustand);
    assert.ok(echteFunde.some((f) => f.art === 'sackgasse'), 'Voraussetzung: die echte Prüfung findet die Sackgasse (s. Probe 3).');
    assert.equal(entschaerfteFunde.length, 0,
      'Die entschärfte Prüfung MUSS an derselben Sackgasse versagen (0 Funde) — das zeigt, dass die ' +
      'Sackgassen-Bedingung selbst es ist, die den Fund liefert, nicht ein Zufall der Testdaten.');
  });

/* ── 5 · Aktion ohne Rückmeldung ─────────────────────────────────────────── */

test('[Reisen·Probe 4] eine verändernde Aktion ohne Rückmeldung wird gefunden', () => {
  const zustand = { aktionen: ['Speichern'], rueckwegVorhanden: false };
  const veraendernderSchritt = { ...SCHRITT_BASIS, veraendernd: true };
  const rueckmeldung = ermittleRueckmeldung({ modalOffen: false, modalTitel: '', toastText: '' }, { modalOffen: false, modalTitel: '', toastText: '' });
  const funde = harteFundeAusZustand(veraendernderSchritt, zustand, rueckmeldung, []);
  assert.ok(funde.some((f) => f.art === 'ohne-rueckmeldung'), 'ROT ERWARTET: verändernde Aktion, aber kein Toast, kein neuer/geschlossener Dialog.');
});

test('[Reisen·Probe 4·Negativkontrolle] dieselbe Aktion MIT erkannter Rückmeldung wird nicht gemeldet', () => {
  const zustand = { aktionen: ['Speichern'], rueckwegVorhanden: false };
  const veraendernderSchritt = { ...SCHRITT_BASIS, veraendernd: true };
  const rueckmeldung = ermittleRueckmeldung({ modalOffen: true, modalTitel: 'X', toastText: '' }, { modalOffen: false, modalTitel: '', toastText: '' });
  assert.equal(rueckmeldung, 'Dialog geschlossen');
  const funde = harteFundeAusZustand(veraendernderSchritt, zustand, rueckmeldung, []);
  assert.ok(!funde.some((f) => f.art === 'ohne-rueckmeldung'), 'GRÜN ERWARTET: ein sich schließender Dialog IST eine Rückmeldung.');
});

/* ── 6 · Sektorfeld-Autosave-Rückmeldung (Auftrag 03.08.2026) ─────────────
   Das sichtbare Häkchen selbst ist aria-hidden (rein visuell) — die geprüfbare Rückmeldung
   läuft über die entprellte aria-live-Ansage (#autosave-live), erfasst in
   feedbackSchnappschussBrowser als `autosaveLiveText`. Reine Funktionsproben hier; die
   gekoppelte End-zu-Ende-Probe ist die Reise-2-Grundlinie selbst (S6-blutgruppe-eintragen
   trägt jetzt `rueckmeldung: "Angesagt: „Gespeichert""` statt des vorherigen harten Funds
   `ohne-rueckmeldung` — s. das aufgezeichnete Protokoll der Reise 2). */

test('[Reisen·Probe 6] eine neue Autosave-Ansage wird als Rückmeldung erkannt', () => {
  const rueckmeldung = ermittleRueckmeldung(
    { modalOffen: false, modalTitel: '', toastText: '', autosaveLiveText: '' },
    { modalOffen: false, modalTitel: '', toastText: '', autosaveLiveText: 'Gespeichert' },
  );
  assert.equal(rueckmeldung, 'Angesagt: „Gespeichert"');
});

/* ── 7 · CI-Flake-Befund (03.08.2026, Reise 4/Sub-Depot-Kette) ───────────────
   `ui.toast()` hängt jeden Toast 3200ms lang in #toast-host, unabhängig von anderen — zwei
   Toasts aus verschiedenen, zeitlich auseinanderliegenden Schritten können gleichzeitig im DOM
   stehen. Reproduziert den GitHub-Actions-Fund (E2E-Reisen, Commit 2b707ff, Reise 4 Probe 2):
   ein älterer, unabhängiger Toast verschwindet zwischen vor/nach — `toastText` (Konkatenation)
   ändert sich dadurch, obwohl der aktuelle Schritt kein neues Feedback erzeugt hat. Lokal (schnelle,
   gleichförmige Ausführung) bleiben beide Toasts über das ganze Fenster unverändert stehen, das
   Fenster für den Fund existiert dort praktisch nie — daher lokal reproduzierbar grün, in CI
   beobachtet rot (langsamere Krypto-Ableitung vor Playwrights `wartenMs` verschiebt das Fenster). */

test('[Reisen·Probe 7 · CI-Flake] ein ALTER, unabhängiger Toast, der zwischen vor/nach verschwindet, wird NICHT als neue Rückmeldung gemeldet', () => {
  // Zustand exakt wie im CI-Fund: bei „vor" leben zwei Toasts (S6 „Sub-Depot angelegt" + S7
  // „Sub-Depot für diese Sitzung geöffnet"), bei „nach" ist der ältere (S6) abgelaufen — nur
  // der S7-Toast bleibt, UNVERÄNDERT, kein neuer Text ist hinzugekommen.
  const vor = { modalOffen: false, modalTitel: '', toastTexte: ['Sub-Depot angelegt.', 'Sub-Depot für diese Sitzung geöffnet.'], autosaveLiveText: '' };
  const nach = { modalOffen: false, modalTitel: '', toastTexte: ['Sub-Depot für diese Sitzung geöffnet.'], autosaveLiveText: 'Gespeichert' };
  const rueckmeldung = ermittleRueckmeldung(vor, nach);
  assert.equal(rueckmeldung, 'Angesagt: „Gespeichert"',
    'ROT ERWARTET, wenn falsch: das Verschwinden des ALTEN S6-Toasts darf den S7-Toast nicht als ' +
    '„neu" ausweisen — die echte Rückmeldung dieses Schritts ist die Autosave-Ansage.');
});

test('[Reisen·Probe 7·Entschärfungs-Kontrolle] die alte, konkatenierende Erkennung (toastText statt toastTexte) tappt genau in den CI-Fund',
  () => {
    // Wörtlicher Nachbau der VOR dem Fix genutzten Zeile — Konkatenation über `.textContent`,
    // kein Trennzeichen zwischen mehreren Toasts (wie im echten DOM).
    const alteErkennung = (vor, nach) => {
      if (nach.toastText && nach.toastText !== vor.toastText) return 'Meldung: „' + nach.toastText + '"';
      return null;
    };
    const vor = { toastText: 'Sub-Depot angelegt.Sub-Depot für diese Sitzung geöffnet.' };
    const nach = { toastText: 'Sub-Depot für diese Sitzung geöffnet.' };
    const ergebnis = alteErkennung(vor, nach);
    assert.equal(ergebnis, 'Meldung: „Sub-Depot für diese Sitzung geöffnet."',
      'BELEG: die alte Konkatenations-Prüfung meldet den lediglich ÜBRIGGEBLIEBENEN Toast fälschlich ' +
      'als neue Rückmeldung — exakt der in CI beobachtete Fehlschlag (erwartet „Gespeichert", bekam ' +
      'diesen Satz).');
  });

test('[Reisen·Probe 7·Negativkontrolle] ein WIRKLICH neuer Toast wird weiterhin erkannt', () => {
  const vor = { modalOffen: false, modalTitel: '', toastTexte: ['Sub-Depot für diese Sitzung geöffnet.'], autosaveLiveText: '' };
  const nach = { modalOffen: false, modalTitel: '', toastTexte: ['Sub-Depot für diese Sitzung geöffnet.', 'Etwas ist schiefgelaufen.'], autosaveLiveText: '' };
  const rueckmeldung = ermittleRueckmeldung(vor, nach);
  assert.equal(rueckmeldung, 'Meldung: „Etwas ist schiefgelaufen."',
    'GRÜN ERWARTET: ein Text, der bei „vor" noch nicht vorkam, ist eine echte neue Rückmeldung.');
});

/* Zweiter Toast-Fund (03.08.2026, blinde Stelle des ersten Fixes, s. Auftrag Punkt 5): Probe 7 macht
   die Erkennung robust gegen das VERSCHWINDEN eines alten Toasts, aber `.includes()` ist eine
   Mengendifferenz, keine Zählung — löst ein Schritt einen Toast aus, dessen TEXT schon von einem noch
   lebenden älteren Toast belegt ist (z. B. zweimal „Gespeichert" kurz hintereinander), steht dieser
   Text bereits in `vor`, und die echte neue Rückmeldung würde als „keine" gemeldet. Fix: `vor` wird zu
   einer Text→Anzahl-Zählung, jeder Text in `nach` verbraucht zuerst ein passendes Vorkommen aus `vor` —
   bleibt danach ein Text übrig, ist GENAU DIESES Vorkommen neu. */

test('[Reisen·Probe 8] ein zweiter Toast mit GLEICHEM Text wie ein noch lebender älterer Toast wird als neue Rückmeldung erkannt', () => {
  const vor = { modalOffen: false, modalTitel: '', toastTexte: ['Gespeichert.'], autosaveLiveText: '' };
  const nach = { modalOffen: false, modalTitel: '', toastTexte: ['Gespeichert.', 'Gespeichert.'], autosaveLiveText: '' };
  const rueckmeldung = ermittleRueckmeldung(vor, nach);
  assert.equal(rueckmeldung, 'Meldung: „Gespeichert."',
    'ROT ERWARTET, wenn falsch: ein ZWEITER, echter Toast mit demselben Text wie der noch lebende ' +
    'erste ist eine neue Rückmeldung — eine reine Mengendifferenz (.includes()) würde ihn übersehen, ' +
    'weil der Text schon in „vor" vorkam.');
});

test('[Reisen·Probe 8·Entschärfungs-Kontrolle] die reine Mengendifferenz (.includes()) übersieht den zweiten, echten Toast', () => {
  // Wörtlicher Nachbau der Probe-7-Fix-Logik vor dem Zähl-Fix — .includes() statt Zählung.
  const alteErkennungMengendifferenz = (vor, nach) => {
    const vorToasts = vor.toastTexte || [];
    const nachToasts = nach.toastTexte || [];
    const neueToasts = nachToasts.filter((t) => t && !vorToasts.includes(t));
    return neueToasts.length ? 'Meldung: „' + neueToasts.join('') + '"' : null;
  };
  const vor = { toastTexte: ['Gespeichert.'] };
  const nach = { toastTexte: ['Gespeichert.', 'Gespeichert.'] };
  const ergebnis = alteErkennungMengendifferenz(vor, nach);
  assert.equal(ergebnis, null,
    'BELEG: die reine Mengendifferenz meldet HIER FÄLSCHLICH „keine neue Rückmeldung" — der zweite ' +
    '„Gespeichert."-Toast ist echt, wird aber übersehen, weil derselbe Text schon in „vor" stand.');
});

test('[Reisen·Probe 8·Negativkontrolle] gleich viele gleichlautende Toasts vor und nach bleiben ohne neue Rückmeldung', () => {
  const vor = { modalOffen: false, modalTitel: '', toastTexte: ['Gespeichert.', 'Gespeichert.'], autosaveLiveText: '' };
  const nach = { modalOffen: false, modalTitel: '', toastTexte: ['Gespeichert.', 'Gespeichert.'], autosaveLiveText: '' };
  const rueckmeldung = ermittleRueckmeldung(vor, nach);
  assert.equal(rueckmeldung, null,
    'GRÜN ERWARTET: keine zusätzliche Rückmeldung, wenn sich die ANZAHL gleichlautender Toasts nicht ' +
    'erhöht hat — die Zählung darf nicht jeden Text bei gleicher Menge erneut als „neu" lesen.');
});

test('[Reisen·Probe 6·Negativkontrolle] eine ohnehin schon leere Ansage bleibt ohne Rückmeldung', () => {
  const rueckmeldung = ermittleRueckmeldung(
    { modalOffen: false, modalTitel: '', toastText: '', autosaveLiveText: '' },
    { modalOffen: false, modalTitel: '', toastText: '', autosaveLiveText: '' },
  );
  assert.equal(rueckmeldung, null, 'GRÜN ERWARTET: keine Ansage vorher, keine nachher — kein Fund erfinden.');
});

test('[Reisen·Probe 6·bekannte Grenze, dokumentiert] zwei IDENTISCHE Ansagen hintereinander sind von hier aus nicht unterscheidbar', () => {
  // Dieselbe Eigenschaft wie beim Toast-Vergleich (Probe 4 s. o.) — kein neues Problem, hier nur
  // für den neuen Kanal belegt, damit es nicht als Überraschung gilt, falls es je auffällt.
  const rueckmeldung = ermittleRueckmeldung(
    { modalOffen: false, modalTitel: '', toastText: '', autosaveLiveText: 'Gespeichert' },
    { modalOffen: false, modalTitel: '', toastText: '', autosaveLiveText: 'Gespeichert' },
  );
  assert.equal(rueckmeldung, null,
    'Dokumentiert, nicht gewünscht: eine zweite, textgleiche Ansage direkt nach der ersten wird nicht als EIGENE Rückmeldung erkannt.');
});

/* ── 5 · Datei-Export-Check (Notfallkarte/PDF) — Wortlaut aus der Datei, kein DOM ────
   Reine Funktionen zuerst (pdfTjTexteAuslesen, maskiereFluechtigeWerte, dateiExportPruefen,
   harteFundeAusDateiExport), dann EINE gekoppelte Probe gegen den echten #n-karte-Pfad
   (flowNotfallkartePdf), mit Negativkontrolle — Auftrag §7.5 gilt für diesen Baustein
   genauso wie für den DOM-Fall. */

test('[Reisen·PDF-Text] pdfTjTexteAuslesen liest Tj-Textoperatoren in Dokument-Reihenfolge', () => {
  const pufferText = 'BT /F1 8 Tf (Erste Zeile) Tj ET BT (Zweite Zeile) Tj ET';
  const zeilen = pdfTjTexteAuslesen(Buffer.from(pufferText, 'latin1'));
  assert.deepEqual(zeilen, ['Erste Zeile', 'Zweite Zeile']);
});

test('[Reisen·PDF-Text·Negativkontrolle] ohne Puffer liefert pdfTjTexteAuslesen eine leere Liste, keinen Wurf', () => {
  assert.deepEqual(pdfTjTexteAuslesen(null), []);
});

test('[Reisen·PDF-Text·Rot-Beweis] hex-codierte Tj-Strings (eingebetteter Composite-Font) werden über die /ToUnicode-CMap gelesen', () => {
  // Fund 27.08.2026 (PDF-Inter-Font): ein eingebetteter TrueType-Font (jsPDF `addFont`,
  // Type0/Identity-H) schreibt Text als `<hexCIDs> Tj`, nicht mehr als literal `(Text) Tj` —
  // ohne diesen Zweig lieferte pdfTjTexteAuslesen hier fälschlich [] statt des echten Texts.
  // "H" (CID 0001), "i" (CID 0002) — eine winzige, echte bfchar-CMap wie jsPDF sie erzeugt.
  const cmap = 'beginbfchar\n<0001> <0048>\n<0002> <0069>\nendbfchar';
  const pufferText = '20 0 obj\n<< >>\nstream\n' + cmap + '\nendstream\nendobj\nBT <00010002> Tj ET';
  const zeilen = pdfTjTexteAuslesen(Buffer.from(pufferText, 'latin1'));
  assert.deepEqual(zeilen, ['Hi']);
});

test('[Reisen·PDF-Text·Rot-Beweis·Gegenprobe] bfrange (fortlaufende Form) wird ebenfalls aufgelöst', () => {
  // bfrange statt bfchar — die zweite Form, die jsPDF/fontTools-Subsets ausgeben können
  // (fortlaufender CID-Block auf einen fortlaufenden Unicode-Block gemappt).
  const cmap = 'beginbfrange\n<0001> <0003> <0048>\nendbfrange';   // CID 1→H(0x48), 2→I(0x49), 3→J(0x4A)
  const pufferText = 'stream\n' + cmap + '\nendstream\nBT <000100020003> Tj ET';
  const zeilen = pdfTjTexteAuslesen(Buffer.from(pufferText, 'latin1'));
  assert.deepEqual(zeilen, ['HIJ']);
});

test('[Reisen·Maskierung] maskiereFluechtigeWerte ersetzt NUR den exakt bekannten flüchtigen Wert', () => {
  // Absichtlich zwei Zeilen mit derselben Ziffernform TT.MM.JJJJ — die eine ist das
  // flüchtige Erstelldatum (wird maskiert), die andere ein echtes Geburtsdatum (bleibt
  // stehen). Ein generisches Datums-MUSTER würde beide treffen — das ist genau der Fehler,
  // den dieser Baustein vermeiden muss (s. Kopfkommentar bei maskiereFluechtigeWerte).
  const zeilen = ['Erstellt am 03.08.2026', 'Geburtsdatum 15.03.1988'];
  const maskiert = maskiereFluechtigeWerte(zeilen, ['03.08.2026']);
  assert.equal(maskiert[0], 'Erstellt am <FLUECHTIG>');
  assert.equal(maskiert[1], 'Geburtsdatum 15.03.1988', 'GRÜN ERWARTET: ein Geburtsdatum mit derselben Ziffernform darf NICHT mit-maskiert werden.');
});

test('[Reisen·Maskierung·Entschärfungs-Kontrolle] ein generisches Datums-Muster würde das Geburtsdatum mit-verschlucken', () => {
  // Beleg, dass die Geburtsdatum-Unterscheidung oben nicht zufällig grün ist: eine naive
  // Muster-Maskierung (die Falle, die maskiereFluechtigeWerte bewusst NICHT baut) verschluckt
  // an derselben Stelle ein echtes Feld.
  const naiv = (zeile) => zeile.replace(/\d{2}\.\d{2}\.\d{4}/g, '<FLUECHTIG>');
  const zeilen = ['Erstellt am 03.08.2026', 'Geburtsdatum 15.03.1988'].map(naiv);
  assert.equal(zeilen[1], 'Geburtsdatum <FLUECHTIG>',
    'die naive Muster-Maskierung verschluckt das Geburtsdatum — genau der Fehler, den der exakte Wert-Abgleich vermeidet.');
});

test('[Reisen·Datei-Export] dateiExportPruefen erkennt Format/Name/Größe und liefert maskierten Wortlaut', () => {
  const echtesPdf = Buffer.concat([Buffer.from('%PDF-1.3\n'), Buffer.alloc(2000, 0x20), Buffer.from('(Petra) Tj (03.08.2026) Tj')]);
  const befund = dateiExportPruefen({
    dateiname: 'Vivodepot_Notfallkarte.pdf', puffer: echtesPdf,
    dateinameMuster: /^Vivodepot_Notfallkarte\.pdf$/, mindestBytes: 500,
    fluechtigeWerte: ['03.08.2026'],
  });
  assert.equal(befund.heruntergeladen, true);
  assert.equal(befund.dateinameOk, true);
  assert.equal(befund.magiePdf, true);
  assert.equal(befund.groesseOk, true);
  assert.deepEqual(befund.textZeilen, ['Petra', '<FLUECHTIG>']);
});

test('[Reisen·Datei-Export·Negativkontrolle] kein Download, falscher Name, keine PDF-Kennung, zu klein — alle vier Tatsachen einzeln erkannt', () => {
  const keinDownload = dateiExportPruefen({ dateiname: null, puffer: null, dateinameMuster: /x/, mindestBytes: 1, fluechtigeWerte: [] });
  assert.equal(keinDownload.heruntergeladen, false);
  assert.ok(harteFundeAusDateiExport(SCHRITT_BASIS, keinDownload).some((f) => f.art === 'datei-export-fehlt'));

  const falscherName = dateiExportPruefen({
    dateiname: 'Sonstwas.pdf', puffer: Buffer.from('%PDF-1.3' + ' '.repeat(500)),
    dateinameMuster: /^Vivodepot_Notfallkarte\.pdf$/, mindestBytes: 10, fluechtigeWerte: [],
  });
  assert.ok(harteFundeAusDateiExport(SCHRITT_BASIS, falscherName).some((f) => f.art === 'datei-export-name'));

  const keinPdf = dateiExportPruefen({
    dateiname: 'Vivodepot_Notfallkarte.pdf', puffer: Buffer.from('nicht ein pdf' + ' '.repeat(500)),
    dateinameMuster: /^Vivodepot_Notfallkarte\.pdf$/, mindestBytes: 10, fluechtigeWerte: [],
  });
  assert.ok(harteFundeAusDateiExport(SCHRITT_BASIS, keinPdf).some((f) => f.art === 'datei-export-format'));

  const zuKlein = dateiExportPruefen({
    dateiname: 'Vivodepot_Notfallkarte.pdf', puffer: Buffer.from('%PDF-1.3'),
    dateinameMuster: /^Vivodepot_Notfallkarte\.pdf$/, mindestBytes: 2000, fluechtigeWerte: [],
  });
  assert.ok(harteFundeAusDateiExport(SCHRITT_BASIS, zuKlein).some((f) => f.art === 'datei-export-groesse'));
});

test('[Reisen·Datei-Export·Negativkontrolle] ein vollständiger, ausreichend großer PDF-Download meldet keine harten Funde', () => {
  const befund = dateiExportPruefen({
    dateiname: 'Vivodepot_Notfallkarte.pdf',
    puffer: Buffer.concat([Buffer.from('%PDF-1.3\n'), Buffer.alloc(2000, 0x20)]),
    dateinameMuster: /^Vivodepot_Notfallkarte\.pdf$/, mindestBytes: 500, fluechtigeWerte: [],
  });
  assert.deepEqual(harteFundeAusDateiExport(SCHRITT_BASIS, befund), []);
});

/* ── 6 · Gekoppelte Probe gegen den echten Notfallkarte-PDF-Pfad ──────────────────
   Fährt die App bis #n-karte (Notfall-Sicht), löst den echten Download aus (jsPDF, inline
   im Bündel) und vergleicht den erfassten, maskierten Wortlaut. Negativkontrolle wie
   Probe 1: ein geänderter Kartentext im Produktivcode muss den Diff rot machen. */

function reiseNotfallkartePdfProbe() {
  return {
    id: 'probe-notfallkarte-pdf',
    persona: { name: 'Petra-Probe' },
    ziel: 'Notfallkarte als PDF herunterladen',
    viewport: { width: 390, height: 844 },
    schritte: [
      {
        id: 'S0', titel: 'Landing', veraendernd: false,
        aktion: async (seite, htmlUrl) => {
          await seite.goto(htmlUrl);
          await seite.waitForSelector('#w-anlass', { state: 'visible', timeout: 15000 });
        },
      },
      {
        id: 'S1', titel: 'Einstieg', veraendernd: false,
        aktion: async (seite) => {
          await seite.click('#w-anfangen', { timeout: 5000 });
          await seite.waitForSelector('#tb-pw-hinweis', { state: 'visible', timeout: 10000 });
        },
      },
      {
        id: 'S2', titel: 'Anlege-Dialog öffnen', veraendernd: false,
        aktion: async (seite) => {
          await seite.click('#tb-pw-hinweis', { timeout: 5000 });
          await seite.waitForSelector('#id-pw', { state: 'visible', timeout: 5000 });
        },
      },
      {
        id: 'S3', titel: 'Depot anlegen', veraendernd: true, wartenMs: 500,
        aktion: async (seite) => {
          await seite.fill('#id-vorname', 'Petra', { timeout: 5000 });
          await seite.fill('#id-nachname', 'Probe', { timeout: 5000 });
          await seite.fill('#id-pw', PW, { timeout: 5000 });
          await seite.fill('#id-pw2', PW, { timeout: 5000 });
          await seite.click('#m-ok', { timeout: 5000 });
          await seite.waitForSelector('#id-pw', { state: 'hidden', timeout: 20000 });
        },
      },
      {
        id: 'S4', titel: 'Einmal-Angebot schließen', veraendernd: false,
        aktion: async (seite) => { await einmalDialogeSchliessen(seite); },
      },
      {
        id: 'S5', titel: 'Gesundheit öffnen', veraendernd: false,
        aktion: async (seite) => {
          const hamburger = seite.locator('#tb-menue');
          if (await hamburger.isVisible().catch(() => false)) {
            await hamburger.click({ timeout: 5000 });
            await seite.waitForSelector('#app.menue-auf', { timeout: 5000 });
          }
          // U2-ADR-171 (25.08.2026): der Bereichs-Knopf steckt seit heute in einem
          // kollabierbaren <details class="nav-gruppe"> — dasselbe Muster wie der
          // hamburger-Schritt zwei Zeilen darüber, nur eine Ebene tiefer.
          // Navigation A (05.10.2026): Umschalter „Alle Bereiche zeigen“ entfallen; Klick-Locator auf
          // `#sidebar` verengt (wie tests/e2e/helpers.js oeffneSektor).
          const gruppe = seite.locator('details.nav-gruppe', { has: seite.locator('[data-sektor="health"]') });
          if (await gruppe.count()) {
            const offen = await gruppe.evaluate((el) => el.open);
            if (!offen) await gruppe.locator('summary').click({ timeout: 5000 });
          }
          await seite.click('#sidebar [data-sektor="health"]', { timeout: 5000 });
          await seite.waitForSelector('#content .bereich-kopf', { timeout: 5000 });
          // Statuskarten (Task B.1ff., 26.08.2026): dieselbe Öffnen-vor-Zugriff-Falle wie beim
          // nav-gruppe-Klick oben, eine Ebene tiefer — s. tests/e2e/helpers.js.
          await feldgruppenKartenOeffnen(seite);
        },
      },
      {
        id: 'S6', titel: 'Blutgruppe eintragen', veraendernd: true,
        aktion: async (seite) => { await seite.selectOption('[data-edit="bloodType"]', 'A+', { timeout: 5000 }); },
      },
      {
        id: 'S7', titel: 'Notfall-Sicht öffnen', veraendernd: false,
        aktion: async (seite) => {
          const hamburger = seite.locator('#tb-menue');
          if (await hamburger.isVisible().catch(() => false)) {
            await hamburger.click({ timeout: 5000 });
            await seite.waitForSelector('#app.menue-auf', { timeout: 5000 });
          }
          await seite.click('[data-notfall="1"]', { timeout: 5000 });
          await seite.waitForSelector('#n-karte', { state: 'visible', timeout: 10000 });
        },
      },
      {
        id: 'S8-notfallkarte-pdf', titel: 'Notfallkarte als PDF herunterladen', veraendernd: false,
        dateiExport: {
          dateinameMuster: /^Vivodepot_Notfallkarte\.pdf$/,
          mindestBytes: 2000,
          aktion: async (seite) => { await seite.click('#n-karte', { timeout: 5000 }); },
          bekannteFluechtigeWerte: async (seite) => {
            const meta = await seite.evaluate(() => window.__vdOeffentlich.notfallKartenMeta());
            return [meta.datum];
          },
        },
      },
    ],
  };
}

async function notfallkartePdfSchritt(htmlUrl) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
    // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
    // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
    // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
    await seite.addInitScript(() => {
      Object.defineProperty(window, "showSaveFilePicker", {
        configurable: true,
        value: async () => ({
          name: "reise-messung.vivodepot",
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        }),
      });
    });
    const { protokoll } = await reiseAusfuehren(seite, reiseNotfallkartePdfProbe(), { htmlUrl });
    await seite.close();
    return protokoll.schritte.find((s) => s.id === 'S8-notfallkarte-pdf');
  } finally {
    await browser.close();
  }
}

test('[Reisen·Probe 5] geänderter Kartentext in flowNotfallkartePdf ändert den erfassten Datei-Export-Wortlaut',
  { timeout: 60000 }, async () => {
    const schritt = await notfallkartePdfSchritt('file://' + HTML_PFAD);
    assert.equal(schritt.dateiExport.dateiname, 'Vivodepot_Notfallkarte.pdf');
    assert.ok(schritt.dateiExport.textZeilen.some((z) => z.includes('wichtige Informationen')),
      'ABBRUCH: der erwartete Kartentitel steht nicht im Original-Protokoll — Anker geprüft?\n  ' +
      JSON.stringify(schritt.dateiExport.textZeilen));
    assert.ok(schritt.dateiExport.textZeilen.some((z) => z.includes('<FLUECHTIG>')),
      'das heutige Erstelldatum muss maskiert sein, nicht im Klartext im Protokoll stehen:\n  ' +
      JSON.stringify(schritt.dateiExport.textZeilen));

    const von = 'Notfall — wichtige Informationen';
    const zu = 'Notfall — akute Informationen';
    const mutiert = await mitMutierterKopie(von, zu, notfallkartePdfSchritt);

    const diff = vergleicheProtokolle({ schritte: [schritt] }, { schritte: [mutiert] });
    assert.equal(diff.gleich, false, 'ROT ERWARTET: ein geänderter Kartentext muss den Grundlinien-Diff auslösen.');
    assert.ok(diff.unterschiede.some((u) => u.includes('dateiExport')),
      'der gemeldete Unterschied muss das Feld „dateiExport" nennen, nicht irgendein anderes:\n  ' + diff.unterschiede.join('\n  '));
  });

test('[Reisen·Probe 5·Negativkontrolle] unveränderter Kartentext bleibt grün, obwohl sich das Erstelldatum zwischen den Läufen ändern kann',
  { timeout: 60000 }, async () => {
    const a = await notfallkartePdfSchritt('file://' + HTML_PFAD);
    const b = await notfallkartePdfSchritt('file://' + HTML_PFAD);
    const diff = vergleicheProtokolle({ schritte: [a] }, { schritte: [b] });
    assert.equal(diff.gleich, true,
      'GRÜN ERWARTET: zwei Läufe gegen denselben Quelltext dürfen nicht abweichen — auch dann nicht, ' +
      'wenn zwischen den beiden Läufen die Sekunde des Erstelldatums umspringt:\n  ' + diff.unterschiede.join('\n  '));
  });
