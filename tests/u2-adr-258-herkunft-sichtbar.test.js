'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-258 — Die Herkunft eines Moduls wird beim Empfänger sichtbar
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, vor dem Bau gemessen (04.09.2026, gegen origin/u2-kanon dfe31362):

       ungeprueft / pruefstufe        vivodepot.html   vivodepot-lesen.html
       Vorkommen                          30 / 26              0 / 0

   Und weiter: das LETZTE Vorkommen beider Felder im Kern lag bei Zeile ~38024
   (Einstellungen-Anzeige); der erste PDF-Zeichenweg beginnt bei ~41220, der
   Datensatz-Bauer bei ~44928. Beide Felder erreichten also WEDER den PDF- noch
   den Export-Weg — die Kennzeichnung lebte allein in der Anzeige und verließ
   das Gerät nie.

   VIER STATIONEN, und die Reihenfolge ist die des Nachtrags vom
   04.09.2026: das ARTEFAKT zuerst (PDF, Datensatz), dann die Lese-App, die
   Anzeige im Kern zuletzt. Der Empfangspunkt bewertet Dokumente, keine
   Anwendungen.

   DREI AUFLAGEN, die diese Datei hält:
     · NICHT ABSCHALTBAR — kein Schalter, keine Einstellung, kein Parameter
       unterdrückt die Angabe. Der Rot-Teil unten fährt jeden Ausgabeweg mit
       Optionen, die genau das versuchen.
     · EHRLICH IN BEIDE RICHTUNGEN — „geprüft" nur, wo wirklich eine Signatur
       geprüft wurde; fehlt die Information, heißt sie „unbekannt".
     · OHNE KENNZEICHNUNG GILT UNGEPRÜFT — nur ein ausdrückliches „geprüft"
       zählt als geprüft. Fehlend, leer, unbekannt, fremdgeformt: nichts davon.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'herkunft-258-pw';

const M_GEPRUEFT = { modulTyp: 'textsatz', moduleVersion: 1, texte: {}, sprache: 'en',
  ungeprueft: false, pruefstufe: 'extern-geprueft:herausgeber', eingelassenAm: '2026-08-20' };
const M_INTERN = { modulTyp: 'textsatz', moduleVersion: 1, texte: {}, sprache: 'es',
  ungeprueft: false, pruefstufe: 'intern', eingelassenAm: '2026-08-20' };
const M_UNSIGNIERT = { modulTyp: 'textsatz', moduleVersion: 1, texte: {}, sprache: 'fr',
  ungeprueft: true, eingelassenAm: '2026-08-21' };
const M_NICHT_ANERKANNT = { modulTyp: 'textsatz', moduleVersion: 1, texte: {}, sprache: 'nl',
  ungeprueft: false, pruefstufe: 'extern-ungeprueft', eingelassenAm: '2026-08-21' };
// DER BESTANDSFALL: ein Modul aus einem Depot, das VOR dieser Änderung entstand — gar keine Marke.
const M_BESTAND = { modulTyp: 'textsatz', moduleVersion: 1, texte: {}, sprache: 'it',
  eingelassenAm: '2026-08-22' };

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

/* ══ 1) DER STAND EINES EINZELNEN MODULS — ehrlich in beide Richtungen ═══════════════════ */

test('[258·Stand] ein signiertes Modul mit anerkannter Kette heißt „geprueft"', async () => {
  const V = await kernMit([]);
  assert.equal(V.modulHerkunftStand(M_GEPRUEFT), 'geprueft');
  assert.equal(V.modulHerkunftStand(M_INTERN), 'geprueft');
});

test('[258·Stand] ein selbst eingelassenes Modul heißt „ungeprueft"', async () => {
  const V = await kernMit([]);
  assert.equal(V.modulHerkunftStand(M_UNSIGNIERT), 'ungeprueft');
});

