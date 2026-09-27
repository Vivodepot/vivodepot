'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — das Regal zeigt JEDES eingelassene logikModul (U2-ADR-332)
   ────────────────────────────────────────────────────────────────────────
   Der Wächter, der am 06.09.2026 gefehlt hat.

   U2-ADR-326 zog in `logikModuleAlsKarten` einen Bereichsfilter ein
   (`roh.sektor === sektorId`), mit der Begründung, die Karte gehöre „in das
   Regal ihres eigenen Bereichs". Dieses Regal gibt es nicht: `vorsorgeRegalHTML`
   hat genau EINEN Aufrufer, hinter `bereichKann(sektorId, 'vorsorgeRegal')`,
   und dieses Merkmal trägt nur `advanceCare`. Ein angedockter Fremd-Bereich kann
   es nie tragen — `merkmale` ist nicht Teil von BEREICH_MODUL_SCHLUESSEL. Der
   Filter hat die Karte darum nicht verschoben, sondern GELÖSCHT.

   WARUM DIE SUITE DAS DURCHLIESS, und das ist der eigentliche Fund: die
   bestehende Deckung (tests/logikmodul-regal-karte-generisch.test.js) prüft
   zwei Module — und BEIDE tragen `sektor: 'advanceCare'`. Ein Filter auf genau
   dieses Feld war für sie unsichtbar. Rot wurde erst eine E2E-Probe, die im
   pre-commit-Gate gar nicht läuft. Ein Maßstab, der nur den einen Fall kennt,
   für den gebaut wurde, deckt den zweiten nicht.

   Diese Datei prüft darum nicht IDs, sondern die INVARIANTE: was in
   `data.logikModule` steht, hat eine Karte. Damit fällt jeder künftige Filter
   auf, egal an welchem Feld er ansetzt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');

/* Die Pro-Bereiche als Einlass-Datei — wortgleich zu
   tests/e2e/pro-geschaeftsfuehrerin-notfallmappe-abnahme.spec.js. Ohne sie weist
   `modulEinlassen` das GF-Bundle mit grund `sektor` ab (gemessen), denn sein
   Heimatbereich existiert im nativen Bestand nicht. U2-ADR-421-Nachtrag
   (08.09.2026): pro-identitaet dazu — kontakt_telefon/kontakt_email referenzieren
   ihn seither, ohne ihn hier fällt der GF-Einlass mit grund 'blockstruktur' ab. */
const PRO_BEREICHE_TEXT = JSON.stringify({
  modulTyp: 'bereich', sprache: 'de', moduleVersion: 2, herkunft: 'urn:regal-waechter-u2-adr-332:v1',
  bereiche: {
    'pro-vertretung-vollmachten': { label: 'Vertretung und Vollmachten', icon: 'folder' },
    'pro-gesellschaft-nachfolge': { label: 'Gesellschaft und Nachfolgeregelung', icon: 'folder' },
    'pro-kontakte-vertretungsplan': { label: 'Kontakte und Vertretungsplan', icon: 'folder' },
    'pro-aufbewahrung-ordnung': { label: 'Aufbewahrung und Ordnung', icon: 'folder' },
    'pro-identitaet': { label: 'Identität', icon: 'user' },
  },
});
const GF_BUNDLE_TEXT = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'pro-logikmodul-testschablone-de.json'), 'utf8');

/* Der Prüfer selbst — bewusst als eigene Funktion, damit die Gegenproben unten
   ihn gegen HANDGEMACHTE Eingaben halten können. Ein Prüfer, den man nur über
   den echten Kern aufrufen kann, lässt sich nicht auf Blindheit prüfen. */
function ohneKarte(html, module) {
  return module
    .map((m) => m && m.id)
    .filter((id) => typeof id === 'string' && id)
    .filter((id) => !html.includes('data-modul-karte="' + id + '"'));
}

