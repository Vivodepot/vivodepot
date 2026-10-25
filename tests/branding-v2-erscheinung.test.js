'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-473 W2 — Branding-Modul v2 mit `erscheinung.tokens`: Prüfung, Einlass, Anwenden
   ────────────────────────────────────────────────────────────────────────────
   Ein Branding-Modul mit moduleVersion 2 trägt ein Token-Profil je Ebene (basis, hochkontrast, dunkel). Es wird über das
   Erscheinungsbild des Produkts gelegt und mit DERSELBEN Prüfung beurteilt wie das Ab-Werk-Modul (erscheinungsbildPruefen):
   Namen, Grammatik, Kontrast in jeder Ebene, Mindestgrößen. Ein Verstoß lehnt das ganze Modul ab. Werte des Hauses stehen
   nicht im Gerüst — die Probe holt das Haus aus dem gebackenen Produkt (ladeKern backt).
   Auf Zeichenebene, wo die Test-DOM eine Attrappe ist: die Reihenfolge der Blätter prüft eine vm-Probe am Quelltext des
   Anwendeorts (Haus, Profil, Schutz-CSS zuletzt).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');

const WURZEL = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
const ZUSATZ = ['ERSCHEINUNGSBILD', 'ERSCHEINUNGSBILD_REGELN', 'ERSCHEINUNG_PROFIL_GESPERRT', '_BRANDING_ERSCHEINUNG_FELDER',
  'brandingErscheinungPruefen', '_brandingErscheinungAnwenden', 'AB_WERK_BRANDING', '_ERSCHEINUNG_MODUL_SCHLUESSEL'];
function kern(opts) {
  const { V } = ladeKern(Object.assign({ zusatzBindungen: ZUSATZ }, opts || {}));
  return Object.assign({}, V, V.__zusatz);
}
const v2 = (basis, weitere, extra) => ({ modulTyp: 'branding', moduleVersion: 2, herkunft: 'probe',
  erscheinung: { tokens: Object.assign(basis ? { basis } : {}, weitere || {}) }, ...(extra || {}) });

test('[U2-ADR-473·W2] die Probe sieht ein Haus: das gebackene Produkt trägt ein gültiges Erscheinungsbild', () => {
  const V = kern();
  assert.equal(V.ERSCHEINUNGSBILD.gueltig, true);
  assert.ok(Object.keys(V.ERSCHEINUNGSBILD.ebenen.basis).length > 50);
});

/* ── Rot-Beweise der Abnahme ── */
test('[U2-ADR-473·W2·Rot-Beweis] Text #999999 auf Weiß wird abgelehnt, das ganze Modul, das Paar benannt', () => {
  const V = kern();
  const r = V.brandingModulPruefen(v2({ '--ink': '#999999', '--cream': '#ffffff' }, null, { name: 'Probe' }));
  assert.equal(r.gueltig, false, 'auch der gültige Name rettet das Modul nicht');
  assert.equal(r.grund, 'erscheinung-kontrast');
  assert.ok(r.verstoesse.some((x) => x.regel === 'kontrast' && x.ebene === 'basis' && x.schluessel === '--ink/--cream'));
});

test('[U2-ADR-473·W2·Rot-Beweis] ein Profil, das nachts helle Flächen setzt, fällt in der Ebene dunkel', () => {
  const V = kern();
  const r = V.brandingModulPruefen(v2(null, { dunkel: { '--cream': '#ffffff', '--white': '#ffffff', '--papier-bereich': '#ffffff' } }));
  assert.equal(r.grund, 'erscheinung-kontrast');
  assert.ok(r.verstoesse.some((x) => x.ebene === 'dunkel'), 'der Verstoß steht in der Nacht, nicht im Hellen');
  assert.ok(!r.verstoesse.some((x) => x.ebene === 'basis'), 'hell bleibt unberührt');
});

test('[U2-ADR-473·W2·Rot-Beweis] --ziel: 20px wird abgelehnt (WCAG 2.5.8, Regel des Gerüsts)', () => {
  const V = kern();
  const r = V.brandingModulPruefen(v2({ '--ziel': '20px' }));
  assert.equal(r.grund, 'erscheinung-mindestgroesse');
  assert.ok(r.verstoesse.some((x) => x.schluessel === '--ziel' && x.wert === 20));
});

