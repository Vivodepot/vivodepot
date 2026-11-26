'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund UNTERLAGE-NICHT-LOESCHBAR (HOCH, 20.11.2026)
   ────────────────────────────────────────────────────────────────────────
   In einem Bereich stand unter „Dokumente in diesem Bereich“ eine versehentlich
   hochgeladene Datei, die sich nicht löschen ließ, und dasselbe Foto stand dort
   zweimal. Drei Ursachen, drei Teile des Fixes:
     1 · flowMappeEntfernen zeichnete nur die Mappe-Ansicht neu; in der
         Bereich-Ansicht blieb die Zeile stehen (_mappeAnsichtNeuZeichnen).
     2 · „Entfernen“ gab es nur unten in der Vorschau. Jetzt trägt jede Zeile von
         mappeListeHTML den Knopf (mit Bearbeiten-Recht), dieselbe Rückfrage, und
         der Knopf löst den Zeilenklick nicht aus.
     3 · Jedes Hochladen über ein Verweisfeld (Profilfoto) legte einen neuen
         Eintrag an, auch bei gleichem Inhalt, und ein ersetztes Foto blieb liegen.
         Jetzt wird gleicher Inhalt wiederverwendet; ein ersetzter Eintrag, der aus
         einem Verweisfeld stammt (ausVerweisfeld) und auf den nichts mehr zeigt,
         fällt weg. Was die Person selbst abgelegt hat, bleibt immer.
   Grundlage: U2-ADR-045 (Nachtrag) — jeder Eintrag ist entfernbar, zweistufige
   Rückfrage, „Löschen heißt löschen“.
   Rot-Beweis: die Fälle [Rot-Beweis] unten laden eine Kopie des Kerns, in der je
   ein Teil des Fixes zurückgenommen ist, und zeigen den alten Fehler.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'unterlage-probe-2026!';
const ZUSATZ = ['flowMappeEntfernen', 'verdrahteMappeListe', 'flowMappeUpload', '_verweisfeldSetzen',
  '_mappeGleicherInhalt', '_mappeVerweiseSammeln', '_mappeAnsichtNeuZeichnen'];
// Ein kleines PNG (1×1); der Inhalt ist für die Probe gleichgültig, nur gleich oder verschieden.
const PNG_A = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PNG_B = Buffer.concat([PNG_A, Buffer.from([0])]);

async function frischesDepot(opts) {
  const k = ladeKern(Object.assign({ zusatzBindungen: ZUSATZ }, opts || {}));
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Probe');
  return k;
}
const inhalt = (document) => document.getElementById('content').innerHTML;
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;
const fotoFeld = (V) => V.SEKTOR_BY_ID.identity.deckblatt.fotoFeld;

/* Node hat weder FileReader noch Image. Die Datei-Aufnahme der Mappe liest damit eine Data-URL; Image meldet einen Fehler,
   dann nimmt bildVerkleinern die Datei roh (der Weg des Kerns für nicht lesbare Bilder). Nur für die Dauer des Aufrufs. */
async function mitDateiLeser(fn) {
  const vorher = { FileReader: globalThis.FileReader, Image: globalThis.Image };
  globalThis.FileReader = class {
    readAsDataURL(blob) {
      blob.arrayBuffer().then((b) => { this.result = 'data:' + (blob.type || '') + ';base64,' + Buffer.from(b).toString('base64'); this.onload(); },
        (e) => { this.error = e; this.onerror(); });
    }
  };
  globalThis.Image = class { set src(_) { queueMicrotask(() => { if (this.onerror) this.onerror(); }); } };
  try { return await fn(); } finally {
    for (const [k, v] of Object.entries(vorher)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; }
  }
}
// Fängt den Dateiwähler ab, den `ausloesen` öffnet, und wählt `bytes` als Datei.
async function dateiWaehlen(document, bytes, name, ausloesen) {
  const erzeugen = document.createElement;
  let input = null;
  document.createElement = (tag) => { const el = erzeugen(tag); if (String(tag).toLowerCase() === 'input') input = el; return el; };
  try { ausloesen(); } finally { document.createElement = erzeugen; }
  assert.ok(input && typeof input.onchange === 'function', 'Vorbedingung: ein Dateiwähler wurde geöffnet');
  const datei = new Blob([bytes], { type: 'image/png' });
  Object.defineProperty(datei, 'name', { value: name });
  input.files = [datei];
  await mitDateiLeser(() => input.onchange());
}
// Das Deckblatt-Foto im Bereich „Identität“: der echte Knopf, verdrahtet von verdrahteSektorAktionen.
async function fotoUeberDeckblatt(k, bytes, name) {
  k.V.oeffneSektor('identity');
  const knopf = k.document.getElementById('deckblatt-foto');
  assert.equal(typeof knopf.onclick, 'function', 'Vorbedingung: das Deckblatt-Foto ist verdrahtet');
  await dateiWaehlen(k.document, bytes, name, () => knopf.onclick());
  // Neue Datei: das Ablage-Fenster steht offen, „Ablegen“ legt ab. Gleicher Inhalt: kein Fenster, das Feld ist schon gesetzt.
  if (modal(k.document).includes('id="mappe-besch"')) k.document.getElementById('m-ok').onclick();
}
/* Ein kleiner Behälter mit querySelectorAll über das gerenderte HTML (der DOM-Stub liefert dort immer []): je Treffer ein
   Element mit getAttribute und onclick, genug für verdrahteMappeListe. Je Selektor dieselben Elemente, damit die Probe die
   gesetzten Klick-Handler wiederfindet. */
