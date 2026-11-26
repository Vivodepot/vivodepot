'use strict';
/* Eintragebereich nach dem Desktop-Dummy, Schritt 1: Liste | Detail (S.4c, 16.11.2026).
   Ein Bereich zeigt links die Liste seiner Rubriken und rechts das Detail der offenen Rubrik, statt einer langen Formularseite.
   · Rubrik ist die Feldgruppe (die Gruppenkarte); ein Abschnitt ohne Gruppenkarte, der etwas zeigt (ein Register), ist selbst eine Rubrik.
   · Der Kopf der Liste nennt den Bereich und die Zahl seiner Angaben, dieselbe Zahl wie in der Seitenleiste (`sektorAngabenZahl`).
   · Je Rubrik eine Zeile mit Titel und Kurzinhalt; genau eine Rubrik ist offen, ab Werk die erste, und die Wahl überdauert das Neuzeichnen.
   · Die Eingabefelder bleiben dieselben: die Menge der `data-feld`-Kennungen je Bereich gleicht der vor dem Umbau
     (tests/fixtures/s4c-eintragebereich-felder-privat-de.json, erhoben am Kanon vor dem Umbau).
   Rot-Beweis: am Kanon vor dem Umbau fehlt `.eintragebereich` in jedem Bereich. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
// Geprüft werden die Produkte, die dieser Baum baut; öffentlich gehen nur die zwei Privat-Produkte hinaus.
const baubar = (slug) => require('../tools/lib/vier-produkte.js').PRODUKTE.some((p) => p.slug === slug);
const FELDER_VORHER = require(path.join(__dirname, 'fixtures', 's4c-eintragebereich-felder-privat-de.json')).bereiche;

const attr = (tag, name) => { const m = new RegExp('\\s' + name + '="([^"]*)"').exec(tag); return m ? m[1] : null; };
const entitaeten = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/* Rein: liest Liste und Detail aus dem Markup eines Bereichs. */
function eintragebereichLesen(html) {
  const a = html.indexOf('class="eintragebereich"');
  if (a < 0) return null;
  const liste = html.indexOf('class="bereich-liste"', a);
  const detail = html.indexOf('class="bereich-detail"', a);
  const listeTeil = html.slice(liste, detail);
  const kopf = (/class="bereich-liste-kopf"[^>]*>([\s\S]*?)<\/div>/.exec(listeTeil) || [, ''])[1].replace(/<[^>]*>/g, ' ');
  const zeilen = [...listeTeil.matchAll(/<button[^>]*class="bereich-liste-zeile[^"]*"[^>]*>/g)].map((m) => ({
    rubrik: entitaeten(attr(m[0], 'data-rubrik') || ''), aktiv: attr(m[0], 'aria-current') === 'true',
  }));
  const detailTeil = html.slice(detail);
  const karten = [...detailTeil.matchAll(/<details class="(feldgruppen-karte[^"]*)" data-karte="([^"]*)"([^>]*)>/g)].map((m) => ({
    rubrik: entitaeten(m[2]), aktiv: /\sdata-rubrik-offen/.test(m[3]), versteckt: /\shidden/.test(m[3]), offen: /\sopen/.test(m[3]),
  }));
  const sektionen = [...detailTeil.matchAll(/<div class="(sektion sektion--eingabe[^"]*)" id="sek-([^"]*)"([^>]*)>/g)].map((m) => ({
    id: m[2], aktiv: /\sdata-rubrik-offen/.test(m[3]),
  }));
  return { liste, detail, kopf: entitaeten(kopf).replace(/\s+/g, ' ').trim(), zeilen, karten, sektionen };
}

