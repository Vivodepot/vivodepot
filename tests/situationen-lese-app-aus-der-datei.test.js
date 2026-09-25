'use strict';
/* SIT2a — die Situationsblätter der Lese-App kommen aus der DATEI, nicht aus einer Kopie im Gerüst.
   (1) Feldverlust-Beweis: die zehn Situationen, die eine Datei aus dem Standard-Produkt mitbringt, tragen
       alles, was der bisherige generierte Block trug (tests/fixtures/situationen-lesen-vor-abriss-2026-09-19.json):
       Verlust verboten, Wachstum erlaubt.
   (2) Was im Template steht, sieht die Empfängerin: eine Situation aus einem Modul der Datei erscheint,
       eine im Template geänderte ebenfalls.
   (3) Vertrauen wie bei den Angehörigen-Blättern: ohne belegte Signatur „Nicht geprüfte Vorlage", kann kein
       Mitschrift-Blatt ersetzen; verifiziert darf es.
   (4) Ohne Datei-Inhalt zeigt das Gerüst keine Situation. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const GRUND = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'situationen-lesen-vor-abriss-2026-09-19.json'), 'utf8')).situationen;
const depot = (extra) => Object.assign({ schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {} }, extra || {});
function lese(extra) {
  const { V } = ladeLesen({ ohneSaat: true });
  const obj = depot(extra);
  V._foldVollmachtenLesen(obj);
  V.setData(obj);
  return V;
}
const eintragBlatt = (titel, dokumenttypen) => ({ titel, icon: 'star', bloecke: [{ id: 'b', titel: 'Block', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] });
const MODUL = (herkunft, situationen, extra) => Object.assign({ modulTyp: 'situation', moduleVersion: 1, herkunft, sprache: 'de', situationen }, extra || {});

/* ABSICHTLICH ENTFALLEN, namentlich und mit Grund (20.09.2026, U2-ADR-424): der Freitext `vj_versicherungen` der
   Situation „Volljährigkeit" ist in das strukturierte Listenfeld finance.privateInsurancePolicies gewandert. Die Grundlinie
   bleibt der unveränderte Schnappschuss des früheren Blocks; das Entfallene steht HIER, sichtbar neben dem Vergleich, und
   nur so: jedes andere fehlende Feld, jeder fehlende Block, jeder andere Titel bleibt ein Verlust und macht die Probe rot
   (s. [Feldverlust · Rot-Beweis Positivliste]). Der Zähler der undeklarierten Verluste bleibt bei 0. */
const ENTFALLENE_FELDER = Object.freeze({
  volljaehrig: Object.freeze({ felder: Object.freeze(['vj_versicherungen']),
    grund: 'U2-ADR-424: Freitext entfernt, Inhalt in finance.privateInsurancePolicies strukturiert' }),
});
function grundOhneEntfallene(grund) {
  return JSON.parse(JSON.stringify(grund)).map((sit) => {
    const e = ENTFALLENE_FELDER[sit.id];
    if (!e) return sit;
    for (const blk of (sit.bloecke || [])) {
      blk.eintraege = (blk.eintraege || []).filter((x) => !(x && x.feld && e.felder.includes(x.feld.id)));
    }
    return sit;
  });
}

/* Auftrag „Paragraphen raus" (22.09.2026, Nr. 56, bestätigt) — dieselbe Form der
   Ausnahme wie bei ENTFALLENE_FELDER: die Grundlinie (`situationen-lesen-vor-abriss-2026-09-19.json`)
   bleibt der unveränderte Schnappschuss von vor dem Abriss, die Wortlaut-Pflege steht HIER, sichtbar
   neben dem Vergleich. Alt: "Eine Vollmacht gilt im Zweifel auch über den Tod hinaus — sie erlischt
   nicht automatisch mit dem Tod (§ 672 Satz 1, § 168 Satz 1 BGB). …" Neu: "Eine Vollmacht kann auch
   über den Tod hinaus gelten. Ob das bei Ihrer Vollmacht so ist, ergibt sich zunächst aus ihrem
   Wortlaut; steht dort nichts dazu, lassen Sie es anwaltlich klären. …" Eng gefasst: NUR dieser eine,
   wortgleich abgegrenzte Satzblock wird in der Grundlinie auf die neue Fassung gehoben; jede andere
   Abweichung bleibt ein Verlust und macht die Probe weiter rot. */
const VOLLMACHT_TOD_ALT = 'Eine Vollmacht gilt im Zweifel auch über den Tod hinaus — sie erlischt '
  + 'nicht automatisch mit dem Tod (§ 672 Satz 1, § 168 Satz 1 BGB). Eine ausdrückliche Beschränkung '
  + 'auf die Lebzeit ist möglich, aber die Ausnahme, nicht die Regel. Bevollmächtigte und Erben sind '
  + 'rechtlich unterschiedliche Rollen: eine Vollmacht macht niemanden automatisch zum Erben, und ein '
  + 'Erbe hat nicht automatisch Zugriffsrechte zu Lebzeiten der verstorbenen Person. Dieser Text '
  + 'ersetzt keine Rechtsberatung.';
