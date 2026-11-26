'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio · Sichern benutzbar (Benutzbarkeitsprüfung 22.11.2026, am Quelltext nachgeprüft)
   ─────────────────────────────────────────────────────────────────
   H1  Fehlt beim Sichern der Name der Stelle, steht das Feld „Name Ihrer Stelle“ im Kopf der Vorlage, der Fokus geht dorthin,
       die Meldung bleibt am Feld stehen; was dort eingetragen wird, gilt beim nächsten Sichern.
   H3  Tragen Link und QR-Code nur Kennung und Fassung (Abholseite), sagt die Seite es und nennt die Datei als Weg.
   M1  Die Seite nennt, wie viele Dateien heruntergeladen wurden.
   M2  Ohne Datenfelder sichert „Vorlage sichern“ nichts.
   M3  „Weitere Vorlage beginnen“ und „Leere Vorlage“ beginnen leer (Felder, Name, Zweck).
   M4  Ein Beispielwechsel nimmt Name und Zweck des vorigen Beispiels mit; ein selbst eingetragener Name bleibt.
   M5  „Angaben der Stelle“ geht beim Tippen des Namens nicht von selbst auf.
   M6  Der Knopf heißt „An Vivodepot zur Prüfung schicken ▸“.
   ROT-BEWEIS: der letzte Fall setzt jede Stelle auf den Stand vor dem Wagen zurück und erwartet rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const FELD = (feldname) => ({ feldname, feldtyp: 'text', pflicht: false, bereich: 'identity', gruppe: 'Angaben' });
const text = (b) => String(b.attrs.text != null ? b.attrs.text : (b.kinder || []).filter((k) => typeof k === 'string').join(''));

function studio(o, html) {
  const g = ladeGenerator(html ? { html } : undefined);
  const anbieter = o.stelle === false ? {} : g.sandbox.baueAnbieter({ anbieterName: 'Stadtbibliothek Probestadt', kontaktEmail: 'a@probe.example' });
  Object.assign(g.V.STATE, { felder: o.felder, dokument: { titel: 'Probe' }, vorlageName: o.name, vorlageId: 'probe', version: 1, anbieter });
  const hinaus = [];
  g.sandbox.blobDownload = (n) => hinaus.push(n);
  g.sandbox.ansichtSetzen = () => {};
  g.sandbox.zeigeSchritt = () => {};
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [] }); return e; };
  return { g, gebaut, hinaus };
}