/* Rein: Funde zu einem Bereich. */
function geruestFunde(id, label, zahl, e) {
  const aus = [];
  if (!e) return [id + ': kein Eintragebereich (Liste | Detail)'];
  if (!(e.liste > 0 && e.detail > e.liste)) aus.push(id + ': die Liste steht nicht vor dem Detail');
  if (!e.kopf.includes(label)) aus.push(id + ': der Kopf der Liste nennt den Bereich nicht („' + e.kopf + '“)');
  if (!new RegExp('(^|\\D)' + zahl + '(\\D|$)').test(e.kopf)) aus.push(id + ': der Kopf nennt nicht die Zahl der Angaben ' + zahl + ' („' + e.kopf + '“)');
  if (!e.zeilen.length) aus.push(id + ': die Liste hat keine Zeile');
  const sichtbar = e.karten.filter((k) => !k.versteckt).map((k) => k.rubrik);
  for (const r of sichtbar) if (!e.zeilen.some((z) => z.rubrik === r)) aus.push(id + ': die Gruppe „' + r + '“ hat keine Zeile in der Liste');
  for (const z of e.zeilen) {
    const ziel = z.rubrik.startsWith('sek:') ? e.sektionen.some((s) => 'sek:' + s.id === z.rubrik) : sichtbar.includes(z.rubrik);
    if (!ziel) aus.push(id + ': die Zeile „' + z.rubrik + '“ hat kein Ziel im Detail');
  }
  const aktiveZeilen = e.zeilen.filter((z) => z.aktiv);
  if (aktiveZeilen.length !== 1) aus.push(id + ': ' + aktiveZeilen.length + ' offene Zeilen statt einer');
  const aktiveKarten = e.karten.filter((k) => k.aktiv);
  const aktiveSektionen = e.sektionen.filter((s) => s.aktiv);
  if (aktiveSektionen.length !== 1) aus.push(id + ': ' + aktiveSektionen.length + ' Abschnitte mit der offenen Rubrik statt einem');
  if (aktiveZeilen.length === 1) {
    const r = aktiveZeilen[0].rubrik;
    if (r.startsWith('sek:')) { if (aktiveKarten.length) aus.push(id + ': eine Abschnitts-Rubrik ist offen, und trotzdem ist eine Gruppe aktiv'); }
    else if (aktiveKarten.length !== 1 || aktiveKarten[0].rubrik !== r || !aktiveKarten[0].offen) aus.push(id + ': die offene Zeile „' + r + '“ zeigt nicht genau ihre Gruppe, aufgeklappt');
  }
  return aus;
}

async function rendern(produkt) {
  const { V, document } = ladeKern({ produkt });
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  return { V, html: (id) => { V.renderSektor(id); return String(document.getElementById('content').innerHTML); } };
}

for (const produkt of ['privat-de', 'pro-de'].filter((p) => baubar(p))) {
  test('[Gerüst] ' + produkt + ': jeder Bereich mit Feldern zeigt Liste | Detail, Kopf mit Zahl, eine Zeile je Rubrik, eine offen', async () => {
    const { V, html } = await rendern(produkt);
    const funde = [];
    let geprueft = 0;
    for (const b of V.bereicheAlle()) {
      if (!(b.sektionen || []).some((s) => (s.felder || []).length)) continue;
      const e = eintragebereichLesen(html(b.id));
      funde.push(...geruestFunde(produkt + ':' + b.id, entitaeten(b.label), V.sektorAngabenZahl(b), e));
      if (e && e.zeilen.length && e.zeilen.findIndex((z) => z.aktiv) !== 0) funde.push(produkt + ':' + b.id + ': ab Werk ist nicht die erste Rubrik offen');
      geprueft++;
    }
    assert.ok(geprueft >= 5, 'zu wenige Bereiche geprüft: ' + geprueft);
    assert.deepEqual(funde, []);
  });
}

