'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Beschriftungen aus Modulen sind reiner Text, und das Modal maskiert selbst (v1-Blocker Sicherheit, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Code-Review „ui.modal setzt Titel und Knopf-Beschriftungen roh ins HTML" (Code-Review, 16.09.2026). Die
   Quelle: ein Textsatz-Modul aus einer Depot-Datei wurde ohne Inhaltsprüfung wirksam; dieselbe Klasse
   bei Bereichs-, Format- und Logik-Modulen und beim Namen eines Branding-Moduls. Die Senke: ui.modal
   setzte Titel und Knopf-Beschriftungen roh ins innerHTML, escapeHTML maskierte keine Anführungszeichen,
   und die Mappen-Vorschau setzte den Inhalt eines Eintrags roh in `src="…"`.

   Den Weg eines Menschen (Datei öffnen, Navigation, Dialoge) prüft
   tests/e2e/fremde-datei-fuehrt-kein-script-aus.spec.js im Browser. Diese Probe hält die Regeln
   einzeln fest, samt ihren Grenzen: die eigenen Textsätze de und en verlieren keinen Wert.

   ROT-BEWEIS, GEMESSEN (16.09.2026): gegen den Kern von 391ccfd4 (Sprachmodule mit jeder Version, vor dem Fix) sind elf der ersten
   zwölf Proben rot, darunter je ein Fall über die Mitschrift und über eine alte Kennung; grün bleibt die
   Gegenprobe (eigene Textsätze). Die Proben aus dem Review von f92483fd sind gegen f92483fd rot:
   Mappen-Senken (X1), Anführungszeichen in der Regel und die eigenen Sätze (X2 a). Die Abbrechen-Probe
   (X3) ist dort grün, weil die Maskierung schon stand — ihr Rot-Beweis ist die Sabotage: Maskierung am
   Abbrechen-Knopf entfernt, Probe rot.
   */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const IMG = '<img src="x" onerror="window.__xss=1">';
const grundHtml = (verworfene) => verworfene.filter((v) => v.grund === 'kein-reiner-text');

test('[Reiner Text·Textsatz] ein Wert mit Tag oder Zeichenreferenz wird benannt verworfen, der Rest des Moduls gilt', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: {
    'strings:btnAbbrechen.text': 'Abbrechen' + IMG,
    'strings:btnSchliessen.text': 'Schlie&#223;en',
    'identity.label': 'Identität',
    'strings:groesseUnter1KB.text': '< 1 KB',
  } });
  assert.equal(r.gueltig, true);
  assert.deepEqual(grundHtml(r.verworfene).map((v) => v.kennung).sort(), ['strings:btnAbbrechen.text', 'strings:btnSchliessen.text']);
  assert.equal(r.texte['identity.label'], 'Identität');
  assert.equal(r.texte['strings:groesseUnter1KB.text'], '< 1 KB', 'ein kleiner-als vor Leerzeichen ist Text');
  assert.ok(!('strings:btnAbbrechen.text' in r.texte));
});

test('[Reiner Text·Textsatz] der Druck-Hinweis darf genau seine eigenen Tags tragen, kein weiteres und kein Attribut', () => {
  const { V } = ladeKern();
  const K = 'strings:k9VorlageToolbarHinweis.text';
  const pruefe = (wert) => grundHtml(V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: { [K]: wert } }).verworfene).length;
  assert.equal(pruefe('<p class="pv-dok-hinweis"><strong>Drucken:</strong> Text & mehr < 2</p>'), 0);
  assert.equal(pruefe('<p class="pv-dok-hinweis">x' + IMG + '</p>'), 1, 'ein img im Hinweis ging durch');
  assert.equal(pruefe('<p class="pv-dok-hinweis" onclick="x()">x</p>'), 1, 'ein Attribut am Absatz ging durch');
  assert.equal(pruefe('<strong onmouseover="x()">x</strong>'), 1);
  assert.equal(pruefe('<p class="pv-dok-hinweis">&#60;script&#62;</p>'), 1, 'eine Zeichenreferenz ging durch');
});