async function frischOffenesDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen('Regal-Waechter-332-2026!');
  return V;
}
/* Seit 21.09.2026 (Template zugang-zum-recht, U2-ADR-427) trägt der bloße Kern nur noch den Erbschein-Auszug (sektor advanceCare);
   der Zugangs-Auszug (sektor assets) ist Ab-Werk-Saat der Privat-Produkte. Der Fall „ein Modul mit fremdem sektor ab Werk" besteht
   darum im gebauten privat-de, und was das Regal zeigen muss, ist Depot + Saat (`_logikModuleAlle`, dieselbe Lesestelle wie das Regal). */
async function frischPrivatDepot() {
  const { V } = kernAus(produktHtml('privat-de'));
  await V.depotAnlegen('Regal-Waechter-332-2026!');
  return V;
}

test('[U2-ADR-332] jedes ab Werk eingelassene logikModul hat eine Regal-Karte — auch das mit fremdem sektor', async () => {
  const V = await frischPrivatDepot();
  const module = V._logikModuleAlle(V.getData());

  /* Positivkontrolle der Vorbedingung: die Probe ist nur dann ein Wächter, wenn
     überhaupt ein Modul dabei ist, dessen sektor NICHT der des Regals ist. Ohne
     diesen Satz wäre sie am 06.09. grün gewesen und hätte nichts bewiesen. */
  const fremde = module.filter((m) => m && m.sektor !== 'advanceCare');
  assert.ok(fremde.length >= 1,
    'Vorbedingung: mindestens ein logikModul mit sektor !== "advanceCare" muss ab Werk vorhanden sein — '
    + 'sonst prüft diese Datei den Fall nicht, für den sie gebaut ist. Gefunden: '
    + module.map((m) => m.id + '/' + m.sektor).join(', '));

  assert.deepEqual(ohneKarte(V.vorsorgeRegalHTML('advanceCare'), module), [],
    'jedes eingelassene logikModul muss im Regal stehen — das Regal ist der einzige Ort dafür');
});

test('[U2-ADR-332] ein Modul in einem ANGEDOCKTEN Fremd-Bereich bekommt seine Karte — der Fall, der rot war', async () => {
  const V = await frischOffenesDepot();
  const bereicheOk = V.modulEinlassen(PRO_BEREICHE_TEXT, V.getData(), null, null);
  assert.equal(bereicheOk.angenommen, true, bereicheOk.grund || '');

  /* GEMESSEN, NICHT ANGENOMMEN: ohne diesen Aufruf weist der GF-Einlass mit grund `sektor`
     ab. `modulEinlassen` legt den Bereich in `data.bereichsModule`, aber die Registry, gegen
     die die sektor-Prüfung läuft, entsteht in `_bereichsModuleAusDepotAnmelden` — im Browser
     beim Laden bzw. beim Neuzeichnen nach dem Einlass, im Node-Sandkasten von niemandem.
     Der Aufruf stellt den Browser-Zustand her, er umgeht keine Prüfung. */
  V._bereichsModuleAusDepotAnmelden(V.getData());

  const gfOk = V.modulEinlassen(GF_BUNDLE_TEXT, V.getData(), null, null);
  assert.equal(gfOk.angenommen, true, gfOk.grund || '');

  const module = V.getData().logikModule || [];
  const gf = module.find((m) => m && m.id === 'pro-geschaeftsfuehrerin-notfallmappe');
  assert.ok(gf, 'das GF-Bundle liegt nach dem Einlass in data.logikModule');
  assert.equal(gf.sektor, 'pro-vertretung-vollmachten',
    'sein Heimatbereich ist ein angedockter — genau der Fall, den der Filter gelöscht hat');

  assert.deepEqual(ohneKarte(V.vorsorgeRegalHTML('advanceCare'), module), [],
    'auch ein Modul, dessen Heimatbereich selbst kein Regal zeigen KANN, muss erreichbar bleiben');
});

