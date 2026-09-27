'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zuwachs-Melder — eigene Felder von First-Party-Situationen (07.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Auftrag (Sitzung 7f), im Anschluss an den Lücke-2-Riegel
   (U2-ADR-250-Nachtrag, `_wizardZielSituationFeldErlaubt`). Der dortige Riegel
   schützt nur gegen DRITT-Module — das eingebettete, signierte Bündel
   (`BUERGERMODUL_BUENDEL`) darf weiterhin uneingeschränkt eigene Felder in
   seine eigenen Situationen legen (`_situationAusBuendelErzeugen` läuft nie
   durch `wizardsModulPruefen`). Das ist gewollt, nicht die Lücke — aber der
   dritte Speicherraum (`data.situationen[id]`, Namensraum `sit:<id>`) bleibt
   nur harmlos, solange er nicht klammheimlich wächst.

   DIESES WERKZEUG VERBIETET NICHT — ES MELDET. Ein First-Party-Template, das
   ein neues eigenes Feld in eine Situation bringt, ist eine legitime,
   mögliche Entscheidung (s. `situation-als-bereich-implikationen`-Notiz) — sie soll nur NIE stillschweigend passieren.

   DIE GRUNDLINIE IST GEMESSEN, NICHT GETIPPT: `GRUNDLINIE` unten ist der
   Ausdruck von `V.SITUATIONEN[].bloecke[].eintraege[].feld.id`, geladen über
   den echten Kern (nicht aus einem Regex auf die Roh-Zeichenkette — genau der
   Fehler, der die erste Fassung des Lücke-1-Befunds auf „15" statt der
   tatsächlichen 84 brachte, s. Nachtrag dort). Erzeugt mit:

     node -e "const{ladeKern}=require('./tests/load-kern.js');const{V}=ladeKern();
       const p=[];for(const s of V.SITUATIONEN)for(const b of(s.bloecke||[]))
       for(const e of(b.eintraege||[]))if(e&&e.feld&&typeof e.feld==='object'&&e.feld.id)
       p.push(s.id+'.'+e.feld.id);console.log(JSON.stringify(p));"

   Verteilung (zur Einordnung, nicht geprüft): Geburt 10 · Volljährigkeit/Auszug 9 ·
   Hauskauf-oder-Heirat 12 · Notar/Bank 8 · Arzttermin 6 · Krankenhaus 6 ·
   Pflegeheim 7 · Erbfall 26. Zwei Situationen (`einfach-so`,
   `todesfall-uebernahme`) tragen null eigene Felder — nicht in der Liste, weil
   ohne Eintrag nichts zu vergleichen wäre; ein künftiges eigenes Feld dort
   fällt trotzdem auf (`neu` würde die neue Kennung führen).

   DIE VERGLEICHSFUNKTION IST PUR UND EINZELN TESTBAR (kein Kern-Reload nötig
   für den Rot-Beweis) — derselbe Grund, warum `erstePartieBloeckeEintraegePruefen`
   & Co. im Kern selbst pur bleiben: eine gefälschte Grundlinie beweist, dass
   der Melder tatsächlich unterscheidet, nicht nur immer grün ist.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Grundlinie, gemessen 07.09.2026 gegen Kanon 55735151 / eigener Baum (v615) — 84 Paare, 84 → 83 (19.09.2026, vj_versicherungen entfiel, U2-ADR-424).
const GRUNDLINIE = Object.freeze([
  'geburt.geburt_datum', 'geburt.geburt_klinik', 'geburt.geburt_hebamme', 'geburt.geburt_urkunde',
  'geburt.geburt_elterngeld', 'geburt.geburt_kindergeld', 'geburt.geburt_elternzeit',
  'geburt.geburt_kind_kv', 'geburt.geburt_kind_kv_frueher', 'geburt.geburt_vaterschaft',
  'volljaehrig.vj_ummeldung', 'volljaehrig.vj_mietvertrag', 'volljaehrig.vj_konto',
  'volljaehrig.vj_krankenversicherung', 'volljaehrig.vj_krankenversicherung_frueher',
  'volljaehrig.vj_ausbildung', 'volljaehrig.vj_rundfunk',   // vj_versicherungen entfiel U2-ADR-424 (19.09.2026), in finance.privateInsurancePolicies strukturiert
  'volljaehrig.vj_vorsorge',
  'hauskauf.hk_notartermin', 'hauskauf.hk_kaufvertrag', 'hauskauf.hk_finanzierung',
  'hauskauf.hk_grundbuch', 'hauskauf.hk_nebenkosten', 'hauskauf.hk_gebaeudeversicherung',
  'hauskauf.heirat_standesamt', 'hauskauf.heirat_name_frueher', 'hauskauf.heirat_ehevertrag_vorhanden',
  'hauskauf.heirat_ehevertrag_ort', 'hauskauf.heirat_ehevertrag_frueher', 'hauskauf.heirat_ummeldungen',
  'notar.notar_termin', 'notar.notar_anliegen', 'notar.notar_unterlagen', 'notar.notar_urkunde',
  'notar.bank_termin', 'notar.bank_vollmacht', 'notar.bank_schliessfach', 'notar.bank_anliegen',
  'arzt.arzt_termin', 'arzt.arzt_anliegen', 'arzt.arzt_fragen', 'arzt.arzt_mitbringen',
  'arzt.arzt_begleitung', 'arzt.arzt_ergebnis',
  'krankenhaus.kh_termin', 'krankenhaus.kh_grund', 'krankenhaus.kh_tasche', 'krankenhaus.kh_zuhause',
  'krankenhaus.kh_ansprechpartner', 'krankenhaus.kh_entlassung',
  'pflegeheim.ph_einrichtung', 'pflegeheim.ph_einzug', 'pflegeheim.ph_kosten',
  'pflegeheim.ph_heimvertrag', 'pflegeheim.ph_mitnahme', 'pflegeheim.ph_wohnung',
  'pflegeheim.ph_ansprechpartner',
  'erbfall.erb_sterbedatum', 'erbfall.erb_sterbeurkunde', 'erbfall.erb_erbschein',
  'erbfall.erb_erbschein_frueher', 'erbfall.erb_testament_eroeffnung', 'erbfall.erb_nachlassgericht',
  'erbfall.erb_originaldokumente', 'erbfall.erb_stammbuch', 'erbfall.erb_personenstand',
  'erbfall.erb_lebensversicherung', 'erbfall.erb_sterbegeld', 'erbfall.erb_unfallversicherung',
  'erbfall.erb_versicherungen_kuendigen', 'erbfall.erb_konten', 'erbfall.erb_geldanlagen',
  'erbfall.erb_immobilien', 'erbfall.erb_schulden', 'erbfall.erb_schulden_kenntnis',
  'erbfall.erb_wertgegenstaende', 'erbfall.erb_vertraege_kuendigen', 'erbfall.erb_wohnung',
  'erbfall.erb_renten', 'erbfall.erb_digitales', 'erbfall.erb_notar', 'erbfall.erb_steuerberater',
  'erbfall.erb_zu_informieren',
]);

