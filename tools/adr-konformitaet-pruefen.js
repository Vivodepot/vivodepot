#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ADR-Konformitäts-Wächter — Posten 1, Auftrag ADR_Konformitaets_Waechter
   (04.08.2026, Fassung 3)
   ────────────────────────────────────────────────────────────────────────────
   Anlass: 34 der 130 ADR-Dateien tragen einen ```konformitaet```-Block, der
   Aussage, Zustand und (bei prüfbaren Aussagen) eine Testbindung nennt — genau
   der Mechanismus, der Einhaltung belegen soll. Kein Werkzeug las diese Blöcke.

   WAS DIESER WÄCHTER PRÜFT, je Klausel:
     1. Zeigt `pruefung:` auf etwas, das es gibt? Datei existiert UND der genannte
        Testname kommt darin tatsächlich vor (nicht nur `existsSync` — dieselbe
        Lehre wie bei der Z9-Marken-Prüfung vom 03.08., `2b707ff`: eine Datei kann
        bleiben, während ihr Beleg verschwindet).
     2. Passt `zustand` zum Befund? Eine Klausel auf einem Zustand, der eine
        Testbindung verlangt (`prüfbar`, `geprüft`), aber keine auffindbare Probe
        trägt, ist ein Widerspruch und wird ROT. Ein `offen` ohne Probe ist in
        Ordnung — er behauptet ja keine.

   FORMAT-DRIFT, GEMESSEN UND ABSICHTLICH TOLERIERT: ADR-098 (23.07.2026) legt
   `prüfbar | offen | nicht-prüfbar | ausgesetzt` als Kanon fest. Der tatsächlich
   verbreitete Wortlaut in den 34 vorhandenen Klauseln ist überwiegend `geprüft`
   statt `prüfbar` (ADR-099 und danach) — eine Abweichung vom eigenen Kanon, die
   nie korrigiert wurde. Dieser Wächter behandelt `prüfbar` UND `geprüft`
   gleichwertig als „verlangt eine auflösbare Probe" — er korrigiert das
   Vokabular nicht, das ist Sache des ADR-098-Format-Linters (Posten 3, eigener
   Auftrag), nicht dieser Kette-Prüfung hier.

   WAS DIESER WÄCHTER AUSDRÜCKLICH NICHT PRÜFT: ob die Probe das Richtige misst.
   Er prüft die Kette ADR → Testdatei → Testname, nicht den Inhalt des Tests.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { testTitelVon } = require('../tests/pruefstand-bindung.js');

const REPO = path.join(__dirname, '..');
const ADR_ORDNER = process.env.ADR_ORDNER_PATH
  ? path.resolve(process.env.ADR_ORDNER_PATH)
  : path.join(REPO, 'docs', 'adr');

const BENOETIGT_PRUEFUNG = new Set(['prüfbar', 'geprüft']);
const OHNE_PRUEFUNG = new Set(['offen', 'nicht-prüfbar', 'nicht_pruefbar', 'ausgesetzt', 'abgelöst', 'abgeloest']);

// Benannt UND gezählt, nie stillschweigend (dasselbe Muster wie UNLESBAR_ERLAUBT in
// tests/pruefstand-bindung.test.js): das Format-BEISPIEL der Format-ADR selbst — eine
// ``` konformitaet ```-Fenz, die die GRAMMATIK zeigt (`zustand: prüfbar | offen | …`), keine
// echte Klausel. Ohne diese Ausnahme wäre ADR-098 die einzige Datei, die an ihrer eigenen
// Lehr-Fenz rot würde — ein Wächter, der sein eigenes Vorbild bestraft, wird abgeschaltet.
const KEIN_KLAUSEL_BEISPIEL = [
  // Zeile verschoben (33→35) durch die Status-heute-Zeile aus dem
  // ADR-Veröffentlichung-Auftrag (13.08.2026).
  { datei: 'vivodepot-U2-ADR-098-format-konformitaetsklausel-2026-07-23.md', zeile: 35 },
];
function istBeispielBlock(block) {
  return KEIN_KLAUSEL_BEISPIEL.some((a) => a.datei === block.datei && a.zeile === block.zeile);
}

