'use strict';
/* D49 nach der freigegebenen Fassung 2 „Dokumente einfach“ (31.10.2026, Tafel 3): die Vorschau eines Dokuments nennt die Datei mit
   „Im Depot · Größe“ und darunter wenige Angaben, Name und Bereich. Was der Eintrag nicht trägt (Seitenzahl, Angaben des Dokuments
   selbst), steht nicht da. Neben den vorhandenen Handlungen kommt kein zweiter Satz Knöpfe hinzu (D48: kein zusätzlicher Knopf; die Datei selbst zeigt die PDF-Ansicht). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Probe-Passwort-D49-2026';

async function vorschau(eintrag) {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen(eintrag);
  V.flowMappeVorschau(id);
  return { V, m: document.getElementById('modal-inhalt').innerHTML };
}

// Die Angaben gehen maskiert in die Seite („Wohnen & Eigentum“ steht dort als „Wohnen &amp; Eigentum“).
const maskiert = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function angaben(m) {
  const a = m.indexOf('data-mappe-angaben');
  assert.ok(a >= 0, 'die Angaben fehlen in der Vorschau');
  return m.slice(a, m.indexOf('</dl>', a));
}

test('[D49] die Vorschau nennt Datei mit „Im Depot · Größe“, Name und Bereich', async () => {
  const { V, m } = await vorschau({ beschriftung: 'Mietvertrag', dateiname: 'mietvertrag-2024.pdf', bereich: 'housing',
    mime: 'application/pdf', inhalt: 'data:application/pdf;base64,JVBERi0xLjQK' });
  const t = angaben(m);
  assert.ok(t.includes('mietvertrag-2024.pdf · '), 'Dateiname vorn');
  assert.ok(t.includes(V.STRINGS.mappeDetailImDepot.split('{umfang}')[0]), '„Im Depot“ fehlt');
  assert.match(t, /KB|MB|&lt; 1 KB|< 1 KB/, 'Größe fehlt');
  assert.ok(t.includes('<dt>' + V.STRINGS.mappeDetailName + '</dt><dd>Mietvertrag</dd>'), 'Name fehlt');
  assert.ok(t.includes('<dt>' + V.STRINGS.mappeDetailBereich + '</dt><dd>' + maskiert(V.mappeBereichLabel('housing')) + '</dd>'), 'Bereich fehlt');
  // genau zwei Angaben: keine erfundenen Felder
  assert.equal((t.match(/<dt>/g) || []).length, 2);
});

test('[D49] die Datei steht einmal: die PDF-Vorschau wiederholt Name und Größe nicht', async () => {
  const { m } = await vorschau({ beschriftung: 'Patientenverfügung', dateiname: 'pv.pdf', bereich: 'advanceCare',
    mime: 'application/pdf', inhalt: 'data:application/pdf;base64,JVBERi0xLjQK' });
  assert.equal((m.match(/class="mappe-vorschau-datei"/g) || []).length, 1);
});

test('[D49·Rot-Beweis] Beschriftung und Dateiname gehen maskiert in die Angaben', async () => {
  const fremd = '<img src=x onerror=alert(1)>';
  const { m } = await vorschau({ beschriftung: fremd, dateiname: fremd + '.pdf', mime: 'application/pdf',
    inhalt: 'data:application/pdf;base64,JVBERi0xLjQK' });
  const t = angaben(m);
  assert.equal(t.includes('<img'), false, 'roher Text in den Angaben');
  assert.ok(t.includes('&lt;img src=x onerror=alert(1)&gt;'), 'der Wortlaut bleibt lesbar');
});

test('[D48] kein zusätzlicher Knopf — die Vorschau bekommt keinen Knopf „Datei ansehen“ und kein „Herausgeben“', async () => {
  const { V, m } = await vorschau({ beschriftung: 'Ausweis', dateiname: 'ausweis.pdf', bereich: 'identity',
    mime: 'application/pdf', inhalt: 'data:application/pdf;base64,JVBERi0xLjQK' });
  assert.equal(m.includes('Datei ansehen'), false);
  assert.equal(m.includes('data-eintrag-herausgeben'), false);
  assert.equal(m.includes(V.STRINGS.herausgebenKnopf + '</button>'), false);
});
