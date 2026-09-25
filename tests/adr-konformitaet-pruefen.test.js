'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ADR-Konformitäts-Wächter — Probe (U2-ADR-Konformitäts-Wächter-Auftrag, 04.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   `tools/adr-konformitaet-pruefen.js` liest jeden ```konformitaet```-Block unter
   docs/adr/ und prüft: löst `pruefung:` auf eine echte Datei+Testname auf, passt
   `zustand` zur Anwesenheit einer Probe. Geprüft hier: die reine Block-/
   Klausel-Logik gegen eine Fixture (nie gegen den echten Bestand mutiert), und
   Rotmachbarkeit nach dem im Auftrag benannten Muster: nicht existierende Datei ·
   existierende Datei mit fehlendem Testnamen · `geprüft`/`prüfbar` ohne Probe.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pruefeKlausel, laufErgebnis } = require('../tools/adr-konformitaet-pruefen.js');

const REPO = path.join(__dirname, '..');

function fixtur(dateien) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-konformitaet-'));
  for (const [name, inhalt] of Object.entries(dateien)) {
    fs.writeFileSync(path.join(dir, name), inhalt);
  }
  return dir;
}

function aufraeumen(dir) { fs.rmSync(dir, { recursive: true, force: true }); }

/* ── 1 · Block-Erkennung ─────────────────────────────────────────────────── */

test('[Konformitäts-Wächter] zwei Blöcke in einer Datei werden beide gefunden, mit Zeile der Fenz', () => {
  const dir = fixtur({
    'zwei.md': '```konformitaet\nzustand: offen\nfrist: 2026-12-31\n```\n\n'
      + '```konformitaet\nzustand: offen\nfrist: 2026-12-31\n```\n',
  });
  const alt = process.env.ADR_ORDNER_PATH;
  process.env.ADR_ORDNER_PATH = dir;
  try {
    delete require.cache[require.resolve('../tools/adr-konformitaet-pruefen.js')];
    const frisch = require('../tools/adr-konformitaet-pruefen.js');
    const bloecke = frisch.bloeckeAusDatei('zwei.md');
    assert.equal(bloecke.length, 2);
  } finally {
    if (alt === undefined) delete process.env.ADR_ORDNER_PATH; else process.env.ADR_ORDNER_PATH = alt;
    delete require.cache[require.resolve('../tools/adr-konformitaet-pruefen.js')];
    aufraeumen(dir);
  }
});

/* ── 2 · Die Klausel-Prüfung selbst (reine Funktion, kein Datei-Fixture nötig) ── */

test('[Konformitäts-Wächter] geprüft/prüfbar OHNE pruefung-Zeile ist ROT', () => {
  const f1 = pruefeKlausel({ datei: 'x.md', zeile: 5, text: 'aussage: Etwas.\nzustand: geprüft\n' });
  assert.equal(f1.rot, true);
  assert.match(f1.grund, /verlangt eine `pruefung:`-Zeile/);
  const f2 = pruefeKlausel({ datei: 'x.md', zeile: 5, text: 'aussage: Etwas.\nzustand: prüfbar\n' });
  assert.equal(f2.rot, true);
});

test('[Konformitäts-Wächter] pruefung auf eine nicht existierende Datei ist ROT (Auftrags-Muster 1)', () => {
  const f = pruefeKlausel({
    datei: 'x.md', zeile: 5,
    text: 'zustand: geprüft\npruefung: tests/diese-datei-gibt-es-nicht-xyz.test.js#irgendwas\n',
  });
  assert.equal(f.rot, true);
  assert.match(f.grund, /Pfad existiert nicht/);
});

test('[Konformitäts-Wächter] pruefung auf eine existierende Datei mit fehlendem Testnamen ist ROT (Auftrags-Muster 2)', () => {
  const f = pruefeKlausel({
    datei: 'x.md', zeile: 5,
    // load-kern.js existiert im Repo, trägt aber keinen `test(...)`-Titel „ein-name-den-es-nicht-gibt".
    text: 'zustand: geprüft\npruefung: tests/load-kern.js#ein-name-den-es-nicht-gibt\n',
  });
  assert.equal(f.rot, true);
  assert.match(f.grund, /kein Test-Titel/);
});

test('[Konformitäts-Wächter] pruefung auf eine WIRKLICH existierende Probe ist GRÜN (Positivkontrolle)', () => {
  // U2-ADR-226 (03.09.2026): der bloße Anker „U2-102" passt mehrdeutig auf elf Testtitel in
  // dieser Datei (s. eigene Klasse-A-Probe unten) — als Positivkontrolle taugt seither nur noch
  // der volle, EINDEUTIGE Titel, genau wie U2-ADR-102 selbst ihn seit demselben ADR referenziert.
  const f = pruefeKlausel({
    datei: 'x.md', zeile: 5,
    text: 'zustand: geprüft\npruefung: tests/adr-102-import-bereinigen.test.js#[U2-102·1] eine inkonsistente Zeile wird erkannt, mit Schlüssel und Text\n',
  });
  assert.equal(f.rot, false, f.grund);
});

test('[Konformitäts-Wächter] offen MIT einer pruefung-Zeile ist ROT (Widerspruch in der anderen Richtung)', () => {
  const f = pruefeKlausel({
    datei: 'x.md', zeile: 5,
    text: 'zustand: offen\nfrist: 2026-12-31\npruefung: tests/adr-102-import-bereinigen.test.js#U2-102\n',
  });
  assert.equal(f.rot, true);
  assert.match(f.grund, /erwartet KEINE/);
});

test('[Konformitäts-Wächter] offen OHNE pruefung ist GRÜN — ein offener Zustand behauptet nichts', () => {
  const f = pruefeKlausel({ datei: 'x.md', zeile: 5, text: 'zustand: offen\nfrist: 2026-12-31\n' });
  assert.equal(f.rot, false);
});

test('[Konformitäts-Wächter] nicht-prüfbar OHNE pruefung ist GRÜN', () => {
  const f = pruefeKlausel({ datei: 'x.md', zeile: 5, text: 'zustand: nicht-prüfbar\ngrund: Bedeutungsfrage.\n' });
  assert.equal(f.rot, false);
});

test('[Konformitäts-Wächter] ein unbekannter zustand-Wert ist ROT', () => {
  const f = pruefeKlausel({ datei: 'x.md', zeile: 5, text: 'zustand: irgendwas-erfundenes\n' });
  assert.equal(f.rot, true);
  assert.match(f.grund, /unbekannter zustand-Wert/);
});

test('[Konformitäts-Wächter] eine Klausel ohne zustand-Zeile ist ROT', () => {
  const f = pruefeKlausel({ datei: 'x.md', zeile: 5, text: 'aussage: Nur eine Aussage.\n' });
  assert.equal(f.rot, true);
  assert.match(f.grund, /keine `zustand:`-Zeile/);
});

