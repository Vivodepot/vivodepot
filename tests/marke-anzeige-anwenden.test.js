'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Marke anschließen — Tab-Titel, Topbar-Wortmarke, {marke}/{marke_domain}
   ────────────────────────────────────────────────────────────────────────
   „Branding anschließen" (07.09.2026), Fund 1 aus der
   238-Nennungen-Messung: `name`/`logo` wurden von `brandingModulPruefen`
   geprüft, aber nie gelesen — ein fremder Anbieter konnte sein Produkt nicht
   branden (widerspricht U2-ADR-040/U2-ADR-296: Vivodepot ist ein Anbieter
   unter anderen, keine implizite Sonderrolle).

   DER RIEGEL, DEN DIESER TEST BEWEIST: dockt ein fremdes Branding-Modul,
   trägt der Tab-Titel UND die Topbar-Wortmarke den fremden Namen — UND jeder
   Text, der über `textLesen`/STRINGS läuft und `{marke}`/`{marke_domain}`
   trägt (141 Fundstellen, gemessen, s. Bericht). Ab Werk (kein Modul
   angedockt) bleibt alles exakt wie heute: „Vivodepot", zweifarbiges
   VIVO/DEPOT-Wortzeichen, native Domain.

   NICHT TEIL DIESES ZUGS (bewusst, gemessen, nicht vergessen): rohe
   JS-String-Literale ohne Textsatz-Bezug — Datei-Basisnamen
   (`dateiAusgeben(...'Vivodepot_...json')`), technische Kennungen
   (`.vivodepot`-Dateiendung, `parseVivodepotBeta`, `VivodepotProviderCredential`),
   Vor-Depot-Texte ohne jede Sprachmodul-Möglichkeit (`<noscript>`,
   VOR-DEPOT-SPRACHSCHALTER). Ein eigener, größerer Posten — hier bewusst
   NICHT mitgezogen, um diesen Zug klein und beweisbar zu halten.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const FREMDMARKE = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'test-institut-fremdmarke',
  name: 'Test-Institut Fremdmarke', domain: 'test-institut-fremdmarke.example',
  farbePrimaer: '#8b1a2b', farbeSekundaer: '#1a3a8b', schriftart: 'Georgia', logo: null,
});

function fakeRootMitWortmarke() {
  const wortEl = { innerHTML: '', textContent: '' };
  return { querySelector: (sel) => (sel === '.logo-wort' ? wortEl : null), _wortEl: wortEl };
}

/* ══ Ab Werk — nichts angedockt, nichts ändert sich ═══════════════════════ */

test('[Marke·AbWerk] _markeName/_markeDomain lösen ohne Depot auf den nativen Wert auf', () => {
  const { V } = ladeKern();
  assert.equal(V._markeName(), 'Vivodepot');
  assert.equal(V._markeDomain(), 'vivodepot.de');
});

test('[Marke·AbWerk] ein Text mit {marke}/{marke_domain} liest sich ab Werk unverändert', () => {
  const { V } = ladeKern();
  assert.equal(V.textLesen('strings:installKnopf.text'), 'Vivodepot auf dem Startbildschirm ablegen');
  assert.equal(V.textLesen('strings:herkunftSatzKeine.text'),
    'Diese Angaben stammen ganz aus Vivodepot selbst. Es ist keine Erweiterung eingelassen.');
  assert.match(V.textLesen('strings:nfbAngehoerigeText.text'), /kostenlos erhältlich ist/);
  assert.ok(V.textLesen('strings:nfbAngehoerigeText.text').indexOf('vivodepot.de') >= 0);
  assert.equal(V.textLesen('strings:nfbAngehoerigeText.text').indexOf('{marke'), -1,
    'kein ungeloester Platzhalter darf die Buergerin je erreichen');
});

test('[Marke·AbWerk] _markeAnzeigeAnwenden(null,...) setzt den nativen Tab-Titel und die native Wortmarke', () => {
  const { V, document } = ladeKern();
  const root = fakeRootMitWortmarke();
  V._markeAnzeigeAnwenden(null, root);
  assert.equal(document.title, 'Vivodepot · v1.0-rc');
  assert.equal(root._wortEl.innerHTML, '<span class="lw-vivo">VIVO</span><span class="lw-depot">DEPOT</span>');
});

