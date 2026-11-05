'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   FHIR-IPS-Export: Feld-Auswahl und Sprachwahl zusammen (Probe zur Beobachtung der RbB xshare-l2, 02.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Gefahr: `exportAuswahlEphemerAnwenden` setzt die Sensibel-Markierung für die Dauer von `aufFortfahren` und stellt sie im
   `finally` wieder her. Öffnet `aufFortfahren` nur das Sprachwahl-Modal (ipsExportSpracheWaehlen, ≥ 2 Sprachen) und kehrt
   zurück, läuft der Bau des Bundles erst im Modal-Callback, also NACH der Wiederherstellung — die Auswahl der Person wäre weg.
   Diese Probe fährt den echten Weg: flowGesundheitFhirExport → Übersicht (Teile wählen) → „Herausgeben“ → Sprachwahl →
   kernAPI.exportiere → Datei. Nicht fhirIpsBundle mit opt.sensibel.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeMitAusgabe, warteAufDateien } = require('./ausgabe-fang.js');

const GEWAEHLT = { feld: 'chronicConditionsDiagnoses', marke: 'MARKE-Asthma' };
const ANDERES = { feld: 'allergiesMedicationFoodOther', marke: 'MARKE-Penicillin' };

// Aus dem HTML des zuletzt geöffneten Fensters: die Zeilen der Rückhalte-Liste (data-feld, gehalten ja/nein).
const zeilen = (html) => [...String(html).matchAll(/<div class="export-zz( export-zz-gehalten)?" data-sektor="([^"]+)" data-feld="([^"]+)"/g)]
  .map((m) => ({ gehalten: !!m[1], sektor: m[2], feld: m[3] }));

async function exportFahren(wahlFeld, sprache, vorab) {
  const k = ladeMitAusgabe();
  const V = k.V;
  await V.depotAnlegen('sprachwahl-auswahl-pw-2026');
  V.akteurSelbstErklaeren('T');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  V.sektorFeldSetzen('health', GEWAEHLT.feld, [{ text: GEWAEHLT.marke }]);
  V.sektorFeldSetzen('health', ANDERES.feld, [{ text: ANDERES.marke }]);
  if (vorab) vorab(V);
  assert.ok(V.ipsExportSprachen().length >= 2 && V.ipsExportSprachen().includes(sprache), 'Voraussetzung: Sprachwahl wird angeboten');

  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  const letztes = () => modale[modale.length - 1];
  // Die Übersicht verdrahtet ihre Knöpfe über #modal-inhalt; hier aus dem HTML des letzten Fensters nachgebildet.
  const echt = k.document.getElementById.bind(k.document);
  const knopf = (z) => ({ getAttribute: (n) => (n === 'data-sektor' ? z.sektor : n === 'data-feld' ? z.feld : null), onclick: null });
  let box = null;
  const boxBauen = () => {
    const html = letztes().koerperHTML;
    const knoepfe = zeilen(html).map(knopf);
    const link = /id="exp-zurueckhalten-weg"/.test(html) ? { onclick: null } : null;
    box = { knoepfe, link, querySelector: (s) => (s === '#exp-zurueckhalten-weg' ? link : null), querySelectorAll: (s) => (s === '.export-zz-btn' ? knoepfe : []) };
    return box;
  };
  const sprachFeld = { value: sprache };
  k.document.getElementById = (id) => (id === 'modal-inhalt' ? (modale.length ? boxBauen() : null) : id === 'ips-exportsprache' ? sprachFeld : echt(id));

  V.flowGesundheitFhirExport();
  assert.equal(modale.length, 1, 'die Übersicht öffnet sich');
  // „Etwas zurückhalten“ öffnen, dann jede Zeile auf den gewünschten Zustand klicken: nur wahlFeld geht mit.
  box.link.onclick();
  for (let n = 0; n < 200; n++) {
    const z = zeilen(letztes().koerperHTML).find((x) => x.gehalten === (x.feld === wahlFeld));
    if (!z) break;
    box.knoepfe.find((b) => b.getAttribute('data-feld') === z.feld).onclick();
  }
  const rest = zeilen(letztes().koerperHTML);
  assert.ok(rest.find((x) => x.feld === wahlFeld && !x.gehalten), 'Voraussetzung: das gewählte Feld ist angekreuzt (geht mit)');
  assert.ok(rest.find((x) => x.feld !== wahlFeld && x.gehalten), 'Voraussetzung: die übrigen sind zurückgehalten');

  const vorSprachwahl = modale.length;
  // „Herausgeben“ in der Übersicht. Das Versprechen löst erst NACH dem Bau auf (Befund EXPORT-AUSWAHL-VERFAELLT-IM-MODAL):
  // darum nicht abwarten, sondern erst die Sprachwahl bestätigen.
  const uebersichtFertig = letztes().onPrimaer(() => {});
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(modale.length, vorSprachwahl + 1, 'danach öffnet sich das Sprachwahl-Modal');
  assert.match(letztes().koerperHTML, /ips-exportsprache/, 'es ist das Sprachwahl-Modal');
  letztes().onPrimaer(() => {});                                        // Sprache bestätigen
  await uebersichtFertig;
  // Seit L2 (Patient Summary per Link) folgt die Wahl „Herunterladen“ / „Link senden“ (wie beim Anlass-Auszug); hier: Herunterladen.
  for (let n = 0; n < 100 && modale.length < vorSprachwahl + 2; n++) await new Promise((r) => setTimeout(r, 10));
  assert.equal(modale.length, vorSprachwahl + 2, 'danach die Wahl des Ausgabewegs');
  assert.equal(letztes().primaerLabel, V.STRINGS.herunterladenKnopf);
  letztes().onPrimaer(() => {});
  assert.equal(await warteAufDateien(k, 1, 5000), 1, 'genau eine Datei kommt heraus');
  const bundle = JSON.parse((await k.bytes(0)).toString('utf8'));
  return { text: JSON.stringify(bundle), bundle, V };
}