const VOLLMACHT_TOD_NEU = 'Eine Vollmacht kann auch über den Tod hinaus gelten. Ob das bei Ihrer '
  + 'Vollmacht so ist, ergibt sich zunächst aus ihrem Wortlaut; steht dort nichts dazu, lassen Sie es '
  + 'anwaltlich klären. Bevollmächtigte und Erben sind zwei verschiedene Rollen. Dieser Text ersetzt '
  + 'keine Rechtsberatung.';
function mitParagraphenRausGehoben(grund) {
  return JSON.parse(JSON.stringify(grund).split(VOLLMACHT_TOD_ALT).join(VOLLMACHT_TOD_NEU));
}

/* `soll` (Grundlinie) muss in `ist` enthalten sein, tief; Arrays Element für Element, Wachstum am Ende erlaubt. */
// L4 (20.09.2026, Code für Code, hier: testament): der Beleg vom Abriss-Tag trägt den Instrument-Typ als
// Pfad-Segment noch in der Form von damals; verglichen wird gegen den heutigen Code. Der Beleg selbst
// bleibt unangetastet, die Übersetzung steht hier, eng auf dieses Segment gefasst.
const L4_TYP_ALT_ZU_NEU = { testament: 'will', vorsorgevollmacht: 'enduring-power-of-attorney', patientenverfuegung: 'living-will', betreuungsverfuegung: 'custodianship-declaration', sorgerechtsverfuegung: 'guardian-nomination', betreuerbestellung: 'custodian-appointment' };
const l4Pfad = (s) => typeof s !== 'string' ? s : s
  .replace(/(^|\|)instrument:([^|:,]+)/, (m, v, t) => v + 'instrument:' + (L4_TYP_ALT_ZU_NEU[t] || t))
  .replace(/liste:([^:|]+):([^:|]+):/, (m, l, t) => 'liste:' + l + ':' + (L4_TYP_ALT_ZU_NEU[t] || t) + ':');
function verluste(soll, ist, pfad, aus) {
  if (Array.isArray(soll)) {
    if (!Array.isArray(ist)) { aus.push(pfad + ' fehlt (Liste)'); return aus; }
    if (ist.length < soll.length) aus.push(pfad + ' hat weniger Elemente: ' + ist.length + ' < ' + soll.length);
    soll.forEach((x, i) => verluste(x, ist[i], pfad + '[' + i + ']', aus));
  } else if (soll && typeof soll === 'object') {
    if (!ist || typeof ist !== 'object') { aus.push(pfad + ' fehlt'); return aus; }
    for (const k of Object.keys(soll)) verluste(soll[k], ist[k], pfad + '.' + k, aus);
  } else if (l4Pfad(soll) !== ist) aus.push(pfad + ': ' + JSON.stringify(soll) + ' ≠ ' + JSON.stringify(ist));
  return aus;
}

test('[Feldverlust] die zehn Situationen aus der Datei des Standard-Produkts tragen alles, was der generierte Block trug', async () => {
  const { V: K } = ladeKern();
  await K.depotAnlegen('pw-sit2a-1');
  K.akteurSelbstErklaeren('S');
  const mitschrift = JSON.parse(JSON.stringify(K.ankerDaten().abWerkMitschrift.situationen));
  const V = lese({ abWerkMitschrift: { situationen: mitschrift } });
  assert.equal(V.situationenAlleLesen().length, GRUND.length, 'alle zehn sind da: ' + JSON.stringify(V.SITUATIONEN_VERWORFEN_LESEN));
  const alle = [];
  for (const soll of mitParagraphenRausGehoben(grundOhneEntfallene(GRUND))) {
    const ist = V.situationByIdLesen(soll.id);
    assert.ok(ist, soll.id + ' fehlt');
    verluste(soll, JSON.parse(JSON.stringify(ist)), soll.id, alle);
  }
  assert.deepEqual(alle, [], 'Verluste gegenüber dem generierten Block');
});

test('[Feldverlust · Rot-Beweis] der Vergleich sieht ein fehlendes Feld, einen fehlenden Block und einen anderen Titel', () => {
  const ist = JSON.parse(JSON.stringify(GRUND));
  ist[0].bloecke[1].eintraege.pop();
  ist[1].bloecke.pop();
  ist[2].titel = 'Anders';
  const aus = [];
  ist.forEach((s, i) => verluste(GRUND[i], s, GRUND[i].id, aus));
  assert.ok(aus.some((x) => /eintraege hat weniger/.test(x)) && aus.some((x) => /bloecke hat weniger/.test(x)) && aus.some((x) => /titel/.test(x)));
});

