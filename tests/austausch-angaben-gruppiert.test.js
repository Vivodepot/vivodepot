'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Das Angebot beim Zusammenstellen steht nach Bereichen gegliedert (Austausch, 11.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Befund: Die Ansicht zeigte jede Angabe des Depots als eine flache Liste, mehrere hundert Zeilen lang und nach
   120 Zeilen abgeschnitten. Abnahme: Keine Ansicht zeigt mehr als eine Gruppe aufgeklappt.
   Die Probe prüft die Klasse: jede Zeile des Angebots liegt in einer Gruppe, höchstens eine Gruppe ist offen,
   und keine Angabe fällt wegen einer Obergrenze aus der Ansicht.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'angaben-gruppiert-pw-2026';

async function ansicht() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Elena Beispiel');
  V.zusammenstellungZuruecksetzen();
  V.sektorFeldSetzen('identity', 'givenName', 'Elena');
  V.sektorFeldSetzen('education', 'occupationRole', 'Lehrerin');
  V.oeffneZusammenstellen();
  return { V, html: String(document.getElementById('content').innerHTML) };
}

// Schneidet jede Gruppe mit dem Merkmal `merkmal` aus; Aufklapp-Elemente in einer Zeile (Editor einer Angabe) zählen mit zur Gruppe.
function gruppenSchneiden(html, merkmal) {
  const gruppen = []; let ausserhalb = '', i = 0;
  const kopf = new RegExp('<details[^>]*' + merkmal + '="[^"]*"[^>]*>', 'g');
  for (;;) {
    kopf.lastIndex = i;
    const m = kopf.exec(html);
    if (!m) { ausserhalb += html.slice(i); break; }
    ausserhalb += html.slice(i, m.index);
    const re = /<details\b|<\/details>/g; re.lastIndex = m.index;
    let tiefe = 0, ende = html.length;
    for (let t; (t = re.exec(html));) { tiefe += t[0] === '</details>' ? -1 : 1; if (tiefe === 0) { ende = re.lastIndex; break; } }
    gruppen.push(html.slice(m.index, ende)); i = ende;
  }
  return { gruppen, ausserhalb };
}
// Zerlegt das Angebot in das, was in einer Gruppe steht, und das, was daneben steht.
function zerlege(html) {
  const start = html.indexOf('id="zus-treffer"');
  assert.ok(start >= 0, 'Vorbedingung: die Ansicht trägt das Angebot');
  return gruppenSchneiden(html.slice(start), 'data-zus-gruppe');
}
const zeilen = (h) => (h.match(/data-zus-treffer="/g) || []).length;
const istOffen = (g) => /^<details[^>]*\sopen(\s|>|=)/.test(g);

function pruefe(html, erwartet) {
  const { gruppen, ausserhalb } = zerlege(html);
  const maengel = [];
  if (gruppen.length < 2) maengel.push('weniger als zwei Gruppen (' + gruppen.length + ')');
  if (zeilen(ausserhalb) > 0) maengel.push(zeilen(ausserhalb) + ' Zeilen stehen außerhalb einer Gruppe');
  const offen = gruppen.filter(istOffen).length;
  if (offen > 1) maengel.push(offen + ' Gruppen sind offen');
  const inGruppen = gruppen.reduce((n, g) => n + zeilen(g), 0);
  if (erwartet != null && inGruppen !== erwartet) maengel.push('in den Gruppen stehen ' + inGruppen + ' von ' + erwartet + ' Angaben');
  for (const g of gruppen) if (!/<summary>[\s\S]*?<\/summary>/.test(g)) maengel.push('eine Gruppe hat keine Überschrift');
  return maengel;
}

test('[Austausch·Angaben gruppiert] jede Angabe steht in einer Gruppe, höchstens eine Gruppe ist offen, keine fällt weg', async () => {
  const { V, html } = await ansicht();
  const alle = V.zusammenstellenTreffer('').length;
  assert.ok(alle > 120, 'Vorbedingung: das Depot bietet mehr an, als die alte Obergrenze zeigte (' + alle + ')');
  assert.deepEqual(pruefe(html, alle), []);
});

test('[Austausch·Angaben gruppiert] jede Gruppe nennt ihren Bereich und die Zahl ihrer Angaben', async () => {
  const { html } = await ansicht();
  for (const g of zerlege(html).gruppen) {
    const zahl = (g.match(/class="einst-abschnitt-status">(\d+)</) || [])[1];
    assert.equal(Number(zahl), zeilen(g), 'die genannte Zahl stimmt mit den Zeilen überein');
    assert.match(g, /class="einst-abschnitt-titel">[^<]+</, 'die Gruppe trägt einen Titel');
  }
});

test('[Austausch·Rot-Beweis] eine flache Liste und zwei offene Gruppen schlagen die Probe an', () => {
  const zeile = '<div class="export-zz" data-zus-treffer="a.b"></div>';
  const gruppe = (id, offen) => '<details class="einst-abschnitt" data-zus-gruppe="' + id + '"' + (offen ? ' open' : '') + '><summary>x</summary>' + zeile + '</details>';
  const flach = '<div id="zus-treffer">' + zeile + zeile + '</div>';
  const zweiOffen = '<div id="zus-treffer">' + gruppe('a', true) + gruppe('b', true) + '</div>';
  const gut = '<div id="zus-treffer">' + gruppe('a', true) + gruppe('b', false) + '</div>';
  assert.ok(pruefe(flach, 2).length > 0, 'die flache Liste fällt auf');
  assert.ok(pruefe(zweiOffen, 2).some((m) => /offen/.test(m)), 'zwei offene Gruppen fallen auf');
  assert.deepEqual(pruefe(gut, 2), [], 'die gegliederte Fassung besteht');
});

/* Derselbe Maßstab im Fenster vor der Herausgabe: reichen die Angaben über mehrere Bereiche, stehen sie gegliedert.
   Der Weg „Etwas zurückhalten“ im selben Fenster braucht einen Klick und wird im Browser geprüft. */
function fensterKoerper(V, fn) {
  const modale = [], echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  try { fn(); } finally { V.ui.modal = echt; }
  return modale.map((m) => String(m.koerperHTML || ''));
}
function pruefeFenster(html) {
  const { gruppen, ausserhalb } = gruppenSchneiden(html, 'data-export-gruppe');
  const depotZeilen = (h) => (h.match(/<li data-sektor="/g) || []).length;
  return { gruppen: gruppen.length, offen: gruppen.filter(istOffen).length, ausserhalb: depotZeilen(ausserhalb), innen: gruppen.reduce((n, g) => n + depotZeilen(g), 0) };
}

test('[Austausch·Angaben gruppiert] das Fenster vor der Herausgabe gliedert Angaben aus mehreren Bereichen, eine Gruppe offen', async () => {
  const { V } = await ansicht();
  const [koerper] = fensterKoerper(V, () => V.flowZusammenstellungHerausgeben(['identity.givenName', 'education.occupationRole'], 'Probe'));
  assert.ok(koerper, 'Vorbedingung: das Fenster öffnet sich');
  const b = pruefeFenster(koerper);
  assert.equal(b.innen, 2, 'Vorbedingung: beide Angaben gehen mit');
  assert.deepEqual({ gruppen: b.gruppen, offen: b.offen, ausserhalb: b.ausserhalb }, { gruppen: 2, offen: 1, ausserhalb: 0 });
});

test('[Austausch·Angaben gruppiert] Angaben aus einem einzigen Bereich stehen ohne Gruppe', async () => {
  const { V } = await ansicht();
  const [koerper] = fensterKoerper(V, () => V.flowZusammenstellungHerausgeben(['education.occupationRole'], 'Probe'));
  const b = pruefeFenster(koerper);
  assert.deepEqual(b, { gruppen: 0, offen: 0, ausserhalb: 1, innen: 0 });
});