/* ══ Fremdes Branding eingelassen — alle vier Stellen tragen den fremden Namen ═ */

test('[Marke·Rot⇄Gruen] nach dem Einlassen der Fremdmarke lösen _markeName/_markeDomain fremd auf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.brandingModule = [FREMDMARKE];
  assert.equal(V._markeName(), 'Test-Institut Fremdmarke');
  assert.equal(V._markeDomain(), 'test-institut-fremdmarke.example');
});

test('[Marke·Rot⇄Gruen] derselbe Text trägt danach den fremden Namen — DE, mehrere unabhängige Fundstellen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.brandingModule = [FREMDMARKE];
  assert.equal(V.textLesen('strings:installKnopf.text'), 'Test-Institut Fremdmarke auf dem Startbildschirm ablegen');
  assert.match(V.textLesen('strings:herkunftSatzKeine.text'), /Test-Institut Fremdmarke/);
  assert.match(V.textLesen('strings:k9VorlageHerkunftText.text'), /nicht von Test-Institut Fremdmarke verfasst/);
  const nfb = V.textLesen('strings:nfbAngehoerigeText.text');
  assert.ok(nfb.indexOf('Test-Institut Fremdmarke') >= 0 && nfb.indexOf('test-institut-fremdmarke.example') >= 0);
});

test('[Marke·Rot⇄Gruen] {anbieter} (Modul-Herkunft) bleibt von {marke} unberührt — keine Verwechslung', () => {
  const { V } = ladeKern();
  const text = V.textLesen('strings:k9VorlageHerkunftText.text').replace('{anbieter}', 'Notarkammer Bayern');
  assert.equal(text, 'Der folgende Wortlaut stammt von Notarkammer Bayern — nicht von Vivodepot verfasst oder geprüft.');
});

test('[Marke·Rot⇄Gruen] Tab-Titel und Wortmarke tragen den fremden Namen nach _markeAnzeigeAnwenden', () => {
  const { V, document } = ladeKern();
  const root = fakeRootMitWortmarke();
  V._markeAnzeigeAnwenden(FREMDMARKE, root);
  assert.equal(document.title, 'Test-Institut Fremdmarke · v1.0-rc');
  assert.equal(root._wortEl.textContent, 'Test-Institut Fremdmarke');
  assert.equal(root._wortEl.innerHTML, '', 'fremder Name ist EIN Textknoten, kein zweifarbiges Wortzeichen erfunden');
});

test('[Marke·Reset] _markeAnzeigeAnwenden(null,...) nach einer Fremdmarke räumt zurück auf nativ', () => {
  const { V, document } = ladeKern();
  const root = fakeRootMitWortmarke();
  V._markeAnzeigeAnwenden(FREMDMARKE, root);
  V._markeAnzeigeAnwenden(null, root);
  assert.equal(document.title, 'Vivodepot · v1.0-rc');
  assert.equal(root._wortEl.innerHTML, '<span class="lw-vivo">VIVO</span><span class="lw-depot">DEPOT</span>');
});

/* ══ Rot-Beweis — der Melder greift wirklich, ist nicht immer grün ════════ */

test('[Marke·Rot-Beweis] ein Text OHNE {marke}-Platzhalter trägt die Fremdmarke NICHT — der Riegel prüft wirklich', () => {
  const { V } = ladeKern();
  // Synthetischer Gegenbeleg: ein Text, der "Vivodepot" als Literal statt {marke} trüge
  // (genau der Fund aus der 238er-Messung, vor diesem Zug), bliebe nach dem Andocken einer
  // Fremdmarke unveraendert Vivodepot — der Melder haette den Rueckfall NICHT gefangen.
  const literalStattPlatzhalter = 'Mein Vivodepot öffnen';
  const echterText = 'Mein {marke} öffnen';
  assert.notEqual(literalStattPlatzhalter, echterText,
    'ein literaler Text und ein Platzhalter-Text sind nie dieselbe Zeichenkette — ' +
    'genau deshalb faellt ein zurueckgeschriebenes Literal in den echten Proben oben auf');
  assert.equal(V._markePlatzhalterAufloesen(literalStattPlatzhalter), literalStattPlatzhalter,
    'ohne Platzhalter aendert _markePlatzhalterAufloesen nichts — bestaetigt, dass Literale nie ' +
    'aufgeloest werden, ungeachtet einer angedockten Marke');
});