test('[U2-ADR-473·W2·Rot-Beweis] ein Bedeutungs-Token wird abgelehnt — in jeder Ebene', () => {
  const V = kern();
  assert.equal(V.brandingModulPruefen(v2({ '--fehler-flaeche': '#fdecea', '--gold': '#8a6d3a' })).grund, 'erscheinung-token-gesperrt');
  assert.equal(V.brandingModulPruefen(v2(null, { hochkontrast: { '--error': '#ff0000' } })).grund, 'erscheinung-token-gesperrt');
  for (const name of V.ERSCHEINUNG_PROFIL_GESPERRT) {
    assert.equal(V.brandingModulPruefen(v2({ [name]: '#123456' })).grund, 'erscheinung-token-gesperrt', name);
  }
});

// Diskriminante: die gesperrten Namen, die das Gerüst nicht kennt.
function gesperrtOhneVokabular(V) { return [...V.ERSCHEINUNG_PROFIL_GESPERRT].filter((name) => !V.ERSCHEINUNGSBILD_REGELN.token.includes(name)); }
test('[U2-ADR-473·W2] jeder gesperrte Name ist Vokabular des Gerüsts — eine Sperre auf einen unbekannten Namen sperrte nichts', () => {
  const V = kern();
  assert.deepEqual(gesperrtOhneVokabular(V), []);
});

test('[U2-ADR-473·W2] die Rollen der Bedienschrift und die kern-berechneten Tokens setzt kein Profil', () => {
  const V = kern();
  for (const name of ['--fs-role-label', '--fs-role-titel', '--akzent', '--vm-chrome']) {
    const r = V.brandingModulPruefen(v2({ [name]: name.indexOf('--fs') === 0 ? '1rem' : '#112233' }));
    assert.equal(r.grund, 'erscheinung-token-verworfen', name);
    assert.ok(r.verstoesse.some((x) => x.grund === 'geschuetzt'), name);
  }
});

test('[U2-ADR-473·W2] Form: unbekannter Name, url( und unbekannter Verweis lehnen das ganze Profil ab', () => {
  const V = kern();
  assert.equal(V.brandingModulPruefen(v2({ '--gold': '#8a6d3a', '--frei-erfunden': '#112233' })).grund, 'erscheinung-token-verworfen');
  assert.equal(V.brandingModulPruefen(v2({ '--gold': 'url(x)' })).grund, 'erscheinung-token-verworfen');
  assert.equal(V.brandingModulPruefen(v2({ '--gold': 'var(--erfunden)' })).grund, 'erscheinung-token-verworfen');
});

test('[U2-ADR-473·W2] layout und stil gibt es hier nicht; schriften ist benannt, bis W4 abgelehnt', () => {
  const V = kern();
  assert.deepEqual(Object.keys(V._BRANDING_ERSCHEINUNG_FELDER), ['tokens', 'schriften']);
  for (const feld of ['layout', 'stil']) {
    assert.equal(V.brandingModulPruefen({ moduleVersion: 2, erscheinung: { [feld]: {} } }).grund, 'erscheinung-feld-unbekannt', feld);
  }
  assert.equal(V.brandingModulPruefen({ moduleVersion: 2, erscheinung: { schriften: {} } }).grund, 'erscheinung-feld-noch-nicht-unterstuetzt');
});

test('[U2-ADR-473·W2] die Ebenen sind die des Erscheinungsbild-Moduls; eine flache Token-Liste wird abgelehnt', () => {
  const V = kern();
  assert.equal(V.brandingModulPruefen({ moduleVersion: 2, erscheinung: { tokens: { '--gold': '#8a6d3a' } } }).grund, 'erscheinung-ebene-unbekannt');
  assert.equal(V.brandingModulPruefen(v2({}, { dunkel: {} })).grund, 'erscheinung-tokens-leer');
});

