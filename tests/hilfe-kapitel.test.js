'use strict';
/* Hilfe-Kapitel im Kern (U2-ADR-425, 20.09.2026, „Hilfe in der Datei").
   Struktur ohne Nutzerdaten (HILFE_THEMEN), Texte über den normalen Textsatz (Kennungsraum `hilfe:<themaId>.<feld>`),
   Druckfassung über dieselbe Overlay-Mechanik wie Notfallblatt/PV-Dokument (kein zweiter Renderer). die Redaktion hat
   die Wortlaute für alle zehn Themen geliefert (das zehnte, „sub-depot", als Nachtrag); die Navigation ist seither
   scharf geschaltet (`data-hilfe="1"` in der Sidebar, `hilfeOeffnen()`) — geprüft wird sowohl die Mechanik als auch
   die Verdrahtung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ZEHN_THEMEN = ['depot-anlegen-passwort', 'speichern-sicherung', 'eintragen-dokumente', 'weitergeben-empfaengerin',
  'sensibel-zurueckhalten-freigeben', 'notfallkarte', 'module-templates-echtheit', 'datei-ist-das-depot', 'was-vivodepot-nicht-sieht',
  'sub-depot'];

test('[Hilfe·Struktur] HILFE_THEMEN trägt genau die zehn vereinbarten Themen, keine Nutzerdaten', () => {
  const { V } = ladeKern({ blank: true });
  assert.deepEqual(V.HILFE_THEMEN.map((t) => t.id), ZEHN_THEMEN);
  for (const t of V.HILFE_THEMEN) assert.ok(Object.keys(t).every((k) => ['id', 'anzahlAbschnitte'].includes(k)), t.id + ' trägt ein unerwartetes Feld');
});

/* Ratsche gegen eine Fehlerklasse, nicht nur den Einzelfall (Fund, 20.09.2026, nach dem Fund
   im EN-Abschnitt „was-vivodepot-nicht-sieht"): mein eigenes Ingest-Skript hatte beim Parsen der
   Redaktions-Quelle die Feldgrenze am LETZTEN Thema je Sprache über eine Markdown-Überschrift
   hinweg gezogen ("---" trennte auf der DE-Seite, fehlte aber vor der EN-Überschrift „# Reader
   application …" — die Regex kannte nur "##", nicht das einzelne "#"). Gemessen (nicht vermutet):
   alle zehn Themen × DE/EN × titel/einleitung/abschnitte UND alle vier Lese-App-Antworten × DE/EN
   wurden gegen dasselbe Muster geprüft, null weitere Treffer — ein Einzelfall, bereits korrigiert.
   Dieser Test hält die Grenze fest, damit ein künftiger Ingest-Lauf (derselbe oder ein neues
   Skript) denselben Fehler nicht unbemerkt wiederholt. */
test('[Hilfe·Ratsche] keine Kennung trägt eine mitkopierte Markdown-Überschrift oder Trennlinie aus der Quelldatei', () => {
  const { V } = ladeKern({ blank: true });
  const VERDAECHTIG = /(^|\s)#{1,6}\s|\*\*|(^|\s)---(\s|$)/;
  const gefunden = [];
  for (const [kennung, wert] of Object.entries(V.TEXTSATZ_DE_QUELLE.texte)) {
    if (kennung.startsWith('hilfe:') && typeof wert === 'string' && VERDAECHTIG.test(wert)) gefunden.push('DE ' + kennung);
  }
  for (const [kennung, wert] of Object.entries(V.TEXTSATZ_EN_QUELLE.texte)) {
    if (kennung.startsWith('hilfe:') && typeof wert === 'string' && VERDAECHTIG.test(wert)) gefunden.push('EN ' + kennung);
  }
  assert.deepEqual(gefunden, [], 'mitkopierte Markdown-Reste: ' + gefunden.join(', '));
});

test('[Hilfe·Ratsche·Rot-Beweis] die Verdachts-Regex schlägt tatsächlich an, wenn eine Kennung eine Überschrift trägt', () => {
  const { V } = ladeKern({ blank: true });
  const VMitLeck = Object.assign(Object.create(V), {
    TEXTSATZ_EN_QUELLE: { texte: Object.assign({}, V.TEXTSATZ_EN_QUELLE.texte, {
      'hilfe:notfallkarte.abschnitt0': 'Some text. # Reader application · the four answers',
    }) },
  });
  const VERDAECHTIG = /(^|\s)#{1,6}\s|\*\*|(^|\s)---(\s|$)/;
  assert.ok(VERDAECHTIG.test(VMitLeck.TEXTSATZ_EN_QUELLE.texte['hilfe:notfallkarte.abschnitt0']),
    'die Probe muss genau das Muster fangen, das den echten Fund ausgelöst hat');
});

