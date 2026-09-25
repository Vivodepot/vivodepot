'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — D2 Schließen-Warnung + F Schlüssel-Lifecycle (Strang 2 / Commit C+F)
   ────────────────────────────────────────────────────────────────────────
   D2: App-interner Schließen-Knopf (flowAppSchliessen) → Warn-Modal NUR im
       passwortlosen Vorschau-Zustand mit Daten. „Passwort setzen" → Passwort-
       Modal; „Trotzdem schließen" → Weg a (Daten verwerfen → window.close →
       Schluss-Sicht). Mit Passwort / leer: direktes Schließen ohne Warnung.
   F:  D4-Garantie — ohne Session (sessionHkdfKey) kein Datei-/Krypto-Write;
       Auto-Save faltet nur In-Memory; „Reload" vor Passwort verliert alles.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function trackingEl() {
  const set = new Set();
  return {
    innerHTML: '', textContent: '', value: '', className: '', style: {}, scrollTop: 0,
    classList: {
      add: (...c) => c.forEach((x) => set.add(x)),
      remove: (...c) => c.forEach((x) => set.delete(x)),
      toggle: (x) => (set.has(x) ? (set.delete(x), false) : (set.add(x), true)),
      contains: (x) => set.has(x),
    },
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, appendChild(x) { return x; }, insertAdjacentHTML() {},
  };
}
function instrumentiere(document, ids) {
  const tracked = {};
  for (const id of ids) tracked[id] = trackingEl();
  const orig = document.getElementById.bind(document);
  document.getElementById = (id) => (id in tracked ? tracked[id] : orig(id));
  return tracked;
}

/* ── D2 — Schließen-Warnung ──────────────────────────────────────────────── */

test('[D2] Schließen im passwortlosen Vorschau-Zustand mit Daten → Warn-Modal (Passwort setzen / Trotzdem schließen)', () => {
  const { V, document } = ladeKern();
  instrumentiere(document, ['overlay', 'app']);
  V.flowVorschauBetreten();
  V.getData().menschen.push({ id: 'p1', vorname: 'Test' });

  V.flowAppSchliessen();
  assert.equal(typeof document.getElementById('m-ok').onclick, 'function', '„Passwort setzen" (Primär) verdrahtet');
  assert.equal(typeof document.getElementById('m-zweit').onclick, 'function', '„Trotzdem schließen" (zweite Aktion) verdrahtet');
  assert.equal(V.imVorschau(), true, 'noch nicht geschlossen — nur Warnung');
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes(V.STRINGS.d2SchliessenText), 'D2-Warntext im Modal');
});

test('[D2] „Trotzdem schließen" → Daten verworfen + Schluss-Sicht (Weg a)', () => {
  const { V, document } = ladeKern();
  const t = instrumentiere(document, ['overlay', 'app']);
  V.flowVorschauBetreten();
  V.getData().menschen.push({ id: 'p1', vorname: 'Test' });

  V.flowAppSchliessen();
  document.getElementById('m-zweit').onclick();
  assert.ok(!V.getData(), 'In-Memory-Daten verworfen (kein wiederherstellbarer Rest)');
  const html = document.getElementById('overlay-inhalt').innerHTML || '';
  assert.ok(html.includes(V.STRINGS.schlussSichtText), 'Schluss-Sicht angezeigt');
  assert.equal(t.app.classList.contains('an'), false, 'App-Sicht verlassen');
});

test('[D2] „Passwort setzen" im Schließen-Modal öffnet das Passwort-Setzungs-Modal', async () => {
  const { V, document } = ladeKern();
  instrumentiere(document, ['overlay', 'app']);
  V.flowVorschauBetreten();
  V.getData().menschen.push({ id: 'p1', vorname: 'Test' });

  V.flowAppSchliessen();
  await document.getElementById('m-ok').onclick();   // → schliessen + flowPasswortSetzen
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes('id="pw-neu2"'), 'Passwort-Setzungs-Modal geöffnet (Bestätigen-Feld)');
  assert.ok(html.includes(V.STRINGS.pwSetzenTitel), 'ADR-Begrüßung im Modal');
});