test('[258·Stand] signiert, aber Kette nicht anerkannt → „ungeprueft", NICHT „geprueft"', async () => {
  const V = await kernMit([]);
  assert.equal(V.modulHerkunftStand(M_NICHT_ANERKANNT), 'ungeprueft',
    'eine Signatur, die bei niemandem Anerkanntem endet, ist keine geprüfte Herkunft');
});

test('[258·Stand] ein Bestandsmodul ohne jede Marke heißt „unbekannt" — nicht geprüft, nicht ungeprüft', async () => {
  const V = await kernMit([]);
  assert.equal(V.modulHerkunftStand(M_BESTAND), 'unbekannt');
  assert.equal(V.modulHerkunftStand(null), 'unbekannt');
  assert.equal(V.modulHerkunftStand('kein objekt'), 'unbekannt');
});

/* ══ 2) DIE SEMANTIK DER ABWESENHEIT — nur explizit „geprüft" zählt ══════════════════════ */

test('[258·Abwesenheit] ein fehlender, leerer oder fremdgeformter Befund gilt NIE als geprüft', async () => {
  const V = await kernMit([]);
  for (const wert of [undefined, null, {}, [], 'geprueft', 0, { geprueft: 1 },
                      { geprueft: '3', ungeprueft: 0, unbekannt: 0 }]) {
    assert.equal(V.modulHerkunftGiltAlsGeprueft(wert), false,
      'Schweigen ist selbst das Signal: ' + JSON.stringify(wert));
  }
});

test('[258·Abwesenheit] „unbekannt" ist eine ehrliche Anzeige und zählt trotzdem nicht als geprüft', async () => {
  const V = await kernMit([M_GEPRUEFT, M_BESTAND]);
  const h = V.modulHerkunftBerechnen();
  assert.equal(h.geprueft, 1);
  assert.equal(h.unbekannt, 1);
  assert.equal(V.modulHerkunftGiltAlsGeprueft(h), false,
    'ein einziges unbekanntes Modul nimmt dem ganzen Depot die Aussage „geprüft"');
});

test('[258·Abwesenheit] nur ein reines „alle geprüft" gilt als geprüft', async () => {
  const V = await kernMit([M_GEPRUEFT, M_INTERN]);
  assert.equal(V.modulHerkunftGiltAlsGeprueft(V.modulHerkunftBerechnen()), true);
});

test('[258·Abwesenheit] ein Depot GANZ OHNE Modul gilt nicht als „geprüft" — es gibt nichts zu prüfen', async () => {
  const V = await kernMit([]);
  const h = V.modulHerkunftBerechnen();
  assert.equal(V.modulHerkunftAnzahl(h), 0);
  assert.equal(V.modulHerkunftGiltAlsGeprueft(h), false);
  assert.equal(V.modulHerkunftSatz(h), V.STRINGS.herkunftSatzKeine,
    'der Satz sagt trotzdem etwas: die Angaben stammen ganz aus Vivodepot selbst');
});

/* ══ 3) STATION „DATENSATZ" — die maschinenlesbare Ausgabe ═══════════════════════════════ */

test('[258·Datensatz] jeder Anlass-Datensatz trägt `modulHerkunft`', async () => {
  const V = await kernMit([M_GEPRUEFT, M_UNSIGNIERT, M_BESTAND]);
  const ds = V.anlassDatensatz(V.ANLAESSE[0].id);
  assert.ok(ds, 'Anlass-Datensatz gebaut');
  assert.ok(ds.modulHerkunft && typeof ds.modulHerkunft === 'object', 'Schlüssel vorhanden');
  assert.equal(ds.modulHerkunft.geprueft, 1);
  assert.equal(ds.modulHerkunft.ungeprueft, 1);
  assert.equal(ds.modulHerkunft.unbekannt, 1);
});

test('[258·Datensatz] auch eine freie Zusammenstellung trägt sie', async () => {
  const V = await kernMit([M_UNSIGNIERT]);
  const ds = V.zusammenstellungDatensatz([], { id: 'z', titel: 'Z' });
  assert.ok(ds.modulHerkunft, 'auch ohne ein einziges Feld reist die Herkunft mit');
  assert.equal(ds.modulHerkunft.ungeprueft, 1);
});