test('[Reiner Text·Gegenprobe] die eigenen Textsätze de und en verlieren keinen einzigen Wert', () => {
  const { V } = ladeKern();
  const lies = (d) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', d), 'utf8'));
  const de = V._textsatzModulPruefenGeruest(lies('textsatz-de-modul.json'));
  const en = V.textsatzModulPruefen(lies('textsatz-en-modul.json'));
  assert.equal(de.gueltig, true);
  assert.equal(en.gueltig, true);
  assert.deepEqual(grundHtml(de.verworfene), [], 'das eigene deutsche Modul verliert einen Wert');
  assert.deepEqual(grundHtml(en.verworfene), [], 'das eigene englische Modul verliert einen Wert');
  assert.ok(de.texte['strings:k9VorlageToolbarHinweis.text'].includes('<strong>'));
  assert.ok(en.texte['strings:k9VorlageToolbarHinweis.text'].includes('<strong>'));
});

/* Zwei Wege, die die Sprachmodule mit jeder Version (U2-ADR-416) für Datei-Text geöffnet haben (Review, V-1):
   (a) der Rückfall liest die Mitschrift `abWerkMitschrift.sprache` der Datei — unsigniert — für
       Kennungen, die dem aktiven Modul fehlen;
   (b) alte Kennungen werden übersetzt, auch für unsignierte Module aus `data.textsatzModule`. */
const EN_MODUL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
const RUECKFALL_KENNUNG = 'identity.givenName.label';

test('[Reiner Text·alte Kennung] ein unsigniertes Datei-Modul mit alter Kennung bringt kein HTML durch die Übersetzung', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: {
    'identitaet.label': 'Identität' + IMG, 'vorsorge.label': 'Vorsorge' } });
  assert.equal(r.texte['identity.label'], undefined, 'die übersetzte Kennung trägt den HTML-Wert');
  assert.equal(r.texte['advanceCare.label'], 'Vorsorge', 'Vorbedingung: die Übersetzung selbst läuft');
  assert.deepEqual(grundHtml(r.verworfene).map((v) => v.kennung), ['identitaet.label']);
});

test('[Reiner Text·Mitschrift] der Rückfall aus der Mitschrift einer Datei zeigt kein HTML', async () => {
  const PW = 'reiner-text-mitschrift-2026';
  const { V: Q } = ladeKern();
  await Q.depotAnlegen(PW);
  const d = Q.getData();
  const alt = JSON.parse(JSON.stringify(EN_MODUL)); delete alt.texte[RUECKFALL_KENNUNG];
  const mitschrift = JSON.parse(JSON.stringify(EN_MODUL)); mitschrift.texte[RUECKFALL_KENNUNG] = 'Vorname' + IMG;
  d.textsatzModule = [alt];
  d.textsprache = 'en';
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift || {}, { sprache: mitschrift });
  const umschlag = await Q.depotSerialisieren();
  const { V } = ladeKern();
  await V.depotLaden(umschlag, PW);
  V.textsatzNeuAnwenden();
  const label = V.bereicheAlle().find((b) => b.id === 'identity').sektionen.flatMap((s) => s.felder).find((f) => f.id === 'givenName').label;
  assert.ok(!String(label).includes('<img'), 'der Rückfall aus der Mitschrift zeigt HTML: ' + label);
  assert.equal(grundHtml(V._textsatzModulPruefenGeruest(mitschrift).verworfene).map((v) => v.kennung).join(), RUECKFALL_KENNUNG);
});

test('[Reiner Text·Bereich] ein Bereich mit HTML in irgendeiner Beschriftung fällt ganz, benannt mit der Stelle', () => {
  const { V } = ladeKern();
  const modul = (sektionLabel) => ({ moduleVersion: 1, herkunft: 'probe', sprache: 'de', bereiche: {
    probebereich: { label: 'Probe', icon: 'folder', sektionen: [{ id: 'a', label: sektionLabel, felder: [{ id: 'f', typ: 'text', label: 'F' }] }] },
  } });
  const sauber = V.bereichsModulPruefen(modul('Abschnitt'));
  assert.deepEqual(grundHtml(sauber.verworfene), []);
  const r = V.bereichsModulPruefen(modul('Abschnitt' + IMG));
  const v = grundHtml(r.verworfene);
  assert.equal(v.length, 1);
  assert.equal(v[0].id, 'probebereich');
  assert.deepEqual(v[0].stellen, ['sektionen.0.label']);
  assert.ok(!(r.bereiche || []).some((b) => b.id === 'probebereich'));
});

