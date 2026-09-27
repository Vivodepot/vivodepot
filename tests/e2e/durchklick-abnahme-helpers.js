'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   durchklick-abnahme-helpers.js — Personas als Depotzustand in ALLEN vier
   Produkten, generisch über die 20 persona-p*.js-Fixtures (Auftrag,
   23.09.2026: „Durchklick-Abnahme über alle vier gebackenen Produkte").
   ────────────────────────────────────────────────────────────────────────────
   WARUM NICHT PER SNAPSHOT-KOPIE (wie referenzdepotBefuellen es für das feste
   Referenzdepot tut). Eine persona-p*.js-Fixture ist KEIN Datenobjekt, sondern
   `async function baueDepot(V) { await V.depotAnlegen(...); V.personHinzufuegen(...); ... }`
   — eine Folge echter Schreibwege (s. Kopfkommentar jeder Fixture). Manche
   dieser Wege schreiben NICHT nur in {menschen, institutionen, sektoren}:
   `akteurSelbstErklaeren()` setzt zusätzlich den Sitzungs-Akteur
   (`setzeSitzungsAkteur`, `data.inhaberPersonId`) und Urheberschafts-Stempel
   (`data.urheberschaft`) — Zustand, der an die AKTUELLE Sitzung gebunden ist,
   nicht an ein exportierbares Datenobjekt. Ein Snapshot aus einem separaten
   Node-Lauf (`ladeKern()`) hätte diese Sitzungsbindung verloren oder falsch
   dupliziert. Die Fixture wird darum ECHT im Browser ausgeführt, gegen
   `window.__vdOeffentlich` als V — genau das Objekt, das die Fixture laut
   eigenem Kopfkommentar erwartet ("eine Folge von Aufrufen der echten
   Schreibwege"), nur in einem anderen Realm als in den Node-Tests
   (`tests/persona-p6-durchlauf.test.js` etc. nutzen `ladeKern()`s V).

   DIE KLAMMER-FALLE (und warum sie hier nicht zuschlägt). `baueDepot.toString()`
   liefert nur den QUELLTEXT der Funktion, keine Closure — die Fixture
   referenziert aber modul-eigene `const`s (PASSWORT, MENSCHEN, INSTITUTIONEN, …)
   als freie Variablen. Re-eval'd in einem fremden Realm (der Browser-Seite)
   wären das ReferenceErrors. Gemessen an persona-p1.js/p2.js: JEDE freie
   Variable, die `baueDepot` referenziert, steht auch in `module.exports` (die
   Fixture-Autorenkonvention exportiert alles, was `baueDepot` selbst und
   `pruefungen()` brauchen). Der Fix ist darum generisch, nicht fixturespezifisch:
   alle Exporte außer `baueDepot`/`pruefungen` werden NAMENTLICH als Konstanten
   vor den Funktionskörper gesetzt (`const [PASSWORT, MENSCHEN, …] = arguments`),
   bevor der Körper im Browser läuft. Bricht eine Fixture aus diesem Muster aus
   (referenziert eine freie Variable, die sie nicht exportiert), wirft der
   Konstruktions-Schritt im Browser einen ReferenceError — laut, nicht still.

   WAS PASSIERT, WENN EINE FIXTURE NICHT LÄDT: kein Fallback, kein leerer
   Durchlauf — `personaDepotAufbauen` wirft, der Aufrufer entscheidet, ob das
   ein Persona-Fund oder ein Werkzeug-Fund ist (s. Aufrufer-Dokumentation).

   ZWEITE AUSNAHME VOM MUSTER (Fund Vorlauf, 23.09.2026, P5): eine Fixture darf
   neben `baueDepot`/`pruefungen` eine WEITERE Funktion exportieren, die nur
   `pruefungen()` im Node-Realm braucht (persona-p5.js#baueZweitesDepot — ein
   zweites Depot für die härteste Frage am Datenmodell, gebaut von der Probe,
   nicht vom Läufer). So ein Export ist keine Konstante, die `baueDepot`s
   Körper referenziert, und `page.evaluate` kann eine Funktion ohnehin nicht
   strukturiert klonen ("Attempting to serialize unexpected value"). Darum:
   Funktions-Exporte fliegen aus den Konstanten, BEVOR sie in den Browser
   gehen. Referenziert `baueDepot`s Körper trotzdem eine ausgefilterte
   Funktion als freie Variable, wirft der Konstruktions-Schritt einen
   ReferenceError — weiterhin laut, nicht still; das Ausfiltern ändert nur,
   WAS als Konstante zählt, nicht das Verhalten bei einem echten Fixture-Bruch.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const FIXTURES_ORDNER = path.join(__dirname, '..', 'fixtures');

function fixturePfadFuer(personaId) {
  return path.join(FIXTURES_ORDNER, 'persona-' + personaId.toLowerCase() + '.js');
}

/* ── ECHTE Konfektionierung, nicht der E2E-Test-Bake (23.09.2026) ──────
   `tests/e2e/helpers.js`s KERN_URL_PRIVAT_DE & Co. zeigen auf `global-setup.js`s
   `bakeProdukt()` — dem LEICHTEN Test-Bake (`_abWerkModuleAufText`, reine
   Text-Splice). Dem fehlen Vor-Depot, SW-Region, 34.7 und der kommende
   Entwicklerleisten-Schnitt (Fund). Die Durchklick-Abnahme braucht den
   ECHTEN Auslieferungsweg: `produkt-konfektionieren.js#konfektionieren()` —
   dieselbe Funktion, die `tools/vier-produkte-erzeugen.js` (CLI) und
   `tests/e2e/abnahme-funde-2026-09-17.spec.js#produktUrl()` schon nutzen.
   Gebaut EINMAL je Produkt und Prozess (Map-Cache) — Konfektionieren ist ein
   echter Datei-Schreibvorgang, kein Text-in-Memory-Splice mehr. */
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');
const _echtesProduktCache = new Map();
const _wegwerfVerzeichnisse = [];
process.on('exit', () => { for (const d of _wegwerfVerzeichnisse) { try { require('node:fs').rmSync(d, { recursive: true, force: true }); } catch (_) { /* Aufräumen darf den Lauf nicht kippen */ } } });

function echtesProduktUrl(slug) {
  if (_echtesProduktCache.has(slug)) return _echtesProduktCache.get(slug);
  const fs = require('node:fs');
  const os = require('node:os');
  const p = PRODUKTE.find((x) => x.slug === slug);
  if (!p) throw new Error('echtesProduktUrl: unbekanntes Produkt „' + slug + '"');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-durchklick-abnahme-' + slug + '-'));
  _wegwerfVerzeichnisse.push(ziel);
  const r = konfektionieren({
    ziel, slug: p.slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(p),
  });
  const url = 'file://' + path.join(r.ordner, 'vivodepot.html');
  _echtesProduktCache.set(slug, url);
  return url;
}

// Alle 20 Kennungen — Y für die Personas-Achse. Aus dem Fixture-Ordner ABGELEITET
// (Datei-Liste), nicht als Handzettel gepflegt: eine neue/entfernte Fixture
// ändert diese Liste automatisch beim nächsten Lauf.
function allePersonaKennungen() {
  const fs = require('node:fs');
  return fs.readdirSync(FIXTURES_ORDNER)
    .map((f) => /^persona-(p[0-9]+)\.js$/.exec(f))
    .filter(Boolean)
    .map((m) => m[1].toUpperCase())
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

// Baut das Depot einer Persona-Fixture ECHT im Browser (s. Kopfkommentar).
// Erwartet ein bereits leeres, per UI angelegtes Depot auf `page` (oeffneApp +
// depotAnlegen) — dieselbe Reihenfolge wie referenzdepotBefuellen es für das
// feste Referenzdepot verlangt.
async function personaDepotAufbauen(page, personaId) {
  const fixturePfad = fixturePfadFuer(personaId);
  const Fixture = require(fixturePfad);
  if (typeof Fixture.baueDepot !== 'function') {
    throw new Error('personaDepotAufbauen: ' + personaId + ' exportiert kein baueDepot()');
  }
  const { baueDepot, pruefungen, ...konstanten } = Fixture;
  // Funktions-Exporte (z. B. persona-p5.js#baueZweitesDepot) sind keine
  // Konstanten für baueDepot()s Körper — nur pruefungen() im Node-Realm
  // braucht sie — und page.evaluate kann eine Funktion nicht klonen.
  const konstantenNamen = Object.keys(konstanten).filter((n) => typeof konstanten[n] !== 'function');
  const konstantenWerte = konstantenNamen.map((n) => konstanten[n]);
  const quelle = baueDepot.toString();
  const koerperStart = quelle.indexOf('{') + 1;
  const koerperEnde = quelle.lastIndexOf('}');
  if (koerperStart <= 0 || koerperEnde <= koerperStart) {
    throw new Error('personaDepotAufbauen: ' + personaId + ' — baueDepot()-Quelltext nicht zerlegbar');
  }
  const koerper = quelle.slice(koerperStart, koerperEnde);

  await page.evaluate(async ({ koerper, konstantenNamen, konstantenWerte, personaId }) => {
    const V = window.__vdOeffentlich || window;
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const vorspann = konstantenNamen.length
      ? 'const [' + konstantenNamen.join(',') + '] = __konstantenWerte;\n'
      : '';
    let fn;
    try {
      fn = new AsyncFunction('V', '__konstantenWerte', vorspann + koerper);
    } catch (e) {
      throw new Error(personaId + ': baueDepot()-Körper im Browser nicht konstruierbar — '
        + String((e && e.message) || e));
    }
    await fn(V, konstantenWerte);
    if (typeof V.renderContent === 'function') V.renderContent();
  }, { koerper, konstantenNamen, konstantenWerte, personaId });
}

/* ── Geburtsdatum-Schreibwege (23.09.2026) — EIN Ort für die Klickfolge, ZWEI
   Verwender: `tools/produkt-durchklick-messen.js` (Abnahme-Durchklick, läuft nur auf Anruf) UND
   `tests/e2e/durchklick-abnahme-geburtsdatum-schreibwege.spec.js` (Behauptung, läuft bei jedem
   Push). Ein Werkzeug-Modus allein hätte das 14.09.-Muster (ein Schreibweg verliert ein Feld,
   niemand merkt es vor dem nächsten freiwilligen Durchklick) nicht verhindert — nur eine Probe
   in der Suite tut das. */
async function geburtsdatumSchluesselFuer(page, name) {
  return page.evaluate((name) => {
    const menschen = window.__vdOeffentlich.ankerDaten().menschen || [];
    const p = menschen.find((m) => m && m.name === name);
    if (!p) return { gefunden: false };
    const schluessel = ['geburtsdatum', 'birthDate'].filter((k) => p[k] != null && p[k] !== '');
    return { gefunden: true, schluessel, wert: schluessel.map((k) => p[k]) };
  }, name);
}

// Register-Formular: [data-person-hinzufuegen] → Name+Geburtsdatum → #m-ok. Erwartet ein bereits
// per UI angelegtes, leeres Depot auf `page`. Meldet `erreichbar:false`, wenn dieses Produkt
// keinen Sektor `people` trägt (Pro) — kein Timeout, ein schneller DOM-Vorabtest.
async function registerFormularGeburtsdatumWeg(page, { name = 'Formular Testperson', geburtsdatum = '1990-05-12' } = {}) {
  const { oeffneSektor } = require('./helpers.js');
  if (!(await page.locator('[data-sektor="people"]').count())) {
    return { weg: 'register-formular', erreichbar: false, grund: 'Sektor people nicht im DOM — dieses Produkt trägt ihn nicht' };
  }
  try {
    await oeffneSektor(page, 'people');
    await page.locator('[data-person-hinzufuegen]').first().click();
    await page.fill('[data-edit="name"]', name);
    // Feld-Id im Register-Formular selbst (Fund 23.09.2026, gegen Schema 88 gemessen): die
    // Landung benennt MENSCHEN_REGISTER_FELD von `geburtsdatum` auf `birthDate` um — die
    // Klickfolge dieses Helfers bleibt über die Umstellung hinweg lauffähig, indem sie BEIDE
    // Feld-Ids probiert, statt einen festen Namen anzunehmen. „Beide probieren" darf aber
    // einen STEHENGEBLIEBENEN alten Feld-Zwilling nicht verdecken (23.09.2026) — darum
    // wird VOR dem Füllen gezählt, welche der beiden Ids im DOM stehen, und das Ergebnis
    // zurückgegeben; die Spec behauptet darauf „genau eine, und zwar birthDate".
    const feldIdsGefunden = [];
    if (await page.locator('[data-sub-zeile="birthDate"] input, [data-edit="birthDate"]').count()) feldIdsGefunden.push('birthDate');
    if (await page.locator('[data-sub-zeile="geburtsdatum"] input, [data-edit="geburtsdatum"]').count()) feldIdsGefunden.push('geburtsdatum');
    await page.fill('[data-sub-zeile="birthDate"] input, [data-edit="birthDate"], [data-sub-zeile="geburtsdatum"] input, [data-edit="geburtsdatum"]', geburtsdatum);
    await page.click('#m-ok');
    return { weg: 'register-formular', erreichbar: true, feldIdsGefunden, ...(await geburtsdatumSchluesselFuer(page, name)) };
  } catch (e) {
    return { weg: 'register-formular', erreichbar: false, grund: String((e && e.message) || e).slice(0, 200) };
  }
}

// Geburts-Assistent (gebwiz): Anlass „geburt" → 6 Vorschritte → Name → Geburtsdatum → Verhältnis
// → Fertig, Sub-Depot-Vorschlag ablehnen. Erwartet ein bereits per UI angelegtes, leeres Depot.
async function gebwizGeburtsdatumWeg(page, { name = 'Gebwiz Testkind', geburtsdatum = '2027-03-15' } = {}) {
  try {
    await page.click('[data-anlass-auswahl]');
    await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible', timeout: 5000 });
    await page.click('[data-anlass="geburt"]');
    await page.waitForSelector('.wizard-frage', { state: 'visible', timeout: 5000 });
    for (let i = 0; i < 6; i++) await page.click('#wiz-weiter');
    const nameFeld = page.locator('#content [data-edit="guidedBirthEntryChildsNameNot"]');
    if (!(await nameFeld.count())) {
      return { weg: 'gebwiz', erreichbar: false, grund: 'Namens-Schritt fehlt — Wizard zielt vermutlich auf einen Sektor, den dieses Produkt nicht trägt' };
    }
    await nameFeld.fill(name);
    await page.click('#wiz-weiter');
    await page.fill('#content [data-edit="guidedBirthEntryDateOfBirthNot"]', geburtsdatum);
    await page.click('#wiz-weiter');
    await page.selectOption('#content select[data-edit="guidedBirthEntryRelationship"]', 'leiblich');
    await page.click('#wiz-weiter');
    const abbr = page.locator('#m-abbr');
    if (await abbr.isVisible({ timeout: 2000 }).catch(() => false)) await abbr.click();
    return { weg: 'gebwiz', erreichbar: true, ...(await geburtsdatumSchluesselFuer(page, name)) };
  } catch (e) {
    return { weg: 'gebwiz', erreichbar: false, grund: 'Anlass „geburt" nicht startbar: ' + String((e && e.message) || e).slice(0, 200) };
  }
}

module.exports = {
  allePersonaKennungen, fixturePfadFuer, personaDepotAufbauen, echtesProduktUrl,
  geburtsdatumSchluesselFuer, registerFormularGeburtsdatumWeg, gebwizGeburtsdatumWeg,
};
