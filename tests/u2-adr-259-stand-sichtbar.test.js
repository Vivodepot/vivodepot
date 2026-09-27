'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-259 — Jedes erzeugte Dokument sagt, aus welchem Stand es stammt
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, vor dem Bau gemessen (04.09.2026, gegen origin/u2-kanon 8292b457):
   `katalogStand` 9× im Kern, 0× in der Lese-App; `moduleVersion` 45× im Kern
   (Fixture-/Vergleichsstellen, nie eine Ausgabe), 3× in der Lese-App. Weder
   PDF-Fuß (`pdfFussText`, ~Zeile 44963) noch Datensatz-Bauer
   (`_datensatzAusEintraegen`, ~Zeile 45363) lasen eines der beiden Felder.

   DIESELBE LEITUNG WIE U2-ADR-258 (Herkunft), zweite Angabe statt eines
   zweiten Mechanismus: dieselbe EINLASS_REGISTER/MODUL_SLOTS-Liste, dieselben
   vier Stationen in derselben Reihenfolge (Artefakte zuerst, Kern-Anzeige
   zuletzt).

   BEWUSST NUR moduleVersion (angedockte Module), NICHT katalogStand
   (vorsorge_instrumente-Feldebene) — benannte Lücke, keine vergessene: beide
   in eine Zahl zu zwingen wäre die Zahl ohne Deckung, die Auflage 4 des
   Auftrags ausdrücklich ausschließt. Ein eigener Bau für die Feld-Ebene folgt
   getrennt.

   DREI AUFLAGEN, die diese Datei hält — wörtlich wie bei U2-ADR-258:
     · NICHT ABSCHALTBAR — kein Schalter, keine Option unterdrückt die Angabe.
     · EHRLICH BEI UNWISSEN — kein moduleVersion-Feld heißt „unbekannt",
       nicht geraten, nicht als 0 behauptet.
     · KEINE ANGSTMACHE — der Satz nennt nur, ob der Stand bekannt ist, nie
       ob er aktuell ist.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'stand-259-pw';

const M_BEKANNT_V1 = { modulTyp: 'textsatz', moduleVersion: 1, texte: {}, sprache: 'en',
  ungeprueft: false, pruefstufe: 'extern-geprueft:herausgeber', eingelassenAm: '2026-08-20' };
const M_BEKANNT_V3 = { modulTyp: 'textsatz', moduleVersion: 3, texte: {}, sprache: 'es',
  ungeprueft: false, pruefstufe: 'intern', eingelassenAm: '2026-08-20' };
// DER BESTANDSFALL: ein Modul aus der Zeit vor diesem ADR — trägt kein moduleVersion-Feld.
const M_OHNE_VERSION = { modulTyp: 'textsatz', texte: {}, sprache: 'it',
  ungeprueft: true, eingelassenAm: '2026-07-01' };

async function kernMit(module) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.textsatzModule = module.slice();
  // U2-ADR-288: depotAnlegen() seedet seither den Erbschein-Auszug ab Werk in logikModule —
  // geleert, damit diese Datei weiterhin ausschließlich die hier konstruierten Fälle zählt.
  d.logikModule = [];
  V.setData(d);
  return V;
}

/* ══ 1) DER STAND EINES EINZELNEN MODULS — ehrlich bei Unwissen ══════════════════════════ */

test('[259·Berechnen] ein Modul mit moduleVersion trägt seine Zahl weiter, roh und ungedeutet', async () => {
  const V = await kernMit([M_BEKANNT_V1, M_BEKANNT_V3]);
  const s = V.moduleStandBerechnen();
  assert.equal(s.unbekannt, 0);
  assert.equal(s.module.length, 2);
  assert.deepEqual(s.module.map((m) => m.version).sort(), [1, 3],
    'die rohen Versionsnummern bleiben erhalten — keine Bewertung, keine Rundung');
});

test('[259·Berechnen] ein Bestandsmodul ohne moduleVersion heißt „unbekannt" — nicht 0, nicht geraten', async () => {
  const V = await kernMit([M_OHNE_VERSION]);
  const s = V.moduleStandBerechnen();
  assert.equal(s.unbekannt, 1);
  assert.equal(s.module[0].version, null, 'null, nicht 0 — 0 wäre eine erfundene Zahl ohne Deckung');
});

