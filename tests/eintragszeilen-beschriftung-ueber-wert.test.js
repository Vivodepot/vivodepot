'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Eintragszeilen am Bildschirm: Beschriftung über Wert (Nachtrag U2-ADR-497, 01.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Anlass: In Pro, Kontakte und Vertretung → „Erste Schritte, wenn Sie verhindert sind“ stand jeder Eintrag als ein Fließtext
   „Beschriftung: Wert · Beschriftung: Wert“ und erbte das Gewicht des gefüllten Werts, er stand fett.

   DIE KLASSE: jedes Listenfeld mit Unterfeldern in jedem Bereich, privat-de und pro-de, und die Lese-App. Je Feld ein Eintrag mit
   allen nicht sensiblen Unterfeldern. Verlangt:
     1. Am Bildschirm (Anzeige feldWertHTML, Liste beim Bearbeiten feldInputHTML, vorgeschlagene Schritte listenVorschlaegeHTML) steht
        jede Beschriftung in `.liste-eintrag-label` vor ihrem Wert in `.liste-eintrag-wert`; kein „Beschriftung:“, kein „ · “.
     2. Die Teile (listenEintragTeile) ergeben zum Text verbunden genau die Zusammenfassung der Text-Ausgaben
        (listenEintragZusammenfassung: PDF, Notfallblatt, Export, Löschrückfrage).
     3. Beschriftung und Wert stehen in normalem Gewicht, auch dunkel und im Hochkontrast; die Beschriftung trägt keinen
        angehängten Doppelpunkt.
     4. Die Lese-App zeichnet ihre Bildschirmzeile ebenso.
   Rot vor dem Bau: die alte Bildschirmzeile war der escapte Text „Beschriftung: Wert · …“ (Teil 1 fällt an jedem Feld mit
   Beschriftung); Rot-Beweise je Teil stehen unten.
   ═══════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const REPO = path.join(__dirname, '..');

function listenfelder(V) {
  const raus = [];
  for (const sek of Object.values(V.SEKTOR_BY_ID || {})) {
    for (const sektion of (sek.sektionen || [])) {
      for (const f of (sektion.felder || [])) {
        if (f.typ === 'liste' && Array.isArray(f.unterFelder) && f.unterFelder.length) raus.push({ sektorId: sek.id, feld: f });
      }
    }
  }
  return raus;
}

function beispielWert(uf) {
  if (uf.typ === 'checkbox') return true;
  if (uf.typ === 'datum') return '2026-03-14';
  if (uf.typ === 'ref') return { ref: '', override: 'Probe ' + uf.id };
  if (uf.typ === 'refMehrfach') return [{ ref: '', override: 'Probe ' + uf.id }];
  if (Array.isArray(uf.optionen) && uf.optionen.length) return uf.typ === 'mehrfachauswahl' ? [uf.optionen[0].wert] : uf.optionen[0].wert;
  return 'Probewert ' + uf.id;
}

// Ein Eintrag mit allen nicht sensiblen Unterfeldern.
function eintragFuer(V, sektorId, feld) {
  const e = {};
  for (const uf of feld.unterFelder) {
    if (V.unterfeldIstSensibel(sektorId, feld.id, {}, uf)) continue;
    e[uf.id] = beispielWert(uf);
  }
  return e;
}

const verbinden = (teile) => teile.map((t) => (t.label ? (t.text ? t.label + ': ' + t.text : t.label) : t.text)).join(' · ');