const sprache = (b) => b.entry.find((e) => e.resource.resourceType === 'Composition').resource.language;

for (const sp of ['en', 'de']) {
  test('[IPS·Sprachwahl·Auswahl·' + sp + '] angekreuztes sensibles Feld steht nach der Sprachwahl im Bundle, nicht angekreuztes nicht', async () => {
    const { text, bundle } = await exportFahren(GEWAEHLT.feld, sp);
    assert.equal(sprache(bundle), sp, 'die gewählte Sprache kam an');
    assert.ok(text.includes(GEWAEHLT.marke), 'angekreuzt (' + GEWAEHLT.feld + ') fehlt im Bundle');
    assert.ok(!text.includes(ANDERES.marke), 'nicht angekreuzt (' + ANDERES.feld + ') geht trotzdem mit');
  });

  test('[IPS·Sprachwahl·Auswahl·' + sp + '·Gegenrichtung] nur das andere Feld angekreuzt: dieses steht drin, das erste nicht', async () => {
    const { text } = await exportFahren(ANDERES.feld, sp);
    assert.ok(text.includes(ANDERES.marke), 'angekreuzt (' + ANDERES.feld + ') fehlt im Bundle');
    assert.ok(!text.includes(GEWAEHLT.marke), 'nicht angekreuzt (' + GEWAEHLT.feld + ') geht trotzdem mit');
  });
}

// Kontrolle: die Sonde ist nicht selbst schuld. Baut `aufFortfahren` das Bundle SOFORT (ohne Modal dazwischen), trägt die
// Auswahl: gewähltes Feld drin, anderes nicht. Rot im Test oben + grün hier = der Verlust entsteht zwischen Wahl und Bau.
test('[IPS·Sprachwahl·Auswahl·Kontrolle] ohne Modal zwischen Auswahl und Bau trägt die Auswahl (Sonde und Marken stimmen)', async () => {
  const { V } = ladeMitAusgabe();
  await V.depotAnlegen('sprachwahl-auswahl-pw-2026');
  V.akteurSelbstErklaeren('T');
  V.sektorFeldSetzen('health', GEWAEHLT.feld, [{ text: GEWAEHLT.marke }]);
  V.sektorFeldSetzen('health', ANDERES.feld, [{ text: ANDERES.marke }]);
  let text = null;
  await V.exportAuswahlEphemerAnwenden(
    [{ sektor: 'health', feld: GEWAEHLT.feld }, { sektor: 'health', feld: ANDERES.feld }],
    new Set(['health/' + GEWAEHLT.feld]),
    (opt) => { text = JSON.stringify(V.fhirIpsBundle(undefined, opt)); });
  assert.ok(text.includes(GEWAEHLT.marke) && !text.includes(ANDERES.marke));
});