test('[Reiner Text·Format] ein Format-Modul mit HTML im Label wird nicht angenommen', () => {
  const { V } = ladeKern();
  const modul = (label) => ({ modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'probe-format', richtung: 'import',
    sektor: 'identity', label, leser: 'json', erkennen: [{ pfad: 'typ', gleich: 'probe' }], zuordnung: [{ feld: 'givenName', ziel: 'vorname' }] });
  assert.equal(V.formatModulPruefen(modul('Probe-Import')).gueltig, true, 'Vorbedingung: die saubere Form trägt');
  const r = V.formatModulPruefen(modul('Probe' + IMG));
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'kein-reiner-text');
  assert.equal(V.formatModulZuImportKanal(modul('Probe' + IMG)), null);
});

test('[Reiner Text·Logik] ein Anlass mit HTML wird nicht angemeldet, ein sauberer schon', () => {
  const { V } = ladeKern();
  assert.throws(() => V.kernAPI.registriereAnlass({ id: 'probe-html', label: 'Probe' + IMG }), /kein reiner Text: label/);
  assert.equal(V.kernAPI.registriereAnlass({ id: 'probe-sauber', label: 'Probe' }), true);
});

test('[Reiner Text·Branding] ein Name mit HTML wird benannt verworfen', () => {
  const { V } = ladeKern();
  const r = V.brandingModulPruefen({ moduleVersion: 1, herkunft: 'probe', name: 'Kanzlei' + IMG, farbePrimaer: '#123456' });
  assert.equal(r.branding.name, null);
  assert.deepEqual(r.verworfene.filter((v) => v.schluessel === 'name').map((v) => v.grund), ['kein-reiner-text']);
});

test('[Modal] Titel und jede Knopf-Beschriftung stehen als Text, titelHTML bleibt HTML', () => {
  const { V, document: dok } = ladeKern();
  V.ui.modal({ titel: 'Titel' + IMG, koerperHTML: '<p>Körper</p>', primaerLabel: 'OK' + IMG, onPrimaer: (s) => s(),
    zweitAktion: { label: 'Zweit' + IMG, handler: () => {} }, drittAktion: { label: 'Dritt' + IMG, handler: () => {} } });
  const html = dok.getElementById('modal-inhalt').innerHTML;
  assert.ok(!html.includes('<img'), 'ein img-Tag steht roh im Modal: ' + html.slice(0, 200));
  assert.equal((html.match(/&lt;img/g) || []).length, 4, 'Titel, Primär, Zweit, Dritt als Text');
  assert.ok(html.includes('<p>Körper</p>'), 'koerperHTML bleibt HTML per Vertrag');
  assert.ok(/id="m-abbr">Abbrechen<\/button>/.test(html), 'Vorbedingung: der Abbrechen-Knopf steht da');
  V.ui.modal({ titelHTML: '<span class="modal-logo"></span>Anlegen', koerperHTML: '', primaerLabel: 'OK', onPrimaer: (s) => s() });
  assert.ok(dok.getElementById('modal-inhalt').innerHTML.includes('<h3 id="modal-titel"><span class="modal-logo"></span>Anlegen</h3>'));
});

test('[Modal] escapeHTML maskiert beide Anführungszeichen — ein Wert bricht nicht aus einem Attribut aus', () => {
  const { V } = ladeKern();
  assert.equal(V.escapeHTML('a"b\'c<d>&'), 'a&quot;b&#39;c&lt;d&gt;&amp;');
});