/* Prüft eine gezeichnete Zeile gegen ihre Teile und gegen den Text. Gibt Funde zurück (leer = in Ordnung). */
function zeilenFunde(esc, wo, html, teile, text) {
  const f = [];
  if (html.includes(' · ') || html.includes(' &middot; ')) f.push(wo + ': Trennpunkt in der Zeile');
  if (/class="liste-eintrag-label">[^<]*:\s*</.test(html)) f.push(wo + ': Beschriftung endet mit Doppelpunkt');
  for (const t of teile) {
    if (t.label && t.text) {
      const paar = '<span class="liste-eintrag-label">' + esc(t.label) + '</span><span class="liste-eintrag-wert">' + esc(t.text) + '</span>';
      if (!html.includes(paar)) f.push(wo + ': „' + t.label + '“ steht nicht als Beschriftung vor ihrem Wert');
      if (html.includes(esc(t.label + ': '))) f.push(wo + ': „' + t.label + ': “ im Zeilen-HTML');
    } else if (!html.includes('<span class="liste-eintrag-wert">' + esc(t.text || t.label) + '</span>')) {
      f.push(wo + ': Wert „' + (t.text || t.label) + '“ fehlt');
    }
  }
  const labels = (html.match(/class="liste-eintrag-label"/g) || []).length;
  const soll = teile.filter((t) => t.label && t.text).length;
  if (labels !== soll) f.push(wo + ': ' + labels + ' Beschriftungen statt ' + soll);
  // Unabhängig von den Teilen: jede Beschriftung, die der Text als „Beschriftung: “ führt, steht am Bildschirm als eigenes Element.
  // Der letzte „: “ trennt: eine Beschriftung darf selbst einen tragen („Entsperren: verwahrt bei“), die Probewerte tragen keinen.
  for (const m of text.split(' · ')) {
    const i = m.lastIndexOf(': ');
    if (i > 0 && !html.includes('<span class="liste-eintrag-label">' + esc(m.slice(0, i)) + '</span>')) f.push(wo + ': „' + m.slice(0, i) + '“ ohne eigenes Beschriftungs-Element');
  }
  return f;
}

async function kernPruefen(V, produkt) {
  await V.depotAnlegen('pw-eintragszeilen');
  const felder = listenfelder(V);
  const funde = [];
  let mitBeschriftung = 0;
  let vorschlaegeGeprueft = 0;
  for (const { sektorId, feld } of felder) {
    const e = eintragFuer(V, sektorId, feld);
    // Sind alle Unterfelder sensibel (etwa in Gesundheit), bleibt kein Eintrag; die Anzeige zeigt dann den Leer-Zustand.
    if (!Object.keys(e).length) continue;
    const teile = V.listenEintragTeile(feld, e);
    const text = V.listenEintragZusammenfassung(feld, e);
    if (verbinden(teile) !== text) funde.push(sektorId + '.' + feld.id + ': Teile „' + verbinden(teile) + '“ ≠ Text „' + text + '“');
    if (teile.some((t) => t.label && t.text)) mitBeschriftung++;
    const zeile = V.listenEintragZeileHTML(feld, e);
    const wo = produkt + ' ' + sektorId + '.' + feld.id;
    funde.push(...zeilenFunde(V.escapeHTML, wo + ' (Zeile)', zeile, teile, text));
    // Anzeige
    const anzeige = V.feldWertHTML(feld, [e]);
    const li = /<li data-eintrag="0"[^>]*>([\s\S]*)<\/li>/.exec(anzeige);
    // Ein Feld mit Code-Liste zeichnet Chips, keine Eintragszeile.
    if (!li) { if (!feld.codeListe) funde.push(wo + ' (Anzeige): kein Listenpunkt'); } else {
      if (teile.length && !li[1].includes('<span class="liste-eintrag-zusammenfassung">' + zeile + '</span>')) funde.push(wo + ' (Anzeige): Zeile nicht eingesetzt');
      funde.push(...zeilenFunde(V.escapeHTML, wo + ' (Anzeige)', li[1], teile, text));
    }
    // Liste beim Bearbeiten
    const editor = V.feldInputHTML(feld, [e], undefined, sektorId);
    const eli = /<li data-eintrag="0"[^>]*>([\s\S]*?)<\/li>/.exec(editor);
    if (!eli) { if (!feld.codeListe) funde.push(wo + ' (Bearbeiten): kein Listenpunkt'); } else {
      if (teile.length && !eli[1].includes('<span class="liste-eintrag-zusammenfassung">' + zeile + '</span>')) funde.push(wo + ' (Bearbeiten): Zeile nicht eingesetzt');
      funde.push(...zeilenFunde(V.escapeHTML, wo + ' (Bearbeiten)', eli[1], teile, text));
    }
    // Vorgeschlagene Schritte (nur, wo die Liste welche ab Werk trägt)
    const vorschlaege = V.listenVorschlaegeAbWerk(sektorId, feld);
    if (vorschlaege.length) {
      vorschlaegeGeprueft++;
      const kasten = V.listenVorschlaegeHTML(sektorId, feld);
      for (const v of vorschlaege) {
        const vt = V.listenEintragTeile(feld, v);
        const vtext = V.listenEintragZusammenfassung(feld, v);
        if (verbinden(vt) !== vtext) funde.push(wo + ' (Vorschlag): Teile ≠ Text');
        const vzeile = V.listenEintragZeileHTML(feld, v);
        if (!kasten.includes('<li><span class="liste-eintrag-zusammenfassung">' + vzeile + '</span></li>')) funde.push(wo + ' (Vorschlag): Zeile nicht eingesetzt');
        funde.push(...zeilenFunde(V.escapeHTML, wo + ' (Vorschlag)', vzeile, vt, vtext));
      }
      if (kasten.includes(' · ')) funde.push(wo + ' (Vorschlag): Trennpunkt im Kasten');
    }
  }
  return { felder, funde, mitBeschriftung, vorschlaegeGeprueft };
}

