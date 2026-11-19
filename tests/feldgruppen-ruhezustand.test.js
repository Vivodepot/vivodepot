'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Bereichsseite im Ruhezustand (Zielbild 05 „Identität & Person“, 05.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Anlass: Die Seite „Identität & Person“ stand bei 1440 px rund viermal so lang wie im Zielbild, weil jede Gruppenkarte mit einem
   Eintrag offen stand, dazu ein Sammelblock mit dunklem Knopf und eine Schlusszeile am Seitenende.

   DIE KLASSE: jede Bereichsseite mit Gruppenkarten (renderSektor → feldgruppenKarteHTML). Verlangt:
     1. Ab Werk stehen genau die ersten FELDGRUPPE_OFFEN_AB_WERK Karten offen, auch wenn spätere Karten Einträge tragen.
     2. Was die Nutzerin auf- oder zuklappt, bleibt über ein neues Zeichnen erhalten (Gedächtnis je Bereich und Karte).
     3. Eine Karte mit einem frisch angelegten, leeren Listeneintrag steht offen.
     4. Jeder Hinweis im Bereich „Identität & Person“ ist ein ganzer kurzer Satz (Satzzeichen am Ende, höchstens
        66 Zeichen), ohne Kappung per „…“, in DE und EN.
     5. Unter dem Bereich keine Schlusszeile; der Sammelblock „Dokumente & Austausch“ ist zugeklappt und ohne Hauptknopf.
     6. „Entfernen“ eines Listeneintrags steht im Dialog hinter dem ›, nicht in der Zeile.
     7. Eine Inhaltszeile, die nur den Titel ihrer Karte wiederholt, entfällt („Frühere Namen“).
   Rot-Beweis gegen den Stand davor (der Kern aus f90c19449 statt des heutigen): die Tests 1 bis 6 fallen; Test 7 fällt gegen den Stand vor dieser Regel (a0c7d8dfd).
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'ruhezustand-probe-passwort-lang-genug-1';

function karten(document) {
  const html = document.getElementById('content').innerHTML;
  const raus = [];
  const re = /<details class="feldgruppen-karte"([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) if (!/\shidden/.test(m[1])) raus.push({ offen: /\sopen(\s|$|=)/.test(m[1]), attrs: m[1] });
  return raus;
}

async function identitaetGefuellt(produkt) {
  const { V, document } = ladeKern(produkt ? { produkt } : undefined);
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria Beispiel');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  V.listenEintragHinzufuegen('identity', 'formerNames', { name: 'Maria Schmidt', usedUntil: '2004-06-12', reason: 'heirat' });
  return { V, document };
}

test('1) ab Werk sind genau die ersten Karten offen, auch wenn spätere Einträge tragen', async () => {
  const { V, document } = await identitaetGefuellt();
  V.renderSektor('identity');
  const k = karten(document);
  assert.ok(k.length >= 4, 'Identität hat mehrere Karten');
  const n = V.FELDGRUPPE_OFFEN_AB_WERK;
  assert.equal(typeof n, 'number');
  assert.deepEqual(k.map((x) => x.offen), k.map((_, i) => i < n), 'offen nur die ersten ' + n);
});

test('2) das Gedächtnis der Sitzung hält eine aufgeklappte Karte offen und eine zugeklappte zu', async () => {
  const { V, document } = await identitaetGefuellt();
  V.renderSektor('identity');
  const k = karten(document);
  const schluessel = (i) => /data-karte="([^"]*)"/.exec(k[i].attrs)[1].replace(/&#124;|&vert;/g, '|');
  V._kartenZustand.set(schluessel(0), false);
  V._kartenZustand.set(schluessel(3), true);
  // Eintragebereich (S.4c): die offene Rubrik steht immer aufgeklappt im Detail. Darum ist hier eine dritte Karte die offene Rubrik,
  // damit das Gedächtnis der beiden geprüften Karten sichtbar bleibt.
  V.eintragebereichRubrikSetzen('identity', schluessel(2));
  V.renderSektor('identity');
  const neu = karten(document);
  assert.equal(neu[0].offen, false, 'zugeklappte erste Karte bleibt zu');
  assert.equal(neu[3].offen, true, 'aufgeklappte vierte Karte bleibt offen');
});

test('3) ein frisch angelegter, leerer Listeneintrag hält seine Karte offen', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria Beispiel');
  V.listenEintragHinzufuegen('identity', 'formerNames', {});
  V.renderSektor('identity');
  const html = document.getElementById('content').innerHTML;
  const m = /<details class="feldgruppen-karte"[^>]*id="sek-fruehere-namen"[^>]*>/.exec(html);
  assert.ok(m, 'Karte „Frühere Namen“ da');
  assert.match(m[0], /\sopen/, 'offen');
});

