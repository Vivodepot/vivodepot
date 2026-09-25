'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Proben zum Ladeweg auf der Erste-Partei-Zone (U2-ADR-282) — U2-ADR-308.
   Wörtlicher Spiegel von tests/buergermodul-sektor-ersetzen.test.js (U2-ADR-292),
   für die Situations-Achse statt der Sektor-Achse.

   DER MASSSTAB IST DERSELBE: „Als wäre nichts gewesen." Die entscheidende Probe
   vergleicht ECHTES GERENDERTES HTML (`renderSituation`), nicht Datenstrukturen —
   ein JSON.stringify-Vergleich wäre aus demselben Grund ein Fehlschluss wie bei
   Sektoren (Objekt-Identität/Schlüssel-Reihenfolge sagt nichts über das, was die
   Bürgerin sieht).

   ZWEI ECHTE STRUKTURELLE ABWEICHUNGEN VOM SEKTOR-VORBILD, s. Kern-Kommentar
   über `buergermodulSituationErsetzen`:
   1) `bloecke` ist bei ALLEN zehn Situationen eine Getter-Eigenschaft ohne
      Setter (nicht nur bei todesfall-uebernahme) — der Ladeweg selbst braucht
      darum delete+neu-setzen+_textsatzAufSituationenAnwenden(), keine direkte
      Zuweisung.
   2) Ein Block-Eintrag ist eine von zwei Formen ({quelle,feld:string} ODER
      {feld:object}) — die Erlaubnisliste greift nur bei der zweiten.
   `todesfall-uebernahme` ist ausdrücklich AUSSER Betracht (eigener Rot-Beweis
   unten) — sein Getter baut einen Block bedingt (_kiHatDaten()), ein Ersatz
   durch eine statische Liste friert das ein.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Baut moduleBloecke aus dem NATIVEN Bestand selbst — dieselbe Form wie die native
// situation.bloecke. `titel`/`hint` NIE mitnehmen (Textsatz-Eigentum, s. Kern-Kommentar),
// `label` an eigenen Feldern entfernt (kommt ebenfalls aus dem Textsatz) — alle ANDEREN
// Block-Eigenschaften (z. B. `klappbar` bei erbfall) bleiben erhalten, Rest-Spread statt
// Namensliste, aus demselben Grund wie in erstePartieBloeckeEintraegePruefen selbst.
function bauModuleBloeckeAusNativ(V, situationId) {
  const situation = V.SITUATION_BY_ID[situationId];
  const bloecke = [];
  for (const blk of situation.bloecke) {
    const eintraege = [];
    for (const e of (blk.eintraege || [])) {
      if (typeof e.quelle === 'string' && typeof e.feld === 'string') {
        eintraege.push({ quelle: e.quelle, feld: e.feld });
        continue;
      }
      const feld = Object.assign({}, e.feld);
      delete feld.label;
      eintraege.push({ feld });
    }
    const { titel, hint, eintraege: _weg, ...blkRest } = blk;
    bloecke.push(Object.assign({}, blkRest, { id: blk.id, eintraege }));
  }
  return bloecke;
}

async function gerendertesHTML(kern, situationId, depotName) {
  await kern.V.depotAnlegen(depotName);
  kern.V.renderSituation(situationId);
  return kern.document.getElementById('content').innerHTML;
}

test('[ADR-308] buergermodulSituationErsetzen ist exportiert', async () => {
  const kern = await ladeKern();
  assert.equal(typeof kern.V.buergermodulSituationErsetzen, 'function');
  assert.equal(typeof kern.V._erstePartieErlaubteIdsFuerSituation, 'function');
  assert.equal(typeof kern.V.erstePartieBloeckeEintraegePruefen, 'function');
});