test('[Eintragszeile·Bildschirm] Kern privat-de: jede Beschriftung steht über ihrem Wert, ohne Doppelpunkt und Trennpunkt', async () => {
  const { V } = ladeKern();
  const r = await kernPruefen(V, 'privat-de');
  assert.ok(r.felder.length >= 10, 'Ausbeute: der Katalog trägt Listenfelder mit Unterfeldern (' + r.felder.length + ')');
  assert.ok(r.mitBeschriftung >= 10, 'Ausbeute: Zeilen mit Beschriftung (' + r.mitBeschriftung + ')');
  assert.deepEqual(r.funde.slice(0, 15), [], r.funde.length + ' Funde (erste 15)');
});

test('[Eintragszeile·Bildschirm] Kern pro-de: jede Beschriftung steht über ihrem Wert, ohne Doppelpunkt und Trennpunkt', async () => {
  const { V } = ladeKern({ produkt: 'pro-de' });
  const r = await kernPruefen(V, 'pro-de');
  assert.ok(r.felder.some((x) => x.feld.id === 'tpl_first_steps_when_absent'), 'der Anlassfall (Erste Schritte, wenn Sie verhindert sind) ist dabei');
  assert.ok(r.vorschlaegeGeprueft >= 1, 'Ausbeute: mindestens eine Liste mit vorgeschlagenen Schritten geprüft');
  assert.deepEqual(r.funde.slice(0, 15), [], r.funde.length + ' Funde (erste 15)');
});

test('[Eintragszeile·Text] die Teile ergeben zum Text verbunden genau die Zusammenfassung (privat-de und pro-de)', async () => {
  for (const opts of [undefined, { produkt: 'pro-de' }]) {
    const { V } = ladeKern(opts);
    await V.depotAnlegen('pw-eintragszeilen');
    const felder = listenfelder(V);
    let geprueft = 0;
    const abweichend = [];
    for (const { sektorId, feld } of felder) {
      const e = eintragFuer(V, sektorId, feld);
      // Ohne opt (Bildschirm) und mit opt (Export-Weg, sensibel ausgelassen): dieselben Ausnahmen in beiden Funktionen.
      for (const opt of [undefined, { sektorId }]) {
        const text = V.listenEintragZusammenfassung(feld, e, opt);
        const teile = V.listenEintragTeile(feld, e, opt);
        geprueft++;
        if (verbinden(teile) !== text) abweichend.push(sektorId + '.' + feld.id + (opt ? ' (Export)' : '') + ': „' + verbinden(teile) + '“ ≠ „' + text + '“');
      }
      // Einzelne Unterfelder: Häkchen, Datum, Auswahl allein, wie sie in der kuratierten Zeile stehen.
      for (const uf of feld.unterFelder) {
        const einzeln = { [uf.id]: beispielWert(uf) };
        if (verbinden(V.listenEintragTeile(feld, einzeln)) !== V.listenEintragZusammenfassung(feld, einzeln)) abweichend.push(sektorId + '.' + feld.id + '/' + uf.id + ' (einzeln)');
      }
    }
    assert.ok(geprueft >= 20, 'Ausbeute (' + geprueft + ')');
    assert.deepEqual(abweichend.slice(0, 15), [], abweichend.length + ' Abweichungen (erste 15)');
  }
  // Rot-Beweis im Test: eine Teile-Fassung, die den Doppelpunkt schon in die Beschriftung legt, fiele auf.
  assert.notEqual(verbinden([{ label: 'Schritt:', text: 'A' }]), 'Schritt: A');
});

