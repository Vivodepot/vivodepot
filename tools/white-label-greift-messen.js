#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   white-label-greift-messen.js — greift ein Markenbündel wirklich? Gemessen am
   Ladeweg, den ein Partner tatsächlich nimmt, nicht am Modul allein.
   ────────────────────────────────────────────────────────────────────────────
   WOZU (16.09.2026, DoD-Punkt „White Label greift", U2-ADR-297/400/408). Ein
   Markenbündel ist erst dann ein Markenbündel, wenn das Produkt es zeigt: Kopfzeile,
   Palette, PDF-Auszug, Dateinamen. Dieses Werkzeug fährt dafür den ECHTEN Weg:

     1. das Modul durch den Schnellweg des VC-Issuers signieren
        (`onSchnellwegErzeugen`, derselbe Knopf, den ein Mensch im Issuer drückt) —
        mit dem TEST-SENTINEL, nie mit einem echten Schlüssel;
     2. die entstandene `vorabkonfiguration.js` in den Kern einlassen
        (`vorDepotKonfigurationAnwenden`, Anker = Sentinel);
     3. messen, was danach sichtbar ist.

   Es fasst KEINEN echten Schlüssel an. Der Sentinel ist öffentlich und im Kern als
   Testanker bekannt; ein damit signiertes Bündel wirkt nur, wenn der Anker ausdrücklich
   auf den Sentinel gesetzt wird — also nie in einem ausgelieferten Produkt.

   WAS ES NICHT MISST: die Oberfläche im Browser. Den sichtbaren Wortlaut misst es über die
   Textsatz-Schicht (jede Kennung, die nach dem Einlassen die Wortmarke „Vivodepot" trägt)
   und über die gerenderten Ansichten App-Fuß, Einstellungen und Fenstertitel. Dauerhaft
   bewacht wird es von tests/white-label-greift.test.js, deutsch und englisch.

   Aufruf:
     node tools/white-label-greift-messen.js [--modul PFAD] [--sprache de|en] [--json]
     (ohne --modul: tools/vorfuehrung/stadtbank-beispielstadt-branding.json)
   ════════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const VORGABE = path.join(__dirname, 'vorfuehrung', 'stadtbank-beispielstadt-branding.json');

/* Der öffentliche Test-Sentinel, wortgleich in tests/vc-issuer-schnellweg-vivodepot-kern.test.js.
   Er ist kein Geheimnis: der Kern kennt seinen öffentlichen Teil als TEST_SENTINEL_PUBLIC_JWK. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});

/* Der Herkunftsort (Einstellungen → Recht) ist der EINE Ort, an dem Vivodepot steht
   (U2-ADR-400). `fussKontakt` ist Vivodepots Adresse — sie steht dort; der App-Fuß liest sie unter
   White Label nicht mehr (`_markeKontakt`), das misst der Punkt `ansicht-fuss`. */
const HERKUNFTSORT_KENNUNGEN = Object.freeze([
  'strings:herkunftPoweredBy.text', 'strings:herkunftLizenzhinweis.text',
  'strings:herkunftImpressumLink.text', 'strings:einstAnbieter.text', 'strings:fussKontakt.text',
]);

/* Bewusst bleibende Stellen — jede mit Grund (Freigabe 3c, 16.09.2026). Eine neue Stelle
   kommt nur mit Entscheidung auf diese Liste, nie, damit die Messung grün wird. */
const BLEIBT_BEWUSST = Object.freeze({
  'strings:shlAblageOeffnenKnopf.text': 'share.vivodepot.de ist die tatsächliche Adresse des Ablagedienstes (3c).',
  'strings:shlUrlHinweis.text': 'share.vivodepot.de ist die tatsächliche Adresse des Ablagedienstes (3c).',
  'strings:importBetaLabel.text': 'Die alte Vivodepot-App (Beta) ist ein Eigenname der Quelle, aus der importiert wird (3c).',
  'strings:importKlartext.vivodepot-beta.text': 'Die alte Vivodepot-App (Beta) ist ein Eigenname der Quelle, aus der importiert wird (3c).',
  'strings:dokFussHaftung.text': 'Fassung C (U2-ADR-025) bleibt im Textsatz wortgleich; das Markenwort tauscht der Verbrauchsort _dokFussHaftungMitMarke — gemessen im Punkt pdf.',
});

/* Die Diskriminante der Wortmarken-Probe, als reine Funktion, damit der Wächter sie rot fahren kann. */
function wortmarkeEinordnen(kennungen) {
  const bewusstGilt = (k) => Object.prototype.hasOwnProperty.call(BLEIBT_BEWUSST, k);
  return {
    herkunft: kennungen.filter((k) => HERKUNFTSORT_KENNUNGEN.includes(k)),
    bewusst: kennungen.filter(bewusstGilt),
    ausserhalb: kennungen.filter((k) => !HERKUNFTSORT_KENNUNGEN.includes(k) && !bewusstGilt(k)),
  };
}

function argWert(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}

/* Ein jsPDF-Stellvertreter, der jede Zeichen-Anweisung mitschreibt. Gemessen wird, was
   auf dem Blatt stünde: Texte und Farben — nicht, wie es aussieht. */
function aufzeichnenderJsPdf() {
  const aufrufe = [];
  class AufzeichnendesPdf {
    constructor() {
      this.internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 }, getNumberOfPages: () => 1 };
      return new Proxy(this, {
        get(ziel, name) {
          if (name in ziel) return ziel[name];
          if (name === 'splitTextToSize') return (s) => String(s == null ? '' : s).split('\n');
          if (name === 'getTextWidth') return (s) => String(s || '').length * 5;
          if (name === 'getFontList') return () => ({ Inter: ['normal', 'bold', 'italic'] });
          if (name === 'getFont') return () => ({ fontName: 'Inter', fontStyle: 'normal' });
          if (name === 'getFontSize') return () => 10;
          if (name === 'getLineHeightFactor') return () => 1.15;
          if (name === 'output') return () => '';
          return (...args) => { aufrufe.push({ name: String(name), args }); return ziel; };
        },
      });
    }
  }
  return { AufzeichnendesPdf, aufrufe };
}