// Jeden ```konformitaet```-Block als eigenes Objekt, mit den Zeilennummern der Fenz —
// so bleibt jede Meldung auf eine Fundstelle zurückführbar.
function bloeckeAusDatei(dateiName) {
  const text = fs.readFileSync(path.join(ADR_ORDNER, dateiName), 'utf8');
  const zeilen = text.split('\n');
  const bloecke = [];
  let drin = false, start = 0, buf = [];
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (!drin && /^\s*```konformitaet\s*$/.test(z)) { drin = true; start = i + 1; buf = []; continue; }
    if (drin && /^\s*```\s*$/.test(z)) {
      drin = false;
      bloecke.push({ datei: dateiName, zeile: start + 1, text: buf.join('\n'), form: 'fenced' });
      continue;
    }
    if (drin) buf.push(z);
  }
  bloecke.push(...yamlBloeckeAusDatei(dateiName, text));
  return bloecke;
}

/* ZWEITE FORM (seit U2-ADR-323, 06.09.2026): ein ```yaml```-Fenz mit `konformitaet:` als
   YAML-Liste — je Listeneintrag eine eigene Klausel (aussage/zustand/herkunft/pruefung), nicht
   eine Klausel je Fenz wie bei der eingezäunten Form. Nachtrag zu diesem Auftrag (17.09.2026,
   s. Kopf-Kommentar unten „Zwei Formen"): dieses Werkzeug war für diese Form blind — ein
   Extraktionsfehler bei der Messung, die den Bauauftrag auslöste, ließ zunächst sogar glauben,
   der Form selbst fehle ein `pruefung:`-Feld; sie hat eines, nur anders geformt (Liste statt
   `Pfad#Name`-Einzeiler). GEZÄHLT, NICHT VERSCHWIEGEN: verankert am Zeilenanfang, nicht am
   ganzen Fenz-Text — dieselbe Falle wie bei `aussage-pruefung-abgleich-messen.js` (eigener
   Kommentar dort: eine `aussage:`, die wörtlich von „pruefung:-Zeile" spricht, träfe ein
   unverankertes Muster als eigene, falsche Zeile). */
function yamlBloeckeAusDatei(dateiName, textVorhanden) {
  const text = textVorhanden || fs.readFileSync(path.join(ADR_ORDNER, dateiName), 'utf8');
  const zeilen = text.split('\n');
  const bloecke = [];
  let inFenz = false, inKonformitaet = false, itemStart = -1, buf = [];
  const itemAbschliessen = (endeVorZeile) => {
    if (itemStart === -1) return;
    bloecke.push({ datei: dateiName, zeile: itemStart + 1, text: buf.join('\n'), form: 'yaml' });
    itemStart = -1; buf = [];
  };
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (!inFenz && /^\s*```yaml\s*$/.test(z)) { inFenz = true; inKonformitaet = false; continue; }
    if (inFenz && /^\s*```\s*$/.test(z)) {
      itemAbschliessen();
      inFenz = false; inKonformitaet = false;
      continue;
    }
    if (!inFenz) continue;
    if (!inKonformitaet) {
      if (/^konformitaet:\s*$/.test(z)) inKonformitaet = true;
      continue;
    }
    if (/^\s*-\s*aussage:/.test(z)) {
      itemAbschliessen();
      itemStart = i;
      buf = [z];
      continue;
    }
    if (itemStart !== -1) buf.push(z);
  }
  itemAbschliessen();
  return bloecke;
}