// Reine Funktion, kein Kern-Zugriff — testbar mit gefälschter Eingabe (Rot-Beweis unten).
function situationEigeneFelderVergleichen(live, golden) {
  const liveSet = new Set(live);
  const goldSet = new Set(golden);
  const neu = live.filter((p) => !goldSet.has(p)).sort();
  const verschwunden = golden.filter((p) => !liveSet.has(p)).sort();
  return { gleich: neu.length === 0 && verschwunden.length === 0, neu, verschwunden };
}

// Zieht dieselbe Liste wie der Kopfkommentar beschreibt — WIRKLICHER Ladeweg, kein Regex.
function situationEigeneFelderMessen(V) {
  const paare = [];
  for (const s of V.SITUATIONEN) {
    for (const blk of (s.bloecke || [])) {
      for (const e of (blk.eintraege || [])) {
        if (e && e.feld && typeof e.feld === 'object' && e.feld.id) paare.push(s.id + '.' + e.feld.id);
      }
    }
  }
  return paare;
}

/* ══ Melder gegen den echten Kern ═══════════════════════════════════════ */

test('[Zuwachs-Melder] eigene Situations-Felder des eingebetteten Bündels entsprechen der Grundlinie', () => {
  const { V } = ladeKern();
  const live = situationEigeneFelderMessen(V);
  const r = situationEigeneFelderVergleichen(live, GRUNDLINIE);
  assert.ok(r.gleich,
    'Grundlinie weicht ab — neu: ' + JSON.stringify(r.neu) + ' · verschwunden: ' + JSON.stringify(r.verschwunden)
    + '. Bewusste Entscheidung nötig, keine stille Übernahme: GRUNDLINIE in dieser Datei nachziehen,'
    + ' wenn der Zuwachs gewollt ist.');
});

test('[Zuwachs-Melder] die Grundlinie ist nicht leer und trägt aus jeder betroffenen Situation mindestens ein Feld', () => {
  // Gegenprobe zur Positivkontrolle oben: eine leer gebliebene GRUNDLINIE wäre immer "gleich"
  // zu sich selbst, aber Grundlinie==live ist dann kein Beweis mehr, nur ein Zufall.
  const praefixe = new Set(GRUNDLINIE.map((p) => p.split('.')[0]));
  assert.equal(GRUNDLINIE.length, 83);
  assert.deepEqual([...praefixe].sort(),
    ['arzt', 'erbfall', 'geburt', 'hauskauf', 'krankenhaus', 'notar', 'pflegeheim', 'volljaehrig']);
});

/* ══ Rot-Beweis — der Melder unterscheidet wirklich, ist nicht immer grün ═ */

test('[Zuwachs-Melder·Rot-Beweis] ein sechzehntes … vierundachtzigstes Feld wird als NEU gemeldet', () => {
  const liveGefaelscht = GRUNDLINIE.concat(['geburt.geburt_notfallkontakt']);
  const r = situationEigeneFelderVergleichen(liveGefaelscht, GRUNDLINIE);
  assert.equal(r.gleich, false);
  assert.deepEqual(r.neu, ['geburt.geburt_notfallkontakt']);
  assert.deepEqual(r.verschwunden, []);
});

test('[Zuwachs-Melder·Rot-Beweis] ein verschwundenes Feld wird ebenfalls gemeldet, nicht nur Zuwachs', () => {
  const liveGefaelscht = GRUNDLINIE.filter((p) => p !== 'erbfall.erb_notar');
  const r = situationEigeneFelderVergleichen(liveGefaelscht, GRUNDLINIE);
  assert.equal(r.gleich, false);
  assert.deepEqual(r.neu, []);
  assert.deepEqual(r.verschwunden, ['erbfall.erb_notar']);
});

test('[Zuwachs-Melder·Gegenprobe] dieselbe Grundlinie in anderer Reihenfolge gilt als gleich', () => {
  const liveVerdreht = GRUNDLINIE.slice().reverse();
  const r = situationEigeneFelderVergleichen(liveVerdreht, GRUNDLINIE);
  assert.ok(r.gleich, 'Reihenfolge darf keine Rolle spielen, nur die Menge');
});
