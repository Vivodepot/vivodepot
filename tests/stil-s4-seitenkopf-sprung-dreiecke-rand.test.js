'use strict';
/* ═════════════════════════════════════════════════════════════════
   Test: Zielbild S4, Abnahme v979 Nr. 7, 8, 9, 11 (Dreiecke), 12, 13, 14
   ─────────────────────────────────────────────────────────────────
   Nr. 7  Der Seitentitel trägt keinen Balken links; der Untertitel steht in 17 px und in --ink2 (Token).
   Nr. 8  Die Sprungmarken „Auf dieser Seite“ sind Pillen, keine Textlinks mit gepunkteter Linie.
   Nr. 9  Einleitungen und Hinweise stehen aufrecht; kursiv bleibt die Handschrift im Notfallblatt (.nfb-hand).
   Nr. 11 Die Gruppen der Seitenleiste tragen kein ▾ (summary::after); das <details>/<summary> bleibt.
   Nr. 12 Bei 390 px ist der Rand links und rechts gleich (16 px); das Profil „Salbei mit Glas“ setzt 48 px nur auf breiten Bildschirmen.
   Nr. 13 Nachts ist der aktive Eintrag der Seitenleiste dieselbe Salbei-Fläche (--salbei-light) wie bei Tag.
   Nr. 14 Ein Titel steht nur einmal: eine Gruppe, die allein im Abschnitt steht und heißt wie er, entfällt als Karte; eine Beschriftung,
          die der Titel darüber schon sagt, entfällt optisch.
   Gelesen werden die Quellen des Stils (tools/erscheinung/stil/) und der Kern. Rot-Beweis: je Nr. eine verdorbene Fassung, die die
   Prüfung abweisen muss (Zustand vor dem Bau).
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { zerlegen, deklarationen, ohneKommentare } = require('../tools/lib/css-zerlegen.js');
const { ladeKern } = require('./load-kern.js');

const STIL = path.join(__dirname, '..', 'tools', 'erscheinung', 'stil');
const GRUNDLAGE = fs.readFileSync(path.join(STIL, 'grundlage.css'), 'utf8');
const SALBEI_GLAS = fs.readFileSync(path.join(STIL, 'salbei-glas.css'), 'utf8');
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Alle Regeln flach, jede mit den Köpfen ihrer At-Regeln. */
function regeln(css, huelle = []) {
  const raus = [];
  for (const x of zerlegen(css)) {
    if (x.art === 'regel') {
      const sel = ohneKommentare(x.selektor).trim().replace(/\s+/g, ' ');
      raus.push({ huelle, selektoren: sel.split(/,(?![^(]*\))/).map((s) => s.trim()), dekl: deklarationen(x.innen) });
    } else if (x.art === 'at-block' && (x.name === 'media' || x.name === 'supports')) {
      raus.push(...regeln(x.innen, huelle.concat(x.kopf.trim().replace(/\s+/g, ' '))));
    }
  }
  return raus;
}
const wert = (r, prop) => {
  const d = r.dekl.find((z) => z.toLowerCase().startsWith(prop + ':'));
  return d ? d.slice(prop.length + 1).trim() : null;
};
/* Regeln, deren Selektorliste genau diesen Selektor enthält. */
const mit = (css, selektor) => regeln(css).filter((r) => r.selektoren.includes(selektor));