/* `pruefung:` in der YAML-Form ist selbst eine Liste, je Eintrag ein gefalteter, mehrzeiliger
   Skalar (Pfad, dann optional eine Zeile tiefer der Testtitel in Anführungszeichen) — YAML faltet
   das beim echten Parsen zu EINEM String mit Leerzeichen statt Zeilenumbruch; hier nachgebildet,
   ohne eine YAML-Bibliothek einzuführen (das Format ist eng genug, dass ein Zeilen-Parser reicht,
   und diese Codebase führt an dieser Stelle sonst keine YAML-Abhängigkeit). Ein Eintrag OHNE
   Titelzeile (nur ein Werkzeug-Pfad, kein Test) ist gültig, kein Sonderfall — U2-ADR-323 selbst
   hat einen (`tools/lese-app-bereichsluecke-messen.js`). */
function yamlPruefungsEintraege(blockText) {
  const zeilen = blockText.split('\n');
  const start = zeilen.findIndex((z) => /^\s*pruefung:\s*$/.test(z));
  if (start === -1) return [];
  const eintraege = [];
  let aktuell = null;
  const schliessen = () => { if (aktuell !== null) { eintraege.push(aktuell.trim()); aktuell = null; } };
  for (let i = start + 1; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (/^\s*(aussage|zustand|herkunft):/.test(z)) break;
    if (/^\s*-\s+\S/.test(z)) { schliessen(); aktuell = z.replace(/^\s*-\s*/, ''); continue; }
    if (!z.trim()) { schliessen(); continue; }
    if (aktuell !== null) { aktuell += ' ' + z.trim(); continue; }
  }
  schliessen();
  return eintraege;
}

// EIN Eintrag der YAML-`pruefung:`-Liste: „Pfad" allein (Werkzeug-Beleg, kein Titel-Abgleich
// nötig — die Existenz DES WERKZEUGS ist die ganze Zusicherung) oder „Pfad \"Titel\"" (Pfad
// existiert UND der Titel kommt wörtlich in der Datei vor). Die Titel-Anführung ist GREEDY
// (`.*` statt `[^"]*`) — gemessen (17.09.2026): mehrere echte Titel tragen selbst eingebettete
// Anführungszeichen (z. B. `Motor "bv" ohne Einträge…`), ein striktes „bis zum ERSTEN Quote"
// hätte sie fälschlich als „nicht lesbar" verworfen. Erster/letzter Quote im Rest der Zeile
// rahmen den Titel, alles dazwischen gehört dazu.
function pruefeEineYamlPruefungsZeile(roh) {
  const m = roh.match(/^([\w./-]+\.(?:js|mjs|cjs))(?:\s+"(.*)")?\s*$/);
  if (!m) return { roh, ok: false, grund: 'nicht als „Pfad" oder „Pfad \\"Titel\\"" lesbar: ' + roh };
  const rel = m[1];
  // Der Titel steht als korrekt maskierter String (Backslash-Quote für eingebettete
  // Anführungszeichen, z. B. `Motor \"bv\" …` — gemessen an U2-ADR-345) — vor dem Vergleich
  // entmaskieren, sonst trägt `name` Backslashes, die im echten Testtitel nie stehen.
  const name = m[2] === undefined ? undefined : m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) return { roh, ok: false, grund: 'Pfad existiert nicht: ' + rel };
  if (!name) return { roh, ok: true, grund: '' };
  const quelle = fs.readFileSync(abs, 'utf8');
  // ZWEI ZIELARTEN, GEMESSEN (17.09.2026): zeigt der Pfad auf eine `.test.js`-Datei, ist der
  // Titel ein `test('…')`-Titel (wie bei der eingezäunten Form). Zeigt er auf eine ANDERE Datei
  // (z. B. `tools/waechter-register.js`), ist der Titel eine Registrierungs-Kennung
  // (`id: '…'`), kein Testtitel — dort gibt es keine `test()`-Aufrufe zu finden. Belegt: zwei
  // YAML-Einträge zeigten genau dahin (`W-logik-datentypen`/`W-zusicherungs-sperre`, beide echte
  // `id:`-Werte in `waechter-register.js`) — ein reiner Testtitel-Abgleich hätte sie fälschlich
  // als Fund gemeldet.
  if (/\.test\.(?:js|mjs|cjs)$/.test(rel)) {
    const treffer = testTitelVon(quelle).filter((t) => t.includes(name));
    if (treffer.length === 0) return { roh, ok: false, grund: 'kein Test-Titel „' + name + '" in ' + rel };
    if (treffer.length > 1) {
      return {
        roh, ok: false,
        grund: 'mehrdeutig — „' + name + '" passt auf ' + treffer.length + ' Test-Titel in ' + rel + ': '
          + treffer.map((t) => JSON.stringify(t)).join(', '),
      };
    }
    return { roh, ok: true, grund: '' };
  }
  if (!quelle.includes(name)) return { roh, ok: false, grund: '„' + name + '" kommt in ' + rel + ' nicht wörtlich vor' };
  return { roh, ok: true, grund: '' };
}