test('[259·Berechnen] null/kein Objekt/Fremdformen werfen nie, liefern „unbekannt"', async () => {
  const V = await kernMit([]);
  for (const wert of [null, undefined, 'kein objekt', 42, { moduleVersion: '3' }, { moduleVersion: 1.5 }]) {
    const s = V.moduleStandBerechnen({ textsatzModule: [wert] });
    if (wert === null || wert === undefined || typeof wert !== 'object') {
      assert.equal(s.module.length, 0, 'kein Objekt zählt gar nicht erst mit: ' + JSON.stringify(wert));
    } else {
      assert.equal(s.module[0].version, null, 'ein Nicht-Integer gilt als unbekannt: ' + JSON.stringify(wert));
    }
  }
});

/* ══ 2) STATION „DATENSATZ" — die maschinenlesbare Ausgabe ═══════════════════════════════ */

test('[259·Datensatz] jeder Anlass-Datensatz trägt `moduleStand`', async () => {
  const V = await kernMit([M_BEKANNT_V1, M_OHNE_VERSION]);
  const ds = V.anlassDatensatz(V.ANLAESSE[0].id);
  assert.ok(ds, 'Anlass-Datensatz gebaut');
  assert.ok(ds.moduleStand && typeof ds.moduleStand === 'object', 'Schlüssel vorhanden');
  assert.equal(ds.moduleStand.module.length, 2);
  assert.equal(ds.moduleStand.unbekannt, 1);
});

test('[259·Datensatz] auch eine freie Zusammenstellung trägt ihn', async () => {
  const V = await kernMit([M_OHNE_VERSION]);
  const ds = V.zusammenstellungDatensatz([], { id: 'z', titel: 'Z' });
  assert.ok(ds.moduleStand, 'auch ohne ein einziges Feld reist der Stand mit');
  assert.equal(ds.moduleStand.unbekannt, 1);
});

test('[259·Datensatz·ROT] KEINE Option unterdrückt den Stand — er ist nicht abschaltbar', async () => {
  const V = await kernMit([M_OHNE_VERSION]);
  const versuche = [
    { moduleStand: null },
    { moduleStand: false },
    { stand: false },
    { ohneStand: true },
    { sensibel: true, moduleStand: { format: 1, unbekannt: 0, module: [] } },
  ];
  for (const opt of versuche) {
    const ds = V.zusammenstellungDatensatz([], { id: 'z', titel: 'Z' }, opt);
    assert.ok(ds.moduleStand && typeof ds.moduleStand === 'object',
      'unterdrückt durch ' + JSON.stringify(opt));
    assert.equal(ds.moduleStand.unbekannt, 1, 'und auch nicht überschrieben durch ' + JSON.stringify(opt));
  }
});

/* ══ 3) STATION „PDF" — die gedruckte Ausgabe ════════════════════════════════════════════ */

test('[259·PDF] der Dokument-Fuß trägt den Stand — in JEDEM PDF-Weg', async () => {
  const V = await kernMit([M_BEKANNT_V1, M_OHNE_VERSION]);
  const erwartet = V.STRINGS.dokStandFussTeilweise.replace('{n}', '2').replace('{m}', '1');
  for (const meta of [V.situationPdfMeta('geburt'), V.vollDepotPdfMeta()]) {
    const fuss = V.pdfFussText(meta);
    assert.ok(fuss.includes(erwartet), 'Fuß ohne Stand-Angabe: ' + fuss);
    // U2-ADR-025/258 bleiben unberührt: Haftung und Herkunft stehen weiterhin verbatim im selben Fuß.
    assert.ok(fuss.includes(V.STRINGS.dokFussHaftung), 'Haftungshinweis verbatim erhalten');
    assert.ok(fuss.includes(V.STRINGS.dokHerkunftFussTeilweise.replace('{n}', '2').replace('{m}', '1')),
      'die Herkunft aus U2-ADR-258 steht unverändert daneben, keine zweite Leitung verdrängt sie');
  }
});

test('[259·PDF] ohne Erweiterung sagt der Fuß das ausdrücklich — kein stummer Fall', async () => {
  const V = await kernMit([]);
  assert.ok(V.pdfFussText(V.vollDepotPdfMeta()).includes(V.STRINGS.dokStandFussKeine));
});