test('[Hilfe·Struktur] „datei-ist-das-depot" ersetzt „Umzug auf ein neues Gerät" — kein Assistent, kein Kopplungs-Wortlaut', () => {
  const { V } = ladeKern({ blank: true });
  const kennungen = Object.keys(V.TEXTSATZ_DE_QUELLE.texte).filter((k) => k.startsWith('hilfe:'));
  const text = kennungen.map((k) => V.TEXTSATZ_DE_QUELLE.texte[k]).join(' ');
  assert.doesNotMatch(text, /Umzug|Assistent|koppel/i, 'kein Text darf eine Geräte-Kopplung beschreiben, die es nicht gibt');
});

test('[Hilfe·Titel] jedes Thema hat einen deutschen Titel aus dem Textsatz, kein Rückfall auf die rohe ID', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  for (const id of ZEHN_THEMEN) {
    const modell = V.hilfeThemaModell(id);
    assert.ok(modell.titel && modell.titel !== id, id + ': Titel fehlt oder ist die rohe ID');
  }
});

test('[Hilfe·Struktur] ein unbekanntes Thema liefert null, wie situationModell', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  assert.equal(V.hilfeThemaModell('nicht-vorhanden'), null);
});

test('[Hilfe·Inhalt] mit den gelieferten Abschnitten trägt das Modell Einleitung und alle Abschnitte, nichts leer', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const modell = V.hilfeThemaModell('notfallkarte');
  assert.ok(modell.einleitung.length > 0, 'Einleitung muss stehen, die Redaktion hat geliefert');
  assert.equal(modell.abschnitte.length, 2, 'notfallkarte trägt zwei Abschnitte (HILFE_THEMEN.anzahlAbschnitte)');
  for (const a of modell.abschnitte) assert.ok(a.length > 0, 'kein Abschnitt bleibt leer');
});

test('[Hilfe·Übersicht] listet alle zehn Titel in der HILFE_THEMEN-Reihenfolge', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  assert.deepEqual(V.hilfeUebersichtModell().map((t) => t.id), ZEHN_THEMEN);
});

test('[Hilfe·Rendering] hilfeThemaHTML zeigt Titel, Einleitung und alle drei Abschnitte', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const html = V.hilfeThemaHTML('depot-anlegen-passwort');
  assert.match(html, /<h1>Depot anlegen und das Passwort<\/h1>/);
  assert.match(html, /hilfe-einleitung/);
  assert.equal((html.match(/hilfe-abschnitt/g) || []).length, 3, 'depot-anlegen-passwort trägt drei Abschnitte');
  assert.match(html, /Niemand kann Ihr Passwort zurücksetzen/);
});

test('[Hilfe·Rendering·Rot-Beweis] ein Sprachmodul, das eine Kennung auf leer überschreibt, erzeugt keinen leeren Absatz', () => {
  const { V } = ladeKern();
  // Ein Sprachmodul in 'xx' ohne eigene Übersetzung für eine Kennung blendet sie aus (Ausblenden
  // nicht übersetzter Bereiche, U2-ADR-423) — darum trägt abschnitt0 hier eine eigene xx-Übersetzung,
  // sonst verschwände es NUR wegen der aktiven Sprache, nicht wegen des hier geprüften Leerraum-Falls.
  const modul = { modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: {
    'hilfe:notfallkarte.abschnitt0': 'Abschnitt null auf xx.',
    'hilfe:notfallkarte.abschnitt1': ' ',
  } };
  const d = Object.assign(V.leeresDepot(), { textsatzModule: [modul], textsprache: 'xx' });
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  const modell = V.hilfeThemaModell('notfallkarte');
  assert.equal(modell.abschnitte.length, 1, 'ein auf Leerraum überschriebener Abschnitt fällt aus der Liste, statt als leerer Absatz zu erscheinen');
  assert.equal(modell.abschnitte[0], 'Abschnitt null auf xx.');
});

test('[Hilfe·Rendering·Rot-Beweis] ein Sprachmodul mit Markup in einer hilfe:-Kennung wird schon beim Einlassen verworfen', () => {
  const { V } = ladeKern();
  const geprueft = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: { 'hilfe:depot-anlegen-passwort.titel': '<script>alert(1)</script>' } });
  const fund = geprueft.verworfene.find((v) => v.kennung === 'hilfe:depot-anlegen-passwort.titel');
  assert.ok(fund, 'die Kennung muss verworfen werden, nicht nur später weggerendert');
  assert.equal(fund.grund, 'kein-reiner-text');
});