function zeilenwert(blockText, feld) {
  const re = new RegExp('^\\s*' + feld + ':\\s*(.*)$', 'm');
  const m = blockText.match(re);
  return m ? m[1].trim() : null;
}

function alleAdrDateien() {
  if (!fs.existsSync(ADR_ORDNER)) return [];
  return fs.readdirSync(ADR_ORDNER).filter((f) => f.endsWith('.md'));
}

// U2-ADR-226 — ALLE `pruefung:`-Zeilen eines Blocks, nicht nur die erste. Wortgleich mit
// `tools/klausel-proben-schaerfe-pruefer.js`s gleichnamiger Funktion, die diese Lücke hier
// bereits am 05.08.2026 selbst gefunden und für sich behoben hatte („sonst blieben vier von
// fünf Proben in testament-verzicht-klausel unsichtbar") — nur eben nicht an dieser, der
// eigentlich zuständigen Stelle. Kanonisch jetzt hier, jener Prüfer importiert sie von hier.
function alleePruefungsZeilen(blockText) {
  const re = /^\s*pruefung:\s*(.*)$/gm;
  const raus = [];
  let m;
  while ((m = re.exec(blockText))) raus.push(m[1].trim());
  return raus;
}

// EINE `pruefung:`-Zeile: Pfad#Name lesbar, Pfad existiert, Name bindet auf GENAU EINEN
// Test-Titel — nicht null (der alte Fall), aber auch nicht mehr als einen (U2-ADR-226,
// Fehlerklasse A). Mehrdeutigkeit ist der eigentliche Fehlerfall, nicht Namens-Doppelvergabe
// an sich: zwei Proben dürfen ähnliche Kürzel tragen, solange am Ende klar bleibt, welche
// EINE `pruefung:`-Zeile jeweils gemeint ist.
function pruefeEinePruefungsZeile(roh) {
  const m = roh.match(/^([\w./-]+\.(?:js|mjs|cjs))#(.+)$/);
  if (!m) return { roh, ok: false, grund: '`pruefung:` ist nicht als „Pfad#Name" lesbar: ' + roh };
  const rel = m[1], name = m[2].trim();
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) return { roh, ok: false, grund: 'Pfad existiert nicht: ' + rel };
  const quelle = fs.readFileSync(abs, 'utf8');
  const treffer = testTitelVon(quelle).filter((t) => t.includes(name));
  if (treffer.length === 0) return { roh, ok: false, grund: 'kein Test-Titel „' + name + '" in ' + rel };
  if (treffer.length > 1) {
    return {
      roh, ok: false,
      grund: 'mehrdeutig — „' + name + '" passt auf ' + treffer.length + ' Test-Titel in ' + rel + ': '
        + treffer.map((t) => JSON.stringify(t)).join(', '),
    };
  }
  return { roh, ok: true, grund: '' };
}