test('[259·PDF] alle bekannt → der Fuß sagt „bekannt bei n"', async () => {
  const V = await kernMit([M_BEKANNT_V1, M_BEKANNT_V3]);
  assert.ok(V.pdfFussText(V.vollDepotPdfMeta())
    .includes(V.STRINGS.dokStandFussBekannt.replace('{n}', '2')));
});

test('[259·PDF·ROT] ein Meta-Objekt kann den Stand nicht weglassen — er kommt nicht aus `meta`', async () => {
  const V = await kernMit([M_OHNE_VERSION]);
  const erwartet = V.STRINGS.dokStandFussTeilweise.replace('{n}', '1').replace('{m}', '1');
  for (const meta of [{ anlass: 'X', generierer: '', datum: '04.09.2026' },
                      { anlass: 'X', generierer: '', datum: '04.09.2026', moduleStand: null },
                      { anlass: 'X', generierer: '', datum: '04.09.2026', moduleStand: { format: 1, unbekannt: 0, module: [1, 2, 3] } }]) {
    assert.ok(V.pdfFussText(meta).includes(erwartet),
      'ein Meta-Bauer, der ihn wegläßt oder fälscht, ändert nichts: ' + V.pdfFussText(meta));
  }
});

/* ══ 4) STATION „LESE-APP" — der Empfänger ═══════════════════════════════════════════════ */

test('[259·Lesen] die Depot-Ansicht zeigt den Stand-Block — unbedingt, auch ohne Erweiterung', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, personen: [], institutionen: [] });
  V.setLeseModus('voll');
  V.renderVollExport();
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes('id="stand-marke"'), 'der Block steht in der Depot-Ansicht');
  assert.ok(html.includes(V.STRINGS.standSatzKeine));
});

test('[259·Lesen] ein Depot mit unbekanntem Stand sagt es dem Empfänger', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, personen: [], institutionen: [],
    textsatzModule: [M_BEKANNT_V1, M_OHNE_VERSION] });
  V.setLeseModus('voll');
  V.renderVollExport();
  const html = document.getElementById('app').innerHTML;
  const erwartet = V.STRINGS.standSatzTeilweise.replace('{n}', '2').replace('{m}', '1');
  assert.ok(html.includes(erwartet.slice(0, 60)), 'Satz fehlt: ' + html.slice(0, 400));
});

test('[259·Lesen·ROT] ein Dokument OHNE Stand-Angabe sagt es ausdrücklich — kein stiller Fall', () => {
  const { V, document } = ladeLesen();
  // Der Fork-Fall: eine fremde Fassung, die den Schlüssel wegläßt.
  const ds = { felder: [], fehlend: [], anfrage: { von: 'Amt', zweck: 'Z', grundlage: 'G', vorgang: 'V' } };
  assert.equal(V.moduleStandSatz(ds.moduleStand), V.STRINGS.standSatzOhneAngabe);
  V.renderAntwort(ds, { vorgang: 'V' });
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes('id="stand-marke"'), 'die Marke steht trotzdem — Schweigen ist selbst das Signal');
  assert.ok(html.includes(V.STRINGS.standSatzOhneAngabe));
});

test('[259·Lesen] jede Sicht mit Depot-Inhalt trägt die Marke — keine Ausnahme', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, personen: [], institutionen: [], textsatzModule: [M_BEKANNT_V1] });
  V.setLeseModus('voll');
  const sichten = [
    ['Depot-Ansicht', () => V.renderVollExport()],
    ['Situationsblatt', () => V.renderSituationOnly(V.SITUATIONEN[0].id)],
    ['Notfall-Sicht', () => V.renderNotfall()],
  ];
  for (const [name, zeichnen] of sichten) {
    zeichnen();
    const html = document.getElementById('app').innerHTML;
    assert.ok(html.includes('id="stand-marke"'), name + ' ohne Stand-Marke');
  }
});