function behaelter(html) {
  const cache = new Map();
  return {
    querySelectorAll(sel) {
      if (cache.has(sel)) return cache.get(sel);
      const m = /^\[([a-z-]+)\]$/.exec(sel);
      const re = m ? new RegExp('\\s' + m[1] + '="([^"]*)"', 'g') : null;
      const els = re ? [...html.matchAll(re)].map((t) => ({ wert: t[1], onclick: null, getAttribute: (a) => (a === m[1] ? t[1] : null) })) : [];
      cache.set(sel, els);
      return els;
    },
  };
}

/* ── (a) Entfernen in der Bereich-Ansicht ──────────────────────────────── */

test('[Unterlage·a] in der Bereich-Ansicht entfernt: die Liste ist sofort neu gezeichnet, nach Speichern und Neuöffnen bleibt die Zeile weg', async () => {
  const { V, document } = await frischesDepot();
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Versehen', bereich: 'identity', dateiname: 'x.pdf', mime: 'application/pdf', inhalt: 'data:application/pdf;base64,JVBERi0=' });
  V.oeffneSektor('identity');
  assert.ok(inhalt(document).includes('data-mappe-id="' + id + '"'), 'Vorbedingung: die Zeile steht im Bereich');
  V.__zusatz.flowMappeEntfernen(id);
  assert.ok(modal(document).includes(V.STRINGS.mappeEntfernenFrage), 'die Rückfrage steht da');
  document.getElementById('m-ok').onclick();
  assert.equal(V.getViewState().aktiveAnsicht, 'sektor');
  assert.equal(V.mappeEintrag(id), null, 'der Eintrag ist entfernt');
  assert.ok(!inhalt(document).includes('data-mappe-id="' + id + '"'), 'ROT ohne Fix: die Zeile blieb in der Bereich-Ansicht stehen');
  // Rundlauf: speichern und in einem frischen Kern öffnen.
  const ser = await V.depotSerialisieren();
  const k2 = ladeKern();
  await k2.V.depotLaden(ser, PW);
  assert.ok(!(k2.V.getData().mappe || []).some((m) => m.id === id), 'nach Neuöffnen ist der Eintrag weg');
  k2.V.oeffneSektor('identity');
  assert.ok(!inhalt(k2.document).includes('data-mappe-id="' + id + '"'), 'nach Neuöffnen steht die Zeile nicht im Bereich');
});

test('[Unterlage·a] in der Mappe-Ansicht zeichnet das Entfernen weiter die Mappe neu', async () => {
  const { V, document } = await frischesDepot();
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Mappe-Probe', bereich: 'identity', dateiname: 'y.pdf', mime: 'application/pdf' });
  V.oeffneMappe();
  assert.ok(inhalt(document).includes('data-mappe-id="' + id + '"'));
  V.__zusatz.flowMappeEntfernen(id);
  document.getElementById('m-ok').onclick();
  assert.equal(V.getViewState().aktiveAnsicht, 'mappe');
  assert.ok(!inhalt(document).includes('data-mappe-id="' + id + '"'));
});

/* ── (b) Entfernen an jeder Zeile ──────────────────────────────────────── */