test('[Wahl] privat-de: die gewählte Rubrik bleibt nach dem Neuzeichnen offen', async () => {
  const { V, html } = await rendern('privat-de');
  const vorher = eintragebereichLesen(html('identity'));
  assert.ok(vorher && vorher.zeilen.length >= 2, 'Identität braucht mindestens zwei Rubriken');
  const zweite = vorher.zeilen[1].rubrik;
  V.eintragebereichRubrikSetzen('identity', zweite);
  const nachher = eintragebereichLesen(html('identity'));
  assert.deepEqual(geruestFunde('identity', '', 0, nachher).filter((f) => !/Kopf/.test(f)), []);
  assert.equal(nachher.zeilen.find((z) => z.aktiv).rubrik, zweite);
  // Ein anderer Bereich behält seine eigene Wahl (ab Werk die erste).
  const anderer = V.bereicheAlle().find((b) => b.id !== 'identity' && (b.sektionen || []).some((s) => (s.felder || []).length));
  const e = eintragebereichLesen(html(anderer.id));
  assert.equal(e.zeilen.findIndex((z) => z.aktiv), 0);
  // Eine Wahl, die es im Bereich nicht gibt, fällt auf die erste Rubrik zurück.
  V.eintragebereichRubrikSetzen('identity', 'gibt-es-nicht');
  assert.equal(eintragebereichLesen(html('identity')).zeilen.findIndex((z) => z.aktiv), 0);
});