test('[D2] Schließen ohne Daten (Vorschau leer) → kein Warn-Modal, direkt Schluss-Sicht', () => {
  const { V, document } = ladeKern();
  instrumentiere(document, ['overlay', 'app']);
  V.flowVorschauBetreten();                 // leer
  V.flowAppSchliessen();
  assert.ok(!V.getData(), 'direkt geschlossen, Daten weg');
  const html = document.getElementById('overlay-inhalt').innerHTML || '';
  assert.ok(html.includes(V.STRINGS.schlussSichtText), 'Schluss-Sicht direkt (ohne Warn-Modal)');
});

test('[D2] Schließen mit gesetztem Passwort → kein Warnen (Daten liegen verschlüsselt auf dem Stick)', async () => {
  const { V, document } = ladeKern();
  instrumentiere(document, ['overlay', 'app']);
  await V.depotAnlegen('d2-pw');            // Session vorhanden, kein Vorschau
  V.flowAppSchliessen();
  const modalHtml = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(!modalHtml.includes(V.STRINGS.d2SchliessenText), 'kein Warn-Modal mit gesetztem Passwort');
  const ovHtml = document.getElementById('overlay-inhalt').innerHTML || '';
  assert.ok(ovHtml.includes(V.STRINGS.schlussSichtText), 'direkt geschlossen (Schluss-Sicht)');
});

/* ── F — Schlüssel-Lifecycle / D4-Garantie ───────────────────────────────── */

test('[F] Ohne Passwort gibt es keine Session → depotSerialisieren wirft „Keine offene Session"', async () => {
  const { V } = ladeKern();
  V.vorschauDepotErzeugen();                // passwortlos: sessionHkdfKey bleibt null
  V.getData().menschen.push({ id: 'p1', vorname: 'Test' });
  await assert.rejects(() => V.depotSerialisieren(), /Keine offene Session/,
    'passwortlos: kein Datei-/Krypto-Write möglich');
});

test('[F] Auto-Save in der Vorschau faltet NUR In-Memory — keine Session, kein Stick-Write', async () => {
  const { V } = ladeKern();
  V.vorschauDepotErzeugen();
  V.getData().sektoren.identity = { givenName: 'Lena' };
  V.bearbeitungSpeichern();                 // faltet nur in `data` (keine Krypto, keine Datei)
  assert.equal(V.getData().sektoren.identity.givenName, 'Lena', 'In-Memory-Faltung vorhanden');
  await assert.rejects(() => V.depotSerialisieren(), /Keine offene Session/,
    'weiterhin kein Stick-Write ohne Session');
});

test('[F] „Reload" vor Passwort: frischer Kontext hat keine Daten (nichts persistiert)', () => {
  const { V } = ladeKern();
  V.vorschauDepotErzeugen();
  V.getData().menschen.push({ id: 'p1', vorname: 'Test' });
  // „Reload" = frischer Lade-Kontext (Single-File-App ohne Storage-API).
  const { V: V2 } = ladeKern();
  assert.ok(!V2.getData(), 'nach Reload: kein Depot — die passwortlosen Daten sind weg');
});

test('[F] Nach Passwort-Setzung existiert eine Session → Depot verschlüsselbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('lifecycle-pw');     // setzt sessionHkdfKey
  const umschlag = await V.depotSerialisieren();
  /* A345: der Kern schreibt in Feld-Einheiten; ein einzelnes `ct` gibt es nicht mehr.
     Die Zusicherung ist unverändert — mit offener Session entsteht ein verschlüsselter
     Umschlag —, sie fragt nur nach der Stelle, an der das Chiffrat heute liegt. */
  assert.ok(umschlag && umschlag.einheiten && Object.keys(umschlag.einheiten).length > 0,
    'mit Session: verschlüsselter Umschlag (Feld-Einheiten) entsteht');
});
