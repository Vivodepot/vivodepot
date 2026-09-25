'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   ANG1 — Abnahmepunkt (2): „die fünf Blätter erscheinen als Ab-Werk-Template ohne
   Feldverlust, belegt gegen die Fassung von vorher."
   ───────────────────────────────────────────────────────────────────────────
   DER BEWEIS GEGEN DIE FASSUNG VON VORHER wurde geführt, als die Blätter noch die Konstante
   `_ANG_SITUATIONEN` im Kern waren (Commit „fuenf DE-Blaetter als Ab-Werk-Vorlage", live aus dem
   Kern verglichen; die englische Vorlage gegen den englischen Kern). Mit dem Abriss der Konstante
   gibt es die Fassung von vorher nicht mehr — sie steht als eingefrorene GRUNDLINIE in
   tests/fixtures/angehoerigen-blaetter-vor-abriss-2026-09-19.json (id, icon, Blöcke, Einträge,
   Titel), am Tag des Abrisses aus dem Kern gelesen.

   REGEL DER GRUNDLINIE: die Vorlagen dürfen WACHSEN, aber nichts daraus verlieren — weder ein
   Blatt noch einen Block noch einen Eintrag, und Titel bleiben nicht leer. `unterschiede()` ist EINE
   Funktion, die in den echten Proben (Liste muss leer sein) UND im Rot-Beweis (Liste muss das
   entfernte Ding NENNEN) läuft — der Rot-Beweis prüft den Vergleich selbst.

   Die Vorlagen sind seit dem Abriss die QUELLE (kein Generator mehr): ein Blatt ändern heißt die
   Datei ändern; nur ein VERLUST gegen die Grundlinie schlägt an.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { gebackenLaden } = require('./lib/gebackenes-produkt-laden.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'angehoerigen-blaetter-vor-abriss-2026-09-19.json'), 'utf8'));
const VORLAGEN = {
  de: JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'angehoerigen-vorlagen', 'vivodepot-angehoerigen-de.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'angehoerigen-vorlagen', 'vivodepot-angehoerigen-en.json'), 'utf8')),
};
const ALLE_IDS = Object.keys(GRUNDLINIE.blaetter).sort();

// L4 (20.09.2026, Code für Code, hier: testament): der Beleg vom Abriss-Tag trägt den Instrument-Typ als
// Pfad-Segment noch in der Form von damals; verglichen wird gegen den heutigen Code. Der Beleg selbst
// bleibt unangetastet, die Übersetzung steht hier, eng auf dieses Segment gefasst.
const L4_TYP_ALT_ZU_NEU = { testament: 'will', vorsorgevollmacht: 'enduring-power-of-attorney', patientenverfuegung: 'living-will', betreuungsverfuegung: 'custodianship-declaration', sorgerechtsverfuegung: 'guardian-nomination', betreuerbestellung: 'custodian-appointment' };
const l4Pfad = (s) => typeof s !== 'string' ? s : s
  .replace(/(^|\|)instrument:([^|:,]+)/, (m, v, t) => v + 'instrument:' + (L4_TYP_ALT_ZU_NEU[t] || t))
  .replace(/liste:([^:|]+):([^:|]+):/, (m, l, t) => 'liste:' + l + ':' + (L4_TYP_ALT_ZU_NEU[t] || t) + ':');

// Liste ALLER Verluste einer Vorlagen-Situation gegen ihr Blatt der Grundlinie — leer heißt: nichts verloren.
function unterschiede(id, grund, vSit) {
  const raus = [];
  if (!vSit) return ['Situation ' + id + ' fehlt ganz in der Vorlage'];
  if (vSit.icon !== grund.icon) raus.push('icon: Grundlinie ' + grund.icon + ' / Vorlage ' + vSit.icon);
  if (typeof vSit.titel !== 'string' || !vSit.titel.trim()) raus.push('Situation ohne Titel: ' + id);
  const vBloecke = vSit.bloecke || [];
  for (const gBlock of grund.bloecke) {
    const vBlock = vBloecke.find((b) => b.id === gBlock.id);
    if (!vBlock) { raus.push('Block fehlt: ' + gBlock.id); continue; }
    if (typeof vBlock.titel !== 'string' || !vBlock.titel.trim()) raus.push('Block ohne Titel: ' + gBlock.id);
    const vorhanden = (vBlock.eintraege || []).map((e) => e.quelle + '|' + e.feld);
    for (const f of gBlock.eintraege) if (!vorhanden.includes(l4Pfad(f))) raus.push('Feld fehlt in Block ' + gBlock.id + ': ' + f);
  }
  return raus;
}

describe('[Angehörigen-Vorlagen] kein Feldverlust gegen die Grundlinie vom Tag des Abrisses', () => {
  test('die Grundlinie ist nicht leer und trägt fünf Blätter (Vorbedingung)', () => {
    assert.equal(ALLE_IDS.length, 5);
    const eintraege = ALLE_IDS.flatMap((id) => GRUNDLINIE.blaetter[id].bloecke.flatMap((b) => b.eintraege));
    assert.ok(eintraege.length > 60, 'die Grundlinie trägt die Einträge, nicht nur die Blatt-IDs: ' + eintraege.length);
  });

  for (const sprache of ['de', 'en']) {
    test('[' + sprache + '] alle fünf Blätter stehen in der Vorlage, jedes Feld und jeder Block ist noch da', () => {
      const v = VORLAGEN[sprache];
      assert.deepEqual(ALLE_IDS.filter((id) => !v.situationen[id]), [], 'kein Blatt darf fehlen');
      for (const id of ALLE_IDS) {
        const diff = unterschiede(id, GRUNDLINIE.blaetter[id], v.situationen[id]);
        assert.deepEqual(diff, [], 'Verlust in ' + id + ' (' + sprache + '): ' + diff.join('; '));
      }
    });
  }

  test('DE- und EN-Vorlage tragen dieselben Blätter, Blöcke und Einträge (nur der Wortlaut unterscheidet sich)', () => {
    const form = (v) => JSON.stringify(Object.keys(v.situationen).sort().map((id) => [id, v.situationen[id].icon,
      (v.situationen[id].bloecke || []).map((b) => [b.id, (b.eintraege || []).map((e) => e.quelle + '|' + e.feld)])]));
    assert.equal(form(VORLAGEN.en), form(VORLAGEN.de));
  });

  test('[Rot-Beweis] der Vergleich selbst fängt ein entferntes Feld — und benennt es', () => {
    const kaputt = JSON.parse(JSON.stringify(VORLAGEN.de));
    const block = kaputt.situationen.krankenhausakut.bloecke.find((b) => b.id === 'aus-gesundheit');
    const entfernt = block.eintraege.pop();
    const diff = unterschiede('krankenhausakut', GRUNDLINIE.blaetter.krankenhausakut, kaputt.situationen.krankenhausakut);
    assert.ok(diff.some((d) => d.includes('Feld fehlt in Block aus-gesundheit') && d.includes(entfernt.feld)),
      'der Vergleich muss das entfernte Feld NENNEN: ' + JSON.stringify(diff));
  });

  test('[Rot-Beweis] der Vergleich fängt einen entfernten Block, ein leeres Titelfeld und eine entfernte Situation', () => {
    const kaputt = JSON.parse(JSON.stringify(VORLAGEN.de));
    kaputt.situationen.beerdigung.bloecke = kaputt.situationen.beerdigung.bloecke.filter((b) => b.id !== 'bestattung');
    assert.ok(unterschiede('beerdigung', GRUNDLINIE.blaetter.beerdigung, kaputt.situationen.beerdigung).some((d) => d.includes('Block fehlt: bestattung')));
    kaputt.situationen.pflegeheimakut.titel = '  ';
    assert.ok(unterschiede('pflegeheimakut', GRUNDLINIE.blaetter.pflegeheimakut, kaputt.situationen.pflegeheimakut).some((d) => d.includes('ohne Titel')));
    assert.deepEqual(unterschiede('beerdigung', GRUNDLINIE.blaetter.beerdigung, undefined), ['Situation beerdigung fehlt ganz in der Vorlage']);
  });

  test('[Rot-Beweis] eine WACHSENDE Vorlage bleibt grün — nur Verlust schlägt an', () => {
    const waechst = JSON.parse(JSON.stringify(VORLAGEN.de));
    waechst.situationen.krankenhausakut.bloecke.push({ id: 'neu', titel: 'Neu', eintraege: [{ quelle: 'identity', feld: 'givenName' }] });
    assert.deepEqual(unterschiede('krankenhausakut', GRUNDLINIE.blaetter.krankenhausakut, waechst.situationen.krankenhausakut), []);
  });

  for (const sprache of ['de', 'en']) {
    test('[' + sprache + '] die Vorlage besteht angehoerigenVorlagePruefen() unverändert (kein verworfener Eintrag)', () => {
      const { V } = ladeKern();
      const geprueft = V.angehoerigenVorlagePruefen(VORLAGEN[sprache]);
      assert.equal(geprueft.gueltig, true, JSON.stringify(geprueft.verworfene));
      assert.equal(geprueft.verworfene.length, 0, 'kein Eintrag darf beim Einlassen verworfen werden');
      assert.equal(geprueft.situationen.length, 5);
    });
  }
});

/* ── Das Einbacken selbst: ab Werk gesät, ohne Depot-Inhalt ──────────────────────────────
   Ein Depot, das die Vorlage NIE per Datei mitgebracht hat, trägt sie trotzdem — sie steht im
   gebackenen Produkt. Alle vier Produkte tragen sie: DE mit deutschem, EN mit englischem Wortlaut
   (Rechtsraum bleibt DE). */
describe('[Angehörigen-Vorlagen] Einbacken — alle vier Produkte tragen sie ab Werk', () => {
  for (const [slug, sprache] of [['privat-de', 'de'], ['pro-de', 'de'], ['privat-en', 'en'], ['pro-en', 'en']]) {
    test('[' + slug + '] AB_WERK_ANGEHOERIGEN_QUELLEN trägt die ' + sprache.toUpperCase() + '-Vorlage; angehoerigenSituationenAlle() liefert die fünf Blätter', async () => {
      const { V } = await gebackenLaden(slug);
      assert.equal(V.AB_WERK_ANGEHOERIGEN_QUELLEN.length, 1, 'genau eine eingebackene Vorlage');
      assert.equal(V.AB_WERK_ANGEHOERIGEN_QUELLEN[0].sprache, sprache);
      assert.equal(V.AB_WERK_ANGEHOERIGEN_QUELLEN[0].rechtsraum, 'DE');
      // Ein frisches Depot OHNE eigene Vorlagen — die ab Werk gesäten kommen trotzdem.
      V._angehoerigenVorlagenAusDepotAnmelden({ angehoerigenVorlagenModule: [] });
      const alle = V.angehoerigenSituationenAlle();
      assert.deepEqual(alle.map((s) => s.id).sort(), ALLE_IDS);
      for (const s of alle) {
        const diff = unterschiede(s.id, GRUNDLINIE.blaetter[s.id], { icon: s.icon, titel: s.titel, bloecke: s.bloecke });
        assert.deepEqual(diff, [], 'Verlust in ' + s.id + ' (' + slug + '): ' + diff.join('; '));
      }
    });
  }
});