async function messen(modulPfad, optionen) {
  const sprache = (optionen && optionen.sprache) || 'de';
  const modul = JSON.parse(fs.readFileSync(modulPfad, 'utf8'));
  const befund = { modul: path.relative(REPO, modulPfad), name: modul.name || null, sprache, punkte: [] };
  const punkt = (id, ok, detail) => befund.punkte.push({ id, ok: !!ok, detail });

  // 1 · signieren wie im Issuer (Schnellweg), mit dem Sentinel
  const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
  const { V: ISSUER } = ladeIssuer();
  await ISSUER.onKeyDatei({ text: async () => JSON.stringify(SENTINEL_PRIVATE_JWK) });
  await ISSUER.onSchnellwegModulDatei({ text: async () => JSON.stringify(modul) });
  await ISSUER.onSchnellwegErzeugen();
  const buendel = ISSUER._letztesSchnellwegBuendelLesen();
  punkt('signiert', !!buendel, buendel ? 'Schnellweg erzeugte ein Bündel' : 'Schnellweg lieferte kein Bündel');
  if (!buendel) return befund;
  const dateiInhalt = ISSUER.vorDepotKonfigurationDateiInhalt([buendel]);
  const liste = JSON.parse(dateiInhalt.slice(dateiInhalt.indexOf('['), dateiInhalt.lastIndexOf(']') + 1));

  // 2 · einlassen, mit aufzeichnendem jsPDF
  const { AufzeichnendesPdf, aufrufe } = aufzeichnenderJsPdf();
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V, document } = ladeKern({ jspdf: { jsPDF: AufzeichnendesPdf } });
  const root = { style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } } };
  await V.vorDepotKonfigurationAnwenden(liste, root, { ankerJwk: V.TEST_SENTINEL_PUBLIC_JWK });

  // 3 · messen — ZWEI Zustände, weil der Markenname aus dem offenen Depot kommt
  // (`_markeName` liest `data.brandingModule`, Rückfall `_AB_WERK_BRANDING`): vor dem ersten
  // Depot (Willkommensschirm) und nach dem Anlegen über den echten Weg (`depotAnlegen`, das
  // die Vor-Depot-Module ins Depot übernimmt).
  const nameVorDepot = V._markeName();
  punkt('name-willkommen', nameVorDepot === modul.name, 'Markenname vor dem ersten Depot: ' + nameVorDepot);
  await V.depotAnlegen('White-Label-Messung-lang-genug-2026', {});
  const markeName = V._markeName();
  if (sprache === 'en') {
    // Englisch über den Weg, den ein Depot nimmt: das Sprachmodul einlassen und die Sprache setzen.
    const r = V.modulEinlassen(fs.readFileSync(path.join(__dirname, 'textsatz-en-modul.json'), 'utf8'));
    punkt('sprache-en', r.angenommen === true, 'Englisches Sprachmodul: ' + (r.angenommen ? 'angenommen' : 'abgewiesen — ' + r.grund));
    const d = V.getData(); d.textsprache = 'en'; V.setData(d);
    V._textsatzModuleAusDepotAnmelden(V.getData());
  }
  punkt('name-im-depot', markeName === modul.name, 'Markenname im angelegten Depot: ' + markeName);

  const topPrim = root.style._werte['--vd-branding-topbar-primaer'];
  punkt('kopfzeile', !!modul.farbePrimaer && topPrim === modul.farbePrimaer,
    'Kopfzeile: ' + (topPrim || 'Rückfall (nicht gesetzt)') + ', Schrift ' + (root.style._werte['--vd-branding-topbar-text'] || '—'));

  const paletteGesetzt = root.style._werte['--salbei-dunkel'];
  punkt('palette', !!paletteGesetzt, 'Palette abgeleitet: ' + (paletteGesetzt ? 'ja, --salbei-dunkel ' + paletteGesetzt : 'NEIN — verworfen, es bleibt die Palette des Hauses'));

  const bedeutung = ['--error', '--warning', '--modus-notfall', '--ampel-rot'].filter((t) => root.style._werte[t] !== undefined);
  punkt('bedeutungsfarben', bedeutung.length === 0, bedeutung.length ? 'überschrieben: ' + bedeutung.join(', ') : 'Notfall-Rot und Ampel unberührt');

  const praefix = V._dateiNamePraefix();
  const beispiel = V.exportDateiname({ id: 'alle-daten', dateibasis: 'Vivodepot_Alle-Daten', endung: 'pdf' });
  punkt('dateinamen', !/vivodepot/i.test(beispiel) && praefix !== 'Vivodepot', 'Dateiname: ' + beispiel);

  let pdfTexte = [];
  let pdfFarben = [];
  try {
    const modell = V.vollDepotModell({});
    const meta = V.vollDepotPdfMeta();
    const doc = new AufzeichnendesPdf();
    V.zeichneVollDepotPdf(doc, modell, meta);
    pdfTexte = aufrufe.filter((a) => a.name === 'text').map((a) => [].concat(a.args[0]).join(' '));
    pdfFarben = aufrufe.filter((a) => /^set(Text|Fill|Draw)Color$/.test(a.name)).map((a) => a.args.join(','));
  } catch (e) {
    punkt('pdf', false, 'PDF-Zeichenweg warf: ' + (e && e.message));
  }
  if (pdfTexte.length) {
    const tragtMarke = pdfTexte.some((t) => t.indexOf(modul.name) >= 0 || t.indexOf(String(modul.name).toUpperCase()) >= 0);
    const tragtVivodepot = pdfTexte.filter((t) => /vivodepot/i.test(t));
    punkt('pdf', tragtMarke && tragtVivodepot.length === 0,
      'PDF: Marke ' + (tragtMarke ? 'steht drauf' : 'FEHLT') + '; „Vivodepot" ' + (tragtVivodepot.length ? tragtVivodepot.length + '× — ' + tragtVivodepot.slice(0, 3).join(' | ') : 'nirgends'));
    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
    const markenFarbeImPdf = modul.farbePrimaer ? pdfFarben.some((f) => f === rgb(modul.farbePrimaer)) : false;
    punkt('pdf-farbe', markenFarbeImPdf, 'Markenfarbe im PDF: ' + (markenFarbeImPdf ? 'ja' : 'nein'));
  }

  // Sichtbarer Wortlaut aus dem Textsatz: jede Kennung, deren aufgelöster Text die Wortmarke trägt.
  // Einsortiert wird NUR über die zwei benannten Listen oben — kein Muster auf den Kennungsnamen.
  const satz = sprache === 'en'
    ? JSON.parse(fs.readFileSync(path.join(__dirname, 'textsatz-en-modul.json'), 'utf8')).texte
    : deTexte();
  const mitWortmarke = [];
  for (const kennung of Object.keys(satz)) {
    let t = null;
    try { t = V.textLesen(kennung); } catch (_) { t = null; }
    if (typeof t === 'string' && /vivodepot/i.test(t)) mitWortmarke.push(kennung);
  }
  const { herkunft, bewusst, ausserhalb } = wortmarkeEinordnen(mitWortmarke);
  punkt('wortmarke-nur-herkunft', ausserhalb.length === 0,
    '„Vivodepot" im Textsatz: ' + herkunft.length + '× am Herkunftsort, ' + bewusst.length + '× bewusst (benannte Liste), '
    + ausserhalb.length + '× außerhalb' + (ausserhalb.length ? ' — ' + ausserhalb.join(', ') : ''));
  befund.wortmarkeAusserhalb = ausserhalb;

  // Ansichten, wie sie gerendert werden: App-Fuß und Einstellungen (ohne den Herkunftsort selbst).
  const sichtbar = (html) => String(html || '').replace(/<[^>]*>/g, ' ');
  try {
    V.betreteApp();
    V.renderFooter();
    const fuss = document.getElementById('app-fuss').innerHTML;
    const kontaktOk = modul.kontakt ? fuss.includes('mailto:' + modul.kontakt) : !fuss.includes('mailto:');
    const links = fuss.match(/href="https:[^"]*"/g) || [];
    const linkOk = modul.aktualisierungen ? links.includes('href="' + modul.aktualisierungen + '"') : links.length === 0;
    punkt('ansicht-fuss-link', linkOk && !/vivodepot/i.test(links.join(' ')),
      'Aktualisierungs-Link im Fuß: ' + (links.length ? links.join(' ') : 'keiner') + (modul.aktualisierungen ? '' : ' (Bündel ohne Adresse)'));
    punkt('ansicht-fuss', !/vivodepot/i.test(sichtbar(fuss)) && kontaktOk,
      'App-Fuß: „Vivodepot" ' + (/vivodepot/i.test(sichtbar(fuss)) ? 'STEHT DRIN' : 'nirgends')
      + '; Kontakt ' + (modul.kontakt ? (kontaktOk ? modul.kontakt : 'FEHLT') : (kontaktOk ? 'keiner (Bündel ohne Kontakt)' : 'FREMDE ADRESSE')));
    const einst = V.einstellungenHTML();
    const ohneHerkunftsort = einst.replace(/<div class="herkunftsort" data-herkunftsort="1">[\s\S]*?<\/div>/, '');
    const treffer = (sichtbar(ohneHerkunftsort).match(/[^.;:]{0,40}vivodepot[^.;:]{0,40}/gi) || []);
    punkt('ansicht-einstellungen', treffer.length === 0 && einst.includes('data-herkunftsort="1"'),
      'Einstellungen außerhalb des Herkunftsorts: ' + (treffer.length ? treffer.slice(0, 3).join(' | ') : '„Vivodepot" nirgends'));
    // Kein eigener Aufruf: gemessen wird der Titel, den der echte Weg (Einlassen, Anlegen) gesetzt hat.
    punkt('ansicht-titel', !/vivodepot/i.test(document.title || ''), 'Fenstertitel: ' + document.title);
  } catch (e) {
    punkt('ansichten', false, 'Ansichten warfen: ' + (e && e.message));
  }

  const depotName = V.depotDateiname();
  punkt('dateiname-depot', !/vivodepot\b(?!$)/i.test(depotName.replace(/\.vivodepot$/, '')),
    'Depot-Datei: ' + depotName + ' (die Endung .vivodepot ist das Dateiformat, keine Markenaussage)');

  const yb = typeof V.ybZeichenHTML === 'function' ? V.ybZeichenHTML('download') : '';
  punkt('yellow-button', typeof yb === 'string' && yb.indexOf('data:image/png') >= 0, 'Yellow-Button-Zeichen: ' + (yb ? 'steht' : 'FEHLT'));

  return befund;
}

async function main() {
  const modulPfad = path.resolve(argWert('--modul') || VORGABE);
  const befund = await messen(modulPfad, { sprache: argWert('--sprache') || 'de' });
  if (process.argv.includes('--json')) { console.log(JSON.stringify(befund, null, 2)); return; }
  console.log('White Label greift? — ' + befund.modul + ' (' + befund.name + ', ' + befund.sprache + ')');
  for (const p of befund.punkte) console.log('  ' + (p.ok ? '✔' : '✖') + ' ' + p.id.padEnd(24) + p.detail);
  const offen = befund.punkte.filter((p) => !p.ok).map((p) => p.id);
  console.log(offen.length ? 'reißt an: ' + offen.join(', ') : 'greift');
  process.exitCode = offen.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e && e.stack || e); process.exit(2); });
module.exports = { messen, wortmarkeEinordnen, SENTINEL_PRIVATE_JWK, HERKUNFTSORT_KENNUNGEN, BLEIBT_BEWUSST, VORGABE };