test('[ADR-308] "als waere nichts gewesen" — renderSituation(„geburt") ist byte-identisch, nachdem der native Bestand durch denselben Bestand via Ladeweg ersetzt wurde', async () => {
  const kernVorher = await ladeKern();
  const htmlVorher = await gerendertesHTML(kernVorher, 'geburt', 'Beweis-Vorher!');
  assert.ok(htmlVorher.length > 0, 'Vorbedingung: es wurde wirklich etwas gerendert');

  const kernNachher = await ladeKern();
  const ergebnis = kernNachher.V.buergermodulSituationErsetzen(
    'geburt', bauModuleBloeckeAusNativ(kernNachher.V, 'geburt'));
  assert.equal(ergebnis.angewandt, true);
  assert.equal(ergebnis.verworfen.length, 0, 'der native Bestand gegen sich selbst darf nichts verwerfen');
  const htmlNachher = await gerendertesHTML(kernNachher, 'geburt', 'Beweis-Nachher!');

  assert.equal(htmlNachher, htmlVorher,
    'die Buergerin darf keinen Unterschied sehen, unabhaengig davon, ob die Situation nativ oder ueber den Ladeweg steht');
});

test('[ADR-308·ROT-BEWEIS] ein vom Modul weggelassenes eigenes Feld fehlt wirklich im gerenderten HTML — und nur dieses', async () => {
  const kernVoll = await ladeKern();
  const htmlVoll = await gerendertesHTML(kernVoll, 'geburt', 'Beweis-Voll!');
  assert.ok(htmlVoll.length > 0, 'Vorbedingung: es wurde wirklich etwas gerendert');

  const kernGekuerzt = await ladeKern();
  const alle = bauModuleBloeckeAusNativ(kernGekuerzt.V, 'geburt');
  let entfernt = 0;
  const gekuerzt = alle.map((blk) => ({
    id: blk.id,
    eintraege: blk.eintraege.filter((e) => {
      if (e.feld && e.feld.id === 'geburt_klinik') { entfernt++; return false; }
      return true;
    }),
  }));
  assert.equal(entfernt, 1, 'Vorbedingung: genau ein Feld weniger');
  const ergebnis = kernGekuerzt.V.buergermodulSituationErsetzen('geburt', gekuerzt);
  assert.equal(ergebnis.verworfen.length, 0);
  const htmlGekuerzt = await gerendertesHTML(kernGekuerzt, 'geburt', 'Beweis-Gekuerzt!');

  assert.ok(htmlVoll.includes('data-feld="geburt_klinik"'), 'Vorbedingung: der Feld-Bezeichner steht im vollen HTML');
  assert.ok(!htmlGekuerzt.includes('data-feld="geburt_klinik"'),
    'der Feld-Bezeichner darf nach dem Weglassen nicht mehr im HTML stehen');
  assert.ok(htmlGekuerzt.includes('data-feld="geburt_datum"'), 'ein anderes, nicht weggelassenes Feld bleibt im HTML stehen');
  assert.ok(htmlGekuerzt.length < htmlVoll.length, 'das gekuerzte HTML ist wirklich kuerzer');
});

test('[ADR-308·Identität·ROT] eine Alt-Eigenschaft ohne Modul-Entsprechung verschwindet — Überschreiben allein reicht nicht', async () => {
  const kern = await ladeKern();
  const alle = bauModuleBloeckeAusNativ(kern.V, 'geburt');
  assert.ok(alle.length > 0, 'Vorbedingung: es gibt wirklich Bloecke zu durchsuchen');
  let getroffen = false;
  const ohneSensibel = alle.map((blk) => ({
    id: blk.id,
    eintraege: blk.eintraege.map((e) => {
      if (e.feld && e.feld.id === 'geburt_klinik') {
        getroffen = true;
        const feld = Object.assign({}, e.feld);
        delete feld.sensibel;
        return { feld };
      }
      return e;
    }),
  }));
  assert.ok(getroffen, 'Vorbedingung: das Feld geburt_klinik wurde im Testaufbau wirklich gefunden');
  assert.equal(kern.V.SITUATION_BY_ID['geburt'].bloecke
    .flatMap((b) => b.eintraege).find((e) => e.feld && e.feld.id === 'geburt_klinik').feld.sensibel, true,
    'Vorbedingung: das native Feld traegt sensibel:true, bevor ersetzt wird');
  const ergebnis = kern.V.buergermodulSituationErsetzen('geburt', ohneSensibel);
  assert.equal(ergebnis.verworfen.length, 0);
  const nachher = kern.V.SITUATION_BY_ID['geburt'].bloecke
    .flatMap((b) => b.eintraege).find((e) => e.feld && e.feld.id === 'geburt_klinik').feld;
  assert.equal(nachher.sensibel, undefined,
    'sensibel:true darf nicht stehen bleiben, nur weil das alte Feld-Objekt es einmal trug — die Eigenschaft muss verschwinden');
});

