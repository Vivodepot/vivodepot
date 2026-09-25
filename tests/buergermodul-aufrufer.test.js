'use strict';
/* U2-ADR-303 — der Aufrufer auf die Erste-Partei-Zone.

   `buergermodulSektorErsetzen` (U2-ADR-292) war bewiesen und hatte NULL Aufrufer. Das
   fehlende Stück war nie ein Riegel, sondern der Weg hinein — gemessen: ein Bündel durch
   `modulEinlassen` liesse die Depot-Datei jeder Bürgerin um den Faktor 42 wachsen, und der
   Zuwachs wäre eine Kopie des Gerüsts, nicht ihr Inhalt.

   DIESE PROBEN HALTEN DREI DINGE FEST:
     1. das Struktur-Bündel (E4) ist gesetzt und angewandt — kein leerer Slot mehr
     2. mit dem eigenen Bestand als Bündel kommt derselbe Bestand heraus (Rundweg)
     3. der Einlassweg bleibt verriegelt — ein FREMDES Modul derselben Form wird abgewiesen

   Punkt 3 ist nicht gebaut, sondern gemessen. Er steht hier, damit er beim nächsten Umbau
   nicht still verlorengeht: die Zusage „was fällt, ist die Sperre für das MITGELIEFERTE
   Modul, nicht die Sperre gegen Fremde" hätte sonst keinen Wächter. */
const { test } = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

/* Baut aus dem NATIVEN Bestand ein Bündel in der Form, die der Aufrufer erwartet.
   Kein Fixture: was hier hineingeht, ist der echte Bestand — nur so misst der Rundweg
   den Gegenstand und nicht eine Nachbildung davon. */
/* Stufe 2 (09.09.2026) — `bereicheAlle()` statt `SEKTOREN`. Dieser Helfer baut aus dem
   LAUFENDEN Bestand ein Bündel und wendet es wieder an (der Rundweg). Seit `wohnen` ab Werk
   gesät wird, führt `SEKTOREN` zwölf — der Rundweg hätte den Bereich stillschweigend
   verloren und die Proben darunter hätten die kleinere Zahl als richtig bestätigt. */
function buendelAusBestand(V, nurSektoren) {
  const bereiche = {};
  for (const s of V.bereicheAlle()) {
    if (nurSektoren && nurSektoren.indexOf(s.id) < 0) continue;
    bereiche[s.id] = {
      sektionen: (s.sektionen || []).map((sek) => ({
        id: sek.id,
        felder: (sek.felder || []).map((f) => Object.assign({}, f)),
      })),
    };
  }
  return { bereiche };
}

function feldZahl(sektor) {
  let top = 0, unter = 0;
  for (const sek of (sektor.sektionen || [])) {
    for (const f of (sek.felder || [])) { top++; unter += (f.unterFelder || []).length; }
  }
  return { top, unter };
}