async function befunde(html) {
  const f = [];
  const h = html || HTML;
  // H1
  try {
    const { g, hinaus } = studio({ felder: [FELD('Vorname')], name: 'Ausweis', stelle: false }, html);
    let fokus = null;
    const vf = g.document.getElementById('vk-stelle-name');
    vf.focus = () => { fokus = 'vk-stelle-name'; };
    const ok = await g.sandbox.vorlageSichern();
    if (ok !== false || hinaus.length) f.push('H1: ohne Stelle wurde gesichert');
    if (g.document.getElementById('vk-stelle').hidden !== false) f.push('H1: Feld der Stelle nicht im Kopf');
    if (fokus !== 'vk-stelle-name') f.push('H1: Fokus nicht am Feld der Stelle');
    vf.value = 'Gemeindebücherei';
    if (typeof g.sandbox.vkStelleLesen === 'function') g.sandbox.vkStelleLesen();
    await g.sandbox.vorlageSichern();
    if (!hinaus.length) f.push('H1: der eingetragene Name gilt beim nächsten Sichern nicht');
  } catch (e) { f.push('H1: ' + e.message); }
  if (!/id="vk-stelle-meldung"[^>]*>Tragen Sie den Namen Ihrer Stelle ein, dann sichern Sie noch einmal\.<\/p>/.test(h)) f.push('H1: Meldung am Feld fehlt');
  // H3, M1
  try {
    const { g, gebaut } = studio({ felder: [FELD('Vorname'), FELD('Nachname')], name: 'Ausweis' }, html);
    g.sandbox.vorlageQr = async () => ({ art: 'abholseite', link: 'https://share.vivodepot.de/anfrage.html#vorlage=x', qr: { dataUrl: 'data:image/gif;base64,R0lG' }, aushang: null });
    await g.sandbox.vorlageSichern();
    const hw = gebaut.find((b) => b.attrs.id === 'ns-abholseite-hinweis');
    if (!hw || !/nur den Namen und die Fassung/.test(text(hw))) f.push('H3: kein Hinweis bei Abholseite');
    const d = gebaut.find((b) => b.attrs.id === 'ns-dateien');
    if (!d || !/^\d+ Dateien liegen in Ihrem Download-Ordner/.test(text(d))) f.push('M1: keine Zahl der Dateien');
  } catch (e) { f.push('H3/M1: ' + e.message); }
  try {
    const { g, gebaut } = studio({ felder: [FELD('Vorname')], name: 'Ausweis' }, html);
    g.sandbox.vorlageQr = async () => ({ art: 'inhalt', link: 'https://share.vivodepot.de/anfrage.html#vorlage=x', qr: { dataUrl: 'data:image/gif;base64,R0lG' }, aushang: null });
    await g.sandbox.vorlageSichern();
    if (gebaut.find((b) => b.attrs.id === 'ns-abholseite-hinweis')) f.push('H3: Hinweis auch bei Inhalt im Link');
  } catch (e) { f.push('H3: ' + e.message); }
  // M2
  try {
    const { g, hinaus } = studio({ felder: [], name: 'Ausweis' }, html);
    if ((await g.sandbox.vorlageSichern()) !== false || hinaus.length) f.push('M2: ohne Datenfelder gesichert');
  } catch (e) { f.push('M2: ' + e.message); }
  // M3
  try {
    const { g } = studio({ felder: [FELD('Vorname')], name: 'Ausweis' }, html);
    g.V.STATE.vorlageZweck = 'Zweck';
    g.sandbox.weitereVorlageBeginnen();
    if (g.V.STATE.felder.length || g.V.STATE.vorlageName || g.V.STATE.vorlageZweck) f.push('M3: weitere Vorlage beginnt nicht leer');
    const s2 = studio({ felder: [FELD('Vorname')], name: 'Ausweis' }, html);
    if (typeof s2.g.sandbox.leereVorlageBeginnen !== 'function') f.push('M3: leere Vorlage räumt nicht auf');
    else { s2.g.sandbox.leereVorlageBeginnen(); s2.g.sandbox.leereVorlageBeginnen(); if (s2.g.V.STATE.felder.length || s2.g.V.STATE.vorlageName) f.push('M3: leere Vorlage beginnt nicht leer'); }
  } catch (e) { f.push('M3: ' + e.message); }
  if (!/an\('start-leer', 'click', leereVorlageBeginnen\);/.test(h)) f.push('M3: Kachel „Leere Vorlage“ räumt nicht auf');
  // M4
  try {
    const { g } = studio({ felder: [], name: '' }, html);
    g.sandbox.ladeBeispiel('bibliothek');
    g.sandbox.ladeBeispiel('verein'); g.sandbox.ladeBeispiel('verein');   // zweiter Klick bestätigt das Ersetzen
    if (g.V.STATE.vorlageName !== g.V.BEISPIEL_TEMPLATES.verein.titel) f.push('M4: Name des vorigen Beispiels bleibt: ' + g.V.STATE.vorlageName);
    g.V.STATE.vorlageName = 'Eigener Name';
    g.sandbox.ladeBeispiel('praxis'); g.sandbox.ladeBeispiel('praxis');
    if (g.V.STATE.vorlageName !== 'Eigener Name') f.push('M4: eigener Name überschrieben');
  } catch (e) { f.push('M4: ' + e.message); }
  // M5, M6
  if (/d\.dataset\.auf = '1'; d\.open = true;/.test(h)) f.push('M5: Angaben der Stelle gehen von selbst auf');
  if (!/<summary data-en="Details of your organisation \(for submitting\)">Angaben der Stelle \(für das Einreichen\)<\/summary>/.test(h)) f.push('M5: Klappe nennt den Zweck nicht');
  if (!/id="ns-einreichen" data-en="Send to Vivodepot for review ▸">An Vivodepot zur Prüfung schicken ▸</.test(h)) f.push('M6: Knopf heißt nicht „An Vivodepot zur Prüfung schicken“');
  return f;
}

test('[Studio · Sichern benutzbar] H1, H3, M1–M6 wie nach der Benutzbarkeitsprüfung', async () => {
  assert.deepEqual(await befunde(), []);
});