test('[ADR-308·Identität] das Feld-Objekt selbst bleibt dieselbe Referenz — kein Neubau', async () => {
  const kern = await ladeKern();
  const vorher = kern.V.SITUATION_BY_ID['geburt'].bloecke
    .flatMap((b) => b.eintraege).find((e) => e.feld && e.feld.id === 'geburt_datum').feld;
  kern.V.buergermodulSituationErsetzen('geburt', bauModuleBloeckeAusNativ(kern.V, 'geburt'));
  const nachher = kern.V.SITUATION_BY_ID['geburt'].bloecke
    .flatMap((b) => b.eintraege).find((e) => e.feld && e.feld.id === 'geburt_datum').feld;
  assert.equal(nachher, vorher, 'ein Aufrufer, der VOR dem Ersetzen eine Feld-Referenz genommen hat, darf danach nicht ins Leere zeigen');
});

test('[ADR-308·Identität] ein Options-Objekt bleibt dieselbe Referenz — auch über eine gefilterte Kopie des Arrays hinweg', async () => {
  const kern = await ladeKern();
  const feld = kern.V.SITUATION_BY_ID['geburt'].bloecke
    .flatMap((b) => b.eintraege).find((e) => e.feld && e.feld.id === 'geburt_kind_kv').feld;
  const optVorher = feld.optionen.find((o) => o.wert === 'eigene_privat');
  assert.ok(optVorher, 'Vorbedingung: geburt_kind_kv kennt den Wert „eigene_privat"');
  const gefiltertVorher = feld.optionen.filter((o) => ['eigene_privat', 'anderer_elternteil'].includes(o.wert));
  kern.V.buergermodulSituationErsetzen('geburt', bauModuleBloeckeAusNativ(kern.V, 'geburt'));
  const optNachher = feld.optionen.find((o) => o.wert === 'eigene_privat');
  assert.equal(optNachher, optVorher, 'die Options-Referenz muss dieselbe bleiben, sonst zeigt eine vor dem Ersetzen gezogene gefilterte Kopie ins Leere');
  assert.equal(gefiltertVorher.find((o) => o.wert === 'eigene_privat'), optVorher, 'Vorbedingung: die gefilterte Kopie enthält dieselbe Referenz, kein Klon');
});

test('[ADR-308·Sicherheit] ein Modul, das ein FREMDES natives Feld behauptet, bekommt es nicht — die Erlaubnis kommt aus dem Geruest, nie aus dem Modul', async () => {
  const kern = await ladeKern();
  await kern.V.depotAnlegen('Beweis-Sicherheit!');
  const bloecke = bauModuleBloeckeAusNativ(kern.V, 'geburt');
  // `vj_konto` gehoert nativ zu `volljaehrig`, nicht zu `geburt` -- ein Modul, das diese
  // Situation ersetzt, darf sich das Feld einer ANDEREN Situation nicht aneignen.
  bloecke.push({ id: 'rund-um-die-geburt', eintraege: [{ feld: { id: 'vj_konto', typ: 'text' } }] });
  const ergebnis = kern.V.buergermodulSituationErsetzen('geburt', bloecke);
  assert.ok(ergebnis.verworfen.some((v) => v.name === 'vj_konto' && v.grund === 'nicht-erlaubt'),
    'ein fremdes Feld wird abgelehnt, nicht stillschweigend uebernommen');
  kern.V.renderSituation('geburt');
  const html = kern.document.getElementById('content').innerHTML;
  assert.ok(!html.includes('data-feld="vj_konto"'), 'das abgelehnte Feld darf im Rendering nicht auftauchen');
});