test('[Hilfe·Rendering] ein Sonderzeichen im Titel (reiner Text, kein Markup) wird beim Rendern escaped', () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: { 'hilfe:depot-anlegen-passwort.titel': 'Tipps & Tricks fürs Depot' } };
  assert.equal(V.textsatzModulPruefen(modul).verworfene.length, 0, 'Vorbedingung: reiner Text wird angenommen');
  const d = Object.assign(V.leeresDepot(), { textsatzModule: [modul], textsprache: 'xx' });
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  const html = V.hilfeThemaHTML('depot-anlegen-passwort');
  assert.doesNotMatch(html, /Tipps & Tricks fürs/, 'ein rohes „&" im HTML wäre eine offene Flanke, auch ohne echtes Markup');
  assert.match(html, /Tipps &amp; Tricks fürs Depot/);
});

test('[Hilfe·Übersetzbar, kein dritter Weg] ein Sprachmodul mit einer hilfe:-Kennung überschreibt den Titel — derselbe Weg wie jede andere Kern-Kennung', async () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: { 'hilfe:notfallkarte.titel': 'Emergency card (xx)' } };
  const d = Object.assign(V.leeresDepot(), { textsatzModule: [modul], textsprache: 'xx' });
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  assert.equal(V.hilfeThemaModell('notfallkarte').titel, 'Emergency card (xx)',
    'keine neue Prüf-/Registerfunktion nötig — die bestehende Kennungs-Erkennung reicht');
});

test('[Hilfe·Druck] das Overlay steht in der Ausnahmeliste des Print-CSS, wie Notfallblatt/PV-Dokument', () => {
  assert.match(KERN_QUELLE, /body > \*:not\(#pv-dok-overlay\):not\(#notfallblatt-overlay\):not\(#hilfe-overlay\) \{ display: none !important; \}/);
  assert.match(KERN_QUELLE, /#pv-dok-overlay, #notfallblatt-overlay, #hilfe-overlay \{ position: static;/);
});

test('[Hilfe·Druck] hilfeOverlayHTML zeigt Drucken-Knopf immer, Zurück nur bei einem Thema, Schließen nur bei der Übersicht', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const mitThema = V.hilfeOverlayHTML('notfallkarte');
  assert.match(mitThema, /id="hilfe-drucken"/);
  assert.match(mitThema, /id="hilfe-zurueck"/);
  assert.doesNotMatch(mitThema, /id="hilfe-schliessen"/, 'aus einem Thema führt „zurück" zur Übersicht, „schließen" wäre ein zweiter Ausgang');
  const uebersicht = V.hilfeOverlayHTML();
  assert.match(uebersicht, /id="hilfe-drucken"/);
  assert.match(uebersicht, /id="hilfe-schliessen"/, 'von der Übersicht muss man das Overlay ganz verlassen können');
  assert.doesNotMatch(uebersicht, /id="hilfe-zurueck"/, 'auf der Übersicht gibt es nichts, wohin „zurück" führen könnte');
});

test('[Hilfe·Inhalt] das nachgelieferte zehnte Thema (sub-depot) trägt Titel, Einleitung und alle drei Abschnitte', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const modell = V.hilfeThemaModell('sub-depot');
  assert.ok(modell.titel && modell.titel !== 'sub-depot', 'Titel fehlt oder ist die rohe ID');
  assert.ok(modell.einleitung.length > 0);
  assert.equal(modell.abschnitte.length, 3);
  assert.match(modell.abschnitte[0], /Einhängen/);
});

test('[Hilfe·Aktivierung] die Sidebar trägt den Hilfe-Eintrag und ist auf hilfeOeffnen verdrahtet', () => {
  assert.match(KERN_QUELLE, /<button class="nav-item" data-hilfe="1">/,
    'ein Sidebar-Eintrag muss existieren, jetzt wo die Redaktion Inhalt geliefert hat');
  assert.match(KERN_QUELLE, /sb\.querySelectorAll\('\[data-hilfe\]'\)\.forEach\(b => \{\s*b\.onclick = \(\) => hilfeOeffnen\(\);/,
    'der Sidebar-Knopf muss auf hilfeOeffnen() verdrahtet sein, kein toter Knopf');
});

test('[Hilfe·Aktivierung] hilfeOeffnen injiziert das Overlay und verdrahtet Drucken/Schließen/Zurück/Themen-Knöpfe', () => {
  assert.match(KERN_QUELLE, /function hilfeOeffnen\(themaId\)/, 'hilfeOeffnen muss existieren, spiegelt notfallblattOeffnen');
  assert.match(KERN_QUELLE, /document\.body\.appendChild\(ov\);[\s\S]{0,400}getElementById\('hilfe-drucken'\)/,
    'dieselbe DOM-Injektions-Mechanik wie notfallblattOeffnen, kein zweiter Overlay-Weg');
});