// Ein Fund je Klausel-BLOCK: { datei, zeile, zustand, pruefung, pruefungen, rot, grund }.
// `pruefungen` trägt JEDE einzelne `pruefung:`-Zeile mit ihrem eigenen Ergebnis (U2-ADR-226) —
// `pruefung` bleibt zusätzlich die erste als kompakter String, für alles, das nur den einen
// Fall (eine Zeile je Block) kennt. Ein Block mit mehreren `pruefung:`-Zeilen ist der
// ETABLIERTE NORMALFALL (36 von 195 Blöcken im Bestand vom 03.09.2026, z. B. Rot-Beweis PLUS
// Rundlauf für dieselbe Aussage) — rot wird der Block nur, wenn EINE KONKRETE Zeile fehlschlägt,
// nie schon dadurch, dass es mehrere sind.
function pruefeKlausel(block) {
  const zustand = zeilenwert(block.text, 'zustand');
  const istYaml = block.form === 'yaml';
  const pruefungsZeilen = istYaml ? yamlPruefungsEintraege(block.text) : alleePruefungsZeilen(block.text);
  const aufloeser = istYaml ? pruefeEineYamlPruefungsZeile : pruefeEinePruefungsZeile;
  const fund = {
    datei: block.datei, zeile: block.zeile, zustand, form: block.form,
    pruefung: pruefungsZeilen[0] || null, pruefungen: [], rot: false, grund: '',
  };

  /* DIE YAML-FORM HAT KEIN FESTGELEGTES zustand-VOKABULAR WIE U2-ADR-098 ES FÜR DIE EINGEZÄUNTE
     FORM TUT (`prüfbar | offen | nicht-prüfbar | ausgesetzt`). Gemessen (17.09.2026) an allen 16
     bestehenden Dateien: drei Wörter kommen vor (`erfuellt`, `teilweise-erfuellt`,
     `bekannte-grenze`), und ALLE DREI trugen in JEDEM beobachteten Fall eine auflösbare
     `pruefung:`-Liste — keinmal fehlte sie. Darum hier KEINE zustand-Wort-Dichotomie wie oben
     (BENOETIGT_PRUEFUNG/OHNE_PRUEFUNG, kalibriert auf die U2-ADR-098-Wörter): ein erfundenes
     Vokabular für ein Format, das keinen eigenen Kanon hat, wäre eine Behauptung ohne Beleg.
     Regel statt Wörterbuch: TRÄGT der Block eine `pruefung:`-Liste, wird sie aufgelöst und der
     Block wird rot, wenn ein Eintrag fehlschlägt — UNABHÄNGIG vom zustand-Wort. Fehlt die Liste
     ganz, ist das für die YAML-Form heute kein Fund (kein „unbekannter zustand"-Rot wie unten bei
     der eingezäunten Form) — dafür fehlt der Kanon, der das entscheiden könnte. */
  if (istYaml) {
    if (!pruefungsZeilen.length) return fund;
    fund.pruefungen = pruefungsZeilen.map(aufloeser);
    const fehlgeschlagene = fund.pruefungen.filter((p) => !p.ok);
    if (fehlgeschlagene.length) {
      fund.rot = true;
      fund.grund = fehlgeschlagene.map((p) => '„' + p.roh + '": ' + p.grund).join('  ·  ');
    }
    return fund;
  }

  if (zustand && BENOETIGT_PRUEFUNG.has(zustand)) {
    if (!pruefungsZeilen.length) {
      fund.rot = true; fund.grund = 'zustand „' + zustand + '" verlangt eine `pruefung:`-Zeile, keine vorhanden';
      return fund;
    }
    fund.pruefungen = pruefungsZeilen.map(aufloeser);
    const fehlgeschlagene = fund.pruefungen.filter((p) => !p.ok);
    if (fehlgeschlagene.length) {
      fund.rot = true;
      fund.grund = fehlgeschlagene.map((p) => '„' + p.roh + '": ' + p.grund).join('  ·  ');
    }
    return fund;
  }

  if (zustand && OHNE_PRUEFUNG.has(zustand)) {
    // Ein `offen`/`nicht-prüfbar`/… MIT `pruefung:`-Zeile(n) ist selbst ein Widerspruch:
    // entweder die Probe existiert (dann gehört der Zustand auf `prüfbar`/`geprüft`),
    // oder sie ist erfunden. Beides ist ein Fund, kein stilles Übergehen.
    if (pruefungsZeilen.length) {
      fund.rot = true;
      fund.grund = 'zustand „' + zustand + '" erwartet KEINE `pruefung:`-Zeile, aber '
        + (pruefungsZeilen.length === 1 ? 'eine ist' : pruefungsZeilen.length + ' sind') + ' vorhanden: '
        + pruefungsZeilen.join(' | ');
    }
    return fund;
  }

  fund.rot = true;
  fund.grund = zustand ? 'unbekannter zustand-Wert: „' + zustand + '"' : 'keine `zustand:`-Zeile im Block';
  return fund;
}