test('[258·Datensatz·ROT] KEINE Option unterdrückt die Herkunft — sie ist nicht abschaltbar', async () => {
  const V = await kernMit([M_UNSIGNIERT]);
  const versuche = [
    { modulHerkunft: null },
    { modulHerkunft: false },
    { herkunft: false },
    { ohneHerkunft: true },
    { sensibel: true, modulHerkunft: { geprueft: 99, ungeprueft: 0, unbekannt: 0 } },
  ];
  for (const opt of versuche) {
    const ds = V.zusammenstellungDatensatz([], { id: 'z', titel: 'Z' }, opt);
    assert.ok(ds.modulHerkunft && typeof ds.modulHerkunft === 'object',
      'unterdrückt durch ' + JSON.stringify(opt));
    assert.equal(ds.modulHerkunft.ungeprueft, 1, 'und auch nicht überschrieben durch ' + JSON.stringify(opt));
    assert.equal(V.modulHerkunftGiltAlsGeprueft(ds.modulHerkunft), false);
  }
});

/* ══ 4) STATION „PDF" — die gedruckte Ausgabe ════════════════════════════════════════════ */

test('[258·PDF] der Dokument-Fuß trägt die Herkunft — und zwar in JEDEM PDF-Weg', async () => {
  const V = await kernMit([M_GEPRUEFT, M_UNSIGNIERT]);
  const erwartet = V.STRINGS.dokHerkunftFussTeilweise.replace('{n}', '2').replace('{m}', '1');
  for (const meta of [V.situationPdfMeta('geburt'), V.vollDepotPdfMeta()]) {
    const fuss = V.pdfFussText(meta);
    assert.ok(fuss.includes(erwartet), 'Fuß ohne Herkunft: ' + fuss);
    // U2-ADR-025 bleibt unberührt: der Haftungshinweis steht weiterhin verbatim im selben Fuß.
    assert.ok(fuss.includes(V.STRINGS.dokFussHaftung), 'Haftungshinweis verbatim erhalten');
  }
});

test('[258·PDF] ohne Erweiterung sagt der Fuß das ausdrücklich — kein stummer Fall', async () => {
  const V = await kernMit([]);
  assert.ok(V.pdfFussText(V.vollDepotPdfMeta()).includes(V.STRINGS.dokHerkunftFussKeine));
});

test('[258·PDF] alle geprüft → der Fuß sagt „alle geprüft"', async () => {
  const V = await kernMit([M_GEPRUEFT, M_INTERN]);
  assert.ok(V.pdfFussText(V.vollDepotPdfMeta())
    .includes(V.STRINGS.dokHerkunftFussAlleGeprueft.replace('{n}', '2')));
});

test('[258·PDF·ROT] ein Meta-Objekt kann die Herkunft nicht weglassen — sie kommt nicht aus `meta`', async () => {
  const V = await kernMit([M_UNSIGNIERT]);
  const erwartet = V.STRINGS.dokHerkunftFussTeilweise.replace('{n}', '1').replace('{m}', '1');
  for (const meta of [{ anlass: 'X', generierer: '', datum: '04.09.2026' },
                      { anlass: 'X', generierer: '', datum: '04.09.2026', modulHerkunft: null },
                      { anlass: 'X', generierer: '', datum: '04.09.2026', modulHerkunft: { geprueft: 9, ungeprueft: 0, unbekannt: 0 } }]) {
    assert.ok(V.pdfFussText(meta).includes(erwartet),
      'ein Meta-Bauer, der sie wegläßt oder fälscht, ändert nichts: ' + V.pdfFussText(meta));
  }
});

/* ══ 5) STATION „LESE-APP" — der Empfänger ═══════════════════════════════════════════════ */

