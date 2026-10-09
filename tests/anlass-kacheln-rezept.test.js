'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kachel-Schnitt: Anlass-Kacheln ohne eigene Situation sind Privat-Inhalt (02.10.2026, U2-ADR-243 Teil 2)
   ────────────────────────────────────────────────────────────────────────────
   Die acht Kacheln Umzug, Krisenvorsorge, Trennung, Arbeitslosigkeit, rechtliche Betreuung, Todesfall, Verwitwung und
   eigene Vorsorge standen als Konstante im Kern und erschienen darum auch in Pro. Jetzt stehen sie im Lebenslagen-Katalog
   (tools/lebenslagen-katalog-modul.json, Schlüssel `anlaesse`), den nur die Privat-Rezepte tragen; Pro trägt außerdem die fünf
   privaten Assistenten nicht mehr. Gemessen an ECHT konfektionierten Produkten:
   (1) Privat bleibt gleich: die Startseite DE und EN, ohne und mit Depot, ist zeichengleich mit dem Stand davor
       (tests/fixtures/privat-startseite-vor-kachel-umzug-2026-10-02.json, erhoben am P1-Stand);
   (2) Pro bietet keine private Kachel, keine Lebenslage, keinen privaten Assistenten mehr an; pvwiz/kiwiz werden gebaut, aber nicht
       angeboten, weil ihr Ziel `advanceCare` in Pro fehlt (Befund PRO-ASSISTENT-ZIEL-OHNE-BEREICH, 07.10.2026);
   (3) nichts geht verloren: eine Pro-Datei aus der Zeit davor mit Werten aus einem herausfallenden Assistenten (gebwiz →
       Situation „geburt", anamwiz → Bereich „health") und aus einer Lebenslage (eigene-vorsorge → Bereich „advanceCare")
       öffnet im neuen Pro, wird gespeichert und wieder geöffnet; alle Werte sind da und sichtbar.
   Rot-Beweis zu (3): ohne den Weck-Schritt der ruhenden Situationen scheitert die Probe an „lesbar: geburt".
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const PW = 'Kachel-Schnitt-2026-10-02';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'anlass-kacheln-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
const VORHER_PFAD = path.join(__dirname, 'fixtures', 'privat-startseite-vor-kachel-umzug-2026-10-02.json');
const VORHER = JSON.parse(fs.readFileSync(VORHER_PFAD, 'utf8'));
/* Der Beleg ist eingefroren: der Kennungs-Scan nimmt ihn als Ganzes aus (tools/kennung-vorkommen-grundlinie.json, Eimer
   testament), darum hält ihn diese Prüfsumme fest. Ändert sich ein Byte, ist (1) kein Vergleich mit dem Stand davor mehr. */
const VORHER_SHA256 = 'bce313ea353c830ec6f158b772ae5b1d0a72f0ad8f4178dcdb61d6446fab9322';
const PRIVATE_KACHELN = ['umzug', 'krisenvorsorge', 'trennung-scheidung', 'arbeitslosigkeit', 'rechtliche-betreuung', 'todesfall', 'verwitwung', 'eigene-vorsorge'];
const PRIVATE_ASSISTENTEN = ['gebwiz', 'anamwiz', 'pflwiz', 'heirwiz', 'umzwiz'];

const gebaut = new Map();
/* `alt`: das Pro-Produkt vor Teil 2 — zehn private Situationen, private Assistenten, Lebenslagen-Katalog. */
function kern(slug, alt) {
  const schluessel = slug + (alt ? '-alt' : '');
  if (!gebaut.has(schluessel)) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    let dateien = VP.modulDateienFuer(p);
    if (alt) {
      dateien = dateien.filter((f) => f !== VP.PRO_SITUATIONEN_PFAD_DE && f !== VP.PRO_SITUATIONEN_PFAD_EN)
        .concat(VP.AB_WERK_FIXTURE_PFADE_4, [VP.LEBENSLAGEN_KATALOG_PFAD]);
    }
    const r = konfektionieren({
      ziel: path.join(TMP, schluessel), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: dateien,
    });
    gebaut.set(schluessel, path.join(r.ordner, 'vivodepot.html'));
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut.get(schluessel);
  delete require.cache[LOAD_KERN];
  // `blank`: das Produkt ist oben schon konfektioniert, ladeKern backt nichts dazu (tests/kern-html-path-absicht.test.js).
  try { return require(LOAD_KERN).ladeKern({ blank: true }); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}
async function frisch(slug, alt) {
  const k = kern(slug, alt);
  await k.V.depotAnlegen(PW);
  k.V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  return k;
}

for (const slug of ['privat-de', 'privat-en']) {
  test(`[Privat gleich·${slug}] Startseite ohne und mit Depot zeichengleich mit dem Stand davor, Kachelliste ebenso`, async () => {
    const k = kern(slug);
    k.V.renderAnlassAuswahl();
    assert.equal(k.document.getElementById('overlay-inhalt').innerHTML, VORHER[slug].ohneDepot, 'ohne Depot');
    await k.V.depotAnlegen(PW);
    k.V.renderAnlassAuswahl(undefined, true);
    assert.equal(k.document.getElementById('overlay-inhalt').innerHTML, VORHER[slug].mitDepot, 'mit Depot');
    const liste = k.V.anlaesseAlle().map((a) => ({ id: a.id, klasse: a.klasse, icon: a.icon, ziel: a.ziel, versteckt: a.versteckt === true, label: a.label }));
    assert.deepEqual(JSON.parse(JSON.stringify(liste)), VORHER[slug].anlaesse);
  });
}

for (const slug of ['pro-de', 'pro-en']) {
  test(`[Pro·${slug}] keine private Kachel, keine Lebenslage, kein privater Assistent, kein Assistent ohne Zielbereich`, async () => {
    const { V } = await frisch(slug);
    const kacheln = V.anlaesseAlle().map((a) => a.id);
    assert.deepEqual(kacheln.filter((id) => PRIVATE_KACHELN.includes(id)), []);
    assert.deepEqual(kacheln, ['pro-vertretung', 'pro-uebergabe', 'pro-einarbeitung', 'pro-nachfolge', 'umsehen']);
    const assistenten = V.wizardsAlle().map((w) => w.id);
    assert.deepEqual(assistenten.filter((id) => PRIVATE_ASSISTENTEN.includes(id)), []);
    assert.ok(assistenten.includes('pvwiz') && assistenten.includes('kiwiz'), 'gebaut bleiben sie: ' + assistenten.join(','));
    assert.equal(V.wizardStartHTML('pvwiz') + V.wizardStartHTML('kiwiz'), '', 'angeboten werden sie nicht');
    assert.equal(V.BAUSTEINE.length, 0, 'kein Lebenslagen-Katalog');
  });
}

test('[Beleg eingefroren] die Privat-Startseite vor dem Kachel-Schnitt ist byte-gleich mit dem erhobenen Stand', () => {
  const sha = (b) => require('node:crypto').createHash('sha256').update(b).digest('hex');
  const roh = fs.readFileSync(VORHER_PFAD);
  assert.equal(sha(roh), VORHER_SHA256, 'der eingefrorene Beleg wurde verändert');
  // Rot-Beweis: ein einziges geändertes Byte ergibt eine andere Prüfsumme.
  const geaendert = Buffer.from(roh); geaendert[geaendert.length - 2] ^= 1;
  assert.notEqual(sha(geaendert), VORHER_SHA256);
});

test('[Kein Verlust] alte Pro-Datei mit Werten aus Assistenten und Lebenslage: öffnen, speichern, wieder öffnen — alles da und sichtbar', async () => {
  const alt = await frisch('pro-de', true);
  const assistenten = alt.V.wizardsAlle().map((w) => w.id);
  assert.ok(assistenten.includes('gebwiz') && assistenten.includes('anamwiz'), 'Vorbedingung: das alte Produkt hat die Assistenten');
  alt.V.situationFeldSetzen('geburt', 'geburt_datum', '2026-03-14');                         // gebwiz schreibt in die Situation „geburt"
  alt.V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Heuschnupfen' }]);  // anamwiz schreibt in den Bereich „health"
  alt.V.sektorFeldSetzen('advanceCare', 'heirsBriefOverview', 'Brief an die Erben liegt im Ordner Vorsorge');          // Lage eigene-vorsorge
  const vorher = JSON.stringify({ s: alt.V.getData().situationen, h: alt.V.getData().sektoren.health, a: alt.V.getData().sektoren.advanceCare });

  const k1 = kern('pro-de');
  await k1.V.depotLaden(JSON.parse(JSON.stringify(await alt.V.depotSerialisieren())), PW);
  const lesbar = (V) => {
    assert.ok(V.situationenAlle().some((s) => s.id === 'geburt'), 'lesbar: geburt');
    assert.ok(JSON.stringify(V.situationModell('geburt')).includes('2026'), 'exportierbar: geburt');
    for (const b of ['health', 'advanceCare']) assert.ok(V.bereicheAlle().some((x) => x.id === b), 'lesbar: ' + b);
    assert.ok(!V.anlaesseAlle().some((a) => a.id === 'geburt'), 'nicht angeboten: geburt');
  };
  lesbar(k1.V);
  const k2 = kern('pro-de');
  await k2.V.depotLaden(JSON.parse(JSON.stringify(await k1.V.depotSerialisieren())), PW);
  lesbar(k2.V);
  const d = k2.V.getData();
  assert.equal(JSON.stringify({ s: d.situationen, h: d.sektoren.health, a: d.sektoren.advanceCare }), vorher, 'Werte nach Speichern und Wiederöffnen');
});

/* Geweckt wird nur, was nach INHALT ab Werk ist (_mitschriftNachInhalt). Ein Mitschrift-Eintrag, den jemand in der Datei verändert hat,
   bleibt ruhend und steht benannt in SITUATIONEN_MODUL_VERWORFEN — auch wenn er „ab Werk“ oder eine Herkunft behauptet. */
async function alteProDateiMitGeburt() {
  const alt = await frisch('pro-de', true);
  alt.V.situationFeldSetzen('geburt', 'geburt_datum', '2026-03-14');
  return { alt, umschlag: JSON.parse(JSON.stringify(await alt.V.depotSerialisieren())) };
}
async function mitGeaenderterMitschrift(alt, aendern) {
  const d = alt.V.getData();
  const eintrag = (d.abWerkMitschrift.situationen || []).find((m) => m && m.situationen && m.situationen.geburt);
  assert.ok(eintrag, 'Vorbedingung: die alte Datei führt geburt in der Mitschrift');
  aendern(eintrag);
  return JSON.parse(JSON.stringify(await alt.V.depotSerialisieren()));
}

test('[Wecken·nach Inhalt] die unveränderte Mitschrift weckt geburt (Gegenprobe)', async () => {
  const { umschlag } = await alteProDateiMitGeburt();
  const k = kern('pro-de');
  await k.V.depotLaden(umschlag, PW);
  assert.ok(k.V.situationenAlle().some((s) => s.id === 'geburt'));
});

test('[Wecken·Rot-Beweis] ein in der Datei veränderter Mitschrift-Eintrag wird nicht geweckt und benannt verworfen', async () => {
  const { alt } = await alteProDateiMitGeburt();
  const umschlag = await mitGeaenderterMitschrift(alt, (m) => { m.situationen.geburt.titel = 'Gefälscht'; });
  const k = kern('pro-de');
  const vorher = k.V.SITUATIONEN_MODUL_VERWORFEN.length;
  await k.V.depotLaden(umschlag, PW);
  assert.ok(!k.V.situationenAlle().some((s) => s.id === 'geburt'), 'nicht geweckt');
  assert.ok(k.V.SITUATIONEN_MODUL_VERWORFEN.slice(vorher).some((v) => v.grund === 'mitschrift-nicht-ab-werk'), 'benannt verworfen');
});

test('[Wecken·Rot-Beweis] ein veränderter Eintrag, der abWerk und eine Herkunft behauptet, wird nicht geweckt', async () => {
  const { alt } = await alteProDateiMitGeburt();
  const umschlag = await mitGeaenderterMitschrift(alt, (m) => {
    m.situationen.geburt.titel = 'Gefälscht'; m.abWerk = true; m.herkunft = 'vivodepot'; m.ungeprueft = false;
  });
  const k = kern('pro-de');
  await k.V.depotLaden(umschlag, PW);
  assert.ok(!k.V.situationenAlle().some((s) => s.id === 'geburt'), 'die Behauptung der Datei weckt nichts');
});