test('[Unterlage·b] jede Zeile von mappeListeHTML trägt „Entfernen“; der Klick öffnet die Rückfrage und nicht die Vorschau', async () => {
  const { V, document } = await frischesDepot();
  const a = V.mappeEintragHinzufuegen({ beschriftung: 'Eins', bereich: 'identity', mime: 'application/pdf' });
  const b = V.mappeEintragHinzufuegen({ beschriftung: 'Zwei', bereich: 'identity', mime: 'image/png', inhalt: 'data:image/png;base64,' + PNG_A.toString('base64') });
  const html = V.mappeListeHTML(V.getData().mappe);
  for (const id of [a, b]) {
    assert.ok(html.includes('data-mappe-zeile-entfernen="' + id + '">' + V.STRINGS.mappeEntfernenKnopf + '</button>'),
      'ROT ohne Fix: die Zeile ' + id + ' trägt keinen Entfernen-Knopf');
  }
  // Der Bereich zeigt dieselbe Liste mit Knopf.
  V.oeffneSektor('identity');
  assert.ok(inhalt(document).includes('data-mappe-zeile-entfernen="' + a + '"'), 'auch im Bereich unter „Dokumente in diesem Bereich“');
  // Verdrahtung: Zeile → Vorschau, Knopf → Rückfrage, ohne den Zeilenklick.
  const host = behaelter(html);
  V.__zusatz.verdrahteMappeListe(host);
  const zeilen = host.querySelectorAll('[data-mappe-id]');
  const knoepfe = host.querySelectorAll('[data-mappe-zeile-entfernen]');
  assert.equal(zeilen.length, 2, 'Vorbedingung: zwei Zeilen');
  const knopfA = knoepfe.find((k) => k.wert === a);
  assert.equal(typeof knopfA.onclick, 'function', 'ROT ohne Fix: der Knopf ist nicht verdrahtet');
  let gestoppt = false;
  knopfA.onclick({ stopPropagation: () => { gestoppt = true; } });
  assert.ok(gestoppt, 'der Knopf hält den Klick von der Zeile fern');
  assert.ok(modal(document).includes(V.STRINGS.mappeEntfernenFrage), 'der Knopf öffnet dieselbe Rückfrage wie die Vorschau');
  document.getElementById('m-ok').onclick();
  assert.equal(V.mappeEintrag(a), null);
  assert.ok(V.mappeEintrag(b), 'nur der gewählte Eintrag ist entfernt');
  zeilen.find((z) => z.wert === b).onclick();
  assert.ok(modal(document).includes('data-mappe-entfernen="' + b + '"'), 'der Zeilenklick öffnet weiter die Vorschau');
});

test('[Unterlage·b] ohne Bearbeiten-Recht kein Knopf in der Zeile (wie im Register der Menschen)', () => {
  const { V } = ladeKern();   // kein Depot, kein Akteur: Modus.darfBearbeiten() ist false
  assert.equal(V.Modus.darfBearbeiten(), false, 'Vorbedingung');
  const html = V.mappeListeHTML([{ id: 'm1', mime: 'application/pdf', beschriftung: 'Lesen', bereich: 'identity', groesse: 1 }]);
  assert.ok(html.includes('data-mappe-id="m1"'));
  assert.ok(!html.includes('data-mappe-zeile-entfernen'));
});

/* ── (c) gleiches Foto zweimal über das Verweisfeld ────────────────────── */

test('[Unterlage·c] dasselbe Foto zweimal über das Deckblatt: ein Eintrag, das Feld zeigt auf ihn', async () => {
  const k = await frischesDepot();
  const { V } = k;
  await fotoUeberDeckblatt(k, PNG_A, 'foto.png');
  await fotoUeberDeckblatt(k, PNG_A, 'foto-nochmal.png');
  const mappe = V.getData().mappe;
  assert.equal(mappe.length, 1, 'ROT ohne Fix: dasselbe Foto lag zweimal in der Mappe');
  assert.equal(mappe[0].ausVerweisfeld, true, 'aus dem Verweisfeld angelegt, markiert');
  assert.equal(V.getData().sektoren.identity[fotoFeld(V)].ref, mappe[0].id, 'das Feld zeigt auf den einen Eintrag');
});