test('[258·Lesen] die Lese-App kennt beide Felder überhaupt — vorher null Vorkommen', () => {
  const { html } = ladeLesen();
  assert.ok(/ungeprueft/.test(html), '`ungeprueft` kam in vivodepot-lesen.html vorher 0 Mal vor');
  assert.ok(/pruefstufe/.test(html), '`pruefstufe` kam in vivodepot-lesen.html vorher 0 Mal vor');
});

test('[258·Lesen] die Depot-Ansicht zeigt den Herkunfts-Block — unbedingt, auch ohne Erweiterung', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, personen: [], institutionen: [] });
  V.setLeseModus('voll');
  V.renderVollExport();
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes('id="herkunft-marke"'), 'der Block steht in der Depot-Ansicht');
  assert.ok(html.includes(V.STRINGS.herkunftSatzKeine));
});

test('[258·Lesen] ein Depot mit ungeprüfter Erweiterung sagt es dem Empfänger', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, personen: [], institutionen: [],
    textsatzModule: [M_GEPRUEFT, M_UNSIGNIERT] });
  V.setLeseModus('voll');
  V.renderVollExport();
  const html = document.getElementById('app').innerHTML;
  const erwartet = V.STRINGS.herkunftSatzTeilweise.replace('{n}', '2').replace('{m}', '1');
  assert.ok(html.includes(erwartet.slice(0, 60)), 'Satz fehlt: ' + html.slice(0, 400));
});

test('[258·Lesen] die Antwort auf eine Anfrage zeigt die Herkunft AUS DEM DATENSATZ', () => {
  const { V, document } = ladeLesen();
  const ds = { felder: [], fehlend: [], anfrage: { von: 'Amt', zweck: 'Z', grundlage: 'G', vorgang: 'V' },
    modulHerkunft: { format: 1, geprueft: 0, ungeprueft: 2, unbekannt: 0, module: [] } };
  V.renderAntwort(ds, { vorgang: 'V' });
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes('id="herkunft-marke"'));
  assert.ok(html.includes(V.STRINGS.herkunftSatzTeilweise.replace('{n}', '2').replace('{m}', '2').slice(0, 60)));
});

test('[258·Lesen·ROT] ein Dokument OHNE Herkunftsangabe geht nicht als geprüft durch — es sagt es', () => {
  const { V, document } = ladeLesen();
  // Genau der Fork-Fall: eine fremde Fassung, die den Schlüssel wegläßt.
  const ds = { felder: [], fehlend: [], anfrage: { von: 'Amt', zweck: 'Z', grundlage: 'G', vorgang: 'V' } };
  const m = V.antwortAnzeigeModell(ds, {});
  assert.equal(m.modulHerkunft, null);
  assert.equal(m.herkunftGeprueft, false, 'Schweigen zählt nie als geprüft');
  V.renderAntwort(ds, { vorgang: 'V' });
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes(V.STRINGS.herkunftSatzOhneAngabe),
    'der Empfänger erfährt ausdrücklich, dass keine Angabe vorliegt und das Dokument als ungeprüft gilt');
  assert.ok(html.includes('herkunft-marke--offen'), 'und die Marke steht auf „offen", nicht auf „geprüft"');
});

test('[258·Lesen] jede Sicht mit Depot-Inhalt trägt die Marke — keine Ausnahme, auch nicht die knappste', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: {}, personen: [], institutionen: [], textsatzModule: [M_UNSIGNIERT] });
  V.setLeseModus('voll');
  const sichten = [
    ['Depot-Ansicht', () => V.renderVollExport()],
    ['Situationsblatt', () => V.renderSituationOnly(V.SITUATIONEN[0].id)],
    ['Notfall-Sicht', () => V.renderNotfall()],
  ];
  for (const [name, zeichnen] of sichten) {
    zeichnen();
    const html = document.getElementById('app').innerHTML;
    assert.ok(html.includes('id="herkunft-marke"'), name + ' ohne Herkunfts-Marke');
    assert.ok(html.includes('herkunft-marke--offen'), name + ': der Stand steht auf „offen"');
  }
});

