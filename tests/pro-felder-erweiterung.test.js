'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Pro-Felder aus P4 (U2-ADR-243 §7, 02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Quelle tools/pro-felder-erweiterung.json (Bibliothek tools/lib/pro-felder-erweiterung.js). Geprüft:
   (1) Quelle: jedes Feld hat eine interne Quelle, Beschriftung DE/EN, eine Kennung `tpl_` + englisches snake_case ohne
       „Pflicht" im Namen; kein Feld fragt nach PIN, Passwort oder Kennwort (Verweis statt Zugang, beA-Befund);
       `sensibel` genau bei den sechs entschiedenen Feldern (Personalien Dritter — Gesellschafterinnen und Geschäftsführung laut
       Register —, wirtschaftlich Berechtigte, Gläubigerübersicht, Ansprechpartner in der Krise, Versammlung wegen Kapitalverlust).
   (2) Templates: jedes Feld steht in tools/bereich-templates/vivodepot-pro-*.json, in der Form der Quelle.
   (3) Altbestand byte-gleich: jede Sektion und jedes Feld, das es vor P4 gab, steht unverändert an seiner Stelle
       (tests/fixtures/pro-bereiche-vor-feld-erweiterung-2026-10-02.json, erhoben am Kanon c71971fff).
   (4) Im gebauten Produkt pro-de und pro-en: jedes neue Feld mit Beschriftung, Hinweis, Unterfeld- und Optionsbeschriftungen
       in der Sprache des Produkts.
   Rot-Beweis: vor dem Einbau scheitern (2) und (4) an jedem Feld; die Positivkontrolle in (1) pflanzt eine Pflicht-Kennung
   und eine Passwort-Frage.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const { laden, feldStruktur } = require('../tools/lib/pro-felder-erweiterung.js');