test('[Eintragszeile·Bildschirm·Rot-Beweis] die alte Bildschirmzeile (escapter Text) fällt', () => {
  const { V } = ladeKern();
  const feld = { id: 'probe', typ: 'liste', unterFelder: [{ id: 'schritt', typ: 'text', label: 'Schritt' }, { id: 'wer', typ: 'text', label: 'Wer' }] };
  const e = { schritt: 'Bank anrufen', wer: 'Anna' };
  const teile = V.listenEintragTeile(feld, e);
  const text = V.listenEintragZusammenfassung(feld, e);
  assert.equal(text, 'Schritt: Bank anrufen · Wer: Anna', 'Voraussetzung: der Text-Weg bleibt');
  assert.deepEqual(zeilenFunde(V.escapeHTML, 'neu', V.listenEintragZeileHTML(feld, e), teile, text), []);
  assert.ok(zeilenFunde(V.escapeHTML, 'alt', V.escapeHTML(text), teile, text).length > 0, 'die alte Form fällt');
  // Ein Häkchen steht mit seiner Beschriftung als Wert, ohne Beschriftungs-Element.
  const h = { id: 'h', typ: 'liste', unterFelder: [{ id: 'ok', typ: 'checkbox', label: 'Erledigt' }] };
  assert.equal(V.listenEintragZeileHTML(h, { ok: true }), '<span class="liste-eintrag-feld"><span class="liste-eintrag-wert">Erledigt</span></span>');
  // Maskiert: Markup in einem Wert erscheint nur als Text.
  assert.doesNotMatch(V.listenEintragZeileHTML(feld, { schritt: '<img src=x onerror=alert(1)>' }), /<img/);
});

/* ── CSS ───────────────────────────────────────────────────────────────────── */
const CSS = fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const LESEN_CSS = (fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8').match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
function regelnFuer(css, klasse) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1], m[2]]).filter(([sel]) => sel.split(',').some((s) => s.trim().endsWith(klasse)));
}
function cssFunde(css, normal) {
  const f = [];
  for (const k of ['.liste-eintrag-label', '.liste-eintrag-wert']) {
    const regeln = regelnFuer(css, k);
    if (!regeln.some(([sel, rumpf]) => sel.trim() === k && normal.test(rumpf))) f.push(k + ' ohne normales Gewicht');
    for (const [sel, rumpf] of regeln) {
      const g = /font-weight\s*:\s*([^;]+)/.exec(rumpf);
      if (g && !normal.test('font-weight: ' + g[1])) f.push(sel.trim() + ' setzt ' + g[1].trim());
    }
  }
  if (/\.liste-eintrag-label::?after\s*\{[^}]*content\s*:\s*["'][^"']*:/.test(css)) f.push('Doppelpunkt hinter der Beschriftung per ::after');
  if (!regelnFuer(css, '.liste-eintrag-zusammenfassung').some(([, r]) => /flex-direction\s*:\s*column/.test(r))) f.push('Felder stapeln sich nicht');
  return f;
}
const NORMAL_KERN = /font-weight\s*:\s*var\(--fw-regular\)/;
const NORMAL_LESEN = /font-weight\s*:\s*(400|normal|var\(--fw-regular\))/;

test('[Eintragszeile·CSS] Beschriftung und Wert stehen in normalem Gewicht, die Beschriftung ohne angehängten Doppelpunkt', () => {
  assert.deepEqual(cssFunde(CSS, NORMAL_KERN), []);
  // Dunkel und Hochkontrast heben .feld-wert an; die Zeile hat ihre eigene Gegenregel.
  for (const modus of ['html.dark-mode', 'html.high-contrast']) {
    assert.ok(regelnFuer(CSS, '.liste-eintrag-wert').some(([sel, r]) => sel.includes(modus + ' .liste-eintrag-wert') && NORMAL_KERN.test(r)), modus + ': Wert normal');
  }
  assert.deepEqual(cssFunde(LESEN_CSS, NORMAL_LESEN), [], 'Lese-App');
  // Rot-Beweis: ohne die Regeln fällt die Probe.
  const ohne = CSS.replace(/\.liste-eintrag-label \{[^}]*\}/, '').replace(/\.liste-eintrag-wert \{[^}]*\}/, '');
  assert.notEqual(ohne, CSS);
  assert.ok(cssFunde(ohne, NORMAL_KERN).length >= 2);
  assert.ok(cssFunde(CSS + '\n.liste-eintrag-label::after { content: ":"; }', NORMAL_KERN).length > 0);
});