test('[Unterlage·c] außerhalb eines Verweisfelds bleibt jede Ablage eine eigene (kein Abgleich, keine Markierung)', async () => {
  const k = await frischesDepot();
  const { V } = k;
  for (const name of ['eins.png', 'zwei.png']) {
    await dateiWaehlen(k.document, PNG_A, name, () => V.__zusatz.flowMappeUpload('identity', () => {}));
    k.document.getElementById('m-ok').onclick();
  }
  const mappe = V.getData().mappe;
  assert.equal(mappe.length, 2, 'ein selbst abgelegtes Dokument wird nicht still zusammengelegt');
  assert.ok(mappe.every((m) => !('ausVerweisfeld' in m)), 'die Markierung steht nur, wenn sie gilt');
});

/* ── (d) Foto ersetzen ─────────────────────────────────────────────────── */

test('[Unterlage·d] Foto ersetzen: der markierte alte Eintrag ohne weiteren Verweis fällt weg, mit Hinweis', async () => {
  const k = await frischesDepot();
  const { V } = k;
  await fotoUeberDeckblatt(k, PNG_A, 'alt.png');
  const altId = V.getData().mappe[0].id;
  await fotoUeberDeckblatt(k, PNG_B, 'neu.png');
  const mappe = V.getData().mappe;
  assert.equal(V.mappeEintrag(altId), null, 'ROT ohne Fix: das ersetzte Foto blieb in der Mappe');
  assert.equal(mappe.length, 1);
  assert.equal(V.getData().sektoren.identity[fotoFeld(V)].ref, mappe[0].id, 'das Feld zeigt auf das neue Foto');
  assert.ok(!inhalt(k.document).includes('data-mappe-id="' + altId + '"'), 'die Bereich-Liste ist ohne das alte Foto neu gezeichnet');
});

test('[Unterlage·d] ein selbst abgelegter Eintrag bleibt, auch wenn das Verweisfeld ihn verlässt', async () => {
  const k = await frischesDepot();
  const { V } = k;
  const selbst = V.mappeEintragHinzufuegen({ beschriftung: 'Passfoto', bereich: 'identity', mime: 'image/png', inhalt: 'data:image/png;base64,' + PNG_B.toString('base64') });
  V.sektorFeldSetzen('identity', fotoFeld(V), { ref: selbst });
  await fotoUeberDeckblatt(k, PNG_A, 'anderes.png');
  assert.ok(V.mappeEintrag(selbst), 'was die Person selbst abgelegt hat, bleibt immer');
  assert.equal(V.getData().mappe.length, 2);
});

test('[Unterlage·d] ein markierter Eintrag, auf den noch ein Listen-Eintrag zeigt, bleibt', async () => {
  const k = await frischesDepot();
  const { V } = k;
  const alt = V.mappeEintragHinzufuegen({ beschriftung: 'Foto', bereich: 'identity', mime: 'image/png', inhalt: 'data:image/png;base64,AAAA', ausVerweisfeld: true });
  const neu = V.mappeEintragHinzufuegen({ beschriftung: 'Neu', bereich: 'identity', mime: 'image/png', inhalt: 'data:image/png;base64,BBBB', ausVerweisfeld: true });
  V.sektorFeldSetzen('identity', fotoFeld(V), { ref: alt });
  V.oeffneSektor('identity');
  // Ein Verweis tief in einem Listen-Eintrag (Unterfeld): mappeEntfernen räumt nur die oberste Feldebene ab, die Sammlung sieht ihn.
  V.getData().sektoren.finance = Object.assign(V.getData().sektoren.finance || {}, { accounts: [{ id: 'konto-probe', beleg: { ref: alt } }] });
  assert.ok(V.__zusatz._mappeVerweiseSammeln().has(alt), 'Vorbedingung: der Verweis im Listen-Eintrag wird gefunden');
  const entfernt = V.__zusatz._verweisfeldSetzen((id) => V.sektorFeldSetzen('identity', fotoFeld(V), { ref: id }), neu);
  assert.equal(entfernt, false);
  assert.ok(V.mappeEintrag(alt), 'noch verwiesen: bleibt');
  // Gegenprobe: ohne den Listen-Verweis fällt er beim nächsten Ersetzen weg.
  V.getData().sektoren.finance.accounts = [];
  V.sektorFeldSetzen('identity', fotoFeld(V), { ref: alt });
  assert.equal(V.__zusatz._verweisfeldSetzen((id) => V.sektorFeldSetzen('identity', fotoFeld(V), { ref: id }), neu), true);
  assert.equal(V.mappeEintrag(alt), null);
});