/* ── 2b · U2-ADR-226 — zwei Fehlerklassen an der EINEN pruefung:-Bindung ─────
   Fehlerklasse A: ein Anker passt auf MEHR ALS EINEN Testtitel — Mehrdeutigkeit,
   nicht Doppelvergabe an sich, ist der Fehlerfall (Produktentscheidung, Vorlage
   Klausel-Probe-Bindung, 03.09.2026). Fehlerklasse B: ein Block trägt MEHRERE
   `pruefung:`-Zeilen, vor diesem ADR wurde nur die erste je gelesen — alle
   weiteren blieben unsichtbar (gemessen 03.09.2026: 48 von 248 im echten
   Bestand). Die Gegenprobe ist die wichtigste von allen: mehrere `pruefung:`-
   Zeilen je Block sind der ETABLIERTE NORMALFALL (36 von 195 Blöcken im
   Bestand), keine eigene Fehlerform — nur eine konkret fehlschlagende
   EINZELNE Zeile darf roten. */

test('[Konformitäts-Wächter·226 Klasse A] ein Anker, der auf ZWEI Testtitel passt, ist ROT — mehrdeutig, nicht nur „nicht gefunden" (kurzzeitig zwei kollidierende Titel im Repo angelegt, danach entfernt)', () => {
  const zielDir = path.join(REPO, 'tests');
  const zielDatei = path.join(zielDir, '_226-mehrdeutig-tmp.test.js');
  fs.writeFileSync(zielDatei,
    "test('Y-9: Fassung A', () => {});\n"
    + "test('Y-9: Fassung A, mit Zusatz', () => {});\n");
  try {
    const f = pruefeKlausel({ datei: 'x.md', zeile: 5, text: 'zustand: geprüft\npruefung: tests/_226-mehrdeutig-tmp.test.js#Y-9: Fassung A\n' });
    assert.equal(f.rot, true, 'zwei Titel passen auf denselben Anker — das MUSS anschlagen');
    assert.match(f.grund, /mehrdeutig/);
    assert.match(f.grund, /passt auf 2 Test-Titel/);
  } finally { fs.rmSync(zielDatei, { force: true }); }
});

test('[Konformitäts-Wächter·226 Klasse B] ZWEITE pruefung-Zeile eines Blocks, die auf nichts passt, ist ROT — vor U2-ADR-226 unsichtbar', () => {
  const f = pruefeKlausel({
    datei: 'x.md', zeile: 5,
    text: 'zustand: geprüft\n'
      + 'pruefung: tests/adr-102-import-bereinigen.test.js#[U2-102·1] eine inkonsistente Zeile wird erkannt, mit Schlüssel und Text\n'
      + 'pruefung: tests/load-kern.js#ein-name-den-es-nicht-gibt\n',
  });
  assert.equal(f.rot, true, 'die zweite Zeile ist real kaputt — vor U2-ADR-226 wurde sie nie gelesen, das Ergebnis war fälschlich grün');
  assert.equal(f.pruefungen.length, 2, 'beide Zeilen müssen einzeln erscheinen, nicht nur die erste');
  assert.equal(f.pruefungen[0].ok, true, 'die erste Zeile bleibt für sich genommen gültig');
  assert.equal(f.pruefungen[1].ok, false);
  assert.match(f.grund, /ein-name-den-es-nicht-gibt/, 'der Grund muss die tatsächlich fehlschlagende Zeile benennen, nicht nur "irgendwas"');
});

test('[Konformitäts-Wächter·226 Gegenprobe] MEHRERE pruefung-Zeilen, die alle einzeln korrekt auflösen, bleiben GRÜN — Mehrfachbindung ist der Normalfall, kein Fund', () => {
  // Exakt die reale Form aus U2-ADR-212: zwei verschiedene, je für sich eindeutige Proben
  // für dieselbe Aussage (Rot-Beweis + Rundlauf). Schlägt das hier an, ist die neue Prüfung
  // überempfindlich — sie würde bei jedem etablierten Mehrfach-Beleg im echten Bestand rot.
  const f = pruefeKlausel({
    datei: 'x.md', zeile: 5,
    text: 'zustand: geprüft\n'
      + 'pruefung: tests/adr-102-import-bereinigen.test.js#[U2-102·1] eine inkonsistente Zeile wird erkannt, mit Schlüssel und Text\n'
      + 'pruefung: tests/adr-102-import-bereinigen.test.js#[U2-102·3] importZeileBereinigt entfernt GENAU die angekündigten Felder, sonst nichts\n',
  });
  assert.equal(f.rot, false, f.grund);
  assert.equal(f.pruefungen.length, 2);
  assert.ok(f.pruefungen.every((p) => p.ok), 'beide Proben-Bindungen müssen einzeln als gültig erkannt werden');
});

/* ── 3 · Gegen den echten Bestand — die vier Zahlen aus dem Auftrag ────────── */