test('[Eintragszeile·CSS·schmal] keine Regel gibt der Zeile die Startbreite 0, sonst teilt sie sich am Handy die Reihe mit den Knöpfen', () => {
  // 01.11.2026: In Salbei mit Glas stand `flex: 1` (Startbreite 0); bei 390 px war die Zeile wenige Wörter breit.
  const stil = path.join(REPO, 'tools', 'erscheinung', 'stil');
  const nullBasis = (css) => regelnFuer(css, '.liste-eintrag-zusammenfassung')
    .filter(([, r]) => /(^|;)\s*flex\s*:\s*(\d+(\.\d+)?|\d+\s+\d+\s+0(%|px)?)\s*(;|$)/.test(r)).map(([sel]) => sel.trim());
  for (const d of fs.readdirSync(stil).filter((x) => x.endsWith('.css'))) {
    assert.deepEqual(nullBasis(fs.readFileSync(path.join(stil, d), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), [], d);
  }
  // Rot-Beweis: die alte Regel fällt.
  assert.equal(nullBasis('.feld-liste-editor .liste-eintrag-zusammenfassung { flex: 1; color: var(--ink); }').length, 1);
});

/* ── Lese-App ──────────────────────────────────────────────────────────────── */
test('[Eintragszeile·Lese-App] die Bildschirmzeile der Lese-App steht wie im Kern', () => {
  const { V } = ladeLesen();
  const felder = listenfelder(V);
  assert.ok(felder.length >= 10, 'Ausbeute: der Katalog der Lese-App trägt Listenfelder (' + felder.length + ')');
  const funde = [];
  let mitBeschriftung = 0;
  for (const { sektorId, feld } of felder) {
    const e = eintragFuer(V, sektorId, feld);
    const teile = V.listenEintragTeile(feld, e, sektorId);
    const text = V.listenEintragZusammenfassung(feld, e, sektorId);
    if (verbinden(teile) !== text) funde.push(sektorId + '.' + feld.id + ': Teile „' + verbinden(teile) + '“ ≠ Text „' + text + '“');
    if (!teile.length) continue;
    if (teile.some((t) => t.label && t.text)) mitBeschriftung++;
    const html = V.feldZeileHTML(sektorId, feld, [e]);
    const zeile = V.listenEintragZeileHTML(feld, e, sektorId);
    if (!html.includes('<li><span class="liste-eintrag-zusammenfassung">' + zeile + '</span></li>')) funde.push(sektorId + '.' + feld.id + ': Zeile nicht eingesetzt');
    funde.push(...zeilenFunde(V.escapeHTML, 'Lese-App ' + sektorId + '.' + feld.id, zeile, teile, text));
    if (html.includes(' · ')) funde.push(sektorId + '.' + feld.id + ': Trennpunkt in der Feldzeile');
  }
  assert.ok(mitBeschriftung >= 10, 'Ausbeute: Zeilen mit Beschriftung (' + mitBeschriftung + ')');
  assert.deepEqual(funde.slice(0, 15), [], funde.length + ' Funde (erste 15)');
});