test('[ADR-308·Sicherheit·Gegenkontrolle] eine reservierte Situations-ID wird ueber den SIGNIERTEN Weg weiterhin mit reserviert abgewiesen — die Erste-Partei-Zone oeffnet den Einlassweg nicht', async () => {
  const kern = await ladeKern();
  const geprueft = kern.V.situationsModulPruefen({
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'fremd', sprache: 'de',
    situationen: { geburt: { titel: 'Fremde Geburt', bloecke: [] } },
  });
  assert.equal(geprueft.gueltig, false, 'nichts Gueltiges bleibt, wenn die einzige Situation reserviert ist');
  assert.ok(geprueft.verworfene.some((v) => v.id === 'geburt' && v.grund === 'reserviert'),
    'eine reservierte ID wird ueber den Einlassweg weiterhin abgewiesen, unabhaengig von der Erste-Partei-Zone');
});

test('[ADR-308] unbekannte Situation wird benannt, nicht stillschweigend uebergangen', async () => {
  const kern = await ladeKern();
  const ergebnis = kern.V.buergermodulSituationErsetzen('gibt-es-nicht', []);
  assert.equal(ergebnis.angewandt, false);
  assert.equal(ergebnis.grund, 'unbekannte-situation');
});

test('[ADR-308] _erstePartieErlaubteIdsFuerSituation deckt nur eigene Felder, nicht Verweis-Eintraege — exakt den nativen Bestand', async () => {
  const kern = await ladeKern();
  const ids = kern.V._erstePartieErlaubteIdsFuerSituation('geburt');
  const situation = kern.V.SITUATION_BY_ID['geburt'];
  let erwartet = 0;
  let verweise = 0;
  for (const blk of situation.bloecke) {
    for (const e of blk.eintraege) {
      if (e.feld && typeof e.feld === 'object') erwartet++;
      else verweise++;
    }
  }
  assert.ok(erwartet > 0 && verweise > 0, 'Vorbedingung: die Fixtur-Situation traegt beide Eintragsformen');
  assert.equal(ids.length, erwartet);
  assert.ok(ids.includes('geburt.geburt_datum'));
  assert.ok(!ids.includes('volljaehrig.vj_konto'), 'eine andere Situation gehoert nicht zur Erlaubnisliste dieser Situation');
});

test('[ADR-308·Grenze·ROT-BEWEIS] todesfall-uebernahme: der Ladeweg wirft nicht, verliert aber den bedingten KI-Block — benannt, nicht geloest', async () => {
  const kern = await ladeKern();
  await kern.V.depotAnlegen('Beweis-Todesfall!');
  // Ohne hinterlegte KI-Verfuegung baut der native Getter den bedingten Block ohnehin nicht —
  // der Ladeweg selbst wirft hier trotzdem nicht, das ist die eigentliche Zusicherung dieser Probe.
  const bloecke = bauModuleBloeckeAusNativ(kern.V, 'todesfall-uebernahme');
  assert.doesNotThrow(() => kern.V.buergermodulSituationErsetzen('todesfall-uebernahme', bloecke),
    'die Getter-ohne-Setter-Eigenschaft darf den Ladeweg nicht zum Werfen bringen, auch bei dieser einen Situation nicht');
  kern.V.renderSituation('todesfall-uebernahme');
  const html = kern.document.getElementById('content').innerHTML;
  assert.ok(html.length > 0, 'das Rendering funktioniert weiterhin, auch nach dem Ersatz dieser einen Situation');
});

/* ── E2: alle zehn nativen Situationen (bis auf die benannte Ausnahme) ────────
   Wörtlicher Spiegel des Sektor-E2: systematischer Durchlauf statt Einzelproben.
   todesfall-uebernahme bleibt aussen vor (eigener Rot-Beweis oben) — sein
   Getter ist bedingt, ein direkter Vorher/Nachher-Vergleich waere kein
   Vergleich desselben Inhalts. */