test('[Mappe] Beschriftung als Text im Titel, der Inhalt nur als data:-URL und maskiert im Attribut', () => {
  const { V, document: dok } = ladeKern();
  const d = V.getData() || V.leeresDepot();
  d.mappe = [
    { id: 'm1', beschriftung: 'Mappe' + IMG, bereich: 'identity', dateiname: 'x.png', mime: 'image/png', groesse: 3,
      inhalt: 'data:image/png;base64,x" onerror="window.__xss=1', hinzugefuegtAm: '2026-09-16' },
    { id: 'm2', beschriftung: 'Fremd', bereich: 'identity', dateiname: 'y.png', mime: 'image/png', groesse: 3,
      inhalt: 'javascript:alert(1)', hinzugefuegtAm: '2026-09-16' },
  ];
  V.setData(d);
  V.flowMappeVorschau('m1');
  const html = dok.getElementById('modal-inhalt').innerHTML;
  assert.ok(html.includes('<h3 id="modal-titel">Mappe&lt;img'), 'Titel nicht als Text: ' + html.slice(0, 160));
  assert.ok(!/onerror="window/.test(html), 'der Inhalt brach aus dem src-Attribut aus');
  V.flowMappeVorschau('m2');
  assert.ok(!dok.getElementById('modal-inhalt').innerHTML.includes('javascript:'), 'eine javascript:-Quelle steht im Bild');
});

/* Review von f92483fd (X3): die Maskierung der Abbrechen-Beschriftung hatte keinen Wächter —
   entfernt blieben Node und E2E grün. Ein Wert mit & aus einem Datei-Modul (reiner Text, geht durch die
   Quelle) muss im Knopf als &amp; stehen. */
test('[Modal] die Abbrechen-Beschriftung aus einem Datei-Modul steht maskiert im Knopf', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen('modal-abbrechen-probe-2026');
  const d = V.getData();
  d.textsatzModule = [{ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: { 'strings:btnAbbrechen.text': 'Zurück & weg' } }];
  d.textsprache = 'xx';
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  assert.equal(V.STRINGS.btnAbbrechen, 'Zurück & weg', 'Vorbedingung: der Datei-Wert ist aktiv');
  V.ui.modal({ titel: 't', koerperHTML: '', primaerLabel: 'OK', onPrimaer: (s) => s() });
  assert.ok(dok.getElementById('modal-inhalt').innerHTML.includes('id="m-abbr">Zurück &amp; weg</button>'), 'die Abbrechen-Beschriftung steht roh im Knopf');
});

/* Review von f92483fd (X1): vier Bild-Senken der Mappe, eine gemeinsame Prüfung. */
test('[Mappe] Liste, Verweis-Feld und Deckblatt setzen den Inhalt nur als geprüfte data:-URL', () => {
  const { V } = ladeKern();
  const BOESE = 'data:image/png;base64,iVBORw0KGgo=" onerror="window.__xss=1';
  const GUT = 'data:image/png;base64,iVBORw0KGgo=';
  assert.equal(V._mappeInhaltAlsQuelle(GUT, 'bild'), GUT);
  assert.equal(V._mappeInhaltAlsQuelle(BOESE, 'bild'), null);
  assert.equal(V._mappeInhaltAlsQuelle('data:image/svg+xml;base64,PHN2Zz4=', 'bild'), null, 'SVG ist keine erlaubte Bildquelle');
  assert.equal(V._mappeInhaltAlsQuelle('javascript:alert(1)', 'bild'), null);
  assert.equal(V._mappeInhaltAlsQuelle('data:application/pdf;base64,JVBERi0=', 'pdf'), 'data:application/pdf;base64,JVBERi0=');
  const d = V.getData() || V.leeresDepot();
  d.mappe = [
    { id: 'm1', beschriftung: 'Ausweis', bereich: 'identity', dateiname: 'x.png', mime: 'image/png', groesse: 3, inhalt: BOESE, hinzugefuegtAm: '2026-09-16' },
    { id: 'm2', beschriftung: 'Foto', bereich: 'identity', dateiname: 'y.png', mime: 'image/png', groesse: 3, inhalt: GUT, hinzugefuegtAm: '2026-09-16' },
  ];
  V.setData(d);
  const s = V.bereicheAlle().find((b) => b.id === 'identity');
  const fotoFeld = s.deckblatt.fotoFeld;
  const stellen = {
    liste: V.mappeListeHTML(d.mappe),
    verweis: V.mappeRefAnzeigeHTML({ ref: 'm1' }),
    deckblatt: V.deckblattHTML(s, { [fotoFeld]: { ref: 'm1' } }),
  };
  for (const [wo, html] of Object.entries(stellen)) assert.ok(!/onerror/.test(html), wo + ': der Inhalt brach aus dem src-Attribut aus');
  assert.ok(V.deckblattHTML(s, { [fotoFeld]: { ref: 'm2' } }).includes('src="' + GUT + '"'), 'Gegenprobe: ein gültiges Foto erscheint');
  assert.ok(V.mappeRefAnzeigeHTML({ ref: 'm2' }).includes('src="' + GUT + '"'), 'Gegenprobe: ein gültiger Verweis zeigt sein Bild');
});