/* ── Nr. 7 ── */
function seitentitelMaengel(kern, css) {
  const m = [];
  const z = kern.split('\n').find((l) => l.startsWith('.bereich-kopf h1:focus-visible'));
  if (!z) m.push('Regel .bereich-kopf h1:focus-visible nicht gefunden');
  else if (/border-left|padding-left/.test(z)) m.push('Balken links am Seitentitel: ' + z.slice(0, 120));
  const u = mit(css, '.sektor-intro').filter((r) => wert(r, 'font-size') !== null).pop();
  if (!u) m.push('.sektor-intro fehlt');
  else {
    if (wert(u, 'font-size') !== 'var(--fs-role-einleitung)') m.push('Untertitel nicht 17 px (1,0625 · Grundgröße, ohne Rohwert): ' + wert(u, 'font-size'));
    if (wert(u, 'color') !== 'var(--ink2)') m.push('Untertitel nicht in --ink2: ' + wert(u, 'color'));
  }
  return m;
}
test('[S4·Nr. 7] Seitentitel ohne Balken links, Untertitel 17 px in --ink2', () => {
  assert.deepEqual(seitentitelMaengel(KERN, GRUNDLAGE), []);
});
test('[S4·Nr. 7·Rot-Beweis] der Balken links und der kleine Untertitel fallen durch', () => {
  const alt = '.bereich-kopf h1:focus-visible, .bereich-kopf h2:focus-visible { border-left: var(--akzent-rand) solid var(--salbei-mid) !important; padding-left: calc(var(--space-4) - var(--akzent-rand)) !important; }';
  assert.ok(seitentitelMaengel(alt, GRUNDLAGE).some((x) => /Balken links/.test(x)));
  const klein = '.sektor-intro { color: var(--ink); font-size: var(--fs-sm); }';
  assert.equal(seitentitelMaengel(KERN, klein).length, 2);
});

/* ── Nr. 8 ── */
function sprungMaengel(css) {
  const m = [];
  const r = mit(css, '.toc-liste a').pop();
  if (!r) return ['.toc-liste a fehlt'];
  if (wert(r, 'border-radius') !== 'var(--radius-pill)') m.push('keine Pillenform: ' + wert(r, 'border-radius'));
  if (!/^var\(--[a-z-]+\)$/.test(wert(r, 'background') || '')) m.push('keine Fläche aus einem Token: ' + wert(r, 'background'));
  if (/dotted/.test(r.dekl.join(';'))) m.push('noch die gepunktete Linie des Textlinks');
  const hoch = parseInt(wert(r, 'min-height'), 10);
  if (!(hoch >= 24)) m.push('Trefferfläche unter 24 px');
  return m;
}
test('[S4·Nr. 8] die Sprungmarken sind Pillen mit Fläche aus einem Token', () => {
  assert.deepEqual(sprungMaengel(GRUNDLAGE), []);
});
test('[S4·Nr. 8·Rot-Beweis] der Textlink mit gepunkteter Linie fällt durch', () => {
  const alt = '.toc-liste a { color: var(--ink2); text-decoration: none; border-bottom: 1px dotted var(--ink3); display: inline-flex; align-items: center; min-height: 24px; }';
  assert.ok(sprungMaengel(alt).length >= 2);
});

/* ── Nr. 9 ── */
const AUFRECHT = ['.sektion-hint', '.pause-erlaubnis', '.depot-datei-hinweis', '.leer', '.doku-leer', '.situationen-leer-hint'];
function kursivMaengel(css) {
  const m = [];
  for (const sel of AUFRECHT) {
    const r = mit(css, sel).filter((x) => wert(x, 'font-style') !== null);
    if (!r.length) m.push(sel + ': keine Regel mit font-style');
    for (const x of r) if (wert(x, 'font-style') === 'italic') m.push(sel + ' kursiv');
  }
  const hand = mit(css, '.nfb-hand').pop();
  /* Seit der Notfallkarte v1014 steht auch die Handschrift-Anleitung im Notfallblatt aufrecht, als Leiste mit linker Kante. */
  if (!hand || wert(hand, 'font-style') === 'italic' || !wert(hand, 'border-left')) m.push('die Handschrift-Anleitung im Notfallblatt (.nfb-hand) steht aufrecht als Leiste mit linker Kante');
  return m;
}
test('[S4·Nr. 9] Einleitungen und Hinweise stehen aufrecht, die Handschrift-Anleitung im Notfallblatt als Leiste', () => {
  assert.deepEqual(kursivMaengel(GRUNDLAGE), []);
});
test('[S4·Nr. 9·Rot-Beweis] eine kursive Einleitung und eine kursive Handschrift-Leiste fallen durch', () => {
  const alt = GRUNDLAGE.replace('.sektion-hint { color: var(--ink2); font-size: var(--fs-role-hilfe); font-style: normal;', '.sektion-hint { color: var(--ink2); font-size: var(--fs-role-hilfe); font-style: italic;');
  assert.notEqual(alt, GRUNDLAGE);
  assert.ok(kursivMaengel(alt).includes('.sektion-hint kursiv'));
  const flach = GRUNDLAGE.replace('.nfb-hand { margin: 0 0 1.6rem; padding: 0.6rem 0.8rem;', '.nfb-hand { margin: 0 0 1.6rem; font-style: italic; padding: 0.6rem 0.8rem;');
  assert.notEqual(flach, GRUNDLAGE);
  assert.ok(kursivMaengel(flach).some((x) => /nfb-hand/.test(x)));
});