test('[258·Lesen] Farbe trägt den Unterschied nicht — die Aussage steht im Text', () => {
  const { V } = ladeLesen();
  const geprueft = V.herkunftBlockHTML({ format: 1, geprueft: 2, ungeprueft: 0, unbekannt: 0, module: [] });
  const offen = V.herkunftBlockHTML({ format: 1, geprueft: 0, ungeprueft: 2, unbekannt: 0, module: [] });
  const nurText = (s) => s.replace(/<[^>]*>/g, '');
  assert.notEqual(nurText(geprueft), nurText(offen),
    'ohne jede Farbe müssen die beiden Fälle noch zu unterscheiden sein (WCAG 1.4.1)');
});

/* ══ 6) STATION „ANZEIGE IM KERN" ════════════════════════════════════════════════════════ */

test('[258·Kern] ein Bestandsmodul ohne Marke erscheint jetzt — vorher war es unsichtbar', async () => {
  const V = await kernMit([M_BESTAND]);
  const liste = V.eingelasseneModule();
  assert.equal(liste.length, 1, 'vorher fiel es durch den `fremd`-Filter und stand nirgends');
  assert.equal(liste[0].herkunft, 'unbekannt');
  const html = V.einstellungenHTML();
  assert.ok(html.includes(V.STRINGS.modulPruefstufeUnbekanntZusatz));
  assert.ok(html.includes(V.STRINGS.modulHerkunftUnbekanntHinweis));
});

test('[258·Kern] über ein Bestandsmodul steht NICHT „das haben Sie selbst hineingelassen"', async () => {
  const V = await kernMit([M_BESTAND]);
  const html = V.einstellungenHTML();
  assert.equal(html.includes(V.STRINGS.moduleUngeprueftHinweis), false,
    'das wäre eine Behauptung über etwas, das dieses Depot gerade nicht weiß');
});

test('[258·Kern] der Herkunfts-Satz steht in den Einstellungen — auch ohne jede Erweiterung', async () => {
  const V = await kernMit([]);
  assert.ok(V.einstellungenHTML().includes(V.STRINGS.herkunftSatzKeine));
});

/* ══ 7) PARITÄT — der Spiegel läuft nicht auseinander ════════════════════════════════════ */

test('[258·Parität] die Lese-App zählt GENAU die Register, die der Kern einläßt', async () => {
  const V = await kernMit([]);
  const { V: L } = ladeLesen();
  const kernSlots = V.EINLASS_REGISTER.map((r) => r.slot).slice().sort();
  const leseSlots = Array.from(L.MODUL_SLOTS).slice().sort();
  assert.deepEqual(leseSlots, kernSlots,
    'ein Register, das nur der Kern kennt, fehlte in der Herkunftsangabe des Empfängers');
});

/* U2-ADR-335 hat diese Zusicherung ENGER gefasst, nicht gestrichen. Bis dahin verlangte sie
   Gleichheit — richtig, solange beide Fassungen dasselbe taten. Der Kern PRÜFT (er hat
   `ungeprueft:false` selbst gesetzt, nach echter Signaturprüfung); die Lese-App LIEST nur, was in
   einer fremden Datei steht. Sobald einer von beiden etwas weiss, was der andere nicht wissen
   kann, ist Gleichheit die falsche Zusicherung.

   GEPRÜFT WIRD DIE ORDNUNG, NICHT DIE ZUORDNUNG: die Lese-App urteilt nie MILDER als der Kern.
   Eine Tabelle („Kern geprueft -> Lesen ungeprueft") schriebe die heutige Abwesenheit des Belegs
   fest und würde rot, sobald der Folge-Posten landet und der Empfänger wieder prüfen kann. Die
   Ordnung trägt beides. */