test('[Felder] privat-de: die Eingabefelder je Bereich sind dieselben wie vor dem Umbau', async () => {
  const { V, html } = await rendern('privat-de');
  const jetzt = {};
  for (const b of V.bereicheAlle()) jetzt[b.id] = [...new Set([...html(b.id).matchAll(/data-feld="([^"]*)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(jetzt, FELDER_VORHER);
});

test('[Prüfer] geruestFunde meldet die lange Formularseite und eine falsche Wahl', () => {
  assert.deepEqual(geruestFunde('x', 'X', 0, null), ['x: kein Eintragebereich (Liste | Detail)']);
  const roh = '<div class="eintragebereich"><nav class="bereich-liste"><div class="bereich-liste-kopf">X · 3 Angaben</div>' +
    '<button type="button" class="bereich-liste-zeile" data-rubrik="a" aria-current="true"></button>' +
    '<button type="button" class="bereich-liste-zeile" data-rubrik="b"></button></nav><div class="bereich-detail">' +
    '<div class="sektion sektion--eingabe" id="sek-s" data-rubrik-offen><details class="feldgruppen-karte" data-karte="a">' +
    '</details><details class="feldgruppen-karte" data-karte="b" open data-rubrik-offen></details></div></div></div>';
  const f = geruestFunde('x', 'X', 3, eintragebereichLesen(roh));
  assert.deepEqual(f, ['x: die offene Zeile „a“ zeigt nicht genau ihre Gruppe, aufgeklappt']);
  assert.deepEqual(geruestFunde('x', 'X', 4, eintragebereichLesen(roh)).filter((t) => /Zahl/.test(t)).length, 1);
});

/* Maskierung: eintragebereichHTML fügt die Liste und das Detail-Markup zusammen. Bereichsname, Titel und Kurzinhalt (aus dem
   Feldwert) sind Text und landen maskiert im DOM: kein fremdes Element, kein Ereignis-Attribut, der Wortlaut bleibt lesbar. */
const NUTZLAST = '<img src=x onerror=alert(1)> & Co';
/* Ohne Parser im Baum liest die Probe die Tags so, wie der HTML-Tokenizer ein Start-Tag erkennt: `<` und ein Buchstabe.
   Ein maskiertes `&lt;img` ist darum kein Tag. */
const ERLAUBT = new Set(['div', 'nav', 'span', 'ul', 'li', 'button']);
function fremdesMarkup(html) {
  const aus = [];
  for (const m of html.matchAll(/<([a-zA-Z][^\s>/]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const tag = m[1].toLowerCase();
    if (!ERLAUBT.has(tag)) aus.push(tag + ' im DOM');
    for (const a of m[2].replace(/"[^"]*"|'[^']*'/g, '""').matchAll(/\s([^\s=>"']+)(?==|\s|$)/g)) if (/^on/i.test(a[1])) aus.push(tag + '[' + a[1] + ']');
  }
  return { aus, text: entitaeten(html.replace(/<[a-zA-Z/][^>]*>/g, '')) };
}

test('[Maskierung] privat-de: Bereichsname und Feldwert mit <img onerror> und & landen maskiert im DOM', async () => {
  const { V } = ladeKern({ produkt: 'privat-de' });
  await V.depotAnlegen('pw');
  const s = { id: 'probe', label: NUTZLAST, sektionen: [] };
  const rubriken = [{ schluessel: 'a', titel: NUTZLAST, inhalt: NUTZLAST, sektion: 'probe-sek' }];
  const html = V.eintragebereichHTML(s, rubriken, '<div class="sektion sektion--eingabe" id="sek-probe-sek"></div>');
  const f = fremdesMarkup(html);
  assert.deepEqual(f.aus, []);
  assert.equal(f.text.split(NUTZLAST).length - 1, 4, 'Name (Liste und Zurück-Knopf, U-4 D46/H04), Titel und Kurzinhalt stehen als lesbarer Text da');
  // Rot-Beweis: dieselbe Ausgabe ohne Maskierung trägt das fremde Element und sein Ereignis-Attribut.
  const roh = html.split('&lt;img src=x onerror=alert(1)&gt; &amp; Co').join(NUTZLAST);
  assert.notEqual(roh, html, 'die maskierte Form steht in der Ausgabe');
  assert.deepEqual([...new Set(fremdesMarkup(roh).aus)], ['img im DOM', 'img[onerror]']);
});

/* U-4 (D46/H04, 17.11.2026): am Handy erst die Liste, dann das Detail mit Zurück. Rot-Beweis: am Stand davor fehlt data-detail-offen,
   der Zurück-Knopf und die Handy-Regeln im Stil. */
test('[U-4·Handy] ab Werk ohne data-detail-offen, nach dem Setzen mit; Zurück-Knopf steht vor dem Detail-Inhalt', async () => {
  const { V, html } = await rendern('privat-de');
  const b = V.bereicheAlle().find((x) => x.id === 'identity');
  const kopfTag = (h) => (/<div class="eintragebereich"[^>]*>/.exec(h) || [''])[0];
  const vorher = html('identity');
  assert.ok(!/data-detail-offen/.test(kopfTag(vorher)), 'ab Werk darf das Detail nicht offen sein');
  V.eintragebereichDetailSetzen('identity', true);
  const offen = html('identity');
  assert.ok(/data-detail-offen/.test(kopfTag(offen)), 'nach dem Setzen trägt der Bereich data-detail-offen');
  V.eintragebereichDetailSetzen('identity', false);
  assert.ok(!/data-detail-offen/.test(kopfTag(html('identity'))));
  const d = offen.slice(offen.indexOf('class="bereich-detail"'));
  const knopf = /<button[^>]*class="bereich-detail-zurueck"[^>]*>[\s\S]*?<\/button>/.exec(d);
  assert.ok(knopf, 'das Detail trägt den Zurück-Knopf');
  assert.ok(d.slice(d.indexOf('>') + 1).trimStart().startsWith(knopf[0]), 'der Zurück-Knopf steht ganz oben im Detail');
  assert.ok(/\sdata-eintrag-zurueck(\s|>)/.test(knopf[0]));
  assert.equal(attr(knopf[0], 'aria-label'), V.STRINGS.eintragZurueckListe);
  assert.ok(V.STRINGS.eintragZurueckListe && V.STRINGS.eintragZurueckListe !== 'eintragZurueckListe');
  assert.ok(entitaeten(knopf[0].replace(/<[^>]*>/g, ' ')).includes(entitaeten(b.label)), 'der Knopf nennt den Bereichsnamen');
  // Ein anderer Bereich bleibt bei seiner Liste.
  const anderer = V.bereicheAlle().find((x) => x.id !== 'identity' && (x.sektionen || []).some((s) => (s.felder || []).length));
  assert.ok(!/data-detail-offen/.test(kopfTag(html(anderer.id))));
});

test('[U-4·Handy] grundlage.css: Handy-Block blendet Liste/Detail aus, Zeilen Treffer + space-2 (56px) als eine Zeile, Zurück Treffer (48px); sonst ausgeblendet', () => {
  const css = require('node:fs').readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  const a = css.indexOf('@media (max-width: 767px) {\n    .eintragebereich:not([data-detail-offen])');
  assert.ok(a >= 0, 'Handy-Block fehlt');
  let tiefe = 0, e = css.indexOf('{', a);
  for (let i = e; i < css.length; i++) { if (css[i] === '{') tiefe++; else if (css[i] === '}' && --tiefe === 0) { e = i; break; } }
  const block = css.slice(a, e);
  const regel = (sel) => { const m = new RegExp('(?:^|\\n)\\s*' + sel.replace(/[.[\]()*:=-]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(block); return m ? m[1] : null; };
  assert.match(regel('.eintragebereich:not([data-detail-offen]) > .bereich-detail') || '', /display:\s*none/);
  assert.match(regel('.eintragebereich[data-detail-offen] > .bereich-liste') || '', /display:\s*none/);
  const zeile = regel('.bereich-liste-zeile') || '';
  assert.match(zeile, /min-height:\s*calc\(var\(--treffer\) \+ var\(--space-2\)\)/);
  assert.match(zeile, /flex-direction:\s*row/);
  assert.match(zeile, /align-items:\s*center/);
  assert.match(zeile, /gap:\s*var\(--space-3\)/);
  const inhalt = regel('.bereich-liste-inhalt') || '';
  assert.match(inhalt, /margin-left:\s*auto/);
  assert.match(inhalt, /text-align:\s*right/);
  assert.match(inhalt, /min-width:\s*0/);
  // Am Handy bricht die Unterzeile um, statt abzubrechen (Rot-Beweis: die Grundregel trägt white-space: nowrap und text-overflow: ellipsis)
  assert.match(inhalt, /white-space:\s*normal/);
  assert.match(inhalt, /overflow:\s*visible/);
  assert.match(css.slice(0, a), /\.bereich-liste-inhalt \{[^}]*white-space: nowrap[^}]*\}/, 'Vorbedingung: außerhalb des Handys bleibt die Zeile einzeilig');
  assert.match(regel('.bereich-liste-titel') || '', /flex-shrink:\s*0/);
  assert.match(regel('.bereich-detail-zurueck') || '', /min-height:\s*var\(--treffer\)/);
  assert.match(css.slice(0, a), /\.bereich-detail-zurueck \{ display: none; \}/, 'Grundzustand: der Zurück-Knopf ist ausgeblendet');
});

test('[U-4·Zusatz] offene Rubrik als Karte: der Abschnittstitel darüber entfällt, die Karte steht direkt unter dem Detailkopf (Desktop-Dummy Z. 465–474)', async () => {
  const css = require('node:fs').readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  assert.match(css, /\n {2}\.bereich-detail > \.sektion:has\(\.feldgruppen-karte\[data-rubrik-offen\]\) > \.sektion-titel \{ display: none; \}/,
    'Regel fehlt: Abschnittstitel über der offenen Karte ausblenden');
  assert.match(css, /\n {2}html #app \.eintragebereich \.bereich-detail > \.sektion:has\(\.feldgruppen-karte\[data-rubrik-offen\]\) \{ background: none; border: 0; box-shadow: none; padding: 0; margin-top: 0; \}/,
    'Regel fehlt: kein Abschnittsrahmen um die offene Karte (stärker als der Profil-Rahmen #app .sektion)');
  // Das Muster tritt im Kern wirklich auf: Bereich Identität, erste Rubrik ist eine Karte in einem Abschnitt mit eigenem Titel.
  const { html } = await rendern('privat-de');
  const h = html('identity');
  const d = h.slice(h.indexOf('class="bereich-detail"'));
  const sek = /<div class="sektion sektion--eingabe" id="sek-[^"]*" data-rubrik-offen>\s*<h2 class="sektion-titel"/.exec(d);
  assert.ok(sek, 'offener Abschnitt mit eigenem Titel fehlt im Detail');
  const rest = d.slice(sek.index);
  assert.ok(/class="[^"]*feldgruppen-karte[^"]*"[^>]*data-rubrik-offen/.test(rest), 'im offenen Abschnitt steht eine offene Karte');
});