function laufErgebnis() {
  const adrDateien = alleAdrDateien();
  const mitKlausel = new Set();
  const klauseln = [];
  for (const datei of adrDateien) {
    const bloecke = bloeckeAusDatei(datei).filter((b) => !istBeispielBlock(b));
    if (bloecke.length) mitKlausel.add(datei);
    for (const b of bloecke) klauseln.push(pruefeKlausel(b));
  }
  const rote = klauseln.filter((k) => k.rot);
  const pruefbarMitProbe = klauseln.filter((k) => k.zustand && BENOETIGT_PRUEFUNG.has(k.zustand) && !k.rot);
  return {
    adrDateienGesamt: adrDateien.length,
    adrDateienMitKlausel: mitKlausel.size,
    adrDateienOhneKlausel: adrDateien.length - mitKlausel.size,
    klauselnGeprueft: klauseln.length,
    klauselnRot: rote.length,
    pruefbarMitEchterProbe: pruefbarMitProbe.length,
    rote,
    klauseln,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const ergebnis = laufErgebnis();

  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify(ergebnis, null, 1) + '\n');
    return;
  }

  console.log('ADR-Dateien gesamt: ' + ergebnis.adrDateienGesamt
    + ' · mit Konformitäts-Klausel: ' + ergebnis.adrDateienMitKlausel
    + ' · ohne: ' + ergebnis.adrDateienOhneKlausel);
  console.log('Klauseln geprüft: ' + ergebnis.klauselnGeprueft
    + ' · rot: ' + ergebnis.klauselnRot
    + ' · prüfbar/geprüft mit echter Probe: ' + ergebnis.pruefbarMitEchterProbe);

  if (argv.includes('--gate')) {
    if (!ergebnis.klauselnRot) { console.log('GATE grün — keine widersprüchliche Klausel.'); return; }
    console.error('GATE ROT:');
    for (const r of ergebnis.rote) console.error('  ' + r.datei + ':' + r.zeile + ' [' + r.zustand + '] ' + r.grund);
    process.exit(1);
  } else if (ergebnis.klauselnRot) {
    console.log('Rote Klauseln:');
    for (const r of ergebnis.rote) console.log('  ' + r.datei + ':' + r.zeile + ' [' + r.zustand + '] ' + r.grund);
  }
}

if (require.main === module) main();
module.exports = {
  bloeckeAusDatei, yamlBloeckeAusDatei, zeilenwert, pruefeKlausel, laufErgebnis, alleAdrDateien,
  alleePruefungsZeilen, pruefeEinePruefungsZeile,
  yamlPruefungsEintraege, pruefeEineYamlPruefungsZeile,
  BENOETIGT_PRUEFUNG, OHNE_PRUEFUNG, istBeispielBlock, KEIN_KLAUSEL_BEISPIEL,
};