test('[Unterlage·d] die Markierung übersteht Speichern und Neuöffnen; ein Eintrag ohne sie trägt das Feld nicht', async () => {
  const k = await frischesDepot();
  await fotoUeberDeckblatt(k, PNG_A, 'foto.png');
  k.V.mappeEintragHinzufuegen({ beschriftung: 'Selbst', bereich: 'identity', mime: 'application/pdf' });
  const ser = await k.V.depotSerialisieren();
  const k2 = ladeKern();
  await k2.V.depotLaden(ser, PW);
  const [foto, selbst] = k2.V.getData().mappe;
  assert.equal(foto.ausVerweisfeld, true);
  assert.ok(!('ausVerweisfeld' in selbst));
});

/* ── (e) Rot-Beweis: je ein Teil des Fixes in einer Kopie des Kerns zurückgenommen ── */

function mitKernKopie(ersetzungen, fn) {
  const original = fs.readFileSync(KERN, 'utf8');
  let text = original;
  for (const [alt, neu] of ersetzungen) {
    assert.equal(text.split(alt).length - 1, 1, 'Vorbedingung: die Stelle steht genau einmal im Kern: ' + alt.slice(0, 60));
    text = text.replace(alt, neu);
  }
  const tmp = path.join(os.tmpdir(), 'unterlage-loeschbar-probe-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(tmp, text);
  return Promise.resolve()
    .then(() => fn((opts) => frischesDepot(Object.assign({ htmlPfad: tmp, backen: true }, opts || {}))))
    .finally(() => fs.rmSync(tmp, { force: true }));
}

test('[Unterlage·Rot-Beweis·1] ohne Neuzeichnen nach dem Entfernen bleibt die Zeile in der Bereich-Ansicht stehen', () =>
  mitKernKopie([["      _mappeAnsichtNeuZeichnen();\n    },\n  });\n}\n", "      if (aktiveAnsicht === 'mappe') renderMappe();\n    },\n  });\n}\n"]], async (lade) => {
    const { V, document } = await lade();
    const id = V.mappeEintragHinzufuegen({ beschriftung: 'Versehen', bereich: 'identity', mime: 'application/pdf' });
    V.oeffneSektor('identity');
    V.__zusatz.flowMappeEntfernen(id);
    document.getElementById('m-ok').onclick();
    assert.equal(V.mappeEintrag(id), null, 'die Daten sind entfernt …');
    assert.ok(inhalt(document).includes('data-mappe-id="' + id + '"'), '… die Zeile steht aber noch da: der Befund');
  }));

test('[Unterlage·Rot-Beweis·2] ohne den Knopf in der Zeile gibt es dort kein Entfernen', () =>
  mitKernKopie([["  const darf = Modus.darfBearbeiten() && !imVorschau();\n  let html = '<div class=\"mappe-liste\">';", "  const darf = false;\n  let html = '<div class=\"mappe-liste\">';"]], async (lade) => {
    const { V } = await lade();
    V.mappeEintragHinzufuegen({ beschriftung: 'Eins', bereich: 'identity', mime: 'application/pdf' });
    assert.ok(!V.mappeListeHTML(V.getData().mappe).includes('data-mappe-zeile-entfernen'));
  }));

test('[Unterlage·Rot-Beweis·3] ohne Abgleich und Markierung liegt dasselbe Foto zweimal da, und das ersetzte bleibt', () =>
  mitKernKopie([
    ['      if (gleich) { _verweisfeldSetzen(onAngelegt, gleich.id); return; }\n', ''],
    ['  if (p.ausVerweisfeld === true) eintrag.ausVerweisfeld = true;\n', ''],
  ], async (lade) => {
    const k = await lade();
    await fotoUeberDeckblatt(k, PNG_A, 'foto.png');
    await fotoUeberDeckblatt(k, PNG_A, 'foto-nochmal.png');
    assert.equal(k.V.getData().mappe.length, 2, 'derselbe Inhalt zweimal: der Befund');
    await fotoUeberDeckblatt(k, PNG_B, 'neu.png');
    assert.equal(k.V.getData().mappe.length, 3, 'das ersetzte Foto bleibt liegen');
  }));