const DATEN = laden();
const VERZ = path.join(__dirname, '..', 'tools', 'bereich-templates');
const VORHER = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pro-bereiche-vor-feld-erweiterung-2026-10-02.json'), 'utf8')).bereiche;
const LOAD_KERN = require.resolve('./load-kern.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-felder-erweiterung-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

function templates() {
  const aus = {};
  for (const f of fs.readdirSync(VERZ).filter((x) => /^vivodepot-pro-.*\.json$/.test(x))) Object.assign(aus, JSON.parse(fs.readFileSync(path.join(VERZ, f), 'utf8')).bereiche);
  return aus;
}
const ZUGANG = /\bpin\b|passwort|kennwort|password|passcode/i;
const PFLICHT = /pflicht|obligation|mandatory/i;
function quellenVerstoesse(daten) {
  const v = [];
  for (const f of daten.felder) {
    if (!/^tpl_[a-z0-9]+(_[a-z0-9]+)*$/.test(f.id)) v.push(f.id + ': Kennungsform');
    if (PFLICHT.test(f.id)) v.push(f.id + ': Pflicht in der Kennung');
    if (typeof f.quelle !== 'string' || !f.quelle.trim()) v.push(f.id + ': ohne Quelle');
    for (const s of ['de', 'en']) {
      if (!f[s] || !f[s].label) v.push(f.id + ': ohne Beschriftung ' + s);
      if (ZUGANG.test(JSON.stringify(f[s]))) v.push(f.id + ': fragt nach einem Zugangsgeheimnis (' + s + ')');
    }
  }
  return v;
}

test('[Quelle] Kennung, Quelle, Beschriftung DE/EN, kein Zugangsgeheimnis, keine Pflicht im Namen', () => {
  assert.deepEqual(quellenVerstoesse(DATEN), []);
  assert.equal(new Set(DATEN.felder.map((f) => f.bereich + '.' + f.id)).size, DATEN.felder.length, 'keine Kennung doppelt');
  assert.deepEqual(DATEN.felder.filter((f) => f.sensibel).map((f) => f.id).sort(),
    ['tpl_beneficial_owners', 'tpl_creditor_list_location', 'tpl_half_capital_loss_meeting', 'tpl_insolvency_contacts', 'tpl_managing_director_register_details', 'tpl_partner_personal_details']);
});

test('[Quelle·Positivkontrolle] eine Pflicht-Kennung und eine Passwort-Frage werden gefunden', () => {
  const kaputt = { felder: [{ id: 'tpl_tax_obligations', quelle: 'x', de: { label: 'a' }, en: { label: 'b', hint: 'Enter the PIN' } }] };
  assert.deepEqual(quellenVerstoesse(kaputt), ['tpl_tax_obligations: Pflicht in der Kennung', 'tpl_tax_obligations: fragt nach einem Zugangsgeheimnis (en)']);
});

test('[Templates] jedes Feld steht im Template, in der Form der Quelle', () => {
  const t = templates();
  const fehlt = [];
  for (const f of DATEN.felder) {
    const sek = (t[f.bereich].sektionen || []).find((s) => s.id === f.sektion);
    const ist = sek && sek.felder.find((x) => x.id === f.id);
    if (!ist) { fehlt.push(f.bereich + '#' + f.sektion + '.' + f.id); continue; }
    assert.deepEqual(ist, feldStruktur(f), f.id);
  }
  assert.deepEqual(fehlt, []);
});

test('[Altbestand byte-gleich] jede Sektion und jedes Feld von vor P4 steht unverändert an seiner Stelle', () => {
  const t = templates();
  for (const [id, alt] of Object.entries(VORHER)) {
    const jetzt = t[id];
    const { sektionen: altS, ...altKopf } = alt;
    const { sektionen: neuS, ...neuKopf } = jetzt;
    assert.deepEqual(neuKopf, altKopf, id + ': Bereichskopf');
    const neuOhneNeue = neuS.filter((s) => altS.some((a) => a.id === s.id));
    assert.deepEqual(neuOhneNeue.map((s) => s.id), altS.map((s) => s.id), id + ': Reihenfolge der alten Sektionen');
    altS.forEach((s, i) => {
      const { felder: altF, ...sKopf } = s;
      const { felder: neuF, ...nKopf } = neuOhneNeue[i];
      assert.deepEqual(nKopf, sKopf, id + '#' + s.id + ': Sektionskopf');
      assert.deepEqual(neuF.slice(0, altF.length), altF, id + '#' + s.id + ': alte Felder unverändert vorn');
    });
  }
});

for (const slug of ['pro-de', 'pro-en']) {
  test(`[Produkt·${slug}] jedes neue Feld mit Beschriftung, Hinweis, Unterfeld- und Optionsbeschriftungen in der Sprache des Produkts`, async () => {
    const sprache = slug.endsWith('-en') ? 'en' : 'de';
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    const r = konfektionieren({ ziel: path.join(TMP, slug), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n', unsignierteModulDateien: VP.modulDateienFuer(p) });
    process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
    delete require.cache[LOAD_KERN];
    // `blank`: das Produkt ist oben schon konfektioniert, ladeKern backt nichts dazu (tests/kern-html-path-absicht.test.js).
    const { V } = require(LOAD_KERN).ladeKern({ blank: true });
    delete process.env.KERN_HTML_PATH;
    delete require.cache[LOAD_KERN];
    await V.depotAnlegen('Pro-Felder-Erweiterung-2026');
    const abweichung = [];
    for (const f of DATEN.felder) {
      const b = V.bereicheAlle().find((x) => x.id === f.bereich);
      const sek = b && b.sektionen.find((s) => s.id === f.sektion);
      const ist = sek && sek.felder.find((x) => x.id === f.id);
      if (!ist) { abweichung.push(f.id + ': fehlt'); continue; }
      if (ist.label !== f[sprache].label) abweichung.push(f.id + ': Beschriftung ' + ist.label);
      if (f[sprache].hint && ist.hint !== f[sprache].hint) abweichung.push(f.id + ': Hinweis ' + ist.hint);
      for (const uf of f.unterFelder || []) if ((ist.unterFelder.find((u) => u.id === uf.id) || {}).label !== uf[sprache]) abweichung.push(f.id + '/' + uf.id);
      for (const o of f.optionen || []) if ((ist.optionen.find((x) => x.wert === o.wert) || {}).label !== o[sprache]) abweichung.push(f.id + '/' + o.wert);
    }
    for (const b of DATEN.bereichsSatz.bereiche) {
      const ist = V.bereicheAlle().find((x) => x.id === b).einfuehrungstext;
      if (ist !== DATEN.bereichsSatz[sprache].replace('{marke}', 'Vivodepot')) abweichung.push(b + ': Einführungssatz ' + ist);
    }
    for (const s of DATEN.neueSektionen) {
      const sek = V.bereicheAlle().find((x) => x.id === s.bereich).sektionen.find((x) => x.id === s.id);
      if (!sek || sek.label !== s[sprache]) abweichung.push('#' + s.id);
    }
    assert.deepEqual(abweichung, []);
  });
}