test('[U2-ADR-332 · Gegenprobe] der Prüfer ist nicht blind — eine fehlende Karte MUSS er benennen', () => {
  const html = '<div data-modul-karte="da"></div>';
  assert.deepEqual(ohneKarte(html, [{ id: 'da' }]), [], 'was da ist, meldet er nicht');
  assert.deepEqual(ohneKarte(html, [{ id: 'da' }, { id: 'fort' }]), ['fort'],
    'was fehlt, meldet er mit Namen');
});

test('[U2-ADR-332 · Gegenprobe] genau der zurückgenommene Bereichsfilter MUSS diese Datei rot machen', async () => {
  const V = await frischPrivatDepot();
  const module = V._logikModuleAlle(V.getData());

  /* Der Filter aus U2-ADR-326, wortgleich nachgestellt, auf dieselben Daten
     angewandt: was er übrigließe, ist das, was das Regal dann noch zeigte. */
  const nachFilter = module.filter((m) => m && m.sektor === 'advanceCare');
  const htmlMitFilter = nachFilter.map((m) => '<div data-modul-karte="' + m.id + '"></div>').join('');

  const fehlend = ohneKarte(htmlMitFilter, module);
  assert.ok(fehlend.length >= 1,
    'mit dem Bereichsfilter fiele mindestens ein Modul aus dem Regal — sonst beweist diese '
    + 'Gegenprobe nichts. Übrig geblieben wären: ' + nachFilter.map((m) => m.id).join(', '));
  assert.ok(fehlend.includes('zugang-zum-recht-beratungshilfe'),
    'namentlich das Modul, an dem der Fehler am 06.09.2026 zuerst sichtbar wurde. Gemeldet: '
    + fehlend.join(', '));
});

/* ── Der zweite Fehler, den derselbe Filter verdeckt hat ─────────────────────────────────────
   U2-ADR-326 baute einen Rückfall für die Herkunft-Zeile — und las dabei `reg.generator.herkunft`,
   einen Pfad, den es an keinem Modul gibt. Er lief also immer ins Leere. Aufgefallen ist das nicht,
   weil derselbe Zug die einzige Karte, die ihn gebraucht hätte, per Bereichsfilter unsichtbar
   machte. Zwei Fehler, die sich gegenseitig verdeckten; der eine fiel erst mit dem anderen.
   Die Invariante ist darum nicht „das Modul X zeigt Y", sondern: KEINE Karte zeigt ein Loch. */
test('[U2-ADR-332] keine Regal-Karte zeigt eine leere Herkunft — ein Loch ist kein Zustand', async () => {
  const V = await frischOffenesDepot();
  const html = V.vorsorgeRegalHTML('advanceCare');
  const loecher = (html.match(/<span class="regal-herkunft">\s*<\/span>/g) || []).length;
  assert.equal(loecher, 0,
    'jede Karte im Regal muss eine Herkunft nennen. Leere Spans gefunden: ' + loecher);
});

test('[U2-ADR-332 · Gegenprobe] die Herkunft kommt aus dem MODUL, nicht aus einer Kennungsliste im Kern', async () => {
  const V = await frischOffenesDepot();
  /* Beide Vorbereitungsauszüge tragen `herkunft: 'vivodepot'` in ihrem eigenen Bündel. Stünde die
     Angabe weiter als Literal in `_MODUL_KARTE`, hätte nur der dort eingetragene Erbschein eine —
     genau der Zustand vor dieser Reparatur. Dass BEIDE dieselbe Marke auflösen, ist der Beleg. */
  const erbschein = V.modulKarteHerkunft({ id: 'erbschein-vorbereitung' });
  const beratung = V.modulKarteHerkunft({ id: 'zugang-zum-recht-beratungshilfe' });
  assert.ok(erbschein && erbschein.trim(), 'der Erbschein nennt eine Herkunft');
  assert.equal(beratung, erbschein,
    'dieselbe sprachneutrale Marke `vivodepot` ergibt denselben aufgelösten Wortlaut — '
    + 'Erbschein: ' + JSON.stringify(erbschein) + ', Beratungshilfe: ' + JSON.stringify(beratung));
});