/* Review von f92483fd (X2 a): ein ASCII-Anführungszeichen bricht aus einem Attribut aus. Entschieden
   16.09.2026: die Regel verwirft `"`, der Apostroph bleibt erlaubt (der englische Satz trägt ihn über
   zweihundertmal), typografische Zeichen bleiben Text. Die eigenen Sätze sind umgestellt. */
test('[Reiner Text·Anführung] ASCII " wird verworfen, Apostroph und typografische Zeichen bleiben', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: {
    'strings:tocTitel.text': 'Inhalt" onmouseover="x',
    'strings:btnAbbrechen.text': "Don't cancel",
    'strings:btnSchliessen.text': 'Ordner „Wohnen“ · “Old documents” · ‚kurz‘',
  } });
  assert.deepEqual(grundHtml(r.verworfene).map((v) => v.kennung), ['strings:tocTitel.text']);
  assert.equal(r.texte['strings:btnAbbrechen.text'], "Don't cancel");
  assert.equal(r.texte['strings:btnSchliessen.text'], 'Ordner „Wohnen“ · “Old documents” · ‚kurz‘');
  const K = 'strings:k9VorlageToolbarHinweis.text';
  const hinweis = (wert) => grundHtml(V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: { [K]: wert } }).verworfene).length;
  assert.equal(hinweis('<p class="pv-dok-hinweis">Text</p>'), 0, 'das Attribut des erlaubten Absatzes bleibt');
  assert.equal(hinweis('<p class="pv-dok-hinweis">Text" onclick="x</p>'), 1, 'ein ASCII " im Text des Hinweises ging durch');
});

// Durchklick-Befund P-EN-8/P-EN-9 (17.09.2026): weitere Kennungen tragen dieselbe, feste
// Werkzeugleisten-/Hinweis-Absatzform wie k9VorlageToolbarHinweis (s. _TEXTSATZ_HTML_ERLAUBT
// in vivodepot.html) — dieselbe Ausnahme hier, sonst rot durch ihr eigenes class="..." Attribut.
const DRUCK_HINWEIS_AUSNAHMEN = new Set([
  'strings:k9VorlageToolbarHinweis.text',
  'strings:pvToolbarHinweis.text',
  'strings:vollmachtToolbarHinweis.text',
  'strings:betreuungToolbarHinweis.text',
  'strings:identitaetLueckenHinweis.text',
  'strings:kiToolbarHinweis.text',
]);
test('[Reiner Text·eigene Sätze] kein eigenes Sprachmodul und keine Quelle trägt ein ASCII " außerhalb des Druck-Hinweises', () => {
  const REPO = path.join(__dirname, '..');
  const funde = [];
  for (const datei of ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json', 'tools/buergermodul/vd-de-sprache.json']) {
    const texte = JSON.parse(fs.readFileSync(path.join(REPO, datei), 'utf8')).texte || {};
    for (const [k, v] of Object.entries(texte)) if (!DRUCK_HINWEIS_AUSNAHMEN.has(k) && typeof v === 'string' && v.includes('"')) funde.push(datei + ' ' + k);
  }
  const { V } = ladeKern();
  for (const [k, v] of Object.entries(V.TEXTSATZ_DE_QUELLE.texte)) if (!DRUCK_HINWEIS_AUSNAHMEN.has(k) && v.includes('"')) funde.push('AB_WERK_TEXTSATZ_DE ' + k);
  assert.deepEqual(funde, [], 'ASCII " in einem eigenen Satz — typografisch setzen („…“ bzw. “…”)');
});

test('[Reiner Text·Erzeuger] der Hinweis für Übersetzende nennt Kennung, Grund und Vorschlag', () => {
  const { reinerTextHinweise } = require('../tools/lib/textsatz-reiner-text-hinweis.js');
  const z = reinerTextHinweise([{ kennung: 'a', grund: 'kein-reiner-text' }, { kennung: 'b', grund: 'unbekannt' }, { kennung: 'c', grund: 'kein-reiner-text' }],
    { a: 'Folder "Old"', c: 'x<b>y</b>' }, 'en');
  assert.equal(z.length, 2);
  assert.match(z[0], /^a: ASCII-Anführungszeichen " — typografisch setzen: “…”/);
  assert.match(z[1], /^c: ein Tag/);
  assert.match(reinerTextHinweise([{ kennung: 'a', grund: 'kein-reiner-text' }], { a: 'Ordner "X"' }, 'de')[0], /„…“/);
});