test('[Template → Empfängerin] ein Modul der Datei bringt eine Situation mit; eine im Template geänderte Situation kommt an', () => {
  const V = lese({ situationsModule: [MODUL('inst-x', { 'meine-neue': eintragBlatt('Meine neue Situation') })] });
  assert.match(V.sidebarHTML(), /data-situation="meine-neue"/);
  assert.match(V.situationContentHTML('meine-neue'), /Meine neue Situation/);
  const geaendert = { situationen: [{ modulTyp: 'situation', herkunft: 'vivodepot', moduleVersion: 1, situationen: {
    notar: { icon: 'star', modus: 'eigen', titel: 'Notar (im Template geändert)', bloecke: [{ id: 'x', titel: 'Neuer Block', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] } } }] };
  const V2 = lese({ abWerkMitschrift: geaendert, sektoren: { identity: { givenName: 'Hedwig' } } });
  const html = V2.situationContentHTML('notar');
  assert.ok(html.includes('Notar (im Template geändert)') && html.includes('Neuer Block') && html.includes('Hedwig'));
});

test('[Vertrauen] ein Modul ohne belegte Signatur trägt die Marke und ersetzt kein Blatt des Produkts; ein verifiziertes darf', () => {
  const abWerk = { situationen: [MODUL('vivodepot', { notar: Object.assign(eintragBlatt('Notar ab Werk'), { modus: 'eigen' }) })] };
  const frei = lese({ abWerkMitschrift: abWerk, situationsModule: [MODUL('inst-y', { notar: eintragBlatt('Notar-Ersatzversuch'), 'zweite': eintragBlatt('Zweite') })] });
  assert.equal(frei.situationByIdLesen('notar').titel, 'Notar ab Werk', 'unsigniert ersetzt nicht');
  assert.ok(frei.SITUATIONEN_VERWORFEN_LESEN.some((v) => v.id === 'notar' && v.grund === 'doppelt'));
  assert.match(frei.situationContentHTML('zweite'), /angehoerigen-ungeprueft">Nicht geprüfte Vorlage/);
  assert.doesNotMatch(frei.situationContentHTML('notar'), /Nicht geprüfte Vorlage/, 'das Blatt des Produkts trägt die Marke nicht');
  const verif = lese({ abWerkMitschrift: abWerk, situationsModule: [MODUL('inst-z', { notar: eintragBlatt('Notar verifiziert') }, { ungeprueft: false })] });
  assert.equal(verif.situationByIdLesen('notar').titel, 'Notar verifiziert');
  assert.doesNotMatch(verif.situationContentHTML('notar'), /Nicht geprüfte Vorlage/);
});

test('[Gerüst] ohne Datei-Inhalt zeigt die Lese-App keine Situation, und ein ungültiges Modul reißt die übrigen nicht mit', () => {
  const leer = lese();
  assert.equal(leer.situationenAlleLesen().length, 0);
  assert.doesNotMatch(leer.sidebarHTML(), /data-situation=/);
  const V = lese({ situationsModule: [{ situationen: 'kaputt' }, MODUL('ok', { 'gut-1': eintragBlatt('Gut') }),
    MODUL('markup', { 'boese': eintragBlatt('<img src=x onerror=alert(1)>') })] });
  assert.deepEqual(Array.from(V.situationenAlleLesen(), (s) => s.id), ['gut-1']);
  assert.ok(V.SITUATIONEN_VERWORFEN_LESEN.some((v) => v.id === 'boese' && v.grund === 'kein-reiner-text'));
});

test('[Feldverlust · Rot-Beweis Positivliste] die Ausnahme verschluckt nur das Deklarierte — jeder Eintrag steht wirklich im Beleg, jedes andere Feld fehlt weiter', () => {
  const eintraege = (g, sid) => g.find((x) => x.id === sid).bloecke.flatMap((b) => b.eintraege).map((x) => x.feld && x.feld.id);
  // (a) kein toter Eintrag: jedes deklarierte Feld steht in der Grundlinie, jede Situation ebenso
  for (const [sid, e] of Object.entries(ENTFALLENE_FELDER)) {
    assert.ok(GRUND.some((x) => x.id === sid), 'Positivliste nennt eine Situation, die der Beleg nicht trägt: ' + sid);
    for (const f of e.felder) assert.ok(eintraege(GRUND, sid).includes(f), 'Positivliste führt ein Feld, das der Beleg nicht trägt: ' + f);
    assert.ok(e.grund.length > 30, 'jeder Eintrag trägt einen lesbaren Grund');
  }
  // (b) genau das Deklarierte fällt heraus, sonst nichts
  const bereinigt = grundOhneEntfallene(GRUND);
  assert.ok(!eintraege(bereinigt, 'volljaehrig').includes('vj_versicherungen'));
  assert.equal(eintraege(bereinigt, 'volljaehrig').length, eintraege(GRUND, 'volljaehrig').length - 1);
  // (c) ein anderes fehlendes Feld bleibt ein Verlust
  const ist = JSON.parse(JSON.stringify(bereinigt));
  const blk = ist.find((x) => x.id === 'volljaehrig').bloecke.find((b) => b.eintraege.some((x) => x.feld && x.feld.id === 'vj_rundfunk'));
  blk.eintraege = blk.eintraege.filter((x) => !(x.feld && x.feld.id === 'vj_rundfunk'));
  const aus = [];
  bereinigt.forEach((sit, i) => verluste(sit, ist[i], sit.id, aus));
  assert.ok(aus.length > 0, 'ein nicht deklarierter Verlust muss weiter auffallen');
});