/* „Zu viel“: alle neun Gesundheitsfelder, die fhirIpsBundle liest (fhirIpsBundle, Liste g), sind im Schema sensibel; die einzigen
   Schema-Felder ohne sensibel (emergencyContacts, healthInsuranceCards) liest der Bauer nicht. Zu viel kann also nur eintreten,
   wenn die Person ein Schema-Feld ausdrücklich auf „nicht sensibel“ gestellt hat (feldIstSensibel: ihre Entscheidung gewinnt):
   dann startet es als „geht mit“, sie hält es in der Übersicht zurück — und nach der Wiederherstellung geht es doch hinaus. */
for (const sp of ['en', 'de']) {
  test('[IPS·Sprachwahl·Auswahl·' + sp + '·Zu-viel] ausdrücklich „nicht sensibel“ gestelltes, in der Übersicht zurückgehaltenes Feld bleibt draußen', async () => {
    const { text } = await exportFahren(ANDERES.feld, sp, (V) => V.sensibelFeldSetzen('health', GEWAEHLT.feld, false));
    assert.ok(!text.includes(GEWAEHLT.marke), 'zurückgehalten (' + GEWAEHLT.feld + ') geht trotzdem mit');
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Befund EXPORT-AUSWAHL-VERFAELLT-IM-MODAL — die ganze Klasse (02.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Jeder Weg, den die Übersicht über `aufFortfahren` ruft, muss die Auswahl bis zum BAU halten. Öffnet er vor dem Bau ein Modal
   (Sprachwahl, Urschrift-Frage, Vereinbarung), muss sein Versprechen erst nach dem Bau auflösen — auch beim Abbruch.
   Getrieben wird jeder Aufrufer mit offenem Modal: Übersicht → Auswahl → „Herausgeben“ → das Modal bleibt offen → die Auswahl
   steht noch (nur das gewählte Feld ist nicht sensibel) → Abschluss → zum Zeitpunkt des Baus steht sie noch → danach ist die
   persistente Markierung exakt wiederhergestellt. Der Bau-Zeitpunkt wird an einer Kopie des Kerns mit Spion gemessen.
   WÄCHTER: Die Aufrufer von flowExportUebersicht und von exportAuswahlEphemerAnwenden stehen unten in einer Positivliste;
   ein neuer Aufrufer ohne Eintrag macht die Probe rot. Die Art „treibt“ verlangt, dass diese Datei ihn getrieben hat.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const KERN = fs.readFileSync(KERN_PFAD, 'utf8');
const GETRIEBEN = new Set();
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

function kernMitSpion() {
  const ersetze = (t, alt, neu) => { assert.equal(t.split(alt).length, 2, 'Vorbedingung, genau einmal im Kern: ' + alt); return t.replace(alt, neu); };
  let t = KERN;
  // 1) mitVereinbarung: unmittelbar vor dem Bau (fortfahren) 2) EUDIW: vor def.baue 3) ISiK: vor isikDokumente; das Tor ist hier offen.
  t = ersetze(t, 'if (vb) return fortfahren(vb); });', 'if (vb) { if (window.__bauSpion) window.__bauSpion(); return fortfahren(vb); } });');
  t = ersetze(t, 'try { vc = def.baue(optionen || {}); } catch (e) { vc = null; }', 'if (window.__bauSpion) window.__bauSpion(); try { vc = def.baue(optionen || {}); } catch (e) { vc = null; }');
  t = ersetze(t, 'const r = isikDokumente(undefined, { sensibel: !!(opt && opt.sensibel), urschriftBestaetigt: opt && opt.urschriftBestaetigt });', 'if (window.__bauSpion) window.__bauSpion(); const r = isikDokumente(undefined, { sensibel: !!(opt && opt.sensibel), urschriftBestaetigt: opt && opt.urschriftBestaetigt });');
  t = ersetze(t, 'function isikErlaubnisFehlt(opt) {', 'function isikErlaubnisFehlt(opt) { return [];');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-auswahl-spion-'));
  const p = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(p, t);
  process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} });
  return p;
}
let _spionPfad = null;

// Treibt eine Übersicht bis zum zweiten Modal. Gibt zurück, was die Abschlüsse brauchen.
async function bisZweitesModal({ vorbereiten, start }) {
  _spionPfad = _spionPfad || kernMitSpion();
  const k = ladeMitAusgabe({ htmlPfad: _spionPfad, backen: true });
  const V = k.V;
  await V.depotAnlegen('auswahl-klasse-pw-2026');
  V.akteurSelbstErklaeren('T');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  V.sektorFeldSetzen('health', GEWAEHLT.feld, [{ text: GEWAEHLT.marke }]);
  V.sektorFeldSetzen('health', ANDERES.feld, [{ text: ANDERES.marke }]);
  if (vorbereiten) await vorbereiten(V);
  const vorher = JSON.stringify(V.getData().sensibelFelder || {});

  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  const letztes = () => modale[modale.length - 1];
  const echt = k.document.getElementById.bind(k.document);
  const knopf = (z) => ({ getAttribute: (n) => (n === 'data-sektor' ? z.sektor : n === 'data-feld' ? z.feld : null), onclick: null });
  let box = null;
  const feldAttrappe = () => new Proxy({ value: 'Probe', textContent: '', classList: { add() {}, remove() {}, contains: () => false }, style: {} }, { get: (t, p) => (p in t ? t[p] : () => null), set: (t, p, v) => { t[p] = v; return true; } });
  k.document.getElementById = (id) => {
    if (id === 'modal-inhalt' && modale.length) {
      const html = letztes().koerperHTML;
      const knoepfe = zeilen(html).map(knopf);
      const link = /id="exp-zurueckhalten-weg"/.test(html) ? { onclick: null } : null;
      box = { knoepfe, link, querySelector: (s) => (s === '#exp-zurueckhalten-weg' ? link : null), querySelectorAll: (s) => (s === '.export-zz-btn' ? knoepfe : []) };
      return box;
    }
    if (/^up-/.test(id)) return feldAttrappe();
    return echt(id);
  };
  const baustand = [];
  k.window.__bauSpion = () => { baustand.push(auswahlStand(V, zeile)); };
  let zeile = null;
  const ergebnis = start(V);
  assert.equal(modale.length, 1, 'die Übersicht öffnet sich');
  box.link.onclick();
  const alle = zeilen(letztes().koerperHTML);
  assert.ok(alle.length >= 2, 'mindestens zwei Zeilen in der Übersicht, sonst ist die Auswahl nicht prüfbar');
  const W = alle.find((x) => x.feld === GEWAEHLT.feld) || alle[0];
  zeile = { gewaehlt: W, anderes: alle.find((x) => x !== W) };
  for (let n = 0; n < 300; n++) {
    const z = zeilen(letztes().koerperHTML).find((x) => x.gehalten === (x.feld === W.feld && x.sektor === W.sektor));
    if (!z) break;
    box.knoepfe.find((b) => b.getAttribute('data-feld') === z.feld && b.getAttribute('data-sektor') === z.sektor).onclick();
  }
  const uebersichtFertig = letztes().onPrimaer(() => {});
  for (let n = 0; n < 100 && modale.length < 2; n++) await tick(10);
  assert.ok(modale.length >= 2, 'nach „Herausgeben“ öffnet sich das Modal des Wegs');
  return { k, V, modale, letztes, uebersichtFertig, vorher, zeile, baustand, ergebnis, get box() { return box; } };
}
// Zustand der Auswahl: das gewählte Feld ist nicht sensibel (geht mit), das andere ist es (bleibt zurück).
function auswahlStand(V, z) {
  // Während des Exports setzt die Auswahl für JEDEN Kandidaten eine ausdrückliche Überschreibung (V.feldSensibelUeberschreibung).
  const m = (V.getData().sensibelFelder || {});
  const ue = (r) => (m[r.sektor] && Object.prototype.hasOwnProperty.call(m[r.sektor], r.feld)) ? !!m[r.sektor][r.feld] : undefined;
  return { gewaehltMit: ue(z.gewaehlt) === false, anderesZurueck: ue(z.anderes) === true };
}
const AUSWAHL_STEHT = { gewaehltMit: true, anderesZurueck: true };
function offenPruefen(t, wo) { assert.deepEqual(auswahlStand(t.V, t.zeile), AUSWAHL_STEHT, wo + ': solange das Modal offen ist, steht die Auswahl noch'); }
async function endePruefen(t, wo, { gebaut }) {
  await Promise.race([t.uebersichtFertig, tick(3000).then(() => { throw new Error(wo + ': das Versprechen der Übersicht löst nicht auf (Markierung hängt)'); })]);
  assert.equal(JSON.stringify(t.V.getData().sensibelFelder || {}), t.vorher, wo + ': die persistente Markierung ist wiederhergestellt');
  assert.equal(t.baustand.length, gebaut ? 1 : 0, wo + (gebaut ? ': genau ein Bau' : ': kein Bau'));
  for (const s of t.baustand) assert.deepEqual(s, AUSWAHL_STEHT, wo + ': zum Zeitpunkt des Baus steht die Auswahl');
}

/* ISiK: Urschrift-Frage (urschrift-unbestaetigt). Das Tor ist in der Kopie offen; die Sprache ist hier ohne Gewicht, der ISiK-Bau kennt keine Sprachwahl. */
for (const weg of ['ja', 'nein', 'abbruch']) {
  test('[Auswahl·Klasse·ISiK·' + weg + '] Urschrift-Frage offen: Auswahl steht bis zum Bau, Versprechen löst auf', async () => {
    const t = await bisZweitesModal({
      vorbereiten: (V) => {
        const mappeId = V.mappeEintragHinzufuegen({ beschriftung: 'Vollmacht', dateiname: 'v.pdf', mime: 'application/pdf', groesse: 100, bereich: 'advanceCare',
          inhalt: 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\nScan\n%%EOF').toString('base64') });
        const doc = V.dokumentAnlegen({ typ: 'enduring-power-of-attorney', sektorId: 'advanceCare', name: 'Vorsorgevollmacht', gueltigAb: '2025-03-01' });
        V.dokumentSetzen(doc.id, 'mappeRef', { ref: mappeId });
      },
      start: (V) => V.flowIsikExport(),
    });
    assert.equal(t.letztes().primaerLabel, t.V.STRINGS.isikUrschriftJa, 'es ist die Urschrift-Frage');
    offenPruefen(t, 'ISiK');
    if (weg === 'ja') t.letztes().onPrimaer(() => {});
    else if (weg === 'nein') t.letztes().zweitAktion.handler(() => {});
    else t.letztes().onAbbrechen();
    await endePruefen(t, 'ISiK/' + weg, { gebaut: weg !== 'abbruch' });
    GETRIEBEN.add('flowIsikExport');
  });
}

/* Wege mit Vereinbarung (Festlegung gesetzt → `mitVereinbarung` wartet auf den Dialog): Anlass, Bereichs-PDF, Zusammenstellung, EUDIW,
   dazu der IPS-Weg selbst. Abschluss: Abbruch (kein Bau) oder „Ohne Bedingung weitergeben“ (Bau). */
async function vereinbarungsWeg(name, start, { vorbereiten } = {}) {
  for (const weg of ['abbruch', 'ohne-bedingung']) {
    const t = await bisZweitesModal({ vorbereiten: async (V) => { await V.bedingungFestlegen('SD-BASE', 'PDC-AI'); if (vorbereiten) await vorbereiten(V); }, start });
    assert.equal(t.letztes().titel, t.V.STRINGS.vereinbarungTitel, name + ': das zweite Modal ist der Vereinbarungs-Dialog');
    offenPruefen(t, name);
    if (weg === 'abbruch') t.letztes().onAbbrechen();
    else {
      t.letztes().drittAktion.handler(() => {});                   // „Ohne Bedingung weitergeben“ → Rückfrage
      assert.equal(t.letztes().primaerLabel, t.V.STRINGS.vereinbarungOhneJa);
      offenPruefen(t, name + '/Rückfrage');
      t.letztes().onPrimaer(() => {});
    }
    await endePruefen(t, name + '/' + weg, { gebaut: weg !== 'abbruch' });
  }
  GETRIEBEN.add(name);
}
test('[Auswahl·Klasse·Vereinbarung·flowGesundheitFhirExport] Sprachwahl, dann Vereinbarung offen', async () => {
  // Zweites Modal ist hier die Sprachwahl; die Vereinbarung folgt. Getrieben bis zum Vereinbarungs-Dialog.
  for (const weg of ['abbruch', 'ohne-bedingung']) {
    const t = await bisZweitesModal({ vorbereiten: (V) => V.bedingungFestlegen('SD-BASE', 'PDC-AI'), start: (V) => V.flowGesundheitFhirExport() });
    assert.match(t.letztes().koerperHTML, /ips-exportsprache/);
    const sp = t.V.ipsExportSprachen()[0];
    t.k.document.getElementById = ((alt) => (id) => (id === 'ips-exportsprache' ? { value: sp } : alt(id)))(t.k.document.getElementById);
    t.letztes().onPrimaer(() => {});
    for (let n = 0; n < 100 && t.letztes().titel !== t.V.STRINGS.vereinbarungTitel; n++) await tick(10);
    assert.equal(t.letztes().titel, t.V.STRINGS.vereinbarungTitel);
    offenPruefen(t, 'IPS/Vereinbarung');
    if (weg === 'abbruch') t.letztes().onAbbrechen();
    else { t.letztes().drittAktion.handler(() => {}); t.letztes().onPrimaer(() => {}); }
    await endePruefen(t, 'IPS/Vereinbarung/' + weg, { gebaut: weg !== 'abbruch' });
  }
  GETRIEBEN.add('flowGesundheitFhirExport');
});
test('[Auswahl·Klasse·Vereinbarung·flowBereichPdf] Vereinbarung offen', async () => {
  await vereinbarungsWeg('flowBereichPdf', (V) => V.flowBereichPdf('health'));
});
test('[Auswahl·Klasse·Vereinbarung·flowAnlassExport] Vereinbarung offen', async () => {
  let anlass = null;
  await vereinbarungsWeg('flowAnlassExport', (V) => V.flowAnlassExport(anlass), { vorbereiten: (V) => {
    anlass = (V.ANLAESSE.find((a) => V.anlassKennungen(a.id).some((kn) => /^health\./.test(kn))) || V.ANLAESSE[0]).id;
  } });
});
test('[Auswahl·Klasse·Vereinbarung·flowZusammenstellungHerausgeben] Vereinbarung offen', async () => {
  await vereinbarungsWeg('flowZusammenstellungHerausgeben', (V) => V.flowZusammenstellungHerausgeben(['health.' + GEWAEHLT.feld, 'health.' + ANDERES.feld], 'Probe'));
});
test('[Auswahl·Klasse·Vereinbarung·flowEudiwUebergabe] Vereinbarung offen (wartet im aufFortfahren selbst)', async () => {
  await vereinbarungsWeg('flowEudiwUebergabe', (V) => V.flowEudiwUebergabe('identity'));
});

/* ── Wächter: die Aufrufer ─────────────────────────────────────────────────── */
const AUFRUFER_UEBERSICHT = {
  flowGesundheitFhirExport: { art: 'treibt', grund: 'Sprachwahl vor dem Bau (Modal), danach Vereinbarung' },
  flowIsikExport: { art: 'treibt', grund: 'Urschrift-Frage vor dem Bau (Modal)' },
  flowAnlassExport: { art: 'treibt', grund: 'Bau erst im Callback von mitVereinbarung' },
  flowBereichPdf: { art: 'treibt', grund: 'Bau erst im Callback von mitVereinbarung' },
  flowZusammenstellungHerausgeben: { art: 'treibt', grund: 'Bau erst im Callback von mitVereinbarung' },
  flowEudiwUebergabe: { art: 'treibt', grund: 'Vereinbarung vor dem Bau, aufFortfahren gibt das Versprechen von _eudiwAusgeben zurück' },
  flowKbvPkaExport: { art: 'synchron', grund: 'kbvPkaVollmacht baut die Bundles vor mitVereinbarung und vor dem Hinweis-Modal',
    belege: [/const r = kbvPkaVollmacht\(undefined, \{ sensibel: !!\(opt && opt\.sensibel\) \}\);[\s\S]{0,400}mitVereinbarung\('kbv-pka'/] },
  flowVollDepotPdf: { art: 'synchron', grund: 'vollDepotModell(opt) steht am Anfang von bauen, vor jedem Dialog',
    belege: [/const bauen = \(opt\) => \{\s*const modell = vollDepotModell\(opt\);/] },
  flowFormatExport: { art: 'synchron', grund: 'der Anhang-Dialog (_formatAnhangWahl) erscheint nur bei def.anhaenge; kein Format der Registry hat welche; der Weg hält die Auswahl über sein Versprechen trotzdem',
    belege: [/new Promise\(\(fertig, scheitern\) => \{[^\n]*\n\s*const r = _formatAnhangWahl\(/] },
  _anfrageHerausgeben: { art: 'wartet', grund: 'aufFortfahren ist async und baut selbst (anfrageAntwortDatensatzGeprueft); die Übersicht wartet darauf',
    belege: [/aufFortfahren: async \(o\) => \{\s*const ds = await anfrageAntwortDatensatzGeprueft\(umschlag, o\);/] },
};
function aufruferVon(muster, text = KERN) {
  const treffer = new Set();
  const re = new RegExp(muster, 'g');
  let m;
  while ((m = re.exec(text))) {
    const davor = text.slice(0, m.index);
    const fn = [...davor.matchAll(/^(?:async )?function\s+([A-Za-z0-9_]+)\s*\(/gm)].pop();
    treffer.add(fn ? fn[1] : '?');
  }
  return [...treffer].sort();
}
test('[Auswahl·Klasse·Wächter] jeder Aufrufer von flowExportUebersicht steht in der Positivliste, jeder „treibt“ wurde hier getrieben', () => {
  const ist = aufruferVon('(?<![A-Za-z_])flowExportUebersicht\\(\\{').filter((n) => n !== 'flowExportUebersicht');
  assert.deepEqual(ist, Object.keys(AUFRUFER_UEBERSICHT).sort(), 'ein neuer (oder entfernter) Aufrufer von flowExportUebersicht: erst treiben oder als „baut synchron“ begründen');
  for (const [name, e] of Object.entries(AUFRUFER_UEBERSICHT)) {
    assert.ok(['treibt', 'synchron', 'wartet'].includes(e.art) && e.grund, name + ': Art und Grund');
    if (e.art === 'treibt') assert.ok(GETRIEBEN.has(name), name + ' ist als „treibt“ eingetragen, wurde aber nicht getrieben');
    for (const b of e.belege || []) assert.ok(b.test(KERN), name + ': der Beleg für „' + e.art + '“ steht nicht mehr im Kern');
  }
  assert.equal((KERN.match(/\banhaenge:\s*\[/g) || []).length, 0, 'ein Format der Registry hat jetzt Anhänge: flowFormatExport treiben');
});
test('[Auswahl·Klasse·Wächter] exportAuswahlEphemerAnwenden rufen nur die zwei Zweige von flowExportUebersicht, mit dem Versprechen von aufFortfahren', () => {
  assert.deepEqual(aufruferVon('(?<![A-Za-z_])await exportAuswahlEphemerAnwenden\\(').sort(), ['flowExportUebersicht']);
  assert.equal((KERN.match(/await exportAuswahlEphemerAnwenden\(/g) || []).length, 2, 'ein weiterer Aufruf: Positivliste erweitern und treiben');
  assert.ok(/await Promise\.resolve\(aufFortfahren\(\{ sensibel: false, _zurueckgehaltenAnzahl: zurueckgehaltenAnzahl \}\)\);\s*\}\s*finally \{/.test(KERN), 'das finally wartet auf aufFortfahren');
});

test('[Auswahl·Klasse·Wächter·Rot-Beweis] ein gepflanzter neuer Aufrufer fällt auf, ebenso ein finally, das nicht wartet', () => {
  const gepflanzt = KERN + '\nfunction flowGepflanzterExport() {\n  flowExportUebersicht({ titel: 1, aufFortfahren: () => {} });\n}\n';
  const ist = aufruferVon('(?<![A-Za-z_])flowExportUebersicht\\(\\{', gepflanzt).filter((n) => n !== 'flowExportUebersicht');
  assert.notDeepEqual(ist, Object.keys(AUFRUFER_UEBERSICHT).sort(), 'der gepflanzte Aufrufer muss die Positivliste sprengen');
  assert.ok(ist.includes('flowGepflanzterExport'));
  const ohneWarten = KERN.replace('await Promise.resolve(aufFortfahren({ sensibel: false, _zurueckgehaltenAnzahl: zurueckgehaltenAnzahl }));',
    'aufFortfahren({ sensibel: false, _zurueckgehaltenAnzahl: zurueckgehaltenAnzahl });');
  assert.notEqual(ohneWarten, KERN, 'die Pflanzstelle muss im Kern stehen');
  assert.ok(!/await Promise\.resolve\(aufFortfahren\(\{ sensibel: false, _zurueckgehaltenAnzahl: zurueckgehaltenAnzahl \}\)\);\s*\}\s*finally \{/.test(ohneWarten),
    'ein finally ohne Warten muss den Beleg verlieren');
});
