'use strict';
/* Alle Feldgruppen stehen als Gruppenkarte, keine lose, keine doppelt (Abnahme v998, M07 der Gestaltungsleitung).
   Vorher standen auf derselben Seite Gruppenkarten (die Tabelle SEKTION_STATUSKARTEN_CLUSTER) und die alte Zeile „Beschriftung links,
   Kasten rechts“: ein Abschnitt ohne Eintrag in der Tabelle (Personenstandsurkunden, Bestattung und Abschied, Haustiere, in Pro alle
   Abschnitte) nahm in renderSektor den Weg der losen Zeilen. Und „Frühere Namen“ stand zweimal da: als Karte im Abschnitt „Person“ und
   als eigener Abschnitt mit einem Listenfeld gleichen Titels, aus zwei Quellen für dieselbe Gruppe.
   Jetzt gilt in jedem Bereich von privat-de und pro-de:
   · jeder Abschnitt mit Feldern trägt seine Felder in Gruppenkarten (`_sektionKartenListe`: ohne Eintrag in der Tabelle eine Karte
     mit allen Feldern, benannt nach dem Abschnitt); kein Abschnitt trägt eine Zeile (`feld-zeile`, `feld-liste`) unmittelbar. Ausnahme
     sind Abschnitte ohne Feld im Katalog (das Personen-Register, die Auszüge), sie haben keine Gruppe;
   · die Karte „Frühere Namen“ nimmt den Abschnitt „Frühere Namen“ auf (`vereint`): ein Titel, ein Sprungpunkt (`sek-fruehere-namen`),
     das Listenfeld liegt in der Karte;
   · kein Kartentitel steht in einem Bereich zweimal, und keine Abschnittsüberschrift gleicht dem Kartentitel eines anderen Abschnitts.
   Rot-Beweis: derselbe Prüfer meldet die frühere Darstellung (die Karte „Personenstandsurkunden“ aufgelöst in lose Zeilen, „Frühere Namen“
   als zweiter Abschnitt). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
// Öffentlich gehen nur die zwei Privat-Produkte hinaus; dort springt der Pro-Fall sichtbar auf skip.
const baubar = (slug) => require('../tools/lib/vier-produkte.js').PRODUKTE.some((p) => p.slug === slug);

const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'source', 'wbr', 'col']);
/* Die Elemente der obersten Ebene eines Markup-Stücks: [{ tag, attrs, innen, ganz }]. */
function kinder(html) {
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  const aus = [];
  let tiefe = 0, start = -1, erstes = null, m;
  while ((m = re.exec(html))) {
    const zu = m[1], t = m[2].toLowerCase(), attrs = m[3];
    if (!zu) {
      if (VOID.has(t) || /\/$/.test(attrs)) { if (tiefe === 0) aus.push({ tag: t, attrs, innen: '', ganz: m[0] }); continue; }
      if (tiefe === 0) { start = m.index; erstes = { tag: t, attrs, offen: m.index + m[0].length }; }
      tiefe++;
    } else {
      tiefe--;
      if (tiefe === 0) aus.push({ tag: erstes.tag, attrs: erstes.attrs, innen: html.slice(erstes.offen, m.index), ganz: html.slice(start, m.index + m[0].length) });
    }
  }
  return aus;
}
const klasse = (e) => (/class="([^"]*)"/.exec(e.attrs) || [, ''])[1].split(' ');
const entitaeten = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/* Die Abschnitte eines gerenderten Bereichs: { id, titel, kinder: [Element], karten: [Titel] }. */
function abschnitte(html) {
  const raus = [];
  const re = /<div class="sektion sektion--eingabe" id="sek-/g;
  let m;
  while ((m = re.exec(html))) {
    const e = kinder(html.slice(m.index))[0];
    const k = kinder(e.innen);
    const h2 = k.find((x) => x.tag === 'h2');
    raus.push({
      id: /id="([^"]*)"/.exec(e.attrs)[1].replace(/^sek-/, ''),
      titel: h2 ? entitaeten(h2.innen.replace(/<[^>]*>/g, '')) : '',
      kinder: k,
      karten: k.filter((x) => klasse(x).includes('feldgruppen-karte')).map((x) => entitaeten((/feldgruppen-karte-titel">([^<]*)</.exec(x.innen) || [, ''])[1])),
    });
  }
  return raus;
}

/* Rein: Funde zu einem gerenderten Bereich. `ohneFelder` = die Abschnitte, die im Katalog kein Feld tragen. */
function kartenFunde(bereichId, html, ohneFelder) {
  const aus = [];
  const sek = abschnitte(html);
  for (const a of sek) {
    if (ohneFelder.has(a.id)) continue;
    const lose = a.kinder.filter((x) => klasse(x).includes('feld-zeile') || klasse(x).includes('feld-liste'));
    if (lose.length) aus.push(bereichId + '/' + a.id + ': ' + lose.length + ' lose Zeile(n) neben den Karten');
  }
  const alle = sek.flatMap((a) => a.karten.map((t) => ({ titel: t, von: a.id })));
  const gesehen = new Map();
  for (const k of alle) {
    if (gesehen.has(k.titel)) aus.push(bereichId + ': Kartentitel „' + k.titel + '“ steht zweimal (' + gesehen.get(k.titel) + ', ' + k.von + ')');
    else gesehen.set(k.titel, k.von);
  }
  for (const a of sek) {
    const fremd = alle.find((k) => k.titel === a.titel && k.von !== a.id);
    if (a.titel && fremd) aus.push(bereichId + '/' + a.id + ': die Überschrift „' + a.titel + '“ ist auch eine Karte von ' + fremd.von);
  }
  return aus;
}

async function rendern(produkt) {
  const { V, document } = ladeKern({ produkt });
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const raus = [];
  for (const b of V.bereicheAlle()) {
    V.renderSektor(b.id);
    const ohne = new Set((b.sektionen || []).filter((s) => !(s.felder || []).length).map((s) => s.id));
    raus.push({ id: produkt + ':' + b.id, html: String(document.getElementById('content').innerHTML), ohne });
  }
  return raus;
}

for (const produkt of ['privat-de', 'pro-de']) {
  const skip = baubar(produkt) ? false : 'öffentlich kein Pro-Produkt (' + produkt + ' wird nicht gebaut)';
  test('[Karte·alle] ' + produkt + ': in jedem Bereich steht jede Gruppe in einer Karte, keine lose, keine Überschrift doppelt', { skip }, async () => {
    const bereiche = await rendern(produkt);
    assert.ok(bereiche.length >= (produkt === 'privat-de' ? 14 : 6), 'Positivkontrolle: die Bereiche sind gerendert (' + bereiche.length + ')');
    const funde = bereiche.flatMap((b) => kartenFunde(b.id, b.html, b.ohne));
    assert.deepEqual(funde, []);
    const abschnitteZahl = bereiche.reduce((n, b) => n + abschnitte(b.html).length, 0);
    assert.ok(abschnitteZahl >= (produkt === 'privat-de' ? 25 : 25), 'Positivkontrolle: die Abschnitte sind gefunden (' + abschnitteZahl + ')');
  });
}

test('[Karte·alle] die Abschnitte, die vorher lose standen, sind Karten (Personenstandsurkunden, Bestattung und Abschied, Haustiere)', async () => {
  const bereiche = await rendern('privat-de');
  const karten = new Map(bereiche.flatMap((b) => abschnitte(b.html)).map((a) => [a.id, a.karten]));
  assert.deepEqual(karten.get('civil-status-certificates'), ['Personenstandsurkunden']);
  assert.deepEqual(karten.get('bestattung-abschied'), ['Bestattung und Abschied']);
  assert.deepEqual(karten.get('pets'), ['Haustiere']);
});

test('[Karte·alle·Frühere Namen] „Frühere Namen“ steht einmal: als Karte im Abschnitt Person, mit dem Listenfeld darin und dem Sprungpunkt des früheren Abschnitts', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.renderSektor('identity');
  const html = String(document.getElementById('content').innerHTML);
  const sek = abschnitte(html);
  assert.ok(!sek.some((a) => a.id === 'fruehere-namen'), 'kein eigener Abschnitt „Frühere Namen“');
  assert.equal(sek.flatMap((a) => [a.titel].concat(a.karten)).filter((t) => t === 'Frühere Namen').length, 1, 'der Titel steht genau einmal');
  const karte = kinder(sek.find((a) => a.id === 'person').kinder.find((x) => klasse(x).includes('feldgruppen-karte') && /Frühere Namen/.test(x.innen.slice(0, 200))).ganz)[0];
  assert.match(karte.attrs, /id="sek-fruehere-namen"/, 'der Sprungpunkt des früheren Abschnitts liegt an der Karte');
  assert.match(karte.innen, /data-feld="formerNames"/, 'das Listenfeld liegt in der Karte');
  assert.match(karte.innen, /<p class="sektion-hint">Alte Papiere/, 'der Hinweis des früheren Abschnitts steht in der Karte');
  assert.ok(!/href="#sek-fruehere-namen"/.test(html) || /id="sek-fruehere-namen"/.test(html), 'ein Verweis auf den früheren Abschnitt trifft einen Anker');
});

