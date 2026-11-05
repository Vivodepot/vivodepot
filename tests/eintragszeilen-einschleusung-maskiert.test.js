'use strict';
/* Eintragszeilen maskiert (Nachtrag U2-ADR-497, 01.11.2026). Die Bildschirmzeile eines Listen-Eintrags baut listenEintragZeileHTML
   und maskiert dort Beschriftung und Wert; die drei Einsetzstellen (Anzeige feldWertHTML, Vorschlagskasten listenVorschlaegeHTML,
   Lese-App feldZeileHTML) setzen ihr HTML ungeprüft ein. Der Textknoten-Wächter (tools/textknoten-verkettung-pruefen.js) führt sie
   darum in seiner Grundlinie; diese Probe hält, was er nicht sieht: Beschriftung UND Wert mit `<script>`, `"`, `&` und `<` kommen auf
   allen drei Wegen nur maskiert an. Die Vorschläge kommen aus einer veränderten Lesestelle, weil das Sprachmodul beim Einlass solchen
   Text schon abweist; geprüft wird allein der Bauer.
   Rot-Beweis: mit einem absichtlich unmaskierten Bauer (Kern und Lese-App) sieht die Probe das Markup auf jedem Weg. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const LESEN_PFAD = path.join(__dirname, '..', 'vivodepot-lesen.html');
const BESCHRIFTUNG = 'Schritt <script>alert(1)</script> "a" & <b';
const WERT = 'Bank <script>alert(2)</script> "x" & <i';
const FELD = { id: 'tpl_probe', typ: 'liste', vorschlaegeAbWerk: 1, unterFelder: [{ id: 'tpl_step', typ: 'text', label: BESCHRIFTUNG }] };
const EINTRAG = { tpl_step: WERT };
const SEKTOR = 'pro-kontakte-vertretungsplan';
// Der Sektor gehört zu pro-de; öffentlich gehen nur die zwei Privat-Produkte hinaus, dort springen beide Tests sichtbar auf skip.
const baubar = (slug) => require('../tools/lib/vier-produkte.js').PRODUKTE.some((p) => p.slug === slug);
const OHNE_PRO = baubar('pro-de') ? false : 'öffentlich kein Pro-Produkt (pro-de wird nicht gebaut)';

const LESESTELLE = 'function listenVorschlaegeAbWerk(sektorId, feld) {';
// `<` als <: ein wörtliches `</script>` im eingesetzten Quelltext schlösse den Skriptblock des Kerns.
const alsQuelle = (t) => JSON.stringify(t).replace(/</g, '\\u003c');
const UNTERGESCHOBEN = LESESTELLE + "\n  if (feld && feld.id === 'tpl_probe') return [{ tpl_step: " + alsQuelle(WERT) + ' }];';
// Der absichtlich unmaskierte Bauer: in Kern und Lese-App dieselben zwei Stellen.
const UNMASKIERT = [
  ["'<span class=\"liste-eintrag-label\">' + escapeHTML(t.label) + '</span>'", "'<span class=\"liste-eintrag-label\">' + t.label + '</span>'"],
  ["'<span class=\"liste-eintrag-wert\">' + escapeHTML(t.text || t.label) + '</span></span>'", "'<span class=\"liste-eintrag-wert\">' + (t.text || t.label) + '</span></span>'"],
];

function ersetzt(text, ersetzungen) {
  for (const [alt, neu] of ersetzungen) {
    const vorher = text;
    text = text.replace(alt, neu);
    assert.notEqual(text, vorher, 'die Ersetzung griff: ' + alt.slice(0, 60));
  }
  return text;
}

function kernWege(ersetzungen) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eintragszeilen-maskiert-'));
  try {
    const p = path.join(dir, 'kern.html');
    fs.writeFileSync(p, ersetzt(fs.readFileSync(KERN_PFAD, 'utf8'), [[LESESTELLE, UNTERGESCHOBEN], ...ersetzungen]));
    const { V } = ladeKern({ htmlPfad: p, backen: true, produkt: 'pro-de' });
    return { V, wege: { 'Anzeige (zeileHTML)': V.feldWertHTML(FELD, [EINTRAG]), 'Vorschlagskasten': V.listenVorschlaegeHTML(SEKTOR, FELD) } };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function leseWeg(ersetzungen) {
  const { V } = ladeLesen({ html: ersetzt(fs.readFileSync(LESEN_PFAD, 'utf8'), ersetzungen) });
  return V.feldZeileHTML(SEKTOR, FELD, [EINTRAG]);
}

// Funde je Weg: Markup im Klartext oder ein Teil, der nicht maskiert ankommt.
function funde(esc, wo, html, mitBeschriftung) {
  const f = [];
  if (/<script|<b\b|<i\b/i.test(html)) f.push(wo + ': Markup im HTML');
  if (html.includes(WERT)) f.push(wo + ': Wert unmaskiert');
  if (!html.includes(esc(WERT))) f.push(wo + ': Wert nicht maskiert vorhanden');
  if (mitBeschriftung) {
    if (html.includes(BESCHRIFTUNG)) f.push(wo + ': Beschriftung unmaskiert');
    if (!html.includes(esc(BESCHRIFTUNG))) f.push(wo + ': Beschriftung nicht maskiert vorhanden');
  }
  return f;
}

test('[Eintragszeile·Maskiert] Beschriftung und Wert mit <script>, ", & und < kommen auf allen drei Wegen nur maskiert an', { skip: OHNE_PRO }, () => {
  const { V, wege } = kernWege([]);
  // Voraussetzung: die Maskierung erfasst alle vier Zeichen, sonst prüfte der Vergleich mit esc() nichts.
  assert.equal(V.escapeHTML('<>"&'), '&lt;&gt;&quot;&amp;');
  assert.match(wege['Anzeige (zeileHTML)'], /class="liste-eintrag-label"/, 'Voraussetzung: die Anzeige trägt die Beschriftung');
  const alle = [
    ...funde(V.escapeHTML, 'Kern Anzeige', wege['Anzeige (zeileHTML)'], true),
    // Der Kasten zeigt die Beschriftung wie die Liste darunter.
    ...funde(V.escapeHTML, 'Kern Vorschlagskasten', wege['Vorschlagskasten'], true),
  ];
  const { V: L } = ladeLesen();
  alle.push(...funde(L.escapeHTML, 'Lese-App', leseWeg([]), true));
  assert.deepEqual(alle, []);
});

test('[Eintragszeile·Maskiert·Rot-Beweis] mit unmaskiertem Bauer sieht die Probe das Markup auf jedem der drei Wege', { skip: OHNE_PRO }, () => {
  const { V, wege } = kernWege(UNMASKIERT);
  assert.ok(funde(V.escapeHTML, 'Anzeige', wege['Anzeige (zeileHTML)'], true).length > 0, 'Anzeige fällt');
  assert.ok(funde(V.escapeHTML, 'Vorschlagskasten', wege['Vorschlagskasten'], true).length > 0, 'Vorschlagskasten fällt');
  const { V: L } = ladeLesen();
  assert.ok(funde(L.escapeHTML, 'Lese-App', leseWeg(UNMASKIERT), true).length > 0, 'Lese-App fällt');
});