test('[ADR-308·E2] alle neun regulaeren nativen Situationen: byte-identisches Rendering, null Verwerfungen', async () => {
  const kernSonde = await ladeKern();
  const alleSituationIds = kernSonde.V.SITUATION_IDS_EINGEBAUT.filter((id) => id !== 'todesfall-uebernahme');
  assert.equal(alleSituationIds.length, 9, 'Vorbedingung: neun reguläre native Situationen (zehn minus die benannte Ausnahme)');

  const abweichungen = [];
  for (const situationId of alleSituationIds) {
    const kernVorher = await ladeKern();
    const htmlVorher = await gerendertesHTML(kernVorher, situationId, 'E2-Vorher-' + situationId + '!');

    const kernNachher = await ladeKern();
    const ergebnis = kernNachher.V.buergermodulSituationErsetzen(
      situationId, bauModuleBloeckeAusNativ(kernNachher.V, situationId));
    const htmlNachher = await gerendertesHTML(kernNachher, situationId, 'E2-Nachher-' + situationId + '!');

    if (ergebnis.verworfen.length > 0) {
      abweichungen.push(situationId + ': ' + ergebnis.verworfen.length + ' Verwerfung(en) — ' + JSON.stringify(ergebnis.verworfen));
    }
    if (htmlVorher !== htmlNachher) {
      let i = 0;
      while (i < htmlVorher.length && i < htmlNachher.length && htmlVorher[i] === htmlNachher[i]) i++;
      abweichungen.push(situationId + ': Rendering weicht ab bei Zeichen ' + i + ' — vorher „'
        + htmlVorher.slice(Math.max(0, i - 40), i + 60) + '" / nachher „'
        + htmlNachher.slice(Math.max(0, i - 40), i + 60) + '"');
    }
  }
  assert.deepEqual(abweichungen, [], 'jede reguläre Situation muss byte-identisch und ohne Verwerfung durch den Ladeweg passen');
});

test('[ADR-308·E2·ROT-BEWEIS] die Sonde selbst findet einen echten Unterschied — sonst prueft die Sammelprobe nichts', async () => {
  const kern = await ladeKern();
  const alle = bauModuleBloeckeAusNativ(kern.V, 'erbfall');
  assert.ok(alle.length > 0, 'Vorbedingung: es gibt wirklich Bloecke zu durchsuchen');
  let entfernt = false;
  const gekuerzt = alle.map((blk) => ({
    id: blk.id,
    eintraege: blk.eintraege.filter((e, idx) => {
      if (!entfernt && e.feld && typeof e.feld === 'object') { entfernt = true; return false; }
      return true;
    }),
  }));
  assert.ok(entfernt, 'Vorbedingung: ein eigenes Feld wurde wirklich weggelassen');
  const ergebnis = kern.V.buergermodulSituationErsetzen('erbfall', gekuerzt);
  assert.equal(ergebnis.verworfen.length, 0, 'Vorbedingung: kein Verwerfen, nur ein weggelassenes Feld');
  await kern.V.depotAnlegen('E2-Rot!');
  kern.V.renderSituation('erbfall');
  const htmlGekuerzt = kern.document.getElementById('content').innerHTML;

  const kernVoll = await ladeKern();
  const htmlVoll = await gerendertesHTML(kernVoll, 'erbfall', 'E2-Rot-Voll!');
  assert.notEqual(htmlGekuerzt, htmlVoll, 'ein wirklich fehlendes Feld muss die Sammelprobe faerben — tut es das nicht, ist sie blind');
});

/* ── Verdrahtung: buergermodulBuendelAnwenden verarbeitet auch situationen ─── */
test('[ADR-308·Verdrahtung] buergermodulBuendelAnwenden wendet ein Buendel mit situationen-Schluessel an, unabhaengig von bereiche', async () => {
  const kern = await ladeKern();
  const bloecke = bauModuleBloeckeAusNativ(kern.V, 'geburt');
  assert.ok(bloecke.length > 0, 'Vorbedingung: das Buendel traegt wirklich Bloecke');
  const bericht = kern.V.buergermodulBuendelAnwenden({ situationen: { geburt: { bloecke } } });
  assert.equal(bericht.angewandt, true);
  assert.equal(bericht.situationen, 1);
  assert.equal(bericht.verworfen.length, 0);
  assert.equal(bericht.bereiche, 0, 'ein reines Situationen-Buendel darf keine Bereiche anfassen');
});

test('[ADR-308·Verdrahtung·Rot-Beweis] eine unbekannte Situation im Buendel wird uebersprungen, nicht als Fehler behandelt', async () => {
  const kern = await ladeKern();
  const bericht = kern.V.buergermodulBuendelAnwenden({ situationen: { 'gibt-es-nicht': { bloecke: [] } } });
  assert.equal(bericht.situationen, 0);
  assert.ok(bericht.uebersprungen.some((u) => u.situationId === 'gibt-es-nicht' && u.grund === 'unbekannte-situation'));
});