test('[Studio · Sichern benutzbar · Rot-Beweis] jede Stelle auf dem Stand vor dem Wagen wird rot', async () => {
  const mut = (a, b) => { assert.ok(HTML.includes(a), 'Vorbedingung: ' + a.slice(0, 60)); return HTML.replace(a, b); };
  const fall = async (html, muster) => { const b = await befunde(html); assert.ok(b.some((x) => x.startsWith(muster)), muster + ': ' + b.join(' | ')); };
  await fall(mut("const f = $('vk-stelle-name'); if (f && f.focus) f.focus();", "const f = $('sd-name'); if (f && f.focus) f.focus();"), 'H1');
  await fall(mut("if (!anfrage && erg.qr && erg.qr.art === 'abholseite')", 'if (false)'), 'H3');
  await fall(mut("  if (erg.dateien) box.appendChild(", '  if (false) box.appendChild('), 'M1');
  await fall(mut('  if (!(state.felder || []).length) {\n    if (box) box.hidden = true;', '  if (false) {\n    if (box) box.hidden = true;'), 'M2');
  await fall(mut('  nachSichernSchliessen();\n  vorlageLeeren();', '  nachSichernSchliessen();'), 'M3');
  await fall(mut("  if (STATE.vorlageNameAusBeispiel && STATE.vorlageName === STATE.vorlageNameAusBeispiel)", '  if (false)'), 'M4');
  await fall(mut('Angaben der Stelle (für das Einreichen)</summary>', 'Angaben der Stelle</summary>'), 'M5');
  await fall(mut('>An Vivodepot zur Prüfung schicken ▸<', '>Einreichen ▸<'), 'M6');
});

/* Rundgang 22.11.2026 (Bild bei 375): Statuszeile und Feldmeldung standen beim Sichern ohne Stelle übereinander, mit demselben
   Satz. Es gibt eine Meldung, am Feld; die Statuszeile bleibt leer. Der Hinweis in der Wegeliste trägt die Einrückung der Zeilen. */
function eineMeldung(html) {
  const f = [];
  const s = html.slice(html.indexOf('function vorlageSichern'), html.indexOf('vorlageNameHinweis(false);\n  state.anbieter'));
  if (/c\.textContent = L\('Bitte tragen Sie zuerst den Namen Ihrer Stelle ein/.test(s)) f.push('Statuszeile wiederholt die Feldmeldung');
  if (!/sm\.textContent = L\('Bitte tragen Sie zuerst den Namen Ihrer Stelle ein\. Dann sichern Sie noch einmal\.'/.test(s)) f.push('Feldmeldung ohne Satz');
  if (!/\.ns-liste > \.ergebnis-zahl \{ padding: 0 16px/.test(html)) f.push('Hinweis ohne Einrückung');
  return f;
}
test('[Studio · Sichern benutzbar · eine Meldung] ohne Stelle steht der Satz nur am Feld; der Hinweis ist eingerückt', () => {
  assert.deepEqual(eineMeldung(HTML), []);
  const alt = HTML.replace("if (c) c.textContent = '';\n    const sm = $('vk-stelle-meldung');\n    if (sm) sm.textContent", "if (c) c.textContent");
  assert.ok(eineMeldung(alt).length > 0, 'Rot-Beweis');
});

/* M3/M4 ohne Browser-Dialog: der erste Klick nennt das Ersetzen, der zweite ersetzt; ohne Felder sofort. */
test('[Studio · Sichern benutzbar · Ersetzen in zwei Schritten] kein confirm, erster Klick fragt, zweiter ersetzt', () => {
  assert.equal(HTML.indexOf('confirm('), -1, 'kein window.confirm');
  const g = ladeGenerator();
  g.V.STATE.felder = [];
  assert.equal(g.sandbox.vorlageErsetzenErlaubt(), true, 'ohne Felder sofort');
  g.V.STATE.felder = [FELD('A')];
  assert.equal(g.sandbox.vorlageErsetzenErlaubt(), false, 'erster Klick fragt');
  assert.match(String(g.document.getElementById('bau-status').textContent), /noch einmal/);
  assert.equal(g.sandbox.vorlageErsetzenErlaubt(), true, 'zweiter Klick ersetzt');
  assert.equal(g.sandbox.vorlageErsetzenErlaubt(), false, 'danach fragt er wieder');
});