const _RANG = { unbekannt: 0, ungeprueft: 1, geprueft: 2 };
test('[258·Ordnung] die Lese-App urteilt nie milder als der Kern', async () => {
  const V = await kernMit([]);
  const { V: L } = ladeLesen();
  const faelle = [M_GEPRUEFT, M_INTERN, M_UNSIGNIERT, M_NICHT_ANERKANNT, M_BESTAND,
                  null, {}, { ungeprueft: 'ja' }, { ungeprueft: false, pruefstufe: 'extern-ungeprueft' }];
  let hoechster = 0;
  for (const m of faelle) {
    const kern = V.modulHerkunftStand(m);
    const lesen = L.modulHerkunftStand(m);
    hoechster = Math.max(hoechster, _RANG[kern]);
    assert.ok(_RANG[lesen] <= _RANG[kern],
      'Lese-App milder als der Kern bei ' + JSON.stringify(m) + ': ' + lesen + ' > ' + kern);
  }
  // Ausbeute: ohne einen Fall, den der KERN als `geprueft` führt, prüfte die Ordnung nichts.
  assert.equal(hoechster, _RANG.geprueft,
    'die Fallmenge muss mindestens einen enthalten, den der Kern als geprueft führt');
});

test('[U2-ADR-335] die Lese-App sagt HEUTE zu keinem Modul `geprueft` — sie kann nichts prüfen', () => {
  /* EIGENE PROBE MIT EIGENER LEBENSDAUER, absichtlich von der Ordnung oben getrennt. Sie hält den
     heutigen Zustand fest: in der Datei reist kein Beleg mit, den der Empfänger prüfen könnte
     (gemessen: `modulEinlassenGeprueft` reicht die Nutzlast weiter und legt kein JWS ab).
     Landet der Folge-Posten — der Beleg bleibt im Depot —, DARF diese Probe fallen, und ihr Fallen
     ist dann ein Ereignis und kein Rätsel. Die Ordnungs-Probe darüber bleibt davon unberührt. */
  const { V: L } = ladeLesen();
  for (const m of [M_GEPRUEFT, M_INTERN, { ungeprueft: false }, { ungeprueft: false, anbieterIdGeprueft: true }]) {
    assert.notEqual(L.modulHerkunftStand(m), 'geprueft', JSON.stringify(m));
  }
});

test('[258·Parität] beide Fassungen von `modulHerkunftGiltAlsGeprueft` urteilen gleich', async () => {
  const V = await kernMit([]);
  const { V: L } = ladeLesen();
  for (const h of [null, undefined, {}, { geprueft: 1, ungeprueft: 0, unbekannt: 0 },
                   { geprueft: 1, ungeprueft: 1, unbekannt: 0 },
                   { geprueft: 1, ungeprueft: 0, unbekannt: 1 },
                   { geprueft: 0, ungeprueft: 0, unbekannt: 0 }]) {
    assert.equal(L.modulHerkunftGiltAlsGeprueft(h), V.modulHerkunftGiltAlsGeprueft(h), JSON.stringify(h));
  }
});

/* ══ 8) GEGENPROBE — die Proben oben messen wirklich etwas ═══════════════════════════════ */

test('[258·Gegenprobe] die Datensatz-Probe würde einen fehlenden Schlüssel bemerken', async () => {
  const V = await kernMit([M_UNSIGNIERT]);
  const ds = V.zusammenstellungDatensatz([], { id: 'z', titel: 'Z' });
  const ohne = Object.assign({}, ds);
  delete ohne.modulHerkunft;
  assert.equal(Object.prototype.hasOwnProperty.call(ds, 'modulHerkunft'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(ohne, 'modulHerkunft'), false,
    'die Probe hängt am Schlüssel selbst, nicht an einem Nebeneffekt');
});

test('[258·Gegenprobe] die PDF-Probe würde ein weggelassenes Segment bemerken', async () => {
  const V = await kernMit([M_UNSIGNIERT]);
  const fuss = V.pdfFussText(V.vollDepotPdfMeta());
  assert.equal(fuss.includes(V.STRINGS.dokHerkunftFussAlleGeprueft.replace('{n}', '1')), false,
    'der falsche Satz steht dort NICHT — die Probe unterscheidet die Fälle');
});