/* ── Nr. 11 (Dreiecke) ── */
function dreieckMaengel(css) {
  return regeln(css).filter((r) => r.selektoren.some((s) => /\.sidebar\b.*\.nav-gruppe.*summary::after/.test(s))).map((r) => r.selektoren[0]);
}
test('[S4·Nr. 11] die Gruppen der Seitenleiste tragen kein Dreieck, das Auf- und Zuklappen bleibt ein <details>/<summary>', () => {
  assert.deepEqual(dreieckMaengel(GRUNDLAGE), []);
  assert.deepEqual(dreieckMaengel(SALBEI_GLAS), []);
  assert.match(KERN, /<details class="nav-gruppe[^"]*"[^>]*><summary>/, 'die Gruppe klappt weiter über das native Element, das Screenreader mit Zustand ansagen');
  const sumRegel = mit(GRUNDLAGE, '.sidebar .nav-gruppe > summary').pop();
  assert.equal(wert(sumRegel, 'cursor'), 'pointer', 'die Zeile bleibt als bedienbar erkennbar');
});
test('[S4·Nr. 11·Rot-Beweis] das ▾ an der Gruppe fällt durch', () => {
  const alt = GRUNDLAGE + "\n.sidebar .nav-gruppe > summary::after { content: '▾'; margin-left: auto; }\n";
  assert.deepEqual(dreieckMaengel(alt), ['.sidebar .nav-gruppe > summary::after']);
});