test('[U2-ADR-473·W2·Rot-Beweis] ohne Haus (das nackte Gerüst) wird jedes Profil abgelehnt', () => {
  const V = kern();
  const e = { tokens: { basis: { '--radius-karte': '20px' } } };
  assert.equal(V.brandingErscheinungPruefen(e, null).grund, 'erscheinung-ohne-haus');
  assert.equal(V.brandingErscheinungPruefen(e, { gueltig: false, ebenen: null }).grund, 'erscheinung-ohne-haus');
  const nackt = kern({ blank: true });
  assert.equal(nackt.ERSCHEINUNGSBILD.gueltig, false, 'das ungebackene Gerüst hat kein Haus');
  assert.equal(nackt.brandingModulPruefen(v2({ '--radius-karte': '20px' })).grund, 'erscheinung-ohne-haus');
});

test('[U2-ADR-473·W2] ein gültiges Profil kommt unverändert zurück, je Ebene', () => {
  const V = kern();
  const basis = { '--cream': '#f7f5f0', '--radius-karte': '20px', '--label-schreibung': 'none', '--feld-hoehe': '52px' };
  const dunkel = { '--radius-karte': '20px' };
  const r = V.brandingModulPruefen(v2(basis, { dunkel }, { name: 'Musterverein' }));
  assert.equal(r.gueltig, true, JSON.stringify(r.verstoesse));
  assert.deepEqual(r.branding.erscheinung, { tokens: { basis, dunkel } });
  // Das geprüfte branding hat dieselbe Form wie das rohe Modul — der Anwendeort prüft beide gleich.
  assert.equal(V.brandingErscheinungPruefen(r.branding.erscheinung).gueltig, true);
});

test('[U2-ADR-473·W2] Fassung 1 bleibt gültig und unverändert; erscheinung in Fassung 1 wird abgelehnt', () => {
  const V = kern();
  const v1 = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', farbePrimaer: '#112233', name: 'Alt' };
  const r = V.brandingModulPruefen(v1);
  assert.equal(r.gueltig, true);
  assert.equal(r.branding.erscheinung, null);
  assert.equal(V.brandingModulPruefen({ ...v1, erscheinung: { tokens: { basis: { '--gold': '#8a6d3a' } } } }).grund, 'erscheinung-erst-ab-fassung-2');
});

test('[U2-ADR-473·W2·Rot-Beweis] signiert mit erscheinung angenommen, unsigniert abgewiesen, verletzt mit Grund abgewiesen', () => {
  const V = kern();
  const gut = JSON.stringify(v2({ '--radius-karte': '20px' }, null, { name: 'Musterverein' }));
  const d = V.leeresDepot();
  const unsigniert = V.modulEinlassen(gut, d);
  assert.equal(unsigniert.angenommen, false);
  assert.equal(unsigniert.grund, 'nur-signiert-erlaubt');
  const signiert = V.modulEinlassen(gut, d, 'geprüfter-musterverein');
  assert.equal(signiert.angenommen, true, 'grund: ' + signiert.grund);
  assert.deepEqual(d.brandingModule[0].erscheinung.tokens, { basis: { '--radius-karte': '20px' } });
  const schlecht = V.modulEinlassen(JSON.stringify(v2({ '--ink': '#999999' })), V.leeresDepot(), 'geprüfter-musterverein');
  assert.equal(schlecht.angenommen, false);
  assert.equal(schlecht.grund, 'erscheinung-kontrast');
});

test('[U2-ADR-473·W2·Rot-Beweis] die Mindestschrift gilt auch für ein SIGNIERTES Profil: --fs-base 13.9px wird abgewiesen', () => {
  const V = kern();
  const r = V.modulEinlassen(JSON.stringify(v2({ '--fs-base': '13.9px' })), V.leeresDepot(), 'geprüfter-musterverein');
  assert.equal(r.angenommen, false);
  assert.equal(r.grund, 'erscheinung-mindestgroesse');
  const gut = V.modulEinlassen(JSON.stringify(v2({ '--fs-base': '14px' })), V.leeresDepot(), 'geprüfter-musterverein');
  assert.equal(gut.angenommen, true, 'Gegenprobe: 14px gilt');
});