test('[Aufrufer·E4] Slot tot, Funktion lebt — der Boot-Aufruf verarbeitet weiterhin, was er kann', () => {
  /* NACHTRAG (18.09.2026, Schnitt): E4 kommt seit dem Schnitt über die Back-Pipeline, nicht mehr
     über einen befüllten BUERGERMODUL_BUENDEL-Slot — der bleibt jetzt DAUERHAFT null (U2-ADR-303
     selbst sagt das schon vom 05.09.2026: „Der Slot ... ist bewusst null: das Bündel selbst
     entsteht in einem eigenen Zug (E4)" — diese Probe war eine LANDEMARKE für jenen Zug, keine
     Sicherheitszusicherung; der Zug landete anders, als hier erwartet, die Marke ist überholt.
     Der EINLASS-RIEGEL (bereichsModulPruefen, sektionen:[]/reserviert) ist ein ANDERER
     Gegenstand — der bleibt unangetastet und hat eigene, weiterhin grüne Proben in dieser Datei
     ([Aufrufer·ROT] unten) UND unabhängig in tests/bereichs-module-einlass.test.js (13/13 grün,
     Zeile 154 prüft denselben reserviert-Grund).

     buergermodulBuendelAnwenden() SELBST ist trotzdem KEIN No-op (gemessen, nicht angenommen):
     der Boot-Aufruf `buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL)` erhält zwar `null`, aber
     `dokumente` wird UNABHÄNGIG vom Bündel-Parameter aus dem nativen Slot AB_WERK_DOKUMENTE_DE
     gespeist (U2-ADR-NNN2) — der Bericht zeigt darum `angewandt:true` und echte `dokumente`-Zahl,
     nicht den "kein-buendel"-Kurzschluss. Zusicherung „der eingebaute Bestand ist vollständig,
     mit den richtigen Feld-/Bereichszahlen" ist zu bereicheAlle() gewandert (unten, unverändert,
     bereits vorher grün) — bereiche/felder/unterFelder aus DIESEM Bericht sind seit dem Schnitt
     strukturell immer 0 (kein Bündel mehr, aus dem sie gespeist würden) und werden als das
     geprüft, was sie jetzt sind, nicht länger gegen eine tote Quelle verglichen. */
  const { V } = ladeKern();
  const b = V._BUERGERMODUL_BUENDEL_BERICHT;
  assert.equal(V.BUERGERMODUL_BUENDEL, null,
    'seit dem Schnitt dauerhaft null (U2-ADR-303) — kein Umweg möglich, kein Rückfall auf einen '
    + 'befüllten Slot vorgesehen');
  assert.equal(b.angewandt, true, 'kein "kein-buendel"-Kurzschluss — der Aufruf tut noch etwas');
  assert.equal(b.grund, null);
  assert.equal(b.bereiche, 0, 'kein Bündel mehr, aus dem Bereiche kämen — die Zahl bleibt strukturell 0');
  assert.equal(b.felder, 0, 'dieselbe Quelle wie b.bereiche, dieselbe Null');
  assert.equal(b.unterFelder, 0, 'dieselbe Quelle, dieselbe Null');
  assert.equal(b.dokumente, Object.keys(V.AB_WERK_DOKUMENTE_DE.dokumente).length,
    'DAS ist der lebende Teil der Funktion: dokumente kommt unabhängig vom Bündel-Parameter aus '
    + 'AB_WERK_DOKUMENTE_DE — Slot tot, Funktion lebt, an dieser Zahl gemessen statt behauptet');
  assert.deepEqual(b.verworfen, [], 'nichts verworfen');
  assert.equal(V.bereicheAlle().length, 13,
    'der eingebaute Bestand hat weiterhin dreizehn Bereiche — seit Stufe 2 aus ZWEI Quellen '
    + '(Bündel und BEREICH_QUELLEN_EINGEBAUT), darum über bereicheAlle() gezählt und nicht '
    + 'über die Bündel-Liste allein');
  /* Stufe 2 (09.09.2026) — die ZÄHLUNG meint den eingebauten Bestand (270/184), nicht die
     Bündel-Liste. Sie liegt seit dem Umzug in zwei Quellen; die übrigen `V.SEKTOREN`-Stellen
     in dieser Datei bleiben, wo sie sind — sie vergleichen VORHER/NACHHER am selben Objekt
     und meinen dort genau die Bündel-Liste. */
  const z = V.bereicheAlle().reduce((n, s) => { const f = feldZahl(s); return { top: n.top + f.top, unter: n.unter + f.unter }; }, { top: 0, unter: 0 });
  assert.equal(z.top, 271, 'Top-Level-Felder unverändert');
  // 13.09.2026: +3 (ZVR-Abschrift, U2-ADR-410) — der gemessene Stand.
  // 20.09.2026: 270/187 → 271/194 (U2-ADR-424: finance.privateInsurancePolicies +1 Top-Level, sechs
  // Unterfelder daran, dazu garnishmentProtection an finance.accounts) — gemessen, nicht addiert.
  assert.equal(z.unter, 194, 'UnterFelder unverändert');
});

test('[Aufrufer·RUNDWEG] der eigene Bestand als Bündel ergibt denselben Bestand', () => {
  const { V } = ladeKern();
  const vorher = JSON.stringify(V.SEKTOREN.map((s) => ({ id: s.id, sektionen: s.sektionen })));
  const bericht = V.buergermodulBuendelAnwenden(buendelAusBestand(V));
  assert.equal(bericht.angewandt, true, bericht.grund || '');
  /* Stufe 2 (09.09.2026) — aus dem Bündel gelesen statt als Literal. Der Bericht nennt jeden
     Bereich, den das ANGEWANDTE Bündel trägt; seit `wohnen` umgezogen ist, sind das zwölf. */
  /* Stufe 2 (09.09.2026) — ACHTUNG, ANDERE MENGE ALS IM E4-TEST DARÜBER: dort wird das ECHTE
     Bündel gemessen (zwölf Bereiche, seit `wohnen` umgezogen ist). Hier wird ein Bündel aus
     dem LAUFENDEN Bestand gebaut und zurückgespielt — der Rundweg umfasst darum alle
     dreizehn. Beide Zahlen aus ihrer jeweiligen Quelle, nicht als Literal: ein erster Anlauf
     setzte hier versehentlich die Bündel-Grösse ein und machte aus dem Rundweg eine Aussage
     über das Bündel. */
  assert.equal(bericht.bereiche, V.bereicheAlle().length,
    'der Rundweg führt jeden Bereich des laufenden Bestands zurück');
  assert.equal(bericht.felder, 271, 'alle Top-Level-Felder angenommen');
  assert.equal(bericht.unterFelder, 194, 'alle UnterFelder angenommen'); // 13.09.2026: +3, 20.09.2026: +7, s. o.
  assert.deepEqual(bericht.verworfen, [], 'nichts verworfen — die Kennungen stammen aus dem Bestand selbst');
  const nachher = JSON.stringify(V.SEKTOREN.map((s) => ({ id: s.id, sektionen: s.sektionen })));
  assert.equal(nachher, vorher,
    'der Rundweg verändert den Bestand. „Als wäre nichts gewesen" heisst byte-gleich, nicht ähnlich.');
});