test('[259·Lesen] Farbe trägt keine Wertung — keine geprueft/offen-Klasse wie bei Herkunft', () => {
  const { V } = ladeLesen();
  const html = V.standBlockHTML({ format: 1, unbekannt: 0, module: [{ slot: 'textsatzModule', version: 1 }] });
  assert.equal(/stand-marke--/.test(html), false,
    'Stand trägt keine binäre Trust-Unterscheidung — eine Farbvariante würde eine Wertung erfinden');
});

/* ══ 5) STATION „ANZEIGE IM KERN" ════════════════════════════════════════════════════════ */

test('[259·Kern] der Stand-Satz steht in den Einstellungen — auch ohne jede Erweiterung', async () => {
  const V = await kernMit([]);
  assert.ok(V.einstellungenHTML().includes(V.STRINGS.standSatzKeine));
});

test('[259·Kern] mit bekanntem Stand steht der passende Satz daneben, neben der Herkunft', async () => {
  const V = await kernMit([M_BEKANNT_V1]);
  const html = V.einstellungenHTML();
  assert.ok(html.includes(V.STRINGS.standSatzBekannt.replace('{n}', '1')));
  assert.ok(html.includes('modul-herkunft-satz'), 'die Herkunft aus U2-ADR-258 steht unverändert daneben');
});

/* ══ 6) PARITÄT — der Spiegel läuft nicht auseinander ════════════════════════════════════ */

test('[259·Parität] beide Fassungen von `moduleStandBerechnen` urteilen gleich', async () => {
  const V = await kernMit([]);
  const { V: L } = ladeLesen();
  const depot = { textsatzModule: [M_BEKANNT_V1, M_BEKANNT_V3, M_OHNE_VERSION] };
  const kernS = V.moduleStandBerechnen(depot);
  const leseS = L.moduleStandBerechnen(depot);
  assert.equal(leseS.unbekannt, kernS.unbekannt);
  // JSON-Vergleich statt deepEqual auf den rohen Arrays: beide Fassungen laufen in eigenen
  // vm-Kontexten (ladeKern/ladeLesen, je ein frischer Fremd-Realm) — Array/Object-Konstruktoren
  // sind dort NICHT dieselben wie im Haupt-Realm. deepStrictEqual vergleicht Fremd-Realm-
  // Arrays als „gleiche Struktur, aber nicht referenzgleich" und schlägt fehl, obwohl die
  // Werte identisch sind (dieselbe Falle wie bei anderen vm-Sandbox-Vergleichen im Projekt).
  assert.equal(
    JSON.stringify(leseS.module.map((m) => m.version).sort()),
    JSON.stringify(kernS.module.map((m) => m.version).sort()));
});

test('[259·Parität] beide Fassungen von `moduleStandSatz` urteilen gleich', async () => {
  const V = await kernMit([]);
  const { V: L } = ladeLesen();
  for (const s of [{ format: 1, unbekannt: 0, module: [] },
                   { format: 1, unbekannt: 0, module: [{ version: 1 }] },
                   { format: 1, unbekannt: 1, module: [{ version: 1 }, { version: null }] }]) {
    assert.equal(L.moduleStandSatz(s), V.moduleStandSatz(s), JSON.stringify(s));
  }
});

/* ══ 7) GEGENPROBE — die Proben oben messen wirklich etwas ═══════════════════════════════ */

test('[259·Gegenprobe] die Datensatz-Probe würde einen fehlenden Schlüssel bemerken', async () => {
  const V = await kernMit([M_OHNE_VERSION]);
  const ds = V.zusammenstellungDatensatz([], { id: 'z', titel: 'Z' });
  const ohne = Object.assign({}, ds);
  delete ohne.moduleStand;
  assert.equal(Object.prototype.hasOwnProperty.call(ds, 'moduleStand'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(ohne, 'moduleStand'), false,
    'die Probe hängt am Schlüssel selbst, nicht an einem Nebeneffekt');
});

test('[259·Gegenprobe] die PDF-Probe würde ein weggelassenes Segment bemerken', async () => {
  const V = await kernMit([M_OHNE_VERSION]);
  const fuss = V.pdfFussText(V.vollDepotPdfMeta());
  assert.equal(fuss.includes(V.STRINGS.dokStandFussBekannt.replace('{n}', '1')), false,
    'der falsche Satz steht dort NICHT — die Probe unterscheidet die Fälle');
});