test('[U2-ADR-473·W2] ab Werk trägt die Marke kein Profil; der Anwendeort legt dann nichts an', () => {
  const V = kern();
  assert.equal(V.AB_WERK_BRANDING.erscheinung, undefined);
  const doc = { adoptedStyleSheets: [] };
  assert.equal(V._brandingErscheinungAnwenden(V.AB_WERK_BRANDING, doc), null);
  assert.equal(V._brandingErscheinungAnwenden(null, doc), null);
  assert.deepEqual(doc.adoptedStyleSheets, []);
});

test('[U2-ADR-473·W2] der Anwendeort prüft noch einmal: ein Profil, das den Einlass umginge, wird dort abgelehnt', () => {
  const V = kern();
  const doc = { adoptedStyleSheets: [] };
  // Ein Modul, das per Hand in eine Liste gelangte (kein Einlass): der Anwendeort fragt dieselbe Prüfung.
  const r = V._brandingErscheinungAnwenden(v2({ '--error': '#00ff00' }), doc);
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'erscheinung-token-gesperrt');
  assert.deepEqual(doc.adoptedStyleSheets, [], 'kein Blatt eingehängt');
});

// Diskriminante: die Gestaltungswerte (Farbe, Länge) im Code des W2-Blocks, ohne Kommentare.
function gestaltungswerteImW2Block(text) {
  const a = text.indexOf('U2-ADR-473 W2 — BRANDING-MODUL v2');
  const e = text.indexOf('function _brandingErscheinungAnwenden', a);
  const code = text.slice(a, e).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return code.match(/#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem)\b/g) || [];
}
test('[U2-ADR-473·W2·Gerüst] der W2-Block trägt keinen Gestaltungswert — die Werte kommen aus dem Haus', () => {
  const a = KERN.indexOf('U2-ADR-473 W2 — BRANDING-MODUL v2');
  const e = KERN.indexOf('function _brandingErscheinungAnwenden', a);
  assert.ok(a > 0 && e > a);
  assert.deepEqual(gestaltungswerteImW2Block(KERN), []);
});

/* ── Auflagen der Gegenlesung (Krypto 2) ── */
function umgebendeFunktion(text, pos) {
  const vorher = text.slice(0, pos);
  const m = [...vorher.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].pop();
  return m ? m[1] : null;
}
const BLATT_ERLAUBT = new Set(['erscheinungsbildAnwenden', '_ebRueckfall', '_erscheinungProfilRaeumen', '_brandingErscheinungAnwenden']);
function blattStellen(text) { return [...text.matchAll(/adoptedStyleSheets\s*=(?!=)/g)].map((m) => ({ pos: m.index, fn: umgebendeFunktion(text, m.index) })); }
// Diskriminante des Klassenwächters: die Funktionen, die ein Blatt einhängen, ohne erlaubt zu sein (oder am falschen Ort stehen).
function fremdeBlattStellen(text) {
  const kopfAnfang = text.indexOf('<script id="erscheinungsbild">');
  const kopfEnde = text.indexOf('</script>', kopfAnfang);
  return blattStellen(text).filter((f) => !BLATT_ERLAUBT.has(f.fn) || (f.pos > kopfAnfang && f.pos < kopfEnde) !== ['erscheinungsbildAnwenden', '_ebRueckfall'].includes(f.fn))
    .map((f) => f.fn);
}
test('[U2-ADR-473·W2·Klassenwächter] ein Blatt hängt nur das Kopf-Skript (Haus, Schutz, Rückfall) oder der Anwendeort des Profils ein', () => {
  const erlaubt = BLATT_ERLAUBT;
  assert.ok(blattStellen(KERN).length >= 4, 'die Suche findet die bekannten Stellen');
  assert.deepEqual(fremdeBlattStellen(KERN), []);
  // Rot-Beweis: eine zweite Stelle, die ein Blatt einhängt, wird gefunden.
  const gepflanzt = KERN.replace('function brandingModulEinbetten(', 'function _fremdesBlatt(d, b) { d.adoptedStyleSheets = [b]; }\nfunction brandingModulEinbetten(');
  const neu = [...gepflanzt.matchAll(/adoptedStyleSheets\s*=(?!=)/g)].map((m) => umgebendeFunktion(gepflanzt, m.index)).filter((fn) => !erlaubt.has(fn));
  assert.deepEqual(neu, ['_fremdesBlatt']);
});

test('[U2-ADR-473·W2] der In-Depot-Weg wendet kein Profil an: nur der Vor-Depot-Weg ruft den Anwendeort', () => {
  const aufrufe = [...KERN.matchAll(/(?<!function )_brandingErscheinungAnwenden\(/g)].map((m) => m.index);
  const a = KERN.indexOf('async function vorDepotKonfigurationAnwenden(');
  const e = KERN.slice(a + 1).search(/\n(?:async )?function /) + a + 1;   // nächste Deklaration auf oberster Ebene
  assert.ok(a > 0 && e > a);
  assert.equal(aufrufe.length, 1, 'genau ein Aufruf');
  assert.ok(aufrufe[0] > a && aufrufe[0] < e, 'und der steht in vorDepotKonfigurationAnwenden');
});

/* Die Reihenfolge der Blätter am echten Quelltext des Anwendeorts, in einem eigenen Kontext mit konstruierbaren Blättern
   (die Test-DOM kennt keine): das Profil steht hinter dem Haus und VOR dem Schutz-CSS; meldet die Laufzeitprobe einen Verstoß,
   geht das Profil, Haus und Schutz bleiben. */
function quelle(text, name) {
  const a = text.indexOf('function ' + name + '(');
  return text.slice(a, text.indexOf('\n}\n', a) + 2);
}
function anwendeortFahren(text, schutzVerstoesse) {
  const ctx = vm.createContext({
    console: { warn() {} },
    ERSCHEINUNGSBILD_REGELN: { ebenen: { basis: ':root', hochkontrast: 'html.high-contrast', dunkel: 'html.dark-mode' } },
    brandingErscheinungPruefen: (e) => ({ gueltig: true, grund: null, erscheinung: e, verstoesse: [] }),
    erscheinungsbildCss: () => ':root{}',
    erscheinungsbildSchutzProbe: () => schutzVerstoesse,
    CSSStyleSheet: class { constructor() { this.name = 'profil'; } replaceSync() {} },
  });
  vm.runInContext('let _ebProfilBlatt = null; let ERSCHEINUNG_PROFIL_RUECKFALL = null;\n'
    + quelle(text, '_erscheinungProfilRaeumen') + quelle(text, '_brandingErscheinungAnwenden')
    + '\nglobalThis.__anwenden = _brandingErscheinungAnwenden;', ctx);
  const doc = { adoptedStyleSheets: [{ name: 'haus' }, { name: 'schutz' }] };
  ctx.__anwenden({ erscheinung: { tokens: { basis: { '--radius-karte': '20px' } } } }, doc);
  return doc.adoptedStyleSheets.map((b) => b.name);
}
test('[U2-ADR-473·W2·Schutz-CSS] das Profil steht hinter dem Haus und vor dem Schutz-CSS; bei einem Verstoß geht nur das Profil', () => {
  assert.deepEqual(anwendeortFahren(KERN, []), ['haus', 'profil', 'schutz']);
  assert.deepEqual(anwendeortFahren(KERN, [{ element: 'notfall', grund: 'verdeckt' }]), ['haus', 'schutz']);
});
test('[U2-ADR-473·W2·Schutz-CSS·Rot-Beweis] ein Anwendeort, der das Profil hinter das Schutz-CSS hängt, wird erkannt', () => {
  const zeile = '    blaetter.splice(Math.max(0, blaetter.length - 1), 0, _ebProfilBlatt);';
  assert.ok(KERN.includes(zeile), 'die Zeile steht im Anwendeort');
  assert.deepEqual(anwendeortFahren(KERN.replace(zeile, '    blaetter.push(_ebProfilBlatt);'), []), ['haus', 'schutz', 'profil']);
});

/* Krypto 2, Bedingung 2: der unsignierte Weg (Erscheinungs-Modul) trägt nur Darstellung — keinen Namen, kein Logo, keine
   Herkunftsaussage, kein Profil und keinen Schalter. Erlaubt sind die fünf Rollen und die Einlass-Marken, die der Einlass selbst
   setzt bzw. zurücksetzt. */
const ERSCHEINUNG_ERLAUBT = ['modulTyp', 'moduleVersion', 'label', 'wert', 'gruppe', 'abschnitt', 'titel', 'herkunft',
  'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft'];
function unsigniertVerstoesse(schluessel, pruefen) {
  const v = schluessel.filter((k) => ERSCHEINUNG_ERLAUBT.indexOf(k) < 0).map((k) => 'Feld ' + k);
  const r = pruefen({ moduleVersion: 1, label: '16px', name: 'Fremd', logo: 'data:image/png;base64,iVBORw0KGgo=', poweredByAus: true,
    erscheinung: { tokens: { basis: { '--ink': '#000000' } } }, farbePrimaer: '#112233' });
  const aus = Object.keys(r.erscheinung || {});
  if (aus.join() !== 'label,wert,gruppe,abschnitt,titel') v.push('Ergebnis trägt ' + aus.join());
  for (const k of ['name', 'logo', 'poweredByAus', 'erscheinung', 'farbePrimaer']) {
    if (!r.verworfene.some((x) => x.schluessel === k && x.grund === 'unbekannt')) v.push(k + ' nicht als unbekannt verworfen');
  }
  return v;
}
test('[U2-ADR-473·W2·Krypto 2] das unsignierte Erscheinungs-Modul trägt nur Darstellung — kein Name, kein Logo, kein Schalter, kein Profil', () => {
  const V = kern();
  assert.deepEqual(unsigniertVerstoesse([...V._ERSCHEINUNG_MODUL_SCHLUESSEL], V.erscheinungModulPruefen), []);
  assert.ok(!/brandingModulPruefen|_markeName|poweredByAus/.test(quelle(KERN, 'erscheinungModulPruefen')), 'der Prüfer liest keine Marke');
});
test('[U2-ADR-473·W2·Krypto 2·Rot-Beweis] eine Feldliste mit name, oder ein Prüfer, der name durchreicht, wird gemeldet', () => {
  const V = kern();
  assert.deepEqual(unsigniertVerstoesse([...V._ERSCHEINUNG_MODUL_SCHLUESSEL, 'name'], V.erscheinungModulPruefen), ['Feld name']);
  const durchreicher = (m) => { const r = V.erscheinungModulPruefen(m); return { ...r, erscheinung: { ...r.erscheinung, name: m.name },
    verworfene: r.verworfene.filter((x) => x.schluessel !== 'name') }; };
  assert.deepEqual(unsigniertVerstoesse([...V._ERSCHEINUNG_MODUL_SCHLUESSEL], durchreicher),
    ['Ergebnis trägt label,wert,gruppe,abschnitt,titel,name', 'name nicht als unbekannt verworfen']);
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Die übrigen Titel sind Konstruktions-Form (feste Module gegen erwartete Gründe, feste Reihenfolgen), keine Verletzungsliste. */
module.exports = {
  PROBEN: [
    { fuer: '[U2-ADR-473·W2] jeder gesperrte Name ist Vokabular des Gerüsts — eine Sperre auf einen unbekannten Namen sperrte nichts', diskriminante: gesperrtOhneVokabular },
    { fuer: '[U2-ADR-473·W2·Gerüst] der W2-Block trägt keinen Gestaltungswert — die Werte kommen aus dem Haus', diskriminante: gestaltungswerteImW2Block },
    { fuer: '[U2-ADR-473·W2·Klassenwächter] ein Blatt hängt nur das Kopf-Skript (Haus, Schutz, Rückfall) oder der Anwendeort des Profils ein', diskriminante: fremdeBlattStellen },
    { fuer: '[U2-ADR-473·W2·Krypto 2] das unsignierte Erscheinungs-Modul trägt nur Darstellung — kein Name, kein Logo, kein Schalter, kein Profil', diskriminante: unsigniertVerstoesse },
  ],
};
