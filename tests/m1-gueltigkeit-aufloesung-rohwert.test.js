'use strict';
/* ════════════════════════════════════════════════════════════════════════
   M1 Zug 5 / Zug 3 — EINE Auflösung „gib mir den geltenden Rohwert"
   ────────────────────────────────────────────────────────────────────────
   DER ANLASS (A321 Nachtrag, dritter Befund): dieselbe Bauart
   (`for f of sek.felder` → `sektorDaten[f.id]` → `feldEingetragen`) steht an
   drei Stellen im Kern, und alle drei sehen einen Wert nicht mehr, sobald er
   am Zielort `data.feldGueltigkeit[…].bis` liegt:

     `_bereichSektionenModell`  → speist `vollDepotModell` → die PDF-Ausgabe,
     `exportUebersichtModell`   → „Das wird herausgegeben",
     `exportUnstimmigeFelder`   → die Ansage vor dem Herausgeben (F7 Zug 1).

   Der schwerste ist der erste: „alle Daten AUCH als PDF" — bei einem Ausweis
   ist ein fehlendes Ablaufdatum keine Kosmetik.

   WAS HIER GEPRÜFT WIRD, ist nicht „drei Flicken sitzen", sondern dass es
   EINE Stelle ist: die Quelltext-Probe unten hält fest, dass keiner der drei
   den Bereich wieder direkt liest. Ein vierter generischer Leser, der es doch
   täte, fiele damit auf.

   GEGENSTAND IST NUR DIE AUFLÖSUNG. Der Umzug selbst (Zug 1) und die
   Migrationsstufe (Zug 2) sind nicht gebaut — die Proben stellen den Zustand
   „Wert liegt am Zielort, Bereich ist leer" darum her, indem sie ihn setzen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

/* Ein Feld mit Marke, dessen Wert AUSSCHLIESSLICH am Zielort liegt — genau der
   Zustand, den der Umzug herstellt. `arbeitsvertrag_befristet_bis` ist dafür der
   sprechendste Fall: es trägt die Marke, ist nicht schema-sensibel (steht also im
   PDF ohne Opt-in) und ist zugleich der Topf-B-Eintrag aus `edci-bildung`. */
function depotMitWertAmZielort() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  V.feldGueltigkeitSetzen('education', 'employmentContractFixedTerm', null, '2027-06-30');
  return V;
}

test('[M1·Zug5] die Auflösung liefert den Wert vom Zielort, wenn der Bereich ihn nicht (mehr) hat', () => {
  const V = depotMitWertAmZielort();
  assert.equal(V.feldRohwert('education', 'employmentContractFixedTerm'), '2027-06-30');
  assert.equal(((V.getData().sektoren.education) || {}).employmentContractFixedTerm, undefined,
    'die Probe muss den Umzugs-Zustand herstellen, sonst beweist sie den Rückfallweg nicht');
});

test('[M1·Zug5·Gegenprobe] OHNE Marke gibt es keinen Rückfallweg — ein Geburtsdatum bleibt leer', () => {
  const V = depotMitWertAmZielort();
  V.feldGueltigkeitSetzen('identity', 'birthDate', null, '2099-01-01');
  assert.equal(V.feldHatMarke('identity', 'birthDate', 'laeuftAb'), false, 'Vorbedingung der Gegenprobe');
  assert.equal(V.feldRohwert('identity', 'birthDate'), undefined,
    'ein unmarkiertes Feld darf sich nichts aus `feldGueltigkeit` holen — sonst wäre die Marke kein Kriterium');
});

test('[M1·Zug5·Rot] die PDF-Ausgabe zeigt das Ablaufdatum weiterhin', () => {
  const V = depotMitWertAmZielort();
  const modell = V.vollDepotModell({});
  const bildung = modell.bereiche.find(b => b.id === 'education');
  const zeilen = bildung.sektionen.flatMap(s => s.zeilen);
  const treffer = zeilen.find(z => /befristet bis/.test(z.label));
  assert.ok(treffer, '„alle Daten AUCH als PDF" — die Zeile darf nicht fehlen');
  assert.equal(treffer.wert, '30.06.2027');
  assert.equal(bildung.leer, false);
});

test('[M1·Zug5·Rot] „Das wird herausgegeben" zeigt das Feld weiterhin', () => {
  const V = depotMitWertAmZielort();
  const { enthalten } = V.exportUebersichtModell(null);
  assert.ok(enthalten.some(e => e.sektor === 'education' && e.feld === 'employmentContractFixedTerm'),
    'die Zusicherung vor dem Export darf kein ausgefülltes Feld verschweigen');
});