test('[Karte·alle·Rot-Beweis] die frühere Darstellung (lose Zeilen, „Frühere Namen“ als Karte und als Abschnitt) fällt durch', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.renderSektor('identity');
  const html = String(document.getElementById('content').innerHTML);
  assert.deepEqual(kartenFunde('identity', html, new Set()), [], 'Ausgangslage: der heutige Bereich besteht');
  // 1. Die Karte „Personenstandsurkunden“ als lose Zeilen: Hülle und Kopf weg, die Zeilen bleiben unmittelbar im Abschnitt.
  const karte = abschnitte(html).find((a) => a.id === 'civil-status-certificates').kinder.find((x) => klasse(x).includes('feldgruppen-karte'));
  const koerper = /<div class="feldgruppen-karte-koerper">([\s\S]*)<\/div>$/.exec(karte.innen)[1];
  const lose = html.replace(karte.ganz, koerper);
  assert.ok(kartenFunde('identity', lose, new Set()).some((f) => /civil-status-certificates: \d+ lose Zeile/.test(f)));
  // 2. „Frühere Namen“ als zweiter Abschnitt neben der Karte, mit der Überschrift des Abschnitts.
  const doppelt = html.replace(/(<div class="sektion sektion--eingabe" id="sek-civil-status-certificates">)/, '<div class="sektion sektion--eingabe" id="sek-fruehere-namen"><h2 class="sektion-titel">Frühere Namen</h2></div>$1');
  assert.ok(kartenFunde('identity', doppelt, new Set()).some((f) => /die Überschrift „Frühere Namen“ ist auch eine Karte/.test(f)));
});