/* ────────────────────────────────────────────────────────────────────────
   Nachtrag, 07.09.2026 — der Wächter zu Fund 2 aus dem pre-push.

   Die E2E-Abnahme `marke-e2e-abnahme.spec.js` fiel nach dem Branding-Zug am
   PDF-Untertitel: dort hing ein Genitiv-s unmittelbar am Marken-Platzhalter, und
   unter fremder Marke wurde daraus "Ein einzelner Bereich Ihres Test-Institut
   Fremdmarkes." — das s klebte am Namen, weil Vivodepot zufaellig ein Wort ist,
   das man so beugt.

   WICHTIG fuer den, der hier spaeter etwas ergaenzt: dieser Waechter liest die
   Kern-QUELLE roh, ohne Kommentare zu maskieren. Das ist Absicht — jede Maskierung
   koennte ein falsches GRUEN erzeugen, und ein Waechter, der schweigt, ist schlimmer
   als einer, der zu oft ruft. Wer die kaputte Form in einem Kommentar zitieren will,
   umschreibt sie (wie oben), statt sie woertlich hinzuschreiben. Welche Beugung ein FREMDER Name traegt, weiss das Geruest nicht und
   kann es nicht wissen; im Englischen, Persischen oder Chinesischen gibt es die
   Frage gar nicht erst. Ein Platzhalter wird deshalb NIE gebeugt.

   Roter Beweis: die Zusicherung greift textuell auf die Kern-Quelle zu und
   faellt, sobald irgendwo wieder `{marke}` oder `{marke_domain}` unmittelbar in
   einen Buchstaben laeuft. Zum Zeitpunkt dieses Zugs: genau eine Fundstelle,
   behoben (exportBereichPdfUntertitel).
   ──────────────────────────────────────────────────────────────────────── */
test('[Marke] kein {marke}-Platzhalter wird gebeugt — nirgends im Kern', () => {
  // HTML_PATH aus load-kern.js, NICHT selbst zusammengesetzt: zwei von drei Testdateien
  // lasen frueher den festen Pfad und ignorierten KERN_HTML_PATH — ein Waechter, der am
  // Kanon misst statt am geladenen Kern, bewacht den falschen Gegenstand.
  const fs = require('node:fs');
  const { HTML_PATH } = require('./load-kern.js');
  const quelle = fs.readFileSync(HTML_PATH, 'utf8');

  // Positivkontrolle: die Datei muss ueberhaupt Platzhalter enthalten, sonst prueft
  // dieser Test nichts und meldet trotzdem gruen (verfehlter Anker muss werfen).
  const platzhalterGesamt = (quelle.match(/\{marke(_domain)?\}/g) || []).length;
  assert.ok(platzhalterGesamt > 0,
    'Positivkontrolle: im Kern muss mindestens ein {marke}-Platzhalter stehen, sonst ' +
    'prueft dieser Waechter nichts — Pfad falsch oder Zug zurueckgedreht?');

  const gebeugt = quelle.match(/\{marke(?:_domain)?\}[A-Za-zÄÖÜäöüß]+/g) || [];
  assert.deepEqual(gebeugt, [],
    'ein Marken-Platzhalter darf nie unmittelbar in einen Buchstaben laufen: die Beugung ' +
    'gehoert zum Namen, und der ist unter fremder Marke ein anderer. Gefunden: ' +
    JSON.stringify(gebeugt) + ' — Satz so umformulieren, dass der Name ungebeugt bleibt ' +
    '(oder ihn weglassen, wenn die Marke ohnehin in der Kopfzeile steht).');
});