test('[Konformitäts-Wächter] gegen den echten Bestand: die vier Zahlen sind plausibel', () => {
  // Der Auftrag nannte „34 von 130" — GEMESSEN waren es zuerst 33 (ADR-098 trägt zusätzlich das
  // Format-BEISPIEL selbst als Fenz, das hier bewusst nicht mitgezählt wird, s.
  // KEIN_KLAUSEL_BEISPIEL). 33 → 47 am 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1): 14
  // ADR-Dateien erhalten ihre erste Klausel (094, 027, 040, 093, 028, 039, 047, 062-Nachtrag,
  // 062-Vertrauensperson, 077-Nachtrag, 095, 122, 123, 124). 47 → 52 (Nachtlauf 2, Tranche 2,
  // 05./06.08.2026): fünf weitere ADR-Dateien (043, 061, 075, 079, 081).
  // 52 → 53 (09.08.2026, N4 Zug 4): U2-ADR-126 (Schema-Sensibel-Default) erhält ihre erste Klausel.
  // 53 → 54 (09.08.2026, N5 Zug 4): U2-ADR-127 (Scroll-Erhalt-Default) erhält ihre erste Klausel.
  // 54 → 55 (09.08.2026, Sensibel-Architektur Zug 1+3): U2-ADR-128 (Sensibel-Adressierung
  // Unterfeld und Situation) erhält ihre erste Klausel.
  // 55 → 56 (10.08.2026, F6 Zug 4): U2-ADR-130 (Krisenvorsorge eigenständiger Bereich) erhält
  // ihre erste Klausel.
  // 56 → 57 (10.08.2026, K8 Zug 3): U2-ADR-131 (Eine Ausgabeschicht — Modul-Vertrag wird
  // Datenvertrag) erhält ihre erste Klausel.
  // 57 → 58 (31.08.2026, Sub-Depot-Klick-Freeze): NEUES U2-ADR-184 (Hintergrund-Wipe-Frist +
  // Bildschirm-Zusicherung) trägt drei Klauseln von Anfang an.
  // 58 → 59 (01.09.2026, U2-ADR-185): NEUES U2-ADR-185 (Sperrschirm statt Eingangsschirm nach
  // Wipe) trägt sechs Klauseln von Anfang an.
  // 59 → 60 (01.09.2026, U2-ADR-188, Commit 1 von zwei): NEUES U2-ADR-188 (Registry folgt data)
  // trägt fünf Klauseln von Anfang an. U2-ADR-189 (Commit 2) hebt die Zahl separat auf 61.
  // 61 → 62 (01.09.2026, U2-ADR-186): NEUES U2-ADR-186 (Gekauftes Modul bleibt im Bestand
  // nutzbar) trägt zwei Klauseln von Anfang an. Gemessen, nicht nur gerechnet — s. Lauf unten.
  // 62 → 63 (01.09.2026, U2-ADR-194, -2-Auftrag): NEUES U2-ADR-194 (Wurzel-Index-
  // Weiterleitung, Precache-Vollständigkeit) trägt vier Klauseln von Anfang an.
  // 63 → 64 (Basis-Abgleich auf 32c81b3, 01.09.2026): U2-ADR-187 (Bereichs-Identität überlebt
  // das Verwaisen), unabhängig auf der alten Basis gebaut, jetzt oben auf 186/188/189/194
  // nachgezogen.
  // 64 → 65 am 01.09.2026: U2-ADR-196 (Oberflächen-Verweise treffen die Bezeichnung).
  // 65 → 66 am 01.09.2026: U2-ADR-195 (Englischer Bürgersatz — Glossar) — adrDateienMitKlausel
  // zählt Dateien, nicht Klauseln, darum +1 trotz vier neuer Klauselzeilen darin. Nach dem
  // Zusammenführen erneut gegen `laufErgebnis()` gemessen, nicht nur addiert.
  // REBASE 01.09.2026 (sw-bedingtes-skipwaiting auf u2-kanon v491): NEUES U2-ADR-190
  // (vormals 186, umbenannt wegen der Kollision mit dem hier bereits gelandeten
  // U2-ADR-186/Gekauftes-Modul) trägt fünf Klauseln von Anfang an, plus ein weiterer Nachtrag
  // mit einer sechsten Klausel (clients.claim()). NEUES U2-ADR-197 (Aussage-Pruefung-Abgleich)
  // trägt vier Klauseln von Anfang an. Zahl NACH dem vollen Rebase real gegen `laufErgebnis()`
  // gemessen, nicht hier vorweggenommen — s. Lauf unten.
  // 68 → 69 (02.09.2026, U2-ADR-206): NEUES U2-ADR-206 (Signier-Werkzeug merkt sich stehende
  // Pfade) trägt vier Klauseln von Anfang an.
  // 69 → 70 (02.09.2026, U2-ADR-202, Rebase auf 60328d3): NEUES U2-ADR-202 (Kinder-Liste,
  // verborgenWenn-Live-Verdrahtung) trägt eine Klausel von Anfang an.
  // 70 → 71 (02.09.2026, U2-ADR-207, Rebase auf b7cdac6): NEUES U2-ADR-207 (Vor-Depot-
  // Sprachmodul übersteht fremdes Depot) trägt drei Klausel-ZEILEN, aber EINE neue Datei —
  // derselbe Unterschied wie schon bei U2-ADR-195 oben (Zeile 152: "zählt Dateien, nicht
  // Klauseln"). Ein vorheriger Stand dieses Kommentars schrieb "70 → 73" (die Klauselzahl
  // statt der Dateizahl übernommen) — gegen `laufErgebnis()` gemessen statt geglaubt: 71, nicht
  // 73. Korrigiert beim Landen des Fixture-Scan-Gitignore-Zugs, Rebase auf 8857393 (v495).
  // 71 → 73 (02.09.2026, Rebase auf 820a509, U2-ADR-193 + U2-ADR-199): NEUES U2-ADR-193
  // (BBK-Quellenangabe aktueller Stand, zwei Klauseln) + NEUES U2-ADR-199 (Organspende-
  // Register-Feld, eine Klausel) — je Datei zählt nur +1, macht 71 + 2 = 73. Dass die Summe
  // zufällig auf denselben Zahlenwert trifft, den ein früherer, falscher Stand dieses
  // Kommentars schon einmal trug (s. oben), ist Zufall, keine Bestätigung — gegen
  // `laufErgebnis()` nachgerechnet, nicht addiert.
  // 73 → 74 (02.09.2026, U2-ADR-209, Auftrag, Vorrang): NEUES U2-ADR-209 (Produkt-
  // Trennung im geteilten internen Speicher) trägt drei Klauseln von Anfang an — EINE neue Datei,
  // darum +1, nicht +3 (derselbe Unterschied wie bei U2-ADR-195/-207 oben). Ursprünglich als 208
  // gebaut, umnummeriert (parallele Sitzung hatte 208 bereits vergeben, s. Begründung in
  // adr-readme-uebereinstimmung.test.js). Zahl nach dem Rebase auf 77f696b neu gegen
  // `laufErgebnis()` gemessen, nicht mit der Vor-Rebase-Zahl (72) fortgerechnet.
  // 74 → 75 (02.09.2026, dieser Zweig, VOR dem zweiten Rebase): NEUES U2-ADR-208 (Sprachkennung
  // fällt auf aktive Sprache zurück) trägt vier Klauseln von Anfang an — zählt als EINE Datei,
  // nicht vier (s. o.).
  // Rebase auf 657f6d6 (02.09.2026, U2-ADR-211, Sicherungsstand bekannt): NEUES U2-ADR-211 trägt
  // vier Klauseln von Anfang an — EINE neue Datei, darum +1 auf die bereits gemergte 75er-Basis
  // (208+209), macht 76. Gegen `laufErgebnis()` NACH dem vollständigen Rebase nachgerechnet, nicht
  // aus 75+1 angenommen.
  // 76 → 77 (02.09.2026, U2-ADR-201, Rebase auf 39683c7/v500, Zug 1 Betreuung): NEUES U2-ADR-201
  // (Datengestalten Betreuung + Kinder, Commit 1 von zwei) trägt ZWEI Klausel-ZEILEN
  // (Betreuerbestellung + betreuter Erwachsener), aber EINE neue Datei — +1, nicht +2, gleiche
  // Regel wie oben.
  // 76 → 77 (02.09.2026, dieser Zweig, VOR dem Rebase auf f1cdb0e, U2-ADR-212, Sichern-Knopf
  // folgt Speicher-Modus): NEUES U2-ADR-212 trägt fünf Klauseln von Anfang an — EINE neue Datei,
  // darum +1 auf denselben v500-Bestand (76, frisch gemessen VOR dem eigenen Bau — beide Zweige
  // saßen auf 39683c7, dieselbe Zahl auf beiden Seiten ist Zufall, keine Bestätigung).
  // REBASE auf f1cdb0e (02.09.2026, hat U2-ADR-201 vor diesem Zweig gelandet): Zahl NACH
  // dem vollständigen Rebase real gegen `laufErgebnis()` gemessen, nicht aus 77+1 angenommen —
  // s. Lauf unten für den tatsächlichen Wert.
  // 76 → 77 (02.09.2026, dieser Zweig, sw-aenderung-beabsichtigt, Fast-Forward auf 39683c7):
  // NEUES U2-ADR-214 (sw.js-Wächter-Schalter + volle Rücknahme) trägt drei Klauseln von Anfang
  // an — EINE neue Datei, darum +1 (derselbe Unterschied wie bei U2-ADR-195/-207/-209 oben).
  // Gegen `laufErgebnis()` gemessen (77 gemeldet), nicht aus 76+1 angenommen.
  // REBASE-MERGE auf 767fe70/v501 (02.09.2026): 78 (u2-kanon-Seite, U2-ADR-201+212, je EINE neue
  // Datei) und 77 (dieser Zweig, U2-ADR-214) zählten beide denselben 76er-Ausgangswert — 76 + 2
  // (201, 212) + 1 (214) = 79, drei disjunkte neue Dateien. Gegen `laufErgebnis()` NACH dem
  // vollständigen Rebase gemessen (79 gemeldet), nicht aus 78+1 oder 77+2 angenommen.
  // 79 → 80 (02.09.2026, U2-ADR-213, Rebase auf 8f5bb24/v501-Wurzelauslieferung): NEUES
  // U2-ADR-213 (PBKDF2 statt Argon2id) trägt zwei Klauseln von Anfang an — EINE neue Datei,
  // darum +1 auf die bereits gemergte 79er-Basis (201+212+214). Gegen `laufErgebnis()` NACH dem
  // vollständigen Rebase gemessen, nicht aus 79+1 angenommen.
  // 79 → 80 (02.09.2026, dieser Zweig, modal-eingabefelder-gestaltung): NEUES U2-ADR-221 trägt
  // eine Klausel von Anfang an — EINE neue Datei, darum +1. Gegen `laufErgebnis()` gemessen (80
  // gemeldet), nicht aus 79+1 angenommen.
  // REBASE-MERGE auf 1a4174f (02.09.2026): 80 (u2-kanon-Seite, U2-ADR-213) und 80 (dieser Zweig,
  // U2-ADR-221) zählten beide denselben 79er-Ausgangswert plus je EINE neue klausel-tragende
  // Datei — dieselbe Zahl auf beiden Seiten ist Zufall, keine Bestätigung. U2-ADR-216 (ebenfalls
  // auf u2-kanon gelandet) trägt KEINE eigene Klausel, zählt hier nicht mit. 79 + 1 (213) + 1
  // (221) = 81, zwei disjunkte neue Dateien. Gegen `laufErgebnis()` NACH dem vollständigen
  // Rebase gemessen (81 gemeldet), nicht aus 80+1 angenommen.
  // 81 → 82 (02.09.2026, U2-ADR-223, Rebase auf origin/u2-kanon/251d04d): NEUES U2-ADR-223
  // (Datei ist das Depot) trägt vier Klauseln von Anfang an — EINE neue Datei, darum +1 auf die
  // bereits gemergte 81er-Basis (213+221; U2-ADR-216 trägt keine eigene Klausel, zählt nicht
  // mit). Gegen `laufErgebnis()` NACH dem vollständigen Rebase gemessen, nicht aus 81+1
  // angenommen.
  // REBASE-MERGE auf 5ce64e3 (02.09.2026, landung-218): 82 (u2-kanon-Seite, 223)
  // und 83 (dieser Zweig, U2-ADR-217 + U2-ADR-218, je EINE neue klausel-tragende Datei) zählten
  // beide denselben 81er-Ausgangswert — 81 + 1 (223) + 2 (217, 218) = 84, drei disjunkte neue
  // Dateien. Gegen `laufErgebnis()` NACH dem vollständigen Rebase gemessen, nicht aus 82+2 oder
  // 83+1 angenommen.
  // 84 → 85 (02.09.2026, U2-ADR-222, leeres Depot ist keine Sicherung): NEUES U2-ADR-222 trägt
  // zwei `konformitaet`-Blöcke in einer neuen ADR-Datei — EINE neue klausel-tragende Datei, auf
  // die bereits gemergte 84er-Basis (213+221+223+217+218). Gegen `laufErgebnis()` NACH dem
  // Cherry-Pick gemessen, nicht aus 84+1 angenommen.
  // 85 → 86 (03.09.2026, U2-ADR-215, Schalen-Lockstep-Wächter auf den ausgelieferten Dateisatz
  // erweitert): NEUES U2-ADR-215 trägt zwei `konformitaet`-Blöcke in einer neuen ADR-Datei — EINE
  // neue klausel-tragende Datei, auf die bereits gemessene 85er-Basis.
  // REBASE-MERGE auf b824ec9e (03.09.2026): 86 (u2-kanon-Seite, U2-ADR-224, eine neue
  // klausel-tragende Datei) und 86 (dieser Zweig, U2-ADR-215, ebenfalls eine) zählten beide
  // denselben 85er-Ausgangswert — 85 + 1 (U2-ADR-224) + 1 (U2-ADR-215) = 87, zwei disjunkte neue
  // Dateien, dieselbe Zahl auf beiden Seiten ist Zufall, keine Bestätigung. Gegen
  // `laufErgebnis()` NACH dem vollständigen Rebase gemessen, nicht aus 86+1 angenommen.
  // 88 → 89 (03.09.2026, U2-ADR-226, dieser Zweig): NEUES U2-ADR-226 (Klausel→Probe-Bindung
  // prüft eindeutig UND vollständig) trägt vier Klauseln von Anfang an — EINE neue Datei, darum
  // +1. Gegen `laufErgebnis()` NACH dem eigenen Bau gemessen, nicht aus 88+1 angenommen.
  // 89 → 90 (03.09.2026, U2-ADR-220, dieser Zweig): NEUES U2-ADR-220 (Sicherungsdatei-Namens-
  // Hinweis verspricht nicht mehr, was er nicht halten kann) trägt zwei `konformitaet`-Blöcke in
  // einer neuen ADR-Datei — EINE neue klausel-tragende Datei, auf die bereits gemergte 89er-Basis.
  // Gegen `laufErgebnis()` NACH dem eigenen Bau gemessen, nicht aus 89+1 angenommen.
  // 90 → 91 (03.09.2026, U2-ADR-219, Nachbau dieser Zweig): NEUES U2-ADR-219 (plattform-
  // abhängiger Sicherungs-Hinweis bleibt bei iOS) trägt drei `konformitaet`-Blöcke in einer neuen
  // ADR-Datei — EINE neue klausel-tragende Datei. Gegen `laufErgebnis()` NACH dem eigenen Bau
  // gemessen, nicht aus 90+1 angenommen.
  // 91 → 92 (03.09.2026, U2-ADR-227, Signierungs-Automatisierung Zug 1, u2-kanon-Seite): NEUES
  // U2-ADR-227 (_signJWS kommt unter den Hüllenschicht-Wächter) trägt zwei `konformitaet`-Blöcke
  // in einer neuen ADR-Datei — EINE neue klausel-tragende Datei.
  // 91 → 92 (03.09.2026, U2-ADR-228, dieser Zweig, VOR dem Rebase auf U2-ADR-227 gemessen): NEUES
  // U2-ADR-228 (damals noch als U2-ADR-227 nummeriert — Kollision, umnummeriert) trägt drei
  // `konformitaet`-Blöcke in einer neuen ADR-Datei — ebenfalls EINE neue klausel-tragende Datei,
  // auf derselben 91er-Basis, unabhängig von der Zeile darüber gezählt.
  // REBASE-MERGE auf 7bf135d1 (03.09.2026): beide Seiten trugen denselben Ausgangswert 91 UND
  // denselben Endwert 92 — Zufall der Arithmetik, keine Bestätigung (zwei disjunkte neue
  // Dateien, 91 + 1 + 1 = 93, nicht 92). Gegen `laufErgebnis()` NACH dem vollständigen Rebase
  // gemessen, nicht aus 92 angenommen und nicht aus 91+1+1 gerechnet.
  // 93 → 94 (03.09.2026, U2-ADR-229, v1-Dokumente-Audit, u2-kanon-Seite): NEUES U2-ADR-229 (die
  // Prüfsumme der ausgelieferten Datei wird bewacht, nicht gepflegt) trägt zwei
  // `konformitaet`-Blöcke in einer neuen ADR-Datei — EINE neue klausel-tragende Datei. Gegen
  // `laufErgebnis()` NACH dem eigenen Bau gemessen, nicht aus 93+1 angenommen.
  // 93 → 94 (03.09.2026, U2-ADR-230, dieser Zweig, VOR dem Rebase auf U2-ADR-229 gemessen): EINE
  // neue klausel-tragende ADR-Datei (drei `konformitaet`-Blöcke, PBKDF2-Iterationszahl). Gegen
  // `laufErgebnis()` NACH dem eigenen Bau gemessen, auf derselben 93er-Basis, unabhängig von der
  // Zeile darüber gezählt.
  // REBASE-MERGE auf 9e733e7f (03.09.2026): beide Seiten trugen denselben Ausgangswert 93 UND
  // denselben Endwert 94 — Zufall der Arithmetik, keine Bestätigung (zwei disjunkte neue
  // Dateien, 93 + 1 + 1 = 95, nicht 94). Gegen `laufErgebnis()` NACH dem vollständigen Rebase
  // gemessen, nicht aus 94 angenommen und nicht aus 93+1+1 gerechnet.
  // 94 → 95 (03.09.2026, U2-ADR-231, u2-kanon-Seite, auf demselben 94er-Stand NACH U2-ADR-229 WIE
  // dieser Zweig — aber OHNE U2-ADR-230): eine neue klausel-tragende Datei.
  // REBASE-MERGE auf 9f2bb152 (03.09.2026): dieser Zweig zählt 94 (inkl. U2-ADR-230) + 1
  // (U2-ADR-231), u2-kanon zählt 94 (ohne U2-ADR-230) + 1 (U2-ADR-231) — zwei disjunkte neue
  // klausel-tragende Dateien auf dem gemeinsamen 94er-Stand, 94 + 1 (230) + 1 (231) = 96, nicht 95.
  // 95 → 96 (03.09.2026, U2-ADR-235, u2-kanon-Seite): NEUES U2-ADR-235 (Sub-Depot-Umschlag
  // versionsfest) trägt einen `konformitaet`-Block — EINE neue klausel-tragende Datei. U2-ADR-233
  // und -236 tragen KEINEN `konformitaet`-Block, zählen hier nicht mit.
  // REBASE-MERGE auf 9a9926d1 (03.09.2026): dieser Zweig zählt 94 + 230 + 231 = 96 (oben gemergt),
  // u2-kanon zählt 94 + 231 + 235 = 96. Drei disjunkte klausel-tragende Dateien seit dem
  // gemeinsamen 94er-Stand: 230 (nur dieser Zweig), 231 (gemeinsam), 235 (nur u2-kanon) — 94+3=97,
  // nicht 96.
  // 96 → 97 (03.09.2026, U2-ADR-237, u2-kanon-Seite, Neubau nach Verbindungsabbruch): NEUES
  // U2-ADR-237 (stille interne Sicherung ohne Datei — nimmt U2-ADR-015s „vier bewusste
  // Save-Punkte" zurück) trägt drei `konformitaet`-Blöcke — EINE neue klausel-tragende Datei.
  // REBASE-MERGE auf 4c448412 (03.09.2026): dieser Zweig zählt 94 + 230 + 231 = 97 (oben gemergt),
  // u2-kanon zählt 94 + 231 + 235 + 237 = 98. Vier disjunkte klausel-tragende Dateien seit dem
  // gemeinsamen 94er-Stand: 230 (nur dieser Zweig), 231, 235 (beide gemeinsam bzw. u2-kanon),
  // 237 (nur u2-kanon, neu seit dem letzten Rebase) — 94 + 4 = 98, nicht 97. Gegen `laufErgebnis()`
  // NACH dem vollständigen Rebase gemessen, nicht aus 97 angenommen.
  // 98 → 99 (03.09.2026, U2-ADR-241, „Verlustwege", dieser Zweig, Rebase auf
  // 283727e1): NEUES U2-ADR-241 (Export-Übersicht: Topf-B-Lücken bei geteilten Mapping-Tabellen)
  // trägt drei `konformitaet`-Blöcke — EINE neue klausel-tragende Datei, auf der bereits
  // gemergten 98er-Basis oben drauf. Gegen `laufErgebnis()` NACH dem vollständigen Rebase
  // gemessen, nicht aus 97+1 angenommen.
  // 99 → 100 (03.09.2026, U2-ADR-232, eines verwaisten Commits, Cherry-Pick auf
  // origin/u2-kanon): NEUES U2-ADR-232 (git-Aufrufe ausserhalb des Repos streifen die Umgebung
  // ab) trägt drei `konformitaet`-Blöcke — EINE neue klausel-tragende Datei. Gegen
  // `laufErgebnis()` NACH dem eigenen Cherry-Pick gemessen, nicht aus 99+1 angenommen.
  // 100 → 101 (04.09.2026, U2-ADR-245, Cherry-Pick auf af8b8ea6): NEUES
  // U2-ADR-245 (logikModul verlangt ein ausdrückliches Recht auf ein sensibles Feld) trägt
  // drei `konformitaet`-Blöcke — EINE neue klausel-tragende Datei. Gegen `laufErgebnis()`
  // NACH dem eigenen Cherry-Pick gemessen, nicht aus 100+1 angenommen.
  // 101 → 102 (04.09.2026, REBASE-MERGE auf 9b6d5347, U2-ADR-244, dieser Zweig): NEUES
  // U2-ADR-244 (Speicherort entfällt beim Anlegen) trägt ebenfalls drei `konformitaet`-Blöcke
  // — EINE weitere klausel-tragende Datei, disjunkt von U2-ADR-245 (beide zweigten vom
  // selben 100er-Stand ab). Gegen `laufErgebnis()` NACH dem vollständigen Rebase gemessen,
  // nicht aus 101+1 angenommen.
  // 102 → 103 (04.09.2026, U2-ADR-248, eigener Zweig ab a84e8319): NEUES
  // U2-ADR-248 (Erbschein-Vorbereitungsauszug las `kinder` aus dem falschen Sektor) trägt drei
  // `konformitaet`-Blöcke — EINE neue klausel-tragende Datei. Gegen `laufErgebnis()` gemessen,
  // nicht aus 102+1 angenommen.
  // 103 → 104 (04.09.2026, REBASE-MERGE auf c22616214962c70bdc8dd808145a88fe96ba4824, U2-ADR-249,
  // dieser Zweig): NEUES U2-ADR-249 (`.vdkey`-Allowlist) trägt vier `konformitaet`-Blöcke — EINE
  // weitere klausel-tragende Datei, disjunkt von 232/245/244/248. Gegen `laufErgebnis()` NACH
  // dem vollständigen Rebase gemessen, nicht aus 103+1 angenommen.
  // 104 → 105 (04.09.2026, U2-ADR-266, dieser Zweig): NEUES U2-ADR-266 (Verschlüsselungs-Hinweis)
  // trägt einen `konformitaet`-Block — EINE weitere klausel-tragende Datei. Gegen `laufErgebnis()`
  // gemessen, nicht aus 104+1 angenommen.
  // 105 → 106 (04.09.2026, REBASE auf 39372460, U2-ADR-262, „Handkopien von
  // Kern-Konstanten bekommen einen Wächter", eigener Zweig ab 8292b457): NEUES U2-ADR-262 trägt
  // vier `konformitaet`-Blöcke — EINE weitere klausel-tragende Datei, disjunkt von U2-ADR-266
  // (verschiedene ADR-Nummern, verschiedene Dateien). Gegen `laufErgebnis()` NACH dem
  // vollständigen Rebase gemessen, nicht aus 105+1 angenommen.
  // REBASE-MERGE auf e097a5da (05.09.2026): dieser Zweig (U2-ADR-270, eigener Bump 104→105) und
  // die u2-kanon-Seite (U2-ADR-266+262, bereits additiv 104→106 aufgelöst, zwei disjunkte Bumps)
  // trugen beide denselben 104er-Ausgangswert — 104 + 2 (kanon-Seite) + 1 (U2-ADR-270) = 107,
  // drei disjunkte klausel-tragende Dateien. Gegen `laufErgebnis()` NACH dem vollständigen
  // Fast-Forward gemessen, nicht aus 106+1 oder 105+2 angenommen.
  // 107 → 108 (05.09.2026, U2-ADR-275, Rebase auf f7e5b052): NEUES U2-ADR-275
  // (INSTITUTION_ART_EINGEBAUT entkoppelt) trägt einen `konformitaet`-Block — EINE weitere
  // klausel-tragende Datei. Gegen `laufErgebnis()` NACH dem Rebase gemessen, nicht aus 107+1
  // angenommen. (a2s zwischenzeitliche U2-ADR-195-Nachtrag-Landung berührt diese Zahl nicht —
  // gegengeprüft: weiterhin 108, nicht 109.)
  // 108 → 109 (05.09.2026, U2-ADR-274, dieser Zweig, Commit 2): NEUES U2-ADR-274
  // (institutionsArt-Fähigkeitsbeweis) trägt einen eigenen `konformitaet`-Block — EINE weitere
  // klausel-tragende Datei. Gegen `laufErgebnis()` gemessen, nicht aus 108+1 angenommen.
  // 105 → 106 (05.09.2026, REBASE-MERGE auf 39372460, U2-ADR-263, dieser Zweig): NEUES U2-ADR-263
  // (PDF-Schriftdeckung) trägt drei `konformitaet`-Blöcke — EINE weitere, disjunkte
  // klausel-tragende Datei; beide (266, 263) zweigten vom selben 104er-Stand ab. Gegen
  // `laufErgebnis()` NACH dem vollständigen Rebase gemessen, nicht aus 105+1 angenommen.
  // 106 → 107 (05.09.2026, REBASE-MERGE auf e097a5da): U2-ADR-262 (Kanon-Seite) und U2-ADR-263
  // (dieser Zweig) trugen BEIDE denselben Ausgangswert 105 UND denselben Endwert 106 — zwei
  // disjunkte, unabhängig neu angelegte Klausel-Dateien (verschiedene ADR-Nummern), nicht
  // dieselbe zweimal gezählt. ECHT gegen `laufErgebnis()` nach dem vollständigen Rebase
  // nachgemessen (docs/adr/ enthält beide neuen Dateien nebeneinander): 107, nicht 106.
  // 108/107 → 109 (05.09.2026, REBASE-MERGE auf a93df2a1): Kanon-Seite (bereits additiv auf 108
  // aufgelöst) und dieser Zweig (bereits additiv auf 107 aufgelöst) trugen beide denselben
  // gemeinsamen Ausgangswert — U2-ADR-263s eigene neue Klausel-Datei ist disjunkt von allem, was
  // die Kanon-Seite seither gesammelt hat. ECHT gegen `laufErgebnis()` NACH dem vollständigen
  // Rebase nachgemessen (nicht aus 108+1 oder 107+1 angenommen): 109.
  // REBASE-MERGE auf 5e374af4 (05.09.2026, ueber 1cfd9425): zwei weitere ADR-Dokumente von der
  // Kanon-Seite (U2-ADR-280, U2-ADR-274-Commit-2) seit der letzten Messung — ECHT gegen
  // `laufErgebnis()` NACH dem vollstaendigen Rebase nachgemessen, nicht aus 109 fortgeschrieben: 110.
  // 110 → 111 (05.09.2026, U2-ADR-289, dieser Zweig): eine neue, eigene Klausel-Datei
  // (docs/adr/vivodepot-U2-ADR-289-…-2026-09-05.md, 4 konformitaet-Blöcke) — ECHT gegen
  // `laufErgebnis()` nachgemessen, nicht aus 110+1 angenommen: 111.
  // 111 → 112 (05.09.2026, U2-ADR-296, dieser Zweig — anderer Worktree/Auftrag als ADR-289,
  // dieselbe Basis e0da39ff): eine weitere neue, eigene Klausel-Datei (docs/adr/vivodepot-
  // U2-ADR-296-…-2026-09-05.md, 4 konformitaet-Blöcke) — bereits einmal ECHT gegen
  // `laufErgebnis()` nachgemessen (voller Testlauf bj2i2uckn, vor dieser Zahl geschrieben, s.
  // Commit), nicht aus 111+1 angenommen.
  // 112 → 113 (05.09.2026, U2-ADR-297, dieser Zweig, frisch auf bacfc94e/v569 verzweigt): eine
  // weitere neue, eigene Klausel-Datei (docs/adr/vivodepot-U2-ADR-297-…-2026-09-05.md, 6
  // konformitaet-Blöcke) — die NACHTRÄGE in U2-ADR-294/U2-ADR-296 selbst tragen keine neuen
  // Klausel-Blöcke, nur Prosa. ECHT gegen `laufErgebnis()` nachgemessen, nicht aus 112+1
  // angenommen.
  // 113 → 114 (05.09.2026, U2-ADR-308, frisch auf origin/u2-kanon 2b142910/v572 verzweigt): eine
  // weitere neue, eigene Klausel-Datei (docs/adr/vivodepot-U2-ADR-308-…-2026-09-05.md, 8
  // konformitaet-Blöcke) — die NACHTRÄGE in U2-ADR-299/U2-ADR-301 selbst tragen keine neuen
  // Klausel-Blöcke, nur Prosa. ECHT gegen `laufErgebnis()` nachgemessen, nicht aus 113+1
  // angenommen.
  // 114 → 115 (06.09.2026, U2-ADR-306): eine weitere neue, eigene Klausel-Datei (docs/adr/
  // vivodepot-U2-ADR-306-…-2026-09-06.md, 6 konformitaet-Blöcke) — U2-ADR-317/U2-ADR-318
  // (von der Kanon-Seite dazugekommen) tragen selbst keine konformitaet-Blöcke. ECHT gegen
  // `laufErgebnis()` nachgemessen, nicht aus 114+1 angenommen.
  // 115 → 116 (07.09.2026, U2-ADR-346 §12, dieser Zweig): U2-ADR-346 selbst trägt zum ersten Mal
  // einen konformitaet-Block (der Riegel-Rot-Beweis für WIZARD_BUENDEL_VERBOTENE_IDS) — vorher
  // ohne. ECHT gegen `laufErgebnis()` nachgemessen, nicht aus 115+1 angenommen.
  // 115 → 116 (07.09.2026, U2-ADR-344 §10, /`0a`-Nachtrag): KEINE neue Datei — U2-ADR-344
  // (bereits gelandet, bis dahin ohne Klausel) bekommt ihren ERSTEN konformitaet-Block (das
  // native BMJ-Skelett bleibt Struktur, nicht Restarbeit). ECHT gegen `laufErgebnis()`
  // nachgemessen, nicht aus 115+1 angenommen.
  const e = laufErgebnis();
  assert.ok(e.adrDateienGesamt > 100, 'Positivkontrolle: der ADR-Ordner wird wirklich gelesen (' + e.adrDateienGesamt + ' Dateien)');
  // 117 → 118 (07.09.2026, U2-ADR-350, dieser Zweig): U2-ADR-350 selbst traegt zum ersten Mal
  // einen konformitaet-Block (der Darkmode-Selektor-Waechter) — neue Datei, erste Klausel.
  // ECHT gegen `laufErgebnis()` nachgemessen, nicht aus 117+1 angenommen.
  // 118 → 119 (07.09.2026, C2/U2-ADR-354, „Templates bekommen ihren Ort"): neue,
  // eigene Klausel-Datei (docs/adr/vivodepot-U2-ADR-354-…-2026-09-07.md, 4 konformitaet-Blöcke) —
  // erste Klausel dieser Datei. ECHT gegen `laufErgebnis()` nachgemessen, nicht aus 118+1 angenommen.
  // 119 → 120 (10.09.2026, /U2-ADR-400, Auftrag „White Label bis ins PDF"): neue, eigene
  // Klausel-Datei (docs/adr/vivodepot-U2-ADR-400-…-2026-09-10.md, 5 konformitaet-Blöcke) — erste
  // Klausel dieser Datei. ECHT gegen `laufErgebnis()` nachgemessen, nicht aus 119+1 angenommen.
  // 120 → 121 (13.09.2026, U2-ADR-408, „Die Palette folgt der Marke"): neue, eigene
  // Klausel-Datei (docs/adr/vivodepot-U2-ADR-408-…-2026-09-13.md, 6 konformitaet-Blöcke) — erste
  // Klausel dieser Datei. ECHT gegen `node tools/adr-konformitaet-pruefen.js` nachgemessen
  // („mit Konformitäts-Klausel: 121 · rot: 0"), nicht aus 120+1 angenommen.
  // 121 → 122 (13.09.2026, U2-ADR-410, „ZVR-Abschrift"): neue, eigene Klausel-Datei
  // (docs/adr/vivodepot-U2-ADR-410-…-2026-09-13.md, 1 konformitaet-Block) — erste Klausel
  // dieser Datei. ECHT gegen `laufErgebnis()` nachgemessen, nicht aus 121+1 angenommen.
  // 122 → 123 (13.09.2026, U2-ADR-411, „Bestell- und Auslieferungsweg registriert"): neue, eigene
  // Klausel-Datei (docs/adr/vivodepot-U2-ADR-411-…-2026-09-13.md, 7 konformitaet-Blöcke) — erste
  // Klausel dieser Datei. U2-ADR-409 (Feldregister) trägt keinen konformitaet-Block und zählt
  // darum nicht mit. ECHT gegen `node tools/adr-konformitaet-pruefen.js` nachgemessen
  // („mit Konformitäts-Klausel: 123 · rot: 0"), nicht aus 122+1 angenommen.
  // 123 → 124 (15.09.2026, U2-ADR-413, „Vorführung"): neue, eigene Klausel-Datei
  // (docs/adr/vivodepot-U2-ADR-413-…-2026-09-15.md, 4 konformitaet-Blöcke) — erste Klausel dieser
  // Datei. ECHT gegen `node tools/adr-konformitaet-pruefen.js` nachgemessen („mit Konformitäts-Klausel:
  // 124 · rot: 0"), nicht aus 123+1 angenommen.
  // 124 → 125 (15.09.2026, U2-ADR-414, „Produkt als signiertes Rezept"): neue, eigene ADR-Datei mit vier
  // konformitaet-Blöcken, nach U2-ADR-413 gelandet.
  // 125 → 126 (16.09.2026, U2-ADR-415, „Stick-Mittelweg"): neue, eigene ADR-Datei mit vier
  // konformitaet-Blöcken. ECHT gegen `node tools/adr-konformitaet-pruefen.js` nachgemessen
  // („mit Konformitäts-Klausel: 126 · rot: 0"), nicht aus 125+1 angenommen.
  // 126 → 127 (16.09.2026, U2-ADR-416, Sprachmodule mit jeder Version): neue, eigene ADR-Datei mit
  // sechs Konformitätsblöcken. Gemessen mit tools/adr-konformitaet-pruefen.js, nicht angenommen.
  // 127 → 143 (17.09.2026, Nachfolge zu U2-ADR-098 für die YAML-Form): keine neue ADR-Datei — der
  // Wächter erkennt ab hier zusätzlich die YAML-Form des Konformitätsblocks (seit U2-ADR-323,
  // 06.09.2026), auf die er vorher strukturell blind war. 16 bereits bestehende Dateien tragen
  // AUSSCHLIESSLICH diese Form und zählten darum bisher gar nicht mit — 127 + 16 = 143. Gemessen
  // mit dem erweiterten tools/adr-konformitaet-pruefen.js, nicht angenommen.
  // 143 → 144 (17.09.2026, U2-ADR-422, dieselbe Nachfolge, dokumentierende ADR): neue, eigene
  // ADR-Datei mit drei Konformitätsblöcken (YAML-Form). Gemessen mit
  // tools/adr-konformitaet-pruefen.js, nicht angenommen.
  // 144 → 145 (17.09.2026, U2-ADR-420, dokumentierende ADR zum Nummernkollisions-Wächter): neue,
  // eigene ADR-Datei mit vier Konformitätsblöcken (YAML-Form). U2-ADR-347s Umbenennung nach
  // U2-ADR-419 ändert die Zahl NICHT — dieselbe Datei, derselbe Klauselblock, nur neue Nummer.
  // Gemessen mit tools/adr-konformitaet-pruefen.js, nicht angenommen.
  // 145 → 149 (19.09.2026, Zusammenführung mit L1, s. o. 127 → 130 und dem Stand a63c5c70): gemessen mit
  // tools/adr-konformitaet-pruefen.js → „mit Konformitäts-Klausel: 149", nicht angenommen.
  // 150 → 151 (19.09.2026, signierte Sprachmodule: ADR mit Konformitäts-Klausel)
  // 149 → 150 (19.09.2026, Landung L2): gemessen mit tools/adr-konformitaet-pruefen.js → „mit Konformitäts-Klausel: 150".
  // 151 → 153 (20.09.2026, Landung L4 Runde 2): zwei neue ADR-Dateien mit Konformitäts-Klausel
  // (U2-ADR-424 Finanzen/P-Konto, U2-ADR-425 Hilfe in der Datei), gemessen mit
  // tools/adr-konformitaet-pruefen.js → „mit Konformitäts-Klausel: 153“, nicht aus 151+2 angenommen.
  // 153 → 155 (20.09.2026): zwei neue ADR-Dateien mit Konformitäts-Klausel, U2-ADR-426 (S1) und U2-ADR-427 (Templates im Rezept);
  // gemessen mit tools/adr-konformitaet-pruefen.js, nicht angenommen.
  // 155 → 156 (20.09.2026, Gerüst-Schnitt S3): Nachfolge-ADR zu U2-ADR-285 mit Konformitäts-Klausel.
  assert.equal(e.adrDateienMitKlausel, 160); // gemessen 23.09.2026 (U2-ADR-432 dazu: Sub-Depot ist ein Depot, vier Klauseln; tools/adr-konformitaet-pruefen.js → „mit Konformitäts-Klausel: 160“), davor 159 gemessen 21.09.2026 (U2-ADR-431 dazu: Angaben am Herkunftsort, fuenf Klauseln), davor 158 (U2-ADR-430 dazu), davor 157 (21.09.2026, U2-ADR-428 dazu), nicht angenommen // gemessen 21.09.2026, nicht angenommen
  assert.ok(e.klauselnGeprueft >= e.adrDateienMitKlausel, 'mindestens eine Klausel je ADR mit Klausel');
  assert.equal(e.klauselnRot, 0, 'der eingecheckte Bestand darf keine widersprüchliche Klausel tragen');
});