test('[Aufrufer·Positivkontrolle] der Rundweg-Vergleich erkennt eine echte Abweichung', () => {
  const { V } = ladeKern();
  const buendel = buendelAusBestand(V);
  /* Ein einziges Feld aus dem Bündel nehmen — der Vergleich MUSS das sehen. */
  const ersterBereich = Object.keys(buendel.bereiche)[0];
  buendel.bereiche[ersterBereich].sektionen[0].felder.pop();
  const vorher = JSON.stringify(V.SEKTOREN.map((s) => ({ id: s.id, sektionen: s.sektionen })));
  V.buergermodulBuendelAnwenden(buendel);
  const nachher = JSON.stringify(V.SEKTOREN.map((s) => ({ id: s.id, sektionen: s.sektionen })));
  assert.notEqual(nachher, vorher, 'ein fehlendes Feld bleibt unbemerkt — der Rundweg-Vergleich misst nichts');
});

test('[Aufrufer·UnterFelder] die 194 UnterFelder landen an ihrem Träger, nicht als Geschwister', () => {
  const { V } = ladeKern();
  V.buergermodulBuendelAnwenden(buendelAusBestand(V));
  let top = 0, unter = 0;
  for (const s of V.bereicheAlle()) { const z = feldZahl(s); top += z.top; unter += z.unter; }
  assert.equal(top, 271, 'landeten UnterFelder flach, stünden hier 465 statt 271 — die Bürgerin sähe 194 Felder zu viel');
  assert.equal(unter, 194, 'die UnterFelder hängen an ihrem Trägerfeld');
});

test('[Aufrufer·Teil-Bündel] ein Bündel ohne einen Bereich leert ihn NICHT', () => {
  const { V } = ladeKern();
  const zielId = V.SEKTOREN[1].id;
  const vorherFremd = JSON.stringify(V.SEKTOREN[0].sektionen);
  const bericht = V.buergermodulBuendelAnwenden(buendelAusBestand(V, [zielId]));
  assert.equal(bericht.bereiche, 1, 'genau ein Bereich angewandt');
  assert.equal(JSON.stringify(V.SEKTOREN[0].sektionen), vorherFremd,
    'ein Bereich, den das Bündel nicht kennt, wurde verändert — ein Teil-Bündel darf nichts leeren, '
    + 'was es nicht ersetzt (Pro/Berufsverband bringen später nur wenige Bereiche mit)');
});

test('[Aufrufer·ROT] der Einlassweg bleibt verriegelt — ein FREMDES Modul wird abgewiesen', () => {
  const { V } = ladeKern();
  /* Dieselbe Sache, die der Aufrufer für das mitgelieferte Bündel tut, über den
     regulären Einlass versucht: ein Fremdmodul, das einen NATIVEN Bereich beansprucht. */
  const fremd = {
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fremdanbieter', sprache: 'de',
    bereiche: { [V.SEKTOREN[0].id]: { label: 'Übernommen', icon: 'folder' } },
  };
  const r = V.bereichsModulPruefen(fremd);
  assert.equal(r.gueltig, false, 'ein fremdes Modul darf einen eingebauten Bereich NIE beanspruchen');
  const gruende = (r.verworfene || []).map((v) => v.grund);
  assert.ok(gruende.indexOf('reserviert') >= 0,
    'der Grund muss `reserviert` sein — steht dort etwas anderes, hat sich die Sperre verschoben: '
    + JSON.stringify(r.verworfene));
});

test('[Aufrufer·ROT] auch aus dem DEPOT wird ein natives Bereichs-Modul abgewiesen — bei jedem Laden', () => {
  const { V } = ladeKern();
  /* Nicht nur beim Import: `_bereichsModuleAusDepotAnmelden` ruft `bereichsModulPruefen`
     je Modul, bei JEDEM Öffnen. Ein handverändertes Alt-Depot kommt darum ebenfalls nicht
     durch — das ist die schärfere Zusage als „heute unmöglich". */
  const d = V.leeresDepot();
  d.bereichsModule = [{
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'handgemacht', sprache: 'de',
    bereiche: { [V.SEKTOREN[0].id]: { label: 'Untergeschoben', icon: 'folder' } },
  }];
  V._bereichsModuleAusDepotAnmelden(d);
  const verworfen = V.BEREICHS_MODUL_VERWORFEN || [];
  assert.ok(verworfen.length > 0, 'das untergeschobene Modul wurde stillschweigend übernommen');
  const gruende = verworfen.map((v) => v.grund);
  assert.ok(gruende.indexOf('reserviert') >= 0 || gruende.indexOf('leer') >= 0,
    'erwartet `reserviert` (die ID) oder `leer` (das Modul bleibt ohne gültigen Bereich übrig), '
    + 'gemessen: ' + JSON.stringify(verworfen));
});
