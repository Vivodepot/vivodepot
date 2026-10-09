'use strict';
/* namen-vollstaendig.test.js — jede anzeigbare Kennung hat in jeder Sprache des Produkts einen Namen (Entscheidung 07.10.2026)
   Entscheidung: „auf keinen Fall steht irgendwo "ohne Bezeichnung"!“ Ein fehlender Name ist ein Fehler an der Quelle, kein Anzeigefall. Die
   Anzeige nimmt darum den Namen ohne Rückfall; diese Wache sorgt dafür, dass es ihn gibt. Geprüft wird jedes der vier Produkte in seiner
   Sprache (privat-de/pro-de deutsch, privat-en/pro-en englisch): Bereich, Abschnitt, Feld, Unterfeld, Lebenslage. Fremde Felder ohne
   Namen weist die Einlassprüfung ab (tests/benutzersicht-ohne-technische-markierungen.test.js hält, dass kein Platzhalter mehr steht). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PRODUKTE = ['privat-de', 'privat-en', 'pro-de', 'pro-en'];
const name = (x) => typeof x === 'string' && x.trim().length > 0;

/* Liste der Kennungen ohne Namen: "<bereich>", "<bereich>/<abschnitt>", "<bereich>/<feld>", "<bereich>/<feld>/<unterfeld>", "lebenslage:<id>". */
function ohneNamen(bereiche, lebenslagen) {
  const aus = [];
  for (const b of bereiche || []) {
    if (!name(b.label)) aus.push(b.id);
    for (const s of b.sektionen || []) {
      if (!name(s.label)) aus.push(b.id + '/' + s.id);
      for (const f of s.felder || []) {
        if (!name(f.label)) aus.push(b.id + '/' + f.id);
        for (const u of f.unterFelder || []) if (!name(u.label)) aus.push(b.id + '/' + f.id + '/' + u.id);
      }
    }
  }
  for (const l of lebenslagen || []) if (!name(l.titel)) aus.push('lebenslage:' + l.id);
  return aus;
}

for (const produkt of PRODUKTE) {
  test(`[Namen] ${produkt}: jede anzeigbare Kennung hat einen Namen in der Sprache des Produkts`, () => {
    const { V } = ladeKern({ produkt });
    const bereiche = V.bereicheAlle();
    assert.ok(bereiche.length >= 5, 'Voraussetzung: das Produkt hat Bereiche');
    const felder = bereiche.reduce((n, b) => n + (b.sektionen || []).reduce((m, s) => m + (s.felder || []).length, 0), 0);
    assert.ok(felder >= 20, 'Voraussetzung: die Bereiche tragen Felder');
    assert.deepEqual(ohneNamen(bereiche, V.SITUATIONEN), []);
  });
}

/* Eine eingelassene Erweiterung ohne eigenen Namen heißt nach ihrer Art (strings:modulArt<Art>); jede Art eines Einlass-Registers
   braucht darum in jedem Produkt einen solchen Namen, sonst stünde in den Einstellungen nichts oder ein Platzhalter. */
for (const produkt of PRODUKTE) {
  test(`[Namen] ${produkt}: jede Art von Erweiterung hat einen Namen`, () => {
    const { V } = ladeKern({ produkt });
    assert.ok(V.EINLASS_REGISTER.length >= 10, 'Voraussetzung: die Register sind da');
    assert.deepEqual(V.EINLASS_REGISTER.filter((r) => !name(V._modulAnzeigeName(r.typ, {}))).map((r) => r.typ), []);
  });
}

test('[Namen·Rot-Beweis] eine Art ohne Namen wird gefunden', () => {
  const { V } = ladeKern();
  assert.equal(name(V._modulAnzeigeName('unbekannteArt', {})), false);
  assert.equal(V._modulAnzeigeName('wizard', { titel: 'Eigener Titel' }), V.STRINGS.modulArtWizard + ' · Eigener Titel', 'der eigene Name steht hinter der Art, nie allein');
});

/* Der eigene Name einer Erweiterung ist eine Selbstauskunft der Datei. Eine Erweiterung, die sich „Vivodepot Pro“ nennt, darf in den
   Einstellungen nicht wie ab Werk aussehen: die Zeile beginnt mit der Art in Worten, trägt den geprüften Herkunftsstand als Zusatz,
   und der Name ist maskiert. */
function zeileSicher(html, art, name) {
  const m = /<ul class="einst-modulliste">([\s\S]*?)<\/ul>/.exec(html);
  const zeile = m ? m[1] : '';
  return zeile.includes('<li>' + art + ' · ') && zeile.includes(name) && /class="modul-pruefstufe"/.test(zeile) && !/<b>/.test(zeile);
}

test('[Namen·Täuschung] eine Erweiterung, die sich „Vivodepot Pro“ nennt, steht hinter ihrer Art, maskiert und mit dem Prüfstand', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'probe', name: 'Vivodepot Pro <b>ab Werk</b>', moduleVersion: 1, arten: { a: 'A' } }));
  assert.equal(r.angenommen, true, 'Voraussetzung: das Modul wird eingelassen');
  const html = V.einstellungenHTML();
  assert.ok(zeileSicher(html, V.STRINGS.modulArtInstitutionsArt, 'Vivodepot Pro &lt;b&gt;ab Werk&lt;/b&gt;'), 'Art vorn, Name maskiert, Prüfstand daneben');
  assert.ok(!html.includes(V.STRINGS.modulZeileEingebaut.replace('{titel}', 'Vivodepot Pro')), 'nie „eingebaut“');
});

test('[Namen·Täuschung·Rot-Beweis] der Name allein, ohne Prüfstand oder unmaskiert, fällt auf', () => {
  const art = 'Arten von Einrichtungen'; const name = 'Vivodepot Pro &lt;b&gt;';
  assert.equal(zeileSicher('<ul class="einst-modulliste"><li>Vivodepot Pro · eingelassen am 07.10.26 <span class="modul-pruefstufe">· unsigniert</span></li></ul>', art, 'Vivodepot Pro'), false, 'Name allein');
  assert.equal(zeileSicher('<ul class="einst-modulliste"><li>' + art + ' · ' + name + ' · eingelassen am 07.10.26</li></ul>', art, name), false, 'ohne Prüfstand');
  assert.equal(zeileSicher('<ul class="einst-modulliste"><li>' + art + ' · Vivodepot Pro <b>ab Werk</b> <span class="modul-pruefstufe">· unsigniert</span></li></ul>', art, 'Vivodepot Pro'), false, 'unmaskiert');
  assert.equal(zeileSicher('<ul class="einst-modulliste"><li>' + art + ' · ' + name + ' <span class="modul-pruefstufe">· unsigniert</span></li></ul>', art, name), true);
});

test('[Namen·Rot-Beweis] ein leerer Name in Bereich, Abschnitt, Feld, Unterfeld oder Lebenslage wird gefunden', () => {
  const bereiche = [{ id: 'b', label: '', sektionen: [{ id: 's', label: ' ', felder: [{ id: 'f', label: '', unterFelder: [{ id: 'u' }] }] }] }];
  assert.deepEqual(ohneNamen(bereiche, [{ id: 'l', titel: '' }]), ['b', 'b/s', 'b/f', 'b/f/u', 'lebenslage:l']);
  assert.deepEqual(ohneNamen([{ id: 'b', label: 'B', sektionen: [{ id: 's', label: 'S', felder: [{ id: 'f', label: 'F' }] }] }], [{ id: 'l', titel: 'L' }]), []);
});