/* ── 4 · Rotmachbarkeit über die CLI, gegen eine KOPIE des echten Bestands ──── */

function kopieDesAdrOrdners() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-konformitaet-gate-'));
  fs.cpSync(path.join(REPO, 'docs', 'adr'), dir, { recursive: true });
  return dir;
}

function gateGegenOrdner(ordner) {
  const r = require('node:child_process').spawnSync('node', ['tools/adr-konformitaet-pruefen.js', '--gate'], {
    cwd: REPO, encoding: 'utf8', env: { ...process.env, ADR_ORDNER_PATH: ordner }, maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

test('[Konformitäts-Wächter] Negativkontrolle: die unveränderte Kopie lässt das Gate grün', () => {
  const dir = kopieDesAdrOrdners();
  try {
    const r = gateGegenOrdner(dir);
    assert.equal(r.code, 0, 'gegen den heutigen Stand darf das Gate nicht rot sein:\n' + r.out.slice(-400));
  } finally { aufraeumen(dir); }
});

test('[Konformitäts-Wächter] Positivkontrolle: eine verstümmelte pruefung-Zeile macht das Gate ROT — und die Entschärfung wieder GRÜN', () => {
  const dir = kopieDesAdrOrdners();
  try {
    const ziel = path.join(dir, 'vivodepot-U2-ADR-102-untersagtes-erscheint-nirgends-als-bedingung-2026-07-26.md');
    const original = fs.readFileSync(ziel, 'utf8');
    // U2-ADR-226 (03.09.2026): der Pflanz-Anker zielt seither auf die erste der drei präzisen
    // pruefung:-Zeilen (der bloße Kurz-Anker „U2-102" existiert seit diesem ADR nicht mehr).
    assert.match(original,
      /pruefung:\s*tests\/adr-102-import-bereinigen\.test\.js#\[U2-102·1\] eine inkonsistente Zeile wird erkannt, mit Schlüssel und Text/,
      'Vorbedingung: der Pflanz-Anker muss im echten Text stehen, sonst pflanzt der Test ins Leere');

    // MUTATION: die Probe verweist auf eine Datei, die es nicht gibt.
    const gepflanzt = original.replace(
      'pruefung: tests/adr-102-import-bereinigen.test.js#[U2-102·1] eine inkonsistente Zeile wird erkannt, mit Schlüssel und Text',
      'pruefung: tests/diese-datei-gibt-es-nicht.test.js#[U2-102·1] eine inkonsistente Zeile wird erkannt, mit Schlüssel und Text',
    );
    fs.writeFileSync(ziel, gepflanzt);
    const rot = gateGegenOrdner(dir);
    assert.equal(rot.code, 1, 'eine erfundene Testdatei MUSS das Gate rot machen:\n' + rot.out.slice(-400));
    assert.match(rot.out, /Pfad existiert nicht/);

    // ENTSCHÄRFUNG: zurück auf den Original-Text — das Gate muss wieder grün werden.
    // Das ist die Entschärfungskontrolle aus dem Auftrag: sie zeigt, dass Rot am ECHTEN
    // Zustand hängt und nicht an einem Artefakt der Kopie.
    fs.writeFileSync(ziel, original);
    const gruen = gateGegenOrdner(dir);
    assert.equal(gruen.code, 0, 'nach der Entschärfung muss das Gate wieder grün sein:\n' + gruen.out.slice(-400));
  } finally { aufraeumen(dir); }
});

test('[Konformitäts-Wächter] Positivkontrolle YAML-Form: eine verstümmelte pruefung-Zeile macht das Gate ROT — und die Entschärfung wieder GRÜN', () => {
  const dir = kopieDesAdrOrdners();
  try {
    const ziel = path.join(dir, 'vivodepot-U2-ADR-334-bereichsbeschriftung-erreicht-den-empfaenger-2026-09-06.md');
    const original = fs.readFileSync(ziel, 'utf8');
    assert.match(original,
      /- tests\/u2-adr-334-bereichslabel-textsatz-lese-app\.test\.js\n\s+"\[U2-ADR-334·Rot-Beweis\] die Beschriftung kommt in JEDER Sprache an — auch in nicht-lateinischer Schrift"/,
      'Vorbedingung: der Pflanz-Anker muss im echten Text stehen, sonst pflanzt der Test ins Leere');

    // MUTATION: der YAML-pruefung-Eintrag zeigt auf eine Datei, die es nicht gibt — der Titel
    // bleibt unverändert, damit klar ist, dass allein der Pfad das Gate rot macht.
    const gepflanzt = original.replace(
      '- tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js\n        "[U2-ADR-334·Rot-Beweis] die Beschriftung kommt in JEDER Sprache an — auch in nicht-lateinischer Schrift"',
      '- tests/diese-datei-gibt-es-nicht.test.js\n        "[U2-ADR-334·Rot-Beweis] die Beschriftung kommt in JEDER Sprache an — auch in nicht-lateinischer Schrift"',
    );
    assert.notEqual(gepflanzt, original, 'Mutation muss greifen, sonst pflanzt der Test ins Leere');
    fs.writeFileSync(ziel, gepflanzt);
    const rot = gateGegenOrdner(dir);
    assert.equal(rot.code, 1, 'eine erfundene Testdatei in einem YAML-pruefung-Eintrag MUSS das Gate rot machen:\n' + rot.out.slice(-400));
    assert.match(rot.out, /Pfad existiert nicht/);

    // ENTSCHÄRFUNG: zurück auf den Original-Text — das Gate muss wieder grün werden, wie bei der
    // eingezäunten Form auch (dieselbe Entschärfungskontrolle, für die YAML-Form wiederholt, weil
    // beide Formen ihren eigenen Lesepfad im Wächter haben, s. U2-ADR-Nachfolge zu U2-ADR-098).
    fs.writeFileSync(ziel, original);
    const gruen = gateGegenOrdner(dir);
    assert.equal(gruen.code, 0, 'nach der Entschärfung muss das Gate wieder grün sein:\n' + gruen.out.slice(-400));
  } finally { aufraeumen(dir); }
});