test('[M1·Zug5·Rot] `arbeitsvertrag_befristet_bis` bleibt in `edci-bildung` als nicht gemappt geführt', () => {
  const V = depotMitWertAmZielort();
  const { enthalten } = V.exportUebersichtModell(null, 'edci-bildung');
  const e = enthalten.find(x => x.feld === 'employmentContractFixedTerm');
  assert.ok(e, 'ohne die Auflösung wird die Zeile gar nicht erst erreicht');
  assert.equal(e.formatOhneZiel, true,
    'die Aussage „in edci-bildung bewusst nicht gemappt" gilt unverändert — sie greift erst, wenn die Zeile erreicht wird');
});

test('[M1·Zug5·Rot] die Ansage vor dem Herausgeben sieht den Wert — und schweigt zu einem gültigen', () => {
  const V = depotMitWertAmZielort();
  const funde = V.exportUnstimmigeFelder('education');
  assert.deepEqual(funde, [], 'ein ISO-Datum am Zielort ist stimmig');
  /* Warum hier kein unstimmiger Gegenfall steht: `feldGueltigkeitSetzen` nimmt nur
     geprüftes ISO-Datum an — am Zielort KANN kein unstimmiger Wert liegen. Dass die
     Ansage denselben Rohwert prüft wie PDF und Übersicht, hält die Quelltext-Probe
     unten fest; ein erfundener Gegenfall wäre hier eine falsche Behauptung. */
});

test('[M1·Zug5·Rot] das Leitfeld der Erkennungstabelle liest den Wert am Zielort', () => {
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `identitaet.ausweis_gueltig` ist zum
  // Listen-Unterfeld geworden (kein `laeuftAb`-Flachfeld mehr, s. korb1-mehrwertig-pruefermine.
  // test.js) — `mobility.passportValidUntil` ersetzt es hier als scalar-gebliebenes Beispiel
  // derselben Familie (dieselbe Ersetzung wie in m1-umzug-gueltigkeit.test.js).
  const V = depotMitWertAmZielort();
  V.feldGueltigkeitSetzen('mobility', 'passportValidUntil', null, '2031-01-01');
  assert.equal(V._erkennungFeldWert('mobility', 'passportValidUntil'), '2031-01-01',
    '`hasOwnProperty` allein reichte nicht: nach dem Umzug hat der Bereich den Schlüssel gar nicht');
});

test('[M1·Zug5] EINE Auflösung, nicht drei Flicken — kein generischer Leser greift wieder direkt zu', () => {
  const q = fs.readFileSync(KERN, 'utf8');
  assert.equal(q.includes('const roh = sektorDaten[f.id];'), false,
    'ein direkter Bereichszugriff in der generischen Schleife ist genau der Fehler, den die Auflösung beseitigt');
  const stellen = ['_bereichSektionenModell', 'exportUebersichtModell', 'exportUnstimmigeFelder'];
  for (const name of stellen) {
    const i = q.indexOf('function ' + name + '(');
    assert.ok(i > 0, name + ' nicht gefunden');
    /* Fenster von 2600 auf 4200 Zeichen (20.08.2026, Kette Auftrag 3): `exportUebersichtModell`
       hat einen dritten Fall bekommen (eine Kennungs-Liste über Bereichsgrenzen) und ist
       gewachsen. `crossRefFeldUndRoh` zählt hier gleichwertig — es IST die eine Auflösung, nur
       eine Ebene darüber: es trägt zusätzlich Listen-Selektoren, abgeleitete Zeilen und
       Rollen-Felder und ruft `feldRohwert` selbst. Was der Wächter verbietet, bleibt unverändert
       verboten: der direkte Griff in `sektorDaten[f.id]` (Zeile oben). */
    const koerper = q.slice(i, i + 4200);
    assert.ok(koerper.includes('feldRohwert(') || koerper.includes('crossRefFeldUndRoh('),
      name + ' liest nicht über die Auflösung');
  }
});

test('[M1·Zug5] der Angehörigen-Cache liest über dieselbe Auflösung', () => {
  const q = fs.readFileSync(KERN, 'utf8');
  const i = q.indexOf('function angehoerigenCacheModell(');
  assert.ok(i > 0);
  const koerper = q.slice(i, i + 2600);
  assert.ok(/const setSektor = \([\s\S]{0,400}feldRohwert\(/.test(koerper),
    'ohne den Rückfallweg fehlte `pflegegrad_befristet_bis` still in der Angehörigen-Sicht');
  /* Eine VERHALTENS-Probe dazu ist heute nicht möglich und das ist kein Versäumnis:
     keines der Felder der fünf Angehörigen-Blätter trägt heute die Marke. Sie wird
     möglich, sobald `pflegegrad_befristet_bis` sie mit Zug 1 bekommt. */
});