const HINWEIS_HOECHSTENS = 66;
test('4) jeder Hinweis der Identität ist ein ganzer kurzer Satz, in DE und EN', async () => {
  for (const sprache of ['de', 'en']) {
    const { V, document } = await identitaetGefuellt('privat-' + sprache);
    // alle Karten auf, damit jeder Hinweis gerendert ist
    V.renderSektor('identity');
    for (const m of document.getElementById('content').innerHTML.matchAll(/data-karte="([^"]*)"/g)) V._kartenZustand.set(m[1].replace(/&#124;|&vert;/g, "|"), true);
    V.renderSektor('identity');
    const html = document.getElementById('content').innerHTML;
    const hinweise = [...html.matchAll(/<(?:div|p|span)\b[^>]*\bclass="(?:feld-hint|sektion-hint)(?: [^"]*)?"[^>]*>([^<]*)</g)]
      .map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim()).filter(Boolean);
    assert.ok(hinweise.length >= 8, sprache + ': Hinweise gerendert (' + hinweise.length + ')');
    for (const h of hinweise) {
      assert.ok(!/…|\.\.\.$/.test(h), sprache + ': ohne Kappung: ' + h);
      assert.ok(h.length <= HINWEIS_HOECHSTENS, sprache + ': kurz (' + h.length + '): ' + h);
      assert.match(h, /[.!?“”"»)]$/, sprache + ': ganzer Satz: ' + h);
    }
  }
});

test('5) keine Schlusszeile unter dem Bereich; Sammelblock zugeklappt, ohne Hauptknopf', async () => {
  const { V, document } = await identitaetGefuellt();
  V.renderSektor('identity');
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('class="pause-erlaubnis"'), 'keine Schlusszeile');
  const i = html.indexOf('class="zusatz-aktionen"');
  assert.ok(i >= 0, 'Sammelblock da');
  const block = html.slice(i, html.indexOf('</details>', i));
  assert.match(block, /^class="zusatz-aktionen"><details class="wizard-gruppe"><summary/, 'zugeklappt');
  assert.ok(!/<button class="btn"/.test(block), 'kein Hauptknopf im Sammelblock');
});

/* 6. Ein Listeneintrag ist eine Zeile „Wert · Wert · Wert ›“ (Zielbild 05, Frühere Namen): „Entfernen“ steht nicht in der Zeile, sondern
   im Dialog hinter dem ›. Der Dialog des Eintrags trägt Entfernen und führt in die Rückfrage; Salbei mit Glas blendet den Zeilenknopf aus. */
test('6) Entfernen steht im Dialog hinter dem ›, nicht in der Zeile', async () => {
  const { V } = ladeKern({ zusatzBindungen: ['flowListenEintragBearbeiten'] });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria Beispiel');
  V.listenEintragHinzufuegen('identity', 'formerNames', { name: 'Maria Schmidt', usedUntil: '2004-06-12', reason: 'heirat' });
  const b = V.bereicheAlle().find((x) => x.id === 'identity');
  const feld = [].concat(...(b.sektionen || []).map((s) => s.felder || [])).find((f) => f && f.id === 'formerNames');
  assert.ok(feld, 'Feld „Frühere Namen“');
  const dialoge = [];
  const alt = V.ui.modal;
  V.ui.modal = (o) => { dialoge.push(o); };
  try {
    V.__zusatz.flowListenEintragBearbeiten('identity', feld, 0);
    assert.equal(dialoge.length, 1);
    const d = dialoge[0].drittAktion;
    assert.ok(d && typeof d.handler === 'function', 'der Dialog des Eintrags trägt eine dritte Aktion');
    assert.equal(d.label, V.STRINGS.btnEntfernen);
    let zu = false;
    d.handler(() => { zu = true; });
    assert.ok(zu, 'der Eintragsdialog schließt');
    assert.equal(dialoge.length, 2, 'danach die Rückfrage');
    assert.equal(dialoge[1].primaerLabel, 'Entfernen');
  } finally { V.ui.modal = alt; }
  const modul = require('../tools/erscheinung/erscheinungsbild-salbei-glas-modul.json');
  assert.match(JSON.stringify(modul), /\.feld-liste-editor \.liste-eintraege \[data-eintrag-entfernen\] \{ display: none; \}/, 'die Zeile zeigt Entfernen nicht');
});

/* 7. Unter „Frühere Namen“ stand „Frühere Namen u. a.“: die Zeile wiederholte den Titel und sagte nichts. Regel für jede Karte:
   ist der erste Name der Inhaltszeile der Titel der Karte, entfällt sie. */
test('7) keine Inhaltszeile wiederholt den Titel ihrer Karte, in DE und EN', async () => {
  for (const sprache of ['de', 'en']) {
    const { V, document } = await identitaetGefuellt('privat-' + sprache);
    for (const sektor of ['identity', 'health', 'people']) {
      V.renderSektor(sektor);
      const html = document.getElementById('content').innerHTML;
      const koepfe = [...html.matchAll(/<span class="feldgruppen-karte-titel">([^<]*)<\/span>[\s\S]*?<span class="feldgruppen-karte-inhalt">([^<]*)<\/span>/g)];
      assert.ok(koepfe.length >= 2, sprache + ' ' + sektor + ': Kopfzeilen gefunden');
      for (const [, titel, inhalt] of koepfe) {
        const t = titel.replace(/&amp;/g, '&').trim().toLowerCase();
        const erster = inhalt.replace(/&amp;/g, '&').replace(/ (u\. a\.|and more)$/, '').split(', ')[0].trim().toLowerCase();
        assert.notEqual(erster, t, sprache + ' ' + sektor + ': „' + inhalt + '“ wiederholt „' + titel + '“');
      }
    }
  }
  // Rot-Beweis: die Regel selbst — ohne Titel bleibt die Zeile, mit gleichem Titel entfällt sie.
  const { V } = ladeKern({ zusatzBindungen: ['feldgruppeInhaltText'] });
  const inhaltText = V.__zusatz.feldgruppeInhaltText;
  const felder = [{ label: 'Frühere Namen' }, { label: 'Notiz' }];
  assert.notEqual(inhaltText(felder), '');
  assert.equal(inhaltText(felder, 'Frühere Namen'), '');
});