/* ── Nr. 12 ── */
/* Der wirksame Seitenrand der Eingabesicht bei kleiner Breite, aus beiden Quellen in der Reihenfolge der Kaskade (Grundlage, dann Profil). */
function randMobil(grundlage, profil, breite) {
  const wirkt = (huelle) => huelle.every((h) => {
    const mx = /^@media\s*\(\s*max-width:\s*(\d+)px\s*\)$/.exec(h);
    if (mx) return breite <= +mx[1];
    const mn = /^@media\s*\(\s*min-width:\s*(\d+)px\s*\)$/.exec(h);
    if (mn) return breite >= +mn[1];
    return /^@media\s*print/.test(h) ? false : /^@media\s*\(\s*pointer/.test(h) ? false : false;
  });
  let links = null, rechts = null;
  for (const css of [grundlage, profil]) {
    for (const r of mit(css, '.content')) {
      if (!wirkt(r.huelle)) continue;
      const p = wert(r, 'padding');
      if (p) { const t = p.split(/\s+(?![^(]*\))/); links = t[t.length > 1 ? 1 : 0]; rechts = t[t.length > 1 ? 1 : 0]; if (t.length === 4) { links = t[3]; rechts = t[1]; } }
      const pl = wert(r, 'padding-left'); if (pl) links = pl;
      const pr = wert(r, 'padding-right'); if (pr) rechts = pr;
    }
  }
  return { links, rechts };
}
test('[S4·Nr. 12] bei 390 und 700 px ist der Rand links und rechts gleich 16 px (var(--space-4))', () => {
  for (const b of [390, 360, 460, 700]) {
    assert.deepEqual(randMobil(GRUNDLAGE, SALBEI_GLAS, b), { links: 'var(--space-4)', rechts: 'var(--space-4)' }, b + ' px');
  }
  assert.deepEqual(randMobil(GRUNDLAGE, SALBEI_GLAS, 1440).links, 'var(--space-7)', 'am Schreibtisch bleibt der breite Rand links');
});
test('[S4·Nr. 12·Rot-Beweis] der Rand 48/12 vor dem Bau fällt durch', () => {
  const altProfil = SALBEI_GLAS.replace(/@media \(min-width: 761px\) \{ \.content \{ padding-left: var\(--space-7\); \} \}/, '.content { padding-left: var(--space-7); }');
  assert.notEqual(altProfil, SALBEI_GLAS);
  assert.equal(randMobil(GRUNDLAGE, altProfil, 390).links, 'var(--space-7)', 'links 48 px');
  const altGrundlage = GRUNDLAGE.replace('.content { padding: var(--space-4); }\n    /* Wortmarke', '.content { padding: var(--space-4) var(--space-3); }\n    /* Wortmarke');
  assert.notEqual(altGrundlage, GRUNDLAGE);
  assert.equal(randMobil(altGrundlage, SALBEI_GLAS, 390).rechts, 'var(--space-3)', 'rechts 12 px');
});

/* ── Nr. 13 ── */
function nachtFlaecheMaengel(css) {
  const m = [];
  const nacht = regeln(css).filter((r) => r.selektoren.some((s) => /dark-mode/.test(s) && /\.nav-item\.aktiv$/.test(s) && !/modus-vollmacht|vm-akzent/.test(s)));
  if (!nacht.length) return ['keine Nacht-Regel für den aktiven Eintrag'];
  for (const r of nacht) if (wert(r, 'background') !== 'var(--salbei-light)') m.push(r.selektoren[0] + ': ' + wert(r, 'background'));
  const tag = regeln(css).filter((r) => r.selektoren.includes('html:not(.high-contrast) .nav-item.aktiv') && wert(r, 'background') !== null).pop();
  if (!tag || wert(tag, 'background') !== 'var(--salbei-light)') m.push('Tag: nicht --salbei-light');
  return m;
}
test('[S4·Nr. 13] nachts ist der aktive Eintrag dieselbe Salbei-Fläche (--salbei-light) wie bei Tag, ohne neuen Farbwert', () => {
  assert.deepEqual(nachtFlaecheMaengel(SALBEI_GLAS), []);
});
test('[S4·Nr. 13·Rot-Beweis] die graue Mischung aus --salbei-nacht fällt durch', () => {
  const alt = SALBEI_GLAS.replaceAll('html.dark-mode:not(.high-contrast) .nav-item.aktiv { background: var(--salbei-light);', 'html.dark-mode:not(.high-contrast) .nav-item.aktiv { background: color-mix(in srgb, var(--salbei-nacht) 18%, transparent);');
  assert.notEqual(alt, SALBEI_GLAS);
  assert.equal(nachtFlaecheMaengel(alt).length, 1);
});

/* ── Nr. 14 ── */
function kartenKern() {
  const k = ladeKern();
  const feld = (id, label, extra) => Object.assign({ id, label, typ: 'text' }, extra || {});
  return { V: k.V, feld };
}
test('[S4·Nr. 14] Gruppe mit einem Feld gleichen Namens: die Beschriftung entfällt optisch, die Karte trägt den Titel', () => {
  const { V, feld } = kartenKern();
  const f = feld('a', 'Pflege');
  const html = V.feldgruppenKarteHTML([{ id: 'x-pflege', name: 'Pflege', felder: ['a'] }], [f], 'people', {}, true);
  assert.match(html, /<details class="feldgruppen-karte"[^>]*><summary[^>]*><span class="feldgruppen-karte-titel">Pflege<\/span>/);
  assert.match(html, /<div class="feld-zeile" data-label-doppelt="1"><div class="feld-label">Pflege<\/div>/, 'im Markup bleibt sie für Screenreader');
});
test('[S4·Nr. 14] Gegenprobe: zwei Felder oder ein anders benanntes Feld behalten ihre Beschriftung', () => {
  const { V, feld } = kartenKern();
  const a = feld('a', 'Name'), b = feld('b', 'Pflege');
  const zwei = V.feldgruppenKarteHTML([{ id: 'x-pflege', name: 'Pflege', felder: ['a', 'b'] }], [a, b], 'people', {}, true);
  assert.doesNotMatch(zwei, /data-label-doppelt/, 'bei zwei Feldern nennt die Beschriftung, welches Feld gemeint ist');
  const eins = V.feldgruppenKarteHTML([{ id: 'x-pflege', name: 'Pflege', felder: ['a'] }], [a], 'people', {}, true);
  assert.doesNotMatch(eins, /data-label-doppelt/, 'ein Feld „Name“ in der Gruppe „Pflege“ sagt etwas anderes als die Gruppe');
});
test('[S4·Nr. 14] Abschnitt: allein stehende, gleich benannte Gruppe — die Überschrift des Abschnitts entfällt optisch', () => {
  const { V, feld } = kartenKern();
  const a = feld('a', 'Name'), b = feld('b', 'Pflege');
  const cl = [{ id: 'x1', name: 'Pflege', felder: ['a'] }];
  assert.equal(V._abschnittTitelDoppelt(cl, [a], 'Pflege'), true);
  assert.equal(V._abschnittTitelDoppelt(cl, [a], ' pflege. '), true, 'Groß-/Kleinschreibung, Leerraum und Punkt am Ende zählen nicht');
  assert.equal(V._abschnittTitelDoppelt(cl, [a], 'Menschen'), false, 'anderer Abschnittstitel');
  assert.equal(V._abschnittTitelDoppelt([{ id: 'x1', name: 'Pflege', felder: ['a'] }, { id: 'x2', name: 'Weiteres', felder: ['b'] }], [a, b], 'Pflege'), false, 'zwei sichtbare Gruppen');
  assert.equal(V._abschnittTitelDoppelt([{ id: 'x1', name: 'Pflege', felder: ['a'] }, { id: 'x2', name: 'Weiteres', felder: ['zzz'] }], [a], 'Pflege'), true, 'eine verborgene Gruppe zählt nicht');
});
test('[S4·Nr. 14] Menschen: Abschnitt, Gruppe und Feld heißen gleich — sichtbar bleibt der Titel einmal', async () => {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  let sektion = null, sektor = null;
  for (const s of k.V.bereicheAlle()) { const x = (s.sektionen || []).find((e) => e.id === 'kinder-sek'); if (x) { sektion = x; sektor = s; } }
  assert.ok(sektion, 'Abschnitt kinder-sek');
  const f = sektion.felder.find((x) => x.id === 'childrenAndDependants');
  assert.ok(f, 'Feld childrenAndDependants');
  const cluster = k.V.SEKTION_STATUSKARTEN_CLUSTER['kinder-sek'];
  assert.equal(sektion.label, f.label, 'Voraussetzung: Abschnitt und Feld heißen gleich');
  assert.equal(k.V._abschnittTitelDoppelt(cluster, [f], sektion.label), true, 'die Gruppe trägt den Titel, die Abschnittsüberschrift entfällt optisch');
  const html = k.V.feldgruppenKarteHTML(cluster, [f], sektor.id, {}, true);
  assert.match(html, /<span class="feldgruppen-karte-titel">Kinder und Schutzbefohlene<\/span>/);
  assert.match(html, /data-label-doppelt="1"/, 'die Beschriftung des Felds ist nicht noch einmal sichtbar');
  // Der Aufruf im Abschnittsbau setzt das Attribut an die Überschrift.
  assert.match(KERN, /<h2 class="sektion-titel"' \+ \(_titelDoppelt \? ' data-titel-doppelt="1"' : ''\)/);
});
test('[S4·Nr. 14] Stil: Überschrift und Beschriftung sind nur optisch weg, nicht display:none', () => {
  for (const sel of ['.feld-zeile[data-label-doppelt] > .feld-label', '.sektion-titel[data-titel-doppelt]']) {
    const r = mit(GRUNDLAGE, sel).pop();
    assert.ok(r, 'Regel ' + sel);
    assert.equal(wert(r, 'position'), 'absolute', sel);
    assert.ok(!/display:\s*none/.test(r.dekl.join(';')), sel + ': nicht display:none, sonst liest sie auch kein Screenreader');
  }
  assert.equal(wert(mit(GRUNDLAGE, '.feld-zeile[data-label-doppelt] > :not(.feld-label)').pop(), 'grid-column'), '1 / -1', 'der Wert nimmt die Zeile');
});
